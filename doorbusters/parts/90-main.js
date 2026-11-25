// ---------- HUD, labels, menus, camera, main loop ----------
const $ = id => document.getElementById(id);
const HUD = { paQueue: [], paT: 0, pops: [], pool: [], ptags: [], rtags: [], bannerT: 0, lastIcons: '', lastFlashGuide: null };
const LABELS = $('labels');
function hudShow(on) { $('hud').classList.toggle('hidden', !on); }
function banner(text, small, dur = 0.9) { const b = $('banner'); b.textContent = text; b.classList.toggle('small', !!small); b.classList.add('show'); HUD.bannerT = dur; }
function popText(x, y, z, text, cls = '') {
  let el = HUD.pool.pop(); if (!el) { el = document.createElement('div'); LABELS.appendChild(el); }
  el.className = 'tag3d pop ' + cls; el.textContent = text; el.style.display = 'block'; el.style.opacity = 1;
  HUD.pops.push({ el, x, y, z, t: 0, life: cls === 'big' ? 1.4 : 1.15 });
  if (HUD.pops.length > 24) { const p = HUD.pops.shift(); p.el.style.display = 'none'; HUD.pool.push(p.el); }
}
function makeTags() {
  for (const t of HUD.ptags.concat(HUD.rtags)) t.el.remove();
  HUD.ptags = W.pallets.map(p => { const el = document.createElement('div'); el.className = 'tag3d ptag'; LABELS.appendChild(el); return { el, p, txt: '' }; });
  HUD.rtags = G.carts.filter(c => !c.isPlayer).map(c => { const el = document.createElement('div'); el.className = 'tag3d rtag'; LABELS.appendChild(el); return { el, c, txt: '' }; });
}
const _pp = [0, 0, 0];
function placeTag(el, x, y, z, maxD, extraScale = 1) {
  const dx = x - CAM.pos[0], dz = z - CAM.pos[2], d = hyp(dx, dz);
  if (d > maxD || !project(x, y, z, _pp) || _pp[0] < -80 || _pp[0] > innerWidth + 80 || _pp[1] < -40 || _pp[1] > innerHeight + 40) { if (el.style.display !== 'none') el.style.display = 'none'; return false; }
  if (el.style.display !== 'block') el.style.display = 'block';
  const s = clamp(9 / _pp[2], 0.45, 1.25) * extraScale * Math.min(1.15, Math.max(0.75, innerHeight / 800));
  el.style.transform = `translate(${_pp[0].toFixed(1)}px,${_pp[1].toFixed(1)}px) translate(-50%,-100%) scale(${s.toFixed(3)})`;
  el.style.opacity = d > maxD * 0.75 ? ((maxD - d) / (maxD * 0.25)).toFixed(2) : '1';
  return true;
}
function updateTags(dt) {
  const live = G.phase === 'sale' || G.phase === 'line' || G.phase === 'closed';
  for (const t of HUD.ptags) {
    const p = t.p;
    if (!live) { t.el.style.display = 'none'; continue; }
    const txt = p.stock ? `<b>${p.it.e} ${money(p.it.now)}</b><i>SAVE ${money(p.it.save)} &middot; ${p.stock} LEFT</i>` : `<b>SOLD OUT</b>`;
    if (txt !== t.txt) { t.el.innerHTML = txt; t.txt = txt; t.el.className = 'tag3d ptag' + (p.flash ? ' flash' : '') + (p.stock ? '' : ' out'); }
    placeTag(t.el, p.x, p.it.slots >= 3 ? 1.75 : 1.65, p.z, p.flash ? 40 : 19);
  }
  for (const t of HUD.rtags) {
    const c = t.c, v = cartValue(c);
    if (!live || G.phase === 'line') { t.el.style.display = 'none'; continue; }
    const txt = `${c.name}${v ? ' <em>' + money(v) + '</em>' : ''}`;
    if (txt !== t.txt) { t.el.innerHTML = txt; t.txt = txt; }
    placeTag(t.el, c.x, 2.15, c.z, 15, 0.9);
  }
  for (let i = HUD.pops.length - 1; i >= 0; i--) {
    const p = HUD.pops[i]; p.t += dt;
    if (p.t > p.life) { p.el.style.display = 'none'; HUD.pool.push(p.el); HUD.pops.splice(i, 1); continue; }
    placeTag(p.el, p.x, p.y + p.t * 0.9, p.z, 60, 1 + Math.max(0, 0.25 - p.t) * 1.2);
    p.el.style.opacity = p.t > p.life * 0.7 ? ((p.life - p.t) / (p.life * 0.3)).toFixed(2) : '1';
  }
}
const fmtClock = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function updateHUD(dt) {
  const P = G.player; if (!P) return;
  $('banked').textContent = money(P.banked);
  const tm = $('timer');
  if (G.phase === 'line') { const s = Math.ceil(G.lineT); tm.textContent = `4:59:${String(60 - s).padStart(2, '0')} AM`; tm.classList.remove('urgent'); }
  else if (G.phase === 'sale') { tm.textContent = 'SALE ENDS ' + fmtClock(G.saleT); tm.classList.toggle('urgent', G.saleT < 30); }
  else if (G.phase === 'closed') { tm.textContent = 'CLOSED'; }
  const slots = cartSlots(P);
  $('slots').textContent = slots + '/' + CART_SLOTS; $('cartVal').textContent = money(cartValue(P));
  const icons = P.items.map(k => ITEMS[k].e).join('') || '&nbsp;';
  if (icons !== HUD.lastIcons) { $('cartIcons').innerHTML = icons; HUD.lastIcons = icons; }
  $('cartIcons').classList.toggle('full', slots >= CART_SLOTS);
  // shove cooldown
  const sh = $('shove'); const cd = clamp(P.lungeCd / CART.lungeCd, 0, 1); sh.classList.toggle('cool', cd > 0); $('shoveRing').style.clipPath = `inset(${(cd * 100).toFixed(0)}% 0 0 0)`;
  // guide arrow
  let gx = null, gz = null, txt = '', flash = false;
  const cheapest = Math.min(...W.pallets.filter(p => p.stock > 0).map(p => p.it.slots), 9);
  const full = P.items.length && (slots >= CART_SLOTS || CART_SLOTS - slots < cheapest);
  if (G.phase === 'sale' && P.items.length && (full || G.saleT < 30) && !P.scanning) {
    let best = null, bd = 1e9; for (const L of LANES) { const d = hyp(L.x - P.x, -7 - P.z) + (L.occ ? 8 : 0); if (d < bd) { bd = d; best = L; } }
    gx = best.x; gz = best.z0 > P.z ? -12 : -7; if (P.z > -10 && Math.abs(P.x - best.x) > 1.2) gz = -12; txt = 'CHECKOUT · LANE ' + best.num;
  } else if (G.phase === 'sale' && W.flash) { gx = W.flash.p.x; gz = W.flash.p.z; txt = '⚡ FLASH DEAL'; flash = true; }
  else if (G.phase === 'sale' && P.scanning) { txt = 'SCANNING… HOLD STILL'; }
  const gd = $('guide');
  if (txt) {
    gd.classList.remove('hidden'); gd.classList.toggle('flash', flash); $('guideText').textContent = txt;
    if (gx !== null) {
      const fx = CAM.tgt[0] - CAM.pos[0], fz = CAM.tgt[2] - CAM.pos[2], tx = gx - P.x, tz = gz - P.z;
      const a = Math.atan2(fx * tz - fz * tx, fx * tx + fz * tz);
      $('guideArrow').style.display = 'inline-block'; $('guideArrow').style.transform = `rotate(${(-a * 180 / Math.PI - 90).toFixed(0)}deg)`;
    } else $('guideArrow').style.display = 'none';
  } else gd.classList.add('hidden');
  // PA ticker
  HUD.paT -= dt;
  if (HUD.paT <= 0) {
    if (HUD.paQueue.length) { HUD.paQueue.sort((a, b) => b.prio - a.prio); const m = HUD.paQueue.shift(); $('pa').textContent = '📢 ' + m.text; $('pa').classList.add('show'); $('pa').style.borderColor = m.flash ? '#ffde2e' : '#2ef3ff'; HUD.paT = 4.2; if (HUD.paQueue.length > 3) HUD.paQueue.length = 3; }
    else $('pa').classList.remove('show');
  }
  HUD.bannerT -= dt; if (HUD.bannerT <= 0) $('banner').classList.remove('show');
}

