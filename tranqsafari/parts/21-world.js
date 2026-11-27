// ===== World generation per route: terrain tiles, splat vegetation (48-byte records), rocks, trees, water, props =====
// Splat record: pos f32x3 | U f32x3 | V f32x3 | rgb+ao u8x4 | normal i8x4 | shape, flags, sway, seed u8x4
// shape: 0 round daub, 1 grass blade, 2 pinnate frond, 3 soft blob, 4 broad leaf / hanging strand
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
  const vao = track(gl.createVertexArray()); gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, QUAD_BUF); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const vb = track(gl.createBuffer()); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);
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

const WORLD = { level: -1, tiles: [], chunks: [], CH: 50, water: [], props: null, vents: [], splat: null, stats: {}, res: [] };
const PAL = { grassG: [0.33, 0.42, 0.18], grassY: [0.5, 0.48, 0.24], forest: [0.2, 0.3, 0.12], plain: [0.42, 0.5, 0.2], sand: [0.6, 0.53, 0.4] };
function mix3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function valleyGreen(p, x, z, n) {
  let c = mix3(PAL.grassG, PAL.grassY, clamp(p.tall * 0.8 + n * 0.3 - 0.1, 0, 1));
  c = mix3(c, PAL.forest, clamp(p.fern * 0.85 + p.trees * 0.2 - 0.15, 0, 1));
  return mix3(c, PAL.plain, clamp((p.W - 80) / 40, 0, 1) * 0.6);
}
// ground colour and blade colour at a spot; routes with their own palette override the valley formula
function grassColAt(s, x, z) { const p = secAt(s); const n = vnoise(x * 0.03, z * 0.03) * 0.5 + 0.5; const c = valleyGreen(p, x, z, n); return p.gndK > 0.001 ? mix3(c, mix3(p.gnd, p.gnd2, n), p.gndK) : c; }
function vegColAt(s, x, z) { const p = secAt(s); const n = vnoise(x * 0.03, z * 0.03) * 0.5 + 0.5; const c = valleyGreen(p, x, z, n); return p.gndK > 0.001 ? mix3(c, [p.veg[0] * (0.85 + 0.3 * n), p.veg[1] * (0.85 + 0.3 * n), p.veg[2]], p.gndK) : c; }

// ---- terrain tiles (world grid, three spacings, skirts hide cracks) ----
// vertex: pos f32x3 | normal f32x3 | rgb + pad u8x4 | dirt, rock, wet, lava weights u8x4 (32 bytes)
function makeTerrainVAO(buf, idx) {
  const vao = track(gl.createVertexArray()); gl.bindVertexArray(vao);
  const vb = track(gl.createBuffer()); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, buf, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 32, 24);
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, 32, 28);
  const ib = track(gl.createBuffer()); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, n: idx.length, type: idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
}
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
  const buf = new ArrayBuffer(NV * 32), f = new Float32Array(buf), u8 = new Uint8Array(buf);
  let minY = 1e9, maxY = -1e9;
  const B = v => clamp(v * 255, 0, 255);
  const put = (k, x, y, z, nx_, ny, nz_, c, w) => { f[k * 8] = x; f[k * 8 + 1] = y; f[k * 8 + 2] = z; f[k * 8 + 3] = nx_; f[k * 8 + 4] = ny; f[k * 8 + 5] = nz_; const b = k * 32 + 24; u8[b] = B(c[0]); u8[b + 1] = B(c[1]); u8[b + 2] = B(c[2]); u8[b + 3] = 255; u8[b + 4] = B(w[0]); u8[b + 5] = B(w[1]); u8[b + 6] = B(w[2]); u8[b + 7] = B(w[3]); };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = ox + i * sp, z = oz + j * sp, h = hs[(j + 1) * nb + i + 1];
    const dx = (hs[(j + 1) * nb + i + 2] - hs[(j + 1) * nb + i]) / (2 * sp), dz = (hs[(j + 2) * nb + i + 1] - hs[j * nb + i + 1]) / (2 * sp);
    const nl = Math.hypot(dx, 1, dz); const ny = 1 / nl; const o = info[j * n + i]; const P = secAt(o.s);
    const a = Math.abs(o.d); let c, dirt = 0, rockW = 0, wet = 0;
    const slope = Math.hypot(dx, dz);
    const g = grassColAt(o.s, x, z);
    if (o.river > 0.5 && a < 13) {
      const wy = o.wl;
      c = h < wy - 0.02 ? P.bedC : mix3(P.mudC, PAL.sand, smooth(0, 1.5, h - wy)); wet = h < wy + 0.15 ? 1 : 0;
      c = mix3(c, g, smooth(1.2, 3, h - wy));
    } else if (a < 4.4) {
      const rut = Math.exp(-Math.pow((a - 0.95) / 0.28, 2)); const mid = a < 0.35 ? 0.5 * (1 - P.gndK * 0.6) : 0;
      c = mix3(mix3(P.roadC, P.rutC, rut * 0.8), g, mid * 0.6 + smooth(3, 4.4, a) * 0.5); dirt = 1;
    } else {
      c = mix3(P.roadC, g, smooth(4.4, 7.5, a)); dirt = 1 - smooth(4.4, 7.5, a);
    }
    const rockT = clamp(smooth(0.55, 0.95, slope) + o.cliff * 0.9, 0, 1);
    if (rockT > 0.02) { c = mix3(c, mix3(P.rockA, P.rockB, vnoise(x * 0.1, z * 0.1) * 0.5 + 0.5), rockT); rockW = rockT; }
    if (o.river > 0.2 && a >= 13 && a < 20) c = mix3(c, P.mudC, 0.35 * o.river * (1 - smooth(16, 20, a)));
    if (o.wl !== null && o.river < 0.5) {   // standing water: muddy shore, darker bed
      const dW = h - o.wl; c = mix3(c, P.mudC, smooth(0.4, -0.05, dW) * 0.85); c = mix3(c, P.bedC, smooth(-0.05, -0.6, dW)); wet = Math.max(wet, smooth(0.3, 0.02, dW)); dirt *= 1 - wet * 0.5;
    }
    put(j * n + i, x, h, z, -dx / nl, ny, -dz / nl, c, [dirt, rockW, wet, o.lavaW]);
    minY = Math.min(minY, h); maxY = Math.max(maxY, h);
  }
  // skirts: duplicate edge vertices 4 m lower
  let k = n * n; const edges = [];
  const edge = (list) => { const start = k; for (const idx of list) { new Uint8Array(buf, k * 32, 32).set(new Uint8Array(buf, idx * 32, 32)); f[k * 8 + 1] -= 4; k++; } edges.push([list, start]); };
  const row = (j) => Array.from({ length: n }, (_, i) => j * n + i), colI = (i) => Array.from({ length: n }, (_, j) => j * n + i);
  edge(row(0)); edge(row(n - 1)); edge(colI(0)); edge(colI(n - 1));
  const idx = [];
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i; idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1); }
  for (const [list, start] of edges) for (let t = 0; t < list.length - 1; t++) { const a = list[t], b = list[t + 1], c = start + t, d = start + t + 1; idx.push(a, b, c, b, d, c, a, c, b, b, c, d); }
  const mesh = makeTerrainVAO(new Uint8Array(buf), NV > 65535 ? new Uint32Array(idx) : new Uint16Array(idx));
  mesh.nv = NV; mesh.minY = minY; mesh.maxY = maxY; mesh.box = [ox, oz, ox + size, oz + size];
  return mesh;
}

