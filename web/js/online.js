// Connection to an online service (accounts, verified results, leaderboards).
//
// Chesscend has NO server yet: `provider` is null, so the site honestly reports
// that online rankings are unavailable. When a backend exists (see docs/BACKEND.md),
// set `provider` to an object implementing the methods below. Results and ratings
// must be computed and stored by the server, never sent by the browser.
//
// interface Provider {
//   getSession(): Promise<{ userId, name } | null>
//   getGlobalLeaderboard({ limit }): Promise<{ members: number, ranked: number,
//       rows: [{ userId, name, avatar?, rating, games, position }], me?: row }>
//   getFriendsLeaderboard(): Promise<{ friends: number, rows: [...], canSearch: boolean }>
// }
export const provider = null;

/** Minimum number of rated online games before a player appears in the Global ranking. */
export const MIN_RANKED_GAMES = 5;

/**
 * Loads a leaderboard and returns a state the page can show:
 *   { status: 'unavailable' }                     no online service yet
 *   { status: 'signed-out' }                      service ok, user not connected
 *   { status: 'error', message }                  could not load
 *   { status: 'empty', members, ranked }          nobody ranked (situations A and B)
 *   { status: 'list', rows, me, members }         real ranked players (situation C)
 *   { status: 'no-friends', canSearch }           friends tab, no friend yet
 */
export async function loadLeaderboard(kind, p = provider) {
  if (!p) return { status: 'unavailable' };
  try {
    const session = await p.getSession();
    if (!session && kind === 'friends') return { status: 'signed-out' };
    if (kind === 'friends') {
      const r = await p.getFriendsLeaderboard();
      if (!r.friends) return { status: 'no-friends', canSearch: !!r.canSearch };
      return { status: 'list', rows: r.rows ?? [], me: session?.userId ?? null };
    }
    const r = await p.getGlobalLeaderboard({ limit: 50 });
    if (!r.ranked || !r.rows?.length) return { status: 'empty', members: r.members ?? 0, ranked: 0, signedIn: !!session };
    return { status: 'list', rows: r.rows, me: session?.userId ?? null, meRow: r.me ?? null, members: r.members, signedIn: !!session };
  } catch (e) {
    return { status: 'error', message: e?.message || 'Network error' };
  }
}
