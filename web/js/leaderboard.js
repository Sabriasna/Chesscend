// Global and Friends ranking views: every state is drawn here, from real data only.
import { icon } from './icons.js';
import { avatar, esc, goldPiece, pill } from './ui.js';
import { MIN_RANKED_GAMES } from './online.js';
import { t } from './i18n.js';

const stateCard = (art, title, text, actions = '') => `<div class="card state-card">
  <div class="state-art">${art}</div>
  <h3 class="state-title">${title}</h3>
  <p class="state-text">${text}</p>
  ${actions ? `<div class="state-actions">${actions}</div>` : ''}
</div>`;

const startPlaying = () => pill(t('common.startPlaying'), { icon: 'play', attrs: 'data-act="quick"' });

export function loadingView() {
  return `<div class="card list" aria-busy="true" aria-label="${t('lb.loading')}">${'<div class="list-row skel"><span class="skel-dot"></span><span class="skel-line"></span></div>'.repeat(5)}</div>`;
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
            t('lb.globalOff.title'),
            t('lb.globalOff.text'),
            `${startPlaying()}<span class="small">${t('lb.globalOff.note')}</span>`,
          )
        : stateCard(
            icon('users', 38, 'gold'),
            t('lb.friendsOff.title'),
            t('lb.friendsOff.text'),
            pill(t('lb.friendsOff.button'), { icon: 'swords', variant: 'light', size: 'm', attrs: 'data-go="setup-friend"' }),
          );

    case 'signed-out':
      return stateCard(icon('lock', 36, 'gold'), t('lb.signedOut.title'), t('lb.signedOut.text'));

    case 'error':
      return stateCard(
        icon('x-circle', 36, 'red'),
        t('lb.error.title'),
        `${t('lb.error.text')} <span class="small">(${esc(res.message)})</span>`,
        pill(t('common.tryAgain'), { icon: 'rotate-cw', size: 'm', attrs: `data-act="lb-retry" data-arg="${kind}"` }),
      );

    case 'no-friends':
      return stateCard(
        icon('user-plus', 38, 'gold'),
        t('lb.noFriends.title'),
        t('lb.noFriends.text'),
        res.canSearch ? pill(t('lb.noFriends.button'), { icon: 'search', size: 'm', attrs: 'data-act="find-friends"' }) : '',
      );

    case 'empty':
      // Situation A: nobody registered. Situation B: members, but nobody ranked yet.
      return res.members > 0
        ? stateCard(goldPiece('k', 64), t('lb.empty.title'), t('lb.empty.members', { n: res.members, min: MIN_RANKED_GAMES }), startPlaying())
        : stateCard(goldPiece('k', 64), t('lb.empty.title'), t('lb.empty.text'), startPlaying());

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
        <strong class="h3 ellipsis">${esc(r.name)}${r.userId === me ? ` (${t('lb.you').toLowerCase()})` : ''}</strong>
        <span class="small">${r.rating}</span>
      </div>`;
    })
    .join('');
  const row = (r) => `<li class="list-row ${r.userId === me ? 'is-me' : ''}" ${r.userId === me ? 'aria-current="true"' : ''}>
      <span class="lb-pos">${r.position}</span>${avatar(r.name, 36)}
      <span class="grow"><strong class="td ellipsis">${esc(r.name)}${r.userId === me ? ` <span class="badge badge-dark">${t('lb.you')}</span>` : ''}</strong>
      <span class="small">${t('lb.ratedGames', { n: r.games })}</span></span><b class="lb-rating">${r.rating}</b></li>`;
  const inList = rows.some((r) => r.userId === me);
  const mine = !inList && meRow ? `<p class="label">${t('lb.yourPosition')}</p><ol class="card list lb-list">${row(meRow)}</ol>` : '';
  return `<div class="lb-podium">${podium}</div>
    <ol class="card list lb-list">${rows.map(row).join('')}</ol>${mine}`;
}
