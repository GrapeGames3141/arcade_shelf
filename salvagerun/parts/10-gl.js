// ---------- WebGL2 context, quality tiers, programs, render targets ----------
const cv = $('gl');
const gl = cv.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: TEST });
if (!gl) { document.body.innerHTML = '<div style="color:#fff;font:18px sans-serif;padding:40px">Salvage Run needs a browser with WebGL2.</div>'; throw new Error('no webgl2'); }
const EXT_CBF = gl.getExtension('EXT_color_buffer_float');
const EXT_CBHF = EXT_CBF ? null : gl.getExtension('EXT_color_buffer_half_float');
gl.getExtension('OES_texture_float_linear');
const HDR = !!(EXT_CBF || EXT_CBHF) && !QS.has('nohdr');
const HDR_FMT = HDR ? gl.RGBA16F : gl.RGBA8, HDR_TYPE = HDR ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || QS.has('touch');

// Quality tiers. MAX trades nothing away; HIGH carries the smoothing measures
// (pixel budget, adaptive render scale, lighter distant field, 3x3 PCF).
const QUALITY = [
  { name: 'LOW', dpr: 1, scale: 0.75, msaa: 0, shadow: 0, pcf: 0, bloom: 4, neb: 320, field: 0.35, gas: 0.4, parts: 2200, motes: 500, budget: 1.0e6, adaptive: false, ca: 0 },
  { name: 'MEDIUM', dpr: 1.25, scale: 1, msaa: 4, shadow: 1024, pcf: 1, bloom: 5, neb: 512, field: 0.6, gas: 0.65, parts: 3800, motes: 1000, budget: 2.2e6, adaptive: false, ca: 0 },
  { name: 'HIGH', dpr: 2, scale: 1, msaa: 4, shadow: 2048, pcf: 1, bloom: 6, neb: 768, field: 0.8, gas: 0.85, parts: 5500, motes: 1500, budget: 3.4e6, adaptive: true, ca: 1 },
  { name: 'MAX', dpr: 99, scale: 1, msaa: 8, shadow: 4096, pcf: 2, bloom: 7, neb: 1024, field: 1, gas: 1, parts: 7500, motes: 2200, budget: 1e12, adaptive: false, ca: 1 }
];
let QI = clamp(+(QS.get('q') !== null ? ({ low: 0, medium: 1, med: 1, high: 2, max: 3 })[QS.get('q')] ?? QS.get('q') : SAVE.get('quality', IS_TOUCH ? 1 : 2)), 0, 3) | 0;
let QL = QUALITY[QI];

function compile(vs, fs, name) {
  const mk = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s); const lines = src.split('\n');
      console.error(name + ' shader error: ' + log + '\n' + lines.map((l, i) => (i + 1) + ': ' + l).join('\n').slice(0, 6000)); throw new Error('shader ' + name);
    }
    return s;
  };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(name + ' link: ' + gl.getProgramInfoLog(p)); throw new Error('link ' + name); }
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const nm = info.name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, info.name); }
  return { p, u, name };
}

// texture helpers
function mkTex(w, h, ifmt, fmt, type, filter = gl.LINEAR, wrap = gl.CLAMP_TO_EDGE) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  return t;
}
function mkFB(tex, depthRB) {
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  if (tex) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  if (depthRB) gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRB);
  return f;
}

