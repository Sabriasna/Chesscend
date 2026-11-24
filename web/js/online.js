// Online play and rankings, through Supabase.
// The browser only READS games and rankings. Every change (pairing, moves, clocks, results,
// ratings) goes through the Edge Function "online", which checks it with the chess engine.
import { call, currentUser, isSignedIn } from './auth.js';
export { ONLINE_TIME_CONTROLS, remaining, sideToMove, colorOf, FIRST_MOVE_MS } from '../../src/online/core.js';

/** Minimum number of rated online games before a player appears in the Global ranking. */
export const MIN_RANKED_GAMES = 5;

/* ---------------------------------------------------------------- server time */

let offset = 0; // server clock minus this device's clock
/** The server's time now (the clocks of a game are counted on the server). */
export const serverNow = () => Date.now() + offset;
function learnTime(serverMs, sentAt) {
  if (typeof serverMs !== 'number') return;
  offset = serverMs - (sentAt + Date.now()) / 2;
}

/* ---------------------------------------------------------------- actions */

export class OnlineFail extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

/** Asks the server to do something: seek, invite, wait, cancel, join, state, move, resign, abort, offer_draw, accept_draw, decline_draw, claim. */
export async function onlineAction(action, args = {}) {
  const sentAt = Date.now();
  try {
    const r = await call('/functions/v1/online', { method: 'POST', auth: true, body: { action, ...args } });
    learnTime(r?.now, sentAt);
    return r.game;
  } catch (e) {
    learnTime(e.data?.now, sentAt);
    throw new OnlineFail(e.data?.error || e.code || 'network');
  }
}

/** Reads a game (only its two players can). */
export async function fetchGame(id) {
  const rows = await call(`/rest/v1/online_games?id=eq.${encodeURIComponent(id)}&select=*`, { auth: true });
  return rows?.[0] ?? null;
}

/** The player's game in progress or invitation still open, if any. */
export async function currentGame() {
  const me = currentUser()?.id;
  if (!me) return null;
  const rows = await call(
    `/rest/v1/online_games?status=in.(active,waiting)&or=(white.eq.${me},black.eq.${me},creator.eq.${me})&order=created_at.desc&limit=1`,
    { auth: true },
  );
  return rows?.[0] ?? null;
}

/** Last finished online games of the player. */
export async function recentGames(limit = 8) {
  const me = currentUser()?.id;
  if (!me) return [];
  return call(
    `/rest/v1/online_games?status=eq.finished&or=(white.eq.${me},black.eq.${me})&order=finished_at.desc&limit=${limit}`,
    { auth: true },
  );
}

/** The player's Online Rating ({ rating, games, wins, draws, losses }), or null before the first rated game. */
export async function myRating() {
  const me = currentUser()?.id;
  if (!me) return null;
  const rows = await call(`/rest/v1/ratings?user_id=eq.${me}&select=rating,games,wins,draws,losses`, { auth: true });
  return rows?.[0] ?? null;
}

/* ---------------------------------------------------------------- rankings */

export const provider = {
  async getSession() {
    const u = currentUser();
    return u ? { userId: u.id } : null;
  },
  getGlobalLeaderboard: ({ limit = 50 } = {}) =>
    call('/rest/v1/rpc/online_leaderboard', { method: 'POST', auth: isSignedIn(), body: { p_limit: limit } }),
  getFriendsLeaderboard: () => call('/rest/v1/rpc/online_opponents', { method: 'POST', auth: true, body: {} }),
};

/**
 * Loads a leaderboard and returns a state the page can show:
 *   { status: 'unavailable' }                     no online service
 *   { status: 'signed-out' }                      the Friends view needs an account
 *   { status: 'error', message }                  could not load
 *   { status: 'empty', members, ranked }          nobody ranked yet (situations A and B)
 *   { status: 'list', rows, me, members }         real ranked players (situation C)
 *   { status: 'no-friends' }                      no online opponent yet
 */
export async function loadLeaderboard(kind, p = provider) {
  if (!p) return { status: 'unavailable' };
  try {
    const session = await p.getSession();
    if (!session && kind === 'friends') return { status: 'signed-out' };
    if (kind === 'friends') {
      const r = await p.getFriendsLeaderboard();
      if (!r.friends) return { status: 'no-friends' };
      return { status: 'list', rows: r.rows ?? [], me: session?.userId ?? null };
    }
    const r = await p.getGlobalLeaderboard({ limit: 50 });
    if (!r.ranked || !r.rows?.length) return { status: 'empty', members: r.members ?? 0, ranked: 0, signedIn: !!session };
    return { status: 'list', rows: r.rows, me: session?.userId ?? null, meRow: r.me ?? null, members: r.members, signedIn: !!session };
  } catch (e) {
    return { status: 'error', message: e?.message || 'Network error' };
  }
}
