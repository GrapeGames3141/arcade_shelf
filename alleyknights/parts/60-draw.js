// ---------- drawing characters and dynamic props (instanced spheres/cylinders posed every frame) ----------
const M_A = new Float32Array(16), M_B = new Float32Array(16);
const LC = {}; function lc(h) { return LC[h] || (LC[h] = hexLin(h)); }
function limb(a, b, r, col, alpha = 1) { m4between(M_A, a[0], a[1], a[2], b[0], b[1], b[2], r); glPush(MESH.cyl, M_A, col[0], col[1], col[2], alpha); }
function ellip(B, p, sx, sy, sz, col, alpha = 1, mesh = MESH.sph) { m4basis(M_A, B, p[0], p[1], p[2], sx, sy, sz); glPush(mesh, M_A, col[0], col[1], col[2], alpha); }
function eye(p, r, col) { M_A.fill(0); M_A[0] = M_A[5] = M_A[10] = r; M_A[15] = 1; M_A[12] = p[0]; M_A[13] = p[1]; M_A[14] = p[2]; glPush(MESH.glow, M_A, col[0], col[1], col[2], 1); }
// local -> world with basis B (column-major 3x3), origin o, uniform scale s
function LW(B, o, s, x, y, z) { return [o[0] + (B[0] * x + B[3] * y + B[6] * z) * s, o[1] + (B[1] * x + B[4] * y + B[7] * z) * s, o[2] + (B[2] * x + B[5] * y + B[8] * z) * s]; }
function flashCol(col, f) { return f > 0 ? [col[0] + 2, col[1] + 2, col[2] + 2] : col; }

