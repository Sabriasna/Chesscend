// The 5 tabs (Home, Play, Ranking, Community, Learn) + Custom game, Profile, Course and Legal pages.
// Every text comes from t() (see i18n.js and the lang/ folder).
import { icon } from './icons.js';
import {
  avatar, badge, esc, goldPiece, goldScene, hero, piece, pill, progressBar, sectionHeader, segmented, tile, toast,
} from './ui.js';
import { BOT_RATING, ratingHistory, state, summarize, updateSettings } from './store.js';
import { loadLeaderboard } from './online.js';
import { leaderboardView } from './leaderboard.js';
import { nav } from './app.js';
import {
  LANGS, courseText, displayName, formatDate, lang, lessonText, levelName, puzzleText, reasonName, t, tcName, themeName,
} from './i18n.js';
import { LEGAL } from './lang/legal.js';
import { accountCard } from './account.js';
import { isSignedIn } from './auth.js';
import { ALL_LESSONS, COURSES } from '../../src/data/lessons.js';
import { PUZZLES } from '../../src/data/puzzles.js';
import { QUICK, TIME_CONTROLS } from '../../src/data/timeControls.js';
import { THEMES } from '../../src/theme/themes.js';

const QUICK_ICON = { blitz: { ic: 'zap' }, rapid: { ic: 'clock' }, classical: { glyph: 'n' } };
const quickTiles = (dark) =>
  Object.entries(QUICK)
    .map(([k, q]) => tile({ ...QUICK_ICON[k], label: t(`quick.${k}`), sub: tcName({ ...q.tc, increment: 0 }), dark, attrs: `data-act="quick" data-arg="${k}"` }))
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
        <span class="grow"><strong class="h3">${t('home.continueGame')}</strong>
        <span class="small">${saved.config.mode === 'ai' ? t('game.vsComputerLevel', { level: levelName(saved.config.aiLevel) }) : t('game.vsFriend')} · ${t('common.moves', { n: saved.moves.length })} · ${tcName(saved.config.timeControl)}</span></span>
        ${icon('play-circle', 30)}
      </button>`
    : '';

  return {
    title: t('nav.home'),
    html: `
    <section class="home-hero">
      <div class="home-hero-text">
        <p class="tagline">${t('brand.tagline')}</p>
        <h1 class="display">${t('home.headline')}</h1>
        <p class="lead">${t('home.lead')}</p>
        <div class="cta-row">
          ${pill(t('common.playNow'), { icon: 'play', attrs: 'data-act="quick"' })}
          ${pill(t('home.startLearning'), { variant: 'light', attrs: 'data-go="learn"' })}
        </div>
      </div>
      <div class="home-hero-art">${goldScene(['n', 'k'], 170)}</div>
    </section>

    <div class="grid home-top">
      <div class="stack">
        <button class="card row-card player" data-go="ranking">
          ${avatar(displayName(settings.playerName), 56, 'var(--gold-light)')}
          <span class="grow"><strong class="h3 ellipsis">${esc(displayName(settings.playerName))}</strong>
            <span class="inline">${icon('bar-chart-2', 15)} <span class="elo">${stats.rating} <span class="hide-sm">${t('rating.computer')}</span><span class="show-sm">${t('rating.short')}</span></span></span></span>
          <span class="divider"></span>
          <span class="games"><b>${s.played}</b><span class="small">${t('common.gamesWord', { n: s.played })}</span></span>
          ${icon('chevron-right', 22)}
        </button>
        ${resume}
        ${pill(t('common.playNow'), { icon: 'play', attrs: 'data-act="quick"', cls: 'block mobile-only' })}
      </div>
      <div class="tiles tiles-4">
        ${quickTiles(false)}
        ${tile({ ic: 'plus', label: t('quick.custom'), sub: t('quick.customSub'), attrs: 'data-go="setup"' })}
      </div>
    </div>

    ${sectionHeader(t('learn.continue'), t('common.viewAll'), 'data-go="learn"')}
    <div class="grid cols-2">
      <button class="card row-card lesson" data-go="${nextLesson ? `lesson-${nextLesson.id}` : 'learn'}">
        <span class="lesson-art">${icon('school', 34)}</span>
        <span class="grow">
          <strong class="h3 ellipsis">${nextLesson ? esc(lessonText(nextLesson).title) : t('home.allLessonsDone')}</strong>
          <span class="small">${nextLesson ? t('home.lessonOf', { i: ALL_LESSONS.indexOf(nextLesson) + 1, n: ALL_LESSONS.length }) : t('home.greatWork')}</span>
          <span class="inline">${progressBar(lessonPct)}<b class="pct">${lessonPct}%</b></span>
        </span>
      </button>
      <div class="card row-card puzzle-card tinted">
        ${icon('puzzle', 30)}
        <span class="grow"><strong class="h3">${t('home.puzzleChallenge')}</strong>
          <span class="small">${t('home.puzzlesSolved', { done: progress.puzzlesSolved.length, n: PUZZLES.length })}</span></span>
        ${nextPuzzle ? pill(t('home.solve'), { size: 'm', attrs: `data-go="puzzle-${nextPuzzle.id}"` }) : badge(t('home.allDone'), 'green')}
      </div>
    </div>

    ${sectionHeader(t('home.yourProgress'), t('nav.ranking'), 'data-go="ranking"')}
    <div class="grid cols-3 progress-row">
      <button class="card prog-card" data-go="ranking">${icon('robot', 24)}<span class="small">${t('rating.computer')}</span><b class="num">${stats.rating}</b>
        <span class="small">${s.played ? t('home.winsInGames', { wins: t('common.winsN', { n: s.wins }), games: t('common.gamesN', { n: s.played }) }) : t('home.playToClimb')}</span></button>
      <button class="card prog-card" data-go="learn">${icon('school', 24)}<span class="small">${t('learn.lessons')}</span><b class="num">${progress.lessonsDone.length}<small> / ${ALL_LESSONS.length}</small></b>
        <span class="small">${nextLesson ? t('home.next', { name: esc(lessonText(nextLesson).title) }) : t('home.allCoursesDone')}</span></button>
      <button class="card prog-card" data-go="${nextPuzzle ? `puzzle-${nextPuzzle.id}` : 'puzzles'}">${icon('puzzle', 24)}<span class="small">${t('learn.puzzles')}</span><b class="num">${progress.puzzlesSolved.length}<small> / ${PUZZLES.length}</small></b>
        <span class="small">${nextPuzzle ? t('home.next', { name: esc(puzzleText(nextPuzzle).title) }) : t('home.allPuzzlesSolved')}</span></button>
    </div>
    <div class="card row-card compete mt">
      ${icon('crown', 30, 'gold')}
      <span class="grow"><strong class="h3">${t('home.competeTitle')}</strong><span class="small">${t('home.competeText')}</span></span>
      ${pill(t('home.seeRankings'), { size: 'm', variant: 'light', attrs: 'data-go="ranking"' })}
    </div>`,
  };
}

/* ================================================================ PLAY */
export function playPage() {
  const { settings, stats } = state;
  const s = summarize();
  const level = settings.preferredLevel;
  return {
    title: t('nav.play'),
    html: `
    ${hero(t('nav.play'), t('play.subtitle'), ['p', 'n'])}
    <p class="mode-line">${icon('info', 15)} <span>${t('play.quickLine', { level: levelName(level) })}</span></p>
    <div class="tiles tiles-3">${quickTiles(true)}</div>
    <div class="tiles tiles-3 mt">
      ${tile({ ic: 'swords', label: t('play.friend'), sub: t('play.friendSub'), attrs: 'data-go="setup-friend"' })}
      ${tile({ ic: 'users', label: t('play.findOpponent'), sub: t('play.findOpponentSub'), soon: true, attrs: 'data-act="soon" data-arg="online"' })}
      ${tile({ ic: 'sliders', label: t('play.custom'), sub: t('quick.customSub'), attrs: 'data-go="setup"' })}
    </div>

    <div class="grid cols-2 mt-l">
      <div class="card">
        <div class="card-head">${icon('robot', 26)}<strong class="h3 grow">${t('play.computerLevel')}</strong><span class="small">${t('play.forQuickGames')}</span></div>
        <div class="chips">${[1, 2, 3, 4]
          .map((l) => `<button class="chip ${l === level ? 'on' : ''}" aria-pressed="${l === level}" data-act="level" data-arg="${l}">${levelName(l)}</button>`)
          .join('')}</div>
        ${pill(t('play.startGame'), { icon: 'play', attrs: 'data-act="quick"', cls: 'block mt' })}
      </div>
      <div>
        ${sectionHeader(t('play.yourRanking'), t('play.viewStats'), 'data-go="ranking"').replace('section-head', 'section-head tight')}
        <div class="card stat-row">
          <div class="stat">${icon('trophy', 28, 'gold')}<b class="num">${s.wins}</b><span class="small">${t('stats.wins')}</span></div>
          <span class="vsep"></span>
          <div class="stat">${icon('bar-chart-2', 24)}<b class="num">${stats.rating}</b><span class="small">${t('rating.computer')}</span></div>
          <span class="vsep"></span>
          <div class="stat">${icon(s.week >= 0 ? 'trending-up' : 'trending-down', 24, s.week >= 0 ? 'gold' : 'red')}<b class="num">${s.week > 0 ? `+${s.week}` : s.week}</b><span class="small">${t('stats.thisWeek')}</span></div>
        </div>
      </div>
    </div>

    ${sectionHeader(t('play.modes'))}
    <div class="card list modes">
      <div class="list-row">${icon('robot', 22)}<span class="grow"><strong class="td">${t('play.mode.ai')}</strong><span class="small">${t('play.mode.aiText')}</span></span>${badge(t('rating.computer'), 'green')}</div>
      <div class="list-row">${icon('swords', 22)}<span class="grow"><strong class="td">${t('play.mode.local')}</strong><span class="small">${t('play.mode.localText')}</span></span>${badge(t('common.unrated'))}</div>
      <div class="list-row is-off">${icon('users', 22)}<span class="grow"><strong class="td">${t('play.mode.online')}</strong><span class="small">${t('play.mode.onlineText')}</span></span>${badge(t('common.notAvailable'), 'dark')}</div>
    </div>
    <p class="small mt-s">${icon('clock', 13)} ${t('play.pauseNote')}</p>`,
    actions: {
      level: (l) => {
        updateSettings({ preferredLevel: +l });
        nav.go('play');
      },
    },
  };
}

/* ================================================================ RANKING */
let rankingTab = 'me';

/** Small line chart of the Computer Rating, drawn from the saved results only. */
function sparkline(points) {
  if (points.length < 2) return `<p class="small spark-empty">${t('ranking.sparkEmpty')}</p>`;
  const w = 300;
  const h = 70;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(1, max - min);
  const xy = points.map((p, i) => [((i / (points.length - 1)) * (w - 8) + 4).toFixed(1), (h - 6 - ((p - min) / span) * (h - 12)).toFixed(1)]);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const [lx, ly] = xy[xy.length - 1];
  const label = t('ranking.sparkLabel', { n: points.length - 1, from: points[0], to: points[points.length - 1] });
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${esc(label)}">
    <path d="${line} L${w - 4} ${h} L4 ${h} Z" fill="rgba(224,168,46,0.16)"/><path d="${line}" fill="none" stroke="#A8741A" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${lx}" cy="${ly}" r="4" fill="#111"/></svg>
    <div class="spark-scale"><span>${min}</span><span>${max}</span></div>`;
}

