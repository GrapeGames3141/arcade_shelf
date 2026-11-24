# Phone-sized touch layout and a real joystick drag: python test/mobile.py
import sys, json
sys.path.insert(0, 'test'); from shot import run
def s(pg, out):
    pg.evaluate('SET.touch="on"; AK.start(1); INPUT.applyTouch(); AK.advance(0.3)')
    pg.screenshot(path=out+'/mobile.png')
    # drag the joystick up and hold: the knight should walk forward
    x0 = pg.evaluate('AK.state().player')
    pg.mouse.move(150, 300); pg.mouse.down(); pg.mouse.move(150, 240, steps=4)
    pg.evaluate('for(let i=0;i<60;i++){ tick(1/60); } renderFrame()')
    pg.mouse.up()
    x1 = pg.evaluate('AK.state().player')
    print('moved', x0['x'], x0['z'], '->', x1['x'], x1['z'])
    pg.screenshot(path=out+'/mobile_walk.png')
run(s, w=844, h=390, mobile=False)
