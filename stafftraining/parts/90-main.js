// ---------- main: settings, HUD, labels, menus, camera, loop, test API ----------
const SETTINGS = { quality: SAVE.get('quality', matchMedia('(pointer:coarse)').matches ? 1 : 2), sound: SAVE.get('sound', true), coat: SAVE.get('coat', 0) };
const PROG = SAVE.get('prog', { unlocked: 1, grades: {} });
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const _txt = new Map();
function setText(el, s) { if (_txt.get(el) !== s) { _txt.set(el, s); el.textContent = s; } }
function setCls(el, c, on) { if (el.classList.contains(c) !== !!on) el.classList.toggle(c, !!on); }
let toastT = 0;
function toast(title, text) { const t = $('toast'); t.innerHTML = '<b>' + esc(title) + '</b>' + esc(text); t.style.display = 'block'; toastT = 5; }

// ---------- lesson flow ----------
function startLesson(i) {
  G.li = i; LESSON = LESSONS[i]; G.attempt = (G.attempt || 0) + 1; rnd = mulberry(977 + i * 131 + (TEST ? 0 : G.attempt * 17));
  resetHumans(); propsReset(); BOWL.food = 0;
  for (const k in DOORS) { const d = DOORS[k]; d.open = d.tgt = k === 'bed' ? 1 : 0; d.propped = false; d.keepClosed = false; d.hold = false; d.by = null; }
  G.time = 0; G.clock = LESSON.start; G.lamps = {}; for (const k of LESSON.lampsOn) G.lamps[k] = true; G.tvOn = false; G.laptop = 'call'; G.laptopOpen = true;
  G.narr = []; G.pops = []; G.later = []; G.canFinish = false; G.groomT = 0; G.meowN = 0; G.slow = 0; G.objFlash = 0; G.paused = false;
  G.stats = { incidents: 0, indignities: 0, meows: 0, knocks: 0, zooms: 0, trips: 0, traps: 0 };
  LESSON.setup(); CAT.coat = SETTINGS.coat; G.tod = LESSON.tod(G.clock);
  G.phase = 'play'; for (const id of ['menu', 'brief', 'pause', 'report']) $(id).classList.add('hidden'); $('hud').classList.remove('hidden');
  setText($('lessonTitle'), (i + 1) + '. ' + LESSON.title); _objKey = ''; AU.startMusic(); camSnap();
}
function showBrief(i) {
  i = clamp(i | 0, 0, LESSONS.length - 1); const L = LESSONS[i]; G.li = i; AU.init();
  $('bNum').textContent = 'LESSON ' + (i + 1) + ' OF ' + LESSONS.length; $('bTitle').textContent = L.title; $('bRule').textContent = L.rule;
  $('bTips').innerHTML = L.tips.map(t => '<li>' + esc(t) + '</li>').join('');
  // objectives are built in setup(); peek at them without starting
  const keep = LESSON; LESSON = L; resetHumans(); L.setup(); $('bObj').innerHTML = L.obj.map(o => '<li>' + esc(o.text) + (o.of ? ' (' + o.of + ')' : '') + '</li>').join('') + L.extra.map(e => '<li class="miss">Extra credit: ' + esc(e.text) + '</li>').join(''); LESSON = keep; G.narr = []; menuScene();
  $('bBegin').textContent = 'BEGIN LESSON'; $('bBegin').onclick = () => startLesson(i);
  for (const id of ['menu', 'report', 'pause', 'hud']) $(id).classList.add('hidden'); $('brief').classList.remove('hidden'); G.phase = 'brief';
}
function showMenu() {
  G.phase = 'menu'; for (const id of ['brief', 'pause', 'report', 'hud']) $(id).classList.add('hidden'); $('menu').classList.remove('hidden'); AU.stopMusic(); menuScene(); buildMenu();
}
function menuScene() {
  LESSON = LESSONS[2]; resetHumans(); propsReset(); for (const k in DOORS) { DOORS[k].open = DOORS[k].tgt = k === 'front' ? 0 : 1; DOORS[k].propped = false; }
  placeHuman(HUM[0], { spot: 'chair', kind: 'seat', pose: 'type' }); placeHuman(HUM[1], { spot: 'sofaD', kind: 'seat', pose: 'read', carry: 'book' });
  catReset(-3.2, 2.0, 0.6, 0.42); catSit('loaf', null); CAT.pose.loaf = 1; CAT.coat = SETTINGS.coat; G.clock = 600; G.tod = TOD.day; G.lamps = {}; G.tvOn = false; G.laptopOpen = true; G.narr = []; G.pops = []; BOWL.food = 1;
}
function gradeRank(g) { return ['', 'C', 'B', 'A', 'A+'].indexOf(g || ''); }
function finishLesson(win, why) {
  if (G.phase !== 'play') return; G.phase = 'report'; const L = LESSON;
  if (win) L.finishExtras();
  const ex = L.extra.filter(e => e.done).length, pat = (HUM[0].patience + HUM[1].patience) / 2;
  let grade = '';
  if (win) {
    const score = 62 + ex * 10 + CAT.dignity / 100 * 4 + pat / 100 * 4 - G.stats.incidents * 4; grade = score >= 96 ? 'A+' : score >= 86 ? 'A' : score >= 76 ? 'B' : 'C';
    PROG.unlocked = Math.max(PROG.unlocked, Math.min(LESSONS.length, G.li + 2)); if (gradeRank(grade) > gradeRank(PROG.grades[L.id])) PROG.grades[L.id] = grade; SAVE.set('prog', PROG);
    const tr = SAVE.get('train', {}), a = tr[L.train] || [0, 0]; for (const h of HUM) if (h.stats.caves + h.stats.fetch + h.stats.doors > 0) a[h.id] = Math.min(1, a[h.id] + 0.5); tr[L.train] = a; SAVE.set('train', tr);
  }
  G.result = { win, grade, why };
  $('rTitle').textContent = 'LESSON ' + (G.li + 1) + ': ' + L.title;
  const st = $('stamp'); st.textContent = win ? grade : 'SEE ME'; st.className = win ? '' : 'fail';
  $('rText').textContent = win ? L.winText : why === 'dignity' ? 'You ran out of dignity. You will be under the bed until tomorrow, thinking about nothing.' : L.failText;
  $('rObj').innerHTML = L.obj.map(o => '<li class="' + (o.done ? 'done' : 'miss') + '">' + esc(o.text) + (o.of ? ' (' + (o.n || 0) + '/' + o.of + ')' : '') + '</li>').join('');
  $('rExtra').innerHTML = L.extra.map(e => '<li class="' + (e.done ? 'done' : 'miss') + '">' + esc(e.text) + '</li>').join('');
  $('rStaff').innerHTML = HUM.map(h => '<div><b>' + h.name.toUpperCase() + ' (' + h.look.nick + ').</b> ' + esc(evalStaff(h)) + '</div>').join('');
  $('rStats').textContent = 'Meows ' + G.stats.meows + '  ·  Things knocked ' + G.stats.knocks + '  ·  Zoomies ' + G.stats.zooms + '  ·  Staff meltdowns ' + G.stats.incidents + '  ·  Dignity ' + Math.round(CAT.dignity) + '%';
  const last = G.li === LESSONS.length - 1; $('rNext').classList.toggle('hidden', !win); $('rNext').textContent = last ? 'GRADUATE' : 'NEXT LESSON';
  $('rNext').onclick = () => last ? showDiploma() : showBrief(G.li + 1);
  $('hud').classList.add('hidden'); $('report').classList.remove('hidden'); AU.stopMusic(); if (win) AU.win(); else AU.lose();
}
function evalStaff(h) {
  const s = h.stats, out = [];
  if (s.caves > 0) out.push(pick(['Gave in on request.', 'Folded under pressure. Promising.', 'Complied. Eventually.']));
  if (s.fetch > 0) out.push('Fetched ' + s.fetch + (s.fetch === 1 ? ' item.' : ' items.') + (s.fetch > 2 ? ' Excellent retrieval drive.' : ''));
  if (s.doors > 0) out.push('Held ' + s.doors + ' door' + (s.doors > 1 ? 's' : '') + ' for nobody.');
  if (s.incidents > 0) out.push('Lost composure ' + s.incidents + (s.incidents > 1 ? ' times' : ' time') + '. Needs firmer handling.');
  if (!out.length) out.push(pick(['Contributed nothing. Typical.', 'Slept through most of it. Enviable.', 'Present. Barely.']));
  out.push(h.patience > 75 ? 'Mood: suspiciously cheerful.' : h.patience > 40 ? 'Mood: frayed but functional.' : 'Mood: one meow from the edge.');
  return out.join(' ');
}
function showDiploma() {
  $('report').classList.add('hidden'); $('brief').classList.remove('hidden'); G.phase = 'brief'; menuScene();
  $('bNum').textContent = 'CERTIFICATE OF STAFF COMPETENCE'; $('bTitle').textContent = 'MARCUS & DANA';
  $('bRule').textContent = 'have completed Basic Training and may continue in their positions, pending weekly review. Signed, with one inky paw, MANAGEMENT.';
  $('bTips').innerHTML = ['Breakfast is now at 5.', 'Laptops are furniture.', 'Doors are a suggestion.', 'Fetch is their favourite game.', 'The bed is 70% yours. The other 30% is under negotiation.'].map(t => '<li>' + t + '</li>').join('');
  $('bObj').innerHTML = '<li class="done">Advanced Staff Training: coming when management feels like it</li>';
  $('bBegin').textContent = 'BACK TO THE MANUAL'; $('bBegin').onclick = showMenu;
}
function togglePause() {
  if (G.phase !== 'play') return; G.paused = !G.paused; $('pause').classList.toggle('hidden', !G.paused);
  if (G.paused) { $('pRule').textContent = LESSON.rule; $('pTips').innerHTML = LESSON.tips.map(t => '<li>' + esc(t) + '</li>').join('') + LESSON.extra.map(e => '<li><i>Extra credit' + (e.done ? ' (done)' : '') + ': ' + esc(e.text) + '</i></li>').join(''); syncButtons(); }
}
function syncButtons() { for (const id of ['sndBtn', 'pSnd']) $(id).textContent = 'SOUND: ' + (SETTINGS.sound ? 'ON' : 'OFF'); for (const id of ['qBtn', 'pQ']) $(id).textContent = 'QUALITY: ' + QUALITY[SETTINGS.quality].name; }
function buildMenu() {
  $('toc').innerHTML = LESSONS.map((L, i) => { const open = i < PROG.unlocked, g = PROG.grades[L.id]; return '<button data-i="' + i + '" class="' + (open ? '' : 'locked') + '"><span class="n">' + (i + 1) + '</span><span class="t">' + L.title + '</span>' + (g ? '<span class="g">' + g + '</span>' : open ? '' : '<span>&#128274;</span>') + '</button>'; }).join('');
  for (const b of $('toc').children) b.onclick = () => { const i = +b.dataset.i; if (i < PROG.unlocked) showBrief(i); };
  $('coats').innerHTML = COATS.map((c, i) => { const hex = a => '#' + a.slice(0, 3).map(v => ('0' + Math.round(v * 255).toString(16)).slice(-2)).join(''); return '<button data-i="' + i + '" title="' + c.name + '" class="' + (i === SETTINGS.coat ? 'on' : '') + '" style="background:' + hex(c.body) + '"><i style="background:' + hex(c.chest) + '"></i></button>'; }).join('');
  for (const b of $('coats').children) b.onclick = () => { SETTINGS.coat = +b.dataset.i; SAVE.set('coat', SETTINGS.coat); CAT.coat = SETTINGS.coat; buildMenu(); };
  $('unlockBtn').classList.toggle('hidden', PROG.unlocked >= LESSONS.length); syncButtons();
}
{
  const snd = () => { SETTINGS.sound = !SETTINGS.sound; SAVE.set('sound', SETTINGS.sound); AU.init(); AU.setOn(SETTINGS.sound); syncButtons(); };
  const q = () => { SETTINGS.quality = (SETTINGS.quality + 1) % QUALITY.length; SAVE.set('quality', SETTINGS.quality); syncButtons(); };
  $('sndBtn').onclick = snd; $('pSnd').onclick = snd; $('qBtn').onclick = q; $('pQ').onclick = q;
  $('howBtn').onclick = () => $('how').classList.toggle('hidden');
  $('unlockBtn').onclick = () => { PROG.unlocked = LESSONS.length; SAVE.set('prog', PROG); buildMenu(); };
  $('how').innerHTML = '<b>MOVE</b> W/S walk, A/D turn. On a phone, your left thumb is a joystick: up walks, sideways turns.<br><b>JUMP</b> (Space) hops onto whatever is in front of you. At the edge of furniture, keep pushing to hop down.<br><b>MEOW</b> (Q) gets louder if you repeat it. <b>ZOOM</b> (Shift) is zoomies.<br><b>MISCHIEF</b> (E) and <b>CHARM</b> (F) change with what is nearby. The buttons always say what they will do.<br><br>Each staff member has <b>PATIENCE</b> and <b>RESOLVE</b>. Mischief wears down both. Charm restores patience and builds guilt, and guilty staff give in faster. Break their resolve before you break their patience. If patience runs out there are consequences, and one of them is a spray bottle.';
  $('bBack').onclick = showMenu; $('pauseBtn').onclick = togglePause; $('pResume').onclick = togglePause;
  $('pRestart').onclick = () => startLesson(G.li); $('pQuit').onclick = showMenu; $('rRetry').onclick = () => startLesson(G.li); $('rMenu').onclick = showMenu;
  $('finishBtn').onclick = () => { if (G.canFinish) finishLesson(true, 'done'); };
  $('staff').innerHTML = [0, 1].map(i => '<div class="chip" id="chip' + i + '"><div class="hd"><b>' + LOOKS[i].name.toUpperCase() + '</b><span class="st"></span></div><div class="ln"><span>PATIENCE</span><div class="bar b1"><i></i></div></div><div class="ln"><span class="l2">RESOLVE</span><div class="bar b2"><i></i></div></div></div>').join('');
}

