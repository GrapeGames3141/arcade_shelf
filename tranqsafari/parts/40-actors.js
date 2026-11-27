// ===== Actors: raptors, gliders, long-neck, stampede herd, chargers, Rumblejaw =====
const ACTORS = [];
let ACTOR_ID = 1;
// attach points on the jeep (jeep local: +x forward, +y up, +z right), facing direction for a clinging raptor
const ATTACH = [
  { p: [1.72, 1.04, -0.6], yaw: -Math.PI * 0.85, name: 'hood-left' },
  { p: [1.72, 1.04, 0.62], yaw: Math.PI * 0.95, name: 'hood-right' },
  { p: [0.95, 0.97, 1.0], yaw: -Math.PI * 0.62, name: 'fender-right' },
  { p: [1.15, 0.98, -0.96], yaw: Math.PI * 0.65, name: 'fender-left' },
  { p: [-1.78, 1.0, 0.4], yaw: 0, name: 'rear-right' },
  { p: [-1.78, 1.0, -0.4], yaw: 0, name: 'rear-left' },
];
const DIFF = [{ name: 'EASY', dmg: 0.6, cling: 2.7, boss: 0.8 }, { name: 'NORMAL', dmg: 1, cling: 2.05, boss: 1 }, { name: 'HARD', dmg: 1.35, cling: 1.45, boss: 1.2 }];

function spawn(kind, opt = {}) {
  const sp = SPECIES[opt.sp || kind];
  const a = { id: ACTOR_ID++, kind, sp, pos: opt.pos ? opt.pos.slice() : [0, 0, 0], yaw: opt.yaw || 0, pitch: 0, roll: 0, vel: [0, 0, 0], an: newAnim(), state: opt.state || 'idle', t: 0, st: 0,
    dose: 0, need: opt.need || sp.need, asleep: false, gone: false, flash: 0, darts: [], threat: false, scored: false, opt, side: opt.side || 1, lastHit: -9 };
  a.an.side = Math.random() < 0.5 ? 1 : -1;
  ACTORS.push(a); tlog('spawn', kind, a.id, a.state);
  return a;
}
function groundAt(x, z) { return terrainH(x, z); }
function setState(a, s) { a.state = s; a.st = 0; }
function jeepLocalToWorld(p) { return M4.pt(JEEP.M, p); }
function faceYaw(dx, dz) { return Math.atan2(-dz, dx); } // yaw for creature +x facing (dx,dz)
function moveToward(a, tx, tz, spd, dt, turn = 4) {
  const dx = tx - a.pos[0], dz = tz - a.pos[2], d = Math.hypot(dx, dz);
  if (d > 0.01) { const want = faceYaw(dx, dz); a.yaw += clamp(angWrap(want - a.yaw), -turn * dt, turn * dt); }
  const fx = Math.cos(a.yaw), fz = -Math.sin(a.yaw);
  a.pos[0] += fx * spd * dt; a.pos[2] += fz * spd * dt; a.vel = [fx * spd, 0, fz * spd];
  return d;
}
function gaitAdvance(a, spd, dt) {
  const sp = a.sp; const stride = sp.kind === 'quad' ? sp.o.hipY * (sp.id === 'longneck' ? 1.6 : 2.3) : sp.o.hipY * 2.6;
  a.an.phase += spd / stride * Math.PI * dt * (sp.kind === 'quad' ? 1 : 1.0);
  a.an.spd = damp(a.an.spd, spd, 6, dt);
}
function lookAtPoint(a, p, dt, k = 1) {
  const hp = a.pos; const dx = p[0] - hp[0], dz = p[2] - hp[2], dy = p[1] - (hp[1] + a.sp.top * 0.8);
  const want = angWrap(faceYaw(dx, dz) - a.yaw); a.an.lookY = damp(a.an.lookY, clamp(want, -1.3, 1.3) * k, 5, dt);
  a.an.lookP = damp(a.an.lookP, clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.7, 0.7) * k, 5, dt);
}
function sleepIn(a, dt) { a.an.sleep = Math.min(1, a.an.sleep + dt * 0.9); a.an.stumble = Math.max(0, a.an.stumble - dt * 1.2); a.an.spd = damp(a.an.spd, 0, 3, dt); a.an.run = damp(a.an.run, 0, 3, dt); a.an.leap = damp(a.an.leap, 0, 4, dt); a.an.climb = damp(a.an.climb, 0, 4, dt); a.an.roar = damp(a.an.roar, 0, 4, dt); }

