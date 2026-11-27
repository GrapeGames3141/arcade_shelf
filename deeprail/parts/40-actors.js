// ===== Creatures and hazards: bats, cave spiders, burrowers, collapsing scaffolds, falling rock, webs, the Sleeper =====
const ENEMIES = [];
const GRAV = 12;
function camAhead(d) { return V.madd(G.cam.p, G.cam.f, d); }
function cartFuture(t) { const s = G.cart.s + G.cart.speed * t, seg = G.cart.seg; const f = seg.at(Math.min(s, seg.len)); return V.madd(f.p, f.U, 1.4); }

// ---------- spawners ----------
function spawnSwarm(seg, s, n, flee) {
  const f = seg.at(Math.min(s, seg.len)), pr = seg.prof(Math.min(s, seg.len)), src = V.madd(f.p, f.U, pr.cy + .6);
  for (let i = 0; i < n; i++) {
    const p = V.add(src, [rnd.range(-2.5, 2.5), rnd.range(-1, 1.5), rnd.range(-2.5, 2.5)]);
    ENEMIES.push({ type: 'bat', p, v: [0, 0, 0], hp: 1, alive: true, t: rnd() * 3, ox: rnd.range(-1.5, 1.5), oy: rnd.range(-.35, .9), dist: V.dist(p, G.cam.p),
      rate: rnd.range(4, 6.5), atk: 0, flee: !!flee, mode: 'fly', hitR: .42, score: 100, dmg: 6, stun: 0, scare: 0, life: 0 });
  }
  SND.bats(n);
}
function spawnBatAt(p, k) { for (let i = 0; i < k; i++) ENEMIES.push({ type: 'bat', p: V.add(p, [rnd.range(-.4, .4), rnd.range(-.3, .3), rnd.range(-.4, .4)]), v: [0, 0, 0], hp: 1, alive: true, t: rnd() * 3, ox: rnd.range(-1.4, 1.4), oy: rnd.range(-.3, .8), dist: V.dist(p, G.cam.p), rate: rnd.range(4.5, 6.5), atk: 0, mode: 'fly', hitR: .42, score: 100, dmg: 6, stun: 0, scare: 0, life: 0 }); SND.bats(k); }
function spawnSpider(p, n, mode) {
  ENEMIES.push({ type: 'spider', p: V.copy(p), v: [0, 0, 0], n: n || [0, -1, 0], hp: 3, alive: true, t: 0, mode: mode || 'crawl', anchor: V.copy(p), hang: 0, hitR: .62, score: 250, dmg: 12, legT: rnd() * 6, stun: 0 });
  SND.hiss(p);
}
function spawnDropper(seg, s, side) {
  const w = wallAt(seg, s, 90 + side * 14, .1);
  const e = { type: 'spider', p: V.copy(w.p), v: [0, 0, 0], n: [0, -1, 0], hp: 3, alive: true, t: 0, mode: 'drop', anchor: V.copy(w.p), hangY: seg.at(s).p[1] + 1.9, hitR: .62, score: 250, dmg: 12, legT: rnd() * 6, stun: 0 };
  ENEMIES.push(e); SND.hiss(w.p);
}
function spawnBurrower(p, n) {
  ENEMIES.push({ type: 'burrower', p: V.copy(p), from: V.copy(p), n: V.norm(n), v: V.scl(V.norm(n), 6), hp: 7, alive: true, t: 0, mode: 'emerge', trail: [V.copy(p)], hitR: .7, score: 400, dmg: 15, stun: 0 });
  FX.debris(p, 18, [.4, .33, .26], .16, 6); FX.smoke(p, 8, .5); SND.rumble(p); G.shake = Math.max(G.shake, .25);
  if (p[1] < (waterAt(p) || -1e9) + .6) FX.splash(p, 30);
}
function spawnBeam(seg, s, side) {
  const f = seg.at(s), pr = seg.prof(s), base = V.add(f.p, V.add(V.scl(f.R, side * (pr.rx * .66)), V.scl(f.U, Math.max(pr.fl, floorBelow(f.p) - f.p[1]))));
  const top = V.add(f.p, V.add(V.scl(f.R, side * (pr.rx * .66)), V.scl(f.U, 3.3)));
  ENEMIES.push({ type: 'beam', seg: seg.id, s, side, f, base, top, p: V.copy(top), ang: 0, av: 0, hp: 4, alive: true, t: 0, hitR: .5, score: 150, dmg: 15, len: 4.6, falling: false });
  SND.creak(top);
}
function spawnRock(seg, s, x, big, look) {
  const f = seg.at(Math.min(s, seg.len)), c = V.madd(f.p, f.R, x || 0);
  const up = rayWall(V.madd(c, f.U, 1.2), [0, 1, 0], 30, .4), p = V.add(c, [0, Math.max(2.6, 1.2 + up - .6), 0]);
  ENEMIES.push({ type: 'rock', p, v: [0, -1, 0], r: big ? .78 : .52, hp: big ? 5 : 3, big, alive: true, t: 0, seg: seg.id, s, x: x || 0, landed: false, hitR: big ? .9 : .62, score: big ? 160 : 120, dmg: big ? 16 : 12, spin: rnd() * TAU, look: look || 'rock' });
  FX.debris(V.add(p, [0, .3, 0]), 8, [.35, .3, .25], .08, 1.5); SND.crumble(p);
}
function spawnThrow(from, to, t) {
  const v = V.scl(V.sub(V.sub(to, from), [0, -.5 * GRAV * t * t, 0]), 1 / t);
  ENEMIES.push({ type: 'rock', p: V.copy(from), v, r: .95, hp: 3, big: false, alive: true, t: 0, thrown: true, flight: t, hitR: 1.15, score: 150, dmg: 10, spin: rnd() * TAU, look: 'rock', landed: false });
}