// ---------- HUD ----------
const LBL = { bub: [], zz: [], pops: [] };
{ const root = $('labels'); for (let i = 0; i < 2; i++) { const b = document.createElement('div'); b.className = 'bub'; b.style.display = 'none'; root.appendChild(b); LBL.bub.push(b); const z = document.createElement('div'); z.className = 'zz'; z.textContent = 'z Z z'; z.style.display = 'none'; root.appendChild(z); LBL.zz.push(z); }
  for (let i = 0; i < 12; i++) { const p = document.createElement('div'); p.className = 'pop'; p.style.display = 'none'; root.appendChild(p); LBL.pops.push(p); } }
let _objKey = '';
const _pr = [0, 0, 0];
function staffStatus(h) {
  if (h.pinned) return 'PINNED'; if (h.pillow > 0) return 'under a pillow';
  const m = { sleep: 'asleep', awakeBed: 'pretending to sleep', settle: 'trying to sleep', resettle: 'trying to sleep', feed: 'feeding you', fetch: 'fetching', spray: 'ARMED', carry: 'removing you', door: 'on door duty', talk: 'comparing notes', shower: 'in the shower', work: 'working', read: 'reading', tv: 'watching TV', cook: 'cooking', pet: 'petting you', remove: 'removing you', couch: 'on the couch', bedread: 'reading in bed', phone: 'on the phone' };
  if (!h.awake) return 'asleep'; if (m[h.planName]) return m[h.planName];
  return ({ type: 'working', phone: 'on the phone', cook: 'making coffee', reach: 'busy', reachHi: 'getting dressed', sip: 'drinking coffee' })[h.pose] || (h.moving ? 'walking' : 'around');
}
function hudUpdate(dt) {
  const W = innerWidth, Hh = innerHeight, play = G.phase === 'play';
  // world labels
  for (const h of HUM) {
    const b = LBL.bub[h.id], z = LBL.zz[h.id], hd = humanHead(h);
    if (h.bubble && (play || G.phase === 'report') && !h.hidden) {
      if (b._t !== h.bubble.text) { b._t = h.bubble.text; b.innerHTML = '<b>' + h.name.toUpperCase() + '</b>' + esc(h.bubble.text); }
      let ok = project(hd[0], hd[1] + 0.3, hd[2], _pr), x = _pr[0], y = _pr[1];
      const off = !ok || x < 40 || x > W - 40 || y < 150 || y > Hh - 150;
      if (!ok) { x = W * (h.id ? 0.7 : 0.3); y = 190; }
      b.style.display = 'block'; b.style.left = clamp(x, 110, W - 110) + 'px'; b.style.top = clamp(y, 215, Hh - 230) + 'px'; setCls(b, 'off', off);
    } else if (b.style.display !== 'none') { b.style.display = 'none'; b._t = ''; }
    if (!h.awake && play && h.zz <= 0 && project(hd[0], hd[1] + 0.25, hd[2], _pr) && _pr[2] < 9 && losClear(CAM.pos[0], CAM.pos[2], hd[0], hd[2])) { z.style.display = 'block'; z.style.left = _pr[0] + 'px'; z.style.top = _pr[1] + 'px'; } else if (z.style.display !== 'none') z.style.display = 'none';
  }
  for (let i = 0; i < LBL.pops.length; i++) {
    const el = LBL.pops[i], p = G.pops[i];
    if (p && project(p.x, p.y + (1.5 - p.t) * 0.35, p.z, _pr)) { if (el._p !== p) { el._p = p; el.textContent = p.text; el.className = 'pop ' + p.cls; } el.style.display = 'block'; el.style.left = _pr[0] + 'px'; el.style.top = _pr[1] + 'px'; el.style.opacity = clamp(p.t * 2, 0, 1); }
    else if (el.style.display !== 'none') { el.style.display = 'none'; el._p = null; }
  }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.display = 'none'; }
  if (!play) return;
  setText($('clock'), fmtClock(G.clock)); setCls($('clock'), 'late', LESSON.end - G.clock < 15);
  $('digBar').style.width = CAT.dignity + '%';
  for (const h of HUM) {
    const c = $('chip' + h.id), st = c.querySelector('.st'), b1 = c.querySelector('.b1 i'), b2 = c.querySelector('.b2 i'), l2 = c.querySelector('.l2');
    setText(st, staffStatus(h)); b1.style.width = clamp(h.patience, 0, 100) + '%'; b1.style.background = h.patience > 55 ? 'var(--green)' : h.patience > 28 ? 'var(--gold)' : 'var(--red)';
    const mode = !h.awake ? 'sleep' : h.demand ? 'res' : 'guilt';
    setText(l2, mode === 'sleep' ? 'SLEEP' : mode === 'res' ? 'RESOLVE' : 'GUILT'); b2.style.width = (mode === 'sleep' ? h.sleep : mode === 'res' ? h.demand.will / h.demand.max * 100 : h.guilt) + '%';
    setCls(c, 'sleep', mode === 'sleep'); setCls(c, 'guilt', mode === 'guilt'); setCls(c, 'hot', h.awake && h.patience < 22);
  }
  const L = LESSON, key = L.obj.map(o => (o.done ? 1 : 0) + ':' + (o.n || 0)).join() + '|' + L.extra.map(e => e.done ? 1 : 0).join() + '|' + L.status();
  if (key !== _objKey) {
    _objKey = key; const s = L.status();
    $('objs').innerHTML = L.obj.map(o => '<div class="' + (o.done ? 'done' : '') + '">' + esc(o.text) + (o.of ? ' ' + (o.n || 0) + '/' + o.of : '') + '</div>').join('') + L.extra.map(e => '<div class="x ' + (e.done ? 'done' : '') + '">' + esc(e.text) + '</div>').join('') + '<div class="xs">Extra credit ' + L.extra.filter(e => e.done).length + '/' + L.extra.length + '</div>' + (s ? '<div class="stat">' + esc(s) + '</div>' : '');
  }
  if (G.objFlash > 0) { G.objFlash -= dt; } setCls($('objs'), 'flash', G.objFlash > 0);
  setCls($('finishBtn'), 'hidden', !G.canFinish);
  const bm = $('bMis'), bc = $('bCharm'); setText(bm.querySelector('span'), CTX.mis ? CTX.mis.label : '...'); setCls(bm, 'off', !CTX.mis || catBusy()); setText(bc.querySelector('span'), CTX.charm ? CTX.charm.label : '...'); setCls(bc, 'off', !CTX.charm || catBusy());
  setCls($('bZoom'), 'cd', CAT.zoomCd > 0);
  const nk = G.narr.map(n => n.text).join('\n'); if ($('narr')._k !== nk) { $('narr')._k = nk; $('narr').innerHTML = G.narr.slice(0, 2).map(n => '<div>' + esc(n.text) + '</div>').join(''); }
}

