# Axolotl Aquarium

A realistic planted aquarium with a pet axolotl, fish, shrimp and snails. The player feeds and pets the axolotl, adds or removes animals, and aquascapes the tank: plants, stone, driftwood, decor, sand type and sculpted sand. Single-file WebGL2 with meshes (no splats). Read the "Realistic mesh scenes" section of the root `SPLAT-GUIDE.md` first.

## Map of `aquarium.html`

Sections are marked by `// ===` banners, in this order:

1. **Core**: math (`V`, `M4`, `m3rot`), CPU noise, GL helpers (`mkProg`, `U`, `mkMesh`, `addInstancing`), the mesh builder `MB`, `grid`, `tube`, `icosphere`, `box`.
2. **Shaders**: `SWELL` (analytic surface wavelets shared by the surface and the caustic pass), shared chunks `C_UNI` / `C_FN` (depth-tinted water fog, PCSS shadows, `causAt`, `simGrad`, thin-film `film`, `lighting`, `roomLit`, `envColor`) and `C_FS` (`perturb` bump), then one program per family: static meshes (`FS_STD`, material switch on `uMat`), plants, axolotl, instanced fish, instanced critters, billboards, water surface, glass, the fallback caustic texture, the ripple step (`FS_RIPPLE`), the caustic light grid (`VS_CGRID` / `FS_CGRID`), SSAO and its blur, light shafts, resolve, depth of field, bloom, final tonemap.
3. **Geometry**: tank constants `TK`, `leaf()` and the plant generators, `genRock`, `genWood`, decor, tank (four glass panes; the back wall is its own mesh `wall`), stand and room, `genAxolotl` (straight-space build, see the guide; bottle-brush gill fimbriae, palms and splayed fingers), `genFish` with `FISHP` profiles (back and belly curves `tmT`/`tmB`/`headE`, snout height `mouthY`, eye domes `eye`, adipose fin `adip`), `genShrimp` (straight space, length 1: carapace, six flared abdominal plates with side flaps, toothed rostrum, stalked eyes, antennules, long antennae, antennal scales, two claw pairs, three walking-leg pairs, swimmerets, tail fan; part ids in `ext.x`), `genSnail` (nerite with the spire at the back, pale underside shelf and broad foot), food.
4. **World**: sand height map and its dynamic mesh, `CAT` (the item catalog), items (`addItem`, `updateItem`, containment inside the glass), `rebuildTop` (top and walk grids, contact AO), `buildSDF` / `sdfAt` / `sdfDir` / `pushOut` (signed distance to anything the axolotl cannot walk over), picking, sculpting.
5. **Life**: `MORPHS`, `FISHSP`, `SHRIMPSP`, `SNAILSP`, `FOODS`, pet stats `PET`, the axolotl state machine (`axUpdate`), spine from trail (`axComputeSpine`), legs, fish boids, shrimp, snails, food, bubbles, ripples (now `simDrop` into the GPU ripple sim), particles, sand dust puffs (`kickDust`, `dustUpdate`: landings, walking, sinking food), oxygen pearling from stiff leaf points in daylight (`pearlUpdate`), floating plants, `simStep`.
6. **Render**: quality presets `QUAL`, `SETTINGS`, light presets `LIGHTS`, programs with fixed sampler units, render targets, shadow map (plus the raw-depth sampler object for PCSS), the caustic map `CA` / `CMAP`, the ripple simulation `SIM` (`simDrop`, `simStepGPU`, `ambientDrops`, `causticPass`, `ruffle`), `dumpTex` (test readback), camera (`CAM`, limits `CLIM`, `setView` presets, `fitDist` / `fillDist`, `zoomBy`, `panCam`, keyboard and flick inertia in `updateCamera`), `render()` pass order, `DOF` / `updateDOF` (focus eases to the orbit target), thumbnails.
7. **UI**: default tank, save and load (`localStorage` key `axolotl-aquarium.v1`), pet card, Decorate / Animals / Tank sheets, feed bar, selection panel, fullscreen (`toggleFs`, fallback to the fill view, auto-hiding interface), pointer, wheel and keyboard input, views menu and help panel, the `window.AQ` test API, main loop and `init`.

## Design rules

