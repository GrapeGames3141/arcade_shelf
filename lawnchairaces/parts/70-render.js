// Renderer: HDR forward pipeline with planar lake reflection, two-cascade sun shadows,
// bloom, ACES tone mapping and FXAA or MSAA depending on the quality tier.
const QUALITY = {
  low:    { label: 'LOW',    scale: 0.62, dprCap: 1,   adaptive: false, msaa: 0, fxaa: true,  shadow: 0,    refl: 0.33, trees: 3000,  bloom: 4 },
  medium: { label: 'MEDIUM', scale: 0.8,  dprCap: 1.25, adaptive: false, msaa: 0, fxaa: true,  shadow: 1024, refl: 0.42, trees: 7000,  bloom: 5 },
  high:   { label: 'HIGH',   scale: 1.0,  dprCap: 1.5, adaptive: true,  msaa: 4, fxaa: false, shadow: 2048, refl: 0.5,  trees: 13000, bloom: 5, budget: 2.4e6 },
  max:    { label: 'MAX',    scale: 1.0,  dprCap: 4,   adaptive: false, msaa: 4, fxaa: false, shadow: 4096, refl: 1.0,  trees: 20000, bloom: 6 },
};
const MAX_TREES = 20000;

const R = {
  gl: null, canvas: null, q: QUALITY.high, qName: 'high',
  W: 0, H: 0, rw: 0, rh: 0, scale: 1, adaptScale: 1,
  progs: {}, meshes: {}, tex: {}, fbo: {},
  frameMs: 16, gpuOk: true, stats: {},
};

R.init = function (canvas) {
  R.canvas = canvas;
  const gl = canvas.getContext('webgl2', { antialias: false, depth: false, alpha: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: TEST });
  if (!gl) throw new Error('WebGL2 is not available in this browser.');
  R.gl = gl;
  R.extCBF = gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('OES_texture_float_linear');
  R.hdrFmt = R.extCBF ? [gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT] : [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE];
  if (!R.extCBF) logMsg('EXT_color_buffer_float missing: LDR fallback');
  const P = (vs, fs, n) => makeProgram(gl, vs, fs, n);
  R.progs.terrain = P(VS_TERRAIN, FS_TERRAIN, 'terrain');
  R.progs.tree = P(VS_TREE, FS_TREE, 'tree');
  R.progs.obj = P(VS_OBJ, FS_OBJ, 'obj');
  R.progs.balloon = P(VS_BALLOON, FS_BALLOON, 'balloon');
  R.progs.ribbon = P(VS_RIBBON, FS_RIBBON, 'ribbon');
  R.progs.sky = P(VS_FULL, FS_SKY, 'sky');
  R.progs.water = P(VS_WATER, FS_WATER, 'water');
  R.progs.part = P(VS_PART, FS_PART, 'part');
  R.progs.shObj = P(VS_SHADOW_OBJ, FS_SHADOW, 'shadowObj');
  R.progs.shBal = P(VS_SHADOW_BALLOON, FS_SHADOW, 'shadowBalloon');
  R.progs.down = P(VS_POST, FS_DOWN, 'down');
  R.progs.up = P(VS_POST, FS_UP, 'up');
  R.progs.comp = P(VS_POST, FS_COMPOSITE, 'composite');
  R.progs.fxaa = P(VS_POST, FS_FXAA, 'fxaa');
  R.buildTextures();
  R.buildStatic();
  R.setQuality(R.qName, true);
};

