// Saved data (settings, stats, lesson progress, unfinished game) in the browser.
// Same structure and keys as the mobile app.
import { getTheme } from '../../src/theme/themes.js';

export const BOT_RATING = { 1: 500, 2: 850, 3: 1200, 4: 1600 };

const DEFAULT_SETTINGS = {
  playerName: 'Player',
  themeId: 'wood',
  showHints: true,
  showCoordinates: true,
  autoFlip: false,
  haptics: true,
  preferredLevel: 2,
};
const DEFAULT_STATS = { rating: 800, games: [] };
const DEFAULT_PROGRESS = { lessonsDone: [], puzzlesSolved: [] };

const KEYS = {
  settings: 'chesscend:settings',
  game: 'chesscend:savedGame',
  stats: 'chesscend:stats',
  progress: 'chesscend:progress',
};

// Works even when the browser blocks storage (private mode…): data then lives in memory.
const memory = {};
function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory[key] ?? null;
  }
}
function writeRaw(key, value) {
  memory[key] = value;
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}
function read(key, fallback) {
  try {
    const raw = readRaw(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}
const write = (key, value) => writeRaw(key, JSON.stringify(value));

export const state = {
  settings: read(KEYS.settings, DEFAULT_SETTINGS),
  stats: read(KEYS.stats, DEFAULT_STATS),
  progress: read(KEYS.progress, DEFAULT_PROGRESS),
};

export const theme = () => getTheme(state.settings.themeId);

export function updateSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  write(KEYS.settings, state.settings);
}

/** Records a finished game. Only games against the computer change the rating. */
export function recordGame({ result, mode, level, reason, moves }) {
  const prev = state.stats;
  let rating = prev.rating;
  let change = 0;
  if (mode === 'ai') {
    const opp = BOT_RATING[level] ?? 1000;
    const expected = 1 / (1 + Math.pow(10, (opp - rating) / 400));
    const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    change = Math.round(32 * (score - expected));
    rating = Math.max(100, rating + change);
  }
  const game = { result, mode, level, reason, moves, change, date: Date.now() };
  state.stats = { rating, games: [game, ...prev.games].slice(0, 200) };
  write(KEYS.stats, state.stats);
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
  try {
    const raw = readRaw(KEYS.game);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export const saveGame = (g) => write(KEYS.game, g);
export const clearSavedGame = () => writeRaw(KEYS.game, null);

/** Summary numbers used by Home, Play and Ranking. */
export function summarize(stats = state.stats) {
  const g = stats.games.filter((x) => x.mode === 'ai');
  const wins = g.filter((x) => x.result === 'win').length;
  const losses = g.filter((x) => x.result === 'loss').length;
  const draws = g.filter((x) => x.result === 'draw').length;
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const week = g.filter((x) => x.date >= weekAgo).reduce((s, x) => s + (x.change || 0), 0);
  return {
    played: g.length,
    wins,
    losses,
    draws,
    winRate: g.length ? Math.round((wins / g.length) * 100) : 0,
    week,
  };
}
