# Salvage Run — agent notes

On-rails space shooter. You're the gunner on the junky salvage tug *Second Mortgage*; Gus flies a fixed route through a ship
graveyard, an asteroid belt and an ice ring, then stops at the wreck of the *Corvina Sunrise*, where Old Grabby (a tentacled
creature) lives. The player only aims and fires: twin rapid-fire cannon plus a lock-on volley (sweep up to 8 targets, release to
launch homing missiles). Score is credits. One level of about 3.5 to 4 minutes, results screen with rank, retry.

`salvagerun.html` is generated: **edit `parts/*`, then run `python build.py`.** No other build step, no external files.
Test API: `window.SR`. Headless harness: `python test/shot.py basic|zones|boss|full [acc]|mobile|quality|card [s]|js "<expr>" ...`.
Design and the calls made in the first (unattended) build are in `notes.md`.

## File map (parts/)
| file | what |
|---|---|
| `shell.html`, `style.css` | page skeleton, HUD, radio box, boss bar, touch buttons, menu / how-to / pause / results screens |
| `00-util.js` | URL flags (`TEST`), math, seeded RNG (`rnd` sim, `frnd` effects), value noise, quaternions, `instMat` (3x4 rows), mat4, `SAVE` (localStorage in try/catch) |
| `10-gl.js` | WebGL2 context, `QUALITY` tiers, `compile()`, HDR render targets (MSAA RGBA16F -> resolve -> bloom chain), sun shadow map, canvas sizing with DPR cap, pixel budget and adaptive scale |
| `15-shaders.js` | all GLSL: instanced lit mesh (materials, PBR-ish sun + 16 point lights + PCF shadows + haze), shadow, sky (stars, band, nebula cubemap, sun, gas giant with rings), splats, particles, motes, bloom down/up, composite (ACES, vignette, CA, grain) |
| `20-meshes.js` | `Geo` builder and primitives, icosphere blobs, every mesh template (rocks, ice, plates, girder, pod, drone, core, mites, tug, turret, missile, gem, kit, wreck parts, creature parts), shared VBO/IBO upload, dynamic VAO for tentacles |
| `22-batch.js` | per-frame instance batching (`inst`) and static scenery (`sinst`) grouped by template and sorted by route position, drawn as a window |
| `25-splats.js` | 48-byte splat records (SPLAT-GUIDE layout), nebula generation and cubemap bake, local gas / dust / ice glitter along the route, speed motes, particle pool (SoA), `FX` presets, short-lived point lights |
| `30-route.js` | route spline and rail frames (`railFrame`, `railToWorld`, bank), `ZONES`, `ENV` per zone (blended by `envAt`), speed profile, scenery (derelicts, fly-through hull, belt rocks, ice ring band, the Corvina Sunrise) |
| `40-entities.js` | `KINDS` table (hp, damage, points, salvage), spawning, rail / world / host / swarm / manual spaces, critters, splitting, salvage pickups, debris, `isDanger`, damage and kill rules |
| `45-boss.js` | Old Grabby: tentacles (sprung tip + Bezier spine + travelling waves, tube mesh rebuilt each frame), nodes, head, eyes, core, attacks, pull, death and jackpot |
| `50-weapons.js` | projection helpers, aim assist, turret, bolts, lock-on sweep, missiles (homing, retarget), drawing |
| `60-game.js` | game state `G`, tug motion, chase camera, hull, scoring (combo + volley chain), radio lines (`LINES`), level script `EV`, ambient spawns, `step()`, results |
| `70-audio.js` | procedural WebAudio effects, step-sequencer music (cruise / boss / menu), optional speech-synthesis pilot voice |
| `80-input.js` | `SET` (settings), mouse (right-button or hold-left lock), keyboard, touch (relative drag + FIRE / LOCK / AUTO), gamepad |
| `85-render.js` | `renderFrame()`: shadow pass, sky, static + dynamic meshes, tentacles, gas splats, motes, particles, MSAA resolve, bloom, composite |
| `90-main.js` | 2D HUD overlay (reticle, lock and danger brackets, popups), DOM HUD, settings UI, screens, autopilot bot, main loop, boot, `window.SR` |

## Rules and tuning
- Route: Catmull-Rom through 20 points, resampled every 2 m, frames by parallel transport with a little bank in turns.
  Zones by arc length: graveyard 0-2300, belt 2300-4600, ice 4600-6700, approach 6700-7300; the tug stops at `S_STOP` 7300,
  the wreck sits at `S_BOSS` 7440. Speed 44 / 47 / 45 m/s, easing in over 140 m and down to 6 m/s before the stop.
- Spawns use rail coordinates (lateral x, vertical y, route z) 360 m ahead (`LEAD`). `aim` gives a velocity that brings the
  object into the lane at arrival. Ambient trickle every 48-80 m, one third aimed at the lane.
