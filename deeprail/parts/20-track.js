// ===== Track: turtle-built rail segments, junction/merge nodes, chambers, tunnel profiles, wall tests =====
// Every segment is sampled every DS metres. Branch pairs share a start node and end node; the second branch of a pair
// is solved (two straight lengths) and then warped smoothly so it lands exactly on its sibling's end.
const DS = 0.5;
const TRACK = { segs: {}, list: [], chambers: [], grid: new Map(), cell: 6 };

const fwdOf = (yaw) => [-Math.sin(yaw), 0, -Math.cos(yaw)];
const rightOf = (yaw) => [Math.cos(yaw), 0, -Math.sin(yaw)];

function integrate(start, pieces, smoothM) {
  const total = pieces.reduce((a, p) => a + p.L, 0), n = Math.round(total / DS) + 1;
  const k = new Float32Array(n), g = new Float32Array(n);
  let i = 0;
  for (const pc of pieces) { const m = Math.round(pc.L / DS); for (let j = 0; j < m && i < n; j++, i++) { k[i] = pc.turn * DEG / pc.L; g[i] = pc.drop / pc.L; } }
  for (; i < n; i++) { k[i] = 0; g[i] = g[i - 1] || 0; }
  const W = Math.max(1, Math.round((smoothM || 10) / DS)), ks = new Float32Array(n), gs = new Float32Array(n);
  for (let j = 0; j < n; j++) {
    let a = 0, b = 0, c = 0;
    for (let q = -W; q <= W; q++) { const t = j + q; const kk = t < 0 ? 0 : t >= n ? 0 : k[t]; const gg = t < 0 ? g[0] : t >= n ? g[n - 1] : g[t]; a += kk; b += gg; c++; }
    ks[j] = a / c; gs[j] = b / c;
  }
  const pts = new Float32Array(n * 3); let p = V.copy(start.p), yaw = start.yaw;
  for (let j = 0; j < n; j++) { pts[j * 3] = p[0]; pts[j * 3 + 1] = p[1]; pts[j * 3 + 2] = p[2]; yaw += ks[j] * DS; p = [p[0] - Math.sin(yaw) * DS, p[1] - gs[j] * DS, p[2] - Math.cos(yaw) * DS]; }
  return { pts, n, endYaw: yaw - ks[n - 1] * DS };
}
function endOf(r) { const j = (r.n - 1) * 3; return [r.pts[j], r.pts[j + 1], r.pts[j + 2]]; }

// solve the lengths of two straight pieces (indices ia, ib) so the path ends at target (x,z); y and leftovers are warped
function solvePieces(start, pieces, ia, ib, target) {
  for (let it = 0; it < 4; it++) {
    const e0 = endOf(integrate(start, pieces));
    const pa = pieces.map((p, i) => i === ia ? { ...p, L: p.L + 1 } : p), pb = pieces.map((p, i) => i === ib ? { ...p, L: p.L + 1 } : p);
    const ea = endOf(integrate(start, pa)), eb = endOf(integrate(start, pb));
    const j11 = ea[0] - e0[0], j21 = ea[2] - e0[2], j12 = eb[0] - e0[0], j22 = eb[2] - e0[2];
    const rx = target[0] - e0[0], rz = target[2] - e0[2], det = j11 * j22 - j12 * j21;
    if (Math.abs(det) < 1e-6) break;
    const da = (rx * j22 - rz * j12) / det, db = (j11 * rz - j21 * rx) / det;
    pieces[ia] = { ...pieces[ia], L: Math.max(12, pieces[ia].L + da) }; pieces[ib] = { ...pieces[ib], L: Math.max(12, pieces[ib].L + db) };
  }
  return pieces;
}

