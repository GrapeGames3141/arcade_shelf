// ================= input =================
const AIM = { on: false, sx: 0, sy: 0, x: 0, y: 0, pow: 0, type: 'sheep', id: null };
const BUILD = { ghost: null, down: false };
function aimVel() {
  // pull back like a slingshot: the launch goes the opposite way to the drag
  const side = G.turn, d = ZONES[side].dir;
  let dx = AIM.sx - AIM.x, dy = AIM.sy - AIM.y;
  const L = hyp(dx, dy); AIM.pow = clamp(L / Math.min(260, V.h * 0.42), 0, 1);
  if (L < 4) { dx = d; dy = -1; }
  let ang = Math.atan2(-dy, dx * d);        // 0 = straight at the enemy, up is positive
  ang = clamp(ang, -0.15, 1.45);
  const v = AIM.pow * VMAX;
  return [Math.cos(ang) * v * d, -Math.sin(ang) * v];
}
function ghostAt(X, Y) {
  const side = G.builder, [wx, wy] = s2w(X, Y), t = G.sel;
  if (t === 'remove' || t === 'honey' || !PIECES[t]) { BUILD.ghost = null; return; }
  const P = PIECES[t], rot = t === 'plank' || t === 'slab' ? G.rot : 0, hw = rot ? P.hh : P.hw, hh = rot ? P.hw : P.hh;
  // snap to an 11 px grid, and line up with the piece under the pointer so columns stack straight
  let x = Math.round(wx / 11) * 11; const y = Math.min(Math.round(wy / 4) * 4, WORLD.ground - hh);
  const under = BODIES.find(b => b.piece && b.side === side && collide({ shape: 'circle', x: wx, y: wy + hh, r: 4 }, b));
  if (under && Math.abs(under.hw - hw) < 4 && Math.abs(under.x - wx) < under.hw + 4) x = under.x;
  const z = ZONES[side], probe = { shape: 'box', x, y, a: 0, hw: hw - 0.6, hh: hh - 0.6 };
  const hits = () => BODIES.some(b => b !== GROUND && b.side === side && collide(probe, b));
  const floor = WORLD.ground - hh;
  if (hits()) { for (let k = 0; k < 200 && hits(); k++) probe.y -= 2; }   // pointing into a stack lifts the piece onto it
  else { while (probe.y + 4 <= floor) { probe.y += 4; if (hits()) { probe.y -= 4; break; } } }   // otherwise it drops until it lands
  for (let k = 0; k < 8; k++) { probe.y += 0.5; if (hits() || probe.y > floor) { probe.y -= 0.5; break; } }
  let ok = x - hw >= z.x0 && x + hw <= z.x1 && probe.y - hh >= 120 && P.cost <= money(side) && !(t === 'bell' && bellOf(side)) && !hits();
  BUILD.ghost = { x, y: probe.y, hw, hh, piece: t, ok, rot, side };
}
function pieceAt(X, Y, side) { const [wx, wy] = s2w(X, Y), p = { shape: 'circle', x: wx, y: wy, r: 3 }; return BODIES.find(b => b.piece && b.side === side && collide(p, b)); }
function pDown(e) {
  if (!G || G.paused || $('card').offsetParent || !$('title').classList.contains('hidden')) return;
  AUD.init();
  if (G.phase === 'build' && !G.ready[G.builder] && isMine(G.builder)) {
    if (e.button === 2 || G.sel === 'remove') { removePiece(pieceAt(e.clientX, e.clientY, G.builder)); ghostAt(e.clientX, e.clientY); renderBars(); return; }
    if (G.sel === 'honey') { honey(G.builder, pieceAt(e.clientX, e.clientY, G.builder)); renderBars(); return; }
    ghostAt(e.clientX, e.clientY); const g = BUILD.ghost;
    if (g && g.ok) { placePiece(G.builder, g.piece, g.x, g.y, g.rot); if (g.piece === 'bell') { G.sel = 'hay'; renderBars(); } }
    else if (g) AUD.click();
    ghostAt(e.clientX, e.clientY); renderBars();
    return;
  }
  if (G.shot && e.button === 0) { const t = BODIES.find(b => b.kind === 'sheep' && b.st === 'trio' && !b.split && !b.touched); if (t && isMine(t.side)) splitTrio(t); return; }
  if (canAim() && e.button === 0) { AIM.on = true; AIM.id = e.pointerId; AIM.sx = AIM.x = e.clientX; AIM.sy = AIM.y = e.clientY; AIM.pow = 0; cv.setPointerCapture?.(e.pointerId); }
}
function pMove(e) {
  if (!G) return;
  if (G.phase === 'build') { ghostAt(e.clientX, e.clientY); return; }
  if (AIM.on && e.pointerId === AIM.id) { AIM.x = e.clientX; AIM.y = e.clientY; aimVel(); }
}
function pUp(e) {
  if (!AIM.on || e.pointerId !== AIM.id) return;
  AIM.on = false;
  if (!canAim()) return;
  const [vx, vy] = aimVel();
  if (AIM.pow < 0.12) { say('Pull back further', 'Drag away from the target, then let go', 1.4); return; }
  if (G.ammo[G.turn][AIM.type] <= 0) { AIM.type = SHEEP_ORDER.find(k => G.ammo[G.turn][k] > 0) || 'sheep'; }
  fire(G.turn, AIM.type, vx, vy);
}
cv.addEventListener('pointerdown', pDown); addEventListener('pointermove', pMove); addEventListener('pointerup', pUp); addEventListener('pointercancel', () => { AIM.on = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerleave', () => { BUILD.ghost = null; });
addEventListener('keydown', e => {
  if (!G || !$('title').classList.contains('hidden')) return;
  if (e.code === 'Escape') { pauseMenu($('pause').classList.contains('hidden')); return; }
  if (e.code === 'KeyN') setSound(SET.sound ? 0 : 1);
  if (e.code === 'KeyV') toggleView();
  if (G.phase === 'build') {
    if (e.code === 'KeyR') { G.rot = G.rot ? 0 : 1; renderBars(); if (MOUSE.x) ghostAt(MOUSE.x, MOUSE.y); }
    const k = /^Digit([1-7])$/.exec(e.code); if (k) { const opts = [...PIECE_ORDER, 'honey', 'remove']; G.sel = opts[+k[1] - 1] || G.sel; renderBars(); }
    if (e.code === 'Enter') readyUp(G.builder);
  } else if (G.phase === 'siege') {
    const k = /^Digit([1-5])$/.exec(e.code); if (k && canAim()) { const t = SHEEP_ORDER[+k[1] - 1]; if (G.ammo[G.turn][t] > 0) { AIM.type = t; renderBars(); } }
    if (e.code === 'Space') { e.preventDefault(); const t = BODIES.find(b => b.kind === 'sheep' && b.st === 'trio' && !b.split && !b.touched); if (t && isMine(t.side)) splitTrio(t); }
  }
});
const MOUSE = { x: 0, y: 0 }; addEventListener('pointermove', e => { MOUSE.x = e.clientX; MOUSE.y = e.clientY; });
function toggleView() { CAM.zoomOut = !CAM.zoomOut; camTo(CAM.mode, CAM.side); }
if ('ontouchstart' in window || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches)) document.body.classList.add('touch');

// ================= HUD =================
function say(a, b = '', s = 2.2) { const m = $('msg'); m.innerHTML = ''; m.append(a); if (b) { const sm = document.createElement('small'); sm.textContent = b; m.append(sm); } m.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => m.classList.remove('on'), s * 1000); }
const icoCache = {};
function pieceIcon(t) {
  if (icoCache[t]) return icoCache[t];
  const c = document.createElement('canvas'); c.width = 80; c.height = 60; const g = c.getContext('2d');
  const save = [null, CAM.x, CAM.y, CAM.z, V.w, V.h]; // draw with the real piece renderer into the icon
  const P = PIECES[t]; if (!P) return c;
  const s = Math.min(70 / (P.hw * 2), 50 / (P.hh * 2), 1.4);
  const real = ctx; ctxSwap(g); CAM.x = 0; CAM.y = 0; CAM.z = s; V.w = 80; V.h = 60;
  drawPiece({ id: 3, x: 0, y: 0, a: 0, hw: P.hw, hh: P.hh, piece: t, hp: 1, maxhp: 1 });
  ctxSwap(real); [, CAM.x, CAM.y, CAM.z, V.w, V.h] = save;
  return (icoCache[t] = c);
}
function sheepIcon(t) {
  const key = 's' + t; if (icoCache[key]) return icoCache[key];
  const c = document.createElement('canvas'); c.width = 80; c.height = 60; const g = c.getContext('2d');
  const real = ctx, save = [CAM.x, CAM.y, CAM.z, V.w, V.h]; ctxSwap(g); CAM.x = 0; CAM.y = 0; CAM.z = 1.75; V.w = 80; V.h = 60;
  drawSheep({ x: 0, y: -3, r: 13, st: t, a: 0, age: 0, vx: 1, side: 0 });
  ctxSwap(real); [CAM.x, CAM.y, CAM.z, V.w, V.h] = save;
  return (icoCache[key] = c);
}
function renderBars() {
  if (!G) return;
  const bb = $('buildBar'), ab = $('ammoBar');
  const building = G.phase === 'build' && isMine(G.builder) && !G.ready[G.builder];
  bb.classList.toggle('hidden', !building); $('money').classList.toggle('hidden', !building); $('timer').classList.toggle('hidden', G.phase !== 'build' || G.mode === 'local');
  ab.classList.toggle('hidden', G.phase !== 'siege' || !isMine(G.turn) || (G.mode === 'cpu' && G.turn === 1));
  $('wind').classList.toggle('hidden', G.phase !== 'siege');
  if (building) {
    const side = G.builder, m = money(side), hasBell = !!bellOf(side);
    bb.innerHTML = '';
    for (const t of [...PIECE_ORDER, 'honey', 'remove']) {
      if (t === 'bell' && hasBell) continue;
      const P = PIECES[t], btn = document.createElement('button'); btn.className = 'slot' + (G.sel === t ? ' on' : '');
      if (t === 'remove') btn.innerHTML = '<span style="font-size:22px">✋</span>Remove';
      else if (t === 'honey') { btn.innerHTML = '<span style="font-size:22px">🍯</span>Honey<b>$' + HONEY + '</b>'; btn.title = 'Glue a piece to everything it touches'; btn.disabled = m < HONEY; }
      else { btn.append(pieceIcon(t)); btn.append(P.nm); if (P.cost) { const b = document.createElement('b'); b.textContent = '$' + P.cost; btn.append(b); } btn.disabled = P.cost > m; }
      btn.onclick = () => { G.sel = t; renderBars(); };
      bb.append(btn);
    }
    const sk = document.createElement('button'); sk.className = 'slot act'; sk.innerHTML = '<span style="font-size:20px">〰</span>Shake test'; sk.title = 'Let gravity act for a moment'; sk.disabled = G.testT > 0; sk.onclick = () => { shakeTest(side); renderBars(); }; bb.append(sk);
    const rot = document.createElement('button'); rot.className = 'slot act'; rot.innerHTML = '<span style="font-size:20px">⟳</span>Rotate'; rot.onclick = () => { G.rot = G.rot ? 0 : 1; renderBars(); }; bb.append(rot);
    if (G.lastFort[side]) { const lf = document.createElement('button'); lf.className = 'slot act'; lf.innerHTML = '<span style="font-size:20px">↺</span>Last fort'; lf.onclick = () => rebuildLast(side); bb.append(lf); }
    const clr = document.createElement('button'); clr.className = 'slot act'; clr.innerHTML = '<span style="font-size:20px">🧹</span>Clear'; clr.onclick = () => { for (const b of BODIES.filter(b => b.side === side && b.piece)) removeBody(b); G.sel = 'bell'; renderBars(); }; bb.append(clr);
    const go = document.createElement('button'); go.className = 'slot go'; go.textContent = 'Ready ✓'; go.disabled = !hasBell; go.onclick = () => readyUp(side); bb.append(go);
    $('money').textContent = '$' + m.toLocaleString();
  }
  if (G.phase === 'siege' && isMine(G.turn)) {
    ab.innerHTML = '';
    const am = G.ammo[G.turn];
    if (am[AIM.type] <= 0) AIM.type = SHEEP_ORDER.find(k => am[k] > 0) || 'sheep';
    SHEEP_ORDER.forEach((t, i) => {
      const btn = document.createElement('button'); btn.className = 'slot' + (AIM.type === t ? ' on' : ''); btn.disabled = am[t] <= 0;
      btn.append(sheepIcon(t)); btn.append(SHEEP[t].nm.split(' ')[0]); const b = document.createElement('b'); b.textContent = '×' + am[t]; btn.append(b);
      btn.title = SHEEP[t].nm + (i < 5 ? ' (' + (i + 1) + ')' : '');
      btn.onclick = () => { if (am[t] > 0) { AIM.type = t; renderBars(); } };
      ab.append(btn);
    });
  }
  hudTick();
}
// forts are remembered relative to the front edge of the zone, so a fort built on one side rebuilds mirrored on the other
function normFort(side) {
  const z = ZONES[side], fx = x => Math.round(side === 0 ? z.x1 - x : x - z.x0), ps = BODIES.filter(b => b.side === side && b.piece).sort((p, q) => q.y - p.y);
  return { p: ps.map(b => [b.piece, fx(b.x), Math.round(b.y), b.hw > b.hh ? 0 : (PIECES[b.piece].hw > PIECES[b.piece].hh ? 1 : 0)]),
    w: WELDS.filter(w => w.a.side === side).map(w => [ps.indexOf(w.a), ps.indexOf(w.b), ...(([x, y]) => [fx(x), Math.round(y)])(weldAnchor(w))]).filter(w => w[0] >= 0 && w[1] >= 0) };
}
function rebuildLast(side) {
  for (const b of BODIES.filter(b => b.side === side && b.piece)) removeBody(b);
  const z = ZONES[side];
  const lf = G.lastFort[side] || [], list = Array.isArray(lf) ? lf : lf.p, made = [], X = dx => side === 0 ? z.x1 - dx : z.x0 + dx;
  for (const [t, dx, y, rot] of list) made.push(placePiece(side, t, X(dx), y, rot, true, true));
  for (const [i, j, dx, y] of (lf.w || [])) if (made[i] && made[j] && money(side) >= HONEY) weld(made[i], made[j], X(dx), y);
  G.sel = bellOf(side) ? 'hay' : 'bell'; renderBars(); AUD.place('crate');
}
function hudTick() {
  if (!G) return;
  const pip = s => `<span class="side" style="color:${s ? 'var(--p1)' : 'var(--p0)'}">${G.names[s]} <span class="pips">${[0, 1].map(i => `<i class="${G.wins[s] > i ? 'on' : ''}"></i>`).join('')}</span></span>`;
  const sc = pip(0) + pip(1); if ($('score').innerHTML !== sc) $('score').innerHTML = sc;
  let ph = '';
  if (G.phase === 'build') ph = G.mode === 'local' ? `Round ${G.round} · ${G.names[G.builder]} builds` : G.ready[G.me] ? 'Waiting for the other fort…' : `Round ${G.round} · build your fort`;
  else if (G.phase === 'siege') ph = G.shot ? '💥' : (isMine(G.turn) && G.mode !== 'local' ? 'Your shot · drag back to aim' : G.mode === 'local' ? `${G.names[G.turn]} · drag back to aim` : `${G.names[G.turn]} is aiming…`);
  else ph = `Round ${G.round}`;
  if ($('phase').textContent !== ph) $('phase').textContent = ph;
  const w = G.wind, wt = w === 0 ? 'Wind · calm' : `Wind ${w > 0 ? '→' : '←'} ${Math.abs(w) > 60 ? 'strong' : Math.abs(w) > 25 ? 'breezy' : 'light'}`;
  if ($('wind').textContent !== wt) $('wind').textContent = wt;
  if (G.phase === 'build') { const s = Math.max(0, Math.ceil(G.buildT)); $('timer').textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (!$('money').classList.contains('hidden')) $('money').textContent = '$' + money(G.builder).toLocaleString(); }
}
// ---------- cards: pass the device, round results
function showCard(t, s, stats, btn, fn, sub = true) { $('cardT').textContent = t; $('cardS').textContent = s; $('cardStats').innerHTML = stats || ''; $('bCard').textContent = btn; $('bCard').onclick = fn; $('bCard').disabled = btn.startsWith('Waiting'); $('cardSub').classList.toggle('hidden', !sub); $('card').classList.remove('hidden'); G.paused = true; }
function hideCard() { $('card').classList.add('hidden'); if (G) G.paused = false; }
function passScreen(side, t, s) { showCard(t, s, '', `▶ I'm ${G.names[side]}`, () => { hideCard(); camTo('build', side, true); say(`${G.names[side]}: build your fort`, 'Place your bell first, off the ground', 2.6); }, false); }
// ---------- menus
function drawer(id) { for (const [d, b] of [['friend', 'bFriend'], ['how', 'bHow'], ['settings', 'bSet']]) { const show = d === id && $(d).classList.contains('hidden'); $(d).classList.toggle('hidden', !show); $(b).classList.toggle('on', show); } }
$('bFriend').onclick = () => drawer('friend'); $('bHow').onclick = () => drawer('how'); $('bSet').onclick = () => drawer('settings');
$('bCpu').onclick = () => { mpLeave(); AUD.init(); newMatch({ mode: 'cpu' }); };
$('bLocal').onclick = () => { mpLeave(); AUD.init(); newMatch({ mode: 'local' }); };
$('bPause').onclick = () => pauseMenu(true); $('bResume').onclick = () => pauseMenu(false);
$('bView').onclick = toggleView;
$('bQuit').onclick = () => { if (G && G.mode === 'online') { mpSend({ k: 'quit' }); mpLeave(); clearRec(); } toMenu(); };
$('bMenu').onclick = () => { if (G && G.mode === 'online') { mpLeave(); clearRec(); } toMenu(); };
$('bSound').onclick = () => setSound(SET.sound ? 0 : 1);
function pauseMenu(on) { if (!G) return; $('pause').classList.toggle('hidden', !on); if (G.mode !== 'online') G.paused = on; }
function toMenu() { G = null; resetWorld(); for (const id of ['pause', 'card', 'hud']) $(id).classList.add('hidden'); $('title').classList.remove('hidden'); document.body.classList.remove('playing'); CAM.zoomOut = false; showRejoin(); }
function setSound(v) { SET.sound = v; saveSet(); AUD.apply(); $('bSound').textContent = v ? '🔊' : '🔇'; document.querySelectorAll('#segS button').forEach(b => b.classList.toggle('on', +b.dataset.v === v)); }
function setDiff(v) { SET.diff = v; saveSet(); document.querySelectorAll('#segD button').forEach(b => b.classList.toggle('on', +b.dataset.v === v)); }
document.querySelectorAll('#segS button').forEach(b => b.onclick = () => { AUD.init(); setSound(+b.dataset.v); });
document.querySelectorAll('#segD button').forEach(b => b.onclick = () => setDiff(+b.dataset.v));

