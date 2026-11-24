// ---------- HUD, screens, menus, input, main loop, boot ----------
const $ = id => document.getElementById(id);
const HUD = {
  build() {
    const f = $('facs'); f.innerHTML = '';
    HUD.facRows = GAME.facs.map(fc => { const d = document.createElement('div'); d.className = 'fac'; d.innerHTML = `<span class="fi">${fc.def.icon}</span><span class="fn">${fc.def.name}</span><div class="nb"><i style="background:${fc.def.fac}"></i></div>`; f.appendChild(d); return d; });
    const mk = $('marks'); mk.innerHTML = '';
    HUD.marks = GAME.dumps.map(d => { const e = document.createElement('div'); e.className = 'mk'; e.innerHTML = `<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" class="bg"/><circle cx="22" cy="22" r="18" class="pr" transform="rotate(-90 22 22)"/></svg><span></span>`; mk.appendChild(e); return e; });
    const den = document.createElement('div'); den.className = 'mk den'; den.innerHTML = `<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" class="bg"/><circle cx="22" cy="22" r="18" class="pr" transform="rotate(-90 22 22)"/></svg><span>🛋️</span>`; mk.appendChild(den); HUD.denMark = den;
    $('hud').classList.toggle('hidden', GAME.attract);
    HUD.lastFood = -1;
  },
  hurt() { const v = $('vig'); v.classList.remove('on'); void v.offsetWidth; v.classList.add('on'); },
  update(dt) {
    $('hud').classList.toggle('hidden', GAME.attract || GAME.mode === 'dawn' || GAME.mode === 'lost');
    if (GAME.attract) return;
    const p = GAME.player; if (!p) return;
    const left = Math.max(0, GAME.nightLen - GAME.nightT);
    $('nlab').textContent = 'NIGHT ' + GAME.night; $('ntime').textContent = Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
    $('nbar').style.width = (100 * clamp(GAME.nightT / GAME.nightLen, 0, 1)) + '%';
    GAME.facs.forEach((fc, i) => { const r = HUD.facRows[i]; r.querySelector('i').style.width = (100 * fc.nerve / fc.max) + '%'; r.classList.toggle('out', fc.broken); r.classList.toggle('boss', !!(fc.bossC)); });
    if (HUD.lastFood !== GAME.food) { $('food').textContent = GAME.food; $('foodn').textContent = (GAME.nightFood >= 0 ? '+' : '') + GAME.nightFood + ' tonight'; if (HUD.lastFood >= 0 && GAME.food > HUD.lastFood) { const e = $('foodbox'); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); } HUD.lastFood = GAME.food; }
    $('grit').style.width = (100 * clamp(p.hp / p.maxHp, 0, 1)) + '%';
    $('lidb').style.width = (p.hasLid ? 100 * clamp(p.lid / p.lidMax, 0, 1) : 0) + '%';
    $('lidw').classList.toggle('off', !p.hasLid);
    const W = WEAPONS[p.weapon ? p.weapon.k : 'fists'];
    $('wico').textContent = W.icon; $('wnam').textContent = W.name; $('wuse').textContent = p.weapon ? p.weapon.uses + ' left' : '';
    if (p.atk && p.atk.phase === 'charge') { $('chg').style.width = (p.atk.charge * 100) + '%'; $('chgw').classList.remove('hidden'); } else $('chgw').classList.add('hidden');
    const cart = GAME.cart; const riding = p.state === 'cart';
    $('cartw').classList.toggle('hidden', !riding); if (riding) { $('cartb').style.width = Math.max(0, cart.hp) + '%'; $('cartb').style.background = cart.hp > 70 ? '#7ddc6f' : cart.hp > 40 ? '#ffd23f' : cart.hp > 15 ? '#ff8a2f' : '#ff3b3b'; $('cartl').textContent = cart.hp > 70 ? 'CART: ROLLING' : cart.hp > 40 ? 'CART: WOBBLY WHEEL' : cart.hp > 15 ? 'CART: WHEEL DRAGGING' : 'CART: WHEEL SNAPPED'; }
    // boss bar
    const bf = GAME.facs.find(f => f.bossC); const bb = $('boss');
    if (bf) { bb.classList.remove('hidden'); $('bossn').textContent = BOSSES[bf.boss].name; $('bossb').style.width = (100 * bf.bossC.hp / bf.bossC.maxHp) + '%'; } else bb.classList.add('hidden');
    // dumpster and den markers
    GAME.dumps.forEach((d, i) => {
      const e = HUD.marks[i]; const sp = glProject(d.x, 2.05, d.z);
      if (!sp || sp[0] < -30 || sp[0] > innerWidth + 30 || sp[1] < -30 || sp[1] > innerHeight + 30) { e.style.display = 'none'; return; }
      e.style.display = ''; e.style.transform = `translate(${sp[0] - 22}px,${sp[1] - 22}px)`;
      const own = d.owner === 'you' ? '🦝' : d.owner ? KINDS[d.owner].icon : '·';
      e.querySelector('span').textContent = d.contested ? '⚔️' : own;
      e.className = 'mk' + (d.owner === 'you' ? ' mine' : d.owner ? ' theirs' : '') + (d.contested ? ' fight' : '');
      const pr = e.querySelector('.pr'); const C = 113.1; pr.style.strokeDasharray = `${C * (d.contender ? d.prog : 0)} ${C}`;
      pr.style.stroke = d.contender === 'you' ? '#ffd23f' : d.contender ? KINDS[d.contender].fac : '#fff';
      e.style.borderColor = d.owner === 'you' ? '#ffd23f' : d.owner ? KINDS[d.owner].fac : 'rgba(255,255,255,.3)';
    });
    const dm = HUD.denMark; const ds = glProject(DEN.x + 0.6, 1.5, DEN.z);
    if (ds && ds[0] > -30 && ds[0] < innerWidth + 30) { dm.style.display = ''; dm.style.transform = `translate(${ds[0] - 22}px,${ds[1] - 22}px)`; } else dm.style.display = 'none';
    dm.classList.toggle('raid', GAME.den.raid > 0); dm.querySelector('.pr').style.strokeDasharray = `${113.1 * GAME.den.raid / DEN_MAX} 113.1`;
    $('raidw').classList.toggle('hidden', !(GAME.den.raid > 0.2));
    // hints
    const h = $('hint');
    if (GAME.introT > 0) h.textContent = '';
    else if (GAME.night === 1 && GAME.nightT < 14) h.textContent = INPUT.touchOn ? 'Left thumb moves · ATTACK · hold BLOCK to raise your lid · BLOCK + ATTACK = shield bash · ACT picks up / rummages' : 'WASD move · J or left click attack · hold K / right click / Shift to block · block + attack = bash · Space jump · E pick up / rummage · Q R turn camera';
    else if (GAME.night === 1 && GAME.nightT < 28) h.textContent = 'Stand by a dumpster with no varmints around to claim it. Claimed dumpsters make food and loot. Break every faction\'s nerve, or hold out until dawn.';
    else if (cart && cart.state !== 'broken' && cart.state !== 'ridden' && Math.hypot(cart.x - p.x, cart.z - p.z) < 1.6 && p.state === 'ok') h.textContent = (INPUT.touchOn ? 'ACT' : 'E') + ' to ride the cart';
    else if (GAME.items.some(it => Math.hypot(it.x - p.x, it.z - p.z) < 1.2) && p.weapon) h.textContent = (INPUT.touchOn ? 'ACT' : 'E') + ' to swap weapons';
    else { const d = GAME.dumps.find(d => d.owner === 'you' && Math.hypot(d.x + d.fx * 0.9 - p.x, d.z + d.fz * 0.9 - p.z) < 1.3); h.textContent = d ? (d.rumCd > 0 ? 'Rummaged out · refills in ' + Math.ceil(d.rumCd) + 's' : (INPUT.touchOn ? 'ACT' : 'E') + ' to rummage the ' + d.name) : ''; }
    // intro card
    const ic = $('intro'); if (GAME.introT > 0 && GAME.mode === 'play') { ic.classList.remove('hidden'); ic.style.opacity = Math.min(1, GAME.introT * 1.5); } else ic.classList.add('hidden');
  }
};

