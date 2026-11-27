// ===== World generation: terrain tiles, splat vegetation (48-byte records), rocks, trees, water, set dressing =====
// Splat record: pos f32x3 | U f32x3 | V f32x3 | rgb+ao u8x4 | normal i8x4 | shape, flags, sway, seed u8x4
// shape: 0 round daub, 1 grass blade, 2 pinnate frond, 3 soft blob, 4 broad leaf
// flags: 1 blade (camera-facing about V, base anchored, tip sways), 2 translucent
class SplatBuf {
  constructor(cap = 65536) { this.cap = cap; this.n = 0; this._alloc(cap); this.keys = new Float64Array(cap); }
  _alloc(cap) { const b = new ArrayBuffer(cap * 48); if (this.buf) new Uint8Array(b).set(new Uint8Array(this.buf, 0, this.n * 48)); this.buf = b; this.f = new Float32Array(b); this.u8 = new Uint8Array(b); this.i8 = new Int8Array(b); }
  push(p, U, Vv, c, ao, n, shape, flags, sway, key = 0) {
    if (this.n >= this.cap) { this.cap *= 2; this._alloc(this.cap); const k = new Float64Array(this.cap); k.set(this.keys); this.keys = k; }
    const i = this.n++, f = i * 12, b = i * 48;
    this.f[f] = p[0]; this.f[f + 1] = p[1]; this.f[f + 2] = p[2]; this.f[f + 3] = U[0]; this.f[f + 4] = U[1]; this.f[f + 5] = U[2]; this.f[f + 6] = Vv[0]; this.f[f + 7] = Vv[1]; this.f[f + 8] = Vv[2];
    this.u8[b + 36] = clamp(c[0] * 255, 0, 255); this.u8[b + 37] = clamp(c[1] * 255, 0, 255); this.u8[b + 38] = clamp(c[2] * 255, 0, 255); this.u8[b + 39] = clamp(ao * 255, 0, 255);
    const nl = Math.hypot(n[0], n[1], n[2]) || 1;
    this.i8[b + 40] = clamp(Math.round(n[0] / nl * 127), -127, 127); this.i8[b + 41] = clamp(Math.round(n[1] / nl * 127), -127, 127); this.i8[b + 42] = clamp(Math.round(n[2] / nl * 127), -127, 127);
    this.u8[b + 44] = shape; this.u8[b + 45] = flags; this.u8[b + 46] = clamp(sway * 255, 0, 255); this.u8[b + 47] = (Math.random() * 255) | 0;
    this.keys[i] = key;
  }
}
function splatVAO(buf, count) {
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, QUAD_BUF); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);
  splatPointers(0);
  gl.bindVertexArray(null); return { vao, vb, count };
}
function splatPointers(first) {
  const o = first * 48;
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 48, o); gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 48, o + 12); gl.vertexAttribDivisor(2, 1);
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 48, o + 24); gl.vertexAttribDivisor(3, 1);
  gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.UNSIGNED_BYTE, true, 48, o + 36); gl.vertexAttribDivisor(4, 1);
  gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 4, gl.BYTE, true, 48, o + 40); gl.vertexAttribDivisor(5, 1);
  gl.enableVertexAttribArray(6); gl.vertexAttribPointer(6, 4, gl.UNSIGNED_BYTE, false, 48, o + 44); gl.vertexAttribDivisor(6, 1);
}

const WORLD = { tiles: [], chunks: [], CH: 50, water: null, stats: {} };
const _ti = {};
const PAL = {
  dirt: [0.47, 0.37, 0.25], rut: [0.33, 0.26, 0.18], grassG: [0.33, 0.42, 0.18], grassY: [0.5, 0.48, 0.24], forest: [0.2, 0.3, 0.12],
  plain: [0.42, 0.5, 0.2], rock: [0.5, 0.45, 0.39], rockD: [0.36, 0.32, 0.28], sand: [0.6, 0.53, 0.4], bed: [0.33, 0.31, 0.25], mud: [0.36, 0.3, 0.22],
};
function mix3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function grassColAt(s, x, z) {
  const p = secAt(s); const n = vnoise(x * 0.03, z * 0.03) * 0.5 + 0.5;
  let c = mix3(PAL.grassG, PAL.grassY, clamp(p.tall * 0.8 + n * 0.3 - 0.1, 0, 1));
  c = mix3(c, PAL.forest, clamp(p.fern * 0.85 + p.trees * 0.2 - 0.15, 0, 1));
  c = mix3(c, PAL.plain, clamp((p.W - 80) / 40, 0, 1) * 0.6);
  return c;
}

