// Chess rules tests. Run with: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, Position, squareIndex as sq } from '../src/engine/chess.js';

/** Counts leaf nodes: the standard way to check a move generator. */
function perft(pos, depth) {
  if (depth === 0) return 1;
  const moves = pos.legalMoves();
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) {
    pos.makeMove(m);
    n += perft(pos, depth - 1);
    pos.unmakeMove();
  }
  return n;
}

// Reference values from https://www.chessprogramming.org/Perft_Results
const PERFT = [
  ['start', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [20, 400, 8902, 197281]],
  ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['position 3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['position 4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['position 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
];

for (const [name, fen, counts] of PERFT) {
  test(`perft ${name}`, () => {
    const pos = new Position(fen);
    counts.forEach((expected, i) => assert.equal(perft(pos, i + 1), expected, `depth ${i + 1}`));
    assert.equal(pos.fen(), new Position(fen).fen(), 'position restored after search');
  });
}

const moves = (fen, from) => new Position(fen).movesFrom(sq(from)).map((m) => m.to);

test('checkmate and stalemate', () => {
  const mate = new Game('R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1');
  assert.deepEqual(mate.result(), { over: true, winner: 'w', reason: 'checkmate' });
  const stale = new Game('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  assert.deepEqual(stale.result(), { over: true, winner: null, reason: 'stalemate' });
});

test('castling: not out of, through or into check', () => {
  const base = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
  assert.ok(moves(base, 'e1').includes(sq('g1')));
  assert.ok(moves(base, 'e1').includes(sq('c1')));
  // f1 attacked: no king-side castling; queen-side still fine
  const through = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'.replace('r3k2r/8', 'r3k2r/5r2');
  assert.ok(!moves(through, 'e1').includes(sq('g1')));
  assert.ok(moves(through, 'e1').includes(sq('c1')));
  // b1 attacked does not prevent queen-side castling
  const b1 = 'r3k2r/1r6/8/8/8/8/8/R3K2R w KQkq - 0 1';
  assert.ok(moves(b1, 'e1').includes(sq('c1')));
  // in check: no castling at all
  const check = 'r3k2r/4r3/8/8/8/8/8/R3K2R w KQkq - 0 1';
  assert.ok(!moves(check, 'e1').includes(sq('g1')));
  assert.ok(!moves(check, 'e1').includes(sq('c1')));
  // rights lost after the rook moves
  const g = new Game(base);
  g.playSan('Rh2');
  g.playSan('Kd8');
  g.playSan('Rh1');
  g.playSan('Ke8');
  assert.ok(!g.pos.movesFrom(sq('e1')).some((m) => m.to === sq('g1')));
});

test('en passant only right after the double step', () => {
  const g = new Game('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1');
  g.playSan('d5');
  assert.ok(g.playSan('exd6'), 'capture available immediately');
  assert.equal(g.pos.board[sq('d5')], null, 'captured pawn removed');
  const late = new Game('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1');
  late.playSan('d5');
  late.playSan('Kd2');
  late.playSan('Kd8');
  assert.ok(!late.playSan('exd6'), 'no longer possible one move later');
});

test('promotion to any piece', () => {
  for (const p of ['q', 'r', 'b', 'n']) {
    const g = new Game('8/P6k/8/8/8/8/8/K7 w - - 0 1');
    assert.ok(g.play(sq('a7'), sq('a8'), p));
    assert.equal(g.pos.board[sq('a8')].type, p);
  }
});

test('threefold repetition', () => {
  const g = new Game();
  for (const s of ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1']) {
    g.playSan(s);
    assert.equal(g.result().over, false, `not yet after ${s}`);
  }
  g.playSan('Ng8');
  assert.deepEqual(g.result(), { over: true, winner: null, reason: 'threefold' });
});

test('repetition ignores an en passant square nobody can use', () => {
  // After 1.e4 the position "with e3 as en passant square" is the same position as later.
  const g = new Game();
  for (const s of ['e4', 'Nf6', 'Nf3', 'Ng8', 'Ng1', 'Nf6', 'Nf3', 'Ng8', 'Ng1']) g.playSan(s);
  assert.deepEqual(g.result(), { over: true, winner: null, reason: 'threefold' });
});

test('fifty-move rule (100 half-moves without capture or pawn move)', () => {
  assert.equal(new Game('4k3/8/8/8/8/8/8/R3K3 w - - 99 80').result().over, false);
  assert.deepEqual(new Game('4k3/8/8/8/8/8/8/R3K3 w - - 100 80').result(), { over: true, winner: null, reason: 'fifty' });
  // checkmate on the 100th half-move still counts as checkmate
  assert.equal(new Game('R5k1/5ppp/8/8/8/8/8/6K1 b - - 100 80').result().reason, 'checkmate');
});

test('insufficient material', () => {
  const dead = ['4k3/8/8/8/8/8/8/4K3 w - - 0 1', '4k3/8/8/8/8/8/8/4KN2 w - - 0 1', '4k3/8/8/8/8/8/8/4KB2 w - - 0 1', '2b1k3/8/8/8/8/8/8/4KB2 w - - 0 1'];
  dead.forEach((f) => assert.equal(new Game(f).result().reason, 'material', f));
  const alive = ['4k3/8/8/8/8/8/8/2B1KB2 w - - 0 1', '4k3/8/8/8/8/8/8/3NKN2 w - - 0 1', '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1'];
  alive.forEach((f) => assert.equal(new Game(f).result().over, false, f));
});

test('a saved game replays to the exact same position (castling, en passant, promotion)', () => {
  const g = new Game();
  const line = ['e4', 'd5', 'exd5', 'c6', 'dxc6', 'Nf6', 'cxb7', 'e6', 'bxa8=Q', 'Bc5', 'Nf3', 'O-O', 'Bc4', 'Nc6', 'O-O', 'g5', 'd4', 'g4'];
  line.forEach((s) => assert.ok(g.playSan(s), s));
  const replay = new Game();
  g.sanList().forEach((s) => assert.ok(replay.playSan(s), s));
  assert.equal(replay.pos.fen(), g.pos.fen());
  assert.deepEqual(replay.keys, g.keys);
});

test('undo restores the previous position exactly', () => {
  const g = new Game();
  const fens = [g.pos.fen()];
  for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O']) {
    g.playSan(s);
    fens.push(g.pos.fen());
  }
  for (let i = fens.length - 2; i >= 0; i--) {
    g.undo();
    assert.equal(g.pos.fen(), fens[i]);
  }
});
