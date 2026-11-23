# Two real browser clients against `wrangler dev` (default http://127.0.0.1:8787):
#   DESK  : desktop page, keyboard driving (W/A/D/Shift/E)
#   PHONE : mobile emulation (touch, 844x390) driving with real multi-touch events on the floating joystick,
#           tapping the right half of the screen to use items
# Covers: create room, join by code, lobby, ready, countdown, server-run match, items, KOs, end receipt, rematch,
# dropped-connection rejoin, leaving mid-match (forfeit). Writes screenshots + logs to test/out/.
# Usage: python test/browser-duel.py [base_url]
import sys, os, json, time, math
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8787'
URL = BASE + '/cartastrophe-online.html?test&run'
OUT = 'test/out'; os.makedirs(OUT, exist_ok=True)
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']
logs = {'desk': [], 'phone': []}
def J(x): return json.dumps(x)

def state(pg):
    return pg.evaluate("""() => ({ mode: GAME.mode, net: NET.inMatch, slot: NET.slot, timer: +GAME.timer.toFixed(1), rtt: Math.round(NET.rtt), err: +(NET.err||0).toFixed(2), hard: NET.snapsHard||0,
      snaps: NET.stats.snaps, frames: NET.frames||0, inputs: NET.stats.inputs, items: NET.itemCount, touch: INPUT.touchOn,
      carts: GAME.carts.map(c => ({ n: c.name, x: +c.x.toFixed(1), z: +c.z.toFixed(1), v: +c.speed().toFixed(1), st: c.state, lives: c.lives, pts: c.stats.points, ko: c.stats.wipeouts, self: c.stats.self, item: c.item })) })""")

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=ARGS)
    dctx = b.new_context(viewport={'width': 640, 'height': 360})
    mctx = b.new_context(viewport={'width': 844, 'height': 390}, is_mobile=True, has_touch=True, device_scale_factor=1)
    desk, phone = dctx.new_page(), mctx.new_page()
    for name, pg in (('desk', desk), ('phone', phone)):
        pg.on('console', lambda m, n=name: logs[n].append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e, n=name: logs[n].append(f'[pageerror] {e}'))
        pg.goto(URL); pg.wait_for_function('window.__ready || window.__bootError', timeout=90000)
        pg.evaluate("document.querySelector('.seg[data-k=quality] button').click()")   # Low quality: two SwiftShader pages at once
    cdp = mctx.new_cdp_session(phone)
    def touch(kind, pts):
        cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': i, 'radiusX': 8, 'radiusY': 8, 'force': 1} for (i, x, y) in pts]})
    def tap(sel):
        phone.locator(sel).scroll_into_view_if_needed(); bb = phone.locator(sel).bounding_box(); x, y = bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2
        touch('touchStart', [(5, x, y)]); touch('touchEnd', [])
    print('phone touch mode', phone.evaluate('INPUT.touchOn'), '| desk touch mode', desk.evaluate('INPUT.touchOn'))
    desk.screenshot(path=OUT + '/online_title_desk.png'); phone.screenshot(path=OUT + '/online_title_phone.png')

    # --- create (desk, 3 lives) + join (phone, typed code) ---
    desk.fill('#oName', 'Desk')
    desk.evaluate("document.querySelectorAll('.seg[data-k=olives] button')[1].click()")   # 3 lives
    desk.click('#oCreate'); desk.wait_for_function("NET.code && document.getElementById('lCode').textContent.length===5", timeout=15000)
    code = desk.evaluate('NET.code'); print('room code', code)
    tap('#oName'); phone.fill('#oName', 'Phone'); tap('#oCode'); phone.keyboard.type(code.lower()); tap('#oJoin')
    phone.wait_for_function("NET.slot===1", timeout=15000)
    desk.wait_for_function("document.querySelectorAll('#lPlayers .lp:not(.empty)').length===2", timeout=15000)
    desk.screenshot(path=OUT + '/online_lobby_desk.png'); phone.screenshot(path=OUT + '/online_lobby_phone.png')
    print('lobby (desk sees):', desk.evaluate("[...document.querySelectorAll('#lPlayers .lp')].map(d=>d.innerText.replace(/\\n/g,' '))"))
    desk.click('#lReady'); tap('#lReady')
    desk.wait_for_function("NET.inMatch && GAME.mode==='countdown'", timeout=15000)
    phone.wait_for_function("NET.inMatch", timeout=15000)
    time.sleep(1.0); desk.screenshot(path=OUT + '/online_countdown_desk.png'); phone.screenshot(path=OUT + '/online_countdown_phone.png')
    desk.wait_for_function("GAME.mode==='play'", timeout=15000)
    print('match 1 started. desk', J(state(desk)['carts']))

    # --- drive: desk chases the phone with the keyboard, phone circles with the touch joystick ---
    SX, SY = 170, 270   # joystick anchor on the left half (phone)
    touch('touchStart', [(0, SX, SY)])
    keys = set()
    def setkeys(want):
        for k in list(keys - want): desk.keyboard.up(k); keys.discard(k)
        for k in want - keys: desk.keyboard.down(k); keys.add(k)
    samples, t0, last_item_tap, shots = [], time.time(), 0, 0
    fr0 = (0, 0, 0)
    phone_pin = None
    while time.time() - t0 < 150:
        ds = desk.evaluate("(() => { const me = GAME.player, o = GAME.carts[1]; return [me.x, me.z, me.yaw, o.x, o.z, me.item, GAME.mode, o.state, me.speed()] })()")
        if ds[6] == 'end': break
        tx, tz = ds[3], ds[4]
        # go around the duck pond instead of through it
        px, pz = -12 - ds[0], -10 - ds[1]; dx_, dz_ = tx - ds[0], tz - ds[1]; L = math.hypot(dx_, dz_) or 1
        proj = (px * dx_ + pz * dz_) / L
        if 0 < proj < L and abs(px * dz_ - pz * dx_) / L < 11: tx, tz = -12 + (dz_ / L) * 14 * (1 if (px * dz_ - pz * dx_) > 0 else -1), -10 - (dx_ / L) * 14 * (1 if (px * dz_ - pz * dx_) > 0 else -1)
        want = math.atan2(tx - ds[0], tz - ds[1]); err = math.atan2(math.sin(want - ds[2]), math.cos(want - ds[2]))
        now_ = time.time()
        if ds[8] < 1.0 and now_ - t0 > 5: dstuck = dstuck + 0.08 if 'dstuck' in dir() else 0.08
        else: dstuck = 0
        if dstuck > 1.2: drev_until = now_ + 1.2; dstuck = 0
        if 'drev_until' in dir() and now_ < drev_until: k = {'KeyS', 'KeyD'}
        else:
            k = {'KeyW'}
            if err > 0.15: k.add('KeyA')
            elif err < -0.15: k.add('KeyD')
            if abs(err) < 0.3: k.add('ShiftLeft')
        setkeys(k)
        if ds[5] and abs(err) < 0.4: desk.keyboard.press('KeyE')
        # phone: stick up and a bit right (wide circle), wobble it so the analog value changes
        el = time.time() - t0
        dx = 30 + 20 * math.sin(el * 0.7); dy = -55
        ph = phone.evaluate("[GAME.player.item, GAME.player.state, GAME.mode, GAME.player.speed()]")
        if ph[3] < 1.0 and el > 5 and ph[1] == 'drive': pstuck = pstuck + 0.08 if 'pstuck' in dir() else 0.08
        else: pstuck = 0
        if pstuck > 1.2: prev_until = time.time() + 1.3; pstuck = 0; reversals = (reversals if 'reversals' in dir() else 0) + 1
        if 'prev_until' in dir() and time.time() < prev_until: dx, dy = -35, 55      # pull the stick down = brake/reverse
        if ph[1] == 'drive' and ph[2] == 'play':
            touch('touchMove', [(0, SX + dx, SY + dy)])
        if ph[0] and time.time() - last_item_tap > 1.2:      # second finger taps the right half: use item
            touch('touchStart', [(0, SX + dx, SY + dy), (1, 640, 200)]); touch('touchEnd', []); touch('touchStart', [(0, SX, SY)])
            taps = phone.evaluate("NET.itemCount")
            last_item_tap = time.time()
        if phone_pin is None and el > 3: phone_pin = phone.evaluate("(() => { const p = INPUT.poll(0); return {th:+p.throttle.toFixed(2), st:+p.steer.toFixed(2), br:p.brake, bo:p.boost} })()")
        if el > 12 and shots == 0: desk.screenshot(path=OUT + '/online_play_desk.png'); phone.screenshot(path=OUT + '/online_play_phone.png'); shots = 1
        if int(el) % 10 == 0 and (not samples or samples[-1][0] != int(el)):
            sd, sp = state(desk), state(phone)
            samples.append((int(el), sd, sp)); fr0_next = (sd['frames'], sp['frames'], el)
            print(f"t={int(el):3d} desk view {J([(c['n'], c['x'], c['z'], c['v'], c['st'], c['lives'], c['pts']) for c in sd['carts']])} | phone view {J([(c['n'], c['x'], c['z'], c['st'], c['pts']) for c in sp['carts']])} | fps {round((sd['frames']-fr0[0])/max(1,el-fr0[2]),1)}/{round((sp['frames']-fr0[1])/max(1,el-fr0[2]),1)} rtt {sd['rtt']}/{sp['rtt']} err {sd['err']}/{sp['err']} hard {sd['hard']}/{sp['hard']}"); fr0 = fr0_next
        time.sleep(0.08)
    setkeys(set())
    print('phone stick poll while held:', phone_pin, '| phone stick reversals:', reversals if 'reversals' in dir() else 0)
    desk.wait_for_function("GAME.mode==='end'", timeout=200000)
    phone.wait_for_function("GAME.mode==='end'", timeout=20000)
    time.sleep(2.0)
    desk.screenshot(path=OUT + '/online_end_desk.png'); phone.screenshot(path=OUT + '/online_end_phone.png')
    sd, sp = state(desk), state(phone)
    print('END desk', J(sd['carts'])); print('END phone', J(sp['carts']))
    print('scores agree:', [(c['pts'], c['ko'], c['self'], c['lives']) for c in sd['carts']] == [(c['pts'], c['ko'], c['self'], c['lives']) for c in sp['carts']])
    print('receipt (desk):', desk.evaluate("document.getElementById('receipt').innerText.split('\\n').slice(4,9).join(' | ')"))
    print('stats desk', J({k: sd[k] for k in ('snaps', 'inputs', 'items', 'rtt', 'hard')}), 'phone', J({k: sp[k] for k in ('snaps', 'inputs', 'items', 'rtt', 'hard')}))
    touch('touchEnd', [])

    # --- rematch ---
    desk.click('#again'); time.sleep(0.5)
    print('desk end note after rematch press (phone sees):', phone.evaluate("document.getElementById('endnet').textContent"))
    tap('#again')
    desk.wait_for_function("GAME.mode==='countdown' || GAME.mode==='play'", timeout=15000)
    print('rematch started:', state(desk)['mode'], state(phone)['mode'])
    desk.wait_for_function("GAME.mode==='play'", timeout=15000)
    time.sleep(2)
    # --- drop the phone's socket: it should show CONNECTION LOST, reconnect with its seat token and carry on ---
    phone.evaluate("NET.ws.close()"); time.sleep(0.25)
    lost = phone.evaluate("!document.getElementById('netlost').classList.contains('hidden')")
    phone.screenshot(path=OUT + '/online_reconnect_phone.png')
    try: phone.wait_for_function("NET.ws && NET.ws.readyState===1 && document.getElementById('netlost').classList.contains('hidden')", timeout=20000)
    except Exception as e:
        print('RECONNECT FAILED', phone.evaluate("({ws: NET.ws && NET.ws.readyState, retry: NET.retry, msg: document.getElementById('nlMsg').textContent, active: NET.active, inMatch: NET.inMatch, want: NET.wantClose})"))
        for l in logs['phone'][-20:]: print('  ', l)
        raise
    time.sleep(1.5)
    sp = state(phone)
    print('reconnect: overlay shown', lost, '-> back in slot', sp['slot'], 'mode', sp['mode'], 'snaps flowing', sp['snaps'] > 0)
    # --- phone leaves mid-match: desk wins by forfeit ---
    phone.evaluate("setPause(true)"); phone.screenshot(path=OUT + '/online_pause_phone.png'); tap('#quit')
    desk.wait_for_function("GAME.mode==='end'", timeout=15000); time.sleep(1.6)
    print('after phone left: desk mode', desk.evaluate('GAME.mode'), '| note:', desk.evaluate("document.getElementById('endnet').textContent"), '| phone back on title:', phone.evaluate("!document.getElementById('title').classList.contains('hidden') && !NET.active"))
    desk.screenshot(path=OUT + '/online_forfeit_desk.png')
    b.close()
for n in logs:
    errs = [l for l in logs[n] if 'error' in l.lower()]
    print(f'{n} console: {len(logs[n])} lines, {len(errs)} errors'); [print('  ', l) for l in errs[:15]]