- Check looks against real photos (Wikipedia page summaries give a lead image per species: `/api/rest_v1/page/summary/<Title>`; Commons search `commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srsearch=...` finds more). Shrimp: Neocaridina colour sits in chromatophores over clear tissue, so pigment sets opacity; Amano shrimp are glassy with rows of red-brown dashes. Shrimp are drawn in their own pass after the opaque scene is copied, and blend with that copy (`uSee`). Axolotl: broad blunt snout, small eyes, deep red gill filaments on pale stalks. Fish: dark backs (countershading), silver sides and belly, burst-and-coast swimming (`coast` in `FISHSP`). Fish markings follow the photos: neon blue line over a red rear belly, white cloud gold line and red tail base with a black spot, danio four navy stripes on gold, guppy grey body with coloured tail, cherry barb crimson with a dashed dark line, panda cory tan with a black eye mask, dorsal blotch and tail-base band.

- Realism first: real species and sizes in cm, cold-water notes, axolotl-safe advice (gravel warning, warm-water fish flagged). Nothing cartoony.
- Pea puffer (optional species): it balloons into a ball for 3 to 5.5 s when a tap on the glass lands within 12 cm (`startleAt`) or when the axolotl or a fish over 1.3 times its size bumps it, then deflates slowly; a 6 s cool-down follows. The first puff shows a note to tap gently, because puffing stresses a real puffer. A glass tap also makes other nearby fish dart away. It swims with a stiff body, sculling with its dorsal and anal fins, and every half minute or so it stalks the nearest snail: it hovers about 2 cm off the shell to aim, strikes, and the nerite clamps down for a few seconds (`f.hunt`, `sn.stop`). Snails are never harmed. Seen through the glass, a nerite shows its snout, tentacles and the sole of its foot, with pedal waves (darker bands) running forward along it. When the camera is close in front of the glass, an idle puffer swims over and hovers there looking out (`f.peek`), as real pea puffers do with people. Puffing happens in a few quick gulps (up close, the swollen belly shows tiny spinules), and afterwards its belly stays dusky for about 30 s (stress colour, `f.stress` in the instance data). It eats only bloodworms (and harasses snails), ignoring flakes, pellets and wafers. Its eyes dart independently: `FS_FISH` shifts the iris and pupil pattern inside each eye dome. The pet card's tips warn that a real pea puffer would nip the axolotl's gills.
- The axolotl is the pet. It rests, walks, hides, swims up to gulp air and sinks back, hunts sinking food, comes to the glass when you tap the sand, and flares its gills when petted.
- Care is gentle: hunger empties over about 11 hours, water quality drops over days and from rotting leftovers, and offline time is applied on load (capped at 3 days). Nothing dies.
- Every placed item must stay inside the glass (`updateItem` clamps its bounding box).
- The axolotl never passes through solids: its whole body is pushed clear with the distance field every frame, it steers and lands with the same field, and it walks (never swims) out from under a hide roof. Hides and caves block with their walls only, so it can walk through them. Plants are soft and bend away from its body; marimo balls are solid.

## Controls

- Mouse: drag to orbit (a flick keeps gliding), right-drag or Shift-drag to pan, wheel zooms toward the cursor, double-click flies to a spot and double-click again goes back.
- Touch: drag to orbit, pinch to zoom, two fingers to pan and twist, double-tap to fly to a spot.
- The camera orbits all the way round (yaw is unbounded; presets turn the short way with `nearYaw`). From behind, the background panel and back wall are skipped so the tank is seen through its back glass.
- Keys: W/S or arrows zoom and pan, A/D pan, Q/E rotate, R/C raise or lower, PageUp/PageDown tilt, 1–9 views (front, fill screen, close-up, left, right, above, follow, back, slow spin), 0 reset, F fullscreen, H hide interface, ? help.
- Fullscreen switches to the fill view and hides the interface after 2.8 s without input; where fullscreen is blocked (sandboxed previews) it falls back to the fill view.

## Tuning knobs