// ---------- raccoon (the knights, and the bandit gang) ----------
// o: {x,y,z,yaw,phase,vx,vz,state,atk,block,bashT,hasLid,lid,lidMax,weapon,flash,bandana,fur,scale,crown,riding,kick}
function drawRaccoon(o, t) {
  const s = o.scale || 1, B0 = r3Y(o.yaw);
  let B = B0; const org = [o.x, o.y, o.z];
  const fur = lc(o.fur || 0x7d7c80), dark = lc(0x2a2826), light = lc(0xcac6be), mask = lc(0x121212);
  const f = o.flash > 0 ? 1 : 0; const F = c => flashCol(c, f);
  const sp = Math.hypot(o.vx || 0, o.vz || 0), moving = Math.min(1, sp / 3);
  const step = Math.sin(o.phase * 13) * moving, bob = Math.abs(Math.cos(o.phase * 13)) * 0.025 * moving;
  const dazed = o.state === 'dazed';
  let lean = (o.block ? 0.15 : 0) + (o.bashT > 0 ? 0.35 : 0) + moving * 0.08;
  if (o.tumble) B = m3mul(B0, r3X(o.tumble));
  if (dazed) { B = m3mul(B0, r3X(-0.5)); org[1] -= 0.12 * s; }
  const P = (x, y, z) => LW(B, org, s, x, y + bob, z);
  const BL = m3mul(B, r3X(lean));
  const PL = (x, y, z) => { const q = r3apply(BL, x, y - 0.22, z); const q2 = r3apply(B, 0, 0.22, 0); return [org[0] + (q[0] + q2[0]) * s, org[1] + (q[1] + q2[1] + bob) * s, org[2] + (q[2] + q2[2]) * s]; };
  // legs
  for (const side of [-1, 1]) {
    const kick = o.riding ? (side < 0 ? Math.max(0, Math.sin(o.phase * 6)) * 0.25 : 0) : 0;
    const hip = P(side * 0.075, 0.2, -0.01), foot = dazed ? P(side * 0.13, 0.05, 0.16) : P(side * 0.08, 0.035 + (o.riding ? 0 : Math.max(0, step * side) * 0.06), step * side * 0.11 - kick);
    limb(hip, foot, 0.042 * s, F(dark)); ellip(B, foot, 0.05 * s, 0.03 * s, 0.075 * s, F(dark));
  }
  // body, belly
  ellip(BL, PL(0, 0.36, 0), 0.165 * s, 0.2 * s, 0.15 * s, F(fur));
  ellip(BL, PL(0, 0.34, 0.06), 0.12 * s, 0.15 * s, 0.1 * s, F(light));
  if (o.bandana) { ellip(BL, PL(0, 0.5, 0.0), 0.13 * s, 0.035 * s, 0.12 * s, o.bandana); }
  // tail: ringed
  for (let i = 0; i < 6; i++) {
    const sw = Math.sin(o.phase * 3 + i * 0.6) * 0.02 * i;
    const p = PL(sw, 0.22 - i * 0.012 + Math.sin(i * 0.5) * 0.04, -0.14 - i * 0.065);
    const r = (0.07 - i * 0.006) * s; ellip(BL, p, r, r, r * 1.1, F(i % 2 ? dark : fur), 1, MESH.sphlo);
  }
  // head
  const hy = 0.62, hz = 0.02 + lean * 0.12;
  const head = PL(0, hy, hz);
  const BH = dazed ? m3mul(BL, r3Z(Math.sin(t * 5) * 0.3)) : BL;
  ellip(BH, head, 0.13 * s, 0.12 * s, 0.12 * s, F(fur));
  const HP = (x, y, z) => LW(BH, head, s, x, y, z);
  ellip(BH, HP(0, 0.02, 0.055), 0.128 * s, 0.045 * s, 0.085 * s, mask);              // the bandit mask
  ellip(BH, HP(0, 0.07, 0.07), 0.1 * s, 0.022 * s, 0.07 * s, F(light));               // brows
  ellip(BH, HP(0, -0.035, 0.1), 0.055 * s, 0.045 * s, 0.075 * s, F(light));           // snout
  ellip(BH, HP(0, -0.02, 0.175), 0.022 * s, 0.018 * s, 0.018 * s, mask);              // nose
  for (const side of [-1, 1]) {
    if (dazed) { ellip(BH, HP(side * 0.048, 0.022, 0.118), 0.018 * s, 0.006 * s, 0.006 * s, lc(0xffffff)); }
    else { ellip(BH, HP(side * 0.048, 0.022, 0.118), 0.02 * s, 0.022 * s, 0.012 * s, lc(0xf4f4f0)); eye(HP(side * 0.048, 0.024, 0.13), 0.009 * s, [0.05, 0.05, 0.05]); eye(HP(side * 0.052, 0.03, 0.134), 0.004 * s, [1.5, 1.5, 1.5]); }
    ellip(BH, HP(side * 0.08, 0.11, -0.01), 0.04 * s, 0.045 * s, 0.018 * s, F(dark));
    ellip(BH, HP(side * 0.08, 0.108, 0.002), 0.026 * s, 0.03 * s, 0.01 * s, F(light));
  }
  if (o.crown) { m4basis(M_A, BH, ...HP(0, 0.1, 0), s * 0.9, s * 0.9, s * 0.9); glPush(MESH.crown, M_A, 1, 1, 1, 1); }
  if (o.helmet) { m4basis(M_A, BH, ...HP(0, 0.075, 0.0), s * 0.55, s * 0.4, s * 0.55); glPush(MESH.lid, M_A, 1, 1, 1, 1); }
  // arms: right (-X) holds the weapon, left (+X) the lid
  const shR = PL(-0.15, 0.47, 0.02), shL = PL(0.15, 0.47, 0.02);
  if (o.riding) {
    const hR = LW(r3Y(o.yaw), [o.cartX, 0, o.cartZ], 1, -0.15, 1.0, -0.53), hL = LW(r3Y(o.yaw), [o.cartX, 0, o.cartZ], 1, 0.15, 1.0, -0.53);
    limb(shR, hR, 0.032 * s, F(fur)); limb(shL, hL, 0.032 * s, F(fur)); ellip(B, hR, 0.035 * s, 0.03 * s, 0.035 * s, F(dark)); ellip(B, hL, 0.035 * s, 0.03 * s, 0.035 * s, F(dark));
  } else {
    // weapon pose
    const a = o.atk; const wk = o.weapon ? o.weapon.k : 'fists';
    let sw = -0.35, pitch = 0.45, ext = 0.16;
    if (dazed) { sw = -0.9; pitch = 1.4; }
    else if (a) {
      const W = WEAPONS[a.k], side = o.swingSide || 1;
      if (a.phase === 'charge') { sw = 1.9 * side; pitch = 0.2 + Math.sin(t * 40) * 0.03 * a.charge; ext = 0.12; }
      else if (a.phase === 'wind') { const u = a.t / Math.max(0.01, W.wind); sw = lerp(-0.35, 1.3 * side, u); pitch = lerp(0.45, 1.1, u); }
      else if (a.phase === 'act') { const u = a.t / Math.max(0.01, W.act); sw = lerp(1.3 * side, -1.3 * side, smoothstep(0, 1, u)); pitch = W.reach > 2 ? 1.55 : 1.35; ext = 0.2; if (W.reach > 2) { sw *= 0.15; } }
      else { const u = a.t / Math.max(0.01, W.rec); sw = lerp(-1.3 * side, -0.35, u); pitch = lerp(1.35, 0.45, u); }
      if (W.throw || W.squirt || W.place) { pitch = a.phase === 'act' ? 1.5 : 0.9; sw = 0; }
    }
    const BW = m3mul(m3mul(BL, r3Y(sw)), r3X(pitch));
    const hand = [shR[0] + BW[3] * ext * s, shR[1] + BW[4] * ext * s, shR[2] + BW[5] * ext * s];
    limb(shR, hand, 0.032 * s, F(fur)); ellip(B, hand, 0.036 * s, 0.032 * s, 0.036 * s, F(dark));
    if (wk !== 'fists' && o.weapon) {
      const m = MESH['w_' + wk]; m4basis(M_A, BW, hand[0], hand[1], hand[2], wk === 'trap' ? 1 : 1, 1, 1);
      if (wk === 'trap') { const BT = m3mul(BW, r3X(-Math.PI / 2)); m4basis(M_A, BT, hand[0], hand[1], hand[2]); }
      glPush(m, M_A, 1, 1, 1, 1);
    }
    // lid
    if (o.hasLid) {
      let lp, BLd;
      if (o.block || o.bashT > 0) { lp = PL(0.02, 0.42, 0.25 + (o.bashT > 0 ? 0.12 : 0)); BLd = BL; }
      else if (dazed) { lp = P(0.32, 0.05, 0.1); BLd = m3mul(B, r3X(-Math.PI / 2)); }
      else { lp = PL(0.25, 0.38, 0.04 + step * 0.03); BLd = m3mul(BL, r3Y(Math.PI / 2 - 0.25)); }
      const handL = LW(BLd, lp, s, 0, 0, -0.07);
      limb(shL, handL, 0.032 * s, F(fur)); ellip(B, handL, 0.036 * s, 0.032 * s, 0.036 * s, F(dark));
      m4basis(M_A, BLd, lp[0], lp[1], lp[2], s * 0.95, s * 0.95, s * 0.95);
      glPush((o.lid / (o.lidMax || 100)) < 0.35 ? MESH.lidDent : MESH.lid, M_A, 1, 1, 1, 1);
    } else {
      const hL = PL(0.2, 0.3, 0.08); limb(shL, hL, 0.032 * s, F(fur)); ellip(B, hL, 0.036 * s, 0.032 * s, 0.036 * s, F(dark));
    }
  }
  if (dazed && F1() < 0.25) { const a = t * 6 + F1(0, TAU); particle({ x: head[0] + Math.cos(a) * 0.18, y: head[1] + 0.18, z: head[2] + Math.sin(a) * 0.18, vx: 0, vy: 0, vz: 0, life: 0.4, s0: 0.05, s1: 0.03, r: 1, g: 0.9, b: 0.3, a: 1, kind: 4, add: true, drag: 0, grav: 0, rot: a, rv: 3 }); }
}

