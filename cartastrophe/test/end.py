import json, sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    pg.evaluate("CT.start({opp:3, lives:1})")
    pg.evaluate("CT.advance(2)")
    pg.evaluate("GAME.carts[0].stats.wipeouts=2; GAME.carts[0].stats.maxAir=1.3; GAME.carts[0].stats.topSpeed=16; GAME.carts.slice(1).forEach((c,i)=>{ c.lastHit={by:GAME.carts[0],t:GAME.now}; knockOut(c,['pond','car','cliff'][i],{x:c.x,z:c.z}) })")
    st=pg.evaluate("CT.advance(4)")
    print(st['mode'])
    pg.wait_for_timeout(1800)
    pg.screenshot(path=out+'/ui_end.png')
    # pause screen
    pg.evaluate("CT.start({opp:3, lives:3})"); pg.evaluate("CT.advance(1)")
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.screenshot(path=out+'/ui_pause.png')
run(s)