// ---------- receipt ----------
function showReceipt() {
  hudShow(false); AU.stopAll();
  const P = G.player, rows = {};
  for (const k of P.bankedItems) { rows[k] = rows[k] || { n: 0, s: 0 }; rows[k].n++; rows[k].s += ITEMS[k].save; }
  let h = '';
  const keys = Object.keys(rows).sort((a, b) => rows[b].s - rows[a].s);
  if (!keys.length) h += `<div class="rl"><span>NO ITEMS PURCHASED</span><span>$0</span></div>`;
  for (const k of keys) h += `<div class="rl"><span>${rows[k].n}x ${ITEMS[k].n.toUpperCase()}</span><span>${money(rows[k].s)}</span></div>`;
  h += `<div class="rl tot"><span>YOU SAVED</span><span>${money(P.banked)}</span></div>`;
  if (P.items.length) h += `<div class="rl lost"><span>LEFT IN CART (VOID)</span><span>${money(cartValue(P))}</span></div>`;
  const key = 'best' + G.diff, prev = SAVE.get(key, 0);
  if (P.banked > prev) { SAVE.set(key, P.banked); G.newBest = P.banked > 0; }
  if (G.newBest) h += `<div class="rnew">★ NEW HIGH SCORE ★</div>`;
  else h += `<div class="rl"><span>BEST (${DIFF[G.diff].name.toUpperCase()})</span><span>${money(Math.max(prev, P.banked))}</span></div>`;
  h += `<div class="rsec">TODAY'S TOP SHOPPERS</div>`;
  const st = standings(); const rank = st.indexOf(P) + 1;
  st.slice(0, 5).forEach((c, i) => h += `<div class="rl"${c.isPlayer ? ' style="font-weight:900;color:#c4001a"' : ''}><span>${i + 1}. ${c.name.toUpperCase()}</span><span>${money(c.banked)}</span></div>`);
  if (rank > 5) h += `<div class="rl" style="font-weight:900;color:#c4001a"><span>${rank}. YOU</span><span>${money(P.banked)}</span></div>`;
  h += `<div class="rsec">STORE INCIDENT REPORT</div>`;
  h += `<div class="rl"><span>CARTS RAMMED</span><span>${P.stats.rams}</span></div><div class="rl"><span>LOOT STOLEN</span><span>${P.stats.stolen}</span></div>`;
  h += `<div class="rl"><span>SHOPPERS BOWLED OVER</span><span>${P.stats.bowled}</span></div><div class="rl"><span>DISPLAYS WRECKED</span><span>${P.stats.wrecked}</span></div>`;
  h += `<div class="rl"><span>ITEMS YOU SPILLED</span><span>${P.stats.spilled}</span></div>`;
  h += `<div class="rbar">||| || ||| | |||| || | ||| ||</div><div style="text-align:center;font-size:11px">RIVALS: ${DIFF[G.diff].name.toUpperCase()} &middot; RANK ${rank} OF 12<br>THANK YOU FOR SHOPPING BUYGANTIC</div>`;
  $('rbody').innerHTML = h;
  $('receipt').classList.remove('hidden');
}

