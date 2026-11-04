import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_PROGRESS, DEFAULT_SETTINGS, DEFAULT_STATS,
  loadProgress, loadSettings, loadStats, saveProgress, saveSettings, saveStats,
} from '../storage/storage';
import { getTheme } from '../theme/themes';

// Approximate strength of each computer level, used for the local rating.
export const BOT_RATING = { 1: 500, 2: 850, 3: 1200, 4: 1600 };

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [progress, setProgress] = useState(DEFAULT_PROGRESS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([loadSettings(), loadStats(), loadProgress()]).then(([s, st, p]) => {
      setSettings(s);
      setStats(st);
      setProgress(p);
      setReady(true);
    });
  }, []);

  const updateSettings = (patch) =>
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });

  /** Records a finished game. Only games against the computer change the rating. */
  const recordGame = ({ result, mode, level, reason, moves }) =>
    setStats((prev) => {
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
      const next = { rating, games: [game, ...prev.games].slice(0, 200) };
      saveStats(next);
      return next;
    });

  const markLesson = (id) =>
    setProgress((prev) => {
      if (prev.lessonsDone.includes(id)) return prev;
      const next = { ...prev, lessonsDone: [...prev.lessonsDone, id] };
      saveProgress(next);
      return next;
    });

  const markPuzzle = (id) =>
    setProgress((prev) => {
      if (prev.puzzlesSolved.includes(id)) return prev;
      const next = { ...prev, puzzlesSolved: [...prev.puzzlesSolved, id] };
      saveProgress(next);
      return next;
    });

  return (
    <AppContext.Provider
      value={{
        ready, settings, updateSettings, theme: getTheme(settings.themeId),
        stats, recordGame, progress, markLesson, markPuzzle,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

/** Summary numbers used by Home, Play and Ranking. */
export function summarize(stats) {
  const g = stats.games.filter((x) => x.mode === 'ai');
  const wins = g.filter((x) => x.result === 'win').length;
  const losses = g.filter((x) => x.result === 'loss').length;
  const draws = g.filter((x) => x.result === 'draw').length;
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const week = g.filter((x) => x.date >= weekAgo).reduce((s, x) => s + (x.change || 0), 0);
  return {
    played: g.length,
    friendGames: stats.games.length - g.length,
    wins,
    losses,
    draws,
    winRate: g.length ? Math.round((wins / g.length) * 100) : 0,
    week,
  };
}
