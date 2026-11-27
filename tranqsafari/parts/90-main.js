// ===== HUD, menus, settings, main loop, test API (window.TS) =====
const $ = id => document.getElementById(id);
const hctx = $('hudc').getContext('2d');
if (IS_TOUCH) document.body.classList.add('touch');
// a standalone copy (claude.ai artifact, file:// download) has no arcade lobby to return to
if (window.claude || /claude(usercontent)?\.(ai|com)$/.test(location.hostname) || location.protocol === 'blob:') document.querySelectorAll('[data-arcade-home]').forEach(b => b.style.display = 'none');
G.autoFire = SAVE.get('autofire', false);
let ROUTE = clamp(parseInt(URLQ.get('level') ?? SAVE.get('route', 0), 10) || 0, 0, LEVELS.length - 1);   // the route picked on the title card
// canvas weave texture for the painted look
(() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const id = x.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) { const px = i % 256, py = (i / 256) | 0; const w = (Math.sin(px * 1.6) * Math.sin(py * 1.6) * 0.5 + 0.5) * 60 + Math.random() * 120; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = w; id.data[i * 4 + 3] = 255; }
  x.putImageData(id, 0, 0); $('weave').style.backgroundImage = `url(${c.toDataURL()})`; })();

const HUD = {
  shown: false, lastScore: -1,
  show(on) { $('hud').classList.toggle('hidden', !on); this.shown = on; },
  radio(m) {
    if (!m) { $('radio').classList.add('hidden'); return; }
    const s = SPEAKERS[m.who]; $('rwho').textContent = s.name; $('rrole').textContent = s.role; $('rtext').textContent = m.text; $('radio').classList.remove('hidden');
  },
  banner(t, col = '#fff') { if (TEST) { tlog('banner', t); } const b = $('banner'); b.textContent = t; b.style.color = col; b.style.opacity = 1; clearTimeout(this._bt); this._bt = setTimeout(() => b.style.opacity = 0, 1600); },
  update() {
    if (G.score !== this.lastScore) { $('score').textContent = G.score.toLocaleString('en-US'); this.lastScore = G.score; }
    $('mult').textContent = 'x' + G.mult; $('combo').classList.toggle('hot', G.mult > 1); $('combo').classList.toggle('dim', G.mult <= 1);
    const hp = JEEP.health; $('hpfill').style.width = hp + '%'; $('hpfill').classList.toggle('low', hp < 35);
    const dk = $('darts'); if (dk.childElementCount !== G.mag) { dk.innerHTML = ''; for (let i = 0; i < G.mag; i++) dk.appendChild(document.createElement('i')); }
    for (let i = 0; i < G.mag; i++) dk.children[i].classList.toggle('spent', i >= G.ammo);
    $('reloadbar').classList.toggle('on', G.reload > 0); $('reloadfill').style.width = (G.reload > 0 ? (1 - G.reload / RELOAD_T) * 100 : 0) + '%';
    const b = BOSS.a; $('bossbar').classList.toggle('hidden', !(b && G.bossShown && G.phase !== 'results'));
    if (b) { $('bossfill').style.width = Math.min(100, b.dose / b.need * 100) + '%'; if ($('bossName').textContent !== b.sp.name.toUpperCase()) $('bossName').textContent = b.sp.name.toUpperCase(); }
    $('hurt').style.opacity = Math.max(G.flash * 0.9, hp < 30 ? 0.25 + Math.sin(G.time * 5) * 0.1 : 0);
  },
  results() {
    const f = G.final; const titles = { complete: 'SAFARI COMPLETE', escaped: 'MADE IT OUT', disabled: 'JEEP DISABLED' };
    const delta = LV.id === 'delta';
    const subs = { complete: delta ? 'The Sailback is snoring in the lagoon, sail up like a little boat. Nobody is hurt.' : 'Rumblejaw is snoring in the river. Everybody is napping, nobody is hurt.',
      escaped: delta ? 'You reached the station, but the Sailback stayed awake. Try putting it to sleep!' : 'You reached the outpost, but Rumblejaw stayed awake. Try putting it to sleep!', disabled: 'Dot is radioing for a tow. The dinosaurs look smug.' };
    $('rtitle').textContent = titles[G.result] || 'SAFARI OVER'; $('rsub').textContent = subs[G.result] || '';
    const R = LV.ranks || [55000, 35000, 20000, 10000]; const rank = f.total >= R[0] ? 'S' : f.total >= R[1] ? 'A' : f.total >= R[2] ? 'B' : f.total >= R[3] ? 'C' : 'D';
    const zoo = Object.entries(G.dozed).map(([k, n]) => `${SPECIES[k].name} ${n}`).join(' &middot; ') || 'nobody dozed';
    $('rbody').innerHTML = `<div class="rank">${rank}</div><div class="zoo">Route ${LEVEL + 1}: ${LV.name} &middot; Dozed: ${zoo}</div><table>
      <tr><td>Darting score</td><td>${f.base.toLocaleString('en-US')}</td></tr>
      <tr><td>Accuracy ${f.acc}% (${G.hits}/${G.shots})</td><td>+${f.accBonus.toLocaleString('en-US')}</td></tr>
      <tr><td>Jeep health ${Math.round(JEEP.health)}%</td><td>+${f.hpBonus.toLocaleString('en-US')}</td></tr>
      <tr><td>Weak spots</td><td>${G.weak}</td></tr><tr><td>Best combo</td><td>${G.maxCombo}</td></tr><tr><td>Close calls</td><td>${G.saves}</td></tr>
      <tr class="tot"><td>TOTAL${G.newBest ? ' &middot; NEW BEST!' : ''}</td><td>${f.total.toLocaleString('en-US')}</td></tr></table>
      <div class="best">Best on this route: ${G.best.toLocaleString('en-US')} &middot; ${DIFF[G.diff].name}</div>`;
    const other = (LEVEL + 1) % LEVELS.length; $('nextBtn').textContent = (other > LEVEL ? 'NEXT ROUTE: ' : 'PLAY ROUTE 1: ') + LEVELS[other].name.toUpperCase();
    $('results').classList.remove('hidden'); HUD.show(false); HUD.radio(null);
  },
};

