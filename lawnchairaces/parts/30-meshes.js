// Procedural geometry. Vertex layout: pos3, nrm3, col4 (rgb albedo, a = material code).
// Material code: 0 matte, 0.3 wood/fabric, 0.55 plastic, 0.75 rubber/painted gloss, 0.95 metal.
class MB {
  constructor() { this.d = []; }
  vtx(p, n, c) { this.d.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], c[3] === undefined ? 0 : c[3]); }
  tri(a, b, c, col, n) {
    n = n || v3.norm(v3.cross(v3.sub(b, a), v3.sub(c, a)));
    this.vtx(a, n, col); this.vtx(b, n, col); this.vtx(c, n, col);
  }
  quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
  // cylinder / cone frustum between two points
  tube(p0, p1, r0, r1, seg, col, caps) {
    const ax = v3.sub(p1, p0), L = v3.len(ax); if (L < 1e-6) return;
    const w = v3.mul(ax, 1 / L);
    let u = Math.abs(w[1]) < 0.9 ? v3.norm(v3.cross(w, [0, 1, 0])) : v3.norm(v3.cross(w, [1, 0, 0]));
    const v = v3.cross(w, u);
    const slope = (r0 - r1) / L;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
      const d0 = v3.add(v3.mul(u, Math.cos(a0)), v3.mul(v, Math.sin(a0)));
      const d1 = v3.add(v3.mul(u, Math.cos(a1)), v3.mul(v, Math.sin(a1)));
      const n0 = v3.norm(v3.add(d0, v3.mul(w, slope))), n1 = v3.norm(v3.add(d1, v3.mul(w, slope)));
      const A = v3.add(p0, v3.mul(d0, r0)), B = v3.add(p0, v3.mul(d1, r0));
      const C = v3.add(p1, v3.mul(d1, r1)), D = v3.add(p1, v3.mul(d0, r1));
      this.vtx(A, n0, col); this.vtx(B, n1, col); this.vtx(C, n1, col);
      this.vtx(A, n0, col); this.vtx(C, n1, col); this.vtx(D, n0, col);
      if (caps) {
        if (r0 > 0) this.tri(p0, B, A, col, v3.mul(w, -1));
        if (r1 > 0) this.tri(p1, D, C, col, w);
      }
    }
  }
  // polyline tube with sphere-ish joints
  path(pts, r, seg, col) {
    for (let i = 0; i < pts.length - 1; i++) this.tube(pts[i], pts[i + 1], r, r, seg, col, false);
    for (const p of pts) this.ellip(p, [r, r, r], 6, 4, col);
  }
  ellip(c, rad, seg, rings, col, noiseAmp, seed) {
    const P = (i, j) => {
      const th = i / rings * Math.PI, ph = j / seg * TAU;
      let n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      let k = 1;
      if (noiseAmp) k = 1 + noiseAmp * vnoise(n[0] * 2.3 + n[1] * 1.7 + seed, n[2] * 2.3 - n[1] * 1.1, 91);
      return [[c[0] + n[0] * rad[0] * k, c[1] + n[1] * rad[1] * k, c[2] + n[2] * rad[2] * k], v3.norm([n[0] / rad[0], n[1] / rad[1], n[2] / rad[2]])];
    };
    for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
      const a = P(i, j), b = P(i + 1, j), cc = P(i + 1, j + 1), d = P(i, j + 1);
      this.vtx(a[0], a[1], col); this.vtx(b[0], b[1], col); this.vtx(cc[0], cc[1], col);
      this.vtx(a[0], a[1], col); this.vtx(cc[0], cc[1], col); this.vtx(d[0], d[1], col);
    }
  }
  // oriented box: centre, half sizes along basis (x,y,z default axes)
  box(c, h, col, bx, by, bz) {
    bx = bx || [1, 0, 0]; by = by || [0, 1, 0]; bz = bz || [0, 0, 1];
    const P = (sx, sy, sz) => v3.add(c, v3.add(v3.mul(bx, sx * h[0]), v3.add(v3.mul(by, sy * h[1]), v3.mul(bz, sz * h[2]))));
    const faces = [
      [bx, [1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]],
      [v3.mul(bx, -1), [-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]],
      [by, [-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]],
      [v3.mul(by, -1), [-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]],
      [bz, [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
      [v3.mul(bz, -1), [1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]],
    ];
    for (const f of faces) {
      const q = f.slice(1).map((s) => P(s[0], s[1], s[2]));
      this.vtx(q[0], f[0], col); this.vtx(q[1], f[0], col); this.vtx(q[2], f[0], col);
      this.vtx(q[0], f[0], col); this.vtx(q[2], f[0], col); this.vtx(q[3], f[0], col);
    }
  }
  // lathe around Y: profile [[r, y], ...] from top to bottom
  lathe(prof, seg, col, colFn) {
    const N = prof.length;
    const nrm2 = [];
    for (let i = 0; i < N; i++) {
      const a = prof[Math.max(0, i - 1)], b = prof[Math.min(N - 1, i + 1)];
      const dr = b[0] - a[0], dy = b[1] - a[1];
      let n = [-dy, dr]; const l = Math.hypot(n[0], n[1]) || 1; n = [n[0] / l, n[1] / l];
      if (n[0] < 0) n = [-n[0], -n[1]];
      nrm2.push(n);
    }
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < seg; j++) {
      const ph0 = j / seg * TAU, ph1 = (j + 1) / seg * TAU;
      const V = (k, ph) => [[prof[k][0] * Math.cos(ph), prof[k][1], prof[k][0] * Math.sin(ph)], [nrm2[k][0] * Math.cos(ph), nrm2[k][1], nrm2[k][0] * Math.sin(ph)]];
      const a = V(i, ph0), b = V(i + 1, ph0), c = V(i + 1, ph1), d = V(i, ph1);
      const ca = colFn ? colFn(i) : col, cb = colFn ? colFn(i + 1) : col;
      this.vtx(a[0], a[1], ca); this.vtx(c[0], c[1], cb); this.vtx(b[0], b[1], cb);
      this.vtx(a[0], a[1], ca); this.vtx(d[0], d[1], ca); this.vtx(c[0], c[1], cb);
    }
  }
  // extrude a closed side profile [[z, y], ...] across x = +-hw, with a bevel of size bv
  extrude(prof, hw, bv, col) {
    const N = prof.length;
    let cz = 0, cy = 0; for (const p of prof) { cz += p[0]; cy += p[1]; } cz /= N; cy /= N;
    const inset = prof.map((p) => { const dz = p[0] - cz, dy = p[1] - cy, l = Math.hypot(dz, dy) || 1; return [p[0] - dz / l * bv, p[1] - dy / l * bv]; });
    for (let i = 0; i < N; i++) {
      const a = prof[i], b = prof[(i + 1) % N], ai = inset[i], bi = inset[(i + 1) % N];
      const e = [0, b[1] - a[1], b[0] - a[0]], el = Math.hypot(e[1], e[2]) || 1;
      const out = [0, e[2] / el, -e[1] / el];
      // pick outward direction relative to the centroid
      const mid = [0, (a[1] + b[1]) / 2 - cy, (a[0] + b[0]) / 2 - cz];
      const n = (out[1] * mid[1] + out[2] * mid[2]) < 0 ? [0, -out[1], -out[2]] : out;
      const hw2 = hw - bv;
      this.quad([hw2, a[1], a[0]], [hw2, b[1], b[0]], [-hw2, b[1], b[0]], [-hw2, a[1], a[0]], col);
      for (const s of [1, -1]) {
        const nb = v3.norm([s * 0.7, n[1], n[2]]);
        const A = [s * hw2, a[1], a[0]], B = [s * hw2, b[1], b[0]], C = [s * hw, bi[1], bi[0]], D = [s * hw, ai[1], ai[0]];
        this.vtx(A, nb, col); this.vtx(B, nb, col); this.vtx(C, nb, col);
        this.vtx(A, nb, col); this.vtx(C, nb, col); this.vtx(D, nb, col);
      }
    }
    const tris = earClip(inset);
    for (const s of [1, -1]) {
      for (const [i, j, k] of tris) {
        const A = [s * hw, inset[i][1], inset[i][0]], B = [s * hw, inset[j][1], inset[j][0]], C = [s * hw, inset[k][1], inset[k][0]];
        this.vtx(A, [s, 0, 0], col); this.vtx(B, [s, 0, 0], col); this.vtx(C, [s, 0, 0], col);
      }
    }
  }
  transform(m, from) {
    const d = this.d;
    for (let i = (from || 0); i < d.length; i += 10) {
      const p = m4.xform(m, [d[i], d[i + 1], d[i + 2]]);
      const n = v3.norm(m4.xdir(m, [d[i + 3], d[i + 4], d[i + 5]]));
      d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = n[0]; d[i + 4] = n[1]; d[i + 5] = n[2];
    }
  }
  mark() { return this.d.length; }
  f32() { return new Float32Array(this.d); }
}
const LAYOUT_OBJ = [[0, 3], [1, 3], [2, 4]];
// ear clipping for a simple polygon [[x, y], ...]; returns index triples
function earClip(pts) {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const idx = [...Array(n).keys()];
  if (area < 0) idx.reverse();
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const inside = (p, a, b, c) => cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0;
  const out = [];
  let guard = 0;
  while (idx.length > 3 && guard++ < 1000) {
    let cut = false;
    for (let i = 0; i < idx.length; i++) {
      const i0 = idx[(i + idx.length - 1) % idx.length], i1 = idx[i], i2 = idx[(i + 1) % idx.length];
      const a = pts[i0], b = pts[i1], c = pts[i2];
      if (cross(a, b, c) <= 1e-12) continue;
      let ok = true;
      for (const j of idx) { if (j === i0 || j === i1 || j === i2) continue; if (inside(pts[j], a, b, c)) { ok = false; break; } }
      if (!ok) continue;
      out.push([i0, i1, i2]); idx.splice(i, 1); cut = true; break;
    }
    if (!cut) break;
  }
  if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
  return out;
}