// ---------- raptor ----------
function updRaptor(a, dt) {
  const an = a.an; const J = JEEP;
  if (a.state === 'hide') {
    an.crouch = damp(an.crouch, 1, 3, dt); an.spd = 0;
    lookAtPoint(a, J.pos, dt, 0.6);
    if (J.s >= a.opt.trigS) { setState(a, 'run'); SFX.raptor(a); a.threat = true; }
  } else if (a.state === 'run') {
    an.crouch = damp(an.crouch, 0, 5, dt); an.run = damp(an.run, 1, 3, dt);
    const at = ATTACH[a.opt.attach]; const tgt = jeepLocalToWorld([at.p[0] + (at.p[0] > 0 ? 6 : -3) * (a.opt.lead || 1), 0, at.p[2] + Math.sign(at.p[2] || 1) * 3.5]);
    const dToJeep = Math.hypot(a.pos[0] - J.pos[0], a.pos[2] - J.pos[2]);
    const spd = clamp(J.v + 5 + (dToJeep - 8) * 0.25, 4, J.v + 9);
    moveToward(a, tgt[0], tgt[2], spd, dt, 3.5);
    a.pos[1] = groundAt(a.pos[0], a.pos[2]); gaitAdvance(a, spd, dt);
    lookAtPoint(a, CAM.pos, dt, 0.5);
    const ap = jeepLocalToWorld(at.p);
    if (a.st > (a.opt.runT || 1.6) && V.dist(a.pos, ap) < 7.5) { setState(a, 'leap'); a.leapFrom = a.pos.slice(); SFX.raptor(a, 1.2); }
    if (a.st > 9) { setState(a, 'leave'); }
  } else if (a.state === 'leap') {
    const T = 0.62; const u = Math.min(1, a.st / T); const at = ATTACH[a.opt.attach];
    const ap = jeepLocalToWorld(at.p); const e = u * u * (3 - 2 * u);
    a.pos = V.lerp(a.leapFrom, ap, e); a.pos[1] += Math.sin(u * Math.PI) * 1.6;
    const wy = J.yaw + at.yaw; a.yaw += angWrap(wy - a.yaw) * Math.min(1, dt * 8);
    an.leap = Math.sin(u * Math.PI) * 0.9 + 0.1; an.run = 0;
    if (u >= 1) { setState(a, 'cling'); a.clingT = DIFF[G.diff].cling * (a.opt.clingMul || 1); SFX.thud(0.6); G.shake = Math.max(G.shake, 0.25); radioOnce('cling', a.opt.attach < 2 ? 'hood' : 'side'); }
  } else if (a.state === 'cling') {
    const at = ATTACH[a.opt.attach];
    a.pos = jeepLocalToWorld(at.p); const tc = V.sub(CAM.pos, a.pos); a.yaw += angWrap(faceYaw(tc[0], tc[2]) + Math.sin(a.st * 2.3) * 0.25 - a.yaw) * Math.min(1, dt * 8); an.leap = damp(an.leap, 0, 6, dt); an.climb = damp(an.climb, 1, 6, dt); a.pitch = damp(a.pitch, -0.32, 6, dt);
    lookAtPoint(a, CAM.pos, dt, 1);
    a.clingLeft = a.clingT - a.st;
    if (a.st > a.clingT) { // climbs in
      damageJeep(10, 'raptor'); SFX.raptor(a, 0.8); setState(a, 'shaken'); a.vel = V.add(J.vel, V.mul(J.right, (at.p[2] >= 0 ? 1 : -1) * 6)); a.vel[1] = 3; radio('dot', rnd.pick(['Ow! It bit the seat! Hold on, shaking it loose!', 'Get OFF my jeep! Swerving!', 'That is coming out of your tips, partner!']));
    }
  } else if (a.state === 'shaken' || a.state === 'falloff') {
    a.pitch = damp(a.pitch, 0, 4, dt);
    a.vel[1] -= 18 * dt; a.pos = V.add(a.pos, V.mul(a.vel, dt)); const g = groundAt(a.pos[0], a.pos[2]);
    an.climb = damp(an.climb, 0, 5, dt); an.leap = damp(an.leap, 0.7, 5, dt);
    if (a.pos[1] <= g) { a.pos[1] = g; a.vel = [0, 0, 0]; setState(a, a.state === 'shaken' ? 'leave' : 'drowse'); if (a.state === 'drowse') SFX.thud(0.4); }
  } else if (a.state === 'leave') {
    a.threat = false; an.run = damp(an.run, 1, 3, dt); an.leap = damp(an.leap, 0, 6, dt);
    const away = V.sub(a.pos, J.pos); const spd = 11; moveToward(a, a.pos[0] + away[0], a.pos[2] + away[2], spd, dt, 2);
    a.pos[1] = groundAt(a.pos[0], a.pos[2]); gaitAdvance(a, spd, dt);
    if (V.dist(a.pos, J.pos) > 90) a.gone = true;
  } else if (a.state === 'stumble') {
    an.stumble = damp(an.stumble, 1, 4, dt); an.run = damp(an.run, 0.3, 2, dt); an.crouch = 0; an.leap = damp(an.leap, 0, 6, dt); an.climb = damp(an.climb, 0, 6, dt);
    const spd = Math.max(0, (a.stumbleSpd || 6) * (1 - a.st / 1.1)); moveToward(a, a.pos[0] + Math.cos(a.yaw) * 5 + Math.sin(a.st * 5), a.pos[2] - Math.sin(a.yaw) * 5, spd, dt, 2);
    a.pos[1] = groundAt(a.pos[0], a.pos[2]); gaitAdvance(a, spd, dt);
    if (a.st > 1.1) setState(a, 'drowse');
  } else if (a.state === 'drowse') {
    sleepIn(a, dt); a.pos[1] = damp(a.pos[1], groundAt(a.pos[0], a.pos[2]), 8, dt);
    if (an.sleep >= 1) { setState(a, 'sleep'); }
  } else if (a.state === 'sleep') { a.an.sleep = 1; }
}

