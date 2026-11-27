// ===== Routes: level definitions (spline, sections, speeds, light by distance), path sampling, terrain height H(x,z) =====
// Section parameters blend over 60 m at each boundary. Colours are sRGB-like (the shaders linearise them).
const SEC_DEF = { W: 40, wallH: 10, wallW: 120, wallP: 1.4, rough: 3, cliff: 0, river: 0, marsh: 0, mDepth: 0.5, mHum: 0.9, sea: 0, barW: 3.5, lava: 0,
  grass: 0.5, tall: 0, fern: 0, trees: 0.2, rocks: 0.2, cyp: 0, reed: 0, pads: 0, snag: 0, burnt: 0, palm: 0, flowers: 1,
  gndK: 0, gnd: [0.33, 0.42, 0.18], gnd2: [0.5, 0.48, 0.24], veg: [0.33, 0.42, 0.18], roadC: [0.47, 0.37, 0.25], rutC: [0.33, 0.26, 0.18],
  rockA: [0.5, 0.45, 0.39], rockB: [0.36, 0.32, 0.28], mudC: [0.36, 0.3, 0.22], bedC: [0.33, 0.31, 0.25], murk: 0.3 };

const LEVELS = [
  { id: 'valley', name: 'Valley Run', tag: 'A morning drive up the valley to the river.', boss: 'Rumblejaw', seed: 13, yellow: 1, end: 2600,
    cast: ['raptor', 'longneck', 'ptero', 'runner', 'hornback', 'boss'],
    ctrl: [[0, 60], [0, 0], [12, -150], [-28, -300], [-22, -450], [20, -600], [58, -760], [34, -920], [-18, -1060], [-40, -1200], [-12, -1330], [38, -1480],
      [52, -1640], [22, -1800], [-38, -1960], [-58, -2140], [-22, -2320], [32, -2480], [48, -2640], [50, -2800], [50, -2900]],
    elev: [[0, 0], [300, 2.5], [520, 1.5], [800, 2.5], [1000, 4], [1150, 7], [1290, 7.5], [1640, 5], [2000, 1], [2500, -5], [2700, -5.5], [3000, -5.5]],
    sections: [
      { id: 'gate', s0: 0, W: 26, wallH: 9, wallW: 120, wallP: 1.4, rough: 3, grass: 0.55, tall: 0.2, fern: 0.15, trees: 0.35, rocks: 0.3 },
      { id: 'grass', s0: 90, W: 55, wallH: 16, wallW: 160, wallP: 1.5, rough: 4, grass: 1, tall: 1, fern: 0.05, trees: 0.12, rocks: 0.2 },
      { id: 'meadow', s0: 440, W: 70, wallH: 14, wallW: 160, wallP: 1.5, rough: 3, grass: 0.75, tall: 0.3, fern: 0.12, trees: 0.25, rocks: 0.25 },
      { id: 'forest', s0: 625, W: 24, wallH: 12, wallW: 90, wallP: 1.3, rough: 4, grass: 0.3, tall: 0, fern: 1, trees: 1, rocks: 0.4 },
      { id: 'gorge', s0: 1000, W: 9, wallH: 32, wallW: 20, wallP: 1.25, rough: 6, cliff: 1, grass: 0.18, tall: 0, fern: 0.3, trees: 0.12, rocks: 1 },
      { id: 'plain', s0: 1290, W: 110, wallH: 10, wallW: 180, wallP: 1.5, rough: 2.5, grass: 0.85, tall: 0.15, fern: 0.04, trees: 0.07, rocks: 0.15 },
      { id: 'river', s0: 1640, W: 22, wallH: 9, wallW: 70, wallP: 1.3, rough: 3, river: 1, grass: 0.5, tall: 0.1, fern: 0.45, trees: 0.6, rocks: 0.5 },
      { id: 'outpost', s0: 2500, W: 40, wallH: 9, wallW: 110, wallP: 1.4, rough: 2.5, grass: 0.5, tall: 0.1, fern: 0.2, trees: 0.3, rocks: 0.2 },
    ],
    speeds: [[0, 5.5], [80, 7], [110, 13], [430, 13], [470, 9], [500, 4.2], [570, 4.2], [605, 10], [640, 12.5], [990, 12.5], [1010, 12], [1280, 12], [1300, 13], [1420, 13], [1445, 9.5], [1580, 9.5], [1620, 13], [1640, 13.5], [2490, 13.5], [2540, 8], [2600, 0]],
    water: [{ kind: 'river', s0: 1600, s1: 2520 }],
    light: [{ s: 0, az: 0.776, el: 0.669, sun: [3.3, 2.95, 2.35], sky: [0.2, 0.33, 0.6], gnd: [0.1, 0.09, 0.05], fog: [0.42, 0.5, 0.58], fogD: 0.0021, glow: 0.75, night: 0, lamp: 0, rays: 0.6, exp: 1 }],
  },
  { id: 'delta', name: 'Dusk Delta', tag: 'Sunset in the mire, lava fields after dark, then the lagoon by moonlight.', boss: 'Sailback', seed: 29, yellow: 0, end: 2500, ranks: [50000, 32000, 18000, 9000],   // fewer targets than the valley, so the rank bars sit lower
    cast: ['nipper', 'longneck', 'raptor', 'ptero', 'runner', 'clubtail', 'sailback'],
    ctrl: [[0, 60], [0, 0], [-14, -140], [-34, -290], [-22, -440], [14, -590], [40, -740], [30, -900], [0, -1050], [-26, -1200], [-20, -1340], [-6, -1480], [0, -1640], [0, -1800], [-4, -1960], [-10, -2120], [-6, -2280], [0, -2440], [0, -2600], [0, -2700]],
    elev: [[0, 1.3], [100, 0.6], [900, 0.6], [1010, 5.5], [1230, 6], [1330, 0.7], [2900, 0.7]],
    sections: [
      { id: 'dock', s0: 0, W: 30, wallH: 7, wallW: 140, rough: 2.5, grass: 0.55, tall: 0.2, fern: 0.2, trees: 0.3, rocks: 0.2 },
      { id: 'mire', s0: 110, W: 14, wallH: 5, wallW: 220, rough: 1.5, marsh: 1, mDepth: 0.55, mHum: 0.95, grass: 0.55, fern: 0.6, trees: 0.04, rocks: 0.1, cyp: 1, reed: 1, pads: 1, snag: 0.3, flowers: 0.3,
        gndK: 1, gnd: [0.2, 0.27, 0.13], gnd2: [0.3, 0.31, 0.15], veg: [0.27, 0.37, 0.15], roadC: [0.31, 0.26, 0.19], rutC: [0.21, 0.18, 0.14], mudC: [0.2, 0.18, 0.13], bedC: [0.13, 0.14, 0.1], murk: 1 },
      { id: 'flats', s0: 520, W: 150, wallH: 4, wallW: 200, rough: 1, marsh: 1, mDepth: 0.04, mHum: 0.24, grass: 0.14, tall: 0.1, reed: 0.3, snag: 0.12, rocks: 0.1, trees: 0, flowers: 0,
        gndK: 1, gnd: [0.34, 0.31, 0.25], gnd2: [0.42, 0.38, 0.28], veg: [0.42, 0.41, 0.23], roadC: [0.37, 0.32, 0.26], rutC: [0.26, 0.23, 0.19], mudC: [0.3, 0.27, 0.22], bedC: [0.24, 0.22, 0.18], murk: 0.75 },
      { id: 'ember', s0: 920, W: 55, wallH: 22, wallW: 160, wallP: 1.3, rough: 5, lava: 1, grass: 0.1, rocks: 1.3, burnt: 1, trees: 0, flowers: 0,
        gndK: 1, gnd: [0.17, 0.16, 0.16], gnd2: [0.25, 0.22, 0.19], veg: [0.46, 0.39, 0.21], roadC: [0.23, 0.21, 0.2], rutC: [0.15, 0.14, 0.14], rockA: [0.21, 0.2, 0.2], rockB: [0.1, 0.1, 0.11] },
      { id: 'lagoon', s0: 1335, W: 150, wallH: 16, wallW: 220, rough: 3, sea: 1, barW: 3.6, grass: 0.4, reed: 0.12, rocks: 0.25, palm: 0.6, trees: 0.3, flowers: 0,
        gndK: 1, gnd: [0.62, 0.57, 0.44], gnd2: [0.52, 0.5, 0.36], veg: [0.43, 0.48, 0.27], roadC: [0.6, 0.54, 0.42], rutC: [0.48, 0.43, 0.34], mudC: [0.5, 0.46, 0.37], bedC: [0.3, 0.33, 0.3], murk: 0 },
      { id: 'station', s0: 2430, W: 150, wallH: 16, wallW: 220, rough: 3, sea: 1, barW: 20, grass: 0.4, rocks: 0.2, palm: 0.5, trees: 0.3, flowers: 0,
        gndK: 1, gnd: [0.62, 0.57, 0.44], gnd2: [0.52, 0.5, 0.36], veg: [0.43, 0.48, 0.27], roadC: [0.6, 0.54, 0.42], rutC: [0.48, 0.43, 0.34], mudC: [0.5, 0.46, 0.37], bedC: [0.3, 0.33, 0.3], murk: 0 },
    ],
    speeds: [[0, 5], [60, 8], [115, 12.5], [900, 12.5], [935, 11.5], [1240, 11.5], [1330, 13], [2390, 13], [2440, 8], [2500, 0]],
    water: [{ kind: 'flat', s0: 95, s1: 935, y: 0.05 }, { kind: 'flat', s0: 1300, s1: 2760, y: 0 }],
    light: [
      { s: 0, az: -0.35, el: 0.2, sun: [3.3, 2.0, 1.0], sky: [0.27, 0.33, 0.56], gnd: [0.19, 0.14, 0.1], fog: [0.5, 0.38, 0.34], fogD: 0.0028, glow: 1.2, night: 0, lamp: 0, rays: 1.0, exp: 0.95 },
      { s: 450, az: -0.3, el: 0.11, sun: [3.1, 1.45, 0.58], sky: [0.24, 0.25, 0.5], gnd: [0.17, 0.11, 0.09], fog: [0.48, 0.3, 0.27], fogD: 0.003, glow: 1.5, night: 0.1, lamp: 0.25, rays: 1.2, exp: 1.0 },
      { s: 800, az: -0.25, el: 0.045, sun: [2.2, 0.8, 0.3], sky: [0.17, 0.17, 0.4], gnd: [0.11, 0.07, 0.07], fog: [0.36, 0.21, 0.23], fogD: 0.0032, glow: 1.7, night: 0.4, lamp: 0.7, rays: 1.1, exp: 1.15 },
      { s: 990, az: -0.2, el: 0.02, sun: [0, 0, 0], sky: [0.13, 0.14, 0.3], gnd: [0.3, 0.1, 0.035], fog: [0.14, 0.1, 0.15], fogD: 0.0036, glow: 1.2, night: 0.8, lamp: 1, rays: 0, exp: 1.45 },
      { s: 1049, az: -0.2, el: 0.02, sun: [0, 0, 0], sky: [0.12, 0.13, 0.29], gnd: [0.32, 0.1, 0.035], fog: [0.12, 0.09, 0.15], fogD: 0.0036, glow: 1.0, night: 0.9, lamp: 1, rays: 0, exp: 1.5 },
      { s: 1051, az: 1.25, el: 0.42, sun: [0, 0, 0], sky: [0.12, 0.13, 0.29], gnd: [0.32, 0.1, 0.035], fog: [0.12, 0.09, 0.15], fogD: 0.0036, glow: 1.0, night: 0.9, lamp: 1, rays: 0, exp: 1.5 },
      { s: 1240, az: 1.25, el: 0.42, sun: [0.5, 0.64, 0.95], sky: [0.11, 0.13, 0.28], gnd: [0.2, 0.08, 0.05], fog: [0.1, 0.1, 0.17], fogD: 0.003, glow: 0.7, night: 1, lamp: 1, rays: 0.3, exp: 1.5 },
      { s: 1340, az: 1.25, el: 0.42, sun: [0.85, 1.05, 1.5], sky: [0.1, 0.13, 0.28], gnd: [0.05, 0.06, 0.09], fog: [0.062, 0.078, 0.145], fogD: 0.0026, glow: 0.6, night: 1, lamp: 1, rays: 0.45, exp: 1.32 },
    ],
  },
];

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

