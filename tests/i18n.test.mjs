// Translation checks: nothing missing, same placeholders, lessons complete, no raw keys on screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DICTS, LANGS, coachText, lessonText, puzzleText, courseText, setLang, t, tcName } from '../web/js/i18n.js';
import { LEGAL } from '../web/js/lang/legal.js';
import { ALL_LESSONS, COURSES } from '../src/data/lessons.js';
import { PUZZLES } from '../src/data/puzzles.js';
import { THEMES } from '../src/theme/themes.js';
import { Game } from '../src/engine/chess.js';
import { coachMessage, findThreats } from '../src/engine/coach.js';

const EN = DICTS.en;
const OPTIONAL = (k) => k.startsWith('nav.short.'); // shorter tab labels, only where a language needs them
const placeholders = (v) => {
  const s = typeof v === 'object' ? Object.values(v).join(' ') : v;
  return [...new Set(s.match(/\{\w+\}/g) || [])].sort();
};

test('English is the default language', () => {
  assert.equal(LANGS[0].code, 'en');
  setLang('xx');
  assert.equal(t('nav.home'), 'Home');
});

for (const code of ['fr', 'es']) {
  test(`${code}: every text exists, with the same placeholders`, () => {
    const D = DICTS[code];
    const missing = Object.keys(EN).filter((k) => !(k in D));
    const extra = Object.keys(D).filter((k) => !(k in EN) && !OPTIONAL(k));
    assert.deepEqual(missing, [], 'missing translations');
    assert.deepEqual(extra, [], 'keys unknown in English');
    for (const k of Object.keys(EN)) {
      if (k.startsWith('coach.')) {
        // Coach sentences may name the side differently ("White's", "des Blancs", "de las blancas")
        const allowed = ['{aAttacker}', '{opp}', '{oppPl}', '{piece}', '{side}', '{sidePl}', '{sq}', '{thePiece}', '{yourPiece}'];
        placeholders(D[k]).forEach((p) => assert.ok(allowed.includes(p), `${k}: ${p}`));
        assert.equal(placeholders(D[k]).includes('{sq}'), placeholders(EN[k]).includes('{sq}'), `square in ${k}`);
      } else assert.deepEqual(placeholders(D[k]), placeholders(EN[k]), `placeholders of ${k}`);
      assert.equal(typeof D[k], typeof EN[k], `plural form of ${k}`);
      assert.ok(String(typeof D[k] === 'object' ? D[k].other : D[k]).trim(), `empty text ${k}`);
    }
  });

  test(`${code}: all lessons, courses and puzzles are translated`, () => {
    setLang(code);
    for (const l of ALL_LESSONS) {
      const tr = lessonText(l);
      assert.notEqual(tr.title, l.title, `lesson ${l.id} title`);
      assert.equal(tr.paragraphs.length, l.paragraphs.length, `lesson ${l.id} paragraphs`);
    }
    for (const c of COURSES) assert.notEqual(courseText(c).description, c.description, c.id);
    for (const p of PUZZLES) assert.notEqual(puzzleText(p).hint, p.hint, p.id);
  });
}

test('legal notice has the same parts in every language', () => {
  for (const code of ['fr', 'es']) assert.deepEqual(Object.keys(LEGAL[code]).sort(), Object.keys(LEGAL.en).sort());
});

test('every text key used in the code exists in English', () => {
  const dir = new URL('../web/js/', import.meta.url);
  const code = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
  const prefixes = Object.keys(EN).map((k) => k.split('.')[0]);
  const used = [...code.matchAll(/'([a-z]+\.[a-zA-Z0-9_.]+)'/g)].map((m) => m[1]).filter((k) => prefixes.includes(k.split('.')[0]));
  // Keys built from variables
  const dyn = [];
  for (const l of [1, 2, 3, 4]) dyn.push(`level.${l}`, `level.${l}.help`);
  for (const p of 'kqrbnp') dyn.push(`piece.${p}`, `piece.${p}.your`, `piece.${p}.the`, `piece.${p}.a`);
  for (const th of THEMES) dyn.push(`theme.${th.id}`);
  for (const r of ['checkmate', 'stalemate', 'threefold', 'fifty', 'material', 'timeout', 'resign']) dyn.push(`reason.${r}`, `end.reason.${r}`);
  for (const k of ['check', 'retake', 'lost', 'threatCheaper', 'threatFree', 'tipStart', 'tipDevelop']) dyn.push(`coach.${k}.ai`, `coach.${k}.local`);
  for (const c of ['players', 'friends', 'clubs', 'discussions']) dyn.push(`community.${c}.title`, `community.${c}.text`, `community.${c}.empty`);
  for (const k of ['showHints', 'showCoordinates', 'autoFlip', 'haptics']) dyn.push(`profile.${k}`, `profile.${k}.help`);
  for (const k of ['blitz', 'rapid', 'classical']) dyn.push(`quick.${k}`);
  for (const k of ['me', 'global', 'friends']) dyn.push(`ranking.intro.${k}`, `ranking.tab.${k}`);
  for (const k of ['online', 'analysis', 'videos', 'course']) dyn.push(`soon.feature.${k}`);
  for (const k of ['tactics', 'endgames']) dyn.push(`learn.soon.${k}`);
  for (const k of ['beginner', 'intermediate', 'advanced']) dyn.push(`learn.level.${k}`);
  for (const k of ['home', 'play', 'ranking', 'community', 'learn']) dyn.push(`nav.${k}`);
  dyn.push('sq.piece.w', 'sq.piece.b');
  const unknown = [...new Set([...used, ...dyn])].filter((k) => !(k in EN) && !OPTIONAL(k));
  assert.deepEqual(unknown, []);
});

test('coach messages are complete in every language and mode', () => {
  // Positions that trigger each kind of message
  const cases = [
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', []], // tipStart
    ['rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', ['Nf3']], // tipDevelop (after a move)
    ['4k3/8/8/8/8/8/3q4/4K3 w - - 0 1', []], // check
    ['4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 1', []], // threat (knight attacked by a pawn)
  ];
  const seen = new Set();
  for (const code of ['en', 'fr', 'es']) {
    setLang(code);
    for (const [fen, moves] of cases) {
      const g = new Game(fen);
      moves.forEach((m) => g.playSan(m));
      const msg = coachMessage(g, findThreats(g.pos, g.pos.turn), { you: 'you', your: 'your', opponent: 'The computer' });
      if (!msg) continue;
      seen.add(msg.key);
      for (const vsComputer of [true, false]) {
        const text = coachText(msg, g.pos.turn, vsComputer);
        assert.doesNotMatch(text, /\{\w+\}|undefined|coach\./, `${code} ${msg.key}: ${text}`);
      }
    }
  }
  assert.ok(seen.has('check') && seen.has('tipStart'), [...seen].join(','));
});

test('clock names and plurals', () => {
  setLang('fr');
  assert.equal(tcName(null), 'Sans pendule');
  assert.equal(tcName({ minutes: 3, increment: 2 }), '3 + 2');
  assert.equal(t('common.moves', { n: 1 }), '1 coup');
  assert.equal(t('common.moves', { n: 0 }), '0 coup');
  assert.equal(t('common.moves', { n: 5 }), '5 coups');
  setLang('es');
  assert.equal(t('common.moves', { n: 1 }), '1 jugada');
  assert.equal(t('common.moves', { n: 2 }), '2 jugadas');
  setLang('en');
  assert.equal(t('common.moves', { n: 0 }), '0 moves');
});
