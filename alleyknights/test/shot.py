# Headless launcher for Alley Knights tests. Run from the alleyknights folder: python test/shot.py
# Set CHROME to a Chrome/Chromium executable, or leave it unset to use Playwright's bundled Chromium.
import sys, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']
def run(script, url_q='?test&seed=3', w=1280, h=720, out='test/out', mobile=False):
    os.makedirs(out, exist_ok=True)
    logs=[]
    with sync_playwright() as p:
        exe=os.environ.get('CHROME') or None
        b=p.chromium.launch(executable_path=exe, args=ARGS)
        ctx=b.new_context(viewport={'width':w,'height':h}, has_touch=mobile, is_mobile=mobile)
        pg=ctx.new_page()
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        pg.goto(Path('alleyknights.html').resolve().as_uri()+url_q)
        pg.wait_for_function('window.__ready || window.__bootError', timeout=90000)
        err=pg.evaluate('window.__bootError||null')
        if err: print('BOOT ERROR', err)
        else: script(pg, out)
        b.close()
    for l in logs[:60]: print(l)
    return logs
if __name__=='__main__':
    def s(pg,out):
        pg.evaluate('AK.advance(0.5)')
        pg.screenshot(path=out+'/title.png')
        print(json.dumps(pg.evaluate('AK.state()'))[:900])
    run(s)
