# First Light

A painterly Gaussian-splat hunting game played from a fixed seat. Three areas: a ladder stand over an oak clearing (Hardwood Ridge), a box blind above a snowed-in meadow (Frostline Ridge), and a duck blind on a marsh (Mallard Slough). Read the root `SPLAT-GUIDE.md` first; its "Painterly look and animals" section covers the techniques used here.

## Map of `firstlight.html`

Sections are marked by `/* ===` banners, in this order:

1. **Core and splat builder**: math, mat4 helpers, `SB`, `surf`, `line`, `cyl`, `ell`, `box`, `blade`. The splat record and the tier and flag conventions are documented at the top of the script.
2. **WebGL2**: splat, sky, ground and water shaders. `SKY_GLSL` holds `skyCol()`, shared by the sky pass and the water. The ground shader takes per-area brush tints (`uWash`, `uTintA`, `uTintB`). Dynamic buffer helpers `dput` and `dtpl`.
3. **Areas**: `AREAS` (each has `game: 'ground' | 'fowl'`, optional `env` palette, `paint` tints and `snow`), the height functions (`H_STAND`, `H_SNOW`, `H_BLIND`; the live one is `H`), `buildGround`, `tree`, `bush`, `rock`, `hangStand` (the ladder stand), `buildStand`, `buildSnow` (includes the box blind), `buildBlind` and the ground colour functions. `trunks` collects tree trunks for shot blocking.
4. **Wildlife models**: `SPECIES`, hit `ZONES`, `PLAN` (per-species body plans: top line, belly line, width, head shape, ears, coat, head, neck and leg colours), `quadTpl`, `turkeyTpl` (tom and hen), `BIRD_COL`, `birdTpl`, `WEAPONS` and `weaponTpl` (gun-space view models with a supporting hand).
5. **Game state**: `G`, `ENV0` and `setEnv(day)` for the dawn-to-morning light, synthesised sound, particles.
6. **Ground game**: `FOREST_MIX`, `SNOW_MIX`, `spawnBeast`, `beastUpdate` (walk, feed, alert, flee, woundrun, down), `beastPose` (neck, head turn, tail, hit spheres), `beastDraw` (contact shadow, two-segment legs, gaits).
7. **Waterfowl**: `spawnFlock`, `landPath`, `takeoff`, `flare`, `flockUpdate`, `birdParts`, `birdDraw`.
8. **Shooting**: `shoot`, `makeNoise`, `useCall`, `projUpdate` (hit spheres, terrain, water, trunks), `award`.
9. **Hunt flow, render (weapon pose, falling snow), menu, input and the `window.FL` test API.**

## Animals

- Forest: whitetail buck and doe, wild turkey (tom and hen), wild boar, coyote, cottontail, black bear.
- Snow: bull elk, bull moose, gray wolf (packs of one to three), red fox, snowshoe hare, plus the odd whitetail.
- Marsh: mallard drake and hen, green-winged teal, Canada goose, great blue heron (protected).
- Proportions and markings were checked against photos, and the dark animals against wildlife paintings. To add a quadruped: add a `SPECIES` row, point it at a `PLAN` (or derive one with `Object.assign({}, PLAN.x, {...})`), and add it to an area mix.

## Design rules

- The hunter never moves. Variety comes from the spot, the weapon and what walks or flies in.
- Non-graphic: an animal that is hit drops or runs off, then fades. No blood.
- A gunshot clears the clearing and delays the next arrivals; the bow does not. Calling helps once and spooks game when overused (twice inside 16 s). Each ground area lists which species its call draws (`AREAS[..].calls`).
- Shot placement matters: heart-lung, head and neck drop the animal and score more; a weak hit loses the animal and costs points. The great blue heron is protected and costs 150.
- Any weapon can be taken to any spot. `AREAS[..].best` only sets the menu default.
- Settings and choices go on in-page buttons, never URL flags (the `?test` flags are for headless runs only).

## Tuning knobs

- Hunt length `HUNT_LEN` (360 s). Spawn pacing in `update` (`G.spawnT`), species mixes `FOREST_MIX`, `SNOW_MIX` and `MARSH_MIX`.
- Per species in `SPECIES`: `pts`, `tough`, speeds, body size (`L`, `Hh`, `Rr`), flock size, flight altitude `alt`, hit radius `hitR` (birds) or `hitK` (ground game).
- Per weapon in `WEAPONS`: muzzle speed `v`, `pellets`, `spread`, `dmg`, `mag`, `cycle`, `reload`, `noise`, `aimFov`. Pellet damage falls off with range in `projUpdate`. Carried and aimed poses are the `hip` and `ads` arrays in `render`.
- Scene density: tree grid spacing and leaf count in the build functions and `tree`; `LOW` (phones) trims counts. Static splats on desktop: stand about 224k, snow about 229k, marsh about 192k. Meadow grass is kept under about 0.4 m so small game shows.

## Testing

Load `firstlight.html?test&area=stand&weapon=rifle` (areas `stand`, `snow`, `blind`; weapons `rifle`, `bow`, `pump`, `double`) headless. In test mode nothing spawns by itself and the sim only advances through `FL.step(seconds)`; set `FL.G.spawnT = 1` to turn the spawner on. Useful calls: `FL.spawn('buck', { at: [x, z], heading })` for a feeding animal, `FL.spawn('goose', { angle, land: false, pass: [x, y, z], n })`, `FL.spawn('mallard', { swimAt: [x, z] })`, `FL.aimAt(i)` then `FL.fire()`, `FL.state()`, `FL.setDay(t)`, `FL.aim(bool)`, `FL.draw(0..1)` for the bow, and `FL.cam(eye, at, fov, showGun)` for close-up screenshots. Animals stand on rolling ground, so build close-up cameras from the animal's own `x`, `y`, `z` in `FL.G.beasts`.

A full scripted session in each area (350 one-second steps with the spawner on, shooting whenever something is feeding or in range) should finish in `results` with no page errors.

## Not built yet

Stalking on foot, tracks and recovery, wind and scent, progression and unlocks, footprints in the snow.
