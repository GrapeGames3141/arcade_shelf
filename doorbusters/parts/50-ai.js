// ---------- rival shoppers (AI carts) ----------
const DIFF = [
  { name: 'Polite', skill: 0.88, aggr: 0.35, gang: 0.8 },
  { name: 'Pushy', skill: 0.97, aggr: 0.85, gang: 1.1 },
  { name: 'Feral', skill: 1.04, aggr: 1.5, gang: 1.6 },
];
const RIVALS = [
  ['Coupon Carl', '#2e86de'], ['Big Dave', '#e17055'], ['Grandma Rose', '#e84393'], ['Turbo Ted', '#00b894'], ['Deal Diane', '#6c5ce7'], ['Barb', '#fdcb6e'],
  ['Hank', '#576574'], ['Marcy', '#ff9f43'], ['Gus', '#10ac84'], ['Rhonda', '#ee5253'], ['Linda', '#0abde3'], ['Doug', '#5f27cd']
];
function makeBrain(diff, i) {
  const D = DIFF[diff];
  return {
    skill: D.skill * rr(0.95, 1.04), aggr: D.aggr * rr(0.5, 1.4), greed: rr(0.6, 1.4), caution: rr(650, 1500), gang: D.gang,
    state: 'line', tgt: null, path: null, pi: 0, replan: 0, decide: rr(0, 0.4), joustCd: rr(3, 9), joustT: 0, retreatT: 0, unstickT: 0, stuck: 0, tstate: 0, lastPos: [0, 0],
  };
}
function laneScore(c, L) {
  let s = hyp(L.x - c.x, -7 - c.z);
  if (L.occ && L.occ !== c) s += 14;
  for (const o of G.carts) if (o !== c && o.brain && o.brain.state === 'checkout' && o.brain.tgt && o.brain.tgt.ref === L) s += 6;
  if (L.express && c.items.length <= 3) s -= 6;
  if (L.express && c.items.length > 3) s += 8;
  return s;
}
function pickTarget(c, B) {
  let best = null, bs = -1e9;
  const free = CART_SLOTS - cartSlots(c);
  for (const p of W.pallets) {
    if (p.stock <= 0 || p.it.slots > free) continue;
    const d = hyp(p.x - c.x, p.z - c.z);
    let s = p.it.save * B.greed / (d + 8);
    // crowding: others heading there
    let n = 0; for (const o of G.carts) if (o !== c && o.brain && o.brain.tgt && o.brain.tgt.ref === p) n++;
    if (n >= p.stock) s *= 0.25;
    if (p.flash) s *= 1.8;
    s *= rr(0.85, 1.15);
    if (s > bs) { bs = s; best = { type: 'pallet', ref: p, x: p.x, z: p.z }; }
  }
  for (const f of W.floor) {
    if (ITEMS[f.kind].slots > free || f.owner === c && f.age < 1.2) continue;
    const d = hyp(f.x - c.x, f.z - c.z);
    const s = ITEMS[f.kind].save * 1.4 / (d + 3);
    if (s > bs) { bs = s; best = { type: 'floor', ref: f, x: f.x, z: f.z }; }
  }
  return best;
}
function aiDecide(c, B) {
  const T = G.saleT, n = c.items.length, val = cartValue(c), slots = cartSlots(c);
  if (G.phase === 'line') { B.state = 'line'; return; }
  if (B.state === 'joust' || B.state === 'retreat' || B.unstickT > 0) return;
  if (c.scanning) { B.state = 'checkout'; return; }
  // when to cash in
  let nearLane = 1e9; for (const L of LANES) nearLane = Math.min(nearLane, hyp(L.x - c.x, -7 - c.z));
  const eta = nearLane / 4 + n * 0.6 + 4;
  const wantOut = n > 0 && (slots >= CART_SLOTS - 0 || val >= B.caution || T < eta + 6 || (slots >= 4 && !pickTarget(c, B)));
  if (wantOut) {
    if (B.state !== 'checkout' || !B.tgt || B.tgt.type !== 'lane' || (B.tgt.ref.occ && B.tgt.ref.occ !== c && rnd() < 0.3)) {
      let bl = null, bsc = 1e9; for (const L of LANES) { const s = laneScore(c, L) * rr(0.9, 1.1); if (s < bsc) { bsc = s; bl = L; } }
      B.tgt = { type: 'lane', ref: bl, x: bl.x, z: -7 }; B.path = null;
    }
    B.state = 'checkout';
  } else {
    B.state = 'shop';
    const t = B.tgt;
    const stale = !t || t.type === 'lane' || t.type === 'cart' || (t.type === 'pallet' && (t.ref.stock <= 0 || t.ref.it.slots > CART_SLOTS - slots)) || (t.type === 'floor' && !W.floor.includes(t.ref)) || rnd() < 0.08;
    if (stale) { const nt = pickTarget(c, B); if (!t || !nt || nt.ref !== t.ref) { B.tgt = nt; B.path = null; } }
    else if (t.type === 'floor') { t.x = t.ref.x; t.z = t.ref.z; }
  }
  // joust?
  if (B.joustCd <= 0 && T < 175 && B.state !== 'checkout' || (B.joustCd <= 0 && B.aggr > 1.2 && B.state === 'checkout' && hyp(c.x, c.z + 7) > 14)) {
    let tc = null, ts = 0;
    for (const o of G.carts) {
      if (o === c) continue; const d = hyp(o.x - c.x, o.z - c.z); if (d > 13 || d < 2) continue;
      const v = cartValue(o); if (v < 200) continue;
      let s = v / (d + 4) * (o.isPlayer ? B.gang : 1);
      if (o.scanning) s *= 1.3;
      if (s > ts && navLOS(c.x, c.z, o.x, o.z)) { ts = s; tc = o; }
    }
    if (tc && rnd() < Math.min(0.85, 0.22 * B.aggr + ts / 600)) { B.state = 'joust'; B.joustT = 3.2; B.prevTgt = B.tgt; B.tgt = { type: 'cart', ref: tc, x: tc.x, z: tc.z }; B.path = null; B.hitTarget = false; if (tc.isPlayer && rnd() < 0.5) popText(c.x, 2.3, c.z, pick(['MINE!', 'GIMME!', 'OUTTA MY WAY!', 'THAT\'S MY TV!', 'MOVE IT!']), 'oof'); }
    else B.joustCd = rr(1.5, 3);
  }
}
function steerTo(c, tx, tz, thrMax = 1) {
  const dx = tx - c.x, dz = tz - c.z, want = Math.atan2(dx, dz), diff = angWrap(want - c.h);
  c.steer = clamp(-diff * 2.4, -1, 1);
  const a = Math.abs(diff);
  c.thr = a < 0.9 ? thrMax : a < 1.8 ? 0.35 : 0.15;
  return { d: hyp(dx, dz), diff };
}
function followPath(c, B, tx, tz, thrMax) {
  B.replan -= G.dtAI;
  if (!B.path || B.replan <= 0 || (B.pathTgt && hyp(B.pathTgt[0] - tx, B.pathTgt[1] - tz) > 1.5)) {
    B.path = navLOS(c.x, c.z, tx, tz) ? [[tx, tz]] : navPath(c.x, c.z, tx, tz); B.pi = 0; B.replan = rr(1.2, 2); B.pathTgt = [tx, tz];
    if (!B.path || !B.path.length) B.path = [[tx, tz]];
  }
  while (B.pi < B.path.length - 1 && hyp(B.path[B.pi][0] - c.x, B.path[B.pi][1] - c.z) < 1.6) B.pi++;
  const p = B.path[Math.min(B.pi, B.path.length - 1)];
  return steerTo(c, p[0], p[1], thrMax);
}
function aiControl(c, dt) {
  const B = c.brain;
  B.decide -= dt; B.joustCd -= dt;
  if (B.decide <= 0) { B.decide = 0.35; aiDecide(c, B); }
  c.shove = false;
  // unstick
  const sp = hyp(c.vx, c.vz);
  if (B.unstickT > 0) { B.unstickT -= dt; c.thr = -1; c.steer = B.unstickDir; return; }
  if (c.thr > 0.5 && sp < 0.45 && G.phase === 'sale' && !c.scanning) { B.stuck += dt; if (B.stuck > 1.1) { B.unstickT = rr(0.5, 0.9); B.unstickDir = rnd() < .5 ? -1 : 1; B.stuck = 0; B.path = null; return; } } else B.stuck = Math.max(0, B.stuck - dt * 2);
  if (G.phase === 'line') {
    const off = (c.id % 3 - 1) * 1.2;
    if (G.doorsOpen) { const r = followPath(c, B, off, -9, 1); if (rnd() < dt * 0.6 * B.aggr) c.shove = true; }
    else { // shuffle forward toward the door, jostling
      steerTo(c, Math.max(off, c.x - 3), 2.9, G.lineT < 3 ? 0.55 : 0.3);
      if (c.x < 6) { c.thr = 0; }
      if (rnd() < dt * 0.25 * B.aggr) c.shove = true;
    }
    return;
  }
  if (B.state === 'joust') {
    const o = B.tgt.ref; B.joustT -= dt;
    const lead = clamp(hyp(o.x - c.x, o.z - c.z) / 8, 0, 0.6);
    const r = steerTo(c, o.x + o.vx * lead, o.z + o.vz * lead, 1);
    if (r.d < 3.6 && Math.abs(r.diff) < 0.35) c.shove = true;
    if (B.joustT <= 0 || B.hitTarget || r.d > 18 || cartValue(o) < 80) { B.state = 'retreat'; B.retreatT = B.hitTarget ? rr(0.4, 0.8) : 0; B.joustCd = rr(4, 10) / Math.max(0.4, B.aggr); B.tgt = null; }
    return;
  }
  if (B.state === 'retreat') { B.retreatT -= dt; c.thr = -0.8; c.steer = 0.3; if (B.retreatT <= 0) { B.state = 'shop'; B.decide = 0; } return; }
  const t = B.tgt;
  if (!t) { c.thr = 0.3; c.steer = Math.sin(G.time + c.id) * 0.3; return; }
  if (t.type === 'lane') {
    const L = t.ref, inLane = Math.abs(c.x - L.x) < 1.1 && c.z > -10.5 && c.z < -4;
    if (c.scanning) { c.thr = sp > 0.6 ? -1 : 0; c.steer = 0; return; }
    if (!inLane) { // approach from the store side
      const ex = L.x, ez = c.z < -9.5 ? -12 : -2;
      if (hyp(c.x - ex, c.z - ez) < 1.8 || (Math.abs(c.x - L.x) < 1.0 && (c.z < -10 || c.z > -4))) steerTo(c, L.x, -7, 0.7);
      else followPath(c, B, ex, ez, 1);
    } else {
      const r = steerTo(c, L.x, -7, 0.55); if (r.d < 1.2) { c.thr = sp > 0.8 ? -1 : 0; }
    }
    return;
  }
  const r = followPath(c, B, t.x, t.z, 1);
  if (r.d < 4 && t.type === 'pallet') c.thr = Math.min(c.thr, 0.75);
  if (B.aggr > 1 && sp > 3 && rnd() < dt * 0.08) c.shove = true;
}