- Tug collision sphere 3.6 m; an object hits when its centre comes within 0.72 x its radius + 3.6 m.
- Hull 100. Damage: rock L/M/S 18/10/5, ice the same, ore 12, frozen pod 12, plate 9, girder 14, engine core 20, mite 4,
  bile glob 8, thrown plate 10, tentacle slap 14, chomp 22. Patch kit +15 (about 1 in 5 cargo pods); at full hull it pays 200 x combo.
- Cannon 11 shots/s, bolts 720 m/s, 1 damage, aim assist picks the target within 18 px (30 px on touch) and leads it.
- Volley: up to 8 locks, a target can take more locks while hp - pending > 0 (a missile does 4), re-lock gap 0.16 s,
  lock pad 30 px (44 px touch), cooldown 0.35 s. Missiles launch from the side pods 50 ms apart, ramp to 340 m/s,
  turn rate 3 + 16 x age rad/s, forced hit at 1.9 s, retarget within 160 m if the target dies.
- Scoring: points x combo multiplier x chain factor. Combo: +1 per kill, window 2.6 s, multiplier 1 + floor(combo / 6) up to 8,
  reset by a hull hit. Chain: k-th kill of one volley x k (cap 8); 8 kills = FULL HOUSE +1000 x combo.
  Salvage gems pay value x combo when they reach the tug. End: +25 per hull point and +5000 for Old Grabby (wins only).
- Points: rock S/M/L 15/30/60, plate 30, girder 50, mite 40, core 100 (+6 gems x 50, 30 m blast), pod 5 gems x 50,
  drone 3 x 50, ore 40 + 4 x 40, frozen pod 30 (releases a pod), node 300, eye 500, core 3000, jackpot 40 gems x 125.
- Boss: nodes 6 hp (3 per tentacle), eyes 12 hp (closed eyes take no damage), core 64 hp; pull bar 13 s; phase timings in `45-boss.js`.
- Ranks (wins): S 400k, A 280k, B 180k, C 100k, else D. Best score in localStorage `salvagerun.best`.
- Settings in localStorage `salvagerun.quality|sound|music|voice|lockMode|auto|sens`. In `?test` mode nothing is saved
  (add `&save` to allow it).

## Measured headless (`test/shot.py full <acc>`, LOW, 960x540, 2026-11-27, final build)
The bot aims at 2400 x acc px/s, reacts (1 - acc) x 0.6 s late on each new target and wobbles by (1 - acc) x 26 px.
It shoots threats on a collision course first (`isDanger`), then salvage, and sweeps a volley when 3+ targets are on screen.
| bot skill | result | score | hits / damage | run time | best chain / full houses |
|---|---|---|---|---|---|
| acc 0.6 | win | 469,155 (S) | 1 / 4 | 3:41 | 11 / 9 |
| acc 0.25 | win | 236,905 (B) | 10 / 41 (9 mites, 1 ice shard) | 3:49 | 11 / 6 |
Before tuning, hull mites did almost all the damage (14 of 18 hits on a slow bot that died in the belt); they now leap at
29-31 m/s with a weaker turn (1.9) and a 1.7 m hit radius. The pre-boss route takes about 2:50; the boss 35-60 s.
The bot knows exactly what is on a collision course, so people will take more hits than these numbers suggest; the red danger
brackets are the human version of that knowledge. A chain can pass 8 when an engine-core blast set off by a volley missile
takes more targets with it.

## Renderer notes
- HDR: everything renders into an MSAA RGBA16F target (RGBA8 fallback without EXT_color_buffer_float), resolved with
  `blitFramebuffer`, then a 13-tap downsample / tent upsample bloom chain (4-7 levels), then ACES in the composite.
- Nebula: ~5k-15k painterly Gaussian splats (lobed edges, SPLAT-GUIDE "ragged daubs") on a 1 km shell, plus dark dust splats,
  baked once into a cubemap (emission additive, dust multiplicative `dst *= 1 - a`, transmittance kept in alpha, mipmapped).
  The sky pass draws stars x transmittance + emission, so dust lanes dim the stars behind them. Zero per-frame splat cost.
- Local gas: 1.3k-3.2k world-space splats along the route (plumes, belt dust, ice-ring haze sheets, twinkling glitter), sorted
  by route position and drawn as one contiguous range around the tug; they fade out near the camera and at 1.5 km.
- Meshes: one shared VBO/IBO; per-frame instances (20 floats: 3x4 rows, colour + material, params) packed per template and drawn
  with `drawElementsInstanced`; static scenery grouped per template, sorted by route key and drawn as a window (-450 m .. +1700 m).
  Far instances shrink to nothing between 78% and 100% of the fade distance (no pop, no dither).
- Materials are procedural in the fragment shader from template-space position (rock grain + ore veins, faceted ice with fresnel
  and inner glow, painted metal with world-scaled panels, rust and lit windows, hazard stripes, organic skin with glowing veins and
  suckers, creature eye). Normals are perturbed with screen-space derivative bump mapping (`bumpN`).