- Light presets in `LIGHTS` (intensity, ambient, fog colour, exposure); water clarity in `updateLight` (`fogD`, `abs`, `scat`). Real tank water is nearly clear: keep absorption around `[.0062,.0026,.0021]` per cm and the isotropic part of the shaft scatter small, or the scene goes foggy cyan.
- Side-pane mirrors: total internal reflection in `FS_GLASS` (camera outside, pane seen from inside, below the waterline); the reflected point is taken 22 cm along the reflected ray.
- Caustics: eleven surface wavelets in `SWELL` and `ruffle()` (calmer with the air pump off), reference depth `CDEP`, IORs in `causticPass`, intensity cap in `FS_CGRID`, contrast curve in `causAt`. Ripple damping `uDamp` and drop sizes in `simDrop` callers.
- Shafts `LIGHT.scat` and the beam mix in `FS_VOL`; SSAO radius and strength (`uRad`, `uAOK`); PCSS penumbra factor (0.055) in `shadowAt`; depth of field aperture in `updateDOF`; bloom in `render()`.
- The axolotl's closed-mouth line comes from each body vertex's height above the mouth curve (colour w); shading the 0/1 jaw flag instead drew a zigzag, dashed seam. The open mouth still uses the jaw flag on the stretched seam triangles.
- Seen from above, the bed is refracted by the ripple slope plus 35 % of the caustic wavelet slope (`FS_SURF`); the full wavelet slope made the bed look like wobbly glass. The sponge filter is a grooved foam cylinder (`genSponge`) whose foam is 3D cellular noise in `uMat==5`, fading to an average where it would alias. `tube()` takes `capH` for flatter end caps (the air stone uses 0.05).
- Catalog sizes and ranges in `CAT` (`scale`, `smin`, `smax`); default layout in `defaultTank()`.
- Puffer inflation: the ball `FISHP.puffer.ball` (its centre and squared radii are repeated in `VS_FISH` for the normals) and the per-vertex push built by `puffMorph` into the spare `aCol` attribute; puff timings in `puffUp`, tap radius in `startleAt`.
- Axolotl speeds and timers in `axUpdate`; bend limit in `axComputeSpine`; fish speeds and zones in `FISHSP`.
- Quality: `QUAL` (render scale, pixel-ratio cap, MSAA, shadow size, shaft steps, SSAO taps). Low turns off shafts, SSAO, PCSS and depth of field and updates caustics every other frame. Tank sheet toggles: Camera focus blur (`SETTINGS.dof`) and Contact shading (`SETTINGS.ao`). `?nofloat` disables the ripple simulation and uses procedural caustics while retaining available float-render-target effects; a genuinely missing `EXT_color_buffer_float` extension additionally uses RGBA8 HDR targets and omits SSAO. Auto-downgrade runs after 3 s if frames average over 38 ms.

## Testing

Load `aquarium.html?test&seed=1&q=med` headless (see the guide's headless setup). In test mode nothing is saved and the sim only advances through `AQ.step(seconds)`; call `AQ.frame()` before a screenshot (`AQ.snap()` first if you just changed the view, since the camera eases toward its target). Useful calls: `AQ.cam({ target, yaw, pitch, dist })`, `AQ.view(name)`, `AQ.key(k, down)`, `AQ.fs()`, `AQ.axolotl({ at: [x, z], yaw, mode, morph })`, `AQ.feed('pellet' | 'worm' | 'flake' | 'wafer', x, z)`, `AQ.call(x)`, `AQ.pet()`, `AQ.add(kind, x, z, opts)`, `AQ.set('q' | 'bg' | 'light' | 'sub' | 'morph', value)`, `AQ._eval(src)` for internals.

A good regression run: switch every quality level, every sand type and both shapes, add and remove one of each catalog item, drop every food type, add every species, then step 300 s checking the axolotl spine and all fish positions stay finite and inside the tank. It should finish with `AQ.errors.length === 0`.

Collision check: force random walks for 240 s and count spine sample points (centre and four sides at 0.8 x body half-width) whose walk height is more than 2.3 cm above the sand. The fix brought this from 6–17 % to about 0.2 % (millimetre tail-tip overlaps in tight pockets). Also sink it from the surface directly above the big seiryu stone: it should drift off and land with every spine sample above `topH`.

Puffer check: `AQ.glassTap(x,y,z)` startles fish around a point on the glass and returns how many puffers puffed; `fish[i].puff` runs 0 to 1. Teleport a puffer onto `AX.spine` to test the bump trigger.

Playwright's synthetic mouse events arrive late under SwiftShader, so test flick inertia with `PointerEvent`s dispatched in-page.

Soft shadows: the PCSS blocker search in `shadowAt` takes a centre tap before its rotated ring. Without it, a thin occluder right above the receiver (a fish's own body, a fin, a leaf) can be missed by the whole ring, and those pixels pop fully lit as a fixed dot pattern.

Graphics checks: `AQ._eval('dumpTex(SIM.fbo[SIM.cur],SIM.w,SIM.h,0,10,.5)')` returns the ripple heights as a PNG data URL (and logs min, max and mean), `dumpTex(CA.fbo,CA.w,CA.h,-1,1,0)` the caustic map, `dumpTex(RT.fO2,RT.vw,RT.vh,0,1,0)` the SSAO buffer. Heights should stay within a few millimetres; a growing max or a checkerboard means the ripple step went unstable. Compare the six fixed views (front, axolotl, sand, plants, rocks, surface from below) before and after a change, at `med`, `high`, `low` and `?nofloat`.

## Not built yet

Sound, breeding, a second axolotl, plant growth and trimming, algae you scrape off, temporal anti-aliasing.