// ---------- screens ----------
const SCREENS = {
  showIntro() {
    const n = GAME.night; $('inum').textContent = 'NIGHT ' + n; $('ititle').textContent = GAME.plan.title;
    $('ifacs').innerHTML = GAME.facs.map(f => `<span style="border-color:${f.def.fac}">${f.def.icon} ${f.def.name}${f.boss ? ' <b>+ ' + BOSSES[f.boss].name + '</b>' : ''}</span>`).join('');
  },
  showResult(r) {
    const s = r.stats; const ln = (a, b) => `<div class="ln"><span>${a}</span><span>${b}</span></div>`;
    if (r.lost) {
      $('lostbody').innerHTML = `<div class="big">EVICTED!</div><div class="c">Night ${r.night}: they took the den.</div><hr>${ln('Varmints sent packing', s.kos)}${ln('Food lost to raiders', s.foodLost)}<hr><div class="c small">Your stash goes back to how it was at dusk. Stay near the couch when the ring turns red.</div>`;
      $('lost').classList.remove('hidden'); $('retry').textContent = 'TRY NIGHT ' + r.night + ' AGAIN';
      return;
    }
    const stars = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
    let h = `<div class="hear">HEAR YE, HEAR YE</div><div class="big">NIGHT ${r.night} IS OURS</div><div class="stars">${stars}</div>`;
    h += `<div class="c small">${r.sweep ? 'Clean sweep: every faction broke before dawn' : 'Held out until dawn'} · ${r.food >= r.target ? 'stash goal met' : 'stash goal: ' + r.target + ' food'}</div><hr>`;
    h += ln('Varmints sent packing', s.kos) + ln('Binned', s.binned) + ln('Flushed', s.flushed) + ln('Curbed', s.curbed) + ln('Slammed into walls', s.walled) + ln('Cart rams', s.cartHits) + ln('Dumpsters claimed', s.dumpsTaken) + ln('Food gathered', '+' + s.foodIn) + (s.foodLost ? ln('Food stolen', '-' + s.foodLost) : '');
    h += `<hr><div class="ln tot"><span>THE STASH</span><span>🍕 ${GAME.food}</span></div><div class="sig">— by order of the Alley Knights</div>`;
    $('procl').innerHTML = h;
    SCREENS.shop();
    $('next').textContent = 'NIGHT ' + (r.night + 1) + (nightPlan(r.night + 1).title && r.night + 1 <= 8 ? ': ' + nightPlan(r.night + 1).title.toUpperCase() : '') + ' ▶';
    $('dawn').classList.remove('hidden');
  },
  shop() {
    const g = $('shop'); g.innerHTML = '';
    for (const k in UPGRADES) {
      const U = UPGRADES[k], lv = SAVE.up[k] || 0, max = lv >= U.max, cost = max ? 0 : U.cost[lv];
      const b = document.createElement('button'); b.className = 'up' + (max ? ' max' : SAVE.food < cost ? ' poor' : '');
      b.innerHTML = `<div class="ui">${U.icon}</div><div class="ut"><b>${U.name}</b> <small>${'●'.repeat(lv)}${'○'.repeat(U.max - lv)}</small><div>${U.desc}</div></div><div class="uc">${max ? 'MAX' : '🍕 ' + cost}</div>`;
      b.onclick = () => { if (max || SAVE.food < cost) { AUD.ui(); return; } SAVE.food -= cost; SAVE.up[k] = lv + 1; GAME.food = SAVE.food; saveGame(); AUD.pickup(); SCREENS.shop(); const t = document.querySelector('#procl .tot span:last-child'); if (t) t.textContent = '🍕 ' + SAVE.food; };
      g.appendChild(b);
    }
    $('shopfood').textContent = '🍕 ' + SAVE.food;
  }
};

