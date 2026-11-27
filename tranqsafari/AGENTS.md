# Tranq Safari: agent notes

On-rails dinosaur shooter. You ride shotgun in an open jeep with a tranquilizer dart rifle; Dot, the NPC driver, drives
and talks over the intercom (and Base over the radio). Nothing is killed: darted animals stumble and doze off, with Zzz
over their heads. Two routes, picked with buttons on the title card:

1. **Valley Run** (morning, about 3.5 minutes): practice boards at the gate, raptors in tall grass, a long-neck stepping
   over the road, a raptor pack in a fern forest, gliders diving in a gorge, a stampede crossing, and Rumblejaw chasing
   the jeep down a riverbed until enough darts put it to sleep.
2. **Dusk Delta** (sunset into night, about 3 minutes): nipper packs in a cypress mire at sunset, long-necks wading on the
   mudflats, lava fields after dark where an armoured Clubtail blocks the road, then the Sailback swimming beside a
   sand bar across a moonlit lagoon. Headlights and a torch on the rifle come on as the light goes.

`tranqsafari.html` is generated: **edit `parts/*`, then run `python build.py`.** No other build step.
Test API: `window.TS`. Headless harness: `python test/shot.py <scenario>` (see the test recipe).

## File map (parts/)
| file | what |
|---|---|
| `shell.html`, `style.css` | page skeleton, HUD (score, combo, jeep health, darts, boss bar, radio captions, touch buttons), loading, title card (route, difficulty, quality, sound), pause and results cards (NEXT ROUTE button) |
| `00-util.js` | math, seeded RNG, value noise and fbm, vec3 helpers, column-major `M4` (incl. `pt4`, `basis`), `eulerYPR`, `SAVE` (localStorage in try/catch), `tlog` |
| `10-gl.js` | WebGL2 context, `QUALITY` tiers, frame UBO generated from `FRAME_FIELDS` (sun, sky, fog, two spot lamps, env), `program()` (adds `#define`s before the shared GLSL), HDR MSAA targets, bloom chain, light-shaft target, shadow map, `MeshB` mesh builder, `track()`/`RES` (GPU objects owned by the current world, freed on a route change) |
| `11-shaders.js` | shared GLSL (`toLin`, noise, `fogCol`, `skyBase`, `hemi`, `fogApply`, `lampAt`/`lamps` spot lamps with a soft knee, `bumpN` derivative bump, PCF `shadowAt`), sky (sun or moon disc, stars, clouds, ridges, volcano; alpha = open-sky mask), terrain (dirt, rock, wet and lava weights; lava channels from `lavaF`), splats (shapes 0-5), meshes, skinned creatures (bind-space eyes, eyeshine, wet hide below the water line), water (flow, murk, canopy reflection), particles, light shafts (`RAYS_FS`), bloom, ACES and grading |
| `20-path.js` | `SEC_DEF` (every section parameter and its default), `LEVELS[]` (spline `ctrl`, `elev`, `sections`, `speeds`, `water` regions, `light` keyframes, `cast`, `ranks`), `loadLevelDef(i)`, `PATH` (1 m samples, grid-accelerated `nearest`, `at`, `world`), per-metre `SEC_TAB`/`secAt`, `terrainH(x,z)` (one height function for mesh, plants, animals and darts: river ford, marsh, sea with sand bar, lava channels), `waterY`, `waterLevelS`, `lightAt(s)` |
| `21-world.js` | 48-byte `SplatBuf`, terrain tiles (32-byte vertices, 2/4/8 m spacing with skirts), plants (grass blades and tufts, ferns, tree ferns, cycads, conifers, broadleaf, palms, cypresses with hanging moss, snags, bushes, reeds, lily pads, litter), rocks, water (river strip, flat sheets on a 6 m grid refined near the road), props per route (gate and outpost; huts, lit marker posts, a ribcage, steam vents, the lighthouse station), `freeWorld()`, `buildWorld(level)` |
| `30-sdf.js` | round cones and oriented ellipsoids, smooth union, narrow-band surface nets, skin weights from primitives, `creatureVAO`, `Rig`, `fk` |
| `31-dinos.js` | species: `theropod()` (raptor, crestrunner, Rumblejaw, nipper, Sailback with sail and tail fin), `quadruped()` (hornback, long-neck, Clubtail with `armor` primitives and a tail club), `pterosaur()`; `painter()` vertex colours; darts needed, scores, weak spots, hit capsules (carry `weak` and `armor`); `ensureSpecies(ids)` builds meshes on demand |
| `32-pose.js` | procedural poses: biped run, crouch, leap, cling, stumble, doze, swim, rear; quad trot/amble, lie down, tail swing; glider flap, glide, dive, fold; `actorCapsules`, `headPos` |
| `40-actors.js` | `ATTACH` and `ATTACH_S` (small perches) on the jeep, `DIFF` table, behaviours: raptor and nipper (hide, run, leap, cling, climb in, fall off, doze), glider, long-neck (crossing tied to the jeep's progress; `wade`), herd crossers and chargers, Rumblejaw, `updClub` (roadblock), `updSail` (lagoon boss in jeep-relative coordinates); `doseActor` |
| `50-game.js` | `G`, `JEEP` on rails (roadblock gate `G.gate`, wading splashes), sim-time `later()` timers, radio queue, scoring and combo, lock-on darts, ray casts (armour, underwater parts, water surface), particles, practice targets, `timelineValley` / `timelineDelta`, herd spawner, duct-tape repairs, `ambientFx` (motes, fireflies, ash, embers, vents), results, test autopilot |
| `60-audio.js` | procedural WebAudio: engine, wind, river and night beds (crickets, frogs), rifle, creature calls, roars and stomps, armour plink, snoring, radio squelch, marimba music (lower root at night); optional `speechSynthesis` radio voice |
| `70-input.js` | mouse (absolute aim, click fire, right click reload), keyboard (arrows/WASD aim, Space/F fire, R reload, Esc/P pause, M mute), touch (drag anywhere = trackpad aim, FIRE and RELOAD buttons), gamepad |
| `80-render.js` | `LIGHT` (interpolated from the route's keyframes by distance), camera (seat, aim parallax, look-back for the river chase, look-side for the lagoon, portrait FOV), jeep/driver/rifle/torch/dart/target models, frustum culling, splat chunk drawing, shadow pass, scene pass, light-shaft pass, bloom, final pass |
| `90-main.js` | HUD overlay canvas (reticle, threat rings and edge arrows, cling timer, hints, popups, Zzz), settings, route picker (`pickRoute`, `loadRoute`), menus, menu backdrop per route, main loop with adaptive scale on HIGH, boot, `window.TS` |

## Level system
- A route is one entry in `LEVELS` (`20-path.js`). `loadLevelDef(i)` rebuilds `PATH`, `SECTIONS`, `SPEEDS`, `SEC_TAB`
  and sets `LEVEL`, `LV`, `COURSE_END`. Section parameters not listed in a section take `SEC_DEF` defaults, and
  neighbouring sections blend over 60 m.
- `buildWorld(level)` frees the previous world's GPU objects (everything created through `track()`), loads the level,
  builds missing creature meshes (`ensureSpecies(LV.cast)`), then terrain, plants, water and props. Boot builds only
  the saved route's cast; the other cast is built on the first switch behind the loading card.
- Water regions: `{kind:'river', s0, s1}` (ford that follows the road) or `{kind:'flat', s0, s1, y}` (level sheet:
  marsh or sea). `waterLevelS(s)` gives the surface height at a distance, or null.
- Light keyframes are keyed to distance: sun direction (`az`, `el`), `sun`, `sky`, `gnd`, `fog`, `fogD`, `glow`
  (sun glow in fog), `night` (stars, darker sky, volcano glow), `lamp` (headlights and torch), `rays` (light shafts),
  `exp` (exposure). Two keyframes 2 m apart with zero sun colour switch the sun's direction to the moon's.
- Adding a route: add a `LEVELS` entry, a `timelineX(at)` in `50-game.js` (selected in `buildTimeline`), props in
  `buildProps`, a menu backdrop branch in `menuScene`, a route button in `shell.html`, and a best-score key
  (`bestKey()` gives `best`, `best1`, ...).

## Route 1: Valley Run
- 2600 m path. Sections (blended over 60 m): gate 0, grass 90, meadow 440, fern forest 625, gorge 1000, plain 1290, river 1640, outpost 2500.
- Target speeds (m/s): 5.5-7 at the gate (3.2 s idle at the start), 13 grassland, 4.2 under the long-neck (500-570), 12.5 forest, 12 gorge, 13 plain, 9.5 through the stampede (1445-1580), 13.5 river, stop at 2600.
- Timeline (`timelineValley`, keyed to jeep distance): raptor waves at 110, 190, 270, 360 (1, 2, 3, 2 raptors), long-neck spawned at 436 crossing at 540, raptor waves at 640, 720, 800, 880, 950 (2-4), glider waves at 1010, 1085, 1165, 1235 (2-3), herd 1300-1600 with chargers at 1350, 1410, 1465 (2), 1525, Rumblejaw at 1655, helper raptors at 1900 and 2250, gliders at 2080, Rumblejaw gives up at 2470.
- Duct tape repairs: +12 at 600, 990 and 1290, +15 at 1630 (never above 100).
- Rumblejaw: bursts out of the left bank at 1655, roars, the camera turns to face backward (the eye moves to kneel on the seat). It follows the path behind the jeep at a gap that eases toward 9.5 m, weaving +/-4.5 m; inside 12.5 m it winds up (roar, throat exposed) and then lunges. Three dose during the windup or lunge interrupts it; it staggers back at 34 % and 67 % and collapses into the river at 100 %. If the jeep reaches 2470 first, it gives up and the result is "Made it out".

## Route 2: Dusk Delta
- 2500 m path. Sections: dock 0, mire 110 (cypress swamp, flat water at y 0.05, road on a causeway), flats 520 (open mudflats, shallow water), ember 920 (lava field on a 5.5-6 m plateau, burnt snags, steam vents), lagoon 1335 (sea at y 0, the road runs on a sand bar 3.6 m wide), station 2430 (lighthouse).
- Target speeds (m/s): 5-8 at the dock, 12.5 mire and flats, 11.5 ember fields, 13 lagoon, stop at 2500.
- Light: sunset from the start (sun 11 degrees up at the dock, 6 at 450 m, 2.5 at 800 m), gone by 990 m; moon up from 1051 m and full at 1340 m. Headlights and the rifle torch fade in from the dock to 990 m (a quarter strength at 450 m).
- Timeline (`timelineDelta`): nipper packs at 118 (5), 205 (7), 360 (6), 800 (6); gliders at 290, 640, 950; raptors at 360, 455, 725, 1000 (3), 1200; three wading long-necks spawned at 440 (bonus targets; 18 darts each); crestrunner herd 570-760; Clubtail spawned at 1075 standing at 1150 (jeep stops 7.6 m short), nipper harassment 4, 11 and 18 s into the block; Sailback at 1372; lagoon mop-ups: nippers at 1640 and 2120 (right-side perches only), gliders at 1880; Sailback gives up at 2395.
- Duct tape: +10 at 520, +12 at 905, +15 at 1260.
- **Nippers** (small theropods, 1 dart, 40 points): hide on the road shoulder, run 1.1-1.9 s, leap to one of ten small perches (`ATTACH_S`), cling 1.55 times as long as a raptor, bite for 4.
- **Clubtail** (14 dose, 400 points): stands across the road; `G.gate` holds the jeep (target speed `sqrt(2 * 3.6 * gap)`, hard stop at the gate). Shell, knobs and spikes are `armor` capsules: darts glance off ("DEFLECTED", a plink, no dose; the combo is left alone and it is not a miss, but the dart is spent and counts against accuracy). Head counts double, legs and tail count 1. It can be darted from as far as it can be seen, so a sharpshooter may put it to sleep before the jeep stops (the ROADBLOCK banner is skipped then). 2.4 s after the jeep pulls up, and every 3-4.4 s after that, it backs up 1.5 m and winds up for 1 s ("HEAD!"); 2 dose during the windup interrupts (+150), otherwise the club hits the jeep for 9. At 14 dose it stumbles off the road and dozes; after 26 s at the block it gives up and walks off.
- **Sailback** (72 dose, 5000 points, mouth counts triple): positions are (metres ahead of the jeep, metres to its right). Cycle: stalk 3-4 s with the sail above water (parts under water cannot be hit; darts stop at the surface with a plop), rise out of the shallows for 1.15 s ("MOUTH!"), lunge onto the bar (bite 15), recoil 1.7 s, dive (1.6 s fully under). Three dose during the rise or lunge interrupts (+150). It thrashes at 34 % and 67 % and at 100 % drifts asleep side-on, sail up. The camera turns right to keep it in view (`G.lookSide`).
- Rank bars for this route are a little lower (`ranks` in the level: S 50,000, A 32,000, B 18,000, C 9,000) because it has fewer targets.

## Measured runs (headless `test/shot.py run`, 2026-11-27; the bot only fires when the reticle ray is on an awake animal, so it never misses)
| route | bot | time | result |
|---|---|---|---|
| Valley | perfect aim, Normal | 196 s | 92,535, health 100, Rumblejaw asleep at s = 2049 |
| Valley | aim error 0.06, 0.45 s lag, Normal | 203 s | 67,565, health 70 |
| Delta | perfect aim, Normal | 165 s | 50,615, health 81, Sailback asleep at s = 1859 |
| Delta | aim error 0.06, 0.45 s lag, Normal | 176 s | 52,905, health 73 |
| Delta | aim error 0.1, 0.6 s lag, Easy | 182 s | 38,222, health 78 |
| Delta | aim error 0.06, 0.45 s lag, Hard | 187 s | 41,590, health 45 |
| Delta | aim error 0.14, 0.9 s lag, Normal | 186 s | 50,775, health 48 (two Sailback bites) |

Scores swing by 10,000-20,000 between runs of the same bot (runs are not seeded, and the 5,000-point boss bonus is
multiplied by whatever combo is standing at that moment). Every bot dozed the Clubtail before it swung; the swing is
covered by `dmoments`. A player who never puts the Sailback to sleep reaches the station after about 215 s.

## Rifle, darts and scoring
- Magazine 6, reload 1.35 s (R, right click, RELOAD button, gamepad X/RB/LB; firing an empty rifle starts it), 0.22 s between shots (hold to keep firing).
- Darts lock on at fire time: the ray from the camera through the reticle is tested against every animal's capsules (aim assist widens them by 0.06 m for mouse, 0.16 m for touch and gamepad; nippers get 0.07 m more); the hit stores the bone and bind-space point, and the dart flies at 150 m/s to that moving point. Aimed shots always land; a dart that hits nothing sticks in the ground and counts as a miss.
- Dose: body 1, weak spot 2 (Rumblejaw's throat and the Sailback's mouth 3). Darts needed: raptor, glider, nipper 1; crestrunner 2; hornback 4; Clubtail 14; long-neck 18; Rumblejaw 50; Sailback 72.
- Points: hit 25, weak spot +50; doze bonus nipper 40, raptor 100, glider 150, crestrunner 80, hornback 250, Clubtail 400, long-neck 1000, Rumblejaw and Sailback 5000; close call (darted while clinging) +100, stopped charger +100, interrupted bite or swing +150; practice boards 60, bullseye 150. Everything is multiplied by the combo multiplier `1 + floor(combo / 4)`, capped at x5. A miss or jeep damage resets the combo.
- Final score = darting score + accuracy x 2000 + jeep health x 15 (no health bonus if the jeep is disabled). Valley ranks: S 55,000, A 35,000, B 20,000, C 10,000. Best scores in localStorage `tranqsafari.best` (valley) and `tranqsafari.best1` (delta); the picked route in `tranqsafari.route`.

## Threats and difficulty
- Jeep health 100. Damage: raptor climbing in 10, nipper 4, glider dive 7, hornback ram 15, Clubtail swing 9, Sailback bite 15, Rumblejaw bite 20, times the difficulty factor (Easy 0.6, Normal 1, Hard 1.35). A raptor clings for 2.7 / 2.05 / 1.45 s before it climbs in; the first raptor gets 1.6x. Bosses and the Clubtail act 0.8 / 1 / 1.2 times as fast.
- Raptors hide crouched until the jeep is within about 38 m, run beside the jeep (up to jeep speed + 9 m/s) for at least `runT` (1.6-2.8 s), then leap 0.62 s onto an attach point: hood left/right, fender left/right, rear left/right (rear only in the river chase, when the camera faces back). Attach points must be reachable with aim parallax: the fender-left point was moved forward to (1.15, 0.98, -0.96) after the analysis in the findings below.
- Gliders circle 34 m ahead at 18-28 m, then dive at the camera with homing (14 m/s rising to 26 m/s); a darted glider glides down and dozes where it lands.
- Herd crossers run across the road at 7-12 m/s and wait if the jeep is about to pass their lane; chargers wait 55 m ahead and charge the jeep's predicted position, slowed by up to 45 % as darts build up.

## Look
- Painterly splats for soft things: grass blades and tufts (camera-facing about their axis, base anchored, base-to-tip gradient, tip sway, lean away from the jeep), pinnate fern fronds, tree-fern, cycad and palm crowns, conifer whorls and broadleaf crowns as lobed daubs, cypress moss, bushes, reeds, lily pads, litter. Splats are lit per splat in the vertex shader (including the shadow lookup), so a daub is fully lit or fully shaded.
- Lit meshes for hard things: terrain tiles with brush-noise, rut colouring, derivative bump, wet sheen near water and glowing lava channels; rocks, trunks, huts, the jeep and Dot, the rifle, darts, practice boards. Creatures are signed-distance bodies meshed with surface nets (two LODs), skinned with two bones per vertex and lit with scales (bumped), countershading, stripes or spots, crisp bind-space eyes whose lids close as the animal gets sleepy, eyeshine in lamp light, and a wet sheen below the water line.
- Light: HDR RGBA16F 4x MSAA target, one PCF sun shadow map following the camera (canopy splats cast on HIGH and MAX; skipped when the sun is down), screen-space light shafts from the sun or moon (the scene's alpha channel is an open-sky mask), two spot lamps (headlights, rifle torch that follows the reticle) on terrain, splats, meshes, creatures, water and particles, ACES, five-level bloom, contrast and split-tone grading, vignette, a canvas-weave overlay.

## Quality tiers (`QUALITY` in `10-gl.js`; Pause or title card buttons, saved in `tranqsafari.quality`)
| tier | DPR cap | render scale | MSAA | shadow map | bloom | light shafts | bump | splat fill | draw distance | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| LOW | 1 | 0.7 (0.63 on touch) | none, hashed dither | none | off | off | off | 32 % | 260 m | distant fill thinned further |
| MEDIUM | 1 | 0.85 (0.77 on touch) | 4x | 1024, 3x3 PCF | on | 12 taps, quarter res | on | 60 % | 330 m | default on touch; distant fill thinned |
| HIGH | 1.5 | adaptive 0.62-1 | 4x | 2048, 3x3 PCF, canopy | on | 20 taps, quarter res | on | 100 % near, thinned from ~120 m to 40 % at ~270 m | 420 m | default on desktop; carries the smoothing measures |
| MAX | 2 | 1 | 4x | 4096, 5x5 PCF, canopy | on | 32 taps, half res | on | 100 % everywhere | 480 m | nothing traded away |

Every tier uses the same generated world (valley about 511k splats, delta about 160k); a tier only changes how much of
each chunk is drawn, so switching never regenerates anything.

## Test recipe (headless)
- `python test/shot.py <scenario> [--level 0|1] [--q 0-3] [--out DIR] [--port N] [--flags "&dbg=shadow"]` (Python Playwright + SwiftShader, serves this folder on 127.0.0.1:8766, writes PNGs to `test/out/`). `--level 1` boots straight into route 2. Scenarios:
  `basic` (every valley set piece), `delta` (every delta section; use `--level 1`), `dmoments` (delta set pieces caught at the right instant: nippers on the hood, Clubtail windup, swing, doze, Sailback rise, lunge, thrash, asleep, results with the NEXT ROUTE button), `mobile` (412x860 portrait and 860x412 landscape with `&touch`), `run` (full autopilot run, `--diff N --err E --lag S`), `studio` and `studio2` (each creature alone in several poses), `boss`, `moments` (valley), `quality` (all four tiers), `live` (real page without `?test`: rAF loop, audio init, mouse fire, right-click reload, pause menu, quality change), `routes` (real page: pick route 2 on the title card, play, quit, pick route 1), `touch`, `card` (800x560 frames, HUD hidden; `--level 1` for the delta frames), `js "<expr>" ... shot:name`.
- Several scenarios can run at once with different `--port` and `--out` values.
- `node test/geo.js [outdir]` builds every creature mesh in Node and writes OBJ files; `python test/preview.py <dir> <out.png>` renders them (side, front, below, three-quarter) with numpy. `python test/sheet.py out.png <width> a.png b.png ...` tiles screenshots.
- URL flags (tests only, never needed by players): `?test` (no auto loop; the sim advances only through `TS.step`), `&seed=N`, `&level=0|1`, `&q=low|medium|high|max`, `&scale=1` (pins the render scale), `&touch` / `&desktop`, `&dbg=shadow` (terrain shows the shadow test).
- `window.TS`: `ready`, `state()` (includes `level`, `route`, `gate`), `step(sec)`, `render()`, `start({diff, level})`, `menu()`, `level(i)`, `light(s)` (pin the lighting to a distance; null follows the jeep), `skipTo(s)`, `aim(x, y)` (reticle in NDC), `aimAt(id, weak)`, `fire()`, `reload()`, `actors()`, `spawn(kind, opt)`, `autopilot(on, err, greedy, lag)`, `setQuality(i)`, `cam(eye, at, fov)` (null clears), `hud(bool)`, `studio(species, pose, view)`, `log()`, `clearLog()`, `perf()`, `_eval(src)`.
- `TS.skipTo(s)` skips timeline events before `s - 2` and clears a roadblock gate, and actors already spawned stay. Start set-piece shots from just before the spawning event (Clubtail 1072, Sailback 1368), and do not skip twice across the same event in one page.
- Boot in SwiftShader takes about 7 s for the valley and 8 s for the delta (creature meshes 5-6 s, world 1 s). The first change to the other route takes 4.6 s (3.6 s for its three new meshes), later changes about 1 s. A frame renders in 0.3-1 s there.

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
- **Stopping on rails needs a braking curve.** A target speed proportional to the remaining gap (`gap * 1.1`) overshot the stop by 2.8 m with 5 m/s2 of braking, which put the roadblock animal under the hood. `v = sqrt(2 * a * gap)` with `a` below the available braking, plus a hard clamp at the stop, lands within centimetres.
- **Sky alpha as the light-shaft mask.** Clear alpha to 0, let only the sky pass write alpha (1 minus clouds and ridges), and force alpha 0 for anything drawn after it. The shaft pass then marches the scene texture toward the sun's screen position reading alpha, with no extra occlusion pass.
- **A soft knee on lamp light.** With headlights and a torch, a pale animal 7 m away took 20 times the light of the dark ground and burnt out to white. `l / (1 + max(l) * 0.42)` on the summed lamp light keeps near things coloured and lets the far pool stay bright; a close-range ease (`mix(0.38, 1, smoothstep(1, 7.5, d))`) covers animals on the hood.
- **A night sky must be darker than the light it gives.** Using the ambient sky colour for the visible sky made moonlight look like an overcast day. Scale the zenith by `1 - 0.45 * night` and the clouds' moon lighting by `1 - 0.74 * night` in the sky shader only, and keep the ambient and moon colours bright enough to play in.
- **Swamp water should not mirror open sky.** Murky water under trees reflected the bright sunset sky and read as white. Fading the reflection toward a dark canopy colour by an fbm mask (only where `murk` is near 1) fixed it without tracing anything.
- **Lighting keyed to distance.** Keyframes along the rail (sun direction, colours, fog, exposure, lamp level) give a sunset-to-night progression that always matches the scenery. Switch from sun to moon with two keyframes 2 m apart while the sun colour is zero, so the direction jump is invisible.
- **Lazy creature meshes.** Building nine species at boot took 10.9 s headless; building only the picked route's cast brought boot back to about 7 s, and the other cast is built behind the loading card on the first route change.
- **Copy every flag when caching per-actor capsules.** Hit capsules carried `armor`, but the per-actor cache copied only radius, weak spot and bone, so armour never deflected and a balance run looked fine. A test that aims at the middle of the biggest armour capsule and checks the dose caught it.
- **Free the world through one registry.** Every buffer, VAO and texture a world creates goes through `track()`; `freeWorld()` deletes the list. Route changes then cannot leak, and nothing outside the world (programs, creature meshes, jeep models) is touched.
- **Images written through the device bridge gain a C2PA chunk.** Each `.webp` written to the PC came out 5,768 bytes larger than the staged file: a `C2PA` provenance chunk is appended after the image data. The `VP8 ` chunk and the pixels are identical and browsers decode it, so check images by decoding or by the image chunk's size, not the whole-file size. Text files arrive byte for byte (SHA-256 matched).
- **`skipTo` twice across one event leaves a ghost.** The second skip clears the roadblock gate while the animal from the first pass is still standing there, so the jeep drives through it. In tests, cross each spawning event once per page.

## Delivery history
- 2026-11-27, first build: made in a scheduled cloud session without folder access or a shell on the PC. Delivered as `tranqsafari.zip` (extracted into `E:\html games`), with `commit-tranqsafari.cmd` (commits only this folder, adds the CLAUDE.md and README rows through `docs-rows.py` only when those files have no other pending edits, pulls with rebase and retries on a rejected push).
- 2026-11-27, route 2 and graphics pass: written straight into `E:\html games\tranqsafari\` through the device bridge (folder access granted; still no shell, so run `commit-tranqsafari.cmd` to commit and push). The script picks the commit message by whether the game is already tracked. `tranqsafari.html` grew from 240,269 to 307,678 bytes; 19 changed files and 3 new screenshots were written and checked by size, and the HTML and the commit script by SHA-256 after staging them back.
- Private playable copy: claude.ai artifact https://claude.ai/artifact/Md8bSmG8w4HFUNo2TuxVhu (icon "game"). To republish after a rebuild, run `python make-artifact.py out.html` (strips the outer document tags and charset/viewport metas, which the artifact skeleton supplies, and pins a dark colour scheme) and publish that file to the same URL. The Arcade Shelf buttons hide themselves outside the arcade (`window.claude`, claude hostnames, `blob:`).
- Arcade card art: `art/tranqsafari-card.webp` (800x560, long-neck crossing from the passenger seat, HUD hidden; `game.json` names it as `screenshot`). Extra screenshots: `art/shot-raptor-on-hood.webp`, `art/shot-jeep-outside.webp`, `art/shot-delta-mire.webp`, `art/shot-delta-roadblock.webp`, `art/shot-delta-sailback.webp`. The root lobby card (`assets/arcade/tranqsafari.webp` plus an `<article class="game-card">` in the root `index.html`) is not added yet because those are shared root files; copy the card art there in a session that may edit them.
