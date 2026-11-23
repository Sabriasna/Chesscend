// The 5 tabs (Home, Play, Ranking, Community, Learn) + Custom game, Profile and Course pages.
import { icon } from './icons.js';
import {
  avatar, badge, esc, goldPiece, goldScene, hero, piece, pill, progressBar, sectionHeader, segmented, tile,
} from './ui.js';
import { BOT_RATING, state, summarize, updateSettings } from './store.js';
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
        <p class="tagline">PLAY  •  LEARN  •  ASCEND</p>
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
            <span class="inline">${icon('bar-chart-2', 15)} <span class="elo">${stats.rating} rating</span></span></span>
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

    <section class="features">
      <div class="feature">${icon('robot', 28)}<h3>4 computer levels</h3><p>From Beginner to Hard: start easy, get your first wins, then raise the challenge.</p></div>
      <div class="feature">${icon('bulb', 28)}<h3>A friendly coach</h3><p>It warns you when a piece is in danger and gives simple tips during the game.</p></div>
      <div class="feature">${icon('school', 28)}<h3>Learn step by step</h3><p>${ALL_LESSONS.length} interactive lessons and ${PUZZLES.length} checkmate puzzles for beginners.</p></div>
    </section>`,
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
    <div class="tiles tiles-3">${quickTiles(true)}</div>
    <div class="tiles tiles-3 mt">
      ${tile({ ic: 'swords', label: 'Play a Friend', sub: 'Same device', attrs: 'data-go="setup-friend"' })}
      ${tile({ ic: 'users', label: 'Find Opponent', sub: 'Online', soon: true, attrs: 'data-act="soon" data-arg="Online play"' })}
      ${tile({ ic: 'sliders', label: 'Custom Game', sub: 'Your rules', attrs: 'data-go="setup"' })}
    </div>

    <div class="grid cols-2 mt-l">
      <div class="card">
        <div class="card-head">${icon('robot', 26)}<strong class="h3 grow">Computer level</strong><span class="small">for quick games</span></div>
        <div class="chips">${[1, 2, 3, 4]
          .map((l) => `<button class="chip ${l === level ? 'on' : ''}" data-act="level" data-arg="${l}">${AI_LEVELS[l].label}</button>`)
          .join('')}</div>
        ${pill('Start a Game', { icon: 'play', attrs: 'data-act="quick"', cls: 'block mt' })}
      </div>
      <div>
        ${sectionHeader('Your Ranking', 'View stats', 'data-go="ranking"').replace('section-head', 'section-head tight')}
        <div class="card stat-row">
          <div class="stat">${icon('trophy', 28, 'gold')}<b class="num">${s.wins}</b><span class="small">Wins</span></div>
          <span class="vsep"></span>
          <div class="stat">${icon('bar-chart-2', 24)}<b class="num">${stats.rating}</b><span class="small">Rating</span></div>
          <span class="vsep"></span>
          <div class="stat">${icon(s.week >= 0 ? 'trending-up' : 'trending-down', 24, s.week >= 0 ? 'gold' : 'red')}<b class="num">${s.week > 0 ? `+${s.week}` : s.week}</b><span class="small">This week</span></div>
        </div>
      </div>
    </div>`,
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