// ---------- balloon (unit radius, +Y up, neck at bottom) ----------
function buildBalloon(seg) {
  const prof = [[0.0, 1.0], [0.24, 0.975], [0.47, 0.89], [0.68, 0.74], [0.85, 0.53], [0.96, 0.28], [1.0, 0.02], [0.98, -0.22],
    [0.9, -0.46], [0.76, -0.68], [0.57, -0.86], [0.37, -0.99], [0.2, -1.08], [0.09, -1.13], [0.055, -1.16], [0.07, -1.19], [0.075, -1.22], [0.0, -1.25]];
  const mb = new MB();
  mb.lathe(prof, seg, [1, 1, 1, 0], (i) => [1, 1, 1, i >= 13 ? 1 : 0]);   // a = 1 marks the knot (thicker, no transmission)
  return mb.f32();
}

// ---------- folding aluminium lawn chair, seat centre at origin, facing +Z ----------
function buildChair(webA, webB) {
  const mb = new MB();
  const al = [0.78, 0.8, 0.82, 0.95];
  const rT = 0.0125;
  const W = 0.29, D = 0.25, legH = 0.36, backH = 0.62, armH = 0.23;
  const tilt = 0.18; // back leans back
  // seat frame
  const fl = [W, 0, D], fr = [-W, 0, D], bl = [W, -0.02, -D], br = [-W, -0.02, -D];
  mb.path([fl, fr], rT, 8, al); mb.path([bl, br], rT, 8, al);
  mb.path([fl, bl], rT, 8, al); mb.path([fr, br], rT, 8, al);
  // back uprights
  const tl = [W - 0.01, backH, -D - backH * tilt], tr = [-W + 0.01, backH, -D - backH * tilt];
  mb.path([bl, tl], rT, 8, al); mb.path([br, tr], rT, 8, al); mb.path([tl, tr], rT, 8, al);
  // legs: U runners each side
  const ffl = [W + 0.02, -legH, D + 0.06], fbl = [W + 0.02, -legH, -D - 0.1];
  const ffr = [-W - 0.02, -legH, D + 0.06], fbr = [-W - 0.02, -legH, -D - 0.1];
  mb.path([fl, ffl, fbl, bl], rT, 8, al);
  mb.path([fr, ffr, fbr, br], rT, 8, al);
  // arm supports and armrests
  const al0 = [W + 0.03, armH, D + 0.02], ar0 = [-W - 0.03, armH, D + 0.02];
  const al1 = [W + 0.01, armH, -D - armH * tilt], ar1 = [-W - 0.01, armH, -D - armH * tilt];
  mb.path([[W + 0.02, 0, D], al0], rT, 8, al); mb.path([[-W - 0.02, 0, D], ar0], rT, 8, al);
  const armCol = [0.92, 0.9, 0.85, 0.55];
  mb.box(v3.lerp(al0, al1, 0.5), [0.028, 0.012, v3.dist(al0, al1) / 2 + 0.03], armCol);
  mb.box(v3.lerp(ar0, ar1, 0.5), [0.028, 0.012, v3.dist(ar0, ar1) / 2 + 0.03], armCol);
  // webbing: woven straps, seat sags a little
  const cols = [webA, webB, [0.95, 0.95, 0.9, 0.3]];
  const sw = 0.026, th = 0.004;
  const nS = 5;
  for (let i = 0; i < nS; i++) { // straps front-back across seat
    const x = lerp(-W + 0.05, W - 0.05, i / (nS - 1));
    const c = cols[i % 3];
    const pts = [];
    for (let k = 0; k <= 6; k++) { const t = k / 6; const z = lerp(D, -D, t); pts.push([x, -0.03 * Math.sin(t * Math.PI) - 0.004 * ((k + i) % 2), z]); }
    for (let k = 0; k < 6; k++) { const a = pts[k], b = pts[k + 1]; mb.box(v3.lerp(a, b, 0.5), [sw, th, v3.dist(a, b) / 2 + 0.002], c, [1, 0, 0], v3.norm(v3.cross(v3.sub(b, a), [1, 0, 0])), v3.norm(v3.sub(b, a))); }
  }
  for (let i = 0; i < 4; i++) { // straps side-to-side across seat
    const z = lerp(D - 0.05, -D + 0.05, i / 3);
    const sag = -0.03 * Math.sin((i / 3 * 0.8 + 0.1) * Math.PI);
    mb.box([0, sag + 0.002, z], [W, th, sw], cols[(i + 1) % 3]);
  }
  // back webbing
  const up = v3.norm(v3.sub(tl, bl)), side = [1, 0, 0], nb = v3.norm(v3.cross(side, up));
  for (let i = 0; i < 6; i++) {
    const t = (i + 0.5) / 6; const c = v3.lerp(v3.lerp(bl, br, 0.5), v3.lerp(tl, tr, 0.5), t);
    mb.box(v3.add(c, v3.mul(nb, -0.01)), [W - 0.005, sw, th], cols[i % 3], side, up, nb);
  }
  for (let i = 0; i < 4; i++) {
    const x = lerp(-W + 0.07, W - 0.07, i / 3);
    const c = v3.lerp([x, bl[1], bl[2]], [x, tl[1], tl[2]], 0.5);
    mb.box(v3.add(c, v3.mul(nb, -0.006)), [sw, v3.dist(bl, tl) / 2, th], cols[(i + 2) % 3], side, up, nb);
  }
  // rigging ties at the back of the armrests and the top of the back, so the ropes rise
  // beside and behind the pilot's head instead of across the view
  return { data: mb.f32(), tie: [al1, ar1, tl, tr] };
}