function resultBadge(g) {
  if (g.mode !== 'ai') return badge(t(g.result === 'draw' ? 'result.draw' : g.result === 'white' ? 'result.whiteWon' : 'result.blackWon'));
  const word = t(g.result === 'win' ? 'result.win' : g.result === 'loss' ? 'result.loss' : 'result.draw');
  const tone = g.result === 'win' ? 'green' : g.result === 'loss' ? 'red' : 'gold';
  if (!g.rated) return badge(`${word} · ${t('common.unratedLower')}`, tone);
  return badge(`${word} ${g.change > 0 ? '▲ +' : g.change < 0 ? '▼ ' : '± '}${g.change}`, tone);
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
        .map(
          (g) => `<div class="list-row">${icon(g.mode === 'ai' ? 'cpu' : 'users', 18)}
            <span class="grow"><strong class="td">${g.mode === 'ai' ? t('game.vsLevel', { level: levelName(g.level) }) : t('game.friendGame')}</strong>
            <span class="small">${reasonName(g.reason)} · ${t('common.moves', { n: g.moves })}${g.date ? ` · ${formatDate(g.date)}` : ''}</span></span>${resultBadge(g)}</div>`,
        )
        .join('')}</div>`
    : `<div class="card state-card"><div class="state-art">${goldPiece('p', 44)}</div><h3 class="state-title">${t('ranking.noGames')}</h3><p class="state-text">${t('ranking.noGamesText')}</p><div class="state-actions">${pill(t('common.startPlaying'), { icon: 'play', size: 'm', attrs: 'data-act="quick"' })}</div></div>`;

  return `
    <div class="grid cols-2 rating-cards">
      <div class="card rating-card">
        <div class="card-head">${icon('robot', 24)}<strong class="h3 grow">${t('rating.computer')}</strong>${badge(t('common.active'), 'green')}</div>
        <div class="rating-big"><b>${stats.rating}</b><span class="small">${t('ranking.bestWeek', { best: s.best, week: `${s.week > 0 ? '+' : ''}${s.week}` })}</span></div>
        ${sparkline(hist)}
        <p class="small">${t('ranking.computerText')}</p>
      </div>
      <div class="card rating-card">
        <div class="card-head">${icon('users', 24)}<strong class="h3 grow">${t('rating.online')}</strong>${badge(t('common.notAvailable'), 'gold')}</div>
        <div class="rating-big"><b class="muted-num">—</b><span class="small">${t('ranking.notRated')}</span></div>
        <p class="small">${t('ranking.onlineText')}</p>
      </div>
    </div>
    <div class="podium">
      ${side(s.wins, t('stats.wins'), 'var(--silver)', 'trophy')}
      <div class="podium-main">
        ${icon('crown', 34, 'gold')}
        <div class="laurel">${icon('leaf', 30, 'gold leaf-l')}${avatar(displayName(settings.playerName), 104, 'var(--gold)')}${icon('leaf', 30, 'gold leaf-r')}</div>
        <div class="base main-base">${stats.rating}</div>
        <strong class="h3 ellipsis">${esc(displayName(settings.playerName))}</strong>
        <span class="small">${t('rating.computer')}</span>
      </div>
      ${side(`${s.winRate}%`, t('stats.winRate'), 'var(--bronze)', 'percent')}
    </div>
    <div class="card totals">
      <div><b class="num">${s.played}</b><span class="small">${t('stats.gamesVsComputer')}</span></div>
      <div><b class="num green">${s.wins}</b><span class="small">${t('stats.wins')}</span></div>
      <div><b class="num">${s.draws}</b><span class="small">${t('stats.draws')}</span></div>
      <div><b class="num red">${s.losses}</b><span class="small">${t('stats.losses')}</span></div>
    </div>
    ${s.friendGames ? `<p class="small center mt-s">${t('ranking.friendGames', { n: s.friendGames })}</p>` : ''}
    <div class="grid cols-2">
      <div>${sectionHeader(t('ranking.record'))}
        <div class="card list"><table class="table"><caption class="sr-only">${t('ranking.recordCaption')}</caption><thead><tr><th class="left" scope="col">${t('ranking.level')}</th><th scope="col">${t('rating.short')}</th><th scope="col"><abbr title="${t('stats.wins')}">${t('stats.w')}</abbr></th><th scope="col"><abbr title="${t('stats.draws')}">${t('stats.d')}</abbr></th><th scope="col"><abbr title="${t('stats.losses')}">${t('stats.l')}</abbr></th></tr></thead><tbody>
        ${record
          .map(
            (r) => `<tr><td class="left"><span class="inline">${icon('robot', 20)} ${levelName(r.level)}</span></td><td>${BOT_RATING[r.level]}</td>
            <td class="green">${r.wins}</td><td>${r.draws}</td><td class="red">${r.losses}</td></tr>`,
          )
          .join('')}
        </tbody></table></div>
      </div>
      <div>${sectionHeader(t('ranking.recent'))}${recent}</div>
    </div>
    <p class="small center mt-l">${icon('info', 13)} ${t('ranking.localNote')}</p>`;
}

export function rankingPage() {
  let root;
  const tabs = () =>
    segmented(
      [
        { key: 'me', label: t('ranking.tab.me') },
        { key: 'global', label: t('ranking.tab.global') },
        { key: 'friends', label: t('ranking.tab.friends') },
      ],
      rankingTab,
      'rtab',
      t('ranking.views'),
    );
  const intro = () => t(`ranking.intro.${rankingTab}`);
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
    root.querySelector('.rank-intro').textContent = intro();
    fill();
  };
  return {
    title: t('nav.ranking'),
    html: `
    ${hero(t('nav.ranking'), t('ranking.subtitle'), ['n', 'k'], 96)}
    <div class="narrow-center"><div class="rank-tabs">${tabs()}</div><p class="small center mt-s rank-intro">${intro()}</p></div>
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
    { id: 'players', ic: 'users' },
    { id: 'friends', ic: 'user-plus' },
    { id: 'clubs', ic: 'shield' },
    { id: 'discussions', ic: 'message-circle' },
  ];
  return {
    title: t('nav.community'),
    html: `
    ${hero(t('nav.community'), t('community.subtitle'), ['p', 'n'])}
    <div class="tiles tiles-4">
      ${tile({ ic: 'users', label: t('community.players'), attrs: 'data-act="jump" data-arg="players"' })}
      ${tile({ ic: 'user-plus', label: t('community.friends'), attrs: 'data-act="jump" data-arg="friends"' })}
      ${tile({ ic: 'shield', label: t('community.clubs'), attrs: 'data-act="jump" data-arg="clubs"' })}
      ${tile({ ic: 'message-circle', label: t('community.forums'), attrs: 'data-act="jump" data-arg="discussions"' })}
    </div>
    <div class="card row-card tinted mt-l community-note">
      ${icon('info', 24)}
      <span class="grow"><strong class="h3">${t('community.noteTitle')}</strong>
      <span class="small">${t('community.noteText')}</span></span>
    </div>
    <div class="grid cols-2 mt">
      ${SECTIONS.map(
        (c) => `<section class="card comm-card" id="c-${c.id}" tabindex="-1" aria-labelledby="h-${c.id}">
          <div class="card-head"><span class="round-ic">${icon(c.ic, 24)}</span><h2 class="h3 grow" id="h-${c.id}">${t(`community.${c.id}.title`)}</h2>${badge(t('common.notAvailable'), 'dark')}</div>
          <p class="body">${t(`community.${c.id}.text`)}</p>
          <p class="small empty-line">${icon('clock', 13)} ${t(`community.${c.id}.empty`)}</p>
        </section>`,
      ).join('')}
    </div>
    <div class="card row-card tinted mt-l">
      ${icon('crown', 34)}
      <span class="grow"><strong class="h3">${t('community.meanwhile')}</strong><span class="small">${t('community.meanwhileText')}</span></span>
      ${pill(t('nav.play'), { size: 'm', attrs: 'data-go="setup-friend"' })}
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
  { id: 'tactics', level: 'intermediate', piece: 'n' },
  { id: 'endgames', level: 'advanced', piece: 'k' },
];

function courseCard({ title, level, piece: pc, footer, soon, attrs }) {
  return `<button class="card course-card ${soon ? 'is-soon' : ''}" ${attrs}>
    <span class="course-art">${goldPiece(pc, 76)}${soon ? badge(t('common.soon'), 'dark', 'corner') : ''}</span>
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
    title: t('nav.learn'),
    html: `
    ${hero(t('nav.learn'), t('learn.subtitle'), ['b', 'n'])}
    <div class="tiles tiles-4">
      ${tile({ ic: 'school', label: t('learn.courses'), attrs: `data-go="course-${course.id}"` })}
      ${tile({ ic: 'puzzle', label: t('learn.puzzles'), attrs: `data-go="${nextPuzzle ? `puzzle-${nextPuzzle.id}` : 'puzzles'}"` })}
      ${tile({ ic: 'bar-chart-2', label: t('learn.analysis'), soon: true, attrs: 'data-act="soon" data-arg="analysis"' })}
      ${tile({ ic: 'play-circle', label: t('learn.videos'), soon: true, attrs: 'data-act="soon" data-arg="videos"' })}
    </div>

    ${sectionHeader(t('learn.continue'), t('common.viewAll'), `data-go="course-${course.id}"`)}
    <button class="card row-card continue" data-go="${next ? `lesson-${next.id}` : `course-${course.id}`}">
      <span class="thumb">${goldPiece('k', 66)}</span>
      <span class="grow"><strong class="h3 ellipsis">${esc(courseText(course).title)}</strong>
        <span class="small ellipsis">${next ? t('learn.lessonDot', { i: course.lessons.findIndex((l) => l.id === next.id) + 1, title: esc(lessonText(next).title) }) : t('learn.courseCompleted')}</span>
        <span class="inline">${progressBar(pct)}<b class="pct">${pct}%</b></span></span>
      <span class="play-btn">${icon('play', 20)}</span>
    </button>

    ${sectionHeader(t('learn.courses'))}
    <div class="course-grid">
      ${COURSES.map((c) => {
        const n = c.lessons.filter((l) => done.includes(l.id)).length;
        return courseCard({ title: courseText(c).title, level: t('learn.level.beginner'), piece: c.id === 'basics' ? 'p' : 'q', footer: t('learn.lessonsCount', { done: n, n: c.lessons.length }), attrs: `data-go="course-${c.id}"` });
      }).join('')}
      ${SOON_COURSES.map((c) => courseCard({ title: t(`learn.soon.${c.id}`), level: t(`learn.level.${c.level}`), piece: c.piece, soon: true, attrs: `data-act="soon" data-arg="course"` })).join('')}
    </div>

    <div class="card row-card tinted mt-l">
      ${icon('bar-chart-2', 34)}
      <span class="grow"><strong class="h3">${t('learn.track')}</strong>
        <span class="small">${t('learn.trackText', { lessons: done.length, puzzles: progress.puzzlesSolved.length, wins: s.wins })}</span></span>
      ${pill(t('learn.myProgress'), { size: 'm', attrs: 'data-go="ranking"' })}
    </div>`,
  };
}

