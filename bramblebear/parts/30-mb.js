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
