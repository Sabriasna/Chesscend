// Building blocks of the site (same look as the app's components).
import { icon } from './icons.js';
import { fileOf, rowOf, squareName } from '../../src/engine/chess.js';
import { t } from './i18n.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const TABS = [
  { key: 'home', icon: 'home' },
  { key: 'play', icon: 'play' },
  { key: 'ranking', icon: 'bar-chart-2' },
  { key: 'community', icon: 'users' },
  { key: 'learn', icon: 'book-open' },
];
export const tabLabel = (key) => t(`nav.${key}`);
/** Shorter label for the phone tab bar, when a language needs one. */
export const tabShort = (key) => { const v = t(`nav.short.${key}`); return v.startsWith('nav.short.') ? tabLabel(key) : v; };

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
    ${soon ? `${badge(t('common.soon'), 'gold', 'corner')}<span class="sr-only">, ${t('common.notAvailable')}</span>` : ''}
  </button>`;
}

export const badge = (label, tone = 'gold', cls = '') => `<span class="badge badge-${tone} ${cls}">${esc(label)}</span>`;

export function sectionHeader(title, action, attrs = '') {
  return `<div class="section-head"><h2>${esc(title)}</h2>${
    action ? `<button class="link-btn" ${attrs}>${esc(action)} ${icon('chevron-right', 18)}</button>` : ''
  }</div>`;
}

/** items: [{ key, label, disabled }] */
export function segmented(items, value, act, label = '') {
  const tabs = !!label; // used as tabs (Ranking) or as a choice (Custom Game)
  return `<div class="segment" role="${tabs ? 'tablist' : 'group'}" ${label ? `aria-label="${esc(label)}"` : ''}>${items
    .map((it) => {
      const on = it.key === value;
      const state = tabs ? `role="tab" aria-selected="${on}"` : `aria-pressed="${on}"`;
      return `<button class="seg ${on ? 'on' : ''}" ${state} data-act="${act}" data-arg="${it.key}" ${it.disabled ? 'disabled' : ''}>${esc(it.label)}${it.disabled ? icon('lock', 12) : ''}</button>`;
    })
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
  const th = o.theme;
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
      if (p) inner += piece(p.type, p.color, th);
      if (isTarget) inner += p ? '<span class="ov ov-ring"></span>' : '<span class="ov ov-dot"><i></i></span>';
      // Spoken description for screen readers (never only a colour).
      let label = squareName(index);
      if (p) label += `, ${t(`sq.piece.${p.color}`, { piece: t(`piece.${p.type}`).toLowerCase() })}`;
      if (o.selected === index) label += `, ${t('sq.selected')}`;
      if (isTarget) label += `, ${t(p ? 'sq.capture' : 'sq.move')}`;
      if (o.checkSquare === index) label += `, ${t('sq.check')}`;
      if (o.danger.includes(index)) label += `, ${t('sq.danger')}`;
      if (isLast) label += `, ${t('sq.last')}`;
      const focusable = index === (o.selected ?? (o.orientation === 'w' ? 52 : 12));
      cells.push(
        `<div class="sq ${light ? 'l' : 'd'}" data-sq="${index}" role="gridcell" aria-label="${label}" tabindex="${focusable ? 0 : -1}">${inner}</div>`,
      );
    }
  }
  const vars = `--light:${th.light};--dark:${th.dark};--frame:${th.frame};--last:${th.lastMove};--sel:${th.selected};--hint:${th.hint};--check:${th.check};--danger:${th.danger}`;
  const rowsHtml = [];
  for (let r = 0; r < 8; r++) rowsHtml.push(`<div class="brow" role="row">${cells.slice(r * 8, r * 8 + 8).join('')}</div>`);
  return `<div class="board-frame" style="${vars}"><div class="board" role="grid" aria-label="${t('sq.board')}">${rowsHtml.join('')}</div></div>`;
}

/**
 * Click and drag on a board element.
 * h.onSquare(sq): a square was clicked. h.canDrag(sq): may this piece be dragged? h.onDrop(from, to).
 */
export function bindBoard(root, h) {
  const boardEl = () => root.querySelector('.board');
  // Keyboard: arrows move between squares, Enter / Space acts like a click.
  let kbSq = null;
  const cellAt = (sq) => root.querySelector(`[data-sq="${sq}"]`);
  const focusSq = (sq) => {
    root.querySelectorAll('.sq[tabindex="0"]').forEach((c) => c.setAttribute('tabindex', '-1'));
    const c = cellAt(sq);
    if (!c) return;
    c.setAttribute('tabindex', '0');
    c.focus({ preventScroll: true });
    kbSq = sq;
  };
  // The board is redrawn after each move: keep the keyboard focus on the same square.
  new MutationObserver(() => {
    if (kbSq === null) return;
    const active = document.activeElement;
    if (active && root.contains(active)) return;
    if (!active || active === document.body) focusSq(kbSq);
  }).observe(root, { childList: true });
  root.onkeydown = (e) => {
    const cell = e.target.closest?.('.sq');
    if (!cell) return;
    const cells = [...root.querySelectorAll('.sq')];
    const i = cells.indexOf(cell);
    const moveBy = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 }[e.key];
    if (moveBy !== undefined) {
      e.preventDefault();
      const j = i + moveBy;
      if (j < 0 || j > 63 || (Math.abs(moveBy) === 1 && Math.floor(j / 8) !== Math.floor(i / 8))) return;
      focusSq(+cells[j].dataset.sq);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      kbSq = +cell.dataset.sq;
      h.onSquare(kbSq);
      focusSq(kbSq);
    }
  };
  root.addEventListener('focusout', (e) => {
    if (!root.contains(e.relatedTarget) && e.relatedTarget) kbSq = null;
  });
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
  wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" tabindex="-1">${html}</div>`;
  const opener = document.activeElement;
  document.body.appendChild(wrap);
  const sheet = wrap.querySelector('.sheet');
  const title = sheet.querySelector('h3');
  if (title) {
    title.id = `dlg-${Date.now()}`;
    sheet.setAttribute('aria-labelledby', title.id);
  }
  requestAnimationFrame(() => {
    wrap.classList.add('show');
    (sheet.querySelector('button') ?? sheet).focus({ preventScroll: true });
  });
  const close = () => {
    if (!wrap.isConnected) return;
    wrap.remove();
    document.removeEventListener('keydown', key);
    modalClose = null;
    onClose?.();
    if (opener?.isConnected) opener.focus?.({ preventScroll: true });
  };
  const key = (e) => {
    if (e.key === 'Escape' && dismissable) close();
    if (e.key === 'Tab') {
      // Keep the keyboard inside the dialog
      const items = [...sheet.querySelectorAll('button, a[href], input')];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', key);
  if (dismissable) wrap.addEventListener('click', (e) => e.target === wrap && close());
  modalClose = close;
  return { el: wrap, close };
}
export const closeModal = () => modalClose?.();

export function infoModal(ic, title, text) {
  const m = openModal(`<div class="sheet-icon">${icon(ic, 34)}</div><h3>${esc(title)}</h3><p>${esc(text)}</p>
    ${pill(t('common.gotIt'), { size: 'm', cls: 'block', attrs: 'data-close' })}`);
  m.el.querySelector('[data-close]').onclick = m.close;
}

/** Short message at the bottom of the screen (also read by screen readers). */
export function toast(text, ms = 4200) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}
