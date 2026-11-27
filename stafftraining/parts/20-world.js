// ---------- the apartment: walls, doors, furniture (platforms), props, spots, nav grid ----------
const APT = { x0: -6, x1: 6, z0: -4.5, z1: 4.5, H: 2.7 };
const WALLS = [];   // {x0,x1,z0,z1} full-height colliders (cat, sight lines, camera)
const FURN = [];    // {id,x0,x1,z0,z1,base,top,name} colliders that are also platforms for the cat
const FBY = {};
const DOORS = {
  bed: { id: 'bed', x0: -3.0, x1: -2.0, z: -0.6, hinge: -3.0, dir: -1, open: 1, tgt: 1, propped: false, name: 'BEDROOM DOOR', inX: -2.5, inZ: -1.25, outX: -2.5, outZ: 0.05 },
  bath: { id: 'bath', x0: 3.6, x1: 4.5, z: -1.8, hinge: 4.5, dir: -1, open: 0, tgt: 0, propped: false, name: 'BATHROOM DOOR', inX: 4.05, inZ: -2.45, outX: 4.05, outZ: -1.15 },
  front: { id: 'front', x0: 2.4, x1: 3.4, z: 4.5, hinge: 2.4, dir: -1, open: 0, tgt: 0, propped: false, name: 'FRONT DOOR', inX: 2.9, inZ: 3.75, outX: 2.9, outZ: 3.75, max: 0.62 }
};
const COLS = {
  wood: C('#c8955c'), tile: C('#dfe9e6'), wallL: C('#f1e4cc'), wallB: C('#aebfd3'), wallT: C('#bfe0d8'), trim: C('#f7f3ea'),
  cab: C('#2f7f82'), top: C('#ead9b8'), fridge: C('#f2efe6'), sofa: C('#dba63a'), sofaD: C('#c08e2c'), navy: C('#2c3e63'),
  walnut: C('#7a4e2d'), oak: C('#9b6a3c'), duvet: C('#8fb39a'), linen: C('#fbf6ea'), dresser: C('#efe4cf'), steel: C('#b9c0c6'),
  dark: C('#2a2c33'), carpet: C('#cdb89a'), sisal: C('#b9935a'), card: C('#c79a62'), leaf: C('#3f8f4f'), terra: C('#c7673f'), white: C('#ffffff')
};
function wallBox(x0, z0, x1, z1, col, mat, y0 = 0, y1 = APT.H, collide = true) {
  TGT = SET.room; box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, col, 0, [mat, 0, 0, 0]);
  if (collide && y0 < 0.5) WALLS.push({ x0, x1, z0, z1 });
}
function F(id, x0, z0, x1, z1, top, base = 0, name) { const f = { id, x0, x1, z0, z1, top, base, name: name || id }; FURN.push(f); FBY[id] = f; return f; }
function BX(x0, z0, x1, z1, y0, y1, col, uv) { box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, col, 0, uv); }

// named places humans use: stand point (x,z) and facing h (0 = +z/south, PI = north, PI/2 = +x/east)
const SPOT = {
  bedM: { x: -4.45, z: -2.5, ax: -5.35, az: -3.1 }, bedD: { x: -3.55, z: -2.5, ax: -2.65, az: -3.0 },
  sofaD: { x: -4.0, z: 3.66, ax: -4.0, az: 2.85, h: Math.PI }, sofaM: { x: -3.0, z: 3.66, ax: -3.0, az: 2.85, h: Math.PI },
  chair: { x: 4.72, z: 1.3, ax: 4.2, az: 1.3, h: Math.PI / 2 },
  cabinet: { x: -1.0, z: -3.45, h: Math.PI }, bowl: { x: -0.72, z: -2.9, h: -Math.PI / 2 }, coffee: { x: 1.3, z: -3.45, h: Math.PI }, stove: { x: -0.1, z: -3.45, h: Math.PI },
  sink: { x: 0.7, z: -3.45, h: Math.PI }, spray: { x: 2.0, z: -3.45, h: Math.PI }, fridge: { x: 2.7, z: -3.3, h: Math.PI },
  shower: { x: 4.7, z: -4.05, ax: 4.7, az: -3.3, h: 0 }, vanity: { x: 5.0, z: -2.9, h: Math.PI / 2 },
  frontDoor: { x: 2.9, z: 3.9, h: 0 }, living: { x: -0.5, z: 0.6, h: 0 }, hall: { x: 0.2, z: -1.2, h: 0 }, timeout: { x: -3.4, z: -1.6, h: 0 }
};
const BOWL = { x: -1.22, z: -2.9, food: 0, water: { x: -1.22, z: -2.45 } };

