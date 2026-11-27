// ---------- Gaussian splats: baked nebula cubemap, local gas and dust, speed motes, particles ----------
// Static splat record (48 bytes, SPLAT-GUIDE layout):
//  0 f32x3 centre | 12 f32x3 U | 24 f32x3 V | 36 u8x4 rgb + ao | 40 i8x4 drift dir xyz + phase | 44 u8x4 tier, flags, alpha, pad
//  flags: 1 = billboard (U/V lengths used with the camera axes), 2 = twinkle
const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const QUADBUF = (() => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW); return b; })();
function SplatBuf(cap) { const buf = new ArrayBuffer(cap * 48); return { buf, f: new Float32Array(buf), u8: new Uint8Array(buf), i8: new Int8Array(buf), n: 0, cap, s: [] }; }
function pushSplat(B, c, U, V, col, alpha, flags = 0, drift = null, key = 0) {
  if (B.n >= B.cap) return;
  const o = B.n * 48, fo = o / 4;
  B.f[fo] = c[0]; B.f[fo + 1] = c[1]; B.f[fo + 2] = c[2]; B.f[fo + 3] = U[0]; B.f[fo + 4] = U[1]; B.f[fo + 5] = U[2]; B.f[fo + 6] = V[0]; B.f[fo + 7] = V[1]; B.f[fo + 8] = V[2];
  B.u8[o + 36] = clamp(col[0] * 255, 0, 255); B.u8[o + 37] = clamp(col[1] * 255, 0, 255); B.u8[o + 38] = clamp(col[2] * 255, 0, 255); B.u8[o + 39] = 255;
  const d = drift || [0, 0, 0, 0];
  B.i8[o + 40] = clamp(d[0] * 127, -127, 127); B.i8[o + 41] = clamp(d[1] * 127, -127, 127); B.i8[o + 42] = clamp(d[2] * 127, -127, 127); B.i8[o + 43] = clamp(d[3] * 127, -127, 127);
  B.u8[o + 44] = 2; B.u8[o + 45] = flags; B.u8[o + 46] = clamp(alpha * 255, 0, 255); B.u8[o + 47] = 0;
  B.s.push(key); B.n++;
}
// sort records by key (route position) so a window can be drawn as one contiguous range
function sortSplats(B) {
  const idx = [...Array(B.n).keys()].sort((a, b) => B.s[a] - B.s[b]);
  const nb = new ArrayBuffer(B.n * 48), nu = new Uint8Array(nb);
  idx.forEach((k, j) => nu.set(B.u8.subarray(k * 48, k * 48 + 48), j * 48));
  B.u8.set(nu.subarray(0, B.n * 48)); B.s = idx.map(k => B.s[k]);
}
function splatVAO(B) {
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, QUADBUF); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, B.u8.subarray(0, Math.max(48, B.n * 48)), gl.STATIC_DRAW);
  for (let l = 1; l <= 6; l++) { gl.enableVertexAttribArray(l); gl.vertexAttribDivisor(l, 1); }
  gl.bindVertexArray(null);
  return { vao, b, n: B.n, keys: B.s };
}
function pointSplatAttribs(S, start) {
  gl.bindBuffer(gl.ARRAY_BUFFER, S.b); const o = start * 48;
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 48, o); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 48, o + 12); gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 48, o + 24);
  gl.vertexAttribPointer(4, 4, gl.UNSIGNED_BYTE, true, 48, o + 36); gl.vertexAttribPointer(5, 4, gl.BYTE, true, 48, o + 40); gl.vertexAttribPointer(6, 4, gl.UNSIGNED_BYTE, true, 48, o + 44);
}
function lowerBound(arr, v) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo; }

