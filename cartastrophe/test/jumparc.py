import json, sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    for v,boost in [(12,0),(14,0),(15,1),(17,1),(19,1)]:
        pg.evaluate("CT.start({opp:1, lives:3})"); pg.evaluate("CT.freezeAI(true)"); pg.evaluate("CT.teleport(1,30,20,0,0)")
        pg.evaluate(f"CT.teleport(0,-12,12,3.14159,{v})")
        pg.evaluate(f"CT.setInput({{throttle:1, steer:0, boost:{boost}}})")
        pts=[]
        for i in range(40):
            st=pg.evaluate('CT.advance(0.05)'); c=st['carts'][0]
            pts.append((c['z'],c['y'],c['speed'],c['ground']))
            if c['state']!='drive' or (c['ground'] and c['z']<0): break
        air=[p for p in pts if not p[3]]
        print(v,boost,'air pts:', [(round(z,1),round(y,2)) for z,y,_,_ in air][::2], 'end', pts[-1][:2], st['carts'][0]['state'])
run(s)
