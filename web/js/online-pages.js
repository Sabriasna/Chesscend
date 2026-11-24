// Online play: the lobby (find an opponent, invite a friend) and the online game page.
// Nothing here decides a result: the server (Edge Function "online") checks every move,
// keeps the clocks and writes results and ratings. This page shows what the server says.
import { icon } from './icons.js';
import { avatar, bindBoard, boardHTML, esc, goldPiece, openModal, piece, pill, toast } from './ui.js';
import { state, theme, updateSettings } from './store.js';
import { nav } from './app.js';
import { Game } from '../../src/engine/chess.js';
import { formatDate, pieceName, reasonName, t } from './i18n.js';
import { getProfile, isDefaultUsername, isSignedIn, currentUser } from './auth.js';
import {
  FIRST_MOVE_MS,
  MIN_RANKED_GAMES,
  ONLINE_TIME_CONTROLS,
  colorOf,
  currentGame,
  fetchGame,
  myRating,
  onlineAction,
  recentGames,
  remaining,
  serverNow,
  sideToMove,
} from './online.js';

const other = (c) => (c === 'w' ? 'b' : 'w');
const tcLabel = (g) => {
  const m = Math.round(g.base_ms / 60000);
  const i = Math.round(g.inc_ms / 1000);
  return i ? `${m} + ${i}` : t('clock.min', { m });
};
const tcOf = (tc) => (tc.increment ? `${tc.minutes} + ${tc.increment}` : t('clock.min', { m: tc.minutes }));

