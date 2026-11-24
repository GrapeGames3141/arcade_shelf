// ---------- varmints: kinds, factions, physics, hits, hazards, AI ----------
const G = 9.81, PHYS_DT = 1 / 60;
// eye = eyeshine colour (their eyes glow in the dark, which also makes them easy to read at night)
const KINDS = {
  rat: { name: 'Rats', one: 'rat', icon: '🐀', hp: 18, spd: 4.0, r: 0.17, mass: 1, dmg: 4, reach: 0.42, wind: 0.32, cd: 0.9, nerve: 6, cap: 7, col: 0x6b5d50, belly: 0x9a8a78, eye: [3, 0.4, 0.3], fac: '#a08a74', aggro: 2.0 },
  possum: { name: 'Possums', one: 'possum', icon: '🐾', hp: 40, spd: 2.4, r: 0.25, mass: 3, dmg: 6, reach: 0.5, wind: 0.45, cd: 1.2, nerve: 13, cap: 4, col: 0x9a9a9e, belly: 0xe8e4dc, eye: [2.6, 2.4, 1.6], fac: '#f0a8c8', aggro: 1.6 },
  cat: { name: 'Alley Cats', one: 'cat', icon: '🐈', hp: 44, spd: 5.0, r: 0.23, mass: 3.5, dmg: 9, reach: 0.5, wind: 0.35, cd: 1.0, nerve: 14, cap: 3, col: 0xc0702a, belly: 0xe8c08a, eye: [0.6, 3.2, 0.8], fac: '#ffa040', aggro: 7 },
  skunk: { name: 'Skunks', one: 'skunk', icon: '🦨', hp: 36, spd: 2.6, r: 0.24, mass: 2.5, dmg: 0, reach: 3.4, wind: 0.75, cd: 4.5, nerve: 14, cap: 2, col: 0x141416, belly: 0x202024, eye: [3, 2, 0.4], fac: '#b07cff', aggro: 4.5 },
  pigeon: { name: 'Pigeons', one: 'pigeon', icon: '🐦', hp: 9, spd: 2.2, r: 0.13, mass: 0.4, dmg: 2, reach: 0.35, wind: 0.25, cd: 1.2, nerve: 4, cap: 8, col: 0x7a8290, belly: 0x9aa2ae, eye: [2.5, 1.2, 0.4], fac: '#8fa3c0', bird: true, aggro: 0 },
  gull: { name: 'Seagulls', one: 'gull', icon: '🕊️', hp: 16, spd: 2.6, r: 0.18, mass: 1, dmg: 5, reach: 0.4, wind: 0.3, cd: 2.5, nerve: 8, cap: 3, col: 0xf2f2f0, belly: 0xffffff, eye: [2.6, 2.4, 0.6], fac: '#e8f0ff', bird: true, aggro: 9 },
  bandit: { name: 'Bandit Raccoons', one: 'bandit', icon: '🦝', hp: 52, spd: 3.8, r: 0.22, mass: 3, dmg: 7, reach: 0.75, wind: 0.32, cd: 1.05, nerve: 14, cap: 3, col: 0x5a5650, belly: 0x8a857c, eye: [3, 2.6, 1.2], fac: '#ff5a5a', aggro: 5 }
};
const BOSSES = {
  possumKing: { kind: 'possum', name: 'THE POSSUM KING', hp: 230, scale: 1.9, dmg: 11, nerve: 40, spd: 1.9 },
  tomcat: { kind: 'cat', name: 'FAT TOMCAT', hp: 270, scale: 2.1, dmg: 14, nerve: 40, spd: 4.2 },
  rocco: { kind: 'bandit', name: 'BIG ROCCO', hp: 250, scale: 1.55, dmg: 12, nerve: 40, spd: 3.5 }
};
let CRID = 0;
class Critter {
  constructor(k, x, z, opts = {}) {
    const d = KINDS[k];
    this.id = ++CRID; this.k = k; this.def = d; this.fac = k; this.boss = opts.boss || null;
    const B = this.boss ? BOSSES[this.boss] : null;
    this.scale = B ? B.scale : (opts.scale || F1(0.92, 1.08));
    this.maxHp = B ? B.hp : d.hp * (1 + 0.04 * Math.max(0, (GAME.night || 1) - 1)); this.hp = this.maxHp;
    this.r = d.r * this.scale; this.mass = d.mass * this.scale * this.scale * (B ? 2.5 : 1);
    this.spd = (B ? B.spd : d.spd) * F1(0.9, 1.1); this.dmg = B ? B.dmg : d.dmg;
    this.x = x; this.z = z; this.y = opts.y || 0; this.vx = 0; this.vz = 0; this.vy = 0;
    this.yaw = opts.yaw !== undefined ? opts.yaw : Math.atan2(-x, -z);
    this.state = opts.state || 'go'; this.t = 0; this.cd = R1(0.5, 1.5); this.stun = 0; this.slip = 0; this.stinkT = 0;
    this.phase = F1(0, 10); this.spin = 0; this.spinV = 0; this.lastHitBy = null; this.lastHitT = -9; this.playedDead = 0;
    this.goal = null; this.thinkT = 0; this.flying = !!d.bird; this.alt = opts.y || 0; this.guard = 0; this.flash = 0;
    this.hasLid = k === 'bandit' && (this.boss === 'rocco' || grng() < 0.35);
    this.carry = null; // gulls carry stolen weapons
  }
}