// ---------- menus ----------
function segInit(id, val, cb) {
  const el = $(id); const set = v => { for (const b of el.children) b.classList.toggle('on', +b.dataset.v === +v); };
  set(val); el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; set(b.dataset.v); cb(+b.dataset.v); });
  return set;
}
const setQ1 = segInit('qualSeg', SETTINGS.q, v => setQuality(v)), setQ2 = segInit('qualSeg2', SETTINGS.q, v => setQuality(v));
function setQuality(v) { SETTINGS.q = v; SAVE.set('quality', v); setQ1(v); setQ2(v); buildStatic(v); }
segInit('diffSeg', SETTINGS.diff, v => { SETTINGS.diff = v; SAVE.set('diff', v); showBest(); });
const setS1 = segInit('sndSeg', SETTINGS.sound, v => setSound(v)), setS2 = segInit('sndSeg2', SETTINGS.sound, v => setSound(v));
function setSound(v) { SETTINGS.sound = v; SAVE.set('sound', v); setS1(v); setS2(v); AU.setOn(v); }
const setV1 = segInit('voiceSeg', SETTINGS.voice, v => setVoice(v)), setV2 = segInit('voiceSeg2', SETTINGS.voice, v => setVoice(v));
function setVoice(v) { SETTINGS.voice = v; SAVE.set('voice', v); setV1(v); setV2(v); if (!v && window.speechSynthesis) speechSynthesis.cancel(); }
function showBest() { const b = SAVE.get('best' + SETTINGS.diff, 0); $('bestMenu').textContent = b ? `High score (${DIFF[SETTINGS.diff].name}): ${money(b)} saved` : `No high score yet on ${DIFF[SETTINGS.diff].name}`; $('bestHud').textContent = money(b); }
showBest();
function play() { AU.init(); $('menu').classList.add('hidden'); $('receipt').classList.add('hidden'); paused = false; startGame(SETTINGS.diff); makeTags(); showBest(); }
$('playBtn').onclick = play; $('againBtn').onclick = play;
$('menuBtn').onclick = () => { $('receipt').classList.add('hidden'); toMenu(); };
let paused = false;
function togglePause(force) {
  if (G.phase !== 'line' && G.phase !== 'sale' && G.phase !== 'closed') return;
  paused = force !== undefined ? force : !paused;
  $('pause').classList.toggle('hidden', !paused);
  if (paused) { $('fpsRow').textContent = `${QUALITY[SETTINGS.q].name} · ${RSTAT.fps.toFixed(0)} fps · ${canvas.width}×${canvas.height}`; if (window.speechSynthesis) speechSynthesis.cancel(); }
  if (AU.ctx) { if (paused) AU.ctx.suspend(); else AU.ctx.resume(); }
}
$('pauseBtn').onclick = () => togglePause(true); $('resumeBtn').onclick = () => togglePause(false);
$('quitBtn').onclick = () => { togglePause(false); toMenu(); };
document.addEventListener('visibilitychange', () => { if (document.hidden && (G.phase === 'sale' || G.phase === 'line')) togglePause(true); });
function toMenu() { AU.stopAll(); hudShow(false); setupMenuScene(); $('menu').classList.remove('hidden'); showBest(); }
function setupMenuScene() {
  startGame(1, 7, true); G.phase = 'menu'; AU.stopAll(); hudShow(false); HUD.paQueue.length = 0;
  for (const t of HUD.ptags.concat(HUD.rtags)) t.el.remove(); HUD.ptags = []; HUD.rtags = [];
}