function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (ms < 10000 && ms > 0) return `0:${String(Math.floor(ms / 1000)).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const errText = (code) => {
  const k = `online.err.${code}`;
  const v = t(k);
  return v === k ? t('online.err.generic') : v;
};

const card = (art, title, text, actions = '') => `<div class="card state-card">
  <div class="state-art">${art}</div><h3 class="state-title">${title}</h3><p class="state-text">${text}</p>
  ${actions ? `<div class="state-actions">${actions}</div>` : ''}</div>`;

/** What to show instead of the page when the player cannot play online yet. Returns '' when ready. */
async function gate(returnTo) {
  if (!isSignedIn()) {
    nav.returnAfterLogin(returnTo);
    return card(
      icon('lock', 36, 'gold'),
      t('online.signIn.title'),
      t('online.signIn.text'),
      pill(t('online.signIn.button'), { icon: 'user-plus', attrs: 'data-go="account"' }),
    );
  }
  let profile = null;
  try {
    profile = await getProfile();
  } catch {
    /* checked again by the server */
  }
  if (profile && isDefaultUsername(profile.username)) {
    nav.returnAfterLogin(returnTo);
    return card(
      icon('user-plus', 36, 'gold'),
      t('online.username.title'),
      t('online.username.text'),
      pill(t('online.username.button'), { icon: 'check', attrs: 'data-go="account"' }),
    );
  }
  return '';
}

/* ================================================================ LOBBY */

let chosenTc = 2; // 10 min by default

export function lobbyPage() {
  let root = null;
  let waiting = null; // game waiting for an opponent
  let timer = null;
  let alive = true;
  let busy = false;

  const stop = () => {
    clearTimeout(timer);
    timer = null;
  };

  const resultFor = (g) => {
    const me = colorOf(g, currentUser()?.id);
    if (g.result === '1/2-1/2') return { key: 'draw', tone: 'gold' };
    const won = (g.result === '1-0') === (me === 'w');
    return won ? { key: 'win', tone: 'green' } : { key: 'loss', tone: 'red' };
  };

  async function recentHtml() {
    let games = [];
    try {
      games = await recentGames(8);
    } catch {
      return '';
    }
    if (!games.length) return `<p class="small center mt">${t('online.noGamesYet')}</p>`;
    const me = currentUser()?.id;
    return `<p class="label">${t('online.recent')}</p><div class="card list">${games
      .map((g) => {
        const c = colorOf(g, me);
        const opp = c === 'w' ? g.black_name : g.white_name;
        const r = resultFor(g);
        const change = c === 'w' ? g.white_change : g.black_change;
        return `<div class="list-row">${avatar(opp || '?', 34)}<span class="grow"><strong class="td ellipsis">${esc(opp || t('online.unknownPlayer'))}</strong>
          <span class="small">${tcLabel(g)} · ${reasonName(g.reason)}${g.finished_at ? ` · ${formatDate(Date.parse(g.finished_at))}` : ''}</span></span>
          <span class="online-change ${change > 0 ? 'green' : change < 0 ? 'red' : ''}">${change > 0 ? '+' : ''}${change ?? 0}</span>
          <span class="badge badge-${r.tone}">${t(`result.${r.key}`)}</span></div>`;
      })
      .join('')}</div>`;
  }

  function ratingHtml(r) {
    const games = r?.games ?? 0;
    const sub =
      games >= MIN_RANKED_GAMES
        ? t('online.rating.ranked', { w: r.wins, d: r.draws, l: r.losses })
        : t('online.rating.provisional', { n: games, min: MIN_RANKED_GAMES });
    return `<div class="card online-rating">${icon('users', 26, 'gold')}<span class="grow"><strong class="h3">${t('rating.online')}</strong><span class="small">${sub}</span></span><b class="num">${r?.rating ?? 1200}</b></div>`;
  }

  const controls = () => `
    <p class="label">${t('setup.clock')}</p>
    <div class="chips">${ONLINE_TIME_CONTROLS.map((tc, i) => `<button class="chip outline ${i === chosenTc ? 'on' : ''}" aria-pressed="${i === chosenTc}" data-act="otc" data-arg="${i}">${tcOf(tc)}</button>`).join('')}</div>
    <div class="online-buttons">
      ${pill(t('online.find'), { icon: 'search', attrs: 'data-act="seek"', cls: 'block' })}
      ${pill(t('online.invite'), { icon: 'link', variant: 'light', attrs: 'data-act="invite"', cls: 'block' })}
    </div>
    <p class="small mt-s">${icon('info', 13)} ${t('online.rules')}</p>`;

  const inviteLink = (g) => `${location.origin}${location.pathname}#online-${g.id}`;

  const waitingHtml = (g) =>
    g.kind === 'quick'
      ? `<div class="card online-wait" role="status">
          <span class="wait-spin">${icon('loader', 34)}</span>
          <h3 class="h3">${t('online.searching')}</h3>
          <p class="small">${t('online.searchingText', { tc: tcLabel(g) })}</p>
          ${pill(t('online.cancel'), { icon: 'x', variant: 'light', size: 'm', attrs: 'data-act="cancel-wait"' })}
        </div>`
      : `<div class="card online-wait" role="status">
          <span class="wait-spin">${icon('link', 30)}</span>
          <h3 class="h3">${t('online.inviteReady')}</h3>
          <p class="small">${t('online.inviteText', { tc: tcLabel(g) })}</p>
          <div class="invite-row"><input class="input" readonly value="${esc(inviteLink(g))}" aria-label="${t('online.inviteLink')}" id="invite-link">
            <button class="pill pill-dark pill-m" data-act="copy-link">${icon('copy', 18)}<span>${t('online.copy')}</span></button></div>
          ${navigator.share ? pill(t('online.share'), { icon: 'share-2', variant: 'light', size: 'm', attrs: 'data-act="share-link"' }) : ''}
          <p class="small">${icon('loader', 13, 'spin')} ${t('online.inviteWaiting')}</p>
          ${pill(t('online.cancelInvite'), { icon: 'x', variant: 'light', size: 'm', attrs: 'data-act="cancel-wait"' })}
        </div>`;

  async function poll() {
    if (!alive || !waiting) return;
    try {
      const g = await onlineAction('wait', { id: waiting.id });
      if (!alive) return;
      if (g.status === 'active') return nav.go(`online-${g.id}`);
      if (g.status !== 'waiting') {
        waiting = null;
        return draw();
      }
      waiting = g;
    } catch (e) {
      if (!alive) return;
      if (e.code === 'network') toast(t('online.err.network'));
    }
    timer = setTimeout(poll, waiting?.kind === 'quick' ? 2000 : 3000);
  }

  function showWaiting(g) {
    waiting = g;
    draw();
    stop();
    timer = setTimeout(poll, 1500);
  }

  async function draw() {
    if (!root) return;
    const body = root.querySelector('.online-body');
    if (waiting) {
      body.innerHTML = waitingHtml(waiting);
      return;
    }
    body.innerHTML = `<div class="card list" aria-busy="true">${'<div class="list-row skel"><span class="skel-dot"></span><span class="skel-line"></span></div>'.repeat(3)}</div>`;
    const blocked = await gate('online');
    if (!alive) return;
    if (blocked) {
      body.innerHTML = blocked;
      return;
    }
    let cur = null;
    let rating = null;
    try {
      [cur, rating] = await Promise.all([currentGame(), myRating()]);
    } catch (e) {
      body.innerHTML = card(icon('x-circle', 36, 'red'), t('lb.error.title'), t('lb.error.text'), pill(t('common.tryAgain'), { icon: 'rotate-cw', size: 'm', attrs: 'data-act="reload"' }));
      return;
    }
    if (!alive) return;
    if (cur?.status === 'active') {
      body.innerHTML = card(goldPiece('k', 56), t('online.inProgress'), t('online.inProgressText'), pill(t('online.resume'), { icon: 'play', attrs: `data-go="online-${cur.id}"` }));
      return;
    }
    if (cur?.status === 'waiting' && cur.creator === currentUser()?.id) {
      if (cur.kind === 'invite') return showWaiting(cur);
      onlineAction('cancel', { id: cur.id }).catch(() => {}); // a search left open on another page
    }
    body.innerHTML = `${ratingHtml(rating)}${controls()}<div class="recent-slot"></div>`;
    const recent = await recentHtml();
    if (alive && root.querySelector('.recent-slot')) root.querySelector('.recent-slot').innerHTML = recent;
  }

  async function start(kind) {
    if (busy) return;
    busy = true;
    const tc = ONLINE_TIME_CONTROLS[chosenTc];
    try {
      const g = await onlineAction(kind === 'quick' ? 'seek' : 'invite', { minutes: tc.minutes, increment: tc.increment });
      if (g.status === 'active') return nav.go(`online-${g.id}`);
      showWaiting(g);
    } catch (e) {
      toast(errText(e.code));
      if (e.code === 'needUsername') draw();
    } finally {
      busy = false;
    }
  }

  return {
    title: t('online.title'),
    sub: t('online.title'),
    tab: 'play',
    html: `<div class="narrow"><h1 class="page-title">${t('online.title')}</h1><p class="lead-text">${t('online.subtitle')}</p><div class="online-body mt"></div></div>`,
    mount(el) {
      root = el;
      draw();
    },
    unmount() {
      alive = false;
      stop();
      // Leaving the page stops a quick search (an invitation stays open for the friend).
      if (waiting?.kind === 'quick') onlineAction('cancel', { id: waiting.id }).catch(() => {});
    },
    actions: {
      otc: (i) => {
        chosenTc = +i;
        root.querySelectorAll('[data-act="otc"]').forEach((b) => {
          const on = +b.dataset.arg === chosenTc;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', String(on));
        });
      },
      seek: () => start('quick'),
      invite: () => start('invite'),
      reload: () => draw(),
      'cancel-wait': async () => {
        const g = waiting;
        stop();
        waiting = null;
        if (g) await onlineAction('cancel', { id: g.id }).catch(() => {});
        draw();
      },
      'copy-link': async () => {
        const input = root.querySelector('#invite-link');
        try {
          await navigator.clipboard.writeText(input.value);
        } catch {
          input.select();
          document.execCommand?.('copy');
        }
        toast(t('online.copied'));
      },
      'share-link': () => navigator.share?.({ title: 'Chesscend', text: t('online.shareText'), url: inviteLink(waiting) }).catch(() => {}),
    },
  };
}

