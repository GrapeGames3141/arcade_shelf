// Headless test harness: Playwright + SwiftShader. Usage:
//   node test/run.cjs <scenario> [q=low] [w=1280] [h=720]
// Writes screenshots to test/out and prints console logs and page errors.
const path = require('path');
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }

const scenario = process.argv[2] || 'boot';
const args = Object.fromEntries(process.argv.slice(3).map((a) => a.split('=')));
const q = args.q || 'low';
const W = +(args.w || 1280), H = +(args.h || 720);
const file = path.resolve(__dirname, '..', 'lawnchairaces.html');
const out = path.resolve(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await pw.chromium.launch({
    executablePath: fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined,
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const logs = [], errors = [];
  page.on('console', (m) => { const t = m.type() + ': ' + m.text(); logs.push(t); if (m.type() === 'error' || m.type() === 'warning') console.log('  [console] ' + t.slice(0, 600)); });
  page.on('pageerror', (e) => { errors.push(e.message); console.log('  [pageerror] ' + e.message); });
  const extra = args.extra ? '&' + args.extra : '';
  const url = 'file://' + file + '?test&q=' + q + '&seed=' + (args.seed || 3) + '&scale=' + (args.scale || 1) + extra;
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => window.LA && (window.LA.ready || document.getElementById('err').style.display === 'block'), null, { timeout: 180000 });
  console.log('boot ' + (Date.now() - t0) + ' ms');
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const shot = async (name) => { await page.screenshot({ path: path.join(out, name + '.png') }); console.log('  shot ' + name); };
  const frames = async (n) => { for (let i = 0; i < (n || 1); i++) await ev(() => LA.frame()); };
  const S = require('./scenarios.cjs');
  if (!S[scenario]) { console.log('unknown scenario ' + scenario + '; have ' + Object.keys(S).join(', ')); }
  else await S[scenario]({ page, ev, shot, frames, args, q });
  const perf = await ev(() => window.LA && LA.perf ? LA.perf() : null).catch(() => null);
  console.log('perf ' + JSON.stringify(perf));
  console.log('errors ' + errors.length);
  fs.writeFileSync(path.join(out, scenario + '.log'), logs.join('\n'));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
