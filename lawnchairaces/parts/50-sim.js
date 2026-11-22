// Simulation: lawn-chair flight, balloon clusters, pellet ballistics, AI, match rules.
const PHYS = {
  g: 9.81,
  liftH: 1200,          // lift factor f(h) = 1 - h / liftH, gives a stable float altitude
  liftPerBalloon: 6.4,  // kg of lift for a 0.85 m radius balloon at the water
  tether: 4.4,          // hub (where every balloon string meets) to the seat
  ring: 3.0,            // rigging ring above the seat (high, so the ropes clear your head)
  vDrag: 14,            // vertical drag, N per (m/s)^2
  hRelax: 0.16,         // 1/s, how fast a chair takes up the wind
  pelletK: 0.0085,      // pellet drag, 1/m
  waterMax: 24,         // kg of water in six 4 kg jugs
  pourRate: 1.3,        // kg/s while pouring
  leakRate: 0.35,       // kg/s from a holed jug
  jugEmpty: 0.15,
  nBalloons: 28,
  splashY: 0.35,
  blowAcc: 0.75,        // m/s^2 of push from the leaf blower
  blowHeat: 4.2,        // seconds of blowing until it overheats
  blowCool: 7,          // seconds to cool from fully hot
  blowRestart: 0.35,    // an overheated blower restarts below this heat
};
const DIFF = {
  easy:   { ang: 0.062, rng: 0.9,  react: 2.2, think: 1.2, range: 130, label: 'EASY' },
  normal: { ang: 0.042, rng: 0.6,  react: 1.6, think: 0.8, range: 125, label: 'NORMAL' },
  hard:   { ang: 0.025, rng: 0.35, react: 1.0, think: 0.5, range: 115, label: 'HARD' },
};
const LOOKS = [
  { name: 'You', tag: '#ffd34d', pal: [[0.86, 0.06, 0.05], [0.95, 0.72, 0.06], [0.92, 0.92, 0.88], [0.9, 0.25, 0.04]],
    webA: [0.15, 0.5, 0.2, 0.3], webB: [0.9, 0.85, 0.2, 0.3], jacket: [0.1, 0.17, 0.34, 0.3], pants: [0.3, 0.27, 0.2, 0.3], shoe: [0.85, 0.85, 0.82, 0.3], skin: [0.8, 0.58, 0.44, 0.2], hat: [0.75, 0.12, 0.1, 0.3], hair: [0.25, 0.17, 0.1, 0.2] },
  { name: 'Gus', tag: '#5ab4ff', pal: [[0.05, 0.25, 0.85], [0.9, 0.92, 0.95], [0.06, 0.6, 0.75], [0.12, 0.12, 0.55]],
    webA: [0.12, 0.3, 0.7, 0.3], webB: [0.92, 0.92, 0.92, 0.3], jacket: [0.2, 0.32, 0.18, 0.3], pants: [0.35, 0.3, 0.22, 0.3], shoe: [0.3, 0.2, 0.12, 0.3], skin: [0.72, 0.5, 0.38, 0.2], hat: [0.85, 0.75, 0.3, 0.3], hair: [0.6, 0.58, 0.55, 0.2] },
  { name: 'Marge', tag: '#ff7ad1', pal: [[0.9, 0.2, 0.55], [0.5, 0.15, 0.7], [0.95, 0.75, 0.85], [0.95, 0.45, 0.6]],
    webA: [0.75, 0.2, 0.45, 0.3], webB: [0.95, 0.9, 0.8, 0.3], jacket: [0.6, 0.15, 0.45, 0.3], pants: [0.12, 0.12, 0.14, 0.3], shoe: [0.9, 0.9, 0.9, 0.3], skin: [0.86, 0.65, 0.52, 0.2], hat: [0.95, 0.95, 0.95, 0.3], hair: [0.75, 0.55, 0.3, 0.2] },
  { name: 'Dale', tag: '#8be04a', pal: [[0.25, 0.7, 0.08], [0.92, 0.88, 0.1], [0.05, 0.45, 0.18], [0.65, 0.85, 0.3]],
    webA: [0.9, 0.5, 0.1, 0.3], webB: [0.2, 0.55, 0.2, 0.3], jacket: [0.85, 0.45, 0.08, 0.3], pants: [0.25, 0.25, 0.27, 0.3], shoe: [0.15, 0.15, 0.15, 0.3], skin: [0.55, 0.38, 0.27, 0.2], hat: [0.2, 0.45, 0.2, 0.3], hair: [0.12, 0.1, 0.08, 0.2] },
];
const JUG_POS = [[0.34, -0.47, 0.16], [0.34, -0.47, -0.04], [0.34, -0.47, -0.24], [-0.34, -0.47, 0.16], [-0.34, -0.47, -0.04], [-0.34, -0.47, -0.24]];

const G = {
  phase: 'title', mode: 'duel', diff: 'normal', t: 0, matchT: 0, countdown: 0,
  chairs: [], pellets: [], free: [], parts: [], ripples: [], feed: [], targets: [], boats: [],
  rng: RNG(1), player: null, score: 0, practiceLeft: 0, winner: null, overT: 0,
  settings: { tracers: true, guide: true, sway: true, sound: true, sens: 1, invert: false, time: 'golden', quality: 'high', touch: false },
  hitFlash: 0, popFlash: 0, msg: null, msgT: 0,
};

// helium seeps through latex: negligible at first, it decides long matches
function seepFactor() { return Math.exp(-sq(G.matchT / 1500)); }
function chairLift(c) { let s = 0; for (const b of c.balloons) if (b.alive) s += b.lift; return s * (c.noSeep ? 1 : seepFactor()); }
function chairMass(c) { let w = c.baseMass; for (const j of c.jugs) w += j.kg + PHYS.jugEmpty; return w; }
function chairWater(c) { let w = 0; for (const j of c.jugs) w += j.kg; return w; }
function aliveBalloons(c) { let n = 0; for (const b of c.balloons) if (b.alive) n++; return n; }
function eqAltitude(c) {
  const L = chairLift(c), W = chairMass(c);
  if (W >= L) return -1;
  return PHYS.liftH * (1 - W / L);
}
function seatPos(c) {
  const sx = c.swing[0], sz = c.swing[1], T = PHYS.tether;
  return [c.hub[0] + sx, c.hub[1] - Math.sqrt(Math.max(0.1, T * T - sx * sx - sz * sz)), c.hub[2] + sz];
}
function chairBasis(c) {
  const seat = seatPos(c);
  const u = v3.norm(v3.sub(c.hub, seat));
  const f0 = [Math.sin(c.yaw), 0, Math.cos(c.yaw)];
  const r = v3.norm(v3.cross(u, f0));
  const f = v3.cross(r, u);
  return { seat, r, u, f, m: m4.basis(seat, r, u, f) };
}
function clusterCentre(c) {
  let s = [0, 0, 0], n = 0;
  for (const b of c.balloons) if (b.alive) { s = v3.add(s, b.p); n++; }
  return n ? v3.mul(s, 1 / n) : v3.add(c.hub, [0, 3, 0]);
}

