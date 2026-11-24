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
  b = new MB(); b.tint(true).col(0xffffff).par(0.75).sph(1, 9, 6); MESH.sphlo = b.build({ name: 'sphlo' });
  b = new MB(); b.tint(true).col(0xffffff).par(0.8).box(1, 1, 1); MESH.box = b.build({ name: 'box' });
  b = new MB(); b.tint(true).col(0xffffff).par(0.75, 0).cyl(1, 1, 1, 6, false); MESH.wire = b.build({ name: 'wire' });
  b = new MB(); b.tint(true).col(0xffffff).par(0.4, 0, 3.0).sph(1, 8, 6); MESH.glow = b.build({ name: 'glow', cast: false });
  b = new MB(); b.tint(true).col(0xffffff).par(0.4, 0, 2.2).box(1, 1, 1); MESH.glowbox = b.build({ name: 'glowbox', cast: false });
  // flat ring decal (radius 1, width 0.08) and disc decal, emissive tinted
  b = new MB(); b.tint(true).col(0xffffff).par(0.5, 0, 1.6);
  { const n = 40, r0 = 0.9, r1 = 1.0; const st = b.n; for (let k = 0; k <= n; k++) { const a = k / n * TAU; b.vert(Math.cos(a) * r0, 0, Math.sin(a) * r0, 0, 1, 0); b.vert(Math.cos(a) * r1, 0, Math.sin(a) * r1, 0, 1, 0); } for (let k = 0; k < n; k++) { const a = st + k * 2; b.quad(a, a + 2, a + 3, a + 1); } }
  MESH.ring = b.build({ name: 'ring', cast: false });
  b = new MB(); b.tint(true).col(0xffffff).par(0.15, 0, 0); b.cyl(1, 1, 0.008, 22, true);
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.4; b.push().tr(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9).cyl(0.3, 0.3, 0.008, 10, true).pop(); }
  MESH.splat = b.build({ name: 'splat', cast: false });
  buildGearMeshes();
  buildCartMeshes();
  buildPropMeshes();
}

