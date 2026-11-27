// ===== Cave geometry: tunnel tubes, chambers, rails and sleepers, timber sets, trestles, static props =====
const WORLD = { rock: [], rails: [], statics: new Map(), glowStatic: [], worms: [] };
const SCELL = 36;
function skey(p) { return Math.floor(p[0] / SCELL) + ',' + Math.floor(p[1] / SCELL) + ',' + Math.floor(p[2] / SCELL); }
// static instanced props, bucketed by 36 m cells for culling
function sAdd(prim, F, sx, sy, sz, col, emi) {
  const k = skey(F.p); let c = WORLD.statics.get(k);
  if (!c) { c = { key: k, c: [(Math.floor(F.p[0] / SCELL) + .5) * SCELL, (Math.floor(F.p[1] / SCELL) + .5) * SCELL, (Math.floor(F.p[2] / SCELL) + .5) * SCELL], r: SCELL * .9, b: new Map() }; WORLD.statics.set(k, c); }
  let b = c.b.get(prim); if (!b) { b = new Batch(PRIM[prim], 64, false); c.b.set(prim, b); }
  b.add(F, sx, sy, sz, col, emi);
}
function sSeg(prim, a, b, r, col, emi, rz) {
  const d = V.sub(b, a), L = V.len(d) || 1e-3, y = V.scl(d, 1 / L); let x = V.cross(y, [0, 1, 0]); if (V.len(x) < 1e-3) x = V.cross(y, [1, 0, 0]); x = V.norm(x); const z = V.cross(x, y);
  const leg = prim === 'leg' || prim === 'cone' || prim === 'shard';
  sAdd(prim, { p: leg ? a : V.lerp(a, b, .5), x, y, z }, r, L, rz || r, col, emi);
}
const WOOD = [.36, .25, .16, .25], WOOD_D = [.25, .18, .12, .25], IRON = [.3, .29, .28, .5], RUST = [.38, .24, .16, .5];

function orientInward(mb, ref, refIdx) {
  // make sure triangles face the cave interior (front faces visible from inside)
  const i = mb.i, p = mb.p; const a = i[0] * 3, b = i[1] * 3, c = i[2] * 3;
  const n = V.cross([p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]], [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]]);
  const toIn = V.sub(ref, [p[refIdx * 3], p[refIdx * 3 + 1], p[refIdx * 3 + 2]]);
  if (V.dot(n, toIn) < 0) for (let k = 0; k < i.length; k += 3) { const t = i[k + 1]; i[k + 1] = i[k + 2]; i[k + 2] = t; }
}

