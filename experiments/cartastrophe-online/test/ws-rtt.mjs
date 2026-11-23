// Measure ping round-trip through wrangler dev while a match is running (2 raw clients, no rendering).
const BASE = process.argv[2] || 'http://127.0.0.1:8787', WSB = BASE.replace(/^http/, 'ws');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { code } = await (await fetch(BASE + '/api/rooms?lives=3', { method: 'POST' })).json();
const mk = n => { const ws = new WebSocket(`${WSB}/ws?room=${code}`); const c = { ws, rtts: [], snaps: 0, gaps: [], last: 0 };
  ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', name: n, rider: 0 }));
  ws.onmessage = e => { const m = JSON.parse(e.data); const t = performance.now();
    if (m.t === 'pong') c.rtts.push(t - m.c);
    if (m.t === 'snap') { c.snaps++; if (c.last) c.gaps.push(t - c.last); c.last = t; } };
  return c; };
const A = mk('a'), B = mk('b'); await sleep(500);
A.ws.send('{"t":"ready","on":true}'); B.ws.send('{"t":"ready","on":true}'); await sleep(4000);
for (let i = 0; i < 40; i++) { A.ws.send(JSON.stringify({ t: 'ping', c: performance.now() })); A.ws.send(JSON.stringify({ t: 'in', th: 1, st: 0.3, it: 0 })); await sleep(100); }
const st = a => { a = a.slice().sort((x, y) => x - y); return `median ${a[a.length >> 1].toFixed(1)} ms, p95 ${a[Math.floor(a.length * 0.95)].toFixed(1)} ms`; };
console.log('ping RTT', st(A.rtts)); console.log('snapshot interval', st(A.gaps), 'count', A.snaps);
A.ws.close(); B.ws.close(); await sleep(200); process.exit(0);
