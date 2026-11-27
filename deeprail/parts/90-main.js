// ===== Main: drawing the world, HUD and menus, the frame loop, quality, window.DR test API =====
let QI = clamp(+(URLP.get('q') !== null ? ({ low: 0, medium: 1, med: 1, high: 2, max: 3 }[URLP.get('q')] ?? 2) : SAVE.get('quality', 2)), 0, 3);
const DB = {}, GLB = new GlowBatch(2048), SMB = new GlowBatch(512), VMB = {};
let dynScale = 1, frameMs = 16, perfAcc = 0;
const PERF = { fps: 0, ms: 0, w: 0, h: 0, draws: 0, lights: 0 };

function init() {
  buildPrograms(); buildPrims();
  for (const k of ['box', 'sph', 'cyl', 'cone', 'wing', 'leg', 'shard']) { DB[k] = new Batch(PRIM[k], 256); VMB[k] = new Batch(PRIM[k], 32); }
  buildTrack(); buildWorldGeometry(); buildLevel(); bossInit();
  G.cart.seg = TRACK.segs.intro; G.cart.s = 40;
  for (const L of LV.lamps) if (L.seg === 'intro' && L.s < 210 && L.kind !== 'sun') { L.lit = true; L.preLit = true; }   // the title screen rides through a lit Shaft 9
  updateCamera(0);
  HUD.init();
  if (TEST) { G.phase = 'menu'; }
}

