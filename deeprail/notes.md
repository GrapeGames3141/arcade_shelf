# Deep Rail — design notes

Brief (scheduled task, 2026-11-27): an on-rails mine-cart shooter. A runaway cart plunges through an abandoned mine; the cart drives itself
and the player only aims and fires. The hook is light: glowing eyes everywhere in the dark, flares that light the cave where they land,
lanterns / oil lamps / glow crystals to shoot and light for good (lit stretches stay lit and are safer), levers at junctions to pick a branch.
Threats: bat swarms, cave spiders, burrowing things, collapsing scaffolding and falling rock. Set pieces: a trestle over an underground river,
a crystal cavern, a big creature waking up as the climax. One level of 3-4 minutes, score, combo, health, recharging flares, results, retry.
Sibling briefs (built at the same time by other sessions): Salvage Run (space) and Tranq Safari (dinosaurs), see `claude/on-rails-shooters.md`.

## Design calls made without asking (unattended run)
- **Weapon:** an original brass-banded rivet pistol with a flare tube under the barrel. Hitscan, 8 shots/s, unlimited ammo; flares are the
  limited resource (3, +1 every 6.5 s).
- **What light does, exactly:** creatures standing in light take double damage; lurking eyes whose spot is lit when the cart comes near flee
  instead of attacking (+25 "SCARED OFF"); bats veer away from light; a burning flare stuns anything within 9 m and dazzles the Sleeper
  within 12 m. Lights you light stay lit for the whole run and count toward a lights bonus on the results screen.
- **Eyes in the dark are the ambush system:** most spiders, burrowers and some bat groups wait as pairs of glowing eyes (green, amber, red).
  Shoot the eyes first (a "snipe"), light the spot, or deal with what comes out. Pale cyan "peepers" are harmless critters that blink out
  as you pass, so the dark is always watching.
- **Route:** one fixed route with two levers (Flooded Gallery vs Deep Seam, Rockfall Run vs Spider Nest); the lever is shot, not clicked,
  and locks 4 m before the points. Defaults: Flooded Gallery and Rockfall Run. The level layout uses a fixed seed so runs can be learned.
- **The climax:** "the Sleeper", an original giant pale cave beast (part salamander, part mole) with eight amber eyes in two arcs. The track
  loops around it on a trestle and keeps looping until it falls. Eyes are the weak points; lunges can be interrupted by shooting the eyes or
  the glowing mouth; eight braziers on the ledge can be lit to make it slower and easier to hurt.
- **Ending:** after the Sleeper falls the cart races off the loop and climbs to a daylight portal; the screen fades to white and the results
  show a grade (S/A/B/C/D, X for a wreck).
- **Health:** 100, shown as CART; health and flare crates are placed along the route (shoot to open).
- **Touch:** drag anywhere to aim like a trackpad (aim speed SLOW / MEDIUM / FAST), FIRE and FLARE under the right thumb, AUTO toggle fires
  whenever the sight is on a target; small aim assist on touch only.
- **Look:** mesh-based HDR (not splats): tunnel tubes and rocky chamber ellipsoids joined by discard cuts, procedural rock shading, MSAA,
  bloom, analytic light scattering in dust, refractive river with glints and glow-worm sparkle, caustics on rock near the river.
  Lamps are the only strong light besides your flares and a dim cart headlamp, so lighting the mine is visibly yours.
- **No URL flags for players:** QUALITY (LOW / MEDIUM / HIGH / MAX), SOUND, AUTO-FIRE and AIM SPEED are buttons on the title and pause cards.
  MAX trades nothing away; HIGH has the adaptive render scale and fewer scattering lights.

## Graphics pass (2026-11-27, asked for by the owner: "make another pass and improve the graphics")
- Real shadows: flares, the nearest lamps and the daylight at the exit cast shadows through cube shadow maps (1 / 2 / 4 lights by
  quality). A flare thrown past a timber set now throws the set's shadow down the tunnel, creatures and the Sleeper cast shadows,
  and light no longer leaks round bends.
