# Gaussian-splat HTML games: build guide

Read this before you build or change a splat game in this repo (`splat`, `ashgrove`, `splatcraft`, `broadside`, `spearfish`, or a new one). It records the techniques these games share, so you don't have to dig through an old game to rediscover them. When you work out something new, add it here.

## What "splat" means here

The scenes are not trained 3D Gaussian Splatting captures. They are procedural: JavaScript samples parametric surfaces (hulls, terrain, sails, rocks) and emits thousands of small oriented discs. Each disc is an instanced quad with a Gaussian or soft-edged alpha falloff. Overlapping discs read as painted brush strokes, which gives the games their look.

Each game is one self-contained `<game>/<game>.html`. It uses WebGL2 and has no build step and no external dependencies.

## Splat record (48 bytes, instanced)

| Offset | Type | Field |
| --- | --- | --- |
| 0 | f32×3 | centre position |
| 12 | f32×3 | `U` half-axis (disc spans `pos ± U ± V`) |
| 24 | f32×3 | `V` half-axis |
| 36 | u8×4 norm | rgb + ambient occlusion |
| 40 | i8×4 norm | normal xyz (+ pad) |
| 44 | u8×4 | game-specific; Broadside: tier, flags, alpha, pad |

The corner buffer `[-1,-1, 1,-1, -1,1, 1,1]` is drawn as a `TRIANGLE_STRIP` with `drawArraysInstanced`. Attribute divisor is 1 for locations 1–6.

Broadside uses these conventions:
- **tier**: 0 is the base, an opaque core with a soft rim (`1 - smoothstep(0.55, 1, r²)`). 1 is a soft painterly detail stroke. 2 is a soft particle such as smoke or foam. 3 is emissive (windows, muzzle flash).
- **flags** (bits): 1 darkens the splat when seen from behind, so shot holes show a dark interior. 2 makes it translucent: lit from both sides, for sails. 4 is foam: the splat is pulled 1.4 m toward the camera so it never z-fights the water.

Splatcraft uses the tier byte for LOD distance fading instead. Pick one convention per game and document it at the top of the file.

## Rendering recipe

- **No sorting.** Base splats write depth and use an opaque core. Create the context with `antialias: true` and enable `SAMPLE_ALPHA_TO_COVERAGE` when `gl.getParameter(gl.SAMPLES) > 0`. Otherwise fall back to hashed-dither discard (`if (a < hash(gl_FragCoord.xy)) discard`). This is order-independent and fast.
- **Lighting** happens in the vertex shader, per splat: two-sided Lambert (flip the normal when it faces away), sky ambient times AO, an ACES tonemap, gamma, then exponential fog to the horizon colour.
- **Rigid objects** get a static buffer per part and a `uM` model-matrix uniform. Transform the position, `U`, `V` and normal by `mat3(uM)`. Ships use one part for the hull, one per mast for spars, and one per mast for the braced sails.
- **Damage holes** go in a `uniform vec4 uHoles[24]` (part-local xyz, radius). In the vertex shader, collapse any splat within the radius (`gl_Position = vec4(2,2,2,1)`). Darken a scorched ring out to about 2.2 × the radius. Put hole positions in the part's local space so they move with the part.
- **Small moving things** (cannons, rudders, flotsam, balls, particles) go in one dynamic buffer that you rebuild every frame. Store each object as a local template (`SB.template()`) and transform it with `dtpl(template, matrix)`. One `bufferSubData` and one draw call per frame. Budget about 70k dynamic splats.
- **Billboard particles** use the camera's right and up vectors as `U`/`V`. Flat foam uses world X/Z.

## Generating splats