// ---------- hitting things ----------
// src: 'player' | 'crew' | 'cart' | 'trap' | 'hub' | 'pan'; opts: {stun, fore, birdMul, deadMul}
function hitCritter(c, dmg, kx, kz, ky, src, opts = {}) {
  if (c.state === 'scram' || c.state === 'gone' || c.state === 'binned') return false;
  const d = c.def;
  // Big Rocco and some bandits block with their own lid from the front
  if (c.hasLid && c.guard <= 0 && c.stun <= 0 && src !== 'pan' && src !== 'trap' && !opts.bash) {
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); const kl = Math.hypot(kx, kz) || 1;
    if ((-kx * fx - kz * fz) / kl > 0.35 && (c.boss || grng() < 0.6)) {
      GAME.events.push({ t: 'clang', x: c.x, z: c.z, v: 0.7 }); fxSparks(c.x + fx * 0.3, 0.5 * c.scale, c.z + fz * 0.3, 8);
      c.vx += kx * 0.25; c.vz += kz * 0.25; if (GAME.player && src === 'player') subText(c.boss ? 'Rocco blocks! Hit him from behind, bash him or CLANG him' : 'Blocked! Bash that lid'); return false;
    }
  }
  if (opts.bash && c.hasLid) { c.guard = 2.2; if (c.boss) callout('GUARD BROKEN!', ''); }
  let mul = 1;
  if (d.bird && c.y > 0.3) mul *= opts.birdMul || 1;
  if (c.state === 'dead') { mul *= opts.deadMul || 2; if (c.playedDead < 9) { c.playedDead = 9; callout('CAUGHT YOU!', 'no faking'); } }
  if (c.boss) { kx *= 0.4; kz *= 0.4; ky *= 0.45; }
  dmg *= mul * (GAME.up ? 1 + 0.15 * (GAME.up.muscle || 0) : 1) * (src === 'player' || src === 'pan' ? 1 : 1);
  c.hp -= dmg; c.flash = 0.12;
  const mk = 1 / Math.sqrt(c.mass);
  c.vx += kx * mk * 1.4; c.vz += kz * mk * 1.4; c.vy = Math.max(c.vy, ky * mk * 1.4);
  c.lastHitBy = src; c.lastHitT = GAME.now; c.launchY0 = c.y;
  if (opts.stun) c.stun = Math.max(c.stun, opts.stun);
  const big = Math.hypot(kx, kz) * mk > 4.5 || ky * mk > 2.5;
  if (d.bird) for (const o of GAME.critters) if (o !== c && o.k === c.k && Math.hypot(o.x - c.x, o.z - c.z) < 2.2) o.scatterT = 2.5;
  if (c.flying) { c.flying = false; c.state = 'tumble'; c.y = Math.max(c.y, 0.05); }
  else if (big && c.state !== 'dead') { c.state = 'tumble'; c.spinV = F1(8, 16) * (F1() < 0.5 ? -1 : 1); }
  if (c.carry && c.hp < c.maxHp * 0.6) { GAME.dropWeapon(c.carry, c.x, c.z); c.carry = null; feed('The gull dropped your ' + WEAPONS[c.carry0].name.toLowerCase() + '!'); }
  GAME.nerveHit(c.fac, dmg * 0.08);
  GAME.events.push({ t: 'hit', c, dmg, src, x: c.x, z: c.z });
  if (opts.fore && c.vy > 6) GAME.events.push({ t: 'fore', c });
  // possums play dead when hurt
  if (c.k === 'possum' && !c.boss && c.state !== 'dead' && c.hp > 0 && c.hp < c.maxHp * 0.6 && c.playedDead < 1 && grng() < 0.7) { c.playedDead = 1; c.pendingDead = true; }
  if (c.hp <= 0) { c.hp = 0; c.pendingScram = true; }
  return true;
}
function scramCritter(c, why) {
  if (c.state === 'scram' || c.state === 'gone') return;
  c.state = 'scram'; c.t = 0; c.flying = !!c.def.bird; c.stun = 0;
  GAME.onScram(c, why);
}

