// ---------- catalog ----------
// save = what you save vs. the regular price; slots of the 6 in a basket; w = weight in kg
const ITEMS = {
  tv: { n: '65" TV', e: '📺', was: 999, now: 299, slots: 3, w: 26, c: '#1c1f2b', s: [1.25, .8, .16] },
  laptop: { n: 'Laptop', e: '💻', was: 699, now: 349, slots: 1, w: 3, c: '#3a6fd8', s: [.45, .08, .34] },
  console: { n: 'Game Console', e: '🎮', was: 499, now: 299, slots: 1, w: 4, c: '#222', s: [.42, .14, .32] },
  vacuum: { n: 'Robot Vacuum', e: '🤖', was: 399, now: 149, slots: 1, w: 4, c: '#4b4b55', s: [.42, .14, .42] },
  tablet: { n: 'Tablet', e: '📱', was: 329, now: 179, slots: 1, w: 1, c: '#e9eef5', s: [.3, .06, .22] },
  drone: { n: 'Camera Drone', e: '🚁', was: 299, now: 149, slots: 1, w: 2, c: '#ff8a1f', s: [.36, .2, .36] },
  headphones: { n: 'Headphones', e: '🎧', was: 249, now: 119, slots: 1, w: 1, c: '#d32f61', s: [.26, .26, .14] },
  speaker: { n: 'Smart Speaker', e: '🔊', was: 99, now: 29, slots: 1, w: 1, c: '#2bb3a3', s: [.2, .22, .2] },
  teddy: { n: 'Giant Teddy', e: '🧸', was: 89, now: 29, slots: 2, w: 2, c: '#b9773f', s: [.6, .7, .5], teddy: true },
  rccar: { n: 'RC Monster Truck', e: '🏎️', was: 119, now: 49, slots: 1, w: 2, c: '#e5322d', s: [.42, .22, .3] },
  bricks: { n: 'Brick Castle Set', e: '🧱', was: 159, now: 79, slots: 1, w: 2, c: '#ffd21f', s: [.5, .12, .38] },
  blender: { n: 'Blender', e: '🥤', was: 129, now: 49, slots: 1, w: 3, c: '#9fd64b', s: [.24, .4, .24] },
  mixer: { n: 'Stand Mixer', e: '🍰', was: 399, now: 199, slots: 2, w: 10, c: '#d6304a', s: [.4, .42, .32] },
  toaster: { n: 'Toaster', e: '🍞', was: 49, now: 15, slots: 1, w: 2, c: '#c9ced6', s: [.32, .22, .2] },
  airfryer: { n: 'Air Fryer', e: '🍗', was: 149, now: 59, slots: 2, w: 5, c: '#1e1e22', s: [.38, .38, .36] },
  blanket: { n: 'Heated Blanket', e: '🛏️', was: 99, now: 39, slots: 1, w: 2, c: '#7e57c2', s: [.46, .16, .36] },
};
for (const k in ITEMS) { const it = ITEMS[k]; it.k = k; it.save = it.was - it.now; it.col = C(it.c); }
const CART_SLOTS = 6;

// ---------- layout constants ----------
const STORE = { x0: -40, x1: 40, z0: -56, z1: 0, ceil: 7.5 };
const DOOR = { x0: -4, x1: 4, open: 0 };
const LANES = []; // checkout lanes
{
  const xs = [-25.5, -21.5, -17.5, -13.5, -9.5, 9.5, 13.5, 17.5, 21.5, 25.5];
  xs.forEach((x, i) => LANES.push({ i, num: i + 1, x, express: i === 4 || i === 5, z0: -8.2, z1: -5.8, occ: null, scanT: 0 }));
}
const DEPTS = [
  { name: 'ELECTRONICS', x: -18, z: -32, col: '#2e7dff' }, { name: 'TOYS', x: -31.5, z: -32, col: '#ff6b1f' },
  { name: 'KITCHEN', x: 18, z: -32, col: '#e8304a' }, { name: 'HOME', x: 31.5, z: -32, col: '#7e57c2' },
  { name: 'DEAL ZONE', x: 0, z: -32, col: '#ffde2e' }
];
const PALLET_DEFS = [
  // deal zone
  ['tv', -5, -22, 3], ['tv', 5, -22, 3], ['console', 0, -27, 4], ['laptop', -5, -32, 4], ['laptop', 5, -32, 3],
  ['vacuum', 0, -37, 3], ['tablet', -5, -42, 4], ['tv', 5, -42, 2],
  // electronics
  ['headphones', -14, -15.6, 5], ['drone', -19, -15.6, 3], ['speaker', -16.5, -32, 5], ['drone', -21.5, -41, 3], ['headphones', -21.5, -23, 4],
  // toys
  ['teddy', -29, -15.6, 4], ['rccar', -34, -15.6, 4], ['bricks', -26.5, -23, 4], ['teddy', -31.5, -41, 3], ['rccar', -36.5, -32, 3],
  // kitchen
  ['toaster', 14, -15.6, 6], ['blender', 19, -15.6, 4], ['mixer', 16.5, -41, 3], ['airfryer', 21.5, -32, 4], ['toaster', 21.5, -23, 4],
  // home
  ['speaker', 29, -15.6, 5], ['blanket', 34, -15.6, 4], ['vacuum', 26.5, -41, 3], ['blanket', 36.5, -23, 4], ['speaker', 31.5, -32, 4],
  // back corners: long trip, big prize
  ['tv', -36, -52, 2], ['tv', 36, -52, 2], ['mixer', 0, -52, 2],
];

