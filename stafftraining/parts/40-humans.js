// ---------- the staff: rig, poses, plans (step lists), perception ----------
const LOOKS = [
  { name: 'Marcus', nick: 'CAN OPENER', s: 1.05, wide: 1.08, skin: C('#9a6b4b'), hair: C('#1d1814'), beard: true, specs: true,
    day: { top: C('#4f8a5b'), pants: C('#3a4a66'), shoe: C('#e9e4d8'), mat: 0 }, pj: { top: C('#7f9ac4'), pants: C('#56607a'), shoe: C('#5b4a44'), mat: 7 }, towel: { top: C('#f4f1ea'), pants: C('#9a6b4b'), shoe: C('#9a6b4b'), mat: 0 }, voice: 118 },
  { name: 'Dana', nick: 'THE LAP', s: 0.95, wide: 0.94, skin: C('#e6b48e'), hair: C('#7a3b24'), bun: true,
    day: { top: C('#d7a02c'), pants: C('#2f3340'), shoe: C('#c9546a'), mat: 0 }, pj: { top: C('#b79ad6'), pants: C('#8a79b0'), shoe: C('#f0c9d6'), mat: 7 }, towel: { top: C('#f4f1ea'), pants: C('#e6b48e'), shoe: C('#e6b48e'), mat: 0 }, voice: 232 }
];
const HUM = [];
function makeHuman(id) {
  return {
    id, look: LOOKS[id], name: LOOKS[id].name, x: 0, z: 0, y: 0, h: 0, outfit: 'day', pose: 'stand', poseT: 0, P: null, seat: null, lying: false, hidden: false,
    plan: [], cur: null, planName: '', pri: 0, path: null, pathI: 0, walkPh: 0, speed: 0, moving: false,
    patience: 100, guilt: 0, awake: true, sleep: 0, demand: null, demandIdle: 0, pinned: false, knowsFed: false, fedCount: 0, calmT: 0,
    bubble: null, headYaw: 0, lookCat: 0, carry: null, talkT: 0, cd: {}, zz: 0, pillow: 0, bedOff: 0, trip: 0, stats: { incidents: 0, caves: 0, fetch: 0, doors: 0, woke: 0 },
    pers: id === 0 ? { annoy: 0.8, push: 1.25, sleepK: 0.6, cute: 1.2 } : { annoy: 1.2, push: 0.85, sleepK: 1.5, cute: 0.9 }
  };
}
const partner = h => HUM[1 - h.id];
function basePose() { return { hipY: 0.9, hipZ: 0, lean: 0, headP: 0, lhx: -0.25, lhy: 0.84, lhz: 0.02, rhx: 0.25, rhy: 0.84, rhz: 0.02, lfx: -0.1, lfy: 0.02, lfz: 0, rfx: 0.1, rfy: 0.02, rfz: 0, rootRx: 0, rootY: 0 }; }
function poseTarget(h, T) {
  let p = h.pose; const t = G.time, B = basePose(); Object.assign(T, B); if (p === 'lie' && h.pillow > 0) p = 'liePillow';
  const hands = (lx, ly, lz, rx, ry, rz) => { T.lhx = lx; T.lhy = ly; T.lhz = lz; T.rhx = rx; T.rhy = ry; T.rhz = rz; };
  const feet = (lz, rz, y = 0.02, x = 0.1) => { T.lfx = -x; T.rfx = x; T.lfz = lz; T.rfz = rz; T.lfy = T.rfy = y; };
  if (h.moving) {
    const sw = Math.sin(h.walkPh), k = h.shuffle ? 0.45 : 1; T.lfz = sw * 0.3 * k; T.rfz = -sw * 0.3 * k; T.lfy = 0.02 + Math.max(0, Math.cos(h.walkPh)) * 0.07 * k; T.rfy = 0.02 + Math.max(0, -Math.cos(h.walkPh)) * 0.07 * k;
    T.hipY = 0.89 + Math.abs(Math.cos(h.walkPh)) * 0.02; T.lean = h.shuffle ? 0.16 : 0.05;
    if (h.shuffle) { T.headP = 0.3; hands(-0.24, 0.8, 0.05, 0.24, 0.8, 0.05); } else { T.lhz = -sw * 0.2; T.rhz = sw * 0.2; }
    if (h.carry === 'cat') hands(-0.1, 1.1, 0.34, 0.1, 1.1, 0.34); else if (h.carry) { T.rhx = 0.2; T.rhy = 1.0; T.rhz = 0.26; }
    return;
  }
  switch (p) {
    case 'sit': case 'tv': T.hipY = 0.52; T.lean = -0.14; feet(0.42, 0.42, 0.02, 0.11); hands(-0.15, 0.64, 0.26, 0.15, 0.64, 0.26); break;
    case 'read': T.hipY = 0.52; T.lean = -0.1; T.headP = 0.32; feet(0.42, 0.42, 0.02, 0.11); hands(-0.1, 0.86, 0.33, 0.1, 0.86, 0.33); break;
    case 'lapcat': T.hipY = 0.52; T.lean = -0.12; T.headP = 0.4; feet(0.42, 0.42, 0.02, 0.11); hands(-0.2, 0.72, 0.2, 0.08, 0.78, 0.3 + Math.sin(t * 3) * 0.05); break;
    case 'phone': T.hipY = 0.52; T.lean = -0.1; T.headP = 0.35; feet(0.42, 0.42, 0.02, 0.11); hands(-0.15, 0.64, 0.26, 0.06, 0.9, 0.3); break;
    case 'type': T.hipY = 0.55; T.lean = 0.12; T.headP = 0.12; feet(0.36, 0.36, 0.02, 0.11); hands(-0.13, 0.8 + Math.sin(t * 17) * 0.012, 0.44, 0.13, 0.8 + Math.sin(t * 19 + 1) * 0.012, 0.44); break;
    case 'typeAround': T.hipY = 0.55; T.lean = 0.16; T.headP = 0.2; feet(0.36, 0.36, 0.02, 0.11); hands(-0.3, 0.8, 0.42, 0.3, 0.8 + Math.sin(t * 15) * 0.012, 0.42); break;
    case 'lie': T.rootRx = -Math.PI / 2; hands(-0.26, 0.86, 0.04, 0.3, 1.66, -0.02); T.headP = -0.05; break;
    case 'lieAwake': T.rootRx = -Math.PI / 2; T.lean = 0.42; T.headP = 0.25; hands(-0.26, 0.9, 0.2, 0.26, 0.9, 0.2); break;
    case 'lieSit': T.rootRx = -Math.PI / 2; T.lean = 1.15; T.headP = 0.1; hands(-0.2, 1.0, 0.45, 0.2, 1.0, 0.45); break;
    case 'liePillow': T.rootRx = -Math.PI / 2; hands(-0.2, 1.62, 0.2, 0.2, 1.62, 0.2); break;
    case 'lieRead': T.rootRx = -Math.PI / 2; T.lean = 0.75; T.headP = 0.3; hands(-0.1, 1.05, 0.5, 0.1, 1.05, 0.5); break;
    case 'bend': case 'pour': T.hipY = 0.66; T.lean = 1.05; T.headP = -0.3; feet(-0.06, -0.06, 0.02, 0.13); hands(-0.22, 0.6, 0.1, 0.06, p === 'pour' ? 0.36 : 0.12, 0.5); break;
    case 'crouch': T.hipY = 0.42; T.lean = 0.5; T.headP = 0.1; feet(0.06, 0.06, 0.02, 0.15); hands(-0.2, 0.45, 0.2, 0.08, 0.3 + Math.sin(t * 5) * 0.03, 0.46); break;
    case 'reach': hands(-0.25, 0.84, 0.02, 0.14, 1.02, 0.46); T.lean = 0.12; break;
    case 'reachHi': hands(-0.25, 0.84, 0.02, 0.14, 1.5, 0.4); break;
    case 'hips': hands(-0.2, 0.96, 0.06, 0.2, 0.96, 0.06); T.lean = 0.1; T.headP = 0.25; break;
    case 'point': hands(-0.2, 0.96, 0.06, 0.1, 1.12, 0.5); T.lean = 0.14; T.headP = 0.3; break;
    case 'spray': hands(-0.25, 0.84, 0.02, 0.14, 1.18, 0.52); T.lean = 0.2; T.headP = 0.3; break;
    case 'carry': hands(-0.1, 1.1, 0.34, 0.1, 1.1, 0.34); T.headP = 0.3; break;
    case 'hold': hands(-0.25, 0.84, 0.02, 0.2, 1.0, 0.26); break;
    case 'shrug': hands(-0.44, 1.42, 0.08, 0.44, 1.42, 0.08); T.headP = -0.2; break;
    case 'facepalm': hands(-0.25, 0.84, 0.02, 0.04, 1.6, 0.13); T.headP = 0.35; break;
    case 'stumble': T.lean = 0.55 + Math.sin(t * 14) * 0.15; hands(-0.5, 1.3 + Math.sin(t * 20) * 0.2, 0.2, 0.5, 1.3 + Math.cos(t * 20) * 0.2, 0.2); feet(0.25, -0.2); break;
    case 'yawn': hands(-0.34, 1.86, -0.02, 0.34, 1.86, -0.02); T.headP = -0.3; T.lean = -0.1; break;
    case 'sweep': T.lean = 0.6; T.headP = 0.2; hands(-0.05, 0.75, 0.3 + Math.sin(t * 6) * 0.1, 0.1, 0.55, 0.4 + Math.sin(t * 6) * 0.1); feet(0.05, -0.1, 0.02, 0.14); break;
    case 'kneel': T.hipY = 0.3; T.lean = 0.7; T.headP = 0.1; feet(-0.3, -0.3, 0.05, 0.13); hands(-0.2 + Math.sin(t * 5) * 0.1, 0.1, 0.4, 0.2 + Math.cos(t * 5) * 0.1, 0.1, 0.45); break;
    case 'shower': hands(-0.14, 1.66 + Math.sin(t * 6) * 0.03, 0.08, 0.14, 1.66 + Math.cos(t * 6) * 0.03, 0.08); break;
    case 'cook': hands(-0.2, 0.98, 0.34, 0.14 + Math.sin(t * 7) * 0.05, 1.02, 0.44); T.headP = 0.3; break;
    case 'sip': hands(-0.25, 0.84, 0.02, 0.08, 1.5, 0.16); T.headP = -0.1; break;
    case 'door': hands(-0.25, 0.84, 0.02, 0.2, 1.0, 0.45); break;
    case 'arms': hands(0.12, 1.12, 0.18, -0.12, 1.08, 0.2); T.headP = 0.2; break;
    case 'wave': hands(-0.25, 0.84, 0.02, 0.36, 1.6 + Math.sin(t * 9) * 0.05, 0.1); break;
  }
  if (h.carry === 'cat' && p !== 'carry') hands(-0.1, 1.1, 0.34, 0.1, 1.1, 0.34);
}
const _PT = {};
function humanPoseUpdate(h, dt, snap) { poseTarget(h, _PT); if (!h.P || snap) { h.P = Object.assign({}, _PT); return; } const k = h.moving ? 18 : 9; for (const n in _PT) h.P[n] = damp(h.P[n], _PT[n], n === 'rootRx' ? 7 : k, dt); }
function ik2(S, T, a, b, bx, by, bz) {
  let dx = T[0] - S[0], dy = T[1] - S[1], dz = T[2] - S[2], d = hyp(dx, dy, dz) || 1e-4; const mx = a + b - 0.002;
  if (d > mx) { T[0] = S[0] + dx / d * mx; T[1] = S[1] + dy / d * mx; T[2] = S[2] + dz / d * mx; d = mx; }
  dx /= d; dy /= d; dz /= d; const x = (a * a - b * b + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, a * a - x * x));
  const dot = bx * dx + by * dy + bz * dz; let px = bx - dot * dx, py = by - dot * dy, pz = bz - dot * dz; const pl = hyp(px, py, pz) || 1; px /= pl; py /= pl; pz /= pl;
  return [S[0] + dx * x + px * hh, S[1] + dy * x + py * hh, S[2] + dz * x + pz * hh];
}
function shoulderPt(P, sd, wide) { const cl = Math.cos(P.lean), sl = Math.sin(P.lean); return [sd * 0.2 * wide, P.hipY + 0.52 * cl, P.hipZ + 0.52 * sl]; }
// world position of a hand (side 0 = right, 1 = left); upright poses only
function humanHand(h, side) { const P = h.P, s = h.look.s, lx = (side ? P.lhx : P.rhx) * s, ly = (side ? P.lhy : P.rhy) * s, lz = (side ? P.lhz : P.rhz) * s, c = Math.cos(h.h), sn = Math.sin(h.h); return [h.x + lx * c + lz * sn, h.y + ly, h.z - lx * sn + lz * c]; }
function humanHead(h) { if (h.lying) { const s = h.look.s; return [h.x - Math.sin(h.h) * 1.55 * s + 0, h.y + 0.12 + (h.pose === 'lieSit' ? 0.5 : h.pose === 'lieRead' ? 0.35 : 0), h.z - Math.cos(h.h) * (h.pose === 'lieSit' ? 0.95 : 1.55) * s]; } const P = h.P, s = h.look.s; return [h.x + Math.sin(h.h) * (P.hipZ + Math.sin(P.lean) * 0.7) * s, h.y + (P.hipY + 0.72 * Math.cos(P.lean)) * s, h.z + Math.cos(h.h) * (P.hipZ + Math.sin(P.lean) * 0.7) * s]; }