R.buildTextures = function () {
  const gl = R.gl;
  // tileable value noise, a different period per channel
  const N = 256, data = new Uint8Array(N * N * 4);
  const periods = [16, 32, 64, 8];
  for (let c = 0; c < 4; c++) {
    const P = periods[c], cell = N / P, seed = 100 + c * 17;
    const lat = (i, j) => hash2(((i % P) + P) % P, ((j % P) + P) % P, seed);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = 0, amp = 0.65, tot = 0;
      for (let o = 0; o < 2; o++) {
        const sc = cell / (1 << o), PP = P * (1 << o);
        const fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy);
        const ux = fx - ix, uy = fy - iy, sx = ux * ux * (3 - 2 * ux), sy = uy * uy * (3 - 2 * uy);
        const L = (i, j) => hash2(((i % PP) + PP) % PP, ((j % PP) + PP) % PP, seed + o * 5);
        v += amp * lerp(lerp(L(ix, iy), L(ix + 1, iy), sx), lerp(L(ix, iy + 1), L(ix + 1, iy + 1), sx), sy);
        tot += amp; amp *= 0.45;
      }
      data[(y * N + x) * 4 + c] = Math.round(clamp(v / tot, 0, 1) * 255);
    }
  }
  R.tex.noise = makeTex(gl, N, N, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, data, gl.LINEAR_MIPMAP_LINEAR, gl.REPEAT);
  // wave gradients: sum of tileable sine waves
  const W = 256, wd = new Float32Array(W * W * 4);
  const rng = RNG(55), waves = [];
  for (let k = 0; k < 56; k++) {
    let kx = 0, kz = 0;
    while (kx === 0 && kz === 0) { kx = rng.int(-11, 11); kz = rng.int(-7, 7); }
    const kl = Math.hypot(kx, kz);
    waves.push([kx, kz, 1 / Math.pow(kl, 1.6) * rng.range(0.5, 1), rng() * TAU]);
  }
  let gmax = 0;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    let gx = 0, gz = 0;
    const u = x / W, v = y / W;
    for (const [kx, kz, a, ph] of waves) {
      const arg = TAU * (kx * u + kz * v) + ph, c = Math.cos(arg) * a * TAU;
      gx += c * kx; gz += c * kz;
    }
    const i = (y * W + x) * 4; wd[i] = gx; wd[i + 1] = gz; gmax = Math.max(gmax, Math.abs(gx), Math.abs(gz));
  }
  for (let i = 0; i < wd.length; i += 4) { wd[i] /= gmax * 0.5; wd[i + 1] /= gmax * 0.5; }
  R.tex.wave = makeTex(gl, W, W, gl.RGBA16F, gl.RGBA, gl.FLOAT, wd, gl.LINEAR_MIPMAP_LINEAR, gl.REPEAT);
  // lake depth
  const hm = WORLD.buildHeightTex();
  R.tex.height = makeTex(gl, WORLD.hmRes, WORLD.hmRes, gl.R16F, gl.RED, gl.FLOAT, hm, gl.LINEAR, gl.CLAMP_TO_EDGE);
};