- Light shafts: the dust in the air is lit along the view ray and cut by the same shadows.
- Rock rewritten: sedimentary beds, smooth bump from noise with an analytic gradient, dust on ledges, gravel floor, wet streaks.
- Materials for props: wood grain along each timber, rusting iron, mottled creature skin with rim light, glowing crystal.
- New cart (ribbed, riveted tub with a rolled rim, plank floor, a box of spare flares, coiled rope, hooded headlamp) and a new
  pistol (banded barrel, flare tube, sights, hammer, trigger guard, gloved hand and sleeve).
- The Sleeper: rows of pulsing teal sacs down its flanks, a face light, and each lit brazier now warms the whole hollow.
- Atmosphere: cavern tints (teal river, violet crystal cavern), thinner haze in the caverns, dust motes, lens streaks on flares
  and the muzzle flash, eye adaptation, a slight chromatic fringe and a colour grade.
- Touch devices now start on MEDIUM (one shadow-casting light). No gameplay numbers changed, apart from flares resting 40 cm off
  the surface they hit.

## Ideas not built (ask before adding)
- A second level (flooded lower workings, a lava seam), daily seed variant, leaderboard.
- Switchable weapons (lantern-oil shotgun, slow heavy rivet), a co-op second reticle.
- Mine carts on parallel tracks with rival riders, a chase through a collapsing shaft as a mid-level set piece.
- Real planar reflection of the cavern in the river on MAX.

## Balance log (headless autopilot; `python test/shot.py run <skill> 4`, all four lever combinations)
| skill | branches (A,B) | survived | total | grade | damage taken | accuracy |
|---|---|---|---|---|---|---|
| 0.8 | river, falls | yes | 203,039 | S | 30 | 46 % |
| 0.8 | seam, nest | yes | 182,492 | S | 21 | 41 % |
| 0.8 | river, nest | yes | 188,308 | S | 15 | 44 % |
| 0.8 | seam, falls | yes | 177,045 | S | 12 | 42 % |
| 0.45 | river, falls | yes | 182,299 | S | 42 | 28 % |
| 0.45 | seam, falls | yes | 165,828 | A | 42 | 25 % |
| 0.2 | river, falls | yes | 130,689 | B | 84 | 28 % |
| 0.2 | seam, nest | yes | 205,163 | S | 0 | 24 % |
| 0.2 | river, nest | yes | 157,067 | A | 47 | 25 % |
| 0.2 | seam, falls | yes | 157,547 | A | 58 | 26 % |
Ride time 204-224 s. Earlier, weaker settings (skill 0.3 before the burrower weak spot) wrecked once on Deep Seam + Rockfall Run.
The autopilot sees every target the moment it is on screen; people searching the dark take more hits, so grades for people run lower.

## History
- 2026-11-27: first build in a cloud session started by a schedule. `E:\html games` was not connected to that run (the folder-access
  prompt on the PC went unanswered), so the game was built and tested from a fresh clone of GitHub `main` and delivered as
  `deeprail.zip` with a commit helper. It was published from the PC in commit 65e0d57 ("Publish Deep Rail, Tranq Safari, and
  Salvage Run"), which also added the CLAUDE.md / README rows and the lobby card (`assets/arcade/deeprail.webp`).
- 2026-11-27: graphics pass (see above), made in the same cloud session on top of 65e0d57; only paths in `deeprail/` changed.
  The session could not push to GitHub, so once the owner connected the folder it wrote the changed files straight into
  `E:\html games\deeprail` through the device bridge (sizes and SHA-256 checked) and left `deeprail\commit-deeprail.cmd`, which
  commits the tracked files in this folder and pushes main. The lobby card still shows the first screenshot: `art/deeprail-card.webp` is the new one, to copy
  over `assets/arcade/deeprail.webp` (with the `?v=<hash>` bump in the root `index.html`) in the next release.