/* ================================================================ GAME */

const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function onlineGamePage(id) {
  let root = null;
  let row = null; // the game as the server last told us
  let game = new Game();
  let me = null; // 'w' | 'b'
  let selected = null;
  let sending = false;
  let alive = true;
  let pollTimer = null;
  let clockTimer = null;
  let claimedAt = 0;
  let endShown = false;

  const over = () => row && row.status !== 'active';
  const myTurn = () => row?.status === 'active' && sideToMove(row) === me && !sending;

  function setRow(r) {
    if (!r) return;
    // A poll that answers after our own move would take the move back on screen.
    if (row && r.status === 'active' && row.status === 'active' && r.ply < row.ply) return;
    const changed = !row || r.ply !== row.ply || r.status !== row.status || r.draw_offer !== row.draw_offer;
    row = r;
    me = colorOf(r, currentUser()?.id);
    if (changed) {
      game = new Game();
      for (const san of r.moves ?? []) if (!game.playSan(san)) break;
      selected = null;
      draw();
    }
    if (over() && !endShown) {
      endShown = true;
      stopTimers();
      setTimeout(() => alive && showEnd(), 400);
    }
  }

  /* ---------------- server ---------------- */
  async function act(action, args = {}) {
    try {
      setRow(await onlineAction(action, { id, ...args }));
      return true;
    } catch (e) {
      if (e.code !== 'notYet') toast(errText(e.code));
      try {
        setRow(await fetchGame(id));
      } catch {
        /* next poll */
      }
      return false;
    }
  }

  function schedulePoll() {
    clearTimeout(pollTimer);
    if (!alive || over()) return;
    const wait = sideToMove(row) === me && !row.draw_offer ? 2500 : 1000;
    pollTimer = setTimeout(async () => {
      try {
        setRow(await fetchGame(id));
      } catch {
        /* network: try again */
      }
      schedulePoll();
    }, wait);
  }

  function stopTimers() {
    clearTimeout(pollTimer);
    clearInterval(clockTimer);
  }

  /* ---------------- clocks ---------------- */
  function tick() {
    if (!root || !row) return;
    const now = serverNow();
    const c = remaining(row, now);
    root.querySelectorAll('[data-clock]').forEach((el) => {
      const side = el.dataset.clock;
      el.querySelector('span').textContent = formatClock(c[side]);
      const active = row.status === 'active' && row.ply >= 2 && sideToMove(row) === side;
      el.classList.toggle('active', active);
      el.classList.toggle('low', active && c[side] < 20000);
    });
    if (row.status !== 'active') return;
    const t2m = sideToMove(row);
    const first = root.querySelector('.first-move');
    if (row.ply < 2) {
      const left = Math.max(0, FIRST_MOVE_MS - (now - Date.parse(row.turn_started_at)));
      if (first) first.textContent = t(t2m === me ? 'online.firstMoveYou' : 'online.firstMoveThem', { s: Math.ceil(left / 1000) });
      if (t2m !== me && left <= 0 && Date.now() - claimedAt > 3000) {
        claimedAt = Date.now();
        act('claim');
      }
    } else if (t2m !== me && c[t2m] <= 0 && Date.now() - claimedAt > 3000) {
      // The opponent's flag has fallen: ask the server to check it.
      claimedAt = Date.now();
      act('claim');
    }
  }

  /* ---------------- moves ---------------- */
  const targets = () => (selected === null ? [] : game.pos.movesFrom(selected).map((m) => m.to));

  async function send(from, to, promotion = 'q') {
    const legal = game.pos.movesFrom(from).find((m) => m.to === to);
    if (!legal) return;
    const sq = (i) => 'abcdefgh'[i & 7] + String(8 - (i >> 3));
    const uci = sq(from) + sq(to) + (legal.promotion ? promotion : '');
    const ply = row.ply;
    // Shown at once; the server's answer replaces it (or puts the board back if it refuses).
    game.play(from, to, promotion);
    selected = null;
    sending = true;
    if (state.settings.haptics) navigator.vibrate?.(12);
    draw();
    await act('move', { uci, ply });
    sending = false;
    draw();
    schedulePoll();
  }

  function tryMove(from, to) {
    if (!targets().includes(to)) return false;
    if (game.isPromotion(from, to)) {
      askPromotion(from, to);
      return true;
    }
    send(from, to);
    return true;
  }

  function onSquare(sq) {
    if (!myTurn()) return;
    if (selected !== null && tryMove(selected, sq)) return;
    const p = game.pos.board[sq];
    selected = p && p.color === me && sq !== selected ? sq : null;
    drawBoard();
  }

  function askPromotion(from, to) {
    const th = theme();
    const m = openModal(`<h3>${t('promo.title')}</h3><p>${t('promo.text')}</p>
      <div class="promo-row">${['q', 'r', 'b', 'n'].map((k) => `<button class="promo" data-p="${k}">${piece(k, me, th)}<span>${pieceName(k)}</span></button>`).join('')}</div>`, {
      onClose: () => drawBoard(),
    });
    m.el.querySelectorAll('[data-p]').forEach((b) => {
      b.onclick = () => {
        m.close();
        send(from, to, b.dataset.p);
      };
    });
  }

  /* ---------------- end ---------------- */
  function endInfo() {
    if (row.status === 'aborted') return { title: t('online.end.aborted'), text: t(`online.reason.${row.reason}`) === `online.reason.${row.reason}` ? '' : t(`online.reason.${row.reason}`), change: null };
    let title = t('end.draw');
    if (row.result !== '1/2-1/2') title = t((row.result === '1-0') === (me === 'w') ? 'end.youWon' : 'end.youLost');
    let text = t(`end.reason.${row.reason}`);
    if (row.reason === 'timeout' && row.result === '1/2-1/2') text = t('end.timeoutDraw');
    const change = me === 'w' ? row.white_change : row.black_change;
    const before = me === 'w' ? row.white_rating : row.black_rating;
    return { title, text, change, after: before !== null && change !== null ? before + change : null };
  }

  function showEnd() {
    const e = endInfo();
    const ratingLine =
      e.change === null || e.change === undefined
        ? row.status === 'aborted'
          ? `<p class="sheet-note">${t('online.end.unrated')}</p>`
          : ''
        : `<p class="sheet-note">${t('rating.online')}: <b>${e.after ?? ''}</b> (${e.change >= 0 ? '+' : ''}${e.change})</p>`;
    const m = openModal(`<div class="sheet-icon">${icon(row.status === 'aborted' ? 'x-circle' : 'trophy', 40)}</div><h3 class="big">${e.title}</h3>${e.text ? `<p>${e.text}</p>` : ''}${ratingLine}
      <div class="sheet-actions">
        ${pill(t('online.newOpponent'), { icon: 'search', attrs: 'data-m="again"' })}
        ${pill(t('end.viewBoard'), { variant: 'light', size: 'm', attrs: 'data-m="close"' })}
        ${pill(t('end.backHome'), { variant: 'light', size: 'm', attrs: 'data-m="home"' })}
      </div>`);
    m.el.querySelector('[data-m="again"]').onclick = () => {
      m.close();
      const i = ONLINE_TIME_CONTROLS.findIndex((tc) => tc.minutes * 60000 === row.base_ms && tc.increment * 1000 === row.inc_ms);
      if (i >= 0) chosenTc = i;
      nav.go('online');
    };
    m.el.querySelector('[data-m="close"]').onclick = m.close;
    m.el.querySelector('[data-m="home"]').onclick = () => (m.close(), nav.go('home'));
  }

  function askResign() {
    const m = openModal(`<div class="sheet-icon">${icon('flag', 34)}</div><h3>${t('resign.title')}</h3>
      <p>${t('online.resignText')}</p>
      <div class="sheet-actions">${pill(t('game.resign'), { attrs: 'data-m="yes"' })}${pill(t('common.keepPlaying'), { variant: 'light', size: 'm', attrs: 'data-m="no"' })}</div>`);
    m.el.querySelector('[data-m="no"]').onclick = m.close;
    m.el.querySelector('[data-m="yes"]').onclick = () => {
      m.close();
      act('resign');
    };
  }

  /* ---------------- drawing ---------------- */
  function captured() {
    const count = { w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } };
    game.pos.board.forEach((p) => p && count[p.color][p.type]++);
    const lost = (c) => {
      const list = [];
      ['q', 'r', 'b', 'n', 'p'].forEach((k) => {
        for (let i = 0; i < Math.max(0, START_COUNT[k] - count[c][k]); i++) list.push(k);
      });
      return list;
    };
    const material = (c) => Object.keys(count[c]).reduce((s, k) => s + VALUE[k] * count[c][k], 0);
    return { byWhite: lost('b'), byBlack: lost('w'), diff: material('w') - material('b') };
  }

  function playerBar(c, cap) {
    const name = (c === 'w' ? row.white_name : row.black_name) || t('online.unknownPlayer');
    const rating = c === 'w' ? row.white_rating : row.black_rating;
    const active = row.status === 'active' && sideToMove(row) === c;
    const list = c === 'w' ? cap.byWhite : cap.byBlack;
    const adv = c === 'w' ? cap.diff : -cap.diff;
    const th = theme();
    const clocks = remaining(row, serverNow());
    return `<div class="player-bar">
      ${avatar(name, 40, active ? 'var(--gold)' : '')}
      <span class="grow"><strong class="pname">${esc(name)}${c === me ? ` <span class="badge badge-dark">${t('lb.you')}</span>` : ''} <span class="psub">· ${rating ?? ''}</span></strong>
        <span class="captured">${list.map((p) => piece(p, other(c), th)).join('')}${adv > 0 ? `<b>+${adv}</b>` : ''}</span></span>
      <span class="clock" data-clock="${c}"><span>${formatClock(clocks[c])}</span></span>
    </div>`;
  }

  function drawBoard() {
    if (!root || !row) return;
    const pos = game.pos;
    root.querySelector('.board-slot').innerHTML = boardHTML({
      board: pos.board,
      theme: theme(),
      orientation: me || 'w',
      selected,
      targets: state.settings.showHints ? targets() : [],
      lastMove: game.lastMove(),
      checkSquare: pos.inCheck() ? pos.findKing(pos.turn) : null,
      danger: [], // no help against a real opponent
      showCoordinates: state.settings.showCoordinates,
    });
    const cap = captured();
    const o = me || 'w';
    root.querySelector('.pb-top').innerHTML = playerBar(other(o), cap);
    root.querySelector('.pb-bottom').innerHTML = playerBar(o, cap);
    tick();
  }

  function status() {
    if (row.status === 'aborted') return `<div class="status">${t('online.end.aborted')}</div>`;
    if (over()) {
      const e = endInfo();
      return `<div class="status">${e.title} · ${e.text}</div>`;
    }
    const offer =
      row.draw_offer && row.draw_offer !== me
        ? `<div class="coach tone-gold draw-offer"><span class="coach-ic">${icon('equal', 20)}</span><p>${t('online.drawOffered', { name: esc((me === 'w' ? row.black_name : row.white_name) || '') })}</p>
            <span class="offer-actions">${pill(t('online.accept'), { size: 'm', attrs: 'data-act="accept-draw"' })}${pill(t('online.decline'), { variant: 'light', size: 'm', attrs: 'data-act="decline-draw"' })}</span></div>`
        : row.draw_offer === me
          ? `<div class="coach"><span class="coach-ic">${icon('equal', 20)}</span><p>${t('online.drawSent')}</p></div>`
          : '';
    const turn = sideToMove(row) === me ? t('online.yourTurn') : t('online.theirTurn');
    const first = row.ply < 2 ? `<p class="small first-move"></p>` : '';
    return `${offer}<div class="coach"><span class="coach-ic">${icon(sideToMove(row) === me ? 'play' : 'clock', 20)}</span><p>${turn}${sending ? '<span class="dots"></span>' : ''}</p></div>${first}`;
  }

  function moveList() {
    const moves = game.sanList();
    if (!moves.length) return `<p class="no-moves">${t('game.noMoves')}</p>`;
    let html = '';
    for (let i = 0; i < moves.length; i += 2) {
      html += `<li><span class="mn">${i / 2 + 1}.</span><span class="mv">${esc(moves[i])}</span><span class="mv">${esc(moves[i + 1] ?? '')}</span></li>`;
    }
    return `<ol class="moves-ol">${html}</ol>`;
  }

  function drawPanel() {
    if (!root || !row) return;
    root.querySelector('.coach-slot').innerHTML = status();
    const mb = root.querySelector('.moves-box');
    mb.innerHTML = moveList();
    mb.scrollTop = mb.scrollHeight;
    const action = (ic, label, act, { disabled } = {}) =>
      `<button class="action" data-act="${act}" ${disabled ? 'disabled' : ''}>${icon(ic, 20)}<span>${label}</span></button>`;
    const hints = state.settings.showHints;
    root.querySelector('.actions').innerHTML = over()
      ? [action('search', t('online.newOpponent'), 'again'), action('home', t('end.backHome'), 'home')].join('')
      : [
          action('zap', t(hints ? 'online.dotsOn' : 'online.dotsOff'), 'hints'),
          row.ply < 2
            ? action('x', t('online.abort'), 'abort')
            : action('equal', t('online.offerDraw'), 'offer-draw', { disabled: !!row.draw_offer }),
          action('flag', t('game.resign'), 'resign', { disabled: row.ply < 2 }),
        ].join('');
  }

  function draw() {
    drawBoard();
    drawPanel();
  }

  const layout = `<div class="game-layout">
      <div class="board-col"><div class="pb-top"></div><div class="board-slot"></div><div class="pb-bottom"></div></div>
      <aside class="game-panel">
        <div class="coach-slot"></div>
        <div class="moves-box card"></div>
        <div class="actions"></div>
        <p class="small center">${icon('shield', 13)} ${t('online.serverNote')}</p>
      </aside>
    </div>`;

  return {
    title: t('online.gameTitle'),
    sub: t('online.gameTitle'),
    tab: 'play',
    wide: true,
    noFooter: true,
    cls: 'game-main',
    back: 'online',
    html: `<div class="online-game-slot"><div class="card list" aria-busy="true">${'<div class="list-row skel"><span class="skel-dot"></span><span class="skel-line"></span></div>'.repeat(3)}</div></div>`,
    async mount(el) {
      const slot = el.querySelector('.online-game-slot');
      const blocked = await gate(`online-${id}`);
      if (!alive) return;
      if (blocked) {
        slot.innerHTML = `<div class="narrow">${blocked}</div>`;
        return;
      }
      let first;
      try {
        first = await onlineAction('join', { id });
      } catch (e) {
        if (!alive) return;
        slot.innerHTML = `<div class="narrow">${card(icon('x-circle', 36, 'red'), t('online.unavailable.title'), errText(e.code), pill(t('online.toLobby'), { icon: 'users', attrs: 'data-go="online"' }))}</div>`;
        return;
      }
      if (!alive) return;
      if (first.status === 'waiting') return nav.go('online'); // your own invitation: wait in the lobby
      slot.innerHTML = layout;
      root = slot;
      bindBoard(slot.querySelector('.board-slot'), {
        onSquare,
        canDrag: (sq) => {
          const p = game.pos.board[sq];
          return myTurn() && p && p.color === me;
        },
        onDrop: (from, to) => {
          if (selected === from && !tryMove(from, to)) drawBoard();
        },
      });
      setRow(first);
      draw();
      clockTimer = setInterval(tick, 200);
      schedulePoll();
    },
    unmount() {
      alive = false;
      stopTimers();
      if (row?.status === 'active') toast(t('online.stillRunning'), 6000);
    },
    actions: {
      hints: () => {
        updateSettings({ showHints: !state.settings.showHints });
        draw();
      },
      abort: () => act('abort'),
      resign: askResign,
      'offer-draw': () => act('offer_draw'),
      'accept-draw': () => act('accept_draw'),
      'decline-draw': () => act('decline_draw'),
      again: () => nav.go('online'),
      home: () => nav.go('home'),
    },
  };
}
