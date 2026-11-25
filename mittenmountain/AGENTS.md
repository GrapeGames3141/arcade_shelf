# Mitten Mountain — agent notes

Felt-animal sledding down a giant knitted scarf. Everything is Gaussian splats, which is where the felt look comes from.

- Game: `mittenmountain.html`. It's generated from `parts/*` by `python build.py`. **Edit the parts, never the HTML.**
- Test API: `window.MM`. Headless harness: `python test/shot.py <basic|mobile|full|tower|perf> [low|medium|high|max]` (Python Playwright with SwiftShader). Screenshots go to `test/out/`.

## Play
- Pick a rider: Bunny, Penguin or Fox. The run is 1500 m down a winding scarf with a fixed seed, so every run is the same mountain. A run takes about 90 s.
- Pals (otter, chick, bear, mouse, frog and more) wait on the scarf. Drive through one to pick it up. They sit on the sled, and from the fourth pal on they stack into a wobbling tower. The sled holds 8.
- Buttons are worth 10 × (1 + pals on the sled). Hopping over a yarn ball is worth 15 × (1 + pals). Airtime over 0.75 s scores, and over 1.35 s it's BIG AIR.
- Bonking a yarn ball or a crossed knitting-needle gate cuts your speed by 55% and knocks the top pal off. It tumbles away and lands in the snow.
- At the finish, each delivered pal is worth 150, and the time bonus is 10 × (110 − time).
- Controls:
  - Desktop: A/D or arrows steer, W pushes, S brakes, Space jumps, P/Esc pauses, R restarts.
  - Touch: a floating joystick under the left thumb (up pushes, down brakes, sideways steers). Tapping the JUMP button, or anywhere on the right 40% of the screen, jumps.
  - Gamepad: left stick steers, RT pushes, LT brakes, A jumps.
- In-page buttons cover quality (LOW, MEDIUM, HIGH, MAX), sound and pause.

## File map
| part | what |
|---|---|
| 00-head.html | CSS (felt cards with dashed stitch borders), HUD, menus |
| 10-util.js | math, mat4, RNG, value noise, `SB` splat builder |
| 20-render.js | WebGL2 splat shader, MSAA FBO + alpha-to-coverage, sky, blob-shadow quads, tilt-shift/grade post |
| 30-models.js | felt primitives (ellipsoid, tube, fuzz, bead eyes), 8 species, sled, yarn ball, needles, mitten ramp, button, trees, candy canes, snowman, backdrop |
| 45-levels.js | level themes (sunrise, clear day, snowfall, sunset, starry night), difficulty per level, themed backdrop (sun/moon disc with glow, stars, tinted mountains, clouds), cocoa mug + cocoa stand models, finish celebration |
| 47-lights.js | Christmas lights for the night map: emissive bulb splats (alpha byte 70, round, twinkle from the random byte) plus an additive halo pass (`GLOW` shader) attached to models as `m.glow`; light strings between candy canes, spirals on pines with a star, bulbs on arches, sled rails and the cocoa stand |
| 40-track.js | centre line + frames table (0.5 m), lateral profile, scarf stitch pattern (motif bands), chunk baking (20 m chunks), arches |
| 50-game.js | course generator, sled physics, collisions, scoring, particles, autopilot |
| 60-io.js | keyboard, touch joystick, gamepad, procedural WebAudio (sled hiss, music box loop, sfx), HUD |
| 70-main.js | quality tiers, camera, frame render order, loop, menus, `window.MM` |

## Renderer findings
- **Splat layout** is 24 bytes: pos xyz f32, size f32, rgba u8, normal xyz s8 plus a random s8. Alpha byte 255 means felt, 0 means a glossy bead (round, with a fixed highlight), and 128 means a stitch.
- **Stitch splats** use a fixed 0.48 squash and take their rotation from the random byte (`angle/2π`). Two legs at ±0.5 rad from screen-vertical read as knit V's, because the chase camera always looks down the track. A darker splat between columns gives the knit relief.
- **Order-independent rendering**: there's no sorting. Splats draw opaquely with `SAMPLE_ALPHA_TO_COVERAGE` into a 4× MSAA renderbuffer, then get blitted to a texture for post. Gaussian falloff × per-pixel hash noise gives the fuzzy fibre edge.
- **Stop-motion boil**: characters jitter their splats by `uBoilAmt × size`, using a seed that changes 12 times a second. Poses also use time quantised to 12 fps. The camera and sled motion stay smooth, which is what sells "felt puppets filmed in stop motion".
- **Tilt-shift**: a 12-tap golden-angle blur is focused on the sled's screen y. HIGH uses radius 3.5 and MAX uses 5 (scaled by height/900). LOW and MEDIUM have no blur.
- **Quality tiers**: MAX keeps native DPR, density 1.35 (extra stitch highlight splats), 2000 snowflakes and 230 m of draw distance. HIGH caps DPR at 1.5 with a 2 M pixel budget. Density scales the snow banks and trees. LOW and MEDIUM drop to one splat per stitch.
- **Splat counts**: about 300 k splats in view on HIGH, roughly 50–75 draws. The yarn ball model is about 1100 splats.

## Tuning (50-game.js)
- Gravity: grade × 9.8. Friction is 0.03 g on the scarf and 0.55 g in the snow. Drag is 0.0042 v². Push adds 3.4 below 17 m/s and brake removes 7.5. Top speed comes out around 20 m/s.
- Steering is 13.5 lateral (7 in snow, 3.5 airborne). Centrifugal force is −0.75 v² κ. The scarf sags 0.1 m at the edges and the banks rise at 0.38, so the sled gets pushed back toward the scarf.
- A jump gives +6.2 vy, with 13.5 gravity in the air. The ramp launch is v × (1.1/3.6) × 0.95 + 1.5.
- An autopilot full run (`test/shot.py full`) finishes in about 90 s with all 8 pals and about 9300 points.

## Levels (45-levels.js)
- Level N uses theme (N−1) mod 6: Sunrise, Clear Day, Snowfall, Sunset, Starry Night, Christmas Lights. The Christmas Lights theme sets `lights:true`; switching it on or off rebuilds the chunks and arches so the bulbs are baked in or left out. Each theme sets sky, light, fog distance, snowflake count and size, and the backdrop (tint, sun/moon, stars, cloud colour).
- `diffFor(level)` controls the weights for mogul fields, needle gates and slaloms, plus how many yarn balls a field has and how far apart. Yarn + needle obstacles per level, levels 1–6: 16, 43, 63, 81, 84, 95. Every level has its own course seed.
- Finishing a run unlocks the next level (`localStorage` keys `mm_unlocked`, `mm_level`). The best score is kept per level (`mm_best_<n>`). The menu has a ◀ ▶ picker for unlocked levels. The end card offers LEVEL n+1, SLED AGAIN and MENU.
- **Finish celebration**: once the sled stops after the line, every rider hops off into an arc in front of a felt cocoa stand. Even-numbered riders cheer and hop. Odd-numbered riders hold a cocoa mug (marshmallows, rising steam) and sip from time to time (`armRX` forward arm swing, `headNod`, `mug` pose fields in `drawAnimal`). Felt confetti falls, a cheer sound plays, and the camera swings round to the front. The end card sits low on the screen so the party stays visible.
- Test API additions: `MM.level(n, unlock)`, `MM.lv()`, `MM.counts()`, `MM.celeb()`. Harness scenarios: `levels` (obstacle counts and one screenshot per theme) and `celeb`.
