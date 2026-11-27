// ---------- procedural mesh templates (one shared VBO/IBO, drawn instanced) ----------
// Template space: +Z forward, +Y up, +X = left side. Material ids: 0 rock, 1 ice, 2 painted metal, 3 dark metal,
// 4 emissive, 5 organic, 6 creature eye, 7 painted with lit windows, 8 hazard stripes, 9 glass. -1 = take from the instance.
class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.i = []; }
  get nv() { return this.p.length / 3; }
  v(p, n, col, m, u = 0, w = 0) { this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.c.push(col[0], col[1], col[2], m < 0 ? 0 : m + 1); this.uv.push(u, w); return this.nv - 1; }
  t(a, b, c) { this.i.push(a, b, c); }
  add(g, pos = [0, 0, 0], q = null, s = 1, col = null, m = null) {
    const base = this.nv, sv = typeof s === 'number' ? [s, s, s] : s; q = q || qid();
    for (let k = 0; k < g.nv; k++) {
      const p = qrot(q, [g.p[k * 3] * sv[0], g.p[k * 3 + 1] * sv[1], g.p[k * 3 + 2] * sv[2]]);
      const n = vnorm(qrot(q, [g.n[k * 3] / sv[0], g.n[k * 3 + 1] / sv[1], g.n[k * 3 + 2] / sv[2]]));
      this.p.push(p[0] + pos[0], p[1] + pos[1], p[2] + pos[2]); this.n.push(n[0], n[1], n[2]);
      const mm = m === null ? g.c[k * 4 + 3] : (m < 0 ? 0 : m + 1);
      if (col) this.c.push(col[0] * g.c[k * 4], col[1] * g.c[k * 4 + 1], col[2] * g.c[k * 4 + 2], mm); else this.c.push(g.c[k * 4], g.c[k * 4 + 1], g.c[k * 4 + 2], mm);
      this.uv.push(g.uv[k * 2], g.uv[k * 2 + 1]);
    }
    for (const ix of g.i) this.i.push(ix + base);
    return this;
  }
  flat() { // unshare vertices, face normals
    const g = new Geo();
    for (let f = 0; f < this.i.length; f += 3) {
      const ids = [this.i[f], this.i[f + 1], this.i[f + 2]], P = ids.map(k => [this.p[k * 3], this.p[k * 3 + 1], this.p[k * 3 + 2]]);
      const n = vnorm(vcross(vsub(P[1], P[0]), vsub(P[2], P[0])));
      const a = ids.map((k, j) => g.v(P[j], n, [this.c[k * 4], this.c[k * 4 + 1], this.c[k * 4 + 2]], this.c[k * 4 + 3] - 1, this.uv[k * 2], this.uv[k * 2 + 1]));
      g.t(a[0], a[1], a[2]);
    }
    return g;
  }
}
function qfromTo(a, b) {
  a = vnorm(a); b = vnorm(b); const d = vdot(a, b);
  if (d > 0.99999) return qid();
  if (d < -0.99999) { let ax = vcross([1, 0, 0], a); if (vlen(ax) < 1e-3) ax = vcross([0, 1, 0], a); return qaxis(ax, Math.PI); }
  const c = vcross(a, b); return qnorm([c[0], c[1], c[2], 1 + d]);
}
const QX90 = qaxis([1, 0, 0], Math.PI / 2); // +Y -> +Z
function box(sx, sy, sz, col = [1, 1, 1], m = -1) {
  const g = new Geo(), h = [sx / 2, sy / 2, sz / 2];
  for (let a = 0; a < 3; a++) for (const s of [1, -1]) {
    const ua = (a + 1) % 3, va = (a + 2) % 3, n = [0, 0, 0]; n[a] = s;
    let cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; if (s < 0) cs = cs.slice().reverse();
    const ids = cs.map(([i, j]) => { const p = [0, 0, 0]; p[a] = s * h[a]; p[ua] = i * h[ua]; p[va] = j * h[va]; return g.v(p, n, col, m, (i * 0.5 + 0.5) * 2 * h[ua], (j * 0.5 + 0.5) * 2 * h[va]); });
    g.t(ids[0], ids[1], ids[2]); g.t(ids[0], ids[2], ids[3]);
  }
  return g;
}
function cyl(r0, r1, h, seg, col = [1, 1, 1], m = -1, caps = true) {
  const g = new Geo(), sl = (r0 - r1) / h, B = [], T = [];
  for (let i = 0; i <= seg; i++) {
    const a = i / seg * TAU, c = Math.cos(a), s = Math.sin(a), n = vnorm([c, sl, s]);
    B.push(g.v([r0 * c, -h / 2, r0 * s], n, col, m, i / seg, 0)); T.push(g.v([r1 * c, h / 2, r1 * s], n, col, m, i / seg, 1));
  }
  for (let i = 0; i < seg; i++) { g.t(B[i], T[i], B[i + 1]); g.t(B[i + 1], T[i], T[i + 1]); }
  if (caps) {
    for (const top of [true, false]) {
      const r = top ? r1 : r0; if (r < 1e-4) continue;
      const y = top ? h / 2 : -h / 2, n = [0, top ? 1 : -1, 0], c0 = g.v([0, y, 0], n, col, m), R = [];
      for (let i = 0; i <= seg; i++) { const a = i / seg * TAU; R.push(g.v([r * Math.cos(a), y, r * Math.sin(a)], n, col, m)); }
      for (let i = 0; i < seg; i++) top ? g.t(c0, R[i + 1], R[i]) : g.t(c0, R[i], R[i + 1]);
    }
  }
  return g;
}
function sphere(r, ws, hs, col = [1, 1, 1], m = -1) {
  const g = new Geo(), idx = [];
  for (let j = 0; j <= hs; j++) {
    const th = j / hs * Math.PI, row = [];
    for (let i = 0; i <= ws; i++) { const ph = i / ws * TAU, n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; row.push(g.v(vscl(n, r), n, col, m, i / ws, j / hs)); }
    idx.push(row);
  }
  for (let j = 0; j < hs; j++) for (let i = 0; i < ws; i++) { const a = idx[j][i], b = idx[j + 1][i], c = idx[j][i + 1], d = idx[j + 1][i + 1]; g.t(a, c, b); g.t(c, d, b); }
  return g;
}
function torus(R, r, sR, sr, col = [1, 1, 1], m = -1, arc = TAU) {
  const g = new Geo(), idx = [];
  for (let i = 0; i <= sR; i++) {
    const ph = i / sR * arc, rad = [Math.cos(ph), 0, Math.sin(ph)], row = [];
    for (let j = 0; j <= sr; j++) { const ps = j / sr * TAU, n = vadd(vscl(rad, Math.cos(ps)), [0, Math.sin(ps), 0]); row.push(g.v(vadd(vscl(rad, R), vscl(n, r)), n, col, m, i / sR, j / sr)); }
    idx.push(row);
  }
  for (let i = 0; i < sR; i++) for (let j = 0; j < sr; j++) { const a = idx[i][j], b = idx[i][j + 1], c = idx[i + 1][j], d = idx[i + 1][j + 1]; g.t(a, b, c); g.t(c, b, d); }
  return g;
}
// cylinder between two points
function seg(g, a, b, r0, r1, col, m, n = 6) { const d = vsub(b, a), L = vlen(d); g.add(cyl(r0, r1, L, n, col, m), vlerp(a, b, 0.5), qfromTo([0, 1, 0], d)); }
function icosphere(sub) {
  const t = (1 + Math.sqrt(5)) / 2; let P = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(vnorm);
  let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let s = 0; s < sub; s++) {
    const cache = new Map(), NF = [];
    const mid = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (cache.has(k)) return cache.get(k); P.push(vnorm(vlerp(P[a], P[b], 0.5))); cache.set(k, P.length - 1); return P.length - 1; };
    for (const [a, b, c] of F) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); NF.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
    F = NF;
  }
  F = F.map(([a, b, c]) => vdot(vcross(vsub(P[b], P[a]), vsub(P[c], P[a])), vadd(vadd(P[a], P[b]), P[c])) < 0 ? [a, c, b] : [a, b, c]);
  return { P, F };
}
// displaced blob with smooth normals; rf(dir) -> radius; cf(dir, r) -> colour
function blobGeo(sub, rf, cf, m = -1, scl = [1, 1, 1]) {
  const { P, F } = icosphere(sub), g = new Geo();
  const pos = P.map(d => { const r = rf(d); return [d[0] * r * scl[0], d[1] * r * scl[1], d[2] * r * scl[2]]; });
  let maxr = 0; for (const p of pos) maxr = Math.max(maxr, vlen(p));
  const nor = pos.map(() => [0, 0, 0]);
  for (const [a, b, c] of F) { const n = vcross(vsub(pos[b], pos[a]), vsub(pos[c], pos[a])); for (const k of [a, b, c]) { nor[k][0] += n[0]; nor[k][1] += n[1]; nor[k][2] += n[2]; } }
  P.forEach((d, k) => g.v(vscl(pos[k], 1 / maxr), vnorm(nor[k]), cf(d, vlen(pos[k]) / maxr), m));
  for (const [a, b, c] of F) g.t(a, b, c);
  return g;
}
function rockGeo(seed, sub, m = -1) {
  const R = mkRng(seed), off = [R() * 50, R() * 50, R() * 50], amp = 0.22 + R() * 0.18, fq = 1.1 + R() * 0.8;
  const cr = []; for (let i = 0; i < 3 + Math.floor(R() * 5); i++) cr.push({ d: randDir(R), s: 0.15 + R() * 0.3, dep: 0.05 + R() * 0.09 });
  const scl = [1, 0.7 + R() * 0.3, 0.6 + R() * 0.35];
  const rf = d => {
    let r = 1 + amp * (fbm(d[0] * fq + off[0], d[1] * fq + off[1], d[2] * fq + off[2], 5) - 0.5) * 2;
    for (const c of cr) { const x = (1 - vdot(d, c.d)) / c.s; if (x < 1) r -= c.dep * (1 - x * x); else if (x < 1.6) r += c.dep * 0.35 * Math.sin((x - 1) / 0.6 * Math.PI); }
    return r;
  };
  return blobGeo(sub, rf, (d, r) => { const a = clamp(0.55 + (r - 0.8) * 1.6, 0.45, 1.05); return [a, a * 0.97, a * 0.94]; }, m, scl);
}
function iceGeo(seed) {
  const R = mkRng(seed), off = [R() * 50, R() * 50, R() * 50];
  const g = blobGeo(1 + (seed & 1), d => 1 + 0.35 * (fbm(d[0] * 1.3 + off[0], d[1] * 1.3 + off[1], d[2] * 1.3 + off[2], 3) - 0.5) * 2, () => [1, 1, 1], -1, [1, 0.8 + R() * 0.4, 1.2 + R() * 0.6]).flat();
  const n = 1 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) { const d = randDir(R); g.add(crystal(0.18 + R() * 0.15, 0.7 + R() * 0.7), vscl(d, 0.55), qfromTo([0, 1, 0], d)); }
  return g;
}
function crystal(r, h) { // hex prism with a pointed tip, flat shaded
  const g = new Geo(); g.add(cyl(r, r, h, 6, [1, 1, 1], -1, false), [0, h / 2, 0]); g.add(cyl(r, 0, h * 0.35, 6, [1, 1, 1], -1, false), [0, h + h * 0.175, 0]); return g.flat();
}