// ---------- colliders ----------
// static AABBs in xz: {x0,z0,x1,z1,kind}
const COL = [];
const addCol = (x0, z0, x1, z1, kind = 'wall', ref = null) => { const c = { x0, z0, x1, z1, kind, ref, on: true }; COL.push(c); return c; };
const SHELF_X = [-14, -19, -24, -29, -34, 14, 19, 24, 29, 34];
const SHELF_SEG = [[-47, -35], [-29, -17]];

// ---------- world state reset per game ----------
const W = { pallets: [], displays: [], props: [], debris: [], floor: [], flash: null, doorCol: [], tiles: null };

function buildAtlas() {
  const font = (s, w = 900) => `${w} ${s}px "Arial Rounded MT Bold","Trebuchet MS","Segoe UI",sans-serif`;
  const outlined = (c, txt, x, y, fill, stroke, lw) => { c.lineJoin = 'round'; c.lineWidth = lw; c.strokeStyle = stroke; c.strokeText(txt, x, y); c.fillStyle = fill; c.fillText(txt, x, y); };
  atlasRect('white', 8, 8, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); });
  atlasRect('sign', 1024, 220, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.font = font(170); c.textAlign = 'center'; c.textBaseline = 'middle';
    outlined(c, 'BUYGANTIC', w / 2, h / 2 + 8, '#ff2a3d', '#ffe14d', 22);
  });
  atlasRect('banner', 1024, 160, (c, w, h) => {
    c.fillStyle = '#c4001a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffde2e'; c.fillRect(0, 8, w, 6); c.fillRect(0, h - 14, w, 6);
    c.font = font(76); c.textAlign = 'center'; c.textBaseline = 'middle'; outlined(c, 'BLACK FRIDAY DOORBUSTERS', w / 2, h / 2 + 3, '#ffde2e', '#5c0010', 10);
  });
  for (const d of DEPTS) atlasRect('dept_' + d.name, 512, 128, (c, w, h) => {
    c.fillStyle = d.col; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(0, 0, w, 14);
    c.font = font(d.name.length > 8 ? 64 : 80); c.textAlign = 'center'; c.textBaseline = 'middle';
    outlined(c, d.name, w / 2, h / 2 + 4, d.name === 'DEAL ZONE' ? '#c4001a' : '#fff', d.name === 'DEAL ZONE' ? '#fff' : 'rgba(0,0,0,.45)', 8);
  });
  atlasRect('checkout', 512, 128, (c, w, h) => { c.fillStyle = '#0d5bd7'; c.fillRect(0, 0, w, h); c.font = font(78); c.textAlign = 'center'; c.textBaseline = 'middle'; outlined(c, 'CHECKOUT', w / 2, h / 2 + 4, '#fff', '#07306f', 8); });
  for (let i = 1; i <= 10; i++) atlasRect('lane' + i, 128, 128, (c, w, h) => {
    const ex = i === 5 || i === 6; c.fillStyle = ex ? '#ffde2e' : '#0d5bd7'; c.fillRect(0, 0, w, h);
    c.font = font(86); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = ex ? '#c4001a' : '#fff'; c.fillText(String(i), w / 2, h / 2 + 6);
  });
  atlasRect('express', 512, 128, (c, w, h) => { c.fillStyle = '#ffde2e'; c.fillRect(0, 0, w, h); c.font = font(54); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#c4001a'; c.fillText('EXPRESS', w / 2, 44); c.font = font(34); c.fillText('3 ITEMS OR LESS', w / 2, 96); });
  atlasRect('poster', 256, 320, (c, w, h) => {
    c.fillStyle = '#ffde2e'; c.fillRect(0, 0, w, h); c.fillStyle = '#c4001a'; c.fillRect(10, 10, w - 20, h - 20);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = font(44); c.fillStyle = '#ffde2e'; c.fillText('DOORS', w / 2, 70); c.fillText('OPEN', w / 2, 120);
    c.font = font(100); outlined(c, '5AM', w / 2, 205, '#fff', '#5c0010', 10); c.font = font(26); c.fillStyle = '#ffde2e'; c.fillText('LIMITED STOCK!', w / 2, 280);
  });
  atlasRect('poster2', 256, 320, (c, w, h) => {
    c.fillStyle = '#2ef3ff'; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = font(40); c.fillStyle = '#06266b'; c.fillText('UP TO', w / 2, 60); c.font = font(120); outlined(c, '70%', w / 2, 150, '#ff2a3d', '#fff', 10);
    c.font = font(46); c.fillStyle = '#06266b'; c.fillText('OFF', w / 2, 236); c.font = font(22); c.fillText('WHILE SUPPLIES LAST', w / 2, 290);
  });
  atlasRect('wet', 128, 160, (c, w, h) => {
    c.fillStyle = '#ffd400'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.textAlign = 'center'; c.font = font(20); c.fillText('CAUTION', w / 2, 26);
    c.beginPath(); c.arc(w / 2, 62, 12, 0, TAU); c.fill(); c.lineWidth = 9; c.strokeStyle = '#111'; c.beginPath(); c.moveTo(w / 2, 76); c.lineTo(w / 2 - 6, 110); c.lineTo(w / 2 - 26, 126); c.moveTo(w / 2, 96); c.lineTo(w / 2 + 22, 120); c.stroke();
    c.font = font(18); c.fillText('WET FLOOR', w / 2, 150);
  });
  atlasRect('standee', 256, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    // an invented mascot: a grinning price tag with arms
    c.save(); c.translate(w / 2, 220);
    c.fillStyle = '#ffde2e'; c.strokeStyle = '#c4001a'; c.lineWidth = 10;
    c.beginPath(); c.moveTo(-90, -120); c.lineTo(40, -120); c.lineTo(100, -40); c.lineTo(100, 150); c.lineTo(-90, 150); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(55, -75, 14, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#111'; c.beginPath(); c.arc(-35, -20, 14, 0, TAU); c.arc(30, -20, 14, 0, TAU); c.fill();
    c.lineWidth = 9; c.strokeStyle = '#111'; c.beginPath(); c.arc(-2, 25, 42, 0.15, Math.PI - 0.15); c.stroke();
    c.font = font(46); c.textAlign = 'center'; c.fillStyle = '#c4001a'; c.fillText('SAVE!', 5, 120);
    c.lineWidth = 14; c.strokeStyle = '#c4001a'; c.beginPath(); c.moveTo(-90, 40); c.lineTo(-125, -30); c.moveTo(100, 40); c.lineTo(125, 110); c.stroke();
    c.beginPath(); c.moveTo(-40, 150); c.lineTo(-50, 250); c.moveTo(40, 150); c.lineTo(50, 250); c.stroke();
    c.restore();
    c.fillStyle = '#7a5a35'; c.fillRect(40, 470, w - 80, 30);
  });
  for (const k in ITEMS) {
    const it = ITEMS[k];
    atlasRect('item_' + k, 256, 192, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = it.c; c.fillRect(0, 0, w, 34); c.fillRect(0, h - 24, w, 24);
      c.font = font(92, 400); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = it.c; c.fillText(it.e, w / 2, 98);
      c.font = font(24); c.fillStyle = '#fff'; c.fillText(it.n.toUpperCase(), w / 2, 18);
    });
  }
  // a few cereal / generic product prints for shelves
  const brands = [['#ff4d4d', 'CRUNCH-O'], ['#ffb300', 'GOLDEN'], ['#2e7dff', 'SPARKLE'], ['#2bb35a', 'FRESH'], ['#8e44ad', 'ZAP!'], ['#ff7ab6', 'YUM']];
  brands.forEach(([col, nm], i) => atlasRect('brand' + i, 128, 128, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, h / 2 + 10, 34, 0, TAU); c.fill();
    c.fillStyle = col; c.font = font(20); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nm, w / 2, h / 2 + 10);
    c.fillStyle = 'rgba(255,255,255,.9)'; c.font = font(16); c.fillText('NEW!', w / 2, 16);
  }));
  atlasUpload();
}

