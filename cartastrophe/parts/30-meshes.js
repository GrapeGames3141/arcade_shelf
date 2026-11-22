// ---------- mesh builder ----------
class MB {
  constructor() { this.v = []; this.i = []; this.M = m4(); this.st = []; this.c = [1, 1, 1]; this.p = [0.7, 0, 0]; this.u = -1; this.n = 0; }
  col(h) { this.c = typeof h === 'number' ? hexLin(h) : h; return this; }
  par(r, m = 0, e = 0) { this.p = [r, m, e]; return this; }
  tint(on) { this.u = on ? -2 : -1; return this; }
  push() { this.st.push(this.M.slice()); return this; }
  pop() { this.M = this.st.pop(); return this; }
  mul(m) { m4mul(this.M, this.M, m); return this; }
  tr(x, y, z) { return this.mul(m4trans(x, y, z)); }
  ry(a) { return this.mul(m4rotY(a)); }
  rx(a) { return this.mul(m4rotX(a)); }
  rz(a) { return this.mul(m4rotZ(a)); }
  sc(x, y = x, z = x) { return this.mul(m4scale(x, y, z)); }
  vert(x, y, z, nx, ny, nz, u, v) {
    const M = this.M;
    const px = M[0] * x + M[4] * y + M[8] * z + M[12], py = M[1] * x + M[5] * y + M[9] * z + M[13], pz = M[2] * x + M[6] * y + M[10] * z + M[14];
    let qx = M[0] * nx + M[4] * ny + M[8] * nz, qy = M[1] * nx + M[5] * ny + M[9] * nz, qz = M[2] * nx + M[6] * ny + M[10] * nz;
    const l = Math.hypot(qx, qy, qz) || 1; qx /= l; qy /= l; qz /= l;
    this.v.push(px, py, pz, qx, qy, qz, this.c[0], this.c[1], this.c[2], this.p[0], this.p[1], this.p[2], u === undefined ? this.u : u, v === undefined ? this.u : v);
    return this.n++;
  }
  tri(a, b, c) { this.i.push(a, b, c); }
  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }
  // flat quad from 4 local points (counter-clockwise seen from the front)
  face(p0, p1, p2, p3, uv) {
    const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p3[0] - p0[0], vy = p3[1] - p0[1], vz = p3[2] - p0[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    let a, b, c, d;
    if (uv) {
      a = this.vert(...p0, nx, ny, nz, uv[0], uv[3]); b = this.vert(...p1, nx, ny, nz, uv[2], uv[3]);
      c = this.vert(...p2, nx, ny, nz, uv[2], uv[1]); d = this.vert(...p3, nx, ny, nz, uv[0], uv[1]);
    } else { a = this.vert(...p0, nx, ny, nz); b = this.vert(...p1, nx, ny, nz); c = this.vert(...p2, nx, ny, nz); d = this.vert(...p3, nx, ny, nz); }
    this.quad(a, b, c, d);
    return this;
  }
  box(sx, sy, sz) {
    const x = sx / 2, y = sy / 2, z = sz / 2;
    this.face([-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]);
    this.face([x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]);
    this.face([x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]);
    this.face([-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]);
    this.face([-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]);
    this.face([-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]);
    return this;
  }
  // box with bottom at y=0
  boxB(sx, sy, sz) { this.push(); this.tr(0, sy / 2, 0); this.box(sx, sy, sz); this.pop(); return this; }
  // cylinder / cone along +y from 0..h
  cyl(r0, r1, h, seg = 12, caps = true) {
    const base = this.n; const slope = (r0 - r1) / h;
    for (let s = 0; s <= seg; s++) {
      const a = s / seg * TAU, ca = Math.cos(a), sa = Math.sin(a); const nl = Math.hypot(1, slope);
      this.vert(ca * r0, 0, sa * r0, ca / nl, slope / nl, sa / nl);
      this.vert(ca * r1, h, sa * r1, ca / nl, slope / nl, sa / nl);
    }
    for (let s = 0; s < seg; s++) { const a = base + s * 2; this.quad(a, a + 1, a + 3, a + 2); }
    if (caps) {
      for (const [y, r, ny] of [[0, r0, -1], [h, r1, 1]]) {
        if (r <= 1e-4) continue;
        const c = this.vert(0, y, 0, 0, ny, 0); const st = this.n;
        for (let s = 0; s <= seg; s++) { const a = s / seg * TAU; this.vert(Math.cos(a) * r, y, Math.sin(a) * r, 0, ny, 0); }
        for (let s = 0; s < seg; s++) ny > 0 ? this.tri(c, st + s + 1, st + s) : this.tri(c, st + s, st + s + 1);
      }
    }
    return this;
  }
  sph(r, seg = 14, ring = 10, sy = 1, top = 1) {
    const base = this.n; const rings = Math.max(2, Math.round(ring * top));
    for (let j = 0; j <= rings; j++) {
      const t = j / ring * Math.PI, st = Math.sin(t), ct = Math.cos(t);
      for (let s = 0; s <= seg; s++) { const a = s / seg * TAU; const x = Math.cos(a) * st, z = Math.sin(a) * st; this.vert(x * r, ct * r * sy, z * r, x, ct / sy, z); }
    }
    for (let j = 0; j < rings; j++) for (let s = 0; s < seg; s++) { const a = base + j * (seg + 1) + s, b = a + seg + 1; this.quad(a, a + 1, b + 1, b); }
    return this;
  }
  // tube between two local points
  tube(a, b, r, seg = 6, caps = false) {
    const M = m4(); m4between(M, a[0], a[1], a[2], b[0], b[1], b[2], 1);
    this.push(); this.mul(M); this.cyl(r, r, 1, seg, caps); this.pop(); return this;
  }
  build(opts) {
    return glMesh(new Float32Array(this.v), new Uint32Array(this.i), opts);
  }
}