function drawHuman(h) {
  if (h.hidden) return;
  const P = h.P, L = h.look, O = L[h.outfit], s = L.s, w = L.wide, t = G.time, asleep = !h.awake;
  pushXf(h.x, h.y + P.rootY, h.z, h.h, P.rootRx, 0, s);
  for (const sd of [-1, 1]) {
    const H = [sd * 0.1, P.hipY, P.hipZ], F = [sd < 0 ? P.lfx : P.rfx, sd < 0 ? P.lfy : P.rfy, sd < 0 ? P.lfz : P.rfz];
    const K = ik2(H, F, 0.45, 0.45, 0, 0.15, 1);
    limb(H[0], H[1], H[2], K[0], K[1], K[2], 0.078, O.pants); limb(K[0], K[1], K[2], F[0], F[1] + 0.03, F[2], 0.066, O.pants);
    if (!h.lying) put('box', F[0], F[1] + 0.015, F[2] + 0.045, 0, 0, 0, 0.1, 0.065, 0.22, O.shoe);
  }
  pushXf(0, P.hipY, P.hipZ, 0, P.lean, 0);
  put('cyl', 0, 0.27, 0, 0, 0, 0, 0.4 * w, 0.56, 0.25 * w, O.top, O.mat ? [O.mat, 0, 0, 0] : undefined);
  put('sph', 0, 0.55, 0, 0, 0, 0, 0.42 * w, 0.2, 0.27 * w, O.top); put('cyl', 0, -0.03, 0, 0, 0, 0, 0.37 * w, 0.16, 0.25 * w, O.pants);
  put('cyl', 0, 0.66, 0, 0, 0, 0, 0.11, 0.1, 0.11, L.skin);
  pushXf(0, 0.79, 0.01, h.headYaw, P.headP, 0);
  sph(0, 0, 0, 0.118, L.skin); sph(0, -0.02, 0.118, 0.022, shade(L.skin, 0.88));
  const ang = clamp((35 - h.patience) / 35, 0, 1), eo = asleep || h.blinkT > 0;
  for (const sd of [-1, 1]) {
    if (eo) put('box', sd * 0.045, 0.02, 0.105, 0, 0, 0, 0.035, 0.006, 0.01, C('#1a1412')); else sph(sd * 0.045, 0.022, 0.102, 0.018, C('#1a1412'));
    put('box', sd * 0.046, 0.058 - ang * 0.012, 0.105, 0, 0, sd * (0.08 - ang * 0.5) + (h.guilt > 60 ? -sd * 0.3 : 0), 0.045, 0.008, 0.01, L.hair);
    sph(sd * 0.118, 0, 0, 0.022, L.skin);
  }
  const talk = h.talkT > 0 ? 0.5 + 0.5 * Math.sin(t * 24) : asleep ? 0.6 + 0.3 * Math.sin(t * 1.6 + h.id) : 0;
  put('box', 0, -0.058, 0.103, 0, 0, 0, 0.045 + ang * 0.01, 0.008 + talk * 0.03, 0.01, C('#5a1f1f'));
  if (L.beard) { put('sph', 0, -0.06, 0.03, 0, 0, 0, 0.2, 0.13, 0.19, L.hair); put('sph', 0, 0.045, -0.018, 0, 0, 0, 0.245, 0.2, 0.235, L.hair); }
  if (L.specs) { for (const sd of [-1, 1]) { put('box', sd * 0.046, 0.022, 0.104, 0, 0, 0, 0.066, 0.05, 0.004, C('#20242c')); put('box', sd * 0.046, 0.022, 0.107, 0, 0, 0, 0.054, 0.038, 0.004, C('#e6eef2')); } put('box', 0, 0.03, 0.105, 0, 0, 0, 0.03, 0.008, 0.004, C('#20242c')); }
  if (L.bun) { put('sph', 0, 0.04, -0.02, 0, 0, 0, 0.25, 0.215, 0.245, L.hair); sph(0, 0.15, -0.05, 0.062, L.hair); put('sph', 0, -0.03, -0.07, 0, 0, 0, 0.22, 0.2, 0.14, L.hair); }
  popXf(); popXf();
  for (const sd of [-1, 1]) {
    const S = shoulderPt(P, sd, w), T = [sd < 0 ? P.lhx : P.rhx, sd < 0 ? P.lhy : P.rhy, sd < 0 ? P.lhz : P.rhz];
    const E = ik2(S, T, 0.29, 0.27, sd * 0.35, -1, -0.55);
    limb(S[0], S[1], S[2], E[0], E[1], E[2], 0.058, O.top); limb(E[0], E[1], E[2], T[0], T[1], T[2], 0.05, h.outfit === 'day' && h.id === 1 ? O.top : L.skin); if (h.outfit === 'towel') limb(S[0], S[1], S[2], E[0], E[1], E[2], 0.06, L.skin); sph(T[0], T[1], T[2], 0.052, L.skin);
  }
  // carried things, in root space at the right hand
  const hx = P.rhx, hy = P.rhy, hz = P.rhz;
  if (h.carry === 'spray') { cyl(hx, hy + 0.02, hz + 0.04, 0.035, 0.14, C('#4fb0d8')); box(hx, hy + 0.11, hz + 0.07, 0.04, 0.05, 0.09, C('#e04040')); }
  else if (h.carry === 'kibble') { put('box', hx, hy + 0.02, hz + 0.08, 0, 0, 0, 0.2, 0.3, 0.1, C('#ffffff'), ATLAS.rects.kibble); }
  else if (h.carry === 'book') { put('box', (P.lhx + P.rhx) / 2, hy + 0.04, hz + 0.03, 0, -0.5, 0, 0.26, 0.2, 0.03, C('#ffffff'), ATLAS.rects.book); }
  else if (h.carry === 'phone') { box(hx, hy + 0.05, hz + 0.02, 0.07, 0.13, 0.012, C('#20242c')); }
  else if (h.carry === 'mug') { cyl(hx, hy + 0.04, hz + 0.05, 0.04, 0.09, C('#f1e4cc')); }
  else if (h.carry === 'pan') { put('cyl', hx, hy + 0.02, hz + 0.1, 0, 0, 0, 0.26, 0.04, 0.26, C('#30333a')); }
  else if (h.carry === 'broom') { limb(hx, hy + 0.3, hz - 0.1, hx, 0.08, hz + 0.3, 0.014, C('#b9935a')); box(hx, 0.05, hz + 0.32, 0.26, 0.08, 0.05, C('#e0b13c')); }
  else if (h.carry && h.carry.def) drawPropShape(h.carry, hx, hy + 0.05, hz + 0.06, 0, 0);
  popXf();
  // duvet lump over anyone lying in bed
  if (h.lying) { const sit = h.pose === 'lieSit' || h.pose === 'lieRead'; put('sph', h.x, 0.64, h.z - (sit ? 0.36 : 0.56), 0, 0, 0, 0.74, 0.5, sit ? 1.1 : 1.5, COLS.duvet, [5, 0, 0, 0]); if (h.pillow > 0) put('sph', h.x, 0.78, h.z - 1.6 * s, 0, 0.2, 0, 0.6, 0.16, 0.4, COLS.linen); }
}

