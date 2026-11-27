// ---------- level 2 boss: the Foreman (breaker robot) and level 3 boss: the Gulper (comet worm) ----------
// two-bone IK: shoulder S, lengths a and b, target P, bend hint; returns the elbow
function ik2(S, a, b, P, bend) {
  const dv = vsub(P, S), d = clamp(vlen(dv), Math.abs(a - b) + 0.5, a + b - 0.5), dir = vnorm(dv);
  const ca = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1), sa = Math.sqrt(1 - ca * ca);
  let perp = vsub(bend, vscl(dir, vdot(bend, dir))); perp = vlen(perp) > 1e-4 ? vnorm(perp) : vnorm(vcross(dir, [0, 1, 0.1]));
  return vadd(S, vadd(vscl(dir, ca * a), vscl(perp, sa * a)));
}
const FM = { S: 9, L1: 36, L2: 33, Z: -60 }; // arm lengths match the 'arm' mesh (3 units) at scale 12 and 11; the body stands 60 m in front of the arena centre
BOSS_TYPES.foreman = {
  start() {
    BOSS.name = 'THE FOREMAN'; BOSS.phaseName = ''; BOSS.pullLabel = 'MAGNET PULLING US IN'; BOSS.chest = 0; BOSS.fall = 0; BOSS.doors = 1; BOSS.doorT = 0; BOSS.pullDist = 34;
    const X = WRECK.X;
    BOSS.arms = [-1, 1].map((side, i) => {
      const arm = { side, i, state: 'idle', st: 0, nextAtk: 3 + i * 3, wrist: X([side * 30, -8, FM.Z - 26]), wristV: [0, 0, 0], alive: true, holding: false, joints: [] };
      for (const which of ['shoulder', 'elbow']) { const j = bossPart('joint', { hp: 16 }); j.arm = arm; j.which = which; arm.joints.push(j); }
      return arm;
    });
    BOSS.core = bossPart('fcore', { hp: 120 }); BOSS.core.hidden = true; BOSS.coreCol = [2, 5, 8];
    BOSS.nextSpawn = 4;
    radio('fm1', true); setTimeoutSim(3.6, () => radio('fm2', true)); SFX.warn(); SFX.clang(14); shake(0.5);
  },
  solid(p) { return BOSS.bodyP && vdist(p, BOSS.bodyP) < 15; },
  update(dt) {
    const X = WRECK.X, T = WRECK.T, U = WRECK.U, R = WRECK.R, tug = TUG.W, toTug = vscl(T, -1);
    const lunge = BOSS.lunge > 0 ? Math.sin(Math.min(1, BOSS.lunge) * Math.PI) : 0;
    const dying = BOSS.phase === 99;
    BOSS.bodyP = vadd(X([Math.sin(BOSS.t * 0.4) * 3, 4 + Math.sin(BOSS.t * 0.9) * 1.2 - BOSS.fall * 30, FM.Z]), vscl(toTug, lunge * 22));
    BOSS.focus = vmad(BOSS.bodyP, U, 2);
    BOSS.bodyQ = qmul(frameQ(toTug, U), qaxis([1, 0, 0], -lunge * 0.25 + BOSS.fall * 0.5));
    const bq = BOSS.bodyQ, BP = v => vadd(BOSS.bodyP, qrot(bq, v));
    BOSS.headP = BP([0, 19, 1.5]);
    let alive = 0;
    for (const arm of BOSS.arms) {
      const S = BP([arm.side * -15, 9, 0]);
      arm.S = S;
      if (!arm.alive) continue;
      alive++;
      arm.st += dt;
      const dmg = arm.joints.some(j => !j.alive), slow = dmg ? 0.75 : 1;
      let target, k = 3;
      const rest = BP([arm.side * -30, -8 + Math.sin(BOSS.t * 0.7 + arm.i * 2) * 5, 26]);
      if (BOSS.phase < 1 || dying) target = rest;
      else if (arm.state === 'idle') {
        target = rest; arm.nextAtk -= dt * slow;
        const busy = BOSS.arms.some(o => o !== arm && o.alive && o.state !== 'idle');
        if (arm.nextAtk <= 0 && !busy) { arm.state = rnd() < 0.45 ? 'reach' : 'windup'; arm.st = 0; if (arm.state === 'windup') SFX.warn(); }
      } else if (arm.state === 'windup') { target = BP([arm.side * -26, 32, 8]); k = 4; if (arm.st > 1.4 / slow) { arm.state = 'strike'; arm.st = 0; BOSS.lunge = 0.001; SFX.whoosh(); } }
      else if (arm.state === 'strike') {
        target = vmad(tug, vnorm(vsub(tug, S)), 6); k = 6.5;
        const tip = arm.W ? vmad(arm.W, arm.fdir, 5) : arm.wrist;
        if (vdist(tip, tug) < 10 && !arm.hit) { arm.hit = true; hitTug(14, null); radio('fmslap'); }
        if (arm.st > 1.0) { arm.state = 'idle'; arm.st = 0; arm.hit = false; arm.nextAtk = rr(4, 7); }
      } else if (arm.state === 'reach') { target = BP([arm.side * -22, -34, 16]); k = 3.5; if (arm.st > 1.3 / slow) { arm.state = 'lift'; arm.st = 0; arm.holding = true; SFX.clang(6); } }
      else if (arm.state === 'lift') {
        target = BP([arm.side * -20, 24, 12]); k = 4;
        if (arm.st > 1.1 / slow) {
          arm.state = 'idle'; arm.st = 0; arm.holding = false; arm.nextAtk = rr(3.5, 6);
          const p = vmad(arm.W || arm.wrist, arm.fdir || toTug, 10), h = spawnE('hurl', { space: 'world', wp: p, wv: vscl(vnorm(vsub(vmad(tug, TUG.vel, 2), p)), 50), spin: 2.5 }); h.home = 50; h.turn = 0.5; SFX.whoosh();
        }
      }
      const acc = vsub(vscl(vsub(target, arm.wrist), k * k), vscl(arm.wristV, 2 * k));
      arm.wristV = vmad(arm.wristV, acc, dt); arm.wrist = vmad(arm.wrist, arm.wristV, dt);
      const E = ik2(S, FM.L1, FM.L2, arm.wrist, vadd(vscl(R, arm.side * -1), vscl(U, -0.7)));
      const W = vmad(E, vnorm(vsub(arm.wrist, E)), FM.L2);
      arm.E = E; arm.W = W; arm.fdir = vnorm(vsub(W, E)); arm.udir = vnorm(vsub(E, S));
      const glow = arm.state === 'windup' ? 9 + Math.sin(BOSS.t * 20) * 3 : arm.state !== 'idle' ? 7 : 0.6; // only a glowing (busy) joint takes full damage
      for (const j of arm.joints) {
        if (!j.alive) continue;
        j.W = j.which === 'shoulder' ? S : E; j.q = frameQ(toTug, R); j.scale = 2.2; j.emis = glow; j.untarget = BOSS.phase < 1;
      }
      if (dmg && frnd() < dt * 8) FX.sparks(arm.joints.find(j => !j.alive).which === 'shoulder' ? S : E, 5, [0, 0, 0], [6, 4, 2], 14);
    }
    const c = BOSS.core;
    if (BOSS.phase === 0 && BOSS.t > 5) { BOSS.phase = 1; BOSS.pt = 0; BOSS.phaseName = 'ARMS'; }
    if (BOSS.phase === 1 && alive === 0) { BOSS.phase = 2; BOSS.pt = 0; BOSS.pull = 0; BOSS.phaseName = 'REACTOR'; radio('fmcore', true); SFX.clang(14); shake(0.8); }
    if (BOSS.phase === 2) { // the chest vents open for 6 s, then shuts for 2.6 s and drops minions
      BOSS.doorT += dt; const cyc = BOSS.doorT % 8.6, open = cyc < 6;
      if (!open && BOSS.doors) { BOSS.nextSpawn = 0; SFX.clang(12); }
      BOSS.doors = open ? 1 : 0;
    }
    if (BOSS.phase >= 2) BOSS.chest = BOSS.phase === 99 ? 1 : clamp(BOSS.chest + (BOSS.doors ? 1.2 : -2) * dt, 0, 1);
    if (c && c.alive) { c.hidden = BOSS.phase < 2; c.untarget = BOSS.phase !== 2 || BOSS.chest < 0.7; c.W = BP([0, 2, 10.5]); c.scale = 4.2 * (1 + 0.07 * Math.sin(BOSS.t * 8)); c.q = bq; }
    if (BOSS.phase === 2) {
      BOSS.pull = Math.min(1, BOSS.pull + dt / 14);
      if (BOSS.pt > 2.5 && !BOSS.saidPull) { BOSS.saidPull = true; radio('fmpull', true); }
      BOSS.nextSpawn -= dt;
      if (BOSS.nextSpawn <= 0) {
        BOSS.nextSpawn = 99;
        for (const side of [-1, 1]) { const p = BP([side * 18, 14, -4]); const e = spawnE('sentry', { space: 'world', wp: p, wv: vadd(vscl(toTug, 14), vscl(R, side * 10)), spin: 0 }); e.shootT = 1.5; }
        const m = spawnE('mine', { space: 'world', wp: BP([0, -10, 6]), wv: vscl(toTug, 10), spin: 0.6 }); m.armed = true; m.home = 16; m.turn = 0.7;
        SFX.clang(8);
      }
      if (BOSS.pull >= 1) { BOSS.pull = 0.35; BOSS.lunge = 0.001; hitTug(22, null); radio('fmcrush'); SFX.chomp(); shake(1); }
    }
    BOSS.pullOn = BOSS.phase === 2;
    if (dying) {
      BOSS.dieT += dt; BOSS.fall = Math.max(0, BOSS.dieT - 1.5) * 0.25;
      if (frnd() < dt * 10) { FX.boom(vadd(BOSS.bodyP, vscl(randDir(frnd), frr(4, 16))), frr(3, 7), [1, 0.55, 0.2]); SFX.boom(9); }
      if (BOSS.dieT > 1.5 && !BOSS.jack) { BOSS.jack = true; jackpot(BP([0, 2, 10]), toTug); radio('fmwin'); }
      if (BOSS.dieT > 5.4) { BOSS.phase = 100; finishRun(true); }
    }
  },
  onHit(e, dmg) { if (e.kind === 'joint' && e.arm.state === 'idle' && BOSS.phase !== 99) { if (frnd() < 0.3) FX.sparks(e.W, 3, [0, 0, 0], [3, 3, 3.5], 10); return dmg * 0.3; } return true; },
  onKill(e) {
    if (e.kind === 'joint') {
      const arm = e.arm; shake(0.4); SFX.clang(10);
      if (arm.joints.every(j => !j.alive)) { // the arm comes off
        arm.alive = false; radio('fmarm', true);
        const parts = [['arm', arm.S, 12], ['arm', arm.E, 11], ['claw', arm.W, 7]];
        for (const [tp, p, s] of parts) debris(tp, p, vadd(vscl(WRECK.U, -frr(6, 12)), vscl(randDir(frnd), 4)), s, [1, 1, 1], 2, 7);
        FX.boom(arm.E, 6, [1, 0.6, 0.25]);
      } else { arm.state = 'idle'; arm.st = 0; arm.holding = false; }
    } else if (e.kind === 'fcore') bossDying();
  },
  draw() {
    const bq = BOSS.bodyQ, BP = v => vadd(BOSS.bodyP, qrot(bq, v));
    inst('fbody', BOSS.bodyP, bq, FM.S, [1, 1, 1], 2, 1, 0, 0.3, 0.7);
    inst('fhead', BOSS.headP, bq, 7, [1, 1, 1], 2, 2 + (BOSS.phase === 99 ? 0 : Math.sin(BOSS.t * 3)), 0, 0.5, 0.6);
    sprite(BP([0, 19.3, 6.2]), null, 6, 2.5, [5, 0.8, 0.4], 0.8, 0);
    const toTug = vscl(WRECK.T, -1), U = WRECK.U;
    for (const arm of BOSS.arms) {
      if (!arm.alive || !arm.E) continue;
      inst('arm', arm.S, frameQ(arm.udir, U), 12, [1, 1, 1], 2, 1, 0, 1.1 + arm.i, 0.7);
      inst('arm', arm.E, frameQ(arm.fdir, U), 11, [1, 1, 1], 2, 1, 0, 2.3 + arm.i, 0.7);
      inst('claw', arm.W, frameQ(arm.fdir, U), 7, [1, 1, 1], 3, 1, 0, 0, 0);
      if (arm.holding) inst('cube0', vmad(arm.W, arm.fdir, 10), qaxis([0.3, 1, 0.2], BOSS.t), 3.3, [1, 1, 1], 2, 1, 0, 1, 0.8);
    }
    // chest doors swing open in phase 2
    const o = BOSS.chest * 1.4;
    for (const side of [-1, 1]) inst('plate0', BP([side * (5.5 + o * 3), 2, 9.4 - o * 2]), qmul(bq, qmul(qaxis([0, 1, 0], side * o), qaxis([1, 0, 0], Math.PI / 2))), [1.8, 2.2, 3], [0.86, 0.6, 0.08], 8, 1, 0, 0, 0.5);
    if (BOSS.phase >= 2 && BOSS.phase < 99) sprite(BP([0, 2, 11]), null, 9, 9, [1.2, 2.8, 4], 0.5 * BOSS.chest, 0);
    for (const side of [-1, 1]) sprite(BP([side * 13, 13, 9.5]), null, 3, 3, [6, 5.5, 4.5], 1, 0);
  }
};

