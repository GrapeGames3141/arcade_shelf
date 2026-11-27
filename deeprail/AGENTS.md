# Deep Rail — agent notes

On-rails mine-cart shooter. A runaway cart plunges through an abandoned mine; the cart drives itself and the player only aims,
fires and launches flares. The dark is full of glowing eyes: flares light the cave where they land and scare off what is watching,
lanterns / oil lamps / glow crystals / braziers can be shot to light them for good (lit stretches spawn fewer ambushes and creatures
caught in light take double damage), and levers at two junctions pick the tunnel. One level of about 3.5 minutes ends with the
Sleeper, a huge pale cave beast that wakes as the cart circles it. Score, combo multiplier (x1-x8), health, recharging flares,
results screen with a grade, retry.

`deeprail.html` is generated: **edit `parts/*`, then run `python build.py`.** No other build step, no external files at runtime.
Test API: `window.DR`. Headless harness: `python test/shot.py basic|mobile|run|quality|tour|card|js ...`.
Design notes are in `notes.md`; the arcade card is `game.json` + `art/deeprail-card.webp` (800x560, HUD hidden).

## File map (parts/)
| file | what |
|---|---|
| `shell.html`, `style.css` | page skeleton: HUD, touch buttons, menu, pause, results (CSS + markup). Every setting has an in-page button. |
| `00-util.js` | math (vec3, mat4, frames), seeded RNG, value noise + `rockN` (the same noise drives mesh displacement and wall hit tests), `SAVE` (localStorage in try/catch), `QUALITY` tiers |
| `10-gl.js` | WebGL2 core: std140 uniform block generated from one field list, fixed texture units, all GLSL (lights with cube shadows, lit/rock materials, shadow depth, water, glow, bloom, scattering with shafts, composite), meshes, `MB` mesh builder, instanced `Batch`, `GlowBatch`, render targets, shadow cubes (`SH`) |
| `20-track.js` | the route: turtle-integrated segments (`Seg`), solved sibling branches, the boss loop (analytic circle), chambers (yawed rocky ellipsoids), tunnel profiles, tube on/off, chamber cut capsules, spatial grid, `insideWorld` / `rayWall` / `waterAt` |
| `25-cave.js` | geometry: tunnel tubes (chunked 40 m), chamber meshes, rails and sleepers, trestle bents, timber sets, stalactites, crystal dressing, glow worms, cavern fill lights; static instanced props bucketed in 36 m cells (`sAdd`) |
| `30-level.js` | level content from track frames with a fixed seed: lamps (`LAMP_KIND`), levers, crates, lurking eyes (`lurk`), webs, egg sacs, set dressing, distance triggers per segment |
| `40-actors.js` | bats, cave spiders, burrowers, collapsing scaffold beams, falling rock (big ones split), thrown boulders; the Sleeper (`BOSS`, `updateBoss`, `drawBoss`) |
| `50-fx.js` | particle pool, flares, flashes, tracers, `isLit` / `dazzleAt`, per-frame light gathering (shadow slots first, then top-N by I / distance, last slots faded), exposure estimate |
| `60-game.js` | state `G`, run start/reset, cart speed profile and segment switching, camera (look-ahead, aim parallax, banking, boss look), hitscan gun, scoring/combo, health, lurker logic, results, autopilot `botThink` |
| `70-audio.js` | procedural WebAudio: gun, flares, creatures, creaks, rumbles, rail clatter, drips, cave reverb (generated impulse response), drone that changes for the boss |
| `80-input.js` | mouse (absolute aim, left fire, right flare), keyboard, touch (relative drag aim + FIRE / FLARE / AUTO buttons), gamepad |
| `90-main.js` | drawing of lamps/levers/props/eyes/cart/viewmodel pistol/dust, the shadow pass (`renderShadows`) and the frame (`render`), HUD and menus, loop, `window.DR` |

## Route (fixed; the same ride every time)
`intro` Shaft 9 (384 m: loading platform, timbered drifts, hoist-room chamber) → lever A → `river` Flooded Gallery (390 m, trestle over an
underground river in a 34 x 25 x 140 m chamber) or `seam` Deep Seam (401 m, narrow, many burrowers) → `crystal` Crystal Cavern (merge chamber
62 x 34 x 116 m, 242 m) → lever B → `falls` Rockfall Run (316 m, steep, rocks and beams) or `nest` Spider Nest (316 m, webs, droppers, egg sacs)
→ `hollow` (96 m) → `loop` (circle r = 24 m around the Sleeper, repeats until it dies) → `exit` (244 m climb to daylight, fade to white).
Sibling branches start and end at the same nodes: the second of each pair has two straight lengths solved (`solvePieces`) and the
residual is warped out with a smoothstep weight (zero slope at the end, so the end tangent is kept). Default levers: river, falls.

