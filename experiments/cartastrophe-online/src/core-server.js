// ===== server game core (runs inside makeSim(), after the shared util/world/physics parts) =====
// The authoritative match: inputs in, collisions / pickups / items / wipeouts / scoring decided here, snapshots + events out.
// Mirrors cartastrophe/parts/70-game.js physicsStep(), minus everything cosmetic (ragdolls, wrecks, groceries, ducks, props).
const SET = { lives: opts && opts.lives !== undefined ? opts.lives : 3 };
const GAME = {
  mode: 'lobby', carts: [], pickups: [], peels: [], melons: [], puddles: [], sample: null, events: [], koLog: [],
  now: 0, timer: 240, countT: 0, endT: -1, startLives: 3, lastStanding: null, noAI: true
};
const ITEMS = { melon: { w: 3 }, banana: { w: 3 }, blower: { w: 2.5 }, mega: { w: 2.5 } };
const ITEM_CODE = { melon: 1, banana: 2, blower: 3, mega: 4 };
const STATE_CODE = { drive: 0, ko: 1, out: 2 };
buildStatics();

function pickItem() { let tot = 0; for (const k in ITEMS) tot += ITEMS[k].w; let r = R1(0, tot); for (const k in ITEMS) { r -= ITEMS[k].w; if (r <= 0) return k; } return 'melon'; }

function startMatch(riders, seed) {
  grng = mulberry32(seed | 0); frng = mulberry32((seed | 0) ^ 0x5bd1e995);
  GAME.carts = []; GAME.peels = []; GAME.melons = []; GAME.puddles = []; GAME.events = []; GAME.koLog = [];
  const spots = [[0, 21, Math.PI], [13, -9, -0.6]];
  riders.forEach((ri, i) => {
    const c = new Cart(i, RIDERS[ri], false);
    c.lives = SET.lives || 9999; const [x, z, yaw] = spots[i]; c.reset(x, z, yaw); c.itemN = 0; c.itemCount = 0;
    GAME.carts.push(c);
  });
  GAME.startLives = SET.lives || 9999;
  GAME.pickups = PICKUP_SPOTS.map(([x, z]) => ({ x, z, active: true, t: 0 }));
  GAME.sample = { active: false, t: R1(12, 25), x: 0, y: 0, z: 0 };
  GAME.now = 0; GAME.timer = SET.lives ? 240 : 180; GAME.countT = 3.2; GAME.endT = -1; GAME.lastStanding = null;
  for (const p of PARKED) p.alarm = 0;
  GAME.mode = 'countdown';
}

function setInput(i, m, now) {
  const c = GAME.carts[i]; if (!c) return;
  c.input.throttle = clamp(+m.th || 0, 0, 1); c.input.steer = clamp(+m.st || 0, -1, 1);
  c.input.brake = m.br ? 1 : 0; c.input.boost = m.bo ? 1 : 0;
  const it = m.it | 0;
  if (it > c.itemCount) { c.itemCount = it; c.wantItem = true; }
}

