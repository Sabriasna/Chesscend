// The 5 tabs (Home, Play, Ranking, Community, Learn) + Custom game, Profile and Course pages.
import { icon } from './icons.js';
import {
  avatar, badge, esc, goldPiece, goldScene, hero, piece, pill, progressBar, sectionHeader, segmented, tile,
} from './ui.js';
import { BOT_RATING, isPersistent, ratingHistory, state, summarize, updateSettings } from './store.js';
import { loadLeaderboard } from './online.js';
import { leaderboardView } from './leaderboard.js';
import { nav } from './app.js';
import { ALL_LESSONS, COURSES } from '../../src/data/lessons.js';
import { PUZZLES } from '../../src/data/puzzles.js';
import { QUICK, TIME_CONTROLS, tcLabel } from '../../src/data/timeControls.js';
import { AI_LEVELS } from '../../src/engine/ai.js';
import { THEMES } from '../../src/theme/themes.js';

const QUICK_ICON = { blitz: { ic: 'zap' }, rapid: { ic: 'clock' }, classical: { glyph: 'n' } };
const quickTiles = (dark) =>
  Object.entries(QUICK)
    .map(([k, q]) => tile({ ...QUICK_ICON[k], label: q.label, sub: q.sub, dark, attrs: `data-act="quick" data-arg="${k}"` }))
    .join('');

/* ================================================================ HOME */
export function homePage() {
  const { settings, stats, progress } = state;
  const s = summarize();
  const nextLesson = ALL_LESSONS.find((l) => !progress.lessonsDone.includes(l.id));
  const lessonPct = Math.round((progress.lessonsDone.length / ALL_LESSONS.length) * 100);
  const nextPuzzle = PUZZLES.find((p) => !progress.puzzlesSolved.includes(p.id));
  const saved = nav.saved;

  const resume = saved
    ? `<button class="card row-card resume" data-act="resume">
        <span class="gold-ic">${goldPiece('q', 30)}</span>
        <span class="grow"><strong class="h3">Continue your game</strong>
        <span class="small">${saved.config.mode === 'ai' ? `vs Computer · ${esc(AI_LEVELS[saved.config.aiLevel].label)}` : 'vs Friend'} · ${saved.moves.length} moves · ${tcLabel(saved.config.timeControl)}</span></span>
        ${icon('play-circle', 30)}
      </button>`
    : '';

  return {
    title: 'Home',
    html: `
    <section class="home-hero">
      <div class="home-hero-text">
        <p class="tagline">PLAY  •  COMPETE  •  ASCEND</p>
        <h1 class="display">Chess, made simple<br>and beautiful.</h1>
        <p class="lead">Play the computer or a friend, learn with short lessons and puzzles, and let a friendly coach explain your mistakes.</p>
        <div class="cta-row">
          ${pill('Play now', { icon: 'play', attrs: 'data-act="quick"' })}
          ${pill('Start learning', { variant: 'light', attrs: 'data-go="learn"' })}
        </div>
      </div>
      <div class="home-hero-art">${goldScene(['n', 'k'], 170)}</div>
    </section>

    <div class="grid home-top">
      <div class="stack">
        <button class="card row-card player" data-go="ranking">
          ${avatar(settings.playerName, 56, 'var(--gold-light)')}
          <span class="grow"><strong class="h3 ellipsis">${esc(settings.playerName)}</strong>
            <span class="inline">${icon('bar-chart-2', 15)} <span class="elo">${stats.rating} <span class="hide-sm">Computer </span>Rating</span></span></span>
          <span class="divider"></span>
          <span class="games"><b>${s.played}</b><span class="small">games</span></span>
          ${icon('chevron-right', 22)}
        </button>
        ${resume}
        ${pill('Play now', { icon: 'play', attrs: 'data-act="quick"', cls: 'block mobile-only' })}
      </div>
      <div class="tiles tiles-4">
        ${quickTiles(false)}
        ${tile({ ic: 'plus', label: 'Custom', sub: 'Your rules', attrs: 'data-go="setup"' })}
      </div>
    </div>

    ${sectionHeader('Continue Learning', 'View all', 'data-go="learn"')}
    <div class="grid cols-2">
      <button class="card row-card lesson" data-go="${nextLesson ? `lesson-${nextLesson.id}` : 'learn'}">
        <span class="lesson-art">${icon('school', 34)}</span>
        <span class="grow">
          <strong class="h3 ellipsis">${nextLesson ? esc(nextLesson.title) : 'All lessons done!'}</strong>
          <span class="small">${nextLesson ? `Lesson ${ALL_LESSONS.indexOf(nextLesson) + 1} of ${ALL_LESSONS.length}` : 'Great work'}</span>
          <span class="inline">${progressBar(lessonPct)}<b class="pct">${lessonPct}%</b></span>
        </span>
      </button>
      <div class="card row-card puzzle-card tinted">
        ${icon('puzzle', 30)}
        <span class="grow"><strong class="h3">Puzzle Challenge</strong>
          <span class="small">${progress.puzzlesSolved.length} / ${PUZZLES.length} solved · Find the checkmate</span></span>
        ${nextPuzzle ? pill('Solve', { size: 'm', attrs: `data-go="puzzle-${nextPuzzle.id}"` }) : badge('All done', 'green')}
      </div>
    </div>

    ${sectionHeader('Your Progress', 'Ranking', 'data-go="ranking"')}
    <div class="grid cols-3 progress-row">
      <button class="card prog-card" data-go="ranking">${icon('robot', 24)}<span class="small">Computer Rating</span><b class="num">${stats.rating}</b>
        <span class="small">${s.played ? `${s.wins} win${s.wins === 1 ? '' : 's'} in ${s.played} game${s.played === 1 ? '' : 's'}` : 'Play a game to start climbing'}</span></button>
      <button class="card prog-card" data-go="learn">${icon('school', 24)}<span class="small">Lessons</span><b class="num">${progress.lessonsDone.length}<small> / ${ALL_LESSONS.length}</small></b>
        <span class="small">${nextLesson ? `Next: ${esc(nextLesson.title)}` : 'All courses completed'}</span></button>
      <button class="card prog-card" data-go="${nextPuzzle ? `puzzle-${nextPuzzle.id}` : 'puzzles'}">${icon('puzzle', 24)}<span class="small">Puzzles</span><b class="num">${progress.puzzlesSolved.length}<small> / ${PUZZLES.length}</small></b>
        <span class="small">${nextPuzzle ? `Next: ${esc(nextPuzzle.title)}` : 'All puzzles solved'}</span></button>
    </div>
    <div class="card row-card compete mt">
      ${icon('crown', 30, 'gold')}
      <span class="grow"><strong class="h3">Compete online</strong><span class="small">Ranked games against real players and the Global leaderboard are not available yet. Your Computer Rating already tracks your progress.</span></span>
      ${pill('See rankings', { size: 'm', variant: 'light', attrs: 'data-go="ranking"' })}
    </div>`,
  };
}

