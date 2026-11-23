"""End-to-end tests of the website in a real browser (Chrome), served like GitHub Pages
under /Chesscend/. Requires Python Playwright and Chrome.
Run: python3 tests/browser/e2e.py
"""
import asyncio
import json
import urllib.parse
import mimetypes
import sys
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
HOST = 'http://chesscend.test'
SITE = f'{HOST}/Chesscend/web/'
CHROME = '/usr/bin/google-chrome'
results = []
SUPA = 'https://umisavpcofubvegdmglc.supabase.co'


class FakeSupabase:
    """A small stand-in for Supabase Auth + database (same requests and answers), with the
    same rule as the real database: each user reaches only their own rows."""

    def __init__(self, confirm_email=False, google=False):
        self.confirm_email = confirm_email
        self.google = google
        self.users = {}      # email -> {id, password, username, confirmed}
        self.tokens = {}     # access or refresh token -> user id
        self.data = {}       # user id -> {settings, stats, progress}
        self.n = 0

    def _session(self, u):
        self.n += 1
        at, rt = f'at{self.n}', f'rt{self.n}'
        self.tokens[at] = u['id']
        self.tokens[rt] = u['id']
        return {'access_token': at, 'refresh_token': rt, 'expires_in': 3600, 'token_type': 'bearer',
                'user': {'id': u['id'], 'email': u['email']}}

    def _user_by_id(self, uid):
        return next((u for u in self.users.values() if u['id'] == uid), None)

    async def handle(self, route):
        req = route.request
        cors = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*',
                'content-type': 'application/json'}
        if req.method == 'OPTIONS':
            return await route.fulfill(status=204, headers=cors)
        path = req.url[len(SUPA):]
        body = json.loads(req.post_data) if req.post_data else {}
        token = (req.headers.get('authorization') or '').replace('Bearer ', '')
        uid = self.tokens.get(token)

        def out(status, payload=None):
            return route.fulfill(status=status, headers=cors, body=json.dumps(payload) if payload is not None else '')

        if path == '/auth/v1/settings':
            return await out(200, {'external': {'email': True, 'google': self.google}})
        if path.startswith('/auth/v1/authorize?provider=google'):
            # stands for Google's page: the player picks an account and comes back signed in
            back = urllib.parse.unquote(path.split('redirect_to=')[1])
            u = self.users.get('g@gmail.com')
            if not u:
                n = len(self.users) + 1
                u = {'id': f'user-{n}', 'email': 'g@gmail.com', 'password': None, 'username': f'player_{n:08x}', 'confirmed': True}
                self.users[u['email']] = u
                self.data[u['id']] = {'settings': {}, 'stats': {}, 'progress': {}}
            sess = self._session(u)
            frag = f"access_token={sess['access_token']}&expires_in=3600&provider_token=PT&refresh_token={sess['refresh_token']}&token_type=bearer"
            page = f'<script>location.replace({json.dumps(back + "#" + frag)})</script>'
            return await route.fulfill(status=200, headers={'content-type': 'text/html'}, body=page)
        if path.startswith('/auth/v1/signup'):
            if body['email'] in self.users:
                return await out(422, {'error_code': 'user_already_exists', 'msg': 'User already registered'})
            if len(body['password']) < 8:
                return await out(422, {'error_code': 'weak_password', 'msg': 'Password should be at least 8 characters'})
            u = {'id': f'user-{len(self.users) + 1}', 'email': body['email'], 'password': body['password'],
                 'username': body['data']['username'], 'confirmed': not self.confirm_email}
            self.users[u['email']] = u
            self.data[u['id']] = {'settings': {}, 'stats': {}, 'progress': {}}
            return await out(200, self._session(u) if u['confirmed'] else {'id': u['id'], 'email': u['email']})
        if path.startswith('/auth/v1/token?grant_type=password'):
            u = self.users.get(body.get('email'))
            if not u or u['password'] != body.get('password'):
                return await out(400, {'error_code': 'invalid_credentials', 'msg': 'Invalid login credentials'})
            if not u['confirmed']:
                return await out(400, {'error_code': 'email_not_confirmed', 'msg': 'Email not confirmed'})
            return await out(200, self._session(u))
        if path.startswith('/auth/v1/token?grant_type=refresh_token'):
            u = self._user_by_id(self.tokens.get(body.get('refresh_token')))
            return await (out(200, self._session(u)) if u else out(400, {'error_code': 'refresh_token_not_found'}))
        if path.startswith('/auth/v1/logout'):
            return await out(204)
        if path.startswith('/auth/v1/recover') or path.startswith('/auth/v1/resend'):
            return await out(200, {})
        if path == '/auth/v1/user':
            u = self._user_by_id(uid)
            if not u:
                return await out(401, {'error_code': 'bad_jwt'})
            if req.method == 'PUT':
                u['password'] = body['password']
            return await out(200, {'id': u['id'], 'email': u['email']})
        if path == '/rest/v1/rpc/username_available':
            free = all(u['username'].lower() != body['name'].lower() for u in self.users.values())
            return await out(200, free)
        if path == '/rest/v1/rpc/delete_my_account':
            u = self._user_by_id(uid)
            if not u:
                return await out(401, {'message': 'not signed in'})
            del self.users[u['email']]
            self.data.pop(u['id'], None)
            return await out(204)
        if path.startswith('/rest/v1/profiles'):
            row_id = path.split('id=eq.')[1]
            u = self._user_by_id(row_id)
            if req.method == 'PATCH':
                if row_id != uid:
                    return await out(200, [])  # RLS: other rows are invisible
                if any(o['username'].lower() == body['username'].lower() and o is not u for o in self.users.values()):
                    return await out(409, {'code': '23505', 'message': 'duplicate key value violates unique constraint'})
                u['username'] = body['username']
                return await out(204)
            return await out(200, [{'username': u['username']}] if u and row_id == uid else [])
        if path.startswith('/rest/v1/user_data'):
            if req.method == 'GET':
                row_id = path.split('user_id=eq.')[1]
                return await out(200, [self.data[row_id]] if row_id == uid and row_id in self.data else [])
            if body.get('user_id') != uid:
                return await out(403, {'message': 'new row violates row-level security policy'})
            self.data[uid] = {k: body[k] for k in ('settings', 'stats', 'progress')}
            return await out(201)
        return await out(404, {'message': 'not found'})