// ---------- camera ----------
// keep the camera on the player's side of tall walls: ray from cart to camera vs wall boxes
function camRay(ax, az, bx, bz) {
  let tMin = 1; const dx = bx - ax, dz = bz - az, m = 0.45;
  for (const c of COL) {
    if (!c.on || (c.kind !== 'wall' && c.kind !== 'door')) continue;
    const x0 = c.x0 - m, x1 = c.x1 + m, z0 = c.z0 - m, z1 = c.z1 + m;
    let t0 = 0, t1 = 1;
    if (Math.abs(dx) < 1e-6) { if (ax < x0 || ax > x1) continue; } else { let a = (x0 - ax) / dx, b = (x1 - ax) / dx; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); }
    if (Math.abs(dz) < 1e-6) { if (az < z0 || az > z1) continue; } else { let a = (z0 - az) / dz, b = (z1 - az) / dz; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); }
    if (t0 <= t1 && t0 < tMin) tMin = Math.max(0.12, t0);
  }
  return tMin;
}
function updateCamera(dt) {
  const P = G.player; if (!P) return;
  let px, py, pz, tx, ty, tz;
  if (G.phase === 'menu') {
    const a = G.time * 0.08 + 0.6; px = 12 + Math.sin(a) * 20; pz = 8 + Math.cos(a) * 14; py = 7; tx = 10; ty = 2.5; tz = 0;
    CAM.pos[0] = px; CAM.pos[1] = py; CAM.pos[2] = pz; CAM.tgt[0] = tx; CAM.tgt[1] = ty; CAM.tgt[2] = tz;
  } else {
    const sp = hyp(P.vx, P.vz);
    G.camH += angWrap(P.h - G.camH) * Math.min(1, dt * 3.4);
    const dist = 6.0 + sp * 0.16, ht = 3.85 + sp * 0.06;
    px = P.x - Math.sin(G.camH) * dist; pz = P.z - Math.cos(G.camH) * dist; py = ht;
    { const t = camRay(P.x, P.z, px, pz); px = P.x + (px - P.x) * t; pz = P.z + (pz - P.z) * t; }
    tx = P.x + Math.sin(G.camH) * 2.8; ty = 0.55; tz = P.z + Math.cos(G.camH) * 2.8;
    // intro swoop from a wide shot of the line
    const intro = G.phase === 'line' ? smooth(LINE_LEN, LINE_LEN - 3.2, G.lineT) : 1;
    if (intro < 1) { const wx = 16, wy = 11, wz = 18; px = lerp(wx, px, intro); py = lerp(wy, py, intro); pz = lerp(wz, pz, intro); tx = lerp(8, tx, intro); ty = lerp(1.5, ty, intro); tz = lerp(1, tz, intro); }
    const k = intro < 1 ? 1 : Math.min(1, dt * 9);
    CAM.pos[0] += (px - CAM.pos[0]) * k; CAM.pos[1] += (py - CAM.pos[1]) * k; CAM.pos[2] += (pz - CAM.pos[2]) * k;
    CAM.tgt[0] += (tx - CAM.tgt[0]) * k; CAM.tgt[1] += (ty - CAM.tgt[1]) * k; CAM.tgt[2] += (tz - CAM.tgt[2]) * k;
    if (G.shakeA > 0) { const s = G.shakeA * 0.35; CAM.pos[0] += rr(-s, s) * 0.5; CAM.pos[1] += rr(-s, s) * 0.5; CAM.tgt[0] += rr(-s, s) * 0.3; G.shakeA = Math.max(0, G.shakeA - dt * 1.8); }
  }
  SHADOW_CENTER[0] = lerp(CAM.pos[0], CAM.tgt[0], 1.6); SHADOW_CENTER[1] = 0; SHADOW_CENTER[2] = lerp(CAM.pos[2], CAM.tgt[2], 1.6);
}
function updateLights() {
  const L = [];
  for (const [x, z] of PARKING_LAMPS) L.push([x, 7.4, z, 17, 1.25, 0.72, 0.32]);
  L.push([0, 3.2, 1.6, 8 + DOOR.open * 4, 0.9 + DOOR.open * 0.5, 0.88 + DOOR.open * 0.5, 0.75 + DOOR.open * 0.4]);
  L.push([-11, 2.2, 1.6, 7, 0.55, 0.5, 0.42]); L.push([11, 2.2, 1.6, 7, 0.55, 0.5, 0.42]);
  if (W.flash) { const p = W.flash.p, pul = 0.8 + 0.2 * Math.sin(G.time * 8); L.push([p.x, 2.6, p.z, 9, 0.2 * pul * 2, 1.0 * pul * 2, 1.2 * pul * 2]); }
  L.sort((a, b) => hyp(a[0] - CAM.pos[0], a[2] - CAM.pos[2]) - a[3] - (hyp(b[0] - CAM.pos[0], b[2] - CAM.pos[2]) - b[3]));
  NPL = Math.min(12, L.length);
  for (let i = 0; i < NPL; i++) { const l = L[i]; PL.set([l[0], l[1], l[2], l[3]], i * 4); PC.set([l[4], l[5], l[6], 0], i * 4); }
}
function buildDynamic(t) {
  if (SEMI_DIRTY) { for (const p of PRIMS) SET.semi[p].clear(); TGT = SET.semi; PARENT = null; msp = 0; for (const p of W.pallets) drawPallet(p); for (const d of W.displays) drawDisplay(d); TGT = SET.dyn; }
  for (const p of PRIMS) { SET.dyn[p].clear(); SET.glass[p].clear(); }
  TGT = SET.dyn; PARENT = null; msp = 0;
  const cx = CAM.pos[0], cz = CAM.pos[2];
  for (const c of G.carts) { if (hyp(c.x - cx, c.z - cz) < 85) drawCart(c, t); }
  drawCrowd(CAM.pos);
  for (const f of W.floor) drawFloorItem(f);
  for (const d of W.debris) if (hyp(d.x - cx, d.z - cz) < 60) drawBlock(d.t, d.x, d.y, d.z, d.rx, d.ry, d.rz, d);
  for (const p of W.props) drawProp(p);
  drawRopes(); drawDoors();
  if (W.flash) { TGT = SET.glass; const p = W.flash.p; put('cyl', p.x, 4, p.z, 0, 0, 0, 1.4, 8, 1.4, [0.3, 1, 1, 1]); TGT = SET.dyn; }
  // floor ring under the player's target lane when cart is full
}

