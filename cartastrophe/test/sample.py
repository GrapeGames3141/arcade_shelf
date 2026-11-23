import json, sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    # player jumps for samples at a few spots
    for z,boost,v in [(-5,0,14),(-5,1,15),(-9,1,16),(-9.5,1,18)]:
        pg.evaluate("CT.start({opp:1, lives:3})"); pg.evaluate("CT.freezeAI(true)"); pg.evaluate("CT.teleport(1,30,20,0,0)")
        pg.evaluate(f"const S=GAME.sample; S.active=true; S.x=-12; S.z={z}; S.y=lerp(3.0,3.3,(-S.z-4.5)/5.5)+0.7")
        pg.evaluate(f"CT.teleport(0,-12,12,3.14159,{v})"); pg.evaluate(f"CT.setInput({{throttle:1, boost:{boost}}})")
        st=pg.evaluate("CT.advance(2.6)")
        p=st['carts'][0]
        print([x['kind'] for x in st['koLog']], end=' '); print('jump z',z,'boost',boost,'v',v,'-> lives',p['lives'],'sample active',pg.evaluate('GAME.sample.active'),'state',p['state'])
        if z==-9:
            pg.evaluate("CT.start({opp:1, lives:3})"); pg.evaluate("CT.freezeAI(true)"); pg.evaluate("CT.teleport(1,30,20,0,0)")
            pg.evaluate(f"const S=GAME.sample; S.active=true; S.x=-12; S.z={z}; S.y=lerp(3.0,3.3,(-S.z-4.5)/5.5)+0.7")
            pg.evaluate(f"CT.teleport(0,-12,12,3.14159,{v})"); pg.evaluate(f"CT.setInput({{throttle:1, boost:{boost}}})")
            pg.evaluate("CT.advance(0.75)"); pg.screenshot(path=out+'/sample_jump.png')
    # AI attempts
    got=0; splash=0; tries=0
    for k in range(8):
        pg.evaluate("CT.start({opp:1, lives:3, ai:'mean'})"); pg.evaluate("CT.teleport(0,30,-25,0,0)")
        pg.evaluate("CT.freezeAI(false)"); pg.evaluate("GAME.ais.forEach(a=>{a.L.playerPref=-99})")
        pg.evaluate(f"CT.teleport(1,{-20+k*3},24,{3.14},0)")
        pg.evaluate("const S=GAME.sample; S.active=true; S.x=-12+R1(-0.5,0.5); S.z=R1(-10,-4.5); S.y=lerp(3.0,3.3,(-S.z-4.5)/5.5)+0.7")
        pg.evaluate("GAME.ais[0].jump='approach'; GAME.ais[0].jumpT=9; GAME.sampleClaim=GAME.ais[0]")
        plans=[]
        for i in range(24):
            st=pg.evaluate("CT.advance(0.5)"); plans.append(st['ai'][0]['plan'])
            if not pg.evaluate('GAME.sample.active'): got+=1; break
        kos=[x for x in st['koLog'] if x['kind']=='pond']; splash+=len(kos)
        print('AI try',k,'got' if not pg.evaluate('GAME.sample.active') else 'no', 'splash' if kos else '', sorted(set(plans)))
    print('AI got',got,'splashed',splash)
run(s)
