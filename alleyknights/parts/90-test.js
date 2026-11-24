// ---------- test API (window.AK) for headless runs; ?test stops the real-time loop so tests step it ----------
window.AK = {
  start(night = 1, opts = {}) { if (opts.up) SAVE.up = { ...opts.up }; if (opts.food !== undefined) SAVE.food = opts.food; $('title').classList.add('hidden'); startNight(night, false); if (opts.auto) GAME.autopilot = true; GAME.introT = 0; INPUT.applyTouch(); return AK.state(); },
  title() { toTitle(); },
  advance(s) { const n = Math.round(s / (1 / 60)); for (let i = 0; i < n; i++) { if (GAME.mode === 'dawn' || GAME.mode === 'lost') break; advanceSim(1 / 60); GAME.callT = Math.max(0, GAME.callT - 1 / 60); updateCamera(1 / 60); } HUD.update(0); renderFrame(); return AK.state(); },
  state() {
    const p = GAME.player;
    return { mode: GAME.mode, night: GAME.night, t: +GAME.nightT.toFixed(2), len: GAME.nightLen, food: GAME.food, nightFood: GAME.nightFood,
      player: p && { x: +p.x.toFixed(2), z: +p.z.toFixed(2), hp: Math.round(p.hp), lid: Math.round(p.lid), hasLid: p.hasLid, state: p.state, weapon: p.weapon && p.weapon.k },
      facs: GAME.facs.map(f => ({ k: f.k, nerve: Math.round(f.nerve), broken: f.broken, boss: f.boss, bossHp: f.bossC ? Math.round(f.bossC.hp) : null })),
      dumps: GAME.dumps.map(d => ({ owner: d.owner, prog: +d.prog.toFixed(2), contender: d.contender })), den: +GAME.den.raid.toFixed(2),
      critters: GAME.critters.length, byKind: GAME.critters.reduce((a, c) => (a[c.k] = (a[c.k] || 0) + 1, a), {}), stats: GAME.stats, cart: GAME.cart && { state: GAME.cart.state, hp: Math.round(GAME.cart.hp) }, result: GAME.lastResult || null };
  },
  autopilot(on) { GAME.autopilot = !!on; },
  setInput(o) { Object.assign(GAME.player.input, o); },
  give(k) { GAME.player.weapon = newWeapon(k); },
  spawn(k, x, z, opts) { return GAME.spawn(k, x, z, { state: 'go', ...(opts || {}) }).id; },
  teleport(x, z, yaw) { const p = GAME.player; p.x = x; p.z = z; if (yaw !== undefined) { p.yaw = yaw; GAME.camYaw = yaw; } },
  critters() { return GAME.critters.map(c => ({ id: c.id, k: c.k, x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2), hp: Math.round(c.hp), state: c.state })); },
  freeze(on) { GAME.freeze = on; },
  cam(mode, yaw) { GAME.camMode = mode; if (yaw !== undefined) GAME.camYaw = yaw; },
  setCam(pos, tgt, fov) { CAM.pos = pos; CAM.tgt = tgt; glSetCamera(pos, tgt, fov || 1, RND.w / RND.h); },
  quality(q) { SET.quality = q; applyQuality(); },
  cart() { const c = GAME.cart; const p = GAME.player; p.x = c.x - 0.8; p.z = c.z; mountCart(p); return c.state; },
  perf(frames = 30) { const t0 = performance.now(); for (let i = 0; i < frames; i++) renderFrame(); gl.finish(); return (performance.now() - t0) / frames; },
  dawn() { GAME.nightT = GAME.nightLen - 0.5; },
  result() { return GAME.lastResult; }
};
boot();