// ---------- the lid (shield) and the weapons. Local frame: held in the hand at the origin, +Y up the handle/shaft, +Z forward ----------
function buildGearMeshes() {
  let b;
  // galvanized trash-can lid: shallow dome facing +Z, rim rings, handle on the back (-Z)
  b = new MB(); b.col(0xc4cacf).par(0.32, 0.35);
  b.push().rx(Math.PI / 2).sph(0.34, 22, 12, 0.32, 0.5).pop();
  b.col(0xa6acb2).par(0.3, 0.35);
  for (const r of [0.33, 0.24, 0.14]) b.push().rx(Math.PI / 2).tr(0, 0.02 + (0.34 - r) * 0.18, 0).cyl(r + 0.012, r + 0.012, 0.02, 24, false).pop();
  b.col(0x8a9096).par(0.4, 0.4); b.push().rx(Math.PI / 2).tr(0, -0.012, 0).cyl(0.345, 0.345, 0.03, 24, false).pop();
  b.col(0x3a3d40).par(0.5, 0.6); b.tube([0, -0.08, -0.02], [0, -0.08, -0.07], 0.012, 6); b.tube([0, 0.08, -0.02], [0, 0.08, -0.07], 0.012, 6); b.tube([0, -0.08, -0.07], [0, 0.08, -0.07], 0.014, 6);
  MESH.lid = b.build({ name: 'lid' });
  // dented lid: same with a squashed dome (swapped in when lid is low)
  b = new MB(); b.col(0xaab0b5).par(0.45, 0.35);
  b.push().rx(Math.PI / 2).sc(1, 1, 0.85).rz(0.25).sph(0.34, 14, 8, 0.2, 0.5).pop();
  b.col(0x8a9096).par(0.45, 0.4); b.push().rx(Math.PI / 2).sc(1, 1, 0.9).cyl(0.345, 0.33, 0.03, 14, false).pop();
  b.col(0x3a3d40).par(0.5, 0.6); b.tube([0, -0.08, -0.02], [0, 0.08, -0.07], 0.014, 6);
  MESH.lidDent = b.build({ name: 'lidDent' });

  // rolled-up newspaper
  b = new MB(); b.col(0xd9d4c4).par(0.9); b.push().tr(0, -0.06, 0).cyl(0.032, 0.03, 0.5, 10, true).pop();
  b.col(0x2a2a2a).par(0.9); for (const y of [0.05, 0.16, 0.3]) b.push().tr(0, y, 0).cyl(0.0325, 0.0325, 0.03, 10, false).pop();
  b.col(0xb8322a).par(0.6); b.push().tr(0, 0.38, 0).cyl(0.034, 0.034, 0.02, 10, false).pop();
  MESH.w_paper = b.build({ name: 'paper' });
  // busted 7-iron (bent shaft)
  b = new MB(); b.col(0x222222).par(0.6); b.push().tr(0, -0.08, 0).cyl(0.02, 0.018, 0.2, 8, true).pop();
  b.col(0xc9ced3).par(0.25, 1); b.tube([0, 0.1, 0], [0, 0.55, 0.03], 0.008, 6); b.tube([0, 0.55, 0.03], [0.02, 0.86, -0.02], 0.007, 6);
  b.push().tr(0.02, 0.88, -0.02).rz(-0.2).tr(0.04, 0, 0).box(0.11, 0.05, 0.02).pop();
  MESH.w_club = b.build({ name: 'club' });
  // push broom
  b = new MB(); b.col(0x8a5a2b).par(0.75); b.push().tr(0, -0.1, 0).cyl(0.016, 0.016, 1.0, 8, true).pop();
  b.col(0x4b3a26).par(0.8); b.push().tr(0, 0.92, 0).box(0.5, 0.07, 0.09).pop();
  b.col(0x1d1b19).par(0.95); b.push().tr(0, 1.0, 0).box(0.48, 0.1, 0.07).pop();
  MESH.w_broom = b.build({ name: 'broom' });
  // tennis racket
  b = new MB(); b.col(0xdedede).par(0.5); b.push().tr(0, -0.05, 0).cyl(0.017, 0.017, 0.22, 8, true).pop();
  b.col(0x2a6ad8).par(0.4, 0.2);
  { const cx = 0, cy = 0.42, rx = 0.11, ry = 0.15, n = 20; for (let k = 0; k < n; k++) { const a0 = k / n * TAU, a1 = (k + 1) / n * TAU; b.tube([cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry, 0], [cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry, 0], 0.012, 5); }
    b.tube([0, 0.17, 0], [-0.06, 0.29, 0], 0.01, 4); b.tube([0, 0.17, 0], [0.06, 0.29, 0], 0.01, 4);
    b.col(0xeeeecc).par(0.6); for (let k = -3; k <= 3; k++) { const x = k * 0.03, h = ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2)); b.tube([x, cy - h, 0], [x, cy + h, 0], 0.0025, 3); }
    for (let k = -4; k <= 4; k++) { const y = k * 0.03, w = rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)); b.tube([-w, cy + y, 0], [w, cy + y, 0], 0.0025, 3); } }
  MESH.w_racket = b.build({ name: 'racket' });
  // frying pan (pan face toward +Z when swung)
  b = new MB(); b.col(0x2a2a2c).par(0.5, 0.3); b.push().tr(0, -0.06, 0).cyl(0.02, 0.022, 0.24, 8, true).pop();
  b.col(0x3a3a3e).par(0.3, 0.8); b.push().tr(0, 0.36, 0).rx(Math.PI / 2).tr(0, -0.02, 0).cyl(0.17, 0.15, 0.05, 20, true).pop();
  b.col(0x8a8f96).par(0.2, 1); b.push().tr(0, 0.36, 0).rx(Math.PI / 2).tr(0, 0.031, 0).cyl(0.14, 0.14, 0.002, 20, true).pop();
  MESH.w_pan = b.build({ name: 'pan' });
  // car antenna (whippy)
  b = new MB(); b.col(0x111111).par(0.5); b.push().tr(0, -0.05, 0).cyl(0.02, 0.02, 0.12, 8, true).pop();
  b.col(0xc9ced3).par(0.25, 1); b.push().tr(0, 0.07, 0).cyl(0.008, 0.004, 1.15, 6, false).pop(); b.push().tr(0, 1.22, 0).sph(0.016, 8, 6).pop();
  MESH.w_antenna = b.build({ name: 'antenna' });
  // ketchup squeeze bottle
  b = new MB(); b.col(0xc8161d).par(0.3); b.push().tr(0, 0, 0).cyl(0.045, 0.05, 0.2, 12, true).pop();
  b.col(0xf2f2f2).par(0.4); b.push().tr(0, 0.2, 0).cyl(0.04, 0.012, 0.08, 10, true).pop();
  b.col(0xf2c94c).par(0.6); b.push().tr(0, 0.07, 0.046).box(0.05, 0.06, 0.004).pop();
  MESH.w_ketchup = b.build({ name: 'ketchup' });
  // mousetrap (also the placed trap)
  b = new MB(); b.col(0xc59a5a).par(0.8); b.boxB(0.12, 0.012, 0.24);
  b.col(0xb9bec4).par(0.3, 1); b.tube([-0.05, 0.016, -0.02], [0.05, 0.016, -0.02], 0.004, 4); b.tube([-0.05, 0.016, -0.02], [-0.05, 0.016, 0.09], 0.004, 4); b.tube([0.05, 0.016, -0.02], [0.05, 0.016, 0.09], 0.004, 4); b.tube([-0.05, 0.016, 0.09], [0.05, 0.016, 0.09], 0.004, 4);
  b.col(0xf2c94c).par(0.7); b.push().tr(0, 0.02, -0.07).box(0.04, 0.012, 0.03).pop();
  MESH.w_trap = b.build({ name: 'trap' });
  // hubcap
  b = new MB(); b.col(0xd4d9de).par(0.15, 1); b.push().rx(Math.PI / 2).sph(0.17, 18, 10, 0.25, 0.5).pop();
  b.col(0x8a9096).par(0.25, 1); for (let k = 0; k < 5; k++) b.push().rz(k / 5 * TAU).tr(0, 0.08, 0.035).box(0.025, 0.12, 0.01).pop();
  MESH.w_hubcap = b.build({ name: 'hubcap' });
  // pizza slice (food)
  b = new MB(); b.col(0xf0b64a).par(0.7); b.face([0, 0, 0.16], [-0.1, 0, -0.06], [0.1, 0, -0.06], [0, 0, 0.16]).face([0, 0, 0.16], [0.1, 0, -0.06], [-0.1, 0, -0.06], [0, 0, 0.16]);
  b.col(0xc98a3a).par(0.8); b.tube([-0.11, 0.01, -0.07], [0.11, 0.01, -0.07], 0.022, 6);
  b.col(0xb5281e).par(0.5); for (const [x, z] of [[0, 0.06], [-0.04, -0.02], [0.04, -0.01]]) b.push().tr(x, 0.006, z).cyl(0.022, 0.022, 0.006, 8, true).pop();
  MESH.pizza = b.build({ name: 'pizza' });
  // boss crown (burger-wrapper crown)
  b = new MB(); b.col(0xf2c230).par(0.35, 0.6, 0.3); b.cyl(0.13, 0.14, 0.07, 14, false);
  for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; b.push().tr(Math.cos(a) * 0.13, 0.07, Math.sin(a) * 0.13).cyl(0.025, 0.0, 0.07, 5, false).pop(); }
  b.col(0xd12b2b).par(0.3, 0, 0.6); for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; b.push().tr(Math.cos(a) * 0.135, 0.035, Math.sin(a) * 0.135).sph(0.013, 6, 4).pop(); }
  MESH.crown = b.build({ name: 'crown' });
  // bird wing (flat, origin at shoulder, extends +X)
  b = new MB(); b.tint(true).col(0xffffff).par(0.8);
  b.face([0, 0, 0.04], [0.16, 0, 0.02], [0.2, 0, -0.04], [0, 0, -0.05]).face([0, 0, -0.05], [0.2, 0, -0.04], [0.16, 0, 0.02], [0, 0, 0.04]);
  MESH.wing = b.build({ name: 'wing' });
  // dumpster (static-ish but drawn per frame so the lid can flap): body 1.8 x 1.15 x 1.05, origin at ground center, front +Z
  b = new MB(); b.tint(true).col(0xffffff).par(0.55, 0.3, -5);
  b.face([-0.9, 0.12, 0.52], [0.9, 0.12, 0.52], [0.9, 1.15, 0.6], [-0.9, 1.15, 0.6]);
  b.face([0.9, 0.12, -0.52], [-0.9, 0.12, -0.52], [-0.9, 1.15, -0.52], [0.9, 1.15, -0.52]);
  b.face([0.9, 0.12, 0.52], [0.9, 0.12, -0.52], [0.9, 1.15, -0.52], [0.9, 1.15, 0.6]);
  b.face([-0.9, 0.12, -0.52], [-0.9, 0.12, 0.52], [-0.9, 1.15, 0.6], [-0.9, 1.15, -0.52]);
  b.face([-0.9, 0.12, 0.52], [-0.9, 0.12, -0.52], [0.9, 0.12, -0.52], [0.9, 0.12, 0.52]);
  b.col(0xffffff).par(0.6, 0.3, -5);
  b.push().tr(0, 1.15, 0.6).box(1.86, 0.06, 0.06).pop(); b.push().tr(0, 0.75, 0.58).box(1.84, 0.05, 0.05).pop();
  for (const s of [-1, 1]) { b.push().tr(s * 0.93, 0.6, 0.03).box(0.05, 0.9, 1.15).pop(); b.push().tr(s * 0.99, 0.95, 0.0).box(0.12, 0.08, 0.3).pop(); }
  b.tint(false).col(0x1c1c1c).par(0.8); b.push().tr(0, 1.13, 0.02).box(1.76, 0.02, 1.08).pop(); // dark interior top
  b.col(0x222222).par(0.7); for (const [x, z] of [[-0.75, -0.42], [0.75, -0.42], [-0.75, 0.45], [0.75, 0.45]]) b.push().tr(x, 0.06, z).rz(Math.PI / 2).tr(0, -0.03, 0).cyl(0.06, 0.06, 0.06, 10, true).pop();
  b.col(0xf2f2f2).par(0.6); b.push().tr(0.45, 0.45, 0.556).rx(-0.077).box(0.5, 0.18, 0.005).pop();
  MESH.dumpster = b.build({ name: 'dumpster' });
  // dumpster lid half (hinged at the back edge, origin at hinge, extends +Z 1.15 and +X 0.9)
  b = new MB(); b.col(0x1e1f22).par(0.6, 0); b.push().tr(0.44, 0.02, 0.57).box(0.88, 0.035, 1.14).pop();
  b.col(0x2a2b2f).par(0.6); for (const x of [0.15, 0.44, 0.73]) b.push().tr(x, 0.045, 0.57).box(0.05, 0.02, 1.1).pop();
  MESH.dumpLid = b.build({ name: 'dumpLid' });
}