function useItem(c, now) {
  const it = c.item; if (!it) return;
  if (now - (c.itemT || -9) < 0.45) return;
  c.itemT = now;
  c.itemN = (c.itemN || 1) - 1; if (c.itemN <= 0) { c.item = null; c.itemN = 0; }
  c.stats.items++;
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  if (it === 'melon') {
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
  } else if (it === 'banana') {
    const rx = -fz, rz = fx;
    for (const o of [-0.9, 0, 0.9]) GAME.peels.push({ x: c.x - fx * 1.2 + rx * o, z: c.z - fz * 1.2 + rz * o, yaw: F1(0, TAU), owner: c, t: 0 });
    while (GAME.peels.length > 15) GAME.peels.shift();
  } else if (it === 'blower') { c.blowerT = 3.0; }
  else if (it === 'mega') { c.megaT = 2.2; c.overT = 0; c.heat = 0; }
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

function knockOut(c, kind, info) {
  if (c.state !== 'drive') return;
  if (GAME.mode === 'end') return;
  const now = GAME.now;
  c.state = 'ko'; c.koT = 0; c.koKind = kind;
  c.lives--; c.stats.deaths++;
  let by = (now - c.lastHit.t < CREDIT_WINDOW) ? c.lastHit.by : null;
  if (by === c) by = null;
  const final = c.lives <= 0;
  if (by) { by.stats.wipeouts++; by.stats.points++; if (final) { by.stats.finals++; by.stats.points++; } } else { c.stats.self++; c.stats.points--; }
  const bogo = !!(by && now - by.lastScoreT < 6);
  if (by) by.lastScoreT = now;
  GAME.koLog.push({ t: +now.toFixed(2), victim: c.id, by: by ? by.id : -1, kind });
  if (c.lives <= 0) c.out = true;
  GAME.events.push({
    t: 'ko', c, by, kind, final, bogo,
    info: info ? { x: info.x, z: info.z, nx: info.nx, nz: info.nz, st: info.st ? STATICS.indexOf(info.st) : -1 } : null,
    ks: [c.x, c.y, c.z, c.vx, c.vy, c.vz, c.yaw, c.pitch, c.roll, c.w, c.input.steer || 0, c.braking ? 1 : 0, c.lean || 0].map(r3)
  });
}

function respawn(c) {
  const order = DOORS.map((d, i) => i).sort(() => R1() - 0.5);
  let di = order[0];
  for (const i of order) { const x = DOORS[i]; if (!GAME.carts.some(o => o !== c && o.state === 'drive' && Math.hypot(o.x - x, o.z - 29.3) < 4.5)) { di = i; break; } }
  const it = c.item, n = c.itemN, cnt = c.itemCount;
  c.reset(DOORS[di], 29.4, Math.PI);
  c.item = it; c.itemN = n; c.itemCount = cnt;
  c.ghostT = 2.4; c.vz = -3.0;
  GAME.events.push({ t: 'respawn', c, door: di });
}

function physicsStep(dt) {
  GAME.now += dt; const now = GAME.now;
  const carts = GAME.carts;
  if (GAME.mode === 'countdown') { GAME.countT -= dt; if (GAME.countT <= 0) { GAME.mode = 'play'; GAME.events.push({ t: 'go' }); } }
  const live = GAME.mode === 'play';
  for (const c of carts) {
    if (!live) { c.input.throttle = 0; c.input.boost = 0; }
    if (c.wantItem) { c.wantItem = false; if (live && c.state === 'drive') useItem(c, now); }
  }
  for (const c of carts) if (c.state === 'drive') cartStep(c, dt, now);
  for (let it = 0; it < 2; it++) for (let i = 0; i < carts.length; i++) for (let j = i + 1; j < carts.length; j++) {
    const a = carts[i], b = carts[j]; if (a.state === 'drive' && b.state === 'drive') collideCarts(a, b, now);
  }
  for (const c of carts) if (c.state === 'drive') collideStatics(c, now);
  for (const c of carts) {
    if (c.state === 'drive') {
      if (!c.item) for (const p of GAME.pickups) if (p.active && Math.hypot(p.x - c.x, p.z - c.z) < 1.2) { p.active = false; p.t = 10; c.item = pickItem(); c.itemN = c.item === 'melon' ? 2 : 1; GAME.events.push({ t: 'pickup', c, it: c.item }); break; }
      if (c.ghostT <= 0) for (let i = GAME.peels.length - 1; i >= 0; i--) {
        const p = GAME.peels[i]; if (p.t < 0.4 && p.owner === c) continue;
        if (Math.hypot(p.x - c.x, p.z - c.z) < 0.65 && c.onGround) {
          GAME.peels.splice(i, 1); c.spinT = 1.5; c.w += (R1() < 0.5 ? -1 : 1) * R1(5, 8);
          if (p.owner !== c) c.lastHit = { by: p.owner, t: now };
          GAME.events.push({ t: 'slip', c });
        }
      }
      if (c.blowerT > 0) {
        c.blowerT -= dt; c.blowT = 0.05;
        const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
        for (const o of carts) {
          if (o === c || o.state !== 'drive' || o.ghostT > 0) continue;
          const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz); if (d > 20 || d < 0.3) continue;
          const cosA = (dx * fx + dz * fz) / d; if (cosA < 0.78) continue;
          const f = 4200 * Math.sqrt(1 - d / 20) * (0.45 + 0.55 * (cosA - 0.78) / 0.22);
          o.vx += dx / d * f * o.inv * dt; o.vz += dz / d * f * o.inv * dt;
          o.blownT = 0.25; o.lastHit = { by: c, t: now };
        }
      }
    } else if (c.state === 'ko') {
      c.koT += dt;
      if (c.koT > 3.0) { if (c.out) c.state = 'out'; else respawn(c); }
    }
  }
  // melons
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
  // juice puddles
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
  // free sample over the pond
  const S = GAME.sample;
  if (!S.active) {
    S.t -= dt;
    if (S.t <= 0 && live) {
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
        if (c.lives < GAME.startLives + 2 && SET.lives) c.lives++; else { c.stats.points++; gave = 'point'; }
        GAME.events.push({ t: 'sample', c, gave, x: S.x, y: S.y, z: S.z });
        break;
      }
    }
  }
  for (const p of GAME.peels) p.t += dt;
  for (const p of GAME.pickups) if (!p.active) { p.t -= dt; if (p.t <= 0) p.active = true; }
  for (const p of PARKED) p.alarm = Math.max(0, p.alarm - dt);
  // match flow
  if (GAME.mode === 'play') {
    GAME.timer -= dt;
    const alive = carts.filter(c => !c.out);
    if (GAME.endT < 0 && ((SET.lives && alive.length <= 1) || GAME.timer <= 0)) {
      GAME.endT = 2.6;
      if (SET.lives && alive.length === 1 && GAME.timer > 0) { const w = alive[0]; w.stats.lastCart = 2; w.stats.points += 2; GAME.lastStanding = w; GAME.events.push({ t: 'lastCart', c: w }); }
    }
  }
  if (GAME.endT > 0) { GAME.endT -= dt; if (GAME.endT <= 0) { GAME.mode = 'end'; GAME.events.push({ t: 'end' }); } }
  for (const e of GAME.events) if (e.t === 'land' && !e.done) {
    e.done = true; const c = e.c;
    if (e.air > 0.8 && c.rampFrom && c.rampFrom.name === 'pond' && c.z < -17.5 && c.airStartZ > -1 && c.state === 'drive') { c.stats.clears++; e.clear = 1; }
    c.rampFrom = null;
  }
  PS.length = 0;
}