class Seg {
  constructor(id, name, start, pieces, opt = {}) {
    this.id = id; this.name = name; this.opt = opt;
    let r;
    if (opt.circle) {   // analytic circle (the boss loop): radius R, turning left
      const R = opt.circle, L = TAU * R, n = Math.round(L / DS) + 1, C = V.madd(start.p, rightOf(start.yaw), -R);
      const pts = new Float32Array(n * 3);
      for (let j = 0; j < n; j++) { const yaw = start.yaw + (j / (n - 1)) * TAU, rr = rightOf(yaw); pts[j * 3] = C[0] + rr[0] * R; pts[j * 3 + 1] = start.p[1]; pts[j * 3 + 2] = C[2] + rr[2] * R; }
      r = { pts, n, endYaw: start.yaw }; this.center = C;
    } else r = integrate(start, pieces, opt.smooth);
    if (opt.endAt) {   // smooth warp so the end lands exactly on the target (derivative of smoothstep is 0 at the end: tangent kept)
      const e = endOf(r), d = V.sub(opt.endAt, e);
      for (let j = 0; j < r.n; j++) { const w = smooth(0, 1, j / (r.n - 1)); r.pts[j * 3] += d[0] * w; r.pts[j * 3 + 1] += d[1] * w; r.pts[j * 3 + 2] += d[2] * w; }
      this.warp = V.len(d);
    }
    this.pts = r.pts; this.n = r.n; this.len = (r.n - 1) * DS; this.endYaw = r.endYaw; this.pieces = pieces;
    this.T = new Float32Array(this.n * 3); this.R = new Float32Array(this.n * 3); this.U = new Float32Array(this.n * 3);
    for (let j = 0; j < this.n; j++) {
      const a = Math.max(0, j - 1), b = Math.min(this.n - 1, j + 1);
      let t = V.norm([this.pts[b * 3] - this.pts[a * 3], this.pts[b * 3 + 1] - this.pts[a * 3 + 1], this.pts[b * 3 + 2] - this.pts[a * 3 + 2]]);
      if (opt.circle) { const yaw = start.yaw + (j / (this.n - 1)) * TAU; t = fwdOf(yaw); }
      const R = V.norm(V.cross(t, [0, 1, 0])), U = V.cross(R, t);
      this.T.set(t, j * 3); this.R.set(R, j * 3); this.U.set(U, j * 3);
    }
    if (opt.startT) this.T.set(opt.startT, 0);
    this.zones = opt.zones || []; this.base = Object.assign({ cx: 0, cy: 1.35, rx: 2.8, ry: 2.6, fl: -0.26, amp: .62, tint: [.46, .37, .29] }, opt.base || {});
    this.tubeOn = new Uint8Array(this.n);
    this.events = [];
  }
  idx(s) { return clamp(s / DS, 0, this.n - 1); }
  at(s) {   // interpolated frame {p, T, R, U}
    const f = this.idx(s), i = Math.min(this.n - 2, Math.floor(f)), t = f - i, P = this.pts, A = this.T, B = this.R, C = this.U;
    const L = (arr) => V.norm([lerp(arr[i * 3], arr[i * 3 + 3], t), lerp(arr[i * 3 + 1], arr[i * 3 + 4], t), lerp(arr[i * 3 + 2], arr[i * 3 + 5], t)]);
    return { p: [lerp(P[i * 3], P[i * 3 + 3], t), lerp(P[i * 3 + 1], P[i * 3 + 4], t), lerp(P[i * 3 + 2], P[i * 3 + 5], t)], T: L(A), R: L(B), U: L(C) };
  }
  pt(j) { return [this.pts[j * 3], this.pts[j * 3 + 1], this.pts[j * 3 + 2]]; }
  // tunnel profile at s, blended over zone edges (6 m)
  prof(s) {
    const o = Object.assign({}, this.base); o.tint = this.base.tint.slice();
    for (const z of this.zones) {
      const w = smooth(z.s0 - 7, z.s0, s) * (1 - smooth(z.s1, z.s1 + 7, s)); if (w <= 0) continue;
      for (const k of ['cx', 'cy', 'rx', 'ry', 'fl', 'amp']) if (z[k] !== undefined) o[k] = lerp(o[k], z[k], w);
      if (z.tint) for (let c = 0; c < 3; c++) o.tint[c] = lerp(o.tint[c], z.tint[c], w);
    }
    return o;
  }
  // curvature (rad/m, + = left) at s, for camera banking
  curv(s) { const a = this.at(Math.max(0, s - 2)).T, b = this.at(Math.min(this.len, s + 2)).T; return Math.atan2(V.cross(a, b)[1], V.dot(a, b)) / 4; }
}

