// ---------- events -> sounds, particles, callouts; camera; scene; lights; HUD; screens; input; loop ----------
function callout(main, sub, prio = 1) {
  if (GAME.attract) return;
  if (GAME.callT > 0.25 && prio < (GAME.callPrio || 0)) { if (GAME.callQ.length < 3) GAME.callQ.push([main, sub, prio]); return; }
  showCallout(main, sub, prio);
}
function showCallout(main, sub, prio = 1) {
  const el = document.getElementById('callout'); el.textContent = main; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  const se = document.getElementById('sub'); se.textContent = sub || ''; se.classList.remove('pop'); void se.offsetWidth; if (sub) se.classList.add('pop');
  GAME.callT = 1.4; GAME.callPrio = prio;
}
function subText(s) { if (GAME.attract) return; const se = document.getElementById('sub'); if (GAME.callT > 0.3) return; se.textContent = s; se.classList.remove('pop'); void se.offsetWidth; se.classList.add('pop'); }
function feed(msg) {
  if (GAME.attract) return;
  const f = document.getElementById('feed'); const d = document.createElement('div'); d.className = 'fd'; d.textContent = msg; f.prepend(d);
  while (f.children.length > 5) f.lastChild.remove(); setTimeout(() => d.remove(), 6000);
}
function buzz(p) { if (!INPUT.touchOn || !navigator.vibrate) return; try { navigator.vibrate(p); } catch (e) { } }
function shakeAt(x, z, s) { if (!SET.shake) return; const p = GAME.player; const d = p ? Math.hypot(p.x - x, p.z - z) : 10; GAME.shake = Math.min(1, GAME.shake + s / (1 + d * 0.25)); }
function fxPuff(x, y, z, col, n = 8, s = 1) { for (let i = 0; i < n * QUAL.particles; i++) particle({ x: x + F1(-0.1, 0.1), y: y + F1(-0.05, 0.1), z: z + F1(-0.1, 0.1), vx: F1(-2, 2) * s, vy: F1(0.5, 2.5) * s, vz: F1(-2, 2) * s, life: F1(0.3, 0.7), s0: 0.05 * s, s1: 0.14 * s, r: col[0] * 1.6 + 0.1, g: col[1] * 1.6 + 0.1, b: col[2] * 1.6 + 0.1, a: 0.6, kind: 0, add: false, drag: 3, grav: 0.1, rot: F1(0, 6), rv: 0 }); }
function fxStars(x, y, z, n, col = [1, 0.9, 0.4]) { for (let i = 0; i < n; i++) particle({ x, y, z, vx: F1(-3, 3), vy: F1(1, 4), vz: F1(-3, 3), life: F1(0.25, 0.5), s0: 0.09, s1: 0.03, r: col[0], g: col[1], b: col[2], a: 1, kind: 4, add: true, drag: 3, grav: 0.3, rot: F1(0, 6), rv: F1(-8, 8) }); }
function fxSparks(x, y, z, n) { for (let i = 0; i < n; i++) particle({ x, y, z, vx: F1(-4, 4), vy: F1(1, 5), vz: F1(-4, 4), life: F1(0.2, 0.5), s0: 0.03, s1: 0.01, r: 1, g: 0.85, b: 0.5, a: 1, kind: 2, add: true, drag: 1, grav: 1, rot: 0, rv: 0 }); }
function fxStink(x, y, z, r) { particle({ x: x + F1(-r, r) * 0.7, y: y + F1(0, 0.6), z: z + F1(-r, r) * 0.7, vx: F1(-0.3, 0.3), vy: F1(0.1, 0.5), vz: F1(-0.3, 0.3), life: F1(0.8, 1.6), s0: 0.3, s1: 0.9, r: 0.35, g: 0.55, b: 0.12, a: 0.32, kind: 0, add: false, drag: 1, grav: -0.05, rot: F1(0, 6), rv: F1(-1, 1) }); }
function addDebris(mesh, x, y, z, v, tint, life = 5) {
  const a = [F1(-1, 1), F1(-1, 1), F1(-1, 1)]; const l = Math.hypot(...a) || 1;
  GAME.debris.push({ mesh, x, y, z, vx: F1(-v, v), vy: F1(v * 0.5, v * 1.2), vz: F1(-v, v), B: r3YPR(F1(0, TAU), F1(-1, 1), 0), ax: a.map(q => q / l), av: F1(5, 14), t: 0, life, tint: tint || [1, 1, 1] });
}
const BAG_TINTS = [[0.02, 0.02, 0.025], [0.03, 0.05, 0.03], [0.05, 0.05, 0.06]];
function processEvents() {
  for (const e of GAME.events) {
    switch (e.t) {
      case 'hit': {
        const c = e.c; const col = lc(c.def.col); const y = c.y + (c.def.bird ? 0.15 : 0.25) * c.scale;
        fxPuff(c.x, y, c.z, col, Math.min(10, 3 + e.dmg * 0.3)); fxStars(c.x, y + 0.1, c.z, Math.min(8, 2 + e.dmg * 0.15));
        AUD.thwack(c.x, c.z, Math.min(1, e.dmg / 25), e.src); AUD.yelp(c, 0.5);
        if (e.src === 'player') { shakeAt(c.x, c.z, Math.min(0.4, e.dmg / 60)); buzz(15); if (e.dmg > 24) GAME.slowT = Math.max(GAME.slowT, 0.12); }
        break;
      }
      case 'fore': callout('FORE!', 'hole in one', 1); AUD.fore(); break;
      case 'clang': AUD.clang(e.x, e.z, e.v || 0.6); fxSparks(e.x, 0.5, e.z, 5); break;
      case 'clangbig': AUD.bigClang(e.x, e.z); shakeAt(e.x, e.z, 0.5); GAME.flashL = { x: e.x, z: e.z, t: 0.25 };
        for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; particle({ x: e.x, y: 0.4, z: e.z, vx: Math.cos(a) * 7, vy: 0.2, vz: Math.sin(a) * 7, life: 0.35, s0: 0.12, s1: 0.04, r: 1, g: 0.9, b: 0.6, a: 0.9, kind: 4, add: true, drag: 4, grav: 0, rot: a, rv: 0 }); }
        callout('CLANG!', 'everybody nearby is seeing stars', 1); break;
      case 'block': AUD.clang(e.x, e.z, 0.55, 1.15); fxSparks(e.x, 0.5, e.z, 7); if (e.k.isPlayer) buzz(10); break;
      case 'hurt': AUD.ouch(e.k); if (e.k.isPlayer) { shakeAt(e.k.x, e.k.z, 0.35); buzz(40); HUD.hurt(); } break;
      case 'daze': AUD.daze(e.k); if (e.k.isPlayer) { callout('DAZED!', 'seeing stars for a sec', 2); } break;
      case 'lidoff': AUD.clang(e.k.x, e.k.z, 0.9, 0.8); if (e.k.isPlayer) callout("LID'S OFF!", 'walk over it to pick it back up', 2); break;
      case 'lidback': AUD.pickup(); if (e.k.isPlayer) subText('lid back on'); break;
      case 'swing': AUD.whoosh(e.k.x, e.k.z, e.w, e.charge); break;
      case 'bash': AUD.bash(e.k.x, e.k.z); break;
      case 'jump': AUD.hop(); break;
      case 'land': fxPuff(e.k.x, 0.05, e.k.z, [0.3, 0.3, 0.3], 4); break;
      case 'pickup': AUD.pickup(); if (e.k.isPlayer) subText(WEAPONS[e.w].icon + ' ' + WEAPONS[e.w].name + ': ' + WEAPONS[e.w].desc); break;
      case 'found': AUD.pickup(); AUD.ding(); if (e.k.isPlayer) callout(WEAPONS[e.w].icon + ' ' + WEAPONS[e.w].name.toUpperCase(), WEAPONS[e.w].desc, 1); fxStars(e.k.x, 1.2, e.k.z, 10, [1, 0.95, 0.6]); break;
      case 'break': AUD.breakW(e.k.x, e.k.z); if (e.k.isPlayer) subText(WEAPONS[e.w].name + ' broke. Rummage a dumpster you hold for more.'); addDebris(MESH['w_' + e.w], e.k.x, 0.6, e.k.z, 2, [0.8, 0.8, 0.8], 2.5); break;
      case 'rummage': AUD.rummage(e.dp.x, e.dp.z); e.dp.lidV = 7; break;
      case 'squirt': AUD.squirt(); break;
      case 'trapset': AUD.click(); break;
      case 'snap': AUD.snap(e.x, e.z); fxSparks(e.x, 0.1, e.z, 6); break;
      case 'scram': AUD.yelp(e.c, 1, true); if (e.why !== 'broken') fxPuff(e.c.x, 0.2, e.c.z, [0.4, 0.4, 0.4], 6); break;
      case 'binned': { const d = e.d; AUD.binBang(d.x, d.z); shakeAt(d.x, d.z, 0.3); for (let i = 0; i < 4; i++) addDebris(i % 2 ? MESH.can : MESH.fish, d.x + d.fx * 0.4, 1.3, d.z + d.fz * 0.4, 2.2, [0.7, 0.7, 0.7], 3); break; }
      case 'flush': AUD.plop(e.c.x, e.c.z, 1); fxPuff(MANHOLE.x, 0.1, MANHOLE.z, [0.2, 0.25, 0.2], 10); break;
      case 'plop': AUD.plop(e.x, e.z, 0.5); break;
      case 'curb': AUD.honk(); break;
      case 'splat': AUD.thud(e.c.x, e.c.z, Math.min(1, e.v / 10)); fxPuff(e.c.x, 0.4, e.c.z, [0.35, 0.3, 0.25], 6); shakeAt(e.c.x, e.c.z, 0.2); break;
      case 'thud': if (e.v > 4) { AUD.thud(e.c.x, e.c.z, Math.min(1, e.v / 9) * 0.6); fxPuff(e.c.x, 0.05, e.c.z, [0.3, 0.3, 0.3], 4); } break;
      case 'bowl': if (!GAME.bowlT || GAME.now - GAME.bowlT > 1.2) { GAME.bowlT = GAME.now; callout('STRIKE!', 'bowled them over', 1); AUD.strike(e.b.x, e.b.z); } break;
      case 'playdead': AUD.groan(e.c); if (Math.hypot(e.c.x - GAME.player.x, e.c.z - GAME.player.z) < 8) subText('that possum is faking it (double damage while it lies there)'); break;
      case 'undead': AUD.yelp(e.c, 0.6); break;
      case 'tailup': if (Math.hypot(e.c.x - GAME.player.x, e.c.z - GAME.player.z) < 6) { subText('tail up! block toward the skunk or get clear'); AUD.hissS(e.c.x, e.c.z); } break;
      case 'spray': AUD.spray(e.c.x, e.c.z); for (let i = 0; i < 30; i++) fxStink(e.c.x - Math.sin(e.c.yaw) * 1.4, 0.2, e.c.z - Math.cos(e.c.yaw) * 1.4, 1.2); break;
      case 'pounce': AUD.yowl(e.c); break;
      case 'flop': AUD.thud(e.c.x, e.c.z, 1); shakeAt(e.c.x, e.c.z, 0.6); fxPuff(e.c.x, 0.05, e.c.z, [0.35, 0.3, 0.25], 14, 1.6); break;
      case 'yoink': AUD.gull(e.c); break;
      case 'strike': if (e.res === 'hit') AUD.bite(e.c.x, e.c.z); break;
      case 'summon': AUD.groan(e.c, 0.6); subText('The Possum King calls for backup'); break;
      case 'boss': AUD.bossSting(); break;
      case 'sewer': AUD.clank(MANHOLE.x, MANHOLE.z); break;
      case 'drop': AUD.yowl(e.c, 0.5); break;
      case 'claim': AUD.fanfare(); fxStars(e.d.x + e.d.fx, 1.5, e.d.z + e.d.fz, 18, [1, 0.85, 0.3]); break;
      case 'lost': if (e.prev === 'you') { AUD.sting(); subText(`You lost the ${e.d.name}!`); } break;
      case 'raid': AUD.alarm(); break;
      case 'facbreak': AUD.cheer(); break;
      case 'dawn': AUD.dawn(); break;
      case 'evicted': AUD.sadTrombone(); break;
      case 'cartflip': AUD.clang(e.c.x, e.c.z, 0.6, 0.9); break;
      case 'mount': AUD.rattle(true); break;
      case 'dismount': AUD.hop(); break;
      case 'cartbonk': AUD.crash(e.c.x, e.c.z, Math.min(1, e.v / 8) * 0.6); shakeAt(e.c.x, e.c.z, 0.25); fxSparks(e.c.x, 0.4, e.c.z, 6); break;
      case 'cartram': AUD.crash(e.c.x, e.c.z, Math.min(1, e.v / 9)); shakeAt(e.c.x, e.c.z, 0.3); GAME.stats.cartHits++; buzz(25); break;
      case 'cartbreak': {
        const c = e.c; AUD.crash(c.x, c.z, 1); AUD.crash(c.x, c.z, 0.7); shakeAt(c.x, c.z, 0.8); GAME.slowT = 0.9;
        callout(e.glorious ? 'CLEANUP ON AISLE ALLEY!' : "CART'S SHOT!", e.glorious ? 'what a way to go' : 'it rattled itself to pieces', 2);
        GAME.debris.push({ mesh: MESH.cart, x: c.x, y: 0.1, z: c.z, vx: Math.sin(c.yaw) * c.v * 0.6, vy: 3.5, vz: Math.cos(c.yaw) * c.v * 0.6, B: r3Y(c.yaw), ax: [1, 0, 0.3], av: 6, t: 0, life: 6, tint: [0.7, 0.2, 0.1], big: true });
        for (let i = 0; i < 2; i++) addDebris(MESH.caster, c.x, 0.2, c.z, 3, [1, 1, 1], 5);
        fxSparks(c.x, 0.5, c.z, 20); fxPuff(c.x, 0.3, c.z, [0.4, 0.4, 0.4], 12, 1.4); AUD.rattle(false); break;
      }
      case 'carby': AUD.carBy(); break;
    }
  }
  GAME.events.length = 0;
}