R.buildStatic = function () {
  const gl = R.gl, M = R.meshes;
  const t0 = performance.now();
  const ter = WORLD.buildTerrain(512);
  M.terrain = makeVAO(gl, ter.data, [[0, 3], [1, 3], [2, 4]], ter.idx);
  const t1 = performance.now();
  const trees = WORLD.scatterTrees(MAX_TREES);
  R.treeCounts = { nc: trees.nc, nb: trees.nb };
  M.conifer = makeVAO(gl, buildConifer(), LAYOUT_OBJ, null, trees.conifer, [[3, 3], [4, 3], [5, 3]]);
  M.broad = makeVAO(gl, buildBroadleaf(), LAYOUT_OBJ, null, trees.broad, [[3, 3], [4, 3], [5, 3]]);
  const props = buildProps();
  R.boats = props.boats;
  M.props = makeVAO(gl, props.data, LAYOUT_OBJ);
  M.boat = { row: makeVAO(gl, buildBoat('row'), LAYOUT_OBJ), canoe: makeVAO(gl, buildBoat('canoe'), LAYOUT_OBJ), fish: makeVAO(gl, buildBoat('fish'), LAYOUT_OBJ), pontoon: makeVAO(gl, buildBoat('pontoon'), LAYOUT_OBJ) };
  M.spectator = [buildSpectator([0.8, 0.25, 0.2, 0.2]), buildSpectator([0.2, 0.4, 0.75, 0.2]), buildSpectator([0.95, 0.8, 0.3, 0.2]), buildSpectator([0.3, 0.6, 0.3, 0.2])].map((d) => makeVAO(gl, d, LAYOUT_OBJ));
  M.balloon = makeVAO(gl, buildBalloon(28), LAYOUT_OBJ, null, null, [[3, 4], [4, 4], [5, 4]]);
  M.jug = makeVAO(gl, buildJug(), LAYOUT_OBJ);
  M.utube = makeVAO(gl, buildUnitTube(), LAYOUT_OBJ);
  M.usphere = makeVAO(gl, buildUnitSphere(), LAYOUT_OBJ);
  M.buoy = makeVAO(gl, buildBuoy(), LAYOUT_OBJ);
  M.blower = makeVAO(gl, buildBlower(), LAYOUT_OBJ);
  const rifle = buildRifle();
  M.rifle = makeVAO(gl, rifle.body, LAYOUT_OBJ);
  M.lever = makeVAO(gl, rifle.lever, LAYOUT_OBJ);
  R.rifleHinge = rifle.hinge;
  // water: one big quad
  const S = 9000;
  M.water = makeVAO(gl, new Float32Array([-S, 0, -S, S, 0, -S, S, 0, S, -S, 0, -S, S, 0, S, -S, 0, S]), [[0, 3]]);
  M.full = makeVAO(gl, new Float32Array([-1, -1, 3, -1, -1, 3]), [[0, 2]]);
  M.quad = makeVAO(gl, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), [[0, 2]], null, null, [[1, 4], [2, 4], [3, 4]]);
  // dynamic ribbon buffer
  const rv = gl.createVertexArray(); gl.bindVertexArray(rv);
  const rb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, rb); gl.bufferData(gl.ARRAY_BUFFER, 4, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
  gl.bindVertexArray(null);
  M.ribbon = { vao: rv, vbo: rb };
  R.stats.buildMs = Math.round(performance.now() - t0);
  R.stats.terrainMs = Math.round(t1 - t0);
  logMsg('static build ' + R.stats.buildMs + ' ms (terrain ' + R.stats.terrainMs + '), trees', trees.nc, '+', trees.nb);
};

// chair / pilot meshes per competitor (called by the game)
R.makeChairMeshes = function (look) {
  const gl = R.gl;
  const ch = buildChair(look.webA, look.webB);
  return {
    chair: makeVAO(gl, ch.data, LAYOUT_OBJ), tie: ch.tie,
    legs: makeVAO(gl, buildPilotLegs(look.pants, look.shoe), LAYOUT_OBJ),
    upper: makeVAO(gl, buildPilotUpper(look.jacket, look.skin, look.hat, look.hair), LAYOUT_OBJ),
    chest: makeVAO(gl, buildPilotChest(look.jacket), LAYOUT_OBJ),
  };
};

R.setQuality = function (name, force) {
  if (!QUALITY[name]) name = 'high';
  if (name === R.qName && !force) return;
  R.qName = name; R.q = QUALITY[name];
  R.adaptScale = 1;
  R.resize(true);
};

