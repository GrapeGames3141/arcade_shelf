import sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    for d,ang in [(5,0),(10,0),(14,0),(10,0.45)]:
        pg.evaluate("CT.start({opp:1, lives:3})"); pg.evaluate("CT.freezeAI(true)")
        import math
        tx=d*math.sin(ang); tz=d*math.cos(ang)
        pg.evaluate(f"CT.teleport(0,0,-10,0,0); CT.teleport(1,{tx},{-10+tz},1.57,0); CT.give(0,'blower'); CT.use(0)")
        pg.evaluate("CT.setInput({throttle:0})")
        st=pg.evaluate("CT.advance(3.6)")
        t=st['carts'][1]
        moved=math.hypot(t['x']-tx, t['z']-(-10+tz))
        print(f'target {d} m away, {ang} rad off-centre: pushed {moved:.1f} m')
run(s)