// ---- nebula: thousands of painterly splats on a far shell, baked once into a cubemap ----
const NEB = { tex: null, size: 0 };
const SKY = { sunDir: vnorm([-0.62, 0.5, -0.38]), planetDir: vnorm([0.62, 0.16, 1]), planetAx: vnorm([0.25, 1, 0.1]), ringN: vnorm([0.25, 1, -0.9]), bandN: vnorm([0.35, 1, -0.25]) };
function genNebula(scale) {
  const R = mkRng(777), em = SplatBuf(Math.ceil(9000 * scale) + 400), ab = SplatBuf(Math.ceil(2600 * scale) + 100);
  const clouds = [
    { d: [0.45, 0.22, 1], c0: [1.0, 0.28, 0.55], c1: [1.0, 0.55, 0.2], spread: 520, n: 2600 },
    { d: [-0.85, -0.15, 0.7], c0: [0.15, 0.65, 0.95], c1: [0.35, 0.35, 1.0], spread: 600, n: 2300 },
    { d: [0.05, 0.75, 0.45], c0: [0.6, 0.28, 1.0], c1: [1.0, 0.4, 0.75], spread: 700, n: 2000 },
    { d: [-0.2, -0.6, 0.9], c0: [1.0, 0.75, 0.4], c1: [0.9, 0.45, 0.3], spread: 650, n: 1200 },
    { d: [0.2, 0.1, -1], c0: [0.3, 0.5, 1.0], c1: [0.8, 0.3, 0.6], spread: 800, n: 900 }
  ];
  for (const cl of clouds) {
    const D = vnorm(cl.d), T1 = vnorm(vcross(D, [0, 1, 0.01])), T2 = vcross(D, T1), n = Math.ceil(cl.n * scale);
    const off = [R() * 100, R() * 100, R() * 100];
    let made = 0, tries = 0;
    while (made < n && tries < n * 12) {
      tries++;
      const a = (R() - 0.5) * 2, b = (R() - 0.5) * 2; if (a * a + b * b > 1) continue;
      const fall = 1 - (a * a + b * b);
      const p0 = vadd(vadd(vscl(D, 1000), vscl(T1, a * cl.spread)), vscl(T2, b * cl.spread * 0.75));
      const den = fbm(p0[0] * 0.004 + off[0], p0[1] * 0.004 + off[1], p0[2] * 0.004 + off[2], 5);
      const fil = 1 - Math.abs(fbm(p0[0] * 0.006 + off[1], p0[1] * 0.006 + off[2], p0[2] * 0.006, 4) - 0.5) * 2;
      const w = Math.pow(den, 2.2) * fall * (0.4 + 0.6 * Math.pow(fil, 3)) * 2.4;
      if (R() > w) continue;
      made++;
      const p = vscl(vnorm(p0), 1000 + (R() - 0.5) * 200);
      const nd = vnorm(p), t1 = vnorm(vcross(nd, [0.3, 1, 0.1])), t2 = vcross(nd, t1);
      const ang = R() * TAU, el = 1 + R() * 2.2, sz = 18 + R() * 70 * (0.6 + fall);
      const U = vscl(vadd(vscl(t1, Math.cos(ang)), vscl(t2, Math.sin(ang))), sz * el), V = vscl(vadd(vscl(t1, -Math.sin(ang)), vscl(t2, Math.cos(ang))), sz);
      const t = clamp(den * 1.6 - 0.3 + (R() - 0.5) * 0.3, 0, 1);
      const col = vlerp(cl.c0, cl.c1, t);
      pushSplat(em, p, U, V, col, 0.05 + R() * 0.09);
      if (R() < 0.035) { const s2 = 1.5 + R() * 4; pushSplat(em, vscl(nd, 990), vscl(t1, s2), vscl(t2, s2), vlerp([1, 0.95, 0.9], cl.c1, 0.3), 0.9); }
      if (fil > 0.82 && R() < 0.5) {
        const ds = sz * (0.6 + R() * 0.8);
        pushSplat(ab, vscl(nd, 995), vscl(U, ds / sz * 0.9), vscl(V, ds / sz * 0.6), [0, 0, 0], 0.15 + R() * 0.25);
      }
    }
  }
  return { em, ab };
}
function bakeNebula(size) {
  if (NEB.tex) gl.deleteTexture(NEB.tex);
  NEB.size = size;
  const { em, ab } = genNebula(clamp(size / 768, 0.35, 1.25));
  const S1 = splatVAO(em), S2 = splatVAO(ab);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
  const lv = Math.floor(Math.log2(size)) + 1;
  gl.texStorage2D(gl.TEXTURE_CUBE_MAP, lv, HDR_FMT, size, size);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_CUBE_MAP, w, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], ups = [[0, -1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0], [0, -1, 0]];
  const proj = M4.persp(Math.PI / 2, 1, 1, 5000);
  const pr = PROG.splat; gl.useProgram(pr.p);
  gl.uniform1f(pr.u.uMode, 1); gl.uniform1f(pr.u.uGain, 1); gl.uniform1f(pr.u.uTime, 0); gl.uniform3f(pr.u.uCam, 0, 0, 0);
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND);
  gl.viewport(0, 0, size, size);
  for (let f = 0; f < 6; f++) {
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, tex, 0);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    const view = M4.look([0, 0, 0], dirs[f], ups[f]);
    gl.uniformMatrix4fv(pr.u.uVP, false, M4.mul(proj, view));
    gl.uniform3fv(pr.u.uCR, [view[0], view[4], view[8]]); gl.uniform3fv(pr.u.uCU, [view[1], view[5], view[9]]);
    gl.colorMask(true, true, true, false); gl.blendFunc(gl.ONE, gl.ONE); gl.uniform1f(pr.u.uAbsorb, 0);
    gl.bindVertexArray(S1.vao); pointSplatAttribs(S1, 0); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, S1.n);
    gl.colorMask(true, true, true, true); gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1f(pr.u.uAbsorb, 1);
    gl.bindVertexArray(S2.vao); pointSplatAttribs(S2, 0); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, S2.n);
  }
  gl.bindVertexArray(null); gl.colorMask(true, true, true, true); gl.disable(gl.BLEND);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex); gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb);
  gl.deleteBuffer(S1.b); gl.deleteBuffer(S2.b); gl.deleteVertexArray(S1.vao); gl.deleteVertexArray(S2.vao);
  NEB.tex = tex; NEB.count = em.n + ab.n;
}

