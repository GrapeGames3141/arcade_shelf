// ---------- the cat: movement, jumping, platforms, drawing ----------
const COATS = [
  { name: 'Orange tabby', body: C('#e8943a'), chest: C('#f6dcb8'), head: C('#e8943a'), muzzle: C('#f8ecd8'), ear: C('#d9812c'), paw: C('#f8ecd8'), tail: C('#c9712a'), eye: '#8fd45a', stripe: C('#c26d22') },
  { name: 'Tuxedo', body: C('#26262e'), chest: C('#f4f4f0'), head: C('#26262e'), muzzle: C('#f4f4f0'), ear: C('#26262e'), paw: C('#f4f4f0'), tail: C('#26262e'), eye: '#f0d040' },
  { name: 'Gray', body: C('#8d939c'), chest: C('#b3b9c2'), head: C('#8d939c'), muzzle: C('#c9ced6'), ear: C('#7a808a'), paw: C('#8d939c'), tail: C('#7a808a'), eye: '#f0a030', stripe: C('#737984') },
  { name: 'Siamese', body: C('#eadfc8'), chest: C('#f3ebdb'), head: C('#e2d4b8'), muzzle: C('#5a4636'), ear: C('#5a4636'), paw: C('#5a4636'), tail: C('#5a4636'), eye: '#5ab0e8' }
];
const CATK = { R: 0.15, S: 1.18, walk: 1.25, trot: 2.7, back: 0.9, zoom: 5.8, turn: 3.3, zoomDur: 3.6, zoomCd: 5, jumpRise: 1.36 };
const CAT = {
  x: 0, z: 0, y: 0, vy: 0, h: 0, vx: 0, vz: 0, speed: 0, mode: 'free', coat: 0,
  zoomT: 0, zoomCd: 0, edgeT: 0, gait: 0, idleT: 0, bump: 0, headYaw: 0, headPitch: 0, blink: 0, lookAt: null,
  act: null, jump: null, sit: null, heldBy: null, flee: null, fur: null,
  pose: { sit: 0, loaf: 0, crouch: 0, belly: 0, long: 0, arch: 0, ears: 0, tailUp: 0.5, puff: 0, eye: 1, pupil: 0.4, paw: 0, pawSide: 1, lean: 0, wig: 0 },
  dignity: 100, meals: 0, lastMove: 0
};
function catReset(x, z, h, y = 0) {
  Object.assign(CAT, { x, z, y, vy: 0, h, vx: 0, vz: 0, speed: 0, mode: 'free', zoomT: 0, zoomCd: 0, edgeT: 0, idleT: 0, bump: 0, act: null, jump: null, sit: null, heldBy: null, flee: null, dignity: 100, meals: 0, lookAt: null });
  for (const k in CAT.pose) CAT.pose[k] = 0; CAT.pose.tailUp = 0.5; CAT.pose.eye = 1; CAT.pose.pupil = 0.4; CAT.pose.pawSide = 1;
}
const catFwd = () => [Math.sin(CAT.h), Math.cos(CAT.h)];
function catBusy() { return CAT.mode === 'jump' || CAT.mode === 'act' || CAT.mode === 'held' || CAT.mode === 'flee'; }

