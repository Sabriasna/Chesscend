// Chesscend website: navigation (address after #), layout and shared actions.
import { icon } from './icons.js';
import { TABS, avatar, esc, infoModal, logo, closeModal, openModal, pill, tabLabel, tabShort } from './ui.js';
import { clearSavedGame, isPersistent, loadSavedGame, state, updateSettings } from './store.js';
import { LANGS, displayName, lang, setLang, t } from './i18n.js';
import * as P from './pages.js';
import { QUICK } from '../../src/data/timeControls.js';
import { gamePage } from './game.js';
import { lessonPage, puzzlePage } from './boards.js';

const app = document.getElementById('app');
let current = null; // page currently shown
let lastTab = 'home';
let navigated = false;
let pendingGame = null; // config of the next game to start

const TAB_KEYS = TABS.map((tab) => tab.key);

// Language: saved choice, or ?lang=fr / ?lang=es in the address (English by default).
const asked = new URLSearchParams(location.search).get('lang');
if (asked && LANGS.some((l) => l.code === asked)) updateSettings({ lang: asked });
setLang(state.settings.lang);

function changeLanguage(code) {
  if (code === lang()) return;
  updateSettings({ lang: code });
  setLang(code);
  render(true);
}

function languageMenu() {
  const m = openModal(`<div class="sheet-icon">${icon('globe', 34)}</div><h3>${t('lang.title')}</h3>
    <div class="lang-list">${LANGS.map(
      (l) => `<button class="lang-choice ${l.code === lang() ? 'on' : ''}" lang="${l.code}" aria-pressed="${l.code === lang()}" data-l="${l.code}">
        <span class="lang-code">${l.short}</span><span class="grow">${l.name}</span>${l.code === lang() ? icon('check', 18) : ''}</button>`,
    ).join('')}</div>`);
  m.el.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => (m.close(), changeLanguage(b.dataset.l))));
}

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
    pendingGame = saved;
    nav.go('game');
  },
  quick(tc = null) {
    const config = { mode: 'ai', aiLevel: state.settings.preferredLevel, playerColor: 'w', timeControl: tc };
    const saved = loadSavedGame();
    if (!saved) return nav.startGame(config);
    // Never throw away an unfinished game without asking.
    const m = openModal(`<div class="sheet-icon">${icon('play-circle', 34)}</div><h3>${t('unfinished.title')}</h3>
      <p>${t('unfinished.text', { n: saved.moves.length })}</p>
      <div class="sheet-actions">${pill(t('unfinished.resume'), { icon: 'play', attrs: 'data-m="resume"' })}${pill(t('unfinished.new'), { variant: 'light', size: 'm', attrs: 'data-m="new"' })}</div>`);
    m.el.querySelector('[data-m="resume"]').onclick = () => (m.close(), nav.resume());
    m.el.querySelector('[data-m="new"]').onclick = () => (m.close(), nav.startGame(config));
  },
  bell() {
    infoModal('bell', t('bell.title'), t('bell.text'));
  },
  soon(feature) {
    infoModal('rocket', t('soon.title', { feature: t(`soon.feature.${feature}`) }), t('soon.text'));
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
  if (name === 'legal') return P.legalPage();
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
    if (saved) return gamePage(saved);
    return null;
  }
  return null;
}

