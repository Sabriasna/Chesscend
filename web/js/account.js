// Account pages: create an account, log in, forgotten password, manage the account.
import { icon } from './icons.js';
import { avatar, esc, openModal, pill, segmented, toast } from './ui.js';
import * as auth from './auth.js';
import { logOut, onSyncChange, syncNow, syncStatus } from './sync.js';
import { nav } from './app.js';
import { displayName, t } from './i18n.js';
import { isPersistent, state } from './store.js';

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let view = 'login'; // login | signup | forgot | checkEmail
let pendingEmail = '';

const field = (id, label, type, extra = '') => `<label class="field" for="${id}"><span class="field-label">${label}</span>
  <input class="input" id="${id}" name="${id}" type="${type}" ${extra}></label>`;
const errorBox = () => '<p class="form-error" role="alert" hidden></p>';

function showError(form, code, raw) {
  const box = form.querySelector('.form-error');
  box.hidden = false;
  box.textContent = t(`auth.err.${code}`) + (code === 'unknown' && raw ? ` (${raw})` : '');
}
function busy(form, on) {
  form.querySelectorAll('button, input').forEach((el) => (el.disabled = on));
  form.classList.toggle('is-busy', on);
}

/* ================================================================ signed out */
function signedOutHtml() {
  if (view === 'checkEmail')
    return `<div class="card state-card">
      <div class="state-art">${icon('message-circle', 38, 'gold')}</div>
      <h2 class="state-title">${t('auth.check.title')}</h2>
      <p class="state-text">${t('auth.check.text', { email: `<b>${esc(pendingEmail)}</b>` })}</p>
      <div class="state-actions">${pill(t('auth.check.resend'), { size: 'm', variant: 'light', attrs: 'data-act="resend"' })}
      ${pill(t('auth.login'), { size: 'm', attrs: 'data-act="view" data-arg="login"' })}</div>
    </div>`;

  if (view === 'forgot')
    return `<form class="card auth-form" data-form="forgot" novalidate>
      <h2 class="h3">${t('auth.forgot.title')}</h2>
      <p class="small">${t('auth.forgot.text')}</p>
      ${field('email', t('auth.email'), 'email', 'autocomplete="email" required')}
      ${errorBox()}
      <button class="pill pill-dark pill-l block" type="submit">${t('auth.forgot.send')}</button>
      <button class="link-btn center-link" type="button" data-act="view" data-arg="login">${t('auth.backToLogin')}</button>
    </form>`;

  const tabs = segmented([{ key: 'login', label: t('auth.login') }, { key: 'signup', label: t('auth.signup') }], view, 'view', t('auth.title'));
  const form =
    view === 'login'
      ? `<form class="card auth-form" data-form="login" novalidate>
      ${field('email', t('auth.email'), 'email', 'autocomplete="email" required')}
      ${field('password', t('auth.password'), 'password', 'autocomplete="current-password" required')}
      ${errorBox()}
      <button class="pill pill-dark pill-l block" type="submit">${t('auth.login')}</button>
      <button class="link-btn center-link" type="button" data-act="view" data-arg="forgot">${t('auth.forgotLink')}</button>
    </form>`
      : `<form class="card auth-form" data-form="signup" novalidate>
      ${field('username', t('auth.username'), 'text', 'autocomplete="username" maxlength="20" required pattern="[A-Za-z0-9_.\\-]{3,20}" aria-describedby="username-help"')}
      <p class="small field-help" id="username-help">${t('auth.usernameHelp')}</p>
      ${field('email', t('auth.email'), 'email', 'autocomplete="email" required')}
      ${field('password', t('auth.password'), 'password', 'autocomplete="new-password" minlength="8" required aria-describedby="password-help"')}
      <p class="small field-help" id="password-help">${t('auth.passwordHelp')}</p>
      <label class="check-row"><input type="checkbox" id="consent" required> <span>${t('auth.consent', { link: `<a class="text-link" href="#legal" target="_blank">${t('legal.title')}</a>` })}</span></label>
      ${errorBox()}
      <button class="pill pill-dark pill-l block" type="submit">${t('auth.createAccount')}</button>
      <p class="small center">${icon('info', 13)} ${t('auth.mergeNote')}</p>
    </form>`;
  return `<div class="narrow-center">${tabs}</div><div class="auth-wrap mt">${form}</div>
    <div class="auth-perks">
      <div>${icon('smartphone', 22)}<span>${t('auth.perk.devices')}</span></div>
      <div>${icon('bar-chart-2', 22)}<span>${t('auth.perk.history')}</span></div>
      <div>${icon('trophy', 22)}<span>${t('auth.perk.ranking')}</span></div>
    </div>`;
}

