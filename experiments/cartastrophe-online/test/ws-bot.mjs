// A headless opponent: joins ROOM and chases the other cart (no rendering). Usage: node test/ws-bot.mjs CODE [base] [seconds]
const [code, BASE = 'http://127.0.0.1:8787', secs = '90'] = process.argv.slice(2);
const ws = new WebSocket(BASE.replace(/^http/, 'ws') + '/ws?room=' + code);
let slot = -1, snap = null, it = 0, stuck = 0, rev = 0;
ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', name: 'Bot', rider: 5 }));
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.t === 'welcome') slot = m.slot; if (m.t === 'snap') snap = m;
  if (m.t === 'lobby' && slot >= 0 && m.players[slot] && !m.players[slot].ready && m.mode !== 'play') ws.send('{"t":"ready","on":true}'); };
const end = Date.now() + secs * 1000;
const iv = setInterval(() => {
  if (Date.now() > end) { clearInterval(iv); ws.close(); return; }
  if (!snap || slot < 0) return;
  const me = snap.carts[slot], op = snap.carts[1 - slot];
  let tx = op[0], tz = op[2];
  const dpx = -12 - me[0], dpz = -10 - me[2]; if (Math.hypot(dpx, dpz) < 12) { tx = me[0] - dpx; tz = me[2] - dpz; }   // keep off the pond
  if (me[0] > 30) tx = 0;                                                                                             // and off the cliff
  const want = Math.atan2(tx - me[0], tz - me[2]); let err = want - me[3]; err = Math.atan2(Math.sin(err), Math.cos(err));
  const sp = Math.hypot(me[6], me[8]); stuck = sp < 1 && snap.mode === 'play' ? stuck + 1 : 0; if (stuck > 25) { rev = 15; stuck = 0; }
  if (me[16]) it++;
  if (rev > 0) { rev--; ws.send(JSON.stringify({ t: 'in', th: 0, br: 1, st: 1, bo: 0, it })); }
  else ws.send(JSON.stringify({ t: 'in', th: 1, st: Math.max(-1, Math.min(1, -err * 2)), bo: Math.abs(err) < 0.25 ? 1 : 0, br: 0, it }));
}, 50);
