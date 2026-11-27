"""Headless checks for Staff Training (Python Playwright + SwiftShader).
usage: python test/shot.py js "<expr>" "shot:name" ...   |  python test/shot.py menu | mobile [sandbox] | next | lessons [n..] | fuzz [n..] | card
Serves the game folder itself; screenshots go to test/out/.
"""
import sys, os, json, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
scen = sys.argv[1] if len(sys.argv) > 1 else 'menu'
PORT = 8771

def serve():
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(('127.0.0.1', PORT), functools.partial(Q, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start(); return srv

def launch(p):
    exe = '/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None
    return p.chromium.launch(executable_path=exe, headless=True, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])

def page_for(b, w, h, mobile=False, test=True, sandbox=False):
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
    pg = ctx.new_page(); logs = []
    # sandbox=True imitates a locked-down preview frame: Gamepad API and storage both throw
    if sandbox: pg.add_init_script("navigator.getGamepads = () => { throw new DOMException('gamepad disallowed', 'SecurityError'); }; try { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('no storage', 'SecurityError'); } }); } catch (e) {}")
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(f'http://127.0.0.1:{PORT}/stafftraining.html' + ('?test' if test else ''), wait_until='load')
    pg.wait_for_timeout(1200)
    return pg, logs

def shot(pg, name):
    pg.evaluate('ST.render()'); pg.screenshot(path=os.path.join(OUT, name + '.png')); print('shot', name)

def errs(logs):
    bad = [l for l in logs if ('error' in l.lower() or 'warn' in l.lower()) and 'GPU stall' not in l and 'favicon' not in l and '404' not in l]
    for l in bad[:25]: print('  LOG', l[:600])
    return bad

CARD_JS = r'''() => {
  SETTINGS.quality = 3; ST.start(2);
  // stage: both staff in the kitchen aisle behind the island, facing the cat
  const M = HUM[0], D = HUM[1];
  const stand = (h, x, z, pose) => { h.seat = null; h.pinned = false; h.x = x; h.z = z; h.y = 0; h.h = 0; h.carry = null; setPlan(h, 'photo', [stepUntil(() => false, pose)], 9); h.pose = pose; humanPoseUpdate(h, 0, true); };
  stand(M, 0.5, -3.4, 'shrug'); stand(D, -1.12, -3.36, 'facepalm');
  ST.tp(-0.25, -2.5, 0, 0.92); ST.step(0.4);
  const mug = PROPS.find(p => p.def.id === 'cmug');
  doKnock(mug); ST.step(0.2);
  const camPos = [-0.52, 1.24, -0.86];
  CAT.lookAt = { x: camPos[0], z: camPos[2], y: camPos[1] + 0.25 };
  ST.step(0.7);
  M.lookCat = 9; D.lookCat = 0; M.headYaw = -0.5; M.patience = 20; M.talkT = 9;
  // the mug, caught just past the edge
  mug.st = 'fall'; mug.x = -0.2; mug.z = -1.98; mug.y = 0.88; mug.tilt = 1.0; mug.rot = 2.4; mug.vx = mug.vz = mug.vy = 0; mug.spin = 0;
  CAT.pose.paw = 1; CAT.pose.pupil = 0.7; CAT.pose.eye = 1.1; CAT.blink = 3;
  window.camUpdate = () => {};
  CAM.pos = camPos; CAM.tgt = [-0.18, 1.06, -2.5]; CAM.fov = 42 * Math.PI / 180;
  document.getElementById('hud').classList.add('hidden'); document.getElementById('labels').style.display = 'none';
  G.pops = []; buildScene(); renderFrame(3);
}'''

srv = serve()
with sync_playwright() as p:
    b = launch(p)
    if scen == 'js':
        w, h = 1280, 720
        args = sys.argv[2:]
        if args and args[0].startswith('size:'): w, h = map(int, args[0][5:].split('x')); args = args[1:]
        pg, logs = page_for(b, w, h, mobile=w < 600)
        for expr in args:
            if expr.startswith('shot:'): shot(pg, expr[5:]); continue
            r = pg.evaluate(expr)
            if r is not None: print(json.dumps(r) if not isinstance(r, str) else r)
        errs(logs)
    elif scen == 'menu':
        pg, logs = page_for(b, 1280, 720); shot(pg, 'menu'); errs(logs)

    elif scen in ('lessons', 'play'):
        which = [int(a) for a in sys.argv[2:]] or [0, 1, 2, 3, 4, 5]
        pg, logs = page_for(b, 960, 540)
        ev = pg.evaluate
        def step(t): ev(f'ST.step({t})')
        def tp(x, z, h, y=None): ev(f'ST.tp({x},{z},{h}' + (f',{y})' if y is not None else ')'))
        def press(n, wait=0.6): ev(f"ST.press('{n}')"); step(wait)
        def st(): return ev('ST.state()')
        def until(cond, mx=60, act=None, dt=0.5):
            t = 0
            while t < mx:
                s = st()
                if s['phase'] != 'play' or cond(s): return t
                if act: act(s)
                else: step(dt)
                t += dt
            return -1
        def summary(tag):
            s = st(); print(f"  [{tag}] clock {s['clock']} phase {s['phase']} obj {s['obj']} extra {s['extra']} dignity {s['cat']['dignity']} pat {[h['pat'] for h in s['staff']]} status {s['status']} canFinish {s['canFinish']}")
        ev('ST.setQuality(1)')
        if 0 in which:
            print('LESSON 1'); ev('ST.start(0)'); tp(-4.45, -3.75, 3.14); step(0.3)
            t = until(lambda s: s['staff'][0]['plan'] == 'feed', 90, lambda s: press('mis')); print('  marcus caved after', t, 's')
            until(lambda s: s['bowl'] > 0, 40); shot(pg, 'b1-fed'); tp(-0.85, -2.9, -1.57); step(0.3); print('  charm =', st()['charm']); press('charm', 3.0); summary('ate')
            shot(pg, 'b1-ate'); ev('ST.finish()'); step(0.1); pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(OUT, 'b1-report.png')); print('  result', ev('ST.G.result'))
        if 1 in which:
            print('LESSON 2'); ev('ST.start(1)'); tp(1.3, -2.6, 3.14); step(0.3)
            t = until(lambda s: s['staff'][0]['plan'] == 'feed', 60, lambda s: press('meow', 0.9)); print('  marcus feeding after', t)
            until(lambda s: s['bowl'] > 0, 40); tp(-0.85, -2.9, -1.57); step(0.2); press('charm', 3.0); summary('meal1'); shot(pg, 'b2-meal1')
            t = until(lambda s: s['staff'][1]['pose'] == 'cook' and s['staff'][1]['plan'] == 'routine', 120); print('  dana in kitchen after', t, st()['staff'][1]); tp(1.2, -2.5, 3.14); step(0.2); shot(pg, 'b2-dana')
            t = until(lambda s: s['staff'][1]['plan'] == 'feed', 60, lambda s: press('meow', 0.9)); print('  dana feeding after', t, 'knows', ev('ST.HUM.map(h=>h.knowsFed)'))
            until(lambda s: s['bowl'] > 0, 40); tp(-0.85, -2.9, -1.57); step(0.2); press('charm', 3.0); summary('meal2'); step(40); summary('later'); shot(pg, 'b2-later')
        if 2 in which:
            print('LESSON 3'); ev('ST.start(2)');
            def sit(s):
                if s['cat']['mode'] == 'free': tp(5.45, 0.85, 0.0, 0.75); step(0.2); press('mis', 0.5)
                else: step(0.5)
            tp(5.45, 0.85, 0.0, 0.75); step(0.2); print('  ctx', st()['mis'], st()['charm']); press('charm', 1.6); shot(pg, 'b3-meeting');
            t = until(lambda s: 'laptop:Y' in s['obj'], 150, sit); print('  laptop done after', t, 'status', st()['status']); shot(pg, 'b3-laptop'); summary('laptop')
            tp(-3.5, 3.62, -1.57, 0.45); step(0.3); print('  ctx', st()['mis'], st()['charm'])
            t = until(lambda s: s['cat']['sit'] == 'lap', 60, lambda s: press('charm', 0.9)); print('  lap after', t); shot(pg, 'b3-lap'); step(9); summary('lap')
        if 3 in which:
            print('LESSON 4'); ev('ST.start(3)')
            def rep(x, z, h, n, tag):
                for i in range(n):
                    tp(x, z, h); step(0.3); c = st()['mis']
                    t = until(lambda s: any(p['plan'] == 'door' for p in s['staff']), 60, lambda s: press('mis', 0.8))
                    who = [p['n'] for p in st()['staff'] if p['plan'] == 'door']
                    until(lambda s: not any(p['plan'] == 'door' for p in s['staff']), 40)
                    print(f'  {tag} rep {i}: ctx {c} wait {t}s by {who} ->', st()['status'], st()['obj'])
            rep(4.05, -1.35, 3.14, 1, 'bath'); shot(pg, 'b4-bath'); rep(-2.5, -0.15, 3.14, 3, 'bed'); shot(pg, 'b4-bed'); rep(2.9, 4.0, 0, 2, 'front'); shot(pg, 'b4-front'); summary('doors')
        if 4 in which:
            print('LESSON 5'); ev('ST.start(4)')
            def knock(x, z, h, y, n, tag):
                for i in range(n):
                    tp(x, z, h, y); step(0.3); c = st()['mis']; press('mis', 0.2)
                    if i == 0: step(0.5); shot(pg, 'b5-' + tag);
                    f0 = st()['status']; t = until(lambda s: s['status'] != f0, 45); print(f'  {tag} {i}: ctx {c} fetched after {t}s ->', st()['status'], st()['obj'], 'pat', [p['pat'] for p in st()['staff']])
            knock(-0.85, -4.25, 0, 0.92, 3, 'salt'); knock(-3.95, 2.12, 3.14, 0.42, 3, 'remote'); summary('fetch'); shot(pg, 'b5-end')
        if 5 in which:
            print('LESSON 6'); ev('ST.start(5)'); tp(-4.0, -3.3, 3.14, 0.56); step(0.3); print('  ctx', st()['mis'], st()['charm']); shot(pg, 'b6-start')
            t = until(lambda s: 'share:Y' in s['obj'], 60, lambda s: press('mis', 1.1)); print('  share reached after', t, st()['status'], 'pat', [p['pat'] for p in st()['staff']]); shot(pg, 'b6-share')
            print('  ctx', st()['mis'], st()['charm']); press('charm', 0.5); print('  sit', st()['cat']['sit'])
            t = until(lambda s: 'settle:Y' in s['obj'], 200, None, 2); print('  settled after', t); summary('bed'); shot(pg, 'b6-settle')
        errs(logs)

    elif scen == 'mobile':
        # real loop (no ?test), real taps and a real joystick drag
        pg, logs = page_for(b, 390, 844, mobile=True, test=False, sandbox='sandbox' in sys.argv)
        pg.screenshot(path=os.path.join(OUT, 'r-menu.png'))
        pg.tap('#toc button'); pg.wait_for_timeout(400); pg.screenshot(path=os.path.join(OUT, 'r-brief.png'))
        pg.tap('#bBegin'); pg.wait_for_timeout(1500); pg.screenshot(path=os.path.join(OUT, 'r-play0.png'))
        cdp = pg.context.new_cdp_session(pg)
        def touch(kind, pts): cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)]})
        touch('touchStart', [(90, 640)]); touch('touchMove', [(90, 585)]); pg.wait_for_timeout(1200)
        print('joystick up:', pg.evaluate('[ST.IN.thr.toFixed(2), ST.IN.steer.toFixed(2), ST.CAT.z.toFixed(2)]'))
        pg.screenshot(path=os.path.join(OUT, 'r-joy.png'))
        touch('touchMove', [(140, 600)]); pg.wait_for_timeout(500); print('joystick right:', pg.evaluate('[ST.IN.thr.toFixed(2), ST.IN.steer.toFixed(2), ST.CAT.h.toFixed(2)]'))
        touch('touchEnd', []); pg.wait_for_timeout(200); print('released:', pg.evaluate('[ST.IN.thr, ST.IN.steer]'))
        pg.tap('#bMeow'); pg.wait_for_timeout(300); print('meows', pg.evaluate('ST.G.stats.meows'))
        pg.tap('#bJump'); pg.wait_for_timeout(900); print('cat', pg.evaluate('ST.state().cat'))
        pg.tap('#bMis'); pg.wait_for_timeout(600); print('after mischief', pg.evaluate('[ST.state().cat.mode, ST.state().cat.sit]'))
        pg.tap('#bZoom'); pg.wait_for_timeout(1500); pg.screenshot(path=os.path.join(OUT, 'r-zoom.png')); print('zoomed', pg.evaluate('[ST.G.stats.zooms, ST.state().cat]'))
        pg.tap('#pauseBtn'); pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(OUT, 'r-pause.png')); print('paused', pg.evaluate('ST.G.paused'))
        pg.tap('#pResume'); pg.wait_for_timeout(200)
        pg.set_viewport_size({'width': 844, 'height': 390}); pg.wait_for_timeout(500); pg.screenshot(path=os.path.join(OUT, 'r-land.png'))
        print('fps', pg.evaluate('ST.RSTAT.fps.toFixed(1)'), 'draws', pg.evaluate('[ST.RSTAT.draws, ST.RSTAT.inst]'))
        errs(logs)

    elif scen == 'fuzz':
        import random
        which = [int(a) for a in sys.argv[2:]] or [0, 1, 2, 3, 4, 5]
        pg, logs = page_for(b, 640, 360); pg.evaluate('ST.setQuality(0)')
        for li in which:
            random.seed(li * 7 + 3); pg.evaluate(f'ST.start({li})'); n = 0
            js = """(seed) => { let s = seed; const R = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; const seen = {};
              for (let i = 0; i < 520 && ST.G.phase === 'play'; i++) { if (i % 6 === 0) ST.input({ thr: R() < 0.75 ? 1 : R() < 0.5 ? -1 : 0, steer: R() < 0.5 ? 0 : R() * 2 - 1 });
                const r = R(); if (r < 0.10) ST.press('jump'); else if (r < 0.34) ST.press('mis'); else if (r < 0.46) ST.press('charm'); else if (r < 0.52) ST.press('meow'); else if (r < 0.54) ST.press('zoom');
                ST.step(0.25); const st = ST.state(); if (st.mis) seen[st.mis] = 1; if (st.charm) seen[st.charm] = 1; if (!isFinite(ST.CAT.x + ST.CAT.z + ST.CAT.y)) throw new Error('NaN cat'); for (const h of ST.HUM) if (!isFinite(h.x + h.z + h.y)) throw new Error('NaN human ' + h.planName); }
              const st = ST.state(); return { phase: st.phase, clock: st.clock, obj: st.obj, extra: st.extra, dignity: st.cat.dignity, stats: ST.G.stats, staff: st.staff.map(h => h.plan + '/' + h.pose + '/' + h.pat), ctx: Object.keys(seen).sort(), broken: ST.PROPS.filter(p => p.st === 'broken' || p.st === 'gone').length, log: (ST.G.log || []).slice(-6) }; }"""
            r = pg.evaluate(js, li * 977 + 5); pg.evaluate('ST.G.log = []'); pg.evaluate('ST.input(null)')
            print(f'LESSON {li+1}:', json.dumps(r)[:1500])
        errs(logs)

    elif scen == 'next':
        # real taps through report card -> NEXT LESSON -> briefing -> BEGIN for every lesson, ending at the diploma
        pg, logs = page_for(b, 390, 844, mobile=True, test=False, sandbox=True)
        pg.tap('#toc button'); pg.wait_for_timeout(300); pg.tap('#bBegin'); pg.wait_for_timeout(600)
        for n in range(6):
            pg.evaluate('ST.finish()'); pg.wait_for_timeout(300); pg.tap('#rNext'); pg.wait_for_timeout(300)
            vis = pg.evaluate("['report','brief','hud','menu'].filter(i => !document.getElementById(i).classList.contains('hidden'))")
            print(n + 1, 'visible', vis, '->', pg.evaluate("document.getElementById('bTitle').textContent")); assert vis == ['brief'], vis
            pg.tap('#bBegin'); pg.wait_for_timeout(500)
        print('end phase', pg.evaluate('ST.G.phase')); errs(logs)

    elif scen == 'card':
        # arcade lobby card: the cat faces the camera and pushes the red mug off the island while both staff react (800x560 webp, HUD hidden)
        ctx = b.new_context(viewport={'width': 800, 'height': 560}, device_scale_factor=2); pg = ctx.new_page(); logs = []
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        pg.goto(f'http://127.0.0.1:{PORT}/stafftraining.html?test', wait_until='load'); pg.wait_for_timeout(1000)
        pg.evaluate(CARD_JS); pg.wait_for_timeout(600); png = os.path.join(OUT, 'card.png'); pg.screenshot(path=png)
        from PIL import Image
        im = Image.open(png).convert('RGB').resize((800, 560), Image.LANCZOS); dst = os.path.join(OUT, 'stafftraining.webp'); im.save(dst, 'WEBP', quality=90, method=6)
        print('card', dst, os.path.getsize(dst), 'bytes; copy it to assets/arcade/stafftraining.webp'); errs(logs)
    b.close()
srv.shutdown()
