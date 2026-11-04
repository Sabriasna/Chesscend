import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../storage/storage';
import { getTheme } from '../theme/themes';
const SettingsContext = createContext({
    settings: DEFAULT_SETTINGS,
    theme: getTheme(DEFAULT_SETTINGS.themeId),
    ready: false,
    update: () => { },
});
export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [ready, setReady] = useState(false);
    useEffect(() => {
        loadSettings().then((s) => {
            setSettings(s);
            setReady(true);
        });
    }, []);
    const update = (patch) => {
        setSettings((prev) => {
            const next = { ...prev, ...patch };
            saveSettings(next);
            return next;
        });
    };
    return (<SettingsContext.Provider value={{ settings, theme: getTheme(settings.themeId), ready, update }}>
      {children}
    </SettingsContext.Provider>);
}
export const useSettings = () => useContext(SettingsContext);
