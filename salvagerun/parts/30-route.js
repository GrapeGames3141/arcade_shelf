// ---------- routes: spline, rail frames, zones, environment (per level), and level 1 scenery ----------
// The current level (LV, defined in 32-levels.js) sets ROUTE_PTS, ZONES, S_STOP and S_BOSS before its route and scenery are built.
let ROUTE_PTS = [[0, 0, -300], [0, 0, 0], [30, 10, 550], [150, 30, 1080], [330, 0, 1560], [410, -40, 2080], [340, -60, 2600], [170, -20, 3080], [20, 30, 3580], [-70, 60, 4100],
  [-20, 30, 4620], [130, 0, 5120], [280, -10, 5620], [330, 30, 6140], [250, 60, 6640], [150, 62, 7080], [95, 58, 7420], [60, 55, 7800], [40, 52, 8200], [30, 50, 8600]];
// zone: id, name, s0, s1, env (key into ENV), v (cruise speed m/s)
let ZONES = [
  { id: 'graveyard', name: 'SHIP GRAVEYARD', s0: 0, s1: 2300, env: 'graveyard', v: 44 },
  { id: 'belt', name: 'ASTEROID BELT', s0: 2300, s1: 4600, env: 'belt', v: 47 },
  { id: 'ice', name: 'ICE RING', s0: 4600, s1: 6700, env: 'ice', v: 45 },
  { id: 'wreck', name: 'THE CORVINA SUNRISE', s0: 6700, s1: 7300, env: 'wreck', v: 45 }
];
let S_STOP = 7300, S_BOSS = 7440;
const ENV = {
  graveyard: { sun: [2.35, 2.1, 1.8], ambA: [0.16, 0.09, 0.11], ambB: [0.05, 0.04, 0.06], haze: [0.07, 0.035, 0.035], hazeDen: 0.00034, mote: [0.5, 0.35, 0.25], expo: 0.86, neb: 1.0, star: 1.0, planetR: 0.14 },
  belt: { sun: [2.45, 2.25, 1.95], ambA: [0.12, 0.11, 0.1], ambB: [0.04, 0.05, 0.07], haze: [0.07, 0.055, 0.04], hazeDen: 0.00042, mote: [0.55, 0.45, 0.32], expo: 0.86, neb: 0.95, star: 0.9, planetR: 0.2 },
  ice: { sun: [2.6, 2.55, 2.5], ambA: [0.1, 0.15, 0.22], ambB: [0.03, 0.05, 0.09], haze: [0.06, 0.09, 0.14], hazeDen: 0.0005, mote: [0.55, 0.75, 1.0], expo: 0.8, neb: 0.9, star: 0.8, planetR: 0.27 },
  wreck: { sun: [1.7, 1.5, 1.45], ambA: [0.13, 0.06, 0.13], ambB: [0.02, 0.06, 0.05], haze: [0.04, 0.03, 0.05], hazeDen: 0.00045, mote: [0.35, 0.8, 0.6], expo: 0.95, neb: 0.75, star: 1.1, planetR: 0.3 },
  // level 2: Kessler Breaker Yard
  yard: { sun: [2.5, 2.4, 2.3], ambA: [0.1, 0.12, 0.16], ambB: [0.06, 0.04, 0.03], haze: [0.05, 0.05, 0.06], hazeDen: 0.0004, mote: [0.8, 0.6, 0.35], expo: 0.85, neb: 0.7, star: 1.0, planetR: 0.11 },
  spine: { sun: [2.3, 2.25, 2.2], ambA: [0.09, 0.11, 0.15], ambB: [0.07, 0.05, 0.03], haze: [0.04, 0.045, 0.06], hazeDen: 0.00045, mote: [0.7, 0.75, 0.9], expo: 0.88, neb: 0.65, star: 1.0, planetR: 0.12 },
  foundry: { sun: [2.0, 1.8, 1.6], ambA: [0.14, 0.08, 0.05], ambB: [0.05, 0.04, 0.05], haze: [0.07, 0.04, 0.025], hazeDen: 0.0005, mote: [1.0, 0.6, 0.3], expo: 0.9, neb: 0.6, star: 0.9, planetR: 0.13 },
  // level 3: The Comet Tail
  coma: { sun: [3.0, 2.95, 2.85], ambA: [0.14, 0.2, 0.28], ambB: [0.05, 0.07, 0.11], haze: [0.1, 0.14, 0.2], hazeDen: 0.0006, mote: [0.8, 0.95, 1.2], expo: 0.72, neb: 0.55, star: 0.5, planetR: 0.05 },
  surface: { sun: [3.1, 3.0, 2.9], ambA: [0.12, 0.16, 0.22], ambB: [0.07, 0.07, 0.08], haze: [0.09, 0.12, 0.17], hazeDen: 0.00055, mote: [0.9, 0.95, 1.1], expo: 0.72, neb: 0.5, star: 0.45, planetR: 0.05 },
  burrow: { sun: [2.8, 2.7, 2.6], ambA: [0.1, 0.13, 0.2], ambB: [0.06, 0.06, 0.07], haze: [0.08, 0.1, 0.15], hazeDen: 0.0005, mote: [0.8, 0.9, 1.1], expo: 0.75, neb: 0.5, star: 0.5, planetR: 0.05 },
  // level 4: The Nest
  hive: { sun: [1.6, 1.45, 1.5], ambA: [0.09, 0.14, 0.1], ambB: [0.06, 0.02, 0.07], haze: [0.03, 0.06, 0.05], hazeDen: 0.0005, mote: [0.5, 1.0, 0.7], expo: 1.0, neb: 0.7, star: 1.1, planetR: 0.18 },
  throat: { sun: [0.5, 0.45, 0.5], ambA: [0.16, 0.12, 0.17], ambB: [0.05, 0.13, 0.09], haze: [0.06, 0.03, 0.06], hazeDen: 0.0011, mote: [0.6, 1.0, 0.8], expo: 1.25, neb: 0.4, star: 0.6, planetR: 0.18 },
  cavern: { sun: [0.6, 0.5, 0.55], ambA: [0.15, 0.075, 0.135], ambB: [0.04, 0.11, 0.08], haze: [0.045, 0.02, 0.04], hazeDen: 0.0008, mote: [0.7, 1.0, 0.8], expo: 1.0, neb: 0.4, star: 0.6, planetR: 0.18 }
};
const ROUTE = { ds: 2 };
function buildRoute(P) {
  P = P || ROUTE_PTS; const dense = [];
  const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return [0, 1, 2].map(k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)); };
  for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p3 = P[Math.min(P.length - 1, i + 2)]; for (let k = 0; k < 120; k++) dense.push(cr(p0, P[i], P[i + 1], p3, k / 120)); }
  dense.push(P[P.length - 1]);
  // arc length from the second control point (s = 0 there)
  let L = [0]; for (let i = 1; i < dense.length; i++) L.push(L[i - 1] + vdist(dense[i], dense[i - 1]));
  let s0 = 0, best = 1e9; for (let i = 0; i < dense.length; i++) { const d = vdist(dense[i], P[1]); if (d < best) { best = d; s0 = L[i]; } }
  const total = L[L.length - 1] - s0, ds = ROUTE.ds, n = Math.floor((total + s0) / ds) + 1;
  ROUTE.n = n; ROUTE.sMin = -s0; ROUTE.len = total;
  const pos = new Float64Array(n * 3); let j = 0;
  for (let i = 0; i < n; i++) {
    const want = i * ds; while (j < L.length - 2 && L[j + 1] < want) j++;
    const t = clamp((want - L[j]) / Math.max(1e-6, L[j + 1] - L[j]), 0, 1), p = vlerp(dense[j], dense[j + 1], t);
    pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
  }
  const gp = i => { i = clamp(i, 0, n - 1); return [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]; };
  const T = [], U = [], R = [], bank = [];
  let up = [0, 1, 0];
  for (let i = 0; i < n; i++) {
    const t = vnorm(vsub(gp(i + 3), gp(i - 3))); up = vnorm(vsub(up, vscl(t, vdot(up, t))));
    up = vnorm(vlerp(up, vnorm(vsub([0, 1, 0], vscl(t, t[1]))), 0.02));
    T.push(t); U.push(up); R.push(vnorm(vcross(t, up)));
  }
  for (let i = 0; i < n; i++) { const k = vscl(vsub(T[clamp(i + 10, 0, n - 1)], T[clamp(i - 10, 0, n - 1)]), 1 / (20 * ds)); bank.push(clamp(vdot(k, R[i]) * 900, -0.32, 0.32)); }
  const bs = []; for (let i = 0; i < n; i++) { let a = 0, c = 0; for (let k = -30; k <= 30; k++) { const q = clamp(i + k, 0, n - 1); a += bank[q]; c++; } bs.push(a / c); }
  ROUTE.pos = pos; ROUTE.T = T; ROUTE.U = U; ROUTE.R = R; ROUTE.bank = bs; ROUTE.gp = gp;
}
// frame at arc length s (s may be negative before the start)
function railFrame(s, out) {
  const f = (s - ROUTE.sMin) / ROUTE.ds, i = clamp(Math.floor(f), 0, ROUTE.n - 2), t = clamp(f - i, 0, 1);
  const P = ROUTE.pos, a = i * 3, b = a + 3;
  out = out || {};
  out.p = [P[a] + (P[b] - P[a]) * t, P[a + 1] + (P[b + 1] - P[a + 1]) * t, P[a + 2] + (P[b + 2] - P[a + 2]) * t];
  out.T = vnorm(vlerp(ROUTE.T[i], ROUTE.T[i + 1], t)); out.U = vnorm(vlerp(ROUTE.U[i], ROUTE.U[i + 1], t)); out.R = vnorm(vcross(out.T, out.U));
  out.bank = lerp(ROUTE.bank[i], ROUTE.bank[i + 1], t);
  return out;
}
const _rf = {};
function railToWorld(x, y, z) { const f = railFrame(z, _rf); return [f.p[0] + f.R[0] * x + f.U[0] * y, f.p[1] + f.R[1] * x + f.U[1] * y, f.p[2] + f.R[2] * x + f.U[2] * y]; }
// cruise speed per zone, eased over the first 200 m of each zone, then slowing to a stop before the boss
function railSpeed(s) {
  const Z = ZONES; if (s < 140) return lerp(16, Z[0].v, sstep(0, 140, s));
  const i = zoneAt(s); let v = Z[i].v; if (i > 0) v = lerp(Z[i - 1].v, v, sstep(Z[i].s0, Z[i].s0 + 200, s));
  return Math.max(6, v * (1 - sstep(S_STOP - 350, S_STOP, s)));
}
function zoneAt(s) { for (let i = ZONES.length - 1; i >= 0; i--) if (s >= ZONES[i].s0) return i; return 0; }
// blended environment at route position s
function envAt(s) {
  const keys = ZONES.map(z => z.env), n = keys.length, W = 160;
  let w = keys.map((_, i) => i ? 0 : 1);
  for (let k = 0; k < n - 1; k++) { const b = ZONES[k + 1].s0, t = sstep(b - W, b + W, s); for (let j = 0; j <= k; j++) w[j] *= (1 - t); w[k + 1] = t; }
  const out = {}; const e0 = ENV.graveyard;
  for (const key in e0) { const v = e0[key]; if (Array.isArray(v)) out[key] = [0, 0, 0]; else out[key] = 0; }
  keys.forEach((k, i) => { if (w[i] <= 0) return; const e = ENV[k]; for (const key in e) { if (Array.isArray(e[key])) out[key] = vmad(out[key], e[key], w[i]); else out[key] += e[key] * w[i]; } });
  return out;
}

