// ---------- arena: Clifftop Foods parking lot ----------
const CLIFF_X = 38, CURB_Z = 28, STORE_Z = 31, SOUTH_Z = -31, WEST_X = -38;
const POND = { x: -12, z: -10, r: 8 };
const WATER_Y = -0.35, LAKE_Y = -30;
const DOORS = [-20, 0, 20];
const RAMPS = [
  { x: -12, z: 6.0, ang: Math.PI, L: 3.2, W: 3.2, H: 1.15, name: 'pond' },
  { x: 28.5, z: -3, ang: -Math.PI / 2, L: 3.0, W: 3.0, H: 0.95, name: 'east' },
  { x: -30, z: -1, ang: 0, L: 3.0, W: 3.0, H: 0.95, name: 'west' }
];
for (const r of RAMPS) { r.fx = Math.sin(r.ang); r.fz = Math.cos(r.ang); r.rx = Math.cos(r.ang); r.rz = -Math.sin(r.ang); }

const KINDS = {
  store: { ko: 'STORE CLOSED!', hazard: true }, wall: { ko: 'WALLED!', hazard: true }, dock: { ko: 'DOCKED!', hazard: true },
  car: { ko: 'PARKED!', hazard: true }, pole: { ko: 'LAMPPOSTED!', hazard: true }, corral: { ko: 'RETURNED!', hazard: true },
  dumpster: { ko: 'TRASHED!', hazard: true }, bollard: { ko: 'BOLLARDED!', hazard: true }, rail: { ko: 'OVER THE RAIL!', hazard: false },
  fountain: { ko: 'SPLASHDOWN!', hazard: false }, fence: { ko: 'FENCED!', hazard: true }
};
const STATICS = [];
function addBox(kind, cx, cz, hx, hz, ang = 0, y0 = 0, y1 = 3, extra) {
  const s = { kind, shape: 'box', x: cx, z: cz, hx, hz, ang, c: Math.cos(ang), s: Math.sin(ang), y0, y1, ...(extra || {}) };
  STATICS.push(s); return s;
}
function addCirc(kind, cx, cz, r, y0 = 0, y1 = 3, extra) { const s = { kind, shape: 'circ', x: cx, z: cz, r, y0, y1, ...(extra || {}) }; STATICS.push(s); return s; }

const PARKED = [];   // {x,z,yaw,type,color, coll}
const POLES = [[4.0, 14.5], [32.4, 14.5], [6.0, -19.5], [32.4, -19.5], [-26, 21], [-31, -12], [18, 0.5]];
const CORRALS = [{ x: 12, z: 24.2, along: 'x', len: 6.0 }, { x: -24, z: 7, along: 'z', len: 6.0 }];
const DUMPSTERS = [[-8.2, -29.2], [-4.9, -29.2], [24, -29.2]];
const RAILS = [[-29.5, -17], [-9, 3], [11, 22]];  // guardrail z ranges along the cliff
const PICKUP_SPOTS = [[2, 8], [16, -11], [-25.5, -5], [-3, -24.5], [26, 23.5], [-18, 22], [30, 6.5], [-6, 13]];
const START_SPOTS = [[0, 21, Math.PI], [25, 3, -Math.PI / 2], [-22, 15, 2.4], [13, -9, -0.6], [-27, -23, 0.8], [27, 22, -2.3]];
const CONE_SPOTS = [[-14.3, 6.6], [-9.7, 6.6], [-14.3, 2.8], [-9.7, 2.8], [35.6, 7], [35.6, -13], [35.6, 25.5], [27, -1.2], [27, -4.8], [-28.2, 3.4], [-31.8, 3.4]];

function pondR(th) { return POND.r * (1 + 0.12 * Math.sin(3 * th + 1) + 0.07 * Math.sin(5 * th + 2)); }
function pondSD(x, z) { const dx = x - POND.x, dz = z - POND.z; return Math.hypot(dx, dz) - pondR(Math.atan2(dz, dx)); }
function rampAt(x, z) {
  let h = 0, which = null;
  for (const r of RAMPS) {
    const dx = x - r.x, dz = z - r.z; const u = dx * r.fx + dz * r.fz, w = dx * r.rx + dz * r.rz;
    if (u >= 0 && u <= r.L && Math.abs(w) <= r.W / 2) { const hh = r.H * u / r.L; if (hh > h) { h = hh; which = r; } }
  }
  return [h, which];
}
// ground height (physics + mesh)
function groundH(x, z) {
  if (x > CLIFF_X) return -34;
  if (z >= CURB_Z && z <= STORE_Z + 0.5 && x < 34) return 0.15;
  if (x < WEST_X && z > -14 && z < 14) return 1.3;
  let h = 0;
  const sd = pondSD(x, z);
  if (sd < 3) {
    if (sd > 0) h = WATER_Y * (1 - smoothstep(0, 3, sd));
    else h = WATER_Y - Math.min(1.45, -sd * 0.38);
  }
  const [rh] = rampAt(x, z);
  return rh > 0 ? Math.max(h, rh) : h;
}
// surface: 0 asphalt, 1 grass, 2 water, 3 sidewalk, 4 ramp, 5 void
function surfaceAt(x, z) {
  if (x > CLIFF_X) return 5;
  const sd = pondSD(x, z);
  if (sd < 0) return 2;
  const [rh] = rampAt(x, z); if (rh > 0.01) return 4;
  if (sd < 3.4) return 1;
  if (z >= CURB_Z) return 3;
  return 0;
}
function isLethal(x, z) { return x > CLIFF_X - 0.3 || pondSD(x, z) < -0.4; }

