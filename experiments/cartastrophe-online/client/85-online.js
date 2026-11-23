// ===== Cartastrophe Online: browser client =====
// The Durable Object runs the match. This page sends inputs, predicts its own cart with the shared physics so steering
// feels immediate, shows the opponent ~100 ms in the past (interpolated between server snapshots) and turns the
// server's events into the usual wrecks, ragdolls, groceries, sounds and callouts. Local play is untouched.
SEGS.olives = [[1, '1'], [3, '3'], [5, '5'], [0, '∞ (3 min)']];
if (SET.olives === undefined) SET.olives = 3;

const NET = {
  active: false, ws: null, slot: -1, token: null, code: null, lives: 3, names: ['', ''], players: [null, null],
  snaps: [], lastRecv: 0, rtt: 80, pingT: 0, itemCount: 0, adoptItems: false, sendT: 0, lastSent: '', heartbeat: 0,
  wantClose: false, retry: 0, retryT: null, serverMode: 'lobby', ready: false, savedLives: null, inMatch: false,
  interp: 0.1, stats: { snaps: 0, bytes: 0, inputs: 0 }, startedAt: 0
};
const NET_ITEM = [null, 'melon', 'banana', 'blower', 'mega'];
const NET_STATE = ['drive', 'ko', 'out'];
const $id = id => document.getElementById(id);

// ---------- UI ----------
function netInitUI() {
  const onl = $id('onl'), playRow = $id('play').parentNode;
  playRow.parentNode.insertBefore(onl, playRow);   // online first: this page exists for it
  $id('play').textContent = 'PLAY OFFLINE';
  const nm = $id('oName'); nm.value = (localStorage.getItem('cto_name') || '').slice(0, 14);
  nm.addEventListener('input', () => { try { localStorage.setItem('cto_name', nm.value); } catch (e) { } });
  const cd = $id('oCode');
  cd.addEventListener('input', () => { cd.value = cd.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 5); });
  cd.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') netJoin(); });
  nm.addEventListener('keydown', e => e.stopPropagation());
  const qr = (QS.get('room') || '').toUpperCase(); if (/^[A-Z2-9]{5}$/.test(qr)) { cd.value = qr; netStatus('Invite code filled in. Pick a rider and press Join.'); }
  $id('oCreate').onclick = netCreate; $id('oJoin').onclick = netJoin;
  $id('lReady').onclick = () => netReady(!NET.ready);
  $id('lLeave').onclick = () => netLeave(true);
  $id('nlLeave').onclick = () => netLeave(true);
  $id('lCopy').onclick = () => {
    const link = location.origin + location.pathname + '?room=' + NET.code;
    const done = () => { $id('lCopy').textContent = 'Link copied!'; setTimeout(() => $id('lCopy').textContent = 'Copy invite link', 1500); };
    try { if (navigator.share && INPUT.touchOn) navigator.share({ title: 'Cartastrophe', text: 'Room ' + NET.code, url: link }).catch(() => { }); else navigator.clipboard.writeText(link).then(done, () => prompt('Invite link', link)); } catch (e) { prompt('Invite link', link); }
  };
  // end-of-match buttons become rematch / leave while online
  $id('again').addEventListener('click', () => { if (NET.active) netReady(!NET.ready); }, true);
}
function netStatus(msg, err) { const s = $id('oStatus'); s.textContent = msg || ''; s.classList.toggle('err', !!err); }
function netName() { return ($id('oName').value || '').trim() || RIDERS[SET.rider].name; }

async function netCreate() {
  AUD.init(); netStatus('Creating a room...');
  try {
    const r = await fetch('/api/rooms?lives=' + SET.olives, { method: 'POST' });
    const j = await r.json(); if (!r.ok || !j.code) throw new Error(j.error || 'HTTP ' + r.status);
    netConnect(j.code);
  } catch (e) { netStatus('Could not create a room: ' + e.message, true); }
}
function netJoin() {
  AUD.init();
  const code = $id('oCode').value.toUpperCase();
  if (!/^[A-Z2-9]{5}$/.test(code)) { netStatus('Room codes are 5 letters/numbers.', true); return; }
  netConnect(code);
}

