// ---------- loot, pallets, displays, debris, props ----------
function roomFor(c, kind) { return cartSlots(c) + ITEMS[kind].slots <= CART_SLOTS; }

function spill(c, n, dx, dz, by) {
  let out = 0;
  for (let i = 0; i < n && c.items.length; i++) {
    const k = c.items.pop(); out++;
    const a = Math.atan2(dx, dz) + rr(-1.1, 1.1), sp = rr(1.5, 3.5);
    W.floor.push({ kind: k, x: c.x + rr(-.2, .2), y: 1.1, z: c.z + rr(-.2, .2), vx: c.vx * 0.5 + Math.sin(a) * sp, vy: rr(3, 5), vz: c.vz * 0.5 + Math.cos(a) * sp, ry: rr(0, TAU), rx: 0, rz: 0, spin: rr(-8, 8), age: 0, owner: c, rest: false });
  }
  if (out) { c.stats.spilled += out; if (by) by.stats.rams++; }
  return out;
}
function takeItem(c, kind, from) {
  c.items.push(kind); c.stats.grabbed++;
  if (from && from !== c) c.stats.stolen++;
  if (c.isPlayer) { AU.grab(); popText(c.x, 1.9, c.z, '+' + ITEMS[kind].e + ' ' + money(ITEMS[kind].save), 'money'); }
}
function tryPickups(c) {
  const fx = fwdX(c.h), fz = fwdZ(c.h), px = c.x + fx * 0.5, pz = c.z + fz * 0.5;
  // floor loot
  for (let i = W.floor.length - 1; i >= 0; i--) {
    const f = W.floor[i];
    if (f.y > 0.7 || f.age < (f.owner === c ? 1.2 : 0.45)) continue;
    if (hyp(f.x - px, f.z - pz) > 0.9 && hyp(f.x - c.x, f.z - c.z) > 0.75) continue;
    if (!roomFor(c, f.kind)) { if (c.isPlayer) fullNag(c); continue; }
    W.floor.splice(i, 1); takeItem(c, f.kind, f.owner);
  }
  // pallets
  if (c.grabCd > 0) return;
  for (const p of W.pallets) {
    if (p.stock <= 0) continue;
    const m = 0.55;
    if (px < p.x - p.hw - m || px > p.x + p.hw + m || pz < p.z - p.hd - m || pz > p.z + p.hd + m) continue;
    if (!roomFor(c, p.kind)) { if (c.isPlayer) fullNag(c); continue; }
    p.stock--; SEMI_DIRTY = true; c.grabCd = 0.35; takeItem(c, p.kind, null);
    if (p.stock === 0 && p.flash) { W.flash = null; }
    if (p.stock === 0 && rnd() < 0.5) pa(pick([`${p.it.n}s are SOLD OUT.`, `That's the last ${p.it.n}!`, `${p.it.n}: gone!`]), 3);
    break;
  }
}
function fullNag(c) { if (c.fullWarn > 0) return; c.fullWarn = 2.5; popText(c.x, 2.1, c.z, 'CART FULL! → CHECKOUT', 'bad'); AU.buzz(); }

function breakDisplay(d, c) {
  d.broken = true; d.col.on = false; SEMI_DIRTY = true;
  const vx = c.vx, vz = c.vz;
  for (const b of d.blocks) {
    W.debris.push({ t: b.t, c: b.c, b: b.b, x: d.x + b.x, y: b.y, z: d.z + b.z, vx: vx * rr(0.4, 1.0) + rr(-1.5, 1.5), vy: rr(1, 4), vz: vz * rr(0.4, 1.0) + rr(-1.5, 1.5), rx: 0, ry: rr(0, TAU), rz: 0, wx: rr(-9, 9), wy: rr(-4, 4), wz: rr(-9, 9), rest: false });
  }
  while (W.debris.length > 700) W.debris.shift();
  c.stats.wrecked++;
  AU.crash(1.2, d.x, d.z); AU.clatter(d.x, d.z);
  const spd = hyp(vx, vz); c.vx *= 0.7; c.vz *= 0.7; c.wob = 1;
  if (c.isPlayer) { popText(d.x, 2, d.z, pick(['CLEANUP!', 'KABOOM!', 'OOPS!', 'NOT MY FAULT!']), 'big'); shake(0.35); }
  const aisle = 1 + Math.abs(Math.round((d.x + 40) / 5)) % 12;
  if (rnd() < 0.6) pa(`Cleanup on aisle ${aisle}. Cleanup on aisle ${aisle}.`, 2);
}

