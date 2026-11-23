// ---------- riders, carts, physics, wrecks, ragdolls, particles ----------
const G = 9.81, PHYS_DT = 1 / 120;
const SELF_KO_SPEED = 11.0, SHOVED_KO_SPEED = 4.8, SHOVE_WINDOW = 3.5, CREDIT_WINDOW = 4.5, RAIL_VAULT = 6.5;
const HALF_L = 0.62, HALF_W = 0.34;
const RIDERS = [
  { name: 'Gary', helmet: 'colander', shirt: 0x3fbf4a, pants: 0x2d3e63, skin: 0xf1c6a0, mass: 75, icon: '🥣', voice: 1.0, desc: 'Wears a colander. Trusts it completely.' },
  { name: 'Big Deb', helmet: 'pot', shirt: 0xa64bd6, pants: 0x3a2a4f, skin: 0xc68b5e, mass: 100, icon: '🍲', voice: 1.25, desc: 'Heavy. Hard to shove. Slow off the line.' },
  { name: 'Tiny Tim', helmet: 'cone', shirt: 0x2bb8e0, pants: 0x33363b, skin: 0xf5d0b0, mass: 55, icon: '🚧', voice: 1.55, desc: 'Light and zippy. Goes very far when shoved.' },
  { name: 'Nana Rocket', helmet: 'bowl', shirt: 0xff6fa8, pants: 0x6a5a8c, skin: 0xe8b896, mass: 66, icon: '🥗', voice: 1.35, desc: 'Salad bowl helmet. Has done this before.' },
  { name: 'Chad', helmet: 'bucket', shirt: 0xe0402b, pants: 0x2b2b2b, skin: 0xd9a07a, mass: 86, icon: "<svg viewBox='0 0 24 24' width='1em' height='1em' style='vertical-align:-0.15em'><path d='M5 4 Q12 -1 19 4' fill='none' stroke='#555' stroke-width='1.6'/><path d='M4 7h16l-2 14H6z' fill='#e0402b' stroke='#7b1d12' stroke-width='1.2'/><path d='M4 7h16' stroke='#ff8a75' stroke-width='2'/></svg>", voice: 0.85, desc: 'Bucket helmet. Lifts. Never brakes.' },
  { name: 'Box Kid', helmet: 'box', shirt: 0xf2c230, pants: 0x2a4f7a, skin: 0x8d5a3b, mass: 60, icon: '📦', voice: 1.45, desc: 'Cardboard box with eye holes. Fearless.' }
];
const CART_MASS = 18, THRUST = 600, DRAG = 2.3, LAT_K = 620;

class Cart {
  constructor(id, rider, isPlayer) {
    this.id = id; this.rider = rider; this.isPlayer = isPlayer; this.name = rider.name;
    this.col = hexLin(rider.shirt); this.skin = hexLin(rider.skin); this.pants = hexLin(rider.pants);
    this.mass = rider.mass + CART_MASS; this.inv = 1 / this.mass;
    this.I = this.mass * (1.24 * 1.24 + 0.68 * 0.68) / 12 * 0.9; this.invI = 1 / this.I;
    this.input = { throttle: 0, steer: 0, brake: 0, boost: 0, item: 0 };
    this.stats = { wipeouts: 0, self: 0, deaths: 0, topSpeed: 0, maxAir: 0, items: 0, clears: 0, points: 0, finals: 0, samples: 0, lastCart: 0 };
    this.lives = 3; this.out = false; this.item = null; this.lastScoreT = -99;
    this.reset(0, 0, 0);
  }
  reset(x, z, yaw) {
    this.x = x; this.z = z; this.y = groundH(x, z); this.vx = this.vy = this.vz = 0; this.yaw = yaw; this.w = 0;
    this.pitch = 0; this.roll = 0; this.pitchW = 0; this.rollW = 0; this.onGround = true; this.steer = 0; this.wob = F1(0, 6);
    this.heat = 0; this.overT = 0; this.megaT = 0; this.spinT = 0; this.ghostT = 0; this.vaultT = 0; this.blowT = 0;
    this.state = 'drive'; this.koT = 0; this.lastHit = { by: null, t: -99 }; this.airT = 0; this.airStartZ = 0; this.airStartX = 0; this.squash = 0;
    this.thrustNow = 0; this.boosting = false; this.lean = 0; this.prevSpeed = 0; this.braking = false; this.stuckT = 0; this.rampFrom = null;
  }
  get fx() { return Math.sin(this.yaw); } get fz() { return Math.cos(this.yaw); }
  speed() { return Math.hypot(this.vx, this.vz); }
  basis() { return r3YPR(this.yaw, this.pitch, this.roll); }
}