async def serve(route):
    """Static server with GitHub Pages behaviour: /Chesscend/ is the repo, unknown paths give 404.html."""
    url = route.request.url
    if not url.startswith(HOST + '/Chesscend/'):
        await route.abort()  # no internet here: Google Fonts fall back to local fonts
        return
    rel = url[len(HOST + '/Chesscend/'):].split('#')[0].split('?')[0]
    path = ROOT / rel
    if path.is_dir():
        path = path / 'index.html'
    if not path.is_file():
        await route.fulfill(status=404, body=(ROOT / '404.html').read_bytes(), headers={'content-type': 'text/html'})
        return
    ctype = 'text/javascript' if path.suffix in ('.js', '.mjs') else mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
    await route.fulfill(status=200, body=path.read_bytes(), headers={'content-type': ctype})


def check(name, ok, detail=''):
    results.append((name, bool(ok), detail))
    print(('PASS ' if ok else 'FAIL ') + name + (f'  ({detail})' if detail and not ok else ''))


async def new_page(browser, width=1280, height=900, touch=False, storage=None, supabase=None):
    ctx = await browser.new_context(viewport={'width': width, 'height': height}, has_touch=touch)
    await ctx.route('**/*', serve)
    if supabase:
        await ctx.route(SUPA + '/**', supabase.handle)
    if storage is not None:
        await ctx.add_init_script(f"if (!sessionStorage.getItem('seeded')) {{ localStorage.clear(); "
                                  f"Object.entries({json.dumps(storage)}).forEach(([k, v]) => localStorage.setItem(k, v)); sessionStorage.setItem('seeded', '1'); }}")
    pg = await ctx.new_page()
    pg.errors = []
    pg.on('console', lambda m: pg.errors.append(m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text else None)
    pg.on('pageerror', lambda e: pg.errors.append(str(e)))
    return ctx, pg


async def saved(pg):
    raw = await pg.evaluate("localStorage.getItem('chesscend:savedGame')")
    return json.loads(raw) if raw else None


async def sq(pg, n):
    await pg.click(f'.board-slot [data-sq="{n}"]')
    await pg.wait_for_timeout(120)


# Finds visible elements sticking out of the screen (the page itself hides overflow,
# so measuring the page width alone is not enough). Decorative and scrollable parts are skipped.
STICKING_OUT = """() => [...document.querySelectorAll('main *')].filter((e) => {
  const r = e.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  for (let p = e; p && p !== document.body; p = p.parentElement) {
    if (p.getAttribute('aria-hidden') === 'true') return false;
    if (p !== e && ['auto', 'scroll'].includes(getComputedStyle(p).overflowX)) return false;
  }
  return r.right > innerWidth + 1 || r.left < -1;
}).map((e) => e.className || e.tagName).slice(0, 3)"""

# A text key or an unfilled {placeholder} shown on screen means a missing translation.
RAW_KEYS = """() => (document.body.innerText.match(/\\{[a-zA-Z]+\\}|\\b(nav|home|play|ranking|learn|lb|coach|common|setup|game|end|puzzle|lesson|profile|community|stats|rating|sq|level|piece)\\.[a-z][A-Za-z.]+/g) || []).slice(0, 3)"""

LONG_GAME = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O', 'Re1', 'a6', 'a4', 'Ba7', 'Nbd2', 'h6',
             'h3', 'Re8', 'Nf1', 'Be6', 'Bxe6', 'Rxe6', 'Ng3', 'Qd7', 'Be3', 'Bxe3', 'Rxe3', 'Rae8', 'Qb3', 'b6', 'Rd1', 'Na5', 'Qc2', 'c5']


