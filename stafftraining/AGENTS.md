# Staff Training — agent notes

You are the cat. The staff are a human couple, Marcus ("Can Opener") and Dana ("The Lap"). Six lessons from the manual, each a short
scenario in one apartment: wake them for breakfast, con a second breakfast, make the laptop a bed, drill doors, teach fetch, take the bed.
Heavy on humour: the manual's smug narration, the staff's speech bubbles, and the report card carry most of it.

`stafftraining.html` is generated: **edit `parts/*`, then run `python build.py`.** No other build step.
Test API: `window.ST`. Headless harness: `python test/shot.py menu | js ... | lessons [n..] | fuzz [n..] | mobile`.

## File map (parts/)
| file | what |
|---|---|
| `shell.html`, `style.css` | page skeleton, HUD, manual pages (menu, briefing, pause, report card) |
| `00-util.js` | math, seeded RNG (`rnd`), `SAVE` (localStorage `stafftraining.*`, try/catch), mat4, `compose()` |
| `10-gl.js` | the Doorbusters cartoon renderer relit for a room: instanced box/cyl/sph/quad, sets `room` (static, no shadow), `stat`, `dyn`, `dynN` (per-frame, no shadow), `glass`; toon bands, shadow map, MSAA MRT + ink lines; procedural materials picked by `aR.x` (1 wood floor, 2 floor tile, 3 rug, 4 wall, 5 quilt, 6 wall tile, 7 stripes); `QUALITY` tiers |
| `20-world.js` | apartment: `WALLS`, `FURN` (colliders that are also cat platforms, with `base`/`top`), `DOORS`, `SPOT` (named staff positions), static geometry, atlas art, collision (`collideCat`, `supportAt`, `topAt`), sight lines (`losClear`), camera ray, nav grid + A* for the staff |
| `30-cat.js` | cat state `CAT`, tank movement, jump targeting, edge guard on furniture, zoomies, pose blending and the cat model |
| `40-humans.js` | staff rig (two-bone IK arms and legs, named poses), plans as step lists (`go`, `seat`, `lie`, `chase`, `pose`, `say`, `do`, `until`), perception |
| `50-sim.js` | game state `G`, time-of-day presets, all the staff lines (`LINES`), props (knock, fall, shatter, fetch), stimuli and resolve (`MOVES`, `applyStim`, `pressure`), retaliation (spray, time-out), doors, context actions (`buildContext`, `do*`) |
| `60-lessons.js` | the six lessons: setup, staff schedule, what they can be talked into (`demandFor`), objectives, extra credit |
| `70-audio.js` | procedural WebAudio: meow (three levels), purr, staff gibberish voices, crashes, music loop |
| `80-input.js` | keyboard, gamepad, touch (floating left joystick: up walks, sideways turns; five buttons) |
| `90-main.js` | lesson flow, report card and grades, HUD and world labels, chase camera, per-frame scene, main loop, `window.ST` |

## How it plays
- Controls: W/S walk, A/D turn, Space JUMP (hops onto the nearest furniture ahead, rise up to 1.36 m), Q MEOW (escalates over three presses),
  Shift ZOOM, E MISCHIEF, F CHARM. Mischief and Charm are context buttons; `buildContext()` decides what each does and the HUD shows the label.
- Each staff member has **patience** (0-100) and, while you are demanding something, **resolve** (`h.demand.will`). Mischief lowers both.
  Charm restores patience and adds **guilt**, which multiplies pressure by `1 + guilt/100`. Resolve at 0 = they give in (`demand.def.comply`).
  Patience at 0 = retaliation: Dana fetches the spray bottle, Marcus carries you to time-out and shuts the door (lessons can override).
- Couple rules: staff within 5 m and in sight of each other halve the pressure on each other ("united front") unless the bystander has guilt >= 60;
  a bystander with guilt >= 60 blocks one retaliation ("defended"); in lesson 2 they share what they know when within 2.3 m.