function buildTube(s) {
  const NR = 30, step = 2, CH = 80;   // rings every 1 m, chunks of 40 m
  for (let j0 = 0; j0 < s.n - 1; j0 += CH) {
    const j1 = Math.min(s.n - 1, j0 + CH);
    let any = false; for (let j = j0; j <= j1; j++) if (s.tubeOn[j]) { any = true; break; }
    if (!any) continue;
    const mb = new MB(), rings = []; let cen = [0, 0, 0], cn = 0, rmax = 0;
    for (let j = j0; j <= j1; j += step) {
      const pr = s.prof(j * DS), P = s.pt(j), R = [s.R[j * 3], s.R[j * 3 + 1], s.R[j * 3 + 2]], U = [s.U[j * 3], s.U[j * 3 + 1], s.U[j * 3 + 2]];
      const base = mb.count; rings.push({ j, base, on: s.tubeOn[j] });
      const ctr = V.madd(P, U, pr.cy); cen = V.add(cen, ctr); cn++; rmax = Math.max(rmax, pr.rx, pr.ry);
      for (let k = 0; k < NR; k++) {
        const th = -Math.PI / 2 + k / NR * TAU, ct = Math.cos(th), st = Math.sin(th);
        let ex = pr.cx + pr.rx * ct, ey = pr.cy + pr.ry * st, flo = false;
        if (ey < pr.fl) { ey = pr.fl; flo = true; }
        const q = V.add(P, V.add(V.scl(R, ex), V.scl(U, ey)));
        const qb = V.add(P, V.add(V.scl(R, pr.cx + pr.rx * ct), V.scl(U, pr.cy + pr.ry * st)));
        let d = pr.amp * rockN(qb[0] * .55, qb[1] * .55, qb[2] * .55);
        let n2 = flo ? [0, -1] : (() => { const a = ct / pr.rx, b = st / pr.ry, l = Math.hypot(a, b); return [a / l, b / l]; })();
        if (flo) d = .05 * rockN(q[0] * 2, q[1] * 2, q[2] * 2) - .02;
        const out = V.add(V.scl(R, n2[0]), V.scl(U, n2[1]));
        const v = V.madd(q, out, d);
        const tv = .82 + .36 * vnoise(q[0] * .21, q[1] * .21, q[2] * .21);
        let ao = 1 - Math.max(0, d) / Math.max(pr.amp, .05) * .38; if (!flo && ey - pr.fl < .7) ao *= .72; if (flo) ao *= .8;
        mb.v(v, null, [pr.tint[0] * tv, pr.tint[1] * tv, pr.tint[2] * tv * (flo ? .9 : 1), clamp(ao, .3, 1)]);
      }
    }
    for (let r = 0; r < rings.length - 1; r++) {
      const A = rings[r], B = rings[r + 1]; if (!A.on && !B.on) continue;
      for (let k = 0; k < NR; k++) { const k2 = (k + 1) % NR; mb.quad(A.base + k, A.base + k2, B.base + k2, B.base + k); }
    }
    if (!mb.i.length) continue;
    cen = V.scl(cen, 1 / cn);
    const r0 = rings[Math.floor(mb.i[0] / NR)], pr0 = s.prof(r0.j * DS);
    orientInward(mb, V.madd(s.pt(r0.j), [s.U[r0.j * 3], s.U[r0.j * 3 + 1], s.U[r0.j * 3 + 2]], pr0.cy), mb.i[0]);
    mb.calcNormals();
    let rad = 0; for (const rg of rings) rad = Math.max(rad, V.dist(s.pt(rg.j), cen)); rad += rmax + 1;
    const ells = TRACK.chambers.filter(ch => V.dist(ch.c, cen) < ch.rmax * 1.15 + rad).slice(0, 3);
    WORLD.rock.push({ mesh: mb.build(), c: cen, r: rad, ells, cuts: [], seg: s.id });
  }
}

function buildChamber(ch) {
  const NU = ch.r[0] > 25 ? 96 : 72, NV = ch.r[1] > 14 ? 52 : 40, mb = new MB();
  for (let v = 0; v <= NV; v++) {
    const ph = -Math.PI / 2 + v / NV * Math.PI;
    for (let u = 0; u < NU; u++) {
      const la = u / NU * TAU, dir = [Math.cos(ph) * Math.cos(la), Math.sin(ph), Math.cos(ph) * Math.sin(la)];
      const sc = chWall(ch, dir);
      let p = V.add(ch.c, V.add(V.add(V.scl(ch.rt, dir[0] * ch.r[0] * sc), [0, dir[1] * ch.r[1] * sc, 0]), V.scl(ch.fw, dir[2] * ch.r[2] * sc)));
      let flo = false;
      if (p[1] < ch.floor) { p[1] = ch.floor + .12 * rockN(p[0] * .8, 0, p[2] * .8) * (ch.water !== undefined ? 6 : 1); flo = true; }
      const tv = .8 + .4 * vnoise(p[0] * .13, p[1] * .13, p[2] * .13);
      const ao = clamp(1 - (sc - 1) / Math.max(ch.amp, .01) * .4, .35, 1) * (flo ? .85 : 1);
      mb.v(p, null, [ch.tint[0] * tv, ch.tint[1] * tv, ch.tint[2] * tv, ao]);
    }
  }
  for (let v = 0; v < NV; v++) for (let u = 0; u < NU; u++) { const u2 = (u + 1) % NU, a = v * NU + u, b = v * NU + u2, c = (v + 1) * NU + u2, d = (v + 1) * NU + u; mb.quad(a, b, c, d); }
  // pick a reference vertex on the equator for the winding check
  const ref = (NV >> 1) * NU; const tmpI = mb.i.slice(); mb.i = [ref, ref + 1, ref + NU + 1].concat(tmpI);
  orientInward(mb, ch.c, ref); const flip = mb.i[1] !== ref + 1; mb.i = tmpI; if (flip) for (let k = 0; k < mb.i.length; k += 3) { const t = mb.i[k + 1]; mb.i[k + 1] = mb.i[k + 2]; mb.i[k + 2] = t; }
  mb.calcNormals();
  WORLD.rock.push({ mesh: mb.build(), c: ch.c, r: ch.rmax * 1.25, ells: [], cuts: ch.cuts.slice(0, 6), ch });
  // stalactites and stalagmites
  const R = makeRng(ch.name.length * 977 + 13), N = Math.round(ch.r[0] * ch.r[2] / 14);
  for (let i = 0; i < N; i++) {
    const la = R() * TAU, rr = Math.sqrt(R()) * .85;
    const lx = Math.cos(la) * rr, lz = Math.sin(la) * rr, up = R() < .65;
    const lyMag = Math.sqrt(Math.max(0, 1 - lx * lx - lz * lz));
    const dir = V.norm([lx, up ? lyMag : -lyMag, lz]), sc = chWall(ch, dir) * .97;
    let p = V.add(ch.c, V.add(V.add(V.scl(ch.rt, dir[0] * ch.r[0] * sc), [0, dir[1] * ch.r[1] * sc, 0]), V.scl(ch.fw, dir[2] * ch.r[2] * sc)));
    if (!up && p[1] < ch.floor) p[1] = ch.floor;
    if (!up && ch.water !== undefined) continue;
    if (nearTrack(p, 3.2)) continue;
    const h = up ? R.range(1, 4.5) : R.range(.8, 3), w = h * R.range(.12, .22), col = [ch.tint[0] * 1.1, ch.tint[1] * 1.08, ch.tint[2] * 1.05, 0];
    sAdd('cone', { p, x: [1, 0, 0], y: [0, up ? -1 : 1, 0], z: [0, 0, up ? -1 : 1] }, w, h, w, col);
  }
}
function nearTrack(p, d) { const ns = nearestSample(p); if (!ns) return false; const P = ns.s.pt(ns.j); return Math.hypot(p[0] - P[0], p[2] - P[2]) < d && p[1] > P[1] - 2 && p[1] < P[1] + 4.5; }
function floorBelow(p) { let f = -1e9; for (const ch of TRACK.chambers) if (chNorm(ch, p) < 1.05) f = Math.max(f, ch.water !== undefined ? ch.water : ch.floor); return f; }

