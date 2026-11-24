// ---------- nights, factions, dumpsters, the den, food, events ----------
const QS = new URLSearchParams(location.search);
const TEST = QS.has('test');
const SETTINGS_DEF = { quality: 'high', sound: true, music: true, touch: 'auto', lefty: false, shake: true };
let SET = { ...SETTINGS_DEF };
try { const s = JSON.parse(localStorage.getItem('alleyknights.settings') || 'null'); if (s) SET = { ...SET, ...s }; } catch (e) { }
if (QS.get('q')) SET.quality = QS.get('q');
function saveSettings() { try { localStorage.setItem('alleyknights.settings', JSON.stringify(SET)); } catch (e) { } }
const SAVE_DEF = { night: 1, food: 0, up: {}, best: 0, stars: {} };
let SAVE = { ...SAVE_DEF };
try { const s = JSON.parse(localStorage.getItem('alleyknights.save') || 'null'); if (s && !TEST) SAVE = { ...SAVE_DEF, ...s }; } catch (e) { }
function saveGame() { if (TEST) return; try { localStorage.setItem('alleyknights.save', JSON.stringify(SAVE)); } catch (e) { } }

// upgrades bought with food between nights
const UPGRADES = {
  lid: { name: 'Steel Lid', icon: '🛡️', max: 3, cost: [10, 22, 38], desc: '+35% lid toughness and a wider block per level' },
  fur: { name: 'Thick Fur', icon: '🧥', max: 3, cost: [8, 18, 32], desc: '+25 grit per level' },
  muscle: { name: 'Heavy Paws', icon: '💪', max: 3, cost: [12, 26, 44], desc: '+15% damage per level' },
  sense: { name: 'Trash Sense', icon: '👃', max: 2, cost: [14, 30], desc: 'Dumpsters refill faster, better loot, start with a weapon' },
  crew: { name: 'Recruit a Knight', icon: '🦝', max: 2, cost: [28, 55], desc: 'A crew raccoon fights beside you and helps hold dumpsters' },
  polish: { name: 'Cart Grease', icon: '🛒', max: 1, cost: [12], desc: 'The cart wears 35% slower and accelerates harder' }
};

const NIGHT_TITLES = ['', 'Rat Race', 'Playing Possum', 'The Possum King', 'Claws Out', 'Something Smells', 'Fat Tomcat', 'Gull Talk', 'Big Rocco'];
function nightPlan(n) {
  const F = (k, nerve, boss) => ({ k, nerve, boss: boss || null });
  const base = [null,
    [F('rat', 80)],
    [F('rat', 80), F('possum', 70)],
    [F('rat', 70), F('possum', 90, 'possumKing')],
    [F('cat', 80), F('pigeon', 60), F('rat', 70)],
    [F('skunk', 70), F('cat', 80), F('possum', 70)],
    [F('cat', 100, 'tomcat'), F('pigeon', 70), F('rat', 80)],
    [F('gull', 70), F('skunk', 70), F('rat', 80), F('possum', 60)],
    [F('bandit', 110, 'rocco'), F('cat', 70), F('pigeon', 70)]];
  // more factions = less nerve each, so a full night stays about the same length
  const scale = fs => fs.map(f => ({ ...f, nerve: Math.round(f.nerve * 2.8 / Math.sqrt(fs.length)) }));
  if (n <= 8) return { facs: scale(base[n]), len: Math.min(240, 140 + 12 * n), title: NIGHT_TITLES[n] };
  // endless: three or four random factions, a boss every third night, more nerve
  const kinds = ['rat', 'possum', 'cat', 'skunk', 'pigeon', 'gull', 'bandit'];
  const r = mulberry32(n * 977); const pickK = () => kinds[Math.floor(r() * kinds.length)];
  const facs = []; const nf = 3 + (n % 2);
  while (facs.length < nf) { const k = pickK(); if (!facs.some(f => f.k === k)) facs.push(F(k, 80 + n * 4)); }
  if (n % 3 === 0) { const bk = ['possumKing', 'tomcat', 'rocco'][Math.floor(n / 3) % 3]; const kk = BOSSES[bk].kind; const f = facs.find(f => f.k === kk); if (f) f.boss = bk; else facs[0] = F(kk, 100 + n * 4, bk); }
  return { facs: scale(facs), len: 240, title: 'Night ' + n };
}
const SPAWN_GAP = { rat: 2.4, possum: 5.5, cat: 7, skunk: 10, pigeon: 4.5, gull: 8, bandit: 7.5 };
const SPAWN_FROM = { rat: ['sewer', 'fence', 'street'], possum: ['fence', 'street'], cat: ['roof', 'fence', 'street'], skunk: ['street', 'fence'], pigeon: ['sky'], gull: ['sky'], bandit: ['street', 'fence'] };

