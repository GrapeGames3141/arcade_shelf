// ---------- instance batching: per-frame dynamic instances and static scenery windows ----------
// 20 floats per instance: 3x4 matrix rows, colour rgb + material, params (emissive, flash, seed, special)
const BATCH = { f: new Float32Array(20 * 4096), buf: null, bufCap: 0 };
function batchReset() { for (const t of TPL_LIST) t.dn = 0; }
function inst(t, p, q, s, col, mat, e = 1, flash = 0, seed = 0, special = 0) {
  if (typeof t === 'string') t = TPL[t];
  if (!t.dyn || t.dn * 20 + 20 > t.dyn.length) { const n = new Float32Array(Math.max(64, (t.dn + 1) * 2) * 20); if (t.dyn) n.set(t.dyn); t.dyn = n; }
  const f = t.dyn, o = t.dn * 20; instMat(f, o, p, q, s);
  f[o + 12] = col[0]; f[o + 13] = col[1]; f[o + 14] = col[2]; f[o + 15] = mat; f[o + 16] = e; f[o + 17] = flash; f[o + 18] = seed; f[o + 19] = special;
  t.dn++;
}
function batchUpload() {
  let total = 0; for (const t of TPL_LIST) { t.doff = total; total += t.dn; }
  if (total * 20 > BATCH.f.length) BATCH.f = new Float32Array(total * 20 * 1.5 | 0);
  for (const t of TPL_LIST) if (t.dn) BATCH.f.set(t.dyn.subarray(0, t.dn * 20), t.doff * 20);
  if (!BATCH.buf) BATCH.buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, BATCH.buf);
  if (total * 80 > BATCH.bufCap) { BATCH.bufCap = Math.max(total * 80 * 1.5 | 0, 80 * 1024); gl.bufferData(gl.ARRAY_BUFFER, BATCH.bufCap, gl.DYNAMIC_DRAW); }
  if (total) gl.bufferSubData(gl.ARRAY_BUFFER, 0, BATCH.f.subarray(0, total * 20));
  BATCH.total = total;
}
function pointInst(buf, off) { gl.bindBuffer(gl.ARRAY_BUFFER, buf); for (let l = 4; l <= 8; l++) gl.vertexAttribPointer(l, 4, gl.FLOAT, false, 80, off * 80 + (l - 4) * 16); }
let CULL_STATE = -1;
function setCull(on) { if (on === CULL_STATE) return; CULL_STATE = on; on ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE); }
function drawBatch(shadow) {
  gl.bindVertexArray(MESH.vao);
  for (const t of TPL_LIST) {
    if (!t.dn) continue;
    pointInst(BATCH.buf, t.doff); setCull(shadow ? false : t.cull);
    gl.drawElementsInstanced(gl.TRIANGLES, t.count, gl.UNSIGNED_INT, t.first * 4, t.dn);
  }
}
// static scenery: pushed at level build, grouped by template and sorted by route key
const STATIC = { list: [], buf: null, groups: [] };
function sinst(t, p, q, s, col, mat, key, e = 1, seed = 0, special = 0) {
  if (typeof t === 'string') t = TPL[t];
  const f = new Float32Array(20); instMat(f, 0, p, q, s);
  f[12] = col[0]; f[13] = col[1]; f[14] = col[2]; f[15] = mat; f[16] = e; f[17] = 0; f[18] = seed; f[19] = special;
  STATIC.list.push({ t, f, key, r: (typeof s === 'number' ? s : Math.max(...s)) * (t.radius || 1), p });
}
function staticFinalize() {
  const by = new Map(); for (const e of STATIC.list) { if (!by.has(e.t)) by.set(e.t, []); by.get(e.t).push(e); }
  let total = 0; for (const a of by.values()) total += a.length;
  const f = new Float32Array(Math.max(1, total) * 20); let o = 0; STATIC.groups = [];
  for (const [t, arr] of by) { arr.sort((a, b) => a.key - b.key); STATIC.groups.push({ t, off: o, n: arr.length, keys: arr.map(e => e.key) }); for (const e of arr) { f.set(e.f, o * 20); o++; } }
  if (!STATIC.buf) STATIC.buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, STATIC.buf); gl.bufferData(gl.ARRAY_BUFFER, f, gl.STATIC_DRAW);
  STATIC.total = total; STATIC.colliders = STATIC.list.filter(e => e.solid); STATIC.list = [];
}
function drawStatic(s0, s1, shadow) {
  gl.bindVertexArray(MESH.vao); let drawn = 0;
  for (const g of STATIC.groups) {
    const a = lowerBound(g.keys, s0), b = lowerBound(g.keys, s1); if (b <= a) continue;
    pointInst(STATIC.buf, g.off + a); setCull(shadow ? false : g.t.cull);
    gl.drawElementsInstanced(gl.TRIANGLES, g.t.count, gl.UNSIGNED_INT, g.t.first * 4, b - a); drawn += b - a;
  }
  return drawn;
}
