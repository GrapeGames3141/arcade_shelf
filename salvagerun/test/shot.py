"""Headless checks for Salvage Run (Python Playwright + SwiftShader).
usage: python test/shot.py [basic|zones|boss|full|mobile|quality|card|level N|lboss N|lfull N acc|hangar|modes|js] [args...]
Serves the game folder itself on port 8766; screenshots go to test/out/ (not committed).
"""
import sys, os, json, threading, http.server, socketserver, functools, time
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
scen = sys.argv[1] if len(sys.argv) > 1 else 'basic'
PORT = int(os.environ.get('SR_PORT', '8766'))

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

def page_for(b, w, h, mobile=False, q='medium', extra=''):
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
    pg = ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    t0 = time.time()
    pg.goto(f'http://127.0.0.1:{PORT}/salvagerun.html?test&q={q}{extra}', wait_until='load')
    pg.wait_for_function('window.SR_READY === true', timeout=180000)
    print(f'ready in {time.time() - t0:.1f}s', json.dumps(pg.evaluate('SR.info()')))
    return pg, logs

def shot(pg, name, render=True):
    if render: pg.evaluate('SR.render()')
    pg.screenshot(path=os.path.join(OUT, name + '.png')); print('shot', name)

def errs(logs):
    bad = [l for l in logs if ('error' in l.lower() or 'warn' in l.lower()) and 'GPU stall' not in l and 'favicon' not in l]
    for l in bad[:25]: print('  LOG', l[:600])
    return bad

def st(pg): return pg.evaluate('SR.state()')

