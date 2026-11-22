// Boot, time of day, camera, frame assembly, main loop and the test API (window.LA).
const TIMES = {
  morning: { elev: 15, az: 80, cloud: 0.36, fog: 2.0, exposure: 1.12, wave: 0.04, grade: [0.97, 1.0, 1.05], label: 'MORNING', hor: [0.72, 0.78, 0.86], sunTint: [1.0, 0.97, 0.92] },
  noon:    { elev: 57, az: 160, cloud: 0.5, fog: 0.75, exposure: 0.92, wave: 0.11, grade: [1, 1, 1], label: 'NOON' },
  golden:  { elev: 8, az: 240, cloud: 0.42, fog: 1.0, exposure: 1.18, wave: 0.075, grade: [1.04, 1.0, 0.95], label: 'GOLDEN HOUR' },
  sunset:  { elev: 1.4, az: 255, cloud: 0.46, fog: 1.25, exposure: 1.55, wave: 0.06, grade: [1.04, 0.98, 0.97], label: 'SUNSET' },
};
const SKY = { p: null, name: 'golden' };
SKY.set = function (name) {
  if (!TIMES[name]) name = 'golden';
  SKY.name = name;
  const T = TIMES[name], e = T.elev * DEG, a = T.az * DEG;
  const sunDir = [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)];
  const m = 1 / (Math.sin(e) + 0.50572 * Math.pow(T.elev + 6.07995, -1.6364));
  const beta = [0.04, 0.095, 0.23];
  const sunCol = beta.map((b) => Math.exp(-b * m) * 3.3);
  const day = smoothstep(-1, 30, T.elev);
  const warm = 1 - smoothstep(0, 16, T.elev);
  const mix3 = (A, B, t) => [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)];
  const mul3 = (A, s) => [A[0] * s, A[1] * s, A[2] * s];
  const zen = mul3(mix3([0.07, 0.11, 0.26], [0.13, 0.3, 0.7], day), 0.45 + 0.75 * day);
  let hor = mul3(mix3([0.6, 0.73, 0.9], [1.1, 0.66, 0.4], warm), 0.55 + 0.55 * day);
  if (T.hor) hor = mul3(T.hor, 0.6 + 0.5 * day);
  if (T.sunTint) for (let i = 0; i < 3; i++) sunCol[i] *= T.sunTint[i];
  const ground = v3.add(mul3([0.06, 0.08, 0.055], 0.5 + 1.1 * day), mul3(sunCol, 0.015));
  const fog = mix3(hor, mul3(zen, 1.3), 0.25);
  SKY.p = {
    sunDir, sunCol, zen, hor, ground, fog, fogDen: 0.00013 * T.fog, cloud: T.cloud, exposure: T.exposure,
    waveAmp: T.wave, grade: T.grade, waterDeep: [0.03, 0.085, 0.095],
  };
};