/* ================================================================ COURSE */
export function coursePage(courseId) {
  const course = COURSES.find((c) => c.id === courseId) ?? COURSES[0];
  const ct = courseText(course);
  const doneList = state.progress.lessonsDone;
  const done = course.lessons.filter((l) => doneList.includes(l.id)).length;
  return {
    title: ct.title,
    sub: t('learn.course'),
    back: 'learn',
    tab: 'learn',
    html: `<div class="narrow">
      ${hero(ct.title, ct.description, ['p'], 90)}
      <div class="inline">${progressBar((done / course.lessons.length) * 100)}<b class="pct">${done}/${course.lessons.length}</b></div>
      <div class="card list mt">
        ${course.lessons
          .map((l, i) => {
            const ok = doneList.includes(l.id);
            return `<button class="list-row lesson-row" data-go="lesson-${l.id}"><span class="num-badge ${ok ? 'ok' : ''}">${ok ? icon('check', 16) : i + 1}</span>
              <strong class="td grow">${esc(lessonText(l).title)}</strong>${ok ? `<span class="sr-only">${t('learn.done')}</span>` : ''}${icon('chevron-right', 20)}</button>`;
          })
          .join('')}
      </div>
      <p class="small center mt">${icon('info', 13)} ${t('learn.boardTip')}</p>
    </div>`,
  };
}

