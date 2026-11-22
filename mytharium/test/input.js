// Input test with real pointer events: node input.js <html>
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 680 } });
  const logs = []; page.on('console', m => { if (m.type() === 'error') logs.push('[error] ' + m.text()); }); page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
  await page.goto('file://' + path.resolve(process.argv[2]) + '?test&seed=1');
  await page.waitForFunction(() => window.MY && window.MY.ready, null, { timeout: 120000 });
  const ev = s => page.evaluate(s);
  const out = (k, v) => console.log(k.padEnd(28), JSON.stringify(v));
  await ev(`MY.cam({target:[0,10,8],yaw:0,pitch:.35,dist:45});MY.frame()`);
  // screen position of a creature
  const scr = async id => ev(`(()=>{const c=MY.get(${id});const p=MY._eval('critCentre(crits.find(c=>c.id===${id}))');const s=MY._eval('M4.xf4(CAM.vp,'+JSON.stringify(p)+')');return [(s[0]*.5+.5)*innerWidth,(1-(s[1]*.5+.5))*innerHeight];})()`);
  // 1. tap a unicorn: selects and pets it
  let [x, y] = await scr(1); await page.mouse.click(x, y); await ev('MY.step(.2)');
  out('tap unicorn -> state', await ev(`[MY.get(1).state, MY._eval('SELECTED&&SELECTED.id')]`));
  // 2. press and hold: picks it up; move; release puts it down
  [x, y] = await scr(2); await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(700); await ev('MY.step(.1)');
  const held = await ev('MY.get(2).state'); await page.mouse.move(x + 120, y + 30, { steps: 5 }); const pos = await ev('MY.get(2).pos'); await page.mouse.up(); await ev('MY.step(.1)');
  out('hold unicorn -> state', held); out('carried to', pos.map(v => +v.toFixed(1))); out('after release', await ev('MY.get(2).state'));
  // 3. mister: open Care, choose Mister, hold over the tank
  await page.click('#bar button[data-m=care]'); await page.click('#cMist'); const h0 = await ev('TERR=MY.state().humid');
  await page.mouse.move(550, 380); await page.mouse.down(); for (let i = 0; i < 10; i++) { await page.mouse.move(550 + i * 8, 380); await ev('MY.step(.1)'); } await page.mouse.up();
  out('humidity before/after', [h0, await ev('MY.state().humid')]); await page.click('#toolDone');
  // 4. feed: pick clover, tap the meadow
  await page.click('#bar button[data-m=feed]'); await page.click('.card[data-f=clover]'); const f0 = await ev('MY.state().foods');
  await page.mouse.click(520, 430); out('foods before/after', [f0, await ev('MY.state().foods')]); await page.click('#toolDone');
  // 5. build: place a fern, then select and resize it
  await page.click('#bar button[data-m=build]'); await page.click('.card[data-k=fern]'); const n0 = await ev('MY.state().items');
  await page.mouse.click(600, 420); out('items before/after place', [n0, await ev('MY.state().items')]); await page.click('#toolDone');
  // 6. terrain: raise with the brush
  await page.click('#bar button[data-m=build]'); await page.click('#shTabs .tab:nth-child(4)'); await page.click('.chip[data-v=raise]');
  const g0 = await ev(`MY._eval('groundH(-10,12)')`); const sp = await ev(`(()=>{const s=MY._eval('M4.xf4(CAM.vp,[-10,'+MY._eval('groundH(-10,12)')+',12])');return [(s[0]*.5+.5)*innerWidth,(1-(s[1]*.5+.5))*innerHeight];})()`);
  await page.mouse.move(sp[0], sp[1]); await page.mouse.down(); for (let i = 0; i < 12; i++) { await page.mouse.move(sp[0] + (i % 2), sp[1]); await page.waitForTimeout(20); } await page.mouse.up(); await ev('MY.step(.4)');
  out('ground before/after raise', [+g0.toFixed(2), +(await ev(`MY._eval('groundH(-10,12)')`)).toFixed(2)]); await page.click('#toolDone');
  // 7. wipe the glass
  await page.click('#bar button[data-m=care]'); await page.click('#cWipe'); await ev('MY.cam({target:[0,30,0],yaw:0,pitch:.05,dist:160})');
  await page.mouse.move(400, 450); await page.mouse.down(); await page.mouse.move(700, 470, { steps: 8 }); await page.mouse.up();
  out('wipe mask pixels', await ev(`MY._eval('WIPE.data.reduce((a,b)=>a+(b>0),0)')`)); await page.click('#toolDone');
  // 8. keys: views, journal, photo
  await page.keyboard.press('3'); await page.keyboard.press('j'); out('journal open', await ev(`!document.getElementById('journal').classList.contains('hidden')`)); await page.keyboard.press('j');
  await page.keyboard.press('p'); out('photo mode', await ev('MY._eval("PHOTO.on")')); await page.keyboard.press('p');
  // 9. wheel zoom and drag orbit
  const d0 = await ev('MY._eval("CAM.t.dist")'); await page.mouse.move(550, 300); await page.mouse.wheel(0, -400); out('wheel zoom dist', [+d0.toFixed(1), +(await ev('MY._eval("CAM.t.dist")')).toFixed(1)]);
  const y0 = await ev('MY._eval("CAM.t.yaw")'); await page.mouse.move(300, 300); await page.mouse.down(); await page.mouse.move(500, 320, { steps: 6 }); await page.mouse.up(); out('drag orbit yaw', [+y0.toFixed(2), +(await ev('MY._eval("CAM.t.yaw")')).toFixed(2)]);
  out('errors', logs);
  await browser.close();
})();
