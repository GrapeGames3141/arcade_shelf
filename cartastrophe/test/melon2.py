import json, sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    # three carts clustered ahead; player throws one melon (aim assist)
    pg.evaluate("CT.start({opp:3, lives:3})"); pg.evaluate("CT.freezeAI(true)")
    pg.evaluate("CT.teleport(1,4,4,0.3,0); CT.teleport(2,6,5,0,0); CT.teleport(3,4.5,6.5,2,0)")
    pg.evaluate("CT.teleport(0,-2,-12,0.25,6)"); pg.evaluate("CT.give(0,'melon'); GAME.carts[0].itemN=2")
    pg.evaluate("CT.setInput({throttle:0.4})"); pg.evaluate("CT.use(0)")
    before=pg.evaluate("GAME.carts.map(c=>[+c.x.toFixed(1),+c.z.toFixed(1)])")
    st=pg.evaluate("CT.advance(0.9)"); pg.screenshot(path=out+'/melon_boom.png')
    st=pg.evaluate("CT.advance(0.6)")
    after=[(c['x'],c['z'],c['speed']) for c in st['carts']]
    print('before',before); print('after',after)
    print('item left', pg.evaluate("[GAME.carts[0].item, GAME.carts[0].itemN]"), 'puddles', pg.evaluate("GAME.puddles.length"))
    print('tagged by player:', pg.evaluate("GAME.carts.slice(1).map(c=>c.lastHit.by&&c.lastHit.by.name)"))
    # puddle spin test: drive cart 1 through the puddle
    pg.evaluate("const pd=GAME.puddles[0]; CT.teleport(1,pd.x,pd.z-5,0,7); GAME.carts[1].input.throttle=1")
    st=pg.evaluate("CT.advance(0.8)"); print('spin after puddle', pg.evaluate("GAME.carts[1].spinT>0"), pg.evaluate("GAME.carts[1].lastHit.by&&GAME.carts[1].lastHit.by.name"))
    pg.evaluate("CT.advance(0.2)"); pg.screenshot(path=out+'/melon_puddle.png')
run(s)
