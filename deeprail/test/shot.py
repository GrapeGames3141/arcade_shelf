"""Headless checks for Deep Rail (Python Playwright + SwiftShader).
usage: python test/shot.py [basic|mobile|run|quality|tour|js] [args]
  basic    menu, start, tutorial, eyes, flare, hoist room, junction, river, crystal cavern, boss, results (+ stats)
  mobile   390x844 portrait and landscape, real touch pointer events on FIRE / FLARE / drag-aim / pause
  run      full autopilot rides (both branch pairs), prints balance stats per run
  quality  the same view at LOW, MEDIUM, HIGH and MAX with timings
  tour     camera snapshots of every set piece (segment, s) with lights on
  js       evaluate expressions in order: python test/shot.py js "DR.start()" "DR.step(5)" "shot:name"
Serves the game folder itself on port 8766; screenshots go to test/out/.
"""
import sys, os, json, threading, http.server, socketserver, functools, time
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
scen = sys.argv[1] if len(sys.argv) > 1 else 'basic'
PORT = 8766

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

def page_for(b, w, h, mobile=False, flags='test&scale=1'):
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
    pg = ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(f'http://127.0.0.1:{PORT}/deeprail.html?{flags}', wait_until='load')
    pg.wait_for_timeout(800)
    return pg, logs

def shot(pg, name):
    t = time.time(); pg.evaluate('DR.render()'); pg.evaluate('new Promise(r=>requestAnimationFrame(()=>r()))'); pg.evaluate('DR.render()'); pg.screenshot(path=os.path.join(OUT, name + '.png')); print('shot', name, f'{time.time()-t:.1f}s')

def errs(logs):
    bad = [l for l in logs if ('error' in l.lower() or 'warn' in l.lower()) and 'GPU stall' not in l and 'favicon' not in l and '404' not in l and 'GL Driver Message' not in l]
    for l in bad[:25]: print('  LOG', l)
    print('errors/warnings:', len(bad))
    return bad

def ev(pg, s):
    r = pg.evaluate(s)
    if r is not None: print(json.dumps(r)[:1200])
    return r