/* ================================================================ CUSTOM GAME */
export function setupPage(initialMode) {
  const st = { mode: initialMode, level: state.settings.preferredLevel, color: 'w', tc: 0 };
  let root;
  const body = () => `
    <p class="label">${t('setup.opponent')}</p>
    ${segmented([{ key: 'ai', label: t('setup.computer') }, { key: 'local', label: t('setup.friend') }], st.mode, 'mode')}
    ${
      st.mode === 'ai'
        ? `<p class="label">${t('setup.level')}</p>
      <div class="card options">${[1, 2, 3, 4]
        .map(
          (l) => `<button class="option ${l === st.level ? 'on' : ''}" aria-pressed="${l === st.level}" data-act="lvl" data-arg="${l}"><span class="radio"></span>
          <span class="grow"><strong class="h3">${levelName(l)}</strong><span class="small">${t(`level.${l}.help`)}</span></span></button>`,
        )
        .join('')}</div>
      <p class="label">${t('setup.youPlay')}</p>
      ${segmented([{ key: 'w', label: t('color.white') }, { key: 'b', label: t('color.black') }, { key: 'random', label: t('setup.random') }], st.color, 'color')}`
        : ''
    }
    <p class="label">${t('setup.clock')}</p>
    <div class="chips">${TIME_CONTROLS.map((tc, i) => `<button class="chip outline ${i === st.tc ? 'on' : ''}" aria-pressed="${i === st.tc}" data-act="tc" data-arg="${i}">${tcName(tc.tc)}</button>`).join('')}</div>
    <p class="label">${t('setup.summary')}</p>
    <div class="card summary">
      <div><span class="small">${t('setup.sumOpponent')}</span><b>${st.mode === 'ai' ? t('game.computerLevel', { level: levelName(st.level) }) : t('setup.friendHere')}</b></div>
      <div><span class="small">${t('setup.sumYouPlay')}</span><b>${st.mode === 'ai' ? { w: t('color.white'), b: t('color.black'), random: t('setup.randomColour') }[st.color] : t('setup.bothSides')}</b></div>
      <div><span class="small">${t('setup.sumClock')}</span><b>${tcName(TIME_CONTROLS[st.tc].tc)}</b></div>
      <div><span class="small">${t('setup.sumRating')}</span><b>${st.mode === 'ai' ? t('setup.counts') : t('common.unrated')}</b></div>
    </div>
    ${(() => {
      const note = `${st.mode === 'ai' ? `${t('setup.undoNote')} ` : ''}${TIME_CONTROLS[st.tc].tc ? t('setup.pauseNote') : ''}`.trim();
      return note ? `<p class="small mt-s">${icon('info', 13)} ${note}</p>` : '';
    })()}
    ${nav.saved ? `<p class="small center mt-l warn-line">${t('setup.replaceWarning')}</p>` : ''}
    ${pill(t('setup.start'), { icon: 'play', attrs: 'data-act="start"', cls: 'block mt-l' })}`;
  const refresh = () => (root.querySelector('.setup-body').innerHTML = body());
  return {
    title: t('play.custom'),
    sub: t('play.custom'),
    tab: 'play',
    html: `<div class="narrow"><h1 class="page-title desk-only">${t('play.custom')}</h1><div class="setup-body">${body()}</div></div>`,
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
const TOGGLES = ['showHints', 'showCoordinates', 'autoFlip', 'haptics'];

export function profilePage() {
  const s = state.settings;
  // Changes stay on the page until "Save" is pressed.
  const savedValues = () => ({
    playerName: state.settings.playerName === 'Player' ? '' : state.settings.playerName,
    lang: lang(),
    themeId: state.settings.themeId,
    ...Object.fromEntries(TOGGLES.map((k) => [k, !!state.settings[k]])),
  });
  let draft = savedValues();
  let root = null;
  const changed = () => JSON.stringify(draft) !== JSON.stringify(savedValues());
  const refresh = () => {
    if (!root) return;
    const dirty = changed();
    root.querySelector('#save-settings').disabled = !dirty;
    root.querySelector('.save-hint').hidden = !dirty;
  };
  const pick = (btn) =>
    btn.parentElement.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });

  const themes = THEMES.map((th) => {
    const sq = (i) =>
      `<span style="background:${i === 0 || i === 3 ? th.light : th.dark}">${i === 0 ? piece('n', 'b', th) : i === 3 ? piece('q', 'w', th) : ''}</span>`;
    return `<button type="button" class="theme ${th.id === s.themeId ? 'on' : ''}" aria-pressed="${th.id === s.themeId}" data-act="theme" data-arg="${th.id}">
      <span class="mini-board" style="background:${th.frame}"><span>${[0, 1, 2, 3].map(sq).join('')}</span></span>
      <span class="theme-name">${themeName(th.id)}</span></button>`;
  }).join('');

  return {
    title: t('profile.title'),
    sub: t('profile.title'),
    html: `<div class="narrow">
      ${accountCard()}
      <div class="profile-top">${avatar(displayName(s.playerName), 88, 'var(--gold)')}<h1 class="page-title desk-only">${t('profile.title')}</h1></div>
      <form class="settings-form" data-form="settings" novalidate>
      <p class="label" id="lbl-name">${t('profile.name')}</p>
      <input class="input" id="name" maxlength="20" placeholder="${t('profile.namePlaceholder')}" value="${esc(draft.playerName)}" autocomplete="off" aria-labelledby="lbl-name">
      <p class="label">${t('profile.language')}</p>
      ${segmented(LANGS.map((l) => ({ key: l.code, label: l.name })), lang(), 'draft-lang').replaceAll('<button ', '<button type="button" ')}
      <p class="label">${t('profile.theme')}</p>
      <div class="theme-grid">${themes}</div>
      <p class="label">${t('profile.options')}</p>
      <div class="card list">${TOGGLES.map(
        (k) => `<label class="toggle-row"><span class="grow"><strong class="h3">${t(`profile.${k}`)}</strong><span class="small">${t(`profile.${k}.help`)}</span></span>
          <input type="checkbox" class="switch" data-key="${k}" ${s[k] ? 'checked' : ''}></label>`,
      ).join('')}</div>
      <div class="save-bar">
        <p class="small save-hint" role="status" hidden>${icon('info', 13)} ${t('profile.unsavedHint')}</p>
        <button class="pill pill-dark pill-l block" type="submit" id="save-settings" disabled>${t('profile.save')}</button>
      </div>
      </form>
      <p class="small center mt-l">${icon('info', 13)} ${t(isSignedIn() ? 'auth.syncedNote' : 'profile.localNote')}</p>
    </div>`,
    mount(el) {
      root = el;
      const input = el.querySelector('#name');
      input.addEventListener('input', () => {
        draft.playerName = input.value.trim().slice(0, 20);
        refresh();
      });
      el.querySelectorAll('.switch').forEach((c) =>
        c.addEventListener('change', () => {
          draft[c.dataset.key] = c.checked;
          refresh();
        }),
      );
      el.querySelector('form[data-form="settings"]').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!changed()) return;
        const newLang = draft.lang !== lang() ? draft.lang : null;
        // An empty name means the default name ("Player", shown in the visitor's language).
        updateSettings({
          playerName: draft.playerName || 'Player',
          themeId: draft.themeId,
          ...Object.fromEntries(TOGGLES.map((k) => [k, draft[k]])),
        });
        draft = savedValues();
        if (newLang) {
          root = null; // the page is drawn again in the new language
          nav.setLanguage(newLang);
        } else {
          const first = (draft.playerName || displayName('Player')).charAt(0).toUpperCase();
          document.querySelectorAll('.topbar .avatar, .profile-top .avatar').forEach((a) => (a.textContent = first));
          refresh();
        }
        toast(t('profile.saved'));
      });
    },
    unmount() {
      if (root && changed()) toast(t('profile.unsavedLost'), 5000);
      root = null;
    },
    actions: {
      theme: (id, btn) => {
        draft.themeId = id;
        pick(btn);
        refresh();
      },
      'draft-lang': (code, btn) => {
        draft.lang = code;
        pick(btn);
        refresh();
      },
    },
  };
}