// ---- local gas, dust and ice glitter along the route (world space, sorted by route s) ----
const GAS = { S: null, buf: null };
function gasBegin() { GAS.buf = SplatBuf(Math.ceil(9000 * QL.gas) + 200); }
function gasCloud(s, center, radius, n, col, alphaK = 1, sizeK = 1, flags = 1) {
  const B = GAS.buf; n = Math.max(1, Math.round(n * QL.gas));
  for (let i = 0; i < n; i++) {
    const d = randDir(rnd), r = radius * Math.pow(rnd(), 0.6), p = vmad(center, d, r);
    const sz = (radius * 0.35 + rnd() * radius * 0.5) * sizeK;
    const c = vlerp(col[0], col[1] || col[0], rnd());
    pushSplat(B, p, [sz * (1 + rnd() * 0.6), 0, 0], [0, sz, 0], c, (0.05 + rnd() * 0.07) * alphaK, flags, [rr(-1, 1), rr(-1, 1), rr(-1, 1), rr(-1, 1)], s);
  }
}
function gasSheet(s, center, U, V, n, col, alphaK = 1) { // oriented wisps (plumes, ring haze)
  const B = GAS.buf; n = Math.max(1, Math.round(n * QL.gas));
  for (let i = 0; i < n; i++) {
    const a = rr(-1, 1), b = rr(-1, 1), p = vadd(center, vadd(vscl(U, a), vscl(V, b)));
    const sz = vlen(U) * (0.15 + rnd() * 0.2), ang = rnd() * TAU, ux = vnorm(U), vx = vnorm(V);
    const UU = vscl(vadd(vscl(ux, Math.cos(ang)), vscl(vx, Math.sin(ang))), sz * 1.8), VV = vscl(vadd(vscl(ux, -Math.sin(ang)), vscl(vx, Math.cos(ang))), sz * 0.7);
    pushSplat(B, p, UU, VV, vlerp(col[0], col[1] || col[0], rnd()), (0.04 + rnd() * 0.06) * alphaK, 0, [rr(-1, 1), rr(-1, 1), rr(-1, 1), rr(-1, 1)], s);
  }
}
function gasGlitter(s, center, radius, n, col) {
  const B = GAS.buf; n = Math.max(1, Math.round(n * QL.gas));
  for (let i = 0; i < n; i++) { const p = vmad(center, randDir(rnd), radius * Math.cbrt(rnd())), sz = 0.25 + rnd() * 0.5; pushSplat(B, p, [sz, 0, 0], [0, sz, 0], col, 0.8, 3, [0, 0, 0, rr(-1, 1)], s); }
}
function gasEnd() { sortSplats(GAS.buf); if (GAS.S) { gl.deleteBuffer(GAS.S.b); gl.deleteVertexArray(GAS.S.vao); } GAS.S = splatVAO(GAS.buf); GAS.buf = null; }