## Tuning numbers
- Cart speed (m/s, `targetSpeed`): platform 4.2, drifts 10-11.5, hoist room 7.5, river trestle 7, seam 9.5±1.2, crystal cavern 6.6, falls 13,
  nest 7.8, hollow 5.8, loop 5.3 (13 once the Sleeper is down), exit 12.5. Accel 3.2, brake 5.5. Measured ride time 205-224 s.
- Gun: hitscan, 8 shots/s, 1 damage; x2 on creatures standing in light (`isLit`), x2 on a burrower's head. Touch gets aim assist
  (+0.25 m + 2.5 % of distance on target radii); the autopilot never does.
- Flares: 3 (crates allow 5), +1 every 6.5 s, launched at 30 m/s with 7 m/s² gravity toward the aim point, burn 7.5 s, light I 55 range 24.
  Safe radius 11 m (scares lurkers, bats veer off), dazzle radius 9 m (stuns bats 1.2 s, spiders 1.5 s, burrowers 1.2 s), Sleeper dazzle 12 m.
- Lamps (`LAMP_KIND`): lantern I 13 / range 13 / safe 9 / 50 pts, oil lamp 17 / 15 / 10.5 / 75, crystal 34 / 21 / 12 / 100, brazier 48 / 28 / 18 / 150.
  All crystals lit +1000 (CAVERN ALIGHT), all eight braziers +1000 (HOLLOW ALIGHT).
- Lurking eyes: a pair of glowing eyes on a wall, ceiling, floor or in the water. When the cart is within 26 m and the spot is lit they
  flee (+25 SCARED OFF). Otherwise they emerge at 19 m (bats, 4 of them), 15 m (spider), 12.5 m (burrower). Shooting the eyes first:
  peeper 50, bat 120, spider 150, burrower 200. Peepers are harmless decoration that blink out at 6 m.
- Creatures: bat 1 hp / 6 dmg / 100 pts (swarms of 8-16 close to 3.4 m inside the view, then dive one by one); spider 3 / 12 / 250 (drop on silk or crawl, leap at
  10 m with a 0.72 s ballistic arc); burrower 7 / 15 / 400 (bursts out, arcs toward the cart, lunges at 5 m).
- Hazards: scaffold beam 4 hp, falls over ~1.3 s, 15 dmg if still across the track; rock 3 hp (big 5, splits into two harmless chunks),
  12 / 16 dmg if it lands on the track ahead; web 2 hp, 4 dmg + 2.2 s of strands over the view and 40 % speed if driven through.
- The Sleeper: 8 eyes x 9 hp (x2 while dazzled, x1.5 with 4+ braziers lit); lids shut 1.4 s after each eye is lost. Attacks every
  (3.2 + 0.25 x eyes left) x (1 + 0.06 x braziers lit) s: boulder throw (2.3 s flight, 3 hp, 10 dmg; two when fewer than 5 eyes),
  bat call (9 bats minus one per two lit braziers), lunge (2 s telegraph, 4 damage on eyes or mouth interrupts it for +250, else 12 dmg).
  Eye 500, defeat 5000. Health and flare crates sit on the loop's outer ledge.
- Combo: every scored event +1 chain; multiplier 1 + floor(chain / 4), max x8; 4.5 s timer; any damage resets it.
- Health 100; health crate +25, flare crate +2 flares.
- Results bonus (survivors only): health x 20, lights lit on your route / total x 3000, accuracy x 2000.
  Grades: S ≥ 175k, A ≥ 140k, B ≥ 105k, C ≥ 70k, else D; a wreck shows X. Best total in `localStorage deeprail.best`.
- Settings in localStorage: `deeprail.quality`, `deeprail.sound`, `deeprail.autofire`, `deeprail.sens`.

## Balance (headless autopilot, `python test/shot.py run <skill> <n>`, 2026-11-27)
The bot is limited like a player: it acquires rocks, beams, crates and webs only when they are lit or within 16 m, reacts in
0.35-0.08 s and moves the sight at 1.8-5 screen-halves per second by skill, with aim error up to ±0.06. Results of the final tuning are in
`notes.md` (Balance log). Rough picture: skill 0.8 survives with little damage and scores S; skill 0.3 takes 55-136 damage and
sometimes wrecks on Deep Seam + Rockfall Run; skill 0.1 takes 70-165 damage. Burrowers and scaffold beams deal most of the damage
before the Sleeper.