// ---------- per-frame effects ----------
function stepEffects(dt) {
  const q = QUAL.particles;
  for (const cl of GAME.clouds) if (F1() < 18 * dt * q) fxStink(cl.x, 0.1, cl.z, cl.r);
  for (const k of GAME.knightsL) {
    if (k.stink > 0 && F1() < 10 * dt * q) fxStink(k.x, 0.5, k.z, 0.3);
    if (k.state === 'ok' && Math.hypot(k.vx, k.vz) > 3 && k.y < 0.05 && F1() < 6 * dt * q) fxPuff(k.x, 0.03, k.z, [0.25, 0.25, 0.25], 1, 0.6);
  }
  for (const c of GAME.critters) if (c.stinkT > 0 && F1() < 5 * dt * q) fxStink(c.x, 0.3, c.z, 0.2);
  if (GAME.cart && GAME.cart.state === 'ridden' && Math.abs(GAME.cart.v) > 2 && F1() < 14 * dt * q) { const c = GAME.cart; const s = F1() < 0.5 ? -1 : 1; particle({ x: c.x + Math.cos(c.yaw) * s * 0.22, y: 0.05, z: c.z - Math.sin(c.yaw) * s * 0.22, vx: F1(-1, 1), vy: F1(1, 3), vz: F1(-1, 1), life: 0.25, s0: 0.02, s1: 0.01, r: 1, g: 0.8, b: 0.4, a: c.hp < 40 ? 1 : 0.3, kind: 2, add: true, drag: 1, grav: 1, rot: 0, rv: 0 }); }
  for (const f of GAME.flies) f.t += dt;
  GAME.flies = GAME.flies.filter(f => f.t < f.dur);
  for (const d of GAME.debris) {
    d.t += dt; d.vy -= G * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
    const fl = d.big ? 0.3 : 0.05; if (d.y < fl) { d.y = fl; d.vy = -d.vy * 0.3; d.vx *= 0.7; d.vz *= 0.7; d.av *= 0.6; }
    d.x = clamp(d.x, -AX + 0.2, AX - 0.2);
    if (d.av > 0.05) d.B = r3orth(m3mul(r3axis(d.ax[0], d.ax[1], d.ax[2], d.av * dt), d.B));
  }
  GAME.debris = GAME.debris.filter(d => d.t < d.life);
  if (GAME.flashL) { GAME.flashL.t -= dt; if (GAME.flashL.t <= 0) GAME.flashL = null; }
  // drips from the fire escapes and a little rain mist in the lamp light
  if (F1() < 6 * dt * q) particle({ x: F1(-AX, AX), y: 7, z: F1(-24, 26), vx: 0, vy: -7, vz: 0, life: 1.0, s0: 0.012, s1: 0.012, r: 0.6, g: 0.7, b: 0.9, a: 0.5, kind: 2, add: true, drag: 0, grav: 0.4, rot: 0, rv: 0 });
  stepParticles(dt);
  RND.time += dt;
}
function stepParticles(dt) {
  for (let i = PS.length - 1; i >= 0; i--) {
    const p = PS[i]; p.t += dt;
    if (p.t >= p.life) { PS.splice(i, 1); continue; }
    const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k; p.vy -= p.grav * G * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.rv * dt;
    if (p.kind === 2 && p.y < 0) { p.y = 0; p.vy *= -0.3; p.vx *= 0.5; p.vz *= 0.5; }
  }
}
const PS = [];
function particle(o) { if (PS.length > 3000) PS.shift(); o.t = 0; PS.push(o); return o; }
function pushParticles() {
  for (const p of PS) {
    const u = p.t / p.life; const s = lerp(p.s0, p.s1, u);
    let a = p.a * (p.kind === 1 || p.kind === 4 ? (1 - u) : (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85));
    if (p.kind === 3) a = p.a * (u > 0.8 ? (1 - u) * 5 : 1);
    glPart(p.add ? PART.add : PART.alpha, p.x, p.y, p.z, s, p.r, p.g, p.b, a, p.rot, p.kind);
  }
}