// ---- speed motes ----
const MOTES = { vao: null, n: 0 };
function buildMotes() {
  const n = QL.motes, d = new Float32Array(n * 4), R = mkRng(99);
  for (let i = 0; i < n; i++) { d[i * 4] = R() * 1000; d[i * 4 + 1] = R() * 1000; d[i * 4 + 2] = R() * 1000; d[i * 4 + 3] = R(); }
  if (MOTES.vao) { gl.deleteVertexArray(MOTES.vao); gl.deleteBuffer(MOTES.b); }
  MOTES.vao = gl.createVertexArray(); gl.bindVertexArray(MOTES.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, QUADBUF); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  MOTES.b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, MOTES.b); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0); gl.vertexAttribDivisor(1, 1);
  gl.bindVertexArray(null); MOTES.n = n;
}

// ---- particles (structure of arrays, swap-remove) + one-frame sprites; one dynamic buffer, 16 floats each ----
const PT = { cap: 0, n: 0 };
function initParticles(cap) {
  PT.cap = cap; PT.n = 0;
  PT.p = new Float32Array(cap * 3); PT.v = new Float32Array(cap * 3); PT.c0 = new Float32Array(cap * 3); PT.c1 = new Float32Array(cap * 3);
  PT.life = new Float32Array(cap); PT.max = new Float32Array(cap); PT.s0 = new Float32Array(cap); PT.s1 = new Float32Array(cap);
  PT.a0 = new Float32Array(cap); PT.a1 = new Float32Array(cap); PT.shape = new Float32Array(cap); PT.streak = new Float32Array(cap);
  PT.drag = new Float32Array(cap); PT.rot = new Float32Array(cap); PT.rotv = new Float32Array(cap);
  PT.spr = new Float32Array((cap + 1500) * 16); PT.ns = 0;
  if (!PT.vao) {
    PT.vao = gl.createVertexArray(); gl.bindVertexArray(PT.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, QUADBUF); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    PT.b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, PT.b);
    const at = (l, size, off) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 64, off); gl.vertexAttribDivisor(l, 1); };
    at(1, 3, 0); at(2, 3, 12); at(3, 2, 24); at(4, 4, 32); at(5, 4, 48);
    gl.bindVertexArray(null);
  }
}
// spawn: o = {p, v, life, s0, s1, c0, c1, a0, a1, shape, streak, drag, rot, rotv}
function spawnP(o) {
  if (PT.n >= PT.cap) return;
  const i = PT.n++, i3 = i * 3;
  PT.p[i3] = o.p[0]; PT.p[i3 + 1] = o.p[1]; PT.p[i3 + 2] = o.p[2];
  const v = o.v || [0, 0, 0]; PT.v[i3] = v[0]; PT.v[i3 + 1] = v[1]; PT.v[i3 + 2] = v[2];
  const c0 = o.c0 || [1, 1, 1], c1 = o.c1 || c0; PT.c0[i3] = c0[0]; PT.c0[i3 + 1] = c0[1]; PT.c0[i3 + 2] = c0[2]; PT.c1[i3] = c1[0]; PT.c1[i3 + 1] = c1[1]; PT.c1[i3 + 2] = c1[2];
  PT.life[i] = 0; PT.max[i] = o.life || 1; PT.s0[i] = o.s0 ?? 1; PT.s1[i] = o.s1 ?? PT.s0[i]; PT.a0[i] = o.a0 ?? 1; PT.a1[i] = o.a1 ?? 0;
  PT.shape[i] = o.shape || 0; PT.streak[i] = o.streak || 0; PT.drag[i] = o.drag || 0; PT.rot[i] = o.rot ?? frnd() * TAU; PT.rotv[i] = o.rotv || 0;
}
function killP(i) {
  const j = --PT.n; if (i === j) return;
  for (const k of ['p', 'v', 'c0', 'c1']) { const a = PT[k]; a[i * 3] = a[j * 3]; a[i * 3 + 1] = a[j * 3 + 1]; a[i * 3 + 2] = a[j * 3 + 2]; }
  for (const k of ['life', 'max', 's0', 's1', 'a0', 'a1', 'shape', 'streak', 'drag', 'rot', 'rotv']) PT[k][i] = PT[k][j];
}
function updateParticles(dt) {
  for (let i = PT.n - 1; i >= 0; i--) {
    PT.life[i] += dt; if (PT.life[i] >= PT.max[i]) { killP(i); continue; }
    const i3 = i * 3, dr = PT.drag[i] ? Math.exp(-PT.drag[i] * dt) : 1;
    PT.v[i3] *= dr; PT.v[i3 + 1] *= dr; PT.v[i3 + 2] *= dr;
    PT.p[i3] += PT.v[i3] * dt; PT.p[i3 + 1] += PT.v[i3 + 1] * dt; PT.p[i3 + 2] += PT.v[i3 + 2] * dt; PT.rot[i] += PT.rotv[i] * dt;
  }
}
// one-frame sprite (bolts, exhaust, glints)
function sprite(p, ax, w, h, col, a, shape = 0, rot = 0) {
  if (PT.ns >= PT.spr.length / 16) return;
  const o = PT.ns++ * 16, f = PT.spr;
  f[o] = p[0]; f[o + 1] = p[1]; f[o + 2] = p[2]; f[o + 3] = ax ? ax[0] : 0; f[o + 4] = ax ? ax[1] : 0; f[o + 5] = ax ? ax[2] : 0;
  f[o + 6] = w; f[o + 7] = h; f[o + 8] = col[0]; f[o + 9] = col[1]; f[o + 10] = col[2]; f[o + 11] = a; f[o + 12] = shape; f[o + 13] = rot; f[o + 14] = 0; f[o + 15] = 0;
}
function packParticles() {
  for (let i = 0; i < PT.n; i++) {
    const t = PT.life[i] / PT.max[i], i3 = i * 3, s = lerp(PT.s0[i], PT.s1[i], t);
    let ax = null; if (PT.streak[i]) ax = [PT.v[i3] * PT.streak[i], PT.v[i3 + 1] * PT.streak[i], PT.v[i3 + 2] * PT.streak[i]];
    sprite([PT.p[i3], PT.p[i3 + 1], PT.p[i3 + 2]], ax, s, s, [lerp(PT.c0[i3], PT.c1[i3], t), lerp(PT.c0[i3 + 1], PT.c1[i3 + 1], t), lerp(PT.c0[i3 + 2], PT.c1[i3 + 2], t)], lerp(PT.a0[i], PT.a1[i], t), PT.shape[i], PT.rot[i]);
  }
}
// effect presets
const FX = {
  boom(p, size, hot = [1, 0.6, 0.2], vel = [0, 0, 0]) {
    const n = Math.round(10 + size * 3);
    for (let i = 0; i < n; i++) { const d = randDir(frnd), sp = frr(0.3, 1) * size * 3.2; spawnP({ p: vmad(p, d, size * 0.2), v: vmad(vel, d, sp), life: frr(0.35, 0.9), s0: size * frr(0.35, 0.7), s1: size * frr(0.9, 1.6), c0: [hot[0] * 6, hot[1] * 6, hot[2] * 6], c1: [0.5, 0.18, 0.05], a0: 1, a1: 0, shape: 3, drag: 2.2 }); }
    for (let i = 0; i < n * 0.7; i++) { const d = randDir(frnd), sp = frr(0.3, 1) * size * 2.2; spawnP({ p: vmad(p, d, size * 0.3), v: vmad(vel, d, sp), life: frr(1.2, 2.4), s0: size * 0.5, s1: size * frr(1.6, 2.4), c0: [0.22, 0.2, 0.2], c1: [0.05, 0.05, 0.06], a0: 0.55, a1: 0, shape: 3, drag: 1.2 }); }
    for (let i = 0; i < n * 1.5; i++) { const d = randDir(frnd), sp = frr(8, 30) * (0.6 + size * 0.15); spawnP({ p: vadd(p, [0, 0, 0]), v: vmad(vel, d, sp), life: frr(0.4, 1.3), s0: 0.12 + size * 0.015, s1: 0.04, c0: [6, 3.5, 1.2], c1: [2, 0.6, 0.1], a0: 1, a1: 0.2, shape: 2, streak: 0.04, drag: 0.6 }); }
    spawnP({ p, v: vel, life: 0.25, s0: size * 1.2, s1: size * 3.2, c0: [8, 6, 4], c1: hot, a0: 1, a1: 0, shape: 0 });
    spawnP({ p, v: vel, life: 0.5, s0: size * 0.6, s1: size * 4.5, c0: vscl(hot, 2.2), c1: [0.2, 0.1, 0.05], a0: 0.9, a1: 0, shape: 1 });
    addLight(p, vscl(hot, 18 * Math.sqrt(size)), size * 9, 0.45);
  },
  sparks(p, n, base = [0, 0, 0], col = [5, 3.5, 1.5], spd = 25) { for (let i = 0; i < n; i++) spawnP({ p, v: vmad(base, randDir(frnd), frr(0.4, 1) * spd), life: frr(0.2, 0.6), s0: 0.08, s1: 0.03, c0: col, c1: [1.5, 0.4, 0.1], a0: 1, a1: 0, shape: 2, streak: 0.035, drag: 1 }); },
  puff(p, size, col, vel = [0, 0, 0], n = 6) { for (let i = 0; i < n; i++) { const d = randDir(frnd); spawnP({ p: vmad(p, d, size * 0.3), v: vmad(vel, d, frr(1, 4) * size), life: frr(0.8, 1.8), s0: size * 0.4, s1: size * 1.8, c0: col, c1: vscl(col, 0.3), a0: 0.6, a1: 0, shape: 3, drag: 1.5 }); } },
  icy(p, size, vel = [0, 0, 0]) {
    for (let i = 0; i < 18 + size * 4; i++) { const d = randDir(frnd); spawnP({ p: vmad(p, d, size * 0.3), v: vmad(vel, d, frr(4, 22) * (0.5 + size * 0.15)), life: frr(0.5, 1.6), s0: frr(0.1, 0.3), s1: 0.05, c0: [3, 4.5, 6], c1: [0.5, 0.8, 1.2], a0: 1, a1: 0, shape: 2, drag: 0.8 }); }
    FX.puff(p, size * 1.2, [0.35, 0.55, 0.8], vel, 8);
    spawnP({ p, v: vel, life: 0.35, s0: size, s1: size * 3, c0: [2, 3, 4], c1: [0.2, 0.4, 0.6], a0: 0.8, a1: 0, shape: 1 });
    addLight(p, [3, 6, 9], size * 6, 0.3);
  },
  goo(p, size, vel = [0, 0, 0], col = [0.2, 1.2, 0.8]) {
    for (let i = 0; i < 14 + size * 4; i++) { const d = randDir(frnd); spawnP({ p, v: vmad(vel, d, frr(3, 16) * (0.6 + size * 0.2)), life: frr(0.5, 1.4), s0: frr(0.2, 0.5) * (0.5 + size * 0.3), s1: 0.05, c0: vscl(col, 2.5), c1: vscl(col, 0.4), a0: 1, a1: 0, shape: 0, drag: 1.4 }); }
    FX.puff(p, size, [0.25, 0.08, 0.3], vel, 5);
    addLight(p, vscl(col, 6), size * 7, 0.3);
  }
};
// short-lived point lights fed to the mesh shader (max 16, strongest first)
const LIGHTS = [];
function addLight(p, col, r, life) { LIGHTS.push({ p: vcopy([0, 0, 0], p), col, r, life, max: life }); if (LIGHTS.length > 40) LIGHTS.shift(); }
function updateLights(dt) { for (let i = LIGHTS.length - 1; i >= 0; i--) { LIGHTS[i].life -= dt; if (LIGHTS[i].life <= 0) LIGHTS.splice(i, 1); } }
