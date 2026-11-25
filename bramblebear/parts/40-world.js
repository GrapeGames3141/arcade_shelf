// ---------- the valley: terrain, river + waterfall, lake, trails, forest ----------
// World is 360 m square centred on the origin, -z is north (uphill). A cliff band crosses the middle-north;
// the river drops over it as a waterfall, winds south and fills a lake. Trails loop the lake, follow the river
// up to the falls, and climb the gentle west end of the cliff to the top of the falls.
const W = { HALF: 180, CELL: 2, N: 181 };
const LAKE = { x: 38, z: 112, r: 34, y: 1.2 };
const cliffZ = x => -55 + 7 * Math.sin(x * 0.021);
function natH(x, z) {
  let h = 3 + 30 * smoothstep(60, -175, z);
  h += 18 * (fbm(x * 0.0075 + 3.1, z * 0.0075 + 7.3) - 0.5);
  h += 2.2 * (fbm(x * 0.04 + 11, z * 0.04 + 2) - 0.5);
  const cz = cliffZ(x), cliffH = 13 * Math.exp(-((x / 75) ** 2));
  h += cliffH * smoothstep(cz + 2.2, cz - 2.2, z);
  const edge = Math.max(Math.abs(x), Math.abs(z));
  h += 30 * smoothstep(150, 178, edge);
  return h;
}
// Catmull-Rom through control points, sampled about every metre
function spline(pts, step = 1, closed = false) {
  const out = []; const n = pts.length; const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = pts[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[closed ? (i + 2) % n : Math.min(i + 2, n - 1)];
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), k = Math.max(2, Math.ceil(L / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}
const RIVER_PTS = [[-34, -170], [-26, -140], [-12, -112], [-4, -86], [4, -66], [7, -50], [12, -38], [22, -16], [10, 12], [20, 40], [33, 70], [38, 95]];
const TRAILS = {
  lake: { pts: (() => { const p = []; for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; const r = LAKE.r + 9 + 3 * Math.sin(a * 3); p.push([LAKE.x + Math.cos(a) * r, LAKE.z + Math.sin(a) * r]); } return p; })(), closed: true },
  river: { pts: [[56, 82], [52, 55], [40, 30], [36, 4], [40, -18], [30, -34], [20, -42]], closed: false },
  ridge: { pts: [[-150, 40], [-135, 5], [-125, -30], [-118, -62], [-90, -80], [-55, -82], [-25, -74], [-8, -66], [20, -80], [60, -96], [110, -100], [150, -92]], closed: false },
  west: { pts: [[4, 120], [-30, 110], [-70, 90], [-110, 70], [-150, 40]], closed: false }
};
let ter = null;   // Float32Array of heights
let rIdx = null, rDst = null; // nearest river sample per grid node
const RIVER = { pts: [], s: [], w: [], falls: -1 };
function gi(i, j) { return j * W.N + i; }
function buildTerrainData() {
  // river samples, widths and water surface heights (monotonic downhill, with one vertical drop at the cliff)
  const rp = spline(RIVER_PTS, 1.2);
  RIVER.pts = rp; const n = rp.length;
  for (let i = 0; i < n; i++) RIVER.w[i] = lerp(2.6, 5.6, i / (n - 1));
  let lip = -1;
  for (let i = 0; i < n; i++) if (lip < 0 && rp[i][1] > cliffZ(rp[i][0]) - 3.2) lip = i;
  RIVER.falls = lip;
  let s = natH(rp[0][0], rp[0][1]) - 1.2;
  for (let i = 0; i < n; i++) {
    const tgt = natH(rp[i][0], rp[i][1]) - 1.25;
    if (i === lip + 1) { const q = rp[Math.min(n - 1, lip + 5)]; s = natH(q[0], q[1]) - 1.4; }
    else s = Math.min(s - 0.004, i <= lip ? Math.max(tgt, s - 0.35) : tgt);
    if (Math.hypot(rp[i][0] - LAKE.x, rp[i][1] - LAKE.z) < LAKE.r - 2) s = LAKE.y;
    RIVER.s[i] = Math.max(s, LAKE.y);
  }
  // plunge pool below the falls: wider
  for (let i = lip + 1; i < Math.min(n, lip + 9); i++) RIVER.w[i] = Math.max(RIVER.w[i], 7.5 - (i - lip) * 0.35);
  // heightmap with the river and lake carved in
  ter = new Float32Array(W.N * W.N); rIdx = new Int16Array(W.N * W.N); rDst = new Float32Array(W.N * W.N);
  for (let j = 0; j < W.N; j++) for (let i = 0; i < W.N; i++) {
    const x = -W.HALF + i * W.CELL, z = -W.HALF + j * W.CELL;
    let h = natH(x, z);
    let best = 1e9, bi = 0;
    for (let k = 0; k < n; k += 2) { const dx = x - rp[k][0], dz = z - rp[k][1], d = dx * dx + dz * dz; if (d < best) { best = d; bi = k; } }
    for (let k = Math.max(0, bi - 2); k <= Math.min(n - 1, bi + 2); k++) { const dx = x - rp[k][0], dz = z - rp[k][1], d = dx * dx + dz * dz; if (d < best) { best = d; bi = k; } }
    const d = Math.sqrt(best), w = RIVER.w[bi], sf = RIVER.s[bi];
    rIdx[gi(i, j)] = bi; rDst[gi(i, j)] = d;
    const depth = bi > RIVER.falls && bi < RIVER.falls + 9 ? 2.4 : 0.8 + w * 0.12;
    if (d < w) h = Math.min(h, sf - depth * Math.pow(1 - (d / w) ** 2, 0.6));
    else if (d < w + 12) { const t = (d - w) / 12; h = Math.min(h, lerp(sf + 0.35, h, smoothstep(0, 1, t))); }
    const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
    if (dl < LAKE.r) h = Math.min(h, LAKE.y - 4 * Math.pow(1 - (dl / LAKE.r) ** 2, 0.55) - 0.3);
    else if (dl < LAKE.r + 14) h = Math.min(h, lerp(LAKE.y + 0.25, h, smoothstep(0, 1, (dl - LAKE.r) / 14)));
    ter[gi(i, j)] = h;
  }
  // trails: sampled polylines with cumulative length (hikers walk these)
  for (const k in TRAILS) {
    const t = TRAILS[k]; t.path = spline(t.pts, 1.5, t.closed);
    if (t.closed) t.path.push(t.path[0].slice());
    t.len = [0]; for (let i = 1; i < t.path.length; i++) t.len.push(t.len[i - 1] + Math.hypot(t.path[i][0] - t.path[i - 1][0], t.path[i][1] - t.path[i - 1][1]));
    t.total = t.len[t.len.length - 1];
  }
}
function groundH(x, z) {
  const fx = clamp((x + W.HALF) / W.CELL, 0, W.N - 1.001), fz = clamp((z + W.HALF) / W.CELL, 0, W.N - 1.001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  const a = ter[gi(i, j)], b = ter[gi(i + 1, j)], c = ter[gi(i, j + 1)], d = ter[gi(i + 1, j + 1)];
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function groundN(x, z) { const e = 0.6, hx = groundH(x + e, z) - groundH(x - e, z), hz = groundH(x, z + e) - groundH(x, z - e); const l = Math.hypot(hx, 2 * e, hz); return [-hx / l, 2 * e / l, -hz / l]; }
// nearest river sample (index, distance) for any point
function riverNear(x, z) {
  const i = clamp(Math.round((x + W.HALF) / W.CELL), 0, W.N - 1), j = clamp(Math.round((z + W.HALF) / W.CELL), 0, W.N - 1);
  const c = rIdx[gi(i, j)], rp = RIVER.pts; let best = 1e9, bi = c;
  for (let k = Math.max(0, c - 6); k <= Math.min(rp.length - 1, c + 6); k++) { const d = Math.hypot(x - rp[k][0], z - rp[k][1]); if (d < best) { best = d; bi = k; } }
  return [bi, best];
}
// water surface height at a point, or -1e9 if there's no water there
function waterH(x, z) {
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 3) return LAKE.y;
  const [i, d] = riverNear(x, z);
  if (d < RIVER.w[i] + 0.6) return RIVER.s[i];
  return -1e9;
}
function distToPath(path, x, z) {
  let best = 1e9;
  for (let k = 0; k < path.length - 1; k++) {
    const ax = path[k][0], az = path[k][1], bx = path[k + 1][0], bz = path[k + 1][1];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1);
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t)); if (d < best) best = d;
  }
  return best;
}
function trailDist(x, z) { let b = 1e9; for (const k in TRAILS) b = Math.min(b, distToPath(TRAILS[k].path, x, z)); return b; }

