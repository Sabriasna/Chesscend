// Online game rules (the checks the server makes before changing a game).
import test from 'node:test';
import assert from 'node:assert/strict';
import { plan, remaining, startPatch, isAllowedTimeControl, OnlineError, FIRST_MOVE_MS } from '../src/online/core.js';

const W = 'user-w';
const B = 'user-b';
const T0 = Date.parse('2026-11-24T10:00:00Z');
const iso = (t) => new Date(t).toISOString();

const row = (over = {}) => ({
  id: 'g1', status: 'active', creator: W, white: W, black: B,
  base_ms: 180000, inc_ms: 2000, moves: [], ply: 0,
  white_ms: 180000, black_ms: 180000, turn_started_at: iso(T0), draw_offer: null, ...over,
});

/** Applies a plan result to a row, as the server does. */
function apply(r, p) {
  if (p.type === 'update') return { ...r, ...p.patch };
  return { ...r, status: p.finish.moves.length >= 2 ? 'finished' : 'aborted', ...p.finish, ply: p.finish.moves.length };
}

const rejects = (fn, code) => assert.throws(fn, (e) => e instanceof OnlineError && e.code === code);

test('only the players can act, and only on their turn', () => {
  rejects(() => plan(row(), 'stranger', 'move', { uci: 'e2e4' }, T0), 'notYourGame');
  rejects(() => plan(row(), B, 'move', { uci: 'e7e5' }, T0), 'notYourTurn');
  rejects(() => plan(row({ status: 'finished' }), W, 'move', { uci: 'e2e4' }, T0), 'gameOver');
});

test('illegal or malformed moves are refused, legal ones are stored as SAN', () => {
  rejects(() => plan(row(), W, 'move', { uci: 'e2e5' }, T0), 'illegal');
  rejects(() => plan(row(), W, 'move', { uci: 'zz' }, T0), 'badMove');
  rejects(() => plan(row(), W, 'move', { uci: 'e2e4', ply: 3 }, T0), 'stale');
  const p = plan(row(), W, 'move', { uci: 'e2e4', ply: 0 }, T0 + 5000);
  assert.equal(p.type, 'update');
  assert.deepEqual(p.patch.moves, ['e4']);
  assert.equal(p.patch.ply, 1);
  assert.equal(p.patch.white_ms, 180000, 'no time is taken before both sides have moved');
});

test('a stored move list that does not replay is never trusted', () => {
  assert.throws(() => plan(row({ moves: ['e4', 'Ke7??'], ply: 2 }), W, 'move', { uci: 'd2d4' }, T0), (e) => e.code === 'corrupt');
});

test('clocks: time is taken from the side to move, increment added after the move', () => {
  let r = row();
  r = apply(r, plan(r, W, 'move', { uci: 'e2e4' }, T0 + 1000));
  r = apply(r, plan(r, B, 'move', { uci: 'e7e5' }, T0 + 2000)); // clocks start now
  assert.deepEqual(remaining(r, T0 + 12000), { w: 170000, b: 180000 });
  const p = plan(r, W, 'move', { uci: 'g1f3' }, T0 + 12000);
  assert.equal(p.patch.white_ms, 172000); // 180 - 10 + 2
  assert.equal(p.patch.black_ms, 180000);
});

test('a move after the flag has fallen loses on time', () => {
  let r = row({ moves: ['e4', 'e5'], ply: 2, white_ms: 5000, turn_started_at: iso(T0) });
  const p = plan(r, W, 'move', { uci: 'g1f3' }, T0 + 6000);
  assert.equal(p.type, 'finish');
  assert.deepEqual([p.finish.result, p.finish.reason], ['0-1', 'timeout']);
  assert.deepEqual(p.finish.moves, ['e4', 'e5'], 'the late move is not played');
});

test('claim: win on time only when the clock is really empty', () => {
  const r = row({ moves: ['e4', 'e5'], ply: 2, white_ms: 5000, turn_started_at: iso(T0) });
  rejects(() => plan(r, B, 'claim', {}, T0 + 4000), 'notYet');
  rejects(() => plan(r, W, 'claim', {}, T0 + 9000), 'notYet'); // cannot claim against yourself
  const p = plan(r, B, 'claim', {}, T0 + 5001);
  assert.deepEqual([p.finish.result, p.finish.reason], ['0-1', 'timeout']);
});