const GAME = {
  mode: 'title', night: 1, now: 0, acc: 0, timeScale: 1, slowT: 0, shake: 0, events: [], callQ: [], callT: 0,
  critters: [], knightsL: [], player: null, dumps: [], items: [], lids: [], slicks: [], traps: [], projs: [], clouds: [], debris: [], flies: [],
  facs: [], food: 0, nightFood: 0, foodStart: 0, up: {}, nightT: 0, nightLen: 180, den: { raid: 0, stealT: 0, warned: false }, cart: null, car: null, carT: 8,
  stats: null, autopilot: false, camYaw: Math.PI, camMode: 0,
  knights() { return this.knightsL.filter(k => k.state !== 'cart' || true); },
  spawn(k, x, z, opts = {}) { const c = new Critter(k, x, z, opts); this.critters.push(c); return c; },
};
function newStats() { return { kos: 0, binned: 0, flushed: 0, curbed: 0, walled: 0, cartHits: 0, foodIn: 0, foodLost: 0, dumpsTaken: 0, biggest: '' }; }

function startNight(n, attract) {
  CRID = 0; KNID = 0;
  grng = mulberry32((QS.get('seed') | 0) || (n * 7919 + (TEST ? 0 : Date.now() % 100000)));
  GAME.night = n; GAME.attract = !!attract;
  GAME.critters = []; GAME.items = []; GAME.lids = []; GAME.slicks = []; GAME.traps = []; GAME.projs = []; GAME.clouds = []; GAME.debris = []; GAME.flies = []; PS.length = 0;
  GAME.events = []; GAME.callQ = []; GAME.now = 0; GAME.acc = 0; GAME.nightT = 0; GAME.slowT = 0; GAME.timeScale = 1;
  GAME.up = attract ? {} : { ...SAVE.up };
  GAME.food = attract ? 0 : SAVE.food; GAME.foodStart = GAME.food; GAME.nightFood = 0;
  GAME.den = { raid: 0, stealT: 0, warned: false }; GAME.stats = newStats(); GAME.ended = false; GAME.cartTip = false;
  const plan = attract ? { facs: [{ k: 'rat', nerve: 999 }, { k: 'possum', nerve: 999 }], len: 9999, title: '' } : nightPlan(n);
  GAME.plan = plan; GAME.nightLen = plan.len;
  GAME.facs = plan.facs.map((f, i) => ({ k: f.k, nerve: f.nerve, max: f.nerve, broken: false, boss: f.boss, bossC: null, spawnT: 2.5 + i * 2.5, def: KINDS[f.k] }));
  GAME.dumps = DUMP_SPOTS.map(([x, z, yaw], i) => ({ i, x, z, yaw, fx: Math.sin(yaw), fz: Math.cos(yaw), owner: null, contender: null, prog: 0, guards: {}, claimers: 0, rumCd: 0, foodT: 0, lid: 0.15, lidV: 0, col: [0x2e6b3a, 0x2a4f8a, 0x3a5a2a, 0x8a3a24][i], name: DUMP_NAMES[i] }));
  // knights
  const p = new Knight(-2.6, 2.0, true); p.yaw = 0;
  GAME.knightsL = [p]; GAME.player = p;
  applyUpgrades(p);
  for (let i = 0; i < (GAME.up.crew || 0); i++) { const c = new Knight(-3.4 + i * 0.6, 0.6 - i * 0.6, false); c.yaw = 0; applyUpgrades(c); c.maxHp *= 0.8; c.hp = c.maxHp; GAME.knightsL.push(c); }
  if ((GAME.up.sense || 0) > 0 && !attract) p.weapon = newWeapon(pickLoot(true));
  // loot lying around at the start
  for (let i = 0; i < 2; i++) { const s = [[1.5, -1.0], [-1.0, 14], [2.2, -18], [0.5, 20.5]][Math.floor(R1(0, 4)) % 4]; GAME.dropWeapon(newWeapon(pickLoot(false)), s[0] + R1(-0.5, 0.5), s[1] + R1(-0.5, 0.5)); }
  spawnCart(); if (attract) GAME.cart.state = 'ready';
  GAME.camYaw = p.yaw; GAME.car = null; GAME.carT = R1(6, 12);
  if (attract) { GAME.autopilot = true; GAME.mode = 'title'; for (let i = 0; i < 5; i++) GAME.spawn(i < 4 ? 'rat' : 'possum', R1(-4, 4), R1(-10, 15)); }
  else { GAME.autopilot = !!QS.has('auto'); GAME.mode = 'play'; GAME.introT = TEST ? 0 : 3.2; }
  HUD.build();
}
function applyUpgrades(k) {
  const u = GAME.up; k.maxHp = 100 + 25 * (u.fur || 0); k.hp = k.maxHp; k.lidMax = 100 * (1 + 0.35 * (u.lid || 0)); k.lid = k.lidMax;
}

