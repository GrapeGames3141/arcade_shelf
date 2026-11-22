# Volcanic Island Walk: notes for agents

`procedural-demo.html` is the whole demo: one file, no build step, no assets. Everything is generated at load, which takes about 9 to 10 seconds in a headless browser (growing the trees is about 1.5 s of that). It is an experiment, kept out of the lobby and the Pages build.

## Testing

- Serve the folder over HTTP and drive it with Playwright and Chrome on SwiftShader (`--use-angle=swiftshader --enable-unsafe-swiftshader`). Collect console errors and page errors, and take screenshots. Do not judge it by watching the screen.
- At 960 by 540, SwiftShader draws a high-quality frame in roughly 2 to 6 seconds, and longer in dense forest. After moving the camera, wait at least 6 seconds before a screenshot. Use `?q=medium` for quick framing checks and `?q=high` for final checks.
- Movement uses a clamped frame step, so crabs and other timed motion run slower than real time when frames are slow.
- `ISLAND.state()` reports the render setup (`render`: HDR, quality, MSAA samples, exposure, passes), `generationMs`, erosion, plant counts, `vegetationTris`, canopy, weather, surf and `life`.

## URL flags

The user does not type URL flags: every setting a player needs gets a button (QUALITY, GROWN TREES, STORM, SOUND). Keep URL flags for headless tests.

- `?q=low|medium|high` sets the quality tier. Phones and windows under 560 px default to low.
- `?hdr=0` forces the 8-bit fallback, which is also used when float render targets are missing.
- `?view=0|1|2` opens an orbit view. `?test=swim|falls|stream|lava|vent|forest|wind|wave|lagoon` opens a fixed test pose.

## Test API (`window.ISLAND`)

`state()`, `testSpawn(x, z)`, `setStorm(blend, wet)`, `look(yaw, pitch)`, `orbit(az, el, dist, target)`, `viewAt(x, z, dist, az, pitch)` (stand `dist` metres from a point and face it), `plantSamples()` (a few positions per plant species), `crabs()`, `floaters()`, `lookAtBird(0)` for a frigatebird or `lookAtBird(1)` for a tern (this holds the birds still), `aimAtBird(k)` to re-aim from the actual camera once it has settled, `releaseLife()`, `holdCrabs(on)` to stop crabs fleeing while you frame one, and `groundAt(x, z)`, `creekProfile()` (level, terrain and base height at every creek node), `seaLife()`, `lookAtSea(kind, dist)` and `aimAtSea(kind)` (kind 0 yellow tang, 1 convict tang, 2 bigeye scad, 3 parrotfish, 4 shark, 5 dolphin, 6 turtle, 7 eagle ray), `setTrees("grown" | "classic")`, `treeStats()` (growth time, metamers, sprays, wood segments), `listTrees(minHeight)` (index, position, height, species, sprays and neighbours within 4 m for every tree), `viewTree(index, dist, az, pitch)`, `canopyLoad()` (triangles and instances per canopy module) and `streamBanks()` (water level and the natural and carved ground at both bank edges, every metre of both channels).

## Where things are in the script

