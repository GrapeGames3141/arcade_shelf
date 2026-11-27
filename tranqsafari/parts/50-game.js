// ===== Game state, jeep on rails, timeline, dart rifle, scoring, radio chatter, particles =====
const G = { phase: 'menu', time: 0, score: 0, combo: 0, maxCombo: 0, mult: 1, ammo: 6, mag: 6, reload: 0, cool: 0, shots: 0, hits: 0, weak: 0, misses: 0,
  dozed: {}, saves: 0, interrupts: 0, damage: 0, shake: 0, flash: 0, lookYaw: 0, lookPitch: 0, lookBack: 0, diff: SAVE.get('diff', 1), events: [], evI: 0,
  endT: -1, result: '', best: SAVE.get('best', 0), auto: false, herd: null, recoil: 0, bossShown: false, finishAt: -1 };
const JEEP = { s: 0, v: 0, pos: [0, 0, 0], fwd: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0], vel: [0, 0, 0], yaw: Math.PI / 2, pitch: 0, roll: 0, M: M4.ident(), health: 100, bump: 0, idle: 3.2 };
const RELOAD_T = 1.35, FIRE_CD = 0.22, DART_SPEED = 150;
const DARTS = [], GROUND_DARTS = [], TARGETS = [], POPUPS = [];

// ---- jeep on rails ----
function jeepPose(s, t) {
  const A = PATH.at(s); const f = A.t, r = A.r;
  const h = (dx, dz) => { const x = A.p[0] + f[0] * dx + r[0] * dz, z = A.p[2] + f[2] * dx + r[2] * dz; return terrainH(x, z); };
  const fl = h(1.3, -0.78), fr = h(1.3, 0.78), bl = h(-1.25, -0.78), br = h(-1.25, 0.78);
  const pitch = Math.atan2((fl + fr) - (bl + br), 2 * 2.55), roll = Math.atan2((fr + br) - (fl + bl), 2 * 1.56);
  const y = (fl + fr + bl + br) / 4 + 0.03;
  return { p: [A.p[0], y, A.p[2]], f, r, pitch, roll };
}
function updateJeep(dt) {
  const J = JEEP; let target = keyLerp(SPEEDS, J.s);
  if (J.idle > 0) { J.idle -= dt; target = 0; }
  if (G.phase === 'over') target = 0;
  if (BOSS.a && BOSS.a.asleep && BOSS.a.state !== 'collapse') target = Math.min(target, 7);
  const acc = target > J.v ? 3.2 : 5; J.v += clamp(target - J.v, -acc * dt, acc * dt);
  J.s = Math.min(COURSE_END + 30, J.s + J.v * dt);
  const P = jeepPose(J.s, G.time);
  const bumpA = (0.012 + J.v * 0.0035) * (secAt(J.s).river > 0.5 ? 1.6 : 1);
  J.bump = Math.sin(G.time * 11.3) * 0.5 + Math.sin(G.time * 17.9 + 1) * 0.3 + vnoise(J.s * 0.7, 3) * 0.6;
  const prev = J.pos.slice();
  J.pos = [P.p[0], P.p[1] + J.bump * bumpA, P.p[2]]; J.fwd = P.f; J.right = P.r;
  J.pitch = damp(J.pitch, P.pitch + J.bump * bumpA * 0.6, 10, dt); J.roll = damp(J.roll, P.roll + Math.sin(G.time * 7.1) * bumpA * 0.8, 10, dt);
  J.yaw = faceYaw(P.f[0], P.f[2]);
  J.vel = dt > 0 ? V.mul(V.sub(J.pos, prev), 1 / dt) : [0, 0, 0];
  J.M = M4.mul(M4.trans(J.pos[0], J.pos[1], J.pos[2]), M4.mul(M4.rotY(J.yaw), M4.mul(M4.rotZ(J.pitch), M4.rotX(J.roll))));
  J.up = M4.dir(J.M, [0, 1, 0]);
  if (secAt(J.s).river > 0.6 && J.v > 3) { for (const z of [-0.85, 0.85]) if (Math.random() < dt * J.v * 0.9) PARTS.splash(M4.pt(J.M, [-1.2, 0.25, z]), 2, 0.6, J.vel); }
  else if (J.v > 6 && Math.random() < dt * 8) PARTS.dust(M4.pt(J.M, [-2.1, 0.2, rnd.range(-0.8, 0.8)]), J.vel);
}
function damageJeep(n, src) {
  if (G.phase !== 'play') return;
  const d = n * DIFF[G.diff].dmg; JEEP.health = Math.max(0, JEEP.health - d); G.damage += d; G.flash = 1; G.shake = Math.max(G.shake, 0.8);
  if (G.combo >= 4) popupScreen('COMBO LOST', '#ff8a6a'); G.combo = 0; G.mult = 1;
  SFX.hurt(); tlog('damage', src, d.toFixed(1), JEEP.health.toFixed(1));
  if (JEEP.health <= 0) { G.phase = 'over'; G.result = 'disabled'; G.endT = G.time + 3.2; radio('dot', 'That is it, the jeep is done. Radio base for a tow. Nobody is hurt, at least!', 1); SFX.crunch(); }
  else if (JEEP.health < 35 && !G.lowWarn) { G.lowWarn = 1; radio('dot', 'She is held together with tape and hope! Careful!', 1); }
}