async def test_pages_and_responsive(browser, lang='en', sizes=None):
    routes = ['home', 'play', 'ranking', 'community', 'learn', 'setup', 'setup-friend', 'profile', 'course-basics', 'lesson-b5', 'puzzle-p2', 'puzzles', 'legal', 'account', 'reset-password']
    sizes = sizes or [(320, 568, True), (375, 667, True), (390, 844, True), (430, 932, True), (768, 1024, True), (1024, 768, False), (1280, 800, False), (1920, 1080, False)]
    for w, h, touch in sizes:
        long_game = {'config': {'mode': 'ai', 'aiLevel': 2, 'playerColor': 'w', 'timeControl': {'minutes': 10, 'increment': 0}},
                     'moves': LONG_GAME, 'savedAt': 1}
        ctx, pg = await new_page(browser, w, h, touch, storage={'chesscend:savedGame': json.dumps(long_game), 'chesscend:version': '2',
                                                              'chesscend:settings': json.dumps({'lang': lang})})
        bad = []
        for r in ['game'] + routes:  # 'game' = a 36-move game, with a long move list
            await pg.goto(SITE + '#' + r)
            await pg.wait_for_timeout(250)
            over = await pg.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            if over > 0:
                bad.append(f'{r}: {over}px wider')
            raw = await pg.evaluate(RAW_KEYS)
            if raw:
                bad.append(f'{r}: untranslated text {raw}')
            out = await pg.evaluate(STICKING_OUT)
            if out:
                bad.append(f'{r}: sticks out of the screen: {out}')
            if r == 'game':
                right = await pg.evaluate("document.querySelector('.board-frame').getBoundingClientRect().right - innerWidth")
                if right > 0:
                    bad.append(f'game: board cut by {right:.0f}px')
            if not await pg.locator('main.main').is_visible():
                bad.append(f'{r}: no content')
        # the bottom tab bar must not hide the end of the page
        await pg.goto(SITE + '#home')
        await pg.wait_for_timeout(250)
        hidden = await pg.evaluate("""() => {
          const bar = document.querySelector('.tabbar'); if (!bar || getComputedStyle(bar).display === 'none') return 0;
          window.scrollTo(0, document.body.scrollHeight);
          const last = document.querySelector('.footer .copy') || document.querySelector('main');
          return Math.max(0, last.getBoundingClientRect().bottom - bar.getBoundingClientRect().top);
        }""")
        if hidden > 0:
            bad.append(f'tab bar hides {hidden}px')
        check(f'[{lang}] all pages render, no horizontal overflow at {w}px', not bad and not pg.errors, '; '.join(bad + pg.errors[:3]))
        await ctx.close()


async def test_undo_restores_clocks(browser):
    ctx, pg = await new_page(browser, storage={})
    await pg.goto(SITE + '#setup-friend')
    await pg.click('[data-act="tc"][data-arg="1"]')  # 3 + 2
    await pg.click('[data-act="start"]')
    await pg.wait_for_timeout(300)
    await sq(pg, 52)
    await sq(pg, 36)  # e4: Black's clock starts
    await pg.wait_for_timeout(1600)
    await sq(pg, 12)
    await sq(pg, 28)  # e5
    after_e5 = (await saved(pg))['clocks']['b']
    await pg.click('[data-act="undo"]')
    await pg.wait_for_timeout(150)
    s = await saved(pg)
    check('undo removes the move', len(s['moves']) == 1, s['moves'])
    check('undo gives the clock back (time spent, no increment)', s['clocks']['b'] < 179000 and after_e5 > s['clocks']['b'],
          f"after e5 {after_e5}, after undo {s['clocks']['b']}")
    await ctx.close()


async def test_pause_when_hidden(browser):
    ctx, pg = await new_page(browser, storage={})
    await pg.goto(SITE + '#setup-friend')
    await pg.click('[data-act="tc"][data-arg="2"]')  # 5 min
    await pg.click('[data-act="start"]')
    await pg.wait_for_timeout(300)
    await sq(pg, 52)
    await sq(pg, 36)
    hide = "Object.defineProperty(document, 'visibilityState', { value: '%s', configurable: true }); document.dispatchEvent(new Event('visibilitychange'));"
    await pg.evaluate(hide % 'hidden')
    t0 = (await saved(pg))['clocks']['b']
    await pg.wait_for_timeout(2000)
    await pg.evaluate(hide % 'visible')
    await pg.wait_for_timeout(50)
    await pg.goto(SITE + '#home')  # leaving saves the clocks
    await pg.wait_for_timeout(150)
    t1 = (await saved(pg))['clocks']['b']
    check('clock pauses while the page is hidden', t0 - t1 < 500, f'lost {t0 - t1} ms while hidden')
    # coming back: the game resumes with the same time
    await pg.click('[data-act="quick"] >> visible=true')
    await pg.wait_for_timeout(200)
    check('quick play asks before replacing an unfinished game', await pg.locator('text=You have an unfinished game').is_visible())
    await pg.click('[data-m="resume"]')
    await pg.wait_for_timeout(300)
    moves = await pg.locator('.moves-box .mv').all_inner_texts()
    check('resumed game has its moves', 'e4' in moves, moves)
    await ctx.close()


