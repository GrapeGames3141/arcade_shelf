"""Headless check: python3 test/shot.py [scenario]. Serves the folder, logs console, saves screenshots to test/out."""
import sys,os,json,threading,http.server,functools,time
from playwright.sync_api import sync_playwright
here=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out=os.path.join(here,'test','out');os.makedirs(out,exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Q,directory=here));port=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
sc=sys.argv[1] if len(sys.argv)>1 else 'basic'
q=sys.argv[2] if len(sys.argv)>2 else 'high'
W,Hh=(390,844) if 'mobile' in sc else (1280,720)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
    pg=b.new_page(viewport={'width':W,'height':Hh},device_scale_factor=1,has_touch='mobile' in sc)
    errs=[]
    pg.on('console',lambda m:print('[console]',m.type,m.text) if m.type in('error','warning') else None)
    pg.on('pageerror',lambda e:(errs.append(str(e)),print('[pageerror]',e)))
    t0=time.time();pg.goto(f'http://127.0.0.1:{port}/mittenmountain.html?test&q={q}');pg.wait_for_timeout(2500)
    print('load+boot %.1fs'%(time.time()-t0))
    def shot(n):pg.screenshot(path=os.path.join(out,n+'.png'));print('shot',n,json.dumps(pg.evaluate('MM.state()')))
    if sc in('basic','mobile'):
        shot('menu')
        pg.evaluate("MM.start('bunny',true)");pg.evaluate("MM.frame()");shot('start')
        if 'mobile' in sc:
            pg.touchscreen.tap(100,600);pg.wait_for_timeout(100)
            pg.evaluate("document.getElementById('touch').style.display");shot('touchui')
        pg.evaluate("MM.auto(true)")
        for s in (60,140,330,700):
            pg.evaluate(f"MM.teleport({s},0)");pg.evaluate("MM.sim(1.5)");pg.evaluate("MM.frame()");pg.wait_for_timeout(300);shot(f'run{s}')
    if sc=='full':
        pg.evaluate("MM.start('fox',true)");pg.evaluate("MM.auto(true)")
        for i in range(30):
            st=pg.evaluate("MM.sim(5)")
            print('t=%5.1f s=%7.1f v=%5.1f stack=%d score=%d btn=%d bonks=%d mode=%s'%(st['time'],st['s'],st['v'],len(st['stack']),st['score'],st['buttons'],st['bonks'],st['mode']))
            if st['mode'] in('finish','ended'):break
        pg.evaluate("MM.sim(3)");pg.wait_for_timeout(600);pg.evaluate("MM.frame()");shot('end')
    if sc=='tower':
        pg.evaluate("MM.start('penguin',true)");pg.evaluate("MM.auto(true)");pg.evaluate("MM.sim(36)");pg.evaluate("MM.auto(false)")
        pg.evaluate("MM.input({steer:0.3,push:0,brake:0})");pg.evaluate("MM.sim(0.4)");pg.evaluate("MM.frame()");shot('tower')
        y=pg.evaluate("(()=>{const st=MM.state();return MM.items().find(i=>i.type=='yarn'&&i.s>st.s+8)})()");print('yarn',y)
        pg.evaluate(f"MM.teleport({y['s']-9},{y['u']})");pg.evaluate("MM.input({steer:0,push:1})");
        before=len(pg.evaluate("MM.state()")['stack']);pg.evaluate("MM.sim(0.9)");st=pg.evaluate("MM.state()");print('bonk test stack',before,'->',len(st['stack']),'bonks',st['bonks'])
        pg.evaluate("MM.sim(0.25)");pg.evaluate("MM.frame()");shot('bonk')
        pg.evaluate("MM.menu()");pg.evaluate("MM.frame()");pg.evaluate("document.getElementById('menu').style.display='none'");pg.wait_for_timeout(200);pg.evaluate("MM.frame()");shot('closeup')
    if sc=='levels':
        for L in range(1,7):
            pg.evaluate(f"MM.level({L},true)");c=pg.evaluate("MM.counts()");print('level',L,c)
        for L in range(1,6):
            pg.evaluate(f"MM.level({L},true)");pg.evaluate("MM.start('bunny',true)");pg.evaluate("MM.teleport(240,0)");pg.evaluate("MM.input({steer:0,push:0,brake:0})")
            pg.evaluate("MM.sim(0.5)");pg.evaluate("MM.frame()");pg.wait_for_timeout(300);shot(f'theme{L}')
    if sc=='celeb':
        pg.evaluate("MM.level(1,true)");pg.evaluate("MM.start('fox',true)");pg.evaluate("MM.auto(true)")
        for i in range(30):
            st=pg.evaluate("MM.sim(5)")
            if st['mode']!='run':break
        print('finished',json.dumps(pg.evaluate("MM.state()")))
        for k in range(12):
            pg.evaluate("MM.sim(0.5)")
            c=pg.evaluate("MM.celeb()")
            if c['on'] and c['t']>1.4:break
        print('celeb',pg.evaluate("MM.celeb()"),pg.evaluate("MM.lv()"))
        pg.evaluate("document.getElementById('endO').style.display='none'");pg.evaluate("MM.frame()");pg.wait_for_timeout(300);shot('celeb')
        pg.evaluate("document.getElementById('endO').style.display='flex'");pg.wait_for_timeout(200);shot('celebcard')
    if sc=='xmas':
        pg.evaluate("MM.level(6,true)");pg.evaluate("MM.start('penguin',true)");pg.evaluate("MM.input({steer:0,push:0,brake:0})")
        for s0,u in[(60,0),(240,1.5),(470,-1)]:
            pg.evaluate(f"MM.teleport({s0},{u})");pg.evaluate("MM.sim(0.6)");pg.evaluate("MM.frame()");pg.wait_for_timeout(250);shot(f'xmas{s0}')
        pg.evaluate("MM.menu()");pg.evaluate("MM.frame()");pg.evaluate("document.getElementById('menu').style.display='none'");pg.evaluate("MM.frame()");shot('xmasmenu')
        pg.evaluate("MM.start('bunny',true)");pg.evaluate("MM.auto(true)")
        for i in range(30):
            st=pg.evaluate("MM.sim(5)")
            if st['mode']!='run':break
        for k in range(12):
            pg.evaluate("MM.sim(0.5)");c=pg.evaluate("MM.celeb()")
            if c['on'] and c['t']>1.6:break
        pg.evaluate("document.getElementById('endO').style.display='none'");pg.evaluate("MM.frame()");pg.wait_for_timeout(250);shot('xmasceleb')
    if sc=='perf':
        pg.evaluate("MM.start('bunny',true)");pg.evaluate("MM.auto(true)");pg.wait_for_timeout(6000);shot('perf')
    print('errors',len(errs))
    b.close()
