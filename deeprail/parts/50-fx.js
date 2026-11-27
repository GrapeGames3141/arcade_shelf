// ===== Effects and light: particles, flares, flashes, tracers, the per-frame light list, "is this spot lit?" =====
const PMAX = 3000;
const P = { n: 0, x: new Float32Array(PMAX * 3), v: new Float32Array(PMAX * 3), life: new Float32Array(PMAX), max: new Float32Array(PMAX), size: new Float32Array(PMAX), col: new Float32Array(PMAX * 3), kind: new Uint8Array(PMAX), grav: new Float32Array(PMAX), drag: new Float32Array(PMAX) };
const FLARES = [], FLASHES = [], TRACERS = [];
// kinds: 0 spark streak (add), 1 ember dot (add), 2 smoke (alpha), 3 debris chunk (lit box), 4 goo droplet (lit sphere), 5 glint (add), 6 water droplet (add, dim)
function emit(p, v, life, size, col, kind, grav, drag) {
  let i = P.n < PMAX ? P.n++ : Math.floor(Math.random() * PMAX);
  P.x[i * 3] = p[0]; P.x[i * 3 + 1] = p[1]; P.x[i * 3 + 2] = p[2]; P.v[i * 3] = v[0]; P.v[i * 3 + 1] = v[1]; P.v[i * 3 + 2] = v[2];
  P.life[i] = life; P.max[i] = life; P.size[i] = size; P.col[i * 3] = col[0]; P.col[i * 3 + 1] = col[1]; P.col[i * 3 + 2] = col[2]; P.kind[i] = kind; P.grav[i] = grav; P.drag[i] = drag;
}
const rv = (s) => [(Math.random() - .5) * 2 * s, (Math.random() - .5) * 2 * s, (Math.random() - .5) * 2 * s];
const FX = {
  sparks(p, n, col, sp) { for (let i = 0; i < n; i++) { const v = V.add(rv(sp), [0, sp * .3, 0]); emit(p, v, .25 + Math.random() * .35, .012 + Math.random() * .01, [col[0] * 6, col[1] * 6, col[2] * 6], 0, 9, .8); } },
  embers(p, n, col, sp) { for (let i = 0; i < n; i++) emit(p, V.add(rv(sp), [0, sp, 0]), .6 + Math.random() * .8, .02 + Math.random() * .02, [col[0] * 4, col[1] * 4, col[2] * 4], 1, -1, 1.2); },
  smoke(p, n, sz) { for (let i = 0; i < n; i++) emit(V.add(p, rv(.3)), V.add(rv(.6), [0, .5, 0]), 1.2 + Math.random(), (sz || .6) * (.6 + Math.random() * .6), [.05, .045, .04], 2, -.3, 1.4); },
  debris(p, n, col, sz, sp) { for (let i = 0; i < n; i++) { const t = .75 + Math.random() * .5; emit(V.add(p, rv(.2)), V.add(rv(sp), [0, sp * .5, 0]), 1.2 + Math.random(), sz * (.4 + Math.random()), [col[0] * t, col[1] * t, col[2] * t], 3, GRAV, .3); } },
  splinters(p, n) { for (let i = 0; i < n; i++) emit(V.add(p, rv(.4)), V.add(rv(4), [0, 2, 0]), 1.2 + Math.random(), .1 + Math.random() * .12, [.42, .3, .18], 3, GRAV, .4); FX.smoke(p, 5, .6); },
  goo(p, n, col) { for (let i = 0; i < n; i++) emit(p, V.add(rv(2.4), [0, 1, 0]), .5 + Math.random() * .5, .03 + Math.random() * .04, col, 4, GRAV, .5); },
  splash(p, n) { for (let i = 0; i < n; i++) emit(p, V.add(rv(1.6), [0, 3 + Math.random() * 3, 0]), .8 + Math.random() * .5, .03 + Math.random() * .03, [.25, .4, .5], 6, GRAV, .2); },
  glints(p, n, col) { for (let i = 0; i < n; i++) emit(V.add(p, rv(.6)), rv(.6), .5 + Math.random() * .7, .03, [col[0] * 5, col[1] * 5, col[2] * 5], 5, -.2, 1); },
};
function updateParticles(dt) {
  for (let i = 0; i < P.n; i++) {
    P.life[i] -= dt;
    if (P.life[i] <= 0) { // swap-remove
      const j = --P.n; if (i !== j) { for (let k = 0; k < 3; k++) { P.x[i * 3 + k] = P.x[j * 3 + k]; P.v[i * 3 + k] = P.v[j * 3 + k]; P.col[i * 3 + k] = P.col[j * 3 + k]; } P.life[i] = P.life[j]; P.max[i] = P.max[j]; P.size[i] = P.size[j]; P.kind[i] = P.kind[j]; P.grav[i] = P.grav[j]; P.drag[i] = P.drag[j]; }
      i--; continue;
    }
    const d = Math.exp(-P.drag[i] * dt);
    P.v[i * 3] *= d; P.v[i * 3 + 1] = P.v[i * 3 + 1] * d - P.grav[i] * dt; P.v[i * 3 + 2] *= d;
    P.x[i * 3] += P.v[i * 3] * dt; P.x[i * 3 + 1] += P.v[i * 3 + 1] * dt; P.x[i * 3 + 2] += P.v[i * 3 + 2] * dt;
  }
}
function drawParticles(B, GL, SM) {
  const cp = G.cam.p;
  for (let i = 0; i < P.n; i++) {
    const p = [P.x[i * 3], P.x[i * 3 + 1], P.x[i * 3 + 2]]; if (V.dist2(p, cp) > 80 * 80) continue;
    const k = P.kind[i], a = P.life[i] / P.max[i], c = [P.col[i * 3], P.col[i * 3 + 1], P.col[i * 3 + 2]];
    if (k === 0) { const v = [P.v[i * 3], P.v[i * 3 + 1], P.v[i * 3 + 2]]; GL.add(p, P.size[i], c[0] * a, c[1] * a, c[2] * a, 1, V.madd(p, v, -.035)); }
    else if (k === 1 || k === 5) GL.add(p, P.size[i] * (k === 5 ? (.5 + .5 * Math.sin(P.life[i] * 20)) : 1), c[0] * a, c[1] * a, c[2] * a, 0);
    else if (k === 6) GL.add(p, P.size[i], c[0] * .3, c[1] * .3, c[2] * .3, 0);
    else if (k === 2) SM.add(p, P.size[i] * (1.6 - a * .6), c[0], c[1], c[2], 5, null, i);
    else if (k === 3) { const s = P.size[i], ang = P.life[i] * 7 + i; B.box.add(frot(frot({ p, x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, 'y', ang), 'x', ang * .7), s, s * .7, s * 1.2, [c[0], c[1], c[2], 0]); }
    else if (k === 4) { const s = P.size[i]; B.sph.add({ p, x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, s, s, s, [c[0], c[1], c[2], .75], [c[0] * .3, c[1] * .3, c[2] * .3]); }
  }
}

// ---------- flares ----------
const FLARE = { speed: 30, burn: 7.5, I: 55, range: 24, safe: 11, dazzle: 9 };
function launchFlare(from, aimPt) {
  const d = V.sub(aimPt, from), dist = Math.max(2, V.len(d)), dir = V.norm(d), t = dist / FLARE.speed;
  const v = V.add(V.scl(dir, FLARE.speed), [0, .5 * 7 * t, 0]);
  FLARES.push({ p: V.copy(from), v: V.add(v, V.scl(G.cartVel, .9)), state: 'fly', t: 0, I: 0 });
  SND.flareLaunch(); G.stats.flares++;
}
function updateFlares(dt) {
  for (let i = FLARES.length - 1; i >= 0; i--) {
    const f = FLARES[i]; f.t += dt;
    if (f.state === 'fly') {
      f.v[1] -= 7 * dt; const np = V.madd(f.p, f.v, dt);
      const wy = waterAt(np);
      if (wy !== null && np[1] < wy) { f.state = 'out'; f.t = 0; FX.splash([np[0], wy, np[2]], 14); FX.smoke([np[0], wy + .2, np[2]], 6, .8); SND.fizz(); f.p = [np[0], wy, np[2]]; continue; }
      if (!insideWorld(np) || f.t > 3) {
        let a = 0, b = 1; for (let k = 0; k < 6; k++) { const m = (a + b) / 2; if (insideWorld(V.lerp(f.p, np, m))) a = m; else b = m; }
        f.p = V.madd(V.lerp(f.p, np, a), V.norm(f.v), -.12); f.state = 'burn'; f.t = 0; SND.flareIgnite(f.p);
        FLASHES.push({ p: V.copy(f.p), col: [1, .45, .2], I: 160, range: 20, t: 0, dur: .35 });
      } else f.p = np;
      emit(f.p, rv(.3), .35, .05, [6, 1.6, .5], 1, 0, 2);
      // flying through an unlit lamp lights it
      for (const L of LV.lamps) if (!L.lit && L.hitR > 0 && V.dist2(L.p, f.p) < (L.hitR + .5) ** 2) lightLamp(L, 'FLARE LIT');
    } else if (f.state === 'burn') {
      const fl = .85 + .15 * Math.sin(f.t * 31) * Math.sin(f.t * 17.3) + (Math.random() - .5) * .1;
      f.I = FLARE.I * fl * (1 - smooth(FLARE.burn - 1, FLARE.burn, f.t));
      if (Math.random() < dt * 40) emit(f.p, V.add(rv(1.6), [0, 2, 0]), .5, .015, [7, 2.4, .7], 0, 6, .6);
      if (Math.random() < dt * 8) FX.smoke(f.p, 1, .5);
      if (f.t < .1) for (const L of LV.lamps) if (!L.lit && L.hitR > 0 && L.kind !== 'sun' && V.dist(L.p, f.p) < 2.2) lightLamp(L, 'FLARE LIT');
      if (f.t > FLARE.burn) FLARES.splice(i, 1);
    } else { if (f.t > 1) FLARES.splice(i, 1); }
  }
  for (let i = FLASHES.length - 1; i >= 0; i--) { FLASHES[i].t += dt; if (FLASHES[i].t > FLASHES[i].dur) FLASHES.splice(i, 1); }
  for (let i = TRACERS.length - 1; i >= 0; i--) { TRACERS[i].t += dt; if (TRACERS[i].t > .07) TRACERS.splice(i, 1); }
}
function drawFlares(B, GL) {
  for (const f of FLARES) {
    if (f.state === 'fly') { GL.add(f.p, .35, 8, 2.4, .8, 0); B.cyl.add(frameLook(f.p, f.v, [0, 1, 0]), .03, .25, .03, [.8, .2, .1, 0], [1, .2, .05]); }
    else if (f.state === 'burn') { const k = f.I / FLARE.I; GL.add(f.p, 1.1 * k + .2, 10 * k, 3.2 * k, 1.1 * k, 0); GL.add(f.p, .22, 30 * k, 18 * k, 10 * k, 0); GL.add(f.p, 2.6 * k, .7 * k, .2 * k, .06 * k, 2, null, f.t); }
  }
  for (const t of TRACERS) { const a = 1 - t.t / .07; GL.add(t.a, .022, 9 * a, 5 * a, 2 * a, 1, t.b); }
}

// ---------- light queries ----------
// a spot is "lit" when it is inside the safe radius of any lit lamp, burning flare or recent flash
function isLit(p) {
  for (const L of LV.lamps) if (L.lit && V.dist2(L.p, p) < L.safe * L.safe) return true;
  for (const f of FLARES) if (f.state === 'burn' && V.dist2(f.p, p) < FLARE.safe * FLARE.safe) return true;
  for (const f of FLASHES) if (V.dist2(f.p, p) < 64) return true;
  return false;
}
function dazzleAt(p, r) { const rr = (r || FLARE.dazzle) ** 2; for (const f of FLARES) if (f.state === 'burn' && f.t < FLARE.burn - .5 && V.dist2(f.p, p) < rr) return true; return false; }

// gather lights for this frame: the brightest by I / distance, capped by the quality tier
const LIGHTS = [];
function gatherLights(q) {
  LIGHTS.length = 0; const cp = G.cam.p, t = G.time;
  const push = (p, col, I, range, fill) => { const d2 = V.dist2(p, cp); if (d2 > (range + 75) ** 2) return; LIGHTS.push({ p, col, I, range, fill: fill ? 1 : 0, w: (fill ? I * 6 : I) / (1 + d2 / (range * range * .6)) }); };
  for (const L of LV.lamps) {
    if (!L.lit) continue;
    const age = t - L.litT, boot = L.preLit ? 1 : smooth(0, .5, age) * (1 + 1.5 * Math.exp(-age * 5));
    let fl = 1; if (L.kind === 'lantern' || L.kind === 'oil') fl = .88 + .12 * Math.sin(t * 9 + L.ph) * Math.sin(t * 5.3 + L.ph * 2); else if (L.kind === 'brazier') fl = .8 + .2 * Math.sin(t * 13 + L.ph) * Math.sin(t * 7.1);
    else if (L.kind === 'crystal') fl = .92 + .08 * Math.sin(t * 1.3 + L.ph);
    push(L.p, L.col, L.I * fl * boot, L.range);
  }
  for (const ch of TRACK.chambers) if (ch.fill && V.dist2(ch.c, cp) < (ch.rmax + 40) ** 2) for (const L of ch.fill) push(L.p, L.col, L.I, L.range, true);
  for (const L of LV.levers) push(V.add(L.base, [0, 2.6, 0]), [1, .78, .4], 7, 9);   // a work lamp over each junction lever
  for (const f of FLARES) if (f.state === 'burn') push(f.p, [1, .3, .12], f.I, FLARE.range); else if (f.state === 'fly') push(f.p, [1, .3, .12], 18, 8);
  for (const f of FLASHES) { const k = 1 - f.t / f.dur; push(f.p, f.col, f.I * k * k, f.range); }
  if (BOSS.state !== 'off' && BOSS.state !== 'gone' && BOSS.state !== 'sleep') { const F = bossHeadFrame(); push(fpt(F, 0, .6, 3.6), [1, .55, .15], 22 * BOSS.eyes.filter(e => e.alive).length / 8 * (BOSS.dazzle > 0 ? 1.6 : 1), 9); }
  if (G.muzzle > 0) push(V.madd(G.muzzleP, G.cam.f, 1.4), [1, .7, .4], 9 * G.muzzle / .05, 7);
  LIGHTS.sort((a, b) => b.w - a.w);
  const n = Math.min(LIGHTS.length, q.lights);
  // fade the last couple of slots so lights don't pop when they swap in and out
  for (let i = 0; i < n; i++) {
    const L = LIGHTS[i]; let k = 1; if (LIGHTS.length > q.lights && i >= n - 2) k = .5 + .25 * (n - i);
    UB.set('uLP', [L.p[0], L.p[1], L.p[2], L.range], i); UB.set('uLC', [L.col[0] * L.I * k, L.col[1] * L.I * k, L.col[2] * L.I * k, L.fill], i);
  }
  return n;
}
