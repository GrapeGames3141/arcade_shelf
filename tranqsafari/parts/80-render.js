// ===== Rendering: camera, jeep/rifle/dart/target models, shadow pass, HDR scene, bloom, tonemap =====
const CAM = { pos: [0, 2, 0], dir: [0, 0, -1], up: [0, 1, 0], view: M4.ident(), proj: M4.ident(), vp: M4.ident(), invVP: M4.ident(), world: M4.ident(), fov: 1.05, aspect: 1, near: 0.06, far: 1100, aimYaw: 0, aimPitch: 0, override: null };
const SUN = V.norm([0.55, 0.62, -0.56]);
const MODELS = {};
const LIGHT = { sunCol: [3.3, 2.95, 2.35], sky: [0.2, 0.33, 0.6], gnd: [0.1, 0.09, 0.05], fog: [0.42, 0.5, 0.58], fogD: 0.0021, exposure: 1.0 };

function buildModels() {
  // jeep (local: +x forward, +y up, +z right; origin on the ground between the axles)
  const m = new MeshB(); const T = (x, y, z) => M4.trans(x, y, z);
  const sand = [0.76, 0.66, 0.44], sandD = [0.6, 0.52, 0.34], green = [0.22, 0.36, 0.24], dark = [0.12, 0.12, 0.12], metal = [0.55, 0.56, 0.58], seat = [0.3, 0.22, 0.16];
  for (const x of [1.3, -1.25]) for (const z of [-0.82, 0.82]) { m.cyl([x, 0.42, z - 0.15], [x, 0.42, z + 0.15], 0.42, 0.42, dark, 14, 4); m.cyl([x, 0.42, z + Math.sign(z) * 0.151], [x, 0.42, z + Math.sign(z) * 0.16], 0.2, 0.2, metal, 10, 3); }
  m.box(T(-0.42, 0.6, 0), [2.9, 0.08, 1.8], sandD, 0); // floor
  for (const z of [-0.9, 0.9]) { m.box(T(-0.42, 0.86, z), [2.9, 0.56, 0.06], sand, 0); m.box(T(-0.42, 0.98, z * 1.02), [2.9, 0.1, 0.02], green, 0); }
  m.box(T(-1.85, 0.86, 0), [0.06, 0.56, 1.86], sand, 0);
  m.box(T(0.78, 1.08, 0), [0.32, 0.26, 1.84], [0.18, 0.17, 0.15], 0); // dash
  m.box(T(0.98, 0.86, 0), [0.1, 0.56, 1.84], sand, 0);
  m.box(T(1.5, 0.88, 0), [1.0, 0.36, 1.6], sand, 0); // hood
  m.box(T(1.5, 1.065, 0), [0.98, 0.02, 0.5], sandD, 0);
  for (const z of [-0.88, 0.88]) { m.box(T(1.45, 0.95, z), [1.2, 0.06, 0.34], sandD, 0); m.box(T(-1.3, 0.95, z), [1.1, 0.06, 0.3], sandD, 0); }
  m.box(T(2.02, 0.8, 0), [0.06, 0.4, 1.5], [0.25, 0.24, 0.2], 3); // grille
  for (const z of [-0.55, 0.55]) m.cyl([2.03, 0.88, z], [2.07, 0.88, z], 0.1, 0.1, [1.2, 1.15, 0.9], 10, 5);
  m.box(T(2.12, 0.55, 0), [0.1, 0.12, 1.7], metal, 3); m.box(T(-1.93, 0.55, 0), [0.1, 0.12, 1.7], metal, 3);
  // folded windshield frame lying on the hood
  m.box(T(1.25, 1.1, 0), [0.04, 0.04, 1.5], [0.3, 0.3, 0.28], 3); m.box(T(1.75, 1.1, 0), [0.04, 0.04, 1.5], [0.3, 0.3, 0.28], 3);
  for (const z of [-0.74, 0.74]) m.box(T(1.5, 1.1, z), [0.5, 0.04, 0.04], [0.3, 0.3, 0.28], 3);
  // seats
  for (const z of [-0.42, 0.42]) { m.box(T(-0.2, 0.78, z), [0.55, 0.16, 0.5], seat, 6); m.box(M4.mul(T(-0.5, 1.12, z), M4.rotZ(-0.12)), [0.1, 0.6, 0.5], seat, 6); }
  m.box(T(-1.35, 0.78, 0), [0.5, 0.16, 1.6], seat, 6); m.box(T(-1.62, 0.98, 0), [0.1, 0.3, 1.6], seat, 6);
  // roll bar and grab handle
  const rb = [0.2, 0.2, 0.2];
  for (const z of [-0.88, 0.88]) m.cyl([-1.05, 1.12, z], [-1.05, 1.6, z], 0.028, 0.028, rb, 8, 3);
  m.cyl([0.85, 1.25, 0.25], [0.85, 1.25, 0.65], 0.018, 0.018, rb, 6, 3);
  // steering wheel, radio, spare tyre, crate
  for (let i = 0; i < 12; i++) { const a0 = i / 12 * TAU, a1 = (i + 1) / 12 * TAU; const c = [0.5, 1.28, -0.42]; const p = a => [c[0] + Math.sin(a) * 0.05, c[1] + Math.cos(a) * 0.17, c[2] + Math.sin(a) * 0.17]; m.cyl(p(a0), p(a1), 0.016, 0.016, dark, 5, 4, false); }
  m.cyl([0.62, 1.2, -0.42], [0.5, 1.28, -0.42], 0.025, 0.025, dark, 6, 3);
  m.box(T(0.82, 1.215, -0.08), [0.1, 0.05, 0.17], [0.2, 0.2, 0.19], 3);
  m.cyl([-2.0, 0.98, 0], [-2.12, 0.98, 0], 0.36, 0.36, dark, 14, 4);
  m.box(T(-1.35, 0.98, -0.48), [0.55, 0.32, 0.5], [0.45, 0.35, 0.22], 1); m.box(T(-1.35, 1.15, -0.48), [0.57, 0.03, 0.52], [0.3, 0.24, 0.16], 1);
  // driver: Dot, in a bush hat
  const shirt = [0.55, 0.5, 0.36], skin = [0.62, 0.43, 0.32], hat = [0.6, 0.5, 0.33];
  m.box(M4.mul(T(-0.22, 1.2, -0.42), M4.rotZ(-0.1)), [0.26, 0.52, 0.38], shirt, 6);
  m.sphere([-0.18, 1.58, -0.42], 0.11, skin, 8, 0, [1, 1.1, 0.95]);
  m.cyl([-0.18, 1.66, -0.42], [-0.18, 1.67, -0.42], 0.2, 0.2, hat, 14, 6); m.cyl([-0.18, 1.66, -0.42], [-0.18, 1.78, -0.42], 0.11, 0.09, hat, 12, 6);
  m.cyl([-0.18, 1.7, -0.42], [-0.18, 1.72, -0.42], 0.112, 0.112, [0.35, 0.22, 0.12], 12, 6, false);
  for (const z of [-0.62, -0.22]) { m.cyl([-0.2, 1.38, z], [0.2, 1.2, z * 0.9 - 0.04], 0.045, 0.04, shirt, 6, 6); m.cyl([0.2, 1.2, z * 0.9 - 0.04], [0.48, 1.3, z < -0.4 ? -0.56 : -0.28], 0.04, 0.035, skin, 6, 0); }
  for (const z of [-0.52, -0.32]) { m.cyl([-0.1, 0.9, z], [0.35, 0.95, z], 0.07, 0.06, [0.4, 0.36, 0.28], 6, 6); m.cyl([0.35, 0.95, z], [0.42, 0.62, z], 0.06, 0.05, [0.4, 0.36, 0.28], 6, 6); }
  MODELS.jeep = m.build();
  const lamp = new MeshB(); lamp.box(M4.trans(0.86, 1.243, -0.03), [0.02, 0.012, 0.02], [1, 1, 1], 5); MODELS.radioLamp = lamp.build();

  // rifle (camera space: +x right, +y up, -z forward)
  const r = new MeshB(); const wood = [0.45, 0.28, 0.16], gun = [0.16, 0.17, 0.18], orange = [0.95, 0.45, 0.12];
  r.box(M4.trans(0, 0, 0.05), [0.05, 0.075, 0.32], gun, 3);
  r.cyl([0, 0.015, -0.1], [0, 0.015, -0.66], 0.013, 0.012, gun, 10, 3);
  r.cyl([0, 0.015, -0.66], [0, 0.015, -0.69], 0.018, 0.018, gun, 10, 3);
  r.cyl([0, -0.03, -0.08], [0, -0.03, -0.42], 0.017, 0.017, [0.7, 0.5, 0.3], 10, 7);
  r.cyl([0, 0.065, 0.06], [0, 0.065, -0.2], 0.021, 0.021, gun, 12, 3); r.cyl([0, 0.065, -0.2], [0, 0.065, -0.24], 0.027, 0.027, gun, 12, 3);
  r.cyl([0, 0.065, -0.241], [0, 0.065, -0.243], 0.024, 0.024, [0.2, 0.3, 0.4], 12, 7);
  r.box(M4.trans(0, 0.04, 0.02), [0.012, 0.03, 0.04], gun, 3); r.box(M4.trans(0, 0.04, -0.12), [0.012, 0.03, 0.04], gun, 3);
  r.box(M4.mul(M4.trans(0, -0.03, 0.33), M4.rotX(0.12)), [0.045, 0.1, 0.3], wood, 1); r.box(M4.trans(0, -0.012, 0.49), [0.048, 0.13, 0.03], [0.1, 0.1, 0.1], 4);
  r.box(M4.trans(0, -0.035, -0.28), [0.045, 0.05, 0.22], wood, 1);
  r.box(M4.mul(M4.trans(0, -0.07, 0.12), M4.rotX(-0.35)), [0.03, 0.1, 0.035], wood, 1);
  r.box(M4.trans(0.03, 0.0, 0.1), [0.006, 0.02, 0.05], orange, 0);
  MODELS.rifle = r.build();
  // dart: needle at +x
  const d = new MeshB(); d.cyl([0.0, 0, 0], [0.045, 0, 0], 0.0035, 0.001, [0.8, 0.8, 0.82], 5, 3); d.cyl([-0.11, 0, 0], [0, 0, 0], 0.009, 0.007, [0.75, 0.76, 0.8], 6, 3); d.cyl([-0.2, 0, 0], [-0.11, 0, 0], 0.028, 0.006, orange, 7, 0);
  MODELS.dart = d.build();
  // practice target: board faces +x
  const t = new MeshB(); const rings = [[0.55, [0.92, 0.88, 0.78]], [0.44, [0.75, 0.2, 0.15]], [0.33, [0.92, 0.88, 0.78]], [0.22, [0.75, 0.2, 0.15]], [0.11, [0.95, 0.75, 0.2]]];
  rings.forEach(([rad, col], i) => t.cyl([0.0 + i * 0.004, 0, 0], [0.04 + i * 0.004, 0, 0], rad, rad, col, 22, 0));
  t.cyl([-0.03, -2.2, 0], [-0.03, -0.3, 0], 0.06, 0.05, [0.4, 0.3, 0.2], 7, 1);
  MODELS.target = t.build();
}