// ---------- static geometry ----------
const COLS = {
  floor: C('#eeeae2'), floor2: C('#e2ddd3'), dealA: C('#d42a35'), dealB: C('#ffd23f'), asphalt: C('#2a2a33'), line: C('#e8e6dc'), lineY: C('#f2c230'),
  side: C('#9d9a96'), curb: C('#c9c4b6'), wallIn: C('#e9e4f2'), facade: C('#efe3c8'), facadeTrim: C('#c4001a'), roof: C('#4a4a58'),
  shelf: C('#5a6f8f'), shelfBack: C('#d7dce6'), metal: C('#c9d1d9'), metalDk: C('#7e8792'), wood: C('#b88a52'), woodDk: C('#8a6237'),
  ceil: C('#cfd0d8'), panel: C('#ffffff', 1), counter: C('#2f3b52'), belt: C('#1c1c22'), register: C('#e3e6ea'), screen: C('#5fe0ff', 0.9),
  pole: C('#7e8792'), lampHead: C('#ffcf7a', 1), glass: C('#bfe8ff'), doorFrame: C('#a9b2bc'), mat: C('#3b3b46'),
};

function buildStatic(q) {
  for (const p of PRIMS) SET.stat[p].clear();
  TGT = SET.stat; PARENT = null; msp = 0;
  const products = QUALITY[q].products;
  // --- floors ---
  box(0, -0.05, 0, 160, 0.1, 140, COLS.asphalt);
  for (let x = -40; x < 40; x += 2) for (let z = -56; z < 0; z += 2) {
    const cx = x + 1, cz = z + 1, deal = cx > -9 && cx < 9 && cz > -46 && cz < -18;
    let col = ((x + z) / 2 & 1) ? COLS.floor : COLS.floor2;
    if (deal) col = ((x + z) / 2 & 1) ? COLS.dealA : COLS.dealB;
    put('quad', cx, 0.006, cz, 0, -Math.PI / 2, 0, 2, 2, 1, col);
  }
  // entrance mat
  box(0, 0.012, -1.5, 9, 0.02, 3, COLS.mat);
  // sidewalk + curb
  box(0, 0.01, 2.7, 120, 0.02, 4.6, COLS.side); box(0, 0.06, 5.1, 120, 0.12, 0.3, COLS.curb);
  // parking lines
  for (let row of [16, 30]) for (let x = -54; x <= 54; x += 3) { if (Math.abs(x) < 6) continue; box(x, 0.015, row, 0.12, 0.02, 5.2, COLS.line); }
  box(0, 0.015, 8, 100, 0.02, 0.2, COLS.lineY); // fire lane
  for (let x = -6; x <= 6; x += 1.2) box(x, 0.016, 10.5, 0.6, 0.02, 4, COLS.line); // crosswalk
  // --- store shell ---
  const H = STORE.ceil;
  // front wall pieces (with windows), facade above
  box(-22.2, H / 2 + .5, 0.2, 35.6, H + 1, 0.4, COLS.facade); box(22.2, H / 2 + .5, 0.2, 35.6, H + 1, 0.4, COLS.facade);
  box(0, 6.25, 0.2, 8, 4.5, 0.4, COLS.facade); // over door
  box(0, 8.6, 0.25, 81.2, 0.5, 0.55, COLS.facadeTrim); box(0, 0.25, 0.42, 81, 0.5, 0.06, COLS.facadeTrim);
  // windows (glass panes in front of facade, interior visible behind openings is faked by bright panes)
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = sx * (7 + i * 4.2);
    box(x, 2.1, 0.43, 3.6, 2.8, 0.04, C('#9fd8ff', 0.55)); box(x, 3.55, 0.45, 3.8, 0.12, 0.08, COLS.doorFrame); box(x, 0.66, 0.45, 3.8, 0.12, 0.08, COLS.doorFrame);
    put('quad', x + (i - 1) * 0.6, 2.0, 0.47, 0, 0, 0, 1.3, 1.6, 1, [1, 1, 1, 0.25], i % 2 ? ATLAS.rects.poster2 : ATLAS.rects.poster);
  }
  // door frame
  box(-4.15, 2, 0.2, 0.3, 4, 0.6, COLS.doorFrame); box(4.15, 2, 0.2, 0.3, 4, 0.6, COLS.doorFrame); box(0, 4.05, 0.2, 8.6, 0.3, 0.6, COLS.doorFrame);
  // sign + banner + canopy light
  put('quad', 0, 7.0, 0.5, 0, 0, 0, 12.5, 2.7, 1, [1, 1, 1, 1.2], ATLAS.rects.sign);
  put('quad', 0, 4.75, 0.48, 0, 0, 0, 9, 1.4, 1, [1, 1, 1, 0.55], ATLAS.rects.banner);
  // side & back walls
  box(-40.2, H / 2 + .5, -28, 0.4, H + 1, 56.8, COLS.wallIn); box(40.2, H / 2 + .5, -28, 0.4, H + 1, 56.8, COLS.wallIn);
  box(0, H / 2 + .5, -56.2, 80.8, H + 1, 0.4, COLS.wallIn);
  addCol(-40.4, 0, -4, 0.4); addCol(4, 0, 40.4, 0.4); addCol(-40.4, -56.4, -40, 0.4); addCol(40, -56.4, 40.4, 0.4); addCol(-40.4, -56.4, 40.4, -56);
  // roof / ceiling
  box(0, H + 0.5, -28, 80.4, 1, 56.4, COLS.roof);
  box(0, H - 0.02, -28, 80, 0.04, 56, COLS.ceil);
  for (let x = -36; x <= 36; x += 6) for (let z = -52; z <= -4; z += 6) box(x, H - 0.08, z, 3.2, 0.06, 0.7, COLS.panel);
  // interior wall stripe + dept colors on walls
  box(-39.97, 4.6, -28, 0.04, 0.6, 56, C('#ff6b1f')); box(39.97, 4.6, -28, 0.04, 0.6, 56, C('#7e57c2')); box(0, 4.6, -55.97, 80, 0.6, 0.04, C('#2e7dff'));
  box(0, 4.6, -0.02, 80, 0.6, 0.04, C('#c4001a'));
  // --- shelves ---
  const shelfRun = (x, z0, z1, wall) => {
    const len = z1 - z0, cz = (z0 + z1) / 2, w = wall ? 1 : 1.2;
    box(x, 1.2, cz, 0.12, 2.4, len, COLS.shelfBack);
    box(x, 0.06, cz, w, 0.12, len, COLS.shelf);
    for (const yy of [0.62, 1.22, 1.82, 2.42]) box(x, yy, cz, w, 0.05, len, COLS.shelf);
    for (let z = z0; z <= z1 + 0.01; z += len / Math.max(1, Math.round(len / 3))) box(x, 1.25, z, w + 0.04, 2.5, 0.08, COLS.shelf);
    // products
    const sides = wall ? [Math.sign(-x)] : [-1, 1];
    for (const sd of sides) for (const yy of [0.12, 0.67, 1.27, 1.87]) {
      if (!products) { box(x + sd * w * 0.27, yy + 0.24, cz, w * 0.42, 0.44, len - 0.2, C(pick(['#e86a5a', '#f2b33d', '#5a9be8', '#6cc46f', '#b07cd8']))); continue; }
      let z = z0 + 0.15;
      while (z < z1 - 0.3) {
        const pw = rr(0.28, 0.6), ph = rr(0.25, 0.48), pd = rr(0.32, w * 0.45);
        const bi = ri(0, 5), tint = rnd() < .5 ? [1, 1, 1, 0] : C(pick(['#fff0d0', '#d0ecff', '#ffd6e6', '#e2ffd6']));
        put('box', x + sd * (w * 0.5 - pd * 0.5 - 0.02), yy + ph / 2 + 0.03, z + pw / 2, 0, 0, 0, pd, ph, pw * 0.92, tint, ATLAS.rects['brand' + bi]);
        z += pw + rr(0.02, 0.08);
      }
    }
  };
  for (const x of SHELF_X) for (const [a, b] of SHELF_SEG) { shelfRun(x, a, b, false); addCol(x - 0.6, a, x + 0.6, b, 'shelf'); }
  // wall shelves
  shelfRun(-39.45, -52, -14, true); addCol(-40, -52, -38.9, -14, 'shelf');
  shelfRun(39.45, -52, -14, true); addCol(38.9, -52, 40, -14, 'shelf');
  // department signs (hanging)
  for (const d of DEPTS) {
    const r = ATLAS.rects['dept_' + d.name];
    for (const s of [-1, 1]) put('quad', d.x, 5.4, d.z + s * 0.03, s > 0 ? 0 : Math.PI, 0, 0, 6, 1.5, 1, [1, 1, 1, 0.55], r);
    box(d.x - 2.6, 6.5, d.z, 0.03, 2.0, 0.03, COLS.metalDk); box(d.x + 2.6, 6.5, d.z, 0.03, 2.0, 0.03, COLS.metalDk);
  }
  // deal zone banners hanging over the pallets
  for (const z of [-20, -45]) for (const s of [-1, 1]) put('quad', 0, 5.6, z + s * .03, s > 0 ? 0 : Math.PI, 0, 0, 9, 1.4, 1, [1, 1, 1, 0.5], ATLAS.rects.banner);
  // aisle number signs
  let an = 1;
  for (const x of [-36.5, -31.5, -26.5, -21.5, -16.5, 16.5, 21.5, 26.5, 31.5, 36.5]) {
    box(x, 4.2, -23, 1.2, 0.8, 0.06, C('#0d5bd7', 0.4)); an++;
  }
  // --- checkout ---
  put('quad', -17.5, 5.6, -7, 0, 0, 0, 8, 2, 1, [1, 1, 1, .5], ATLAS.rects.checkout);
  put('quad', 17.5, 5.6, -7, 0, 0, 0, 8, 2, 1, [1, 1, 1, .5], ATLAS.rects.checkout);
  put('quad', -17.5, 5.6, -7.03, Math.PI, 0, 0, 8, 2, 1, [1, 1, 1, .5], ATLAS.rects.checkout);
  put('quad', 17.5, 5.6, -7.03, Math.PI, 0, 0, 8, 2, 1, [1, 1, 1, .5], ATLAS.rects.checkout);
  const counterXs = [-27.5, -23.5, -19.5, -15.5, -11.5, -7.5, 7.5, 11.5, 15.5, 19.5, 23.5, 27.5];
  for (const cx of counterXs) {
    box(cx, 0.45, -7, 1.6, 0.9, 6, COLS.counter); box(cx, 0.93, -7, 1.62, 0.06, 6.02, C('#d9dde3'));
    addCol(cx - 0.8, -10, cx + 0.8, -4, 'counter');
  }
  for (const L of LANES) {
    // belt on the counter left of the lane, register near the front
    const bx = L.x - 1.55;
    box(bx, 0.98, -8, 0.55, 0.05, 3.6, COLS.belt);
    box(bx, 1.15, -5.6, 0.5, 0.35, 0.45, COLS.register); box(bx + 0.05, 1.42, -5.6, 0.36, 0.26, 0.04, COLS.screen, 0.3);
    // lane light pole + number
    box(L.x - 1.95, 1.4, -4.2, 0.08, 2.8, 0.08, COLS.pole);
    for (const s of [-1, 1]) put('quad', L.x - 1.95, 3.05, -4.2 + s * .07, s > 0 ? 0 : Math.PI, 0, 0, 0.6, 0.6, 1, [1, 1, 1, 0.8], ATLAS.rects['lane' + L.num]);
    box(L.x - 1.95, 3.05, -4.2, 0.62, 0.62, 0.12, C('#0a2a6a'));
    if (L.express) for (const s of [-1, 1]) put('quad', L.x - 1.95, 3.65, -4.2 + s * .07, s > 0 ? 0 : Math.PI, 0, 0, 1.2, 0.3, 1, [1, 1, 1, 0.7], ATLAS.rects.express);
    // scan zone floor marking
    box(L.x, 0.011, -7, 2.0, 0.01, 2.4, C('#2ef3ff', 0.35));
  }
  // --- parking lot extras ---
  const lamp = (x, z) => { cyl(x, 4, z, 0.12, 8, COLS.pole); box(x, 8.05, z, 1.2, 0.25, 0.5, COLS.pole); box(x, 7.9, z, 0.9, 0.08, 0.35, COLS.lampHead); cyl(x, 0.3, z, 0.35, 0.6, C('#d2cdbf')); addCol(x - .35, z - .35, x + .35, z + .35, 'post'); };
  for (const [x, z] of PARKING_LAMPS) lamp(x, z);
  // parked cars
  const carCols = ['#d63031', '#0984e3', '#fdcb6e', '#00b894', '#6c5ce7', '#e17055', '#dfe6e9', '#2d3436'];
  rnd = mulberry(77);
  for (const row of [16, 30]) for (let x = -52.5; x <= 52.5; x += 3) {
    if (Math.abs(x) < 9 || rnd() < 0.35) continue;
    const col = C(pick(carCols)), z = row + (rnd() < .5 ? -1.4 : 1.4), ry = rnd() < .5 ? 0 : Math.PI;
    box(x, 0.65, z, 1.8, 0.7, 4.1, col, ry); box(x, 1.25, z + (ry ? .2 : -.2), 1.6, 0.6, 2.1, shade(col, .92), ry);
    box(x, 1.25, z + (ry ? .2 : -.2), 1.62, 0.44, 1.7, C('#1d2733'), ry);
    for (const [wx, wz] of [[-.85, 1.3], [.85, 1.3], [-.85, -1.3], [.85, -1.3]]) cyl(x + wx, 0.35, z + wz, 0.34, 0.24, C('#111'), 0, Math.PI / 2);
    box(x, 0.75, z + (ry ? -2.06 : 2.06), 1.4, 0.18, 0.04, C('#fff6b0', 0.8), ry);
    addCol(x - 1, z - 2.15, x + 1, z + 2.15, 'car');
  }
  // cart corral
  box(-18, 0.5, 12, 0.08, 1, 6, COLS.metal); box(-16.2, 0.5, 12, 0.08, 1, 6, COLS.metal); box(-17.1, 1, 12, 1.9, 0.06, 6, COLS.metal);
  addCol(-18.1, 9, -16.1, 15, 'corral');
  // bollards by door
  for (const x of [-6, -5, 5, 6]) { cyl(x, 0.5, 3.2, 0.14, 1, C('#ffd23f')); addCol(x - .15, 3.05, x + .15, 3.35, 'post'); }
  TGT = SET.dyn;
}
const PARKING_LAMPS = [[-20, 12], [0, 14.5], [20, 12], [-38, 24], [38, 24], [-12, 33], [12, 33], [-46, 9], [46, 9]];