// ---------- shared game calls used by the critters and knights ----------
GAME.dropWeapon = function (w, x, z) { if (!w || w.uses <= 0) return; GAME.items.push({ x: clamp(x, -AX + 0.4, AX - 0.4), z: clamp(z, FENCE_Z + 0.5, CURB_Z), w, t: 0 }); };
GAME.slickAt = function (x, z) { for (const s of GAME.slicks) { const dx = x - s.x, dz = z - s.z; if (dx * dx + dz * dz < s.r * s.r) return true; } return false; };
GAME.facOf = function (k) { return GAME.facs.find(f => f.k === k); };
GAME.nerveHit = function (k, amt) {
  const f = GAME.facOf(k); if (!f || f.broken || GAME.attract) return;
  f.nerve -= amt;
  if (f.boss && f.bossC && f.bossC.state !== 'gone' && f.bossC.state !== 'scram') f.nerve = Math.max(1, f.nerve);
  if (f.nerve <= 0) breakFaction(f);
};
function breakFaction(f) {
  f.nerve = 0; f.broken = true;
  for (const c of GAME.critters) if (c.fac === f.k && c.state !== 'gone') scramCritter(c, 'broken');
  for (const d of GAME.dumps) if (d.owner === f.k) { d.owner = null; d.prog = 0; }
  callout(`THE ${f.def.name.toUpperCase()} ARE OUT!`, 'their nerve broke', 3);
  GAME.events.push({ t: 'facbreak', f }); GAME.slowT = 0.8;
  if (GAME.facs.every(x => x.broken) && !GAME.ended) { GAME.cleanSweep = true; endNight(true); }
}
GAME.onScram = function (c, why) {
  GAME.events.push({ t: 'scram', c, why });
  if (GAME.attract) return;
  if (why !== 'broken') {
    GAME.stats.kos++;
    const f = GAME.facOf(c.fac); const bonus = why === 'bin' ? 1.4 : why === 'flush' || why === 'curb' ? 1.25 : 1;
    if (c.boss) { if (f) { f.bossC = null; } callout(BOSSES[c.boss].name + ' RUNS!', 'the boss is beaten', 4); GAME.addFood(10, c.x, c.z, 'boss stash'); GAME.slowT = 1.2; GAME.nerveHit(c.fac, 40); }
    else { GAME.nerveHit(c.fac, c.def.nerve * bonus); if (grng() < 0.55) GAME.addFood(1, c.x, c.z); }
  }
};
GAME.hazardKO = function (c, kind, v = 0, idx) {
  if (c.state === 'gone' || c.state === 'scram' || c.state === 'binned') return;
  const st = GAME.stats;
  if (kind === 'bin') {
    c.state = 'binned'; st.binned++; GAME.dumps[idx].lidV = 9; callout('BINNED!', 'right in the dumpster', 2);
    GAME.events.push({ t: 'binned', c, d: GAME.dumps[idx] }); GAME.onScram(c, 'bin'); c.state = 'gone'; return;
  }
  if (kind === 'flush') { c.state = 'gone'; st.flushed++; callout('FLUSHED!', 'down the manhole', 2); GAME.events.push({ t: 'flush', c }); GAME.onScram(c, 'flush'); c.state = 'gone'; return; }
  if (kind === 'curb') { st.curbed++; callout('CURBED!', 'out of the alley', 2); GAME.events.push({ t: 'curb', c }); GAME.onScram(c, 'curb'); c.state = 'gone'; return; }
  // walls: bonus damage, once per launch
  if (c.wallT && GAME.now - c.wallT < 0.6) return; c.wallT = GAME.now;
  const dmg = 12 + v * 2.5; c.hp -= dmg; c.flash = 0.15; st.walled++;
  GAME.nerveHit(c.fac, dmg * 0.12);
  const word = kind === 'fence' ? 'FENCED!' : kind === 'dumpwall' ? 'DUMPSTERED!' : 'WALLED!';
  if (v > 7 || c.hp <= 0) callout(word, '', 1); else subText(word.toLowerCase());
  GAME.events.push({ t: 'splat', c, v, kind });
  if (c.hp <= 0) { c.hp = 0; c.pendingScram = true; }
};
GAME.critterStrike = function (c, foe, special) {
  const res = hurtKnight(foe, c.dmg, c.x, c.z, c.k);
  if (c.k === 'cat' && special) {
    if (res === 'blocked') { c.state = 'tumble'; c.vx *= -0.4; c.vz *= -0.4; c.vy = 3; c.spinV = 14; c.stun = 2.0; c.lastHitBy = foe.isPlayer ? 'player' : 'crew'; c.lastHitT = GAME.now; callout('PARRIED!', 'lid up, cat down', 1); GAME.nerveHit(c.fac, 4); }
    if (c.boss && res !== 'blocked') { for (const k of GAME.knightsL) if (k !== foe && Math.hypot(k.x - c.x, k.z - c.z) < 1.8) hurtKnight(k, 8, c.x, c.z); }
  }
  if (c.k === 'gull') {
    if (res === 'hit' && foe.weapon && !c.carry) { c.carry = foe.weapon; c.carry0 = foe.weapon.k; foe.weapon = null; c.vy = 5; c.state = 'go'; c.flying = true; callout('YOINK!', 'a gull took your ' + WEAPONS[c.carry0].name.toLowerCase(), 1); GAME.events.push({ t: 'yoink', c }); }
    else if (res === 'blocked') { c.flying = false; c.state = 'tumble'; c.vy = 2; c.stun = 1.6; c.vx *= -0.3; c.vz *= -0.3; c.spinV = 12; c.hp -= 4; c.lastHitBy = 'player'; c.lastHitT = GAME.now; subText('bonk!'); }
  }
  GAME.events.push({ t: 'strike', c, foe, res });
};
GAME.spray = function (c) {
  const bx = -Math.sin(c.yaw), bz = -Math.cos(c.yaw); // sprays out of the back
  GAME.clouds.push({ x: c.x + bx * 1.4, z: c.z + bz * 1.4, r: 1.7, t: 0, life: 4.2, from: c });
  for (const k of GAME.knightsL) {
    const dx = k.x - c.x, dz = k.z - c.z, d = Math.hypot(dx, dz) || 1;
    if (d < 3.6 && (dx * bx + dz * bz) / d > 0.3) {
      const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
      if (k.block && k.hasLid && (-dx * fx - dz * fz) / d > 0.4) { k.lid -= 8; GAME.events.push({ t: 'block', k, x: k.x, z: k.z }); }
      else { k.stink = 4.5; if (k.isPlayer) callout('STINKY!', 'block the spray with your lid', 1); }
    }
  }
  GAME.events.push({ t: 'spray', c });
};
GAME.clang = function (k) {
  GAME.events.push({ t: 'clangbig', k, x: k.x, z: k.z });
  for (const c of GAME.critters) { if (c.state === 'gone' || c.state === 'scram') continue; const d = Math.hypot(c.x - k.x, c.z - k.z); if (d < 2.7 && c.y < 2) { c.stun = Math.max(c.stun, c.boss ? 1.0 : 2.3); c.guard = Math.max(c.guard, 2.3); if (c.flying) { c.flying = false; c.state = 'tumble'; } } }
};
GAME.addFood = function (n, x, z, why) {
  if (GAME.attract) return;
  GAME.food += n; GAME.nightFood += n; GAME.stats.foodIn += n;
  for (let i = 0; i < Math.min(n, 5); i++) GAME.flies.push({ x0: x, z0: z, x1: DEN.x + 0.5, z1: DEN.z, t: -i * 0.12, dur: 0.9, up: true });
  if (why) feed(`+${n} 🍕 ${why}`);
};