// ---------- camera ----------
const CAM = { pos: [0, 8, 20], tgt: [0, 0, 0], fov: 1.0, orbit: 0 };
function updateCamera(dt) {
  const asp = RND.w / RND.h;
  if (GAME.mode === 'title' || GAME.mode === 'dawn' || GAME.mode === 'lost') {
    CAM.orbit += dt * 0.06;
    const r = 9, cz = 2 + Math.sin(CAM.orbit * 0.7) * 10;
    const pos = [Math.sin(CAM.orbit) * 4.5, 6.5 + Math.sin(CAM.orbit * 1.3) * 1.2, cz + Math.cos(CAM.orbit) * r];
    for (let i = 0; i < 3; i++) { CAM.pos[i] = damp(CAM.pos[i], pos[i], 2, dt); }
    CAM.tgt = [0, 0.6, cz]; CAM.fov = 1.0;
    glSetCamera(CAM.pos, CAM.tgt, CAM.fov, asp); return;
  }
  const p = GAME.player; if (!p) return;
  const riding = p.state === 'cart';
  const inp = INPUT.last || { fwd: 0, side: 0 };
  // follow behind the knight when moving forward; Q/R, right stick or a drag on the right side turn the camera
  GAME.camYaw += (INPUT.camTurn || 0) * dt * 2.4; INPUT.camDrag && (GAME.camYaw += INPUT.camDrag, INPUT.camDrag = 0);
  const facing = riding ? GAME.cart.yaw : p.yaw;
  const mv = Math.hypot(p.vx, p.vz);
  if ((riding && Math.abs(GAME.cart.v) > 1) || (mv > 1.5 && (GAME.autopilot || (inp.fwd > 0.5 && Math.abs(inp.side) < 0.5)) && !INPUT.camTurn)) GAME.camYaw += wrapA(facing - GAME.camYaw) * Math.min(1, dt * (riding ? 2.2 : 0.9));
  const cy = GAME.camYaw, fx = Math.sin(cy), fz = Math.cos(cy);
  let dist = riding ? 4.6 : 3.7, h = riding ? 2.1 : 1.65;
  if (GAME.camMode === 1) { dist = 7.5; h = 9; }
  const tx = p.x, ty = p.y, tz = p.z;
  const pos = [tx - fx * dist, ty + h, tz - fz * dist];
  const tgt = [tx + fx * 2.4, ty + 0.4, tz + fz * 2.4];
  pos[0] = clamp(pos[0], -AX + 0.3, AX - 0.3); pos[2] = Math.max(pos[2], FENCE_Z + 0.3);
  for (const s of STATICS) { const d = staticClosest(s, pos[0], pos[2])[2]; if (d < 0.35) pos[1] = Math.max(pos[1], s.y1 + 0.6); }
  for (let i = 0; i < 3; i++) { CAM.pos[i] = damp(CAM.pos[i], pos[i], 8, dt); CAM.tgt[i] = damp(CAM.tgt[i], tgt[i], 12, dt); }
  CAM.fov = damp(CAM.fov, riding ? 1.15 + Math.abs(GAME.cart.v) * 0.012 : 1.05, 3, dt);
  let e = CAM.pos.slice();
  if (GAME.shake > 0.001) { const s = GAME.shake * 0.18; e = [e[0] + F1(-s, s), e[1] + F1(-s, s), e[2] + F1(-s, s)]; GAME.shake = Math.max(0, GAME.shake - dt * 2.5); }
  glSetCamera(e, CAM.tgt, CAM.fov, asp);
}

