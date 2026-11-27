// ===== Level content: lamps, crystals, braziers, levers, crates, lurking eyes, triggers, set dressing =====
// Everything is placed from track frames with a fixed seed, so the ride is the same every time (an on-rails game should be learnable).
const LV = { lamps: [], levers: [], crates: [], lurkers: [], webs: [], eggs: [], trig: {}, peepTotal: 0 };
const LAMP_KIND = {
  lantern: { col: [1, .6, .28], I: 13, range: 13, safe: 9, score: 50, hitR: .42 },
  oil: { col: [1, .52, .22], I: 17, range: 15, safe: 10.5, score: 75, hitR: .45 },
  crystal: { col: [.4, .9, 1], I: 34, range: 21, safe: 12, score: 100, hitR: .9 },
  brazier: { col: [1, .48, .18], I: 48, range: 28, safe: 18, score: 150, hitR: .9 },
  sun: { col: [1, .93, .8], I: 160, range: 60, safe: 30, score: 0, hitR: 0 },
};
const CRYSTAL_COLS = [[.35, .85, 1], [.75, .4, 1], [.4, 1, .55], [1, .66, .3], [1, .4, .7]];

function wallAt(seg, s, angDeg, inset) {
  const f = seg.at(s), pr = seg.prof(s), c = V.madd(f.p, f.U, Math.max(pr.cy, 1.2));
  const a = angDeg * DEG, d = V.norm(V.add(V.scl(f.R, Math.cos(a)), V.scl(f.U, Math.sin(a))));
  const t = rayWall(c, d, 40, .35);
  return { p: V.madd(c, d, Math.max(.3, t - (inset || 0))), n: V.scl(d, -1), f, wallT: t };
}
function trackPt(seg, s, x, y) { const f = seg.at(s); return V.add(f.p, V.add(V.scl(f.R, x), V.scl(f.U, y))); }
function addTrig(seg, s, fn) { (LV.trig[seg.id] = LV.trig[seg.id] || []).push({ s, fn, done: false }); }

function addLamp(kind, seg, s, p, extra) {
  const K = LAMP_KIND[kind];
  const L = Object.assign({ id: LV.lamps.length, kind, seg: seg.id, s, p, col: K.col.slice(), I: K.I, range: K.range, safe: K.safe, score: K.score, hitR: K.hitR, lit: false, litT: -9, ph: rnd() * TAU }, extra || {});
  LV.lamps.push(L); return L;
}
function lantern(seg, s, side, lit) {
  const w = wallAt(seg, s, side > 0 ? 34 : 146, .05);
  const inward = V.norm([-w.n[0] * -1, 0, -w.n[2] * -1]); // n points into the cave
  const arm = V.madd(w.p, V.norm([w.n[0], 0, w.n[2]]), .45);
  const p = V.add(arm, [0, -.42, 0]);
  return addLamp('lantern', seg, s, p, { wall: w.p, arm, lit: !!lit, preLit: !!lit });
}
function oilLamp(seg, s, side) {
  const f = seg.at(s), pr = seg.prof(s);
  const x = side * Math.min(pr.rx * .62, 1.6), base = V.add(f.p, V.add(V.scl(f.R, x), V.scl(f.U, pr.fl)));
  let fy = floorBelow(base); const b2 = fy > -1e8 && fy < base[1] - .4 ? [base[0], fy, base[2]] : base;
  return addLamp('oil', seg, s, V.add(base, [0, 1.75, 0]), { base: b2, side });
}
function crystal(seg, s, p, n, ci, size) {
  const col = CRYSTAL_COLS[ci % CRYSTAL_COLS.length];
  const R = makeRng(LV.lamps.length * 17 + 5), shards = [], k = R.int(4, 7);
  for (let i = 0; i < k; i++) {
    const d = V.norm(V.add(n, [R.range(-.7, .7), R.range(-.5, .7), R.range(-.7, .7)]));
    shards.push({ d, h: size * R.range(.55, 1.25), w: size * R.range(.12, .22), o: [R.range(-.3, .3) * size, 0, R.range(-.3, .3) * size] });
  }
  return addLamp('crystal', seg, s, V.madd(p, n, size * .6), { col: col.slice(), base: p, n, shards, size, hitR: size * .95 });
}
function brazier(seg, p) { return addLamp('brazier', seg, 0, V.add(p, [0, 1.25, 0]), { base: p }); }
function lever(seg, s, junction, names) {
  const f = seg.at(s), base = V.add(f.p, V.add(V.scl(f.R, 1.75), V.scl(f.U, -.25)));
  const L = { junction, seg: seg.id, s, base, f, names, state: 0, cool: 0, ang: -.6, hitR: .55, p: V.add(base, [0, 1.25, 0]) };
  LV.levers.push(L); return L;
}
function crate(seg, s, side, kind) {
  const f = seg.at(s), pr = seg.prof(s), x = side * Math.min(pr.rx * .55, 1.55);
  let p = V.add(f.p, V.add(V.scl(f.R, x), V.scl(f.U, pr.fl + .32)));
  const fy = floorBelow(p); if (fy > -1e8 && fy < p[1] - .5) p = V.add(f.p, V.add(V.scl(f.R, side * 1.15), V.scl(f.U, -.02)));
  LV.crates.push({ seg: seg.id, s, p, f, kind, alive: true, hitR: .5 });
}
// eyes in the dark. type: peeper (harmless critter), bat, spider, burrower. where: ceil, wall, floor, water
function lurk(seg, s, where, side, type) {
  let ang = where === 'ceil' ? 90 + side * 22 : where === 'floor' ? (side > 0 ? -12 : 192) : (side > 0 ? 10 : 170);
  let w = wallAt(seg, s, ang, .12);
  if (where === 'water') { const f = seg.at(s), wy = TRACK.riverCh.water; w = { p: [f.p[0] + f.R[0] * side * 5, wy + .25, f.p[2] + f.R[2] * side * 5], n: [0, 1, 0], f }; }
  const L = { seg: seg.id, s, where, type, p: w.p, n: w.n, f: w.f, state: 'wait', blink: rnd() * 5, sep: type === 'burrower' ? .28 : type === 'spider' ? .1 : type === 'bat' ? .07 : .09, hitR: .38, gone: 0 };
  if (type === 'peeper') LV.peepTotal++;
  LV.lurkers.push(L); return L;
}
function web(seg, s) { const f = seg.at(s), pr = seg.prof(s); LV.webs.push({ seg: seg.id, s, f, c: V.madd(f.p, f.U, pr.cy * .9), r: Math.max(pr.rx, pr.ry) * 1.02, hp: 2, alive: true, rot: rnd() * TAU }); }