// ---------- dumpster claims and the den ----------
function updateDumps(dt) {
  for (const d of GAME.dumps) {
    d.rumCd = Math.max(0, d.rumCd - dt);
    // lid flap
    d.lidV += (-(d.lid - (d.owner === 'you' ? 0.2 : 0.08)) * 60 - d.lidV * 6) * dt; d.lid = clamp(d.lid + d.lidV * dt, 0, 1.6);
    const fx = d.x + d.fx * 0.95, fz = d.z + d.fz * 0.95;
    let you = 0; d.guards = {}; d.claimers = 0;
    for (const k of GAME.knightsL) { if (k.state === 'dazed') continue; const dd = staticClosest(STATICS[d.i], k.x, k.z)[2]; if (dd < 1.1 || (k.y > 1.0 && dd < 0)) you += k.isPlayer ? 1 : 0.7; }
    for (const c of GAME.critters) {
      if (c.state !== 'claim' || !c.goal || c.goal.type !== 'dump' || c.goal.i !== d.i) continue;
      if (Math.hypot(c.x - fx, c.z - fz) > 1.6 && !(c.def.bird && c.y > 1)) continue;
      d.guards[c.fac] = (d.guards[c.fac] || 0) + 1; d.claimers++;
    }
    const facsHere = Object.keys(d.guards);
    let who = null, rate = 0;
    if (you > 0 && !facsHere.length) { who = 'you'; rate = 1 / (d.owner === null ? 1.6 : 2.4) * Math.min(1.6, you); }
    else if (!you && facsHere.length === 1) { const f = facsHere[0]; who = f; const n = d.guards[f]; rate = (KINDS[f].bird ? 0.08 : 0.11) * Math.min(3, n) * (d.owner === 'you' ? 0.8 : 1); }
    d.contested = you > 0 && facsHere.length > 0;
    if (who && who !== d.owner) {
      if (d.contender !== who) { d.prog = Math.max(0, d.prog - dt * 2); if (d.prog <= 0) d.contender = who; }
      else { d.prog += rate * dt; if (d.prog >= 1) claimDump(d, who); }
    } else if (!d.contested) { d.prog = Math.max(0, d.prog - dt * 0.35); if (d.prog <= 0) d.contender = null; }
    // food from what you hold
    if (d.owner === 'you') { d.foodT += dt; if (d.foodT >= 9) { d.foodT = 0; GAME.addFood(1, fx, fz); } }
    else d.foodT = 0;
    // varmints holding a dumpster get their nerve back
    if (d.owner && d.owner !== 'you') { const f = GAME.facOf(d.owner); if (f && !f.broken) f.nerve = Math.min(f.max, f.nerve + 0.25 * dt); }
  }
}
function claimDump(d, who) {
  const prev = d.owner; d.owner = who; d.prog = 0; d.contender = null; d.lidV = 5;
  if (who === 'you') { callout(d.name.toUpperCase() + ' CLAIMED!', 'it makes food while you hold it · ACTION to rummage', 1); GAME.events.push({ t: 'claim', d }); GAME.stats.dumpsTaken++; }
  else { feed(`${KINDS[who].icon} ${KINDS[who].name} took the ${d.name}!`); GAME.events.push({ t: 'lost', d, prev }); }
}
const DEN_MAX = 30;
function updateDen(dt) {
  if (GAME.attract) return;
  const dx = DEN.x + 1.0, dz = DEN.z;
  let raiders = 0; for (const c of GAME.critters) { if (c.def.bird || c.state !== 'claim' || !c.goal || c.goal.type !== 'den') continue; if (Math.hypot(c.x - dx, c.z - dz) < 1.6) raiders++; }
  let def = 0; for (const k of GAME.knightsL) if (k.state !== 'dazed' && Math.hypot(k.x - dx, k.z - dz) < 2.8) def++;
  const den = GAME.den; den.raiders = raiders; den.defended = def > 0;
  if (raiders && !def) {
    den.raid += dt * Math.min(1.2, 0.4 + 0.15 * raiders);
    den.stealT += dt; if (den.stealT > 2.2 && GAME.food > 0) { den.stealT = 0; GAME.food--; GAME.nightFood--; GAME.stats.foodLost++; GAME.flies.push({ x0: DEN.x + 0.5, z0: DEN.z, x1: dx + R1(-1, 1), z1: dz + R1(-1, 1), t: 0, dur: 0.6, up: false }); }
    if (!den.warned) { den.warned = true; callout('DEN RAID!', 'get back to the couch', 2); GAME.events.push({ t: 'raid' }); }
    if (den.raid >= DEN_MAX && !GAME.ended) loseNight();
  } else { den.raid = Math.max(0, den.raid - dt * (def ? 2.5 : 0.5)); if (den.raid <= 0) den.warned = false; }
}