// ---------- shared mesh library ----------
const MESH = {};
function buildMeshLibrary() {
  let b;
  b = new MB(); b.tint(true).col(0xffffff).par(0.7).cyl(1, 1, 1, 10, true); MESH.cyl = b.build({ name: 'cyl' });
  b = new MB(); b.tint(true).col(0xffffff).par(0.6).sph(1, 14, 10); MESH.sph = b.build({ name: 'sph' });
  b = new MB(); b.tint(true).col(0xffffff).par(0.8).box(1, 1, 1); MESH.box = b.build({ name: 'box' });
  b = new MB(); b.tint(true).col(0xffffff).par(0.75, 0).cyl(1, 1, 1, 6, false); MESH.wire = b.build({ name: 'rope', cast: true });
  buildCartMeshes();
  buildRiderMeshes();
  buildPropMeshes();
}

// cart in local space: +Z forward, origin at ground between the wheels
const CART = { len: 1.24, wid: 0.68, frontCaster: [0.215, 0.36], rearWheel: [0.235, -0.37], casterPivotY: 0.19 };
function buildCartMeshes() {
  const b = new MB();
  const chrome = () => b.tint(false).col(0xd6dbe0).par(0.22, 1);
  const W = 0.0095, F = 0.014;
  // basket corners: back (z=-0.47) wider and taller, front (z=0.47) narrower and higher bottom
  const zb = -0.47, zf = 0.47;
  const backW = 0.29, frontW = 0.24, topY = 0.99, botB = 0.52, botF = 0.6, topF = 0.97;
  const P = (side, front, top) => {
    const x = (front ? frontW : backW) * side, z = front ? zf : zb, y = top ? (front ? topF : topY) : (front ? botF : botB);
    return [x, y, z];
  };
  chrome();
  // frame edges of the basket
  const edges = [[P(-1, 0, 1), P(1, 0, 1)], [P(-1, 1, 1), P(1, 1, 1)], [P(-1, 0, 1), P(-1, 1, 1)], [P(1, 0, 1), P(1, 1, 1)],
  [P(-1, 0, 0), P(1, 0, 0)], [P(-1, 1, 0), P(1, 1, 0)], [P(-1, 0, 0), P(-1, 1, 0)], [P(1, 0, 0), P(1, 1, 0)],
  [P(-1, 0, 0), P(-1, 0, 1)], [P(1, 0, 0), P(1, 0, 1)], [P(-1, 1, 0), P(-1, 1, 1)], [P(1, 1, 0), P(1, 1, 1)]];
  for (const [a, c] of edges) b.tube(a, c, F, 6);
  const lerp3 = (a, c, t) => [lerp(a[0], c[0], t), lerp(a[1], c[1], t), lerp(a[2], c[2], t)];
  // side grids
  for (const s of [-1, 1]) {
    for (let k = 1; k < 14; k++) { const t = k / 14; b.tube(lerp3(P(s, 0, 0), P(s, 1, 0), t), lerp3(P(s, 0, 1), P(s, 1, 1), t), W, 4); }
    for (let k = 1; k < 5; k++) { const t = k / 5; b.tube(lerp3(P(s, 0, 0), P(s, 0, 1), t), lerp3(P(s, 1, 0), P(s, 1, 1), t), W, 4); }
  }
  // front and back grids
  for (const fr of [0, 1]) {
    for (let k = 1; k < 8; k++) { const t = k / 8; b.tube(lerp3(P(-1, fr, 0), P(1, fr, 0), t), lerp3(P(-1, fr, 1), P(1, fr, 1), t), W, 4); }
    for (let k = 1; k < 4; k++) { const t = k / 4; b.tube(lerp3(P(-1, fr, 0), P(-1, fr, 1), t), lerp3(P(1, fr, 0), P(1, fr, 1), t), W, 4); }
  }
  // bottom grid
  for (let k = 1; k < 7; k++) { const t = k / 7; b.tube(lerp3(P(-1, 0, 0), P(1, 0, 0), t), lerp3(P(-1, 1, 0), P(1, 1, 0), t), W, 4); }
  for (let k = 1; k < 10; k++) { const t = k / 10; b.tube(lerp3(P(-1, 0, 0), P(-1, 1, 0), t), lerp3(P(1, 0, 0), P(1, 1, 0), t), W, 4); }
  // chassis: base rails, legs, handle
  const R = 0.017;
  for (const s of [-1, 1]) {
    b.tube([s * 0.235, 0.17, -0.40], [s * 0.21, 0.17, 0.40], R, 6);       // lower rail
    b.tube([s * 0.235, 0.17, -0.40], [s * 0.28, 1.0, -0.53], R, 6);       // rear leg up to handle
    b.tube([s * 0.21, 0.17, 0.40], [s * 0.235, 0.6, 0.45], R, 6);         // front leg to basket
    b.tube([s * 0.25, 0.52, -0.45], [s * 0.26, 0.55, -0.48], R, 6);
  }
  b.tube([-0.235, 0.17, -0.40], [0.235, 0.17, -0.40], R, 6); b.tube([-0.21, 0.17, 0.40], [0.21, 0.17, 0.40], R, 6);
  for (let k = 1; k < 7; k++) { const z = lerp(-0.38, 0.38, k / 7); b.tube([-0.225, 0.19, z], [0.225, 0.19, z], W * 1.2, 4); } // bottom rack
  // rear wheels (fixed)
  for (const s of [-1, 1]) {
    b.push().tr(s * 0.235, 0.07, -0.37).rz(Math.PI / 2).tr(0, -0.018, 0);
    b.col(0x222326).par(0.7, 0).cyl(0.068, 0.068, 0.036, 14, true).pop();
    b.push().tr(s * 0.235, 0.07, -0.37).rz(Math.PI / 2).tr(0, -0.022, 0);
    b.col(0x9aa0a8).par(0.4, 1).cyl(0.03, 0.03, 0.044, 8, true).pop();
    chrome(); b.tube([s * 0.235, 0.17, -0.37], [s * 0.235, 0.07, -0.37], 0.012, 5);
  }
  // tinted plastic: handle grip, corner bumpers, child seat back
  b.tint(true).col(0xffffff).par(0.45, 0);
  b.push().tr(-0.3, 1.0, -0.535).rz(-Math.PI / 2).cyl(0.026, 0.026, 0.6, 12, true).pop();
  for (const s of [-1, 1]) { b.push().tr(s * frontW, (topF + botF) / 2, zf + 0.005).box(0.05, 0.39, 0.04).pop(); }
  b.push().tr(0, 0.97, zf + 0.012).box(0.5, 0.05, 0.035).pop();
  // flag pole and flag
  b.tint(false).col(0x333333).par(0.5, 0.3); b.tube([0.27, 1.0, -0.53], [0.33, 1.95, -0.62], 0.006, 4);
  b.tint(true).col(0xffffff).par(0.8);
  b.face([0.33, 1.95, -0.62], [0.33, 1.95, -0.62], [0.33, 1.78, -0.62], [0.32, 1.86, -0.86]);
  b.face([0.32, 1.86, -0.86], [0.33, 1.78, -0.62], [0.33, 1.95, -0.62], [0.33, 1.95, -0.62]);
  // the rocket: tube strapped under the handle, nozzle out the back
  const rz0 = -0.08, rz1 = -0.92, ry = 0.33, rr = 0.105;
  b.push().tr(0, ry, rz0).rx(-Math.PI / 2); // cylinder +y now points -z
  for (let k = 0; k < 6; k++) {
    const z0 = k / 6 * (rz0 - rz1), len = (rz0 - rz1) / 6;
    b.push().tr(0, z0, 0);
    if (k % 2) b.tint(true).col(0xffffff).par(0.5, 0); else b.tint(false).col(0xf4f1e8).par(0.55, 0);
    b.cyl(rr, rr, len, 16, false).pop();
  }
  b.tint(false).col(0x3a3a3e).par(0.4, 0.9); b.push().tr(0, (rz0 - rz1), 0).cyl(rr * 0.8, rr * 1.05, 0.12, 16, true).pop();   // nozzle
  b.tint(true).col(0xffffff).par(0.5); b.push().tr(0, 0, 0).rx(Math.PI).cyl(rr, 0.0, 0.24, 16, false).pop();             // nose cone (toward front)
  b.tint(true).col(0xffffff).par(0.6);
  for (let f = 0; f < 4; f++) { b.push().ry(f * Math.PI / 2 + Math.PI / 4).tr(0, (rz0 - rz1) - 0.2, rr).face([0, 0, 0], [0, 0.22, 0], [0, 0.24, 0.13], [0, 0.04, 0.1]).face([0, 0.04, 0.1], [0, 0.24, 0.13], [0, 0.22, 0], [0, 0, 0]).pop(); }
  b.tint(false).col(0x9a9a9a).par(0.6, 0); // duct tape bands
  for (const z of [0.1, 0.45]) b.push().tr(0, z, 0).cyl(rr + 0.008, rr + 0.008, 0.06, 16, false).pop();
  b.pop();
  for (const z of [rz0 - 0.15, rz0 - 0.48]) { b.col(0x9a9a9a).par(0.6); b.tube([-0.2, 0.19, z], [0, ry + rr, z], 0.012, 4); b.tube([0.2, 0.19, z], [0, ry + rr, z], 0.012, 4); }
  // groceries on the bottom rack
  b.push().tr(0.06, 0.19, 0.12).ry(0.2).col(0xd23d2a).par(0.6).boxB(0.3, 0.12, 0.2).pop(); // soda 12-pack
  b.push().tr(0.06, 0.255, 0.12).ry(0.2).col(0xffffff).par(0.6).box(0.302, 0.03, 0.202).pop();
  b.push().tr(-0.1, 0.19, 0.28).ry(-0.3).col(0xc9a25c).par(0.9).boxB(0.18, 0.14, 0.1).pop(); // paper bag
  MESH.cart = b.build({ name: 'cart' });

  // front caster: pivot at origin (top of fork), wheel below
  const c = new MB();
  c.col(0xd6dbe0).par(0.25, 1); c.push().tr(0, -0.012, 0).cyl(0.03, 0.03, 0.016, 10, true).pop();
  c.tube([0.022, -0.01, 0.0], [0.022, -0.12, -0.035], 0.008, 5); c.tube([-0.022, -0.01, 0.0], [-0.022, -0.12, -0.035], 0.008, 5);
  c.push().tr(0.018, -0.12, -0.035).rz(Math.PI / 2).col(0x222326).par(0.7, 0).cyl(0.062, 0.062, 0.034, 14, true).pop();
  c.push().tr(0.022, -0.12, -0.035).rz(Math.PI / 2).col(0x9aa0a8).par(0.4, 1).cyl(0.026, 0.026, 0.042, 8, true).pop();
  MESH.caster = c.build({ name: 'caster' });
}

