// ===== Species: rigs, signed-distance bodies, paint, darts needed, weak spots, armour =====
// Regions (vertex colour alpha): 0 skin, 1 belly, 2 claw/horn, 3 teeth, 4 mouth, 5 crest/frill, 6 membrane
const cone = (a, b, ra, rb, bone, o = {}) => Object.assign({ t: 'cone', a, b, ra, rb, bone }, o);
const ell = (c, r, bone, o = {}) => Object.assign({ t: 'ell', c, r, bone }, o);
const mz = p => [p[0], p[1], -p[2]];
const add2 = (p, d, s) => [p[0] + d[0] * s, p[1] + d[1] * s, p[2] + (d[2] || 0) * s];
function painter(o) {
  return (p, n, pr) => {
    const reg = (pr && pr.reg) || 0;
    if (reg === 2) return [...(o.horn || [0.82, 0.78, 0.66]), 2];
    if (reg === 3) return [0.9, 0.86, 0.74, 3];
    if (pr && pr.mouth && ((pr.mouth > 0 && n[1] < -0.35) || (pr.mouth < 0 && n[1] > 0.35))) return [0.45, 0.15, 0.14, 4];
    const up = n[1];
    let c = mix3(o.belly, o.back, smooth(-0.55, 0.3, up));
    if (o.stripeAmt) {
      const st = Math.sin(p[0] * o.stripeF + vnoise(p[0] * 2.3, p[2] * 2.3 + p[1] * 2.1) * 1.6 + Math.abs(p[2]) * (o.chevron || 0));
      c = mix3(c, o.stripe, smooth(0.25, 0.75, st) * smooth(-0.2, 0.55, up) * o.stripeAmt * (o.stripeMaxX ? 1 - smooth(o.stripeMaxX - 0.15, o.stripeMaxX, p[0]) : 1));
    }
    if (o.spotAmt) {
      const sp = vnoise(p[0] * o.spotF + 3, p[1] * o.spotF + p[2] * o.spotF * 0.7);
      c = mix3(c, o.spot, smooth(0.35, 0.55, sp) * smooth(-0.3, 0.4, up) * o.spotAmt);
    }
    if (reg === 5) {
      const b = Math.sin((p[0] * 5 + p[1] * 7) * (o.crestF || 1));
      c = mix3(o.crest, o.crest2 || o.crest, smooth(-0.2, 0.4, b));
      return [...c, 5];
    }
    if (reg === 6) { const vein = Math.abs(Math.sin(p[2] * 9 + p[0] * 3)); c = mix3(o.membrane, [o.membrane[0] * 0.6, o.membrane[1] * 0.5, o.membrane[2] * 0.45], smooth(0.9, 1, vein) * 0.6); return [...c, 6]; }
    c = mix3(c, o.dark || [0.1, 0.1, 0.1], (o.darkMask ? o.darkMask(p, n) : 0));
    return [...c, up < -0.4 ? 1 : 0];
  };
}

