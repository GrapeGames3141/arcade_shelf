import json, sys
sys.path.insert(0,'test')
from shot import run
def s(pg,out):
    pg.evaluate("CT.advance(0.2)")
    pg.screenshot(path=out+'/m_title.png')
    pg.evaluate("CT.start({opp:3, lives:3, touch:'on'})"); pg.evaluate("INPUT.applyTouch()")
    pg.evaluate("CT.give(0,'melon')")
    pg.evaluate("CT.setInput({throttle:1})"); pg.evaluate("CT.advance(2.5)")
    pg.screenshot(path=out+'/m_play.png')
run(s, w=844, h=390)