// ---------- physics for one critter ----------
function critterPhysics(c, dt) {
  c.t += dt; c.phase += dt; c.flash = Math.max(0, c.flash - dt); c.guard = Math.max(0, c.guard - dt); c.stinkT = Math.max(0, c.stinkT - dt);
  if (c.state === 'gone') return;
  if (c.flying) {
    // birds: velocity steering in 3D handled by AI; integrate and keep inside the scene
    c.x += c.vx * dt; c.z += c.vz * dt; c.y += c.vy * dt;
    if (c.state !== 'scram') { c.x = clamp(c.x, -AX + 0.3, AX - 0.3); }
    if (c.y < 0) { c.y = 0; c.vy = 0; }
    return;
  }
  const onGround = c.y <= 0.001 + (c.perch || 0);
  // gravity / landing
  const floor = c.perch || 0;
  if (c.y > floor || c.vy > 0) {
    c.vy -= G * dt; c.y += c.vy * dt; c.spin += c.spinV * dt;
    if (c.y <= floor) {
      const impact = -c.vy; c.y = floor;
      if (impact > 2.5) { GAME.events.push({ t: 'thud', c, v: impact }); c.vy = impact * 0.25; c.vx *= 0.6; c.vz *= 0.6; }
      else { c.vy = 0; }
    }
  }
  // friction (slick ketchup = skate)
  const airborne = c.y > floor + 0.02;
  c.slip = Math.max(0, c.slip - dt);
  const onSlick = !airborne && GAME.slickAt(c.x, c.z);
  if (onSlick && Math.hypot(c.vx, c.vz) > 1.2) c.slip = 0.4;
  const fr = airborne ? 0.15 : (c.slip > 0 ? 0.5 : (c.state === 'tumble' ? 5 : 9));
  const k = Math.exp(-fr * dt);
  if (c.state === 'tumble' || c.slip > 0 || airborne || c.stun > 0 || c.state === 'dead' || c.state === 'pounce' || c.pendingScram) { c.vx *= k; c.vz *= k; }
  const sp0 = Math.hypot(c.vx, c.vz);
  c.x += c.vx * dt; c.z += c.vz * dt;
  if (c.state === 'tumble') { c.spin += c.spinV * dt; c.spinV *= Math.exp(-2 * dt); if (!airborne && sp0 < 1.0 && c.t > 0.25) { c.state = 'get-up'; c.t = 0; c.spin = 0; } }
  // perching on dumpster tops (birds that fell, cats jumping down)
  // ---- hazards ----
  const sp = Math.hypot(c.vx, c.vz);
  // the street: knocked out of the alley = gone
  if (c.z > CURB_Z + 0.3 && c.state !== 'scram' && c.state !== 'enter') { if (c.lastHitBy && GAME.now - c.lastHitT < 3) { c.hp = 0; GAME.hazardKO(c, 'curb'); } }
  // manhole
  const mdx = c.x - MANHOLE.x, mdz = c.z - MANHOLE.z;
  if (mdx * mdx + mdz * mdz < (MANHOLE.r - c.r * 0.3) ** 2 && c.y < 0.25 && c.state !== 'scram' && c.state !== 'enter' && c.k !== 'rat' && (sp > 1.5 || c.state === 'tumble')) { GAME.hazardKO(c, 'flush'); return; }
  if (mdx * mdx + mdz * mdz < (MANHOLE.r - 0.05) ** 2 && c.k === 'rat' && c.state === 'tumble' && c.y < 0.3) { GAME.hazardKO(c, 'flush'); return; }
  // alley walls
  const wallHit = (nx, nz, kind) => {
    const vn = c.vx * nx + c.vz * nz; if (vn >= 0) return;
    if (-vn > 5 && c.lastHitBy && GAME.now - c.lastHitT < 2.5) GAME.hazardKO(c, kind, -vn);
    c.vx -= 1.4 * vn * nx; c.vz -= 1.4 * vn * nz;
  };
  if (c.state !== 'scram' && c.state !== 'enter') {
    if (c.x > AX - c.r) { c.x = AX - c.r; wallHit(-1, 0, 'wall'); }
    if (c.x < -AX + c.r) { c.x = -AX + c.r; wallHit(1, 0, 'wall'); }
    if (c.z < FENCE_Z + c.r && c.z > FENCE_Z - 1) { c.z = FENCE_Z + c.r; wallHit(0, 1, 'fence'); }
    if (c.z > 31.5) { c.z = 31.5; c.vz = Math.min(c.vz, 0); }
  }
  // statics
  for (const s of STATICS) {
    const [, , d, nx, nz] = staticClosest(s, c.x, c.z);
    if (d < c.r && c.y < s.y1 + 0.05) {
      // flying into an open dumpster from above = binned
      if (s.kind === 'dumpster' && c.y > 0.85 && c.vy < -0.5 && d < -0.15 && c.state !== 'scram' && (c.launchY0 || 0) < 0.6 && GAME.now - c.lastHitT < 2.5) { GAME.hazardKO(c, 'bin', 0, s.dump); return; }
      if (c.y > s.y1 - 0.15 && d < -0.05) { c.perch = s.kind === 'couch' ? 0.48 : s.y1; continue; }
      c.x += nx * (c.r - d); c.z += nz * (c.r - d);
      const vn = c.vx * nx + c.vz * nz;
      if (vn < 0) { if (-vn > 5.5 && c.lastHitBy && GAME.now - c.lastHitT < 2.5 && (s.kind === 'dumpster' || s.kind === 'ac' || s.kind === 'pallets' || s.kind === 'crates')) GAME.hazardKO(c, s.kind === 'dumpster' ? 'dumpwall' : 'wall', -vn); c.vx -= 1.3 * vn * nx; c.vz -= 1.3 * vn * nz; }
    }
  }
  if (c.perch && topAt(c.x, c.z) < c.perch - 0.01) { c.perch = topAt(c.x, c.z); }
  if (c.perch === undefined) c.perch = 0;
}

