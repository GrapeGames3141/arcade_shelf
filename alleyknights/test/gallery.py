# Close-up screenshots of every varmint, the knight, the cart, and the dawn screen: python test/gallery.py
import sys, json
sys.path.insert(0, 'test'); from shot import run
def s(pg, out):
    pg.evaluate('AK.start(1)'); pg.evaluate('GAME.critters.length=0; GAME.facs.forEach(f=>f.spawnT=999)')
    pg.evaluate('AK.teleport(0, 2, 0); AK.give("broom")')
    kinds = ['rat','possum','cat','skunk','pigeon','gull','bandit']
    for i,k in enumerate(kinds): pg.evaluate(f'(()=>{{const id=AK.spawn("{k}", {-2.4+i*0.8}, 4.2); const c=GAME.critters.find(c=>c.id===id); c.yaw=Math.PI; c.flying=false; c.y=0; c.state="claim"; c.goal=null;}})()')
    pg.evaluate('GAME.critters.forEach(c=>{c.cd=99}); GAME.critterAIoff=true')
    pg.evaluate('AK.advance(0.05)')
    pg.evaluate('AK.setCam([0,1.3,1.2],[0,0.25,4.2],0.9)'); pg.evaluate('renderFrame()')
    pg.screenshot(path=out+'/g_critters.png')
    # knight close-up from the front
    pg.evaluate('AK.teleport(0, 2, 0); GAME.player.input.block=true; AK.advance(0.1); AK.setCam([0.6,0.9,3.6],[0,0.45,2],0.9); renderFrame()')
    pg.screenshot(path=out+'/g_knight.png')
    pg.evaluate('GAME.player.input.block=false; GAME.player.input.attack=true; AK.advance(0.12); AK.setCam([0.9,0.9,3.4],[0,0.45,2],0.9); renderFrame()')
    pg.screenshot(path=out+'/g_swing.png')
    pg.evaluate('GAME.player.input.attack=false; AK.advance(0.5)')
    # cart
    pg.evaluate('AK.cart(); AK.setInput({mx:0,mz:1}); AK.advance(1.0)')
    pg.screenshot(path=out+'/g_cart.png')
    # dawn screen
    pg.evaluate('AK.setInput({mx:0,mz:0}); AK.dawn(); AK.advance(4)')
    pg.screenshot(path=out+'/g_dawn.png')
    print(json.dumps(pg.evaluate('AK.state()'))[:300])
run(s)