// ---------- camera ----------
const CAMS = { h: 0, snap: true, off: 0, offS: 0 };
function camSnap() { CAMS.snap = true; CAMS.h = CAT.h; }
function camUpdate(dt) {
  if (G.phase === 'menu' || G.phase === 'brief') {
    const t = performance.now() / 1000 * (TEST ? 0 : 1), a = 0.55 + Math.sin(t * 0.07) * 0.5, wide = innerWidth > innerHeight;
    CAM.pos = [Math.sin(a) * (wide ? 7.5 : 10) + (wide ? -5.5 : 0), wide ? 11.5 : 12.5, Math.cos(a) * (wide ? 11 : 13)]; CAM.tgt = [wide ? -5.2 : 0, 0.2, 0.6]; return;
  }
  const c = CAT, port = innerHeight > innerWidth * 1.1;
  CAMS.h += angWrap(c.h - CAMS.h) * (CAMS.snap ? 1 : 1 - Math.exp(-(c.mode === 'held' ? 2 : 5.5) * dt));
  const dist = port ? 2.35 : 2.05, hgt = port ? 1.2 : 1.02, skip = supportAt(c.x, c.z, c.y + 0.05).f, ox = c.x, oy = c.y + 0.42, oz = c.z;
  const clear = a => camRay(ox, oy, oz, c.x - Math.sin(a) * dist, c.y + hgt, c.z - Math.cos(a) * dist, skip);
  // when the view from behind is blocked (back against a wall), swing round to the clearest side
  let bo = 0, bs = -9; const k0 = clear(CAMS.h);
  if (k0 < (CAMS.off === 0 ? 0.3 : 0.42)) for (const o of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1]) { const sc = Math.min(o === 0 ? k0 : clear(CAMS.h + o), 0.85) - Math.abs(o) * 0.05 + (o === CAMS.off ? 0.1 : 0); if (sc > bs) { bs = sc; bo = o; } }
  CAMS.off = bo; CAMS.offS = CAMS.snap ? bo : damp(CAMS.offS || 0, bo, 4.5, dt);
  const ca = CAMS.h + CAMS.offS, fx = Math.sin(CAMS.h), fz = Math.cos(CAMS.h);
  const tx = c.x + fx * 0.5 * Math.cos(CAMS.offS), ty = c.y + 0.44 + (c.mode === 'held' ? 0.5 : 0), tz = c.z + fz * 0.5 * Math.cos(CAMS.offS);
  let px = c.x - Math.sin(ca) * dist, py = c.y + hgt, pz = c.z - Math.cos(ca) * dist;
  const k = clear(ca);
  if (k < 1) { const kk = Math.max(0.16, k - 0.07); px = ox + (px - ox) * kk; pz = oz + (pz - oz) * kk; py = oy + (py - oy) * kk + (1 - kk) * 0.45; }
  py = Math.min(py, APT.H - 0.12);
  const s = CAMS.snap ? 1 : 1 - Math.exp(-9 * dt); CAMS.snap = false;
  CAM.pos = [lerp(CAM.pos[0], px, s), lerp(CAM.pos[1], py, s), lerp(CAM.pos[2], pz, s)]; CAM.tgt = [lerp(CAM.tgt[0], tx, s), lerp(CAM.tgt[1], ty, s), lerp(CAM.tgt[2], tz, s)];
}