// ---------- socket ----------
function netConnect(code, rejoin) {
  if (NET.ws) { NET.wantClose = true; try { NET.ws.close(); } catch (e) { } }
  NET.code = code; NET.wantClose = false;
  if (!rejoin) { NET.token = sessionStorage.getItem('cto_tok_' + code) || null; netStatus('Connecting to room ' + code + '...'); }
  const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws?room=' + code);
  NET.ws = ws;
  ws.onopen = () => { NET.retry = 0; ws.send(JSON.stringify({ t: 'hello', name: netName(), rider: SET.rider, token: NET.token })); };
  ws.onmessage = ev => { if (ws === NET.ws) netMessage(ev.data); };
  ws.onclose = ev => {
    if (ws !== NET.ws) return;
    NET.ws = null;
    if (NET.wantClose || ev.code === 4404 || ev.code === 4409 || ev.code === 4000) return;
    if (!NET.active) { netStatus('Could not reach the room server.', true); return; }
    // dropped: keep the match on screen and try to rejoin with the same seat token (the server holds it for 30 s)
    $id('netlost').classList.remove('hidden');
    NET.retry++;
    $id('nlMsg').textContent = `Reconnecting... (try ${NET.retry})`;
    if (NET.retry > 12) { $id('nlMsg').textContent = 'Could not reconnect. The room may have closed.'; return; }
    NET.retryT = setTimeout(() => netConnect(NET.code, true), Math.min(4000, 400 * NET.retry));
  };
}
function netSend(o) { if (NET.ws && NET.ws.readyState === 1) { NET.ws.send(JSON.stringify(o)); return true; } return false; }

function netMessage(data) {
  NET.stats.bytes += data.length;
  let m; try { m = JSON.parse(data); } catch (e) { return; }
  switch (m.t) {
    case 'welcome':
      NET.active = true; NET.slot = m.slot; NET.token = m.token; NET.code = m.code; NET.lives = m.lives;
      try { sessionStorage.setItem('cto_tok_' + m.code, m.token); } catch (e) { }
      try { history.replaceState(null, '', location.pathname + '?room=' + m.code); } catch (e) { }
      if (m.rider !== SET.rider) feed(`Your opponent already picked ${RIDERS[SET.rider].name}, so you're ${RIDERS[m.rider].name}.`);
      $id('netlost').classList.add('hidden');
      netStatus('');
      if (!NET.inMatch) netShowLobby();
      break;
    case 'lobby': netLobby(m); break;
    case 'start': netStart(m); break;
    case 'snap': netSnap(m); break;
    case 'pong': NET.rtt = lerp(NET.rtt, performance.now() - m.c, 0.3); break;
    case 'error':
      netStatus(m.msg, true);
      if (NET.active && m.code === 'noroom') { netLeave(false); netStatus(m.msg, true); }
      break;
  }
}

// ---------- lobby ----------
function netShowLobby() {
  $id('title').classList.add('hidden'); $id('end').classList.add('hidden'); $id('lobby').classList.remove('hidden');
  $id('lCode').textContent = NET.code;
}
function netLobby(m) {
  NET.players = m.players; NET.serverMode = m.mode; NET.lives = m.lives;
  const me = m.players[NET.slot]; NET.ready = !!(me && me.ready);
  const L = $id('lPlayers'); L.innerHTML = '';
  m.players.forEach((p, i) => {
    const d = document.createElement('div');
    if (!p) { d.className = 'lp empty'; d.textContent = 'Waiting for a second shopper...'; }
    else {
      const r = RIDERS[p.rider]; d.className = 'lp';
      const st = !p.connected ? '<span class="st off">reconnecting...</span>' : p.ready ? '<span class="st ok">READY</span>' : '<span class="st wait">not ready</span>';
      d.innerHTML = `<div class="sw" style="background:${hexCss(r.shirt)}">${r.icon}</div><div>${netEsc(p.name)}${i === NET.slot ? ' (you)' : ''}<div style="font-size:12px;opacity:.75;font-weight:600">${r.name}</div></div>${st}`;
    }
    L.appendChild(d);
  });
  $id('lReady').textContent = NET.ready ? 'NOT READY' : 'READY';
  $id('lInfo').textContent = `Lives: ${m.lives ? m.lives : '∞ (3 min)'} · the match starts when both shoppers are ready`;
  const opp = m.players[1 - NET.slot];
  const again = $id('again');
  if (NET.inMatch && GAME.mode === 'end') {
    again.textContent = NET.ready ? 'WAITING...' : 'REMATCH';
    $id('endq').textContent = 'Leave room';
    const en = $id('endnet'); en.classList.remove('hidden');
    en.textContent = !opp ? 'Your opponent left the room.' : !opp.connected ? 'Opponent reconnecting...' : opp.ready ? `${opp.name} wants a rematch!` : NET.ready ? `Waiting for ${opp.name}...` : '';
  }
  netBar();
}
function netEsc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function netReady(on) { NET.ready = on; netSend({ t: 'ready', on }); AUD.ui(); }
function netBar() {
  const opp = NET.players[1 - NET.slot];
  $id('netbar').textContent = `Room ${NET.code} · ping ${Math.round(NET.rtt)} ms` + (opp && !opp.connected ? ' · opponent reconnecting...' : '');
}

