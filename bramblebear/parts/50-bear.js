// ---------- the bear: movement, water, actions, jointed animation ----------
const BR = {
  x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, yaw: 0, pitch: 0, onGround: true,
  speed: 0, run: false, swim: false, depth: 0, wet: 0, shakeT: 0, inWaterT: 0,
  phase: 0, stand: 0, roarT: 0, swipeT: 0, swipeHit: false, jumpCD: 0,
  carry: null, carryT: 0, eatT: 0, headPitch: 0, lakeEntry: null, stepT: 0, fallsT: 0
};
const WALK = 3.2, RUN = 8.5, SWIM = 2.4;
function bearSpawn(x, z, yaw) { BR.x = x; BR.z = z; BR.y = groundH(x, z); BR.vx = BR.vz = BR.vy = 0; BR.yaw = yaw; BR.onGround = true; BR.carry = null; BR.swim = false; }
function bearFwd() { return [Math.sin(BR.yaw), Math.cos(BR.yaw)]; }
// the point in front of the nose where paws and jaws reach
function bearSnout(reach = 1.35) { const [fx, fz] = bearFwd(); return [BR.x + fx * reach, BR.y + (BR.swim ? 0.55 : 0.9), BR.z + fz * reach]; }

// inp: {mx, mz} camera-relative move (-1..1), run, jump
function bearStep(dt, inp, camYaw) {
  const f = [Math.sin(camYaw), Math.cos(camYaw)], rgt = [-f[1], f[0]];
  let wx = f[0] * inp.mz + rgt[0] * inp.mx, wz = f[1] * inp.mz + rgt[1] * inp.mx;
  const mag = Math.min(1, Math.hypot(wx, wz)); if (mag > 1e-3) { const l = Math.hypot(wx, wz); wx /= l; wz /= l; }
  const busy = BR.roarT > 0 || BR.eatT > 0;
  BR.run = !!inp.run && mag > 0.1 && !BR.swim;
  const top = busy ? 0 : (BR.swim ? SWIM : (BR.run ? RUN : WALK)) * mag * (GAME.belly < 0.08 ? 0.8 : 1);
  // turn toward the move direction; a bear turns its whole body, so turning is quick but not instant
  if (mag > 0.1 && !busy) { const want = Math.atan2(wx, wz); BR.yaw += wrapA(want - BR.yaw) * (1 - Math.exp(-(BR.run ? 7 : 9) * dt)); }
  const [fx, fz] = bearFwd();
  // velocity follows the facing (feels heavy), blended with the stick so strafing still works a little
  const dvx = (fx * 0.75 + wx * 0.25) * top, dvz = (fz * 0.75 + wz * 0.25) * top;
  const acc = BR.onGround || BR.swim ? (top > Math.hypot(BR.vx, BR.vz) ? 6 : 9) : 0.6;
  BR.vx = damp(BR.vx, dvx, acc, dt); BR.vz = damp(BR.vz, dvz, acc, dt);
  // river current pushes swimmers downstream
  if (BR.swim || BR.depth > 0.35) {
    const [ri, rd] = riverNear(BR.x, BR.z);
    if (rd < RIVER.w[ri] + 0.5 && Math.hypot(BR.x - LAKE.x, BR.z - LAKE.z) > LAKE.r) {
      const a = RIVER.pts[Math.max(0, ri - 1)], c = RIVER.pts[Math.min(RIVER.pts.length - 1, ri + 1)], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      const cur = (BR.swim ? 1.3 : 0.5) * (ri < RIVER.falls && ri > RIVER.falls - 12 ? 1.6 : 1);
      BR.x += (c[0] - a[0]) / l * cur * dt; BR.z += (c[1] - a[1]) / l * cur * dt;
    }
  }
  // move with slope check: big bears can't walk up a cliff, but they can tumble down one
  const nx = BR.x + BR.vx * dt, nz = BR.z + BR.vz * dt;
  const h0 = groundH(BR.x, BR.z), h1 = groundH(nx, nz), step = Math.hypot(nx - BR.x, nz - BR.z);
  const wh1 = waterH(nx, nz);
  const steep = step > 1e-4 && (h1 - h0) / step > 1.25 && !(wh1 > h1 + 0.6 && wh1 - BR.y < 1.2);
  if (steep && BR.y < h1 - 0.2) { BR.vx *= 0.3; BR.vz *= 0.3; }
  else { BR.x = nx; BR.z = nz; }
  const p = [BR.x, 0, BR.z]; if (colPush(p, 0.55)) { BR.x = p[0]; BR.z = p[2]; }
  BR.x = clamp(BR.x, -W.HALF + 10, W.HALF - 10); BR.z = clamp(BR.z, -W.HALF + 10, W.HALF - 10);
  // vertical: ground, water and jumps
  const g = groundH(BR.x, BR.z), wh = waterH(BR.x, BR.z);
  BR.depth = wh > -1e8 ? Math.max(0, wh - g) : 0;
  const wasSwim = BR.swim;
  BR.swim = BR.depth > 0.95;
  BR.jumpCD = Math.max(0, BR.jumpCD - dt);
  if (BR.swim) {
    const fy = wh - 0.78 + Math.sin(RND.time * 2.2) * 0.04;
    if (BR.y > fy + 0.3) { BR.vy -= 22 * dt; BR.y += BR.vy * dt; if (BR.y <= fy) { BR.vy = 0; AUD.splash(BR.x, BR.z, 1); bigSplash(BR.x, wh, BR.z, 1.2); } }
    else { BR.y = damp(BR.y, fy, 6, dt); BR.vy = 0; }
    BR.onGround = false;
    if (inp.jump && BR.jumpCD <= 0) { BR.vy = 3.5; BR.y = fy + 0.35; BR.jumpCD = 0.8; AUD.splash(BR.x, BR.z, 0.6); }
  } else {
    if (BR.onGround && inp.jump && BR.jumpCD <= 0 && !busy) { BR.vy = 6.2; BR.onGround = false; BR.jumpCD = 0.5; AUD.huff(); }
    BR.vy -= 22 * dt; BR.y += BR.vy * dt;
    if (BR.y <= g) {
      if (!BR.onGround && BR.vy < -9) { AUD.thud(Math.min(1, -BR.vy / 20)); dustPuff(BR.x, g, BR.z, 10); }
      BR.y = g; BR.vy = 0; BR.onGround = true;
    } else if (BR.onGround && BR.y - g < 0.5 && BR.vy <= 0) { BR.y = g; BR.vy = 0; }   // stick to the ground going downhill
    else BR.onGround = false;
  }
  if (BR.swim && !wasSwim) { AUD.splash(BR.x, BR.z, 0.8); if (Math.hypot(BR.x - LAKE.x, BR.z - LAKE.z) < LAKE.r + 2) BR.lakeEntry = Math.atan2(BR.z - LAKE.z, BR.x - LAKE.x); }
  if (!BR.swim && wasSwim) {
    if (BR.lakeEntry !== null && Math.hypot(BR.x - LAKE.x, BR.z - LAKE.z) > LAKE.r - 6) {
      const out = Math.atan2(BR.z - LAKE.z, BR.x - LAKE.x); if (Math.abs(wrapA(out - BR.lakeEntry)) > 2.0) journalDone('lake');
    }
    BR.lakeEntry = null;
  }
  if (BR.depth > 0.4) { BR.wet = 1; BR.inWaterT += dt; } else if (BR.wet > 0 && BR.onGround) {
    if (BR.inWaterT > 1.5 && BR.shakeT <= 0 && Math.hypot(BR.vx, BR.vz) < 1.5) { BR.shakeT = 1.1; BR.inWaterT = 0; AUD.shake(); }
    BR.wet = Math.max(0, BR.wet - dt * 0.05);
  }
  BR.speed = Math.hypot(BR.vx, BR.vz);
  // body pitch follows the slope
  if (!BR.swim) { const hf = groundH(BR.x + fx * 0.8, BR.z + fz * 0.8), hb = groundH(BR.x - fx * 0.8, BR.z - fz * 0.8); BR.pitch = damp(BR.pitch, clamp(Math.atan2(hf - hb, 1.6), -0.5, 0.5), 8, dt); }
  else BR.pitch = damp(BR.pitch, 0.12, 4, dt);
  // gait
  BR.phase += dt * (BR.swim ? 5 : (BR.speed > 5 ? 2.0 + BR.speed * 0.95 : 1.5 + BR.speed * 1.9));
  if (BR.onGround && BR.speed > 0.6) { BR.stepT -= dt * (BR.speed > 5 ? 2.6 : 1.6) * (0.6 + BR.speed * 0.25); if (BR.stepT <= 0) { BR.stepT = 1; AUD.step(BR.speed > 5, BR.depth > 0.1); } }
  if (BR.depth > 0.15 && BR.speed > 1.2 && Math.random() < dt * 14) splashBits(BR.x + fx * 0.8, wh, BR.z + fz * 0.8, BR.run ? 4 : 2);
  if (BR.swim && Math.random() < dt * 3) addRipple(BR.x, BR.z, 0.6);
  // actions
  BR.roarT = Math.max(0, BR.roarT - dt);
  BR.stand = damp(BR.stand, BR.roarT > 0.25 && !BR.swim ? 1 : 0, 7, dt);
  BR.shakeT = Math.max(0, BR.shakeT - dt);
  if (BR.shakeT > 0 && Math.random() < dt * 60) { const a = Math.random() * TAU; glPart(PART.alpha, BR.x + Math.cos(a) * 0.6, BR.y + 0.9 + Math.random() * 0.5, BR.z + Math.sin(a) * 0.6, 0.05, 0.7, 0.8, 0.9, 0.8, 0, 2); }
  if (BR.swipeT > 0) {
    BR.swipeT = Math.max(0, BR.swipeT - dt);
    if (!BR.swipeHit && BR.swipeT < 0.3) { BR.swipeHit = true; swipeResolve(); }
  }
  if (BR.carry) { BR.carryT -= dt; if (BR.carryT <= 0) { eat(BR.carry); BR.carry = null; } }
  BR.eatT = Math.max(0, BR.eatT - dt);
  // waterfall: standing or swimming in the curtain
  if (SCENERY.fallsBottom) {
    const fb = SCENERY.fallsBottom, ft = SCENERY.fallsTop;
    const dB = Math.hypot(BR.x - fb[0], BR.z - fb[2]), dT = Math.hypot(BR.x - ft[0], BR.z - ft[2]);
    if (Math.min(dB, dT) < 14) journalDone('falls');
    const [dx, dz] = SCENERY.fallsDir, along = (BR.x - ft[0]) * dx + (BR.z - ft[2]) * dz, side = -(BR.x - ft[0]) * dz + (BR.z - ft[2]) * dx;
    if (along > -0.5 && along < 3.2 && Math.abs(side) < SCENERY.fallsHalf && BR.y < ft[1] - 1.5) {
      BR.fallsT += dt; if (BR.fallsT > 1.2) journalDone('shower');
      if (Math.random() < dt * 30) glPart(PART.alpha, BR.x + F1(-0.6, 0.6), BR.y + 1.6 + F1(0, 0.5), BR.z + F1(-0.6, 0.6), F1(0.2, 0.45), 0.85, 0.9, 0.95, 0.35, F1(0, 6), 0);
    } else BR.fallsT = 0;
  }
}
function bearRoar() {
  if (BR.roarT > 0 || BR.carry) return;
  BR.roarT = 1.7; AUD.roar();
  scareAll(BR.x, BR.z, 26, true);
  // roaring from the clifftop, near the top of the falls
  if (BR.y > SCENERY.fallsTop[1] - 2 && Math.abs(BR.z - cliffZ(BR.x)) < 18 && Math.abs(BR.x) < 60) journalDone('clifftop');
}
function bearSwipe() {
  if (BR.swipeT > 0 || BR.roarT > 0.4 || BR.carry || BR.eatT > 0) return;
  BR.swipeT = 0.5; BR.swipeHit = false; AUD.swish();
}
// what's in reach of the swipe: fish first, then food on the ground
function reachable() {
  const s = bearSnout();
  let best = null, bd = 1e9;
  for (const f of FISH) {
    if (!f.alive) continue;
    const d = Math.hypot(f.x - s[0], f.z - s[2]), dy = Math.abs(f.y - s[1]);
    if (d < (f.leap ? 1.7 : 1.4) && dy < (f.leap ? 1.4 : 1.1) && d < bd) { bd = d; best = { kind: 'fish', f }; }
  }
  if (best) return best;
  for (const b of SCENERY.berries) { const d = Math.hypot(b.x - s[0], b.z - s[2]); if (b.left > 0 && d < 1.9 && d < bd) { bd = d; best = { kind: 'berry', b }; } }
  for (const k of SNACKS) { const d = Math.hypot(k.x - s[0], k.z - s[2]); if (d < 1.4 && d < bd) { bd = d; best = { kind: 'snack', k }; } }
  for (const k of SCENERY.baskets) { const d = Math.hypot(k.x - s[0], k.z - s[2]); if (k.full && d < 1.9 && d < bd) { bd = d; best = { kind: 'basket', k }; } }
  return best;
}
function swipeResolve() {
  const s = bearSnout(); const wh = waterH(s[0], s[2]);
  const r = reachable();
  if (wh > -1e8 && wh > groundH(s[0], s[2]) + 0.1) { bigSplash(s[0], wh, s[2], 0.7); addRipple(s[0], s[2], 1); AUD.splash(s[0], s[2], 0.7); }
  if (!r) return;
  if (r.kind === 'fish') {
    const f = r.f, chance = f.leap ? 0.95 : (f.spooked > 0 ? 0.35 : 0.7);
    if (grng() < chance) {
      f.alive = false; f.respawn = 10; BR.carry = 'fish'; BR.carryT = 2.2;
      GAME.stats.fish++; journalCount('fish', GAME.stats.fish); if (f.leap) journalDone('leap');
      toast(f.leap ? 'Caught it mid-leap!' : pick(['Got one!', 'Salmon!', 'Gotcha!', 'Lunch!']), '🐟 ' + GAME.stats.fish);
      AUD.catchFish();
    } else { f.spooked = 2; f.dart = 1.2; f.heading += Math.PI * (0.6 + grng() * 0.8); toast(pick(['Slippery!', 'Missed!', 'So close!']), ''); }
  } else if (r.kind === 'berry') {
    const b = r.b, n = Math.min(b.left, 3); b.left -= n; b.regrow = 75; BR.eatT = 0.9;
    GAME.stats.berries += n; journalCount('berries', GAME.stats.berries); feed(0.025 * n); AUD.munch();
  } else if (r.kind === 'snack') {
    SNACKS.splice(SNACKS.indexOf(r.k), 1); BR.eatT = 1.4; feed(0.14); GAME.stats.snacks++; AUD.munch(); AUD.munch(0.35);
    toast(pick(['Trail mix!', 'A sandwich!', 'Granola bars!']), '');
  } else if (r.kind === 'basket') {
    r.k.full = false; r.k.refill = 100; BR.eatT = 1.8; feed(0.3); journalDone('picnic'); AUD.munch(); AUD.munch(0.4); AUD.munch(0.8);
    toast('Picnic raid!', '');
  }
}
function eat(what) { if (what === 'fish') { feed(0.2); BR.eatT = 1.2; AUD.munch(); AUD.munch(0.35); } }
function feed(a) { const was = GAME.belly; GAME.belly = Math.min(1, GAME.belly + a); if (was < 1 && GAME.belly >= 1) toast('Belly full', ''); }