// ---- terrain tiles (world grid, three spacings, skirts hide cracks) ----
function buildTerrain() {
  const T0 = performance.now();
  const [mnx, mxx, mnz, mxz] = PATH.bounds; const TILE = 64, REACH = 470;
  const x0 = Math.floor((mnx - REACH) / TILE) * TILE, z0 = Math.floor((mnz - REACH) / TILE) * TILE;
  const nx = Math.ceil((mxx + REACH - x0) / TILE), nz = Math.ceil((mxz + REACH - z0) / TILE);
  let verts = 0;
  for (let tz = 0; tz < nz; tz++) for (let tx = 0; tx < nx; tx++) {
    const cx = x0 + (tx + 0.5) * TILE, cz = z0 + (tz + 0.5) * TILE;
    const q = PATH.nearest(cx, cz); const dist = Math.max(0, Math.abs(q.d) - TILE * 0.72);
    if (q.s > PATH.N - 5 && Math.abs(q.d) > 200) continue;
    if (dist > REACH) continue;
    const sp = dist < 50 ? 2 : dist < 150 ? 4 : 8;
    const tile = buildTile(x0 + tx * TILE, z0 + tz * TILE, TILE, sp);
    tile.s = q.s; tile.c = [cx, q.y, cz]; tile.dist = dist; WORLD.tiles.push(tile); verts += tile.nv;
  }
  WORLD.stats.terrainVerts = verts; WORLD.stats.terrainMs = Math.round(performance.now() - T0);
}
function buildTile(ox, oz, size, sp) {
  const n = Math.round(size / sp) + 1, nb = n + 2; // with border for normals
  const hs = new Float32Array(nb * nb); const info = new Array(n * n);
  for (let j = 0; j < nb; j++) for (let i = 0; i < nb; i++) {
    const x = ox + (i - 1) * sp, z = oz + (j - 1) * sp;
    const inner = i >= 1 && j >= 1 && i <= n && j <= n;
    const o = inner ? {} : null;
    hs[j * nb + i] = terrainH(x, z, o);
    if (inner) info[(j - 1) * n + (i - 1)] = o;
  }
  const skirt = 4 * n; const NV = n * n + skirt;
  const buf = new ArrayBuffer(NV * 28), f = new Float32Array(buf), u8 = new Uint8Array(buf);
  let minY = 1e9, maxY = -1e9;
  const put = (k, x, y, z, nx_, ny, nz_, c, mat) => { f[k * 7] = x; f[k * 7 + 1] = y; f[k * 7 + 2] = z; f[k * 7 + 3] = nx_; f[k * 7 + 4] = ny; f[k * 7 + 5] = nz_; u8[k * 28 + 24] = clamp(c[0] * 255, 0, 255); u8[k * 28 + 25] = clamp(c[1] * 255, 0, 255); u8[k * 28 + 26] = clamp(c[2] * 255, 0, 255); u8[k * 28 + 27] = mat; };
  const cols = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = ox + i * sp, z = oz + j * sp, h = hs[(j + 1) * nb + i + 1];
    const dx = (hs[(j + 1) * nb + i + 2] - hs[(j + 1) * nb + i]) / (2 * sp), dz = (hs[(j + 2) * nb + i + 1] - hs[j * nb + i + 1]) / (2 * sp);
    const nl = Math.hypot(dx, 1, dz); const ny = 1 / nl; const o = info[j * n + i];
    const a = Math.abs(o.d); let c, mat = 0;
    const slope = Math.hypot(dx, dz);
    const g = grassColAt(o.s, x, z);
    if (o.river > 0.5 && a < 13) {
      const wy = waterY(o.s);
      c = h < wy - 0.02 ? PAL.bed : mix3(PAL.mud, PAL.sand, smooth(0, 1.5, h - wy)); mat = h < wy + 0.15 ? 3 : 0;
      c = mix3(c, g, smooth(1.2, 3, h - wy));
    } else if (a < 4.4) {
      const rut = Math.exp(-Math.pow((a - 0.95) / 0.28, 2)); const mid = a < 0.35 ? 0.5 : 0;
      c = mix3(mix3(PAL.dirt, PAL.rut, rut * 0.8), g, mid * 0.6 + smooth(3, 4.4, a) * 0.5); mat = 1;
    } else {
      c = mix3(PAL.dirt, g, smooth(4.4, 7.5, a));
      if (a < 7.5) mat = 1;
    }
    const rockT = clamp(smooth(0.55, 0.95, slope) + o.cliff * 0.9, 0, 1);
    if (rockT > 0.02) { c = mix3(c, mix3(PAL.rock, PAL.rockD, vnoise(x * 0.1, z * 0.1) * 0.5 + 0.5), rockT); if (rockT > 0.5) mat = 2; }
    if (o.river > 0.2 && a >= 13 && a < 20) c = mix3(c, PAL.mud, 0.35 * o.river * (1 - smooth(16, 20, a)));
    put(j * n + i, x, h, z, -dx / nl, ny, -dz / nl, c, mat); cols.push(c, mat);
    minY = Math.min(minY, h); maxY = Math.max(maxY, h);
  }
  // skirts: duplicate edge vertices 4 m lower
  let k = n * n; const edges = [];
  const edge = (list) => { const start = k; for (const idx of list) { const b = idx * 7; put(k, f[b], f[b + 1] - 4, f[b + 2], f[b + 3], f[b + 4], f[b + 5], [u8[idx * 28 + 24] / 255, u8[idx * 28 + 25] / 255, u8[idx * 28 + 26] / 255], u8[idx * 28 + 27]); k++; } edges.push([list, start]); };
  const row = (j) => Array.from({ length: n }, (_, i) => j * n + i), colI = (i) => Array.from({ length: n }, (_, j) => j * n + i);
  edge(row(0)); edge(row(n - 1)); edge(colI(0)); edge(colI(n - 1));
  const idx = [];
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i; idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); }
  for (const [list, start] of edges) for (let t = 0; t < list.length - 1; t++) { const a = list[t], b = list[t + 1], c = start + t, d = start + t + 1; idx.push(a, b, c, b, d, c, a, c, b, b, c, d); }
  const mesh = makeMeshVAO(new Uint8Array(buf), NV > 65535 ? new Uint32Array(idx) : new Uint16Array(idx));
  mesh.nv = NV; mesh.minY = minY; mesh.maxY = maxY; mesh.box = [ox, oz, ox + size, oz + size];
  return mesh;
}