async def test_timeout_and_stats(browser):
    game = {'config': {'mode': 'local', 'aiLevel': 2, 'playerColor': 'w', 'timeControl': {'minutes': 3, 'increment': 0}},
            'moves': ['e4'], 'clocks': {'w': 180000, 'b': 900}, 'savedAt': 1}
    ctx, pg = await new_page(browser, storage={'chesscend:savedGame': json.dumps(game), 'chesscend:version': '2'})
    await pg.goto(SITE + '#game')
    await pg.wait_for_timeout(1800)
    check('time out ends the game', await pg.locator('text=White wins!').first.is_visible())
    stats = json.loads(await pg.evaluate("localStorage.getItem('chesscend:stats')"))
    check('time out is recorded once', len(stats['games']) == 1 and stats['games'][0]['reason'] == 'timeout', stats)
    check('finished game is no longer saved', await saved(pg) is None)
    await pg.click('[data-m="close"]')
    check('no undo after the end', await pg.locator('[data-act="undo"]').is_disabled())
    await ctx.close()


async def test_unrated_after_undo(browser):
    ctx, pg = await new_page(browser, storage={})
    await pg.goto(SITE + '#play')
    await pg.click('[data-act="level"][data-arg="1"]')
    await pg.click('.card [data-act="quick"]')
    await pg.wait_for_timeout(300)
    await sq(pg, 52)
    await sq(pg, 36)
    await pg.wait_for_timeout(1500)  # computer answers
    await pg.click('[data-act="undo"]')
    check('undo vs computer warns that the game becomes unrated', await pg.locator('text=Take back your move?').is_visible())
    await pg.click('[data-m="yes"]')
    await pg.wait_for_timeout(200)
    s = await saved(pg)
    check('game marked unrated after taking back', s is None or s.get('assisted') is True, s)
    await pg.click('[data-act="resign"]', timeout=3000) if await pg.locator('[data-act="resign"]').is_enabled() else None
    await ctx.close()


async def test_keyboard_and_resign(browser):
    ctx, pg = await new_page(browser, storage={})
    await pg.goto(SITE + '#setup-friend')
    await pg.click('[data-act="start"]')
    await pg.wait_for_timeout(300)
    await pg.focus('.board-slot [data-sq="52"]')
    await pg.keyboard.press('Enter')
    await pg.keyboard.press('ArrowUp')
    await pg.keyboard.press('ArrowUp')
    await pg.keyboard.press('Enter')
    await pg.wait_for_timeout(150)
    moves = await pg.locator('.moves-box .mv').all_inner_texts()
    check('a move can be played with the keyboard only', moves[:1] == ['e4'], moves)
    label = await pg.get_attribute('.board-slot [data-sq="36"]', 'aria-label')
    check('squares have spoken labels', label and 'e4' in label and 'white pawn' in label, label)
    await pg.click('[data-act="resign"]')
    await pg.click('[data-m="yes"]')
    await pg.wait_for_timeout(600)
    check('resign ends the game (Black resigns on its turn)', await pg.locator('text=White wins!').first.is_visible())
    focus_in_dialog = await pg.evaluate("!!document.activeElement.closest('.sheet')")
    check('dialog takes the keyboard focus', focus_in_dialog)
    await ctx.close()


async def test_rankings_and_learning(browser):
    ctx, pg = await new_page(browser, storage={})
    await pg.goto(SITE + '#ranking')
    await pg.click('[data-act="rtab"][data-arg="global"]')
    await pg.wait_for_timeout(200)
    txt = await pg.inner_text('.rank-body')
    check('Global tab opens and says honestly that online ranking is not live', 'not live yet' in txt and 'Start Playing' in txt)
    check('no fake players in Global', await pg.locator('.lb-list').count() == 0)
    await pg.click('[data-act="rtab"][data-arg="friends"]')
    await pg.wait_for_timeout(200)
    check('Friends tab opens', 'Friends arrive with online play' in await pg.inner_text('.rank-body'))
    await pg.click('[data-act="rtab"][data-arg="me"]')
    await pg.wait_for_timeout(200)
    t = await pg.inner_text('.rank-body')
    check('My stats separates Computer and Online Rating', 'Computer Rating' in t and 'Online Rating' in t)
    # lesson progress survives a reload
    await pg.goto(SITE + '#lesson-b1')
    await pg.click('[data-act="finish"]')
    await pg.reload()
    await pg.goto(SITE + '#course-basics')
    await pg.wait_for_timeout(200)
    check('lesson progress is saved', await pg.locator('.lesson-row .num-badge.ok').count() == 1)
    # puzzle: a wrong move then the right one
    await pg.goto(SITE + '#puzzle-p1')
    await sq(pg, 56)
    await sq(pg, 48)  # Ra2: not mate
    check('wrong puzzle answer is refused', await pg.locator('text=Not quite').is_visible())
    await pg.click('[data-act="retry"]')
    await sq(pg, 56)
    await sq(pg, 0)  # Ra8#
    check('right puzzle answer is accepted', await pg.locator('text=Checkmate! Well done.').is_visible())
    check('no errors on these pages', not pg.errors, pg.errors[:3])
    await ctx.close()


