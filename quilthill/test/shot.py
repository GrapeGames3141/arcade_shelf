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
    t0=time.time();pg.goto(f'http://127.0.0.1:{port}/quilthill.html?test&q={q}');pg.wait_for_timeout(2500)
    print('load+boot %.1fs'%(time.time()-t0))
    def shot(n):pg.screenshot(path=os.path.join(out,n+'.png'));print('shot',n,json.dumps(pg.evaluate('QR.state()')))
    if sc in('basic','mobile'):
        shot('menu')
        pg.evaluate("QR.start(true)");pg.evaluate("QR.frame()");shot('start')
        pg.evaluate("QR.auto(true)")
        for s in (60,180,350,560):
            pg.evaluate(f"QR.teleport({s},0)");pg.evaluate("QR.sim(1.8)");pg.evaluate("QR.frame()");pg.wait_for_timeout(300);shot(f'run{s}')
    if sc=='full':
        pg.evaluate("QR.start(true)");pg.evaluate("QR.auto(true)")
        for i in range(40):
            st=pg.evaluate("QR.sim(5)")
            print('t=%5.1f s=%6.1f x=%5.1f v=%5.1f %-8s bob=%d/%d score=%d snips=%d boings=%d air=%d mode=%s'%(st['time'],st['s'],st['x'],st['speed'],st['patch'],st['bobbins'],st['total'],st['score'],st['snips'],st['boings'],st['airScore'],st['mode']))
            if st['mode'] in('finish','ended'):break
        pg.evaluate("QR.sim(4)");pg.wait_for_timeout(500);pg.evaluate("QR.frame()");shot('end')
    if sc=='kick':
        pg.evaluate("QR.start(true)");k=pg.evaluate("QR.kicks()[0]");print('kick',k)
        x=(k['x0']+k['x1'])/2;pg.evaluate(f"QR.teleport({k['s']-14},{x})");pg.evaluate("QR.input({steer:0,push:1})")
        for i in range(16):
            st=pg.evaluate("QR.sim(0.1)");print('s=%.1f y=%.2f air=%s v=%.1f'%(st['s'],st['y'],st['air'],st['speed']))
            if st['air'] and i>3:
                pg.evaluate("QR.frame()");shot('kickair');break
        sc2=pg.evaluate("QR.items().find(i=>i.type=='scissors')");print('scissors',sc2)
        pg.evaluate(f"QR.teleport({sc2['s']-7},{sc2['x']+1.5})");pg.evaluate("QR.frame()");shot('scissors')
        pg.evaluate(f"QR.teleport({sc2['s']-12},{sc2['x']})");pg.evaluate("QR.sim(2.5)");st=pg.evaluate("QR.state()");print('after scissors snips',st['snips'],'speed',st['speed'])
        bm=pg.evaluate("QR.items().find(i=>i.type=='bumper')");pg.evaluate(f"QR.teleport({bm['s']-10},{bm['x']})");pg.evaluate("QR.sim(2)");st=pg.evaluate("QR.state()");print('boings',st['boings'])
        pg.evaluate(f"QR.teleport({bm['s']-6},{bm['x']+0.3})");pg.evaluate("QR.frame()");shot('bumper')
    if sc=='notions':
        pg.evaluate("QR.start(true)")
        def near(t,extra=''):
            return pg.evaluate(f"QR.items().find(i=>i.type=='{t}'{extra})")
        def at(s,x,steer=0,secs=2.5,push=1):
            pg.evaluate(f"QR.teleport({s},{x})");pg.evaluate(f"QR.input({{steer:{steer},push:{push},brake:0}})");return pg.evaluate(f"QR.sim({secs})")
        z=pg.evaluate("QR.zips()[0]");st=at(z['s0']-3,z['x'],0,2.5);print('zip',z,'speed after',st['speed'],'zips',pg.evaluate("GAME.zips"))
        st=at(z['s0']-3,z['x']+6,0,2.5);print('no zip speed',st['speed'])
        h=near('hoop');st=at(h['s']-10,h['x'],0,2.5);print('hoop',h,'hoops',pg.evaluate("GAME.hoops"))
        pn=near('pins');pins=pg.evaluate("ITEMS.find(i=>i.type=='pins').pins.map(p=>p.x)");st=at(pn['s']-8,pins[3],0,2);print('pins ouches',pg.evaluate("GAME.ouches"))
        th=pg.evaluate("(()=>{const t=ITEMS.find(i=>i.type=='thimble'&&i.h<1);return t&&{s:t.s,x:t.x}})()");st=at(th['s']-8,th['x'],0,2);print('thimble',th,'got',pg.evaluate("GAME.thimbles"))
        pg.evaluate(f"QR.teleport({h['s']-7},{h['x']+0.5})");pg.evaluate("QR.frame()");shot('hoop')
        pg.evaluate(f"QR.teleport({z['s0']+2},{z['x']+0.6})");pg.evaluate("QR.frame()");shot('zip')
        y2=pg.evaluate("(()=>{const y=ITEMS.find(i=>i.type=='yarn');return{s:y.s0,x:y.x0}})()");pg.evaluate(f"QR.teleport({y2['s']-14},{y2['x']})");pg.evaluate("QR.input({steer:0,push:0,brake:1})");pg.evaluate("QR.sim(1.5)");pg.evaluate("QR.frame()");shot('yarn')
        sc2=near('scissors');pg.evaluate(f"QR.teleport({sc2['s']-7},{sc2['x']+1.5})");pg.evaluate("QR.frame()");shot('scissors')
        pg.evaluate("QR.teleport(%f,0)"%(pg.evaluate("QH.L")-12));pg.evaluate("QR.input({steer:0,push:1,brake:0})");pg.evaluate("QR.sim(3)");pg.evaluate("QR.frame()");shot('bottom')
    print('errors',len(errs))
    b.close()
