# Hosting Cartastrophe Online from the arcade site

Status: **plan, not built yet.** Nothing is deployed. The steps below need the owner's go-ahead. Two of them also need
explicit approval: deploying to Cloudflare (see `DEPLOY.md`), and putting an experiment on the Pages site.

## The idea

| Part | Where it lives | Why |
| --- | --- | --- |
| Game page (`cartastrophe-online.html`) | The arcade site, `https://grapegames3141.github.io/HTML-Games/` | Players open it from the same site as every other game |
| Room server (Worker + one Durable Object per room) | Cloudflare, `https://cartastrophe-online.<subdomain>.workers.dev` | GitHub Pages only serves files. It can't hold a room open or run the match |

The page loads from GitHub Pages, then talks to the Cloudflare server for `POST /api/rooms` and the `/ws` WebSocket.
Offline play on the page keeps working even if the server is down.

## Code changes

### 1. Client: a configurable server address (`client/85-online.js`, `build.py`)

Today the client calls `/api/rooms` and `ws(s)://<same host>/ws`, so it only works when the page comes from the Worker.

* Add `NET.server`, set at build time: `python build.py --server https://cartastrophe-online.<subdomain>.workers.dev`
  writes `const CTO_SERVER = '...'` into the page. With no `--server`, it stays empty, which means "same origin" (local
  `wrangler dev` and the workers.dev copy keep working unchanged).
* `fetch(NET.server + '/api/rooms?...')`, and `new WebSocket(NET.server.replace(/^http/, 'ws') + '/ws?room=...')`.
  GitHub Pages is https, so this must be `https://` and `wss://`. Browsers block plain `ws://` from an https page.
* The invite link keeps using the page's own address, so it points at the arcade site. No change needed.
* If the server can't be reached, show "Online play is unavailable right now. Offline play still works." under the
  Create/Join buttons.

### 2. Worker: allow the arcade site, refuse everyone else (`src/worker.js`, `wrangler.jsonc`)

* Add `"vars": { "ALLOWED_ORIGINS": "https://grapegames3141.github.io,http://127.0.0.1:8000,http://localhost:8000" }`
  to `wrangler.jsonc`. An origin is scheme plus host only, with no `/HTML-Games/` path. Vars are free.
* `POST /api/rooms`: if the request's `Origin` is in the list, reply with `Access-Control-Allow-Origin: <that origin>`
  and `Vary: Origin`. The request has no body or custom headers, so browsers send it without a preflight. Still answer
  `OPTIONS /api/rooms` with the same headers and `Access-Control-Allow-Methods: POST`, in case that changes.
* `/ws`: browsers don't apply CORS to WebSockets, so the Worker checks the `Origin` header itself. If it's missing from
  the list (or isn't the Worker's own address), answer 403. That stops other sites from spending the Free-plan quota.
* Requests from the Worker's own address stay allowed, so the workers.dev copy keeps working.

### 3. Get the page onto the Pages site (needs explicit approval)

`experiments/` is left out of the Pages build on purpose (`CLAUDE.md`, `experiments/AGENTS.md`). Pick one:

* **A. Curated experiment page (no lobby card).** `build.py` also writes
  `experiments/cartastrophe-online/cartastrophe-online.html`. Add it to the curated nested entrypoints in
  `tools/build-pages.py`, next to `experiments/Astra-demo/Astra-demo.html` and `experiments/demo/demo.html`, and update
  the rule text in `CLAUDE.md` and `README.md`. Players reach it by link, for example a button on the Cartastrophe
  title screen.
* **B. Promote to an arcade game (lobby card).** Move the folder to `cartastrophe-online/` at the repo root, with
  `cartastrophe-online/cartastrophe-online.html` and a `game.json` (title, "2-player online" description,
  `requirements: "Internet; a friend with the room code"`). Add it to the game tables in `CLAUDE.md` and `README.md`.
  The Pages build then finds it automatically.

Either way, only the HTML page is published. `src/`, `test/`, `node_modules/` and the wrangler files stay out: the
Pages build already skips source-only folders. Check this with `python tools/build-pages.py` and by looking in
`work/pages/`.

### 4. Pages "Quick hide" key

On the site, Quick hide now only pauses the game. An online match can't pause, because the server keeps the clock
running for both players. So in this page, "pause" opens the settings panel over the running match (`setPause` in
`client/85-online.js`).

Planned change: while that panel is open online, the client sends no throttle and the brake on, so your cart stops
instead of rolling on with whatever keys were held. The opponent can still shove it. Closing the panel hands control
back. The arcade build needs no change for this page.

## Order of work

1. Owner approves the Cloudflare test deploy (`DEPLOY.md`: account on Workers Free, `wrangler login`, `whoami`).
2. Make the Worker change (step 2), deploy it, and note the `workers.dev` address.
3. Make the client change (step 1), then build with `--server <that address>`.
4. Test locally across origins: `npx wrangler dev` on 8787, plus `python -m http.server 8000` serving the built page,
   with `ALLOWED_ORIGINS` including `http://127.0.0.1:8000`. Run `test/browser-duel.py` and `test/phone-vs-bot.py`
   pointed at the 8000 page.
5. Owner picks A or B (step 3). Wire it in, then run `python tools/build-pages.py`
   and check `work/pages/`.
6. Commit and push `main`. The Pages workflow publishes it. Play one match between a phone and a PC on the live site.

## Cost and limits

The same as `README.md`: Workers Free, roughly 275 to 1,300 matches a day, and when a limit is hit, requests fail until
the next day. No bill. GitHub Pages hosting of the page is free and unchanged.

## Undo

Remove the page entry (A) or folder (B) and push, and the site goes back to how it was.
`npx wrangler delete cartastrophe-online` removes the server.
