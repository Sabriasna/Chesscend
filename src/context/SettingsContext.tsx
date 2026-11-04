import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, Settings, loadSettings, saveSettings } from '../storage/storage';
import { Theme, getTheme } from '../theme/themes';

interface Ctx {
  settings: Settings;
  theme: Theme;
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<Ctx>({
  settings: DEFAULT_SETTINGS,
  theme: getTheme(DEFAULT_SETTINGS.themeId),
  ready: false,
  update: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setReady(true);
    });
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, theme: getTheme(settings.themeId), ready, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