function makeChair(idx, look, isPlayer, pos, alt, rng) {
  const c = {
    idx, look, name: isPlayer || look.name !== 'You' ? look.name : 'Hank', isPlayer,
    hub: [pos[0], alt + PHYS.tether, pos[1]], vel: [0, 0, 0], prevVel: [0, 0, 0],
    swing: [0, 0], swingV: [0, 0], yaw: Math.atan2(-pos[0], -pos[1]),
    balloons: [], jugs: JUG_POS.map(() => ({ kg: PHYS.waterMax / 6, leak: false })),
    baseMass: 100, rifle: { pumps: 0, loaded: true, state: 'idle', t: 0, lever: 0, bolt: 0, recoil: 0, lower: 0, pumpHeld: false },
    aimYaw: 0, aimPitch: 0, alive: true, out: null, outT: 0, pourT: 0, cutHold: 0,
    blower: { heat: 0, on: false, lock: false, want: false, t: 0 },
    stats: { shots: 0, hits: 0, pops: 0, lost: 0, jugs: 0, strings: 0, best: 0 },
    meshes: null, ai: null, creak: 0, lastHitBy: null, dmgFlash: 0,
  };
  c.aimYaw = c.yaw;
  // balloons: varied sizes and string lengths, arranged as a dome above the hub
  const pal = look.pal;
  const N = PHYS.nBalloons;
  for (let i = 0; i < N; i++) {
    const r = rng.range(0.72, 0.86);
    const str = 2.4 + (i / N) * 2.9 + rng.range(-0.25, 0.25);
    const phi = Math.acos(1 - (i + 0.5) / N * 0.85), th = i * 2.399963;
    const d = [Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)];
    const p = v3.add(c.hub, v3.mul(d, str));
    const col = pal[i % pal.length].map((x) => clamp(x * rng.range(0.92, 1.06), 0, 1));
    c.balloons.push({ p, pp: p.slice(), r, str, lift: PHYS.liftPerBalloon * Math.pow(r / 0.85, 3), col, gloss: rng.range(0.6, 1), alive: true, seed: rng() });
  }
  const L0 = chairLift(c);
  // base mass chosen so a full water load floats at the start altitude
  c.baseMass = L0 * (1 - alt / PHYS.liftH) - PHYS.waterMax - 6 * PHYS.jugEmpty;
  if (typeof R !== 'undefined' && R.gl) c.meshes = R.makeChairMeshes(look);
  return c;
}

function makeAI(c, diffName, rng) {
  const d = DIFF[diffName];
  c.ai = {
    d, target: null, think: rng.range(0, 1), plan: rng.range(2, 4), targetAlt: c.hub[1] - PHYS.tether,
    aimT: 0, aimYaw: c.yaw, aimPitch: 0, wantYaw: c.yaw, wantPitch: 0, settle: 0, pumpsGoal: 8,
    prefer: d.range * rng.range(0.85, 1.15), cutCd: 0, pourKg: 0, hesitate: rng.range(0.3, 1.2), personality: rng(),
  };
}

// ---------- match setup ----------
function setupMatch(mode, diff, opts) {
  opts = opts || {};
  G.mode = mode; G.diff = diff;
  const seed = opts.seed !== undefined ? opts.seed : (TEST ? +(URLQ.get('seed') || 1) : Math.floor(Math.random() * 1e9));
  G.rng = RNG(seed);
  const rng = G.rng;
  WIND.setup(rng);
  G.chairs = []; G.pellets = []; G.free = []; G.parts = []; G.ripples = []; G.feed = []; G.targets = [];
  G.t = 0; G.matchT = 0; G.winner = null; G.score = 0; G.overT = 0; G.msg = null; G.seepMsg = 0; G.titleEnd = 0;
  const centre = [rng.range(-60, 60), rng.range(-60, 60)];
  const ang0 = rng() * TAU;
  if (mode === 'duel') {
    const sep = rng.range(95, 125);
    const pa = [centre[0] + Math.cos(ang0) * sep / 2, centre[1] + Math.sin(ang0) * sep / 2];
    const pb = [centre[0] - Math.cos(ang0) * sep / 2, centre[1] - Math.sin(ang0) * sep / 2];
    G.chairs.push(makeChair(0, LOOKS[0], !opts.spectate, pa, rng.range(130, 160), rng));
    G.chairs.push(makeChair(1, LOOKS[1 + rng.int(0, 2)], false, pb, rng.range(120, 170), rng));
  } else if (mode === 'ffa') {
    for (let i = 0; i < 4; i++) {
      const a = ang0 + i * TAU / 4 + rng.range(-0.25, 0.25), rr = rng.range(55, 75);
      G.chairs.push(makeChair(i, LOOKS[i], i === 0 && !opts.spectate, [centre[0] + Math.cos(a) * rr, centre[1] + Math.sin(a) * rr], rng.range(105, 185), rng));
    }
  } else if (mode === 'practice') {
    G.chairs.push(makeChair(0, LOOKS[0], true, centre, 150, rng));
    for (let i = 0; i < 9; i++) spawnTarget(rng);
    G.practiceLeft = 180;
  }
  for (const c of G.chairs) {
    c.idx = G.chairs.indexOf(c);
    if (!c.isPlayer) makeAI(c, diff, rng);
  }
  if (opts.spectate) { for (const c of G.chairs) { if (!c.ai) makeAI(c, diff, rng); c.isPlayer = false; } }
  G.player = G.chairs.find((c) => c.isPlayer) || null;
  if (G.player) {
    const others = G.chairs.filter((c) => c !== G.player);
    const tgt = others.length ? others[0].hub : [0, G.player.hub[1], 0];
    INPUT.yaw = Math.atan2(tgt[0] - G.player.hub[0], tgt[2] - G.player.hub[2]);
    INPUT.pitch = 0.0;
    G.player.yaw = INPUT.yaw;
  }
  // settle the balloon clusters before the start
  for (let i = 0; i < 240; i++) for (const c of G.chairs) simBalloons(c, 1 / 60);
  setupBoats();
  logMsg('match', mode, diff, 'seed', seed, 'chairs', G.chairs.length);
}

function spawnTarget(rng) {
  const p = G.player ? G.player.hub : [0, 150, 0];
  for (let k = 0; k < 30; k++) {
    const a = rng() * TAU, d = rng.range(35, 210);
    const x = p[0] + Math.cos(a) * d, z = p[2] + Math.sin(a) * d;
    if (Math.hypot(x, z) > 420 || WORLD.height(x, z) > -1.5) continue;
    const h = clamp(p[1] - PHYS.tether + rng.range(-70, 70), 40, 260);
    const t = { anchor: [x, 0, z], height: h, balloons: [], alive: true, respawn: 0, hue: rng.int(0, 3) };
    const pal = [[0.95, 0.1, 0.1], [0.98, 0.6, 0.05], [0.95, 0.95, 0.9], [0.1, 0.5, 0.95]];
    for (let i = 0; i < 3; i++) {
      const hub = [x, h, z];
      const pp = v3.add(hub, [Math.cos(i * 2.1) * 0.8, 1.6, Math.sin(i * 2.1) * 0.8]);
      t.balloons.push({ p: pp, pp: pp.slice(), r: rng.range(0.55, 0.7), str: 1.7 + i * 0.25, col: pal[(t.hue + i) % 4], gloss: 0.9, alive: true, seed: rng(), lift: 0 });
    }
    t.hub = [x, h, z];
    G.targets.push(t);
    return;
  }
}

function setupBoats() {
  G.boats = [];
  if (typeof R === 'undefined' || !R.boats) return;
  for (const b of R.boats) {
    G.boats.push({ ...b, p: b.p.slice(), bob: Math.random() * 10, people: b.moored ? 0 : (b.kind === 'pontoon' ? 3 : 2) });
  }
  // a rescue boat waits by the swim raft
  G.boats.push({ kind: 'fish', p: [95, 0, 250], heading: 0.4, moored: false, people: 1, rescue: true, task: null, bob: 0 });
}

