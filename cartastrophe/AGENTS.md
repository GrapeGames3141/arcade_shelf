# Cartastrophe — agent notes

Rocket-powered shopping carts in the Clifftop Foods parking lot. You ride in the basket and steer with two ropes tied to the
front casters. Score by shoving other carts into hazards: the store wall, parked cars, lamp posts, the cart corral, dumpsters,
bollards, the duck pond, or off the cliff into the lake. Last cart rolling wins.

Mesh-based WebGL2 (not splats), single HTML file with no external assets, synthesized audio.

## Files
- `cartastrophe.html` — the built game. **Generated. Edit `parts/`, then run `python build.py`.**
- `build.py` — concatenates `parts/*.html` then `parts/*.js` (in name order) into one `<script>`.
- `parts/00-head.html` — markup + CSS: title screen, settings, rider picker, HUD, touch buttons, pause, receipt end screen.
- `parts/10-util.js` — math (column-major mat4, 3x3 bases, `r3YPR` yaw/pitch/roll), seeded RNG (`grng` gameplay, `frng` effects), noise.
- `parts/20-gl.js` — renderer: instanced meshes (vertex = pos3 nrm3 col3 par3 uv2; instance = mat4 + tint4), sun shadow map
  (depth texture + `sampler2DShadow` PCF), sky with clouds, water (ripples via uniform array), billboard particles (alpha + additive),
  ACES tonemap in every shader. Procedural materials are flagged by a negative `par.z` (emissive slot): -1 brick, -2 ground
  (par.x = grass weight, par.y = mud weight), -4 concrete, -5 rock, -6 plywood.
- `parts/30-meshes.js` — `MB` mesh builder (transform stack, box/cyl/sph/tube/face) and the mesh library: cart (wire basket,
  rocket, flag, groceries), front caster, faces (grin/scream), six helmets, props, ducks, groceries, pickups, door panel.
- `parts/40-world.js` — arena layout constants, `groundH`, `surfaceAt`, `pondSD`, `rampAt`, static colliders (`STATICS`),
  `hazardsNear` (AI target picking), sign atlas (canvas text), static world mesh, pond + lake water meshes.
- `parts/50-physics.js` — riders, `Cart`, `cartStep` (2-axle tyre model), collisions (2D OBB SAT), rider pose,
  `Ragdoll` (15-point Verlet), `Wreck`, `Debris`, particles.
- `parts/60-ai.js` — AI drivers.
- `parts/70-game.js` — match flow, items, `knockOut` + credit, events -> effects/sounds/text, camera, scene drawing, quality, HUD,
  menus, input (keyboard, gamepad, touch), main loop, boot.
- `parts/80-audio.js` — WebAudio: per-cart rocket roar + caster rattle voices, one-shots (clang, crash, splash, scream formant
  synth, car alarm, door ding, cash-register "ka-ching"), bossa-nova muzak loop, optional speechSynthesis announcer.
- `parts/90-test.js` — `window.CT` test API, then `boot()`.
- `notes.md` — design and tuning.
- `test/` — headless Playwright harness (see below).

## Layout (metres, y up, heading 0 = +Z)
Lot x -38..38, z -31..28. Store front wall z=31 (sidewalk/curb z 28..31, doors at x -20/0/20 where carts respawn).
Sound wall z=-31. West brick walls + loading dock face x=-38. Cliff edge x=38 with guard-rail sections at z [-29.5,-17], [-9,3],
[11,22] (gaps between them); the lake is at y=-30. Duck pond centre (-12,-10), radius ~8 (wobbly), water y=-0.35.
Ramps: pond jump at (-12,6) heading south, east ramp (28.5,-3) heading west, west ramp (-30,-1) heading north.

## Physics (50-physics.js)
- Fixed step 1/120 s. Front axle steered by the ropes (lag + caster wobble), rear axle fixed. Lateral tyre force
  `-slip * LAT_K` clamped to `mu * N`, where mu blends from rolling grip (1.4 asphalt / 0.9 grass) to sliding grip (0.62 / 0.5)
  by slip angle. This keeps steering sharp while shoved carts skid a long way. Max steer angle shrinks with speed
  (`min(0.62/(1+v/9), 0.13 + 0.73*14/(v^2+1))`); past that the front just slides.
