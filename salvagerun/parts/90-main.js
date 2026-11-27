// ---------- HUD, menus, settings, results, main loop, test API ----------
const hud2d = $('hud2d'), H2 = hud2d.getContext('2d');
const HUD = { last: 0, shown: true };
function sizeHud() { const d = Math.min(devicePixelRatio || 1, 2); hud2d.width = Math.round(VIEW.cssW * d); hud2d.height = Math.round(VIEW.cssH * d); hud2d.style.width = VIEW.cssW + 'px'; hud2d.style.height = VIEW.cssH + 'px'; HUD.d = d; }
function bracket(x, y, r, col, lw, rot = 0, len = 0.45) {
  H2.save(); H2.translate(x, y); H2.rotate(rot); H2.strokeStyle = col; H2.lineWidth = lw; H2.beginPath();
  for (let k = 0; k < 4; k++) { H2.rotate(Math.PI / 2); H2.moveTo(r, -r * len); H2.lineTo(r, -r); H2.lineTo(r * len, -r); }
  H2.stroke(); H2.restore();
}
function drawHUD() {
  const d = HUD.d || 1; H2.setTransform(d, 0, 0, d, 0, 0); H2.clearRect(0, 0, VIEW.cssW, VIEW.cssH);
  const playing = G.phase === 'play' && HUD.shown;
  updateDomHud();
  if (!playing) return;
  // danger brackets on things heading into the lane
  for (const e of ENTS) {
    if (e.hidden || !isDanger(e)) continue;
    const s = project(e.W); if (!s) continue;
    const r = Math.max(12, e.r * s.k * 1.15);
    bracket(s.x, s.y, r, 'rgba(255,70,50,0.85)', 2, Math.PI / 4 * 0, 0.4);
  }
  // lock brackets
  const counts = new Map(); for (const e of LOCK.list) counts.set(e, (counts.get(e) || 0) + 1);
  for (const m of MISSILES) if (m.tgt && m.tgt.alive && !counts.has(m.tgt)) counts.set(m.tgt, -1);
  for (const [e, n] of counts) {
    if (!e.alive) continue; const s = project(e.W); if (!s) continue;
    const r = Math.max(14, e.r * s.k * 1.25);
    bracket(s.x, s.y, r, n > 0 ? '#ffd23a' : 'rgba(255,210,58,0.45)', 2.5, G.t * 2.5, 0.5);
    if (n > 1) { H2.fillStyle = '#ffd23a'; H2.font = 'bold 13px system-ui,sans-serif'; H2.fillText('×' + n, s.x + r + 4, s.y - r + 4); }
  }
  // boss weak points
  if (BOSS.active) for (const e of ENTS) { if (!e.K.boss || !e.alive || e.untarget || e.hidden || counts.has(e)) continue; const s = project(e.W); if (!s) continue; const r = Math.max(10, e.r * s.k * 1.2); H2.strokeStyle = 'rgba(255,140,200,0.5)'; H2.lineWidth = 1.5; H2.beginPath(); H2.arc(s.x, s.y, r, 0, TAU); H2.stroke(); }
  // popups
  H2.textAlign = 'center';
  for (const p of G.popups) {
    const s = project(p.p); if (!s) continue; const a = 1 - p.t / (p.big ? 1.6 : 1);
    H2.globalAlpha = clamp(a * 1.5, 0, 1); H2.fillStyle = p.col; H2.font = (p.big ? 'bold 20px' : 'bold 14px') + ' system-ui,sans-serif';
    H2.shadowColor = 'rgba(0,0,0,0.7)'; H2.shadowBlur = 4; H2.fillText(p.text, s.x, s.y - 18 - p.t * 40);
  }
  H2.globalAlpha = 1; H2.shadowBlur = 0; H2.textAlign = 'left';
  // where the Gulper is about to come up
  if (BOSS.active && BOSS.warnP) {
    const s = project(BOSS.warnP);
    if (s) { const r = Math.max(26, 30 * s.k) * (1 + 0.15 * Math.sin(G.t * 14)); H2.strokeStyle = 'rgba(255,60,40,0.9)'; H2.lineWidth = 3; H2.setLineDash([10, 7]); H2.beginPath(); H2.arc(s.x, s.y, r, G.t * 2, G.t * 2 + TAU); H2.stroke(); H2.setLineDash([]); H2.fillStyle = '#ff5a3a'; H2.font = 'bold 15px system-ui,sans-serif'; H2.textAlign = 'center'; H2.fillText('INCOMING', s.x, s.y - r - 8); H2.textAlign = 'left'; }
  }
  // reticle
  if (!TUG.dead) {
    const x = AIM.x, y = AIM.y, over = !!TUG.aimTgt;
    if (LOCK.on) {
      H2.strokeStyle = '#ffd23a'; H2.lineWidth = 2; H2.setLineDash([6, 5]); H2.beginPath(); H2.arc(x, y, (IN.touch ? 44 : 30), G.t * 3, G.t * 3 + TAU); H2.stroke(); H2.setLineDash([]);
      for (let i = 0; i < MAX_LOCKS; i++) { const a = -Math.PI / 2 + i / MAX_LOCKS * TAU, rr2 = IN.touch ? 52 : 38; H2.fillStyle = i < LOCK.list.length ? '#ffd23a' : 'rgba(255,255,255,0.25)'; H2.beginPath(); H2.arc(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2, 3.2, 0, TAU); H2.fill(); }
    } else {
      const c = over ? '#ff7a3a' : 'rgba(180,240,255,0.9)';
      H2.strokeStyle = c; H2.lineWidth = 2; H2.beginPath(); H2.arc(x, y, 13, 0, TAU); H2.stroke();
      H2.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { H2.moveTo(x + dx * 17, y + dy * 17); H2.lineTo(x + dx * 25, y + dy * 25); } H2.stroke();
      H2.fillStyle = c; H2.beginPath(); H2.arc(x, y, 2, 0, TAU); H2.fill();
      if (LOCK.cool > 0) { H2.strokeStyle = 'rgba(255,210,58,0.5)'; H2.beginPath(); H2.arc(x, y, 19, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - LOCK.cool / 0.35)); H2.stroke(); }
      if (WEAP.mode === 'beam' && WEAP.heat > 0.02) { H2.strokeStyle = WEAP.over ? 'rgba(255,60,40,0.95)' : 'rgba(127,230,255,0.75)'; H2.lineWidth = 3; H2.beginPath(); H2.arc(x, y, 31, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * WEAP.heat); H2.stroke(); }
      else if (WEAP.mode === 'scatter') { H2.strokeStyle = 'rgba(255,200,120,0.35)'; H2.lineWidth = 1.5; H2.beginPath(); H2.arc(x, y, 40, 0, TAU); H2.stroke(); }
    }
  }
}
// DOM HUD (throttled text updates)
const DOMC = {};
function setText(id, v) { if (DOMC[id] !== v) { DOMC[id] = v; $(id).textContent = v; } }
function setStyle(id, k, v) { const key = id + k; if (DOMC[key] !== v) { DOMC[key] = v; $(id).style[k] = v; } }
function setClass(id, c, on) { const key = id + '.' + c; if (DOMC[key] !== on) { DOMC[key] = on; $(id).classList.toggle(c, on); } }
function updateDomHud() {
  const playing = G.phase === 'play';
  setClass('hud', 'hidden', !playing || !HUD.shown);
  if (DOMC.bodyPlaying !== (playing && !G.paused)) { DOMC.bodyPlaying = playing && !G.paused; document.body.classList.toggle('playing', DOMC.bodyPlaying); }
  setClass('touch', 'hidden', !(playing && IN.touch && HUD.shown));
  if (!playing) return;
  setText('score', fmt(G.score));
  setText('mult', '×' + G.mult); setStyle('comboFill', 'width', (G.comboT > 0 ? clamp(G.comboT / 2.6, 0, 1) * 100 : 0).toFixed(0) + '%');
  setClass('combo', 'hot', G.mult >= 4);
  const hp = TUG.hull / (TUG.hullMax || 100);
  setText('hullPct', Math.ceil(hp * 100) + '%'); setStyle('hullFill', 'width', (hp * 100).toFixed(1) + '%'); setClass('hullBox', 'low', hp < 0.3);
  setClass('shieldTag', 'hidden', !STATS.shield); if (STATS.shield) { setClass('shieldTag', 'on', !!TUG.shieldUp); setText('shieldTag', TUG.shieldUp ? 'SHIELD' : 'SHIELD ' + Math.ceil(Math.max(0, TUG.shieldT)) + 's'); }
  const z = ZONES[zoneAt(TUG.s)]; setText('zoneName', z.name);
  setStyle('routeTug', 'left', (clamp(TUG.s / S_STOP, 0, 1) * 100).toFixed(1) + '%');
  // radio
  const rc = G.radioCur; setClass('radio', 'hidden', !rc);
  if (rc) setText('radioText', rc.slice(0, Math.floor(G.radioT * 48)));
  // boss bar
  const bon = BOSS.active && BOSS.phase >= 1 && BOSS.phase < 99; setClass('bossBar', 'hidden', !bon);
  if (bon) {
    setText('bossName', BOSS.name || 'BOSS'); setText('bossPhase', BOSS.phaseName || '');
    setStyle('bossFill', 'width', (bossHP() / BOSS.hpMax * 100).toFixed(1) + '%');
    setClass('pullBox', 'hidden', !BOSS.pullOn); if (BOSS.pullOn) { setText('pullLabel', BOSS.pullLabel || 'PULLING US IN'); setStyle('pullFill', 'width', (BOSS.pull * 100).toFixed(0) + '%'); }
  }
  // gun
  const own = unlockedModes(), M = MODES.find(m => m.id === WEAP.mode);
  setText('weapName', M ? M.name : ''); setText('weapKey', own.length > 1 ? (IN.touch ? '· MODE' : '· Q / WHEEL') : '');
  const pk = MODE_ORDER.map(m => (m === WEAP.mode ? 'c' : CAMP.modes[m] ? 'o' : '-')).join('');
  if (DOMC.pips !== pk) { DOMC.pips = pk; $('weapPips').innerHTML = own.length > 1 ? MODE_ORDER.map(m => '<i class="' + (m === WEAP.mode ? 'cur' : CAMP.modes[m] ? 'own' : '') + '"></i>').join('') : ''; }
  const heatOn = WEAP.mode === 'beam'; setClass('heatBox', 'hidden', !heatOn);
  if (heatOn) { setStyle('heatFill', 'width', (WEAP.heat * 100).toFixed(0) + '%'); setClass('heatBox', 'over', !!WEAP.over); }
  setClass('tMode', 'hidden', own.length < 2);
  // hint
  const base = IN.touch ? 'Drag anywhere to aim · hold FIRE · hold LOCK and sweep over targets, let go to launch' : (SET.lockMode === 'right' ? 'Mouse aims · left click fires · hold RIGHT button and sweep over targets, release to launch' : 'Mouse aims · click fires · HOLD left button and sweep over targets, release to launch') + ' · Esc pauses';
  const modeHint = IN.touch ? 'MODE switches between the fire modes you own' : 'Q, E, 1-4, the mouse wheel or middle click switch fire mode';
  const hint = G.runT < 12 && (LV_N === 1 || G.runT < 6) ? base : (G.runT < 20 && G.runT > 7 && own.length > 1 ? modeHint : '');
  setText('hint', hint); setClass('hint', 'hidden', !hint);
  setClass('tAuto', 'on', !!SET.auto);
}
// route bar: one segment per zone of the current level
function buildRouteBar() {
  const R = $('route'); R.querySelectorAll('span').forEach(x => x.remove());
  for (const z of ZONES) { const w = Math.max(0, Math.min(z.s1, S_STOP) - z.s0); if (w <= 0) continue; const sp = document.createElement('span'); sp.style.flex = String(w); R.insertBefore(sp, $('routeTug')); }
}
// ---- settings UI ----
const SETTING_ROWS = [
  ['quality', 'QUALITY', [[0, 'LOW'], [1, 'MEDIUM'], [2, 'HIGH'], [3, 'MAX']]],
  ['sound', 'SOUND', [[true, 'ON'], [false, 'OFF']]],
  ['music', 'MUSIC', [[true, 'ON'], [false, 'OFF']]],
  ['voice', 'PILOT VOICE', [[true, 'ON'], [false, 'OFF']]],
  ['lockMode', 'LOCK-ON', [['right', 'RIGHT BUTTON'], ['hold', 'HOLD LEFT']]],
  ['auto', 'AUTO-FIRE', [[true, 'ON'], [false, 'OFF']]],
  ['sens', 'DRAG SPEED', [[0.7, 'SLOW'], [1, 'NORMAL'], [1.4, 'FAST']]]
];
function buildSettingsUI() {
  for (const id of ['setMenu', 'setPause']) {
    const root = $(id); root.innerHTML = '';
    for (const [key, label, opts] of SETTING_ROWS) {
      const row = document.createElement('div'); row.className = 'srow'; row.dataset.key = key;
      row.innerHTML = '<span class="slab">' + label + '</span><span class="seg"></span>';
      const seg = row.querySelector('.seg');
      for (const [v, t] of opts) { const b = document.createElement('button'); b.textContent = t; b.dataset.v = JSON.stringify(v); b.addEventListener('click', () => setSetting(key, v)); seg.appendChild(b); }
      root.appendChild(row);
    }
  }
  updateSettingsUI();
}
function curSetting(k) { return k === 'quality' ? QI : SET[k]; }
function updateSettingsUI() {
  document.querySelectorAll('.srow').forEach(row => {
    const k = row.dataset.key; row.querySelectorAll('button').forEach(b => b.classList.toggle('on', JSON.stringify(curSetting(k)) === b.dataset.v));
    if (k === 'sens') row.classList.toggle('hidden', !IN.touch); if (k === 'lockMode') row.classList.toggle('hidden', IN.touch && !matchMedia('(pointer: fine)').matches);
  });
  const qn = QL.name + (RT.samples ? ' · MSAA ' + RT.samples + 'x' : '') + (SHADOW.size ? ' · shadows ' + SHADOW.size : '') + (HDR ? ' · HDR' : '') + ' · render ' + RT.w + 'x' + RT.h + (HUD.fps ? ' · ' + HUD.fps + ' fps' : '');
  document.querySelectorAll('.qnote').forEach(el => { el.textContent = qn; });
}
function setSetting(k, v) {
  if (k === 'quality') { setQuality(v); return; }
  SET[k] = v; SAVE.set(k, v); AU.apply(); if (k === 'voice' && !v && window.speechSynthesis) speechSynthesis.cancel(); updateSettingsUI();
}
function setQuality(q) {
  q = clamp(q | 0, 0, 3); if (q === QI && NEB.tex) return;
  QI = q; QL = QUALITY[QI]; SAVE.set('quality', QI); VIEW.adapt = 1;
  buildShadow(); resize(true); initParticles(QL.parts); buildMotes();
  if (NEB.size !== QL.neb) bakeNebula(QL.neb);
  const saved = RNG_S; buildScenery(); RNG_S = saved;
  sizeHud(); updateSettingsUI();
}
// ---- screens ----
const SCREENS = ['menu', 'pause', 'results', 'how', 'levels', 'hangar'];
function show(id, on) { $(id).classList.toggle('hidden', !on); }
function hideScreens() { for (const id of SCREENS) show(id, false); }
const HANGAR = { target: 1 };
// make level n current (route, zones, sky, scenery); rebuilding takes a moment, so show the loading card
function levelReady(n, cb) {
  n = clamp(n | 0, 1, LEVELS.length);
  if (LV && LV_N === n) { cb(); return; }
  if (TEST) { buildLevel(n); cb(); return; }
  $('loadText').textContent = 'Plotting the route to ' + LEVELS[n - 1].name.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()) + '…'; show('loading', true);
  setTimeout(() => { try { buildLevel(n); } catch (e) { console.error(e); } show('loading', false); cb(); }, 40);
}
function startRun(level, seed) { levelReady(level ?? LV_N, () => beginRun(seed)); }
function beginRun(seed) {
  seed = seed ?? ((Date.now() / 1000) | 0) % 100000;
  if (!TEST) seed = 1; // the route and the waves are the same every run
  if (CAMP.modes[CAMP.mode]) WEAP.mode = CAMP.mode;
  G.phase = 'play'; resetRun(seed); G.paused = false;
  hideScreens(); buildRouteBar(); DOMC.pips = null;
  MUSIC.setMode('cruise'); AIM.x = VIEW.cssW / 2; AIM.y = VIEW.cssH * 0.42;
  if (IN.touch) $('touch').classList.remove('hidden');
}
function toMenu() {
  G.phase = 'menu'; G.paused = false; resetRun(3); TUG.s = 300; G.phase = 'menu'; SFX.beam(false);
  hideScreens(); show('menu', true); updateMenu();
  MUSIC.setMode('menu'); updateSettingsUI();
}
function updateMenu() {
  const n = CAMP.lvl, total = campaignTotal();
  $('startBtn').textContent = CAMP.done ? 'REPLAY · LEVEL ' + LV_N : n > 1 ? 'CONTINUE · LEVEL ' + n : 'START RUN';
  $('hangarBtn').textContent = 'HANGAR · ' + fmt(CAMP.wallet) + ' cr';
  $('best').textContent = (CAMP.done ? 'CAMPAIGN COMPLETE' : 'LEVEL ' + n + ' OF ' + LEVELS.length) + (total ? ' · CAMPAIGN BEST ' + fmt(total) + ' cr' : '');
}
function pause(on) {
  if (G.phase !== 'play') return; G.paused = on; show('pause', on);
  if (on) { IN.mouseFire = IN.keyFire = IN.touchFire = false; if (LOCK.on) lockRelease(); SFX.beam(false); updateSettingsUI(); }
}
function togglePause() { if (G.phase === 'play') pause(!G.paused); }
function rankFor(lv, sc) { const r = lv.ranks; return sc >= r[0] ? 'S' : sc >= r[1] ? 'A' : sc >= r[2] ? 'B' : sc >= r[3] ? 'C' : 'D'; }
const capFirst = t => t.charAt(0).toUpperCase() + t.slice(1);
// ---- level select ----
let RESET_ARM = false;
function showLevels() {
  const L = $('lvList'); L.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const n = i + 1, open = n <= CAMP.lvl, best = CAMP.best[n], b = document.createElement('button');
    b.className = 'lvcard' + (open ? '' : ' locked') + (n === CAMP.lvl && !CAMP.done ? ' next' : '');
    b.innerHTML = '<span class="num">' + n + '</span><span class="nm">' + lv.name + '</span><span class="bs">' + (best ? 'BEST ' + fmt(best) + ' · ' + rankFor(lv, best) : open ? 'NOT CLEARED' : 'LOCKED') + '</span><span class="bl">' + lv.blurb + '</span>';
    if (open) b.addEventListener('click', () => { AU.init(); AU.apply(); startRun(n); }); else b.disabled = true;
    L.appendChild(b);
  });
  RESET_ARM = false; $('resetBtn').textContent = 'NEW CAMPAIGN';
  hideScreens(); show('levels', true);
}
// ---- hangar ----
function showHangar(target) {
  HANGAR.target = clamp(target ?? CAMP.lvl, 1, LEVELS.length);
  hideScreens(); show('hangar', true); renderHangar();
}
function renderHangar(flash) {
  $('walletAmt').textContent = fmt(CAMP.wallet) + ' cr';
  const lv = LEVELS[HANGAR.target - 1];
  $('launchBtn').textContent = 'LAUNCH · LEVEL ' + HANGAR.target;
  $('hgNote').innerHTML = '<b>' + lv.name + '</b> · ' + lv.blurb;
  const up = $('upList'); up.innerHTML = '';
  for (const U of UPGRADES) {
    const t = CAMP.up[U.id], max = U.cost.length, c = upCost(U.id), row = document.createElement('div');
    row.className = 'uprow' + (flash === U.id ? ' flash' : '');
    row.innerHTML = '<div class="un">' + U.name + ' <span class="pips">' + Array.from({ length: max }, (_, i) => '<i class="' + (i < t ? 'on' : '') + '"></i>').join('') + '</span></div><div class="ud">' + (c === null ? 'Fitted: ' + U.desc[max - 1] : (t ? 'Next: ' : '') + U.desc[t]) + '</div>';
    const b = document.createElement('button'); b.textContent = c === null ? 'FITTED' : fmt(c) + ' cr'; b.disabled = c === null || CAMP.wallet < c;
    b.addEventListener('click', () => { if (buyUpgrade(U.id)) renderHangar(U.id); });
    row.appendChild(b); up.appendChild(row);
  }
  const ml = $('modeList'); ml.innerHTML = '';
  for (const M of MODES) {
    const own = CAMP.modes[M.id], row = document.createElement('div'); row.className = 'uprow' + (flash === M.id ? ' flash' : '');
    row.innerHTML = '<div class="un">' + M.name + '</div><div class="ud">' + M.desc + '</div>';
    const b = document.createElement('button');
    if (own) { const cur = CAMP.mode === M.id; b.textContent = cur ? 'EQUIPPED' : 'EQUIP'; b.className = cur ? 'equip' : 'owned'; b.addEventListener('click', () => { CAMP.mode = WEAP.mode = M.id; saveCamp(); SFX.mode(); renderHangar(); }); }
    else { b.textContent = fmt(M.cost) + ' cr'; b.disabled = CAMP.wallet < M.cost; b.addEventListener('click', () => { if (buyMode(M.id)) renderHangar(M.id); }); }
    row.appendChild(b); ml.appendChild(row);
  }
}
// ---- results ----
function showResults() {
  const r = G.result, s = r.stats, lv = LEVELS[r.level - 1];
  $('resTitle').textContent = r.win ? (r.last ? 'CAMPAIGN COMPLETE' : 'LEVEL ' + r.level + ' CLEARED') : 'TUG LOST';
  $('resRank').textContent = r.win ? r.rank : '—'; $('resRank').className = 'rank r' + r.rank;
  $('resScore').textContent = fmt(r.score) + ' cr';
  const rows = [
    ['Salvage collected', fmt(s.salvage) + ' cr'], ['Hazards cleared', s.hazards], ['Critters popped', s.critters], ['Best volley chain', s.bestChain + (s.perfect8 ? '  (' + s.perfect8 + '× full house)' : '')],
    ['Accuracy', Math.round(r.acc * 100) + '%'], ['Hull damage taken', s.dmgTaken + (s.shieldHits ? '  (shield stopped ' + s.shieldHits + ')' : '')], ['Hull bonus', r.win ? fmt(r.hullBonus) + ' cr' : '—'],
    [capFirst(lv.bossLabel), r.win ? '+' + fmt(r.bossBonus) + ' cr' : 'still out there'], ['Run time', Math.floor(r.time / 60) + ':' + String(Math.floor(r.time % 60)).padStart(2, '0')],
    [r.win ? 'Paid into the wallet' : 'Insurance paid (half)', '+' + fmt(r.paid) + ' cr'], ['Wallet', fmt(CAMP.wallet) + ' cr']
  ];
  $('resRows').innerHTML = rows.map(([a, b]) => '<div><span>' + a + '</span><b>' + b + '</b></div>').join('');
  $('resBest').textContent = r.isBest ? 'NEW BEST FOR LEVEL ' + r.level + '!' : 'Best for level ' + r.level + ': ' + fmt(r.best) + ' cr';
  const Q = r.win ? (r.last ? 'That was the Matriarch. The nest is cooked. Kid, drinks are on me. Well, on the bank.'
      : r.rank === 'S' ? 'Kid, I take back everything I said about you. Most of it.' : r.rank === 'A' ? 'Not bad. The bank might even stop calling. For a week.' : 'We made it. Next time, maybe shoot more of the money.')
    : 'Well. I saved the coffee machine. Insurance pays half. Again?';
  $('resQuip').textContent = '"' + Q + '" — Gus';
  const next = r.win && !r.last;
  show('nextBtn', next); if (next) $('nextBtn').textContent = 'HANGAR · LEVEL ' + (r.level + 1);
  $('againBtn').classList.toggle('alt', next); show('resHangarBtn', !next);
  show('results', true);
}
$('startBtn').addEventListener('click', () => { AU.init(); AU.apply(); startRun(CAMP.done ? LV_N : CAMP.lvl); });
$('hangarBtn').addEventListener('click', () => showHangar(CAMP.done ? LV_N : CAMP.lvl));
$('levelsBtn').addEventListener('click', () => showLevels());
$('levelsBack').addEventListener('click', () => toMenu());
$('resetBtn').addEventListener('click', () => { if (!RESET_ARM) { RESET_ARM = true; $('resetBtn').textContent = 'SURE? CLICK AGAIN'; return; } resetCamp(); showLevels(); });
$('launchBtn').addEventListener('click', () => { AU.init(); AU.apply(); startRun(HANGAR.target); });
$('hangarBack').addEventListener('click', () => toMenu());
$('howBtn').addEventListener('click', () => show('how', true));
$('howBack').addEventListener('click', () => show('how', false));
$('resumeBtn').addEventListener('click', () => pause(false));
$('restartBtn').addEventListener('click', () => startRun(LV_N));
$('quitBtn').addEventListener('click', () => toMenu());
$('againBtn').addEventListener('click', () => startRun(LV_N));
$('nextBtn').addEventListener('click', () => showHangar(LV_N + 1));
$('resHangarBtn').addEventListener('click', () => showHangar(LV_N));
$('menuBtn').addEventListener('click', () => toMenu());
$('pauseBtn').addEventListener('click', e => { e.stopPropagation(); togglePause(); });
// ---- autopilot (balance tests and screenshots) ----
const BOT = { on: false, st: 'aim', t: 0, seq: [], target: null, lockT: 3, acc: 1 };
function botStep(dt) {
  if (!BOT.on || G.phase !== 'play' || TUG.dead) return;
  const sp = 2400 * BOT.acc;
  const moveTo = (x, y) => { const dx = x - AIM.x, dy = y - AIM.y, d = Math.hypot(dx, dy), m = sp * dt; if (d <= m) { AIM.x = x; AIM.y = y; return true; } AIM.x += dx / d * m; AIM.y += dy / d * m; return d < 22; };
  const vis = ENTS.filter(e => hittable(e) && !e.hidden).map(e => ({ e, s: project(e.W) })).filter(o => o.s && o.s.w < 520 && o.s.x > 0 && o.s.x < VIEW.cssW && o.s.y > 0 && o.s.y < VIEW.cssH);
  BOT.lockT -= dt;
  if (BOT.st === 'lock') {
    BOT.t += dt;
    while (BOT.seq.length && !lockable(BOT.seq[0].e)) BOT.seq.shift();
    if (!BOT.seq.length || LOCK.list.length >= MAX_LOCKS || BOT.t > 1.6) { lockRelease(); BOT.st = 'aim'; BOT.lockT = (1.8 + rnd() * 1.5) / Math.max(0.3, BOT.acc); IN.override = { fire: false }; return; }
    const s = project(BOT.seq[0].e.W); if (!s) { BOT.seq.shift(); return; }
    if (moveTo(s.x, s.y) && LOCK.list.includes(BOT.seq[0].e)) BOT.seq.shift();
    return;
  }
  const cand = vis.filter(o => lockable(o.e));
  if (BOT.lockT <= 0 && cand.length >= 3) {
    cand.sort((a, b) => a.s.x - b.s.x); BOT.seq = cand.slice(0, MAX_LOCKS); BOT.st = 'lock'; BOT.t = 0; IN.override = { fire: false }; lockStart(); return;
  }
  // priority: threats closest to impact, then salvage, then anything
  let best = null, bs = -1e9;
  for (const o of vis) { const e = o.e; let sc = 0; if (isDanger(e)) sc += 900 - o.s.w; else if (e.K.dmg) sc += 200 - o.s.w; if (e.K.gems || e.K.release) sc += 150 - o.s.w * 0.3; if (e.K.boss) sc += 300; sc -= Math.hypot(o.s.x - AIM.x, o.s.y - AIM.y) * 0.15; if (sc > bs) { bs = sc; best = o; } }
  if (best) {
    // a slower bot (acc < 1) reacts late and aims with a wobble, like a person
    if (best.e !== BOT.target) { BOT.target = best.e; BOT.react = (1 - BOT.acc) * 0.6; }
    BOT.react -= dt; if (BOT.react > 0) { IN.override = { fire: false }; return; }
    const j = (1 - BOT.acc) * 26, jx = Math.sin(G.t * 7.3) * j, jy = Math.cos(G.t * 5.9) * j;
    const on = moveTo(best.s.x + jx, best.s.y + jy); IN.override = { fire: on || Math.hypot(best.s.x - AIM.x, best.s.y - AIM.y) < 40 };
  }
  else { moveTo(VIEW.cssW / 2, VIEW.cssH * 0.42); IN.override = { fire: false }; }
}
// ---- main loop ----
function simStep(dt) { updateInput(dt); botStep(dt); step(dt); }
let LAST = performance.now(), FPS_ACC = 0, FPS_N = 0, ADAPT_T = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - LAST) / 1000); LAST = now;
  if (TEST) return;
  if (resize()) sizeHud();
  if (!G.paused) { const n = Math.max(1, Math.ceil(dt / (1 / 60))); for (let i = 0; i < n; i++) simStep(dt / n); }
  renderFrame(); drawHUD();
  FPS_ACC += dt; FPS_N++;
  if (FPS_ACC > 1) { HUD.fps = Math.round(FPS_N / FPS_ACC); FPS_ACC = 0; FPS_N = 0; if (G.paused || G.phase === 'menu') updateSettingsUI(); }
  if (QL.adaptive && G.phase === 'play' && !G.paused) {
    ADAPT_T += dt; HUD.ft = HUD.ft ? lerp(HUD.ft, dt, 0.05) : dt;
    if (ADAPT_T > 2) { ADAPT_T = 0; const a = VIEW.adapt; if (HUD.ft > 1 / 45 && a > 0.62) VIEW.adapt = Math.max(0.6, a - 0.1); else if (HUD.ft < 1 / 58 && a < 1) VIEW.adapt = Math.min(1, a + 0.1); if (VIEW.adapt !== a) rebuildScene(); }
  }
}
// Gus, drawn once for the radio box
function drawGusFace() {
  const c = $('gusFace').getContext('2d'), W = 96;
  c.fillStyle = '#18261d'; c.fillRect(0, 0, W, W);
  c.fillStyle = '#2c4434'; for (let y = 0; y < W; y += 4) c.fillRect(0, y, W, 1);
  c.fillStyle = '#c99a78'; c.beginPath(); c.ellipse(48, 56, 25, 29, 0, 0, TAU); c.fill();
  c.fillStyle = '#8a8d90'; c.beginPath(); c.ellipse(48, 74, 22, 14, 0, 0, Math.PI); c.fill();
  c.fillStyle = '#9da0a3'; c.beginPath(); c.moveTo(30, 62); c.quadraticCurveTo(48, 54, 66, 62); c.quadraticCurveTo(60, 70, 48, 66); c.quadraticCurveTo(36, 70, 30, 62); c.fill();
  c.fillStyle = '#d06a1e'; c.beginPath(); c.ellipse(48, 32, 28, 13, 0, Math.PI, 0); c.fill(); c.fillRect(20, 30, 56, 6); c.fillRect(44, 30, 36, 5);
  c.fillStyle = '#f1e2c8'; c.fillRect(42, 23, 12, 6);
  c.strokeStyle = '#3a2a20'; c.lineWidth = 3; c.beginPath(); c.moveTo(33, 44); c.lineTo(44, 47); c.moveTo(63, 44); c.lineTo(52, 47); c.stroke();
  c.fillStyle = '#1b1410'; c.fillRect(36, 49, 6, 4); c.fillRect(54, 49, 6, 4);
  c.fillStyle = '#b07f60'; c.beginPath(); c.ellipse(48, 57, 5, 6, 0, 0, TAU); c.fill();
  c.strokeStyle = '#5a3a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(41, 71); c.lineTo(55, 70); c.stroke();
  c.fillStyle = '#222'; c.fillRect(70, 52, 10, 16); c.fillStyle = '#555'; c.fillRect(72, 66, 4, 10);
}
// ---- boot ----
function boot() {
  const ld = $('loadText');
  const steps = [
    ['Welding the tug', () => { initPrograms(); buildTemplates(); uploadTemplates(); initDynMesh(); }],
    ['Painting the nebula', () => { buildShadow(); resize(true); sizeHud(); bakeNebula(QL.neb); }],
    ['Scattering the junk', () => { loadCamp(); initParticles(QL.parts); buildMotes(); buildLevel(TEST ? 1 : CAMP.done ? 1 : CAMP.lvl); }],
    ['Fuelling up', () => { drawGusFace(); buildSettingsUI(); toMenu(); show('loading', false); requestAnimationFrame(frame); if (TEST) window.SR_READY = true; }]
  ];
  let i = 0;
  const next = () => { if (i >= steps.length) return; ld.textContent = steps[i][0] + '…'; setTimeout(() => { try { steps[i][1](); } catch (e) { console.error(e); ld.textContent = 'Something broke: ' + e.message; return; } i++; next(); }, TEST ? 0 : 30); };
  next();
}
addEventListener('resize', () => { if (TEST) { resize(); sizeHud(); } });
// ---- test API ----
window.SR = {
  start(o = {}) { startRun(o.level ?? LV_N, o.seed ?? 1); if (o.s) SR.skip(o.s); return SR.state(); },
  step(sec, h = 1 / 60) { const n = Math.round(sec / h); for (let i = 0; i < n; i++) simStep(h); return SR.state(); },
  render() { resize(); renderFrame(); drawHUD(); return RSTAT; },
  state() { return { phase: G.phase, level: LV_N, t: +G.t.toFixed(2), runT: +G.runT.toFixed(2), s: +TUG.s.toFixed(1), zone: ZONES[zoneAt(TUG.s)].id, score: Math.round(G.score), hull: +TUG.hull.toFixed(1), hullMax: TUG.hullMax, shield: !!TUG.shieldUp, mult: G.mult, combo: G.combo, locks: LOCK.list.length, lockOn: LOCK.on, mode: WEAP.mode, heat: +WEAP.heat.toFixed(2), ents: ENTS.filter(e => e.alive).length, missiles: MISSILES.length, bolts: BOLTS.length, picks: PICKS.length, parts: PT.n, boss: BOSS.active ? { type: BOSS.type, name: BOSS.name, phase: BOSS.phase, phaseName: BOSS.phaseName, hp: +bossHP().toFixed(1), hpMax: BOSS.hpMax, pull: +BOSS.pull.toFixed(2), parts: BOSS.parts.filter(e => e.alive).length } : null, quality: QL.name, msaa: RT.samples, rt: [RT.w, RT.h], dead: TUG.dead, radio: G.radioCur, wallet: CAMP.wallet }; },
  stats() { return Object.assign({}, G.stats, { score: Math.round(G.score), result: G.result }); },
  setAim(nx, ny) { AIM.x = nx * VIEW.cssW; AIM.y = ny * VIEW.cssH; },
  aimAt(id) { const e = typeof id === 'object' ? id : ENTS.find(x => x.id === id); if (!e) return false; const s = project(e.W); if (!s) return false; AIM.x = s.x; AIM.y = s.y; return true; },
  fire(on) { IN.override = { fire: !!on }; },
  lock(on) { if (on) lockStart(); else lockRelease(); return LOCK.list.length; },
  targets() { return ENTS.filter(e => hittable(e) && !e.hidden).map(e => { const s = project(e.W); return { id: e.id, kind: e.kind, hp: e.hp, d: +vdist(e.W, TUG.W).toFixed(1), sx: s ? Math.round(s.x) : null, sy: s ? Math.round(s.y) : null }; }); },
  spawn(kind, x = 0, y = 0, dz = 120, opt = {}) { return spawnAt(kind, x, y, dz, opt).id; },
  skip(s) { const EV = LV.events(); TUG.s = s; G.evI = EV.findIndex(e => e[0] >= s); if (G.evI < 0) G.evI = EV.length; G.ambS = s + 30; ENTS = []; G.t += 0.0001; updateTug(0); updateCamera(0); return SR.state(); },
  boss() { return SR.skip(S_STOP - 1); },
  god(on) { G.god = !!on; },
  autopilot(on, acc = 1) { BOT.on = !!on; BOT.acc = acc; if (!on) IN.override = null; },
  setQuality(q) { setQuality(q); return QL.name; },
  hud(on) { HUD.shown = !!on; },
  menu() { toMenu(); },
  pause(on) { pause(!!on); },
  input(o) { IN.override = o; },
  // campaign
  level(n) { buildLevel(n); if (G.phase === 'menu') toMenu(); return { level: LV_N, name: LV.name, route: Math.round(ROUTE.len), stop: S_STOP, static: STATIC.total, gas: GAS.S.n, meshes: LVMESH.list.length }; },
  camp() { return JSON.parse(JSON.stringify({ CAMP, STATS })); },
  wallet(n) { if (n !== undefined) { CAMP.wallet = n; saveCamp(); } return CAMP.wallet; },
  unlock(n) { CAMP.lvl = clamp(n, 1, LEVELS.length); saveCamp(); return CAMP.lvl; },
  buy(id) { return MODES.some(m => m.id === id) ? buyMode(id) : buyUpgrade(id); },
  grant(o = {}) { for (const k in o) { if (k in CAMP.up) CAMP.up[k] = o[k]; else if (k in CAMP.modes) CAMP.modes[k] = !!o[k]; } if (o.mode && CAMP.modes[o.mode]) CAMP.mode = WEAP.mode = o.mode; applyUpgrades(); return SR.camp(); },
  mode(m) { if (m) { if (!CAMP.modes[m]) CAMP.modes[m] = true; WEAP.mode = CAMP.mode = m; } return WEAP.mode; },
  cycle(d = 1) { cycleMode(d); return WEAP.mode; },
  hangar(n) { showHangar(n); },
  levels() { showLevels(); },
  resetCamp() { resetCamp(); return SR.camp(); },
  eval(src) { return eval(src); },
  info() { return { level: LV_N, tpl: TPL_LIST.length, verts: MESH.stats.verts, tris: MESH.stats.tris, static: STATIC.total, gas: GAS.S.n, neb: NEB.count, route: ROUTE.len, hdr: HDR, samples: RT.samples, shadow: SHADOW.size, meshes: LVMESH.list.length }; }
};
boot();
