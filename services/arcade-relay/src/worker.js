// Arcade Shelf relay (proof of concept). Games open  wss://relay.thearcadeshelf.com/ws?game=<id>&room=<CODE>
// and everything one player sends is passed to the other player in the same room. The game itself decides
// who hosts. Rooms hold two players (more for games listed in SEATS_BY_GAME); a room is just a Durable Object
// named "<game>:<CODE>".
const ORIGINS = [/^https:\/\/thearcadeshelf\.com$/, /^https:\/\/([a-z0-9-]+\.)?thearcadeshelf\.pages\.dev$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const SEATS = 2, SEATS_BY_GAME = { blindfire: 6 }, MAX_MSG = 512 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return new Response('ok');
    if (url.pathname === '/scores') return scores(request, env, url);
    if (url.pathname !== '/ws') return new Response('Arcade Shelf relay', { status: 404 });
    const room = (url.searchParams.get('room') || '').toUpperCase(), game = url.searchParams.get('game') || '';
    if (!/^[A-Z2-9]{5}$/.test(room) || !/^[a-z0-9-]{1,40}$/.test(game)) return new Response('Bad room', { status: 400 });
    const origin = request.headers.get('Origin') || '';
    if (!ORIGINS.some(re => re.test(origin))) return new Response('Forbidden', { status: 403 });
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    return env.ROOMS.get(env.ROOMS.idFromName(`${game}:${room}`)).fetch(request);
  },
};

export class Room {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(request) {
    const game = new URL(request.url).searchParams.get('game') || '', seats = SEATS_BY_GAME[game] || SEATS;
    const socks = this.ctx.getWebSockets(), used = new Set(socks.map(ws => (ws.deserializeAttachment() || {}).seat));
    let seat = 0; while (used.has(seat)) seat++;
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    if (seat >= seats) { server.accept(); server.send(JSON.stringify({ k: 'full' })); server.close(4001, 'Room is full'); return new Response(null, { status: 101, webSocket: client }); }
    this.ctx.acceptWebSocket(server); server.serializeAttachment({ seat });
    server.send(JSON.stringify({ k: 'hello', seat, peers: socks.length, seats: [...used].filter(s => s !== undefined) }));
    for (const ws of socks) this.send(ws, JSON.stringify({ k: 'peer', on: true, seat }));
    return new Response(null, { status: 101, webSocket: client });
  }
  send(ws, msg) { try { ws.send(msg); } catch (e) { /* already closed */ } }
  webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > MAX_MSG) return;
    for (const o of this.ctx.getWebSockets()) if (o !== ws) this.send(o, msg);
  }
  webSocketClose(ws, code) {
    const seat = (ws.deserializeAttachment() || {}).seat;
    for (const o of this.ctx.getWebSockets()) if (o !== ws) this.send(o, JSON.stringify({ k: 'peer', on: false, seat }));
    try { ws.close(code >= 1000 && code < 5000 && code !== 1005 && code !== 1006 ? code : 1000, 'bye'); } catch (e) { /* closed */ }
  }
  webSocketError(ws) { this.webSocketClose(ws, 1011); }
}

