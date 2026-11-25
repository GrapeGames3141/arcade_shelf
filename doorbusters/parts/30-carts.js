// ---------- carts: muscle-powered shopping carts ----------
const CART = {
  push: 8.5, vmax: 6.6, brake: 13, rev: 4, revMax: 2.4, roll: 1.3, steerLo: 2.7, steerHi: 1.75,
  lungeV: 4.2, lungeCap: 3.6, lungeCd: 1.7, lungeT: 0.45, mass0: 95,
  spillDv: 2.3, rFront: 0.42, rBack: 0.42, rPush: 0.33, offF: 0.32, offB: -0.22, offP: -0.98,
};
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a1665e'];
const COATS = ['#2e86de', '#e84393', '#00b894', '#fdcb6e', '#6c5ce7', '#e17055', '#0abde3', '#10ac84', '#ee5253', '#576574', '#ff9f43', '#5f27cd'];
const HATS = ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#a55eea', '#ffffff', '#2f3542', '#ff6b81'];

function makeLook(opt = {}) {
  return {
    skin: C(opt.skin || pick(SKIN)), coat: C(opt.coat || pick(COATS)), pants: C(pick(['#2f3542', '#57606f', '#3c6382', '#40407a', '#6d4c41'])),
    hat: C(opt.hat || pick(HATS)), scarf: C(pick(['#ff4757', '#eccc68', '#70a1ff', '#7bed9f', '#ffffff'])), hatType: opt.hatType ?? ri(0, 3),
    hair: C(pick(['#2d1b0e', '#5a3825', '#b5835a', '#e6c27a', '#888', '#111'])), size: opt.size || rr(0.95, 1.08), wide: rr(0.95, 1.15),
  };
}

let CART_ID = 0;
function makeCart(name, opts = {}) {
  return {
    id: CART_ID++, name, isPlayer: !!opts.player, x: 0, z: 0, h: 0, vx: 0, vz: 0, w: 0, grip: 1,
    items: [], banked: 0, bankedItems: [], look: makeLook(opts.look || {}), handle: C(opts.handle || pick(COATS)),
    lungeT: 0, lungeCd: 0, thr: 0, steer: 0, shove: false, anim: 0, armPush: 0,
    grabCd: 0, hitCd: 0, lastHitBy: null, lastHitT: 0, scanning: null, lane: null, stats: { rams: 0, spilled: 0, stolen: 0, bowled: 0, wrecked: 0, grabbed: 0 },
    brain: null, stuckT: 0, bumpSnd: 0, fullWarn: 0, wob: 0,
  };
}
const cartMass = (c) => CART.mass0 + c.items.reduce((s, i) => s + ITEMS[i].w, 0);
const cartSlots = (c) => c.items.reduce((s, i) => s + ITEMS[i].slots, 0);
const cartValue = (c) => c.items.reduce((s, i) => s + ITEMS[i].save, 0);
const fwdX = (h) => Math.sin(h), fwdZ = (h) => Math.cos(h);
function cartCircles(c, out) {
  const fx = fwdX(c.h), fz = fwdZ(c.h);
  out[0] = c.x + fx * CART.offF; out[1] = c.z + fz * CART.offF; out[2] = CART.rFront;
  out[3] = c.x + fx * CART.offB; out[4] = c.z + fz * CART.offB; out[5] = CART.rBack;
  out[6] = c.x + fx * CART.offP; out[7] = c.z + fz * CART.offP; out[8] = CART.rPush;
  return out;
}
const _cc = new Float32Array(9), _cc2 = new Float32Array(9);