Search for the comment banners. In order: capabilities and quality (`PARAMS`, `QUALITY`, `HDR`, `SHADER_DEFINES`); the sky model (`SKY`, `updateLight`); `commonGLSL` (sky ambient, fog, GGX, `emit`); the shaders; terrain (`H0`, the erosion bake into `ERO`, the fine `heightGrid`, `terrainTex`); the seeded scatter (palms, trees, boulders, sea rocks); the plant atlas and species (`PCELL`, `strapLeaf`, `card`, `archLeaf`, then palm, pandanus, hau, naupaka, morning glory, banana, heliconia, tree fern, ferns, shrubs, litter, lianas); plant placement; the creek profile (`creekPools`, `creekWaterAt`, `creekBedAt`, `creekHalfWidth`, `streamGround`) and the stream builders (`buildStreamLining`, `buildStreamWater`); canopy modules (`buildTrunkModule`, `buildArmModule`, `buildSprayModule`, `buildSegmentModule`, `FAR_KIND`), the classic arm graphs (`growRootGraph`) and right after them the self-organising trees (`sotGrowForest`, which fills each root's `sprays`, `wood`, `woodFar` and keeps `classicArms`), far cards and canopy fillers; grass; wildlife (`updateLife`, `buildLife`); sea life (`fishMesh` and the other mesh builders, `seaKinds`, `schools`, `animals`, `pod`, `updateSeaLife`, `drawSeaLife`); render targets and `postProcess`; and `draw(t)`.

## Rules that keep the island stable

- The historical scatter uses one random sequence, `R()`. Keep the number of `R()` calls per object the same, or every later palm, tree and rock moves. The palm builder burns the 76 calls the old palm made. New content uses its own `plantRng(x, z, salt)`.
- Erosion is masked away from the lava route, streams, falls, vent, grove and test poses. The lava route is traced on the coarse pre-erosion grid (`gridHeightCoarse`).
- Authored colours are display values, and shaders convert them with `linearOf` (a 1.4 power). Plant cards multiply the atlas by 0.56 to match the scene's foliage.
- A plant card carries its atlas UV plus 1 in attribute 8 (`uv2`). A value of 0,0 means "not a card". The shadow pass alpha-tests the same atlas.
- The mesh shader flips normals on back faces of foliage, so a leaf's front face must agree with its stored normal. `strapLeaf` chooses the winding to match, and `card` uses ax × ay.
- With MSAA, foliage and far cards draw with `SAMPLE_ALPHA_TO_COVERAGE` and output coverage as alpha. Nothing reads the scene alpha afterwards.
- The planar reflection mirrors the projection, so it sets `gl.frontFace(gl.CW)` around its mesh draws.
- Texture units in the mesh pass: 1 sun shadow, 2 plant atlas, 3 dapple, 4 and 5 raw shadow depth (through sampler objects), 6 near shadow, 7 contact, 8 grain, 9 shore, 10 bark, 11 shelter, 12 sand, 13 sky table, 14 reflection, 15 terrain detail. A unit holding the wrong texture type for its sampler raises "Mismatch between texture format and sampler type".
- The creek water, its lining, the terrain carve and the walker's ground all come from `creekWaterAt(s, a)`, `creekBedAt(s, a)` and `creekHalfWidth(s)`. `a` is the signed offset from the centreline (positive to the left of the flow), because every step pours through an off-centre notch (`notchMask`, pool fields `nc` and `nw`). `streamSample` and `riverSample` return `d`, `a`, `s` and `beyond` (past the far end; do not carve there). The terrain is carved 45 cm under the lining so the 0.83 m terrain mesh never pokes through the water, so change these together.
- Channel levels are incised (`incisedLevels`): each level sits at least 0.2 m below the lower bank of `naturalGround` and never rises downstream. Pool lengths are chosen for 0.3 to 1.1 m steps. Do not bring back fixed levels: on this side slope they leave the downhill bank perched like a levee.
- The falls lip sits on a bench (`fallsBench`) that ends in a cliff face 0.2 to 0.85 m behind the lip. `fallsDig` digs the face and the amphitheatre pool after the channels are carved, so the falling sheet (which starts at the lip) never meets rock. Grading uses the bench right up to the lip (`naturalGround(x, z, true)`). Over the cliff the creek lining is only a thin rim.
- Sea life is drawn after the sea surface, which writes no depth, with premultiplied alpha. Each fragment computes its own water attenuation along the view ray and the surface Fresnel. Fish tail-wave amplitude is scaled by 0.2 in the vertex shader, as in the aquarium; without it, bodies swing two-thirds of their length.
- Animal looks were checked against Wikimedia Commons MediaSearch photos (`commons.wikimedia.org/w/index.php?search=<species>&title=Special:MediaSearch&type=image`) opened in the built-in browser. Do the same when changing a species.
- Grown trees: `sotGrowForest` grows every tree root together in one terrain-following voxel grid (0.5 m cells). It uses its own seeded random numbers, never `R()`. Its parameters (shadow `C`, `b`, `qmax`, vigour `alpha`, `lfac`, `iterations`) change every tree, so check the grove, a hero tree (`listTrees(4.6)` sorted by `n4`) and `canopyLoad()` after a change. Low quality grows seven seasons with no side sprays.
- Every instanced canopy module carries a fourth per-instance attribute (location 9: pitch, roll, stretch, taper) besides root, data and fade. Arms leave it at 0, 0, 1, 1. Wood is one six-sided unit tube stretched along each internode (`stretch` = length / radius, `taper` = tip / base radius), started half a radius back to hide the joints. Near trees draw all their wood; far trees draw only the trunk and limbs over 4.5 cm.
- Sprays are arm kinds 2 and 3 (canopy modules 3 and 4, atlas frames 8 to 15, scaled by `FAR_KIND`). Side sprays (`side: true`) are drawn near only, so far cards come from the tip sprays at 1.3 times size. Leaf size does not scale with tree height.
- Lianas hang from whichever arms the default tree mode has at load, so they belong to the grown trees.
