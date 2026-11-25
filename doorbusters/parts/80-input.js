// ---------- input: keyboard, gamepad, touch (floating joystick + tap to shove) ----------
const IN = {
  k: {}, thr: 0, steer: 0, shoveQ: false, touch: false, joy: { id: null, ox: 0, oy: 0, x: 0, y: 0 }, override: null,
  consumeShove() { const s = this.shoveQ; this.shoveQ = false; return s; },
  update() {
    if (this.override) { this.thr = this.override.thr || 0; this.steer = this.override.steer || 0; if (this.override.shove) { this.shoveQ = true; this.override.shove = false; } return; }
    let t = 0, s = 0;
    if (this.k.KeyW || this.k.ArrowUp) t += 1; if (this.k.KeyS || this.k.ArrowDown) t -= 1;
    if (this.k.KeyA || this.k.ArrowLeft) s -= 1; if (this.k.KeyD || this.k.ArrowRight) s += 1;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.abs(ax) > 0.15) s += ax; if (Math.abs(ay) > 0.2) t -= ay;
      if (p.buttons[7] && p.buttons[7].value > 0.2) t += p.buttons[7].value; if (p.buttons[6] && p.buttons[6].value > 0.2) t -= p.buttons[6].value;
      const b = !!(p.buttons[0] && p.buttons[0].pressed) || !!(p.buttons[2] && p.buttons[2].pressed);
      if (b && !this.padB) this.shoveQ = true; this.padB = b;
      if (p.buttons[9] && p.buttons[9].pressed && !this.padStart) togglePause(); this.padStart = !!(p.buttons[9] && p.buttons[9].pressed);
    }
    if (this.joy.id !== null) {
      const R = 55; let dx = (this.joy.x - this.joy.ox) / R, dy = (this.joy.y - this.joy.oy) / R; const l = hyp(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      const dz = 0.14; const f = v => Math.abs(v) < dz ? 0 : Math.sign(v) * (Math.abs(v) - dz) / (1 - dz);
      s += f(dx); t += f(-dy);
    }
    this.thr = clamp(t, -1, 1); this.steer = clamp(s, -1, 1);
  }
};
addEventListener('keydown', e => {
  if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); return; }
  IN.k[e.code] = true;
  if (['Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyJ'].includes(e.code)) { IN.shoveQ = true; e.preventDefault(); }
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  AU.init();
});
addEventListener('keyup', e => { IN.k[e.code] = false; });
addEventListener('blur', () => { IN.k = {}; });
{
  const T = document.getElementById('touch'), base = document.getElementById('joyBase'), knob = document.getElementById('joyKnob');
  const showTouch = () => { if (IN.touch) return; IN.touch = true; T.classList.add('on'); document.getElementById('shove').classList.add('on'); document.getElementById('keysHelp').innerHTML = 'Left thumb: joystick (up pushes, down brakes) &middot; tap the right side to shove'; };
  if (matchMedia('(pointer:coarse)').matches) showTouch();
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch') showTouch(); }, true);
  T.addEventListener('pointerdown', e => {
    e.preventDefault(); AU.init();
    if (G.phase !== 'line' && G.phase !== 'sale') return;
    if (e.clientX < innerWidth * 0.5) {
      if (IN.joy.id !== null) return;
      IN.joy.id = e.pointerId; IN.joy.ox = IN.joy.x = e.clientX; IN.joy.oy = IN.joy.y = e.clientY;
      base.style.display = 'block'; base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px'; knob.style.transform = '';
      try { T.setPointerCapture(e.pointerId); } catch (err) { }
    } else { IN.shoveQ = true; const s = document.getElementById('shove'); s.style.transform = 'scale(.9)'; setTimeout(() => s.style.transform = '', 90); }
  });
  T.addEventListener('pointermove', e => {
    if (e.pointerId !== IN.joy.id) return; e.preventDefault();
    IN.joy.x = e.clientX; IN.joy.y = e.clientY;
    let dx = e.clientX - IN.joy.ox, dy = e.clientY - IN.joy.oy; const l = hyp(dx, dy), R = 55;
    if (l > R * 1.6) { IN.joy.ox += dx * (1 - R * 1.6 / l); IN.joy.oy += dy * (1 - R * 1.6 / l); base.style.left = IN.joy.ox + 'px'; base.style.top = IN.joy.oy + 'px'; dx = e.clientX - IN.joy.ox; dy = e.clientY - IN.joy.oy; }
    const k = Math.min(1, R / (hyp(dx, dy) || 1)); knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
  });
  const end = e => { if (e.pointerId !== IN.joy.id) return; IN.joy.id = null; base.style.display = 'none'; };
  T.addEventListener('pointerup', end); T.addEventListener('pointercancel', end);
}
