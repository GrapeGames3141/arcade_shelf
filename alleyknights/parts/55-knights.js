// ---------- the knights (you + crew), weapons, the lid, the cart, traps, slick, stink ----------
// Weapon numbers: dmg, reach (m), arc (rad, full width), wind/act/rec (s), kb (horizontal shove m/s), up (launch m/s), uses
const WEAPONS = {
  fists: { name: 'Paws', icon: '🐾', dmg: 7, reach: 0.8, arc: 1.5, wind: 0.07, act: 0.1, rec: 0.2, kb: 4.5, up: 1.5, uses: Infinity, desc: 'Better than nothing. Barely.' },
  paper: { name: 'Newspaper', icon: '🗞️', dmg: 10, reach: 1.05, arc: 1.7, wind: 0.05, act: 0.09, rec: 0.13, kb: 7, up: 2.5, uses: 30, desc: 'Fast swats. Bad dog!' },
  club: { name: '7-Iron', icon: '🏌️', dmg: 12, reach: 1.3, arc: 1.3, wind: 0.08, act: 0.12, rec: 0.3, kb: 6, up: 3, uses: 16, charge: true, desc: 'Hold to charge, release to golf a varmint. FORE!' },
  broom: { name: 'Push Broom', icon: '🧹', dmg: 8, reach: 1.65, arc: 2.9, wind: 0.12, act: 0.16, rec: 0.3, kb: 9.5, up: 1.0, uses: 22, desc: 'Sweeps a whole crowd sideways.' },
  racket: { name: 'Tennis Racket', icon: '🎾', dmg: 12, reach: 1.25, arc: 1.9, wind: 0.07, act: 0.1, rec: 0.2, kb: 6.5, up: 7, uses: 24, birdMul: 3, desc: 'Pops varmints up. Triple damage on birds.' },
  pan: { name: 'Frying Pan', icon: '🍳', dmg: 28, reach: 1.1, arc: 1.5, wind: 0.26, act: 0.12, rec: 0.42, kb: 10, up: 3, uses: 10, clang: true, desc: 'Slow. The CLANG stuns everything nearby.' },
  antenna: { name: 'Car Antenna', icon: '📡', dmg: 14, reach: 2.3, arc: 0.55, wind: 0.08, act: 0.1, rec: 0.2, kb: 5, up: 1.5, uses: 24, deadMul: 3, desc: 'Long poke. Checks if a possum is really dead.' },
  ketchup: { name: 'Ketchup', icon: '🥫', dmg: 0, reach: 0, arc: 0, wind: 0.05, act: 0.05, rec: 0.25, kb: 0, up: 0, uses: 6, squirt: true, desc: 'Squirt a slick trail. Varmints skate into walls.' },
  trap: { name: 'Mousetraps', icon: '🪤', dmg: 0, reach: 0, arc: 0, wind: 0.1, act: 0.05, rec: 0.3, kb: 0, up: 0, uses: 3, place: true, desc: 'Set one down. SNAP!' },
  hubcap: { name: 'Hubcaps', icon: '💿', dmg: 20, reach: 0, arc: 0, wind: 0.1, act: 0.05, rec: 0.3, kb: 9, up: 2, uses: 4, throw: true, desc: 'Frisbee of justice. Bounces off walls.' }
};
const LOOT = [['paper', 9], ['club', 7], ['broom', 7], ['racket', 7], ['pan', 5], ['antenna', 7], ['ketchup', 5], ['trap', 5], ['hubcap', 6]];
function pickLoot(better) { let tot = 0; for (const [k, w] of LOOT) tot += (better && (k === 'pan' || k === 'club' || k === 'hubcap') ? w * 1.6 : w); let r = R1(0, tot); for (const [k, w] of LOOT) { r -= (better && (k === 'pan' || k === 'club' || k === 'hubcap') ? w * 1.6 : w); if (r <= 0) return k; } return 'paper'; }
function newWeapon(k) { return { k, uses: WEAPONS[k].uses }; }