function buildStatics() {
  STATICS.length = 0; PARKED.length = 0;
  // store front wall & ends
  addBox('store', -4, STORE_Z + 2, 38, 2, 0, 0, 8);
  addBox('fence', 36, 30, 2.0, 0.15, 0, 0, 1.2);
  // south sound wall
  addBox('wall', 0, SOUTH_Z - 0.6, 46, 0.6, 0, 0, 3.6);
  // west: brick walls + loading dock face
  addBox('wall', WEST_X - 0.6, 22.5, 0.6, 9.5, 0, 0, 3.2);
  addBox('wall', WEST_X - 0.6, -22.5, 0.6, 9.5, 0, 0, 3.2);
  addBox('dock', WEST_X - 0.6, 0, 0.6, 14, 0, 0, 1.3);
  // bollards at the doors
  for (const d of DOORS) for (const o of [-2.1, 2.1]) addCirc('bollard', d + o, 28.45, 0.14, 0, 1.0);
  // light poles
  for (const [x, z] of POLES) addCirc('pole', x, z, 0.32, 0, 9);
  // corrals
  for (const c of CORRALS) c.coll = c.along === 'x' ? addBox('corral', c.x, c.z, c.len / 2, 0.75, 0, 0, 1.1) : addBox('corral', c.x, c.z, 0.75, c.len / 2, 0, 0, 1.1);
  // dumpsters
  for (const [x, z] of DUMPSTERS) addBox('dumpster', x, z, 1.05, 0.8, 0, 0, 1.5);
  // guard rails along the cliff
  for (const [z0, z1] of RAILS) addBox('rail', CLIFF_X - 0.55, (z0 + z1) / 2, 0.07, (z1 - z0) / 2, 0, 0, 0.78);
  // fountain (in the pond)
  addCirc('fountain', POND.x, POND.z, 0.9, -2, 0.7);
  // parked cars: row A (z 12..17) facing north, row B (z -22..-17) facing south
  const colors = [0xc0392b, 0x2e86de, 0xf1c40f, 0xecf0f1, 0x27ae60, 0x34495e, 0x8e44ad, 0xe67e22, 0x95a5a6];
  const types = ['sedan', 'hatch', 'pickup', 'van'];
  const rowA = [0, 2, 3, 6, 8], rowB = [1, 2, 5, 7];
  let ci = 0;
  for (const k of rowA) PARKED.push({ x: 7.35 + k * 2.7, z: 14.5, yaw: k % 3 === 1 ? Math.PI : 0, type: types[(k * 3 + 1) % 4], color: colors[ci++ % colors.length] });
  for (const k of rowB) PARKED.push({ x: 9.35 + k * 2.7, z: -19.5, yaw: k % 2 ? Math.PI : 0, type: types[(k * 5 + 2) % 4], color: colors[ci++ % colors.length] });
  for (const p of PARKED) {
    const dims = { sedan: [0.92, 2.3], hatch: [0.88, 2.0], pickup: [1.0, 2.55], van: [1.0, 2.45] }[p.type];
    p.coll = addBox('car', p.x, p.z, dims[0], dims[1], p.yaw, 0, 1.9, { car: p });
    p.alarm = 0;
  }
}

// closest point on a static (2D) - returns [px,pz,dist,nx,nz]
function staticClosest(s, x, z) {
  if (s.shape === 'circ') {
    const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz) || 1e-6;
    return [s.x + dx / d * s.r, s.z + dz / d * s.r, d - s.r, dx / d, dz / d];
  }
  const dx = x - s.x, dz = z - s.z;
  const lx = dx * s.c - dz * s.s, lz = dx * s.s + dz * s.c; // world->local (rotate by -ang)
  const cx = clamp(lx, -s.hx, s.hx), cz = clamp(lz, -s.hz, s.hz);
  let ox = lx - cx, oz = lz - cz; let d = Math.hypot(ox, oz);
  let nlx, nlz;
  if (d > 1e-6) { nlx = ox / d; nlz = oz / d; }
  else { // inside
    const px = s.hx - Math.abs(lx), pz = s.hz - Math.abs(lz);
    if (px < pz) { nlx = Math.sign(lx) || 1; nlz = 0; d = -px; } else { nlx = 0; nlz = Math.sign(lz) || 1; d = -pz; }
  }
  const wx = cx * s.c + cz * s.s, wz = -cx * s.s + cz * s.c;
  return [s.x + wx, s.z + wz, d, nlx * s.c + nlz * s.s, -nlx * s.s + nlz * s.c];
}

// best hazard to shove a target into (used by AI)
function hazardsNear(x, z) {
  const out = [];
  for (const s of STATICS) {
    if (!KINDS[s.kind].hazard && s.kind !== 'rail') continue;
    const [px, pz, d] = staticClosest(s, x, z);
    if (d > 26) continue;
    let w = d;
    if (s.kind === 'pole' || s.kind === 'bollard') w += 3.5; // small targets, easy to miss
    if (s.kind === 'rail') w += 0.5;
    out.push({ px, pz, d, w, kind: s.kind, lethal: s.kind === 'rail' });
  }
  // the pond
  const dx = x - POND.x, dz = z - POND.z, dd = Math.hypot(dx, dz) || 1; const th = Math.atan2(dz, dx); const pr = pondR(th);
  const sdp = dd - pr; out.push({ px: POND.x + dx / dd * (pr - 1.5), pz: POND.z + dz / dd * (pr - 1.5), d: sdp, w: sdp - 4, kind: 'pond', lethal: true });
  // the cliff edge (gaps preferred)
  let cz = z; let inGap = true;
  for (const [z0, z1] of RAILS) if (z > z0 && z < z1) inGap = false;
  const cd = CLIFF_X - x; out.push({ px: CLIFF_X + 1.5, pz: cz, d: cd, w: cd - (inGap ? 5 : 1.5), kind: 'cliff', lethal: true });
  out.sort((a, b) => a.w - b.w);
  return out;
}