// ---------- four-legged varmints ----------
const QUAD = {
  rat: { L: 0.3, R: 0.075, H: 0.07, head: 0.058, snout: 0.05, leg: 0.016, ear: 'round', earCol: 0xd99a9a, nose: 0xe08a8a, tail: 'thin', tailCol: 0xc99a90, tailLen: 0.38 },
  possum: { L: 0.46, R: 0.12, H: 0.1, head: 0.08, snout: 0.08, leg: 0.026, ear: 'round', earCol: 0x151515, nose: 0xf0a0b0, tail: 'thin', tailCol: 0xe8b8b0, tailLen: 0.42, face: 0xf2efe8 },
  cat: { L: 0.4, R: 0.09, H: 0.19, head: 0.085, snout: 0.035, leg: 0.022, ear: 'point', earCol: 0xc0702a, nose: 0xe89090, tail: 'up', tailCol: 0xc0702a, tailLen: 0.42, stripes: 0x7a4010 },
  skunk: { L: 0.38, R: 0.12, H: 0.07, head: 0.075, snout: 0.05, leg: 0.022, ear: 'round', earCol: 0x141416, nose: 0x222222, tail: 'bush', tailCol: 0x141416, tailLen: 0.4, stripe: 0xf2f2f2 }
};
function drawQuad(c, t) {
  const q = QUAD[c.k]; const s = c.scale; const d = c.def;
  const body = flashCol(lc(d.col), c.flash), belly = flashCol(lc(d.belly), c.flash);
  const sp = Math.hypot(c.vx, c.vz); const gait = Math.min(1, sp / 2.5); const ph = c.phase * (c.k === 'rat' ? 22 : c.k === 'cat' ? 13 : 11);
  let B = r3Y(c.yaw); let cy = q.H + q.R; let crouch = 0, stretch = 0;
  const dead = c.state === 'dead';
  if (c.state === 'windup') crouch = c.k === 'skunk' ? 0 : 0.35;
  if (c.state === 'pounce') stretch = 0.3;
  if (dead) { B = m3mul(B, r3Z(Math.PI * 0.94)); cy = q.R * 0.95; }
  else if (c.state === 'tumble') B = m3mul(B, r3X(c.spin));
  else if (c.state === 'get-up') B = m3mul(B, r3Z(Math.sin(c.t * 20) * 0.2));
  if (c.k === 'skunk' && (c.state === 'windup' || c.state === 'spray')) B = m3mul(B, r3X(-0.25));
  const org = [c.x, c.y + cy * s * (1 - crouch * 0.4), c.z];
  const P = (x, y, z) => LW(B, org, s, x, y, z * (1 + stretch));
  // body: three blobs
  ellip(B, P(0, 0, -q.L * 0.25), q.R * 1.05 * s, q.R * 0.95 * s, q.L * 0.32 * s, body);
  ellip(B, P(0, 0.005, q.L * 0.12), q.R * s, q.R * 0.92 * s, q.L * 0.3 * s, body);
  ellip(B, P(0, -q.R * 0.35, 0), q.R * 0.8 * s, q.R * 0.6 * s, q.L * 0.42 * s, belly);
  if (q.stripe) ellip(B, P(0, q.R * 0.7, 0), q.R * 0.35 * s, q.R * 0.35 * s, q.L * 0.5 * s, lc(q.stripe));
  if (q.stripes) for (let k = 0; k < 3; k++) ellip(B, P(0, q.R * 0.25, -q.L * 0.25 + k * q.L * 0.2), q.R * 1.07 * s, q.R * 0.9 * s, 0.018 * s, lc(q.stripes));
  // legs
  for (const [lx, lz, o] of [[1, 1, 0], [-1, 1, Math.PI], [1, -1, Math.PI], [-1, -1, 0]]) {
    const hip = P(lx * q.R * 0.6, -q.R * 0.3, lz * q.L * 0.32);
    const swing = dead ? 0 : Math.sin(ph + o) * gait * q.H * 0.9;
    const foot = dead ? P(lx * q.R * 0.75, -q.R - q.H * 1.0, lz * q.L * 0.36) : P(lx * q.R * 0.65, -cy + 0.01 + Math.max(0, Math.cos(ph + o)) * gait * 0.03, lz * q.L * 0.32 + swing);
    limb(hip, foot, q.leg * s, body);
  }
  // head
  const hz = q.L * 0.5 + q.head * 0.4, hy = q.R * 0.35 + (c.k === 'cat' ? 0.06 : 0);
  const head = P(0, hy, hz);
  const headCol = q.face ? flashCol(lc(q.face), c.flash) : body;
  ellip(B, head, q.head * s, q.head * 0.9 * s, q.head * s, headCol);
  ellip(B, P(0, hy - q.head * 0.25, hz + q.head * 0.6 + q.snout * 0.4), q.head * 0.5 * s, q.head * 0.42 * s, (q.head * 0.4 + q.snout * 0.6) * s, headCol);
  eye(P(0, hy - q.head * 0.15, hz + q.head * 0.85 + q.snout), 0.016 * s, lc(q.nose).map(v => v * 0.3));
  for (const side of [-1, 1]) {
    if (q.ear === 'point') { const e = P(side * q.head * 0.55, hy + q.head * 0.8, hz - q.head * 0.1); limb(P(side * q.head * 0.5, hy + q.head * 0.4, hz - q.head * 0.1), e, 0.028 * s, body); }
    else ellip(B, P(side * q.head * 0.6, hy + q.head * 0.75, hz - q.head * 0.15), q.head * 0.42 * s, q.head * 0.42 * s, q.head * 0.15 * s, lc(q.earCol));
    if (dead) { ellip(B, P(side * q.head * 0.4, hy + q.head * 0.25, hz + q.head * 0.85), 0.014 * s, 0.004 * s, 0.01 * s, lc(0x111111)); }
    else eye(P(side * q.head * 0.42, hy + q.head * 0.25, hz + q.head * 0.82), 0.014 * s, d.eye);
  }
  if (dead) ellip(B, P(0.02, hy - q.head * 0.5, hz + q.head * 1.1), 0.012 * s, 0.006 * s, 0.03 * s, lc(0xe86a8a)); // tongue out
  if (c.boss) { m4basis(M_A, B, ...P(0, hy + q.head * 0.85, hz), s * 0.7, s * 0.7, s * 0.7); glPush(MESH.crown, M_A, 1, 1, 1, 1); }
  // tail
  const tb = P(0, 0.0, -q.L * 0.55);
  if (q.tail === 'thin') { let prev = tb; for (let i = 1; i <= 6; i++) { const u = i / 6; const p = P(Math.sin(c.phase * 4 + u * 3) * 0.06 * u, -q.R * 0.3 - u * 0.04 + Math.sin(u * 3) * 0.02, -q.L * 0.55 - u * q.tailLen); limb(prev, p, (0.014 - u * 0.008) * s * (c.k === 'possum' ? 1.6 : 1), lc(q.tailCol)); prev = p; } }
  else if (q.tail === 'up') { let prev = tb; for (let i = 1; i <= 6; i++) { const u = i / 6; const p = P(Math.sin(c.phase * 2.5 + u * 2) * 0.05 * u, u * q.tailLen * 0.85, -q.L * 0.6 - Math.sin(u * 1.4) * 0.12 + (u > 0.8 ? 0.04 : 0)); limb(prev, p, 0.026 * s, body); prev = p; } }
  else { // skunk: huge plume, straight up when about to spray
    const up = c.state === 'windup' || c.state === 'spray' ? 1 : 0.55;
    for (let i = 0; i < 5; i++) { const u = (i + 1) / 5; const p = P(Math.sin(c.phase * 2 + u) * 0.03, u * q.tailLen * up + (1 - up) * u * 0.1, -q.L * 0.55 - u * 0.14 * (1.4 - up) + u * u * 0.1 * up); const r = (0.08 + u * 0.05) * s; ellip(B, p, r, r * 1.1, r, body); if (i > 1) ellip(B, LW(B, p, 1, 0, r * 0.4, -r * 0.2), r * 0.45, r * 0.6, r * 0.45, lc(0xf2f2f2)); }
  }
}