- Brake = rider drags feet: strong decel and rear grip x0.45 (handbrake turns). At a standstill it paddles backwards.
- Rocket `THRUST` 600 N, boost x1.75 builds heat (overheat = 2.4 s sputter), Mega Rocket item x2.7.
- Wipeout rules: a hazard wall hit with normal speed above `SELF_KO_SPEED` (11 m/s), or above `SHOVED_KO_SPEED` (4.8 m/s)
  within `SHOVE_WINDOW` (3.5 s) of being shoved. Pond = centre below water inside the pond. Cliff = x past 38.35.
  Guard rails: above `RAIL_VAULT` (6.5 m/s) the cart vaults over. Landing badly tilted = BELLY FLOP.
- Credit: the last cart to touch you (ram, melon, blower, peel) within `CREDIT_WINDOW` (4.5 s); otherwise SELF-CHECKOUT.
- Cart-cart: impulse with e=0.55 plus an arcade "shove bonus" on the victim (x0.55, x1.0 boosting, x1.5 mega).
- Ground: `groundH` must not clamp to 0. `rampAt` returns 0 off-ramp, so only take `max` when on a ramp (a bug here once
  flattened the pond and hid the water). Steps up over 0.36 m block movement (ramp sides, the dock); curbs (0.15) are climbed.

## AI (60-ai.js)
- Pick target: nearest, weighted toward carts near hazards, grudges, the player (by level), and away from carts other AIs target.
- `hazardsNear(target)` gives the push direction. "Joust": line up 7-13 m behind the target on the far side from the hazard,
  then charge (boost) when in the cone; back off (retreat) after contact or when nose-to-nose and slow (stops scrums).
- Steering every step: PD on heading error toward the goal, with goals slid along nearby statics. On think ticks a short
  arc test (`danger`) overrides the steer if the path hits lethal ground or a wall at speed; while charging, only the path up
  to the target is checked (so carts parked by hazards still get hit). Emergency brake when straight ahead is lethal.
- Stuck = moved < 1.1 m in 1.5 s: reverse away from the nearest static, then drive to an escape point.
- Levels: easy / normal / mean (think rate, aim gain, look-ahead, recklessness, player preference).

## Test API (`window.CT`) and URL flags
`?test` stops the real-time sim (rendering continues) so tests step it with `CT.advance(seconds)`; add `&run` to let it run
in real time. `&seed=N`, `&q=low|medium|high|max`, `&auto` (player is AI), `&play` (skip the title).
- `CT.start({opp, lives, ai, rider, touch})` starts a match with no countdown. `CT.title()` goes back to attract mode.
- `CT.advance(s)` steps physics, effects and camera, renders one frame, and returns `CT.state()`.
- `CT.state()`: mode, timer, carts (pos, speed, state, lives, item, wipeouts, self), koLog, AI plans/targets.
- `CT.setInput({throttle, steer, brake, boost})` drives the player; `CT.autopilot(true)` hands the player cart to an AI.
- `CT.freezeAI(true)`, `CT.teleport(i, x, z, yaw, speed)`, `CT.give(i, 'melon'|'banana'|'blower'|'mega')`, `CT.use(i)`,
  `CT.tag(i, by)` (mark as shoved), `CT.cam(mode, yaw)`, `CT.setCam(pos, tgt, fov)`, `CT.quality(q)`, `CT.perf(frames)`.

## Headless test recipe
Playwright + Chrome with SwiftShader: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.
`test/shot.py` holds the launcher (set `CHROME` to a Chrome path, or it uses Playwright's bundled Chromium). Scripts:
`soak.py` (2 min all-AI match: wipeout count by kind, credited vs self), `duel.py` (AI vs a parked target next to each hazard),
`kos.py` (staged car / pond / cliff wipeouts with screenshots), `items.py`, `fullmatch.py` (easy + mean matches to the end,
counts console errors), `mobile.py` (844x390 touch layout), `ui.py` (real-time click-through). Output goes to `test/out/`.
Reference numbers (2026-11-22): 2-minute 6-cart soak ~12 wipeouts, mostly credited; full 4-cart match ends in 1-2 minutes.

## Gotchas
- Water meshes draw without instancing: their VAOs must disable the instance attributes (5-9), or WebGL refuses the draw
  because the instance buffer is empty.
- `MB.face` must return `this` (it's chained in the cart fins).
- Text on a facade seen from -Z must have its UVs flipped horizontally (`flipU`).
- The camera is clamped out of the store/walls and lifted over parked cars, dumpsters and corrals.
- `page.evaluate` in Playwright *calls* a returned function: end injected monkey-patches with `; 0`.
