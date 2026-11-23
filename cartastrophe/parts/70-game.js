// ---------- game state, items, wipeouts, camera, rendering, HUD, input ----------
const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const SETTINGS_DEF = { opp: 3, lives: 3, ai: 'normal', quality: 'high', sound: true, muzak: true, voice: true, touch: 'auto', rider: 0, steer: 'stick', autorocket: false, assist: true, lefty: false, ctlv: 2 };
let SET = { ...SETTINGS_DEF };
try { const s = JSON.parse(localStorage.getItem('cartastrophe.settings') || '{}'); SET = { ...SET, ...s }; } catch (e) { }
// controls v2: the floating joystick replaced auto rocket as the touch default
if (SET.ctlv !== 2) { SET.steer = 'stick'; SET.autorocket = false; SET.ctlv = 2; }
if (QS.get('q')) SET.quality = QS.get('q');
function saveSettings() { try { localStorage.setItem('cartastrophe.settings', JSON.stringify(SET)); } catch (e) { } }

const ITEMS = {
  melon: { icon: '🍉', name: 'WATERMELONS', w: 3 }, banana: { icon: '🍌', name: 'BANANAS', w: 3 },
  blower: { icon: '💨', name: 'LEAF BLOWER', w: 2.5 }, mega: { icon: '🚀', name: 'MEGA ROCKET', w: 2.5 }
};
const KO_TEXT = { store: 'STORE CLOSED!', wall: 'WALLED!', dock: 'DOCKED!', car: 'PARKED!', pole: 'LAMPPOSTED!', corral: 'RETURNED!', dumpster: 'TRASHED!', bollard: 'BOLLARDED!', fence: 'FENCED!', pond: 'SPLASHDOWN!', cliff: 'CLIFFED!', flop: 'BELLY FLOP!' };
const KO_WHERE = { store: 'the store', wall: 'a wall', dock: 'the loading dock', car: 'a parked car', pole: 'a lamp post', corral: 'the cart corral', dumpster: 'a dumpster', bollard: 'a bollard', fence: 'the fence', pond: 'the duck pond', cliff: 'the cliff', flop: 'a bad landing' };
const PA_LINES = ['Attention shoppers: the duck pond is not a car wash.', 'Cleanup on aisle seven. And the parking lot. Mostly the parking lot.', 'Attention shoppers: rockets are not permitted inside the store.', 'Would the owner of the red sedan please check on their car alarm.',
  'Reminder: carts must be returned to the corral. Preferably slowly.', 'Today only: bananas, two for one. Please stop throwing them.', 'Attention shoppers: the cliff is not a shortcut.', 'Lost and found now holds 14 helmets, mostly colanders.'];

const GAME = {
  mode: 'title', carts: [], ais: [], ragdolls: [], wrecks: [], debris: [], props: [], peels: [], melons: [], pickups: [], ducks: [], events: [],
  now: 0, timer: 240, acc: 0, timeScale: 1, slowT: 0, shake: 0, countT: 0, endT: -1, player: null, spectate: 0, camMode: 0, doors: [0, 0, 0],
  callQ: [], callT: 0, feed: [], paT: 25, attractT: 0, attractTarget: 0, ff: false, alarm: 0, lastAisle: 3, matchId: 0, koLog: []
};

// ---------- match setup ----------
function newMatch(attract) {
  GAME.matchId++;
  grng = mulberry32((Number(QS.get('seed')) || 1) * 7919 + GAME.matchId * 104729 + (TEST ? 0 : (Date.now() & 0xffff)));
  GAME.carts = []; GAME.ais = []; GAME.ragdolls = []; GAME.wrecks = []; GAME.debris = []; GAME.peels = []; GAME.melons = []; GAME.events = []; GAME.koLog = [];
  PS.length = 0; GAME.callQ = []; GAME.feed = []; GAME.ff = false;
  const fd = document.getElementById('feed'); if (fd) fd.innerHTML = '';
  const n = attract ? 6 : 1 + clamp(SET.opp, 1, 5);
  const riders = [];
  const pr = attract ? -1 : SET.rider;
  if (pr >= 0) riders.push(pr);
  const rest = [0, 1, 2, 3, 4, 5].filter(i => i !== pr);
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(grng() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  while (riders.length < n) riders.push(rest.shift());
  const spots = START_SPOTS.slice();
  for (let i = 0; i < n; i++) {
    const c = new Cart(i, RIDERS[riders[i]], !attract && i === 0);
    c.lives = attract ? 99 : (SET.lives || 9999);
    const [x, z, yaw] = spots[i]; c.reset(x, z, yaw);
    GAME.carts.push(c);
    if (!c.isPlayer || QS.has('auto')) GAME.ais.push(new AI(c, attract ? 'normal' : SET.ai));
  }
  GAME.player = attract ? null : GAME.carts[0];
  GAME.spectate = 0;
  GAME.now = 0; GAME.timer = attract ? 9999 : (SET.lives ? 240 : 180); GAME.endT = -1; GAME.timeScale = 1; GAME.slowT = 0;
  GAME.puddles = []; GAME.sample = { active: false, t: R1(12, 25), x: 0, y: 0, z: 0 }; GAME.sampleClaim = null; GAME.lastStanding = null;
  GAME.startLives = SET.lives || 9999;
  GAME.countT = attract ? 0 : 3.2;
  GAME.mode = attract ? 'title' : 'countdown';
  GAME.pickups = PICKUP_SPOTS.map(([x, z]) => ({ x, z, active: true, t: 0 }));
  // dynamic props
  GAME.props = [];
  for (const [x, z] of CONE_SPOTS) { const d = new Debris(MESH.cone, x, groundH(x, z), z, 0, 0, 0, null, 1e9, 0.0); d.B = r3Y(F1(0, TAU)); d.av = 0; d.rest = true; d.persist = true; d.prop = 'cone'; d.rad = 0.0; GAME.props.push(d); }
  for (let k = 0; k < 7; k++) { const x = -35.6 + (k % 3) * 0.55, z = 18.5 + Math.floor(k / 3) * 0.5, y = (k > 5 ? 0.4 : 0) + 0.2; const d = new Debris(MESH.cbox, x, y, z, 0, 0, 0, null, 1e9, 0.2); d.B = r3Y(F1(-0.2, 0.2)); d.av = 0; d.rest = true; d.persist = true; d.prop = 'box'; GAME.props.push(d); }
  GAME.ducks = [];
  for (let k = 0; k < 4; k++) { const a = k * 1.7; GAME.ducks.push({ x: POND.x + Math.cos(a) * 4, z: POND.z + Math.sin(a) * 4, y: WATER_Y, yaw: F1(0, TAU), vx: 0, vz: 0, vy: 0, mode: 'swim', t: 0, quackT: F1(2, 9) }); }
  for (const p of PARKED) p.alarm = 0;
  if (!attract) { feed('Attention shoppers: rocket cart demolition is now open in the parking lot.', true); AUD.pa(); }
  HUD.build();
}

function pickItem() { let tot = 0; for (const k in ITEMS) tot += ITEMS[k].w; let r = R1(0, tot); for (const k in ITEMS) { r -= ITEMS[k].w; if (r <= 0) return k; } return 'melon'; }

function useItem(c, now) {
  const it = c.item; if (!it) return;
  if (now - (c.itemT || -9) < 0.45) return;
  c.itemT = now;
  c.itemN = (c.itemN || 1) - 1; if (c.itemN <= 0) { c.item = null; c.itemN = 0; }
  c.stats.items++;
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  if (it === 'melon') {
    // aim assist: lob at the best cart in front (with lead), otherwise a flat forward lob
    let tgt = null, best = 1e9;
    for (const o of GAME.carts) {
      if (o === c || o.state !== 'drive' || o.ghostT > 0) continue;
      const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz); if (d < 2.5 || d > 32) continue;
      const a = Math.acos(clamp((dx * fx + dz * fz) / d, -1, 1)); if (a > 0.5) continue;
      const sc = d * (1 + a * 2.5); if (sc < best) { best = sc; tgt = o; }
    }
    const y0 = c.y + 1.15, hs = Math.max(8, c.vx * fx + c.vz * fz) + 17;
    let dirx = fx, dirz = fz, vy = 2.6;
    if (tgt) {
      let d = Math.hypot(tgt.x - c.x, tgt.z - c.z), T = d / hs;
      const lx = tgt.x + tgt.vx * T, lz = tgt.z + tgt.vz * T; d = Math.hypot(lx - c.x, lz - c.z); T = d / hs;
      dirx = (lx - c.x) / d; dirz = (lz - c.z) / d;
      vy = clamp((tgt.y + 0.7 - y0 + 0.5 * G * T * T) / T, 0.5, 9);
    }
    GAME.melons.push({ x: c.x + fx * 0.8, y: y0, z: c.z + fz * 0.8, vx: dirx * hs, vy, vz: dirz * hs, owner: c, t: 0, spin: 0, tgt });
    AUD.whoosh(c, 0.6);
  } else if (it === 'banana') {
    const rx = -fz, rz = fx;
    for (const o of [-0.9, 0, 0.9]) GAME.peels.push({ x: c.x - fx * 1.2 + rx * o, z: c.z - fz * 1.2 + rz * o, yaw: F1(0, TAU), owner: c, t: 0 });
    while (GAME.peels.length > 15) GAME.peels.shift();
    AUD.plop(c);
  } else if (it === 'blower') { c.blowerT = 3.0; AUD.blower(c); }
  else if (it === 'mega') { c.megaT = 2.2; c.overT = 0; c.heat = 0; AUD.mega(c); }
  GAME.events.push({ t: 'item', c, it });
}

function melonBoom(m, hit, now) {
  const R = 4.2; const hs = Math.hypot(m.vx, m.vz) || 1;
  let n = 0;
  for (const o of GAME.carts) {
    if (o.state !== 'drive' || o.ghostT > 0) continue;
    const direct = hit.c === o;
    let dx = o.x - m.x, dz = o.z - m.z; const d = Math.hypot(dx, dz);
    if (!direct && (d > R || Math.abs(o.y - m.y) > 2.5)) continue;
    if (direct || d < 0.3) { dx = m.vx / hs; dz = m.vz / hs; } else { dx /= d; dz /= d; }
    const k = (direct ? 12 : 0) + 9 * (1 - Math.min(d, R) / R);
    const sc = k * 80 / o.mass;
    o.vx += dx * sc; o.vz += dz * sc; o.w += (R1() < 0.5 ? -1 : 1) * R1(3, 7) * (direct ? 1.5 : 1);
    o.spinT = Math.max(o.spinT, direct ? 1.2 : 0.6);
    if (direct && o.onGround) { o.onGround = false; o.vy = 3.2; o.airT = 0; o.rollW += R1(-1.5, 1.5); }
    if (o !== m.owner) o.lastHit = { by: m.owner, t: now };
    n++;
  }
  const gy = hit.c ? hit.c.y : (m.x > CLIFF_X ? LAKE_Y : groundH(m.x, m.z));
  if (!hit.water && m.x < CLIFF_X) GAME.puddles.push({ x: hit.c ? hit.c.x : m.x, z: hit.c ? hit.c.z : m.z, r: 2.1, t: 0, life: 20, owner: m.owner, yaw: R1(0, TAU) });
  while (GAME.puddles.length > 8) GAME.puddles.shift();
  GAME.events.push({ t: hit.c ? 'melonHit' : 'melonSplat', c: hit.c, by: m.owner, x: m.x, y: Math.max(m.y, gy + 0.2), z: m.z, water: hit.water, n });
}