function updateLoot(dt) {
  // floor items
  for (const f of W.floor) {
    f.age += dt;
    if (!f.rest) {
      f.vy -= 20 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.ry += f.spin * dt; f.rx += f.spin * 0.7 * dt;
      if (f.y < 0.1) { f.y = 0.1; f.vy *= -0.3; f.vx *= 0.6; f.vz *= 0.6; f.spin *= 0.5; if (Math.abs(f.vy) < 0.6) { f.vy = 0; f.rx = 0; if (hyp(f.vx, f.vz) < 0.2) f.rest = true; } }
      // walls
      for (const b of COL) { if (!b.on || b.kind === 'display') continue; if (f.x > b.x0 && f.x < b.x1 && f.z > b.z0 && f.z < b.z1) { const l = f.x - b.x0, r = b.x1 - f.x, t = f.z - b.z0, bb = b.z1 - f.z, m = Math.min(l, r, t, bb); if (m === l) { f.x = b.x0 - .01; f.vx = -Math.abs(f.vx) * .4; } else if (m === r) { f.x = b.x1 + .01; f.vx = Math.abs(f.vx) * .4; } else if (m === t) { f.z = b.z0 - .01; f.vz = -Math.abs(f.vz) * .4; } else { f.z = b.z1 + .01; f.vz = Math.abs(f.vz) * .4; } } }
    }
  }
  // debris
  for (const d of W.debris) {
    if (d.rest) continue;
    d.vy -= 20 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.rx += d.wx * dt; d.ry += d.wy * dt; d.rz += d.wz * dt;
    const r = d.t === 'towel' ? 0.2 : d.t === 'cereal' ? 0.12 : 0.07;
    if (d.y < r) { d.y = r; d.vy *= -0.35; d.vx *= 0.7; d.vz *= 0.7; d.wx *= 0.6; d.wz *= 0.6; d.wy *= 0.7;
      if (Math.abs(d.vy) < 0.5 && hyp(d.vx, d.vz) < 0.15) { d.rest = true; d.vy = 0; if (d.t === 'can') { d.rx = Math.PI / 2; d.rz = 0; } else if (d.t === 'cereal') { d.rx = Math.round(d.rx / (Math.PI / 2)) * Math.PI / 2; d.rz = Math.round(d.rz / (Math.PI / 2)) * Math.PI / 2; } else { d.rx = Math.round(d.rx / (Math.PI / 2)) * Math.PI / 2; d.rz = 0; } } }
    for (const b of COL) { if (!b.on || b.kind === 'display' || b.kind === 'pallet') continue; if (d.x > b.x0 && d.x < b.x1 && d.z > b.z0 && d.z < b.z1) { d.vx *= -0.4; d.vz *= -0.4; d.x -= d.vx * dt * 3; d.z -= d.vz * dt * 3; } }
  }
  // props
  for (const p of W.props) {
    if (p.tipV || (p.tip > 0 && p.tip < Math.PI / 2)) { p.tip += p.tipV * dt; p.tipV += 14 * Math.sin(p.tip) * dt; if (p.tip >= Math.PI / 2) { p.tip = Math.PI / 2; p.tipV = 0; p.down = true; } }
    if (hyp(p.vx, p.vz) > 0.01) { p.x += p.vx * dt; p.z += p.vz * dt; const f = Math.exp(-(p.down ? 4 : 6) * dt); p.vx *= f; p.vz *= f; }
  }
  // doors
  const tgt = G.doorsOpen ? 1 : 0;
  DOOR.open += (tgt - DOOR.open) * Math.min(1, dt * 2.2);
  if (W.doorCol.length) { const g = 4 * (1 - DOOR.open); W.doorCol[0].x1 = -4 + g; W.doorCol[1].x0 = 4 - g; W.doorCol[0].on = W.doorCol[1].on = g > 0.05; }
}
// carts kicking light stuff around
function kickStuff(c) {
  const sp = hyp(c.vx, c.vz); if (sp < 0.4) return;
  cartCircles(c, _cc);
  for (let k = 0; k < 2; k++) {
    const px = _cc[k * 3], pz = _cc[k * 3 + 1];
    for (const d of W.debris) {
      const dx = d.x - px, dz = d.z - pz, dd = dx * dx + dz * dz;
      if (dd < 0.36 && d.y < 0.9) { const l = Math.sqrt(dd) || 1; d.vx = c.vx * 1.1 + dx / l * 1.5; d.vz = c.vz * 1.1 + dz / l * 1.5; d.vy = rr(1, 2.5) * Math.min(1, sp / 4); d.wx = rr(-8, 8); d.wz = rr(-8, 8); d.rest = false; if (rnd() < 0.15) AU.tink(d.x, d.z); }
    }
    for (const f of W.floor) {
      if (f.y > 0.5 || f.age < 0.3) continue;
      const dx = f.x - px, dz = f.z - pz, dd = dx * dx + dz * dz;
      if (dd < 0.2 && !roomFor(c, f.kind)) { const l = Math.sqrt(dd) || 1; f.vx = c.vx + dx / l; f.vz = c.vz + dz / l; f.vy = 1.5; f.rest = false; }
    }
  }
  for (const p of W.props) {
    for (let k = 0; k < 3; k++) {
      const px = _cc[k * 3], pz = _cc[k * 3 + 1], r = _cc[k * 3 + 2] + p.r;
      const dx = p.x - px, dz = p.z - pz, d = hyp(dx, dz);
      if (d < r && d > 1e-4) {
        const nx = dx / d, nz = dz / d; p.x += nx * (r - d); p.z += nz * (r - d);
        const vn = c.vx * nx + c.vz * nz;
        if (vn > 0) { p.vx += nx * vn * 1.2 + c.vx * 0.3; p.vz += nz * vn * 1.2 + c.vz * 0.3; }
        if (!p.down && p.tipV === 0 && sp > 1.3) { p.tipV = 2 + sp; p.tipDir = Math.atan2(c.vx, c.vz); AU.thud(p.x, p.z, 0.5); if (p.kind === 'standee' && c.isPlayer && rnd() < .4) popText(p.x, 2, p.z, 'SORRY TAG GUY', 'oof'); }
        if (!p.down) { c.vx *= 0.97; c.vz *= 0.97; }
      }
    }
  }
}