// ---------- overlay canvas: reticle, threat markers, popups, Zzz ----------
let hoverHit = null, hoverT = 0;
function drawHUD(dt) {
  const c = $('hudc'); const dpr = Math.min(2, window.devicePixelRatio || 1); const W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const x = hctx; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
  if (G.phase !== 'play' && G.phase !== 'over' && G.phase !== 'paused') return;
  x.scale(dpr, dpr); const w = innerWidth, h = innerHeight;
  const toS = p => { const n = projectNDC(CAM.vp, p); return { x: (n[0] * 0.5 + 0.5) * w, y: (0.5 - n[1] * 0.5) * h, front: n[2] > 0, n }; };
  // Zzz over sleepers
  x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const a of ACTORS) {
    if (!a.asleep || a.an.sleep < 0.7 || a.gone) continue; const hp = headPos(a); const d = V.dist(hp, CAM.pos); if (d > (a.sp.boss ? 130 : 70)) continue;
    const s = toS(V.add(hp, [0, a.sp.top * 0.12 + 0.2, 0])); if (!s.front) continue;
    const sz = clamp(260 / d, 9, 42) * (a.sp.boss ? 1.6 : 1);
    for (let i = 0; i < 3; i++) { const ph = fract(G.time * 0.45 + i / 3); x.globalAlpha = Math.sin(ph * Math.PI) * 0.9; x.font = `900 ${sz * (0.6 + ph * 0.6)}px Trebuchet MS, sans-serif`; x.fillStyle = '#eaf3ff'; x.strokeStyle = 'rgba(30,40,70,.7)'; x.lineWidth = 3;
      const px = s.x + Math.sin(ph * 5 + i) * sz * 0.4 + ph * sz * 0.8, py = s.y - ph * sz * 2.2; x.strokeText('Z', px, py); x.fillText('Z', px, py); }
    x.globalAlpha = 1;
  }
  // threat markers
  const t = G.time;
  for (const a of ACTORS) {
    if (!a.threat || a.asleep || a.gone || !a.skin) continue;
    const hp = (a.sp.boss || a.kind === 'club') ? headPos(a) : V.add(a.pos, [0, a.sp.top * (a.kind === 'ptero' ? 0.1 : 0.55), 0]); const s = toS(hp);
    const on = s.front && s.x > 20 && s.x < w - 20 && s.y > 20 && s.y < h - 20;
    if (on) {
      const r = clamp(900 / Math.max(2, V.dist(hp, CAM.pos)), 16, 70) * (1 + Math.sin(t * 10) * 0.06);
      x.strokeStyle = 'rgba(255,70,40,.85)'; x.lineWidth = 2.5; x.beginPath(); x.arc(s.x, s.y, r, 0, TAU); x.stroke();
      if (a.state === 'cling' && a.clingT) { const f = clamp(a.st / a.clingT, 0, 1); x.strokeStyle = '#ff3b1f'; x.lineWidth = 6; x.beginPath(); x.arc(s.x, s.y, r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - f)); x.stroke(); }
      const hint = a.kind === 'boss' && a.state === 'windup' ? 'THROAT!' : a.kind === 'sail' && (a.state === 'rise' || a.state === 'lunge') ? 'MOUTH!' : a.kind === 'club' && a.state === 'windup' ? 'HEAD!' : '';
      if (hint) { x.fillStyle = '#ffd34d'; x.font = '900 16px Trebuchet MS'; x.fillText(hint, s.x, s.y + r + 16); }
    } else {
      let dx = s.n[0], dy = -s.n[1]; if (!s.front) { dx = -dx; dy = -dy; if (Math.abs(dx) < 0.05) dx = 0.05; }
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const k = Math.min((w / 2 - 34) / Math.abs(dx || 1e-3), (h / 2 - 34) / Math.abs(dy || 1e-3));
      const px = w / 2 + dx * k, py = h / 2 + dy * k; const ang = Math.atan2(dy, dx);
      x.save(); x.translate(px, py); x.rotate(ang); x.fillStyle = 'rgba(255,70,40,' + (0.65 + Math.sin(t * 12) * 0.3) + ')'; x.beginPath(); x.moveTo(18, 0); x.lineTo(-8, -12); x.lineTo(-3, 0); x.lineTo(-8, 12); x.closePath(); x.fill(); x.restore();
    }
  }
  // popups
  for (const p of POPUPS) {
    const a = 1 - smooth(0.8, 1.3, p.t); let sx, sy;
    if (p.screen) { sx = w / 2; sy = h * 0.32 - p.t * 30; } else { const s = toS(p.p); if (!s.front) continue; sx = s.x; sy = s.y - p.t * 45; }
    x.globalAlpha = a; x.font = `900 ${p.big ? 22 : 17}px Trebuchet MS, sans-serif`; x.lineWidth = 4; x.strokeStyle = 'rgba(0,0,0,.6)'; x.fillStyle = p.col; x.strokeText(p.text, sx, sy); x.fillText(p.text, sx, sy);
  }
  x.globalAlpha = 1;
  // reticle (turns red over an animal)
  hoverT -= dt; if (hoverT <= 0) { hoverT = 0.08; const ray = cameraRay(INPUT.rx, INPUT.ry); const hh = raycastWorld(ray, IS_TOUCH ? 0.16 : 0.06); hoverHit = hh && (hh.a || hh.target) ? hh : null; }
  const rx = (INPUT.rx * 0.5 + 0.5) * w, ry = (0.5 - INPUT.ry * 0.5) * h; const armor = !!(hoverHit && hoverHit.armor); const hot = !!hoverHit && !armor; const weak = hot && hoverHit.weak;
  const R = 15 + G.recoil * 8 + (G.reload > 0 ? 5 : 0);
  x.strokeStyle = weak ? '#ffd34d' : hot ? '#ff5a3c' : armor ? '#9fb0bd' : 'rgba(255,255,255,.92)'; x.lineWidth = 2.2; x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 4;
  x.beginPath(); x.arc(rx, ry, R, 0, TAU); x.stroke();
  for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2; x.beginPath(); x.moveTo(rx + Math.cos(an) * (R - 6), ry + Math.sin(an) * (R - 6)); x.lineTo(rx + Math.cos(an) * (R + 7), ry + Math.sin(an) * (R + 7)); x.stroke(); }
  x.fillStyle = x.strokeStyle; x.beginPath(); x.arc(rx, ry, 2, 0, TAU); x.fill(); x.shadowBlur = 0;
  if (G.reload > 0) { x.strokeStyle = '#ffd34d'; x.lineWidth = 3; x.beginPath(); x.arc(rx, ry, R + 10, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - G.reload / RELOAD_T)); x.stroke(); }
  else if (G.ammo === 0) { x.fillStyle = '#ffd34d'; x.font = '900 14px Trebuchet MS'; x.fillText('RELOAD', rx, ry + R + 20); }
}

