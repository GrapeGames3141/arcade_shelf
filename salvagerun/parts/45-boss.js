// ---------- bosses: shared framework + Old Grabby (level 1) and the Matriarch (level 4, same code, bigger config) ----------
// A boss type has start(cfg), update(dt), draw(), onKill(e), optional onHit(e, dmg, src) and solid(p).
// It registers its weak points in BOSS.parts, sets BOSS.name / phaseName, and may use BOSS.pull (0..1 bar), BOSS.focus (camera)
// and BOSS.tubes (tentacles / worm bodies, meshed each frame).
const BOSS = { active: false };
const BOSS_TYPES = {};
const TENT_RINGS = 32, TENT_SIDES = 16, TENT_LEN = 78;
function bossReset() {
  for (const k of Object.keys(BOSS)) if (typeof BOSS[k] !== 'function') delete BOSS[k]; // keep onHit / onKill
  Object.assign(BOSS, { active: false, type: null, phase: 0, t: 0, pt: 0, parts: [], tubes: [], tent: [], eyes: [], core: null, emerge: 0, maw: 0, pull: 0, pullMove: true, pullLabel: 'PULLING US IN', hpMax: 1, dieT: 0, nextGlob: 3, nextSwarm: 6, lunge: 0, name: '', phaseName: '', focus: null, warnP: null });
}
bossReset();
function bossStart() {
  bossReset(); BOSS.active = true; BOSS.type = LV.boss;
  BOSS_TYPES[LV.boss].start(LV.bossCfg || {});
  BOSS.hpMax = Math.max(1, bossHP());
  MUSIC.setMode('boss');
}
function bossPart(kind, o = {}) { const e = spawnE(kind, Object.assign({ space: 'manual', untarget: true, spin: 0, q: qid() }, o)); e.bossPart = true; BOSS.parts.push(e); return e; }
function bossHP() { if (!BOSS.active) return 0; let h = 0; for (const e of BOSS.parts) if (e.alive) h += Math.max(0, e.hp); return h; }
function bossUpdate(dt) {
  if (!BOSS.active) return;
  BOSS.t += dt; BOSS.pt += dt;
  BOSS_TYPES[BOSS.type].update(dt);
  for (const e of BOSS.parts) if (e.alive) { if (e.prevW) e.vel = vscl(vsub(e.W, e.prevW), 1 / dt); e.prevW = e.W.slice(); }
  if (BOSS.lunge > 0) { BOSS.lunge += dt * 1.6; if (BOSS.lunge >= 1) BOSS.lunge = 0; }
}
BOSS.onHit = (e, dmg, src) => { const T = BOSS_TYPES[BOSS.type]; if (e.closed) return false; return T && T.onHit ? T.onHit(e, dmg, src) : true; };
BOSS.onKill = e => { const T = BOSS_TYPES[BOSS.type]; if (T) T.onKill(e); };
function drawBossMeshes() { if (BOSS.active) BOSS_TYPES[BOSS.type].draw(); }
function bossDying() { // shared death: slow motion, clear the minions
  BOSS.phase = 99; BOSS.dieT = 0; G.slowmo = 1.2; shake(1.2); SFX.roar(1.2); BOSS.pull = 0; BOSS.phaseName = '';
  for (const o of ENTS) if (o.alive && !o.bossPart && (o.kind === 'glob' || o.kind === 'mite' || o.kind === 'thrown' || o.kind === 'hurl' || o.kind === 'plasma' || o.kind === 'jetrock' || o.kind === 'egg' || o.kind === 'sentry' || o.kind === 'mine')) killE(o, { kind: 'blast' });
}
function spitGlob(p) { const g = spawnE('glob', { space: 'world', wp: p.slice(), wv: vscl(vnorm(vsub(TUG.W, p)), 30), spin: 2 }); g.home = 32; g.turn = 1.2; SFX.spit(); }
function jackpot(p, dir, n = 40, val = 125) {
  for (let i = 0; i < n; i++) setTimeoutSim(i * 0.04, () => spawnGems(p, vscl(dir || [0, 0, 1], 12), 1, val, pick([[1, 0.8, 0.3], [0.4, 0.9, 1], [1, 0.4, 0.8]]), false));
}