// ---- radio chatter ----
const RADIO = { q: [], cur: null, t: 0, said: {} };
const SPEAKERS = { dot: { name: 'DOT', role: 'driver', pitch: 1.15, rate: 1.08 }, base: { name: 'BASE', role: 'ranger station', pitch: 0.85, rate: 1.0 } };
function radio(who, text, prio = 0) { if (prio && RADIO.q.length > 1) RADIO.q.length = 1; RADIO.q.push({ who, text }); tlog('radio', who, text); }
const ONCE = {
  cling: { hood: 'One is on the hood! Dart it before it climbs in!', side: 'It is on the side! Get it off, get it off!' },
  flinch: 'Ha! Popped it right in the throat. It hates that.',
};
function radioOnce(key, v) { const k = key + (v || ''); if (RADIO.said[k]) return; RADIO.said[k] = 1; const t = ONCE[key]; radio('dot', typeof t === 'string' ? t : t[v]); }
function updateRadio(dt) {
  if (RADIO.cur) { RADIO.t += dt; if (RADIO.t > RADIO.cur.dur) { RADIO.cur = null; HUD.radio(null); } }
  if (!RADIO.cur && RADIO.q.length) { const m = RADIO.q.shift(); m.dur = 1.6 + m.text.length * 0.052; RADIO.cur = m; RADIO.t = 0; HUD.radio(m); SFX.squelch(); speak(m); }
}

// ---- sim-time timers (never setTimeout: tests step the sim) ----
const TIMERS = [];
function later(dt, fn) { TIMERS.push({ t: G.time + dt, fn }); }
function runTimers() { for (let i = TIMERS.length - 1; i >= 0; i--) if (G.time >= TIMERS[i].t) { const f = TIMERS[i].fn; TIMERS.splice(i, 1); f(); } }
// ---- scoring ----
function addScore(n, at) { const v = Math.round(n * G.mult); G.score += v; return v; }
function popup(p, text, col = '#fff', big = false) { POPUPS.push({ p: p.slice(), text, col, t: 0, big, screen: false }); }
function popupScreen(text, col = '#fff') { POPUPS.push({ text, col, t: 0, screen: true }); }
function registerHit(a, weak, p) {
  G.hits++; G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo); G.mult = Math.min(5, 1 + Math.floor(G.combo / 4));
  if (weak) G.weak++;
  const dose = weak ? (a.kind === 'boss' ? 3 : 2) : 1;
  const wasCling = a.state === 'cling', wasCharge = a.state === 'charge';
  const under = doseActor(a, dose, weak, p);
  let pts = addScore(25 + (weak ? 50 : 0));
  if (weak) popup(p, 'WEAK SPOT +' + pts, '#ffd34d', true); else popup(p, '+' + pts, '#ffffff');
  if (under) {
    const bonus = addScore(a.sp.score); G.dozed[a.sp.id] = (G.dozed[a.sp.id] || 0) + 1;
    later(0.12, () => popup(V.add(p, [0, 0.6, 0]), (a.kind === 'boss' ? 'RUMBLEJAW DOZED! +' : 'DOZED +') + bonus, '#9bf28a', true));
    if (wasCling) { G.saves++; const b = addScore(100); popup(V.add(p, [0, 1.1, 0]), 'CLOSE CALL +' + b, '#7fd6ff'); }
    if (wasCharge) { const b = addScore(100); popup(V.add(p, [0, 1.1, 0]), 'STOPPED +' + b, '#7fd6ff'); }
    if (a.kind === 'boss') bossDown();
    if (a.kind === 'longneck') radio('dot', 'You put the big girl to sleep? That is a lot of darts. Respect.');
  }
  tlog('hit', a.kind, a.id, weak ? 'weak' : 'body', 'dose', a.dose.toFixed(1), '/', a.need, under ? 'UNDER' : '');
}
function registerMiss(p) {
  G.misses++; if (G.combo >= 4) popupScreen('COMBO LOST', '#ff8a6a'); G.combo = 0; G.mult = 1;
  if (G.misses % 9 === 0 && G.misses > 0) radio('dot', rnd.pick(['The dinos are over THERE, partner.', 'Darts are not free, you know.', 'You are scaring the ferns.']));
}
function bossDown() {
  radio('dot', 'It is going down... it is going DOWN! ...Is it snoring? It is snoring!', 1);
  radio('base', 'Base to Jeep Four. Seismic readings just dropped to a gentle rumble. Nice work.');
  G.finishAt = G.time + 9;
}

