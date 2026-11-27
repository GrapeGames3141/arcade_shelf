// ===== Game state: the ride, camera, gun, flares, scoring and combo, health, triggers, lurkers, results =====
const FLARE_MAX = 3, FLARE_REGEN = 6.5, FIRE_RATE = 8;
const G = {
  phase: 'menu', time: 0, paused: false,
  cart: { seg: null, s: 0, speed: 0, p: [0, 0, 0] }, cartVel: [0, 0, 0],
  cam: { p: [0, 1.5, 0], f: [0, 0, -1], r: [1, 0, 0], u: [0, 1, 0], vfov: 68 * DEG, asp: 16 / 9, vp: M4.ident(), view: M4.ident() },
  aim: { x: 0, y: 0 }, firing: false, fireCD: 0, flares: FLARE_MAX, regen: 0, flareCD: 0, health: 100, score: 0,
  chain: 0, mult: 1, comboT: 0, shake: 0, hurtT: 0, muzzle: 0, muzzleP: [0, 0, 0], invuln: 0, webT: 0,
  stats: {}, lever: { A: 0, B: 0 }, bossDead: false, popups: [], look: null, fade: 1, fadeCol: [0, 0, 0], outroT: 0, path: [], bot: false, botSkill: .8, hurtDir: null,
};
function resetStats() { G.stats = { shots: 0, hits: 0, kills: 0, lit: 0, flares: 0, dmgTaken: 0, crashes: 0, maxMult: 1, snipes: 0, scared: 0, boss: false, time: 0 }; }

function startRun(opt) {
  opt = opt || {};
  ENEMIES.length = 0; FLARES.length = 0; FLASHES.length = 0; TRACERS.length = 0; P.n = 0; G.popups.length = 0;
  buildLevel(); bossInit();
  Object.assign(G, { phase: 'play', time: 0, paused: false, health: 100, score: 0, chain: 0, mult: 1, comboT: 0, flares: FLARE_MAX, regen: 0, flareCD: 0, fireCD: 0, shake: 0, hurtT: 0, invuln: 0, webT: 0,
    bossDead: false, look: null, fade: 1, fadeCol: [0, 0, 0], outroT: 0, path: ['intro'], lever: { A: opt.branchA || 0, B: opt.branchB || 0 }, firing: false, aim: { x: 0, y: 0 }, wreckT: 0, result: null });
  G.cart.seg = TRACK.segs.intro; G.cart.s = 1; G.cart.speed = 0;
  resetStats();
  for (const L of LV.levers) L.state = G.lever[L.junction];
  if (opt.seg) { G.cart.seg = TRACK.segs[opt.seg]; G.cart.s = opt.s || 1; G.cart.speed = targetSpeed(G.cart.seg, G.cart.s); G.path = [opt.seg]; for (const k in LV.trig) for (const t of LV.trig[k]) if (k === opt.seg && t.s < G.cart.s) t.done = true; if (['loop', 'exit'].includes(opt.seg) && opt.bossDead) { BOSS.state = 'gone'; G.bossDead = true; } }
  G.cart.f = G.cart.seg.at(G.cart.s); G.cart.p = G.cart.f.p;
  if (opt.calm) { for (const l of LV.lurkers) l.state = 'missed'; for (const k in LV.trig) for (const t of LV.trig[k]) t.done = true; }
  if (opt.wake) { bossWake(); BOSS.state = 'fight'; BOSS.t = 0; BOSS.rise = 1; for (const e of BOSS.eyes) e.open = 1; BOSS.atkCD = 99; }
  updateCamera(0);
  SND.startRide();
  HUD.show(true);
}