function buildPath(CTRL, ELEV) {
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
}

// ---- the loaded route ----
let LEVEL = -1, LV = LEVELS[0], SECTIONS = [], SPEEDS = LEVELS[0].speeds, COURSE_END = LEVELS[0].end, PATH = null, SEC_TAB = [];
function blendSection(s) {
  let i = 0; while (i + 1 < SECTIONS.length && s >= SECTIONS[i + 1].s0) i++;
  const A = SECTIONS[i], B = SECTIONS[Math.max(0, i - 1)], N = SECTIONS[i + 1];
  const t = i === 0 ? 1 : smooth(A.s0 - 30, A.s0 + 30, s), t2 = N ? smooth(N.s0 - 30, N.s0 + 30, s) : 0;
  const o = { id: A.id };
  for (const k in SEC_DEF) {
    const a = A[k], b = B[k];
    if (Array.isArray(a)) { const v = [lerp(b[0], a[0], t), lerp(b[1], a[1], t), lerp(b[2], a[2], t)]; if (N) { const n = N[k]; v[0] = lerp(v[0], n[0], t2); v[1] = lerp(v[1], n[1], t2); v[2] = lerp(v[2], n[2], t2); } o[k] = v; }
    else { let v = lerp(b, a, t); if (N) v = lerp(v, N[k], t2); o[k] = v; }
  }
  return o;
}
function loadLevelDef(i) {
  LEVEL = clamp(i | 0, 0, LEVELS.length - 1); LV = LEVELS[LEVEL];
  SECTIONS = LV.sections.map(s => Object.assign({}, SEC_DEF, s)); SPEEDS = LV.speeds; COURSE_END = LV.end;
  PATH = buildPath(LV.ctrl, LV.elev);
  SEC_TAB = new Array(PATH.N + 1);            // per-metre table of blended section parameters (read-only objects)
  for (let s = 0; s <= PATH.N; s++) SEC_TAB[s] = blendSection(s);
}
function secAt(s) { return SEC_TAB[s < 0 ? 0 : s > PATH.N ? PATH.N : s | 0]; }
function flatWater(s) { const W = LV.water; for (let i = 0; i < W.length; i++) { const w = W[i]; if (w.kind === 'flat' && s >= w.s0 - 45 && s <= w.s1 + 45) return w; } return null; }
function waterY(s) { return keySmooth(LV.elev, s) + 0.18; }   // river surface (Valley Run)
// water level at a distance along the route, or null where there is none
function waterLevelS(s) { const w = flatWater(s); if (w && s >= w.s0 && s <= w.s1) return w.y; return secAt(s).river > 0.5 ? waterY(s) : null; }
const LIGHT_VEC = ['sun', 'sky', 'gnd', 'fog'], LIGHT_NUM = ['az', 'el', 'fogD', 'glow', 'night', 'lamp', 'rays', 'exp'];
function lightAt(s, out) {
  const K = LV.light; let i = 0; while (i + 1 < K.length && s >= K[i + 1].s) i++;
  const A = K[i], B = K[Math.min(K.length - 1, i + 1)]; const t = B === A ? 0 : clamp((s - A.s) / (B.s - A.s), 0, 1);
  for (const k of LIGHT_NUM) out[k] = lerp(A[k], B[k], t);
  for (const k of LIGHT_VEC) out[k] = [lerp(A[k][0], B[k][0], t), lerp(A[k][1], B[k][1], t), lerp(A[k][2], B[k][2], t)];
  return out;
}