// ---------- menus ----------
const SEGS = {
  quality: [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['max', 'MAX']],
  sound: [[true, '🔊 Sound']], music: [[true, '🎷 Music']], shake: [[true, '📳 Shake']],
  touch: [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']], lefty: [[true, 'Left-handed']]
};
function buildMenus() {
  document.querySelectorAll('.seg').forEach(el => {
    const k = el.dataset.k; const opts = SEGS[k]; el.innerHTML = '';
    for (const [v, label] of opts) {
      const b = document.createElement('button'); b.textContent = label; const toggle = opts.length === 1;
      const refresh = () => b.classList.toggle('on', toggle ? !!SET[k] : SET[k] === v);
      b.onclick = () => { SET[k] = toggle ? !SET[k] : v; saveSettings(); document.querySelectorAll(`.seg[data-k="${k}"] button`).forEach(x => x._r()); onSetting(k); AUD.ui(); };
      b._r = refresh; refresh(); el.appendChild(b);
    }
  });
  const how = $('how'); how.classList.add('hidden');
  $('howb').onclick = () => how.classList.toggle('hidden');
  $('cont').onclick = () => playNight(SAVE.night);
  $('newg').onclick = () => { if (SAVE.night > 1 && !$('newg').dataset.sure) { $('newg').dataset.sure = 1; $('newg').textContent = 'Sure? Tap again'; return; } SAVE = { ...SAVE_DEF, up: {}, stars: {} }; saveGame(); refreshTitle(); playNight(1); };
  $('fsb').onclick = () => toggleFullscreen();
  $('resume').onclick = () => setPause(false);
  $('restart').onclick = () => { setPause(false); playNight(GAME.night); };
  $('quit').onclick = () => { setPause(false); toTitle(); };
  $('next').onclick = () => { $('dawn').classList.add('hidden'); playNight(SAVE.night); };
  $('dawnq').onclick = () => { $('dawn').classList.add('hidden'); toTitle(); };
  $('retry').onclick = () => { $('lost').classList.add('hidden'); playNight(GAME.lastResult.night); };
  $('lostq').onclick = () => { $('lost').classList.add('hidden'); toTitle(); };
  refreshTitle();
}
function refreshTitle() {
  const c = $('cont'); c.textContent = SAVE.night > 1 ? `CONTINUE · NIGHT ${SAVE.night}` : 'PLAY'; $('newg').classList.toggle('hidden', SAVE.night <= 1); $('newg').textContent = 'New game'; delete $('newg').dataset.sure;
  $('tstash').textContent = SAVE.night > 1 ? `Stash: 🍕 ${SAVE.food} · best night ${SAVE.best}` : '';
}
function onSetting(k) { if (k === 'quality') applyQuality(); if (k === 'sound' || k === 'music') AUD.apply(); if (k === 'touch' || k === 'lefty') INPUT.applyTouch(); }
function toggleFullscreen() {
  try { if (!document.fullscreenElement) { const r = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen({ navigationUI: 'hide' }); if (r && r.then) r.then(() => { try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(() => { }); } else document.exitFullscreen(); } catch (e) { }
}
function playNight(n) {
  AUD.init(); $('title').classList.add('hidden'); $('dawn').classList.add('hidden'); $('lost').classList.add('hidden');
  startNight(n, false); SCREENS.showIntro(); INPUT.applyTouch(); AUD.nightStart();
}
function toTitle() { $('title').classList.remove('hidden'); refreshTitle(); startNight(1, true); INPUT.applyTouch(); }
function setPause(on) {
  if (on && (GAME.mode === 'play')) { GAME.mode = 'paused'; $('pause').classList.remove('hidden'); AUD.duck(true); }
  else if (!on && GAME.mode === 'paused') { GAME.mode = 'play'; $('pause').classList.add('hidden'); AUD.duck(false); }
}

// ---------- input ----------
const INPUT = {
  keys: {}, touch: {}, touchOn: false, mouse: { l: false, r: false }, stick: null, sx: 0, sy: 0, camTurn: 0, camDrag: 0, last: { fwd: 0, side: 0 },
  edges: { jump: false, action: false }, prevPad: {},
  init() {
    addEventListener('keydown', e => {
      if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); return; }
      INPUT.keys[e.code] = true; AUD.init();
      if (e.code === 'Space') INPUT.edges.jump = true;
      if (e.code === 'KeyE' || e.code === 'KeyF') INPUT.edges.action = true;
      if (e.code === 'Enter' && GAME.mode === 'title' && !$('title').classList.contains('hidden')) { playNight(SAVE.night); return; }
      if (e.code === 'Escape' || e.code === 'KeyP') setPause(GAME.mode !== 'paused');
      if (e.code === 'KeyV') GAME.camMode = (GAME.camMode + 1) % 2;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => { INPUT.keys[e.code] = false; });
    addEventListener('blur', () => { INPUT.keys = {}; INPUT.touch = {}; INPUT.mouse = { l: false, r: false }; INPUT.stick = null; INPUT.sx = INPUT.sy = 0; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) setPause(true); });
    const cv = $('gl');
    cv.addEventListener('mousedown', e => { AUD.init(); if (e.button === 0) INPUT.mouse.l = true; if (e.button === 2) INPUT.mouse.r = true; });
    addEventListener('mouseup', e => { if (e.button === 0) INPUT.mouse.l = false; if (e.button === 2) INPUT.mouse.r = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    // touch buttons
    const bind = (id, k) => {
      const el = $(id);
      const on = e => { e.preventDefault(); e.stopPropagation(); INPUT.touch[k] = true; el.classList.add('on'); AUD.init(); if (k === 'jump') INPUT.edges.jump = true; if (k === 'action') INPUT.edges.action = true; if (k === 'pause') setPause(GAME.mode !== 'paused'); try { el.setPointerCapture(e.pointerId); } catch (_) { } };
      const off = () => { INPUT.touch[k] = false; el.classList.remove('on'); };
      el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
    };
    bind('tAtk', 'attack'); bind('tBlk', 'block'); bind('tJmp', 'jump'); bind('tAct', 'action'); bind('tPause', 'pause');
    // floating joystick under the left thumb: up = forward (W), down = back (S), sideways = strafe
    const zone = $('tZone'), stick = $('tStick'), knob = $('tKnob');
    const R = () => clamp(Math.min(innerWidth, innerHeight * 1.8) * 0.075, 42, 70);
    zone.addEventListener('pointerdown', e => { e.preventDefault(); AUD.init(); if (INPUT.stick) return; INPUT.stick = { id: e.pointerId, x0: e.clientX, y0: e.clientY }; try { zone.setPointerCapture(e.pointerId); } catch (_) { } stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px'; stick.classList.add('on'); knob.style.transform = 'translate(-50%,-50%)'; });
    zone.addEventListener('pointermove', e => {
      const d = INPUT.stick; if (!d || d.id !== e.pointerId) return; const r = R(); let dx = e.clientX - d.x0, dy = e.clientY - d.y0; let len = Math.hypot(dx, dy);
      if (len > r * 1.35) { const k = (len - r * 1.35) / len; d.x0 += dx * k; d.y0 += dy * k; dx -= dx * k; dy -= dy * k; len = r * 1.35; stick.style.left = d.x0 + 'px'; stick.style.top = d.y0 + 'px'; }
      const m = Math.min(1, len / r); const dz = 0.12; const mm = m < dz ? 0 : (m - dz) / (1 - dz);
      INPUT.sx = len ? dx / len * mm : 0; INPUT.sy = len ? -dy / len * mm : 0;
      const kl = Math.min(1, r / (len || 1)); knob.style.transform = `translate(calc(-50% + ${dx * kl}px),calc(-50% + ${dy * kl}px))`;
    });
    const endStick = e => { const d = INPUT.stick; if (!d || d.id !== e.pointerId) return; INPUT.stick = null; INPUT.sx = INPUT.sy = 0; stick.classList.remove('on'); };
    zone.addEventListener('pointerup', endStick); zone.addEventListener('pointercancel', endStick); zone.addEventListener('lostpointercapture', endStick);
    // drag on the right side (outside the buttons) turns the camera
    const cz = $('tCam'); let cd = null;
    cz.addEventListener('pointerdown', e => { e.preventDefault(); cd = { id: e.pointerId, x: e.clientX }; try { cz.setPointerCapture(e.pointerId); } catch (_) { } });
    cz.addEventListener('pointermove', e => { if (!cd || cd.id !== e.pointerId) return; INPUT.camDrag += -(e.clientX - cd.x) * 0.006; cd.x = e.clientX; });
    const endCam = e => { if (cd && cd.id === e.pointerId) cd = null; };
    cz.addEventListener('pointerup', endCam); cz.addEventListener('pointercancel', endCam);
    INPUT.applyTouch();
  },
  applyTouch() {
    const coarse = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
    INPUT.touchOn = SET.touch === 'on' || (SET.touch === 'auto' && coarse);
    $('touch').classList.toggle('hidden', !INPUT.touchOn || GAME.mode === 'title' || GAME.attract);
    document.body.classList.toggle('touchmode', INPUT.touchOn); document.body.classList.toggle('lefty', !!SET.lefty);
  },
  poll() {
    const k = INPUT.keys, t = INPUT.touch;
    let fwd = ((k.KeyW || k.ArrowUp) ? 1 : 0) - ((k.KeyS || k.ArrowDown) ? 1 : 0);
    let side = ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0);
    let attack = !!(k.KeyJ || INPUT.mouse.l || t.attack), block = !!(k.KeyK || k.ShiftLeft || k.ShiftRight || INPUT.mouse.r || t.block);
    let jump = INPUT.edges.jump, action = INPUT.edges.action; INPUT.edges.jump = false; INPUT.edges.action = false;
    let camTurn = ((k.KeyQ) ? 1 : 0) - ((k.KeyR) ? 1 : 0);
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue; const P = INPUT.prevPad; const btn = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.3));
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0; if (Math.hypot(ax, ay) > 0.18) { side = ax; fwd = -ay; }
      const rx = gp.axes[2] || 0; if (Math.abs(rx) > 0.2) camTurn = -rx;
      if (btn(2) || btn(7)) attack = true; if (btn(4) || btn(5) || btn(6)) block = true;
      if (btn(0) && !P[0]) jump = true; if (btn(1) && !P[1]) action = true; if (btn(3) && !P[3]) GAME.camMode = (GAME.camMode + 1) % 2;
      if (btn(9) && !P[9]) { if (GAME.mode === 'title') playNight(SAVE.night); else setPause(GAME.mode !== 'paused'); }
      for (const i of [0, 1, 3, 9]) P[i] = btn(i); AUD.init();
    }
    if (INPUT.touchOn && INPUT.stick) { fwd = INPUT.sy; side = INPUT.sx; }
    INPUT.camTurn = camTurn; INPUT.last = { fwd, side };
    // camera-relative -> world
    const cy = GAME.camYaw, fx = Math.sin(cy), fz = Math.cos(cy), rx = -Math.cos(cy), rz = Math.sin(cy);
    return { mx: fx * fwd + rx * side, mz: fz * fwd + rz * side, attack, block, jump, action };
  }
};

// ---------- main loop ----------
let lastTS = 0, fpsAcc = 0, fpsN = 0, frameAvg = 16;
function frame(ts) {
  requestAnimationFrame(frame);
  const realDt = Math.min(0.05, Math.max(0.001, (ts - (lastTS || ts)) / 1000)); lastTS = ts;
  if (!TEST || QS.has('run')) tick(realDt);
  renderFrame();
  fpsAcc += realDt; fpsN++; frameAvg = lerp(frameAvg, realDt * 1000, 0.05);
  if (fpsAcc > 0.5) { $('fps').textContent = Math.round(fpsN / fpsAcc) + ' fps · ' + SET.quality.toUpperCase(); fpsAcc = 0; fpsN = 0; }
  if (RND.adaptive && !TEST) {
    if (frameAvg > 21 && RND.scale > 0.6) { RND.scale = Math.max(0.6, RND.scale - 0.05); frameAvg = 16; resize(); }
    else if (frameAvg < 14 && RND.scale < 1) { RND.scale = Math.min(1, RND.scale + 0.05); frameAvg = 16; resize(); }
  }
}
function tick(realDt) {
  const pin = INPUT.poll();
  const p = GAME.player;
  if (p && !GAME.autopilot && GAME.mode === 'play') {
    const ki = p.input; ki.mx = pin.mx; ki.mz = pin.mz; ki.attack = pin.attack; ki.block = pin.block; if (pin.jump) ki.jump = true; if (pin.action) ki.action = true;
  }
  if (GAME.mode === 'paused' || GAME.mode === 'dawn' || GAME.mode === 'lost') { updateCamera(realDt); AUD.update(realDt); return; }
  if (GAME.slowT > 0) { GAME.slowT -= realDt; GAME.timeScale = damp(GAME.timeScale, 0.35, 12, realDt); } else GAME.timeScale = damp(GAME.timeScale, 1, 5, realDt);
  advanceSim(realDt * GAME.timeScale);
  GAME.callT = Math.max(0, GAME.callT - realDt);
  if (GAME.callT <= 0 && GAME.callQ.length) { const [m, s, pr] = GAME.callQ.shift(); showCallout(m, s, pr); }
  updateCamera(realDt);
  HUD.update(realDt);
  AUD.update(realDt);
}
function advanceSim(dt) {
  GAME.acc += dt; let n = 0;
  while (GAME.acc >= PHYS_DT && n < 10) { physicsStep(PHYS_DT); GAME.acc -= PHYS_DT; n++; }
  if (n >= 10) GAME.acc = 0;
  processEvents();
  stepEffects(dt);
}
function renderFrame() {
  resize(); updateSky(); updateLights();
  drawScene(RND.time);
  const p = GAME.player; const c = (GAME.mode === 'play' || GAME.mode === 'ending' || GAME.mode === 'paused') && p ? [p.x, 0, p.z] : [0, 0, CAM.tgt[2]];
  glSetLight([clamp(c[0], -4, 4), 0, clamp(c[2], -22, 24)], 16);
  glRender(RND.w, RND.h);
}

// ---------- boot ----------
let WORLD = null;
function boot() {
  try {
    const cv = $('gl');
    glInit(cv, TEST);
    buildMeshLibrary();
    glUploadAtlas(makeAtlas());
    WORLD = buildWorld();
    INPUT.init();
    buildMenus();
    applyQuality();
    addEventListener('resize', resize);
    startNight(1, true);
    if (QS.has('play')) playNight(+(QS.get('night') || 1));
    requestAnimationFrame(frame);
    window.__ready = true;
  } catch (e) {
    console.error(e);
    $('err').textContent = 'Error: ' + e.message;
    window.__bootError = e.message;
  }
}