// chamber: an inward-facing rocky ellipsoid (yawed) with a flat floor; tubes are cut where they meet it
function addChamber(o) {
  const ch = Object.assign({ yaw: 0, amp: .1, floor: -1e9, tint: [.4, .36, .3], cuts: [] }, o);
  ch.fw = fwdOf(ch.yaw); ch.rt = rightOf(ch.yaw); ch.rmax = Math.max(ch.r[0], ch.r[1], ch.r[2]);
  TRACK.chambers.push(ch); return ch;
}
function chLocal(ch, p) { const d = V.sub(p, ch.c); return [V.dot(d, ch.rt) / ch.r[0], d[1] / ch.r[1], V.dot(d, ch.fw) / ch.r[2]]; }
// radial noise scale of the chamber wall in direction dir (unit, local normalized space)
function chWall(ch, dir) {
  const q = V.add(ch.c, V.add(V.add(V.scl(ch.rt, dir[0] * ch.r[0]), [0, dir[1] * ch.r[1], 0]), V.scl(ch.fw, dir[2] * ch.r[2])));
  return 1 + ch.amp * rockN(q[0] * .16, q[1] * .16, q[2] * .16) + ch.amp * .35 * rockN(q[0] * .5 + 9, q[1] * .5, q[2] * .5);
}
function chInside(ch, p, shrink) {
  if (p[1] < ch.floor) return false;
  const l = chLocal(ch, p), d = Math.hypot(l[0], l[1], l[2]);
  if (d > 1.5) return false; if (d < .6) return true;
  return d < chWall(ch, [l[0] / d, l[1] / d, l[2] / d]) * (shrink || 1);
}
function chNorm(ch, p) { const l = chLocal(ch, p); return Math.hypot(l[0], l[1], l[2]); }