// ---------- frustum ----------
const FR = new Float32Array(24);
function frustumFrom(m) {
  const p = [[3, 0, 1], [3, 0, -1], [3, 1, 1], [3, 1, -1], [3, 2, 1], [3, 2, -1]];
  for (let i = 0; i < 6; i++) { const [w, r, s] = p[i]; const a = m[w] + s * m[r], b = m[w + 4] + s * m[r + 4], c = m[w + 8] + s * m[r + 8], d = m[w + 12] + s * m[r + 12]; const l = Math.hypot(a, b, c); FR[i * 4] = a / l; FR[i * 4 + 1] = b / l; FR[i * 4 + 2] = c / l; FR[i * 4 + 3] = d / l; }
}
function sphereVisible(c, r) { for (let i = 0; i < 6; i++) if (FR[i * 4] * c[0] + FR[i * 4 + 1] * c[1] + FR[i * 4 + 2] * c[2] + FR[i * 4 + 3] < -r) return false; return true; }

// ---------- camera ----------
function updateCamera(dt) {
  const J = JEEP; const W = canvas.width, H = canvas.height; CAM.aspect = W / Math.max(1, H);
  const vf = 60 * Math.PI / 180; CAM.fov = CAM.aspect < 1.2 ? Math.min(1.62, 2 * Math.atan(Math.tan(0.6) / CAM.aspect)) : vf; const portrait = CAM.aspect < 1;
  if (CAM.override) {
    const o = CAM.override; CAM.pos = o.eye.slice(); CAM.view = M4.lookAt(o.eye, o.at, [0, 1, 0]); if (o.fov) CAM.fov = o.fov * Math.PI / 180;
  } else {
    const ax = INPUT.rx, ay = INPUT.ry;
    const wantY = -Math.sign(ax) * Math.pow(Math.abs(ax), 1.6) * (portrait ? 0.75 : 0.52), wantP = Math.sign(ay) * Math.pow(Math.abs(ay), 1.6) * 0.24 + (portrait ? 0.12 : 0);
    CAM.aimYaw = damp(CAM.aimYaw, wantY, 4, dt); CAM.aimPitch = damp(CAM.aimPitch, wantP, 4, dt);
    const bk = smooth(0.3, 2.8, Math.abs(angWrap(G.lookYaw))); const eye = M4.pt(J.M, [lerp(0.12, -0.25, bk), lerp(1.52, 1.72, bk), lerp(0.42, 0.3, bk)]);
    const sh = G.shake * G.shake * 0.05;
    const back = Math.abs(angWrap(G.lookYaw)) > Math.PI / 2 ? -1 : 1;
    const yaw = J.yaw + G.lookYaw + CAM.aimYaw + (Math.random() - 0.5) * sh;
    const pitch = G.lookPitch + CAM.aimPitch + J.pitch * 0.6 * back + (Math.random() - 0.5) * sh;
    const roll = J.roll * 0.45 * back + (Math.random() - 0.5) * sh * 0.5;
    const dir = [Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.sin(yaw)];
    const right = V.norm(V.cross(dir, [0, 1, 0])); const up0 = V.cross(right, dir);
    const up = V.add(V.mul(up0, Math.cos(roll)), V.mul(right, Math.sin(roll)));
    CAM.pos = eye; CAM.dir = dir; CAM.view = M4.lookAt(eye, V.add(eye, dir), up);
  }
  CAM.proj = M4.persp(CAM.fov, CAM.aspect, CAM.near, CAM.far);
  CAM.vp = M4.mul(CAM.proj, CAM.view); CAM.invVP = M4.invert(CAM.vp); CAM.world = M4.invert(CAM.view);
}

