// ================= the battlefield =================
const WORLD = { W: 2600, H: 1000, ground: 780 };
const ZONES = [{ x0: 150, x1: 810, cat: 930, dir: 1 }, { x0: 1790, x1: 2450, cat: 1670, dir: -1 }];
const BELL_MIN = 40;          // the bell must start at least this far above the ground
const BUDGET = 1600, BUILD_S = 120, VMAX = 1300;
const PIECES = {
  hay: { nm: 'Hay', hw: 22, hh: 22, dens: 0.35, hp: 45, cost: 15, fric: 0.9 },
  crate: { nm: 'Crate', hw: 22, hh: 22, dens: 0.75, hp: 80, cost: 30, fric: 0.7 },
  plank: { nm: 'Plank', hw: 70, hh: 7, dens: 0.7, hp: 60, cost: 35, fric: 0.7 },
  stone: { nm: 'Stone', hw: 22, hh: 22, dens: 2.4, hp: 170, cost: 70, fric: 0.75 },
  slab: { nm: 'Slab', hw: 55, hh: 11, dens: 2.4, hp: 190, cost: 100, fric: 0.75 },
  bell: { nm: 'Bell', hw: 14, hh: 16, dens: 1.6, hp: 1e9, cost: 0, fric: 0.6 }
};
const PIECE_ORDER = ['bell', 'hay', 'crate', 'plank', 'stone', 'slab'];
const SHEEP = {
  sheep: { nm: 'Sheep', r: 17, dens: 1.3, blast: 78, fuse: 0.9, n: 8 },
  trio: { nm: 'Lamb trio', r: 15, dens: 1.2, blast: 52, fuse: 0.6, n: 2 },
  ram: { nm: 'Ram', r: 21, dens: 4.5, blast: 0, fuse: 0, n: 1 },
  fluff: { nm: 'Fluffball', r: 15, dens: 1.0, blast: 60, fuse: 0, n: 2 },
  black: { nm: 'Black sheep', r: 17, dens: 1.5, blast: 125, fuse: 3, n: 1 }
};
const SHEEP_ORDER = ['sheep', 'trio', 'ram', 'fluff', 'black'];
const NAMES = { cpu: ['You', 'CPU'], local: ['Player 1', 'Player 2'], online: ['Blue', 'Orange'] };
const SET = { diff: 1, sound: 1 };
try { Object.assign(SET, JSON.parse(localStorage.getItem('flockfortress.set') || '{}')); } catch (e) { }
const saveSet = () => { try { localStorage.setItem('flockfortress.set', JSON.stringify(SET)); } catch (e) { } };

let G = null, GROUND = null;
const FX = [];   // particles: { x, y, vx, vy, t, life, k, s, c }
function resetWorld() {
  BODIES = []; ARB = new Map(); NEXT_ID = 1;
  GROUND = mkBody({ stat: true, x: WORLD.W / 2, y: WORLD.ground + 200, hw: WORLD.W, hh: 200, kind: 'ground', fric: 0.9 });
  FX.length = 0;
}
function mySides() { return !G ? [] : G.mode === 'local' ? [0, 1] : [G.me]; }
const isMine = side => mySides().includes(side);
const sideName = s => G ? G.names[s] : '';