// ---------- world drawing helpers ----------
const IDF = (p) => ({ p, x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] });
function drawLamps(B, GL) {
  const cp = G.cam.p, t = G.time;
  for (const L of LV.lamps) {
    if (V.dist2(L.p, cp) > 90 * 90) continue;
    const lit = L.lit, c = L.col;
    if (L.kind === 'lantern') {
      if (L.wall) { B.box.addSeg(L.wall, L.arm, .025, IRON, null, null, .04); B.box.addSeg(L.arm, V.add(L.p, [0, .17, 0]), .008, IRON); }
      else if (L.post) { B.box.addSeg(L.post, L.arm, .07, WOOD_D, null, null, .07); B.box.addSeg(L.arm, V.add(L.arm, V.scl(V.norm(V.sub(L.p, L.arm)), .01)), .01, IRON); B.box.addSeg(L.arm, V.add(L.p, [0, .17, 0]), .008, IRON); }
      const F = frot(IDF(L.p), 'z', Math.sin(t * 1.3 + L.ph) * .06);
      B.cone.add(fmove(F, 0, .11, 0), .12, .09, .12, IRON); B.cyl.add(fmove(F, 0, -.12, 0), .1, .035, .1, IRON);
      B.cyl.add(F, .085, .2, .085, [1, .7, .35, 1], lit ? [c[0] * 7, c[1] * 7, c[2] * 7] : [.25, .09, .02]);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + .4; B.box.add(fmove(F, Math.cos(a) * .09, 0, Math.sin(a) * .09), .012, .22, .012, IRON); }
      if (lit) { GL.add(L.p, .55, c[0] * 1.6, c[1] * 1.6, c[2] * 1.6, 0); GL.add(L.p, .08, c[0] * 12, c[1] * 12, c[2] * 12, 0); }
      else GL.add(L.p, .09, 1.6, .6, .15, 0);
    } else if (L.kind === 'oil') {
      B.box.addSeg(L.base, V.add(L.p, [0, -.2, 0]), .06, WOOD_D, null, null, .06);
      B.cone.add(IDF(V.add(L.p, [0, .1, 0])), .13, .12, .13, IRON); B.cyl.add(IDF(V.add(L.p, [0, -.17, 0])), .14, .05, .14, IRON);
      B.sph.add(IDF(L.p), .12, .14, .12, [1, .75, .4, 1], lit ? [c[0] * 8, c[1] * 8, c[2] * 8] : [.25, .1, .02]);
      if (lit) { GL.add(L.p, .7, c[0] * 1.8, c[1] * 1.8, c[2] * 1.8, 0); GL.add(L.p, .1, c[0] * 14, c[1] * 14, c[2] * 14, 0); } else GL.add(L.p, .08, .9, .35, .1, 0);
    } else if (L.kind === 'crystal') {
      const glow = lit ? 2.6 + .4 * Math.sin(t * 1.7 + L.ph) : .3 + .12 * Math.sin(t * 2 + L.ph);
      for (const sh of L.shards) B.shard.add(frameLookUp(V.add(L.base, sh.o), sh.d), sh.w, sh.h, sh.w, [c[0] * .7, c[1] * .7, c[2] * .7, 1], [c[0] * glow, c[1] * glow, c[2] * glow]);
      if (lit) GL.add(L.p, L.size * 2.4, c[0] * .8, c[1] * .8, c[2] * .8, 0); else GL.add(L.p, L.size * 1.2, c[0] * .25, c[1] * .25, c[2] * .25, 0);
    } else if (L.kind === 'brazier') {
      for (let k = 0; k < 3; k++) { const a = k / 3 * TAU; B.leg.addSeg(V.add(L.base, [Math.cos(a) * .55, 0, Math.sin(a) * .55]), V.add(L.base, [0, .95, 0]), .05, IRON); }
      B.sph.add(IDF(V.add(L.base, [0, 1.05, 0])), .55, .22, .55, IRON); B.sph.add(IDF(V.add(L.base, [0, 1.15, 0])), .45, .08, .45, [.08, .05, .04, 0], lit ? [2.2, .6, .1] : [.15, .03, 0]);
      if (lit) { for (let k = 0; k < 5; k++) { const fp = V.add(L.p, [Math.sin(t * 7 + k * 2) * .18, .1 + k * .14 + Math.sin(t * 11 + k) * .05, Math.cos(t * 6 + k * 1.3) * .18]); GL.add(fp, .45 - k * .06, 3.2 - k * .4, 1.1 - k * .15, .25, 0); } GL.add(L.p, 1.6, 1.2, .45, .1, 0); if (Math.random() < .3) FX.embers(L.p, 1, [1, .5, .2], .6); }
      else GL.add(V.add(L.base, [0, 1.2, 0]), .3, .5, .12, .02, 0);
    } else if (L.kind === 'sun') {
      if (G.cart.seg.id === 'exit') { const k = smooth(80, 230, G.cart.s); GL.add(L.p, 9, 5 * k, 4.7 * k, 4.2 * k, 0); GL.add(L.p, 3, 20 * k, 19 * k, 17 * k, 0); }
    }
  }
}
function drawLevers(B, GL) {
  for (const L of LV.levers) {
    if (V.dist2(L.p, G.cam.p) > 80 * 80) continue;
    const f = L.f, F = { p: L.base, x: f.R, y: f.U, z: f.T };
    B.box.add(fmove(F, 0, .05, 0), .5, .1, .5, IRON); B.box.add(fmove(F, 0, .5, 0), .14, .9, .14, RUST);
    const A = frot(fmove(F, 0, .9, 0), 'x', -L.ang);
    B.box.add(fmove(A, 0, .35, 0), .06, .7, .06, IRON); B.sph.add(fmove(A, 0, .72, 0), .11, .11, .11, [.8, .15, .1, .5], [.6, .08, .03]);
    const S = fmove(F, -.9, 2.25, 0);
    B.box.add(fmove(S, 0, -.65, 0), .1, 1.2, .1, WOOD_D); B.box.add(S, 1.9, .55, .06, [.45, .32, .2, .25]);
    for (const sd of [-1, 1]) {
      const on = (sd < 0) === (L.state === 0), e = on ? [3.5, 2.6, .6] : [.15, .1, .05];
      B.cone.add({ p: fpt(S, sd * .55, 0, .05), x: f.U, y: V.scl(f.R, sd), z: V.scl(f.T, 1) }, .14, .32, .04, [.9, .8, .3, 0], e);
      if (on) GL.add(fpt(S, sd * .62, 0, .1), .35, 1.4, 1, .2, 0);
    }
    GL.add(fpt(A, 0, .72, 0), .25, .6, .1, .05, 0);
    B.cone.add(IDF(V.add(L.base, [0, 2.75, 0])), .16, .12, .16, IRON); GL.add(V.add(L.base, [0, 2.6, 0]), .5, 1.6, 1.2, .5, 0); GL.add(V.add(L.base, [0, 2.6, 0]), .07, 9, 7, 3.5, 0);
  }
}
function drawProps(B, GL) {
  const cp = G.cam.p;
  for (const c of LV.crates) {
    if (!c.alive || V.dist2(c.p, cp) > 70 * 70) continue;
    const F = { p: c.p, x: c.f.R, y: c.f.U, z: c.f.T };
    B.box.add(F, .62, .58, .62, [.45, .33, .2, .25]);
    for (const y of [-.2, .2]) B.box.add(fmove(F, 0, y, 0), .64, .06, .64, [.3, .22, .14, .25]);
    if (c.kind === 'health') { B.box.add(fmove(F, 0, .3, 0), .3, .02, .09, [1, .9, .9, 0], [2.4, .2, .15]); B.box.add(fmove(F, 0, .3, 0), .09, .02, .3, [1, .9, .9, 0], [2.4, .2, .15]); GL.add(V.add(c.p, [0, .35, 0]), .3, .8, .05, .03, 0); }
    else { B.box.add(fmove(F, 0, .3, 0), .4, .02, .1, [1, .6, .3, 0], [2.6, .9, .2]); B.cyl.add(fmove(F, 0, .36, 0), .05, .1, .05, [.8, .2, .1, 0], [1.5, .3, .1]); GL.add(V.add(c.p, [0, .35, 0]), .3, .9, .35, .08, 0); }
  }
  for (const e of LV.eggs) {
    if (!e.alive || V.dist2(e.p, cp) > 60 * 60) continue;
    for (let k = 0; k < e.k; k++) { const a = k / e.k * TAU; B.sph.add(IDF(V.add(e.p, [Math.cos(a) * .18, Math.sin(a * 2) * .06, Math.sin(a) * .18])), .17, .2, .17, [.82, .8, .7, .75], [.05, .06, .04]); }
    B.box.addSeg(e.p, V.madd(e.p, e.n, -.6), .01, [.8, .8, .75, 0], [.08, .08, .08]);
  }
  for (const w of LV.webs) {
    if (!w.alive || V.dist2(w.c, cp) > 55 * 55) continue;
    const F = frot({ p: w.c, x: w.f.R, y: w.f.U, z: w.f.T }, 'z', w.rot), col = [.75, .75, .7, 0], em = [.07, .07, .065], N = 12;
    for (let k = 0; k < N; k++) { const a = k / N * TAU; B.box.addSeg(w.c, fpt(F, Math.cos(a) * w.r, Math.sin(a) * w.r, 0), .007, col, em, F.z); }
    for (let r = .25; r < 1; r += .17) for (let k = 0; k < N; k++) { const a = k / N * TAU, b = (k + 1) / N * TAU; B.box.addSeg(fpt(F, Math.cos(a) * w.r * r, Math.sin(a) * w.r * r, 0), fpt(F, Math.cos(b) * w.r * (r + .02), Math.sin(b) * w.r * (r + .02), 0), .006, col, em, F.z); }
  }
  // lurking eyes
  for (const l of LV.lurkers) {
    if (V.dist2(l.p, cp) > 70 * 70) continue;
    let a = 1; if (l.state !== 'wait') { if (l.state === 'missed' || l.state === 'out') continue; a = 1 - l.gone / .45; if (a <= 0) continue; }
    const bl = l.blink < 0 ? .15 : 1, side = V.norm(V.cross(l.n, [0, 1, 0])), sd = V.len(side) > .1 ? side : [1, 0, 0];
    const p = V.madd(l.p, l.n, -(l.state === 'wait' ? 0 : l.gone * 1.2));
    const col = l.type === 'bat' ? [2.8, .5, .25] : l.type === 'spider' ? [.6, 2.8, .5] : l.type === 'burrower' ? [3, 1.9, .3] : [.8, 1.8, 1.6];
    const k = a * bl * (l.type === 'peeper' ? .8 : 1), s = l.type === 'burrower' ? .07 : .045;
    for (const e of [-1, 1]) { const q = V.madd(p, sd, e * l.sep); GL.add(q, s * (l.blink < 0 ? .5 : 1), col[0] * k, col[1] * k, col[2] * k, 3); GL.add(q, s * 3, col[0] * .12 * k, col[1] * .12 * k, col[2] * .12 * k, 0); }
    if (l.type === 'spider' && l.state === 'wait') for (const e of [-1, 1]) GL.add(V.add(V.madd(p, sd, e * .05), [0, .06, 0]), .025, col[0] * .7 * k, col[1] * .7 * k, col[2] * .7 * k, 3);
  }
  // glow worms
  const t = G.time;
  for (const w of WORLD.worms) { if (V.dist2(w.p, cp) > 85 * 85) continue; const tw = .55 + .45 * Math.sin(t * 1.3 + w.ph); if (w.k === 2) GL.add(w.p, w.s, w.col[0] * .12 * tw, w.col[1] * .12 * tw, w.col[2] * .12 * tw, 0); else if (w.k) GL.add(w.p, w.s * 1.3, .9 * tw, .5 * tw, 1.6 * tw, 0); else GL.add(w.p, w.s, .35 * tw, 1.4 * tw, 1.1 * tw, 0); }
}
function drawCart(B) {
  const c = G.cart, f = c.f || c.seg.at(c.s); if (G.camLock) return;
  const F = { p: c.p, x: f.R, y: f.U, z: f.T }, iron = [.26, .13, .08, .5], band = [.16, .15, .14, .5];
  B.box.add(fmove(F, 0, .6, .8), 1.16, .74, .07, iron); B.box.add(fmove(F, 0, .98, .82), 1.22, .07, .12, band);
  for (const sd of [-1, 1]) { B.box.add(fmove(F, sd * .58, .6, -.1), .07, .74, 1.9, iron); B.box.add(fmove(F, sd * .6, .98, -.1), .12, .07, 1.96, band); }
  B.box.add(fmove(F, 0, .26, -.15), 1.1, .06, 1.9, [.1, .07, .05, .5]);
  for (const sd of [-1, 1]) for (const dz of [-.6, .45]) B.cyl.add(frot(fmove(F, sd * .56, .14, dz), 'z', Math.PI / 2), .17, .08, .17, band);
}
function drawGun(B, GL) {
  if (G.camLock || G.phase === 'results') return;
  const C = G.cam, d = aimRay(G.aim.x, G.aim.y), rc = G.recoil || 0, k = .95;
  const base = V.add(C.p, V.add(V.add(V.scl(C.r, .29), V.scl(C.u, -.27 + rc * .008)), V.scl(C.f, .56 - rc * .04)));
  const F = frameLook(base, V.norm(V.add(d, V.scl(C.u, rc * .06))), C.u), brass = [.7, .5, .24, .5], steel = [.16, .16, .17, .5], wood = [.3, .16, .08, .25];
  const S = (lx, ly, lz) => fmove(F, lx * k, ly * k, lz * k), cylZ = (lx, ly, lz, r, L, col, e) => B.cyl.add(frot(S(lx, ly, lz), 'x', Math.PI / 2), r * k, L * k, r * k, col, e);
  B.box.add(S(0, 0, -.03), .07 * k, .08 * k, .19 * k, steel);
  cylZ(0, .012, .16, .02, .24, steel);
  cylZ(0, -.042, .1, .028, .15, [.45, .1, .05, .5], G.flares > 0 ? [.18, .03, .01] : null);
  for (const z of [.08, .18, .26]) cylZ(0, .012, z, .027, .014, brass, G.muzzle > 0 ? [.9, .3, .06] : null);
  B.box.add(frot(S(0, -.095, -.085), 'x', .35), .05 * k, .15 * k, .065 * k, wood);
  B.box.add(S(0, .05, -.07), .018 * k, .022 * k, .06 * k, brass);
  if (G.muzzle > 0) { const m = fpt(F, 0, .012 * k, .3 * k); GL.add(m, .1, 10, 6, 2, 0); GL.add(m, .035, 26, 20, 12, 0); }
}
// ---------- the frame ----------
function resize() {
  const q = QUALITY[QI], cssW = Math.max(1, innerWidth), cssH = Math.max(1, innerHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, q.dpr);
  let sc = q.scale * (q.budget ? dynScale : 1); if (URLP.has('scale')) sc = +URLP.get('scale') || 1;
  let W = Math.round(cssW * dpr * sc), H = Math.round(cssH * dpr * sc);
  if (q.budget && W * H > q.budget && !URLP.has('scale')) { const k = Math.sqrt(q.budget / (W * H)); W = Math.round(W * k); H = Math.round(H * k); }
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  G.cam.asp = cssW / cssH;
  return [W, H];
}
function sphereVisible(c, r) {
  const C = G.cam, d = V.sub(c, C.p), z = V.dot(d, C.f);
  if (z < -r) return false; if (z - r > 200) return false;
  const tv = Math.tan(C.vfov / 2), th = tv * C.asp, x = V.dot(d, C.r), y = V.dot(d, C.u);
  const kx = Math.sqrt(1 + th * th), ky = Math.sqrt(1 + tv * tv);
  return Math.abs(x) - z * th < r * kx && Math.abs(y) - z * tv < r * ky;
}
function render() {
  const q = QUALITY[QI], [W, H] = resize(); setupTargets(W, H, q);
  const C = G.cam;
  if (C.asp !== C._asp) { C._asp = C.asp; updateCamera(0); }
  const nL = gatherLights(q); PERF.lights = nL;
  UB.set('uVP', C.vp); UB.set('uView', C.view); UB.set('uInvVP', M4.inv(C.vp)); UB.set('uCam', [C.p[0], C.p[1], C.p[2], 0]);
  UB.set('uTime', [G.time, nL, q.octaves, 0]);
  UB.set('uFog', [.0035, .003, .0028, G.cart.seg && G.cart.seg.id === 'exit' ? lerp(.024, .008, smooth(100, 230, G.cart.s)) : .024]);
  UB.set('uAmb', [.011, .012, .017, 0]); UB.set('uClip', [.05, 240, W, H]);
  const cf = G.cart.f || (G.cart.seg && G.cart.seg.at(G.cart.s));
  if (cf) { const hp = V.add(V.madd(G.cart.p, cf.U, 1.12), V.scl(cf.T, .8)), hd = V.norm(V.add(V.scl(C.f, .6), V.scl(cf.T, .4))); UB.set('uHeadP', [hp[0], hp[1], hp[2], G.phase === 'menu' ? 9 : 15]); UB.set('uHeadD', [hd[0], hd[1] - .08, hd[2], Math.cos(36 * DEG)]); }
  const rc = TRACK.riverCh, riverOn = rc && chNorm(rc, C.p) < 1.9;
  UB.set('uRiver', rc ? [rc.c[0], rc.water, rc.c[2], rc.yaw] : [0, 0, 0, 0]); UB.set('uRiverR', rc ? [rc.r[0] * 1.05, rc.r[2] * 1.02, riverOn ? 1 : 0, 1.2] : [0, 0, 0, 0]);
  UB.upload();
  let draws = 0;
  gl.bindFramebuffer(gl.FRAMEBUFFER, RT.msFB); gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.disable(gl.BLEND); gl.depthMask(true);
  // cave walls
  gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  const RP = PROG.rock; gl.useProgram(RP.p);
  for (const r of WORLD.rock) {
    if (!sphereVisible(r.c, r.r)) continue;
    gl.uniform1i(RP.u.uNCut, r.cuts.length);
    if (r.cuts.length) { const A = new Float32Array(24), Bb = new Float32Array(24); r.cuts.forEach((c, i) => { A.set([c.a[0], c.a[1], c.a[2], c.r], i * 4); Bb.set([c.b[0], c.b[1], c.b[2], c.floor], i * 4); }); gl.uniform4fv(RP.u.uCutA, A); gl.uniform4fv(RP.u.uCutB, Bb); }
    gl.uniform1i(RP.u.uNEll, r.ells.length);
    if (r.ells.length) { const A = new Float32Array(12), Bb = new Float32Array(12); r.ells.forEach((ch, i) => { A.set([ch.c[0], ch.c[1], ch.c[2], ch.yaw], i * 4); Bb.set([ch.r[0] * .96, ch.r[1] * .96, ch.r[2] * .96, ch.floor + .15], i * 4); }); gl.uniform4fv(RP.u.uEll, A); gl.uniform4fv(RP.u.uEllR, Bb); }
    drawPlain(r.mesh); draws++;
  }
  gl.disable(gl.CULL_FACE);
  // rails, static props
  const LP = PROG.lit; gl.useProgram(LP.p);
  for (const r of WORLD.rails) if (sphereVisible(r.c, r.r)) { drawPlain(r.mesh); draws++; }
  for (const c of WORLD.statics.values()) { if (!sphereVisible(c.c, c.r * 1.2)) continue; for (const b of c.b.values()) { b.draw(); draws++; } }
  // dynamic objects
  for (const k in DB) DB[k].clear(); GLB.clear(); SMB.clear();
  drawLamps(DB, GLB); drawLevers(DB, GLB); drawProps(DB, GLB); drawEnemies(DB, GLB); drawBoss(DB, GLB); drawFlares(DB, GLB); drawParticles(DB, GLB, SMB); drawCart(DB);
  for (const k in DB) { DB[k].upload(); DB[k].draw(); draws++; }
  // viewmodel gun, in front of everything
  for (const k in VMB) VMB[k].clear(); drawGun(VMB, GLB);
  gl.depthRange(0, .04); for (const k in VMB) { VMB[k].upload(); VMB[k].draw(); } gl.depthRange(0, 1);
  // river surface: refraction samples a copy of the opaque frame
  if (riverOn) {
    const WP = PROG.water;
    if (q.refract) { blit(RT.msFB, RT.copyFB, W, H, gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.bindFramebuffer(gl.FRAMEBUFFER, RT.msFB); bindTex(TU.uScene, RT.copyTex); bindTex(TU.uDepth, RT.copyDep); }
    gl.useProgram(WP.p); gl.uniform1f(WP.u.uRefract, q.refract ? 1 : 0);
    if (!WORLD.waterMesh) WORLD.waterMesh = buildWaterMesh();
    const m = new Float32Array(16); M4.basis(m, 0, [rc.c[0], rc.water, rc.c[2]], rc.rt, [0, 1, 0], rc.fw, rc.r[0] * 1.05, 1, rc.r[2] * 1.02); gl.uniformMatrix4fv(WP.u.uM, false, m);
    gl.bindVertexArray(WORLD.waterMesh.vao); gl.drawElements(gl.TRIANGLES, WORLD.waterMesh.n, WORLD.waterMesh.type, 0); draws++;
    unbindTex(TU.uScene); unbindTex(TU.uDepth);
  }
  // glows (additive) and smoke (premultiplied alpha), no depth writes
  gl.enable(gl.BLEND); gl.depthMask(false); const GP = PROG.glow; gl.useProgram(GP.p);
  gl.blendFunc(gl.ONE, gl.ONE); gl.uniform1f(GP.u.uAlpha, 0); GLB.draw();
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1f(GP.u.uAlpha, 1); SMB.draw();
  gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
  // resolve
  blit(RT.msFB, RT.sceneFB, W, H, gl.COLOR_BUFFER_BIT);
  if (q.scatter) {
    blit(RT.msFB, RT.depthFB, W, H, gl.DEPTH_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, RT.sceneFB); gl.viewport(0, 0, W, H); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    const SP = PROG.scat; gl.useProgram(SP.p); bindTex(TU.uDepthS, RT.depthTex); gl.uniform1i(SP.u.uNS, Math.min(q.scatter, nL)); gl.uniform1f(SP.u.uDen, .0013);
    gl.bindVertexArray(null); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disable(gl.BLEND); unbindTex(TU.uDepthS);
  }
  // bloom
  const DP = PROG.down, UP = PROG.up; gl.useProgram(DP.p); gl.bindVertexArray(null);
  let sw = W, sh = H;
  for (let i = 0; i < RT.bloom.length; i++) {
    const b = RT.bloom[i]; bindTex(TU.uSrc, i ? RT.bloom[i - 1].t : RT.sceneTex);
    gl.bindFramebuffer(gl.FRAMEBUFFER, b.fb); gl.viewport(0, 0, b.w, b.h); gl.uniform2f(DP.u.uTexel, 1 / sw, 1 / sh); gl.uniform1f(DP.u.uKaris, i ? 0 : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3); sw = b.w; sh = b.h;
  }
  gl.useProgram(UP.p); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  for (let i = RT.bloom.length - 1; i > 0; i--) { const s = RT.bloom[i], d = RT.bloom[i - 1]; bindTex(TU.uSrc, s.t); gl.bindFramebuffer(gl.FRAMEBUFFER, d.fb); gl.viewport(0, 0, d.w, d.h); gl.uniform2f(UP.u.uTexel, 1 / s.w, 1 / s.h); gl.uniform1f(UP.u.uW, 1); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  gl.disable(gl.BLEND); unbindTex(TU.uSrc);
  // composite
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
  const CP = PROG.comp; gl.useProgram(CP.p); bindTex(TU.uScene, RT.sceneTex); bindTex(TU.uBloom, RT.bloom[0].t);
  gl.uniform1f(CP.u.uExpo, HDR ? .9 : 1); gl.uniform1f(CP.u.uBloomK, .06 + .015 * (6 - RT.bloom.length)); gl.uniform1f(CP.u.uHurt, G.hurtT); gl.uniform1f(CP.u.uGrain, .025);
  gl.uniform1f(CP.u.uFade, G.phase === 'menu' ? 0 : G.fade); gl.uniform3fv(CP.u.uFadeCol, G.fadeCol);
  gl.drawArrays(gl.TRIANGLES, 0, 3); unbindTex(TU.uScene); unbindTex(TU.uBloom);
  PERF.draws = draws; PERF.w = W; PERF.h = H;
}
function buildWaterMesh() {
  const N = 48, mb = new MB();
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) mb.v([i / N * 2 - 1, 0, j / N * 2 - 1], [0, 1, 0], [1, 1, 1, 0]);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i; mb.quad(a, a + 1, a + N + 2, a + N + 1); }
  return mb.build();
}