// ---- vegetation ----
let SB = null;
const E_ = {};
function chunkOf(s) { return clamp(Math.floor(s / WORLD.CH), 0, 999); }
function keyFor(s, core) { return chunkOf(s) * 4 + (core ? 0 : 2) + (core ? 0 : Math.random()); }
const UP = [0, 1, 0];
// ground height where a plant may stand: NaN under more than maxDep of water, or on lava
function siteY(x, z, maxDep = -0.03) { const y = terrainH(x, z, E_); if (E_.wl !== null && E_.wl - y > maxDep) return NaN; if (E_.lavaW > 0.01 && Math.abs(lavaF(x, z)) < 0.22) return NaN; return y; }
function blade(p, h, w, c, ao, sway, lean, s) {
  const Vv = [lean[0] * h * 0.5, h * 0.5, lean[1] * h * 0.5];
  const nrm = [rnd.range(-0.4, 0.4), 1, rnd.range(-0.4, 0.4)];
  SB.push([p[0] + Vv[0], p[1] + Vv[1] - 0.03, p[2] + Vv[2]], [w, 0, 0], Vv, c, ao, nrm, 1, 1 | 2, sway, keyFor(s, false));
}
function tuft(p, h, w, c, ao, sway, s) {   // one splat drawn as five fanned blades
  SB.push([p[0], p[1] + h * 0.5 - 0.03, p[2]], [w, 0, 0], [0, h * 0.5, 0], c, ao, [rnd.range(-0.3, 0.3), 1, rnd.range(-0.3, 0.3)], 5, 1 | 2, sway, keyFor(s, false));
}
function grassClump(x, z, s, opt) {
  const y = siteY(x, z); if (y !== y) return; const base = opt.col || vegColAt(s, x, z); const cnt = opt.cnt || 6;
  for (let i = 0; i < cnt; i++) {
    const r = rnd() * opt.r, a = rnd() * TAU; const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    const h = opt.h * rnd.range(0.6, 1.25); const tip = rnd();
    const c = mix3(base, [base[0] * 1.35 + 0.08, base[1] * 1.25 + 0.05, base[2] * 0.8], tip * 0.7);
    if (opt.tuft && i % 2) tuft([px, y, pz], h * 0.9, h * 0.42, c, 0.75 + rnd() * 0.25, 0.5 + h * 0.4, s);
    else blade([px, y, pz], h, opt.w * rnd.range(0.7, 1.3), c, 0.75 + rnd() * 0.25, 0.5 + h * 0.4, [Math.cos(a) * 0.35 * rnd(), Math.sin(a) * 0.35 * rnd()], s);
    if (opt.seed && rnd() < opt.seed) { const lx = Math.cos(a) * 0.3 * h * 0.5, lz = Math.sin(a) * 0.3 * h * 0.5; SB.push([px + lx, y + h * 0.97, pz + lz], [0.035, 0, 0], [lx * 0.2, 0.11, lz * 0.2], [0.72, 0.62, 0.36], 1, [0, 1, 0.3], 0, 1 | 2, 0.9, keyFor(s, false)); }
  }
  const fl = (opt.flowers || 0) * secAt(s).flowers;
  if (fl && rnd() < fl) {
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
  const y = siteY(x, z); if (y !== y) return; const g = vegColAt(s, x, z);
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
  let y = siteY(x, z, -0.05); if (y !== y) return; y -= 0.3; const bark = [0.33, 0.24, 0.17]; const r0 = h * 0.018 + 0.15;
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
  let y = siteY(x, z, -0.05); if (y !== y) return; y -= 0.2; const bark = [0.4, 0.33, 0.25]; const r0 = 0.18 + h * 0.02;
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
  let y = siteY(x, z, -0.05); if (y !== y) return; y -= 0.1; const top = [x + rnd.range(-0.3, 0.3), y + h, z + rnd.range(-0.3, 0.3)];
  trunk(s, [x, y, z], top, 0.2, 0.16, [0.27, 0.2, 0.14], 1, 7);
  const nf = rnd.int(10, 14); const c = mix3([0.25, 0.42, 0.13], [0.34, 0.5, 0.15], rnd());
  for (let i = 0; i < nf; i++) { const a = i / nf * TAU + rnd.range(-0.2, 0.2); frond(top, [Math.cos(a), Math.sin(a)], rnd.range(2.2, 3.0), rnd.range(0.25, 0.55), 0.6, c, s, true, 1.0); }
}
function cycad(x, z, s, h) {
  let y = siteY(x, z, -0.05); if (y !== y) return; y -= 0.1; const top = [x, y + h, z];
  trunk(s, [x, y, z], top, 0.32, 0.26, [0.36, 0.3, 0.2], 4, 8);
  const nf = rnd.int(12, 16); const c = mix3([0.16, 0.3, 0.1], [0.24, 0.36, 0.12], rnd());
  for (let i = 0; i < nf; i++) { const a = i / nf * TAU + rnd.range(-0.15, 0.15); frond(top, [Math.cos(a), Math.sin(a)], rnd.range(1.2, 1.8), rnd.range(0.5, 1.0), 0.32, c, s, true, 0); }
}
function palm(x, z, s, h) {
  let y = siteY(x, z, -0.08); if (y !== y) return; y -= 0.2; const bark = [0.42, 0.36, 0.27]; const la = rnd() * TAU, lean = rnd.range(0.08, 0.28);
  let p0 = [x, y, z]; const segs = 4;
  for (let i = 1; i <= segs; i++) { const t = i / segs; const p1 = [x + Math.cos(la) * lean * h * t * t, y + h * t, z + Math.sin(la) * lean * h * t * t]; trunk(s, p0, p1, lerp(0.24, 0.15, (i - 1) / segs), lerp(0.24, 0.15, t), bark, 4, 7); p0 = p1; }
  const nf = rnd.int(9, 12); const c = mix3([0.2, 0.34, 0.12], [0.3, 0.42, 0.15], rnd());
  for (let i = 0; i < nf; i++) { const a = i / nf * TAU + rnd.range(-0.2, 0.2); frond(p0, [Math.cos(a), Math.sin(a)], rnd.range(2.4, 3.3), rnd.range(0.05, 0.6), 0.55, c, s, true, 1.15); }
}
// swamp cypress: flared buttress standing in water, flat crown, hanging moss
function cypress(x, z, s, h, detail) {
  const y0 = terrainH(x, z, E_); const dep = E_.wl === null ? 0 : Math.max(0, E_.wl - y0); if (dep > 1.4) return;
  const y = y0 - 0.4; const bark = [0.33, 0.28, 0.23]; const r0 = 0.28 + h * 0.02; const m = meshFor(s);
  const b1 = [x, y + 1.9 + dep, z], top = [x + rnd.range(-0.5, 0.5), y + h * 0.74, z + rnd.range(-0.5, 0.5)];
  m.cyl([x, y, z], b1, r0 * 2.7, r0 * 1.15, bark, 9, 1, false); m.cyl(b1, top, r0 * 1.15, r0 * 0.62, bark, 8, 1, false);
  if (detail > 0.5) for (let k = 0; k < 4; k++) { const a = rnd() * TAU, d = rnd.range(1.2, 2.6); const kx = x + Math.cos(a) * d, kz = z + Math.sin(a) * d; const ky = terrainH(kx, kz); m.cyl([kx, ky - 0.2, kz], [kx, Math.max(ky, y0 + dep) + rnd.range(0.25, 0.7), kz], 0.14, 0.04, bark, 5, 1, false); }
  const g = mix3([0.13, 0.22, 0.1], [0.2, 0.28, 0.12], rnd()); const moss = [0.42, 0.46, 0.36]; const nb = detail > 0.5 ? 6 : 4; const a0 = rnd() * TAU; const L = h * 0.36;
  for (let b = 0; b < nb; b++) {
    const a = a0 + b / nb * TAU + rnd.range(-0.2, 0.2); const dx = Math.cos(a), dz = Math.sin(a); const bl = L * rnd.range(0.7, 1.15);
    const tip = [top[0] + dx * bl, top[1] + bl * 0.3, top[2] + dz * bl];
    if (detail > 0.5) m.cyl(top, tip, r0 * 0.4, 0.05, bark, 5, 1, false);
    const nd = Math.max(3, Math.round(bl * 1.3 * detail));
    for (let k = 0; k < nd; k++) {
      const u = (k + 0.6) / nd; const p = [top[0] + dx * bl * u + rnd.range(-0.5, 0.5), top[1] + bl * 0.3 * u + rnd.range(0.1, 0.9), top[2] + dz * bl * u + rnd.range(-0.5, 0.5)];
      daub(p, rnd.range(0.9, 1.4) * (detail < 0.5 ? 1.6 : 1), mix3(g, [g[0] * 1.5, g[1] * 1.4, g[2] * 1.1], rnd() * 0.7), V.norm([dx * 0.3, 1, dz * 0.3]), s);
      if (detail > 0.5 && rnd() < 0.75) { const len = rnd.range(1.0, 2.8); const q = [p[0] + rnd.range(-0.4, 0.4), p[1] - 0.3, p[2] + rnd.range(-0.4, 0.4)]; SB.push([q[0], q[1] - len * 0.5, q[2]], [rnd.range(0.12, 0.22), 0, 0], [0, -len * 0.5, 0], mix3(moss, [0.3, 0.36, 0.26], rnd()), 0.85, [dx, 0.4, dz], 4, 1 | 2, 0.55, keyFor(s, true)); }
    }
  }
  for (let k = 0; k < Math.round(5 * detail); k++) daub([top[0] + rnd.range(-1, 1), top[1] + rnd.range(0.6, 1.4), top[2] + rnd.range(-1, 1)], rnd.range(1.0, 1.5), g, UP, s);
}
function snag(x, z, s, h, burnt) {
  let y = siteY(x, z, 0.9); if (y !== y) return; y -= 0.3; const col = burnt ? [0.09, 0.085, 0.085] : [0.5, 0.47, 0.42]; const m = meshFor(s);
  const top = [x + rnd.range(-0.5, 0.5), y + h, z + rnd.range(-0.5, 0.5)]; m.cyl([x, y, z], top, 0.16 + h * 0.018, 0.05, col, 6, 1, false);
  for (let b = 0; b < rnd.int(2, 4); b++) { const t = rnd.range(0.4, 0.9), a = rnd() * TAU, L = h * rnd.range(0.12, 0.3); const p = V.lerp([x, y, z], top, t); m.cyl(p, [p[0] + Math.cos(a) * L, p[1] + L * rnd.range(0.2, 0.8), p[2] + Math.sin(a) * L], 0.07, 0.02, col, 4, 1, false); }
}
function bush(x, z, s, r) {
  const y = siteY(x, z); if (y !== y) return; const g = mix3(mix3([0.22, 0.34, 0.12], [0.35, 0.42, 0.15], rnd()), vegColAt(s, x, z), secAt(s).gndK * 0.5); const nd = Math.round(14 + r * 16);
  for (let k = 0; k < nd; k++) {
    const u = rnd(), a = rnd() * TAU, rr = Math.sqrt(1 - u * u); const nn = [rr * Math.cos(a), u, rr * Math.sin(a)];
    daub([x + nn[0] * r, y + nn[1] * r * 0.8 + 0.1, z + nn[2] * r], rnd.range(0.3, 0.5) * r + 0.15, mix3(g, [g[0] * 1.4, g[1] * 1.3, g[2]], u * 0.6), nn, s, true);
  }
  if (rnd() < 0.3 * secAt(s).flowers) { const fc = rnd.pick([[0.95, 0.9, 0.8], [0.9, 0.6, 0.7]]); for (let k = 0; k < 6; k++) { const a = rnd() * TAU; daub([x + Math.cos(a) * r * 0.9, y + r * rnd.range(0.4, 0.9), z + Math.sin(a) * r * 0.9], 0.09, fc, [Math.cos(a), 0.5, Math.sin(a)], s, false, false, 1); } }
}
function reeds(x, z, s, shoreOnly) {
  const y = terrainH(x, z, E_); const dep = E_.wl === null ? -9 : E_.wl - y; if (dep > 0.45 || (shoreOnly && dep < -0.3)) return; const n = rnd.int(6, 12);
  for (let i = 0; i < n; i++) {
    const px = x + rnd.range(-0.5, 0.5), pz = z + rnd.range(-0.5, 0.5), h = rnd.range(1.1, 2.0); const top = Math.max(y, y + dep);
    blade([px, y, pz], h + Math.max(0, dep), 0.045, mix3([0.2, 0.33, 0.14], [0.36, 0.42, 0.18], rnd()), 0.8, 0.5, [rnd.range(-0.15, 0.15), rnd.range(-0.15, 0.15)], s);
    if (shoreOnly && rnd() < 0.3) SB.push([px, top + h * 0.92, pz], [0.045, 0, 0], [0, 0.13, 0], [0.3, 0.2, 0.12], 0.9, [0, 1, 0.2], 0, 1, 0.5, keyFor(s, false));  // cattail head
  }
}
function lilyPads(x, z, s) {
  const y = terrainH(x, z, E_); if (E_.wl === null) return; const dep = E_.wl - y; if (dep < 0.14 || dep > 1.8) return; const wy = E_.wl + 0.03; const n = rnd.int(3, 8);
  for (let i = 0; i < n; i++) {
    const px = x + rnd.range(-1.1, 1.1), pz = z + rnd.range(-1.1, 1.1); if (terrainH(px, pz) > E_.wl - 0.08) continue; const r = rnd.range(0.16, 0.38), a = rnd() * TAU;
    SB.push([px, wy, pz], [Math.cos(a) * r, 0, Math.sin(a) * r], [-Math.sin(a) * r * 0.92, 0, Math.cos(a) * r * 0.92], mix3([0.18, 0.36, 0.14], [0.3, 0.45, 0.16], rnd()), 0.95, UP, 0, 0, 0, keyFor(s, false));
    if (rnd() < 0.14) SB.push([px, wy + 0.07, pz], [0.07, 0, 0], [0, 0.07, 0], rnd() < 0.5 ? [0.95, 0.9, 0.86] : [0.92, 0.62, 0.74], 1, [0, 1, 0.2], 0, 0, 0, keyFor(s, false));
  }
}
function litter(x, z, s, c) { let y = siteY(x, z, -0.02); if (y !== y) return; y += 0.03; const r = rnd.range(0.25, 0.55); const a = rnd() * TAU; SB.push([x, y, z], [Math.cos(a) * r, 0, Math.sin(a) * r], [-Math.sin(a) * r * 0.7, 0, Math.cos(a) * r * 0.7], c, 0.8, [0, 1, 0], 0, 0, 0, keyFor(s, false)); }
function rock(x, z, s, r, sq = 0.6) {
  const y = siteY(x, z, 0.7); if (y !== y) return; const P = secAt(s); const m = meshFor(s); const b0 = m.nv; const seg = r > 2 ? 9 : 6;
  const col = mix3(P.rockA, P.rockB, rnd()); const sd = rnd() * 100; const topTint = P.lava > 0.5 ? col : [0.42, 0.44, 0.3];
  for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg * 2; i++) {
    const th = j / seg * Math.PI, ph = i / (seg * 2) * TAU; const n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
    const k = 1 + 0.28 * vnoise(n[0] * 2.1 + sd, n[2] * 2.1 + n[1] * 1.7) + 0.1 * vnoise(n[0] * 5 + sd, n[1] * 5);
    m.vert([x + n[0] * r * k, y - r * 0.25 + n[1] * r * k * sq, z + n[2] * r * k * 0.9], n, mix3(col, topTint, clamp(n[1], 0, 1) * 0.25), 2);
  }
  const W = seg * 2 + 1; for (let j = 0; j < seg; j++) for (let i = 0; i < seg * 2; i++) { const a = b0 + j * W + i; m.tri(a, a + 1, a + W); m.tri(a + 1, a + W + 1, a + W); }
}