function targetSpeed(seg, s) {
  switch (seg.id) {
    case 'intro': return s < 36 ? 4.2 : s < 64 ? 11.5 : s < 214 ? 10 : s < 272 ? 7.5 : 10.5;
    case 'river': return s < 80 ? 10.5 : s < 206 ? 9.5 : s < 352 ? 7 : 10;
    case 'seam': return 9.5 + 1.2 * Math.sin(s * .05);
    case 'crystal': return s < 96 ? 6.6 : 9.5;
    case 'falls': return s < 30 ? 10 : s < 150 ? 13 : 11;
    case 'nest': return 7.8;
    case 'hollow': return s < 50 ? 8 : 5.8;
    case 'loop': return G.bossDead ? 13 : BOSS.state === 'wake' ? 4.2 : 5.3;
    case 'exit': return 12.5;
  }
  return 9;
}
function nextSeg(seg) {
  const T = TRACK.segs;
  switch (seg.id) {
    case 'intro': return G.lever.A ? T.seam : T.river;
    case 'river': case 'seam': return T.crystal;
    case 'crystal': return G.lever.B ? T.nest : T.falls;
    case 'falls': case 'nest': return T.hollow;
    case 'hollow': return T.loop;
    case 'loop': return G.bossDead ? T.exit : T.loop;
  }
  return null;
}
// frame at distance d ahead of the cart, following the current switch settings
function frameAhead(d) {
  let seg = G.cart.seg, s = G.cart.s + d;
  for (let k = 0; k < 3 && s > seg.len; k++) { const n = nextSeg(seg); if (!n) { const f = seg.at(seg.len); return { p: V.madd(f.p, f.T, s - seg.len), T: f.T, R: f.R, U: f.U }; } s -= seg.len; seg = n; }
  return seg.at(s);
}

function moveCart(dt) {
  const c = G.cart, tgt = targetSpeed(c.seg, c.s) * (G.webT > 1.5 ? .6 : 1);
    const rate = tgt > c.speed ? 3.2 : 5.5; c.speed += clamp(tgt - c.speed, -rate * dt, rate * dt);
  if (G.time < 1.2) c.speed = 0;
  const before = c.p; c.s += c.speed * dt;
  while (c.s > c.seg.len) {
    const n = nextSeg(c.seg);
    if (!n) { c.s = c.seg.len; if (G.phase === 'play') { G.phase = 'outro'; G.outroT = 0; } break; }
    c.s -= c.seg.len; c.seg = n; G.path.push(n.id);
    if (n.id === 'loop' && BOSS.state === 'sleep') bossWake();
  }
  const f = c.seg.at(c.s); c.p = f.p; c.f = f;
  if (G.phase === 'outro') { G.outroT += dt; c.p = V.madd(f.p, f.T, G.outroT * c.speed); }
  G.cartVel = dt > 0 ? V.scl(f.T, c.speed) : [0, 0, 0];
}

