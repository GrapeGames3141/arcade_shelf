// ---------- models: trees, rocks, the bear, hikers, fish ----------
// Materials (par z): -1 ground, -2 bark, -3 leaves, -4 rock, -5 falling water, -6 fur. tint(true) lets the
// instance colour multiply the vertex colour, which is how one tree mesh becomes many shades of green.
const MESH = {};
const ell = (b, x, y, z, rx, ry, rz, seg = 12, ring = 9) => { b.push().tr(x, y, z).sc(rx, ry, rz).sph(1, seg, ring).pop(); return b; };
function buildModels() {
  let b;
  // --- pine: bark trunk + stacked cones (tinted)
  b = new MB();
  b.col(0x4a3220).par(0.95, 0, -2).cyl(0.22, 0.12, 3.2, 7);
  b.col(0x2a5a2c).par(0.9, 0, -3).tint(true);
  for (let k = 0; k < 4; k++) { const y = 1.4 + k * 1.55, r = 2.3 - k * 0.48; b.push().tr(0, y, 0).cyl(r, 0.05, 2.6 - k * 0.2, 9, true).pop(); }
  MESH.pine = b.build({ name: 'pine' }); MESH.pine.isStatic = true;
  // --- broadleaf: trunk with two branches + leaf clusters
  b = new MB();
  b.col(0x5a4028).par(0.95, 0, -2).cyl(0.26, 0.16, 3.0, 8);
  b.tube([0, 2.4, 0], [0.9, 3.6, 0.3], 0.1, 6).tube([0, 2.6, 0], [-0.8, 3.7, -0.4], 0.09, 6);
  b.col(0x3d7a2a).par(0.9, 0, -3).tint(true);
  for (const [x, y, z, r] of [[0, 4.6, 0, 1.9], [1.1, 4.0, 0.4, 1.4], [-1.0, 4.1, -0.5, 1.45], [0.2, 3.7, -1.1, 1.2], [-0.3, 5.5, 0.4, 1.2]]) ell(b, x, y, z, r, r * 0.85, r, 10, 7);
  MESH.oak = b.build({ name: 'oak' }); MESH.oak.isStatic = true;
  // --- birch: pale trunk with dark bands, airy light leaves
  b = new MB();
  b.col(0xe2ddd0).par(0.8, 0, -2).cyl(0.14, 0.09, 4.6, 8);
  b.col(0x222018).par(0.9, 0, 0);
  for (let k = 0; k < 6; k++) b.push().tr(0, 0.5 + k * 0.7, 0).ry(k).cyl(0.145, 0.145, 0.06, 8, false).pop();
  b.col(0x7aa83a).par(0.9, 0, -3).tint(true);
  for (const [x, y, z, r] of [[0, 5.0, 0, 1.1], [0.6, 4.4, 0.3, 0.8], [-0.5, 4.5, -0.3, 0.85], [0.1, 3.9, 0.6, 0.7]]) ell(b, x, y, z, r, r * 1.15, r, 9, 7);
  MESH.birch = b.build({ name: 'birch' }); MESH.birch.isStatic = true;
  // --- bushes, berries, ferns
  b = new MB(); b.col(0x3a6e2a).par(0.9, 0, -3).tint(true);
  for (const [x, y, z, r] of [[0, 0.45, 0, 0.7], [0.5, 0.35, 0.2, 0.5], [-0.45, 0.35, -0.2, 0.55], [0.1, 0.3, -0.5, 0.45]]) ell(b, x, y, z, r, r * 0.8, r, 9, 6);
  MESH.bush = b.build({ name: 'bush' }); MESH.bush.isStatic = true;
  b = new MB(); b.col(0x355f26).par(0.9, 0, -3);
  for (const [x, y, z, r] of [[0, 0.5, 0, 0.75], [0.55, 0.4, 0.25, 0.55], [-0.5, 0.4, -0.2, 0.6], [0.05, 0.35, -0.55, 0.5]]) ell(b, x, y, z, r, r * 0.8, r, 9, 6);
  MESH.berryBush = b.build({ name: 'berryBush' }); MESH.berryBush.isStatic = true;
  b = new MB(); b.col(0xc2182e).par(0.35, 0, 0.05).sph(0.07, 6, 5); MESH.berry = b.build({ name: 'berry', cast: false });
  b = new MB(); b.col(0x4f8a32).par(0.9, 0, -3).tint(true);
  for (let k = 0; k < 7; k++) { b.push().ry(k / 7 * TAU).rx(-0.75).tr(0, 0.45, 0).sc(0.16, 0.5, 0.05).sph(1, 6, 5).pop(); }
  MESH.fern = b.build({ name: 'fern', cast: false }); MESH.fern.isStatic = true;
  // --- rocks (lumpy spheres), logs, stumps
  for (let v = 0; v < 3; v++) {
    b = new MB(); b.col(0x8a857a).par(0.9, 0, -4).tint(true);
    const base = b.n; b.sph(1, 12, 9);
    for (let i = base; i < b.n; i++) { const o = i * VSTRIDE; const x = b.v[o], y = b.v[o + 1], z = b.v[o + 2]; const k = 0.72 + 0.5 * vnoise(x * 2.1 + v * 7, z * 2.1 + y * 1.7); b.v[o] *= k; b.v[o + 1] *= k * 0.7; b.v[o + 2] *= k; }
    MESH['rock' + v] = b.build({ name: 'rock' + v }); MESH['rock' + v].isStatic = true;
  }
  b = new MB(); b.col(0x5a4028).par(0.95, 0, -2).push().rz(Math.PI / 2).tr(0, -2, 0).cyl(0.32, 0.28, 4, 9).pop();
  b.col(0x8a6a44).par(0.9, 0, 0); b.push().tr(-2.0, 0, 0).rz(Math.PI / 2).cyl(0.3, 0.3, 0.02, 9).pop();
  MESH.log = b.build({ name: 'log' }); MESH.log.isStatic = true;
  // --- picnic table + basket + sign
  b = new MB(); b.col(0x8a6238).par(0.85, 0, 0);
  b.push().tr(0, 0.74, 0).box(1.8, 0.06, 0.8).pop();
  for (const z of [-0.65, 0.65]) b.push().tr(0, 0.44, z).box(1.8, 0.05, 0.28).pop();
  for (const x of [-0.7, 0.7]) for (const s of [-1, 1]) b.push().tr(x, 0.37, 0).rx(s * 0.5).box(0.08, 0.85, 0.08).pop();
  MESH.table = b.build({ name: 'table' }); MESH.table.isStatic = true;
  b = new MB(); b.col(0xb88a4a).par(0.8).push().tr(0, 0.12, 0).box(0.42, 0.24, 0.3).pop();
  b.col(0xc0392b).par(0.7).push().tr(0, 0.25, 0).box(0.44, 0.02, 0.32).pop();
  b.col(0x6a4a2a).par(0.8).tube([-0.18, 0.24, 0], [0, 0.4, 0], 0.015, 5).tube([0.18, 0.24, 0], [0, 0.4, 0], 0.015, 5);
  MESH.basket = b.build({ name: 'basket' });
  b = new MB(); b.col(0x6a4a2a).par(0.9).push().tr(0, 0, 0).cyl(0.07, 0.07, 1.4, 6).pop();
  b.col(0x8a6238).push().tr(0, 1.25, 0.04).box(0.9, 0.36, 0.05).pop();
  MESH.sign = b.build({ name: 'sign' }); MESH.sign.isStatic = true;
  // --- snack the hikers drop
  b = new MB(); b.col(0x2a6aa8).par(0.8).push().tr(0, 0.18, 0).box(0.34, 0.36, 0.2).pop();
  b.col(0x1f4f80).push().tr(0, 0.2, 0.11).box(0.24, 0.16, 0.04).pop();
  MESH.pack = b.build({ name: 'pack' });
  buildBearMeshes();
  buildHikerMeshes();
  // --- salmon: body + tail (separate, so the tail can flick)
  b = new MB(); b.col(0xb98a7c).par(0.45, 0.1, 0); ell(b, 0, 0, 0, 0.11, 0.1, 0.36, 10, 8);
  b.col(0x6a7a80); ell(b, 0, 0.04, -0.02, 0.09, 0.07, 0.3, 9, 6);
  b.col(0x111111).par(0.3); ell(b, 0.07, 0.03, 0.24, 0.018, 0.018, 0.018, 5, 4); ell(b, -0.07, 0.03, 0.24, 0.018, 0.018, 0.018, 5, 4);
  MESH.fish = b.build({ name: 'fish' });
  b = new MB(); b.col(0x8a6a62).par(0.5); b.face([0, -0.1, 0], [0, -0.14, -0.2], [0, 0.14, -0.2], [0, 0.1, 0]); b.face([0, 0.1, 0], [0, 0.14, -0.2], [0, -0.14, -0.2], [0, -0.1, 0]);
  MESH.tail = b.build({ name: 'tail' });
  // generic tinted primitives (falls, effects)
  b = new MB(); b.tint(true).col(0xffffff).par(0.6).sph(1, 10, 8); MESH.sph = b.build({ name: 'sph' });
}

