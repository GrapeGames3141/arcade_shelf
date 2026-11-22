# Headless launcher for Cartastrophe tests. Run scripts from the cartastrophe folder: python test/soak.py
# Set CHROME to a Chrome/Chromium executable, or leave it unset to use Playwright's bundled Chromium.
import sys, json, time, os
from playwright.sync_api import sync_playwright
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']
def run(script, url_q='?test&seed=3', w=1280, h=720, out='test/out'):
    os.makedirs(out, exist_ok=True)
    logs=[]
    with sync_playwright() as p:
        exe=os.environ.get('CHROME') or None
        b=p.chromium.launch(executable_path=exe, args=ARGS)
        pg=b.new_page(viewport={'width':w,'height':h})
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        from pathlib import Path
        pg.goto(Path('cartastrophe.html').resolve().as_uri()+url_q)
        pg.wait_for_function('window.__ready || window.__bootError', timeout=60000)
        err=pg.evaluate('window.__bootError||null')
        if err: print('BOOT ERROR', err)
        script(pg, out)
        b.close()
    for l in logs[:60]: print(l)
    return logs
if __name__=='__main__':
    def s(pg,out):
        pg.wait_for_timeout(500)
        pg.evaluate('CT.advance(0.1)')
        pg.screenshot(path=out+'/title.png')
        print(json.dumps(pg.evaluate('CT.state()'))[:600])
    run(s)