// ---- cart dynamics (one fixed step) ----
function cartStep(c, dt, now) {
  const inp = c.input;
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -fz, rz = fx;
  const vf = c.vx * fx + c.vz * fz, vr = c.vx * rx + c.vz * rz;
  const spd = Math.abs(vf);
  // rope steering: the ropes pull the front casters, with lag and the classic shopping-cart wobble
  const maxSteer = Math.min(0.62 / (1 + spd / 9), 0.13 + 0.73 * 14 / (spd * spd + 1));
  c.steer += (clamp(inp.steer, -1, 1) * maxSteer - c.steer) * Math.min(1, dt * 9);
  c.wob += dt * (15 + spd * 1.3);
  const wob = Math.sin(c.wob) * (0.012 + 0.0055 * Math.min(spd, 16)) * (1 - Math.abs(inp.steer) * 0.6) + (c.spinT > 0 ? Math.sin(c.wob * 2.3) * 0.3 : 0);
  c.delta = c.steer + wob;
  let Fx = 0, Fz = 0, tau = 0;
  const surf = surfaceAt(c.x, c.z);
  c.braking = !!inp.brake && c.onGround;
  if (c.onGround) {
    // grip while rolling (static) vs. sliding sideways (kinetic): steering bites, shoved carts skid far
    const muS = surf === 1 ? 0.9 : 1.4, muK = surf === 1 ? 0.5 : 0.62;
    const vref = Math.max(3, Math.hypot(vf, vr));
    const muOf = slip => lerp(muS, muK, smoothstep(0.14, 0.32, Math.abs(slip) / vref));
    let gF = 1, gR = inp.brake ? 0.45 : 1;
    if (c.spinT > 0) { gF *= 0.2; gR *= 0.2; }
    if (c.blownT > 0) { c.blownT -= dt; gF *= 0.35; gR *= 0.35; }   // caught in a leaf-blower gust: tyres skate
    const N = c.mass * G / 2, a = 0.36, b = 0.37;
    const sd = Math.sin(c.delta), cd = Math.cos(c.delta);
    const latF = -sd * vf + cd * (vr - c.w * a);
    const mF = muOf(latF) * gF * N;
    const fF = clamp(-latF * LAT_K, -mF, mF);
    Fx += fF * (-sd * fx + cd * rx); Fz += fF * (-sd * fz + cd * rz); tau += -a * cd * fF;
    const latR = vr + c.w * b;
    const mR = muOf(latR) * gR * N;
    const fR = clamp(-latR * LAT_K, -mR, mR);
    Fx += fR * rx; Fz += fR * rz; tau += b * fR;
    // rolling resistance (grass is sticky)
    const rr = (surf === 1 ? 0.06 : 0.022) * c.mass * G + 3.5 * spd;
    const fRoll = -Math.sign(vf) * Math.min(rr, spd * c.mass / dt * 0.5);
    Fx += fRoll * fx; Fz += fRoll * fz;
    if (inp.brake) {
      if (spd > 1.0 || inp.throttle > 0.1) {
        const fb = -Math.sign(vf) * Math.min(0.5 * c.mass * G, spd * c.mass / dt * 0.5);
        Fx += fb * fx; Fz += fb * fz;
      } else { // paddle backwards with your feet
        const tgt = -2.3, f = clamp((tgt - vf) * c.mass * 2.5, -c.mass * 3, c.mass * 3);
        Fx += f * fx; Fz += f * fz;
      }
    }
    // slope pulls you downhill (pond banks)
    if (surf === 1 || surf === 2) {
      const gx = (groundH(c.x + 0.3, c.z) - groundH(c.x - 0.3, c.z)) / 0.6, gz = (groundH(c.x, c.z + 0.3) - groundH(c.x, c.z - 0.3)) / 0.6;
      Fx -= c.mass * G * gx; Fz -= c.mass * G * gz;
    }
  }
  // rocket
  let thrust = 0; c.boosting = false;
  if (c.overT > 0) {
    c.overT -= dt; thrust = (Math.sin(now * 31) > 0.75 ? 0.5 : 0) * THRUST * inp.throttle;
    if (c.overT <= 0) c.heat = 0.35;
  } else {
    thrust = inp.throttle * THRUST;
    if (inp.boost && inp.throttle > 0.05) { thrust *= 1.75; c.heat += dt * 0.34; c.boosting = true; }
    else c.heat -= dt * (inp.throttle > 0.05 ? 0.12 : 0.28);
    c.heat = clamp(c.heat, 0, 1);
    if (c.heat >= 1) { c.overT = 2.4; c.heat = 1; GAME.events.push({ t: 'overheat', c }); }
  }
  if (c.megaT > 0) { c.megaT -= dt; thrust = THRUST * 2.7; c.boosting = true; }
  c.thrustNow = thrust;
  Fx += thrust * fx; Fz += thrust * fz;
  // leaf blower recoil (gentle)
  if (c.blowT > 0) { c.blowT -= dt; Fx -= fx * 60; Fz -= fz * 60; }
  // air drag
  const sp = Math.hypot(c.vx, c.vz);
  Fx -= DRAG * sp * c.vx; Fz -= DRAG * sp * c.vz;
  c.vx += Fx * c.inv * dt; c.vz += Fz * c.inv * dt;
  if (c.onGround) { c.w += tau * c.invI * dt; c.w *= (1 - dt * 0.6); }
  else { c.w += (-clamp(inp.steer, -1, 1) * 1.8 - c.w) * dt * 0.8; }
  if (c.spinT > 0) { c.spinT -= dt; }
  c.yaw = wrapA(c.yaw + c.w * dt);
  // move with step limits (curbs ok, ramp sides and dock block)
  const nx = c.x + c.vx * dt, nz = c.z + c.vz * dt;
  const gNew = groundH(nx, nz);
  if (c.onGround && gNew - c.y > 0.36) {
    const e = 0.25; const gx = groundH(c.x + e, c.z) - groundH(c.x - e, c.z), gz = groundH(c.x, c.z + e) - groundH(c.x, c.z - e);
    let l = Math.hypot(gx, gz) || 1; const n0 = -gx / l, n1 = -gz / l;
    const vn = c.vx * n0 + c.vz * n1;
    if (vn < 0) { c.vx -= 1.4 * vn * n0; c.vz -= 1.4 * vn * n1; }
    GAME.events.push({ t: 'bump', c, s: -vn });
  } else { c.x = nx; c.z = nz; }
  const g = groundH(c.x, c.z);
  if (c.onGround) {
    if (g < c.y - 0.12) { c.onGround = false; c.airT = 0; c.airStartX = c.x; c.airStartZ = c.z; }
    else {
      const [rh, ramp] = rampAt(c.x, c.z);
      if (ramp && rh > 0.02) { const va = c.vx * ramp.fx + c.vz * ramp.fz; c.vy = va * ramp.H / ramp.L; c.rampFrom = ramp; c.pitchW = 0; }
      else if (surf === 1 || surf === 2) { const gx = (groundH(c.x + 0.3, c.z) - groundH(c.x - 0.3, c.z)) / 0.6, gz = (groundH(c.x, c.z + 0.3) - groundH(c.x, c.z - 0.3)) / 0.6; c.vy = gx * c.vx + gz * c.vz; }
      else c.vy = 0;
      c.y = g;
      // ground pitch/roll for visuals
      const tp = Math.atan2(groundH(c.x + fx * 0.45, c.z + fz * 0.45) - groundH(c.x - fx * 0.45, c.z - fz * 0.45), 0.9);
      const tr = Math.atan2(groundH(c.x + rx * 0.3, c.z + rz * 0.3) - groundH(c.x - rx * 0.3, c.z - rz * 0.3), 0.6);
      c.pitch = damp(c.pitch, tp, 18, dt); c.roll = damp(c.roll, -tr * 0.8, 18, dt);
    }
  }
  if (!c.onGround) {
    c.airT += dt;
    c.vy -= G * dt; c.y += c.vy * dt;
    c.pitchW -= 1.0 * dt; c.pitch += c.pitchW * dt; c.roll += c.rollW * dt; c.rollW *= (1 - dt * 0.3);
    if (c.y <= g) {
      const impact = -c.vy; c.y = g;
      if (c.airT > 0.35) GAME.events.push({ t: 'land', c, impact, air: c.airT });
      c.stats.maxAir = Math.max(c.stats.maxAir, c.airT);
      const relP = c.pitch - Math.atan2(groundH(c.x + fx * 0.45, c.z + fz * 0.45) - groundH(c.x - fx * 0.45, c.z - fz * 0.45), 0.9);
      if ((Math.abs(c.roll) > 1.05 || Math.abs(relP) > 1.15) && impact > 2.5) { knockOut(c, 'flop', { x: c.x, z: c.z }); return; }
      if (impact > 3.8) { c.vy = impact * 0.22; c.squash = Math.min(1, impact / 9); c.airT = 0.0; }
      else { c.onGround = true; c.vy = 0; c.rollW = 0; c.pitchW = 0; c.squash = Math.max(c.squash, Math.min(1, impact / 9)); }
      c.roll *= 0.5;
    }
  }
  c.squash = Math.max(0, c.squash - dt * 4);
  c.vaultT = Math.max(0, c.vaultT - dt); c.ghostT = Math.max(0, c.ghostT - dt);
  // lean (visual)
  const latAcc = vf * c.w;
  c.lean = damp(c.lean, clamp(-latAcc * 0.035 + inp.steer * 0.25, -0.6, 0.6), 8, dt);
  const s2 = c.speed(); c.stats.topSpeed = Math.max(c.stats.topSpeed, s2);
  // hazards that aren't walls
  if (c.x > CLIFF_X + 0.35) { knockOut(c, 'cliff', { x: c.x, z: c.z }); return; }
  if (c.y <= WATER_Y + 0.02 && pondSD(c.x, c.z) < -0.15) { knockOut(c, 'pond', { x: c.x, z: c.z }); return; }
}

