# Quilt Hill Roll: agent notes

A felt hedgehog curls into a ball and rolls down a 700 m hillside made of quilt patches. It's rendered with Gaussian splats, using the same felt renderer as Mitten Mountain.

- Game: `quilthill.html`, generated from `parts/*` by `python build.py`. **Edit the parts, never the HTML.**
- Test API: `window.QR`. Harness: `python test/shot.py <basic|mobile|full|kick|perf> [low|medium|high|max]` (Python Playwright with SwiftShader). Screenshots go to `test/out/`.
- `QR.input({...})` sets a persistent override (`window.INP_OVR`), because the render loop's `readInput()` would otherwise reset input between evaluate calls.

## Play
- **Patches** (fixed seed): cotton prints (gingham, dots, stripes, floral, solid) roll normally. Corduroy has high rolling friction and strong sideways grip. Satin is nearly frictionless with almost no sideways grip and only 35% steering. Satin forms wandering "rivers" downhill, and corduroy comes in clusters. A HUD chip shows which fabric you're on.
- **Bobbins** are worth 25 each. Snakes, clusters and arcs over the piping kickers. Collecting every bobbin earns +500.
- **Button bumpers** give a BOING (+5): you get thrown back out at 8 m/s or more with a small hop.
- **Giant scissors** lie across the lane with jaws that snap vertically. Hitting them while they're closing or shut is a SNIP: you lose 3 bobbins, which tumble away, and the hit knocks you back. Hitting open jaws is a CLONK, which only knocks you back.
- **Piping kickers** are raised rolls across part or all of the width that launch you. Airtime over 0.7 s scores (80 per second beyond 0.5 s), and over 1.3 s it's BIG AIR.
- **Finish**: there's a time bonus of 10 × (95 − time). The hedgehog uncurls and hops at the end.
- **Controls**:
  - Keyboard: A/D or arrows steer relative to your heading, W pushes, S brakes, Space hops.
  - Touch: a left-thumb floating joystick plus a HOP button.
  - Gamepad works too.
- In-page buttons cover quality, sound and pause.

## File map
| part | what |
|---|---|
| 00-head.html | CSS, HUD, menu legend |
| 10-util.js, 20-render.js | copied from Mitten Mountain; this game's splat shader adds fire light (`uFireP/uFireCol/uFireI/uFireR`) |
| 22-mesh.js | lit mesh renderer: texture or vertex colour, wrap diffuse, specular, metal reflection, fabric weave (world-space, fades with `fwidth`), fire point light, fog, `uClipS` clip for the far LOD. Mesh builder `MB` (grid, box, lathe, torus, tube, sphere), canvas → mipmapped anisotropic texture. Additive flame and glow billboard shader |
| 30-felt.js, 35-models.js | felt primitives, hedgehog ball and standing hedgehog, bobbin (splats) |
| 36-notions.js | mesh notions: scissor halves (bevelled steel blades + plastic handle loops), pivot screw, dimpled gold thimble, embroidery hoop, dress pin + glossy head, coat-button bumper, tape-measure case; felt yarn ball (splats) |
| 40-quilt.js | height field `H(x,s)`, patch types, chunk bookkeeping; floor height `QH.FY`; `QH.KICK` kickers, `QH.ZIP` zippers |
| 41-quilttex.js | **crisp quilt**: per 20 m chunk, a grid mesh with pillow puff (`HR = H + puff`) and a canvas texture painted per patch (gingham, dots, stripes, floral, calico, plaid, hearts, stars, corduroy ridges, satin sheen, seam + running stitch), tape-measure markings on kickers, zipper teeth. Blanket pile (knit texture) and upholstery cliff down to the floor. Far LOD: one flat-coloured quad per patch for the whole quilt, drawn only beyond the loaded chunks |
| 42-room.js | giant living room (about 90× real scale): wood floor, wallpaper and wainscot, ceiling beams, stone fireplace with logs, mantel clock, candles, mountain painting, braided rug, armchair, side table + glowing lamp, bookshelf, night window, finish pins + gingham ribbon, tomato pincushions; flame billboards |
| 50-game.js | course generator, rolling-ball physics, notions, scoring, autopilot |
| 60-io.js | input, procedural audio (rumble per fabric, boing, snip, zip, thimble, hoop, ouch), HUD |
| 70-main.js | room lighting, quality tiers (texture px/m: 20, 28, 40, 56), chase camera, render order (meshes → blob shadows → felt splats → fire → resolve), `window.QR` |

## Notions
- **Gold thimble**: +100, sometimes beside scissors, after a hoop, or high over a kicker.
- **Embroidery hoop**: roll through the middle (|dx| < 1.05) for +50 and a +3 m/s boost. Hitting the rim is a CLONK.
- **Zipper strip**: 18–32 m long. Riding the teeth adds 6.5 m/s² downhill and gently pulls you onto the line (about 17.5 m/s versus about 9.7 off it in the test).
- **Dress pins**: a row across the hill with one gap. A hit is an OUCH and costs 1 bobbin.
- **Tape measure**: kickers are painted as tape, and partial-width kickers get a tape-measure case beside them, which is solid.
- **Yarn balls**: wake 60 m ahead, roll across and down the hill and bounce off the borders. A hit is a BONK.
- **Scissors and buttons** work as before, now drawn as meshes.
- Test API additions: `QR.zips()`. Harness scenario `notions` checks the zipper, hoop, pins and thimble and takes screenshots.

## Physics tuning
- Downhill acceleration is −g ∇H × 0.72 / (1 + |∇H|²).

| fabric | rolling friction | sideways damping (x) | steering grip |
|---|---|---|---|
| cotton | 0.035 g | 1.1 | 1.0 |
| corduroy | 0.13 g | 2.6 | 1.45 |
| satin | 0.008 g | 0.15 | 0.35 |

- Drag is 0.006 v|v|. Steering is 7.5 × grip and pushes along the heading's right vector. Push is 3 × grip below 14 m/s.
- Launch from a kicker happens when the ground's vertical speed drops more than 2.5 m/s in one step. Hop gives +5.6 vy, with 13 gravity in the air. A hard landing below −7 m/s bounces at 0.22.
- Heading follows velocity at rate 2.5 (0.8 airborne), clamped to ±0.5 rad from straight downhill so the camera always looks down the hill.

## Findings
- **Lay layouts out by lateral reach.** Bobbin snakes originally swung ±12 m every 3 m, which is unreachable at 12 m/s. Now they swing ±2.5–6 m every 4.5 m.
- **Flat objects foreshorten to nothing.** A flat object pointing at a chase camera vanishes. The scissors lie across the lane, and the jaw plane is rotated about 72° so it faces the camera.
- **Crispness**: the quilt is now a mesh with a painted texture (anisotropic filtering, mipmaps) and there's no tilt-shift blur. Splats are only used for the felt hedgehog, bobbins and yarn balls.
- **The autopilot is a smoke test only.** It finishes in about 75 s and collects around 30 of 109 bobbins. Driving straight at a bobbin collects it every time.