// ---------- the night sky, dawn, lights ----------
function updateSky() {
  const k = GAME.attract || GAME.mode === 'title' ? 0 : smoothstep(GAME.nightLen - 28, GAME.nightLen + 2, GAME.nightT);
  const L = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  RND.skyTop = L([0.006, 0.01, 0.03], [0.18, 0.28, 0.55]); RND.skyHor = L([0.04, 0.05, 0.09], [1.0, 0.55, 0.32]); RND.skyGrd = L([0.015, 0.015, 0.02], [0.2, 0.15, 0.12]);
  RND.fogCol = L([0.03, 0.035, 0.055], [0.55, 0.42, 0.35]); RND.fogK = lerp(0.028, 0.012, k);
  RND.ambTop = L([0.085, 0.1, 0.16], [0.35, 0.33, 0.38]); RND.ambBot = L([0.05, 0.042, 0.036], [0.18, 0.14, 0.1]);
  const sd = [lerp(-0.35, 0.6, k), lerp(0.8, 0.25, k), lerp(-0.45, 0.75, k)]; const l = Math.hypot(...sd); RND.sun = sd.map(v => v / l);
  RND.sunCol = L([0.42, 0.5, 0.75], [2.4, 1.5, 0.9]); RND.stars = 1 - k; RND.exposure = lerp(1.35, 0.95, k);
  GAME.dawnK = k;
}
function updateLights() {
  const out = RND.lights, oc = RND.lightC; let n = 0;
  const add = (x, y, z, r, cr, cg, cb) => { if (n >= RND.maxLights) return; out[n * 4] = x; out[n * 4 + 1] = y; out[n * 4 + 2] = z; out[n * 4 + 3] = r; oc[n * 4] = cr; oc[n * 4 + 1] = cg; oc[n * 4 + 2] = cb; n++; };
  const t = RND.time; const dim = 1 - (GAME.dawnK || 0) * 0.7;
  for (const L of LIGHTS) {
    let f = 1;
    if (L[7] === 1) f = (Math.sin(t * 23) > 0.85 || Math.sin(t * 3.1) > 0.97) ? 0.15 : 1;
    if (L[7] === 2) f = 0.8 + 0.2 * Math.sin(t * 11) * Math.sin(t * 7.3);
    add(L[0], L[1], L[2], L[3], L[4] * f * dim, L[5] * f * dim, L[6] * f * dim);
  }
  if (GAME.car) { const c = GAME.car; add(c.x + c.dir * 4, 0.8, c.z - 1.5, 10, 4, 3.8, 3.2); }
  if (GAME.flashL) { const k = GAME.flashL.t / 0.25; add(GAME.flashL.x, 1.2, GAME.flashL.z, 6, 6 * k, 5.5 * k, 4 * k); }
  for (const d of GAME.dumps) if (d.owner === 'you') add(d.x + d.fx * 1.0, 0.25, d.z + d.fz * 1.0, 2.0, 0.9, 0.65, 0.15);
  RND.lightN = n;
}

