// Keeps the player's account and this device in step: history, Computer Rating, lessons,
// puzzles and settings. The unfinished game stays on the device.
import * as auth from './auth.js';
import { accountData, cleanProgress, cleanSettings, cleanStats, onDataChange, replaceData, resetToGuest, state, updateSettings } from './store.js';

let status = 'idle'; // idle | syncing | synced | offline | error
let lastSync = 0;
let timer = null;
let dirty = false;
const listeners = new Set();
export const syncStatus = () => ({ status, lastSync });
export const onSyncChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));
function setStatus(s) {
  status = s;
  if (s === 'synced') lastSync = Date.now();
  listeners.forEach((fn) => fn(status));
}

const gameKey = (g) => `${g.date}|${g.mode}|${g.result}|${g.moves}`;
const newest = (games) => games.reduce((m, g) => Math.max(m, g.date || 0), 0);

/**
 * Combines the data of this device and of the account, losing nothing:
 * every game from both sides, every lesson and puzzle done, the rating of the side
 * whose latest game is the most recent. Settings come from the account, except the
 * language currently chosen on this device.
 */
export function mergeData(local, remote) {
  const L = { settings: cleanSettings(local.settings), stats: cleanStats(local.stats), progress: cleanProgress(local.progress) };
  if (!remote || (!remote.stats?.games && !remote.progress?.lessonsDone && !Object.keys(remote.settings ?? {}).length)) return L;
  const R = { settings: cleanSettings({ ...L.settings, ...remote.settings }), stats: cleanStats(remote.stats), progress: cleanProgress(remote.progress) };
  const seen = new Set();
  const games = [...L.stats.games, ...R.stats.games]
    .filter((g) => (seen.has(gameKey(g)) ? false : seen.add(gameKey(g))))
    .sort((a, b) => (b.date || 0) - (a.date || 0))
    .slice(0, 200);
  const rating = newest(L.stats.games) > newest(R.stats.games) ? L.stats.rating : R.stats.rating;
  return {
    settings: { ...R.settings, lang: L.settings.lang, playerName: R.settings.playerName !== 'Player' ? R.settings.playerName : L.settings.playerName },
    stats: cleanStats({ rating, games }),
    progress: {
      lessonsDone: [...new Set([...L.progress.lessonsDone, ...R.progress.lessonsDone])],
      puzzlesSolved: [...new Set([...L.progress.puzzlesSolved, ...R.progress.puzzlesSolved])],
    },
  };
}

/** Downloads the account data, merges it with this device, uploads the result. */
export async function syncNow() {
  if (!auth.isSignedIn()) return;
  setStatus('syncing');
  try {
    const remote = await auth.getUserData();
    const merged = mergeData(accountData(), remote);
    replaceData(merged);
    if (state.settings.playerName === 'Player') {
      const profile = await auth.getProfile().catch(() => null);
      if (profile?.username && !auth.isDefaultUsername(profile.username)) updateSettings({ playerName: profile.username.slice(0, 20) });
    }
    await auth.putUserData(accountData());
    dirty = false;
    setStatus('synced');
  } catch (e) {
    setStatus(e.code === 'network' ? 'offline' : 'error');
    if (e.code === 'session') setStatus('idle');
  }
}

/** Uploads the local data (shortly after a change, or right away when the page is hidden). */
async function push({ keepalive = false } = {}) {
  if (!auth.isSignedIn() || !dirty) return;
  clearTimeout(timer);
  setStatus('syncing');
  try {
    await auth.putUserData(accountData(), { keepalive });
    dirty = false;
    setStatus('synced');
  } catch (e) {
    setStatus(e.code === 'network' ? 'offline' : 'error');
  }
}

export function startSync() {
  onDataChange(() => {
    if (!auth.isSignedIn()) return;
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(push, 1500);
  });
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && push({ keepalive: true }));
    window.addEventListener('online', () => auth.isSignedIn() && syncNow());
  }
  if (auth.isSignedIn()) syncNow();
}

/** Logs out after saving everything. Returns false if the last changes could not be saved. */
export async function logOut({ force = false } = {}) {
  if (auth.isSignedIn() && !force) {
    dirty = true;
    await push();
    if (status !== 'synced') return false;
  }
  await auth.signOut();
  resetToGuest();
  setStatus('idle');
  return true;
}