// ---- vegetation ----
let SB = null, CUR_KEY = 0;
function chunkOf(s) { return clamp(Math.floor(s / WORLD.CH), 0, 999); }
function keyFor(s, core) { return chunkOf(s) * 4 + (core ? 0 : 2) + (core ? 0 : Math.random()); }
const UP = [0, 1, 0];
function blade(p, h, w, c, ao, sway, lean, s, tall) {
  const lx = lean[0], lz = lean[1];
  const Vv = [lx * h * 0.5, h * 0.5, lz * h * 0.5];
  const nrm = [rnd.range(-0.4, 0.4), 1, rnd.range(-0.4, 0.4)];
  SB.push([p[0] + Vv[0], p[1] + Vv[1] - 0.03, p[2] + Vv[2]], [w, 0, 0], Vv, c, ao, nrm, 1, 1 | 2, sway, keyFor(s, false));
}
function grassClump(x, z, s, opt) {
  const y = terrainH(x, z); const base = grassColAt(s, x, z); const cnt = opt.cnt || 6;
  for (let i = 0; i < cnt; i++) {
    const r = rnd() * opt.r, a = rnd() * TAU; const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    const h = opt.h * rnd.range(0.6, 1.25); const tip = rnd();
    const c = mix3(base, [base[0] * 1.35 + 0.08, base[1] * 1.25 + 0.05, base[2] * 0.8], tip * 0.7);
    blade([px, y + (terrainH(px, pz) - y) * 0.0, pz], h, opt.w * rnd.range(0.7, 1.3), c, 0.75 + rnd() * 0.25, 0.5 + h * 0.4, [Math.cos(a) * 0.35 * rnd(), Math.sin(a) * 0.35 * rnd()], s);
  }
  if (opt.flowers && rnd() < opt.flowers) {
    const fc = rnd.pick([[0.95, 0.92, 0.85], [0.95, 0.75, 0.3], [0.85, 0.55, 0.7], [0.95, 0.85, 0.4]]);
    for (let i = 0; i < 3; i++) { const fx = x + rnd.range(-0.3, 0.3), fz = z + rnd.range(-0.3, 0.3), fh = opt.h * rnd.range(0.7, 1.1); SB.push([fx, y + fh, fz], [0.05, 0, 0], [0, 0.05, 0], fc, 1, [0, 1, 0.3], 0, 0, 0.3, keyFor(s, false)); }
  }
}
function frond(base, dir, len, el, wid, c, s, core, droop) {
  const ce = Math.cos(el), se = Math.sin(el);
  const Vd = [dir[0] * ce, se, dir[1] * ce]; const Ud = V.norm(V.cross(Vd, UP)); const nrm = V.cross(Ud, Vd);
  const half = len * 0.5;
  SB.push([base[0] + Vd[0] * half, base[1] + Vd[1] * half, base[2] + Vd[2] * half], V.mul(Ud, wid), V.mul(Vd, half), c, 0.8, nrm, 2, 2, 0.35, keyFor(s, core));
  if (droop) { const tip = V.add(base, V.mul(Vd, len * 0.92)); const e2 = el - droop; frond(tip, dir, len * 0.55, e2, wid * 0.7, c, s, core, 0); }
}
function fern(x, z, s, size, core) {
  const y = terrainH(x, z); const g = grassColAt(s, x, z);
  const c0 = mix3([0.22, 0.38, 0.12], [0.38, 0.5, 0.16], rnd()); const c = mix3(c0, g, 0.25);
  const nf = rnd.int(7, 11); const a0 = rnd() * TAU;
  for (let i = 0; i < nf; i++) {
    const a = a0 + i / nf * TAU + rnd.range(-0.2, 0.2); const len = size * rnd.range(0.75, 1.15);
    frond([x, y + 0.05, z], [Math.cos(a), Math.sin(a)], len, rnd.range(0.35, 0.85), len * 0.23, mix3(c, [c[0] * 1.2, c[1] * 1.15, c[2]], rnd()), s, core, rnd() < 0.5 ? 0.9 : 0);
  }
}
const MB = { chunks: new Map() };
function meshFor(s) { const k = chunkOf(s); if (!MB.chunks.has(k)) MB.chunks.set(k, new MeshB()); return MB.chunks.get(k); }
function trunk(s, a, b, ra, rb, col, mat = 1, seg = 7) { meshFor(s).cyl(a, b, ra, rb, col, seg, mat, false); }
function daub(p, r, c, n, s, core = true, trans = true, ao = 0.85) {
  const u = V.norm(V.cross(n, Math.abs(n[1]) < 0.9 ? UP : [1, 0, 0])), w = V.cross(n, u); const ang = rnd() * TAU;
  const U = V.add(V.mul(u, Math.cos(ang) * r), V.mul(w, Math.sin(ang) * r)), Vv = V.add(V.mul(u, -Math.sin(ang) * r * 0.85), V.mul(w, Math.cos(ang) * r * 0.85));
  SB.push(p, U, Vv, c, ao, n, 0, trans ? 2 : 0, 0.15, keyFor(s, core));
}
function conifer(x, z, s, h, detail) {
  const y = terrainH(x, z) - 0.3; const bark = [0.33, 0.24, 0.17]; const r0 = h * 0.018 + 0.15;
  trunk(s, [x, y, z], [x, y + h, z], r0, r0 * 0.25, bark, 1, 8);
  const g = mix3([0.12, 0.24, 0.1], [0.2, 0.3, 0.12], rnd());
  const whorls = Math.round(5 + h / 4);
  for (let w = 0; w < whorls; w++) {
    const t = w / (whorls - 1); const wy = y + h * lerp(0.45, 0.98, t); const bl = lerp(h * 0.22, h * 0.06, t) * rnd.range(0.8, 1.2);
    const nb = rnd.int(4, 6); const a0 = rnd() * TAU;
    for (let b = 0; b < nb; b++) {
      const a = a0 + b / nb * TAU; const dx = Math.cos(a), dz = Math.sin(a);
      const tip = [x + dx * bl, wy + bl * 0.08, z + dz * bl];
      if (detail > 0.5) trunk(s, [x, wy, z], tip, 0.07, 0.03, bark, 1, 4);
      const nd = Math.max(2, Math.round(bl * 1.1 * detail));
      for (let k = 0; k < nd; k++) {
        const u = (k + 0.5) / nd; const p = [x + dx * bl * u + rnd.range(-0.3, 0.3), wy + bl * 0.08 * u + rnd.range(-0.2, 0.3) - u * u * 0.4, z + dz * bl * u + rnd.range(-0.3, 0.3)];
        daub(p, rnd.range(0.65, 1.05) * (detail < 0.5 ? 1.7 : 1), mix3(g, [g[0] * 1.5, g[1] * 1.4, g[2] * 1.2], rnd() * 0.6 + (p[1] - y) / h * 0.3), V.norm([dx * 0.4, 1, dz * 0.4]), s);
      }
    }
  }
}
function broadleaf(x, z, s, h, detail) {
  const y = terrainH(x, z) - 0.2; const bark = [0.4, 0.33, 0.25]; const r0 = 0.18 + h * 0.02;
  const top = [x + rnd.range(-0.6, 0.6), y + h * 0.62, z + rnd.range(-0.6, 0.6)];
  trunk(s, [x, y, z], top, r0, r0 * 0.6, bark, 1, 7);
  for (let b = 0; b < 3; b++) { const a = rnd() * TAU; trunk(s, top, [top[0] + Math.cos(a) * h * 0.25, top[1] + h * 0.2, top[2] + Math.sin(a) * h * 0.25], r0 * 0.5, r0 * 0.2, bark, 1, 5); }
  const g = mix3([0.33, 0.45, 0.13], [0.5, 0.55, 0.16], rnd()); const cr = h * 0.36;
  const cc = [top[0], top[1] + cr * 0.55, top[2]]; const nd = Math.round((90 + h * 6) * detail);
  for (let k = 0; k < nd; k++) {
    const u = rnd() * 2 - 1, a = rnd() * TAU, rr = Math.sqrt(1 - u * u); const nn = [rr * Math.cos(a), u * 0.8 + 0.1, rr * Math.sin(a)];
    const rad = cr * (0.75 + 0.3 * vnoise(nn[0] * 3 + x, nn[2] * 3 + z));
    const p = [cc[0] + nn[0] * rad, cc[1] + nn[1] * rad * 0.7, cc[2] + nn[2] * rad];
    daub(p, rnd.range(0.6, 1.0) * (detail < 0.5 ? 1.6 : 1), mix3(g, [g[0] * 1.4, g[1] * 1.3, g[2]], clamp(nn[1] * 0.5 + 0.4 + rnd() * 0.2, 0, 1)), V.norm(nn), s);
  }
}
function treeFern(x, z, s, h) {
  const y = terrainH(x, z) - 0.1; const top = [x + rnd.range(-0.3, 0.3), y + h, z + rnd.range(-0.3, 0.3)];
  trunk(s, [x, y, z], top, 0.2, 0.16, [0.27, 0.2, 0.14], 1, 7);
  const nf = rnd.int(10, 14); const c = mix3([0.25, 0.42, 0.13], [0.34, 0.5, 0.15], rnd());
  for (let i = 0; i < nf; i++) { const a = i / nf * TAU + rnd.range(-0.2, 0.2); frond(top, [Math.cos(a), Math.sin(a)], rnd.range(2.2, 3.0), rnd.range(0.25, 0.55), 0.6, c, s, true, 1.0); }
}
function cycad(x, z, s, h) {
  const y = terrainH(x, z) - 0.1; const top = [x, y + h, z];
  trunk(s, [x, y, z], top, 0.32, 0.26, [0.36, 0.3, 0.2], 4, 8);
  const nf = rnd.int(12, 16); const c = mix3([0.16, 0.3, 0.1], [0.24, 0.36, 0.12], rnd());
  for (let i = 0; i < nf; i++) { const a = i / nf * TAU + rnd.range(-0.15, 0.15); frond(top, [Math.cos(a), Math.sin(a)], rnd.range(1.2, 1.8), rnd.range(0.5, 1.0), 0.32, c, s, true, 0); }
}
function bush(x, z, s, r) {
  const y = terrainH(x, z); const g = mix3([0.22, 0.34, 0.12], [0.35, 0.42, 0.15], rnd()); const nd = Math.round(14 + r * 16);
  for (let k = 0; k < nd; k++) {
    const u = rnd(), a = rnd() * TAU, rr = Math.sqrt(1 - u * u); const nn = [rr * Math.cos(a), u, rr * Math.sin(a)];
    daub([x + nn[0] * r, y + nn[1] * r * 0.8 + 0.1, z + nn[2] * r], rnd.range(0.3, 0.5) * r + 0.15, mix3(g, [g[0] * 1.4, g[1] * 1.3, g[2]], u * 0.6), nn, s, true);
  }
  if (rnd() < 0.3) { const fc = rnd.pick([[0.95, 0.9, 0.8], [0.9, 0.6, 0.7]]); for (let k = 0; k < 6; k++) { const a = rnd() * TAU; daub([x + Math.cos(a) * r * 0.9, y + r * rnd.range(0.4, 0.9), z + Math.sin(a) * r * 0.9], 0.09, fc, [Math.cos(a), 0.5, Math.sin(a)], s, false, false, 1); } }
}
function reeds(x, z, s) {
  const y = terrainH(x, z); const n = rnd.int(6, 12);
  for (let i = 0; i < n; i++) { const px = x + rnd.range(-0.5, 0.5), pz = z + rnd.range(-0.5, 0.5), h = rnd.range(1.1, 2.0); blade([px, y, pz], h, 0.045, mix3([0.2, 0.33, 0.14], [0.36, 0.42, 0.18], rnd()), 0.8, 0.5, [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)], s); }
}
function litter(x, z, s, c) { const y = terrainH(x, z) + 0.03; const r = rnd.range(0.25, 0.55); const a = rnd() * TAU; SB.push([x, y, z], [Math.cos(a) * r, 0, Math.sin(a) * r], [-Math.sin(a) * r * 0.7, 0, Math.cos(a) * r * 0.7], c, 0.8, [0, 1, 0], 0, 0, 0, keyFor(s, false)); }
function rock(x, z, s, r, sq = 0.6) {
  const y = terrainH(x, z); const m = meshFor(s); const b0 = m.nv; const seg = r > 2 ? 9 : 6;
  const col = mix3(PAL.rock, PAL.rockD, rnd()); const sd = rnd() * 100;
  for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg * 2; i++) {
    const th = j / seg * Math.PI, ph = i / (seg * 2) * TAU; const n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
    const k = 1 + 0.28 * vnoise(n[0] * 2.1 + sd, n[2] * 2.1 + n[1] * 1.7) + 0.1 * vnoise(n[0] * 5 + sd, n[1] * 5);
    m.vert([x + n[0] * r * k, y - r * 0.25 + n[1] * r * k * sq, z + n[2] * r * k * 0.9], n, mix3(col, [0.42, 0.44, 0.3], clamp(n[1], 0, 1) * 0.25), 2);
  }
  const W = seg * 2 + 1; for (let j = 0; j < seg; j++) for (let i = 0; i < seg * 2; i++) { const a = b0 + j * W + i; m.tri(a, a + 1, a + W); m.tri(a + 1, a + W + 1, a + W); }
}