// ---------------------------------------------------------------------------------------------------------------
// Daily leaderboards (proof of concept). GET /scores?game=dailybrain&day=YYYY-MM-DD[&device=id] returns the top 50
// per puzzle and for the day's total. POST /scores with a JSON body {game, day, puzzle, name, device, score, ms}
// records a player's first result for that puzzle. Scores come from the browser, so this is a friendly board,
// not a cheat-proof one: it checks ranges, keeps only the first try, and limits posts per network per day.
const BOARD_GAMES = { dailybrain: ['estimate', 'picture', 'patterns'] };
const BAD_WORDS = ['fuck', 'shit', 'cunt', 'bitch', 'nigg', 'fag', 'slut', 'whore', 'dick', 'cock', 'pussy', 'rape', 'nazi', 'hitler', 'asshole', 'retard'];
const cors = request => { const o = request.headers.get('Origin') || ''; return ORIGINS.some(re => re.test(o)) ? { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin' } : {}; };
const json = (request, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors(request) } });
const utcDay = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
async function scores(request, env, url) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors(request), 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '86400' } });
  let q;
  if (request.method === 'GET') q = Object.fromEntries(url.searchParams);
  else if (request.method === 'POST') {
    if (!ORIGINS.some(re => re.test(request.headers.get('Origin') || ''))) return json(request, { error: 'forbidden' }, 403);
    const text = await request.text(); if (text.length > 2000) return json(request, { error: 'too big' }, 413);
    try { q = JSON.parse(text); } catch (e) { return json(request, { error: 'bad json' }, 400); }
  } else return json(request, { error: 'method' }, 405);
  const puzzles = BOARD_GAMES[q.game];
  if (!puzzles || !/^\d{4}-\d{2}-\d{2}$/.test(q.day || '')) return json(request, { error: 'bad game or day' }, 400);
  if (request.method === 'POST') {
    // puzzles are by UTC date; accept today, plus yesterday's for an hour after midnight and tomorrow's for people ahead of UTC
    if (![utcDay(), utcDay(1), utcDay(-1 / 24)].includes(q.day)) return json(request, { error: 'that day is closed' }, 400);
    const name = String(q.name || '').trim().replace(/\s+/g, ' ');
    if (!/^[A-Za-z0-9 _.'-]{2,16}$/.test(name) || BAD_WORDS.some(w => name.toLowerCase().replace(/[^a-z]/g, '').includes(w))) return json(request, { error: 'Please pick a different name.' }, 400);
    if (!puzzles.includes(q.puzzle) || !/^[a-z0-9]{12,40}$/.test(q.device || '')) return json(request, { error: 'bad entry' }, 400);
    const score = Math.round(+q.score), ms = Math.round(+q.ms);
    if (!(score >= 0 && score <= 1000) || !(ms >= 1000 && ms <= 6 * 3600e3)) return json(request, { error: 'bad score' }, 400);
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    const ipHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(q.day + ':' + ip)))].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
    q = { ...q, name, score, ms, ipHash };
  }
  const res = await env.BOARDS.get(env.BOARDS.idFromName(`${q.game}:${q.day}`)).fetch('https://board/', { method: 'POST', body: JSON.stringify({ op: request.method, puzzles, ...q }) });
  return json(request, await res.json(), res.status);
}

export class Board {
  constructor(ctx) {
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS s (device TEXT, puzzle TEXT, name TEXT, score INTEGER, ms INTEGER, at INTEGER, PRIMARY KEY (device, puzzle))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS ip (h TEXT PRIMARY KEY, n INTEGER)`);
  }
  async fetch(request) {
    const q = await request.json(), out = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (q.op === 'POST') {
      const seen = this.sql.exec(`SELECT n FROM ip WHERE h = ?`, q.ipHash).toArray()[0];
      if (seen && seen.n >= 40) return out({ error: 'Too many scores from this network today.' }, 429);
      this.sql.exec(`INSERT INTO ip (h, n) VALUES (?, 1) ON CONFLICT(h) DO UPDATE SET n = n + 1`, q.ipHash);
      const had = this.sql.exec(`SELECT score FROM s WHERE device = ? AND puzzle = ?`, q.device, q.puzzle).toArray()[0];
      if (!had) this.sql.exec(`INSERT INTO s (device, puzzle, name, score, ms, at) VALUES (?, ?, ?, ?, ?, ?)`, q.device, q.puzzle, q.name, q.score, q.ms, Date.now());
      this.sql.exec(`UPDATE s SET name = ? WHERE device = ?`, q.name, q.device);
    }
    const boards = {};
    for (const p of q.puzzles) boards[p] = this.sql.exec(`SELECT name, score, ms FROM s WHERE puzzle = ? ORDER BY score DESC, ms ASC LIMIT 50`, p).toArray();
    boards.total = this.sql.exec(`SELECT MAX(name) AS name, SUM(score) AS score, SUM(ms) AS ms, COUNT(*) AS n FROM s GROUP BY device ORDER BY score DESC, ms ASC LIMIT 50`).toArray();
    const players = this.sql.exec(`SELECT COUNT(DISTINCT device) AS n FROM s`).toArray()[0].n;
    let me = null;
    if (q.device) {
      me = {};
      for (const p of q.puzzles) {
        const r = this.sql.exec(`SELECT score, ms FROM s WHERE device = ? AND puzzle = ?`, q.device, p).toArray()[0];
        if (r) me[p] = { score: r.score, rank: this.sql.exec(`SELECT COUNT(*) AS n FROM s WHERE puzzle = ? AND (score > ? OR (score = ? AND ms < ?))`, p, r.score, r.score, r.ms).toArray()[0].n + 1 };
      }
      const t = this.sql.exec(`SELECT SUM(score) AS score, SUM(ms) AS ms FROM s WHERE device = ?`, q.device).toArray()[0];
      if (t && t.score !== null) me.total = { score: t.score, rank: this.sql.exec(`SELECT COUNT(*) AS n FROM (SELECT SUM(score) AS sc, SUM(ms) AS m FROM s GROUP BY device) WHERE sc > ? OR (sc = ? AND m < ?)`, t.score, t.score, t.ms).toArray()[0].n + 1 };
    }
    return out({ day: q.day, players, boards, me });
  }
}
