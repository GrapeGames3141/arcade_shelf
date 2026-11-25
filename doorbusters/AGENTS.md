# Doorbusters — agent notes

Black Friday cart brawl. You wait in line outside the BUYGANTIC superstore, the doors open at 5:00 AM,
and 12 muscle-powered carts (you + 11 AI rivals) stampede in. Grab deals off pallets, ram rival carts
so their loot spills out, then stop in a checkout lane's scan zone to bank it. High score = dollars saved
that you checked out before the 3-minute sale ends. What is still in your cart at the end does not count.

`doorbusters.html` is generated: **edit `parts/*`, then run `python build.py`.** No other build step.
Test API: `window.DB`. Headless harness: `python test/shot.py basic|mobile|match|quality|js "<expr>" ...`.

## File map (parts/)
| file | what |
|---|---|
| `shell.html`, `style.css` | page skeleton, HUD, menu, pause, receipt (CSS + markup) |
| `00-util.js` | math, seeded RNG (`rnd`), `SAVE` (localStorage, try/catch), mat4, `compose()` (T·Ry·Rx·Rz·S) |
| `10-gl.js` | WebGL2 renderer: instanced box/cyl/sph/quad, batch sets `stat`/`semi`/`dyn`/`glass`, toon shader, shadow map, MSAA MRT + ink-line post, sky, atlas, `QUALITY` tiers |
| `20-world.js` | `ITEMS` catalogue, store layout (lanes, departments, `PALLET_DEFS`), colliders `COL`, atlas art, static geometry, `resetWorld()`, nav grid + A* (`navPath`, `navLOS`) |
| `30-carts.js` | cart physics (`CART` tuning), static and cart-cart rigid impulses, cart / person / teddy drawing |
| `35-items.js` | spills, pickups, pallets, breakable displays, debris, knockable props, doors, flash deals |
| `40-crowd.js` | shoppers on foot + staff: queue, rush, browse, get bowled over, get up |
| `50-ai.js` | rival brains: shop → checkout, joust (line up, charge, shove, retreat), unstick; `DIFF` table |
| `60-game.js` | game state `G`, phases (`menu`, `line`, `sale`, `closed`, `receipt`), hit rules, checkout scanning, restocks |
| `70-audio.js` | procedural WebAudio (crashes, beeps, crowd bed, store muzak) + optional speechSynthesis PA voice |
| `80-input.js` | keyboard / gamepad / touch (floating left joystick, tap right half to shove) |
| `90-main.js` | HUD, 3D labels (price tags, rival tags, popups), receipt, menus, camera (with wall ray), lights, main loop, `window.DB` |

## Rules and tuning
- Phases: `line` 9 s (camera swoop, countdown, carts can jostle; the doors are colliders), `sale` 180 s, `closed` 3 s, `receipt`.
- Cart: 6 slots. TV 3 slots, mixer / teddy / air fryer 2, the rest 1. Weight slows acceleration and top speed, and makes the cart hit harder.
- Muscle model (`CART`): push 8.5 m/s², top speed 6.6 m/s (minus 0.035 per kg of load), brake 13, reverse 2.4 m/s max, roll friction 1.3.
  Lateral grip kills sideways speed (fixed rear casters); a hit drops grip to 0.12 and it recovers at 1.1/s.
- Shove = lunge: +4.2 m/s (cap vmax + 3.6), 0.45 s of 1.7x ram power, 1.7 s cooldown.
- Spill: when the victim's Δv ≥ 2.3 m/s, 1 item + 1 per extra 1.4 m/s (max 3, +1 if hit while scanning). Spilled loot is grabbable by others after 0.45 s, by its owner after 1.2 s.
  Hitting a wall at ≥ 5.4 m/s spills 1 item (BONK). Displays break at ≥ 2.2 m/s.
- Shoppers on foot are bowled over by a cart contact speed > 1.7 m/s (lie down 2.4 s); they sidestep carts charging at them.
- Checkout: stop (speed < 2.8) in the cyan zone of a lane. Scan time per item 0.42 s (2-slot 0.6, TV 0.85); express lanes 5 and 6 scan twice as fast when you have ≤ 3 items. Getting knocked out of the zone stops scanning.
- Restock every 16-22 s (3-5 low pallets refilled); flash deals at 150 / 118 / 84 / 50 s left (+3-5 stock, cyan beacon, HUD arrow).
- High score per rival level in localStorage `doorbusters.best0..2`. Settings in `doorbusters.quality|diff|sound|voice`.

## AI (50-ai.js)
- `pickTarget`: value / (distance + 8) with crowding penalty and flash bonus; floor loot scores higher (cheap to grab).
- Cash in when the cart is full, value ≥ personal caution (650-1500), or time left < ETA + 6.
- Joust: rival with loot ≥ $200 within 13 m and in line of sight; aim at its predicted position, shove inside 3.6 m when facing within 0.35 rad, retreat after contact, cooldown 4-10 s / aggression. `gang` raises the player's weight (Feral 1.6).
- Measured headless (`test/shot.py match`, 2026-11-24): average rival speed 3.4 / 3.8 / 3.7 m/s (Polite / Pushy / Feral), about 4-13 rams per cart per match,
  banked $650-$7,154 per cart; the autopilot "player" scored 4,290 / 3,970 / 2,082, so rival levels do bite.

## Renderer notes
- Per-fragment "inside" factor from world position switches the palette between the night parking lot (moonlight, sodium lamps) and the bright store,
  so the lit interior shows through the doors without extra passes.
- Ink lines: MRT (colour + normal) into a 4x MSAA FBO, blit-resolve colour, normal and depth (depth blit is allowed in WebGL2), then a depth/normal edge pass.
- `SET.semi` holds pallets and unbroken displays and is only rebuilt when `SEMI_DIRTY` (stock change, display broken, flash on/off).
- Quality: LOW (no shadows, no post, 0.8 scale, flat-colour shelf fills), MED (1024 shadow, post, DPR ≤ 1.5), HIGH (2048 PCF 3x3, DPR ≤ 2, pixel budget 3.2 MP),
  MAX (4096 PCF 5x5, native DPR, nothing traded).
- Chase camera: a ray from the cart to the camera against `wall`/`door` boxes keeps it out of the facade and walls (it clipped through the front wall in the line before this).

## Test recipe
```
python build.py
python test/shot.py basic     # menu, line, doors, rush, sale, checkout view, deal zone, receipt (+ stats)
python test/shot.py mobile    # 390x844 portrait + landscape, real pointer joystick / shove / pause
python test/shot.py match     # 3 headless matches (one per rival level) with autopilot player, prints balance stats
python test/shot.py js "DB.start({seed:3})" "DB.step(5)" "shot:name" "DB.state()"
```
Screenshots go to `test/out/` (git-ignored by convention; don't commit them). The harness serves this folder on port 8765 and runs Chrome with SwiftShader.
`DB`: `start({diff,seed})`, `skipLine()`, `step(sec)`, `input({thr,steer,shove})`, `autopilot(on)`, `teleport(x,z,h)`, `give(kind,n)`, `setQuality(q)`, `state()`, `stats()`.
