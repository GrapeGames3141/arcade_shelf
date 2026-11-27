// ---------- targets: debris, rocks, ice, salvage, critters, boss parts ----------
// space: 'rail' (rp = lateral x, vertical y, route z; rv per second), 'world' (wp, wv), 'host' (riding another entity), 'manual' (boss sets W)
const KINDS = {
  rockL: { tpl: () => 'rock' + ri(0, 4), r: 8, hp: 6, dmg: 18, pts: 60, mat: 0, fx: 'rock', split: 'rockM', nsplit: [2, 3], col: () => vlerp([0.42, 0.38, 0.34], [0.55, 0.47, 0.38], rnd()) },
  rockM: { tpl: () => 'rock' + ri(0, 4), r: 4.2, hp: 3, dmg: 10, pts: 30, mat: 0, fx: 'rock', split: 'rockS', nsplit: [2, 3], col: () => vlerp([0.42, 0.38, 0.34], [0.55, 0.47, 0.38], rnd()) },
  rockS: { tpl: () => 'rock' + ri(0, 4), r: 2.1, hp: 1, dmg: 5, pts: 15, mat: 0, fx: 'rock', col: () => vlerp([0.42, 0.38, 0.34], [0.55, 0.47, 0.38], rnd()) },
  ore: { tpl: () => 'rock' + ri(0, 4), r: 4.8, hp: 4, dmg: 12, pts: 40, mat: 0, fx: 'rock', gems: 4, gemVal: 40, gemCol: [1, 0.7, 0.25], ore: 1, col: () => [0.36, 0.33, 0.32] },
  iceL: { tpl: () => 'ice' + ri(0, 3), r: 8, hp: 5, dmg: 18, pts: 60, mat: 1, fx: 'ice', split: 'iceM', nsplit: [2, 3], col: () => [0.85, 0.93, 1] },
  iceM: { tpl: () => 'ice' + ri(0, 3), r: 4, hp: 2, dmg: 10, pts: 30, mat: 1, fx: 'ice', split: 'iceS', nsplit: [2, 3], col: () => [0.85, 0.93, 1] },
  iceS: { tpl: () => 'shard', r: 1.9, hp: 1, dmg: 5, pts: 15, mat: 1, fx: 'ice', scale: 1.5, col: () => [0.85, 0.93, 1] },
  frozen: { tpl: () => 'ice' + ri(0, 3), r: 5, hp: 3, dmg: 12, pts: 30, mat: 1, fx: 'ice', release: 'pod', col: () => [0.8, 0.9, 1] },
  plate: { tpl: () => 'plate' + ri(0, 1), r: 3.4, hp: 3, dmg: 9, pts: 30, mat: 2, fx: 'metal', scale: 1, col: () => pick(PAINTS) },
  girder: { tpl: () => 'girder', r: 5, hp: 5, dmg: 14, pts: 50, mat: 2, fx: 'metal', scale: 1, col: () => [1, 1, 1] },
  pod: { tpl: () => 'pod', r: 2.7, hp: 3, dmg: 10, pts: 0, mat: 2, fx: 'pod', gems: 5, gemVal: 50, kit: 0.22, scale: 1, col: () => pick([[0.2, 0.45, 0.75], [0.85, 0.55, 0.12], [0.3, 0.6, 0.35], [0.75, 0.75, 0.72], [0.6, 0.2, 0.5]]) },
  drone: { tpl: () => 'drone', r: 2.1, hp: 2, dmg: 8, pts: 0, mat: 2, fx: 'metal', gems: 3, gemVal: 50, gemCol: [0.4, 0.9, 1], scale: 1, col: () => [1, 1, 1] },
  core: { tpl: () => 'core', r: 2.3, hp: 5, dmg: 20, pts: 100, mat: 3, fx: 'core', gems: 6, gemVal: 50, gemCol: [0.4, 0.85, 1], blast: 30, scale: 1, col: () => [1, 1, 1] },
  mite: { tpl: () => 'mite0', r: 1.7, hp: 1, dmg: 4, pts: 40, mat: 5, fx: 'goo', critter: 1, scale: 1.1, col: () => [1, 1, 1] },
  glob: { tpl: () => 'beacon', r: 1.6, hp: 1, dmg: 8, pts: 25, mat: 4, fx: 'goo', scale: 1.2, col: () => [0.3, 1, 0.55] },
  thrown: { tpl: () => 'plate' + ri(0, 1), r: 3.4, hp: 2, dmg: 10, pts: 35, mat: 2, fx: 'metal', scale: 1, col: () => [0.55, 0.42, 0.18] },
  node: { tpl: () => 'node', r: 2.2, hp: 6, dmg: 0, pts: 300, mat: 4, fx: 'goo', boss: 1, scale: 1.7, col: () => [1, 1, 1] },
  eye: { tpl: () => 'beye', r: 2.7, hp: 12, dmg: 0, pts: 500, mat: 6, fx: 'goo', boss: 1, scale: 2.6, col: () => [1, 1, 1] },
  bcore: { tpl: () => 'bcore', r: 4.6, hp: 64, dmg: 0, pts: 3000, mat: 4, fx: 'goo', boss: 1, scale: 4.5, col: () => [1, 1, 1] }
};
const MISSILE_DMG = 4, TUG_R = 3.6;
let ENTS = [], NEXT_ID = 1;
function spawnE(kind, o = {}) {
  const K = KINDS[kind];
  const e = {
    id: NEXT_ID++, kind, K, tpl: TPL[o.tpl || K.tpl()], alive: true, hp: o.hp || K.hp, maxHp: o.hp || K.hp, pending: 0, flash: 0, age: 0,
    r: (o.r || K.r) * (o.rs || 1), scale: (o.scale || K.scale || K.r) * (o.rs || 1), col: o.col || K.col(), mat: K.mat,
    space: o.space || 'rail', rp: o.rp ? o.rp.slice() : [0, 0, 0], rv: o.rv ? o.rv.slice() : [0, 0, 0], wp: o.wp ? o.wp.slice() : [0, 0, 0], wv: o.wv ? o.wv.slice() : [0, 0, 0],
    q: o.q || qrand(), spinAx: o.spinAx || randDir(rnd), spin: o.spin ?? rr(0.2, 1.2), W: [0, 0, 0], prevW: null, vel: [0, 0, 0],
    seed: rnd() * 9, special: K.ore ? 1 : (o.special || 0), emis: o.emis ?? 1, host: o.host || null, off: o.off || null, untarget: !!o.untarget, ...o.extra
  };
  if (e.space === 'world') vcopy(e.W, e.wp); else if (e.space === 'rail') e.W = railToWorld(e.rp[0], e.rp[1], e.rp[2]);
  ENTS.push(e); return e;
}
// spawn helper: rail position at lead distance, optionally aimed so it arrives inside the tug's lane
function spawnAt(kind, x, y, dz, opt = {}) {
  const z = TUG.s + dz, o = Object.assign({ rp: [x, y, z] }, opt);
  if (opt.aim !== undefined) {
    const vz = (opt.rv && opt.rv[2]) || 0, tt = dz / Math.max(8, TUG.v - vz);
    const ax = opt.aim[0], ay = opt.aim[1];
    o.rv = [(ax - x) / tt, (ay - y) / tt, vz];
  }
  return spawnE(kind, o);
}
function attachCritter(host, n) {
  for (let i = 0; i < n; i++) {
    const d = randDir(rnd), m = spawnE('mite', { space: 'host', host, off: vscl(d, host.r * 0.95 / host.scale), q: qfromTo([0, 1, 0], d), spin: 0 });
    m.localQ = qfromTo([0, 1, 0], d); host.critters = (host.critters || []); host.critters.push(m);
  }
}
function swarm(n, x, y, dz, opt = {}) {
  const sw = { id: NEXT_ID++, c: [x, y, TUG.s + dz], v: opt.v || [0, 0, -6], t: 0, ph: rnd() * TAU, n };
  for (let i = 0; i < n; i++) { const m = spawnE('mite', { space: 'swarm', spin: 0, q: qid() }); m.swarm = sw; m.so = [rr(-1, 1) * 9, rr(-1, 1) * 6, rr(-1, 1) * 10]; m.sph = rnd() * TAU; }
  return sw;
}
const DEBRIS = [];
function debris(tpl, p, v, s, col, mat, life) { if (DEBRIS.length > 260) DEBRIS.shift(); DEBRIS.push({ tpl: TPL[tpl], p: p.slice(), v, q: qrand(frnd), ax: randDir(frnd), sp: frr(1, 7), s, col, mat, life, max: life }); }
function updateDebris(dt) {
  for (let i = DEBRIS.length - 1; i >= 0; i--) { const d = DEBRIS[i]; d.life -= dt; if (d.life <= 0) { DEBRIS.splice(i, 1); continue; } d.p = vmad(d.p, d.v, dt); d.q = qnorm(qmul(qaxis(d.ax, d.sp * dt), d.q)); }
}
// salvage pickups that burst out, then get tractored to the tug
const PICKS = [];
function spawnGems(p, vel, n, val, col, kit) {
  for (let i = 0; i < n; i++) PICKS.push({ p: p.slice(), v: vmad(vel, randDir(frnd), frr(6, 16)), val, col, age: 0, q: qrand(frnd), kit: false });
  if (kit) PICKS.push({ p: p.slice(), v: vmad(vel, randDir(frnd), 8), val: 0, col: [0.3, 1, 0.4], age: 0, q: qrand(frnd), kit: true });
}
function updatePicks(dt) {
  for (let i = PICKS.length - 1; i >= 0; i--) {
    const k = PICKS[i]; k.age += dt;
    const to = vsub(TUG.W, k.p), d = vlen(to);
    if (k.age > 0.35) { const pull = Math.min(1, (k.age - 0.35) * 1.6); const want = vmad(TUG.vel, to, (50 + k.age * 60) / Math.max(d, 1) * pull); k.v = vlerp(k.v, want, 1 - Math.exp(-6 * pull * dt)); }
    else k.v = vscl(k.v, Math.exp(-2 * dt));
    k.p = vmad(k.p, k.v, dt); k.q = qnorm(qmul(qaxis([0.3, 1, 0.2], 6 * dt), k.q));
    if (d < 3.2 || k.age > 6) { PICKS.splice(i, 1); collectPick(k); }
  }
}
// per-step entity update
function updateEntities(dt) {
  for (const e of ENTS) {
    if (!e.alive) continue;
    e.age += dt; e.flash = Math.max(0, e.flash - dt * 5);
    if (e.space === 'rail') { e.rp[0] += e.rv[0] * dt; e.rp[1] += e.rv[1] * dt; e.rp[2] += e.rv[2] * dt; e.W = railToWorld(e.rp[0], e.rp[1], e.rp[2]); }
    else if (e.space === 'world') {
      if (e.home) homeOn(e, dt);
      e.wp = vmad(e.wp, e.wv, dt); e.W = e.wp.slice();
    } else if (e.space === 'host') {
      const h = e.host;
      if (!h || !h.alive) { leap(e); continue; }
      e.W = vadd(h.W, qrot(h.q, vscl(e.off, h.scale))); e.q = qmul(h.q, e.localQ);
      if (h.space === 'rail' && h.rp[2] - TUG.s < 105 + e.seed * 6) leap(e);
    } else if (e.space === 'swarm') {
      const sw = e.swarm; const t = G.t + e.sph;
      const rp = [sw.c[0] + e.so[0] + Math.sin(t * 2.1) * 3, sw.c[1] + e.so[1] + Math.cos(t * 1.7) * 2.5, sw.c[2] + e.so[2] + Math.sin(t * 1.3) * 3];
      const nw = railToWorld(rp[0], rp[1], rp[2]);
      if (e.prevW) { const d = vsub(nw, e.W); if (vlen(d) > 1e-3) e.q = frameQ(vnorm(d), [0, 1, 0]); }
      e.W = nw;
      if (sw.c[2] - TUG.s < 85 + e.seed * 4) leap(e);
    }
    if (e.spin && e.space !== 'host') e.q = qnorm(qmul(qaxis(e.spinAx, e.spin * dt), e.q));
    if (e.prevW) e.vel = vscl(vsub(e.W, e.prevW), 1 / dt); e.prevW = e.W.slice();
    // reaching the tug
    if (e.K.dmg && !e.K.boss) {
      const d = vdist(e.W, TUG.W);
      if (d < e.r * 0.72 + TUG_R) { hitTug(e.K.dmg, e); killE(e, 'tug'); continue; }
    }
    // gone past or drifted away
    if (e.space === 'rail' && e.rp[2] < TUG.s - 45) { e.alive = false; e.missed = true; }
    else if (e.space === 'world' && (e.age > 25 || vdist(e.W, TUG.W) > 1100)) e.alive = false;
  }
  // swarm centres drift toward the tug and weave
  for (const e of ENTS) if (e.space === 'swarm' && e.swarm.lastT !== G.t) { const sw = e.swarm; sw.lastT = G.t; sw.t += dt; sw.c[0] += (sw.v[0] + Math.sin(sw.t * 0.9 + sw.ph) * 6) * dt; sw.c[1] += (sw.v[1] + Math.cos(sw.t * 0.7 + sw.ph) * 3) * dt; sw.c[2] += sw.v[2] * dt; }
  if (ENTS.length > 40 && ENTS.some(e => !e.alive)) ENTS = ENTS.filter(e => e.alive || e.pending > 0);
}
// critter or projectile homes on the tug
function homeOn(e, dt) {
  const lead = vmad(TUG.W, TUG.vel, 0.4), want = vscl(vnorm(vsub(lead, e.wp)), e.home);
  e.wv = vlerp(e.wv, vadd(want, e.K.critter ? vscl([Math.sin(G.t * 9 + e.seed), Math.cos(G.t * 7 + e.seed), 0], 6) : [0, 0, 0]), 1 - Math.exp(-(e.turn || 2.5) * dt));
  if (e.K.critter && vlen(e.wv) > 1) e.q = frameQ(vnorm(e.wv), [0, 1, 0]);
}
function leap(e) {
  if (!e.alive) return;
  const W = e.W.slice(); e.space = 'world'; e.wp = W; e.home = 29 + e.seed * 1.5; e.turn = 1.9;
  e.wv = vmad(e.host && e.host.alive ? e.host.vel : TUG.vel, vnorm(vsub(TUG.W, W)), 20);
  e.host = null;
  if (!G.saidMites) { G.saidMites = true; radio('mites2'); }
}
// will this reach the tug if nobody shoots it?
function isDanger(e) {
  if (!e.alive || !e.K.dmg || e.K.boss) return false;
  if (e.space === 'rail') { const dz = e.rp[2] - TUG.s; if (dz <= 0 || dz > 300) return false; const tt = dz / Math.max(5, TUG.v - e.rv[2]); return Math.hypot(e.rp[0] + e.rv[0] * tt - TUG.x, e.rp[1] + e.rv[1] * tt - TUG.y) < e.r * 0.72 + TUG_R + 1.5; }
  if (e.space === 'world' && e.home) return vdist(e.W, TUG.W) < 260;
  return false;
}
function hittable(e) { return e.alive && !e.untarget && !e.closed; }
function lockable(e) { return hittable(e) && e.hp - e.pending > 0; }
// damage from bolts / missiles / blasts
function damageE(e, dmg, src) {
  if (!hittable(e)) return false;
  if (e.K.boss && BOSS.onHit && !BOSS.onHit(e, dmg, src)) return false;
  e.hp -= dmg; e.flash = 1;
  if (e.hp <= 0) { killE(e, src); return true; }
  if (src && src.kind === 'bolt') FX.sparks(e.W, 3, e.vel, e.K.mat === 1 ? [3, 4.5, 6] : e.K.mat === 5 || e.K.boss ? [0.6, 4, 2.5] : [5, 3.5, 1.5], 14);
  return false;
}
function killE(e, src) {
  if (!e.alive) return;
  e.alive = false; e.killedBy = src;
  const K = e.K, W = e.W, vel = e.vel;
  const byPlayer = src && src !== 'tug';
  // effects
  const sz = e.r;
  if (K.fx === 'rock') { FX.boom(W, sz * 0.7, [1, 0.55, 0.25], vel); for (let i = 0; i < 4 + sz; i++) debris('chunk', vmad(W, randDir(frnd), sz * 0.4), vmad(vel, randDir(frnd), frr(4, 14)), frr(0.25, 0.6) * Math.min(sz, 4), e.col, 0, frr(1.5, 3)); SFX.boom(sz); }
  else if (K.fx === 'ice') { FX.icy(W, sz, vel); for (let i = 0; i < 4 + sz; i++) debris('shard', vmad(W, randDir(frnd), sz * 0.4), vmad(vel, randDir(frnd), frr(5, 16)), frr(0.4, 1) * Math.min(sz, 3), [0.85, 0.93, 1], 1, frr(1.2, 2.5)); SFX.shatter(sz); }
  else if (K.fx === 'metal' || K.fx === 'pod') { FX.boom(W, sz * 0.75, [1, 0.6, 0.25], vel); for (let i = 0; i < 6 + sz; i++) debris('mshard', vmad(W, randDir(frnd), sz * 0.4), vmad(vel, randDir(frnd), frr(5, 18)), frr(0.6, 1.6), e.col, 2, frr(1.5, 3)); SFX.clang(sz); }
  else if (K.fx === 'core') { FX.boom(W, 9, [0.5, 0.85, 1], vel); FX.boom(W, 5, [1, 0.7, 0.3], vel); SFX.boom(14); shake(0.5); }
  else if (K.fx === 'goo') { FX.goo(W, sz * 0.8, vel, K.boss ? [1, 0.45, 0.6] : [0.2, 1.2, 0.8]); SFX.squish(sz); }
  if (src === 'tug') return;
  // score, salvage
  if (byPlayer) scoreKill(e, src);
  if (K.gems) spawnGems(W, vel, K.gems, K.gemVal, K.gemCol || [1, 0.85, 0.35], K.kit && rnd() < K.kit);
  if (K.split) { const n = ri(K.nsplit[0], K.nsplit[1]); for (let i = 0; i < n; i++) splitChild(e, K.split, i, n); }
  if (K.release) { const p = spawnE(K.release, { space: e.space, rp: e.rp.slice(), rv: vadd(e.rv, [rr(-2, 2), rr(-1, 1), 0]), wp: W.slice(), wv: vel.slice(), spin: 0.4 }); p.flash = 1; }
  if (K.blast) { for (const o of ENTS) if (o !== e && o.alive && !o.K.boss && vdist(o.W, W) < K.blast + o.r) { setTimeoutSim(0.08 + vdist(o.W, W) * 0.004, () => { if (o.alive) { o.chainBlast = true; damageE(o, 99, { kind: 'blast', volley: src && src.volley }); } }); } G.stats.cores++; }
  if (e.critters) for (const m of e.critters) if (m.alive && m.space === 'host') leap(m);
  if (K.boss && BOSS.onKill) BOSS.onKill(e);
}
function splitChild(e, kind, i, n) {
  const a = (i / n) * TAU + rnd(), out = [Math.cos(a), Math.sin(a) * 0.8, rr(-0.3, 0.3)];
  const sp = rr(5, 11), o = { space: e.space, spin: rr(0.5, 2) };
  if (e.space === 'rail') { o.rp = [e.rp[0] + out[0] * e.r * 0.4, e.rp[1] + out[1] * e.r * 0.4, e.rp[2] + out[2] * e.r * 0.4]; o.rv = [e.rv[0] * 0.5 + out[0] * sp, e.rv[1] * 0.5 + out[1] * sp, e.rv[2] + out[2] * sp]; }
  else { o.wp = vmad(e.W, out, e.r * 0.4); o.wv = vmad(e.vel, out, sp); }
  const c = spawnE(kind, o); c.flash = 0.6;
}
// tiny sim-time scheduler (works in step() tests)
const TIMERS = [];
function setTimeoutSim(dt, fn) { TIMERS.push({ t: G.t + dt, fn }); }
function runTimers() { for (let i = TIMERS.length - 1; i >= 0; i--) if (G.t >= TIMERS[i].t) { const f = TIMERS[i].fn; TIMERS.splice(i, 1); f(); } }
// draw all entities into the instance batch
function drawEntities() {
  for (const e of ENTS) {
    if (!e.alive || e.hidden) continue;
    let tpl = e.tpl;
    if (e.K.critter) tpl = TPL[(Math.floor((G.t + e.seed) * 12) % 2) ? 'mite1' : 'mite0'];
    let s = e.scale; if (e.squash) s = [e.scale, e.scale * e.squash, e.scale];
    const fl = Math.max(e.flash, e.lockFlash || 0);
    let em = e.emis; if (e.kind === 'pod') em = (Math.floor(G.t * 2 + e.seed) % 2) ? 3 : 0.2; if (e.kind === 'core') em = 2.5 + Math.sin(G.t * 6 + e.seed) * 1.2 + (e.flash > 0 ? 3 : 0);
    if (e.kind === 'node') em = e.glow ?? 3; if (e.kind === 'glob') em = 4; if (e.kind === 'bcore') em = 5 + Math.sin(G.t * 8) * 2;
    inst(tpl, e.W, e.q, s, e.col, e.mat, em, fl, e.seed, e.special);
  }
  for (const d of DEBRIS) inst(d.tpl, d.p, d.q, d.s * Math.min(1, d.life / (d.max * 0.3)), d.col, d.mat, 1, 0, 0, 0.7);
  for (const k of PICKS) {
    if (k.kit) inst('kit', k.p, k.q, 0.9, [1, 1, 1], 2, 3, 0, 0, 0);
    else inst('gem', k.p, k.q, 0.75, k.col, 4, 5);
    sprite(k.p, null, k.kit ? 2.2 : 1.4, k.kit ? 2.2 : 1.4, k.col, 0.7, 0);
  }
}