// ---- Old Grabby / the Matriarch ----
// cfg: anchors (arena-local), HR (head radius), eyes, nodeHp, eyeHp, coreHp, name, lines {intro1, intro2, eyes, core, win}, eggs
function tentCurve(t, n) {
  const B = t.B, tip = t.tip, L = t.len * t.grow, pts = [];
  const span = vdist(B, tip) || 1, dirBT = vscl(vsub(tip, B), 1 / span);
  const P1 = vmad(B, t.D0, Math.min(L, span) * 0.42);
  let side = vcross(dirBT, WRECK.U); if (vlen(side) < 1e-3) side = WRECK.R; side = vnorm(side); const up = vnorm(vcross(side, dirBT));
  const amp = (t.state === 'strike' ? 1 : t.state === 'limp' ? 5 : 4.5) * t.grow;
  const P2 = vadd(vmad(tip, dirBT, -span * 0.3), vscl(up, Math.sin(BOSS.t * 0.8 + t.ph) * 8 * t.grow));
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1), iu = 1 - u;
    let p = [0, 1, 2].map(j => iu * iu * iu * B[j] + 3 * iu * iu * u * P1[j] + 3 * iu * u * u * P2[j] + u * u * u * tip[j]);
    const w = Math.sin(u * 3.2 * Math.PI - BOSS.t * 2.6 + t.ph) * amp * u * (1.2 - u), w2 = Math.cos(u * 2.3 * Math.PI - BOSS.t * 1.9 + t.ph) * amp * 0.7 * u * (1.2 - u);
    p = vadd(p, vadd(vscl(side, w), vscl(up, w2)));
    pts.push(p);
  }
  return pts;
}
const tentRadius = u => 4.4 * Math.pow(1 - u, 0.8) + 0.4;
const GRABBY_DEFAULT = { anchors: [[-45, 14, -16], [45, 12, -16], [-32, -16, -14], [34, -18, -14]], HR: 21, eyes: 6, nodeHp: 6, eyeHp: 12, coreHp: 64, len: 78, name: 'OLD GRABBY',
  lines: { intro1: 'boss1', intro2: 'boss2', eyes: 'eyes', core: 'bcore', pull: 'pull', chomp: 'chomp', win: 'win', slap: 'slap', sever: 'sever' }, eggs: false, attackK: 1 };