// ---------- collision: tree trunks and rocks as circles in a grid ----------
const COL = { cell: 8, map: new Map() };
function colAdd(x, z, r) { const k = Math.floor(x / COL.cell) + ',' + Math.floor(z / COL.cell); if (!COL.map.has(k)) COL.map.set(k, []); COL.map.get(k).push([x, z, r]); }
function colPush(p, r) { // push a point out of trunks/rocks; returns true on contact
  let hit = false; const cx = Math.floor(p[0] / COL.cell), cz = Math.floor(p[2] / COL.cell);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const L = COL.map.get((cx + a) + ',' + (cz + b)); if (!L) continue;
    for (const [x, z, cr] of L) { const dx = p[0] - x, dz = p[2] - z, d = Math.hypot(dx, dz), m = r + cr; if (d < m && d > 1e-4) { p[0] = x + dx / d * m; p[2] = z + dz / d * m; hit = true; } }
  }
  return hit;
}

// ---------- build all static meshes ----------
const SCENERY = { berries: [], baskets: [], waters: [], fallsMesh: null, fallsTop: null, fallsBottom: null };
function buildWorld() {
  buildTerrainData();
  const t0 = performance.now();
  // terrain mesh
  const b = new MB();
  const idx = new Int32Array(W.N * W.N);
  for (let j = 0; j < W.N; j++) for (let i = 0; i < W.N; i++) {
    const x = -W.HALF + i * W.CELL, z = -W.HALF + j * W.CELL, y = ter[gi(i, j)];
    const n = groundN(x, z), slope = 1 - n[1];
    const td = trailDist(x, z), trail = clamp(1.6 - td * 0.75, 0, 1);
    const rockW = smoothstep(0.22, 0.42, slope);
    const wh = waterH(x, z), shore = wh > -1e8 ? smoothstep(1.4, 0.2, y - wh + 0.6) : clamp(1 - (Math.hypot(x - LAKE.x, z - LAKE.z) - LAKE.r) / 5, 0, 1) * 0.9;
    const moss = smoothstep(0.55, 0.7, fbm(x * 0.05 + 40, z * 0.05)) * (1 - trail);
    b.c = [clamp(shore, 0, 1), moss, 0]; b.p = [trail, rockW, -1];
    idx[gi(i, j)] = b.vert(x, y, z, n[0], n[1], n[2]);
  }
  for (let j = 0; j < W.N - 1; j++) for (let i = 0; i < W.N - 1; i++) b.quad(idx[gi(i, j)], idx[gi(i, j + 1)], idx[gi(i + 1, j + 1)], idx[gi(i + 1, j)]);
  const terr = b.build({ name: 'terrain' }); terr.isStatic = true; glPush(terr, m4());
  // forest: jittered grid, density from noise; keep trails, water and steep ground clear
  const rnd = mulberry32(4242), r = (a, b2) => a + (b2 - a) * rnd();
  const M = new Float32Array(16);
  const place = (mesh, x, z, s, yaw, tint, sink = 0.15) => { m4basis(M, r3Y(yaw), x, groundH(x, z) - sink, z, s, s, s); glPush(mesh, M, tint[0], tint[1], tint[2], 1); };
  for (let gz = -W.HALF + 6; gz < W.HALF - 6; gz += 6.5) for (let gx = -W.HALF + 6; gx < W.HALF - 6; gx += 6.5) {
    const x = gx + r(-2.6, 2.6), z = gz + r(-2.6, 2.6);
    const dens = fbm(x * 0.012 + 9, z * 0.012 + 1); if (rnd() > smoothstep(0.32, 0.6, dens) * 0.95) continue;
    const [ri, rd] = riverNear(x, z); if (rd < RIVER.w[ri] + 3) continue;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 6) continue;
    if (trailDist(x, z) < 3.2) continue;
    if (groundN(x, z)[1] < 0.8) continue;
    const north = smoothstep(40, -100, z), nearWater = rd < RIVER.w[ri] + 14 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 20;
    const roll = rnd(); const s = r(0.85, 1.35);
    const green = (a) => [a * r(0.8, 1.15), a * r(0.85, 1.2), a * r(0.75, 1.1)];
    if (nearWater && roll < 0.35) { place(MESH.birch, x, z, s, r(0, TAU), green(1)); colAdd(x, z, 0.2 * s); }
    else if (roll < 0.45 + north * 0.45) { place(MESH.pine, x, z, s * r(0.9, 1.3), r(0, TAU), green(1)); colAdd(x, z, 0.3 * s); }
    else { place(MESH.oak, x, z, s, r(0, TAU), green(1)); colAdd(x, z, 0.32 * s); }
  }
  // undergrowth: ferns, bushes, rocks, logs
  for (let k = 0; k < 1500; k++) {
    const x = r(-170, 170), z = r(-170, 170); const [ri, rd] = riverNear(x, z);
    if (rd < RIVER.w[ri] + 1 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 1 || trailDist(x, z) < 1.8) continue;
    const kind = rnd();
    if (kind < 0.6) place(MESH.fern, x, z, r(0.7, 1.3), r(0, TAU), [r(0.8, 1.2), r(0.8, 1.2), 1], 0.05);
    else if (kind < 0.85) place(MESH.bush, x, z, r(0.7, 1.4), r(0, TAU), [r(0.8, 1.1), r(0.85, 1.2), 1], 0.1);
    else if (kind < 0.97) { const s = r(0.4, 1.4), rv = 'rock' + Math.floor(rnd() * 3); place(MESH[rv], x, z, s, r(0, TAU), [r(0.85, 1.1), r(0.85, 1.05), r(0.8, 1)], 0.25 * s); if (s > 0.8) colAdd(x, z, 0.75 * s); }
    else { const y = groundH(x, z); m4basis(M, r3Y(r(0, TAU)), x, y + 0.2, z, 1, 1, 1); glPush(MESH.log, M); }
  }
  // boulders along the river and at the foot of the cliff
  for (let i = 0; i < RIVER.pts.length; i += 3) {
    if (rnd() > 0.45) continue;
    const [px, pz] = RIVER.pts[i], side = rnd() < 0.5 ? -1 : 1, w = RIVER.w[i];
    const q = RIVER.pts[Math.min(i + 1, RIVER.pts.length - 1)], dx = q[0] - px, dz = q[1] - pz, l = Math.hypot(dx, dz) || 1;
    const off = w + r(-1.5, 2.5), x = px - dz / l * off * side, z = pz + dx / l * off * side, s = r(0.5, 1.5);
    place(MESH['rock' + Math.floor(rnd() * 3)], x, z, s, r(0, TAU), [r(0.8, 1), r(0.8, 1), r(0.8, 1)], 0.3 * s); if (s > 0.7) colAdd(x, z, 0.7 * s);
  }
  // big broken rocks along the cliff, so the escarpment reads as stone
  for (let x = -110; x < 110; x += 2.2) {
    const k = Math.exp(-((x / 75) ** 2)); if (rnd() > k * 1.4) continue;
    for (const [dz, sc] of [[r(1.5, 4.5), r(1.0, 2.6)], [r(-5, -2), r(0.8, 2.0)]]) {
      const z = cliffZ(x) + dz, [ri, rd] = riverNear(x, z); if (rd < RIVER.w[ri] + 1.5) continue;
      place(MESH['rock' + Math.floor(rnd() * 3)], x + r(-0.8, 0.8), z, sc * k + 0.4, r(0, TAU), [r(0.75, 0.95), r(0.75, 0.9), r(0.7, 0.85)], 0.35 * sc);
      if (sc * k > 0.8) colAdd(x, z, 0.8 * sc * k);
    }
  }
  // berry bushes: in sunny clearings near trails
  for (let k = 0; k < 400 && SCENERY.berries.length < 34; k++) {
    const x = r(-150, 150), z = r(-150, 150); const td = trailDist(x, z), [ri, rd] = riverNear(x, z);
    if (td < 3 || td > 18 || rd < RIVER.w[ri] + 3 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 4 || groundN(x, z)[1] < 0.85) continue;
    const y = groundH(x, z) - 0.1, yaw = r(0, TAU);
    m4basis(M, r3Y(yaw), x, y, z, 1, 1, 1); glPush(MESH.berryBush, M);
    const pts = []; for (let q = 0; q < 14; q++) { const a = rnd() * TAU, h = r(0.25, 0.85), rr = 0.55 + 0.25 * Math.sin(h * 3); pts.push([x + Math.cos(a) * rr, y + h, z + Math.sin(a) * rr]); }
    SCENERY.berries.push({ x, z, y, pts, left: 14, regrow: 0 });
  }
  // picnic area on the west shore of the lake + trail signs
  const pic = [[LAKE.x - LAKE.r - 12, LAKE.z - 6], [LAKE.x - LAKE.r - 16, LAKE.z + 6]];
  for (const [x, z] of pic) { const y = groundH(x, z); m4basis(M, r3Y(0.4), x, y, z, 1, 1, 1); glPush(MESH.table, M); colAdd(x, z, 1.0); SCENERY.baskets.push({ x: x + 0.2, z, y: y + 0.77, full: true, refill: 0 }); }
  for (const [x, z, yaw] of [[60, 86, 2.3], [-148, 36, 0.8], [20, -40, 3.6], [-12, -70, 1.2]]) { m4basis(M, r3Y(yaw), x, groundH(x, z), z, 1, 1, 1); glPush(MESH.sign, M); }
  buildWater();
  console.log('[BB] world built in', Math.round(performance.now() - t0), 'ms');
}