- Dignity (cat, 0-100): spray -26, carried -12, bonk -4, scratching post while watched -6. GROOM within 7 s gives half back; the box restores 5/s. 0 = lesson failed.
- Asleep staff have a sleep bar; `wake` values in `MOVES` scaled by `pers.sleepK` (Marcus 0.6, Dana 1.5).
- Personalities (`makeHuman`): Marcus annoy 0.8, push 1.25 (soft touch). Dana annoy 1.2, push 0.85 (holds out, needs charm).
- Trained levels persist in `stafftraining.train` (`{feed:[m,d], door:..}`) and cut starting resolve by up to 45 %.

## Lessons (60-lessons.js)
| # | id | core | resolve values |
|---|---|---|---|
| 1 | `breakfast` | wake a sleeper (taps, stare, meow), then pressure until they feed you; eat | feed: Marcus 75, Dana 100, already fed 170 |
| 2 | `second` | get fed by both before they compare notes (within 2 m); a full bowl seen within 2.2 m is evidence | feed: 82 / 98, knows you ate 150 (eased 2026-11-26 after the user found it a tad hard; the lesson also runs 214 s, was 180) |
| 3 | `laptop` | sit on the laptop, get removed, repeat until Marcus gives up; claim a lap for 8 s | laptop 230, lap 85 |
| 4 | `doors` | paw or meow at a closed door, then do not go through: one rep; staff take turns; 3 reps props a door | 60 / 78 x 0.85^reps, occupied bathroom 50 |
| 5 | `fetch` | knock sturdy things down, staff put them back; an item is put away after its 2nd fetch | none (fetch is a reaction) |
| 6 | `bed` | STRETCH between them to push them outward, LOAF to hold; 70 % share, then stay until both sleep | none |
Lesson length is `(end - start) / rate` seconds (about 165-200 s). FINISH appears once the main objectives are done; staying on earns extra credit.
Grade: 62 + 10 per extra credit + up to 4 for dignity + up to 4 for staff patience - 4 per meltdown; A+ 96, A 86, B 76.

## Findings worth keeping
- Chase camera in small rooms: when the ray behind the cat is blocked below 30 % (back against a wall, on a counter), score seven yaw offsets
  (0, +-0.7, +-1.4, +-2.1 rad) by clearance and swing to the best one with hysteresis (`camUpdate`). Pulling straight in put the camera inside cabinets.
- Staff cannot walk onto furniture, so "reach the cat" uses a larger radius when the cat is elevated (`stepChase`, 1.45 m for a pick-up).
- Edge guard: on furniture the cat stops at the edge unless the stick is held forward for 0.32 s, then hops down. Without it tank controls fall off counters.
- Staff behaviour is a plan = list of steps; interrupts replace the plan and `LESSON.schedule(h)` supplies the next default one, so every schedule starts
  with `stepSeat`/`stepLie` (no-ops when already there) to send the person back.
- Lying poses use root `rx = -PI/2`; the body extends toward `-forward`, so a sleeper with `h = 0` has feet at `(x, z)` and head 1.55 m north.
- Sandboxed frames (the Claude file preview, some embeds) throw `SecurityError` from `navigator.getGamepads()` and can throw from `localStorage`. The first build called `getGamepads` unguarded every frame, so the lesson froze on frame one in the preview. Both are now in try/catch, the gamepad is not asked again after a refusal, and the frame loop catches a failed sim step so rendering continues. `python test/shot.py mobile sandbox` imitates such a frame.
- Phone-only rendering faults found by the user's first play (none show in SwiftShader or on desktop):
  - Ink pass: `sampler2D` defaults to **lowp** in a fragment shader, and phone GPUs honour it. Sampling the depth texture at lowp bands the depth into contour lines that crawl over walls and floors as the camera moves. Declare `uniform highp sampler2D uD`.
  - The ink edge test is now a second difference of depth (`2*d0 - left - right`), which is zero on any flat surface however steeply it is viewed.
  - Procedural patterns (planks, tiles, rug and pyjama stripes, quilt) fade out by `fwidth` as they approach pixel size; hard `step()` patterns shimmer at a distance. The wall stripes were removed.
  - Two walls that meet at a corner must not share a coplanar face. The two-skin interior walls overlapped at the bedroom and bathroom corners and z-fought in flickering stripes; one wall now stops at the other and a thin cap hides the two-colour end.