srv = serve()
with sync_playwright() as p:
    b = launch(p)
    if scen == 'js':
        pg, logs = page_for(b, 960, 540)
        for expr in sys.argv[2:]:
            if expr.startswith('shot:'): shot(pg, expr[5:]); continue
            ev(pg, expr)
        errs(logs)
    elif scen == 'basic':
        pg, logs = page_for(b, 1280, 720)
        ev(pg, 'DR.track()')
        shot(pg, 'menu')
        ev(pg, 'DR.start()'); ev(pg, 'DR.step(2.5)'); shot(pg, 'b01-start')
        ev(pg, 'DR.step(4)'); shot(pg, 'b02-tutorial')
        ev(pg, 'DR.aim(.15,.05); DR.fire(true); DR.step(1.0); DR.fire(false); DR.state()'); shot(pg, 'b03-shooting')
        ev(pg, 'DR.step(2.5); DR.aim(0,.1); DR.flare(); DR.step(.6); DR.state()'); shot(pg, 'b04-flare-flying')
        ev(pg, 'DR.step(1.2)'); shot(pg, 'b05-flare-burning')
        ev(pg, 'DR.bot(true,.85,{A:0,B:0}); DR.step(8)'); shot(pg, 'b06-bats')
        ev(pg, 'DR.step(10)'); shot(pg, 'b07-hoist')
        ev(pg, 'DR.step(8)'); shot(pg, 'b08-junction')
        ev(pg, 'DR.step(14)'); shot(pg, 'b09-gallery')
        ev(pg, 'DR.step(12)'); shot(pg, 'b10-river')
        ev(pg, 'DR.step(12)'); shot(pg, 'b11-river2')
        ev(pg, 'DR.step(12)'); shot(pg, 'b12-crystal')
        ev(pg, 'DR.step(10)'); shot(pg, 'b13-crystal2')
        ev(pg, 'DR.step(30)'); shot(pg, 'b14-falls')
        ev(pg, 'DR.step(20)'); shot(pg, 'b15-hollow')
        ev(pg, 'DR.step(10)'); shot(pg, 'b16-boss')
        ev(pg, 'DR.step(15)'); shot(pg, 'b17-boss2')
        ev(pg, 'DR.state()'); ev(pg, 'DR.boss()')
        for i in range(12):
            st = pg.evaluate('DR.step(10)')
            if st['phase'] == 'results': break
        ev(pg, 'DR.state()'); pg.wait_for_timeout(200); shot(pg, 'b18-results'); ev(pg, 'DR.stats()')
        errs(logs)
    elif scen == 'quality':
        pg, logs = page_for(b, 1280, 720)
        ev(pg, "DR.start({seg:'intro', s:96, calm:true}); DR.lightAll('intro'); DR.step(1.5); DR.aim(.2,.05); DR.flare(); DR.step(1.4); 1")
        for i, n in enumerate(['low', 'medium', 'high', 'max']):
            ev(pg, f'DR.setQuality({i})'); pg.evaluate('DR.render()')
            t = time.time(); shot(pg, 'q-' + n); print(n, pg.evaluate('JSON.stringify(DR.perf)'), f'{time.time()-t:.2f}s')
        errs(logs)
    elif scen == 'mobile':
        pg, logs = page_for(b, 390, 844, mobile=True, flags='test&scale=1&touch')
        ev(pg, 'DR.setQuality(1)'); shot(pg, 'm-menu')
        pg.tap('#playBtn'); pg.wait_for_timeout(100); ev(pg, 'DR.step(6); DR.state()'); shot(pg, 'm-play')
        # relative drag aim with a real touch pointer on the canvas
        ev(pg, "(()=>{const c=document.getElementById('gl'); const f=(t,x,y)=>c.dispatchEvent(new PointerEvent(t,{pointerId:7,pointerType:'touch',clientX:x,clientY:y,bubbles:true,isPrimary:true})); f('pointerdown',150,500); for(let i=1;i<=10;i++) window.dispatchEvent(new PointerEvent('pointermove',{pointerId:7,pointerType:'touch',clientX:150+i*6,clientY:500-i*4,bubbles:true})); window.dispatchEvent(new PointerEvent('pointerup',{pointerId:7,pointerType:'touch',bubbles:true})); return DR.G.aim})()")
        fb = pg.query_selector('#fireBtn').bounding_box(); print('fire button', fb)
        ev(pg, "(()=>{const b=document.getElementById('fireBtn'); b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:9,pointerType:'touch',bubbles:true})); const s1=DR.G.firing; DR.step(.5); const shots=DR.G.stats.shots; b.dispatchEvent(new PointerEvent('pointerup',{pointerId:9,pointerType:'touch',bubbles:true})); return {firing:s1, shots, after:DR.G.firing}})()")
        ev(pg, "(()=>{const f0=DR.G.flares; document.getElementById('flareBtn').dispatchEvent(new PointerEvent('pointerdown',{pointerId:10,pointerType:'touch',bubbles:true})); return {before:f0, after:DR.G.flares}})()")
        ev(pg, 'DR.step(1)'); shot(pg, 'm-flare')
        ev(pg, "document.getElementById('autoBtn').dispatchEvent(new PointerEvent('pointerdown',{pointerId:11,pointerType:'touch',bubbles:true})); DR.G.autoFire")
        ev(pg, 'DR.bot(true,.8); DR.step(20); DR.bot(false); DR.state()'); shot(pg, 'm-mid')
        pg.tap('#pauseBtn'); pg.wait_for_timeout(100); shot(pg, 'm-pause'); ev(pg, 'DR.G.paused')
        pg.tap('#resumeBtn'); pg.wait_for_timeout(100)
        pg.set_viewport_size({'width': 844, 'height': 390}); pg.wait_for_timeout(200); ev(pg, "DR.start({seg:'crystal',s:30}); DR.lightAll('crystal'); DR.step(1)"); shot(pg, 'm-landscape')
        errs(logs)
    elif scen == 'tour':
        pg, logs = page_for(b, 1280, 720)
        stops = [('intro', 3), ('intro', 60), ('intro', 240), ('intro', 372), ('river', 120), ('river', 230), ('river', 300), ('seam', 120), ('crystal', 4), ('crystal', 50), ('falls', 60), ('nest', 40), ('hollow', 70), ('loop', 30), ('exit', 200)]
        for seg, s in stops:
            ev(pg, f"DR.start({{seg:'{seg}', s:{s}, bossDead:{'true' if seg=='exit' else 'false'}}}); DR.god(true); DR.step(.6)")
            shot(pg, f'tour-{seg}-{s}')
        errs(logs)
    elif scen == 'card':
        # arcade card: 800x560 gameplay, HUD hidden
        pg, logs = page_for(b, 800, 560, flags='test&scale=1&q=max')
        ev(pg, "DR.start({seg:'loop', s:16, calm:true, wake:true}); DR.lightAll('loop'); DR.god(true); DR.step(1.2); DR.BOSS.atkCD=99; 1")
        ev(pg, "DR.eval('launchFlare(muzzlePos(), V.add(BOSS.head,[3,2,0]))'); DR.step(1.4); DR.bot(true,.9); DR.step(1.3); 1")
        ev(pg, "document.getElementById('hud').classList.add('hidden'); document.getElementById('hud2d').style.display='none'; 1")
        shot(pg, 'card-a')
        ev(pg, "DR.start({seg:'crystal', s:16, calm:true}); DR.lightAll('crystal'); DR.god(true); DR.eval('spawnSwarm(TRACK.segs.crystal, 40, 12)'); DR.step(2.2); DR.aim(.1,.1); DR.fire(true); DR.step(.3); 1")
        ev(pg, "document.getElementById('hud').classList.add('hidden'); document.getElementById('hud2d').style.display='none'; 1")
        shot(pg, 'card-b')
        ev(pg, "DR.start({seg:'intro', s:150, calm:true}); DR.god(true); DR.step(2.8); DR.aim(-.02,.2); DR.flare(); DR.eval('spawnSwarm(TRACK.segs.intro, G.cart.s + 15, 9)'); DR.step(.85); DR.aim(.1,.1); DR.fire(true); DR.step(.12); DR.fire(false); 1")
        ev(pg, "document.getElementById('hud').classList.add('hidden'); document.getElementById('hud2d').style.display='none'; 1")
        shot(pg, 'card-c')
        errs(logs)
    elif scen == 'run':
        pg, logs = page_for(b, 640, 360)
        combos = [(0, 0), (1, 1), (0, 1), (1, 0)]
        skill = float(sys.argv[2]) if len(sys.argv) > 2 else .8
        for (a, bb) in combos[:int(sys.argv[3]) if len(sys.argv) > 3 else 2]:
            ev(pg, f'DR.start(); DR.bot(true,{skill},{{A:{a},B:{bb}}})')
            t0 = time.time()
            for i in range(60):
                st = pg.evaluate('DR.step(10)')
                if i % 3 == 0: print('  ', st['t'], st['seg'], st['s'], 'hp', st['health'], 'score', st['score'], 'boss', st['boss'], st['bossEyes'])
                if st['phase'] == 'results': break
            r = pg.evaluate('DR.result()'); s = pg.evaluate('DR.stats()')
            print('RUN', a, bb, 'skill', skill, json.dumps({k: r[k] for k in ['survived', 'score', 'total', 'grade', 'lit', 'litTotal', 'acc', 'time']}), json.dumps({k: s[k] for k in ['kills', 'dmgTaken', 'maxMult', 'flares', 'crashes', 'snipes', 'scared', 'boss', 'dmgBy'] if k in s}), f'{time.time()-t0:.0f}s wall')
        errs(logs)
    b.close()
srv.shutdown()