// ---------- wipeouts ----------
function knockOut(c, kind, info) {
  if (c.state !== 'drive') return;
  if (GAME.mode === 'end') return; // the match is over: carts coasting into things after the whistle don't count
  const now = GAME.now;
  c.state = 'ko'; c.koT = 0; c.koKind = kind;
  if (GAME.mode !== 'title') c.lives--;
  c.stats.deaths++;
  let by = (now - c.lastHit.t < CREDIT_WINDOW) ? c.lastHit.by : null;
  if (by === c) by = null;
  const final = c.lives <= 0 && GAME.mode !== 'title';
  // scoring: takedowns win games, not hiding. +1 takedown, +1 more for knocking someone out of the match, -1 self-checkout
  if (by) { by.stats.wipeouts++; by.stats.points++; if (final) { by.stats.finals++; by.stats.points++; } } else { c.stats.self++; c.stats.points--; }
  const bogo = by && now - by.lastScoreT < 6;
  if (by) by.lastScoreT = now;
  GAME.koLog.push({ t: now, victim: c.name, by: by ? by.name : null, kind });
  // the wreck and the flying rider
  const w = new Wreck(c); GAME.wrecks.push(w);
  const B = c.basis();
  const P = riderLocal(c, now).map(p => localToWorld(c, B, p));
  let kx = c.vx, ky = 0, kz = c.vz;
  if (kind === 'pond') { ky = 1.5; }
  else if (kind === 'cliff') { ky = 2.5; kx += 2; }
  else if (kind === 'flop') { ky = 3; }
  else { ky = 3.2 + c.speed() * 0.15; kx *= 1.1; kz *= 1.1; }
  if (info && info.nx !== undefined) { w.vx = info.nx * 2.5 + c.vx * 0.15; w.vz = info.nz * 2.5 + c.vz * 0.15; w.vy = 2.5; w.wx = F1(-6, 6); w.wz = F1(-6, 6); }
  const vel = P.map((p, i) => [kx * (i === 0 ? 1.15 : 1) + F1(-1, 1), ky + (i < 2 ? 1.2 : 0) + F1(-0.5, 0.5), kz * (i === 0 ? 1.15 : 1) + F1(-1, 1)]);
  const rd = new Ragdoll(P, vel, c); GAME.ragdolls.push(rd); c.ragdoll = rd;
  while (GAME.ragdolls.length > 8) GAME.ragdolls.shift();
  // groceries everywhere
  const gm = [MESH.g_cereal, MESH.g_baguette, MESH.g_apple, MESH.g_milk, MESH.g_banana, MESH.g_apple];
  const tints = [[0.9, 0.3, 0.2], [1, 1, 1], [0.8, 0.1, 0.1], [1, 1, 1], [1, 1, 1], [0.4, 0.8, 0.2]];
  for (let i = 0; i < 7; i++) { const k = i % gm.length; GAME.debris.push(new Debris(gm[k], c.x + F1(-0.3, 0.3), c.y + 0.5, c.z + F1(-0.3, 0.3), c.vx * 0.7 + F1(-3, 3), F1(3, 7), c.vz * 0.7 + F1(-3, 3), tints[k], 10, 0.07)); }
  while (GAME.debris.length > 90) GAME.debris.shift();
  // text
  let main = KO_TEXT[kind] || 'WIPEOUT!';
  const playerInv = c.isPlayer || by === GAME.player;
  let sub;
  if (by) sub = `${by.name} ➜ ${c.name}`;
  else { sub = `${c.name}: self-checkout (${KO_WHERE[kind]})`; if (c.isPlayer) main = 'SELF-CHECKOUT!'; }
  if (bogo) { main = 'BOGO!'; sub = `${by.name}: buy one, get one`; }
  if (final && by) { sub += '  ·  FINAL TAKEDOWN +2'; }
  else if (by) sub += '  ·  +1';
  feed(by ? `${by.name} ➜ ${c.name} · ${KO_TEXT[kind]}` : `${c.name} · SELF-CHECKOUT (${KO_WHERE[kind]})`);
  const focus = camTargetCart();
  const near = focus && Math.hypot(focus.x - c.x, focus.z - c.z) < 22;
  if (playerInv || near || GAME.mode === 'title') callout(main, sub, playerInv ? 2 : 1);
  if (by === GAME.player && R1() < 0.35) { GAME.lastAisle = 1 + Math.floor(R1(0, 12)); feed(`Cleanup on aisle ${GAME.lastAisle}.`, true); }
  if (playerInv && GAME.mode === 'play') { GAME.slowT = 0.75; }
  if (c.lives <= 0 && GAME.mode !== 'title') { c.out = true; feed(`${c.name} is out of the store!`); }
  GAME.events.push({ t: 'ko', c, by, kind, info });
}

function respawn(c) {
  // choose a store door with nobody in front of it
  const order = DOORS.map((d, i) => i).sort(() => R1() - 0.5);
  let di = order[0];
  for (const i of order) { const x = DOORS[i]; if (!GAME.carts.some(o => o !== c && o.state === 'drive' && Math.hypot(o.x - x, o.z - 29.3) < 4.5)) { di = i; break; } }
  c.reset(DOORS[di], 29.4, Math.PI);
  c.ghostT = 2.4; c.vz = -3.0; c.item = c.item || null;
  GAME.doors[di] = 1.6;
  if (c.ragdoll) c.ragdoll.fade = 0.999;
  GAME.events.push({ t: 'respawn', c, door: di });
}

// ---------- fixed physics step ----------
function physicsStep(dt) {
  GAME.now += dt; const now = GAME.now;
  const carts = GAME.carts;
  const live = GAME.mode === 'play' || GAME.mode === 'title';
  if (!GAME.noAI) for (const ai of GAME.ais) ai.update(dt, now, carts);
  if (!live) for (const c of carts) { c.input.throttle = 0; c.input.boost = 0; }
  for (const c of carts) if (c.state === 'drive') cartStep(c, dt, now);
  for (let it = 0; it < 2; it++) for (let i = 0; i < carts.length; i++) for (let j = i + 1; j < carts.length; j++) {
    const a = carts[i], b = carts[j]; if (a.state === 'drive' && b.state === 'drive') collideCarts(a, b, now);
  }
  for (const c of carts) if (c.state === 'drive') collideStatics(c, now);
  for (const c of carts) {
    if (c.state === 'drive') {
      // pickups
      if (!c.item) for (const p of GAME.pickups) if (p.active && Math.hypot(p.x - c.x, p.z - c.z) < 1.2) { p.active = false; p.t = 10; c.item = pickItem(); c.itemN = c.item === 'melon' ? 2 : 1; GAME.events.push({ t: 'pickup', c, it: c.item }); break; }
      // banana peels
      if (c.ghostT <= 0) for (let i = GAME.peels.length - 1; i >= 0; i--) {
        const p = GAME.peels[i]; if (p.t < 0.4 && p.owner === c) continue;
        if (Math.hypot(p.x - c.x, p.z - c.z) < 0.65 && c.onGround) {
          GAME.peels.splice(i, 1); c.spinT = 1.5; c.w += (R1() < 0.5 ? -1 : 1) * R1(5, 8);
          if (p.owner !== c) c.lastHit = { by: p.owner, t: now };
          GAME.events.push({ t: 'slip', c });
        }
      }
      // leaf blower
      if (c.blowerT > 0) {
        c.blowerT -= dt; c.blowT = 0.05;
        const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
        for (const o of carts) {
          if (o === c || o.state !== 'drive' || o.ghostT > 0) continue;
          const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz); if (d > 20 || d < 0.3) continue;
          const cosA = (dx * fx + dz * fz) / d; if (cosA < 0.78) continue;   // ~39 degree half-angle cone
          // strong gust: falls off gently with range, still decent at the cone edge, and the victim's tyres lose grip
          const f = 4200 * Math.sqrt(1 - d / 20) * (0.45 + 0.55 * (cosA - 0.78) / 0.22);
          o.vx += dx / d * f * o.inv * dt; o.vz += dz / d * f * o.inv * dt;
          o.blownT = 0.25;
          o.lastHit = { by: c, t: now };
        }
        for (const d of GAME.props) { const dx = d.x - c.x, dz = d.z - c.z, dd = Math.hypot(dx, dz); if (dd < 16 && (dx * fx + dz * fz) / (dd || 1) > 0.78) { d.rest = false; d.vx += dx / dd * 8 * dt; d.vz += dz / dd * 8 * dt; d.vy += 3 * dt; d.av = 6; } }
      }
      // knock props
      for (const d of GAME.props) {
        const dx = d.x - c.x, dz = d.z - c.z; if (dx * dx + dz * dz > 0.8 || Math.abs(d.y - c.y) > 1) continue;
        const sp = c.speed(); if (sp < 0.8 && d.rest) continue;
        d.rest = false; d.vx = c.vx * 1.2 + dx * 2; d.vz = c.vz * 1.2 + dz * 2; d.vy = 1.5 + sp * 0.25; d.av = F1(6, 14);
        if (d.prop === 'box') { c.vx *= 0.92; c.vz *= 0.92; }
        GAME.events.push({ t: 'prop', c, d });
      }
    } else if (c.state === 'ko') {
      c.koT += dt;
      if (c.koT > 3.0) { if (c.out) { c.state = 'out'; } else respawn(c); }
    }
  }
  // melons in flight: gentle homing, then a juicy explosion on any impact
  for (let i = GAME.melons.length - 1; i >= 0; i--) {
    const m = GAME.melons[i]; m.t += dt;
    if (m.tgt && m.tgt.state === 'drive') {
      const hs = Math.hypot(m.vx, m.vz) || 1; const want = Math.atan2(m.tgt.x - m.x, m.tgt.z - m.z), cur = Math.atan2(m.vx, m.vz);
      const da = clamp(wrapA(want - cur), -1.3 * dt, 1.3 * dt); const na = cur + da; m.vx = Math.sin(na) * hs; m.vz = Math.cos(na) * hs;
    }
    m.vy -= G * dt; m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt; m.spin += dt * 9;
    let hit = null;
    for (const o of carts) {
      if (o === m.owner && m.t < 0.4) continue; if (o.state !== 'drive' || o.ghostT > 0) continue;
      if (Math.hypot(o.x - m.x, o.z - m.z) < 1.0 && m.y > o.y - 0.1 && m.y < o.y + 1.9) { hit = { c: o }; break; }
    }
    if (!hit) {
      const g = m.x > CLIFF_X ? LAKE_Y : groundH(m.x, m.z);
      if (m.y < g + 0.15) hit = { ground: true, water: pondSD(m.x, m.z) < 0 || m.x > CLIFF_X };
      else for (const st of STATICS) { if (m.y > st.y1) continue; if (staticClosest(st, m.x, m.z)[2] < 0.15) { hit = { wall: true }; break; } }
    }
    if (hit) { melonBoom(m, hit, now); GAME.melons.splice(i, 1); }
    else if (m.t > 6) GAME.melons.splice(i, 1);
  }
  // juice puddles: slick, spins carts out, counts as a shove by the thrower
  for (let i = GAME.puddles.length - 1; i >= 0; i--) { const pd = GAME.puddles[i]; pd.t += dt; if (pd.t > pd.life) GAME.puddles.splice(i, 1); }
  for (const c of carts) {
    if (c.state !== 'drive' || !c.onGround || c.ghostT > 0) continue;
    for (const pd of GAME.puddles) {
      if (Math.hypot(pd.x - c.x, pd.z - c.z) > pd.r) continue;
      if (now - (c.juiceT || -9) > 1.4) { c.juiceT = now; c.spinT = Math.max(c.spinT, 1.1); c.w += (R1() < 0.5 ? -1 : 1) * R1(4, 7); if (pd.owner !== c) c.lastHit = { by: pd.owner, t: now }; GAME.events.push({ t: 'slip', c, juice: true }); }
      else c.spinT = Math.max(c.spinT, 0.25);
      break;
    }
  }
  // free sample (extra life) floating over the duck pond: only a pond jump reaches it
  const S = GAME.sample;
  if (!S.active) {
    S.t -= dt;
    if (S.t <= 0) {
      S.active = true; S.z = R1(-10, -4.5); S.x = -12 + R1(-0.7, 0.7);
      S.y = lerp(3.0, 3.3, (-S.z - 4.5) / 5.5) + 0.7 + R1(-0.15, 0.15);
      GAME.events.push({ t: 'sampleUp' });
    }
  } else {
    for (const c of carts) {
      if (c.state !== 'drive') continue;
      if (Math.hypot(c.x - S.x, c.z - S.z) < 1.5 && Math.abs(c.y + 0.7 - S.y) < 1.1) {
        S.active = false; S.t = R1(25, 45); c.stats.samples = (c.stats.samples || 0) + 1;
        let gave = 'life';
        if (c.lives < GAME.startLives + 2 && GAME.mode !== 'title' && SET.lives) c.lives++;
        else { c.stats.points++; gave = 'point'; }
        GAME.events.push({ t: 'sample', c, gave, x: S.x, y: S.y, z: S.z });
        break;
      }
    }
  }
  for (const p of GAME.peels) p.t += dt;
  for (const p of GAME.pickups) if (!p.active) { p.t -= dt; if (p.t <= 0) p.active = true; }
  for (const r of GAME.ragdolls) r.step(dt);
  for (const w of GAME.wrecks) w.step(dt);
  GAME.wrecks = GAME.wrecks.filter(w => w.c.state === 'ko' || w.t < 0.1);
  for (const d of GAME.debris) d.step(dt);
  GAME.debris = GAME.debris.filter(d => d.t < d.life);
  for (const d of GAME.props) d.step(dt);
  for (let i = 0; i < 3; i++) GAME.doors[i] = Math.max(0, GAME.doors[i] - dt);
  stepDucks(dt);
  for (const p of PARKED) p.alarm = Math.max(0, p.alarm - dt);
  // match flow
  if (GAME.mode === 'play') {
    GAME.timer -= dt;
    const alive = carts.filter(c => !c.out);
    if (GAME.endT < 0 && ((SET.lives && alive.length <= 1) || GAME.timer <= 0)) {
      GAME.endT = 2.6;
      if (SET.lives && alive.length === 1 && GAME.timer > 0) { const w = alive[0]; w.stats.lastCart = 2; w.stats.points += 2; GAME.lastStanding = w; feed(`${w.name} is the last cart rolling! +2`); }
    }
  }
  if (GAME.endT > 0) { GAME.endT -= dt; if (GAME.endT <= 0) endMatch(); }
  if (GAME.mode === 'title') for (const c of carts) if (c.out) { c.out = false; c.lives = 99; }
  processEvents();
}