// ---------- drawing the bear ----------
const _BM = new Float32Array(16), _T = new Float32Array(16), _L = new Float32Array(16), _H = new Float32Array(16);
function mm(a, b) { const o = new Float32Array(16); m4mul(o, a, b); return o; }
function drawBear() {
  const B = r3YPR(BR.yaw, BR.pitch, BR.shakeT > 0 ? Math.sin(BR.shakeT * 38) * 0.22 * Math.min(1, BR.shakeT * 2) : 0);
  const gait = BR.swim ? 0.3 : clamp(BR.speed / 3, 0, 1), runK = clamp((BR.speed - 4) / 3, 0, 1);
  const bob = BR.swim ? 0 : Math.abs(Math.sin(BR.phase)) * 0.045 * gait + runK * Math.sin(BR.phase * 2) * 0.05;
  m4basis(_BM, B, BR.x, BR.y + bob, BR.z);
  // stand up on the hind legs: pivot the body about the hips
  const st = BR.stand;
  const front = mm(_BM, mm(m4trans(0, BEAR.hipY, BEAR.hipZ), mm(m4rotX(-st * 1.12 - runK * Math.sin(BR.phase + 0.6) * 0.06), m4trans(0, -BEAR.hipY, -BEAR.hipZ))));
  glPush(MESH.bearBody, front);
  // head: looks down to eat or swipe, up to roar
  const swipeK = BR.swipeT > 0 ? Math.sin((1 - BR.swipeT / 0.5) * Math.PI) : 0;
  let hp = 0.15 + gait * 0.1 + (BR.eatT > 0 ? 0.55 + Math.sin(RND.time * 14) * 0.12 : 0) + swipeK * 0.3 - (BR.roarT > 0 ? 0.55 * st : 0) - (BR.swim ? 0.3 : 0);
  BR.headPitch = damp(BR.headPitch, hp, 10, 1 / 60);
  const head = mm(front, mm(m4trans(0, 1.12, 0.82), mm(m4rotY(Math.sin(RND.time * 0.7) * 0.15 * (1 - gait)), m4rotX(BR.headPitch))));
  glPush(MESH.bearHead, head);
  if (BR.carry === 'fish') {
    const fm = mm(head, mm(m4trans(0, -0.08, 0.72), m4rotY(Math.PI / 2)));
    glPush(MESH.fish, fm); glPush(MESH.tail, mm(fm, mm(m4trans(0, 0, -0.32), m4rotY(Math.sin(RND.time * 22) * 0.6))));
  }
  // legs: walk = diagonal pairs, run = bound (front pair, then back pair)
  const legs = [
    { x: BEAR.legX, y: BEAR.shoulderY, z: BEAR.shoulderZ, off: lerp(0, 0, runK), front: true },
    { x: -BEAR.legX, y: BEAR.shoulderY, z: BEAR.shoulderZ, off: lerp(Math.PI, 0.5, runK), front: true },
    { x: BEAR.legX, y: BEAR.hipY, z: BEAR.hipZ, off: lerp(Math.PI, Math.PI + 0.9, runK), front: false },
    { x: -BEAR.legX, y: BEAR.hipY, z: BEAR.hipZ, off: lerp(0, Math.PI + 1.4, runK), front: false }
  ];
  for (let i = 0; i < 4; i++) {
    const L = legs[i]; const ph = BR.phase + L.off;
    let up = -Math.sin(ph) * (0.42 + runK * 0.4) * gait, knee = Math.max(0, Math.cos(ph)) * (0.55 + runK * 0.5) * gait;
    if (BR.swim) { up = -Math.sin(ph) * 0.7; knee = 0.5 + Math.cos(ph) * 0.4; }
    if (!BR.onGround && !BR.swim) { up = L.front ? -0.6 : 0.5; knee = 0.6; }
    // the swipe: right front paw reaches out and down
    if (i === 0 && swipeK > 0) { up = -1.4 * swipeK; knee = 0.2; }
    if (L.front && st > 0.05) { up = lerp(up, -0.6 + (i === 0 ? Math.sin(RND.time * 9) * 0.25 : -Math.sin(RND.time * 9) * 0.25), st); knee = lerp(knee, 0.9, st); }
    const base = L.front ? front : _BM;
    const hip = mm(base, mm(m4trans(L.x, L.y, L.z), m4rotX(up)));
    glPush(MESH.bearUpper, hip);
    glPush(MESH.bearLower, mm(hip, mm(m4trans(0, -BEAR.upper, 0), m4rotX(L.front ? knee : -knee))));
  }
}
