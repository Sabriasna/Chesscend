// Mate-in-one puzzles for beginners. Any checkmating move is accepted.
export const PUZZLES = [
  {
    id: 'p1',
    title: 'The back rank',
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    hint: 'The black king is trapped behind its own pawns. Which piece can reach the 8th rank?',
  },
  {
    id: 'p2',
    title: "Scholar's mate",
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    hint: 'The f7 pawn is only defended by the king, and your bishop is aiming at it.',
  },
  {
    id: 'p3',
    title: "Fool's mate",
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
    hint: 'You play Black. White opened the diagonal next to the king. Use your queen!',
  },
  {
    id: 'p4',
    title: 'Smothered king',
    fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
    hint: 'The king has no free square. A knight check cannot be blocked.',
  },
  {
    id: 'p5',
    title: 'Queen in the corner',
    fen: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1',
    hint: 'Your king already covers a7 and b7. Give a check that also covers b8.',
  },
  {
    id: 'p6',
    title: 'Rook ladder',
    fen: '3k4/R7/8/8/8/8/8/1R4K1 w - - 0 1',
    hint: 'One rook already guards the 7th rank. The other one can finish the job.',
  },
  {
    id: 'p7',
    title: 'Black strikes back',
    fen: '6k1/8/8/8/8/8/r4PPP/6K1 b - - 0 1',
    hint: 'You play Black. The white king is stuck behind its pawns.',
  },
  {
    id: 'p8',
    title: 'Queen and pawn',
    fen: '7k/7p/5Q2/8/8/8/8/6K1 w - - 0 1',
    hint: 'Look for a queen check that also covers g7 and g8.',
  },
  {
    id: 'p9',
    title: 'Two rooks',
    fen: '6k1/8/6K1/8/8/8/8/R6R w - - 0 1',
    hint: 'Your king guards the 7th rank. Check on the 8th rank.',
  },
  {
    id: 'p10',
    title: 'Queen on the back rank',
    fen: '6k1/5ppp/8/6Q1/8/8/5PPP/6K1 w - - 0 1',
    hint: 'Same idea as the first puzzle: the king is trapped behind its pawns. Your queen can reach the 8th rank.',
  },
];