function netLeave(tell) {
  if (tell) netSend({ t: 'leave' });
  NET.wantClose = true; clearTimeout(NET.retryT);
  if (NET.ws) { try { NET.ws.close(1000); } catch (e) { } NET.ws = null; }
  try { sessionStorage.removeItem('cto_tok_' + NET.code); history.replaceState(null, '', location.pathname); } catch (e) { }
  const wasMatch = NET.inMatch;
  NET.active = false; NET.inMatch = false; NET.slot = -1; NET.snaps = []; NET.ready = false;
  if (NET.savedLives !== null) { SET.lives = NET.savedLives; NET.savedLives = null; }
  ['lobby', 'netlost', 'netbar', 'endnet', 'pause'].forEach(id => $id(id).classList.add('hidden'));
  $id('again').textContent = 'PLAY AGAIN'; $id('endq').textContent = 'Title';
  $id('restart').style.display = ''; $id('quit').textContent = 'Quit to title'; GAME.netPaused = false;
  GAME.noAI = false;
  if (wasMatch || GAME.mode !== 'title') _toTitle(); else $id('title').classList.remove('hidden');
}

// ---------- match setup ----------
function netStart(m) {
  AUD.init();
  if (NET.savedLives === null) NET.savedLives = SET.lives;
  SET.lives = m.lives;
  ['lobby', 'title', 'end', 'endnet', 'netlost', 'pause'].forEach(id => $id(id).classList.add('hidden'));
  newMatch(false);                       // world props, ducks, HUD, feed: then swap in the two online carts
  GAME.ais = []; GAME.noAI = true;
  GAME.carts = m.riders.map((ri, i) => {
    const c = new Cart(i, RIDERS[ri], i === NET.slot);
    c.name = (m.names[i] || RIDERS[ri].name).slice(0, 14);
    c.lives = m.lives || 9999;
    const sp = i === 0 ? START_SPOTS[0] : START_SPOTS[3]; c.reset(sp[0], sp[1], sp[2]);
    return c;
  });
  GAME.player = GAME.carts[NET.slot]; GAME.playT = 0; GAME.slowT = 0; GAME.timeScale = 1;
  HUD.build();
  NET.inMatch = true; NET.snaps = []; NET.itemCount = 0; NET.adoptItems = true; NET.ready = false; NET.startedAt = performance.now();
  NET.names = m.names;
  $id('netbar').classList.remove('hidden');
  INPUT.applyTouch();
  $id('again').textContent = 'REMATCH'; $id('endq').textContent = 'Leave room';
}

