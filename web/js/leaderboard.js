// Global and Friends ranking views: every state is drawn here, from real data only.
import { icon } from './icons.js';
import { avatar, esc, goldPiece, pill } from './ui.js';
import { MIN_RANKED_GAMES } from './online.js';

const stateCard = (art, title, text, actions = '') => `<div class="card state-card">
  <div class="state-art">${art}</div>
  <h3 class="state-title">${title}</h3>
  <p class="state-text">${text}</p>
  ${actions ? `<div class="state-actions">${actions}</div>` : ''}
</div>`;

const startPlaying = pill('Start Playing', { icon: 'play', attrs: 'data-act="quick"' });

export function loadingView() {
  return `<div class="card list" aria-busy="true" aria-label="Loading the ranking">${'<div class="list-row skel"><span class="skel-dot"></span><span class="skel-line"></span></div>'.repeat(5)}</div>`;
}

/** kind: 'global' | 'friends'. res: result of loadLeaderboard(). */
export function leaderboardView(kind, res) {
  switch (res.status) {
    case 'loading':
      return loadingView();

    case 'unavailable':
      return kind === 'global'
        ? stateCard(
            icon('crown', 40, 'gold'),
            'The online leaderboard opens with ranked play',
            `The Global ranking will list real players by their <b>Online Rating</b>, earned in verified games against other people. Accounts and online games are not live yet, so no one is ranked for now: no player or score is ever made up.`,
            `${startPlaying}<span class="small">Games against the computer build your <b>Computer Rating</b> (see My stats). It is separate from the Online Rating.</span>`,
          )
        : stateCard(
            icon('users', 38, 'gold'),
            'Friends arrive with player accounts',
            'Here you will compare your Online Rating with your friends. Adding friends needs accounts, which are not available yet.',
            pill('Play a friend on this device', { icon: 'swords', variant: 'light', size: 'm', attrs: 'data-go="setup-friend"' }),
          );

    case 'signed-out':
      return stateCard(icon('lock', 36, 'gold'), 'Sign in to see your friends', 'Your friends and their rankings are linked to your account.');

    case 'error':
      return stateCard(
        icon('x-circle', 36, 'red'),
        'The ranking could not be loaded',
        `Check your connection and try again. <span class="small">(${esc(res.message)})</span>`,
        pill('Try again', { icon: 'rotate-cw', size: 'm', attrs: `data-act="lb-retry" data-arg="${kind}"` }),
      );

    case 'no-friends':
      return stateCard(
        icon('user-plus', 38, 'gold'),
        'Your next rival could be a friend.',
        'Connect with other players and climb the ranks together.',
        res.canSearch ? pill('Find Friends', { icon: 'search', size: 'm', attrs: 'data-act="find-friends"' }) : '',
      );

    case 'empty':
      // Situation A: nobody registered. Situation B: members, but nobody ranked yet.
      return res.members > 0
        ? stateCard(
            goldPiece('k', 64),
            'Be the first to reach the top.',
            `${res.members} member${res.members > 1 ? 's' : ''} already joined Chesscend, but nobody is ranked yet. To appear here, play at least ${MIN_RANKED_GAMES} rated online games.`,
            startPlaying,
          )
        : stateCard(goldPiece('k', 64), 'Be the first to reach the top.', 'The leaderboard is waiting for its first champion.', startPlaying);

    case 'list':
      return listView(res);

    default:
      return '';
  }
}

function listView({ rows, me, meRow }) {
  const top = rows.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean); // 2nd, 1st, 3rd like a podium
  const podium = order
    .map((r) => {
      const place = r.position;
      const color = place === 1 ? 'var(--gold)' : place === 2 ? 'var(--silver)' : 'var(--bronze)';
      return `<div class="lb-podium-item place-${place} ${r.userId === me ? 'is-me' : ''}">
        ${place === 1 ? icon('crown', 28, 'gold') : ''}
        ${avatar(r.name, place === 1 ? 84 : 64, color)}
        <div class="base" style="background:${color}">${place}</div>
        <strong class="h3 ellipsis">${esc(r.name)}${r.userId === me ? ' (you)' : ''}</strong>
        <span class="small">${r.rating}</span>
      </div>`;
    })
    .join('');
  const row = (r) => `<li class="list-row ${r.userId === me ? 'is-me' : ''}" ${r.userId === me ? 'aria-current="true"' : ''}>
      <span class="lb-pos">${r.position}</span>${avatar(r.name, 36)}
      <span class="grow"><strong class="td ellipsis">${esc(r.name)}${r.userId === me ? ' <span class="badge badge-dark">You</span>' : ''}</strong>
      <span class="small">${r.games} rated games</span></span><b class="lb-rating">${r.rating}</b></li>`;
  const inList = rows.some((r) => r.userId === me);
  const mine = !inList && meRow ? `<p class="label">YOUR POSITION</p><ol class="card list lb-list">${row(meRow)}</ol>` : '';
  return `<div class="lb-podium">${podium}</div>
    <ol class="card list lb-list">${rows.map(row).join('')}</ol>${mine}`;
}
