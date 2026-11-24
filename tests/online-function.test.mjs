// The Edge Function "online", run in Node against a small stand-in for Supabase
// (Auth + the PostgREST queries the function uses). The SQL itself is checked on the real database.
import test from 'node:test';
import assert from 'node:assert/strict';

const USERS = { 'tok-sab': 'aaaaaaaa-0000-4000-8000-000000000001', 'tok-lou': 'aaaaaaaa-0000-4000-8000-000000000002', 'tok-new': 'aaaaaaaa-0000-4000-8000-000000000003', 'tok-zoe': 'aaaaaaaa-0000-4000-8000-000000000004' };
const [SAB, LOU, NEW, ZOE] = Object.values(USERS);
const db = {
  profiles: [
    { id: SAB, username: 'Sab' },
    { id: LOU, username: 'Lou' },
    { id: NEW, username: 'player_1a2b3c4d' },
    { id: ZOE, username: 'Zoe' },
  ],
  ratings: [{ user_id: SAB, rating: 1300 }],
  online_games: [],
  finishes: [],
};
let seq = 0;
const uuid = () => `bbbbbbbb-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

function matches(row, key, cond) {
  if (key === 'or') {
    return cond
      .slice(1, -1)
      .split(',')
      .some((c) => {
        const [k, op, ...v] = c.split('.');
        return matches(row, k, `${op}.${v.join('.')}`);
      });
  }
  const [op, ...rest] = cond.split('.');
  const v = decodeURIComponent(rest.join('.'));
  const x = row[key];
  if (op === 'eq') return String(x) === v;
  if (op === 'neq') return String(x) !== v;
  if (op === 'gt') return Date.parse(x) > Date.parse(v);
  if (op === 'lt') return Date.parse(x) < Date.parse(v);
  throw new Error(`op ${op}`);
}

function rest(table, method, query, body) {
  const params = [...new URLSearchParams(query)];
  let rows = db[table].filter((r) => params.every(([k, v]) => ['select', 'order', 'limit'].includes(k) || matches(r, k, v)));
  const order = params.find(([k]) => k === 'order');
  if (order) rows.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const limit = params.find(([k]) => k === 'limit');
  if (limit) rows = rows.slice(0, +limit[1]);
  if (method === 'GET') return rows.map((r) => ({ ...r }));
  if (method === 'PATCH') {
    rows.forEach((r) => Object.assign(r, body));
    return rows.map((r) => ({ ...r }));
  }
  if (method === 'POST') {
    const now = new Date().toISOString();
    const row = {
      id: uuid(), status: 'waiting', white: null, black: null, moves: [], ply: 0, draw_offer: null,
      created_at: now, updated_at: now, turn_started_at: null, result: null, ...body,
    };
    db[table].push(row);
    return [{ ...row }];
  }
}

function finishRpc(b) {
  const g = db.online_games.find((x) => x.id === b.p_id && x.status === 'active' && x.ply === b.p_expected_ply);
  if (!g) return null;
  const rated = b.p_moves.length >= 2 && b.p_result !== null;
  Object.assign(g, {
    status: rated ? 'finished' : 'aborted', moves: b.p_moves, fen: b.p_fen, ply: b.p_moves.length,
    white_ms: b.p_white_ms, black_ms: b.p_black_ms, result: rated ? b.p_result : null, reason: b.p_reason,
  });
  db.finishes.push({ id: g.id, rated, result: b.p_result, reason: b.p_reason });
  return { ...g };
}

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const reply = (status, body) => new Response(body === null ? '' : JSON.stringify(body), { status });
  if (u.pathname === '/auth/v1/user') {
    const id = USERS[(opts.headers?.Authorization ?? '').replace('Bearer ', '')];
    return id ? reply(200, { id }) : reply(401, { msg: 'bad jwt' });
  }
  assert.equal(opts.headers.apikey, 'sb_secret_test', 'database calls use the secret key, never the player token');
  const body = opts.body ? JSON.parse(opts.body) : undefined;
  if (u.pathname === '/rest/v1/rpc/finish_online_game') return reply(200, finishRpc(body));
  const table = u.pathname.replace('/rest/v1/', '');
  return reply(200, rest(table, opts.method ?? 'GET', u.search, body));
};

let handler;
globalThis.Deno = {
  env: { get: (k) => ({ SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SECRET_KEYS: '{"default":"sb_secret_test"}', SUPABASE_PUBLISHABLE_KEYS: '{"default":"sb_publishable_test"}' })[k] },
  serve: (h) => (handler = h),
};
await import('../supabase/functions/online/index.ts');

async function call(token, body) {
  const res = await handler(
    new Request('https://x.supabase.co/functions/v1/online', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, ...(await res.json()) };
}

test('needs a signed-in player with a chosen username and an allowed clock', async () => {
  assert.equal((await call('nope', { action: 'seek', minutes: 10, increment: 0 })).status, 401);
  assert.equal((await call('tok-new', { action: 'seek', minutes: 10, increment: 0 })).error, 'needUsername');
  assert.equal((await call('tok-sab', { action: 'seek', minutes: 7, increment: 0 })).error, 'badClock');
});

test('quick pairing: the second player with the same clock starts the game', async () => {
  const a = await call('tok-sab', { action: 'seek', minutes: 10, increment: 0 });
  assert.equal(a.game.status, 'waiting');
  assert.equal(typeof a.now, 'number');
  const w = await call('tok-sab', { action: 'wait', id: a.game.id });
  assert.equal(w.game.status, 'waiting');
  // a different clock does not match
  const z = await call('tok-zoe', { action: 'seek', minutes: 3, increment: 2 });
  assert.equal(z.game.status, 'waiting');
  const b = await call('tok-lou', { action: 'seek', minutes: 10, increment: 0 });
  assert.equal(b.game.id, a.game.id);
  assert.equal(b.game.status, 'active');
  assert.deepEqual(new Set([b.game.white, b.game.black]), new Set([SAB, LOU]));
  const names = { [b.game.white]: b.game.white_name, [b.game.black]: b.game.black_name };
  assert.deepEqual([names[SAB], names[LOU]], ['Sab', 'Lou']);
  assert.equal(b.game.white === SAB ? b.game.white_rating : b.game.black_rating, 1300);
  // the creator sees it on the next wait
  assert.equal((await call('tok-sab', { action: 'wait', id: a.game.id })).game.status, 'active');
  // only one game at a time: seeking again gives the unfinished game back
  assert.equal((await call('tok-lou', { action: 'seek', minutes: 3, increment: 2 })).game.id, a.game.id);
  // a stranger cannot read or play it
  assert.equal((await call('tok-zoe', { action: 'state', id: a.game.id })).error, 'notYourGame');
  assert.equal((await call('tok-zoe', { action: 'move', id: a.game.id, uci: 'e2e4' })).error, 'notYourGame');
  await call('tok-zoe', { action: 'cancel', id: z.game.id });
});

test('moves are checked, stale moves refused, the game ends on the server', async () => {
  const g = db.online_games.find((x) => x.status === 'active');
  const tok = (c) => (g[c === 'w' ? 'white' : 'black'] === SAB ? 'tok-sab' : 'tok-lou');
  assert.equal((await call(tok('b'), { action: 'move', id: g.id, uci: 'e7e5', ply: 0 })).error, 'notYourTurn');
  assert.equal((await call(tok('w'), { action: 'move', id: g.id, uci: 'e2e5', ply: 0 })).error, 'illegal');
  const seq = [['w', 'f2f3'], ['b', 'e7e5'], ['w', 'g2g4']];
  let r;
  for (const [i, [c, uci]] of seq.entries()) {
    r = await call(tok(c), { action: 'move', id: g.id, uci, ply: i });
    assert.equal(r.game.ply, i + 1);
  }
  assert.equal((await call(tok('b'), { action: 'move', id: g.id, uci: 'd8h4', ply: 2 })).error, 'stale');
  r = await call(tok('b'), { action: 'move', id: g.id, uci: 'd8h4', ply: 3 });
  assert.equal(r.game.status, 'finished');
  assert.deepEqual([r.game.result, r.game.reason], ['0-1', 'checkmate']);
  assert.deepEqual(db.finishes.at(-1), { id: g.id, rated: true, result: '0-1', reason: 'checkmate' });
  assert.equal((await call(tok('w'), { action: 'move', id: g.id, uci: 'a2a3', ply: 4 })).error, 'gameOver');
});

test('invite: a link the friend opens; the creator cannot join their own game; one guest only', async () => {
  const a = await call('tok-sab', { action: 'invite', minutes: 15, increment: 10 });
  assert.equal(a.game.kind, 'invite');
  assert.equal((await call('tok-sab', { action: 'join', id: a.game.id })).game.status, 'waiting');
  // quick pairing never picks an invitation
  const q = await call('tok-zoe', { action: 'seek', minutes: 15, increment: 10 });
  assert.notEqual(q.game.id, a.game.id);
  await call('tok-zoe', { action: 'cancel', id: q.game.id });
  const j = await call('tok-lou', { action: 'join', id: a.game.id });
  assert.equal(j.game.status, 'active');
  assert.equal(j.game.base_ms, 900000);
  assert.equal((await call('tok-zoe', { action: 'join', id: a.game.id })).error, 'notAvailable');
  assert.equal((await call('tok-zoe', { action: 'join', id: 'not-a-uuid' })).error, 'notFound');
  // abort before both have moved: unrated
  const ab = await call('tok-sab', { action: 'abort', id: a.game.id });
  assert.equal(ab.game.status, 'aborted');
  assert.equal(db.finishes.at(-1).rated, false);
});

test('a forgotten seek (page closed) is not matched any more', async () => {
  const a = await call('tok-zoe', { action: 'seek', minutes: 5, increment: 0 });
  db.online_games.find((x) => x.id === a.game.id).updated_at = new Date(Date.now() - 60000).toISOString();
  const b = await call('tok-lou', { action: 'seek', minutes: 5, increment: 0 });
  assert.notEqual(b.game.id, a.game.id);
  assert.equal(b.game.status, 'waiting');
  // two waiting players find each other on the next "wait": the newer one joins the older one
  const fresh = await call('tok-zoe', { action: 'seek', minutes: 5, increment: 0 });
  assert.equal(fresh.game.status, 'active', 'Zoe joins Lou, who is still waiting');
  assert.equal(fresh.game.id, b.game.id);
});

test('an abandoned game does not block a new one', async () => {
  const g = db.online_games.find((x) => x.status === 'active');
  Object.assign(g, { moves: ['e4', 'e5'], ply: 2, white_ms: 1000, turn_started_at: new Date(Date.now() - 5000).toISOString() });
  const tok = g.white === LOU ? 'tok-lou' : 'tok-zoe';
  const r = await call(tok, { action: 'seek', minutes: 10, increment: 0 });
  assert.notEqual(r.game.id, g.id);
  assert.equal(g.status, 'finished');
  assert.equal(g.reason, 'timeout');
});
