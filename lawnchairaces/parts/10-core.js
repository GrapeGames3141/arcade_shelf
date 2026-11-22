// Core helpers: math, random, noise, matrices, WebGL plumbing.
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fract = (x) => x - Math.floor(x);
const sq = (x) => x * x;
const angWrap = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };

const URLQ = new URLSearchParams(location.search);
const TEST = URLQ.has('test');

function RNG(seed) {
  let s = (seed >>> 0) || 1;
  const f = function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (a, b) => a + (b - a) * f();
  f.int = (a, b) => Math.floor(a + (b - a + 1) * f());
  f.pick = (arr) => arr[Math.floor(f() * arr.length) % arr.length];
  f.gauss = () => { let u = 0, v = 0; while (u === 0) u = f(); v = f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  return f;
}

// ---------- vec3 (plain arrays) ----------
const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
};

// ---------- noise (deterministic, JS side) ----------
function hash2(ix, iz, seed) {
  let h = Math.imul(ix | 0, 374761393) + Math.imul(iz | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, z, seed) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uz) * 2 - 1;
}
function fbm(x, z, oct, seed) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x * f + i * 17.3, z * f - i * 9.1, seed + i * 31);
    n += a; a *= 0.5; f *= 2.03;
  }
  return s / n;
}
function ridge(x, z, oct, seed) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * (1 - Math.abs(vnoise(x * f + i * 7.7, z * f + i * 3.3, seed + i * 13)));
    n += a; a *= 0.5; f *= 2.1;
  }
  return s / n;
}