let KNID = 0;
class Knight {
  constructor(x, z, isPlayer) {
    this.id = ++KNID; this.isPlayer = isPlayer; this.x = x; this.z = z; this.y = 0; this.vx = 0; this.vz = 0; this.vy = 0; this.yaw = Math.PI;
    this.r = 0.22; this.maxHp = 100; this.hp = 100; this.lidMax = 100; this.lid = 100; this.hasLid = true; this.weapon = null;
    this.state = 'ok'; this.t = 0; this.atk = null; this.block = false; this.blockT = 0; this.bashT = 0; this.bashCd = 0; this.inv = 0; this.hurtT = 9;
    this.phase = 0; this.dazeT = 0; this.stink = 0; this.perch = 0; this.rummage = null; this.input = { mx: 0, mz: 0, attack: false, block: false, jump: false, action: false };
    this.prevAttack = false; this.charge = 0; this.swingT = 0; this.swingSide = 1; this.flash = 0; this.col = isPlayer ? 0x7d7c80 : 0x6e6a66;
    this.bandana = isPlayer ? [0.95, 0.75, 0.15] : [0.25, 0.6, 0.95];
  }
}

// ---------- knight movement + actions ----------
function knightStep(k, dt) {
  k.t += dt; k.phase += dt; k.inv = Math.max(0, k.inv - dt); k.hurtT += dt; k.bashCd = Math.max(0, k.bashCd - dt); k.flash = Math.max(0, k.flash - dt);
  k.stink = Math.max(0, k.stink - dt);
  if (k.stink > 0 && GAME.mode === 'play') { k.hp -= 3.5 * dt; if (k.hp <= 0) dazeKnight(k); }
  // grit regen after a while without being hit
  if (k.hurtT > 3 && k.state !== 'dazed') k.hp = Math.min(k.maxHp, k.hp + 3 * dt);
  const inp = k.input;
  if (k.state === 'cart') { cartRide(k, dt); return; }
  if (k.state === 'dazed') { k.dazeT -= dt; k.vx *= 0.85; k.vz *= 0.85; integrateKnight(k, dt); if (k.dazeT <= 0) { k.state = 'ok'; k.hp = k.maxHp * 0.6; k.inv = 1.2; } return; }
  if (k.state === 'rummage') { k.vx *= 0.7; k.vz *= 0.7; integrateKnight(k, dt); if (k.t > 1.0) finishRummage(k); return; }
  // movement
  let mx = inp.mx, mz = inp.mz; const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  if (k.stink > 0) { const w = Math.sin(k.phase * 7) * 0.5; const c = Math.cos(w), s = Math.sin(w); [mx, mz] = [mx * c - mz * s, mx * s + mz * c]; }
  k.block = !!inp.block && k.hasLid && !k.atk && k.bashT <= 0;
  const spd = (k.block ? 2.6 : 4.6) * (k.atk && k.atk.k === 'club' && k.atk.phase === 'charge' ? 0.5 : 1);
  const onGround = k.y <= k.perch + 0.01;
  const acc = 1 - Math.exp(-(onGround ? 14 : 3) * dt);
  if (k.bashT > 0) {
    k.bashT -= dt; const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw); k.vx = fx * 9; k.vz = fz * 9;
    for (const c of GAME.critters) { if (c.state === 'gone' || c.state === 'scram' || c.bashed === k.bashId) continue; const dx = c.x - k.x, dz = c.z - k.z, d = Math.hypot(dx, dz); if (d < 0.6 + c.r && (dx * fx + dz * fz) > 0 && Math.abs(c.y - k.y) < 0.8) { c.bashed = k.bashId; hitCritter(c, 8, fx * 11 + dx / d * 2, fz * 11 + dz / d * 2, 2.2, k.isPlayer ? 'player' : 'crew', { bash: true }); GAME.events.push({ t: 'clang', x: c.x, z: c.z, v: 0.8 }); k.lid -= 2; } }
    if (k.bashT <= 0) { k.vx *= 0.3; k.vz *= 0.3; }
  } else if (k.slipT > 0) { k.slipT -= dt; } else {
    k.vx += (mx * spd - k.vx) * acc; k.vz += (mz * spd - k.vz) * acc;
    if (ml > 0.15 && !k.block) k.yaw += wrapA(Math.atan2(mx, mz) - k.yaw) * Math.min(1, dt * 14);
    else if (ml > 0.15 && k.block) k.yaw += wrapA(Math.atan2(mx, mz) - k.yaw) * Math.min(1, dt * 4);
  }
  if (inp.jump && onGround && !k.atk) { k.vy = 5.0; k.jumpEdge = true; GAME.events.push({ t: 'jump', k }); }
  inp.jump = false;
  // attack: press (and for the club, hold to charge). Attack while blocking = shield bash.
  const press = inp.attack && !k.prevAttack, release = !inp.attack && k.prevAttack; k.prevAttack = inp.attack;
  if (press && k.block && k.bashCd <= 0) { k.bashT = 0.24; k.bashCd = 0.75; k.bashId = (k.bashId || 0) + 1; GAME.events.push({ t: 'bash', k }); autoAim(k, 3.0, 1.0); }
  else if (press && !k.atk && !k.block) startAttack(k);
  if (k.atk) stepAttack(k, dt, inp.attack, release);
  if (inp.action) { inp.action = false; knightAction(k); }
  integrateKnight(k, dt);
  if (k.hasLid && k.lid <= 0) loseLid(k);
}
function integrateKnight(k, dt) {
  // gravity + tops
  const top = topAt(k.x, k.z);
  if (k.y > top || k.vy > 0) { k.vy -= G * dt * 1.2; k.y += k.vy * dt; if (k.y <= top) { if (k.vy < -3) GAME.events.push({ t: 'land', k }); k.y = top; k.vy = 0; } }
  else if (top < k.y) k.y = top;
  k.perch = top;
  const slick = k.y < 0.05 && GAME.slickAt(k.x, k.z) && Math.hypot(k.vx, k.vz) > 3.5;
  if (slick && !k.slipT) { /* knights keep their footing (mostly) */ }
  k.x += k.vx * dt; k.z += k.vz * dt;
  k.x = clamp(k.x, -AX + k.r, AX - k.r); k.z = clamp(k.z, FENCE_Z + k.r, CURB_Z + 1.8);
  for (const s of STATICS) {
    const [, , d, nx, nz] = staticClosest(s, k.x, k.z);
    const top2 = s.kind === 'couch' ? 0.48 : s.y1;
    if (d < k.r && k.y < top2 - 0.05) { k.x += nx * (k.r - d); k.z += nz * (k.r - d); const vn = k.vx * nx + k.vz * nz; if (vn < 0) { k.vx -= vn * nx; k.vz -= vn * nz; } }
  }
}
function autoAim(k, range, cone) {
  let best = null, bs = 1e9; const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
  for (const c of GAME.critters) { if (c.state === 'gone' || c.state === 'scram' || c.y > 2.2) continue; const dx = c.x - k.x, dz = c.z - k.z, d = Math.hypot(dx, dz); if (d > range + c.r) continue; const a = Math.acos(clamp((dx * fx + dz * fz) / (d || 1), -1, 1)); if (a > cone) continue; const s = d + a * 1.2; if (s < bs) { bs = s; best = c; } }
  if (best) k.yaw += wrapA(Math.atan2(best.x - k.x, best.z - k.z) - k.yaw) * 0.85;
  return best;
}
function startAttack(k) {
  const wk = k.weapon ? k.weapon.k : 'fists'; const W = WEAPONS[wk];
  autoAim(k, (W.reach || 1.2) + 0.9, 1.25);
  k.atk = { k: wk, t: 0, phase: W.charge ? 'charge' : 'wind', hit: new Set(), charge: 0 };
  k.swingSide = -k.swingSide;
}
function stepAttack(k, dt, held, release) {
  const a = k.atk, W = WEAPONS[a.k]; a.t += dt;
  if (a.phase === 'charge') { a.charge = Math.min(1, a.t / 1.0); if (!held || release || a.t > 2.2) { a.phase = 'wind'; a.t = 0; } return; }
  if (a.phase === 'wind' && a.t >= W.wind) {
    a.phase = 'act'; a.t = 0; GAME.events.push({ t: 'swing', k, w: a.k, charge: a.charge });
    if (W.squirt) { squirt(k); useUp(k); }
    else if (W.place) { placeTrap(k); useUp(k); }
    else if (W.throw) { throwHubcap(k); useUp(k); }
    else if (W.clang) { GAME.clang(k); }
  }
  if (a.phase === 'act') {
    if (W.reach > 0) swingHits(k, a, W);
    if (a.t >= W.act) { a.phase = 'rec'; a.t = 0; if (a.hit.size && !W.squirt && !W.place && !W.throw) useUp(k); }
  }
  if (a.phase === 'rec' && a.t >= W.rec) k.atk = null;
}
function swingHits(k, a, W) {
  const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw); const ch = a.charge || 0;
  const reach = W.reach * (1 + ch * 0.15);
  for (const c of GAME.critters) {
    if (a.hit.has(c) || c.state === 'gone' || c.state === 'scram' || c.state === 'binned') continue;
    const dx = c.x - k.x, dz = c.z - k.z, d = Math.hypot(dx, dz);
    const dy = c.y - k.y; if (dy > (W.birdMul ? 1.8 : 1.4) || dy < -0.6) continue;
    if (d > reach + c.r) continue;
    const ang = Math.acos(clamp((dx * fx + dz * fz) / (d || 1), -1, 1));
    if (ang > W.arc / 2 + (d < 0.45 ? 1 : 0)) continue;
    a.hit.add(c);
    const nx = d > 0.01 ? dx / d : fx, nz = d > 0.01 ? dz / d : fz;
    let kb = W.kb * (1 + ch * 2.2), up = W.up * (1 + ch * 2.2), dmg = W.dmg * (1 + ch * 2.5);
    // broom sweeps sideways (toward the swing direction), everything else drives along the facing
    let kx = fx * 0.7 + nx * 0.3, kz = fz * 0.7 + nz * 0.3;
    if (a.k === 'broom') { const sx = -fz * k.swingSide, sz = fx * k.swingSide; kx = sx * 0.75 + fx * 0.35; kz = sz * 0.75 + fz * 0.35; }
    hitCritter(c, dmg, kx * kb, kz * kb, up, k.isPlayer ? 'player' : 'crew', { birdMul: W.birdMul, deadMul: W.deadMul, fore: a.k === 'club' && ch > 0.75 });
    k.lastHitT = GAME.now;
  }
}
function useUp(k) {
  if (!k.weapon) return; k.weapon.uses--;
  if (k.weapon.uses <= 0) { GAME.events.push({ t: 'break', k, w: k.weapon.k }); k.weapon = null; }
}
function dazeKnight(k) {
  if (k.state === 'dazed') return;
  if (k.state === 'cart') bailCart(k, false);
  k.state = 'dazed'; k.dazeT = 3.0; k.hp = 0; k.atk = null; k.block = false;
  if (k.weapon) { GAME.dropWeapon(k.weapon, k.x + R1(-1, 1), k.z + R1(-1, 1)); k.weapon = null; }
  GAME.events.push({ t: 'daze', k });
}
function hurtKnight(k, dmg, fromX, fromZ, kind) {
  if (k.inv > 0 || k.state === 'dazed') return 'none';
  const dx = fromX - k.x, dz = fromZ - k.z, d = Math.hypot(dx, dz) || 1;
  const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
  const cone = Math.cos((GAME.up && GAME.up.lid ? 70 + 12 * GAME.up.lid : 66) * Math.PI / 180);
  if (k.state !== 'cart' && k.block && k.hasLid && (dx * fx + dz * fz) / d > cone) {
    k.lid -= dmg * 1.1; k.flash = 0.1; k.vx -= dx / d * 1.5; k.vz -= dz / d * 1.5;
    GAME.events.push({ t: 'block', k, x: k.x + fx * 0.3, z: k.z + fz * 0.3 });
    return 'blocked';
  }
  k.hp -= dmg; k.inv = 0.45; k.hurtT = 0; k.flash = 0.15;
  k.vx -= dx / d * 3.5; k.vz -= dz / d * 3.5;
  if (k.rummage) { k.state = 'ok'; k.rummage = null; }
  GAME.events.push({ t: 'hurt', k, dmg });
  if (k.hp <= 0) dazeKnight(k);
  return 'hit';
}
function loseLid(k) {
  k.hasLid = false; k.block = false; GAME.events.push({ t: 'lidoff', k });
  const a = k.yaw + Math.PI + R1(-1, 1);
  GAME.lids.push({ x: k.x, z: k.z, y: 0.6, vx: Math.sin(a) * 4, vz: Math.cos(a) * 4, vy: 4, rot: 0, owner: k, t: 0 });
}
// action button: pick up weapon/lid, flip/mount the cart, rummage an owned dumpster
function knightAction(k) {
  if (k.state !== 'ok') return;
  // dropped items first
  let best = null, bd = 1.2;
  for (const it of GAME.items) { const d = Math.hypot(it.x - k.x, it.z - k.z); if (d < bd) { bd = d; best = it; } }
  if (best) { if (k.weapon) GAME.dropWeapon(k.weapon, k.x + Math.sin(k.yaw + 2) * 0.6, k.z + Math.cos(k.yaw + 2) * 0.6); k.weapon = best.w; GAME.items.splice(GAME.items.indexOf(best), 1); GAME.events.push({ t: 'pickup', k, w: best.w.k }); return; }
  const cart = GAME.cart;
  if (cart && (cart.state === 'tipped' || cart.state === 'ready') && Math.hypot(cart.x - k.x, cart.z - k.z) < 1.4) { mountCart(k); return; }
  for (const dp of GAME.dumps) {
    if (Math.hypot(dp.x + dp.fx * 0.9 - k.x, dp.z + dp.fz * 0.9 - k.z) > 1.3) continue;
    if (dp.owner !== 'you') { subText('Claim it first: stand next to it with nobody else around'); return; }
    if (dp.rumCd > 0) { subText('Nothing left in there yet (' + Math.ceil(dp.rumCd) + 's)'); return; }
    k.state = 'rummage'; k.t = 0; k.rummage = dp; k.yaw = Math.atan2(dp.x - k.x, dp.z - k.z); GAME.events.push({ t: 'rummage', k, dp }); return;
  }
}
function finishRummage(k) {
  const dp = k.rummage; k.state = 'ok'; k.rummage = null; if (!dp) return;
  dp.rumCd = 18 * (1 - 0.3 * (GAME.up.sense || 0));
  const better = (GAME.up.sense || 0) > 0;
  if (grng() < (better ? 0.8 : 0.68)) { const w = newWeapon(pickLoot(better)); if (k.weapon) GAME.dropWeapon(k.weapon, k.x + Math.sin(k.yaw + 2.2) * 0.7, k.z + Math.cos(k.yaw + 2.2) * 0.7); k.weapon = w; GAME.events.push({ t: 'found', k, w: w.k }); }
  else { const n = 3; GAME.addFood(n, dp.x + dp.fx, dp.z + dp.fz, 'found leftovers'); }
}

