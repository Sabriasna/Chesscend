// Lesson and puzzle pages (interactive boards from the Learn tab).
import { icon } from './icons.js';
import { badge, bindBoard, boardHTML, esc, openModal, piece, pill } from './ui.js';
import { markLesson, markPuzzle, state, theme } from './store.js';
import { nav } from './app.js';
import { ALL_LESSONS } from '../../src/data/lessons.js';
import { PUZZLES } from '../../src/data/puzzles.js';
import { Position, squareIndex } from '../../src/engine/chess.js';

/* ================================================================ LESSON */
export function lessonPage(lessonId) {
  const index = Math.max(0, ALL_LESSONS.findIndex((l) => l.id === lessonId));
  const lesson = ALL_LESSONS[index];
  const next = ALL_LESSONS[index + 1];
  const sameCourseNext = next && next.courseId === lesson.courseId ? next : null;
  const pos = new Position(lesson.fen);
  let selected = lesson.focus ? squareIndex(lesson.focus) : null;
  let root;

  // Show the moves of the selected piece, whatever its color.
  const targets = () => {
    if (selected === null || !pos.board[selected]) return [];
    const saved = pos.turn;
    pos.turn = pos.board[selected].color;
    const t = pos.movesFrom(selected).map((m) => m.to);
    pos.turn = saved;
    return t;
  };

  const draw = () => {
    root.querySelector('.board-slot').innerHTML = boardHTML({
      board: pos.board,
      theme: theme(),
      orientation: 'w',
      selected,
      targets: targets(),
      lastMove: null,
      checkSquare: pos.inCheck() ? pos.findKing(pos.turn) : null,
      danger: [],
      showCoordinates: true,
    });
  };

  const done = state.progress.lessonsDone.includes(lesson.id);
  const course = lesson.courseId;
  const n = ALL_LESSONS.filter((l) => l.courseId === course).findIndex((l) => l.id === lesson.id) + 1;

  return {
    title: lesson.title,
    sub: `Lesson ${index + 1}`,
    back: `course-${course}`,
    tab: 'learn',
    wide: true,
    html: `<div class="study-layout">
      <div class="board-col"><div class="board-slot"></div></div>
      <div class="study-text">
        <p class="eyebrow">Lesson ${n} · ${course === 'basics' ? 'Chess Basics' : 'First Strategies'}</p>
        <h1 class="page-title">${esc(lesson.title)}</h1>
        <div class="card">${lesson.paragraphs.map((p) => `<p class="body">${esc(p)}</p>`).join('')}</div>
        <p class="tip">${icon('pointer', 18)} <span>Click any piece on the board to see where it can go.</span></p>
        ${pill(done ? (sameCourseNext ? 'Next lesson' : 'Back to course') : 'Got it!', { icon: done ? 'arrow-right' : 'check', attrs: 'data-act="finish"', cls: 'block' })}
      </div>
    </div>`,
    mount(el) {
      root = el;
      draw();
      bindBoard(el.querySelector('.board-slot'), {
        onSquare: (sq) => {
          selected = pos.board[sq] && sq !== selected ? sq : null;
          draw();
        },
      });
    },
    actions: {
      finish: () => {
        markLesson(lesson.id);
        nav.go(sameCourseNext ? `lesson-${sameCourseNext.id}` : `course-${course}`);
      },
    },
  };
}

