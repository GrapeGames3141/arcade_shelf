// ---------- living things: hikers on the trails, salmon in the water, effects ----------
const HIKERS = [], FISH = [], SNACKS = [];
const SHIRTS = [0xd9482b, 0x2b7bd9, 0xe8c12a, 0x3aa35a, 0xa04ad9, 0xf07a2a, 0x28b5b5, 0xe85a9a], PANTS = [0x4a5a6a, 0x6a5a3a, 0x3a3a3a, 0x7a6a52, 0x2a3a5a];
const YELLS = ['BEAR!', 'Run!!', 'AAAH!', 'Not again!', 'Every hiker for themselves!', 'Hey bear! HEY BEAR!', 'Nope nope nope', 'Mom!!', 'My sandwich!'];
const PHOTO = ['Ooh, a bear!', 'Hold still, buddy…', 'Get its good side!', 'Nobody move.', 'Is it smiling?'];

function trailPoint(t, s) {
  s = t.closed ? ((s % t.total) + t.total) % t.total : clamp(s, 0, t.total);
  let lo = 0, hi = t.len.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t.len[m] <= s) lo = m; else hi = m; }
  const a = t.path[lo], b = t.path[hi], u = (s - t.len[lo]) / ((t.len[hi] - t.len[lo]) || 1);
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), Math.atan2(b[0] - a[0], b[1] - a[1])];
}
function hikerColors(h) {
  h.shirt = hexLin(pick(SHIRTS)); h.pant = hexLin(pick(PANTS)); h.hat = hexLin(pick([0xc9a86a, 0x2a5a3a, 0xd9482b, 0x3a3a3a, 0xe8e0cc]));
  h.pack = hexLin(pick([0x2a6aa8, 0xc0392b, 0x3a6a2a, 0xe0a020, 0x5a3a7a])); h.hasPack = grng() < 0.75; h.hasHat = grng() < 0.7;
  h.scale = R1(0.88, 1.08);
}
function hikerPlace(h, farFrom) {
  const keys = Object.keys(TRAILS);
  for (let tries = 0; tries < 40; tries++) {
    const k = pick(keys), t = TRAILS[k], s = R1(0, t.total), [x, z] = trailPoint(t, s);
    if (farFrom && Math.hypot(x - farFrom[0], z - farFrom[1]) < 60) continue;
    Object.assign(h, { trail: k, s, dir: grng() < 0.5 ? 1 : -1, x, z, state: 'walk', t: 0, off: R1(-0.5, 0.5), vx: 0, vz: 0, dropT: 0, saw: false });
    return;
  }
}
function spawnHikers(n) {
  HIKERS.length = 0;
  for (let i = 0; i < n; i++) {
    const h = { phase: R1(0, TAU), speed: R1(1.15, 1.5), yaw: 0, y: 0, bub: null, photoT: 0, flash: 0 };
    hikerColors(h); hikerPlace(h, [BR.x, BR.z]); HIKERS.push(h);
  }
}
function scareAll(x, z, r, roar) { for (const h of HIKERS) if (h.state !== 'gone' && h.state !== 'flee' && Math.hypot(h.x - x, h.z - z) < r) hikerScare(h, roar); }
function hikerScare(h, roar) {
  if (h.state === 'flee' || h.state === 'alert') return;
  h.state = 'alert'; h.t = roar ? 0.25 : 0.5;
  bubble(h, pick(YELLS), 1.8); AUD.yelp(h.x, h.z, h.scale);
}
function hikerStep(h, dt) {
  const t = TRAILS[h.trail];
  const dB = Math.hypot(BR.x - h.x, BR.z - h.z);
  h.phase += dt * (h.state === 'flee' ? 11 : h.state === 'walk' ? 5.2 * h.speed / 1.3 : 0);
  if (h.flash > 0) h.flash -= dt;
  if (h.state === 'walk' || h.state === 'photo') {
    // a calm bear in view gets its photo taken; a running bear (or one too close) ends the photo shoot
    const calm = BR.speed < 4.5 && BR.roarT <= 0;
    if ((dB < 13 && !calm) || dB < 5.5) { hikerScare(h, false); }
    else if (h.state === 'walk' && dB < 24 && calm && !h.saw && !BR.swim) { h.state = 'photo'; h.t = R1(2.8, 4); h.saw = true; bubble(h, pick(PHOTO), 2.2); }
  }
  if (h.state === 'photo') {
    h.yaw = damp(h.yaw, h.yaw + wrapA(Math.atan2(BR.x - h.x, BR.z - h.z) - h.yaw), 6, dt);
    h.t -= dt;
    if (h.t < 1.2 && h.photoT === 0) { h.photoT = 1; h.flash = 0.18; AUD.click(h.x, h.z); if (dB < 26) { journalDone('photo'); GAME.stats.photos++; } }
    if (h.t <= 0) { h.state = 'walk'; h.photoT = 0; }
  } else if (h.state === 'walk') {
    h.s += h.dir * h.speed * dt;
    if (!t.closed && (h.s <= 0 || h.s >= t.total)) { h.dir *= -1; h.s = clamp(h.s, 0, t.total); }
    const [x, z, a] = trailPoint(t, h.s), sx = Math.cos(a) * h.off, sz = -Math.sin(a) * h.off;
    h.x = x + sx; h.z = z + sz; h.yaw = damp(h.yaw, h.yaw + wrapA(a + (h.dir < 0 ? Math.PI : 0) - h.yaw), 5, dt);
    if (grng() < dt * 0.01) h.saw = false;   // forget the bear after a while
  } else if (h.state === 'alert') {
    h.yaw = damp(h.yaw, h.yaw + wrapA(Math.atan2(BR.x - h.x, BR.z - h.z) - h.yaw), 12, dt);
    h.t -= dt;
    if (h.t <= 0) {
      h.state = 'flee'; h.t = 0; h.dropT = h.hasPack && grng() < 0.55 ? R1(0.6, 1.6) : -1;
      GAME.stats.scared++; journalCount('scare', GAME.stats.scared);
    }
  } else if (h.state === 'flee') {
    h.t += dt;
    // run directly away from the bear, sliding around trees, water and steep ground
    let a = Math.atan2(h.x - BR.x, h.z - BR.z);
    for (const da of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.4, -2.4]) {
      const aa = a + da, nx = h.x + Math.sin(aa) * 3, nz = h.z + Math.cos(aa) * 3;
      const wet = waterH(nx, nz) > groundH(nx, nz) + 0.3, steep = Math.abs(groundH(nx, nz) - groundH(h.x, h.z)) > 3.3;
      if (!wet && !steep && Math.abs(nx) < W.HALF - 12 && Math.abs(nz) < W.HALF - 12) { a = aa; break; }
    }
    h.yaw = damp(h.yaw, h.yaw + wrapA(a - h.yaw), 9, dt);
    const sp = 5.4 * h.scale;
    h.x += Math.sin(h.yaw) * sp * dt; h.z += Math.cos(h.yaw) * sp * dt;
    const p = [h.x, 0, h.z]; colPush(p, 0.3); h.x = p[0]; h.z = p[2];
    if (h.dropT > 0) { h.dropT -= dt; if (h.dropT <= 0) { h.hasPack = false; SNACKS.push({ x: h.x, z: h.z, y: groundH(h.x, h.z), yaw: h.yaw, t: 0 }); if (SNACKS.length > 10) SNACKS.shift(); } }
    if (h.t > 3 && grng() < dt * 0.4 && !h.bub) bubble(h, pick(['Keep running!', 'Is it still there?', 'I left my lunch!', 'Bear!!']), 1.4);
    if ((dB > 48 && h.t > 4) || h.t > 14) { h.state = 'gone'; h.t = R1(6, 14); }
  } else if (h.state === 'gone') {
    h.t -= dt;
    if (h.t <= 0) { hikerColors(h); hikerPlace(h, [BR.x, BR.z]); }
  }
  h.y = groundH(h.x, h.z);
  const wh = waterH(h.x, h.z); if (wh > h.y) h.y = Math.max(h.y, wh - 0.5);
}
function drawHiker(h) {
  if (h.state === 'gone') return;
  const s = h.scale, M = new Float32Array(16); m4basis(M, r3Y(h.yaw), h.x, h.y, h.z, s, s, s);
  const flee = h.state === 'flee', walk = h.state === 'walk' || flee, amp = flee ? 0.95 : walk ? 0.45 : 0;
  const bob = walk ? Math.abs(Math.sin(h.phase)) * (flee ? 0.07 : 0.03) : 0;
  const body = mm(M, mm(m4trans(0, bob, 0), m4rotX(flee ? 0.22 : 0)));
  glPush(MESH.hTorso, body, h.shirt[0], h.shirt[1], h.shirt[2], 1);
  const head = mm(body, m4trans(0, 1.5, 0));
  glPush(MESH.hHead, head);
  if (h.hasHat) glPush(MESH.hHat, head, h.hat[0], h.hat[1], h.hat[2], 1);
  if (h.hasPack) glPush(MESH.hPack, body, h.pack[0], h.pack[1], h.pack[2], 1);
  for (const sd of [-1, 1]) {
    const ph = h.phase + (sd > 0 ? 0 : Math.PI);
    const th = mm(body, mm(m4trans(0.1 * sd, 0.92, 0), m4rotX(-Math.sin(ph) * amp)));
    glPush(MESH.hThigh, th, h.pant[0], h.pant[1], h.pant[2], 1);
    glPush(MESH.hShin, mm(th, mm(m4trans(0, -0.44, 0), m4rotX(Math.max(0, Math.cos(ph)) * amp * 1.2))), h.pant[0], h.pant[1], h.pant[2], 1);
    // arms: swing when walking, wave wildly when fleeing, hold up a camera for a photo
    let ax = Math.sin(ph) * amp * 0.8, az = 0.08 * sd;
    if (flee) { ax = -2.6 + Math.sin(h.phase * 1.7 + sd) * 0.5; az = 0.35 * sd; }
    if (h.state === 'photo') { ax = -1.35; az = -0.35 * sd; }
    if (h.state === 'alert') { ax = -2.9; az = 0.25 * sd; }
    glPush(MESH.hArm, mm(body, mm(m4trans(0.25 * sd, 1.45, 0), mm(m4rotZ(az), m4rotX(ax)))), h.shirt[0], h.shirt[1], h.shirt[2], 1);
  }
  if (h.flash > 0) glPart(PART.add, ...r3apply(r3Y(h.yaw), 0, 1.45 * s, 0.45).map((v, i) => v + [h.x, h.y, h.z][i]), 0.9, 1, 1, 0.95, 1, 0, 1);
}