// ---- dart rifle ----
function startReload() { if (G.reload > 0 || G.ammo === G.mag) return; G.reload = RELOAD_T; SFX.reload(); }
function cameraRay(nx, ny) {
  const inv = CAM.invVP; const a = M4.pt4(inv, [nx, ny, -1, 1]), b = M4.pt4(inv, [nx, ny, 1, 1]);
  const o = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], e = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
  return { o, d: V.norm(V.sub(e, o)) };
}
function rayCapsule(o, d, a, b, r) {
  // closest approach between ray and segment, then entry distance approx
  const ba = V.sub(b, a), oa = V.sub(o, a); const baba = V.dot(ba, ba), bard = V.dot(ba, d), baoa = V.dot(ba, oa), rdoa = V.dot(d, oa), oaoa = V.dot(oa, oa);
  const A = baba - bard * bard; let B = baba * rdoa - baoa * bard; let C = baba * oaoa - baoa * baoa - r * r * baba; let h = B * B - A * C;
  if (h >= 0 && A > 1e-9) { const t = (-B - Math.sqrt(h)) / A; const y = baoa + t * bard; if (y > 0 && y < baba && t > 0) return t; }
  for (const c of [a, b]) { const oc = V.sub(o, c); const bb = V.dot(d, oc), cc = V.dot(oc, oc) - r * r, hh = bb * bb - cc; if (hh > 0) { const t = -bb - Math.sqrt(hh); if (t > 0) return t; } }
  return -1;
}
function raycastWorld(ray, assist = 0) {
  let best = null;
  for (const a of ACTORS) {
    if (a.gone || !a.skin) continue; if (V.dist(a.pos, ray.o) > 260) continue;
    const caps = actorCapsules(a);
    for (const c of caps) {
      const t = rayCapsule(ray.o, ray.d, c.a, c.b, c.r + assist);
      if (t > 0 && (!best || t < best.t - (c.weak ? -0.12 : 0.0) || (c.weak && t < best.t + 0.12 && !best.weak && best.a === a))) best = { t, a, cap: c, weak: !!c.weak, bone: c.bone };
    }
  }
  for (const tg of TARGETS) {
    if (tg.down) continue; const oc = V.sub(tg.c, ray.o); const t = V.dot(oc, ray.d); if (t < 0) continue;
    const pt = V.add(ray.o, V.mul(ray.d, t)); const dd = V.dist(pt, tg.c);
    if (dd < tg.r + assist * 0.5 && (!best || t < best.t)) best = { t, target: tg, weak: dd < tg.r * 0.3 };
  }
  // terrain
  let tHit = -1; for (let t = 1; t < 320; t += t < 30 ? 0.5 : 2) { const p = V.add(ray.o, V.mul(ray.d, t)); if (p[1] < terrainH(p[0], p[2])) { tHit = t; break; } }
  if (tHit > 0 && (!best || tHit < best.t)) best = { t: tHit, ground: true };
  return best;
}
function muzzlePos() { return M4.pt(CAM.world, [0.2, -0.15, -0.95]); }
function fireDart() {
  if (G.phase !== 'play' || G.reload > 0 || G.cool > 0) return;
  if (G.ammo <= 0) { SFX.empty(); startReload(); if (!RADIO.said.dry) { RADIO.said.dry = 1; radio('dot', 'You are dry! Reload! R or right click.'); } return; }
  G.ammo--; G.cool = FIRE_CD; G.shots++; G.recoil = 1;
  const ray = cameraRay(INPUT.rx, INPUT.ry); const hit = raycastWorld(ray, IS_TOUCH || INPUT.mode === 'pad' ? 0.16 : 0.06);
  const m = muzzlePos(); const dart = { start: m, t: 0, T: 0.1, lock: null, end: null, weak: false };
  if (hit && hit.a) {
    const p = V.add(ray.o, V.mul(ray.d, hit.t)); const inv = M4.invert(hit.a.skin.subarray(hit.bone * 16, hit.bone * 16 + 16));
    dart.lock = { a: hit.a, bone: hit.bone, local: M4.pt(inv, p), dir: M4.dir(inv, ray.d) }; dart.weak = hit.weak; dart.T = Math.max(0.05, V.dist(m, p) / DART_SPEED);
  } else if (hit && hit.target) { dart.target = hit.target; dart.weak = hit.weak; dart.end = V.add(ray.o, V.mul(ray.d, hit.t)); dart.T = Math.max(0.05, V.dist(m, dart.end) / DART_SPEED); }
  else { dart.end = V.add(ray.o, V.mul(ray.d, hit ? hit.t : 160)); dart.ground = !!hit; dart.T = Math.max(0.05, V.dist(m, dart.end) / DART_SPEED); }
  dart.dir = ray.d; DARTS.push(dart); SFX.fire();
  if (G.ammo === 0) later(0.26, () => { if (G.ammo === 0 && G.reload <= 0) startReload(); });
}
function dartEnd(d) { if (d.lock) { const S = d.lock.a.skin.subarray(d.lock.bone * 16, d.lock.bone * 16 + 16); return M4.pt(S, d.lock.local); } return d.end; }
function updateDarts(dt) {
  for (let i = DARTS.length - 1; i >= 0; i--) {
    const d = DARTS[i]; d.t += dt; const u = Math.min(1, d.t / d.T);
    const s = V.add(d.start, V.mul(JEEP.vel, d.t)); const e = dartEnd(d);
    const prev = d.pos || s; d.pos = V.lerp(s, e, u); d.vel = V.mul(V.sub(d.pos, prev), 1 / Math.max(dt, 1e-4));
    if (u >= 1) {
      DARTS.splice(i, 1);
      if (d.lock) {
        const a = d.lock.a; if (a.darts.length > 9) a.darts.shift(); a.darts.push({ bone: d.lock.bone, local: d.lock.local, dir: d.lock.dir });
        PARTS.puff(e, [1, 0.6, 0.25]); registerHit(a, d.weak, e); SFX.thwip(d.weak);
      } else if (d.target) {
        const tg = d.target; tg.down = 1; tg.hitT = G.time; G.hits++; G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo); G.mult = Math.min(5, 1 + Math.floor(G.combo / 4));
        const pts = addScore(d.weak ? 150 : 60); popup(e, (d.weak ? 'BULLSEYE +' : '+') + pts, d.weak ? '#ffd34d' : '#fff', d.weak); SFX.thwip(d.weak); SFX.wood(); PARTS.puff(e, [0.8, 0.7, 0.5]);
        if (TARGETS.every(t => t.down) && !RADIO.said.targets) { RADIO.said.targets = 1; radio('dot', 'Three for three! Okay, sharpshooter, let us find some real dinos.'); }
      } else {
        if (d.ground) { GROUND_DARTS.push({ p: e, dir: d.dir, t: G.time }); if (GROUND_DARTS.length > 24) GROUND_DARTS.shift(); PARTS.dust(e, [0, 0, 0], 3); }
        registerMiss(e);
      }
    }
  }
}