const CAM = { pos: [0, 150, 0], fwd: [0, 0, 1], right: [-1, 0, 0], up: [0, 1, 0], view: m4.ident(), proj: m4.ident(), vp: m4.ident(), fov: 70 * DEG, mode: 'orbit', test: null };
function updateCamera(dt) {
  const p = G.player;
  let mode;
  if (CAM.test) mode = 'test';
  else if (G.phase === 'title' || !p) mode = 'orbit';
  else if (!p.alive && G.t - p.outT > 2.5) mode = 'spectate';
  else mode = CAMSTATE.view;
  CAM.mode = mode;
  // scope and breath
  const canAds = mode === 'fp' && p && p.alive && p.rifle.lower < 0.3 && !UI.paused;
  const adsWant = canAds && (INPUT.ads || INPUT.adsToggle);
  CAMSTATE.adsT = clamp(CAMSTATE.adsT + (adsWant ? dt : -dt) / 0.18, 0, 1);
  const holding = INPUT.breath && CAMSTATE.stamina > 0 && CAMSTATE.gasp <= 0;
  if (holding) { CAMSTATE.stamina -= dt / 4; if (CAMSTATE.stamina <= 0) CAMSTATE.gasp = 1.5; }
  else CAMSTATE.stamina = Math.min(1, CAMSTATE.stamina + dt / 3);
  CAMSTATE.gasp = Math.max(0, CAMSTATE.gasp - dt);
  const fovHip = 72 * DEG, fovAds = 2 * Math.atan(Math.tan(fovHip / 2) / 4);
  const k = smoothstep(0, 1, CAMSTATE.adsT);
  CAM.fov = 2 * Math.atan(lerp(Math.tan(fovHip / 2), Math.tan(fovAds / 2), k));
  let eye, fwd, up = [0, 1, 0];
  if (mode === 'fp') {
    const B = chairBasis(p);
    eye = v3.add(B.seat, v3.add(v3.mul(B.u, 0.79), v3.mul(B.f, -0.03)));
    const t = G.t;
    let amp = lerp(0.0042, 0.0024, k);
    if (holding) amp *= 0.15;
    if (CAMSTATE.gasp > 0) amp *= 2.5;
    amp += Math.hypot(p.swingV[0], p.swingV[1]) * 0.012 * (G.settings.sway ? 1 : 0.3);
    const sy = (Math.sin(t * 0.83) * 0.6 + Math.sin(t * 1.91 + 1.3) * 0.4) * amp;
    const sp = (Math.sin(t * 1.27 + 2.1) * 0.6 + Math.sin(t * 0.61) * 0.4) * amp * 0.8 + Math.sin(t * 1.6) * amp * 0.3;
    const yaw = INPUT.yaw + sy, pitch = INPUT.pitch + sp + p.rifle.recoil * 0.004;
    fwd = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    if (G.settings.sway) up = v3.norm(v3.lerp([0, 1, 0], B.u, 0.6));
  } else if (mode === 'chase') {
    const s = seatPos(p);
    const yaw = INPUT.yaw, pitch = clamp(INPUT.pitch, -1.2, 1.2);
    const dir = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    const focus = v3.add(s, [0, 1.8, 0]);
    eye = v3.sub(focus, v3.mul(dir, 9));
    fwd = dir;
  } else if (mode === 'test') {
    eye = CAM.test.pos.slice();
    fwd = v3.norm(v3.sub(CAM.test.look, eye));
    if (CAM.test.fov) CAM.fov = CAM.test.fov * DEG;
  } else {
    // slow orbit around one live chair (title screen and spectating), switching now and then
    const alive = G.chairs.filter((c) => c.alive);
    const set = alive.length ? alive : G.chairs;
    CAMSTATE.followT = (CAMSTATE.followT || 0) - dt;
    if (!CAMSTATE.follow || !set.includes(CAMSTATE.follow) || CAMSTATE.followT < 0) {
      CAMSTATE.follow = set[(set.indexOf(CAMSTATE.follow) + 1) % set.length] || set[0];
      CAMSTATE.followT = 18;
      CAMSTATE.snap = true;
    }
    const c = CAMSTATE.follow;
    const s = seatPos(c), cc = clusterCentre(c);
    const f = v3.lerp(s, cc, 0.42);
    CAMSTATE.focus = CAMSTATE.snap ? f : v3.lerp(CAMSTATE.focus, f, 1 - Math.exp(-dt * 2));
    CAMSTATE.snap = false;
    CAMSTATE.orbitA += dt * 0.06;
    const a = CAMSTATE.orbitA, rad = 17;
    eye = v3.add(CAMSTATE.focus, [Math.cos(a) * rad, -3.5 + Math.sin(a * 0.7) * 2, Math.sin(a) * rad]);
    fwd = v3.norm(v3.sub(v3.add(CAMSTATE.focus, [0, 0.5, 0]), eye));
    CAM.fov = 58 * DEG;
  }
  CAM.pos = eye; CAM.fwd = v3.norm(fwd);
  CAM.right = v3.norm(v3.cross(CAM.fwd, up));
  CAM.up = v3.cross(CAM.right, CAM.fwd);
  CAM.view = m4.lookAt(eye, v3.add(eye, CAM.fwd), CAM.up);
  const aspect = R.W / R.H;
  CAM.proj = m4.persp(CAM.fov, aspect, mode === 'fp' ? 0.12 : 0.3, 24000);
  CAM.vp = m4.mul(CAM.proj, CAM.view);
  CAM.fpVP = m4.mul(m4.persp(CAM.fov, aspect, 0.02, 90), CAM.view);
  // the rifle and arms use their own narrower field of view so they don't stretch
  CAM.vmFov = lerp(50 * DEG, 30 * DEG, k);
  CAM.vmVP = m4.mul(m4.persp(CAM.vmFov, aspect, 0.02, 10), CAM.view);
  CAM.camToWorld = m4.invert(CAM.view);
}