// ---------- fish ----------
function spawnFish(n) {
  FISH.length = 0;
  for (let i = 0; i < n; i++) { const f = { alive: true }; fishPlace(f, i < n * 0.6 ? 'river' : 'lake'); FISH.push(f); }
}
function fishPlace(f, where) {
  Object.assign(f, { alive: true, leap: false, spooked: 0, dart: 0, wig: R1(0, TAU), respawn: 0, speed: R1(0.4, 0.9), where });
  if (where === 'lake') {
    for (let k = 0; k < 20; k++) { const a = R1(0, TAU), r = R1(4, LAKE.r - 5); f.x = LAKE.x + Math.cos(a) * r; f.z = LAKE.z + Math.sin(a) * r; if (Math.hypot(f.x - BR.x, f.z - BR.z) > 15) break; }
    f.heading = R1(0, TAU);
  } else {
    // most river salmon gather in the pool below the falls; the rest hold in the deeper runs
    const n = RIVER.pts.length, pool = grng() < 0.55;
    f.ri = pool ? RIVER.falls + 1 + Math.floor(R1(0, 7)) : Math.floor(R1(RIVER.falls + 8, n - 20));
    const p = RIVER.pts[f.ri]; f.lat = R1(-0.5, 0.5) * RIVER.w[f.ri];
    f.x = p[0]; f.z = p[1]; f.heading = 0; f.home = f.ri;
  }
  f.y = (f.where === 'lake' ? LAKE.y : RIVER.s[f.ri]) - R1(0.25, 0.55);
}
function fishStep(f, dt) {
  if (!f.alive) { f.respawn -= dt; if (f.respawn <= 0) fishPlace(f, f.where); return; }
  f.wig += dt * (f.dart > 0 ? 22 : 9);
  f.spooked = Math.max(0, f.spooked - dt); f.dart = Math.max(0, f.dart - dt);
  if (f.leap) {   // a salmon jumping at the falls
    f.vy -= 9.8 * dt; f.x += f.vx * dt; f.z += f.vz * dt; f.y += f.vy * dt; f.pitch = Math.atan2(f.vy, Math.hypot(f.vx, f.vz));
    const top = SCENERY.fallsTop;
    if (f.vy < 0 && f.y < RIVER.s[RIVER.falls + 1] - 0.2) { f.leap = false; bigSplash(f.x, RIVER.s[RIVER.falls + 1], f.z, 0.5); f.ri = RIVER.falls + 2; f.lat = 0; }
    else if (f.vy < 0 && Math.hypot(f.x - top[0], f.z - top[2]) < 1.5 && f.y < top[1] + 0.2 && f.y > top[1] - 0.6) { f.leap = false; f.ri = RIVER.falls - 4; f.lat = R1(-1, 1); bigSplash(f.x, top[1], f.z, 0.3); }
    return;
  }
  f.pitch = 0;
  const dB = Math.hypot(f.x - BR.x, f.z - BR.z);
  if (dB < 3.2 && (BR.speed > 3.6 || BR.vy < -3) && f.dart <= 0) { f.dart = 0.9; f.spooked = 2; f.heading = Math.atan2(f.x - BR.x, f.z - BR.z); }
  if (f.where === 'lake') {
    if (f.dart <= 0 && grng() < dt * 0.4) f.heading += R1(-1.2, 1.2);
    const sp = f.dart > 0 ? 4 : f.speed;
    let nx = f.x + Math.sin(f.heading) * sp * dt, nz = f.z + Math.cos(f.heading) * sp * dt;
    if (Math.hypot(nx - LAKE.x, nz - LAKE.z) > LAKE.r - 3 || LAKE.y - groundH(nx, nz) < 0.7) { f.heading = Math.atan2(LAKE.x - f.x, LAKE.z - f.z) + R1(-0.6, 0.6); return; }
    f.x = nx; f.z = nz; f.y = damp(f.y, LAKE.y - 0.4, 2, dt);
  } else {
    // hold station against the current, drifting up and down the run; dart sideways when spooked
    const n = RIVER.pts.length;
    if (f.dart > 0) { f.lat += Math.sign(f.lat || 1) * 3 * dt; f.ri = clamp(f.ri + (grng() < 0.5 ? -1 : 1), RIVER.falls + 1, n - 2); }
    else if (grng() < dt * 0.5) f.ri = clamp(f.ri + (grng() < 0.55 ? -1 : 1), Math.max(RIVER.falls + 1, f.home - 6), Math.min(n - 2, f.home + 6));
    f.lat = clamp(f.lat, -RIVER.w[f.ri] * 0.6, RIVER.w[f.ri] * 0.6);
    const p = RIVER.pts[f.ri], q = RIVER.pts[Math.max(0, f.ri - 1)], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, ux = (q[0] - p[0]) / l, uz = (q[1] - p[1]) / l;
    const tx = p[0] - uz * f.lat, tz = p[1] + ux * f.lat;
    f.x = damp(f.x, tx, f.dart > 0 ? 4 : 0.8, dt); f.z = damp(f.z, tz, f.dart > 0 ? 4 : 0.8, dt);
    f.heading = Math.atan2(ux, uz) + Math.sin(f.wig * 0.13) * 0.25; // face upstream
    f.y = damp(f.y, RIVER.s[f.ri] - 0.35, 2, dt);
    // salmon in the plunge pool try to leap the falls
    if (f.ri <= RIVER.falls + 4 && f.dart <= 0 && grng() < dt * 0.09) {
      const top = SCENERY.fallsTop, T = 1.1;
      f.leap = true; f.y = RIVER.s[f.ri] - 0.1;
      f.vx = (top[0] + R1(-1.2, 1.2) - f.x) / T; f.vz = (top[2] - f.z) / T; f.vy = (top[1] + R1(-0.8, 0.5) - f.y + 0.5 * 9.8 * T * T) / T;
      bigSplash(f.x, f.y + 0.1, f.z, 0.4); addRipple(f.x, f.z, 0.8);
      if (Math.hypot(BR.x - f.x, BR.z - f.z) < 30) AUD.splash(f.x, f.z, 0.4);
    }
  }
}
function drawFish(f) {
  if (!f.alive) return;
  const B = r3YPR(f.heading, f.pitch || 0, Math.sin(f.wig) * 0.08), M = new Float32Array(16);
  m4basis(M, B, f.x, f.y, f.z, 1.1, 1.1, 1.1);
  glPush(MESH.fish, M);
  glPush(MESH.tail, mm(M, mm(m4trans(0, 0, -0.32), m4rotY(Math.sin(f.wig) * 0.5))));
}

