// Chesscend website: navigation (address after #), layout and shared actions.
import { icon } from './icons.js';
import { TABS, avatar, esc, infoModal, logo, closeModal } from './ui.js';
import { clearSavedGame, loadSavedGame, state } from './store.js';
import * as P from './pages.js';
import { QUICK } from '../../src/data/timeControls.js';
import { gamePage } from './game.js';
import { lessonPage, puzzlePage } from './boards.js';

const app = document.getElementById('app');
let current = null; // page currently shown
let lastTab = 'home';
let pendingGame = null; // config of the next game to start

const TAB_KEYS = TABS.map((t) => t.key);

export const nav = {
  go(name) {
    if (location.hash.slice(1) === name) render();
    else location.hash = name;
  },
  back() {
    nav.go(current?.back ?? lastTab);
  },
  startGame(config) {
    clearSavedGame();
    pendingGame = { config };
    nav.go('game');
  },
  resume() {
    const saved = loadSavedGame();
    if (!saved) return;
    pendingGame = { config: saved.config, moves: saved.moves, clocks: saved.clocks };
    nav.go('game');
  },
  quick(tc = null) {
    nav.startGame({ mode: 'ai', aiLevel: state.settings.preferredLevel, playerColor: 'w', timeControl: tc });
  },
  bell() {
    infoModal('bell', 'No notifications yet', 'Game invitations and friend requests will appear here when online play arrives.');
  },
  soon(feature) {
    infoModal('rocket', `${feature} is coming soon`, 'We are working on it! For now, play against the computer or with a friend on the same device.');
  },
  get saved() {
    return loadSavedGame();
  },
  get lastTab() {
    return lastTab;
  },
};

function route(name) {
  if (TAB_KEYS.includes(name)) {
    lastTab = name;
    return { home: P.homePage, play: P.playPage, ranking: P.rankingPage, community: P.communityPage, learn: P.learnPage }[name]();
  }
  if (name === 'setup') return P.setupPage('ai');
  if (name === 'setup-friend') return P.setupPage('local');
  if (name === 'profile') return P.profilePage();
  if (name.startsWith('course-')) return P.coursePage(name.slice(7));
  if (name.startsWith('lesson-')) return lessonPage(name.slice(7));
  if (name === 'puzzles') return puzzlePage(null);
  if (name.startsWith('puzzle-')) return puzzlePage(name.slice(7));
  if (name === 'game') {
    const g = pendingGame;
    pendingGame = null;
    if (g) return gamePage(g);
    // Page reloaded during a game: pick up the saved game
    const saved = loadSavedGame();
    if (saved) return gamePage({ config: saved.config, moves: saved.moves, clocks: saved.clocks });
    return null;
  }
  return null;
}

function header(activeTab) {
  const links = TABS.map(
    (t) => `<a href="#${t.key}" class="nav-link ${t.key === activeTab ? 'on' : ''}">${icon(t.icon, 18)}<span>${t.label}</span></a>`,
  ).join('');
  return `<header class="topbar"><div class="topbar-in">
    <button class="round-btn avatar-btn" data-go="profile" aria-label="Profile and settings">${avatar(state.settings.playerName, 44)}</button>
    <a href="#home" class="brand" aria-label="Chesscend home">${logo()}</a>
    <nav class="nav-links" aria-label="Main">${links}</nav>
    <div class="top-actions">
      <button class="round-btn ghost" data-act="bell" aria-label="Notifications">${icon('bell', 22)}</button>
      <button class="round-btn avatar-desk" data-go="profile" aria-label="Profile and settings">${avatar(state.settings.playerName, 40)}</button>
    </div>
  </div></header>`;
}

function backBar(title, right = '') {
  return `<div class="backbar"><button class="back-btn" data-act="back" aria-label="Back">${icon('chevron-left', 24)}</button>
    <span class="back-title">${esc(title)}</span><span class="back-right">${right}</span></div>`;
}

function tabBar(activeTab) {
  return `<nav class="tabbar" aria-label="Tabs">${TABS.map(
    (t) =>
      `<a href="#${t.key}" class="tab ${t.key === activeTab ? 'on' : ''}"><span class="tab-ic">${icon(t.icon, 22)}</span><span>${t.label}</span></a>`,
  ).join('')}</nav>`;
}

const footer = () => `<footer class="footer"><div class="footer-in">
  <div>${logo()}<p class="tag">PLAY • LEARN • ASCEND</p></div>
  <div class="footer-links">${TABS.map((t) => `<a href="#${t.key}">${t.label}</a>`).join('')}<a href="#profile">Settings</a></div>
  <div class="footer-app">${icon('smartphone', 20)}<span>The Chesscend app for iPhone and Android is coming soon.</span></div>
</div><p class="copy">© ${new Date().getFullYear()} Chesscend. Your progress is saved in this browser.</p></footer>`;

function render() {
  const name = location.hash.slice(1) || 'home';
  closeModal();
  current?.unmount?.();
  let page = route(name);
  if (!page) {
    history.replaceState(null, '', '#home');
    page = route('home');
  }
  current = page;
  const isTab = !page.sub;
  const activeTab = isTab ? name : page.tab ?? lastTab;
  document.body.classList.toggle('is-sub', !isTab);
  document.body.classList.toggle('is-wide', !!page.wide);
  document.title = page.title ? `${page.title} · Chesscend` : 'Chesscend · Play, learn and ascend at chess';
  app.innerHTML = `${header(activeTab)}
    <main class="main ${page.cls ?? ''}">${page.sub ? backBar(page.sub, page.backRight ?? '') : ''}${page.html}</main>
    ${page.noFooter ? '' : footer()}
    ${isTab ? tabBar(activeTab) : ''}`;
  window.scrollTo(0, 0);
  page.mount?.(app.querySelector('.main'));
}

/* Shared clicks: data-go="page" navigates, data-act="…" runs an action. */
app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-go],[data-act]');
  if (!el || el.disabled) return;
  if (el.dataset.go) {
    nav.go(el.dataset.go);
    return;
  }
  const act = el.dataset.act;
  const arg = el.dataset.arg;
  if (current?.actions?.[act]) return current.actions[act](arg, el);
  if (act === 'back') return nav.back();
  if (act === 'bell') return nav.bell();
  if (act === 'soon') return nav.soon(arg);
  if (act === 'resume') return nav.resume();
  if (act === 'quick') return nav.quick(arg ? QUICK[arg].tc : null);
});

window.addEventListener('hashchange', render);
render();
