# Lawnchair Aces

Lawn chairs hanging under clusters of helium balloons, drifting over a forest lake. Players
duel with multi-pump pellet rifles: pop the other chair's balloons until it splashes down.
Single-file WebGL2 game, mesh-based (not splats), generated from `parts/` by `build.py`.

- Play: `http://127.0.0.1:8000/lawnchairaces/lawnchairaces.html`
- Test API: `window.LA`
- First build 2026-11-22, made in a cloud session with no shell on the PC. It was written into
  this folder through the device bridge. `commit-lawnchairaces.cmd` commits the folder, adds the
  CLAUDE.md and README table rows with `docs-rows.py` only when those files have no other
  pending edits, and pushes. It is safe to run again.
- `game.json` gives the Pages arcade card its title, description, category and controls.

## Files

| Path | What it is |
| --- | --- |
| `lawnchairaces.html` | The game. **Generated.** Edit `parts/`, then run `python build.py`. |
| `game.json` | Arcade card metadata for the Pages build. |
| `docs-rows.py`, `commit-lawnchairaces.cmd` | Commit helper for sessions without a shell, and the idempotent CLAUDE.md and README row insert. |
| `build.py` | Joins `parts/` in name order: `00-*.html`, then every `*.js` in one `<script>`, then `99-*.html`. Prints size and hash. |
| `parts/00-head.html` | CSS and DOM: title panel, pause, results, help, touch buttons. |
| `parts/10-core.js` | Math, RNG (`RNG(seed)` with `range/int/pick/gauss`), value noise, `fbm`/`ridge`, `m4` matrices, GL helpers (`makeProgram`, `makeVAO`, `makeFBO`). |
| `parts/20-shaders.js` | All GLSL. `SH_COMMON` holds the sky, hemisphere light, cloud density and cloud shadows, fog, two-cascade shadow lookup and GGX. |
| `parts/30-meshes.js` | Procedural geometry (`MB` builder: tube, path, ellipsoid, box, lathe, extrude with ear clipping). Includes the balloon, lawn chair, jug, pilot (legs, upper body, first-person chest), rifle and lever, trees, cabins, docks, boats, spectators, buoy and the unit limb pieces. |
| `parts/40-world.js` | `WORLD`: shoreline `shoreR(theta)`, height field, beachiness, forest density, cabins, polar terrain mesh (rings follow the shoreline), lake height texture, tree scatter. `WIND`: layered wind field. |
| `parts/50-sim.js` | `PHYS`, `DIFF` and `LOOKS` tables. Chair flight, balloon cluster physics, rifle state machine, pellet ballistics and collisions, pops, string cuts, jug leaks, particles, rescue boat, AI, match rules. |
| `parts/60-audio.js` | `AUD`: procedural WebAudio. Shots, pumps, bolt, pops delayed by the speed of sound, whiz, plink, splash, rubber squeaks, chair creaks, loons with echo, outboard motor. |
| `parts/70-render.js` | `R`: renderer, quality tiers, render targets, passes. |
| `parts/80-ui.js` | `INPUT`, settings, menus, pointer lock, touch, `HUD` (2D canvas), `playerUpdate`. |
| `parts/90-main.js` | `TIMES`/`SKY` (time-of-day presets), `CAM`, frame assembly (`buildFrame`), main loop, `window.LA`, boot. |
| `test/run.cjs`, `test/scenarios.cjs` | Headless harness (see below). Screenshots go to `test/out/`, which is git-ignored. |

## Rules of play

- Each chair hangs under 28 balloons (radius 0.72 to 0.86 m, 5 to 8 kg of lift each) and carries
  six 4 kg water jugs.
- **Float height.** Lift scales by `1 - h / PHYS.liftH`, with `liftH = 1200`, so a chair settles
  where lift equals weight.
  - One balloon is worth about 43 m of float height. 1 kg of water is worth about 8 m.
  - The base mass is set so a full water load floats at the start altitude.
  - Vertical drag is `14 * v|v|`, which gives about 1 to 2 m/s per lost balloon.