R.resize = function (force) {
  const gl = R.gl, q = R.q;
  const dpr = Math.min(window.devicePixelRatio || 1, q.dprCap);
  const W = Math.max(2, Math.round(R.canvas.clientWidth * dpr)), H = Math.max(2, Math.round(R.canvas.clientHeight * dpr));
  let scale = q.scale;
  if (q.adaptive) {
    const budget = q.budget || 2.4e6;
    scale = Math.min(scale, Math.sqrt(budget / (W * H))) * R.adaptScale;
    if (URLQ.get('scale')) scale = +URLQ.get('scale');
  }
  scale = clamp(scale, 0.35, 1);
  const rw = Math.max(2, Math.round(W * scale)), rh = Math.max(2, Math.round(H * scale));
  if (!force && W === R.W && H === R.H && rw === R.rw && rh === R.rh) return;
  R.W = W; R.H = H; R.rw = rw; R.rh = rh; R.scale = scale;
  R.canvas.width = W; R.canvas.height = H;
  for (const k in R.fbo) { if (Array.isArray(R.fbo[k])) R.fbo[k].forEach((f) => freeFBO(gl, f)); else freeFBO(gl, R.fbo[k]); }
  R.fbo = {};
  const F = R.fbo;
  if (q.msaa && R.extCBF) {
    const maxS = gl.getParameter(gl.MAX_SAMPLES);
    F.msaa = makeFBO(gl, rw, rh, { color: R.hdrFmt, msaa: Math.min(q.msaa, maxS) });
    F.hdr = makeFBO(gl, rw, rh, { color: R.hdrFmt, depth: null });
  } else {
    F.hdr = makeFBO(gl, rw, rh, { color: R.hdrFmt, depth: 'rb' });
  }
  const fw = Math.max(2, Math.round(rw * q.refl)), fh = Math.max(2, Math.round(rh * q.refl));
  F.refl = makeFBO(gl, fw, fh, { color: R.hdrFmt, depth: 'rb' });
  F.bloom = [];
  let bw = rw, bh = rh;
  for (let i = 0; i < q.bloom; i++) {
    bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1);
    F.bloom.push(makeFBO(gl, bw, bh, { color: R.hdrFmt }));
  }
  if (q.fxaa) F.ldr = makeFBO(gl, rw, rh, { color: [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE] });
  if (q.shadow) {
    F.shadow = makeFBO(gl, q.shadow * 2, q.shadow, { color: null, depth: 'tex' });
  }
  logMsg('resize', W + 'x' + H, 'render', rw + 'x' + rh, 'q=' + R.qName, 'msaa=' + (F.msaa ? q.msaa : 0), 'shadow=' + q.shadow);
};

// ---------- per-frame ----------
R.setCommon = function (prog, F, clip) {
  const gl = R.gl, u = prog.u, S = F.sky;
  gl.useProgram(prog.p);
  if (u.uCamPos) gl.uniform3fv(u.uCamPos, clip ? F.mirrorEye : F.cam.pos);
  if (u.uSunDir) gl.uniform3fv(u.uSunDir, S.sunDir);
  if (u.uSunCol) gl.uniform3fv(u.uSunCol, S.sunCol);
  if (u.uSkyZen) gl.uniform3fv(u.uSkyZen, S.zen);
  if (u.uSkyHor) gl.uniform3fv(u.uSkyHor, S.hor);
  if (u.uGround) gl.uniform3fv(u.uGround, S.ground);
  if (u.uFogCol) gl.uniform3fv(u.uFogCol, S.fog);
  if (u.uFogDen) gl.uniform1f(u.uFogDen, S.fogDen);
  if (u.uTime) gl.uniform1f(u.uTime, F.time);
  if (u.uClip) gl.uniform1f(u.uClip, clip ? 1 : 0);
  if (u.uCloudCov) gl.uniform1f(u.uCloudCov, S.cloud);
  if (u.uVP) gl.uniformMatrix4fv(u.uVP, false, clip ? F.mirrorVP : F.vp);
  let unit = 0;
  if (u.uNoise) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, R.tex.noise); gl.uniform1i(u.uNoise, unit); unit++; }
  if (u.uShadow) {
    const on = !!(R.fbo.shadow && F.shadowVP0 && !clip);
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, on ? R.fbo.shadow.depthTex : R.tex.noise); gl.uniform1i(u.uShadow, unit); unit++;
    gl.uniform1f(u.uShadowOn, on ? 1 : 0);
    if (on) { gl.uniformMatrix4fv(u.uShadowVP0, false, F.shadowVP0); gl.uniformMatrix4fv(u.uShadowVP1, false, F.shadowVP1); gl.uniform1f(u.uShadowRes, R.q.shadow); }
  }
  return unit;
};