// Render targets: MSAA HDR scene -> resolved HDR texture -> bloom chain -> composite to canvas.
const RT = { w: 0, h: 0, samples: 0, scale: 1 };
function maxSamplesFor(fmt) {
  try { const s = gl.getInternalformatParameter(gl.RENDERBUFFER, fmt, gl.SAMPLES); if (s && s.length) return Math.max(...s); } catch (e) { }
  return gl.getParameter(gl.MAX_SAMPLES) || 0;
}
function freeRT() {
  for (const k of ['msFB', 'resFB', 'noMsFB']) if (RT[k]) gl.deleteFramebuffer(RT[k]);
  for (const k of ['msCol', 'msDep']) if (RT[k]) gl.deleteRenderbuffer(RT[k]);
  if (RT.resTex) gl.deleteTexture(RT.resTex);
  if (RT.bloom) for (const b of RT.bloom) { gl.deleteTexture(b.t); gl.deleteFramebuffer(b.f); }
  RT.bloom = null;
}
function buildRT(w, h) {
  freeRT(); RT.w = w; RT.h = h;
  const want = QS.has('msaa') ? +QS.get('msaa') : QL.msaa;
  RT.samples = Math.min(want, maxSamplesFor(HDR_FMT));
  RT.resTex = mkTex(w, h, HDR_FMT, gl.RGBA, HDR_TYPE);
  RT.resFB = mkFB(RT.resTex, null);
  RT.msDep = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, RT.msDep);
  if (RT.samples > 0) {
    RT.msCol = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, RT.msCol);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, RT.samples, HDR_FMT, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, RT.msDep); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, RT.samples, gl.DEPTH_COMPONENT24, w, h);
    RT.msFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, RT.msFB);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, RT.msCol);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, RT.msDep);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { console.warn('MSAA target incomplete, falling back'); RT.samples = 0; }
  }
  if (RT.samples === 0) {
    gl.bindRenderbuffer(gl.RENDERBUFFER, RT.msDep); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    RT.noMsFB = mkFB(RT.resTex, RT.msDep);
  }
  RT.sceneFB = RT.samples > 0 ? RT.msFB : RT.noMsFB;
  RT.bloom = []; let bw = w >> 1, bh = h >> 1;
  for (let i = 0; i < QL.bloom && bw >= 4 && bh >= 4; i++) {
    const t = mkTex(bw, bh, HDR_FMT, gl.RGBA, HDR_TYPE); RT.bloom.push({ t, f: mkFB(t, null), w: bw, h: bh }); bw >>= 1; bh >>= 1;
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// Shadow map (sun, orthographic)
const SHADOW = { size: 0 };
function buildShadow() {
  if (SHADOW.tex) { gl.deleteTexture(SHADOW.tex); gl.deleteFramebuffer(SHADOW.fb); SHADOW.tex = null; }
  SHADOW.size = QL.shadow; if (!SHADOW.size) return;
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHADOW.size, SHADOW.size);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t, 0);
  gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
  SHADOW.tex = t; SHADOW.fb = f; gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
// a 1x1 dummy depth texture so the shadow sampler is always valid
const DUMMY_SHADOW = (() => {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, 1, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return t;
})();

// fixed texture units: 0 = per-pass input, 1 = shadow map, 2 = nebula cubemap, 3 = bloom
const TU = { IN: 0, SHADOW: 1, NEB: 2, BLOOM: 3 };
const FSQ = gl.createVertexArray(); // fullscreen triangle uses gl_VertexID

// canvas sizing with DPR cap, pixel budget and adaptive scale (HIGH)
const VIEW = { cssW: 1, cssH: 1, w: 1, h: 1, dpr: 1, adapt: 1 };
function resize(force) {
  const cw = Math.max(1, innerWidth), ch = Math.max(1, innerHeight);
  let dpr = Math.min(devicePixelRatio || 1, QL.dpr);
  if (cw * ch * dpr * dpr > QL.budget) dpr = Math.sqrt(QL.budget / (cw * ch));
  dpr = Math.max(0.5, dpr);
  const w = Math.round(cw * dpr), h = Math.round(ch * dpr);
  if (!force && w === VIEW.w && h === VIEW.h) return false;
  VIEW.cssW = cw; VIEW.cssH = ch; VIEW.dpr = dpr; VIEW.w = w; VIEW.h = h;
  cv.width = w; cv.height = h; cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  rebuildScene();
  return true;
}
function rebuildScene() {
  const sc = QL.scale * (QL.adaptive ? VIEW.adapt : 1);
  const sw = Math.max(16, Math.round(VIEW.w * sc)), sh = Math.max(16, Math.round(VIEW.h * sc));
  if (sw !== RT.w || sh !== RT.h || !RT.resTex) buildRT(sw, sh);
}