// ---------- shopping cart (no rocket here: the raccoon kick-scoots it). +Z forward, origin at ground between the wheels ----------
function buildCartMeshes() {
  const b = new MB();
  const chrome = () => b.tint(false).col(0xd6dbe0).par(0.22, 1);
  const W = 0.0095, F = 0.014;
  const zb = -0.47, zf = 0.47;
  const backW = 0.29, frontW = 0.24, topY = 0.99, botB = 0.52, botF = 0.6, topF = 0.97;
  const P = (side, front, top) => { const x = (front ? frontW : backW) * side, z = front ? zf : zb, y = top ? (front ? topF : topY) : (front ? botF : botB); return [x, y, z]; };
  const lerp3 = (a, c, t) => [lerp(a[0], c[0], t), lerp(a[1], c[1], t), lerp(a[2], c[2], t)];
  chrome();
  const edges = [[P(-1, 0, 1), P(1, 0, 1)], [P(-1, 1, 1), P(1, 1, 1)], [P(-1, 0, 1), P(-1, 1, 1)], [P(1, 0, 1), P(1, 1, 1)],
  [P(-1, 0, 0), P(1, 0, 0)], [P(-1, 1, 0), P(1, 1, 0)], [P(-1, 0, 0), P(-1, 1, 0)], [P(1, 0, 0), P(1, 1, 0)],
  [P(-1, 0, 0), P(-1, 0, 1)], [P(1, 0, 0), P(1, 0, 1)], [P(-1, 1, 0), P(-1, 1, 1)], [P(1, 1, 0), P(1, 1, 1)]];
  for (const [a, c] of edges) b.tube(a, c, F, 6);
  for (const s of [-1, 1]) {
    for (let k = 1; k < 10; k++) { const t = k / 10; b.tube(lerp3(P(s, 0, 0), P(s, 1, 0), t), lerp3(P(s, 0, 1), P(s, 1, 1), t), W, 4); }
    for (let k = 1; k < 4; k++) { const t = k / 4; b.tube(lerp3(P(s, 0, 0), P(s, 0, 1), t), lerp3(P(s, 1, 0), P(s, 1, 1), t), W, 4); }
  }
  for (const fr of [0, 1]) {
    for (let k = 1; k < 6; k++) { const t = k / 6; b.tube(lerp3(P(-1, fr, 0), P(1, fr, 0), t), lerp3(P(-1, fr, 1), P(1, fr, 1), t), W, 4); }
    for (let k = 1; k < 3; k++) { const t = k / 3; b.tube(lerp3(P(-1, fr, 0), P(-1, fr, 1), t), lerp3(P(1, fr, 0), P(1, fr, 1), t), W, 4); }
  }
  for (let k = 1; k < 6; k++) { const t = k / 6; b.tube(lerp3(P(-1, 0, 0), P(1, 0, 0), t), lerp3(P(-1, 1, 0), P(1, 1, 0), t), W, 4); }
  const R = 0.017;
  for (const s of [-1, 1]) {
    b.tube([s * 0.235, 0.17, -0.40], [s * 0.21, 0.17, 0.40], R, 6);
    b.tube([s * 0.235, 0.17, -0.40], [s * 0.28, 1.0, -0.53], R, 6);
    b.tube([s * 0.21, 0.17, 0.40], [s * 0.235, 0.6, 0.45], R, 6);
  }
  b.tube([-0.235, 0.17, -0.40], [0.235, 0.17, -0.40], R, 6); b.tube([-0.21, 0.17, 0.40], [0.21, 0.17, 0.40], R, 6);
  for (let k = 1; k < 7; k++) { const z = lerp(-0.38, 0.38, k / 7); b.tube([-0.225, 0.19, z], [0.225, 0.19, z], W * 1.2, 4); }
  for (const s of [-1, 1]) {
    b.push().tr(s * 0.235, 0.07, -0.37).rz(Math.PI / 2).tr(0, -0.018, 0);
    b.col(0x222326).par(0.7, 0).cyl(0.068, 0.068, 0.036, 14, true).pop();
    chrome(); b.tube([s * 0.235, 0.17, -0.37], [s * 0.235, 0.07, -0.37], 0.012, 5);
  }
  b.tint(true).col(0xffffff).par(0.45, 0);
  b.push().tr(-0.3, 1.0, -0.535).rz(-Math.PI / 2).cyl(0.026, 0.026, 0.6, 12, true).pop();
  for (const s of [-1, 1]) { b.push().tr(s * frontW, (topF + botF) / 2, zf + 0.005).box(0.05, 0.39, 0.04).pop(); }
  // a flag of honour: a sock on a chopstick
  b.tint(false).col(0x6b4a2a).par(0.6); b.tube([0.27, 1.0, -0.53], [0.31, 1.7, -0.6], 0.007, 4);
  b.col(0xf0e8d8).par(0.9); b.face([0.31, 1.7, -0.6], [0.31, 1.7, -0.6], [0.31, 1.52, -0.6], [0.3, 1.6, -0.84]); b.face([0.3, 1.6, -0.84], [0.31, 1.52, -0.6], [0.31, 1.7, -0.6], [0.31, 1.7, -0.6]);
  MESH.cart = b.build({ name: 'cart' });
  const c = new MB();
  c.col(0xd6dbe0).par(0.25, 1); c.push().tr(0, -0.012, 0).cyl(0.03, 0.03, 0.016, 10, true).pop();
  c.tube([0.022, -0.01, 0.0], [0.022, -0.12, -0.035], 0.008, 5); c.tube([-0.022, -0.01, 0.0], [-0.022, -0.12, -0.035], 0.008, 5);
  c.push().tr(0.018, -0.12, -0.035).rz(Math.PI / 2).col(0x222326).par(0.7, 0).cyl(0.062, 0.062, 0.034, 14, true).pop();
  MESH.caster = c.build({ name: 'caster' });
}