function stepDucks(dt) {
  for (const d of GAME.ducks) {
    d.t += dt;
    if (d.mode === 'swim') {
      let ax = 0, az = 0;
      for (const c of GAME.carts) { if (c.state !== 'drive') continue; const dx = d.x - c.x, dz = d.z - c.z, dd = Math.hypot(dx, dz); if (dd < 7) { ax += dx / dd * (7 - dd); az += dz / dd * (7 - dd); } }
      ax += Math.sin(d.t * 0.3 + d.yaw * 3) * 0.6; az += Math.cos(d.t * 0.23 + d.yaw) * 0.6;
      const sd = pondSD(d.x, d.z); if (sd > -1.4) { ax += (POND.x - d.x) * 0.5; az += (POND.z - d.z) * 0.5; }
      const fdx = d.x - POND.x, fdz = d.z - POND.z, fd = Math.hypot(fdx, fdz); if (fd < 1.8) { ax += fdx / fd * 2; az += fdz / fd * 2; }
      d.vx = damp(d.vx, clamp(ax, -1.2, 1.2), 2, dt); d.vz = damp(d.vz, clamp(az, -1.2, 1.2), 2, dt);
      d.x += d.vx * dt; d.z += d.vz * dt; d.y = WATER_Y + Math.sin(d.t * 2.2 + d.yaw) * 0.015;
      if (Math.hypot(d.vx, d.vz) > 0.1) d.yaw = Math.atan2(d.vx, d.vz);
      d.quackT -= dt; if (d.quackT <= 0) { d.quackT = R1(5, 16); GAME.events.push({ t: 'quack', d }); }
    } else if (d.mode === 'fly') {
      d.vy = Math.max(d.vy - dt * 1.2, 1.2); d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
      if (d.t > 9) { d.mode = 'swim'; d.t = 0; const a = R1(0, TAU); d.x = POND.x + Math.cos(a) * 3.5; d.z = POND.z + Math.sin(a) * 3.5; d.y = WATER_Y; d.vx = d.vz = 0; }
    }
  }
}
function scareDucks(x, z, r) {
  for (const d of GAME.ducks) if (d.mode === 'swim' && Math.hypot(d.x - x, d.z - z) < r) {
    d.mode = 'fly'; d.t = 0; const dx = d.x - x, dz = d.z - z, dd = Math.hypot(dx, dz) || 1; d.vx = dx / dd * 5; d.vz = dz / dd * 5; d.vy = 3.5; d.yaw = Math.atan2(d.vx, d.vz);
    GAME.events.push({ t: 'quack', d, loud: true });
  }
}

// ---------- events -> effects, sounds, text ----------
function processEvents() {
  const evs = GAME.events; GAME.events = [];
  const camC = camTargetCart();
  for (const e of evs) {
    switch (e.t) {
      case 'cartHit': {
        fxSparks(e.x, e.y + 0.4, e.z, Math.min(25, 4 + e.imp * 3));
        if ((e.a.isPlayer || e.b.isPlayer) && e.imp > 2) buzz(Math.min(60, 10 + e.imp * 6));
        AUD.clang(e.x, e.z, Math.min(1, e.imp / 6), 0.8 + F1(0, 0.4));
        if (e.imp > 4) shakeAt(e.x, e.z, e.imp * 0.05);
        break;
      }
      case 'hitStatic': {
        if (e.imp > 1.5) { fxSparks(e.x, e.c.y + 0.3, e.z, Math.min(18, e.imp * 2)); AUD.clang(e.x, e.z, Math.min(1, e.imp / 9), e.s.kind === 'car' ? 0.6 : 1); }
        if (e.s.kind === 'car' && e.imp > 2.5) carAlarm(e.s.car);
        break;
      }
      case 'bump': if (e.s > 2) AUD.clang(e.c.x, e.c.z, Math.min(1, e.s / 10), 0.5); break;
      case 'vault': fxSparks(e.x, 0.7, e.z, 14); AUD.clang(e.x, e.z, 0.8, 1.3); if (e.c.isPlayer) callout('UH OH', 'over the guard rail...', 1); break;
      case 'land': {
        fxDust(e.c.x, e.c.y, e.c.z, Math.min(14, 3 + e.impact * 1.5), 1);
        if (e.impact > 4) AUD.clang(e.c.x, e.c.z, Math.min(1, e.impact / 10), 0.7);
        if (e.air > 0.8 && e.c.rampFrom && e.c.rampFrom.name === 'pond' && e.c.z < -17.5 && e.c.airStartZ > -1 && e.c.state === 'drive') {
          e.c.stats.clears++; feed(`${e.c.name} cleared the duck pond!`);
          if (e.c.isPlayer || e.c === camC) callout('CLEARANCE!', `${e.air.toFixed(1)} s of air over the pond`, 1);
          AUD.cheer();
        } else if (e.c.isPlayer && e.air > 1.0) subText(`AIR TIME ${e.air.toFixed(1)} s`);
        e.c.rampFrom = null;
        break;
      }
      case 'ko': {
        const c = e.c, k = e.kind;
        if (k === 'pond') { fxSplash(c.x, c.z, 60, 1.5); scareDucks(c.x, c.z, 12); AUD.splash(c.x, c.z, 1); }
        else if (k === 'cliff') { AUD.fall(c.x, c.z); scareDucks(c.x, c.z, 4); }
        else {
          const x = e.info.x, z = e.info.z;
          fxSparks(x, c.y + 0.5, z, 40, e.info.nx || 0, e.info.nz || 0); fxDust(x, c.y, z, 12, 1.2);
          AUD.crash(x, z, 1);
          if (k === 'car' && e.info.st) carAlarm(e.info.st.car);
          if (k === 'pole') AUD.bong(x, z);
          shakeAt(x, z, 0.5);
        }
        AUD.scream(c);
        if (e.by && e.by.isPlayer) { AUD.score(); buzz([30, 40, 60]); }
        if (c.isPlayer) buzz(220);
        break;
      }
      case 'respawn': AUD.ding(DOORS[e.door], 31); if (e.c.isPlayer) subText('Back from the store. Go get them.'); break;
      case 'pickup': AUD.pickup(e.c); if (e.c.isPlayer) subText(`${ITEMS[e.it].icon}  ${ITEMS[e.it].name}`); break;
      case 'item': if (e.c.isPlayer || e.c === camC) { /* sound handled in useItem */ } break;
      case 'slip': AUD.slip(e.c); if (e.c.isPlayer) subText(e.juice ? 'JUICED!' : 'BANANA!'); break;
      case 'melonHit': fxMelon(e.x, e.y, e.z); fxMelon(e.x, e.y + 0.3, e.z); AUD.splat(e.x, e.z); shakeAt(e.x, e.z, 0.35);
        if (e.by && e.by.isPlayer) subText(e.n > 1 ? `DIRECT HIT! +${e.n - 1} SPLASHED` : 'DIRECT HIT!'); else if (e.c && e.c.isPlayer) { subText('MELONED!'); buzz(80); } break;
      case 'melonSplat': if (e.water) fxSplash(e.x, e.z, 20, 0.6); else { fxMelon(e.x, e.y, e.z); if (e.n && e.by && e.by.isPlayer) subText(`SPLASH DAMAGE x${e.n}`); } AUD.splat(e.x, e.z, 0.7); break;
      case 'sampleUp': feed('Free sample over the duck pond! Jump the pond ramp to grab an extra life.', true); AUD.ding(-12, -6); break;
      case 'sample': fxConfetti(e.x, e.y, e.z, 60); AUD.cheer(); AUD.pickup(e.c);
        feed(`${e.c.name} grabbed the free sample! ${e.gave === 'life' ? '+1 ♥' : '+1 ★'}`);
        if (e.c.isPlayer || e.c === camC) callout('FREE SAMPLE!', e.gave === 'life' ? `${e.c.name}: +1 life` : `${e.c.name}: +1 point (lives full)`, e.c.isPlayer ? 2 : 1);
        if (e.c.isPlayer) buzz(40);
        break;
      case 'prop': AUD.thunk(e.d.x, e.d.z, e.d.prop); break;
      case 'overheat': fxSmoke(e.c.x, e.c.y + 0.4, e.c.z, 0, 1, 0, 0.5, 1.5, 0.15, 0.8); AUD.sputter(e.c); if (e.c.isPlayer) subText('ROCKET OVERHEATED!'); break;
      case 'lakeSplash': fxSplash(e.x, e.z, 50, 2.0, LAKE_Y); AUD.splash(e.x, e.z, 0.7); break;
      case 'wreckBounce': if (e.s > 2.5) AUD.clang(e.w.x, e.w.z, Math.min(1, e.s / 8), 0.7); break;
      case 'quack': AUD.quack(e.d, e.loud); break;
    }
  }
}
function buzz(p) { if (!INPUT.touchOn || !navigator.vibrate) return; try { navigator.vibrate(p); } catch (e) { } }
function carAlarm(car) { if (!car) return; if (car.alarm <= 0) AUD.alarm(car); car.alarm = 4; }
function shakeAt(x, z, s) { const f = camTargetCart(); const d = f ? Math.hypot(f.x - x, f.z - z) : 10; GAME.shake = Math.min(1, GAME.shake + s / (1 + d * 0.15)); }

