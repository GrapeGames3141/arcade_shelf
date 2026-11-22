// World: lake shoreline, terrain height, scatter placement, wind layers.
// Axes: +Y up, lake centre at the origin. All lengths in metres.
const WORLD = {
  seed: 7,
  island: { x: -165, z: 150, r: 52 },
  islet: { x: 210, z: -120, r: 18 },
  hmRect: [-760, -760, 1520],   // minx, minz, size of the height texture (covers the whole lake)
  hmRes: 512,
  arenaR: 720,                  // beyond this you have drifted off the lake
};

WORLD.shoreR = function (th) {
  return 520 + 70 * Math.sin(2 * th + 1.1) + 45 * Math.sin(3 * th + 2.6) + 26 * Math.sin(5 * th + 0.4)
    + 12 * Math.sin(9 * th + 1.9) + 6 * Math.sin(15 * th + 0.3);
};

// terrain height as a function of polar parameters (s = r / shoreR)
WORLD.heightPolar = function (s, th, x, z) {
  const R = WORLD.shoreR(th), r = s * R;
  let h;
  if (s < 1) {
    // lake bed: shallow shelf near shore, ~14 m deep in the middle
    h = -14 * (1 - Math.pow(s, 2.2)) + fbm(x / 160, z / 160, 3, 11) * 1.4 * (1 - s);
    // shelf lip
    h += -0.6 * smoothstep(0.86, 0.97, s) * (1 - smoothstep(0.97, 1.0, s));
  } else {
    const d = r - R;                 // metres inland from the waterline
    const by = WORLD.beachy(th);
    const beachW = lerp(3, 9, by) + 7 * by * (fbm(th * 6, 3.1, 2, 5) * 0.5 + 0.5);
    const beach = smoothstep(0, beachW, d) * 0.9;
    const slope = 0.06 + 0.05 * (fbm(th * 3, 9.2, 2, 21) * 0.5 + 0.5) + 0.08 * (1 - by);
    let land = beach + Math.max(0, d - beachW) * slope;
    land += fbm(x / 180, z / 180, 4, 3) * 9 * smoothstep(20, 160, d);
    land += fbm(x / 46, z / 46, 3, 51) * 2.2 * smoothstep(15, 90, d);
    land += (ridge(x / 420, z / 420, 4, 61) - 0.55) * 46 * smoothstep(150, 800, d);
    land += (fbm(x / 650, z / 650, 4, 4) * 0.5 + 0.35) * 70 * smoothstep(60, 700, d);
    land += Math.pow(ridge(x / 2600, z / 2600, 5, 8), 1.6) * 520 * smoothstep(1400, 5200, r);
    h = land;
  }
  // islands
  for (const isl of [WORLD.island, WORLD.islet]) {
    const dx = x - isl.x, dz = z - isl.z;
    const dd = Math.hypot(dx, dz) / (isl.r * (1 + 0.12 * vnoise(Math.atan2(dz, dx) * 2.2, 0.5, 77)));
    if (dd < 1) {
      const b = sq(1 - dd * dd);
      const peak = isl === WORLD.island ? 25 : 16;
      h = Math.max(h, h + peak * b + fbm(x / 20, z / 20, 2, 41) * 1.2 * b);
    }
  }
  return h;
};
WORLD.height = function (x, z) {
  const r = Math.hypot(x, z), th = Math.atan2(z, x);
  return WORLD.heightPolar(r / WORLD.shoreR(th), th, x, z);
};
WORLD.isWater = function (x, z) { return WORLD.height(x, z) < 0; };
// how sandy the shore is at this angle (0 = forest and rocks to the waterline, 1 = beach)
WORLD.beachy = function (th) {
  let b = smoothstep(-0.05, 0.3, fbm(Math.cos(th) * 2.2 + 5, Math.sin(th) * 2.2 + 5, 3, 33));
  for (const c of WORLD.cabinAngles) b = Math.max(b, 1 - smoothstep(0.03, 0.09, Math.abs(angWrap(th - c))));
  return b;
};
WORLD.cabinAngles = [0.35, 1.25, 1.9, 2.75, 3.6, 4.4, 5.3, 5.85];

// forest density 0..1 (also used to tint the ground)
WORLD.forest = function (x, z) {
  const r = Math.hypot(x, z), th = Math.atan2(z, x), R = WORLD.shoreR(th);
  const d = r - R;
  let f = smoothstep(-0.52, -0.2, fbm(x / 340, z / 340, 3, 12) + 0.08);
  const by = WORLD.beachy(th);
  f *= smoothstep(lerp(3, 10, by), lerp(9, 26, by), d);
  for (const c of WORLD.clearings) {
    const dd = Math.hypot(x - c.x, z - c.z);
    f *= smoothstep(c.r * 0.6, c.r * 1.25, dd);
  }
  // islands are forested
  for (const isl of [WORLD.island, WORLD.islet]) {
    const dd = Math.hypot(x - isl.x, z - isl.z);
    if (dd < isl.r * 0.62) f = Math.max(f, 0.9);
  }
  return clamp(f, 0, 1);
};

