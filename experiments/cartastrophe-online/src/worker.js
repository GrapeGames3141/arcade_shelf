// Cartastrophe Online (prototype) Worker: static client from ./public, private rooms as Durable Objects.
import { Room } from './room.js';
export { Room };

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
function newCode(n = 5) {
  const b = new Uint8Array(n); crypto.getRandomValues(b);
  return Array.from(b, x => ALPHABET[x % ALPHABET.length]).join('');
}
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      const lives = url.searchParams.get('lives') || '3';
      for (let k = 0; k < 6; k++) {
        const code = newCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const r = await stub.fetch(`https://room/init?code=${code}&lives=${encodeURIComponent(lives)}`, { method: 'POST' });
        if (r.status === 200) { const j = await r.json(); return json({ code, lives: j.lives }); }
      }
      return json({ error: 'Could not create a room, try again.' }, 503);
    }
    if (url.pathname === '/ws') {
      const code = (url.searchParams.get('room') || '').toUpperCase();
      if (!/^[A-Z2-9]{5}$/.test(code)) return new Response('Bad room code', { status: 400 });
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
    }
    if (url.pathname === '/' || url.pathname === '') return Response.redirect(new URL('/cartastrophe-online.html', url).toString(), 302);
    return env.ASSETS.fetch(request);
  }
};