// ---------- text ----------
function callout(main, sub, prio = 1) {
  if (GAME.callT > 0.7 && prio < 2) { if (GAME.callQ.length < 2) GAME.callQ.push([main, sub]); return; }
  showCallout(main, sub);
}
function showCallout(main, sub) {
  const el = document.getElementById('callout'), se = document.getElementById('sub');
  el.textContent = main; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  se.textContent = sub || ''; se.classList.remove('pop'); void se.offsetWidth; se.classList.add('pop');
  GAME.callT = 1.9;
  AUD.say(main);
}
function subText(s) { const se = document.getElementById('sub'); if (GAME.callT > 0.3) return; se.textContent = s; se.classList.remove('pop'); void se.offsetWidth; se.classList.add('pop'); }
function feed(msg, pa) {
  const f = document.getElementById('feed'); if (!f) return;
  const d = document.createElement('div'); d.className = 'fd' + (pa ? ' pa' : ''); d.textContent = pa ? '📢 ' + msg : msg;
  f.appendChild(d); while (f.children.length > 5) f.removeChild(f.firstChild);
  setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, pa ? 7000 : 5500);
}

function endMatch() {
  if (GAME.mode !== 'play') return;
  GAME.mode = 'end';
  const carts = GAME.carts.slice().sort((a, b) => (b.stats.points - a.stats.points) || (b.stats.wipeouts - a.stats.wipeouts) || (b.lives - a.lives) || (a.stats.deaths - b.stats.deaths));
  const win = carts[0];
  if (win.state === 'drive') fxConfetti(win.x, win.y + 1.5, win.z, 120);
  AUD.cheer(); if (win.isPlayer) AUD.score();
  HUD.receipt(carts);
}

// ---------- per-frame effects (variable dt) ----------
function stepEffects(dt) {
  const q = QUAL.particles;
  for (const c of GAME.carts) {
    if (c.state !== 'drive') continue;
    const B = c.basis();
    const noz = localToWorld(c, B, [0, 0.33, -1.0]);
    const back = r3apply(B, 0, 0, -1);
    if (c.thrustNow > 1) {
      const hot = c.boosting; const n = (hot ? 2.2 : 1.1) * 60 * dt * q; const e = c.megaT > 0 ? 1.6 : 1;
      for (let i = 0; i < n; i++) {
        const sp = F1(4, 7) * e;
        fxFlame(noz[0] + F1(-0.03, 0.03), noz[1] + F1(-0.03, 0.03), noz[2] + F1(-0.03, 0.03), c.vx + back[0] * sp, back[1] * sp + F1(-0.3, 0.3), c.vz + back[2] * sp, (hot ? 0.22 : 0.16) * e, F1(0.06, 0.14), hot);
      }
      if (F1() < 25 * dt * q) fxSmoke(noz[0], noz[1], noz[2], c.vx * 0.3 + back[0] * 2, 0.4, c.vz * 0.3 + back[2] * 2, 0.25, F1(1.0, 2.0), 0.82, 0.32);
    } else if (c.overT > 0) {
      if (F1() < 18 * dt * q) fxSmoke(noz[0], noz[1], noz[2], back[0], 0.8, back[2], 0.25, 1.4, 0.12, 0.7);
      if (F1() < 3 * dt) { fxFlame(noz[0], noz[1], noz[2], back[0] * 3, 0.5, back[2] * 3, 0.35, 0.15, false); AUD.pop(c); }
    }
    const sp = c.speed();
    if (c.braking && sp > 2 && F1() < 22 * dt * q) { const f = localToWorld(c, B, [F1(-0.15, 0.15), 0.05, 0.75]); fxDust(f[0], f[1], f[2], 1, 0.6); }
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); const lat = Math.abs(c.vx * -fz + c.vz * fx);
    if (c.onGround && lat > 2.5 && F1() < lat * 4 * dt * q) { const f = localToWorld(c, B, [F1(-0.25, 0.25), 0.03, -0.35]); fxDust(f[0], f[1], f[2], 1, 0.5); }
    if (c.blowerT > 0) for (let k = 0; k < 2; k++) if (F1() < 40 * dt * q) {
      const m = localToWorld(c, B, [0.3, 1.0, 0.6]); const sa = F1(-0.6, 0.6), sp2 = F1(11, 18), ca = Math.cos(sa), sn = Math.sin(sa);
      const gx = fx * ca - fz * sn, gz = fz * ca + fx * sn;
      particle({ x: m[0], y: m[1], z: m[2], vx: c.vx + gx * sp2, vy: F1(-0.5, 1.2), vz: c.vz + gz * sp2, life: F1(0.5, 1.0), s0: 0.06, s1: 0.06, r: F1(0.6, 0.9), g: F1(0.4, 0.6), b: 0.15, a: 1, kind: 3, add: false, drag: 1.2, grav: 0.1, rot: F1(0, 6), rv: F1(-10, 10) });
      if (F1() < 0.5) fxSmoke(m[0], m[1], m[2], c.vx + fx * 8, 0.2, c.vz + fz * 8, 0.2, 0.8, 0.9, 0.2);
    }
    if (pondSD(c.x, c.z) < 0.4 && sp > 3 && c.onGround && F1() < 0.3) fxSplash(c.x, c.z, 2, 0.3);
  }
  for (const w of GAME.wrecks) {
    if (w.t < 3 && F1() < 14 * dt * q) fxSmoke(w.x, w.y + 0.2, w.z, 0, 0.6, 0, 0.3, 1.6, 0.18, 0.55);
  }
  // fountain
  if (F1() < 30 * dt * q) {
    const a = F1(0, TAU), r = F1(0.2, 0.9);
    particle({ x: POND.x, y: 0.95, z: POND.z, vx: Math.cos(a) * r, vy: F1(4.5, 5.6), vz: Math.sin(a) * r, life: 1.6, s0: 0.06, s1: 0.05, r: 0.88, g: 0.95, b: 1, a: 0.8, kind: 2, add: false, drag: 0.2, grav: 1, rot: 0, rv: 0, water: true });
  }
  stepParticles(dt);
  RND.time += dt;
}

// ---------- camera ----------
const CAM = { pos: [0, 30, -40], tgt: [0, 0, 0], yaw: 0, fov: 1.1, orbit: 0 };
function camTargetCart() {
  if (GAME.mode === 'title') return GAME.carts[GAME.attractTarget % Math.max(1, GAME.carts.length)] || null;
  const p = GAME.player;
  if (p && !p.out) return p;
  const alive = GAME.carts.filter(c => !c.out);
  if (!alive.length) return p;
  return alive[((GAME.spectate % alive.length) + alive.length) % alive.length];
}
function updateCamera(dt) {
  let c = camTargetCart();
  const asp = RND.w / RND.h;
  if (GAME.mode === 'title') {
    GAME.attractT += dt;
    if (GAME.attractT > 9) { GAME.attractT = 0; GAME.camAttract = (GAME.camAttract || 0) + 1; GAME.attractTarget = Math.floor(R1(0, 6)); }
    if ((GAME.camAttract || 0) % 2 === 0) {
      CAM.orbit += dt * 0.07;
      const r = 34, cx = 2, cz = 0;
      CAM.pos = [cx + Math.sin(CAM.orbit) * r, 14, cz + Math.cos(CAM.orbit) * r - 6]; CAM.tgt = [cx, 0, cz - 3]; CAM.fov = 0.95;
      glSetCamera(CAM.pos, CAM.tgt, CAM.fov, asp); return;
    }
  }
  if (!c) return;
  const following = c.state === 'drive' || !c.ragdoll;
  let fx = c.x, fy = c.y, fz = c.z;
  if (!following && c.ragdoll) { const p = c.ragdoll.p[8]; fx = p[0]; fy = p[1]; fz = p[2]; }
  const sp = c.state === 'drive' ? c.speed() : 0;
  if (c.state === 'drive') {
    let want = c.yaw;
    const vf = c.vx * Math.sin(c.yaw) + c.vz * Math.cos(c.yaw);
    if (sp > 4 && vf > 0) { const vy = Math.atan2(c.vx, c.vz); want = c.yaw + clamp(wrapA(vy - c.yaw), -0.6, 0.6) * 0.5; }
    CAM.yaw += wrapA(want - CAM.yaw) * Math.min(1, dt * (c.spinT > 0 ? 1.2 : 3.2));
  }
  let pos, tgt, fov;
  if (GAME.camMode === 1) {
    pos = [fx - Math.sin(CAM.yaw) * 13, fy + 17, fz - Math.cos(CAM.yaw) * 13]; tgt = [fx + Math.sin(CAM.yaw) * 3, fy, fz + Math.cos(CAM.yaw) * 3]; fov = 0.95;
  } else {
    const dist = 4.6 + sp * 0.07, h = 1.85 + sp * 0.025;
    if (following) {
      pos = [fx - Math.sin(CAM.yaw) * dist, fy + h, fz - Math.cos(CAM.yaw) * dist];
      tgt = [fx + Math.sin(CAM.yaw) * 2.2, fy + 0.85, fz + Math.cos(CAM.yaw) * 2.2];
    } else {
      // watch the wipeout: hold back and track the ragdoll
      pos = CAM.pos.slice();
      const dx = pos[0] - fx, dz = pos[2] - fz, d = Math.hypot(dx, dz) || 1;
      const want = clamp(d, 4, 9);
      pos[0] = fx + dx / d * want; pos[2] = fz + dz / d * want;
      pos[1] = Math.max(fy + 2.2, (fx > CLIFF_X ? 3 : groundH(pos[0], pos[2]) + 1.6));
      if (fx > CLIFF_X) { pos[0] = Math.min(pos[0], CLIFF_X - 1.5); pos[1] = 4.5; }
      tgt = [fx, fy + 0.3, fz];
    }
    fov = 1.08 + Math.min(0.32, sp * 0.016) + (c.boosting ? 0.05 : 0);
  }
  // keep the camera out of buildings
  pos[2] = Math.min(pos[2], STORE_Z - 0.4); pos[2] = Math.max(pos[2], SOUTH_Z + 0.3); pos[0] = Math.max(pos[0], WEST_X + 0.35);
  pos[1] = Math.max(pos[1], (pos[0] > CLIFF_X ? 2 : groundH(pos[0], pos[2])) + 0.5);
  // don't put the camera inside parked cars, dumpsters or corrals: lift it over them
  for (const st of STATICS) {
    if (st.y1 > 3.5 || st.kind === 'rail' || st.kind === 'fountain') continue;
    const d = staticClosest(st, pos[0], pos[2])[2];
    if (d < 0.35) pos[1] = Math.max(pos[1], st.y1 + 0.45 + (0.35 - d));
  }
  const k = GAME.camMode === 1 ? 4 : (following ? 9 : 3);
  for (let i = 0; i < 3; i++) { CAM.pos[i] = damp(CAM.pos[i], pos[i], k, dt); CAM.tgt[i] = damp(CAM.tgt[i], tgt[i], following ? 14 : 5, dt); }
  CAM.fov = damp(CAM.fov, fov, 3, dt);
  let p = CAM.pos.slice();
  if (GAME.shake > 0.001) { const s = GAME.shake * 0.25; p = [p[0] + F1(-s, s), p[1] + F1(-s, s), p[2] + F1(-s, s)]; GAME.shake = Math.max(0, GAME.shake - dt * 2.5); }
  glSetCamera(p, CAM.tgt, CAM.fov, asp);
}

