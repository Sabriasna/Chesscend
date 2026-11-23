// Player accounts with Supabase Auth, without any external library (plain fetch calls).
// The session (access + refresh tokens) is kept in this browser only.
import { SUPABASE_KEY, SUPABASE_URL } from './config.js';

const SESSION_KEY = 'chesscend:session';
let session = readSession();
const listeners = new Set();

function readSession() {
  try {
    const s = JSON.parse(globalThis.localStorage?.getItem(SESSION_KEY) ?? 'null');
    return s && s.access_token && s.refresh_token && s.user?.id ? s : null;
  } catch {
    return null;
  }
}
function saveSession(s) {
  session = s;
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked: the session lives until the page is closed */
  }
  listeners.forEach((fn) => fn(s));
}
/** Calls fn(session) whenever the user logs in or out. */
export const onAuthChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const currentUser = () => session?.user ?? null;
export const isSignedIn = () => !!session;

/** Turns a token response into the session we keep. */
function toSession(r) {
  return {
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    expires_at: r.expires_at ?? Math.floor(Date.now() / 1000) + (r.expires_in ?? 3600),
    user: { id: r.user?.id, email: r.user?.email },
  };
}

/** Error with a code the pages translate (see auth.err.* in the dictionaries). */
export class AuthError extends Error {
  constructor(code, message = code, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function errorCode(status, body) {
  const c = body?.error_code || body?.code || body?.error || '';
  const msg = String(body?.msg || body?.message || body?.error_description || '').toLowerCase();
  if (status === 429 || c === 'over_email_send_rate_limit' || c === 'over_request_rate_limit') return 'rate';
  if (c === 'invalid_credentials' || msg.includes('invalid login')) return 'credentials';
  if (c === 'email_not_confirmed' || msg.includes('not confirmed')) return 'notConfirmed';
  if (c === 'user_already_exists' || c === 'email_exists' || msg.includes('already registered')) return 'exists';
  if (c === 'weak_password' || msg.includes('password should')) return 'weak';
  if (c === 'email_address_not_authorized' || msg.includes('not authorized')) return 'emailBlocked';
  if (c === 'email_address_invalid' || c === 'validation_failed' || msg.includes('invalid format')) return 'email';
  if (c === 'signup_disabled') return 'signupDisabled';
  if (c === 'same_password') return 'samePassword';
  if (status === 401 || c === 'session_not_found' || c === 'refresh_token_not_found' || c === 'bad_jwt') return 'session';
  if (msg.includes('database error saving new user') || c === '23505' || msg.includes('duplicate key')) return 'username';
  return 'unknown';
}

/** One request to Supabase. auth: true = as the signed-in user. */
async function call(path, { method = 'GET', body, auth = false, headers = {}, keepalive = false } = {}) {
  if (auth) await ensureFreshSession();
  const h = { apikey: SUPABASE_KEY, ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (auth && session) h.Authorization = `Bearer ${session.access_token}`;
  let res;
  try {
    res = await fetch(SUPABASE_URL + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), keepalive });
  } catch {
    throw new AuthError('network');
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new AuthError(errorCode(res.status, data), data?.msg || data?.message || String(res.status), res.status);
  return data;
}

let refreshing = null;
async function ensureFreshSession() {
  if (!session) throw new AuthError('session');
  if (session.expires_at - 60 > Date.now() / 1000) return;
  refreshing ??= call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } })
    .then((r) => saveSession(toSession({ ...r, user: r.user ?? session.user })))
    .catch((e) => {
      if (e.code !== 'network') saveSession(null); // refresh token no longer valid: signed out
      throw e;
    })
    .finally(() => (refreshing = null));
  return refreshing;
}

/** Address where e-mail links bring the player back (this page, without #…). */
export const redirectUrl = () => location.origin + location.pathname;

/* ---------------------------------------------------------------- account actions */

/** Returns { signedIn: true } or { confirmEmail: true } when the e-mail must be confirmed first. */
export async function signUp({ email, password, username }) {
  const r = await call(`/auth/v1/signup?redirect_to=${encodeURIComponent(redirectUrl())}`, {
    method: 'POST',
    body: { email, password, data: { username } },
  });
  if (r?.access_token) {
    saveSession(toSession(r));
    return { signedIn: true };
  }
  return { confirmEmail: true };
}

