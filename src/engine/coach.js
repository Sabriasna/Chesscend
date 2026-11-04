/**
 * Beginner coach: finds pieces in danger and writes friendly tips.
 * Pure functions, easy to test.
 */
import { squareName } from './chess';

export const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/**
 * Pieces of `color` that the opponent can win:
 * attacked and undefended, or attacked by a cheaper piece.
 * Returns [{ square, piece, attacker }] sorted by value (most valuable first).
 */
export function findThreats(pos, color) {
  const opp = color === 'w' ? 'b' : 'w';
  const savedTurn = pos.turn;
  const savedEp = pos.ep;
  pos.turn = opp;
  pos.ep = -1;
  const captures = pos.legalMoves().filter((m) => m.captured && m.flag !== 'e');
  pos.turn = savedTurn;
  pos.ep = savedEp;

  const out = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = pos.board[sq];
    if (!p || p.color !== color || p.type === 'k') continue;
    const attackers = captures.filter((m) => m.to === sq);
    if (!attackers.length) continue;
    const cheapest = attackers.reduce((a, b) => (VALUE[b.piece] < VALUE[a.piece] ? b : a));
    const defended = pos.isAttacked(sq, color);
    if (!defended || VALUE[cheapest.piece] < VALUE[p.type]) {
      out.push({ square: sq, piece: p.type, attacker: cheapest.piece, defended });
    }
  }
  return out.sort((a, b) => VALUE[b.piece] - VALUE[a.piece]);
}

/**
 * Message for the player about to move.
 * names: { you: 'you'|'White', your: 'your'|"White's", opponent: 'The computer'|'Your opponent' }
 */
export function coachMessage(game, threats, names) {
  const pos = game.pos;
  const turn = pos.turn;
  const last = game.lastMove();
  const Your = names.your.charAt(0).toUpperCase() + names.your.slice(1);

  if (pos.inCheck()) {
    return {
      tone: 'red',
      text: `Check! ${Your} king is attacked. Move it, block the attack, or capture the attacker.`,
    };
  }
  if (last && last.captured && last.color !== turn) {
    const canRetake = pos.isAttacked(last.to, turn);
    return canRetake
      ? {
          text: `${names.opponent} took ${names.your} ${NAME[last.captured]}. Good news: ${names.you} can take back on ${squareName(last.to)}!`,
        }
      : {
          tone: 'red',
          text: `${names.opponent} took ${names.your} ${NAME[last.captured]} for free. Tip: before each move, check which pieces are undefended.`,
        };
  }
  if (threats.length) {
    const t = threats[0];
    const why = t.defended
      ? `can be taken by a ${NAME[t.attacker]}, which is worth less`
      : 'is attacked and not defended';
    return {
      tone: 'orange',
      text: `Careful: ${names.your} ${NAME[t.piece]} on ${squareName(t.square)} ${why} (orange square). Move it or protect it.`,
    };
  }
  const n = game.history.length;
  if (n < 2) return { text: 'Tip: start by moving a center pawn (e4 or d4). Tap a piece to see where it can go.' };
  if (n < 10) return { text: 'Tip: bring out your knights and bishops, then castle to keep your king safe.' };
  return null;
}