async def test_storage_problems(browser):
    ctx, pg = await new_page(browser, storage={'chesscend:stats': '{broken', 'chesscend:version': '2'})
    await pg.goto(SITE + '#ranking')
    await pg.wait_for_timeout(300)
    keys = await pg.evaluate('Object.keys(localStorage)')
    check('corrupted stats: page still works', await pg.locator('text=Computer Rating').first.is_visible() and not pg.errors, pg.errors)
    check('corrupted stats are kept as a backup', any(k.startswith('chesscend:stats:backup-') for k in keys), keys)
    await ctx.close()


async def test_github_pages_paths(browser):
    ctx, pg = await new_page(browser)
    await pg.goto(f'{HOST}/Chesscend/')
    await pg.wait_for_timeout(500)
    check('/Chesscend/ redirects to the site', pg.url.startswith(SITE), pg.url)
    resp = await pg.goto(f'{HOST}/Chesscend/does-not-exist')
    check('unknown address shows the Chesscend 404 page', resp.status == 404 and 'This square is empty' in await pg.content())
    for asset in ['web/fonts/poppins-bold.woff', 'web/fonts/chess-symbols.woff', 'web/img/og-image.png', 'web/img/icon-180.png', 'web/img/favicon.svg', 'web/manifest.webmanifest', 'web/js/ai-worker.js', 'src/engine/chess.js']:
        ok = await pg.evaluate("u => fetch(u).then(r => r.ok, () => false)", f'{HOST}/Chesscend/{asset}')
        check(f'asset reachable: {asset}', ok)
    await pg.goto(SITE)
    meta = await pg.evaluate("[...document.querySelectorAll('meta[property^=og], link[rel=canonical]')].length")
    check('Open Graph and canonical tags present', meta >= 8, meta)
    await ctx.close()


async def test_privacy_and_legal(browser):
    ctx, pg = await new_page(browser)
    outside = []
    pg.on('request', lambda r: outside.append(r.url) if not r.url.startswith(HOST) and not r.url.startswith('data:') else None)
    for r in ['home', 'game', 'ranking', 'legal']:
        await pg.goto(SITE + '#' + r)
        await pg.wait_for_timeout(300)
    await pg.goto(f'{HOST}/Chesscend/nothing-here')
    await pg.wait_for_timeout(300)
    check('no request to Google or any other third party', not outside, outside[:5])
    await pg.goto(SITE + '#home')
    await pg.click('.footer .copy a[href="#legal"]')
    await pg.wait_for_timeout(200)
    txt = await pg.inner_text('main')
    check('legal notice reachable from the footer, in English and French',
          'Publisher' in txt and 'Éditeur' in txt and '88 Colin P. Kelly Jr. Street' in txt and 'No cookies' in txt)
    fonts = await pg.evaluate("document.fonts.check('700 16px Poppins') && document.fonts.check('16px \"Chesscend Symbols\"', '\u265E')")
    check('site fonts load from the site itself', fonts)
    await ctx.close()


async def test_languages(browser):
    ctx, pg = await new_page(browser, 1280, 800, storage={})
    await pg.goto(SITE + '#home')
    check('English by default', await pg.inner_text('.nav-link.on') == 'Home' and await pg.evaluate('document.documentElement.lang') == 'en')
    await pg.click('[data-act="lang-menu"]')
    await pg.click('[data-l="fr"]')
    await pg.wait_for_timeout(200)
    check('switch to French from the header', await pg.inner_text('.nav-link.on') == 'Accueil' and await pg.evaluate('document.documentElement.lang') == 'fr')
    await pg.reload()
    await pg.wait_for_timeout(300)
    check('French is remembered after a reload', await pg.inner_text('.nav-link.on') == 'Accueil')
    # a game in French: coach, buttons and dialogs
    await pg.goto(SITE + '#setup-friend')
    await pg.click('[data-act="start"]')
    await pg.wait_for_timeout(300)
    coach = await pg.inner_text('.coach-slot')
    check('coach speaks French', 'Conseil' in coach, coach)
    await sq(pg, 52)
    await sq(pg, 36)
    await pg.click('[data-act="resign"]')
    check('dialogs in French', await pg.locator('text=Abandonner la partie ?').is_visible())
    await pg.click('[data-m="no"]')
    await pg.goto(SITE + '#lesson-b2')
    await pg.wait_for_timeout(200)
    check('lessons in French', 'Le pion' in await pg.inner_text('main'))
    await pg.goto(SITE + '#profile')
    await pg.click('[data-act="draft-lang"][data-arg="es"]')
    await pg.click('#save-settings')
    await pg.wait_for_timeout(200)
    check('switch to Spanish from the profile page', 'Perfil y ajustes' in await pg.inner_text('main'))
    await pg.click('.footer-lang [data-arg="en"]')
    await pg.wait_for_timeout(200)
    check('back to English from the footer', 'Profile & Settings' in await pg.inner_text('main'))
    await ctx.close()
    ctx, pg = await new_page(browser, 390, 844, True, storage={})
    await pg.goto(f'{HOST}/Chesscend/web/?lang=es#play')
    await pg.wait_for_timeout(300)
    check('?lang=es in the address opens the site in Spanish', 'Jugar' in await pg.inner_text('.tabbar') and not pg.errors, pg.errors[:2])
    await ctx.close()