// ---------- glider (pterosaur) ----------
function updPtero(a, dt) {
  const an = a.an, J = JEEP;
  an.phase += dt * (an.flap > 0.5 ? 7.5 : 4);
  if (a.state === 'perch') {
    an.fold = damp(an.fold, 1, 4, dt); an.flap = 0; an.glide = 0;
    if (a.perchOn) { const host = a.perchOn; const hb = host.sp.rig.byName[a.opt.perchBone]; const S = host.skin.subarray(hb * 16, hb * 16 + 16); a.pos = M4.pt(S, a.opt.perchAt); a.yaw = host.yaw + (a.opt.perchYaw || 0); }
    if (J.s >= a.opt.trigS) { setState(a, 'takeoff'); SFX.ptero(a); a.vel = [Math.cos(a.yaw) * 6, 6, -Math.sin(a.yaw) * 6]; }
  } else if (a.state === 'takeoff' || a.state === 'circle') {
    an.fold = damp(an.fold, 0, 4, dt); a.threat = a.state === 'circle';
    const c = V.add(J.pos, V.mul(J.fwd, a.opt.ahead || 34)); const R = a.opt.radius || 14; const h = a.opt.alt || 22;
    a.ang = (a.ang ?? Math.random() * TAU) + dt * (a.opt.circSpd || 0.7) * a.side;
    const tgt = [c[0] + Math.cos(a.ang) * R, c[1] + h, c[2] + Math.sin(a.ang) * R];
    const want = V.sub(tgt, a.pos); const dist = V.len(want);
    const sp = Math.min(dist * 1.6, J.v + 14); const dv = V.sub(V.mul(V.norm(want), sp), a.vel); a.vel = V.add(a.vel, V.mul(dv, Math.min(1, dt * 1.8)));
    a.pos = V.add(a.pos, V.mul(a.vel, dt));
    const hv = Math.hypot(a.vel[0], a.vel[2]); if (hv > 0.5) a.yaw += angWrap(faceYaw(a.vel[0], a.vel[2]) - a.yaw) * Math.min(1, dt * 4);
    a.roll = damp(a.roll, -a.side * 0.35, 3, dt); a.pitch = damp(a.pitch, clamp(a.vel[1] * 0.06, -0.4, 0.4), 3, dt);
    an.flap = damp(an.flap, a.vel[1] > -0.5 || a.state === 'takeoff' ? 1 : 0.3, 2, dt); an.glide = 1 - an.flap;
    if (a.state === 'takeoff' && a.st > 1.6) setState(a, 'circle');
    if (a.state === 'circle' && a.st > (a.opt.wait || 3)) { setState(a, 'dive'); SFX.ptero(a, 1.3); }
  } else if (a.state === 'dive') {
    a.threat = true;
    const tgt = V.add(CAM.pos, [0, -0.2, 0]); const lead = V.add(tgt, V.mul(J.vel, 0.35));
    const want = V.norm(V.sub(lead, a.pos)); const spd = Math.min(26, 14 + a.st * 10);
    a.vel = V.add(V.mul(a.vel, Math.exp(-3 * dt)), V.mul(want, spd * (1 - Math.exp(-3 * dt))));
    a.vel = V.mul(V.norm(a.vel), spd + V.dot(J.vel, want) * 0.5);
    a.pos = V.add(a.pos, V.mul(a.vel, dt));
    a.yaw += angWrap(faceYaw(a.vel[0], a.vel[2]) - a.yaw) * Math.min(1, dt * 6);
    a.pitch = damp(a.pitch, clamp(Math.atan2(a.vel[1], Math.hypot(a.vel[0], a.vel[2])), -0.9, 0.5), 5, dt); a.roll = damp(a.roll, 0, 4, dt);
    an.dive = damp(an.dive, 1, 4, dt); an.flap = damp(an.flap, 0, 4, dt); an.jaw = damp(an.jaw, 0.8, 3, dt);
    lookAtPoint(a, tgt, dt, 0.6);
    if (V.dist(a.pos, tgt) < 2.0) { damageJeep(7, 'ptero'); SFX.ptero(a, 0.9); setState(a, 'flee'); a.vel = V.add(J.vel, [rnd.range(-6, 6), 9, 0]); }
    if (a.st > 6) setState(a, 'flee');
  } else if (a.state === 'flee') {
    a.threat = false; an.dive = damp(an.dive, 0, 3, dt); an.flap = damp(an.flap, 1, 3, dt); an.jaw = damp(an.jaw, 0, 3, dt);
    a.vel = V.add(a.vel, V.mul([0, 6, 0], dt)); a.pos = V.add(a.pos, V.mul(a.vel, dt));
    a.yaw += angWrap(faceYaw(a.vel[0], a.vel[2]) - a.yaw) * Math.min(1, dt * 3); a.pitch = damp(a.pitch, 0.3, 2, dt);
    if (V.dist(a.pos, J.pos) > 140) a.gone = true;
  } else if (a.state === 'fall') {
    an.dive = damp(an.dive, 0, 3, dt); an.flap = damp(an.flap, 0, 3, dt); an.glide = damp(an.glide, 1, 3, dt); an.jaw = damp(an.jaw, 0.2, 3, dt); an.fold = damp(an.fold, 0.2, 1, dt);
    a.vel[1] -= 5 * dt; a.vel = V.mul(a.vel, Math.exp(-0.6 * dt)); a.pos = V.add(a.pos, V.mul(a.vel, dt));
    a.roll = damp(a.roll, Math.sin(a.st * 3) * 0.6, 3, dt); a.pitch = damp(a.pitch, -0.4, 2, dt);
    const g = groundAt(a.pos[0], a.pos[2]) + 0.12;
    if (a.pos[1] <= g) { a.pos[1] = g; setState(a, 'drowse'); a.vel = [0, 0, 0]; SFX.thud(0.25); }
  } else if (a.state === 'drowse' || a.state === 'sleep') {
    an.fold = damp(an.fold, 1, 2, dt); an.sleep = Math.min(1, an.sleep + dt); a.pitch = damp(a.pitch, 0, 3, dt); a.roll = damp(a.roll, an.side * 0.5, 3, dt);
    an.flap = 0; an.glide = 0; an.dive = 0;
    if (an.sleep >= 1) a.state = 'sleep';
  }
}

