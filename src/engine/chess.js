/**
 * Moteur d'échecs — règles complètes, sans dépendance.
 *
 * Cases numérotées de 0 (a8) à 63 (h1), ligne par ligne, comme on lit l'échiquier
 * côté Blancs : index = ligneAffichée * 8 + colonne.
 */
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FILES = 'abcdefgh';
export const fileOf = (sq) => sq & 7;
export const rowOf = (sq) => sq >> 3; // 0 = 8e rangée
export const squareName = (sq) => FILES[fileOf(sq)] + String(8 - rowOf(sq));
export const squareIndex = (name) => (8 - parseInt(name[1], 10)) * 8 + FILES.indexOf(name[0]);
const other = (c) => (c === 'w' ? 'b' : 'w');
const KNIGHT_D = [
    [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING_D = [
    [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const ROOK_D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_D = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const onBoard = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
export class Position {
    constructor(fen = START_FEN) {
        this.board = new Array(64).fill(null);
        this.turn = 'w';
        this.castling = { wK: true, wQ: true, bK: true, bQ: true };
        this.ep = -1; // case de prise en passant possible, -1 sinon
        this.halfmove = 0;
        this.fullmove = 1;
        this.stack = [];
        this.load(fen);
    }
    load(fen) {
        const [placement, turn, castle, ep, half, full] = fen.trim().split(/\s+/);
        this.board = new Array(64).fill(null);
        let sq = 0;
        for (const ch of placement) {
            if (ch === '/')
                continue;
            if (/\d/.test(ch)) {
                sq += parseInt(ch, 10);
            }
            else {
                const color = ch === ch.toUpperCase() ? 'w' : 'b';
                this.board[sq] = { type: ch.toLowerCase(), color };
                sq++;
            }
        }
        this.turn = turn === 'b' ? 'b' : 'w';
        const c = castle || '-';
        this.castling = { wK: c.includes('K'), wQ: c.includes('Q'), bK: c.includes('k'), bQ: c.includes('q') };
        this.ep = ep && ep !== '-' ? squareIndex(ep) : -1;
        this.halfmove = half ? parseInt(half, 10) : 0;
        this.fullmove = full ? parseInt(full, 10) : 1;
        this.stack = [];
    }
    fen() {
        let s = '';
        for (let r = 0; r < 8; r++) {
            let empty = 0;
            for (let f = 0; f < 8; f++) {
                const p = this.board[r * 8 + f];
                if (!p) {
                    empty++;
                    continue;
                }
                if (empty) {
                    s += empty;
                    empty = 0;
                }
                s += p.color === 'w' ? p.type.toUpperCase() : p.type;
            }
            if (empty)
                s += empty;
            if (r < 7)
                s += '/';
        }
        let c = '';
        if (this.castling.wK)
            c += 'K';
        if (this.castling.wQ)
            c += 'Q';
        if (this.castling.bK)
            c += 'k';
        if (this.castling.bQ)
            c += 'q';
        return `${s} ${this.turn} ${c || '-'} ${this.ep >= 0 ? squareName(this.ep) : '-'} ${this.halfmove} ${this.fullmove}`;
    }
    /** Clé de position pour la triple répétition (sans les compteurs). */
    key() {
        return this.fen().split(' ').slice(0, 4).join(' ');
    }
    findKing(color) {
        for (let i = 0; i < 64; i++) {
            const p = this.board[i];
            if (p && p.type === 'k' && p.color === color)
                return i;
        }
        return -1;
    }
    /** La case `sq` est-elle attaquée par une pièce de couleur `by` ? */
    isAttacked(sq, by) {
        const f = fileOf(sq);
        const r = rowOf(sq);
        const b = this.board;
        // Pions : un pion blanc attaque vers le haut (ligne - 1)
        const pr = by === 'w' ? r + 1 : r - 1;
        for (const df of [-1, 1]) {
            if (onBoard(f + df, pr)) {
                const p = b[pr * 8 + f + df];
                if (p && p.color === by && p.type === 'p')
                    return true;
            }
        }
        for (const [df, dr] of KNIGHT_D) {
            if (onBoard(f + df, r + dr)) {
                const p = b[(r + dr) * 8 + f + df];
                if (p && p.color === by && p.type === 'n')
                    return true;
            }
        }
        for (const [df, dr] of KING_D) {
            if (onBoard(f + df, r + dr)) {
                const p = b[(r + dr) * 8 + f + df];
                if (p && p.color === by && p.type === 'k')
                    return true;
            }
        }
        for (const [df, dr] of ROOK_D) {
            let nf = f + df;
            let nr = r + dr;
            while (onBoard(nf, nr)) {
                const p = b[nr * 8 + nf];
                if (p) {
                    if (p.color === by && (p.type === 'r' || p.type === 'q'))
                        return true;
                    break;
                }
                nf += df;
                nr += dr;
            }
        }
        for (const [df, dr] of BISHOP_D) {
            let nf = f + df;
            let nr = r + dr;
            while (onBoard(nf, nr)) {
                const p = b[nr * 8 + nf];
                if (p) {
                    if (p.color === by && (p.type === 'b' || p.type === 'q'))
                        return true;
                    break;
                }
                nf += df;
                nr += dr;
            }
        }
        return false;
    }
    inCheck(color = this.turn) {
        const k = this.findKing(color);
        return k >= 0 && this.isAttacked(k, other(color));
    }
    /** Coups pseudo-légaux (peuvent laisser le roi en échec). */
    pseudoMoves() {
        const moves = [];
        const us = this.turn;
        const them = other(us);
        const b = this.board;
        const add = (from, to, piece, flag, captured) => {
            if (piece === 'p' && (rowOf(to) === 0 || rowOf(to) === 7)) {
                for (const promo of ['q', 'r', 'b', 'n']) {
                    moves.push({ from, to, piece, color: us, flag, captured, promotion: promo });
                }
            }
            else {
                moves.push({ from, to, piece, color: us, flag, captured });
            }
        };
        for (let sq = 0; sq < 64; sq++) {
            const p = b[sq];
            if (!p || p.color !== us)
                continue;
            const f = fileOf(sq);
            const r = rowOf(sq);
            if (p.type === 'p') {
                const dir = us === 'w' ? -1 : 1;
                const startRow = us === 'w' ? 6 : 1;
                const r1 = r + dir;
                if (onBoard(f, r1) && !b[r1 * 8 + f]) {
                    add(sq, r1 * 8 + f, 'p', 'n');
                    const r2 = r + 2 * dir;
                    if (r === startRow && !b[r2 * 8 + f])
                        add(sq, r2 * 8 + f, 'p', 'd');
                }
                for (const df of [-1, 1]) {
                    const nf = f + df;
                    if (!onBoard(nf, r1))
                        continue;
                    const to = r1 * 8 + nf;
                    const t = b[to];
                    if (t && t.color === them)
                        add(sq, to, 'p', 'c', t.type);
                    else if (to === this.ep)
                        add(sq, to, 'p', 'e', 'p');
                }
                continue;
            }
            const jump = (deltas, slide) => {
                for (const [df, dr] of deltas) {
                    let nf = f + df;
                    let nr = r + dr;
                    while (onBoard(nf, nr)) {
                        const to = nr * 8 + nf;
                        const t = b[to];
                        if (t) {
                            if (t.color === them)
                                add(sq, to, p.type, 'c', t.type);
                            break;
                        }
                        add(sq, to, p.type, 'n');
                        if (!slide)
                            break;
                        nf += df;
                        nr += dr;
                    }
                }
            };
            if (p.type === 'n')
                jump(KNIGHT_D, false);
            else if (p.type === 'b')
                jump(BISHOP_D, true);
            else if (p.type === 'r')
                jump(ROOK_D, true);
            else if (p.type === 'q') {
                jump(ROOK_D, true);
                jump(BISHOP_D, true);
            }
            else if (p.type === 'k') {
                jump(KING_D, false);
                // Roques
                const home = us === 'w' ? 60 : 4;
                if (sq === home && !this.isAttacked(home, them)) {
                    const canK = us === 'w' ? this.castling.wK : this.castling.bK;
                    const canQ = us === 'w' ? this.castling.wQ : this.castling.bQ;
                    const rook = (i) => {
                        const x = b[i];
                        return !!x && x.type === 'r' && x.color === us;
                    };
                    if (canK && !b[home + 1] && !b[home + 2] && rook(home + 3) &&
                        !this.isAttacked(home + 1, them) && !this.isAttacked(home + 2, them)) {
                        moves.push({ from: home, to: home + 2, piece: 'k', color: us, flag: 'k' });
                    }
                    if (canQ && !b[home - 1] && !b[home - 2] && !b[home - 3] && rook(home - 4) &&
                        !this.isAttacked(home - 1, them) && !this.isAttacked(home - 2, them)) {
                        moves.push({ from: home, to: home - 2, piece: 'k', color: us, flag: 'q' });
                    }
                }
            }
        }
        return moves;
    }
    /** Tous les coups légaux du camp au trait. */
    legalMoves() {
        const us = this.turn;
        const result = [];
        for (const m of this.pseudoMoves()) {
            this.makeMove(m);
            if (!this.inCheck(us))
                result.push(m);
            this.unmakeMove();
        }
        return result;
    }
    movesFrom(sq) {
        return this.legalMoves().filter((m) => m.from === sq);
    }
    makeMove(m) {
        const b = this.board;
        this.stack.push({
            move: m,
            castling: { ...this.castling },
            ep: this.ep,
            halfmove: this.halfmove,
            fullmove: this.fullmove,
        });
        const us = m.color;
        b[m.to] = { type: m.promotion ?? m.piece, color: us };
        b[m.from] = null;
        if (m.flag === 'e')
            b[m.to + (us === 'w' ? 8 : -8)] = null;
        if (m.flag === 'k') {
            b[m.to - 1] = b[m.to + 1];
            b[m.to + 1] = null;
        }
        else if (m.flag === 'q') {
            b[m.to + 1] = b[m.to - 2];
            b[m.to - 2] = null;
        }
        // Droits de roque
        if (m.piece === 'k') {
            if (us === 'w')
                this.castling.wK = this.castling.wQ = false;
            else
                this.castling.bK = this.castling.bQ = false;
        }
        for (const sq of [m.from, m.to]) {
            if (sq === 63)
                this.castling.wK = false;
            if (sq === 56)
                this.castling.wQ = false;
            if (sq === 7)
                this.castling.bK = false;
            if (sq === 0)
                this.castling.bQ = false;
        }
        this.ep = m.flag === 'd' ? (m.from + m.to) / 2 : -1;
        this.halfmove = m.piece === 'p' || m.captured ? 0 : this.halfmove + 1;
        if (us === 'b')
            this.fullmove++;
        this.turn = other(us);
    }
    unmakeMove() {
        const u = this.stack.pop();
        if (!u)
            return;
        const m = u.move;
        const b = this.board;
        const us = m.color;
        b[m.from] = { type: m.piece, color: us };
        b[m.to] = null;
        if (m.flag === 'e') {
            b[m.to + (us === 'w' ? 8 : -8)] = { type: 'p', color: other(us) };
        }
        else if (m.captured) {
            b[m.to] = { type: m.captured, color: other(us) };
        }
        if (m.flag === 'k') {
            b[m.to + 1] = b[m.to - 1];
            b[m.to - 1] = null;
        }
        else if (m.flag === 'q') {
            b[m.to - 2] = b[m.to + 1];
            b[m.to + 1] = null;
        }
        this.castling = u.castling;
        this.ep = u.ep;
        this.halfmove = u.halfmove;
        this.fullmove = u.fullmove;
        this.turn = us;
    }
    /** Matériel insuffisant pour mater (roi seul, roi + cavalier, roi + fou(s) de même couleur). */
    insufficientMaterial() {
        const minors = [];
        for (let i = 0; i < 64; i++) {
            const p = this.board[i];
            if (!p || p.type === 'k')
                continue;
            if (p.type === 'p' || p.type === 'r' || p.type === 'q')
                return false;
            minors.push({ type: p.type, sqColor: (fileOf(i) + rowOf(i)) % 2 });
        }
        if (minors.length <= 1)
            return true;
        if (minors.every((m) => m.type === 'b')) {
            return minors.every((m) => m.sqColor === minors[0].sqColor);
        }
        return false;
    }
    /** Notation algébrique (SAN) d'un coup légal, avant de le jouer. */
    san(m, legal = this.legalMoves()) {
        let s;
        if (m.flag === 'k')
            s = 'O-O';
        else if (m.flag === 'q')
            s = 'O-O-O';
        else {
            const capture = m.captured !== undefined;
            if (m.piece === 'p') {
                s = (capture ? FILES[fileOf(m.from)] + 'x' : '') + squareName(m.to);
                if (m.promotion)
                    s += '=' + m.promotion.toUpperCase();
            }
            else {
                s = m.piece.toUpperCase();
                const rivals = legal.filter((o) => o.piece === m.piece && o.to === m.to && o.from !== m.from);
                if (rivals.length) {
                    const sameFile = rivals.some((o) => fileOf(o.from) === fileOf(m.from));
                    const sameRow = rivals.some((o) => rowOf(o.from) === rowOf(m.from));
                    if (!sameFile)
                        s += FILES[fileOf(m.from)];
                    else if (!sameRow)
                        s += String(8 - rowOf(m.from));
                    else
                        s += squareName(m.from);
                }
                if (capture)
                    s += 'x';
                s += squareName(m.to);
            }
        }
        this.makeMove(m);
        if (this.inCheck())
            s += this.legalMoves().length === 0 ? '#' : '+';
        this.unmakeMove();
        return s;
    }
}
export class Game {
    constructor(fen = START_FEN) {
        this.history = [];
        this.startFen = fen;
        this.pos = new Position(fen);
        this.keys = [this.pos.key()];
    }
    /** Joue un coup s'il est légal. Retourne l'entrée d'historique ou null. */
    play(from, to, promotion = 'q') {
        const legal = this.pos.legalMoves();
        const m = legal.find((x) => x.from === from && x.to === to && (!x.promotion || x.promotion === promotion));
        if (!m)
            return null;
        return this.applyMove(m, legal);
    }
    applyMove(m, legal = this.pos.legalMoves()) {
        const entry = { san: this.pos.san(m, legal), move: m, fenBefore: this.pos.fen() };
        this.pos.makeMove(m);
        this.history.push(entry);
        this.keys.push(this.pos.key());
        return entry;
    }
    /** Rejoue un coup écrit en notation SAN (pour charger une sauvegarde). */
    playSan(san) {
        const legal = this.pos.legalMoves();
        const m = legal.find((x) => this.pos.san(x, legal) === san);
        if (!m)
            return false;
        this.applyMove(m, legal);
        return true;
    }
    undo() {
        const last = this.history.pop();
        if (!last)
            return null;
        this.keys.pop();
        this.pos = new Position(last.fenBefore);
        return last;
    }
    isPromotion(from, to) {
        return this.pos.legalMoves().some((m) => m.from === from && m.to === to && !!m.promotion);
    }
    result() {
        const legal = this.pos.legalMoves();
        if (legal.length === 0) {
            return this.pos.inCheck()
                ? { over: true, winner: this.pos.turn === 'w' ? 'b' : 'w', reason: 'checkmate' }
                : { over: true, winner: null, reason: 'stalemate' };
        }
        if (this.pos.insufficientMaterial())
            return { over: true, winner: null, reason: 'material' };
        if (this.pos.halfmove >= 100)
            return { over: true, winner: null, reason: 'fifty' };
        const current = this.pos.key();
        if (this.keys.filter((k) => k === current).length >= 3) {
            return { over: true, winner: null, reason: 'threefold' };
        }
        return { over: false };
    }
    sanList() {
        return this.history.map((h) => h.san);
    }
    lastMove() {
        return this.history.length ? this.history[this.history.length - 1].move : null;
    }
}