// ---------- frame uniforms ----------
let SHVP = M4.ident();
function shadowMatrix() {
  const R = QI >= 3 ? 75 : 62; const f = V.norm([CAM.dir[0], 0, CAM.dir[2]]);
  const c = V.add(CAM.pos, V.mul(f, R * 0.55)); c[1] = JEEP.pos[1];
  const view = M4.lookAt(V.add(c, V.mul(SUN, 200)), c, [0, 1, 0]);
  // snap to texels so the shadow does not crawl
  const tex = 2 * R / Math.max(1, SH.size); const lc = M4.pt(view, c); const sx = Math.round(lc[0] / tex) * tex - lc[0], sy = Math.round(lc[1] / tex) * tex - lc[1];
  const proj = M4.ortho(-R + sx, R + sx, -R + sy, R + sy, 20, 420);
  return M4.mul(proj, view);
}
function uploadFrame(time) {
  setF('uVP', CAM.vp); setF('uView', CAM.view); setF('uShVP', SHVP);
  setF('uCam', [CAM.pos[0], CAM.pos[1], CAM.pos[2], time]);
  setF('uSunDir', [SUN[0], SUN[1], SUN[2], SH.size ? 1 : 0]);
  setF('uSunCol', [...LIGHT.sunCol, LIGHT.exposure]); setF('uSky', [...LIGHT.sky, 0]); setF('uGnd', [...LIGHT.gnd, 0]);
  setF('uFog', [...LIGHT.fog, LIGHT.fogD]); setF('uFog2', [0.018, 0.75, JEEP.pos[1] + 2, 0]);
  setF('uWind', [0.8, 0.6, 0.35, time]); setF('uScr', [RT.w, RT.h, 1 / RT.w, 1 / RT.h]);
  setF('uMisc', [1 / Math.max(1, SH.size), Q.pcf, RT.samples ? 0 : 1, URLQ.get('dbg') === 'shadow' ? 1 : 0]);
  const r = M4.dir(CAM.world, [1, 0, 0]), u = M4.dir(CAM.world, [0, 1, 0]); setF('uCamR', [...r, 0]); setF('uCamU', [...u, 0]);
  gl.bindBuffer(gl.UNIFORM_BUFFER, frameUBO); gl.bufferSubData(gl.UNIFORM_BUFFER, 0, FRAME_DATA);
}