// ---------- long-neck: walk tied to the jeep's progress so the jeep passes under its belly ----------
function updLongneck(a, dt) {
  const an = a.an, J = JEEP, o = a.opt;
  if (a.state === 'cross' || a.state === 'drowsy') {
    const u = (J.s - o.sc) * o.ratio + o.u0; const du = (u - (a.u ?? u)) / Math.max(dt, 1e-4); a.u = u;
    const base = PATH.world(o.sc, o.dc, 0); const dir = o.dir;
    a.pos = [base[0] + dir[0] * u, 0, base[2] + dir[2] * u]; a.pos[1] = groundAt(a.pos[0], a.pos[2]) - 0.05;
    a.yaw = faceYaw(dir[0], dir[2]);
    gaitAdvance(a, Math.max(0.4, du), dt); an.run = 0;
    if (V.dist(J.pos, a.pos) < 60) lookAtPoint(a, CAM.pos, dt, 0.7); else { an.lookY = damp(an.lookY, Math.sin(an.t * 0.3) * 0.3, 1, dt); an.lookP = damp(an.lookP, -0.1, 1, dt); }
    if (a.state === 'drowsy') { an.stumble = damp(an.stumble, 0.35, 1, dt); if (u > o.clearU) { setState(a, 'liedown'); a.u = u; } }
    if (u > 70) a.gone = true;
  } else if (a.state === 'liedown' || a.state === 'sleep') {
    sleepIn(a, dt * 0.5); an.stumble = damp(an.stumble, 0, 1, dt); a.pos[1] = groundAt(a.pos[0], a.pos[2]) - 0.05;
    if (an.sleep >= 1) a.state = 'sleep';
  }
}

