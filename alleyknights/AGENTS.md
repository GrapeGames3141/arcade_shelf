# Alley Knights — agent notes

You are a raccoon knight with a galvanized trash-can lid for a shield and whatever is in the dumpster for a sword. Every
**night** varmint factions try to take your alley. Run them off: drain each faction's **nerve** to break it. Break every
faction for a **clean sweep**, or hold out until **dawn**. Lose the den (the couch) and you are **evicted**.

Mesh-based WebGL2 (not splats), single HTML file with no external assets, synthesized audio. Engine derived from
Cartastrophe (same vertex/instance layout, `MB` builder, renderer structure), re-lit for a wet alley at night.

## Files
- `alleyknights.html` — the built game. **Generated. Edit `parts/`, then run `python build.py`.**
- `build.py` — concatenates `parts/*.html` then `parts/*.js` (name order) into one `<script>`.
- `parts/00-head.html` — markup + CSS: title, HUD (night timer, faction nerve bars, food, grit/lid/weapon, boss bar,
  dumpster markers), touch buttons, intro card, pause, dawn proclamation + pawn shop, eviction screen.
- `parts/10-util.js` — math + seeded RNG (copy of Cartastrophe's).
- `parts/20-gl.js` — renderer: instanced meshes, moon shadow map (PCF), up to 16 point lights (`RND.lights`/`lightC`,
  falloff `1/(1+7d²/r²)` with a smooth edge), procedural materials by negative `par.z`: -1 brick (distance-faded mortar),
  -2 wet asphalt with puddles (low roughness so lamps streak), -3/-4 concrete, -5 painted metal with rust, -6 wood,
  -7 fabric. Night sky with stars + clouds, fog, ACES. `glProject` for HUD markers. No water pass.
- `parts/30-meshes.js` — `MB` + meshes: generic sph/cyl/box/glow/ring/splat, the lid (+ dented), weapons (`w_*`),
  dumpster body + hinged lid half, cart + caster, props, passing car.
- `parts/40-world.js` — layout constants, `STATICS` + `staticClosest` (signed distance, boxes rotated by `ang`), `topAt`
  (dumpster tops/couch you can stand on), atlas (neon signs, graffiti incl. the Alley Knights crest), `LIGHTS`, static mesh.
- `parts/50-critters.js` — `KINDS`, `BOSSES`, `Critter`, `hitCritter`, `critterPhysics` (hazards), `separate`, AI.
- `parts/55-knights.js` — `WEAPONS`, `Knight`, movement/attack/block/bash, lid loss, rummage, ketchup/traps/hubcaps,
  the cart, crew AI.
- `parts/60-draw.js` — posed characters from instanced spheres/cylinders: `drawRaccoon` (knights + bandits),
  `drawQuad` (rat/possum/cat/skunk), `drawBird`, `drawCart`. Eyes are emissive (eyeshine reads at night).
- `parts/70-game.js` — settings/save, `UPGRADES`, `nightPlan`, `GAME`, `startNight`, faction nerve, hazard KOs,
  dumpster claims, den raids, spawning, night end, `physicsStep` (fixed 1/60), projectiles/traps/lids/clouds, `botThink`.
- `parts/75-view.js` — events → sound/particles/callouts, effects, camera, sky/dawn, lights per frame, scene, quality.
- `parts/78-ui.js` — HUD, screens + shop, menus, input (keyboard, mouse, gamepad, touch), loop, boot.
- `parts/80-audio.js` — WebAudio SFX (formant voices per varmint), cart rattle loop, walking-bass alley jazz.
- `parts/90-test.js` — `window.AK` test API, then `boot()`.
- `notes.md` — design and tuning. `test/` — headless harness.

## Layout (metres, y up)
Alley x -6..6, z -26 (chain-link fence) .. 26; sidewalk/curb at z 28.2..30.4, street beyond (cars pass at z 33-35).
Dumpsters `DUMP_SPOTS` against the walls (Pizza R z17.5, Laundry L z9, Noodle R z-4.5, Fence L z-16.5), front faces the
centre (`fx,fz`). Den couch `DEN` (-4.85, 1.2); raid point is 1 m in front. Open manhole `MANHOLE` (1.6, 7.5).
Entries: street, fence (varmints hop it), sewer (rats pop out), fire-escape drops (cats), sky (birds).

## Rules
- Night length `min(240, 140 + 12n)` s. Plans in `nightPlan`: 1 rats, 2 +possums, 3 Possum King, 4 cats/pigeons/rats,
  5 skunks/cats/possums, 6 Fat Tomcat, 7 gulls/skunks/rats/possums, 8 Big Rocco + bandits; 9+ random 3-4 factions,
  boss every 3rd night. Faction nerve = base × 2.8 / √(factions).
- Nerve drain: 8% of damage dealt, plus the kind's `nerve` value per varmint sent running (×1.4 binned, ×1.25
  flushed/curbed). Boss: faction can't drop below 1 while the boss is in; beating it costs 40 nerve.
  Varmint-held dumpsters regenerate their faction 0.25/s each. Nerve 0 = faction breaks, all its members run.
- Dumpsters: you claim with no varmints near (1.6 s from neutral, 2.4 s from a faction); a faction claims at
  0.11/s per member (birds 0.08), max 3. Yours give +1 food every 9 s and can be rummaged (E): 68% weapon (80% with
  Trash Sense) else 3 food, 18 s cooldown.