Broadside's helpers (copy them):
- `surf(sb, P(u,v), nu, nv, colour(u,v,p,n), opts)` samples a parametric surface. `U`/`V` come from finite differences of `P` times `cover / n`. A `cover` of about 0.95–1.0 makes a closed surface. `opts.strokes` adds elongated tier-1 strokes on top for painterly texture, and `opts.flip` reverses the normal. Return `null` from `P` or the colour function to skip a sample.
- `line(sb, a, b, width, colour)` builds rigging and ropes from two crossed strips, so a line never vanishes edge-on.
- `cyl()` and `box()` build masts, barrels and carriages.
- Colour functions take care of most of the art: plank rows with seams, painted panels, gun ports, stripes, emblems. Use value noise for variation. Keep paint desaturated, because saturated reds and yellows turn garish after lighting.
- Use one geometry function for both splat generation and hit testing (Broadside's `HULL.hw(x,y)`, `keel(x)`, `deck(x)`). That way hits land on what you see.

## Water

- Draw a polar grid mesh centred on the camera, snapped to 4 m so it doesn't swim. Make the rings denser near the centre and run out to about 5 km. Fade wave amplitude with distance.
- Write the wave function once in JS and generate the GLSL from the same constants (`WAVE_GLSL`). Ship buoyancy, floating debris and splash heights then match the rendered surface exactly.
- The water is opaque and writes depth, so submerged hull, sunk ships and listing gunports are hidden by the depth test for free. That's what makes sinking readable.
- Compute per-pixel normals analytically from the wave gradient, plus two scrolling noise layers. Add Fresnel sky reflection, a sun glint, crest foam, and fog to the horizon colour.

## Underwater scenes (Spearfish)

- **Backdrop without a mesh.** Draw one fullscreen quad first, depth test off, and shade it by view ray: a water colour that runs from dark below to bright above, plus the surface seen from below. Intersect the ray with `y = 0`, perturb a downward normal with a few sines, and `refract(dir, n, 1.33)`: where that returns zero you are outside Snell's window, so show reflected water colour; inside it show bright sky and a sun spot.
- **Fog must match the backdrop.** Splats fog toward the same `waterCol(viewDir)` function the backdrop uses, with the same tonemap, or distant geometry shows as a silhouette. Multiply by `exp(-dist * vec3(.050, .012, .008))` before fogging so reds die first with distance; nearby coral stays colourful and far coral goes blue.
- **Caustics go in the fragment shader.** Per-splat caustics flicker one disc at a time. Pass the corner's world position to the fragment shader and add `albedo * sun * caust(world.xz + world.y * .3, time)`, pre-multiplied in the vertex shader by fog, absorption and an up-facing mask.
- **Sway is a per-splat byte.** Kelp, sea fans and anemones store `(height fraction)^1.5` in a spare byte and the vertex shader offsets x and z by it. A whole stalk bends as one because the phase comes from the splat's rest position, which barely varies along a stalk.
- **Seabed as one height function.** Reef mounds and boulders are Gaussian bumps added to `floorH(x, z)`. The same function places floor splats, plants coral, stops the player and catches spears. Scatter extra floor splats on each bump, since a uniform grid under-samples steep sides. Floor discs need a radius of about 1.0 x the grid spacing (with jitter) or water shows through the cracks.
- **Solid decorations.** Things planted on the bed (coral) are not in the height function, so each builder registers one or more upright ellipsoid colliders (centre, horizontal radius, vertical radius) as it emits splats. Bin them in a 4 m grid, listing a collider in every cell it can reach, so a query reads one cell. Push the diver and fish out along the scaled-sphere normal and remove the inward velocity so they slide; sample a fast projectile at four points per step so it cannot tunnel; reject wander targets inside a collider.
- **Ambient life in the vertex shader.** Hundreds of tiny fish cost nothing on the CPU if they are static splats with a mode byte. Each fish is two splats (body, tail) at a home point; the normal bytes carry two seeds instead of a normal. The shader moves the home by a few summed sines, takes the heading from the derivative, builds `U` along the heading and `V = normalize(cross(heading, toCamera))` so the fish never goes edge-on, and pulls the fish down into the coral as the camera comes within about 4 m. Bubble columns work the same way: `y = base + fract(time * rate + seed) * height`.
- **Translucent leaves.** For kelp blades, sea fans and soft coral, add `albedo * sun * max(dot(-N, L), 0) * warmTint` after flipping the normal toward the viewer. Blades seen from below against the sun glow gold instead of going black.
- **Sun shafts in the backdrop.** In the fullscreen backdrop shader, take the view ray's component perpendicular to the sun direction, turn it into an angle, and run that through two sharpened sines. Shafts fan out from the sun and sit behind all geometry for free.
- **Reef dressing.** A reef reads as alive when little rock shows. Keep the bed colour muted and put the colour in the coral: a finer bed grid (0.5 m) under the reef, about 25 corals per mound from a kit of a dozen shapes, thousands of small encrusting discs and six-disc cushions, and a school of shader fish over every mound.
- **Static chunks.** Sort static splats into 24 m cells after generation and draw each cell with its own `vertexAttribPointer` offsets (WebGL2 has no base instance). Skip cells beyond fog range or wholly behind the camera.
- **First-person viewmodel.** Keep the gun in its own small dynamic buffer and draw it last with `gl.depthRange(0, 0.04)` so it never clips into scenery. Aim the projectile from the muzzle at the point the crosshair is on (nearest fish near the view ray, else the seabed, else a fixed range); a fixed convergence distance misses small close targets.
- **Bursting a creature.** Use one function to compute each splat's world position for both drawing and the burst, then hand every splat to the particle pool with an outward velocity. The chunks start exactly where the fish was. Underwater, heavy drag (`v *= exp(-2.3 dt)`) and slow sinking read better than ballistic arcs; add a few soft expanding cloud splats and ring-shaded bubbles.
- Spearfish test API: `window.SF` has `state()`, `step(seconds)`, `tp(x, y, z, yaw, pitch)`, `lookAt()`, `nearest(key)`, `stalk(i, dist)`, `fire()`, `calm(bool)` to stop fish fleeing, `key(code, down)`, `fishList()` and `endDive()`. In `?test` mode the sim only advances through `step()`. Add `&touch` to force the touch layout.

## Painterly look and animals (First Light)

- **Ragged daubs.** Pass `float(gl_InstanceID % 977)` to the fragment shader as a flat seed, then scale `r²` by `1.14 + 0.2*sin(angle*3 + seed) + 0.12*sin(angle*7 + seed*1.7)` before the alpha falloff. Every splat gets its own lobed edge. Multiply the colour by `0.93 + 0.11*sin(vUV.y*8 + seed*2.3)` for bristle streaks.
- **Canvas weave.** A 256 px noise-and-weave tile on a full-screen `div` with `mix-blend-mode: overlay` at about 0.2 opacity, plus a soft radial vignette, makes the whole frame read as paint on canvas. It costs nothing in WebGL.
- **Blades.** Grass and reeds are one splat each: `U` is a short horizontal half-width, `V` is the vertical half-height, flag 16 anchors the base. In the vertex shader multiply the wind offset by `aCorner.y + 1`, so the tip sways and the root stays put.
- **Backlit leaves.** Translucent splats (flag 2) add `albedo * sunColour * pow(max(dot(-viewDir, sun), 0), 3)`. Autumn crowns glow when the low sun is behind them.
- **Ground as a mesh, not splats.** A warped grid (dense near the player) with vertex colours from JS and brush noise in the fragment shader costs far less than covering the floor in splats. Scatter leaf-litter discs and blades on top. Fake canopy shadow with a low-frequency noise mask on the sun term (`uDapple`).
- **One sky function.** `skyCol(dir)` paints the gradient, sun, brushed clouds and two far ridge silhouettes. The sky pass and the water shader both call it, so still water reflects the tree line and dawn for free.
- **Dawn to morning.** Lerp sun elevation, sun colour, ambient, horizon, fog colour and fog density from one `day` value in 0..1 over the session.
- **Animals** are a handful of templates posed each frame with `dtpl`: torso, neck, head, one leg template drawn four times, tail. Birds are a body plus two wing templates rotated about the shoulder. Keep hit spheres in the same local frame as the templates and transform both with the same matrices.
- **Fast projectiles.** Test the whole frame segment against the hit spheres, and sample terrain and trunks along it every metre or so. When zones overlap (vitals inside the body), look a little past the end of the segment before crediting a zone, or a slow arrow gets scored on whichever sphere it entered first.
- First Light test API: `window.FL` has `start(area, weapon)`, `state()`, `step(seconds)`, `spawn(kind, opt)`, `aimAt(i)` (ballistic lead on target `i`), `fire()`, `call()`, `look(yaw, pitch)`, `aim(bool)`, `setDay(0..1)`, `cam(eye, at, fovDeg)` and `end()`.

## Performance budgets (mid-range GPU, 1080p)

- Up to about 250k static splats on screen is fine. Broadside has about 165k, including about 100k for islands.
- Drop splat density with distance by making spacing coarser at generation time. Islands 1–3 km away use 7 m spacing.
- Keep per-frame JS to transforming templates (thousands of splats), not rebuilding big buffers.

## Gotchas

- `Uint8Array`/`Int8Array` assignment wraps rather than clamping. Clamp before writing (`Math.min(255, v*255)`).
- `getActiveUniform` returns array uniforms as `name[0]`. Strip the `[0]` when you build the location map.
- GLSL ES loops need constant bounds. Loop to `MAXH` and `break` at the live count.
- Keep sim time in seconds since start, as a float. Wave phases stay precise for hours.
- Ship-attached cameras inherit roll and can dip below the water. Build the test camera from yaw only.

## Headless testing (the standard setup)

Test headless with logs and screenshots. Don't drive the user's screen.

- Use Playwright with system Chrome: `chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })`. SwiftShader reports MSAA 4, so alpha-to-coverage works.
- Load `file:///…/<game>.html?test&seed=N`. A `?test` flag skips the menu and seeds the RNG.
- Every game exposes a small test API on `window`. Broadside's `window.BS` has `state()`, `step(seconds)` for a deterministic fixed-step sim with no rendering, `aim(p)`, `aimBallistic(localPoint)`, `broadside()`, `fire()`, `topple(i)`, `breach(local, r)`, `hitZone(zone)`, and `look(ship, offset, target)` to lock the camera for screenshots.
- Write test plans as lists of `{ js, wait, shot }` steps. Collect console output and `pageerror`s, and look at every screenshot. Balance tests can run whole fights in-page (`for (…) { BS.step(1); … }`) and print a summary every 30 s.
- Long runs take longer than two minutes in SwiftShader. Run them in the background and poll the log.

## Multi-pass techniques (from `experiments/demo/demo.html`)

The technique demo renders to off-screen buffers and runs several simulations. These are the parts worth reusing; `experiments/demo/plan.md` has the full account.

- **One uniform block for per-frame data.** Camera, sun, toggles and light lists live in a single `std140` block made only of `mat4` and `vec4` fields, generated from one JS list so the GLSL text and the byte offsets cannot drift apart. Every program includes the same block and it is uploaded once per frame.
- **Fixed texture units for shared samplers.** Give shadow maps, the world texture and simulation textures a fixed unit each and set every sampler uniform at link time. Two sampler types pointing at the same unit (the default is 0 for all) is a draw-time error.
- **Feedback loops.** A draw fails with "Feedback loop formed" if the current program has an active sampler bound to a texture attached to the target. Shadow-pass programs must not include the lighting code, and a ping-pong chain must never bind the texture it is writing, even through a branch that is never taken.
- **Splats into an off-screen buffer.** There is no multisampling there, so alpha-to-coverage is out. A hard cut on the lobed `r2` gives clean daub edges; lighting per splat in the vertex shader (including the shadow lookup) makes each daub fully lit or fully shaded, which reads as paint.
- **World texture.** Bake terrain height, water level and flow into one `RGBA16F` texture with texel centres on the grid vertices. Water depth, shore fades, the ripple mask and caustics all read it, and the player walks on the same grid.
- **Ripple simulation.** One window that follows the player, snapped to whole texels, covers every pool, stream and shoreline. A drop narrower than about 1.5 texels disappears, so clamp the radius. Scale the wave constant by `1 / texel^2` or changing the grid size changes the wave speed.
- **Caustics.** Subtract the flat-water landing point from the refracted one before drawing the light grid. The pattern then stays under the surface that made it, so the bed can look it up at its own xz.
- **Refraction and transparency.** Copy the opaque colour and depth to a second target with `blitFramebuffer`, then draw water and glass into the copy while sampling the original. A texture cannot be both sampled and attached, even as a depth buffer with writes off.
- **Caves under a height field.** Make the cave a separate inward-facing tube drawn with back-face culling, and cut the doorway by discarding terrain inside a capsule along the first few metres of the tube. Narrow the tube to the doorway size at each end or the terrain shows around the opening.
- **Timing a pass.** `gl.finish()` returns at once in some browsers. A one-pixel `readPixels` from a tiny framebuffer before and after a pass does block, and gives usable per-pass times.
- **Headless float checks.** `readPixels(..., gl.FLOAT, ...)` on a simulation target is the quickest way to see whether a simulation is actually moving. Add a URL flag that pretends float targets are missing so the fallback path gets tested.

## Realistic mesh scenes (Axolotl Aquarium)

`aquarium/aquarium.html` uses meshes, not splats. These parts carry over to any WebGL2 game.

- **Pass order.** Ripple simulation steps → caustic map → shadow map (`sampler2DShadow`) → HDR main pass into 4x MSAA `RGBA16F`, blitted to a colour texture plus a depth texture → half-resolution ambient occlusion and light shafts → bilateral upsample into a second target → copy that target back to the first so refraction sees the shafts → surface, fins, bubbles and glass → depth of field → four-level bloom → ACES with slight lateral chromatic aberration.
- **Water.** Fog by the length of the view ray inside the water box (`boxT`): `col * exp(-abs * len) + fogCol * (1 - exp(-den * len))`, with red absorbing first. Light reaching a point is also attenuated by its depth below the surface. Seen from below, the surface reflects the scene colour at a point 14 cm along the reflected ray, so total internal reflection gives a moving mirror for free. Seen from above, intersect the reflected ray with the lamp's rectangle for a bright, rippling reflection.
- **Live surface (T5).** Ping-pong `RGBA16F` height fields (R = height, G = previous) at 256×116 over the water footprint, stepped at 120 Hz: `h' = h + (h - prev) * 0.988 + 0.3 * laplacian`, then `h' *= 0.9993`. Keep the propagation coefficient below 0.5; a smoothing term that nudged it to 0.503 grew a checkerboard. Queue disturbances on the CPU (bubble pops, food, fish and the axolotl at the surface, air stones, a trickle of random drops) and apply 16 per step with a zero-mean kernel `amp * (1 - u) * exp(-u)`, `u = r² / radius²`; a plain Gaussian keeps adding volume and builds mounds. Add six analytic capillary wavelets (wavelengths 1 to 4 cm, slope amplitudes 0.009 to 0.022, dispersion `w² = g k + (s/p) k³`) along the filter flow, from one GLSL string shared by the surface shader and the caustic pass so both match.
- **True caustics (T7).** Draw a 256×116 vertex grid over the surface. The vertex shader refracts the light through the live normal, follows the ray to a reference depth (34 cm), subtracts where the flat surface would land it, and writes the grid point plus that offset into a 512×256 map of the tank floor. The fragment shader outputs `areaFlat / max(areaBent, 0.06 * areaFlat)` from `dFdx`/`dFdy` of both positions, capped at 9, blended additively. Three draws with `colorMask` and IORs 1.3318, 1.334 and 1.3368 give gentle dispersion; wider spacing scatters single-colour specks. Contrast comes from curvature, not slope: a wave focuses at depth D when `0.25 * D * A * k² ≈ 1`, so short ripples with small slopes give a crisp web under a calm-looking surface. Look up with `uv = (P.xz + Lw.xz / Lw.y * depth - origin) / size`, where `Lw` is the light direction refracted into the water, pick the mip by `|depth - 34| * 0.075`, and compress with `1.25c / (1 + 0.45c)`. Light shafts sample mip 3 of the same map. Without float render targets, the old tileable Voronoi texture fills the same map.
- **Shading extras.** Half-resolution SSAO (10 to 14 hemisphere taps around a normal rebuilt from depth, radius about 2 cm growing with distance), blurred and upsampled by distance from the camera, and weighted down by water fog. Soft shadows use PCSS: bind the same depth texture to a second unit through a sampler object whose compare mode is `NONE`, search for blockers, and widen the filter by `0.055 * (receiver - blocker)` in centimetres. Translucent leaves take their shadow test from the lit side (`-N` when `N·L < 0`), or a leaf shades its own underside black. Anything above the water but under the lamp, such as floating leaves, needs the lamp's direct light added to the room lighting. Thin-film interference (`0.5 - 0.5 cos(4π n t cosθt / λ)`) colours bubble rims and fish stripes. Depth of field gathers 24 taps with a circle of confusion from depth and rejects sharper background samples. Render it into a colour-only framebuffer: sampling a depth texture that is attached to the bound framebuffer is a feedback loop.
- **Curve-skinned creature.** Model in straight space (Z forward, `s` = distance from the snout). Body vertices store `(x, y, 0)` plus `s`; rigid parts (eyes, gills) store offsets from an attach `s`; legs store positions relative to the hip and get per-leg hip and knee `mat3`s. The CPU sends 24 spine points with tangent and up, and the vertex shader interpolates the frame. Build the side vector as `cross(up, forward)`, or the frame is mirrored and the mesh renders inside out.
- **Spine from a trail.** Sample the head's trail at fixed arc lengths, then enforce an inextensible chain with a bend limit (about 0.3 rad per segment) and write the result back as the trail. Measure distances in x/z while on the ground, and when sinking move the whole trail down while levelling it; otherwise the body coils or crumples.
- **Keeping a creature out of solids.** Whenever the layout changes, build a signed distance field over the walk grid (two-pass chamfer, negative inside obstacles). Every frame, push each spine sample out to its body radius along the field's gradient, re-space the chain, and push again after adding swim and curl offsets. Steer with the same field, drift off obstacles before landing from a swim, and walk (never swim) out from under a roof. Tunnels such as hides go into the walk grid only from their low triangles (lowest vertex under 2.6 cm), so the walls block and the corridor stays open. Soft plants bend aside instead: pass a few body spheres to the plant vertex shader and push flexible vertices out of them.
- **Camera feel.** Orbit with flick inertia measured from `PointerEvent.timeStamp` (processing time lags on slow frames), zoom toward the point under the cursor, pan in the ground plane, and keep presets (front, fill screen, sides, above). Fill screen: distance = tank half-width / tan(horizontal half-FOV) + glass depth. Fullscreen needs a user gesture and fails inside sandboxed previews, so fall back to the fill view with the interface hidden.
- **Height maps for life.** Rasterise every solid item's triangles into a `top` grid, plus a `walk` grid that skips tunnels such as hides. Shrimp and snails walk on `top`, fish avoid it, food lands on it, epiphytes are placed on it, and a blurred `top - sand` gives contact shadows on the sand.
- **Gotchas.** A ring of radius 0 (a snout or nose tip) produces zero normals and 0/0 attributes; one NaN pixel becomes a black square once bloom downsamples it, so guard the resolve, every bloom tap, depth of field and the final pass with `isnan`/`isinf` (anything drawn after the resolve, such as transparent surfaces, bypasses the resolve's guard). Make geometry helpers accept plain-number radii. Clamp each item's transformed bounding box inside the glass, or parts poke through and get room lighting. Give every sampler a fixed texture unit at link time.
- Aquarium test API: `window.AQ` has `state()`, `step(seconds)`, `frame()`, `cam({ target, yaw, pitch, dist })`, `add(kind, x, z, opts)`, `remove(id)`, `items()`, `feed(type, x, z)`, `pet()`, `call(x)`, `axolotl({ at, yaw, mode, morph })`, `set(key, value)`, `sandShape(name)`, `thumb(kind)`, `view(name)`, `snap()` (jump the camera to its target), `key(k, down)` and `fs()`; in `?test` mode, `_eval(src)` reaches internals. In `?test` mode the sim only advances through `step()`.

## Night scenes, glow and play on a plane (Sleigh Run)

- **Two passes, four buffers.** Opaque splats (static and dynamic) draw first with alpha-to-coverage. Glow splats draw after with `blendFunc(ONE, ONE)`, depth test on and depth writes off: window halos, fairy-light blooms, snowflakes, sparks and the aim marker. A light is usually two splats, a small emissive dot in the opaque buffer and a wide dim one in the glow buffer. Flat glow discs on the ground (`U` along x, `V` along z) fake pools of light on snow.
- **Lights that switch on.** Each fairy-light splat carries its house index in the spare byte, and the vertex shader multiplies its intensity by `uLit[index]`. A served house lights up with one uniform write and no buffer edits.
- **Shader snowfall.** Snowflakes are static glow splats with a flag. The shader adds a wind offset and a fall offset, then wraps x and y in a box that follows the camera. Integrate the wind on the CPU and pass the integral, or every flake jumps when the wind changes.
- **Play on a plane.** All collision is 2D on z = 0: a height profile (boxes for roofs and chimneys, triangles for trees and the spire), sagging line segments and circles. The side-on camera sits at +z, so billboards can use world X and Y as their axes.
- **Catch plane above the collision height.** A present is delivered when it crosses a plane a little above the chimney top inside the catch radius. Put that plane higher than the height at which the chimney registers a hit (`top + present radius`), or an on-target drop bounces off the cap one frame before it would score.
- **Aim marker from the same formula.** The landing marker solves the drop analytically with the same gravity, launch velocity and wind acceleration the present uses, at the height of the first chimney the drop can still reach.
- **Int uniforms in both stages.** A `uniform int` shared by the vertex and fragment shaders fails to link ("Precisions of uniform differ") when the fragment shader only declares `precision mediump float`. Add `precision highp int;` to the fragment shader.
- Sleigh Run test API: `window.SR` has `state()`, `step(seconds)`, `start(town)`, `drop()`, `fly(-1|0|1)`, `auto(bool)` (an autopilot that also flies the title screen), `run(bool)`, `setY()`, `cam(eye, at, fov)`, `houses()`, `next()` and `log()` (drop, miss and crash events in `?test` mode). `?test&town=N&seed=N` starts in town N.

## Repo rules (summary)

- Every new game gets its own folder with a meaningful file name, never `index.html`.
- Commit at each working milestone and push `main` to origin after each commit. See `CLAUDE.md` for the exact commands.
