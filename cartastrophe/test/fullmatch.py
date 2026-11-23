import json, sys, collections
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    for lvl,lives in [('normal',3),('mean',0)]:
        pg.evaluate(f"CT.start({{opp:3, lives:{lives}, ai:'{lvl}'}})"); pg.evaluate("CT.autopilot(true)")
        for k in range(60):
            st=pg.evaluate("CT.advance(5)")
            if st['mode']!='play': break
        kos=st['koLog']
        print(lvl, 'lives', lives or 'inf', 'mode', st['mode'], 'sim time', st['now'], 'KOs', len(kos), 'self', sum(1 for k in kos if not k['by']), dict(collections.Counter(k['kind'] for k in kos)))
        print('   ', pg.evaluate("GAME.carts.map(c=>[c.name, 'pts', c.stats.points, 'tk', c.stats.wipeouts, 'fin', c.stats.finals, 'self', c.stats.self, 'lives', c.lives>999?'inf':c.lives, 'samples', c.stats.samples, 'last', c.stats.lastCart])"))
        pg.wait_for_timeout(1600)
        pg.screenshot(path=out+f'/full_{lvl}.png')
logs=run(s)
errs=[l for l in logs if ('error' in l.lower()) and 'GPU stall' not in l]
print('console errors:', len(errs)); print('\n'.join(errs[:10]))
