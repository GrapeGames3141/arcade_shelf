// ---------- input: keyboard, gamepad, touch (floating left joystick + buttons) ----------
const IN = {
  k: {}, thr: 0, steer: 0, q: {}, touch: false, joy: { id: null, ox: 0, oy: 0, x: 0, y: 0 }, override: null, pad: {},
  press(n) { this.q[n] = true; },
  take(n) { const v = this.q[n]; this.q[n] = false; return v; },
  update() {
    if (this.override) { this.thr = this.override.thr || 0; this.steer = this.override.steer || 0; return; }
    let t = 0, s = 0;
    if (this.k.KeyW || this.k.ArrowUp) t += 1; if (this.k.KeyS || this.k.ArrowDown) t -= 1;
    if (this.k.KeyA || this.k.ArrowLeft) s -= 1; if (this.k.KeyD || this.k.ArrowRight) s += 1;
    // sandboxed frames (previews, embeds) can forbid the Gamepad API: ask once, and never again after a refusal
    let pads = []; if (this.padOk !== false && navigator.getGamepads) { try { pads = navigator.getGamepads() || []; } catch (e) { this.padOk = false; } }
    for (const p of pads) {
      if (!p) continue; const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.abs(ax) > 0.18) s += ax; if (Math.abs(ay) > 0.2) t -= ay;
      const map = { 0: 'jump', 2: 'mis', 1: 'charm', 3: 'meow', 5: 'zoom', 7: 'zoom' };
      for (const b in map) { const on = !!(p.buttons[b] && p.buttons[b].pressed); if (on && !this.pad[b]) this.press(map[b]); this.pad[b] = on; }
      const st = !!(p.buttons[9] && p.buttons[9].pressed); if (st && !this.pad.st) togglePause(); this.pad.st = st;
    }
    if (this.joy.id !== null) {
      const R = 52; let dx = (this.joy.x - this.joy.ox) / R, dy = (this.joy.y - this.joy.oy) / R; const l = hyp(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      const dz = 0.16, f = v => Math.abs(v) < dz ? 0 : Math.sign(v) * (Math.abs(v) - dz) / (1 - dz);
      s += f(dx); t += f(-dy);
    }
    this.thr = clamp(t, -1, 1); this.steer = clamp(s, -1, 1);
  }
};
addEventListener('keydown', e => {
  const map = { KeyE: 'mis', KeyF: 'charm', KeyR: 'charm', KeyQ: 'meow', KeyM: 'meow', Space: 'jump', ShiftLeft: 'zoom', ShiftRight: 'zoom', KeyZ: 'zoom', Enter: 'finish' };
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  IN.k[e.code] = true; if (map[e.code]) IN.press(map[e.code]);
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  AU.init();
});
addEventListener('keyup', e => { IN.k[e.code] = false; });
addEventListener('blur', () => { IN.k = {}; });
{
  const T = document.getElementById('touch'), base = document.getElementById('joyBase'), knob = document.getElementById('joyKnob');
  const showTouch = () => { if (IN.touch) return; IN.touch = true; document.body.classList.add('touch'); };
  if (matchMedia('(pointer:coarse)').matches) showTouch();
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch') showTouch(); }, true);
  T.addEventListener('pointerdown', e => {
    e.preventDefault(); AU.init();
    if (G.phase !== 'play' || IN.joy.id !== null || e.clientX > innerWidth * 0.55) return;
    IN.joy.id = e.pointerId; IN.joy.ox = IN.joy.x = e.clientX; IN.joy.oy = IN.joy.y = e.clientY;
    base.style.display = 'block'; base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px'; knob.style.transform = '';
    try { T.setPointerCapture(e.pointerId); } catch (err) { }
  });
  T.addEventListener('pointermove', e => {
    if (e.pointerId !== IN.joy.id) return; e.preventDefault(); IN.joy.x = e.clientX; IN.joy.y = e.clientY;
    let dx = e.clientX - IN.joy.ox, dy = e.clientY - IN.joy.oy; const l = hyp(dx, dy), R = 52;
    if (l > R * 1.6) { IN.joy.ox += dx * (1 - R * 1.6 / l); IN.joy.oy += dy * (1 - R * 1.6 / l); base.style.left = IN.joy.ox + 'px'; base.style.top = IN.joy.oy + 'px'; dx = e.clientX - IN.joy.ox; dy = e.clientY - IN.joy.oy; }
    const k = Math.min(1, R / (hyp(dx, dy) || 1)); knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
  });
  const end = e => { if (e.pointerId !== IN.joy.id) return; IN.joy.id = null; base.style.display = 'none'; };
  T.addEventListener('pointerup', end); T.addEventListener('pointercancel', end);
  for (const [id, n] of [['bMis', 'mis'], ['bCharm', 'charm'], ['bMeow', 'meow'], ['bZoom', 'zoom'], ['bJump', 'jump']]) {
    const b = document.getElementById(id);
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.init(); IN.press(n); b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 120); });
  }
}
