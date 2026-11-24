// Rules of an online game, as checked by the server (Edge Function "online").
// Pure functions: they take the stored game row and return what must change.
// The same file is copied into supabase/functions/online/ when the function is deployed.
import { Game, squareIndex } from '../engine/chess.js';

/** Time controls offered online (minutes, increment in seconds). */
export const ONLINE_TIME_CONTROLS = [
  { minutes: 3, increment: 2 },
  { minutes: 5, increment: 0 },
  { minutes: 10, increment: 0 },
  { minutes: 15, increment: 10 },
  { minutes: 30, increment: 0 },
];

export const isAllowedTimeControl = (minutes, increment) =>
  ONLINE_TIME_CONTROLS.some((tc) => tc.minutes === minutes && tc.increment === increment);

/** A player who has not made their first move after this long lets the opponent cancel the game. */
export const FIRST_MOVE_MS = 60_000;

export class OnlineError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

const other = (c) => (c === 'w' ? 'b' : 'w');
const ms = (iso) => (iso ? Date.parse(iso) : null);

export function colorOf(row, userId) {
  if (userId && row.white === userId) return 'w';
  if (userId && row.black === userId) return 'b';
  return null;
}

/** Replays the stored moves. A move list that does not replay is refused (never trusted). */
export function replay(moves) {
  const game = new Game();
  for (const san of moves ?? []) if (!game.playSan(san)) throw new OnlineError('corrupt', 500);
  return game;
}

export const sideToMove = (row) => (row.ply % 2 === 0 ? 'w' : 'b');

/** Clocks right now. The clocks start once each side has made a first move. */
export function remaining(row, now) {
  const c = { w: row.white_ms ?? row.base_ms, b: row.black_ms ?? row.base_ms };
  if (row.status === 'active' && row.ply >= 2 && row.turn_started_at) {
    const t = sideToMove(row);
    c[t] = Math.max(0, c[t] - Math.max(0, now - ms(row.turn_started_at)));
  }
  return c;
}

/** Official rule: you cannot win on time with a lone king. */
function timeoutResult(game, flagged) {
  const winner = other(flagged);
  const canWin = game.pos.board.some((p) => p && p.color === winner && p.type !== 'k');
  return canWin ? (winner === 'w' ? '1-0' : '0-1') : '1/2-1/2';
}

const winFor = (c) => (c === 'w' ? '1-0' : '0-1');

function finish(row, game, clocks, result, reason) {
  return {
    type: 'finish',
    expectPly: row.ply,
    finish: { moves: game.sanList(), fen: game.pos.fen(), white_ms: clocks.w, black_ms: clocks.b, result, reason },
  };
}

function parseUci(uci) {
  if (typeof uci !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new OnlineError('badMove');
  return { from: squareIndex(uci.slice(0, 2)), to: squareIndex(uci.slice(2, 4)), promotion: uci[4] || 'q' };
}

/**
 * What an action by `userId` changes in the game `row` at time `now` (ms).
 * Returns { type: 'update', expectPly, patch } or { type: 'finish', expectPly, finish }.
 * Throws OnlineError when the action is not allowed.
 */
export function plan(row, userId, action, args = {}, now = Date.now()) {
  const me = colorOf(row, userId);
  if (!me) throw new OnlineError('notYourGame', 403);
  if (row.status !== 'active') throw new OnlineError('gameOver', 409);
  const game = replay(row.moves);
  const opp = other(me);
  const clocks = remaining(row, now);

  switch (action) {
    case 'move': {
      if (Number.isInteger(args.ply) && args.ply !== row.ply) throw new OnlineError('stale', 409);
      if (sideToMove(row) !== me) throw new OnlineError('notYourTurn', 409);
      if (row.ply >= 2 && clocks[me] <= 0) return finish(row, game, clocks, timeoutResult(game, me), 'timeout');
      const { from, to, promotion } = parseUci(args.uci);
      const entry = game.play(from, to, promotion);
      if (!entry) throw new OnlineError('illegal');
      if (row.ply >= 2) clocks[me] += row.inc_ms;
      const r = game.result();
      if (r.over) return finish({ ...row }, game, clocks, r.winner ? winFor(r.winner) : '1/2-1/2', r.reason);
      return {
        type: 'update',
        expectPly: row.ply,
        patch: {
          moves: game.sanList(),
          fen: game.pos.fen(),
          ply: row.ply + 1,
          white_ms: clocks.w,
          black_ms: clocks.b,
          turn_started_at: new Date(now).toISOString(),
          // A move answers the opponent's draw offer with "no"; your own offer stays open.
          draw_offer: row.draw_offer === me ? me : null,
        },
      };
    }
    case 'resign':
      if (row.ply < 2) return finish(row, game, clocks, null, 'abort');
      return finish(row, game, clocks, winFor(opp), 'resign');
    case 'abort':
      if (row.ply >= 2) throw new OnlineError('tooLate', 409);
      return finish(row, game, clocks, null, 'abort');
    case 'offer_draw':
      if (row.ply < 2) throw new OnlineError('tooEarly', 409);
      if (row.draw_offer) throw new OnlineError('alreadyOffered', 409);
      return { type: 'update', expectPly: row.ply, patch: { draw_offer: me } };
    case 'accept_draw':
      if (row.draw_offer !== opp) throw new OnlineError('noOffer', 409);
      return finish(row, game, clocks, '1/2-1/2', 'agreement');
    case 'decline_draw':
      if (row.draw_offer !== opp) throw new OnlineError('noOffer', 409);
      return { type: 'update', expectPly: row.ply, patch: { draw_offer: null } };
    case 'claim': {
      const t = sideToMove(row);
      if (t === me) throw new OnlineError('notYet', 409);
      if (row.ply < 2) {
        if (now - ms(row.turn_started_at) < FIRST_MOVE_MS) throw new OnlineError('notYet', 409);
        return finish(row, game, clocks, null, 'noStart');
      }
      if (clocks[t] > 0) throw new OnlineError('notYet', 409);
      return finish(row, game, clocks, timeoutResult(game, t), 'timeout');
    }
    default:
      throw new OnlineError('unknownAction');
  }
}

/**
 * A game that can no longer go on by itself: the player to move has run out of time,
 * or a player never made a first move. Returns how it ends, or null.
 * Used by the server so that a game left by both players does not stay open forever.
 */
export function expire(row, now = Date.now()) {
  if (row.status !== 'active') return null;
  const game = replay(row.moves);
  const clocks = remaining(row, now);
  const t = sideToMove(row);
  if (row.ply < 2) return now - ms(row.turn_started_at) >= FIRST_MOVE_MS ? finish(row, game, clocks, null, 'noStart') : null;
  return clocks[t] <= 0 ? finish(row, game, clocks, timeoutResult(game, t), 'timeout') : null;
}

/** Fields that start a game when a second player joins. */
export function startPatch(row, joiner, players, now = Date.now(), random = Math.random) {
  const creatorWhite = random() < 0.5;
  const w = creatorWhite ? row.creator : joiner;
  const b = creatorWhite ? joiner : row.creator;
  return {
    status: 'active',
    white: w,
    black: b,
    white_name: players[w]?.name ?? null,
    black_name: players[b]?.name ?? null,
    white_rating: players[w]?.rating ?? 1200,
    black_rating: players[b]?.rating ?? 1200,
    white_ms: row.base_ms,
    black_ms: row.base_ms,
    turn_started_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
  };
}