async function submitLogin(form) {
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!EMAIL_RE.test(email)) return showError(form, 'email');
  if (!password) return showError(form, 'credentials');
  busy(form, true);
  try {
    await auth.signIn({ email, password });
    await syncNow();
    toast(t('auth.welcomeBack'));
    nav.go('account');
  } catch (e) {
    busy(form, false);
    if (e.code === 'notConfirmed') pendingEmail = email;
    showError(form, e.code, e.message);
  }
}

async function submitSignup(form) {
  const username = form.username.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!USERNAME_RE.test(username)) return showError(form, 'usernameFormat');
  if (!EMAIL_RE.test(email)) return showError(form, 'email');
  if (password.length < 8) return showError(form, 'weak');
  if (!form.consent.checked) return showError(form, 'consent');
  busy(form, true);
  try {
    if (!(await auth.usernameAvailable(username))) {
      busy(form, false);
      return showError(form, 'username');
    }
    const r = await auth.signUp({ email, password, username });
    if (r.signedIn) {
      await syncNow();
      toast(t('auth.welcome', { name: username }));
      nav.go('account');
    } else {
      pendingEmail = email;
      view = 'checkEmail';
      nav.go('account');
    }
  } catch (e) {
    busy(form, false);
    showError(form, e.code, e.message);
  }
}

async function submitForgot(form) {
  const email = form.email.value.trim();
  if (!EMAIL_RE.test(email)) return showError(form, 'email');
  busy(form, true);
  try {
    await auth.sendPasswordReset(email);
    toast(t('auth.forgot.sent'), 7000);
    view = 'login';
    nav.go('account');
  } catch (e) {
    busy(form, false);
    showError(form, e.code, e.message);
  }
}

/* ================================================================ signed in */
function statusLine() {
  const { status, lastSync } = syncStatus();
  const time = lastSync ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const ic = { synced: 'check-circle', syncing: 'refresh-cw', offline: 'x-circle', error: 'x-circle', idle: 'info' }[status];
  return `<span class="sync-line sync-${status}">${icon(ic, 16)} ${t(`sync.${status}`, { time })}</span>`;
}

function signedInHtml() {
  const u = auth.currentUser();
  return `<div class="card account-card">
      <div class="account-head">${avatar(displayName(state.settings.playerName), 64, 'var(--gold)')}
        <div class="grow"><strong class="h3 ellipsis account-name">${esc(displayName(state.settings.playerName))}</strong>
        <span class="small ellipsis">${esc(u.email ?? '')}</span>
        <div class="sync-slot">${statusLine()}</div></div></div>
      <div class="account-actions">
        ${pill(t('sync.now'), { icon: 'refresh-cw', variant: 'light', size: 'm', attrs: 'data-act="sync"' })}
        ${pill(t('auth.logout'), { icon: 'arrow-right', size: 'm', attrs: 'data-act="logout"' })}
      </div>
    </div>
    <p class="small mt-s">${icon('info', 13)} ${t('auth.syncedNote')}</p>

    <form class="card auth-form mt-l" data-form="password" novalidate>
      <h2 class="h3">${t('auth.changePassword')}</h2>
      ${field('password', t('auth.newPassword'), 'password', 'autocomplete="new-password" minlength="8" required')}
      ${errorBox()}
      <button class="pill pill-light pill-m" type="submit">${t('auth.savePassword')}</button>
    </form>

    <div class="card danger-card mt-l">
      <h2 class="h3">${t('auth.delete.title')}</h2>
      <p class="small">${t('auth.delete.text')}</p>
      <button class="pill pill-m danger-btn" data-act="delete">${icon('x-circle', 16)}<span>${t('auth.delete.button')}</span></button>
    </div>`;
}

async function submitPassword(form, after) {
  const password = form.password.value;
  if (password.length < 8) return showError(form, 'weak');
  busy(form, true);
  try {
    await auth.updatePassword(password);
    toast(t('auth.passwordSaved'));
    after();
  } catch (e) {
    busy(form, false);
    showError(form, e.code, e.message);
  }
}