function buildVegetation() {
  const T0 = performance.now(); SB = new SplatBuf(1 << 18);
  const END = COURSE_END + 60;
  for (let s = 0; s < END; s += 1) {
    const p = secAt(s); const A = PATH.at(s);
    const P = (d) => [A.p[0] + A.r[0] * d, A.p[2] + A.r[2] * d];
    const near = (lo, hi, dens, fn) => { let cnt = dens * (hi - lo) * 2; while (cnt > 0) { if (rnd() < cnt) { const d = rnd.range(lo, hi) * rnd.sgn(); const [x, z] = P(d); fn(x, z, d); } cnt -= 1; } };
    const riv = p.river > 0.5;
    // grass
    near(4.2, 6.5, 0.4 * p.grass, (x, z) => grassClump(x, z, s, { r: 0.35, h: 0.35, w: 0.035, cnt: 4 }));
    if (!riv) near(6.5, 18, 0.32 * p.grass, (x, z) => grassClump(x, z, s, { r: 0.5, h: 0.5 + p.tall * 0.25, w: 0.04, cnt: 6, flowers: 0.08 }));
    else near(13.5, 22, 0.3 * p.grass, (x, z) => grassClump(x, z, s, { r: 0.5, h: 0.5, w: 0.04, cnt: 6 }));
    near(18, 48, 0.05 * p.grass, (x, z) => grassClump(x, z, s, { r: 0.8, h: 0.55, w: 0.06, cnt: 6 }));
    near(6, 32, 0.11 * p.tall, (x, z) => grassClump(x, z, s, { r: 0.6, h: 1.15, w: 0.05, cnt: 8 }));
    if (!riv && rnd() < 0.5) { const [x, z] = P(rnd.range(-0.25, 0.25)); grassClump(x, z, s, { r: 0.15, h: 0.18, w: 0.03, cnt: 3 }); }
    // ferns and bushes
    near(4.6, 30, 0.07 * p.fern, (x, z) => fern(x, z, s, rnd.range(0.9, 1.6), true));
    near(30, 80, 0.015 * p.fern, (x, z) => fern(x, z, s, rnd.range(1.2, 1.8), true));
    near(7, 50, 0.012 * (p.grass * 0.4 + p.fern * 0.6), (x, z) => bush(x, z, s, rnd.range(0.6, 1.4)));
    near(5, 40, 0.3 * p.fern, (x, z) => litter(x, z, s, mix3(grassColAt(s, x, z), mix3([0.42, 0.34, 0.22], [0.3, 0.38, 0.16], rnd()), 0.5)));
    // trees
    const treeOK = (x, z, d) => !(Math.abs(d) < 9 + (riv ? 12 : 0));
    near(9, 45, 0.006 * p.trees, (x, z, d) => { if (!treeOK(x, z, d)) return; const r = rnd(); if (p.fern > 0.5 && r < 0.35) treeFern(x, z, s, rnd.range(2.5, 5)); else if (r < 0.55) cycad(x, z, s, rnd.range(0.6, 1.6)); else if (r < 0.82) conifer(x, z, s, rnd.range(14, 26), 1); else broadleaf(x, z, s, rnd.range(8, 13), 1); });
    near(45, 140, 0.0035 * p.trees + 0.0005, (x, z, d) => { if (rnd() < 0.7) conifer(x, z, s, rnd.range(16, 28), 0.4); else broadleaf(x, z, s, rnd.range(9, 14), 0.4); });
    near(140, 300, 0.0012 * p.trees + 0.0004, (x, z) => conifer(x, z, s, rnd.range(18, 30), 0.3));
    // rocks
    near(5, 40, 0.004 * p.rocks, (x, z) => rock(x, z, s, rnd.range(0.4, 1.6)));
    if (p.wallH > 20) near(8, 13, 0.02 * p.rocks, (x, z) => rock(x, z, s, rnd.range(1, 3.2), 0.8));
    if (riv) { near(4, 12, 0.03, (x, z) => rock(x, z, s, rnd.range(0.15, 0.5), 0.45)); near(12, 17, 0.25, (x, z) => reeds(x, z, s)); }
  }
  // sort: by chunk, core splats first, fill shuffled so a prefix is a random subset
  const n = SB.n; const order = new Uint32Array(n); for (let i = 0; i < n; i++) order[i] = i;
  const keys = SB.keys; order.sort((a, b) => keys[a] - keys[b]);
  const out = new ArrayBuffer(n * 48), o8 = new Uint8Array(out), i8 = SB.u8;
  for (let i = 0; i < n; i++) o8.set(i8.subarray(order[i] * 48, order[i] * 48 + 48), i * 48);
  // chunk table
  const NCH = chunkOf(END) + 1; const ch = [];
  for (let c = 0; c < NCH; c++) ch.push({ first: 0, core: 0, fill: 0, s0: c * WORLD.CH, mesh: null, c: null, r: 0 });
  let i = 0;
  for (let c = 0; c < NCH; c++) {
    ch[c].first = i;
    while (i < n && Math.floor(keys[order[i]] / 4) === c && (keys[order[i]] % 4) < 2) { ch[c].core++; i++; }
    while (i < n && Math.floor(keys[order[i]] / 4) === c) { ch[c].fill++; i++; }
  }
  const f = new Float32Array(out);
  for (const c of ch) { // bounding sphere
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let k = c.first; k < c.first + c.core + c.fill; k++) for (let a = 0; a < 3; a++) { const v = f[k * 12 + a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; }
    if (c.core + c.fill === 0) { const A = PATH.at(c.s0); mn = V.sub(A.p, [1, 1, 1]); mx = V.add(A.p, [1, 1, 1]); }
    c.c = V.mul(V.add(mn, mx), 0.5); c.r = V.dist(mn, mx) * 0.5 + 12;
  }
  WORLD.splat = splatVAO(o8, n); WORLD.chunks = ch;
  for (const [k, m] of MB.chunks) if (ch[k]) ch[k].mesh = m.build();
  MB.chunks.clear();
  WORLD.stats.splats = n; WORLD.stats.vegMs = Math.round(performance.now() - T0);
  SB = null;
}