// ---- oriented box helpers (2D, xz) ----
function cartAxes(c) { const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); return [fx, fz, -fz, fx]; }
function boxCorners(cx, cz, ax, az, bx, bz, hl, hw) { // a = long axis, b = short axis
  return [[cx + ax * hl + bx * hw, cz + az * hl + bz * hw], [cx + ax * hl - bx * hw, cz + az * hl - bz * hw], [cx - ax * hl - bx * hw, cz - az * hl - bz * hw], [cx - ax * hl + bx * hw, cz - az * hl + bz * hw]];
}
// SAT between two oriented boxes; returns {nx,nz,depth,px,pz} with n pointing from A to B, or null
function satBoxes(A, B) {
  const axes = [[A.ax, A.az], [A.bx, A.bz], [B.ax, B.az], [B.bx, B.bz]];
  let best = 1e9, bn = null, bi = -1;
  const dx = B.x - A.x, dz = B.z - A.z;
  for (let i = 0; i < 4; i++) {
    const [nx, nz] = axes[i];
    const ra = A.hl * Math.abs(A.ax * nx + A.az * nz) + A.hw * Math.abs(A.bx * nx + A.bz * nz);
    const rb = B.hl * Math.abs(B.ax * nx + B.az * nz) + B.hw * Math.abs(B.bx * nx + B.bz * nz);
    const d = dx * nx + dz * nz; const ov = ra + rb - Math.abs(d);
    if (ov <= 0) return null;
    if (ov < best) { best = ov; bn = d < 0 ? [-nx, -nz] : [nx, nz]; bi = i; }
  }
  // contact point: deepest corner
  let px, pz;
  if (bi < 2) { // axis from A: B's corner most toward A
    const cs = boxCorners(B.x, B.z, B.ax, B.az, B.bx, B.bz, B.hl, B.hw); let m = 1e9;
    for (const [x, z] of cs) { const p = x * bn[0] + z * bn[1]; if (p < m) { m = p; px = x; pz = z; } }
  } else {
    const cs = boxCorners(A.x, A.z, A.ax, A.az, A.bx, A.bz, A.hl, A.hw); let m = -1e9;
    for (const [x, z] of cs) { const p = x * bn[0] + z * bn[1]; if (p > m) { m = p; px = x; pz = z; } }
  }
  return { nx: bn[0], nz: bn[1], depth: best, px, pz };
}
function cartBox(c) { const [ax, az, bx, bz] = cartAxes(c); return { x: c.x, z: c.z, ax, az, bx, bz, hl: HALF_L, hw: HALF_W }; }
function staticBox(s) { return { x: s.x, z: s.z, ax: s.s, az: s.c, bx: s.c, bz: -s.s, hl: s.hz, hw: s.hx }; }