// The bear: +z forward, origin on the ground under the middle of the body. Each limb is its own mesh so it can swing.
const BEAR = { hipZ: -0.55, shoulderZ: 0.55, hipY: 0.82, shoulderY: 0.9, legX: 0.3, upper: 0.42, lower: 0.4 };
function buildBearMeshes() {
  const fur = 0x5c3b22, dark = 0x3e2614, muzzle = 0xa07850;
  let b = new MB();
  b.col(fur).par(0.95, 0, -6);
  ell(b, 0, 0.98, -0.1, 0.5, 0.48, 0.95, 16, 11);           // body
  ell(b, 0, 1.22, 0.38, 0.42, 0.36, 0.42, 14, 10);          // shoulder hump
  ell(b, 0, 0.95, -0.72, 0.44, 0.44, 0.42, 14, 10);         // rump
  b.col(dark); ell(b, 0, 0.72, 0.0, 0.42, 0.25, 0.75, 12, 8); // belly
  ell(b, 0, 1.0, -1.08, 0.12, 0.1, 0.1, 8, 6);              // tail
  MESH.bearBody = b.build({ name: 'bearBody' });
  b = new MB();   // head, origin at the neck joint
  b.col(fur).par(0.95, 0, -6); ell(b, 0, 0.05, 0.3, 0.32, 0.3, 0.34, 14, 10);
  b.col(muzzle); ell(b, 0, -0.02, 0.62, 0.16, 0.14, 0.22, 12, 8);
  b.col(0x141010).par(0.35, 0, 0); ell(b, 0, 0.04, 0.82, 0.07, 0.055, 0.05, 8, 6);       // nose
  ell(b, 0.13, 0.13, 0.55, 0.035, 0.04, 0.03, 6, 5); ell(b, -0.13, 0.13, 0.55, 0.035, 0.04, 0.03, 6, 5); // eyes
  b.col(fur).par(0.95, 0, -6); ell(b, 0.22, 0.3, 0.22, 0.09, 0.1, 0.06, 8, 6); ell(b, -0.22, 0.3, 0.22, 0.09, 0.1, 0.06, 8, 6);
  b.col(dark); ell(b, 0.22, 0.3, 0.25, 0.05, 0.06, 0.03, 6, 5); ell(b, -0.22, 0.3, 0.25, 0.05, 0.06, 0.03, 6, 5);
  MESH.bearHead = b.build({ name: 'bearHead' });
  b = new MB(); b.col(fur).par(0.95, 0, -6); ell(b, 0, -0.14, 0, 0.2, 0.32, 0.23, 10, 8); MESH.bearUpper = b.build({ name: 'bearUpper' });
  b = new MB(); b.col(fur).par(0.95, 0, -6); ell(b, 0, -0.17, 0, 0.14, 0.24, 0.15, 10, 8);
  b.col(dark); ell(b, 0, -0.38, 0.06, 0.13, 0.07, 0.17, 9, 6);
  b.col(0xd8cfb8).par(0.4); for (const x of [-0.06, 0, 0.06]) ell(b, x, -0.4, 0.22, 0.015, 0.015, 0.04, 4, 3); // claws
  MESH.bearLower = b.build({ name: 'bearLower' });
}

