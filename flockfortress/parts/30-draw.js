// ================= drawing =================
const cv = $('c'); let ctx = cv.getContext('2d');
function ctxSwap(g) { ctx = g; }   // lets the piece and sheep painters draw HUD icons too
const V = { w: 0, h: 0, dpr: 1 };
const CAM = { x: WORLD.W / 2, y: 560, z: 0.5, tx: WORLD.W / 2, ty: 560, tz: 0.5, mode: 'fit', zoomOut: false };
function layout() { V.dpr = Math.min(2, devicePixelRatio || 1); V.w = innerWidth; V.h = innerHeight; cv.width = V.w * V.dpr; cv.height = V.h * V.dpr; if (G) camTo(CAM.mode, CAM.side, true); }
addEventListener('resize', layout);
// frame a world rectangle on screen (leaving room for the HUD)
function frame(x0, y0, x1, y1) { const short = V.h < 520, top = short ? 54 : 64, bot = short ? 78 : 96, z = Math.min(V.w / (x1 - x0), (V.h - top - bot) / (y1 - y0)); return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 - (bot - top) / 2 / z * 0, z, top, bot }; }
function camTo(mode, side, snap) {
  CAM.mode = mode; CAM.side = side;
  let f;
  if (CAM.zoomOut || mode === 'fit') f = frame(-40, 120, WORLD.W + 40, WORLD.ground + 70);
  else if (mode === 'build') { const z = ZONES[side]; f = frame(z.x0 - 40, WORLD.ground - (V.h < 520 ? 440 : 600), z.x1 + 40, WORLD.ground + 50); }
  else { // aim and follow: from your catapult to the far side of the enemy fort
    const z = ZONES[side], e = ZONES[1 - side], a = Math.min(z.cat - 160 * z.dir, e.x0, e.x1, z.cat + 160 * z.dir), b = Math.max(z.cat - 160 * z.dir, e.x0, e.x1, z.cat + 160 * z.dir);
    f = frame(a - 40, WORLD.ground - (V.h < 520 ? 480 : 620), b + 40, WORLD.ground + 60);
  }
  CAM.tx = f.x; CAM.ty = f.y + (f.bot - f.top) / 2 / f.z; CAM.tz = f.z;
  if (snap) { CAM.x = CAM.tx; CAM.y = CAM.ty; CAM.z = CAM.tz; }
}
function camStep(dt) {
  if (G && G.shot && CAM.mode === 'follow' && !CAM.zoomOut) {
    // keep the flying sheep in view
    const s = BODIES.find(b => b.kind === 'sheep');
    if (s) { const half = V.w / 2 / CAM.z * 0.7; if (s.x > CAM.tx + half * 0.6) CAM.tx = s.x - half * 0.6; if (s.x < CAM.tx - half * 0.6) CAM.tx = s.x + half * 0.6; CAM.tx = clamp(CAM.tx, V.w / 2 / CAM.z - 40, WORLD.W + 40 - V.w / 2 / CAM.z); }
  }
  const k = 1 - Math.exp(-dt * 4);
  CAM.x = lerp(CAM.x, CAM.tx, k); CAM.y = lerp(CAM.y, CAM.ty, k); CAM.z = lerp(CAM.z, CAM.tz, k);
}
const w2s = (x, y) => [(x - CAM.x) * CAM.z + V.w / 2, (y - CAM.y) * CAM.z + V.h / 2];
const s2w = (X, Y) => [CAM.x + (X - V.w / 2) / CAM.z, CAM.y + (Y - V.h / 2) / CAM.z];
// ---------- scenery
const CLOUDS = Array.from({ length: 9 }, (_, i) => ({ x: hash(i, 1, 3) * 3200 - 300, y: 80 + hash(i, 2, 3) * 300, s: 0.6 + hash(i, 3, 3) * 0.9, v: 6 + hash(i, 4, 3) * 10 }));
function drawSky(t) {
  const g = ctx.createLinearGradient(0, 0, 0, V.h); g.addColorStop(0, '#6fb2e6'); g.addColorStop(0.6, '#a9d6f2'); g.addColorStop(1, '#e8f1de');
  ctx.fillStyle = g; ctx.fillRect(0, 0, V.w, V.h);
  // sun
  ctx.fillStyle = 'rgba(255,245,200,.9)'; ctx.beginPath(); ctx.arc(V.w * 0.82, V.h * 0.16, 34, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,245,200,.25)'; ctx.beginPath(); ctx.arc(V.w * 0.82, V.h * 0.16, 60, 0, TAU); ctx.fill();
}
function hillLayer(par, base, amp, col, seed) {
  ctx.fillStyle = col; ctx.beginPath();
  const x0 = (CAM.x * (1 - par)) , step = 40;
  ctx.moveTo(-10, V.h);
  for (let sx = -10; sx <= V.w + step; sx += step) {
    const wx = (sx - V.w / 2) / (CAM.z * (0.5 + par * 0.5)) + CAM.x * par;
    const h = Math.sin(wx * 0.004 + seed) * amp + Math.sin(wx * 0.011 + seed * 2) * amp * 0.4;
    const [, gy] = w2s(0, WORLD.ground - base - h);
    ctx.lineTo(sx, gy + (CAM.y - 560) * CAM.z * (1 - par) * 0.4);
  }
  ctx.lineTo(V.w + 10, V.h); ctx.closePath(); ctx.fill();
}
function drawClouds(t) {
  for (const c of CLOUDS) {
    const wx = ((c.x + t * c.v) % 3400) - 300, sx = (wx - CAM.x * 0.3) * CAM.z * 0.7 + V.w / 2, sy = c.y * CAM.z * 0.7 + 20;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const [dx, dy, r] of [[0, 0, 34], [30, 8, 26], [-30, 8, 24], [12, -14, 26]]) { ctx.beginPath(); ctx.arc(sx + dx * c.s * CAM.z * 1.4, sy + dy * c.s * CAM.z * 1.4, r * c.s * CAM.z * 1.4, 0, TAU); ctx.fill(); }
  }
}
function drawGround() {
  const [, gy] = w2s(0, WORLD.ground), [lx] = w2s(0, 0), [rx] = w2s(WORLD.W, 0);
  ctx.fillStyle = '#7a5a3a'; ctx.fillRect(0, gy, V.w, V.h - gy);
  ctx.fillStyle = '#5f9a3e'; ctx.fillRect(0, gy, V.w, 16 * CAM.z + 4);
  ctx.fillStyle = '#76b24c'; ctx.fillRect(0, gy, V.w, 6 * CAM.z + 2);
  // tufts
  ctx.strokeStyle = '#4f8a32'; ctx.lineWidth = Math.max(1, 2 * CAM.z);
  for (let x = Math.floor((CAM.x - V.w / 2 / CAM.z) / 30) * 30; x < CAM.x + V.w / 2 / CAM.z; x += 30) { const [sx] = w2s(x + hash(x, 0, 1) * 20, 0); const h = (4 + hash(x, 1, 1) * 6) * CAM.z; ctx.beginPath(); ctx.moveTo(sx, gy + 1); ctx.lineTo(sx - h * 0.4, gy - h); ctx.moveTo(sx + 3 * CAM.z, gy + 1); ctx.lineTo(sx + 3 * CAM.z, gy - h * 1.2); ctx.stroke(); }
  // field edges
  ctx.fillStyle = 'rgba(0,0,0,.12)'; if (lx > 0) ctx.fillRect(0, 0, lx, V.h); if (rx < V.w) ctx.fillRect(rx, 0, V.w - rx, V.h);
}
// ---------- pieces
const WOOD = '#a8763e', WOOD_D = '#7d5328', STONE = '#9a968c', STONE_D = '#6f6b63', HAY = '#e6c35c', HAY_D = '#b8902e';
function drawPiece(b, alpha = 1) {
  ctx.save(); const [sx, sy] = w2s(b.x, b.y); ctx.translate(sx, sy); ctx.rotate(b.a); ctx.scale(CAM.z, CAM.z); ctx.globalAlpha *= alpha;
  const w = b.hw, h = b.hh, t = b.piece;
  if (b.hitT > 0) ctx.translate((Math.random() - 0.5) * 2, 0);
  if (t === 'hay') {
    ctx.fillStyle = HAY; ctx.fillRect(-w, -h, w * 2, h * 2);
    ctx.strokeStyle = HAY_D; ctx.lineWidth = 1.4;
    for (let k = -h + 5; k < h; k += 6) { ctx.beginPath(); ctx.moveTo(-w + 2, k); ctx.lineTo(w - 2, k + (k % 12 ? 2 : -2)); ctx.stroke(); }
    ctx.strokeStyle = '#8a5a26'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-w * 0.35, -h); ctx.lineTo(-w * 0.35, h); ctx.moveTo(w * 0.35, -h); ctx.lineTo(w * 0.35, h); ctx.stroke();
  } else if (t === 'crate') {
    ctx.fillStyle = WOOD; ctx.fillRect(-w, -h, w * 2, h * 2);
    ctx.strokeStyle = WOOD_D; ctx.lineWidth = 4; ctx.strokeRect(-w + 2, -h + 2, w * 2 - 4, h * 2 - 4);
    ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-w + 3, -h + 3); ctx.lineTo(w - 3, h - 3); ctx.stroke();
  } else if (t === 'plank') {
    ctx.fillStyle = WOOD; ctx.fillRect(-w, -h, w * 2, h * 2);
    ctx.strokeStyle = WOOD_D; ctx.lineWidth = 1;
    const L = Math.max(w, h), horiz = w > h;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); if (horiz) { ctx.moveTo(-w + 4, -h + 3 + k * 4); ctx.lineTo(w - 4, -h + 4 + k * 4); } else { ctx.moveTo(-w + 3 + k * 4, -h + 4); ctx.lineTo(-w + 4 + k * 4, h - 4); } ctx.stroke(); }
    ctx.fillStyle = '#4a3218'; for (const s of [-1, 1]) { ctx.beginPath(); horiz ? ctx.arc(s * (L - 6), 0, 1.6, 0, TAU) : ctx.arc(0, s * (L - 6), 1.6, 0, TAU); ctx.fill(); }
  } else if (t === 'stone' || t === 'slab') {
    ctx.fillStyle = STONE; ctx.fillRect(-w, -h, w * 2, h * 2);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-w, -h, w * 2, 3); ctx.fillRect(-w, -h, 3, h * 2);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(-w, h - 3, w * 2, 3); ctx.fillRect(w - 3, -h, 3, h * 2);
    ctx.fillStyle = STONE_D; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(-w + 6 + hash(b.id, k, 1) * (w * 2 - 12), -h + 5 + hash(b.id, k, 2) * (h * 2 - 10), 1.5, 0, TAU); ctx.fill(); }
  } else if (t === 'bell') {
    // a golden bell sitting on a little wooden yoke
    ctx.fillStyle = '#6b4a24'; ctx.fillRect(-w, h - 5, w * 2, 5);
    const g = ctx.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, '#c78b14'); g.addColorStop(0.45, '#ffe17a'); g.addColorStop(1, '#b5780e');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-w + 1, h - 6); ctx.quadraticCurveTo(-w + 3, -h * 0.2, -w * 0.45, -h + 3); ctx.quadraticCurveTo(0, -h - 3, w * 0.45, -h + 3); ctx.quadraticCurveTo(w - 3, -h * 0.2, w - 1, h - 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a5a0c'; ctx.beginPath(); ctx.arc(0, h - 4, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-w * 0.35, -h * 0.5, 2.5, h * 0.9);
  }
  // cracks as a piece wears down
  if (b.maxhp && b.hp < b.maxhp * 0.7 && t !== 'bell') {
    ctx.strokeStyle = 'rgba(30,20,10,.65)'; ctx.lineWidth = 1.4; const n = b.hp < b.maxhp * 0.35 ? 3 : 1;
    for (let k = 0; k < n; k++) { const sx0 = (hash(b.id, k, 7) - 0.5) * w * 1.6, sy0 = (hash(b.id, k, 8) - 0.5) * h * 1.6; ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx0 + 6, sy0 + 5); ctx.lineTo(sx0 + 3, sy0 + 11); ctx.moveTo(sx0 + 6, sy0 + 5); ctx.lineTo(sx0 + 12, sy0 + 3); ctx.stroke(); }
  }
  ctx.restore();
}
// ---------- sheep
function drawSheep(b) {
  ctx.save(); const [sx, sy] = w2s(b.x, b.y); ctx.translate(sx, sy); ctx.scale(CAM.z, CAM.z);
  const r = b.r, type = b.st, dark = type === 'black';
  const face = b.vx < -20 ? -1 : b.vx > 20 ? 1 : (b.side === 1 ? -1 : 1);
  ctx.rotate(b.a * 0.4);
  // legs
  ctx.strokeStyle = '#2a2420'; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round';
  for (const lx of [-0.45, -0.15, 0.2, 0.48]) { ctx.beginPath(); ctx.moveTo(lx * r, r * 0.5); ctx.lineTo(lx * r + Math.sin(b.age * 18 + lx * 5) * r * 0.12, r * 1.05); ctx.stroke(); }
  // wool: a ring of puffs
  const n = type === 'fluff' ? 11 : 8, wool = dark ? '#2b2724' : type === 'fluff' ? '#fffdf7' : '#f7f3ea';
  ctx.fillStyle = dark ? '#1b1816' : '#d9d2c2'; ctx.beginPath(); ctx.arc(0, r * 0.08, r, 0, TAU); ctx.fill();
  ctx.fillStyle = wool;
  for (let k = 0; k < n; k++) { const a = k / n * TAU, rr = r * (type === 'fluff' ? 0.42 : 0.38); ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.6, rr, 0, TAU); ctx.fill(); }
  ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, TAU); ctx.fill();
  // head
  ctx.fillStyle = dark ? '#3d3632' : '#2b2420'; ctx.beginPath(); ctx.ellipse(face * r * 0.86, -r * 0.1, r * 0.36, r * 0.3, face * 0.3, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(face * r * 0.96, -r * 0.2, r * 0.09, 0, TAU); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(face * r * 0.99, -r * 0.2, r * 0.045, 0, TAU); ctx.fill();
  ctx.fillStyle = dark ? '#3d3632' : '#2b2420'; ctx.beginPath(); ctx.ellipse(face * r * 0.62, -r * 0.38, r * 0.16, r * 0.08, -face * 0.6, 0, TAU); ctx.fill();
  if (type === 'ram') { ctx.strokeStyle = '#c9a46a'; ctx.lineWidth = r * 0.18; ctx.beginPath(); ctx.arc(face * r * 0.66, -r * 0.18, r * 0.26, -Math.PI * 0.9, Math.PI * 0.6); ctx.stroke(); }
  if (type === 'trio') { ctx.fillStyle = '#2b2420'; for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(face * r * 0.5, k * r * 0.5, r * 0.18, 0, TAU); ctx.fill(); } }
  // lit fuse glow
  if (b.fuse != null && b.fuse > 0 && !b.dead) { const k = 0.5 + 0.5 * Math.sin(b.age * (b.fuse < 0.4 ? 40 : 16)); ctx.fillStyle = `rgba(255,${120 + 80 * k},40,${0.35 + 0.4 * k})`; ctx.beginPath(); ctx.arc(0, 0, r * 1.15, 0, TAU); ctx.fill(); }
  ctx.restore();
}
// ---------- catapults
function drawCatapult(side, t) {
  const z = ZONES[side], d = z.dir, [sx, sy] = w2s(z.cat, WORLD.ground);
  ctx.save(); ctx.translate(sx, sy); ctx.scale(CAM.z * d, CAM.z);
  ctx.fillStyle = '#5a3c20'; ctx.fillRect(-40, -18, 80, 10);
  ctx.fillStyle = '#2b2018'; for (const x of [-28, 28]) { ctx.beginPath(); ctx.arc(x, -6, 9, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#7d5328'; ctx.beginPath(); ctx.moveTo(-14, -18); ctx.lineTo(-4, -62); ctx.lineTo(6, -62); ctx.lineTo(16, -18); ctx.closePath(); ctx.fill();
  // the arm swings up when it fires
  const k = G && G.catSide === side && G.catT > 0 ? Math.sin((1 - G.catT / 0.5) * Math.PI * 0.5) : 0;
  const ang = -0.35 - k * 1.5 + (canAim() && G.turn === side && AIM.on ? -AIM.pow * 0.4 : 0);
  ctx.save(); ctx.translate(1, -58); ctx.rotate(ang);
  ctx.fillStyle = '#a8763e'; ctx.fillRect(-46, -4, 74, 8);
  ctx.fillStyle = '#6b4a24'; ctx.beginPath(); ctx.arc(28, -6, 11, 0, Math.PI); ctx.fill();
  ctx.restore();
  ctx.fillStyle = side === 0 ? '#4fb3ff' : '#ff7b54'; ctx.fillRect(-6, -76, 3, 18); ctx.beginPath(); ctx.moveTo(-3, -76); ctx.lineTo(13, -71); ctx.lineTo(-3, -66); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// ---------- the whole frame
function draw(t) {
  const sh = G && G.shake > 0 ? G.shake : 0, ox = (Math.random() - 0.5) * sh, oy = (Math.random() - 0.5) * sh;
  ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
  drawSky(t); drawClouds(t);
  ctx.setTransform(V.dpr, 0, 0, V.dpr, ox * V.dpr, oy * V.dpr);
  hillLayer(0.25, 160, 60, '#9cc79a', 1); hillLayer(0.5, 70, 40, '#7fb37a', 4);
  drawGround();
  if (!G) return;
  // build zones and the bell height line
  if (G.phase === 'build') for (const side of [0, 1]) {
    const z = ZONES[side], [x0, y0] = w2s(z.x0, 120), [x1, y1] = w2s(z.x1, WORLD.ground);
    if (G.mode !== 'cpu' && !isBuilderView(side)) { ctx.fillStyle = 'rgba(70,50,30,.55)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.max(12, 22 * CAM.z)}px ui-rounded, system-ui`; ctx.textAlign = 'center'; ctx.fillText(G.ready[side] ? 'Ready ✓' : 'Building…', (x0 + x1) / 2, (y0 + y1) / 2); continue; }
    if (side !== G.builder) continue;
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.setLineDash([]);
    const [, by] = w2s(0, WORLD.ground - BELL_MIN); ctx.strokeStyle = 'rgba(242,193,74,.75)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(x0, by); ctx.lineTo(x1, by); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(242,193,74,.9)'; ctx.font = `700 ${Math.max(10, 13 * CAM.z)}px ui-rounded, system-ui`; ctx.textAlign = 'left'; ctx.fillText('bell must sit above this line', x0 + 6, by - 5);
  }
  drawCatapult(0, t); drawCatapult(1, t);
  for (const b of BODIES) if (b.piece && (G.phase !== 'build' || G.mode === 'cpu' || isBuilderView(b.side))) drawPiece(b, b.ghost ? 0 : 1);
  for (const b of BODIES) if (b.kind === 'sheep') drawSheep(b);
  // build ghost
  if (G.phase === 'build' && BUILD.ghost && G.sel !== 'remove') { const g = BUILD.ghost; drawPiece(Object.assign({ id: 0, a: 0 }, g), g.ok ? 0.55 : 0.25); if (!g.ok) { const [gx, gy] = w2s(g.x, g.y); ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 2; ctx.strokeRect(gx - g.hw * CAM.z, gy - g.hh * CAM.z, g.hw * 2 * CAM.z, g.hh * 2 * CAM.z); } }
  // particles
  for (const p of FX) {
    const a = clamp(1 - p.t / p.life, 0, 1), [px, py] = w2s(p.x, p.y);
    if (p.k === 'wool') { ctx.globalAlpha = a; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(px, py, p.s * CAM.z * (1 + p.t), 0, TAU); ctx.fill(); }
    else if (p.k === 'chip') { ctx.globalAlpha = a; ctx.fillStyle = p.c; ctx.save(); ctx.translate(px, py); ctx.rotate(p.a); ctx.fillRect(-p.s * CAM.z / 2, -p.s * CAM.z / 2, p.s * CAM.z, p.s * CAM.z * 0.6); ctx.restore(); }
    else if (p.k === 'ring') { ctx.globalAlpha = a * 0.8; ctx.strokeStyle = '#fff6d8'; ctx.lineWidth = 6 * CAM.z * a + 1; ctx.beginPath(); ctx.arc(px, py, p.s * CAM.z * (0.4 + p.t / p.life * 0.9), 0, TAU); ctx.stroke(); ctx.globalAlpha = a * 0.35; ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.arc(px, py, p.s * CAM.z * 0.6 * (1 - p.t / p.life), 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // aiming: dotted path and power
  if (canAim() && AIM.on && AIM.pow > 0.05) {
    const [lx, ly] = launchPoint(G.turn), [vx, vy] = aimVel();
    let x = lx, y = ly, ux = vx, uy = vy;
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    for (let i = 0; i < 26; i++) { const dt = 0.045; ux += G.wind * dt * 0.0; uy += PH.g * dt; x += ux * dt; y += uy * dt; if (i % 2) continue; const [sx, sy] = w2s(x, y); ctx.globalAlpha = 1 - i / 28; ctx.beginPath(); ctx.arc(sx, sy, Math.max(2, 4.5 * CAM.z), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    const [cx, cy] = w2s(lx, ly); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + TAU * AIM.pow); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '800 13px ui-rounded, system-ui'; ctx.textAlign = 'center'; ctx.fillText(Math.round(AIM.pow * 100) + '%', cx, cy - 34);
  }
}
const isBuilderView = side => G.phase !== 'build' || (G.mode === 'local' ? side === G.builder : isMine(side)) || G.ready[side] && G.forts[0] && G.forts[1];