// ---------- leaf blower strapped to the back of the chair (chair frame) ----------
function buildBlower() {
  const mb = new MB();
  const orange = [0.92, 0.38, 0.05, 0.6], black = [0.05, 0.05, 0.055, 0.5], grey = [0.45, 0.46, 0.47, 0.9];
  // frame plate and straps on the chair back
  mb.box([0, 0.3, -0.43], [0.2, 0.2, 0.012], black, [1, 0, 0], v3.norm([0, 1, -0.18]), v3.norm([0, 0.18, 1]));
  mb.box([0, 0.42, -0.4], [0.3, 0.016, 0.01], black); mb.box([0, 0.16, -0.38], [0.3, 0.016, 0.01], black);
  // engine housing and fuel tank
  mb.ellip([0, 0.32, -0.56], [0.15, 0.17, 0.12], 14, 10, orange);
  mb.box([0, 0.12, -0.55], [0.13, 0.05, 0.1], orange);
  mb.tube([-0.12, 0.32, -0.56], [-0.17, 0.32, -0.56], 0.07, 0.07, 14, grey, true);   // fan cover
  mb.tube([-0.17, 0.32, -0.56], [-0.18, 0.32, -0.56], 0.06, 0.06, 14, black, true);
  mb.box([0.05, 0.5, -0.6], [0.04, 0.03, 0.05], black);                                  // pull-start handle
  // blower tube: out of the housing, down and back to the nozzle
  mb.path([[0.12, 0.25, -0.58], [0.16, 0.18, -0.68], [0.15, 0.1, -0.82]], 0.045, 12, black);
  mb.tube([0.15, 0.1, -0.82], [0.13, 0.02, -1.02], 0.042, 0.03, 12, orange, true);
  mb.tube([0.13, 0.02, -1.02], [0.128, 0.015, -1.05], 0.031, 0.031, 12, black, true);
  return mb.f32();
}
// ---------- ballast jug (hang point at origin) ----------
function buildJug() {
  const mb = new MB();
  const c = [0.86, 0.9, 0.92, 0.55];
  mb.box([0, -0.2, 0], [0.075, 0.12, 0.075], c);
  mb.ellip([0, -0.08, 0], [0.075, 0.035, 0.075], 8, 4, c);
  mb.tube([0, -0.06, 0.03], [0, -0.01, 0.03], 0.022, 0.018, 8, [0.15, 0.35, 0.8, 0.55], true); // cap
  mb.path([[0, -0.06, -0.05], [0, -0.005, -0.04], [0, -0.0, 0.0], [0, -0.07, -0.0]], 0.008, 5, c); // handle
  return mb.f32();
}

