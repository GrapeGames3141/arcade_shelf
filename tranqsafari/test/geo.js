// Node: build the creature meshes without WebGL, print timings and write OBJ files.
// usage: node test/geo.js [outdir]
const fs = require('fs'), path = require('path');
const parts = path.join(__dirname, '..', 'parts');
const out = process.argv[2] || path.join(__dirname, 'out'); fs.mkdirSync(out, { recursive: true });
let src = 'var location={search:""};var localStorage=null;var performance=require("perf_hooks").performance;\n';
src += fs.readFileSync(path.join(parts, '00-util.js'), 'utf8');
src += '\nfunction mix3(a,b,t){return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}\n';
src += fs.readFileSync(path.join(parts, '30-sdf.js'), 'utf8') + '\n' + fs.readFileSync(path.join(parts, '31-dinos.js'), 'utf8');
src += '\nmodule.exports={SPECIES,defineSpecies,buildCreatureMesh};';
const tmp = path.join(out, '_geo_src.js'); fs.writeFileSync(tmp, src);
const G = require(tmp); G.defineSpecies();
for (const k in G.SPECIES) {
  const sp = G.SPECIES[k]; const t0 = Date.now(); const m = G.buildCreatureMesh(sp, sp.cell); const t1 = Date.now(); const m1 = G.buildCreatureMesh(sp, sp.lodCell);
  console.log(k, 'bones', sp.bones.length, 'prims', sp.prims.length, 'verts', m.nv, 'tris', m.nt, 'ms', t1 - t0, 'lod tris', m1.nt, 'ms', Date.now() - t1, 'len', sp.len.toFixed(2), 'top', sp.top.toFixed(2));
  const f = new Float32Array(m.buf.buffer), u8 = m.buf; let s = '';
  for (let v = 0; v < m.nv; v++) s += `v ${f[v*8].toFixed(4)} ${f[v*8+1].toFixed(4)} ${f[v*8+2].toFixed(4)} ${(u8[v*32+24]/255).toFixed(3)} ${(u8[v*32+25]/255).toFixed(3)} ${(u8[v*32+26]/255).toFixed(3)}\n`;
  for (let v = 0; v < m.nv; v++) s += `vn ${f[v*8+3].toFixed(3)} ${f[v*8+4].toFixed(3)} ${f[v*8+5].toFixed(3)}\n`;
  for (let t = 0; t < m.idx.length; t += 3) s += `f ${m.idx[t]+1}//${m.idx[t]+1} ${m.idx[t+1]+1}//${m.idx[t+1]+1} ${m.idx[t+2]+1}//${m.idx[t+2]+1}\n`;
  fs.writeFileSync(path.join(out, k + '.obj'), s);
}