// ---------- frame assembly ----------
const FR = {
  balloons: new Float32Array(12 * 900), parts: new Float32Array(12 * 3000), ribbons: new Float32Array(7 * 6 * 2500), ripples: new Float32Array(64),
  objects: [], nB: 0, nP: 0, nR: 0,
};
function rotX(a) { const m = m4.ident(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
function rotY(a) { const m = m4.ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
function rotZ(a) { const m = m4.ident(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
function trans(t) { const m = m4.ident(); m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; return m; }
function scaleM(s) { const m = m4.ident(); m[0] = m[5] = m[10] = s; return m; }

function pushBalloon(p, r, axis, col, gloss, seed) {
  if (FR.nB >= 900) return;
  const o = FR.nB * 12, B = FR.balloons;
  B[o] = p[0]; B[o + 1] = p[1]; B[o + 2] = p[2]; B[o + 3] = r;
  B[o + 4] = axis[0]; B[o + 5] = axis[1]; B[o + 6] = axis[2]; B[o + 7] = seed;
  B[o + 8] = col[0]; B[o + 9] = col[1]; B[o + 10] = col[2]; B[o + 11] = gloss;
  FR.nB++;
}
function pushRibbon(a, b, width, col, alpha) {
  if (FR.nR >= 2500) return;
  const mid = v3.lerp(a, b, 0.5);
  const toCam = v3.sub(CAM.pos, mid);
  const dist = v3.len(toCam);
  if (dist > 1500) return;
  // keep thin lines at least ~1.2 px wide, fading them instead of shrinking them
  const pxPerM = innerHeight / (2 * Math.tan(CAM.fov / 2) * Math.max(dist, 0.05));
  const minW = 1.2 / pxPerM;
  let w = width, al = alpha;
  if (w < minW) { al *= w / minW; w = minW; }
  if (al < 0.02) return;
  const dir = v3.sub(b, a);
  let side = v3.cross(dir, toCam);
  const sl = v3.len(side); if (sl < 1e-6) return;
  side = v3.mul(side, w * 0.5 / sl);
  const R4 = FR.ribbons, o = FR.nR * 42;
  const P = [v3.add(a, side), v3.sub(a, side), v3.sub(b, side), v3.add(a, side), v3.sub(b, side), v3.add(b, side)];
  for (let i = 0; i < 6; i++) {
    const k = o + i * 7;
    R4[k] = P[i][0]; R4[k + 1] = P[i][1]; R4[k + 2] = P[i][2]; R4[k + 3] = col[0]; R4[k + 4] = col[1]; R4[k + 5] = col[2]; R4[k + 6] = al;
  }
  FR.nR++;
}
function pushPart(p, size, col, a, vel, type) {
  if (FR.nP >= 3000) return;
  const o = FR.nP * 12, P = FR.parts;
  P[o] = p[0]; P[o + 1] = p[1]; P[o + 2] = p[2]; P[o + 3] = size;
  P[o + 4] = col[0]; P[o + 5] = col[1]; P[o + 6] = col[2]; P[o + 7] = a;
  P[o + 8] = vel[0]; P[o + 9] = vel[1]; P[o + 10] = vel[2]; P[o + 11] = type;
  FR.nP++;
}

const POSE = { yaw: 0.4, pitch: -0.3, roll: 0.6 };
function buildFrame() {
  FR.nB = 0; FR.nP = 0; FR.nR = 0;
  const objs = [];
  const M = R.meshes;
  const fpMode = CAM.mode === 'fp';
  const strCol = [0.8, 0.8, 0.76], ropeCol = [0.4, 0.35, 0.28];
  for (const c of G.chairs) {
    const isFP = fpMode && c === G.player;
    const B = chairBasis(c);
    const far = v3.dist(B.seat, CAM.pos) > 2500;
    if (far) continue;
    if (c.meshes) {
      objs.push({ mesh: c.meshes.chair, model: B.m, fp: isFP });
      objs.push({ mesh: c.meshes.legs, model: B.m, fp: isFP });
      const shake = c.blower.on ? m4.mul(trans([(Math.random() - 0.5) * 0.004, (Math.random() - 0.5) * 0.004, 0]), m4.ident()) : null;
      objs.push({ mesh: M.blower, model: shake ? m4.mul(B.m, shake) : B.m, fp: isFP });
      if (isFP) objs.push({ mesh: c.meshes.chest, model: B.m, fp: true });
      if (!isFP) {
        // upper body turns with the aim; rifle lowers while pumping
        const pivot = m4.xform(B.m, [0, 0.42, -0.12]);
        const rf = c.rifle;
        const yaw = c.aimYaw;
        const upM = m4.yawPitch(pivot, yaw, clamp(c.aimPitch, -0.4, 0.6) * 0.35 - rf.lower * 0.15);
        objs.push({ mesh: c.meshes.upper, model: upM });
        const grip = m4.xform(upM, [-0.1, -0.03, 0.29]);
        const rm = m4.yawPitch(grip, yaw + rf.lower * 0.5, c.aimPitch - rf.lower * 0.9 + rf.recoil * 0.08);
        objs.push({ mesh: M.rifle, model: rm });
        objs.push({ mesh: M.lever, model: m4.mul(m4.mul(rm, trans(R.rifleHinge)), rotX(-rf.lever * 0.9)) });
      }
    }
    // jugs on cords
    for (let j = 0; j < 6; j++) {
      const jp = jugWorld(c, j, B);
      const sw = Math.sin(G.t * 1.9 + j * 1.3 + c.idx) * 0.08;
      const jm = m4.basis(v3.add(jp, [0, 0.12, 0]), B.r, B.u, B.f);
      const fill = c.jugs[j].kg / (PHYS.waterMax / 6);
      objs.push({ mesh: M.jug, model: m4.mul(jm, rotZ(sw)), tint: [lerp(1.02, 0.72, fill), lerp(1.02, 0.86, fill), lerp(1.0, 1.05, fill), 1], fp: isFP });
      const tie = m4.xform(B.m, [JUG_POS[j][0] * 0.9, 0, JUG_POS[j][2]]);
      pushRibbon(tie, v3.add(jp, [0, 0.12, 0]), isFP ? 0.003 : 0.006, ropeCol, 1);
    }
    // rigging: ring above the seat, ropes to the chair, tether to the hub
    if (c.meshes) {
      const ring = v3.add(B.seat, v3.mul(B.u, PHYS.ring));
      for (const t of c.meshes.tie) pushRibbon(m4.xform(B.m, t), ring, isFP ? 0.0028 : 0.012, ropeCol, isFP ? 0.85 : 1);
      pushRibbon(ring, c.hub, 0.016, ropeCol, 1);
    }
    // balloons and strings
    for (const b of c.balloons) {
      if (!b.alive) continue;
      const axis = v3.norm(v3.sub(b.p, c.hub));
      pushBalloon(b.p, b.r, axis, b.col, b.gloss, b.seed);
      const neck = v3.sub(b.p, v3.mul(axis, b.r * 1.22));
      pushRibbon(neck, c.hub, 0.004, strCol, 1);
    }
  }
  // free balloons with dangling strings
  for (const f of G.free) {
    pushBalloon(f.p, f.r, f.axis, f.col, f.gloss, f.seed);
    const neck = v3.sub(f.p, v3.mul(f.axis, f.r * 1.22));
    const tail = v3.add(neck, [Math.sin(G.t * 2 + f.seed * 9) * 0.4, -2.6, Math.cos(G.t * 1.7) * 0.4]);
    pushRibbon(neck, tail, 0.004, strCol, 1);
  }
  // practice targets: buoy, long tether, three balloons
  for (const t of G.targets) {
    objs.push({ mesh: M.buoy, model: m4.basis([t.anchor[0], Math.sin(G.t * 1.3 + t.anchor[0]) * 0.05, t.anchor[2]], [1, 0, 0], [0, 1, 0], [0, 0, 1]), noShadow: true });
    if (!t.alive) continue;
    pushRibbon([t.anchor[0], 0.7, t.anchor[2]], t.hub, 0.01, [0.95, 0.4, 0.2], 1);
    for (const b of t.balloons) {
      if (!b.alive) continue;
      const axis = v3.norm(v3.sub(b.p, t.hub));
      pushBalloon(b.p, b.r, axis, b.col, b.gloss, b.seed);
      pushRibbon(v3.sub(b.p, v3.mul(axis, b.r * 1.22)), t.hub, 0.004, strCol, 1);
    }
  }
  // boats and spectators
  for (const b of G.boats) {
    const mesh = M.boat[b.kind]; if (!mesh) continue;
    const yaw = Math.PI / 2 - b.heading;
    const bob = Math.sin(b.bob * 1.3) * 0.04;
    const bm = m4.mul(m4.yawPitch([b.p[0], bob + (b.kind === 'pontoon' ? 0.15 : 0.05), b.p[2]], yaw, Math.sin(b.bob * 0.9) * 0.02), rotZ(Math.sin(b.bob * 1.1) * 0.03));
    objs.push({ mesh, model: bm, noShadow: true });
    for (let i = 0; i < b.people; i++) {
      const off = b.kind === 'pontoon' ? [(i - 1) * 0.8, 0.6, -0.4 + (i % 2) * 0.9] : [0, 0.15, -0.9 + i * 1.1];
      const sm = m4.mul(bm, m4.mul(trans(off), rotY(i * 1.3 + (b.rescue ? 3.14 : 0))));
      objs.push({ mesh: M.spectator[(i + (b.i || 0)) % 4], model: sm, noShadow: true });
    }
  }
  // first-person rifle and arms
  const p = G.player;
  if (fpMode && p && p.alive && p.meshes) {
    const rf = p.rifle, k = smoothstep(0, 1, CAMSTATE.adsT);
    if (CAMSTATE.adsT < 0.9) {
      const hip = [0.15, -0.17, -0.52], ads = [0, -0.07, -0.34];
      let pos = v3.lerp(hip, ads, k);
      const low = rf.lower;
      // pumping: rifle swings across the body, muzzle up and to the left, so the lever stroke shows
      pos = v3.add(pos, [-0.1 * low, -0.07 * low, 0.12 * low + rf.recoil * 0.03]);
      const boltPose = rf.state === 'bolt' ? Math.sin(clamp(rf.t / 0.55, 0, 1) * Math.PI) : 0;
      let vm = m4.mul(trans(pos), rotY(Math.PI + POSE.yaw * low - 0.15 * boltPose));
      vm = m4.mul(vm, rotX(POSE.pitch * low - rf.recoil * 0.06));
      vm = m4.mul(vm, rotZ(POSE.roll * low + 0.5 * boltPose));
      const rw = m4.mul(CAM.camToWorld, vm);
      objs.push({ mesh: M.rifle, model: rw, fp: true, vm: true });
      const lever = m4.mul(m4.mul(rw, trans(R.rifleHinge)), rotX(-rf.lever * 0.95));
      objs.push({ mesh: M.lever, model: lever, fp: true, vm: true });
      const look = p.look;
      const jack = [look.jacket[0], look.jacket[1], look.jacket[2], 1], skin = [look.skin[0], look.skin[1], look.skin[2], 1];
      const V = (q) => m4.xform(CAM.camToWorld, q);
      const handR = m4.xform(rw, [0, -0.035, -0.03]);
      const handL = m4.xform(lever, [0, -0.045, -0.26]);
      const elbowR = V([0.3 - 0.12 * k, -0.42, -0.3]), shR = V([0.26, -0.55, 0.1]);
      const elbowL = V([-0.16 + 0.06 * k, -0.42, -0.42 + 0.1 * low]), shL = V([-0.26, -0.55, 0.08]);
      objs.push({ mesh: M.utube, model: limbMatrix(handR, elbowR, 0.04), tint: jack, fp: true, vm: true });
      objs.push({ mesh: M.utube, model: limbMatrix(elbowR, shR, 0.052), tint: jack, fp: true, vm: true });
      objs.push({ mesh: M.utube, model: limbMatrix(handL, elbowL, 0.04), tint: jack, fp: true, vm: true });
      objs.push({ mesh: M.utube, model: limbMatrix(elbowL, shL, 0.052), tint: jack, fp: true, vm: true });
      const hm = (q, s) => m4.mul(trans(q), scaleM(s));
      objs.push({ mesh: M.usphere, model: hm(handR, 0.042), tint: skin, fp: true, vm: true });
      objs.push({ mesh: M.usphere, model: hm(handL, 0.042), tint: skin, fp: true, vm: true });
    }
  }
  // pellets as tracers
  for (const pl of G.pellets) {
    const own = pl.owner === G.player;
    if (!G.settings.tracers && !own) continue;
    const bright = G.settings.tracers ? 1 : 0.35;
    pushPart(pl.p, 0.012, [2.4 * bright, 2.1 * bright, 1.5 * bright], 1, pl.v, 2);
  }
  // particles
  for (const q of G.parts) {
    const life = q.age / q.life;
    if (q.type === 1) { pushPart(q.p, q.size, q.col, q.seed, q.v, 1); continue; }
    const size = q.size * (1 + (q.grow || 0) * life);
    const a = q.a * (1 - life) * (q.type === 3 ? 1 : 1);
    pushPart(q.p, size, q.col, a, q.v, q.type === 3 ? 3 : 0);
  }
  // water streams from pouring jugs: short ribbon
  for (const c of G.chairs) {
    if (!c.flowing) continue;
    const jp = jugWorld(c, c.flowing - 1);
    pushRibbon(v3.add(jp, [0, -0.15, 0]), v3.add(jp, [c.vel[0] * 0.2, -1.6, c.vel[2] * 0.2]), 0.035, [0.75, 0.85, 0.95], 0.55);
  }
  // ripples
  FR.ripples.fill(0);
  for (let i = 0; i < G.ripples.length && i < 16; i++) {
    const r = G.ripples[i];
    FR.ripples.set([r.x, r.z, G.t - r.t0, r.s], i * 4);
  }
  FR.objects = objs;
  // shadow cascades follow the camera
  const sc0 = CAM.mode === 'fp' ? CAM.pos : (G.player ? seatPos(G.player) : CAMSTATE.focus);
  return {
    cam: CAM, vp: CAM.vp, fpVP: CAM.fpVP, vmVP: CAM.vmVP, time: G.t, sky: SKY.p,
    mirrorEye: [CAM.pos[0], -CAM.pos[1], CAM.pos[2]],
    mirrorVP: m4.mul(CAM.vp, m4.basis([0, 0, 0], [1, 0, 0], [0, -1, 0], [0, 0, 1])),
    objects: objs, balloons: FR.balloons, nBalloons: FR.nB, parts: FR.parts, nParts: FR.nP,
    ribbons: FR.ribbons, nRibbonVerts: FR.nR * 6, ripples: FR.ripples,
    shadowCenter0: sc0, shadowHalf0: 7, shadowCenter1: v3.add(CAM.pos, v3.mul(CAM.fwd, 40)), shadowHalf1: 130,
    damage: HUD.flashA,
  };
}

// ---------- loop ----------
const LOOP = { last: 0, acc: 0, frames: 0, fpsT: 0, fpsN: 0, running: true, simSpeed: 1 };
function tick(now) {
  if (!LOOP.running) return;
  requestAnimationFrame(tick);
  const dt = clamp((now - (LOOP.last || now)) / 1000, 0, 0.1);
  LOOP.last = now;
  LOOP.fpsT += dt; LOOP.fpsN++;
  if (LOOP.fpsT > 1) {
    UI.fps = LOOP.fpsN / LOOP.fpsT; LOOP.fpsT = 0; LOOP.fpsN = 0;
    R.adapt(UI.fps);
    UI.refreshLabels();
  }
  if (!UI.paused && !TEST_FREEZE.on) {
    LOOP.acc += dt * LOOP.simSpeed;
    let n = 0;
    while (LOOP.acc >= 1 / 60 && n < 6) { simStep(1 / 60); LOOP.acc -= 1 / 60; n++; }
    if (n === 6) LOOP.acc = 0;
  }
  if (UI.resultsT > 0) { UI.resultsT -= dt; if (UI.resultsT <= 0) UI.showResults(); }
  renderFrame(dt);
}
function renderFrame(dt) {
  updateCamera(dt || 0);
  const F = buildFrame();
  R.render(F);
  HUD.draw(dt || 0);
  const p = G.player;
  AUD.setListener(CAM.pos, CAM.fwd, CAM.up);
  const rb = G.boats.find((b) => b.rescue);
  AUD.update(dt || 0, {
    wind: p ? Math.hypot(p.vel[0], p.vel[2]) : 1, alt: p ? seatPos(p)[1] : 150,
    pour: p && p.pouring, motor: rb && rb.moving, motorPos: rb && rb.p,
    blow: p && p.blower.on, blowFar: nearestBlower(),
  });
  $('clickToPlay').classList.toggle('hidden', TEST || G.settings.touch || INPUT.locked || UI.paused || !(G.phase === 'play' || G.phase === 'countdown') || UI.resultsT > -1 && G.phase === 'over');
}
const TEST_FREEZE = { on: false };
function nearestBlower() {
  let best = null, bd = 1e9;
  for (const c of G.chairs) {
    if (c === G.player || !c.blower.on) continue;
    const d = v3.dist(c.hub, CAM.pos);
    if (d < bd) { bd = d; best = blowerNozzle(c).p; }
  }
  return best;
}

// ---------- test API ----------
window.LA = {
  ready: false,
  log: () => LOG.slice(),
  state() {
    return {
      phase: G.phase, mode: G.mode, diff: G.diff, t: +G.t.toFixed(2), matchT: +G.matchT.toFixed(2), score: G.score,
      quality: R.qName, time: SKY.name, fps: Math.round(UI.fps), render: [R.rw, R.rh], canvas: [R.W, R.H],
      winner: G.winner ? G.winner.name : null, pellets: G.pellets.length, parts: G.parts.length, free: G.free.length,
      chairs: G.chairs.map((c) => {
        const s = seatPos(c);
        return { name: c.name, player: c.isPlayer, alive: c.alive, out: c.out, alt: +s[1].toFixed(1), pos: [+s[0].toFixed(1), +s[2].toFixed(1)], vy: +c.vel[1].toFixed(2), vh: [+c.vel[0].toFixed(2), +c.vel[2].toFixed(2)], blower: { heat: +c.blower.heat.toFixed(2), on: c.blower.on, lock: c.blower.lock }, balloons: aliveBalloons(c), water: +chairWater(c).toFixed(2), eq: +eqAltitude(c).toFixed(1), rifle: { pumps: c.rifle.pumps, loaded: c.rifle.loaded, state: c.rifle.state }, stats: { ...c.stats } };
      }),
      feed: G.feed.map((f) => f.s),
    };
  },
  start(mode, diff, seed) { if (diff) G.diff = diff; UI.start(mode || 'duel'); if (seed !== undefined) { setupMatch(G.mode, G.diff, { seed }); G.phase = 'countdown'; G.countdown = 3.4; } return LA.state(); },
  title() { UI.showTitle(); return LA.state(); },
  spectate(mode, diff, seed) { G.diff = diff || 'normal'; for (const id of ['title', 'pause', 'results']) $(id).classList.add('hidden'); setupMatch(mode || 'ffa', G.diff, { spectate: true, seed: seed || 1 }); G.phase = 'play'; return LA.state(); },
  setTime(t) { G.settings.time = t; UI.apply(); UI.refreshLabels(); return SKY.name; },
  setQuality(q) { G.settings.quality = q; UI.apply(); UI.refreshLabels(); return R.qName; },
  setting(k, v) { G.settings[k] = v; UI.apply(); UI.refreshLabels(); return G.settings[k]; },
  view(opts) { CAM.test = opts && opts.pos ? opts : null; if (opts && opts.mode) { CAM.test = null; CAMSTATE.view = opts.mode; } return true; },
  freeze(on) { TEST_FREEZE.on = !!on; return TEST_FREEZE.on; },
  step(sec, sub) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) simStep(1 / 60); return LA.state(); },
  frame() { renderFrame(1 / 60); return true; },
  aimAt(i, lead) {
    const p = G.player, o = G.chairs[i]; if (!p || !o) return false;
    updateCamera(0);
    const cc = clusterCentre(o);
    const eye = CAM.pos;
    const d = v3.norm(v3.sub(cc, eye));
    INPUT.yaw = Math.atan2(d[0], d[2]); INPUT.pitch = Math.asin(d[1]) + (lead || 0);
    return { yaw: INPUT.yaw, pitch: INPUT.pitch, dist: v3.dist(cc, eye) };
  },
  look(yaw, pitch) { INPUT.yaw = yaw; INPUT.pitch = pitch; return true; },
  blow(on) { INPUT.blow = !!on; return true; },
  // aim the player with a full ballistic solution (test helper)
  autoAim(i) {
    const p = G.player, o = G.chairs[i]; if (!p || !o) return false;
    updateCamera(0);
    const origin = v3.add(CAM.pos, v3.mul(CAM.fwd, 0.7));
    const sol = solveAim(origin, p.vel, clusterCentre(o), o.vel, muzzleVel(Math.max(1, p.rifle.pumps)));
    INPUT.yaw = Math.atan2(sol.dir[0], sol.dir[2]); INPUT.pitch = Math.asin(sol.dir[1]);
    return { tf: sol.tf, dist: v3.dist(clusterCentre(o), origin) };
  },
  closeView(i, d, h, a) {
    const o = G.chairs[i]; const s = seatPos(o);
    const ang = a === undefined ? 0.8 : a;
    CAM.test = { pos: [s[0] + Math.cos(ang) * (d || 6), s[1] + (h === undefined ? 1.5 : h), s[2] + Math.sin(ang) * (d || 6)], look: [s[0], s[1] + 0.6, s[2]], fov: 50 };
    return true;
  },
  ads(on) { INPUT.adsToggle = !!on; return true; },
  pumpTo(n) { const p = G.player; if (!p) return false; p.rifle.loaded = true; p.rifle.state = 'idle'; p.rifle.pumps = clamp(n, 0, 10); return true; },
  fire() { const p = G.player; if (!p || !p.rifle.loaded || !p.rifle.pumps) return false; updateCamera(0); const a = playerAim(); fireRifle(p, a.origin, a.dir); return true; },
  pop(ci, n) { const c = G.chairs[ci]; let k = 0; for (const b of c.balloons) { if (k >= (n || 1)) break; if (b.alive) { popBalloon(c, b, null, 0); k++; } } return aliveBalloons(c); },
  cut(ci) { const c = G.chairs[ci]; const b = c.balloons.find((x) => x.alive); if (b) releaseBalloon(c, b, c, 'cut'); return aliveBalloons(c); },
  pour(ci, kg) { const c = G.chairs[ci]; let need = kg; for (const j of c.jugs) { const t = Math.min(j.kg, need); j.kg -= t; need -= t; } return chairWater(c); },
  holeJug(ci, j) { G.chairs[ci].jugs[j || 0].leak = true; return true; },
  splash(ci) { const c = G.chairs[ci]; c.hub[1] = PHYS.tether + 0.2; c.vel[1] = -2; return true; },
  perf() { return { fps: UI.fps, cpuMs: R.stats.cpuMs, build: R.stats.buildMs, terrain: R.stats.terrainMs, trees: R.treeCounts, render: [R.rw, R.rh] }; },
  wind(alt) { const p = G.player || G.chairs[0]; return WIND.at(p.hub[0], alt, p.hub[2], G.t); },
  layers() { return WIND.layers.map((l) => ({ alt: l.alt, dir: +(l.dir / DEG).toFixed(0), spd: +l.spd.toFixed(2) })); },
};

// ---------- boot ----------
function boot() {
  const err = (m) => { const e = $('err'); e.style.display = 'block'; e.innerHTML = '<b>Lawnchair Aces could not start.</b><br>' + m; $('boot').classList.add('hidden'); console.error('[LA] ' + m); };
  try {
    UI.load();
    R.qName = G.settings.quality;
    R.init($('gl'));
    HUD.init();
    SKY.set(G.settings.time);
    UI.bind();
    UI.renderSettings();
    UI.apply();
    UI.showTitle();
    if (TEST && URLQ.get('mode')) {
      if (URLQ.has('spectate')) LA.spectate(URLQ.get('mode'), URLQ.get('diff') || 'normal', +(URLQ.get('seed') || 1));
      else LA.start(URLQ.get('mode'), URLQ.get('diff') || 'normal');
    }
  } catch (e) {
    err(e.message + '<br><small>' + (e.stack || '').split('\n').slice(0, 3).join('<br>') + '</small>');
    return;
  }
  $('boot').classList.add('hidden');
  LA.ready = true;
  logMsg('ready');
  requestAnimationFrame(tick);
}
window.addEventListener('load', boot);
