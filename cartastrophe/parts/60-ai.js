// ---------- AI drivers: line up behind a target so the nearest hazard is past them, then ram ----------
const AI_LEVELS = {
  easy: { skill: 0.35, think: 0.4, look: 0.8, noise: 0.25, playerPref: 0, aim: 1.6 },
  normal: { skill: 0.7, think: 0.22, look: 1.05, noise: 0.1, playerPref: 2, aim: 2.4 },
  mean: { skill: 1.0, think: 0.14, look: 1.25, noise: 0.03, playerPref: 5, aim: 3.0 }
};
class AI {
  constructor(c, level) {
    this.c = c; this.L = { ...(AI_LEVELS[level] || AI_LEVELS.normal) }; this.thinkT = R1(0, 0.3); this.target = null; this.goal = [0, 0];
    this.plan = 'roam'; this.steerOut = 0; this.thr = 1; this.brake = 0; this.boost = 0; this.reverseT = 0;
    this.commit = 0; this.itemHold = 0; this.wander = [R1(-20, 25), R1(-20, 20)]; this.reckless = false; this.dbg = {};
    this.override = null; this.overT = 0; this.hist = []; this.histT = 0; this.charge = false; this.pushDir = [0, 0]; this.aimOff = R1(-0.25, 0.25);
  }
  update(dt, now, carts) {
    const c = this.c, L = this.L;
    if (c.state !== 'drive') { c.input.throttle = 0; c.input.steer = 0; c.input.boost = 0; c.input.brake = 0; this.hist = []; return; }
    // stuck detection by displacement
    this.histT += dt;
    if (this.histT > 0.5) { this.histT = 0; this.hist.push([c.x, c.z]); if (this.hist.length > 4) this.hist.shift(); }
    if (this.hist.length === 4 && this.reverseT <= 0 && this.thr > 0.5 && c.overT <= 0) {
      const [ox, oz] = this.hist[0];
      if (Math.hypot(c.x - ox, c.z - oz) < 1.1) {
        this.reverseT = R1(0.8, 1.2); this.hist = [];
        // back away from the nearest obstacle, then head somewhere open for a moment
        let bx = 0, bz = 0, bd = 9;
        for (const st of STATICS) { const [, , d, nx, nz] = staticClosest(st, c.x, c.z); if (d < bd) { bd = d; bx = nx; bz = nz; } }
        const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -fz, rz = fx;
        this.revSteer = (bx * rx + bz * rz) > 0 ? 1 : -1;
        this.escape = [c.x + bx * 7 + R1(-2, 2), c.z + bz * 7 + R1(-2, 2)]; this.escapeT = 1.8;
      }
    }
    if (this.reverseT > 0) { this.reverseT -= dt; c.input.throttle = 0; c.input.brake = 1; c.input.steer = -this.revSteer; c.input.boost = 0; return; }
    if (this.escapeT > 0) this.escapeT -= dt;
    this.thinkT -= dt;
    if (this.thinkT <= 0) { this.thinkT = L.think * R1(0.8, 1.2); this.think(now, carts); }
    // aim every step (live target position while charging)
    let gx = this.goal[0], gz = this.goal[1];
    const t = this.target;
    if (this.charge && t && t.state === 'drive') {
      const d = Math.hypot(t.x - c.x, t.z - c.z); const lead = clamp(d / Math.max(6, c.speed()), 0, 0.9);
      gx = t.x + t.vx * lead + this.pushDir[0] * 0.3 + this.aimOff * this.pushDir[1]; gz = t.z + t.vz * lead + this.pushDir[1] * 0.3 - this.aimOff * this.pushDir[0];
    }
    if (this.escapeT > 0) { gx = this.escape[0]; gz = this.escape[1]; }
    // steer toward the goal, slid along nearby obstacles (except the one we're aiming to shove someone into)
    let dx = gx - c.x, dz = gz - c.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const range = 1.6 + c.speed() * 0.12;
    for (const st of STATICS) {
      if (st.kind === 'fountain') continue;
      const ddx = c.x - st.x, ddz = c.z - st.z, rr = (st.shape === 'circ' ? st.r : Math.max(st.hx, st.hz)) + range + 0.7;
      if (ddx * ddx + ddz * ddz > rr * rr) continue;
      const [, , d, nx, nz] = staticClosest(st, c.x, c.z);
      if (d > range || (this.charge && d > 0.9)) continue;
      const ahead = -(nx * fx + nz * fz); if (ahead < -0.2) continue;
      const w = (range - d) / range * 1.6 * (0.5 + ahead);
      const tx = -nz, tz = nx, side = (tx * dx + tz * dz) >= 0 ? 1 : -1;
      dx += nx * w + tx * side * w * 0.8; dz += nz * w + tz * side * w * 0.8;
    }
    const desired = Math.atan2(dx, dz);
    const err = wrapA(desired - c.yaw);
    let s = clamp(-err * L.aim + c.w * 0.22, -1, 1);
    if (this.overT > 0) { this.overT -= dt; s = this.override; }
    this.steerOut = s;
    c.input.steer += (this.steerOut - c.input.steer) * Math.min(1, dt * (8 + 8 * L.skill));
    const spd = c.speed();
    let thr = this.thr; const ae = Math.abs(err);
    if (spd > 6 && ae > 0.8) thr = Math.min(thr, ae > 1.5 ? 0.15 : 0.55);
    // goal is behind and close: handbrake turn (drag feet so the back slides round)
    const gd = Math.hypot(gx - c.x, gz - c.z);
    this.handbrake = ae > 2.0 && gd < 9 && spd > 3;
    c.input.throttle = this.handbrake ? 0.35 : thr; c.input.brake = this.brake || this.handbrake ? 1 : 0;
    c.input.boost = this.boost && Math.abs(err) < 0.5 && c.heat < 0.6 + 0.25 * (1 - L.skill) ? 1 : 0;
    this.useItem(now, carts);
  }
  // how dangerous is holding steer s for a short while
  danger(s, maxDist, reckless) {
    const c = this.c, v = Math.max(c.speed(), 4);
    const delta = s * Math.min(0.62 / (1 + v / 9), 0.13 + 0.73 * 14 / (v * v + 1));
    const rate = clamp(-v * Math.tan(delta) / 0.73, -11 / v, 11 / v);
    let h = c.yaw, x = c.x, z = c.z, dist = 0, dg = 0;
    const steps = 7, sdt = this.L.look / steps;
    for (let k = 1; k <= steps; k++) {
      h += rate * sdt; x += Math.sin(h) * v * sdt; z += Math.cos(h) * v * sdt; dist += v * sdt;
      if (isLethal(x, z)) return dg + 150 / k;
      if (dist > maxDist) break;
      if (reckless) continue;
      for (const st of STATICS) {
        if (st.kind === 'fountain') continue;
        const ddx = x - st.x, ddz = z - st.z, rr = (st.shape === 'circ' ? st.r : Math.max(st.hx, st.hz)) + 1.3;
        if (ddx * ddx + ddz * ddz > rr * rr) continue;
        const d = staticClosest(st, x, z)[2];
        if (d < 0.8) dg += (v > 6.5 ? 45 : 5) / k;
      }
    }
    return dg;
  }
  think(now, carts) {
    const c = this.c, L = this.L, spd = c.speed();
    // ---- choose a target ----
    let best = null, bs = 1e9;
    for (const t of carts) {
      if (t === c || t.state !== 'drive' || t.ghostT > 0 || t.out) continue;
      const d = Math.hypot(t.x - c.x, t.z - c.z);
      const hz = hazardsNear(t.x, t.z)[0];
      let s = d + Math.max(-4, hz.w) * 0.45;
      if (t.isPlayer) s -= L.playerPref;
      if (c.lastHit.by === t && now - c.lastHit.t < 6) s -= 6;
      if (t === this.target) s -= 4;
      for (const o of GAME.ais) if (o !== this && o.target === t) s += 3.5; // spread out instead of mobbing one cart
      if (s < bs) { bs = s; best = t; }
    }
    if (best !== this.target) this.aimOff = R1(-0.25, 0.25);
    this.target = best;
    let gx, gz, charge = false, aimSpeed = 1, tdist = 99;
    if (best) {
      const t = best;
      const hz = hazardsNear(t.x, t.z)[0];
      let dx = hz.px - t.x, dz = hz.pz - t.z; let dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      if (hz.d > 16) { dx = t.x - c.x; dz = t.z - c.z; dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl; }
      this.pushDir = [dx, dz];
      const rx = c.x - t.x, rz = c.z - t.z;
      const along = rx * dx + rz * dz, lat = Math.abs(rx * -dz + rz * dx);
      tdist = Math.hypot(rx, rz);
      this.dbg = { hazard: hz.kind, along: +along.toFixed(1), lat: +lat.toFixed(1) };
      const hErr = Math.abs(wrapA(Math.atan2(t.x - c.x, t.z - c.z) - c.yaw));
      // joust: after contact (or when stuck nose to nose) back off before charging again
      if (now - (c.lastContact || -9) < 0.25 && this.plan === 'ram' && tdist < 3) this.retreatT = R1(0.9, 1.4);
      if (tdist < 2.6 && spd < 4 && this.plan !== 'retreat') this.retreatT = R1(0.8, 1.2);
      if (this.retreatT > 0) this.retreatT -= L.think;
      const room = -along;                       // how far behind the target (relative to the hazard) we are
      const cone = lat < 1.8 + 0.5 * Math.abs(along);
      const aligned = hErr < 1.1 + 3 / (tdist + 1);
      if (!(this.retreatT > 0) && ((room > 3.5 && cone && aligned) || (spd > 7 && room > 0 && cone && hErr < 0.5) || this.commit > 0)) {
        charge = true;
        this.commit = this.commit > 0 ? this.commit - L.think : (tdist < 8 ? 0.6 : 0);
        gx = t.x; gz = t.z; this.plan = 'ram';
      } else {
        const back = clamp(7 + lat * 0.6, 7, 13);
        let ax = t.x - dx * back + t.vx * 0.5, az = t.z - dz * back + t.vz * 0.5;
        // detour around the target if it sits on the straight line
        const sx = ax - c.x, sz = az - c.z, sl2 = sx * sx + sz * sz || 1;
        const tp = clamp(((t.x - c.x) * sx + (t.z - c.z) * sz) / sl2, 0, 1);
        const qx = c.x + sx * tp - t.x, qz = c.z + sz * tp - t.z;
        if (Math.hypot(qx, qz) < 3.0 && tp > 0.05 && tp < 0.95) {
          const side = (qx * -dz + qz * dx) >= 0 ? 1 : -1;
          ax = t.x - dz * side * 5 - dx * 2; az = t.z + dx * side * 5 - dz * 2;
        }
        gx = ax; gz = az; this.plan = this.retreatT > 0 ? 'retreat' : 'line up';
      }
      // grab a nearby grocery bag on the way if we have no item
      if (!charge && !c.item) {
        const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
        for (const p of GAME.pickups) { if (!p.active) continue; const ddx = p.x - c.x, ddz = p.z - c.z, d = Math.hypot(ddx, ddz); if (d < 11 && (ddx * fx + ddz * fz) / (d || 1) > 0.3) { gx = p.x; gz = p.z; this.plan = 'shopping'; break; } }
      }
    } else {
      if (Math.hypot(this.wander[0] - c.x, this.wander[1] - c.z) < 4) this.wander = [R1(-24, 28), R1(-22, 22)];
      gx = this.wander[0]; gz = this.wander[1]; this.plan = 'roam'; aimSpeed = 0.6;
    }
    // keep goals on the lot and away from walls/lethal spots
    gx = clamp(gx, -35, 35.5); gz = clamp(gz, -28.8, 26.8);
    if (!charge) {
      for (const st of STATICS) { if (st.kind === 'fountain' || st.kind === 'rail') continue; const [, , d, nx, nz] = staticClosest(st, gx, gz); if (d < 1.6) { gx += nx * (1.6 - d); gz += nz * (1.6 - d); } }
      for (let k = 0; k < 6 && isLethal(gx, gz); k++) { gx = lerp(gx, 0, 0.25); gz = lerp(gz, 0, 0.25); }
      if (pondSD(gx, gz) < 1.2) { const ddx = gx - POND.x, ddz = gz - POND.z, dd = Math.hypot(ddx, ddz) || 1, th = Math.atan2(ddz, ddx), r = pondR(th) + 2.0; gx = POND.x + ddx / dd * r; gz = POND.z + ddz / dd * r; }
    }
    this.goal = [gx, gz]; this.charge = charge;
    // ---- safety: test the steer the aim controller would use ----
    const desired = Math.atan2(gx - c.x, gz - c.z);
    const err = wrapA(desired - c.yaw);
    const sNow = clamp(-err * L.aim + c.w * 0.22, -1, 1);
    const reckless = charge && R1() < (1 - L.skill) * 0.3;
    this.reckless = reckless;
    const maxD = charge ? Math.max(0.8, tdist - 1.0) : 1e9;
    const dNow = this.danger(sNow, maxD, reckless);
    this.override = null; this.overT = 0;
    let allBad = false;
    if (dNow > 8) {
      let bestS = sNow, bsc = 1e9; allBad = true;
      for (const s of [-1, -0.6, -0.3, 0, 0.3, 0.6, 1]) {
        const dg = this.danger(s, 1e9, false);
        const score = dg + Math.abs(s - sNow) * 4 + L.noise * R1(-3, 3);
        if (dg < 30) allBad = false;
        if (score < bsc) { bsc = score; bestS = s; }
      }
      this.override = bestS; this.overT = L.think * 1.1;
    }
    // emergency: straight ahead is lethal
    const vx = c.vx, vz = c.vz; let lethalAhead = false;
    for (const tt of [0.25, 0.5, 0.8]) if (isLethal(c.x + vx * tt, c.z + vz * tt)) lethalAhead = true;
    this.thr = aimSpeed;
    this.brake = ((allBad || lethalAhead) && spd > 3.5 && !reckless) ? 1 : 0;
    if (lethalAhead && !reckless) this.thr = 0;
    this.boost = charge && tdist < 18 && tdist > 1.5 ? 1 : 0;
    if (!charge && tdist > 18 && Math.abs(err) < 0.25 && L.skill > 0.5 && R1() < 0.3) this.boost = 1;
  }
  useItem(now, carts) {
    const c = this.c; if (!c.item) { this.itemHold = 0; return; }
    this.itemHold += PHYS_DT;
    if (R1() > 0.08) return; // don't decide every step
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    let use = false;
    const t = this.target;
    if (c.item === 'melon' && t) {
      const dx = t.x - c.x, dz = t.z - c.z, d = Math.hypot(dx, dz); const a = Math.acos(clamp((dx * fx + dz * fz) / (d || 1), -1, 1));
      if (d > 4 && d < 20 && a < 0.2) use = true;
    } else if (c.item === 'banana') {
      for (const o of carts) { if (o === c || o.state !== 'drive') continue; const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz); if (d < 11 && (dx * fx + dz * fz) / (d || 1) < -0.6) use = true; }
      if (this.itemHold > 14) use = true;
    } else if (c.item === 'blower' && t) {
      const dx = t.x - c.x, dz = t.z - c.z, d = Math.hypot(dx, dz); const a = Math.acos(clamp((dx * fx + dz * fz) / (d || 1), -1, 1));
      const hz = hazardsNear(t.x, t.z)[0];
      const hd = Math.hypot(hz.px - t.x, hz.pz - t.z) || 1; const beyond = ((hz.px - t.x) * dx + (hz.pz - t.z) * dz) / (hd * (d || 1));
      if (d < 12 && a < 0.35 && ((hz.d < 9 && beyond > 0.4) || d < 5)) use = true;
      if (this.itemHold > 18) use = true;
    } else if (c.item === 'mega') {
      if (this.plan === 'ram' && t) { const d = Math.hypot(t.x - c.x, t.z - c.z); if (d > 4 && d < 16 && Math.abs(this.steerOut) < 0.3) use = true; }
      if (this.itemHold > 16) use = true;
    }
    if (use && R1() < 0.5 + 0.5 * this.L.skill) useItem(c, now);
  }
}