// ---------- weapons that leave things behind ----------
function squirt(k) {
  const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
  for (let i = 0; i < 4; i++) { const d = 0.8 + i * 0.75; GAME.slicks.push({ x: k.x + fx * d + F1(-0.15, 0.15), z: k.z + fz * d + F1(-0.15, 0.15), r: 0.55 + F1(0, 0.15), t: 0, life: 16, yaw: F1(0, TAU) }); }
  GAME.events.push({ t: 'squirt', k });
}
function placeTrap(k) {
  const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
  GAME.traps.push({ x: k.x + fx * 0.55, z: k.z + fz * 0.55, yaw: k.yaw, armed: true, t: 0 });
  GAME.events.push({ t: 'trapset', k });
}
function throwHubcap(k) {
  const tgt = autoAim(k, 14, 0.6); const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
  GAME.projs.push({ kind: 'hub', x: k.x + fx * 0.3, y: 0.45, z: k.z + fz * 0.3, vx: fx * 15, vz: fz * 15, t: 0, bounces: 1, hit: new Set(), src: k.isPlayer ? 'player' : 'crew', rot: 0 });
}

// ---------- the shopping cart: kick-scoot it into crowds; it wears out ----------
const CART_SPOTS = [[-2.5, 22, 2.3], [3, -12, -0.6], [-1.8, -20, 0.9], [2.5, 12.5, 2.9], [-3, 15.5, 1.6]];
function spawnCart() {
  const s = CART_SPOTS[Math.floor(R1(0, CART_SPOTS.length)) % CART_SPOTS.length];
  GAME.cart = { x: s[0], z: s[1], yaw: s[2], v: 0, w: 0, hp: 100, state: 'tipped', tilt: 1.35, rider: null, wob: 0, pull: grng() < 0.5 ? -1 : 1, lastHit: -9, hits: 0, t: 0 };
}
function mountCart(k) {
  const c = GAME.cart; if (c.state === 'tipped') GAME.events.push({ t: 'cartflip', c });
  c.state = 'ridden'; c.rider = k; k.state = 'cart'; k.atk = null; k.block = false; c.t = 0;
  GAME.events.push({ t: 'mount', k });
  if (!GAME.cartTip) { GAME.cartTip = true; subText(INPUT.touchOn ? 'Push the stick to kick-scoot · tap ACTION to hop off' : 'W to kick-scoot · A/D steer · S brake · E hop off'); }
}
function cartRide(k, dt) {
  const c = GAME.cart; if (!c || c.state !== 'ridden') { k.state = 'ok'; return; }
  c.t += dt;
  const inp = k.input;
  // input relative to the camera: forward = toward where the stick points, projected on the cart heading
  const mx = inp.mx, mz = inp.mz, ml = Math.hypot(mx, mz);
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  let thr = 0, steer = 0;
  if (ml > 0.15) {
    const want = Math.atan2(mx, mz); const err = wrapA(want - c.yaw);
    if (Math.abs(err) < 2.3) { thr = ml * Math.cos(Math.min(Math.abs(err), 1.4)); steer = clamp(err * 1.6, -1, 1); } else { thr = -0.6; }
  }
  const wear = c.hp;
  const vmax = wear < 15 ? 6.5 : 9.8;
  const accel = 6.5 * (GAME.up.polish ? 1.1 : 1);
  if (thr > 0) c.v += accel * thr * dt; else if (thr < 0) c.v += thr * 9 * dt;
  c.v -= c.v * 0.55 * dt; c.v = clamp(c.v, -2, vmax);
  // casters: wobble, then drag to one side, then a snapped wheel
  const wob = wear < 70 ? (Math.sin(c.t * 17) + Math.sin(c.t * 9.3)) * 0.35 * (wear < 40 ? 1.6 : 1) : 0;
  const pull = wear < 40 ? c.pull * (wear < 15 ? 1.15 : 0.5) : 0;
  const turn = (steer * 2.5 + wob + pull) * clamp(Math.abs(c.v) / 2.5, 0.2, 1) * Math.sign(c.v || 1);
  c.yaw += turn * dt; c.w = turn;
  c.x += Math.sin(c.yaw) * c.v * dt; c.z += Math.cos(c.yaw) * c.v * dt;
  c.hp -= dt * 0.55 * (GAME.up.polish ? 0.65 : 1) * (Math.abs(c.v) > 1 ? 1 : 0.3);
  // walls and statics
  const R = 0.45; let bonk = 0;
  if (c.x > AX - R) { c.x = AX - R; bonk = Math.abs(Math.sin(c.yaw) * c.v); }
  if (c.x < -AX + R) { c.x = -AX + R; bonk = Math.abs(Math.sin(c.yaw) * c.v); }
  if (c.z < FENCE_Z + R) { c.z = FENCE_Z + R; bonk = Math.abs(Math.cos(c.yaw) * c.v); }
  if (c.z > CURB_Z + 1.5) { c.z = CURB_Z + 1.5; bonk = Math.abs(Math.cos(c.yaw) * c.v); }
  for (const s of STATICS) { const [, , d, nx, nz] = staticClosest(s, c.x, c.z); if (d < R) { c.x += nx * (R - d); c.z += nz * (R - d); bonk = Math.max(bonk, Math.abs(Math.sin(c.yaw) * c.v * nx + Math.cos(c.yaw) * c.v * nz)); } }
  if (bonk > 0.5) { c.v *= -0.25; if (bonk > 3) { c.hp -= bonk * 1.7 * (GAME.up.polish ? 0.65 : 1); GAME.events.push({ t: 'cartbonk', c, v: bonk }); } }
  // ram varmints
  for (const cr of GAME.critters) {
    if (cr.state === 'gone' || cr.state === 'scram' || cr.y > 1.2 || cr.cartHit > GAME.now) continue;
    const dx = cr.x - c.x, dz = cr.z - c.z, d = Math.hypot(dx, dz);
    if (d < R + cr.r + 0.1 && Math.abs(c.v) > 1.8 && (dx * fx + dz * fz) * Math.sign(c.v) > -0.1) {
      const sp = Math.abs(c.v); cr.cartHit = GAME.now + 0.4;
      const side = (dx * -fz + dz * fx) > 0 ? 1 : -1;
      hitCritter(cr, 3.2 * sp, (fx * Math.sign(c.v) * 1.25 - fz * side * 0.5) * sp, (fz * Math.sign(c.v) * 1.25 + fx * side * 0.5) * sp, 0.45 * sp, 'cart');
      c.hp -= (2 + 0.55 * sp) * (GAME.up.polish ? 0.65 : 1) * (cr.boss ? 2 : 1); c.v *= cr.boss ? 0.4 : 0.9; c.lastHit = GAME.now; c.hits++;
      GAME.events.push({ t: 'cartram', c, cr, v: sp });
    }
  }
  k.x = c.x - fx * 0.3; k.z = c.z - fz * 0.3; k.y = 0.2; k.yaw = c.yaw; k.vx = fx * c.v; k.vz = fz * c.v;
  if (inp.action) { inp.action = false; bailCart(k, true); return; }
  if (c.hp <= 0) breakCart(k);
}
function bailCart(k, voluntary) {
  const c = GAME.cart; if (!c) return;
  c.state = 'ready'; c.rider = null; k.state = 'ok'; k.y = 0.25; k.vy = 2.5; k.x -= Math.sin(c.yaw) * 0.3; k.z -= Math.cos(c.yaw) * 0.3;
  if (voluntary) GAME.events.push({ t: 'dismount', k });
}
function breakCart(k) {
  const c = GAME.cart; const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  const glorious = GAME.now - c.lastHit < 0.8;
  c.state = 'broken'; c.rider = null;
  GAME.events.push({ t: 'cartbreak', c, glorious });
  k.state = 'ok'; k.vx = fx * Math.max(3, c.v * 0.8); k.vz = fz * Math.max(3, c.v * 0.8); k.vy = 4.5; k.y = 0.4;
  if (glorious) { k.inv = 1.0; } else { dazeKnight(k); k.dazeT = 1.3; k.hp = Math.max(1, k.hp); }
}