export function rankingPage() {
  const { settings, stats } = state;
  const s = summarize();
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
          const b =
            g.mode === 'ai'
              ? badge(
                  g.result === 'win' ? `Win ▲ ${g.change}` : g.result === 'loss' ? `Loss ▼ ${Math.abs(g.change)}` : `Draw ${g.change >= 0 ? '+' : ''}${g.change}`,
                  g.result === 'win' ? 'green' : g.result === 'loss' ? 'red' : 'gold',
                )
              : badge(g.result === 'draw' ? 'Draw' : g.result === 'white' ? 'White won' : 'Black won');
          return `<div class="list-row">${icon(g.mode === 'ai' ? 'cpu' : 'users', 18)}
            <span class="grow"><strong class="td">${g.mode === 'ai' ? `vs ${esc(AI_LEVELS[g.level]?.label ?? 'Computer')}` : 'Friend game'}</strong>
            <span class="small">${REASONS[g.reason] ?? ''} · ${g.moves} moves · ${new Date(g.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></span>${b}</div>`;
        })
        .join('')}</div>`
    : `<div class="card empty">${goldPiece('p', 40)}<p>No games yet. Play your first game!</p>${pill('Play now', { size: 'm', attrs: 'data-act="quick"' })}</div>`;

  return {
    title: 'Ranking',
    html: `
    ${hero('Ranking', 'Track your progress game after game.', ['n', 'k'], 96)}
    <div class="narrow-center">
      ${segmented([{ key: 'me', label: 'My stats' }, { key: 'global', label: 'Global', disabled: true }, { key: 'friends', label: 'Friends', disabled: true }], 'me', 'noop')}
      <p class="small center mt-s">Global and friends rankings arrive with online play.</p>
    </div>
    <div class="podium">
      ${side(s.wins, 'Wins', 'var(--silver)', 'trophy')}
      <div class="podium-main">
        ${icon('crown', 34, 'gold')}
        <div class="laurel">${icon('leaf', 30, 'gold leaf-l')}${avatar(settings.playerName, 104, 'var(--gold)')}${icon('leaf', 30, 'gold leaf-r')}</div>
        <div class="base main-base">${stats.rating}</div>
        <strong class="h3 ellipsis">${esc(settings.playerName)}</strong>
        <span class="small">Rating vs computer</span>
      </div>
      ${side(`${s.winRate}%`, 'Win rate', 'var(--bronze)', 'percent')}
    </div>
    <div class="card totals">
      <div><b class="num">${s.played}</b><span class="small">Games</span></div>
      <div><b class="num green">${s.wins}</b><span class="small">Wins</span></div>
      <div><b class="num">${s.draws}</b><span class="small">Draws</span></div>
      <div><b class="num red">${s.losses}</b><span class="small">Losses</span></div>
    </div>
    <div class="grid cols-2">
      <div>${sectionHeader('Record vs Computer')}
        <div class="card list"><table class="table"><thead><tr><th class="left">Level</th><th>Rating</th><th>W</th><th>D</th><th>L</th></tr></thead><tbody>
        ${record
          .map(
            (r) => `<tr><td class="left"><span class="inline">${icon('robot', 20)} ${AI_LEVELS[r.level].label}</span></td><td>${BOT_RATING[r.level]}</td>
            <td class="green">${r.wins}</td><td>${r.draws}</td><td class="red">${r.losses}</td></tr>`,
          )
          .join('')}
        </tbody></table></div>
      </div>
      <div>${sectionHeader('Recent Games')}${recent}</div>
    </div>`,
    actions: { noop: () => {} },
  };
}

/* ================================================================ COMMUNITY */
const UPCOMING = [
  { ic: 'user-plus', title: 'Play with friends online', text: 'Send an invitation code and play from anywhere.' },
  { ic: 'search', title: 'Find an opponent', text: 'Get matched with players of your level.' },
  { ic: 'shield', title: 'Clubs and events', text: 'Join a club, take part in friendly tournaments.' },
];

export function communityPage() {
  return {
    title: 'Community',
    html: `
    ${hero('Community', 'Connect, share and grow with other chess players.', ['p', 'n'])}
    <div class="tiles tiles-4">
      ${tile({ ic: 'users', label: 'Players', soon: true, attrs: 'data-act="soon" data-arg="Players"' })}
      ${tile({ ic: 'message-circle', label: 'Forums', soon: true, attrs: 'data-act="soon" data-arg="Forums"' })}
      ${tile({ ic: 'shield', label: 'Clubs', soon: true, attrs: 'data-act="soon" data-arg="Clubs"' })}
      ${tile({ ic: 'calendar', label: 'Events', soon: true, attrs: 'data-act="soon" data-arg="Events"' })}
    </div>
    ${sectionHeader('Coming Soon')}
    <div class="grid cols-3 upcoming">
      ${UPCOMING.map((u) => `<div class="card up-card"><span class="round-ic">${icon(u.ic, 26)}</span><strong class="h3">${u.title}</strong><span class="small">${u.text}</span></div>`).join('')}
    </div>
    <div class="card row-card tinted mt-l">
      ${icon('crown', 34)}
      <span class="grow"><strong class="h3">Meanwhile, play a friend</strong><span class="small">Share the screen and play on the same device.</span></span>
      ${pill('Play', { size: 'm', attrs: 'data-go="setup-friend"' })}
    </div>`,
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
          (l) => `<button class="option ${l === st.level ? 'on' : ''}" data-act="lvl" data-arg="${l}"><span class="radio"></span>
          <span class="grow"><strong class="h3">${AI_LEVELS[l].label}</strong><span class="small">${LEVEL_HELP[l]}</span></span></button>`,
        )
        .join('')}</div>
      <p class="label">YOU PLAY</p>
      ${segmented([{ key: 'w', label: 'White' }, { key: 'b', label: 'Black' }, { key: 'random', label: 'Random' }], st.color, 'color')}`
        : ''
    }
    <p class="label">CLOCK</p>
    <div class="chips">${TIME_CONTROLS.map((t, i) => `<button class="chip outline ${i === st.tc ? 'on' : ''}" data-act="tc" data-arg="${i}">${t.label}</button>`).join('')}</div>
    ${nav.saved ? '<p class="small center mt-l">Your unfinished game will be replaced.</p>' : ''}
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
    return `<button class="theme ${t.id === s.themeId ? 'on' : ''}" data-act="theme" data-arg="${t.id}">
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
        btn.parentElement.querySelectorAll('.theme').forEach((b) => b.classList.toggle('on', b === btn));
      },
    },
  };
}