function buildVegetation() {
  const T0 = performance.now(); SB = new SplatBuf(1 << 18);
  const END = Math.min(COURSE_END + 60, PATH.N - 1);
  for (let s = 0; s < END; s += 1) {
    const p = secAt(s); const A = PATH.at(s);
    const P = (d) => [A.p[0] + A.r[0] * d, A.p[2] + A.r[2] * d];
    const near = (lo, hi, dens, fn) => { let cnt = dens * (hi - lo) * 2; while (cnt > 0) { if (rnd() < cnt) { const d = rnd.range(lo, hi) * rnd.sgn(); const [x, z] = P(d); fn(x, z, d); } cnt -= 1; } };
    const riv = p.river > 0.5;
    // grass
    near(4.2, 6.5, 0.55 * p.grass, (x, z) => grassClump(x, z, s, { r: 0.4, h: 0.35, w: 0.035, cnt: 4, tuft: 1 }));
    if (!riv) near(6.5, 18, 0.42 * p.grass, (x, z) => grassClump(x, z, s, { r: 0.6, h: 0.5 + p.tall * 0.25, w: 0.04, cnt: 6, flowers: 0.08, tuft: 1 }));
    else near(13.5, 22, 0.3 * p.grass, (x, z) => grassClump(x, z, s, { r: 0.6, h: 0.5, w: 0.04, cnt: 6, tuft: 1 }));
    near(18, 48, 0.06 * p.grass, (x, z) => grassClump(x, z, s, { r: 0.9, h: 0.55, w: 0.06, cnt: 6, tuft: 1 }));
    near(6, 32, 0.11 * p.tall, (x, z) => grassClump(x, z, s, { r: 0.6, h: 1.15, w: 0.05, cnt: 8, seed: 0.35 }));
    if (p.gndK < 0.5) near(4.6, 34, 0.1 * p.grass, (x, z) => { const g = grassColAt(s, x, z); litter(x, z, s, mix3(g, rnd() < 0.5 ? [g[0] * 0.75, g[1] * 0.82, g[2] * 0.7] : [g[0] * 1.25, g[1] * 1.15, g[2] * 0.9], 0.8)); });
    if (!riv && p.gndK < 0.5 && rnd() < 0.5) { const [x, z] = P(rnd.range(-0.25, 0.25)); grassClump(x, z, s, { r: 0.15, h: 0.18, w: 0.03, cnt: 3 }); }
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
    if (p.cliff > 0.5) near(8, 13, 0.02 * p.rocks, (x, z) => rock(x, z, s, rnd.range(1, 3.2), 0.8));
    if (riv) { near(4, 12, 0.03, (x, z) => rock(x, z, s, rnd.range(0.15, 0.5), 0.45)); near(12, 17, 0.25, (x, z) => reeds(x, z, s, false)); }
    // wetland, lava field and lagoon plants (Dusk Delta)
    if (p.cyp > 0.01) { near(7, 55, 0.0075 * p.cyp, (x, z) => cypress(x, z, s, rnd.range(11, 19), 1)); near(55, 170, 0.0028 * p.cyp, (x, z) => cypress(x, z, s, rnd.range(13, 21), 0.4)); }
    if (p.reed > 0.01) { near(3.6, 12, 0.22 * p.reed, (x, z) => reeds(x, z, s, true)); near(12, 45, 0.06 * p.reed, (x, z) => reeds(x, z, s, true)); }
    if (p.pads > 0.01) near(5, 40, 0.035 * p.pads, (x, z) => lilyPads(x, z, s));
    if (p.snag + p.burnt > 0.01) near(8, 90, 0.0022 * p.snag + 0.0045 * p.burnt, (x, z) => snag(x, z, s, rnd.range(4, 11), p.burnt > 0.5));
    if (p.palm > 0.01) { near(4.6, 30, 0.004 * p.palm, (x, z) => palm(x, z, s, rnd.range(5, 9))); near(150, 300, 0.0016 * p.palm, (x, z) => palm(x, z, s, rnd.range(7, 11))); }
    if (p.lava > 0.5) { near(12, 60, 0.003, (x, z) => rock(x, z, s, rnd.range(1.5, 3.5), 1.5)); near(9, 45, 0.0016, (x, z) => { const y = siteY(x, z); if (y === y) WORLD.vents.push([x, y, z]); }); }
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

// ---- water: a flowing strip along the river (Valley Run), flat sheets for marsh and lagoon (Dusk Delta) ----
// vertex: pos f32x3 | depth, flow x, flow z, murk f32x4 (28 bytes)
function waterVAO(vb, idx, s0, s1) {
  const vao = track(gl.createVertexArray()); gl.bindVertexArray(vao);
  const b = track(gl.createBuffer()); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, vb, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
  const ib = track(gl.createBuffer()); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null); return { vao, n: idx.length, s0, s1 };
}
function waterStrip(s0, s1) {
  const W = 22, ds = 2, dd = 1; const nd = Math.round(2 * W / dd) + 1; const ns = Math.round((s1 - s0) / ds) + 1;
  const vb = new Float32Array(ns * nd * 7); const idx = [];
  for (let j = 0; j < ns; j++) {
    const s = s0 + j * ds; const A = PATH.at(s); const wy = waterY(s);
    for (let i = 0; i < nd; i++) {
      const d = -W + i * dd; const x = A.p[0] + A.r[0] * d, z = A.p[2] + A.r[2] * d; const h = terrainH(x, z);
      const k = (j * nd + i) * 7; vb[k] = x; vb[k + 1] = wy; vb[k + 2] = z; vb[k + 3] = wy - h; vb[k + 4] = A.t[0] * 0.9; vb[k + 5] = A.t[2] * 0.9; vb[k + 6] = 0.3;
    }
  }
  for (let j = 0; j < ns - 1; j++) for (let i = 0; i < nd - 1; i++) {
    const a = j * nd + i; const dep = Math.max(vb[a * 7 + 3], vb[(a + 1) * 7 + 3], vb[(a + nd) * 7 + 3], vb[(a + nd + 1) * 7 + 3]);
    if (dep < -0.25) continue; idx.push(a, a + nd, a + 1, a + 1, a + nd, a + nd + 1);
  }
  return waterVAO(vb, new Uint32Array(idx), s0, s1);
}
// one world-aligned sheet at a constant height; 6 m cells, split into 1.5 m quads near the road so the shoreline is crisp
function waterSheet(w, s1) {
  const FAR = 280, CELL = 6, SUB = 4; let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
  for (let s = w.s0; s <= s1; s += 8) { mnx = Math.min(mnx, PATH.X[s]); mxx = Math.max(mxx, PATH.X[s]); mnz = Math.min(mnz, PATH.Z[s]); mxz = Math.max(mxz, PATH.Z[s]); }
  mnx = Math.floor((mnx - FAR) / CELL) * CELL; mnz = Math.floor((mnz - FAR) / CELL) * CELL; const nx = Math.ceil((mxx + FAR - mnx) / CELL), nz = Math.ceil((mxz + FAR - mnz) / CELL);
  const v = [], idx = []; const o = {};
  const corner = (x, z) => { const h = terrainH(x, z, o); const ok = o.s >= w.s0 && o.s <= s1 && Math.abs(o.d) <= FAR; return { x, z, dep: w.y - h, ok, d: Math.abs(o.d), murk: secAt(o.s).murk }; };
  const quad = (a, b, c, d) => { if (!(a.ok && b.ok && c.ok && d.ok) || Math.max(a.dep, b.dep, c.dep, d.dep) < -0.2) return; const k = v.length / 7; for (const p of [a, b, c, d]) v.push(p.x, w.y, p.z, p.dep, 0.12, 0.05, p.murk); idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); };
  let prev = null;
  for (let j = 0; j <= nz; j++) {
    const rowC = []; for (let i = 0; i <= nx; i++) rowC.push(corner(mnx + i * CELL, mnz + j * CELL));
    if (prev) for (let i = 0; i < nx; i++) {
      const a = prev[i], b = prev[i + 1], c = rowC[i], d = rowC[i + 1];
      if (Math.min(a.d, b.d, c.d, d.d) < 26) {
        const g = []; for (let jj = 0; jj <= SUB; jj++) { const r = []; for (let ii = 0; ii <= SUB; ii++) r.push((ii % SUB === 0 && jj % SUB === 0) ? [a, b, c, d][(jj ? 2 : 0) + (ii ? 1 : 0)] : corner(a.x + ii * CELL / SUB, a.z + jj * CELL / SUB)); g.push(r); }
        for (let jj = 0; jj < SUB; jj++) for (let ii = 0; ii < SUB; ii++) quad(g[jj][ii], g[jj][ii + 1], g[jj + 1][ii], g[jj + 1][ii + 1]);
      } else quad(a, b, c, d);
    }
    prev = rowC;
  }
  return waterVAO(new Float32Array(v), new Uint32Array(idx), w.s0, s1);
}
function buildWater() {
  const T0 = performance.now();
  for (const w of LV.water) { const s1 = Math.min(w.s1, PATH.N - 2); WORLD.water.push(w.kind === 'river' ? waterStrip(w.s0, s1) : waterSheet(w, s1)); }
  WORLD.stats.waterMs = Math.round(performance.now() - T0);
}