function koSpeed(c, now) { return (now - c.lastHit.t < SHOVE_WINDOW) ? SHOVED_KO_SPEED : SELF_KO_SPEED; }

function collideStatics(c, now) {
  const CB = cartBox(c);
  for (const s of STATICS) {
    if (c.y > s.y1 - 0.15 || c.y + 1.2 < s.y0) continue;
    if (s.kind === 'rail' && c.vaultT > 0) continue;
    const dxs = c.x - s.x, dzs = c.z - s.z;
    const rad = s.shape === 'circ' ? s.r + 0.8 : Math.max(s.hx, s.hz) + 0.8;
    if (dxs * dxs + dzs * dzs > rad * rad) continue;
    let hit = null;
    if (s.shape === 'box') { const r = satBoxes(staticBox(s), CB); if (r) hit = r; }
    else {
      // circle vs cart box: closest point on box to circle center
      const lx = (s.x - c.x) * CB.ax + (s.z - c.z) * CB.az, lz = (s.x - c.x) * CB.bx + (s.z - c.z) * CB.bz;
      const qx = clamp(lx, -HALF_L, HALF_L), qz = clamp(lz, -HALF_W, HALF_W);
      const px = c.x + CB.ax * qx + CB.bx * qz, pz = c.z + CB.az * qx + CB.bz * qz;
      let dx = px - s.x, dz = pz - s.z, d = Math.hypot(dx, dz);
      if (d < s.r) {
        if (d < 1e-5) { dx = c.x - s.x; dz = c.z - s.z; d = Math.hypot(dx, dz) || 1; }
        hit = { nx: dx / d, nz: dz / d, depth: s.r - d, px, pz };
      }
    }
    if (!hit) continue;
    // push out
    c.x += hit.nx * hit.depth; c.z += hit.nz * hit.depth;
    const rxp = hit.px - c.x, rzp = hit.pz - c.z;
    const vpx = c.vx + c.w * rzp, vpz = c.vz - c.w * rxp;
    const vn = vpx * hit.nx + vpz * hit.nz;
    const vnc = c.vx * hit.nx + c.vz * hit.nz;
    if (vn >= 0) continue;
    const kind = s.kind;
    if (kind === 'rail' && -vnc > RAIL_VAULT) {
      c.vaultT = 0.7; c.onGround = false; c.vy = 2.6 + (-vnc) * 0.12; c.rollW = F1(-2, 2); c.pitchW = 1.5; c.airT = 0;
      c.x -= hit.nx * hit.depth; c.z -= hit.nz * hit.depth;
      GAME.events.push({ t: 'vault', c, x: hit.px, z: hit.pz, s: -vnc });
      continue;
    }
    if (KINDS[kind].hazard && -vnc > koSpeed(c, now) && c.state === 'drive') {
      c.vx -= vnc * hit.nx * 1.3; c.vz -= vnc * hit.nz * 1.3;
      knockOut(c, kind, { x: hit.px, z: hit.pz, nx: hit.nx, nz: hit.nz, s: -vnc, st: s });
      return;
    }
    const rxn = rzp * hit.nx - rxp * hit.nz;
    const e = 0.32;
    const j = -(1 + e) * vn / (c.inv + rxn * rxn * c.invI);
    c.vx += j * hit.nx * c.inv; c.vz += j * hit.nz * c.inv; c.w += rxn * j * c.invI;
    // scrape friction
    const tx = -hit.nz, tz = hit.nx, vt = c.vx * tx + c.vz * tz; c.vx -= vt * tx * 0.15; c.vz -= vt * tz * 0.15;
    GAME.events.push({ t: 'hitStatic', c, s, x: hit.px, z: hit.pz, imp: -vn });
  }
}