// ---------- sign atlas ----------
const ATL = { W: 2048, H: 1024 };
const atlasUV = (x, y, w, h) => [x / ATL.W, y / ATL.H, (x + w) / ATL.W, (y + h) / ATL.H];
const flipU = u => [u[2], u[1], u[0], u[3]];
const UV = {
  sign: atlasUV(0, 0, 1536, 256), rockets: atlasUV(1536, 0, 512, 256), sale: atlasUV(0, 256, 512, 256), roof: atlasUV(512, 256, 512, 256),
  cartret: atlasUV(1024, 256, 512, 256), danger: atlasUV(1536, 256, 512, 256), graffiti: atlasUV(0, 512, 1024, 256), fresh: atlasUV(1024, 512, 1024, 256),
  jump: atlasUV(0, 768, 512, 256), firelane: atlasUV(512, 768, 512, 128), hours: atlasUV(1024, 768, 512, 256), lake: atlasUV(1536, 768, 512, 256)
};
function makeAtlas() {
  const cv = document.createElement('canvas'); cv.width = ATL.W; cv.height = ATL.H;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, ATL.W, ATL.H);
  const big = (txt, x, y, w, h, fill, stroke, font, sw) => {
    g.save(); g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    const m = g.measureText(txt).width; const s = Math.min(1, (w * 0.92) / m);
    g.translate(x + w / 2, y + h / 2); g.scale(s, 1);
    if (stroke) { g.lineJoin = 'round'; g.lineWidth = sw; g.strokeStyle = stroke; g.strokeText(txt, 0, 0); }
    g.fillStyle = fill; g.fillText(txt, 0, 0); g.restore();
  };
  // store sign letters
  big('CLIFFTOP FOODS', 0, 0, 1536, 256, '#e8392a', '#ffffff', '900 190px Impact, "Arial Black", sans-serif', 18);
  // posters
  const poster = (r, bg, lines) => {
    const [x, y, w, h] = r; g.fillStyle = bg; g.fillRect(x + 8, y + 8, w - 16, h - 16);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 6; g.strokeRect(x + 14, y + 14, w - 28, h - 28);
    const lh = (h - 40) / lines.length;
    lines.forEach((l, i) => big(l[0], x + 20, y + 20 + i * lh, w - 40, lh, l[1], l[2], l[3], 10));
  };
  poster([1536, 0, 512, 256], '#ffd23f', [['ROCKETS', '#c0392b', null, '900 96px Impact,sans-serif'], ['2 FOR $5', '#1b1b1b', null, '900 80px Impact,sans-serif']]);
  poster([0, 256, 512, 256], '#e8392a', [['SALE!', '#ffffff', '#7b1d12', '900 170px Impact,sans-serif']]);
  poster([512, 256, 512, 256], '#ffffff', [['NO CARTS', '#c0392b', null, '900 86px Impact,sans-serif'], ['ON THE ROOF', '#1b1b1b', null, '900 66px Impact,sans-serif'], ['(AGAIN)', '#555', null, 'italic 700 44px Georgia,serif']]);
  poster([1024, 256, 512, 256], '#1f5fa8', [['CART', '#ffffff', null, '900 104px Impact,sans-serif'], ['RETURN', '#ffffff', null, '900 104px Impact,sans-serif']]);
  poster([1536, 256, 512, 256], '#ffd23f', [['DANGER', '#111', null, '900 100px Impact,sans-serif'], ['CLIFF', '#c0392b', null, '900 100px Impact,sans-serif']]);
  // graffiti
  g.save(); g.translate(512, 640); g.rotate(-0.06);
  big('CART LIFE', -480, -110, 960, 220, '#ff4fa3', '#1b1b1b', 'italic 900 190px "Comic Sans MS","Segoe Print",Impact,sans-serif', 16);
  g.restore();
  g.fillStyle = '#4fd6ff'; g.beginPath(); g.arc(120, 700, 40, 0, TAU); g.fill();
  // trailer
  big('FRESH!', 1024, 512, 1024, 256, '#e8392a', '#ffffff', 'italic 900 200px Impact,sans-serif', 16);
  // ramp
  big('JUMP!', 0, 768, 512, 256, '#ffffff', '#222222', '900 170px Impact,sans-serif', 10);
  // fire lane
  big('FIRE LANE', 512, 768, 512, 128, '#ffffff', null, '900 96px Impact,sans-serif', 0);
  // hours
  poster([1024, 768, 512, 256], '#f4f1e8', [['OPEN', '#2e8b3a', null, '900 90px Impact,sans-serif'], ['7AM - 11PM', '#222', null, '700 60px Arial,sans-serif'], ['NO ROCKETS INSIDE', '#c0392b', null, '900 40px Impact,sans-serif']]);
  poster([1536, 768, 512, 256], '#2b6b3a', [['SCENIC', '#ffffff', null, '900 84px Impact,sans-serif'], ['LAKE VIEW', '#ffffff', null, '900 84px Impact,sans-serif']]);
  return cv;
}

