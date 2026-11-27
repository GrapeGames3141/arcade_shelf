// ---------- settings and input: mouse, keyboard, touch (relative drag + right-thumb buttons), gamepad ----------
const SET = {
  sound: SAVE.get('sound', true), music: SAVE.get('music', true), voice: SAVE.get('voice', false),
  lockMode: SAVE.get('lockMode', 'right'), auto: SAVE.get('auto', IS_TOUCH), sens: SAVE.get('sens', 1)
};
const AIM = { x: innerWidth / 2, y: innerHeight * 0.42 };
const IN = { fire: false, mouseFire: false, keyFire: false, touchFire: false, padFire: false, holdLock: false, holdT: 0, keys: {}, touch: IS_TOUCH, drag: null, padLock: false, padStart: false, padMode: false, override: null, wheelT: 0 };
function clampAim() { AIM.x = clamp(AIM.x, 8, VIEW.cssW - 8); AIM.y = clamp(AIM.y, 8, VIEW.cssH - 8); }
function showTouch() { if (IN.touchShown) return; IN.touch = true; IN.touchShown = true; $('touch').classList.remove('hidden'); document.body.classList.add('touchmode'); updateSettingsUI(); }
const isUI = el => !!(el && el.closest && el.closest('button, .screen, #touch, .settings'));
addEventListener('pointerdown', e => {
  AU.init(); AU.apply();
  if (e.pointerType === 'touch') { showTouch(); if (isUI(e.target)) return; if (G.phase === 'play' && !G.paused && !IN.drag) IN.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; return; }
  if (isUI(e.target) || G.phase !== 'play' || G.paused) return;
  AIM.x = e.clientX; AIM.y = e.clientY;
  if (e.button === 0) { IN.mouseFire = true; if (SET.lockMode === 'hold') { IN.holdT = 0; IN.holdArmed = true; } }
  if (e.button === 2 && SET.lockMode === 'right') lockStart();
  if (e.button === 1) { e.preventDefault(); cycleMode(1); }
});
// mouse wheel or middle click cycles the fire mode
addEventListener('wheel', e => { if (G.phase !== 'play' || G.paused || isUI(e.target)) return; e.preventDefault(); const t = performance.now(); if (t - IN.wheelT < 180) return; IN.wheelT = t; cycleMode(e.deltaY > 0 ? 1 : -1); }, { passive: false });
addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') {
    if (IN.drag && e.pointerId === IN.drag.id) { const k = 1.55 * SET.sens; AIM.x += (e.clientX - IN.drag.x) * k; AIM.y += (e.clientY - IN.drag.y) * k; IN.drag.x = e.clientX; IN.drag.y = e.clientY; clampAim(); }
    return;
  }
  AIM.x = e.clientX; AIM.y = e.clientY;
});
const endPtr = e => {
  if (e.pointerType === 'touch') { if (IN.drag && e.pointerId === IN.drag.id) IN.drag = null; return; }
  if (e.button === 0) { IN.mouseFire = false; IN.holdArmed = false; if (IN.holdLock) { IN.holdLock = false; lockRelease(); } }
  if (e.button === 2 && SET.lockMode === 'right') lockRelease();
};
addEventListener('pointerup', endPtr); addEventListener('pointercancel', endPtr);
addEventListener('contextmenu', e => { if (!isUI(e.target) || G.phase === 'play') e.preventDefault(); });
const FIRE_KEYS = ['Space', 'KeyJ', 'Enter', 'NumpadEnter'], LOCK_KEYS = ['ShiftLeft', 'ShiftRight', 'KeyK', 'KeyL'];
addEventListener('keydown', e => {
  AU.init(); AU.apply();
  if (e.code === 'Escape' || e.code === 'KeyP') { togglePause(); e.preventDefault(); return; }
  if (e.repeat) { if (FIRE_KEYS.includes(e.code) || e.code.startsWith('Arrow')) e.preventDefault(); return; }
  IN.keys[e.code] = true;
  if (G.phase === 'play' && !G.paused) {
    if (FIRE_KEYS.includes(e.code)) { IN.keyFire = true; e.preventDefault(); }
    if (LOCK_KEYS.includes(e.code)) lockStart();
    if (e.code === 'KeyQ' || e.code === 'Tab') { cycleMode(e.shiftKey ? -1 : 1); e.preventDefault(); }
    if (e.code === 'KeyE') cycleMode(-1);
    const dg = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code); if (dg >= 0 && CAMP.modes[MODE_ORDER[dg]] && WEAP.mode !== MODE_ORDER[dg]) { WEAP.mode = CAMP.mode = MODE_ORDER[dg]; SFX.mode(); popup(MODES[dg].name, vmad(TUG.W, TUG.frame.U, 4), '#9ef', true); }
  }
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', e => {
  IN.keys[e.code] = false;
  if (FIRE_KEYS.includes(e.code)) IN.keyFire = false;
  if (LOCK_KEYS.includes(e.code) && !LOCK_KEYS.some(k => IN.keys[k])) lockRelease();
});
addEventListener('blur', () => { IN.keys = {}; IN.keyFire = IN.mouseFire = IN.touchFire = false; if (LOCK.on) lockRelease(); if (G.phase === 'play' && !TEST) pause(true); });
// touch buttons under the right thumb
function holdBtn(id, down, up) {
  const b = $(id);
  b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch (_) { } b.classList.add('down'); AU.init(); AU.apply(); down(); });
  const u = e => { b.classList.remove('down'); up(); };
  b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); b.addEventListener('lostpointercapture', u);
}
holdBtn('tFire', () => { IN.touchFire = true; }, () => { IN.touchFire = false; });
holdBtn('tLock', () => lockStart(), () => lockRelease());
$('tAuto').addEventListener('click', e => { e.stopPropagation(); setSetting('auto', !SET.auto); });
$('tMode').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.init(); AU.apply(); cycleMode(1); });
function updateInput(dt) {
  if (IN.override) { const o = IN.override; IN.fire = !!o.fire; return; }
  // keyboard aim
  let kx = 0, ky = 0;
  if (IN.keys.KeyA || IN.keys.ArrowLeft) kx -= 1; if (IN.keys.KeyD || IN.keys.ArrowRight) kx += 1;
  if (IN.keys.KeyW || IN.keys.ArrowUp) ky -= 1; if (IN.keys.KeyS || IN.keys.ArrowDown) ky += 1;
  // gamepad
  IN.padFire = false;
  let pads = []; try { pads = navigator.getGamepads ? navigator.getGamepads() || [] : []; } catch (e) { pads = []; } // blocked in some embeds
  for (const p of pads) {
    if (!p) continue;
    const dz = v => Math.abs(v) < 0.15 ? 0 : v;
    kx += dz(p.axes[0] || 0) + dz(p.axes[2] || 0); ky += dz(p.axes[1] || 0) + dz(p.axes[3] || 0);
    const bt = i => p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.3);
    IN.padFire = bt(7) || bt(0);
    const lk = bt(6) || bt(5) || bt(2);
    if (lk && !IN.padLock) lockStart(); if (!lk && IN.padLock) lockRelease(); IN.padLock = lk;
    if (bt(9) && !IN.padStart) togglePause(); IN.padStart = bt(9);
    if (bt(3) && !IN.padMode && G.phase === 'play' && !G.paused) cycleMode(1); IN.padMode = bt(3);
  }
  if (kx || ky) { const sp = 950 * Math.min(VIEW.cssW, VIEW.cssH) / 800; AIM.x += kx * sp * dt; AIM.y += ky * sp * dt; clampAim(); }
  // classic mode: hold left button to lock
  if (IN.holdArmed && IN.mouseFire) { IN.holdT += dt; if (IN.holdT > 0.22 && !IN.holdLock) { IN.holdLock = true; lockStart(); } }
  IN.fire = (IN.mouseFire && !IN.holdLock) || IN.keyFire || IN.touchFire || IN.padFire;
}