async def test_accounts(browser):
    fake = FakeSupabase()
    played = {'rating': 832, 'games': [
        {'result': 'win', 'mode': 'ai', 'level': 2, 'reason': 'checkmate', 'moves': 30, 'change': 16, 'date': 2000, 'rated': True, 'ratingAfter': 832},
        {'result': 'win', 'mode': 'ai', 'level': 2, 'reason': 'resign', 'moves': 25, 'change': 16, 'date': 1000, 'rated': True, 'ratingAfter': 816}]}
    seed = {'chesscend:version': '2', 'chesscend:stats': json.dumps(played), 'chesscend:progress': json.dumps({'lessonsDone': ['b1'], 'puzzlesSolved': []})}
    ctx, pg = await new_page(browser, 390, 844, True, storage=seed, supabase=fake)
    await pg.goto(SITE + '#profile')
    check('Profile offers to create an account', await pg.locator('text=Save your progress').is_visible())
    await pg.click('.account-teaser [data-go="account"]')
    await pg.click('[data-act="view"][data-arg="signup"]')
    await pg.fill('#username', 'Djam')
    await pg.fill('#email', 'djam@example.com')
    await pg.fill('#password', 'short')
    await pg.click('#consent')
    await pg.click('form[data-form="signup"] button[type="submit"]')
    check('signup refuses a short password', 'at least 8 characters' in await pg.inner_text('.form-error'))
    await pg.fill('#password', 'chess-1234')
    await pg.click('form[data-form="signup"] button[type="submit"]')
    await pg.wait_for_timeout(700)
    page_text = await pg.inner_text('main')
    check('account created and signed in', 'Djam' in page_text and 'djam@example.com' in page_text, page_text[:200])
    check('games played before signing up are now in the account', len(fake.data['user-1']['stats'].get('games', [])) == 2 and fake.data['user-1']['progress']['lessonsDone'] == ['b1'])
    check('sync status shown', 'Saved in your account' in page_text)
    # a new game result is uploaded automatically
    await pg.evaluate("localStorage.setItem('x', '1')")
    await pg.goto(SITE + '#lesson-b2')
    await pg.click('[data-act="finish"]')
    await pg.wait_for_timeout(2200)
    check('progress is uploaded automatically after a change', 'b2' in fake.data['user-1']['progress']['lessonsDone'])
    # log out: the device goes back to guest
    await pg.goto(SITE + '#account')
    await pg.click('[data-act="logout"]')
    await pg.wait_for_timeout(500)
    stats = json.loads(await pg.evaluate("localStorage.getItem('chesscend:stats')"))
    check('logging out leaves the device as a guest, data stays in the account', stats['games'] == [] and 'user-1' in fake.data)
    await ctx.close()

    # another device: log in and find everything
    ctx, pg = await new_page(browser, 1280, 800, storage={}, supabase=fake)
    await pg.goto(SITE + '#account')
    await pg.fill('#email', 'djam@example.com')
    await pg.fill('#password', 'wrong-password')
    await pg.click('form[data-form="login"] button[type="submit"]')
    await pg.wait_for_timeout(300)
    check('wrong password gives a clear message', 'Wrong email or password' in await pg.inner_text('.form-error'))
    await pg.fill('#password', 'chess-1234')
    await pg.click('form[data-form="login"] button[type="submit"]')
    await pg.wait_for_timeout(700)
    await pg.goto(SITE + '#ranking')
    await pg.wait_for_timeout(300)
    t = await pg.inner_text('.rank-body')
    check('on another device the history and rating come back', '832' in t and 'Recent Games' in t and 'Win' in t, t[:200])
    check('header shows the player initial', (await pg.inner_text('.avatar-desk')).strip() == 'D')
    # username already taken
    await pg.goto(SITE + '#account')
    await pg.click('[data-act="logout"]')
    await pg.wait_for_timeout(400)
    await pg.goto(SITE + '#account')
    await pg.click('[data-act="view"][data-arg="signup"]')
    await pg.fill('#username', 'djam')
    await pg.fill('#email', 'other@example.com')
    await pg.fill('#password', 'another-123')
    await pg.click('#consent')
    await pg.click('form[data-form="signup"] button[type="submit"]')
    await pg.wait_for_timeout(300)
    check('a username already taken is refused', 'already taken' in await pg.inner_text('.form-error'))
    await ctx.close()

    # password reset link from the e-mail
    ctx, pg = await new_page(browser, 1280, 800, storage={}, supabase=fake)
    fake.tokens['mailtok'] = 'user-1'
    await pg.goto(SITE + '#access_token=mailtok&expires_in=3600&refresh_token=mailref&token_type=bearer&type=recovery')
    await pg.wait_for_timeout(600)
    check('reset link opens the new password page', 'New password' in await pg.inner_text('main'))
    await pg.fill('#password', 'brand-new-pass')
    await pg.click('form[data-form="reset"] button[type="submit"]')
    await pg.wait_for_timeout(500)
    check('new password saved', fake.users['djam@example.com']['password'] == 'brand-new-pass')
    check('no tokens left in the address bar', 'access_token' not in pg.url, pg.url)
    # delete the account
    await pg.goto(SITE + '#account')
    await pg.click('[data-act="delete"]')
    await pg.click('[data-m="yes"]')
    await pg.wait_for_timeout(500)
    check('account deleted, with its data', 'djam@example.com' not in fake.users and 'user-1' not in fake.data)
    check('no errors during the account tests', not pg.errors, pg.errors[:3])
    await ctx.close()

    # projects that require e-mail confirmation
    fake2 = FakeSupabase(confirm_email=True)
    ctx, pg = await new_page(browser, 390, 844, True, storage={'chesscend:settings': json.dumps({'lang': 'fr'})}, supabase=fake2)
    await pg.goto(SITE + '#account')
    await pg.click('[data-act="view"][data-arg="signup"]')
    await pg.fill('#username', 'Sam')
    await pg.fill('#email', 'sam@example.com')
    await pg.fill('#password', 'sam-12345')
    await pg.click('#consent')
    await pg.click('form[data-form="signup"] button[type="submit"]')
    await pg.wait_for_timeout(500)
    check('with e-mail confirmation: "check your inbox" (in French)', 'Regarde ta boîte mail' in await pg.inner_text('main'))
    await ctx.close()


