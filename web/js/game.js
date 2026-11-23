// Game page: board, clocks, coach, move list, undo / hints / resign.
import { icon } from './icons.js';
import { avatar, bindBoard, boardHTML, esc, openModal, piece, pill, toast } from './ui.js';
import { clearSavedGame, discardBrokenGame, recordGame, saveGame, state, theme, updateSettings } from './store.js';
import { nav } from './app.js';
import { findBestMove } from '../../src/engine/ai.js';
import { Game } from '../../src/engine/chess.js';
import { coachMessage, findThreats } from '../../src/engine/coach.js';
import { coachText, colorName, displayName, levelName, pieceName, t as tr, tcName } from './i18n.js';
import { timeoutResult } from './rules.js';

const other = (c) => (c === 'w' ? 'b' : 'w');
const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

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

export function gamePage({ config, moves: initialMoves, clocks: initialClocks, clockHistory: initialClockHistory, assisted: initialAssisted }) {
  let game = new Game();
  let broken = false;
  for (const s of initialMoves ?? []) {
    if (!game.playSan(s)) {
      broken = true; // unreadable save: keep the moves that replay, the original is kept as a backup
      break;
    }
  }
  if (broken) discardBrokenGame();
  const resumed = !!initialMoves?.length && !broken;

  const isAi = config.mode === 'ai';
  let selected = null;
  let clocks = initialClocks ? { ...initialClocks } : initialClocksFor(config);
  // Clocks before each move, so that Undo gives the time back.
  let clockHistory =
    initialClockHistory && initialClockHistory.length === game.history.length ? initialClockHistory.map((c) => ({ ...c })) : [];
  // A game where a move was taken back no longer counts for the Computer Rating.
  let assisted = !!initialAssisted;
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
    else saveGame({ config, moves: game.sanList(), clocks, clockHistory, assisted, savedAt: Date.now() });
  };
  const persistNow = () => {
    tickClock();
    persist();
  };
  // Casual games: the clock pauses while the page is hidden or closed (announced on the setup page).
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      tickClock();
      stopClock();
      persist();
    } else if (alive) startClock();
  };

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
      recordGame({ result: res, mode: config.mode, level: config.aiLevel, reason: r.reason, moves: Math.ceil(game.history.length / 2), rated: !assisted });
    }
    persist();
    setTimeout(() => alive && showEnd(), 450);
  }

  function endText() {
    const r = result();
    let title = tr('end.draw');
    if (r.winner) {
      if (isAi) title = tr(r.winner === config.playerColor ? 'end.youWon' : 'end.youLost');
      else title = tr(r.winner === 'w' ? 'end.whiteWins' : 'end.blackWins');
    }
    let subtitle = tr(`end.reason.${r.reason}`);
    if (r.reason === 'timeout' && !r.winner) subtitle = tr('end.timeoutDraw');
    if (r.winner && isAi && r.winner !== config.playerColor) subtitle = tr('end.encourage', { reason: subtitle });
    return { title, subtitle };
  }

  function showEnd() {
    if (!result().over) return;
    const t = endText();
    const last = state.stats.games[0];
    const ratingLine = !isAi
      ? ''
      : assisted
        ? `<p class="sheet-note">${tr('end.unrated')}</p>`
        : last && last.mode === 'ai'
          ? `<p class="sheet-note">${tr('rating.computer')}: <b>${last.ratingAfter}</b> (${last.change >= 0 ? '+' : ''}${last.change})</p>`
          : '';
    const m = openModal(`<div class="sheet-icon">${icon('trophy', 40)}</div><h3 class="big">${t.title}</h3><p>${t.subtitle}</p>${ratingLine}
      <div class="sheet-actions">
        ${pill(tr('end.playAgain'), { icon: 'rotate-cw', attrs: 'data-m="replay"' })}
        ${pill(tr('end.viewBoard'), { variant: 'light', size: 'm', attrs: 'data-m="close"' })}
        ${pill(tr('end.backHome'), { variant: 'light', size: 'm', attrs: 'data-m="home"' })}
      </div>`);
    m.el.querySelector('[data-m="replay"]').onclick = () => (m.close(), replay());
    m.el.querySelector('[data-m="close"]').onclick = m.close;
    m.el.querySelector('[data-m="home"]').onclick = () => (m.close(), nav.go('home'));
  }

  /* ---------------- clock ---------------- */
  const clockRunning = () => !!clocks && game.history.length > 0 && !result().over;
  /** Takes the time spent since the last tick off the player to move. */
  function tickClock() {
    if (!timer || !clocks) return;
    const now = Date.now();
    const t = turn();
    clocks[t] = Math.max(0, clocks[t] - (now - lastTick));
    lastTick = now;
  }
  function startClock() {
    stopClock();
    if (!clockRunning()) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    lastTick = Date.now();
    timer = setInterval(() => {
      tickClock();
      const t = turn();
      updateClocks();
      if (clocks[t] <= 0) {
        // Official rule: no win on time if the opponent has only a king left.
        override = timeoutResult(game.pos, t);
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
  /** Plays a move, keeping the clocks as they were just before it (for Undo). */
  function play(from, to, promotion = 'q') {
    tickClock();
    const before = clocks ? { ...clocks } : null;
    const entry = game.play(from, to, promotion);
    if (entry && before) clockHistory.push(before);
    return entry;
  }

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
        const entry = m ? play(m.from, m.to, m.promotion || 'q') : null;
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
    const entry = play(from, to);
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
    const m = openModal(`<h3>${tr('promo.title')}</h3><p>${tr('promo.text')}</p>
      <div class="promo-row">${['q', 'r', 'b', 'n'].map((k) => `<button class="promo" data-p="${k}">${piece(k, color, t)}<span>${pieceName(k)}</span></button>`).join('')}</div>`, {
      onClose: () => drawBoard(),
    });
    m.el.querySelectorAll('[data-p]').forEach((b) => {
      b.onclick = () => {
        const entry = play(from, to, b.dataset.p);
        m.close();
        if (entry) afterMove(entry);
      };
    });
  }

  // No undo once the game is over: the result is already in the statistics.
  const canUndo = () =>
    !thinking && !result().over && game.history.length > 0 && (!isAi || game.history.length >= (config.playerColor === 'w' ? 1 : 2));

  function undoOne() {
    game.undo();
    const c = clockHistory.pop();
    if (c && clocks) clocks = { ...c };
  }

  function undo() {
    if (!canUndo()) return;
    if (isAi && !assisted) {
      const m = openModal(`<div class="sheet-icon">${icon('rotate-ccw', 34)}</div><h3>${tr('undo.title')}</h3>
        <p>${tr('undo.text')}</p>
        <div class="sheet-actions">${pill(tr('undo.yes'), { attrs: 'data-m="yes"' })}${pill(tr('common.keepPlaying'), { variant: 'light', size: 'm', attrs: 'data-m="no"' })}</div>`);
      m.el.querySelector('[data-m="no"]').onclick = m.close;
      m.el.querySelector('[data-m="yes"]').onclick = () => {
        m.close();
        assisted = true;
        doUndo();
      };
      return;
    }
    doUndo();
  }

  function doUndo() {
    stopClock();
    token++;
    undoOne();
    if (isAi && game.pos.turn !== config.playerColor) undoOne();
    selected = null;
    persist();
    draw();
    startClock();
  }

  function askResign() {
    const t = turn();
    const m = openModal(`<div class="sheet-icon">${icon('flag', 34)}</div><h3>${tr('resign.title')}</h3>
      <p>${isAi ? tr('resign.ai') : tr('resign.local', { side: colorName(t), opp: colorName(other(t)) })}</p>
      <div class="sheet-actions">${pill(tr('game.resign'), { attrs: 'data-m="yes"' })}${pill(tr('common.keepPlaying'), { variant: 'light', size: 'm', attrs: 'data-m="no"' })}</div>`);
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
    clockHistory = [];
    assisted = false;
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

  const nameOf = (c) => (isAi ? (c === config.playerColor ? displayName(state.settings.playerName) : tr('game.computer')) : colorName(c));
  const subOf = (c) =>
    isAi ? (c === config.playerColor ? colorName(c) : levelName(config.aiLevel)) : tr('game.friend');

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
    if (thinking) return `<div class="coach">${'<span class="coach-ic">' + icon('robot', 20) + '</span>'}<p>${tr('coach.thinking')}<span class="dots"></span></p></div>`;
    if (!hints || !humanTurn()) return '';
    const names = { you: 'you', your: 'your', opponent: 'The computer' }; // English text unused: the site translates msg.key
    const msg = coachMessage(game, findThreats(game.pos, turn()), names);
    if (!msg) return `<div class="coach">${'<span class="coach-ic">' + icon('school', 20) + '</span>'}<p>${tr('coach.toMove', { side: colorName(turn()) })}</p></div>`;
    return `<div class="coach ${msg.tone ? `tone-${msg.tone}` : ''}"><span class="coach-ic">${icon('school', 20)}</span><p>${esc(msg.key ? coachText(msg, turn(), isAi) : msg.text)}</p></div>`;
  }

  function moveList() {
    const moves = game.sanList();
    if (!moves.length) return `<p class="no-moves">${tr('game.noMoves')}</p>`;
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
      action('rotate-ccw', tr('game.undo'), 'undo', { disabled: !canUndo() }),
      action('zap', tr(hints ? 'game.hintsOn' : 'game.hintsOff'), 'hints', { active: hints }),
      !isAi && !state.settings.autoFlip ? action('refresh-cw', tr('game.flip'), 'flip') : '',
      r.over ? action('play', tr('game.newGame'), 'replay') : action('flag', tr('game.resign'), 'resign', { disabled: game.history.length === 0 }),
    ].join('');
  }

  function draw() {
    drawBoard();
    drawPanel();
  }

  const title = isAi ? tr('game.vsComputerLevel', { level: levelName(config.aiLevel) }) : tr('game.friendGame');

  return {
    title,
    sub: title,
    tab: 'play',
    wide: true,
    noFooter: true,
    cls: 'game-main',
    backRight: config.timeControl ? `<span class="tc">${tcName(config.timeControl)}</span>` : '',
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
        <p class="small center desk-only kbd-tip">${icon('pointer', 13)} ${tr('game.dragTip')}</p>
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
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pagehide', persistNow);
      draw();
      startClock();
      maybeComputer();
      if (broken) toast(tr('game.brokenSave'));
      else if (resumed && clocks) toast(tr('game.resumed'));
    },
    unmount() {
      alive = false;
      token++;
      tickClock();
      stopClock();
      persist();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', persistNow);
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
