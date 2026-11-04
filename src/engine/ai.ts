/**
 * Intelligence artificielle : recherche alpha-bêta (negamax) avec
 * approfondissement itératif, tri des coups et recherche de calme sur les prises.
 */
import { Move, PieceType, Position, fileOf, rowOf } from './chess';

export type AiLevel = 1 | 2 | 3 | 4;

export const AI_LEVELS: Record<AiLevel, { label: string; depth: number; timeMs: number; noise: number }> = {
  1: { label: 'Débutant', depth: 1, timeMs: 300, noise: 250 },
  2: { label: 'Facile', depth: 2, timeMs: 600, noise: 60 },
  3: { label: 'Moyen', depth: 3, timeMs: 1200, noise: 10 },
  4: { label: 'Difficile', depth: 6, timeMs: 2500, noise: 0 },
};

const VALUE: Record<PieceType, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// Tables de position (vue des Blancs, index 0 = a8). Valeurs classiques simplifiées.
const PST: Record<PieceType, number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

// Roi en finale : il doit se centraliser.
const KING_END = [
  -50, -40, -30, -20, -20, -30, -40, -50,
  -30, -20, -10, 0, 0, -10, -20, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30,
  -50, -30, -30, -30, -30, -30, -30, -50,
];

const MATE = 100000;

/** Miroir vertical pour lire les tables du point de vue des Noirs. */
const mirror = (sq: number) => (7 - rowOf(sq)) * 8 + fileOf(sq);

/** Évaluation en centipions, du point de vue du camp au trait. */
function evaluate(p: Position): number {
  let score = 0;
  let nonPawn = 0;
  for (let i = 0; i < 64; i++) {
    const x = p.board[i];
    if (x && x.type !== 'p' && x.type !== 'k') nonPawn += VALUE[x.type];
  }
  const endgame = nonPawn <= 1300;
  for (let i = 0; i < 64; i++) {
    const x = p.board[i];
    if (!x) continue;
    const idx = x.color === 'w' ? i : mirror(i);
    const table = x.type === 'k' && endgame ? KING_END : PST[x.type];
    const v = VALUE[x.type] + table[idx];
    score += x.color === 'w' ? v : -v;
  }
  return p.turn === 'w' ? score : -score;
}

function orderScore(m: Move): number {
  let s = 0;
  if (m.captured) s += 10 * VALUE[m.captured] - VALUE[m.piece];
  if (m.promotion) s += VALUE[m.promotion];
  return s;
}

class TimeUp extends Error {}

class Searcher {
  nodes = 0;
  constructor(private p: Position, private deadline: number) {}

  private check() {
    if ((++this.nodes & 1023) === 0 && Date.now() > this.deadline) throw new TimeUp();
  }

  quiesce(alpha: number, beta: number, depth: number): number {
    this.check();
    const stand = evaluate(this.p);
    if (stand >= beta || depth <= 0) return stand;
    if (stand > alpha) alpha = stand;
    const caps = this.p.legalMoves().filter((m) => m.captured || m.promotion);
    caps.sort((a, b) => orderScore(b) - orderScore(a));
    for (const m of caps) {
      this.p.makeMove(m);
      const s = -this.quiesce(-beta, -alpha, depth - 1);
      this.p.unmakeMove();
      if (s >= beta) return s;
      if (s > alpha) alpha = s;
    }
    return alpha;
  }

  negamax(depth: number, alpha: number, beta: number, ply: number): number {
    this.check();
    const moves = this.p.legalMoves();
    if (moves.length === 0) return this.p.inCheck() ? -MATE + ply : 0;
    if (this.p.halfmove >= 100 || this.p.insufficientMaterial()) return 0;
    if (depth === 0) return this.quiesce(alpha, beta, 4);
    moves.sort((a, b) => orderScore(b) - orderScore(a));
    let best = -Infinity;
    for (const m of moves) {
      this.p.makeMove(m);
      const s = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
      this.p.unmakeMove();
      if (s > best) best = s;
      if (s > alpha) alpha = s;
      if (alpha >= beta) break;
    }
    return best;
  }

  /** Score de chaque coup racine à une profondeur donnée. */
  root(moves: Move[], depth: number): { move: Move; score: number }[] {
    const out: { move: Move; score: number }[] = [];
    let alpha = -Infinity;
    for (const m of moves) {
      this.p.makeMove(m);
      // Fenêtre élargie pour garder des scores comparables entre coups (utile pour le bruit).
      const s = -this.negamax(depth - 1, -Infinity, -alpha + 300, 1);
      this.p.unmakeMove();
      out.push({ move: m, score: s });
      if (s > alpha) alpha = s;
    }
    return out;
  }
}

/** Choisit un coup pour la position donnée (la position n'est pas modifiée). */
export function findBestMove(fen: string, level: AiLevel): Move | null {
  const cfg = AI_LEVELS[level];
  const p = new Position(fen);
  let moves = p.legalMoves();
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const searcher = new Searcher(p, Date.now() + cfg.timeMs);
  let scored: { move: Move; score: number }[] = moves.map((m) => ({ move: m, score: orderScore(m) }));

  for (let d = 1; d <= cfg.depth; d++) {
    try {
      // On commence par le meilleur coup de l'itération précédente.
      moves = scored.slice().sort((a, b) => b.score - a.score).map((s) => s.move);
      scored = searcher.root(moves, d);
      if (scored.some((s) => s.score > MATE - 100)) break; // mat trouvé
    } catch (e) {
      if (e instanceof TimeUp) break;
      throw e;
    }
  }

  // Bruit selon le niveau : rend les niveaux faciles plus humains.
  const noisy = scored.map((s) => ({ ...s, score: s.score + (Math.random() * 2 - 1) * cfg.noise }));
  noisy.sort((a, b) => b.score - a.score);
  return noisy[0].move;
}
