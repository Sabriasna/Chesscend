// Lesson and puzzle pages (interactive boards from the Learn tab).
import { icon } from './icons.js';
import { badge, bindBoard, boardHTML, esc, openModal, piece, pill } from './ui.js';
import { markLesson, markPuzzle, state, theme } from './store.js';
import { nav } from './app.js';
import { colorName, courseText, lessonText, pieceName, puzzleText, t } from './i18n.js';
import { ALL_LESSONS, COURSES } from '../../src/data/lessons.js';
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
  const lt = lessonText(lesson);
  const course = lesson.courseId;
  const courseLessons = ALL_LESSONS.filter((l) => l.courseId === course);
  const n = courseLessons.findIndex((l) => l.id === lesson.id) + 1;

  return {
    title: lt.title,
    sub: t('lesson.number', { i: index + 1 }),
    back: `course-${course}`,
    tab: 'learn',
    wide: true,
    html: `<div class="study-layout">
      <div class="board-col"><div class="board-slot"></div></div>
      <div class="study-text">
        <p class="eyebrow">${t('lesson.of', { i: n, n: courseLessons.length })} · ${esc(courseText(COURSES.find((c) => c.id === course)).title)}</p>
        <h1 class="page-title">${esc(lt.title)}</h1>
        <div class="card">${lt.paragraphs.map((p) => `<p class="body">${esc(p)}</p>`).join('')}</div>
        <p class="tip">${icon('pointer', 18)} <span>${t('lesson.tip')}</span></p>
        ${pill(t(done ? (sameCourseNext ? 'lesson.next' : 'lesson.backToCourse') : 'lesson.gotIt'), { icon: done ? 'arrow-right' : 'check', attrs: 'data-act="finish"', cls: 'block' })}
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
      const th = theme();
      const color = pos.turn;
      const md = openModal(`<h3>${t('promo.title')}</h3><p>${t('promo.text')}</p>
        <div class="promo-row">${['q', 'r', 'b', 'n']
          .map((k) => `<button class="promo" data-p="${k}">${piece(k, color, th)}<span>${pieceName(k)}</span></button>`)
          .join('')}</div>`);
      md.el.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => (md.close(), tryMove(from, to, b.dataset.p))));
    } else tryMove(from, to);
    return true;
  }

  function panel() {
    const solvedCount = state.progress.puzzlesSolved.length;
    const pt = puzzleText(puzzle);
    let box = '';
    if (status === 'solving')
      box = `<div class="card"><div class="inline-top">${icon('bulb', 24, 'gold')}<p class="body">${esc(showHint ? pt.hint : t('puzzle.find'))}</p></div>
        ${showHint ? '' : pill(t('puzzle.showHint'), { variant: 'light', size: 'm', attrs: 'data-act="hint"', cls: 'block mt' })}</div>`;
    if (status === 'solved')
      box = `<div class="card ok-card"><div class="inline-top">${icon('check-circle', 26, 'green')}<strong class="h3">${t('puzzle.solved')}</strong></div>
        <p class="small mt-s">${t('puzzle.solvedCount', { done: solvedCount, n: PUZZLES.length })}</p></div>`;
    if (status === 'wrong')
      box = `<div class="card ko-card"><div class="inline-top">${icon('x-circle', 26, 'red')}<strong class="h3">${t('puzzle.wrong')}</strong></div>
        <p class="small mt-s">${t('puzzle.tryAgainText')}</p></div>`;

    const btns = [];
    if (status === 'wrong') btns.push(pill(t('common.tryAgain'), { icon: 'rotate-ccw', attrs: 'data-act="retry"', cls: 'grow' }));
    if (status !== 'wrong' && index > 0) btns.push(pill(t('puzzle.previous'), { variant: 'light', size: 'm', attrs: 'data-act="prev"', cls: 'grow' }));
    if (status === 'solved' && index < PUZZLES.length - 1) btns.push(pill(t('puzzle.next'), { icon: 'arrow-right', attrs: 'data-act="next"', cls: 'grow' }));
    if (status === 'solving' && index < PUZZLES.length - 1) btns.push(pill(t('puzzle.skip'), { variant: 'light', size: 'm', attrs: 'data-act="next"', cls: 'grow' }));

    const dots = PUZZLES.map(
      (p, i) => `<button class="pdot ${i === index ? 'on' : ''} ${state.progress.puzzlesSolved.includes(p.id) ? 'ok' : ''}" data-act="goto" data-arg="${i}" aria-label="${t('puzzle.number', { i: i + 1, n: PUZZLES.length })}">${i + 1}</button>`,
    ).join('');

    return `<p class="eyebrow">${t('puzzle.number', { i: index + 1, n: PUZZLES.length })}</p>
      <div class="puzzle-head"><h1 class="page-title">${esc(pt.title)}</h1>${state.progress.puzzlesSolved.includes(puzzle.id) ? badge(t('puzzle.solvedBadge'), 'green') : ''}</div>
      <p class="small">${t('puzzle.toMove', { side: colorName(toMove()) })}</p>
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
    if (back) back.textContent = t('puzzle.number', { i: index + 1, n: PUZZLES.length });
  }

  return {
    title: t('learn.puzzles'),
    sub: t('puzzle.number', { i: index + 1, n: PUZZLES.length }),
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
