# Starts a night with the autopilot and takes screenshots along the way: python test/play.py [night] [seconds]
import sys, json
sys.path.insert(0, 'test'); from shot import run
night = int(sys.argv[1]) if len(sys.argv) > 1 else 1
secs = float(sys.argv[2]) if len(sys.argv) > 2 else 30
def s(pg, out):
    pg.evaluate(f'AK.start({night}, {{auto: true}})')
    pg.evaluate('AK.advance(0.2)'); pg.screenshot(path=f'{out}/n{night}_start.png')
    t = 0
    while t < secs:
        st = pg.evaluate('AK.advance(5)'); t += 5
        print(int(t), st['mode'], 'food', st['food'], 'hp', st['player']['hp'], st['player']['weapon'], 'facs', [(f['k'], f['nerve']) for f in st['facs']], 'dumps', [d['owner'] for d in st['dumps']], 'den', st['den'], 'n', st['byKind'], 'kos', st['stats']['kos'])
        if t in (10, 20) or st['mode'] != 'play': pg.screenshot(path=f'{out}/n{night}_{int(t)}.png')
        if st['mode'] in ('dawn', 'lost'): break
    print(json.dumps(pg.evaluate('AK.state()')['result'])[:500])
run(s)