// ---------- HUD, menus ----------
const $ = (id) => document.getElementById(id);
const HUD = (() => {
  const ctx = $('hud2d').getContext('2d'); let bannerT = 0, shownScore = 0;
  const H = {
    init() {
      document.body.classList.toggle('touch', TOUCH);
      const segs = [['qualSeg', QUALITY.map((q, i) => [i, q.name]), () => QI, (v) => H.setQuality(v)], ['sndSeg', [[1, 'ON'], [0, 'OFF']], () => SND.on ? 1 : 0, (v) => { if (!!v !== SND.on) SND.toggle(); }],
        ['autoSeg', [[1, 'ON'], [0, 'OFF']], () => G.autoFire ? 1 : 0, (v) => { G.autoFire = !!v; SAVE.set('autofire', G.autoFire); H.sync(); }], ['sensSeg', [[1, 'SLOW'], [1.4, 'MEDIUM'], [2, 'FAST']], () => INPUT.sens, (v) => { INPUT.sens = v; SAVE.set('sens', v); }]];
      for (const [id, opts, get, set] of segs) for (const el of document.querySelectorAll('.' + id)) {
        el.innerHTML = opts.map(([v, n]) => `<button data-v="${v}">${n}</button>`).join('');
        el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; set(+b.dataset.v); H.sync(); });
        el._get = get;
      }
      $('playBtn').onclick = () => H.play(); $('againBtn').onclick = () => H.play(); $('menuBtn').onclick = () => H.toMenu();
      $('resumeBtn').onclick = () => H.togglePause(false); $('restartBtn').onclick = () => { H.togglePause(false); H.play(); }; $('quitBtn').onclick = () => H.toMenu();
      $('pauseBtn').onclick = (e) => { e.stopPropagation(); H.togglePause(); };
      $('fsBtn').onclick = () => { try { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } catch (e) {} };
      bindHold($('fireBtn'), () => { if (inPlay()) G.firing = true; }, () => { G.firing = false; });
      bindHold($('flareBtn'), () => doFlare());
      $('autoBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); G.autoFire = !G.autoFire; SAVE.set('autofire', G.autoFire); H.sync(); });
      H.sync(); H.refreshHelp(); H.best();
    },
    sync() {
      for (const el of document.querySelectorAll('.seg')) if (el._get) for (const b of el.children) b.classList.toggle('sel', +b.dataset.v === el._get());
      $('autoBtn').classList.toggle('sel', G.autoFire); $('autoBtn').textContent = G.autoFire ? 'AUTO ON' : 'AUTO OFF';
    },
    refreshHelp() {
      $('keysHelp').innerHTML = TOUCH ? 'Drag anywhere to aim &middot; FIRE and FLARE under your right thumb &middot; AUTO fires when the sight is on a target'
        : 'Mouse aims &middot; left click fires &middot; right click launches a flare<br>Keys: arrows / WASD aim &middot; Space fires &middot; F or Shift flare &middot; Esc pause &middot; gamepad works too';
    },
    best() { const b = SAVE.get('best', 0); $('bestMenu').textContent = b ? 'BEST RUN ' + b.toLocaleString() : ''; },
    setQuality(v) { QI = v; SAVE.set('quality', v); dynScale = 1; H.sync(); },
    play() { SND.unlock(); $('menu').classList.add('hidden'); $('results').classList.add('hidden'); $('pause').classList.add('hidden'); for (const L of LV.lamps) L.lit = false; startRun(G.testOpt || {}); },
    toMenu() { G.phase = 'menu'; G.paused = false; SND.stopRide(); ENEMIES.length = 0; BOSS.state = 'off'; buildLevel(); for (const L of LV.lamps) if (L.seg === 'intro' && L.s < 210 && L.kind !== 'sun') { L.lit = true; L.preLit = true; } G.cart.seg = TRACK.segs.intro; G.cart.s = 40; G.fade = 0;
      $('menu').classList.remove('hidden'); $('results').classList.add('hidden'); $('pause').classList.add('hidden'); H.show(false); H.best(); },
    togglePause(force) {
      if (G.phase !== 'play' && G.phase !== 'wrecked') return;
      G.paused = force === undefined ? !G.paused : force; G.firing = false;
      $('pause').classList.toggle('hidden', !G.paused); H.sync();
      $('fpsRow').textContent = `${PERF.fps.toFixed(0)} fps · ${PERF.w}×${PERF.h} · ${QUALITY[QI].name}`;
    },
    show(on) { $('hud').classList.toggle('hidden', !on); document.body.classList.toggle('playing', on); },
    banner(text, dur, big) { const b = $('banner'); b.textContent = text; b.className = big ? 'big show' : 'show'; bannerT = dur || 2.5; },
    results(r) {
      H.show(false);
      const st = G.stats, fmt = (n) => n.toLocaleString();
      $('grade').textContent = r.grade === 'X' ? '✕' : r.grade; $('grade').className = 'grade g' + r.grade;
      $('rtitle').textContent = r.survived ? 'OUT INTO THE DAYLIGHT' : 'CART WRECKED';
      const names = r.path.filter((v, i, a) => a.indexOf(v) === i).map(id => TRACK.segs[id].name).join(' → ');
      $('rbody').innerHTML = `
        <div class="rrow"><span>Score</span><b>${fmt(r.score)}</b></div>
        <div class="rrow"><span>Health bonus</span><b>${fmt(r.bonus.health)}</b></div>
        <div class="rrow"><span>Lights lit ${r.lit}/${r.litTotal}</span><b>${fmt(r.bonus.lights)}</b></div>
        <div class="rrow"><span>Accuracy ${(r.acc * 100).toFixed(0)}%</span><b>${fmt(r.bonus.accuracy)}</b></div>
        <div class="rrow total"><span>TOTAL</span><b>${fmt(r.total)}</b></div>
        <div class="rsmall">${r.isBest ? '<em>NEW BEST!</em> · ' : (r.best ? 'Best ' + fmt(r.best) + ' · ' : '')}Creatures ${st.kills} · Best combo x${st.maxMult} · Flares ${st.flares} · Damage taken ${st.dmgTaken} · Time ${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}${st.boss ? ' · Sleeper defeated' : ''}</div>
        <div class="rsmall route">${names}</div>`;
      $('results').classList.remove('hidden');
    },
    update(dt) {
      if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
      const playing = G.phase === 'play' || G.phase === 'wrecked' || G.phase === 'outro';
      if (playing) {
        shownScore += (G.score - shownScore) * Math.min(1, dt * 10); if (Math.abs(G.score - shownScore) < 1 || TEST) shownScore = G.score;
        $('score').textContent = Math.round(shownScore).toLocaleString();
        $('mult').textContent = 'x' + G.mult; $('mult').classList.toggle('hot', G.mult >= 4); $('combo').style.width = (G.chain ? clamp(G.comboT / 4.5, 0, 1) * 100 : 0) + '%';
        $('hpFill').style.width = G.health + '%'; $('hpFill').classList.toggle('low', G.health < 30);
        let pips = ''; for (let i = 0; i < Math.max(FLARE_MAX, G.flares); i++) pips += `<i class="${i < G.flares ? 'on' : ''}"></i>`;
        if (G.flares < FLARE_MAX) pips += `<span class="regen" style="--p:${(G.regen / FLARE_REGEN * 100).toFixed(0)}%"></span>`;
        $('flarePips').innerHTML = pips; $('flareBtn').classList.toggle('empty', G.flares <= 0);
        const onPath = LV.lamps.filter(l => l.kind !== 'sun' && !l.preLit && G.path.includes(l.seg));
        $('lights').textContent = onPath.filter(l => l.lit).length + ' / ' + onPath.length;
      }
      H.draw2d(playing);
    },
    draw2d(playing) {
      const c = $('hud2d'), dpr = Math.min(2, window.devicePixelRatio || 1), w = innerWidth, h = innerHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      if (!playing || G.paused) return;
      const toS = (q) => [(q[0] * .5 + .5) * w, (.5 - q[1] * .5) * h];
      // popups
      ctx.textAlign = 'center'; ctx.font = '700 15px system-ui, sans-serif';
      for (const p of G.popups) { const q = project(p.p); if (!q) continue; const [x, y] = toS(q), a = 1 - smooth(.8, 1.3, p.t); ctx.fillStyle = `rgba(${p.col[0] * 255 | 0},${p.col[1] * 255 | 0},${p.col[2] * 255 | 0},${a})`; ctx.strokeStyle = `rgba(0,0,0,${a * .8})`; ctx.lineWidth = 3; ctx.strokeText(p.text, x, y - p.t * 40); ctx.fillText(p.text, x, y - p.t * 40); }
      // lever hint
      for (const L of LV.levers) { if (G.cart.seg.id !== L.seg || L.s - G.cart.s > 45 || L.s - G.cart.s < -2) continue; const q = project(L.p); if (!q) continue; const [x, y] = toS(q); ctx.strokeStyle = 'rgba(255,210,90,.9)'; ctx.lineWidth = 2; const r = 18 + 4 * Math.sin(G.time * 8); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,220,120,.95)'; ctx.font = '700 12px system-ui'; ctx.fillText('LEVER', x, y - r - 6); }
      // falling rock and toppling beams get a warning marker so they read in the dark
      for (const e of ENEMIES) {
        if (!e.alive || !((e.type === 'rock' && !e.harmless && !e.thrown) || (e.type === 'beam' && e.ang < 1.2) || (e.type === 'rock' && e.thrown))) continue;
        const pp = e.type === 'beam' ? V.lerp(e.top, beamEnd(e), .6) : e.p, q = project(pp); if (!q || V.dist2(pp, G.cam.p) > 45 * 45) continue;
        const [x, y] = toS(q), pulse = .6 + .4 * Math.sin(G.time * 12), s = 11;
        ctx.strokeStyle = `rgba(255,${120 + 60 * pulse | 0},40,${.55 + .4 * pulse})`; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x, y - s - 14); ctx.lineTo(x + s, y + s - 14); ctx.lineTo(x - s, y + s - 14); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle; ctx.font = '800 12px system-ui'; ctx.fillText('!', x, y + 1);
      }
      // threats behind the edge of the screen
      for (const e of ENEMIES) { if (!e.alive || !(e.mode === 'atk' || e.mode === 'leap' || e.mode === 'lunge')) continue; const q = project(e.p); if (q && Math.abs(q[0]) < .95 && Math.abs(q[1]) < .95) continue; const d = V.sub(e.p, G.cam.p), x = V.dot(d, G.cam.r), y = V.dot(d, G.cam.u), a = Math.atan2(-y, x); edgeArrow(a, 'rgba(255,80,60,.9)'); }
      if (G.hurtDir) { const a = Math.atan2(-G.hurtDir.y, G.hurtDir.x); edgeArrow(a, `rgba(255,40,30,${G.hurtDir.t})`); }
      // web strands over the view
      if (G.webT > 0) { ctx.strokeStyle = `rgba(230,230,220,${Math.min(1, G.webT) * .55})`; ctx.lineWidth = 1.2; const cx = w * .5, cy = h * .45; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + .2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * w, cy + Math.sin(a) * w); ctx.stroke(); } for (let r = 40; r < w; r += 55) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); } }
      // reticle
      const [rx, ry] = toS([G.aim.x, G.aim.y]), hm = G.hitMark > 0;
      ctx.strokeStyle = hm ? 'rgba(255,230,120,1)' : 'rgba(255,245,220,.9)'; ctx.lineWidth = 2; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 4;
      const R = 13 + (G.recoil || 0) * 4; ctx.beginPath(); ctx.arc(rx, ry, R, 0, TAU); ctx.stroke();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.beginPath(); ctx.moveTo(rx + dx * (R - 5), ry + dy * (R - 5)); ctx.lineTo(rx + dx * (R + 6), ry + dy * (R + 6)); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,240,200,.95)'; ctx.fillRect(rx - 1.5, ry - 1.5, 3, 3);
      if (hm) { ctx.beginPath(); for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ctx.moveTo(rx + dx * 6, ry + dy * 6); ctx.lineTo(rx + dx * 12, ry + dy * 12); } ctx.stroke(); }
      ctx.shadowBlur = 0;
      function edgeArrow(a, col) { const cx = w / 2, cy = h / 2, rr = Math.min(w, h) * .42, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -11); ctx.lineTo(-8, 11); ctx.closePath(); ctx.fill(); ctx.restore(); }
    },
  };
  return H;
})();
function banner(t, d, big) { HUD.banner(t, d, big); }

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!TEST) { pollInput(dt); updateGame(dt); }
  render();
  HUD.update(dt);
  frameMs = lerp(frameMs, dt * 1000, .05); PERF.fps = 1000 / frameMs;
  const q = QUALITY[QI];
  if (q.budget && !TEST) { perfAcc += dt; if (perfAcc > .6) { perfAcc = 0; if (frameMs > 22 && dynScale > .62) dynScale -= .06; else if (frameMs < 15 && dynScale < 1) dynScale = Math.min(1, dynScale + .04); } }
  if (!TEST || G.liveTest) requestAnimationFrame(frame);
}

