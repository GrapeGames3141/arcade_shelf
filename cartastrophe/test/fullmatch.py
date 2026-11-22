import json, sys, collections
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    for lvl in ['easy','mean']:
        pg.evaluate(f"CT.start({{opp:3, lives:3, ai:'{lvl}'}})"); pg.evaluate("CT.autopilot(true)")
        for k in range(60):
            st=pg.evaluate("CT.advance(5)")
            if st['mode']!='play': break
        kos=st['koLog']
        print(lvl, 'mode', st['mode'], 'sim time', st['now'], 'KOs', len(kos), 'self', sum(1 for k in kos if not k['by']), dict(collections.Counter(k['kind'] for k in kos)))
        print('   ', [(c['name'], c['lives'], c['wipeouts']) for c in st['carts']])
        pg.wait_for_timeout(1600)
        pg.screenshot(path=out+f'/full_{lvl}.png')
logs=run(s)
errs=[l for l in logs if 'error' in l.lower() and 'GPU stall' not in l]
print('console errors:', len(errs)); print('\n'.join(errs[:10]))
