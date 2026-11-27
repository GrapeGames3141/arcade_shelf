// ===== WebGL2 setup, quality tiers, programs, frame uniform block, render targets =====
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: TEST });
if (!gl) { document.getElementById('nogl').style.display = 'flex'; throw new Error('WebGL2 unavailable'); }
const EXT_CBF = gl.getExtension('EXT_color_buffer_float');
gl.getExtension('OES_texture_float_linear');
const MAXSAMP = gl.getParameter(gl.MAX_SAMPLES) || 0;
const MAXTEX = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
const IS_TOUCH = URLQ.has('touch') || (!URLQ.has('desktop') && matchMedia('(pointer: coarse)').matches);

// Quality tiers. MAX trades nothing away; HIGH carries the smoothing measures (adaptive render scale, lighter distant splats).
const QUALITY = [
  { name: 'LOW', dpr: 1, scale: 0.7, msaa: 0, shadow: 0, bloom: 0, veg: 0.32, far: 260, adaptive: 0, canopySh: 0, thin: 1, pcf: 0 },
  { name: 'MEDIUM', dpr: 1, scale: 0.85, msaa: 4, shadow: 1024, bloom: 1, veg: 0.6, far: 330, adaptive: 0, canopySh: 0, thin: 1, pcf: 1 },
  { name: 'HIGH', dpr: 1.5, scale: 1, msaa: 4, shadow: 2048, bloom: 1, veg: 1, far: 420, adaptive: 1, canopySh: 1, thin: 1, pcf: 1 },
  { name: 'MAX', dpr: 2, scale: 1, msaa: 4, shadow: 4096, bloom: 1, veg: 1, far: 480, adaptive: 0, canopySh: 1, thin: 0, pcf: 2 },
];
const QNAMES = { low: 0, medium: 1, med: 1, high: 2, max: 3 };
let QI = URLQ.has('q') ? (QNAMES[URLQ.get('q')] ?? 2) : SAVE.get('quality', IS_TOUCH ? 1 : 2);
let Q = QUALITY[QI];
let renderScale = 1;               // adaptive scale (HIGH only)
const PIN_SCALE = URLQ.has('scale') ? parseFloat(URLQ.get('scale')) : 0;

// ---- frame uniform block: generated from one list so GLSL and byte offsets never drift ----
const FRAME_FIELDS = [['uVP', 16], ['uView', 16], ['uShVP', 16], ['uCam', 4], ['uSunDir', 4], ['uSunCol', 4], ['uSky', 4], ['uGnd', 4], ['uFog', 4], ['uFog2', 4], ['uWind', 4], ['uScr', 4], ['uMisc', 4], ['uCamR', 4], ['uCamU', 4]];
const FRAME = {}; let FRAME_SIZE = 0;
for (const [n, c] of FRAME_FIELDS) { FRAME[n] = FRAME_SIZE; FRAME_SIZE += c; }
const FRAME_DATA = new Float32Array(FRAME_SIZE);
const FRAME_GLSL = 'layout(std140) uniform Frame {\n' + FRAME_FIELDS.map(([n, c]) => `  ${c === 16 ? 'mat4' : 'vec4'} ${n};`).join('\n') + '\n};\n';
const frameUBO = gl.createBuffer();
gl.bindBuffer(gl.UNIFORM_BUFFER, frameUBO); gl.bufferData(gl.UNIFORM_BUFFER, FRAME_SIZE * 4, gl.DYNAMIC_DRAW);
gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, frameUBO);
function setF(name, arr) { FRAME_DATA.set(arr, FRAME[name]); }

// fixed texture units: 0 per-draw, 1 shadow map, 2 scene colour, 3 bloom, 4 misc
const UNIT = { tex: 0, shadow: 1, scene: 2, bloom: 3, misc: 4 };