// ---------- snapshots ----------
function netCartSet(c, a, full) {
  // a = server cart row (see snapshot() in src/core-server.js)
  if (full) {
    c.x = a[0]; c.y = a[1]; c.z = a[2]; c.yaw = a[3]; c.pitch = a[4]; c.roll = a[5];
    c.vx = a[6]; c.vy = a[7]; c.vz = a[8]; c.w = a[9]; c.delta = a[10]; c.squash = a[25]; c.lean = a[28];
    c.onGround = !!a[23]; c.airT = a[29]; c.steer = a[10];
  }
  if (c !== GAME.player || full) { c.input.steer = a[11]; c.thrustNow = a[12] * THRUST; c.boosting = !!a[22]; c.braking = !!a[24]; }
  c.state = NET_STATE[a[13]]; c.lives = a[14];
  c.out = c.lives <= 0 && c.state !== 'drive';
  c.item = NET_ITEM[a[16]]; c.itemN = a[17];
  c.heat = a[18]; c.overT = a[19]; c.ghostT = a[20]; c.spinT = a[21]; c.megaT = a[26]; c.blowerT = a[27];
  const s = c.stats;
  s.points = a[15]; s.wipeouts = a[30]; s.finals = a[31]; s.self = a[32]; s.deaths = a[33]; s.samples = a[34]; s.lastCart = a[35];
  s.topSpeed = a[36]; s.maxAir = a[37]; s.clears = a[38];
}
function netSnap(m) {
  if (!NET.inMatch) return;
  NET.stats.snaps++;
  const tNow = performance.now();
  NET.lastRecv = tNow;
  // events first (a KO arrives with the cart's pose at the moment of impact), then the new state
  for (const e of m.ev || []) netEvent(e);
  NET.snaps.push({ t: m.now, carts: m.carts, recv: tNow });
  while (NET.snaps.length > 30) NET.snaps.shift();
  const carts = GAME.carts;
  m.carts.forEach((a, i) => {
    const c = carts[i]; if (!c) return;
    if (c === GAME.player) {
      if (NET.adoptItems) { NET.itemCount = Math.max(NET.itemCount, a[39]); NET.adoptItems = false; }
      netReconcile(c, a);
    } else netCartSet(c, a, false);
  });
  // world
  GAME.timer = m.timer; GAME.countT = m.count;
  const prev = GAME.mode;
  if (m.mode === 'end' && prev !== 'end' && prev !== 'title') { GAME.mode = 'play'; endMatch(); $id('again').textContent = 'REMATCH'; $id('endq').textContent = 'Leave room'; }
  else if (prev !== 'end' || m.mode !== 'end') GAME.mode = m.mode;
  if (prev === 'countdown' && GAME.mode === 'countdown' && Math.ceil(m.count - 0.2) !== NET.lastBeep) { NET.lastBeep = Math.ceil(m.count - 0.2); if (NET.lastBeep > 0 && NET.lastBeep < 4) AUD.beep(); }
  for (let i = 0; i < GAME.pickups.length; i++) GAME.pickups[i].active = m.pk[i] === '1';
  GAME.peels = m.peels.map(p => ({ x: p[0], z: p[1], yaw: p[2], t: 1 }));
  GAME.melons = m.melons.map(q => ({ x: q[0], y: q[1], z: q[2], vx: q[3], vy: q[4], vz: q[5], spin: q[6] }));
  GAME.puddles = m.puddles.map(p => ({ x: p[0], z: p[1], r: p[2], t: p[3], life: p[4], yaw: p[5] }));
  if (m.sample) { const S = GAME.sample; if (!S.active) { S.active = true; } S.x = m.sample[0]; S.y = m.sample[1]; S.z = m.sample[2]; } else GAME.sample.active = false;
  if (NET.stats.snaps % 15 === 0) netBar();
}

// own cart: keep the locally predicted state, pull it toward the server (extrapolated by half the ping)
function netReconcile(c, a) {
  const st = NET_STATE[a[13]];
  if (c.state !== 'drive' || st !== 'drive') { netCartSet(c, a, true); return; }
  const lead = clamp(NET.rtt / 2000, 0, 0.2);
  const sx = a[0] + a[6] * lead, sz = a[2] + a[8] * lead, sy = a[1];
  const ex = sx - c.x, ez = sz - c.z, err = Math.hypot(ex, ez);
  if (err > 2.5 || Math.abs(sy - c.y) > 1.2) { netCartSet(c, a, true); NET.snapsHard = (NET.snapsHard || 0) + 1; return; }
  const k = err > 0.6 ? 0.35 : 0.18;
  if (performance.now() - (NET.hitT || -1e9) < 200) { c.vx = a[6]; c.vz = a[8]; c.w = a[9]; }   // just got rammed: take the server's shove now
  c.x += ex * k; c.z += ez * k; c.y += (sy - c.y) * 0.25;
  c.vx += (a[6] - c.vx) * 0.4; c.vz += (a[8] - c.vz) * 0.4; c.vy += (a[7] - c.vy) * 0.3;
  c.yaw += wrapA(a[3] + a[9] * lead - c.yaw) * 0.25; c.w += (a[9] - c.w) * 0.4;
  c.pitch += (a[4] - c.pitch) * 0.3; c.roll += (a[5] - c.roll) * 0.3;
  netCartSet(c, a, false);
  NET.err = lerp(NET.err || 0, err, 0.1);
}