// ---------- per-frame scene ----------
function buildScene() {
  for (const p of PRIMS) { SET.dyn[p].clear(); SET.dynN[p].clear(); SET.glass[p].clear(); }
  PARENT = null; msp = 0;
  const tod = G.tod || TOD.day;
  TGT = SET.dynN; drawWindows(tod);
  if (CAM.pos[1] < APT.H - 0.05) box(0, APT.H + 0.05, 0, 12.3, 0.1, 9.3, C('#f4efe4'));
  put('quad', -4.4, 0.95, -0.365, 0, 0, 0, 1.14, 0.68, 1, G.tvOn ? C('#ffffff', 0.85) : C('#15171c'), G.tvOn ? ATLAS.rects.tvon : undefined);
  TGT = SET.dyn; drawDoors(); drawProps();
  // laptop
  box(5.5, 0.762, 1.3, 0.26, 0.02, 0.36, C('#c9ced6'));
  if (G.laptopOpen) { put('box', 5.64, 0.89, 1.3, 0, 0, -0.18, 0.016, 0.25, 0.36, C('#c9ced6')); TGT = SET.dynN; put('quad', 5.628, 0.892, 1.3, -Math.PI / 2, -0.18, 0, 0.33, 0.22, 1, C('#ffffff', 0.8), ATLAS.rects[G.laptop]); TGT = SET.dyn; }
  else box(5.5, 0.782, 1.3, 0.26, 0.016, 0.36, C('#b9c0c6'));
  // bowls, spray bottle, box
  put('cyl', BOWL.x, 0.03, BOWL.z, 0, 0, 0, 0.24, 0.06, 0.24, C('#d9442e')); if (BOWL.food > 0) put('cyl', BOWL.x, 0.055, BOWL.z, 0, 0, 0, 0.19, 0.03, 0.19, C('#8a5a34'));
  put('cyl', BOWL.water.x, 0.03, BOWL.water.z, 0, 0, 0, 0.24, 0.06, 0.24, C('#3f7fc4')); put('cyl', BOWL.water.x, 0.052, BOWL.water.z, 0, 0, 0, 0.19, 0.02, 0.19, C('#9fd0f0'));
  if (!HUM.some(h => h.carry === 'spray')) { cyl(2.05, 0.99, -4.15, 0.035, 0.14, C('#4fb0d8')); box(2.05, 1.08, -4.12, 0.04, 0.05, 0.09, C('#e04040')); }
  { const b = G.boxAt, cc = COLS.card; box(b.x, 0.015, b.z, 0.56, 0.03, 0.46, shade(cc, 0.9)); box(b.x - 0.28, 0.15, b.z, 0.02, 0.3, 0.46, cc); box(b.x + 0.28, 0.15, b.z, 0.02, 0.3, 0.46, cc); box(b.x, 0.15, b.z - 0.23, 0.56, 0.3, 0.02, cc); box(b.x, 0.15, b.z + 0.23, 0.56, 0.3, 0.02, cc); }
  // cat bed nobody uses, by the desk
  put('cyl', 4.35, 0.04, 2.55, 0, 0, 0, 0.6, 0.08, 0.5, C('#7f9ac4')); put('cyl', 4.35, 0.07, 2.55, 0, 0, 0, 0.44, 0.06, 0.36, C('#e9eef5'));
  for (const [k, x] of [['nsW', -5.43], ['nsE', -2.57]]) put('cyl', x, 0.86, -4.28, 0, 0, 0, 0.17, 0.13, 0.17, G.lamps[k] ? C('#ffe2a0', 1) : C('#d8c9a8'));
  if (CAT.mode !== 'hidden') drawCat(CAT);
  for (const h of HUM) drawHuman(h);
  if (HUM.some(h => h.seat === 'shower')) { TGT = SET.glass; box(4.7, 1.2, -3.7, 2.36, 1.9, 0.02, C('#cfe9f2')); TGT = SET.dyn; }
  // lights
  LIGHT.key = tod.key; LIGHT.sky = tod.sky; LIGHT.gnd = tod.gnd; LIGHT.fog = tod.fog; setLightDir(tod.dir[0], tod.dir[1], tod.dir[2]);
  NPL = 0; G.lamps.tv = G.tvOn; for (const k in LAMPS) if (G.lamps[k]) for (const l of LAMPS[k]) addPL(l[0], l[1], l[2], l[3], l[4], l[5], l[6]);
  if (G.laptopOpen && tod.dark) addPL(5.3, 1.0, 1.3, 1.8, 0.3, 0.4, 0.6);
}