function header(activeTab) {
  const links = TABS.map(
    (tab) => `<a href="#${tab.key}" class="nav-link ${tab.key === activeTab ? 'on' : ''}" ${tab.key === activeTab ? 'aria-current="page"' : ''}>${icon(tab.icon, 18)}<span>${tabLabel(tab.key)}</span></a>`,
  ).join('');
  const current = LANGS.find((l) => l.code === lang());
  return `<header class="topbar"><div class="topbar-in">
    <button class="round-btn avatar-btn" data-go="profile" aria-label="${t('aria.profile')}">${avatar(displayName(state.settings.playerName), 44)}</button>
    <a href="#home" class="brand" aria-label="${t('aria.home')}">${logo()}</a>
    <nav class="nav-links" aria-label="${t('aria.mainNav')}">${links}</nav>
    <div class="top-actions">
      <button class="lang-btn" data-act="lang-menu" aria-label="${t('lang.button', { name: current.name })}">${icon('globe', 18)}<span>${current.short}</span></button>
      <button class="round-btn ghost" data-act="bell" aria-label="${t('aria.notifications')}">${icon('bell', 22)}</button>
      <button class="round-btn avatar-desk" data-go="profile" aria-label="${t('aria.profile')}">${avatar(displayName(state.settings.playerName), 40)}</button>
    </div>
  </div></header>`;
}

function backBar(title, right = '') {
  return `<div class="backbar"><button class="back-btn" data-act="back" aria-label="${t('aria.back')}">${icon('chevron-left', 24)}</button>
    <span class="back-title">${esc(title)}</span><span class="back-right">${right}</span></div>`;
}

function tabBar(activeTab) {
  return `<nav class="tabbar" aria-label="${t('aria.tabs')}">${TABS.map(
    (tab) =>
      `<a href="#${tab.key}" class="tab ${tab.key === activeTab ? 'on' : ''}" ${tab.key === activeTab ? 'aria-current="page"' : ''}><span class="tab-ic">${icon(tab.icon, 22)}</span><span class="tab-label">${tabShort(tab.key)}</span></a>`,
  ).join('')}</nav>`;
}

const footer = () => `<footer class="footer"><div class="footer-in">
  <div>${logo()}<p class="tag">${t('brand.tagline')}</p></div>
  <div class="footer-links">${TABS.map((tab) => `<a href="#${tab.key}">${tabLabel(tab.key)}</a>`).join('')}<a href="#profile">${t('footer.settings')}</a><a href="#legal">${t('legal.title')}</a></div>
  <div class="footer-app">${icon('smartphone', 20)}<span>${t('footer.app')}</span></div>
  <div class="footer-lang" role="group" aria-label="${t('lang.title')}">${icon('globe', 16)}${LANGS.map((l) => `<button class="${l.code === lang() ? 'on' : ''}" lang="${l.code}" aria-pressed="${l.code === lang()}" data-act="set-lang" data-arg="${l.code}">${l.name}</button>`).join('')}</div>
</div><p class="copy">© ${new Date().getFullYear()} Chesscend · <a class="text-link" href="#legal">${t('legal.title')}</a> · ${t('footer.local')}${isPersistent() ? '' : ` <b>${t('footer.blocked')}</b>`}</p></footer>`;

function render(keepScroll = false) {
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
  document.title = name !== 'home' && page.title ? `${page.title} · Chesscend` : `Chesscend · ${t('brand.title')}`;
  app.innerHTML = `${header(activeTab)}
    <main class="main ${page.cls ?? ''}">${page.sub ? backBar(page.sub, page.backRight ?? '') : ''}${page.html}</main>
    ${page.noFooter ? '' : footer()}
    ${isTab ? tabBar(activeTab) : ''}`;
  if (keepScroll !== true) window.scrollTo(0, 0);
  page.mount?.(app.querySelector('.main'));
  // Move keyboard / screen-reader focus to the new page, like a real page load.
  if (navigated) app.querySelector('.main h1, .main .back-title')?.setAttribute('tabindex', '-1');
  if (navigated) app.querySelector('.main h1, .main .back-title')?.focus({ preventScroll: true });
  navigated = true;
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
  if (act === 'lang-menu') return languageMenu();
  if (act === 'set-lang') return changeLanguage(arg);
  if (act === 'bell') return nav.bell();
  if (act === 'soon') return nav.soon(arg);
  if (act === 'resume') return nav.resume();
  if (act === 'quick') return nav.quick(arg ? QUICK[arg].tc : null);
});

window.addEventListener('hashchange', () => render());
render();
