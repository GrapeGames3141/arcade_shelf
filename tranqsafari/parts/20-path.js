// ===== Course: spline path, sections, speed profile, terrain height H(x,z) =====
const CTRL = [[0, 60], [0, 0], [12, -150], [-28, -300], [-22, -450], [20, -600], [58, -760], [34, -920], [-18, -1060], [-40, -1200], [-12, -1330], [38, -1480],
  [52, -1640], [22, -1800], [-38, -1960], [-58, -2140], [-22, -2320], [32, -2480], [48, -2640], [50, -2800], [50, -2900]];
const ELEV = [[0, 0], [300, 2.5], [520, 1.5], [800, 2.5], [1000, 4], [1150, 7], [1290, 7.5], [1640, 5], [2000, 1], [2500, -5], [2700, -5.5], [3000, -5.5]];
// sections: s0 start of section; params blend over 40 m after s0
const SECTIONS = [
  { id: 'gate', s0: 0, W: 26, wallH: 9, wallW: 120, wallP: 1.4, rough: 3, river: 0, grass: 0.55, tall: 0.2, fern: 0.15, trees: 0.35, rocks: 0.3 },
  { id: 'grass', s0: 90, W: 55, wallH: 16, wallW: 160, wallP: 1.5, rough: 4, river: 0, grass: 1, tall: 1, fern: 0.05, trees: 0.12, rocks: 0.2 },
  { id: 'meadow', s0: 440, W: 70, wallH: 14, wallW: 160, wallP: 1.5, rough: 3, river: 0, grass: 0.75, tall: 0.3, fern: 0.12, trees: 0.25, rocks: 0.25 },
  { id: 'forest', s0: 625, W: 24, wallH: 12, wallW: 90, wallP: 1.3, rough: 4, river: 0, grass: 0.3, tall: 0, fern: 1, trees: 1, rocks: 0.4 },
  { id: 'gorge', s0: 1000, W: 9, wallH: 32, wallW: 20, wallP: 1.25, rough: 6, river: 0, grass: 0.18, tall: 0, fern: 0.3, trees: 0.12, rocks: 1 },
  { id: 'plain', s0: 1290, W: 110, wallH: 10, wallW: 180, wallP: 1.5, rough: 2.5, river: 0, grass: 0.85, tall: 0.15, fern: 0.04, trees: 0.07, rocks: 0.15 },
  { id: 'river', s0: 1640, W: 22, wallH: 9, wallW: 70, wallP: 1.3, rough: 3, river: 1, grass: 0.5, tall: 0.1, fern: 0.45, trees: 0.6, rocks: 0.5 },
  { id: 'outpost', s0: 2500, W: 40, wallH: 9, wallW: 110, wallP: 1.4, rough: 2.5, river: 0, grass: 0.5, tall: 0.1, fern: 0.2, trees: 0.3, rocks: 0.2 },
];
const SEC_KEYS = ['W', 'wallH', 'wallW', 'wallP', 'rough', 'river', 'grass', 'tall', 'fern', 'trees', 'rocks'];
const COURSE_END = 2600;
// target speed keyframes (s, m/s)
const SPEEDS = [[0, 5.5], [80, 7], [110, 13], [430, 13], [470, 9], [500, 4.2], [570, 4.2], [605, 10], [640, 12.5], [990, 12.5], [1010, 12], [1280, 12], [1300, 13], [1420, 13], [1445, 9.5], [1580, 9.5], [1620, 13], [1640, 13.5], [2490, 13.5], [2540, 8], [2600, 0]];

