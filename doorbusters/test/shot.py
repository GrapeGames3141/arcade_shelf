"""Headless checks for Doorbusters (Python Playwright + SwiftShader).
usage: python test/shot.py [basic|mobile|match|quality] [--port 8765]
Serves the game folder itself; screenshots go to test/out/.
"""
import sys, os, json, threading, http.server, socketserver, functools, time
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
scen = sys.argv[1] if len(sys.argv) > 1 else 'basic'
PORT = 8765

def serve():
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Q, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(('127.0.0.1', PORT), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def launch(p):
    exe = '/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
    return p.chromium.launch(executable_path=exe, headless=True, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])

def page_for(b, w, h, mobile=False):
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
    pg = ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(f'http://127.0.0.1:{PORT}/doorbusters.html?test', wait_until='load')
    pg.wait_for_timeout(1500)
    return pg, logs

def shot(pg, name):
    pg.evaluate('DB.render()'); pg.screenshot(path=os.path.join(OUT, name + '.png')); print('shot', name)

def errs(logs):
    bad = [l for l in logs if ('error' in l.lower() or 'warn' in l.lower()) and 'GPU stall' not in l and 'favicon' not in l and '404' not in l]
    for l in bad[:20]: print('  LOG', l)
    return bad

srv = serve()
with sync_playwright() as p:
    b = launch(p)
    if scen in ('basic', 'quality'):
        pg, logs = page_for(b, 1280, 720)
        pg.evaluate(f'DB.setQuality({2 if scen=="basic" else 3})')
        shot(pg, 'menu')
        pg.evaluate('DB.start({diff:1, seed:3})')
        pg.evaluate('DB.step(0.6)'); shot(pg, 'line-intro')
        pg.evaluate('DB.step(3.5)'); shot(pg, 'line-follow')
        pg.evaluate('DB.autopilot(true)')
        pg.evaluate('DB.step(5.0)'); shot(pg, 'doors-open')
        pg.evaluate('DB.step(2.2)'); shot(pg, 'rush')
        pg.evaluate('DB.step(12)'); shot(pg, 'sale-12s')
        print(json.dumps(pg.evaluate('DB.state()'))[:900])
        pg.evaluate('DB.step(30)'); shot(pg, 'sale-42s')
        pg.evaluate('DB.teleport(-9.5,-12,Math.PI)'); pg.evaluate('DB.step(0.2)'); shot(pg, 'checkout-view')
        pg.evaluate('DB.teleport(0,-16,Math.PI)'); pg.evaluate('DB.step(0.2)'); shot(pg, 'dealzone-view')
        pg.evaluate('DB.step(140)'); pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(OUT, 'receipt.png')); print('shot receipt')
        print(json.dumps(pg.evaluate('DB.stats()')))
        print('fps', pg.evaluate('DB.RSTAT'))
        errs(logs)
    elif scen == 'js':
        pg, logs = page_for(b, 960, 540)
        for expr in sys.argv[2:]:
            if expr.startswith('shot:'): shot(pg, expr[5:]); continue
            r = pg.evaluate(expr)
            if r is not None: print(json.dumps(r) if not isinstance(r, str) else r)
        errs(logs)
    elif scen == 'mobile':
        pg, logs = page_for(b, 390, 844, mobile=True)
        pg.evaluate('DB.setQuality(1)')
        shot(pg, 'm-menu')
        pg.evaluate('DB.start({diff:1, seed:5}); DB.step(4)'); shot(pg, 'm-line')
        pg.evaluate('DB.skipLine(); DB.autopilot(true); DB.step(25)'); shot(pg, 'm-sale')
        pg.set_viewport_size({'width': 844, 'height': 390}); pg.wait_for_timeout(200); shot(pg, 'm-landscape')
        # real pointer input: joystick drag on the left, tap right half to shove, tap pause
        pg.evaluate('DB.autopilot(false)')
        pg.mouse.move(150, 300); pg.mouse.down(); pg.mouse.move(150, 240, steps=4); pg.wait_for_timeout(100)
        print('joystick', pg.evaluate('DB.IN.update(), [DB.IN.thr, DB.IN.steer]'))
        pg.mouse.up(); pg.wait_for_timeout(50)
        print('released', pg.evaluate('DB.IN.update(), [DB.IN.thr, DB.IN.steer]'))
        pg.touchscreen.tap(700, 200); pg.wait_for_timeout(150); print('shove fired (lunge cooldown>0)', pg.evaluate('DB.G.player.lungeCd > 0'))
        pg.touchscreen.tap(28, 30); pg.wait_for_timeout(100)
        print('paused', pg.evaluate("!document.getElementById('pause').classList.contains('hidden')"))
        errs(logs)
    elif scen == 'match':
        pg, logs = page_for(b, 640, 360)
        pg.evaluate('DB.setQuality(0)')
        for diff in (0, 1, 2):
            pg.evaluate(f'DB.start({{diff:{diff}, seed:{11+diff}}}); DB.autopilot(true); DB.step(9.2)')
            spd = [];
            for i in range(18):
                pg.evaluate('DB.step(10)')
                st = pg.evaluate('DB.state()')
                if st['phase'] != 'sale': break
                spd.append(sum(r['sp'] for r in st['rivals'])/len(st['rivals']))
            stats = pg.evaluate('DB.stats()')
            tot = sum(s['banked'] for s in stats)
            print(f'diff {diff}: avg rival speed {sum(spd)/max(1,len(spd)):.2f} m/s; total banked {tot}; per cart:')
            for s in sorted(stats, key=lambda s: -s['banked']): print('   ', s)
        errs(logs)
    b.close()
srv.shutdown()
