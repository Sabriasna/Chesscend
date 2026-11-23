"""End-to-end tests of the website in a real browser (Chrome), served like GitHub Pages
under /Chesscend/. Requires Python Playwright and Chrome.
Run: python3 tests/browser/e2e.py
"""
import asyncio
import json
import mimetypes
import sys
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
HOST = 'http://chesscend.test'
SITE = f'{HOST}/Chesscend/web/'
CHROME = '/usr/bin/google-chrome'
results = []


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


async def new_page(browser, width=1280, height=900, touch=False, storage=None):
    ctx = await browser.new_context(viewport={'width': width, 'height': height}, has_touch=touch)
    await ctx.route('**/*', serve)
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


async def test_pages_and_responsive(browser):
    routes = ['home', 'play', 'ranking', 'community', 'learn', 'setup', 'setup-friend', 'profile', 'course-basics', 'lesson-b5', 'puzzle-p2', 'puzzles']
    for w, h, touch in [(320, 568, True), (375, 667, True), (390, 844, True), (430, 932, True), (768, 1024, True), (1024, 768, False), (1280, 800, False), (1920, 1080, False)]:
        ctx, pg = await new_page(browser, w, h, touch)
        bad = []
        for r in routes:
            await pg.goto(SITE + '#' + r)
            await pg.wait_for_timeout(250)
            over = await pg.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            if over > 0:
                bad.append(f'{r}: {over}px wider')
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
        check(f'all pages render, no horizontal overflow at {w}px', not bad and not pg.errors, '; '.join(bad + pg.errors[:3]))
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
    check('Friends tab opens', 'Friends arrive with player accounts' in await pg.inner_text('.rank-body'))
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
    for asset in ['web/img/og-image.png', 'web/img/icon-180.png', 'web/img/favicon.svg', 'web/manifest.webmanifest', 'web/js/ai-worker.js', 'src/engine/chess.js']:
        r = await pg.goto(f'{HOST}/Chesscend/{asset}')
        check(f'asset reachable: {asset}', r and r.ok)
    await pg.goto(SITE)
    meta = await pg.evaluate("[...document.querySelectorAll('meta[property^=og], link[rel=canonical]')].length")
    check('Open Graph and canonical tags present', meta >= 8, meta)
    await ctx.close()


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROME)
        for t in [test_pages_and_responsive, test_undo_restores_clocks, test_pause_when_hidden, test_timeout_and_stats,
                  test_unrated_after_undo, test_keyboard_and_resign, test_rankings_and_learning, test_storage_problems,
                  test_github_pages_paths]:
            try:
                await t(browser)
            except Exception as e:  # a crashing test is a failed test
                check(t.__name__, False, repr(e)[:300])
        await browser.close()
    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)} passed, {len(failed)} failed')
    sys.exit(1 if failed else 0)

asyncio.run(main())