function buildWorld() {
  const T = 0.12, H = APT.H, L = COLS;
  TGT = SET.room;
  // floors
  box(0, -0.05, 0, 12.3, 0.1, 9.3, L.wood, 0, [1, 0, 0, 0]);
  box(4.63, 0.004, -3.15, 2.74, 0.008, 2.7, L.tile, 0, [2, 0, 0, 0]);        // bathroom tile
  box(0.83, 0.003, -3.3, 4.74, 0.006, 2.4, C('#e9dfcf'), 0, [2, 0, 0, 0]);     // kitchen tile
  // outer walls, split by the room they face
  wallBox(-6, -4.5 - T, -1.6, -4.5, L.wallB, 4); wallBox(-1.6, -4.5 - T, 3.2, -4.5, L.wallL, 4); wallBox(3.2, -4.5 - T, 6, -4.5, L.wallT, 6);
  wallBox(-6 - T, -4.5, -6, -0.6, L.wallB, 4); wallBox(-6 - T, -0.6, -6, 4.5, L.wallL, 4);
  wallBox(6, -4.5, 6 + T, -1.8, L.wallT, 6); wallBox(6, -1.8, 6 + T, 4.5, L.wallL, 4);
  wallBox(-6, 4.5, 2.4, 4.5 + T, L.wallL, 4); wallBox(3.4, 4.5, 6, 4.5 + T, L.wallL, 4); wallBox(2.4, 4.5, 3.4, 4.5 + T, L.wallL, 4, 2.05, H, false);
  // bedroom south wall (door gap -3..-2) and east wall: two skins, one colour per side
  const skin = (x0, z0, x1, z1, cA, cB, alongX, y0 = 0, col = true) => {
    if (alongX) { wallBox(x0, z0, x1, (z0 + z1) / 2, cA, 4, y0, H, col); wallBox(x0, (z0 + z1) / 2, x1, z1, cB, 4, y0, H, false); }
    else { wallBox(x0, z0, (x0 + x1) / 2, z1, cA, 4, y0, H, col); wallBox((x0 + x1) / 2, z0, x1, z1, cB, 4, y0, H, false); }
    if (col && y0 < 0.5) { const w = WALLS[WALLS.length - 1]; w.x0 = x0; w.x1 = x1; w.z0 = z0; w.z1 = z1; }
  };
  skin(-6, -0.66, -3.0, -0.54, L.wallB, L.wallL, true); skin(-2.0, -0.66, -1.54, -0.54, L.wallB, L.wallL, true); skin(-3.0, -0.66, -2.0, -0.54, L.wallB, L.wallL, true, 2.05, false);
  skin(-1.66, -4.5, -1.54, -0.66, L.wallB, L.wallL, false); wallBox(-1.54, -0.675, -1.522, -0.525, L.trim, 0, 0, H, false);   // stops at the south wall; a trim post hides that wall's two-colour end
  // bathroom west + south walls (door gap 3.6..4.5)
  skin(3.14, -4.5, 3.26, -1.86, L.wallL, L.wallT, false); wallBox(3.122, -1.875, 3.14, -1.725, L.trim, 0, 0, H, false);
  const skinT = (x0, x1, y0, col) => { wallBox(x0, -1.86, x1, -1.8, L.wallT, 6, y0, H, col); wallBox(x0, -1.8, x1, -1.74, L.wallL, 4, y0, H, false); if (col) { const w = WALLS[WALLS.length - 1]; w.z1 = -1.74; } };
  skinT(3.14, 3.6, 0, true); skinT(4.5, 6, 0, true); skinT(3.6, 4.5, 2.05, false);

  TGT = SET.stat;
  // ---- bedroom ----
  F('bed', -4.9, -4.4, -3.1, -2.3, 0.56, 0.1, 'BED');
  BX(-4.9, -4.4, -3.1, -2.3, 0.14, 0.32, L.oak); BX(-4.86, -4.36, -3.14, -2.34, 0.32, 0.5, L.linen);
  for (const [x, z] of [[-4.82, -4.32], [-3.18, -4.32], [-4.82, -2.38], [-3.18, -2.38]]) BX(x - 0.05, z - 0.05, x + 0.05, z + 0.05, 0, 0.14, L.walnut);
  BX(-4.96, -4.47, -3.04, -4.38, 0.14, 1.15, L.oak);
  BX(-4.88, -3.75, -3.12, -2.32, 0.5, 0.56, L.duvet, [5, 0, 0, 0]);
  put('sph', -4.45, 0.57, -4.08, 0, 0, 0, 0.62, 0.14, 0.4, L.linen); put('sph', -3.55, 0.57, -4.08, 0, 0, 0, 0.62, 0.14, 0.4, L.linen);
  for (const [id, x0] of [['nsW', -5.55], ['nsE', -2.95]]) {
    F(id, x0, -4.4, x0 + 0.5, -3.9, 0.56, 0, 'NIGHTSTAND');
    BX(x0, -4.4, x0 + 0.5, -3.9, 0.06, 0.56, L.oak); BX(x0 + 0.04, -3.905, x0 + 0.46, -3.895, 0.3, 0.5, L.walnut); sph(x0 + 0.25, 0.4, -3.89, 0.02, L.steel);
    cyl(x0 + (id === 'nsW' ? 0.12 : 0.38), 0.6, -4.28, 0.05, 0.08, L.dark); cyl(x0 + (id === 'nsW' ? 0.12 : 0.38), 0.72, -4.28, 0.012, 0.2, L.steel);
  }
  F('dresser', -2.2, -3.4, -1.68, -1.7, 0.95, 0, 'DRESSER');
  BX(-2.2, -3.4, -1.68, -1.7, 0.05, 0.95, L.dresser); for (let i = 0; i < 3; i++) { BX(-2.21, -3.34, -2.2, -1.76, 0.12 + i * 0.28, 0.36 + i * 0.28, shade(L.dresser, 0.93)); sph(-2.22, 0.24 + i * 0.28, -2.95, 0.022, L.oak); sph(-2.22, 0.24 + i * 0.28, -2.15, 0.022, L.oak); }
  F('basket', -5.62, -1.56, -5.1, -1.04, 0.44, 0, 'LAUNDRY'); cyl(-5.36, 0.21, -1.3, 0.27, 0.42, C('#d8c7a3')); put('sph', -5.36, 0.42, -1.3, 0, 0, 0, 0.5, 0.16, 0.5, C('#e9eef5'));
  BX(-4.9, -2.1, -2.7, -0.95, 0, 0.014, C('#b5607a'), [3, 0, 0, 0]);
  // ---- kitchen ----
  F('counter', -1.4, -4.44, 2.3, -3.84, 0.92, 0, 'COUNTER');
  BX(-1.4, -4.44, 2.3, -3.88, 0.08, 0.88, L.cab); BX(-1.44, -4.44, 2.34, -3.82, 0.88, 0.92, L.top); BX(-1.36, -4.4, 2.26, -3.9, 0, 0.08, L.dark);
  for (let i = 0; i < 6; i++) { const x = -1.34 + i * 0.61; BX(x, -3.885, x + 0.57, -3.875, 0.14, 0.84, shade(L.cab, 1.12)); cyl(x + 0.5, 0.6, -3.86, 0.012, 0.12, L.steel); }
  BX(0.42, -4.3, 0.98, -3.96, 0.9, 0.925, C('#8e979c')); cyl(0.7, 1.05, -4.36, 0.018, 0.26, L.steel); limb(0.7, 1.18, -4.36, 0.7, 1.16, -4.2, 0.016, L.steel);
  BX(-1.4, -4.44, 2.3, -4.12, 1.55, 2.25, L.cab); for (let i = 0; i < 6; i++) { const x = -1.34 + i * 0.61; BX(x, -4.125, x + 0.57, -4.115, 1.6, 2.2, shade(L.cab, 1.12)); }
  BX(-0.5, -4.4, 0.25, -3.92, 0.92, 0.935, C('#30333a')); for (const [x, z] of [[-0.32, -4.25], [0.06, -4.25], [-0.32, -4.02], [0.06, -4.02]]) cyl(x, 0.94, z, 0.08, 0.01, C('#17181c'));
  F('fridge', 2.4, -4.44, 3.08, -3.74, 1.82, 0, 'FRIDGE');
  BX(2.4, -4.44, 3.08, -3.74, 0.03, 1.82, L.fridge); BX(2.42, -3.745, 3.06, -3.735, 1.22, 1.24, C('#b8b3a6')); cyl(2.5, 0.8, -3.71, 0.014, 0.5, L.steel); cyl(2.5, 1.5, -3.71, 0.014, 0.3, L.steel);
  F('island', -0.5, -2.75, 1.1, -2.05, 0.92, 0, 'ISLAND');
  BX(-0.44, -2.7, 1.04, -2.1, 0.06, 0.88, C('#f3ecdd')); BX(-0.5, -2.75, 1.1, -2.05, 0.88, 0.92, L.walnut);
  for (const x of [-0.1, 0.7]) { cyl(x, 2.3, -2.4, 0.006, 0.8, L.dark); cyl(x, 1.86, -2.4, 0.13, 0.16, C('#e8b34a', 0.35)); }
  put('cyl', 0.3, 0.95, -2.4, 0, 0, 0, 0.34, 0.07, 0.34, C('#e6e1d6'));     // fruit bowl
  BX(-1.5, -3.15, -0.95, -2.25, 0, 0.012, C('#6f8fb0'));                      // feeding mat
  // ---- dining ----
  F('table', 1.18, 0.38, 2.22, 1.42, 0.74, 0.68, 'TABLE'); put('cyl', 1.7, 0.71, 0.9, 0, 0, 0, 1.12, 0.06, 1.12, L.oak); cyl(1.7, 0.34, 0.9, 0.05, 0.68, L.walnut); put('cyl', 1.7, 0.02, 0.9, 0, 0, 0, 0.5, 0.04, 0.5, L.walnut);
  F('tleg', 1.6, 0.8, 1.8, 1.0, 0.68, 0, 'TABLE');
  for (const [id, z, s] of [['chairN', -0.02, 1], ['chairS', 1.82, -1]]) {
    F(id, 1.48, z - 0.2, 1.92, z + 0.2, 0.46, 0, 'CHAIR'); BX(1.48, z - 0.2, 1.92, z + 0.2, 0.42, 0.46, C('#4f7a6c'));
    for (const [dx, dz] of [[-0.19, -0.17], [0.19, -0.17], [-0.19, 0.17], [0.19, 0.17]]) BX(1.7 + dx - 0.02, z + dz - 0.02, 1.7 + dx + 0.02, z + dz + 0.02, 0, 0.42, L.walnut);
    BX(1.48, z - s * 0.2 - 0.02, 1.92, z - s * 0.2 + 0.02, 0.46, 0.95, C('#4f7a6c'));
  }
  // ---- living ----
  F('sofa', -4.6, 3.25, -2.4, 4.0, 0.45, 0, 'SOFA'); F('sofaBack', -4.75, 4.0, -2.25, 4.38, 0.92, 0, 'SOFA BACK'); F('armW', -4.78, 3.25, -4.6, 4.0, 0.62, 0, 'SOFA ARM'); F('armE', -2.4, 3.25, -2.22, 4.0, 0.62, 0, 'SOFA ARM');
  BX(-4.6, 3.25, -2.4, 4.0, 0.08, 0.34, L.sofaD); BX(-4.58, 3.27, -3.52, 3.98, 0.34, 0.45, L.sofa); BX(-3.48, 3.27, -2.42, 3.98, 0.34, 0.45, L.sofa);
  BX(-4.75, 4.0, -2.25, 4.38, 0.08, 0.92, L.sofa); BX(-4.78, 3.25, -4.6, 4.0, 0.08, 0.62, L.sofaD); BX(-2.4, 3.25, -2.22, 4.0, 0.08, 0.62, L.sofaD);
  put('box', -4.38, 0.6, 3.82, 0.3, -0.25, 0, 0.36, 0.34, 0.12, C('#2c6e73')); put('box', -2.62, 0.6, 3.82, -0.3, -0.25, 0, 0.36, 0.34, 0.12, C('#f1e4cc'));
  F('ctable', -4.2, 1.7, -2.8, 2.35, 0.42, 0, 'COFFEE TABLE'); BX(-4.2, 1.7, -2.8, 2.35, 0.34, 0.42, L.walnut); BX(-4.14, 1.76, -2.86, 2.29, 0.05, 0.34, shade(L.walnut, 0.8));
  BX(-5.1, 1.2, -1.9, 3.15, 0, 0.014, L.navy, [3, 0, 0, 0]);
  F('tvstand', -5.3, -0.5, -3.5, -0.08, 0.5, 0, 'TV STAND'); BX(-5.3, -0.5, -3.5, -0.08, 0.06, 0.5, L.oak); BX(-5.24, -0.085, -4.44, -0.075, 0.12, 0.44, L.walnut); BX(-4.36, -0.085, -3.56, -0.075, 0.12, 0.44, L.walnut);
  F('tv', -5.02, -0.46, -3.78, -0.34, 1.34, 0.5, 'TV'); BX(-5.0, -0.44, -3.8, -0.37, 0.58, 1.32, L.dark); BX(-4.5, -0.46, -4.3, -0.34, 0.5, 0.58, L.dark);
  F('shelf', -5.94, 0.7, -5.6, 2.3, 1.9, 0, 'BOOKSHELF'); BX(-5.94, 0.7, -5.6, 2.3, 0, 1.9, L.oak);
  { const bc = ['#c44b4b', '#3f6fb0', '#e0b13c', '#4f9a6a', '#8a5aa8', '#e07b39', '#2f7f82', '#d9d2c2']; let k = 0;
    for (let s = 0; s < 4; s++) { const y = 0.12 + s * 0.44; BX(-5.6, 0.74, -5.59, 2.26, y, y + 0.36, shade(L.walnut, 0.7));
      let z = 0.78; while (z < 2.2) { const w = 0.05 + ((k * 37) % 5) * 0.012, hh = 0.24 + ((k * 13) % 4) * 0.03; BX(-5.62, z, -5.57, z + w, y, y + hh, C(bc[k % 8])); z += w + 0.006; k++; } } }
  F('treeLo', -1.6, 3.5, -0.8, 4.3, 0.06, 0, 'CAT TREE'); F('treeMid', -1.6, 3.5, -1.1, 4.3, 0.56, 0.5, 'CAT TREE'); F('treeHi', -1.3, 3.75, -0.8, 4.3, 1.26, 1.2, 'CAT TREE');
  BX(-1.6, 3.5, -0.8, 4.3, 0, 0.06, L.carpet); BX(-1.6, 3.5, -1.1, 4.3, 0.5, 0.56, L.carpet); BX(-1.3, 3.75, -0.8, 4.3, 1.2, 1.26, L.carpet);
  cyl(-1.35, 0.28, 3.72, 0.06, 0.44, L.sisal); cyl(-1.0, 0.63, 4.1, 0.065, 1.14, L.sisal); F('treePost', -1.07, 4.03, -0.93, 4.17, 1.2, 0, 'SCRATCHING POST');
  F('lamp', -5.62, 3.56, -5.38, 3.8, 1.5, 0, 'LAMP'); cyl(-5.5, 0.02, 3.68, 0.14, 0.04, L.dark); cyl(-5.5, 0.75, 3.68, 0.015, 1.46, L.dark); cyl(-5.5, 1.56, 3.68, 0.17, 0.26, C('#f0d9a0', 0.3));
  // ---- desk nook ----
  F('desk', 5.15, 0.4, 5.94, 2.2, 0.75, 0.69, 'DESK'); BX(5.15, 0.4, 5.94, 2.2, 0.71, 0.75, C('#f4f1ea'));
  for (const [x, z] of [[5.2, 0.45], [5.2, 2.15], [5.89, 0.45], [5.89, 2.15]]) BX(x - 0.025, z - 0.025, x + 0.025, z + 0.025, 0, 0.71, L.oak);
  F('deskL1', 5.82, 0.4, 5.94, 2.2, 0.69, 0, 'DESK');
  F('chair', 4.5, 1.08, 4.94, 1.52, 0.48, 0, 'OFFICE CHAIR'); BX(4.5, 1.08, 4.94, 1.52, 0.42, 0.48, C('#3b4a5a')); cyl(4.72, 0.22, 1.3, 0.03, 0.4, L.steel); put('cyl', 4.72, 0.03, 1.3, 0, 0, 0, 0.5, 0.04, 0.5, L.dark); BX(4.48, 1.1, 4.53, 1.5, 0.5, 1.0, C('#3b4a5a'));
  F('filing', 5.4, 2.3, 5.94, 2.9, 0.68, 0, 'FILING CABINET'); BX(5.4, 2.3, 5.94, 2.9, 0, 0.68, C('#8fa3a8')); BX(5.39, 2.34, 5.4, 2.86, 0.06, 0.32, C('#7f9398')); BX(5.39, 2.34, 5.4, 2.86, 0.36, 0.62, C('#7f9398'));
  // ---- entry ----
  F('shoes', 3.7, 4.08, 4.7, 4.44, 0.42, 0, 'SHOE RACK'); BX(3.7, 4.08, 4.7, 4.44, 0.38, 0.42, L.oak); BX(3.7, 4.08, 4.7, 4.44, 0.14, 0.17, L.oak); BX(3.7, 4.08, 3.74, 4.44, 0, 0.38, L.oak); BX(4.66, 4.08, 4.7, 4.44, 0, 0.38, L.oak);
  BX(2.45, 3.7, 3.35, 4.3, 0, 0.012, C('#7a6a55'));
  F('plant', 1.1, 3.8, 1.54, 4.24, 0.42, 0, 'PLANT');
  // ---- bathroom ----
  F('tub', 3.5, -4.44, 5.9, -3.7, 0.56, 0, 'BATHTUB'); BX(3.5, -4.44, 5.9, -3.7, 0, 0.56, L.white); BX(3.58, -4.36, 5.82, -3.78, 0.5, 0.565, C('#cfe6ee'));
  F('vanity', 5.35, -3.3, 5.94, -2.5, 0.85, 0, 'SINK'); BX(5.35, -3.3, 5.94, -2.5, 0, 0.8, C('#f3ecdd')); BX(5.33, -3.32, 5.94, -2.48, 0.8, 0.85, L.white); put('cyl', 5.62, 0.86, -2.9, 0, 0, 0, 0.34, 0.02, 0.3, C('#cfd6da'));
  BX(5.93, -3.2, 5.94, -2.6, 1.15, 1.85, C('#bfe9f5', 0.25));
  F('toilet', 3.3, -3.2, 3.86, -2.72, 0.42, 0, 'TOILET'); BX(3.3, -3.14, 3.5, -2.78, 0, 0.8, L.white); put('cyl', 3.66, 0.2, -2.96, 0, 0, 0, 0.38, 0.4, 0.42, L.white); put('cyl', 3.66, 0.41, -2.96, 0, 0, 0, 0.4, 0.03, 0.44, C('#e7e2d8'));
  BX(4.0, -3.5, 4.9, -2.9, 0, 0.012, C('#6aa7b5'));
  // wall art + clock (decor)
  TGT = SET.room;
  const frame = (x, y, z, w, h, ax, rect) => { if (ax === 'z') { box(x, y, z, w + 0.06, h + 0.06, 0.03, L.walnut); TGT = SET.room; put('quad', x, y, z + (z < 0 ? 0.02 : -0.02), z < 0 ? 0 : Math.PI, 0, 0, w, h, 1, C('#ffffff'), rect); } else { box(x, y, z, 0.03, h + 0.06, w + 0.06, L.walnut); put('quad', x + (x < 0 ? 0.02 : -0.02), y, z, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0, w, h, 1, C('#ffffff'), rect); } };
  frame(-0.5, 1.55, 4.47, 0.5, 0.62, 'z', ATLAS.rects.portrait); frame(0.9, 1.55, 4.47, 0.42, 0.42, 'z', ATLAS.rects.fish);
  frame(-4.4, 1.98, -0.525, 0.72, 0.54, 'z', ATLAS.rects.mount); frame(5.97, 1.5, 3.6, 0.5, 0.62, 'x', ATLAS.rects.poster);
  put('cyl', 0.4, 2.42, -4.47, 0, Math.PI / 2, 0, 0.34, 0.03, 0.34, L.dark); put('quad', 0.4, 2.42, -4.45, 0, 0, 0, 0.3, 0.3, 1, C('#ffffff'), ATLAS.rects.clock);
  TGT = SET.dyn;
}