/* ================================================================ PUZZLES */
export function puzzlePage(startId) {
  let index = Math.max(0, PUZZLES.findIndex((p) => p.id === startId));
  let puzzle;
  let pos;
  let selected;
  let status; // solving | solved | wrong
  let last;
  let showHint;
  let root;

  const load = (i) => {
    index = i;
    puzzle = PUZZLES[i];
    pos = new Position(puzzle.fen);
    selected = null;
    status = 'solving';
    last = null;
    showHint = false;
  };
  load(index);

  const toMove = () => new Position(puzzle.fen).turn;
  const targets = () => (selected === null || status !== 'solving' ? [] : pos.movesFrom(selected).map((m) => m.to));

  function tryMove(from, to, promotion) {
    const m = pos.legalMoves().find((x) => x.from === from && x.to === to && (!x.promotion || x.promotion === (promotion || 'q')));
    if (!m) return;
    const next = new Position(pos.fen());
    next.makeMove(m);
    const mate = next.inCheck() && next.legalMoves().length === 0;
    pos = next;
    last = { from, to };
    selected = null;
    if (mate) {
      status = 'solved';
      markPuzzle(puzzle.id);
      if (state.settings.haptics) navigator.vibrate?.([20, 40, 20]);
    } else {
      status = 'wrong';
      if (state.settings.haptics) navigator.vibrate?.(60);
    }
    draw();
  }

  function attempt(from, to) {
    if (!targets().includes(to)) return false;
    const promo = pos.legalMoves().some((m) => m.from === from && m.to === to && m.promotion);
    if (promo) {
      const t = theme();
      const color = pos.turn;
      const md = openModal(`<h3>Promote your pawn</h3><p>Most players choose the queen.</p>
        <div class="promo-row">${[['q', 'Queen'], ['r', 'Rook'], ['b', 'Bishop'], ['n', 'Knight']]
          .map(([k, n]) => `<button class="promo" data-p="${k}">${piece(k, color, t)}<span>${n}</span></button>`)
          .join('')}</div>`);
      md.el.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => (md.close(), tryMove(from, to, b.dataset.p))));
    } else tryMove(from, to);
    return true;
  }

  function panel() {
    const solvedCount = state.progress.puzzlesSolved.length;
    let box = '';
    if (status === 'solving')
      box = `<div class="card"><div class="inline-top">${icon('bulb', 24, 'gold')}<p class="body">${esc(showHint ? puzzle.hint : 'Find the move that checkmates the king.')}</p></div>
        ${showHint ? '' : pill('Show a hint', { variant: 'light', size: 'm', attrs: 'data-act="hint"', cls: 'block mt' })}</div>`;
    if (status === 'solved')
      box = `<div class="card ok-card"><div class="inline-top">${icon('check-circle', 26, 'green')}<strong class="h3">Checkmate! Well done.</strong></div>
        <p class="small mt-s">${solvedCount} / ${PUZZLES.length} puzzles solved</p></div>`;
    if (status === 'wrong')
      box = `<div class="card ko-card"><div class="inline-top">${icon('x-circle', 26, 'red')}<strong class="h3">Not quite. The king can still escape.</strong></div>
        <p class="small mt-s">No worries, try again!</p></div>`;

    const btns = [];
    if (status === 'wrong') btns.push(pill('Try again', { icon: 'rotate-ccw', attrs: 'data-act="retry"', cls: 'grow' }));
    if (status !== 'wrong' && index > 0) btns.push(pill('Previous', { variant: 'light', size: 'm', attrs: 'data-act="prev"', cls: 'grow' }));
    if (status === 'solved' && index < PUZZLES.length - 1) btns.push(pill('Next puzzle', { icon: 'arrow-right', attrs: 'data-act="next"', cls: 'grow' }));
    if (status === 'solving' && index < PUZZLES.length - 1) btns.push(pill('Skip', { variant: 'light', size: 'm', attrs: 'data-act="next"', cls: 'grow' }));

    const dots = PUZZLES.map(
      (p, i) => `<button class="pdot ${i === index ? 'on' : ''} ${state.progress.puzzlesSolved.includes(p.id) ? 'ok' : ''}" data-act="goto" data-arg="${i}" aria-label="Puzzle ${i + 1}">${i + 1}</button>`,
    ).join('');

    return `<p class="eyebrow">Puzzle ${index + 1} / ${PUZZLES.length}</p>
      <div class="puzzle-head"><h1 class="page-title">${esc(puzzle.title)}</h1>${state.progress.puzzlesSolved.includes(puzzle.id) ? badge('Solved', 'green') : ''}</div>
      <p class="small">${toMove() === 'w' ? 'White' : 'Black'} to move · Checkmate in 1</p>
      <div class="mt">${box}</div>
      <div class="btn-row">${btns.join('')}</div>
      <div class="pdots">${dots}</div>`;
  }

  function draw() {
    root.querySelector('.board-slot').innerHTML = boardHTML({
      board: pos.board,
      theme: theme(),
      orientation: toMove(),
      selected,
      targets: state.settings.showHints ? targets() : [],
      lastMove: last,
      checkSquare: pos.inCheck() ? pos.findKing(pos.turn) : null,
      danger: [],
      showCoordinates: state.settings.showCoordinates,
    });
    root.querySelector('.study-text').innerHTML = panel();
    const back = document.querySelector('.back-title');
    if (back) back.textContent = `Puzzle ${index + 1} / ${PUZZLES.length}`;
  }

  return {
    title: 'Puzzles',
    sub: `Puzzle ${index + 1} / ${PUZZLES.length}`,
    tab: 'learn',
    wide: true,
    html: `<div class="study-layout"><div class="board-col"><div class="board-slot"></div></div><div class="study-text"></div></div>`,
    mount(el) {
      root = el;
      draw();
      bindBoard(el.querySelector('.board-slot'), {
        onSquare: (sq) => {
          if (status !== 'solving') return;
          if (selected !== null && attempt(selected, sq)) return;
          const p = pos.board[sq];
          selected = p && p.color === pos.turn && sq !== selected ? sq : null;
          draw();
        },
        canDrag: (sq) => status === 'solving' && pos.board[sq]?.color === pos.turn,
        onDrop: (from, to) => {
          if (selected === from && !attempt(from, to)) draw();
        },
      });
    },
    actions: {
      hint: () => ((showHint = true), draw()),
      retry: () => (load(index), draw()),
      prev: () => (load(index - 1), draw()),
      next: () => (load(index + 1), draw()),
      goto: (i) => (load(+i), draw()),
    },
  };
}
