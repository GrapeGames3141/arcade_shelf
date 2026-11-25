// Arcade Shelf relay (proof of concept). Games open  wss://relay.thearcadeshelf.com/ws?game=<id>&room=<CODE>
// and everything one player sends is passed to the other player in the same room. The game itself decides
// who hosts. Rooms hold two players; a room is just a Durable Object named "<game>:<CODE>".
const ORIGINS = [/^https:\/\/thearcadeshelf\.com$/, /^https:\/\/([a-z0-9-]+\.)?thearcadeshelf\.pages\.dev$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const SEATS = 2, MAX_MSG = 512 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return new Response('ok');
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
  async fetch() {
    const socks = this.ctx.getWebSockets(), used = new Set(socks.map(ws => (ws.deserializeAttachment() || {}).seat));
    let seat = 0; while (used.has(seat)) seat++;
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    if (seat >= SEATS) { server.accept(); server.send(JSON.stringify({ k: 'full' })); server.close(4001, 'Room is full'); return new Response(null, { status: 101, webSocket: client }); }
    this.ctx.acceptWebSocket(server); server.serializeAttachment({ seat });
    server.send(JSON.stringify({ k: 'hello', seat, peers: socks.length }));
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