srv = serve()
with sync_playwright() as p:
    b = launch(p)
    if scen == 'basic':
        pg, logs = page_for(b, 1280, 720)
        shot(pg, 'menu')
        pg.evaluate('SR.step(2)'); shot(pg, 'menu2')
        pg.evaluate('SR.start({seed:1})'); pg.evaluate('SR.step(1)'); shot(pg, 'start')
        pg.evaluate('SR.autopilot(true)')
        for t, name in [(8, 'g-08'), (12, 'g-20'), (15, 'g-35')]:
            pg.evaluate(f'SR.step({t})'); shot(pg, name); print(json.dumps(st(pg))[:600])
        errs(logs)
    elif scen == 'zones':
        pg, logs = page_for(b, 1280, 720)
        pg.evaluate('SR.start({seed:1})'); pg.evaluate('SR.autopilot(true)'); pg.evaluate('SR.god(true)')
        for s in [600, 1480, 1850, 2650, 3700, 4150, 5000, 5350, 6300, 7000]:
            pg.evaluate(f'SR.skip({s - 250})'); pg.evaluate('SR.step(6.5)'); shot(pg, f'z-{s}'); print(s, json.dumps(st(pg))[:300])
        errs(logs)
    elif scen == 'boss':
        pg, logs = page_for(b, 1280, 720)
        pg.evaluate('SR.start({seed:1})'); pg.evaluate('SR.boss()'); pg.evaluate('SR.god(true)')
        pg.evaluate('SR.step(2)'); shot(pg, 'b-intro')
        pg.evaluate('SR.step(5)'); shot(pg, 'b-tent'); print(json.dumps(st(pg)))
        pg.evaluate('SR.autopilot(true)')
        for i in range(12):
            pg.evaluate('SR.step(5)'); s = st(pg); print(json.dumps(s)[:400])
            if i % 2 == 1: shot(pg, f'b-{i:02d}')
            if s['phase'] == 'results': break
        shot(pg, 'b-end'); print(json.dumps(pg.evaluate('SR.stats()'))[:900])
        errs(logs)
    elif scen == 'full':
        pg, logs = page_for(b, 960, 540, q='low')
        acc = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
        pg.evaluate('SR.start({seed:1})'); pg.evaluate(f'SR.autopilot(true, {acc})')
        t_start = time.time(); last = None
        for i in range(400):
            pg.evaluate('SR.step(3)'); s = st(pg)
            if i % 10 == 0: print(f"t={s['runT']} s={s['s']} zone={s['zone']} score={s['score']} hull={s['hull']} ents={s['ents']} boss={s['boss']}")
            if s['phase'] == 'results': break
        shot(pg, 'full-end', render=False)
        r = pg.evaluate('SR.stats()'); print(json.dumps(r)); print(f'wall {time.time() - t_start:.0f}s')
        errs(logs)
    elif scen == 'mobile':
        for (w, h, nm) in [(390, 844, 'portrait'), (844, 390, 'landscape')]:
            pg, logs = page_for(b, w, h, mobile=True, extra='&touch')
            shot(pg, f'm-{nm}-menu')
            pg.evaluate('SR.grant({scatter:1, shield:1})'); pg.evaluate('SR.start({seed:1})'); pg.evaluate('SR.step(3)')
            # real touch drag to aim
            pg.mouse.move(w * 0.3, h * 0.6)
            cdp = pg.context.new_cdp_session(pg)
            def touch(type_, pts): cdp.send('Input.dispatchTouchEvent', {'type': type_, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)]})
            a0 = pg.evaluate('[AIM.x, AIM.y]')
            touch('touchStart', [(w * 0.3, h * 0.5)])
            for k in range(1, 8): touch('touchMove', [(w * 0.3 - k * 6, h * 0.5 - k * 4)])
            touch('touchEnd', [])
            a1 = pg.evaluate('[AIM.x, AIM.y]'); print('aim moved', a0, '->', a1)
            fire = pg.evaluate("(()=>{const r=document.getElementById('tFire').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
            touch('touchStart', [tuple(fire)]); pg.evaluate('SR.step(0.6)'); print('firing touch', pg.evaluate('[IN.touchFire, G.stats.shots]')); touch('touchEnd', [])
            lockb = pg.evaluate("(()=>{const r=document.getElementById('tLock').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
            pg.evaluate('SR.step(6)')
            touch('touchStart', [tuple(lockb)]); pg.evaluate('SR.step(0.1)'); print('lock on', pg.evaluate('LOCK.on'))
            pg.evaluate('SR.autopilot(false)'); tg = pg.evaluate('SR.targets()')
            pg.evaluate('SR.step(0.2)'); shot(pg, f'm-{nm}-lock')
            touch('touchEnd', []); pg.evaluate('SR.step(0.1)')
            modeb = pg.evaluate("(()=>{const r=document.getElementById('tMode').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,r.width]})()")
            m0 = pg.evaluate('WEAP.mode'); touch('touchStart', [tuple(modeb[:2])]); touch('touchEnd', []); print('MODE button', modeb, m0, '->', pg.evaluate('WEAP.mode'))
            pg.evaluate('SR.autopilot(true)'); pg.evaluate('SR.step(12)'); shot(pg, f'm-{nm}-play')
            pg.evaluate('SR.pause(true)'); shot(pg, f'm-{nm}-pause'); pg.evaluate('SR.pause(false)')
            errs(logs); pg.context.close()
    elif scen == 'quality':
        pg, logs = page_for(b, 1280, 720, q='low')
        pg.evaluate('SR.start({seed:1})'); pg.evaluate('SR.skip(3300)'); pg.evaluate('SR.step(5)')
        for q in [0, 1, 2, 3]:
            print(pg.evaluate(f'SR.setQuality({q})')); t0 = time.time(); r = pg.evaluate('SR.render()'); print('render', f'{(time.time() - t0) * 1000:.0f}ms', json.dumps(r), json.dumps(pg.evaluate('SR.info()')))
            shot(pg, f'q-{q}', render=False)
        errs(logs)
    elif scen == 'card':
        pg, logs = page_for(b, 800, 560, q='max')
        sval = float(sys.argv[2]) if len(sys.argv) > 2 else 1640
        pg.evaluate('SR.start({seed:1})'); pg.evaluate('SR.hud(false)'); pg.evaluate('SR.god(true)'); pg.evaluate(f'SR.skip({sval})'); pg.evaluate('SR.autopilot(true)'); pg.evaluate('SR.step(5.5)')
        shot(pg, 'card'); errs(logs)
    elif scen == 'level':
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 2
        pg, logs = page_for(b, 1280, 720)
        print(json.dumps(pg.evaluate(f'SR.level({n})')))
        pg.evaluate(f'SR.start({{level:{n}, seed:1}})'); pg.evaluate('SR.autopilot(true)'); pg.evaluate('SR.god(true)')
        stop = pg.evaluate('S_STOP'); marks = [int(x) for x in sys.argv[3:]] or [int(stop * k) for k in (0.05, 0.16, 0.3, 0.45, 0.6, 0.75, 0.9, 0.98)]
        for sv in marks:
            pg.evaluate(f'SR.skip({max(10, sv - 250)})'); pg.evaluate('SR.step(6.5)'); shot(pg, f'l{n}-{sv}'); print(sv, json.dumps(st(pg))[:300])
        errs(logs)
    elif scen == 'lboss':
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 2; god = (sys.argv[3] if len(sys.argv) > 3 else 'god') == 'god'
        pg, logs = page_for(b, 1280, 720)
        pg.evaluate(f'SR.level({n})'); pg.evaluate(f'SR.start({{level:{n}, seed:1}})'); pg.evaluate('SR.boss()'); pg.evaluate(f'SR.god({str(god).lower()})')
        pg.evaluate('SR.step(2)'); shot(pg, f'lb{n}-intro')
        pg.evaluate('SR.step(4)'); shot(pg, f'lb{n}-a'); print(json.dumps(st(pg)))
        pg.evaluate('SR.autopilot(true, 0.7)')
        for i in range(30):
            pg.evaluate('SR.step(4)'); s2 = st(pg); print(json.dumps({k: s2[k] for k in ('runT', 'score', 'hull', 'boss', 'phase', 'ents')}))
            if i % 2 == 1: shot(pg, f'lb{n}-{i:02d}')
            if s2['phase'] == 'results': break
        shot(pg, f'lb{n}-end'); print(json.dumps(pg.evaluate('SR.stats()'))[:900])
        errs(logs)
    elif scen == 'lfull':
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 2; acc = float(sys.argv[3]) if len(sys.argv) > 3 else 0.6
        grant = sys.argv[4] if len(sys.argv) > 4 else '{}'
        pg, logs = page_for(b, 960, 540, q='low')
        pg.evaluate(f'SR.level({n})'); pg.evaluate(f'SR.grant({grant})'); pg.evaluate(f'SR.start({{level:{n}, seed:1}})'); pg.evaluate(f'SR.autopilot(true, {acc})')
        t_start = time.time()
        for i in range(400):
            pg.evaluate('SR.step(3)'); s2 = st(pg)
            if i % 10 == 0: print(f"t={s2['runT']} s={s2['s']} zone={s2['zone']} score={s2['score']} hull={s2['hull']} ents={s2['ents']} boss={s2['boss']}")
            if s2['phase'] == 'results': break
        shot(pg, f'lfull{n}-end')
        r = pg.evaluate('SR.stats()'); print(json.dumps(r)); print(f'wall {time.time() - t_start:.0f}s')
        errs(logs)
    elif scen == 'hangar':
        pg, logs = page_for(b, 1280, 720)
        pg.evaluate('SR.wallet(520000)'); pg.evaluate('SR.unlock(3)'); pg.evaluate('SR.menu()'); shot(pg, 'h-menu')
        pg.evaluate('SR.hangar(3)'); shot(pg, 'h-hangar')
        for sel in ['#upList .uprow:nth-child(1) button', '#upList .uprow:nth-child(5) button', '#modeList .uprow:nth-child(3) button']:
            pg.click(sel); print('bought', sel, pg.evaluate('SR.wallet()'))
        shot(pg, 'h-bought'); print(json.dumps(pg.evaluate('SR.camp()')))
        pg.evaluate('SR.levels()'); shot(pg, 'h-levels')
        pg.click('#lvList .lvcard:nth-child(2)'); pg.evaluate('SR.step(3)'); print(json.dumps(st(pg)))
        pg.evaluate('SR.god(true)'); pg.evaluate('SR.boss()'); pg.evaluate('SR.autopilot(true)');
        for i in range(40):
            pg.evaluate('SR.step(4)')
            if st(pg)['phase'] == 'results': break
        shot(pg, 'h-results'); print(json.dumps(pg.evaluate('SR.camp()'))[:600])
        pg.click('#nextBtn'); pg.evaluate('SR.step(0.5)'); shot(pg, 'h-hangar-next')
        pg.set_viewport_size({'width': 390, 'height': 844}); pg.evaluate('SR.render()'); shot(pg, 'h-hangar-phone', render=False)
        errs(logs)
    elif scen == 'modes':
        pg, logs = page_for(b, 1280, 720)
        pg.evaluate("SR.grant({scatter:1, beam:1, flak:1, shield:1, warhead:1})"); pg.evaluate('SR.start({level:1, seed:1})'); pg.evaluate('SR.god(true)')
        for m, sv in [('scatter', 1830), ('beam', 1000), ('flak', 2160), ('cannon', 600)]:
            pg.evaluate(f"SR.mode('{m}')"); pg.evaluate(f'SR.skip({sv - 250})'); pg.evaluate('SR.autopilot(true)'); pg.evaluate('SR.step(6.2)')
            shot(pg, f'mode-{m}'); s2 = st(pg); print(m, json.dumps({k: s2[k] for k in ('score', 'mode', 'heat', 'shield', 'ents')}), json.dumps({k: pg.evaluate('SR.stats()')[k] for k in ('shots', 'hits', 'kills')}))
        errs(logs)
    elif scen == 'js':
        pg, logs = page_for(b, 1280, 720)
        for i, step in enumerate(sys.argv[2:]):
            if step.startswith('shot:'): shot(pg, step[5:])
            else: print(step, '=>', json.dumps(pg.evaluate(step))[:1500])
        errs(logs)
    b.close()
srv.shutdown()
