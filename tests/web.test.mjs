// Website logic tests: saved data, migration, rules, lessons/puzzles, ranking states.
// Run with: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { Position } from '../src/engine/chess.js';
import { PUZZLES } from '../src/data/puzzles.js';
import { ALL_LESSONS } from '../src/data/lessons.js';
import { timeoutResult } from '../web/js/rules.js';
import { loadLeaderboard } from '../web/js/online.js';
import { leaderboardView } from '../web/js/leaderboard.js';

/* ---------- a fake browser storage, then a fresh copy of store.js for each scenario ---------- */
function fakeStorage(initial = {}) {
  const data = { ...initial };
  globalThis.localStorage = {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => (data[k] = String(v)),
    removeItem: (k) => delete data[k],
  };
  return data;
}
let n = 0;
const freshStore = () => import(`../web/js/store.js?case=${++n}`);

test('new visitor: default values, data version written', async () => {
  const data = fakeStorage();
  const s = await freshStore();
  assert.equal(s.state.stats.rating, 800);
  assert.equal(s.state.settings.playerName, 'Player');
  assert.equal(data['chesscend:version'], String(s.DATA_VERSION));
});

test('corrupted data is kept as a backup, never silently overwritten', async () => {
  const data = fakeStorage({ 'chesscend:stats': '{not json', 'chesscend:version': '2' });
  const s = await freshStore();
  assert.equal(s.state.stats.rating, 800);
  const backups = Object.keys(data).filter((k) => k.startsWith('chesscend:stats:backup-'));
  assert.equal(backups.length, 1);
  assert.equal(data[backups[0]], '{not json');
});

test('version 1 saves are upgraded without losing anything', async () => {
  const old = {
    rating: 832,
    games: [
      { result: 'win', mode: 'ai', level: 2, reason: 'checkmate', moves: 30, change: 16, date: 3 },
      { result: 'white', mode: 'local', reason: 'checkmate', moves: 20, change: 0, date: 2 },
      { result: 'win', mode: 'ai', level: 2, reason: 'resign', moves: 25, change: 16, date: 1 },
    ],
  };
  const data = fakeStorage({
    'chesscend:stats': JSON.stringify(old),
    'chesscend:progress': JSON.stringify({ lessonsDone: ['b1', 'b2'], puzzlesSolved: ['p1'] }),
    'chesscend:settings': JSON.stringify({ playerName: 'Djam', themeId: 'gold' }),
  });
  const s = await freshStore();
  assert.equal(s.state.stats.rating, 832);
  assert.equal(s.state.stats.games.length, 3);
  assert.deepEqual(s.state.stats.games.map((g) => g.ratingAfter), [832, undefined, 816]);
  assert.ok(s.state.stats.games.every((g) => g.rated));
  assert.deepEqual(s.ratingHistory(), [800, 816, 832]);
  assert.deepEqual(s.state.progress.lessonsDone, ['b1', 'b2']);
  assert.equal(s.state.settings.playerName, 'Djam');
  assert.equal(s.state.settings.showHints, true, 'missing settings get their default');
  assert.equal(JSON.parse(data['chesscend:stats']).games.length, 3, 'upgraded data written back');
});

test('broken values are cleaned instead of crashing the site', async () => {
  fakeStorage({
    'chesscend:version': '2',
    'chesscend:stats': JSON.stringify({ rating: 'abc', games: [null, { result: 'win', mode: 'ai', level: 9 }, { result: 'oops' }] }),
    'chesscend:progress': JSON.stringify({ lessonsDone: 'b1', puzzlesSolved: ['p1', 'p1', 4] }),
    'chesscend:settings': JSON.stringify({ preferredLevel: 12, showHints: 'yes' }),
  });
  const s = await freshStore();
  assert.equal(s.state.stats.rating, 800);
  assert.equal(s.state.stats.games.length, 1);
  assert.equal(s.state.stats.games[0].level, 2);
  assert.deepEqual(s.state.progress, { lessonsDone: [], puzzlesSolved: ['p1'] });
  assert.equal(s.state.settings.preferredLevel, 2);
  assert.equal(s.state.settings.showHints, true);
});

test('rated and unrated games', async () => {
  fakeStorage();
  const s = await freshStore();
  const g1 = s.recordGame({ result: 'win', mode: 'ai', level: 2, reason: 'checkmate', moves: 20 });
  assert.ok(g1.change > 0);
  assert.equal(s.state.stats.rating, 800 + g1.change);
  const before = s.state.stats.rating;
  const g2 = s.recordGame({ result: 'win', mode: 'ai', level: 2, reason: 'checkmate', moves: 20, rated: false });
  assert.equal(g2.change, 0);
  assert.equal(g2.rated, false);
  assert.equal(s.state.stats.rating, before, 'an unrated game does not move the rating');
  s.recordGame({ result: 'white', mode: 'local', reason: 'checkmate', moves: 10 });
  assert.equal(s.state.stats.rating, before, 'friend games never move the rating');
  assert.deepEqual(s.ratingHistory(), [800, before, before]);
  assert.equal(s.summarize().played, 2);
  assert.equal(s.summarize().friendGames, 1);
});

test('rating never goes below 100', async () => {
  fakeStorage({ 'chesscend:version': '2', 'chesscend:stats': JSON.stringify({ rating: 101, games: [] }) });
  const s = await freshStore();
  const g = s.recordGame({ result: 'loss', mode: 'ai', level: 1, reason: 'checkmate', moves: 10 });
  assert.equal(s.state.stats.rating, 100);
  assert.equal(g.change, -1, 'the recorded change matches the real change (101 → 100)');
});

