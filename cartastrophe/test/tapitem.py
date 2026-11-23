import sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    pg.evaluate("localStorage.clear()")
    pg.evaluate("CT.start({opp:2, lives:3, touch:'on'})"); pg.evaluate("INPUT.applyTouch(); CT.freezeAI(true)")
    pg.evaluate("CT.give(0,'mega'); CT.advance(0.3)")
    print('drift visible:', pg.evaluate("getComputedStyle(document.getElementById('tBrake')).display"))
    pg.mouse.click(560,200)
    pin=pg.evaluate("INPUT.poll(0.1)"); print('tap right half -> item', pin['item'])
    pg.mouse.click(170,200); print('tap left half -> item', pg.evaluate("INPUT.poll(0.1)")['item'])
    pg.mouse.move(170,260); pg.mouse.down(); pg.mouse.move(170,230); pg.mouse.move(170,200)
    pg.evaluate("Object.assign(GAME.player.input, INPUT.poll(0.1)); CT.advance(0.1)")
    pg.screenshot(path=out+'/tapitem.png'); pg.mouse.up()
run(s, w=844, h=390)
