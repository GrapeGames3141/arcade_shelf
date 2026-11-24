# Autopilots nights 1..8 for N seconds each and prints how each faction's nerve, dumpsters and the den went: python test/nights.py [secs]
import sys, json
sys.path.insert(0, 'test'); from shot import run
secs = float(sys.argv[1]) if len(sys.argv) > 1 else 60
first = int(sys.argv[2]) if len(sys.argv) > 2 else 1
last = int(sys.argv[3]) if len(sys.argv) > 3 else 8
def s(pg, out):
    for n in range(first, last + 1):
        pg.evaluate(f'AK.start({n}, {{auto: true, up: {{}}, food: 0}})')
        t = 0; st = None
        while t < secs:
            st = pg.evaluate('AK.advance(10)'); t += 10
            if st['mode'] != 'play': break
        pg.screenshot(path=f'{out}/night{n}.png')
        print(f"N{n} t={st['t']}/{st['len']} mode={st['mode']} food={st['food']} hp={st['player']['hp']} facs={[(f['k'], f['nerve'], f['bossHp']) for f in st['facs']]} dumps={[d['owner'] for d in st['dumps']]} den={st['den']} alive={st['byKind']} kos={st['stats']['kos']} bin/fl/curb/wall={st['stats']['binned']}/{st['stats']['flushed']}/{st['stats']['curbed']}/{st['stats']['walled']} lost={st['stats']['foodLost']}")
run(s)