// ---------- draw the dynamic scene ----------
const DECOR_CARTS = [];
function initDecor() {
  DECOR_CARTS.length = 0;
  for (let k = 0; k < 4; k++) DECOR_CARTS.push([CORRALS[0].x - 1.6 + k * 0.42, CORRALS[0].z, -Math.PI / 2, [0.8, 0.15, 0.12]]);
  for (let k = 0; k < 3; k++) DECOR_CARTS.push([CORRALS[1].x, CORRALS[1].z - 1.2 + k * 0.42, 0, [0.15, 0.3, 0.75]]);
}
const M_A = new Float32Array(16);
function limb(a, b, r, col, alpha) { m4between(M_A, a[0], a[1], a[2], b[0], b[1], b[2], r); glPush(MESH.cyl, M_A, col[0], col[1], col[2], alpha); }
function ball(p, r, col, alpha, sy = 1) { M_A.fill(0); M_A[0] = r; M_A[5] = r * sy; M_A[10] = r; M_A[12] = p[0]; M_A[13] = p[1]; M_A[14] = p[2]; M_A[15] = 1; glPush(MESH.sph, M_A, col[0], col[1], col[2], alpha); }
function drawRider(c, P, scream, alpha) {
  const shirt = c.col, skin = c.skin, pants = c.pants;
  limb(P[8], P[1], 0.135, shirt, alpha); ball(P[1], 0.13, shirt, alpha); ball(P[8], 0.14, pants, alpha);
  ball(P[2], 0.065, shirt, alpha); ball(P[3], 0.065, shirt, alpha);
  limb(P[2], P[4], 0.05, shirt, alpha); limb(P[3], P[6], 0.05, shirt, alpha);
  limb(P[4], P[5], 0.042, skin, alpha); limb(P[6], P[7], 0.042, skin, alpha);
  ball(P[5], 0.052, skin, alpha); ball(P[7], 0.052, skin, alpha);
  limb(P[9], P[11], 0.068, pants, alpha); limb(P[10], P[13], 0.068, pants, alpha);
  ball(P[11], 0.066, pants, alpha); ball(P[13], 0.066, pants, alpha);
  limb(P[11], P[12], 0.052, pants, alpha); limb(P[13], P[14], 0.052, pants, alpha);
  limb(P[1], P[0], 0.05, skin, alpha);
  // head basis
  let ux = P[0][0] - P[1][0], uy = P[0][1] - P[1][1], uz = P[0][2] - P[1][2]; let l = Math.hypot(ux, uy, uz) || 1; ux /= l; uy /= l; uz /= l;
  let sx = P[2][0] - P[3][0], sy = P[2][1] - P[3][1], sz = P[2][2] - P[3][2];
  let zx = sy * uz - sz * uy, zy = sz * ux - sx * uz, zz = sx * uy - sy * ux; l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
  const xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
  const HB = [xx, xy, xz, ux, uy, uz, zx, zy, zz];
  ball(P[0], 0.15, skin, alpha);
  m4basis(M_A, HB, P[0][0], P[0][1], P[0][2]); glPush(scream ? MESH.face1 : MESH.face0, M_A, skin[0], skin[1], skin[2], alpha);
  glPush(MESH['h_' + c.rider.helmet], M_A, 0.85, 0.2, 0.15, alpha);
  // shoes: point along the cart/body forward
  for (const [k, f] of [[11, 12], [13, 14]]) {
    let ax = P[k][0] - P[f][0], ay = P[k][1] - P[f][1], az = P[k][2] - P[f][2]; l = Math.hypot(ax, ay, az) || 1; ax /= l; ay /= l; az /= l;
    let fx2 = zy * az - zz * ay, fy2 = zz * ax - zx * az, fz2 = zx * ay - zy * ax; // not used directly
    let ox = xx, oy = xy, oz = xz; // side axis
    let qx = oy * az - oz * ay, qy = oz * ax - ox * az, qz = ox * ay - oy * ax; l = Math.hypot(qx, qy, qz) || 1; qx /= l; qy /= l; qz /= l;
    const SB = [ay * qz - az * qy, az * qx - ax * qz, ax * qy - ay * qx, ax, ay, az, qx, qy, qz];
    m4basis(M_A, SB, P[f][0], P[f][1], P[f][2]); glPush(MESH.shoe, M_A, 1, 1, 1, alpha);
  }
}
function drawCart(c, t) {
  const B = c.basis();
  const ghost = c.ghostT > 0 ? 0.45 + 0.3 * Math.sin(t * 25) : 1;
  const M = m4basis(new Float32Array(16), B, c.x, c.y, c.z, 1, 1 - c.squash * 0.18, 1);
  glPush(MESH.cart, M, c.col[0], c.col[1], c.col[2], ghost);
  const CB = r3YPR(c.yaw - (c.delta || 0), c.pitch, c.roll);
  for (const s of [-1, 1]) { const p = localToWorld(c, B, [s * 0.215, 0.19, 0.36]); glPush(MESH.caster, m4basis(new Float32Array(16), CB, p[0], p[1], p[2]), 1, 1, 1, ghost); }
  const P = riderLocal(c, t).map(p => localToWorld(c, B, p));
  drawRider(c, P, c.spinT > 0 || (c.vaultT > 0) || (!c.onGround && c.airT > 0.6), ghost);
  // steering ropes, hands to casters, taut on the pulled side
  const st = c.input.steer || 0;
  for (const [h, s] of [[5, 1], [7, -1]]) {
    const a = P[h], rim = localToWorld(c, B, [s * 0.2, 1.0, 0.5]), b = localToWorld(c, B, [s * 0.215, 0.17, 0.4]);
    const pull = s > 0 ? Math.max(0, -st) : Math.max(0, st);
    const sag = 0.07 * (1 - pull);
    const m = [(a[0] + rim[0]) / 2, (a[1] + rim[1]) / 2 - sag, (a[2] + rim[2]) / 2];
    limbR(a, m); limbR(m, rim); limbR(rim, b);
  }
  if (c.blowerT > 0) { const m = localToWorld(c, B, [0.25, 0.95, 0.35]); glPush(MESH.blower, m4basis(new Float32Array(16), B, m[0], m[1], m[2]), 1, 1, 1, 1); }
}
function limbR(a, b) { m4between(M_A, a[0], a[1], a[2], b[0], b[1], b[2], 0.014); glPush(MESH.wire, M_A, 1.0, 0.55, 0.04, 1); }

function drawScene(t) {
  glResetQueue(true);
  for (const c of GAME.carts) if (c.state === 'drive') drawCart(c, t);
  for (const w of GAME.wrecks) {
    const M = m4basis(new Float32Array(16), w.B, w.x, w.y - 0.25 * w.B[4], w.z);
    glPush(MESH.cart, M, w.c.col[0] * 0.8, w.c.col[1] * 0.8, w.c.col[2] * 0.8, 1);
    for (const s of [-1, 1]) { const p = r3apply(w.B, s * 0.215, 0.19 - 0.25, 0.36); glPush(MESH.caster, m4basis(new Float32Array(16), w.B, w.x + p[0], w.y + p[1], w.z + p[2]), 1, 1, 1, 1); }
  }
  for (const r of GAME.ragdolls) {
    if (r.c.state === 'drive' || r.c.state === 'out') { r.fade -= 1 / 60; }
    if (r.fade <= 0) continue;
    drawRider(r.c, r.p, true, r.fade < 1 ? Math.max(0, r.fade) : 1);
  }
  GAME.ragdolls = GAME.ragdolls.filter(r => r.fade > 0);
  for (const d of GAME.debris) {
    const s = d.t > d.life - 0.6 ? Math.max(0.01, (d.life - d.t) / 0.6) : 1;
    glPush(d.mesh, m4basis(new Float32Array(16), d.B, d.x, d.y, d.z, s, s, s), d.tint[0], d.tint[1], d.tint[2], 1);
  }
  for (const d of GAME.props) glPush(d.mesh, m4basis(new Float32Array(16), d.B, d.x, d.y - (d.prop === 'cone' ? 0 : 0), d.z), 1, 1, 1, 1);
  for (const [x, z, yaw, tint] of DECOR_CARTS) glPush(MESH.cart, m4basis(new Float32Array(16), r3Y(yaw), x, 0, z), tint[0], tint[1], tint[2], 1);
  for (const p of GAME.pickups) if (p.active) {
    const B = r3Y(t * 1.6 + p.x); const glow = 0.6 + 0.4 * Math.sin(t * 6 + p.z);
    glPush(MESH.bag, m4basis(new Float32Array(16), B, p.x, 0.25 + Math.sin(t * 2.5 + p.x) * 0.12, p.z), 1, 0.85 * glow + 0.15, 0.1, 1);
  }
  for (const pd of GAME.puddles) { const sc = pd.r * (pd.t < 0.25 ? pd.t / 0.25 : 1) * (pd.t > pd.life - 2 ? Math.max(0.01, (pd.life - pd.t) / 2) : 1); glPush(MESH.puddle, m4basis(new Float32Array(16), r3Y(pd.yaw), pd.x, groundH(pd.x, pd.z) + 0.02, pd.z, sc * 0.75, 1, sc * 0.75), 1, 1, 1, 1); }
  const S = GAME.sample;
  if (S && S.active) {
    glPush(MESH.heart, m4basis(new Float32Array(16), r3Y(t * 2.2), S.x, S.y + Math.sin(t * 3) * 0.12, S.z, 1.25, 1.25, 1.25), 1, 1, 1, 1);
    if (F1() < 0.5) particle({ x: S.x + F1(-0.6, 0.6), y: S.y - 0.6, z: S.z + F1(-0.6, 0.6), vx: 0, vy: F1(0.5, 1.4), vz: 0, life: 1.2, s0: 0.07, s1: 0.02, r: 1, g: 0.45, b: 0.6, a: 1, kind: 1, add: true, drag: 0.5, grav: 0, rot: 0, rv: 0 });
    if (F1() < 0.15) particle({ x: S.x, y: S.y, z: S.z, vx: 0, vy: 0, vz: 0, life: 0.6, s0: 1.4, s1: 2.2, r: 1, g: 0.3, b: 0.45, a: 0.25, kind: 1, add: true, drag: 0, grav: 0, rot: 0, rv: 0 });
  }
  for (const p of GAME.peels) glPush(MESH.peel, m4basis(new Float32Array(16), r3Y(p.yaw), p.x, groundH(p.x, p.z) + 0.015, p.z), 1, 1, 1, 1);
  for (const m of GAME.melons) glPush(MESH.watermelon, m4basis(new Float32Array(16), r3YPR(Math.atan2(m.vx, m.vz), -m.spin, 0), m.x, m.y, m.z), 1, 1, 1, 1);
  for (const d of GAME.ducks) {
    const B = d.mode === 'fly' ? r3YPR(d.yaw, 0.3, Math.sin(d.t * 18) * 0.15) : r3Y(d.yaw);
    glPush(MESH.duck, m4basis(new Float32Array(16), B, d.x, d.y - 0.03, d.z), 1, 1, 1, 1);
    if (d.mode === 'fly') for (const s of [-1, 1]) {
      const flap = Math.sin(d.t * 22) * 0.9; const wb = m3mul(B, r3Z(s * (0.4 + flap))); const p = r3apply(B, s * 0.1, 0.13, 0);
      const base = m4basis(new Float32Array(16), wb, d.x + p[0], d.y + p[1], d.z + p[2]);
      glPush(MESH.box, m4mul(base, base, m4mul(new Float32Array(16), m4trans(s * 0.13, 0, 0), m4scale(0.26, 0.015, 0.14))), 0.92, 0.9, 0.82, 1);
    }
  }
  for (let i = 0; i < 3; i++) {
    const o = smoothstep(0, 0.35, Math.min(GAME.doors[i], 1.6 - GAME.doors[i] + 0.0001)) * 1.55;
    for (const s of [-1, 1]) glPush(MESH.door, m4basis(new Float32Array(16), r3Y(0), DOORS[i] + s * (0.85 + o), 1.42, STORE_Z + 0.12), 1, 1, 1, 1);
  }
  pushParticles(1);
}