// ---------- plans ----------
function setPlan(h, name, steps, pri = 0) { if (h.carry && h.carry.def && name !== h.planName) dropCarried(h); h.plan = steps.slice(); h.cur = null; h.planName = name; h.pri = pri; h.moving = false; h.path = null; }
const stepGo = (x, z, o) => Object.assign({ k: 'go', x, z }, o || {});
const stepSpot = (n, o) => Object.assign({ k: 'go', x: SPOT[n].x, z: SPOT[n].z, face: SPOT[n].h }, o || {});
const stepPose = (p, len) => ({ k: 'pose', p, len });
const stepSay = (s, len) => ({ k: 'say', s, len });
const stepDo = f => ({ k: 'do', f });
const stepWait = (len, p) => ({ k: 'wait', len, p });
const stepUntil = (f, p, max) => ({ k: 'until', f, p, max });
const stepSeat = (spot, p) => ({ k: 'seat', spot, p });
const stepLie = (spot, p) => ({ k: 'lie', spot, p });
const stepFaceCat = () => ({ k: 'faceCat' });
const stepChase = (r, max, sp) => ({ k: 'chase', r, max, sp });

function humanSay(h, s, t) { if (!s) return; if (Array.isArray(s)) s = pick(s); if (TEST) { (G.log = G.log || []).push(fmtClock(G.clock) + ' ' + h.name + ': ' + s); } h.bubble = { text: s, t: t || clamp(1.4 + s.length * 0.055, 1.8, 4.2) }; h.talkT = Math.min(1.6, 0.4 + s.length * 0.04); AU.blah(h, s); }
function leaveSeat(h) {
  const sp = SPOT[h.seat]; h.seat = null; h.lying = false; h.pinned = false;
  if (sp && sp.ax !== undefined) return { k: 'slide', x: sp.ax, z: sp.az, t: 0, dur: 0.5, x0: h.x, z0: h.z, y0: h.y, y1: 0 };
  return null;
}
function humanStep(h, dt) {
  let guard = 0;
  while (guard++ < 6) {
    if (!h.cur) {
      h.cur = h.plan.shift();
      if (!h.cur) { h.planName = ''; h.pri = 0; h.moving = false; LESSON.schedule(h); if (!h.plan.length) return; continue; }
      const c = h.cur; c.t = 0;
      if ((c.k === 'go' || c.k === 'chase' || c.k === 'seat' || c.k === 'lie') && h.seat && !(c.k === 'seat' && c.spot === h.seat) && !(c.k === 'lie' && c.spot === h.seat)) { const sl = leaveSeat(h); if (sl) { h.plan.unshift(c); h.cur = sl; h.pose = 'stand'; } }
      if (h.cur.k === 'go') { h.path = navPath(h.x, h.z, c.x, c.z); h.pathI = 0; }
    }
    const c = h.cur; c.t += dt; let done = false;
    switch (c.k) {
      case 'slide': { const k = clamp(c.t / c.dur, 0, 1); h.x = lerp(c.x0, c.x, k); h.z = lerp(c.z0, c.z, k); h.y = lerp(c.y0, c.y1, k); if (c.h !== undefined) h.h = angAppr(h.h, c.h, 8 * dt); done = k >= 1; if (done && c.p) h.pose = c.p; break; }
      case 'seat': case 'lie': {
        const sp = SPOT[c.spot];
        if (h.seat === c.spot) { h.pose = c.p; done = true; break; }
        if (d2(h.x, h.z, sp.ax, sp.az) > 0.25 && !c.went) { c.went = true; h.plan.unshift(c); h.cur = stepGo(sp.ax, sp.az); h.cur.t = 0; h.path = navPath(h.x, h.z, sp.ax, sp.az); h.pathI = 0; continue; }
        h.seat = c.spot; h.lying = c.k === 'lie'; h.moving = false; h.pose = c.p;
        h.cur = { k: 'slide', x: sp.x + (c.k === 'lie' ? (h.id ? 1 : -1) * h.bedOff : 0), z: sp.z, t: 0, dur: 0.5, x0: h.x, z0: h.z, y0: h.y, y1: c.k === 'lie' ? 0.68 : 0, h: c.k === 'lie' ? 0 : sp.h, p: c.p }; continue;
      }
      case 'go': case 'chase': {
        if (c.k === 'chase') {
          c.rp = (c.rp || 0) - dt; if (c.rp <= 0) { c.rp = 0.35; h.path = navPath(h.x, h.z, CAT.x, CAT.z); h.pathI = 0; }
          const dc = d2(h.x, h.z, CAT.x, CAT.z);
          if (dc < (CAT.y > 0.3 ? c.r : Math.min(c.r, 0.85))) { h.chaseOk = true; done = true; h.moving = false; break; }
          if (c.t > c.max) { h.chaseOk = false; done = true; h.moving = false; break; }
        }
        const wp = h.path && h.path[h.pathI];
        if (!wp) { if (c.k === 'chase') { h.moving = false; break; } done = true; h.moving = false; if (c.face !== undefined) h.plan.unshift({ k: 'face', a: c.face }); break; }
        // doors on the way
        let blocked = false;
        for (const k in DOORS) { const d = DOORS[k]; if (k === 'front') continue; if (segBox(h.x, h.z, wp[0], wp[1], d.x0, d.x1, d.z - 0.3, d.z + 0.3) && Math.abs(h.z - d.z) < 1.0) { if (d.tgt < 1 && !d.propped) { d.tgt = 1; AU.door(); } if (d.keepClosed) d.by = h; if (d.open < 0.6) blocked = true; h.usedDoor = d; } }
        const sp = (c.sp || (h.shuffle ? 0.75 : 1.4)) * (blocked ? 0 : 1), dx = wp[0] - h.x, dz = wp[1] - h.z, dd = hyp(dx, dz);
        h.moving = !blocked; h.pose = 'stand';
        if (dd < 0.08 + sp * dt) { h.x = wp[0]; h.z = wp[1]; h.pathI++; }
        else if (!blocked) { h.h = angAppr(h.h, Math.atan2(dx, dz), 7 * dt); h.x += dx / dd * sp * dt; h.z += dz / dd * sp * dt; h.walkPh += sp * dt * 4.2; }
        h.speed = sp; break;
      }
      case 'face': h.h = angAppr(h.h, c.a, 6.5 * dt); done = Math.abs(angWrap(c.a - h.h)) < 0.03; break;
      case 'faceTo': { const a = angTo(h.x, h.z, c.x, c.z); h.h = angAppr(h.h, a, 6.5 * dt); done = Math.abs(angWrap(a - h.h)) < 0.05 || c.t > 1; break; }
      case 'faceCat': { const a = angTo(h.x, h.z, CAT.x, CAT.z); h.h = angAppr(h.h, a, 6.5 * dt); done = Math.abs(angWrap(a - h.h)) < 0.05 || c.t > 1; break; }
      case 'pose': h.pose = c.p; h.moving = false; done = c.t >= (c.len || 0); break;
      case 'wait': if (c.p) h.pose = c.p; h.moving = false; done = c.t >= (c.len || 0); break;
      case 'say': humanSay(h, c.s, c.len); done = true; break;
      case 'do': c.f(h); done = true; break;
      case 'until': if (c.p) h.pose = c.p; h.moving = false; done = c.f(h, c.t) || (c.max !== undefined && c.t >= c.max); break;
    }
    if (!done) return;
    h.cur = null;
    if (h.usedDoor && d2(h.x, h.z, (h.usedDoor.x0 + h.usedDoor.x1) / 2, h.usedDoor.z) > 0.9 && !h.moving) h.usedDoor = null;
  }
}