// cabins sit in clearings just back from the beach
WORLD.clearings = [];
WORLD.cabins = [];
(function placeCabins() {
  const angs = WORLD.cabinAngles;
  for (let i = 0; i < angs.length; i++) {
    const th = angs[i], R = WORLD.shoreR(th);
    const d = 30 + (i % 3) * 8;
    const x = Math.cos(th) * (R + d), z = Math.sin(th) * (R + d);
    WORLD.cabins.push({ x, z, th, i });
    WORLD.clearings.push({ x, z, r: 34 });
  }
})();

// ---------- polar terrain mesh: rings of constant s follow the shoreline ----------
WORLD.ringList = function () {
  const s = [];
  const push = (a, b, n, pow) => { for (let i = 0; i < n; i++) s.push(a + (b - a) * Math.pow(i / n, pow || 1)); };
  push(0, 0.86, 70);
  push(0.86, 1.0, 26);
  push(1.0, 1.10, 34);
  push(1.10, 1.6, 40);
  push(1.6, 3.2, 40);
  push(3.2, 18, 46, 1.6);
  s.push(18);
  return s;
};
WORLD.buildTerrain = function (segs) {
  const rings = WORLD.ringList();
  const nr = rings.length, ns = segs;
  const pos = new Float32Array(nr * ns * 3);
  const hts = new Float32Array(nr * ns);
  for (let i = 0; i < nr; i++) {
    for (let j = 0; j < ns; j++) {
      const th = j / ns * TAU, R = WORLD.shoreR(th), r = rings[i] * R;
      const x = Math.cos(th) * r, z = Math.sin(th) * r;
      const h = WORLD.heightPolar(rings[i], th, x, z);
      const k = (i * ns + j) * 3;
      pos[k] = x; pos[k + 1] = h; pos[k + 2] = z; hts[i * ns + j] = h;
    }
  }
  // normals from mesh neighbours
  const nrm = new Float32Array(nr * ns * 3);
  const P = (i, j) => { j = (j + ns) % ns; i = clamp(i, 0, nr - 1); const k = (i * ns + j) * 3; return [pos[k], pos[k + 1], pos[k + 2]]; };
  for (let i = 0; i < nr; i++) for (let j = 0; j < ns; j++) {
    const a = P(i + 1, j), b = P(i - 1, j), c = P(i, j + 1), d = P(i, j - 1);
    let n = v3.cross(v3.sub(c, d), v3.sub(a, b));
    if (i === 0) n = [0, 1, 0];
    n = v3.norm(n); if (n[1] < 0) n = v3.mul(n, -1);
    const k = (i * ns + j) * 3; nrm[k] = n[0]; nrm[k + 1] = n[1]; nrm[k + 2] = n[2];
  }
  const data = new Float32Array(nr * ns * 10);
  const beachTab = new Float32Array(ns);
  for (let j = 0; j < ns; j++) beachTab[j] = WORLD.beachy(j / ns * TAU);
  for (let v = 0; v < nr * ns; v++) {
    const x = pos[v * 3], z = pos[v * 3 + 2];
    const r = Math.hypot(x, z);
    const fo = r < 4000 ? WORLD.forest(x, z) : smoothstep(-0.1, 0.4, fbm(x / 900, z / 900, 3, 12) + 0.2);
    data.set([pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2], nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2], fo, beachTab[v % ns], 0, 0], v * 10);
  }
  const idx = [];
  for (let i = 0; i < nr - 1; i++) for (let j = 0; j < ns; j++) {
    const a = i * ns + j, b = i * ns + (j + 1) % ns, c = (i + 1) * ns + j, d = (i + 1) * ns + (j + 1) % ns;
    idx.push(a, c, b, b, c, d);
  }
  return { data, idx };
};

// height texture for water depth (R16F)
WORLD.buildHeightTex = function () {
  const n = WORLD.hmRes, [mx, mz, sz] = WORLD.hmRect;
  const out = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = mx + (i + 0.5) / n * sz, z = mz + (j + 0.5) / n * sz;
    out[j * n + i] = WORLD.height(x, z);
  }
  return out;
};