/* ================================================================ page */
export function accountPage() {
  let unsub = null;
  const signedIn = auth.isSignedIn();
  return {
    title: t('auth.title'),
    sub: t('auth.title'),
    back: 'profile',
    tab: 'none',
    html: `<div class="narrow account-page">
      <h1 class="page-title desk-only">${t(signedIn ? 'auth.myAccount' : 'auth.title')}</h1>
      ${signedIn ? '' : `<p class="lead-small">${t('auth.intro')}</p>`}
      <div class="account-body">${signedIn ? signedInHtml() : signedOutHtml()}</div>
      ${isPersistent() ? '' : `<p class="small warn-line mt">${t('footer.blocked')}</p>`}
    </div>`,
    mount(el) {
      el.querySelectorAll('form[data-form]').forEach((form) =>
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const f = form.dataset.form;
          if (f === 'login') submitLogin(form);
          if (f === 'signup') submitSignup(form);
          if (f === 'forgot') submitForgot(form);
          if (f === 'password') submitPassword(form, () => form.reset() || busy(form, false));
        }),
      );
      unsub = onSyncChange(() => {
        const slot = el.querySelector('.sync-slot');
        if (slot) slot.innerHTML = statusLine();
        const name = el.querySelector('.account-name');
        if (name) name.textContent = displayName(state.settings.playerName);
      });
      el.querySelector('input')?.focus({ preventScroll: true });
    },
    unmount: () => unsub?.(),
    actions: {
      view: (v) => {
        view = v;
        nav.go('account');
      },
      resend: async () => {
        try {
          await auth.resendConfirmation(pendingEmail);
          toast(t('auth.check.resent'));
        } catch (e) {
          toast(t(`auth.err.${e.code}`));
        }
      },
      sync: () => syncNow(),
      logout: async () => {
        if (await logOut()) {
          toast(t('auth.loggedOut'));
          nav.go('home');
          return;
        }
        const m = openModal(`<div class="sheet-icon">${icon('x-circle', 34)}</div><h3>${t('auth.logoutUnsaved.title')}</h3><p>${t('auth.logoutUnsaved.text')}</p>
          <div class="sheet-actions">${pill(t('common.tryAgain'), { attrs: 'data-m="retry"' })}${pill(t('auth.logoutUnsaved.force'), { variant: 'light', size: 'm', attrs: 'data-m="force"' })}</div>`);
        m.el.querySelector('[data-m="retry"]').onclick = () => (m.close(), syncNow());
        m.el.querySelector('[data-m="force"]').onclick = async () => {
          m.close();
          await logOut({ force: true });
          nav.go('home');
        };
      },
      delete: () => {
        const m = openModal(`<div class="sheet-icon danger-ic">${icon('x-circle', 34)}</div><h3>${t('auth.delete.confirmTitle')}</h3><p>${t('auth.delete.confirmText')}</p>
          <div class="sheet-actions"><button class="pill pill-l danger-btn" data-m="yes"><span>${t('auth.delete.confirmButton')}</span></button>${pill(t('auth.delete.cancel'), { variant: 'light', size: 'm', attrs: 'data-m="no"' })}</div>`);
        m.el.querySelector('[data-m="no"]').onclick = m.close;
        m.el.querySelector('[data-m="yes"]').onclick = async (e) => {
          e.currentTarget.disabled = true;
          try {
            await auth.deleteAccount();
            m.close();
            toast(t('auth.delete.done'), 6000);
            nav.go('home');
          } catch (err) {
            m.close();
            toast(t(`auth.err.${err.code}`));
          }
        };
      },
    },
  };
}

/** Page reached from the "reset your password" e-mail. */
export function resetPasswordPage() {
  const ok = auth.isSignedIn();
  return {
    title: t('auth.reset.title'),
    sub: t('auth.reset.title'),
    back: 'account',
    tab: 'none',
    html: `<div class="narrow account-page">
      <h1 class="page-title desk-only">${t('auth.reset.title')}</h1>
      ${
        ok
          ? `<form class="card auth-form" data-form="reset" novalidate>
        <p class="small">${t('auth.reset.text')}</p>
        ${field('password', t('auth.newPassword'), 'password', 'autocomplete="new-password" minlength="8" required')}
        <p class="small field-help">${t('auth.passwordHelp')}</p>
        ${errorBox()}
        <button class="pill pill-dark pill-l block" type="submit">${t('auth.savePassword')}</button>
      </form>`
          : `<div class="card state-card"><h2 class="state-title">${t('auth.linkExpired')}</h2>
        <div class="state-actions">${pill(t('auth.forgotLink'), { size: 'm', attrs: 'data-go="account"' })}</div></div>`
      }
    </div>`,
    mount(el) {
      const form = el.querySelector('form[data-form="reset"]');
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        submitPassword(form, () => nav.go('account'));
      });
      form?.querySelector('input')?.focus({ preventScroll: true });
    },
  };
}

/** Small card for the Profile page. */
export function accountCard() {
  if (!auth.isSignedIn())
    return `<div class="card row-card tinted account-teaser">
      ${icon('user-plus', 30)}
      <span class="grow"><strong class="h3">${t('auth.teaser.title')}</strong><span class="small">${t('auth.teaser.text')}</span></span>
      ${pill(t('auth.teaser.button'), { size: 'm', attrs: 'data-go="account"' })}
    </div>`;
  return `<button class="card row-card account-teaser" data-go="account">
      ${icon('check-circle', 26, 'green')}
      <span class="grow"><strong class="h3 ellipsis">${t('auth.signedInAs', { email: esc(auth.currentUser().email ?? '') })}</strong><span class="small">${t('auth.teaser.signedIn')}</span></span>
      ${icon('chevron-right', 22)}
    </button>`;
}