// ---------- spawning ----------
function spawnStep(dt) {
  if (GAME.attract) { if (GAME.critters.filter(c => c.state !== 'gone').length < 6 && grng() < dt * 0.5) spawnFrom(grng() < 0.7 ? 'rat' : 'possum'); return; }
  if (GAME.introT > 0) return;
  const n = GAME.night;
  for (const f of GAME.facs) {
    if (f.broken) continue;
    f.spawnT -= dt;
    // the boss walks in once, early
    if (f.boss && !f.bossSpawned && GAME.nightT > 12) { f.bossSpawned = true; const e = f.k === 'cat' ? 'roof' : 'street'; f.bossC = spawnFrom(f.k, e, f.boss); callout(BOSSES[f.boss].name, 'has entered the alley', 4); GAME.events.push({ t: 'boss', c: f.bossC }); }
    const alive = GAME.critters.filter(c => c.fac === f.k && c.state !== 'gone' && c.state !== 'scram').length;
    const cap = f.def.cap + Math.floor((n - 1) / 3);
    if (f.spawnT <= 0) {
      f.spawnT = SPAWN_GAP[f.k] * R1(0.7, 1.3) / (1 + 0.07 * (n - 1)) * (alive > cap * 0.6 ? 1.6 : 1);
      if (alive < cap) { const flock = f.k === 'pigeon' ? 3 : f.k === 'rat' && grng() < 0.35 ? 2 : 1; for (let i = 0; i < flock; i++) spawnFrom(f.k); }
    }
  }
}
function spawnFrom(k, entry, boss) {
  const opts = SPAWN_FROM[k]; const e = entry || opts[Math.floor(R1(0, opts.length)) % opts.length];
  let c;
  if (e === 'sky') { const side = grng() < 0.5 ? -1 : 1; c = GAME.spawn(k, side * R1(2, 5), R1(-20, 24), { y: R1(7, 10), state: 'go', boss }); c.vy = -1; c.flying = true; }
  else if (e === 'sewer') { c = GAME.spawn(k, MANHOLE.x + R1(-0.2, 0.2), MANHOLE.z + R1(-0.2, 0.2), { state: 'enter', boss }); c.vy = 3.2; c.y = 0.01; c.vx = R1(-1.5, 1.5); c.vz = R1(-1.5, 1.5); GAME.events.push({ t: 'sewer', c }); }
  else if (e === 'roof') { const r = [[5.2, 12.5], [-5.2, -9], [-5.2, 20]][Math.floor(R1(0, 3)) % 3]; c = GAME.spawn(k, r[0], r[1], { y: 3.4, state: 'enter', boss }); c.vx = -Math.sign(r[0]) * 2.2; c.vy = 1.5; GAME.events.push({ t: 'drop', c }); }
  else if (e === 'fence') { const p = ENTRIES.fence[Math.floor(R1(0, 3)) % 3]; c = GAME.spawn(k, p[0] + R1(-1, 1), p[1], { state: 'enter', boss }); }
  else { const p = ENTRIES.street[Math.floor(R1(0, 3)) % 3]; c = GAME.spawn(k, p[0] + R1(-1, 1), p[1], { state: 'enter', boss }); }
  return c;
}