// ---------- shared ----------
function enemyHit(e, dmg, pt, part) {
  if (!e.alive) return;
  const lit = isLit(e.p) ? 2 : 1;
  e.hp -= dmg * lit; e.flash = .12;
  if (e.type === 'beam' || e.type === 'rock') FX.sparks(pt, 6, [1, .7, .35], 5); else FX.goo(pt, 5, e.type === 'spider' ? [.5, .75, .2] : [.6, .35, .3]);
  SND.hitFlesh(e.type);
  if (e.hp <= 0) killEnemy(e, pt);
}
function killEnemy(e, pt) {
  e.alive = false;
  const lit = isLit(e.p);
  if (e.type === 'bat') { FX.debris(e.p, 6, [.18, .13, .1], .05, 3); FX.goo(e.p, 6, [.55, .25, .2]); e.dead = 1.5; }
  else if (e.type === 'spider') { e.mode = 'dead'; e.v = [e.v[0] * .3, 1.5, e.v[2] * .3]; FX.goo(e.p, 14, [.5, .8, .2]); e.dead = 3; SND.squish(); }
  else if (e.type === 'burrower') { e.mode = 'dead'; FX.goo(e.p, 20, [.75, .35, .25]); FX.debris(e.p, 10, [.4, .3, .28], .12, 4); e.dead = 2.5; SND.squish(); }
  else if (e.type === 'beam') { FX.splinters(V.lerp(e.top, beamEnd(e), .5), 22); SND.splinter(); e.dead = 0; }
  else if (e.type === 'rock') {
    FX.debris(e.p, e.big ? 22 : 14, e.look === 'crystal' ? [.5, .4, .7] : [.4, .34, .28], e.big ? .2 : .14, 5); FX.smoke(e.p, 6, .7); SND.rockBreak();
    if (e.look === 'crystal') FX.sparks(e.p, 18, [.6, .5, 1], 6);
    if (e.big) for (const sd of [-1, 1]) { const f = G.cam; const d = V.norm(V.add(V.scl(f.r, sd), [0, .6, 0])); ENEMIES.push({ type: 'rock', p: V.madd(e.p, d, .4), v: V.add(V.scl(d, 6), G.cartVel), r: .38, hp: 1, big: false, alive: true, t: 0, harmless: true, hitR: .5, score: 50, dmg: 0, spin: rnd() * TAU, look: e.look, landed: false }); }
    e.dead = 0;
  }
  scoreAdd(e.score, e.p, lit ? 'LIT x2 DMG' : null);
  G.stats.kills++;
}
function beamEnd(e) {
  const f = e.f, a = e.ang, dir = V.add(V.scl(f.U, Math.cos(a)), V.scl(f.R, -e.side * Math.sin(a)));
  return V.madd(e.top, dir, e.len);
}

