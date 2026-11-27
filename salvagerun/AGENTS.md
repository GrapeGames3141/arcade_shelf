# Salvage Run — agent notes

On-rails space shooter campaign. You're the gunner on the junky salvage tug *Second Mortgage*; Gus flies a fixed route and
the player only aims and fires: a rapid-fire gun (four fire modes, toggled in flight) plus a lock-on volley (sweep up to 8-12
targets, release to launch homing missiles). Score is credits, and credits are also the campaign money: four levels, each
ending with a boss, and a hangar between levels where the take buys upgrades and fire modes.

`salvagerun.html` is generated: **edit `parts/*`, then run `python build.py`.** No other build step, no external files.
Test API: `window.SR`. Headless harness: `python test/shot.py <scenario> [args]` (see Test recipe).
Design and the calls made in the first (unattended) build and the campaign update are in `notes.md`.

## File map (parts/)
| file | what |
|---|---|
| `shell.html`, `style.css` | page skeleton, HUD (score, hull + shield tag, route bar, radio, boss bar, gun panel), touch buttons, menu / levels / hangar / how-to / pause / results screens |
| `00-util.js` | URL flags (`TEST`), math, seeded RNG (`rnd` sim, `frnd` effects), value noise, quaternions, `instMat` (3x4 rows), mat4, `SAVE` (localStorage in try/catch) |
| `10-gl.js` | WebGL2 context, `QUALITY` tiers, `compile()`, HDR render targets (MSAA RGBA16F -> resolve -> bloom chain), sun shadow map, canvas sizing with DPR cap, pixel budget and adaptive scale |
| `15-shaders.js` | all GLSL: instanced lit mesh (materials 0-11, PBR-ish sun + 16 point lights + PCF shadows + haze), shadow, sky (stars, band, nebula cubemap, sun, gas giant with rings; per-level rotation, tint, ring and sun size), splats, particles, motes, bloom, composite |
| `20-meshes.js` | `Geo` builder and primitives, every mesh template (rocks, ice, hulls, tug, missiles, station junk, robot parts, comet crystals, worm head, eggs, spitters, cavern), shared VBO/IBO, dynamic VAO for tubes |
| `22-batch.js` | per-frame instance batching (`inst`) and static scenery (`sinst`) grouped by template and sorted by route position, drawn as a window |
| `25-splats.js` | splat records, nebula generation and cubemap bake, local gas / dust / glitter along the route, speed motes, particle pool (SoA), `FX` presets, short-lived point lights |
| `30-route.js` | route spline and rail frames, `ZONES` / `S_STOP` / `S_BOSS` (set per level), `ENV` per zone for all levels (blended by `envAt`), speed profile, level 1 scenery (`sceneryL1`, the Corvina Sunrise) |
| `32-levels.js` | `LEVELS` table (route points, zones, stop, boss, waves, scenery, sky, ranks), wave patterns `PAT`, scenery and arenas for levels 2-4, comet terrain and Nest tunnel meshes (own VAOs, `LVMESH`), `setLevel` / `buildScenery` / `buildLevel` |
| `34-waves.js` | scripted waves `EV_L2..EV_L4`, ambient spawns, radio lines for levels 2-4 (`MORE_LINES`) |
| `40-entities.js` | `KINDS` table (hp, damage, points, salvage, behaviours: shooter, mine, egg, pace), spawning, rail / world / host / swarm / manual spaces, critters, riders, splitting, salvage pickups, `isDanger`, damage and kill rules |
| `45-boss.js` | boss framework (`BOSS`, `BOSS_TYPES`, parts, HP, shared death, jackpot) + Old Grabby / the Matriarch (same code, config) + tube mesher |
| `46-bosses.js` | the Foreman (level 2, two-bone IK arms) and the Gulper (level 3, comet worm whose body follows its head's trail) |
| `50-weapons.js` | projection helpers, aim assist, turret, fire modes (cannon, scatter, beam, flak), lock-on sweep, missiles, drawing |
| `55-campaign.js` | `UPGRADES`, `MODES`, campaign save `CAMP`, derived `STATS`, buying, `bankLevel` |
| `60-game.js` | game state `G`, tug motion, chase camera, hull and shield, scoring, radio (`LINES`), level 1 script `EV_L1`, `step()`, results |
| `70-audio.js` | procedural WebAudio effects (incl. fire-mode sounds and the held beam hum), step-sequencer music, optional speech-synthesis pilot voice |
| `80-input.js` | `SET` (settings), mouse (right-button or hold-left lock, wheel / middle click = mode), keyboard (Q / E / 1-4 / Tab = mode), touch (drag + FIRE / LOCK / MODE / AUTO), gamepad (Y = mode) |
| `85-render.js` | `renderFrame()`: shadow pass, sky, static + dynamic meshes, level meshes, tubes, gas splats, motes, particles, MSAA resolve, bloom, composite |
| `90-main.js` | 2D HUD overlay (reticle, lock and danger brackets, beam heat arc, Gulper warning), DOM HUD, settings UI, menu / levels / hangar / results, autopilot bot, main loop, boot, `window.SR` |

## Campaign
- `CAMP` = `{lvl, wallet, up, modes, best, mode, done}` in localStorage `salvagerun.camp`. `lvl` is the highest unlocked level,
  `best[n]` the best winning score per level, `mode` the fire mode a run starts with. **NEW CAMPAIGN** (Levels screen, two
  clicks) clears wallet, upgrades, modes and unlocks but keeps the bests. The old single-run best (`salvagerun.best`) is
  carried into `best[1]` the first time.
- Banking (`bankLevel`): a win pays the full score into the wallet and unlocks the next level; a lost tug pays half (insurance).
- Flow: menu START / CONTINUE starts the highest unlocked level; results after a win -> HANGAR · LEVEL n+1 -> LAUNCH; after a
  loss RETRY or HANGAR. LEVELS replays any unlocked level. Changing level rebuilds route, scenery, gas and level meshes
  (`buildLevel`, about a frame or two; a loading card shows meanwhile).
- Upgrades (`UPGRADES`, effects in `applyUpgrades` -> `STATS`):

| upgrade | tiers and cost | effect |
|---|---|---|
| CANNON TUNING | 60k / 120k / 200k | every gun fires 15 / 30 / 45% faster (`rateK`) |
| POWER CELLS | 90k / 180k | every gun +25 / 50% damage (`dmgK`) |
| MISSILE RACK | 80k / 160k | 10 / 12 locks per volley (`MAX_LOCKS`) |
| SHAPED WARHEADS | 120k | missiles do 6 instead of 4 and splash 2 x dmgK within 8 m |
| HULL PLATING | 50k / 110k | hull 125 / 150 (HUD shows percent of max) |
| DEFLECTOR | 100k / 170k | a shield eats one hit, recharges in 14 / 8 s |
| TRACTOR BEAM | 60k / 130k | salvage pays x1.2 / x1.4; tier 2 also pulls 1.7x harder |

- Fire modes (`MODES`, bought once, then toggled in flight; mode order cannon, scatter, beam, flak):
  - TWIN CANNON (free): 11 shots/s x rateK, bolts 720 m/s, 1 x dmgK.
  - SCATTER GUN (100k): 3.4 shots/s, 6 pellets of 0.85 x dmgK in a 0.055 rad cone, 560 m/s, 0.5 s life (about 280 m).
  - CUTTING BEAM (150k): hits the first thing on the aim line within 650 m for 11 x dmgK per second; heat fills in 3 s,
    overheats, locks out until it cools to 30%. Heat bar in the gun panel and an arc around the reticle.
  - FLAK CANNON (180k): 2.6 shells/s at 420 m/s, fused to the aim distance, bursts on proximity (r + 6 m), 3 x dmgK
    falling off over 14 m to everything in the burst.
  - Accuracy counts a pellet as 1/6 shot, a flak shell that catches anything as a hit, and each 0.25 s of beam as one shot.

## Levels
| # | name | route | zones (speed) | stop / boss | boss | ranks S/A/B/C |
|---|---|---|---|---|---|---|
| 1 | THE CORVINA RUN | 8.8 km | graveyard, belt, ice, approach (44-47) | 7300 / 7440 | Old Grabby | 400k / 280k / 180k / 100k |
| 2 | KESSLER BREAKER YARD | 5.9 km | breaker yard, station spine, foundry (44-46) | 4500 / 4640 | the Foreman | 400k / 280k / 180k / 100k |
| 3 | THE COMET TAIL | 5.7 km | the coma, the crust, the burrow (45-47) | 4600 / 4740 | the Gulper | 300k / 210k / 140k / 80k |
| 4 | THE NEST | 5.7 km | the hive, the throat (tunnel), brood chamber (40-44) | 4500 / 4640 | the Matriarch | 360k / 260k / 170k / 100k |

Level 1 is the original run unchanged (zone speeds and Grabby's config reproduce it). New enemy kinds: cubes (split into
scrap), crates and vaults (salvage), red tanks (26 m blast), mines (wake at 240 m and drift at the tug), sentries (keep station
ahead, turn to face the tug, fire plasma), dirty comet ice, crystals (salvage), gas jets on the crust that throw rocks, eggs
(hatch two mites at 125 m), spitters riding rocks (lob globs) and Grabby's hoard pods.

### Bosses
- **Old Grabby** (L1): 4 tentacles x 3 nodes (6 hp), 6 eyes (12 hp, immune while blinking), core 64 hp, pull bar 13 s.
- **The Foreman** (L2): a breaker robot 80 m out. Two IK arms (shoulder 36 m, forearm 33 m), each with a shoulder and an
  elbow joint (16 hp). Joints take full damage only while they glow (the arm is winding up, striking, reaching or throwing),
  30% otherwise. Strikes come after a 1.4 s wind-up with the body lunging 22 m (14 damage); reach-and-throw hurls a scrap
  cube. Both arms off -> REACTOR: the chest opens on a 120 hp core for 6 s, shuts for 2.6 s and drops two sentries and a mine;
  the magnet pull fills in 14 s and drags the tug up to 34 m in, full = crush (22 damage).
- **The Gulper** (L3): a worm under the comet crust. Dust plumes and a red INCOMING ring mark where it will break the surface
  1.4 s ahead; every third leap is aimed at the tug (16 damage on contact). It hangs near the top of each arc; 6 gills (6 hp)
  are targetable only while above the crust. Gills gone -> MAW: it rears up 70 m in front of the tug, spits rocks; the
  COILING TO STRIKE bar fills in 12 s, full = bite (20 damage). Core 70 hp.
- **The Matriarch** (L4): Grabby's code with 6 tentacles, 8 eyes, core 120 hp, attacks 1.4x as often, thrown eggs.
- Shared: `BOSS.onHit` may return a number (armoured damage); `BOSS.focus` steers the camera; `BOSS.pullDist` caps how far the
  pull drags the tug; the camera keeps 14% of its tug-relative look so the tug stays in frame.

## Rules and tuning (level 1 unless noted)
- Route: Catmull-Rom through the level's points, resampled every 2 m, frames by parallel transport with a little bank.
  L1 zones by arc length: graveyard 0-2300, belt 2300-4600, ice 4600-6700, approach 6700-7300.
- Spawns use rail coordinates (lateral x, vertical y, route z) 360 m ahead (`LEAD`). `aim` gives a velocity that brings the
  object into the lane at arrival. Ambient trickle every 48-80 m, one third aimed at the lane.
- Tug collision sphere 3.6 m; an object hits when its centre comes within 0.72 x its radius + 3.6 m.
- Hull 100 (125 / 150 with plating). Damage: rock L/M/S 18/10/5, ore 12, plate 9, girder 14, engine core 20, mite 4, bile glob
  8, thrown plate 10, tentacle slap 14, chomp 22; cube 12, scrap 5, tank 18, mine 16, plasma 6, sentry 8, dirt ice as rocks,
  crystal 10, egg 6. Patch kit +15 (about 1 in 5 cargo pods); at full hull it pays 200 x combo.
- Aim assist picks the target within 18 px (30 px on touch) and leads it. `isDanger` (red brackets, bot priority) predicts rail
  objects, homing objects within 260 m, and free-flying world objects by closest approach within 5 s.
- Volley: up to 8 locks (10 / 12 with the rack), a target takes more locks while hp - pending > 0, re-lock gap 0.16 s, lock pad
  30 px (44 px touch), cooldown 0.35 s. Missiles ramp to 340 m/s, turn rate 3 + 16 x age rad/s, forced hit at 1.9 s.
- Scoring: points x combo multiplier x chain factor. Combo: +1 per kill, window 2.6 s, multiplier 1 + floor(combo / 6) up to 8,
  reset by a hull hit (not by a shield hit). Chain: k-th kill of one volley x k (cap 8); 8 kills = FULL HOUSE +1000 x combo.
  Salvage pays value x combo x tractor. End: +25 per hull point and +5000 for the boss (wins only).
- Sentries (`PAT.sentries`) pace 230-320 m ahead for 5-8 s, closing in, then drift past. Eggs hatch at 125 m.
- Settings in localStorage `salvagerun.quality|sound|music|voice|lockMode|auto|sens`; campaign in `salvagerun.camp`. In `?test`
  mode nothing is saved (add `&save` to allow it).

## Measured headless (`test/shot.py lfull <n> <acc> [grant]`, LOW, 960x540, 2026-11-27)
The bot aims at 2400 x acc px/s, reacts (1 - acc) x 0.6 s late on each new target and wobbles by (1 - acc) x 26 px. It shoots
threats on a collision course first, then salvage, and sweeps a volley when 3+ targets are on screen. Cannon only.
| level | bot skill | upgrades | result | score | hull hits | run time |
|---|---|---|---|---|---|---|
| 1 | 0.6 | none | win | 468,840 (S) | 1 | 3:39 |
| 1 | 0.25 | none | win | 231,985 (B) | 10 (8 mites) | 3:48 |
| 2 | 0.6 | none | win | 449,445 (S) | 1 (magnet crush) | 2:39 |
| 2 | 0.25 | none | lost at the boss | 248,550 | 15 (11 plasma) | 2:34 |
| 2 | 0.25 | hull 1, rate 1, shield 1 | win | 159,225 (C) | 10 + shield | 2:41 |
| 3 | 0.6 | none | win | 265,505 (A) | 1 | 2:39 |
| 3 | 0.25 | none | win | 163,815 (B) | 9 (6 mites) | 2:56 |
| 3 | 0.25 | hull 1, rate 1, shield 1 | win | 280,645 (A) | 0 (shield took them) | 2:38 |
| 4 | 0.6 | none | win | 339,890 (A) | 4 | 3:03 |
| 4 | 0.25 | none | lost at the boss | 150,135 | 39 (29 mites) | 3:16 |
| 4 | 0.25 | hull 2, rate 2, power 1, shield 1 | win, 5 hull left | 177,455 (B) | 40 (9 on the shield) | 3:31 |

The pre-boss routes of levels 2-4 take about 1:50-2:10; the bosses 40-60 s. The bot knows exactly what is on a collision course,
so people will take more hits than these numbers suggest. Levels 2-4 assume some upgrades: a slow bot without any loses level 2
to sentry plasma and level 4 to mites; with a few upgrades it clears both. Level 4 is the mite level (about 80-120 mites a run
against 71 in level 1); it was halved twice from the first draft, which killed the slow bot in the first 40 s. Sentries fire
1.3x less often in level 2 (`LV.fireK`) and their plasma flies at 50 m/s so it can be shot down.

## Renderer notes
- HDR: everything renders into an MSAA RGBA16F target (RGBA8 fallback), resolved with `blitFramebuffer`, then a 13-tap
  downsample / tent upsample bloom chain (4-7 levels), then ACES in the composite.
- Nebula: ~5k-15k painterly Gaussian splats baked once into a cubemap (emission additive, dust multiplicative, transmittance in
  alpha). Levels share the bake and differ by a sky rotation (`uSkyRot`), planet tint, ring on/off and sun size, plus their own
  `ENV` (sun, ambient, haze, exposure, nebula and star gain).
- Local gas: world-space splats along the route sorted by route position, drawn as one contiguous range around the tug.
- Meshes: one shared VBO/IBO; per-frame instances packed per template; static scenery grouped per template, sorted by route key
  and drawn as a window (-450 m .. +1700 m). Far instances shrink to nothing between 78% and 100% of the fade distance.
- Level meshes (comet crust 71 columns x 331 rows, Nest tunnel 30 sides x 268 rings) have their own VAO with one identity
  instance and are drawn with `uUseUV = 1`, which skips the far-shrink. The crust casts shadows. Triangles are oriented to their
  vertex normals (`orientMesh`) so two-sided lighting stays right.
- Materials are procedural in the fragment shader; 10 is glowing crystal tinted by the instance colour, 11 dirty comet ice.
  Organic (5): template-space veins, world-sized veins on shells bigger than 20 m, UV-space suckers on tubes; special -1 turns
  suckers off (tunnel) and fades veins to 22% (background flesh).
- Tubes (tentacles, worm body; max 8, 32 rings x 16 sides) are rebuilt on the CPU each frame from `BOSS.tubes`.

## Quality tiers
LOW: 0.75 render scale, DPR 1, no MSAA, no shadows, 4 bloom levels, 320 px nebula, 35% field. MEDIUM: DPR <= 1.25, MSAA 4,
1024 shadows, 512 px nebula, 60% field. HIGH: DPR <= 2 under a 3.4 MP pixel budget, adaptive render scale 0.6-1.0, 2048
shadows, 768 px nebula, 80% field, 3x3 PCF. MAX: native DPR, MSAA up to 8, 4096 shadows with 5x5 PCF, 1024 px nebula, full
field and gas, 7 bloom levels. Changing quality rebuilds targets, nebula and the current level's scenery.

## Test recipe
```
python build.py
python test/shot.py basic        # menu, first 35 s with the autopilot (desktop 1280x720)
python test/shot.py zones        # level 1 set pieces
python test/shot.py boss         # level 1 climax with the autopilot
python test/shot.py full 0.6     # whole level 1 with the autopilot at skill 0.6 (LOW 960x540), prints balance stats
python test/shot.py level 3      # eight shots along level 3 (or: level 3 2000 4400 for chosen route positions)
python test/shot.py lboss 2 [god|nogod]   # level 2 boss with the autopilot
python test/shot.py lfull 4 0.25 "{hull:2,shield:1}"   # whole level 4, bot skill 0.25, with upgrades granted
python test/shot.py hangar       # wallet, hangar purchases, level select, a boss win, results, phone hangar
python test/shot.py modes        # scatter / beam / flak / cannon in level 1
python test/shot.py mobile       # 390x844 portrait and 844x390 landscape, real CDP touch: drag aim, FIRE, LOCK, MODE, pause
python test/shot.py quality      # LOW / MEDIUM / HIGH / MAX on the same frame
python test/shot.py card 700     # 800x560 MAX shot with the HUD hidden (arcade card)
python test/shot.py js "SR.level(3)" "SR.start({level:3})" "SR.skip(2600)" "SR.step(4)" "shot:name" "SR.state()"
```
Screenshots go to `test/out/` (ignored by `.gitignore`). The harness serves this folder on port 8766 (`SR_PORT` to change, so
several runs can go in parallel) and runs Chrome with SwiftShader. In `?test` mode the sim only advances through `SR.step()`
and only renders on `SR.render()`.
`SR`: `start({level, seed, s})`, `step(sec)`, `render()`, `state()`, `stats()`, `setAim(nx, ny)`, `aimAt(id)`, `fire(on)`,
`lock(on)`, `targets()`, `spawn(kind, x, y, dz, opt)`, `skip(s)`, `boss()`, `god(on)`, `autopilot(on, acc)`, `setQuality(0-3)`,
`hud(on)`, `menu()`, `pause(on)`, `input(o)`, `info()`, `eval(src)`; campaign: `level(n)`, `camp()`, `wallet(n)`, `unlock(n)`,
`buy(id)`, `grant({rate: 2, shield: 1, beam: 1, ...})`, `mode(id)`, `cycle(dir)`, `hangar(n)`, `levels()`, `resetCamp()`.
URL flags (tests only): `?test`, `&q=low|medium|high|max`, `&touch`, `&msaa=N`, `&nohdr`, `&save`.

## Arcade card and release
- `game.json` holds the card text; `art/card.webp` (800x560, HUD hidden, from `python test/shot.py card 700`) is the gameplay
  shot for the lobby card. The release step copies it to `assets/arcade/salvagerun.webp` and adds the `<article class="game-card">`
  in the root `index.html` (root files, so not done from this folder).
- Built in cloud sessions without a shell on the PC: files are written into this folder through the desktop bridge and
  `commit-salvagerun.cmd` commits only `salvagerun\` (plus the CLAUDE.md / README rows through `docs-rows.py` when those files
  have no other pending edits), pushes main with pull --rebase retries, then deletes itself.

## Findings
- A cubemap bake makes a dense splat nebula free at run time: absorption commutes (`dst *= 1 - a`) and emission commutes
  (`dst += c`), so drawing all emission then all dust needs no sorting, and keeping transmittance in alpha lets the sky shader
  dim procedural stars behind dust lanes. Rotating the lookup per level gives each level a different sky from one bake.
- Rail coordinates (lateral, vertical, route s) make an on-rails level easy to script on a curved route: spawn 360 m ahead,
  give a lateral velocity that reaches the lane at arrival, and test hits in world space.
- Static scenery keyed by route position and sorted per template gives one instanced draw per template for any window of the route.
- ACES plus gamma turns a saturated orange paint yellow under a strong sun; keep paint darker and redder and exposure below 1.
- Panel lines and window grids in template space become giant stripes on big scaled hulls; scale the pattern by the instance scale.
  The same goes for organic veins: on a 330 m cavern they turned into blotches until big shells used world-sized noise.
- Thin bright emissive lines at a high frequency along a tunnel alias into radial streaks at grazing angles; keep the
  along-tunnel frequency near the around-tunnel one and the emission low.
- A hashed screen-door fade at the draw-window edge read as speckled rocks; shrinking each instance about its centre is invisible.
- The bot first died early because it chased salvage while rocks hit the tug; prioritising objects on a collision course
  (the same `isDanger` test that draws the red brackets) made a slow bot survive. Balance with that in mind.
- Avoid name clashes in radio keys: the boss line once played in zone 1 because both used `core`.
- Resetting a state object by deleting all its keys also deleted its hook functions (`BOSS.onHit` / `onKill`); skip functions.
- When the tug's frame is already moved by the boss pull, moving the camera by the pull again put the camera in front of the tug
  (a level 1 bug from the first build, visible late in Grabby's pull).
- An IK arm must test hits with its constrained end point, not the spring target it chases, or it hits from 80 m away.
- A boss whose weak points show only in short windows (the Gulper's gills) needs those windows long and slow: it now hangs near
  the top of each leap, which halved the fight.