function collideCarts(a, b, now) {
  if (a.ghostT > 0 || b.ghostT > 0) return;
  if (Math.abs(a.y - b.y) > 0.85) return;
  const dx = b.x - a.x, dz = b.z - a.z; if (dx * dx + dz * dz > 2.2) return;
  const r = satBoxes(cartBox(a), cartBox(b)); if (!r) return;
  const tot = a.inv + b.inv;
  a.x -= r.nx * r.depth * a.inv / tot; a.z -= r.nz * r.depth * a.inv / tot;
  b.x += r.nx * r.depth * b.inv / tot; b.z += r.nz * r.depth * b.inv / tot;
  const rax = r.px - a.x, raz = r.pz - a.z, rbx = r.px - b.x, rbz = r.pz - b.z;
  const vax = a.vx + a.w * raz, vaz = a.vz - a.w * rax, vbx = b.vx + b.w * rbz, vbz = b.vz - b.w * rbx;
  const vn = (vbx - vax) * r.nx + (vbz - vaz) * r.nz;
  if (vn >= 0) return;
  const ran = raz * r.nx - rax * r.nz, rbn = rbz * r.nx - rbx * r.nz;
  const e = 0.55;
  const j = -(1 + e) * vn / (a.inv + b.inv + ran * ran * a.invI + rbn * rbn * b.invI);
  a.vx -= j * r.nx * a.inv; a.vz -= j * r.nz * a.inv; a.w -= ran * j * a.invI;
  b.vx += j * r.nx * b.inv; b.vz += j * r.nz * b.inv; b.w += rbn * j * b.invI;
  // who rammed whom
  const sa = a.vx * r.nx + a.vz * r.nz, sb = -(b.vx * r.nx + b.vz * r.nz);
  const closeA = (a.vx + j * r.nx * a.inv) * r.nx, closeB = 0;
  const attacker = sa >= sb ? a : b, victim = attacker === a ? b : a;
  const dir = attacker === a ? 1 : -1;
  // arcade shove bonus: the victim gets an extra kick, more when the attacker is boosting
  const bonus = j * (attacker.megaT > 0 ? 1.5 : attacker.boosting ? 1.0 : 0.55);
  victim.vx += dir * r.nx * bonus * victim.inv; victim.vz += dir * r.nz * bonus * victim.inv;
  if (!victim.onGround || j * victim.inv > 4) victim.rollW += F1(-1, 1) * j * victim.inv * 0.3;
  victim.lastHit = { by: attacker, t: now }; a.lastContact = now; b.lastContact = now;
  if (j * attacker.inv > 3) attacker.lastHit = { by: victim, t: now };
  GAME.events.push({ t: 'cartHit', a: attacker, b: victim, x: r.px, z: r.pz, y: (a.y + b.y) / 2, imp: j / 60 });
}

// ---- rider pose (15 points) ----
// 0 head 1 neck 2 lSh 3 rSh 4 lEl 5 lHa 6 rEl 7 rHa 8 pelvis 9 lHip 10 rHip 11 lKn 12 lFt 13 rKn 14 rFt
const RD_STICKS = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3], [1, 8], [2, 8], [3, 8], [8, 9], [8, 10], [9, 10], [2, 9], [3, 10], [2, 10], [3, 9],
[2, 4], [4, 5], [3, 6], [6, 7], [9, 11], [11, 12], [10, 13], [13, 14]];
function riderLocal(c, t) {
  const st = c.input.steer || 0, brake = c.braking, lean = c.lean;
  const thr = c.input.throttle || 0;
  const bob = Math.sin(t * 9 + c.id) * 0.008 * Math.min(1, c.speed() / 4);
  const P = [];
  const pel = [0, 0.62, -0.12];
  const neck = [-lean * 0.22, 1.07 + bob, -0.07 + thr * 0.05 - (brake ? 0.1 : 0)];
  P[8] = pel; P[9] = [0.1, 0.62, -0.08]; P[10] = [-0.1, 0.62, -0.08];
  P[1] = neck; P[2] = [neck[0] + 0.17, neck[1] - 0.05, neck[2]]; P[3] = [neck[0] - 0.17, neck[1] - 0.05, neck[2]];
  P[0] = [neck[0] - lean * 0.08, neck[1] + 0.27, neck[2] + 0.03];
  const pullL = Math.max(0, -st), pullR = Math.max(0, st);
  P[5] = [0.15, 0.93 + pullL * 0.05, 0.24 - pullL * 0.2 + pullR * 0.06];
  P[7] = [-0.15, 0.93 + pullR * 0.05, 0.24 - pullR * 0.2 + pullL * 0.06];
  P[4] = [(P[2][0] + P[5][0]) / 2 + 0.09, (P[2][1] + P[5][1]) / 2 - 0.09, (P[2][2] + P[5][2]) / 2 - 0.04];
  P[6] = [(P[3][0] + P[7][0]) / 2 - 0.09, (P[3][1] + P[7][1]) / 2 - 0.09, (P[3][2] + P[7][2]) / 2 - 0.04];
  if (brake) {
    P[11] = [0.13, 0.72, 0.42]; P[12] = [0.15, 0.2, 0.78]; P[13] = [-0.13, 0.72, 0.42]; P[14] = [-0.15, 0.2, 0.78];
  } else {
    const kick = Math.sin(t * 12 + c.id) * 0.03 * Math.min(1, c.speed() / 6);
    P[11] = [0.12, 0.99, 0.37]; P[12] = [0.14, 0.7 + kick, 0.62]; P[13] = [-0.12, 0.99, 0.37]; P[14] = [-0.14, 0.7 - kick, 0.62];
  }
  return P;
}
function cartWorldMatrix(c) {
  const B = c.basis();
  return { B, M: m4basis(new Float32Array(16), B, c.x, c.y, c.z, 1, 1 - c.squash * 0.18, 1) };
}
function localToWorld(c, B, p) { const q = r3apply(B, p[0], p[1] * (1 - c.squash * 0.18), p[2]); return [q[0] + c.x, q[1] + c.y, q[2] + c.z]; }