// ---------- night flow ----------
function endNight(sweep) {
  if (GAME.ended) return; GAME.ended = true;
  for (const c of GAME.critters) if (c.state !== 'gone') scramCritter(c, 'broken');
  if (sweep) { const b = 5 * GAME.night; GAME.addFood(b, 0, 0, 'clean sweep bonus'); callout('CLEAN SWEEP!', 'every faction broke before dawn', 5); }
  else callout('DAWN!', 'the alley is yours. for now.', 5);
  GAME.events.push({ t: 'dawn', sweep });
  GAME.dawnT = 3.2; GAME.mode = 'ending';
}
function loseNight() {
  if (GAME.ended) return; GAME.ended = true;
  callout('EVICTED!', 'they took the den', 5); GAME.events.push({ t: 'evicted' });
  GAME.dawnT = 3.0; GAME.mode = 'ending'; GAME.lost = true; GAME.slowT = 2;
}
function finishNight() {
  const lost = !!GAME.lost; GAME.lost = false;
  const target = 6 + 3 * GAME.night;
  const stars = lost ? 0 : 1 + (GAME.nightFood >= target ? 1 : 0) + (GAME.cleanSweep ? 1 : 0);
  GAME.lastResult = { lost, stars, target, night: GAME.night, food: GAME.nightFood, stats: GAME.stats, sweep: !!GAME.cleanSweep };
  GAME.cleanSweep = false;
  if (!lost) { SAVE.food = Math.max(0, GAME.food); SAVE.stars[GAME.night] = Math.max(SAVE.stars[GAME.night] || 0, stars); SAVE.night = GAME.night + 1; SAVE.best = Math.max(SAVE.best, GAME.night); saveGame(); }
  GAME.mode = lost ? 'lost' : 'dawn';
  SCREENS.showResult(GAME.lastResult);
}

