// ---------- game state & rules ----------
const SALE_LEN = 180, LINE_LEN = 9;
const G = {
  phase: 'menu', time: 0, lineT: LINE_LEN, saleT: SALE_LEN, doorsOpen: false, carts: [], player: null, crowd: [], diff: 1, dtAI: 1 / 120,
  flashAt: [], paSaid: {}, endT: 0, camH: 0, shakeA: 0, autopilot: false, seed: 1, best: 0, newBest: false,
};
const SETTINGS = { q: SAVE.get('quality', null), diff: SAVE.get('diff', 1), sound: SAVE.get('sound', 1), voice: SAVE.get('voice', 1) };
if (SETTINGS.q === null) SETTINGS.q = (matchMedia('(pointer:coarse)').matches ? 1 : 2);

function startGame(diff = SETTINGS.diff, seed = (Math.random() * 1e9) | 0, menu = false) {
  G.seed = seed; rnd = mulberry(seed); CART_ID = 0;
  G.diff = diff; G.time = 0; G.lineT = LINE_LEN; G.saleT = SALE_LEN; G.doorsOpen = false; G.endT = 0; G.paSaid = {}; G.newBest = false;
  G.flashAt = [150, 118, 84, 50]; G.shakeA = 0; G.restockT = 20; G.cutWarned = false; G.startX = 0;
  resetWorld(); SEMI_DIRTY = true;
  for (const L of LANES) { L.occ = null; L.scanT = 0; }
  G.carts = [];
  const names = RIVALS.slice(); for (let i = names.length - 1; i > 0; i--) { const j = ri(0, i); [names[i], names[j]] = [names[j], names[i]]; }
  const playerSlot = 6 + ri(0, 1);
  let ni = 0;
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / 2), side = i % 2;
    let c;
    if (i === playerSlot) c = makeCart('YOU', { player: true, handle: '#ffde2e', look: { hat: '#ffde2e', coat: '#c4001a', hatType: 0 } });
    else { const [nm, col] = names[ni++]; c = makeCart(nm, { handle: col, look: { coat: col } }); c.brain = makeBrain(diff, i); }
    c.x = 6.8 + row * 2.75 + rr(-0.15, 0.15); c.z = side ? 3.62 : 2.28; c.h = -Math.PI / 2 + rr(-0.05, 0.05);
    G.carts.push(c);
  }
  G.player = G.carts[playerSlot]; G.startX = G.player.x;
  spawnCrowd();
  G.camH = G.player.h;
  G.phase = 'line';
  if (menu) return;
  AU.startAmbience();
  pa('Good morning, Buygantic shoppers! Doors open at 5 AM sharp. No running, please.', 3);
  hudShow(true);
}

function pa(text, prio = 1, flash = false) { HUD.paQueue.push({ text, prio, flash }); if (SETTINGS.voice && SETTINGS.sound) AU.say(text.replace(/[⚡📢]/g, '')); }
function shake(a) { G.shakeA = Math.max(G.shakeA, a); }

function onCartHit(atk, vic, dv, px, pz, impact) {
  const involvesPlayer = atk.isPlayer || vic.isPlayer;
  if (impact > 1.2) AU.crash(clamp(impact / 6, 0.15, 1.2), px, pz);
  if (atk.brain && atk.brain.tgt && atk.brain.tgt.ref === vic) atk.brain.hitTarget = true;
  if (dv > CART.spillDv && vic.hitCd <= 0) {
    vic.hitCd = 0.6; vic.grip = 0.12; vic.wob = 1;
    let n = 1 + Math.floor((dv - CART.spillDv) / 1.4); if (vic.scanning) n += 1; n = Math.min(n, 3);
    const lost = vic.items.slice(-n).reduce((s, k) => s + ITEMS[k].save, 0);
    const got = spill(vic, n, vic.x - atk.x, vic.z - atk.z, atk);
    if (vic.scanning) { vic.scanning.occ = null; vic.scanning = null; }
    if (got) {
      if (atk.isPlayer) { popText(vic.x, 2.3, vic.z, pick(['SPILL!', 'WHAM!', 'CLEAN-UP!', 'BUSTED!']) + ' ' + vic.name, 'big'); AU.cheer(); }
      if (vic.isPlayer) { popText(vic.x, 2.3, vic.z, '-' + money(lost) + ' ' + atk.name + '!', 'bad'); }
      if (involvesPlayer) shake(0.4);
    }
  } else if (involvesPlayer && impact > 2) shake(0.15);
}
function onWallHit(c, sp, col) {
  if (sp > 2.2) AU.crash(clamp(sp / 8, 0.1, 0.8), c.x, c.z, true);
  if (col && col.kind === 'pallet') return;
  if (sp > 5.4 && c.items.length && c.hitCd <= 0) { c.hitCd = 0.6; c.wob = 1; spill(c, 1, -c.vx, -c.vz, null); if (c.isPlayer) { popText(c.x, 2.2, c.z, 'BONK!', 'bad'); shake(0.25); } }
  else if (c.isPlayer && sp > 3) shake(0.12);
}