const HELMETS = ['colander', 'pot', 'cone', 'bowl', 'bucket', 'box'];
function buildRiderMeshes() {
  // face (local: head center at origin, +Z forward): nose, goggles, grin
  for (const scream of [0, 1]) {
    const b = new MB();
    b.tint(true).col(0xffffff).par(0.6); b.push().tr(0, -0.01, 0.15).sc(0.032, 0.03, 0.04).sph(1, 8, 6).pop(); // nose (skin tint)
    b.tint(false).col(0x2a2a2a).par(0.4, 0.2);
    b.push().tr(0, 0.045, 0).sc(1, 0.4, 1).cyl(0.158, 0.158, 0.06, 18, false).pop(); // strap
    for (const s of [-1, 1]) {
      b.push().tr(s * 0.055, 0.06, 0.135).rx(Math.PI / 2).col(0x3b3b40).par(0.4, 0.5).cyl(0.042, 0.042, 0.035, 12, true).pop();
      b.push().tr(s * 0.055, 0.06, 0.171).rx(Math.PI / 2).col(0x9fd8ff).par(0.05, 0.6).cyl(0.034, 0.034, 0.003, 12, true).pop();
    }
    if (scream) { b.col(0x3a0d0d).par(0.6); b.push().tr(0, -0.075, 0.12).sc(0.045, 0.055, 0.03).sph(1, 10, 8).pop(); }
    else { b.col(0x3a0d0d).par(0.6); b.push().tr(0, -0.07, 0.135).rz(0).sc(0.06, 0.012, 0.02).sph(1, 10, 6).pop(); }
    MESH['face' + scream] = b.build({ name: 'face' + scream, cast: false });
  }
  // helmets (local: head center at origin, head radius 0.15)
  let b;
  b = new MB(); b.col(0xc8cdd2).par(0.3, 1); b.push().tr(0, 0.03, 0).sph(0.172, 18, 12, 1, 0.5).pop();
  b.col(0x2b2f33).par(0.6, 0.2); for (let j = 0; j < 3; j++) for (let k = 0; k < 9; k++) { const t = 0.35 + j * 0.32, a = k / 9 * TAU + j * 0.3; b.push().tr(Math.cos(a) * Math.sin(t) * 0.172, 0.03 + Math.cos(t) * 0.172, Math.sin(a) * Math.sin(t) * 0.172).sph(0.016, 6, 4).pop(); }
  b.col(0xc8cdd2).par(0.3, 1); for (const s of [-1, 1]) b.push().tr(s * 0.18, 0.04, 0).rz(Math.PI / 2).sc(1, 1, 0.5).cyl(0.035, 0.035, 0.03, 10, true).pop();
  MESH.h_colander = b.build({ name: 'colander' });
  b = new MB(); b.col(0x9ea5ad).par(0.25, 1); b.push().tr(0, 0.0, 0).cyl(0.18, 0.18, 0.2, 20, true).pop();
  b.col(0x222222).par(0.5); for (const s of [-1, 1]) b.push().tr(s * 0.2, 0.15, 0).box(0.05, 0.025, 0.07).pop();
  b.col(0x9ea5ad).par(0.25, 1); b.push().tr(0, 0.2, 0).cyl(0.19, 0.19, 0.012, 20, true).pop();
  MESH.h_pot = b.build({ name: 'pot' });
  b = new MB(); b.col(0xff6a13).par(0.55); b.push().tr(0, 0.04, 0).cyl(0.16, 0.025, 0.42, 18, true).pop();
  b.col(0xf2f2f2).par(0.4); b.push().tr(0, 0.2, 0).cyl(0.105, 0.085, 0.07, 18, false).pop();
  b.col(0xff6a13).par(0.55); b.push().tr(0, 0.02, 0).box(0.34, 0.03, 0.34).pop();
  MESH.h_cone = b.build({ name: 'cone' });
  b = new MB(); b.col(0xa86b35).par(0.6); b.push().tr(0, 0.02, 0).sph(0.178, 18, 12, 0.85, 0.5).pop();
  b.col(0xf3efe6).par(0.8); b.push().tr(0, -0.02, -0.15).sph(0.07, 10, 8).pop(); // hair bun peeking out
  MESH.h_bowl = b.build({ name: 'bowl' });
  b = new MB(); b.tint(true).col(0xffffff).par(0.5); b.push().tr(0, 0.0, 0).cyl(0.17, 0.13, 0.26, 18, true).pop();
  b.tint(false).col(0x444444).par(0.4, 0.5); b.push().tr(0, 0.0, 0).rz(Math.PI / 2).tr(0, -0.18, 0).sc(1, 1, 1).pop();
  b.tube([-0.17, 0.02, 0], [0, -0.17, 0.12], 0.007, 4); b.tube([0.17, 0.02, 0], [0, -0.17, 0.12], 0.007, 4);
  MESH.h_bucket = b.build({ name: 'bucket' });
  b = new MB(); b.col(0xb88c55).par(0.95); b.push().tr(0, 0.02, 0).box(0.36, 0.34, 0.36).pop();
  b.col(0x1a1209).par(0.9); for (const s of [-1, 1]) b.push().tr(s * 0.06, 0.06, 0.181).box(0.06, 0.04, 0.005).pop();
  b.col(0xa57a45).par(0.95); b.push().tr(0.0, 0.19, 0.18).rx(-0.7).tr(0, 0.0, 0.08).box(0.36, 0.006, 0.16).pop();
  b.push().tr(0.0, 0.19, -0.18).rx(0.8).tr(0, 0.0, -0.08).box(0.36, 0.006, 0.16).pop();
  b.col(0x2a5fa8).par(0.9); b.push().tr(0.0, -0.05, 0.181).box(0.2, 0.05, 0.004).pop();
  MESH.h_box = b.build({ name: 'box' });
  // hand (mitten) and shoe
  b = new MB(); b.tint(true).col(0xffffff).par(0.6); b.sc(1, 0.8, 1.1).sph(0.05, 10, 8); MESH.hand = b.build({ name: 'hand' });
  b = new MB(); b.col(0xf2f2f2).par(0.6); b.push().tr(0, 0.0, 0.03).sc(0.055, 0.045, 0.1).sph(1, 10, 8).pop(); b.col(0x222222).push().tr(0, -0.035, 0.03).box(0.1, 0.02, 0.2).pop();
  MESH.shoe = b.build({ name: 'shoe' });
}