// windows: emissive panes whose picture follows the time of day (drawn every frame)
const WINDOWS = [
  { ax: 'x', x: -5.995, z: -2.6, y: 1.55, w: 1.9, h: 1.15 }, { ax: 'z', x: -3.5, z: 4.495, y: 1.7, w: 2.5, h: 1.0 },
  { ax: 'z', x: -1.2, z: 4.495, y: 1.45, w: 1.1, h: 1.9 }, { ax: 'x', x: 5.995, z: 1.3, y: 1.6, w: 1.7, h: 1.1 }
];
function drawWindows(tod) {
  const r = ATLAS.rects['win' + tod.win], glow = C('#ffffff', tod.winGlow);
  for (const w of WINDOWS) {
    if (w.ax === 'z') {
      put('quad', w.x, w.y, w.z - 0.01, Math.PI, 0, 0, w.w, w.h, 1, glow, r);
      box(w.x, w.y + w.h / 2, w.z - 0.03, w.w + 0.12, 0.06, 0.06, COLS.trim); box(w.x, w.y - w.h / 2, w.z - 0.05, w.w + 0.2, 0.05, 0.14, COLS.trim);
      box(w.x - w.w / 2, w.y, w.z - 0.03, 0.06, w.h, 0.06, COLS.trim); box(w.x + w.w / 2, w.y, w.z - 0.03, 0.06, w.h, 0.06, COLS.trim); box(w.x, w.y, w.z - 0.03, 0.035, w.h, 0.04, COLS.trim);
    } else {
      const s = w.x < 0 ? 1 : -1;
      put('quad', w.x + s * 0.01, w.y, w.z, s * Math.PI / 2, 0, 0, w.w, w.h, 1, glow, r);
      box(w.x + s * 0.03, w.y + w.h / 2, w.z, 0.06, 0.06, w.w + 0.12, COLS.trim); box(w.x + s * 0.05, w.y - w.h / 2, w.z, 0.14, 0.05, w.w + 0.2, COLS.trim);
      box(w.x + s * 0.03, w.y, w.z - w.w / 2, 0.06, w.h, 0.06, COLS.trim); box(w.x + s * 0.03, w.y, w.z + w.w / 2, 0.06, w.h, 0.06, COLS.trim); box(w.x + s * 0.03, w.y, w.z, 0.04, w.h, 0.035, COLS.trim);
    }
  }
}
function drawDoors() {
  for (const k in DOORS) {
    const d = DOORS[k], w = d.x1 - d.x0, a = d.open * (d.max || 1) * 1.62 * (d.hinge === d.x0 ? 1 : -1) * d.dir * -1;
    // hinge at one end of the gap, panel swings into the room on the dir side
    pushXf(d.hinge, 0, d.z, a, 0, 0);
    const sx = d.hinge === d.x0 ? 1 : -1;
    box(sx * w / 2, 1.02, 0, w - 0.02, 2.04, 0.05, k === 'front' ? C('#7b4a3a') : C('#f3ead8'));
    sph(sx * (w - 0.12), 1.0, 0.05, 0.035, COLS.steel); sph(sx * (w - 0.12), 1.0, -0.05, 0.035, COLS.steel);
    popXf();
    if (k === 'front' && d.open > 0.02) { TGT = SET.dynN; put('quad', 2.9, 1.02, 4.62, Math.PI, 0, 0, 1.0, 2.04, 1, C('#f3d9a0', 0.9)); TGT = SET.dyn; }
  }
}
function doorBlocks(d) { return d.id === 'front' || d.open < 0.45; }