// ---------- theropod builder (raptor, crestrunner, boss) ----------
function theropod(o) {
  const rig = new Rig(), P = [];
  const H = o.hipY;
  const pel = [0, H, 0], chest = [o.torsoL, H + o.torsoRise, 0];
  rig.add('pelvis', null, pel); rig.add('chest', 'pelvis', chest);
  const nb = [o.torsoL + o.torsoR1 * 0.4, chest[1] + o.torsoR1 * 0.2, 0];
  const nt = [nb[0] + o.neckL * Math.cos(o.neckA), nb[1] + o.neckL * Math.sin(o.neckA), 0];
  rig.add('neck', 'chest', nb); rig.add('head', 'neck', nt);
  const hd = [Math.cos(-o.headTilt), Math.sin(-o.headTilt), 0];
  const jawJ = add2(add2(nt, hd, o.headL * 0.22), [0, -1, 0], o.headR * 0.42);
  rig.add('jaw', 'head', jawJ);
  // tail
  const tp = o.tail; let prev = 'pelvis';
  for (let i = 0; i < 4; i++) { rig.add('tail' + i, prev, [tp[i][0], tp[i][1], 0]); prev = 'tail' + i; }
  // legs
  const Le = H / (0.37 * Math.cos(0.42) + 0.39 * Math.cos(0.5) + 0.24 * Math.cos(0.26)) * 0.97;
  const legs = {};
  for (const side of ['L', 'R']) {
    const z = (side === 'R' ? 1 : -1) * o.legZ;
    const hip = [o.hipX || 0, H - o.pelvisR[1] * 0.3, z];
    const knee = [hip[0] + Math.sin(0.42) * Le * 0.37, hip[1] - Math.cos(0.42) * Le * 0.37, z * 1.06];
    const ankle = [knee[0] - Math.sin(0.5) * Le * 0.39, knee[1] - Math.cos(0.5) * Le * 0.39, z * 1.06];
    const ball = [ankle[0] + Math.sin(0.26) * Le * 0.24, Math.max(o.toeR, ankle[1] - Math.cos(0.26) * Le * 0.24), z * 1.04];
    rig.add('thigh' + side, 'pelvis', hip); rig.add('shin' + side, 'thigh' + side, knee); rig.add('foot' + side, 'shin' + side, ankle); rig.add('toe' + side, 'foot' + side, ball);
    legs[side] = { hip, knee, ankle, ball };
    const sh = [o.torsoL * 0.85, H + o.torsoRise * 0.8 - o.torsoR1 * 0.55, z * 0.9];
    const el = [sh[0] + o.armL * 0.25, sh[1] - o.armL * 0.5, z * 1.1];
    rig.add('arm' + side, 'chest', sh); rig.add('fore' + side, 'arm' + side, el);
    legs[side].sh = sh; legs[side].el = el;
  }
  const B = n => rig.b(n);
  // body
  P.push(ell([0, H, 0], o.pelvisR, B('pelvis')));
  P.push(cone([0.05 * H, H, 0], [o.torsoL * 0.55, H + o.torsoRise * 0.5, 0], o.torsoR0, (o.torsoR0 + o.torsoR1) * 0.5, B('pelvis')));
  P.push(cone([o.torsoL * 0.5, H + o.torsoRise * 0.5, 0], chest, (o.torsoR0 + o.torsoR1) * 0.5, o.torsoR1, B('chest')));
  P.push(ell([o.torsoL * 0.45, H - o.torsoR0 * 0.25, 0], [o.torsoL * 0.55, o.torsoR0 * 0.8, o.torsoR0 * 0.82], B('pelvis'), { reg: 1 }));
  // neck
  const nm = V.lerp(nb, nt, 0.5);
  P.push(cone(V.lerp(nb, chest, 0.4), nm, o.neckR0, (o.neckR0 + o.neckR1) * 0.5, B('neck')));
  P.push(cone(nm, nt, (o.neckR0 + o.neckR1) * 0.5, o.neckR1, B('neck')));
  if (o.throat) P.push(ell(add2(V.lerp(nm, nt, 0.6), [o.throat.fx || 0.2, -1, 0], o.neckR1 * 0.55), [o.neckR1 * 1.1, o.neckR1 * 0.9, o.neckR1 * 0.85], B('neck'), { weak: 1, reg: 1 }));
  // head
  const sk0 = add2(nt, hd, -o.headR * 0.3), sk1 = add2(nt, hd, o.headL * 0.6), tip = add2(nt, hd, o.headL);
  P.push(cone(sk0, sk1, o.headR, o.snoutR, B('head'), { weak: o.headWeak ? 1 : 0, mouth: 1, sigma: o.headR * 0.25 }));
  P.push(cone(sk1, tip, o.snoutR, o.snoutR * 0.55, B('head'), { weak: o.headWeak ? 1 : 0, mouth: 1, sigma: o.headR * 0.25 }));
  if (o.brow) P.push(ell(add2(add2(nt, hd, o.headL * 0.25), [0, 1, 0], o.headR * 0.45), [o.headL * 0.3, o.headR * 0.4, o.headR * 0.85], B('head'), { weak: o.headWeak ? 1 : 0 }));
  const jt = add2(add2(tip, hd, -o.headL * 0.06), [0, -1, 0], o.snoutR * 0.55);
  P.push(cone(add2(jawJ, hd, o.headR * 0.1), jt, o.jawR, o.jawR * 0.5, B('jaw'), { k: o.headR * 0.08, mouth: -1, sigma: o.headR * 0.2, weak: o.headWeak ? 1 : 0 }));
  if (o.teeth) {
    for (let i = 0; i < o.teeth; i++) {
      const t = 0.18 + 0.78 * i / (o.teeth - 1); for (const s of [1, -1]) {
        const base = add2(V.lerp(add2(nt, hd, o.headL * 0.12), tip, t), [0, -1, 0], o.snoutR * lerp(0.95, 0.5, t)); base[2] = s * o.snoutR * lerp(0.75, 0.42, t);
        P.push(cone(base, [base[0], base[1] - o.headR * 0.22, base[2]], o.headR * 0.045, o.headR * 0.008, B('head'), { reg: 3, k: 0.005 }));
      }
    }
  }
  // tail
  let tprev = [-0.05 * H, H, 0], rprev = o.pelvisR[1] * 0.95;
  for (let i = 0; i < 4; i++) { const tt = [tp[i + 1][0], tp[i + 1][1], 0]; P.push(cone(tprev, tt, rprev, tp[i + 1][2], B('tail' + i))); tprev = tt; rprev = tp[i + 1][2]; }
  // legs and arms
  for (const side of ['L', 'R']) {
    const L = legs[side];
    P.push(cone(L.hip, L.knee, o.legR, o.legR * 0.6, B('thigh' + side)));
    P.push(ell(V.lerp(L.hip, L.knee, 0.3), [o.legR * 1.25, o.legR * 1.1, o.legR * 0.85], B('thigh' + side)));
    P.push(cone(L.knee, L.ankle, o.legR * 0.55, o.legR * 0.33, B('shin' + side)));
    P.push(cone(L.ankle, L.ball, o.legR * 0.3, o.legR * 0.26, B('foot' + side)));
    for (const dz of [-1, 0, 1]) {
      const tt = [L.ball[0] + o.toeL * (dz ? 0.85 : 1), o.toeR * 0.6, L.ball[2] + dz * o.toeL * 0.32];
      P.push(cone(L.ball, tt, o.toeR, o.toeR * 0.55, B('toe' + side)));
      P.push(cone(tt, [tt[0] + o.toeL * 0.25, 0.01, tt[2]], o.toeR * 0.5, o.toeR * 0.12, B('toe' + side), { reg: 2, k: 0.01 }));
    }
    if (o.sickle) { const b = [L.ball[0] + o.toeL * 0.1, o.toeR * 1.3, L.ball[2] - Math.sign(L.ball[2]) * o.toeR * 0.6]; P.push(cone(b, [b[0] + o.toeL * 0.45, b[1] + o.toeL * 0.35, b[2]], o.toeR * 0.55, o.toeR * 0.1, B('toe' + side), { reg: 2, k: 0.008 })); }
    const hand = [L.el[0] + o.armL * 0.4, L.el[1] - o.armL * 0.15, L.el[2]];
    P.push(cone(L.sh, L.el, o.armR, o.armR * 0.75, B('arm' + side)));
    P.push(cone(L.el, hand, o.armR * 0.7, o.armR * 0.45, B('fore' + side)));
    for (const dy of [-1, 1]) P.push(cone(hand, [hand[0] + o.armL * 0.22, hand[1] - o.armL * 0.12 + dy * o.armR * 0.4, hand[2]], o.armR * 0.3, o.armR * 0.06, B('fore' + side), { reg: 2, k: 0.006 }));
  }
  const eye = add2(add2(nt, hd, o.headL * 0.2), [0, 1, 0], o.headR * 0.32); eye[2] = o.headR * 0.78;
  const sp = { rig, bones: rig.bones, prims: P, eye: [eye[0], eye[1], eye[2], o.headR * o.eyeR], K: o.K, sigma: o.sigma, kind: 'biped', o };
  if (o.extras) o.extras(sp, P, rig, { nt, hd, tip, nb, chest, H });
  return sp;
}