function updateCamera(dt) {
  const c = G.cart, f = c.f || c.seg.at(c.s), cam = G.cam;
  const ahead = frameAhead(7.5);
  let fw = V.norm(V.add(V.sub(V.madd(ahead.p, ahead.U, 1.2), V.madd(f.p, f.U, 1.45)), [0, 0, 0]));
  if (G.look && G.look.w > 0) { const to = V.norm(V.sub(G.look.p, cam.p)); fw = V.norm(V.lerp(fw, to, G.look.w)); }
  // aim parallax: the view turns a little toward the reticle
  const yaw = -G.aim.x * .16, pitch = G.aim.y * .1;
  let r = V.norm(V.cross(fw, [0, 1, 0])); fw = rotAxis(fw, [0, 1, 0], yaw); r = V.norm(V.cross(fw, [0, 1, 0])); fw = rotAxis(fw, r, pitch);
  let u = V.cross(r, fw);
  const curv = c.seg.curv(c.s), roll = clamp(-curv * c.speed * c.speed * .022, -.2, .2) * (G.phase === 'menu' ? .5 : 1);
  G.roll = lerp(G.roll || 0, roll, 1 - Math.exp(-3 * Math.max(dt, .016)));
  r = rotAxis(r, fw, G.roll); u = rotAxis(u, fw, G.roll);
  const bob = Math.sin(c.s * TAU / 2.2) * .012 * Math.min(1, c.speed / 8);
  let eye = V.add(V.madd(c.p, f.U, 1.56 + bob), V.scl(f.T, -.3));
  if (G.shake > 0) { const s = G.shake * .09; eye = V.add(eye, [Math.sin(G.time * 71) * s, Math.sin(G.time * 83 + 1) * s, Math.sin(G.time * 67 + 2) * s]); fw = V.norm(V.add(fw, V.scl(u, Math.sin(G.time * 61) * G.shake * .02))); }
  if (G.phase === 'wrecked') { const k = smooth(0, 1.6, G.wreckT); eye = V.add(eye, [0, -k * 1.1, 0]); r = rotAxis(r, fw, k * 1.1); u = rotAxis(u, fw, k * 1.1); fw = rotAxis(fw, r, -k * .4); }
  if (G.camLock) { eye = G.camLock.eye; fw = V.norm(V.sub(G.camLock.at, eye)); r = V.norm(V.cross(fw, [0, 1, 0])); u = V.cross(r, fw); }
  cam.p = eye; cam.f = V.norm(fw); cam.r = V.norm(V.cross(cam.f, u)); cam.u = V.cross(cam.r, cam.f);
  const asp = cam.asp; let vf = (G.camLock && G.camLock.fov ? G.camLock.fov : 68) * DEG; const hf = 2 * Math.atan(Math.tan(vf / 2) * asp);
  if (hf < 64 * DEG) vf = Math.min(108 * DEG, 2 * Math.atan(Math.tan(32 * DEG) / asp));
  cam.vfov = vf;
  cam.view = M4.view(cam.p, cam.r, cam.u, cam.f); cam.proj = M4.persp(vf, asp, .05, 240); cam.vp = M4.mul(cam.proj, cam.view);
}
function aimRay(ax, ay) { const C = G.cam, tv = Math.tan(C.vfov / 2), th = tv * C.asp; return V.norm(V.add(C.f, V.add(V.scl(C.r, ax * th), V.scl(C.u, ay * tv)))); }
function project(p) { const m = G.cam.vp, x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]; return w > .01 ? [x / w, y / w, w] : null; }
function muzzlePos() { const C = G.cam; return V.add(C.p, V.add(V.add(V.scl(C.r, .29), V.scl(C.u, -.258)), V.scl(C.f, .85))); }