- **Controls for height.**
  - Pour water: Space, 1.3 kg/s.
  - Let a balloon go: hold E for 0.7 s. It releases the balloon on the longest string, and that
    balloon floats away.
- **Leaf blower.** Hold W (touch: BLOW). The blower strapped to the chair back swings the chair
  round to face where you look and pushes at `PHYS.blowAcc = 0.75` m/s^2.
  - It overheats after `blowHeat = 4.2` s and cools fully in `blowCool = 7` s.
  - Once it has overheated it restarts only below `blowRestart = 0.35` heat (marked on the HUD
    bar).
  - The wind drag (`hRelax`) bleeds the extra speed off again, so a burst is a nudge of a few
    tens of metres, not a motor.
  - It blows air puffs and the odd leaf out of the nozzle, has a two-stroke sound, and the chair
    jitters while it runs.
- **Out.** A chair is eliminated if the seat drops below 0.35 m over water (splash), comes down
  on land, or drifts past r = 720 m.
  - A splashed chair floats with its remaining balloons, and the rescue boat by the swim raft
    motors out to it.
- **Helium seepage.** Lift is multiplied by `exp(-(matchT / 1500)^2)`. It's under 3% at 4
  minutes, and it ends any match by about 15 minutes. The feed announces it at 5 and 9 minutes.
- **Wind.** Six layers at 0, 70, 140, 210, 290 and 380 m. The direction turns about 85 to 120
  degrees per layer, and speed rises with height (1 to 6.5 m/s).
  - Each layer swings ±20 to 43 degrees over a 150 to 260 s period, and speed varies ±15%.
    That way chairs at different heights keep meeting.
  - A drift towards the lake centre (0.75 m/s past 220 m) is added at every height.
  - A stronger return flow (up to 3.4 m/s) starts at r = 330 m.
- **Rifle.** Muzzle velocity is `60 + 155 * (pumps/10)^0.75` m/s, so 10 pumps gives 215 m/s.
  - A pump stroke takes `0.36 + 0.05 * pumps` s, and working the bolt takes 0.55 s.
  - Pellet drag is `0.0085 * |v_rel|` relative to the local wind, plus gravity. Drop is about
    3 m at 100 m and about 11 m at 150 m with 10 pumps.
- **What a pellet does.**
  - **Balloon:** pops it. The pellet normally stops there; 15% of the time it carries on and
    can pop a second one.
  - **String** (within 1.8 cm): the balloon floats away.
  - **Jug:** holes it, and it leaks at 0.35 kg/s, so that chair climbs.
  - **Chair or pilot:** a harmless ping.
- **Practice.** Three-balloon targets on long tethers from buoys. A pop scores `1 + floor(dist / 40)`.
  The session lasts 180 s.

## AI (`aiUpdate`)

- **Altitude.** Every 2.5 to 4.5 s the AI scores candidate heights (25 to 300 m, 12 m steps).
  - The score combines how well that layer's wind matches a desired drift (close to `prefer`
    range, back off under 45 m, otherwise circle) and how close the height is to the target's.
  - It subtracts the cost of getting there in water or balloons. It keeps 6.5 kg of water in
    reserve, and won't drop below 21 balloons by cutting.
  - A chair that hasn't fired for 35 s gets restless, and its costs drop to 35%.
- **Blower.** Bursts of 2 to 3.8 s, with a 9 to 17 s cooldown between them. It blows towards the
  target when beyond preferred range + 45 m, away when closer than 40 m, and towards the middle
  of the lake past r = 430 m. While blowing it turns the chair to the burst direction; the upper
  body keeps aiming.
- **Ballast.** It pours when sinking or low, or when climbing to its chosen height. It cuts a
  balloon when the chosen height is more than 55 m below its float height.
- **Aim.** `solveAim` simulates the pellet with the real integrator and corrects for the miss
  (5 passes, with target lead).
  - The error is `naive + (solution - naive) * (1 + rangeError)` plus Gaussian yaw and pitch
    error.
  - Pumps are chosen by range: 3 to 10.
  - It fires after `react + hesitate`, and less eagerly beyond 130 m. Its range is 3D (195 m).

