// ---------- test hooks (headless) ----------
window.BB = {
  state() {
    return {
      mode: GAME.mode, belly: +GAME.belly.toFixed(3), stats: Object.assign({}, GAME.stats), done: Object.keys(GAME.done),
      bear: { x: +BR.x.toFixed(2), y: +BR.y.toFixed(2), z: +BR.z.toFixed(2), yaw: +BR.yaw.toFixed(2), speed: +BR.speed.toFixed(2), swim: BR.swim, depth: +BR.depth.toFixed(2), ground: BR.onGround, carry: BR.carry },
      hikers: HIKERS.map(h => ({ state: h.state, x: +h.x.toFixed(1), z: +h.z.toFixed(1), d: +Math.hypot(h.x - BR.x, h.z - BR.z).toFixed(1) })),
      fish: FISH.filter(f => f.alive).length, leaping: FISH.filter(f => f.leap).length, w: RND.w, h: RND.h,
      falls: { top: SCENERY.fallsTop, bottom: SCENERY.fallsBottom, dir: SCENERY.fallsDir }
    };
  },
  start() { startGame(); },
  input(o) { INP.test = o; },
  advance(sec, step = 1 / 60) { const n = Math.round(sec / step); for (let i = 0; i < n; i++) tick(step); renderFrame(); return BB.state(); },
  teleport(x, z, yaw = BR.yaw) { bearSpawn(x, z, yaw); CAM.yaw = yaw; CAM.curD = undefined; for (let i = 0; i < 3; i++) CAM.tgt[i] = [BR.x, BR.y + 1.45, BR.z][i]; },
  cam(yaw, pitch, dist) { CAM.yaw = yaw; if (pitch !== undefined) CAM.pitch = pitch; if (dist !== undefined) CAM.dist = dist; },
  setCam(pos, tgt, fov = 1.0) { CAM.fixed = { pos, tgt }; glSetCamera(pos, tgt, fov, RND.w / RND.h); },
  freeCam() { CAM.fixed = null; },
  swipe() { bearSwipe(); }, roar() { bearRoar(); },
  quality(q) { SET.quality = q; applyQuality(); },
  ground(x, z) { return groundH(x, z); }, water(x, z) { return waterH(x, z); },
  perf(frames = 10) { const t0 = performance.now(); for (let i = 0; i < frames; i++) renderFrame(); gl.finish(); return (performance.now() - t0) / frames; },
  counts() { const o = {}; for (const [m, q] of RND.queue) if (q.n) o[m.name] = q.n; return o; }
};