function buildRails(s) {
  const CH = 80;
  for (let j0 = 0; j0 < s.n - 1; j0 += CH) {
    const j1 = Math.min(s.n - 1, j0 + CH), mb = new MB();
    const steel = [.42, .4, .38, .5], steelTop = [.62, .6, .58, .5];
    for (const side of [-1, 1]) {
      let prev = null;
      for (let j = j0; j <= j1; j++) {
        const P = s.pt(j), R = [s.R[j * 3], s.R[j * 3 + 1], s.R[j * 3 + 2]], U = [s.U[j * 3], s.U[j * 3 + 1], s.U[j * 3 + 2]];
        const c = V.madd(P, R, side * .56);
        const pts = [V.madd(V.madd(c, R, -.035), U, -.11), V.madd(V.madd(c, R, -.035), U, 0), V.madd(V.madd(c, R, .035), U, 0), V.madd(V.madd(c, R, .035), U, -.11)];
        const nr = [V.scl(R, -1), U, U, R];
        const ids = [mb.v(pts[0], nr[0], steel), mb.v(pts[1], nr[0], steel), mb.v(pts[1], U, steelTop), mb.v(pts[2], U, steelTop), mb.v(pts[2], nr[3], steel), mb.v(pts[3], nr[3], steel)];
        if (prev) { mb.quad(prev[0], ids[0], ids[1], prev[1]); mb.quad(prev[2], ids[2], ids[3], prev[3]); mb.quad(prev[4], ids[4], ids[5], prev[5]); }
        prev = ids;
      }
    }
    // fix winding so the rail faces point outward: test one top quad against U
    { const i = mb.i, p = mb.p, a = i[3] * 3, b = i[4] * 3, c = i[5] * 3; const n = V.cross([p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]], [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]]);
      if (n[1] < 0) for (let k = 0; k < i.length; k += 3) { const t = i[k + 1]; i[k + 1] = i[k + 2]; i[k + 2] = t; } }
    const cen = s.pt((j0 + j1) >> 1);
    WORLD.rails.push({ mesh: mb.build(), c: cen, r: (j1 - j0) * DS * .6 + 2 });
  }
  // sleepers, plus trestle bents where the floor drops away
  const R = makeRng(s.id.length * 31 + 7);
  for (let sd = 0.4; sd < s.len; sd += .78) {
    const f = s.at(sd), F = { p: V.madd(f.p, f.U, -.17), x: f.R, y: f.U, z: f.T };
    const t = R(), col = t < .1 ? WOOD_D : [WOOD[0] * (0.85 + t * .3), WOOD[1] * (0.85 + t * .3), WOOD[2], .25];
    sAdd('box', fmove(frot(F, 'y', (R() - .5) * .06), 0, 0, 0), 1.62, .12, .22, col);
  }
  for (let sd = 1; sd < s.len; sd += 3.2) {
    const f = s.at(sd), fy = floorBelow(f.p);
    if (fy < f.p[1] - .9) {
      const top = V.madd(f.p, f.U, -.24);
      for (const side of [-1, 1]) {
        const a = V.madd(top, f.R, side * .78), b = [a[0] + f.R[0] * side * .5, fy - .3, a[2] + f.R[2] * side * .5];
        sSeg('box', a, b, .2, WOOD_D, null, .2);
      }
      sAdd('box', { p: V.madd(top, f.U, -.06), x: f.R, y: f.U, z: f.T }, 1.9, .16, .2, WOOD_D);
      if (f.p[1] - fy > 3) { // cross brace
        const a = V.madd(V.madd(top, f.R, -.9), f.U, -.5), b = [top[0] + f.R[0] * 1.1, Math.max(fy, f.p[1] - 5), top[2] + f.R[2] * 1.1];
        sSeg('box', a, b, .1, WOOD_D, null, .1);
      }
      for (const side of [-1, 1]) { const a = V.madd(V.madd(top, f.R, side * .62), f.U, -.04); sSeg('box', a, V.madd(a, f.T, 3.2), .14, WOOD, null, .12); }
    }
  }
}