// ---------- seated pilot (lower body) in chair frame ----------
function buildPilotLegs(pants, shoe) {
  const mb = new MB();
  for (const s of [1, -1]) {
    const hip = [s * 0.1, 0.07, -0.08], knee = [s * 0.12, 0.08, 0.34], ankle = [s * 0.13, -0.32, 0.42];
    mb.tube(hip, knee, 0.075, 0.062, 14, pants, false);
    mb.ellip(hip, [0.08, 0.08, 0.08], 12, 8, pants);
    mb.ellip(knee, [0.064, 0.064, 0.064], 14, 10, pants);
    mb.tube(knee, ankle, 0.058, 0.045, 14, pants, false);
    mb.box(v3.add(ankle, [0, -0.04, 0.06]), [0.05, 0.04, 0.12], shoe);
    mb.box(v3.add(ankle, [0, -0.082, 0.06]), [0.052, 0.008, 0.125], [0.9, 0.9, 0.88, 0.55]);
  }
  mb.ellip([0, 0.09, -0.1], [0.17, 0.09, 0.14], 10, 6, pants);
  return mb.f32();
}
// first-person chest and belly (seen when looking down), chair frame
function buildPilotChest(jacket) {
  const mb = new MB();
  mb.ellip([0, 0.3, 0.0], [0.165, 0.22, 0.125], 12, 8, jacket);
  mb.ellip([0, 0.12, 0.02], [0.17, 0.12, 0.14], 10, 6, jacket);
  // zip line and pocket flaps for a bit of detail
  mb.box([0, 0.3, 0.123], [0.006, 0.2, 0.004], [jacket[0] * 0.5, jacket[1] * 0.5, jacket[2] * 0.5, 0.6]);
  return mb.f32();
}
// upper body pivot at the chest (chair space [0, 0.42, -0.12]); forward +Z; holds the rifle
function buildPilotUpper(jacket, skin, hat, hair) {
  const mb = new MB();
  mb.ellip([0, -0.12, 0], [0.17, 0.25, 0.12], 12, 8, jacket);   // torso
  mb.ellip([0, 0.12, 0.0], [0.19, 0.08, 0.12], 10, 6, jacket);    // shoulders
  mb.tube([0, 0.16, 0], [0, 0.24, 0.01], 0.045, 0.045, 8, skin, false); // neck
  const head = [0, 0.34, 0.02];
  mb.ellip(head, [0.095, 0.115, 0.105], 12, 8, skin);
  mb.ellip(v3.add(head, [0, 0.015, -0.01]), [0.1, 0.1, 0.105], 12, 6, hair, 0, 0);
  // cap + brim
  mb.ellip(v3.add(head, [0, 0.06, 0]), [0.104, 0.07, 0.11], 12, 5, hat);
  mb.box(v3.add(head, [0, 0.055, 0.12]), [0.085, 0.008, 0.06], hat);
  // sunglasses
  mb.box(v3.add(head, [0, 0.01, 0.098]), [0.075, 0.018, 0.012], [0.04, 0.04, 0.05, 0.95]);
  // arms posed on the rifle (rifle grip near [ -0.12, -0.02, 0.28 ], forearm at [0.02, 0.0, 0.5])
  const shR = [-0.18, 0.1, 0.0], elR = [-0.24, -0.08, 0.16], haR = [-0.1, -0.03, 0.29];
  const shL = [0.18, 0.1, 0.0], elL = [0.2, -0.1, 0.27], haL = [0.02, -0.04, 0.5];
  mb.tube(shR, elR, 0.055, 0.048, 8, jacket, false); mb.ellip(elR, [0.05, 0.05, 0.05], 6, 4, jacket);
  mb.tube(elR, haR, 0.045, 0.038, 8, jacket, false); mb.ellip(haR, [0.04, 0.035, 0.05], 6, 4, skin);
  mb.tube(shL, elL, 0.055, 0.048, 8, jacket, false); mb.ellip(elL, [0.05, 0.05, 0.05], 6, 4, jacket);
  mb.tube(elL, haL, 0.045, 0.038, 8, jacket, false); mb.ellip(haL, [0.04, 0.035, 0.05], 6, 4, skin);
  return mb.f32();
}