// ---- river water strip ----
function buildWater() {
  const s0 = 1600, s1 = COURSE_END - 80; const W = 22, ds = 2, dd = 1; const nd = Math.round(2 * W / dd) + 1; const ns = Math.round((s1 - s0) / ds) + 1;
  const vb = new Float32Array(ns * nd * 6); const idx = [];
  for (let j = 0; j < ns; j++) {
    const s = s0 + j * ds; const A = PATH.at(s); const wy = waterY(s);
    for (let i = 0; i < nd; i++) {
      const d = -W + i * dd; const x = A.p[0] + A.r[0] * d, z = A.p[2] + A.r[2] * d; const h = terrainH(x, z);
      const k = (j * nd + i) * 6; vb[k] = x; vb[k + 1] = wy; vb[k + 2] = z; vb[k + 3] = wy - h; vb[k + 4] = A.t[0] * 0.9; vb[k + 5] = A.t[2] * 0.9;
    }
  }
  for (let j = 0; j < ns - 1; j++) for (let i = 0; i < nd - 1; i++) {
    const a = j * nd + i; const dep = Math.max(vb[a * 6 + 3], vb[(a + 1) * 6 + 3], vb[(a + nd) * 6 + 3], vb[(a + nd + 1) * 6 + 3]);
    if (dep < -0.25) continue; idx.push(a, a + nd, a + 1, a + 1, a + nd, a + nd + 1);
  }
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, vb, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW);
  gl.bindVertexArray(null); WORLD.water = { vao, n: idx.length, s0, s1 };
}