// ---------- birds ----------
function drawBird(c, t) {
  const s = c.scale, gull = c.k === 'gull';
  const body = flashCol(lc(c.def.col), c.flash), wingC = gull ? lc(0x9aa0a8) : lc(0x6a7280);
  let B = r3Y(c.yaw); if (c.state === 'tumble') B = m3mul(B, r3X(c.spin));
  if (c.flying) B = m3mul(B, r3X(-clamp(c.vy * 0.08, -0.4, 0.4)));
  const org = [c.x, c.y + 0.1 * s * (gull ? 1.3 : 1), c.z]; const sz = gull ? 1.35 : 1;
  const P = (x, y, z) => LW(B, org, s * sz, x, y, z);
  ellip(B, P(0, 0, 0), 0.075 * s * sz, 0.07 * s * sz, 0.12 * s * sz, body);
  if (!gull) ellip(B, P(0, 0.05, 0.07), 0.05 * s, 0.045 * s, 0.045 * s, lc(0x4a7a6a));   // iridescent neck
  ellip(B, P(0, 0.09, 0.1), 0.045 * s * sz, 0.045 * s * sz, 0.045 * s * sz, gull ? body : lc(0x5a6270));
  ellip(B, P(0, 0.08, 0.15), 0.012 * s * sz, 0.01 * s * sz, 0.03 * s * sz, gull ? lc(0xf2c230) : lc(0x2a2a2a));
  for (const side of [-1, 1]) eye(P(side * 0.03, 0.1, 0.13), 0.008 * s * sz, c.def.eye);
  ellip(B, P(0, 0.01, -0.13), 0.05 * s * sz, 0.012 * s * sz, 0.06 * s * sz, gull ? lc(0x2a2a2a) : wingC);
  const flap = c.flying ? Math.sin(c.phase * (gull ? 14 : 22)) * 0.9 : -1.2;
  for (const side of [-1, 1]) {
    const WB = m3mul(B, m3mul(r3Y(side > 0 ? 0 : Math.PI), r3Z(flap * side * (side > 0 ? 1 : -1))));
    const p = P(side * 0.05, 0.03, 0.0); m4basis(M_A, m3mul(B, r3Z(side * (c.flying ? flap : 1.2))), p[0], p[1], p[2], side * s * sz * (c.flying ? 1.2 : 0.55), s * sz, s * sz);
    glPush(MESH.wing, M_A, wingC[0], wingC[1], wingC[2], 1);
  }
  if (!c.flying) for (const side of [-1, 1]) limb(P(side * 0.025, -0.05, 0), P(side * 0.025, -0.1 / sz - 0.0, 0.01), 0.006 * s, lc(0xd07060));
  if (c.carry) { const p = P(0, -0.08, 0.05); m4basis(M_A, m3mul(B, r3X(Math.PI / 2)), p[0], p[1], p[2]); glPush(MESH['w_' + c.carry.k], M_A, 1, 1, 1, 1); }
}