// ---- ragdoll ----
class Ragdoll {
  constructor(points, vel, c) {
    this.p = points.map(q => q.slice()); this.o = points.map((q, i) => [q[0] - vel[i][0] * PHYS_DT, q[1] - vel[i][1] * PHYS_DT, q[2] - vel[i][2] * PHYS_DT]);
    this.len = RD_STICKS.map(([a, b]) => Math.hypot(points[a][0] - points[b][0], points[a][1] - points[b][1], points[a][2] - points[b][2]));
    this.c = c; this.t = 0; this.fade = 1; this.wet = false; this.seed = F1(0, 10);
  }
  step(dt) {
    this.t += dt;
    const p = this.p, o = this.o;
    for (let i = 0; i < p.length; i++) {
      const q = p[i], r = o[i];
      let vx = (q[0] - r[0]), vy = (q[1] - r[1]), vz = (q[2] - r[2]);
      const inW = q[1] < WATER_Y && pondSD(q[0], q[2]) < 0;
      const dmp = inW ? 0.9 : 0.995;
      r[0] = q[0]; r[1] = q[1]; r[2] = q[2];
      q[0] += vx * dmp; q[1] += vy * dmp - (inW ? -0.6 * G * dt * dt * (i === 0 || i === 1 || i === 8 ? 1.3 : 0.6) : G * dt * dt); q[2] += vz * dmp;
      if (inW) { this.wet = true; if (Math.random() < 0.02 && this.t < 4) fxBubble(q[0], WATER_Y, q[2]); }
    }
    for (let it = 0; it < 6; it++) {
      for (let k = 0; k < RD_STICKS.length; k++) {
        const [a, b] = RD_STICKS[k]; const A = p[a], B2 = p[b];
        const dx = B2[0] - A[0], dy = B2[1] - A[1], dz = B2[2] - A[2]; const d = Math.hypot(dx, dy, dz) || 1e-6;
        const diff = (d - this.len[k]) / d * 0.5;
        A[0] += dx * diff; A[1] += dy * diff; A[2] += dz * diff; B2[0] -= dx * diff; B2[1] -= dy * diff; B2[2] -= dz * diff;
      }
      for (let i = 0; i < p.length; i++) {
        const q = p[i]; const rad = i === 0 ? 0.15 : 0.07;
        const g = groundH(q[0], q[2]) + rad;
        if (q[1] < g && q[0] < CLIFF_X + 0.2) { q[1] = g; const r = o[i]; r[0] = lerp(r[0], q[0], 0.3); r[2] = lerp(r[2], q[2], 0.3); }
        if (q[0] > CLIFF_X && q[1] < LAKE_Y + 0.1) { q[1] = LAKE_Y + 0.1; const r = o[i]; r[0] = lerp(r[0], q[0], 0.2); r[2] = lerp(r[2], q[2], 0.2); r[1] = q[1]; }
      }
    }
    // walls (once per step)
    const ctr = p[8];
    for (const s of STATICS) {
      const dxs = ctr[0] - s.x, dzs = ctr[2] - s.z; const rr = s.shape === 'circ' ? s.r + 1.4 : Math.max(s.hx, s.hz) + 1.4;
      if (dxs * dxs + dzs * dzs > rr * rr) continue;
      for (let i = 0; i < p.length; i++) {
        const q = p[i]; const rad = i === 0 ? 0.15 : 0.07;
        if (q[1] > s.y1 + 0.1 || q[1] < s.y0 - 0.1) continue;
        const [, , d, nx, nz] = staticClosest(s, q[0], q[2]);
        if (d < rad) { q[0] += nx * (rad - d); q[2] += nz * (rad - d); const r = o[i]; r[0] = lerp(r[0], q[0], 0.4); r[2] = lerp(r[2], q[2], 0.4); }
      }
    }
  }
}

// ---- wrecks (the cart tumbling after a wipeout) ----
class Wreck {
  constructor(c) {
    this.c = c; this.x = c.x; this.y = c.y; this.z = c.z; this.vx = c.vx; this.vy = c.vy; this.vz = c.vz;
    this.B = c.basis(); this.wx = F1(-3, 3); this.wy = c.w; this.wz = F1(-3, 3); this.t = 0; this.sink = 0; this.smoke = 3;
  }
  step(dt) {
    this.t += dt;
    const inPond = pondSD(this.x, this.z) < 0 && this.y < WATER_Y + 0.2;
    const overCliff = this.x > CLIFF_X;
    if (inPond) {
      this.sink += dt;
      const buoy = this.sink < 1.2 ? 1.25 : 0.55;
      this.vy += (-G + G * buoy * clamp((WATER_Y - this.y + 0.3) / 0.6, 0, 1.5)) * dt;
      this.vx *= 1 - dt * 2.5; this.vz *= 1 - dt * 2.5; this.vy *= 1 - dt * 2.0;
      this.wx *= 1 - dt * 2; this.wz *= 1 - dt * 2; this.wy *= 1 - dt * 2;
    } else this.vy -= G * dt;
    this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
    const g = overCliff ? LAKE_Y - 3 : groundH(this.x, this.z);
    if (overCliff && this.y < LAKE_Y && !this.splashed) { this.splashed = true; GAME.events.push({ t: 'lakeSplash', x: this.x, z: this.z }); this.vy *= 0.2; this.vx *= 0.3; this.vz *= 0.3; }
    if (overCliff && this.y < LAKE_Y) { this.vy += G * 0.8 * dt; this.vy *= 1 - dt * 2; }
    if (!overCliff && !inPond && this.y < g + 0.25) {
      this.y = g + 0.25;
      if (this.vy < -1.5) GAME.events.push({ t: 'wreckBounce', w: this, s: -this.vy });
      this.vy = -this.vy * 0.35; this.vx *= 0.82; this.vz *= 0.82;
      this.wx *= 0.7; this.wz *= 0.7; this.wy *= 0.8;
      // settle on its side
      const up = this.B[4];
      if (Math.abs(this.vy) < 0.8 && Math.hypot(this.vx, this.vz) < 1.5) { const side = this.B[1] > 0 ? 1 : -1; this.wz += (up > 0.6 ? 2.5 * side : 0) * dt * 10; }
    }
    for (const s of STATICS) {
      if (this.y > s.y1 + 0.3) continue;
      const [, , d, nx, nz] = staticClosest(s, this.x, this.z);
      if (d < 0.45) { this.x += nx * (0.45 - d); this.z += nz * (0.45 - d); const vn = this.vx * nx + this.vz * nz; if (vn < 0) { this.vx -= 1.4 * vn * nx; this.vz -= 1.4 * vn * nz; } }
    }
    const wl = Math.hypot(this.wx, this.wy, this.wz);
    if (wl > 1e-4) { this.B = r3orth(m3mul(r3axis(this.wx / wl, this.wy / wl, this.wz / wl, wl * dt), this.B)); }
  }
}

