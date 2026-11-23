// Two raw WebSocket clients against `wrangler dev`: create a room, join, ready up, drive scripted inputs,
// check the server runs collisions / pickups / scoring and writes results. Also tests full-room and bad-code errors.
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const WSB = BASE.replace(/^http/, 'ws');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const r = await fetch(BASE + '/api/rooms?lives=1', { method: 'POST' }); const { code } = await r.json();
console.log('room', code);
function client(name, rider) {
  const ws = new WebSocket(`${WSB}/ws?room=${code}`);
  const c = { ws, name, msgs: [], snap: null, ev: {}, slot: -1, results: null, errors: [] };
  ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', name, rider }));
  ws.onmessage = e => { const m = JSON.parse(e.data); c.msgs.push(m.t);
    if (m.t === 'welcome') { c.slot = m.slot; c.token = m.token; c.rider = m.rider; }
    if (m.t === 'snap') { c.snap = m; for (const v of m.ev) c.ev[v.t] = (c.ev[v.t] || 0) + 1; if (m.results) c.results = m.results; }
    if (m.t === 'error') c.errors.push(m.code); };
  return c;
}
const A = client('Alice', 2), B = client('Bob', 2);
await sleep(600);
console.log('slots', A.slot, B.slot, 'riders (dedup)', A.rider, B.rider);
const C = client('Carl', 0); await sleep(400); console.log('third client errors', C.errors);
const bad = new WebSocket(`${WSB}/ws?room=ZZZZZ`); let badErr = null; bad.onmessage = e => badErr = JSON.parse(e.data).code; await sleep(400); console.log('bad code ->', badErr);
A.ws.send(JSON.stringify({ t: 'ready', on: true })); B.ws.send(JSON.stringify({ t: 'ready', on: true }));
await sleep(3800);
console.log('mode after countdown', A.snap && A.snap.mode);
// A hunts B; B holds still-ish near its spawn. Fire items whenever held.
let it = 0, t0 = Date.now();
while (Date.now() - t0 < 90000 && !(A.results && B.results)) {
  const s = A.snap; if (!s) { await sleep(50); continue; }
  const me = s.carts[A.slot], op = s.carts[B.slot];
  const want = Math.atan2(op[0] - me[0], op[2] - me[2]); let err = want - me[3]; err = Math.atan2(Math.sin(err), Math.cos(err));
  if (me[16]) it++;
  A.ws.send(JSON.stringify({ t: 'in', th: 1, st: Math.max(-1, Math.min(1, -err * 2)), bo: Math.abs(err) < 0.25 ? 1 : 0, br: 0, it }));
  B.ws.send(JSON.stringify({ t: 'in', th: 0.35, st: 0.5, bo: 0, br: 0, it: 0 }));
  await sleep(50);
}
const s = A.snap;
console.log('final mode', s.mode, 'timer', s.timer);
console.log('A events', JSON.stringify(A.ev));
console.log('B saw same KOs', A.ev.ko === B.ev.ko, 'B snaps last tick', B.snap.tick, 'A tick', A.snap.tick);
console.log('results', JSON.stringify((A.results || []).map(r => ({ name: r.name, pts: r.points, ko: r.wipeouts, self: r.self, lives: r.lives, items: r.items }))));
// rejoin with the token: should get the same slot back
const tok = B.token; B.ws.close(); await sleep(300);
const B2 = new WebSocket(`${WSB}/ws?room=${code}`); let w2 = null;
B2.onopen = () => B2.send(JSON.stringify({ t: 'hello', name: 'Bob', rider: 2, token: tok })); B2.onmessage = e => { const m = JSON.parse(e.data); if (m.t === 'welcome') w2 = m.slot; };
await sleep(500); console.log('rejoin slot', w2, '(was', B.slot + ')');
A.ws.close(); B2.close(); C.ws.close(); bad.close();
await sleep(300); process.exit(0);
