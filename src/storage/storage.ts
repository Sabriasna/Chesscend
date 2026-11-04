import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AiLevel } from '../engine/ai';
import type { Color } from '../engine/chess';

export interface TimeControl {
  minutes: number;
  increment: number; // secondes ajoutées après chaque coup
}

export type GameMode = 'ai' | 'local';

export interface GameConfig {
  mode: GameMode;
  aiLevel: AiLevel;
  /** Couleur du joueur humain en mode IA */
  playerColor: Color;
  timeControl: TimeControl | null;
}

export interface SavedGame {
  config: GameConfig;
  moves: string[]; // coups en notation SAN
  clocks: { w: number; b: number } | null; // millisecondes restantes
  savedAt: number;
}

export interface Settings {
  themeId: string;
  showHints: boolean;
  showCoordinates: boolean;
  autoFlip: boolean; // retourner l'échiquier à chaque tour en mode 2 joueurs
  haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  themeId: 'bois',
  showHints: true,
  showCoordinates: true,
  autoFlip: false,
  haptics: true,
};

const SETTINGS_KEY = 'echecs:settings';
const GAME_KEY = 'echecs:savedGame';

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Settings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // stockage indisponible : on ignore
  }
}

export async function loadSavedGame(): Promise<SavedGame | null> {
  try {
    const raw = await AsyncStorage.getItem(GAME_KEY);
    return raw ? (JSON.parse(raw) as SavedGame) : null;
  } catch {
    return null;
  }
}

export async function saveGame(g: SavedGame) {
  try {
    await AsyncStorage.setItem(GAME_KEY, JSON.stringify(g));
  } catch {
    // ignore
  }
}

export async function clearSavedGame() {
  try {
    await AsyncStorage.removeItem(GAME_KEY);
  } catch {
    // ignore
  }
}