// ---------- static world mesh ----------
function buildWorld() {
  buildStatics();
  const b = new MB();
  const asph = () => b.col(0x46484c).par(0, 0, -2);
  // ground grid with grass/mud weights (par.x = grass, par.y = mud)
  {
    const x0 = -38, x1 = 38, z0 = -31, z1 = 28, st = 0.5; const nx = Math.round((x1 - x0) / st), nz = Math.round((z1 - z0) / st);
    const base = b.n; const H = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = x0 + i * st, z = z0 + j * st; H.push(groundH(x, z)); }
    const hAt = (i, j) => H[clamp(j, 0, nz) * (nx + 1) + clamp(i, 0, nx)];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
      const x = x0 + i * st, z = z0 + j * st, y = hAt(i, j);
      const gx = (hAt(i + 1, j) - hAt(i - 1, j)) / (2 * st), gz = (hAt(i, j + 1) - hAt(i, j - 1)) / (2 * st);
      const [rh] = rampAt(x, z); const yy = rh > 0.001 ? Math.max(0, y - rh) : y; // ramps are separate meshes
      const sd = pondSD(x, z);
      const grass = 1 - smoothstep(2.9, 3.6, sd), mud = 1 - smoothstep(-0.1, 0.35, sd);
      const n = Math.hypot(gx, 1, gz);
      b.c = [1, 1, 1]; b.p = [grass, mud, -2];
      b.vert(x, rh > 0.001 ? (sd < 3 ? yy : 0) : y, z, -gx / n, 1 / n, -gz / n);
    }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = base + j * (nx + 1) + i; b.quad(a, a + nx + 1, a + nx + 2, a + 1); }
  }
  // grass outside the lot (south strip behind wall, beyond the cliff top north/south)
  b.col(0x4f7a33).par(1, 0, -2);
  b.p = [1, 0, -2];
  b.face([-120, 0, -32.2], [CLIFF_X, 0, -32.2], [CLIFF_X, 0, -120], [-120, 0, -120]);
  b.face([-120, 0, 120], [CLIFF_X, 0, 120], [CLIFF_X, 0, 52], [-120, 0, 52]);
  b.face([-120, 0, 52], [-46, 0, 52], [-46, 0, -32.2], [-120, 0, -32.2]);
  b.face([CLIFF_X, 0, -32.2], [CLIFF_X, 0, -31], [34, 0, -31], [34, 0, -32.2]);
  // north-east corner between the store's east wall (x 34) and the cliff edge: grass side yard behind the fence...
  b.face([34, 0, 52], [CLIFF_X, 0, 52], [CLIFF_X, 0, 30], [34, 0, 30]);
  // ...and asphalt from the end of the lot up to the fence (physics height 0 here, the lot grid stops at z 28)
  b.c = [1, 1, 1]; b.p = [0, 0, -2];
  b.face([34, 0, 30], [CLIFF_X, 0, 30], [CLIFF_X, 0, 28], [34, 0, 28]);
  // sidewalk with curb (red fire lane stretches)
  b.col(0xb9b5ab).par(0.85, 0, -4);
  b.push().tr(-2, 0, 29.5).boxB(72, 0.15, 3.0).pop();
  b.col(0xc23a2b).par(0.6, 0, 0);
  for (const [xa, xb] of [[-36, -24], [24, 33]]) b.face([xa, 0.003, 27.995], [xb, 0.003, 27.995], [xb, 0.152, 27.995], [xa, 0.152, 27.995]);
  b.col(0xffffff);
  b.face([-34, 0.012, 26.9], [-28, 0.012, 26.9], [-28, 0.012, 27.7], [-34, 0.012, 27.7], flipU(UV.firelane));
  b.face([26, 0.012, 26.9], [32, 0.012, 26.9], [32, 0.012, 27.7], [26, 0.012, 27.7], flipU(UV.firelane));
  // ---- store building ----
  const SX0 = -42, SX1 = 34, SZ0 = STORE_Z, SZ1 = 52, SH = 7.5;
  b.col(0xd8c9a8).par(0.9, 0, 0); // stucco
  b.face([SX1, 0, SZ0], [SX1, 0, SZ1], [SX1, SH, SZ1], [SX1, SH, SZ0]);
  b.face([SX0, 0, SZ1], [SX0, 0, SZ0], [SX0, SH, SZ0], [SX0, SH, SZ1]);
  b.col(0x8a8a8a).par(0.9); b.face([SX0, SH, SZ0], [SX1, SH, SZ0], [SX1, SH, SZ1], [SX0, SH, SZ1]);
  // front facade: brick lower band, windows, stucco upper, red stripe, parapet
  const FZ = SZ0;
  b.col(0x9c4a33).par(0.9, 0, -1);
  b.face([SX0, 0, FZ], [SX1, 0, FZ], [SX1, 0.9, FZ], [SX0, 0.9, FZ]);
  b.col(0xd8c9a8).par(0.9, 0, 0);
  b.face([SX0, 3.4, FZ], [SX1, 3.4, FZ], [SX1, SH, FZ], [SX0, SH, FZ]);
  b.col(0xc23a2b).par(0.6); b.push().tr((SX0 + SX1) / 2, 6.9, FZ - 0.06).box(SX1 - SX0, 0.35, 0.12).pop();
  b.col(0xbab0a0).par(0.9); b.push().tr((SX0 + SX1) / 2, SH + 0.3, FZ + 0.15).box(SX1 - SX0 + 0.3, 0.6, 0.4).pop();
  // windows & pillars between 0.9 and 3.4
  const glass = () => b.col(0x1c2a33).par(0.06, 0.85, 0);
  let x = SX0;
  const segs = [];
  for (const d of DOORS) segs.push([d - 1.7, d + 1.7]);
  const pillarsX = [];
  for (let px = SX0; px <= SX1; px += 4.25) pillarsX.push(px);
  // window band
  glass(); b.face([SX0, 0.9, FZ - 0.01], [SX1, 0.9, FZ - 0.01], [SX1, 3.4, FZ - 0.01], [SX0, 3.4, FZ - 0.01]);
  b.col(0x9c4a33).par(0.9, 0, -1);
  for (const px of pillarsX) { if (segs.some(([a, c]) => px > a - 0.5 && px < c + 0.5)) continue; b.push().tr(px, 1.7, FZ - 0.2).box(0.55, 3.4, 0.4).pop(); }
  b.col(0x55595e).par(0.4, 0.8); b.push().tr((SX0 + SX1) / 2, 0.93, FZ - 0.05).box(SX1 - SX0, 0.06, 0.12).pop();
  b.push().tr((SX0 + SX1) / 2, 3.37, FZ - 0.05).box(SX1 - SX0, 0.06, 0.12).pop();
  // posters in windows
  const posters = [UV.rockets, UV.sale, UV.roof, UV.hours, UV.sale, UV.rockets];
  const pxs = [-33, -26, -11, 9, 14, 27];
  pxs.forEach((px, i) => { b.col(0xffffff).par(0.7); b.face([px - 1.3, 1.5, FZ - 0.03], [px + 1.3, 1.5, FZ - 0.03], [px + 1.3, 2.8, FZ - 0.03], [px - 1.3, 2.8, FZ - 0.03], flipU(posters[i])); });
  // doorways (dark interior behind sliding glass)
  for (const d of DOORS) {
    b.col(0x2a2622).par(0.9); b.face([d - 1.7, 0.15, FZ + 0.6], [d + 1.7, 0.15, FZ + 0.6], [d + 1.7, 2.9, FZ + 0.6], [d - 1.7, 2.9, FZ + 0.6]);
    b.col(0xf2efe6).par(0.5, 0, 1.2); b.face([d - 1.6, 2.6, FZ + 0.55], [d + 1.6, 2.6, FZ + 0.55], [d + 1.6, 2.85, FZ + 0.55], [d - 1.6, 2.85, FZ + 0.55]);
    b.col(0x5a5f66).par(0.35, 0.9);
    b.push().tr(d - 1.8, 1.55, FZ).box(0.2, 3.1, 0.25).pop(); b.push().tr(d + 1.8, 1.55, FZ).box(0.2, 3.1, 0.25).pop(); b.push().tr(d, 3.0, FZ).box(3.8, 0.25, 0.25).pop();
    // entrance canopy
    b.col(0xc23a2b).par(0.6); b.push().tr(d, 3.65, FZ - 1.2).box(5.2, 0.22, 2.6).pop();
    b.col(0xf2efe6).par(0.5, 0, 1.0); b.push().tr(d, 3.52, FZ - 1.2).box(4.6, 0.02, 2.0).pop();
    b.col(0x6a6e74).par(0.4, 0.8); b.push().tr(d - 2.4, 0, FZ - 2.3).cyl(0.08, 0.08, 3.6, 8).pop(); b.push().tr(d + 2.4, 0, FZ - 2.3).cyl(0.08, 0.08, 3.6, 8).pop();
  }
  // big sign above center entrance
  b.col(0xd8c9a8).par(0.9);
  b.face([-11, 4.1, FZ - 0.04], [11, 4.1, FZ - 0.04], [11, 6.6, FZ - 0.04], [-11, 6.6, FZ - 0.04], flipU(UV.sign));
  b.col(0xffffff).par(0.5, 0, 0.0);
  // roof HVAC units
  b.col(0xa9adb2).par(0.5, 0.6);
  for (const [hx, hz] of [[-25, 40], [-8, 44], [10, 39], [22, 46]]) { b.push().tr(hx, SH, hz).boxB(3, 1.4, 2.2).pop(); }
  // fence at the east end of the sidewalk
  b.col(0x6b4f33).par(0.9);
  for (let fx = 34.2; fx <= 38; fx += 0.6) b.push().tr(fx, 0, 30).boxB(0.08, 1.2, 0.08).pop();
  b.push().tr(36.1, 0.95, 30).box(3.9, 0.1, 0.05).pop(); b.push().tr(36.1, 0.45, 30).box(3.9, 0.1, 0.05).pop();
  // ---- south sound wall ----
  b.col(0xa8a49a).par(0.9, 0, -4);
  b.push().tr(0, 0, SOUTH_Z - 0.6).boxB(92, 3.6, 1.2).pop();
  b.col(0x8e8a82).par(0.9, 0, -4);
  for (let wx = -38; wx <= 38; wx += 4) b.push().tr(wx, 0, SOUTH_Z - 0.0).boxB(0.35, 3.75, 0.25).pop();
  b.col(0xa8a49a).par(0.9);
  b.face([-14, 0.6, SOUTH_Z + 0.002], [-3, 0.6, SOUTH_Z + 0.002], [-3, 3.3, SOUTH_Z + 0.002], [-14, 3.3, SOUTH_Z + 0.002], UV.graffiti);
  // ---- west walls + loading dock ----
  b.col(0x9c4a33).par(0.9, 0, -1);
  b.push().tr(WEST_X - 0.6, 0, 22.5).boxB(1.2, 3.2, 19).pop();
  b.push().tr(WEST_X - 0.6, 0, -22.5).boxB(1.2, 3.2, 19).pop();
  b.col(0xa8a49a).par(0.85, 0, -4);
  b.push().tr(-42, 0, 0).boxB(8, 1.3, 28).pop();
  b.col(0x1d1d1d).par(0.9);
  for (let dz = -12; dz <= 12; dz += 4) { b.push().tr(WEST_X - 0.02, 0.75, dz - 0.9).box(0.12, 0.45, 0.35).pop(); b.push().tr(WEST_X - 0.02, 0.75, dz + 0.9).box(0.12, 0.45, 0.35).pop(); }
  b.col(0xffd23f).par(0.6); b.push().tr(WEST_X + 0.01, 1.25, 0).box(0.04, 0.1, 28).pop();
  // trailer on the dock
  b.col(0xeeeeee).par(0.6, 0.1);
  b.push().tr(-42.2, 1.3, 0).boxB(2.6, 3.6, 13).pop();
  b.col(0xffffff).par(0.6);
  b.face([-40.89, 2.2, 6.2], [-40.89, 2.2, -6.2], [-40.89, 4.4, -6.2], [-40.89, 4.4, 6.2], UV.fresh);
  b.col(0xc23a2b).par(0.6); b.push().tr(-40.88, 1.95, 0).box(0.02, 0.25, 13).pop();
  // ---- guard rails + danger signs ----
  for (const [z0, z1] of RAILS) {
    b.col(0x6d5132).par(0.9);
    for (let rz = z0; rz <= z1 + 0.01; rz += 2) b.push().tr(CLIFF_X - 0.55, 0, rz).boxB(0.15, 0.8, 0.15).pop();
    b.col(0xb5bbc2).par(0.35, 0.9); b.push().tr(CLIFF_X - 0.68, 0.6, (z0 + z1) / 2).box(0.06, 0.32, z1 - z0).pop();
  }
  for (const z of [-13, 7, 25.5]) {
    b.col(0x777777).par(0.5, 0.7); b.push().tr(CLIFF_X - 1.2, 0, z).cyl(0.05, 0.05, 1.9, 6).pop();
    b.col(0xffffff).par(0.6);
    b.face([CLIFF_X - 1.25, 1.2, z - 0.75], [CLIFF_X - 1.25, 1.2, z + 0.75], [CLIFF_X - 1.25, 1.95, z + 0.75], [CLIFF_X - 1.25, 1.95, z - 0.75], UV.danger);
    b.face([CLIFF_X - 1.15, 1.2, z + 0.75], [CLIFF_X - 1.15, 1.2, z - 0.75], [CLIFF_X - 1.15, 1.95, z - 0.75], [CLIFF_X - 1.15, 1.95, z + 0.75], UV.lake);
  }
  // ---- cliff face down to the lake ----
  {
    const zs = 140, ys = 22, Z0 = -60, Z1 = 80, base = b.n;
    b.col(0x8a7a66).par(0.95, 0, -5);
    for (let j = 0; j <= ys; j++) for (let i = 0; i <= zs; i++) {
      const z = Z0 + (Z1 - Z0) * i / zs, t = j / ys, y = lerp(0, LAKE_Y - 3, t);
      const n = fbm(z * 0.12, y * 0.15) - 0.5;
      const x = CLIFF_X + (t * t) * 7 + n * 3.5 * smoothstep(0.0, 0.12, t) + (j === 0 ? 0 : 0.3);
      b.vert(x, y, z, 1, 0, 0);
    }
    // recompute normals per grid via neighbors
    const P = (i, j) => { const o = (base + j * (zs + 1) + i) * VSTRIDE; return [b.v[o], b.v[o + 1], b.v[o + 2]]; };
    for (let j = 0; j <= ys; j++) for (let i = 0; i <= zs; i++) {
      const a = P(Math.max(i - 1, 0), j), c = P(Math.min(i + 1, zs), j), d = P(i, Math.max(j - 1, 0)), e = P(i, Math.min(j + 1, ys));
      const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2], vx = e[0] - d[0], vy = e[1] - d[1], vz = e[2] - d[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
      if (nx < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const o = (base + j * (zs + 1) + i) * VSTRIDE; b.v[o + 3] = nx / l; b.v[o + 4] = ny / l; b.v[o + 5] = nz / l;
    }
    for (let j = 0; j < ys; j++) for (let i = 0; i < zs; i++) { const a = base + j * (zs + 1) + i; b.quad(a, a + 1, a + zs + 2, a + zs + 1); }
    // rocky beach strip at the bottom
    b.col(0x8c8170).par(0.95, 0, -5);
    b.face([CLIFF_X + 6, LAKE_Y - 0.6, Z1], [CLIFF_X + 6, LAKE_Y - 0.6, Z0], [CLIFF_X + 14, LAKE_Y - 1.4, Z0], [CLIFF_X + 14, LAKE_Y - 1.4, Z1]);
  }
  // far shore hills
  b.col(0x3f6b3a).par(1);
  for (let k = 0; k < 18; k++) {
    const z = -420 + k * 50 + Math.sin(k * 7.1) * 18, xh = 330 + Math.sin(k * 2.3) * 60, hh = 30 + 25 * Math.abs(Math.sin(k * 1.7)), r = 70 + 30 * Math.abs(Math.cos(k * 3.1));
    b.push().tr(xh, LAKE_Y - 2, z).sc(r, hh, r * 0.8).sph(1, 10, 6, 1, 0.5).pop();
  }
  b.col(0x7d8a95).par(1);
  for (let k = 0; k < 9; k++) { const z = -500 + k * 120, xh = 560 + Math.cos(k * 1.9) * 40; b.push().tr(xh, LAKE_Y - 2, z).sc(110, 70 + 40 * Math.abs(Math.sin(k)), 90).sph(1, 9, 6, 1, 0.5).pop(); }
  // lighthouse on a little island
  b.col(0x8c8170).par(0.95, 0, -5); b.push().tr(150, LAKE_Y - 1.5, -40).sc(14, 3.5, 11).sph(1, 10, 6, 1, 0.5).pop();
  b.col(0xf4f1e8).par(0.7); b.push().tr(150, LAKE_Y + 1.5, -40).cyl(1.6, 1.1, 11, 12).pop();
  b.col(0xc23a2b).par(0.6); for (const yy of [3.5, 7.5]) b.push().tr(150, LAKE_Y + 1.5 + yy, -40).cyl(1.6 - yy * 0.045, 1.55 - yy * 0.045, 1.2, 12, false).pop();
  b.col(0xfff2b0).par(0.5, 0, 2); b.push().tr(150, LAKE_Y + 12.6, -40).cyl(0.9, 0.9, 1.0, 10).pop();
  b.col(0x333333).par(0.5); b.push().tr(150, LAKE_Y + 13.6, -40).cyl(1.1, 0.1, 0.9, 10).pop();
  // ---- parking lines, crosswalks ----
  b.col(0xf2f0e6).par(0.7, 0, 0);
  const line = (xa, za, xb, zb, w = 0.12) => { const dx = xb - xa, dz = zb - za, l = Math.hypot(dx, dz), nx = -dz / l * w / 2, nz = dx / l * w / 2; b.face([xa - nx, 0.012, za - nz], [xb - nx, 0.012, zb - nz], [xb + nx, 0.012, zb + nz], [xa + nx, 0.012, za + nz]); };
  for (let k = 0; k <= 9; k++) line(6 + k * 2.7, 12, 6 + k * 2.7, 17);
  line(6, 12, 30.3, 12); line(6, 17, 30.3, 17);
  for (let k = 0; k <= 8; k++) line(8 + k * 2.7, -22, 8 + k * 2.7, -17);
  line(8, -22, 29.6, -22); line(8, -17, 29.6, -17);
  for (const d of DOORS) for (let k = 0; k < 6; k++) line(d - 1.5 + k * 0.6, 22.5, d - 1.5 + k * 0.6, 27.7, 0.35);
  b.col(0xf2c230).par(0.7);
  line(-36, 25.8, 33, 25.8, 0.1);
  // painted arrows
  const arrow = (ax, az, ang) => { b.push().tr(ax, 0, az).ry(ang); b.face([-0.2, 0.012, -1.4], [0.2, 0.012, -1.4], [0.2, 0.012, 0.3], [-0.2, 0.012, 0.3]); b.face([-0.6, 0.012, 0.3], [0.6, 0.012, 0.3], [0.0, 0.012, 1.2], [0.0, 0.012, 1.2]); b.pop(); };
  b.col(0xf2f0e6);
  arrow(0, 6, Math.PI / 2); arrow(18, -6, -Math.PI / 2); arrow(-26, -15, 0);
  // ---- ramps (plywood wedges on cinder blocks) ----
  for (const r of RAMPS) {
    b.push().tr(r.x, 0, r.z).ry(r.ang);
    const hw = r.W / 2;
    b.col(0xc8a26b).par(0.8, 0, -6);
    b.face([hw, 0.0, 0], [-hw, 0.0, 0], [-hw, r.H, r.L], [hw, r.H, r.L]);
    b.col(0xb08a55).par(0.85, 0, -6);
    b.face([-hw, 0, 0], [-hw, 0, r.L], [-hw, r.H, r.L], [-hw, 0, 0]);
    b.face([hw, 0, r.L], [hw, 0, 0], [hw, 0, 0], [hw, r.H, r.L]);
    b.col(0x8f8f8a).par(0.95, 0, -4);
    for (const s of [-1, 0, 1]) b.push().tr(s * (hw - 0.3), 0, r.L - 0.25).boxB(0.4, r.H - 0.02, 0.4).pop();
    b.face([-hw, 0, r.L], [hw, 0, r.L], [hw, r.H, r.L], [-hw, r.H, r.L]);
    b.col(0xffffff).par(0.8);
    const sl = Math.atan2(r.H, r.L);
    b.push().tr(0, r.H * 0.5 + 0.012, r.L * 0.5).rx(-sl);
    b.face([hw * 0.7, 0, -0.55], [-hw * 0.7, 0, -0.55], [-hw * 0.7, 0, 0.55], [hw * 0.7, 0, 0.55], UV.jump);
    b.pop();
    b.col(0xffd23f).par(0.6); b.push().tr(0, r.H + 0.012, r.L - 0.06).rx(-sl).box(r.W, 0.02, 0.12).pop();
    b.pop();
  }
  // ---- light poles ----
  for (const [px, pz] of POLES) {
    b.col(0xa8a49a).par(0.9, 0, -4); b.push().tr(px, 0, pz).cyl(0.32, 0.3, 0.6, 12).pop();
    b.col(0x5d636b).par(0.4, 0.8); b.push().tr(px, 0.6, pz).cyl(0.11, 0.08, 8.6, 10).pop();
    b.push().tr(px, 9.0, pz).box(0.25, 0.2, 2.4).pop();
    b.col(0xf8f3dc).par(0.4, 0, 0.8);
    for (const s of [-1, 1]) b.push().tr(px, 8.88, pz + s * 1.0).box(0.4, 0.06, 0.7).pop();
  }
  // ---- bollards ----
  for (const s of STATICS) if (s.kind === 'bollard') {
    b.col(0xffcc00).par(0.5); b.push().tr(s.x, 0.15, s.z).cyl(0.14, 0.14, 0.85, 12).pop(); b.push().tr(s.x, 1.0, s.z).sph(0.14, 12, 8, 1, 0.5).pop();
    b.col(0x222222); b.push().tr(s.x, 0.75, s.z).cyl(0.145, 0.145, 0.06, 12, false).pop();
  }
  // ---- corrals ----
  for (const c of CORRALS) {
    const ax = c.along === 'x';
    const L = c.len, Wd = 1.5;
    b.push().tr(c.x, 0, c.z); if (!ax) b.ry(Math.PI / 2);
    b.col(0xb9c0c8).par(0.3, 1);
    const rail = (pa, pb) => b.tube(pa, pb, 0.04, 8, true);
    for (const y of [0.55, 1.05]) { rail([-L / 2, y, -Wd / 2], [L / 2, y, -Wd / 2]); rail([-L / 2, y, Wd / 2], [L / 2, y, Wd / 2]); rail([L / 2, y, -Wd / 2], [L / 2, y, Wd / 2]); }
    for (const xx of [-L / 2, 0, L / 2]) for (const zz of [-Wd / 2, Wd / 2]) rail([xx, 0, zz], [xx, 1.05, zz]);
    b.col(0x777777).par(0.5, 0.7); b.push().tr(L / 2 + 0.3, 0, 0).cyl(0.05, 0.05, 2.4, 6).pop();
    b.col(0xffffff).par(0.6);
    b.face([L / 2 + 0.36, 1.6, 0.55], [L / 2 + 0.36, 1.6, -0.55], [L / 2 + 0.36, 2.35, -0.55], [L / 2 + 0.36, 2.35, 0.55], UV.cartret);
    b.face([L / 2 + 0.26, 1.6, -0.55], [L / 2 + 0.26, 1.6, 0.55], [L / 2 + 0.26, 2.35, 0.55], [L / 2 + 0.26, 2.35, -0.55], UV.cartret);
    b.pop();
  }
  // ---- dumpsters ----
  for (const [x, z] of DUMPSTERS) {
    b.col(0x1f6b45).par(0.55, 0.3); b.push().tr(x, 0.12, z).boxB(2.1, 1.3, 1.6).pop();
    b.col(0x1a5a3a).par(0.6, 0.3); b.push().tr(x, 1.45, z + 0.05).rx(0.12).box(2.15, 0.08, 1.65).pop();
    b.col(0x222222).par(0.7); for (const s of [-1, 1]) for (const t of [-1, 1]) b.push().tr(x + s * 0.85, 0.06, z + t * 0.6).sph(0.07, 6, 4).pop();
  }
  // ---- parked cars ----
  for (const p of PARKED) buildCar(b, p);
  // ---- pond fountain, reeds, lily pads ----
  b.col(0xa8a49a).par(0.85, 0, -4); b.push().tr(POND.x, -1.8, POND.z).cyl(0.95, 0.85, 2.3, 18).pop();
  b.push().tr(POND.x, 0.45, POND.z).cyl(0.32, 0.25, 0.5, 12).pop();
  b.col(0x3d6b2a).par(0.9);
  for (let k = 0; k < 60; k++) {
    const th = F1(0, TAU), rr = pondR(th) + F1(-0.3, 0.9); const rx = POND.x + Math.cos(th) * rr, rz = POND.z + Math.sin(th) * rr;
    if (Math.abs(rx + 12) < 2.5 && rz > -3) continue; // keep the ramp landing clear-ish
    const gy = groundH(rx, rz);
    for (let q = 0; q < 5; q++) b.push().tr(rx + F1(-0.25, 0.25), gy, rz + F1(-0.25, 0.25)).rz(F1(-0.2, 0.2)).rx(F1(-0.2, 0.2)).cyl(0.015, 0.005, F1(0.7, 1.4), 4, false).pop();
    if (k % 3 === 0) { b.col(0x6b4a2a); b.push().tr(rx, gy + 1.0, rz).cyl(0.025, 0.025, 0.16, 6).pop(); b.col(0x3d6b2a); }
  }
  b.col(0x3f8a3a).par(0.5);
  for (let k = 0; k < 14; k++) { const th = F1(0, TAU), rr = F1(2, pondR(th) - 1.2); b.push().tr(POND.x + Math.cos(th) * rr, WATER_Y + 0.01, POND.z + Math.sin(th) * rr).ry(F1(0, TAU)).cyl(F1(0.18, 0.35), F1(0.18, 0.35), 0.01, 10, true).pop(); }
  // ---- trees and bushes outside ----
  const tree = (tx, tz, s) => {
    b.col(0x5b4026).par(0.9); b.push().tr(tx, 0, tz).cyl(0.2 * s, 0.15 * s, 2.6 * s, 7).pop();
    b.col(0x2f6b2a).par(0.95); b.push().tr(tx, 3.4 * s, tz).sc(1.6 * s, 1.5 * s, 1.6 * s).sph(1, 9, 7).pop();
    b.col(0x3c7f30); b.push().tr(tx + 0.6 * s, 3.0 * s, tz + 0.3 * s).sc(1.1 * s).sph(1, 8, 6).pop();
  };
  for (let k = 0; k < 26; k++) tree(-44 + k * 3.3 + F1(-0.8, 0.8), -35 - F1(0, 6), F1(0.9, 1.4));
  for (let k = 0; k < 10; k++) tree(-52 - F1(0, 14), -30 + k * 7 + F1(-2, 2), F1(1, 1.5));
  b.col(0x356b2c).par(0.95);
  for (let k = 0; k < 18; k++) b.push().tr(-36 + k * 4 + F1(-1, 1), 0.15, 30.75).sc(0.9, 0.55, 0.45).sph(1, 8, 6).pop();
  const mesh = b.build({ name: 'world' });
  mesh.isStatic = true;
  glPush(mesh, m4());
  // ---- water meshes ----
  const waters = [];
  {
    const w = new MB(); const r = POND.r * 1.3; const st = 0.5; const nx = Math.ceil(2 * r / st);
    const idx = {};
    for (let j = 0; j <= nx; j++) for (let i = 0; i <= nx; i++) {
      const x = POND.x - r + i * st, z = POND.z - r + j * st;
      const depth = WATER_Y - groundH(x, z);
      w.c = [Math.max(depth, 0), 0, 0];
      idx[j * (nx + 1) + i] = w.vert(x, WATER_Y, z, 0, 1, 0);
    }
    for (let j = 0; j < nx; j++) for (let i = 0; i < nx; i++) {
      const x = POND.x - r + (i + 0.5) * st, z = POND.z - r + (j + 0.5) * st;
      if (pondSD(x, z) > 0.6) continue;
      const a = j * (nx + 1) + i; w.quad(idx[a], idx[a + nx + 1], idx[a + nx + 2], idx[a + 1]);
    }
    waters.push({ mesh: w.build({ name: 'pond', cast: false }), deep: hexLin(0x1f3a2e), shallow: hexLin(0x5a6b45), scale: 1.0 });
    RND.queue.delete(waters[0].mesh);
  }
  {
    const w = new MB(); w.c = [6, 0, 0];
    const a = w.vert(CLIFF_X + 3, LAKE_Y, -900, 0, 1, 0), c = w.vert(1200, LAKE_Y, -900, 0, 1, 0), d = w.vert(1200, LAKE_Y, 900, 0, 1, 0), e = w.vert(CLIFF_X + 3, LAKE_Y, 900, 0, 1, 0);
    w.quad(a, e, d, c);
    const lake = { mesh: w.build({ name: 'lake', cast: false }), deep: hexLin(0x123a5c), shallow: hexLin(0x2c6a7a), scale: 0.15 };
    RND.queue.delete(lake.mesh);
    waters.push(lake);
  }
  // water draws without instancing: turn off the per-instance attributes on its VAOs
  for (const wt of waters) { gl.bindVertexArray(wt.mesh.vao); for (let i = 5; i <= 9; i++) gl.disableVertexAttribArray(i); gl.vertexAttrib4f(9, 1, 1, 1, 1); }
  gl.bindVertexArray(null);
  return { mesh, waters };
}

