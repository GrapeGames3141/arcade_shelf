// Headless test harness: node shot.js <html> <out-prefix> [script.json]
// Loads the page with ?test, waits for window.SA (or AQ) ready, runs a list of steps, saves screenshots and logs.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const [,, html, out, stepsFile, w = '1280', h = '720', extra = ''] = process.argv;
  const steps = stepsFile && stepsFile !== '-' ? JSON.parse(fs.readFileSync(stepsFile, 'utf8')) : [{ shot: 'front' }];
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  const logs = [];
  page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()));
  page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
  const url = 'file://' + path.resolve(html) + '?test&seed=1' + (extra ? '&' + extra : '');
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => (window.SA || window.AQ) && (window.SA || window.AQ).ready, null, { timeout: 120000 }).catch(e => logs.push('[timeout] ' + e.message));
  logs.push('[harness] ready after ' + (Date.now() - t0) + ' ms');
  const api = 'window.SA||window.AQ';
  let n = 0;
  for (const s of steps) {
    try {
      if (s.eval) { const r = await page.evaluate(`(()=>{const A=${api};${s.eval}})()`); if (r !== undefined) logs.push('[eval] ' + JSON.stringify(r).slice(0, 4000)); }
      if (s.step) await page.evaluate(`(${api}).step(${s.step})`);
      if (s.shot) {
        await page.evaluate(`(${api}).frame()`);
        await page.evaluate(`(${api}).frame()`);
        const f = `${out}-${String(n++).padStart(2, '0')}-${s.shot}.png`;
        await page.screenshot({ path: f, timeout: 180000 });
        logs.push('[shot] ' + f);
      }
    } catch (e) { logs.push('[step error] ' + JSON.stringify(s).slice(0, 200) + ' :: ' + e.message); }
  }
  const st = await page.evaluate(`(()=>{const A=${api};return A&&A.state?A.state():null})()`).catch(e => 'state err ' + e.message);
  logs.push('[state] ' + JSON.stringify(st));
  fs.writeFileSync(out + '-log.txt', logs.join('\n'));
  console.log(logs.filter(l => !l.startsWith('[log] [AQ] dump')).slice(-40).join('\n'));
  await browser.close();
})();