// ---------- settings ----------
function syncSettings() {
  const vals = { route: ROUTE, diff: G.diff, quality: QI, sound: AUD.on ? 1 : 0, music: AUD.music ? 1 : 0, voice: AUD.voice ? 1 : 0, sens: INPUT.sens, autofire: G.autoFire ? 1 : 0 };
  document.querySelectorAll('.seg[data-set]').forEach(seg => { const k = seg.dataset.set; seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', parseFloat(b.dataset.v) === vals[k])); });
  const b0 = SAVE.get('best', 0), b1 = SAVE.get('best1', 0);
  $('bestMenu').textContent = (b0 || b1) ? `Best: Valley Run ${b0.toLocaleString('en-US')} · Dusk Delta ${b1.toLocaleString('en-US')}` : '';
  $('routeTag').textContent = LEVELS[ROUTE].tag;
}
// build another route's world behind the loading card (about a second)
let routeBusy = false;
async function loadRoute(i) {
  if (WORLD.level === i || routeBusy) return; routeBusy = true;
  $('loadmsg').textContent = 'Driving out to ' + LEVELS[i].name + '...'; $('loadfill').style.width = '55%'; $('loading').classList.remove('hidden');
  await new Promise(r => setTimeout(r, 40));
  try { buildWorld(i); } finally { routeBusy = false; $('loading').classList.add('hidden'); }
}
async function pickRoute(i) { ROUTE = clamp(i | 0, 0, LEVELS.length - 1); SAVE.set('route', ROUTE); syncSettings(); if (WORLD.level !== ROUTE) { if (TEST) buildWorld(ROUTE); else await loadRoute(ROUTE); if (G.phase === 'menu') menuScene(); } }
function setQuality(i) { QI = clamp(i | 0, 0, 3); Q = QUALITY[QI]; SAVE.set('quality', QI); renderScale = 1; setupShadow(); lastSize = ''; }
document.querySelectorAll('.seg[data-set]').forEach(seg => seg.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const v = parseFloat(b.dataset.v); const k = seg.dataset.set; audioInit();
  if (k === 'route') { pickRoute(v); SFX.ui(); return; }
  if (k === 'diff') { G.diff = v; SAVE.set('diff', v); }
  if (k === 'quality') setQuality(v);
  if (k === 'sound') { AUD.on = !!v; SAVE.set('sound', AUD.on); audioSet(); }
  if (k === 'music') { AUD.music = !!v; SAVE.set('music', AUD.music); audioSet(); }
  if (k === 'voice') { AUD.voice = !!v; SAVE.set('voice', AUD.voice); if (!v && 'speechSynthesis' in window) speechSynthesis.cancel(); }
  if (k === 'sens') { INPUT.sens = v; SAVE.set('sens', v); }
  if (k === 'autofire') { G.autoFire = !!v; SAVE.set('autofire', G.autoFire); }
  SFX.ui(); syncSettings();
}));
async function startGame(opt = {}) {
  audioInit(); if (AUD.ctx && AUD.ctx.state === 'suspended') AUD.ctx.resume();
  if (opt.level !== undefined) { ROUTE = clamp(opt.level | 0, 0, LEVELS.length - 1); SAVE.set('route', ROUTE); }
  if (WORLD.level !== ROUTE) { if (TEST) buildWorld(ROUTE); else await loadRoute(ROUTE); }
  ['menu', 'results', 'pause'].forEach(id => $(id).classList.add('hidden'));
  CAM.override = null; LIGHT_S = null; resetGame(opt); HUD.show(true); INPUT.rx = 0; INPUT.ry = -0.05; last = performance.now();
}
function toMenu() { G.phase = 'menu'; ROUTE = WORLD.level; ['results', 'pause'].forEach(id => $(id).classList.add('hidden')); $('menu').classList.remove('hidden'); HUD.show(false); HUD.radio(null); menuScene(); syncSettings(); }
function togglePause(force) {
  if (G.phase === 'play' || G.phase === 'over') { if (force === false) return; G.prevPhase = G.phase; G.phase = 'paused'; $('pause').classList.remove('hidden'); $('fpsRow').textContent = `${Q.name} · ${Math.round(fpsAvg)} fps · render ${RT.w}×${RT.h}`; syncSettings(); if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  else if (G.phase === 'paused' && force !== true) { G.phase = G.prevPhase || 'play'; $('pause').classList.add('hidden'); last = performance.now(); }
}
$('playBtn').onclick = () => startGame();
$('againBtn').onclick = () => startGame();
$('nextBtn').onclick = () => startGame({ level: (LEVEL + 1) % LEVELS.length });
$('menuBtn').onclick = toMenu; $('quitBtn').onclick = toMenu;
$('resumeBtn').onclick = () => togglePause(); $('restartBtn').onclick = () => startGame();
$('pauseBtn').onclick = () => togglePause();

// menu backdrop: the start of the picked route, with a long-neck in the distance and something small by the road
function menuScene() {
  ACTORS.length = 0; BOSS.a = null; G.gate = null; LIGHT_S = LV.id === 'delta' ? 380 : null; Object.assign(JEEP, { s: 8, v: 0, idle: 0 }); updateJeep(0.001);
  const ls = LV.id === 'delta' ? 150 : 230, ld = LV.id === 'delta' ? -44 : -52;
  const a = spawn('longneck', { state: 'menu' }); a.pos = PATH.world(ls, ld, 0); a.pos[1] = terrainH(a.pos[0], a.pos[2]) - 0.05; a.yaw = faceYaw(PATH.at(ls).t[0], PATH.at(ls).t[2]) + 0.6; a.an.lookP = -0.5;
  const r = LV.id === 'delta' ? spawn('raptor', { sp: 'nipper', small: true, state: 'menu' }) : spawn('raptor', { state: 'menu' });
  r.pos = PATH.world(LV.id === 'delta' ? 16 : 30, LV.id === 'delta' ? 2.6 : 9, 0); r.pos[1] = terrainH(r.pos[0], r.pos[2]); r.yaw = faceYaw(-PATH.at(30).r[0], -PATH.at(30).r[2]); r.an.crouch = 0.4;
  for (const x of ACTORS) { x.wetY = -1e4; poseActor(x); }
}
function menuUpdate(dt) {
  const t = performance.now() / 1000; const sw = Math.sin(t * 0.06);
  const eye = PATH.world(2 + sw * 2, -5.2, 2.1 + sw * 0.2); eye[1] = terrainH(eye[0], eye[2]) + 2.1;
  const at = PATH.world(75, 4 + sw * 6, 0); at[1] = terrainH(at[0], at[2]) + 3.5;
  CAM.override = { eye, at, fov: 56 };
  for (const a of ACTORS) { a.an.t += dt; if (a.kind === 'longneck') { a.an.phase += dt * 0.6; a.an.spd = 0.6; a.an.lookY = Math.sin(a.an.t * 0.3) * 0.4; } else { a.an.lookY = Math.sin(a.an.t * 0.7) * 0.6; a.an.jaw = Math.max(0, Math.sin(a.an.t * 0.9) - 0.7); } poseActor(a); }
}

// ---------- loop ----------
let last = performance.now(), fpsAvg = 60, ready = false;
function step(dt) {
  pollInput(dt);
  if (G.phase === 'play' || G.phase === 'over') updateGame(dt);
  else if (G.phase === 'menu') menuUpdate(dt);
  audioUpdate(dt);
  updateCamera(dt);
}
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0.001, (t - last) / 1000)); last = t;
  fpsAvg = lerp(fpsAvg, 1 / dt, 0.05);
  step(dt);
  renderFrame(G.phase === 'menu' ? t / 1000 : G.time + 100);
  drawHUD(dt); if (HUD.shown) HUD.update();
  if (Q.adaptive && !PIN_SCALE) { if (fpsAvg < 48 && renderScale > 0.62) renderScale = Math.max(0.62, renderScale - 0.02); else if (fpsAvg > 58 && renderScale < 1) renderScale = Math.min(1, renderScale + 0.01); }
}