// ---------- multi-pump pellet rifle: grip at origin, barrel along +Z ----------
// returns body and pump lever (lever pivot at its front hinge, local origin)
function buildRifle() {
  const wood = [0.42, 0.22, 0.1, 0.35], dark = [0.06, 0.06, 0.065, 0.9], blue = [0.1, 0.11, 0.13, 0.95];
  const mb = new MB();
  // stock: side profile (z, y) extruded with bevelled edges
  const prof = [[-0.375, -0.125], [-0.378, -0.02], [-0.3, -0.004], [-0.14, 0.008], [-0.03, 0.012], [0.02, 0.006], [0.02, -0.018], [-0.01, -0.03],
    [-0.035, -0.06], [-0.045, -0.095], [-0.075, -0.1], [-0.09, -0.07], [-0.2, -0.085], [-0.3, -0.11]];
  mb.extrude(prof, 0.019, 0.006, wood);
  mb.box([0, -0.072, -0.381], [0.02, 0.054, 0.006], [0.08, 0.08, 0.08, 0.3]); // butt pad
  // receiver + barrel
  mb.tube([0, 0.02, -0.02], [0, 0.02, 0.24], 0.016, 0.016, 12, blue, true);
  mb.tube([0, 0.02, 0.24], [0, 0.02, 0.8], 0.0095, 0.0095, 10, blue, true);
  mb.tube([0, 0.0, 0.24], [0, 0.0, 0.7], 0.012, 0.012, 10, dark, true); // pump tube under barrel
  mb.tube([0, 0.02, 0.76], [0, 0.02, 0.8], 0.012, 0.012, 10, dark, true); // muzzle cap
  // bolt handle
  mb.tube([0.016, 0.03, 0.05], [0.05, 0.035, 0.045], 0.005, 0.005, 6, dark, false);
  mb.ellip([0.052, 0.035, 0.045], [0.009, 0.009, 0.009], 6, 4, dark);
  // trigger guard + trigger
  mb.path([[0, -0.012, 0.0], [0, -0.05, 0.02], [0, -0.05, 0.07], [0, -0.012, 0.09]], 0.004, 5, dark);
  mb.box([0, -0.03, 0.045], [0.003, 0.016, 0.003], dark);
  // scope
  mb.tube([0, 0.07, 0.0], [0, 0.07, 0.28], 0.013, 0.013, 12, dark, false);
  mb.tube([0, 0.07, -0.05], [0, 0.07, 0.0], 0.019, 0.013, 12, dark, true);
  mb.tube([0, 0.07, 0.28], [0, 0.07, 0.34], 0.013, 0.021, 12, dark, true);
  mb.box([0, 0.047, 0.05], [0.008, 0.012, 0.012], dark); mb.box([0, 0.047, 0.22], [0.008, 0.012, 0.012], dark);
  const lens = new MB();
  // pump lever: hinge at z=0.62 under barrel; lever runs back to z=0.12
  const lv = new MB();
  lv.box([0, -0.03, -0.25], [0.022, 0.022, 0.24], wood);
  lv.tube([0, 0, 0], [0, -0.02, -0.04], 0.006, 0.006, 6, dark, false);
  return { body: mb.f32(), lever: lv.f32(), hinge: [0, -0.01, 0.62] };
}

