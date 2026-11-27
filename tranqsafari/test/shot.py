"""Headless checks for Tranq Safari (Python Playwright + SwiftShader).
usage: python3 test/shot.py <scenario> [--q N] [--out DIR]
scenarios: basic, mobile, run (full autopilot run, no rendering), boss, studio, quality, js "<expr>"
Serves the game folder itself; screenshots and logs go to test/out/ (or --out).
"""
import sys, os, json, threading, http.server, socketserver, functools, time
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
args = sys.argv[1:]; scen = args[0] if args else 'basic'
def opt(name, d=None):
    return args[args.index(name) + 1] if name in args else d
OUT = opt('--out', os.path.join(HERE, 'out')); os.makedirs(OUT, exist_ok=True)
Q = int(opt('--q', '2')); PORT = int(opt('--port', '8766'))

def serve():
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(('127.0.0.1', PORT), functools.partial(H, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start(); return srv

def launch(p):
    exe = '/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
    return p.chromium.launch(executable_path=exe, headless=True, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])

def page_for(b, w, h, mobile=False, flags=''):
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
    pg = ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    t0 = time.time()
    pg.goto(f'http://127.0.0.1:{PORT}/tranqsafari.html?test&scale=1&q={["low","medium","high","max"][Q]}{flags}{opt('--flags','')}', wait_until='load')
    pg.wait_for_function('window.TS && TS.ready', timeout=180000)
    print(f'boot {time.time()-t0:.1f}s', pg.evaluate('JSON.stringify(TS.perf())'))
    return pg, logs

def shot(pg, name):
    t0 = time.time(); pg.evaluate('TS.render()'); pg.screenshot(path=os.path.join(OUT, name + '.png')); print(f'shot {name} ({time.time()-t0:.1f}s)')

def report(logs):
    bad = [l for l in logs if ('error' in l.lower() or 'pageerror' in l or 'warn' in l.lower()) and 'GPU stall' not in l and 'favicon' not in l]
    for l in bad[:30]: print('  LOG', l)
    print('errors/warnings:', len(bad)); return bad

srv = serve()
with sync_playwright() as p:
    b = launch(p)
    if scen == 'basic':
        pg, logs = page_for(b, 1280, 720)
        shot(pg, 'menu')
        pg.evaluate('TS.start({seed:3})'); pg.evaluate('TS.step(1.0)'); shot(pg, 'start')
        pg.evaluate('TS.step(3.5)'); pg.evaluate('TS.aim(0.3,-0.05)'); shot(pg, 'gate')
        pg.evaluate('TS.skipTo(150)'); pg.evaluate('TS.step(2.5)'); print(pg.evaluate('JSON.stringify(TS.actors())')); shot(pg, 'grass')
        pg.evaluate('TS.autopilot(true)'); pg.evaluate('TS.step(4)'); shot(pg, 'grass-fight'); print(pg.evaluate('JSON.stringify(TS.state())'))
        pg.evaluate('TS.autopilot(false)'); pg.evaluate('TS.skipTo(430)'); pg.evaluate('TS.step(9)'); shot(pg, 'longneck0'); pg.evaluate('TS.step(9)'); shot(pg, 'longneck')
        pg.evaluate('TS.skipTo(700)'); pg.evaluate('TS.step(3)'); shot(pg, 'forest')
        pg.evaluate('TS.skipTo(1080)'); pg.evaluate('TS.step(4)'); shot(pg, 'gorge')
        pg.evaluate('TS.skipTo(1440)'); pg.evaluate('TS.step(3)'); shot(pg, 'stampede')
        pg.evaluate('TS.skipTo(1650)'); pg.evaluate('TS.step(6)'); shot(pg, 'boss')
        report(logs)
    elif scen == 'mobile':
        pg, logs = page_for(b, 412, 860, True, '&touch')
        shot(pg, 'm-menu'); pg.evaluate('TS.start({seed:3})'); pg.evaluate('TS.skipTo(150)'); pg.evaluate('TS.step(3)'); shot(pg, 'm-play')
        pg2, logs2 = page_for(b, 860, 412, True, '&touch'); pg2.evaluate('TS.start({seed:3})'); pg2.evaluate('TS.skipTo(1655)'); pg2.evaluate('TS.step(6)'); shot(pg2, 'm-land-boss')
        report(logs + logs2)
    elif scen == 'run':
        pg, logs = page_for(b, 960, 540)
        diff = int(opt('--diff', '1')); err = float(opt('--err', '0.02')); lag = float(opt('--lag', '0'))
        pg.evaluate(f'TS.start({{diff:{diff}}})'); pg.evaluate(f'TS.autopilot(true,{err},false,{lag})')
        t0 = time.time()
        for i in range(60):
            st = pg.evaluate('TS.step(5)')
            print(f"t={st['t']:6.1f} s={st['s']:7.1f} score={st['score']:6d} hp={st['health']:5.1f} shots={st['shots']} hits={st['hits']} actors={st['actors']} boss={st['boss']}")
            if st['phase'] == 'results': break
        print('final', json.dumps(pg.evaluate('TS.state()')), f'wall {time.time()-t0:.0f}s')
        lg = pg.evaluate('TS.log()'); open(os.path.join(OUT, 'run-log.txt'), 'w').write('\n'.join(lg))
        print('damage events:', [l for l in lg if l.startswith('damage')][:40])
        shot(pg, 'run-results'); report(logs)
    elif scen == 'studio':
        pg, logs = page_for(b, 900, 600)
        pg.evaluate('TS.hud(false)')
        for sp, pose, view, name in [
            ('raptor', {}, {}, 'st-raptor'), ('raptor', {'run': 1, 'spd': 12, 'phase': 1.2}, {'ang': 1.4}, 'st-raptor-run'), ('raptor', {'sleep': 1, 'asleep': True}, {'ang': 1.0, 'el': 0.5}, 'st-raptor-sleep'),
            ('raptor', {'leap': 1}, {'ang': 1.57}, 'st-raptor-leap'), ('runner', {'run': 1, 'spd': 10, 'phase': 0.5}, {}, 'st-runner'), ('hornback', {'run': 1, 'spd': 9, 'phase': 0.8}, {}, 'st-hornback'),
            ('hornback', {'sleep': 1, 'asleep': True}, {'el': 0.4}, 'st-hornback-sleep'), ('longneck', {'spd': 1.2, 'phase': 1}, {'d': 40, 'zoom': 1.0}, 'st-longneck'),
            ('ptero', {'flap': 1, 'phase': 1.5}, {'el': 0.3}, 'st-ptero'), ('ptero', {'dive': 1}, {'ang': 1.2, 'el': 0.2}, 'st-ptero-dive'), ('ptero', {'fold': 1, 'sleep': 1, 'asleep': True}, {'el': 0.5}, 'st-ptero-sleep', ),
            ('boss', {'run': 1, 'spd': 12, 'phase': 0.7}, {'d': 30, 'ang': 0.9}, 'st-boss'), ('boss', {'roar': 1}, {'d': 30, 'ang': 0.3, 'el': 0.05}, 'st-boss-roar'), ('boss', {'sleep': 1, 'asleep': True}, {'d': 30, 'el': 0.5}, 'st-boss-sleep')]:
            pg.evaluate(f'TS.studio({json.dumps(sp)},{json.dumps(pose)},{json.dumps(view)})'); shot(pg, name)
        report(logs)
    elif scen == 'boss':
        pg, logs = page_for(b, 1280, 720)
        pg.evaluate('TS.start({seed:3})'); pg.evaluate('TS.skipTo(1650)'); pg.evaluate('TS.step(4)'); shot(pg, 'b-enter')
        pg.evaluate('TS.step(3)'); shot(pg, 'b-chase'); pg.evaluate('TS.autopilot(true,0.01)'); pg.evaluate('TS.step(10)'); shot(pg, 'b-fight'); print(pg.evaluate('JSON.stringify(TS.state())'))
        pg.evaluate('TS.step(25)'); shot(pg, 'b-later'); print(pg.evaluate('JSON.stringify(TS.state())'))
        report(logs)
    elif scen == 'moments':
        pg, logs = page_for(b, 1280, 720)
        pg.evaluate('TS.start({seed:3})'); pg.evaluate('TS.skipTo(100)')
        for i in range(80):
            pg.evaluate('TS.step(0.25)')
            if pg.evaluate("TS.actors().some(a => a.state==='cling')"): break
        pg.evaluate('TS.step(0.3)'); shot(pg, 'mo-cling'); print(pg.evaluate('JSON.stringify(TS.actors())'))
        pg.evaluate('TS.skipTo(1000)')
        for i in range(80):
            pg.evaluate('TS.step(0.25)')
            if pg.evaluate("TS.actors().some(a => a.state==='dive' && a.dist < 22)"): break
        pg.evaluate("(()=>{const a=TS.actors().find(a=>a.state==='dive'); if(a) TS.aimAt(a.id);})()"); shot(pg, 'mo-dive')
        pg.evaluate('TS.skipTo(1440)')
        for i in range(80):
            pg.evaluate('TS.step(0.25)')
            if pg.evaluate("TS.actors().some(a => a.state==='charge' && a.dist < 20)"): break
        pg.evaluate("(()=>{const a=TS.actors().find(a=>a.state==='charge'); if(a) TS.aimAt(a.id);})()"); shot(pg, 'mo-charge')
        pg.evaluate('TS.skipTo(1650)')
        for i in range(120):
            pg.evaluate('TS.step(0.25)')
            if pg.evaluate("TS.state().boss && TS.state().boss.state==='windup'"): break
        pg.evaluate('TS.step(0.5)'); pg.evaluate("(()=>{const a=TS.actors().find(a=>a.kind==='boss'); if(a) TS.aimAt(a.id);})()"); shot(pg, 'mo-windup')
        pg.evaluate('TS.autopilot(true,0.01)'); pg.evaluate('TS.step(45)'); pg.evaluate('TS.autopilot(false)'); print(pg.evaluate('JSON.stringify(TS.state().boss)'))
        pg.evaluate('TS.step(1)'); shot(pg, 'mo-bossasleep')
        report(logs)
    elif scen == 'quality':
        pg, logs = page_for(b, 1280, 720)
        pg.evaluate('TS.start({seed:3})'); pg.evaluate('TS.skipTo(700)'); pg.evaluate('TS.step(3)')
        for q in range(4):
            pg.evaluate(f'TS.setQuality({q})'); t0 = time.time()
            for k in range(3): pg.evaluate('TS.render()')
            print('quality', q, f'{(time.time()-t0)/3*1000:.0f} ms/frame (swiftshader)', pg.evaluate('JSON.stringify(TS.state().rt)'))
            shot(pg, f'q{q}')
        report(logs)
    elif scen == 'live':
        # real page (no ?test): rAF loop, audio, mouse input, pause menu
        ctx = b.new_context(viewport={'width': 1280, 'height': 720}); pg = ctx.new_page(); logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}')); pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        pg.goto(f'http://127.0.0.1:{PORT}/tranqsafari.html?q=medium', wait_until='load')
        pg.wait_for_selector('#menu:not(.hidden)', timeout=120000); pg.wait_for_timeout(1500); pg.screenshot(path=os.path.join(OUT, 'live-menu.png'))
        pg.click('#playBtn'); pg.wait_for_timeout(4000)
        pg.mouse.move(700, 330); pg.mouse.down(); pg.wait_for_timeout(120); pg.mouse.up(); pg.wait_for_timeout(600)
        pg.mouse.click(640, 360, button='right'); pg.wait_for_timeout(1500); pg.keyboard.press('KeyR')
        pg.screenshot(path=os.path.join(OUT, 'live-play.png')); print(pg.evaluate('JSON.stringify(TS.state())'))
        pg.keyboard.press('Escape'); pg.wait_for_timeout(400); pg.screenshot(path=os.path.join(OUT, 'live-pause.png'))
        pg.click('#pause .seg[data-set=quality] button[data-v="0"]'); pg.wait_for_timeout(300); pg.click('#resumeBtn'); pg.wait_for_timeout(1500)
        print('after low', pg.evaluate('JSON.stringify(TS.state())'))
        report(logs)
    elif scen == 'card':
        # arcade card art: 800x560 gameplay frames with the HUD hidden
        ctx = b.new_context(viewport={'width': 800, 'height': 560}, device_scale_factor=1); pg = ctx.new_page(); logs = []
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        pg.goto(f'http://127.0.0.1:{PORT}/tranqsafari.html?test&scale=1&q=max', wait_until='load'); pg.wait_for_function('window.TS && TS.ready', timeout=180000)
        pg.evaluate('TS.start({seed:3})'); pg.evaluate('TS.skipTo(436)'); pg.evaluate('TS.step(5.2)'); pg.evaluate('TS.aim(0.12,0.18)'); pg.evaluate('TS.step(0.6)')
        pg.evaluate('TS.hud(false)'); shot(pg, 'card-longneck')
        pg.evaluate('TS.hud(true)'); pg.evaluate('TS.skipTo(700)')
        for i in range(120):
            pg.evaluate('TS.step(0.1)')
            if pg.evaluate("TS.actors().some(a => a.state==='cling')"): break
        pg.evaluate('TS.step(0.5)'); pg.evaluate("(()=>{const a=TS.actors().find(a=>a.state==='cling'); if(a) TS.aimAt(a.id);})()"); pg.evaluate('TS.fire()'); pg.evaluate('TS.step(0.03)')
        pg.evaluate('TS.hud(false)'); shot(pg, 'card-cling')
        report(logs)
    elif scen == 'touch':
        # real touch events: drag on the trackpad zone moves the reticle, FIRE and RELOAD buttons work
        pg, logs = page_for(b, 860, 412, True, '&touch')
        pg.evaluate('TS.start({seed:3})'); pg.evaluate('TS.step(0.5)')
        cdp = pg.context.new_cdp_session(pg)
        def touch(kind, x, y): cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [] if kind == 'touchEnd' else [{'x': x, 'y': y}]})
        before = pg.evaluate('[TS._eval("INPUT.rx"), TS._eval("INPUT.ry")]')
        touch('touchStart', 300, 250)
        for i in range(1, 11): touch('touchMove', 300 + i * 12, 250 - i * 6)
        touch('touchEnd', 0, 0)
        after = pg.evaluate('[TS._eval("INPUT.rx"), TS._eval("INPUT.ry")]'); print('reticle', before, '->', after)
        box = pg.locator('#fireBtn').bounding_box(); pg.touchscreen.tap(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2); pg.evaluate('TS.step(0.3)')
        print('after FIRE tap', pg.evaluate('JSON.stringify({shots: TS.state().shots, ammo: TS.state().ammo})'))
        box = pg.locator('#reloadBtn').bounding_box(); pg.touchscreen.tap(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        print('after RELOAD tap', pg.evaluate('TS.state().reload'))
        shot(pg, 'touch-play'); report(logs)
    elif scen == 'js':
        pg, logs = page_for(b, 1280, 720)
        for e in args[1:]:
            if e.startswith('--'): break
            if e.startswith('shot:'): shot(pg, e[5:]); continue
            print(e, '=>', pg.evaluate(e))
        report(logs)
    b.close()
srv.shutdown()