// ---------- update ----------
function updateEnemies(dt) {
  for (let i = ENEMIES.length - 1; i >= 0; i--) {
    const e = ENEMIES[i]; e.t += dt; if (e.flash) e.flash = Math.max(0, e.flash - dt);
    if (!e.alive) { e.dead -= dt; if (e.type === 'spider' || e.type === 'burrower' || e.type === 'bat') { e.v[1] -= GRAV * dt; e.p = V.madd(e.p, e.v, dt); } if (e.dead <= 0) ENEMIES.splice(i, 1); continue; }
    UPD[e.type](e, dt);
    if (e.remove) ENEMIES.splice(i, 1);
  }
}
const UPD = {
  bat(e, dt) {
    e.life += dt;
    const C = G.cam, dz = V.dot(V.sub(e.p, C.p), C.f);
    if (dz < -4 || e.life > 40) { e.remove = true; return; }
    if (e.stun > 0) { e.stun -= dt; e.v[1] -= 9 * dt; e.v = V.scl(e.v, Math.exp(-1.5 * dt)); e.p = V.madd(e.p, e.v, dt); return; }
    if (dazzleAt(e.p)) { e.stun = 1.2; e.v = [rnd.range(-1, 1), 1, rnd.range(-1, 1)]; return; }
    let goal;
    if (e.flee) { goal = V.add(V.madd(C.p, C.f, -8), V.add(V.scl(C.r, e.ox * 2), V.scl(C.u, e.oy + 1.5))); }
    else {
      e.dist = Math.max(e.mode === 'atk' ? 0 : 3.4, e.dist - e.rate * dt);
      const sw = Math.sin(e.t * 2.3 + e.ox) * .55, sw2 = Math.cos(e.t * 1.7 + e.oy * 3) * .35;
      goal = V.add(V.madd(C.p, C.f, e.dist), V.add(V.scl(C.r, e.ox + sw), V.scl(C.u, e.oy + sw2)));
      if (e.mode === 'fly' && e.dist <= 3.4) { e.atk += dt; if (e.atk > .3 + (e.ox + 1.5) * .3) { e.mode = 'atk'; SND.batSqueak(e.p); } }
      if (e.mode === 'atk') goal = V.add(C.p, V.scl(C.u, -.1));
      if (isLit(e.p) && e.mode !== 'atk') { e.scare = .7; }
      if (e.scare > 0) { e.scare -= dt; goal = V.add(goal, V.add(V.scl(C.u, 2.5), V.scl(C.r, e.ox > 0 ? 3 : -3))); e.dist += dt * 3; }
    }
    const w = e.mode === 'atk' ? 5.2 : 3.4;
    const acc = V.sub(V.scl(V.sub(goal, e.p), w * w), V.scl(V.sub(e.v, G.cartVel), 2 * w * .8));
    acc[1] += Math.sin(e.t * 13) * 6;
    e.v = V.madd(e.v, acc, dt);
    const rel = V.sub(e.v, G.cartVel), sp = V.len(rel); if (sp > 16) e.v = V.add(G.cartVel, V.scl(rel, 16 / sp));
    e.p = V.madd(e.p, e.v, dt);
    if (!e.flee && V.dist(e.p, C.p) < .75) { hurt(e.dmg, e.p, 'bat'); e.alive = false; e.dead = .01; e.remove = true; FX.debris(e.p, 4, [.2, .15, .1], .04, 2); }
  },
  spider(e, dt) {
    const C = G.cam, d = V.dist(e.p, C.p);
    e.legT += dt * (e.mode === 'crawl' ? 9 : 2);
    if (e.stun > 0) e.stun -= dt;
    if (dazzleAt(e.p) && e.mode !== 'leap' && e.stun <= 0) { e.stun = 1.5; SND.hiss(e.p); }
    if (e.mode === 'drop') {
      e.p[1] = Math.max(e.hangY, e.p[1] - 5 * dt); if (e.p[1] <= e.hangY + .01) e.mode = 'hang';
    } else if (e.mode === 'hang') {
      e.p[0] = e.anchor[0] + Math.sin(e.t * 1.7) * .25; e.p[2] = e.anchor[2] + Math.cos(e.t * 1.3) * .25;
      const dz = V.dot(V.sub(e.p, C.p), C.f);
      if (dz < 10 && dz > 1.5 && e.stun <= 0) startLeap(e);
      if (dz < -3) e.remove = true;
    } else if (e.mode === 'crawl') {
      // crawl over the wall toward a point beside the track ahead of the cart, then leap
      const tgt = cartFuture(1.2), to = V.sub(tgt, e.p), dl = V.len(to);
      if (e.stun <= 0) e.p = V.madd(e.p, to, Math.min(1, 4.4 * dt / Math.max(dl, .1)));
      const dz = V.dot(V.sub(e.p, C.p), C.f);
      if (((dl < 6.5 && dz > 1.5) || e.t > 5) && e.stun <= 0) startLeap(e);
      if (dz < -3) e.remove = true;
    } else if (e.mode === 'leap') {
      e.v[1] -= GRAV * dt; e.p = V.madd(e.p, e.v, dt);
      if (d < 1.0) { hurt(e.dmg, e.p, 'spider'); e.alive = false; e.dead = 1; e.mode = 'dead'; e.v = V.add(G.cartVel, [0, 2, 0]); }
      if (e.t > 3 || V.dot(V.sub(e.p, C.p), C.f) < -2) e.remove = true;
    }
  },
  burrower(e, dt) {
    const C = G.cam;
    if (e.stun > 0) e.stun -= dt;
    if (dazzleAt(e.p) && e.stun <= 0 && e.mode !== 'lunge') { e.stun = 1.2; SND.rumble(e.p); }
    if (e.mode === 'emerge') {
      e.p = V.madd(e.from, e.n, Math.min(2.2, e.t * 3.2));
      if (e.t > .7) { e.mode = 'arc'; e.t = 0; }
    } else if (e.mode === 'arc') {
      const tgt = V.add(cartFuture(.9), [0, .2, 0]), to = V.sub(tgt, e.p), dl = V.len(to);
      const sp = e.stun > 0 ? 1 : 7;
      e.v = V.add(V.scl(e.v, Math.exp(-3 * dt)), V.scl(to, sp * dt * 3 / Math.max(dl, .5)));
      const vs = V.len(e.v); if (vs > sp) e.v = V.scl(e.v, sp / vs);
      e.p = V.madd(e.p, V.add(e.v, V.scl(G.cartVel, .85)), dt);
      if (dl < 5 && e.stun <= 0) { e.mode = 'lunge'; e.t = 0; SND.roarSmall(e.p); }
      if (V.dot(V.sub(e.p, C.p), C.f) < -2 || e.t > 6) { e.mode = 'retreat'; e.t = 0; }
    } else if (e.mode === 'lunge') {
      const to = V.sub(C.p, e.p), dl = V.len(to);
      e.p = V.madd(e.p, V.add(V.scl(to, 14 / Math.max(dl, .1)), G.cartVel), dt);
      if (dl < 1.1) { hurt(e.dmg, e.p, 'burrower'); e.mode = 'retreat'; e.t = 0; G.shake = .6; }
      if (e.t > 1.2) { e.mode = 'retreat'; e.t = 0; }
    } else if (e.mode === 'retreat') {
      e.p = V.madd(e.p, [0, -4 * dt, 0], 1); if (e.t > 1.6) e.remove = true;
    }
    const last = e.trail[e.trail.length - 1]; if (V.dist(last, e.p) > .3) { e.trail.push(V.copy(e.p)); if (e.trail.length > 40) e.trail.shift(); }
  },
  beam(e, dt) {
    e.p = V.lerp(e.top, beamEnd(e), .5);
    const dz = G.cart.seg.id === e.seg ? e.s - G.cart.s : 99;
    if (!e.falling && e.t > .9) { e.falling = true; SND.creak(e.top, true); }
    if (e.falling) { e.av += (2.4 + Math.sin(e.ang) * 7) * dt; e.ang = Math.min(1.72, e.ang + e.av * dt); if (e.ang >= 1.72 && !e.landed) { e.landed = true; FX.debris(beamEnd(e), 10, [.35, .25, .15], .08, 3); G.shake = Math.max(G.shake, .3); SND.thud(beamEnd(e)); } }
    if (dz < .6 && dz > -1) {
      if (e.ang > .95) { hurt(e.dmg, V.lerp(e.top, beamEnd(e), .6), 'beam'); FX.splinters(V.lerp(e.top, beamEnd(e), .6), 26); SND.splinter(); G.shake = .8; e.alive = false; e.dead = 0; G.stats.crashes++; }
    }
    if (dz < -4) e.remove = true;
  },
  rock(e, dt) {
    e.spin += dt * 2;
    if (e.thrown) {
      e.v[1] -= GRAV * dt; e.p = V.madd(e.p, e.v, dt);
      if (V.dist(e.p, G.cam.p) < 1.6) { hurt(e.dmg, e.p, 'throw'); e.alive = false; e.dead = 0; e.remove = true; FX.debris(e.p, 16, [.35, .3, .26], .16, 5); G.shake = .9; SND.rockBreak(); return; }
      if (e.t > e.flight + 1.2) e.remove = true;
      return;
    }
    if (e.harmless) { e.v[1] -= GRAV * dt; e.p = V.madd(e.p, e.v, dt); if (e.t > 2.5) e.remove = true; return; }
    if (!e.landed) {
      e.v[1] -= GRAV * dt; e.p = V.madd(e.p, e.v, dt);
      const seg = TRACK.segs[e.seg], f = seg.at(e.s), gy = f.p[1] + e.r * .8;
      if (e.p[1] <= gy) { e.p[1] = gy; e.landed = true; e.v = [0, 0, 0]; FX.debris(e.p, 10, [.38, .32, .26], .1, 3); FX.smoke(e.p, 6, .8); G.shake = Math.max(G.shake, .35); SND.thud(e.p); }
    }
    const dz = G.cart.seg.id === e.seg ? e.s - G.cart.s : 99;
    if (dz < .9 && dz > -1 && Math.abs(e.x) < 1.3 && e.p[1] < G.cart.p[1] + 1.8) { hurt(e.dmg, e.p, 'rock'); FX.debris(e.p, 18, [.38, .32, .26], .14, 5); SND.rockBreak(); G.shake = .9; e.alive = false; e.dead = 0; e.remove = true; G.stats.crashes++; }
    if (dz < -4) e.remove = true;
  },
};
function startLeap(e) {
  const t = .72, tgt = V.add(cartFuture(t), [0, -.15, 0]);
  e.v = V.scl(V.sub(V.sub(tgt, e.p), [0, -.5 * GRAV * t * t, 0]), 1 / t); e.mode = 'leap'; e.t = 0; SND.hiss(e.p, true);
}