// ---- particles ----
const PARTS = {
  list: [],
  add(p, v, life, size, col, kind = 0, grav = 0, drag = 0.5, grow = 0, alpha = 1) { if (this.list.length > 1800) this.list.shift(); this.list.push({ p: p.slice(), v: v.slice(), life, max: life, size, col, kind, grav, drag, grow, alpha }); },
  splash(p, n, sc = 1, base = [0, 0, 0]) { for (let i = 0; i < n; i++) this.add([p[0] + rnd.range(-0.4, 0.4) * sc, p[1] + 0.1, p[2] + rnd.range(-0.4, 0.4) * sc], [base[0] * 0.3 + rnd.range(-2, 2) * sc, rnd.range(2, 5) * Math.sqrt(sc), base[2] * 0.3 + rnd.range(-2, 2) * sc], rnd.range(0.5, 1.1), rnd.range(0.12, 0.3) * sc, [0.85, 0.9, 0.92], 0, 9.8, 0.8, 0.9, 0.75); },
  dust(p, base, n = 1) { for (let i = 0; i < n; i++) this.add([p[0], p[1] + 0.2, p[2]], [base[0] * 0.15 + rnd.range(-0.8, 0.8), rnd.range(0.3, 1.2), base[2] * 0.15 + rnd.range(-0.8, 0.8)], rnd.range(1.2, 2.2), rnd.range(0.35, 0.7), [0.62, 0.53, 0.4], 0, -0.2, 1.2, 1.4, 0.4); },
  puff(p, col) { for (let i = 0; i < 6; i++) this.add(p, [rnd.range(-1.5, 1.5), rnd.range(-0.5, 2), rnd.range(-1.5, 1.5)], rnd.range(0.25, 0.5), 0.06, col, 3, 3, 2, 0.4, 1); this.add(p, [0, 0, 0], 0.18, 0.5, [1.6, 1.2, 0.8], 2, 0, 0, 2, 0.7); },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const q = this.list[i]; q.life -= dt; if (q.life <= 0) { this.list.splice(i, 1); continue; }
      q.v[1] -= q.grav * dt; const k = Math.exp(-q.drag * dt); q.v = V.mul(q.v, k); q.p = V.add(q.p, V.mul(q.v, dt)); q.size += q.grow * dt * q.size * 0.5;
    }
  },
};