## Renderer
- Pass order: gather lights and fill the dynamic batches → **shadow pass** (a depth cube per shadow slot, six faces: cave walls with
  the same cuts as the lit pass, static props, every dynamic batch) → opaque HDR pass into an MSAA RGBA16F renderbuffer (rock with
  back-face culling, rails, static props, dynamic props/creatures/particles, viewmodel pistol with `depthRange(0, .04)`) → when the
  river is near: blit colour + depth to a copy target and draw the water sampling the copy (refraction, thickness absorption, glints,
  foam, glow-worm sparkle) → additive glow billboards and premultiplied smoke → resolve colour (and depth on HIGH/MAX) → **light
  scattering at half resolution** (closed form per light; for the shadow slots the lit fraction of the view ray is measured by
  marching their cubes, which gives shafts and dark wedges behind timbers), added back with a tent filter → bloom (Karis first
  downsample, 3-6 levels) → composite (exposure, chromatic aberration, vignette, ACES, gamma, grade, grain, hurt tint, fade).
- One `std140` block (`F`): camera, time, headlamp, river, four shadow slots (`uShd`: strength, near, far, cube size) and up to 32
  lights. GLSL text and offsets come from one JS list. Samplers have fixed units (`TU`); the four cube shadow samplers are units 6-9.
- **Shadow slots** (`gatherLights` in `50-fx.js`, `SH` in `10-gl.js`): the first four lights in the list are the slots. Candidates are
  scored by weight x priority (flares 5, daylight 3, lamps 1, lever lamp 0.7); a light already in a slot gets x1.4 so shadows do
  not hop between lamps, and a slot fades in and out over 0.25 s. Cube faces use near 0.1 and far = the light's range; the shader
  rebuilds the stored depth from the largest axis of the light vector, offsets along the geometric normal by 1.8 texels, and takes
  1 / 5 / 9 rotated taps (MEDIUM / HIGH / MAX) through `samplerCubeShadow` (hardware 2x2 on top). Lamp geometry is flagged
  (`Batch.noShadow`, instance float 23) and collapsed in the depth pass, because the light sits inside it.
  The depth programs are built with `NOLIGHT` so they contain no shadow samplers (a program that renders into a cube must not
  have it as an active sampler). Unused slots bind a 1 px dummy cube.
- Lights: `w² / (1 + d²)` with a smooth range window. Big caverns get **fill** lights (`uLC.w = 1`, `w² x 0.05`, no inverse square,
  no scattering); each lit brazier adds one over the whole hollow, so lighting them visibly lights the cavern and the Sleeper.
  A small cab light keeps the tub, the pistol and the hand readable. The big caverns also tint ambient and haze and thin the fog
  (`ch.mood`). Exposure follows an estimate of the light reaching the eye (`lightE`; flashes are left out), 1.35 in the dark
  down to about 0.6 next to a flare, faster down than up.
- Cave as a union of shapes: tunnel tubes (rings every 1 m, 30 around, flat floor, displaced by `rockN`) and chambers (yawed
  ellipsoids with a flat floor). Tube rings whose centre lies inside a chamber are not emitted. Each tube chunk discards fragments
  inside nearby chambers; each chamber discards fragments inside a capsule where a tunnel crosses its wall (`rockCut`, shared by
  the lit and depth shaders).
- Rock in the fragment shader: warped sedimentary beds (tone per bed, faint steps), four octaves of value noise **with analytic
  gradient** (`vnd`) for the bump, dust on ledges, dusty gravel on the floor, wet streaks, mineral flecks. Fine octaves fade with
  distance and at grazing angles. Octaves 1 / 2 / 4 / 4 by tier.
- Prop materials by instance tint alpha: 0 stone/paint (noise + bump), 0.25 wood (grain along the piece's longest side, from the
  instance scale), 0.5 iron (rust blooms), 0.75 creature skin (mottling, wrap light, rim light), 1 crystal (glow at core and tip,
  sparkle). The vertex shader derives the instance scale and a seed from the matrix; no extra attributes.