// ---------- draw helpers ----------
const IDM = M4.ident();
function drawMesh(P, mesh, M = IDM, tint = [1, 1, 1, 1]) {
  gl.uniformMatrix4fv(P.u.uM, false, M); if (P.u.uTint) gl.uniform4fv(P.u.uTint, tint);
  gl.bindVertexArray(mesh.vao); gl.drawElements(gl.TRIANGLES, mesh.n, mesh.type, 0);
}
function drawCreature(P, a, shadow) {
  const sp = a.sp; const d = V.dist(a.pos, CAM.pos); const mesh = sp.mesh[d > sp.len * 6 + 18 ? 1 : 0];
  gl.uniformMatrix4fv(P.u.uBones, false, a.skin);
  if (!shadow) {
    gl.uniform4fv(P.u.uEye, sp.eye); gl.uniform4f(P.u.uEyeCol, sp.eyeCol[0], sp.eyeCol[1], sp.eyeCol[2], clamp(a.an.sleep * 1.1 + (a.asleep ? 0.3 : 0) + a.an.stumble * 0.35, 0, 1));
    gl.uniform4f(P.u.uScale, sp.scale, 0, 0, 0); gl.uniform4f(P.u.uFx, a.flash, a.kind === 'boss' && JEEP.s > 1660 ? 0.4 : 0, 0, 0);
  }
  gl.bindVertexArray(mesh.vao); gl.drawElements(gl.TRIANGLES, mesh.n, mesh.type, 0);
}
function actorVisible(a) { if (!a.skin || a.gone) return false; const c = [a.pos[0], a.pos[1] + a.sp.top * 0.5, a.pos[2]]; return V.dist(c, CAM.pos) < Q.far + 40 && sphereVisible(c, a.sp.radius + 2); }
function chunkFraction(c, dist) { let f = Q.veg; if (Q.thin && QI === 2) f *= clamp(1.45 - dist / 260, 0.4, 1); if (QI < 2) f *= clamp(1.35 - dist / 220, 0.3, 1); return f; }
function drawSplats(P, shadowOnly) {
  gl.bindVertexArray(WORLD.splat.vao); gl.bindBuffer(gl.ARRAY_BUFFER, WORLD.splat.vb);
  for (const c of WORLD.chunks) {
    const n0 = c.core + c.fill; if (!n0) continue;
    const dist = Math.max(0, V.dist(c.c, CAM.pos) - c.r);
    if (shadowOnly) { if (V.dist(c.c, SHCENTER) > c.r + 90) continue; } else { if (dist > Q.far || !sphereVisible(c.c, c.r)) continue; }
    const cnt = shadowOnly ? c.core : c.core + Math.floor(c.fill * chunkFraction(c, dist));
    if (!cnt) continue;
    splatPointers(c.first); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, cnt);
  }
}
let SHCENTER = [0, 0, 0];
const PAR_BUF = { buf: null, vao: null, cap: 0, data: null };
function drawParticles() {
  const L = PARTS.list; const extra = DARTS.length; const n = L.length + extra; if (!n) return;
  if (!PAR_BUF.vao || PAR_BUF.cap < n) {
    PAR_BUF.cap = Math.max(256, n * 2); PAR_BUF.data = new ArrayBuffer(PAR_BUF.cap * 36);
    if (!PAR_BUF.vao) { PAR_BUF.vao = gl.createVertexArray(); PAR_BUF.buf = gl.createBuffer(); }
    gl.bindVertexArray(PAR_BUF.vao); gl.bindBuffer(gl.ARRAY_BUFFER, QUAD_BUF); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, PAR_BUF.buf); gl.bufferData(gl.ARRAY_BUFFER, PAR_BUF.cap * 36, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 36, 0); gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 36, 16); gl.vertexAttribDivisor(2, 1);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, 36, 32); gl.vertexAttribDivisor(3, 1);
  }
  const f = new Float32Array(PAR_BUF.data), b = new Uint8Array(PAR_BUF.data); let k = 0;
  const put = (p, size, v, kind, col, alpha) => { const o = k * 9; f[o] = p[0]; f[o + 1] = p[1]; f[o + 2] = p[2]; f[o + 3] = size; f[o + 4] = v[0]; f[o + 5] = v[1]; f[o + 6] = v[2]; f[o + 7] = kind; const bo = k * 36 + 32; b[bo] = clamp(col[0] * 160, 0, 255); b[bo + 1] = clamp(col[1] * 160, 0, 255); b[bo + 2] = clamp(col[2] * 160, 0, 255); b[bo + 3] = clamp(alpha * 255, 0, 255); k++; };
  for (const q of L) put(q.p, q.size, q.v, q.kind, q.col, q.alpha * Math.min(1, q.life / q.max * 2));
  for (const d of DARTS) if (d.pos && d.vel) put(d.pos, 0.022, V.mul(d.vel, 0.018), 1, [1.6, 1.3, 0.9], 0.8);
  gl.bindVertexArray(PAR_BUF.vao); gl.bindBuffer(gl.ARRAY_BUFFER, PAR_BUF.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Uint8Array(PAR_BUF.data, 0, k * 36));
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, k);
}