// timber sets every few metres in tunnels: two posts, a cap beam, sometimes broken
function buildTimbers(s, every, from, to, brokenP) {
  const R = makeRng(s.id.length * 101 + (from | 0));
  for (let sd = from; sd < to; sd += every * R.range(.85, 1.15)) {
    const j = Math.round(s.idx(sd)); if (!s.tubeOn[j]) continue;
    const f = s.at(sd), pr = s.prof(sd); if (pr.rx > 3.9) continue;
    const capY = Math.min(pr.cy + pr.ry * .62, 2.9), px = Math.min(pr.rx * .74, 1.75), broken = R() < (brokenP || 0);
    const F = { p: f.p, x: f.R, y: f.U, z: f.T };
    for (const side of [-1, 1]) {
      if (broken && side === 1) continue;
      const a = fpt(F, side * (px + .12), pr.fl, 0), b = fpt(F, side * px, capY, 0);
      sSeg('box', a, b, .2, WOOD, null, .2);
    }
    const tilt = broken ? .35 : 0;
    const cap = frot({ p: fpt(F, broken ? -.4 : 0, capY + .1 - (broken ? .45 : 0), 0), x: f.R, y: f.U, z: f.T }, 'z', tilt);
    sAdd('box', cap, px * 2 + .5, .22, .24, WOOD);
    if (R() < .3) sAdd('box', fmove(F, 0, capY + .3, 0), px * 2 - .2, .06, 1.2 + R() * 1.4, WOOD_D);   // lagging boards
  }
}