// ---------- hit spheres for the hitscan gun ----------
function enemySpheres(e, out) {
  if (!e.alive) return;
  if (e.type === 'beam') { const a = e.top, b = beamEnd(e); for (let k = 0; k <= 4; k++) out.push({ c: V.lerp(a, b, k / 4), r: .42, e }); return; }
  if (e.type === 'burrower') { out.push({ c: e.p, r: .8, e, crit: true }); const n = e.trail.length; for (let k = 1; k <= 3 && n - 1 - k * 3 >= 0; k++) out.push({ c: e.trail[n - 1 - k * 3], r: .55, e }); return; }
  out.push({ c: e.p, r: e.hitR, e });
}

// ---------- drawing ----------
function drawEnemies(B, GL) {
  for (const e of ENEMIES) {
    if (V.dist2(e.p || e.top, G.cam.p) > 95 * 95) continue;
    DRW[e.type](e, B, GL);
  }
}
const DRW = {
  bat(e, B, GL) {
    const fw = V.len(e.v) > .5 ? V.norm(V.sub(e.v, V.scl(G.cartVel, .7))) : G.cam.f;
    const F = frameLook(e.p, V.len(fw) > .1 ? fw : [0, 0, 1], [0, 1, 0]);
    const fl = e.alive ? Math.sin(e.t * 26) * .9 : .4, fc = e.flash ? [1.5, 1.5, 1.5] : [.012, .009, .008], k = 1.45;
    const body = [.3, .22, .17, .75];
    B.sph.add(F, .085 * k, .075 * k, .14 * k, body, fc); B.sph.add(fmove(F, 0, .03 * k, .12 * k), .06 * k, .055 * k, .06 * k, body, fc);
    for (const sd of [-1, 1]) {
      B.cone.add(frot(fmove(F, sd * .03 * k, .07 * k, .13 * k), 'z', -sd * .3), .018 * k, .06 * k, .018 * k, body);
      let W = frot(fmove(F, sd * .05 * k, .02 * k, .02 * k), 'z', sd * fl); if (sd < 0) W = { p: W.p, x: V.scl(W.x, -1), y: W.y, z: W.z };
      B.wing.add(W, .42 * k, 1, .5 * k, [.24, .17, .14, 0], fc);
    }
    if (e.alive) for (const sd of [-1, 1]) GL.add(fpt(F, sd * .028 * k, .05 * k, .17 * k), .032, 5, .8, .35, 3);
  },
  spider(e, B, GL) {
    const C = G.cam, to = V.sub(C.p, e.p);
    let up = e.mode === 'crawl' ? e.n : [0, 1, 0]; if (e.mode === 'drop' || e.mode === 'hang') up = [0, 1, 0];
    const F0 = frameLook(e.p, V.len(to) > .1 ? to : [0, 0, 1], up);
    const F = e.mode === 'dead' ? frot(F0, 'z', Math.PI * .9) : F0;
    const col = [.33, .26, .19, .75], dark = [.16, .12, .1, .75], fc = e.flash ? [1.4, 1.4, 1.4] : null;
    if (e.mode === 'drop' || e.mode === 'hang') B.box.addSeg(e.anchor, V.add(e.p, [0, .2, 0]), .006, [.8, .8, .75, 0], [.05, .05, .05]);
    B.sph.add(fmove(F, 0, .12, -.33), .27, .22, .33, col, fc);
    B.sph.add(fmove(F, 0, .12, -.31), .2, .16, .25, [.42, .3, .14, .75], fc);
    B.sph.add(fmove(F, 0, .1, .02), .17, .13, .2, dark, fc);
    const curl = e.mode === 'dead' ? 1 : e.mode === 'leap' ? .6 : 0;
    for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) {
      const ph = e.legT + k * 1.3 + (sd > 0 ? Math.PI : 0), lift = Math.max(0, Math.sin(ph)) * .14;
      const zA = .12 - k * .1, a = fpt(F, sd * .1, .12, zA), ang = (-.9 + k * .55) + Math.cos(ph) * .15;
      const kn = fpt(F, sd * (.42 - curl * .2), .42 - curl * .1 + lift, zA + Math.sin(ang) * .35);
      const ft = fpt(F, sd * (.75 - curl * .45), -.06 + curl * .25 + lift * .5, zA + Math.sin(ang) * .62);
      B.leg.addSeg(a, kn, .035, dark, null, F.y); B.leg.addSeg(kn, ft, .028, col, null, F.y);
    }
    if (e.alive) for (const [x, y] of [[-.05, .18], [.05, .18], [-.1, .15], [.1, .15], [-.03, .22], [.03, .22]]) GL.add(fpt(F, x, y - .02, .21), .018, .6, 2.6, .5, 3);
  },
  burrower(e, B, GL) {
    const n = e.trail.length, fc = e.flash ? [1.4, 1.4, 1.4] : null, skin = [.45, .34, .32, .75];
    for (let k = 0; k < 9; k++) {
      const idx = n - 1 - k * 2; if (idx < 0) break;
      const r = .62 - k * .045, P = k === 0 ? e.p : e.trail[idx];
      B.sph.add({ p: P, x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, r, r * .92, r, skin, fc);
      if (k > 0 && k % 2 === 0) B.sph.add({ p: V.add(P, [0, r * .55, 0]), x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, r * .7, r * .35, r * .7, [.3, .25, .22, .25]);
    }
    const dir = e.mode === 'lunge' || e.mode === 'arc' ? V.norm(V.sub(G.cam.p, e.p)) : e.n;
    const H = frameLook(e.p, dir, [0, 1, 0]);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; B.cone.add(frot(fmove(H, Math.cos(a) * .42, Math.sin(a) * .42, .45), 'x', Math.PI / 2), .07, .3, .07, [.85, .8, .7, .75]); }
    B.sph.add(fmove(H, 0, 0, .5), .32, .32, .1, [.2, .02, .02, 0], [2.4, .5, .15]);
    if (e.alive) { GL.add(fpt(H, 0, 0, .62), .55, 2.2, .6, .2, 0); for (const [x, y] of [[-.3, .38], [.3, .38], [-.18, .5], [.18, .5]]) GL.add(fpt(H, x, y, .42), .03, 3, 2, .3, 3); }
  },
  beam(e, B) {
    const f = e.f, F = { p: e.base, x: f.R, y: f.U, z: f.T };
    for (const dz of [-.9, .9]) sSegDyn(B.box, V.madd(e.base, f.T, dz), V.madd(e.top, f.T, dz * .8), .15, WOOD_D);
    for (let y = .8; y < 3.2; y += 1.1) B.box.add(fmove({ p: e.base, x: f.R, y: f.U, z: f.T }, 0, y, 0), .12, .12, 1.9, WOOD_D);
    const end = beamEnd(e), col = e.flash ? [.9, .7, .5, .25] : [.4, .28, .17, .25];
    B.box.addSeg(e.top, end, .2, col, e.flash ? [.6, .4, .2] : null, f.T, .26);
    B.box.addSeg(V.lerp(e.top, end, .2), V.madd(V.lerp(e.top, end, .2), f.T, .01), .02, col);
  },
  rock(e, B) {
    const F = frot(frot({ p: e.p, x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, 'y', e.spin), 'x', e.spin * .7), fc = e.flash ? [1.2, 1.1, 1] : null;
    if (e.look === 'crystal') {
      const c = [.55, .4, .85, 1]; for (let k = 0; k < 4; k++) B.shard.add(frot(frot(F, 'z', k * 1.6), 'x', k * .9), e.r * .4, e.r * 1.6, e.r * .4, c, fc || [.25, .18, .45]);
      return;
    }
    const col = [.34, .3, .27, 0];
    B.sph.add(F, e.r, e.r * .82, e.r * .92, col, fc); B.sph.add(fmove(F, e.r * .35, e.r * .25, 0), e.r * .6, e.r * .55, e.r * .6, [.3, .27, .24, 0], fc);
    B.sph.add(fmove(F, -e.r * .3, -e.r * .1, e.r * .3), e.r * .55, e.r * .5, e.r * .6, [.37, .33, .29, 0], fc);
  },
};
function sSegDyn(b, a, c, r, col) { b.addSeg(a, c, r, col, null, null, r); }

// ======================= THE SLEEPER (end-of-level creature) =======================
const BOSS = { state: 'off' }, BOSS_HEAD = [2.5, 1.9, 3.1];
function bossInit() {
  const lp = TRACK.segs.loop, ch = TRACK.chambers.find(c => c.boss);
  Object.assign(BOSS, { state: 'sleep', t: 0, C: [lp.center[0], ch.floor, lp.center[2]], rise: 0, yaw: 0, head: [lp.center[0], ch.floor + 2, lp.center[2]], jaw: 0, atkCD: 3, atk: null, lid: 0, dazzle: 0, dazzleCD: 0,
    eyes: [], hp: 0, stagger: 0, interrupt: 0, sink: 0, roarT: 0, fwd: [0, 0, 1], wakeT: 0 });
  for (let i = 0; i < 8; i++) {
    const sd = i % 2 ? 1 : -1, k = i >> 1, ph = sd * (.32 + k * .3), th = .44 - k * .1, d = [Math.sin(ph) * Math.cos(th), Math.sin(th), Math.cos(ph) * Math.cos(th)];
    const t = 1 / Math.hypot(d[0] / BOSS_HEAD[0], d[1] / BOSS_HEAD[1], d[2] / BOSS_HEAD[2]);
    BOSS.eyes.push({ sd, k, hp: 9, alive: true, off: [d[0] * t * 1.02, d[1] * t * 1.02, d[2] * t * 1.02], open: 0 });
  }
}
function bossWake() { if (BOSS.state !== 'sleep') return; BOSS.state = 'wake'; BOSS.t = 0; SND.roar(1.2); banner('THE SLEEPER WAKES — SHOOT ITS EYES', 3.6, true); G.shake = 1; }
function bossHeadFrame() {
  const B = BOSS, F = frameLook(B.head, B.fwd, [0, 1, 0]);
  return F;
}
function bossEyePos(e) { const F = bossHeadFrame(); return fpt(F, e.off[0], e.off[1], e.off[2]); }
function updateBoss(dt) {
  const B = BOSS; if (B.state === 'off' || B.state === 'gone') return;
  B.t += dt; B.atkCD -= dt; B.lid = Math.max(0, B.lid - dt); B.dazzle = Math.max(0, B.dazzle - dt); B.dazzleCD = Math.max(0, B.dazzleCD - dt); B.stagger = Math.max(0, B.stagger - dt);
  const cart = G.cam.p, toCart = V.sub(cart, B.C); toCart[1] = 0; const dirH = V.norm(toCart);
  let reach = 8.5, hgt = 13.2, lean = 0;
  if (B.state === 'sleep') { B.rise = 0; }
  else if (B.state === 'wake') { B.rise = smooth(0, 4.5, B.t); for (const e of B.eyes) e.open = smooth(1 + e.k * .5 + (e.sd > 0 ? .2 : 0), 1.6 + e.k * .5, B.t); if (B.t > 5) { B.state = 'fight'; B.t = 0; B.atkCD = 2.5; } }
  else if (B.state === 'fight') {
    B.rise = 1;
    for (const e of B.eyes) e.open = lerp(e.open, B.lid > 0 ? 0 : (B.dazzle > 0 ? 1.25 : 1), 1 - Math.exp(-10 * dt));
    if (dazzleAt(B.head, 12) && B.dazzleCD <= 0 && B.dazzle <= 0) { B.dazzle = 3.6; B.dazzleCD = 5; B.atk = null; SND.roar(.6); popup(B.head, 'DAZZLED!', [1, .8, .4]); }
    const nLit = LV.lamps.filter(l => l.kind === 'brazier' && l.lit).length;
    if (B.atk) {
      const A = B.atk; A.t += dt;
      if (A.kind === 'lunge') {
        if (A.t < 2) { lean = -2 * smooth(0, 2, A.t); B.jaw = smooth(0, 1.5, A.t); if (B.interrupt >= 4) { B.atk = null; B.stagger = 1.4; B.interrupt = 0; scoreAdd(250, B.head, 'INTERRUPTED'); SND.roar(.5); } }
        else if (A.t < 2.35) { lean = lerp(-2, 1, smooth(2, 2.35, A.t)); const d = V.dist(B.head, cart); if (d < 9 && !A.hit) { A.hit = true; hurt(12, B.head, 'lunge'); G.shake = 1.4; } }
        else if (A.t > 3.4) { B.atk = null; B.jaw = 0; }
      } else if (A.kind === 'throw') {
        if (A.t > .9 && !A.done) { A.done = true; const from = V.add(V.madd(B.C, dirH, 6), [0, 8, 0]); spawnThrow(from, cartFuture(2.3), 2.3); SND.thud(from); }
        if (A.two && A.t > 1.7 && !A.done2) { A.done2 = true; const from = V.add(V.madd(B.C, dirH, 6), [2, 9, 0]); spawnThrow(from, cartFuture(2.1), 2.1); }
        if (A.t > 2.2) B.atk = null;
      } else if (A.kind === 'bats') {
        B.jaw = smooth(0, .3, A.t) * (1 - smooth(1.2, 1.8, A.t));
        if (A.t > .5 && !A.done) { A.done = true; spawnBatAt(V.add(B.C, [0, 22, 0]), Math.max(4, 9 - (nLit >> 1))); }
        if (A.t > 1.8) B.atk = null;
      }
    } else if (B.dazzle <= 0 && B.stagger <= 0 && B.lid <= 0 && B.atkCD <= 0) {
      const alive = B.eyes.filter(e => e.alive).length, r = rnd();
      const kind = r < .38 ? 'throw' : r < .62 ? 'bats' : 'lunge';
      B.atk = { kind, t: 0, two: alive < 5 }; B.interrupt = 0;
      if (kind === 'lunge') { SND.roar(.8); popup(B.head, 'LUNGE! SHOOT THE EYES', [1, .5, .3]); }
      B.atkCD = (3.2 + alive * .25) * (1 + nLit * .06);
    }
    if (!B.atk) B.jaw = lerp(B.jaw, B.dazzle > 0 ? .5 : .1 + .1 * Math.sin(B.t * 2), 1 - Math.exp(-4 * dt));
    if (B.dazzle > 0) lean = Math.sin(B.t * 5) * .6 - .8;
    if (B.stagger > 0) lean = -1.5;
  } else if (B.state === 'dying') {
    B.sink = smooth(0, 4, B.t); B.jaw = .9; lean = Math.sin(B.t * 9) * .8;
    if (rnd() < dt * 6) { FX.debris(V.add(B.C, [rnd.range(-20, 20), 20, rnd.range(-20, 20)]), 8, [.35, .3, .26], .18, 2); }
    if (B.t > 4.2) { B.state = 'gone'; }
  }
  // head placement
  const want = V.add(V.add(B.C, V.scl(dirH, reach + lean)), [0, lerp(2, hgt, B.rise) - B.sink * 14, 0]);
  if (B.atk && B.atk.kind === 'lunge' && B.atk.t >= 2 && B.atk.t < 2.7) { const k = smooth(2, 2.35, B.atk.t) * (1 - smooth(2.4, 2.7, B.atk.t)); B.head = V.lerp(want, V.lerp(want, cart, .62), k); }
  else B.head = V.lerp(B.head, want, 1 - Math.exp(-3.5 * dt));
  const look = V.norm(V.sub(cart, B.head)); B.fwd = V.norm(V.lerp(B.fwd, look, 1 - Math.exp(-4 * dt)));
}
function bossEyeHit(e, dmg, pt) {
  const B = BOSS;
  if (B.state !== 'fight' || !e.alive) { FX.sparks(pt, 5, [1, .8, .5], 4); SND.ping(); return; }
  if (e.open < .4) { FX.sparks(pt, 6, [1, .8, .5], 4); SND.ping(); return; }
  const nLit = LV.lamps.filter(l => l.kind === 'brazier' && l.lit).length, k = B.dazzle > 0 ? 2 : nLit >= 4 ? 1.5 : 1; e.hp -= dmg * k; B.interrupt += dmg * k; e.flash = .1;
  FX.goo(pt, 6, [1, .7, .2]); SND.hitFlesh('boss');
  if (e.hp <= 0) {
    e.alive = false; FX.sparks(pt, 30, [1, .7, .2], 8); FX.goo(pt, 20, [1, .6, .2]); scoreAdd(500, pt, 'EYE!'); SND.roar(.9); B.lid = 1.4; B.atk = null; G.shake = .7;
    if (!B.eyes.some(x => x.alive)) { B.state = 'dying'; B.t = 0; G.bossDead = true; scoreAdd(5000, B.head, 'THE SLEEPER FALLS'); banner('THE SLEEPER FALLS — RIDE FOR THE DAYLIGHT!', 3.6, true); SND.roar(1.6); G.shake = 1.6; G.stats.boss = true; }
  }
}
function bossSpheres(out) {
  const B = BOSS; if (B.state === 'off' || B.state === 'gone' || B.state === 'sleep') return;
  const F = bossHeadFrame();
  for (const e of B.eyes) if (e.alive) out.push({ c: bossEyePos(e), r: .55, boss: e });
  out.push({ c: B.head, r: 3.2, bossArmor: true, ell: { F, R: BOSS_HEAD } });
  if (B.atk && B.atk.kind === 'lunge' && B.jaw > .3) out.push({ c: fpt(F, 0, -.9, 2.6), r: .9, bossMouth: true });
}
function drawBoss(B, GL) {
  const S = BOSS; if (S.state === 'off' || S.state === 'gone') return;
  const F = bossHeadFrame(), skin = [.5, .44, .41, .75], belly = [.62, .55, .5, .75], plate = [.24, .22, .21, .25], sk = [.02, .018, .017], bel = [.026, .022, .02];
  // neck/body as a curve of segments from the floor to the head
  const base = V.add(S.C, [0, 1 - S.sink * 6, 0]), c1 = V.add(base, [0, 9 * S.rise + 2, 0]), c2 = V.madd(S.head, F.z, -6), N = 12;
  let prev = null;
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = V.lerp(base, c1, t), b = V.lerp(c1, c2, t), c = V.lerp(c2, S.head, t), p = V.lerp(V.lerp(a, b, t), V.lerp(b, c, t), t);
    const r = lerp(3.4, 2.0, t);
    if (prev) {
      const fw = V.norm(V.sub(p, prev)), Fs = frameLook(p, fw, F.y);
      B.sph.add(Fs, r, r * .9, r * 1.1, skin, sk);
      B.sph.add(fmove(Fs, 0, -r * .35, 0), r * .82, r * .6, r * 1.05, belly, bel);
      if (i % 2 === 0) for (const sd of [-1, 0, 1]) B.cone.add(frot(fmove(Fs, sd * r * .45, r * .8, 0), 'z', -sd * .4), r * .22, r * .5, r * .22, plate);
      for (const sd of [-1, 1]) {   // rows of glowing sacs down its flanks
        const pu = S.state === 'dying' ? .2 : (.55 + .45 * Math.sin(S.t * 2.2 - i * .7)) * (.25 + .75 * S.rise), q = fpt(Fs, sd * r * .93, r * .12, 0);
        B.sph.add({ p: q, x: Fs.x, y: Fs.y, z: Fs.z }, r * .1, r * .13, r * .1, [.25, .7, .62, .75], [.25 * pu, 1.5 * pu, 1.2 * pu]);
        GL.add(q, r * .32, .1 * pu, .55 * pu, .45 * pu, 0);
      }
    }
    prev = p;
  }
  // forelimbs gripping the floor
  for (const sd of [-1, 1]) {
    const dirH = V.norm([F.z[0], 0, F.z[2]]), side = V.norm(V.cross([0, 1, 0], dirH));
    const sh = V.add(V.madd(V.madd(base, side, sd * 3.2), dirH, 1.5), [0, 3.5 * S.rise + 1, 0]);
    const hand = V.add(V.madd(V.madd(S.C, side, sd * 7.5), dirH, 6 + Math.sin(S.t * 1.3 + sd) * .5 * S.rise), [0, .4, 0]);
    const el = V.add(V.lerp(sh, hand, .5), V.scl(side, sd * 2.2));
    B.leg.addSeg(sh, el, 1.1, skin, sk); B.leg.addSeg(el, hand, .9, skin, sk);
    for (let k = -1; k <= 1; k++) { const cd = V.norm(V.add(dirH, V.scl(side, k * .5))); B.cone.add(frameLookUp(V.add(hand, V.scl(cd, .6)), cd), .28, 1.6, .28, [.8, .76, .66, .75]); }
  }
  // head: skull, snout, jaw with teeth, eyes and lids
  B.sph.add(F, 2.5, 1.9, 3.1, skin, sk);
  B.sph.add(fmove(F, 0, .3, 1.2), 2.1, 1.3, 2.6, skin, sk);
  for (const sd of [-1, 1]) B.cone.add(frot(fmove(F, sd * 1.5, 1.3, -1.4), 'x', -1.2), .45, 1.8, .45, plate);
  const J = frot(fmove(F, 0, -.9, -.4), 'x', S.jaw * .55);
  B.sph.add(fmove(J, 0, -.2, 1.9), 1.8, .65, 2.4, belly, bel);
  for (let k = 0; k < 7; k++) { const x = (k - 3) * .42; B.cone.add(fmove(J, x, .2, 3.4 - Math.abs(x) * .5), .12, .45, .12, [.9, .86, .76, .75]); B.cone.add({ ...fmove(F, x, -.6, 3.5 - Math.abs(x) * .5), y: V.scl(F.y, -1) }, .12, .4, .12, [.9, .86, .76, .75]); }
  if (S.jaw > .25) B.sph.add(fmove(F, 0, -1.1, 2.1), 1.2, .5, 1.3, [.15, .01, .01, 0], S.atk && S.atk.kind === 'lunge' ? [3, .6, .2] : [.4, .05, .02]);
  for (const e of S.eyes) {
    const p = fpt(F, e.off[0], e.off[1], e.off[2]), EF = { p, x: F.x, y: F.y, z: F.z };
    if (e.alive) {
      const o = clamp(e.open, 0, 1.3), glow = S.state === 'sleep' ? .05 : (e.flash ? 6 : 1.6 + (S.atk && S.atk.kind === 'lunge' ? 1.5 : 0) + (S.dazzle > 0 ? 1 : 0)) * o;
      B.sph.add(EF, .3, .3, .26, [.9, .6, .2, 1], [glow * 2, glow * 1.1, glow * .2]);
      B.sph.add(fmove(EF, 0, .05 + .26 * o, .03), .36, .36 * (1 - Math.min(1, o)) + .05, .3, skin, sk);
      if (o > .2) GL.add(V.madd(p, F.z, .25), .38 * o, 1.6 * glow * .3, .8 * glow * .3, .15 * glow * .3, 0);
    } else { B.sph.add(EF, .34, .34, .25, [.05, .02, .02, 0], [.4, .1, 0]); if (rnd() < .05) FX.goo(p, 1, [1, .6, .2]); }
  }
}
function frameLookUp(p, dir) { const y = V.norm(dir); let x = V.cross(y, [0, 0, 1]); if (V.len(x) < .01) x = V.cross(y, [1, 0, 0]); x = V.norm(x); return { p, x, y, z: V.cross(x, y) }; }