function keyLerp(K, s) {
  if (s <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) if (s <= K[i][0]) { const t = (s - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); return lerp(K[i - 1][1], K[i][1], t); }
  return K[K.length - 1][1];
}
function keySmooth(K, s) {
  if (s <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) if (s <= K[i][0]) { let t = (s - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); t = t * t * (3 - 2 * t); return lerp(K[i - 1][1], K[i][1], t); }
  return K[K.length - 1][1];
}
function secIndex(s) { let i = 0; while (i + 1 < SECTIONS.length && s >= SECTIONS[i + 1].s0) i++; return i; }
const _sec = {};
function secAt(s) {
  const i = secIndex(s), A = SECTIONS[i], B = SECTIONS[Math.max(0, i - 1)];
  const t = i === 0 ? 1 : smooth(A.s0 - 30, A.s0 + 30, s);
  // blend from previous section across the boundary; also look ahead to next boundary
  const N = SECTIONS[i + 1];
  const t2 = N ? smooth(N.s0 - 30, N.s0 + 30, s) : 0;
  for (const k of SEC_KEYS) { let v = lerp(B[k], A[k], t); if (N) v = lerp(v, N[k], t2); _sec[k] = v; }
  _sec.id = A.id; return _sec;
}

const PATH = (() => {
  // Catmull-Rom through CTRL, dense sampling, then resample at 1 m
  const dense = [];
  for (let i = 1; i < CTRL.length - 2; i++) {
    const p0 = CTRL[i - 1], p1 = CTRL[i], p2 = CTRL[i + 1], p3 = CTRL[i + 2];
    for (let k = 0; k < 60; k++) {
      const t = k / 60, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = cum[cum.length - 1], N = Math.floor(total);
  const X = new Float32Array(N + 1), Z = new Float32Array(N + 1), Y = new Float32Array(N + 1), TX = new Float32Array(N + 1), TZ = new Float32Array(N + 1);
  let j = 0;
  for (let s = 0; s <= N; s++) {
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const t = (s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
    X[s] = lerp(dense[j][0], dense[j + 1][0], t); Z[s] = lerp(dense[j][1], dense[j + 1][1], t); Y[s] = keySmooth(ELEV, s);
  }
  for (let s = 0; s <= N; s++) { const a = Math.max(0, s - 2), b = Math.min(N, s + 2); const dx = X[b] - X[a], dz = Z[b] - Z[a], l = Math.hypot(dx, dz) || 1; TX[s] = dx / l; TZ[s] = dz / l; }
  // acceleration grid for nearest-point queries
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (let s = 0; s <= N; s++) { minX = Math.min(minX, X[s]); maxX = Math.max(maxX, X[s]); minZ = Math.min(minZ, Z[s]); maxZ = Math.max(maxZ, Z[s]); }
  const PAD = 520, CELL = 32;
  const gx0 = minX - PAD, gz0 = minZ - PAD, GW = Math.ceil((maxX - minX + 2 * PAD) / CELL), GH = Math.ceil((maxZ - minZ + 2 * PAD) / CELL);
  const COARSE = 4; const cs = []; for (let s = 0; s <= N; s += COARSE) cs.push(s);
  const cells = new Array(GW * GH);
  const diag = CELL * Math.SQRT2;
  for (let gz = 0; gz < GH; gz++) for (let gx = 0; gx < GW; gx++) {
    const cx = gx0 + (gx + 0.5) * CELL, cz = gz0 + (gz + 0.5) * CELL;
    let dmin = 1e9; const ds = new Float32Array(cs.length);
    for (let k = 0; k < cs.length; k++) { const s = cs[k]; const d = Math.hypot(X[s] - cx, Z[s] - cz); ds[k] = d; if (d < dmin) dmin = d; }
    const lim = dmin + diag + COARSE; const list = [];
    for (let k = 0; k < cs.length; k++) if (ds[k] <= lim) list.push(cs[k]);
    cells[gz * GW + gx] = Int32Array.from(list);
  }
  const res = { s: 0, d: 0, y: 0, x: 0, z: 0, tx: 0, tz: 1 };
  function nearest(x, z) {
    let gx = Math.floor((x - gx0) / CELL), gz = Math.floor((z - gz0) / CELL);
    gx = clamp(gx, 0, GW - 1); gz = clamp(gz, 0, GH - 1);
    const list = cells[gz * GW + gx];
    let best = 0, bd = 1e18;
    for (let k = 0; k < list.length; k++) { const s = list[k]; const dx = X[s] - x, dz = Z[s] - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = s; } }
    let s0 = Math.max(0, best - COARSE), s1 = Math.min(N, best + COARSE);
    for (let s = s0; s <= s1; s++) { const dx = X[s] - x, dz = Z[s] - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = s; } }
    // project onto segment for continuous s
    const s = best, tx = TX[s], tz = TZ[s];
    const along = clamp((x - X[s]) * tx + (z - Z[s]) * tz, -1, 1);
    const sf = clamp(s + along, 0, N);
    const px = X[s] + tx * along, pz = Z[s] + tz * along;
    res.s = sf; res.d = (x - px) * (-tz) + (z - pz) * tx; res.y = Y[s] + (Y[Math.min(N, s + 1)] - Y[s]) * along; res.x = px; res.z = pz; res.tx = tx; res.tz = tz;
    return res;
  }
  function at(s) {
    s = clamp(s, 0, N - 1e-3); const i = Math.floor(s), f = s - i, k = Math.min(N, i + 1);
    const tx = lerp(TX[i], TX[k], f), tz = lerp(TZ[i], TZ[k], f), l = Math.hypot(tx, tz) || 1;
    return { p: [lerp(X[i], X[k], f), lerp(Y[i], Y[k], f), lerp(Z[i], Z[k], f)], t: [tx / l, 0, tz / l], r: [-tz / l, 0, tx / l] };
  }
  // world point from path coordinates (s along, d lateral right, h above path height)
  function world(s, d, h = 0) { const a = at(s); return [a.p[0] + a.r[0] * d, a.p[1] + h, a.p[2] + a.r[2] * d]; }
  return { N, X, Y, Z, TX, TZ, nearest, at, world, bounds: [minX, maxX, minZ, maxZ] };
})();

// terrain height: one function used for the mesh, vegetation, creatures and darts
function terrainH(x, z, out) {
  const q = PATH.nearest(x, z); const p = secAt(q.s); const a = Math.abs(q.d);
  const n = fbm(x * 0.011, z * 0.011, 4) * p.rough + vnoise(x * 0.07, z * 0.07) * 0.35;
  const wall = p.wallH * Math.pow(smooth(p.W, p.W + p.wallW, a), p.wallP);
  const cliff = p.wallH > 20 ? (fbm(x * 0.06, z * 0.06 + q.y, 3) * 5 + vnoise(x * 0.25, z * 0.25) * 1.2) * smooth(p.W, p.W + 6, a) : 0;
  const far = q.y + 0.15 + wall + cliff + n * smooth(5, 26, a);
  let h = lerp(q.y + 0.02 * vnoise(x * 0.5, z * 0.5) - 0.01 * Math.min(a, 3), far, smooth(3.8, 10, a));
  let river = 0;
  if (p.river > 0.01) {
    // shallow ford along the centre line, deeper channel to each side, then banks
    const bed = q.y - 0.15 - 0.55 * smooth(5, 10, a) + 0.55 * smooth(10.5, 13, a);
    const bank = q.y + 0.2 + 2.6 * smooth(12, 19, a) + (wall + n * smooth(14, 30, a)) * smooth(17, 26, a);
    const rv = a < 12 ? bed : lerp(bed, bank, smooth(11, 19, a));
    h = lerp(h, rv, p.river); river = p.river;
  }
  if (out) { out.s = q.s; out.d = q.d; out.py = q.y; out.river = river; out.wall = wall; out.cliff = p.wallH > 20 ? smooth(p.W, p.W + 8, a) : 0; }
  return h;
}
function waterY(s) { return keySmooth(ELEV, s) + 0.18; }