// ---------- match flow
function newMatch(o) {
  G = { mode: o.mode, me: o.me || 0, names: NAMES[o.mode].slice(), seed: o.seed || (Math.random() * 1e9) | 0, round: 0, wins: [0, 0], phase: 'build', turn: 0, starter: 0,
    forts: [null, null], ready: [false, false], lastFort: [null, null], dmg: [0, 0], ammo: null, wind: 0, shot: null, buildT: BUILD_S, builder: 0, sel: 'bell', rot: 0, msgT: 0, t: 0, stats: [{ shots: 0, best: 0 }, { shots: 0, best: 0 }] };
  if (o.mode === 'online' && G.me === 1) G.names = ['Blue', 'Orange'];
  try { const lf = JSON.parse(localStorage.getItem('flockfortress.lastfort') || 'null'); if (lf) G.lastFort = [lf, lf]; } catch (e) { }
  for (const id of ['title', 'pause', 'card']) $(id).classList.add('hidden');
  $('hud').classList.remove('hidden'); document.body.classList.add('playing');
  newRound();
}
function newRound() {
  G.round++; G.phase = 'build'; G.ready = [false, false]; G.forts = [null, null]; G.dmg = [0, 0]; G.shot = null; G.buildT = BUILD_S;
  G.ammo = [0, 1].map(() => Object.fromEntries(SHEEP_ORDER.map(k => [k, SHEEP[k].n])));
  G.starter = (G.round - 1) % 2; G.turn = G.starter; G.turnN = 0;
  resetWorld();
  G.builder = G.mode === 'local' ? 0 : G.me;
  G.sel = 'bell'; G.rot = 0;
  if (G.mode === 'cpu') { cpuBuild(1); }
  if (G.mode === 'local') passScreen(0, `Round ${G.round} · ${G.names[0]} builds`, `${G.names[1]}, look away!`);
  else say(`Round ${G.round} · build your fort`, 'Place your bell first, off the ground', 3.2);
  camTo('build', G.builder, true);
  renderBars();
}
// ---------- building
function money(side) { return BUDGET - BODIES.filter(b => b.side === side && b.piece).reduce((s, b) => s + PIECES[b.piece].cost, 0); }
function bellOf(side) { return BODIES.find(b => b.kind === 'bell' && b.side === side); }
function placePiece(side, t, x, y, rot, quiet) {
  const P = PIECES[t], z = ZONES[side];
  if (!P) return null;
  if (t === 'bell' && bellOf(side)) { if (!quiet) say('You already have a bell', '', 1.2); return null; }
  if (P.cost > money(side)) { if (!quiet) { say('Not enough money', '', 1.2); AUD.click(); } return null; }
  const hw = rot ? P.hh : P.hw, hh = rot ? P.hw : P.hh;
  if (x - hw < z.x0 || x + hw > z.x1 || y + hh > WORLD.ground + 1 || y - hh < 120) { if (!quiet) AUD.click(); return null; }
  const probe = { shape: 'box', x, y, a: 0, hw: hw - 1, hh: hh - 1 };
  for (const b of BODIES) if (b !== GROUND && b.side === side && collide(probe, b)) { if (!quiet) AUD.click(); return null; }
  const b = mkBody({ x, y, hw, hh, dens: P.dens, fric: P.fric, kind: t === 'bell' ? 'bell' : 'block', piece: t, side, hp: P.hp, maxhp: P.hp });
  if (!quiet) AUD.place(t);
  return b;
}
function removePiece(b) { if (!b || !b.piece) return; removeBody(b); AUD.click(); for (const o of BODIES) wake(o); }
function serializeFort(side) { return BODIES.filter(b => b.side === side && b.piece).map(b => [b.piece, Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, +b.a.toFixed(4), b.hw > b.hh ? 0 : (PIECES[b.piece].hw > PIECES[b.piece].hh ? 1 : 0)]); }
function buildFrom(side, list) {
  for (const b of BODIES.filter(b => b.side === side)) removeBody(b);
  let k = 0;
  for (const [t, x, y, a, rot] of list) {
    const P = PIECES[t], hw = rot ? P.hh : P.hw, hh = rot ? P.hw : P.hh;
    const b = mkBody({ x, y, a, hw, hh, dens: P.dens, fric: P.fric, kind: t === 'bell' ? 'bell' : 'block', piece: t, side, hp: P.hp, maxhp: P.hp });
    b.id = 1000 * (side + 1) + (k++); b.asleep = true;
  }
}
function bellOK(side) { const b = bellOf(side); if (!b) return 'Place your bell first'; const bottom = b.y + Math.max(b.hw, b.hh); return bottom > WORLD.ground - BELL_MIN ? 'Your bell must sit off the ground' : ''; }
function readyUp(side) {
  if (G.phase !== 'build' || G.ready[side]) return;
  const bad = bellOK(side); if (bad) { say(bad, 'Put it on top of some blocks', 2); AUD.click(); return; }
  G.ready[side] = true; G.forts[side] = serializeFort(side); G.lastFort[side] = normFort(side);
  if (isMine(side)) try { localStorage.setItem('flockfortress.lastfort', JSON.stringify(G.lastFort[side])); } catch (e) { }
  AUD.ready();
  if (G.mode === 'online') { mpSend({ k: 'fort', round: G.round, side, list: G.forts[side] }); if (!G.forts[1 - side]) say('Ready!', 'Waiting for the other fort…', 60); }
  if (G.mode === 'local' && side === 0) { for (const b of BODIES.filter(b => b.side === 0)) b.ghost = true; G.builder = 1; G.sel = 'bell'; passScreen(1, `${G.names[1]} builds`, `${G.names[0]}, look away!`); camTo('build', 1, true); renderBars(); return; }
  if (G.forts[0] && G.forts[1]) startSiege();
  renderBars();
}
function autoReady() { // build timer ran out: a bell on the ground gets lifted onto a crate
  for (const side of mySides()) if (!G.ready[side] && (G.mode !== 'local' || side === G.builder)) {
    if (!bellOf(side)) { const z = ZONES[side], x = (z.x0 + z.x1) / 2; placePiece(side, 'crate', x, WORLD.ground - 22, 0, true); placePiece(side, 'bell', x, WORLD.ground - 44 - 18, 0, true); }
    else if (bellOK(side)) { const b = bellOf(side); removeBody(b); placePiece(side, 'crate', b.x, WORLD.ground - 22, 0, true); placePiece(side, 'bell', b.x, WORLD.ground - 44 - 18, 0, true); }
    for (let i = 0; i < 60; i++) physAdvance(1 / 60);
    G.ready[side] = false; readyUp(side);
  }
}
function startSiege() {
  // both forts are rebuilt from their saved lists, so every screen starts from exactly the same state
  resetWorld(); buildFrom(0, G.forts[0]); buildFrom(1, G.forts[1]);
  G.phase = 'siege'; G.turn = G.starter; G.turnN = 0; G.shot = null;
  newWind();
  say(`${G.names[G.turn]} ${G.names[G.turn] === 'You' ? 'go' : 'goes'} first`, 'Knock their bell to the ground', 2.6);
  camTo('aim', G.turn, true);
  renderBars(); AUD.bell(0.4);
  if (G.mode === 'cpu' && G.turn === 1) cpuTurnSoon();
}
function newWind() { const r = rng(G.seed + G.round * 97 + G.turnN * 13); G.wind = Math.round((r() * 2 - 1) * 90 * (G.round > 1 ? 1.2 : 1)); }
// ---------- shooting
function canAim() { return G && G.phase === 'siege' && !G.shot && isMine(G.turn) && !(G.mode === 'cpu' && G.turn === 1); }
function launchPoint(side) { return [ZONES[side].cat + ZONES[side].dir * 26, WORLD.ground - 92]; }
function fire(side, type, vx, vy) {
  if (G.phase !== 'siege' || G.shot || G.ammo[side][type] <= 0) return false;
  G.ammo[side][type]--; G.stats[side].shots++;
  const S = SHEEP[type], [x, y] = launchPoint(side);
  const b = mkBody({ shape: 'circle', x, y, r: S.r, dens: S.dens, vx, vy, w: -side * 2 + 1, kind: 'sheep', st: type, side, fric: 0.8, rest: type === 'ram' ? 0.1 : 0.25, age: 0, ax: G.wind });
  b.id = 50000 + G.turnN * 20;
  G.shot = { side, t: 0, quiet: 0, boom: -9, bells: null }; G.authority = G.mode !== 'online' || isMine(side);
  G.catT = 0.5; G.catSide = side;
  AUD.launch(); AUD.baa(1 + Math.random() * 0.3);
  if (G.mode === 'online' && isMine(side)) mpSend({ k: 'shot', side, type, vx: Math.round(vx), vy: Math.round(vy) });
  renderBars(); camTo('follow', side);
  return true;
}
function splitTrio(b) {
  if (!b || b.st !== 'trio' || b.split || b.touched) return;
  b.split = true; removeBody(b); AUD.baa(1.5);
  for (let k = -1; k <= 1; k++) {
    const l = mkBody({ shape: 'circle', x: b.x + k * 4, y: b.y + k * 6, r: 11, dens: 1.2, vx: b.vx + k * 90, vy: b.vy + k * 110 - 20, kind: 'sheep', st: 'lamb', side: b.side, fric: 0.8, rest: 0.25, age: 0, ax: G.wind });
    l.id = b.id + 2 + k;
  }
  puff(b.x, b.y, 10, '#fff');
}
// physics hooks: first touches arm fuses, hard knocks damage blocks
HOOK.contact = (A, B, speed) => {
  if (!G || G.phase !== 'siege' || !G.shot) return;
  for (const [s, o] of [[A, B], [B, A]]) {
    if (s.kind === 'sheep' && !s.touched) {
      s.touched = true; s.ax = 0; LASTHIT[s.side] = [s.x, s.y];
      const S = SHEEP[s.st] || { fuse: 0.6 };
      if (s.st === 'sheep' || s.st === 'trio') s.fuse = S.fuse;
      else if (s.st === 'lamb') s.fuse = 0.6;
      else if (s.st === 'black') { s.fuse = S.fuse; s.pinned = true; s.vx = s.vy = s.w = 0; s.stuckTo = o === GROUND ? null : o; if (s.stuckTo) { s.ox = s.x - o.x; s.oy = s.y - o.y; s.oa = o.a; } AUD.thud(0.6); }
      if (speed > 200) AUD.baa(0.9 + Math.random() * 0.4);
    }
  }
  // impact damage to blocks
  if (speed > 150) for (const [b, o] of [[A, B], [B, A]]) {
    if (b.kind !== 'block') continue;
    const ram = o.kind === 'sheep' && o.st === 'ram', heavy = o.m && b.m ? o.m / (o.m + b.m) : 0.5;
    const dmg = (speed - (ram ? 90 : 200)) * (ram ? 0.34 : 0.06) * (0.4 + heavy);
    if (dmg > 0) hurt(b, dmg, o.kind === 'sheep' ? o.side : 1 - b.side);
  }
  if (speed > 260) AUD.thud(Math.min(1, speed / 900), (A.piece || B.piece));
};
HOOK.step = dt => {
  if (!G || !G.shot) return;
  for (const s of BODIES.slice()) {
    if (s.kind !== 'sheep') continue;
    s.age += dt;
    if (s.stuckTo) { const o = s.stuckTo; if (BODIES.includes(o)) { const c = Math.cos(o.a - s.oa), sn = Math.sin(o.a - s.oa); s.x = o.x + c * s.ox - sn * s.oy; s.y = o.y + sn * s.ox + c * s.oy; } else { s.stuckTo = null; s.pinned = false; } }
    // fluffball: grows while it rolls along, bursts when it stops
    if (s.st === 'fluff' && s.touched) {
      const sp = hyp(s.vx, s.vy);
      if (sp > 70 && s.r < 58) { s.r += dt * sp * 0.014; setMass(s); }
      s.slow = sp < 40 ? (s.slow || 0) + dt : 0;
      if (s.slow > 0.35 || s.age > 7) explode(s);
    }
    if (s.fuse !== undefined && s.fuse !== null) { s.fuse -= dt; if (s.fuse <= 0) explode(s); }
    if (s.st === 'ram' && s.touched && hyp(s.vx, s.vy) < 15) { s.calm = (s.calm || 0) + dt; if (s.calm > 1.2) { puff(s.x, s.y, 6, '#ddd'); removeBody(s); } }
    if (s.y > WORLD.ground + 300 || s.x < -300 || s.x > WORLD.W + 300 || s.age > 14) removeBody(s);
  }
};
function hurt(b, dmg, bySide) {
  if (!b.hp || b.kind !== 'block' || !BODIES.includes(b)) return;
  b.hp -= dmg; b.hitT = 0.25;
  if (b.hp <= 0) {
    removeBody(b);
    if (bySide !== b.side) G.dmg[bySide] += PIECES[b.piece].cost;
    const col = { hay: '#e8c860', crate: '#9a6a3a', plank: '#a8763e', stone: '#8d8a82', slab: '#7f7c75' }[b.piece];
    for (let i = 0; i < 14; i++) FX.push({ x: b.x + (Math.random() - 0.5) * b.hw * 2, y: b.y + (Math.random() - 0.5) * b.hh * 2, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 300, t: 0, life: 0.8 + Math.random() * 0.6, k: 'chip', s: 3 + Math.random() * 4, c: col, a: Math.random() * 6, w: (Math.random() - 0.5) * 12 });
    AUD.crunch(b.piece);
  }
}
// the explosion: shoves and damages everything nearby; any sheep in reach go off too, each bigger than the last
function explode(s) {
  if (s.dead) return; s.dead = true;
  const S = SHEEP[s.st] || { blast: 52 }, chain = s.chain || 1;
  let R = (s.st === 'fluff' ? 40 + s.r * 2.6 : s.st === 'lamb' ? 52 : S.blast) * chain;
  if (!R) { removeBody(s); return; }
  removeBody(s);
  G.shot.boom = G.shot.t; G.stats[s.side].best = Math.max(G.stats[s.side].best, chain);
  for (const b of BODIES.slice()) {
    if (b === GROUND) continue;
    const ext = b.shape === 'circle' ? b.r : Math.min(b.hw, b.hh), dx = b.x - s.x, dy = b.y - s.y, d = Math.max(1, hyp(dx, dy) - ext);
    if (d > R) continue;
    const k = 1 - d / R;
    if (b.kind === 'sheep' && !b.dead) { if (b.st !== 'ram') { b.chain = Math.min(2.6, chain * 1.25); b.fuse = b.fuse == null ? 0.09 : Math.min(b.fuse, 0.09); } }
    wake(b);
    if (b.pinned && b.kind !== 'sheep') continue;
    const J = R * 2.4 * k * (0.6 + 0.4 * chain), dl = hyp(dx, dy) || 1;
    if (!b.stat) { b.vx += dx / dl * J * b.im * 0.06; b.vy += (dy / dl - 0.35) * J * b.im * 0.06; b.w += (Math.random() - 0.5) * k * 6; }
    if (b.kind === 'block') hurt(b, 135 * k * (R / 78), s.side);
  }
  // wool everywhere
  puff(s.x, s.y, Math.round(18 + R / 4), '#fff', R);
  FX.push({ x: s.x, y: s.y, t: 0, life: 0.45, k: 'ring', s: R });
  G.shake = Math.min(14, 3 + R / 12);
  AUD.boom(R, chain);
  if (G.mode === 'online' && G.authority) mpSend({ k: 'fx', x: Math.round(s.x), y: Math.round(s.y), R: Math.round(R), chain });
}
function puff(x, y, n, c, R = 40) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = (0.3 + Math.random()) * R * 4; FX.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 0, life: 0.7 + Math.random() * 0.8, k: 'wool', s: 5 + Math.random() * 9 + R / 20, c }); }
}
// ---------- the end of a shot
function shotStep(dt) {
  const sh = G.shot; sh.t += dt;
  // a bell that touches the ground (or leaves the field) loses the round for its side
  for (const side of [0, 1]) {
    const b = bellOf(side); if (!b) continue;
    const ext = Math.abs(Math.cos(b.a)) * b.hh + Math.abs(Math.sin(b.a)) * b.hw;
    if (b.y + ext >= WORLD.ground - 3 || b.y > WORLD.ground + 50 || b.x < -50 || b.x > WORLD.W + 50) { if (G.authority !== false) bellDown(side); return; }
  }
  const sheepLeft = BODIES.some(b => b.kind === 'sheep');
  const moving = BODIES.some(b => !b.stat && !b.asleep && (b.kind === 'block' || b.kind === 'bell') && hyp(b.vx, b.vy) > 12);
  sh.quiet = !sheepLeft && !moving ? sh.quiet + dt : 0;
  if ((sh.quiet > 0.7 && sh.t - sh.boom > 0.8) || sh.t > 13) endShot();
}
function endShot() {
  for (const b of BODIES.filter(b => b.kind === 'sheep')) removeBody(b);
  G.shot = null; G.turnN++; cpuLearn();
  if (G.mode === 'online' && G.authority) { const st = snapState(true); mpSend({ k: 'end', state: st }); applyState(st, true); }   // both screens continue from the identical rounded state
  nextTurn();
}
function nextTurn() {
  const left = s => SHEEP_ORDER.reduce((a, k) => a + G.ammo[s][k], 0);
  if (!left(0) && !left(1)) { roundOver(G.dmg[0] === G.dmg[1] ? -1 : G.dmg[0] > G.dmg[1] ? 0 : 1, 'damage'); return; }
  G.turn = left(1 - G.turn) ? 1 - G.turn : G.turn;
  newWind();
  camTo('aim', G.turn);
  say(G.mode === 'cpu' ? (G.turn === 0 ? 'Your shot' : 'CPU is aiming…') : G.mode === 'local' ? `${G.names[G.turn]}'s shot` : (G.turn === G.me ? 'Your shot' : `${G.names[G.turn]} is aiming…`), '', 1.4);
  renderBars();
  if (G.mode === 'cpu' && G.turn === 1) cpuTurnSoon();
}
function bellDown(side) {
  if (G.phase !== 'siege') return;
  AUD.bell(1); const b = bellOf(side); if (b) puff(b.x, b.y, 18, '#ffd76a', 50);
  roundOver(1 - side, 'bell');
}
function roundOver(winner, why) {
  if (G.phase !== 'siege') return;
  G.phase = 'roundEnd'; G.shot = null;
  for (const b of BODIES.filter(b => b.kind === 'sheep')) removeBody(b);
  if (winner >= 0) G.wins[winner]++;
  if (G.mode === 'online' && G.authority) mpSend({ k: 'round', winner, why, state: snapState(true) });
  G.authority = false;
  const done = G.wins[0] >= 2 || G.wins[1] >= 2;
  setTimeout(() => showRoundCard(winner, why, done), 1300);
  renderBars();
}
function showRoundCard(winner, why, done) {
  if (!G) return;
  const you = winner >= 0 && isMine(winner) && G.mode !== 'local';
  const head = winner < 0 ? 'Draw' : G.mode === 'local' ? `${G.names[winner]} wins${done ? ' the match' : ''}!` : you ? (done ? 'Victory!' : 'Round won!') : (done ? 'Defeated' : 'Round lost');
  const sub = why === 'bell' ? (winner >= 0 ? `${G.names[1 - winner]}'s bell hit the ground.` : '') : why === 'left' ? 'The other player left.' : winner < 0 ? 'Same damage on both sides. Replay the round.' : `Out of sheep · more damage wins.`;
  if (done) G.phase = 'over';
  showCard(head, sub, `<span>${G.names[0]} ${G.wins[0]}</span><span>${G.names[1]} ${G.wins[1]}</span><span>💥 $${G.dmg[0]} · $${G.dmg[1]}</span>`,
    done ? (G.mode === 'online' && !isHost() ? 'Waiting for host…' : '▶ Rematch') : (G.mode === 'online' && !isHost() ? 'Waiting for host…' : '▶ Next round'),
    () => { if (G.mode === 'online') { if (!isHost()) return; if (done) hostStart(); else { mpSend({ k: 'next' }); hideCard(); newRound(); } } else if (done) newMatch({ mode: G.mode }); else { hideCard(); newRound(); } });
  AUD[you || (G.mode === 'local' && winner >= 0) ? 'win' : 'lose']();
}
// ---------- snapshots (online)
function snapState(full) {
  return { round: G.round, phase: G.phase, wins: G.wins, dmg: G.dmg, ammo: G.ammo, turn: G.turn, turnN: G.turnN, starter: G.starter,
    bodies: BODIES.filter(b => b !== GROUND && (full || !b.asleep)).map(b => [b.id, Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, +b.a.toFixed(3), b.kind, b.piece || b.st || '', b.side ?? -1, Math.round(b.hp || 0), +(b.r || 0).toFixed(1), b.hw, b.hh]),
    live: full ? null : BODIES.filter(b => b !== GROUND).map(b => b.id) };
}
function applyState(st, full) {
  if (full) { G.round = st.round; G.wins = st.wins; G.dmg = st.dmg; G.ammo = st.ammo; G.turn = st.turn; G.turnN = st.turnN; G.starter = st.starter; }
  const byId = new Map(BODIES.map(b => [b.id, b]));
  const seen = new Set();
  for (const [id, x, y, a, kind, sub, side, hp, r, hw, hh] of st.bodies) {
    let b = byId.get(id); seen.add(id);
    if (!b) {
      if (kind === 'sheep') b = mkBody({ shape: 'circle', x, y, r, kind, st: sub, side, dens: 1 });
      else { const P = PIECES[sub]; if (!P) continue; b = mkBody({ x, y, a, hw, hh, dens: P.dens, fric: P.fric, kind, piece: sub, side, hp, maxhp: P.hp }); }
      b.id = id;
    }
    b.px = b.x; b.py = b.y; b.pa = b.a; b.tx = x; b.ty = y; b.ta = a; if (full) { b.x = x; b.y = y; b.a = a; }
    if (kind === 'sheep' && r) b.r = r;
    if (hp && b.maxhp) b.hp = hp;
    b.vx = b.vy = b.w = 0; b.asleep = true;
  }
  const live = st.live ? new Set(st.live) : seen;
  for (const b of BODIES.slice()) if (b !== GROUND && !live.has(b.id)) { if (b.kind === 'block') hurt(b, 1e9, 1 - b.side); else removeBody(b); }
}
