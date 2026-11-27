// ===== Input: mouse aim/click fire/right-click reload, keyboard alternates, touch trackpad aim + buttons, gamepad =====
const INPUT = { rx: 0, ry: -0.05, fireHeld: false, mode: IS_TOUCH ? 'touch' : 'mouse', keys: {}, sens: SAVE.get('sens', 1), touchId: null, tx: 0, ty: 0, padPrev: {} };
function clampAim() { INPUT.rx = clamp(INPUT.rx, -0.97, 0.97); INPUT.ry = clamp(INPUT.ry, -0.95, 0.95); }
function gameActive() { return G.phase === 'play'; }
window.addEventListener('mousemove', e => {
  if (INPUT.mode === 'touch' && INPUT.touchId !== null) return; if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return; INPUT.mode = 'mouse';
  const r = canvas.getBoundingClientRect(); INPUT.rx = ((e.clientX - r.left) / r.width) * 2 - 1; INPUT.ry = -(((e.clientY - r.top) / r.height) * 2 - 1); clampAim();
});
const onMouseDown = e => {
  if (!gameActive()) return; audioInit();
  if (e.button === 0) { INPUT.fireHeld = true; fireDart(); } else if (e.button === 2) startReload();
  e.preventDefault();
};
canvas.addEventListener('mousedown', onMouseDown);
window.addEventListener('mouseup', e => { if (e.button === 0) INPUT.fireHeld = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.getElementById('hud').addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  const k = e.code; INPUT.keys[k] = true;
  if (k === 'Escape' || k === 'KeyP') { togglePause(); e.preventDefault(); return; }
  if (!gameActive()) return;
  if (k === 'KeyR') startReload();
  if (k === 'Space' || k === 'KeyF' || k === 'Enter') { INPUT.fireHeld = true; fireDart(); e.preventDefault(); }
  if (k === 'KeyM') { AUD.on = !AUD.on; SAVE.set('sound', AUD.on); audioSet(); syncSettings(); }
  if (k.startsWith('Arrow') || ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(k)) { INPUT.mode = 'keys'; e.preventDefault(); }
});
window.addEventListener('keyup', e => { INPUT.keys[e.code] = false; if (['Space', 'KeyF', 'Enter'].includes(e.code)) INPUT.fireHeld = false; });
window.addEventListener('blur', () => { INPUT.fireHeld = false; INPUT.keys = {}; if (G.phase === 'play') togglePause(true); });
// touch: drag anywhere outside the buttons moves the reticle like a trackpad
const tz = document.getElementById('touchzone');
tz.addEventListener('mousedown', e => { INPUT.mode = 'mouse'; onMouseDown(e); });
tz.addEventListener('contextmenu', e => e.preventDefault());
tz.addEventListener('touchstart', e => {
  audioInit(); if (!gameActive()) return; INPUT.mode = 'touch';
  for (const t of e.changedTouches) if (INPUT.touchId === null) { INPUT.touchId = t.identifier; INPUT.tx = t.clientX; INPUT.ty = t.clientY; }
  e.preventDefault();
}, { passive: false });
tz.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) if (t.identifier === INPUT.touchId) {
    const s = 2.3 * INPUT.sens / Math.min(innerWidth, innerHeight);
    INPUT.rx += (t.clientX - INPUT.tx) * s * (innerHeight / innerWidth) * 1.0; INPUT.ry -= (t.clientY - INPUT.ty) * s; INPUT.tx = t.clientX; INPUT.ty = t.clientY; clampAim();
  }
  e.preventDefault();
}, { passive: false });
const endTouch = e => { for (const t of e.changedTouches) if (t.identifier === INPUT.touchId) INPUT.touchId = null; };
tz.addEventListener('touchend', endTouch); tz.addEventListener('touchcancel', endTouch);
function bindHold(id, down, up) {
  const el = document.getElementById(id);
  el.addEventListener('touchstart', e => { audioInit(); down(); el.classList.add('on'); e.preventDefault(); e.stopPropagation(); }, { passive: false });
  el.addEventListener('touchend', e => { up && up(); el.classList.remove('on'); e.preventDefault(); }, { passive: false });
  el.addEventListener('touchcancel', () => { up && up(); el.classList.remove('on'); });
  el.addEventListener('mousedown', e => { audioInit(); down(); e.preventDefault(); e.stopPropagation(); });
  el.addEventListener('mouseup', () => { up && up(); });
}
bindHold('fireBtn', () => { INPUT.fireHeld = true; fireDart(); }, () => { INPUT.fireHeld = false; });
bindHold('reloadBtn', () => startReload());
function pollInput(dt) {
  // keyboard aim
  const K = INPUT.keys; const kx = (K.ArrowRight || K.KeyD ? 1 : 0) - (K.ArrowLeft || K.KeyA ? 1 : 0), ky = (K.ArrowUp || K.KeyW ? 1 : 0) - (K.ArrowDown || K.KeyS ? 1 : 0);
  if (kx || ky) { INPUT.rx += kx * 1.5 * dt; INPUT.ry += ky * 1.5 * dt; clampAim(); }
  // gamepad
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; const p = pads && Array.from(pads).find(x => x && x.connected);
  if (p) {
    const ax = Math.abs(p.axes[2] || 0) > Math.abs(p.axes[0] || 0) ? p.axes[2] : p.axes[0], ay = Math.abs(p.axes[3] || 0) > Math.abs(p.axes[1] || 0) ? p.axes[3] : p.axes[1];
    const dz = v => Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85;
    const vx = dz(ax || 0), vy = dz(ay || 0); if (vx || vy) { INPUT.mode = 'pad'; INPUT.rx += vx * Math.abs(vx) * 2.0 * dt; INPUT.ry -= vy * Math.abs(vy) * 2.0 * dt; clampAim(); }
    const btn = i => p.buttons[i] && p.buttons[i].pressed; const prev = INPUT.padPrev;
    const fire = btn(7) || btn(0) || btn(6); if (fire && gameActive()) { INPUT.mode = 'pad'; if (!prev.fire) fireDart(); INPUT.fireHeld = true; } else if (prev.fire) INPUT.fireHeld = false;
    if ((btn(2) || btn(5) || btn(4)) && !prev.rl && gameActive()) startReload();
    if (btn(9) && !prev.st) togglePause();
    prev.fire = fire; prev.rl = btn(2) || btn(5) || btn(4); prev.st = btn(9);
  }
}
