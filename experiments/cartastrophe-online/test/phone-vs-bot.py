# One rendering client (mobile emulation, real touch events) against the headless bot, to measure frame rate,
# ping and prediction error without two software-rendered pages fighting over the CPU.
import sys, os, time, math, subprocess, json
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787'
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
OUT = 'test/out'; os.makedirs(OUT, exist_ok=True)
logs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=ARGS)
    ctx = b.new_context(viewport={'width': 844, 'height': 390}, is_mobile=True, has_touch=True, device_scale_factor=1)
    pg = ctx.new_page(); pg.on('console', lambda m: logs.append(m.text)); pg.on('pageerror', lambda e: logs.append('[pageerror] ' + str(e)))
    pg.goto(BASE + '/cartastrophe-online.html?test&run'); pg.wait_for_function('window.__ready', timeout=90000)
    pg.evaluate("document.querySelector('.seg[data-k=quality] button').click()")
    cdp = ctx.new_cdp_session(pg)
    def touch(kind, pts): cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': i} for (i, x, y) in pts]})
    def tap(sel):
        pg.locator(sel).scroll_into_view_if_needed(); bb = pg.locator(sel).bounding_box(); touch('touchStart', [(5, bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)]); touch('touchEnd', [])
    tap('#oCreate'); pg.wait_for_function("NET.slot===0", timeout=15000); code = pg.evaluate('NET.code')
    bot = subprocess.Popen(['node', 'test/ws-bot.mjs', code, BASE, '100'])
    pg.wait_for_function("document.querySelectorAll('#lPlayers .lp:not(.empty)').length===2", timeout=15000)
    tap('#lReady'); pg.wait_for_function("GAME.mode==='play'", timeout=20000)
    SX, SY = 170, 270; touch('touchStart', [(0, SX, SY)])
    t0 = time.time(); f0 = pg.evaluate('NET.frames||0'); rows = []; taps = 0; last_tap = 0; stuck = 0; rev_until = 0
    while time.time() - t0 < 75:
        st = pg.evaluate("[GAME.mode, GAME.player.state, GAME.player.speed(), GAME.player.item, NET.frames, Math.round(NET.rtt), +(NET.err||0).toFixed(2), NET.snapsHard||0, NET.itemCount]")
        if st[0] == 'end': break
        el = time.time() - t0
        stuck = stuck + 1 if st[2] < 1 and st[1] == 'drive' and el > 4 else 0
        if stuck > 15: rev_until = time.time() + 1.2; stuck = 0
        dx, dy = (-35, 55) if time.time() < rev_until else (25 + 25 * math.sin(el * 0.6), -60)
        if st[1] == 'drive': touch('touchMove', [(0, SX + dx, SY + dy)])
        if st[3] and time.time() - last_tap > 1.0:
            touch('touchStart', [(0, SX + dx, SY + dy), (1, 650, 190)]); touch('touchEnd', []); touch('touchStart', [(0, SX, SY)]); taps += 1; last_tap = time.time()
        if int(el) % 15 == 0 and (not rows or rows[-1][0] != int(el)):
            rows.append((int(el), st)); print(f"t={int(el)} mode {st[0]} me {st[1]} {st[2]:.1f} m/s  frames/s {(st[4]-f0)/max(1,el):.1f}  ping {st[5]} ms  pred.err {st[6]} m  hard snaps {st[7]}  items used {st[8]}")
        if int(el) == 20 and not os.path.exists(OUT + '/online_phone_vs_bot.png'): pg.screenshot(path=OUT + '/online_phone_vs_bot.png')
        time.sleep(0.1)
    fin = pg.evaluate("GAME.carts.map(c => ({ n: c.name, pts: c.stats.points, ko: c.stats.wipeouts, self: c.stats.self, lives: c.lives }))")
    print('item taps (2nd finger, right half):', taps, '| final', json.dumps(fin))
    bot.kill(); b.close()
errs = [l for l in logs if 'error' in l.lower()]; print('console errors:', len(errs)); [print(' ', l) for l in errs[:10]]