| Difficulty | Angle sigma (rad) | Range error | React (s) | Preferred range |
| --- | --- | --- | --- | --- |
| Easy | 0.062 | 0.9 | 2.2 | 130 m |
| Normal | 0.042 | 0.6 | 1.6 | 125 m |
| Hard | 0.025 | 0.35 | 1.0 | 115 m |

Measured with `node test/run.cjs match`, AI against AI:

- Normal duels last 95 to 490 s, with hit rates of 35 to 65%.
- Free-for-alls last 145 to 335 s.

A 28-balloon cluster is about 10 m across, so the angle error has to be larger than intuition
suggests.

## Rendering (`R.render`)

Each frame runs these passes in order:

1. **Shadows.** Two orthographic cascades in one depth atlas (2N x N), drawn with objects and
   balloons only.
   - Near: ±7 m around the camera.
   - Far: ±130 m ahead.
2. **Reflection.** The scene mirrored about y = 0 into the `refl` target, with fragments below
   the water discarded (`uClip`).
3. **Main HDR pass.** Drawn in this order:
   - terrain, then trees (instanced conifers and broadleaves);
   - props, chairs and pilots, then instanced balloons;
   - sky, then ribbons (strings and ropes, kept at least 1.2 px wide by widening and fading);
   - the lake, then particles.
4. **First-person pass.** It clears depth, then draws your own chair, legs and chest with a near
   plane of 0.02. The rifle and arms use a separate 50 degree viewmodel field of view
   (`o.vm`, `F.vmVP`) so they don't stretch.
5. **Post.** MSAA resolve, bloom (downsample and upsample chain), ACES with exposure, grade and
   vignette, and FXAA on the low tiers.

The lake shader:

- **Reflection:** samples the reflection target in screen space, distorted by wave gradients
  from a tileable sum-of-sines texture.
- **Absorption:** takes depth from an R16F height texture of the lake bed, so shallow water and
  sand show through. Blending is premultiplied.
- **Extras:** shoreline foam, up to 16 splash ripples, cloud shadows and GGX sun glint.

The balloon shader treats latex as translucent:

- light transmitted to the shaded side, stronger looking towards the sun;
- coloured, not black, shadowing from neighbouring balloons;
- a little bounce inside the cluster;
- two specular lobes.

Quality tiers (button on the title screen and in the pause menu, remembered in localStorage):

| Tier | Render scale | AA | Shadows | Reflection | Trees |
| --- | --- | --- | --- | --- | --- |
| LOW | 0.62, DPR 1 | FXAA | off | 1/3 | 3k |
| MEDIUM | 0.8, DPR up to 1.25 | FXAA | 1024 | 0.42 | 7k |
| HIGH | Adaptive under 2.4 MP, DPR up to 1.5 | MSAA 4x | 2048 | 1/2 | 13k |
| MAX | Native (full DPR) | MSAA 4x | 4096 | full | 20k |

MAX trades nothing away. Only HIGH adapts its scale.

Time of day presets are morning (cool haze), noon, golden hour (default) and sunset.

## Test API and URL flags

Test-only URL flags (players never need them; every setting has a button):

| Flag | Effect |
| --- | --- |
| `?test` | Test mode. Turns on `preserveDrawingBuffer`, turns off pointer lock and audio, and adds an fps readout. |
| `&q=low\|medium\|high\|max` | Quality tier. |
| `&seed=N` | Match seed. |
| `&scale=1` | Pins the render scale. Needed headless. |
| `&time=golden` | Time of day. |
| `&mode=duel` and `&spectate` | Start a match, or an AI-only match, at load. |
| `&diff=hard` | Opponent difficulty. |
| `&audio` | Allows audio in test mode. |

`window.LA` functions:

| Function | What it does |
| --- | --- |
| `state()` | Phase, chairs (altitude, balloons, water, float height, rifle, stats) and the feed. |
| `start(mode, diff)`, `spectate(mode, diff, seed)`, `title()` | Start a match, an AI-only match, or go to the title. |
| `freeze(on)`, `step(seconds)`, `frame()` | Deterministic stepping and a single render. |
| `aimAt(i)`, `autoAim(i)`, `look(yaw, pitch)`, `ads(on)` | Aim helpers. `autoAim` uses the full ballistic solution. |
| `pumpTo(n)`, `fire()` | Set pumps and shoot along the current aim. |
| `blow(on)` | Hold or release the player's leaf blower. |
| `pop(ci, n)`, `cut(ci)`, `pour(ci, kg)`, `holeJug(ci, j)`, `splash(ci)` | Damage and ballast shortcuts. |
| `setTime(t)`, `setQuality(q)`, `setting(k, v)` | Change settings. |
| `view({pos, look, fov})` or `view({mode: 'fp' \| 'chase'})`, `closeView(ci, dist, height, angle)` | Camera control. |
| `wind(alt)`, `layers()`, `perf()`, `log()` | Wind sampling, performance and the log. |

## Headless test recipe

```
python build.py
node test/run.cjs <scenario> [q=low|medium|high|max] [w=1280] [h=720] [seed=N] [mode=duel|ffa] [diff=normal] [extra=audio]
```

The harness uses Playwright with Chrome on SwiftShader (`--use-gl=angle --use-angle=swiftshader
--enable-unsafe-swiftshader`). It prints console errors and page errors, exits non-zero on page
errors, and writes PNGs to `test/out`. On SwiftShader the low tier runs at about 10 fps, which is
fine for stills.

Scenarios:

| Scenario | What it checks |
| --- | --- |
| `boot` | Boot and title screen. |
| `times` | All four times of day. |
| `fp` | First person: aim, look up, look down, scope. |
| `chase` | Third-person view. |
| `blower` | Blower thrust, overheat and cooldown, plus close-ups of the blower. |
| `defend` | A passive player under fire from Hard AI: sinking warning, pouring, splashdown. |
| `hero` | Max-quality stills: chase view, first person, sunset close-up. |
| `combat` | Shots with `autoAim`, the pop seen through the scope, pump pose, opponent close-ups, pouring, splashdown, rescue boat, results. |
| `guide` | Drop-guide ring and the high-tier first-person view. |
| `pose` | First-person pump pose variants, passed as `poses=[[yaw,pitch,roll],...]`. |
| `practice` | Target practice. |
| `match` | AI against AI to completion, with a stats log every 30 s. |
| `top` | Top-down and shoreline debug views. |
| `audio` | Every sound path with a live AudioContext. Needs `extra=audio`. |
| `touch` | Touch layout. Use `w=844 h=390`. |

## Lessons

- **Pellets must stop at the first pop.** Letting them carry on through the latex shreds 3 to 4
  balloons per hit and ends matches in under a minute.
- **Cluster size sets AI accuracy.** A cluster's cross-section is huge. Tune the AI's error
  against the real hit rate from `match` runs, not against intuition.
- **Duels need a reason to meet.** Without drift towards the centre, swinging layers and
  seepage, two chairs at the same height move together forever. The AI must also judge range
  in 3D, or it hovers 100 m above or below its target.
- **First-person meshes.** Put the rifle and arms in their own viewmodel field of view. Draw the
  first-person chest so that looking down doesn't show the thighs' open ends.
- **Thin ropes near the eye.** Ropes inches from the eye render as planks.
  - The rig ties at the back of the armrests and the top of the chair back, so the ropes rise
    beside and behind the head to a ring 3 m up.
  - The player's own ropes are drawn 2.8 mm wide in first person, and lit softly (`FS_RIBBON`).
  - If the chair is turned more than about 60 degrees from the view, the back ropes can show at
    the edges.
- **Distant forest.** It reads as forest only if the canopy takes much less sun than grass
  (`sunOcc`) and clearings are rare. Haze otherwise flattens it to olive.
- **Escapes in parts.** `·`-style escapes in JS strings in parts may arrive as literal
  characters. Match on the literal `·` when patching.