// set dressing (static instances)
function scaffold(seg, s, side, h, deck) {
  const f = seg.at(s), pr = seg.prof(s), x = side * (pr.rx * .7), F = { p: f.p, x: f.R, y: f.U, z: f.T };
  const fy = floorBelow(f.p), y0 = fy > -1e8 ? Math.min(pr.fl, fy - f.p[1]) : pr.fl;
  for (const dz of [-1.4, 1.4]) for (const dx of [0, side * 1.6]) sSeg('box', fpt(F, x + dx, y0, dz), fpt(F, x + dx, h, dz), .16, WOOD_D, null, .16);
  for (const yy of deck || [h * .5, h]) {
    sAdd('box', fmove(F, x + side * .8, yy, 0), 2.1, .1, 3.2, WOOD);
    sSeg('box', fpt(F, x, yy - 1.2, -1.4), fpt(F, x + side * 1.6, yy, -1.4), .07, WOOD_D, null, .07);
  }
}
function barrel(p, tint) { sAdd('cyl', { p: V.add(p, [0, .45, 0]), x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, .32, .9, .32, tint || [.33, .22, .13, .25]); sAdd('cyl', { p: V.add(p, [0, .7, 0]), x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, .335, .06, .335, IRON); }
function oldCart(seg, s, side) {
  const f = seg.at(s), F = frot({ p: trackPt(seg, s, side * 1.9, .1), x: f.R, y: f.U, z: f.T }, 'z', side * .5);
  sAdd('box', fmove(F, 0, .45, 0), 1.1, .7, 1.5, RUST); sAdd('box', fmove(F, 0, .82, 0), 1.0, .08, 1.4, [.12, .1, .09, 0]);
  for (const dz of [-.5, .5]) for (const dx of [-.5, .5]) sAdd('cyl', frot(fmove(F, dx, .12, dz), 'z', Math.PI / 2), .2, .1, .2, IRON);
}
function sign(seg, s, side) { const f = seg.at(s), F = { p: trackPt(seg, s, side * 2.1, 1.7), x: f.R, y: f.U, z: f.T }; sAdd('box', F, .08, .7, 1.3, [.42, .3, .18, .25]); sAdd('box', fmove(F, 0, -.9, 0), .08, 1.2, .1, WOOD_D); }

function buildLevel() {
  Object.assign(LV, { lamps: [], levers: [], crates: [], lurkers: [], webs: [], eggs: [], trig: {}, peepTotal: 0 });
  rnd = makeRng(9091);
  const T = TRACK.segs;
  // ---------- 1. Shaft 9 ----------
  { const S = T.intro;
    lantern(S, 5, -1, true); lantern(S, 17, 1, true); lantern(S, 31, -1); lantern(S, 47, 1);
    for (let s = 62, i = 0; s < 210; s += 25, i++) lantern(S, s, i % 2 ? 1 : -1);
    for (let s = 280, i = 0; s < 380; s += 26, i++) lantern(S, s, i % 2 ? -1 : 1);
    oilLamp(S, 112, 1); oilLamp(S, 182, -1); oilLamp(S, 334, 1);
    // loading platform dressing
    for (let s = 2; s < 32; s += 3.2) { const f = S.at(s); sAdd('box', { p: trackPt(S, s, -2.4, -.05), x: f.R, y: f.U, z: f.T }, 1.8, .14, 3.1, WOOD); }
    barrel(trackPt(S, 8, -2.7, .02)); barrel(trackPt(S, 9.2, -3.1, .02)); barrel(trackPt(S, 22, -2.6, .02), [.3, .2, .12, .25]);
    sign(S, 26, 1); oldCart(S, 12, 1);
    // hoist room: scaffolds, oil lamps on the decks, a collapsing tower
    scaffold(S, 226, -1, 5.2); scaffold(S, 252, 1, 5.6);
    const hl = [oilLamp(S, 224, -1), oilLamp(S, 241, 1), oilLamp(S, 262, -1)]; hl[0].p = V.add(hl[0].p, [0, 0, 0]);
    crate(S, 246, -1, 'flare'); crate(S, 318, 1, 'health');
    lurk(S, 74, 'wall', -1, 'peeper'); lurk(S, 79, 'wall', 1, 'peeper'); lurk(S, 86, 'ceil', -1, 'peeper'); lurk(S, 93, 'floor', 1, 'peeper');
    lurk(S, 128, 'wall', 1, 'bat'); lurk(S, 150, 'ceil', 1, 'spider'); lurk(S, 166, 'ceil', -1, 'spider'); lurk(S, 140, 'wall', -1, 'peeper');
    lurk(S, 198, 'wall', 1, 'peeper'); lurk(S, 205, 'floor', -1, 'peeper');
    lurk(S, 236, 'wall', 1, 'spider'); lurk(S, 284, 'wall', -1, 'bat'); lurk(S, 296, 'ceil', 1, 'peeper');
    lurk(S, 338, 'wall', -1, 'burrower'); lurk(S, 352, 'wall', 1, 'peeper'); lurk(S, 300, 'floor', 1, 'peeper');
    addTrig(S, 12, () => banner('SHOOT THE LANTERNS TO LIGHT THE WAY', 3.2));
    addTrig(S, 56, () => banner(TOUCH ? 'EYES IN THE DARK — TAP FLARE TO LIGHT THEM UP' : 'EYES IN THE DARK — RIGHT-CLICK FOR A FLARE', 3.6));
    addTrig(S, 100, () => spawnSwarm(S, 128, 8));
    addTrig(S, 226 - 26, () => spawnBeam(S, 231, -1));
    addTrig(S, 262, () => spawnSwarm(S, 290, 12));
    addTrig(S, 300 - 22, () => spawnRock(S, 302, 0, false));
    addTrig(S, 360 - 22, () => spawnRock(S, 362, .5, true));
    addTrig(S, 300, () => banner('JUNCTION AHEAD — SHOOT THE LEVER TO PICK A TUNNEL', 3.4));
    lever(S, S.len - 16, 'A', ['FLOODED GALLERY', 'DEEP SEAM']);
  }
  // ---------- 2a. Flooded Gallery ----------
  { const S = T.river;
    for (let s = 22, i = 0; s < 196; s += 26, i++) lantern(S, s, i % 2 ? -1 : 1);
    for (let s = 214, i = 0; s < 350; s += 28, i++) { const f = S.at(s), side = i % 2 ? 1 : -1; const p = trackPt(S, s, side * 1.25, 1.95); addLamp('lantern', S, s, p, { post: trackPt(S, s, side * 1.05, -.2), arm: trackPt(S, s, side * 1.25, 2.35) }); }
    oilLamp(S, 64, -1); oilLamp(S, 150, 1); oilLamp(S, 372, 1);
    crate(S, 128, 1, 'flare'); crate(S, 270, -1, 'health');
    lurk(S, 60, 'ceil', 1, 'spider'); lurk(S, 82, 'wall', -1, 'peeper'); lurk(S, 108, 'wall', 1, 'spider'); lurk(S, 120, 'floor', -1, 'peeper');
    lurk(S, 152, 'wall', -1, 'burrower'); lurk(S, 176, 'ceil', 1, 'peeper');
    lurk(S, 238, 'water', 1, 'burrower'); lurk(S, 318, 'water', -1, 'burrower'); lurk(S, 262, 'wall', -1, 'peeper'); lurk(S, 300, 'wall', 1, 'peeper');
    lurk(S, 382, 'wall', 1, 'spider');
    addTrig(S, 6, () => banner('THE FLOODED GALLERY', 2.4, true));
    addTrig(S, 180 - 22, () => spawnRock(S, 182, -.4, false));
    addTrig(S, 214, () => spawnSwarm(S, 252, 16));
    addTrig(S, 254, () => spawnDropper(S, 278, -1)); addTrig(S, 290, () => spawnDropper(S, 312, 1));
    addTrig(S, 292 - 24, () => spawnBeam(S, 296, 1));
    addTrig(S, 318, () => spawnSwarm(S, 350, 10));
  }
  // ---------- 2b. Deep Seam ----------
  { const S = T.seam;
    for (let s = 24, i = 0; s < S.len - 10; s += 40, i++) lantern(S, s, i % 2 ? 1 : -1);
    for (let s = 44; s < S.len - 10; s += 80) oilLamp(S, s, s % 160 < 80 ? 1 : -1);
    crate(S, 150, -1, 'flare'); crate(S, 286, 1, 'health');
    const types = [['wall', 1, 'burrower'], ['ceil', -1, 'spider'], ['wall', -1, 'peeper'], ['floor', 1, 'burrower'], ['ceil', 1, 'spider'], ['wall', 1, 'bat'], ['wall', -1, 'burrower'], ['floor', -1, 'peeper']];
    for (let s = 52, i = 0; s < S.len - 12; s += 23, i++) { const t = types[i % types.length]; lurk(S, s, t[0], t[1], t[2]); }
    addTrig(S, 6, () => banner('THE DEEP SEAM', 2.4, true));
    for (const s of [100, 172, 262, 352]) addTrig(S, s - 20, () => spawnRock(S, s, rnd.range(-.5, .5), s % 3 === 0));
    addTrig(S, 200, () => spawnBeam(S, 222, 1));
  }
  // ---------- 3. Crystal Cavern ----------
  { const S = T.crystal, ch = TRACK.chambers.find(c => c.name === 'crystal'); const R = makeRng(4242);
    let ci = 0;
    for (let i = 0; i < 16; i++) {
      // a point on the chamber wall, kept within shooting range of the trestle
      const s0 = -20 + i * 7.2, f = S.at(clamp(s0, 0, 90)), side = i % 2 ? 1 : -1;
      const ang = side > 0 ? R.range(-25, 75) : R.range(105, 205);
      let base = clamp(s0, 0, 90); const w = wallAt(S, base, ang, .1);
      if (w.wallT < 5 || w.wallT > 26) continue;
      crystal(S, base, w.p, w.n, ci++, R.range(.9, 1.7));
    }
    for (let s = 112, i = 0; s < S.len - 6; s += 27, i++) lantern(S, s, i % 2 ? 1 : -1);
    crate(S, 140, 1, 'health');
    lurk(S, 30, 'wall', 1, 'spider'); lurk(S, 46, 'ceil', -1, 'bat'); lurk(S, 62, 'wall', -1, 'spider'); lurk(S, 80, 'wall', 1, 'peeper');
    lurk(S, 150, 'wall', -1, 'burrower'); lurk(S, 190, 'ceil', 1, 'spider'); lurk(S, 214, 'wall', 1, 'peeper');
    addTrig(S, 2, () => banner('THE CRYSTAL CAVERN — LIGHT THE CRYSTALS', 3, true));
    addTrig(S, 8, () => spawnSwarm(S, 40, 14));
    addTrig(S, 48 - 18, () => spawnRock(S, 50, .6, false, 'crystal')); addTrig(S, 80 - 18, () => spawnRock(S, 82, -.6, true, 'crystal'));
    addTrig(S, 60, () => spawnSwarm(S, 92, 10));
    addTrig(S, 182, () => banner('JUNCTION AHEAD — SHOOT THE LEVER', 3));
    lever(S, S.len - 16, 'B', ['ROCKFALL RUN', 'SPIDER NEST']);
  }
  // ---------- 4a. Rockfall Run ----------
  { const S = T.falls;
    for (let s = 18, i = 0; s < S.len - 8; s += 30, i++) lantern(S, s, i % 2 ? 1 : -1);
    oilLamp(S, 72, -1); oilLamp(S, 182, 1); oilLamp(S, 282, -1);
    crate(S, 140, -1, 'health'); crate(S, 236, 1, 'flare');
    lurk(S, 64, 'wall', 1, 'peeper'); lurk(S, 120, 'wall', -1, 'bat'); lurk(S, 170, 'ceil', 1, 'spider'); lurk(S, 214, 'wall', 1, 'burrower'); lurk(S, 262, 'floor', -1, 'peeper'); lurk(S, 292, 'wall', -1, 'spider');
    addTrig(S, 6, () => banner('ROCKFALL RUN', 2.4, true));
    for (const [s, x, big] of [[34, 0, false], [58, .5, true], [82, -.5, false], [106, .3, true], [130, -.2, false], [204, .4, true], [252, -.4, false], [276, 0, true]]) addTrig(S, s - 24, () => spawnRock(S, s, x, big));
    addTrig(S, 90, () => spawnSwarm(S, 122, 12));
    addTrig(S, 160 - 26, () => spawnBeam(S, 162, -1)); addTrig(S, 230 - 26, () => spawnBeam(S, 232, 1));
  }
  // ---------- 4b. Spider Nest ----------
  { const S = T.nest;
    for (let s = 20, i = 0; s < S.len - 8; s += 32, i++) lantern(S, s, i % 2 ? 1 : -1);
    oilLamp(S, 100, 1); oilLamp(S, 250, -1);
    crate(S, 120, 1, 'flare'); crate(S, 200, -1, 'health');
    for (const s of [42, 92, 142, 192, 242]) web(S, s);
    const R = makeRng(777);
    for (let i = 0; i < 9; i++) { const s = 24 + i * 32 + R.range(0, 8), w = wallAt(S, s, R.range(20, 160), .2); LV.eggs.push({ seg: S.id, s, p: w.p, n: w.n, alive: true, hitR: .45, k: R.int(3, 5) }); }
    for (const [s, w, sd, t] of [[34, 'ceil', 1, 'spider'], [70, 'wall', -1, 'spider'], [112, 'ceil', -1, 'spider'], [158, 'wall', 1, 'spider'], [206, 'ceil', 1, 'spider'], [226, 'wall', -1, 'peeper'], [268, 'ceil', -1, 'spider'], [290, 'wall', 1, 'burrower']]) lurk(S, s, w, sd, t);
    addTrig(S, 6, () => banner('THE SPIDER NEST — SHOOT THE WEBS', 2.6, true));
    for (const s of [58, 128, 182, 236]) addTrig(S, s - 22, () => spawnDropper(S, s, rnd() < .5 ? -1 : 1));
    addTrig(S, 150, () => spawnSwarm(S, 182, 8));
  }
  // ---------- 5. Sleeper's Hollow + loop + exit ----------
  { const S = T.hollow, Lp = T.loop;
    lantern(S, 10, -1); lantern(S, 32, 1);
    lurk(S, 18, 'wall', 1, 'peeper'); lurk(S, 24, 'wall', -1, 'peeper'); lurk(S, 38, 'ceil', 1, 'peeper'); lurk(S, 44, 'wall', -1, 'peeper');
    addTrig(S, 30, () => banner("THE SLEEPER'S HOLLOW", 2.6, true));
    // braziers on rock ledges just outside the loop
    for (let i = 0; i < 8; i++) {
      const s = (i + .5) / 8 * Lp.len, f = Lp.at(s), p = V.add(f.p, V.add(V.scl(f.R, 3.2), V.scl(f.U, -.3)));
      sAdd('box', { p: V.add(p, [0, -2.2, 0]), x: f.R, y: [0, 1, 0], z: f.T }, 2.2, 4.4, 2.2, [.28, .26, .24, 0]);
      brazier(Lp, p).s = s;
    }
    crate(Lp, 38, 1, 'health'); crate(Lp, 112, 1, 'flare');
    const X = T.exit;
    for (let s = 60, i = 0; s < X.len - 30; s += 30, i++) lantern(X, s, i % 2 ? 1 : -1);
    addLamp('sun', X, X.len, V.add(X.at(X.len).p, V.add(V.scl(X.at(X.len).T, 16), [0, 2, 0])), { lit: true, preLit: true });
    for (const [s, x, big] of [[56, 0, false], [84, .4, true], [112, -.4, false], [140, .2, true], [176, -.3, false], [206, .3, false]]) addTrig(X, s - 22, () => { if (G.bossDead) spawnRock(X, s, x, big); });
    addTrig(X, 20, () => { if (G.bossDead) spawnSwarm(X, 50, 16, true); });
  }
  for (const k in LV.trig) LV.trig[k].sort((a, b) => a.s - b.s);
}