function buildWorldGeometry() {
  for (const r of WORLD.rock) freeMesh(r.mesh); for (const r of WORLD.rails) freeMesh(r.mesh);
  for (const c of WORLD.statics.values()) for (const b of c.b.values()) b.free();
  WORLD.rock = []; WORLD.rails = []; WORLD.statics = new Map(); WORLD.worms = [];
  for (const s of TRACK.list) { buildTube(s); buildRails(s); }
  for (const ch of TRACK.chambers) buildChamber(ch);
  const T = TRACK.segs;
  buildTimbers(T.intro, 4.2, 40, 212, .05); buildTimbers(T.intro, 4.4, 272, T.intro.len, .08);
  buildTimbers(T.river, 4.6, 34, 200, .12); buildTimbers(T.river, 5, 360, T.river.len, .1);
  buildTimbers(T.seam, 3.6, 30, T.seam.len, .2);
  buildTimbers(T.crystal, 5, 95, T.crystal.len, .05);
  buildTimbers(T.falls, 5.5, 20, T.falls.len, .35);
  buildTimbers(T.nest, 5, 20, T.nest.len, .15);
  buildTimbers(T.hollow, 5, 4, 50, .2);
  buildTimbers(T.exit, 4.5, 46, T.exit.len, .1);
  // glow worms on the river cavern ceiling and in the hollow
  for (const ch of TRACK.chambers) {
    if (ch.name !== 'river' && ch.name !== 'hollow' && ch.name !== 'crystal') continue;
    const R = makeRng(ch.name.length * 53), N = ch.name === 'river' ? 520 : ch.name === 'crystal' ? 160 : 260;
    for (let i = 0; i < N; i++) {
      const la = R() * TAU, ph = R.range(.15, 1.25), dir = [Math.cos(ph) * Math.cos(la), Math.sin(ph), Math.cos(ph) * Math.sin(la)];
      const sc = chWall(ch, dir) * .985;
      const p = V.add(ch.c, V.add(V.add(V.scl(ch.rt, dir[0] * ch.r[0] * sc), [0, dir[1] * ch.r[1] * sc, 0]), V.scl(ch.fw, dir[2] * ch.r[2] * sc)));
      WORLD.worms.push({ p, ph: R() * TAU, k: ch.name === 'crystal' ? 1 : 0, s: R.range(.03, .07) });
    }
  }
  // the crystal cavern: clusters of small glowing shards over the walls and floor (set dressing, not targets)
  { const ch = TRACK.chambers.find(c => c.name === 'crystal'), R = makeRng(31337);
    for (let i = 0; i < 80; i++) {
      const la = R() * TAU, ph = R.range(-1.1, 1.2), dir = [Math.cos(ph) * Math.cos(la), Math.sin(ph), Math.cos(ph) * Math.sin(la)];
      const sc = chWall(ch, dir) * .99;
      let p = V.add(ch.c, V.add(V.add(V.scl(ch.rt, dir[0] * ch.r[0] * sc), [0, dir[1] * ch.r[1] * sc, 0]), V.scl(ch.fw, dir[2] * ch.r[2] * sc)));
      if (p[1] < ch.floor) p[1] = ch.floor;
      if (nearTrack(p, 3)) continue;
      const n = V.norm(V.sub(ch.c, p)), col = CRYSTAL_COLS[R.int(0, CRYSTAL_COLS.length - 1)], k = R.int(4, 8), sz = R.range(.8, 2.2), e = R.range(.25, .6);
      WORLD.worms.push({ p: V.madd(p, n, sz * .5), ph: R() * TAU, k: 2, s: sz * 1.4, col });
      for (let j = 0; j < k; j++) { const d = V.norm(V.add(n, [R.range(-.6, .6), R.range(-.4, .6), R.range(-.6, .6)])); sAdd('shard', frameLookUp(V.add(p, [R.range(-.3, .3) * sz, 0, R.range(-.3, .3) * sz]), d), sz * R.range(.1, .2), sz * R.range(.5, 1.3), sz * R.range(.1, .2), [col[0] * .6, col[1] * .6, col[2] * .6, 1], [col[0] * e, col[1] * e, col[2] * e]); }
    }
  }
  // soft fill lights for the big caverns: glow-worm ceilings, crystal walls, the Sleeper's glow
  for (const ch of TRACK.chambers) {
    ch.fill = [];
    const col = ch.name === 'river' ? [.25, .7, .65] : ch.name === 'crystal' ? [.5, .35, .9] : ch.name === 'hollow' ? [.3, .55, .5] : null; if (!col) continue;
    ch.mood = ch.name === 'river' ? { amb: [.006, .02, .022], fog: [.002, .0065, .0075], den: .0095 } : ch.name === 'crystal' ? { amb: [.016, .01, .027], fog: [.0045, .0025, .0075], den: .009 } : { amb: [.012, .015, .012], fog: [.004, .0045, .0035], den: .011 };
    const n = ch.name === 'river' ? 4 : 3;
    for (let i = 0; i < n; i++) { const z = (i / (n - 1) - .5) * 1.2; ch.fill.push({ p: V.add(V.add(ch.c, V.scl(ch.fw, z * ch.r[2])), [0, ch.r[1] * .2, 0]), col, I: ch.name === 'crystal' ? 5 : ch.name === 'river' ? 2.4 : 3.4, range: ch.rmax * 1.1 }); }
  }
  for (const c of WORLD.statics.values()) for (const b of c.b.values()) b.upload();
}