/* ================================================================ LEGAL NOTICE / MENTIONS LÉGALES */
const REPO = 'https://github.com/Sabriasna/Chesscend';
const HOST = 'GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107';
const GH_PRIVACY = (l) => `https://docs.github.com/${l}/site-policy/privacy-policies/github-general-privacy-statement`;

/** The legal notice in one language (texts in lang/legal.js). */
function legalBlock(code) {
  const link = (href, text) => `<a class="text-link" href="${href}" target="_blank" rel="noopener">${text}</a>`;
  const L = LEGAL[code];
  return `<div class="card legal-block mt" lang="${code}">
    <h2 class="h3">${L.publisherTitle}</h2>
    <p class="body">${L.publisher}</p>
    <p class="body"><b>${L.contact}</b> ${link(`${REPO}/issues`, 'github.com/Sabriasna/Chesscend/issues')}</p>
    <h2 class="h3">${L.hostTitle}</h2>
    <p class="body">${L.host.replace('{host}', `${HOST}, ${L.usa}`).replace('{site}', link('https://github.com', 'github.com'))}</p>
    <h2 class="h3">${L.dataTitle}</h2>
    <p class="body">${L.data1}</p>
    <p class="body">${L.data2}</p>
    <p class="body">${L.data3.replace('{link}', link(GH_PRIVACY(code), L.ghPrivacy))}</p>
    <h2 class="h3">${L.accountTitle}</h2>
    <p class="body">${L.account1}</p>
    <p class="body">${L.account2}</p>
    <h2 class="h3">${L.ipTitle}</h2>
    <p class="body">${L.ip}</p>
  </div>`;
}

export function legalPage() {
  const code = lang();
  // The French version (French law) is always shown, after the one in the visitor's language.
  const blocks = code === 'fr' ? [legalBlock('fr')] : [legalBlock(code), legalBlock('fr')];
  return {
    title: t('legal.title'),
    sub: t('legal.title'),
    tab: 'none',
    html: `<div class="narrow legal">
      <h1 class="page-title">${t('legal.title')}${code !== 'fr' ? ' <span class="legal-fr">· Mentions légales</span>' : ''}</h1>
      <p class="small">${t('legal.updated')}</p>
      ${blocks.join('')}
    </div>`,
  };
}