// ---------- mat4 (column-major Float32Array) ----------
const m4 = {
  ident() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(a, b, out) {
    out = out || new Float32Array(16);
    const r = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) {
      r[c * 4 + rr] = a[rr] * b[c * 4] + a[4 + rr] * b[c * 4 + 1] + a[8 + rr] * b[c * 4 + 2] + a[12 + rr] * b[c * 4 + 3];
    }
    out.set(r); return out;
  },
  persp(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
    m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = 2 * far * near / (near - far);
    return m;
  },
  ortho(l, r, b, t, n, f) {
    const m = new Float32Array(16);
    m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n);
    m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n); m[15] = 1;
    return m;
  },
  lookAt(eye, at, up) {
    const z = v3.norm(v3.sub(eye, at));
    let x = v3.cross(up, z);
    if (v3.len(x) < 1e-6) x = v3.cross([0, 0, 1], z);
    x = v3.norm(x);
    const y = v3.cross(z, x), m = new Float32Array(16);
    m[0] = x[0]; m[4] = x[1]; m[8] = x[2];
    m[1] = y[0]; m[5] = y[1]; m[9] = y[2];
    m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
    m[12] = -v3.dot(x, eye); m[13] = -v3.dot(y, eye); m[14] = -v3.dot(z, eye); m[15] = 1;
    return m;
  },
  invert(a) {
    const m = new Float32Array(16);
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return m4.ident();
    det = 1 / det;
    m[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; m[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    m[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; m[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    m[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; m[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    m[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; m[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    m[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; m[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    m[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; m[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    m[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; m[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    m[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; m[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return m;
  },
  // model matrix from position, basis vectors (right, up, fwd) and uniform scale
  basis(p, r, u, f, s) {
    s = s || 1;
    const m = new Float32Array(16);
    m[0] = r[0] * s; m[1] = r[1] * s; m[2] = r[2] * s;
    m[4] = u[0] * s; m[5] = u[1] * s; m[6] = u[2] * s;
    m[8] = f[0] * s; m[9] = f[1] * s; m[10] = f[2] * s;
    m[12] = p[0]; m[13] = p[1]; m[14] = p[2]; m[15] = 1;
    return m;
  },
  yawPitch(p, yaw, pitch, s) {
    // yaw about +Y, then pitch about local X. Forward is +Z at yaw=0.
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const f = [sy * cp, sp, cy * cp];
    const r = [cy, 0, -sy];
    const u = v3.cross(f, r);
    return m4.basis(p, r, u, f, s);
  },
  xform(m, p) {
    return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
  },
  xdir(m, p) {
    return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2], m[1] * p[0] + m[5] * p[1] + m[9] * p[2], m[2] * p[0] + m[6] * p[1] + m[10] * p[2]];
  },
};
function projectPoint(vp, p) {
  const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12];
  const y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13];
  const w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
  if (w <= 0.001) return null;
  return [x / w, y / w, w];
}

// ---------- WebGL plumbing ----------
const LOG = [];
function logMsg(...a) { const s = a.join(' '); LOG.push(s); if (LOG.length > 200) LOG.shift(); console.log('[LA] ' + s); }

function makeShader(gl, type, src, name) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh);
    const lines = src.split('\n').map((l, i) => (i + 1) + ': ' + l);
    console.error('[LA] shader compile failed: ' + name + '\n' + info);
    const m = /0:(\d+)/.exec(info || '');
    if (m) { const ln = +m[1]; console.error(lines.slice(Math.max(0, ln - 4), ln + 2).join('\n')); }
    throw new Error('shader ' + name);
  }
  return sh;
}
function makeProgram(gl, vs, fs, name) {
  const p = gl.createProgram();
  gl.attachShader(p, makeShader(gl, gl.VERTEX_SHADER, vs, name + '.vs'));
  gl.attachShader(p, makeShader(gl, gl.FRAGMENT_SHADER, fs, name + '.fs'));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('[LA] link failed ' + name + ': ' + gl.getProgramInfoLog(p));
    throw new Error('link ' + name);
  }
  const prog = { p, name, u: {} };
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    const nm = info.name.replace(/\[0\]$/, '');
    prog.u[nm] = gl.getUniformLocation(p, info.name);
  }
  return prog;
}

// Create a VAO from interleaved float data. layout: [[loc, size], ...]
function makeVAO(gl, data, layout, indices, instData, instLayout) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  let stride = 0; for (const l of layout) stride += l[1];
  let off = 0;
  for (const [loc, size] of layout) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4);
    off += size;
  }
  let ibo = null, count = data.length / stride, itype = 0;
  if (indices) {
    ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    const big = indices.length > 0 && Math.max(...sampleMax(indices)) > 65535;
    const arr = big ? new Uint32Array(indices) : new Uint16Array(indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    count = indices.length; itype = big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
  }
  let ivbo = null, istride = 0;
  if (instLayout) {
    ivbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ivbo);
    gl.bufferData(gl.ARRAY_BUFFER, instData || new Float32Array(16), instData ? gl.STATIC_DRAW : gl.DYNAMIC_DRAW);
    for (const l of instLayout) istride += l[1];
    let ioff = 0;
    for (const [loc, size] of instLayout) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, istride * 4, ioff * 4);
      gl.vertexAttribDivisor(loc, 1);
      ioff += size;
    }
  }
  gl.bindVertexArray(null);
  return { vao, vbo, ibo, ivbo, count, itype, stride, istride, icount: instData ? instData.length / istride : 0 };
}
function sampleMax(idx) {
  let m = 0; for (let i = 0; i < idx.length; i++) if (idx[i] > m) m = idx[i];
  return [m];
}
function drawMesh(gl, mesh, instances) {
  gl.bindVertexArray(mesh.vao);
  if (instances !== undefined) {
    if (instances <= 0) return;
    if (mesh.ibo) gl.drawElementsInstanced(gl.TRIANGLES, mesh.count, mesh.itype, 0, instances);
    else gl.drawArraysInstanced(gl.TRIANGLES, 0, mesh.count, instances);
  } else {
    if (mesh.ibo) gl.drawElements(gl.TRIANGLES, mesh.count, mesh.itype, 0);
    else gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
  }
}
function makeTex(gl, w, h, ifmt, fmt, type, data, filter, wrap) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data || null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter || gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, (filter === gl.LINEAR_MIPMAP_LINEAR ? gl.LINEAR : filter) || gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap || gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap || gl.CLAMP_TO_EDGE);
  if (filter === gl.LINEAR_MIPMAP_LINEAR) gl.generateMipmap(gl.TEXTURE_2D);
  return t;
}
function makeFBO(gl, w, h, opts) {
  // opts: {color: [ifmt, fmt, type] | null, depth: 'tex'|'rb'|null, msaa: n}
  const f = { w, h, fb: gl.createFramebuffer(), tex: null, depthTex: null, rb: [] };
  gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb);
  if (opts.msaa) {
    const crb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, crb);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, opts.msaa, opts.color[0], w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, crb);
    const drb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, drb);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, opts.msaa, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, drb);
    f.rb.push(crb, drb);
  } else {
    if (opts.color) {
      f.tex = makeTex(gl, w, h, opts.color[0], opts.color[1], opts.color[2], null, gl.LINEAR, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, f.tex, 0);
    } else {
      gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    }
    if (opts.depth === 'tex') {
      f.depthTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, f.depthTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, f.depthTex, 0);
    } else if (opts.depth === 'rb') {
      const drb = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, drb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, drb);
      f.rb.push(drb);
    }
  }
  const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (st !== gl.FRAMEBUFFER_COMPLETE) logMsg('FBO incomplete', st.toString(16), w, h);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return f;
}
function freeFBO(gl, f) {
  if (!f) return;
  gl.deleteFramebuffer(f.fb);
  if (f.tex) gl.deleteTexture(f.tex);
  if (f.depthTex) gl.deleteTexture(f.depthTex);
  for (const r of f.rb) gl.deleteRenderbuffer(r);
}