// ---------- loop ----------
function stepSim(dt) {
  G.time += dt; IN.update();
  if (IN.take('jump')) catJump(); if (IN.take('meow')) doMeow(); if (IN.take('zoom')) catZoom();
  buildContext();
  if (IN.take('mis') && CTX.mis && !catBusy()) CTX.mis.fn();
  if (IN.take('charm') && CTX.charm && !catBusy()) CTX.charm.fn();
  if (IN.take('finish') && G.canFinish) { finishLesson(true, 'done'); return; }
  catUpdate(dt); simCat(dt); simHumans(dt); propsUpdate(dt); doorsUpdate(dt); LESSON.update(dt);
  G.clock += LESSON.rate * dt; G.tod = LESSON.tod(G.clock);
  for (let i = G.narr.length - 1; i >= 0; i--) { if (i < 2) G.narr[i].t -= dt; if (G.narr[i].t <= 0) G.narr.splice(i, 1); }
  for (let i = G.pops.length - 1; i >= 0; i--) { G.pops[i].t -= dt; if (G.pops[i].t <= 0) G.pops.splice(i, 1); }
  for (let i = G.later.length - 1; i >= 0; i--) { const l = G.later[i]; l.t -= dt; if (l.t <= 0) { G.later.splice(i, 1); l.f(); } }
  if (G.pops.length > 12) G.pops.splice(0, G.pops.length - 12);
  if (G.phase !== 'play') return;
  if (CAT.dignity <= 0) finishLesson(false, 'dignity'); else if (G.clock >= LESSON.end) LESSON.onDeadline();
}
function idleStep(dt) { G.time += dt; for (const h of HUM) { humanPoseUpdate(h, dt); h.talkT -= dt; if (h.bubble) { h.bubble.t -= dt; if (h.bubble.t <= 0) h.bubble = null; } } const P = CAT.pose; if (G.phase === 'menu' || G.phase === 'brief') { P.loaf = 1; P.eye = 0.35 + (Math.sin(G.time * 0.7) > 0.96 ? -0.3 : 0); } }
let _last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - _last) / 1000); _last = now; RSTAT.fps = lerp(RSTAT.fps, 1 / Math.max(dt, 1e-3), 0.05);
  // one bad frame must not freeze the game: log the first error and keep going
  try {
    if (!TEST) { if (G.phase === 'play' && !G.paused) { if (G.slow > 0) G.slow -= dt; stepSim(dt * (G.slow > 0 ? 0.4 : 1)); } else if (!G.paused) idleStep(dt); }
  } catch (e) { if (!frame.err) { frame.err = e; console.error('sim step failed', e); } }
  camUpdate(dt); buildScene(); renderFrame(SETTINGS.quality); hudUpdate(dt);
}

