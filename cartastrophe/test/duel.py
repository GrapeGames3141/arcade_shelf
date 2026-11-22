import json, sys
sys.path.insert(0,'test')
from shot import run
# scenarios: target cart (index 1, frozen) placed near a hazard, attacker AI (index 2) placed some distance away
SC=[('pond', (-1.5,-8,0), (12,4,-2.3)), ('store', (10,26.5,0), (8,8,0.3)), ('cliff', (34,-13,1.57), (20,-10,1.2)), ('cars', (18,10,1.57),(16,-4,0)), ('wall',(0,-27.5,0),(2,-8,3.1))]
def s(pg,out):
    for name,tgt,att in SC:
        pg.evaluate("CT.start({opp:2, lives:3, ai:'normal'})")
        pg.evaluate("CT.freezeAI(false)")
        # park the player far away out of the action
        pg.evaluate("CT.teleport(0,-30,22,0,0)")
        pg.evaluate(f"CT.teleport(1,{tgt[0]},{tgt[1]},{tgt[2]},0)")
        pg.evaluate(f"CT.teleport(2,{att[0]},{att[1]},{att[2]},0)")
        # make cart 1 passive: remove its AI
        pg.evaluate("GAME.ais = GAME.ais.filter(a=>a.c!==GAME.carts[1]); GAME.ais.forEach(a=>{a.target=null})")
        pg.evaluate("GAME.ais.forEach(a=>a.L.playerPref=-50)")
        t=0; hit=None; trace=[]
        while t<14:
            st=pg.evaluate('CT.advance(0.5)'); t+=0.5
            a=st['carts'][2]; b=st['carts'][1]; ai=[x for x in st['ai'] if x['name']==a['name']][0]
            trace.append((t, round(a['x'],1), round(a['z'],1), a['speed'], ai['plan'], ai['target'], round(b['x'],1), round(b['z'],1)))
            if st['koLog']:
                hit=st['koLog']; break
        print(name, 'KO' if hit else 'none', hit and hit[0], 't=',t)
        if not hit:
            for tr in trace[::4]: print('   ', tr)
        pg.screenshot(path=out+f'/duel_{name}.png')
run(s)