// ---------- gun ----------
function gatherTargets() {
  const T = [];
  for (const e of ENEMIES) enemySpheres(e, T);
  bossSpheres(T);
  const cp = G.cam.p;
  for (const L of LV.lamps) if (!L.lit && L.hitR > 0 && V.dist2(L.p, cp) < 4900) T.push({ c: L.p, r: L.hitR, lamp: L });
  for (const L of LV.levers) if (V.dist2(L.p, cp) < 3600) T.push({ c: L.p, r: L.hitR, lever: L });
  for (const c of LV.crates) if (c.alive && V.dist2(c.p, cp) < 3600) T.push({ c: c.p, r: c.hitR, crate: c });
  for (const l of LV.lurkers) if (l.state === 'wait' && V.dist2(l.p, cp) < 3600) T.push({ c: l.p, r: l.hitR, lurker: l });
  for (const e of LV.eggs) if (e.alive && V.dist2(e.p, cp) < 3600) T.push({ c: e.p, r: e.hitR, egg: e });
  return T;
}
function rayEll(o, d, E) {   // ray vs an ellipsoid given by a frame and radii
  const F = E.F, R = E.R, oc = V.sub(o, F.p);
  const lo = [V.dot(oc, F.x) / R[0], V.dot(oc, F.y) / R[1], V.dot(oc, F.z) / R[2]], ld = [V.dot(d, F.x) / R[0], V.dot(d, F.y) / R[1], V.dot(d, F.z) / R[2]];
  const a = V.dot(ld, ld), b = V.dot(lo, ld), c = V.dot(lo, lo) - 1, disc = b * b - a * c; if (disc < 0) return -1;
  return (-b - Math.sqrt(disc)) / a;
}
function raySphere(o, d, c, r) { const oc = V.sub(c, o), t = V.dot(oc, d); if (t < 0) return -1; const h = V.dot(oc, oc) - t * t; if (h > r * r) return -1; return t - Math.sqrt(r * r - h); }
function castShot(o, d, assist) {
  const wallT = rayWall(o, d, 95, .8);
  let best = null, bt = wallT;
  const T = gatherTargets();
  for (const t of T) { const h = t.ell ? rayEll(o, d, t.ell) : raySphere(o, d, t.c, t.r); if (h > 0 && h < bt) { bt = h; best = t; } }
  for (const w of LV.webs) if (w.alive && V.dist2(w.c, o) < 3600) { const n = w.f.T, den = V.dot(d, n); if (Math.abs(den) > .1) { const t = V.dot(V.sub(w.c, o), n) / den; if (t > 0 && t < bt && V.dist(V.madd(o, d, t), w.c) < w.r) { bt = t; best = { web: w }; } } }
  if (!best && assist) {   // touch aim assist: a little extra radius, growing with distance
    for (const t of T) { if (t.bossArmor) continue; const h = raySphere(o, d, t.c, t.r + .25 + .025 * V.dist(o, t.c)); if (h > 0 && h < bt) { bt = h; best = t; } }
  }
  return { t: bt, hit: best, pt: V.madd(o, d, bt), wallT };
}
function fireShot() {
  const d = aimRay(G.aim.x, G.aim.y), o = G.cam.p, res = castShot(o, d, TOUCH && !G.bot);
  G.stats.shots++; G.muzzle = .05; G.muzzleP = muzzlePos(); G.recoil = 1;
  TRACERS.push({ a: G.muzzleP, b: res.pt, t: 0 });
  SND.shoot();
  const h = res.hit;
  if (!h) { FX.sparks(V.madd(res.pt, d, -.05), 5, [1, .75, .4], 3); FX.debris(V.madd(res.pt, d, -.1), 1, [.35, .3, .25], .03, 2); return; }
  G.stats.hits++; G.hitMark = .12;
  if (h.e) enemyHit(h.e, h.crit ? 2 : 1, res.pt);
  else if (h.boss) bossEyeHit(h.boss, 1, res.pt);
  else if (h.bossMouth) { BOSS.interrupt += 1; FX.goo(res.pt, 4, [1, .4, .2]); SND.hitFlesh('boss'); }
  else if (h.bossArmor) { FX.sparks(res.pt, 4, [1, .8, .5], 3); SND.ping(); G.stats.hits--; G.hitMark = 0; }
  else if (h.lamp) lightLamp(h.lamp);
  else if (h.lever) flipLever(h.lever);
  else if (h.crate) openCrate(h.crate);
  else if (h.lurker) snipeLurker(h.lurker);
  else if (h.egg) { h.egg.alive = false; FX.goo(h.egg.p, 16, [.8, .85, .6]); SND.squish(); scoreAdd(60, h.egg.p, 'EGG SAC'); }
  else if (h.web) { const w = h.web; w.hp--; FX.glints(res.pt, 6, [.8, .8, .75]); if (w.hp <= 0) { w.alive = false; scoreAdd(50, w.c, 'WEB CUT'); SND.tear(); } }
}
function lightLamp(L, why) {
  if (L.lit) return; L.lit = true; L.litT = G.time;
  FX.embers(L.p, 14, L.col, 1.4); FLASHES.push({ p: V.copy(L.p), col: L.col, I: L.I * 2.5, range: L.range, t: 0, dur: .4 });
  if (L.kind === 'crystal') { SND.chime(L.col); FX.glints(L.p, 20, L.col); } else if (L.kind === 'brazier') SND.whoomp(true); else SND.whoomp();
  G.stats.lit++;
  scoreAdd(L.score, L.p, why || (L.kind === 'crystal' ? 'CRYSTAL' : 'LIT'));
  const group = L.kind === 'crystal' || L.kind === 'brazier' ? LV.lamps.filter(x => x.kind === L.kind) : null;
  if (group && group.every(x => x.lit)) { scoreAdd(1000, L.p, L.kind === 'crystal' ? 'CAVERN ALIGHT!' : 'HOLLOW ALIGHT!'); banner(L.kind === 'crystal' ? 'CAVERN ALIGHT! +1000' : 'HOLLOW ALIGHT! +1000', 2.2); }
}
function flipLever(L) {
  if (L.cool > 0) return;
  const seg = TRACK.segs[L.seg];
  if (G.cart.seg !== seg || G.cart.s > seg.len - 4) return;   // too late, the points are under the cart
  L.state ^= 1; L.cool = .35; G.lever[L.junction] = L.state; SND.lever();
  popup(L.p, (L.state ? L.names[1] + ' ▶' : '◀ ' + L.names[0]), [1, .85, .4]);
  if (!L.scored) { L.scored = true; scoreAdd(100, L.p, null); }
}
function openCrate(c) {
  c.alive = false; FX.splinters(c.p, 14);
  if (c.kind === 'health') { G.health = Math.min(100, G.health + 25); popup(c.p, '+25 HEALTH', [.5, 1, .5]); SND.pickup(); }
  else { G.flares = Math.min(5, G.flares + 2); popup(c.p, '+2 FLARES', [1, .6, .3]); SND.pickup(); }
  scoreAdd(100, c.p, null);
}
function snipeLurker(l) {
  l.state = 'shot'; l.gone = 0;
  const pts = { peeper: 50, bat: 120, spider: 150, burrower: 200 }[l.type];
  FX.goo(l.p, 6, [.6, .5, .4]); SND.squeak();
  G.stats.snipes++; scoreAdd(pts, l.p, l.type === 'peeper' ? 'PEEPER' : 'SNIPED');
}

