// ---------- test hooks (headless) ----------
window.CT = {
  _inp: null,
  state() {
    return {
      mode: GAME.mode, now: +GAME.now.toFixed(2), timer: +GAME.timer.toFixed(1), w: RND.w, h: RND.h, particles: PS.length, ragdolls: GAME.ragdolls.length, wrecks: GAME.wrecks.length,
      carts: GAME.carts.map(c => ({ name: c.name, player: c.isPlayer, x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2), yaw: +c.yaw.toFixed(2), speed: +c.speed().toFixed(2), state: c.state, lives: c.lives, out: c.out, item: c.item, wipeouts: c.stats.wipeouts, self: c.stats.self, ground: c.onGround, heat: +c.heat.toFixed(2), ghost: c.ghostT > 0 })),
      koLog: GAME.koLog.slice(), ai: GAME.ais.map(a => ({ name: a.c.name, plan: a.plan, target: a.target ? a.target.name : null, dbg: a.dbg }))
    };
  },
  start(opts) { Object.assign(SET, opts || {}); startGame(); GAME.countT = 0; GAME.mode = 'play'; GAME.playT = 10; },
  title() { toTitle(); },
  setInput(o) { CT._inp = Object.assign(CT._inp || { throttle: 0, steer: 0, brake: 0, boost: 0 }, o); },
  advance(sec) {
    const n = Math.round(sec / PHYS_DT);
    for (let i = 0; i < n; i++) {
      const p = GAME.player;
      if (p && CT._inp && p.state === 'drive' && !GAME.ais.some(a => a.c === p)) Object.assign(p.input, CT._inp);
      physicsStep(PHYS_DT);
      if (i % 4 === 3) { stepEffects(PHYS_DT * 4); updateCamera(PHYS_DT * 4); }
      GAME.callT = Math.max(0, GAME.callT - PHYS_DT);
      if (GAME.slowT > 0) GAME.slowT -= PHYS_DT;
    }
    HUD.update(sec); renderFrame();
    return CT.state();
  },
  autopilot(on) {
    const p = GAME.player; if (!p) return;
    GAME.ais = GAME.ais.filter(a => a.c !== p);
    if (on) GAME.ais.push(new AI(p, 'normal'));
  },
  freezeAI(on) { GAME.noAI = !!on; if (on) for (const c of GAME.carts) if (!c.isPlayer) { c.input.throttle = 0; c.input.steer = 0; c.input.boost = 0; c.input.brake = 0; } },
  teleport(i, x, z, yaw, speed = 0) { const c = GAME.carts[i]; c.reset(x, z, yaw); c.vx = Math.sin(yaw) * speed; c.vz = Math.cos(yaw) * speed; },
  give(i, item) { GAME.carts[i].item = item; },
  use(i) { useItem(GAME.carts[i], GAME.now); },
  tag(i, by) { GAME.carts[i].lastHit = { by: GAME.carts[by], t: GAME.now }; },
  cam(mode, yaw) { GAME.camMode = mode; if (yaw !== undefined) CAM.yaw = yaw; },
  setCam(pos, tgt, fov = 1.0) { CAM.fixed = { pos, tgt, fov }; glSetCamera(pos, tgt, fov, RND.w / RND.h); },
  quality(q) { SET.quality = q; applyQuality(); },
  perf(frames = 10) { const t0 = performance.now(); for (let i = 0; i < frames; i++) { renderFrame(); } gl.finish(); return (performance.now() - t0) / frames; }
};
boot();