// Hikers: tinted shirt, pants, hat and pack so every hiker looks different.
function buildHikerMeshes() {
  let b = new MB();
  b.col(0xffffff).par(0.8).tint(true); ell(b, 0, 1.22, 0, 0.2, 0.3, 0.14, 10, 8);  // shirt (tinted)
  b.tint(false).col(0x4a4a4a); b.push().tr(0, 0.92, 0).box(0.34, 0.12, 0.2).pop();
  MESH.hTorso = b.build({ name: 'hTorso' });
  b = new MB(); b.col(0xe0b090).par(0.6); ell(b, 0, 0.12, 0, 0.12, 0.14, 0.12, 10, 8);
  b.col(0x2a1a12); ell(b, 0, 0.2, -0.02, 0.125, 0.08, 0.125, 10, 6);
  b.col(0x111111).par(0.3); ell(b, 0.045, 0.14, 0.11, 0.015, 0.02, 0.01, 5, 4); ell(b, -0.045, 0.14, 0.11, 0.015, 0.02, 0.01, 5, 4);
  MESH.hHead = b.build({ name: 'hHead' });
  b = new MB(); b.col(0xffffff).par(0.8).tint(true); b.push().tr(0, 0.24, 0).cyl(0.2, 0.2, 0.02, 12).pop(); b.push().tr(0, 0.24, 0).cyl(0.12, 0.1, 0.12, 10).pop();
  MESH.hHat = b.build({ name: 'hHat' });
  b = new MB(); b.col(0xffffff).par(0.8).tint(true); b.push().tr(0, 1.2, -0.21).box(0.32, 0.42, 0.18).pop();
  MESH.hPack = b.build({ name: 'hPack' });
  b = new MB(); b.col(0x4a5a6a).par(0.85).tint(true); ell(b, 0, -0.22, 0, 0.075, 0.24, 0.08, 8, 6); MESH.hThigh = b.build({ name: 'hThigh' });
  b = new MB(); b.col(0x4a5a6a).par(0.85).tint(true); ell(b, 0, -0.2, 0, 0.06, 0.22, 0.065, 8, 6);
  b.tint(false).col(0x3a2a1a); ell(b, 0, -0.42, 0.05, 0.07, 0.05, 0.12, 8, 5);
  MESH.hShin = b.build({ name: 'hShin' });
  b = new MB(); b.col(0xffffff).par(0.8).tint(true); ell(b, 0, -0.22, 0, 0.055, 0.25, 0.055, 8, 6);
  b.tint(false).col(0xe0b090).par(0.6); ell(b, 0, -0.5, 0, 0.05, 0.06, 0.05, 6, 5);
  MESH.hArm = b.build({ name: 'hArm' });
}
