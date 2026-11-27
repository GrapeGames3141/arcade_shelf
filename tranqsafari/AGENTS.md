# Tranq Safari: agent notes

On-rails dinosaur shooter. You ride shotgun in an open jeep through a prehistoric valley with a tranquilizer dart
rifle; Dot, the NPC driver, drives and talks over the intercom (and Base over the radio). Nothing is killed: darted
animals stumble and doze off, with Zzz over their heads. One level of about 3.5 minutes: practice boards at the gate,
raptors in tall grass, a long-neck stepping over the road, a raptor pack in a fern forest, gliders diving in a gorge,
a stampede crossing, and Rumblejaw chasing the jeep down a riverbed until enough darts put it to sleep.

`tranqsafari.html` is generated: **edit `parts/*`, then run `python build.py`.** No other build step.
Test API: `window.TS`. Headless harness: `python test/shot.py <scenario>` (see the test recipe).

## File map (parts/)
| file | what |
|---|---|
| `shell.html`, `style.css` | page skeleton, HUD (score, combo, jeep health, darts, boss bar, radio captions, touch buttons), loading, title, pause and results cards |
| `00-util.js` | math, seeded RNG, value noise and fbm, vec3 helpers, column-major `M4` (incl. `pt4`, `basis`), `eulerYPR`, `SAVE` (localStorage in try/catch), `tlog` |
| `10-gl.js` | WebGL2 context, `QUALITY` tiers, frame UBO generated from `FRAME_FIELDS`, `program()` (adds `#define`s before the shared GLSL), HDR MSAA targets, bloom chain, shadow map, `MeshB` mesh builder |
| `11-shaders.js` | shared GLSL (`toLin`, noise, `fogCol`, `skyBase`, `hemi`, `fogApply`, PCF `shadowAt`), sky (clouds, ridges, smoking volcano), terrain, splats, meshes, skinned creatures (eyes and lids drawn from bind space), water, particles, bloom and ACES post |
| `20-path.js` | course spline (`CTRL`, `ELEV`), `SECTIONS`, `SPEEDS`, `PATH` (1 m samples, grid-accelerated `nearest`, `at`, `world`), `terrainH(x,z)` (one height function for mesh, plants, animals and darts), `waterY` |
| `21-world.js` | 48-byte `SplatBuf`, terrain tiles (2/4/8 m spacing with skirts), vegetation (grass blades, ferns, tree ferns, cycads, conifers, broadleaf, bushes, reeds, litter), rocks and trunks per chunk, river strip, gate and outpost props |
| `30-sdf.js` | round cones and oriented ellipsoids, smooth union, narrow-band surface nets, skin weights from primitives, `creatureVAO`, `Rig`, `fk` |
| `31-dinos.js` | species: `theropod()` (raptor, crestrunner, Rumblejaw), `quadruped()` (hornback, long-neck), `pterosaur()` (body plus explicit skinned wing membranes); `painter()` vertex colours; darts needed, scores, weak spots, hit capsules |
| `32-pose.js` | procedural poses: biped run, crouch, leap, cling, stumble, doze on the side; quad trot/amble, lie on the belly; glider flap, glide, dive, fold; root transform rotates about the hip and lowers for lying; `actorCapsules`, `headPos` |
| `40-actors.js` | `ATTACH` points on the jeep, `DIFF` table, behaviours: raptor (hide, run, leap, cling, climb in, fall off, doze), glider (perch, circle, dive, flee, fall), long-neck (walk tied to the jeep's progress), herd crossers and chargers, Rumblejaw (enter, chase, windup, lunge, flinch, stagger, collapse, give up); `doseActor` |
| `50-game.js` | `G`, `JEEP` on rails (pitch/roll from four wheel heights), sim-time `later()` timers, radio queue, scoring and combo, lock-on darts, ray casts, particles, practice targets, timeline (`buildTimeline`), herd spawner, duct-tape repairs, results, test autopilot |
| `60-audio.js` | procedural WebAudio: engine, wind and river beds, rifle, creature calls, Rumblejaw roar and stomps, snoring, radio squelch, marimba music (drums in the chase); optional `speechSynthesis` radio voice |
| `70-input.js` | mouse (absolute aim, click fire, right click reload), keyboard (arrows/WASD aim, Space/F fire, R reload, Esc/P pause, M mute), touch (drag anywhere = trackpad aim, FIRE and RELOAD buttons), gamepad |
| `80-render.js` | camera (seat, aim parallax, look-back for the chase, portrait FOV), jeep/driver/rifle/dart/target models, frustum culling, splat chunk drawing, shadow pass, scene pass, bloom, final pass |
| `90-main.js` | HUD overlay canvas (reticle, threat rings and edge arrows, cling timer, popups, Zzz), settings, menus, menu backdrop, main loop with adaptive scale on HIGH, boot, `window.TS` |

## Course and timing
- 2600 m path. Sections (`SECTIONS`, blended over 60 m): gate 0, grass 90, meadow 440, fern forest 625, gorge 1000, plain 1290, river 1640, outpost 2500.
- Target speeds (`SPEEDS`, m/s): 5.5-7 at the gate (3.2 s idle at the start), 13 grassland, 4.2 under the long-neck (500-570), 12.5 forest, 12 gorge, 13 plain, 9.5 through the stampede (1445-1580), 13.5 river, stop at 2600.
- Timeline (`buildTimeline`, keyed to jeep distance): raptor waves at 110, 190, 270, 360 (1, 2, 3, 2 raptors), long-neck spawned at 436 crossing at 540, raptor waves at 640, 720, 800, 880, 950 (2-4), glider waves at 1010, 1085, 1165, 1235 (2-3), herd 1300-1600 with chargers at 1350, 1410, 1465 (2), 1525, Rumblejaw at 1655, helper raptors at 1900 and 2250, gliders at 2080, Rumblejaw gives up at 2470.
- Duct tape repairs: +12 at 600, 990 and 1290, +15 at 1630 (never above 100).
- Measured headless (`test/shot.py run`, 2026-11-27; the bot only fires when the reticle ray is on an awake animal, so it never misses):
  perfect aim, Normal: 195 s, 87,985 darting points, no damage, Rumblejaw asleep at about s = 2030 (45 s into the chase);
  aim error 0.06 and 0.45 s reaction lag, Normal: 203 s, health 48 (gliders 7 hits, chargers 2); same bot on Hard: 200 s, health 58;
  aim error 0.1 and 0.6 s lag on Easy: 212 s, health 62, 36,680 points. At 13.5 m/s the river gives about 60 s before the outpost.

## Rifle, darts and scoring
- Magazine 6, reload 1.35 s (R, right click, RELOAD button, gamepad X/RB/LB; firing an empty rifle starts it), 0.22 s between shots (hold to keep firing).
- Darts lock on at fire time: the ray from the camera through the reticle is tested against every animal's capsules (aim assist widens them by 0.06 m for mouse, 0.16 m for touch and gamepad); the hit stores the bone and bind-space point, and the dart flies at 150 m/s to that moving point. Aimed shots always land; a dart that hits nothing sticks in the ground and counts as a miss.
- Dose: body 1, weak spot 2 (Rumblejaw 3). Darts needed: raptor 1, glider 1, crestrunner 2, hornback 4, long-neck 18, Rumblejaw 50. Weak spots: heads (hornback, crestrunner, long-neck, glider, raptor), Rumblejaw's throat under the jaw.
- Points: hit 25, weak spot +50; doze bonus raptor 100, glider 150, crestrunner 80, hornback 250, long-neck 1000, Rumblejaw 5000; close call (raptor darted while clinging) +100, stopped charger +100, interrupted bite +150; practice boards 60, bullseye 150. Everything is multiplied by the combo multiplier `1 + floor(combo / 4)`, capped at x5. A miss or jeep damage resets the combo.
- Final score = darting score + accuracy x 2000 + jeep health x 15 (no health bonus if the jeep is disabled). Ranks: S 55,000, A 35,000, B 20,000, C 10,000. Best score in localStorage `tranqsafari.best`.

## Threats and difficulty
- Jeep health 100. Damage: raptor climbing in 10, glider dive 7, hornback ram 15, Rumblejaw bite 20, times the difficulty factor (Easy 0.6, Normal 1, Hard 1.35). A raptor clings for 2.7 / 2.05 / 1.45 s before it climbs in; the first raptor gets 1.6x. Rumblejaw closes 0.8 / 1 / 1.2 times as fast and winds up for 1.05 s divided by that factor.
- Raptors hide crouched in the grass until the jeep is within about 38 m, run beside the jeep (up to jeep speed + 9 m/s) for at least `runT` (1.6-2.8 s), then leap 0.62 s onto an attach point: hood left/right, fender left/right, rear left/right (rear only in the chase, when the camera faces back). Attach points must be reachable with aim parallax: the fender-left point was moved forward to (1.15, 0.98, -0.96) after the analysis in the findings below.
- Gliders circle 34 m ahead at 18-28 m, then dive at the camera with homing (14 m/s rising to 26 m/s); a darted glider glides down and dozes where it lands.
- Herd crossers run across the road at 7-12 m/s and wait if the jeep is about to pass their lane; chargers wait 55 m ahead and charge the jeep's predicted position, slowed by up to 45 % as darts build up.
- Rumblejaw: bursts out of the left bank at 1655, roars, the camera turns to face backward (the eye moves to kneel on the seat). It follows the path behind the jeep at a gap that eases toward 9.5 m, weaving +/-4.5 m; inside 12.5 m it winds up (roar, throat exposed) and then lunges. Three dose during the windup or lunge interrupts it; it staggers back at 34 % and 67 % and collapses into the river at 100 %. If the jeep reaches 2470 first, it gives up and the result is "Made it out".

## Look
- Painterly splats for soft things: grass blades (camera-facing about their axis, base anchored, tip sway, lean away from the jeep), pinnate fern fronds, tree-fern and cycad crowns, conifer whorls and broadleaf crowns as lobed daubs, bushes, reeds, litter. Splats are lit per splat in the vertex shader (including the shadow lookup), so a daub is fully lit or fully shaded.
- Lit meshes for hard things: terrain tiles with brush-noise and rut colouring, rocks, trunks, the jeep and Dot, the rifle, darts, practice boards. Creatures are signed-distance bodies meshed with surface nets at start-up (two LODs), skinned with two bones per vertex and lit with scales, countershading, stripes or spots and crisp bind-space eyes whose lids close as the animal gets sleepy.
- HDR: RGBA16F 4x MSAA target, one PCF sun shadow map following the camera (canopy splats cast on HIGH and MAX), ACES, five-level bloom, vignette, a canvas-weave overlay.

## Quality tiers (`QUALITY` in `10-gl.js`; Pause or title card buttons, saved in `tranqsafari.quality`)
| tier | DPR cap | render scale | MSAA | shadow map | bloom | splat fill | draw distance | notes |
|---|---|---|---|---|---|---|---|---|
| LOW | 1 | 0.7 (0.63 on touch) | none, hashed dither | none | off | 32 % | 260 m | distant fill thinned further |
| MEDIUM | 1 | 0.85 (0.77 on touch) | 4x | 1024, 3x3 PCF | on | 60 % | 330 m | default on touch; distant fill thinned |
| HIGH | 1.5 | adaptive 0.62-1 | 4x | 2048, 3x3 PCF, canopy | on | 100 % near, thinned from ~120 m to 40 % at ~270 m | 420 m | default on desktop; carries the smoothing measures |
| MAX | 2 | 1 | 4x | 4096, 5x5 PCF, canopy | on | 100 % everywhere | 480 m | nothing traded away |

All tiers use the same generated world (about 485k splats); a tier only changes how much of each chunk is drawn, so switching never regenerates anything.

## Test recipe (headless)
- `python test/shot.py <scenario> [--q 0-3] [--out DIR] [--flags "&dbg=shadow"]` (Python Playwright + SwiftShader, serves this folder on 127.0.0.1:8766, writes PNGs to `test/out/`):
  `basic` (every set piece), `mobile` (412x860 portrait and 860x412 landscape with `&touch`), `run` (full autopilot run, `--diff N --err E --lag S`), `studio` (each creature alone in several poses), `boss`, `moments` (raptor on the hood, glider dive, charger, Rumblejaw windup, asleep), `quality` (all four tiers), `live` (real page without `?test`: rAF loop, audio init, mouse fire, right-click reload, pause menu, quality change), `card` (800x560 card frames, HUD hidden), `js "<expr>" ... shot:name`.
- `node test/geo.js [outdir]` builds every creature mesh in Node and writes OBJ files; `python test/preview.py <dir> <out.png>` renders them (side, front, below, three-quarter) with numpy. `python test/sheet.py out.png <width> a.png b.png ...` tiles screenshots.
- URL flags (tests only, never needed by players): `?test` (no auto loop; the sim advances only through `TS.step`), `&seed=N`, `&q=low|medium|high|max`, `&scale=1` (pins the render scale), `&touch` / `&desktop`, `&dbg=shadow` (terrain shows the shadow test).
- `window.TS`: `ready`, `state()`, `step(sec)`, `render()`, `start({diff, s})`, `menu()`, `skipTo(s)`, `aim(x, y)` (reticle in NDC), `aimAt(id, weak)`, `fire()`, `reload()`, `actors()`, `spawn(kind, opt)`, `autopilot(on, err, greedy, lag)`, `setQuality(i)`, `cam(eye, at, fov)` (null clears), `hud(bool)`, `studio(species, pose, view)`, `log()`, `clearLog()`, `perf()`, `_eval(src)`.
- Boot in SwiftShader takes about 5 s (creature meshes 3.5 s, world 1.1 s); a frame renders in 0.3-0.4 s there.

## Findings worth reusing (not yet copied into SPLAT-GUIDE.md)
- **Defines go before the shared GLSL.** `#ifdef LIT` in the common chunk was evaluated before `#define LIT` (which was appended after it), so every program silently compiled the shadow-free fallback. Prepend stage defines right after `#version`/precision, then the frame block and common code. A debug flag that paints the shadow test onto the terrain found it in one screenshot.
- **`vertexAttribPointer` captures the bound ARRAY_BUFFER.** Re-pointing a splat VAO at a chunk offset per draw needs `bindBuffer(ARRAY_BUFFER, vb)` first; otherwise the pointers read whichever buffer was bound last and nothing draws.
- **Linearise authored colours.** Palette values written as sRGB-like numbers and lit as linear made the whole frame milky after ACES and gamma. `toLin(c) = c*c*(0.3+0.7c)` on every albedo, with light colours tuned afterwards, restored saturation and contrast.
- **Lock-on darts.** Store the bone index and the bind-space point under the reticle at fire time, fly the dart to `skin[bone] * local` every frame, and resolve the hit on arrival. Moving targets need no lead, the dart sticks where it hit, and only shots that were off target miss.
- **A crossing timed to the rails.** The long-neck's walk is `u = (s_jeep - s_cross) * 0.2 + u0`, so the jeep always passes under its belly between the front and hind legs. Check clearance headless (minimum distance from jeep sample points to the leg capsules): the first timing left -0.13 m; centring the leg gap on the road gave 0.29 m with the capsules' inflation.
- **Reachable attach points with aim parallax.** When the camera turns by `turn(n)` for reticle position `n`, a target at angle `a` can only be aimed at if `tan(a - turn(n)) / tan(hfov / 2) = n` has a solution with `|n| < 1`. A raptor on the left fender at 65 degrees had none on a 16:9 screen; moving it to 53 degrees fixed it, and portrait screens get a larger turn (0.75 rad).
- **Prefix thinning for splat quality.** Sort each chunk's splats as core (trees, ferns) first, then fill (grass, litter) in random order; drawing `core + fill * fraction` is a quality and distance LOD with no regeneration.
- **Sim-time timers.** `setTimeout` never fires under `TS.step`, so the look-back camera and delayed popups use `later(dt, fn)` driven by `G.time`.
- **Cheap creature eyes.** Draw eyes in the skinned fragment shader from the bind-space position (sphere around a per-species eye point mirrored on z): iris, pupil, rim and an eyelid line that lowers with sleepiness. They stay crisp at any mesh resolution.
- **Jeep interior from the passenger seat.** Small dashboard props near the eye loom large (a 26 cm radio box covered a fifth of the screen); keep props within about 5 degrees of the bottom edge, and move the eye (kneel on the seat) when the camera turns to face backward so the roll bar does not frame the view.

## Delivery history
- 2026-11-27: first build, made in a scheduled cloud session without folder access or a shell on the PC. Delivered as `tranqsafari.zip` (extract into `E:\html games`), with `commit-tranqsafari.cmd` (commits only this folder, adds the CLAUDE.md and README rows through `docs-rows.py` only when those files have no other pending edits, pulls with rebase and retries on a rejected push).
- Private playable copy: claude.ai artifact https://claude.ai/artifact/Md8bSmG8w4HFUNo2TuxVhu (icon "game"). To republish after a rebuild, run `python make-artifact.py out.html` (strips the outer document tags and charset/viewport metas, which the artifact skeleton supplies, and pins a dark colour scheme) and publish that file to the same URL. The Arcade Shelf buttons hide themselves outside the arcade (`window.claude`, claude hostnames, `blob:`).
- Arcade card art: `art/tranqsafari-card.webp` (800x560, long-neck crossing from the passenger seat, HUD hidden; `game.json` names it as `screenshot`). The root lobby card (`assets/arcade/tranqsafari.webp` plus an `<article class="game-card">` in the root `index.html`) is not added yet because those are shared root files; copy the card art there in a session that may edit them. `art/shot-raptor-on-hood.webp` and `art/shot-jeep-outside.webp` are extra screenshots.
