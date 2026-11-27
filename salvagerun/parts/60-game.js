// ---------- game state, tug, camera, level script, scoring, radio ----------
const G = { phase: 'menu', t: 0, paused: false, score: 0, combo: 0, comboT: 0, mult: 1, stats: null, slowmo: 0, shake: 0, flash: 0, runT: 0 };
const TUG = { s: 0, v: 0, x: 0, y: 0, W: [0, 0, 0], q: qid(), vel: [0, 0, 0], hull: 100, dead: false, turQ: null };
const TUG_TURRET = [0, 2.05, -1.4];
const CAM = { eye: [0, 0, 0], at: [0, 0, 1], up: [0, 1, 0], fov: 62 * DEG, vp: new Float32Array(16), ivp: new Float32Array(16), focal: 500, sEye: null };
function newStats() { return { shots: 0, hits: 0, kills: 0, volleys: 0, lockedTotal: 0, bestChain: 0, salvage: 0, hazards: 0, critters: 0, cores: 0, dmgTaken: 0, hitsTaken: 0, perfect8: 0, missed: 0, kinds: {}, hitBy: {} }; }
function resetRun(seed = 1) {
  srand(seed * 7919 + 13); FX_S = seed * 31 + 7;
  ENTS = []; DEBRIS.length = 0; PICKS.length = 0; BOLTS.length = 0; MISSILES.length = 0; TIMERS.length = 0; LIGHTS.length = 0; VOLLEYS = {};
  PT.n = 0; LOCK.on = false; LOCK.list = []; LOCK.cool = 0; WEAP.cool = 0;
  Object.assign(G, { t: 0, runT: 0, score: 0, combo: 0, comboT: 0, mult: 1, stats: newStats(), slowmo: 0, shake: 0, flash: 0, evI: 0, ambS: 150, saidMites: false, bossOn: false, ended: false, radioQ: [], radioCur: null, radioT: 0, said: {}, quipT: 30, lowSaid: false, hitQuipT: 0, popups: [], deadT: 0, result: null });
  Object.assign(TUG, { s: 0, v: 16, x: 0, y: 0, hull: 100, dead: false, turQ: null, hitT: 0 });
  bossReset();
  updateTug(0); updateCamera(0);
}
function updateTug(dt) {
  if (!TUG.dead) {
    if (G.phase === 'menu') { TUG.v = 30; TUG.s += TUG.v * dt; if (TUG.s > 6600) TUG.s = 40; }
    else if (TUG.s < S_STOP) { TUG.v = railSpeed(TUG.s); TUG.s = Math.min(S_STOP, TUG.s + TUG.v * dt); if (TUG.s >= S_STOP && !BOSS.active) bossStart(); }
    else { TUG.v = 0; }
  }
  const t = G.t;
  let x = 2.6 * Math.sin(t * 0.37) + 1.2 * Math.sin(t * 0.83 + 1), y = 1.5 * Math.sin(t * 0.29 + 1) + 0.7 * Math.sin(t * 0.71);
  let sz = 0;
  if (BOSS.active) { const k = sstep(0, 3, BOSS.t); x = lerp(x, 13 * Math.sin(BOSS.t * 0.33), k); y = lerp(y, 3 + 4 * Math.sin(BOSS.t * 0.47), k); sz = BOSS.pull * 55 + (BOSS.lunge > 0 ? -Math.sin(BOSS.lunge * Math.PI) * 8 : 0); }
  const px = TUG.x, py = TUG.y; TUG.x = x; TUG.y = y;
  const f = railFrame(TUG.s + sz, {});
  const W = vadd(f.p, vadd(vscl(f.R, x), vscl(f.U, y)));
  if (dt > 0) TUG.vel = vscl(vsub(W, TUG.W), 1 / dt);
  TUG.W = W; TUG.frame = f;
  const roll = f.bank + (dt > 0 ? -(x - px) / dt * 0.05 : 0) + (TUG.dead ? G.deadT * 1.5 : 0);
  const upR = vnorm(vadd(vscl(f.U, Math.cos(roll)), vscl(f.R, Math.sin(roll))));
  const fw = vnorm(vadd(f.T, vscl(f.U, dt > 0 ? (y - py) / dt * 0.02 : 0)));
  TUG.q = frameQ(fw, upR);
}
function updateCamera(dt) {
  const f = TUG.frame, k = 1 - Math.exp(-6 * dt);
  let eye = vadd(vadd(f.p, vscl(f.R, TUG.x * 0.55)), vscl(f.U, TUG.y * 0.55));
  const boss = BOSS.active ? sstep(0, 2.5, BOSS.t) : 0;
  const back = lerp(17.5, 19, boss), up = lerp(6.4, 9.5, boss);
  eye = vadd(vadd(eye, vscl(f.T, -back)), vscl(f.U, up));
  if (BOSS.active && BOSS.pull) eye = vmad(eye, f.T, BOSS.pull * 55);
  const ax = (AIM.x / VIEW.cssW - 0.5), ay = (AIM.y / VIEW.cssH - 0.5);
  let at = vadd(vadd(TUG.W, vscl(f.T, 40)), vscl(f.U, 4.2));
  at = vadd(at, vadd(vscl(f.R, ax * 7), vscl(f.U, -ay * 4.5)));
  if (boss > 0) { const look = vadd(WRECK.c, vadd(vscl(WRECK.U, 7), vadd(vscl(f.R, ax * 30), vscl(f.U, -ay * 18)))); at = vlerp(at, look, boss); }
  if (G.phase === 'menu') { const a = G.t * 0.12; eye = vadd(TUG.W, vadd(vadd(vscl(f.R, Math.sin(a) * 18), vscl(f.U, 5 + Math.sin(a * 0.7) * 2)), vscl(f.T, Math.cos(a) * 18))); at = vadd(TUG.W, vscl(f.U, 1)); }
  if (TUG.dead) { eye = vmad(eye, f.T, -G.deadT * 6); }
  if (!CAM.sEye || dt === 0 || G.phase === 'menu') { CAM.sEye = eye; CAM.sAt = at; }
  else { CAM.sEye = vlerp(CAM.sEye, eye, Math.min(1, k * 2)); CAM.sAt = vlerp(CAM.sAt, at, k); }
  let e2 = CAM.sEye.slice();
  if (G.shake > 0) { const s = G.shake * G.shake * 1.2; e2 = vadd(e2, [Math.sin(G.t * 71) * s, Math.sin(G.t * 53 + 1) * s, Math.sin(G.t * 61 + 2) * s]); }
  const roll = f.bank * 0.6;
  CAM.up = vnorm(vadd(vscl(f.U, Math.cos(roll)), vscl(f.R, Math.sin(roll))));
  CAM.eye = e2; CAM.at = CAM.sAt;
  const asp = VIEW.cssW / VIEW.cssH, base = 62 * DEG, minH = 54 * DEG;
  CAM.fov = Math.max(base, 2 * Math.atan(Math.tan(minH / 2) / asp));
  const proj = M4.persp(CAM.fov, asp, 0.5, 30000), view = M4.look(CAM.eye, CAM.at, CAM.up);
  CAM.proj = proj; CAM.view = view; CAM.vp = M4.mul(proj, view); CAM.ivp = M4.inv(CAM.vp);
  CAM.focal = VIEW.cssH / 2 / Math.tan(CAM.fov / 2);
  CAM.right = [view[0], view[4], view[8]]; CAM.upv = [view[1], view[5], view[9]];
}
function shake(a) { G.shake = Math.min(1.4, Math.max(G.shake, a)); }
function hitTug(dmg, src) {
  if (TUG.dead || G.phase !== 'play' || G.god) return;
  TUG.hull = Math.max(0, TUG.hull - dmg); G.stats.dmgTaken += dmg; G.stats.hitsTaken++; const hk = src && src.kind ? src.kind : 'boss'; G.stats.hitBy[hk] = (G.stats.hitBy[hk] || 0) + 1;
  G.flash = Math.min(1, 0.45 + dmg * 0.025); shake(0.35 + dmg * 0.02); G.combo = 0; G.mult = 1; TUG.hitT = G.t;
  FX.sparks(vmad(TUG.W, TUG.vel, 0.05), 20, TUG.vel, [6, 4, 2], 18); addLight(TUG.W, [8, 4, 2], 25, 0.3);
  SFX.hullHit(dmg);
  if (src && src.K && src.K.critter) popup('SPLAT!', TUG.W, '#7f8');
  if (TUG.hull <= 0) { TUG.dead = true; G.deadT = 0; radio('dead', true); FX.boom(TUG.W, 8, [1, 0.6, 0.25], TUG.vel); SFX.boom(16); setTimeoutSim(3.2, () => finishRun(false)); return; }
  if (TUG.hull < 30 && !G.lowSaid) { G.lowSaid = true; radio('low', true); }
  else if (G.t > G.hitQuipT) { G.hitQuipT = G.t + 9; radio('hit'); }
}
function repairTug(n) { if (TUG.hull >= 99.5) { const v = 200 * G.mult; G.score += v; G.stats.salvage += v; popup('+' + v + ' (spare kit)', TUG.W, '#6f8'); SFX.pickup(); return; } TUG.hull = Math.min(100, TUG.hull + n); popup('+' + n + ' HULL', TUG.W, '#6f8'); radio('kit'); SFX.repair(); if (TUG.hull >= 30) G.lowSaid = false; }
// ---- scoring ----
function scoreKill(e, src) {
  G.stats.kills++; G.stats.kinds[e.kind] = (G.stats.kinds[e.kind] || 0) + 1;
  if (e.K.critter) G.stats.critters++; else if (!e.K.gems && !e.K.boss) G.stats.hazards++;
  G.combo++; G.comboT = 2.6; G.mult = Math.min(8, 1 + Math.floor(G.combo / 6));
  let chainK = 1;
  if (src && src.volley && VOLLEYS[src.volley]) {
    const v = VOLLEYS[src.volley]; v.kills++; chainK = Math.min(8, v.kills);
    G.stats.bestChain = Math.max(G.stats.bestChain, v.kills);
    if (v.kills >= 2) popup('CHAIN ×' + v.kills, e.W, v.kills >= 8 ? '#ff5' : '#fc6', true);
    if (v.kills === 8) { G.stats.perfect8++; G.score += 1000 * G.mult; popup('FULL HOUSE +' + fmt(1000 * G.mult), TUG.W, '#ff5', true); radio('chain8'); SFX.fanfare(); }
    else if (v.kills === 6 && !G.said.chain6) { G.said.chain6 = 1; radio('chain6'); }
  }
  const pts = e.K.pts * G.mult * chainK;
  if (pts) { G.score += pts; popup('+' + fmt(pts), e.W, e.K.boss ? '#f8c' : '#fff'); }
  if (e.chainBlast && e.K.pts) popup('CHAIN REACTION', e.W, '#8ef');
  if (e.K.gems) { e.gemMult = G.mult * chainK; }
  if (e.kind === 'core' && !G.said.coreBoom) { G.said.coreBoom = 1; setTimeoutSim(0.8, () => radio('coreboom')); }
  if (e.kind === 'pod' && !G.said.firstPod) { G.said.firstPod = 1; }
}
function collectPick(k) {
  if (k.kit) { repairTug(15); return; }
  const v = Math.round(k.val * G.mult); G.score += v; G.stats.salvage += v;
  popup('+' + v, k.p, '#fd6'); SFX.pickup();
}
function popup(text, p, col, big) { G.popups.push({ text, p: p.slice(), col, big, t: 0 }); if (G.popups.length > 30) G.popups.shift(); }
// ---- radio ----
const LINES = {
  intro1: ["Morning, kid. Gus here. I fly, you shoot, the bank stops calling. Simple."],
  intro2: ["Route's locked in. The Mortgage flies herself, mostly. You've got the gun and the lock-on. Paint 'em, let 'em fly."],
  grave: ["Welcome to the ship graveyard. Everything out here used to be somebody's pride and joy."],
  pod: ["Cargo pod! Crack it open. Somebody's lost luggage is our lunch money."],
  plates: ["Spinning hull plates. Shoot them before they shave off what's left of my paint."],
  core: ["Engine core, glowing blue. Unstable. Pop it far away from us, please. Far."],
  coreboom: ["Ha! Chain reaction! Do that more."],
  drones: ["Dead survey drones. Their chips still sell. Shoot 'em open."],
  tunnel: ["We're going through that hull. Keep your elbows in."],
  mites: ["Hull mites riding that junk. Little leeches. They chew plating like candy. Get 'em before they jump."],
  mites2: ["Mite incoming! Shoot it off our nose!"],
  swarm: ["Swarm! Paint the whole bunch and let the volley sort it out."],
  belt: ["Asteroid belt. Big rocks split into smaller rocks. Don't make gravel in our lane."],
  ore: ["See the shiny streaks? Ore. Shoot those rocks. Gently. With bullets."],
  squeeze: ["Tight squeeze up ahead. Breathe in."],
  ice: ["Ice ring. Pretty, sharp, and it doesn't care about us. Like the bank."],
  frozen: ["Pods frozen in the ice. Shoot 'em loose, the salvage pops out."],
  storm: ["Shard storm! Keep that gun moving!"],
  quiet: ["Quiet out here. I hate quiet."],
  claws: ["See the gouges on that plating? Those are claw marks. Big ones."],
  corvina: ["Dead ahead: the Corvina Sunrise. Freighter, went missing with a full hold. That's our big payday."],
  boss1: ["Wait. That wreck is breathing. Wrecks don't breathe."],
  boss2: ["Oh no. That's Old Grabby. I thought Old Grabby was a bar story! Shoot the glowy bits! Glowy is always a weak point. That's just science."],
  slap: ["It slapped us! It actually slapped us!", "Ow! Keep those noodles off my tug!"],
  sever: ["Ha! Keep your arms to yourself!", "One less noodle!"],
  eyes: ["It's got eyes. Lots of eyes. Pop 'em! Don't look at them too long."],
  bcore: ["It's opening up! That glowing thing in its mouth, hit it with everything!"],
  pull: ["It's pulling us in! Engines at max! Shoot the core!"],
  chomp: ["It bit the Mortgage! I just paid her off! Well. Almost."],
  win: ["We're alive! And look at all that salvage! We're rich! Well. Less poor."],
  dead: ["That's it, she's breaking up! Punching out! I'm taking the coffee machine!"],
  hit: ["That was the hull, kid. The hull is the part that keeps the air in.", "Ow. I felt that in my fillings.", "Do you know what a hull patch costs? Neither do I. A lot.", "Shoot the things BEFORE they hit us. That's the whole job.", "Red brackets mean it's coming right at us. Just saying."],
  low: ["Hull's under a third. I can hear it whistling. Shoot faster.", "We're leaking. I'm writing my will on a napkin."],
  kit: ["Patch kit! Slapping it on. Duct tape of the stars."],
  chain6: ["Okay, that was pretty."],
  chain8: ["Eight in one go? Don't let it go to your head. Do it again."],
  quip: ["My first tug was a converted ice-cream freighter. Smelled like vanilla for nine years.", "If you see a sandwich floating out there, it's mine.", "Don't touch the red button. Or the other red button.", "The bank calls this an asset. I call her the Second Mortgage.", "You know what's great about space? No traffic cops."],
  miss: ["You're mostly hitting space. Space is fine. Space doesn't pay."]
};
function radio(key, urgent) {
  const arr = LINES[key]; if (!arr || !arr[0]) return;
  let i = G.said['_' + key] || 0; const text = arr[i % arr.length]; G.said['_' + key] = i + 1;
  if (urgent) { G.radioQ = [text]; G.radioCur = null; } else { if (G.radioQ.length > 2) G.radioQ.shift(); G.radioQ.push(text); }
}
function updateRadio(dt) {
  if (G.radioCur) { G.radioT += dt; if (G.radioT > G.radioDur) { G.radioCur = null; G.radioT = 0; } }
  if (!G.radioCur && G.radioQ.length) { G.radioCur = G.radioQ.shift(); G.radioT = 0; G.radioDur = Math.max(2.8, G.radioCur.length * 0.058 + 1.2); SFX.radio(); VOICE.say(G.radioCur); }
}
// ---- level script (route positions) ----
const LEAD = 360;
function inLane() { return [rr(-2.5, 2.5), rr(-1.5, 1.5)]; }
const EV = [
  [10, () => radio('intro1')], [70, () => radio('intro2')], [150, () => { radio('grave'); }],
  [180, () => { for (let i = 0; i < 3; i++) spawnAt('plate', rr(-30, 30), rr(-12, 12), LEAD + i * 40, { aim: inLane(), spin: rr(1, 2.5) }); radio('plates'); }],
  [300, () => { radio('pod'); for (let i = 0; i < 3; i++) spawnAt('pod', -70 - i * 12, rr(-6, 10), LEAD + i * 30, { rv: [11, 0, 0], spin: 0.4 }); }],
  [430, () => { for (let i = 0; i < 5; i++) spawnAt('plate', rr(-40, 40), rr(-15, 15), LEAD + i * 25, { aim: i % 2 ? inLane() : [rr(-12, 12), rr(-8, 8)], spin: rr(1, 3) }); spawnAt('drone', 25, 8, LEAD, { rv: [-4, 0, 0] }); spawnAt('drone', -22, -6, LEAD + 30, { rv: [3, 1, 0] }); }],
  [600, () => { for (let i = 0; i < 8; i++) spawnAt('plate', -28 + i * 8, rr(-6, 6), LEAD + rr(0, 30), { spin: rr(1.5, 3.5), rv: [0, 0, -4] }); spawnAt('girder', 0, 9, LEAD + 15, { spin: 1.2, rv: [0, -1, -3] }); spawnAt('girder', 12, -7, LEAD + 40, { spin: 0.8, aim: inLane() }); }],
  [760, () => { radio('drones'); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; spawnAt('drone', Math.cos(a) * 18, Math.sin(a) * 12, LEAD, { spin: 0.6 }); } }],
  [860, () => { radio('core'); spawnAt('core', 14, 6, LEAD, { aim: [3, 1], spin: 0.7 }); for (let i = 0; i < 4; i++) spawnAt('plate', 14 + rr(-14, 14), 6 + rr(-10, 10), LEAD + rr(-15, 15), { spin: rr(1, 3), rv: [rr(-2, 2), rr(-1, 1), 0] }); }],
  [990, () => { for (let i = 0; i < 4; i++) spawnAt('pod', 60 + i * 10, rr(-8, 8), LEAD + i * 25, { rv: [-12, 0, 0], spin: 0.3 }); for (let i = 0; i < 4; i++) spawnAt('plate', rr(-30, 30), rr(-12, 12), LEAD + 50 + i * 30, { aim: inLane(), spin: rr(1, 3) }); }],
  [1140, () => { for (let i = 0; i < 3; i++) spawnAt('girder', rr(-14, 14), rr(-8, 8), LEAD + i * 45, { aim: inLane(), spin: rr(0.6, 1.4) }); }],
  [1290, () => { spawnAt('core', -12, 3, LEAD, { spin: 0.5 }); spawnAt('core', 10, -4, LEAD + 18, { spin: 0.5 }); for (let i = 0; i < 6; i++) spawnAt('plate', rr(-20, 20), rr(-12, 12), LEAD + rr(-10, 30), { spin: rr(1, 3), aim: i < 2 ? inLane() : undefined }); }],
  [1400, () => radio('tunnel')],
  [1450, () => { for (let i = 0; i < 6; i++) spawnAt('plate', rr(-22, 22), rr(15, 25), LEAD + i * 12, { rv: [0, -6, 0], spin: rr(1, 3) }); for (let i = 0; i < 3; i++) spawnAt('pod', rr(-15, 15), rr(-10, 10), LEAD + 30 + i * 20, { spin: 0.4 }); }],
  [1640, () => { radio('mites'); for (let i = 0; i < 3; i++) { const p = spawnAt('plate', -20 + i * 20, rr(-6, 6), LEAD + i * 20, { spin: 0.6, rv: [0, 0, -2] }); attachCritter(p, 2); } }],
  [1830, () => { radio('swarm'); swarm(8, 0, 4, LEAD); }],
  [1990, () => { for (let i = 0; i < 6; i++) spawnAt('pod', rr(-35, 35), rr(-15, 15), LEAD + rr(0, 60), { rv: [rr(-4, 4), rr(-2, 2), 0], spin: 0.4 }); for (let i = 0; i < 3; i++) spawnAt('drone', rr(-30, 30), rr(-12, 12), LEAD + rr(0, 50)); spawnAt('core', 6, 0, LEAD + 30, { aim: inLane() }); spawnAt('core', -18, 5, LEAD + 45); }],
  [2160, () => { for (let i = 0; i < 7; i++) spawnAt('plate', -24 + i * 8, rr(-5, 5), LEAD + rr(0, 20), { spin: rr(1.5, 3.5), rv: [0, 0, -5] }); swarm(6, 10, -5, LEAD + 60); }],
  // asteroid belt
  [2330, () => radio('belt')],
  [2420, () => { spawnAt('rockL', -4, 2, LEAD, { aim: [-1, 1] }); spawnAt('rockL', 12, -4, LEAD + 70, { aim: [2, -1] }); }],
  [2600, () => { for (let i = 0; i < 10; i++) spawnAt(rnd() < 0.5 ? 'rockM' : 'rockS', rr(-30, 30), rr(-14, 14), LEAD + rr(0, 80), { aim: i < 4 ? inLane() : undefined, rv: [rr(-2, 2), rr(-1, 1), rr(-6, 0)] }); }],
  [2800, () => { radio('ore'); for (let i = 0; i < 4; i++) spawnAt('ore', rr(-25, 25), rr(-12, 12), LEAD + i * 25, { spin: 0.4 }); }],
  [3000, () => { for (let i = 0; i < 3; i++) { const r = spawnAt('rockM', -18 + i * 18, rr(-5, 5), LEAD + i * 25, { aim: i === 1 ? inLane() : undefined, spin: 0.5 }); attachCritter(r, 2); } }],
  [3200, () => { for (let i = 0; i < 3; i++) spawnAt('rockL', rr(-20, 20), rr(-10, 10), LEAD + i * 50, { aim: inLane() }); swarm(6, -12, 8, LEAD + 40); }],
  [3450, () => { for (let i = 0; i < 3; i++) spawnAt('pod', rr(-25, 25), rr(-10, 10), LEAD + i * 25, { rv: [rr(-3, 3), 0, 0] }); spawnAt('drone', 0, 12, LEAD + 30); spawnAt('core', -8, -8, LEAD + 55); for (let i = 0; i < 4; i++) spawnAt('rockS', rr(-15, 15), rr(-8, 8), LEAD + rr(0, 60), { aim: inLane() }); }],
  [3640, () => radio('squeeze')],
  [3660, () => { for (let i = 0; i < 12; i++) spawnAt(rnd() < 0.4 ? 'rockM' : 'rockS', rr(-14, 14), rr(-9, 9), LEAD + rr(0, 90), { aim: i < 5 ? inLane() : undefined, spin: rr(0.5, 2) }); }],
  [3900, () => { for (let i = 0; i < 5; i++) spawnAt('ore', rr(-28, 28), rr(-14, 14), LEAD + i * 18, { spin: 0.3 }); spawnAt('rockL', 3, 0, LEAD + 50, { aim: inLane() }); spawnAt('rockL', -15, 5, LEAD + 90, { aim: inLane() }); }],
  [4100, () => { for (let i = 0; i < 4; i++) spawnAt('rockL', rr(-16, 16), rr(-9, 9), LEAD + i * 35, { aim: inLane(), rv: [0, 0, -5] }); }],
  [4300, () => { swarm(10, 0, 0, LEAD); for (let i = 0; i < 2; i++) { const r = spawnAt('rockM', rr(-20, 20), rr(-8, 8), LEAD + 40 + i * 30, { spin: 0.5 }); attachCritter(r, 2); } }],
  [4480, () => { for (let i = 0; i < 2; i++) spawnAt('core', rr(-20, 20), rr(-10, 10), LEAD + i * 20); for (let i = 0; i < 3; i++) spawnAt('pod', rr(-25, 25), rr(-10, 10), LEAD + 20 + i * 15); for (let i = 0; i < 5; i++) spawnAt('rockS', rr(-20, 20), rr(-10, 10), LEAD + rr(0, 50)); }],
  // ice ring
  [4620, () => radio('ice')],
  [4700, () => { for (let i = 0; i < 8; i++) spawnAt('iceM', rr(-28, 28), rr(-12, 12), LEAD + rr(0, 80), { aim: i < 4 ? inLane() : undefined }); }],
  [4900, () => { radio('frozen'); for (let i = 0; i < 4; i++) spawnAt('frozen', rr(-28, 28), rr(-12, 12), LEAD + i * 25, { spin: 0.3 }); }],
  [5100, () => { for (let i = 0; i < 3; i++) spawnAt('iceL', rr(-18, 18), rr(-9, 9), LEAD + i * 45, { aim: inLane() }); }],
  [5300, () => { radio('storm'); for (let i = 0; i < 20; i++) spawnAt('iceS', rr(-24, 24), rr(-12, 12), LEAD + rr(0, 120), { aim: i % 3 === 0 ? inLane() : undefined, rv: [rr(-3, 3), rr(-2, 2), -28], spin: rr(2, 5) }); }],
  [5550, () => { swarm(10, 8, 6, LEAD); for (let i = 0; i < 2; i++) { const r = spawnAt('iceM', rr(-18, 18), rr(-8, 8), LEAD + 50 + i * 25); attachCritter(r, 2); } }],
  [5800, () => { for (let i = 0; i < 3; i++) spawnAt('frozen', rr(-26, 26), rr(-12, 12), LEAD + i * 22); spawnAt('iceL', 0, 0, LEAD + 60, { aim: inLane() }); spawnAt('iceL', 15, 6, LEAD + 100, { aim: inLane() }); spawnAt('core', -15, -6, LEAD + 40); }],
  [6000, () => { for (let i = 0; i < 24; i++) spawnAt('iceS', rr(-24, 24), rr(-12, 12), LEAD + rr(0, 130), { aim: i % 3 === 0 ? inLane() : undefined, rv: [rr(-3, 3), rr(-2, 2), -30], spin: rr(2, 5) }); swarm(6, -10, 5, LEAD + 100); }],
  [6250, () => { for (let i = 0; i < 4; i++) spawnAt('iceL', rr(-18, 18), rr(-9, 9), LEAD + i * 32, { aim: inLane() }); for (let i = 0; i < 6; i++) spawnAt('iceM', rr(-28, 28), rr(-12, 12), LEAD + rr(0, 120)); }],
  [6480, () => { for (let i = 0; i < 4; i++) spawnAt('frozen', rr(-26, 26), rr(-12, 12), LEAD + i * 18); for (let i = 0; i < 3; i++) spawnAt('drone', rr(-25, 25), rr(-10, 10), LEAD + 30 + i * 15); }],
  // approach
  [6720, () => radio('quiet')],
  [6850, () => { for (let i = 0; i < 3; i++) spawnAt('plate', rr(-25, 25), rr(-10, 10), LEAD * 0.7 + i * 20, { spin: 0.3, col: [0.3, 0.12, 0.26] }); }],
  [6950, () => radio('claws')],
  [7120, () => radio('corvina')]
];
function ambientSpawn() {
  const z = zoneAt(TUG.s); if (TUG.s > 6650) return;
  const kinds = [['plate', 'plate', 'rockS', 'plate'], ['rockS', 'rockM', 'rockS', 'ore'], ['iceS', 'iceM', 'iceS', 'iceS']][Math.min(z, 2)];
  const k = pick(kinds), inP = rnd() < 0.33;
  spawnAt(k, rr(-35, 35), rr(-16, 16), LEAD + rr(0, 60), { aim: inP ? inLane() : undefined, spin: rr(0.5, 2.5) });
  if (rnd() < 0.12) spawnAt(z === 2 ? 'frozen' : rnd() < 0.5 ? 'pod' : 'drone', rr(-35, 35), rr(-14, 14), LEAD + rr(0, 60), { rv: [rr(-4, 4), 0, 0], spin: 0.4 });
}
function updateLevel(dt) {
  while (G.evI < EV.length && TUG.s >= EV[G.evI][0]) { EV[G.evI][1](); G.evI++; }
  if (TUG.s >= G.ambS) { G.ambS += rr(48, 80); ambientSpawn(); }
  G.quipT -= dt; if (G.quipT <= 0 && !G.radioCur && !BOSS.active) { G.quipT = rr(35, 55); if (G.stats.shots > 120 && G.stats.hits / G.stats.shots < 0.18) radio('miss'); else radio('quip'); }
}
function step(dt) {
  if (G.paused) return;
  if (G.slowmo > 0) { G.slowmo -= dt; dt *= 0.35; }
  G.t += dt;
  if (G.phase === 'play') G.runT += dt;
  if (TUG.dead) G.deadT += dt;
  updateTug(dt);
  updateCamera(dt);
  if (G.phase === 'play') { updateLevel(dt); runTimers(); bossUpdate(dt); }
  else if (G.phase === 'menu') runTimers();
  updateEntities(dt); updatePicks(dt); updateDebris(dt); updateParticles(dt); updateLights(dt);
  if (G.phase === 'play' || G.phase === 'menu') updateWeapons(dt);
  updateRadio(dt);
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) { G.combo = 0; G.mult = 1; } }
  G.shake = Math.max(0, G.shake - dt * 1.8); G.flash = Math.max(0, G.flash - dt * 1.6);
  for (const p of G.popups) p.t += dt; G.popups = G.popups.filter(p => p.t < (p.big ? 1.6 : 1.0));
  if (TUG.dead && frnd() < dt * 6) FX.boom(vadd(TUG.W, vscl(randDir(frnd), 3)), frr(1.5, 3.5), [1, 0.6, 0.25], TUG.vel);
  if (G.phase === 'menu' && frnd() < dt * 0.6 && ENTS.length < 10) spawnAt(pick(['rockM', 'plate', 'pod', 'iceM']), rr(-30, 30), rr(-12, 12), 260, { spin: rr(0.3, 1.5) });
}
function finishRun(win) {
  if (G.ended) return; G.ended = true;
  for (const k of PICKS.splice(0)) collectPick(k);
  const hullBonus = win ? Math.round(TUG.hull) * 25 : 0, bossBonus = win ? 5000 : 0;
  G.score += hullBonus + bossBonus;
  const acc = G.stats.shots ? G.stats.hits / G.stats.shots : 0;
  const ranks = [['S', 400000], ['A', 280000], ['B', 180000], ['C', 100000], ['D', 0]];
  const rank = win ? ranks.find(r => G.score >= r[1])[0] : 'X';
  const best = SAVE.get('best', 0), isBest = G.score > best; if (isBest) SAVE.set('best', Math.round(G.score));
  G.result = { win, score: Math.round(G.score), hullBonus, bossBonus, acc, rank, isBest, best: Math.max(best, G.score), time: G.runT, stats: G.stats, hull: Math.round(TUG.hull) };
  G.phase = 'results'; showResults();
}