// ---------- effects ----------
const FX = [];   // simple ballistic droplets & dust
function addRipple(x, z, s) {
  const i = RND.rippleN < 12 ? RND.rippleN++ : (RND.ripI = ((RND.ripI || 0) + 1) % 12);
  RND.ripples[i * 4] = x; RND.ripples[i * 4 + 1] = z; RND.ripples[i * 4 + 2] = RND.time; RND.ripples[i * 4 + 3] = s;
}
function splashBits(x, y, z, n) {
  for (let i = 0; i < n * QUAL.particles; i++) FX.push({ x: x + F1(-0.4, 0.4), y, z: z + F1(-0.4, 0.4), vx: F1(-1.5, 1.5), vy: F1(1.5, 3.5), vz: F1(-1.5, 1.5), t: 0, life: F1(0.5, 0.9), s: F1(0.04, 0.08), k: 'drop' });
}
function bigSplash(x, y, z, s) {
  splashBits(x, y, z, Math.round(16 * s));
  for (let i = 0; i < 6 * s * QUAL.particles; i++) FX.push({ x: x + F1(-0.5, 0.5), y: y + 0.1, z: z + F1(-0.5, 0.5), vx: F1(-0.6, 0.6), vy: F1(0.4, 1.2), vz: F1(-0.6, 0.6), t: 0, life: F1(0.6, 1.1), s: F1(0.3, 0.6) * s, k: 'mist' });
  addRipple(x, z, s);
}
function dustPuff(x, y, z, n) { for (let i = 0; i < n * QUAL.particles; i++) FX.push({ x: x + F1(-0.6, 0.6), y: y + 0.1, z: z + F1(-0.6, 0.6), vx: F1(-1, 1), vy: F1(0.3, 1), vz: F1(-1, 1), t: 0, life: F1(0.7, 1.3), s: F1(0.3, 0.6), k: 'dust' }); }
function fxStep(dt) {
  for (let i = FX.length - 1; i >= 0; i--) {
    const p = FX[i]; p.t += dt; if (p.t > p.life) { FX.splice(i, 1); continue; }
    if (p.k === 'drop') p.vy -= 9.8 * dt; else { p.vy *= 1 - dt; p.vx *= 1 - dt * 2; p.vz *= 1 - dt * 2; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
  }
  if (FX.length > 900) FX.splice(0, FX.length - 900);
}
function fxDraw() {
  for (const p of FX) {
    const a = 1 - p.t / p.life;
    if (p.k === 'drop') glPart(PART.alpha, p.x, p.y, p.z, p.s, 0.75, 0.85, 0.92, 0.85 * a, 0, 2);
    else if (p.k === 'mist') glPart(PART.alpha, p.x, p.y, p.z, p.s * (1 + p.t), 0.85, 0.9, 0.95, 0.4 * a, p.t, 0);
    else glPart(PART.alpha, p.x, p.y, p.z, p.s * (1 + p.t * 1.5), 0.42, 0.36, 0.28, 0.35 * a, p.t, 0);
  }
  // mist and spray rising off the plunge pool
  const fb = SCENERY.fallsBottom; if (!fb) return;
  if (Math.hypot(RND.cam[0] - fb[0], RND.cam[2] - fb[2]) < 140) {
    const [dx, dz] = SCENERY.fallsDir, half = SCENERY.fallsHalf;
    for (let i = 0; i < 16 * QUAL.particles; i++) {
      const u = F1(-1, 1) * half, k = (RND.time * 0.35 + i * 0.137) % 1;
      glPart(PART.alpha, fb[0] - dz * u + dx * F1(0, 2), fb[1] + k * 4, fb[2] + dx * u + dz * F1(0, 2), 0.9 + k * 2.2, 0.88, 0.92, 0.96, 0.22 * (1 - k), k * 3 + i, 0);
    }
  }
}

// ---------- speech bubbles (DOM, projected) ----------
function bubble(h, text, dur) {
  if (h.bub) h.bub.el.remove();
  const el = document.createElement('div'); el.className = 'bub'; el.textContent = text; document.getElementById('hud').appendChild(el);
  h.bub = { el, t: dur };
}
function bubblesUpdate(dt) {
  const v = RND.vp;
  for (const h of HIKERS) {
    if (!h.bub) continue;
    h.bub.t -= dt; if (h.bub.t <= 0 || h.state === 'gone') { h.bub.el.remove(); h.bub = null; continue; }
    const x = h.x, y = h.y + 2.15 * h.scale, z = h.z;
    const cx = v[0] * x + v[4] * y + v[8] * z + v[12], cy = v[1] * x + v[5] * y + v[9] * z + v[13], cw = v[3] * x + v[7] * y + v[11] * z + v[15];
    if (cw < 0.1) { h.bub.el.style.display = 'none'; continue; }
    const sx = (cx / cw * 0.5 + 0.5) * innerWidth, sy = (1 - (cy / cw * 0.5 + 0.5)) * innerHeight;
    const d = Math.hypot(x - RND.cam[0], z - RND.cam[2]);
    h.bub.el.style.display = d > 70 ? 'none' : '';
    h.bub.el.style.transform = `translate(${sx.toFixed(0)}px,${sy.toFixed(0)}px) translate(-50%,-100%) scale(${clamp(14 / d, 0.6, 1.1).toFixed(2)})`;
    h.bub.el.style.opacity = Math.min(1, h.bub.t * 3);
  }
}
