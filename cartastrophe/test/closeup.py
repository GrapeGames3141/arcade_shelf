import json, sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    pg.evaluate("CT.start({opp:2, lives:3, rider:1})"); pg.evaluate("CT.freezeAI(true)")
    pg.evaluate("CT.teleport(0,5,5,0.6,0)"); pg.evaluate("CT.teleport(1,-30,20,0,0)"); pg.evaluate("CT.teleport(2,-30,-20,0,0)")
    pg.evaluate("CT.setInput({throttle:1, steer:0.8})"); pg.evaluate("CT.advance(0.6)")
    c=pg.evaluate("CT.state().carts[0]")
    x,z=c['x'],c['z']
    pg.evaluate(f"CT.setCam([{x}+1.6,1.25,{z}+1.9],[{x},0.7,{z}],0.9); drawScene(RND.time); glRender(RND.w,RND.h,WORLD.waters)")
    pg.screenshot(path=out+'/close_front.png')
    pg.evaluate(f"CT.setCam([{x}-2.0,1.1,{z}-0.4],[{x},0.6,{z}],0.85); drawScene(RND.time); glRender(RND.w,RND.h,WORLD.waters)")
    pg.screenshot(path=out+'/close_side.png')
run(s)