function buildPropMeshes() {
  let b;
  // trash bag (dynamic debris + static decor)
  b = new MB(); b.tint(true).col(0xffffff).par(0.25, 0); b.push().tr(0, 0.22, 0).sc(1, 0.85, 0.9).sph(0.26, 12, 9).pop();
  b.push().tr(0, 0.45, 0).cyl(0.07, 0.03, 0.12, 8, true).pop(); b.push().tr(0.02, 0.58, 0).sc(1.4, 0.6, 1).sph(0.05, 8, 5).pop();
  MESH.bag = b.build({ name: 'bag' });
  // cardboard box
  b = new MB(); b.col(0xa57e4c).par(0.95); b.box(0.44, 0.34, 0.36); b.col(0x8a6738).push().tr(0, 0.171, 0).box(0.07, 0.002, 0.37).pop(); MESH.cbox = b.build({ name: 'cbox' });
  // tin can / bottle debris
  b = new MB(); b.tint(true).col(0xffffff).par(0.3, 0.8); b.push().tr(0, -0.05, 0).cyl(0.03, 0.03, 0.1, 10, true).pop(); MESH.can = b.build({ name: 'can' });
  // fish skeleton debris (just because it's an alley)
  b = new MB(); b.col(0xe8e2d0).par(0.6); b.tube([0, 0, -0.12], [0, 0, 0.1], 0.006, 4); for (let k = 0; k < 6; k++) { const z = -0.08 + k * 0.03; b.tube([-0.04, 0, z - 0.01], [0.04, 0, z - 0.01], 0.003, 3); }
  b.push().tr(0, 0, 0.13).sc(0.6, 0.5, 1).sph(0.04, 8, 6).pop(); b.push().tr(0, 0, -0.14).sc(0.1, 0.6, 1).sph(0.04, 6, 4).pop();
  MESH.fish = b.build({ name: 'fish' });
  // car (passing on the street): simple boxy sedan, +Z forward
  b = new MB(); b.tint(true).col(0xffffff).par(0.25, 0.6); b.push().tr(0, 0.55, 0).box(1.75, 0.6, 4.3).pop(); b.push().tr(0, 1.08, -0.2).box(1.55, 0.5, 2.2).pop();
  b.tint(false).col(0x0e1216).par(0.05, 0.8); b.push().tr(0, 1.09, -0.2).box(1.57, 0.4, 2.0).pop(); b.push().tr(0, 1.08, 0.92).rx(0.5).box(1.45, 0.42, 0.02).pop();
  b.col(0x111111).par(0.8); for (const [x, z] of [[-0.82, 1.35], [0.82, 1.35], [-0.82, -1.35], [0.82, -1.35]]) b.push().tr(x, 0.32, z).rz(Math.PI / 2).tr(0, -0.1, 0).cyl(0.32, 0.32, 0.2, 14, true).pop();
  b.col(0xfff4d0).par(0.2, 0, 6); for (const x of [-0.6, 0.6]) b.push().tr(x, 0.62, 2.16).box(0.32, 0.14, 0.02).pop();
  b.col(0xff2010).par(0.3, 0, 4); for (const x of [-0.65, 0.65]) b.push().tr(x, 0.65, -2.16).box(0.3, 0.12, 0.02).pop();
  MESH.car = b.build({ name: 'car' });
}