async def test_theme_previews(browser):
    for w, h, mobile in [(390, 844, True), (1280, 800, False), (2254, 1300, False)]:
        ctx, pg = await new_page(browser, w, h, mobile, storage={})
        await pg.goto(SITE + '#profile')
        sizes = await pg.evaluate("[...document.querySelectorAll('.mini-board .piece')].map(p => parseFloat(getComputedStyle(p).fontSize))")
        boxes = await pg.evaluate("[...document.querySelectorAll('.mini-board .pf')].map(p => { const r = p.getBoundingClientRect(), s = p.closest('.mini-board > span > span').getBoundingClientRect(); return r.height <= s.height + 1 && r.width <= s.width + 1; })")
        check(f'theme previews: pieces fit their square at {w}px', sizes and max(sizes) <= 32 and all(boxes), str(sizes[:2]))
        await ctx.close()


async def test_profile_save(browser):
    ctx, pg = await new_page(browser, 390, 844, True, storage={'chesscend:settings': '{"lang":"fr"}'})
    await pg.goto(SITE + '#profile')
    btn = pg.locator('#save-settings')
    stored = lambda: pg.evaluate("JSON.parse(localStorage.getItem('chesscend:settings') || '{}')")
    order = await pg.evaluate("(() => { const b = document.querySelector('#save-settings').getBoundingClientRect().top; return [...document.querySelectorAll('#name, .theme-grid, .switch')].every(e => e.getBoundingClientRect().top < b); })()")
    check('profile: one Save button, below every setting', await btn.count() == 1 and order and (await btn.inner_text()).strip() == 'Enregistrer')
    check('profile: Save disabled while nothing changed', await btn.is_disabled())
    await pg.fill('#name', 'Djam')
    await pg.click('.theme[data-arg]:not(.on)')
    theme = await pg.get_attribute('.theme.on', 'data-arg')
    await pg.click('.toggle-row:has([data-key="autoFlip"])')
    before = await stored()
    check('profile: nothing saved before clicking Save', before.get('playerName') != 'Djam' and before.get('themeId') != theme and await pg.locator('.save-hint').is_visible())
    await btn.click()
    await pg.wait_for_timeout(200)
    after = await stored()
    check('profile: Save stores name, theme and options together', after['playerName'] == 'Djam' and after['themeId'] == theme and after['autoFlip'] is True)
    check('profile: confirmation, button disabled again, avatar updated', 'Réglages enregistrés' in await pg.inner_text('.toast') and await btn.is_disabled() and (await pg.inner_text('.topbar .avatar')).strip() == 'D')
    # a change then leaving without saving: nothing stored, the player is told
    await pg.fill('#name', 'Autre')
    await pg.click('.tabbar [data-go="home"], .tabbar a[href="#home"]') if await pg.locator('.tabbar [data-go="home"]').count() else await pg.goto(SITE + '#home')
    await pg.wait_for_timeout(200)
    check('profile: leaving without saving keeps the old values and warns', (await stored())['playerName'] == 'Djam' and 'pas été enregistrées' in await pg.inner_text('.toast'))
    # the language is saved with the rest
    await pg.goto(SITE + '#profile')
    await pg.click('[data-act="draft-lang"][data-arg="en"]')
    check('profile: language not changed before Save', 'Profil et réglages' in await pg.inner_text('main'))
    await btn.click()
    await pg.wait_for_timeout(300)
    check('profile: Save switches the language', 'Profile & Settings' in await pg.inner_text('main') and (await stored())['lang'] == 'en')
    check('profile: page fits a phone screen', not await pg.evaluate("document.documentElement.scrollWidth > innerWidth"))
    await ctx.close()