// ---------- stampede herd and chargers ----------
function updHerd(a, dt) {
  const an = a.an, J = JEEP, o = a.opt;
  if (a.state === 'cross') {
    // run across the road along o.dir; wait if the jeep is about to pass this lane
    const lane = o.laneS; const q = PATH.nearest(a.pos[0], a.pos[2]);
    const jeepGap = lane - J.s; let spd = o.spd;
    if (q.d < -4 && q.d > -16 && jeepGap > -6 && jeepGap < 22) spd = 0.6;
    if (q.d > -4 && q.d < 4 && jeepGap > -4 && jeepGap < 10) spd = o.spd * 1.5;
    a.vSmooth = damp(a.vSmooth ?? spd, spd, 3, dt);
    const tgt = V.add(a.pos, V.mul(o.dir, 10)); moveToward(a, tgt[0], tgt[2], a.vSmooth, dt, 2);
    a.pos[1] = groundAt(a.pos[0], a.pos[2]); gaitAdvance(a, a.vSmooth, dt); an.run = damp(an.run, a.vSmooth > 4 ? 1 : 0, 3, dt);
    an.lookY = damp(an.lookY, 0, 2, dt);
    if (q.d > 95 || a.st > 40) a.gone = true;
  } else if (a.state === 'wait') {
    an.spd = damp(an.spd, 0, 3, dt); lookAtPoint(a, J.pos, dt, 0.5);
    if (J.s >= o.trigS) { setState(a, 'charge'); a.threat = true; SFX.bellow(a); }
  } else if (a.state === 'charge') {
    const tgt = V.add(J.pos, V.mul(J.vel, 0.6)); const d = V.dist(a.pos, J.pos);
    const spd = clamp(9 + a.st * 2, 9, 13.5) * (1 - 0.45 * a.dose / a.need);
    moveToward(a, tgt[0], tgt[2], spd, dt, d < 12 ? 1.2 : 2.2); a.pos[1] = groundAt(a.pos[0], a.pos[2]);
    gaitAdvance(a, spd, dt); an.run = damp(an.run, 1, 3, dt); an.charge = damp(an.charge, 1, 3, dt);
    if (d < 3.4) { damageJeep(15, 'hornback'); SFX.thud(1); G.shake = 1.0; setState(a, 'veer'); a.threat = false; radio('dot', rnd.pick(['WHOA! Big horny boy! Keep darting!', 'That is going to leave a dent!', 'Ram me once, shame on you!'])); }
    if (a.st > 12) setState(a, 'veer');
  } else if (a.state === 'veer') {
    an.charge = damp(an.charge, 0, 2, dt); const away = V.sub(a.pos, J.pos); const spd = 10; moveToward(a, a.pos[0] + away[0] + J.right[0] * 20, a.pos[2] + away[2] + J.right[2] * 20, spd, dt, 1.5);
    a.pos[1] = groundAt(a.pos[0], a.pos[2]); gaitAdvance(a, spd, dt);
    if (V.dist(a.pos, J.pos) > 100) a.gone = true;
  } else if (a.state === 'stumble') {
    an.stumble = damp(an.stumble, 1, 3, dt); an.charge = damp(an.charge, 0, 3, dt);
    const spd = Math.max(0, (a.stumbleSpd || 8) * (1 - a.st / 1.5)); moveToward(a, a.pos[0] + Math.cos(a.yaw) * 5, a.pos[2] - Math.sin(a.yaw) * 5, spd, dt, 1.5);
    a.pos[1] = groundAt(a.pos[0], a.pos[2]); gaitAdvance(a, spd, dt);
    if (a.st > 1.5) setState(a, 'drowse');
  } else if (a.state === 'drowse' || a.state === 'sleep') {
    sleepIn(a, dt * 0.8); a.pos[1] = groundAt(a.pos[0], a.pos[2]); if (an.sleep >= 1) a.state = 'sleep';
  }
}