// ---------- quality ----------
const QUAL = { particles: 1 };
function applyQuality() {
  const q = SET.quality;
  const dpr = window.devicePixelRatio || 1;
  const tiers = { low: [1024, 0, Math.min(dpr, 1) * 0.75, 0.45], medium: [2048, 0, Math.min(dpr, 1), 0.75], high: [2048, 1, Math.min(dpr, 1.5), 1], max: [4096, 2, dpr, 1.2] };
  const t = tiers[q] || tiers.high;
  if (gl && RND.shadowSize !== t[0]) glMakeShadow(t[0]);
  RND.pcf = t[1]; RND.pixelRatio = t[2]; QUAL.particles = t[3]; RND.adaptive = q === 'high'; if (!RND.adaptive) RND.scale = 1;
  resize();
}
function resize() {
  const cv = document.getElementById('gl');
  const pr = RND.pixelRatio * (RND.adaptive ? RND.scale : 1);
  const w = Math.max(320, Math.floor(innerWidth * pr)), h = Math.max(200, Math.floor(innerHeight * pr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  RND.w = w; RND.h = h;
}

// ---------- HUD ----------
const HUD = {
  build() {
    const b = document.getElementById('board'); b.innerHTML = '';
    HUD.rows = GAME.carts.map(c => {
      const d = document.createElement('div'); d.className = 'bd' + (c.isPlayer ? ' me' : '');
      d.innerHTML = `<div class="sw" style="background:${hexCss(c.rider.shirt)}"></div><div class="nm">${c.rider.icon} ${c.name}</div><div class="lv"></div><div class="ko"></div>`;
      b.appendChild(d); return d;
    });
    document.getElementById('hud').classList.toggle('hidden', GAME.mode === 'title');
  },
  t: 0,
  update(dt) {
    HUD.t += dt;
    if (GAME.mode === 'title') return;
    GAME.carts.forEach((c, i) => {
      const r = HUD.rows[i]; if (!r) return;
      r.children[2].textContent = c.lives > 999 ? '♥∞' : c.lives > 5 ? '♥×' + c.lives : '♥'.repeat(Math.max(0, c.lives));
      r.children[3].textContent = '★' + c.stats.points;
      r.classList.toggle('out', c.out);
    });
    const tm = Math.max(0, GAME.timer); document.getElementById('timer').textContent = Math.floor(tm / 60) + ':' + String(Math.floor(tm % 60)).padStart(2, '0');
    const alive = GAME.carts.filter(c => !c.out).length;
    document.getElementById('left').textContent = alive + ' carts rolling';
    const c = camTargetCart();
    const p = GAME.player;
    if (p) {
      document.querySelector('#spd b').textContent = Math.round((p.state === 'drive' ? p.speed() : 0) * 2.237);
      document.getElementById('heat').style.height = (p.overT > 0 ? 100 : p.heat * 100) + '%';
      document.getElementById('heatw').classList.toggle('hot', p.heat > 0.75 || p.overT > 0);
      const it = p.item ? ITEMS[p.item] : null;
      document.getElementById('itemi').textContent = it ? it.icon : '';
      document.getElementById('itemn').textContent = it ? (p.itemN > 1 ? it.name + ' x' + p.itemN : it.name.replace(/S$/, p.item === 'melon' ? '' : 'S')) : 'NO ITEM';
      document.getElementById('item').classList.toggle('has', !!it);
    }
    const cnt = document.getElementById('count');
    if (GAME.mode === 'countdown') { const n = Math.ceil(GAME.countT - 0.2); cnt.textContent = n > 0 ? n : 'SHOP!'; }
    else if (GAME.mode === 'play' && GAME.playT < 0.9) cnt.textContent = 'SHOP!'; else cnt.textContent = '';
    const sp = document.getElementById('spect');
    if (p && p.out && GAME.mode === 'play') sp.textContent = `You're out. Watching ${c ? c.name : ''} · ◀ ▶ switch · hold E to fast-forward · R restart`;
    else if (p && p.state === 'ko') sp.textContent = p.lives > 0 ? 'Walking back to the store...' : ''; else sp.textContent = '';
    const hint = document.getElementById('hint');
    const steerHint = SET.steer === 'stick' ? 'left thumb: up = rocket, down = brake, sideways = steer' : SET.steer === 'tilt' ? 'tilt to steer' : SET.steer === 'buttons' ? '◀ ▶ pull the ropes' : 'drag the left side to steer';
    if (GAME.mode === 'play' && GAME.playT < 9) hint.textContent = INPUT.touchOn ? `${steerHint} · ${SET.steer === 'stick' ? '' : SET.autorocket ? 'the rocket fires itself · ' : 'hold ROCKET · '}BOOST · ${SET.steer === 'stick' ? '' : 'DRIFT · '}tap the right side for items` : 'W rocket · A D pull the ropes · Shift boost · S drag feet · E item · knock carts out to score';
    else if (p && p.item && p.state === 'drive') hint.textContent = (INPUT.touchOn ? 'Tap the right side' : 'E') + ' to use ' + ITEMS[p.item].name.toLowerCase();
    else hint.textContent = '';
    if ((HUD.mm = (HUD.mm || 0) + 1) % 2 === 0 || TEST) HUD.minimap();
  },
  minimap() {
    const cv = document.getElementById('mini'), g = cv.getContext('2d'); const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    const sx = W / 82, sz = H / 66; const X = x => (x + 40) * sx, Z = z => (32 - z) * sz;
    g.fillStyle = 'rgba(60,62,66,.85)'; g.fillRect(X(-38), Z(28), 76 * sx, 59 * sz);
    g.fillStyle = 'rgba(200,190,170,.9)'; g.fillRect(X(-40), Z(36), 74 * sx, 5 * sz);
    g.fillStyle = 'rgba(70,140,200,.9)'; g.beginPath();
    for (let k = 0; k <= 40; k++) { const th = k / 40 * TAU, r = pondR(th); const x = POND.x + Math.cos(th) * r, z = POND.z + Math.sin(th) * r; k ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z)); } g.fill();
    g.fillStyle = 'rgba(40,90,150,.9)'; g.fillRect(X(CLIFF_X), 0, W - X(CLIFF_X), H);
    g.strokeStyle = '#ff5544'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(CLIFF_X), Z(28)); g.lineTo(X(CLIFF_X), Z(-31)); g.stroke();
    g.fillStyle = 'rgba(230,230,230,.7)';
    for (const s of STATICS) if (s.kind === 'car' || s.kind === 'corral' || s.kind === 'dumpster') { g.save(); g.translate(X(s.x), Z(s.z)); g.rotate(s.ang); g.fillRect(-s.hx * sx, -s.hz * sz, s.hx * 2 * sx, s.hz * 2 * sz); g.restore(); }
    g.fillStyle = '#c8a26b'; for (const r of RAMPS) { g.save(); g.translate(X(r.x + r.fx * r.L / 2), Z(r.z + r.fz * r.L / 2)); g.rotate(-r.ang); g.fillRect(-r.W / 2 * sx, -r.L / 2 * sz, r.W * sx, r.L * sz); g.restore(); }
    g.fillStyle = '#ffd23f'; for (const p of GAME.pickups) if (p.active) { g.beginPath(); g.arc(X(p.x), Z(p.z), 4, 0, TAU); g.fill(); }
    if (GAME.sample && GAME.sample.active) { g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ff3d6e'; g.fillText('♥', X(GAME.sample.x), Z(GAME.sample.z)); }
    for (const c of GAME.carts) {
      if (c.state !== 'drive') continue;
      g.save(); g.translate(X(c.x), Z(c.z)); g.rotate(-c.yaw + Math.PI);
      g.fillStyle = hexCss(c.rider.shirt); g.strokeStyle = c.isPlayer ? '#fff' : '#000'; g.lineWidth = c.isPlayer ? 3 : 1.5;
      g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 8); g.lineTo(-8, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
    }
  },
  receipt(sorted) {
    const p = GAME.player; const win = sorted[0];
    const d = new Date();
    const ln = (a, b) => `<div class="ln"><span>${a}</span><span>${b}</span></div>`;
    let h = `<h2>CLIFFTOP FOODS</h2><div class="c">Store #0042 · Lane 7 · Parking Lot</div><div class="c">${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><hr>`;
    h += `<div class="win">${win.isPlayer ? 'YOU WIN!' : 'WINNER: ' + win.name.toUpperCase()}</div><div class="c">most points: ${win.stats.points} ★</div><hr>`;
    if (p) {
      const s = p.stats;
      h += `<div><b>${p.rider.icon} ${p.name.toUpperCase()} (YOU)</b></div>`;
      h += ln('TAKEDOWNS        x' + s.wipeouts, '+' + s.wipeouts);
      h += ln('FINAL TAKEDOWNS  x' + s.finals, '+' + s.finals);
      if (s.lastCart) h += ln('LAST CART ROLLING', '+2');
      if (s.samples && !SET.lives) h += ln('FREE SAMPLES     x' + s.samples, '+' + s.samples);
      h += ln('SELF-CHECKOUTS   x' + s.self, s.self ? '-' + s.self : '0');
      h += ln('<b>POINTS</b>', '<b>' + s.points + '</b>');
      h += `<hr>`;
      h += ln('TIMES WIPED OUT', String(s.deaths));
      h += ln('FREE SAMPLES', String(s.samples || 0));
      h += ln('POND CLEARANCES', String(s.clears));
      h += ln('TOP SPEED', Math.round(s.topSpeed * 2.237) + ' MPH');
      h += ln('BIGGEST AIR', s.maxAir.toFixed(1) + ' s');
      h += `<hr>`;
    }
    sorted.forEach((c, i) => { h += ln(`${i + 1}. ${c.name}${c.isPlayer ? ' (you)' : ''}`, `★${c.stats.points}  💥${c.stats.wipeouts}`); });
    const total = p ? p.stats.points : 0;
    h += `<hr>${ln('<b>TOTAL</b>', '<b>' + total + ' PTS</b>')}<hr><div class="c">THANK YOU FOR SHOPPING<br>NO REFUNDS · NO RETURNS<br>CARTS MUST BE RETURNED (EVENTUALLY)</div><div class="bc"></div><div class="c">*** ${String(GAME.matchId).padStart(4, '0')}${Math.floor(Math.abs(total) * 7 + 1000)} ***</div>`;
    document.getElementById('receipt').innerHTML = h;
    setTimeout(() => { if (GAME.mode === 'end') document.getElementById('end').classList.remove('hidden'); }, 1400);
  }
};