// opponent: render ~100 ms behind the newest snapshot, interpolating between the two that bracket that moment
function netInterpolate() {
  const S = NET.snaps; if (S.length < 1) return;
  const last = S[S.length - 1];
  const est = last.t + (performance.now() - last.recv) / 1000;
  const rt = est - NET.interp;
  let a = S[0], b = S[0];
  for (let i = S.length - 1; i >= 0; i--) { if (S[i].t <= rt) { a = S[i]; b = S[Math.min(i + 1, S.length - 1)]; break; } }
  const f = b.t > a.t ? clamp((rt - a.t) / (b.t - a.t), 0, 1.2) : 0;
  GAME.carts.forEach((c, i) => {
    if (c === GAME.player || !a.carts[i] || !b.carts[i]) return;
    const A = a.carts[i], B = b.carts[i];
    if (A[13] !== 0 || B[13] !== 0 || Math.hypot(B[0] - A[0], B[2] - A[2]) > 4) { if (B[13] === 0 && c.state === 'drive') { c.x = B[0]; c.y = B[1]; c.z = B[2]; c.yaw = B[3]; c.pitch = B[4]; c.roll = B[5]; } return; }
    c.x = lerp(A[0], B[0], f); c.y = lerp(A[1], B[1], f); c.z = lerp(A[2], B[2], f);
    c.yaw = A[3] + wrapA(B[3] - A[3]) * f; c.pitch = lerp(A[4], B[4], f); c.roll = lerp(A[5], B[5], f);
    c.vx = lerp(A[6], B[6], f); c.vy = lerp(A[7], B[7], f); c.vz = lerp(A[8], B[8], f); c.w = B[9];
    c.delta = lerp(A[10], B[10], f); c.steer = c.delta; c.squash = lerp(A[25], B[25], f); c.lean = lerp(A[28], B[28], f);
    c.onGround = !!B[23]; c.airT = B[29];
  });
}

// server events -> the game's normal effects pipeline
function netEvent(e) {
  const C = GAME.carts, cart = i => (i === undefined || i === null || i < 0) ? null : C[i] || null;
  const o = Object.assign({}, e);
  for (const k of ['c', 'a', 'b', 'by']) if (k in e) o[k] = cart(e[k]);
  if ('st' in e && e.t === 'hitStatic') o.s = STATICS[e.st];
  switch (e.t) {
    case 'ko': {
      const c = o.c; if (!c) return;
      const ks = e.ks; if (ks) { c.x = ks[0]; c.y = ks[1]; c.z = ks[2]; c.vx = ks[3]; c.vy = ks[4]; c.vz = ks[5]; c.yaw = ks[6]; c.pitch = ks[7]; c.roll = ks[8]; c.w = ks[9]; c.input.steer = ks[10]; c.braking = !!ks[11]; c.lean = ks[12]; }
      const info = e.info ? { x: e.info.x, z: e.info.z, nx: e.info.nx, nz: e.info.nz, st: e.info.st >= 0 ? STATICS[e.info.st] : undefined } : { x: c.x, z: c.z };
      c.state = 'drive'; c.lastHit = { by: o.by, t: GAME.now };
      const mode = GAME.mode; if (mode === 'end') GAME.mode = 'play';
      const n0 = GAME.events.length;
      _knockOut(c, e.kind, info);          // wreck, ragdoll, groceries, callout, feed, scoring text
      for (const q of GAME.events.splice(n0)) netQueue(q);
      GAME.mode = mode; GAME.slowT = 0;    // no local slow-mo online: the server clock keeps running
      return;
    }
    case 'respawn': { const c = o.c; if (!c) return; GAME.doors[e.door] = 1.6; if (c.ragdoll) c.ragdoll.fade = 0.999; netQueue(o); return; }
    case 'item': {
      const c = o.c; if (!c) return;
      if (e.it === 'melon') AUD.whoosh(c, 0.6); else if (e.it === 'banana') AUD.plop(c); else if (e.it === 'blower') AUD.blower(c); else if (e.it === 'mega') AUD.mega(c);
      return;
    }
    case 'land': { const c = o.c; if (!c) return; c.rampFrom = null; netQueue(o);
      if (e.clear) { feed(`${c.name} cleared the duck pond!`); if (c.isPlayer || c === camTargetCart()) callout('CLEARANCE!', `${(+e.air).toFixed(1)} s of air over the pond`, 1); AUD.cheer(); }
      return; }
    case 'go': GAME.playT = 0; AUD.go(); return;
    case 'lastCart': if (o.c) feed(`${o.c.name} is the last cart rolling! +2`); return;
    case 'forfeit': if (o.c) feed(`${o.c.name} left the room.`, true); return;
    case 'end': return;
    case 'bump': case 'vault': case 'cartHit': case 'hitStatic': case 'pickup': case 'slip': case 'melonHit': case 'melonSplat':
    case 'sampleUp': case 'sample': case 'overheat':
      if ((e.t === 'hitStatic' && !o.s) || ((e.t === 'cartHit') && (!o.a || !o.b))) return;
      if (e.t === 'cartHit' && (o.a === GAME.player || o.b === GAME.player)) NET.hitT = performance.now();
      netQueue(o); return;
  }
}
function netQueue(o) { (NET.evq || (NET.evq = [])).push(o); }

