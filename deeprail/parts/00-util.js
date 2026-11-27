'use strict';
// ===== Deep Rail: shared helpers (math, RNG, noise, saves, quality tiers) =====
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const URLP = new URLSearchParams(location.search);
const TEST = URLP.has('test');

// --- seeded RNG (mulberry32). The level layout uses its own fixed seed so every run is the same ride.
function makeRng(seed) {
  let a = seed >>> 0;
  const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  return f;
}
let rnd = makeRng(+(URLP.get('seed') || 7));

// --- vec3 as plain arrays
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scl: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  madd: (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
  dist2: (a, b) => { const x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return x * x + y * y + z * z; },
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  copy: (a) => [a[0], a[1], a[2]],
};
// rotate vector v around unit axis k by angle a (Rodrigues)
function rotAxis(v, k, a) {
  const c = Math.cos(a), s = Math.sin(a), d = V.dot(k, v), x = V.cross(k, v);
  return [v[0] * c + x[0] * s + k[0] * d * (1 - c), v[1] * c + x[1] * s + k[1] * d * (1 - c), v[2] * c + x[2] * s + k[2] * d * (1 - c)];
}

// --- mat4, column-major Float32Array(16)
const M4 = {
  ident: () => { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; },
  // view matrix from eye and orthonormal basis (r, u, f) where f is the look direction
  view(eye, r, u, f) {
    const m = new Float32Array(16);
    m[0] = r[0]; m[4] = r[1]; m[8] = r[2];
    m[1] = u[0]; m[5] = u[1]; m[9] = u[2];
    m[2] = -f[0]; m[6] = -f[1]; m[10] = -f[2];
    m[12] = -V.dot(r, eye); m[13] = -V.dot(u, eye); m[14] = V.dot(f, eye); m[15] = 1; return m;
  },
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  inv(m) {
    const o = new Float32Array(16), a = m;
    const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
    const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!d) return M4.ident(); d = 1 / d;
    o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * d; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * d; o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * d; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * d;
    o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * d; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * d; o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * d; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * d;
    o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * d; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * d; o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * d; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * d;
    o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * d; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * d; o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * d; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * d;
    return o;
  },
  // model matrix from position, basis axes (x, y, z) and scale (sx, sy, sz); written into out at offset
  basis(out, o, p, x, y, z, sx, sy, sz) {
    out[o] = x[0] * sx; out[o + 1] = x[1] * sx; out[o + 2] = x[2] * sx; out[o + 3] = 0;
    out[o + 4] = y[0] * sy; out[o + 5] = y[1] * sy; out[o + 6] = y[2] * sy; out[o + 7] = 0;
    out[o + 8] = z[0] * sz; out[o + 9] = z[1] * sz; out[o + 10] = z[2] * sz; out[o + 11] = 0;
    out[o + 12] = p[0]; out[o + 13] = p[1]; out[o + 14] = p[2]; out[o + 15] = 1;
  },
  xform(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; },
};

// A frame = {p, x, y, z}: an origin and an orthonormal basis. Helpers build child frames for creatures and props.
function frame(p, x, y, z) { return { p, x, y, z }; }
function frameLook(p, fwd, upHint) {
  const z = V.norm(fwd); let x = V.cross(upHint || [0, 1, 0], z); if (V.len(x) < 1e-4) x = [1, 0, 0]; x = V.norm(x);
  const y = V.cross(z, x); return { p, x, y, z };
}
function fpt(F, lx, ly, lz) { return [F.p[0] + F.x[0] * lx + F.y[0] * ly + F.z[0] * lz, F.p[1] + F.x[1] * lx + F.y[1] * ly + F.z[1] * lz, F.p[2] + F.x[2] * lx + F.y[2] * ly + F.z[2] * lz]; }
function fdir(F, lx, ly, lz) { return [F.x[0] * lx + F.y[0] * ly + F.z[0] * lz, F.x[1] * lx + F.y[1] * ly + F.z[1] * lz, F.x[2] * lx + F.y[2] * ly + F.z[2] * lz]; }
// rotate frame about its own local axis ('x','y','z') by angle
function frot(F, axis, a) {
  const k = F[axis], o = { p: F.p, x: F.x, y: F.y, z: F.z };
  for (const n of ['x', 'y', 'z']) if (n !== axis) o[n] = rotAxis(F[n], k, a);
  return o;
}
function fmove(F, lx, ly, lz) { return { p: fpt(F, lx, ly, lz), x: F.x, y: F.y, z: F.z }; }

// --- value noise, identical in JS (rock displacement, wall hit tests) and GLSL (shading detail)
function hash3(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const a = hash3(ix, iy, iz), b = hash3(ix + 1, iy, iz), c = hash3(ix, iy + 1, iz), d = hash3(ix + 1, iy + 1, iz);
  const e = hash3(ix, iy, iz + 1), f = hash3(ix + 1, iy, iz + 1), g = hash3(ix, iy + 1, iz + 1), h = hash3(ix + 1, iy + 1, iz + 1);
  const x1 = a + (b - a) * fx, x2 = c + (d - c) * fx, x3 = e + (f - e) * fx, x4 = g + (h - g) * fx;
  const y1 = x1 + (x2 - x1) * fy, y2 = x3 + (x4 - x3) * fy;
  return y1 + (y2 - y1) * fz;
}
// rock displacement field in -1..1, used by mesh generation and by the wall tests
function rockN(x, y, z) {
  const n = vnoise(x * 0.33, y * 0.45, z * 0.33) + vnoise(x * 0.9 + 17, y * 1.1, z * 0.9) * 0.45 + vnoise(x * 2.3, y * 2.3 + 5, z * 2.3) * 0.1;
  const ledge = Math.sin(y * 2.1 + vnoise(x * .2, y * .3, z * .2) * 6) * .12;   // faint bedding planes
  return (n / 1.55 * 2 - 1) + ledge;
}

// --- persistent settings (try/catch: storage can throw in private windows and previews)
const SAVE = {
  get(k, d) { try { const v = localStorage.getItem('deeprail.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { if (TEST) return; try { localStorage.setItem('deeprail.' + k, JSON.stringify(v)); } catch (e) {} },
};

// --- quality tiers. MAX trades nothing away; HIGH carries the smoothing measures (pixel budget, fewer scattering lights).
const QUALITY = [
  { name: 'LOW', dpr: 1, scale: 0.7, msaa: 0, lights: 8, bloom: 3, scatter: 0, octaves: 1, refract: false, budget: 0 },
  { name: 'MEDIUM', dpr: 1.25, scale: 0.85, msaa: 2, lights: 14, bloom: 4, scatter: 0, octaves: 2, refract: true, budget: 0 },
  { name: 'HIGH', dpr: 2, scale: 1, msaa: 4, lights: 24, bloom: 5, scatter: 6, octaves: 3, refract: true, budget: 2.6e6 },
  { name: 'MAX', dpr: 8, scale: 1, msaa: 4, lights: 32, bloom: 6, scatter: 16, octaves: 3, refract: true, budget: 0 },
];
const MAXL = 32;   // light slots in the uniform block (loops break at the tier's count)