// ---------- trees (unit height) ----------
function buildConifer() {
  const mb = new MB();
  const bark = [0.3, 0.22, 0.15, 0];
  mb.tube([0, -0.05, 0], [0, 0.85, 0], 0.035, 0.008, 7, bark, false);
  const tiers = 6;
  for (let i = 0; i < tiers; i++) {
    const y0 = 0.14 + i * 0.135, y1 = y0 + 0.32;
    const r = 0.5 * (1 - i / tiers) + 0.07;
    const seg = 9;
    const g = [0.07 + i * 0.006, 0.115 + i * 0.008, 0.065, 1];
    for (let j = 0; j < seg; j++) {
      const a0 = j / seg * TAU + i * 0.7, a1 = (j + 1) / seg * TAU + i * 0.7;
      const jag0 = 1 + 0.22 * Math.sin(j * 2.7 + i), jag1 = 1 + 0.22 * Math.sin((j + 1) * 2.7 + i);
      const A = [Math.cos(a0) * r * jag0, y0 - 0.03 * jag0, Math.sin(a0) * r * jag0];
      const B = [Math.cos(a1) * r * jag1, y0 - 0.03 * jag1, Math.sin(a1) * r * jag1];
      const T = [0, y1, 0];
      const nA = v3.norm([Math.cos(a0), 0.8, Math.sin(a0)]), nB = v3.norm([Math.cos(a1), 0.8, Math.sin(a1)]), nT = [0, 1, 0];
      mb.vtx(A, nA, g); mb.vtx(T, nT, [g[0] * 1.2, g[1] * 1.2, g[2], 1]); mb.vtx(B, nB, g);
      // underside (darker)
      const U = [0, y0 + 0.06, 0], gd = [g[0] * 0.45, g[1] * 0.45, g[2] * 0.45, 1];
      mb.vtx(A, [nA[0], -0.6, nA[2]], gd); mb.vtx(B, [nB[0], -0.6, nB[2]], gd); mb.vtx(U, [0, -1, 0], gd);
    }
  }
  return mb.f32();
}
function buildBroadleaf() {
  const mb = new MB();
  const bark = [0.55, 0.52, 0.46, 0];
  mb.tube([0, -0.05, 0], [0, 0.55, 0], 0.04, 0.02, 7, bark, false);
  mb.tube([0, 0.4, 0], [0.12, 0.62, 0.05], 0.018, 0.01, 5, bark, false);
  mb.tube([0, 0.42, 0], [-0.1, 0.6, -0.08], 0.018, 0.01, 5, bark, false);
  const g = [0.15, 0.26, 0.08, 1];
  const blobs = [[0, 0.68, 0, 0.42, 0.3], [0.2, 0.6, 0.1, 0.28, 0.22], [-0.18, 0.58, -0.12, 0.3, 0.22], [0.05, 0.84, -0.05, 0.3, 0.2], [-0.08, 0.52, 0.2, 0.26, 0.2]];
  let k = 0;
  for (const b of blobs) { mb.ellip([b[0], b[1], b[2]], [b[3], b[4], b[3]], 9, 6, g, 0.22, k++ * 3.1); }
  return mb.f32();
}