// ---------- atlas art ----------
function buildAtlas() {
  const sky = (name, top, bot, sun, stars) => atlasRect(name, 256, 192, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (stars) { g.fillStyle = '#fff'; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % w, (i * 53) % (h * 0.6), 2, 2); }
    if (sun) { g.fillStyle = sun[2]; g.beginPath(); g.arc(sun[0], sun[1], 16, 0, TAU); g.fill(); }
    g.fillStyle = stars ? '#141a33' : 'rgba(60,70,95,0.55)';
    const bl = [30, 70, 46, 96, 58, 40, 84, 64, 110, 52, 76]; let x = 0; for (let i = 0; x < w; i++) { const bw = 18 + (i * 7) % 16, bh = bl[i % bl.length]; g.fillRect(x, h - bh, bw, bh); if (stars) { g.fillStyle = '#f3d36b'; for (let k = 0; k < 3; k++) if ((i + k) % 2) g.fillRect(x + 4 + k * 5, h - bh + 8 + k * 9, 3, 4); g.fillStyle = '#141a33'; } x += bw + 3; }
  });
  sky('winnight', '#0a1030', '#27305c', [200, 40, '#f4f1d0'], true); sky('windawn', '#5a6fb0', '#f5b58a', [60, 150, '#ffe6a8'], false);
  sky('winday', '#6fb6ee', '#d8efff', [200, 36, '#fff6c8'], false); sky('windusk', '#3b3f7a', '#f08a5a', [190, 150, '#ffd08a'], false);
  atlasRect('portrait', 128, 160, (g, w, h) => { g.fillStyle = '#e9d9b8'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8943a'; g.beginPath(); g.arc(64, 88, 40, 0, TAU); g.fill(); g.beginPath(); g.moveTo(28, 70); g.lineTo(34, 30); g.lineTo(58, 56); g.fill(); g.beginPath(); g.moveTo(100, 70); g.lineTo(94, 30); g.lineTo(70, 56); g.fill();
    g.fillStyle = '#2a4'; g.beginPath(); g.arc(50, 84, 7, 0, TAU); g.arc(78, 84, 7, 0, TAU); g.fill(); g.fillStyle = '#111'; g.fillRect(49, 78, 2, 12); g.fillRect(77, 78, 2, 12); g.fillStyle = '#e88'; g.beginPath(); g.arc(64, 98, 4, 0, TAU); g.fill();
    g.fillStyle = '#7a4e2d'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.fillText('MANAGEMENT', 64, 148); });
  atlasRect('fish', 96, 96, (g, w, h) => { g.fillStyle = '#cfe6ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#e07b39'; g.beginPath(); g.ellipse(46, 48, 26, 14, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(70, 48); g.lineTo(88, 34); g.lineTo(88, 62); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(32, 44, 3, 0, TAU); g.fill(); });
  atlasRect('mount', 160, 120, (g, w, h) => { g.fillStyle = '#f2c79a'; g.fillRect(0, 0, w, h); g.fillStyle = '#7d8fb5'; g.beginPath(); g.moveTo(0, h); g.lineTo(50, 40); g.lineTo(90, 90); g.lineTo(120, 55); g.lineTo(w, h); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(50, 40); g.lineTo(40, 55); g.lineTo(60, 55); g.fill(); });
  atlasRect('poster', 128, 160, (g, w, h) => { g.fillStyle = '#2c3e63'; g.fillRect(0, 0, w, h); g.fillStyle = '#f1e4cc'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.fillText('HANG', 64, 50); g.fillText('IN', 64, 78); g.fillText('THERE', 64, 106); g.font = '11px sans-serif'; g.fillText('(it is Monday)', 64, 134); });
  atlasRect('clock', 96, 96, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#fbf6ea'; g.beginPath(); g.arc(48, 48, 46, 0, TAU); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(48 + Math.sin(a) * 38, 48 - Math.cos(a) * 38); g.lineTo(48 + Math.sin(a) * 43, 48 - Math.cos(a) * 43); g.stroke(); } g.beginPath(); g.moveTo(48, 48); g.lineTo(48, 18); g.moveTo(48, 48); g.lineTo(66, 58); g.stroke(); });
  atlasRect('tvon', 256, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6fb6ee'); gr.addColorStop(1, '#3f8f4f'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f1d0'; g.beginPath(); g.arc(200, 40, 18, 0, TAU); g.fill();
    g.fillStyle = '#7a4e2d'; g.beginPath(); g.ellipse(110, 110, 46, 22, 0, 0, TAU); g.fill(); g.fillRect(140, 80, 12, 30); g.beginPath(); g.arc(150, 76, 14, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 14px sans-serif'; g.fillText('BIRDS: UP CLOSE', 12, 150); });
  atlasRect('call', 256, 160, (g, w, h) => { g.fillStyle = '#1d2330'; g.fillRect(0, 0, w, h); const cs = ['#5a7fb0', '#b07a5a', '#6aa07a', '#a06a9a', '#b0a25a', '#5aa0a8'];
    for (let i = 0; i < 6; i++) { const x = 8 + (i % 3) * 82, y = 10 + Math.floor(i / 3) * 72; g.fillStyle = cs[i]; g.fillRect(x, y, 76, 64); g.fillStyle = '#f0d0b0'; g.beginPath(); g.arc(x + 38, y + 28, 13, 0, TAU); g.fill(); g.fillRect(x + 20, y + 44, 36, 20); } g.fillStyle = '#e04040'; g.fillRect(112, 148, 32, 8); });
  atlasRect('email', 256, 160, (g, w, h) => { g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#3f6fb0'; g.fillRect(0, 0, w, 22); g.fillStyle = '#999'; for (let i = 0; i < 7; i++) g.fillRect(14, 36 + i * 16, 120 + (i * 53) % 110, 6); });
  atlasRect('puzzle', 192, 128, (g, w, h) => { g.fillStyle = '#6fb6ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#3f8f4f'; g.fillRect(0, 80, w, 48); g.fillStyle = '#c44b4b'; g.fillRect(60, 50, 60, 44); g.fillStyle = '#7a4e2d'; g.beginPath(); g.moveTo(52, 52); g.lineTo(90, 22); g.lineTo(128, 52); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; for (let x = 16; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 16; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.fillStyle = '#e9dfcf'; g.fillRect(160, 96, 32, 32); });
  atlasRect('book', 64, 96, (g, w, h) => { g.fillStyle = '#8a5aa8'; g.fillRect(0, 0, w, h); g.fillStyle = '#f1e4cc'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillText('DOGS:', 32, 34); g.fillText('WHY?', 32, 48); });
  atlasRect('kibble', 64, 96, (g, w, h) => { g.fillStyle = '#e07b39'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText('MEOW', 32, 30); g.fillText('CHOW', 32, 46); g.fillStyle = '#7a4e2d'; g.beginPath(); g.arc(32, 70, 12, 0, TAU); g.fill(); });
  atlasUpload();
}

// ---------- queries ----------
function inBox(b, x, z, m = 0) { return x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m; }
// height of the highest platform under (x,z) that is at or below feet height y
function supportAt(x, z, y) { let t = 0, f = null; for (const b of FURN) if (b.top <= y + 0.07 && b.top > t && inBox(b, x, z)) { t = b.top; f = b; } return { y: t, f }; }
function topAt(x, z, maxY = 9) { let t = 0, f = null; for (const b of FURN) if (b.top <= maxY && b.top > t && inBox(b, x, z)) { t = b.top; f = b; } return { y: t, f }; }
// circle vs wall/furniture/door push-out for the cat at feet height y
function collideCat(p, r, y) {
  for (let it = 0; it < 2; it++) {
    const push = (x0, x1, z0, z1) => {
      const cx = clamp(p.x, x0, x1), cz = clamp(p.z, z0, z1); let dx = p.x - cx, dz = p.z - cz; const d = hyp(dx, dz);
      if (d >= r) return false;
      if (d < 1e-5) { const l = p.x - x0, rr2 = x1 - p.x, t = p.z - z0, b = z1 - p.z, m = Math.min(l, rr2, t, b); if (m === l) p.x = x0 - r; else if (m === rr2) p.x = x1 + r; else if (m === t) p.z = z0 - r; else p.z = z1 + r; return true; }
      p.x = cx + dx / d * r; p.z = cz + dz / d * r; return true;
    };
    for (const w of WALLS) push(w.x0, w.x1, w.z0, w.z1);
    for (const k in DOORS) { const d = DOORS[k]; if (doorBlocks(d)) push(d.x0, d.x1, d.z - 0.06, d.z + 0.06); }
    for (const b of FURN) if (y + 0.3 > b.base && y + 0.05 < b.top) push(b.x0, b.x1, b.z0, b.z1);
  }
  p.x = clamp(p.x, APT.x0 + r, APT.x1 - r); p.z = clamp(p.z, APT.z0 + r, APT.z1 - r);
}
function segBox(ax, az, bx, bz, x0, x1, z0, z1) {
  let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
  for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dz, az - z0], [dz, z1 - az]]) { if (Math.abs(p) < 1e-9) { if (q < 0) return false; } else { const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } } }
  return true;
}
// sight line at head height: walls and closed doors block
function losClear(ax, az, bx, bz) {
  for (const w of WALLS) if (segBox(ax, az, bx, bz, w.x0, w.x1, w.z0, w.z1)) return false;
  for (const k in DOORS) { const d = DOORS[k]; if (d.open < 0.45 && segBox(ax, az, bx, bz, d.x0, d.x1, d.z - 0.06, d.z + 0.06)) return false; }
  return true;
}
// can the cat travel in a straight line from a to b? walls, closed doors and the front door block
function pathClear(ax, az, bx, bz) {
  const m = 0.05;
  for (const w of WALLS) if (segBox(ax, az, bx, bz, w.x0 - m, w.x1 + m, w.z0 - m, w.z1 + m)) return false;
  for (const k in DOORS) { const d = DOORS[k]; if (doorBlocks(d) && segBox(ax, az, bx, bz, d.x0, d.x1, d.z - 0.06 - m, d.z + 0.06 + m)) return false; }
  return bx > APT.x0 && bx < APT.x1 && bz > APT.z0 && bz < APT.z1;
}
function roomOf(x, z) { if (x < -1.6 && z < -0.6) return 'bed'; if (x > 3.2 && z < -1.8) return 'bath'; return 'main'; }
// 3D ray vs boxes for the chase camera: returns the nearest hit fraction (0..1)
function camRay(ox, oy, oz, tx, ty, tz, skip) {
  let best = 1; const dx = tx - ox, dy = ty - oy, dz = tz - oz;
  const test = (x0, x1, y0, y1, z0, z1) => {
    let t0 = 0, t1 = best;
    for (const [o, d, a, b] of [[ox, dx, x0, x1], [oy, dy, y0, y1], [oz, dz, z0, z1]]) {
      if (Math.abs(d) < 1e-9) { if (o < a || o > b) return; } else { let ta = (a - o) / d, tb = (b - o) / d; if (ta > tb) { const s = ta; ta = tb; tb = s; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return; }
    }
    if (t0 < best) best = t0;
  };
  const m = 0.1;
  for (const w of WALLS) test(w.x0 - m, w.x1 + m, 0, APT.H, w.z0 - m, w.z1 + m);
  for (const k in DOORS) { const d = DOORS[k]; if (d.open < 0.45) test(d.x0, d.x1, 0, 2.05, d.z - 0.1, d.z + 0.1); else if (k !== 'front') test(d.hinge - 0.08, d.hinge + 0.08, 0, 2.05, d.z - (d.x1 - d.x0), d.z); }   // open panels stand along the hinge side
  for (const b of FURN) if (b !== skip && b.top - b.base > 0.2) test(b.x0 - 0.05, b.x1 + 0.05, b.base, b.top + 0.05, b.z0 - 0.05, b.z1 + 0.05);
  test(-1.45, 2.35, 1.5, 2.3, -4.5, -4.07);   // upper kitchen cabinets
  return best;
}

// ---------- nav grid for humans ----------
const NAV = { cs: 0.2, w: 60, h: 45, blk: null };
function navBuild() {
  NAV.blk = new Uint8Array(NAV.w * NAV.h); const R = 0.23;
  for (let j = 0; j < NAV.h; j++) for (let i = 0; i < NAV.w; i++) {
    const x = APT.x0 + (i + .5) * NAV.cs, z = APT.z0 + (j + .5) * NAV.cs; let b = x < APT.x0 + R || x > APT.x1 - R || z < APT.z0 + R || z > APT.z1 - R;
    if (!b) for (const w of WALLS) if (inBox(w, x, z, R)) { b = true; break; }
    if (!b) for (const f of FURN) if (f.base < 1.4 && f.top > 0.1 && inBox(f, x, z, R)) { b = true; break; }
    NAV.blk[j * NAV.w + i] = b ? 1 : 0;
  }
}
const navI = (x, z) => [clamp(Math.floor((x - APT.x0) / NAV.cs), 0, NAV.w - 1), clamp(Math.floor((z - APT.z0) / NAV.cs), 0, NAV.h - 1)];
const navFree = (x, z) => { const [i, j] = navI(x, z); return !NAV.blk[j * NAV.w + i]; };
function navNearestFree(x, z) {
  if (navFree(x, z)) return [x, z];
  for (let r = 1; r < 8; r++) for (let a = 0; a < 16; a++) { const nx = x + Math.sin(a / 16 * TAU) * r * 0.15, nz = z + Math.cos(a / 16 * TAU) * r * 0.15; if (navFree(nx, nz)) return [nx, nz]; }
  return [x, z];
}
function navLine(ax, az, bx, bz) { const n = Math.ceil(d2(ax, az, bx, bz) / 0.08); for (let i = 1; i < n; i++) { const t = i / n; if (!navFree(lerp(ax, bx, t), lerp(az, bz, t))) return false; } return true; }
function navPath(ax, az, bx, bz) {
  [ax, az] = navNearestFree(ax, az); [bx, bz] = navNearestFree(bx, bz);
  if (navLine(ax, az, bx, bz)) return [[bx, bz]];
  const W = NAV.w, N = W * NAV.h, [si, sj] = navI(ax, az), [gi, gj] = navI(bx, bz), s = sj * W + si, g = gj * W + gi;
  const gs = new Float32Array(N).fill(1e9), fs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N), open = [s];
  gs[s] = 0; fs[s] = 0;
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (fs[open[k]] < fs[open[bi]]) bi = k;
    const c = open[bi]; open[bi] = open[open.length - 1]; open.pop(); if (c === g) break; if (closed[c]) continue; closed[c] = 1;
    const ci = c % W, cj = (c / W) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= NAV.h) continue; const n = nj * W + ni; if (NAV.blk[n] || closed[n]) continue;
      if (di && dj && (NAV.blk[cj * W + ni] || NAV.blk[nj * W + ci])) continue;
      const ng = gs[c] + (di && dj ? 1.414 : 1); if (ng < gs[n]) { gs[n] = ng; from[n] = c; fs[n] = ng + hyp(ni - gi, nj - gj); open.push(n); }
    }
  }
  if (from[g] < 0) return [[bx, bz]];
  const pts = []; for (let c = g; c >= 0; c = from[c]) pts.push([APT.x0 + (c % W + .5) * NAV.cs, APT.z0 + (((c / W) | 0) + .5) * NAV.cs]);
  pts.reverse(); pts[pts.length - 1] = [bx, bz];
  const out = []; let cx = ax, cz = az, i = 0;
  while (i < pts.length) { let j = pts.length - 1; while (j > i && !navLine(cx, cz, pts[j][0], pts[j][1])) j--; out.push(pts[j]); cx = pts[j][0]; cz = pts[j][1]; i = j + 1; }
  return out;
}
