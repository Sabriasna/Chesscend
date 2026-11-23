// Small game rules used by the game page (kept apart so they can be tested on their own).

/** Does `color` still have anything besides its king? Needed to win on time (official rule). */
export function canWinOnTime(pos, color) {
  return pos.board.some((p) => p && p.color === color && p.type !== 'k');
}

/** Result when `flagged` runs out of time. */
export function timeoutResult(pos, flagged) {
  const winner = flagged === 'w' ? 'b' : 'w';
  return { over: true, winner: canWinOnTime(pos, winner) ? winner : null, reason: 'timeout' };
}