// ---------- boot ----------
async function boot() {
  const msg = t => { $('loadmsg').textContent = t; }, prog = f => { $('loadfill').style.width = (f * 100) + '%'; };
  const tick = () => new Promise(r => setTimeout(r, 0));
  const T0 = performance.now(); const times = {};
  try {
    msg('Mixing paint...'); prog(0.05); await tick(); buildPrograms(); times.programs = Math.round(performance.now() - T0);
    msg('Sculpting dinosaurs...'); prog(0.15); await tick(); defineSpecies();
    let i = 0; const keys = LEVELS[ROUTE].cast; times.species = {};   // the other route's cast is built when that route is first loaded
    for (const k of keys) { const sp = SPECIES[k]; msg('Sculpting dinosaurs... ' + sp.name); await tick(); Object.assign(times.species, ensureSpecies([k])); i++; prog(0.15 + 0.45 * i / keys.length); }
    msg('Growing ferns...'); prog(0.65); await tick(); const tw = performance.now(); buildWorld(ROUTE); times.world = Math.round(performance.now() - tw);
    msg('Fuelling the jeep...'); prog(0.95); await tick(); buildModels(); setupShadow();
    times.total = Math.round(performance.now() - T0); window.__bootTimes = times; tlog('boot', JSON.stringify(times), JSON.stringify(WORLD.stats));
  } catch (e) { console.error(e); msg('Something broke while loading: ' + e.message); throw e; }
  $('loading').classList.add('hidden'); ready = true;
  if (TEST) { G.phase = 'menu'; menuScene(); updateCamera(0.016); }
  else { toMenu(); requestAnimationFrame(t => { last = t; frame(t); }); }
}