/* ================================================================ PLAY */
export function playPage() {
  const { settings, stats } = state;
  const s = summarize();
  const level = settings.preferredLevel;
  return {
    title: 'Play',
    html: `
    ${hero('Play', 'Choose your game and challenge the computer or a friend.', ['p', 'n'])}
    <p class="mode-line">${icon('info', 15)} <span><b>Quick games:</b> vs Computer (${AI_LEVELS[level].label}) · you play White · <b>counts for your Computer Rating</b>. Change the level below, or pick colour and clock in Custom Game.</span></p>
    <div class="tiles tiles-3">${quickTiles(true)}</div>
    <div class="tiles tiles-3 mt">
      ${tile({ ic: 'swords', label: 'Play a Friend', sub: 'Same device', attrs: 'data-go="setup-friend"' })}
      ${tile({ ic: 'users', label: 'Find Opponent', sub: 'Online · ranked', soon: true, attrs: 'data-act="soon" data-arg="Online play"' })}
      ${tile({ ic: 'sliders', label: 'Custom Game', sub: 'Your rules', attrs: 'data-go="setup"' })}
    </div>

    <div class="grid cols-2 mt-l">
      <div class="card">
        <div class="card-head">${icon('robot', 26)}<strong class="h3 grow">Computer level</strong><span class="small">for quick games</span></div>
        <div class="chips">${[1, 2, 3, 4]
          .map((l) => `<button class="chip ${l === level ? 'on' : ''}" aria-pressed="${l === level}" data-act="level" data-arg="${l}">${AI_LEVELS[l].label}</button>`)
          .join('')}</div>
        ${pill('Start a Game', { icon: 'play', attrs: 'data-act="quick"', cls: 'block mt' })}
      </div>
      <div>
        ${sectionHeader('Your Ranking', 'View stats', 'data-go="ranking"').replace('section-head', 'section-head tight')}
        <div class="card stat-row">
          <div class="stat">${icon('trophy', 28, 'gold')}<b class="num">${s.wins}</b><span class="small">Wins</span></div>
          <span class="vsep"></span>
          <div class="stat">${icon('bar-chart-2', 24)}<b class="num">${stats.rating}</b><span class="small">Computer Rating</span></div>
          <span class="vsep"></span>
          <div class="stat">${icon(s.week >= 0 ? 'trending-up' : 'trending-down', 24, s.week >= 0 ? 'gold' : 'red')}<b class="num">${s.week > 0 ? `+${s.week}` : s.week}</b><span class="small">This week</span></div>
        </div>
      </div>
    </div>

    ${sectionHeader('Game modes')}
    <div class="card list modes">
      <div class="list-row">${icon('robot', 22)}<span class="grow"><strong class="td">vs Computer</strong><span class="small">4 levels, any colour, with or without a clock.</span></span>${badge('Computer Rating', 'green')}</div>
      <div class="list-row">${icon('swords', 22)}<span class="grow"><strong class="td">vs a Friend, same device</strong><span class="small">Take turns on this screen. The board can flip for each player.</span></span>${badge('Unrated')}</div>
      <div class="list-row is-off">${icon('users', 22)}<span class="grow"><strong class="td">Online, ranked</strong><span class="small">Against real players, for the Online Rating and the Global ranking.</span></span>${badge('Not available yet', 'dark')}</div>
    </div>
    <p class="small mt-s">${icon('clock', 13)} Casual games pause the clock when you leave the page, and you can pick up where you stopped.</p>`,
    actions: {
      level: (l) => {
        updateSettings({ preferredLevel: +l });
        nav.go('play');
      },
    },
  };
}

