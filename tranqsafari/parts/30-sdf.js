// ===== Signed-distance creature bodies: primitives, narrow-band surface nets, skin weights =====
// A body is a smooth union of round cones and oriented ellipsoids in bind pose, each owned by a bone.
// prim: { t: 'cone', a, b, ra, rb, bone, reg, weak, k } | { t: 'ell', c, r:[rx,ry,rz], ax:[x-axis] (optional), bone, reg, weak, k }
function primPrep(pr) {
  if (pr.t === 'cone') {
    const ba = V.sub(pr.b, pr.a); pr.l2 = V.dot(ba, ba); pr.ba = ba; pr.rr = pr.ra - pr.rb; pr.a2 = pr.l2 - pr.rr * pr.rr; pr.il2 = 1 / pr.l2;
    const r = Math.max(pr.ra, pr.rb);
    pr.mn = [Math.min(pr.a[0], pr.b[0]) - r, Math.min(pr.a[1], pr.b[1]) - r, Math.min(pr.a[2], pr.b[2]) - r];
    pr.mx = [Math.max(pr.a[0], pr.b[0]) + r, Math.max(pr.a[1], pr.b[1]) + r, Math.max(pr.a[2], pr.b[2]) + r];
  } else {
    const ax = V.norm(pr.ax || [1, 0, 0]); let up = pr.up || [0, 1, 0]; let az = V.norm(V.cross(ax, up)); if (!isFinite(az[0]) || V.len(V.cross(ax, up)) < 1e-4) az = [0, 0, 1]; const ay = V.cross(az, ax);
    pr.R = [ax, ay, az]; const m = Math.max(pr.r[0], pr.r[1], pr.r[2]);
    pr.mn = V.sub(pr.c, [m, m, m]); pr.mx = V.add(pr.c, [m, m, m]);
  }
  pr.k = pr.k ?? null;
  return pr;
}
function sdPrim(pr, x, y, z) {
  if (pr.t === 'cone') {
    const pax = x - pr.a[0], pay = y - pr.a[1], paz = z - pr.a[2], ba = pr.ba, l2 = pr.l2;
    const yy = pax * ba[0] + pay * ba[1] + paz * ba[2]; const zz = yy - l2;
    const qx = pax * l2 - ba[0] * yy, qy = pay * l2 - ba[1] * yy, qz = paz * l2 - ba[2] * yy;
    const x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2, rr = pr.rr, a2 = pr.a2, il2 = pr.il2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - pr.rb;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - pr.ra;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - pr.ra;
  }
  const dx = x - pr.c[0], dy = y - pr.c[1], dz = z - pr.c[2], R = pr.R;
  const lx = (dx * R[0][0] + dy * R[0][1] + dz * R[0][2]) / pr.r[0], ly = (dx * R[1][0] + dy * R[1][1] + dz * R[1][2]) / pr.r[1], lz = (dx * R[2][0] + dy * R[2][1] + dz * R[2][2]) / pr.r[2];
  const k0 = Math.sqrt(lx * lx + ly * ly + lz * lz);
  const k1 = Math.sqrt((lx * lx) / (pr.r[0] * pr.r[0]) + (ly * ly) / (pr.r[1] * pr.r[1]) + (lz * lz) / (pr.r[2] * pr.r[2]));
  return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(pr.r[0], pr.r[1], pr.r[2]);
}
function smin(a, b, k) { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function boxDist(pr, x, y, z) { const dx = Math.max(pr.mn[0] - x, 0, x - pr.mx[0]), dy = Math.max(pr.mn[1] - y, 0, y - pr.mx[1]), dz = Math.max(pr.mn[2] - z, 0, z - pr.mx[2]); return Math.sqrt(dx * dx + dy * dy + dz * dz); }
function makeField(prims, K) {
  const P = prims.filter(p => !p.noMesh);
  return (x, y, z) => {
    let d = 1e9;
    for (let i = 0; i < P.length; i++) { const pr = P[i]; const k = pr.k ?? K; if (boxDist(pr, x, y, z) > d + k) continue; d = smin(d, sdPrim(pr, x, y, z), k); }
    return d;
  };
}
// Surface nets on a narrow band. Returns { pos, nrm, tris } plain arrays.
function surfaceNets(field, mn, mx, cell) {
  const nx = Math.ceil((mx[0] - mn[0]) / cell) + 1, ny = Math.ceil((mx[1] - mn[1]) / cell) + 1, nz = Math.ceil((mx[2] - mn[2]) / cell) + 1;
  const F = new Float32Array(nx * ny * nz); const id = (i, j, k) => (k * ny + j) * nx + i;
  const B = 4, half = B * cell * 0.5 * Math.sqrt(3) + cell;
  for (let bk = 0; bk < nz; bk += B) for (let bj = 0; bj < ny; bj += B) for (let bi = 0; bi < nx; bi += B) {
    const cx = mn[0] + (bi + B / 2) * cell, cy = mn[1] + (bj + B / 2) * cell, cz = mn[2] + (bk + B / 2) * cell;
    const dc = field(cx, cy, cz); const far = Math.abs(dc) > half;
    for (let k = bk; k < Math.min(bk + B + 1, nz); k++) for (let j = bj; j < Math.min(bj + B + 1, ny); j++) for (let i = bi; i < Math.min(bi + B + 1, nx); i++) {
      F[id(i, j, k)] = far ? dc : field(mn[0] + i * cell, mn[1] + j * cell, mn[2] + k * cell);
    }
  }
  const VI = new Int32Array(nx * ny * nz).fill(-1); const pos = [], nrm = [];
  const e = cell * 0.35;
  const grad = (x, y, z) => {
    const a = field(x + e, y - e, z - e), b = field(x - e, y - e, z + e), c = field(x - e, y + e, z - e), d = field(x + e, y + e, z + e);
    const g = [a - b - c + d, -a - b + c + d, -a + b - c + d]; const l = Math.hypot(g[0], g[1], g[2]) || 1; return [g[0] / l, g[1] / l, g[2] / l];
  };
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const v = F[id(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))]; cv[c] = v; if (v < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, cnt = 0;
    for (const [a, b] of EDGES) {
      const va = cv[a], vb = cv[b]; if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb);
      sx += ((a & 1) + ((b & 1) - (a & 1)) * t); sy += (((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t); sz += (((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t); cnt++;
    }
    let px = mn[0] + (i + sx / cnt) * cell, py = mn[1] + (j + sy / cnt) * cell, pz = mn[2] + (k + sz / cnt) * cell;
    // one Newton step onto the surface
    const d = field(px, py, pz); let g = grad(px, py, pz);
    const st = clamp(d, -cell * 0.6, cell * 0.6); px -= g[0] * st; py -= g[1] * st; pz -= g[2] * st;
    g = grad(px, py, pz);
    VI[id(i, j, k)] = pos.length / 3; pos.push(px, py, pz); nrm.push(g[0], g[1], g[2]);
  }
  const tris = [];
  const quad = (a, b, c, d) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    for (const [p, q, r] of [[a, b, c], [a, c, d]]) {
      const ux = pos[q * 3] - pos[p * 3], uy = pos[q * 3 + 1] - pos[p * 3 + 1], uz = pos[q * 3 + 2] - pos[p * 3 + 2];
      const vx = pos[r * 3] - pos[p * 3], vy = pos[r * 3 + 1] - pos[p * 3 + 1], vz = pos[r * 3 + 2] - pos[p * 3 + 2];
      const tx = uy * vz - uz * vy, ty = uz * vx - ux * vz, tz = ux * vy - uy * vx;
      const nx_ = nrm[p * 3] + nrm[q * 3] + nrm[r * 3], ny_ = nrm[p * 3 + 1] + nrm[q * 3 + 1] + nrm[r * 3 + 1], nz_ = nrm[p * 3 + 2] + nrm[q * 3 + 2] + nrm[r * 3 + 2];
      if (tx * nx_ + ty * ny_ + tz * nz_ >= 0) tris.push(p, q, r); else tris.push(p, r, q);
    }
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    if ((F[id(i, j, k)] < 0) !== (F[id(i + 1, j, k)] < 0)) quad(VI[id(i, j - 1, k - 1)], VI[id(i, j, k - 1)], VI[id(i, j, k)], VI[id(i, j - 1, k)]);
  }
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    if ((F[id(i, j, k)] < 0) !== (F[id(i, j + 1, k)] < 0)) quad(VI[id(i - 1, j, k - 1)], VI[id(i, j, k - 1)], VI[id(i, j, k)], VI[id(i - 1, j, k)]);
  }
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    if ((F[id(i, j, k)] < 0) !== (F[id(i, j, k + 1)] < 0)) quad(VI[id(i - 1, j - 1, k)], VI[id(i, j - 1, k)], VI[id(i, j, k)], VI[id(i - 1, j, k)]);
  }
  return { pos, nrm, tris };
}
// Build a skinned mesh for a species: weights from the primitives, colour from the species painter
function buildCreatureMesh(sp, cell) {
  const prims = sp.prims; const field = makeField(prims, sp.K);
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const p of prims) { if (p.noMesh) continue; for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], p.mn[a]); mx[a] = Math.max(mx[a], p.mx[a]); } }
  const pad = sp.K + cell * 2; mn = V.sub(mn, [pad, pad, pad]); mx = V.add(mx, [pad, pad, pad]);
  const sn = surfaceNets(field, mn, mx, cell);
  const nv = sn.pos.length / 3; const sigma = sp.sigma || cell * 2.5;
  const extra = sp.extraMesh ? sp.extraMesh(sp) : null; // e.g. wing membranes: { pos, nrm, bones:[b0,b1,w], col, reg, tris }
  const NV = nv + (extra ? extra.pos.length / 3 : 0);
  const buf = new ArrayBuffer(NV * 32), f = new Float32Array(buf), u8 = new Uint8Array(buf);
  const nb = sp.bones.length; const wsum = new Float64Array(nb);
  for (let v = 0; v < nv; v++) {
    const x = sn.pos[v * 3], y = sn.pos[v * 3 + 1], z = sn.pos[v * 3 + 2];
    wsum.fill(0); let best = null, bd = 1e9;
    for (const pr of prims) {
      if (pr.noMesh) continue; const d = sdPrim(pr, x, y, z); if (d < bd) { bd = d; best = pr; }
      const s = pr.sigma || sigma; wsum[pr.bone] += Math.exp(-Math.max(d, 0) / s) * (pr.wMul || 1);
    }
    let b0 = 0, b1 = 0, w0 = -1, w1 = -1;
    for (let b = 0; b < nb; b++) { const w = wsum[b]; if (w > w0) { w1 = w0; b1 = b0; w0 = w; b0 = b; } else if (w > w1) { w1 = w; b1 = b; } }
    if (w1 <= 0) { b1 = b0; w1 = 0; }
    const wt = w0 / (w0 + w1 + 1e-9);
    const n = [sn.nrm[v * 3], sn.nrm[v * 3 + 1], sn.nrm[v * 3 + 2]];
    const col = sp.paint([x, y, z], n, best);
    const o = v * 8; f[o] = x; f[o + 1] = y; f[o + 2] = z; f[o + 3] = n[0]; f[o + 4] = n[1]; f[o + 5] = n[2];
    const bo = v * 32; u8[bo + 24] = clamp(col[0] * 255, 0, 255); u8[bo + 25] = clamp(col[1] * 255, 0, 255); u8[bo + 26] = clamp(col[2] * 255, 0, 255); u8[bo + 27] = col[3] || 0;
    u8[bo + 28] = b0; u8[bo + 29] = b1; u8[bo + 30] = clamp(Math.round(wt * 255), 0, 255);
  }
  let tris = sn.tris;
  if (extra) {
    const ne = extra.pos.length / 3;
    for (let v = 0; v < ne; v++) {
      const o = (nv + v) * 8, bo = (nv + v) * 32; for (let a = 0; a < 3; a++) { f[o + a] = extra.pos[v * 3 + a]; f[o + 3 + a] = extra.nrm[v * 3 + a]; }
      u8[bo + 24] = clamp(extra.col[v * 3] * 255, 0, 255); u8[bo + 25] = clamp(extra.col[v * 3 + 1] * 255, 0, 255); u8[bo + 26] = clamp(extra.col[v * 3 + 2] * 255, 0, 255); u8[bo + 27] = extra.reg;
      u8[bo + 28] = extra.bones[v * 3]; u8[bo + 29] = extra.bones[v * 3 + 1]; u8[bo + 30] = clamp(Math.round(extra.bones[v * 3 + 2] * 255), 0, 255);
    }
    tris = tris.concat(extra.tris.map(t => t + nv));
  }
  return { buf: new Uint8Array(buf), idx: NV > 65535 ? new Uint32Array(tris) : new Uint16Array(tris), nv: NV, nt: tris.length / 3, mn, mx };
}
function creatureVAO(m) {
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, m.buf, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 32, 24);
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, false, 32, 28);
  gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.UNSIGNED_BYTE, true, 32, 30);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, n: m.idx.length, type: m.idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, nt: m.nt };
}

// ---- rig: bones with bind joint positions; forward kinematics to skinning matrices ----
class Rig {
  constructor() { this.bones = []; this.byName = {}; }
  add(name, parent, j) { const i = this.bones.length; this.bones.push({ name, parent: parent == null ? -1 : this.byName[parent], j }); this.byName[name] = i; return i; }
  b(name) { const i = this.byName[name]; if (i === undefined) throw new Error('no bone ' + name); return i; }
}
// local rotations R (array of mat4 or null) + root matrix -> world bone matrices and skin matrices
function fk(rig, rootM, R, worldOut, skinOut) {
  const bs = rig.bones;
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i]; let M;
    if (b.parent < 0) M = M4.mul(rootM, M4.trans(b.j[0], b.j[1], b.j[2]));
    else { const pj = bs[b.parent].j; M = M4.mul(worldOut[b.parent], M4.trans(b.j[0] - pj[0], b.j[1] - pj[1], b.j[2] - pj[2])); }
    if (R[i]) M = M4.mul(M, R[i]);
    worldOut[i] = M;
    const S = M4.mul(M, M4.trans(-b.j[0], -b.j[1], -b.j[2]));
    skinOut.set(S, i * 16);
  }
}