function cartControl(c, dt, frozen) {
  const m = cartMass(c), load = m - CART.mass0;
  const fx = fwdX(c.h), fz = fwdZ(c.h), rx = -fz, rz = fx;
  let vF = c.vx * fx + c.vz * fz, vR = c.vx * rx + c.vz * rz;
  const skill = c.brain ? c.brain.skill : 1;
  const vmax = (CART.vmax - load * 0.035) * skill;
  let thr = frozen ? 0 : c.thr, steer = frozen ? 0 : c.steer;
  if (thr > 0.05) {
    const a = CART.push * thr * (CART.mass0 / m) ** 0.6 * skill;
    if (vF < vmax) vF = Math.min(vmax + (vF > vmax ? 0 : 0), vF + a * dt * (1 - Math.max(0, vF) / (vmax * 1.05)) * 1.15);
    else vF -= (vF - vmax) * 2 * dt;
  } else if (thr < -0.05) {
    if (vF > 0.25) vF = Math.max(0, vF - CART.brake * -thr * dt);
    else vF = Math.max(-CART.revMax, vF - CART.rev * -thr * dt);
  } else {
    const r = CART.roll * dt; vF = Math.abs(vF) <= r ? 0 : vF - Math.sign(vF) * r;
  }
  if (vF > vmax + 0.2 && c.lungeT <= 0) vF -= (vF - vmax) * 1.6 * dt;
  // shove lunge
  if (c.shove && c.lungeCd <= 0 && !frozen) {
    vF = Math.min(Math.max(vF, 0) + CART.lungeV, vmax + CART.lungeCap); c.lungeT = CART.lungeT; c.lungeCd = CART.lungeCd; c.armPush = 1;
    AU.whoosh(c);
  }
  c.shove = false;
  c.lungeT -= dt; c.lungeCd -= dt;
  // tyre grip: kill lateral speed (rear casters are fixed)
  c.grip = Math.min(1, c.grip + dt * 1.1);
  vR *= Math.exp(-(1.5 + c.grip * 11) * dt);
  c.vx = fx * vF + rx * vR; c.vz = fz * vF + rz * vR;
  // steering: pivot the cart with the handle
  const sp = Math.abs(vF), sr = lerp(CART.steerLo, CART.steerHi, clamp(sp / 6.5, 0, 1)) * (1 - load * 0.004);
  const wT = -steer * sr * (0.55 + 0.45 * c.grip);
  c.w += (wT - c.w) * Math.min(1, (3 + 9 * c.grip) * dt);
  c.h = angWrap(c.h + c.w * dt);
  c.x += c.vx * dt; c.z += c.vz * dt;
  c.anim += dt * (1.5 + Math.abs(vF) * 1.9);
  c.armPush = Math.max(0, c.armPush - dt * 2.5);
  c.grabCd -= dt; c.hitCd -= dt;
  c.wob = Math.max(0, c.wob - dt * 2);
}

// circle vs static AABBs, returns impact speed of strongest contact
function collideStatic(c, onHit) {
  cartCircles(c, _cc);
  let best = 0, bestCol = null;
  for (let k = 0; k < 3; k++) {
    let px = _cc[k * 3], pz = _cc[k * 3 + 1]; const r = _cc[k * 3 + 2];
    for (const b of COL) {
      if (!b.on) continue;
      if (px + r < b.x0 || px - r > b.x1 || pz + r < b.z0 || pz - r > b.z1) continue;
      const qx = clamp(px, b.x0, b.x1), qz = clamp(pz, b.z0, b.z1);
      let dx = px - qx, dz = pz - qz, d = hyp(dx, dz), nx, nz, pen;
      if (d > 1e-5) { if (d >= r) continue; nx = dx / d; nz = dz / d; pen = r - d; }
      else { // centre inside: push out along least axis
        const l = px - b.x0, rr_ = b.x1 - px, t = pz - b.z0, bb = b.z1 - pz, mn = Math.min(l, rr_, t, bb);
        if (mn === l) { nx = -1; nz = 0; pen = l + r; } else if (mn === rr_) { nx = 1; nz = 0; pen = rr_ + r; } else if (mn === t) { nx = 0; nz = -1; pen = t + r; } else { nx = 0; nz = 1; pen = bb + r; }
      }
      if (b.kind === 'display' && !b.ref.broken) {
        const spd = hyp(c.vx, c.vz);
        if (spd > 2.2) { breakDisplay(b.ref, c); continue; }
      }
      c.x += nx * pen; c.z += nz * pen; px += nx * pen; pz += nz * pen;
      // velocity at the contact point
      const ox = px - c.x, oz = pz - c.z;
      const vpx = c.vx + c.w * oz, vpz = c.vz - c.w * ox;
      const vn = vpx * nx + vpz * nz;
      if (vn < 0) {
        const e = 0.25, m = cartMass(c), I = m * 0.33, rn = oz * nx - ox * nz;
        const j = -(1 + e) * vn / (1 / m + rn * rn / I);
        c.vx += j * nx / m; c.vz += j * nz / m; c.w += rn * j / I;
        if (-vn > best) { best = -vn; bestCol = b; }
      }
    }
  }
  if (best > 0 && onHit) onHit(best, bestCol);
  return best;
}