BOSS_TYPES.grabby = {
  start(cfg) {
    const C = BOSS.cfg = Object.assign({}, GRABBY_DEFAULT, cfg); BOSS.name = C.name; BOSS.phaseName = '';
    const X = WRECK.X, T = WRECK.T, U = WRECK.U, R = WRECK.R;
    C.anchors.forEach((a, i) => {
      const B = X(a), out = vnorm(vadd(vadd(vscl(T, -1), vscl(R, Math.sign(a[0]) * 0.55)), vscl(U, Math.sign(a[1]) * 0.45)));
      const t = { i, B, D0: out, ph: i * 1.7 + 0.4, state: 'grow', st: 0, grow: 0, tip: vmad(B, out, 2), tipV: [0, 0, 0], alive: true, nodes: [], nextAtk: 5 + i * 2.6 / C.attackK, pts: [], len: C.len };
      for (let k = 0; k < 3; k++) { const n = bossPart('node', { hp: C.nodeHp }); n.tent = t; n.u = 0.42 + k * 0.2; t.nodes.push(n); }
      BOSS.tent.push(t);
    });
    for (let k = 0; k < C.eyes; k++) { const e = bossPart('eye', { hp: C.eyeHp }); e.ang = (k / C.eyes) * TAU + Math.PI / C.eyes; e.hidden = true; e.blinkT = 3 + k * 0.9; BOSS.eyes.push(e); }
    BOSS.core = bossPart('bcore', { hp: C.coreHp }); BOSS.core.hidden = true;
    radio(C.lines.intro1, true); setTimeoutSim(3.4, () => radio(C.lines.intro2, true)); SFX.roar(); shake(0.6);
  },
  solid(p) { return BOSS.headP && BOSS.emerge > 0.3 && vdist(p, BOSS.headP) < BOSS.cfg.HR * 0.9; },
  update(dt) {
    const C = BOSS.cfg, X = WRECK.X, T = WRECK.T, U = WRECK.U, R = WRECK.R, tug = TUG.W;
    let aliveTents = 0;
    BOSS.tubes = [];
    for (const t of BOSS.tent) {
      if (!t.alive) continue;
      t.st += dt;
      const L = t.len;
      let target, k = 2.5;
      const sway = vadd(vscl(R, Math.sin(BOSS.t * 0.55 + t.ph) * L * 0.22), vscl(U, Math.cos(BOSS.t * 0.43 + t.ph * 1.3) * L * 0.18));
      if (t.state === 'grow') { t.grow = Math.min(1, t.grow + dt * 0.45); target = vadd(vmad(t.B, t.D0, L * 0.7 * t.grow), vscl(sway, t.grow)); k = 3; if (t.grow >= 1 && BOSS.phase >= 1) { t.state = 'idle'; t.st = 0; } }
      else if (t.state === 'idle') {
        target = vadd(vmad(t.B, t.D0, L * 0.68), sway);
        t.nextAtk -= dt;
        const busy = BOSS.tent.filter(o => o.alive && (o.state === 'windup' || o.state === 'strike')).length;
        if (t.nextAtk <= 0 && busy < (BOSS.phase === 1 ? 1 + (aliveTents < 3 ? 1 : 0) : 1)) { t.state = rnd() < 0.3 ? 'grabwind' : 'windup'; t.st = 0; t.nextAtk = rr(4.5, 8) / C.attackK; if (t.state === 'windup') SFX.warn(); }
      } else if (t.state === 'windup' || t.state === 'grabwind') {
        const away = vnorm(vadd(vscl(U, 0.8), vscl(vsub(t.B, tug), 0.004)));
        target = vadd(vmad(t.B, vnorm(vadd(vscl(t.D0, 0.3), away)), L * 0.55), vscl(R, Math.sin(BOSS.t * 9) * 1.5));
        k = 4;
        if (t.st > (t.state === 'windup' ? 1.5 : 1.1)) {
          if (t.state === 'windup') { t.state = 'strike'; t.st = 0; SFX.whoosh(); }
          else { t.state = 'idle'; t.st = 0; const p = t.tip.slice(); const th = spawnE(C.eggs && rnd() < 0.5 ? 'egg' : 'thrown', { space: 'world', wp: p, wv: vscl(vnorm(vsub(vmad(tug, TUG.vel, 2), p)), 48), spin: 3 }); th.home = 48; th.turn = 0.6; SFX.whoosh(); }
        }
      } else if (t.state === 'strike') {
        target = vmad(tug, vnorm(vsub(tug, t.B)), 4); k = 7;
        if (vdist(t.tip, tug) < 7 && !t.hitDone) { t.hitDone = true; hitTug(14, null); radio(C.lines.slap); }
        if (t.st > 0.9) { t.state = 'idle'; t.st = 0; t.hitDone = false; }
      } else if (t.state === 'recoil') { target = vadd(vmad(t.B, t.D0, L * 0.35), vscl(R, Math.sin(BOSS.t * 14) * 4)); k = 6; if (t.st > 1.2) { t.state = 'idle'; t.st = 0; } }
      else if (t.state === 'limp') { t.grow = Math.max(0, t.grow - dt * 0.5); target = vmad(t.B, vadd(vscl(U, -0.8), vscl(t.D0, 0.4)), L * 0.5 * t.grow); k = 2; if (frnd() < dt * 20 && t.pts.length) FX.goo(t.pts[Math.floor(frnd() * t.pts.length * 0.5)], 1.2, [0, 0, 0], [1, 0.4, 0.6]); if (t.grow <= 0) t.alive = false; }
      const acc = vsub(vscl(vsub(target, t.tip), k * k), vscl(t.tipV, 2 * k));
      t.tipV = vmad(t.tipV, acc, dt); t.tip = vmad(t.tip, t.tipV, dt);
      t.pts = tentCurve(t, TENT_RINGS);
      const span = vdist(t.B, t.tip), len = L * Math.max(0.05, t.grow), thin = clamp(Math.sqrt(len / Math.max(span, 1)), 0.6, 1.1) * Math.min(1, 0.3 + t.grow);
      BOSS.tubes.push({ pts: t.pts, up: U, len, rad: u => tentRadius(u) * thin * (C.thick || 1), col: [70, 24, 62] });
      const glowing = t.state === 'windup' || t.state === 'grabwind';
      for (const n of t.nodes) {
        if (!n.alive) continue;
        const fi = n.u * (TENT_RINGS - 1), i0 = Math.floor(fi), p = vlerp(t.pts[i0], t.pts[Math.min(i0 + 1, TENT_RINGS - 1)], fi - i0);
        const tan = vnorm(vsub(t.pts[Math.min(i0 + 1, TENT_RINGS - 1)], t.pts[Math.max(i0 - 1, 0)]));
        const side = vnorm(vcross(tan, U)); const up = vnorm(vcross(side, tan));
        n.W = vmad(p, up, tentRadius(n.u) * 0.75 * (C.thick || 1)); n.q = frameQ(tan, up); n.scale = 1.7 * (0.8 + tentRadius(n.u) * 0.12) * (C.thick || 1);
        n.untarget = t.grow < 0.95 || BOSS.phase < 1; n.glow = glowing ? 9 + Math.sin(BOSS.t * 20) * 3 : 3 + Math.sin(BOSS.t * 3 + n.u * 9);
      }
      if (t.state !== 'limp') aliveTents++;
    }
    // head
    const fwd = vscl(T, -1), HR = C.HR;
    const headHidden = X([0, 0, HR * 1.25]), headOut = X([0, 3, -HR * 1.3]);
    if (BOSS.phase >= 2) BOSS.emerge = Math.min(1, BOSS.emerge + dt * 0.35);
    const em = sstep(0, 1, BOSS.emerge);
    const lunge = BOSS.lunge > 0 ? Math.sin(Math.min(1, BOSS.lunge) * Math.PI) : 0;
    BOSS.headP = vadd(vlerp(headHidden, headOut, em), vadd(vscl(fwd, lunge * 25), vscl(U, Math.sin(BOSS.t * 0.7) * 1.5 * em)));
    const look = vnorm(vsub(tug, BOSS.headP));
    BOSS.headQ = frameQ(vnorm(vlerp(fwd, look, 0.6 * em)), U);
    const hf = qrot(BOSS.headQ, [0, 0, 1]), hu = qrot(BOSS.headQ, [0, 1, 0]), hr = qrot(BOSS.headQ, [1, 0, 0]);
    BOSS.hf = hf;
    if (BOSS.phase === 3) BOSS.maw = Math.min(1, BOSS.maw + dt * 0.8); else if (BOSS.phase < 3) BOSS.maw = 0;
    for (const e of BOSS.eyes) {
      if (!e.alive) continue;
      e.hidden = em < 0.3;
      const off = vadd(vscl(hf, HR * 0.78), vadd(vscl(hr, Math.cos(e.ang) * HR * 0.52), vscl(hu, Math.sin(e.ang) * HR * 0.5)));
      e.W = vadd(BOSS.headP, off); e.q = frameQ(vnorm(vsub(tug, e.W)), hu); e.scale = 2.6 * HR / 21;
      e.blinkT -= dt; if (e.blinkT < 0) { e.closed = true; if (e.blinkT < -1.1) { e.closed = false; e.blinkT = rr(3.5, 6); } }
      e.squash = e.closed ? 0.12 : 1; e.untarget = em < 0.9 || BOSS.phase !== 2; e.emis = e.closed ? 0.1 : 1.2;
    }
    const c = BOSS.core;
    if (c && c.alive) { c.hidden = BOSS.phase < 3; c.untarget = BOSS.phase !== 3 || BOSS.maw < 0.6; c.W = vadd(BOSS.headP, vscl(hf, HR * (0.5 + 0.25 * BOSS.maw))); c.scale = 4.5 * HR / 21 * (1 + 0.08 * Math.sin(BOSS.t * 7)); c.q = BOSS.headQ; }
    const mawP = vadd(BOSS.headP, vscl(hf, HR * 0.95));
    BOSS.mawP = mawP;
    if (BOSS.phase === 0 && BOSS.t > 5.5) { BOSS.phase = 1; BOSS.pt = 0; BOSS.phaseName = 'TENTACLES'; }
    if (BOSS.phase === 1) {
      if (aliveTents === 0) { BOSS.phase = 2; BOSS.pt = 0; BOSS.phaseName = 'EYES'; radio(C.lines.eyes, true); SFX.roar(); shake(0.7); }
    } else if (BOSS.phase === 2) {
      if (em > 0.9) {
        BOSS.nextGlob -= dt; BOSS.nextSwarm -= dt;
        if (BOSS.nextGlob <= 0) { BOSS.nextGlob = rr(1.8, 2.6) / C.attackK; if (C.eggs && rnd() < 0.4) spitEgg(mawP); else spitGlob(mawP); }
        if (BOSS.nextSwarm <= 0) { BOSS.nextSwarm = rr(7, 9) / C.attackK; for (let i = 0; i < 6; i++) { const m = spawnE('mite', { space: 'world', wp: vmad(mawP, randDir(frnd), 4), wv: vmad(vscl(fwd, 25), randDir(rnd), 12), spin: 0 }); m.home = 32; m.turn = 1.8; } SFX.chitter(); }
      }
      if (BOSS.eyes.every(e => !e.alive)) { BOSS.phase = 3; BOSS.pt = 0; BOSS.pull = 0; BOSS.phaseName = 'CORE'; radio(C.lines.core, true); SFX.roar(); shake(0.8); }
    } else if (BOSS.phase === 3) {
      BOSS.nextGlob -= dt; if (BOSS.nextGlob <= 0) { BOSS.nextGlob = rr(3, 4.2) / C.attackK; if (C.eggs && rnd() < 0.5) spitEgg(mawP); else spitGlob(mawP); }
      if (BOSS.maw > 0.6) BOSS.pull = Math.min(1, BOSS.pull + dt / 13);
      if (BOSS.pt > 2.5 && !BOSS.saidPull) { BOSS.saidPull = true; radio(C.lines.pull, true); }
      if (BOSS.pull >= 1) { BOSS.pull = 0.35; BOSS.lunge = 0.001; hitTug(22, null); radio(C.lines.chomp); SFX.chomp(); shake(1); }
    } else if (BOSS.phase === 99) {
      BOSS.dieT += dt;
      if (frnd() < dt * 9) { const p = vadd(BOSS.headP, vscl(randDir(frnd), HR * frr(0.5, 1.1))); FX.boom(p, frr(3, 7), frnd() < 0.5 ? [1, 0.45, 0.6] : [1, 0.6, 0.25]); SFX.boom(8); }
      if (BOSS.dieT > 1.5 && !BOSS.jack) { BOSS.jack = true; jackpot(mawP, BOSS.hf); radio(C.lines.win); }
      BOSS.emerge = Math.max(0, 1 - Math.max(0, BOSS.dieT - 2.5) * 0.4);
      if (BOSS.dieT > 5.2) { BOSS.phase = 100; finishRun(true); }
    }
    BOSS.pullOn = BOSS.phase === 3;
  },
  onKill(e) {
    const C = BOSS.cfg;
    if (e.kind === 'node') {
      const t = e.tent; SFX.roar(0.6);
      if (t.nodes.every(n => !n.alive)) { t.state = 'limp'; t.st = 0; radio(C.lines.sever); shake(0.4); }
      else if (t.state !== 'limp') { t.state = 'recoil'; t.st = 0; }
    } else if (e.kind === 'eye') { shake(0.3); SFX.roar(0.5); }
    else if (e.kind === 'bcore') { bossDying(); for (const t of BOSS.tent) if (t.alive) t.state = 'limp'; }
  },
  draw() {
    if (BOSS.emerge > 0.01 || BOSS.phase >= 2) {
      const HR = BOSS.cfg.HR;
      inst('bhead', BOSS.headP, BOSS.headQ, [HR, HR * (1 + Math.sin(BOSS.t * 1.3) * 0.02), HR], BOSS.cfg.tint || [1, 1, 1], 5, 0.6 + BOSS.maw * 0.8, 0, 3);
      const ms = HR * (0.3 + BOSS.maw * 0.22);
      inst('bteeth', vadd(BOSS.headP, vscl(BOSS.hf, HR * 0.86 + BOSS.maw * 2)), qmul(BOSS.headQ, qaxis([0, 0, 1], BOSS.t * 0.2)), [ms, ms, HR * 0.3], [1, 1, 1], 0, 1, 0, 2);
    }
  }
};
function spitEgg(p) { const g = spawnE('egg', { space: 'world', wp: p.slice(), wv: vscl(vnorm(vsub(TUG.W, p)), 26), spin: 1.5 }); g.home = 26; g.turn = 0.8; SFX.spit(); }

