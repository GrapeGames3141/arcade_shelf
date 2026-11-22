import json, sys, math
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    pg.evaluate("CT.start({opp:1, lives:3})"); pg.evaluate("CT.freezeAI(true)")
    pg.evaluate("CT.teleport(1,-30,-25,0,0)")
    pg.evaluate("CT.teleport(0,10,-8,0,0)")
    pg.evaluate("CT.setInput({throttle:1, steer:0, brake:0, boost:0})")
    for t in [1,2,3,4]:
        st=pg.evaluate('CT.advance(1.0)'); c=st['carts'][0]; print('t',t,'speed',c['speed'], 'mph', round(c['speed']*2.237))
    # turning at speed
    pg.evaluate("CT.teleport(0,10,-15,0,12)")
    pg.evaluate("CT.setInput({throttle:1, steer:1})")
    pts=[]
    for i in range(30):
        st=pg.evaluate('CT.advance(0.1)'); c=st['carts'][0]; pts.append((c['x'],c['z'],c['yaw'],c['speed']))
    print('turn: yaw change per sec at speed', round((pts[-1][2]-pts[9][2])/2.0,2), 'speed', pts[-1][3])
    pg.screenshot(path=out+'/feel_turn.png')
    # boost to top
    pg.evaluate("CT.teleport(0,-20,20,1.57,0)")
    pg.evaluate("CT.setInput({throttle:1, steer:0, boost:1})")
    st=pg.evaluate('CT.advance(3.0)'); c=st['carts'][0]; print('boost 3s speed', c['speed'], 'mph', round(c['speed']*2.237), 'heat', c['heat'])
    pg.screenshot(path=out+'/feel_boost.png')
    # handbrake drift
    pg.evaluate("CT.teleport(0,0,-5,0,12)")
    pg.evaluate("CT.setInput({throttle:0.3, steer:1, boost:0, brake:1})")
    st=pg.evaluate('CT.advance(0.8)'); c=st['carts'][0]; print('drift: yaw', c['yaw'], 'speed', c['speed'])
    pg.screenshot(path=out+'/feel_drift.png')
run(s)