// ---------- flight ----------
function simChair(c, dt) {
  const seat = seatPos(c);
  if (c.out === 'splash') {
    // floating on the lake, balloons still tugging at it
    const w = WIND.at(c.hub[0], 5, c.hub[2], G.t);
    c.vel[0] += (w[0] * 0.12 - c.vel[0]) * 0.5 * dt; c.vel[2] += (w[1] * 0.12 - c.vel[2]) * 0.5 * dt;
    c.vel[1] = 0;
    c.hub[0] += c.vel[0] * dt; c.hub[2] += c.vel[2] * dt;
    const n = aliveBalloons(c);
    const bob = Math.sin(G.t * 1.7 + c.idx) * 0.04;
    c.hub[1] = 0.05 + bob + PHYS.tether * clamp(n / 8, 0.15, 1);
    c.swing[0] *= 0.98; c.swing[1] *= 0.98;
    simBalloons(c, dt);
    return;
  }
  const alt = seat[1];
  const L = chairLift(c) * clamp(1 - Math.max(0, alt) / PHYS.liftH, 0.5, 1.05);
  const W = chairMass(c);
  const mEff = W + 1.5 * aliveBalloons(c) + 20;
  const Fv = (L - W) * PHYS.g - PHYS.vDrag * c.vel[1] * Math.abs(c.vel[1]);
  c.vel[1] += Fv / mEff * dt;
  const w = WIND.at(c.hub[0], c.hub[1] + 3, c.hub[2], G.t);
  c.prevVel[0] = c.vel[0]; c.prevVel[2] = c.vel[2];
  c.vel[0] += (w[0] - c.vel[0]) * PHYS.hRelax * dt;
  c.vel[2] += (w[1] - c.vel[2]) * PHYS.hRelax * dt;
  // leaf blower on the back of the chair: pushes the chair the way it faces, overheats quickly
  const bl = c.blower;
  bl.on = !!(bl.want && !bl.lock && c.alive);
  if (bl.on) {
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    c.vel[0] += fx * PHYS.blowAcc * dt; c.vel[2] += fz * PHYS.blowAcc * dt;
    c.swingV[0] += fx * 0.35 * dt; c.swingV[1] += fz * 0.35 * dt;
    bl.heat = Math.min(1, bl.heat + dt / PHYS.blowHeat);
    bl.t += dt;
    if (bl.heat >= 1) { bl.lock = true; bl.on = false; if (c.isPlayer) AUD.sputter(); }
    spawnBlowerAir(c, dt);
  } else {
    bl.heat = Math.max(0, bl.heat - dt / PHYS.blowCool);
    if (bl.lock && bl.heat < PHYS.blowRestart) bl.lock = false;
    bl.t = 0;
  }
  c.hub[0] += c.vel[0] * dt; c.hub[1] += c.vel[1] * dt; c.hub[2] += c.vel[2] * dt;
  // pendulum swing of the chair under the hub
  const ax = (c.vel[0] - c.prevVel[0]) / dt, az = (c.vel[2] - c.prevVel[2]) / dt;
  const k = PHYS.g / PHYS.tether;
  const gust = vnoise(G.t * 0.35, c.idx * 7.1, 5) * 0.25;
  for (let i = 0; i < 2; i++) {
    const a = -k * c.swing[i] - 0.45 * c.swingV[i] - (i === 0 ? ax : az) * 0.9 + gust * (i ? 0.6 : 1);
    c.swingV[i] += a * dt;
    c.swing[i] += c.swingV[i] * dt;
    c.swing[i] = clamp(c.swing[i], -1.2, 1.2);
  }
  // water: pouring and leaking jugs
  let flowing = 0;
  if (c.pouring && c.alive) {
    let need = PHYS.pourRate * dt;
    for (let j = 0; j < c.jugs.length && need > 0; j++) {
      const jug = c.jugs[j]; if (jug.kg <= 0) continue;
      const take = Math.min(jug.kg, need); jug.kg -= take; need -= take; flowing = j + 1;
      if (Math.random() < dt * 30) spawnPourDrop(c, j);
    }
    if (!flowing) c.pouring = false;
  }
  for (let j = 0; j < c.jugs.length; j++) {
    const jug = c.jugs[j];
    if (jug.leak && jug.kg > 0) { jug.kg = Math.max(0, jug.kg - PHYS.leakRate * dt); if (Math.random() < dt * 20) spawnPourDrop(c, j, true); }
  }
  c.flowing = flowing;
  simBalloons(c, dt);
  if (!c.alive) return;
  // creak sounds from big swings
  c.creak -= dt;
  if (c.creak < 0 && Math.hypot(c.swingV[0], c.swingV[1]) > 0.35) { c.creak = 1.5 + Math.random() * 2; if (c.isPlayer) AUD.creak(); }
  // elimination checks
  const s2 = seatPos(c);
  const r = Math.hypot(s2[0], s2[2]);
  if (s2[1] < PHYS.splashY) {
    if (WORLD.height(s2[0], s2[2]) < -0.3) eliminate(c, 'splash');
    else eliminate(c, 'landed');
  } else if (r > WORLD.arenaR) {
    eliminate(c, 'drift');
  } else if (r > 380) {
    const th = WORLD.height(s2[0], s2[2]);
    if (th > 0 && s2[1] < th + 18) eliminate(c, 'landed');
  }
}

function simBalloons(c, dt) {
  const hub = c.hub, B = c.balloons;
  const w = c.alive || c.out === 'splash' ? WIND.at(hub[0], hub[1] + 4, hub[2], G.t) : [c.vel[0], c.vel[2]];
  const dt2 = dt * dt;
  for (const b of B) {
    if (!b.alive) continue;
    const vx = (b.p[0] - b.pp[0]) / dt, vy = (b.p[1] - b.pp[1]) / dt, vz = (b.p[2] - b.pp[2]) / dt;
    const jit = Math.sin(G.t * 0.9 + b.seed * 20) * 0.3;
    const ax = (w[0] + jit - vx) * 1.4, az = (w[1] - jit - vz) * 1.4, ay = 5.5 - vy * 0.8;
    b.pp[0] = b.p[0]; b.pp[1] = b.p[1]; b.pp[2] = b.p[2];
    b.p[0] += vx * dt * 0.97 + ax * dt2;
    b.p[1] += vy * dt * 0.97 + ay * dt2;
    b.p[2] += vz * dt * 0.97 + az * dt2;
  }
  for (let it = 0; it < 2; it++) {
    for (let i = 0; i < B.length; i++) {
      const a = B[i]; if (!a.alive) continue;
      for (let j = i + 1; j < B.length; j++) {
        const b = B[j]; if (!b.alive) continue;
        const dx = a.p[0] - b.p[0], dy = a.p[1] - b.p[1], dz = a.p[2] - b.p[2];
        const md = a.r + b.r + 0.03;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < md * md && d2 > 1e-8) {
          const d = Math.sqrt(d2), k = (md - d) / d * 0.5;
          a.p[0] += dx * k; a.p[1] += dy * k; a.p[2] += dz * k;
          b.p[0] -= dx * k; b.p[1] -= dy * k; b.p[2] -= dz * k;
        }
      }
    }
    for (const b of B) {
      if (!b.alive) continue;
      const dx = b.p[0] - hub[0], dy = b.p[1] - hub[1], dz = b.p[2] - hub[2];
      const L = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const s = b.str + b.r * 1.15;
      if (L > s) { const k = s / L; b.p[0] = hub[0] + dx * k; b.p[1] = hub[1] + dy * k; b.p[2] = hub[2] + dz * k; }
      if (b.p[1] < hub[1] + b.r) b.p[1] = hub[1] + b.r;
    }
  }
}