R.uploadDynamic = function (F) {
  const gl = R.gl, M = R.meshes;
  gl.bindBuffer(gl.ARRAY_BUFFER, M.balloon.ivbo);
  gl.bufferData(gl.ARRAY_BUFFER, F.balloons.subarray(0, Math.max(12, F.nBalloons * 12)), gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, M.quad.ivbo);
  gl.bufferData(gl.ARRAY_BUFFER, F.parts.subarray(0, Math.max(12, F.nParts * 12)), gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, M.ribbon.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, F.ribbons.subarray(0, Math.max(7, F.nRibbonVerts * 7)), gl.DYNAMIC_DRAW);
};

R.shadowMatrices = function (F) {
  if (!R.q.shadow) { F.shadowVP0 = null; return; }
  const L = F.sky.sunDir;
  if (L[1] < 0.02) { F.shadowVP0 = null; return; }
  const mk = (center, half, res) => {
    const up = Math.abs(L[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
    const D = 260;
    let view = m4.lookAt(v3.add(center, v3.mul(L, D)), center, up);
    // snap to texels
    const tx = half * 2 / res;
    const c = m4.xform(view, center);
    const sx = Math.round(c[0] / tx) * tx - c[0], sy = Math.round(c[1] / tx) * tx - c[1];
    view[12] += sx; view[13] += sy;
    const proj = m4.ortho(-half, half, -half, half, 1, D * 2);
    return m4.mul(proj, view);
  };
  F.shadowVP0 = mk(F.shadowCenter0, F.shadowHalf0, R.q.shadow);
  F.shadowVP1 = mk(F.shadowCenter1, F.shadowHalf1, R.q.shadow);
};

R.drawShadows = function (F) {
  const gl = R.gl, M = R.meshes, f = R.fbo.shadow;
  if (!f || !F.shadowVP0) return;
  gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb);
  gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LESS);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3);
  const res = R.q.shadow;
  for (let c = 0; c < 2; c++) {
    const vp = c === 0 ? F.shadowVP0 : F.shadowVP1;
    gl.viewport(c * res, 0, res, res);
    const po = R.progs.shObj; gl.useProgram(po.p);
    gl.uniformMatrix4fv(po.u.uLightVP, false, vp);
    for (const o of F.objects) {
      if (o.noShadow) continue;
      gl.uniformMatrix4fv(po.u.uModel, false, o.model);
      drawMesh(gl, o.mesh);
    }
    const pb = R.progs.shBal; gl.useProgram(pb.p);
    gl.uniformMatrix4fv(pb.u.uLightVP, false, vp);
    drawMesh(gl, M.balloon, F.nBalloons);
  }
  gl.disable(gl.POLYGON_OFFSET_FILL);
};