const PROGS = [];
function compile(type, src, name) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s); console.error('shader ' + name + ':\n' + log);
    const lines = src.split('\n'); const m = /0:(\d+)/.exec(log); if (m) { const l = +m[1]; console.error(lines.slice(Math.max(0, l - 4), l + 2).map((x, i) => (l - 3 + i) + ': ' + x).join('\n')); }
    throw new Error('shader compile failed: ' + name);
  }
  return s;
}
function program(name, vs, fs, opt = {}) {
  const head = '#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2DShadow;\n';
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, head + (opt.vhead || '') + FRAME_GLSL + GLSL_COMMON + vs, name + '.vs'));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, head + (opt.fhead || '') + FRAME_GLSL + GLSL_COMMON + fs, name + '.fs'));
  if (opt.attribs) opt.attribs.forEach((a, i) => gl.bindAttribLocation(p, i, a));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('link ' + name + ': ' + gl.getProgramInfoLog(p)); throw new Error('link failed: ' + name); }
  const bi = gl.getUniformBlockIndex(p, 'Frame'); if (bi !== 0xFFFFFFFF && bi >= 0) gl.uniformBlockBinding(p, bi, 0);
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const inf = gl.getActiveUniform(p, i); const nm = inf.name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, inf.name); }
  gl.useProgram(p);
  for (const [k, unit] of [['uTex', UNIT.tex], ['uShadow', UNIT.shadow], ['uScene', UNIT.scene], ['uBloom', UNIT.bloom], ['uMiscTex', UNIT.misc]]) if (u[k]) gl.uniform1i(u[k], unit);
  const P = { p, u, name }; PROGS.push(P); return P;
}

// ---- render targets ----
const RT = { w: 0, h: 0, fmt: null };
function mkTex(w, h, ifmt, fmt, type, filter = gl.LINEAR) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function freeRT() {
  for (const k of ['msFB', 'resFB', 'msCol', 'msDep', 'resCol', 'resDep']) { const o = RT[k]; if (!o) continue; if (o instanceof WebGLFramebuffer) gl.deleteFramebuffer(o); else if (o instanceof WebGLRenderbuffer) gl.deleteRenderbuffer(o); else gl.deleteTexture(o); RT[k] = null; }
  if (RT.bloom) for (const b of RT.bloom) { gl.deleteFramebuffer(b.fb); gl.deleteTexture(b.t); } RT.bloom = null;
}
function setupRT(w, h) {
  freeRT(); RT.w = w; RT.h = h;
  const hdr = !!EXT_CBF; RT.hdr = hdr;
  const ifmt = hdr ? gl.RGBA16F : gl.RGBA8, type = hdr ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
  RT.samples = Q.msaa ? Math.min(Q.msaa, MAXSAMP) : 0;
  RT.resCol = mkTex(w, h, ifmt, gl.RGBA, type);
  RT.resFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, RT.resFB);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, RT.resCol, 0);
  if (RT.samples) {
    RT.msFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, RT.msFB);
    RT.msCol = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, RT.msCol); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, RT.samples, ifmt, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, RT.msCol);
    RT.msDep = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, RT.msDep); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, RT.samples, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, RT.msDep);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { console.warn('MSAA FBO incomplete, falling back'); RT.samples = 0; }
  }
  if (!RT.samples) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, RT.resFB);
    RT.resDep = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, RT.resDep); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, RT.resDep);
  }
  RT.bloom = [];
  let bw = w, bh = h;
  for (let i = 0; i < 5; i++) {
    bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1);
    const t = mkTex(bw, bh, ifmt, gl.RGBA, type); const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); RT.bloom.push({ t, fb, w: bw, h: bh });
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
// shadow map
const SH = { size: 0, tex: null, fb: null };
function setupShadow() {
  if (SH.tex) { gl.deleteTexture(SH.tex); gl.deleteFramebuffer(SH.fb); SH.tex = null; }
  SH.size = Math.min(Q.shadow, MAXTEX);
  if (!SH.size) return;
  SH.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, SH.tex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SH.size, SH.size);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  SH.fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, SH.fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, SH.tex, 0);
  gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
// a 1x1 depth texture so sampler2DShadow is always valid when shadows are off
const SH_DUMMY = (() => {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, 1, 1, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, new Uint32Array([0xFFFFFFFF]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  return t;
})();

// fullscreen triangle VAO
const VAO_FS = gl.createVertexArray();
// unit quad corners for splats / particles
const QUAD_BUF = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, QUAD_BUF); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

// generic static mesh: interleaved pos(3f) nrm(3f) col(4ub) = 28 bytes
function makeMeshVAO(verts, idx) {
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 28, 24);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, vb, ib, n: idx.length, type: idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
}

