// Accounts: merging device + account data, e-mail links, error messages, requests sent.
import test from 'node:test';
import assert from 'node:assert/strict';

// A browser-like setting for the modules
const mem = {};
globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = String(v)), removeItem: (k) => delete mem[k] };
globalThis.location = { origin: 'https://sabriasna.github.io', pathname: '/Chesscend/web/', hash: '' };
const calls = [];
let reply = () => ({ status: 200, body: {} });
globalThis.fetch = async (url, opts = {}) => {
  calls.push({ url, ...opts, body: opts.body ? JSON.parse(opts.body) : undefined });
  const r = reply(url, opts);
  return { ok: r.status < 300, status: r.status, text: async () => JSON.stringify(r.body), json: async () => r.body };
};

const auth = await import('../web/js/auth.js');
const { mergeData } = await import('../web/js/sync.js');
const { SUPABASE_KEY, SUPABASE_URL } = await import('../web/js/config.js');

const game = (date, result = 'win', extra = {}) => ({ date, result, mode: 'ai', level: 2, moves: 20, change: 10, reason: 'checkmate', ...extra });

test('the key in the site is the public one, never a secret key', () => {
  assert.match(SUPABASE_KEY, /^sb_publishable_/);
  assert.match(SUPABASE_URL, /^https:\/\/[a-z]+\.supabase\.co$/);
});

test('merge: a new account receives everything from the device', () => {
  const local = { settings: { playerName: 'Djam', lang: 'fr' }, stats: { rating: 850, games: [game(2), game(1)] }, progress: { lessonsDone: ['b1'], puzzlesSolved: [] } };
  const m = mergeData(local, { settings: {}, stats: {}, progress: {} });
  assert.equal(m.stats.games.length, 2);
  assert.equal(m.stats.rating, 850);
  assert.deepEqual(m.progress.lessonsDone, ['b1']);
});

test('merge: games from both sides, no duplicates, most recent rating, lessons combined', () => {
  const shared = game(5);
  const local = { settings: { lang: 'es' }, stats: { rating: 900, games: [game(9), shared] }, progress: { lessonsDone: ['b1', 'b2'], puzzlesSolved: ['p1'] } };
  const remote = { settings: { lang: 'fr', themeId: 'gold', playerName: 'Djam' }, stats: { rating: 870, games: [game(7), shared] }, progress: { lessonsDone: ['b2', 's1'], puzzlesSolved: ['p3'] } };
  const m = mergeData(local, remote);
  assert.deepEqual(m.stats.games.map((g) => g.date), [9, 7, 5]);
  assert.equal(m.stats.rating, 900, 'device played the latest game');
  assert.deepEqual(m.progress.lessonsDone.sort(), ['b1', 'b2', 's1']);
  assert.deepEqual(m.progress.puzzlesSolved.sort(), ['p1', 'p3']);
  assert.equal(m.settings.themeId, 'gold', 'settings come from the account');
  assert.equal(m.settings.lang, 'es', 'but the language chosen on this device stays');
  assert.equal(m.settings.playerName, 'Djam');
  const m2 = mergeData({ ...local, stats: { rating: 900, games: [game(3)] } }, remote);
  assert.equal(m2.stats.rating, 870, 'account played the latest game');
});

test('sign-in sends the right request and keeps the session', async () => {
  reply = () => ({ status: 200, body: { access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { id: 'u1', email: 'a@b.co' } } });
  calls.length = 0;
  await auth.signIn({ email: 'a@b.co', password: 'secret123' });
  assert.equal(calls[0].url, `${SUPABASE_URL}/auth/v1/token?grant_type=password`);
  assert.equal(calls[0].headers.apikey, SUPABASE_KEY);
  assert.deepEqual(calls[0].body, { email: 'a@b.co', password: 'secret123' });
  assert.ok(auth.isSignedIn());
  assert.equal(auth.currentUser().id, 'u1');
  assert.ok(mem['chesscend:session'].includes('RT'));
});

test('data requests carry the user token and only touch the user row', async () => {
  reply = () => ({ status: 201, body: null });
  calls.length = 0;
  await auth.putUserData({ settings: {}, stats: {}, progress: {} });
  assert.equal(calls[0].headers.Authorization, 'Bearer AT');
  assert.equal(calls[0].body.user_id, 'u1');
  assert.match(calls[0].headers.Prefer, /merge-duplicates/);
});

test('an expired session is refreshed before a request', async () => {
  const s = JSON.parse(mem['chesscend:session']);
  s.expires_at = Math.floor(Date.now() / 1000) - 10;
  mem['chesscend:session'] = JSON.stringify(s);
  // reload the module state through a fresh import
  const fresh = await import(`../web/js/auth.js?refresh=1`);
  reply = (url) =>
    url.includes('grant_type=refresh_token')
      ? { status: 200, body: { access_token: 'AT2', refresh_token: 'RT2', expires_in: 3600, user: { id: 'u1', email: 'a@b.co' } } }
      : { status: 200, body: [{ username: 'Djam' }] };
  calls.length = 0;
  const p = await fresh.getProfile();
  assert.equal(p.username, 'Djam');
  assert.match(calls[0].url, /grant_type=refresh_token/);
  assert.equal(calls[1].headers.Authorization, 'Bearer AT2');
});

