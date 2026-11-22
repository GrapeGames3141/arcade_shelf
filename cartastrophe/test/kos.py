import json, sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    pg.evaluate("CT.start({opp:2, lives:3})"); pg.evaluate("CT.freezeAI(true)")
    # 1: player rams Box Kid into a parked car
    pg.evaluate("CT.teleport(2,-30,-25,0,0)")
    pg.evaluate("CT.teleport(1,12.75,9.6,1.57,0)")   # just south of the red car row A k=2
    pg.evaluate("CT.teleport(0,12.75,0,0,9)")
    pg.evaluate("CT.setInput({throttle:1, steer:0, boost:1})")
    st=pg.evaluate('CT.advance(1.05)'); print(st['koLog'])
    st=pg.evaluate('CT.advance(0.25)'); pg.screenshot(path=out+'/ko_car_a.png')
    st=pg.evaluate('CT.advance(0.6)'); pg.screenshot(path=out+'/ko_car_b.png')
    # 2: pond splash (shove Tiny into pond)
    pg.evaluate("CT.start({opp:2, lives:3})"); pg.evaluate("CT.freezeAI(true)")
    pg.evaluate("CT.teleport(1,-30,20,0,0)")
    pg.evaluate("CT.teleport(2,-1.2,-9,-1.57,0)")
    pg.evaluate("CT.teleport(0,8,-9,-1.57,8)")
    pg.evaluate("CT.setInput({throttle:1, steer:0, boost:1})")
    for i in range(10):
        st=pg.evaluate('CT.advance(0.2)')
        if st['koLog']: break
    print(st['koLog'])
    pg.evaluate("CT.setInput({throttle:0, steer:0, boost:0, brake:1})")
    st=pg.evaluate('CT.advance(0.35)'); pg.screenshot(path=out+'/ko_pond_a.png')
    st=pg.evaluate('CT.advance(1.0)'); pg.screenshot(path=out+'/ko_pond_b.png')
    # 3: cliff: shove Big through a rail gap
    pg.evaluate("CT.start({opp:2, lives:3})"); pg.evaluate("CT.freezeAI(true)")
    pg.evaluate("CT.teleport(1,-30,20,0,0)")
    pg.evaluate("CT.teleport(2,33.5,7,1.57,0)")
    pg.evaluate("CT.teleport(0,24,7,1.57,9)")
    pg.evaluate("CT.setInput({throttle:1, steer:0, boost:1})")
    for i in range(10):
        st=pg.evaluate('CT.advance(0.2)')
        if st['koLog']: break
    print(st['koLog'])
    pg.evaluate("CT.setInput({throttle:0, steer:0, boost:0, brake:1})")
    st=pg.evaluate('CT.advance(0.6)'); pg.screenshot(path=out+'/ko_cliff_a.png')
    st=pg.evaluate('CT.advance(1.4)'); pg.screenshot(path=out+'/ko_cliff_b.png')
run(s)