// ---------- scoring ----------
function scoreAdd(base, p, label) {
  G.chain++; G.mult = Math.min(8, 1 + Math.floor(G.chain / 4)); G.comboT = 4.5;
  const pts = base * G.mult; G.score += pts; G.stats.maxMult = Math.max(G.stats.maxMult, G.mult);
  popup(p, '+' + pts + (label ? ' ' + label : ''), label && label.includes('!') ? [1, .9, .4] : [1, 1, 1]);
  if (G.chain % 4 === 0 && G.mult > 1) SND.combo(G.mult);
}
function popup(p, text, col) { G.popups.push({ p: V.copy(p), text, col: col || [1, 1, 1], t: 0 }); if (G.popups.length > 24) G.popups.shift(); }
function hurt(dmg, p, src) {
  if (G.phase !== 'play' || G.invuln > 0 || G.godMode) return;
  const by = G.stats.dmgBy || (G.stats.dmgBy = {}); by[src || 'other'] = (by[src || 'other'] || 0) + dmg;
  G.health -= dmg; G.chain = 0; G.mult = 1; G.comboT = 0; G.hurtT = 1; G.shake = Math.max(G.shake, .5 + dmg / 30); G.invuln = .3;
  G.stats.dmgTaken += dmg; SND.hurt(dmg);
  if (p) { const d = V.sub(p, G.cam.p); G.hurtDir = { x: V.dot(d, G.cam.r), y: V.dot(d, G.cam.u), t: 1 }; }
  if (G.health <= 0) { G.health = 0; G.phase = 'wrecked'; G.wreckT = 0; SND.crash(); banner('CART WRECKED', 2.5); }
}

