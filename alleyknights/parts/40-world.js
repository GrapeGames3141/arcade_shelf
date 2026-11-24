// ---------- the alley: layout, colliders, hazards, lights, static mesh ----------
// Metres, y up. The alley runs along Z: the street end is +Z (z > 26), the chain-link fence end is -Z (z = -26).
const AX = 6.0, AZ0 = -26, AZ1 = 26, CURB_Z = 28.2, FENCE_Z = -26;
const MANHOLE = { x: 1.6, z: 7.5, r: 0.55 };
// dumpsters against the walls: x, z, yaw (front faces the alley centre)
const DUMP_SPOTS = [[5.42, 17.5, -Math.PI / 2], [-5.42, 9.0, Math.PI / 2], [5.42, -4.5, -Math.PI / 2], [-5.42, -16.5, Math.PI / 2]];
const DUMP_NAMES = ['Pizza Bin', 'Laundry Bin', 'Noodle Bin', 'Fence Bin'];
const DEN = { x: -4.85, z: 1.2, yaw: Math.PI / 2 };   // the couch; the stash lives under it
// where varmints come from
const ENTRIES = {
  street: [[-3.5, 31], [0, 31], [3.5, 31]],
  fence: [[-4, -28.5], [0, -28.5], [4, -28.5]],
  sewer: [[MANHOLE.x, MANHOLE.z]],
  roof: [[-5.5, 30, 12], [5.5, 30, -10], [-5.5, -20, 11], [5.5, 2, 12]],   // x, y? no: [x, z, height]
};
const STATICS = [];
function addBox(kind, x, z, hx, hz, ang = 0, y1 = 1.2, extra) { const s = { kind, shape: 'box', x, z, hx, hz, ang, c: Math.cos(ang), s: Math.sin(ang), y1, ...(extra || {}) }; STATICS.push(s); return s; }
function addCirc(kind, x, z, r, y1 = 1.0, extra) { const s = { kind, shape: 'circ', x, z, r, y1, ...(extra || {}) }; STATICS.push(s); return s; }
// closest point / signed distance to a static in XZ: [px, pz, d, nx, nz]
function staticClosest(s, x, z) {
  if (s.shape === 'circ') { const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz) || 1e-6; return [s.x + dx / d * s.r, s.z + dz / d * s.r, d - s.r, dx / d, dz / d]; }
  // box: local axes (rotated by ang about Y; local x = (c, -s), local z = (s, c) in world xz)
  const dx = x - s.x, dz = z - s.z;
  const lx = dx * s.c - dz * s.s, lz = dx * s.s + dz * s.c;
  const qx = Math.abs(lx) - s.hx, qz = Math.abs(lz) - s.hz;
  let nlx, nlz, d;
  if (qx > 0 || qz > 0) { const ox = Math.max(qx, 0), oz = Math.max(qz, 0); d = Math.hypot(ox, oz); nlx = ox * Math.sign(lx) / (d || 1); nlz = oz * Math.sign(lz) / (d || 1); }
  else if (qx > qz) { d = qx; nlx = Math.sign(lx); nlz = 0; } else { d = qz; nlx = 0; nlz = Math.sign(lz); }
  const nx = nlx * s.c + nlz * s.s, nz = -nlx * s.s + nlz * s.c;
  return [x - nx * d, z - nz * d, d, nx, nz];
}
function buildStatics() {
  STATICS.length = 0;
  DUMP_SPOTS.forEach(([x, z, yaw], i) => addBox('dumpster', x, z, 0.92, 0.58, yaw, 1.15, { dump: i }));
  addBox('couch', DEN.x, DEN.z, 1.05, 0.48, DEN.yaw, 0.75);
  addBox('pallets', 5.25, 7.2, 0.6, 0.55, 0.15, 0.6);
  addBox('crates', -5.2, -9.2, 0.45, 0.45, 0.3, 0.9);
  addCirc('bin', 5.4, -12.8, 0.32, 0.95);
  addCirc('bin', 5.35, -13.6, 0.32, 0.95);
  addBox('ac', -5.3, 18.5, 0.5, 0.45, 0, 0.8);
  addBox('steps', 5.5, 21.2, 0.5, 0.75, 0, 0.3);
  addBox('steps', -5.5, -2.8, 0.5, 0.7, 0, 0.3);
}
// height of walkable tops (dumpster lids, couch seat, pallets) for jumping onto
function topAt(x, z) {
  let h = 0;
  for (const s of STATICS) { if (s.kind === 'bin') continue; const d = staticClosest(s, x, z)[2]; if (d < -0.05) h = Math.max(h, s.kind === 'couch' ? 0.48 : s.y1); }
  return h;
}