function startJump(tx, ty, tz, wiggle) {
  const c = CAT, d = d2(c.x, c.z, tx, tz), rise = ty - c.y;
  c.jump = { t: -(wiggle ? 0.22 : 0), dur: 0.36 + 0.1 * Math.max(0, rise) + 0.08 * d, x0: c.x, y0: c.y, z0: c.z, x1: tx, y1: ty, z1: tz, apex: Math.max(c.y, ty) + 0.18 + 0.14 * d };
  c.mode = 'jump'; c.sit = null; c.vx = c.vz = 0; c.vy = 0; if (d > 0.05) c.h = angTo(c.x, c.z, tx, tz);
  if (!wiggle) AU.hop();
}
function catJump() {
  const c = CAT; if (catBusy()) return false;
  if (c.sit) catRelease();
  const [fx, fz] = catFwd();
  for (const dist of [0.3, 0.5, 0.7, 0.9, 1.1, 1.3]) {
    const px = c.x + fx * dist, pz = c.z + fz * dist; const t = topAt(px, pz, c.y + CATK.jumpRise);
    if (t.f && t.y > c.y + 0.12) {
      const b = t.f, mx = Math.min(0.14, (b.x1 - b.x0) / 2), mz = Math.min(0.14, (b.z1 - b.z0) / 2);
      const lx = clamp(px + fx * 0.16, b.x0 + mx, b.x1 - mx), lz = clamp(pz + fz * 0.16, b.z0 + mz, b.z1 - mz);
      const tt = topAt(lx, lz, c.y + CATK.jumpRise);
      startJump(lx, tt.y, lz, true); return true;
    }
  }
  // nothing to climb: pounce forward
  const p = { x: c.x + fx * 0.9, z: c.z + fz * 0.9 }; const s = supportAt(p.x, p.z, c.y); collideCat(p, CATK.R, s.y);
  startJump(p.x, supportAt(p.x, p.z, c.y).y, p.z, false); return true;
}
function catSit(kind, ref, x, z, y, h) {
  const c = CAT; c.mode = 'sit'; c.sit = { kind, ref, t: 0 }; c.vx = c.vz = 0; c.zoomT = 0;
  if (x !== undefined) { c.x = x; c.z = z; c.y = y; if (h !== undefined) c.h = h; }
}
function catRelease() { const c = CAT; if (c.mode !== 'sit') return; const s = c.sit; c.sit = null; c.mode = 'free'; if (s && s.kind === 'lap') { const g = supportAt(c.x, c.z, c.y + 0.3); c.y = g.y; } onCatLeftSit(s); }
function catAct(name, dur, hitAt, hitFn, doneFn) { const c = CAT; if (c.sit) { c.sit = null; } c.mode = 'act'; c.act = { name, t: 0, dur, hitAt, hitFn, doneFn, hit: false }; c.vx = c.vz = 0; }
function catZoom() {
  const c = CAT; if (catBusy() || c.zoomCd > 0 || c.zoomT > 0) return false;
  if (c.sit) catRelease(); c.zoomT = CATK.zoomDur; c.zoomCd = CATK.zoomDur + CATK.zoomCd; AU.zoom(); onZoomStart(); return true;
}