// ---------- Rumblejaw ----------
const BOSS = { a: null };
function updBoss(a, dt) {
  const an = a.an, J = JEEP, o = a.opt;
  const frac = a.dose / a.need;
  const slow = 1 - frac * 0.25;
  const follow = (gapTarget, rate) => {
    a.gap = damp(a.gap, gapTarget, rate, dt);
    a.weave = Math.sin(an.t * 0.55) * 3.5 + Math.sin(an.t * 1.3) * 1.0;
    const s = Math.max(o.s0, J.s - a.gap); const w = PATH.world(s, a.weave, 0); const prev = a.pos.slice();
    a.pos = [w[0], groundAt(w[0], w[2]), w[2]];
    const v = V.sub(a.pos, prev); const hv = Math.hypot(v[0], v[2]);
    if (hv > 0.01) a.yaw += angWrap(faceYaw(v[0], v[2]) - a.yaw) * Math.min(1, dt * 5);
    const spd = hv / Math.max(dt, 1e-4); gaitAdvance(a, spd, dt); an.run = damp(an.run, spd > 6 ? 1 : 0.4, 2, dt);
    if (Math.floor(an.phase / Math.PI) !== a.lastStep) { a.lastStep = Math.floor(an.phase / Math.PI); const dd = V.dist(a.pos, CAM.pos); SFX.stomp(clamp(1.4 - dd / 40, 0.15, 1)); G.shake = Math.max(G.shake, clamp(0.5 - dd / 70, 0, 0.35)); if (J.s > 1660) PARTS.splash(a.pos, 6, 1.4); }
  };
  if (a.state === 'enter') {
    // burst from the left bank behind the jeep and stride onto the river
    const u = Math.min(1, a.st / 2.6); const from = PATH.world(o.s0, -26, 0), to = PATH.world(o.s0 + 4, -3, 0);
    a.pos = V.lerp(from, to, u); a.pos[1] = groundAt(a.pos[0], a.pos[2]); a.yaw = faceYaw(to[0] - from[0], to[2] - from[2]) * (1 - u) + J.yaw * u;
    gaitAdvance(a, 6, dt); an.run = 0.5; an.roar = a.st > 1.8 ? damp(an.roar, 1, 5, dt) : 0;
    if (a.st > 1.8 && !a.roared) { a.roared = 1; SFX.roar(1); G.shake = 0.9; }
    if (a.st > 3.4) { setState(a, 'chase'); a.gap = J.s - o.s0 - 4; an.roar = 0; }
  } else if (a.state === 'chase') {
    an.roar = damp(an.roar, 0, 4, dt); an.bite = damp(an.bite, 0, 5, dt);
    lookAtPoint(a, CAM.pos, dt, 0.8);
    follow(9.5 / slow, 0.35 * slow * DIFF[G.diff].boss);
    if (a.gap < 12.5 && a.st > 2.5) { setState(a, 'windup'); a.wDose = a.dose; SFX.roar(0.7); }
  } else if (a.state === 'windup') {
    an.roar = damp(an.roar, 1, 6, dt); lookAtPoint(a, CAM.pos, dt, 1); follow(10, 0.5);
    if (a.dose - a.wDose >= 3) { setState(a, 'flinch'); popup(headPos(a), 'INTERRUPTED!', '#ffd34d'); addScore(150, headPos(a)); radioOnce('flinch'); }
    else if (a.st > 1.05 / DIFF[G.diff].boss) { setState(a, 'lunge'); }
  } else if (a.state === 'lunge') {
    an.roar = damp(an.roar, 0, 8, dt); an.bite = damp(an.bite, 1, 10, dt); lookAtPoint(a, CAM.pos, dt, 1); follow(3.0, 4);
    if (a.st > 0.45) { if (a.dose - a.wDose >= 3) { setState(a, 'flinch'); } else { damageJeep(20, 'boss'); SFX.chomp(); G.shake = 1.4; setState(a, 'fallback'); radio('dot', rnd.pick(['It took a bite out of the tailgate!', 'AAAH! Faster, faster!', 'That was my lunchbox!'])); } }
  } else if (a.state === 'flinch' || a.state === 'fallback') {
    an.bite = damp(an.bite, 0, 4, dt); an.roar = damp(an.roar, 0, 4, dt); an.stumble = damp(an.stumble, a.state === 'flinch' ? 0.8 : 0, 4, dt);
    follow(a.state === 'flinch' ? 24 : 21, 1.2);
    if (a.st > 2.2) { an.stumble = 0; setState(a, 'chase'); }
  } else if (a.state === 'stagger') {
    an.stumble = damp(an.stumble, 1, 3, dt); an.roar = damp(an.roar, 0, 3, dt); follow(34, 0.9);
    if (a.st > 2.6) { setState(a, 'chase'); SFX.roar(1); an.stumble = 0; }
  } else if (a.state === 'collapse') {
    an.stumble = damp(an.stumble, 1, 3, dt); follow(a.gap + 10, 0.5);
    if (a.st > 2.2) { setState(a, 'drowse'); a.fallAt = a.pos.slice(); SFX.roar(0.5); }
  } else if (a.state === 'drowse' || a.state === 'sleep') {
    sleepIn(a, dt * 0.7); a.pos[1] = groundAt(a.pos[0], a.pos[2]);
    if (a.state === 'drowse' && an.sleep > 0.75 && !a.splashed) { a.splashed = 1; PARTS.splash(a.pos, 60, 4); SFX.splash(1); G.shake = 1.2; }
    if (an.sleep >= 1) a.state = 'sleep';
  } else if (a.state === 'giveup') {
    an.roar = damp(an.roar, a.st < 1.5 ? 1 : 0, 3, dt); an.spd = damp(an.spd, 0, 2, dt);
  }
}

