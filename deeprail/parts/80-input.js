// ===== Input: mouse (absolute aim), keyboard, touch (relative trackpad aim + thumb buttons), gamepad =====
let TOUCH = URLP.has('touch') || (!URLP.has('desktop') && window.matchMedia && matchMedia('(pointer: coarse)').matches);
const KEYS = {};
const INPUT = { sens: SAVE.get('sens', 1.4), drag: null, padFire: false, padFlareHeld: false };
G.autoFire = SAVE.get('autofire', false);

function doFlare() {
  if (G.phase !== 'play' || G.paused || G.flares <= 0 || G.flareCD > 0) { if (G.phase === 'play' && G.flares <= 0) SND.tick(); return; }
  const d = aimRay(G.aim.x, G.aim.y), o = G.cam.p, res = castShot(o, d, false);
  const pt = V.madd(o, d, Math.min(res.t, 45));
  launchFlare(muzzlePos(), pt); G.flares--; G.flareCD = .35;
}
function setTouchMode(on) { if (TOUCH === on) return; TOUCH = on; document.body.classList.toggle('touch', on); HUD.refreshHelp(); }
function aimFromMouse(e) { const r = canvas.getBoundingClientRect(); G.aim.x = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1); G.aim.y = clamp(-((e.clientY - r.top) / r.height * 2 - 1), -1, 1); }
function inPlay() { return G.phase === 'play' && !G.paused && !G.bot; }

window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') { if (TOUCH && Math.abs(e.movementX) + Math.abs(e.movementY) > 0 && !URLP.has('touch')) setTouchMode(false); if (inPlay()) aimFromMouse(e); return; }
  const d = INPUT.drag; if (!d || d.id !== e.pointerId) return;
  G.aim.x = clamp(G.aim.x + (e.clientX - d.x) * INPUT.sens * 2 / innerWidth, -.97, .97); G.aim.y = clamp(G.aim.y - (e.clientY - d.y) * INPUT.sens * 2 / innerHeight, -.95, .95);
  d.x = e.clientX; d.y = e.clientY;
}, { passive: true });
canvas.addEventListener('pointerdown', (e) => {
  SND.unlock();
  if (e.pointerType === 'mouse') {
    if (!inPlay()) return; aimFromMouse(e);
    if (e.button === 0) G.firing = true; else if (e.button === 2) doFlare();
    e.preventDefault(); return;
  }
  setTouchMode(true);
  if (!INPUT.drag) { INPUT.drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} }
});
window.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse' && e.button === 0) G.firing = false;
  if (INPUT.drag && INPUT.drag.id === e.pointerId) INPUT.drag = null;
});
window.addEventListener('pointercancel', (e) => { if (INPUT.drag && INPUT.drag.id === e.pointerId) INPUT.drag = null; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => { if (G.phase === 'play') e.preventDefault(); });

function bindHold(el, down, up) {
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); SND.unlock(); setTouchMode(true); try { el.setPointerCapture(e.pointerId); } catch (err) {} el.classList.add('on'); down(); });
  const end = (e) => { el.classList.remove('on'); up && up(); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
}

window.addEventListener('keydown', (e) => {
  SND.unlock();
  if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); return; }
  KEYS[e.code] = true;
  if (['Space', 'KeyJ', 'KeyZ'].includes(e.code) && inPlay()) { G.firing = true; e.preventDefault(); }
  if (['KeyF', 'KeyK', 'KeyX', 'ShiftLeft', 'ShiftRight'].includes(e.code)) doFlare();
  if (e.code === 'Escape' || e.code === 'KeyP') HUD.togglePause();
  if (e.code === 'Enter') { if (G.phase === 'menu') HUD.play(); else if (G.phase === 'results') HUD.play(); }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { KEYS[e.code] = false; if (['Space', 'KeyJ', 'KeyZ'].includes(e.code)) G.firing = false; });
window.addEventListener('blur', () => { G.firing = false; for (const k in KEYS) KEYS[k] = false; if (G.phase === 'play' && !G.paused && !TEST) HUD.togglePause(true); });

function pollInput(dt) {
  if (!inPlay()) return;
  // keyboard aim
  const kx = (KEYS.ArrowRight || KEYS.KeyD ? 1 : 0) - (KEYS.ArrowLeft || KEYS.KeyA ? 1 : 0), ky = (KEYS.ArrowUp || KEYS.KeyW ? 1 : 0) - (KEYS.ArrowDown || KEYS.KeyS ? 1 : 0);
  if (kx || ky) { G.aim.x = clamp(G.aim.x + kx * 1.5 * dt, -.97, .97); G.aim.y = clamp(G.aim.y + ky * 1.5 * dt, -.95, .95); }
  // gamepad
  const pads = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for (const p of pads) if (p && p.connected) { gp = p; break; }
  if (gp) {
    const dz = (v) => Math.abs(v) < .15 ? 0 : (v - Math.sign(v) * .15) / .85;
    const ax = dz(gp.axes[0] || 0) + dz(gp.axes[2] || 0), ay = dz(gp.axes[1] || 0) + dz(gp.axes[3] || 0);
    if (ax || ay) { G.aim.x = clamp(G.aim.x + ax * 1.7 * dt, -.97, .97); G.aim.y = clamp(G.aim.y - ay * 1.7 * dt, -.95, .95); }
    const fire = (gp.buttons[7] && gp.buttons[7].value > .3) || (gp.buttons[0] && gp.buttons[0].pressed);
    if (fire !== INPUT.padFire) { INPUT.padFire = fire; G.firing = fire; }
    const fl = (gp.buttons[6] && gp.buttons[6].value > .3) || (gp.buttons[1] && gp.buttons[1].pressed) || (gp.buttons[2] && gp.buttons[2].pressed);
    if (fl && !INPUT.padFlareHeld) doFlare(); INPUT.padFlareHeld = fl;
    if (gp.buttons[9] && gp.buttons[9].pressed && !INPUT.padStart) HUD.togglePause(); INPUT.padStart = gp.buttons[9] && gp.buttons[9].pressed;
  }
}