// ---- scenery ----
const PAINTS = [[0.55, 0.16, 0.12], [0.18, 0.24, 0.36], [0.4, 0.42, 0.28], [0.78, 0.74, 0.64], [0.45, 0.47, 0.5], [0.62, 0.42, 0.16], [0.22, 0.32, 0.3]];
function frameQ(T, U) { return qbasis(vnorm(vcross(U, T)), U, T); }
// a derelict ship from parts; center c, orientation q, radius r
function derelict(key, c, q, r, opt = {}) {
  const paint = opt.paint || pick(PAINTS), segs = opt.segs || ri(2, 4), L = r * 1.9, X = v => vadd(c, qrot(q, v));
  const breakAt = opt.noBreak ? -1 : ri(1, segs - 1), bendQ = qmul(q, qaxis(randDir(rnd), rr(0.1, 0.35)));
  let z = -(segs * L) / 2 + L / 2;
  for (let i = 0; i < segs; i++) {
    const brk = i >= breakAt && breakAt > 0, qq = brk ? bendQ : q, gap = brk ? r * 0.9 : 0;
    const pos = vadd(c, qrot(qq, [0, 0, z + gap])); sinst('hullseg', pos, qq, [r, r, L / 2 * 0.98], paint, 7, key, opt.lit ?? 0.6, rnd() * 9, 0.75);
    if (i === breakAt - 1 && breakAt > 0) for (let k = 0; k < 4; k++) sinst('rib', vadd(c, qrot(q, [0, 0, z + L / 2 + k * r * 0.3])), qmul(q, qmul(QX90, qaxis([0, 1, 0], rnd() * TAU))), r * 0.97, [0.4, 0.4, 0.42], 3, key);
    if (rnd() < 0.5) sinst('tower', vadd(c, qrot(qq, [rr(-0.3, 0.3) * r, r * 0.95, z + gap])), qq, r * rr(0.35, 0.55), paint, 7, key, 0.8, rnd() * 9, 0.7);
    z += L;
  }
  sinst('bow', X([0, 0, -(segs * L) / 2 - 0.0]), qmul(q, qaxis([0, 1, 0], Math.PI)), [r, r, r * 1.1], paint, 2, key, 1, rnd() * 9, 0.8);
  const back = vadd(c, qrot(breakAt > 0 ? bendQ : q, [0, 0, (segs * L) / 2 + (breakAt > 0 ? r * 0.9 : 0)]));
  const qb = breakAt > 0 ? bendQ : q;
  for (const [x, y] of [[-0.45, 0], [0.45, 0], [0, 0.5]]) sinst('bell', vadd(back, qrot(qb, [x * r, y * r, r * 0.25])), qb, r * 0.42, [1, 1, 1], 3, key);
  sinst('bell', vadd(back, qrot(qb, [0, -0.5 * r, r * 0.2])), qb, r * 0.3, [1, 1, 1], 3, key);
  for (let k = 0; k < 2; k++) sinst('mast', X([rr(-0.4, 0.4) * r, r * 1.1, rr(-1, 1) * L]), qmul(q, qaxis([1, 0, 0], Math.PI / 2 + rr(-0.3, 0.3))), r * 0.5, [1, 1, 1], 3, key);
  for (let k = 0; k < 3; k++) sinst('pod', X([rr(-1.5, 1.5) * r, rr(-1.2, 1.4) * r, rr(-1, 1) * L * segs * 0.5]), qrand(), 1, [0.5, 0.42, 0.3], 2, key, 1, 0, -1);
  for (let k = 0; k < 3; k++) sinst('beacon', X([rr(-1, 1) * r, r * rr(0.9, 1.05), rr(-1, 1) * L]), qid(), 0.25 * r / 10 + 0.3, [1, 0.12, 0.08], 4, key, 3, rnd() * 5, -1);
  return { back, front: X([0, 0, -(segs * L) / 2]) };
}
function sceneryL1() {
  srand(4242);
  const F = QL.field, fr = {};
  // ---------- ship graveyard ----------
  for (let i = 0; i < 13; i++) {
    const s = 120 + i * 175 + rr(-40, 40); railFrame(s, fr);
    const side = i % 2 ? 1 : -1, lat = rr(70, 300) * side, ht = rr(-70, 70);
    const c = vadd(vadd(fr.p, vscl(fr.R, lat)), vscl(fr.U, ht));
    const q = qmul(frameQ(fr.T, fr.U), qaxis(randDir(rnd), rr(0.3, 1.4)));
    const r = rr(9, 20), d = derelict(s, c, q, r);
    if (rnd() < 0.7) gasSheet(s, d.back, vscl(randDir(rnd), r * 3), vscl(randDir(rnd), r * 2), 14, [[1.0, 0.45, 0.15], [0.7, 0.25, 0.12]], 1.2);
    gasCloud(s, c, r * 4, 10, [[0.45, 0.22, 0.18], [0.3, 0.18, 0.25]], 0.8);
    for (let k = 0; k < 5; k++) sinst('container', vadd(c, vscl(randDir(rnd), r * rr(2, 4))), qrand(), rr(0.8, 1.2), pick(PAINTS), 2, s, 1, rnd() * 9, 0.8);
  }
  // fly-through wreck: a giant broken hull around the rail
  { const s = 1480; railFrame(s, fr); const q = frameQ(fr.T, fr.U);
    for (let k = 0; k < 9; k++) { const z = (k - 4) * 9; sinst('rib', vadd(fr.p, vscl(fr.T, z)), qmul(q, qmul(QX90, qaxis([0, 1, 0], 0.4 + k * 0.5 + rr(-0.3, 0.3)))), 30, [0.42, 0.42, 0.45], 3, s); }
    for (let k = 0; k < 6; k++) { const a = rr(0, TAU), z = rr(-40, 40); const p = vadd(vadd(fr.p, vscl(fr.T, z)), vadd(vscl(fr.R, Math.cos(a) * 31), vscl(fr.U, Math.sin(a) * 31))); sinst('plate' + (k % 2), p, qmul(q, qaxis(vnorm([Math.cos(a), Math.sin(a), 0]), 0.2)), [3, 2, 4], [0.55, 0.16, 0.12], 7, s, 0.6, rnd() * 9, 0.8); }
    sinst('hullseg', vadd(fr.p, vscl(fr.T, -75)), q, [31, 31, 30], [0.55, 0.16, 0.12], 7, s, 0.7, 3, 0.8);
    sinst('hullseg', vadd(fr.p, vscl(fr.T, 78)), qmul(q, qaxis([1, 0, 0], 0.18)), [31, 31, 30], [0.55, 0.16, 0.12], 7, s + 80, 0.7, 5, 0.8);
    gasCloud(s, vadd(fr.p, vscl(fr.U, 15)), 45, 18, [[0.9, 0.4, 0.15], [0.5, 0.2, 0.15]], 0.7);
  }
  for (let i = 0; i < 160 * F; i++) { // loose junk far off the lane
    const s = rr(0, 2500); railFrame(s, fr); const a = rr(0, TAU), d = rr(45, 500);
    const p = vadd(fr.p, vadd(vscl(fr.R, Math.cos(a) * d), vscl(fr.U, Math.sin(a) * d * 0.6)));
    sinst(pick(['plate0', 'plate1', 'girder', 'container', 'mshard']), p, qrand(), rr(1, 2.5), pick(PAINTS), 2, s, 1, rnd() * 9, 0.8);
  }
  // ---------- asteroid belt ----------
  srand(5151);
  const rockCol = () => vlerp([0.42, 0.38, 0.34], [0.55, 0.48, 0.4], rnd());
  for (let i = 0; i < 1700 * F; i++) {
    const s = 2330 + rnd() * 2470; railFrame(s, fr); const a = rr(0, TAU), d = 55 + Math.pow(rnd(), 1.6) * 1400; const keep = rnd() < sstep(2250, 2950, s);
    const p = vadd(fr.p, vadd(vscl(fr.R, Math.cos(a) * d), vscl(fr.U, Math.sin(a) * d * 0.55)));
    const size = clamp(2 + Math.pow(rnd(), 2.5) * 50 * (0.3 + d / 900), 2, 70);
    if (keep) sinst(d < 260 && size > 6 ? 'rock' + ri(0, 4) : 'rockLo' + ri(0, 2), p, qrand(), size, rockCol(), 0, s, 1, rnd() * 9, rnd() < 0.08 ? 1 : 0);
  }
  for (const [s, lat, ht, r] of [[2700, -650, 150, 190], [3350, 800, -120, 260], [4200, -520, -200, 150], [3100, 420, 300, 110]]) { railFrame(s, fr); sinst('rock' + ri(0, 4), vadd(fr.p, vadd(vscl(fr.R, lat), vscl(fr.U, ht))), qrand(), r, rockCol(), 0, s, 1, rnd() * 9); }
  { const s = 3700; railFrame(s, fr); for (const side of [-1, 1]) sinst('rock' + (side > 0 ? 1 : 3), vadd(fr.p, vadd(vscl(fr.R, side * 78), vscl(fr.U, side * 6))), qrand(), 58, rockCol(), 0, s, 1, rnd() * 9); }
  for (let i = 0; i < 70; i++) { const s = rr(2300, 4600); railFrame(s, fr); const a = rr(0, TAU), d = rr(80, 500); gasCloud(s, vadd(fr.p, vadd(vscl(fr.R, Math.cos(a) * d), vscl(fr.U, Math.sin(a) * d * 0.5))), rr(40, 110), 8, [[0.45, 0.36, 0.26], [0.32, 0.25, 0.2]], 0.9); }
  // ---------- ice ring ----------
  srand(6161);
  const ringTilt = 0.16;
  for (let i = 0; i < 3600 * F; i++) {
    const s = rr(4560, 6900); railFrame(s, fr); const lat = (rnd() < 0.5 ? -1 : 1) * (22 + Math.pow(rnd(), 2.0) * 1500), ht = lat * ringTilt + rr(-1, 1) * (8 + Math.abs(lat) * 0.03);
    const p = vadd(fr.p, vadd(vscl(fr.R, lat), vscl(fr.U, ht)));
    const size = clamp(0.6 + Math.pow(rnd(), 3) * 14 * (0.4 + Math.abs(lat) / 700), 0.6, 30);
    sinst(size > 6 && Math.abs(lat) < 300 ? 'ice' + ri(0, 3) : 'ringice', p, qrand(), size, vlerp([0.75, 0.86, 0.95], [0.9, 0.95, 1], rnd()), 1, s, 1, rnd() * 9);
  }
  for (let i = 0; i < 22; i++) { const s = rr(4700, 6600); railFrame(s, fr); const side = rnd() < 0.5 ? -1 : 1, lat = side * rr(90, 600); sinst('ice' + ri(0, 3), vadd(fr.p, vadd(vscl(fr.R, lat), vscl(fr.U, lat * ringTilt + rr(-30, 30)))), qrand(), rr(14, 60), [0.8, 0.9, 1], 1, s, 1, rnd() * 9); }
  for (let i = 0; i < 80; i++) { const s = rr(4600, 6800); railFrame(s, fr); const lat = rr(-700, 700); const c = vadd(fr.p, vadd(vscl(fr.R, lat), vscl(fr.U, lat * ringTilt))); gasSheet(s, c, vscl(fr.R, rr(60, 140)), vscl(vnorm(vadd(fr.T, vscl(fr.U, 0.05))), rr(60, 140)), 7, [[0.4, 0.6, 0.85], [0.6, 0.75, 0.95]], 0.8); }
  for (let i = 0; i < 40; i++) { const s = rr(4600, 6800); railFrame(s, fr); gasGlitter(s, vadd(fr.p, vadd(vscl(fr.R, rr(-60, 60)), vscl(fr.U, rr(-15, 15)))), 45, 40, [2.5, 3.2, 4]); }
  // ---------- approach and the Corvina Sunrise ----------
  srand(7171);
  for (let i = 0; i < 40; i++) { const s = rr(6700, 7350); railFrame(s, fr); const a = rr(0, TAU), d = rr(30, 260); sinst(pick(['plate0', 'plate1', 'container', 'blob', 'girder']), vadd(fr.p, vadd(vscl(fr.R, Math.cos(a) * d), vscl(fr.U, Math.sin(a) * d * 0.6))), qrand(), rr(1, 3), pick([[0.3, 0.12, 0.26], [0.55, 0.16, 0.12], [0.4, 0.42, 0.28]]), pick([2, 5]), s, 0.4, rnd() * 9, 0.9); }
  for (let i = 0; i < 30; i++) { const s = rr(6800, 7500); railFrame(s, fr); const a = rr(0, TAU), d = rr(30, 200); gasCloud(s, vadd(fr.p, vadd(vscl(fr.R, Math.cos(a) * d), vscl(fr.U, Math.sin(a) * d * 0.5))), rr(30, 70), 7, [[0.15, 0.5, 0.4], [0.35, 0.15, 0.4]], 0.9); }
  buildBossWreck();
}
// the freighter where the creature lives, laid across the route at S_BOSS
const WRECK = {}; // boss arena frame: c, T, U, R, X(local) and the anchor points (every level sets it)
function buildBossWreck() {
  const fr = railFrame(S_BOSS, {}); const T = fr.T, U = fr.U, R = fr.R;
  WRECK.c = vadd(vadd(fr.p, vscl(U, -4)), vscl(T, 0)); WRECK.T = T; WRECK.U = U; WRECK.R = R;
  const q = qbasis(vnorm(vcross(U, R)), U, R); // ship length along R
  const r = 24, paint = [0.55, 0.42, 0.18], key = S_BOSS;
  const X = v => vadd(WRECK.c, vadd(vadd(vscl(R, v[0]), vscl(U, v[1])), vscl(T, v[2])));
  // two halves with the breach in the middle
  for (const [x0, n] of [[-110, 3], [8, 3]]) for (let i = 0; i < n; i++) sinst('hullseg', X([x0 + i * 34 + 17, 0, 6]), q, [r, r, 17], paint, 7, key, 0.5, i * 3 + x0, 0.85);
  for (let k = 0; k < 6; k++) sinst('rib', X([-8 + k * 3.2, 0, 6]), qmul(q, qmul(QX90, qaxis([0, 1, 0], 2.2 + k * 0.4))), r * 0.98, [0.38, 0.38, 0.4], 3, key);
  sinst('bow', X([-110, 0, 6]), qmul(q, qaxis([0, 1, 0], Math.PI)), [r, r, r * 1.2], paint, 2, key, 1, 7, 0.85);
  for (const [y, z] of [[0, 0], [10, -8], [-10, 8]]) sinst('bell', X([114, y, z + 6]), q, 11, [1, 1, 1], 3, key);
  sinst('tower', X([70, r * 0.95, 6]), q, 14, paint, 7, key, 0.2, 5, 0.85);
  sinst('tower', X([-60, r * 0.95, 6]), q, 10, paint, 7, key, 0.2, 9, 0.85);
  // organic growth and breach rims
  for (let k = 0; k < 28; k++) { const x = rr(-100, 120), a = rr(-2.6, 2.6); sinst('blob', X([x, Math.sin(a) * r * 1.02, 6 - Math.cos(a) * r * 1.02]), qrand(), rr(2, 7), [0.2, 0.07, 0.17], 5, key, 0.4, rnd() * 9); }
  sinst('brim', X([0, 0, -16]), qbasis(R, T, U), [25, 10, 25], [0.7, 0.75, 0.7], 5, key, 0.25, 2);
  for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + rr(-0.15, 0.15), rad = rr(22, 29); sinst('blob', X([Math.cos(a) * rad, Math.sin(a) * rad, -16 + rr(-3, 3)]), qrand(), rr(3.5, 7.5), [0.14, 0.05, 0.12], 5, key, 0.3, rnd() * 9); }
  WRECK.anchors = [[-45, 14, -16], [45, 12, -16], [-32, -16, -14], [34, -18, -14]].map(v => X(v));
  WRECK.anchorLocal = [[-45, 14, -16], [45, 12, -16], [-32, -16, -14], [34, -18, -14]];
  for (const a of WRECK.anchorLocal) sinst('brim', X(a), qbasis(R, T, U), [5.5, 2.6, 5.5], [1, 1, 1], 5, key, 0.3, 4);
  WRECK.X = X;
  for (let k = 0; k < 10; k++) sinst('container', X([rr(-130, 140), rr(-50, 50), rr(-60, -20)]), qrand(), rr(0.9, 1.3), pick(PAINTS), 2, key, 1, rnd() * 9, 0.85);
  gasCloud(key, X([0, 0, -10]), 60, 25, [[0.12, 0.5, 0.38], [0.3, 0.12, 0.35]], 1.0);
}