// ---------- texture atlas: signs, graffiti, stencils ----------
const ATL = { W: 2048, H: 1024 };
const atlasUV = (x, y, w, h) => [x / ATL.W, y / ATL.H, (x + w) / ATL.W, (y + h) / ATL.H];
const UV = {};
function makeAtlas() {
  const cv = document.createElement('canvas'); cv.width = ATL.W; cv.height = ATL.H; const g = cv.getContext('2d');
  g.clearRect(0, 0, ATL.W, ATL.H);
  const sign = (key, x, y, w, h, draw) => { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.translate(x, y); draw(w, h); g.restore(); UV[key] = atlasUV(x + 1, y + 1, w - 2, h - 2); };
  // neon PIZZA (glow text on transparent)
  sign('pizza', 0, 0, 512, 160, (w, h) => { g.font = '900 120px Impact, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff3fa8'; g.shadowBlur = 24; g.fillStyle = '#ff9ad2'; g.fillText('PIZZA', w / 2, h / 2 + 4); g.shadowBlur = 0; g.fillStyle = '#fff0f8'; g.fillText('PIZZA', w / 2, h / 2 + 4); });
  sign('laundro', 512, 0, 768, 160, (w, h) => { g.font = 'italic 900 92px Arial Black, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#3fb4ff'; g.shadowBlur = 22; g.fillStyle = '#8fd4ff'; g.fillText('LAUNDROMAT', w / 2, h / 2); g.shadowBlur = 0; g.fillStyle = '#eef8ff'; g.fillText('LAUNDROMAT', w / 2, h / 2); });
  sign('noodle', 1280, 0, 512, 160, (w, h) => { g.font = '900 100px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ffb020'; g.shadowBlur = 22; g.fillStyle = '#ffd77a'; g.fillText('NOODLES', w / 2, h / 2); g.shadowBlur = 0; g.fillStyle = '#fff7e0'; g.fillText('NOODLES', w / 2, h / 2); });
  // painted signs (opaque)
  sign('noparking', 0, 160, 256, 256, (w, h) => { g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c81e1e'; g.lineWidth = 22; g.beginPath(); g.arc(128, 110, 70, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(80, 60); g.lineTo(176, 160); g.stroke();
    g.fillStyle = '#c81e1e'; g.font = '900 60px Arial Black'; g.textAlign = 'center'; g.fillText('P', 128, 132); g.fillStyle = '#222'; g.font = '900 30px Arial'; g.fillText('TOW ZONE', 128, 232); });
  sign('deliveries', 256, 160, 512, 128, (w, h) => { g.fillStyle = '#e7d24a'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1a1a'; g.font = '900 52px Arial Black'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DELIVERIES ONLY', w / 2, h / 2); });
  sign('waste', 768, 160, 512, 128, (w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.fillStyle = '#f2f2f2'; g.font = '900 64px Arial Black'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CITY WASTE CO', w / 2, h / 2); });
  // graffiti: the Alley Knights crest (a lid with a fork crossed behind it) + tags
  sign('crest', 0, 416, 512, 512, (w, h) => {
    g.translate(w / 2, h / 2 + 10); g.rotate(-0.08);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 26; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-170, 170); g.lineTo(170, -170); g.stroke(); g.beginPath(); g.moveTo(170, 170); g.lineTo(-170, -170); g.stroke();
    g.fillStyle = '#9aa3ad'; g.beginPath(); g.arc(0, 0, 120, 0, TAU); g.fill(); g.strokeStyle = '#4d5560'; g.lineWidth = 12; g.beginPath(); g.arc(0, 0, 120, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 80, 0, TAU); g.stroke();
    g.fillStyle = '#222'; g.beginPath(); g.ellipse(-40, -10, 40, 22, 0, 0, TAU); g.ellipse(40, -10, 40, 22, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-38, -12, 9, 0, TAU); g.arc(42, -12, 9, 0, TAU); g.fill();
    g.font = 'italic 900 58px Impact'; g.textAlign = 'center'; g.fillStyle = '#ff4f6d'; g.strokeStyle = '#1a1a1a'; g.lineWidth = 8;
    g.strokeText('ALLEY KNIGHTS', 0, 200); g.fillText('ALLEY KNIGHTS', 0, 200);
  });
  sign('tag1', 512, 416, 512, 256, (w, h) => { g.font = 'italic 900 120px Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 14; g.strokeStyle = '#1b1b1b'; g.fillStyle = '#4fd1c5'; g.save(); g.translate(w / 2, h / 2); g.rotate(-0.12); g.strokeText('RATZ', 0, 0); g.fillText('RATZ', 0, 0); g.restore(); });
  sign('tag2', 1024, 416, 512, 256, (w, h) => { g.font = 'italic 900 88px Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 12; g.strokeStyle = '#1b1b1b'; g.fillStyle = '#c084fc'; g.save(); g.translate(w / 2, h / 2); g.rotate(0.08); g.strokeText('POSSUM', 0, -40); g.fillText('POSSUM', 0, -40); g.strokeText('POSSE', 0, 50); g.fillText('POSSE', 0, 50); g.restore(); });
  sign('stash', 512, 672, 512, 160, (w, h) => { g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.font = 'bold 64px "Comic Sans MS", cursive'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('KEEP OUT!!', w / 2, h / 2 - 10); g.font = 'bold 30px "Comic Sans MS", cursive'; g.fillText('(this means u possums)', w / 2, h / 2 + 46); });
  return cv;
}

// ---------- lights ----------
// static lights [x, y, z, radius, r, g, b, flicker]; dynamic ones are appended per frame
const LIGHTS = [
  [-3.2, 5.6, 29.0, 15, 4.2, 2.3, 0.8, 0],     // street lamp (sodium)
  [5.4, 3.0, 19.2, 7.5, 3.0, 2.0, 1.1, 0],     // pizza back door
  [-5.4, 3.0, 12.2, 7.0, 1.7, 2.0, 2.4, 0],    // laundromat door (cool)
  [5.4, 3.0, -6.4, 7.0, 3.0, 1.9, 0.9, 1],     // noodle door (flickers)
  [-5.4, 3.0, -14.4, 6.5, 1.4, 2.3, 1.3, 0],   // greenish fluorescent
  [5.75, 3.8, 22.2, 5.5, 3.0, 0.6, 1.7, 0],    // neon PIZZA
  [-5.75, 4.2, 23.4, 6.5, 0.7, 1.7, 3.2, 0],   // neon LAUNDROMAT
  [5.75, 3.9, -2.0, 5.0, 2.8, 1.8, 0.5, 0],    // neon NOODLES
  [-4.2, 0.55, 1.2, 3.2, 2.6, 1.5, 0.5, 2],    // candle jar at the den
  [0.0, 6.0, -33.0, 14, 1.6, 1.9, 2.4, 0],     // lot light beyond the fence
  [5.3, 6.2, 10.5, 5.5, 2.4, 1.7, 1.0, 0],     // lit window spill
];

// ---------- static world mesh ----------
function buildWorld() {
  buildStatics();
  const b = new MB();
  const ATLAS_ON = (uv, flipU) => flipU ? [uv[2], uv[1], uv[0], uv[3]] : uv;
  // ground: alley asphalt (procedural wet, par.x = wetness), sidewalk + road at the street end, dirt lot past the fence
  b.col(0x8a8a8a).par(0.5, 0, -2);
  const T = 2;
  for (let z = AZ0 - 8; z < CURB_Z; z += T) for (let x = -AX; x < AX; x += T) b.face([x, 0, z + T], [x + T, 0, z + T], [x + T, 0, z], [x, 0, z]);
  b.col(0x8c8a84).par(0.85, 0, -4); b.face([-14, 0.15, 30.4], [14, 0.15, 30.4], [14, 0.15, CURB_Z], [-14, 0.15, CURB_Z]);  // sidewalk
  b.face([-14, 0.15, CURB_Z], [-AX, 0.15, CURB_Z], [-AX, 0.0, CURB_Z], [-14, 0.0, CURB_Z]);
  b.col(0x707070).par(0.8, 0, -3); b.face([-14, 0.0, 30.4], [14, 0.0, 30.4], [14, 0.15, 30.4], [-14, 0.15, 30.4]); // curb face
  b.col(0x6a6a6a).par(0.5, 0, -2); b.face([-30, 0, 38], [30, 0, 38], [30, 0, 30.4], [-30, 0, 30.4]);              // road
  b.col(0xd8c040).par(0.6); for (let x = -28; x < 28; x += 4) b.push().tr(x + 1, 0.005, 34.2).box(2, 0.01, 0.15).pop();
  b.col(0x8c8a84).par(0.85, 0, -4); b.face([-30, 0.15, 41], [30, 0.15, 41], [30, 0.15, 38], [-30, 0.15, 38]);
  b.col(0x3a3328).par(0.95, 0, -3); b.face([-30, 0, AZ0 - 8], [30, 0, AZ0 - 8], [30, 0, -60], [-30, 0, -60]);      // lot beyond
  b.face([-30, 0, AZ0 - 0.0], [-AX, 0, AZ0], [-AX, 0, AZ0 - 8], [-30, 0, AZ0 - 8]); b.face([AX, 0, AZ0], [30, 0, AZ0], [30, 0, AZ0 - 8], [AX, 0, AZ0 - 8]);
  // manhole rim (the hole itself is drawn dark)
  b.col(0x3a3a3c).par(0.4, 0.8); b.push().tr(MANHOLE.x, 0, MANHOLE.z).cyl(MANHOLE.r + 0.12, MANHOLE.r + 0.12, 0.02, 20, false).pop();
  b.col(0x020202).par(1); b.push().tr(MANHOLE.x, 0.005, MANHOLE.z).cyl(MANHOLE.r, MANHOLE.r, 0.012, 20, true).pop();
  b.col(0x2f3134).par(0.45, 0.9); b.push().tr(MANHOLE.x + 0.85, 0.012, MANHOLE.z + 0.35).ry(0.4).cyl(MANHOLE.r + 0.08, MANHOLE.r + 0.08, 0.04, 20, true).pop(); // cover slid aside
  // ---- the two buildings ----
  const wall = (side, z0, z1, h, brick) => {
    const x = side * AX; b.col(brick).par(0.9, 0, -1);
    if (side > 0) b.face([x, 0, z1], [x, 0, z0], [x, h, z0], [x, h, z1]); else b.face([x, 0, z0], [x, 0, z1], [x, h, z1], [x, h, z0]);
    b.col(0x3d3833).par(0.8); b.push().tr(x + side * 0.1, h + 0.1, (z0 + z1) / 2).box(0.5, 0.25, z1 - z0).pop(); // parapet
    b.col(brick).par(0.9, 0, -1); b.push().tr(x + side * 4, h / 2, (z0 + z1) / 2).box(7.8, h, z1 - z0).pop();   // building mass
  };
  wall(1, 12, 30.4, 10.5, 0x7a3a2a); wall(1, -8, 12, 12.5, 0x6b4a3a); wall(1, AZ0 - 0.2, -8, 9.5, 0x804434);
  wall(-1, 14, 30.4, 11.5, 0x5f4b3d); wall(-1, -6, 14, 9.0, 0x8a4a35); wall(-1, AZ0 - 0.2, -6, 13.5, 0x6e3e30);
  // windows: dark glass, some lit (emissive), sills
  const win = (side, z, y, lit, w = 1.0, h = 1.3) => {
    const x = side * (AX - 0.04);
    b.col(0x2a2622).par(0.8); b.push().tr(x - side * 0.02, y - h / 2 - 0.06, z).box(0.16, 0.08, w + 0.2).pop();
    if (lit) { b.col(lit).par(0.6, 0, 1.6); } else b.col(0x0b0e14).par(0.05, 0.7);
    b.push().tr(x, y, z).box(0.05, h, w).pop();
    b.col(0x1d1b19).par(0.8); b.push().tr(x - side * 0.01, y, z).box(0.07, h, 0.05).pop(); b.push().tr(x - side * 0.01, y, z).box(0.07, 0.05, w).pop();
  };
  const warm = 0xffc27a, cool = 0x9ad0ff, tv = 0x7fa8ff;
  for (const side of [-1, 1]) for (let fl = 0; fl < 3; fl++) for (let z = -22; z <= 26; z += 4.1) {
    const y = 4.4 + fl * 2.8; if (y > (side > 0 ? 9.6 : 8.5)) continue;
    const hsh = hash2(side * 31 + fl * 7, Math.round(z * 3));
    win(side, z + (side > 0 ? 0.7 : -0.5), y, hsh > 0.72 ? (hsh > 0.93 ? tv : hsh > 0.85 ? cool : warm) : 0);
  }
  // back doors (metal) with lamps and steps
  const door = (side, z, col) => {
    const x = side * (AX - 0.05);
    b.col(0x2a2622).par(0.8); b.push().tr(x, 1.15, z).box(0.12, 2.4, 1.25).pop();
    b.col(col).par(0.45, 0.6, -5); b.push().tr(x - side * 0.02, 1.1, z).box(0.08, 2.2, 1.05).pop();
    b.col(0xb9bec4).par(0.3, 1); b.push().tr(x - side * 0.08, 1.0, z + 0.35).box(0.06, 0.06, 0.18).pop();
    b.col(0x222222).par(0.5, 0.5); b.push().tr(x - side * 0.18, 3.0, z).box(0.3, 0.1, 0.22).pop();
    b.col(0xfff0d0).par(0.3, 0, 5); b.push().tr(x - side * 0.2, 2.92, z).sph(0.09, 10, 6).pop();
  };
  door(1, 19.2, 0x6b2420); door(-1, 12.2, 0x23465e); door(1, -6.4, 0x3c5a2a); door(-1, -14.4, 0x4a4a4a);
  b.col(0x6f6b64).par(0.85, 0, -3); b.push().tr(5.5, 0, 21.2).boxB(1.0, 0.3, 1.5).pop(); b.push().tr(-5.5, 0, -2.8).boxB(1.0, 0.3, 1.4).pop();
  // neon signs (atlas text on emissive backing)
  const neon = (key, side, z, y, w, h) => {
    const x = side * (AX - 0.3);
    b.col(0x111111).par(0.6, 0.5); b.push().tr(x + side * 0.12, y, z).box(0.08, h + 0.1, w + 0.1).pop();
    b.col(0x0a0a0a).par(0.5, 0, 2.2);
    const uv0 = UV[key], uv = [uv0[2], uv0[1], uv0[0], uv0[3]];
    if (side > 0) b.face([x, y - h / 2, z + w / 2], [x, y - h / 2, z - w / 2], [x, y + h / 2, z - w / 2], [x, y + h / 2, z + w / 2], uv);
    else b.face([x, y - h / 2, z - w / 2], [x, y - h / 2, z + w / 2], [x, y + h / 2, z + w / 2], [x, y + h / 2, z - w / 2], uv);
  };
  neon('pizza', 1, 22.2, 3.8, 2.4, 0.75); neon('laundro', -1, 23.4, 4.2, 3.6, 0.75); neon('noodle', 1, -2.0, 3.9, 2.4, 0.75);
  // painted signs and graffiti (lit by the scene)
  const decal = (key, side, z, y, w, h, emis = 0) => {
    const x = side * (AX - 0.02); b.col(0xffffff).par(0.85, 0, emis); const uv0 = UV[key], uv = [uv0[2], uv0[1], uv0[0], uv0[3]];
    if (side > 0) b.face([x, y - h / 2, z + w / 2], [x, y - h / 2, z - w / 2], [x, y + h / 2, z - w / 2], [x, y + h / 2, z + w / 2], uv);
    else b.face([x, y - h / 2, z - w / 2], [x, y - h / 2, z + w / 2], [x, y + h / 2, z + w / 2], [x, y + h / 2, z - w / 2], uv);
  };
  decal('crest', -1, -1.9, 2.1, 2.4, 2.4); decal('tag1', 1, 2.0, 1.2, 2.4, 1.2); decal('tag2', -1, 16.2, 1.4, 2.4, 1.2);
  decal('deliveries', 1, 16.1, 2.6, 1.6, 0.4); decal('noparking', -1, 6.0, 2.2, 0.6, 0.6); decal('stash', -1, 1.2, 1.25, 1.1, 0.34);
  // fire escapes
  const escape = (side, z, y0, floors) => {
    const x = side * (AX - 0.6);
    b.col(0x23262a).par(0.5, 0.7, -5);
    for (let f = 0; f < floors; f++) {
      const y = y0 + f * 2.8;
      b.push().tr(x, y, z).box(1.1, 0.05, 3.0).pop();
      for (const zz of [-1.5, 1.5]) b.push().tr(x - side * 0.53, y + 0.5, z + zz).box(0.04, 1.0, 0.04).pop();
      b.push().tr(x - side * 0.53, y + 1.0, z).box(0.04, 0.04, 3.0).pop();
      for (let k = -6; k <= 6; k++) b.push().tr(x - side * 0.53, y + 0.5, z + k * 0.24).box(0.02, 1.0, 0.02).pop();
      if (f < floors - 1) { b.push().tr(x, y + 1.4, z + 0.4).rx(-0.78).box(0.5, 0.04, 3.6).pop(); }
    }
    b.push().tr(x - side * 0.3, y0 - 1.1, z - 1.1).box(0.45, 2.2, 0.05).pop(); // drop ladder (raised)
  };
  escape(1, 12.5, 3.4, 3); escape(-1, -9.0, 3.3, 3); escape(-1, 20.0, 3.5, 3);
  // pipes, AC units, cables
  b.col(0x4b4f55).par(0.4, 0.8);
  for (const [side, z] of [[1, 9.0], [-1, -4.0], [1, -15.0], [-1, 26.0]]) { b.push().tr(side * (AX - 0.15), 0, z).cyl(0.07, 0.07, 11, 8, false).pop(); b.push().tr(side * (AX - 0.25), 0.25, z).ry(side > 0 ? Math.PI / 2 : -Math.PI / 2).tube([0, 0, 0], [0, 0, 0.35], 0.08, 8).pop(); }
  const ac = (side, z, y) => { b.col(0xb8b4aa).par(0.6, 0.3, -5); b.push().tr(side * (AX - 0.42), y, z).box(0.8, 0.6, 0.9).pop(); b.col(0x222222).par(0.8); b.push().tr(side * (AX - 0.83), y, z).box(0.02, 0.45, 0.7).pop(); };
  ac(1, 4.2, 5.2); ac(-1, 3.0, 6.0); ac(1, -19.0, 4.5); ac(-1, -21.5, 7.3); ac(-1, 18.5, 0.42);
  b.col(0x141414).par(0.8);
  const sag = (a, c, s, n = 8) => { let prev = a; for (let k = 1; k <= n; k++) { const t = k / n; const p = [lerp(a[0], c[0], t), lerp(a[1], c[1], t) - Math.sin(t * Math.PI) * s, lerp(a[2], c[2], t)]; b.tube(prev, p, 0.012, 4); prev = p; } };
  sag([-AX, 8.0, 14], [AX, 8.4, 15.5], 0.8); sag([-AX, 7.4, -7], [AX, 7.0, -4], 0.6); sag([-AX, 9.0, 4], [AX, 9.2, 6], 0.9);
  // sneakers on the wire
  b.col(0xf2f2f2).par(0.6); b.push().tr(0.2, 7.55, 14.9).box(0.12, 0.1, 0.28).pop(); b.push().tr(0.4, 7.4, 14.95).box(0.12, 0.1, 0.28).pop();
  // laundry line
  sag([-AX, 6.5, -12], [AX, 6.6, -11.5], 0.5, 10);
  const cloth = [[-3.5, 0xd84a4a, 0.5, 0.7], [-1.8, 0xf0f0e8, 0.7, 0.45], [0.2, 0x4a7ad8, 0.55, 0.8], [2.6, 0xf2c94c, 0.45, 0.5]];
  for (const [x, col, w, h] of cloth) { const t = (x + AX) / (2 * AX); const y = lerp(6.5, 6.6, t) - Math.sin(t * Math.PI) * 0.5; b.col(col).par(0.95); b.push().tr(x, y - h / 2, lerp(-12, -11.5, t)).box(w, h, 0.02).pop(); }
  // chain-link fence across the -Z end, with a gap near the bottom for varmints
  b.col(0x8a9097).par(0.35, 0.9);
  for (let x = -AX; x <= AX + 0.01; x += 2.4) b.push().tr(x, 0, FENCE_Z).cyl(0.035, 0.035, 2.5, 8, true).pop();
  b.tube([-AX, 2.45, FENCE_Z], [AX, 2.45, FENCE_Z], 0.025, 6);
  for (let k = -60; k <= 60; k++) { const x0 = k * 0.13; const a = [clamp(x0, -AX, AX), 0.06, FENCE_Z], c = [clamp(x0 + 2.4, -AX, AX), 0.06 + (clamp(x0 + 2.4, -AX, AX) - clamp(x0, -AX, AX)), FENCE_Z];
    if (c[0] - a[0] > 0.05) b.tube(a, [c[0], Math.min(2.45, c[1]), FENCE_Z], 0.0045, 3);
    const d = [clamp(x0, -AX, AX), 0.06, FENCE_Z], e = [clamp(x0 - 2.4, -AX, AX), 0.06 + (clamp(x0, -AX, AX) - clamp(x0 - 2.4, -AX, AX)), FENCE_Z];
    if (d[0] - e[0] > 0.05) b.tube(d, [e[0], Math.min(2.45, e[1]), FENCE_Z], 0.0045, 3); }
  // the den couch (plaid, saggy), cushion, a candle jar, the stash pile under it
  b.push().tr(DEN.x, 0, DEN.z).ry(DEN.yaw);
  b.col(0x7a4b2a).par(0.9, 0, -7); b.push().tr(0, 0.2, 0).box(2.0, 0.3, 0.9).pop();
  b.push().tr(0, 0.55, -0.38).rx(-0.2).box(2.0, 0.65, 0.22).pop();
  for (const s of [-1, 1]) b.push().tr(s * 0.92, 0.45, 0).box(0.2, 0.5, 0.92).pop();
  b.col(0x8b5a32).par(0.95, 0, -7); b.push().tr(-0.45, 0.4, 0.06).rz(0.06).box(0.85, 0.14, 0.72).pop(); b.push().tr(0.48, 0.38, 0.08).rz(-0.1).box(0.82, 0.12, 0.7).pop();
  b.col(0x3a2414).par(0.9); for (const [x, z] of [[-0.9, 0.35], [0.9, 0.35], [-0.9, -0.35], [0.9, -0.35]]) b.push().tr(x, 0, z).cyl(0.04, 0.04, 0.06, 6, true).pop();
  b.pop();
  b.col(0xfff2c0).par(0.3, 0, 4); b.push().tr(-4.2, 0.0, 1.2 + 1.25).cyl(0.06, 0.06, 0.1, 10, true).pop();
  b.col(0xffcf70).par(0.2, 0, 8); b.push().tr(-4.2, 0.13, 1.2 + 1.25).sph(0.02, 6, 4).pop();
  // static trash: bags along the walls, boxes, cans
  const bagCols = [0x18191b, 0x232527, 0x2a3a2a, 0x1b2230];
  for (const [x, z, s] of [[5.55, 14.6, 1], [5.35, 15.4, 0.85], [-5.5, 6.4, 1.1], [-5.6, 7.2, 0.9], [5.55, -1.6, 1], [5.6, -8.9, 0.9], [-5.55, -12.0, 1.0], [-5.45, -19.6, 1.1], [5.5, -21.5, 1.05], [5.6, 24.5, 0.95], [-5.5, 21.6, 0.9]]) {
    const c = hexLin(bagCols[Math.floor(hash2(x * 10, z * 10) * 4)]);
    b.tint(false).col(c).par(0.25, 0); b.push().tr(x, 0, z).sc(s).push().tr(0, 0.22, 0).sc(1, 0.85, 0.9).sph(0.26, 12, 9).pop().push().tr(0, 0.45, 0).cyl(0.07, 0.03, 0.12, 8, true).pop().pop();
  }
  b.col(0xa57e4c).par(0.95); for (const [x, z, r, s] of [[-5.3, -9.2, 0.3, 0.9], [-5.15, -9.7, -0.2, 0.8], [-5.25, -9.0, 0.1, 0.9]]) b.push().tr(x, 0, z).ry(r).boxB(0.85 * s, 0.85 * s, 0.85 * s).pop();
  b.col(0x8a6738).par(0.95); b.push().tr(-5.25, 0.85 * 0.9, -9.3).ry(0.5).boxB(0.6, 0.5, 0.6).pop();
  // pallets
  b.col(0x9c7a4c).par(0.85, 0, -6); b.push().tr(5.25, 0, 7.2).ry(0.15);
  for (let k = 0; k < 4; k++) { b.push().tr(0, k * 0.15, 0); for (const z of [-0.5, 0, 0.5]) b.push().tr(0, 0.04, z).box(1.2, 0.08, 0.12).pop(); for (let x = -0.55; x <= 0.56; x += 0.18) b.push().tr(x, 0.11, 0).box(0.1, 0.03, 1.1).pop(); b.pop(); }
  b.pop();
  // recycling bins (blue) and the AC unit on the ground
  b.col(0x1f4f9a).par(0.5); for (const [x, z] of [[5.4, -12.8], [5.35, -13.6]]) { b.push().tr(x, 0, z).cyl(0.3, 0.33, 0.9, 14, true).pop(); b.push().tr(x, 0.9, z).cyl(0.34, 0.34, 0.06, 14, true).pop(); }
  // street-end props: lamp post, hydrant, buildings across the street with lit windows
  b.col(0x222428).par(0.5, 0.6); b.push().tr(-3.2, 0.15, 29.4).cyl(0.08, 0.06, 5.6, 10, true).pop(); b.tube([-3.2, 5.6, 29.4], [-3.2, 5.8, 29.0], 0.05, 6);
  b.col(0xffd28a).par(0.3, 0, 6); b.push().tr(-3.2, 5.55, 29.0).sc(1, 0.4, 1).sph(0.22, 10, 6).pop();
  b.col(0xb8231e).par(0.4, 0.2); b.push().tr(2.4, 0.15, 29.6).cyl(0.13, 0.12, 0.55, 12, true).pop(); b.push().tr(2.4, 0.7, 29.6).sph(0.14, 10, 6).pop();
  for (let x = -26; x < 26; x += 6.5) {
    const h = 8 + hash2(x, 3) * 9; b.col(hash2(x, 9) > 0.5 ? 0x4a3a30 : 0x3a3a42).par(0.9, 0, -1); b.push().tr(x + 3.2, h / 2, 46).box(6.3, h, 10).pop();
    for (let fy = 1.5; fy < h - 1; fy += 2.6) for (let fx = -2.2; fx <= 2.2; fx += 1.5) { const hs = hash2(x * 3 + fx * 7, fy * 5); if (hs > 0.55) continue; b.col(hs < 0.22 ? warm : 0x0b0e14).par(0.5, 0, hs < 0.22 ? 1.4 : 0); b.push().tr(x + 3.2 + fx, fy, 40.97).box(0.9, 1.2, 0.05).pop(); }
  }
  // skyline beyond the lot
  for (let x = -60; x < 60; x += 7) { const h = 14 + hash2(x, 1) * 24; b.col(0x1a1c24).par(0.95); b.push().tr(x, h / 2, -78 - hash2(x, 4) * 20).box(6.5, h, 6).pop();
    for (let fy = 2; fy < h; fy += 3) for (let fx = -2; fx <= 2; fx += 2) { const hs = hash2(x * 5 + fx, fy * 3); if (hs < 0.18) { b.col(warm).par(0.5, 0, 1.2); b.push().tr(x + fx, fy, -74.9 - hash2(x, 4) * 20).box(0.8, 1.0, 0.05).pop(); } } }
  const mesh = b.build({ name: 'world', isStatic: true });
  glPush(mesh, m4());
  return { mesh };
}