// ---------- main loop ----------
let last = performance.now(), acc = 0, fpsAcc = 0, fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { RSTAT.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  IN.update();
  if (!paused) {
    if (G.phase === 'menu') { G.time += dt; }
    else if (G.phase !== 'receipt') {
      acc += dt; const h = 1 / 120; let n = 0;
      while (acc >= h && n < 14) { stepGame(h); acc -= h; n++; }
      if (n >= 14) acc = 0;
    }
  }
  tick(dt);
}
function tick(dt) {
  updateCamera(paused ? 0 : dt);
  updateLights();
  buildDynamic(G.time);
  renderFrame(SETTINGS.q);
  if (!paused) { updateTags(dt); updateHUD(dt); }
}

// ---------- boot ----------
buildAtlas();
buildStatic(SETTINGS.q);
setupMenuScene();
buildNav();
requestAnimationFrame(frame);

// ---------- test hooks ----------
window.DB = {
  G, W, CAM, RSTAT, LANES, IN, SETTINGS,
  start(o = {}) { $('menu').classList.add('hidden'); $('receipt').classList.add('hidden'); startGame(o.diff ?? 1, o.seed ?? 1); makeTags(); },
  skipLine() { G.lineT = 0.001; },
  step(sec) { const n = Math.round(sec * 120); for (let i = 0; i < n; i++) { IN.update(); if (G.phase === 'receipt') break; stepGame(1 / 120); if (i % 12 === 11) { updateHUD(0.1); updateTags(0.1); } } updateCamera(1); tick(1 / 60); },
  render() { tick(1 / 60); },
  input(o) { IN.override = o; },
  autopilot(on = true) { G.autopilot = on; if (on && !G.player.brain) G.player.brain = makeBrain(G.diff, 99); },
  setQuality(q) { setQuality(q); },
  teleport(x, z, h = G.player.h) { const P = G.player; P.x = x; P.z = z; P.h = h; P.vx = P.vz = 0; G.camH = h; CAM.pos[0] = x - Math.sin(h) * 6; CAM.pos[2] = z - Math.cos(h) * 6; CAM.tgt[0] = x; CAM.tgt[2] = z; },
  give(kind, n = 1) { for (let i = 0; i < n; i++) G.player.items.push(kind); },
  state() {
    const P = G.player;
    return {
      phase: G.phase, lineT: +G.lineT.toFixed(2), saleT: +G.saleT.toFixed(2), x: +P.x.toFixed(2), z: +P.z.toFixed(2), speed: +hyp(P.vx, P.vz).toFixed(2), items: P.items.slice(), banked: P.banked,
      rivals: G.carts.filter(c => !c.isPlayer).map(c => ({ n: c.name, b: c.banked, items: c.items.length, st: c.brain.state, sp: +hyp(c.vx, c.vz).toFixed(2), x: +c.x.toFixed(1), z: +c.z.toFixed(1) })),
      floor: W.floor.length, debris: W.debris.length, fps: RSTAT.fps, draws: RSTAT.draws, inst: RSTAT.inst, scale: RSTAT.scale,
    };
  },
  stats() { return G.carts.map(c => ({ n: c.name, banked: c.banked, ...c.stats })); },
};