// ================= main loop =================
let last = 0, snapT = 0;
function tick(dt) {
  if (!G) return;
  G.t += dt; G.shake = Math.max(0, (G.shake || 0) - dt * 30); G.catT = Math.max(0, (G.catT || 0) - dt);
  for (const b of BODIES) if (b.hitT > 0) b.hitT -= dt;
  for (let i = FX.length - 1; i >= 0; i--) { const p = FX[i]; p.t += dt; if (p.t > p.life) { FX.splice(i, 1); continue; } if (p.k !== 'ring') { p.vy += (p.k === 'chip' ? 900 : 120) * dt; p.vx *= 1 - dt * (p.k === 'wool' ? 2.5 : 0.5); p.x += p.vx * dt; p.y += p.vy * dt; if (p.a !== undefined) p.a += p.w * dt; if (p.k === 'chip' && p.y > WORLD.ground) { p.y = WORLD.ground; p.vy *= -0.3; p.vx *= 0.6; } } }
  if (G.paused || (G.mode === 'online' && holdTick(dt))) return;
  if (G.phase === 'build') {
    if (G.testT > 0) { G.testT -= dt; if (G.testT <= 0) { repin(G.testSide); renderBars(); } }
    if (G.mode !== 'local') { const was = G.buildT; G.buildT -= dt; if (was > 10 && G.buildT <= 10 && !G.ready[G.me]) { say('10 seconds left!', 'Press Ready when your fort is done', 1.6); AUD.click(); } if (G.buildT <= 0 && !G.ready[G.me]) autoReady(); }
    physAdvance(dt);
  } else if (G.phase === 'siege' && G.shot) {
    if (G.mode !== 'online' || G.authority) {
      physAdvance(dt); if (G.shot) shotStep(dt);
      if (G.mode === 'online' && G.shot) { snapT -= dt; if (snapT <= 0) { snapT = 0.07; mpSend({ k: 'snap', st: snapState(false) }); } }
    } else {
      // watching someone else's shot: glide between the positions they send
      G.shot.t += dt;
      for (const b of BODIES) if (b.tx !== undefined) { const k = 1 - Math.exp(-dt * 18); b.x = lerp(b.x, b.tx, k); b.y = lerp(b.y, b.ty, k); b.a = lerp(b.a, b.ta, k); }
    }
  }
}
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.033, (ts - (last || ts)) / 1000); last = ts;
  if (!TEST || Q.has('run')) tick(dt);
  camStep(dt); draw(ts / 1000);
  if (G) hudTick();
}
