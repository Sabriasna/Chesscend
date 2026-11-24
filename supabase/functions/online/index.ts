// Edge Function "online": the only way to change an online game.
// Every move is replayed and checked with the Chesscend chess engine; clocks are kept here.
// Deployed with verify_jwt = false: the player's session is checked below with Supabase Auth.
import { plan, expire, startPatch, isAllowedTimeControl, OnlineError } from './online/core.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const pick = (name: string) => {
  try {
    return JSON.parse(Deno.env.get(name) ?? '{}').default as string | undefined;
  } catch {
    return undefined;
  }
};
const SECRET = pick('SUPABASE_SECRET_KEYS') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUBLIC_KEY = pick('SUPABASE_PUBLISHABLE_KEYS') ?? Deno.env.get('SUPABASE_ANON_KEY')!;
const adminHeaders: Record<string, string> = SECRET.startsWith('sb_secret')
  ? { apikey: SECRET }
  : { apikey: SECRET, Authorization: `Bearer ${SECRET}` };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const WAIT_FRESH_MS = 20_000; // a quick-pairing seek disappears when its page stops asking
const DEFAULT_NAME = /^player_[0-9a-f]{8}$/;

async function db(path: string, { method = 'GET', body, prefer }: { method?: string; body?: unknown; prefer?: string } = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: { ...adminHeaders, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`db ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function currentUser(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: PUBLIC_KEY, Authorization: auth } });
  if (!res.ok) return null;
  const u = await res.json();
  return u?.id ?? null;
}

async function player(id: string) {
  const [p] = await db(`/rest/v1/profiles?id=eq.${id}&select=username`);
  const [r] = await db(`/rest/v1/ratings?user_id=eq.${id}&select=rating`);
  return { name: p?.username ?? null, rating: r?.rating ?? 1200 };
}

const getGame = async (id: string) => {
  if (!/^[0-9a-f-]{36}$/.test(id ?? '')) throw new OnlineError('notFound', 404);
  const [g] = await db(`/rest/v1/online_games?id=eq.${id}`);
  if (!g) throw new OnlineError('notFound', 404);
  return g;
};
const isPlayer = (g: any, me: string) => [g.creator, g.white, g.black].includes(me);

async function finishGame(g: any, p: any) {
  const f = p.finish;
  return db('/rest/v1/rpc/finish_online_game', {
    method: 'POST',
    body: {
      p_id: g.id,
      p_expected_ply: p.expectPly,
      p_moves: f.moves,
      p_fen: f.fen,
      p_white_ms: Math.round(f.white_ms),
      p_black_ms: Math.round(f.black_ms),
      p_result: f.result,
      p_reason: f.reason,
    },
  });
}

/** Closes a game nobody can finish any more (time run out, or no first move). */
async function settle(g: any) {
  const p = expire(g, Date.now());
  if (!p) return g;
  const done = await finishGame(g, p);
  return done?.id ? done : await getGame(g.id);
}

/** Starts the waiting game `g` with `me` as the second player, unless someone was faster. */
async function start(g: any, me: string, meInfo: any) {
  const players = { [g.creator]: await player(g.creator), [me]: meInfo };
  const rows = await db(`/rest/v1/online_games?id=eq.${g.id}&status=eq.waiting`, {
    method: 'PATCH',
    body: startPatch(g, me, players),
    prefer: 'return=representation',
  });
  return rows[0] ?? null;
}

/** Quick pairing: joins the oldest fresh seek with the same clock (older than `mine`, if given). */
async function match(me: string, meInfo: any, base: number, inc: number, mine?: any) {
  const fresh = new Date(Date.now() - WAIT_FRESH_MS).toISOString();
  let q = `/rest/v1/online_games?status=eq.waiting&kind=eq.quick&base_ms=eq.${base}&inc_ms=eq.${inc}&creator=neq.${me}&updated_at=gt.${encodeURIComponent(fresh)}&order=created_at.asc&limit=5`;
  if (mine) q += `&created_at=lt.${encodeURIComponent(mine.created_at)}`;
  for (const g of await db(q)) {
    const started = await start(g, me, meInfo);
    if (started) {
      if (mine) await cancel(mine.id, me);
      return started;
    }
  }
  return null;
}

const cancel = (id: string, me: string) =>
  db(`/rest/v1/online_games?id=eq.${id}&creator=eq.${me}&status=eq.waiting`, {
    method: 'PATCH',
    body: { status: 'aborted', reason: 'cancelled', updated_at: new Date().toISOString() },
  });

async function newGame(me: string, kind: string, minutes: number, increment: number) {
  if (!isAllowedTimeControl(minutes, increment)) throw new OnlineError('badClock');
  const meInfo = await player(me);
  if (!meInfo.name || DEFAULT_NAME.test(meInfo.name)) throw new OnlineError('needUsername', 409);
  // One game at a time: an unfinished game is given back instead.
  const [active] = await db(`/rest/v1/online_games?status=eq.active&or=(white.eq.${me},black.eq.${me})&limit=1`);
  if (active) {
    const still = await settle(active);
    if (still.status === 'active') return still;
  }
  await db(`/rest/v1/online_games?creator=eq.${me}&status=eq.waiting`, {
    method: 'PATCH',
    body: { status: 'aborted', reason: 'cancelled', updated_at: new Date().toISOString() },
  });
  const base = minutes * 60000;
  const inc = increment * 1000;
  if (kind === 'quick') {
    const found = await match(me, meInfo, base, inc);
    if (found) return found;
  }
  const [g] = await db('/rest/v1/online_games', {
    method: 'POST',
    body: { kind, creator: me, base_ms: base, inc_ms: inc, white_ms: base, black_ms: base },
    prefer: 'return=representation',
  });
  return g;
}

async function handle(action: string, args: any, me: string) {
  switch (action) {
    case 'seek':
      return newGame(me, 'quick', args.minutes, args.increment);
    case 'invite':
      return newGame(me, 'invite', args.minutes, args.increment);
    case 'wait': {
      // Called every few seconds by the waiting page: keeps the seek fresh and looks for an opponent.
      const g = await getGame(args.id);
      if (!isPlayer(g, me)) throw new OnlineError('notYourGame', 403);
      if (g.status !== 'waiting' || g.creator !== me) return settle(g);
      if (g.kind === 'quick') {
        const found = await match(me, await player(me), g.base_ms, g.inc_ms, g);
        if (found) return found;
      }
      const rows = await db(`/rest/v1/online_games?id=eq.${g.id}&status=eq.waiting`, {
        method: 'PATCH',
        body: { updated_at: new Date().toISOString() },
        prefer: 'return=representation',
      });
      return rows[0] ?? (await getGame(args.id));
    }
    case 'cancel':
      await cancel(args.id, me);
      return getGame(args.id);
    case 'join': {
      const g = await getGame(args.id);
      if (isPlayer(g, me)) return settle(g);
      if (g.status !== 'waiting' || g.kind !== 'invite') throw new OnlineError('notAvailable', 409);
      const meInfo = await player(me);
      if (!meInfo.name || DEFAULT_NAME.test(meInfo.name)) throw new OnlineError('needUsername', 409);
      const started = await start(g, me, meInfo);
      if (!started) throw new OnlineError('notAvailable', 409);
      return started;
    }
    case 'state': {
      const g = await getGame(args.id);
      if (!isPlayer(g, me)) throw new OnlineError('notYourGame', 403);
      return settle(g);
    }
    default: {
      const g = await getGame(args.id);
      const p = plan(g, me, action, args, Date.now());
      if (p.type === 'update') {
        const rows = await db(`/rest/v1/online_games?id=eq.${g.id}&status=eq.active&ply=eq.${p.expectPly}`, {
          method: 'PATCH',
          body: { ...p.patch, updated_at: new Date().toISOString() },
          prefer: 'return=representation',
        });
        if (!rows[0]) throw new OnlineError('stale', 409);
        return rows[0];
      }
      const done = await finishGame(g, p);
      if (!done?.id) throw new OnlineError('stale', 409);
      return done;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const me = await currentUser(req);
  if (!me) return json({ error: 'session', now: Date.now() }, 401);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'badRequest' }, 400);
  }
  try {
    const game = await handle(String(body?.action ?? ''), body ?? {}, me);
    return json({ game, now: Date.now() });
  } catch (e) {
    if (e instanceof OnlineError) return json({ error: e.code, now: Date.now() }, e.status);
    console.error(e);
    return json({ error: 'server', now: Date.now() }, 500);
  }
});