test('server errors become clear messages', async () => {
  const cases = [
    [400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 'credentials'],
    [400, { error_code: 'email_not_confirmed' }, 'notConfirmed'],
    [422, { error_code: 'user_already_exists' }, 'exists'],
    [422, { error_code: 'weak_password' }, 'weak'],
    [429, { error_code: 'over_email_send_rate_limit' }, 'rate'],
    [400, { error_code: 'email_address_not_authorized' }, 'emailBlocked'],
    [500, { msg: 'Database error saving new user' }, 'username'],
    [500, { msg: 'boom' }, 'unknown'],
  ];
  for (const [status, body, code] of cases) {
    reply = () => ({ status, body });
    await assert.rejects(auth.signIn({ email: 'x@y.co', password: 'whatever1' }), (e) => e.code === code, code);
  }
  const saved = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };
  await assert.rejects(auth.signIn({ email: 'x@y.co', password: 'whatever1' }), (e) => e.code === 'network');
  globalThis.fetch = saved;
});

test('sign-up: with or without e-mail confirmation', async () => {
  await auth.signOut();
  reply = () => ({ status: 200, body: { id: 'u9', email: 'n@b.co', confirmation_sent_at: 'now' } });
  calls.length = 0;
  const r = await auth.signUp({ email: 'n@b.co', password: 'password1', username: 'Newbie' });
  assert.deepEqual(r, { confirmEmail: true });
  assert.match(calls[0].url, /\/auth\/v1\/signup\?redirect_to=https%3A%2F%2Fsabriasna\.github\.io%2FChesscend%2Fweb%2F/);
  assert.deepEqual(calls[0].body.data, { username: 'Newbie' });
  assert.equal(auth.isSignedIn(), false);
  reply = () => ({ status: 200, body: { access_token: 'A', refresh_token: 'R', expires_in: 3600, user: { id: 'u9', email: 'n@b.co' } } });
  assert.deepEqual(await auth.signUp({ email: 'n@b.co', password: 'password1', username: 'Newbie' }), { signedIn: true });
  assert.ok(auth.isSignedIn());
});

test('links from e-mails: confirmation, password reset, expired link', async () => {
  await auth.signOut();
  reply = () => ({ status: 200, body: { id: 'u5', email: 'z@b.co' } });
  const r = await auth.handleEmailRedirect('#access_token=TOK&expires_in=3600&refresh_token=REF&token_type=bearer&type=recovery');
  assert.deepEqual(r, { type: 'recovery' });
  assert.equal(auth.currentUser().email, 'z@b.co');
  const e = await auth.handleEmailRedirect('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid');
  assert.equal(e.error, 'otp_expired');
  assert.equal(await auth.handleEmailRedirect('#home'), null);
});

test('Google: refused clearly while the provider is off, then sends the player to Google', async () => {
  const ss = {};
  globalThis.sessionStorage = { getItem: (k) => ss[k] ?? null, setItem: (k, v) => (ss[k] = String(v)), removeItem: (k) => delete ss[k] };
  let went = null;
  location.assign = (u) => (went = u);
  reply = () => ({ status: 200, body: { external: { email: true, google: false } } });
  await assert.rejects(auth.signInWithGoogle(), (e) => e.code === 'googleOff');
  assert.equal(went, null);
  reply = () => ({ status: 200, body: { external: { email: true, google: true } } });
  await auth.signInWithGoogle();
  assert.equal(went, `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent('https://sabriasna.github.io/Chesscend/web/')}`);
  // back from Google: signed in, welcomed as a Google sign-in
  reply = () => ({ status: 200, body: { id: 'g1', email: 'g@gmail.com' } });
  const r = await auth.handleEmailRedirect('#access_token=GT&expires_at=9999999999&expires_in=3600&provider_token=PT&refresh_token=GR&token_type=bearer');
  assert.deepEqual(r, { type: 'oauth' });
  assert.equal(auth.currentUser().email, 'g@gmail.com');
  assert.equal(ss['chesscend:oauth'], undefined);
  // cancelled on Google's page
  ss['chesscend:oauth'] = '1';
  const e = await auth.handleEmailRedirect('#error=access_denied&error_description=cancelled');
  assert.equal(e.google, true);
});

test('username: default Google names are recognised, a change touches only the user row', async () => {
  assert.ok(auth.isDefaultUsername('player_1a2b3c4d'));
  assert.ok(!auth.isDefaultUsername('Djam'));
  assert.ok(!auth.isDefaultUsername('player_magnus'));
  reply = () => ({ status: 204, body: null });
  calls.length = 0;
  await auth.setUsername('Djam_75');
  assert.equal(calls[0].method, 'PATCH');
  assert.equal(calls[0].url, `${SUPABASE_URL}/rest/v1/profiles?id=eq.g1`);
  assert.deepEqual(calls[0].body, { username: 'Djam_75' });
  assert.equal(calls[0].headers.Authorization, 'Bearer GT');
  reply = () => ({ status: 409, body: { code: '23505', message: 'duplicate key value violates unique constraint' } });
  await assert.rejects(auth.setUsername('Taken'), (e) => e.code === 'username');
});