// ---- set dressing: gate, practice targets, outpost ----
function buildProps() {
  const m = new MeshB(); const wood = [0.42, 0.3, 0.2], dark = [0.25, 0.18, 0.12], paint = [0.85, 0.75, 0.45], green = [0.25, 0.38, 0.25];
  // gate at s=22
  const gs = 22, G = (d, h) => PATH.world(gs, d, h);
  for (const d of [-5.2, 5.2]) { const b = G(d, -0.5); b[1] = terrainH(b[0], b[2]) - 0.5; m.cyl(b, [b[0], b[1] + 6.2, b[2]], 0.22, 0.18, wood, 8, 1); }
  { const a = G(-5.6, 5.3), b = G(5.6, 5.3); a[1] = b[1] = terrainH(a[0], a[2]) + 5.2; m.cyl(a, b, 0.17, 0.17, wood, 8, 1); }
  { const A = PATH.at(gs); const c = G(0, 0); c[1] = terrainH(c[0], c[2]) + 4.3; const mm = M4.basis(c, A.r, UP); m.box(mm, [7.2, 1.1, 0.12], paint, 0); m.box(M4.mul(mm, M4.trans(0, 0, 0.07)), [6.6, 0.22, 0.02], green, 0);
    for (let k = 0; k < 9; k++) m.box(M4.mul(mm, M4.trans(-2.8 + k * 0.7, -0.28, 0.08)), [0.3, 0.16, 0.02], dark, 0); }
  // ranger outpost near the end
  const os = COURSE_END - 30;
  for (const [d, w, dd, h] of [[-13, 7, 5, 3.2], [15, 5, 4, 2.8]]) {
    const A = PATH.at(os + d * 0.5); const c = PATH.world(os + d * 0.5, d, 0); c[1] = terrainH(c[0], c[2]);
    const mm = M4.basis([c[0], c[1] + h / 2, c[2]], A.t, UP); m.box(mm, [w, h, dd], [0.55, 0.45, 0.32], 1);
    m.box(M4.mul(mm, M4.trans(0, h / 2 + 0.25, 0)), [w + 0.8, 0.3, dd + 0.8], [0.35, 0.3, 0.25], 1);
    m.box(M4.mul(mm, M4.trans(0, -h * 0.1, dd / 2 + 0.01)), [1.0, 1.9, 0.05], dark, 1);
  }
  for (let k = -12; k <= 12; k++) { if (Math.abs(k) < 2) continue; for (const side of [-1, 1]) { const p = PATH.world(os - 40 + Math.abs(k) * 4, side * (6 + Math.abs(k) * 0.6), 0); p[1] = terrainH(p[0], p[2]); m.cyl([p[0], p[1] - 0.3, p[2]], [p[0], p[1] + 1.4, p[2]], 0.09, 0.08, wood, 6, 1); } }
  { const p = PATH.world(os + 10, -9, 0); p[1] = terrainH(p[0], p[2]); m.cyl([p[0], p[1], p[2]], [p[0], p[1] + 9, p[2]], 0.07, 0.05, [0.7, 0.7, 0.7], 6, 3);
    const A = PATH.at(os); const mm = M4.basis([p[0] + A.r[0] * 0.8, p[1] + 8.4, p[2] + A.r[2] * 0.8], A.r, UP); m.box(mm, [1.5, 0.9, 0.03], [0.85, 0.55, 0.2], 6); }
  WORLD.props = m.build();
}
function buildWorld() {
  rnd = RNG(SEED * 7919 + 13);
  buildTerrain(); buildVegetation(); buildWater(); buildProps();
}