// ---------- shore props (cabins, docks, boats, raft, buoys) in world space ----------
function buildProps() {
  const mb = new MB();
  const logC = [0.38, 0.24, 0.14, 0.3], roofs = [[0.22, 0.27, 0.2, 0.3], [0.45, 0.12, 0.1, 0.3], [0.2, 0.2, 0.24, 0.3], [0.32, 0.3, 0.27, 0.3]];
  const plank = [0.48, 0.38, 0.27, 0.3], post = [0.25, 0.2, 0.16, 0.3];
  const boats = [];
  for (const cab of WORLD.cabins) {
    const th = cab.th, inward = [-Math.cos(th), 0, -Math.sin(th)], side = [-inward[2], 0, inward[0]];
    const gy = WORLD.height(cab.x, cab.z);
    const w = 3.6 + (cab.i % 3), d = 3 + (cab.i % 2), h = 2.6;
    const c = [cab.x, gy + h / 2 - 0.2, cab.z];
    mb.box(c, [w, h / 2 + 0.2, d], logC, side, [0, 1, 0], inward);
    // gable roof
    const rc = roofs[cab.i % roofs.length];
    const top = v3.add(c, [0, h / 2 + 1.6, 0]);
    const e0 = v3.add(c, [0, h / 2, 0]);
    for (const s of [1, -1]) {
      const eave = v3.add(e0, v3.mul(inward, s * (d + 0.6)));
      const A = v3.add(eave, v3.mul(side, w + 0.5)), B = v3.add(eave, v3.mul(side, -w - 0.5));
      const C = v3.add(top, v3.mul(side, -w - 0.5)), D = v3.add(top, v3.mul(side, w + 0.5));
      if (s > 0) mb.quad(A, D, C, B, rc); else mb.quad(A, B, C, D, rc);
    }
    for (const s of [1, -1]) { // gable ends
      const A = v3.add(e0, v3.add(v3.mul(side, s * w), v3.mul(inward, d))), B = v3.add(e0, v3.add(v3.mul(side, s * w), v3.mul(inward, -d))), T = v3.add(top, v3.mul(side, s * w));
      if (s > 0) mb.tri(A, T, B, logC); else mb.tri(A, B, T, logC);
    }
    // windows facing the lake and a porch light colour
    const facing = v3.mul(inward, -1);
    for (const s of [-0.5, 0.5]) mb.box(v3.add(c, v3.add(v3.mul(facing, d + 0.02), v3.add(v3.mul(side, s * w), [0, 0.2, 0]))), [0.55, 0.45, 0.03], [0.06, 0.07, 0.08, 0.9], side, [0, 1, 0], facing);
    mb.box(v3.add(c, v3.add(v3.mul(facing, d + 0.02), [0, -0.35, 0])), [0.45, 0.9, 0.03], [0.3, 0.16, 0.08, 0.3], side, [0, 1, 0], facing);
    mb.box(v3.add(top, v3.add(v3.mul(side, w * 0.5), [0, 0.1, 0])), [0.3, 0.9, 0.3], [0.35, 0.33, 0.3, 0.1]); // chimney
    // dock: from the beach out over the water
    const R = WORLD.shoreR(th);
    const shore = [Math.cos(th) * (R - 2), 0, Math.sin(th) * (R - 2)];
    const len = 14 + (cab.i % 3) * 5;
    const dockEnd = v3.add(shore, v3.mul(inward, len));
    const dc = v3.lerp(v3.add(shore, v3.mul(inward, -4)), dockEnd, 0.5);
    mb.box([dc[0], 0.75, dc[2]], [0.9, 0.06, len / 2 + 2], plank, side, [0, 1, 0], inward);
    for (let k = 0; k <= len + 4; k += 3) {
      for (const s of [-0.85, 0.85]) {
        const pp = v3.add(v3.add(shore, v3.mul(inward, k - 4)), v3.mul(side, s));
        mb.tube([pp[0], -2.5, pp[2]], [pp[0], 0.85, pp[2]], 0.09, 0.09, 6, post, true);
      }
    }
    boats.push({ p: v3.add(dockEnd, v3.add(v3.mul(side, 2.4), v3.mul(inward, -3))), heading: Math.atan2(inward[2], inward[0]), kind: cab.i % 3 === 0 ? 'canoe' : 'row', moored: true });
    // Adirondack chairs on the beach, of course
    const beachP = [Math.cos(th) * (R + 6), 0, Math.sin(th) * (R + 6)];
    for (const s of [-1.2, 1.2]) {
      const p = v3.add(beachP, v3.mul(side, s)); p[1] = WORLD.height(p[0], p[2]) + 0.25;
      mb.box(p, [0.35, 0.05, 0.35], [0.85, 0.3, 0.2, 0.55], side, [0, 1, 0], facing);
      mb.box(v3.add(p, v3.add(v3.mul(facing, -0.35), [0, 0.35, 0])), [0.35, 0.4, 0.04], [0.85, 0.3, 0.2, 0.55], side, v3.norm(v3.add([0, 1, 0], v3.mul(facing, -0.3))), facing);
    }
  }
  // swim raft
  const raft = [80, 0, 260];
  mb.box([raft[0], 0.35, raft[2]], [2.2, 0.25, 2.2], [0.86, 0.84, 0.8, 0.3]);
  mb.box([raft[0], 0.05, raft[2]], [2.0, 0.2, 2.0], [0.12, 0.12, 0.13, 0.3]);
  mb.path([[raft[0] + 2.2, 0.6, raft[2] - 0.4], [raft[0] + 2.4, 1.3, raft[2] - 0.4], [raft[0] + 2.4, 1.3, raft[2] + 0.4], [raft[0] + 2.2, 0.6, raft[2] + 0.4]], 0.03, 6, [0.85, 0.85, 0.85, 0.95]);
  // spectator boats anchored mid-lake
  const spect = [[-60, 300], [260, 120], [-300, -90], [120, -280], [-120, -330]];
  for (let i = 0; i < spect.length; i++) {
    boats.push({ p: [spect[i][0], 0, spect[i][1]], heading: i * 1.7, kind: i % 2 ? 'pontoon' : 'fish', moored: false, i });
  }
  return { data: mb.f32(), boats };
}