// ---------- quadruped builder (hornback, long-neck) ----------
function quadruped(o) {
  const rig = new Rig(), P = [];
  const H = o.hipY, F = o.chestX;
  rig.add('pelvis', null, [0, H, 0]); rig.add('chest', 'pelvis', [F, o.chestY, 0]);
  const np = o.neck; let prev = 'chest';
  for (let i = 0; i < np.length - 1; i++) { rig.add('neck' + i, prev, [np[i][0], np[i][1], 0]); prev = 'neck' + i; }
  const hj = np[np.length - 1]; rig.add('head', prev, [hj[0], hj[1], 0]);
  const hd = [Math.cos(-o.headTilt), Math.sin(-o.headTilt), 0];
  const tip = add2([hj[0], hj[1], 0], hd, o.headL);
  const jawJ = add2(add2([hj[0], hj[1], 0], hd, o.headL * 0.25), [0, -1, 0], o.headR * 0.4); rig.add('jaw', 'head', jawJ);
  const tp = o.tail; prev = 'pelvis';
  for (let i = 0; i < tp.length - 1; i++) { rig.add('tail' + i, prev, [tp[i][0], tp[i][1], 0]); prev = 'tail' + i; }
  const legs = {};
  for (const [key, x, top] of [['F', F + o.frontX, o.chestY - o.bodyR[1] * 0.35], ['B', o.backX, H - o.bodyR[1] * 0.3]]) for (const side of ['L', 'R']) {
    const z = (side === 'R' ? 1 : -1) * o.legZ; const up = [x, top, z]; const ll = top - o.footR;
    const kneeDir = key === 'F' ? -1 : 1;
    const knee = [x + kneeDir * ll * 0.08, top - ll * 0.5, z * 1.03]; const foot = [x, o.footR, z * 1.03];
    const n = key + side; rig.add('up' + n, key === 'F' ? 'chest' : 'pelvis', up); rig.add('lo' + n, 'up' + n, knee); rig.add('ft' + n, 'lo' + n, foot);
    legs[n] = { up, knee, foot, r: key === 'F' ? o.legRF : o.legRB };
  }
  const B = n => rig.b(n);
  P.push(ell([o.bodyC0, H, 0], o.bodyR, B('pelvis')));
  P.push(ell([F * 0.85, o.chestY, 0], o.chestR, B('chest')));
  P.push(ell([F * 0.45, (H + o.chestY) * 0.5 - o.bodyR[1] * 0.3, 0], [F * 0.75, o.bodyR[1] * 0.8, o.bodyR[2] * 0.95], B('pelvis'), { reg: 1 }));
  let pp = [F * 0.9, o.chestY + o.chestR[1] * 0.2, 0], pr = o.neckR[0];
  for (let i = 0; i < np.length - 1; i++) { const q = [np[i + 1][0], np[i + 1][1], 0]; const r = lerp(o.neckR[0], o.neckR[1], (i + 1) / (np.length - 1)); P.push(cone(pp, q, pr, r, B('neck' + i), { weak: o.neckWeak && i === np.length - 2 ? 1 : 0 })); pp = q; pr = r; }
  const sk0 = add2([hj[0], hj[1], 0], hd, -o.headR * 0.2), sk1 = add2([hj[0], hj[1], 0], hd, o.headL * 0.6);
  P.push(cone(sk0, sk1, o.headR, o.snoutR, B('head'), { weak: 1, mouth: 1, sigma: o.headR * 0.25 }));
  P.push(cone(sk1, tip, o.snoutR, o.snoutR * 0.6, B('head'), { weak: 1, mouth: 1, sigma: o.headR * 0.25 }));
  const jt = add2(add2(tip, hd, -o.headL * 0.1), [0, -1, 0], o.snoutR * 0.5);
  P.push(cone(add2(jawJ, hd, o.headR * 0.1), jt, o.jawR, o.jawR * 0.5, B('jaw'), { k: o.headR * 0.08, mouth: -1, sigma: o.headR * 0.2, weak: 1 }));
  let tprev = [o.bodyC0 - o.bodyR[0] * 0.6, H, 0], tr = o.tailR0;
  for (let i = 0; i < tp.length - 1; i++) { const q = [tp[i + 1][0], tp[i + 1][1], 0]; P.push(cone(tprev, q, tr, tp[i + 1][2], B('tail' + i))); tprev = q; tr = tp[i + 1][2]; }
  for (const n in legs) {
    const L = legs[n];
    P.push(cone(L.up, L.knee, L.r, L.r * 0.78, B('up' + n)));
    if (n[0] === 'B') P.push(ell(V.lerp(L.up, L.knee, 0.25), [L.r * 1.5, L.r * 1.3, L.r * 1.0], B('up' + n)));
    P.push(cone(L.knee, [L.foot[0], L.foot[1] + o.footR * 0.6, L.foot[2]], L.r * 0.74, L.r * 0.66, B('lo' + n)));
    P.push(ell([L.foot[0] + o.footR * 0.2, o.footR * 0.75, L.foot[2]], [o.footR * 1.25, o.footR * 0.75, o.footR * 1.15], B('ft' + n)));
    for (const dz of [-1, 0, 1]) P.push(cone([L.foot[0] + o.footR * 0.9, o.footR * 0.35, L.foot[2] + dz * o.footR * 0.55], [L.foot[0] + o.footR * 1.3, o.footR * 0.18, L.foot[2] + dz * o.footR * 0.65], o.footR * 0.3, o.footR * 0.15, B('ft' + n), { reg: 2, k: 0.02 }));
  }
  const eye = add2(add2([hj[0], hj[1], 0], hd, o.headL * 0.22), [0, 1, 0], o.headR * 0.32); eye[2] = o.headR * 0.8;
  const sp = { rig, bones: rig.bones, prims: P, eye: [eye[0], eye[1], eye[2], o.headR * o.eyeR], K: o.K, sigma: o.sigma, kind: 'quad', o };
  if (o.extras) o.extras(sp, P, rig, { hj, hd, tip });
  return sp;
}