function humanSees(h) {
  if (!h.awake || h.hidden || CAT.mode === 'hidden') return false;
  const d = d2(h.x, h.z, CAT.x, CAT.z); if (d > 11) return false;
  const face = h.h + h.headYaw + (h.lying ? Math.PI : 0); if (d > 0.9 && Math.abs(angWrap(angTo(h.x, h.z, CAT.x, CAT.z) - face)) > 1.35) return false;
  return losClear(h.x, h.z, CAT.x, CAT.z);
}
function humanHears(h, x, z) { let k = losClear(h.x, h.z, x, z) ? 1 : roomOf(h.x, h.z) === roomOf(x, z) ? 1 : 0.5; if (h.planName === 'shower') k *= 0.5; return k; }
function humanUpdate(h, dt) {
  h.blinkT = (h.blinkT || 0) - dt; if (h.blinkT < -rr(2, 5)) h.blinkT = 0.12;
  h.talkT -= dt; if (h.bubble) { h.bubble.t -= dt; if (h.bubble.t <= 0) h.bubble = null; }
  for (const k in h.cd) if (h.cd[k] > 0) h.cd[k] -= dt;
  humanStep(h, dt);
  // head follows the cat when interested
  h.lookCat -= dt; let ty = 0;
  if (h.lookCat > 0 && h.awake && !h.lying) ty = clamp(angWrap(angTo(h.x, h.z, CAT.x, CAT.z) - h.h), -1.15, 1.15);
  h.headYaw = damp(h.headYaw, ty, 6, dt);
  humanPoseUpdate(h, dt);
}