// ---------- rifle ----------
function muzzleVel(p) { return p <= 0 ? 0 : 60 + 155 * Math.pow(p / 10, 0.75); }
function strokeTime(p) { return 0.36 + 0.05 * p; }

// returns true if a shot is fired
function rifleUpdate(c, dt, wantPump, wantFire) {
  const rf = c.rifle;
  rf.recoil = Math.max(0, rf.recoil - dt * 6);
  if (rf.state === 'bolt') {
    rf.t += dt;
    rf.bolt = Math.sin(clamp(rf.t / 0.55, 0, 1) * Math.PI);
    if (rf.t >= 0.55) { rf.state = 'idle'; rf.loaded = true; rf.bolt = 0; if (c.isPlayer) AUD.boltClose(); }
  } else if (rf.state === 'stroke') {
    rf.t += dt;
    const T = strokeTime(rf.pumps);
    const u = clamp(rf.t / T, 0, 1);
    rf.lever = u < 0.45 ? smoothstep(0, 1, u / 0.45) : 1 - smoothstep(0, 1, (u - 0.45) / 0.55);
    if (!rf.halfSound && u > 0.45) { rf.halfSound = true; if (c.isPlayer) AUD.pumpClose(rf.pumps); }
    if (u >= 1) { rf.pumps = Math.min(10, rf.pumps + 1); rf.state = 'idle'; rf.lever = 0; }
  }
  if (rf.state === 'idle') {
    if (wantPump) {
      if (!rf.loaded) { rf.state = 'bolt'; rf.t = 0; if (c.isPlayer) AUD.boltOpen(); }
      else if (rf.pumps < 10) { rf.state = 'stroke'; rf.t = 0; rf.halfSound = false; if (c.isPlayer) AUD.pumpOpen(rf.pumps); }
    } else if (wantFire) {
      if (rf.loaded && rf.pumps > 0) return true;
      if (c.isPlayer && wantFire === 'edge') AUD.dry();
    }
  }
  rf.lower = lerp(rf.lower, (rf.state === 'stroke' || rf.state === 'bolt' || (wantPump && rf.pumps < 10)) ? 1 : 0, 1 - Math.exp(-dt * 10));
  return false;
}

