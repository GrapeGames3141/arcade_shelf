import json, sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    pg.wait_for_timeout(1500)
    pg.screenshot(path=out+'/ui_title.png')
    pg.click('#rNext'); pg.click('#rNext')
    pg.click('#howb')
    pg.screenshot(path=out+'/ui_title_how.png')
    pg.click('#play')
    pg.wait_for_timeout(1200)
    pg.screenshot(path=out+'/ui_countdown.png')
    pg.wait_for_timeout(9000)
    pg.keyboard.down('KeyW')
    pg.wait_for_timeout(2500)
    pg.keyboard.down('KeyD'); pg.wait_for_timeout(600); pg.keyboard.up('KeyD')
    pg.screenshot(path=out+'/ui_drive.png')
    pg.keyboard.up('KeyW')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.screenshot(path=out+'/ui_pause.png')
    pg.click('#resume')
    # finish: knock everyone else out
    pg.evaluate("GAME.carts.slice(1).forEach(c=>{c.lives=1; knockOut(c,'pond',{x:c.x,z:c.z})})")
    pg.wait_for_timeout(9000)
    pg.screenshot(path=out+'/ui_end.png')
    print(pg.evaluate("GAME.mode"))
logs=run(s, url_q='?test&run&seed=2')
errs=[l for l in logs if ('error' in l.lower()) and 'GPU stall' not in l]
print('errors', len(errs), errs[:5])
