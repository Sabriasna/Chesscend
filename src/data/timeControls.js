export const QUICK = {
  blitz: { label: 'Blitz', sub: '3 min', icon: 'zap', tc: { minutes: 3, increment: 2 } },
  rapid: { label: 'Rapid', sub: '10 min', icon: 'clock', tc: { minutes: 10, increment: 0 } },
  classical: { label: 'Classical', sub: '30 min', mci: 'chess-knight', tc: { minutes: 30, increment: 0 } },
};

export const TIME_CONTROLS = [
  { label: 'No clock', tc: null },
  { label: '3 + 2', tc: { minutes: 3, increment: 2 } },
  { label: '5 min', tc: { minutes: 5, increment: 0 } },
  { label: '10 min', tc: { minutes: 10, increment: 0 } },
  { label: '15 + 10', tc: { minutes: 15, increment: 10 } },
  { label: '30 min', tc: { minutes: 30, increment: 0 } },
];

export const tcLabel = (tc) => {
  if (!tc) return 'No clock';
  return tc.increment ? `${tc.minutes} + ${tc.increment}` : `${tc.minutes} min`;
};
