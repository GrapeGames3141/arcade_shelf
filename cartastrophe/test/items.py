import json, sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    # melon: player throws at a parked target 12 m ahead near the store curb
    for item, tgt, pl, adv, shotT in [('melon',(0,24,0),(0,10,0),1.2,0.45), ('blower',(29,-8,1.57),(22,-8,1.57),2.5,0.8), ('banana',(0,0,0),(0,4,0),1.6,0.9), ('mega',(5,24,0),(5,8,0),1.6,0.7)]:
        pg.evaluate("CT.start({opp:2, lives:3})"); pg.evaluate("CT.freezeAI(true)")
        pg.evaluate("CT.teleport(2,-30,-20,0,0)")
        pg.evaluate(f"CT.teleport(1,{tgt[0]},{tgt[1]},{tgt[2]},0)")
        pg.evaluate(f"CT.teleport(0,{pl[0]},{pl[1]},{pl[2]},{4 if item!='banana' else 6})")
        pg.evaluate(f"CT.give(0,'{item}')")
        if item=='banana':
            pg.evaluate("CT.use(0)")
            # target drives over the peels behind the player
            pg.evaluate("CT.teleport(1,0,-2,0,7); GAME.carts[1].input.throttle=1")
            pg.evaluate("CT.setInput({throttle:1})")
        else:
            pg.evaluate("CT.setInput({throttle:1})"); pg.evaluate("CT.use(0)")
        pg.evaluate(f"CT.advance({shotT})")
        pg.screenshot(path=out+f'/item_{item}.png')
        st=pg.evaluate(f"CT.advance({adv})")
        t=st['carts'][1]
        print(item, 'target now', t['x'], t['z'], t['state'], 'ko', st['koLog'], 'spin', pg.evaluate('GAME.carts[1].spinT>0'))
run(s)
