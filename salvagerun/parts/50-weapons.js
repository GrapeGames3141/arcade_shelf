// ---------- weapons: twin rapid-fire cannon and the lock-on volley ----------
const BOLT_SPEED = 720, FIRE_RATE = 11; let MAX_LOCKS = 8;
const BOLTS = [], MISSILES = [];
// fire modes (unlocked in the hangar): cannon, scatter, beam, flak. Toggle with Q / mouse wheel / MODE / gamepad Y.
const WEAP = { cool: 0, barrel: 0, heat: 0, over: false, mode: 'cannon', beamOn: false, beamEnd: null, beamHit: null };
const MODE_ORDER = ['cannon', 'scatter', 'beam', 'flak'];
function unlockedModes() { return MODE_ORDER.filter(m => CAMP.modes[m]); }
function cycleMode(dir = 1) {
  const list = unlockedModes(); if (list.length < 2) { popup('BUY FIRE MODES IN THE HANGAR', TUG.W, '#9cf'); return; }
  const i = list.indexOf(WEAP.mode); WEAP.mode = CAMP.mode = list[(i + dir + list.length) % list.length]; SFX.mode();
  popup(MODES.find(m => m.id === WEAP.mode).name, vmad(TUG.W, TUG.frame.U, 4), '#9ef', true);
}
function setMode(m) { if (CAMP.modes[m]) WEAP.mode = m; }
const LOCK = { on: false, list: [], cool: 0, volley: 0, sweepT: 0 };
let VOLLEYS = {};
// screen projection of a world point (CSS pixels); returns null behind the camera
function project(p) {
  const v = CAM.vp; const x = p[0], y = p[1], z = p[2];
  const w = v[3] * x + v[7] * y + v[11] * z + v[15]; if (w < 0.5) return null;
  const nx = (v[0] * x + v[4] * y + v[8] * z + v[12]) / w, ny = (v[1] * x + v[5] * y + v[9] * z + v[13]) / w;
  return { x: (nx * 0.5 + 0.5) * VIEW.cssW, y: (0.5 - ny * 0.5) * VIEW.cssH, w, k: CAM.focal / w };
}
// aim ray through the reticle
function aimRay(px, py) {
  const nx = px / VIEW.cssW * 2 - 1, ny = 1 - py / VIEW.cssH * 2;
  const a = M4.xf(CAM.ivp, [nx, ny, -1]), b = M4.xf(CAM.ivp, [nx, ny, 1]);
  return { o: CAM.eye.slice(), d: vnorm(vsub(b, a)) };
}
// target nearest to the reticle (screen distance minus on-screen radius)
function pickAt(px, py, pad, filter = hittable, maxD = 700) {
  let best = null, bd = pad;
  for (const e of ENTS) {
    if (!filter(e) || e.hidden) continue;
    const s = project(e.W); if (!s || s.w > maxD) continue;
    const d = Math.hypot(s.x - px, s.y - py) - e.r * s.k;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function muzzles() {
  const q = TUG.turQ, base = vadd(TUG.W, qrot(TUG.q, TUG_TURRET));
  return [vadd(base, qrot(q, [0.28, 0.6, 2.7])), vadd(base, qrot(q, [-0.28, 0.6, 2.7]))];
}
function aimPoint() {
  const tgt = pickAt(AIM.x, AIM.y, IS_TOUCH || IN.touch ? 30 : 18);
  const base = vadd(TUG.W, qrot(TUG.q, TUG_TURRET));
  if (tgt) {
    const rel = vsub(tgt.vel, TUG.vel); let p = tgt.W;
    for (let i = 0; i < 2; i++) { const t = vdist(base, p) / BOLT_SPEED; p = vmad(tgt.W, rel, t); }
    return { p, tgt };
  }
  const r = aimRay(AIM.x, AIM.y); return { p: vmad(r.o, r.d, 450), tgt: null };
}
function updateWeapons(dt) {
  WEAP.cool -= dt; LOCK.cool -= dt;
  // turret aim
  const ap = aimPoint(); TUG.aimP = ap.p; TUG.aimTgt = ap.tgt;
  const base = vadd(TUG.W, qrot(TUG.q, TUG_TURRET));
  const dir = vnorm(vsub(ap.p, base)), up = qrot(TUG.q, [0, 1, 0]);
  const want = frameQ(dir, vlen(vcross(dir, up)) > 0.05 ? up : qrot(TUG.q, [0, 0, -1]));
  TUG.turQ = TUG.turQ ? qslerp(TUG.turQ, want, 1 - Math.exp(-18 * dt)) : want;
  const firing = (IN.fire || (SET.auto && ap.tgt && !LOCK.on)) && G.phase === 'play' && !TUG.dead && !LOCK.on;
  const mode = WEAP.mode;
  WEAP.beamOn = false;
  if (mode === 'beam') {
    if (firing && !WEAP.over) {
      WEAP.heat += dt / 3.0; if (WEAP.heat >= 1) { WEAP.heat = 1; WEAP.over = true; SFX.overheat(); }
      fireBeam(dt, ap);
    } else WEAP.heat = Math.max(0, WEAP.heat - dt * (WEAP.over ? 0.42 : 0.6));
    if (WEAP.over && WEAP.heat < 0.3) WEAP.over = false;
  } else WEAP.heat = Math.max(0, WEAP.heat - dt);
  SFX.beam(WEAP.beamOn);
  if (firing && WEAP.cool <= 0 && mode !== 'beam') {
    const ms = muzzles(), m = ms[WEAP.barrel ^= 1], d = vnorm(vsub(ap.p, m));
    if (mode === 'cannon') {
      WEAP.cool = 1 / (FIRE_RATE * STATS.rateK);
      BOLTS.push({ p: m, v: vmad(TUG.vel, d, BOLT_SPEED), life: 0.9, dmg: STATS.dmgK, kind: 'bolt' });
      sprite(m, null, 0.9, 0.9, [6, 4, 2], 1, 0); addLight(m, [5, 3, 1.4], 18, 0.06); SFX.fire();
    } else if (mode === 'scatter') {
      WEAP.cool = 1 / (3.4 * STATS.rateK);
      const up = TUG.frame.U, side = vnorm(vcross(d, up));
      for (let i = 0; i < 6; i++) { const a = frnd() * TAU, r = Math.sqrt(frnd()) * 0.055, dd = vnorm(vadd(d, vadd(vscl(side, Math.cos(a) * r), vscl(up, Math.sin(a) * r)))); BOLTS.push({ p: ms[i % 2], v: vmad(TUG.vel, dd, 560), life: 0.5, dmg: 0.85 * STATS.dmgK, kind: 'pellet', hitW: 1 / 6 }); }
      for (const mm of ms) sprite(mm, null, 1.4, 1.4, [7, 4, 1.6], 1, 0); addLight(m, [7, 4, 1.5], 22, 0.08); SFX.scatter(); shake(0.06);
    } else if (mode === 'flak') {
      WEAP.cool = 1 / (2.6 * STATS.rateK);
      const dist = vdist(ap.p, m), fuse = clamp(dist / 420, 0.22, 1.4);
      BOLTS.push({ p: m, v: vmad(TUG.vel, d, 420), life: fuse, dmg: STATS.dmgK, kind: 'flak' });
      sprite(m, null, 1.6, 1.6, [7, 3.5, 1.2], 1, 0); addLight(m, [6, 3, 1], 20, 0.08); SFX.flak();
    }
    G.stats.shots++;
  }
  // bolts, pellets and flak shells
  for (let i = BOLTS.length - 1; i >= 0; i--) {
    const b = BOLTS[i], np = vmad(b.p, b.v, dt); b.life -= dt;
    if (b.kind === 'flak') {
      let burst = b.life <= 0;
      if (!burst) for (const e of ENTS) { if (hittable(e) && !e.hidden && vdist(e.W, np) < e.r + 6) { burst = true; break; } }
      if (burst) { flakBurst(np, b.dmg); BOLTS.splice(i, 1); continue; }
      b.p = np; continue;
    }
    let hit = null, ht = 1;
    const seg = vsub(np, b.p), L2 = vdot(seg, seg);
    for (const e of ENTS) {
      if (!hittable(e) || e.hidden) continue;
      const rel = vsub(e.W, b.p), t = clamp(vdot(rel, seg) / L2, 0, 1), cp = vmad(b.p, seg, t), rr2 = e.r + 0.6;
      if (vdist(cp, e.W) < rr2 && t < ht) { ht = t; hit = e; }
    }
    if (!hit && BOSS.active && BOSS.solid && BOSS.solid(np)) { FX.sparks(np, 4, [0, 0, 0], [0.6, 3, 2], 10); BOLTS.splice(i, 1); continue; }
    if (hit) { G.stats.hits += b.hitW || 1; damageE(hit, b.dmg || 1, { kind: 'bolt' }); BOLTS.splice(i, 1); continue; }
    b.p = np; if (b.life <= 0) BOLTS.splice(i, 1);
  }
  // lock-on sweep
  if (LOCK.on && LOCK.cool <= 0) {
    LOCK.sweepT += dt;
    if (LOCK.list.length < MAX_LOCKS) {
      const pad = IS_TOUCH || IN.touch ? 44 : 30;
      for (const e of ENTS) {
        if (LOCK.list.length >= MAX_LOCKS) break;
        if (!lockable(e) || e.hidden) continue;
        if (e.lockT && G.t - e.lockT < 0.16) continue;
        const s = project(e.W); if (!s || s.w > 560) continue;
        if (Math.hypot(s.x - AIM.x, s.y - AIM.y) - e.r * s.k > pad) continue;
        LOCK.list.push(e); e.pending += MISSILE_DMG; e.lockT = G.t; e.lockFlash = 0.6;
        SFX.lock(LOCK.list.length);
      }
    }
  }
  for (const e of ENTS) if (e.lockFlash) e.lockFlash = Math.max(0, e.lockFlash - dt * 3);
  // missiles
  for (let i = MISSILES.length - 1; i >= 0; i--) {
    const m = MISSILES[i];
    if (m.delay > 0) { m.delay -= dt; if (m.delay <= 0) launchMissile(m); continue; }
    m.age += dt;
    let t = m.tgt;
    if (!t || !t.alive) {
      if (t && !m.re) { m.re = true; t.pending = Math.max(0, t.pending - MISSILE_DMG); const n = nearestLockable(m.p, 160); if (n) { m.tgt = t = n; n.pending += MISSILE_DMG; } else m.tgt = t = null; }
      if (!t) { m.p = vmad(m.p, m.v, dt); if (m.age > 1.2) { FX.boom(m.p, 1.2, [1, 0.6, 0.25]); MISSILES.splice(i, 1); } continue; }
    }
    const to = vsub(t.W, m.p), d = vlen(to);
    const tti = d / Math.max(80, vlen(m.v));
    const aim = vnorm(vsub(vmad(t.W, t.vel, tti), m.p));
    const sp = Math.min(340, vlen(m.v) + 420 * dt), cur = vnorm(m.v);
    const turn = (3 + m.age * 16) * dt;
    const ang = Math.acos(clamp(vdot(cur, aim), -1, 1));
    const nd = ang < 1e-4 ? aim : vnorm(vlerp(cur, aim, Math.min(1, turn / ang)));
    m.v = vscl(nd, sp);
    const step = sp * dt;
    if (d < t.r + 1.2 + step || m.age > 1.9) {
      t.pending = Math.max(0, t.pending - MISSILE_DMG);
      FX.boom(t.W, 1.6 + STATS.splash * 0.15, [1, 0.6, 0.3], t.vel); SFX.pop();
      const tw = t.W.slice();
      damageE(t, MISSILE_DMG, { kind: 'missile', volley: m.volley });
      if (STATS.splash) for (const o of ENTS) if (o !== t && hittable(o) && !o.K.boss && vdist(o.W, tw) < STATS.splash + o.r) damageE(o, 2 * STATS.dmgK, { kind: 'blast', volley: m.volley });
      MISSILES.splice(i, 1); continue;
    }
    m.p = vmad(m.p, m.v, dt);
    m.trail -= dt; if (m.trail <= 0) { m.trail = 0.012; spawnP({ p: m.p.slice(), v: vscl(m.v, 0.05), life: 0.5, s0: 0.35, s1: 1.2, c0: [1.2, 1, 0.9], c1: [0.15, 0.15, 0.18], a0: 0.5, a1: 0, shape: 3, drag: 2 }); }
  }
}
function flakBurst(p, k) {
  FX.boom(p, 2.6, [1, 0.6, 0.25]); spawnP({ p, life: 0.3, s0: 2, s1: 13, c0: [5, 3, 1.2], c1: [0.5, 0.2, 0.05], a0: 0.9, a1: 0, shape: 1 }); SFX.pop();
  let any = false;
  for (const e of ENTS) { if (!hittable(e) || e.hidden) continue; const d = vdist(e.W, p) - e.r; if (d < 12) { any = true; damageE(e, 3 * k * (1 - Math.max(0, d) / 14), { kind: 'flak' }); } }
  if (any) G.stats.hits++;
}
// cutting beam: continuous damage on the first thing along the aim line
function fireBeam(dt, ap) {
  const ms = muzzles(), o = vlerp(ms[0], ms[1], 0.5), dir = vnorm(vsub(ap.p, o));
  let best = null, bt = 650;
  for (const e of ENTS) {
    if (!hittable(e) || e.hidden) continue;
    const rel = vsub(e.W, o), t = vdot(rel, dir); if (t < 0 || t > bt) continue;
    const r = e.r + 0.4, d2 = vdot(rel, rel) - t * t; if (d2 > r * r) continue;
    const th = t - Math.sqrt(Math.max(0, r * r - d2)); if (th < bt) { bt = Math.max(0, th); best = e; }
  }
  const end = vmad(o, dir, best ? bt : Math.min(500, vdist(o, ap.p)));
  WEAP.beamOn = true; WEAP.beamEnd = end; WEAP.beamO = o; WEAP.beamHit = best;
  WEAP.beamAcc = (WEAP.beamAcc || 0) + dt; if (WEAP.beamAcc > 0.25) { WEAP.beamAcc = 0; G.stats.shots++; if (best) G.stats.hits++; } // a quarter second of beam counts as one shot
  if (best) {
    best.flash = Math.max(best.flash, 0.35);
    damageE(best, 11 * STATS.dmgK * dt, { kind: 'beam' });
    if (frnd() < dt * 30) FX.sparks(end, 2, best.vel || [0, 0, 0], [3, 6, 8], 12);
  }
}
function qslerp(a, b, t) { let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]; if (d < 0) { b = b.map(x => -x); d = -d; } return qnorm(a.map((x, i) => x + (b[i] - x) * t)); }
function nearestLockable(p, maxD) { let best = null, bd = maxD; for (const e of ENTS) { if (!lockable(e) || e.hidden) continue; const d = vdist(e.W, p); if (d < bd) { bd = d; best = e; } } return best; }
function lockStart() { if (LOCK.cool > 0 || G.phase !== 'play' || TUG.dead) return; LOCK.on = true; LOCK.list = []; LOCK.sweepT = 0; SFX.lockOn(); }
function lockRelease() {
  if (!LOCK.on) return; LOCK.on = false;
  const n = LOCK.list.length; if (!n) return;
  const id = ++LOCK.volley; VOLLEYS[id] = { n, kills: 0, t: G.t };
  LOCK.list.forEach((e, i) => MISSILES.push({ tgt: e, delay: 0.001 + i * 0.05, volley: id, side: i % 2 ? 1 : -1, age: 0, trail: 0 }));
  LOCK.list = []; LOCK.cool = 0.35; G.stats.volleys++; G.stats.lockedTotal += n;
}
function launchMissile(m) {
  const side = m.side, pod = vadd(TUG.W, qrot(TUG.q, [side * 2.05, 0.85, 1.3]));
  const f = qrot(TUG.q, [0, 0, 1]), up = qrot(TUG.q, [0, 1, 0]), lf = qrot(TUG.q, [1, 0, 0]);
  m.p = pod; m.v = vadd(TUG.vel, vscl(vnorm(vadd(vadd(vscl(f, 0.6), vscl(lf, side * 0.7)), vscl(up, 0.5 + frnd() * 0.4))), 70));
  sprite(pod, null, 1.6, 1.6, [5, 3, 2], 1, 0); SFX.launch();
}
function drawWeapons() {
  for (const b of BOLTS) {
    if (b.kind === 'pellet') sprite(b.p, vscl(vsub(b.v, TUG.vel), 0.01), 0.16, 0.16, [9, 6, 3], 1, 2);
    else if (b.kind === 'flak') { sprite(b.p, vscl(vsub(b.v, TUG.vel), 0.006), 0.35, 0.35, [8, 4, 1.4], 1, 2); sprite(b.p, null, 0.9, 0.9, [3, 1.4, 0.5], 0.8, 0); }
    else sprite(b.p, vscl(vsub(b.v, TUG.vel), 0.012), 0.22, 0.22, [9, 5.5, 2.2], 1, 2);
  }
  if (WEAP.beamOn && WEAP.beamEnd) {
    const o = WEAP.beamO, e = WEAP.beamEnd, L = vsub(e, o), flick = 0.85 + 0.15 * Math.sin(G.t * 90);
    sprite(vlerp(o, e, 0.5), L, 0.32 * flick, 0.05, [3, 9, 12], 1, 2);
    sprite(vlerp(o, e, 0.5), L, 0.9, 0.05, [0.4, 1.6, 2.4], 0.6, 0);
    sprite(e, null, WEAP.beamHit ? 2.6 : 1.2, WEAP.beamHit ? 2.6 : 1.2, [3, 8, 10], 1, 0);
    sprite(o, null, 1.1, 1.1, [3, 8, 10], 1, 0);
    if (WEAP.beamHit) addLight(e, [2, 5, 7], 26, 0.05);
  }
  for (const m of MISSILES) {
    if (m.delay > 0) continue;
    inst('missile', m.p, frameQ(vnorm(m.v), [0, 1, 0]), 1.4, [1, 1, 1], 2, 1, 0, 0, 0.2);
    const back = vmad(m.p, vnorm(m.v), -1.1);
    sprite(back, null, 1.2, 1.2, [7, 4, 1.8], 1, 0); sprite(back, vscl(vnorm(m.v), -3), 0.35, 0.35, [5, 2.5, 1], 1, 2);
  }
}