function drawCritter(c, t) {
  if (c.state === 'gone' || c.state === 'binned') return;
  if (c.def.bird) return drawBird(c, t);
  if (c.k === 'bandit') {
    return drawRaccoon({ x: c.x, y: c.y, z: c.z, yaw: c.yaw, phase: c.phase, vx: c.vx, vz: c.vz, state: c.state === 'stun' ? 'dazed' : '', atk: c.state === 'windup' ? { k: 'fists', phase: 'wind', t: c.t } : null,
      block: c.hasLid && c.guard <= 0 && c.state !== 'tumble', hasLid: c.hasLid && c.guard <= 0, lid: 100, lidMax: 100, weapon: c.boss ? { k: 'club' } : null, flash: c.flash, fur: 0x5a5650,
      bandana: [0.8, 0.12, 0.12], scale: c.scale * 0.95, crown: !!c.boss, tumble: c.state === 'tumble' ? c.spin : 0, swingSide: 1 }, t);
  }
  drawQuad(c, t);
  if (c.stun > 0 && F1() < 0.2) { const a = t * 6 + F1(0, TAU); particle({ x: c.x + Math.cos(a) * 0.2 * c.scale, y: c.y + (QUAD[c.k] ? QUAD[c.k].H + QUAD[c.k].R * 2 + 0.15 : 0.4) * c.scale, z: c.z + Math.sin(a) * 0.2 * c.scale, vx: 0, vy: 0, vz: 0, life: 0.35, s0: 0.05, s1: 0.03, r: 1, g: 0.9, b: 0.3, a: 1, kind: 4, add: true, drag: 0, grav: 0, rot: a, rv: 3 }); }
}