function updateCheckout(dt) {
  for (const L of LANES) {
    // who's in the scan zone
    if (L.occ) {
      const c = L.occ, inZ = Math.abs(c.x - L.x) < 1.15 && c.z > L.z0 - 0.4 && c.z < L.z1 + 0.4;
      if (!inZ || !c.items.length) { if (c.scanning === L) c.scanning = null; if (!c.items.length && inZ) { if (c.isPlayer) { popText(c.x, 2.2, c.z, 'THANK YOU, COME AGAIN!', 'money'); AU.receipt(); } } L.occ = null; L.scanT = 0; }
    }
    if (!L.occ) {
      for (const c of G.carts) {
        if (c.scanning || !c.items.length) continue;
        if (Math.abs(c.x - L.x) < 1.0 && c.z > L.z0 && c.z < L.z1 && hyp(c.vx, c.vz) < 2.8) { L.occ = c; c.scanning = L; L.scanT = 0; if (c.isPlayer) AU.beep(1400); break; }
      }
    }
    if (L.occ) {
      const c = L.occ, k = c.items[0], it = ITEMS[k];
      const per = (it.slots >= 3 ? 0.85 : it.slots === 2 ? 0.6 : 0.42) * (L.express && c.items.length <= 3 ? 0.5 : 1);
      L.scanT += dt;
      if (L.scanT >= per) {
        L.scanT = 0; c.items.shift(); c.banked += it.save; c.bankedItems.push(k);
        if (hyp(c.x - CAM.pos[0], c.z - CAM.pos[2]) < 30) AU.beep(c.isPlayer ? 1850 : 1650, c.isPlayer ? 0.12 : 0.04);
        if (c.isPlayer) { popText(L.x, 2.0, -6.2, '+' + money(it.save), 'money'); AU.chaching(); }
        else if (hyp(c.x - G.player.x, c.z - G.player.z) < 16) popText(L.x, 2.0, -6.2, money(it.save), 'oof');
      }
    }
  }
}

function stepGame(dt) {
  G.time += dt; G.dtAI = dt;
  const frozen = G.phase === 'closed';
  if (G.phase === 'line') {
    G.lineT -= dt;
    const n = Math.ceil(G.lineT);
    if (!G.cutWarned && G.player.x < G.startX - 4.5 && G.player.z < 6) { G.cutWarned = true; const s = G.crowd.filter(s => s.state === 'queue').sort((a, b) => hyp(a.x - G.player.x, a.z - G.player.z) - hyp(b.x - G.player.x, b.z - G.player.z))[0]; if (s) { s.yell = 2; popText(s.x, 2.2, s.z, pick(['HEY! NO CUTTING!', 'BACK OF THE LINE!', 'I WAS HERE AT 2AM!']), 'oof'); } }
    if (n <= 5 && n >= 1 && G.paSaid['c' + n] === undefined) { G.paSaid['c' + n] = 1; banner(String(n)); AU.count(n); }
    if (G.lineT <= 0) {
      G.phase = 'sale'; G.doorsOpen = true; banner('GO!'); AU.doors(); AU.roar();
      pa('The doors are OPEN! Happy Black Friday, Buygantic shoppers!', 3);
    }
  } else if (G.phase === 'sale') {
    G.saleT -= dt;
    if (G.flashAt.length && G.saleT <= G.flashAt[0]) { G.flashAt.shift(); startFlash(); }
    const say = (key, t, text) => { if (G.saleT <= t && !G.paSaid[key]) { G.paSaid[key] = 1; pa(text, 2); } };
    say('m2', 120, 'Two minutes left in our Doorbuster sale!');
    say('m1', 60, 'One minute remaining! Only checked-out items are yours.');
    say('s30', 30, 'Attention shoppers: the sale ends in thirty seconds. Please bring your carts to a register.');
    if (G.saleT <= 10 && G.saleT > 0) { const n = Math.ceil(G.saleT); if (!G.paSaid['e' + n]) { G.paSaid['e' + n] = 1; banner(String(n), true); AU.count(n, true); } }
    G.restockT -= dt;
    if (G.restockT <= 0) { G.restockT = rr(16, 22); restock(); }
    if (W.flash) { W.flash.t -= dt; if (W.flash.t <= 0) { W.flash.p.flash = false; W.flash = null; SEMI_DIRTY = true; } }
    if (G.saleT <= 0) { G.saleT = 0; G.phase = 'closed'; G.endT = 3; banner('SALE OVER!', true); AU.closing(); for (const L of LANES) { if (L.occ) L.occ.scanning = null; L.occ = null; } }
  } else if (G.phase === 'closed') {
    G.endT -= dt; if (G.endT <= 0) { G.phase = 'receipt'; showReceipt(); }
  }
  const P = G.player;
  for (const c of G.carts) {
    if (c.isPlayer && !G.autopilot) { c.thr = IN.thr; c.steer = IN.steer; c.shove = IN.consumeShove(); }
    else if (c.brain) aiControl(c, dt);
    const hold = G.phase === 'line' && !G.doorsOpen && false;
    cartControl(c, dt, frozen || hold);
    collideStatic(c, (sp, col) => onWallHit(c, sp, col));
    kickStuff(c);
    c.fullWarn -= dt;
  }
  for (let i = 0; i < G.carts.length; i++) for (let j = i + 1; j < G.carts.length; j++) collideCarts(G.carts[i], G.carts[j], onCartHit);
  updateCrowd(dt, G.carts);
  if (G.phase === 'sale') { for (const c of G.carts) tryPickups(c); updateCheckout(dt); }
  updateLoot(dt);
}
function restock() {
  const empty = W.pallets.filter(p => p.stock <= 1 && !p.flash);
  for (let i = empty.length - 1; i > 0; i--) { const j = ri(0, i); [empty[i], empty[j]] = [empty[j], empty[i]]; }
  const n = Math.min(empty.length, ri(3, 5)); let names = [];
  for (let i = 0; i < n; i++) { const p = empty[i]; p.stock += p.it.slots >= 3 ? ri(1, 2) : ri(2, 3); p.max = Math.max(p.max, p.stock); names.push(p.it.n); }
  if (n) { SEMI_DIRTY = true; if (rnd() < 0.7) pa(`Restock alert: fresh ${names.slice(0, 2).join(' and ')}s on the floor!`, 1); }
}
function standings() {
  return G.carts.slice().sort((a, b) => b.banked - a.banked);
}