// ---------- per-frame game logic ----------
function updateGame(dt) {
  if (G.phase === 'menu') { menuRide(dt); return; }
  if (G.paused || G.phase === 'results') return;
  G.time += dt; G.stats.time = G.time;
  if (G.phase === 'wrecked') { G.wreckT += dt; G.cart.speed *= Math.exp(-2.5 * dt); moveCart(dt); updateCamera(dt); updateEnemies(dt); updateParticles(dt); updateFlares(dt); if (G.wreckT > 2.6) finishRun(false); return; }
  moveCart(dt);
  G.fade = Math.max(0, G.fade - dt * .8);
  if (G.phase === 'outro') { G.fadeCol = [1, .97, .9]; G.fade = smooth(0, 1.6, G.outroT); if (G.outroT > 1.9) finishRun(true); }
  // triggers on this segment
  const tl = LV.trig[G.cart.seg.id]; if (tl) for (const t of tl) if (!t.done && G.cart.s >= t.s) { t.done = true; t.fn(); }
  if (G.cart.seg.id === 'hollow' && G.cart.s > 60 && BOSS.state === 'sleep') bossWake();
  // scripted look at the waking Sleeper
  if (BOSS.state === 'wake') G.look = { p: V.add(BOSS.head, [0, -1, 0]), w: .7 * smooth(0, 1.2, BOSS.t) };
  else if (BOSS.state === 'fight' && G.cart.seg.id === 'loop') G.look = { p: V.add(BOSS.head, [0, -1.5, 0]), w: G.look ? lerp(G.look.w, .72, 1 - Math.exp(-2 * dt)) : .7 };
  else if (BOSS.state === 'dying' && G.cart.seg.id === 'loop') G.look = { p: BOSS.head, w: G.look ? lerp(G.look.w, .2, 1 - Math.exp(-1.5 * dt)) : .2 };
  else if (G.look) { G.look.w = Math.max(0, G.look.w - dt * .8); if (G.look.w <= 0) G.look = null; }
  updateCamera(dt);
  // gun and flares
  if (G.bot) botThink(dt);
  G.fireCD -= dt; G.flareCD -= dt;
  if ((G.firing || (G.autoFire && autoFireWants())) && G.fireCD <= 0 && G.phase === 'play') { G.fireCD = 1 / FIRE_RATE; fireShot(); }
  if (G.flares < FLARE_MAX) { G.regen += dt; if (G.regen >= FLARE_REGEN) { G.regen = 0; G.flares++; SND.tick(); } } else G.regen = 0;
  G.muzzle = Math.max(0, G.muzzle - dt); G.recoil = Math.max(0, (G.recoil || 0) - dt * 9); G.hitMark = Math.max(0, (G.hitMark || 0) - dt);
  G.comboT -= dt; if (G.comboT <= 0 && G.chain > 0) { G.chain = 0; G.mult = 1; }
  G.shake = Math.max(0, G.shake - dt * 1.6); G.hurtT = Math.max(0, G.hurtT - dt * 1.4); G.invuln -= dt; G.webT = Math.max(0, G.webT - dt);
  if (G.hurtDir) { G.hurtDir.t -= dt * .8; if (G.hurtDir.t <= 0) G.hurtDir = null; }
  for (const L of LV.levers) { L.cool -= dt; L.ang = lerp(L.ang, L.state ? .6 : -.6, 1 - Math.exp(-12 * dt)); }
  updateLurkers(dt); updateWebs(); updateEnemies(dt); updateBoss(dt); updateFlares(dt); updateParticles(dt);
  for (let i = G.popups.length - 1; i >= 0; i--) { G.popups[i].t += dt; if (G.popups[i].t > 1.3) G.popups.splice(i, 1); }
  SND.ride(G.cart.speed, dt);
}
function autoFireWants() {
  const d = aimRay(G.aim.x, G.aim.y), o = G.cam.p, T = gatherTargets();
  for (const t of T) { if (t.bossArmor || t.lever) continue; if (raySphere(o, d, t.c, t.r + .2 + .02 * V.dist(o, t.c)) > 0) return true; }   // levers only flip on purpose
  return false;
}
function updateLurkers(dt) {
  const cp = G.cam.p, seg = G.cart.seg;
  for (const l of LV.lurkers) {
    if (l.state !== 'wait') { l.gone += dt; continue; }
    l.blink -= dt; if (l.blink < -.15) l.blink = 1.5 + Math.random() * 4;
    const d2 = V.dist2(l.p, cp); if (d2 > 900) continue;
    const ahead = l.seg === seg.id ? l.s - G.cart.s : (V.dot(V.sub(l.p, cp), G.cam.f));
    if (ahead < -3) { l.state = 'missed'; continue; }
    if (isLit(l.p) && d2 < 26 * 26) { l.state = 'fled'; l.gone = 0; G.stats.scared++; if (l.type !== 'peeper') { G.score += 25; popup(l.p, 'SCARED OFF +25', [.7, .85, 1]); } continue; }
    if (l.type === 'peeper') { if (d2 < 36) { l.state = 'fled'; l.gone = 0; } continue; }
    const trig = l.type === 'bat' ? 19 : l.type === 'spider' ? 15 : 12.5;
    if (ahead < trig) {
      l.state = 'out'; l.gone = 0;
      if (l.type === 'spider') spawnSpider(l.p, l.n, 'crawl');
      else if (l.type === 'burrower') spawnBurrower(V.madd(l.p, l.n, -.4), l.where === 'water' ? V.norm([l.n[0], 1, l.n[2]]) : V.norm(V.add(l.n, [0, .25, 0])));
      else spawnBatAt(l.p, 4);
    }
  }
}
function updateWebs() {
  for (const w of LV.webs) if (w.alive && w.seg === G.cart.seg.id && G.cart.s > w.s - .3) { w.alive = false; G.webT = 2.2; hurt(4, w.c, 'web'); SND.tear(); popup(w.c, 'WEBBED!', [.9, .9, .8]); }
}
function finishRun(survived) {
  if (G.phase === 'results') return;
  const onPath = LV.lamps.filter(l => l.kind !== 'sun' && !l.preLit && G.path.includes(l.seg));
  const lit = onPath.filter(l => l.lit).length, acc = G.stats.shots ? G.stats.hits / G.stats.shots : 0;
  const bonus = { health: survived ? Math.round(G.health) * 20 : 0, lights: survived ? Math.round(lit / Math.max(1, onPath.length) * 3000) : 0, accuracy: survived ? Math.round(acc * 2000) : 0 };
  const total = G.score + bonus.health + bonus.lights + bonus.accuracy;
  const grade = !survived ? 'X' : total >= 175000 ? 'S' : total >= 140000 ? 'A' : total >= 105000 ? 'B' : total >= 70000 ? 'C' : 'D';
  const best = SAVE.get('best', 0); const isBest = survived && total > best; if (isBest) SAVE.set('best', total);
  G.result = { survived, score: G.score, bonus, total, grade, lit, litTotal: onPath.length, acc, isBest, best: Math.max(best, isBest ? total : 0), path: G.path.slice(), time: G.time };
  G.phase = 'results'; G.firing = false;
  SND.stopRide(); if (survived) SND.fanfare();
  HUD.results(G.result);
}

