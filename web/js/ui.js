// Building blocks of the site (same look as the app's components).
import { icon } from './icons.js';
import { fileOf, rowOf } from '../../src/engine/chess.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'play', label: 'Play', icon: 'play' },
  { key: 'ranking', label: 'Ranking', icon: 'bar-chart-2' },
  { key: 'community', label: 'Community', icon: 'users' },
  { key: 'learn', label: 'Learn', icon: 'book-open' },
];

// ︎ forces the "text" look (otherwise some phones draw an emoji).
const FILLED = { k: '♚︎', q: '♛︎', r: '♜︎', b: '♝︎', n: '♞︎', p: '♟︎' };
const HOLLOW = { k: '♔︎', q: '♕︎', r: '♖︎', b: '♗︎', n: '♘︎', p: '♙︎' };

export const logo = () => `<span class="logo">${icon('crown', 30)}<span>Chesscend</span></span>`;

export const initial = (name) => esc((name || 'P').trim().charAt(0).toUpperCase() || 'P');

export function avatar(name, size = 52, ring = '') {
  return `<span class="avatar" style="--s:${size}px;${ring ? `box-shadow:0 0 0 3px ${ring}` : ''}">${initial(name)}</span>`;
}

/** Decorative golden piece. */
export const goldPiece = (type, size = 110) =>
  `<span class="gold-piece" style="font-size:${size}px" aria-hidden="true">${FILLED[type]}</span>`;

/** Group of golden pieces on a soft glow, like the app's header art. */
export function goldScene(pieces = ['n', 'k'], size = 110) {
  const list = pieces
    .map((p, i) => {
      const s = i === pieces.length - 1 ? size : Math.round(size * 0.78);
      return `<span style="margin-left:${i === 0 ? 0 : -size * 0.22}px">${goldPiece(p, s)}</span>`;
    })
    .join('');
  return `<div class="gold-scene" aria-hidden="true"><div class="glow-disc" style="width:${size * 2.2}px;height:${size * 0.5}px"></div><div class="gold-row">${list}</div></div>`;
}

export function hero(title, subtitle, pieces = ['n'], size = 110) {
  return `<section class="hero">
    <div class="hero-text"><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
    ${goldScene(pieces, size)}
  </section>`;
}

/** Button helper. attrs: extra HTML attributes (data-act…). */
export function pill(label, { icon: ic, variant = 'dark', size = 'l', attrs = '', disabled = false, cls = '' } = {}) {
  return `<button class="pill pill-${variant} pill-${size} ${cls}" ${attrs} ${disabled ? 'disabled' : ''}>${ic ? icon(ic, size === 'l' ? 22 : 16) : ''}<span>${esc(label)}</span></button>`;
}

export function tile({ ic, glyph, label, sub, dark, soon, attrs = '' }) {
  const art = glyph ? `<span class="tile-glyph">${FILLED[glyph]}</span>` : icon(ic, 28);
  return `<button class="tile ${dark ? 'tile-dark' : 'card'} ${soon ? 'is-soon' : ''}" ${attrs}>
    ${art}<span class="tile-label">${esc(label)}</span>${sub ? `<span class="tile-sub">${esc(sub)}</span>` : ''}
    ${soon ? badge('Soon', 'gold', 'corner') : ''}
  </button>`;
}

export const badge = (label, tone = 'gold', cls = '') => `<span class="badge badge-${tone} ${cls}">${esc(label)}</span>`;

export function sectionHeader(title, action, attrs = '') {
  return `<div class="section-head"><h2>${esc(title)}</h2>${
    action ? `<button class="link-btn" ${attrs}>${esc(action)} ${icon('chevron-right', 18)}</button>` : ''
  }</div>`;
}

/** items: [{ key, label, disabled }] */
export function segmented(items, value, act) {
  return `<div class="segment">${items
    .map(
      (it) =>
        `<button class="seg ${it.key === value ? 'on' : ''}" data-act="${act}" data-arg="${it.key}" ${it.disabled ? 'disabled' : ''}>${esc(it.label)}${it.disabled ? icon('lock', 12) : ''}</button>`,
    )
    .join('')}</div>`;
}

export const progressBar = (value) =>
  `<div class="track"><div class="fill" style="width:${Math.max(0, Math.min(100, value))}%"></div></div>`;

/* ---------------------------------------------------------------- Pieces & board */

export function piece(type, color, theme) {
  const fill = color === 'w' ? theme.whitePiece : theme.blackPiece;
  const outline = color === 'w' ? theme.pieceOutline : 'rgba(255,255,255,0.32)';
  return `<span class="piece"><span class="pf" style="color:${fill}">${FILLED[type]}</span><span class="po" style="color:${outline}">${HOLLOW[type]}</span></span>`;
}