/* ================================================================ RANKING */
const REASONS = {
  checkmate: 'Checkmate', stalemate: 'Stalemate', threefold: 'Repetition', fifty: '50-move rule',
  material: 'Insufficient material', timeout: 'Time out', resign: 'Resignation',
};

let rankingTab = 'me';

/** Small line chart of the Computer Rating, drawn from the saved results only. */
function sparkline(points) {
  if (points.length < 2) return '<p class="small spark-empty">Play rated games against the computer to see your progression here.</p>';
  const w = 300;
  const h = 70;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(1, max - min);
  const xy = points.map((p, i) => [((i / (points.length - 1)) * (w - 8) + 4).toFixed(1), (h - 6 - ((p - min) / span) * (h - 12)).toFixed(1)]);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const [lx, ly] = xy[xy.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Computer Rating over your last ${points.length - 1} rated games: from ${points[0]} to ${points[points.length - 1]}">
    <path d="${line} L${w - 4} ${h} L4 ${h} Z" fill="rgba(224,168,46,0.16)"/><path d="${line}" fill="none" stroke="#A8741A" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${lx}" cy="${ly}" r="4" fill="#111"/></svg>
    <div class="spark-scale"><span>${min}</span><span>${max}</span></div>`;
}

function myStats() {
  const { settings, stats } = state;
  const s = summarize();
  const hist = ratingHistory().slice(-30);
  const ai = stats.games.filter((g) => g.mode === 'ai');
  const record = [1, 2, 3, 4].map((l) => {
    const g = ai.filter((x) => x.level === l);
    return {
      level: l,
      wins: g.filter((x) => x.result === 'win').length,
      draws: g.filter((x) => x.result === 'draw').length,
      losses: g.filter((x) => x.result === 'loss').length,
    };
  });
  const side = (value, label, color, ic) => `<div class="podium-side">
      <div class="side-ring" style="border-color:${color}"><b>${value}</b></div>
      <div class="base" style="background:${color}">${icon(ic, 18)}</div>
      <strong class="h3">${label}</strong></div>`;

  const recent = stats.games.length
    ? `<div class="card list">${stats.games
        .slice(0, 8)
        .map((g) => {
          let b;
          if (g.mode !== 'ai') b = badge(g.result === 'draw' ? 'Draw' : g.result === 'white' ? 'White won' : 'Black won');
          else {
            const word = g.result === 'win' ? 'Win' : g.result === 'loss' ? 'Loss' : 'Draw';
            const tone = g.result === 'win' ? 'green' : g.result === 'loss' ? 'red' : 'gold';
            b = g.rated ? badge(`${word} ${g.change > 0 ? '▲ +' : g.change < 0 ? '▼ ' : '± '}${g.change}`, tone) : badge(`${word} · unrated`, tone);
          }
          return `<div class="list-row">${icon(g.mode === 'ai' ? 'cpu' : 'users', 18)}
            <span class="grow"><strong class="td">${g.mode === 'ai' ? `vs ${esc(AI_LEVELS[g.level]?.label ?? 'Computer')}` : 'Friend game'}</strong>
            <span class="small">${REASONS[g.reason] ?? ''} · ${g.moves} moves${g.date ? ` · ${new Date(g.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}</span></span>${b}</div>`;
        })
        .join('')}</div>`
    : `<div class="card state-card"><div class="state-art">${goldPiece('p', 44)}</div><h3 class="state-title">No games yet</h3><p class="state-text">Your results will appear here after your first game.</p><div class="state-actions">${pill('Start Playing', { icon: 'play', size: 'm', attrs: 'data-act="quick"' })}</div></div>`;

  return `
    <div class="grid cols-2 rating-cards">
      <div class="card rating-card">
        <div class="card-head">${icon('robot', 24)}<strong class="h3 grow">Computer Rating</strong>${badge('Active', 'green')}</div>
        <div class="rating-big"><b>${stats.rating}</b><span class="small">best ${s.best} · ${s.week > 0 ? '+' : ''}${s.week} this week</span></div>
        ${sparkline(hist)}
        <p class="small">Your progress against the computer. Only rated games count: a game where a move was taken back is unrated.</p>
      </div>
      <div class="card rating-card">
        <div class="card-head">${icon('users', 24)}<strong class="h3 grow">Online Rating</strong>${badge('Not available yet', 'gold')}</div>
        <div class="rating-big"><b class="muted-num">—</b><span class="small">Not rated</span></div>
        <p class="small">Earned in ranked games against real players, checked by the server. It will be completely separate from your Computer Rating. Online play is not live yet.</p>
      </div>
    </div>
    <div class="podium">
      ${side(s.wins, 'Wins', 'var(--silver)', 'trophy')}
      <div class="podium-main">
        ${icon('crown', 34, 'gold')}
        <div class="laurel">${icon('leaf', 30, 'gold leaf-l')}${avatar(settings.playerName, 104, 'var(--gold)')}${icon('leaf', 30, 'gold leaf-r')}</div>
        <div class="base main-base">${stats.rating}</div>
        <strong class="h3 ellipsis">${esc(settings.playerName)}</strong>
        <span class="small">Computer Rating</span>
      </div>
      ${side(`${s.winRate}%`, 'Win rate', 'var(--bronze)', 'percent')}
    </div>
    <div class="card totals">
      <div><b class="num">${s.played}</b><span class="small">Games vs computer</span></div>
      <div><b class="num green">${s.wins}</b><span class="small">Wins</span></div>
      <div><b class="num">${s.draws}</b><span class="small">Draws</span></div>
      <div><b class="num red">${s.losses}</b><span class="small">Losses</span></div>
    </div>
    ${s.friendGames ? `<p class="small center mt-s">+ ${s.friendGames} game${s.friendGames > 1 ? 's' : ''} with a friend on this device (not rated)</p>` : ''}
    <div class="grid cols-2">
      <div>${sectionHeader('Record vs Computer')}
        <div class="card list"><table class="table"><caption class="sr-only">Wins, draws and losses against each computer level</caption><thead><tr><th class="left" scope="col">Level</th><th scope="col">Rating</th><th scope="col"><abbr title="Wins">W</abbr></th><th scope="col"><abbr title="Draws">D</abbr></th><th scope="col"><abbr title="Losses">L</abbr></th></tr></thead><tbody>
        ${record
          .map(
            (r) => `<tr><td class="left"><span class="inline">${icon('robot', 20)} ${AI_LEVELS[r.level].label}</span></td><td>${BOT_RATING[r.level]}</td>
            <td class="green">${r.wins}</td><td>${r.draws}</td><td class="red">${r.losses}</td></tr>`,
          )
          .join('')}
        </tbody></table></div>
      </div>
      <div>${sectionHeader('Recent Games')}${recent}</div>
    </div>
    <p class="small center mt-l">${icon('info', 13)} Your statistics are saved in this browser only. They are not synced to other devices.</p>`;
}

export function rankingPage() {
  let root;
  const tabs = () =>
    segmented(
      [
        { key: 'me', label: 'My stats' },
        { key: 'global', label: 'Global' },
        { key: 'friends', label: 'Friends' },
      ],
      rankingTab,
      'rtab',
      'Ranking views',
    );
  const intro = {
    me: 'Your Computer Rating and results, saved on this device.',
    global: 'The best players on Chesscend, ranked by Online Rating.',
    friends: 'You and your friends, ranked by Online Rating.',
  };
  async function fill() {
    const body = root.querySelector('.rank-body');
    if (rankingTab === 'me') {
      body.innerHTML = myStats();
      return;
    }
    const kind = rankingTab;
    body.innerHTML = leaderboardView(kind, { status: 'loading' });
    const res = await loadLeaderboard(kind);
    if (rankingTab === kind && root.isConnected) body.innerHTML = leaderboardView(kind, res);
  }
  const draw = () => {
    root.querySelector('.rank-tabs').innerHTML = tabs();
    root.querySelector('.rank-intro').textContent = intro[rankingTab];
    fill();
  };
  return {
    title: 'Ranking',
    html: `
    ${hero('Ranking', 'Track your progress game after game.', ['n', 'k'], 96)}
    <div class="narrow-center"><div class="rank-tabs">${tabs()}</div><p class="small center mt-s rank-intro">${intro[rankingTab]}</p></div>
    <div class="rank-body mt" role="tabpanel"></div>`,
    mount(el) {
      root = el;
      fill();
    },
    actions: {
      rtab: (k) => {
        rankingTab = k;
        draw();
      },
      'lb-retry': () => fill(),
    },
  };
}

/* ================================================================ COMMUNITY */

export function communityPage() {
  // Honest empty states: these need player accounts and a server, which do not exist yet.
  const SECTIONS = [
    { id: 'players', ic: 'users', title: 'Players', text: 'Find players of your level and follow their progress.', need: 'Needs player accounts.' },
    { id: 'friends', ic: 'user-plus', title: 'Friends', text: 'Add friends, invite them with a code and compare your rankings.', need: 'Needs player accounts.' },
    { id: 'clubs', ic: 'shield', title: 'Clubs & events', text: 'Join a club and take part in friendly tournaments.', need: 'Needs accounts and online play.' },
    { id: 'discussions', ic: 'message-circle', title: 'Discussions', text: 'Ask questions, share games and tips with other members.', need: 'Needs accounts and moderation.' },
  ];
  return {
    title: 'Community',
    html: `
    ${hero('Community', 'Connect, share and grow with other chess players.', ['p', 'n'])}
    <div class="tiles tiles-4">
      ${tile({ ic: 'users', label: 'Players', attrs: 'data-act="jump" data-arg="players"' })}
      ${tile({ ic: 'user-plus', label: 'Friends', attrs: 'data-act="jump" data-arg="friends"' })}
      ${tile({ ic: 'shield', label: 'Clubs', attrs: 'data-act="jump" data-arg="clubs"' })}
      ${tile({ ic: 'message-circle', label: 'Forums', attrs: 'data-act="jump" data-arg="discussions"' })}
    </div>
    <div class="card row-card tinted mt-l community-note">
      ${icon('info', 24)}
      <span class="grow"><strong class="h3">The Chesscend community is getting ready</strong>
      <span class="small">Player accounts are not open yet, so there are no members, posts or clubs to show. Nothing here is made up: these spaces will fill with real players when accounts launch.</span></span>
    </div>
    <div class="grid cols-2 mt">
      ${SECTIONS.map(
        (c) => `<section class="card comm-card" id="c-${c.id}" tabindex="-1" aria-labelledby="h-${c.id}">
          <div class="card-head"><span class="round-ic">${icon(c.ic, 24)}</span><h2 class="h3 grow" id="h-${c.id}">${c.title}</h2>${badge('Not available yet', 'dark')}</div>
          <p class="body">${c.text}</p>
          <p class="small empty-line">${icon('clock', 13)} No ${c.id === 'clubs' ? 'clubs' : c.id === 'discussions' ? 'discussions' : c.id} yet. ${c.need}</p>
        </section>`,
      ).join('')}
    </div>
    <div class="card row-card tinted mt-l">
      ${icon('crown', 34)}
      <span class="grow"><strong class="h3">Meanwhile, play a friend</strong><span class="small">Share the screen and play on the same device.</span></span>
      ${pill('Play', { size: 'm', attrs: 'data-go="setup-friend"' })}
    </div>`,
    actions: {
      jump: (id) => {
        const el = document.getElementById(`c-${id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus({ preventScroll: true });
      },
    },
  };
}

/* ================================================================ LEARN */
const SOON_COURSES = [
  { title: 'Tactical Patterns', level: 'Intermediate', piece: 'n' },
  { title: 'Endgame Mastery', level: 'Advanced', piece: 'k' },
];

function courseCard({ title, level, piece: pc, footer, soon, attrs }) {
  return `<button class="card course-card ${soon ? 'is-soon' : ''}" ${attrs}>
    <span class="course-art">${goldPiece(pc, 76)}${soon ? badge('Soon', 'dark', 'corner') : ''}</span>
    <span class="course-body"><strong class="h3">${esc(title)}</strong>
      <span class="inline small">${icon('bar-chart', 14)} ${esc(level)}</span>
      ${footer ? `<span class="small goldtxt">${footer}</span>` : ''}</span>
  </button>`;
}

export function learnPage() {
  const { progress } = state;
  const done = progress.lessonsDone;
  const next = ALL_LESSONS.find((l) => !done.includes(l.id));
  const course = next ? COURSES.find((c) => c.id === next.courseId) : COURSES[0];
  const courseDone = course.lessons.filter((l) => done.includes(l.id)).length;
  const pct = Math.round((courseDone / course.lessons.length) * 100);
  const s = summarize();
  const nextPuzzle = PUZZLES.find((p) => !progress.puzzlesSolved.includes(p.id));

  return {
    title: 'Learn',
    html: `
    ${hero('Learn', 'Improve your game with simple lessons, puzzles and friendly tips.', ['b', 'n'])}
    <div class="tiles tiles-4">
      ${tile({ ic: 'school', label: 'Courses', attrs: `data-go="course-${course.id}"` })}
      ${tile({ ic: 'puzzle', label: 'Puzzles', attrs: `data-go="${nextPuzzle ? `puzzle-${nextPuzzle.id}` : 'puzzles'}"` })}
      ${tile({ ic: 'bar-chart-2', label: 'Analysis', soon: true, attrs: 'data-act="soon" data-arg="Game analysis"' })}
      ${tile({ ic: 'play-circle', label: 'Videos', soon: true, attrs: 'data-act="soon" data-arg="Videos"' })}
    </div>

    ${sectionHeader('Continue Learning', 'View all', `data-go="course-${course.id}"`)}
    <button class="card row-card continue" data-go="${next ? `lesson-${next.id}` : `course-${course.id}`}">
      <span class="thumb">${goldPiece('k', 66)}</span>
      <span class="grow"><strong class="h3 ellipsis">${esc(course.title)}</strong>
        <span class="small ellipsis">${next ? `Lesson ${course.lessons.findIndex((l) => l.id === next.id) + 1} · ${esc(next.title)}` : 'Course completed'}</span>
        <span class="inline">${progressBar(pct)}<b class="pct">${pct}%</b></span></span>
      <span class="play-btn">${icon('play', 20)}</span>
    </button>

    ${sectionHeader('Courses')}
    <div class="course-grid">
      ${COURSES.map((c) => {
        const n = c.lessons.filter((l) => done.includes(l.id)).length;
        return courseCard({ title: c.title, level: c.level, piece: c.id === 'basics' ? 'p' : 'q', footer: `${n}/${c.lessons.length} lessons`, attrs: `data-go="course-${c.id}"` });
      }).join('')}
      ${SOON_COURSES.map((c) => courseCard({ ...c, soon: true, attrs: `data-act="soon" data-arg="${c.title}"` })).join('')}
    </div>

    <div class="card row-card tinted mt-l">
      ${icon('bar-chart-2', 34)}
      <span class="grow"><strong class="h3">Track Your Progress</strong>
        <span class="small">${done.length} lessons · ${progress.puzzlesSolved.length} puzzles · ${s.wins} wins</span></span>
      ${pill('My Progress', { size: 'm', attrs: 'data-go="ranking"' })}
    </div>`,
  };
}

/* ================================================================ COURSE */
export function coursePage(courseId) {
  const course = COURSES.find((c) => c.id === courseId) ?? COURSES[0];
  const doneList = state.progress.lessonsDone;
  const done = course.lessons.filter((l) => doneList.includes(l.id)).length;
  return {
    title: course.title,
    sub: 'Course',
    back: 'learn',
    tab: 'learn',
    html: `<div class="narrow">
      ${hero(course.title, course.description, ['p'], 90)}
      <div class="inline">${progressBar((done / course.lessons.length) * 100)}<b class="pct">${done}/${course.lessons.length}</b></div>
      <div class="card list mt">
        ${course.lessons
          .map((l, i) => {
            const ok = doneList.includes(l.id);
            return `<button class="list-row lesson-row" data-go="lesson-${l.id}"><span class="num-badge ${ok ? 'ok' : ''}">${ok ? icon('check', 16) : i + 1}</span>
              <strong class="td grow">${esc(l.title)}</strong>${icon('chevron-right', 20)}</button>`;
          })
          .join('')}
      </div>
      <p class="small center mt">${icon('info', 13)} Click any piece on the lesson boards to see its moves.</p>
    </div>`,
  };
}

/* ================================================================ CUSTOM GAME */
const LEVEL_HELP = {
  1: 'Makes lots of mistakes. Perfect to learn the moves.',
  2: 'Plays simple moves. Great for your first wins.',
  3: 'Punishes pieces left undefended.',
  4: 'A real challenge. Think before every move!',
};

export function setupPage(initialMode) {
  const st = { mode: initialMode, level: state.settings.preferredLevel, color: 'w', tc: 0 };
  let root;
  const body = () => `
    <p class="label">OPPONENT</p>
    ${segmented([{ key: 'ai', label: 'Computer' }, { key: 'local', label: 'Friend (same device)' }], st.mode, 'mode')}
    ${
      st.mode === 'ai'
        ? `<p class="label">LEVEL</p>
      <div class="card options">${[1, 2, 3, 4]
        .map(
          (l) => `<button class="option ${l === st.level ? 'on' : ''}" aria-pressed="${l === st.level}" data-act="lvl" data-arg="${l}"><span class="radio"></span>
          <span class="grow"><strong class="h3">${AI_LEVELS[l].label}</strong><span class="small">${LEVEL_HELP[l]}</span></span></button>`,
        )
        .join('')}</div>
      <p class="label">YOU PLAY</p>
      ${segmented([{ key: 'w', label: 'White' }, { key: 'b', label: 'Black' }, { key: 'random', label: 'Random' }], st.color, 'color')}`
        : ''
    }
    <p class="label">CLOCK</p>
    <div class="chips">${TIME_CONTROLS.map((t, i) => `<button class="chip outline ${i === st.tc ? 'on' : ''}" aria-pressed="${i === st.tc}" data-act="tc" data-arg="${i}">${t.label}</button>`).join('')}</div>
    <p class="label">SUMMARY</p>
    <div class="card summary">
      <div><span class="small">Opponent</span><b>${st.mode === 'ai' ? `Computer · ${AI_LEVELS[st.level].label}` : 'Friend on this device'}</b></div>
      <div><span class="small">You play</span><b>${st.mode === 'ai' ? { w: 'White', b: 'Black', random: 'Random colour' }[st.color] : 'Both sides, in turn'}</b></div>
      <div><span class="small">Clock</span><b>${TIME_CONTROLS[st.tc].label}</b></div>
      <div><span class="small">Rating</span><b>${st.mode === 'ai' ? 'Counts for your Computer Rating' : 'Unrated'}</b></div>
    </div>
    <p class="small mt-s">${icon('info', 13)} ${st.mode === 'ai' ? 'Taking back a move makes the game unrated. ' : ''}${TIME_CONTROLS[st.tc].tc ? 'The clock pauses if you leave the page.' : ''}</p>
    ${nav.saved ? '<p class="small center mt-l warn-line">Starting will replace your unfinished game.</p>' : ''}
    ${pill('Start the Game', { icon: 'play', attrs: 'data-act="start"', cls: 'block mt-l' })}`;
  const refresh = () => (root.querySelector('.setup-body').innerHTML = body());
  return {
    title: 'Custom Game',
    sub: 'Custom Game',
    tab: 'play',
    html: `<div class="narrow"><h1 class="page-title desk-only">Custom Game</h1><div class="setup-body">${body()}</div></div>`,
    mount: (el) => (root = el),
    actions: {
      mode: (v) => ((st.mode = v), refresh()),
      lvl: (v) => ((st.level = +v), refresh()),
      color: (v) => ((st.color = v), refresh()),
      tc: (v) => ((st.tc = +v), refresh()),
      start: () => {
        const playerColor = st.color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : st.color;
        if (st.mode === 'ai') updateSettings({ preferredLevel: st.level });
        nav.startGame({ mode: st.mode, aiLevel: st.level, playerColor, timeControl: TIME_CONTROLS[st.tc].tc });
      },
    },
  };
}

/* ================================================================ PROFILE */
const TOGGLES = [
  { key: 'showHints', label: 'Hints & coach', help: 'Show possible moves, pieces in danger and friendly tips' },
  { key: 'showCoordinates', label: 'Coordinates', help: 'Letters and numbers on the board edge' },
  { key: 'autoFlip', label: 'Flip board each turn', help: 'Friend mode: the board turns to face the player to move' },
  { key: 'haptics', label: 'Vibrations', help: 'Small vibration on every move (on phones that support it)' },
];

export function profilePage() {
  const s = state.settings;
  const themes = THEMES.map((t) => {
    const sq = (i) =>
      `<span style="background:${i === 0 || i === 3 ? t.light : t.dark}">${i === 0 ? piece('n', 'b', t) : i === 3 ? piece('q', 'w', t) : ''}</span>`;
    return `<button class="theme ${t.id === s.themeId ? 'on' : ''}" aria-pressed="${t.id === s.themeId}" data-act="theme" data-arg="${t.id}">
      <span class="mini-board" style="background:${t.frame}"><span>${[0, 1, 2, 3].map(sq).join('')}</span></span>
      <span class="theme-name">${t.name}</span></button>`;
  }).join('');

  return {
    title: 'Profile & Settings',
    sub: 'Profile & Settings',
    html: `<div class="narrow">
      <div class="profile-top">${avatar(s.playerName, 88, 'var(--gold)')}<h1 class="page-title desk-only">Profile & Settings</h1></div>
      <p class="label">YOUR NAME</p>
      <input class="input" id="name" maxlength="20" placeholder="Player" value="${esc(s.playerName)}" autocomplete="off">
      <p class="label">BOARD THEME</p>
      <div class="theme-grid">${themes}</div>
      <p class="label">OPTIONS</p>
      <div class="card list">${TOGGLES.map(
        (o) => `<label class="toggle-row"><span class="grow"><strong class="h3">${o.label}</strong><span class="small">${o.help}</span></span>
          <input type="checkbox" class="switch" data-key="${o.key}" ${s[o.key] ? 'checked' : ''}></label>`,
      ).join('')}</div>
    </div>`,
    mount(el) {
      const input = el.querySelector('#name');
      input.addEventListener('input', () => {
        updateSettings({ playerName: input.value.slice(0, 20) });
        document.querySelectorAll('.topbar .avatar').forEach((a) => (a.textContent = (input.value.trim().charAt(0) || 'P').toUpperCase()));
      });
      input.addEventListener('blur', () => !input.value.trim() && (updateSettings({ playerName: 'Player' }), (input.value = 'Player')));
      el.querySelectorAll('.switch').forEach((c) => c.addEventListener('change', () => updateSettings({ [c.dataset.key]: c.checked })));
    },
    actions: {
      theme: (id, btn) => {
        updateSettings({ themeId: id });
        btn.parentElement.querySelectorAll('.theme').forEach((b) => {
          b.classList.toggle('on', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
      },
    },
  };
}

/* ================================================================ LEGAL NOTICE / MENTIONS LÉGALES */
const REPO = 'https://github.com/Sabriasna/Chesscend';
const HOST_ADDR = 'GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, United States';

export function legalPage() {
  const link = (href, text) => `<a class="text-link" href="${href}" target="_blank" rel="noopener">${text}</a>`;
  const issues = link(`${REPO}/issues`, 'github.com/Sabriasna/Chesscend/issues');
  const ghPrivacy = link('https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement', 'GitHub Privacy Statement');
  return {
    title: 'Legal notice',
    sub: 'Legal notice',
    tab: 'none',
    html: `<div class="narrow legal">
      <h1 class="page-title">Legal notice <span class="legal-fr">· Mentions légales</span></h1>
      <p class="small">Last updated: 23 November 2026 · Dernière mise à jour : 23 novembre 2026</p>

      <div class="card legal-block" lang="en">
        <h2 class="h3">Publisher</h2>
        <p class="body">Chesscend is a personal, non-commercial project published by a private individual. In line with Article 6, III, 2 of French law no. 2004-575 of 21 June 2004 (LCEN), the publisher's identity has been provided to the host.</p>
        <p class="body"><b>Contact:</b> ${issues}</p>
        <h2 class="h3">Host</h2>
        <p class="body">GitHub Pages, provided by ${HOST_ADDR}. Website: ${link('https://github.com', 'github.com')}.</p>
        <h2 class="h3">Your data</h2>
        <p class="body">Chesscend has no accounts and collects no personal data. Your name, settings, games and progress are saved only in your own browser (local storage) and are never sent to us. You can erase them at any time by clearing this site's data in your browser.</p>
        <p class="body">No cookies, no advertising, no analytics and no tracking. Fonts and images are served from this site: no request is made to Google or any other third party.</p>
        <p class="body">Like any web host, GitHub records visitors' IP addresses for security purposes when a GitHub Pages site is visited. See the ${ghPrivacy}.</p>
        <h2 class="h3">Intellectual property</h2>
        <p class="body">The name Chesscend, its design, texts and code belong to their author. Fonts: Poppins and Noto Sans Symbols 2, under the SIL Open Font License.</p>
      </div>

      <div class="card legal-block mt" lang="fr">
        <h2 class="h3">Éditeur</h2>
        <p class="body">Chesscend est un projet personnel et non commercial, édité par un particulier. Conformément à l'article 6, III, 2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN), l'identité de l'éditeur a été communiquée à l'hébergeur.</p>
        <p class="body"><b>Contact :</b> ${issues}</p>
        <h2 class="h3">Hébergeur</h2>
        <p class="body">GitHub Pages, service de ${HOST_ADDR.replace('United States', 'États-Unis')}. Site : ${link('https://github.com', 'github.com')}.</p>
        <h2 class="h3">Vos données</h2>
        <p class="body">Chesscend n'a pas de comptes et ne collecte aucune donnée personnelle. Votre prénom, vos réglages, vos parties et votre progression sont enregistrés uniquement dans votre navigateur (stockage local) et ne nous sont jamais transmis. Vous pouvez les effacer à tout moment en supprimant les données de ce site dans votre navigateur.</p>
        <p class="body">Aucun cookie, aucune publicité, aucune mesure d'audience, aucun pistage. Les polices et les images sont servies par ce site : aucune requête n'est envoyée à Google ni à un autre tiers.</p>
        <p class="body">Comme tout hébergeur, GitHub enregistre l'adresse IP des visiteurs d'un site GitHub Pages pour des raisons de sécurité. Voir la ${link('https://docs.github.com/fr/site-policy/privacy-policies/github-general-privacy-statement', 'déclaration de confidentialité de GitHub')}.</p>
        <h2 class="h3">Propriété intellectuelle</h2>
        <p class="body">Le nom Chesscend, son design, ses textes et son code appartiennent à leur auteur. Polices : Poppins et Noto Sans Symbols 2, sous licence SIL Open Font License.</p>
      </div>
    </div>`,
  };
}