// ---------- scene ----------
function drawScene(t) {
  glResetQueue();
  for (const k of GAME.knightsL) {
    const o = Object.assign(Object.create(null), k);
    o.fur = k.col; o.scale = 1; o.flash = k.flash; o.weapon = k.weapon;
    if (k.state === 'cart' && GAME.cart) { o.riding = true; o.cartX = GAME.cart.x; o.cartZ = GAME.cart.z; o.yaw = GAME.cart.yaw; o.vx = 0; o.vz = 0; }
    if (k.inv > 0 && k.state !== 'dazed' && (t * 20 | 0) % 2) o.flash = 0.1;
    drawRaccoon(o, t);
    if (k.isPlayer && !GAME.attract) { m4basis(M_A, r3Y(0), k.x, 0.012 + k.perch, k.z, 0.36, 1, 0.36); glPush(MESH.ring, M_A, 1.0, 0.75, 0.15, 1); }
  }
  for (const c of GAME.critters) drawCritter(c, t);
  // dumpsters with their lids and owner flags
  for (const d of GAME.dumps) {
    const B = r3Y(d.yaw); const col = lc(d.col);
    glPush(MESH.dumpster, m4basis(new Float32Array(16), B, d.x, 0, d.z), col[0], col[1], col[2], 1);
    for (const side of [-1, 1]) {
      const hinge = LW(B, [d.x, 0, d.z], 1, side < 0 ? -0.9 : 0.02, 1.16, -0.56);
      const ang = d.lid * (side < 0 ? 1 : 0.8) + (d.contested ? Math.abs(Math.sin(t * 18)) * 0.08 : 0);
      glPush(MESH.dumpLid, m4basis(new Float32Array(16), m3mul(B, r3X(-ang)), hinge[0], hinge[1], hinge[2]), 1, 1, 1, 1);
    }
    const fc = d.owner === 'you' ? [1.6, 1.1, 0.15] : d.owner ? hexLin(parseInt(KINDS[d.owner].fac.slice(1), 16)) : [0.25, 0.25, 0.28];
    const pole = LW(B, [d.x, 0, d.z], 1, 0.88, 1.15, 0.56); limb(pole, [pole[0], pole[1] + 0.75, pole[2]], 0.012, lc(0x3a3a3a));
    const wave = Math.sin(t * 4 + d.i) * 0.15;
    m4basis(M_A, m3mul(B, r3Y(wave)), pole[0] + B[0] * 0.17, pole[1] + 0.62, pole[2] + B[2] * 0.17, 0.34, 0.2, 0.012); glPush(d.owner ? MESH.glowbox : MESH.box, M_A, fc[0] * 0.5, fc[1] * 0.5, fc[2] * 0.5, 1);
    const pr = d.contender && d.prog > 0 ? d.prog : 0; const pulse = 0.6 + 0.4 * Math.sin(t * 6);
    const rc = d.owner === 'you' ? [1, 0.7, 0.12] : d.owner ? fc : [0.35, 0.35, 0.4];
    m4basis(M_A, r3Y(0), d.x + d.fx * 0.95, 0.012, d.z + d.fz * 0.95, 1.05, 1, 1.05); glPush(MESH.ring, M_A, rc[0] * (d.contested ? pulse : 0.6), rc[1] * (d.contested ? pulse : 0.6), rc[2] * (d.contested ? pulse : 0.6), 1);
    if (pr > 0) { const cc = d.contender === 'you' ? [1, 0.8, 0.2] : hexLin(parseInt(KINDS[d.contender].fac.slice(1), 16)); m4basis(M_A, r3Y(0), d.x + d.fx * 0.95, 0.014, d.z + d.fz * 0.95, 1.05 * pr, 1, 1.05 * pr); glPush(MESH.ring, M_A, cc[0], cc[1], cc[2], 1); }
    if (d.owner === 'you' && d.rumCd <= 0 && F1() < 0.06) particle({ x: d.x + F1(-0.6, 0.6) * B[0], y: 1.25, z: d.z + F1(-0.6, 0.6) * B[2], vx: 0, vy: 0.6, vz: 0, life: 0.6, s0: 0.06, s1: 0.02, r: 1, g: 0.9, b: 0.5, a: 1, kind: 4, add: true, drag: 0, grav: 0, rot: 0, rv: 2 });
  }
  // den ring
  if (!GAME.attract) { const raid = GAME.den.raid; const pulse = raid > 0 ? 0.5 + 0.5 * Math.sin(t * 10) : 0.35; const col = raid > 0 ? [1.4 * pulse, 0.15, 0.1] : [0.6 * pulse, 0.45 * pulse, 0.1 * pulse]; m4basis(M_A, r3Y(0), DEN.x + 1.0, 0.012, DEN.z, 1.5, 1, 1.5); glPush(MESH.ring, M_A, col[0], col[1], col[2], 1); }
  for (const it of GAME.items) { const B = m3mul(r3Y(t * 1.5 + it.x), r3X(Math.PI / 2)); m4basis(M_A, B, it.x, 0.12 + Math.sin(t * 3 + it.z) * 0.04, it.z); glPush(MESH['w_' + it.w.k], M_A, 1, 1, 1, 1); m4basis(M_A, r3Y(0), it.x, 0.01, it.z, 0.4, 1, 0.4); glPush(MESH.ring, M_A, 0.9, 0.8, 0.4, 1); }
  for (const L of GAME.lids) { const B = L.y > 0.05 ? r3YPR(L.rot, L.rot * 0.7, 0) : r3X(-Math.PI / 2); m4basis(M_A, B, L.x, L.y + 0.05, L.z); glPush(MESH.lid, M_A, 1, 1, 1, 1); if (L.y <= 0.05) { m4basis(M_A, r3Y(0), L.x, 0.01, L.z, 0.45, 1, 0.45); glPush(MESH.ring, M_A, 0.5, 0.8, 1.2, 1); } }
  for (const tp of GAME.traps) { m4basis(M_A, r3Y(tp.yaw), tp.x, 0.005 + (tp.armed ? 0 : Math.max(0, 0.3 - tp.t) * 2), tp.z); glPush(MESH.w_trap, M_A, 1, 1, 1, 1); }
  for (const s of GAME.slicks) { const sc = s.r * (s.t < 0.2 ? s.t / 0.2 : 1) * (s.t > s.life - 2 ? Math.max(0.01, (s.life - s.t) / 2) : 1); m4basis(M_A, r3Y(s.yaw), s.x, 0.011, s.z, sc, 1, sc); glPush(MESH.splat, M_A, 0.55, 0.02, 0.02, 1); }
  for (const p of GAME.projs) { m4basis(M_A, m3mul(r3Y(p.rot), r3X(-Math.PI / 2 + 0.2)), p.x, p.y, p.z); glPush(MESH.w_hubcap, M_A, 1, 1, 1, 1); }
  if (GAME.cart) drawCart(GAME.cart, t);
  for (const d of GAME.debris) { const s = d.t > d.life - 0.5 ? Math.max(0.01, (d.life - d.t) / 0.5) : 1; glPush(d.mesh, m4basis(new Float32Array(16), d.B, d.x, d.y, d.z, s, s, s), d.tint[0], d.tint[1], d.tint[2], 1); }
  for (const f of GAME.flies) { if (f.t < 0) continue; const u = f.t / f.dur; const x = lerp(f.x0, f.x1, u), z = lerp(f.z0, f.z1, u), y = 0.5 + Math.sin(u * Math.PI) * 2.2; m4basis(M_A, r3YPR(u * 9, 0.4, u * 5), x, y, z, 1.4, 1.4, 1.4); glPush(MESH.pizza, M_A, 1, 1, 1, 1); }
  if (GAME.car) { const c = GAME.car; glPush(MESH.car, m4basis(new Float32Array(16), r3Y(c.dir > 0 ? Math.PI / 2 : -Math.PI / 2), c.x, 0, c.z), c.col[0], c.col[1], c.col[2], 1); }
  pushParticles();
}