// ---- debris (groceries, cones, boxes) ----
class Debris {
  constructor(mesh, x, y, z, vx, vy, vz, tint, life = 9, rad = 0.08) {
    this.mesh = mesh; this.x = x; this.y = y; this.z = z; this.vx = vx; this.vy = vy; this.vz = vz; this.tint = tint || [1, 1, 1];
    this.B = r3YPR(F1(0, TAU), F1(-1, 1), F1(-1, 1)); const a = [F1(-1, 1), F1(-1, 1), F1(-1, 1)]; const l = Math.hypot(...a) || 1;
    this.ax = a.map(v => v / l); this.av = F1(4, 14); this.life = life; this.t = 0; this.rad = rad; this.rest = false; this.persist = false;
  }
  step(dt) {
    this.t += dt;
    if (this.rest) return;
    const inW = pondSD(this.x, this.z) < 0 && this.y < WATER_Y + 0.02;
    if (inW) { this.vy += (G * 1.6 * clamp((WATER_Y - this.y) / 0.1, 0, 1) - G) * dt; this.vx *= 1 - dt * 1.5; this.vz *= 1 - dt * 1.5; this.vy *= 1 - dt * 3; this.av *= 1 - dt * 2; }
    else this.vy -= G * dt;
    this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
    const g = this.x > CLIFF_X ? LAKE_Y : groundH(this.x, this.z);
    if (this.y < g + this.rad && !inW) {
      this.y = g + this.rad;
      if (this.vy < 0) this.vy = -this.vy * 0.35;
      this.vx *= 0.75; this.vz *= 0.75; this.av *= 0.7;
      if (Math.abs(this.vy) < 0.4 && Math.hypot(this.vx, this.vz) < 0.25) { this.rest = this.persist; this.vy = 0; if (this.persist) { this.av = 0; } }
    }
    for (const s of STATICS) {
      if (this.y > s.y1) continue;
      const dxs = this.x - s.x, dzs = this.z - s.z, rr = s.shape === 'circ' ? s.r + 0.6 : Math.max(s.hx, s.hz) + 0.6;
      if (dxs * dxs + dzs * dzs > rr * rr) continue;
      const [, , d, nx, nz] = staticClosest(s, this.x, this.z);
      if (d < this.rad) { this.x += nx * (this.rad - d); this.z += nz * (this.rad - d); const vn = this.vx * nx + this.vz * nz; if (vn < 0) { this.vx -= 1.5 * vn * nx; this.vz -= 1.5 * vn * nz; } }
    }
    if (this.av > 0.01) this.B = r3orth(m3mul(r3axis(this.ax[0], this.ax[1], this.ax[2], this.av * dt), this.B));
  }
}