// end a match early (a player left for good): the one still here wins
function forfeit(i) {
  if (GAME.mode !== 'play' && GAME.mode !== 'countdown') return;
  const c = GAME.carts[i]; if (!c) return;
  c.lives = 0; c.out = true; c.state = 'out'; c.forfeit = true;
  GAME.mode = 'end'; GAME.events.push({ t: 'forfeit', c }); GAME.events.push({ t: 'end' });
}

const r3 = v => Math.round(v * 1000) / 1000;
function snapshot() {
  return {
    t: 'snap', now: r3(GAME.now), mode: GAME.mode, timer: r3(GAME.timer), count: r3(GAME.countT),
    carts: GAME.carts.map(c => [r3(c.x), r3(c.y), r3(c.z), r3(c.yaw), r3(c.pitch), r3(c.roll), r3(c.vx), r3(c.vy), r3(c.vz), r3(c.w),
    r3(c.delta || 0), r3(c.input.steer || 0), r3(c.thrustNow / THRUST), STATE_CODE[c.state], c.lives, c.stats.points, ITEM_CODE[c.item] || 0, c.itemN || 0,
    r3(c.heat), r3(c.overT), r3(c.ghostT), r3(c.spinT), c.boosting ? 1 : 0, c.onGround ? 1 : 0, c.braking ? 1 : 0, r3(c.squash), r3(c.megaT), r3(c.blowerT || 0),
    r3(c.lean || 0), r3(c.airT || 0), c.stats.wipeouts, c.stats.finals, c.stats.self, c.stats.deaths, c.stats.samples || 0, c.stats.lastCart || 0,
    r3(c.stats.topSpeed), r3(c.stats.maxAir), c.stats.clears, c.itemCount || 0]),
    pk: GAME.pickups.map(p => p.active ? 1 : 0).join(''),
    peels: GAME.peels.map(p => [r3(p.x), r3(p.z), r3(p.yaw)]),
    melons: GAME.melons.map(m => [r3(m.x), r3(m.y), r3(m.z), r3(m.vx), r3(m.vy), r3(m.vz), r3(m.spin)]),
    puddles: GAME.puddles.map(p => [r3(p.x), r3(p.z), p.r, r3(p.t), p.life, r3(p.yaw)]),
    sample: GAME.sample && GAME.sample.active ? [r3(GAME.sample.x), r3(GAME.sample.y), r3(GAME.sample.z)] : null
  };
}

// events -> plain JSON (cart references become cart indices)
function drainEvents() {
  const out = [];
  for (const e of GAME.events) {
    const o = {};
    for (const k in e) {
      const v = e[k];
      if (v instanceof Cart) o[k] = v.id;
      else if (k === 's' && v && typeof v === 'object' && !Array.isArray(v)) o.st = STATICS.indexOf(v);
      else if (k === 'w' || k === 'd' || k === 'done') continue;
      else o[k] = (typeof v === 'number') ? r3(v) : v;
    }
    out.push(o);
  }
  GAME.events = [];
  return out;
}

function results() {
  return GAME.carts.map(c => ({ slot: c.id, rider: RIDERS.indexOf(c.rider), name: c.name, lives: c.lives > 999 ? -1 : c.lives, forfeit: !!c.forfeit, ...c.stats }));
}

return { GAME, SET, RIDERS, startMatch, setInput, physicsStep, snapshot, drainEvents, results, forfeit, PHYS_DT };
