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
| 00-head.html | CSS, HUD (time, score, bobbins, fabric chip), menu with a fabric legend |
| 10-util.js, 20-render.js | **copied from Mitten Mountain** (splat builder, renderer, MSAA + alpha-to-coverage, tilt-shift post) |
| 30-felt.js | felt primitives copied from Mitten Mountain's models part |
| 35-models.js | hedgehog ball (spike splats, tucked face) and standing hedgehog, bobbin, scissor blade, button bumper, pincushion, flowers, bushes, spring backdrop |
| 40-quilt.js | height field `H(x,s)` (base grade table + rolling + lateral bowl and walls + kickers), patch types/prints, 20 m chunk baking, rolled striped borders, finish pins and ribbon |
| 50-game.js | course generator, rolling-ball physics, collisions, scoring, autopilot |
| 60-io.js | input (shared with Mitten), rolling rumble that changes with fabric (corduroy uses amplitude-modulated brrr), boing/snip sfx, music box, HUD |
| 70-main.js | quality tiers, chase camera (heading clamped ±0.5 rad from downhill), render order, loop, menus, `window.QR` |

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
- **Splat counts**: about 30 k splats per 20 m chunk at density 1. HIGH uses density 0.85 with 160 m of draw distance; MAX uses 1.35 with 210 m.
- **The autopilot is a smoke test only.** It finishes in about 75 s and collects around 30 of 109 bobbins. Driving straight at a bobbin collects it every time.