// ---------- test API ----------
window.DR = {
  state() { return { phase: G.phase, seg: G.cart.seg && G.cart.seg.id, s: +G.cart.s.toFixed(1), speed: +G.cart.speed.toFixed(2), t: +G.time.toFixed(2), score: G.score, mult: G.mult, chain: G.chain, health: G.health, flares: G.flares, enemies: ENEMIES.filter(e => e.alive).length, lit: LV.lamps.filter(l => l.lit && !l.preLit).length, boss: BOSS.state, bossEyes: BOSS.eyes ? BOSS.eyes.filter(e => e.alive).length : 0, lever: { ...G.lever }, path: G.path.join('>'), quality: QUALITY[QI].name, hdr: HDR, samples: RT.samples }; },
  step(sec, sub) { const h = sub || 1 / 60; for (let t = 0; t < sec - 1e-6; t += h) { pollInput(h); updateGame(h); if (G.phase === 'results') break; } return this.state(); },
  render() { render(); HUD.update(1 / 30); return PERF; },
  start(opt) { G.testOpt = opt || {}; HUD.play(); return this.state(); },
  aim(x, y) { G.aim.x = x; G.aim.y = y; updateCamera(0); },
  fire(on) { G.firing = !!on; }, flare() { doFlare(); },
  bot(on, skill, levers) { G.bot = !!on; if (skill !== undefined) G.botSkill = skill; G.botLever = levers || null; G.botState = null; },
  setQuality(i) { HUD.setQuality(i); },
  cam(eye, at, fov) { G.camLock = { eye, at, fov }; updateCamera(0); }, uncam() { G.camLock = null; updateCamera(0); },
  stats() { return { ...G.stats, score: G.score, result: G.result }; },
  result() { return G.result; },
  lamps() { return LV.lamps.map(l => ({ kind: l.kind, seg: l.seg, s: +l.s.toFixed(0), lit: l.lit })); },
  lightAll(seg) { for (const l of LV.lamps) if (!seg || l.seg === seg) l.lit = true; },
  god(on) { G.godMode = !!on; },
  boss() { return { state: BOSS.state, eyes: BOSS.eyes.map(e => +e.hp.toFixed(0)), dazzle: BOSS.dazzle, atk: BOSS.atk && BOSS.atk.kind }; },
  track() { return { segs: TRACK.list.map(s => ({ id: s.id, len: s.len, warp: s.warp || 0 })), chambers: TRACK.chambers.map(c => ({ name: c.name, cuts: c.cuts.length })), rock: WORLD.rock.length, statics: WORLD.statics.size, lamps: LV.lamps.length, lurkers: LV.lurkers.length }; },
  menu() { HUD.toMenu(); },
  perf: PERF, G, LV, BOSS, ENEMIES, TRACK, eval: (s) => eval(s),
};

init();
requestAnimationFrame(frame);
