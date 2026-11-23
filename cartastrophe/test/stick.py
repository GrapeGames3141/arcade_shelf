import json, sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    pg.evaluate("localStorage.clear()")
    print('defaults', pg.evaluate("[SET.steer, SET.autorocket]"))
    pg.evaluate("CT.start({opp:2, lives:3, touch:'on'})"); pg.evaluate("INPUT.applyTouch(); CT.freezeAI(true)")
    pg.evaluate("CT.advance(0.3)")
    def gest(dx,dy,label,shot=None):
        pg.mouse.move(170,260); pg.mouse.down(); pg.mouse.move(170+dx*0.5,260+dy*0.5); pg.mouse.move(170+dx,260+dy)
        pin=pg.evaluate("INPUT.poll(0.2)")
        print(label, {k:(round(v,2) if isinstance(v,(int,float)) else v) for k,v in pin.items()})
        if shot:
            pg.evaluate("Object.assign(GAME.player.input, INPUT.poll(0.1)); CT.advance(0.05)")
            pg.screenshot(path=out+'/'+shot)
        pg.mouse.up()
    gest(0,-60,'up      ', 'stick_up.png')
    gest(45,-45,'up-right')
    gest(-50,0,'left    ')
    gest(0,50,'down    ')
    gest(0,-8,'tiny up ')
    pg.mouse.move(170,260); pg.mouse.down(); pg.mouse.move(170,190); pg.mouse.up()
    print('released', pg.evaluate("INPUT.poll(0.2)"))
    # drive with it: hold up-right for 2 s via repeated polls
    pg.mouse.move(170,260); pg.mouse.down(); pg.mouse.move(200,200)
    for i in range(20):
        pg.evaluate("Object.assign(GAME.player.input, INPUT.poll(0.1)); CT.advance(0.1)")
    st=pg.evaluate("CT.state()"); print('after 2s stick drive speed', st['carts'][0]['speed'], 'yaw', st['carts'][0]['yaw'])
    pg.screenshot(path=out+'/stick_drive.png'); pg.mouse.up()
run(s, w=844, h=390)
