'use strict';
// ================= basics =================
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, TAU = Math.PI * 2;
const hyp = (x, y) => Math.sqrt(x * x + y * y);
const Q = new URLSearchParams(location.search), TEST = Q.has('test');
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash(x, y, s) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

// ================= physics: a small impulse-based rigid body engine =================
// Boxes and circles, sequential impulses with warm starting and accumulated clamping, box-box contacts by
// reference-face clipping (after Erin Catto's Box2D-Lite). Screen coordinates: +y is down. Units are pixels.
const PH = { g: 900, iters: 10, bias: 0.2, slop: 0.6, sub: 3 };
let BODIES = [], ARB = new Map(), NEXT_ID = 1;
function mkBody(o) {
  const b = Object.assign({ id: NEXT_ID++, x: 0, y: 0, a: 0, vx: 0, vy: 0, w: 0, shape: 'box', hw: 10, hh: 10, r: 10, dens: 1, fric: 0.6, rest: 0.05, stat: false, sleep: 0, asleep: false, kind: 'block' }, o);
  setMass(b); BODIES.push(b); return b;
}
function setMass(b) {
  if (b.stat) { b.m = 0; b.im = 0; b.I = 0; b.iI = 0; return; }
  if (b.shape === 'box') { const w = b.hw * 2, h = b.hh * 2; b.m = w * h * b.dens / 1000; b.I = b.m * (w * w + h * h) / 12; }
  else { b.m = Math.PI * b.r * b.r * b.dens / 1000; b.I = b.m * b.r * b.r / 2; }
  b.im = 1 / b.m; b.iI = 1 / b.I;
}
function removeBody(b) { const i = BODIES.indexOf(b); if (i >= 0) BODIES.splice(i, 1); for (const k of [...ARB.keys()]) { const a = ARB.get(k); if (a.b1 === b || a.b2 === b) ARB.delete(k); } }
function wake(b) { if (b.stat) return; b.asleep = false; b.sleep = 0; }
function aabb(b) {
  if (b.shape === 'circle') return [b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r];
  const c = Math.abs(Math.cos(b.a)), s = Math.abs(Math.sin(b.a)), ex = b.hw * c + b.hh * s, ey = b.hw * s + b.hh * c;
  return [b.x - ex, b.y - ey, b.x + ex, b.y + ey];
}
// --- contact generation: each returns contacts {x, y, nx, ny, sep} with the normal pointing from A to B
function collide(A, B) {
  if (A.shape === 'box' && B.shape === 'box') return boxBox(A, B);
  if (A.shape === 'circle' && B.shape === 'circle') {
    const dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy), s = d - A.r - B.r; if (s > 0) return null;
    const nx = d > 1e-6 ? dx / d : 0, ny = d > 1e-6 ? dy / d : 1;
    return [{ x: A.x + nx * A.r, y: A.y + ny * A.r, nx, ny, sep: s }];
  }
  const flip = A.shape === 'circle', box = flip ? B : A, cir = flip ? A : B;
  const c = Math.cos(box.a), s = Math.sin(box.a), dx = cir.x - box.x, dy = cir.y - box.y;
  const lx = c * dx + s * dy, ly = -s * dx + c * dy;
  let px = clamp(lx, -box.hw, box.hw), py = clamp(ly, -box.hh, box.hh), inside = false, nlx, nly, sep;
  if (px === lx && py === ly) { // centre inside the box: push out along the nearest face
    inside = true; const ox = box.hw - Math.abs(lx), oy = box.hh - Math.abs(ly);
    if (ox < oy) { px = Math.sign(lx || 1) * box.hw; nlx = Math.sign(lx || 1); nly = 0; sep = -ox - cir.r; }
    else { py = Math.sign(ly || 1) * box.hh; nlx = 0; nly = Math.sign(ly || 1); sep = -oy - cir.r; }
  } else { const ex = lx - px, ey = ly - py, d = hyp(ex, ey); sep = d - cir.r; if (sep > 0) return null; nlx = ex / d; nly = ey / d; }
  let nx = c * nlx - s * nly, ny = s * nlx + c * nly; const wx = box.x + c * px - s * py, wy = box.y + s * px + c * py;
  if (flip) { nx = -nx; ny = -ny; }
  return [{ x: wx, y: wy, nx, ny, sep }];
}
function boxBox(A, B) {
  const hA = [A.hw, A.hh], hB = [B.hw, B.hh];
  const cA = Math.cos(A.a), sA = Math.sin(A.a), cB = Math.cos(B.a), sB = Math.sin(B.a);
  const RA = [cA, sA, -sA, cA], RB = [cB, sB, -sB, cB];   // columns: [col1x, col1y, col2x, col2y]
  const dpx = B.x - A.x, dpy = B.y - A.y;
  const dA = [RA[0] * dpx + RA[1] * dpy, RA[2] * dpx + RA[3] * dpy], dB = [RB[0] * dpx + RB[1] * dpy, RB[2] * dpx + RB[3] * dpy];
  // C = RA^T RB
  const C = [RA[0] * RB[0] + RA[1] * RB[1], RA[2] * RB[0] + RA[3] * RB[1], RA[0] * RB[2] + RA[1] * RB[3], RA[2] * RB[2] + RA[3] * RB[3]];
  const aC = C.map(Math.abs);  // [c11, c21, c12, c22]
  const faceA = [Math.abs(dA[0]) - hA[0] - (aC[0] * hB[0] + aC[2] * hB[1]), Math.abs(dA[1]) - hA[1] - (aC[1] * hB[0] + aC[3] * hB[1])];
  if (faceA[0] > 0 || faceA[1] > 0) return null;
  const faceB = [Math.abs(dB[0]) - (aC[0] * hA[0] + aC[1] * hA[1]) - hB[0], Math.abs(dB[1]) - (aC[2] * hA[0] + aC[3] * hA[1]) - hB[1]];
  if (faceB[0] > 0 || faceB[1] > 0) return null;
  let axis = 0, sep = faceA[0], n = dA[0] > 0 ? [RA[0], RA[1]] : [-RA[0], -RA[1]];
  const rel = 0.95, abs = 0.01;
  if (faceA[1] > rel * sep + abs * hA[1]) { axis = 1; sep = faceA[1]; n = dA[1] > 0 ? [RA[2], RA[3]] : [-RA[2], -RA[3]]; }
  if (faceB[0] > rel * sep + abs * hB[0]) { axis = 2; sep = faceB[0]; n = dB[0] > 0 ? [RB[0], RB[1]] : [-RB[0], -RB[1]]; }
  if (faceB[1] > rel * sep + abs * hB[1]) { axis = 3; sep = faceB[1]; n = dB[1] > 0 ? [RB[2], RB[3]] : [-RB[2], -RB[3]]; }
  let fn, front, sn, side, negSide, posSide, inc;
  const dot = (ax, ay, bx, by) => ax * bx + ay * by;
  if (axis === 0) { fn = n; front = dot(A.x, A.y, fn[0], fn[1]) + hA[0]; sn = [RA[2], RA[3]]; side = dot(A.x, A.y, sn[0], sn[1]); negSide = -side + hA[1]; posSide = side + hA[1]; inc = incident(hB, B, RB, fn); }
  else if (axis === 1) { fn = n; front = dot(A.x, A.y, fn[0], fn[1]) + hA[1]; sn = [RA[0], RA[1]]; side = dot(A.x, A.y, sn[0], sn[1]); negSide = -side + hA[0]; posSide = side + hA[0]; inc = incident(hB, B, RB, fn); }
  else if (axis === 2) { fn = [-n[0], -n[1]]; front = dot(B.x, B.y, fn[0], fn[1]) + hB[0]; sn = [RB[2], RB[3]]; side = dot(B.x, B.y, sn[0], sn[1]); negSide = -side + hB[1]; posSide = side + hB[1]; inc = incident(hA, A, RA, fn); }
  else { fn = [-n[0], -n[1]]; front = dot(B.x, B.y, fn[0], fn[1]) + hB[1]; sn = [RB[0], RB[1]]; side = dot(B.x, B.y, sn[0], sn[1]); negSide = -side + hB[0]; posSide = side + hB[0]; inc = incident(hA, A, RA, fn); }
  let cp = clip(inc, -sn[0], -sn[1], negSide); if (cp.length < 2) return null;
  cp = clip(cp, sn[0], sn[1], posSide); if (cp.length < 2) return null;
  const out = [];
  for (const v of cp) { const s = dot(fn[0], fn[1], v[0], v[1]) - front; if (s <= 0) out.push({ x: v[0] - s * fn[0], y: v[1] - s * fn[1], nx: n[0], ny: n[1], sep: s }); }
  return out.length ? out : null;
}
function incident(h, b, R, fn) {
  const nx = -(R[0] * fn[0] + R[1] * fn[1]), ny = -(R[2] * fn[0] + R[3] * fn[1]);
  let v0, v1;
  if (Math.abs(nx) > Math.abs(ny)) { if (nx > 0) { v0 = [h[0], -h[1]]; v1 = [h[0], h[1]]; } else { v0 = [-h[0], h[1]]; v1 = [-h[0], -h[1]]; } }
  else { if (ny > 0) { v0 = [h[0], h[1]]; v1 = [-h[0], h[1]]; } else { v0 = [-h[0], -h[1]]; v1 = [h[0], -h[1]]; } }
  const w = v => [b.x + R[0] * v[0] + R[2] * v[1], b.y + R[1] * v[0] + R[3] * v[1]];
  return [w(v0), w(v1)];
}
function clip(vin, nx, ny, off) {
  const out = [], d0 = nx * vin[0][0] + ny * vin[0][1] - off, d1 = nx * vin[1][0] + ny * vin[1][1] - off;
  if (d0 <= 0) out.push(vin[0]); if (d1 <= 0) out.push(vin[1]);
  if (d0 * d1 < 0) { const t = d0 / (d0 - d1); out.push([vin[0][0] + t * (vin[1][0] - vin[0][0]), vin[0][1] + t * (vin[1][1] - vin[0][1])]); }
  return out;
}
// --- the step
const HOOK = { contact: null, step: null };   // the game listens for hard impacts and per-step effects
function physStep(dt) {
  const n = BODIES.length;
  // broadphase: sort by x
  const boxes = BODIES.map(b => ({ b, bb: aabb(b) })).sort((p, q) => p.bb[0] - q.bb[0]);
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    const P = boxes[i];
    for (let j = i + 1; j < n; j++) {
      const Qb = boxes[j]; if (Qb.bb[0] > P.bb[2]) break;
      if (Qb.bb[1] > P.bb[3] || Qb.bb[3] < P.bb[1]) continue;
      const A0 = P.b, B0 = Qb.b;
      if ((A0.stat || A0.asleep) && (B0.stat || B0.asleep)) { const k = A0.id < B0.id ? A0.id + ':' + B0.id : B0.id + ':' + A0.id; if (ARB.has(k)) seen.add(k); continue; }
      if (A0.ghost || B0.ghost) continue;
      const [A, B] = A0.id < B0.id ? [A0, B0] : [B0, A0], key = A.id + ':' + B.id;
      const cs = collide(A, B);
      if (!cs) { ARB.delete(key); continue; }
      seen.add(key);
      let arb = ARB.get(key);
      if (!arb) { arb = { b1: A, b2: B, cs: [], fresh: true }; ARB.set(key, arb); }
      // keep accumulated impulses for contacts that persist (matched by position)
      for (const c of cs) { c.pn = 0; c.pt = 0; for (const o of arb.cs) if (hyp(o.x - c.x, o.y - c.y) < 3) { c.pn = o.pn; c.pt = o.pt; break; } }
      arb.cs = cs;
      if (A.asleep && !B.asleep && !B.stat && hyp(B.vx, B.vy) > 30) wake(A);
      if (B.asleep && !A.asleep && !A.stat && hyp(A.vx, A.vy) > 30) wake(B);
    }
  }
  for (const k of ARB.keys()) if (!seen.has(k)) ARB.delete(k);
  // forces
  for (const b of BODIES) { if (b.stat || b.asleep || b.pinned) continue; b.vy += PH.g * dt * (b.grav ?? 1); if (b.ax) b.vx += b.ax * dt; b.vx *= 1 - 0.02 * dt; b.vy *= 1 - 0.02 * dt; b.w *= 1 - 0.3 * dt; }
  // pre-step: effective masses, bias, warm start, impact reports
  const idt = 1 / dt;
  for (const arb of ARB.values()) {
    const A = arb.b1, B = arb.b2, fr = Math.sqrt(A.fric * B.fric), e = Math.max(A.rest, B.rest);
    arb.fr = fr;
    for (const c of arb.cs) {
      const r1x = c.x - A.x, r1y = c.y - A.y, r2x = c.x - B.x, r2y = c.y - B.y;
      c.r1x = r1x; c.r1y = r1y; c.r2x = r2x; c.r2y = r2y;
      const rn1 = r1x * c.nx + r1y * c.ny, rn2 = r2x * c.nx + r2y * c.ny;
      c.mn = 1 / (A.im + B.im + A.iI * (r1x * r1x + r1y * r1y - rn1 * rn1) + B.iI * (r2x * r2x + r2y * r2y - rn2 * rn2));
      const tx = c.ny, ty = -c.nx, rt1 = r1x * tx + r1y * ty, rt2 = r2x * tx + r2y * ty;
      c.mt = 1 / (A.im + B.im + A.iI * (r1x * r1x + r1y * r1y - rt1 * rt1) + B.iI * (r2x * r2x + r2y * r2y - rt2 * rt2));
      const dvx = B.vx - B.w * r2y - A.vx + A.w * r1y, dvy = B.vy + B.w * r2x - A.vy - A.w * r1x, vn = dvx * c.nx + dvy * c.ny;
      c.bias = -PH.bias * idt * Math.min(0, c.sep + PH.slop) + (vn < -120 ? -e * vn : 0);
      if (arb.fresh && vn < -60 && HOOK.contact) HOOK.contact(A, B, -vn, c);
      const px = c.pn * c.nx + c.pt * tx, py = c.pn * c.ny + c.pt * ty;
      A.vx -= A.im * px; A.vy -= A.im * py; A.w -= A.iI * (r1x * py - r1y * px);
      B.vx += B.im * px; B.vy += B.im * py; B.w += B.iI * (r2x * py - r2y * px);
    }
    arb.fresh = false;
  }
  // iterate impulses
  for (let it = 0; it < PH.iters; it++) for (const arb of ARB.values()) {
    const A = arb.b1, B = arb.b2;
    for (const c of arb.cs) {
      let dvx = B.vx - B.w * c.r2y - A.vx + A.w * c.r1y, dvy = B.vy + B.w * c.r2x - A.vy - A.w * c.r1x;
      const vn = dvx * c.nx + dvy * c.ny;
      let dPn = c.mn * (-vn + c.bias); const p0 = c.pn; c.pn = Math.max(p0 + dPn, 0); dPn = c.pn - p0;
      let px = dPn * c.nx, py = dPn * c.ny;
      A.vx -= A.im * px; A.vy -= A.im * py; A.w -= A.iI * (c.r1x * py - c.r1y * px);
      B.vx += B.im * px; B.vy += B.im * py; B.w += B.iI * (c.r2x * py - c.r2y * px);
      dvx = B.vx - B.w * c.r2y - A.vx + A.w * c.r1y; dvy = B.vy + B.w * c.r2x - A.vy - A.w * c.r1x;
      const tx = c.ny, ty = -c.nx, vt = dvx * tx + dvy * ty;
      let dPt = c.mt * -vt; const mx = arb.fr * c.pn, t0 = c.pt; c.pt = clamp(t0 + dPt, -mx, mx); dPt = c.pt - t0;
      px = dPt * tx; py = dPt * ty;
      A.vx -= A.im * px; A.vy -= A.im * py; A.w -= A.iI * (c.r1x * py - c.r1y * px);
      B.vx += B.im * px; B.vy += B.im * py; B.w += B.iI * (c.r2x * py - c.r2y * px);
    }
  }
  // integrate and sleep
  for (const b of BODIES) {
    if (b.stat || b.asleep) continue;
    if (b.pinned) { b.vx = b.vy = b.w = 0; continue; }
    const sp = hyp(b.vx, b.vy); if (sp > 2400) { b.vx *= 2400 / sp; b.vy *= 2400 / sp; }
    b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
    if (b.kind === 'block' || b.kind === 'bell') {
      if (sp < 7 && Math.abs(b.w) < 0.1) { b.sleep += dt; if (b.sleep > 0.5) { b.asleep = true; b.vx = b.vy = b.w = 0; } } else b.sleep = 0;
    }
  }
  if (HOOK.step) HOOK.step(dt);
}
function physAdvance(dt) { const h = dt / PH.sub; for (let i = 0; i < PH.sub; i++) physStep(h); }
function contactsOf(b) { const out = []; for (const a of ARB.values()) if (a.b1 === b) out.push(a.b2); else if (a.b2 === b) out.push(a.b1); return out; }