function catUpdate(dt) {
  const c = CAT, P = c.pose; c.zoomCd = Math.max(0, c.zoomCd - dt); c.blink -= dt; if (c.blink < -0.12) c.blink = rr(2, 6);
  let thr = IN.thr, steer = IN.steer; const moving = Math.abs(thr) > 0.25 || Math.abs(steer) > 0.45;
  if (c.mode === 'sit') { c.sit.t += dt; if (moving && c.sit.t > 0.25) catRelease(); }
  if (c.mode === 'act') {
    const a = c.act; a.t += dt; if (!a.hit && a.t >= a.hitAt) { a.hit = true; if (a.hitFn) a.hitFn(); }
    if (c.mode === 'act' && a.t >= a.dur) { c.mode = 'free'; c.act = null; if (a.doneFn) a.doneFn(); }
  } else if (c.mode === 'jump') {
    const j = c.jump; j.t += dt;
    if (j.t >= 0) {
      if (j.t - dt < 0) AU.hop();
      const k = clamp(j.t / j.dur, 0, 1); c.x = lerp(j.x0, j.x1, k); c.z = lerp(j.z0, j.z1, k);
      const base = lerp(j.y0, j.y1, k), bulge = (j.apex - Math.max(j.y0, j.y1)) + Math.abs(j.y1 - j.y0) * 0.15; c.y = base + 4 * k * (1 - k) * bulge;
      if (k >= 1) { c.y = j.y1; c.mode = 'free'; c.jump = null; AU.land(Math.abs(j.y1 - j.y0)); onCatLanded(); }
    }
  } else if (c.mode === 'flee') {
    const f = c.flee; f.t -= dt; const a = angTo(c.x, c.z, f.x, f.z) + Math.PI; c.h = angAppr(c.h, a, 9 * dt);
    const p = { x: c.x + Math.sin(c.h) * 5 * dt, z: c.z + Math.cos(c.h) * 5 * dt }; collideCat(p, CATK.R, c.y); c.x = p.x; c.z = p.z; c.speed = 5; c.gait += dt * 26;
    const g = supportAt(c.x, c.z, c.y); if (c.y > g.y) { c.vy -= 12 * dt; c.y = Math.max(g.y, c.y + c.vy * dt); } else c.vy = 0;
    if (f.t <= 0) { c.mode = 'free'; c.flee = null; }
  } else if (c.mode === 'free') {
    if (c.zoomT > 0) { c.zoomT -= dt; if (thr < -0.6) c.zoomT = 0; if (c.zoomT <= 0) onZoomEnd(); }
    const zoom = c.zoomT > 0;
    c.h -= steer * (zoom ? 2.6 : CATK.turn * (0.55 + 0.45 * (1 - Math.min(1, Math.abs(c.speed) / 3)))) * dt;
    let sp = zoom ? CATK.zoom : thr > 0 ? lerp(CATK.walk, CATK.trot, clamp((thr - 0.3) / 0.6, 0, 1)) * Math.min(1, thr * 3) : thr * CATK.back;
    const fx = Math.sin(c.h), fz = Math.cos(c.h), grip = zoom ? 3.2 : 14;
    c.vx = damp(c.vx, fx * sp, grip, dt); c.vz = damp(c.vz, fz * sp, grip, dt);
    const g0 = supportAt(c.x, c.z, c.y);
    let nx = c.x + c.vx * dt, nz = c.z + c.vz * dt;
    const onPlat = c.y <= g0.y + 0.01 && g0.y > 0.2;
    if (onPlat) {
      // edge guard: stay on the furniture unless the stick is pushed at the edge for a moment
      const g1 = supportAt(nx, nz, c.y);
      if (g1.y < c.y - 0.13) {
        if (thr > 0.5 || zoom) c.edgeT += dt; else c.edgeT = 0;
        if (c.edgeT > (zoom ? 0.05 : 0.32)) {
          c.edgeT = 0; const l = hyp(c.vx, c.vz) || 1, ux = c.vx / l, uz = c.vz / l; const p = { x: c.x + ux * 0.6, z: c.z + uz * 0.6 };
          const gy = supportAt(p.x, p.z, c.y).y; collideCat(p, CATK.R, gy); const z2 = c.zoomT; startJump(p.x, supportAt(p.x, p.z, c.y).y, p.z, false); c.zoomT = z2; return;
        }
        if (supportAt(nx, c.z, c.y).y >= c.y - 0.13) nz = c.z; else if (supportAt(c.x, nz, c.y).y >= c.y - 0.13) nx = c.x; else { nx = c.x; nz = c.z; }
        c.vx *= 0.5; c.vz *= 0.5;
      } else c.edgeT = 0;
    }
    const p = { x: nx, z: nz };
    if (c.y < 0.3) for (const h of HUM) if (!h.lying && !h.seat && !h.hidden) { const dx = p.x - h.x, dz = p.z - h.z, d = hyp(dx, dz); if (d < 0.27 && d > 1e-4) { p.x = h.x + dx / d * 0.27; p.z = h.z + dz / d * 0.27; } }
    const bx = p.x, bz = p.z; collideCat(p, CATK.R, c.y);
    if (zoom && d2(bx, bz, p.x, p.z) > 0.03 && hyp(c.vx, c.vz) > 3.5) { onCatBonk(); c.vx *= -0.3; c.vz *= -0.3; }
    c.x = p.x; c.z = p.z;
    const g = supportAt(c.x, c.z, c.y);
    if (c.y > g.y + 0.001) { c.vy -= 12 * dt; c.y += c.vy * dt; if (c.y <= g.y) { c.y = g.y; if (c.vy < -2) AU.land(0.5); c.vy = 0; } }
    else { c.y = g.y; c.vy = 0; }
    c.speed = hyp(c.vx, c.vz) * (c.vx * fx + c.vz * fz < 0 ? -1 : 1);
    c.gait += Math.abs(c.speed) * dt * (zoom ? 5.2 : 9.5);
    if (Math.abs(c.speed) > 0.2) { c.idleT = 0; c.lastMove = G.time; } else c.idleT += dt;
  }
  if (c.mode === 'held' && c.heldBy) { const hp = humanHand(c.heldBy, 0); c.x = hp[0]; c.y = hp[1] - 0.42; c.z = hp[2]; c.h = c.heldBy.h + Math.PI; c.vx = c.vz = 0; c.speed = 0; }
  // pose targets
  const T = { sit: 0, loaf: 0, crouch: 0, belly: 0, long: 0, arch: 0, ears: 0, tailUp: 0.55, puff: 0, eye: 1, pupil: 0.35, paw: 0, lean: 0, wig: 0 };
  const night = G.tod && G.tod.dark;
  if (night) T.pupil = 0.8;
  if (c.mode === 'sit') {
    const k = c.sit.kind;
    if (k === 'stare') { T.sit = 1; T.pupil = 0.95; T.tailUp = 0.05; T.eye = 1.15; }
    else if (k === 'loaf' || k === 'lap' || k === 'box' || k === 'laptop' || k === 'bed') { T.loaf = 1; T.eye = 0.35; T.tailUp = 0; }
    else if (k === 'belly') { T.belly = 1; T.eye = 0.6; }
    else if (k === 'eat') { T.crouch = 1; T.tailUp = 0.2; }
    else T.sit = 1;
  } else if (c.mode === 'act') {
    const n = c.act.name, u = c.act.t / c.act.dur;
    if (n === 'swipe' || n === 'tap' || n === 'push') { T.sit = 0.7; T.paw = u < 0.75 ? 1 : 0; T.pupil = 0.9; T.ears = n === 'push' ? 0 : 0.2; }
    else if (n === 'meow') { T.sit = 0.5; T.eye = 0.5; }
    else if (n === 'rub') { T.lean = Math.sin(u * Math.PI) * 1; T.tailUp = 1; T.eye = 0.4; }
    else if (n === 'headbutt') { T.crouch = 0.4; T.eye = 0.2; T.tailUp = 0.9; }
    else if (n === 'blink') { T.sit = 1; T.eye = u > 0.2 && u < 0.8 ? 0.05 : 0.6; }
    else if (n === 'scratch' || n === 'knead') { T.sit = n === 'scratch' ? 0.9 : 0.3; T.paw = 1; T.ears = 0.3; }
    else if (n === 'groom') { T.sit = 1; T.eye = 0.2; T.paw = 0.6; }
    else if (n === 'spooked') { T.arch = 1; T.puff = 1; T.ears = 1; T.pupil = 1; }
    else if (n === 'stretch') { T.crouch = 1; T.eye = 0.2; T.tailUp = 0.9; }
    else if (n === 'eat') { T.crouch = 1; T.tailUp = 0.2; }
    else if (n === 'trap') { T.belly = 1; T.pupil = 1; T.ears = 0.6; }
  } else if (c.mode === 'jump') { T.wig = c.jump.t < 0 ? 1 : 0; T.crouch = c.jump.t < 0 ? 0.8 : 0; T.pupil = 0.9; T.tailUp = 0.3; }
  else if (c.mode === 'held') { T.long = 1; T.ears = 0.7; T.eye = 0.7; T.tailUp = -0.4; }
  else if (c.mode === 'flee') { T.puff = 1; T.ears = 1; T.pupil = 1; T.tailUp = 0.2; }
  else {
    if (c.zoomT > 0) { T.puff = 0.7; T.pupil = 1; T.ears = 0.5; T.tailUp = 0.3; }
    else if (c.idleT > 2.5) { T.sit = 1; T.tailUp = 0.05; }
    else if (Math.abs(c.speed) > 0.2) T.tailUp = 0.8;
  }
  if (c.blink < 0) T.eye = 0.05;
  for (const k in T) P[k] = damp(P[k], T[k], k === 'eye' ? 22 : k === 'paw' ? 16 : 9, dt);
  // head tracks the nearest interesting human
  let ty = 0, tp = 0; const tg = c.lookAt;
  if (tg && c.mode !== 'held') { const a = angWrap(angTo(c.x, c.z, tg.x, tg.z) - c.h); if (Math.abs(a) < 1.9) { ty = clamp(a, -1.1, 1.1); tp = -clamp(Math.atan2(tg.y - (c.y + 0.3), d2(c.x, c.z, tg.x, tg.z) + 0.01), -0.3, 0.75); } }
  c.headYaw = damp(c.headYaw, ty, 7, dt); c.headPitch = damp(c.headPitch, tp, 7, dt);
}

