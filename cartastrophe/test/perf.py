import json, sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    pg.evaluate("CT.start({opp:5, lives:5})"); pg.evaluate("CT.autopilot(true)")
    pg.evaluate("CT.advance(10)")
    r=pg.evaluate("""(()=>{ let t0=performance.now(); for(let i=0;i<240;i++) physicsStep(PHYS_DT); const phys=(performance.now()-t0)/2;
      t0=performance.now(); for(let i=0;i<30;i++) stepEffects(1/60); const fx=(performance.now()-t0)/30;
      t0=performance.now(); for(let i=0;i<30;i++) drawScene(RND.time); const draw=(performance.now()-t0)/30;
      let inst=0; for(const [m,q] of RND.queue) inst+=q.n;
      return {physPerSecondOfGame_ms:phys, effectsPerFrame_ms:fx, drawScenePerFrame_ms:draw, particles:PS.length, instances:inst, worldVerts:WORLD.mesh.verts, worldTris:WORLD.mesh.count/3}; })()""")
    print(json.dumps(r))
run(s)
