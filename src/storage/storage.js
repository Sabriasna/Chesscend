import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_SETTINGS = {
  playerName: 'Player',
  themeId: 'wood',
  showHints: true,
  showCoordinates: true,
  autoFlip: false,
  haptics: true,
  preferredLevel: 2,
};

export const DEFAULT_STATS = {
  rating: 800,
  games: [], // { result: 'win'|'loss'|'draw', mode, level, reason, moves, date }
};

export const DEFAULT_PROGRESS = {
  lessonsDone: [],
  puzzlesSolved: [],
};

const KEYS = {
  settings: 'chesscend:settings',
  game: 'chesscend:savedGame',
  stats: 'chesscend:stats',
  progress: 'chesscend:progress',
};

async function read(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

async function write(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: ignore
  }
}

export const loadSettings = () => read(KEYS.settings, DEFAULT_SETTINGS);
export const saveSettings = (s) => write(KEYS.settings, s);
export const loadStats = () => read(KEYS.stats, DEFAULT_STATS);
export const saveStats = (s) => write(KEYS.stats, s);
export const loadProgress = () => read(KEYS.progress, DEFAULT_PROGRESS);
export const saveProgress = (p) => write(KEYS.progress, p);

export async function loadSavedGame() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.game);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export const saveGame = (g) => write(KEYS.game, g);
export async function clearSavedGame() {
  try {
    await AsyncStorage.removeItem(KEYS.game);
  } catch {
    // ignore
  }
}