// separation so they don't stack into one blob
function separate(list, dt) {
  for (let i = 0; i < list.length; i++) {
    const a = list[i]; if (a.state === 'gone' || a.flying) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j]; if (b.state === 'gone' || b.flying) continue;
      const dx = b.x - a.x, dz = b.z - a.z, rr = a.r + b.r; const d2 = dx * dx + dz * dz;
      if (d2 > rr * rr || d2 < 1e-6 || Math.abs(a.y - b.y) > 0.5) continue;
      const d = Math.sqrt(d2), o = (rr - d) * 0.5, nx = dx / d, nz = dz / d;
      const wa = b.mass / (a.mass + b.mass), wb = 1 - wa;
      a.x -= nx * o * wa * 2; a.z -= nz * o * wa * 2; b.x += nx * o * wb * 2; b.z += nz * o * wb * 2;
      // a tumbling body bowls others over
      const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      if (rel > 3.5 && a.state === 'tumble' && b.state !== 'tumble') { hitCritter(b, rel * 1.5, nx * rel * 0.6, nz * rel * 0.6, 2, a.lastHitBy || 'player'); GAME.events.push({ t: 'bowl', a, b }); }
      else if (-rel > 3.5 && b.state === 'tumble' && a.state !== 'tumble') { hitCritter(a, -rel * 1.5, -nx * -rel * 0.6, -nz * -rel * 0.6, 2, b.lastHitBy || 'player'); GAME.events.push({ t: 'bowl', a: b, b: a }); }
    }
  }
}