// ---------- cat model ----------
function drawCat(c) {
  const P = c.pose, co = COATS[c.coat], t = G.time, S = CATK.S;
  const run = c.zoomT > 0 || c.mode === 'flee', sp = Math.abs(c.speed), mov = clamp(sp / 1.2, 0, 1) * (c.mode === 'free' || c.mode === 'flee' ? 1 : 0);
  const ph = c.gait, low = Math.max(P.loaf, P.belly);
  let by = lerp(0.2, 0.105, P.loaf); by = lerp(by, 0.1, P.belly); by += P.arch * 0.05 + (run ? Math.abs(Math.sin(ph)) * 0.035 : Math.sin(ph * 2) * 0.006 * mov);
  let pitch = -P.sit * 0.62 + P.crouch * 0.3 - P.long * 1.45 + (run ? Math.sin(ph) * 0.2 : 0);
  if (c.mode === 'jump' && c.jump.t >= 0) { const k = c.jump.t / c.jump.dur; pitch = lerp(-0.7, 0.55, k) * clamp((c.jump.apex - Math.min(c.jump.y0, c.jump.y1)) * 2, 0.4, 1); }
  const wig = P.wig * Math.sin(t * 38) * 0.12;
  pushXf(c.x, c.y + c.bump, c.z, c.h + wig * 0.4, 0, P.lean * 0.3, S);
  const hipY = by - P.sit * 0.085, hipZ = -0.13 + wig * 0.05;
  const cp = Math.cos(pitch), sn = Math.sin(pitch);
  const bp = (x, y, z) => [x, hipY + y * cp - z * sn, hipZ + y * sn + z * cp];   // body space -> root space (pitch about the hips)
  // legs (root space) unless loafing / belly up
  if (low < 0.6 && P.long < 0.5) {
    const k = 1 - low;
    for (let i = 0; i < 4; i++) {
      const front = i < 2, sd = i % 2 ? 1 : -1; const sh = front ? bp(sd * 0.055, -0.03, 0.25) : bp(sd * 0.068, -0.03, 0.0);
      let off = (front ? 0 : Math.PI) + (sd > 0 ? 0 : Math.PI); if (run) off = front ? 0 : 2.2;
      const stride = (run ? 0.17 : 0.075) * mov * Math.sign(c.speed || 1), sw = Math.sin(ph + off), lift = Math.max(0, Math.cos(ph + off)) * (run ? 0.07 : 0.035) * mov;
      let px = sh[0] + (front ? 0 : sd * 0.01), py = 0.02 + lift, pz = (front ? 0.1 + P.sit * 0.02 : -0.1 + P.sit * 0.09) + sw * stride + (run ? (front ? 0.06 : -0.02) : 0);
      if (front && P.paw > 0.05 && sd === P.pawSide) { const w = c.act && (c.act.name === 'scratch' || c.act.name === 'knead') ? Math.sin(t * 22) * 0.04 : 0; px += sd * 0.02; py = lerp(py, sh[1] + 0.03 + w, P.paw); pz = lerp(pz, sh[2] + 0.17, P.paw); }
      else if (front && c.act && (c.act.name === 'scratch' || c.act.name === 'knead')) { py = lerp(py, sh[1] + 0.03 - Math.sin(t * 22) * 0.04, P.paw); pz = lerp(pz, sh[2] + 0.17, P.paw); }
      limb(sh[0], sh[1], sh[2], px, py, pz, 0.024 * k + 0.004, co.body); sph(px, py - 0.004, pz + 0.012, 0.03 * k, co.paw, 0.75);
      if (!front) sph(sh[0], sh[1] - 0.02, sh[2] + 0.02, 0.062, co.body);
    }
  }
  // tail
  {
    const b = bp(0, 0.03, -0.09); let x = b[0], y = b[1], z = b[2], el = lerp(-0.5, 1.35, clamp(P.tailUp, -0.4, 1)) - P.long * 1.2, yaw = 0;
    const wag = (P.sit > 0.5 || low > 0.5 ? 0.25 : 0.12) + P.wig * 0.5, curl = P.tailUp > 0.7 ? -0.22 : P.sit > 0.5 || low > 0.5 ? 0.0 : 0.16, wrap = Math.max(P.sit, low) * (P.tailUp < 0.2 ? 1 : 0);
    for (let i = 0; i < 7; i++) {
      const L = 0.062; yaw = Math.sin(t * 2.2 + i * 0.7) * wag * (i / 6) + wrap * (0.55 * i);
      const e = el + curl * i - wrap * el * 0.9, nx = x + Math.sin(yaw) * Math.cos(e) * L * (wrap ? 1 : 0) + (wrap ? 0 : Math.sin(yaw) * 0.02), ny = Math.max(0.02, y + Math.sin(e) * L), nz = z - Math.cos(e) * L * Math.cos(yaw);
      limb(x, y, z, nx, ny, nz, (0.021 - i * 0.0012) * (1 + P.puff * 0.9), i >= 5 || (co.stripe && i % 2 === 1) ? co.tail : co.body); x = nx; y = ny; z = nz;
    }
  }
  // body, in body space
  pushXf(0, hipY, hipZ, 0, pitch, P.belly * 3.05, 1);
  const fat = 1 + P.puff * 0.12 + low * 0.14;
  put('sph', 0, P.arch * 0.03, 0.125, 0, 0, 0, 0.205 * fat, 0.195 + P.arch * 0.05, 0.43, co.body);
  sph(0, -0.005, 0.0, 0.103 * fat, co.body, 0.95); sph(0, -0.012, 0.25, 0.088, co.chest, 1.0);
  put('sph', 0, -0.045, 0.13, 0, 0, 0, 0.15, 0.12, 0.34, co.chest);
  if (co.stripe) for (const z of [0.03, 0.11, 0.19]) put('sph', 0, 0.045 + P.arch * 0.03, z, 0, 0, 0, 0.165 * fat, 0.12, 0.034, co.stripe);
  if (P.belly > 0.5 || P.long > 0.5) for (let i = 0; i < 4; i++) { const front = i < 2, sd = i % 2 ? 1 : -1, w = Math.sin(t * (P.belly > 0.5 ? 9 : 2) + i * 1.7) * (P.belly > 0.5 ? 0.05 : 0.015); const z0 = front ? 0.24 : 0.0; limb(sd * 0.06, -0.04, z0, sd * 0.07, -0.2 + (P.long > 0.5 ? 0 : 0.02), z0 + 0.03 + w, 0.024, co.body); sph(sd * 0.07, -0.2, z0 + 0.04 + w, 0.03, co.paw, 0.8); }
  // head: counter-rotate so it stays roughly level
  pushXf(0, 0.078, 0.335, c.headYaw, -pitch * 0.85 + c.headPitch + P.crouch * 0.35 - P.belly * 0.4, 0, 1);
  sph(0, 0, 0, 0.087, co.head); put('sph', 0, -0.022, 0.058, 0, 0, 0, 0.1, 0.066, 0.075, co.muzzle); sph(0, -0.006, 0.096, 0.012, C('#e58a8a'));
  const eyeC = C(co.eye, G.tod && G.tod.dark ? 0.75 : 0.15);
  for (const sd of [-1, 1]) {
    put('sph', sd * 0.052, 0.082, -0.006, 0, -0.15 - P.ears * 0.8, sd * (-0.34 - P.ears * 0.7), 0.062, 0.1, 0.03, co.ear); put('sph', sd * 0.052, 0.08, 0.004, 0, -0.15 - P.ears * 0.8, sd * (-0.34 - P.ears * 0.7), 0.036, 0.066, 0.02, C('#e9a7a0'));
    const eo = clamp(P.eye, 0.04, 1.2);
    put('sph', sd * 0.038, 0.016, 0.064, 0, 0, 0, 0.044, 0.044 * eo, 0.03, eyeC);
    put('sph', sd * 0.038, 0.016, 0.077, 0, 0, 0, 0.011 + 0.024 * P.pupil, 0.036 * eo, 0.012, C('#0c0c10'));
    if (eo > 0.5) put('sph', sd * 0.038 + 0.008, 0.026, 0.083, 0, 0, 0, 0.008, 0.008, 0.004, C('#ffffff', 0.6));
    put('box', sd * 0.075, -0.022, 0.07, 0, 0, sd * 0.12, 0.075, 0.003, 0.003, C('#ffffff')); put('box', sd * 0.075, -0.032, 0.07, 0, 0, -sd * 0.1, 0.07, 0.003, 0.003, C('#ffffff'));
  }
  if (c.meowT > 0) put('sph', 0, -0.045, 0.085, 0, 0, 0, 0.03, 0.035, 0.02, C('#7a1f2a'));
  popXf(); popXf(); popXf();
}