R.drawScene = function (F, mirror) {
  const gl = R.gl, M = R.meshes, P = R.progs;
  // terrain
  R.setCommon(P.terrain, F, mirror);
  drawMesh(gl, M.terrain);
  // trees
  const nTrees = mirror ? Math.floor(R.q.trees * 0.6) : R.q.trees;
  const frac = nTrees / MAX_TREES;
  R.setCommon(P.tree, F, mirror);
  gl.uniform1f(P.tree.u.uWS, 1.6);
  drawMesh(gl, M.conifer, Math.min(R.treeCounts.nc, Math.ceil(R.treeCounts.nc * frac)));
  gl.uniform1f(P.tree.u.uWS, 1.6);
  drawMesh(gl, M.broad, Math.min(R.treeCounts.nb, Math.ceil(R.treeCounts.nb * frac)));
  // objects
  const po = P.obj;
  R.setCommon(po, F, mirror);
  gl.uniformMatrix4fv(po.u.uModel, false, m4.ident());
  gl.uniform4f(po.u.uTint, 1, 1, 1, 1);
  drawMesh(gl, M.props);
  for (const o of F.objects) {
    if (o.fp) continue;
    gl.uniformMatrix4fv(po.u.uModel, false, o.model);
    const t = o.tint || [1, 1, 1, 1];
    gl.uniform4f(po.u.uTint, t[0], t[1], t[2], t[3]);
    drawMesh(gl, o.mesh);
  }
  // balloons
  R.setCommon(P.balloon, F, mirror);
  drawMesh(gl, M.balloon, F.nBalloons);
  // sky last among opaques
  gl.depthFunc(gl.LEQUAL); gl.depthMask(false);
  R.setCommon(P.sky, F, mirror);
  gl.uniformMatrix4fv(P.sky.u.uInvVP, false, m4.invert(mirror ? F.mirrorVP : F.vp));
  drawMesh(gl, M.full);
  gl.depthFunc(gl.LESS);
  // ribbons (alpha)
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  if (F.nRibbonVerts) {
    R.setCommon(P.ribbon, F, mirror);
    gl.bindVertexArray(M.ribbon.vao);
    gl.drawArrays(gl.TRIANGLES, 0, F.nRibbonVerts);
  }
  if (!mirror) {
    // lake surface
    const pw = P.water;
    let unit = R.setCommon(pw, F, false);
    const bind = (name, tex) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(pw.u[name], unit); unit++; };
    bind('uRefl', R.fbo.refl.tex); bind('uWave', R.tex.wave); bind('uHeight', R.tex.height);
    gl.uniform4f(pw.u.uHRect, WORLD.hmRect[0], WORLD.hmRect[1], WORLD.hmRect[2], 0);
    gl.uniform2f(pw.u.uRes, R.rw, R.rh);
    gl.uniform1f(pw.u.uWaveAmp, F.sky.waveAmp);
    gl.uniform4fv(pw.u.uRipples, F.ripples);
    gl.uniform3fv(pw.u.uWaterDeep, F.sky.waterDeep);
    gl.depthMask(true);
    drawMesh(gl, M.water);
    gl.depthMask(false);
  }
  // particles
  if (F.nParts) {
    const pp = P.part;
    R.setCommon(pp, F, mirror);
    gl.uniform3fv(pp.u.uCamRight, F.cam.right); gl.uniform3fv(pp.u.uCamUp, F.cam.up);
    drawMesh(gl, M.quad, F.nParts);
  }
  gl.disable(gl.BLEND); gl.depthMask(true);
  // first-person pass: own chair, legs and rifle with a close near plane
  if (!mirror && F.fpVP && F.objects.some((o) => o.fp)) {
    gl.clear(gl.DEPTH_BUFFER_BIT);
    R.setCommon(po, F, false);
    gl.uniformMatrix4fv(po.u.uVP, false, F.fpVP);
    let cur = null;
    for (const o of F.objects) {
      if (!o.fp) continue;
      const vp = o.vm && F.vmVP ? F.vmVP : F.fpVP;
      if (vp !== cur) { gl.uniformMatrix4fv(po.u.uVP, false, vp); cur = vp; }
      gl.uniformMatrix4fv(po.u.uModel, false, o.model);
      const t = o.tint || [1, 1, 1, 1];
      gl.uniform4f(po.u.uTint, t[0], t[1], t[2], t[3]);
      drawMesh(gl, o.mesh);
    }
  }
};