test('first move: a player who never starts lets the opponent cancel, unrated', () => {
  const r = row();
  rejects(() => plan(r, B, 'claim', {}, T0 + FIRST_MOVE_MS - 1), 'notYet');
  const p = plan(r, B, 'claim', {}, T0 + FIRST_MOVE_MS + 1);
  assert.deepEqual([p.finish.result, p.finish.reason], [null, 'noStart']);
  assert.equal(apply(r, p).status, 'aborted');
});

test('abort only before both sides have moved; resign gives the win to the opponent', () => {
  const r0 = row({ moves: ['e4'], ply: 1 });
  assert.equal(plan(r0, B, 'abort', {}, T0).finish.reason, 'abort');
  const r2 = row({ moves: ['e4', 'e5'], ply: 2 });
  rejects(() => plan(r2, W, 'abort', {}, T0), 'tooLate');
  assert.deepEqual([plan(r2, W, 'resign', {}, T0).finish.result, plan(r2, B, 'resign', {}, T0).finish.result], ['0-1', '1-0']);
});

test('draw offers: offer, decline by moving, accept', () => {
  let r = row({ moves: ['e4', 'e5'], ply: 2 });
  rejects(() => plan(row(), W, 'offer_draw', {}, T0), 'tooEarly');
  r = apply(r, plan(r, W, 'offer_draw', {}, T0));
  assert.equal(r.draw_offer, 'w');
  rejects(() => plan(r, W, 'accept_draw', {}, T0), 'noOffer'); // not your own offer
  const accepted = plan(r, B, 'accept_draw', {}, T0);
  assert.deepEqual([accepted.finish.result, accepted.finish.reason], ['1/2-1/2', 'agreement']);
  // White moves with the offer still open, Black answers with a move: the offer is gone
  r = apply(r, plan(r, W, 'move', { uci: 'g1f3' }, T0));
  assert.equal(r.draw_offer, 'w');
  r = apply(r, plan(r, B, 'move', { uci: 'b8c6' }, T0));
  assert.equal(r.draw_offer, null);
});

test('checkmate ends the game on the server', () => {
  let r = row();
  const seq = [[W, 'f2f3'], [B, 'e7e5'], [W, 'g2g4'], [B, 'd8h4']];
  let p;
  for (const [u, uci] of seq) {
    p = plan(r, u, 'move', { uci }, T0);
    r = apply(r, p);
  }
  assert.equal(p.type, 'finish');
  assert.deepEqual([p.finish.result, p.finish.reason], ['0-1', 'checkmate']);
  assert.deepEqual(p.finish.moves, ['f3', 'e5', 'g4', 'Qh4#']);
});

test('promotion: the chosen piece is played', () => {
  const moves = ['a4', 'h5', 'a5', 'h4', 'a6', 'h3', 'axb7', 'hxg2'];
  const r = row({ moves, ply: 8 });
  const p = plan(r, W, 'move', { uci: 'b7a8n' }, T0);
  assert.equal(p.patch.moves.at(-1), 'bxa8=N');
});

test('start: random colours, names and ratings, full clocks; only allowed time controls', () => {
  const r = { creator: 'c', base_ms: 600000 };
  const players = { c: { name: 'Sab', rating: 1250 }, j: { name: 'Lou' } };
  const a = startPatch(r, 'j', players, T0, () => 0.1);
  assert.deepEqual([a.white, a.black, a.white_name, a.black_name, a.white_rating, a.black_rating], ['c', 'j', 'Sab', 'Lou', 1250, 1200]);
  const b = startPatch(r, 'j', players, T0, () => 0.9);
  assert.deepEqual([b.white, b.black], ['j', 'c']);
  assert.equal(a.white_ms, 600000);
  assert.ok(isAllowedTimeControl(3, 2) && isAllowedTimeControl(10, 0));
  assert.ok(!isAllowedTimeControl(0, 0) && !isAllowedTimeControl(1, 0) && !isAllowedTimeControl(3, 0));
});

test('expire: a game left by both players closes itself', async () => {
  const { expire } = await import('../src/online/core.js');
  assert.equal(expire(row(), T0 + 1000), null);
  assert.equal(expire(row(), T0 + FIRST_MOVE_MS + 1).finish.reason, 'noStart');
  const r = row({ moves: ['e4', 'e5'], ply: 2, white_ms: 3000, turn_started_at: iso(T0) });
  assert.equal(expire(r, T0 + 2000), null);
  assert.deepEqual([expire(r, T0 + 3001).finish.result, expire(r, T0 + 3001).finish.reason], ['0-1', 'timeout']);
  assert.equal(expire({ ...r, status: 'finished' }, T0 + 99999), null);
});
