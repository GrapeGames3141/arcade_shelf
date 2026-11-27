// ===== Procedural posing: gait phase, leap, cling, stumble, doze, roar, bite, flap, glide, dive =====
// Each actor carries `an` (animation state). poseActor() fills actor.skin (Float32Array) and actor.bw (bone world matrices).
const R_ = (y, p, r) => eulerYPR(y, p, r);
function newAnim() { return { phase: Math.random() * TAU, spd: 0, run: 0, leap: 0, crouch: 0, climb: 0, stumble: 0, sleep: 0, roar: 0, bite: 0, jaw: 0, lookY: 0, lookP: 0, flap: 0, glide: 0, dive: 0, fold: 0, side: 1, t: Math.random() * 10, charge: 0, swim: 0, rear: 0, swing: 0, swingSide: 1 }; }

function poseBiped(sp, an, R) {
  const b = sp.rig.byName, t = an.t, φ = an.phase;
  const sw = an.swim; const live = (1 - an.sleep) * (1 - an.leap) * (1 - an.climb) * (1 - sw * 0.85);
  const A = lerp(0.32, 0.78, an.run) * Math.min(1, an.spd * 0.9) * live;
  const wob = an.stumble * Math.sin(t * 6.3) * 0.35;
  for (const [side, ph] of [['L', φ], ['R', φ + Math.PI]]) {
    const s = Math.sin(ph), flex = Math.max(0, Math.cos(ph));
    let th = A * 0.85 * s, sh = -flex * A * 1.5 - A * 0.15, ft = flex * A * 1.1 + A * 0.1, to = -th * 0.5 + flex * 0.4 * A;
    th += an.crouch * 0.55 + an.leap * 0.95 + an.climb * 1.0 + an.sleep * 0.5 * (1 - sw) + (side === 'L' ? wob : -wob) + sw * (-0.95 + 0.22 * Math.sin(t * 4.2 + (side === 'L' ? 0 : Math.PI)));
    sh += -an.crouch * 1.0 - an.leap * 1.55 - an.climb * 1.3 - an.sleep * 0.7 * (1 - sw) - sw * 0.3;
    ft += an.crouch * 0.6 + an.leap * 1.1 + an.climb * 0.9 + an.sleep * 0.4 * (1 - sw) + sw * 0.7;
    to += an.leap * -0.4 + an.climb * 0.6;
    R[b['thigh' + side]] = R_(0, th, 0); R[b['shin' + side]] = R_(0, sh, 0); R[b['foot' + side]] = R_(0, ft, 0); R[b['toe' + side]] = R_(0, to, 0);
    const arm = -s * A * 0.25 + an.leap * 0.9 + an.climb * (1.1 + Math.sin(t * 9 + (side === 'L' ? 0 : 2)) * 0.4) + an.sleep * 0.3 - sw * 0.6 * (1 - an.rear) + an.rear * 0.5;
    R[b['arm' + side]] = R_(side === 'L' ? -0.15 : 0.15, arm, 0); R[b['fore' + side]] = R_(0, 0.3 + an.leap * 0.5 + an.climb * 0.4, 0);
  }
  const bob = Math.sin(φ * 2) * 0.04 * A;
  const pelP = -0.1 * an.run * live - an.crouch * 0.15 - an.leap * 0.25 + an.climb * 0.2 + bob;
  R[b.pelvis] = R_(Math.sin(φ) * 0.05 * A + Math.sin(t * 3.2) * 0.07 * sw, pelP, wob * 0.3 + Math.sin(t * 1.6) * 0.05 * sw);
  R[b.chest] = R_(-Math.sin(φ) * 0.05 * A, 0.04 + Math.sin(t * 1.3) * 0.02 * (1 - live) * 0.5, 0);
  const lY = clamp(an.lookY, -1.2, 1.2), lP = clamp(an.lookP, -0.8, 0.8);
  let nP = 0.1 * an.run * live - an.stumble * 0.35 + an.roar * 0.55 - an.bite * 0.15 + lP * 0.4 - an.sleep * 0.45 * (1 - sw * 0.5) + an.leap * 0.15 - sw * 0.42 * (1 - an.rear) + an.rear * 0.35;
  let hP = -0.08 * an.run * live + an.roar * 0.25 - an.bite * 0.1 + lP * 0.6 - an.sleep * 0.15 + sw * 0.34 * (1 - an.rear);
  const shake = an.roar * Math.sin(t * 13) * 0.08 + an.stumble * Math.sin(t * 4.1) * 0.3;
  R[b.neck] = R_(lY * 0.45 + shake, nP, 0); R[b.head] = R_(lY * 0.55 + shake * 0.5, hP, an.stumble * Math.sin(t * 3.3) * 0.25);
  const jawOpen = clamp(an.jaw + an.roar * 0.75 + an.bite * (0.5 + 0.5 * Math.sin(t * 14)) + an.climb * (0.35 + 0.35 * Math.sin(t * 11)) + an.sleep * 0.08, 0, 1);
  R[b.jaw] = R_(0, -jawOpen * 0.55, 0);
  for (let i = 0; i < 4; i++) {
    const tw = Math.sin(φ - i * 0.7) * 0.07 * (A + 0.2) + Math.sin(t * 0.9 - i) * 0.04 + an.sleep * 0.22 * an.side * (1 - sw) + Math.sin(t * 3.2 - i * 0.85) * 0.3 * sw * (1 - an.sleep * 0.7);
    R[b['tail' + i]] = R_(tw, (an.run * 0.04 - an.leap * 0.05) * live - an.sleep * 0.02 + an.climb * 0.1, 0);
  }
}
function poseQuad(sp, an, R) {
  const b = sp.rig.byName, t = an.t, φ = an.phase; const walk = sp.id === 'longneck';
  const live = 1 - an.sleep;
  const A = (walk ? 0.32 : lerp(0.3, 0.62, an.run)) * Math.min(1, an.spd * (walk ? 1.2 : 0.6)) * live * (1 - an.stumble * 0.5);
  const off = walk ? { FL: 0, FR: Math.PI, BL: Math.PI * 1.5, BR: Math.PI * 0.5 } : { FL: 0, FR: Math.PI, BL: Math.PI, BR: 0 };
  for (const n of ['FL', 'FR', 'BL', 'BR']) {
    const ph = φ + off[n]; const s = Math.sin(ph), flex = Math.max(0, Math.cos(ph)); const front = n[0] === 'F';
    let up = A * s, lo = -flex * A * (front ? 1.3 : 0.9), ft = flex * A * 0.8;
    // lying down: legs folded under the body
    up += an.sleep * (front ? -1.0 : 1.05); lo += an.sleep * (front ? 2.1 : -2.0); ft += an.sleep * (front ? -0.9 : 0.9);
    up += an.stumble * Math.sin(t * 5 + (front ? 0 : 1.5)) * 0.15;
    R[b['up' + n]] = R_(0, up, 0); R[b['lo' + n]] = R_(0, lo, 0); R[b['ft' + n]] = R_(0, ft, 0);
  }
  const sg = an.swing * an.swingSide;
  R[b.pelvis] = R_(Math.sin(φ) * 0.03 * A - sg * 0.22, Math.sin(φ * 2) * 0.02 * A, Math.sin(φ) * 0.03 * A + an.sleep * 0.06 * an.side);
  R[b.chest] = R_(0, Math.sin(t * 1.1) * 0.01, 0);
  const necks = Object.keys(b).filter(k => k.startsWith('neck')).length;
  const lY = clamp(an.lookY, -1.3, 1.3), lP = clamp(an.lookP, -0.8, 0.8);
  for (let i = 0; i < necks; i++) {
    const sw = Math.sin(t * 0.7 + i * 0.5) * (walk ? 0.05 : 0.02) + lY / (necks + 1) * 0.9;
    let p = (walk ? -0.02 : 0) - an.charge * 0.18 + lP / (necks + 1) - an.stumble * 0.12 - an.sleep * (walk ? 0.32 : 0.35) + an.roar * 0.15;
    R[b['neck' + i]] = R_(sw + an.stumble * Math.sin(t * 3 + i) * 0.08 + an.sleep * (walk ? 0.12 : 0), p, 0);
  }
  R[b.head] = R_(lY * 0.3, -an.charge * 0.25 + lP * 0.4 - an.sleep * 0.2 + an.roar * 0.2, an.stumble * Math.sin(t * 2.7) * 0.2);
  R[b.jaw] = R_(0, -clamp(an.jaw + an.roar * 0.6 + an.sleep * 0.05, 0, 1) * 0.45, 0);
  const tails = Object.keys(b).filter(k => k.startsWith('tail')).length;
  for (let i = 0; i < tails; i++) R[b['tail' + i]] = R_(Math.sin(φ - i * 0.6) * 0.05 * (A + 0.15) + Math.sin(t * 0.6 - i * 0.8) * 0.04 + an.sleep * 0.15 * an.side + sg * 0.46, -an.sleep * 0.04 + (i === 0 ? -0.02 : 0.01) + Math.abs(an.swing) * 0.06, 0);
}
function posePtero(sp, an, R) {
  const b = sp.rig.byName, t = an.t;
  const flapA = an.flap * (1 - an.dive) * (1 - an.fold);
  const α = flapA * (0.8 * Math.sin(an.phase) + 0.15) + an.glide * (0.06 + 0.04 * Math.sin(t * 2.2)) * (1 - an.dive);
  const sweep = an.dive * 0.9 + an.fold * 1.25;
  const foF = -Math.max(0, -Math.cos(an.phase)) * 0.35 * flapA + an.dive * 0.5 + an.fold * 1.6;
  for (const side of ['L', 'R']) {
    const s = side === 'R' ? 1 : -1;
    R[b['up' + side]] = M4.mul(R_(-s * sweep, 0, 0), M4.rotX(-s * (α - an.fold * 0.6)));
    R[b['fo' + side]] = R_(s * foF, 0, 0);
    R[b['fi' + side]] = R_(-s * (an.dive * 0.4 + an.fold * 2.2) + s * foF * 0.3, 0, -s * 0.1 * flapA * Math.sin(an.phase - 0.8));
    R[b['leg' + side]] = R_(0, -0.3 - an.dive * 0.2 + an.fold * 0.6, 0);
  }
  R[b.neck] = R_(an.lookY * 0.5, an.lookP * 0.4 - an.dive * 0.25 - an.sleep * 0.3, 0);
  R[b.head] = R_(an.lookY * 0.5, an.lookP * 0.5 - an.sleep * 0.3, 0);
  R[b.jaw] = R_(0, -clamp(an.jaw, 0, 1) * 0.5, 0);
  R[b.tail] = R_(Math.sin(t * 3) * 0.1, 0, 0);
}
// root transform: rotate about the pivot (pelvis height), then lower for lying down
function poseActor(a) {
  const sp = a.sp, an = a.an; const nb = sp.bones.length;
  if (!a.R) { a.R = new Array(nb).fill(null); a.skin = new Float32Array(nb * 16); a.bw = new Array(nb); }
  for (let i = 0; i < nb; i++) a.R[i] = null;
  if (sp.kind === 'biped') poseBiped(sp, an, a.R); else if (sp.kind === 'quad') poseQuad(sp, an, a.R); else posePtero(sp, an, a.R);
  const H = sp.kind === 'ptero' ? 0 : sp.o.hipY;
  let restH = 0, roll = a.roll || 0;
  const sl = an.sleep * (1 - an.swim);   // a swimmer dozes afloat instead of lying down
  if (sp.kind === 'biped') { restH = sp.o.pelvisR[2] * 1.05; roll += -an.side * 1.42 * smooth(0, 1, sl); }
  else if (sp.kind === 'quad') { restH = sp.o.bodyR[1] * 0.92; roll += an.side * 0.12 * sl; }
  else restH = 0;
  const crouchDrop = sp.kind === 'biped' ? H * (0.22 * an.crouch + 0.3 * an.climb) : 0;
  const yOff = sp.kind === 'ptero' ? 0 : -(H - restH) * smooth(0.05, 0.9, sl) - crouchDrop;
  const M = M4.mul(M4.trans(a.pos[0], a.pos[1] + yOff, a.pos[2]), M4.mul(M4.rotY(a.yaw), M4.mul(M4.trans(0, H, 0), M4.mul(M4.rotZ(a.pitch || 0), M4.mul(M4.rotX(roll), M4.trans(0, -H, 0))))));
  a.rootM = M;
  fk(sp.rig, M, a.R, a.bw, a.skin);
}
// world-space hit capsules for darts
function actorCapsules(a) {
  const sp = a.sp; if (!a.caps) a.caps = sp.hit.map(h => ({ a: [0, 0, 0], b: [0, 0, 0], r: h.r, weak: h.weak, armor: h.armor, bone: h.bone }));
  for (let i = 0; i < sp.hit.length; i++) {
    const h = sp.hit[i], S = a.skin.subarray(h.bone * 16, h.bone * 16 + 16), c = a.caps[i];
    c.a = M4.pt(S, h.a); c.b = M4.pt(S, h.b);
  }
  return a.caps;
}
function headPos(a) { const sp = a.sp; const hb = sp.rig.byName.head; const S = a.skin.subarray(hb * 16, hb * 16 + 16); return M4.pt(S, [sp.eye[0], sp.eye[1], 0]); }