const TPL = {}; const TPL_LIST = [];
function reg(name, geo, cull = true) { const t = { name, geo, cull, id: TPL_LIST.length }; TPL[name] = t; TPL_LIST.push(t); return t; }

// colours
const C_DARK = [0.32, 0.33, 0.35], C_GREY = [0.55, 0.57, 0.6], C_ORANGE = [0.62, 0.19, 0.035], C_CREAM = [0.55, 0.51, 0.43], C_WHITE = [0.82, 0.84, 0.86];

function buildTemplates() {
  for (let i = 0; i < 5; i++) reg('rock' + i, rockGeo(101 + i * 17, 3));
  for (let i = 0; i < 3; i++) reg('rockLo' + i, rockGeo(301 + i * 13, 1));
  for (let i = 0; i < 4; i++) reg('ice' + i, iceGeo(501 + i * 7));
  reg('shard', crystal(0.22, 1.6));
  reg('chunk', blobGeo(0, d => 1 + 0.3 * (hash3(Math.round(d[0] * 9), Math.round(d[1] * 9), Math.round(d[2] * 9)) - 0.5), () => [1, 1, 1]).flat());
  reg('ringice', blobGeo(0, d => 1 + 0.4 * (hash3(Math.round(d[0] * 7 + 3), Math.round(d[1] * 7), Math.round(d[2] * 7)) - 0.5), () => [1, 1, 1], -1, [1, 0.6, 1.3]).flat());
  { const g = new Geo(); g.add(box(1, 0.07, 0.6), [0, 0, 0]); g.add(box(0.5, 0.07, 0.5), [0.45, 0, 0.3], qaxis([0, 1, 0], 0.7)); reg('mshard', g, false); }
  // hull plates
  for (let k = 0; k < 2; k++) {
    const g = new Geo();
    g.add(box(6, 0.28, 3.6)); for (const x of [-2, 0, 2]) g.add(box(0.25, 0.45, 3.3, C_DARK, 3), [x, -0.3, 0]);
    g.add(box(5.6, 0.3, 0.25, C_DARK, 3), [0, -0.32, k ? -1.2 : 1.2]);
    g.add(box(1.8, 0.28, 1.3), [k ? -3.1 : 3.2, 0, k ? 1.0 : -1.0], qaxis([0, 1, 0], k ? -0.5 : 0.4));
    reg('plate' + k, g, false);
  }
  { // girder truss, 10 m
    const g = new Geo(), c = [0.62, 0.55, 0.3];
    for (const [x, y] of [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]]) g.add(box(0.22, 0.22, 10, c, 2), [x, y, 0]);
    for (let z = -4.5; z <= 4.6; z += 1.5) { for (const s of [-1, 1]) { seg(g, [s * 0.6, -0.6, z], [s * 0.6, 0.6, z + 0.75], 0.07, 0.07, C_DARK, 3, 4); seg(g, [-0.6, s * 0.6, z], [0.6, s * 0.6, z + 0.75], 0.07, 0.07, C_DARK, 3, 4); } }
    reg('girder', g, false);
  }
  { // cargo pod, along Z
    const g = new Geo();
    g.add(cyl(1.2, 1.2, 4.2, 16, [1, 1, 1], -1, false), [0, 0, 0], QX90);
    for (const z of [-2.25, 2.25]) g.add(cyl(1.27, 1.27, 0.45, 16, C_DARK, 3), [0, 0, z], QX90);
    g.add(cyl(1.23, 1.23, 0.6, 16, [1, 1, 1], 8, false), [0, 0, 0], QX90);
    for (const z of [-1.3, 1.3]) g.add(torus(1.24, 0.07, 20, 4, C_DARK, 3), [0, 0, z], QX90);
    g.add(sphere(0.2, 8, 6, [1, 0.5, 0.15], 4), [0, 1.28, 0]);
    g.add(box(0.25, 0.25, 1.4, C_DARK, 3), [0, -1.25, 0]);
    reg('pod', g);
  }
  { // dead drone
    const g = new Geo();
    g.add(sphere(1, 16, 12, C_WHITE, 2));
    g.add(sphere(0.48, 12, 8, [1, 1, 1], 9), [0, 0, 0.72]);
    g.add(sphere(0.09, 6, 4, [1, 0.15, 0.1], 4), [0, 0, 1.2]);
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + Math.PI / 4, d = [Math.cos(a), 0, Math.sin(a)]; seg(g, vscl(d, 0.7), vscl(d, 1.9), 0.09, 0.07, C_DARK, 3, 5); g.add(torus(0.5, 0.06, 16, 4, C_GREY, 3), vadd(vscl(d, 1.95), [0, 0.12, 0])); }
    seg(g, [0, 0.9, -0.2], [0, 1.9, -0.4], 0.03, 0.02, C_DARK, 3, 4);
    reg('drone', g);
  }
  { // engine core
    const g = new Geo();
    g.add(cyl(1.05, 1.05, 3.6, 18, C_DARK, 3), [0, 0, 0], QX90);
    for (const z of [-1.1, 0, 1.1]) g.add(torus(1.12, 0.13, 24, 6, [0.35, 0.85, 1], 4), [0, 0, z], QX90);
    for (const z of [-1.82, 1.82]) g.add(cyl(0.6, 0.6, 0.06, 16, [0.5, 0.9, 1], 4), [0, 0, z], QX90);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; g.add(box(0.08, 0.7, 3.0, C_GREY, 3), [Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0], qaxis([0, 0, 1], a + Math.PI / 2)); }
    reg('core', g);
  }
  // hull mite (two leg poses for stop-motion scuttle)
  for (let pose = 0; pose < 2; pose++) {
    const g = new Geo(), body = [0.22, 0.1, 0.27], glow = [0.2, 1, 0.85];
    g.add(sphere(1, 14, 10, body, 5), [0, 0, 0], null, [0.85, 0.5, 1.15]);
    g.add(sphere(0.42, 10, 8, [0.18, 0.08, 0.2], 5), [0, 0.05, 1.05]);
    for (let i = 0; i < 5; i++) g.add(sphere(0.12, 6, 4, glow, 4), [0, 0.47, -0.7 + i * 0.32]);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) g.add(sphere(0.08, 6, 4, glow, 4), [s * 0.45, 0.33, -0.45 + i * 0.4]);
    for (const s of [-1, 1]) { g.add(sphere(0.085, 6, 4, [1, 0.35, 0.1], 4), [s * 0.18, 0.2, 1.38]); seg(g, [s * 0.12, -0.05, 1.3], [s * 0.05, -0.15, 1.85], 0.07, 0.01, [0.8, 0.75, 0.6], 0, 5); }
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const ph = ((i + (s > 0 ? 1 : 0)) % 2 === pose) ? 0.3 : -0.3, z = -0.55 + i * 0.55;
      const hip = [s * 0.6, -0.05, z], knee = [s * 1.35, 0.45, z + 0.25 + ph], foot = [s * 1.75, -0.55, z + 0.35 + ph * 1.5];
      seg(g, hip, knee, 0.1, 0.07, body, 5, 5); seg(g, knee, foot, 0.07, 0.02, body, 5, 5);
    }
    reg('mite' + pose, g);
  }
  { // the tug "Second Mortgage"
    const g = new Geo();
    g.add(box(3.4, 2.0, 6.0, C_ORANGE, 2), [0, 0, -0.5]);
    g.add(box(3.0, 0.6, 5.4, C_DARK, 3), [0, -1.2, -0.5]);
    g.add(box(3.9, 1.2, 0.8, [1, 1, 1], 8), [0, -0.2, 2.85]);
    for (const s of [-1, 1]) { g.add(box(0.5, 0.5, 2.2, C_DARK, 3), [s * 1.45, -0.35, 3.9]); g.add(box(0.7, 0.35, 0.5, C_GREY, 3), [s * 1.3, -0.35, 5.0], qaxis([0, 1, 0], s * 0.5)); }
    g.add(box(2.3, 1.2, 2.0, C_CREAM, 2), [0, 1.55, 1.1]);
    g.add(box(2.36, 0.42, 1.5, [1, 1, 1], 9), [0, 1.66, 1.15]);
    g.add(box(1.9, 0.42, 0.1, [1, 1, 1], 9), [0, 1.66, 2.12]);
    g.add(box(2.45, 0.12, 2.15, C_DARK, 3), [0, 2.18, 1.1]);
    for (const s of [-1, 1]) {
      g.add(cyl(0.85, 0.85, 3.2, 16, C_GREY, 2), [s * 2.35, -0.1, -2.6], QX90);
      g.add(cyl(0.95, 0.62, 1.0, 16, C_DARK, 3, false), [s * 2.35, -0.1, -4.65], QX90);
      g.add(cyl(0.58, 0.58, 0.05, 16, [0.55, 0.8, 1], 4), [s * 2.35, -0.1, -4.6], QX90);
      g.add(torus(0.88, 0.08, 18, 4, [0.9, 0.7, 0.1], 2), [s * 2.35, -0.1, -1.2], QX90);
      g.add(box(1.25, 0.5, 1.7, C_DARK, 3), [s * 1.75, -0.1, -2.4]);
      g.add(box(0.9, 0.9, 1.6, C_DARK, 3), [s * 2.05, 0.85, 0.4]);
      for (const [x, y] of [[-0.2, -0.2], [0.2, -0.2], [0.2, 0.2], [-0.2, 0.2]]) g.add(cyl(0.14, 0.14, 0.06, 8, [1, 0.2, 0.1], 4), [s * 2.05 + x, 0.85 + y, 1.21], QX90);
      g.add(sphere(0.13, 6, 4, s > 0 ? [1, 0.12, 0.08] : [0.1, 1, 0.3], 4), [s * 1.76, 0.25, 1.6]);
      g.add(box(0.32, 0.22, 0.1, [1, 0.95, 0.85], 4), [s * 1.25, 0.85, 2.53]);
    }
    g.add(cyl(0.5, 0.6, 1.1, 12, C_DARK, 3), [0, 1.5, -1.4]);
    g.add(cyl(0.45, 0.5, 0.5, 10, C_DARK, 3), [0, 1.2, -3.0]);
    seg(g, [0, 1.45, -3.0], [0.1, 2.3, -1.8], 0.18, 0.16, [0.9, 0.68, 0.1], 2, 6);
    seg(g, [0.1, 2.3, -1.8], [0.1, 1.6, -0.2], 0.14, 0.12, [0.9, 0.68, 0.1], 2, 6);
    g.add(box(0.5, 0.25, 0.4, C_DARK, 3), [0.1, 1.45, -0.15]);
    seg(g, [-1.2, 2.2, 0.4], [-1.2, 3.9, 0.2], 0.04, 0.025, C_DARK, 3, 4);
    g.add(sphere(0.07, 6, 4, [1, 0.15, 0.1], 4), [-1.2, 3.92, 0.2]);
    for (const x of [-0.9, -0.3, 0.3, 0.9]) g.add(box(0.06, 0.55, 1.5, C_GREY, 3), [x, 1.28, -2.0]);
    reg('tug', g);
  }
  { // turret, pivot at origin, aims +Z
    const g = new Geo();
    g.add(cyl(0.72, 0.78, 0.35, 16, C_DARK, 3), [0, 0.17, 0]);
    g.add(box(1.15, 0.7, 1.25, C_ORANGE, 2), [0, 0.6, 0]);
    g.add(box(1.2, 0.12, 1.3, C_DARK, 3), [0, 0.97, 0]);
    for (const s of [-1, 1]) { g.add(cyl(0.11, 0.11, 2.1, 8, C_DARK, 3), [s * 0.28, 0.6, 1.5], QX90); g.add(cyl(0.16, 0.16, 0.35, 8, C_GREY, 3), [s * 0.28, 0.6, 2.5], QX90); }
    g.add(box(0.3, 0.25, 0.32, C_DARK, 3), [-0.35, 1.12, 0.3]); g.add(sphere(0.08, 6, 4, [0.3, 0.9, 1], 4), [-0.35, 1.12, 0.48]);
    reg('turret', g);
  }
  { // homing missile
    const g = new Geo();
    g.add(cyl(0.16, 0.16, 1.1, 8, C_WHITE, 2), [0, 0, 0], QX90);
    g.add(cyl(0.16, 0.0, 0.35, 8, [0.9, 0.2, 0.15], 2, false), [0, 0, 0.72], QX90);
    for (let k = 0; k < 4; k++) g.add(box(0.03, 0.32, 0.3, C_DARK, 3), [0, 0, -0.42], qaxis([0, 0, 1], k * Math.PI / 2 + Math.PI / 4));
    reg('missile', g);
  }
  reg('gem', sphere(0.5, 4, 2, [1, 1, 1], 4).flat());
  { const g = new Geo(); g.add(box(0.8, 0.8, 0.8, C_WHITE, 2)); for (const q of [qid(), qaxis([0, 1, 0], Math.PI / 2), qaxis([1, 0, 0], Math.PI / 2)]) { g.add(box(0.86, 0.22, 0.22, [0.2, 1, 0.35], 4), [0, 0, 0], q); g.add(box(0.22, 0.86, 0.22, [0.2, 1, 0.35], 4), [0, 0, 0], q); } reg('kit', g); }
  // ---- scenery ----
  { const g = new Geo(); g.add(cyl(1, 1, 2, 10, [1, 1, 1], -1, false), [0, 0, 0], QX90); reg('hullseg', g, false); }
  reg('beacon', sphere(1, 8, 6, [1, 1, 1], 4));
  reg('rib', torus(1, 0.05, 30, 4, [1, 1, 1], -1, Math.PI * 1.25));
  { const g = new Geo(); g.add(cyl(1, 0.22, 1.6, 10, [1, 1, 1], -1, false), [0, 0, 0.8], QX90); reg('bow', g, false); }
  { const g = new Geo(); g.add(box(1, 1.4, 1.2)); g.add(box(0.75, 0.6, 0.95), [0, 1.0, 0]); g.add(box(1.1, 0.08, 1.3, C_DARK, 3), [0, 0.72, 0]); seg(g, [0.2, 1.3, 0], [0.2, 2.4, 0], 0.03, 0.02, C_DARK, 3, 4); g.add(cyl(0.35, 0.05, 0.25, 10, C_GREY, 3), [-0.2, 1.4, 0.3], qaxis([1, 0, 0], -0.6)); reg('tower', g); }
  { const g = new Geo(); g.add(cyl(1.0, 0.38, 1.2, 16, C_DARK, 3, false), [0, 0, 0], QX90); g.add(cyl(0.4, 0.4, 0.4, 12, C_GREY, 3), [0, 0, 0.75], QX90); reg('bell', g, false); }
  { const g = new Geo(); seg(g, [0, 0, -1], [0, 0, 1], 0.04, 0.04, C_DARK, 3, 5); for (const z of [-0.6, 0, 0.6]) seg(g, [-0.3, 0, z], [0.3, 0, z], 0.02, 0.02, C_DARK, 3, 4); reg('mast', g); }
  { const g = new Geo(); g.add(box(2.4, 2.6, 12)); for (let z = -5.4; z <= 5.5; z += 0.9) for (const s of [-1, 1]) g.add(box(0.08, 2.4, 0.18), [s * 1.22, 0, z]); for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(box(0.3, 0.3, 12.1, C_DARK, 3), [x * 1.1, y * 1.2, 0]); reg('container', g); }
  // ---- creature ----
  reg('blob', blobGeo(2, d => 1 + 0.4 * (fbm(d[0] * 2.4 + 9, d[1] * 2.4, d[2] * 2.4, 4) - 0.5) * 2, () => [1, 1, 1], -1, [1, 0.75, 1]));
  reg('bhead', blobGeo(3, d => {
    let r = 1 + 0.12 * (fbm(d[0] * 2.5 + 3, d[1] * 2.5, d[2] * 2.5, 4) - 0.5) * 2 + 0.06 * Math.sin(Math.atan2(d[1], d[0]) * 7) * (1 - Math.abs(d[2]));
    if (d[2] > 0.82) r -= (d[2] - 0.82) * 2.2; return r;
  }, d => { const f = d[2] > 0.78 ? 0.25 : 1; return [0.34 * f, 0.13 * f, 0.3 * f]; }, 5, [1, 0.9, 1.15]));
  { const g = new Geo(); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, c = [Math.cos(a), Math.sin(a), 0]; seg(g, c, vadd(vscl(c, 0.62), [0, 0, 0.55]), 0.13, 0.0, [0.86, 0.8, 0.64], 0, 6); } reg('bteeth', g); }
  reg('beye', sphere(1, 22, 16, [1, 1, 1], 6));
  reg('bcore', sphere(1, 22, 16, [1, 0.55, 0.75], 4));
  { const g = new Geo(); g.add(sphere(1, 14, 10, [1, 0.5, 0.25], 4)); g.add(torus(0.95, 0.35, 16, 8, [0.3, 0.1, 0.28], 5), [0, -0.45, 0]); reg('node', g); }
  { const g = torus(1, 0.3, 48, 12, [0.19, 0.065, 0.16], 5); for (let k = 0; k < g.nv; k++) { const x = g.p[k * 3], y = g.p[k * 3 + 1], z = g.p[k * 3 + 2], f = 1 + 0.75 * (fbm(x * 3.1, y * 3.1 + 4, z * 3.1, 4) - 0.45) * 2, c = Math.hypot(x, z) || 1; const cx = x / c, cz = z / c; g.p[k * 3] = cx + (x - cx) * f; g.p[k * 3 + 1] = y * f; g.p[k * 3 + 2] = cz + (z - cz) * f; } reg('brim', g); }
}

