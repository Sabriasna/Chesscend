// Runs the real Edge Function "online" for the browser tests, with an in-memory database
// that follows the same rules as the real one (row-level security on reads, results and
// ratings written only through finish_online_game). Usage: node online-server.mjs <port>
import http from 'node:http';

const db = { profiles: [], ratings: [], online_games: [] };
const tokens = {}; // access token -> user id
let seq = 0;
const uuid = () => `cccccccc-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

function matches(row, key, cond) {
  if (key === 'or') {
    return cond.slice(1, -1).split(',').some((c) => {
      const [k, op, ...v] = c.split('.');
      return matches(row, k, `${op}.${v.join('.')}`);
    });
  }
  const [op, ...rest] = cond.split('.');
  const v = rest.join('.');
  const x = row[key];
  if (op === 'eq') return String(x) === v;
  if (op === 'neq') return String(x) !== v;
  if (op === 'in') return v.slice(1, -1).split(',').includes(String(x));
  if (op === 'gt') return Date.parse(x) > Date.parse(v);
  if (op === 'lt') return Date.parse(x) < Date.parse(v);
  throw new Error(`op ${op}`);
}

function select(table, query) {
  const params = [...new URLSearchParams(query)];
  let rows = db[table].filter((r) => params.every(([k, v]) => ['select', 'order', 'limit'].includes(k) || matches(r, k, v)));
  const order = params.find(([k]) => k === 'order');
  if (order) {
    const [col, dir] = order[1].split('.');
    rows.sort((a, b) => ((a[col] ?? '') < (b[col] ?? '') ? -1 : 1) * (dir === 'desc' ? -1 : 1));
  }
  const limit = params.find(([k]) => k === 'limit');
  if (limit) rows = rows.slice(0, +limit[1]);
  return rows;
}

function finishRpc(b) {
  const g = db.online_games.find((x) => x.id === b.p_id && x.status === 'active' && x.ply === b.p_expected_ply);
  if (!g) return null;
  const rated = b.p_moves.length >= 2 && b.p_result !== null && g.white && g.black;
  let cw = null;
  let cb = null;
  if (rated) {
    const get = (id) => db.ratings.find((r) => r.user_id === id) ?? (db.ratings.push({ user_id: id, rating: 1200, games: 0, wins: 0, draws: 0, losses: 0 }), db.ratings.at(-1));
    const rw = get(g.white);
    const rb = get(g.black);
    const sw = b.p_result === '1-0' ? 1 : b.p_result === '0-1' ? 0 : 0.5;
    const expw = 1 / (1 + 10 ** ((rb.rating - rw.rating) / 400));
    cw = Math.round((rw.games < 20 ? 40 : 20) * (sw - expw));
    cb = Math.round((rb.games < 20 ? 40 : 20) * (1 - sw - (1 - expw)));
    for (const [r, c, s] of [[rw, cw, sw], [rb, cb, 1 - sw]]) {
      r.rating = Math.max(100, r.rating + c);
      r.games++;
      if (s === 1) r.wins++;
      else if (s === 0) r.losses++;
      else r.draws++;
    }
  }
  Object.assign(g, {
    status: rated ? 'finished' : 'aborted', moves: b.p_moves, fen: b.p_fen, ply: b.p_moves.length,
    white_ms: b.p_white_ms, black_ms: b.p_black_ms, result: rated ? b.p_result : null, reason: b.p_reason,
    white_change: cw, black_change: cb, draw_offer: null, turn_started_at: null, finished_at: new Date().toISOString(),
  });
  return { ...g };
}

const name = (id) => db.profiles.find((p) => p.id === id)?.username;

function leaderboard(me) {
  const ranked = db.ratings
    .filter((r) => r.games >= 5)
    .sort((a, b) => b.rating - a.rating || b.games - a.games)
    .map((r, i) => ({ userId: r.user_id, name: name(r.user_id), rating: r.rating, games: r.games, position: i + 1 }));
  return { members: db.profiles.length, ranked: ranked.length, rows: ranked.slice(0, 50), me: ranked.find((r) => r.userId === me) ?? null };
}

function opponents(me) {
  const opp = new Set();
  for (const g of db.online_games) if (g.status === 'finished' && [g.white, g.black].includes(me)) opp.add(g.white === me ? g.black : g.white);
  const people = db.ratings
    .filter((r) => opp.has(r.user_id) || r.user_id === me)
    .sort((a, b) => b.rating - a.rating)
    .map((r, i) => ({ userId: r.user_id, name: name(r.user_id), rating: r.rating, games: r.games, position: i + 1 }));
  return { friends: opp.size, rows: people };
}

// What the Edge Function sees as "Supabase" (secret key: no row-level security).
const innerFetch = async (url, opts = {}) => {
  const u = new URL(url);
  const reply = (status, body) => new Response(body === null || body === undefined ? '' : JSON.stringify(body), { status });
  if (u.pathname === '/auth/v1/user') {
    const id = tokens[(opts.headers?.Authorization ?? '').replace('Bearer ', '')];
    return id ? reply(200, { id }) : reply(401, { msg: 'bad jwt' });
  }
  const body = opts.body ? JSON.parse(opts.body) : undefined;
  if (u.pathname === '/rest/v1/rpc/finish_online_game') return reply(200, finishRpc(body));
  const table = u.pathname.replace('/rest/v1/', '');
  const method = opts.method ?? 'GET';
  if (method === 'POST') {
    const now = new Date().toISOString();
    const row = { id: uuid(), status: 'waiting', white: null, black: null, moves: [], ply: 0, draw_offer: null, created_at: now, updated_at: now, turn_started_at: null, result: null, ...body };
    db[table].push(row);
    return reply(201, [{ ...row }]);
  }
  const rows = select(table, u.search);
  if (method === 'PATCH') rows.forEach((r) => Object.assign(r, body));
  return reply(200, rows.map((r) => ({ ...r })));
};

let handler;
globalThis.Deno = {
  env: { get: (k) => ({ SUPABASE_URL: 'http://inner', SUPABASE_SECRET_KEYS: '{"default":"sb_secret_test"}', SUPABASE_PUBLISHABLE_KEYS: '{"default":"sb_publishable_test"}' })[k] },
  serve: (h) => (handler = h),
};
const realFetch = globalThis.fetch;
globalThis.fetch = (url, opts) => (String(url).startsWith('http://inner') ? innerFetch(url, opts) : realFetch(url, opts));
await import('../../supabase/functions/online/index.ts');

const server = http.createServer(async (req, res) => {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const send = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(body === undefined || body === null ? '' : typeof body === 'string' ? body : JSON.stringify(body));
  };
  const u = new URL(req.url, 'http://x');
  const me = tokens[(req.headers.authorization ?? '').replace('Bearer ', '')] ?? null;
  // test helpers
  if (u.pathname === '/__users') {
    const { users, tokens: tk } = JSON.parse(raw);
    Object.assign(tokens, tk);
    for (const p of users) {
      const old = db.profiles.find((x) => x.id === p.id);
      if (old) old.username = p.username;
      else db.profiles.push({ ...p });
    }
    return send(200, {});
  }
  if (u.pathname === '/__db') return send(200, db);
  if (u.pathname === '/__age') {
    // makes the waiting searches look old (a closed page)
    const { id, ms } = JSON.parse(raw);
    for (const g of db.online_games) if (!id || g.id === id) g.updated_at = new Date(Date.now() - ms).toISOString();
    return send(200, {});
  }
  if (u.pathname === '/functions/v1/online') {
    const r = await handler(new Request('http://x/functions/v1/online', { method: 'POST', headers: { Authorization: req.headers.authorization ?? '', 'Content-Type': 'application/json' }, body: raw }));
    return send(r.status, await r.text());
  }
  // browser reads, with the real policies: a player sees only their own games and rating
  if (u.pathname === '/rest/v1/online_games') {
    if (!me) return send(200, []);
    return send(200, select('online_games', u.search).filter((g) => [g.creator, g.white, g.black].includes(me)));
  }
  if (u.pathname === '/rest/v1/ratings') return send(200, me ? select('ratings', u.search).filter((r) => r.user_id === me) : []);
  if (u.pathname === '/rest/v1/rpc/online_leaderboard') return send(200, leaderboard(me));
  if (u.pathname === '/rest/v1/rpc/online_opponents') return me ? send(200, opponents(me)) : send(401, { message: 'not signed in' });
  return send(404, { message: 'not found' });
});
server.listen(+process.argv[2] || 54321, '127.0.0.1', () => console.log('ready'));