// ---------- dynamic world objects ----------
function resetWorld() {
  W.pallets = []; W.displays = []; W.props = []; W.debris = []; W.floor = []; W.flash = null;
  // remove dynamic colliders from previous game
  for (let i = COL.length - 1; i >= 0; i--) if (COL[i].kind === 'pallet' || COL[i].kind === 'display' || COL[i].kind === 'door') COL.splice(i, 1);
  for (const [k, x, z, n] of PALLET_DEFS) addPallet(k, x, z, n + (ITEMS[k].slots >= 3 ? 0 : 1));
  // breakable displays
  const D = [
    ['cans', -14, -48.4], ['cereal', -19, -48.4], ['cans', -29, -48.4], ['towels', -34, -48.4], ['cereal', 14, -48.4], ['cans', 19, -48.4], ['towels', 29, -48.4], ['cereal', 34, -48.4],
    ['cans', -24, -33.6], ['towels', 24, -33.6], ['cereal', -8, -19], ['cans', 8, -19], ['towels', -8, -46], ['cereal', 8, -46],
    ['cans', -2.5, -15], ['cereal', 2.5, -15], ['towels', -24, -15.6], ['cans', 24, -15.6], ['cereal', -36.5, -45], ['cans', 36.5, -45],
  ];
  for (const [k, x, z] of D) addDisplay(k, x, z);
  // props
  for (let i = 0; i < 12; i++) { const x = 6 + i * 2.55; W.props.push(makeProp('stanchion', x, 1.25)); W.props.push(makeProp('stanchion', x, 4.65)); }
  for (const [x, z] of [[-6.5, -14.5], [6.5, -14.5], [-16.5, -44], [21.5, -38], [-26.5, -27], [31.5, -26], [0, -49], [-31.5, -52]]) W.props.push(makeProp('wet', x, z));
  for (const [x, z] of [[-9.5, -21], [9.5, -27], [-9.5, -39], [9.5, -44], [-3, -11.5], [3, -11.5]]) W.props.push(makeProp('standee', x, z));
  for (const [x, z] of [[-5.5, -3], [5.5, -3], [-6.2, -3], [6.2, -3]]) W.props.push(makeProp('baskets', x, z));
  // doors
  DOOR.open = 0; W.doorCol = [addCol(-4, 0, 0, 0.4, 'door'), addCol(0, 0, 4, 0.4, 'door')];
}
function addPallet(kind, x, z, stock) {
  const it = ITEMS[kind], big = it.slots >= 3;
  const hw = big ? 1.0 : 0.65, hd = big ? 0.75 : 0.65;
  const p = { kind, it, x, z, hw, hd, stock, max: stock, col: null, glow: 0, id: W.pallets.length };
  p.col = addCol(x - hw, z - hd, x + hw, z + hd, 'pallet', p);
  W.pallets.push(p); return p;
}
function addDisplay(kind, x, z) {
  const d = { kind, x, z, broken: false, hw: 0.75, hd: 0.75, blocks: [] };
  if (kind === 'cans') { for (let l = 0; l < 5; l++) for (let i = 0; i < 5 - l; i++) for (let j = 0; j < 5 - l; j++) d.blocks.push({ x: (i - (4 - l) / 2) * 0.27, y: 0.07 + l * 0.15 + 0.07, z: (j - (4 - l) / 2) * 0.27, t: 'can', c: pick([C('#e74c3c'), C('#e67e22'), C('#c0392b')]) }); }
  else if (kind === 'cereal') { for (let l = 0; l < 4; l++) for (let i = 0; i < 4 - l; i++) for (let j = 0; j < 2; j++) d.blocks.push({ x: (i - (3 - l) / 2) * 0.36, y: 0.06 + l * 0.44 + 0.22, z: (j - .5) * 0.5, t: 'cereal', b: ri(0, 5) }); }
  else { for (let l = 0; l < 3; l++) for (let i = 0; i < 3 - l; i++) for (let j = 0; j < 3 - l; j++) d.blocks.push({ x: (i - (2 - l) / 2) * 0.42, y: 0.06 + l * 0.5 + 0.25, z: (j - (2 - l) / 2) * 0.42, t: 'towel', c: pick([C('#f5f5f5'), C('#cfe8ff'), C('#ffe0f0')]) }); }
  d.col = addCol(x - d.hw, z - d.hd, x + d.hw, z + d.hd, 'display', d);
  W.displays.push(d); return d;
}
function makeProp(kind, x, z) { return { kind, x, z, x0: x, z0: z, vx: 0, vz: 0, ry: rr(-0.3, 0.3) + (kind === 'standee' ? (z < -12 ? 0 : 0) : 0), tip: 0, tipV: 0, tipDir: 0, r: kind === 'stanchion' ? 0.18 : kind === 'baskets' ? 0.3 : 0.32, down: false }; }

