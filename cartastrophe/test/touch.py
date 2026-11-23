import json, sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    for steer,lefty in [('drag',False),('buttons',False),('drag',True)]:
        pg.evaluate(f"CT.start({{opp:3, lives:3, touch:'on', steer:'{steer}', autorocket:true, lefty:{str(lefty).lower()}}})"); pg.evaluate("INPUT.applyTouch(); CT.freezeAI(true)")
        pg.evaluate("CT.advance(0.3)")
        if steer=='drag':
            x0 = 640 if lefty else 160
            pg.mouse.move(x0, 260); pg.mouse.down(); pg.mouse.move(x0+60, 262, steps=4)
            v=pg.evaluate("[INPUT.drag!==null, +INPUT.dragSteer.toFixed(2)]")
            # run the real input poll to check auto rocket + steer
            pin=pg.evaluate("INPUT.poll(0.1)")
            print(steer,'lefty' if lefty else '', 'drag active/steer', v, 'poll', {k:(round(x,2) if isinstance(x,(int,float)) else x) for k,x in pin.items()})
            pg.screenshot(path=out+f'/touch_{steer}{"_lefty" if lefty else ""}.png')
            pg.mouse.up()
        else:
            pg.screenshot(path=out+f'/touch_{steer}.png')
        # swipe up on action side for item
        pg.evaluate("CT.give(0,'banana')")
        sx = 200 if lefty else 560
        pg.mouse.move(sx, 300); pg.mouse.down(); pg.mouse.move(sx, 230, steps=3); pg.mouse.up()
        print('  swipe -> itemEdge', pg.evaluate("INPUT.itemEdge"))
        pg.evaluate("INPUT.itemEdge=false")
run(s, w=844, h=390)
