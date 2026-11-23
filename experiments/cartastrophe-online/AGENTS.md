# Cartastrophe Online: agent notes

* Experiment, not an arcade game. Never list it on the arcade homepage or add it to the Pages build. It needs a Worker,
  so the static `127.0.0.1:8000` server can't run it. Use `npm run dev` (wrangler dev, port 8787).
* Edit `client/*`, `src/core-server.js`, `src/room.js`, `src/worker.js`. **Never edit generated files**:
  `src/sim.js` and `public/cartastrophe-online.html` (rebuild with `python build.py`).
* `shared/` is a copy of `../../cartastrophe/parts`. Refresh it with `python build.py --sync`, never by hand-editing.
  Gameplay changes belong in the arcade parts first.
* The server is authoritative. The client may predict its own cart, but scoring, KOs, pickups and items come only from
  server events. Client hooks wrap globals (`tick`, `physicsStep`, `knockOut`, `useItem`, ...) only while `NET.inMatch`.
* Workers Free only. No deploys without the owner's approval and a Free-plan check (`DEPLOY.md`). Don't add KV, R2,
  D1, Queues, cron triggers, or anything that needs the paid plan.
* Test headless (`test/*.py`, `test/*.mjs`) with logs and screenshots. Don't test by watching the screen.
