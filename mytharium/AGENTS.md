# Mytharium — notes for agents

`mytharium.html` is a single-file WebGL2 fantasy terrarium: a 120 x 60 x 54 cm front-opening glass vivarium with palm-sized
unicorns (and a foal), faeries, a mermaid in the pond, a hatchling dragon, a gnome, an optional pegasus and a rare phoenix
visitor. Players care for it (mister, heat lamp, light cycle, feeding with tweezers, petting, carrying creatures, wiping the
fogged glass), landscape it (plants, stone, builds, terrain sculpting, ground-cover paint, digging the pond) and fill in a
journal of observed behaviours and photos.

Players never need URL flags: quality (Low / Medium / High / MAX), depth of field, AO, sound, light mode, heat lamp and the
camera views are all in-page buttons. URL flags (`?test&seed=N`, `&q=low|med|high|max`, `&nofloat`) are for headless tests only.

## Building

The HTML is generated. Edit the files in `parts\`, then run `python build.py` (it concatenates `parts\*` in name order into
`mytharium.html`). Never hand-edit `mytharium.html`.

| Part | What is in it |
|---|---|
| `00-head.html` | Page, CSS, HUD markup (card, top buttons, views, help, bottom bar, sheet, selection, tool bar, journal, photo bar) |
| `01-core.js` | Math, noise, GL helpers, `MB` mesh builder, `tube`, `grid`, `icosphere`, `box`, `M3` rotations, colour helpers, logging (`[MY]`) |
| `02-shcommon.js` | Shared GLSL: uniforms (`C_UNI`), noise, PCSS shadows, point lights (16), heat lamp, pond depth and caustics, room light, mist |
| `03-shstd.js` | Standard surfaces by `uMat`: 1 terrain + cut-away substrate, 2 rock (granite/slate/river/ember), 3 wood/bark, 4 cork, 5 frame, 6 lid screen, 7 room, 8 lamps, 9 cabinet, 10 crystal, 11 mushrooms, 12 masonry, 13 cottage, 14 gold, 15 lantern glass, 16 nacre, 17 moonstone, 18 succulent, 19 food, 20 egg, 21 posts and planks |
| `04-shsplat.js` | Splat shaders: static (plants, ground cover, background greenery), skinned coats (fur, manes, hair, beards, feathers), billboard particles |
| `05-shcreature.js` | Skinned creature meshes (`uBones[24]`, two bones per vertex) with regions (fur skin, hoof, horn, eye, scales, belly, membrane, skin, cloth, claw, muzzle, beak, fin, lips, feather base, nose) and the faerie wing shader |
| `06-shpost.js` | Pond surface, waterfall sheet, glass with condensation and wipe mask, ripple simulation, true caustics, mist light shafts, SSAO, DOF, bloom, ACES |
| `10-sdf.js` | 48-byte splat records (`SB`), signed-distance primitives, narrow-band surface nets, skin weights, eyes, vertex AO, forward kinematics, two-bone IK, coat sampling, strands |
| `11-creatures.js` | Bind-pose bodies and rigs (unicorn/pegasus, faerie, mermaid, dragon with membrane wings, gnome, phoenix), coats, `hairStrands`, wing outlines, `CRT` registry |
| `12-genplants.js` | Splat plants: moss cushion, grass, clover, foxglove, bluebell, forget-me-not, fern, fittonia, sundew, bonsai foliage, leaf litter |
| `13-genhard.js` | Meshes: rocks, slate stack, driftwood, bonsai trunk, geode, mushrooms, arch, tower, mushroom cottage, shell, hoard, lantern, bridge, egg, moonstone, succulents |
| `14-gentank.js` | `TK` tank constants, glass, frame, lid, LED bar and heat lamp, the carved mahogany stand (`genStand`), panelled room and rug |
| `20-world.js` | Terrain height field (0.5 cm) and cover weights, pond mask, terrain mesh with skirts, cork background and waterfall, ground-cover chunks, `CAT` catalogue, items, walkable height (`topH`), background greenery |
| `30-life.js` | Climate (`TERR`), `SPECIES` and morph colours, creature records, needs, food, particles, journal events, ambient life (falls spray, mist, wisps), point lights from creatures |
| `31-behave.js` | Behaviour state machines per species (`BEH`), phoenix visitor |
| `32-pose.js` | Procedural posing: gaits with foot IK (horses, dragon, gnome), wings, tail and hair swing; drawing creatures, coats, wings, food, pearls |
| `40-render.js` | `QUAL` tiers, programs, render targets, shadow map, pond simulation, wipe mask, camera, light cycle (`DAY`), point lights, render passes |
| `41-studio.js` | Creature studio: one creature alone on a plain sweep with pose presets; the test harness and the in-game Portrait view |
| `45-audio.js` | WebAudio soundscape and effects |
| `50-ui.js` | Starter scape, save/load (`mytharium.v2`; a v1 save keeps only its journal and settings, because the pond moved), sheets, selection, tools, picking, terrain brush, pointer and key input, journal, photo mode |
| `99-end.js` | Resize, tick, main loop, init, test API `window.MY` |

## Look: hybrid renderer
Soft things are painterly Gaussian splats (alpha-to-coverage on the MSAA target, hashed dither on Low): moss, grass, clover,
flowers, ferns, foliage, leaf litter, background moss and fig vines, unicorn coats, manes and tails, faerie and mermaid hair,
the gnome's beard, pegasus and phoenix feathers, mist, faerie dust. Shiny things are HDR meshes: glass, water, rock, wood,
crystals, scales, horns, hooves, eyes, metal, shells. Both share one shadow map and the same lighting functions; splats write
depth so SSAO, depth of field and the pond refraction treat them like any surface.

## Creatures
Bodies are smooth unions of ellipsoids and round cones in bind pose, meshed at start-up with surface nets (about 0.3 s each),
skinned to a bone tree. Poses are procedural: gait phase advances with distance, each foot is planted on `topH` and the leg is
solved with two-bone IK, so nothing slides or walks through rock. Behaviours set targets in `c.at`; `ease()` blends them into
`c.anim`, which the posers read. Yaw convention: forward = (cos yaw, 0, -sin yaw).

## Test recipe (headless)
`test\shot.js` (Playwright + SwiftShader; paths inside are for the cloud build box) opens `mytharium.html?test&seed=1`, waits for
`window.MY.ready`, runs a JSON list of steps (`{"eval":"...uses A..."}`, `{"step":sec}`, `{"shot":"name"}`) and writes PNGs and a log.
`test\geo.js` builds the creature meshes in Node and writes OBJ files; `test\preview.py` renders them to PNG.

`window.MY`: `state()`, `step(sec)`, `frame()`, `cam({target,yaw,pitch,dist})`, `view(v)`, `add(kind,x,z,o)`, `items()`, `crit(sp,o)`,
`get(id)`, `setState(id,state,dur,extra)`, `feed(type,x,z)`, `mist(x,z,sec)`, `time(mode)`, `day(d)`, `set(k,v)`, `tap()`, `select(id)`,
`wipe(u,v,r)`, `humid(h)`, `sculpt(kind,x,z,n,R)`, `photo(on)`, `journal()`, `sheet(k)`, `event(id,key)`, `visitor()`, `pix(x,y)`, `studio(sp,pose,o)` (null exits), `_eval(src)`.
`test\studio.js` + `test\sheet.py`: each creature alone in the studio from five angles, one contact sheet per species.

## Findings worth reusing (not yet copied into SPLAT-GUIDE.md)
* **Procedural creatures in the browser.** A smooth union of 30 to 60 ellipsoids and round cones, meshed with surface nets on a
  narrow band (evaluate the field at 4x4x4 block centres, fill blocks far from the surface with the sign only), costs 0.1 to 1 s per
  creature. Make the field evaluation scalar and allocation free and skip any primitive whose bounding box lies farther than
  `d + k` (it cannot change a smooth minimum with radius k). Pull each vertex onto the surface with one Newton step and take the
  normal from a four-tap tetrahedral gradient. Fix the winding per triangle against the field normal; surface nets' quad order is
  not consistent across the three axes.
* **Never `eval()` the generators.** The same mesher ran 20 to 40 times slower inside a direct `eval` in Node; test it as a plain
  script (`test\geo.js` writes the source to a file and `require`s it).
* **Skin weights from the primitives.** Each primitive names a bone; a vertex's weight for a bone is the sum of
  `exp(-max(d,0)/sigma)` over that bone's primitives, keep the top two. Give limbs hidden under clothing (the faerie's thighs under
  her skirt) a small per-primitive sigma or the skirt bends with the legs.
* **Coats as skinned splats.** Fur, manes, hair and feathers use the same 48-byte record with bone indices and weight in the spare
  bytes, drawn with alpha-to-coverage right after the meshes. A sleek horse coat needs short splats lying almost flat (lift about
  0.05) whose brightness matches the skin under them; bright fur over darker skin reads as sheep's wool.
* **Hair that hugs the head.** Walk each strand along the scalp ellipsoid (project the wanted direction onto its tangent plane and
  re-project onto the surface) until it passes the back or sides of the head, then let it fall. Strands that leave the scalp along
  its normal make a bell of hair that hides the face and body.
* **Line masks in shaders.** `smoothstep(a, 0, abs(fract(x) - .5) - .45)` is 1 almost everywhere (inverted). Use
  `smoothstep(w, 0, .5 - abs(fract(x) - .5))`, and clamp sums of masks before `mix`, or albedo extrapolates negative (this showed
  as bright green dragon wings).
* **Fine screens in front of bright lights.** A perforated lid drawn with `discard` makes magenta and green moiré over the LED bar
  once chromatic aberration is applied. Fade the pattern to its mean coverage by `fwidth` and draw it with alpha-to-coverage.
* **Tools versus sheets.** Picking a tool must close the bottom sheet, or the sheet covers the tank and taps never reach the canvas.
* **Concept art as the target.** `concepts\` holds six ImageGen concepts (job `imagegen-jobs\mytharium-concepts-001`). Matching
  them meant: long-legged slim unicorns with floor-length manes falling on the near side, faeries in petal skirts with flower crowns
  and big wings, orange backlit dragon membranes, a lusher warm side (golden grass plumes, succulents), lily pads on the pond, a
  warm room, and night scenes carried by thicker mist plus brighter mushroom, lantern and faerie glows. Stretching a rig's legs
  means moving the IK ankle bind heights and every pose reference point (head, back, horn, lie offset) by the same amount.
* **Splat coats and sheen.** A strong grazing sheen on fur splats reads as sequins under the LED. Keep it near 0.07.
* **Running as a claude.ai artifact.** The game is also published as a private artifact
  (https://claude.ai/artifact/6UPzzEC2aasNSM7AbfZnXS, declared capability `downloads`). Inside the viewer a plain
  `<a download>` does nothing, so photos go through `saveFile()`, which uses `claude.use('downloads')` when `window.claude`
  exists and a normal link otherwise. A refused fullscreen request rejects a promise; catch it rather than relying on try/catch.
  To republish after a rebuild, publish `mytharium.html` as `index.html` to that artifact.
* **Creature studio harness.** `node test/studio.js ../mytharium.html /tmp/st [species,...] ['{"dragon":["idle","fire"]}']` renders each
  creature alone (side, three-quarter, front, back, face) and `python3 test/sheet.py /tmp/st` makes one contact sheet per species.
  Look at creatures there before judging them in the busy tank; it is how the hair, tail and dragon problems were found.
* **Hair as clumped locks.** A guide curve starts at the root, bends under gravity and is pushed out of the creature's own signed
  distance field each step (`drapeGuide`), so manes and long hair fall over necks and shoulders without hand-placed clamps. Each
  lock is 15 to 35 thin strands around the guide, wide at the root and gathered at the tip, with per-strand segment counts so splat
  ends never line up (aligned ends read as horizontal bands), a dedicated even-width strand shape (5) instead of the tapered grass
  blade, and lighting normals from the SDF gradient. Two Kajiya-Kay lobes (white primary, hair-tinted secondary) sell the silk.
  Colour the skin under hair with the hair colour (region 16 via `regf`) so gaps never show bare skin.
* **Fins from the aquarium.** Thin fan meshes whose rays radiate from the root (`aUV.x` = ray coordinate, `aCol.b` = 0 root .. 1
  edge), drawn with the skinned body but given alpha through alpha-to-coverage (hashed discard without MSAA); flutter is a sin
  along the edge in the vertex shader before skinning. Overlapping scales: rows offset by half a cell, the dark rim on the
  posterior edge, a domed normal per scale, faded out by `fwidth`, countershaded and thin-film iridescent.
* **Bind-space triplanar.** For patterns that must stick to a skinned body (dragon scales) take the plane weights from
  `cross(dFdx(vO), dFdy(vO))` of the bind position, not from the posed normal, or the pattern swims as the creature moves.
* **Underwater window.** The water against the glass is a strip from the pond bed to the water line on the inside of the glass. Its
  shader reconstructs the scene point from a copy of the depth buffer (`RT.D2`, blitted after the MSAA resolve; sampling `RT.D` while
  it is attached to the transparent pass's framebuffer is a feedback loop), takes the path length through water (clipped where the
  ray leaves through the surface), attenuates the scene and adds depth haze; a ray that reaches the surface first shows the silvered
  underside (total internal reflection below about 48 degrees from the surface).
* **Eyes on small faces.** An eye sphere sunk to its rim in the head shows nothing. Let a third of it stand proud, give human eyes a
  white sclera ring, a big iris and an upper lash line; build the iris axes from world up so slit pupils stand upright.
* **Nothing leaves the glass.** Four layers: (1) `geoBounds` gives every item a local box; `updateItem` slides the item inward until
  its footprint is inside the inner glass, so placing, dragging, turning and resizing can never leave part of it outside;
  (2) static splats whose centre is beyond the glass are culled in the vertex shader and the rest have their corners clamped to
  it, so leaves press flat against the pane; (3) creature bodies, coats, wings and particles clamp their vertices the same way
  (`uClip`, off in the studio); (4) `lifeUpdate` holds every creature a body-radius inside the walls whatever its brain asked for.
  The camera boom shortens instead of passing through a room wall or the floor.
* **Timing stages in WebGL.** `gl.finish()` does not block in Chrome. To time a stage, bind a 1x1 framebuffer and `readPixels`
  (restoring the draw and read bindings); `MY.prof(n, cached)` does this after each stage and `test\perf.js` prints the table.
  SwiftShader numbers are relative only: it is vertex-bound where a real GPU is fill-bound. `MY.fr()` reports the live scale.
* **What made the frame cheaper.** The static scene's shadow depth lives in its own texture, redrawn every 10 / 6 / 3 / 1 frames
  (Low to MAX) and blitted under the creatures each frame. Items, ground chunks and creatures outside the view frustum are
  skipped. Splats thin with distance (`lodBox`: below about 10 px per cm fewer, larger splats are drawn by a fixed per-splat
  hash, so nothing flickers; never on MAX). Big creatures have a 1.5x-cell body for shadows and for when they are far away.
  Opaque meshes are drawn nearest first with a build of the surface shader that has no `discard` (the lid alone uses the
  CUTOUT build). Terrain only evaluates the covers present at a pixel. DOF taps scale with the tier.
* **Smooth frame rate.** After a 4 s warm-up, if a second averages over 21.5 ms the render resolution drops (to 50 % at most) and
  climbs back in small steps when a second stays under 17.6 ms, waiting longer after each climb. If two drops do not speed
  frames up, the display is capped (30 Hz power saving): the scale is restored and left alone. MAX never scales.
* **Lush versus sparse.** The first scape had 52 k ground splats and 250 k hair splats: the budget was upside down. Moss as mounded
  cushions (a slow noise lifts each daub, darker low, yellow-green on the crowns), a low green fuzz under the meadow, wildflowers,
  and a lower tank (54 cm, like the concept) did more for the look than any shader change.
* **Start-up must breathe.** `init` is async: every stage (each creature body, far body and coat, each row of ground chunks) is
  followed by a frame's pause, so the loading screen (three fireflies on a transform-only CSS animation, a progress bar and a
  line of text) keeps moving and the browser never offers "Page unresponsive". Shader programs are started without waiting
  (`progStart`), polled with `KHR_parallel_shader_compile` and finished (`programsLeft`) only when the driver is done; asking
  `LINK_STATUS` early blocks the page for as long as the driver needs (seconds with HLSL on Windows). The first frame is drawn
  under the loading screen. The pegasus is built only when one is wanted (`ensureAsset`). `test\load.js` reports the longest
  main-thread block during a real (not `?test`) load.
* **Model limbs away from the body.** In a signed-distance body an arm that hangs against the torso fuses with it, and the shared
  triangles stretch when the arm moves (mermaid combing, faerie dancing, gnome waving). Model the arms spread about 30 to 45
  degrees and bring them in with the pose (`armsIn`, `ARM_A`). Skin weights also only allow the bone that owns a vertex and
  its neighbours in the skeleton.
* **Seated and sleeping.** A creature's `pos` is where it stands; seated poses lower the hips onto that point (the faerie used to
  hover a leg's length above her perch). Sleepers are distinct poses: the faerie curls on her side, the unicorn rests its chin
  on the ground beside its forelegs. Overlapping ground creatures ease apart every frame (wider when lying).
* **Saves are versioned by pond shape.** `mytharium.v1` key, field `v:3`; an older save keeps only its journal and settings.
* **Reaching for something: IK, not hand-tuned angles.** The mermaid's combing hand follows a target that strokes down the hair beside
  her head (`solveLeg` on the arm bones after a first `fk`, blended in with `M3.slerpish`, then `fk` again). Stacked Euler angles
  put the hand somewhere near; a target puts it there.
* **Long bodies need capsules.** Separating creatures by circles lets two lying horses overlap end to end. Each ground creature is a
  segment along its heading with a radius (wider when lying); pairs are pushed apart along the line between the nearest points.
* **The mermaid only swims in water.** States: `haul` (swim to open water beside the rock or beach spot), `climb` (up and over the
  edge, turning to sit facing the pond), `bask`/`sing`, `dive` (slide back to the water beside her, still sitting; swim pose only
  once under). A guard sends her through `dive` whenever a swimming state finds her out of the water (the dragon stealing a
  pearl used to make her "splash" while sitting on the rock). `swimFree` is water deep enough and clear of solid items;
  `swimRoute` goes straight when the line is clear, else along `SPINE` points of the pond (Dijkstra over at most eight nodes,
  twice a second), with local side-stepping as a fallback. She suns on rocks (`baskRock`: nearest, lowest) and on the beach
  (`beachSpot`). Floating upright in water shallower than her tail, the tail curls back (`curlT`) instead of sinking into the bed.
