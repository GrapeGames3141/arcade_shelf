// ---------- shoppers on foot (and staff) ----------
const OOFS = ['OOF!', 'HEY!', 'MY TOES!', 'WHOA!', 'RUDE!', 'AAAH!', 'MY COUPONS!', 'EXCUSE YOU!'];
const BROWSE_SPOTS = [];
{
  for (const x of [-36.5, -31.5, -26.5, -21.5, -16.5, 16.5, 21.5, 26.5, 31.5, 36.5]) for (const z of [-44, -38, -26, -20]) BROWSE_SPOTS.push([x, z]);
  for (const x of [-30, -20, -10, 0, 10, 20, 30]) BROWSE_SPOTS.push([x, -13], [x, -51]);
  for (const x of [-8, 8]) for (const z of [-24, -30, -36, -42]) BROWSE_SPOTS.push([x, z]);
}
function makeShopper(x, z, h, opt = {}) {
  const look = makeLook(opt.staff ? { coat: '#c4001a', hat: '#c4001a', hatType: 1 } : {});
  return { look, staff: !!opt.staff, x, z, h, vx: 0, vz: 0, y: 0, vy: 0, state: opt.state || 'browse', t: rr(0, 3), path: null, pi: 0, anim: rr(0, 10), speed: opt.staff ? rr(1.0, 1.4) : rr(1.5, 2.6), down: 0, rx: 0, rz: 0, spin: 0, cheer: 0, yell: 0, id: Math.random() };
}
function spawnCrowd() {
  G.crowd = [];
  // staff already inside
  for (let i = 0; i < 9; i++) { const s = pick(BROWSE_SPOTS); G.crowd.push(makeShopper(s[0] + rr(-1, 1), s[1] + rr(-1, 1), rr(0, TAU), { staff: true })); }
  // foot shoppers: a mob on the curb beside the cart line, and a few by the wall
  for (let i = 0; i < 18; i++) G.crowd.push(makeShopper(rr(5, 30), rr(5.5, 8.2), -Math.PI / 2 + rr(-.6, .3), { state: 'queue' }));
  for (let i = 0; i < 5; i++) G.crowd.push(makeShopper(7 + i * 5.5 + rr(-1, 1), 0.75, -Math.PI / 2 + rr(-.3, .3), { state: 'queue' }));
  for (let i = 0; i < 5; i++) G.crowd.push(makeShopper(rr(8, 30), rr(9, 13), -Math.PI / 2, { state: 'queue' }));
}
function shopperGoto(s, tx, tz) {
  s.path = navPath(s.x, s.z, tx, tz); s.pi = 0;
  if (!s.path || !s.path.length) s.path = [[tx, tz]];
}
function updateCrowd(dt, carts) {
  for (const s of G.crowd) {
    s.anim += dt * (s.state === 'down' ? 1 : 1 + hyp(s.vx, s.vz) * 1.6);
    s.yell = Math.max(0, s.yell - dt); s.cheer = Math.max(0, s.cheer - dt);
    if (s.state === 'down') {
      s.vy -= 18 * dt; s.y += s.vy * dt; s.x += s.vx * dt; s.z += s.vz * dt; s.rz += s.spin * dt;
      s.rx = Math.min(Math.PI / 2, s.rx + dt * 6);
      if (s.y <= 0) { s.y = 0; s.vy = 0; s.vx *= Math.exp(-6 * dt); s.vz *= Math.exp(-6 * dt); s.spin *= Math.exp(-5 * dt); }
      s.down -= dt;
      if (s.down <= 0 && s.y <= 0) { s.state = 'getup'; s.t = 0.6; }
      collideShopperStatic(s);
      continue;
    }
    if (s.state === 'getup') { s.rx = Math.max(0, s.rx - dt * 3); s.rz *= Math.exp(-5 * dt); s.t -= dt; if (s.t <= 0) { s.state = 'browse'; s.t = 0; s.rx = 0; s.rz = 0; s.yell = 1.2; } continue; }
    let tx = null, tz = null, spd = s.speed;
    if (s.state === 'queue') {
      if (G.phase === 'line') { s.vx *= 0.8; s.vz *= 0.8; if (G.lineT < 4) s.cheer = 0.3; s.h += Math.sin(G.time * 2 + s.id * 10) * 0.004; }
      else { s.state = 'rush'; shopperGoto(s, rr(-3, 3), rr(-12, -16)); s.speed *= 1.35; }
    }
    if (s.state === 'rush' || s.state === 'browse' || s.state === 'walk') {
      if (!s.path || s.pi >= s.path.length) {
        if (s.state === 'rush') s.state = 'browse';
        s.t -= dt;
        if (s.t <= 0) { const b = pick(BROWSE_SPOTS); shopperGoto(s, b[0] + rr(-1, 1), b[1] + rr(-1.5, 1.5)); s.t = rr(1, 4); }
        s.vx *= 0.85; s.vz *= 0.85;
      } else {
        const p = s.path[s.pi]; tx = p[0]; tz = p[1];
        if (hyp(tx - s.x, tz - s.z) < 0.7) s.pi++;
      }
    }
    if (tx !== null) {
      const dx = tx - s.x, dz = tz - s.z, d = hyp(dx, dz) || 1;
      const th = Math.atan2(dx, dz); s.h += angWrap(th - s.h) * Math.min(1, dt * 8);
      const k = Math.min(1, dt * 5); s.vx += (dx / d * spd - s.vx) * k; s.vz += (dz / d * spd - s.vz) * k;
    }
    // flee from carts that come at them fast (makes the crowd part a bit)
    for (const c of carts) {
      const dx = s.x - c.x, dz = s.z - c.z, d = hyp(dx, dz); if (d > 3.5 || d < 0.01) continue;
      const sp = hyp(c.vx, c.vz); if (sp < 3) continue;
      const toward = (c.vx * dx + c.vz * dz) / (d * sp); if (toward < 0.7) continue;
      const rx = -c.vz / sp, rz = c.vx / sp, side = (dx * rx + dz * rz) >= 0 ? 1 : -1;
      s.vx += rx * side * 6 * dt * (s.staff ? 0.6 : 1); s.vz += rz * side * 6 * dt * (s.staff ? 0.6 : 1);
    }
    s.x += s.vx * dt; s.z += s.vz * dt;
    collideShopperStatic(s);
    // hit by carts
    for (const c of carts) {
      if (hyp(s.x - c.x, s.z - c.z) > 2) continue;
      cartCircles(c, _cc);
      for (let k = 0; k < 3; k++) {
        const px = _cc[k * 3], pz = _cc[k * 3 + 1], R = _cc[k * 3 + 2] + 0.27;
        const dx = s.x - px, dz = s.z - pz, d = hyp(dx, dz); if (d >= R || d < 1e-4) continue;
        const nx = dx / d, nz = dz / d;
        s.x += nx * (R - d); s.z += nz * (R - d);
        const ox = px - c.x, oz = pz - c.z;
        const vpx = c.vx + c.w * oz, vpz = c.vz - c.w * ox;
        const vn = (vpx - s.vx) * nx + (vpz - s.vz) * nz;
        if (vn > 1.7 && k < 2) {
          s.state = 'down'; s.down = 2.4; s.vy = 2.6 + vn * 0.25; s.vx = vpx * 0.8 + nx * 1.5; s.vz = vpz * 0.8 + nz * 1.5; s.spin = rr(-6, 6); s.rx = 0.2; s.rz = 0;
          s.h = Math.atan2(-nx, -nz); s.path = null;
          c.vx *= 0.86; c.vz *= 0.86; c.stats.bowled++; c.wob = Math.max(c.wob, 0.6);
          AU.oof(s.x, s.z, s.look.size);
          if (c.isPlayer) { popText(s.x, 2.1, s.z, pick(OOFS), 'oof'); shake(0.12); }
          break;
        } else if (vn > 0) { s.vx += nx * vn * 0.8; s.vz += nz * vn * 0.8; c.vx *= 0.995; c.vz *= 0.995; }
      }
    }
  }
}
function collideShopperStatic(s) {
  const r = 0.27;
  for (const b of COL) {
    if (!b.on) continue;
    if (s.x + r < b.x0 || s.x - r > b.x1 || s.z + r < b.z0 || s.z - r > b.z1) continue;
    const qx = clamp(s.x, b.x0, b.x1), qz = clamp(s.z, b.z0, b.z1); let dx = s.x - qx, dz = s.z - qz, d = hyp(dx, dz);
    if (d > 1e-5) { if (d < r) { s.x += dx / d * (r - d); s.z += dz / d * (r - d); } }
    else { const l = s.x - b.x0, rr_ = b.x1 - s.x, t = s.z - b.z0, bb = b.z1 - s.z, m = Math.min(l, rr_, t, bb); if (m === l) s.x = b.x0 - r; else if (m === rr_) s.x = b.x1 + r; else if (m === t) s.z = b.z0 - r; else s.z = b.z1 + r; }
  }
}
function drawCrowd(cam) {
  for (const s of G.crowd) {
    const dx = s.x - cam[0], dz = s.z - cam[2]; if (dx * dx + dz * dz > 75 * 75) continue;
    const down = s.state === 'down' || s.state === 'getup';
    drawPerson(s.look, s.x, s.y, s.z, s.h, { run: s.anim, speed: down ? 0 : hyp(s.vx, s.vz), flail: s.state === 'down' && s.y > 0.05, cheer: s.cheer > 0, yell: s.yell > 0 || s.cheer > 0, down }, -s.rx, s.rz);  }
}