export async function signIn({ email, password }) {
  const r = await call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  saveSession(toSession(r));
}

export async function signOut() {
  try {
    if (session) await call('/auth/v1/logout', { method: 'POST', auth: true });
  } catch {
    /* signed out locally anyway */
  }
  saveSession(null);
}

export const sendPasswordReset = (email) =>
  call(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirectUrl())}`, { method: 'POST', body: { email } });

export const resendConfirmation = (email) =>
  call(`/auth/v1/resend?redirect_to=${encodeURIComponent(redirectUrl())}`, { method: 'POST', body: { type: 'signup', email } });

export async function updatePassword(password) {
  await call('/auth/v1/user', { method: 'PUT', auth: true, body: { password } });
}

export async function deleteAccount() {
  await call('/rest/v1/rpc/delete_my_account', { method: 'POST', auth: true, body: {} });
  saveSession(null);
}

/* ---------------------------------------------------------------- Google */

const OAUTH_FLAG = 'chesscend:oauth';

/** Is "Continue with Google" switched on in the Supabase project? */
export async function googleEnabled() {
  const s = await call('/auth/v1/settings');
  return !!s?.external?.google;
}

/** Sends the player to Google; they come back to this page already signed in. */
export async function signInWithGoogle() {
  if (!(await googleEnabled())) throw new AuthError('googleOff');
  try {
    sessionStorage.setItem(OAUTH_FLAG, '1');
  } catch {
    /* only used to choose the welcome message */
  }
  location.assign(`${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl())}`);
}

/** Name given automatically to a new Google account until the player chooses one. */
export const isDefaultUsername = (name) => /^player_[0-9a-f]{8}$/.test(name ?? '');

/** Changes the username shown to other players. */
export async function setUsername(username) {
  await call(`/rest/v1/profiles?id=eq.${session.user.id}`, {
    method: 'PATCH',
    auth: true,
    headers: { Prefer: 'return=minimal' },
    body: { username },
  });
}

export const usernameAvailable = (name) => call('/rest/v1/rpc/username_available', { method: 'POST', body: { name } });

/* ---------------------------------------------------------------- data (tables protected by RLS) */

export async function getProfile() {
  const rows = await call(`/rest/v1/profiles?select=username&id=eq.${session.user.id}`, { auth: true });
  return rows?.[0] ?? null;
}

export async function getUserData() {
  const rows = await call(`/rest/v1/user_data?select=settings,stats,progress,updated_at&user_id=eq.${currentUser().id}`, { auth: true });
  return rows?.[0] ?? null;
}

export async function putUserData(data, { keepalive = false } = {}) {
  await call('/rest/v1/user_data?on_conflict=user_id', {
    method: 'POST',
    auth: true,
    keepalive,
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: { user_id: currentUser().id, ...data, updated_at: new Date().toISOString() },
  });
}

/* ---------------------------------------------------------------- links from e-mails and Google */

/**
 * After clicking a link in an e-mail, or after choosing a Google account, Supabase sends
 * the player back with #access_token=…&type=signup|recovery (or #error=…).
 * Returns { type: 'signup' | 'recovery' | 'oauth' }, { error }, or null.
 */
export async function handleEmailRedirect(hash = location.hash) {
  if (!/(^|[#&])(access_token|error_code|error)=/.test(hash)) return null;
  let viaGoogle = false;
  try {
    viaGoogle = sessionStorage.getItem(OAUTH_FLAG) === '1';
    sessionStorage.removeItem(OAUTH_FLAG);
  } catch {
    /* ignore */
  }
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  viaGoogle ||= p.has('provider_token');
  if (p.get('error') || p.get('error_code'))
    return { error: p.get('error_code') || p.get('error'), description: p.get('error_description'), google: viaGoogle };
  const tokens = {
    access_token: p.get('access_token'),
    refresh_token: p.get('refresh_token'),
    expires_in: Number(p.get('expires_in') || 3600),
    expires_at: p.get('expires_at') ? Number(p.get('expires_at')) : undefined,
  };
  let user = null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${tokens.access_token}` } });
    if (res.ok) user = await res.json();
  } catch {
    /* handled below */
  }
  if (!user?.id) return { error: 'session' };
  saveSession(toSession({ ...tokens, user }));
  return { type: p.get('type') || (viaGoogle ? 'oauth' : 'signup') };
}