// ---------- flash deals ----------
function startFlash() {
  const cands = W.pallets.filter(p => !p.flash && hyp(p.x - G.player.x, p.z - G.player.z) > 14);
  if (!cands.length) return;
  const p = pick(cands);
  p.flash = true; p.stock = Math.max(p.stock, 0) + ri(3, 5); p.max = Math.max(p.max, p.stock); SEMI_DIRTY = true;
  W.flash = { p, t: 25 };
  const dept = deptName(p.x, p.z);
  pa(`⚡ FLASH DEAL in ${dept}: ${p.it.n}s restocked at ${money(p.it.now)}!`, 5, true);
  AU.chime(true);
}
function deptName(x, z) {
  if (z < -50) return 'the BACK AISLE';
  if (x > -9 && x < 9) return 'the DEAL ZONE';
  if (x < -24) return 'TOYS'; if (x < 0) return 'ELECTRONICS'; if (x < 24) return 'KITCHEN'; return 'HOME';
}

// ---------- drawing world objects ----------
const PCOL = { wood: C('#c99a5e'), woodDk: C('#94683a'), can: C('#d8dde3'), towel: C('#f5f5f5'), stan: C('#c9b26a'), stanPost: C('#d4d4d4'), rope: C('#c4001a'), basket: C('#d6202f'), cardboard: C('#c8a46e') };
function drawPallet(p) {
  const it = p.it, big = it.slots >= 3;
  // wood base
  box(p.x, 0.06, p.z, p.hw * 2, 0.04, p.hd * 2, PCOL.wood);
  for (const s of [-1, 0, 1]) box(p.x + s * (p.hw - 0.08), 0.03, p.z, 0.12, 0.06, p.hd * 2, PCOL.woodDk);
  box(p.x, 0.115, p.z, p.hw * 2, 0.03, p.hd * 2, PCOL.wood);
  // stock
  const uv = ATLAS.rects['item_' + p.kind];
  if (big) { // TVs stand upright in a row
    for (let i = 0; i < p.stock; i++) put('box', p.x - 0.0, 0.13 + it.s[1] / 2, p.z - p.hd + 0.25 + i * 0.36, 0, 0, 0, it.s[0], it.s[1], it.s[2] + .04, [1, 1, 1, 0], uv);
  } else if (it.teddy) {
    for (let i = 0; i < p.stock; i++) drawTeddy(p.x + ((i % 2) - .5) * 0.5, 0.13 + Math.floor(i / 2) * 0.55, p.z + (((i >> 1) % 2) - .5) * 0.3, 0.8, i * 0.7);
  } else {
    let i = 0; const sx = it.s[0], sy = it.s[1], sz = it.s[2], per = Math.max(1, Math.floor((p.hw * 2) / (sx + .05)) * Math.max(1, Math.floor((p.hd * 2) / (sz + .05))));
    for (let n = 0; n < p.stock; n++) {
      const layer = Math.floor(n / per), j = n % per, cols = Math.max(1, Math.floor((p.hw * 2) / (sx + .05)));
      const gx = j % cols, gz = Math.floor(j / cols);
      put('box', p.x - p.hw + (gx + .5) * (p.hw * 2 / cols), 0.13 + sy / 2 + layer * (sy + 0.01), p.z - p.hd + (gz + .5) * (sx + .05) * (sz / sx), 0, 0, 0, sx, sy, sz, [1, 1, 1, 0], uv);
    }
  }
  // price sign post
  box(p.x + p.hw - 0.05, 0.7, p.z + p.hd - 0.05, 0.04, 1.2, 0.04, C('#888'));
  put('box', p.x + p.hw - 0.05, 1.35, p.z + p.hd - 0.05, 0.6, 0, 0, 0.5, 0.32, 0.03, p.stock ? (p.flash ? C('#2ef3ff', 0.6) : C('#ffde2e', 0.4)) : C('#888'));
}
function drawDisplay(d) {
  if (d.broken) { box(d.x, 0.02, d.z, d.hw * 1.4, 0.04, d.hd * 1.4, C('#7a1c24')); return; }
  box(d.x, 0.03, d.z, d.hw * 2 + 0.1, 0.06, d.hd * 2 + 0.1, C('#c4001a'));
  for (const b of d.blocks) drawBlock(b.t, d.x + b.x, b.y, d.z + b.z, 0, 0, 0, b);
}
function drawBlock(t, x, y, z, rx, ry, rz, b) {
  if (t === 'can') { put('cyl', x, y, z, ry, rx, rz, 0.24, 0.14, 0.24, b.c); }
  else if (t === 'cereal') { put('box', x, y, z, ry, rx, rz, 0.34, 0.44, 0.14, [1, 1, 1, 0], ATLAS.rects['brand' + b.b]); }
  else { put('cyl', x, y, z, ry, rx, rz, 0.4, 0.48, 0.4, b.c); }
}
function drawProp(p) {
  pushXf(p.x, 0, p.z, p.tipDir, p.tip, 0);
  pushXf(0, 0, 0, p.ry - p.tipDir);
  if (p.kind === 'stanchion') { cyl(0, 0.03, 0, 0.18, 0.05, PCOL.stanPost); cyl(0, 0.5, 0, 0.03, 0.95, PCOL.stan); sph(0, 0.98, 0, 0.05, PCOL.stan); }
  else if (p.kind === 'wet') {
    put('quad', 0, 0.42, 0.12, 0, -0.28, 0, 0.42, 0.85, 1, [1, 1, 1, 0.15], ATLAS.rects.wet);
    put('quad', 0, 0.42, -0.12, Math.PI, -0.28, 0, 0.42, 0.85, 1, [1, 1, 1, 0.15], ATLAS.rects.wet);
  }
  else if (p.kind === 'standee') { put('quad', 0, 0.95, 0, 0, 0, 0, 0.95, 1.9, 1, [1, 1, 1, 0.1], ATLAS.rects.standee); box(0, 0.04, -0.1, 0.5, 0.08, 0.3, PCOL.cardboard); }
  else if (p.kind === 'baskets') { for (let i = 0; i < 5; i++) box(0, 0.12 + i * 0.07, 0, 0.42, 0.22, 0.3, shade(PCOL.basket, 1 - i * 0.04)); }
  popXf(); popXf();
}
function drawRopes() {
  // ropes between stanchions in each row while both upright
  const S = W.props.filter(p => p.kind === 'stanchion');
  for (let i = 0; i + 2 < S.length; i += 2) for (const o of [0, 1]) {
    const a = S[i + o], b = S[i + 2 + o]; if (!a || !b || a.down || b.down || a.tip > 0.05 || b.tip > 0.05) continue;
    if (hyp(a.x - b.x, a.z - b.z) > 3.2) continue;
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    limb(a.x, 0.95, a.z, mx, 0.82, mz, 0.025, PCOL.rope); limb(mx, 0.82, mz, b.x, 0.95, b.z, 0.025, PCOL.rope);
  }
}
function drawFloorItem(f) {
  const it = ITEMS[f.kind];
  if (it.teddy) { pushXf(f.x, f.y - 0.1, f.z, f.ry, f.rx, 0); drawTeddy(0, 0, 0, 0.75, 0); popXf(); }
  else { const sy = it.k === 'tv' ? it.s[2] : it.s[1], sz = it.k === 'tv' ? it.s[1] : it.s[2]; put('box', f.x, Math.max(f.y, sy / 2), f.z, f.ry, f.rx, 0, it.s[0], sy, sz, [1, 1, 1, 0], ATLAS.rects['item_' + f.kind]); }
}
function drawDoors() {
  const g = DOOR.open * 3.9;
  TGT = SET.glass;
  box(-2 - g, 2, 0.2, 3.9, 3.8, 0.06, COLS.glass); box(2 + g, 2, 0.2, 3.9, 3.8, 0.06, COLS.glass);
  TGT = SET.dyn;
  for (const s of [-1, 1]) { const x = s * (2 + g); box(x - 1.95, 2, 0.2, 0.08, 3.8, 0.1, COLS.doorFrame); box(x + 1.95, 2, 0.2, 0.08, 3.8, 0.1, COLS.doorFrame); box(x, 0.05, 0.2, 3.9, 0.1, 0.1, COLS.doorFrame); box(x, 3.9, 0.2, 3.9, 0.1, 0.1, COLS.doorFrame); box(x + s * -1.6, 1.1, 0.25, 0.06, 0.5, 0.06, C('#666')); }
}