// ---------- the level route ----------
function buildTrack() {
  TRACK.segs = {}; TRACK.list = []; TRACK.chambers = []; TRACK.grid = new Map();
  const add = (s) => { TRACK.segs[s.id] = s; TRACK.list.push(s); return s; };
  const startOf = (s) => ({ p: s.pt(s.n - 1), yaw: s.endYaw });
  const TUN = [.46, .37, .29], RIV = [.3, .34, .38], CRY = [.34, .31, .4], SEAM = [.44, .3, .23], NEST = [.44, .42, .37], HOL = [.3, .29, .28];

  // 1. Shaft 9: loading platform, the tip-over, timbered drifts and the old hoist room
  const intro = add(new Seg('intro', 'Shaft 9', { p: [0, 0, 0], yaw: 0 }, [
    { L: 36, turn: 0, drop: 0 }, { L: 26, turn: 0, drop: 5 }, { L: 50, turn: 38, drop: 4 }, { L: 40, turn: 0, drop: 2 },
    { L: 60, turn: -64, drop: 5 }, { L: 62, turn: 0, drop: .8 }, { L: 56, turn: 42, drop: 4 }, { L: 54, turn: -16, drop: 2 }], {
    zones: [{ s0: 0, s1: 34, rx: 4.2, ry: 3.4, cy: 2.0, amp: .25 }, { s0: 120, s1: 160, rx: 2.4, ry: 2.4, amp: .45 }, { s0: 300, s1: 340, rx: 2.5, ry: 2.4 }],
  }));
  { const f = intro.at(244); addChamber({ name: 'hoist', c: V.madd(f.p, [0, 1, 0], 4), yaw: Math.atan2(-f.T[0], -f.T[2]), r: [11, 8.5, 27], floor: f.p[1] - 1.4, amp: .12, tint: [.44, .36, .29] }); }
  const J1 = startOf(intro);
  addChamber({ name: 'J1', c: V.add(V.madd(J1.p, fwdOf(J1.yaw), 13), [0, 2.4, 0]), yaw: J1.yaw, r: [15, 6.6, 19], floor: J1.p[1] - .34, amp: .1, tint: TUN });

  // 2a. Flooded Gallery (left): a long drift, then a trestle across an underground river
  const river = add(new Seg('river', 'Flooded Gallery', J1, [
    { L: 30, turn: 30, drop: 1 }, { L: 50, turn: 0, drop: 9 }, { L: 70, turn: 0, drop: 0 }, { L: 60, turn: -60, drop: 0 }, { L: 150, turn: 0, drop: 0 }, { L: 30, turn: 30, drop: 1 }], {
    zones: [{ s0: 60, s1: 140, rx: 3.0, ry: 2.9, tint: RIV }, { s0: 140, s1: 400, tint: RIV }], base: { tint: TUN },
  }));
  { const f = river.at(276), yaw = Math.atan2(-f.T[0], -f.T[2]); const wy = f.p[1] - 7;
    TRACK.riverCh = addChamber({ name: 'river', c: V.add(V.madd(f.p, f.R, -2.5), [0, -1.5, 0]), yaw, r: [17, 12.5, 70], floor: wy - 3.2, amp: .09, tint: RIV, water: wy }); }
  const M1 = startOf(river);
  // 2b. Deep Seam (right): narrow and twisting, solved to land on the river branch's end
  const seamP = solvePieces(J1, [
    { L: 30, turn: -36, drop: 1.5 }, { L: 150, turn: 0, drop: 3 }, { L: 25, turn: 18, drop: 1 }, { L: 25, turn: -18, drop: 1 }, { L: 66, turn: 72, drop: 2 },
    { L: 120, turn: 0, drop: 3 }, { L: 34, turn: -36, drop: 1 }], 1, 5, M1.p);
  add(new Seg('seam', 'Deep Seam', J1, seamP, { endAt: M1.p, base: { rx: 2.25, ry: 2.3, cy: 1.25, amp: .5, tint: SEAM }, zones: [{ s0: 150, s1: 210, rx: 3.6, ry: 3.2, cy: 1.7, amp: .7 }] }));

  // 3. Crystal cavern (merge chamber) and the drift to the second junction
  addChamber({ name: 'crystal', c: V.add(V.madd(M1.p, fwdOf(M1.yaw), 30), [0, 3.5, 0]), yaw: M1.yaw, r: [31, 17, 58], floor: M1.p[1] - 7.5, amp: .11, tint: CRY });
  const crystal = add(new Seg('crystal', 'Crystal Cavern', M1, [{ L: 92, turn: 0, drop: 1.5 }, { L: 40, turn: 22, drop: 2 }, { L: 60, turn: -44, drop: 4 }, { L: 50, turn: 22, drop: 2 }], { base: { tint: CRY } }));
  const J2 = startOf(crystal);
  addChamber({ name: 'J2', c: V.add(V.madd(J2.p, fwdOf(J2.yaw), 13), [0, 2.4, 0]), yaw: J2.yaw, r: [15, 6.6, 19], floor: J2.p[1] - .34, amp: .1, tint: CRY });

  // 4a. Rockfall Run (left): steep and fast, 4b. Spider Nest (right): webbed and slow (solved)
  const falls = add(new Seg('falls', 'Rockfall Run', J2, [
    { L: 30, turn: 28, drop: 1 }, { L: 110, turn: 0, drop: 13 }, { L: 56, turn: -56, drop: 3 }, { L: 90, turn: 0, drop: 5 }, { L: 30, turn: 28, drop: 0 }], {
    base: { rx: 3.0, ry: 3.3, cy: 1.8, amp: .55, tint: [.4, .35, .3] }, zones: [{ s0: 40, s1: 140, rx: 3.6, ry: 4.4, cy: 2.6 }],
  }));
  const M2 = startOf(falls);
  const nestP = solvePieces(J2, [{ L: 30, turn: -28, drop: 1 }, { L: 80, turn: 0, drop: 6 }, { L: 56, turn: 56, drop: 4 }, { L: 110, turn: 0, drop: 9 }, { L: 30, turn: -28, drop: 2 }], 1, 3, M2.p);
  add(new Seg('nest', 'Spider Nest', J2, nestP, { endAt: M2.p, base: { rx: 3.1, ry: 3.0, cy: 1.6, amp: .45, tint: NEST } }));
  addChamber({ name: 'M2', c: V.add(V.madd(M2.p, fwdOf(M2.yaw), -12), [0, 2.6, 0]), yaw: M2.yaw, r: [15, 7, 19], floor: M2.p[1] - 1.2, amp: .1, tint: HOL });

  // 5. The Sleeper's Hollow: straight run in, a loop around the beast, then the escape climb to daylight
  const hollow = add(new Seg('hollow', "Sleeper's Hollow", M2, [{ L: 52, turn: 0, drop: 3 }, { L: 44, turn: 0, drop: 0 }], { base: { tint: HOL } }));
  const LP = startOf(hollow);
  const loop = add(new Seg('loop', 'The Loop', LP, null, { circle: 24, base: { tint: HOL } }));
  addChamber({ name: 'hollow', c: V.add(loop.center, [0, -2, 0]), yaw: LP.yaw, r: [47, 24, 47], floor: LP.p[1] - 14, amp: .12, tint: HOL, boss: true });
  add(new Seg('exit', 'Daylight', LP, [{ L: 44, turn: 0, drop: 0 }, { L: 70, turn: -30, drop: -5 }, { L: 70, turn: 30, drop: -6 }, { L: 60, turn: 0, drop: -2 }], {
    base: { tint: [.42, .36, .3] }, zones: [{ s0: 200, s1: 260, rx: 3.4, ry: 3.4, cy: 1.8 }],
  }));

  // tube on/off: no tunnel where the centreline sits inside a chamber
  for (const s of TRACK.list) for (let j = 0; j < s.n; j++) {
    const pr = s.prof(j * DS), c = V.madd(s.pt(j), [s.U[j * 3], s.U[j * 3 + 1], s.U[j * 3 + 2]], pr.cy);
    let on = 1; for (const ch of TRACK.chambers) if (chNorm(ch, c) < .9 && c[1] > ch.floor) { on = 0; break; }
    s.tubeOn[j] = on;
  }
  // chamber cuts: a capsule wherever a tunnel crosses the chamber wall
  for (const ch of TRACK.chambers) for (const s of TRACK.list) {
    let prev = null;
    for (let j = 0; j < s.n; j += 2) {
      const pr = s.prof(j * DS), c = V.madd(s.pt(j), [s.U[j * 3], s.U[j * 3 + 1], s.U[j * 3 + 2]], pr.cy), e = chNorm(ch, c) < 1;
      if (prev !== null && e !== prev && s.tubeOn[Math.max(0, e ? j - 2 : j)] | s.tubeOn[j]) {
        const sOut = e ? j * DS - 9 : j * DS + 9, sIn = e ? j * DS + 4 : j * DS - 4;
        const a = s.at(clamp(sIn, 0, s.len)), b = s.at(clamp(sOut, 0, s.len)), pa = s.prof(clamp(sIn, 0, s.len)), pb = s.prof(clamp(sOut, 0, s.len));
        ch.cuts.push({ a: V.madd(a.p, a.U, pa.cy), b: V.madd(b.p, b.U, pb.cy), r: Math.max(pr.rx, pr.ry) * 1.04 + pr.amp, floor: s.pt(j)[1] - .2 });
      }
      prev = e;
    }
  }
  // spatial grid of samples (every 1 m) for nearest-track lookups
  for (const s of TRACK.list) for (let j = 0; j < s.n; j += 2) {
    const k = gkey(s.pts[j * 3], s.pts[j * 3 + 2]); let a = TRACK.grid.get(k); if (!a) TRACK.grid.set(k, a = []); a.push(s, j);
  }
  TRACK.J1 = J1; TRACK.J2 = J2; TRACK.LP = LP; TRACK.M1 = M1; TRACK.M2 = M2;
}
function gkey(x, z) { return (Math.floor(x / TRACK.cell) + 4096) * 8192 + (Math.floor(z / TRACK.cell) + 4096); }
// nearest tunnel sample to p (within ~9 m horizontally and 14 m vertically)
function nearestSample(p) {
  const cx = Math.floor(p[0] / TRACK.cell), cz = Math.floor(p[2] / TRACK.cell); let best = null, bd = 1e9;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const arr = TRACK.grid.get((cx + a + 4096) * 8192 + (cz + b + 4096)); if (!arr) continue;
    for (let k = 0; k < arr.length; k += 2) {
      const s = arr[k], j = arr[k + 1], dx = s.pts[j * 3] - p[0], dy = s.pts[j * 3 + 1] - p[1], dz = s.pts[j * 3 + 2] - p[2];
      if (Math.abs(dy) > 14) continue; const d = dx * dx + dy * dy * 2 + dz * dz; if (d < bd) { bd = d; best = { s, j }; }
    }
  }
  return best;
}
function tubeInside(s, j, p) {
  if (!s.tubeOn[j]) return false;
  const pr = s.prof(j * DS), P = s.pt(j), d = V.sub(p, P);
  const R = [s.R[j * 3], s.R[j * 3 + 1], s.R[j * 3 + 2]], U = [s.U[j * 3], s.U[j * 3 + 1], s.U[j * 3 + 2]];
  const x = V.dot(d, R), y = V.dot(d, U);
  if (y < pr.fl) return false;
  const ex = (x - pr.cx) / pr.rx, ey = (y - pr.cy) / pr.ry, e = Math.hypot(ex, ey);
  if (e < .55) return true;
  const th = Math.atan2(ey, ex), bx = pr.cx + pr.rx * Math.cos(th), by = pr.cy + pr.ry * Math.sin(th);
  const q = V.add(P, V.add(V.scl(R, bx), V.scl(U, by)));
  const disp = pr.amp * rockN(q[0] * .55, q[1] * .55, q[2] * .55), rm = (pr.rx + pr.ry) * .5;
  return e < 1 + disp / rm;
}
function insideWorld(p) {
  for (const ch of TRACK.chambers) if (V.dist2(p, ch.c) < (ch.rmax * 1.3) ** 2 && chInside(ch, p)) return true;
  const ns = nearestSample(p); if (!ns) return false;
  return tubeInside(ns.s, ns.j, p);
}
// march a ray through the cave union; returns distance to the wall (or maxT)
function rayWall(o, d, maxT, step) {
  step = step || .7; let t = 0, last = 0;
  if (!insideWorld(o)) return 0;
  while (t < maxT) { t += step; if (!insideWorld(V.madd(o, d, t))) { let a = last, b = t; for (let k = 0; k < 6; k++) { const m = (a + b) / 2; if (insideWorld(V.madd(o, d, m))) a = m; else b = m; } return (a + b) / 2; } last = t; }
  return maxT;
}
// is p over water in the river cavern? returns water y or null
function waterAt(p) { const ch = TRACK.riverCh; if (!ch) return null; const l = chLocal(ch, p); return (l[0] * l[0] + l[2] * l[2] < 1) ? ch.water : null; }
