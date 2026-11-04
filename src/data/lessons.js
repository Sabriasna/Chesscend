// Beginner courses. Each lesson has short paragraphs and an interactive diagram:
// tap any piece on the diagram to see where it can go.
export const COURSES = [
  {
    id: 'basics',
    title: 'Chess Basics',
    level: 'Beginner',
    icon: 'chess-pawn',
    description: 'Learn how every piece moves and how to win a game.',
    lessons: [
      {
        id: 'b1',
        title: 'The board',
        paragraphs: [
          'A chessboard has 64 squares in 8 rows and 8 columns. Always set it up with a light square in the bottom-right corner.',
          'Columns are called files (a to h). Rows are called ranks (1 to 8). Every square has a name, like e4.',
          'White always moves first. Then players take turns, one move each.',
        ],
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        focus: null,
      },
      {
        id: 'b2',
        title: 'The pawn',
        paragraphs: [
          'Pawns move straight forward, one square at a time. On its very first move, a pawn may move two squares.',
          'Pawns capture differently: one square diagonally forward. They never move backwards.',
          'Tap the pawn to see its moves. Notice it can capture the black knight.',
        ],
        fen: '8/8/8/8/8/3n4/4P3/8 w - - 0 1',
        focus: 'e2',
      },
      {
        id: 'b3',
        title: 'The rook',
        paragraphs: [
          'The rook moves in straight lines: up, down, left or right, as far as it wants.',
          'It cannot jump over other pieces. It captures by landing on an enemy piece.',
          'A rook is worth about 5 pawns.',
        ],
        fen: '8/8/8/3R4/8/8/8/8 w - - 0 1',
        focus: 'd5',
      },
      {
        id: 'b4',
        title: 'The bishop',
        paragraphs: [
          'The bishop moves diagonally, as far as it wants.',
          'A bishop always stays on the same square color. Each side starts with one light-squared and one dark-squared bishop.',
          'A bishop is worth about 3 pawns.',
        ],
        fen: '8/8/8/8/3B4/8/8/8 w - - 0 1',
        focus: 'd4',
      },
      {
        id: 'b5',
        title: 'The queen',
        paragraphs: [
          'The queen is the most powerful piece. She moves like a rook and a bishop combined: in any straight line or diagonal.',
          'She is worth about 9 pawns. Be careful not to lose her early!',
        ],
        fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1',
        focus: 'd4',
      },
      {
        id: 'b6',
        title: 'The knight',
        paragraphs: [
          'The knight moves in an L shape: two squares in one direction, then one square to the side.',
          'It is the only piece that can jump over other pieces.',
          'A knight is worth about 3 pawns. Knights love the center of the board.',
        ],
        fen: '8/8/8/2ppp3/2pNp3/2ppp3/8/8 w - - 0 1',
        focus: 'd4',
      },
      {
        id: 'b7',
        title: 'The king',
        paragraphs: [
          'The king moves one square in any direction.',
          'He is the most important piece: if your king is trapped, you lose. The king can never move to a square where he would be attacked.',
        ],
        fen: '8/8/8/8/4K3/8/8/8 w - - 0 1',
        focus: 'e4',
      },
      {
        id: 'b8',
        title: 'Check and checkmate',
        paragraphs: [
          'When a king is attacked, it is in check. You must get out of check right away: move the king, block the attack, or capture the attacker.',
          'If there is no way out, it is checkmate and the game is over.',
          'Here, the white rook gives check and the black king is trapped by its own pawns: checkmate!',
        ],
        fen: 'R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1',
        focus: null,
      },
      {
        id: 'b9',
        title: 'Castling',
        paragraphs: [
          'Castling is a special move that puts your king in safety and brings a rook into play. The king moves two squares towards a rook, and the rook jumps over to the other side.',
          'You can only castle if neither the king nor that rook has moved, the squares between them are empty, and the king is not in check or passing through an attacked square.',
          'Tap the white king to see both castling moves.',
        ],
        fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        focus: 'e1',
      },
      {
        id: 'b10',
        title: 'Promotion and en passant',
        paragraphs: [
          'When a pawn reaches the last rank, it is promoted: it turns into a queen, rook, bishop or knight. Most players choose a queen.',
          'En passant: if an enemy pawn moves two squares and lands right next to your pawn, you may capture it as if it had moved only one square. This is only allowed on the very next move.',
          'Tap the white pawn on e5: it can capture the d5 pawn en passant.',
        ],
        fen: 'k7/8/8/3pP3/8/8/8/K7 w - d6 0 1',
        focus: 'e5',
      },
      {
        id: 'b11',
        title: 'Draws',
        paragraphs: [
          'Not every game has a winner. If the player to move has no legal move but is not in check, it is stalemate: a draw.',
          'Here, Black has no move but is not in check. Watch out for this when you are winning!',
          'A game is also drawn when the same position appears three times, or when neither side has enough pieces to checkmate.',
        ],
        fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
        focus: null,
      },
    ],
  },
  {
    id: 'strategy',
    title: 'First Strategies',
    level: 'Beginner',
    icon: 'chess-knight',
    description: 'Simple golden rules to start every game well.',
    lessons: [
      {
        id: 's1',
        title: 'Control the center',
        paragraphs: [
          'The four central squares (d4, e4, d5, e5) are the most important on the board. Pieces in the center control more squares.',
          'A great first move is to push a central pawn two squares, like e4 or d4.',
        ],
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        focus: null,
      },
      {
        id: 's2',
        title: 'Develop your pieces',
        paragraphs: [
          'Bring your knights and bishops out early, towards the center. A piece left at home does not help.',
          'Try not to move the same piece twice in the opening, and do not bring the queen out too early: she can easily be chased.',
          'Tap the knight on f3 to see how many squares it controls.',
        ],
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        focus: 'f3',
      },
      {
        id: 's3',
        title: 'Castle early',
        paragraphs: [
          'A king in the center is easy to attack. Castling in the first 10 moves keeps it safe behind a wall of pawns.',
          'Here White is ready to castle. Tap the king!',
        ],
        fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5',
        focus: 'e1',
      },
      {
        id: 's4',
        title: "Don't give pieces away",
        paragraphs: [
          'Before every move, ask yourself: can my opponent capture something for free?',
          'Piece values: pawn 1, knight 3, bishop 3, rook 5, queen 9. Only trade when you get equal or more value back.',
          'Tip: turn on Hints in a game. The coach will warn you when one of your pieces is left undefended.',
        ],
        fen: 'rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        focus: 'f3',
      },
    ],
  },
];

export const ALL_LESSONS = COURSES.flatMap((c) => c.lessons.map((l) => ({ ...l, courseId: c.id })));