// ---------- test API ----------
window.TS = {
  get ready() { return ready; },
  state() { const b = BOSS.a; return { level: LEVEL, route: LV.id, phase: G.phase, s: +JEEP.s.toFixed(1), v: +JEEP.v.toFixed(2), t: +G.time.toFixed(2), score: G.score, combo: G.combo, mult: G.mult, health: +JEEP.health.toFixed(1), ammo: G.ammo, reload: +G.reload.toFixed(2), shots: G.shots, hits: G.hits, weak: G.weak, misses: G.misses, dozed: G.dozed, actors: ACTORS.filter(a => !a.gone).length, boss: b ? { state: b.state, dose: b.dose, need: b.need, gap: b.gap && +b.gap.toFixed(1) } : null, gate: !!G.gate, result: G.result, final: G.final, quality: Q.name, rt: [RT.w, RT.h] }; },
  step(sec, fps = 60) { const n = Math.round(sec * fps); for (let i = 0; i < n; i++) { step(1 / fps); if (G.phase === 'results') break; } return this.state(); },
  render() { if (G.phase === 'menu') { menuUpdate(0); updateCamera(0); } renderFrame(G.phase === 'menu' ? 1 : G.time + 100); drawHUD(0.016); if (HUD.shown) HUD.update(); return true; },
  start(opt = {}) { if (opt.diff !== undefined) G.diff = opt.diff; startGame(opt); return this.state(); },
  menu() { toMenu(); return true; },
  level(i) { pickRoute(i); if (G.phase === 'menu') menuScene(); return LV.id; },
  light(s) { LIGHT_S = s; return true; },
  aim(x, y) { INPUT.rx = x; INPUT.ry = y; return true; },
  aimAt(id, weak = true) { const a = ACTORS.find(a => a.id === id); if (!a) return null; const caps = actorCapsules(a); const c = (weak && caps.find(c => c.weak)) || caps[0]; const p = botPoint(a) || V.lerp(c.a, c.b, 0.5); for (let k = 0; k < 6; k++) { const n = projectNDC(CAM.vp, p); if (n[2] > 0) { INPUT.rx = n[0]; INPUT.ry = n[1]; } else { INPUT.rx = -Math.sign(n[0]); } clampAim(); updateCamera(0.5); } return projectNDC(CAM.vp, p); },
  fire() { G.cool = 0; fireDart(); return G.ammo; }, reload() { startReload(); return true; },
  actors() { return ACTORS.filter(a => !a.gone).map(a => ({ id: a.id, kind: a.kind, sp: a.sp.id, state: a.state, dose: a.dose, need: a.need, asleep: a.asleep, threat: a.threat, pos: a.pos.map(v => +v.toFixed(1)), dist: +V.dist(a.pos, CAM.pos).toFixed(1) })); },
  autopilot(on = true, err = 0.02, greedy = false, lag = 0) { G.auto = on; G.botErr = err; G.botGreedy = greedy; G.botLag = lag; return true; },
  setQuality(i) { setQuality(i); return Q.name; },
  cam(eye, at, fov) { if (G.phase === 'menu') G.phase = 'studio'; CAM.override = eye ? { eye, at, fov } : null; updateCamera(0); return true; },
  hud(on) { $('hud').style.visibility = on ? '' : 'hidden'; $('hudc').style.visibility = on ? '' : 'hidden'; $('weave').style.visibility = on ? '' : 'hidden'; return true; },
  studio(spId, pose = {}, view = {}) {
    G.phase = 'studio'; ACTORS.length = 0; BOSS.a = null; ensureSpecies([spId]); const sp = SPECIES[spId]; const s = view.s ?? 70; const p = PATH.world(s, view.d ?? 16, 0); p[1] = terrainH(p[0], p[2]) + (sp.kind === 'ptero' ? (pose.air ?? 1.6) : 0);
    const kind = { boss: 'boss', longneck: 'longneck', ptero: 'ptero', raptor: 'raptor', nipper: 'raptor', clubtail: 'club', sailback: 'sail' }[spId] || 'herd';
    const a = spawn(kind, { sp: spId, state: 'studio', small: spId === 'nipper' }); a.wetY = -1e4; a.pos = p; a.yaw = view.yaw ?? 0; Object.assign(a.an, pose); if (pose.asleep) a.asleep = true; poseActor(a);
    const R = Math.max(sp.len, sp.top) * (view.zoom || 1.15); const ang = view.ang ?? 0.6; const c = [p[0], p[1] + sp.top * 0.45, p[2]];
    CAM.override = { eye: [c[0] + Math.cos(ang) * R, c[1] + R * (view.el ?? 0.25), c[2] - Math.sin(ang) * R], at: c, fov: 40 }; updateCamera(0); return a.id;
  },
  spawn(kind, opt) { const a = spawn(kind, opt); return a.id; },
  skipTo(s) { JEEP.s = s; JEEP.v = keyLerp(SPEEDS, s); JEEP.idle = 0; G.gate = null; while (G.evI < G.events.length && G.events[G.evI].s < s - 2) G.evI++; updateJeep(0.001); return this.state(); },
  log() { return LOG.slice(); }, clearLog() { LOG.length = 0; },
  perf() { return { boot: window.__bootTimes, world: WORLD.stats, splats: WORLD.stats.splats, fps: fpsAvg }; },
  _eval(src) { return eval(src); },
};
boot();