test('saved game: valid ones load, broken ones are kept aside', async () => {
  const data = fakeStorage({ 'chesscend:version': '2' });
  const s = await freshStore();
  s.saveGame({ config: { mode: 'ai', aiLevel: 3, playerColor: 'b', timeControl: { minutes: 5, increment: 0 } }, moves: ['e4'], clocks: { w: 290000, b: 300000 }, clockHistory: [{ w: 300000, b: 300000 }] });
  const g = s.loadSavedGame();
  assert.equal(g.config.aiLevel, 3);
  assert.deepEqual(g.clocks, { w: 290000, b: 300000 });
  assert.equal(g.clockHistory.length, 1);
  data['chesscend:savedGame'] = JSON.stringify({ config: { mode: 'online' }, moves: 'e4' });
  assert.equal(s.loadSavedGame(), null);
  assert.ok(Object.keys(data).some((k) => k.startsWith('chesscend:savedGame:backup-')));
});

test('storage blocked by the browser: the site keeps working in memory', async () => {
  globalThis.localStorage = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('SecurityError');
    },
    removeItem() {},
  };
  const s = await freshStore();
  s.updateSettings({ playerName: 'Sam' });
  assert.equal(s.state.settings.playerName, 'Sam');
  assert.equal(s.isPersistent(), false);
});

/* ---------- rules ---------- */

test('time out: win only if the opponent can still checkmate', () => {
  assert.deepEqual(timeoutResult(new Position('4k3/8/8/8/8/8/8/R3K3 w - - 0 1'), 'b'), { over: true, winner: 'w', reason: 'timeout' });
  assert.deepEqual(timeoutResult(new Position('4k3/8/8/8/8/8/8/R3K3 w - - 0 1'), 'w'), { over: true, winner: null, reason: 'timeout' });
});

/* ---------- lessons and puzzles ---------- */

test('every puzzle has a checkmate in one', () => {
  for (const p of PUZZLES) {
    const pos = new Position(p.fen);
    const mates = pos.legalMoves().filter((m) => {
      pos.makeMove(m);
      const mate = pos.inCheck() && pos.legalMoves().length === 0;
      pos.unmakeMove();
      return mate;
    });
    assert.ok(mates.length >= 1, p.id);
  }
});

test('every lesson board is a valid position', () => {
  for (const l of ALL_LESSONS) {
    const pos = new Position(l.fen);
    assert.equal(pos.fen().split(' ')[0], l.fen.split(' ')[0], l.id);
    assert.ok(Array.isArray(l.paragraphs) && l.paragraphs.length, l.id);
  }
});

/* ---------- ranking states (test fixtures only: never shown on the site) ---------- */

test('no online service: rankings say so, without fake players', async () => {
  const res = await loadLeaderboard('global');
  assert.deepEqual(res, { status: 'unavailable' });
  const html = leaderboardView('global', res);
  assert.match(html, /not live yet/);
  assert.doesNotMatch(html, /lb-list/);
  assert.match(leaderboardView('friends', await loadLeaderboard('friends')), /Friends arrive with player accounts/);
});

const fixture = (over) => ({
  getSession: async () => ({ userId: 'u2', name: 'Me' }),
  getGlobalLeaderboard: async () => ({ members: 0, ranked: 0, rows: [] }),
  getFriendsLeaderboard: async () => ({ friends: 0, rows: [], canSearch: true }),
  ...over,
});

test('situation A: nobody registered', async () => {
  const res = await loadLeaderboard('global', fixture());
  assert.equal(res.status, 'empty');
  const html = leaderboardView('global', res);
  assert.match(html, /Be the first to reach the top\./);
  assert.match(html, /waiting for its first champion/);
  assert.match(html, /Start Playing/);
});

test('situation B: members but nobody ranked', async () => {
  const res = await loadLeaderboard('global', fixture({ getGlobalLeaderboard: async () => ({ members: 12, ranked: 0, rows: [] }) }));
  const html = leaderboardView('global', res);
  assert.match(html, /12 members/);
  assert.match(html, /at least 5 rated online games/);
});

test('situation C: real rows, podium and my position highlighted', async () => {
  const rows = [1, 2, 3, 4].map((i) => ({ userId: `u${i}`, name: `P${i}`, rating: 1600 - i * 10, games: 9, position: i }));
  const res = await loadLeaderboard('global', fixture({ getGlobalLeaderboard: async () => ({ members: 4, ranked: 4, rows }) }));
  const html = leaderboardView('global', res);
  assert.equal((html.match(/lb-podium-item/g) || []).length, 3);
  assert.match(html, /aria-current="true"/);
  assert.equal((html.match(/class="list-row/g) || []).length, 4);
});

test('friends: empty state, signed out, and errors', async () => {
  const none = await loadLeaderboard('friends', fixture());
  assert.match(leaderboardView('friends', none), /Your next rival could be a friend\./);
  assert.match(leaderboardView('friends', none), /Find Friends/);
  const out = await loadLeaderboard('friends', fixture({ getSession: async () => null }));
  assert.equal(out.status, 'signed-out');
  const err = await loadLeaderboard('global', fixture({ getGlobalLeaderboard: async () => { throw new Error('timeout'); } }));
  assert.equal(err.status, 'error');
  assert.match(leaderboardView('global', err), /Try again/);
  assert.match(leaderboardView('global', { status: 'loading' }), /aria-busy="true"/);
});