// ---------- the fixed-step simulation ----------
function physicsStep(dt) {
  GAME.now += dt;
  const playing = GAME.mode === 'play' || GAME.mode === 'title' || GAME.mode === 'ending';
  if (!playing) return;
  if (GAME.mode === 'play') { GAME.nightT += dt; if (GAME.introT > 0) GAME.introT -= dt; if (GAME.nightT >= GAME.nightLen && !GAME.ended) endNight(false); }
  if (GAME.mode === 'ending') { GAME.dawnT -= dt; if (GAME.dawnT <= 0) { finishNight(); return; } }
  // knights
  for (const k of GAME.knightsL) {
    if (k.isPlayer) { if (GAME.autopilot) botThink(k, dt); } else crewThink(k, dt);
    knightStep(k, dt);
  }
  // varmints
  for (const c of GAME.critters) { critterAI(c, dt); critterPhysics(c, dt); }
  separate(GAME.critters, dt);
  // knights and varmints push apart
  for (const k of GAME.knightsL) {
    if (k.state === 'cart') continue;
    for (const c of GAME.critters) {
      if (c.state === 'gone' || c.flying || Math.abs(c.y - k.y) > 0.6) continue;
      const dx = c.x - k.x, dz = c.z - k.z, rr = c.r + k.r, d2 = dx * dx + dz * dz; if (d2 > rr * rr || d2 < 1e-6) continue;
      const d = Math.sqrt(d2), o = rr - d, nx = dx / d, nz = dz / d; const w = c.boss ? 0.2 : 0.75;
      c.x += nx * o * w; c.z += nz * o * w; k.x -= nx * o * (1 - w); k.z -= nz * o * (1 - w);
    }
  }
  // crew push apart
  for (let i = 0; i < GAME.knightsL.length; i++) for (let j = i + 1; j < GAME.knightsL.length; j++) { const a = GAME.knightsL[i], b = GAME.knightsL[j]; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < 0.44 && d > 1e-4) { const o = (0.44 - d) / 2; a.x -= dx / d * o; a.z -= dz / d * o; b.x += dx / d * o; b.z += dz / d * o; } }
  GAME.critters = GAME.critters.filter(c => c.state !== 'gone');
  stepProjectiles(dt); stepTraps(dt); stepLids(dt); stepClouds(dt); stepItems(dt);
  if (GAME.mode === 'play' || GAME.mode === 'title') { spawnStep(dt); updateDumps(dt); updateDen(dt); }
  // boss bookkeeping
  for (const f of GAME.facs) if (f.bossC && (f.bossC.state === 'gone' || f.bossC.state === 'scram')) f.bossC = null;
  // passing cars
  GAME.carT -= dt;
  if (!GAME.car && GAME.carT <= 0) { const dir = grng() < 0.5 ? 1 : -1; GAME.car = { x: -dir * 34, z: dir > 0 ? 33.2 : 35.4, dir, col: [[0.6, 0.08, 0.06], [0.1, 0.2, 0.5], [0.8, 0.8, 0.78], [0.08, 0.08, 0.09], [0.9, 0.7, 0.1]][Math.floor(R1(0, 5)) % 5] }; GAME.events.push({ t: 'carby' }); }
  if (GAME.car) { GAME.car.x += GAME.car.dir * 13 * dt; if (Math.abs(GAME.car.x) > 36) { GAME.car = null; GAME.carT = R1(12, 24); } }
}
function stepProjectiles(dt) {
  for (const p of GAME.projs) {
    p.t += dt; p.rot += dt * 25; p.x += p.vx * dt; p.z += p.vz * dt; p.y = Math.max(0.15, p.y - dt * 0.2);
    let wall = false;
    if (p.x > AX - 0.1 || p.x < -AX + 0.1) { p.vx = -p.vx; p.x = clamp(p.x, -AX + 0.1, AX - 0.1); wall = true; }
    if (p.z < FENCE_Z + 0.1) { p.vz = -p.vz; wall = true; }
    for (const s of STATICS) { const [, , d, nx, nz] = staticClosest(s, p.x, p.z); if (d < 0.1 && p.y < s.y1) { const vn = p.vx * nx + p.vz * nz; p.vx -= 2 * vn * nx; p.vz -= 2 * vn * nz; p.x += nx * (0.1 - d); p.z += nz * (0.1 - d); wall = true; } }
    if (wall) { p.bounces--; GAME.events.push({ t: 'clang', x: p.x, z: p.z, v: 0.4 }); if (p.bounces < 0) p.dead = true; }
    for (const c of GAME.critters) { if (p.hit.has(c) || c.state === 'gone' || c.state === 'scram' || c.y > 1.4) continue; if (Math.hypot(c.x - p.x, c.z - p.z) < c.r + 0.2) { p.hit.add(c); const sp = Math.hypot(p.vx, p.vz) || 1; hitCritter(c, 20, p.vx / sp * 9, p.vz / sp * 9, 2, p.src); if (p.hit.size >= 3) p.dead = true; } }
    if (p.t > 2 || p.z > CURB_Z + 2) p.dead = true;
  }
  GAME.projs = GAME.projs.filter(p => !p.dead);
}
function stepTraps(dt) {
  for (const tp of GAME.traps) {
    tp.t += dt;
    if (!tp.armed) continue;
    for (const c of GAME.critters) { if (c.def.bird || c.state === 'gone' || c.state === 'scram' || c.y > 0.15) continue; if (Math.hypot(c.x - tp.x, c.z - tp.z) < c.r + 0.15) { tp.armed = false; tp.t = 0; hitCritter(c, 22, R1(-1, 1), R1(-1, 1), 7.5, 'trap', { stun: 0.5 }); callout('SNAP!', '', 1); GAME.events.push({ t: 'snap', x: tp.x, z: tp.z }); break; } }
  }
  GAME.traps = GAME.traps.filter(tp => tp.armed || tp.t < 1.5);
}
function stepLids(dt) {
  for (const L of GAME.lids) {
    L.t += dt; if (L.y > 0.02 || L.vy > 0) { L.vy -= G * dt; L.y += L.vy * dt; L.x += L.vx * dt; L.z += L.vz * dt; L.rot += dt * 9; if (L.y <= 0.02) { L.y = 0.02; L.vy = 0; L.vx = L.vz = 0; GAME.events.push({ t: 'clang', x: L.x, z: L.z, v: 0.5 }); } }
    L.x = clamp(L.x, -AX + 0.35, AX - 0.35); L.z = clamp(L.z, FENCE_Z + 0.35, CURB_Z);
    const k = L.owner; if (k && !k.hasLid && L.t > 0.6 && Math.hypot(k.x - L.x, k.z - L.z) < 0.6) { k.hasLid = true; k.lid = k.lidMax * 0.6; L.dead = true; GAME.events.push({ t: 'lidback', k }); }
  }
  GAME.lids = GAME.lids.filter(L => !L.dead);
}
function stepClouds(dt) {
  for (const cl of GAME.clouds) {
    cl.t += dt; cl.r = Math.min(2.2, cl.r + dt * 0.3);
    for (const k of GAME.knightsL) if (Math.hypot(k.x - cl.x, k.z - cl.z) < cl.r && k.y < 1.5) k.stink = Math.max(k.stink, 1.0);
    for (const c of GAME.critters) if (c.k !== 'skunk' && !c.def.bird && c.state !== 'gone' && c.state !== 'scram' && Math.hypot(c.x - cl.x, c.z - cl.z) < cl.r) { c.hp -= 4 * dt; c.stinkT = 1; if (c.hp <= 0) c.pendingScram = true; }
  }
  GAME.clouds = GAME.clouds.filter(cl => cl.t < cl.life);
  for (const s of GAME.slicks) s.t += dt;
  GAME.slicks = GAME.slicks.filter(s => s.t < s.life);
}
function stepItems(dt) {
  for (const it of GAME.items) { it.t += dt; for (const k of GAME.knightsL) { if (!k.weapon && k.state === 'ok' && it.t > 0.8 && Math.hypot(k.x - it.x, k.z - it.z) < 0.55) { k.weapon = it.w; it.dead = true; GAME.events.push({ t: 'pickup', k, w: it.w.k }); break; } } }
  GAME.items = GAME.items.filter(it => !it.dead);
}