// ---- practice targets near the gate ----
function buildTargets() {
  TARGETS.length = 0;
  for (const [s, d, h] of [[46, 7.5, 1.5], [60, -6.5, 1.7], [74, 9.5, 1.4]]) {
    const p = PATH.world(s, d, 0); p[1] = terrainH(p[0], p[2]); const A = PATH.at(s);
    TARGETS.push({ c: [p[0], p[1] + h, p[2]], base: p, h, r: 0.55, face: V.norm(V.add(V.mul(A.t, -1), V.mul(A.r, -Math.sign(d) * 0.6))), down: 0, hitT: 0, fall: 0 });
  }
}

// ---- timeline: events keyed to the jeep's distance along the course ----
function raptorWave(sAt, list) {
  // list: [{d, ahead, attach, runT, clingMul, trig}] spawned hidden in the grass/ferns ahead
  for (const r of list) {
    const ss = sAt + (r.ahead ?? 55); const p = PATH.world(ss, r.d, 0); p[1] = terrainH(p[0], p[2]);
    const A = PATH.at(ss);
    spawn('raptor', { pos: p, yaw: faceYaw(-A.r[0] * Math.sign(r.d), -A.r[2] * Math.sign(r.d)), state: 'hide', trigS: ss - (r.trig ?? 38), attach: r.attach, runT: r.runT || 1.6, clingMul: r.clingMul || 1, lead: r.lead || 1 });
  }
}
function pteroWave(n, opt = {}) {
  for (let i = 0; i < n; i++) {
    const p = V.add(JEEP.pos, V.add(V.mul(JEEP.fwd, 70 + i * 12), [rnd.range(-25, 25), 26 + rnd.range(0, 10), rnd.range(-25, 25)]));
    const a = spawn('ptero', { pos: p, state: 'circle', wait: (opt.wait || 3) + i * (opt.gap || 2.2), ahead: opt.ahead || 34, alt: 18 + rnd.range(0, 10), radius: 12 + rnd.range(0, 8), circSpd: 0.6 + rnd() * 0.4, side: rnd.sgn() });
    a.vel = V.mul(JEEP.fwd, JEEP.v);
  }
}
function buildTimeline() {
  const E = [];
  const at = (s, f) => E.push({ s, f });
  at(0, () => { radio('dot', "Morning, partner! I'm Dot. I drive, you dart. Nobody gets hurt today, and that includes the dinosaurs."); radio('dot', 'Warm up on the boards by the gate. Click to fire, R or right click to reload.'); });
  at(112, () => HUD.banner('RAPTOR COUNTRY', '#ffd34d'));
  at(120, () => radio('dot', 'Grass is moving... raptors! Dart them before they jump on the jeep. One dart puts a raptor down.'));
  at(110, () => raptorWave(110, [{ d: 13, attach: 1, ahead: 70, runT: 2.6, clingMul: 1.6, trig: 45 }]));
  at(190, () => raptorWave(190, [{ d: -14, attach: 0, ahead: 60 }, { d: 16, attach: 2, ahead: 72, runT: 2.2 }]));
  at(270, () => raptorWave(270, [{ d: 12, attach: 1, ahead: 55 }, { d: -15, attach: 3, ahead: 62, runT: 2.0 }, { d: 18, attach: 2, ahead: 80, runT: 2.4 }]));
  at(360, () => raptorWave(360, [{ d: -12, attach: 0, ahead: 60 }, { d: 13, attach: 1, ahead: 66, runT: 1.8 }]));
  at(430, () => { radio('dot', 'Easy now. Big girl crossing. We are going right under her. Do not make her nervous.'); });
  at(436, () => { spawnLongneck(540); HUD.banner('LONG-NECK CROSSING', '#9be37a'); });
  at(470, () => { const a = ACTORS.find(a => a.kind === 'longneck'); if (a) SFX.longneck(a); });
  at(500, () => radio('dot', 'Want a bonus? A long-neck that size takes a LOT of darts. Head shots count double.'));
  at(600, () => { radio('dot', 'Fern forest. I hate ferns. Anything could be in there.'); tape(12); });
  at(628, () => HUD.banner('FERN FOREST', '#9be37a'));
  at(640, () => raptorWave(640, [{ d: 11, attach: 1, ahead: 50 }, { d: -10, attach: 0, ahead: 58 }]));
  at(720, () => raptorWave(720, [{ d: -9, attach: 3, ahead: 48 }, { d: 10, attach: 1, ahead: 55 }, { d: 12, attach: 2, ahead: 68, runT: 2.2 }]));
  at(800, () => raptorWave(800, [{ d: 9, attach: 2, ahead: 50 }, { d: -11, attach: 0, ahead: 56 }, { d: 10, attach: 1, ahead: 64 }]));
  at(870, () => radio('dot', 'Here comes the whole pack!'));
  at(880, () => raptorWave(880, [{ d: -9, attach: 0, ahead: 48 }, { d: 9, attach: 1, ahead: 52 }, { d: -12, attach: 3, ahead: 60, runT: 2.0 }, { d: 12, attach: 2, ahead: 68, runT: 2.4 }]));
  at(950, () => raptorWave(950, [{ d: 10, attach: 1, ahead: 50 }, { d: -10, attach: 0, ahead: 56 }]));
  at(990, () => { radio('dot', 'Gorge ahead. Watch the sky. Gliders dive at shiny things, and we are very shiny.'); tape(12); });
  at(1004, () => HUD.banner('THE GORGE', '#ffd34d'));
  at(1010, () => pteroWave(2, { wait: 3.5, gap: 2.4 }));
  at(1085, () => pteroWave(3, { wait: 2.8, gap: 1.8 }));
  at(1165, () => pteroWave(3, { wait: 2.4, gap: 1.5 }));
  at(1235, () => pteroWave(2, { wait: 2.0, gap: 1.2 }));
  at(1290, () => tape(12));
  at(1300, () => { radio('dot', 'Herd on the move! We are cutting straight through. Dart anything that comes at us, and the hornbacks take four darts. Two to the head.'); startHerd(1300); });
  at(1340, () => HUD.banner('STAMPEDE!', '#ff8a5a'));
  at(1350, () => spawnCharger(1350, -30));
  at(1410, () => spawnCharger(1410, 34));
  at(1465, () => { spawnCharger(1465, -28); spawnCharger(1470, 32); });
  at(1525, () => spawnCharger(1525, -32));
  at(1560, () => raptorWave(1560, [{ d: 14, attach: 1, ahead: 50 }, { d: -14, attach: 0, ahead: 58 }]));
  at(1600, () => { radio('base', 'Base to Jeep Four. Seismic readings near the river. Something big.'); radio('dot', 'Define big.'); radio('base', '...Big.'); });
  at(1630, () => tape(15));
  at(1655, () => { spawnBoss(1655); });
  at(1690, () => HUD.banner('RUMBLEJAW', '#ff7a4a'));
  at(1700, () => radio('dot', 'Rumblejaw! Turn around and start darting! The soft throat under the jaw counts triple when it roars!', 1));
  at(1900, () => raptorWave(1900, [{ d: -14, attach: 4, ahead: -10, runT: 2.5, trig: 250 }, { d: 14, attach: 5, ahead: -16, runT: 2.8, trig: 250 }]));
  at(2080, () => pteroWave(2, { wait: 2.5, gap: 2, ahead: -24 }));
  at(2250, () => raptorWave(2250, [{ d: 13, attach: 4, ahead: -14, runT: 2.4, trig: 250 }]));
  at(2470, () => { if (BOSS.a && !BOSS.a.asleep) { setState(BOSS.a, 'giveup'); BOSS.a.threat = false; radio('dot', 'Outpost gate! It will not follow us past the fence. We made it!', 1); G.result = 'escaped'; G.finishAt = G.time + 6; } });
  at(COURSE_END - 25, () => { if (G.finishAt < 0) G.finishAt = G.time + 4; });
  E.sort((a, b) => a.s - b.s); G.events = E; G.evI = 0;
}
function tape(n) {
  if (JEEP.health >= 100 || G.phase !== 'play') return; const h = Math.min(n, 100 - JEEP.health); JEEP.health += h; popupScreen('DUCT TAPE +' + Math.round(h), '#9bf28a');
  if (!RADIO.said.tape) { RADIO.said.tape = 1; radio('dot', 'Quick patch. Duct tape fixes everything except dinosaurs.'); }
}
function spawnLongneck(sc) {
  const A = PATH.at(sc); const dir = V.norm(V.add(A.r, V.mul(A.t, -0.05)));
  const a = spawn('longneck', { state: 'cross', sc, dc: 0, dir, ratio: 0.2, u0: -2.8, clearU: 16 });
  a.pos = PATH.world(sc, -40, 0); updLongneck(a, 0.016); poseActor(a);
  for (const [bone, at, yaw] of [['pelvis', [1.2, 7.55, 0.6], 0.4], ['chest', [5.0, 7.75, -0.5], -0.3]]) {
    const p = spawn('ptero', { state: 'perch', perchBone: bone, perchAt: at, perchYaw: yaw, trigS: sc - 24, ahead: 30, alt: 18, wait: 3 + rnd() * 3, radius: 14, side: rnd.sgn() });
    p.perchOn = a; p.pos = a.pos.slice(); p.an.fold = 1;
  }
}
function startHerd(s0) { G.herd = { s0, until: 1600, next: 0 }; }
function updateHerd(dt) {
  const H = G.herd; if (!H || JEEP.s > H.until) return; H.next -= dt; if (H.next > 0) return;
  H.next = rnd.range(0.35, 0.7);
  const lane = Math.max(1420, JEEP.s + rnd.range(25, 130)); if (lane > 1590) return;
  const A = PATH.at(lane); const ang = rnd.range(-0.25, 0.25); const dir = V.norm(V.add(A.r, V.mul(A.t, ang)));
  const startD = -rnd.range(55, 85); const p = PATH.world(lane, startD, 0); p[1] = terrainH(p[0], p[2]);
  const big = rnd() < 0.28;
  spawn('herd', { sp: big ? 'hornback' : 'runner', pos: p, yaw: faceYaw(dir[0], dir[2]), state: 'cross', dir, laneS: lane, spd: big ? rnd.range(7, 9) : rnd.range(9, 12) });
}
function spawnCharger(sAt, d) {
  const ss = sAt + 70; const p = PATH.world(ss, d, 0); p[1] = terrainH(p[0], p[2]);
  spawn('herd', { sp: 'hornback', pos: p, yaw: faceYaw(-PATH.at(ss).r[0] * Math.sign(d), -PATH.at(ss).r[2] * Math.sign(d)), state: 'wait', trigS: ss - 55 });
}
function spawnBoss(s0) {
  const a = spawn('boss', { state: 'enter', s0 }); BOSS.a = a; a.gap = 30; a.pos = PATH.world(s0, -26, 0);
  G.bossShown = true; later(0.9, () => { G.lookBack = 1; });
  radio('dot', 'What was that? Behind us. BEHIND US!', 1);
}