// Upload all templates into shared buffers.
const MESH = { vao: null, inst: null, instCap: 0 };
function uploadTemplates() {
  let nv = 0, ni = 0; for (const t of TPL_LIST) { nv += t.geo.nv; ni += t.geo.i.length; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), C = new Uint8Array(nv * 4), UV = new Float32Array(nv * 2), I = new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const t of TPL_LIST) {
    const g = t.geo; P.set(g.p, vo * 3); N.set(g.n, vo * 3); UV.set(g.uv, vo * 2);
    for (let k = 0; k < g.nv; k++) { C[(vo + k) * 4] = clamp(g.c[k * 4] * 255, 0, 255); C[(vo + k) * 4 + 1] = clamp(g.c[k * 4 + 1] * 255, 0, 255); C[(vo + k) * 4 + 2] = clamp(g.c[k * 4 + 2] * 255, 0, 255); C[(vo + k) * 4 + 3] = g.c[k * 4 + 3]; }
    t.first = io; t.count = g.i.length;
    for (let k = 0; k < g.i.length; k++) I[io + k] = g.i[k] + vo;
    vo += g.nv; io += g.i.length;
    t.radius = 0; for (let k = 0; k < g.nv; k++) t.radius = Math.max(t.radius, Math.hypot(g.p[k * 3], g.p[k * 3 + 1], g.p[k * 3 + 2]));
    t.geo = null;
  }
  MESH.vao = gl.createVertexArray(); gl.bindVertexArray(MESH.vao);
  const vb = (data, loc, size, type, norm) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, type, norm, 0, 0); return b; };
  vb(P, 0, 3, gl.FLOAT, false); vb(N, 1, 3, gl.FLOAT, false); vb(C, 2, 4, gl.UNSIGNED_BYTE, true); vb(UV, 3, 2, gl.FLOAT, false);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, I, gl.STATIC_DRAW);
  for (let l = 4; l <= 8; l++) { gl.enableVertexAttribArray(l); gl.vertexAttribDivisor(l, 1); }
  gl.bindVertexArray(null);
  MESH.stats = { verts: nv, tris: ni / 3 };
}
// a separate VAO with dynamic geometry (tentacles) using the same attribute layout and one instance
const DYNMESH = { vao: null, cap: 0 };
function initDynMesh() {
  DYNMESH.vao = gl.createVertexArray(); gl.bindVertexArray(DYNMESH.vao);
  DYNMESH.pb = gl.createBuffer(); DYNMESH.nb = gl.createBuffer(); DYNMESH.cb = gl.createBuffer(); DYNMESH.ub = gl.createBuffer(); DYNMESH.ib = gl.createBuffer(); DYNMESH.instb = gl.createBuffer();
  const at = (b, loc, size, type, norm) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, type, norm, 0, 0); };
  at(DYNMESH.pb, 0, 3, gl.FLOAT, false); at(DYNMESH.nb, 1, 3, gl.FLOAT, false); at(DYNMESH.cb, 2, 4, gl.UNSIGNED_BYTE, true); at(DYNMESH.ub, 3, 2, gl.FLOAT, false);
  gl.bindBuffer(gl.ARRAY_BUFFER, DYNMESH.instb);
  const inst = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, 5, 0.6, 0, 0, 0]);
  gl.bufferData(gl.ARRAY_BUFFER, inst, gl.DYNAMIC_DRAW);
  for (let l = 4; l <= 8; l++) { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.FLOAT, false, 80, (l - 4) * 16); gl.vertexAttribDivisor(l, 1); }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, DYNMESH.ib);
  gl.bindVertexArray(null);
}