// attract mode on the title screen: the cart rolls slowly through Shaft 9 with its lanterns lit
function menuRide(dt) {
  G.time += dt;
  const c = G.cart; if (!c.seg) { c.seg = TRACK.segs.intro; c.s = 40; }
  c.speed = 3.2; c.s += c.speed * dt; if (c.s > 205) c.s = 40;
  const f = c.seg.at(c.s); c.p = f.p; c.f = f; G.cartVel = V.scl(f.T, c.speed);
  G.aim.x = Math.sin(G.time * .3) * .35; G.aim.y = Math.sin(G.time * .23) * .2;
  updateCamera(dt); updateFlares(dt); updateParticles(dt);
}

// ---------- autopilot (headless balance runs and the attract demo) ----------
function botThink(dt) {
  const B = G.botState || (G.botState = { tgt: null, react: 0, err: [0, 0] });
  const skill = G.botSkill, C = G.cam;
  B.react -= dt;
  if (B.react <= 0) {
    B.react = lerp(.35, .08, skill);
    let best = null, bs = 0;
    const consider = (p, pri, obj, needLight) => { if (needLight && !isLit(p) && V.dist(p, C.p) > 16) return; const q = project(p); if (!q || Math.abs(q[0]) > .92 || Math.abs(q[1]) > .9) return; const d = V.dist(p, C.p); if (d > 45) return; const s = pri / (d + 4); if (s > bs) { bs = s; best = { p, obj }; } };
    for (const e of ENEMIES) if (e.alive) { const pri = e.type === 'bat' ? (e.mode === 'atk' ? 9 : 4) : e.type === 'spider' ? (e.mode === 'leap' ? 10 : 6) : e.type === 'burrower' ? 8 : e.type === 'beam' ? 9 : e.type === 'rock' ? (e.harmless ? .5 : 8) : 3; consider(e.type === 'beam' ? V.lerp(e.top, beamEnd(e), .6) : e.p, pri, e, e.type === 'beam' || e.type === 'rock'); }
    if (BOSS.state === 'fight') for (const e of BOSS.eyes) if (e.alive && e.open > .5) consider(bossEyePos(e), 9, e);
    for (const L of LV.lamps) if (!L.lit && L.hitR > 0) consider(L.p, 2.2, L);
    for (const l of LV.lurkers) if (l.state === 'wait' && l.type !== 'peeper') consider(l.p, 3, l);
    for (const c of LV.crates) if (c.alive) consider(c.p, (c.kind === 'health' && G.health < 70) ? 5 : 1.5, c, true);
    for (const w of LV.webs) if (w.alive) consider(w.c, 4, w, true);
    for (const L of LV.levers) if (G.botLever && G.botLever[L.junction] !== L.state && G.cart.seg.id === L.seg && G.cart.s < TRACK.segs[L.seg].len - 6) consider(L.p, 12, L);
    B.tgt = best; B.err = [(Math.random() - .5) * (1 - skill) * .12, (Math.random() - .5) * (1 - skill) * .12];
    // flares: at dangerous eyes ahead, or to dazzle the Sleeper before a lunge
    if (G.flares > 0 && G.flareCD <= 0) {
      let fp = null;
      if (BOSS.state === 'fight' && BOSS.dazzle <= 0 && BOSS.dazzleCD <= 0 && (BOSS.atk && BOSS.atk.kind === 'lunge' || G.flares >= FLARE_MAX)) fp = V.madd(BOSS.head, [0, 1, 0], 2.5);
      else for (const l of LV.lurkers) if (l.state === 'wait' && l.type !== 'peeper' && V.dist(l.p, C.p) < 24 && V.dot(V.sub(l.p, C.p), C.f) > 8) { fp = l.p; break; }
      if (fp && skill > .4) { launchFlare(muzzlePos(), fp); G.flares--; G.flareCD = 1.2; }
    }
  }
  if (B.tgt) {
    const q = project(B.tgt.obj && B.tgt.obj.alive === false ? B.tgt.p : (B.tgt.obj && B.tgt.obj.type ? (B.tgt.obj.type === 'beam' ? V.lerp(B.tgt.obj.top, beamEnd(B.tgt.obj), .6) : B.tgt.obj.p) : B.tgt.obj && B.tgt.obj.off ? bossEyePos(B.tgt.obj) : B.tgt.p));
    if (q) {
      const tx = q[0] + B.err[0], ty = q[1] + B.err[1], sp = lerp(1.8, 5, skill) * dt;
      G.aim.x += clamp(tx - G.aim.x, -sp, sp); G.aim.y += clamp(ty - G.aim.y, -sp, sp);
      G.firing = Math.hypot(tx - G.aim.x, ty - G.aim.y) < .06;
    } else G.firing = false;
  } else { G.firing = false; G.aim.x *= .97; G.aim.y *= .97; }
}
