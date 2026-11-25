// ================= CPU =================
const LASTHIT = [null, null];
// a fort from a randomised plan: front walls, a roofed hut with the bell on a pedestal, a back wall, hay padding
function cpuBuild(side) {
  const r = rng((G.seed ^ (G.round * 7919)) >>> 0), z = ZONES[side];
  const X = fx => side === 0 ? z.x1 - fx : z.x0 + fx;   // fx is the distance back from the front edge
  const GY = WORLD.ground, put = (t, fx, y, rot = 0) => placePiece(side, t, X(fx), y, rot, true);
  const col = (t, fx, n) => { for (let k = 0; k < n; k++) put(t, fx, GY - 22 - k * 44); };
  const mats = ['stone', 'stone', 'crate', 'hay'];
  // front walls
  const walls = 2 + Math.floor(r() * 2);
  for (let w = 0; w < walls; w++) col(w === 0 ? 'stone' : mats[Math.floor(r() * mats.length)], 30 + w * 48, 2 + Math.floor(r() * 3));
  // the bell hut
  const hut = 250 + r() * 170, ped = 1 + Math.floor(r() * 2), pedMat = r() < 0.5 ? 'crate' : 'stone';
  col(pedMat, hut, ped);
  put('bell', hut, GY - ped * 44 - 18);
  put('plank', hut - 42, GY - 70, 1); put('plank', hut + 42, GY - 70, 1);
  put('slab', hut, GY - 140 - 11);
  if (r() < 0.7) { put('hay', hut - 30, GY - 151 - 11 - 22); put('hay', hut + 16, GY - 151 - 11 - 22); }
  // back wall and leftovers
  col(r() < 0.5 ? 'stone' : 'crate', hut + 110, 2 + Math.floor(r() * 2));
  // spend the rest on more walls, heaviest first while the money lasts
  for (let k = 0; k < 40 && money(side) >= 30; k++) {
    const m = money(side), fx = 20 + r() * 600, t = m > 420 && r() < 0.55 ? 'stone' : m > 150 && r() < 0.5 ? 'crate' : 'hay';
    col(t, fx, 1 + Math.floor(r() * 3));
  }
  for (let k = 0; k < 12 && money(side) >= 15; k++) put('hay', 20 + r() * 600, GY - 22 - Math.floor(r() * 3) * 44);
  for (let i = 0; i < 60; i++) physAdvance(1 / 60);
  // honey the hut and a few walls
  const glue = BODIES.filter(b => b.side === side && b.piece && b.piece !== 'hay' && b.kind !== 'bell').sort(() => r() - 0.5);
  for (const b of glue.slice(0, [3, 6, 10][SET.diff])) honey(side, b, true);
  for (let i = 0; i < 120; i++) physAdvance(1 / 60);
  if (bellOK(side)) { // fallback: a plain pillar
    for (const b of BODIES.filter(b => b.side === side)) removeBody(b);
    col('stone', 60, 3); col('crate', 300, 2); put('bell', 300, GY - 88 - 18);
    for (let i = 0; i < 120; i++) physAdvance(1 / 60);
  }
  G.ready[side] = true; G.forts[side] = serializeFort(side);
}
// trajectory with wind: where is the sheep when it reaches the target's x?
function flightY(lx, ly, vx, vy, tx, wind) {
  let x = lx, y = ly, t = 0; const dt = 1 / 120;
  while (t < 6) { vx += wind * dt; vy += PH.g * dt; x += vx * dt; y += vy * dt; t += dt; if ((vx > 0 && x >= tx) || (vx < 0 && x <= tx)) return y; if (y > WORLD.ground) return WORLD.ground + 200; }
  return WORLD.ground + 200;
}
function cpuTurnSoon() { clearTimeout(cpuTurnSoon.t); cpuTurnSoon.t = setTimeout(cpuShoot, TEST ? 0 : 900 + Math.random() * 600); }
function cpuShoot() {
  if (!G || G.mode !== 'cpu' || G.phase !== 'siege' || G.shot || G.turn !== 1) return;
  const side = 1, am = G.ammo[side], bell = bellOf(0); if (!bell) return;
  const [lx, ly] = launchPoint(side), mem = G.cpuMem || (G.cpuMem = { dx: 0, n: 0 });
  // pick a sheep: black sheep and rams for walled bells, the trio for exposed ones, plain sheep otherwise
  const near = BODIES.filter(b => b.side === 0 && b.piece && Math.abs(b.x - bell.x) < 120 && b.y < bell.y + 30);
  const stone = near.filter(b => b.piece === 'stone' || b.piece === 'slab').length;
  let type = 'sheep';
  if (am.black && stone >= 2 && Math.random() < 0.6) type = 'black';
  else if (am.ram && stone >= 1 && Math.random() < 0.4) type = 'ram';
  else if (am.trio && near.length < 4 && Math.random() < 0.5) type = 'trio';
  else if (am.fluff && Math.random() < 0.2) type = 'fluff';
  if (!am[type]) type = SHEEP_ORDER.find(k => am[k] > 0);
  if (!type) return;
  // aim at the bell (roofed bells get a high lob), corrected by where the last shot landed
  const roofed = near.some(b => b.y < bell.y - 20);
  const tx = bell.x - mem.dx * [0.3, 0.6, 0.85][SET.diff], ty = bell.y - (roofed ? 30 : 4);
  const angles = (roofed || type === 'black' ? [1.15, 1.0, 0.85] : type === 'fluff' ? [0.35, 0.5] : [0.55, 0.75, 0.95, 1.1]);
  let best = null;
  for (const ang of angles) {
    let lo = 150, hi = VMAX * 1.15;
    for (let i = 0; i < 26; i++) { const v = (lo + hi) / 2, y = flightY(lx, ly, -Math.cos(ang) * v, -Math.sin(ang) * v, tx, G.wind); if (y > ty) lo = v; else hi = v; }
    const v = (lo + hi) / 2; if (v <= VMAX && (!best || Math.random() < 0.4)) best = { ang, v };
  }
  if (!best) best = { ang: 0.8, v: VMAX };
  const noise = [0.06, 0.025, 0.008][SET.diff], v = best.v * (1 + (Math.random() * 2 - 1) * noise), ang = best.ang + (Math.random() * 2 - 1) * noise * 0.6;
  G.cpuAim = tx; LASTHIT[side] = null;
  fire(side, type, -Math.cos(ang) * v, -Math.sin(ang) * v);
  if (type === 'trio') setTimeout(() => { const t = BODIES.find(b => b.st === 'trio' && b.side === side); if (t) splitTrio(t); }, 450);
}
// learn from the miss once the shot is over
function cpuLearn() { if (!G || G.mode !== 'cpu' || !LASTHIT[1] || G.cpuAim == null) return; const m = G.cpuMem || (G.cpuMem = { dx: 0, n: 0 }); m.dx = m.dx * 0.4 + (LASTHIT[1][0] - G.cpuAim) * 0.6; m.n++; G.cpuAim = null; }