function fireRifle(c, origin, dir) {
  const rf = c.rifle;
  const v = muzzleVel(rf.pumps);
  const vel = v3.add(v3.mul(dir, v), [c.vel[0], c.vel[1], c.vel[2]]);
  G.pellets.push({ p: origin.slice(), v: vel, owner: c, t: 0, pumps: rf.pumps, start: origin.slice(), whiz: false });
  c.stats.shots++;
  rf.pumps = 0; rf.loaded = false; rf.recoil = 1;
  // muzzle puff
  const mz = v3.add(origin, v3.mul(dir, 0.15));
  for (let i = 0; i < 6; i++) G.parts.push({ type: 0, p: mz.slice(), v: v3.add(v3.mul(dir, 1.5 + Math.random() * 2), [(Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6]), size: 0.05 + Math.random() * 0.05, grow: 0.5, col: [0.95, 0.95, 0.95], a: 0.35, life: 0.6, age: 0, drag: 3, grav: 0, wind: 1 });
  if (c.isPlayer) AUD.shot(v); else AUD.shotFar(mz, v);
}

// ---------- pellets ----------
function segSphere(p0, p1, c, r) {
  const d = v3.sub(p1, p0), f = v3.sub(p0, c);
  const a = v3.dot(d, d), b = 2 * v3.dot(f, d), cc = v3.dot(f, f) - r * r;
  const disc = b * b - 4 * a * cc;
  if (disc < 0) return -1;
  const s = Math.sqrt(disc);
  const t1 = (-b - s) / (2 * a);
  if (t1 >= 0 && t1 <= 1) return t1;
  if (cc < 0) return 0;
  return -1;
}
function segSegDist(p1, q1, p2, q2) {
  const d1 = v3.sub(q1, p1), d2 = v3.sub(q2, p2), r = v3.sub(p1, p2);
  const a = v3.dot(d1, d1), e = v3.dot(d2, d2), f = v3.dot(d2, r);
  let s, t;
  const c = v3.dot(d1, r), b = v3.dot(d1, d2), den = a * e - b * b;
  s = den > 1e-9 ? clamp((b * f - c * e) / den, 0, 1) : 0;
  t = (b * s + f) / e;
  if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
  const cp1 = v3.add(p1, v3.mul(d1, s)), cp2 = v3.add(p2, v3.mul(d2, t));
  return [v3.dist(cp1, cp2), s];
}
function jugWorld(c, j, basis) {
  const B = basis || chairBasis(c);
  const lp = JUG_POS[j];
  return v3.add(B.seat, v3.add(v3.mul(B.r, lp[0]), v3.add(v3.mul(B.u, lp[1] - 0.18), v3.mul(B.f, lp[2]))));
}
function stepPellet(pl, dt) {
  const w = WIND.at(pl.p[0], pl.p[1], pl.p[2], G.t);
  const rv = [pl.v[0] - w[0], pl.v[1], pl.v[2] - w[1]];
  const sp = v3.len(rv);
  const k = PHYS.pelletK * sp;
  pl.v[0] -= rv[0] * k * dt; pl.v[1] -= rv[1] * k * dt + PHYS.g * dt; pl.v[2] -= rv[2] * k * dt;
  pl.p[0] += pl.v[0] * dt; pl.p[1] += pl.v[1] * dt; pl.p[2] += pl.v[2] * dt;
}

function updatePellets(dt) {
  const sub = 4, h = dt / sub;
  const cam = CAM.pos;
  for (let i = G.pellets.length - 1; i >= 0; i--) {
    const pl = G.pellets[i];
    let dead = false;
    for (let s = 0; s < sub && !dead; s++) {
      const p0 = pl.p.slice();
      stepPellet(pl, h);
      pl.t += h;
      dead = pelletCollide(pl, p0, pl.p);
      if (!dead && pl.p[1] < 0) {
        const t = p0[1] / (p0[1] - pl.p[1]);
        const hp = v3.lerp(p0, pl.p, t);
        if (WORLD.height(hp[0], hp[2]) < 0) { addRipple(hp[0], hp[2], 0.25); spawnSplash(hp, 0.15); }
        dead = true;
      }
      if (!dead && pl.p[1] < 60 && Math.hypot(pl.p[0], pl.p[2]) > 300 && WORLD.height(pl.p[0], pl.p[2]) > pl.p[1]) dead = true;
    }
    if (!pl.whiz && pl.owner !== G.player && G.player) {
      const d = v3.dist(pl.p, cam);
      if (d < 4.5) { pl.whiz = true; AUD.whiz(pl.p, d); }
    }
    if (pl.t > 4 || dead) G.pellets.splice(i, 1);
  }
}

function pelletCollide(pl, p0, p1) {
  let best = 2, hit = null;
  const segLen = v3.dist(p0, p1);
  const mid = v3.lerp(p0, p1, 0.5);
  for (const c of G.chairs) {
    const cc = v3.add(c.hub, [0, 3.5, 0]);
    if (v3.dist(mid, cc) > 12 + segLen) continue;
    for (const b of c.balloons) {
      if (!b.alive) continue;
      const t = segSphere(p0, p1, b.p, b.r * 0.97);
      if (t >= 0 && t < best) { best = t; hit = { kind: 'balloon', c, b }; }
    }
    if (!c.alive && c.out !== 'splash') continue;
    const B = chairBasis(c);
    if (!(c === pl.owner && pl.t < 0.08)) {
      const body = v3.add(B.seat, v3.mul(B.u, 0.3));
      const t = segSphere(p0, p1, body, 0.42);
      if (t >= 0 && t < best) { best = t; hit = { kind: 'chair', c }; }
    }
    for (let j = 0; j < c.jugs.length; j++) {
      const t = segSphere(p0, p1, jugWorld(c, j, B), 0.12);
      if (t >= 0 && t < best) { best = t; hit = { kind: 'jug', c, j }; }
    }
    for (const b of c.balloons) {
      if (!b.alive) continue;
      const neck = v3.add(b.p, v3.mul(v3.norm(v3.sub(c.hub, b.p)), b.r * 1.2));
      const [d, s] = segSegDist(p0, p1, neck, c.hub);
      if (d < 0.018 && s < best) { best = s; hit = { kind: 'string', c, b }; }
    }
  }
  for (const f of G.free) {
    const t = segSphere(p0, p1, f.p, f.r * 0.97);
    if (t >= 0 && t < best) { best = t; hit = { kind: 'free', f }; }
  }
  for (const tg of G.targets) {
    if (!tg.alive) continue;
    if (v3.dist(mid, tg.hub) > 6 + segLen) continue;
    for (const b of tg.balloons) {
      if (!b.alive) continue;
      const t = segSphere(p0, p1, b.p, b.r * 0.97);
      if (t >= 0 && t < best) { best = t; hit = { kind: 'target', tg, b }; }
    }
  }
  if (!hit) return false;
  const hp = v3.lerp(p0, p1, best);
  const shooter = pl.owner;
  const dist = v3.dist(pl.start, hp);
  // accuracy counts each pellet that hits something worth hitting once
  if (shooter && !pl.scored && hit.kind !== 'chair' && !(hit.c && hit.c === shooter)) { pl.scored = true; shooter.stats.hits++; }
  if (hit.kind === 'balloon') {
    popBalloon(hit.c, hit.b, shooter, dist);
    // usually the pellet is spent in the cluster; now and then it pops a second one
    if (pl.passed || Math.random() > 0.15) return true;
    pl.passed = true;
    return false;
  }
  if (hit.kind === 'string') {
    releaseBalloon(hit.c, hit.b, shooter, 'string');
    return false;
  }
  if (hit.kind === 'free') {
    burst(hit.f.p, hit.f.r, hit.f.col);
    G.free.splice(G.free.indexOf(hit.f), 1);
    if (shooter === G.player) { HUD.hitMark('POP'); }
    return false;
  }
  if (hit.kind === 'target') {
    hit.b.alive = false;
    burst(hit.b.p, hit.b.r, hit.b.col);
    if (shooter && shooter.isPlayer) {
      const pts = 1 + Math.floor(dist / 40);
      G.score += pts; shooter.stats.pops++;
      shooter.stats.best = Math.max(shooter.stats.best, dist);
      HUD.hitMark('+' + pts + '  ' + Math.round(dist) + ' m');
    }
    if (hit.tg.balloons.every((b) => !b.alive)) { hit.tg.alive = false; hit.tg.respawn = 6; }
    return false;
  }
  if (hit.kind === 'jug') {
    const jug = hit.c.jugs[hit.j];
    if (!jug.leak && jug.kg > 0) {
      jug.leak = true;
      if (shooter) shooter.stats.jugs++;
      addFeed(shooter, hit.c, 'jug');
      if (shooter === G.player) HUD.hitMark('JUG HOLED');
    }
    AUD.plink(hp, false);
    return true;
  }
  if (hit.kind === 'chair') {
    AUD.plink(hp, true);
    for (let i = 0; i < 4; i++) G.parts.push({ type: 3, p: hp.slice(), v: [(Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6], size: 0.03, col: [3, 2.4, 1.4], a: 1, life: 0.25, age: 0, drag: 1, grav: 1, wind: 0 });
    if (hit.c === G.player && shooter !== G.player) HUD.flash(0.35);
    if (shooter === G.player) HUD.hitMark('PING');
    return true;
  }
  return false;
}

function popBalloon(c, b, shooter, dist) {
  if (!b.alive) return;
  b.alive = false;
  burst(b.p, b.r, b.col);
  c.stats.lost++;
  c.lastHitBy = shooter;
  c.swingV[0] += (Math.random() - 0.5) * 0.4; c.swingV[1] += (Math.random() - 0.5) * 0.4;
  if (shooter && shooter !== c) {
    shooter.stats.pops++;
    shooter.stats.best = Math.max(shooter.stats.best, dist || 0);
  }
  addFeed(shooter, c, 'pop', dist);
  if (shooter === G.player && c !== G.player) HUD.hitMark('POP!  ' + Math.round(dist) + ' m');
  if (c === G.player && shooter !== G.player) { HUD.flash(0.7); }
  if (c.isPlayer || shooter === G.player) AUD.squeak();
}
function releaseBalloon(c, b, by, why) {
  if (!b.alive) return;
  b.alive = false;
  const fb = { p: b.p.slice(), r: b.r, col: b.col, gloss: b.gloss, seed: b.seed, age: 0, v: [c.vel[0], 0, c.vel[2]], axis: [0, 1, 0] };
  G.free.push(fb);
  c.stats.lost++;
  if (why === 'string') {
    if (by && by !== c) by.stats.strings++;
    addFeed(by, c, 'string');
    if (by === G.player) HUD.hitMark('STRING CUT!');
  } else {
    addFeed(c, c, 'cut');
  }
  AUD.snip(b.p);
}
function burst(p, r, col) {
  const n = 14;
  for (let i = 0; i < n; i++) {
    const d = v3.norm([Math.random() - 0.5, Math.random() - 0.4, Math.random() - 0.5]);
    G.parts.push({ type: 1, p: v3.add(p, v3.mul(d, r * 0.8)), v: v3.mul(d, 3 + Math.random() * 5), size: 0.05 + Math.random() * 0.09, col: col.map((x) => x * 0.9), seed: Math.random(), a: 1, life: 6 + Math.random() * 3, age: 0, drag: 2.2, grav: 0.35, wind: 1 });
  }
  for (let i = 0; i < 8; i++) {
    const d = v3.norm([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]);
    G.parts.push({ type: 0, p: v3.add(p, v3.mul(d, r * 0.5)), v: v3.mul(d, 1 + Math.random() * 2), size: 0.25, grow: 2.2, col: [0.95, 0.95, 0.95], a: 0.18, life: 0.7, age: 0, drag: 2, grav: 0, wind: 1 });
  }
  AUD.pop(p, r);
}
function spawnPourDrop(c, j, leak) {
  const p = jugWorld(c, j);
  p[1] -= 0.2;
  const v = [c.vel[0] + (Math.random() - 0.5) * 0.3, c.vel[1] - 0.5, c.vel[2] + (Math.random() - 0.5) * 0.3];
  G.parts.push({ type: 0, p, v, size: leak ? 0.025 : 0.045, grow: 0.6, col: [0.75, 0.85, 0.95], a: 0.55, life: 9, age: 0, drag: 0.08, grav: 1, wind: 0.2, water: true });
}
// where the blower nozzle is and which way it blows (backwards out of the chair)
function blowerNozzle(c, B) {
  B = B || chairBasis(c);
  return { p: m4.xform(B.m, [0.13, 0.02, -1.02]), d: v3.norm(v3.add(v3.mul(B.f, -1), v3.mul(B.u, -0.25))) };
}
function spawnBlowerAir(c, dt) {
  const n = blowerNozzle(c);
  if (Math.random() < dt * 40) {
    const v = v3.add(v3.mul(n.d, 9 + Math.random() * 5), [c.vel[0] + (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, c.vel[2] + (Math.random() - 0.5) * 1.5]);
    G.parts.push({ type: 0, p: n.p.slice(), v, size: 0.07, grow: 4, col: [0.92, 0.94, 0.96], a: 0.14, life: 0.9, age: 0, drag: 2.5, grav: 0, wind: 0.6 });
  }
  // the odd leaf left in the tube from the yard
  if (Math.random() < dt * 3) {
    const v = v3.add(v3.mul(n.d, 6 + Math.random() * 4), [(Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2]);
    const col = G.rng.pick([[0.75, 0.32, 0.06], [0.82, 0.55, 0.1], [0.45, 0.32, 0.12], [0.3, 0.45, 0.12]]);
    G.parts.push({ type: 1, p: n.p.slice(), v, size: 0.04 + Math.random() * 0.03, col, seed: Math.random(), a: 1, life: 10, age: 0, drag: 1.6, grav: 0.3, wind: 1 });
  }
}
function spawnSplash(p, big) {
  const n = Math.round(10 + big * 110);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = Math.random();
    const v = [Math.cos(a) * (0.5 + s * 3) * (0.4 + big), (2 + Math.random() * 6) * (0.4 + big * 0.9), Math.sin(a) * (0.5 + s * 3) * (0.4 + big)];
    G.parts.push({ type: 0, p: [p[0], 0.05, p[2]], v, size: 0.05 + big * 0.12 * Math.random(), grow: 0.8, col: [0.85, 0.9, 0.95], a: 0.7, life: 2.5, age: 0, drag: 0.5, grav: 1, wind: 0, splashy: true });
  }
  if (big > 0.5) for (let i = 0; i < 16; i++) {
    const a = Math.random() * TAU;
    G.parts.push({ type: 0, p: [p[0] + Math.cos(a) * 0.6, 0.3, p[2] + Math.sin(a) * 0.6], v: [Math.cos(a) * 1.2, 0.6 + Math.random(), Math.sin(a) * 1.2], size: 0.6, grow: 2.5, col: [0.92, 0.95, 0.98], a: 0.25, life: 1.8, age: 0, drag: 1.5, grav: 0, wind: 0.5 });
  }
}
function addRipple(x, z, strength) {
  G.ripples.push({ x, z, t0: G.t, s: strength });
  if (G.ripples.length > 16) G.ripples.shift();
}

function eliminate(c, why) {
  if (!c.alive) return;
  c.alive = false; c.out = why; c.outT = G.t; c.pouring = false; c.blower.want = false; c.blower.on = false;
  if (why === 'splash') {
    const s = seatPos(c);
    spawnSplash(s, 1);
    addRipple(s[0], s[2], 1.2); addRipple(s[0] + 1, s[2], 0.8);
    AUD.splash(s, 1);
    // dropped jugs and everything: the chair floats
    const rb = G.boats.find((b) => b.rescue);
    if (rb && !rb.task) rb.task = c;
  }
  addFeed(c.lastHitBy, c, why);
  if (c === G.player) {
    UI.onPlayerOut(why);
  }
  checkWin();
}
function checkWin() {
  if (G.phase !== 'play' && G.phase !== 'countdown') return;
  if (G.mode === 'practice') {
    if (G.player && !G.player.alive) endMatch(null);
    return;
  }
  const alive = G.chairs.filter((c) => c.alive);
  if (alive.length <= 1) endMatch(alive[0] || null);
}
function endMatch(winner) {
  G.winner = winner; G.phase = 'over'; G.overT = 0;
  UI.onMatchOver(winner);
}

function addFeed(by, victim, what, dist) {
  if (!by && what === 'pop') { by = victim; what = 'lost'; }
  const nm = (c) => c ? (c.isPlayer ? 'You' : c.name) : 'The wind';
  const poss = (c) => c.isPlayer ? 'your' : c.name + "'s";
  let s = '';
  if (what === 'pop') s = by === victim ? nm(by) + ' popped ' + (by.isPlayer ? 'your own' : 'their own') + ' balloon' : nm(by) + ' popped ' + poss(victim) + ' balloon' + (dist ? ' (' + Math.round(dist) + ' m)' : '');
  else if (what === 'lost') s = (victim.isPlayer ? 'You lost' : victim.name + ' lost') + ' a balloon';
  else if (what === 'string') s = nm(by) + ' cut a string on ' + poss(victim) + ' cluster';
  else if (what === 'cut') s = nm(by) + (by.isPlayer ? ' let a balloon go' : ' let a balloon go');
  else if (what === 'jug') s = nm(by) + ' holed ' + poss(victim) + ' water jug';
  else if (what === 'splash') s = (victim.isPlayer ? 'You' : victim.name) + ' splashed down!';
  else if (what === 'drift') s = (victim.isPlayer ? 'You' : victim.name) + ' drifted off over the pines';
  else if (what === 'landed') s = (victim.isPlayer ? 'You' : victim.name) + ' came down on the shore';
  if (!s) return;
  G.feed.push({ s, t: G.t, col: victim ? victim.look.tag : '#fff', big: what === 'splash' || what === 'drift' || what === 'landed' });
  if (G.feed.length > 7) G.feed.shift();
}

// ---------- AI ----------
function rngSeed(c) { return fract(Math.sin(c.idx * 91.7 + 3.1) * 4375.5); }
// Simulate a pellet and return where it is when it has travelled `range` horizontally.
function simulateShot(origin, dir, v0, carrier, range, maxT) {
  const pl = { p: origin.slice(), v: v3.add(v3.mul(dir, v0), carrier) };
  const h = 1 / 120;
  let t = 0;
  const o2 = [origin[0], origin[2]];
  while (t < (maxT || 3)) {
    stepPellet(pl, h); t += h;
    if (Math.hypot(pl.p[0] - o2[0], pl.p[2] - o2[1]) >= range) return { p: pl.p, t };
    if (pl.p[1] < 0) return { p: pl.p, t, fell: true };
  }
  return { p: pl.p, t, short: true };
}
function solveAim(origin, carrier, target, tvel, v0) {
  let dir = v3.norm(v3.sub(target, origin));
  let aim = target.slice();
  let tf = 0;
  for (let it = 0; it < 5; it++) {
    const pred = v3.add(target, v3.mul(tvel, tf));
    const range = Math.hypot(pred[0] - origin[0], pred[2] - origin[2]);
    const r = simulateShot(origin, dir, v0, carrier, range, 4);
    tf = r.t;
    const miss = v3.sub(pred, r.p);
    aim = v3.add(aim, miss);
    dir = v3.norm(v3.sub(aim, origin));
    if (v3.len(miss) < 0.05) break;
  }
  return { dir, tf };
}
function aiPickTarget(c) {
  let best = null, bs = 1e9;
  for (const o of G.chairs) {
    if (o === c || !o.alive) continue;
    const d = v3.dist(o.hub, c.hub);
    const score = d - (PHYS.nBalloons - aliveBalloons(o)) * 4 + (o.isPlayer ? -10 : 0);
    if (score < bs) { bs = score; best = o; }
  }
  return best;
}
function aiUpdate(c, dt) {
  const ai = c.ai, d = ai.d;
  if (!c.alive) { c.pouring = false; return; }
  ai.think -= dt; ai.plan -= dt; ai.cutCd -= dt;
  ai.idle = (ai.idle || 0) + dt;   // seconds since this chair last fired
  const restless = ai.idle > 35 ? 0.35 : 1;
  if (ai.think <= 0) {
    ai.think = d.think * (0.7 + Math.random() * 0.6);
    if (!ai.target || !ai.target.alive || Math.random() < 0.15) ai.target = aiPickTarget(c);
  }
  const tgt = ai.target;
  const seat = seatPos(c);
  const eq = eqAltitude(c);
  // ---- altitude planning: pick the wind layer that moves us where we want to be
  if (ai.plan <= 0) {
    ai.plan = 2.5 + Math.random() * 2;
    let want = [0, 0];
    const r = Math.hypot(c.hub[0], c.hub[2]);
    let tgtAlt = -1, farW = 1;
    if (tgt) {
      const to = [tgt.hub[0] - c.hub[0], tgt.hub[2] - c.hub[2]];
      const hd = Math.hypot(to[0], to[1]) || 1;
      const vd = tgt.hub[1] - c.hub[1];
      const dist = Math.hypot(hd, vd);
      tgtAlt = seatPos(tgt)[1];
      farW = 1 + clamp((dist - 150) / 150, 0, 2);
      const n = [to[0] / hd, to[1] / hd];
      const rel = [tgt.vel[0], tgt.vel[2]];
      if (dist > ai.prefer + 20) want = [n[0] * 3 + rel[0], n[1] * 3 + rel[1]];
      else if (dist < 45) want = [-n[0] * 3 + rel[0], -n[1] * 3 + rel[1]];
      else want = [rel[0] - n[1] * 1.2, rel[1] + n[0] * 1.2];
    }
    if (r > 300) { const k = smoothstep(300, 520, r) * 5; want[0] -= c.hub[0] / r * k; want[1] -= c.hub[2] / r * k; }
    const L0 = chairLift(c);
    const water = chairWater(c);
    const curAlt = Math.max(seat[1], 0);
    let bestH = curAlt, bestS = -1e9;
    for (let h = 25; h <= 300; h += 12) {
      const w = WIND.at(c.hub[0], h + 7, c.hub[2], G.t);
      let s = -Math.hypot(w[0] - want[0], w[1] - want[1]) * farW;
      // close the height gap too: steep shots are long shots
      if (tgtAlt >= 0) s -= Math.abs(h - tgtAlt) * 0.012;
      const base = eq > 0 ? eq : curAlt;
      if (h > base) {
        // keep about one balloon's worth of water in reserve for emergencies
        const kg = (h - base) / PHYS.liftH * L0;
        const reserve = 6.5;
        if (kg > water - reserve) s -= 50; else s -= kg * (0.25 + 3 / (water - reserve + 1)) * restless;
      } else if (h < base - 55) {
        const nb = Math.ceil((base - h) / (PHYS.liftH * PHYS.liftPerBalloon / L0));
        s -= nb * 1.6 * restless + (aliveBalloons(c) - nb < 21 ? 30 : 0);
      }
      // stay clear of the water and the treetops
      if (h < 45) s -= (45 - h) * 0.15;
      if (s > bestS) { bestS = s; bestH = h; }
    }
    ai.targetAlt = bestH;
  }
  // ---- leaf blower: short bursts to close or open the range
  ai.blowCd = (ai.blowCd || rngSeed(c) * 6) - dt;
  c.blower.want = false;
  if (tgt && ai.blowT > 0) {
    ai.blowT -= dt;
    c.blower.want = true;
    c.yaw += angWrap(ai.blowDir - c.yaw) * Math.min(1, dt * 3);
  } else if (tgt && ai.blowCd <= 0 && c.blower.heat < 0.15 && !c.blower.lock) {
    const hd = Math.hypot(tgt.hub[0] - c.hub[0], tgt.hub[2] - c.hub[2]);
    const r = Math.hypot(c.hub[0], c.hub[2]);
    let dir = null;
    if (r > 430) dir = Math.atan2(-c.hub[0], -c.hub[2]);
    else if (hd > ai.prefer + 45) dir = Math.atan2(tgt.hub[0] - c.hub[0], tgt.hub[2] - c.hub[2]);
    else if (hd < 40) dir = Math.atan2(c.hub[0] - tgt.hub[0], c.hub[2] - tgt.hub[2]);
    if (dir !== null) { ai.blowDir = dir; ai.blowT = 2 + Math.random() * 1.8; ai.blowCd = 9 + Math.random() * 8; }
  }
  // ---- ballast control
  c.pouring = false;
  const vy = c.vel[1];
  const danger = (eq < 0 && seat[1] < 140) || (eq >= 0 && eq < 30) || (seat[1] < 35 && vy < -0.4);
  if (danger && chairWater(c) > 0) c.pouring = true;
  else if (eq >= 0 && ai.targetAlt > eq + 10 && chairWater(c) > 6.5) c.pouring = true;
  else if (eq >= 0 && ai.targetAlt < eq - 55 && aliveBalloons(c) > 22 && ai.cutCd <= 0 && seat[1] > 80) {
    const b = c.balloons.filter((x) => x.alive).sort((a, b2) => b2.str - a.str)[0];
    if (b) { releaseBalloon(c, b, c, 'cut'); ai.cutCd = 12; }
  }
  // ---- shooting
  let wantPump = false, wantFire = false;
  if (tgt && (G.phase === 'play' || G.phase === 'title')) {
    const cc = clusterCentre(tgt);
    const dist = v3.dist(cc, seat);
    ai.pumpsGoal = clamp(Math.round(dist / 17) + (d === DIFF.hard ? 2 : 1), 3, 10);
    const rf = c.rifle;
    if (!rf.loaded || rf.pumps < ai.pumpsGoal) wantPump = dist < 280;
    if (dist < 195) {
      if (!rf.loaded || rf.pumps < ai.pumpsGoal) wantPump = true;
      else {
        // aim
        ai.aimT += dt;
        if (ai.aimT > 0.25 || !ai.solution) {
          ai.aimT = 0;
          const B = chairBasis(c);
          const eye = v3.add(B.seat, v3.mul(B.u, 0.75));
          const aimPt = v3.add(cc, v3.mul(v3.norm(v3.sub(seat, cc)), 1.0));
          aimPt[1] -= 0.6;
          const sol = solveAim(eye, c.vel, aimPt, tgt.vel, muzzleVel(rf.pumps));
          const naive = v3.norm(v3.sub(aimPt, eye));
          if (!ai.err || Math.random() < 0.25) ai.err = { r: G.rng.gauss() * d.rng, a: G.rng.gauss() * d.ang, b: G.rng.gauss() * d.ang };
          let dir = v3.norm(v3.add(naive, v3.mul(v3.sub(sol.dir, naive), 1 + ai.err.r)));
          const yaw = Math.atan2(dir[0], dir[2]) + ai.err.a, pitch = Math.asin(clamp(dir[1], -1, 1)) + ai.err.b;
          ai.wantYaw = yaw; ai.wantPitch = pitch; ai.solution = true; ai.eye = eye;
        }
        ai.settle += dt;
        // long shots are taken less eagerly
        const eager = dist < 130 ? 1 : 0.35;
        if (ai.settle > d.react + ai.hesitate && Math.random() < dt * 6 * eager) { wantFire = true; }
      }
    }
    const k = 1 - Math.exp(-dt * 3.5);
    ai.aimYaw += angWrap(ai.wantYaw - ai.aimYaw) * k;
    ai.aimPitch += (ai.wantPitch - ai.aimPitch) * k;
    c.aimYaw = ai.aimYaw; c.aimPitch = ai.aimPitch;
    if (!(ai.blowT > 0)) c.yaw += angWrap(ai.aimYaw - c.yaw) * (1 - Math.exp(-dt * 0.8));
  }
  if (rifleUpdate(c, dt, wantPump, wantFire)) {
    const B = chairBasis(c);
    const eye = v3.add(B.seat, v3.mul(B.u, 0.75));
    const sway = 0.003;
    const yaw = c.aimYaw + G.rng.gauss() * sway, pitch = c.aimPitch + G.rng.gauss() * sway;
    const dir = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    fireRifle(c, v3.add(eye, v3.mul(dir, 0.8)), dir);
    ai.settle = 0; ai.solution = false; ai.err = null; ai.hesitate = 0.2 + Math.random() * 1.6; ai.idle = 0;
  }
}

// ---------- boats ----------
function updateBoats(dt) {
  for (const b of G.boats) {
    b.bob += dt;
    if (b.rescue && b.task) {
      const s = seatPos(b.task);
      const to = [s[0] - b.p[0], s[2] - b.p[2]];
      const d = Math.hypot(to[0], to[1]);
      if (d > 6) {
        const want = Math.atan2(to[1], to[0]);
        b.heading += angWrap(want - b.heading) * Math.min(1, dt * 1.5);
        const sp = Math.min(9, d * 0.3);
        b.p[0] += Math.cos(b.heading) * sp * dt; b.p[2] += Math.sin(b.heading) * sp * dt;
        if (Math.random() < dt * 25) G.parts.push({ type: 0, p: [b.p[0] - Math.cos(b.heading) * 2.4, 0.15, b.p[2] - Math.sin(b.heading) * 2.4], v: [(Math.random() - 0.5) * 1.5, 0.8, (Math.random() - 0.5) * 1.5], size: 0.15, grow: 1.5, col: [0.95, 0.97, 1], a: 0.4, life: 1.6, age: 0, drag: 1, grav: 0.4, wind: 0 });
        b.moving = true;
      } else b.moving = false;
    }
  }
}

// ---------- particles ----------
function updateParticles(dt) {
  const P = G.parts;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.age += dt;
    if (p.age > p.life) { P.splice(i, 1); continue; }
    if (p.wind) {
      const w = WIND.at(p.p[0], p.p[1], p.p[2], G.t);
      p.v[0] += (w[0] - p.v[0]) * p.drag * p.wind * dt; p.v[2] += (w[1] - p.v[2]) * p.drag * p.wind * dt;
      p.v[1] -= p.v[1] * p.drag * dt;
    } else {
      p.v[0] -= p.v[0] * p.drag * dt; p.v[1] -= p.v[1] * p.drag * dt; p.v[2] -= p.v[2] * p.drag * dt;
    }
    p.v[1] -= PHYS.g * p.grav * dt;
    if (p.type === 1) p.v[1] = Math.max(p.v[1], -1.6);
    p.p[0] += p.v[0] * dt; p.p[1] += p.v[1] * dt; p.p[2] += p.v[2] * dt;
    if (p.p[1] < 0 && WORLD.height(p.p[0], p.p[2]) < 0) {
      if (p.water && p.v[1] < -8 && Math.random() < 0.25) addRipple(p.p[0], p.p[2], 0.12);
      if (p.water && Math.random() < 0.3) spawnSplash(p.p, 0.02);
      P.splice(i, 1);
    }
  }
  if (P.length > 2500) P.splice(0, P.length - 2500);
}

function updateFree(dt) {
  for (let i = G.free.length - 1; i >= 0; i--) {
    const f = G.free[i];
    f.age += dt;
    const w = WIND.at(f.p[0], f.p[1], f.p[2], G.t);
    f.v[0] += (w[0] - f.v[0]) * 0.6 * dt; f.v[2] += (w[1] - f.v[2]) * 0.6 * dt;
    f.v[1] += (2.6 - f.v[1]) * 0.8 * dt;
    f.p = v3.add(f.p, v3.mul(f.v, dt));
    f.axis = v3.norm([Math.sin(f.age * 1.3 + f.seed * 9) * 0.25, 1, Math.cos(f.age * 1.1) * 0.25]);
    if (f.age > 80 || f.p[1] > 900) G.free.splice(i, 1);
  }
}
function updateTargets(dt) {
  for (const t of G.targets) {
    const w = WIND.at(t.anchor[0], t.height, t.anchor[2], G.t);
    t.hub = [t.anchor[0] + w[0] * t.height * 0.05, t.height, t.anchor[2] + w[1] * t.height * 0.05];
    if (!t.alive) {
      t.respawn -= dt;
      continue;
    }
    simBalloons({ hub: t.hub, balloons: t.balloons, alive: true, vel: [w[0], 0, w[1]] }, dt);
  }
  for (let i = G.targets.length - 1; i >= 0; i--) {
    if (!G.targets[i].alive && G.targets[i].respawn < 0) { G.targets.splice(i, 1); spawnTarget(G.rng); }
  }
}

// ---------- main sim step ----------
function simStep(dt) {
  G.t += dt;
  if (G.phase === 'countdown') {
    G.countdown -= dt;
    if (G.countdown <= 0) { G.phase = 'play'; AUD.go(); }
  }
  if (G.phase === 'play' || G.phase === 'over') G.matchT += dt;
  for (const c of G.chairs) {
    if (c.ai) aiUpdate(c, dt);
    simChair(c, dt);
  }
  if (G.player) playerUpdate(G.player, dt);
  updatePellets(dt);
  updateFree(dt);
  updateTargets(dt);
  updateParticles(dt);
  updateBoats(dt);
  for (let i = G.ripples.length - 1; i >= 0; i--) if (G.t - G.ripples[i].t0 > 9) G.ripples.splice(i, 1);
  if (G.phase === 'play' && G.mode !== 'practice') {
    if (!G.seepMsg && G.matchT > 300) { G.seepMsg = 1; G.feed.push({ s: 'Helium is seeping out of everyone\'s balloons', t: G.t, col: '#9fd3ff', big: true }); }
    if (G.seepMsg === 1 && G.matchT > 540) { G.seepMsg = 2; G.feed.push({ s: 'The balloons are going soft. It won\'t be long now', t: G.t, col: '#9fd3ff', big: true }); }
  }
  if (G.phase === 'title') {
    const alive = G.chairs.filter((c) => c.alive).length;
    G.titleEnd = alive <= 1 ? (G.titleEnd || 0) + dt : 0;
    if (G.titleEnd > 8 || G.t > 240) { setupMatch('ffa', 'normal', { spectate: true }); G.phase = 'title'; }
  }
  if (G.mode === 'practice' && G.phase === 'play') {
    G.practiceLeft -= dt;
    if (G.practiceLeft <= 0) { G.practiceLeft = 0; endMatch(G.player); }
  }
  if (G.phase === 'over') G.overT += dt;
}
