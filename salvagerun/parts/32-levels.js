// ---------- levels: the campaign's four areas (route, zones, sky, waves, scenery, boss arena) ----------
let LV = null, LV_N = 1;
// world point on the ground (comet crust) at lateral x and route position s
function groundAt(x, s) { const y = LV && LV.ground ? LV.ground(x, s) : -60; return railToWorld(x, y, s); }
// wave patterns (run at an event's route position; LEAD and inLane live in 60-game.js)
const PAT = {
  field(kind, n, o = {}) { const w = o.w || 30, h = o.h || 13; for (let i = 0; i < n; i++) spawnAt(kind, rr(-w, w), rr(-h, h) + (o.y || 0), LEAD + rr(0, o.d || 80), { aim: rnd() < (o.lane ?? 0.35) ? inLane() : undefined, spin: rr(o.s0 || 0.4, o.s1 || 2), rv: o.rv ? [rr(-o.rv[0], o.rv[0]), rr(-o.rv[1], o.rv[1]), o.rv[2] || 0] : undefined }); },
  wall(kind, n, w, o = {}) { for (let i = 0; i < n; i++) spawnAt(kind, -w + 2 * w * i / Math.max(1, n - 1), rr(-(o.h || 5), o.h || 5), LEAD + rr(0, 20), { spin: rr(1, 3), rv: [0, 0, o.vz ?? -4] }); },
  cross(kind, n, side, sp = 12, o = {}) { for (let i = 0; i < n; i++) spawnAt(kind, side * (60 + i * 12), rr(-8, 10), LEAD + i * (o.gap || 28), { rv: [-side * sp, 0, 0], spin: 0.35 }); },
  sentries(n) { for (let i = 0; i < n; i++) { const e = spawnAt('sentry', rr(-28, 28), rr(-6, 16), LEAD + rr(-20, 40), { spin: 0 }); e.pace = true; e.hold = rr(230, 320); e.closeIn = rr(5, 11); e.paceT = rr(5, 8); } },
  ridden(n, rider, k, o = {}) {
    for (let i = 0; i < n; i++) {
      const r = spawnAt(o.host || 'rockM', rr(-(o.w || 26), o.w || 26), rr(-10, 10), LEAD + i * (o.gap || 26), { aim: rnd() < (o.lane || 0.2) ? inLane() : undefined, spin: rr(0.12, 0.35) });
      if (rider === 'mite') attachCritter(r, k); else attachTo(r, rider, k);
    }
  },
  jet(n, o = {}) { // a gas jet on the comet throws rocks (and the odd crystal) across the lane
    const s = TUG.s + rr(o.d0 || 210, o.d1 || 320), x = o.x ?? rr(-70, 70), G = groundAt(x, s), f = railFrame(s, {});
    FX.puff(G, 12, [0.75, 0.8, 0.85], vscl(f.U, 45), 14); spawnP({ p: G, life: 0.6, s0: 6, s1: 40, c0: [2, 2.4, 3], c1: [0.2, 0.25, 0.3], a0: 0.8, a1: 0, shape: 1 });
    for (let i = 0; i < n; i++) {
      const aimP = railToWorld(rr(-14, 14) + TUG.x, rr(-8, 8), s - rr(40, 100)), v = vadd(vscl(vnorm(vsub(aimP, G)), rr(44, 58)), vscl(randDir(rnd), 7));
      spawnE(rnd() < (o.crystals ?? 0.2) ? 'crystal' : 'jetrock', { space: 'world', wp: vmad(G, f.U, 4 + i * 3), wv: v, spin: rr(1, 3) });
    }
    SFX.boom(6); shake(0.15);
  }
};
// ---------------- level 1: the original run ----------------
const L1_SKY = { sun: [-0.62, 0.5, -0.38], planet: [0.62, 0.16, 1], planetAx: [0.25, 1, 0.1], ringN: [0.25, 1, -0.9], band: [0.35, 1, -0.25], rot: [[0, 1, 0], 0], tint: [1, 1, 1], ring: true, sunSize: 1 };
// ---------------- level 2: Kessler Breaker Yard ----------------
function sceneryL2() {
  srand(8181); const F = QL.field, fr = {}, steel = [0.5, 0.52, 0.55], yellow = [0.86, 0.62, 0.1];
  for (let s = 80; s < 2420; s += 120) { // conveyor lines of scrap beside the lane, crushers and cranes
    railFrame(s, fr); const q = frameQ(fr.T, fr.U);
    for (const side of [-1, 1]) {
      const lat = side * (68 + 22 * Math.sin(s * 0.003 + side)), ht = -24 + 10 * Math.sin(s * 0.002 + side);
      const p = vadd(fr.p, vadd(vscl(fr.R, lat), vscl(fr.U, ht)));
      sinst('girder', p, q, [2.2, 2.2, 12], yellow, 2, s, 1, rnd() * 9, 0.8);
      for (let k = 0; k < 3; k++) sinst('cube' + ri(0, 1), vadd(p, vadd(vscl(fr.U, 4.6), vscl(fr.T, rr(-50, 50)))), qrand(), 3, [1, 1, 1], 2, s, 1, rnd() * 9, 0.8);
      if (rnd() < 0.45) { const cp = vadd(p, vadd(vscl(fr.R, side * rr(40, 90)), vscl(fr.U, rr(-20, 30)))); sinst('crusher', cp, q, rr(6, 10), [1, 1, 1], 2, s, 1, rnd() * 9, 0.85); sinst('beacon', vadd(cp, vscl(fr.U, 30)), qid(), 1.2, [1, 0.55, 0.15], 4, s, 4, rnd() * 5, -1); gasSheet(s, cp, vscl(fr.U, 30), vscl(fr.T, 18), 6, [[1, 0.5, 0.15], [0.8, 0.3, 0.1]], 1.1); }
      if (rnd() < 0.3) { const b = vadd(p, vscl(fr.U, 2)), arm = vnorm(vadd(vscl(fr.U, 0.8), vscl(fr.R, -side * 0.6))); sinst('girder', vmad(b, arm, 30), frameQ(arm, fr.T), [1.4, 1.4, 6], yellow, 2, s, 1, rnd() * 9, 0.8); sinst('container', vadd(vmad(b, arm, 58), vscl(fr.U, -12)), q, 1, pick(PAINTS), 2, s, 1, rnd() * 9, 0.8); }
    }
    sinst('beacon', vadd(fr.p, vadd(vscl(fr.R, rr(-40, 40)), vscl(fr.U, 40))), qid(), 0.8, [1, 0.6, 0.2], 4, s, 3, rnd() * 5, -1);
  }
  for (let i = 0; i < 640 * F; i++) { // junk and station modules far out
    const s = rr(0, 4500); railFrame(s, fr); const a = rr(0, TAU), d = 55 + Math.pow(rnd(), 1.4) * 700, p = vadd(fr.p, vadd(vscl(fr.R, Math.cos(a) * d), vscl(fr.U, Math.sin(a) * d * 0.6)));
    const r = rnd();
    if (r < 0.15) sinst('hullseg', p, qrand(), [rr(8, 16), rr(8, 16), rr(10, 25)], [0.6, 0.6, 0.58], 7, s, 1.2, rnd() * 9, 0.6);
    else if (r < 0.3) sinst('solar', p, qrand(), rr(6, 14), [1, 1, 1], 3, s, 1, rnd() * 9, 0);
    else sinst(pick(['cube0', 'cube1', 'plate0', 'plate1', 'container', 'girder']), p, qrand(), rr(1.5, 4), pick(PAINTS), 2, s, 1, rnd() * 9, 0.8);
  }
  for (let i = 0; i < 110; i++) { const s = rr(0, 4500); railFrame(s, fr); gasCloud(s, vadd(fr.p, vadd(vscl(fr.R, rr(-320, 320)), vscl(fr.U, rr(-90, 90)))), rr(40, 100), 7, pick([[[0.35, 0.33, 0.32], [0.45, 0.32, 0.22]], [[0.2, 0.3, 0.38], [0.3, 0.4, 0.45]]]), 0.85); }
  for (let i = 0; i < 14; i++) { const s = rr(150, 2300), side = rnd() < 0.5 ? -1 : 1; railFrame(s, fr); derelict(s, vadd(fr.p, vadd(vscl(fr.R, side * rr(170, 420)), vscl(fr.U, rr(-90, 90)))), qrand(), rr(10, 22), { lit: 0.4 }); }
  // station spine: a lattice of girder frames around the lane, habitat modules and solar wings outside it
  for (let s = 2420; s <= 4180; s += 40) {
    railFrame(s, fr); const q = frameQ(fr.T, fr.U), H = 34, X = (x, y) => vadd(fr.p, vadd(vscl(fr.R, x), vscl(fr.U, y)));
    const qR = qmul(q, qaxis([0, 1, 0], Math.PI / 2)), qU = qmul(q, qaxis([1, 0, 0], Math.PI / 2));
    sinst('girder', X(0, H), qR, [1.6, 1.6, 7], steel, 2, s, 1, s, 0.8); sinst('girder', X(0, -H), qR, [1.6, 1.6, 7], steel, 2, s, 1, s, 0.8);
    sinst('girder', X(H, 0), qU, [1.6, 1.6, 7], steel, 2, s, 1, s, 0.8); sinst('girder', X(-H, 0), qU, [1.6, 1.6, 7], steel, 2, s, 1, s, 0.8);
    railFrame(s + 20, fr); const q2 = frameQ(fr.T, fr.U), X2 = (x, y) => vadd(fr.p, vadd(vscl(fr.R, x), vscl(fr.U, y)));
    for (const [x, y] of [[H, H], [-H, H], [H, -H], [-H, -H]]) sinst('girder', X2(x, y), q2, [1.2, 1.2, 4], yellow, 2, s, 1, s, 0.8);
    if ((s / 40) % 4 === 0) { const side = (s / 160) % 2 ? 1 : -1; sinst('hullseg', X2(side * 62, rr(-15, 15)), q2, [16, 16, 22], [0.62, 0.62, 0.6], 7, s, 1.4, s, 0.6); sinst('solar', X2(side * -80, 20), qmul(q2, qaxis([0, 0, 1], 0.3)), 12, [1, 1, 1], 3, s, 1, 0, 0); }
    if ((s / 40) % 3 === 0) sinst('beacon', X2(rr(-30, 30), H - 3), qid(), 0.9, [1, 0.85, 0.6], 4, s, 3.5, s, 0);
  }
  for (let i = 0; i < 26; i++) { const s = rr(2420, 4180); railFrame(s, fr); gasSheet(s, vadd(fr.p, vscl(fr.U, rr(-30, 30))), vscl(fr.R, 40), vscl(fr.T, 40), 5, [[0.35, 0.4, 0.5], [0.5, 0.45, 0.4]], 0.6); }
  // foundry glow before the gantry
  for (let i = 0; i < 24; i++) { const s = rr(4100, 4700); railFrame(s, fr); const cp = vadd(fr.p, vadd(vscl(fr.R, (rnd() < 0.5 ? -1 : 1) * rr(75, 230)), vscl(fr.U, rr(-90, 30)))); sinst('crusher', cp, qrand(), rr(8, 14), [1, 1, 1], 2, s, 1, rnd() * 9, 0.85); gasCloud(s, cp, 50, 8, [[1, 0.45, 0.12], [0.6, 0.25, 0.1]], 1.2); }
  arenaL2();
}
function arenaL2() {
  const fr = railFrame(S_BOSS, {}), T = fr.T, U = fr.U, R = fr.R;
  WRECK.c = fr.p.slice(); WRECK.T = T; WRECK.U = U; WRECK.R = R;
  const X = v => vadd(WRECK.c, vadd(vadd(vscl(R, v[0]), vscl(U, v[1])), vscl(T, v[2]))); WRECK.X = X; WRECK.anchorLocal = [];
  const q = frameQ(T, U), qU = qmul(q, qaxis([1, 0, 0], Math.PI / 2)), qR = qmul(q, qaxis([0, 1, 0], Math.PI / 2)), yellow = [0.86, 0.62, 0.1], key = S_BOSS;
  for (const x of [-58, 58]) { sinst('girder', X([x, 0, 14]), qU, [3, 3, 8], yellow, 2, key, 1, x, 0.8); sinst('beacon', X([x, 42, 6]), qid(), 2, [1, 0.9, 0.7], 4, key, 5, 0, 0); }
  sinst('girder', X([0, 40, 14]), qR, [3, 3, 12], yellow, 2, key, 1, 3, 0.8);
  for (const y of [-38, -46]) { sinst('girder', X([0, y, -44]), qR, [2.5, 2.5, 13], [0.5, 0.52, 0.55], 2, key, 1, y, 0.8); for (let k = 0; k < 9; k++) sinst('cube' + (k % 2), X([-55 + k * 14, y + 5, -44]), qrand(), 3.2, [1, 1, 1], 2, key, 1, k, 0.8); }
  for (const x of [-90, 90]) sinst('crusher', X([x, -20, 0]), q, 12, [1, 1, 1], 2, key, 1, x, 0.85);
  gasCloud(key, X([0, -30, 0]), 70, 16, [[1, 0.45, 0.12], [0.5, 0.25, 0.12]], 1.0);
}
// rotating habitat wheel beside the spine
function decorL2() {
  const s = 3250; if (Math.abs(TUG.s - s) > 2200) return;
  const fr = railFrame(s, {}), c = vadd(fr.p, vadd(vscl(fr.R, -430), vscl(fr.U, 60)));
  inst('wheel', c, qmul(frameQ(fr.R, fr.U), qmul(QX90, qaxis([0, 1, 0], G.t * 0.06))), 240, [1, 1, 1], 7, 1.6, 0, 3, 0.4);
}
// ---------------- level 3: The Comet Tail ----------------
const CRATERS = (() => { const R = mkRng(4711), out = []; for (let i = 0; i < 70; i++) out.push({ x: (R() - 0.5) * 1200, s: 1900 + R() * 3300, r: 20 + R() * 70, d: 6 + R() * 18 }); return out; })();
function groundL3(x, s) {
  const base = -lerp(330, 96, sstep(1850, 2700, s));
  const n = fbm(x * 0.006 + 3, s * 0.006, 1.7, 4), ridge = 1 - Math.abs(fbm(x * 0.004 + 9, s * 0.004, 4.2, 3) * 2 - 1);
  let h = (n - 0.5) * 80 + ridge * 34 - 12;
  for (const c of CRATERS) { const d = Math.hypot(x - c.x, s - c.s) / c.r; if (d < 1.4) h += d < 1 ? -c.d * (1 - d * d) : c.d * 0.5 * Math.sin((d - 1) / 0.4 * Math.PI); }
  const lane = 1 - sstep(40, 110, Math.abs(x));
  const curve = -Math.pow(Math.max(0, 2350 - s) / 500, 2) * 520 - Math.pow(Math.abs(x) / 900, 2) * 260; // the nucleus curves away at its leading edge and its sides
  return Math.min(base + h, lerp(base + h, -52, lane), -40) + curve;
}
function sceneryL3() {
  srand(9191); const F = QL.field, fr = {};
  for (let i = 0; i < 900 * F; i++) { // dirty ice chunks in the coma
    const s = rr(-200, 2500); railFrame(s, fr); const a = rr(0, TAU), d = 50 + Math.pow(rnd(), 1.5) * 1200, p = vadd(fr.p, vadd(vscl(fr.R, Math.cos(a) * d), vscl(fr.U, Math.sin(a) * d * 0.6)));
    const size = clamp(1.5 + Math.pow(rnd(), 2.5) * 40 * (0.3 + d / 900), 1.5, 50);
    sinst(d < 250 && size > 6 ? 'rock' + ri(0, 4) : 'rockLo' + ri(0, 2), p, qrand(), size, [1, 1, 1], 11, s, 1, rnd() * 9);
  }
  for (let i = 0; i < 130; i++) { const s = rr(-200, 2600); railFrame(s, fr); const c = vadd(fr.p, vadd(vscl(fr.R, rr(-500, 500)), vscl(fr.U, rr(-150, 150)))); gasSheet(s, c, vscl(vnorm(vadd(fr.T, vscl(fr.R, 0.3))), rr(80, 180)), vscl(fr.U, rr(40, 100)), 6, [[0.55, 0.75, 1], [0.8, 0.9, 1]], 1.0); }
  for (let i = 0; i < 40; i++) { const s = rr(0, 2400); railFrame(s, fr); gasGlitter(s, vadd(fr.p, vadd(vscl(fr.R, rr(-50, 50)), vscl(fr.U, rr(-15, 15)))), 50, 36, [3, 3.6, 4.4]); }
  // on the crust: spires, boulders, glowing crystal clusters, vent plumes
  for (let i = 0; i < 260 * F; i++) {
    const s = rr(1950, 5000), x = (rnd() < 0.5 ? -1 : 1) * (30 + Math.pow(rnd(), 0.8) * 600), y = groundL3(x, s), f = railFrame(s, fr);
    const p = vadd(f.p, vadd(vscl(f.R, x), vscl(f.U, y))), up = vnorm(vadd(f.U, vscl(randDir(rnd), 0.25)));
    const r = rnd();
    if (r < 0.35) sinst('shard', p, qfromTo([0, 1, 0], up), [rr(6, 14), rr(14, 40), rr(6, 14)], [0.85, 0.93, 1], 1, s, 1, rnd() * 9);
    else if (r < 0.8) sinst('rock' + ri(0, 4), vmad(p, f.U, -3), qrand(), rr(5, 28), [1, 1, 1], 11, s, 1, rnd() * 9);
    else sinst('crysclus', p, qfromTo([0, 1, 0], up), rr(5, 11), pick([[1, 0.3, 0.85], [0.4, 0.7, 1], [0.6, 1, 0.5]]), 10, s, 1.2, rnd() * 9);
  }
  for (let i = 0; i < 34; i++) { const s = rr(2000, 4900), x = rr(-400, 400), f = railFrame(s, fr), p = vadd(f.p, vadd(vscl(f.R, x), vscl(f.U, groundL3(x, s)))); gasSheet(s, vmad(p, f.U, 70), vscl(f.U, 75), vscl(f.T, 16), 8, [[0.7, 0.8, 0.95], [0.9, 0.95, 1]], 1.2); }
  for (let i = 0; i < 60; i++) { const s = rr(2000, 5000); railFrame(s, fr); gasCloud(s, vadd(fr.p, vadd(vscl(fr.R, rr(-400, 400)), vscl(fr.U, rr(-60, 40)))), rr(50, 110), 6, [[0.5, 0.65, 0.85], [0.7, 0.8, 0.95]], 0.8); }
  arenaL3();
}
function arenaL3() {
  const fr = railFrame(S_BOSS, {}); WRECK.c = fr.p.slice(); WRECK.T = fr.T; WRECK.U = fr.U; WRECK.R = fr.R; WRECK.anchorLocal = [];
  WRECK.X = v => vadd(WRECK.c, vadd(vadd(vscl(fr.R, v[0]), vscl(fr.U, v[1])), vscl(fr.T, v[2])));
  for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, x = Math.cos(a) * 110, s = S_BOSS + Math.sin(a) * 110, f = railFrame(s, {}); sinst('rock' + ri(0, 4), vadd(f.p, vadd(vscl(f.R, x), vscl(f.U, groundL3(x, s) + 4))), qrand(), rr(10, 24), [1, 1, 1], 11, S_BOSS, 1, k); }
}
// comet crust: a terrain ribbon under the route, rows every 10 m, columns denser near the lane
function terrainL3() {
  const s0 = 1850, s1 = 5150, rows = Math.round((s1 - s0) / 10) + 1, cols = 71, fr = {};
  const P = new Float32Array(rows * cols * 3), Nn = new Float32Array(rows * cols * 3), C = new Uint8Array(rows * cols * 4), UV = new Float32Array(rows * cols * 2);
  const xs = []; for (let c = 0; c < cols; c++) { const u = c / (cols - 1) * 2 - 1; xs.push(Math.sign(u) * Math.pow(Math.abs(u), 1.5) * 900); }
  const H = []; for (let r = 0; r < rows; r++) { const s = s0 + r * 10, row = []; for (let c = 0; c < cols; c++) row.push(groundL3(xs[c], s)); H.push(row); }
  for (let r = 0; r < rows; r++) {
    const s = s0 + r * 10; railFrame(s, fr);
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c, x = xs[c], y = H[r][c], p = vadd(fr.p, vadd(vscl(fr.R, x), vscl(fr.U, y)));
      P.set(p, i * 3);
      const dx = (H[r][Math.min(c + 1, cols - 1)] - H[r][Math.max(c - 1, 0)]) / Math.max(1, xs[Math.min(c + 1, cols - 1)] - xs[Math.max(c - 1, 0)]);
      const ds = (H[Math.min(r + 1, rows - 1)][c] - H[Math.max(r - 1, 0)][c]) / 20;
      Nn.set(vnorm(vadd(fr.U, vadd(vscl(fr.R, -dx), vscl(fr.T, -ds)))), i * 3);
      const ice = sstep(0.55, 0.68, fbm(x * 0.01, s * 0.01, 8.3, 3)), dust = 0.75 + 0.5 * fbm(x * 0.03, s * 0.03, 2.2, 2);
      const col = vlerp(vscl([0.2, 0.19, 0.18], dust), [0.62, 0.72, 0.82], ice);
      C[i * 4] = col[0] * 255; C[i * 4 + 1] = col[1] * 255; C[i * 4 + 2] = col[2] * 255; C[i * 4 + 3] = 1; UV[i * 2] = x / 40; UV[i * 2 + 1] = s / 40;
    }
  }
  const I = []; for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) { const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1; I.push(a, d, b, b, d, e); }
  return orientMesh(P, Nn, C, UV, I);
}
// ---------------- level 4: The Nest ----------------
const TUN = { s0: 2230, s1: 4370 };
function tunnelRadius(s, a) { const mouth = 1 + 2.2 * (1 - sstep(TUN.s0, TUN.s0 + 120, s)); return (66 + 16 * fbm(Math.cos(a) * 1.5 + 4, Math.sin(a) * 1.5, s * 0.008, 3) + 10 * Math.sin(s * 0.011)) * mouth; }
function tunnelL4() {
  const rings = Math.round((TUN.s1 - TUN.s0) / 8) + 1, sides = 30, fr = {};
  const nv = rings * (sides + 1), P = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), C = new Uint8Array(nv * 4), UV = new Float32Array(nv * 2);
  for (let r = 0; r < rings; r++) {
    const s = TUN.s0 + r * 8; railFrame(s, fr);
    for (let k = 0; k <= sides; k++) {
      const a = k / sides * TAU, i = r * (sides + 1) + k, rad = tunnelRadius(s, a), dir = vadd(vscl(fr.R, Math.cos(a)), vscl(fr.U, Math.sin(a)));
      P.set(vmad(fr.p, dir, rad), i * 3); Nn.set(vscl(dir, -1), i * 3);
      const v = 0.6 + 0.5 * fbm(Math.cos(a) * 3, Math.sin(a) * 3, s * 0.02, 2);
      C[i * 4] = 74 * v; C[i * 4 + 1] = 26 * v; C[i * 4 + 2] = 60 * v; C[i * 4 + 3] = 6; UV[i * 2] = s / 160; UV[i * 2 + 1] = k / sides;
    }
  }
  const I = []; for (let r = 0; r < rings - 1; r++) for (let k = 0; k < sides; k++) { const a = r * (sides + 1) + k, b = a + 1, c = a + sides + 1, d = c + 1; I.push(a, b, c, c, b, d); }
  return orientMesh(P, Nn, C, UV, I);
}
function sceneryL4() {
  srand(9393); const F = QL.field, fr = {};
  for (let i = 0; i < 520 * F; i++) { // nest rocks with organic growth
    const s = rr(-200, 2350); railFrame(s, fr); const a = rr(0, TAU), d = 55 + Math.pow(rnd(), 1.5) * 1100, p = vadd(fr.p, vadd(vscl(fr.R, Math.cos(a) * d), vscl(fr.U, Math.sin(a) * d * 0.6)));
    const size = clamp(2 + Math.pow(rnd(), 2.5) * 45 * (0.3 + d / 900), 2, 60), hi = d < 260 && size > 6;
    sinst(hi ? 'rock' + ri(0, 4) : 'rockLo' + ri(0, 2), p, qrand(), size, [0.38, 0.33, 0.33], 0, s, 1, rnd() * 9);
    if (hi && rnd() < 0.6) for (let k = 0; k < 3; k++) { const dd = randDir(rnd); sinst(rnd() < 0.35 ? 'egg' : 'blob', vmad(p, dd, size * 0.85), qfromTo([0, 1, 0], dd), size * rr(0.18, 0.35), [0.9, 0.85, 0.9], 5, s, 1.4, rnd() * 9); }
    if (hi && rnd() < 0.3) { const q2 = qrand(); sinst('strand', p, q2, [size, size, size * rr(3, 6)], [1, 1, 1], 5, s, 0.8, rnd() * 9); }
  }
  for (let i = 0; i < 90; i++) { const s = rr(-100, 2400); railFrame(s, fr); gasCloud(s, vadd(fr.p, vadd(vscl(fr.R, rr(-400, 400)), vscl(fr.U, rr(-100, 100)))), rr(40, 100), 7, [[0.2, 0.7, 0.4], [0.35, 0.2, 0.45]], 1.1); }
  // the hollow asteroid around the tunnel mouth
  railFrame(TUN.s0, fr);
  for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, rad = rr(330, 420); sinst('rock' + ri(0, 4), vadd(vadd(fr.p, vscl(fr.T, rr(80, 260))), vadd(vscl(fr.R, Math.cos(a) * rad), vscl(fr.U, Math.sin(a) * rad))), qrand(), rr(200, 280), [0.32, 0.28, 0.28], 0, TUN.s0, 1, k); }
  sinst('brim', vadd(fr.p, vscl(fr.T, -10)), qbasis(fr.R, fr.T, fr.U), [150, 40, 150], [0.8, 0.8, 0.8], 5, TUN.s0, 0.6, 3);
  // inside: ribs, egg clusters and glowing growths on the walls
  for (let s = TUN.s0 + 60; s < TUN.s1; s += 70) { railFrame(s, fr); const q = frameQ(fr.T, fr.U); sinst('rib', fr.p, qmul(q, qmul(QX90, qaxis([0, 1, 0], rnd() * TAU))), tunnelRadius(s, 0) * 0.92, [0.35, 0.12, 0.3], 5, s, 0.8, s, -1); }
  for (let i = 0; i < 260 * F; i++) {
    const s = rr(TUN.s0 + 40, TUN.s1), a = rr(0, TAU), f = railFrame(s, fr), dir = vadd(vscl(f.R, Math.cos(a)), vscl(f.U, Math.sin(a))), rad = tunnelRadius(s, a);
    const p = vmad(f.p, dir, rad * 0.96);
    sinst(rnd() < 0.5 ? 'egg' : 'blob', p, qfromTo([0, 1, 0], vscl(dir, -1)), rr(3, 8), [1, 1, 1], 5, s, rr(1, 3), rnd() * 9);
  }
  for (let i = 0; i < 70; i++) { const s = rr(TUN.s0, TUN.s1); railFrame(s, fr); gasCloud(s, vadd(fr.p, vadd(vscl(fr.R, rr(-35, 35)), vscl(fr.U, rr(-25, 25)))), rr(25, 50), 6, [[0.25, 0.9, 0.5], [0.6, 0.2, 0.55]], 1.0); }
  arenaL4();
}
const MAT_ANCHORS = [[-50, 20, -16], [50, 18, -16], [-38, -20, -14], [40, -22, -14], [-66, -2, -10], [66, 0, -10]];
function arenaL4() {
  const fr = railFrame(S_BOSS, {}), T = fr.T, U = fr.U, R = fr.R;
  WRECK.c = fr.p.slice(); WRECK.T = T; WRECK.U = U; WRECK.R = R; WRECK.anchorLocal = MAT_ANCHORS;
  const X = v => vadd(WRECK.c, vadd(vadd(vscl(R, v[0]), vscl(U, v[1])), vscl(T, v[2]))); WRECK.X = X;
  const key = S_BOSS;
  sinst('cavern', X([0, 0, -40]), frameQ(T, U), 330, [0.55, 0.5, 0.55], 5, key - 300, 0.05, 1, -1);
  for (let k = 0; k < 60; k++) { const x = rr(-150, 150), y = rr(-110, 110); sinst('blob', X([x, y, 20 + rr(0, 30) + Math.abs(x) * 0.15]), qrand(), rr(14, 34), [0.2, 0.07, 0.17], 5, key, 0.15, rnd() * 9, -1); }
  sinst('brim', X([0, 0, -16]), qbasis(R, T, U), [32, 12, 32], [0.7, 0.75, 0.7], 5, key, 0.3, 2);
  for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, rad = rr(28, 36); sinst('blob', X([Math.cos(a) * rad, Math.sin(a) * rad, -16 + rr(-3, 3)]), qrand(), rr(4, 9), [0.14, 0.05, 0.12], 5, key, 0.3, rnd() * 9, -1); }
  for (const a of MAT_ANCHORS) sinst('brim', X(a), qbasis(R, T, U), [6, 2.8, 6], [1, 1, 1], 5, key, 0.3, 4);
  for (let k = 0; k < 40; k++) sinst('egg', X([rr(-140, 140), rr(-100, 100), rr(10, 40)]), qrand(), rr(3, 7), [1, 1, 1], 5, key, 2, rnd() * 9);
  gasCloud(key, X([0, 0, -20]), 90, 26, [[0.15, 0.6, 0.4], [0.4, 0.15, 0.4]], 1.1);
}
// make every triangle face its vertex normal (front faces), so two-sided lighting stays right
function orientMesh(P, N, C, UV, I) {
  for (let k = 0; k < I.length; k += 3) {
    const a = I[k], b = I[k + 1], c = I[k + 2];
    const ab = [P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]], ac = [P[c * 3] - P[a * 3], P[c * 3 + 1] - P[a * 3 + 1], P[c * 3 + 2] - P[a * 3 + 2]];
    if (vdot(vcross(ab, ac), [N[a * 3], N[a * 3 + 1], N[a * 3 + 2]]) < 0) { I[k + 1] = c; I[k + 2] = b; }
  }
  return { P, N, C, UV, I: new Uint32Array(I) };
}
// a static mesh with its own VAO (terrain, tunnel), drawn with the mesh program and one identity instance
const LVMESH = { list: [] };
function uploadLevelMesh(m, opt = {}) {
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const vb = (data, loc, size, type, norm) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, type, norm, 0, 0); return b; };
  const bufs = [vb(m.P, 0, 3, gl.FLOAT, false), vb(m.N, 1, 3, gl.FLOAT, false), vb(m.C, 2, 4, gl.UNSIGNED_BYTE, true), vb(m.UV, 3, 2, gl.FLOAT, false)];
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.I, gl.STATIC_DRAW);
  const instb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, instb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 1, opt.mat ?? 0, opt.emis ?? 0.6, 0, 0, opt.special ?? 0]), gl.STATIC_DRAW);
  for (let l = 4; l <= 8; l++) { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.FLOAT, false, 80, (l - 4) * 16); gl.vertexAttribDivisor(l, 1); }
  gl.bindVertexArray(null);
  LVMESH.list.push({ vao, count: m.I.length, bufs: bufs.concat([ib, instb]), shadow: !!opt.shadow });
}
function freeLevelMeshes() { for (const m of LVMESH.list) { gl.deleteVertexArray(m.vao); for (const b of m.bufs) gl.deleteBuffer(b); } LVMESH.list = []; }
// ---------------- the level table ----------------
const LEVELS = [
  { num: 1, id: 'corvina', name: 'THE CORVINA RUN', blurb: 'Ship graveyard, asteroid belt and ice ring, to the wreck of the Corvina Sunrise.',
    pts: ROUTE_PTS, zones: ZONES.map(z => Object.assign({}, z)), stop: 7300, bossAt: 7440, boss: 'grabby', bossCfg: {},
    events: () => EV_L1, ambient: () => ambientL1(), scenery: sceneryL1, sky: L1_SKY, ranks: [400000, 280000, 180000, 100000], attract: ['rockM', 'plate', 'pod', 'iceM'], bossLabel: 'Old Grabby' },
  { num: 2, id: 'kessler', name: 'KESSLER BREAKER YARD', blurb: 'An abandoned scrapyard station whose robots never got the memo. Mines, sentries, crushers.',
    pts: [[0, 0, -300], [0, 0, 0], [-60, 20, 500], [-200, 60, 950], [-300, 40, 1450], [-280, -20, 1950], [-150, -60, 2400], [0, -40, 2850], [120, 0, 3300], [180, 40, 3750], [160, 60, 4200], [120, 60, 4600], [90, 58, 5000], [70, 56, 5400], [60, 55, 5800]],
    zones: [{ id: 'yard', name: 'BREAKER YARD', s0: 0, s1: 2350, env: 'yard', v: 44 }, { id: 'spine', name: 'STATION SPINE', s0: 2350, s1: 4100, env: 'spine', v: 46 }, { id: 'foundry', name: 'THE FOUNDRY', s0: 4100, s1: 4500, env: 'foundry', v: 46 }],
    stop: 4500, bossAt: 4640, boss: 'foreman', fireK: 1.3, events: () => EV_L2, ambient: () => ambientL2(), scenery: sceneryL2, decor: decorL2,
    sky: { sun: [0.7, 0.55, -0.3], planet: [-0.55, 0.28, 1], planetAx: [0.1, 1, 0.3], ringN: [0, 1, 0], band: [0.8, 0.5, 0.3], rot: [[1, 0.3, 0.2], 1.9], tint: [0.55, 0.62, 0.78], ring: false, sunSize: 1.2 },
    ranks: [400000, 280000, 180000, 100000], attract: ['cube', 'crate', 'scrap', 'plate'], bossLabel: 'the Foreman' },
  { num: 3, id: 'comet', name: 'THE COMET TAIL', blurb: 'Through the glowing coma and down to skim the crust of comet Halvard. Gas jets and crystals.',
    pts: [[0, 0, -300], [0, 0, 0], [50, -10, 500], [160, -20, 1000], [230, -40, 1500], [260, -60, 2000], [220, -70, 2500], [120, -70, 3000], [20, -65, 3500], [-40, -60, 4000], [-60, -58, 4500], [-70, -57, 4900], [-75, -56, 5300], [-78, -56, 5700]],
    zones: [{ id: 'coma', name: 'THE COMA', s0: 0, s1: 2000, env: 'coma', v: 45 }, { id: 'surface', name: 'THE CRUST', s0: 2000, s1: 4300, env: 'surface', v: 47 }, { id: 'burrow', name: 'THE BURROW', s0: 4300, s1: 4600, env: 'burrow', v: 46 }],
    stop: 4600, bossAt: 4740, boss: 'gulper', events: () => EV_L3, ambient: () => ambientL3(), scenery: sceneryL3, ground: groundL3, meshes: () => uploadLevelMesh(terrainL3(), { mat: 0, emis: 0.3, shadow: true }),
    sky: { sun: [0.55, 0.42, 0.72], planet: [-0.7, 0.35, 0.6], planetAx: [0.2, 1, 0], ringN: [0, 1, 0], band: [0.2, 1, 0.4], rot: [[0.2, 1, 0.5], 3.4], tint: [0.9, 0.95, 1.1], ring: false, sunSize: 2.6 },
    ranks: [300000, 210000, 140000, 80000], attract: ['dirtM', 'crystal', 'iceS', 'dirtS'], bossLabel: 'the Gulper' },
  { num: 4, id: 'nest', name: 'THE NEST', blurb: 'Follow the mite trails to the hollow asteroid where Grabby came from. Eggs, spitters, swarms.',
    pts: [[0, 0, -300], [0, 0, 0], [40, 30, 500], [100, 80, 1000], [60, 120, 1500], [-40, 130, 2000], [-120, 110, 2500], [-160, 70, 3000], [-140, 30, 3500], [-80, 10, 4000], [-40, 5, 4500], [-20, 4, 4900], [-10, 4, 5300], [-5, 4, 5700]],
    zones: [{ id: 'hive', name: 'THE HIVE', s0: 0, s1: 2200, env: 'hive', v: 44 }, { id: 'throat', name: 'THE THROAT', s0: 2200, s1: 4300, env: 'throat', v: 42 }, { id: 'cavern', name: 'THE BROOD CHAMBER', s0: 4300, s1: 4500, env: 'cavern', v: 40 }],
    stop: 4500, bossAt: 4640, boss: 'grabby', events: () => EV_L4, ambient: () => ambientL4(), scenery: sceneryL4, meshes: () => uploadLevelMesh(tunnelL4(), { mat: 5, emis: 0.15, special: -1 }),
    bossCfg: { anchors: MAT_ANCHORS, HR: 27, eyes: 8, nodeHp: 7, eyeHp: 12, coreHp: 120, len: 88, thick: 1.15, name: 'THE MATRIARCH', eggs: true, attackK: 1.4, tint: [1.1, 0.85, 1.05],
      lines: { intro1: 'mat1', intro2: 'mat2', eyes: 'mateyes', core: 'matcore', pull: 'matpull', chomp: 'matchomp', win: 'matwin', slap: 'matslap', sever: 'sever' } },
    sky: { sun: [-0.3, 0.25, -0.9], planet: [0.5, -0.1, 1], planetAx: [0.4, 1, 0], ringN: [0.6, 1, -0.4], band: [0.1, 1, 0.1], rot: [[0.6, 0.2, 1], 4.6], tint: [1.05, 0.55, 0.5], ring: true, sunSize: 0.8 },
    ranks: [360000, 260000, 170000, 100000], attract: ['egg', 'rockM', 'hoard', 'rockS'], bossLabel: 'the Matriarch' }
];
function setLevel(n) {
  LV_N = clamp(n | 0, 1, LEVELS.length); LV = LEVELS[LV_N - 1];
  ROUTE_PTS = LV.pts; ZONES = LV.zones; S_STOP = LV.stop; S_BOSS = LV.bossAt;
  const sk = LV.sky; SKY.sunDir = vnorm(sk.sun); SKY.planetDir = vnorm(sk.planet); SKY.planetAx = vnorm(sk.planetAx); SKY.ringN = vnorm(sk.ringN); SKY.bandN = vnorm(sk.band);
  SKY.tint = sk.tint; SKY.ring = sk.ring ? 1 : 0; SKY.sunSize = sk.sunSize;
  const q = qaxis(sk.rot[0], sk.rot[1]), x = qrot(q, [1, 0, 0]), y = qrot(q, [0, 1, 0]), z = qrot(q, [0, 0, 1]);
  SKY.rot = new Float32Array([x[0], x[1], x[2], y[0], y[1], y[2], z[0], z[1], z[2]]);
}
// rebuild everything that belongs to the current level: route, static scenery, gas, terrain / tunnel
function buildScenery() {
  const saved = RNG_S;
  STATIC.list = []; gasBegin();
  LV.scenery();
  gasEnd(); staticFinalize();
  freeLevelMeshes(); if (LV.meshes) LV.meshes();
  RNG_S = saved;
}
function buildLevel(n) { setLevel(n); buildRoute(LV.pts); buildScenery(); }
