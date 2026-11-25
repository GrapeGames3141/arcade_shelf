# Arcade Shelf relay

A proof-of-concept message relay for two-player arcade games, on Cloudflare Workers Free: one Worker and one
SQLite-backed Durable Object per room. It knows nothing about any game. Each player connects to

    wss://relay.thearcadeshelf.com/ws?game=<game-id>&room=<5-letter code>

and gets `{"k":"hello","seat":n,"peers":n,"seats":[…]}` (`seats` lists the seats already taken). Every text
message is passed unchanged to everyone else in the room, and `{"k":"peer","on":true|false,"seat":n}` reports a player
joining or leaving. Rooms hold two players, except games listed in `SEATS_BY_GAME` (Blindfire: 6); one more gets
`{"k":"full"}`.
Only pages served from thearcadeshelf.com, its pages.dev copies and localhost may connect.

Blindfire uses it for free-for-all rooms of up to six. Empire Rush uses it for its "Play a friend" mode: the first player in a room hosts the real game and the
second sends orders and receives snapshots.

## Daily leaderboards

`GET /scores?game=dailybrain&day=YYYY-MM-DD[&device=id]` returns the day's top 50 for each puzzle and for the total,
the player count, and (with a device id) that player's ranks. `POST /scores` with a JSON body
`{game, day, puzzle, name, device, score, ms}` records a player's first result for a puzzle; later posts only update
the name. Days are UTC dates (today, plus an hour of grace for yesterday and tomorrow's for players ahead of UTC).
Names are 2–16 letters, numbers or spaces with a small word filter; scores are 0–1000; each network can post 40
times a day. Each game-day is its own SQLite-backed Durable Object (`Board`). Scores are computed in the browser, so
the board is a friendly one rather than cheat-proof.

Run locally with `npx wrangler@4.166.0 dev --port 8787` (games on localhost use `http://127.0.0.1:8787`).
Deploy with **Actions → Deploy Arcade Relay → Run workflow**, after confirming the account is on Workers Free.