// ---------- pterosaur (explicit wing membranes appended to the surface-nets mesh) ----------
function pterosaur(o) {
  const rig = new Rig(), P = [];
  rig.add('body', null, [0, 0, 0]); rig.add('neck', 'body', [0.28, 0.05, 0]); rig.add('head', 'neck', [0.55, 0.22, 0]); rig.add('jaw', 'head', [0.62, 0.17, 0]);
  const W = {};
  for (const side of ['L', 'R']) {
    const s = side === 'R' ? 1 : -1;
    const sh = [0.18, 0.1, 0.11 * s], el = [0.28, 0.12, 0.62 * s], wr = [0.33, 0.12, 1.15 * s], tip = [0.02, 0.06, 2.45 * s];
    rig.add('up' + side, 'body', sh); rig.add('fo' + side, 'up' + side, el); rig.add('fi' + side, 'fo' + side, wr);
    rig.add('leg' + side, 'body', [-0.22, -0.06, 0.1 * s]);
    W[side] = { sh, el, wr, tip, s };
  }
  rig.add('tail', 'body', [-0.32, 0, 0]);
  const B = n => rig.b(n);
  P.push(ell([0, 0, 0], [0.3, 0.14, 0.13], B('body')));
  P.push(ell([0.05, -0.06, 0], [0.24, 0.12, 0.13], B('body'), { reg: 1 }));
  P.push(cone([0.22, 0.06, 0], [0.55, 0.22, 0], 0.085, 0.055, B('neck')));
  P.push(cone([0.5, 0.25, 0], [0.82, 0.2, 0], 0.075, 0.045, B('head'), { weak: 1, mouth: 1, sigma: 0.02 }));
  P.push(cone([0.82, 0.2, 0], [1.22, 0.13, 0], 0.045, 0.008, B('head'), { weak: 1, mouth: 1, sigma: 0.02, reg: 2 }));
  P.push(cone([0.62, 0.16, 0], [1.15, 0.1, 0], 0.035, 0.006, B('jaw'), { k: 0.008, mouth: -1, sigma: 0.015, reg: 2 }));
  P.push(ell([0.47, 0.36, 0], [0.19, 0.08, 0.016], B('head'), { ax: [-0.6, 0.8, 0], reg: 5, k: 0.03, weak: 1 }));
  P.push(cone([-0.3, 0, 0], [-0.55, -0.02, 0], 0.05, 0.01, B('tail')));
  for (const side of ['L', 'R']) {
    const w = W[side];
    P.push(cone(w.sh, w.el, 0.05, 0.035, B('up' + side)));
    P.push(cone(w.el, w.wr, 0.032, 0.026, B('fo' + side)));
    P.push(cone(w.wr, w.tip, 0.022, 0.006, B('fi' + side)));
    P.push(cone(w.wr, [w.wr[0] + 0.1, w.wr[1], w.wr[2] - 0.04 * w.s], 0.018, 0.004, B('fi' + side), { reg: 2, k: 0.005 }));
    P.push(cone([-0.2, -0.08, 0.1 * w.s], [-0.42, -0.14, 0.16 * w.s], 0.04, 0.02, B('leg' + side)));
  }
  const sp = { rig, bones: rig.bones, prims: P, eye: [0.62, 0.27, 0.06, 0.028], K: 0.035, sigma: 0.03, kind: 'ptero', o };
  sp.extraMesh = () => {
    const pos = [], nrm = [], bones = [], col = [], tris = [];
    const NU = 22, NV = 7;
    for (const side of ['L', 'R']) {
      const w = W[side], s = w.s; const chain = [[0.16, 0.02, 0.1 * s], w.sh, w.el, w.wr, w.tip]; const segL = []; let tot = 0;
      for (let i = 1; i < chain.length; i++) { const l = V.dist(chain[i - 1], chain[i]); segL.push(l); tot += l; }
      const LE = u => { let d = u * tot; for (let i = 0; i < segL.length; i++) { if (d <= segL[i] || i === segL.length - 1) return { p: V.lerp(chain[i], chain[i + 1], clamp(d / segL[i], 0, 1)), seg: i, t: clamp(d / segL[i], 0, 1) }; d -= segL[i]; } };
      const hip = [-0.38, -0.1, 0.17 * s];
      const TE = u => { const base = V.lerp(hip, w.tip, Math.pow(u, 0.85)); const sc = Math.sin(u * Math.PI) * 0.42; return [base[0] + sc * 0.9, base[1] + sc * 0.05, base[2]]; };
      const b0 = pos.length / 3; const CH = [B('body'), B('up' + side), B('fo' + side), B('fi' + side)];
      for (let i = 0; i <= NU; i++) {
        const u = i / NU; const le = LE(u); const te = TE(u);
        for (let j = 0; j <= NV; j++) {
          const v = j / NV; const p = V.lerp(le.p, te, v); p[1] += Math.sin(v * Math.PI) * 0.035 * (1 - u * 0.5);
          pos.push(...p); nrm.push(0, 1, 0);
          let bA = CH[le.seg], bB = CH[Math.max(0, le.seg - 1)], wA = 0.5 + 0.5 * smooth(0, 0.45, le.t);
          if (le.seg === 0) { bA = CH[1]; bB = CH[0]; wA = le.t * 0.5; }
          // trailing edge near the body follows the body
          const bodyPull = v * (1 - smooth(0.05, 0.45, u));
          if (bodyPull > 0.05 && bB !== CH[0]) { bB = CH[0]; wA = Math.max(0.3, 1 - bodyPull); }
          else if (bB === CH[0]) wA = wA * (1 - bodyPull * 0.6);
          bones.push(bA, bB, wA);
          const memb = o.membrane; const vein = Math.abs(Math.sin(u * 26)); const dk = smooth(0.92, 1, vein) * 0.25 + v * 0.1;
          col.push(memb[0] * (1 - dk), memb[1] * (1 - dk * 1.1), memb[2] * (1 - dk * 1.2));
        }
      }
      for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
        const a = b0 + i * (NV + 1) + j, b = a + NV + 1;
        if (s > 0) tris.push(a, b, a + 1, a + 1, b, b + 1); else tris.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    return { pos, nrm, bones, col, reg: 6, tris };
  };
  return sp;
}

// ---------- the cast ----------
const SPECIES = {};
function defineSpecies() {
  SPECIES.raptor = theropod({
    hipY: 0.84, pelvisR: [0.27, 0.2, 0.16], torsoL: 0.46, torsoRise: 0.1, torsoR0: 0.19, torsoR1: 0.15, neckL: 0.36, neckA: 1.05, neckR0: 0.1, neckR1: 0.065,
    headL: 0.42, headR: 0.085, snoutR: 0.055, headTilt: 0.12, jawR: 0.045, eyeR: 0.3, brow: 1, teeth: 0, headWeak: 1,
    tail: [[-0.2, 0.9], [-0.6, 0.9, 0.11], [-1.0, 0.86, 0.07], [-1.4, 0.82, 0.04], [-1.78, 0.78, 0.015]],
    legZ: 0.13, legR: 0.12, toeL: 0.13, toeR: 0.028, sickle: 1, armL: 0.32, armR: 0.035, K: 0.05, sigma: 0.05,
    extras(sp, P, rig, g) { for (let i = 0; i < 7; i++) { const x = 0.55 - i * 0.22; const y = 1.06 - Math.abs(x - 0.1) * 0.12; P.push(cone([x, y, 0], [x - 0.05, y + 0.09, 0], 0.02, 0.004, rig.b(i < 3 ? 'chest' : 'pelvis'), { reg: 5, k: 0.015 })); }
      P.push(cone(add2(g.nt, [0, 1, 0], 0.07), add2(add2(g.nt, [-1, 0, 0], 0.14), [0, 1, 0], 0.13), 0.025, 0.006, rig.b('head'), { reg: 5, k: 0.02 })); },
  });
  Object.assign(SPECIES.raptor, { id: 'raptor', name: 'Raptor', need: 1, score: 100, cell: 0.026, lodCell: 0.05, eyeCol: [0.95, 0.62, 0.12], scale: 34,
    paint: painter({ back: [0.45, 0.38, 0.22], belly: [0.82, 0.76, 0.6], stripe: [0.2, 0.14, 0.09], stripeF: 13, stripeAmt: 0.85, chevron: 6, stripeMaxX: 0.62, crest: [0.72, 0.25, 0.12], crest2: [0.3, 0.2, 0.12], horn: [0.25, 0.22, 0.2] }) });

  SPECIES.runner = theropod({
    hipY: 1.22, pelvisR: [0.36, 0.28, 0.22], torsoL: 0.62, torsoRise: 0.12, torsoR0: 0.27, torsoR1: 0.2, neckL: 0.62, neckA: 1.12, neckR0: 0.13, neckR1: 0.07,
    headL: 0.4, headR: 0.09, snoutR: 0.06, headTilt: 0.35, jawR: 0.05, eyeR: 0.32, brow: 0, headWeak: 1,
    tail: [[-0.3, 1.28], [-0.85, 1.28, 0.15], [-1.4, 1.22, 0.1], [-1.95, 1.14, 0.055], [-2.45, 1.06, 0.02]],
    legZ: 0.18, legR: 0.16, toeL: 0.16, toeR: 0.035, armL: 0.42, armR: 0.045, K: 0.07, sigma: 0.07,
    extras(sp, P, rig, g) { P.push(ell(add2(add2(g.nt, [-1, 0, 0], 0.12), [0, 1, 0], 0.17), [0.26, 0.09, 0.025], rig.b('head'), { ax: [-0.75, 0.66, 0], reg: 5, k: 0.03, weak: 1 })); },
  });
  Object.assign(SPECIES.runner, { id: 'runner', name: 'Crestrunner', need: 2, score: 80, cell: 0.035, lodCell: 0.07, eyeCol: [0.35, 0.22, 0.1], scale: 18,
    paint: painter({ back: [0.32, 0.43, 0.36], belly: [0.8, 0.79, 0.66], spot: [0.15, 0.22, 0.18], spotF: 6, spotAmt: 0.85, crest: [0.85, 0.42, 0.12], crest2: [0.95, 0.8, 0.3], crestF: 2, horn: [0.3, 0.3, 0.25] }) });

  SPECIES.boss = theropod({
    hipY: 3.7, pelvisR: [1.25, 1.0, 0.85], torsoL: 2.1, torsoRise: 0.35, torsoR0: 1.0, torsoR1: 0.85, neckL: 1.2, neckA: 0.75, neckR0: 0.62, neckR1: 0.5,
    headL: 2.0, headR: 0.55, snoutR: 0.42, headTilt: 0.18, jawR: 0.36, eyeR: 0.2, brow: 1, teeth: 9, throat: { fx: 0.3 }, headWeak: 0,
    tail: [[-1.0, 3.9], [-2.6, 3.85, 0.62], [-4.3, 3.6, 0.4], [-6.0, 3.3, 0.22], [-7.6, 3.0, 0.08]],
    legZ: 0.62, legR: 0.62, toeL: 0.62, toeR: 0.15, armL: 0.75, armR: 0.11, K: 0.25, sigma: 0.24, hipX: 0.1,
    extras(sp, P, rig, g) {
      for (let i = 0; i < 12; i++) { const x = 2.4 - i * 0.62; const y = (x > 0 ? 4.62 + x * 0.1 : 4.6 + x * 0.1) - Math.max(0, x - 1.6) * 0.15; const b = x > 1.2 ? 'neck' : x > 0.6 ? 'chest' : x > -1 ? 'pelvis' : 'tail0';
        P.push(cone([x, y - 0.1, 0], [x - 0.25, y + 0.38 - i * 0.012, 0], 0.13, 0.02, rig.b(b), { reg: 5, k: 0.05 })); }
      for (const s of [1, -1]) { const a = add2(add2(g.nt, g.hd, 0.45), [0, 1, 0], 0.5); a[2] = 0.3 * s; const b = add2(add2(g.nt, g.hd, 0.2), [0, 1, 0], 0.72); b[2] = 0.36 * s; P.push(cone(a, b, 0.12, 0.03, rig.b('head'), { reg: 5, k: 0.06 })); }
    },
  });
  Object.assign(SPECIES.boss, { id: 'boss', name: 'Rumblejaw', need: 50, score: 5000, cell: 0.1, lodCell: 0.2, eyeCol: [0.98, 0.7, 0.1], scale: 5,
    paint: painter({ back: [0.2, 0.25, 0.2], belly: [0.62, 0.57, 0.46], stripe: [0.5, 0.25, 0.1], stripeF: 2.6, stripeAmt: 0.8, chevron: 1.5, stripeMaxX: 3.0, crest: [0.5, 0.13, 0.08], crest2: [0.3, 0.1, 0.06], horn: [0.3, 0.26, 0.22] }) });

  SPECIES.hornback = quadruped({
    hipY: 1.85, chestX: 1.9, chestY: 1.72, bodyC0: 0.15, bodyR: [1.25, 0.88, 0.8], chestR: [1.1, 0.82, 0.78],
    neck: [[2.6, 1.72], [3.0, 1.62]], neckR: [0.5, 0.42], headL: 1.05, headR: 0.42, snoutR: 0.26, headTilt: 0.55, jawR: 0.22, eyeR: 0.2,
    tail: [[-0.9, 1.78], [-2.0, 1.45, 0.28], [-2.9, 1.15, 0.14], [-3.5, 0.95, 0.04]], tailR0: 0.5,
    frontX: 0.15, backX: 0.05, legZ: 0.58, legRF: 0.2, legRB: 0.27, footR: 0.13, K: 0.16, sigma: 0.14,
    extras(sp, P, rig, g) {
      const h = rig.b('head');
      P.push(ell([g.hj[0] - 0.05, g.hj[1] + 0.45, 0], [0.14, 0.8, 0.95], h, { ax: [0.5, 0.86, 0], up: [-0.86, 0.5, 0], reg: 5, k: 0.1 }));
      for (const s of [1, -1]) P.push(cone([g.hj[0] + 0.35, g.hj[1] + 0.25, 0.22 * s], [g.hj[0] + 1.05, g.hj[1] + 0.75, 0.32 * s], 0.09, 0.012, h, { reg: 2, k: 0.04 }));
      const nose = add2([g.hj[0], g.hj[1], 0], g.hd, 0.85); P.push(cone(nose, [nose[0] + 0.12, nose[1] + 0.34, 0], 0.08, 0.012, h, { reg: 2, k: 0.04 }));
      for (let i = 0; i < 9; i++) { const x = 1.9 - i * 0.42; const y = 2.62 - Math.abs(x - 0.8) * 0.1; for (const s of [1, -1]) P.push(cone([x, y - 0.12, 0.32 * s], [x - 0.05, y + 0.12, 0.36 * s], 0.09, 0.02, rig.b(x > 0.95 ? 'chest' : 'pelvis'), { reg: 2, k: 0.05 })); }
    },
  });
  Object.assign(SPECIES.hornback, { id: 'hornback', name: 'Hornback', need: 4, score: 250, cell: 0.06, lodCell: 0.12, eyeCol: [0.3, 0.2, 0.1], scale: 9,
    paint: painter({ back: [0.55, 0.39, 0.27], belly: [0.78, 0.68, 0.52], stripe: [0.32, 0.2, 0.13], stripeF: 3.2, stripeAmt: 0.45, crest: [0.82, 0.62, 0.25], crest2: [0.28, 0.16, 0.1], crestF: 1.4, horn: [0.85, 0.8, 0.66] }) });

  SPECIES.longneck = quadruped({
    hipY: 5.6, chestX: 6.2, chestY: 5.8, bodyC0: 0.6, bodyR: [3.2, 2.1, 1.9], chestR: [3.0, 2.2, 2.0],
    neck: [[7.8, 6.6], [9.4, 8.2], [10.6, 10.0], [11.5, 11.8], [12.1, 13.2]], neckR: [1.25, 0.42], headL: 1.3, headR: 0.42, snoutR: 0.3, headTilt: 0.5, jawR: 0.22, eyeR: 0.18,
    tail: [[-2.2, 5.6], [-5.2, 5.0, 0.85], [-8.4, 4.1, 0.52], [-11.6, 3.2, 0.3], [-14.4, 2.5, 0.15], [-16.6, 2.0, 0.05]], tailR0: 1.4,
    frontX: 0.0, backX: 0.2, legZ: 1.45, legRF: 0.62, legRB: 0.78, footR: 0.36, K: 0.45, sigma: 0.35,
  });
  Object.assign(SPECIES.longneck, { id: 'longneck', name: 'Long-neck', need: 18, score: 1000, cell: 0.17, lodCell: 0.32, eyeCol: [0.25, 0.18, 0.1], scale: 3,
    paint: painter({ back: [0.43, 0.48, 0.45], belly: [0.72, 0.7, 0.62], spot: [0.3, 0.34, 0.33], spotF: 0.9, spotAmt: 0.55, horn: [0.4, 0.38, 0.33] }) });

  SPECIES.ptero = pterosaur({ membrane: [0.62, 0.42, 0.28] });
  Object.assign(SPECIES.ptero, { id: 'ptero', name: 'Glider', need: 1, score: 150, cell: 0.022, lodCell: 0.045, eyeCol: [0.9, 0.5, 0.1], scale: 30,
    paint: painter({ back: [0.42, 0.34, 0.28], belly: [0.72, 0.64, 0.55], spot: [0.25, 0.2, 0.16], spotF: 9, spotAmt: 0.4, crest: [0.75, 0.15, 0.12], crest2: [0.15, 0.5, 0.5], crestF: 2.5, membrane: [0.62, 0.42, 0.28], horn: [0.75, 0.68, 0.5] }) });

  // ---- Dusk Delta cast ----
  SPECIES.nipper = theropod({
    hipY: 0.36, pelvisR: [0.12, 0.085, 0.07], torsoL: 0.2, torsoRise: 0.05, torsoR0: 0.08, torsoR1: 0.065, neckL: 0.2, neckA: 1.1, neckR0: 0.042, neckR1: 0.03,
    headL: 0.17, headR: 0.044, snoutR: 0.027, headTilt: 0.15, jawR: 0.02, eyeR: 0.46, brow: 0, teeth: 0, headWeak: 1,
    tail: [[-0.09, 0.38], [-0.27, 0.38, 0.045], [-0.45, 0.365, 0.03], [-0.63, 0.35, 0.018], [-0.8, 0.335, 0.007]],
    legZ: 0.058, legR: 0.05, toeL: 0.06, toeR: 0.013, armL: 0.13, armR: 0.015, K: 0.022, sigma: 0.022,
  });
  Object.assign(SPECIES.nipper, { id: 'nipper', name: 'Nipper', need: 1, score: 40, cell: 0.013, lodCell: 0.026, eyeCol: [0.98, 0.8, 0.2], scale: 75, assist: 0.07,
    paint: painter({ back: [0.3, 0.5, 0.2], belly: [0.86, 0.83, 0.55], stripe: [0.13, 0.24, 0.12], stripeF: 30, stripeAmt: 0.8, chevron: 14, stripeMaxX: 0.3, horn: [0.25, 0.22, 0.2] }) });

  SPECIES.clubtail = quadruped({
    hipY: 1.35, chestX: 1.7, chestY: 1.3, bodyC0: 0.2, bodyR: [1.35, 0.72, 1.05], chestR: [1.1, 0.66, 0.95],
    neck: [[2.35, 1.2], [2.75, 1.05]], neckR: [0.4, 0.32], headL: 0.8, headR: 0.34, snoutR: 0.22, headTilt: 0.25, jawR: 0.17, eyeR: 0.2,
    tail: [[-1.1, 1.3], [-2.1, 1.2, 0.3], [-3.0, 1.1, 0.2], [-3.8, 1.02, 0.14], [-4.5, 0.98, 0.12]], tailR0: 0.5,
    frontX: 0.1, backX: 0.0, legZ: 0.7, legRF: 0.21, legRB: 0.25, footR: 0.13, K: 0.14, sigma: 0.13,
    extras(sp, P, rig, g) {
      // armour: the two big back ellipsoids deflect darts; knob rows, shoulder spikes and the tail club ride on them
      const pel = rig.b('pelvis'), ch = rig.b('chest');
      P.forEach(p => { if (p.t === 'ell' && (p.bone === pel || p.bone === ch) && p.reg !== 1) p.armor = 1; });
      const topY = (x, z) => { const e = (cx, cy, rx, ry, rz) => { const q = 1 - ((x - cx) / rx) ** 2 - (z / rz) ** 2; return q > 0 ? cy + ry * Math.sqrt(q) : 0; }; return Math.max(e(0.2, 1.35, 1.35, 0.72, 1.05), e(1.445, 1.3, 1.1, 0.66, 0.95)); };
      for (let i = 0; i < 8; i++) for (const z of [-0.66, -0.22, 0.22, 0.66]) { const x = 2.2 - i * 0.42; const y = topY(x, z); if (!y) continue; P.push(cone([x, y - 0.06, z], [x - 0.04, y + 0.15, z * 1.1], 0.1, 0.02, x > 0.95 ? ch : pel, { reg: 2, k: 0.05, armor: 1 })); }
      for (const s of [1, -1]) { P.push(cone([1.7, 1.35, 0.8 * s], [1.95, 1.52, 1.4 * s], 0.13, 0.02, ch, { reg: 2, k: 0.05, armor: 1 })); P.push(cone([g.hj[0] + 0.05, g.hj[1] + 0.22, 0.2 * s], [g.hj[0] - 0.2, g.hj[1] + 0.42, 0.34 * s], 0.07, 0.015, rig.b('head'), { reg: 2, k: 0.03 })); }
      P.push(ell([-4.8, 0.98, 0], [0.42, 0.27, 0.52], rig.b('tail3'), { reg: 2, k: 0.07 }));
    },
  });
  Object.assign(SPECIES.clubtail, { id: 'clubtail', name: 'Clubtail', need: 14, score: 400, cell: 0.06, lodCell: 0.12, eyeCol: [0.35, 0.25, 0.1], scale: 8,
    paint: painter({ back: [0.27, 0.29, 0.31], belly: [0.62, 0.56, 0.45], spot: [0.4, 0.34, 0.24], spotF: 2.4, spotAmt: 0.5, horn: [0.74, 0.64, 0.42] }) });

  SPECIES.sailback = theropod({
    hipY: 3.3, pelvisR: [1.2, 0.85, 0.72], torsoL: 2.3, torsoRise: 0.1, torsoR0: 0.9, torsoR1: 0.72, neckL: 1.7, neckA: 0.55, neckR0: 0.52, neckR1: 0.36,
    headL: 2.3, headR: 0.4, snoutR: 0.24, headTilt: 0.1, jawR: 0.2, eyeR: 0.2, brow: 0, teeth: 11, headWeak: 1,
    tail: [[-1.0, 3.4], [-2.8, 3.3, 0.6], [-4.8, 3.1, 0.42], [-6.8, 2.9, 0.26], [-8.8, 2.7, 0.1]],
    legZ: 0.55, legR: 0.5, toeL: 0.6, toeR: 0.14, armL: 1.1, armR: 0.14, K: 0.24, sigma: 0.22, hipX: 0.1,
    extras(sp, P, rig, g) {
      P.push(ell([0.6, 5.05, 0], [3.0, 1.6, 0.17], rig.b('pelvis'), { reg: 5, k: 0.1 }));      // the sail
      P.push(ell([-5.9, 3.0, 0], [2.6, 0.56, 0.15], rig.b('tail2'), { reg: 5, k: 0.1 }));      // paddle fin on the tail
    },
  });
  Object.assign(SPECIES.sailback, { id: 'sailback', name: 'Sailback', need: 72, score: 5000, boss: true, cell: 0.1, lodCell: 0.2, eyeCol: [0.95, 0.75, 0.2], scale: 5,
    paint: painter({ back: [0.2, 0.3, 0.34], belly: [0.58, 0.55, 0.44], stripe: [0.09, 0.14, 0.17], stripeF: 2.3, stripeAmt: 0.75, chevron: 1.2, stripeMaxX: 3.6, crest: [0.6, 0.2, 0.1], crest2: [0.8, 0.55, 0.22], crestF: 0.62, horn: [0.3, 0.28, 0.24] }) });
  SPECIES.boss.boss = true;

  for (const k in SPECIES) {
    const sp = SPECIES[k]; sp.prims.forEach(primPrep);
    // hit capsules: cones as-is, ellipsoids as capsules along their longest axis
    sp.hit = sp.prims.filter(p => p.reg !== 3).map(p => {
      if (p.t === 'cone') return { a: p.a, b: p.b, r: Math.max(p.ra, p.rb) * 1.08, bone: p.bone, weak: p.weak || 0, armor: p.armor || 0 };
      const r = p.r.slice(); const i = r.indexOf(Math.max(...r)); const rest = r.filter((_, j) => j !== i); const rm = Math.max(...rest);
      const ax = p.R[i]; const h = Math.max(0, r[i] - rm);
      return { a: V.sub(p.c, V.mul(ax, h)), b: V.add(p.c, V.mul(ax, h)), r: rm * 1.05, bone: p.bone, weak: p.weak || 0, armor: p.armor || 0 };
    });
    let top = 0; for (const p of sp.prims) top = Math.max(top, p.mx[1]); sp.top = top;
    let mnx = 1e9, mxx = -1e9; for (const p of sp.prims) { mnx = Math.min(mnx, p.mn[0]); mxx = Math.max(mxx, p.mx[0]); } sp.len = mxx - mnx; sp.radius = Math.max(sp.len, top) * 0.6;
  }
}
// creature meshes are built on demand: only the cast of the route being loaded
function ensureSpecies(ids) {
  const out = {};
  for (const k of ids) { const sp = SPECIES[k]; if (!sp || sp.mesh) continue; const t0 = performance.now(); const m0 = buildCreatureMesh(sp, sp.cell), m1 = buildCreatureMesh(sp, sp.lodCell); sp.mesh = [creatureVAO(m0), creatureVAO(m1)]; out[k] = Math.round(performance.now() - t0); }
  return out;
}
function buildSpeciesMeshes(progress) {
  const out = {};
  for (const k in SPECIES) {
    const sp = SPECIES[k]; const t0 = performance.now();
    const m0 = buildCreatureMesh(sp, sp.cell), m1 = buildCreatureMesh(sp, sp.lodCell);
    sp.mesh = [creatureVAO(m0), creatureVAO(m1)];
    out[k] = { ms: Math.round(performance.now() - t0), tris: m0.nt, lodTris: m1.nt };
  }
  return out;
}