// ---------- menus ----------
const SEGS = {
  opp: [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']], lives: [[1, '1'], [3, '3'], [5, '5'], [0, '∞ (3 min)']],
  steer: [['stick', 'Joystick'], ['drag', 'Drag'], ['buttons', 'Buttons'], ['tilt', 'Tilt']], autorocket: [[true, 'Auto rocket']], assist: [[true, 'Smart steering']], lefty: [[true, 'Left-handed']],
  ai: [['easy', 'Easy'], ['normal', 'Normal'], ['mean', 'Mean']], quality: [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['max', 'MAX']],
  sound: [[true, '🔊 Sound']], muzak: [[true, '🎵 Muzak']], voice: [[true, '📣 Announcer']], touch: [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']]
};
function buildMenus() {
  document.querySelectorAll('.seg').forEach(el => {
    const k = el.dataset.k; const opts = SEGS[k]; el.innerHTML = '';
    for (const [v, label] of opts) {
      const b = document.createElement('button'); b.textContent = label;
      const toggle = opts.length === 1;
      const refresh = () => b.classList.toggle('on', toggle ? !!SET[k] : SET[k] === v);
      b.onclick = () => { SET[k] = toggle ? !SET[k] : v; saveSettings(); document.querySelectorAll(`.seg[data-k="${k}"] button`).forEach(x => x._r()); onSetting(k); AUD.ui(); };
      b._r = refresh; refresh(); el.appendChild(b);
    }
  });
  const showRider = () => {
    const r = RIDERS[SET.rider];
    document.getElementById('rSw').style.background = hexCss(r.shirt); document.getElementById('rSw').innerHTML = r.icon;
    document.getElementById('rName').textContent = r.name; document.getElementById('rDesc').textContent = r.desc;
    document.getElementById('rW').style.width = ((r.mass - 45) / 60 * 100) + '%';
    document.getElementById('rZ').style.width = ((1 / (r.mass + CART_MASS) - 1 / 125) / (1 / 70 - 1 / 125) * 100) + '%';
  };
  document.getElementById('rPrev').onclick = () => { SET.rider = (SET.rider + 5) % 6; saveSettings(); showRider(); AUD.ui(); };
  document.getElementById('rNext').onclick = () => { SET.rider = (SET.rider + 1) % 6; saveSettings(); showRider(); AUD.ui(); };
  showRider();
  const how = document.getElementById('how'); how.classList.add('hidden');
  document.getElementById('howb').onclick = () => how.classList.toggle('hidden');
  document.getElementById('play').onclick = () => startGame();
  document.getElementById('fsb').onclick = () => toggleFullscreen();
  document.getElementById('resume').onclick = () => setPause(false);
  document.getElementById('restart').onclick = () => { setPause(false); startGame(); };
  document.getElementById('quit').onclick = () => { setPause(false); toTitle(); };
  document.getElementById('again').onclick = () => startGame();
  document.getElementById('endq').onclick = () => toTitle();
}
function onSetting(k) {
  if (k === 'quality') applyQuality();
  if (k === 'sound' || k === 'muzak' || k === 'voice') AUD.apply();
  if (k === 'touch' || k === 'steer' || k === 'autorocket' || k === 'lefty') INPUT.applyTouch();
  if (k === 'steer' && SET.steer === 'tilt') INPUT.askTilt();
}
function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      const r = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      if (r && r.then) r.then(() => { try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(() => { });
    } else document.exitFullscreen();
  } catch (e) { }
}
function startGame() {
  AUD.init();
  if (INPUT.touchOn && SET.steer === 'tilt') INPUT.askTilt();
  INPUT.tiltZero = null;
  document.getElementById('title').classList.add('hidden'); document.getElementById('end').classList.add('hidden');
  newMatch(false); GAME.playT = 0;
  INPUT.applyTouch();
}
function toTitle() {
  document.getElementById('end').classList.add('hidden'); document.getElementById('title').classList.remove('hidden');
  newMatch(true); INPUT.applyTouch();
}
function setPause(on) {
  if (on && (GAME.mode === 'play' || GAME.mode === 'countdown')) { GAME.pausedFrom = GAME.mode; GAME.mode = 'paused'; document.getElementById('pause').classList.remove('hidden'); AUD.duck(true); }
  else if (!on && GAME.mode === 'paused') { GAME.mode = GAME.pausedFrom; document.getElementById('pause').classList.add('hidden'); AUD.duck(false); }
}

// ---------- input ----------
// Touch follows what popular mobile kart games do: the rocket fires itself (auto-accelerate), steering is a choice of
// drag-anywhere on the left (Mario Kart Tour), big left/right buttons (KartRider Rush+) or tilt (Asphalt 9), the right
// thumb gets big BOOST / DRIFT / ITEM buttons plus swipe-up for items, optional smart steering keeps you off the cliff
// and out of the pond, and a left-handed mirror swaps the sides.
const INPUT = {
  keys: {}, touch: {}, touchOn: false, steer: 0, itemEdge: false, prevPadItem: false, prevPadStart: false,
  drag: null, dragSteer: 0, tiltRaw: null, tiltZero: null, swipe: null,
  init() {
    addEventListener('keydown', e => {
      if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); return; }
      INPUT.keys[e.code] = true; AUD.init();
      if (['KeyE', 'KeyF', 'Enter', 'NumpadEnter'].includes(e.code)) INPUT.itemEdge = true;
      if ((e.code === 'Enter' || e.code === 'NumpadEnter') && GAME.mode === 'title' && !document.getElementById('title').classList.contains('hidden')) { startGame(); return; }
      if (e.code === 'Escape' || e.code === 'KeyP') setPause(GAME.mode !== 'paused');
      if (e.code === 'KeyC') GAME.camMode = (GAME.camMode + 1) % 2;
      if (e.code === 'KeyR' && (GAME.mode === 'play' || GAME.mode === 'end')) startGame();
      if (GAME.player && GAME.player.out) { if (e.code === 'ArrowLeft' || e.code === 'KeyA') GAME.spectate--; if (e.code === 'ArrowRight' || e.code === 'KeyD') GAME.spectate++; }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => { INPUT.keys[e.code] = false; });
    addEventListener('blur', () => { INPUT.keys = {}; INPUT.touch = {}; INPUT.drag = null; INPUT.dragSteer = 0; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); });
    const bind = (id, k) => {
      const el = document.getElementById(id);
      const on = e => { e.preventDefault(); e.stopPropagation(); INPUT.touch[k] = true; el.classList.add('on'); AUD.init(); if (k === 'item') INPUT.itemEdge = true; if (k === 'pause') setPause(GAME.mode !== 'paused'); if (GAME.player && GAME.player.out) { if (k === 'left') GAME.spectate--; if (k === 'right') GAME.spectate++; } try { el.setPointerCapture(e.pointerId); } catch (_) { } };
      const off = e => { INPUT.touch[k] = false; el.classList.remove('on'); };
      el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
    };
    bind('tL', 'left'); bind('tR', 'right'); bind('tGo', 'go'); bind('tBoost', 'boost'); bind('tItem', 'item'); bind('tBrake', 'brake'); bind('tPause', 'pause');
    // floating drag stick: put a thumb down anywhere on the steering side, slide left/right
    const zone = document.getElementById('tZone'), stick = document.getElementById('tStick'), knob = document.getElementById('tKnob');
    const range = () => SET.steer === 'stick' ? clamp(Math.min(innerWidth, innerHeight * 1.8) * 0.075, 42, 70) : clamp(innerWidth * 0.075, 45, 85);
    zone.addEventListener('pointerdown', e => {
      e.preventDefault(); AUD.init(); if (INPUT.drag) return;
      INPUT.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: 0 }; INPUT.dragSteer = 0; INPUT.stickThr = 0; INPUT.stickBrake = 0;
      try { zone.setPointerCapture(e.pointerId); } catch (_) { }
      stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px'; stick.classList.add('on'); knob.style.transform = 'translate(-50%,-50%)';
    });
    zone.addEventListener('pointermove', e => {
      const d = INPUT.drag; if (!d || d.id !== e.pointerId) return;
      const R = range(); let dx = e.clientX - d.x0, dy = e.clientY - d.y0;
      if (SET.steer === 'stick') {
        // round floating joystick: x steers, up = rocket (W), down = drag feet (S); the base follows a thumb that wanders off
        let len = Math.hypot(dx, dy);
        if (len > R * 1.35) { const k = (len - R * 1.35) / len; d.x0 += dx * k; d.y0 += dy * k; dx -= dx * k; dy -= dy * k; len = R * 1.35; stick.style.left = d.x0 + 'px'; stick.style.top = d.y0 + 'px'; }
        d.moved = Math.max(d.moved, len);
        const nx = dx / R, ny = dy / R, dzn = 0.14;
        INPUT.dragSteer = clamp(Math.abs(nx) < dzn ? 0 : (nx - Math.sign(nx) * dzn) / (1 - dzn), -1, 1);
        INPUT.stickThr = clamp((-ny - 0.18) / 0.5, 0, 1);
        INPUT.stickBrake = ny > 0.42 ? 1 : 0;
        const kl = Math.min(1, R / (len || 1));
        knob.style.transform = `translate(calc(-50% + ${dx * kl}px),calc(-50% + ${dy * kl}px))`;
        return;
      }
      if (Math.abs(dx) > R * 1.25) { d.x0 += dx - Math.sign(dx) * R * 1.25; dx = Math.sign(dx) * R * 1.25; stick.style.left = d.x0 + 'px'; }
      d.moved = Math.max(d.moved, Math.abs(dx));
      const dz = 5; const v = Math.abs(dx) < dz ? 0 : (Math.abs(dx) - dz) / (R - dz) * Math.sign(dx);
      INPUT.dragSteer = clamp(v, -1, 1);
      knob.style.transform = `translate(calc(-50% + ${clamp(dx, -R, R)}px),-50%)`;
    });
    const endDrag = e => {
      const d = INPUT.drag; if (!d || d.id !== e.pointerId) return;
      if (d.moved < 10 && GAME.player && GAME.player.out) GAME.spectate += e.clientX > innerWidth / 4 ? 1 : -1;
      INPUT.drag = null; INPUT.dragSteer = 0; INPUT.stickThr = 0; INPUT.stickBrake = 0; stick.classList.remove('on');
    };
    zone.addEventListener('pointerup', endDrag); zone.addEventListener('pointercancel', endDrag); zone.addEventListener('lostpointercapture', endDrag);
    // tap anywhere on the action half of the screen to use the item (holding it fast-forwards while spectating)
    const sw = document.getElementById('tSwipe');
    sw.addEventListener('pointerdown', e => { e.preventDefault(); AUD.init(); INPUT.itemEdge = true; INPUT.touch.item = true; try { sw.setPointerCapture(e.pointerId); } catch (_) { } });
    const endSw = () => { INPUT.touch.item = false; };
    sw.addEventListener('pointerup', endSw); sw.addEventListener('pointercancel', endSw); sw.addEventListener('lostpointercapture', endSw);
    // tilt
    addEventListener('deviceorientation', e => {
      if (e.beta === null || e.gamma === null) return;
      const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
      INPUT.tiltRaw = ang === 90 ? e.beta : (ang === -90 || ang === 270) ? -e.beta : e.gamma;
    });
    INPUT.applyTouch();
  },
  askTilt() {
    try { if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().catch(() => { }); } catch (e) { }
  },
  applyTouch() {
    const coarse = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
    INPUT.touchOn = SET.touch === 'on' || (SET.touch === 'auto' && coarse);
    document.getElementById('touch').classList.toggle('hidden', !INPUT.touchOn || GAME.mode === 'title' || GAME.mode === 'end');
    const b = document.body.classList;
    b.toggle('touchmode', INPUT.touchOn);
    for (const m of ['stick', 'drag', 'buttons', 'tilt']) b.toggle('steer-' + m, SET.steer === m);
    b.toggle('nogo', !!SET.autorocket || SET.steer === 'stick'); b.toggle('lefty', !!SET.lefty);
  },
  poll(dt) {
    const k = INPUT.keys, t = INPUT.touch;
    let thr = (k.KeyW || k.ArrowUp || t.go) ? 1 : 0;
    let tgt = ((k.KeyD || k.ArrowRight || t.right) ? 1 : 0) - ((k.KeyA || k.ArrowLeft || t.left) ? 1 : 0);
    let brake = (k.KeyS || k.ArrowDown || t.brake) ? 1 : 0;
    let boost = (k.ShiftLeft || k.ShiftRight || k.Space || t.boost) ? 1 : 0;
    let item = INPUT.itemEdge; INPUT.itemEdge = false;
    let analog = null;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const ax = gp.axes[0] || 0; if (Math.abs(ax) > 0.15) analog = ax;
      if (gp.buttons[14] && gp.buttons[14].pressed) tgt = -1; if (gp.buttons[15] && gp.buttons[15].pressed) tgt = 1;
      const rt = gp.buttons[7] ? gp.buttons[7].value : 0; if (rt > 0.1) thr = Math.max(thr, rt);
      if (gp.buttons[12] && gp.buttons[12].pressed) thr = 1;
      if (gp.buttons[6] && gp.buttons[6].value > 0.2) brake = 1;
      if (gp.buttons[0] && gp.buttons[0].pressed) boost = 1;
      const it = (gp.buttons[2] && gp.buttons[2].pressed) || (gp.buttons[1] && gp.buttons[1].pressed);
      if (it && !INPUT.prevPadItem) item = true; INPUT.prevPadItem = it;
      const st = gp.buttons[9] && gp.buttons[9].pressed; if (st && !INPUT.prevPadStart) { if (GAME.mode === 'title') startGame(); else setPause(GAME.mode !== 'paused'); } INPUT.prevPadStart = st;
      AUD.init();
    }
    if (INPUT.touchOn) {
      if ((SET.steer === 'drag' || SET.steer === 'stick') && INPUT.drag) analog = INPUT.dragSteer;
      if (SET.steer === 'stick' && INPUT.drag) { thr = Math.max(thr, INPUT.stickThr); if (INPUT.stickBrake) brake = 1; }
      if (SET.steer === 'tilt' && INPUT.tiltRaw !== null) {
        if (INPUT.tiltZero === null) INPUT.tiltZero = INPUT.tiltRaw;
        const d = INPUT.tiltRaw - INPUT.tiltZero; analog = clamp((Math.abs(d) < 2 ? 0 : d - Math.sign(d) * 2) / 22, -1, 1);
      }
      if (SET.autorocket && !brake) thr = 1;
    }
    if (analog !== null) INPUT.steer += (analog - INPUT.steer) * Math.min(1, dt * 18);
    else { const rate = tgt === 0 ? 9 : (Math.sign(tgt) !== Math.sign(INPUT.steer) ? 12 : 5.5); INPUT.steer += clamp(tgt - INPUT.steer, -rate * dt, rate * dt); }
    INPUT.ff = !!(k.KeyE || k.KeyF || t.item);
    return { throttle: thr, steer: INPUT.steer, brake, boost, item };
  }
};

