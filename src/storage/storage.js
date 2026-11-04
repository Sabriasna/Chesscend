import AsyncStorage from '@react-native-async-storage/async-storage';
export const DEFAULT_SETTINGS = {
    themeId: 'bois',
    showHints: true,
    showCoordinates: true,
    autoFlip: false,
    haptics: true,
};
const SETTINGS_KEY = 'echecs:settings';
const GAME_KEY = 'echecs:savedGame';
export async function loadSettings() {
    try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    }
    catch {
        return DEFAULT_SETTINGS;
    }
}
export async function saveSettings(s) {
    try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    }
    catch {
        // stockage indisponible : on ignore
    }
}
export async function loadSavedGame() {
    try {
        const raw = await AsyncStorage.getItem(GAME_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
export async function saveGame(g) {
    try {
        await AsyncStorage.setItem(GAME_KEY, JSON.stringify(g));
    }
    catch {
        // ignore
    }
}
export async function clearSavedGame() {
    try {
        await AsyncStorage.removeItem(GAME_KEY);
    }
    catch {
        // ignore
    }
}
