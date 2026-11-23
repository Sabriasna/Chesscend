// Saved data (settings, stats, lesson progress, unfinished game) in this browser.
// Same keys as the mobile app. Data is never deleted: unreadable data is kept aside
// under a backup key, and old saves are upgraded in place (see migrate()).
import { getTheme } from '../../src/theme/themes.js';

export const BOT_RATING = { 1: 500, 2: 850, 3: 1200, 4: 1600 };
export const DATA_VERSION = 2;

const DEFAULT_SETTINGS = {
  playerName: 'Player',
  themeId: 'wood',
  showHints: true,
  showCoordinates: true,
  autoFlip: false,
  haptics: true,
  preferredLevel: 2,
  lang: 'en', // English by default; 'fr' and 'es' available
};
const DEFAULT_STATS = { rating: 800, games: [] };
const DEFAULT_PROGRESS = { lessonsDone: [], puzzlesSolved: [] };

export const KEYS = {
  settings: 'chesscend:settings',
  game: 'chesscend:savedGame',
  stats: 'chesscend:stats',
  progress: 'chesscend:progress',
  version: 'chesscend:version',
};

/* ---------------------------------------------------------------- raw storage */

const memory = {};
let persistent = true; // false when the browser refuses storage (private mode, blocked cookies…)

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
function readRaw(key) {
  const ls = storage();
  if (ls) {
    try {
      return ls.getItem(key);
    } catch {
      persistent = false;
    }
  } else persistent = false;
  return memory[key] ?? null;
}
function writeRaw(key, value) {
  memory[key] = value;
  const ls = storage();
  if (!ls) {
    persistent = false;
    return false;
  }
  try {
    if (value === null) ls.removeItem(key);
    else ls.setItem(key, value);
    return true;
  } catch {
    persistent = false; // full or blocked: keep working in memory
    return false;
  }
}
/** Keeps unreadable data aside instead of overwriting it. */
function backup(key, raw) {
  writeRaw(`${key}:backup-${Date.now()}`, raw);
}
function parse(key) {
  const raw = readRaw(key);
  if (raw === null || raw === undefined) return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    backup(key, raw);
    return { ok: false, value: null };
  }
}
const write = (key, value) => writeRaw(key, JSON.stringify(value));

/* ---------------------------------------------------------------- validation */

const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const num = (x, fallback) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);
const ids = (x) => (Array.isArray(x) ? [...new Set(x.filter((v) => typeof v === 'string'))] : []);

export function cleanSettings(v) {
  const s = { ...DEFAULT_SETTINGS };
  if (!isObj(v)) return s;
  if (typeof v.playerName === 'string') s.playerName = v.playerName.slice(0, 20) || 'Player';
  if (typeof v.themeId === 'string') s.themeId = v.themeId;
  for (const k of ['showHints', 'showCoordinates', 'autoFlip', 'haptics']) if (typeof v[k] === 'boolean') s[k] = v[k];
  if ([1, 2, 3, 4].includes(v.preferredLevel)) s.preferredLevel = v.preferredLevel;
  if (['en', 'fr', 'es'].includes(v.lang)) s.lang = v.lang;
  return s;
}

const RESULTS = ['win', 'loss', 'draw', 'white', 'black'];
export function cleanStats(v) {
  if (!isObj(v)) return { ...DEFAULT_STATS, games: [] };
  const rating = Math.max(100, Math.round(num(v.rating, DEFAULT_STATS.rating)));
  const games = (Array.isArray(v.games) ? v.games : [])
    .filter((g) => isObj(g) && RESULTS.includes(g.result) && (g.mode === 'ai' || g.mode === 'local'))
    .map((g) => ({
      ...g,
      level: g.mode === 'ai' ? ([1, 2, 3, 4].includes(g.level) ? g.level : 2) : g.level,
      moves: num(g.moves, 0),
      change: num(g.change, 0),
      date: num(g.date, 0),
      rated: g.rated !== false, // games saved before version 2 were all rated
    }));
  // Version 2 keeps the rating after each game, to draw the progression.
  // For older games it is rebuilt from the current rating and the recorded changes.
  let after = rating;
  for (const g of games) {
    if (g.mode !== 'ai') continue;
    if (typeof g.ratingAfter !== 'number') g.ratingAfter = after;
    after = g.ratingAfter - (g.rated ? g.change : 0);
  }
  return { rating, games: games.slice(0, 200) };
}

export function cleanProgress(v) {
  if (!isObj(v)) return { lessonsDone: [], puzzlesSolved: [] };
  return { lessonsDone: ids(v.lessonsDone), puzzlesSolved: ids(v.puzzlesSolved) };
}