- Den: varmints in `claim` state at the raid point, no knight within 2.8 m: raid meter += min(1.2, 0.4 + 0.15n)/s,
  steals 1 food per 2.2 s. `DEN_MAX` 30 = evicted (night lost, stash reverts to dusk). Defended: -2.5/s.
- Stars: survive; stash gained ≥ 6 + 3n; clean sweep (+5n food bonus).
- Hazards (`critterPhysics`, `GAME.hazardKO`): walls/fence/dumpster sides above 5-5.5 m/s within 2.5 s of a hit =
  12 + 2.5v bonus damage; landing in a dumpster from a launch (`launchY0 < 0.6`) = BINNED; manhole = FLUSHED; past
  the curb = CURBED. A tumbling varmint bowls others over (STRIKE!).
- Knights: grit 100 (+25/Thick Fur), regen 3/s after 3 s unhurt, 0 = dazed 3 s and drops the weapon. Block cone 66°
  (+12°/Steel Lid); blocked damage ×1.1 goes to the lid; lid 0 = flies off (walk over it to get it back at 60%).
  Bash = attack while blocking: 0.24 s dash at 9 m/s, 8 dmg, 11 m/s shove, breaks bandit guard.
- Weapons table `WEAPONS` (dmg, reach, arc, wind/act/rec, kb, up, uses). 7-iron charges up to 1 s (×3.5 dmg). Pan
  CLANG stuns within 2.7 m. Racket ×3 vs birds. Antenna ×3 vs playing-dead possums. Ketchup slicks (16 s), traps
  launch 7.5 m/s, hubcaps bounce once and pierce 3.
- Varmints: possums play dead (×2 damage while down), cats circle then pounce (a blocked pounce flips them:
  PARRIED), skunks turn their back and spray a cloud (block facing them or get STINKY: 3.5 dps + wobbly steering),
  pigeons perch on dumpster lids (a hit scatters the flock for 2.5 s), gulls dive and steal your weapon (block = bonk),
  bandits sometimes carry lids (front hits blocked; bash or pan or hit from behind).
- Cart: one per night, tipped over at a random `CART_SPOTS`. E to flip/ride. Kick-scoots to 9.8 m/s; rams do 3.2×speed;
  wear from rams, walls and riding; <70 casters wobble, <40 one drags, <15 it snaps and pulls hard; 0 = it falls
  apart (CLEANUP ON AISLE ALLEY! if that last hit was a ram, else you're dazed).
- Upgrades (`UPGRADES`, saved in `localStorage['alleyknights.save']`): Steel Lid, Thick Fur, Heavy Paws, Trash Sense,
  Recruit a Knight (crew AI, max 2), Cart Grease.

## Controls
PC: WASD camera-relative, J/left click attack, K/right click/Shift block, Space jump, E/F action, Q/R camera, V high
camera, Esc pause. Gamepad: left stick, right stick camera, X attack, LB/RB/LT block, A jump, B action, Y camera.
Touch: floating joystick under the left thumb (up = forward), ATTACK / BLOCK / JUMP / ACT on the right, drag the empty
right side to turn the camera, left-handed mirror.

## Test API (`window.AK`) and URL flags
`?test` stops the real-time loop (rendering continues); `&run` lets it run; `&seed=N`, `&q=low|medium|high|max`,
`&auto` (autopilot), `&play&night=N` (skip the title).
`AK.start(n, {auto, up, food})`, `AK.advance(s)` → `AK.state()`, `AK.setInput({mx,mz,attack,block,jump,action})`,
`AK.give(weapon)`, `AK.spawn(kind,x,z)`, `AK.teleport(x,z,yaw)`, `AK.critters()`, `AK.cart()`, `AK.dawn()`,
`AK.setCam(pos,tgt,fov)`, `AK.cam(mode,yaw)`, `AK.quality(q)`, `AK.perf(frames)`, `AK.autopilot(on)`.

## Headless test recipe
Playwright + Chrome with SwiftShader (`test/shot.py` holds the launcher; set `CHROME`). Scripts (run from this folder):
`shot.py` (title), `play.py [night] [secs]` (autopilot with screenshots), `nights.py [secs] [first] [last]` (pacing
table per night), `gallery.py` (every varmint, knight block/swing, cart, dawn screen), `mobile.py` (844x390 touch
layout + real joystick drag), `ui.py` (real-time click-through: PLAY, keys, pause/resume). Output in `test/out/`.
The autopilot (`botThink`) plays well enough to find crashes and gross pacing problems; it is not a human. As of
2026-11-23 an unupgraded bot clean-sweeps nights 1-3 in 70-150 s and reaches dawn on 4-6.

## Gotchas
- Atlas text on wall faces needs the U flipped (both walls) or it reads mirrored.
- Neon faces need a dark base colour: emission is multiplied by atlas alpha, the transparent part shows the base.
- A fully metallic lid reflects the black night sky; keep metal ≈0.35 so it catches the lamps.
- `glPush` marks the queue dirty; the static world mesh is pushed once (`isStatic`) and never reset.
- Bird binning: only count BINNED when the launch started low (`launchY0`), or perched pigeons fall in when hit.