// ---- tube meshes (tentacles, worm bodies) rebuilt each frame into the dynamic VAO ----
const TENT_GEO = { n: 0 };
function buildTentGeo() {
  const tubes = BOSS.tubes || [];
  const nv = TENT_RINGS * (TENT_SIDES + 1), total = tubes.length * nv, maxT = 8;
  if (!TENT_GEO.P) {
    TENT_GEO.cap = maxT * nv; TENT_GEO.P = new Float32Array(TENT_GEO.cap * 3); TENT_GEO.N = new Float32Array(TENT_GEO.cap * 3); TENT_GEO.C = new Uint8Array(TENT_GEO.cap * 4); TENT_GEO.UV = new Float32Array(TENT_GEO.cap * 2);
    const I = []; for (let t = 0; t < maxT; t++) { const b = t * nv; for (let r = 0; r < TENT_RINGS - 1; r++) for (let s = 0; s < TENT_SIDES; s++) { const a = b + r * (TENT_SIDES + 1) + s, c = a + TENT_SIDES + 1; I.push(a, a + 1, c, c, a + 1, c + 1); } }
    TENT_GEO.I = new Uint32Array(I); TENT_GEO.iDirty = true;
  }
  let v = 0, n = 0;
  for (const tb of tubes) {
    if (n >= maxT || !tb.pts || tb.pts.length !== TENT_RINGS) continue;
    let up = tb.up.slice(); const col = tb.col || [70, 24, 62];
    for (let r = 0; r < TENT_RINGS; r++) {
      const u = r / (TENT_RINGS - 1), p = tb.pts[r], tan = vnorm(vsub(tb.pts[Math.min(r + 1, TENT_RINGS - 1)], tb.pts[Math.max(r - 1, 0)]));
      up = vnorm(vsub(up, vscl(tan, vdot(up, tan)))); if (!isFinite(up[0]) || vlen(up) < 0.5) up = vnorm(vcross(tan, [0.3, 0.1, 1]));
      const side = vcross(tan, up), rad = tb.rad(u);
      for (let s = 0; s <= TENT_SIDES; s++) {
        const a = s / TENT_SIDES * TAU, nn = vadd(vscl(up, Math.cos(a)), vscl(side, Math.sin(a)));
        TENT_GEO.P.set(vmad(p, nn, rad), v * 3); TENT_GEO.N.set(nn, v * 3);
        const dark = tb.shade ? tb.shade(u, a) : 0.7 + 0.3 * Math.cos(a);
        TENT_GEO.C[v * 4] = clamp(col[0] * dark, 0, 255); TENT_GEO.C[v * 4 + 1] = clamp(col[1] * dark, 0, 255); TENT_GEO.C[v * 4 + 2] = clamp(col[2] * dark, 0, 255); TENT_GEO.C[v * 4 + 3] = 6;
        TENT_GEO.UV[v * 2] = u * tb.len / 8; TENT_GEO.UV[v * 2 + 1] = s / TENT_SIDES;
        v++;
      }
    }
    n++;
  }
  TENT_GEO.n = n; TENT_GEO.count = n * (TENT_RINGS - 1) * TENT_SIDES * 6;
  if (!n) return;
  gl.bindVertexArray(DYNMESH.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, DYNMESH.pb); gl.bufferData(gl.ARRAY_BUFFER, TENT_GEO.P.subarray(0, v * 3), gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, DYNMESH.nb); gl.bufferData(gl.ARRAY_BUFFER, TENT_GEO.N.subarray(0, v * 3), gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, DYNMESH.cb); gl.bufferData(gl.ARRAY_BUFFER, TENT_GEO.C.subarray(0, v * 4), gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, DYNMESH.ub); gl.bufferData(gl.ARRAY_BUFFER, TENT_GEO.UV.subarray(0, v * 2), gl.DYNAMIC_DRAW);
  if (TENT_GEO.iDirty) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, DYNMESH.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, TENT_GEO.I, gl.STATIC_DRAW); TENT_GEO.iDirty = false; }
  gl.bindVertexArray(null);
}