function buildPropMeshes() {
  let b;
  // traffic cone (dynamic prop)
  b = new MB(); b.col(0xff6a13).par(0.55); b.boxB(0.36, 0.03, 0.36); b.push().tr(0, 0.03, 0).cyl(0.14, 0.025, 0.62, 16, true).pop();
  b.col(0xf2f2f2).par(0.4); b.push().tr(0, 0.32, 0).cyl(0.085, 0.07, 0.09, 16, false).pop();
  MESH.cone = b.build({ name: 'cone' });
  // duck
  b = new MB(); b.col(0xf4f0e2).par(0.7); b.push().tr(0, 0.08, 0).sc(1, 0.7, 1.4).sph(0.12, 12, 8).pop();
  b.col(0x1f6b3a).par(0.5); b.push().tr(0, 0.21, 0.14).sph(0.07, 10, 8).pop();
  b.col(0xf2b21b).par(0.5); b.push().tr(0, 0.2, 0.22).sc(1, 0.4, 1.4).sph(0.035, 8, 6).pop();
  b.col(0x111111); for (const s of [-1, 1]) b.push().tr(s * 0.045, 0.235, 0.185).sph(0.012, 6, 4).pop();
  b.col(0xd9d2bf).par(0.7); b.push().tr(0, 0.12, -0.14).rx(-0.6).sc(1, 0.4, 1.2).sph(0.06, 8, 6).pop();
  MESH.duck = b.build({ name: 'duck' });
  // grocery debris
  b = new MB(); b.tint(true).col(0xffffff).par(0.6); b.box(0.2, 0.28, 0.07); b.tint(false).col(0xffffff).push().tr(0, 0.05, 0.036).box(0.12, 0.08, 0.002).pop(); MESH.g_cereal = b.build({ name: 'cereal' });
  b = new MB(); b.col(0xd59a4a).par(0.85); b.push().rz(Math.PI / 2).tr(0, -0.22, 0).cyl(0.04, 0.04, 0.44, 10, false).pop(); b.push().tr(-0.22, 0, 0).sph(0.04, 8, 6).pop(); b.push().tr(0.22, 0, 0).sph(0.04, 8, 6).pop(); MESH.g_baguette = b.build({ name: 'baguette' });
  b = new MB(); b.tint(true).col(0xffffff).par(0.5); b.sph(0.045, 10, 8); b.tint(false).col(0x4a2f12).push().tr(0, 0.04, 0).cyl(0.004, 0.004, 0.025, 4).pop(); MESH.g_apple = b.build({ name: 'apple' });
  b = new MB(); b.col(0xf7f7f7).par(0.4); b.box(0.11, 0.18, 0.11); b.col(0x2a74d6).push().tr(0, 0.11, 0).cyl(0.025, 0.025, 0.03, 8).pop(); b.col(0x2a74d6).push().tr(0, 0, 0.056).box(0.11, 0.06, 0.002).pop(); MESH.g_milk = b.build({ name: 'milk' });
  b = new MB(); b.col(0xe8c22c).par(0.5); for (let k = 0; k < 4; k++) { b.push().ry(k * 0.3 - 0.45).tr(0, 0, 0.02).rz(0.25).sc(0.03, 0.03, 0.12).sph(1, 8, 6).pop(); } MESH.g_banana = b.build({ name: 'banana' });
  b = new MB(); b.col(0x2f7d32).par(0.45); b.sc(1, 0.85, 1.2).sph(0.17, 16, 12); MESH.watermelon = b.build({ name: 'watermelon' });
  b = new MB(); b.col(0xffd83d).par(0.55); b.push().tr(0, 0, 0).sc(0.09, 0.012, 0.09).sph(1, 10, 4).pop(); for (let k = 0; k < 4; k++) { b.push().ry(k * Math.PI / 2 + 0.3).tr(0, 0, 0.08).sc(0.035, 0.012, 0.08).sph(1, 8, 4).pop(); } MESH.peel = b.build({ name: 'peel', cast: false });
  // pickup: paper grocery bag with a "?" sticker via tint
  b = new MB(); b.col(0xc9a25c).par(0.9); b.boxB(0.42, 0.5, 0.3);
  b.col(0xb8914e); b.push().tr(0, 0.5, 0).box(0.43, 0.04, 0.31).pop();
  b.tint(true).col(0xffffff).par(0.3, 0, 0.6); b.push().tr(0, 0.27, 0.152).box(0.2, 0.2, 0.004).pop(); b.push().tr(0, 0.27, -0.152).box(0.2, 0.2, 0.004).pop();
  b.tint(false).col(0x2e8b3a).par(0.6); b.push().tr(-0.06, 0.5, 0).rz(0.3).cyl(0.025, 0.02, 0.18, 6).pop(); b.col(0xe0b13a); b.push().tr(0.08, 0.5, 0.03).rz(-0.2).cyl(0.03, 0.03, 0.2, 8).pop();
  MESH.bag = b.build({ name: 'bag' });
  // leaf blower nozzle
  b = new MB(); b.col(0xe86b1c).par(0.5); b.box(0.16, 0.18, 0.26); b.col(0x333333).push().tr(0, -0.02, 0.13).rx(Math.PI / 2).cyl(0.04, 0.05, 0.5, 10).pop();
  MESH.blower = b.build({ name: 'blower' });
  // wreck piece (bent wire panel) - reuse cart mesh for the wreck itself
  // cardboard box (dynamic)
  b = new MB(); b.col(0xb88c55).par(0.95); b.box(0.5, 0.4, 0.4); b.col(0x8a6738).push().tr(0, 0.201, 0).box(0.08, 0.002, 0.41).pop(); MESH.cbox = b.build({ name: 'cbox' });
  // sliding glass door panel (centered)
  b = new MB(); b.col(0x5a5f66).par(0.35, 0.9); b.push().tr(0, 1.22, 0).box(1.7, 0.08, 0.06).pop(); b.push().tr(0, -1.22, 0).box(1.7, 0.08, 0.06).pop();
  b.push().tr(0.83, 0, 0).box(0.06, 2.5, 0.06).pop(); b.push().tr(-0.83, 0, 0).box(0.06, 2.5, 0.06).pop();
  b.col(0x2a3b46).par(0.04, 0.9); b.box(1.62, 2.38, 0.02);
  b.col(0xffd23f).par(0.5); b.push().tr(0, 0.1, -0.015).box(0.9, 0.06, 0.005).pop();
  MESH.door = b.build({ name: 'door', cast: false });
}