// ---- the Gulper: a worm living under the comet's crust ----
const GW = { LEN: 125 };
BOSS_TYPES.gulper = {
  start() {
    BOSS.name = 'THE GULPER'; BOSS.phaseName = ''; BOSS.pullMove = false; BOSS.pullLabel = 'COILING TO STRIKE';
    BOSS.trail = []; BOSS.leap = null; BOSS.nextLeap = 3.2; BOSS.gills = [];
    for (let k = 0; k < 6; k++) { const g = bossPart('gill', { hp: 6 }); g.u = 0.2 + k * 0.11; g.side = k % 2 ? 1 : -1; BOSS.gills.push(g); }
    BOSS.core = bossPart('wcore', { hp: 70 }); BOSS.core.hidden = true;
    const G0 = groundAt(0, S_BOSS); BOSS.headP = vmad(G0, WRECK.U, -60); BOSS.headDir = WRECK.U.slice();
    for (let i = 0; i < 40; i++) BOSS.trail.push(vmad(BOSS.headP, WRECK.U, -i * 4));
    radio('gw1', true); setTimeoutSim(3.4, () => radio('gw2', true)); shake(0.5); SFX.roar(0.7);
  },
  solid(p) { return false; },
  update(dt) {
    const U = WRECK.U, T = WRECK.T, R = WRECK.R, tug = TUG.W, toTug = vscl(T, -1);
    const dying = BOSS.phase === 99;
    let target = null;
    if (BOSS.phase === 0 && BOSS.t > 4) { BOSS.phase = 1; BOSS.phaseName = 'GILLS'; }
    if (BOSS.phase <= 1) {
      if (!BOSS.leap) {
        BOSS.nextLeap -= dt;
        if (BOSS.nextLeap <= 1.4 && !BOSS.planned) { // plan the next leap and warn where it breaks the surface
          const aimed = (BOSS.leaps || 0) % 3 === 2 && BOSS.phase === 1;
          const sE = TUG.s + (aimed ? rr(55, 80) : rr(80, 150)), xE = aimed ? TUG.x + rr(-25, 25) : rr(25, 75) * (rnd() < 0.5 ? -1 : 1);
          const sD = TUG.s + (aimed ? rr(20, 40) : rr(70, 150)), xD = aimed ? TUG.x - Math.sign(xE - TUG.x || 1) * rr(30, 50) : -Math.sign(xE) * rr(25, 75);
          BOSS.planned = { E: groundAt(xE, sE), D: groundAt(xD, sD), H: aimed ? 0 : rr(6, 28), aimed };
          BOSS.warnP = BOSS.planned.E; shake(0.25); SFX.roar(0.4);
        }
        if (BOSS.planned) { const Ep = BOSS.planned.E; if (frnd() < dt * 25) FX.puff(Ep, 6, [0.4, 0.42, 0.45], vscl(U, 18), 2); }
        if (BOSS.nextLeap <= 0 && BOSS.planned) {
          const P = BOSS.planned, up = U; BOSS.planned = null; BOSS.warnP = null; BOSS.leaps = (BOSS.leaps || 0) + 1;
          const tugH = vdot(vsub(tug, P.E), up), apex = P.aimed ? tugH + 6 : tugH + P.H;
          BOSS.leap = { E: P.E, D: P.D, apex, tau: 0, len: vdist(P.E, P.D) + 2 * apex, hit: false };
          FX.puff(P.E, 14, [0.5, 0.52, 0.55], vscl(up, 30), 10); FX.icy(P.E, 6, vscl(up, 20)); SFX.boom(10); shake(0.5);
        }
      }
      if (BOSS.leap) {
        const L = BOSS.leap; L.tau += dt * 62 / L.len * (L.tau < 1 ? 0.5 + 0.5 * Math.abs(2 * L.tau - 1) : 1) * (BOSS.gills.some(g => g.alive) ? 1 : 2.5); // hangs near the top of the arc; dives fast once the gills are gone
        const tau = L.tau, base = vlerp(L.E, L.D, Math.min(tau, 1.6)), h = tau <= 1 ? Math.sin(Math.PI * tau) * (L.apex + 40) - 40 : -40 - (tau - 1) * L.len * 0.9;
        target = vmad(base, U, h);
        if (tau > 1 + GW.LEN / L.len + 0.25) { BOSS.leap = null; BOSS.nextLeap = rr(1.5, 2.2); // dive done: spray shards at the tug
          for (let i = 0; i < 4; i++) { const p = vmad(L.D, U, 2), j = spawnE('jetrock', { space: 'world', wp: p, wv: vadd(vscl(vnorm(vsub(tug, p)), 36), vscl(randDir(rnd), 8)), spin: 2 }); j.rs = 0.8; }
        }
      } else target = vmad(groundAt(TUG.x * 0.5, S_BOSS), U, -70);
    } else if (BOSS.phase === 2 || dying) { // reared up out of the ground, facing the tug
      // rears up 70 m in front of the tug with its neck leaning in: it starts further out and swings toward the tug as it rises
      const G0 = groundAt(0, S_BOSS - 70), tugH = vdot(vsub(tug, G0), U), r = BOSS.rise || 0, sway = Math.sin(BOSS.t * 0.5) * 18 * r;
      const lunge = BOSS.lunge > 0 ? Math.sin(Math.min(1, BOSS.lunge) * Math.PI) : 0;
      const base = vadd(vadd(vmad(G0, U, (tugH + 6) * (0.35 + 0.65 * r) - (dying ? BOSS.dieT * 16 : 0)), vscl(T, (1 - r) * 55)), vscl(R, sway));
      target = vadd(base, vscl(vsub(vmad(tug, U, -4), base), lunge * 0.75));
      BOSS.nextGlob = (BOSS.nextGlob || 2) - dt;
      if (!dying && BOSS.rise > 0.95 && BOSS.nextGlob <= 0) { BOSS.nextGlob = rr(2.2, 3); const p = BOSS.mawP || BOSS.headP, j = spawnE('jetrock', { space: 'world', wp: p.slice(), wv: vscl(vnorm(vsub(vmad(tug, TUG.vel, 1.5), p)), 44), spin: 2 }); j.home = 44; j.turn = 0.5; SFX.spit(); }
      if (!dying) {
        BOSS.rise = Math.min(1, (BOSS.rise || 0) + dt * 0.5);
        BOSS.pull = Math.min(1, BOSS.pull + dt / 12);
        if (BOSS.pt > 2 && !BOSS.saidPull) { BOSS.saidPull = true; radio('gwcoil', true); }
        if (BOSS.pull >= 1) { BOSS.pull = 0.3; BOSS.lunge = 0.001; setTimeoutSim(0.3, () => { if (BOSS.phase === 2) { hitTug(20, null); radio('gwbite'); SFX.chomp(); shake(1); } }); }
      }
    }
    BOSS.pullOn = BOSS.phase === 2;
    // head motion: follow the target with a speed limit, keep a trail for the body
    if (target) {
      const d = vsub(target, BOSS.headP), dl = vlen(d), maxStep = (BOSS.phase === 2 ? 60 : 110) * dt;
      const step = dl > maxStep ? vscl(d, maxStep / dl) : d;
      if (vlen(step) > 1e-3) BOSS.headDir = vnorm(vlerp(BOSS.headDir, vnorm(step), 1 - Math.exp(-8 * dt)));
      BOSS.headP = vadd(BOSS.headP, step);
    }
    if (BOSS.phase === 2 && !dying) BOSS.headDir = vnorm(vlerp(BOSS.headDir, vnorm(vsub(tug, BOSS.headP)), 1 - Math.exp(-3 * dt)));
    const tr = BOSS.trail; if (vdist(tr[0], BOSS.headP) > 2) { tr.unshift(BOSS.headP.slice()); if (tr.length > 120) tr.pop(); } else tr[0] = BOSS.headP.slice();
    // sample the body along the trail
    const pts = []; let acc = 0, j = 0;
    for (let r = 0; r < TENT_RINGS; r++) {
      const want = r / (TENT_RINGS - 1) * GW.LEN;
      while (j < tr.length - 1 && acc + vdist(tr[j], tr[j + 1]) < want) { acc += vdist(tr[j], tr[j + 1]); j++; }
      if (j >= tr.length - 1) pts.push(tr[tr.length - 1].slice());
      else { const seg = vdist(tr[j], tr[j + 1]) || 1; pts.push(vlerp(tr[j], tr[j + 1], clamp((want - acc) / seg, 0, 1))); }
    }
    pts[0] = vmad(BOSS.headP, BOSS.headDir, -4);
    BOSS.body = pts;
    BOSS.tubes = [{ pts, up: U, len: GW.LEN, rad: u => 7.2 * Math.pow(1 - u, 0.55) + 1.8, col: [150, 160, 182], shade: (u, a) => (Math.cos(a) > 0.2 ? 0.55 : 0.95) * (0.8 + 0.2 * Math.sin(u * 60)) }];
    const ground = groundAt(0, S_BOSS); const above = p => vdot(vsub(p, ground), U);
    // gills ride the body; only targetable above the crust
    for (const g of BOSS.gills) {
      if (!g.alive) continue;
      const fi = g.u * (TENT_RINGS - 1), i0 = Math.floor(fi), p = vlerp(pts[i0], pts[i0 + 1], fi - i0), tan = vnorm(vsub(pts[i0 + 1], pts[Math.max(i0 - 1, 0)]));
      let side = vcross(tan, U); side = vlen(side) > 1e-3 ? vnorm(side) : R;
      const rad = 7.2 * Math.pow(1 - g.u, 0.55) + 1.8;
      g.W = vadd(p, vadd(vscl(side, g.side * rad * 0.8), vscl(U, rad * 0.45))); g.q = frameQ(tan, vnorm(vadd(vscl(side, g.side), U))); g.scale = 3.1;
      const up = above(g.W) > 4; g.hidden = !up; g.untarget = !up || BOSS.phase !== 1; g.glow = 4 + Math.sin(BOSS.t * 4 + g.u * 20) * 1.5;
    }
    // hitting the tug with the body during a leap
    if (BOSS.leap && !BOSS.leap.hit) for (let r = 0; r < TENT_RINGS; r += 2) { const rad = 7.2 * Math.pow(1 - r / (TENT_RINGS - 1), 0.55) + 1.8; if (vdist(pts[r], tug) < rad + TUG_R) { BOSS.leap.hit = true; hitTug(16, null); radio('gwhit'); shake(0.9); break; } }
    if (BOSS.phase === 1 && BOSS.gills.every(g => !g.alive) && !BOSS.leap) { BOSS.phase = 2; BOSS.pt = 0; BOSS.pull = 0; BOSS.rise = 0; BOSS.phaseName = 'MAW'; radio('gwrear', true); SFX.roar(1); shake(0.8); }
    BOSS.hf = BOSS.headDir; BOSS.mawP = vmad(BOSS.headP, BOSS.headDir, 12);
    const c = BOSS.core;
    if (c && c.alive) { c.hidden = BOSS.phase !== 2; c.untarget = BOSS.phase !== 2 || BOSS.rise < 0.9; c.W = vmad(BOSS.headP, BOSS.headDir, 10.5); c.scale = 4 * (1 + 0.08 * Math.sin(BOSS.t * 7)); }
    BOSS.focus = vlerp(vmad(WRECK.c, U, -15), BOSS.headP, BOSS.phase === 2 ? 0.55 : 0.3);
    if (dying) {
      BOSS.dieT += dt;
      if (frnd() < dt * 10) { const p = pts[Math.floor(frnd() * TENT_RINGS)]; FX.icy(p, frr(4, 8)); SFX.shatter(8); }
      if (BOSS.dieT > 1.4 && !BOSS.jack) { BOSS.jack = true; jackpot(BOSS.mawP, toTug); radio('gwwin'); }
      if (BOSS.dieT > 5.2) { BOSS.phase = 100; finishRun(true); }
    }
  },
  onKill(e) { if (e.kind === 'gill') { SFX.roar(0.6); shake(0.35); } else if (e.kind === 'wcore') bossDying(); },
  draw() {
    if (!BOSS.body) return;
    inst('whead', vmad(BOSS.headP, BOSS.headDir, 2), frameQ(BOSS.headDir, WRECK.U), 9.5, [1, 1, 1], 5, 0.8, 0, 2, 0);
    const open = BOSS.phase === 2 ? 1 : 0.3;
    inst('bteeth', vmad(BOSS.headP, BOSS.headDir, 12.5), qmul(frameQ(BOSS.headDir, WRECK.U), qaxis([0, 0, 1], BOSS.t * 0.3)), [3.5 + open * 2, 3.5 + open * 2, 3], [0.9, 0.95, 1], 0, 1, 0, 2);
  }
};