// ---------- per-frame / per-step while online ----------
function netPhysicsStep(dt) {
  GAME.now += dt; const now = GAME.now;
  const p = GAME.player;
  // predict our own cart with the shared physics; the server's version of every event replaces the local ones
  if (p && p.state === 'drive' && (GAME.mode === 'play' || GAME.mode === 'countdown' || GAME.mode === 'end')) {
    if (GAME.mode !== 'play') { p.input.throttle = 0; p.input.boost = 0; }
    cartStep(p, dt, now); if (p.state === 'drive') collideStatics(p, now);
  }
  GAME.events.length = 0;
  for (const m of GAME.melons) { m.vy -= G * dt; m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt; m.spin += dt * 9; }
  for (const pd of GAME.puddles) pd.t += dt;
  // cosmetic world: props get knocked about by whoever drives through them
  for (const c of GAME.carts) {
    if (c.state !== 'drive') continue;
    if (c.blowerT > 0) { c.blowT = 0.05; const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); for (const d of GAME.props) { const dx = d.x - c.x, dz = d.z - c.z, dd = Math.hypot(dx, dz); if (dd < 16 && (dx * fx + dz * fz) / (dd || 1) > 0.78) { d.rest = false; d.vx += dx / dd * 8 * dt; d.vz += dz / dd * 8 * dt; d.vy += 3 * dt; d.av = 6; } } }
    for (const d of GAME.props) {
      const dx = d.x - c.x, dz = d.z - c.z; if (dx * dx + dz * dz > 0.8 || Math.abs(d.y - c.y) > 1) continue;
      const sp = c.speed(); if (sp < 0.8 && d.rest) continue;
      d.rest = false; d.vx = c.vx * 1.2 + dx * 2; d.vz = c.vz * 1.2 + dz * 2; d.vy = 1.5 + sp * 0.25; d.av = F1(6, 14);
      GAME.events.push({ t: 'prop', c, d });
    }
  }
  for (const r of GAME.ragdolls) r.step(dt);
  for (const w of GAME.wrecks) w.step(dt);
  GAME.wrecks = GAME.wrecks.filter(w => w.c.state === 'ko' || w.t < 0.1);
  for (const d of GAME.debris) d.step(dt);
  GAME.debris = GAME.debris.filter(d => d.t < d.life);
  for (const d of GAME.props) d.step(dt);
  for (let i = 0; i < 3; i++) GAME.doors[i] = Math.max(0, GAME.doors[i] - dt);
  stepDucks(dt);
  for (const q of PARKED) q.alarm = Math.max(0, q.alarm - dt);
  if (NET.evq && NET.evq.length) { GAME.events.push(...NET.evq); NET.evq.length = 0; }
  processEvents();
}