// ---------- quality ----------
const QUAL = { particles: 1 };
function applyQuality() {
  const q = SET.quality; const dpr = window.devicePixelRatio || 1;
  // [shadow size, pcf radius, pixel ratio, particles, lights]; MAX trades nothing away, HIGH adapts its render scale
  const tiers = { low: [1024, 0, Math.min(dpr, 1) * 0.75, 0.45, 8], medium: [2048, 0, Math.min(dpr, 1), 0.75, 12], high: [2048, 1, Math.min(dpr, 1.5), 1, 16], max: [4096, 2, dpr, 1.2, 16] };
  const t = tiers[q] || tiers.high;
  if (gl && RND.shadowSize !== t[0]) glMakeShadow(t[0]);
  RND.pcf = t[1]; RND.pixelRatio = t[2]; QUAL.particles = t[3]; RND.maxLights = t[4]; RND.adaptive = q === 'high'; if (!RND.adaptive) RND.scale = 1;
  resize();
}
function resize() {
  const cv = document.getElementById('gl');
  const pr = RND.pixelRatio * (RND.adaptive ? RND.scale : 1);
  const w = Math.max(320, Math.floor(innerWidth * pr)), h = Math.max(200, Math.floor(innerHeight * pr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  RND.w = w; RND.h = h;
}