const FILES = 'abcdefgh';

/**
 * Board HTML. opts: board, theme, orientation, selected, targets, lastMove, checkSquare, danger, showCoordinates
 */
export function boardHTML(o) {
  const t = o.theme;
  const cells = [];
  for (let vr = 0; vr < 8; vr++) {
    for (let vf = 0; vf < 8; vf++) {
      const index = o.orientation === 'w' ? vr * 8 + vf : (7 - vr) * 8 + (7 - vf);
      const p = o.board[index];
      const light = (fileOf(index) + rowOf(index)) % 2 === 0;
      const isLast = o.lastMove && (o.lastMove.from === index || o.lastMove.to === index);
      const isTarget = o.targets.includes(index);
      let inner = '';
      if (isLast) inner += '<span class="ov ov-last"></span>';
      if (o.selected === index) inner += '<span class="ov ov-sel"></span>';
      if (o.checkSquare === index) inner += '<span class="ov ov-check"></span>';
      if (o.danger.includes(index)) inner += '<span class="ov ov-danger"></span>';
      if (o.showCoordinates && vf === 0) inner += `<span class="coord rank">${8 - rowOf(index)}</span>`;
      if (o.showCoordinates && vr === 7) inner += `<span class="coord file">${FILES[fileOf(index)]}</span>`;
      if (p) inner += piece(p.type, p.color, t);
      if (isTarget) inner += p ? '<span class="ov ov-ring"></span>' : '<span class="ov ov-dot"><i></i></span>';
      cells.push(`<div class="sq ${light ? 'l' : 'd'}" data-sq="${index}">${inner}</div>`);
    }
  }
  const vars = `--light:${t.light};--dark:${t.dark};--frame:${t.frame};--last:${t.lastMove};--sel:${t.selected};--hint:${t.hint};--check:${t.check};--danger:${t.danger}`;
  return `<div class="board-frame" style="${vars}"><div class="board">${cells.join('')}</div></div>`;
}

/**
 * Click and drag on a board element.
 * h.onSquare(sq): a square was clicked. h.canDrag(sq): may this piece be dragged? h.onDrop(from, to).
 */
export function bindBoard(root, h) {
  const boardEl = () => root.querySelector('.board');
  const sqFromPoint = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest?.('.sq');
    return el && root.contains(el) ? +el.dataset.sq : null;
  };
  root.onpointerdown = (e) => {
    const cell = e.target.closest('.sq');
    if (!cell || (e.button !== undefined && e.button !== 0)) return;
    e.preventDefault();
    const sq = +cell.dataset.sq;
    h.onSquare(sq);
    if (!h.canDrag || !h.canDrag(sq)) return;
    const pieceEl = boardEl()?.querySelector(`[data-sq="${sq}"] .piece`);
    if (!pieceEl) return;
    const rect = pieceEl.getBoundingClientRect();
    let ghost = null;
    const startX = e.clientX;
    const startY = e.clientY;
    const move = (ev) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 6) return;
        ghost = pieceEl.cloneNode(true);
        ghost.className = 'piece ghost';
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.fontSize = getComputedStyle(pieceEl).fontSize;
        document.body.appendChild(ghost);
        boardEl()?.querySelector(`[data-sq="${sq}"] .piece`)?.classList.add('lifted');
      }
      ghost.style.transform = `translate(${ev.clientX - rect.width / 2}px, ${ev.clientY - rect.height / 2}px) scale(1.12)`;
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!ghost) return;
      ghost.remove();
      const to = sqFromPoint(ev.clientX, ev.clientY);
      boardEl()?.querySelector('.lifted')?.classList.remove('lifted');
      if (to !== null && to !== sq) h.onDrop(sq, to);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
}

/* ---------------------------------------------------------------- Modals */

let modalClose = null;

/** Shows a centered sheet. Returns a function that closes it. */
export function openModal(html, { dismissable = true, onClose } = {}) {
  closeModal();
  const wrap = document.createElement('div');
  wrap.className = 'backdrop';
  wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  const close = () => {
    if (!wrap.isConnected) return;
    wrap.remove();
    document.removeEventListener('keydown', key);
    modalClose = null;
    onClose?.();
  };
  const key = (e) => e.key === 'Escape' && dismissable && close();
  document.addEventListener('keydown', key);
  if (dismissable) wrap.addEventListener('click', (e) => e.target === wrap && close());
  modalClose = close;
  return { el: wrap, close };
}
export const closeModal = () => modalClose?.();

export function infoModal(ic, title, text) {
  const m = openModal(`<div class="sheet-icon">${icon(ic, 34)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>
    ${pill('Got it', { size: 'm', cls: 'block', attrs: 'data-close' })}`);
  m.el.querySelector('[data-close]').onclick = m.close;
}
