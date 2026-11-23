'use strict';
// ---------- small math + random helpers ----------
const TAU = Math.PI * 2;
const clamp = (x, a, b) => x < a ? a : (x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrapA = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
const hypot2 = (x, z) => Math.sqrt(x * x + z * z);

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let grng = mulberry32(12345);   // gameplay (AI, spawns) - seeded for tests
let frng = mulberry32(777);     // effects only
const R1 = (a = 0, b = 1) => a + (b - a) * grng();
const F1 = (a = 0, b = 1) => a + (b - a) * frng();
const pick = arr => arr[Math.floor(grng() * arr.length) % arr.length];

function hash2(x, y) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y); let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}
function fbm(x, y, o = 4) { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return s; }

function hexLin(h) { // sRGB hex -> linear rgb array
  const r = ((h >> 16) & 255) / 255, g = ((h >> 8) & 255) / 255, b = (h & 255) / 255;
  return [Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)];
}
function hexCss(h) { return '#' + h.toString(16).padStart(6, '0'); }

// ---------- mat4 (column major) ----------
function m4() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
function m4mul(o, a, b) {
  const r = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) {
    r[c * 4 + rr] = a[rr] * b[c * 4] + a[4 + rr] * b[c * 4 + 1] + a[8 + rr] * b[c * 4 + 2] + a[12 + rr] * b[c * 4 + 3];
  }
  o.set(r); return o;
}
function m4persp(o, fovy, asp, n, f) {
  const t = 1 / Math.tan(fovy / 2); o.fill(0);
  o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o;
}
function m4ortho(o, l, r, b, t, n, f) {
  o.fill(0); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n);
  o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o;
}
function m4look(o, ex, ey, ez, cx, cy, cz, ux = 0, uy = 1, uz = 0) {
  let zx = ex - cx, zy = ey - cy, zz = ez - cz; let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
  let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx; l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0; o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0; o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
  o[12] = -(xx * ex + xy * ey + xz * ez); o[13] = -(yx * ex + yy * ey + yz * ez); o[14] = -(zx * ex + zy * ey + zz * ez); o[15] = 1; return o;
}
function m4inv(o, m) {
  const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7],
    a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11,
    b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30,
    b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!det) return o; det = 1 / det;
  o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return o;
}
function m4trans(x, y, z) { const m = m4(); m[12] = x; m[13] = y; m[14] = z; return m; }
function m4scale(x, y, z) { const m = m4(); m[0] = x; m[5] = y; m[10] = z; return m; }
function m4rotY(a) { const m = m4(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
function m4rotX(a) { const m = m4(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
function m4rotZ(a) { const m = m4(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }

// ---------- 3x3 rotation bases (column major: X axis, Y axis, Z axis) ----------
function m3mul(a, b) {
  const o = new Array(9);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2];
  return o;
}
function r3Y(t) { const c = Math.cos(t), s = Math.sin(t); return [c, 0, -s, 0, 1, 0, s, 0, c]; }
function r3X(t) { const c = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, c, s, 0, -s, c]; }
function r3Z(t) { const c = Math.cos(t), s = Math.sin(t); return [c, s, 0, -s, c, 0, 0, 0, 1]; }
// yaw: heading (local +Z -> (sin yaw, 0, cos yaw)); pitch: nose up positive; roll about forward
function r3YPR(yaw, pitch, roll) { return m3mul(m3mul(r3Y(yaw), r3X(-pitch)), r3Z(roll)); }
function r3apply(B, x, y, z) { return [B[0] * x + B[3] * y + B[6] * z, B[1] * x + B[4] * y + B[7] * z, B[2] * x + B[5] * y + B[8] * z]; }
// rotation about an arbitrary unit axis (for tumbling debris)
function r3axis(ax, ay, az, t) {
  const c = Math.cos(t), s = Math.sin(t), k = 1 - c;
  return [c + ax * ax * k, ay * ax * k + az * s, az * ax * k - ay * s,
    ax * ay * k - az * s, c + ay * ay * k, az * ay * k + ax * s,
    ax * az * k + ay * s, ay * az * k - ax * s, c + az * az * k];
}
function r3orth(B) { // re-orthonormalize columns (Gram-Schmidt)
  let x = [B[0], B[1], B[2]], y = [B[3], B[4], B[5]];
  let l = Math.hypot(x[0], x[1], x[2]) || 1; x = x.map(v => v / l);
  const d = x[0] * y[0] + x[1] * y[1] + x[2] * y[2]; y = [y[0] - d * x[0], y[1] - d * x[1], y[2] - d * x[2]];
  l = Math.hypot(y[0], y[1], y[2]) || 1; y = y.map(v => v / l);
  const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  return [x[0], x[1], x[2], y[0], y[1], y[2], z[0], z[1], z[2]];
}
function m4basis(o, B, px, py, pz, sx = 1, sy = 1, sz = 1) {
  o[0] = B[0] * sx; o[1] = B[1] * sx; o[2] = B[2] * sx; o[3] = 0;
  o[4] = B[3] * sy; o[5] = B[4] * sy; o[6] = B[5] * sy; o[7] = 0;
  o[8] = B[6] * sz; o[9] = B[7] * sz; o[10] = B[8] * sz; o[11] = 0;
  o[12] = px; o[13] = py; o[14] = pz; o[15] = 1; return o;
}
// unit cylinder (y 0..1, radius 1) stretched from a to b with radius r
function m4between(o, ax, ay, az, bx, by, bz, r) {
  let dx = bx - ax, dy = by - ay, dz = bz - az; const L = Math.hypot(dx, dy, dz) || 1e-6; dx /= L; dy /= L; dz /= L;
  let tx = 0, ty = 1, tz = 0; if (Math.abs(dy) > 0.9) { tx = 1; ty = 0; }
  let xx = ty * dz - tz * dy, xy = tz * dx - tx * dz, xz = tx * dy - ty * dx; const l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
  const zx = xy * dz - xz * dy, zy = xz * dx - xx * dz, zz = xx * dy - xy * dx;
  o[0] = xx * r; o[1] = xy * r; o[2] = xz * r; o[3] = 0;
  o[4] = dx * L; o[5] = dy * L; o[6] = dz * L; o[7] = 0;
  o[8] = zx * r; o[9] = zy * r; o[10] = zz * r; o[11] = 0;
  o[12] = ax; o[13] = ay; o[14] = az; o[15] = 1; return o;
}
const TMP16 = new Float32Array(16);