- Shadows: one orthographic sun map following the tug (texel-snapped), 1024/2048/4096, PCF 3x3 or 5x5 on MAX.
- Tentacles are tubes (32 rings x 16 sides) rebuilt on the CPU each frame into a dynamic VAO that shares the mesh program
  (`uUseUV` switches the organic texture to UV space so suckers stay attached).

## Quality tiers
LOW: 0.75 render scale, DPR 1, no MSAA, no shadows, 4 bloom levels, 320 px nebula, 35% field. MEDIUM: DPR <= 1.25, MSAA 4,
1024 shadows, 512 px nebula, 60% field. HIGH (smoothing): DPR <= 2 under a 3.4 MP pixel budget, adaptive render scale 0.6-1.0
by frame time, 2048 shadows, 768 px nebula, 80% field, 3x3 PCF. MAX: native DPR, MSAA up to 8, 4096 shadows with 5x5 PCF,
1024 px nebula, full field and gas, 7 bloom levels; nothing traded away. Changing quality rebuilds targets, nebula and scenery.

## Test recipe
```
python build.py
python test/shot.py basic        # menu, first 35 s with the autopilot (desktop 1280x720)
python test/shot.py zones        # one shot per set piece (graveyard, tunnel, swarm, belt, squeeze, ice, storm, approach)
python test/shot.py boss         # skip to the climax, autopilot through all phases to the results
python test/shot.py full 0.6     # whole run with the autopilot at skill 0.6 (LOW 960x540), prints balance stats
python test/shot.py mobile       # 390x844 portrait and 844x390 landscape, real CDP touch: drag aim, FIRE, LOCK, pause
python test/shot.py quality      # LOW / MEDIUM / HIGH / MAX on the same frame
python test/shot.py card 700     # 800x560 MAX shot with the HUD hidden (arcade card)
python test/shot.py js "SR.start({seed:1})" "SR.skip(3600)" "SR.step(4)" "shot:name" "SR.state()"
```
Screenshots go to `test/out/` (ignored by `.gitignore`). The harness serves this folder on port 8766 (`SR_PORT` to change)
and runs Chrome with SwiftShader. In `?test` mode the sim only advances through `SR.step()` and only renders on `SR.render()`.
`SR`: `start({seed, s})`, `step(sec)`, `render()`, `state()`, `stats()`, `setAim(nx, ny)`, `aimAt(id)`, `fire(on)`, `lock(on)`,
`targets()`, `spawn(kind, x, y, dz, opt)`, `skip(s)`, `boss()`, `god(on)`, `autopilot(on, acc)`, `setQuality(0-3)`, `hud(on)`,
`menu()`, `pause(on)`, `input(o)`, `info()`, `eval(src)`. URL flags (tests only): `?test`, `&q=low|medium|high|max`, `&touch`,
`&msaa=N`, `&nohdr`, `&save`.

## Arcade card and release
- `game.json` holds the card text; `art/card.webp` (800x560, HUD hidden, from `python test/shot.py card 700`) is the gameplay
  shot for the lobby card. The release step copies it to `assets/arcade/salvagerun.webp` and adds the `<article class="game-card">`
  in the root `index.html` (root files, so not done from this folder).
- First build 2026-11-27 was made in an unattended cloud session without access to `E:\html games`, delivered as a zip of this
  folder with `commit-salvagerun.cmd` (commits only `salvagerun\`, adds the CLAUDE.md / README rows through `docs-rows.py` when
  those files have no other pending edits, pushes main with pull --rebase retries, then deletes itself).

## Findings
- A cubemap bake makes a dense splat nebula free at run time: absorption commutes (`dst *= 1 - a`) and emission commutes
  (`dst += c`), so drawing all emission then all dust needs no sorting, and keeping transmittance in alpha lets the sky shader
  dim procedural stars behind dust lanes.
- Rail coordinates (lateral, vertical, route s) make an on-rails level easy to script on a curved route: spawn 360 m ahead,
  give a lateral velocity that reaches the lane at arrival, and test hits in world space.
- Static scenery keyed by route position and sorted per template gives one instanced draw per template for any window of the route.
- ACES plus gamma turns a saturated orange paint yellow under a strong sun; keep paint darker and redder (0.62, 0.19, 0.035) and
  exposure below 1 so the hero stays orange.
- Panel lines and window grids in template space become giant stripes on big scaled hulls; scale the pattern by the instance scale
  (`vS = length(row0.xyz)`) and use larger panels on big objects or distant hulls alias into noise.
- A hashed screen-door fade at the draw-window edge read as speckled rocks; shrinking each instance about its centre in the
  vertex shader is invisible at that range.
- The bot first died early because it chased salvage while rocks hit the tug; prioritising objects on a collision course
  (the same `isDanger` test that draws the red brackets) made a slow bot survive. Balance with that in mind.
- Avoid name clashes in radio keys: the boss line once played in zone 1 because both used `core`.