// ---------- AI ----------
// Every non-boss varmint wants dumpsters (to hold them for its faction) or your den (to raid your stash).
// Some fight on the way: rats nip when you're close, cats hunt you, skunks spray, gulls dive for your weapon.
function chooseGoal(c) {
  const fac = c.fac; let best = null, bestS = -1e9;
  GAME.dumps.forEach((dp, i) => {
    const d = Math.hypot(dp.x - c.x, dp.z - c.z);
    let s = -d * 0.35;
    if (dp.owner === fac) s -= 6 + (dp.guards[fac] || 0) * 3; else if (dp.owner === 'you') s += 2.5; else s += 1.5;
    s -= (dp.claimers || 0) * 0.8; s += R1(0, 3);
    if (s > bestS) { bestS = s; best = { type: 'dump', i, x: dp.x + dp.fx * 0.95, z: dp.z + dp.fz * 0.95 }; }
  });
  if (!c.def.bird) {
    const dd = Math.hypot(DEN.x - c.x, DEN.z - c.z);
    let s = -dd * 0.35 + R1(0, 3) + (GAME.food > 5 ? 1.5 : 0) + (c.k === 'possum' || c.k === 'bandit' ? 1.5 : 0) - (c.k === 'rat' || c.k === 'skunk' ? 3.5 : 0) - (GAME.nightT < 20 ? 3 : 0);
    if (s > bestS) { bestS = s; best = { type: 'den', x: DEN.x + 1.1, z: DEN.z + R1(-0.6, 0.6) }; }
  }
  if (best && best.type === 'dump') { const dp = GAME.dumps[best.i]; best.x += R1(-0.5, 0.5) * -dp.fz; best.z += R1(-0.5, 0.5) * dp.fx; }
  return best;
}
function nearestFoe(c, maxD) {
  let best = null, bd = maxD;
  for (const f of GAME.knights()) { if (f.state === 'dazed' && c.k !== 'cat') continue; const d = Math.hypot(f.x - c.x, f.z - c.z); if (d < bd) { bd = d; best = f; } }
  return best ? [best, bd] : [null, 1e9];
}
function moveToward(c, tx, tz, spd, dt) {
  let dx = tx - c.x, dz = tz - c.z; const d = Math.hypot(dx, dz);
  if (d < 0.05) { c.vx *= 0.8; c.vz *= 0.8; return d; }
  dx /= d; dz /= d;
  // steer around statics in the way
  for (const s of STATICS) {
    const [, , sd, nx, nz] = staticClosest(s, c.x + dx * 0.6, c.z + dz * 0.6);
    if (sd < c.r + 0.15 && c.y < s.y1) { const tx2 = -nz, tz2 = nx; const sgn = (tx2 * dx + tz2 * dz) >= 0 ? 1 : -1; dx = dx * 0.4 + tx2 * sgn * 0.8 + nx * 0.4; dz = dz * 0.4 + tz2 * sgn * 0.8 + nz * 0.4; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
  }
  const sl = Math.min(spd, d * 3);
  const acc = 1 - Math.exp(-10 * dt);
  c.vx += (dx * sl - c.vx) * acc; c.vz += (dz * sl - c.vz) * acc;
  c.yaw += wrapA(Math.atan2(dx, dz) - c.yaw) * Math.min(1, dt * 10);
  return d;
}
function faceToward(c, tx, tz, dt, k = 10) { c.yaw += wrapA(Math.atan2(tx - c.x, tz - c.z) - c.yaw) * Math.min(1, dt * k); }

function critterAI(c, dt) {
  const d = c.def;
  if (c.state === 'gone' || c.state === 'binned') return;
  if (c.pendingDead && c.state !== 'tumble') { c.pendingDead = false; c.state = 'dead'; c.t = 0; c.deadFor = R1(3, 5); c.vx *= 0.3; c.vz *= 0.3; GAME.events.push({ t: 'playdead', c }); return; }
  if (c.pendingScram && c.state !== 'tumble' && c.y <= (c.perch || 0) + 0.05) { c.pendingScram = false; scramCritter(c, 'beat'); return; }
  if (c.stun > 0) { c.stun -= dt; c.vx *= 0.9; c.vz *= 0.9; if (c.state === 'pounce' || c.state === 'windup' || c.state === 'spray') c.state = 'go'; return; }
  if (c.state === 'tumble') return;
  if (c.state === 'get-up') { if (c.t > 0.45 * (c.boss ? 1.4 : 1)) { c.state = 'go'; c.goal = null; } return; }
  if (c.state === 'dead') { c.vx *= 0.85; c.vz *= 0.85; if (c.t > c.deadFor) { c.state = 'go'; c.goal = null; GAME.events.push({ t: 'undead', c }); } return; }
  if (c.state === 'scram') { scramMove(c, dt); return; }
  if (c.state === 'enter') { enterMove(c, dt); return; }
  if (d.bird) { birdAI(c, dt); return; }
  c.cd -= dt; c.thinkT -= dt;
  const [foe, fd] = nearestFoe(c, 12);
  const B = c.boss;
  // boss specials
  if (B === 'possumKing') { c.summonT = (c.summonT || 6) - dt; if (c.summonT <= 0 && GAME.critters.filter(o => o.k === 'possum' && o.state !== 'gone' && o.state !== 'scram').length < 6) { c.summonT = 15; GAME.events.push({ t: 'summon', c }); for (let i = 0; i < 2; i++) GAME.spawn('possum', c.x + R1(-1, 1), c.z + R1(-1, 1), { state: 'go' }); } }
  // attack states
  if (c.state === 'windup') {
    if (foe) { if (c.k === 'skunk') faceToward(c, 2 * c.x - foe.x, 2 * c.z - foe.z, dt, 8); else faceToward(c, foe.x, foe.z, dt, 6); }
    c.vx *= 0.85; c.vz *= 0.85;
    if (c.t >= d.wind * (B ? 1.3 : 1)) {
      if (c.k === 'skunk') { c.state = 'spray'; c.t = 0; GAME.spray(c); }
      else if (c.k === 'cat' && c.pounceNext) { c.state = 'pounce'; c.t = 0; const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); const ps = B ? 8 : 8.5; c.vx = fx * ps; c.vz = fz * ps; c.vy = B ? 3.2 : 2.6; GAME.events.push({ t: 'pounce', c }); }
      else { c.state = 'go'; c.cd = d.cd * R1(0.8, 1.2); if (foe && fd < c.r + 0.35 + d.reach) GAME.critterStrike(c, foe); }
    }
    return;
  }
  if (c.state === 'pounce') {
    if (foe && Math.hypot(foe.x - c.x, foe.z - c.z) < c.r + 0.4 && Math.abs(c.y - (foe.y || 0)) < 0.7 && !c.pounceHit) { c.pounceHit = true; GAME.critterStrike(c, foe, true); }
    if (c.t > 0.25 && c.y <= (c.perch || 0) + 0.01) { c.state = 'go'; c.pounceHit = false; c.pounceNext = false; c.cd = d.cd * R1(1.2, 1.8); if (B) GAME.events.push({ t: 'flop', c }); }
    return;
  }
  if (c.state === 'spray') { c.vx *= 0.8; c.vz *= 0.8; if (c.t > 0.9) { c.state = 'go'; c.cd = d.cd * R1(0.8, 1.2); } return; }
  // decide: fight or go claim
  const aggro = (B ? 9 : d.aggro) * (c.k === 'rat' && c.goal && c.goal.type === 'den' ? 1.4 : 1);
  if (foe && fd < aggro) {
    if (c.k === 'skunk') {
      // turn your back and spray when close enough
      if (fd < 3.2 && c.cd <= 0) { c.state = 'windup'; c.t = 0; GAME.events.push({ t: 'tailup', c }); return; }
      if (fd < 2.0) { moveToward(c, c.x - (foe.x - c.x), c.z - (foe.z - c.z), c.spd, dt); return; }
    } else if (c.k === 'cat') {
      if (c.cd <= 0 && fd > 1.6 && fd < (B ? 6 : 4.8)) { c.state = 'windup'; c.t = 0; c.pounceNext = true; return; }
      if (fd > 1.2) { const a = Math.atan2(c.x - foe.x, c.z - foe.z) + 0.9 * (c.id % 2 ? 1 : -1) * dt; moveToward(c, foe.x + Math.sin(a) * 3.2, foe.z + Math.cos(a) * 3.2, c.spd * 0.7, dt); return; }
    }
    if (c.k !== 'skunk') {
      if (fd < c.r + 0.3 + d.reach && c.cd <= 0) { c.state = 'windup'; c.t = 0; return; }
      if (c.k !== 'rat' || fd < 2.2 || (c.goal && c.goal.type !== 'dump')) { moveToward(c, foe.x, foe.z, c.spd * (fd < 1 ? 0.6 : 1), dt); return; }
    }
  }
  // go hold a dumpster or raid the den
  if (!c.goal || c.thinkT <= 0) { c.thinkT = R1(4, 8); if (!c.goal || grng() < 0.3) c.goal = chooseGoal(c); }
  if (!c.goal) return;
  if (c.goal.type === 'dump' && GAME.dumps[c.goal.i].owner === c.fac && GAME.dumps[c.goal.i].guards[c.fac] > 2) c.goal = chooseGoal(c);
  const dist = moveToward(c, c.goal.x, c.goal.z, c.spd * (c.state === 'claim' ? 0.2 : 1), dt);
  c.state = dist < 0.6 ? 'claim' : 'go';
  if (c.state === 'claim') { if (c.goal.type === 'dump') { const dp = GAME.dumps[c.goal.i]; faceToward(c, dp.x, dp.z, dt, 4); } else faceToward(c, DEN.x, DEN.z, dt, 4); }
}
function enterMove(c, dt) {
  // cats drop off a fire escape, rats pop out of the manhole, the rest walk in
  if (c.y > 0.02 || c.vy > 0) { c.state = 'enter'; if (c.t > 0.05 && c.y <= 0.001) { c.state = 'go'; } return; }
  const tx = clamp(c.x, -4.5, 4.5), tz = clamp(c.z, FENCE_Z + 1.5, CURB_Z - 1);
  if (c.z < FENCE_Z && !c.hopped) { // over the fence
    if (c.z > FENCE_Z - 0.8) { c.vy = 5.4; c.vz = 2.2; c.hopped = true; c.y = 0.01; return; }
  }
  const d = moveToward(c, tx, tz, c.spd, dt);
  if (d < 0.8 || (c.z < CURB_Z - 0.5 && c.z > FENCE_Z + 0.5)) c.state = 'go';
}
function scramMove(c, dt) {
  if (c.def.bird) {
    c.vy = Math.min(c.vy + 6 * dt, 4); const fx = c.x > 0 ? 1 : -1; c.vx += (fx * 4 - c.vx) * dt; c.vz += (3 - c.vz) * dt * 0.5; c.flying = true;
    c.yaw = Math.atan2(c.vx, c.vz); if (c.y > 12 || c.t > 5) c.state = 'gone'; return;
  }
  if (c.y > (c.perch || 0) + 0.02) return;
  const ex = c.scramTo || (c.scramTo = c.z > 0 ? [R1(-3, 3), 33] : (Math.hypot(c.x - MANHOLE.x, c.z - MANHOLE.z) < 6 && c.k === 'rat' ? [MANHOLE.x, MANHOLE.z] : [R1(-3, 3), -30]));
  // jump the fence on the way out
  if (ex[1] < FENCE_Z && c.z < FENCE_Z + 0.8 && !c.hopOut) { c.hopOut = true; c.vy = 5.6; c.vz = -2.4; c.y = 0.01; }
  const d = moveToward(c, ex[0], ex[1], c.spd * 1.7, dt);
  if (ex[1] === MANHOLE.z && d < 0.3) { c.state = 'gone'; GAME.events.push({ t: 'plop', x: c.x, z: c.z }); }
  if (d < 0.5 || c.t > 9) c.state = 'gone';
}
function birdAI(c, dt) {
  const d = c.def; c.cd -= dt;
  const [foe, fd] = nearestFoe(c, 30);
  if (c.k === 'gull' && foe && !c.carry && c.cd <= 0 && c.state !== 'dive') { c.state = 'dive'; c.t = 0; c.flying = true; c.diveFrom = [c.x, c.y, c.z]; }
  if (c.state === 'dive') {
    if (!foe) { c.state = 'go'; return; }
    const tx = foe.x, ty = 0.55, tz = foe.z; const dx = tx - c.x, dy = ty - c.y, dz = tz - c.z, dl = Math.hypot(dx, dy, dz) || 1;
    const sp = 9; c.vx += (dx / dl * sp - c.vx) * dt * 4; c.vy += (dy / dl * sp - c.vy) * dt * 4; c.vz += (dz / dl * sp - c.vz) * dt * 4; c.yaw = Math.atan2(c.vx, c.vz);
    if (dl < 0.55) { GAME.critterStrike(c, foe, true); c.state = 'go'; c.cd = d.cd * R1(1.5, 2.5); c.vy = 5; c.goal = null; }
    if (c.t > 3.5) { c.state = 'go'; c.cd = 2; }
    return;
  }
  if (c.carry) { c.vy += (4 - c.vy) * dt; c.vx += ((c.x > 0 ? 3 : -3) - c.vx) * dt; c.yaw = Math.atan2(c.vx, c.vz || 0.01); if (c.y > 11) { c.state = 'gone'; feed('A seagull flew off with your ' + WEAPONS[c.carry0].name.toLowerCase() + '. Rude.'); } return; }
  if (!c.goal || c.thinkT <= 0) { c.thinkT = R1(5, 9); c.goal = chooseGoal(c); }
  c.thinkT -= dt;
  if (!c.goal) return;
  const dp = c.goal.type === 'dump' ? GAME.dumps[c.goal.i] : null;
  // land along the dumpster lid
  const lx = dp ? dp.x + dp.fx * 0.1 + (-dp.fz) * ((c.id % 5) - 2) * 0.32 : c.goal.x, lz = dp ? dp.z + dp.fz * 0.1 + dp.fx * ((c.id % 5) - 2) * 0.32 : c.goal.z, ly = dp ? 1.17 : 0;
  // spooked when a knight is close: hop up and circle
  c.scatterT = Math.max(0, (c.scatterT || 0) - dt);
  const spooked = c.scatterT > 0 && foe;
  if (c.flying || spooked) {
    c.flying = true;
    const tx = spooked ? c.x + (c.x - foe.x) : lx, tz = spooked ? c.z + (c.z - foe.z) : lz, ty = spooked ? 3 : (Math.hypot(lx - c.x, lz - c.z) > 2 ? Math.max(ly + 1.5, 2.5) : ly);
    const dx = tx - c.x, dz = tz - c.z, dl = Math.hypot(dx, dz) || 1, sp = Math.min(c.k === 'gull' ? 6 : 5, dl * 2 + 0.5);
    c.vx += (dx / dl * sp - c.vx) * dt * 3; c.vz += (dz / dl * sp - c.vz) * dt * 3; c.vy += ((ty - c.y) * 2.5 - c.vy) * dt * 4;
    if (dl > 0.2) c.yaw += wrapA(Math.atan2(c.vx, c.vz) - c.yaw) * Math.min(1, dt * 6);
    if (!spooked && dl < 0.25 && Math.abs(c.y - ly) < 0.12) { c.flying = false; c.y = ly; c.perch = ly; c.vx = c.vz = c.vy = 0; c.state = 'claim'; }
    else c.state = 'go';
  } else {
    c.vx *= 0.8; c.vz *= 0.8; c.state = 'claim';
    if (dp && dp.owner === c.fac && (dp.guards[c.fac] || 0) > 4 && grng() < dt * 0.2) { c.flying = true; c.goal = chooseGoal(c); }
  }
}