// ---------- crew AI: follow the boss, hit nearby varmints, help hold dumpsters ----------
function crewThink(k, dt) {
  const p = GAME.player; const inp = k.input; inp.mx = 0; inp.mz = 0; inp.attack = false; inp.block = false;
  if (k.state !== 'ok') return;
  let tgt = null, td = 6;
  for (const c of GAME.critters) { if (c.state === 'gone' || c.state === 'scram' || c.y > 1.6) continue; const d = Math.hypot(c.x - k.x, c.z - k.z) + (Math.hypot(c.x - p.x, c.z - p.z) > 9 ? 4 : 0); if (d < td) { td = d; tgt = c; } }
  if (!k.hasLid) { const L = GAME.lids.find(l => l.owner === k); if (L) { tgt = null; const dx = L.x - k.x, dz = L.z - k.z, d = Math.hypot(dx, dz); inp.mx = dx / d; inp.mz = dz / d; return; } }
  if (tgt) {
    const dx = tgt.x - k.x, dz = tgt.z - k.z, d = Math.hypot(dx, dz);
    const W = WEAPONS[k.weapon ? k.weapon.k : 'fists'];
    const want = Math.max(0.5, (W.reach || 0.8) * 0.75);
    if (d > want) { inp.mx = dx / d; inp.mz = dz / d; }
    else { k.yaw = Math.atan2(dx, dz); inp.attack = (k.phase % 0.6) < 0.3; }
    if ((tgt.state === 'windup' || tgt.state === 'pounce') && d < 3) { inp.block = true; inp.attack = false; k.yaw = Math.atan2(dx, dz); }
  } else {
    // hold an owned dumpster near the boss, or follow
    const slot = k.id % 2 ? 1 : -1; const tx = p.x + Math.sin(p.yaw + 2.4 * slot) * 1.6, tz = p.z + Math.cos(p.yaw + 2.4 * slot) * 1.6;
    const dx = tx - k.x, dz = tz - k.z, d = Math.hypot(dx, dz); if (d > 0.6) { inp.mx = dx / d * Math.min(1, d / 2); inp.mz = dz / d * Math.min(1, d / 2); }
  }
}