// ---------- the frame ----------
let lastSize = '';
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, Q.dpr); const W = Math.max(1, Math.round(innerWidth * dpr)), H = Math.max(1, Math.round(innerHeight * dpr));
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  const sc = PIN_SCALE || (Q.adaptive ? renderScale : Q.scale) * (QI < 2 && IS_TOUCH ? 0.9 : 1);
  const w = Math.max(1, Math.round(W * sc)), h = Math.max(1, Math.round(H * sc)); const key = w + 'x' + h + ':' + QI;
  if (key !== lastSize) { lastSize = key; setupRT(w, h); }
}
function renderFrame(time) {
  resize();
  SHVP = SH.size ? shadowMatrix() : M4.ident();
  uploadFrame(time);
  const actorsVis = ACTORS.filter(a => !a.gone && a.skin);
  // shadow pass
  gl.activeTexture(gl.TEXTURE0 + UNIT.shadow); gl.bindTexture(gl.TEXTURE_2D, SH_DUMMY);
  if (SH.size) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, SH.fb); gl.viewport(0, 0, SH.size, SH.size); gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3); gl.disable(gl.CULL_FACE);
    const saveVP = CAM.vp; setF('uVP', SHVP); gl.bindBuffer(gl.UNIFORM_BUFFER, frameUBO); gl.bufferSubData(gl.UNIFORM_BUFFER, 0, FRAME_DATA);
    frustumFrom(SHVP); SHCENTER = V.add(CAM.pos, V.mul(V.norm([CAM.dir[0], 0, CAM.dir[2]]), 35));
    gl.useProgram(P_MESHSH.p);
    for (const c of WORLD.chunks) if (c.mesh && V.dist(c.c, SHCENTER) < c.r + 90) drawMesh(P_MESHSH, c.mesh);
    for (const t of WORLD.tiles) if (t.dist < 60 && sphereVisible(t.c, 50)) drawMesh(P_MESHSH, t);
    drawMesh(P_MESHSH, MODELS.jeep, JEEP.M);
    gl.useProgram(P_SKINSH.p); for (const a of actorsVis) if (V.dist(a.pos, SHCENTER) < 100) drawCreature(P_SKINSH, a, true);
    if (Q.canopySh) { gl.useProgram(P_SPLSH.p); drawSplats(P_SPLSH, true); }
    gl.disable(gl.POLYGON_OFFSET_FILL);
    setF('uVP', saveVP); gl.bindBuffer(gl.UNIFORM_BUFFER, frameUBO); gl.bufferSubData(gl.UNIFORM_BUFFER, 0, FRAME_DATA);
    gl.activeTexture(gl.TEXTURE0 + UNIT.shadow); gl.bindTexture(gl.TEXTURE_2D, SH.tex);
  }
  frustumFrom(CAM.vp);
  // scene pass
  gl.bindFramebuffer(gl.FRAMEBUFFER, RT.samples ? RT.msFB : RT.resFB); gl.viewport(0, 0, RT.w, RT.h);
  gl.clearColor(0.5, 0.6, 0.7, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  gl.useProgram(P_TER.p);
  for (const t of WORLD.tiles) { const c = [t.box[0] + 32, (t.minY + t.maxY) / 2, t.box[1] + 32]; const r = Math.hypot(46, (t.maxY - t.minY) / 2 + 2); if (V.dist(c, CAM.pos) - r < Q.far + 80 && sphereVisible(c, r)) drawMesh(P_TER, t); }
  gl.disable(gl.CULL_FACE);
  gl.useProgram(P_MESH.p);
  for (const c of WORLD.chunks) if (c.mesh && V.dist(c.c, CAM.pos) - c.r < Q.far && sphereVisible(c.c, c.r)) drawMesh(P_MESH, c.mesh);
  drawMesh(P_MESH, WORLD.props);
  for (const tg of TARGETS) { const M = M4.mul(M4.basis(tg.base, tg.face, [0, 1, 0]), M4.mul(M4.rotZ(-tg.fall * 1.45), M4.trans(0, tg.h, 0))); drawMesh(P_MESH, MODELS.target, M); }
  drawMesh(P_MESH, MODELS.jeep, JEEP.M);
  const talking = RADIO.cur && Math.sin(time * 18) > 0; drawMesh(P_MESH, MODELS.radioLamp, JEEP.M, talking ? [0.3, 1.0, 0.3, 4] : [0.2, 0.5, 0.2, 0.5]);
  // darts in flight, stuck in animals, stuck in the ground
  for (const d of DARTS) if (d.pos) drawMesh(P_MESH, MODELS.dart, M4.basis(d.pos, d.dir, [0, 1, 0]));
  for (const a of actorsVis) for (const st of a.darts) { const S = a.skin.subarray(st.bone * 16, st.bone * 16 + 16); const p = M4.pt(S, st.local); const dir = V.norm(M4.dir(S, st.dir)); drawMesh(P_MESH, MODELS.dart, M4.basis(V.add(p, V.mul(dir, 0.05)), dir, Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])); }
  for (const g of GROUND_DARTS) drawMesh(P_MESH, MODELS.dart, M4.basis(V.add(g.p, V.mul(g.dir, -0.02)), g.dir, Math.abs(g.dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]));
  gl.useProgram(P_SKIN.p);
  for (const a of actorsVis) if (actorVisible(a)) drawCreature(P_SKIN, a, false);
  // splats with alpha-to-coverage
  gl.useProgram(P_SPL.p); gl.uniform4f(P_SPL.u.uPush, JEEP.pos[0], JEEP.pos[1], JEEP.pos[2], 3.2);
  if (RT.samples) gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  drawSplats(P_SPL, false);
  gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  // sky fills what is left
  gl.depthMask(false); gl.useProgram(P_SKY.p); gl.uniformMatrix4fv(P_SKY.u.uInvVP, false, CAM.invVP); gl.bindVertexArray(VAO_FS); gl.drawArrays(gl.TRIANGLES, 0, 3);
  // water and particles (premultiplied alpha)
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  if (WORLD.water && JEEP.s > WORLD.water.s0 - 400) { gl.useProgram(P_WAT.p); gl.bindVertexArray(WORLD.water.vao); gl.drawElements(gl.TRIANGLES, WORLD.water.n, gl.UNSIGNED_INT, 0); }
  gl.useProgram(P_PAR.p); drawParticles();
  gl.disable(gl.BLEND); gl.depthMask(true);
  // rifle on top
  if ((G.phase === 'play' || G.phase === 'over' || G.phase === 'paused') && !CAM.override) {
    gl.clear(gl.DEPTH_BUFFER_BIT); gl.useProgram(P_MESH.p); drawMesh(P_MESH, MODELS.rifle, rifleMatrix());
    for (let i = 0; i < G.ammo; i++) { const M = M4.mul(rifleMatrix(), M4.mul(M4.trans(0.034, -0.005 - (i % 3) * 0.017, -0.02 - Math.floor(i / 3) * 0.06), M4.rotY(Math.PI / 2))); drawMesh(P_MESH, MODELS.dart, M4.mul(M, M4.scale(0.55))); }
  }
  // resolve + post
  if (RT.samples) { gl.bindFramebuffer(gl.READ_FRAMEBUFFER, RT.msFB); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, RT.resFB); gl.blitFramebuffer(0, 0, RT.w, RT.h, 0, 0, RT.w, RT.h, gl.COLOR_BUFFER_BIT, gl.NEAREST); }
  gl.disable(gl.DEPTH_TEST);
  let bloomOn = Q.bloom && RT.bloom;
  if (bloomOn) {
    gl.useProgram(P_DOWN.p); let src = RT.resCol, sw = RT.w, shh = RT.h;
    for (let i = 0; i < RT.bloom.length; i++) {
      const b = RT.bloom[i]; gl.bindFramebuffer(gl.FRAMEBUFFER, b.fb); gl.viewport(0, 0, b.w, b.h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.uniform4f(P_DOWN.u.uTx, 0.5 / sw, 0.5 / shh, i === 0 ? 1.6 : 0, 0);
      gl.bindVertexArray(VAO_FS); gl.drawArrays(gl.TRIANGLES, 0, 3); src = b.t; sw = b.w; shh = b.h;
    }
    gl.useProgram(P_UP.p); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = RT.bloom.length - 1; i > 0; i--) {
      const s = RT.bloom[i], d = RT.bloom[i - 1]; gl.bindFramebuffer(gl.FRAMEBUFFER, d.fb); gl.viewport(0, 0, d.w, d.h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s.t); gl.uniform4f(P_UP.u.uTx, 1 / s.w, 1 / s.h, 0, 0.9); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.BLEND);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(P_FINAL.p); gl.activeTexture(gl.TEXTURE0 + UNIT.scene); gl.bindTexture(gl.TEXTURE_2D, RT.resCol);
  gl.activeTexture(gl.TEXTURE0 + UNIT.bloom); gl.bindTexture(gl.TEXTURE_2D, bloomOn ? RT.bloom[0].t : RT.resCol);
  gl.uniform4f(P_FINAL.u.uPost, LIGHT.exposure, bloomOn ? 0.09 : 0, 0.55, (time * 60) % 97);
  gl.uniform4f(P_FINAL.u.uGrade, G.flash * 0.35, 0.02, 0, 0);
  gl.bindVertexArray(VAO_FS); gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
}
function rifleMatrix() {
  // point the rifle at the reticle; recoil kicks it back, reloading tips it down
  const a = M4.pt4(M4.invert(CAM.proj), [INPUT.rx, INPUT.ry, 1, 1]); const d = V.norm([a[0] / a[3], a[1] / a[3], a[2] / a[3]]);
  const yaw = clamp(Math.atan2(-d[0], -d[2]), -0.45, 0.45), pitch = clamp(Math.asin(clamp(d[1], -1, 1)), -0.3, 0.32);
  const rl = G.reload > 0 ? Math.sin(Math.min(1, (RELOAD_T - G.reload) / RELOAD_T) * Math.PI) : 0;
  const k = G.recoil * G.recoil;
  const base = M4.trans(0.2 + INPUT.rx * 0.05, -0.2 + INPUT.ry * 0.03 - Math.max(0, INPUT.ry) * 0.05 - rl * 0.08, -0.36 + k * 0.05);
  const M = M4.mul(base, M4.mul(M4.rotY(yaw * 0.85), M4.mul(M4.rotX(pitch * 0.85 + k * 0.12 - rl * 0.6), M4.rotZ(rl * 0.5))));
  return M4.mul(CAM.world, M);
}
