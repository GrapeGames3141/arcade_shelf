// ---------- frame rendering: shadow, sky, meshes, splats, particles, bloom, composite ----------
const PROG = {};
function initPrograms() {
  PROG.mesh = compile(VS_MESH, FS_MESH, 'mesh');
  PROG.shadow = compile(VS_SHADOW, FS_SHADOW, 'shadow');
  PROG.sky = compile(VS_FSQ, FS_SKY, 'sky');
  PROG.splat = compile(VS_SPLAT, FS_SPLAT, 'splat');
  PROG.part = compile(VS_PART, FS_PART, 'part');
  PROG.mote = compile(VS_MOTE, FS_MOTE, 'mote');
  PROG.down = compile(VS_FSQ, FS_DOWN, 'down');
  PROG.up = compile(VS_FSQ, FS_UP, 'up');
  PROG.comp = compile(VS_FSQ, FS_COMP, 'comp');
  gl.useProgram(PROG.mesh.p); gl.uniform1i(PROG.mesh.u.uShadow, TU.SHADOW);
  gl.useProgram(PROG.sky.p); gl.uniform1i(PROG.sky.u.uNeb, TU.NEB);
  gl.useProgram(PROG.down.p); gl.uniform1i(PROG.down.u.uTex, TU.IN);
  gl.useProgram(PROG.up.p); gl.uniform1i(PROG.up.u.uTex, TU.IN);
  gl.useProgram(PROG.comp.p); gl.uniform1i(PROG.comp.u.uScene, TU.IN); gl.uniform1i(PROG.comp.u.uBloom, TU.BLOOM);
}
const RSTAT = { static: 0, inst: 0, parts: 0, ms: 0 };
function drawTug() {
  if (G.phase === 'results' && TUG.dead) return;
  const fl = Math.max(0, 1 - (G.t - (TUG.hitT || -9)) * 4);
  inst('tug', TUG.W, TUG.q, 1, [1, 1, 1], 2, 1, fl * 0.6, 0.5, 0.65);
  const tp = vadd(TUG.W, qrot(TUG.q, TUG_TURRET));
  inst('turret', tp, TUG.turQ || TUG.q, 1, [1, 1, 1], 2, 1, fl * 0.6, 0.7, 0.6);
  if (TUG.dead) return;
  const f = qrot(TUG.q, [0, 0, 1]), thr = 0.75 + 0.25 * Math.sin(G.t * 40) + (TUG.v > 30 ? 0.3 : 0);
  for (const s of [-1, 1]) {
    const n = vadd(TUG.W, qrot(TUG.q, [s * 2.35, -0.1, -4.9]));
    sprite(n, null, 0.95 * thr, 0.95 * thr, [1.1, 1.9, 3.4], 1, 0);
    sprite(vmad(n, f, -1.6), vscl(f, -3.0 * thr), 0.38, 0.38, [0.8, 1.5, 3], 0.9, 2);
  }
  for (const s of [-1, 1]) sprite(vadd(TUG.W, qrot(TUG.q, [s * 1.25, 0.85, 2.7])), null, 0.7, 0.7, [4, 3.8, 3.2], 0.8, 0);
  const blink = Math.floor(G.t * 1.3) % 2;
  if (blink) { sprite(vadd(TUG.W, qrot(TUG.q, [1.76, 0.25, 1.6])), null, 0.6, 0.6, [5, 0.6, 0.4], 1, 0); sprite(vadd(TUG.W, qrot(TUG.q, [-1.76, 0.25, 1.6])), null, 0.6, 0.6, [0.4, 5, 1], 1, 0); }
  if (TUG.hull < 35 && frnd() < 0.35) spawnP({ p: vadd(TUG.W, qrot(TUG.q, [frr(-1.5, 1.5), 1, frr(-2, 1)])), v: vadd(TUG.vel, vscl(randDir(frnd), 3)), life: 0.8, s0: 0.4, s1: 1.6, c0: [0.25, 0.22, 0.2], c1: [0.05, 0.05, 0.05], a0: 0.6, a1: 0, shape: 3 });
}
function lightUniforms(pr) {
  const L = [];
  for (const l of LIGHTS) { const k = l.life / l.max; L.push({ p: l.p, c: vscl(l.col, k), r: l.r, w: vlen(l.col) * k / (1 + vdist(l.p, CAM.eye) * 0.01) }); }
  if (!TUG.dead) { const n = vadd(TUG.W, qrot(TUG.q, [0, 0, -6])); L.push({ p: n, c: [1.2, 2.2, 4], r: 16, w: 99 }); }
  if (BOSS.active && BOSS.core && BOSS.core.alive && BOSS.phase === 3) L.push({ p: BOSS.core.W, c: [9, 3, 5], r: 60, w: 98 });
  if (BOSS.active && BOSS.mawP && BOSS.phase === 2) L.push({ p: BOSS.mawP, c: [1, 4, 3], r: 40, w: 97 });
  L.sort((a, b) => b.w - a.w);
  const n = Math.min(16, L.length), P = new Float32Array(64), C = new Float32Array(64);
  for (let i = 0; i < n; i++) { P.set([L[i].p[0], L[i].p[1], L[i].p[2], L[i].r], i * 4); C.set([L[i].c[0], L[i].c[1], L[i].c[2], 0], i * 4); }
  gl.uniform4fv(pr.u.uPL, P); gl.uniform4fv(pr.u.uPC, C); gl.uniform1i(pr.u.uNPL, n);
}
function bindTex(unit, target, tex) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(target, tex); }
function fsq() { gl.bindVertexArray(FSQ); gl.drawArrays(gl.TRIANGLES, 0, 3); }
function renderFrame() {
  const t0 = performance.now();
  batchReset(); PT.ns = 0;
  drawTug(); drawEntities(); drawBossMeshes(); drawWeapons(); packParticles();
  batchUpload();
  if (BOSS.active) buildTentGeo(); else TENT_GEO.n = 0;
  RSTAT.inst = BATCH.total; RSTAT.parts = PT.ns;
  const env = envAt(TUG.s), sun = SKY.sunDir;
  const sCam = TUG.s, s0 = sCam - 450, s1 = sCam + (BOSS.active ? 2100 : 1700);
  CULL_STATE = -1;
  // ---- shadow map ----
  let shadowVP = null;
  if (SHADOW.tex) {
    const f = TUG.frame; let c = vmad(TUG.W, f.T, 60);
    if (BOSS.active) c = vlerp(TUG.W, WRECK.c, 0.55);
    const S = BOSS.active ? 150 : 115;
    const view = M4.look(vmad(c, sun, 500), c, Math.abs(sun[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0]);
    // snap to texels to stop shimmering
    const tx = 2 * S / SHADOW.size; view[12] = Math.round(view[12] / tx) * tx; view[13] = Math.round(view[13] / tx) * tx;
    shadowVP = M4.mul(M4.ortho(-S, S, -S, S, 1, 1100), view);
    gl.bindFramebuffer(gl.FRAMEBUFFER, SHADOW.fb); gl.viewport(0, 0, SHADOW.size, SHADOW.size);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 3);
    gl.useProgram(PROG.shadow.p); gl.uniformMatrix4fv(PROG.shadow.u.uVP, false, shadowVP);
    drawBatch(true); drawStatic(sCam - 150, sCam + 320, true);
    if (TENT_GEO.n) { gl.bindVertexArray(DYNMESH.vao); setCull(false); gl.drawElementsInstanced(gl.TRIANGLES, TENT_GEO.count, gl.UNSIGNED_INT, 0, 1); }
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }
  // ---- scene ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, RT.sceneFB); gl.viewport(0, 0, RT.w, RT.h);
  gl.clearColor(0, 0, 0, 1); gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // sky
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND); setCull(false);
  { const pr = PROG.sky; gl.useProgram(pr.p);
    const vr = M4.look([0, 0, 0], vsub(CAM.at, CAM.eye), CAM.up); gl.uniformMatrix4fv(pr.u.uInvVP, false, M4.inv(M4.mul(CAM.proj, vr)));
    bindTex(TU.NEB, gl.TEXTURE_CUBE_MAP, NEB.tex);
    gl.uniform3fv(pr.u.uSunDir, sun); gl.uniform3fv(pr.u.uSunCol, env.sun); gl.uniform3fv(pr.u.uPlanetDir, SKY.planetDir); gl.uniform3fv(pr.u.uPlanetAx, SKY.planetAx);
    gl.uniform3fv(pr.u.uRingN, SKY.ringN); gl.uniform3fv(pr.u.uBandN, SKY.bandN); gl.uniform1f(pr.u.uPlanetR, env.planetR);
    gl.uniform1f(pr.u.uPixAng, CAM.fov / RT.h); gl.uniform1f(pr.u.uTime, G.t); gl.uniform1f(pr.u.uNebGain, env.neb); gl.uniform1f(pr.u.uStarGain, env.star);
    fsq(); }
  // meshes
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LEQUAL);
  { const pr = PROG.mesh; gl.useProgram(pr.p);
    gl.uniformMatrix4fv(pr.u.uVP, false, CAM.vp); gl.uniform3fv(pr.u.uCam, CAM.eye); gl.uniform3fv(pr.u.uSunDir, sun); gl.uniform3fv(pr.u.uSunCol, env.sun);
    gl.uniform3fv(pr.u.uAmbA, env.ambA); gl.uniform3fv(pr.u.uAmbB, env.ambB); gl.uniform3fv(pr.u.uAmbDir, vnorm([0.3, 0.8, 0.5])); gl.uniform3fv(pr.u.uHaze, env.haze); gl.uniform1f(pr.u.uHazeDen, env.hazeDen);
    gl.uniform1f(pr.u.uTime, G.t); gl.uniform1f(pr.u.uUseUV, 0); gl.uniform1f(pr.u.uFadeFar, BOSS.active ? 4000 : 1750);
    bindTex(TU.SHADOW, gl.TEXTURE_2D, SHADOW.tex || DUMMY_SHADOW);
    gl.uniform1f(pr.u.uShadowOn, shadowVP ? 1 : 0); if (shadowVP) gl.uniformMatrix4fv(pr.u.uShadowVP, false, shadowVP);
    gl.uniform1f(pr.u.uShadowTexel, 1 / (SHADOW.size || 1)); gl.uniform1i(pr.u.uPCF, QL.pcf);
    lightUniforms(pr);
    RSTAT.static = drawStatic(s0, s1, false);
    drawBatch(false);
    if (TENT_GEO.n) { gl.uniform1f(pr.u.uUseUV, 1); gl.bindVertexArray(DYNMESH.vao); setCull(false); gl.drawElementsInstanced(gl.TRIANGLES, TENT_GEO.count, gl.UNSIGNED_INT, 0, 1); gl.uniform1f(pr.u.uUseUV, 0); }
  }
  // additive splats: gas, motes, particles
  gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); setCull(false);
  if (GAS.S && GAS.S.n) {
    const pr = PROG.splat; gl.useProgram(pr.p);
    gl.uniformMatrix4fv(pr.u.uVP, false, CAM.vp); gl.uniform3fv(pr.u.uCam, CAM.eye); gl.uniform3fv(pr.u.uCR, CAM.right); gl.uniform3fv(pr.u.uCU, CAM.upv);
    gl.uniform1f(pr.u.uTime, G.t); gl.uniform1f(pr.u.uMode, 0); gl.uniform1f(pr.u.uFar, 1500); gl.uniform1f(pr.u.uGain, 1.6); gl.uniform1f(pr.u.uAbsorb, 0);
    const a = lowerBound(GAS.S.keys, sCam - 300), b = lowerBound(GAS.S.keys, sCam + 1600);
    if (b > a) { gl.bindVertexArray(GAS.S.vao); pointSplatAttribs(GAS.S, a); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, b - a); }
  }
  if (MOTES.n && G.phase !== 'results') {
    const pr = PROG.mote; gl.useProgram(pr.p);
    gl.uniformMatrix4fv(pr.u.uVP, false, CAM.vp); gl.uniform3fv(pr.u.uCam, CAM.eye); gl.uniform3fv(pr.u.uVel, TUG.vel); gl.uniform3fv(pr.u.uMoteCol, env.mote); gl.uniform1f(pr.u.uBox, 140);
    gl.bindVertexArray(MOTES.vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, MOTES.n);
  }
  if (PT.ns) {
    const pr = PROG.part; gl.useProgram(pr.p);
    gl.uniformMatrix4fv(pr.u.uVP, false, CAM.vp); gl.uniform3fv(pr.u.uCam, CAM.eye); gl.uniform3fv(pr.u.uCR, CAM.right); gl.uniform3fv(pr.u.uCU, CAM.upv);
    gl.bindVertexArray(PT.vao); gl.bindBuffer(gl.ARRAY_BUFFER, PT.b); gl.bufferData(gl.ARRAY_BUFFER, PT.spr.subarray(0, PT.ns * 16), gl.STREAM_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, PT.ns);
  }
  gl.disable(gl.BLEND); gl.depthMask(true);
  // ---- resolve ----
  if (RT.samples > 0) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, RT.msFB); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, RT.resFB);
    gl.blitFramebuffer(0, 0, RT.w, RT.h, 0, 0, RT.w, RT.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  }
  gl.disable(gl.DEPTH_TEST);
  // ---- bloom ----
  const B = RT.bloom;
  if (B.length) {
    gl.useProgram(PROG.down.p);
    for (let i = 0; i < B.length; i++) {
      const src = i === 0 ? RT.resTex : B[i - 1].t, sw = i === 0 ? RT.w : B[i - 1].w, sh = i === 0 ? RT.h : B[i - 1].h;
      gl.bindFramebuffer(gl.FRAMEBUFFER, B[i].f); gl.viewport(0, 0, B[i].w, B[i].h);
      bindTex(TU.IN, gl.TEXTURE_2D, src); gl.uniform2f(PROG.down.u.uTexel, 1 / sw, 1 / sh); gl.uniform1f(PROG.down.u.uFirst, i === 0 ? 1 : 0); gl.uniform1f(PROG.down.u.uThresh, 1.0);
      fsq();
    }
    gl.useProgram(PROG.up.p); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = B.length - 1; i > 0; i--) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, B[i - 1].f); gl.viewport(0, 0, B[i - 1].w, B[i - 1].h);
      bindTex(TU.IN, gl.TEXTURE_2D, B[i].t); gl.uniform2f(PROG.up.u.uTexel, 1 / B[i].w, 1 / B[i].h); gl.uniform1f(PROG.up.u.uRad, 1); gl.uniform1f(PROG.up.u.uW, 0.85);
      fsq();
    }
    gl.disable(gl.BLEND);
  }
  // ---- composite ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, VIEW.w, VIEW.h);
  { const pr = PROG.comp; gl.useProgram(pr.p);
    bindTex(TU.IN, gl.TEXTURE_2D, RT.resTex); bindTex(TU.BLOOM, gl.TEXTURE_2D, B.length ? B[0].t : RT.resTex);
    gl.uniform1f(pr.u.uHasBloom, B.length ? 1 : 0); gl.uniform1f(pr.u.uBloomStr, 0.085); gl.uniform1f(pr.u.uExpo, env.expo); gl.uniform1f(pr.u.uTime, G.t);
    gl.uniform1f(pr.u.uFlash, G.flash); gl.uniform3fv(pr.u.uFlashCol, [1.4, 0.12, 0.05]); gl.uniform1f(pr.u.uCA, QL.ca); gl.uniform1f(pr.u.uVig, 0.4); gl.uniform1f(pr.u.uGrain, 0.022);
    gl.uniform2f(pr.u.uRes, VIEW.w, VIEW.h);
    fsq(); }
  gl.bindVertexArray(null);
  RSTAT.ms = performance.now() - t0;
}
