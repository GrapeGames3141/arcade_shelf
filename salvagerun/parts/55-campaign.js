// ---------- campaign: levels unlocked, wallet, hangar upgrades and fire modes ----------
const UPGRADES = [
  { id: 'rate', name: 'CANNON TUNING', desc: ['Every gun fires 15% faster', '30% faster', '45% faster'], cost: [60000, 120000, 200000] },
  { id: 'power', name: 'POWER CELLS', desc: ['Every gun hits 25% harder', '50% harder'], cost: [90000, 180000] },
  { id: 'locks', name: 'MISSILE RACK', desc: ['10 locks per volley', '12 locks per volley'], cost: [80000, 160000] },
  { id: 'warhead', name: 'SHAPED WARHEADS', desc: ['Missiles do 6 damage and splash what is next to the target'], cost: [120000] },
  { id: 'hull', name: 'HULL PLATING', desc: ['Hull 125', 'Hull 150'], cost: [50000, 110000] },
  { id: 'shield', name: 'DEFLECTOR', desc: ['A shield soaks one hit, back in 14 s', 'Back in 8 s'], cost: [100000, 170000] },
  { id: 'tractor', name: 'TRACTOR BEAM', desc: ['Salvage pays 20% more', '40% more, pulled in from farther'], cost: [60000, 130000] }
];
const MODES = [
  { id: 'cannon', name: 'TWIN CANNON', desc: 'Rapid fire, long range. Always fitted.', cost: 0 },
  { id: 'scatter', name: 'SCATTER GUN', desc: 'Six pellets per shot. Shreds swarms and close junk, weak at range.', cost: 100000 },
  { id: 'beam', name: 'CUTTING BEAM', desc: 'Continuous laser that melts one target. Overheats after 3 s.', cost: 150000 },
  { id: 'flak', name: 'FLAK CANNON', desc: 'Shells burst next to targets and hit everything around them.', cost: 180000 }
];
const CAMP = {};
const STATS = {};
function freshCamp() { return { lvl: 1, wallet: 0, up: { rate: 0, power: 0, locks: 0, warhead: 0, hull: 0, shield: 0, tractor: 0 }, modes: { cannon: true, scatter: false, beam: false, flak: false }, best: {}, mode: 'cannon', done: false }; }
function loadCamp() {
  const c = SAVE.get('camp', null), f = freshCamp();
  Object.assign(CAMP, f, c || {}); CAMP.up = Object.assign(f.up, (c && c.up) || {}); CAMP.modes = Object.assign(f.modes, (c && c.modes) || {}); CAMP.best = Object.assign({}, (c && c.best) || {});
  if (!c) { const old = SAVE.get('best', 0); if (old) CAMP.best[1] = old; } // carry over the single-run best
  applyUpgrades();
}
function saveCamp() { SAVE.set('camp', CAMP); }
function resetCamp() { const best = CAMP.best; Object.assign(CAMP, freshCamp()); CAMP.best = best; applyUpgrades(); saveCamp(); }
function applyUpgrades() {
  const u = CAMP.up;
  Object.assign(STATS, {
    rateK: 1 + 0.15 * u.rate, dmgK: 1 + 0.25 * u.power, locks: [8, 10, 12][u.locks], missile: u.warhead ? 6 : 4, splash: u.warhead ? 8 : 0,
    hull: [100, 125, 150][u.hull], shield: u.shield, shieldT: [0, 14, 8][u.shield], tractor: [1, 1.2, 1.4][u.tractor], tractorRange: [1, 1, 1.7][u.tractor]
  });
  MAX_LOCKS = STATS.locks; MISSILE_DMG = STATS.missile;
  if (!CAMP.modes[WEAP.mode]) WEAP.mode = 'cannon';
}
function upCost(id) { const U = UPGRADES.find(x => x.id === id), t = CAMP.up[id]; return t < U.cost.length ? U.cost[t] : null; }
function buyUpgrade(id) { const c = upCost(id); if (c === null || CAMP.wallet < c) return false; CAMP.wallet -= c; CAMP.up[id]++; applyUpgrades(); saveCamp(); SFX.buy(); return true; }
function buyMode(id) { const M = MODES.find(x => x.id === id); if (!M || CAMP.modes[id] || CAMP.wallet < M.cost) return false; CAMP.wallet -= M.cost; CAMP.modes[id] = true; WEAP.mode = id; CAMP.mode = id; applyUpgrades(); saveCamp(); SFX.buy(); return true; }
// bank a finished level: full score on a win, half (insurance) when the tug is lost
function bankLevel(n, win, score) {
  const paid = Math.round(win ? score : score * 0.5);
  CAMP.wallet += paid;
  if (win) { CAMP.best[n] = Math.max(CAMP.best[n] || 0, Math.round(score)); if (n >= CAMP.lvl && n < LEVELS.length) CAMP.lvl = n + 1; if (n === LEVELS.length) CAMP.done = true; }
  saveCamp(); return paid;
}
function campaignTotal() { let t = 0; for (const k in CAMP.best) t += CAMP.best[k]; return t; }
