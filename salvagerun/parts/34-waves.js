// ---------- scripted waves for levels 2-4 (route position, action); level 1's EV_L1 lives in 60-game.js ----------
const EV_L2 = [
  [10, () => radio('l2a')], [80, () => radio('l2b')],
  [160, () => PAT.field('cube', 3, { lane: 0.7, d: 60 })],
  [300, () => { radio('l2crate'); PAT.cross('crate', 3, -1, 11); }],
  [450, () => { PAT.field('cube', 5, { lane: 0.4 }); PAT.field('scrap', 4, { lane: 0.3 }); }],
  [620, () => { radio('l2sentry'); PAT.sentries(2); }],
  [800, () => { radio('l2mine'); PAT.field('mine', 3, { lane: 0.6, w: 22, h: 9, s0: 0.3, s1: 0.8 }); }],
  [950, () => { PAT.field('crate', 4, { lane: 0 }); PAT.field('cube', 3, { lane: 0.6 }); }],
  [1100, () => { radio('l2spill'); PAT.wall('cube', 7, 26); }],
  [1280, () => { PAT.sentries(3); PAT.field('plate', 4); }],
  [1450, () => { radio('l2tank'); PAT.field('tank', 2, { lane: 0.3, w: 18 }); PAT.field('cube', 4, { lane: 0.3, w: 20 }); }],
  [1600, () => { radio('l2vault'); spawnAt('vault', rr(-18, 18), rr(-6, 6), LEAD, { spin: 0.3 }); PAT.field('mine', 2, { lane: 0.5 }); }],
  [1780, () => { PAT.field('cube', 6, { lane: 0.45 }); PAT.sentries(2); }],
  [1950, () => { PAT.field('crate', 4, { lane: 0 }); PAT.field('tank', 1, { lane: 0.2 }); PAT.ridden(2, 'mite', 2, { host: 'cube' }); }],
  [2120, () => { PAT.field('girder', 3, { lane: 0.7 }); PAT.field('cube', 4); }],
  [2300, () => radio('l2spine')],
  [2400, () => PAT.sentries(3)],
  [2550, () => { radio('l2minefield'); PAT.field('mine', 6, { lane: 0.5, w: 26, h: 12, d: 120, s0: 0.2, s1: 0.6 }); }],
  [2700, () => { for (let i = 0; i < 2; i++) spawnAt('vault', rr(-22, 22), rr(-8, 8), LEAD + i * 30, { spin: 0.3 }); PAT.field('crate', 3, { lane: 0 }); }],
  [2850, () => { PAT.wall('cube', 8, 28); PAT.field('tank', 2, { lane: 0.3 }); }],
  [3000, () => { PAT.sentries(4); PAT.field('plate', 5, { lane: 0.4 }); }],
  [3200, () => { radio('l2wheel'); PAT.field('girder', 3, { lane: 0.5 }); PAT.field('plate', 6, { rv: [3, 2, -6] }); }],
  [3350, () => { PAT.field('tank', 3, { lane: 0.2, w: 18, h: 8 }); PAT.sentries(2); }],
  [3500, () => { PAT.field('mine', 6, { lane: 0.5, d: 110 }); PAT.field('cube', 4, { lane: 0.4 }); }],
  [3700, () => { for (let i = 0; i < 2; i++) spawnAt('vault', rr(-22, 22), rr(-8, 8), LEAD + i * 30, { spin: 0.3 }); PAT.field('crate', 4, { lane: 0 }); PAT.sentries(2); }],
  [3880, () => { PAT.wall('cube', 9, 30); PAT.field('scrap', 6); }],
  [4050, () => radio('l2foundry')],
  [4180, () => { PAT.sentries(3); PAT.field('tank', 2, { lane: 0.3 }); }],
  [4380, () => radio('l2boss')]
];
function ambientL2() {
  if (TUG.s > S_STOP - 400) return;
  const k = pick(['cube', 'scrap', 'scrap', 'plate']), inP = rnd() < 0.33;
  spawnAt(k, rr(-35, 35), rr(-16, 16), LEAD + rr(0, 60), { aim: inP ? inLane() : undefined, spin: rr(0.5, 2.5) });
  if (rnd() < 0.12) spawnAt(rnd() < 0.6 ? 'crate' : 'tank', rr(-35, 35), rr(-14, 14), LEAD + rr(0, 60), { rv: [rr(-4, 4), 0, 0], spin: 0.4 });
}
const EV_L3 = [
  [10, () => radio('l3a')], [90, () => radio('l3b')],
  [170, () => PAT.field('dirtM', 5, { lane: 0.4 })],
  [320, () => { radio('l3crystal'); PAT.cross('crystal', 3, 1, 10); }],
  [480, () => { spawnAt('dirtL', -4, 2, LEAD, { aim: [-1, 1] }); PAT.field('dirtS', 6, { lane: 0.4 }); }],
  [650, () => { radio('l3storm'); PAT.field('iceS', 14, { lane: 0.3, d: 120, rv: [3, 2, -28], s0: 2, s1: 5 }); }],
  [820, () => { PAT.field('crystal', 4, { lane: 0 }); PAT.field('dirtM', 4, { lane: 0.4 }); }],
  [980, () => { radio('swarm'); swarm(7, 0, 4, LEAD); PAT.field('dirtS', 4); }],
  [1150, () => { for (let i = 0; i < 3; i++) spawnAt('dirtL', rr(-18, 18), rr(-9, 9), LEAD + i * 45, { aim: inLane() }); }],
  [1320, () => { PAT.field('crystal', 3, { lane: 0 }); PAT.field('frozen', 2, { lane: 0 }); }],
  [1500, () => PAT.field('dirtS', 16, { lane: 0.35, d: 120, rv: [3, 2, -26], s0: 1, s1: 4 })],
  [1700, () => { PAT.field('dirtM', 6, { lane: 0.4 }); PAT.field('crystal', 2, { lane: 0 }); }],
  [1880, () => radio('l3surface')],
  [2060, () => { radio('l3jets'); PAT.jet(5); }],
  [2250, () => PAT.field('crystal', 4, { lane: 0, y: -10 })],
  [2400, () => { PAT.jet(6); PAT.field('dirtM', 3, { lane: 0.5 }); }],
  [2580, () => { swarm(8, 0, -14, LEAD, { v: [0, 6, -6] }); }],
  [2750, () => { for (let i = 0; i < 3; i++) spawnAt('dirtL', rr(-18, 18), rr(-9, 9), LEAD + i * 40, { aim: inLane() }); PAT.jet(4); }],
  [2950, () => { PAT.field('crystal', 5, { lane: 0 }); PAT.field('frozen', 2, { lane: 0 }); }],
  [3120, () => { radio('l3erupt'); PAT.jet(5, { x: -40 }); setTimeoutSim(0.8, () => PAT.jet(5, { x: 40 })); }],
  [3300, () => { PAT.field('dirtS', 14, { lane: 0.35, d: 120, rv: [3, 2, -26] }); swarm(6, 10, 0, LEAD + 60); }],
  [3480, () => { PAT.field('crystal', 4, { lane: 0 }); for (let i = 0; i < 2; i++) spawnAt('dirtL', rr(-16, 16), rr(-8, 8), LEAD + i * 50, { aim: inLane() }); }],
  [3650, () => PAT.jet(7, { crystals: 0.35 })],
  [3820, () => PAT.field('dirtM', 8, { lane: 0.4 })],
  [4000, () => radio('l3rumble')],
  [4150, () => { PAT.jet(6); PAT.field('crystal', 3, { lane: 0 }); }],
  [4420, () => radio('l3boss')]
];
function ambientL3() {
  if (TUG.s > S_STOP - 400) return;
  const k = pick(['dirtS', 'dirtM', 'dirtS', 'iceS']), inP = rnd() < 0.33;
  spawnAt(k, rr(-35, 35), rr(-16, 16), LEAD + rr(0, 60), { aim: inP ? inLane() : undefined, spin: rr(0.5, 2.5) });
  if (rnd() < 0.13) spawnAt('crystal', rr(-35, 35), rr(-14, 14), LEAD + rr(0, 60), { rv: [rr(-4, 4), 0, 0], spin: 0.4 });
  if (TUG.s > 2100 && rnd() < 0.18) PAT.jet(2);
}
const EV_L4 = [
  [10, () => radio('l4a')], [90, () => radio('l4b')],
  [170, () => { radio('l4eggs'); PAT.ridden(2, 'egg', 1); }],
  [330, () => swarm(5, 0, 4, LEAD)],
  [480, () => { radio('l4spitter'); PAT.ridden(2, 'spitter', 1, { host: 'rockL', w: 34, lane: 0 }); }],
  [650, () => PAT.field('egg', 2, { lane: 0.5, s0: 0.2, s1: 0.6 })],
  [800, () => { radio('l4hoard'); PAT.field('hoard', 3, { lane: 0 }); }],
  [950, () => { swarm(6, -8, 4, LEAD); PAT.field('rockM', 3, { lane: 0.4 }); }],
  [1120, () => { PAT.ridden(2, 'egg', 1, { host: 'rockL', lane: 1, gap: 50 }); PAT.field('rockS', 4, { lane: 0.4 }); }],
  [1300, () => { PAT.ridden(3, 'spitter', 1, { host: 'rockL', w: 36, lane: 0 }); }],
  [1480, () => { PAT.field('egg', 3, { lane: 0.5 }); PAT.field('rockM', 4, { lane: 0.4 }); }],
  [1650, () => { PAT.field('hoard', 4, { lane: 0 }); PAT.field('rockM', 5, { lane: 0.4 }); }],
  [1820, () => { radio('l4swarm'); swarm(8, 0, 0, LEAD); }],
  [2000, () => { PAT.ridden(2, 'egg', 1); PAT.ridden(1, 'spitter', 1, { host: 'rockL', lane: 0 }); PAT.field('rockS', 4, { lane: 0.4 }); }],
  [2180, () => radio('l4throat')],
  [2350, () => { PAT.field('egg', 3, { lane: 0.5, w: 24, h: 18 }); PAT.field('rockS', 4, { lane: 0.4, w: 24, h: 18 }); }],
  [2520, () => { swarm(6, 0, 0, LEAD); PAT.field('rockS', 3, { lane: 0.4, w: 24, h: 18 }); }],
  [2700, () => { for (let i = 0; i < 3; i++) { const e = spawnAt('spitter', (i % 2 ? 1 : -1) * rr(30, 42), rr(-20, 20), LEAD + i * 35, { spin: 0 }); e.q = qrand(); } }],
  [2880, () => { PAT.field('hoard', 4, { lane: 0, w: 24, h: 18 }); PAT.field('egg', 2, { lane: 0.4, w: 24, h: 18 }); PAT.field('rockM', 3, { lane: 0.4, w: 24, h: 18 }); }],
  [3050, () => { radio('l4deeper'); swarm(6, 0, 0, LEAD); }],
  [3220, () => { for (let i = 0; i < 3; i++) spawnAt('spitter', (i % 2 ? 1 : -1) * rr(30, 42), rr(-20, 20), LEAD + i * 35, { spin: 0 }); PAT.field('egg', 3, { lane: 0.4, w: 24, h: 18 }); }],
  [3400, () => { PAT.field('hoard', 3, { lane: 0, w: 24, h: 18 }); swarm(5, 0, 6, LEAD + 40); }],
  [3580, () => { radio('l4eggwall'); PAT.wall('egg', 6, 26, { h: 14, vz: -2 }); }],
  [3760, () => { for (let i = 0; i < 3; i++) spawnAt('spitter', (i % 2 ? 1 : -1) * rr(30, 42), rr(-20, 20), LEAD + i * 35, { spin: 0 }); swarm(5, 0, 0, LEAD + 50); }],
  [3940, () => { PAT.field('hoard', 4, { lane: 0, w: 24, h: 18 }); PAT.field('egg', 2, { lane: 0.4, w: 24, h: 18 }); PAT.field('rockM', 3, { lane: 0.4, w: 24, h: 18 }); }],
  [4120, () => radio('l4cavern')]
];
function ambientL4() {
  if (TUG.s > S_STOP - 400) return;
  const inTunnel = TUG.s > 2250, w = inTunnel ? 24 : 35, h = inTunnel ? 18 : 16;
  const k = inTunnel ? pick(['egg', 'rockS', 'rockM', 'rockS', 'mite', 'rockS']) : pick(['rockS', 'rockM', 'rockS', 'rockM', 'egg']);
  if (k === 'mite') { swarm(3, rr(-15, 15), rr(-8, 8), LEAD); return; }
  spawnAt(k, rr(-w, w), rr(-h, h), LEAD + rr(0, 60), { aim: rnd() < 0.3 ? inLane() : undefined, spin: rr(0.3, 1.5) });
  if (rnd() < 0.12) spawnAt('hoard', rr(-w, w), rr(-h, h), LEAD + rr(0, 60), { spin: 0.4 });
}
const MORE_LINES = {
  // level 2
  l2a: ["Grabby's hoard bought us a ticket to the good scrapyard. Kessler Station. Abandoned, automated, still running."],
  l2b: ["Nobody told the robots the company went bust. They still sort scrap. And they still shoot trespassers."],
  l2crate: ["Sealed crates off the conveyors. Crack 'em open."],
  l2sentry: ["Security drones! Red eye means they shoot. Shoot first."],
  l2mine: ["Mines! Spiky balls that hate us. Pop them before they come for a hug."],
  l2spill: ["Conveyor spill! Here comes a wall of scrap!"],
  l2tank: ["Fuel tanks. Red ones go boom. Make them go boom over there."],
  l2vault: ["Data vault! Armoured, but worth a fortune. Keep shooting it."],
  l2spine: ["Heading into the station spine. Lots of girders. Lots of things to hit, mostly us."],
  l2minefield: ["Minefield. Of course there's a minefield."],
  l2wheel: ["Look at that habitat wheel. Still spinning after thirty years. Lights on, nobody home."],
  l2foundry: ["That orange glow ahead is the foundry. Hot, loud and very much awake."],
  l2boss: ["Something big is unfolding in that gantry. I don't like it."],
  fm1: ["It's the Foreman! The station's breaker robot! It thinks we're scrap!"],
  fm2: ["Hit the glowing joints on its arms! No arms, no swatting!"],
  fmslap: ["It swatted us like a fly!", "Claw! Big claw! Ow!"],
  fmarm: ["Arm's off! Somebody call its union rep!", "There goes the other arm! Ha!"],
  fmcore: ["Its chest is open! That's the reactor! Melt it!"],
  fmpull: ["Magnet! It's reeling us in for the crusher! Shoot faster!"],
  fmcrush: ["We got crushed! Partially! I'll take partially!"],
  fmwin: ["The Foreman's retired! And it had a pension fund full of salvage!"],
  // level 3
  l3a: ["Comet Halvard's coming through. Comets shed ice, dust and rare crystals."],
  l3b: ["Also rocks. Big dirty snowballs. Mind the glare, the sun's right there."],
  l3crystal: ["Glowing crystals! Those are worth more than the tug. Don't tell the tug."],
  l3storm: ["Ice storm off the coma! Sweep it!"],
  l3surface: ["Going down to skim the crust. Stay sharp, the ground's close."],
  l3jets: ["Gas jets! The ground's spitting rocks at us!"],
  l3erupt: ["Big eruption! Everything's coming up!"],
  l3rumble: ["Feel that? The ground's rumbling. Comets don't rumble."],
  l3boss: ["Something's moving under the ice. Something long."],
  gw1: ["It's a worm! A comet worm! It's been eating crystals for a thousand years!"],
  gw2: ["Watch the dust, that's where it comes up! Shoot the glowing gills while it's in the air!"],
  gwhit: ["It hit us mid-jump! Watch the dust, the dust gives it away!"],
  gwrear: ["It's rearing up! Mouth open! Shoot the core!"],
  gwcoil: ["It's coiling up to strike! Kill it before it lunges!"],
  gwbite: ["It bit us! I hate this comet."],
  gwwin: ["Worm's done! And it swallowed a whole crystal vein. Lucky us."],
  // level 4
  l4a: ["Grabby's hoard came from somewhere. I followed the mite trails. I have a bad feeling about this."],
  l4b: ["Welcome to the nest. Everything here is alive and hungry. Except us. We're just hungry."],
  l4eggs: ["Eggs on those rocks! Pop them before they hatch!"],
  l4spitter: ["Spitters growing on the rocks. They spit goo. Spit back. With bullets."],
  l4hoard: ["Pods stuck in the goo. That's the hoard! Grab it!"],
  l4swarm: ["Big swarm! Volley them!"],
  l4throat: ["We're going inside. Into the rock. Into the... throat. Great."],
  l4deeper: ["It's warm in here. Why is it warm in here?"],
  l4eggwall: ["Egg wall! So many eggs!"],
  l4cavern: ["There's a chamber ahead. A big one. With something bigger in it."],
  mat1: ["Oh no. Old Grabby had a MOTHER."],
  mat2: ["That's the Matriarch! Same plan: glowy bits, then eyes, then the core. Bigger everything!"],
  mateyes: ["Eight eyes. She's watching us. Pop them!"],
  matcore: ["Her mouth's open! The core! Everything you've got!"],
  matpull: ["She's sucking us in! Shoot the core!"],
  matchomp: ["She bit us! Mother of all bites!"],
  matslap: ["Mama slapped us!", "Ow! That's the big tentacle!"],
  matwin: ["The nest is ours! Look at all this salvage! Kid, we're buying a second tug!"],
  hangar: ["Spend it wisely, kid. Or on guns. Guns is wise."]
};