function netTick(realDt) {
  // the server clock never waits for a slow frame: step the local prediction by real elapsed time, not the frame cap
  const wall = performance.now(); const wallDt = NET.lastWall ? Math.min(0.25, (wall - NET.lastWall) / 1000) : realDt; NET.lastWall = wall;
  NET.frames = (NET.frames || 0) + 1;
  realDt = Math.max(realDt, wallDt);
  const pin = INPUT.poll(realDt);
  const p = GAME.player;
  if (p && p.state === 'drive' && SET.assist && INPUT.touchOn) Object.assign(pin, smartSteer(p, pin));
  const live = GAME.mode === 'play';
  if (pin.item && live && p && p.state === 'drive') NET.itemCount++;
  const q = v => Math.round(v * 20) / 20;
  const inp = { t: 'in', th: live ? q(pin.throttle) : 0, st: q(pin.steer), br: pin.brake ? 1 : 0, bo: live && pin.boost ? 1 : 0, it: NET.itemCount };
  if (p) { p.input.throttle = inp.th; p.input.steer = inp.st; p.input.brake = inp.br; p.input.boost = inp.bo; }
  // send on change (at most 20/s) plus a 4/s heartbeat: few messages keeps a room well inside the Workers Free quota
  NET.sendT -= realDt; NET.heartbeat -= realDt;
  const key = inp.th + ',' + inp.st + ',' + inp.br + ',' + inp.bo + ',' + inp.it;
  if ((key !== NET.lastSent && NET.sendT <= 0) || NET.heartbeat <= 0 || inp.it !== NET.lastIt) {
    if (netSend(inp)) { NET.lastSent = key; NET.lastIt = inp.it; NET.sendT = 0.05; NET.heartbeat = 0.25; NET.stats.inputs++; }
  }
  NET.pingT -= realDt; if (NET.pingT <= 0) { NET.pingT = 2; netSend({ t: 'ping', c: performance.now() }); }
  if (GAME.mode === 'play') GAME.playT += realDt;
  advanceSim(realDt);
  netInterpolate();
  GAME.callT = Math.max(0, GAME.callT - realDt);
  if (GAME.callT <= 0 && GAME.callQ.length) { const [m, s] = GAME.callQ.shift(); showCallout(m, s); }
  if (GAME.mode === 'play') { GAME.paT -= realDt; if (GAME.paT <= 0) { GAME.paT = R1(35, 60); feed(pick(PA_LINES), true); } }
  updateCamera(realDt);
  HUD.update(realDt);
  AUD.update(realDt);
}

// ---------- hooks into the local game (function declarations are plain globals, so they can be wrapped) ----------
const _tick = tick, _physicsStep = physicsStep, _knockOut = knockOut, _startGame = startGame, _toTitle = toTitle, _setPause = setPause, _boot = boot, _respawn = respawn, _useItem = useItem;
tick = function (dt) { return NET.inMatch ? netTick(dt) : _tick(dt); };
physicsStep = function (dt) { return NET.inMatch ? netPhysicsStep(dt) : _physicsStep(dt); };
knockOut = function (c, kind, info) { if (NET.inMatch) return; return _knockOut(c, kind, info); };   // the server decides wipeouts
respawn = function (c) { if (NET.inMatch) return; return _respawn(c); };
useItem = function (c, now) { if (NET.inMatch) return; return _useItem(c, now); };
startGame = function () { if (NET.active) return; return _startGame(); };       // R / PLAY AGAIN do nothing online
toTitle = function () { if (NET.active) return netLeave(true); return _toTitle(); };
setPause = function (on) {
  if (!NET.inMatch) return _setPause(on);
  if (on && GAME.netPaused) on = false;   // Esc / pause button toggle
  // the match can't be paused online: show the settings panel over the running game
  $id('pause').classList.toggle('hidden', !on || GAME.mode === 'end');
  $id('restart').style.display = 'none'; $id('quit').textContent = 'Leave room';
  GAME.netPaused = !!on;
};
boot = function () { _boot(); netInitUI(); };
window.NET = NET;