// ---- game flow ----
function resetGame(opt = {}) {
  ACTORS.length = 0; DARTS.length = 0; TIMERS.length = 0; GROUND_DARTS.length = 0; POPUPS.length = 0; PARTS.list.length = 0; RADIO.q.length = 0; RADIO.cur = null; RADIO.said = {}; BOSS.a = null;
  rnd = RNG(SEED + 101);
  Object.assign(G, { phase: 'play', time: 0, score: 0, combo: 0, maxCombo: 0, mult: 1, ammo: 6, reload: 0, cool: 0, shots: 0, hits: 0, weak: 0, misses: 0, dozed: {}, saves: 0, damage: 0,
    shake: 0, flash: 0, lookYaw: 0, lookPitch: 0, lookBack: 0, endT: -1, result: '', herd: null, recoil: 0, bossShown: false, finishAt: -1, lowWarn: 0 });
  Object.assign(JEEP, { s: opt.s || 0, v: opt.s ? keyLerp(SPEEDS, opt.s) : 0, health: 100, idle: opt.s ? 0 : 3.2 });
  buildTargets(); buildTimeline();
  if (opt.s) { while (G.evI < G.events.length && G.events[G.evI].s < opt.s - 2) G.evI++; }
  updateJeep(0.001); HUD.radio(null);
}
function updateGame(dt) {
  if (G.phase !== 'play' && G.phase !== 'over') return;
  G.time += dt; G.cool = Math.max(0, G.cool - dt); G.shake = Math.max(0, G.shake - dt * 1.8); G.flash = Math.max(0, G.flash - dt * 2.5); G.recoil = Math.max(0, G.recoil - dt * 6);
  if (G.reload > 0) { G.reload -= dt; if (G.reload <= 0) { G.reload = 0; G.ammo = G.mag; SFX.reloadDone(); } }
  updateJeep(dt);
  while (G.evI < G.events.length && JEEP.s >= G.events[G.evI].s) { G.events[G.evI].f(); G.evI++; }
  updateHerd(dt); updateActors(dt); for (const a of ACTORS) if (!a.gone) poseActor(a);
  updateDarts(dt); PARTS.update(dt); updateRadio(dt); runTimers();
  for (const tg of TARGETS) if (tg.down) tg.fall = Math.min(1, tg.fall + dt * 3);
  for (let i = POPUPS.length - 1; i >= 0; i--) { POPUPS[i].t += dt; if (POPUPS[i].t > 1.3) POPUPS.splice(i, 1); }
  // camera look: forward, toward set pieces, or backward for the chase
  let ly = 0, lp = -0.02;
  const ln = ACTORS.find(a => a.kind === 'longneck' && !a.gone);
  if (ln && JEEP.s > 470 && JEEP.s < 560) { const hp = headPos(ln); const dx = hp[0] - CAM.pos[0], dz = hp[2] - CAM.pos[2]; const want = angWrap(faceYaw(dx, dz) - JEEP.yaw); const k = smooth(470, 505, JEEP.s) * (1 - smooth(536, 556, JEEP.s)); ly = clamp(want, -0.9, 0.9) * k * 0.6; lp = lerp(lp, clamp(Math.atan2(hp[1] - CAM.pos[1], Math.hypot(dx, dz)), -0.2, 0.75) * 0.75, k); }
  if (G.lookBack) { ly = Math.PI; lp = -0.04; if (BOSS.a && BOSS.a.asleep && BOSS.a.state === 'sleep' && G.time > (G.finishAt - 4)) ly = 0; }
  G.lookYaw = G.lookYaw + angWrap(ly - G.lookYaw) * (1 - Math.exp(-2.4 * dt)); G.lookPitch = damp(G.lookPitch, lp, 2.4, dt);
  if (INPUT.fireHeld && !G.auto) fireDart();
  if (G.autoFire && IS_TOUCH) autoFire();
  if (G.auto) autopilot(dt);
  if ((G.finishAt > 0 && G.time >= G.finishAt) || (G.endT > 0 && G.time >= G.endT) || JEEP.s >= COURSE_END + 25) endGame();
}
function autoFire() {
  if (G.cool > 0 || G.reload > 0) return; const ray = cameraRay(INPUT.rx, INPUT.ry); const h = raycastWorld(ray, 0.2);
  if (h && ((h.a && !h.a.asleep) || (h.target && !h.target.down))) fireDart();
}
function endGame() {
  if (G.phase === 'results') return;
  if (!G.result) G.result = BOSS.a && BOSS.a.asleep ? 'complete' : 'escaped';
  if (G.result === 'complete' || (BOSS.a && BOSS.a.asleep)) G.result = 'complete';
  const acc = G.shots ? G.hits / G.shots : 0;
  G.final = { base: G.score, acc: Math.round(acc * 100), accBonus: Math.round(acc * 2000), hpBonus: G.result === 'disabled' ? 0 : Math.round(JEEP.health * 15), total: 0 };
  G.final.total = G.final.base + G.final.accBonus + G.final.hpBonus;
  G.newBest = G.final.total > G.best; if (G.newBest) { G.best = G.final.total; SAVE.set('best', G.best); }
  G.phase = 'results'; tlog('end', G.result, G.final.total, 'time', G.time.toFixed(1));
  HUD.results();
}
// headless helper: a simple bot that aims at the most urgent threat
function autopilot(dt) {
  if (G.reload > 0) return;
  if (G.botLag) { G.botT = (G.botT || 0) - dt; if (G.botT > 0 && G.botAim) { INPUT.rx = damp(INPUT.rx, G.botAim[0], 7, dt); INPUT.ry = damp(INPUT.ry, G.botAim[1], 7, dt); if (G.cool <= 0) { const h = raycastWorld(cameraRay(INPUT.rx, INPUT.ry), 0.06); if (h && h.a && !h.a.asleep && h.a.kind !== 'longneck') fireDart(); } return; } G.botT = G.botLag; }
  let best = null, bs = -1e9, off = null, os = -1e9;
  for (const a of ACTORS) {
    if (a.gone || a.asleep || !a.skin) continue; if (a.kind === 'longneck' && !G.botGreedy) continue;
    if (a.kind === 'herd' && a.state === 'cross' && (a.id % 3)) continue;
    const caps = actorCapsules(a); const c = caps.find(c => c.weak) || caps[0]; const p = V.lerp(c.a, c.b, 0.5);
    const score = (a.threat ? 100 : 0) + (a.state === 'cling' ? 200 : 0) + (a.kind === 'boss' ? 50 : 0) - V.dist(p, CAM.pos);
    const n = projectNDC(CAM.vp, p);
    if (n[2] <= 0 || Math.abs(n[0]) > 0.95 || Math.abs(n[1]) > 0.95) { if (a.threat && score > os) { os = score; off = n[2] <= 0 ? [-Math.sign(n[0] || 1), -Math.sign(n[1])] : [clamp(n[0], -1, 1), clamp(n[1], -1, 1)]; } continue; }
    if (V.dist(p, CAM.pos) > 70 && !a.threat) continue;
    if (score > bs) { bs = score; best = n; }
  }
  for (const tg of TARGETS) if (!tg.down) { const n = projectNDC(CAM.vp, tg.c); if (n[2] > 0 && Math.abs(n[0]) < 0.9 && Math.abs(n[1]) < 0.9 && bs < -50) { bs = -50; best = n; } }
  if (!best && off && os > 0) { INPUT.rx = damp(INPUT.rx, off[0] * 0.97, 6, dt); INPUT.ry = damp(INPUT.ry, off[1] * 0.9, 6, dt); return; }
  if (!best) { if (G.ammo < G.mag) startReload(); return; }
  const err = G.botErr ?? 0.02;
  G.botAim = [best[0] + rnd.range(-err, err), best[1] + rnd.range(-err, err)];
  INPUT.rx = damp(INPUT.rx, G.botAim[0], 12, dt); INPUT.ry = damp(INPUT.ry, G.botAim[1], 12, dt);
  if (G.cool > 0) return;
  const h = raycastWorld(cameraRay(INPUT.rx, INPUT.ry), 0.06);
  if (h && ((h.a && !h.a.asleep && !(h.a.kind === 'longneck' && !G.botGreedy)) || (h.target && !h.target.down))) fireDart();
}