// ---------- boot ----------
buildAtlas(); buildWorld(); navBuild(); showMenu();
requestAnimationFrame(frame);

// ---------- test API ----------
window.ST = {
  G, CAT, HUM, IN, CTX, PROPS, DOORS, BOWL, RSTAT, LESSONS, SAVE,
  start(i) { startLesson(i); }, lesson: () => LESSON,
  step(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n && G.phase === 'play'; i++) { stepSim(1 / 60); camUpdate(1 / 60); } },
  render() { camUpdate(0.0001); buildScene(); renderFrame(SETTINGS.quality); hudUpdate(0.016); },
  input(o) { IN.override = o; }, press(n) { IN.press(n); },
  tp(x, z, h, y) { CAT.x = x; CAT.z = z; if (h !== undefined) CAT.h = h; CAT.y = y !== undefined ? y : topAt(x, z).y; CAT.vy = 0; CAT.vx = CAT.vz = 0; CAT.mode = 'free'; CAT.sit = null; CAT.act = null; CAT.jump = null; camSnap(); },
  setQuality(q) { SETTINGS.quality = q; }, navFree, navPath, supportAt, topAt, humanSees, finish(w) { finishLesson(w !== false, 'done'); },
  state() { return { phase: G.phase, clock: fmtClock(G.clock), cat: { x: +CAT.x.toFixed(2), z: +CAT.z.toFixed(2), y: +CAT.y.toFixed(2), h: +CAT.h.toFixed(2), mode: CAT.mode, sit: CAT.sit && CAT.sit.kind, dignity: Math.round(CAT.dignity), meals: CAT.meals }, mis: CTX.mis && CTX.mis.label, charm: CTX.charm && CTX.charm.label,
    staff: HUM.map(h => ({ n: h.name, x: +h.x.toFixed(2), z: +h.z.toFixed(2), plan: h.planName, pose: h.pose, awake: h.awake, sleep: Math.round(h.sleep), pat: Math.round(h.patience), guilt: Math.round(h.guilt), will: h.demand ? Math.round(h.demand.will) : null, say: h.bubble && h.bubble.text, seat: h.seat })),
    obj: LESSON.obj.map(o => o.id + ':' + (o.done ? 'Y' : o.n || 0)), extra: LESSON.extra.filter(e => e.done).map(e => e.id), bowl: BOWL.food, canFinish: G.canFinish, result: G.result, status: LESSON.status() }; }
};