// boat meshes (local: bow along +Z)
function buildBoat(kind) {
  const mb = new MB();
  if (kind === 'pontoon') {
    for (const s of [-1, 1]) mb.tube([s * 1.0, 0.1, -3.4], [s * 1.0, 0.1, 3.0], 0.32, 0.32, 10, [0.8, 0.8, 0.82, 0.95], true);
    mb.box([0, 0.55, -0.2], [1.35, 0.06, 3.3], [0.35, 0.3, 0.27, 0.3]);
    mb.box([0, 0.85, -0.2], [1.35, 0.3, 0.04], [0.85, 0.85, 0.82, 0.55], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    for (const s of [-1, 1]) mb.box([s * 1.33, 0.85, -0.2], [0.03, 0.3, 3.2], [0.85, 0.85, 0.82, 0.55]);
    mb.box([0, 2.0, -0.5], [1.4, 0.03, 2.0], [0.15, 0.35, 0.6, 0.3]); // bimini
    for (const sx of [-1.3, 1.3]) for (const sz of [-2.4, 1.4]) mb.tube([sx, 0.6, sz], [sx, 2.0, sz], 0.02, 0.02, 5, [0.8, 0.8, 0.8, 0.95]);
  } else {
    const len = kind === 'canoe' ? 2.4 : kind === 'row' ? 1.9 : 2.5;
    const wid = kind === 'canoe' ? 0.45 : 0.75;
    const hull = kind === 'canoe' ? [0.75, 0.2, 0.12, 0.75] : kind === 'row' ? [0.25, 0.45, 0.35, 0.55] : [0.82, 0.84, 0.86, 0.75];
    const N = 12;
    const sec = (t) => { const z = (t - 0.5) * 2 * len; const w = wid * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t - 0.5) * 2, 2.2)), 0.6); return [z, w]; };
    for (let i = 0; i < N; i++) {
      const [z0, w0] = sec(i / N), [z1, w1] = sec((i + 1) / N);
      for (const s of [1, -1]) {
        const a = [s * w0, 0.35, z0], b = [s * w1, 0.35, z1], c = [s * w1 * 0.55, -0.12, z1], d = [s * w0 * 0.55, -0.12, z0];
        if (s > 0) mb.quad(a, d, c, b, hull); else mb.quad(a, b, c, d, hull);
        const e = [0, -0.18, z0], f = [0, -0.18, z1];
        if (s > 0) mb.quad(d, e, f, c, hull); else mb.quad(d, c, f, e, hull);
        const ia = [s * w0 * 0.92, 0.33, z0], ib = [s * w1 * 0.92, 0.33, z1];
        if (s > 0) mb.quad(ia, ib, [0, -0.05, z1], [0, -0.05, z0], [0.55, 0.45, 0.35, 0.3]); else mb.quad(ia, [0, -0.05, z0], [0, -0.05, z1], ib, [0.55, 0.45, 0.35, 0.3]);
      }
    }
    mb.box([0, 0.2, 0.3], [wid * 0.8, 0.03, 0.15], [0.5, 0.38, 0.25, 0.3]);
    if (kind === 'fish') { mb.box([0, 0.35, -len + 0.15], [0.12, 0.3, 0.12], [0.1, 0.1, 0.1, 0.75]); mb.box([0, 0.2, -0.6], [wid * 0.8, 0.03, 0.15], [0.5, 0.38, 0.25, 0.3]); }
  }
  return mb.f32();
}
// unit limb pieces for the first-person arms (tinted per pilot)
function buildUnitTube() { const mb = new MB(); mb.tube([0, 0, 0], [0, 0, 1], 1, 0.85, 10, [1, 1, 1, 0.3], true); return mb.f32(); }
function buildUnitSphere() { const mb = new MB(); mb.ellip([0, 0, 0], [1, 1, 1], 10, 7, [1, 1, 1, 0.3]); return mb.f32(); }
// model matrix for a tube from a to b with radius r
function limbMatrix(a, b, r) {
  const ax = v3.sub(b, a), L = v3.len(ax) || 1e-4, f = v3.mul(ax, 1 / L);
  let u = Math.abs(f[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0];
  const rr = v3.norm(v3.cross(u, f)); u = v3.cross(f, rr);
  const m = m4.basis(a, v3.mul(rr, r), v3.mul(u, r), v3.mul(f, L), 1);
  return m;
}
function buildBuoy() {
  const mb = new MB();
  mb.ellip([0, 0.1, 0], [0.32, 0.32, 0.32], 10, 7, [0.9, 0.18, 0.08, 0.55]);
  mb.tube([0, 0.35, 0], [0, 0.75, 0], 0.03, 0.03, 6, [0.9, 0.9, 0.9, 0.55], true);
  mb.box([0, 0.08, 0], [0.33, 0.04, 0.33], [0.95, 0.95, 0.92, 0.55]);
  return mb.f32();
}
// tiny seated spectator (for boats), local origin at seat
function buildSpectator(shirt) {
  const mb = new MB();
  mb.ellip([0, 0.3, 0], [0.16, 0.26, 0.12], 8, 6, shirt);
  mb.ellip([0, 0.68, 0], [0.09, 0.11, 0.1], 8, 6, [0.85, 0.66, 0.52, 0.2]);
  mb.ellip([0, 0.76, 0], [0.13, 0.03, 0.13], 8, 3, [0.85, 0.82, 0.6, 0.3]);
  mb.tube([0.13, 0.42, 0], [0.2, 0.75, 0.1], 0.035, 0.03, 6, shirt, false); // one arm up: waving / pointing
  mb.tube([-0.13, 0.42, 0], [-0.18, 0.2, 0.15], 0.035, 0.03, 6, shirt, false);
  return mb.f32();
}