// ---------- autopilot (title screen and headless tests) ----------
function botThink(k, dt) {
  const inp = k.input; inp.mx = 0; inp.mz = 0; inp.attack = false; inp.block = false;
  if (k.state === 'cart') { inp.action = k.state === 'cart' && GAME.cart.hp < 20; const tgt = GAME.critters.find(c => c.state !== 'gone' && !c.flying); if (tgt) { const dx = tgt.x - k.x, dz = tgt.z - k.z, d = Math.hypot(dx, dz) || 1; inp.mx = dx / d; inp.mz = dz / d; } return; }
  if (k.state !== 'ok') return;
  const goto = (x, z, slow = 0.3) => { const dx = x - k.x, dz = z - k.z, d = Math.hypot(dx, dz); if (d > slow) { inp.mx = dx / d; inp.mz = dz / d; } return d; };
  if (!k.hasLid) { const L = GAME.lids.find(l => l.owner === k); if (L) { goto(L.x, L.z, 0); return; } }
  // threats winding up close by: block toward them
  for (const c of GAME.critters) { const big = c.k === 'cat' || c.k === 'skunk' || c.k === 'gull' || c.boss; if (big && (c.state === 'windup' || c.state === 'pounce' || c.state === 'dive') && Math.hypot(c.x - k.x, c.z - k.z) < 3.2 && k.hasLid) { k.yaw = Math.atan2(c.x - k.x, c.z - k.z); inp.block = true; return; } }
  // den raid
  const denRaid = GAME.den.raid > 1.5;
  let tgt = null, td = denRaid ? 99 : 9;
  for (const c of GAME.critters) { if (c.state === 'gone' || c.state === 'scram' || c.y > 1.3) continue; if (denRaid && Math.hypot(c.x - DEN.x - 1, c.z - DEN.z) > 3) continue; let d = Math.hypot(c.x - k.x, c.z - k.z); if (c.k === 'skunk') d += 2; if (d < td) { td = d; tgt = c; } }
  if (denRaid && !tgt) { goto(DEN.x + 1.1, DEN.z); return; }
  if (tgt) {
    const W = WEAPONS[k.weapon ? k.weapon.k : 'fists'];
    const reach = W.throw ? 8 : W.squirt || W.place ? 1.5 : W.reach * 0.8 + tgt.r;
    if (td > reach) goto(tgt.x, tgt.z, 0);
    else { k.yaw = Math.atan2(tgt.x - k.x, tgt.z - k.z); inp.attack = !k.atk && (GAME.now * 10 | 0) % 3 !== 0; if (W.charge) inp.attack = !(k.atk && k.atk.charge > 0.6); }
    return;
  }
  // nothing to hit: rummage an owned dumpster, else claim one, else ride the cart
  if (!k.weapon) { const it = GAME.items[0]; if (it) { goto(it.x, it.z, 0); return; } }
  const mine = GAME.dumps.find(d => d.owner === 'you' && d.rumCd <= 0);
  if (mine && !k.weapon) { if (goto(mine.x + mine.fx * 0.9, mine.z + mine.fz * 0.9) < 0.9) inp.action = true; return; }
  const want = GAME.dumps.filter(d => d.owner !== 'you').sort((a, b) => Math.hypot(a.x - k.x, a.z - k.z) - Math.hypot(b.x - k.x, b.z - k.z))[0];
  if (want) { goto(want.x + want.fx * 1.0, want.z + want.fz * 1.0, 0.4); return; }
  goto(DEN.x + 1.6, DEN.z, 0.5);
}