// cart vs cart rigid impulses
function collideCarts(a, b, onHit) {
  if (hyp(a.x - b.x, a.z - b.z) > 3) return;
  cartCircles(a, _cc); cartCircles(b, _cc2);
  for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) {
    const ax = _cc[i * 3], az = _cc[i * 3 + 1], ar = _cc[i * 3 + 2], bx = _cc2[k * 3], bz = _cc2[k * 3 + 1], br = _cc2[k * 3 + 2];
    let dx = bx - ax, dz = bz - az, d = hyp(dx, dz); const R = ar + br;
    if (d >= R) continue;
    if (d < 1e-4) { dx = 1; dz = 0; d = 1e-4; }
    const nx = dx / d, nz = dz / d, pen = R - d;
    const ma = cartMass(a), mb = cartMass(b), Ia = ma * 0.33, Ib = mb * 0.33;
    // positional split by inverse mass
    const sa = mb / (ma + mb), sb = ma / (ma + mb);
    a.x -= nx * pen * sa; a.z -= nz * pen * sa; b.x += nx * pen * sb; b.z += nz * pen * sb;
    const px = ax + nx * ar, pz = az + nz * ar;
    const rax = px - a.x, raz = pz - a.z, rbx = px - b.x, rbz = pz - b.z;
    const vax = a.vx + a.w * raz, vaz = a.vz - a.w * rax, vbx = b.vx + b.w * rbz, vbz = b.vz - b.w * rbx;
    const vn = (vbx - vax) * nx + (vbz - vaz) * nz;
    if (vn >= 0) continue;
    const rna = raz * nx - rax * nz, rnb = rbz * nx - rbx * nz;
    const e = 0.35;
    let j = -(1 + e) * vn / (1 / ma + 1 / mb + rna * rna / Ia + rnb * rnb / Ib);
    // who is the rammer? the one moving harder into the other
    const aIn = a.vx * nx + a.vz * nz, bIn = -(b.vx * nx + b.vz * nz);
    const atk = aIn >= bIn ? a : b, vic = atk === a ? b : a;
    const boost = atk.lungeT > 0 ? 1.7 : 1;
    a.vx -= j * nx / ma; a.vz -= j * nz / ma; a.w -= rna * j / Ia;
    b.vx += j * nx / mb; b.vz += j * nz / mb; b.w += rnb * j / Ib;
    if (boost > 1) { // lunge: extra shove on the victim only
      const sgn = vic === b ? 1 : -1, extra = j * 0.7 / cartMass(vic);
      vic.vx += sgn * nx * extra; vic.vz += sgn * nz * extra; vic.w += (Math.random() - .5) * 3;
    }
    const dv = j * boost / cartMass(vic);
    if (onHit) onHit(atk, vic, dv, px, pz, -vn);
  }
}