// ---------- navigation grid ----------
const NAV = { x0: -44, z0: -58, w: 90, h: 92, cell: 1, g: null };
function buildNav() {
  const { w, h } = NAV; NAV.g = new Uint8Array(w * h);
  const inf = 0.6;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = NAV.x0 + i + 0.5, z = NAV.z0 + j + 0.5;
    let b = 0;
    for (const c of COL) { if (c.kind === 'door' || c.kind === 'display') continue; if (x > c.x0 - inf && x < c.x1 + inf && z > c.z0 - inf && z < c.z1 + inf) { b = 1; break; } }
    if (x < -42 || x > 42 || z > 28 || z < -56) b = 1;
    NAV.g[j * w + i] = b;
  }
}
const navIdx = (x, z) => { const i = Math.floor(x - NAV.x0), j = Math.floor(z - NAV.z0); if (i < 0 || j < 0 || i >= NAV.w || j >= NAV.h) return -1; return j * NAV.w + i; };
const navFree = (x, z) => { const k = navIdx(x, z); return k >= 0 && !NAV.g[k]; };
function navLOS(ax, az, bx, bz) {
  const d = hyp(bx - ax, bz - az), n = Math.ceil(d / 0.4);
  for (let s = 1; s < n; s++) { const t = s / n; if (!navFree(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
  return true;
}
// A* with binary heap
const _open = new Int32Array(90 * 92 * 2), _g = new Float32Array(90 * 92), _f = new Float32Array(90 * 92), _from = new Int32Array(90 * 92), _stamp = new Uint32Array(90 * 92), _closed = new Uint32Array(90 * 92);
let _st = 1;
function navPath(ax, az, bx, bz) {
  const W_ = NAV.w;
  let s = navIdx(ax, az), t = navIdx(bx, bz);
  if (s < 0 || t < 0) return null;
  const nearestFree = (k) => { if (!NAV.g[k]) return k; const ci = k % W_, cj = (k / W_) | 0; for (let r = 1; r < 6; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= W_ || j >= NAV.h) continue; const kk = j * W_ + i; if (!NAV.g[kk]) return kk; } return -1; };
  s = nearestFree(s); t = nearestFree(t); if (s < 0 || t < 0) return null;
  _st++; let n = 0;
  const ti = t % W_, tj = (t / W_) | 0;
  const H = (k) => { const di = Math.abs(k % W_ - ti), dj = Math.abs(((k / W_) | 0) - tj); return Math.max(di, dj) + 0.414 * Math.min(di, dj); };
  const pushH = (k) => { let i = n++; _open[i] = k; while (i > 0) { const p = (i - 1) >> 1; if (_f[_open[p]] <= _f[k]) break; _open[i] = _open[p]; i = p; } _open[i] = k; };
  const popH = () => { const top = _open[0], last = _open[--n]; let i = 0; while (true) { let l = 2 * i + 1; if (l >= n) break; const r = l + 1; if (r < n && _f[_open[r]] < _f[_open[l]]) l = r; if (_f[_open[l]] >= _f[last]) break; _open[i] = _open[l]; i = l; } _open[i] = last; return top; };
  _stamp[s] = _st; _g[s] = 0; _f[s] = H(s); _from[s] = -1; pushH(s);
  let iter = 0;
  while (n > 0 && iter++ < 9000) {
    const k = popH(); if (k === t) break;
    if (_closed[k] === _st) continue; _closed[k] = _st;
    const ci = k % W_, cj = (k / W_) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= W_ || j >= NAV.h) continue;
      const kk = j * W_ + i; if (NAV.g[kk]) continue;
      if (di && dj && (NAV.g[cj * W_ + i] || NAV.g[j * W_ + ci])) continue;
      const g = _g[k] + (di && dj ? 1.414 : 1);
      if (_stamp[kk] !== _st || g < _g[kk]) { _stamp[kk] = _st; _g[kk] = g; _f[kk] = g + H(kk); _from[kk] = k; pushH(kk); }
    }
  }
  if (_stamp[t] !== _st) return null;
  const pts = []; let k = t; while (k >= 0) { pts.push([NAV.x0 + k % W_ + 0.5, NAV.z0 + ((k / W_) | 0) + 0.5]); k = _from[k]; if (pts.length > 400) break; }
  pts.reverse(); pts[pts.length - 1] = [bx, bz];
  // string pull
  const out = [[ax, az]]; let i = 0;
  while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !navLOS(out[out.length - 1][0], out[out.length - 1][1], pts[j][0], pts[j][1])) j--; out.push(pts[j]); i = j; }
  out.shift(); return out;
}