R.render = function (F) {
  const gl = R.gl, Fb = R.fbo, M = R.meshes, P = R.progs;
  const t0 = performance.now();
  R.uploadDynamic(F);
  R.shadowMatrices(F);
  gl.disable(gl.CULL_FACE);
  R.drawShadows(F);
  // reflection
  gl.bindFramebuffer(gl.FRAMEBUFFER, Fb.refl.fb);
  gl.viewport(0, 0, Fb.refl.w, Fb.refl.h);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LESS);
  gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  R.drawScene(F, true);
  // main
  const main = Fb.msaa || Fb.hdr;
  gl.bindFramebuffer(gl.FRAMEBUFFER, main.fb);
  gl.viewport(0, 0, R.rw, R.rh);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  R.drawScene(F, false);
  if (Fb.msaa) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, Fb.msaa.fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, Fb.hdr.fb);
    gl.blitFramebuffer(0, 0, R.rw, R.rh, 0, 0, R.rw, R.rh, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  }
  // bloom
  gl.disable(gl.DEPTH_TEST);
  const B = Fb.bloom;
  let src = Fb.hdr;
  for (let i = 0; i < B.length; i++) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, B[i].fb); gl.viewport(0, 0, B[i].w, B[i].h);
    const p = P.down; gl.useProgram(p.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.uniform1i(p.u.uTex, 0);
    gl.uniform2f(p.u.uTexel, 1 / src.w, 1 / src.h);
    gl.uniform1f(p.u.uThresh, i === 0 ? 1.1 : 0);
    drawMesh(gl, M.full);
    src = B[i];
  }
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  for (let i = B.length - 2; i >= 0; i--) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, B[i].fb); gl.viewport(0, 0, B[i].w, B[i].h);
    const p = P.up; gl.useProgram(p.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, B[i + 1].tex); gl.uniform1i(p.u.uTex, 0);
    gl.uniform2f(p.u.uTexel, 1 / B[i + 1].w, 1 / B[i + 1].h);
    gl.uniform1f(p.u.uGain, 1.0);
    drawMesh(gl, M.full);
  }
  gl.disable(gl.BLEND);
  // composite
  const toLdr = !!Fb.ldr;
  gl.bindFramebuffer(gl.FRAMEBUFFER, toLdr ? Fb.ldr.fb : null);
  gl.viewport(0, 0, toLdr ? R.rw : R.W, toLdr ? R.rh : R.H);
  const pc = P.comp; gl.useProgram(pc.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, Fb.hdr.tex); gl.uniform1i(pc.u.uHDR, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, B.length ? B[0].tex : Fb.hdr.tex); gl.uniform1i(pc.u.uBloom, 1);
  gl.uniform1f(pc.u.uExposure, F.sky.exposure);
  gl.uniform1f(pc.u.uBloomAmt, B.length ? 0.08 : 0);
  gl.uniform1f(pc.u.uVignette, 0.55);
  gl.uniform3fv(pc.u.uGrade, F.sky.grade);
  gl.uniform1f(pc.u.uDamage, F.damage || 0);
  drawMesh(gl, M.full);
  if (toLdr) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, R.W, R.H);
    const pf = P.fxaa; gl.useProgram(pf.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, Fb.ldr.tex); gl.uniform1i(pf.u.uTex, 0);
    gl.uniform2f(pf.u.uTexel, 1 / R.rw, 1 / R.rh);
    drawMesh(gl, M.full);
  }
  R.stats.cpuMs = performance.now() - t0;
};

// Adaptive render scale for the HIGH tier
R.adapt = function (fps) {
  if (!R.q.adaptive || URLQ.get('scale')) return;
  // change the scale at most every few seconds, so render targets aren't rebuilt constantly
  R.adaptCd = (R.adaptCd || 0) - 1;
  if (R.adaptCd > 0) return;
  const old = R.adaptScale;
  if (fps < 45) R.adaptScale = Math.max(0.6, R.adaptScale - 0.08);
  else if (fps > 58) R.adaptScale = Math.min(1, R.adaptScale + 0.04);
  if (Math.abs(old - R.adaptScale) > 0.01) { R.resize(true); R.adaptCd = 3; }
};
