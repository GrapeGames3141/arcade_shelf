# Real-time click-through: title -> PLAY -> fight with keys -> pause -> resume; prints console errors: python test/ui.py
import sys, json
sys.path.insert(0, 'test'); from shot import run
def s(pg, out):
    pg.wait_for_timeout(800)
    pg.click('#cont'); pg.wait_for_timeout(3500)
    pg.keyboard.down('KeyW'); pg.wait_for_timeout(1500); pg.keyboard.up('KeyW')
    for i in range(6): pg.keyboard.press('KeyJ'); pg.wait_for_timeout(150)
    pg.keyboard.down('KeyK'); pg.wait_for_timeout(500); pg.keyboard.press('KeyJ'); pg.keyboard.up('KeyK')
    pg.keyboard.press('Space'); pg.wait_for_timeout(1000)
    pg.screenshot(path=out+'/ui_play.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300); pg.screenshot(path=out+'/ui_pause.png')
    print('paused:', pg.evaluate('GAME.mode'))
    pg.click('#resume'); pg.wait_for_timeout(5000)
    print(json.dumps(pg.evaluate('AK.state()'))[:400])
run(s, url_q='?seed=5')