function buildCar(b, p) {
  b.push().tr(p.x, 0, p.z).ry(p.yaw);
  const body = () => b.col(p.color).par(0.25, 0.45);
  const glassC = () => b.col(0x16212a).par(0.05, 0.8);
  const wheel = (wx, wz) => { b.push().tr(wx, 0.33, wz).rz(Math.PI / 2).tr(0, -0.12, 0).col(0x1a1a1a).par(0.8).cyl(0.33, 0.33, 0.24, 14, true).pop(); b.push().tr(wx * 1.02, 0.33, wz).rz(Math.PI / 2).tr(0, -0.125, 0).col(0xb0b5ba).par(0.3, 1).cyl(0.18, 0.18, 0.25, 10, true).pop(); };
  if (p.type === 'sedan' || p.type === 'hatch') {
    const L = p.type === 'sedan' ? 4.5 : 3.9, cab = p.type === 'sedan' ? 2.2 : 2.3, co = p.type === 'sedan' ? -0.1 : -0.35;
    body(); b.push().tr(0, 0.32, 0).boxB(1.78, 0.62, L).pop();
    b.push().tr(0, 0.94, co).boxB(1.6, 0.06, cab + 0.1).pop();
    glassC(); b.push().tr(0, 1.0, co).boxB(1.56, 0.45, cab).pop();
    body(); b.push().tr(0, 1.45, co).boxB(1.58, 0.07, cab - 0.3).pop();
    for (const s of [-1, 1]) for (const t of [-1, 1]) wheel(s * 0.8, t * (L / 2 - 0.75));
    b.col(0xfff6d8).par(0.2, 0, 0.3); for (const s of [-1, 1]) b.push().tr(s * 0.6, 0.72, L / 2 + 0.005).box(0.35, 0.14, 0.02).pop();
    b.col(0xc0201a).par(0.3, 0, 0.3); for (const s of [-1, 1]) b.push().tr(s * 0.65, 0.75, -L / 2 - 0.005).box(0.3, 0.14, 0.02).pop();
  } else if (p.type === 'pickup') {
    body(); b.push().tr(0, 0.42, 0).boxB(1.95, 0.7, 5.0).pop();
    b.push().tr(0, 1.12, 0.55).boxB(1.85, 0.08, 1.9).pop();
    glassC(); b.push().tr(0, 1.2, 0.55).boxB(1.8, 0.52, 1.75).pop();
    body(); b.push().tr(0, 1.72, 0.55).boxB(1.82, 0.08, 1.6).pop();
    b.col(0x222222).par(0.8); b.push().tr(0, 1.11, -1.5).boxB(1.7, 0.02, 1.9).pop();
    body(); for (const s of [-1, 1]) b.push().tr(s * 0.93, 1.1, -1.5).boxB(0.1, 0.25, 2.0).pop(); b.push().tr(0, 1.1, -2.47).boxB(1.95, 0.25, 0.08).pop();
    for (const s of [-1, 1]) for (const t of [-1, 1]) wheel(s * 0.88, t * 1.65);
    b.col(0xfff6d8).par(0.2, 0, 0.3); for (const s of [-1, 1]) b.push().tr(s * 0.65, 0.9, 2.505).box(0.35, 0.18, 0.02).pop();
  } else {
    body(); b.push().tr(0, 0.32, 0).boxB(1.95, 0.75, 4.9).pop();
    b.push().tr(0, 1.07, -0.3).boxB(1.9, 0.1, 4.0).pop();
    glassC(); b.push().tr(0, 1.17, -0.25).boxB(1.86, 0.5, 3.9).pop();
    body(); b.push().tr(0, 1.67, -0.4).boxB(1.88, 0.12, 3.6).pop();
    for (const s of [-1, 1]) for (const t of [-1, 1]) wheel(s * 0.88, t * 1.6);
    b.col(0xfff6d8).par(0.2, 0, 0.3); for (const s of [-1, 1]) b.push().tr(s * 0.65, 0.85, 2.455).box(0.35, 0.16, 0.02).pop();
  }
  b.pop();
}