// lava channels: one analytic function, written again in GLSL in the terrain shader (lavaF in 11-shaders.js), so the glow sits in the dips
function lavaF(x, z) { return Math.sin(x * 0.045 + 2.3 * Math.sin(z * 0.021)) + Math.sin(z * 0.037 + 1.7 * Math.sin(x * 0.018)); }

// terrain height: one function used for the mesh, vegetation, creatures and darts
function terrainH(x, z, out) {
  const q = PATH.nearest(x, z); const p = secAt(q.s); const a = Math.abs(q.d);
  const n = fbm(x * 0.011, z * 0.011, 4) * p.rough + vnoise(x * 0.07, z * 0.07) * 0.35;
  const wall = p.wallH * Math.pow(smooth(p.W, p.W + p.wallW, a), p.wallP);
  const cliff = p.cliff > 0.01 ? (fbm(x * 0.06, z * 0.06 + q.y, 3) * 5 + vnoise(x * 0.25, z * 0.25) * 1.2) * smooth(p.W, p.W + 6, a) * p.cliff : 0;
  const far = q.y + 0.15 + wall + cliff + n * smooth(5, 26, a);
  let h = lerp(q.y + 0.02 * vnoise(x * 0.5, z * 0.5) - 0.01 * Math.min(a, 3), far, smooth(3.8, 10, a));
  let river = 0, wl = null, lava = 0, lavaW = 0;
  if (p.river > 0.01) {
    // shallow ford along the centre line, deeper channel to each side, then banks
    const bed = q.y - 0.15 - 0.55 * smooth(5, 10, a) + 0.55 * smooth(10.5, 13, a);
    const bank = q.y + 0.2 + 2.6 * smooth(12, 19, a) + (wall + n * smooth(14, 30, a)) * smooth(17, 26, a);
    const rv = a < 12 ? bed : lerp(bed, bank, smooth(11, 19, a));
    h = lerp(h, rv, p.river); river = p.river; if (river > 0.5) wl = q.y + 0.18;
  }
  const fw = (p.marsh > 0.01 || p.sea > 0.01) ? flatWater(q.s) : null;
  if (fw) {
    if (p.marsh > 0.01) {
      // raised causeway through standing water: the ground sits near the water line, hummocks rise out of it
      const hum = fbm(x * 0.03 + 40, z * 0.03 - 17, 3);
      const floor = fw.y - p.mDepth + hum * p.mHum + wall * 0.7 + n * 0.12;
      h = lerp(h, lerp(q.y + 0.02 * vnoise(x * 0.5, z * 0.5), floor, smooth(3.4, 8, a)), p.marsh);
    }
    if (p.sea > 0.01) {
      // sand bar across a lagoon: beach, deep water, far shore
      const deep = 6.5 * smooth(p.barW + 2.5, p.barW + 15.5, a) * (1 - smooth(p.W - 50, p.W, a));
      const m = fw.y + (q.y - fw.y) * (1 - smooth(p.barW, p.barW + 5.5, a)) - deep + wall + 0.5 * smooth(p.W - 10, p.W + 10, a) + n * smooth(p.W, p.W + 40, a) + 0.05 * vnoise(x * 0.3, z * 0.3);
      h = lerp(h, m, p.sea);
    }
    wl = fw.y;
  }
  if (p.lava > 0.01 && a > 9) {
    const f = Math.abs(lavaF(x, z)); lavaW = p.lava * smooth(10, 17, a);
    lava = (1 - smooth(0.05, 0.12, f)) * lavaW; h -= 0.6 * (1 - smooth(0.05, 0.32, f)) * lavaW;
  }
  if (out) { out.s = q.s; out.d = q.d; out.py = q.y; out.river = river; out.wall = wall; out.cliff = p.cliff * smooth(p.W, p.W + 8, a); out.wl = wl; out.lava = lava; out.lavaW = lavaW; }
  return h;
}