// ---- set dressing ----
function hut(m, s, d, w, dd, h, lit) {
  const A = PATH.at(s); const c = PATH.world(s, d, 0); c[1] = terrainH(c[0], c[2]);
  const mm = M4.basis([c[0], c[1] + h / 2, c[2]], A.t, UP); m.box(mm, [w, h, dd], [0.55, 0.45, 0.32], 1);
  m.box(M4.mul(mm, M4.trans(0, h / 2 + 0.25, 0)), [w + 0.8, 0.3, dd + 0.8], [0.35, 0.3, 0.25], 1);
  const side = d < 0 ? 1 : -1;   // door and window face the road
  m.box(M4.mul(mm, M4.trans(0, -h * 0.1, side * (dd / 2 + 0.01))), [1.0, 1.9, 0.05], [0.25, 0.18, 0.12], 1);
  if (lit) m.box(M4.mul(mm, M4.trans(w * 0.3, 0.25, side * (dd / 2 + 0.02))), [0.9, 0.7, 0.05], [1, 0.8, 0.45], 5);
}
function buildProps() {
  const m = new MeshB(); const wood = [0.42, 0.3, 0.2], dark = [0.25, 0.18, 0.12], paint = [0.85, 0.75, 0.45], green = [0.25, 0.38, 0.25];
  const post = (s, d, h = 1.4, r = 0.09, cap = false) => { const p = PATH.world(s, d, 0); p[1] = terrainH(p[0], p[2]); m.cyl([p[0], p[1] - 0.3, p[2]], [p[0], p[1] + h, p[2]], r, r * 0.9, wood, 6, 1); if (cap) m.cyl([p[0], p[1] + h - 0.22, p[2]], [p[0], p[1] + h - 0.1, p[2]], r * 1.15, r * 1.15, [0.95, 0.9, 0.7], 6, 5, false); };
  if (LV.id === 'valley') {
    // gate at s=22
    const gs = 22, G = (d, h) => PATH.world(gs, d, h);
    for (const d of [-5.2, 5.2]) { const b = G(d, -0.5); b[1] = terrainH(b[0], b[2]) - 0.5; m.cyl(b, [b[0], b[1] + 6.2, b[2]], 0.22, 0.18, wood, 8, 1); }
    { const a = G(-5.6, 5.3), b = G(5.6, 5.3); a[1] = b[1] = terrainH(a[0], a[2]) + 5.2; m.cyl(a, b, 0.17, 0.17, wood, 8, 1); }
    { const A = PATH.at(gs); const c = G(0, 0); c[1] = terrainH(c[0], c[2]) + 4.3; const mm = M4.basis(c, A.r, UP); m.box(mm, [7.2, 1.1, 0.12], paint, 0); m.box(M4.mul(mm, M4.trans(0, 0, 0.07)), [6.6, 0.22, 0.02], green, 0);
      for (let k = 0; k < 9; k++) m.box(M4.mul(mm, M4.trans(-2.8 + k * 0.7, -0.28, 0.08)), [0.3, 0.16, 0.02], dark, 0); }
    // ranger outpost near the end
    const os = COURSE_END - 30;
    hut(m, os - 6.5, -13, 7, 5, 3.2, false); hut(m, os + 7.5, 15, 5, 4, 2.8, false);
    for (let k = -12; k <= 12; k++) { if (Math.abs(k) < 2) continue; for (const side of [-1, 1]) post(os - 40 + Math.abs(k) * 4, side * (6 + Math.abs(k) * 0.6)); }
    { const p = PATH.world(os + 10, -9, 0); p[1] = terrainH(p[0], p[2]); m.cyl([p[0], p[1], p[2]], [p[0], p[1] + 9, p[2]], 0.07, 0.05, [0.7, 0.7, 0.7], 6, 3);
      const A = PATH.at(os); const mm = M4.basis([p[0] + A.r[0] * 0.8, p[1] + 8.4, p[2] + A.r[2] * 0.8], A.r, UP); m.box(mm, [1.5, 0.9, 0.03], [0.85, 0.55, 0.2], 6); }
  } else {
    // Dusk Delta: the outpost yard at the start, marker posts along the causeway, old bones on the flats, a lighthouse station at the end
    hut(m, 6, -12, 7, 5, 3.2, true); hut(m, 22, 13, 5, 4, 2.8, true);
    for (let k = 0; k < 9; k++) for (const side of [-1, 1]) post(34 + k * 5, side * (5.2 - k * 0.2));
    for (let s = 112; s < 2400; s += 9) { if (s > 925 && s < 1345) continue; post(s, ((s / 9) | 0) % 2 ? 3.35 : -3.35, 1.05, 0.07, true); }
    { // ribcage on the mudflats
      const bone = [0.82, 0.78, 0.66]; const bs = 655, bd = -24; const A = PATH.at(bs); const o = PATH.world(bs, bd, 0); o[1] = terrainH(o[0], o[2]);
      const ax = V.norm(V.add(A.t, V.mul(A.r, 0.35))), sd = V.norm(V.cross(ax, UP));
      m.cyl(V.add(o, [0, 0.5, 0]), V.add(V.add(o, V.mul(ax, 15)), [0, 0.7, 0]), 0.32, 0.2, bone, 8, 0);
      for (let i = 0; i < 8; i++) for (const sg of [-1, 1]) { let p0 = V.add(V.add(o, V.mul(ax, 1.5 + i * 1.6)), [0, 0.55, 0]); const R = 3.4 - Math.abs(i - 3) * 0.3;
        for (let k = 1; k <= 6; k++) { const a = k / 6 * 2.3; const p1 = V.add(V.add(V.add(o, V.mul(ax, 1.5 + i * 1.6)), V.mul(sd, sg * Math.sin(a) * R * 0.75)), [0, 0.55 + (1 - Math.cos(a)) * R * 0.62, 0]); m.cyl(p0, p1, 0.13 - k * 0.012, 0.118 - k * 0.012, bone, 5, 0, false); p0 = p1; } }
      const sk = V.add(V.add(o, V.mul(ax, 18.5)), [0, 0.9, 0]); m.sphere(sk, 1.25, bone, 8, 0, [1.7, 0.85, 0.9]);
    }
    for (const v of WORLD.vents) { for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; m.sphere([v[0] + Math.cos(a) * 0.55, v[1] + 0.05, v[2] + Math.sin(a) * 0.55], 0.32, [0.13, 0.12, 0.12], 5, 2, [1, 0.7, 1]); } m.cyl([v[0], v[1] - 0.1, v[2]], [v[0], v[1] + 0.06, v[2]], 0.4, 0.34, [0.9, 0.35, 0.08], 8, 5, true); }
    { // lighthouse station
      const ls = COURSE_END + 24, ld = -13; const b = PATH.world(ls, ld, 0); b[1] = terrainH(b[0], b[2]);
      const band = [[0, 3.2, 2.3, 2.1, [0.86, 0.84, 0.78]], [3.2, 6.4, 2.1, 1.9, [0.7, 0.2, 0.16]], [6.4, 9.6, 1.9, 1.7, [0.86, 0.84, 0.78]], [9.6, 12.6, 1.7, 1.55, [0.7, 0.2, 0.16]]];
      for (const [y0, y1, r0, r1, c] of band) m.cyl([b[0], b[1] + y0 - (y0 ? 0 : 0.5), b[2]], [b[0], b[1] + y1, b[2]], r0, r1, c, 14, 0, false);
      m.cyl([b[0], b[1] + 12.6, b[2]], [b[0], b[1] + 12.9, b[2]], 2.1, 2.1, [0.2, 0.2, 0.2], 14, 3); m.cyl([b[0], b[1] + 12.9, b[2]], [b[0], b[1] + 14.5, b[2]], 1.15, 1.15, [1, 0.93, 0.7], 12, 5, false);
      m.cyl([b[0], b[1] + 14.5, b[2]], [b[0], b[1] + 15.6, b[2]], 1.5, 0.1, [0.25, 0.22, 0.2], 12, 3);
      hut(m, COURSE_END + 6, -11, 6, 5, 3, true); hut(m, COURSE_END + 12, 12, 5, 4, 2.8, true);
      const mast = PATH.world(COURSE_END + 30, 9, 0); mast[1] = terrainH(mast[0], mast[2]); m.cyl(mast, [mast[0], mast[1] + 11, mast[2]], 0.08, 0.04, [0.6, 0.6, 0.62], 6, 3); m.sphere([mast[0], mast[1] + 11.1, mast[2]], 0.16, [1, 0.15, 0.1], 6, 5);
      for (let k = 0; k < 8; k++) for (const side of [-1, 1]) post(COURSE_END - 30 + k * 5, side * (5 + k * 0.5));
    }
  }
  WORLD.props = m.build();
}
function freeWorld() {
  for (const o of WORLD.res) { if (o instanceof WebGLVertexArrayObject) gl.deleteVertexArray(o); else if (o instanceof WebGLBuffer) gl.deleteBuffer(o); }
  WORLD.res = []; WORLD.tiles = []; WORLD.chunks = []; WORLD.water = []; WORLD.props = null; WORLD.vents = []; WORLD.splat = null; WORLD.level = -1;
}
// load a route: path, sections, then every GPU buffer of its world (the previous route's buffers are freed first)
function buildWorld(level) {
  const T0 = performance.now(); freeWorld(); loadLevelDef(level);
  const cast = ensureSpecies(LV.cast); WORLD.stats.castMs = Object.values(cast).reduce((a, b) => a + b, 0);
  RES = WORLD.res; rnd = RNG(SEED * 7919 + LV.seed);
  buildTerrain(); buildVegetation(); buildWater(); buildProps();
  RES = null; WORLD.level = LEVEL; WORLD.stats.ms = Math.round(performance.now() - T0); WORLD.stats.level = LV.id;
}