/** A saved game is usable only if its config and move list look right. */
export function cleanSavedGame(v) {
  if (!isObj(v) || !isObj(v.config) || !Array.isArray(v.moves)) return null;
  const c = v.config;
  if (c.mode !== 'ai' && c.mode !== 'local') return null;
  if (!v.moves.every((m) => typeof m === 'string')) return null;
  const tc = isObj(c.timeControl) ? { minutes: num(c.timeControl.minutes, 10), increment: num(c.timeControl.increment, 0) } : null;
  const config = {
    mode: c.mode,
    aiLevel: [1, 2, 3, 4].includes(c.aiLevel) ? c.aiLevel : 2,
    playerColor: c.playerColor === 'b' ? 'b' : 'w',
    timeControl: tc,
  };
  let clocks = null;
  if (tc) {
    const full = tc.minutes * 60000;
    clocks = isObj(v.clocks) ? { w: Math.max(0, num(v.clocks.w, full)), b: Math.max(0, num(v.clocks.b, full)) } : { w: full, b: full };
  }
  const clockHistory = tc && Array.isArray(v.clockHistory) && v.clockHistory.length === v.moves.length ? v.clockHistory : null;
  return { config, moves: v.moves, clocks, clockHistory, assisted: !!v.assisted, savedAt: num(v.savedAt, 0) };
}

/* ---------------------------------------------------------------- load + migrate */

export function migrate() {
  const v = parse(KEYS.version).value;
  const from = typeof v === 'number' ? v : 1;
  if (from < DATA_VERSION) {
    // v1 → v2: games get "rated" and "ratingAfter". Nothing is removed.
    const st = parse(KEYS.stats);
    if (st.ok && st.value) write(KEYS.stats, cleanStats(st.value));
    write(KEYS.version, DATA_VERSION);
  }
}

export const state = {};
export function load() {
  migrate();
  state.settings = cleanSettings(parse(KEYS.settings).value);
  state.stats = cleanStats(parse(KEYS.stats).value);
  state.progress = cleanProgress(parse(KEYS.progress).value);
}
load();

export const isPersistent = () => persistent;
export const theme = () => getTheme(state.settings.themeId);

export function updateSettings(patch) {
  state.settings = cleanSettings({ ...state.settings, ...patch });
  write(KEYS.settings, state.settings);
}

/**
 * Records a finished game. Only rated games against the computer change the Computer Rating
 * (a game where a move was taken back is "unrated").
 */
export function recordGame({ result, mode, level, reason, moves, rated = true }) {
  const prev = state.stats;
  let rating = prev.rating;
  let change = 0;
  const counts = mode === 'ai' && rated;
  if (counts) {
    const opp = BOT_RATING[level] ?? 1000;
    const expected = 1 / (1 + Math.pow(10, (opp - rating) / 400));
    const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    const next = Math.max(100, rating + Math.round(32 * (score - expected)));
    change = next - rating;
    rating = next;
  }
  const game = { result, mode, level, reason, moves, change, rated: counts, date: Date.now() };
  if (mode === 'ai') game.ratingAfter = rating;
  state.stats = { rating, games: [game, ...prev.games].slice(0, 200) };
  write(KEYS.stats, state.stats);
  return game;
}

export function markLesson(id) {
  if (state.progress.lessonsDone.includes(id)) return;
  state.progress = { ...state.progress, lessonsDone: [...state.progress.lessonsDone, id] };
  write(KEYS.progress, state.progress);
}

export function markPuzzle(id) {
  if (state.progress.puzzlesSolved.includes(id)) return;
  state.progress = { ...state.progress, puzzlesSolved: [...state.progress.puzzlesSolved, id] };
  write(KEYS.progress, state.progress);
}

export function loadSavedGame() {
  const r = parse(KEYS.game);
  if (!r.value) return null;
  const g = cleanSavedGame(r.value);
  if (!g) backup(KEYS.game, readRaw(KEYS.game));
  return g;
}
export const saveGame = (g) => write(KEYS.game, g);
export const clearSavedGame = () => writeRaw(KEYS.game, null);
/** Keeps a saved game that could not be replayed, then clears it. */
export function discardBrokenGame() {
  const raw = readRaw(KEYS.game);
  if (raw) backup(KEYS.game, raw);
  clearSavedGame();
}

/** Summary numbers used by Home, Play and Ranking (Computer Rating only). */
export function summarize(stats = state.stats) {
  const g = stats.games.filter((x) => x.mode === 'ai');
  const wins = g.filter((x) => x.result === 'win').length;
  const losses = g.filter((x) => x.result === 'loss').length;
  const draws = g.filter((x) => x.result === 'draw').length;
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const week = g.filter((x) => x.date >= weekAgo && x.rated).reduce((s, x) => s + (x.change || 0), 0);
  const best = g.reduce((m, x) => Math.max(m, x.ratingAfter ?? 0), stats.rating);
  return {
    played: g.length,
    friendGames: stats.games.length - g.length,
    wins,
    losses,
    draws,
    winRate: g.length ? Math.round((wins / g.length) * 100) : 0,
    week,
    best,
  };
}

/** Computer Rating after each game, oldest first, starting from the first known value. */
export function ratingHistory(stats = state.stats) {
  const ai = stats.games.filter((g) => g.mode === 'ai' && typeof g.ratingAfter === 'number').reverse();
  if (!ai.length) return [];
  const first = ai[0].ratingAfter - (ai[0].rated ? ai[0].change : 0);
  return [first, ...ai.map((g) => g.ratingAfter)];
}