// ---- particles ----
const PS = [];
function particle(o) { if (PS.length > 3500) PS.shift(); o.t = 0; PS.push(o); return o; }
function fxSmoke(x, y, z, vx, vy, vz, size, life, shade = 0.75, alpha = 0.5) {
  particle({ x, y, z, vx, vy, vz, life, s0: size * 0.5, s1: size * 2.2, r: shade, g: shade, b: shade * 1.02, a: alpha, kind: 0, add: false, drag: 1.4, grav: -0.4, rot: F1(0, TAU), rv: F1(-1, 1) });
}
function fxFlame(x, y, z, vx, vy, vz, size, life, hot) {
  particle({ x, y, z, vx, vy, vz, life, s0: size, s1: size * 0.3, r: hot ? 0.75 : 1.0, g: hot ? 0.85 : 0.62, b: hot ? 1.0 : 0.18, a: 0.9, kind: 1, add: true, drag: 2, grav: 0.5, rot: 0, rv: 0 });
}
function fxSparks(x, y, z, n, nx = 0, nz = 0) {
  for (let i = 0; i < n; i++) particle({ x, y, z, vx: nx * 3 + F1(-4, 4), vy: F1(1, 5), vz: nz * 3 + F1(-4, 4), life: F1(0.25, 0.6), s0: 0.035, s1: 0.01, r: 1, g: 0.8, b: 0.35, a: 1, kind: 2, add: true, drag: 1, grav: 1, rot: 0, rv: 0 });
}
function fxSplash(x, z, n, power = 1, y = WATER_Y) {
  for (let i = 0; i < n; i++) {
    const a = F1(0, TAU), r = F1(0.5, 3.5) * power;
    particle({ x: x + F1(-0.3, 0.3), y, z: z + F1(-0.3, 0.3), vx: Math.cos(a) * r, vy: F1(3, 8) * power, vz: Math.sin(a) * r, life: F1(0.6, 1.3), s0: F1(0.05, 0.12) * Math.sqrt(power), s1: 0.03, r: 0.85, g: 0.93, b: 1, a: 0.85, kind: 2, add: false, drag: 0.4, grav: 1, rot: 0, rv: 0, water: true });
  }
  for (let i = 0; i < n / 4; i++) particle({ x: x + F1(-0.6, 0.6), y: y + 0.1, z: z + F1(-0.6, 0.6), vx: F1(-1, 1), vy: F1(0.3, 1.5), vz: F1(-1, 1), life: F1(0.8, 1.5), s0: 0.4 * power, s1: 1.4 * power, r: 0.92, g: 0.96, b: 1, a: 0.5, kind: 0, add: false, drag: 2, grav: 0.2, rot: F1(0, 6), rv: 0 });
  addRipple(x, z, Math.min(1.5, power));
}
function fxBubble(x, y, z) { particle({ x: x + F1(-0.2, 0.2), y: y + 0.02, z: z + F1(-0.2, 0.2), vx: 0, vy: 0.2, vz: 0, life: 0.6, s0: 0.04, s1: 0.08, r: 0.9, g: 0.95, b: 1, a: 0.7, kind: 2, add: false, drag: 3, grav: 0, rot: 0, rv: 0 }); }
function fxDust(x, y, z, n, s = 1) {
  for (let i = 0; i < n; i++) particle({ x: x + F1(-0.3, 0.3), y: y + 0.05, z: z + F1(-0.3, 0.3), vx: F1(-1.5, 1.5) * s, vy: F1(0.2, 1.4) * s, vz: F1(-1.5, 1.5) * s, life: F1(0.6, 1.4), s0: 0.15 * s, s1: 0.8 * s, r: 0.72, g: 0.68, b: 0.6, a: 0.4, kind: 0, add: false, drag: 2, grav: -0.1, rot: F1(0, 6), rv: F1(-1, 1) });
}
function fxConfetti(x, y, z, n) {
  const cols = [[1, 0.3, 0.3], [1, 0.85, 0.2], [0.3, 0.8, 1], [0.5, 1, 0.4], [1, 0.4, 0.9]];
  for (let i = 0; i < n; i++) { const c = cols[i % 5]; particle({ x, y, z, vx: F1(-4, 4), vy: F1(3, 9), vz: F1(-4, 4), life: F1(1.5, 3), s0: 0.05, s1: 0.05, r: c[0], g: c[1], b: c[2], a: 1, kind: 3, add: false, drag: 1.8, grav: 0.35, rot: F1(0, 6), rv: F1(-12, 12) }); }
}
function fxMelon(x, y, z) {
  for (let i = 0; i < 40; i++) { const red = i % 3 !== 0; particle({ x, y, z, vx: F1(-5, 5), vy: F1(1, 6), vz: F1(-5, 5), life: F1(0.6, 1.3), s0: F1(0.05, 0.11), s1: 0.03, r: red ? 0.95 : 0.2, g: red ? 0.2 : 0.55, b: red ? 0.25 : 0.2, a: 1, kind: 2, add: false, drag: 0.6, grav: 1, rot: 0, rv: 0 }); }
}
function addRipple(x, z, s) {
  const i = (RND.rippleN < 12 ? RND.rippleN++ : (RND.ripI = ((RND.ripI || 0) + 1) % 12));
  RND.ripples[i * 4] = x; RND.ripples[i * 4 + 1] = z; RND.ripples[i * 4 + 2] = RND.time; RND.ripples[i * 4 + 3] = s;
}
function stepParticles(dt) {
  for (let i = PS.length - 1; i >= 0; i--) {
    const p = PS[i]; p.t += dt;
    if (p.t >= p.life) { PS.splice(i, 1); continue; }
    const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; p.vy -= p.grav * G * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.rv * dt;
    if (p.water && p.y < WATER_Y && p.vy < 0 && pondSD(p.x, p.z) < 0) { p.t = p.life; if (Math.random() < 0.1) addRipple(p.x, p.z, 0.3); }
    if (p.kind === 2 && !p.water) { const g = p.x > CLIFF_X ? LAKE_Y : groundH(p.x, p.z); if (p.y < g) { p.y = g; p.vy *= -0.3; p.vx *= 0.5; p.vz *= 0.5; } }
  }
}
function pushParticles(q) {
  for (const p of PS) {
    const u = p.t / p.life; const s = lerp(p.s0, p.s1, u);
    let a = p.a * (p.kind === 1 ? (1 - u) : (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85)) * q;
    if (p.kind === 3) a = p.a * (u > 0.8 ? (1 - u) * 5 : 1);
    if (p.kind === 1) glPart(PART.add, p.x, p.y, p.z, s, p.r * (1 - u * 0.3), p.g * (1 - u * 0.6), p.b * (1 - u), a, p.rot, 1);
    else glPart(p.add ? PART.add : PART.alpha, p.x, p.y, p.z, s, p.r, p.g, p.b, a, p.rot, p.kind);
  }
}