// ---------- cart ----------
function drawCart(c, t) {
  let B = r3Y(c.yaw); let y = 0;
  if (c.state === 'tipped') { B = m3mul(B, r3Z(c.tilt)); y = 0.28; }
  else if (c.state === 'broken') return;
  const shake = c.state === 'ridden' && c.hp < 40 ? Math.sin(t * 60) * 0.01 : 0;
  const M = m4basis(new Float32Array(16), B, c.x, y + shake, c.z);
  const wear = c.hp / 100; glPush(MESH.cart, M, lerp(0.75, 0.2, wear), lerp(0.2, 0.55, wear), lerp(0.1, 0.25, wear), 1);
  for (const s of [-1, 1]) {
    const p = LW(B, [c.x, y, c.z], 1, s * 0.215, 0.19, 0.36);
    let cy = c.yaw + (c.hp < 70 ? Math.sin(t * 23 + s) * 0.6 : 0) + (c.hp < 40 && s === c.pull ? 1.2 : 0);
    let CB = r3Y(cy); if (c.state === 'tipped') CB = m3mul(B, r3Y(0.4 * s));
    if (c.hp < 15 && s === c.pull) { CB = m3mul(CB, r3Z(1.2)); }
    glPush(MESH.caster, m4basis(new Float32Array(16), CB, p[0], p[1], p[2]), 1, 1, 1, 1);
  }
}
