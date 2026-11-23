// Languages: English (default), French, Spanish.
// t('key', { var }) returns the text in the current language ({var} is replaced).
// A missing text falls back to English, so the site never shows an empty label.
import EN from './lang/en.js';
import FR from './lang/fr.js';
import ES from './lang/es.js';
import { CONTENT_FR } from './lang/content-fr.js';
import { CONTENT_ES } from './lang/content-es.js';

export const LANGS = [
  { code: 'en', name: 'English', short: 'EN', locale: 'en-GB' },
  { code: 'fr', name: 'Français', short: 'FR', locale: 'fr-FR' },
  { code: 'es', name: 'Español', short: 'ES', locale: 'es-ES' },
];
export const DICTS = { en: EN, fr: FR, es: ES };
const CONTENT = { fr: CONTENT_FR, es: CONTENT_ES };

let current = 'en';

export const lang = () => current;
export const locale = () => LANGS.find((l) => l.code === current).locale;
export function setLang(code) {
  current = DICTS[code] ? code : 'en';
  if (typeof document !== 'undefined') document.documentElement.lang = current;
}

/**
 * Text for a key. A value can be a string, or { one, other } for plurals (chosen with vars.n).
 */
export function t(key, vars = {}) {
  let v = DICTS[current][key] ?? EN[key];
  if (v === undefined) return key;
  if (typeof v === 'object') {
    const form = new Intl.PluralRules(locale()).select(vars.n ?? 0);
    v = v[form] ?? v.other;
  }
  return v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

/* ---------- names used in many places ---------- */
export const levelName = (l) => t(`level.${l}`);
export const reasonName = (r) => t(`reason.${r}`);
export const themeName = (id) => t(`theme.${id}`);
export const pieceName = (type) => t(`piece.${type}`);
export const colorName = (c) => t(c === 'w' ? 'color.white' : 'color.black');
export function tcName(tc) {
  if (!tc) return t('clock.none');
  return tc.increment ? `${tc.minutes} + ${tc.increment}` : t('clock.min', { m: tc.minutes });
}
/** The default name 'Player' is shown in the visitor's language. */
export const displayName = (n) => (!n || n === 'Player' ? t('profile.namePlaceholder') : n);
export const formatDate = (ms) => new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });

/* ---------- lessons, courses and puzzles (English is in src/data) ---------- */
export function courseText(c) {
  const tr = CONTENT[current]?.courses?.[c.id];
  return { title: tr?.title ?? c.title, description: tr?.description ?? c.description };
}
export function lessonText(l) {
  const tr = CONTENT[current]?.lessons?.[l.id];
  return { title: tr?.title ?? l.title, paragraphs: tr?.paragraphs ?? l.paragraphs };
}
export function puzzleText(p) {
  const tr = CONTENT[current]?.puzzles?.[p.id];
  return { title: tr?.title ?? p.title, hint: tr?.hint ?? p.hint };
}

/* ---------- coach messages (src/engine/coach.js gives a key and the facts) ---------- */
/**
 * msg: result of coachMessage(). side: colour of the player to move. vsComputer: game mode.
 */
export function coachText(msg, side, vsComputer) {
  const mode = vsComputer ? 'ai' : 'local';
  const v = msg.vars ?? {};
  const forms = (type) =>
    type
      ? {
          name: pieceName(type),
          your: t(`piece.${type}.your`),
          the: t(`piece.${type}.the`),
          a: t(`piece.${type}.a`),
        }
      : {};
  const p = forms(v.piece);
  const a = forms(v.attacker);
  const sideVars = {
    side: colorName(side),
    opp: colorName(side === 'w' ? 'b' : 'w'),
    sidePl: t(side === 'w' ? 'color.whitePl' : 'color.blackPl'),
    oppPl: t(side === 'w' ? 'color.blackPl' : 'color.whitePl'),
  };
  const vars = {
    ...sideVars,
    sq: v.square ?? '',
    piece: p.name,
    yourPiece: p.your,
    thePiece: p.the,
    aAttacker: a.a,
  };
  return t(`coach.${msg.key}.${mode}`, vars);
}