- Walls (found by the user): a jump is a scripted arc, so its landing point must be checked with `pathClear()` (walls, closed doors, the front door) before it starts. The first build picked furniture or a pounce point on the far side of a wall. Ordinary movement is sub-stepped in 6 cm pieces, because zoomies at 20 fps move 29 cm a frame and a wall is 12 cm thick.
- Door requests are keyed per door (`door:bed`, `door:front`) and the demand's `def` is refreshed on every press. The first build kept the first door's `comply` closure, so pawing the front door after the bedroom door sent Marcus to the bedroom. `python test/shot.py walls` covers both.
- The cat's voice (`AU.voice` in `70-audio.js`) is a small formant synth: a PeriodicWave with every harmonic (about 6 dB an octave, weakened fundamental) through three bandpass formants whose centres move, a "mouth" lowpass that opens and closes, late vibrato, a little pitch wander, breath noise, and for the demanding meow a 30 Hz rasp at the start. `meowSpec(n)` holds the three levels as point lists (pitch, formant 1, formant 2, envelope). The first version was one swept bandpass over a sawtooth and read as a kazoo. Nobody on the building side can hear it: `python test/shot.py meow` renders the calls offline, checks level and length, and writes `test/out/meows.wav` for the owner to judge.
- `showBrief` must hide the report card. It did not, so NEXT LESSON seemed to do nothing, and repeated taps walked `G.li` past the last lesson and threw. `python test/shot.py next` taps through every lesson to the diploma.
- Delayed lines use `later(sec, fn)` on game time, not `setTimeout`, so headless stepping stays deterministic.

## Test recipe
```
python build.py
python test/shot.py menu                 # menu screenshot
python test/shot.py lessons 0 1 2 3 4 5  # a scripted bot plays each lesson to completion and prints objectives (run two or three at a time: they are slow)
python test/shot.py fuzz                 # 130 s of random input per lesson; fails on NaN positions, prints the context actions it saw and any console errors
python test/shot.py mobile               # 390x844, real loop, real taps and a real touch joystick drag; add `sandbox` to make the Gamepad API and localStorage throw
python test/shot.py walls                # jumps, hops, edge drops and 20 fps zoomies against walls and closed doors; front-door request opens the front door
python test/shot.py meow                 # renders the meows offline, sanity-checks them, writes test/out/meows.wav
python test/shot.py next                 # real taps: report card -> NEXT LESSON -> BEGIN for every lesson, in a locked-down frame
python test/shot.py card                 # stages and renders the arcade card (test/out/stafftraining.webp, 800x560); the lobby copy is assets/arcade/stafftraining.webp
python test/shot.py js "ST.start(2)" "ST.step(3)" "shot:name" "ST.state()"   # prefix with size:390x844 for a phone viewport
```
Screenshots go to `test/out/` (git-ignored). The harness serves this folder on port 8771 and runs Chrome with SwiftShader; `?test` stops the real-time loop so `ST.step(sec)` drives the sim.
`ST`: `start(i)`, `step(sec)`, `render()`, `input({thr,steer})`, `press('jump'|'meow'|'zoom'|'mis'|'charm'|'finish')`, `tp(x,z,h,y)`, `state()`, `finish(win)`, `setQuality(q)`, plus `G`, `CAT`, `HUM`, `PROPS`, `DOORS`, `BOWL`, `lesson()`. With `?test`, `G.log` records every spoken line and manual tip.
Measured 2026-11-26: all six lessons completed by the bots; fuzz ran all six with no errors; phone run registered joystick, all five buttons and pause.
