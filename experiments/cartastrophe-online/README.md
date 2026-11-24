# Cartastrophe Online (prototype)

A two-player online version of Cartastrophe. Players get a private room code, one arena (the clifftop parking lot), and the
same carts, physics and controls as the arcade game. The match runs on a Cloudflare Worker with **one SQLite-backed Durable
Object per room**. Browsers only send their inputs over a WebSocket. The server decides every collision, pickup, item
hit, wipeout and score, and sends snapshots back 30 times a second.

This remains a Worker experiment. The arcade shelf links directly to its deployed Worker; the experiment source and
generated page remain out of the GitHub Pages package (see `../AGENTS.md`).

## Run it locally

Needs Node 18+ and Python 3. No Cloudflare account is needed for local play.

```
cd "E:\html games\experiments\cartastrophe-online"
run-local.cmd
```

Or by hand: `npm install` once, then `npm run dev`. That rebuilds the client and starts `wrangler dev` on port 8787.

Open http://127.0.0.1:8787/ in two browser windows (or a window plus a phone on the same Wi-Fi at
`http://<your PC's LAN IP>:8787/`, after running `npx wrangler dev --ip 0.0.0.0 --port 8787`).

1. Window 1: type a name, pick lives, press **Create room**. A 5-character code appears.
2. Window 2: type the code and press **Join**. **Copy invite link** gives a link that fills the code in for you.
3. Both press **READY**. After the 3-second countdown, knock each other into the pond, off the cliff or into walls.
4. At the end, both press **REMATCH** to play again, or **Leave room**.

Controls are the arcade game's: W/A/D/S, Shift to boost, E for items, Esc for settings. On a phone, the left thumb is the
floating joystick (up = rocket, down = brake, sideways = steer), BOOST is on the right, and tapping the right half of
the screen uses your item. A match can't be paused online: Esc opens settings over the running game.

## How it works

| Piece | File | What it does |
| --- | --- | --- |
| Worker | `src/worker.js` | Serves the page from `public/`, creates rooms (`POST /api/rooms`), routes `/ws?room=CODE` to that room's Durable Object |
| Room | `src/room.js` | Durable Object: two seats with rejoin tokens, lobby/ready, a 30 Hz loop of 4 physics steps (1/120 s each), snapshots and events out. SQLite tables `meta` and `matches` hold room settings and every match result |
| Server game | `src/core-server.js` | The match rules from the arcade `physicsStep` (pickups, bananas, leaf blower, watermelons and juice, free sample, respawns, scoring, end of match), with no rendering |
| Shared physics | `shared/10-util.js`, `40-world.js`, `50-physics.js` | Unchanged copies of the arcade parts. `build.py` wraps them with the server game in `makeSim()` so each room gets its own state (`src/sim.js`, generated) |
| Client | `client/85-online.js`, `online.html`, `online.css` | Create/join/lobby UI. Sends inputs on change (at most 20/s, plus 4/s heartbeat). Predicts its own cart with the shared physics and eases it toward the server. Draws the opponent 100 ms in the past, interpolated. Turns server events into the usual wrecks, ragdolls, sounds and callouts |
| Page | `public/cartastrophe-online.html` (generated) | The arcade parts plus the client part |

Scoring matches the arcade: +1 takedown, +1 more for a final takedown, +2 for the last cart rolling, −1 for a
self-checkout. Leaving mid-match, or staying disconnected for 30 s, forfeits.

To pull in the latest arcade code after changing `cartastrophe/parts`, run `python build.py --sync`.

## Tests

With `npm run dev` running in another terminal:

| Command | Checks |
| --- | --- |
| `node test/sim-node.mjs` | Server sim alone in Node: two rooms stay separate, a scripted match ends, a ram off the cliff credits the rammer |
| `node test/ws-duel.mjs` | Two raw WebSocket clients: create, join, rider de-dupe, full room, bad code, full match, matching results, rejoin with token |
| `node test/ws-rtt.mjs` | Ping round-trip and snapshot rate through `wrangler dev` |
| `python test/browser-duel.py` | Two real browsers (desktop keyboard + phone emulation with multi-touch joystick and item taps): lobby, match, end receipt, rematch, dropped-socket rejoin, leaving mid-match. Screenshots go to `test/out/` |
| `python test/phone-vs-bot.py` | One phone-emulated browser against `test/ws-bot.mjs` (a headless chaser), for frame rate and prediction error |

## Cloudflare plan and cost

Everything here works on **Workers Free**: a Worker, static assets, and SQLite-backed Durable Objects, which are the only
Durable Object storage on the Free plan. On Free, going over a daily limit makes requests fail until the next day. It
doesn't create charges. Rough budget per day on Free:

* Durable Object requests: 100,000/day. Incoming WebSocket messages count 20 to 1, and outgoing snapshots are free. Each
  player sends 4 to 20 input messages a second (keyboard players send fewer, a moving touch stick sends more), so a
  3-minute match costs roughly 75 to 360 requests. That's roughly 275 to 1,300 matches a day.
* Durable Object duration: 13,000 GB-s/day, or about 28 hours of a room being connected. A room stops its loop once nobody
  is connected.

The verified direct launch URL is [Cartastrophe Online](https://cartastrophe-online.patguettler.workers.dev/). See
`DEPLOY.md` for the Workers Free deployment gate and limits.

To serve the page from the arcade site (GitHub Pages) with only the room server on Cloudflare, see `HOSTING.md`.