- Dust motes near the camera are lit on the CPU from the headlamp and the eight strongest lights (`drawDust`).
- Quality: LOW (no MSAA, 0.7 scale, 8 lights, no shadows, no scattering, 1 rock octave), MEDIUM (MSAA 2, 0.85 scale, DPR ≤ 1.25,
  14 lights, 1 shadow light at 384 px, refraction; the default on touch devices), HIGH (MSAA 4, DPR ≤ 2, 24 lights, 2 shadow
  lights at 512 px with 5 taps, 10 shaft steps, adaptive render scale under a 2.6 MP budget), MAX (MSAA 4, native DPR, 32 lights,
  4 shadow lights at 1024 px with 9 taps, 20 shaft steps, 6 bloom levels, nothing traded away). Changes take effect at once.

## Test recipe
```
python build.py
python test/shot.py basic     # menu, start, tutorial, shooting, flare, bats, hoist room, junction, river, crystal, falls, boss, results
python test/shot.py mobile    # 390x844 touch: menu, FIRE / FLARE / AUTO buttons and drag aim with real pointer events, pause, landscape
python test/shot.py run .8 4  # full autopilot rides (skill, number of branch combinations), prints balance stats and damage by source
python test/shot.py quality   # a flare-lit timbered tunnel at LOW / MEDIUM / HIGH / MAX
python test/shot.py tour      # every set piece (headlamp only)
python test/shot.py card      # arcade card candidates at MAX (800x560, HUD hidden); card-c is the one in art/
python test/shot.py js "DR.start({seg:'river', s:250, calm:true})" "DR.lightAll('river')" "DR.step(.5)" "shot:river"
python test/artifact.py out.html   # copy shaped for a claude.ai artifact (no document wrapper, no Arcade Shelf button)
```
Screenshots go to `test/out/` (ignored by `deeprail/.gitignore`). The harness serves this folder on port 8766 and runs Chrome with
SwiftShader. In `?test` mode the sim only advances through `DR.step()` and frames are drawn only by `DR.render()`.
URL flags for tests only: `?test`, `&scale=1` (pin render scale), `&q=low|medium|high|max`, `&touch`, `&desktop`, `&nofloat` (LDR fallback), `&seed=N`.
`DR`: `start({seg, s, branchA, branchB, calm, wake, bossDead})`, `step(sec)`, `render()`, `state()`, `aim(x, y)`, `fire(on)`, `flare()`,
`bot(on, skill, {A, B})`, `setQuality(i)`, `cam(eye, at, fov)` / `uncam()`, `stats()`, `result()`, `lamps()`, `lightAll(seg)`, `god(on)`,
`boss()`, `track()`, `menu()`, `perf`, and `eval(src)` for internals.

## Findings
- Rendering only on demand in a headless page: the screenshot showed the previous `DR.render()`. Render, wait one animation frame, render
  again, then screenshot (`shot()` in the harness).
- On a loop around a boss the boss sits 90° to the side of the track tangent. The camera has to weight its look toward the boss
  (0.7 here) or the eyes are off screen; the autopilot found this by never acquiring the eyes.
- The autopilot must not get touch aim assist, or every balance number is too kind.
- A boss eye placed by a hand-written offset ended up inside the head ellipsoid and behind the armour sphere. Place eyes on the
  ellipsoid surface (`d · 1 / |d / radii|`) and hit-test the head as an ellipsoid, not a sphere.
- A pale, faintly emissive skin keeps a huge creature readable in a dark cave; a dark realistic skin vanished.
- Inverse-square point lights alone cannot light a large cavern; see fill lights above.
- Graphics pass (2026-11-27): a bump from `dFdx`/`dFdy` of a noise is constant per 2x2 pixel quad and looked blocky; value noise
  with its analytic gradient is smooth and costs one evaluation. Thin "crack" and "seam" lines from thresholded noise read as
  scribbles on the walls, so the rock has none.
- A light that sits 12 cm off a wall grazes it: every bump throws a long blobby shadow and the wall behind the light goes black.
  Flares now come to rest 40 cm clear of the surface.
- With real shadows the cart and pistol were lost in their own shade; a weak, short-range cab light fixed it.
- Exposure that follows flashes dims the screen for a second after every lantern is lit. Leave flashes and the muzzle light out.
- Chromatic aberration scaled as `q * r² * k`: k = 0.05 gave 12 px fringes at 960 px wide; 0.006 is enough.
- In `?test` mode shadow slots and exposure settle at once (the frame delta is treated as 1 s), so screenshots do not catch a fade.