// mesh builder (pos/nrm/col) used for jeep, rifle, rocks, trunks, targets
class MeshB {
  constructor() { this.v = []; this.i = []; }
  get nv() { return this.v.length / 10; }
  vert(p, n, c, mat = 0) { this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], mat); return this.nv - 1; }
  tri(a, b, c) { this.i.push(a, b, c); }
  // box with a transform matrix m (local unit cube -0.5..0.5 scaled by size)
  box(m, size, col, mat = 0) {
    const [sx, sy, sz] = size; const F = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (const f of F) {
      const n = f, u = Math.abs(f[1]) > 0.5 ? [1, 0, 0] : [0, 1, 0], w = V.cross(n, u);
      const nn = V.norm(M4.dir(m, n)); const b = this.nv;
      for (const [a, c] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const p = [(n[0] + u[0] * a + w[0] * c) * 0.5 * sx, (n[1] + u[1] * a + w[1] * c) * 0.5 * sy, (n[2] + u[2] * a + w[2] * c) * 0.5 * sz];
        this.vert(M4.pt(m, p), nn, col, mat);
      }
      this.tri(b, b + 1, b + 2); this.tri(b, b + 2, b + 3);
    }
  }
  // tapered cylinder from a to b
  cyl(a, b, ra, rb, col, seg = 10, mat = 0, caps = true, colB = null) {
    const ax = V.norm(V.sub(b, a)); const t = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = V.norm(V.cross(ax, t)), w = V.cross(ax, u); const b0 = this.nv;
    for (let i = 0; i <= seg; i++) {
      const an = i / seg * TAU, c = Math.cos(an), s = Math.sin(an);
      const d = V.add(V.mul(u, c), V.mul(w, s)); const n = V.norm(V.add(d, V.mul(ax, (ra - rb) / V.dist(a, b))));
      this.vert(V.add(a, V.mul(d, ra)), n, col, mat); this.vert(V.add(b, V.mul(d, rb)), n, colB || col, mat);
    }
    for (let i = 0; i < seg; i++) { const k = b0 + i * 2; this.tri(k, k + 2, k + 1); this.tri(k + 1, k + 2, k + 3); }
    if (caps) for (const [p, r, s] of [[a, ra, -1], [b, rb, 1]]) {
      const c0 = this.vert(p, V.mul(ax, s), col, mat);
      const f = this.nv;
      for (let i = 0; i <= seg; i++) { const an = i / seg * TAU; this.vert(V.add(p, V.add(V.mul(u, Math.cos(an) * r), V.mul(w, Math.sin(an) * r))), V.mul(ax, s), col, mat); }
      for (let i = 0; i < seg; i++) s > 0 ? this.tri(c0, f + i, f + i + 1) : this.tri(c0, f + i + 1, f + i);
    }
  }
  sphere(c, r, col, seg = 10, mat = 0, sq = [1, 1, 1]) {
    const b0 = this.nv;
    for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg * 2; i++) {
      const th = j / seg * Math.PI, ph = i / (seg * 2) * TAU;
      const n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      this.vert([c[0] + n[0] * r * sq[0], c[1] + n[1] * r * sq[1], c[2] + n[2] * r * sq[2]], V.norm([n[0] / sq[0], n[1] / sq[1], n[2] / sq[2]]), col, mat);
    }
    const W = seg * 2 + 1;
    for (let j = 0; j < seg; j++) for (let i = 0; i < seg * 2; i++) { const a = b0 + j * W + i; this.tri(a, a + 1, a + W); this.tri(a + 1, a + W + 1, a + W); }
  }
  build() {
    const n = this.nv, buf = new ArrayBuffer(n * 28), f = new Float32Array(buf), b = new Uint8Array(buf);
    for (let k = 0; k < n; k++) {
      const s = k * 10; f.set(this.v.slice(s, s + 6), k * 7);
      b[k * 28 + 24] = clamp(this.v[s + 6] * 255, 0, 255); b[k * 28 + 25] = clamp(this.v[s + 7] * 255, 0, 255); b[k * 28 + 26] = clamp(this.v[s + 8] * 255, 0, 255); b[k * 28 + 27] = clamp(this.v[s + 9], 0, 255);
    }
    const idx = n > 65535 ? new Uint32Array(this.i) : new Uint16Array(this.i);
    return makeMeshVAO(new Uint8Array(buf), idx);
  }
}