function buildWater() {
  const waters = [];
  // river: a ribbon along the samples (skipping the vertical drop at the falls)
  {
    const w = new MB(); const rp = RIVER.pts, n = rp.length; const L = [], Rr = [];
    for (let i = 0; i < n; i++) {
      const a = rp[Math.max(0, i - 1)], c = rp[Math.min(n - 1, i + 1)]; let dx = c[0] - a[0], dz = c[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const half = RIVER.w[i] + 1.4, y = RIVER.s[i] + 0.02;
      const depthAt = (x, z) => Math.max(0, y - groundH(x, z));
      let x = rp[i][0] - dz * half, z = rp[i][1] + dx * half; w.c = [depthAt(x, z), 0, 0]; L.push(w.vert(x, y, z, 0, 1, 0));
      x = rp[i][0] + dz * half; z = rp[i][1] - dx * half; w.c = [depthAt(x, z), 0, 0]; Rr.push(w.vert(x, y, z, 0, 1, 0));
    }
    for (let i = 0; i < n - 1; i++) { if (i === RIVER.falls) continue; w.quad(L[i], L[i + 1], Rr[i + 1], Rr[i]); }
    const river = { mesh: w.build({ name: 'river', cast: false }), deep: hexLin(0x1d3a3a), shallow: hexLin(0x5a7a62), scale: 1.1 };
    RND.queue.delete(river.mesh); waters.push(river);
  }
  // lake: a disc of cells
  {
    const w = new MB(); const R = LAKE.r + 4, st = 2, nx = Math.ceil(2 * R / st), ids = {};
    for (let j = 0; j <= nx; j++) for (let i = 0; i <= nx; i++) { const x = LAKE.x - R + i * st, z = LAKE.z - R + j * st; w.c = [Math.max(0, LAKE.y - groundH(x, z)), 0, 0]; ids[j * (nx + 1) + i] = w.vert(x, LAKE.y, z, 0, 1, 0); }
    for (let j = 0; j < nx; j++) for (let i = 0; i < nx; i++) { const x = LAKE.x - R + (i + 0.5) * st, z = LAKE.z - R + (j + 0.5) * st; if (Math.hypot(x - LAKE.x, z - LAKE.z) > R) continue; const a = j * (nx + 1) + i; w.quad(ids[a], ids[a + nx + 1], ids[a + nx + 2], ids[a + 1]); }
    const lake = { mesh: w.build({ name: 'lake', cast: false }), deep: hexLin(0x14324a), shallow: hexLin(0x3f6e6a), scale: 0.5 };
    RND.queue.delete(lake.mesh); waters.push(lake);
  }
  for (const wt of waters) { gl.bindVertexArray(wt.mesh.vao); for (let i = 5; i <= 9; i++) gl.disableVertexAttribArray(i); gl.vertexAttrib4f(9, 1, 1, 1, 1); }
  gl.bindVertexArray(null);
  SCENERY.waters = waters;
  // the waterfall: a curved sheet of falling water from the lip to the pool, drawn with the falls material
  const f = RIVER.falls, rp = RIVER.pts;
  const a = rp[f], c = rp[f + 1]; let dx = c[0] - a[0], dz = c[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const top = RIVER.s[f], bot = RIVER.s[f + 1], half = RIVER.w[f] * 0.85;
  const w = new MB(); w.col(0xffffff).par(0.3, 0, -5);
  const rows = 10, cols = 8, ids = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
    const t = j / rows, sx = (i / cols * 2 - 1) * half * (1 + t * 0.25);
    const out = 1.5 + 2.4 * t * t;     // the sheet bows out as it falls
    const x = a[0] - dz * sx + dx * out, z = a[1] + dx * sx + dz * out, y = lerp(top + 0.05, bot - 0.3, t);
    ids.push(w.vert(x, y, z, dx, 0.2, dz));
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const p = j * (cols + 1) + i; w.quad(ids[p], ids[p + 1], ids[p + cols + 2], ids[p + cols + 1]); }
  SCENERY.fallsMesh = w.build({ name: 'falls', cast: false }); SCENERY.fallsMesh.isStatic = true; glPush(SCENERY.fallsMesh, m4());
  SCENERY.fallsTop = [a[0] + dx * 0.6, top, a[1] + dz * 0.6];
  SCENERY.fallsBottom = [a[0] + dx * 3.2, bot, a[1] + dz * 3.2];
  SCENERY.fallsDir = [dx, dz]; SCENERY.fallsHalf = half;
}