// ---------- drawing ----------
const CARTCOL = { wire: C('#cfd6de'), wireDk: C('#8b95a1'), tire: C('#1b1b1f'), red: C('#e8202f') };
function drawCart(c, t) {
  const tilt = c.wob * Math.sin(t * 40) * 0.05;
  pushXf(c.x, 0, c.z, c.h, 0, tilt);
  const wc = CARTCOL.wire, wd = CARTCOL.wireDk;
  // chassis
  const y0 = 0.18;
  for (const s of [-1, 1]) { box(s * 0.22, y0, -0.05, 0.035, 0.035, 0.85, wd); }
  box(0, 0.3, -0.05, 0.42, 0.02, 0.7, wd); // lower tray
  for (const [x, z] of [[-.22, .36], [.22, .36], [-.2, -.42], [.2, -.42]]) {
    box(x, 0.11, z, 0.03, 0.12, 0.03, wd);
    put('cyl', x, 0.065, z, z > 0 ? -c.w * 0.4 : 0, 0, Math.PI / 2, 0.11, 0.035, 0.11, CARTCOL.tire);
  }
  // uprights to basket
  for (const s of [-1, 1]) { put('box', s * 0.24, 0.5, -0.43, 0, -0.15, 0, 0.035, 0.62, 0.035, wd); }
  // basket: bottom, rims, bars
  const bx = 0.29, bz0 = -0.46, bz1 = 0.46, by0 = 0.52, by1 = 0.98;
  box(0, by0, 0, bx * 2, 0.02, bz1 - bz0, wd);
  for (const s of [-1, 1]) {
    box(s * bx, by1, 0, 0.03, 0.03, bz1 - bz0, wc); box(s * bx, (by0 + by1) / 2, 0, 0.02, 0.02, bz1 - bz0, wc);
    for (let i = 0; i <= 6; i++) { const z = bz0 + (bz1 - bz0) * i / 6; box(s * bx, (by0 + by1) / 2, z, 0.018, by1 - by0, 0.018, wc); }
  }
  box(0, by1, bz1, bx * 2, 0.03, 0.03, wc); box(0, by1, bz0, bx * 2, 0.03, 0.03, wc);
  for (let i = 0; i <= 4; i++) { const x = -bx + bx * 2 * i / 4; box(x, (by0 + by1) / 2, bz1, 0.018, by1 - by0, 0.018, wc); box(x, (by0 + by1) / 2, bz0, 0.018, by1 - by0, 0.018, wc); }
  box(0, (by0 + by1) / 2, bz1, bx * 2, 0.02, 0.02, wc);
  // red bumper corners + child seat flap
  box(0, by1 + 0.01, bz1 + 0.02, bx * 2 + 0.04, 0.05, 0.05, CARTCOL.red);
  box(0, by1 - 0.12, bz0 + 0.06, bx * 2 - 0.04, 0.2, 0.02, CARTCOL.red);
  // handle
  for (const s of [-1, 1]) put('box', s * 0.27, by1 + 0.06, bz0 - 0.08, 0, 0.6, 0, 0.03, 0.2, 0.03, wc);
  put('cyl', 0, by1 + 0.14, bz0 - 0.15, 0, 0, Math.PI / 2, 0.05, 0.6, 0.05, c.handle);
  // contents
  let y = by0 + 0.02, i = 0;
  for (const k of c.items) {
    const it = ITEMS[k];
    const sx = Math.min(it.s[0], 0.62), sz = Math.min(it.s[2], 0.95);
    const ox = ((i * 37) % 7 - 3) * 0.02, oz = ((i * 53) % 9 - 4) * 0.03, ry = ((i * 29) % 5 - 2) * 0.12;
    if (it.k === 'tv') { put('box', 0, y + 0.09, oz * 0.3, ry * 0.3, 0, 0, it.s[0], it.s[2] + 0.02, it.s[1], [1, 1, 1, 0], ATLAS.rects['item_' + k]); y += 0.18; }
    else if (it.teddy) { drawTeddy(ox, y, oz, 0.75, ry); y += 0.35; }
    else { put('box', ox, y + it.s[1] / 2, oz, ry, 0, 0, sx, it.s[1], sz, [1, 1, 1, 0], ATLAS.rects['item_' + k]); y += it.s[1]; }
    i++;
  }
  if (c.isPlayer) put('cyl', 0, 0.02, -0.3, 0, 0, 0, 1.9, 0.02, 2.4, [1, 0.87, 0.18, 0.7]);
  // pusher
  const sp = hyp(c.vx, c.vz);
  drawPerson(c.look, 0, 0, CART.offP + 0.02, 0, { run: c.anim, speed: sp, push: true, lunge: c.armPush, handleY: by1 + 0.14, handleZ: bz0 - 0.15 - CART.offP });
  popXf();
}
function drawTeddy(x, y, z, s, ry) {
  const col = C('#b9773f'), lt = C('#e0b07a');
  pushXf(x, y, z, ry, 0, 0, s);
  sph(0, 0.22, 0, 0.22, col); sph(0, 0.5, 0.02, 0.17, col); sph(-0.12, 0.64, 0.02, 0.06, col); sph(0.12, 0.64, 0.02, 0.06, col);
  sph(0, 0.47, 0.15, 0.07, lt); sph(-0.06, 0.53, 0.15, 0.02, C('#111')); sph(0.06, 0.53, 0.15, 0.02, C('#111'));
  sph(-0.2, 0.3, 0.06, 0.08, col); sph(0.2, 0.3, 0.06, 0.08, col); sph(-0.1, 0.06, 0.12, 0.08, col); sph(0.1, 0.06, 0.12, 0.08, col);
  popXf();
}
// person: local origin at feet, facing +z. o: {run, speed, push, lunge, handleY, handleZ, sit, flail}
function drawPerson(L, x, y, z, ry, o, rx = 0, rz = 0) {
  const s = L.size;
  pushXf(x, y, z, ry, rx, rz, s);
  const sp = clamp((o.speed || 0) / 6, 0, 1), ph = o.run || 0;
  const lean = o.push ? 0.18 + sp * 0.25 + (o.lunge || 0) * 0.3 : sp * 0.15;
  const sw = Math.sin(ph * 3.2) * (0.25 + sp * 0.75);
  const hipY = 0.86, bob = Math.abs(Math.sin(ph * 3.2)) * 0.04 * sp;
  // legs
  for (const sd of [-1, 1]) {
    const a = sd * sw * (o.down ? 0 : 1) + (o.flail ? Math.sin(ph * 9 + sd) * 0.9 : 0);
    const kx = sd * 0.11, ky = hipY + bob - 0.42 * Math.cos(a), kz = 0.42 * Math.sin(a);
    const fy = ky - 0.42 * Math.cos(a * 0.4 - Math.max(0, -a) * 0.6), fz = kz + 0.42 * Math.sin(a * 0.4 - Math.max(0, -a) * 0.6);
    limb(kx, hipY + bob, 0, kx, ky, kz, 0.075, L.pants); limb(kx, ky, kz, kx, Math.max(0.06, fy), fz, 0.07, L.pants);
    box(kx, Math.max(0.05, fy - 0.01), fz + 0.05, 0.13, 0.09, 0.24, C('#2b2b2b'));
  }
  // torso (leaning)
  pushXf(0, hipY + bob, 0, 0, lean, 0);
  put('cyl', 0, 0.3, 0, 0, 0, 0, 0.44 * L.wide, 0.62, 0.32 * L.wide, L.coat);
  sph(0, 0.6, 0, 0.21 * L.wide, L.coat, 0.6);
  put('cyl', 0, 0.68, 0, 0, 0, 0, 0.26, 0.09, 0.26, L.scarf);
  // head
  const hy = 0.86;
  sph(0, hy, 0.02, 0.17, L.skin);
  sph(-0.055, hy + 0.03, 0.16, 0.025, C('#111')); sph(0.055, hy + 0.03, 0.16, 0.025, C('#111'));
  sph(0, hy - 0.02, 0.17, 0.035, shade(L.skin, 0.9));
  if (o.yell) box(0, hy - 0.08, 0.15, 0.08, 0.05, 0.03, C('#5a0d0d'));
  if (L.hatType === 0) { sph(0, hy + 0.08, 0.0, 0.18, L.hat, 0.75); sph(0, hy + 0.24, 0, 0.06, C('#fff')); box(0, hy + 0.04, 0, 0.36, 0.05, 0.36, shade(L.hat, .85)); }
  else if (L.hatType === 1) { sph(0, hy + 0.06, -0.02, 0.18, L.hair, 0.8); put('cyl', 0, hy + 0.13, 0.06, 0, 0, 0, 0.36, 0.03, 0.4, L.hat); box(0, hy + 0.1, 0.17, 0.26, 0.03, 0.14, L.hat); }
  else if (L.hatType === 2) { sph(0, hy + 0.07, -0.02, 0.185, L.hair, 0.85); put('cyl', -0.17, hy, 0, 0, 0, Math.PI / 2, 0.1, 0.05, 0.1, L.hat); put('cyl', 0.17, hy, 0, 0, 0, Math.PI / 2, 0.1, 0.05, 0.1, L.hat); limb(-0.17, hy, 0, 0.17, hy, 0, 0.012, L.hat); }
  else { sph(0, hy + 0.06, -0.03, 0.185, L.hair, 0.85); }
  // arms
  for (const sd of [-1, 1]) {
    const shX = sd * 0.2, shY = 0.56;
    let hx, hy2, hz;
    if (o.push) { // reach to handle (in cart space, compensate lean roughly)
      const reach = 0.42 + (o.lunge || 0) * 0.12;
      hx = sd * 0.2; hy2 = 0.42 - lean * 0.3; hz = reach;
    } else if (o.flail) { hx = sd * 0.35; hy2 = 0.75 + Math.sin(ph * 10 + sd) * 0.2; hz = 0.1; }
    else if (o.cheer) { hx = sd * 0.25; hy2 = 0.95 + Math.sin(ph * 8 + sd) * 0.05; hz = 0.05; }
    else { const a = -sd * sw * 0.8; hx = sd * 0.24; hy2 = shY - 0.5 * Math.cos(a); hz = 0.5 * Math.sin(a); }
    const ex = (shX + hx) / 2 + sd * 0.06, ey = (shY + hy2) / 2 - 0.04, ez = (0 + hz) / 2 - 0.06;
    limb(shX, shY, 0, ex, ey, ez, 0.06, L.coat); limb(ex, ey, ez, hx, hy2, hz, 0.055, L.coat);
    sph(hx, hy2, hz, 0.055, C('#e04040'));
  }
  popXf();
  popXf();
}
