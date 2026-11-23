// Game page: board, clocks, coach, move list, undo / hints / resign.
import { icon } from './icons.js';
import { avatar, bindBoard, boardHTML, esc, openModal, piece, pill } from './ui.js';
import { clearSavedGame, recordGame, saveGame, state, theme, updateSettings } from './store.js';
import { nav } from './app.js';
import { AI_LEVELS, findBestMove } from '../../src/engine/ai.js';
import { Game } from '../../src/engine/chess.js';
import { coachMessage, findThreats } from '../../src/engine/coach.js';
import { tcLabel } from '../../src/data/timeControls.js';

const other = (c) => (c === 'w' ? 'b' : 'w');
const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const REASONS = {
  checkmate: 'by checkmate',
  stalemate: 'Stalemate: no legal move, but no check',
  threefold: 'Same position three times',
  fifty: '50 moves without a capture or pawn move',
  material: 'Not enough pieces left to checkmate',
  timeout: 'on time',
  resign: 'by resignation',
};

const initialClocksFor = (config) =>
  config.timeControl ? { w: config.timeControl.minutes * 60000, b: config.timeControl.minutes * 60000 } : null;

function formatClock(ms) {
  if (ms < 10000) return (Math.ceil(ms / 100) / 10).toFixed(1);
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/* ---- Computer moves in a background worker so the page never freezes ---- */
let worker = null;
let workerFailed = false;
function computerMove(fen, level) {
  return new Promise((resolve) => {
    if (!workerFailed) {
      try {
        worker ??= new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
        const done = (e) => {
          worker.removeEventListener('message', done);
          worker.removeEventListener('error', fail);
          resolve(e.data);
        };
        const fail = (e) => {
          e.preventDefault?.();
          worker.removeEventListener('message', done);
          worker.removeEventListener('error', fail);
          workerFailed = true;
          worker = null;
          resolve(findBestMove(fen, level));
        };
        worker.addEventListener('message', done);
        worker.addEventListener('error', fail);
        worker.postMessage({ fen, level });
        return;
      } catch {
        workerFailed = true;
      }
    }
    setTimeout(() => resolve(findBestMove(fen, level)), 30);
  });
}

export function gamePage({ config, moves: initialMoves, clocks: initialClocks }) {
  let game = new Game();
  initialMoves?.forEach((s) => game.playSan(s));

  const isAi = config.mode === 'ai';
  let selected = null;
  let clocks = initialClocks ?? initialClocksFor(config);
  let override = null;
  let thinking = false;
  let manualFlip = false;
  let recorded = false;
  let token = 0; // cancels a computer move that arrives after undo / new game
  let timer = null;
  let lastTick = 0;
  let root = null;
  let alive = true;

  const result = () => override ?? game.result();
  const turn = () => game.pos.turn;
  const humanTurn = () => !isAi || turn() === config.playerColor;
  const orientation = () => {
    if (isAi) return config.playerColor;
    if (state.settings.autoFlip) return turn();
    return manualFlip ? 'b' : 'w';
  };

  /* ---------------- saving ---------------- */
  const persist = () => {
    if (result().over || game.history.length === 0) clearSavedGame();
    else saveGame({ config, moves: game.sanList(), clocks, savedAt: Date.now() });
  };
  const onHide = () => document.visibilityState === 'hidden' && persist();

  /* ---------------- finished game ---------------- */
  function finish() {
    const r = result();
    if (!r.over) return;
    stopClock();
    if (!recorded) {
      recorded = true;
      let res;
      if (isAi) res = r.winner === null ? 'draw' : r.winner === config.playerColor ? 'win' : 'loss';
      else res = r.winner === null ? 'draw' : r.winner === 'w' ? 'white' : 'black';
      recordGame({ result: res, mode: config.mode, level: config.aiLevel, reason: r.reason, moves: Math.ceil(game.history.length / 2) });
    }
    persist();
    setTimeout(() => alive && showEnd(), 450);
  }

  function endText() {
    const r = result();
    let title = 'Draw';
    if (r.winner) {
      if (isAi) title = r.winner === config.playerColor ? 'You won!' : 'You lost';
      else title = r.winner === 'w' ? 'White wins!' : 'Black wins!';
    }
    let subtitle = REASONS[r.reason];
    if (r.winner && isAi && r.winner !== config.playerColor) subtitle += '. Every game makes you better!';
    return { title, subtitle };
  }

  function showEnd() {
    if (!result().over) return;
    const t = endText();
    const m = openModal(`<div class="sheet-icon">${icon('trophy', 40)}</div><h3 class="big">${t.title}</h3><p>${t.subtitle}</p>
      <div class="sheet-actions">
        ${pill('Play again', { icon: 'rotate-cw', attrs: 'data-m="replay"' })}
        ${pill('View the board', { variant: 'light', size: 'm', attrs: 'data-m="close"' })}
        ${pill('Back to home', { variant: 'light', size: 'm', attrs: 'data-m="home"' })}
      </div>`);
    m.el.querySelector('[data-m="replay"]').onclick = () => (m.close(), replay());
    m.el.querySelector('[data-m="close"]').onclick = m.close;
    m.el.querySelector('[data-m="home"]').onclick = () => (m.close(), nav.go('home'));
  }

  /* ---------------- clock ---------------- */
  const clockRunning = () => !!clocks && game.history.length > 0 && !result().over;
  function startClock() {
    stopClock();
    if (!clockRunning()) return;
    lastTick = Date.now();
    timer = setInterval(() => {
      const now = Date.now();
      const t = turn();
      clocks[t] = Math.max(0, clocks[t] - (now - lastTick));
      lastTick = now;
      updateClocks();
      if (clocks[t] <= 0) {
        override = { over: true, winner: other(t), reason: 'timeout' };
        selected = null;
        token++;
        thinking = false;
        draw();
        finish();
      }
    }, 100);
  }
  function stopClock() {
    clearInterval(timer);
    timer = null;
  }
  function updateClocks() {
    if (!root || !clocks) return;
    root.querySelectorAll('[data-clock]').forEach((el) => {
      const c = el.dataset.clock;
      el.querySelector('span').textContent = formatClock(clocks[c]);
      const active = !result().over && turn() === c;
      el.classList.toggle('active', active);
      el.classList.toggle('low', active && clocks[c] < 20000);
    });
  }

  /* ---------------- moves ---------------- */
  function afterMove(entry) {
    if (state.settings.haptics) navigator.vibrate?.(entry.move.captured ? 25 : 12);
    if (config.timeControl && game.history.length > 1) {
      clocks[entry.move.color] += config.timeControl.increment * 1000;
    }
    selected = null;
    persist();
    draw();
    startClock();
    if (game.result().over) finish();
    else maybeComputer();
  }

  function maybeComputer() {
    if (!isAi || result().over || turn() === config.playerColor) return;
    thinking = true;
    drawPanel();
    const my = ++token;
    const started = Date.now();
    computerMove(game.pos.fen(), config.aiLevel).then((m) => {
      const wait = Math.max(0, 350 - (Date.now() - started));
      setTimeout(() => {
        if (!alive || my !== token) return;
        thinking = false;
        const entry = m ? game.play(m.from, m.to, m.promotion || 'q') : null;
        if (entry) afterMove(entry);
        else draw();
      }, wait);
    });
  }

  function targets() {
    return selected === null ? [] : game.pos.movesFrom(selected).map((m) => m.to);
  }

  function tryMove(from, to) {
    if (!targets().includes(to)) return false;
    if (game.isPromotion(from, to)) {
      askPromotion(from, to);
      return true;
    }
    const entry = game.play(from, to);
    if (entry) afterMove(entry);
    return true;
  }

  function onSquare(sq) {
    if (result().over || thinking || !humanTurn()) return;
    if (selected !== null && tryMove(selected, sq)) return;
    const p = game.pos.board[sq];
    selected = p && p.color === turn() && sq !== selected ? sq : null;
    drawBoard();
  }

  function askPromotion(from, to) {
    const t = theme();
    const color = turn();
    const choices = [['q', 'Queen'], ['r', 'Rook'], ['b', 'Bishop'], ['n', 'Knight']];
    const m = openModal(`<h3>Promote your pawn</h3><p>Most players choose the queen.</p>
      <div class="promo-row">${choices.map(([k, n]) => `<button class="promo" data-p="${k}">${piece(k, color, t)}<span>${n}</span></button>`).join('')}</div>`, {
      onClose: () => drawBoard(),
    });
    m.el.querySelectorAll('[data-p]').forEach((b) => {
      b.onclick = () => {
        const entry = game.play(from, to, b.dataset.p);
        m.close();
        if (entry) afterMove(entry);
      };
    });
  }

  const canUndo = () =>
    !thinking && !override && game.history.length > 0 && (!isAi || game.history.length >= (config.playerColor === 'w' ? 1 : 2));

  function undo() {
    if (!canUndo()) return;
    token++;
    game.undo();
    if (isAi && game.pos.turn !== config.playerColor) game.undo();
    selected = null;
    persist();
    draw();
    startClock();
  }

  function askResign() {
    const t = turn();
    const m = openModal(`<div class="sheet-icon">${icon('flag', 34)}</div><h3>Resign this game?</h3>
      <p>${isAi ? 'The computer will win this game.' : `${t === 'w' ? 'White' : 'Black'} resigns and ${t === 'w' ? 'Black' : 'White'} wins.`}</p>
      <div class="sheet-actions">${pill('Resign', { attrs: 'data-m="yes"' })}${pill('Keep playing', { variant: 'light', size: 'm', attrs: 'data-m="no"' })}</div>`);
    m.el.querySelector('[data-m="no"]').onclick = m.close;
    m.el.querySelector('[data-m="yes"]').onclick = () => {
      m.close();
      const loser = isAi ? config.playerColor : turn();
      token++;
      thinking = false;
      override = { over: true, winner: other(loser), reason: 'resign' };
      selected = null;
      draw();
      finish();
    };
  }

  function replay() {
    token++;
    game = new Game();
    recorded = false;
    clocks = initialClocksFor(config);
    override = null;
    selected = null;
    thinking = false;
    stopClock();
    clearSavedGame();
    draw();
    maybeComputer();
  }

  /* ---------------- drawing ---------------- */
  function captured() {
    const count = { w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } };
    game.pos.board.forEach((p) => p && count[p.color][p.type]++);
    const lost = (c) => {
      const list = [];
      ['q', 'r', 'b', 'n', 'p'].forEach((t) => {
        for (let i = 0; i < Math.max(0, START_COUNT[t] - count[c][t]); i++) list.push(t);
      });
      return list;
    };
    const material = (c) => Object.keys(count[c]).reduce((s, t) => s + VALUE[t] * count[c][t], 0);
    return { byWhite: lost('b'), byBlack: lost('w'), diff: material('w') - material('b') };
  }

  const nameOf = (c) => (isAi ? (c === config.playerColor ? state.settings.playerName : 'Computer') : c === 'w' ? 'White' : 'Black');
  const subOf = (c) =>
    isAi ? (c === config.playerColor ? (c === 'w' ? 'White' : 'Black') : AI_LEVELS[config.aiLevel].label) : 'Friend';

  function playerBar(c, cap) {
    const active = !result().over && turn() === c;
    const isComputer = isAi && c !== config.playerColor;
    const list = c === 'w' ? cap.byWhite : cap.byBlack;
    const adv = c === 'w' ? cap.diff : -cap.diff;
    const t = theme();
    const low = clocks && active && clocks[c] < 20000;
    return `<div class="player-bar">
      ${isComputer ? `<span class="bot ${active ? 'active' : ''}">${icon('robot', 22)}</span>` : avatar(nameOf(c), 40, active ? 'var(--gold)' : '')}
      <span class="grow"><strong class="pname">${esc(nameOf(c))} <span class="psub">· ${esc(subOf(c))}</span></strong>
        <span class="captured">${list.map((p) => piece(p, other(c), t)).join('')}${adv > 0 ? `<b>+${adv}</b>` : ''}</span></span>
      ${clocks ? `<span class="clock ${active ? 'active' : ''} ${low ? 'low' : ''}" data-clock="${c}"><span>${formatClock(clocks[c])}</span></span>` : ''}
    </div>`;
  }

  function drawBoard() {
    if (!root) return;
    const pos = game.pos;
    const hints = state.settings.showHints;
    const r = result();
    const threats = !hints || r.over || !humanTurn() || thinking ? [] : findThreats(pos, turn());
    root.querySelector('.board-slot').innerHTML = boardHTML({
      board: pos.board,
      theme: theme(),
      orientation: orientation(),
      selected,
      targets: hints ? targets() : [],
      lastMove: game.lastMove(),
      checkSquare: pos.inCheck() ? pos.findKing(turn()) : null,
      danger: threats.map((t) => t.square),
      showCoordinates: state.settings.showCoordinates,
    });
    const cap = captured();
    const o = orientation();
    root.querySelector('.pb-top').innerHTML = playerBar(other(o), cap);
    root.querySelector('.pb-bottom').innerHTML = playerBar(o, cap);
  }

  function coach() {
    const hints = state.settings.showHints;
    const r = result();
    if (r.over) {
      const t = endText();
      return `<div class="status">${t.title} · ${t.subtitle}</div>`;
    }
    if (thinking) return `<div class="coach">${'<span class="coach-ic">' + icon('robot', 20) + '</span>'}<p>The computer is thinking<span class="dots"></span></p></div>`;
    if (!hints || !humanTurn()) return '';
    const names = isAi
      ? { you: 'you', your: 'your', opponent: 'The computer' }
      : turn() === 'w'
        ? { you: 'White', your: "White's", opponent: 'Black' }
        : { you: 'Black', your: "Black's", opponent: 'White' };
    const msg = coachMessage(game, findThreats(game.pos, turn()), names);
    if (!msg) return `<div class="coach">${'<span class="coach-ic">' + icon('school', 20) + '</span>'}<p>${turn() === 'w' ? 'White' : 'Black'} to move. Take your time.</p></div>`;
    return `<div class="coach ${msg.tone ? `tone-${msg.tone}` : ''}"><span class="coach-ic">${icon('school', 20)}</span><p>${esc(msg.text)}</p></div>`;
  }

  function moveList() {
    const moves = game.sanList();
    if (!moves.length) return '<p class="no-moves">No moves yet</p>';
    let html = '';
    for (let i = 0; i < moves.length; i += 2) {
      const lastPair = i + 2 >= moves.length;
      html += `<li><span class="mn">${i / 2 + 1}.</span><span class="mv ${lastPair && !moves[i + 1] ? 'last' : ''}">${esc(moves[i])}</span><span class="mv ${lastPair && moves[i + 1] ? 'last' : ''}">${esc(moves[i + 1] ?? '')}</span></li>`;
    }
    return `<ol class="moves-ol">${html}</ol>`;
  }

  function drawPanel() {
    if (!root) return;
    const hints = state.settings.showHints;
    const r = result();
    root.querySelector('.coach-slot').innerHTML = coach();
    root.querySelector('.moves-box').innerHTML = moveList();
    const mb = root.querySelector('.moves-box');
    mb.scrollTop = mb.scrollHeight;
    mb.scrollLeft = mb.scrollWidth;
    const action = (ic, label, act, { disabled, active } = {}) =>
      `<button class="action ${active ? 'on' : ''}" data-act="${act}" ${disabled ? 'disabled' : ''}>${icon(ic, 20)}<span>${label}</span></button>`;
    root.querySelector('.actions').innerHTML = [
      action('rotate-ccw', 'Undo', 'undo', { disabled: !canUndo() }),
      action('zap', hints ? 'Hints on' : 'Hints off', 'hints', { active: hints }),
      !isAi && !state.settings.autoFlip ? action('refresh-cw', 'Flip', 'flip') : '',
      r.over ? action('play', 'New game', 'replay') : action('flag', 'Resign', 'resign', { disabled: game.history.length === 0 }),
    ].join('');
  }

  function draw() {
    drawBoard();
    drawPanel();
  }

  const title = isAi ? `vs Computer · ${AI_LEVELS[config.aiLevel].label}` : 'Friend game';

  return {
    title,
    sub: title,
    tab: 'play',
    wide: true,
    noFooter: true,
    cls: 'game-main',
    backRight: config.timeControl ? `<span class="tc">${tcLabel(config.timeControl)}</span>` : '',
    html: `<div class="game-layout">
      <div class="board-col">
        <div class="pb-top"></div>
        <div class="board-slot"></div>
        <div class="pb-bottom"></div>
      </div>
      <aside class="game-panel">
        <div class="coach-slot"></div>
        <div class="moves-box card"></div>
        <div class="actions"></div>
        <p class="small center desk-only kbd-tip">${icon('pointer', 13)} Click or drag a piece to move it.</p>
      </aside>
    </div>`,
    mount(el) {
      root = el;
      bindBoard(el.querySelector('.board-slot'), {
        onSquare,
        canDrag: (sq) => {
          const p = game.pos.board[sq];
          return !result().over && !thinking && humanTurn() && p && p.color === turn();
        },
        onDrop: (from, to) => {
          if (selected === from && !tryMove(from, to)) drawBoard();
        },
      });
      document.addEventListener('visibilitychange', onHide);
      window.addEventListener('pagehide', persist);
      draw();
      startClock();
      maybeComputer();
    },
    unmount() {
      alive = false;
      token++;
      stopClock();
      persist();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', persist);
    },
    actions: {
      undo,
      hints: () => {
        updateSettings({ showHints: !state.settings.showHints });
        draw();
      },
      flip: () => {
        manualFlip = !manualFlip;
        drawBoard();
      },
      resign: askResign,
      replay,
    },
  };
}
