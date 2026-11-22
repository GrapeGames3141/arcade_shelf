import json, sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    pg.evaluate("CT.start({opp:5, lives:5, ai:'normal'})")
    pg.evaluate("CT.autopilot(true)")
    pg.evaluate("""window.AS={rev:0,thr:0,brk:0,esc:0,n:0,spd:0,hb:0,ch:0,sw:0,ov:0,boost:0,coll:0, err:0}; window._lastPlan=new Map();
      const up=AI.prototype.update; AI.prototype.update=function(dt,now,carts){ up.call(this,dt,now,carts); const c=this.c; if(c.state!=='drive')return; AS.n++; AS.spd+=c.speed(); if(this.handbrake)AS.hb++; if(this.charge)AS.ch++; if(this.overT>0)AS.ov++; if(c.input.boost)AS.boost++; if(this.reverseT>0)AS.rev++; AS.thr+=c.input.throttle; if(c.input.brake)AS.brk++; if(this.escapeT>0)AS.esc++; const lp=_lastPlan.get(this); if(lp!==undefined&&lp!==this.plan)AS.sw++; _lastPlan.set(this,this.plan); };
      const cc=collideCarts; collideCarts=function(a,b,now){ const e=GAME.events.length; cc(a,b,now); if(GAME.events.length>e)AS.coll++; }; 0""")
    st=pg.evaluate('CT.advance(40)')
    a=pg.evaluate('AS'); n=a['n']
    print('reverse %.2f throttle %.2f brake %.2f escape %.2f'%(a['rev']/n, a['thr']/n, a['brk']/n, a['esc']/n))
    print('avg speed %.2f  handbrake %.2f  charge %.2f  override %.2f boost %.2f  plan switches/s/cart %.2f  cart hits %d  KOs %d'%(a['spd']/n, a['hb']/n, a['ch']/n, a['ov']/n, a['boost']/n, a['sw']/(n/120), a['coll'], len(st['koLog'])))
run(s)