// ---------- tree scatter ----------
WORLD.scatterTrees = function (count) {
  const rng = RNG(1234);
  const conifer = [], broad = [];
  let tries = 0;
  while (conifer.length + broad.length < count && tries < count * 40) {
    tries++;
    const th = rng() * TAU, R = WORLD.shoreR(th);
    const band = rng();
    let d;
    if (band < 0.07) {
      // islands
      const isl = rng() < 0.8 ? WORLD.island : WORLD.islet;
      const a = rng() * TAU, rr = Math.sqrt(rng()) * isl.r * 0.62;
      const x = isl.x + Math.cos(a) * rr, z = isl.z + Math.sin(a) * rr;
      const h = WORLD.height(x, z);
      if (h < 1.2) continue;
      conifer.push([x, h - 0.3, z, rng.range(11, 22), rng.range(0.24, 0.36), rng() * TAU, rng.range(0.8, 1.15), rng.range(0.85, 1.1), rng.range(0.8, 1.05)]);
      continue;
    }
    if (band < 0.6) d = 12 + Math.pow(rng(), 1.3) * 260;
    else if (band < 0.88) d = rng.range(260, 800);
    else d = rng.range(800, 2200);
    const x = Math.cos(th) * (R + d), z = Math.sin(th) * (R + d);
    const f = WORLD.forest(x, z);
    if (rng() > f * 1.05) continue;
    const h = WORLD.height(x, z);
    if (h < 1.5) continue;
    // slope reject
    const hx = WORLD.height(x + 3, z) - h, hz = WORLD.height(x, z + 3) - h;
    if (Math.hypot(hx, hz) / 3 > 0.9) continue;
    const nearShore = d < 70;
    const isBroad = rng() < (nearShore ? 0.42 : 0.2);
    if (isBroad) {
      // birch / maple / aspen; a few already turning
      const autumn = rng() < 0.14;
      const tint = autumn ? [rng.range(1.4, 1.9), rng.range(0.7, 1.1), rng.range(0.25, 0.45)] : [rng.range(0.85, 1.15), rng.range(0.9, 1.15), rng.range(0.75, 1.0)];
      broad.push([x, h - 0.3, z, rng.range(9, 17), rng.range(0.45, 0.7), rng() * TAU, tint[0], tint[1], tint[2]]);
    } else {
      const spruce = rng() < 0.35;
      conifer.push([x, h - 0.3, z, rng.range(12, 26), spruce ? rng.range(0.2, 0.26) : rng.range(0.26, 0.38), rng() * TAU, rng.range(0.8, 1.15), rng.range(0.85, 1.12), rng.range(0.8, 1.05)]);
    }
  }
  return { conifer: new Float32Array(conifer.flat()), broad: new Float32Array(broad.flat()), nc: conifer.length, nb: broad.length };
};

// ---------- wind layers ----------
// Each match picks a stack of layers whose direction turns ~100 degrees per layer, so any
// heading is reachable by climbing or sinking. Near the shoreline a return flow pulls back
// towards the middle of the lake.
const WIND = {
  layers: [],
  gustSeed: 1,
  setup(rng) {
    const base = rng() * TAU, turn = (rng() < 0.5 ? 1 : -1) * DEG;
    this.layers = [];
    const alts = [0, 70, 140, 210, 290, 380];
    for (let i = 0; i < alts.length; i++) {
      this.layers.push({ alt: alts[i], dir: base + i * turn * rng.range(85, 120), spd: clamp(1.4 + i * 0.75 + rng.range(-0.5, 0.6), 1, 6.5), drift: rng.range(0.35, 0.75) * (rng() < 0.5 ? -1 : 1), ph: rng() * TAU, per: rng.range(150, 260) });
    }
    this.gustSeed = Math.floor(rng() * 1000);
  },
  // horizontal wind [vx, vz] at a position and time
  at(x, y, z, t) {
    const L = this.layers;
    if (!L.length) return [0, 0];
    let i = 0;
    while (i < L.length - 1 && y > L[i + 1].alt) i++;
    const a = L[i], b = L[Math.min(i + 1, L.length - 1)];
    const u = a === b ? 0 : smoothstep(0, 1, clamp((y - a.alt) / (b.alt - a.alt), 0, 1));
    // interpolate as vectors so the turn is smooth
    // each layer slowly swings back and forth, so chairs at different heights keep meeting
    const da = a.dir + a.drift * Math.sin(t * TAU / a.per + a.ph), db = b.dir + b.drift * Math.sin(t * TAU / b.per + b.ph);
    const sa = a.spd * (1 + 0.15 * Math.sin(t * TAU / (a.per * 0.7) + a.ph * 2)), sb = b.spd * (1 + 0.15 * Math.sin(t * TAU / (b.per * 0.7) + b.ph * 2));
    let vx = lerp(Math.cos(da) * sa, Math.cos(db) * sb, u);
    let vz = lerp(Math.sin(da) * sa, Math.sin(db) * sb, u);
    // gusts
    const g = 1 + 0.18 * vnoise(t * 0.11 + x * 0.004, z * 0.004 + y * 0.01, this.gustSeed);
    vx *= g; vz *= g;
    // everything drifts gently towards the middle of the lake, and harder near the shore
    const r = Math.hypot(x, z);
    if (r > 1) { const k = Math.min(r / 220, 1) * 0.75; vx -= x / r * k; vz -= z / r * k; }
    if (r > 330) {
      const k = smoothstep(330, 600, r) * 3.4;
      vx -= x / r * k; vz -= z / r * k;
    }
    return [vx, vz];
  },
};