// Smart steering (touch only, optional): if the cart is about to roll into the pond or off the cliff, or slam a wall hard
// enough to self-checkout, nudge the ropes away and ease off. It stays out of the way on ramps (pond jump) and in the air.
function smartSteer(c, pin) {
  if (!c.onGround || c.megaT > 0) return pin;
  const sp = c.speed(); if (sp < 2.5) return pin;
  let hitT = 0;
  for (const tt of [0.25, 0.45, 0.7, 0.95]) {
    const x = c.x + c.vx * tt, z = c.z + c.vz * tt;
    if (rampAt(x, z)[0] > 0.01) return pin;           // heading for a jump: let them
    let bad = isLethal(x, z);
    if (!bad && sp > SELF_KO_SPEED * 0.85 && GAME.now - c.lastHit.t > SHOVE_WINDOW) {
      for (const st of STATICS) { if (!KINDS[st.kind].hazard) continue; const ddx = x - st.x, ddz = z - st.z, rr = (st.shape === 'circ' ? st.r : Math.max(st.hx, st.hz)) + 1.5; if (ddx * ddx + ddz * ddz > rr * rr) continue; if (staticClosest(st, x, z)[2] < 0.7) { bad = true; break; } }
    }
    if (bad) { hitT = tt; break; }
  }
  if (!hitT) return pin;
  // which way is safer? test the velocity direction rotated each way
  const va = Math.atan2(c.vx, c.vz); let best = 0, bestD = -1;
  for (const s of [-1, 1]) {
    const a = va - s * 0.6; let ok = 0;
    for (const tt of [0.3, 0.6, 0.9]) { const x = c.x + Math.sin(a) * sp * tt, z = c.z + Math.cos(a) * sp * tt; if (!isLethal(x, z)) ok++; }
    if (ok > bestD) { bestD = ok; best = s; }
  }
  const out = { ...pin };
  out.steer = clamp(pin.steer * 0.35 + best * 0.9, -1, 1);
  if (hitT <= 0.45) { out.boost = 0; out.throttle = Math.min(out.throttle, 0.3); if (hitT <= 0.25 && isLethal(c.x + c.vx * 0.25, c.z + c.vz * 0.25)) out.brake = 1; }
  return out;
}

// ---------- main loop ----------
let lastTS = 0, fpsAcc = 0, fpsN = 0, fpsShow = 0, frameAvg = 16;
function frame(ts) {
  requestAnimationFrame(frame);
  const realDt = Math.min(0.05, Math.max(0.001, (ts - (lastTS || ts)) / 1000)); lastTS = ts;
  if (!TEST || QS.has('run')) tick(realDt);
  renderFrame();
  fpsAcc += realDt; fpsN++;
  frameAvg = lerp(frameAvg, realDt * 1000, 0.05);
  if (fpsAcc > 0.5) { fpsShow = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; document.getElementById('fps').textContent = fpsShow + ' fps · ' + SET.quality.toUpperCase(); }
  if (RND.adaptive && !TEST) {
    if (frameAvg > 21 && RND.scale > 0.6) { RND.scale = Math.max(0.6, RND.scale - 0.05); frameAvg = 16; resize(); }
    else if (frameAvg < 14 && RND.scale < 1) { RND.scale = Math.min(1, RND.scale + 0.05); frameAvg = 16; resize(); }
  }
}
function tick(realDt) {
  const pin = INPUT.poll(realDt);
  const p = GAME.player;
  if (p && !GAME.ais.some(a => a.c === p)) {
    if (p.state === 'drive' && SET.assist && INPUT.touchOn) Object.assign(pin, smartSteer(p, pin));
    if (p.state === 'drive') { p.input.throttle = pin.throttle; p.input.steer = pin.steer; p.input.brake = pin.brake; p.input.boost = pin.boost; if (pin.item && GAME.mode === 'play') useItem(p, GAME.now); }
    else { p.input.throttle = 0; p.input.steer = 0; }
  }
  if (GAME.mode === 'paused' || GAME.mode === 'end' && GAME.endShown) { AUD.update(realDt); return; }
  if (GAME.mode === 'countdown') { GAME.countT -= realDt; if (GAME.countT <= 0) { GAME.mode = 'play'; GAME.playT = 0; AUD.go(); } else if (Math.ceil(GAME.countT - 0.2) !== Math.ceil(GAME.countT - 0.2 + realDt)) AUD.beep(); }
  if (GAME.mode === 'play') GAME.playT += realDt;
  // slow motion on big moments
  if (GAME.slowT > 0) { GAME.slowT -= realDt; GAME.timeScale = damp(GAME.timeScale, 0.33, 12, realDt); } else GAME.timeScale = damp(GAME.timeScale, 1, 4, realDt);
  let ts = GAME.timeScale;
  if (p && p.out && GAME.mode === 'play' && INPUT.ff) ts = 3;
  advanceSim(realDt * ts);
  GAME.callT = Math.max(0, GAME.callT - realDt);
  if (GAME.callT <= 0 && GAME.callQ.length) { const [m, s] = GAME.callQ.shift(); showCallout(m, s); }
  if (GAME.mode === 'play') { GAME.paT -= realDt; if (GAME.paT <= 0) { GAME.paT = R1(35, 60); feed(pick(PA_LINES), true); } }
  updateCamera(realDt);
  HUD.update(realDt);
  AUD.update(realDt);
}
function advanceSim(dt) {
  GAME.acc += dt; let n = 0;
  while (GAME.acc >= PHYS_DT && n < 40) { physicsStep(PHYS_DT); GAME.acc -= PHYS_DT; n++; }
  if (n >= 40) GAME.acc = 0;
  stepEffects(dt);
}
function renderFrame() {
  resize();
  drawScene(RND.time);
  const center = camTargetCart();
  glSetLight([clamp(CAM.tgt[0], -10, 20), 0, clamp(CAM.tgt[2], -15, 15)], 46);
  glRender(RND.w, RND.h, WORLD.waters);
}

// ---------- boot ----------
let WORLD = null;
function boot() {
  try {
    const cv = document.getElementById('gl');
    glInit(cv, TEST);
    const s = [-0.42, 0.62, -0.66]; const l = Math.hypot(...s); RND.sun = s.map(v => v / l);
    RND.sunCol = [3.1, 2.85, 2.5]; RND.exposure = 0.95;
    buildMeshLibrary();
    glUploadAtlas(makeAtlas());
    WORLD = buildWorld();
    initDecor();
    INPUT.init();
    buildMenus();
    applyQuality();
    addEventListener('resize', resize);
    newMatch(true);
    if (QS.has('play')) startGame();
    requestAnimationFrame(frame);
    window.__ready = true;
  } catch (e) {
    console.error(e);
    document.getElementById('err').textContent = 'Error: ' + e.message;
    window.__bootError = e.message;
  }
}
