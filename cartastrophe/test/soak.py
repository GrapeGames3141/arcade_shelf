import json, sys, collections
sys.path.insert(0,'test')
from shot import run
res={}
def s(pg,out):
    pg.evaluate("CT.start({opp:5, lives:5, ai:'normal'})")
    pg.evaluate("CT.autopilot(true)")
    tl=[]
    for k in range(30):
        st=pg.evaluate('CT.advance(4.0)')
        tl.append([ (c['name'][:4], round(c['speed'],1), c['state']) for c in st['carts']])
        if k in (3,10,20): pg.screenshot(path=out+f'/soak{k}.png')
        if st['mode']!='play': break
    res['st']=st
    print('mode', st['mode'], 'time', st['now'], 'timer', st['timer'])
    kos=st['koLog']
    print('KOs', len(kos))
    print(collections.Counter(k['kind'] for k in kos))
    print('credited', sum(1 for k in kos if k['by']), 'self', sum(1 for k in kos if not k['by']))
    for c in st['carts']: print(c['name'], 'lives', c['lives'], 'wipeouts', c['wipeouts'], 'self', c['self'], c['state'])
    for row in tl[::5]: print(row)
run(s)