async def test_google(browser):
    # provider still off: a clear message, nobody leaves the site
    fake = FakeSupabase(google=False)
    ctx, pg = await new_page(browser, 390, 844, True, storage={}, supabase=fake)
    await pg.goto(SITE + '#account')
    check('Continue with Google on the log-in form', await pg.locator('form[data-form="login"] .google-btn').is_visible())
    await pg.click('[data-act="view"][data-arg="signup"]')
    check('Continue with Google on the sign-up form', await pg.locator('form[data-form="signup"] .google-btn').is_visible())
    await pg.click('.google-btn')
    await pg.wait_for_timeout(400)
    check('Google off: clear message, still on the site', 'not available yet' in await pg.inner_text('.form-error') and '#account' in pg.url)
    await ctx.close()

    # provider on: back from Google signed in, asked to choose a username
    fake = FakeSupabase(google=True)
    fake.users['taken@x.co'] = {'id': 'user-taken', 'email': 'taken@x.co', 'password': 'x' * 8, 'username': 'Magnus', 'confirmed': True}
    seed = {'chesscend:version': '2', 'chesscend:progress': json.dumps({'lessonsDone': ['b1'], 'puzzlesSolved': []})}
    ctx, pg = await new_page(browser, 390, 844, True, storage=seed, supabase=fake)
    await pg.goto(SITE + '#account')
    await pg.click('.google-btn')
    await pg.wait_for_timeout(1200)
    text = await pg.inner_text('main')
    check('back from Google: signed in on the account page', 'g@gmail.com' in text and pg.url.endswith('#account'), pg.url)
    check('no tokens left in the address', 'access_token' not in pg.url)
    check('device progress added to the Google account', fake.data['user-2']['progress'].get('lessonsDone') == ['b1'])
    check('asked to choose a username', await pg.locator('form.needs-username').is_visible())
    check('the automatic name is not shown as the player name', 'player_' not in await pg.inner_text('.account-name'))
    await pg.fill('form[data-form="username"] #username', 'magnus')
    await pg.click('form[data-form="username"] button[type="submit"]')
    await pg.wait_for_timeout(400)
    check('a taken username is refused', 'already taken' in await pg.inner_text('form[data-form="username"] .form-error'))
    await pg.fill('form[data-form="username"] #username', 'Djam_75')
    await pg.click('form[data-form="username"] button[type="submit"]')
    await pg.wait_for_timeout(500)
    check('username saved in the account', fake.users['g@gmail.com']['username'] == 'Djam_75')
    check('new username shown, prompt gone', 'Djam_75' in await pg.inner_text('.account-name') and await pg.locator('form.needs-username').count() == 0)
    await pg.reload()
    await pg.wait_for_timeout(600)
    check('after reload the username field shows the saved name', await pg.input_value('form[data-form="username"] #username') == 'Djam_75')
    await ctx.close()


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROME)
        for lang in ['fr', 'es']:
            try:
                await test_pages_and_responsive(browser, lang, [(320, 568, True), (390, 844, True), (768, 1024, True), (1280, 800, False)])
            except Exception as e:
                check(f'responsive {lang}', False, repr(e)[:300])
        for t in [test_profile_save, test_theme_previews, test_google, test_accounts, test_languages, test_pages_and_responsive, test_undo_restores_clocks, test_pause_when_hidden, test_timeout_and_stats,
                  test_unrated_after_undo, test_keyboard_and_resign, test_rankings_and_learning, test_storage_problems,
                  test_github_pages_paths, test_privacy_and_legal]:
            try:
                await t(browser)
            except Exception as e:  # a crashing test is a failed test
                check(t.__name__, False, repr(e)[:300])
        await browser.close()
    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)} passed, {len(failed)} failed')
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    asyncio.run(main())