function updateActors(dt) {
  for (const a of ACTORS) {
    if (a.gone) continue;
    a.t += dt; a.st += dt; a.an.t += dt; a.flash = Math.max(0, a.flash - dt * 3);
    if (a.kind === 'raptor') updRaptor(a, dt); else if (a.kind === 'ptero') updPtero(a, dt); else if (a.kind === 'longneck') updLongneck(a, dt);
    else if (a.kind === 'herd') updHerd(a, dt); else if (a.kind === 'boss') updBoss(a, dt);
    // cull anything far behind the jeep (not the boss)
    if (a.kind !== 'boss' && a.kind !== 'longneck') { const q = V.sub(a.pos, JEEP.pos); if (V.dot(q, JEEP.fwd) < -80 || V.len(q) > 320) a.gone = true; }
    if (a.asleep && a.an.sleep >= 1 && a.zzzT === undefined) a.zzzT = 0;
  }
  for (let i = ACTORS.length - 1; i >= 0; i--) if (ACTORS[i].gone) { if (ACTORS[i] === BOSS.a && G.phase === 'play') continue; ACTORS.splice(i, 1); }
}

// dart dose: returns true if this hit put the animal under
function doseActor(a, amount, weak, point) {
  if (a.gone) return false;
  a.dose += amount; a.flash = 1; a.lastHit = G.time;
  const sp = a.sp;
  if (a.asleep) return false;
  if (a.kind === 'boss') {
    const f = a.dose / a.need;
    if (!a.angry) { a.angry = 1; SFX.roar(0.8); }
    for (const th of [0.34, 0.67]) if (f >= th && !(a['th' + th])) { a['th' + th] = 1; setState(a, 'stagger'); SFX.roar(1); radio('dot', th < 0.5 ? 'It is slowing down! Keep it coming!' : 'It is wobbling! Aim for the throat when it roars!'); G.shake = 0.6; }
    if (f >= 1) { a.asleep = true; a.threat = false; setState(a, 'collapse'); return true; }
    return false;
  }
  if (a.dose >= a.need) {
    a.asleep = true; a.threat = false;
    if (a.kind === 'raptor') { if (a.state === 'cling') { setState(a, 'falloff'); a.vel = V.add(JEEP.vel, V.mul(JEEP.right, (ATTACH[a.opt.attach].p[2] >= 0 ? 1 : -1) * 3.5)); a.vel[1] = 2.5; a.saved = true; } else if (a.state === 'leap') { setState(a, 'falloff'); a.vel = V.mul(V.sub(a.pos, a.leapFrom), 1.5); a.vel[1] = 1; } else { a.stumbleSpd = a.an.spd; setState(a, a.state === 'hide' ? 'drowse' : 'stumble'); } }
    else if (a.kind === 'ptero') { if (a.state === 'perch') { a.perchOn = null; } setState(a, 'fall'); a.vel = a.vel || [0, 0, 0]; }
    else if (a.kind === 'longneck') { setState(a, 'drowsy'); }
    else if (a.kind === 'herd') { a.stumbleSpd = a.an.spd; setState(a, 'stumble'); }
    SFX.yelp(a, 0.7);
    return true;
  }
  if (a.kind === 'herd' && a.state === 'charge') a.an.stumble = 0.4;
  SFX.yelp(a, 1);
  return false;
}
