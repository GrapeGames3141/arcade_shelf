// One SQLite-backed Durable Object per private room. It owns the match: browsers only send inputs.
import { DurableObject } from 'cloudflare:workers';
import { makeSim } from './sim.js';

const TICK_MS = 1000 / 30;      // server tick and snapshot rate
const STEPS_PER_TICK = 4;       // 4 x 1/120 s physics steps = 1/30 s
const ROOM_TTL_MS = 12 * 3600e3;
const REJOIN_MS = 30e3;
const MAX_MSG = 2048;

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS matches (id INTEGER PRIMARY KEY AUTOINCREMENT, ended_at INTEGER, duration REAL, lives INTEGER, results TEXT)`);
    this.slots = [null, null];   // { ws, token, name, rider, ready, goneAt }
    this.sim = null; this.loop = null; this.tick = 0; this.endedAt = 0;
  }
  meta(k) { const r = this.sql.exec('SELECT v FROM meta WHERE k = ?', k).toArray(); return r.length ? r[0].v : null; }
  setMeta(k, v) { this.sql.exec('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', k, String(v)); }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/init') {
      if (this.meta('created')) return new Response('exists', { status: 409 });
      const lives = [0, 1, 3, 5].includes(+url.searchParams.get('lives')) ? +url.searchParams.get('lives') : 3;
      this.setMeta('created', Date.now()); this.setMeta('code', url.searchParams.get('code') || ''); this.setMeta('lives', lives); this.setMeta('matches', 0);
      return Response.json({ ok: true, lives });
    }
    if (url.pathname === '/info') {
      return Response.json({ exists: !!this.meta('created'), lives: +(this.meta('lives') || 3), players: this.slots.filter(Boolean).length, matches: this.sql.exec('SELECT COUNT(*) AS n FROM matches').one().n });
    }
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
    const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
    server.accept();
    const created = +(this.meta('created') || 0);
    if (!created || Date.now() - created > ROOM_TTL_MS) {
      server.send(JSON.stringify({ t: 'error', code: 'noroom', msg: created ? 'That room has expired. Create a new one.' : 'No room with that code.' }));
      server.close(4404, 'no room');
      return new Response(null, { status: 101, webSocket: client });
    }
    server.addEventListener('message', ev => { try { this.onMessage(server, ev.data); } catch (e) { console.error('message error', e && e.stack || e); } });
    server.addEventListener('close', ev => { try { server.close(ev.code === 1005 ? 1000 : ev.code, 'bye'); } catch (e) { } this.onClose(server); });   // finish the close handshake
    server.addEventListener('error', () => this.onClose(server));
    return new Response(null, { status: 101, webSocket: client });
  }

  slotOf(ws) { return this.slots.findIndex(s => s && s.ws === ws); }
  send(ws, obj) { try { ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); } catch (e) { } }
  broadcast(obj) { const s = JSON.stringify(obj); for (const p of this.slots) if (p && p.ws) this.send(p.ws, s); }
  lobby() {
    this.broadcast({ t: 'lobby', code: this.meta('code'), lives: +(this.meta('lives') || 3), mode: this.sim ? this.sim.GAME.mode : 'lobby',
      players: this.slots.map((p, i) => p ? { slot: i, name: p.name, rider: p.rider, ready: !!p.ready, connected: !!p.ws } : null) });
  }

  onMessage(ws, data) {
    if (typeof data !== 'string' || data.length > MAX_MSG) return;
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    const i = this.slotOf(ws);
    if (m.t === 'in') { if (i >= 0 && this.sim) this.sim.setInput(i, m); return; }
    if (m.t === 'ping') { this.send(ws, { t: 'pong', c: m.c }); return; }
    if (m.t === 'hello') return this.hello(ws, m);
    if (i < 0) return;
    if (m.t === 'ready') {
      this.slots[i].ready = !!m.on; this.lobby();
      const mode = this.sim ? this.sim.GAME.mode : 'lobby';
      if ((mode === 'lobby' || mode === 'end') && this.slots.every(p => p && p.ws && p.ready)) this.startMatch();
      return;
    }
    if (m.t === 'leave') { this.leave(i, true); return; }
  }

  hello(ws, m) {
    const name = String(m.name || 'Shopper').replace(/[^\w .'-]/g, '').slice(0, 14) || 'Shopper';
    let rider = Math.max(0, Math.min(5, m.rider | 0));
    let i = m.token ? this.slots.findIndex(s => s && s.token === m.token) : -1;
    if (i >= 0) { // rejoin
      const s = this.slots[i]; if (s.ws && s.ws !== ws) { try { s.ws.close(4000, 'replaced'); } catch (e) { } }
      s.ws = ws; s.goneAt = 0;
    } else {
      i = this.slots.findIndex(s => !s);
      if (i < 0) { this.send(ws, { t: 'error', code: 'full', msg: 'That room already has two players.' }); try { ws.close(4409, 'full'); } catch (e) { } return; }
      const other = this.slots[1 - i];
      if (other && other.rider === rider) rider = (rider + 1) % 6;
      this.slots[i] = { ws, token: crypto.randomUUID(), name, rider, ready: false, goneAt: 0 };
    }
    const s = this.slots[i];
    this.send(ws, { t: 'welcome', slot: i, token: s.token, code: this.meta('code'), rider: s.rider, lives: +(this.meta('lives') || 3) });
    if (this.sim && (this.sim.GAME.mode === 'play' || this.sim.GAME.mode === 'countdown')) this.send(ws, this.startMsg());
    this.lobby();
    this.ensureLoop();
  }

  startMsg() { return { t: 'start', seed: this.seed, lives: +(this.meta('lives') || 3), riders: this.sim.GAME.carts.map(c => this.sim.RIDERS.indexOf(c.rider)), names: this.slots.map(p => p ? p.name : '?') }; }

  startMatch() {
    const lives = +(this.meta('lives') || 3);
    this.sim = makeSim({ lives });
    this.seed = (Math.random() * 1e9) | 0;
    this.sim.startMatch(this.slots.map(p => p.rider), this.seed);
    for (const p of this.slots) p.ready = false;
    this.endedAt = 0; this.startedAt = Date.now();
    this.broadcast(this.startMsg());
    this.ensureLoop();
  }

  ensureLoop() {
    if (this.loop) return;
    this.last = Date.now(); this.acc = 0;
    this.loop = setInterval(() => { try { this.step(); } catch (e) { console.error('tick error', e && e.stack || e); } }, TICK_MS);
  }
  stopLoop() { if (this.loop) { clearInterval(this.loop); this.loop = null; } }

  step() {
    const now = Date.now();
    // players who dropped: hold their slot for a rejoin, then forfeit / free it
    this.slots.forEach((p, i) => {
      if (p && !p.ws && p.goneAt && now - p.goneAt > REJOIN_MS) {
        if (this.sim) this.sim.forfeit(i);
        this.slots[i] = null; this.lobby();
      }
    });
    if (!this.slots.some(p => p && p.ws)) { this.stopLoop(); return; }   // nobody here: stop billing duration
    if (!this.sim || this.sim.GAME.mode === 'lobby') return;
    const G = this.sim.GAME;
    const playing = G.mode === 'countdown' || G.mode === 'play' || (G.mode === 'end' && (!this.endedAt || now - this.endedAt < 3000));
    if (!playing) return;
    // fixed steps, catching up if a tick ran late (capped)
    this.acc += Math.min(250, now - this.last); this.last = now;
    let n = 0;
    while (this.acc >= TICK_MS / STEPS_PER_TICK && n < 24) { this.sim.physicsStep(this.sim.PHYS_DT); this.acc -= TICK_MS / STEPS_PER_TICK; n++; }
    const snap = this.sim.snapshot();
    snap.ev = this.sim.drainEvents();
    snap.tick = ++this.tick;
    if (G.mode === 'end' && !this.endedAt) {
      this.endedAt = now;
      const res = this.sim.results();
      res.forEach(r => { const p = this.slots[r.slot]; r.player = p ? p.name : null; });
      this.sql.exec('INSERT INTO matches (ended_at, duration, lives, results) VALUES (?, ?, ?, ?)', now, (now - this.startedAt) / 1000, +(this.meta('lives') || 3), JSON.stringify(res));
      this.setMeta('matches', +(this.meta('matches') || 0) + 1);
      snap.results = res;
      setTimeout(() => this.lobby(), 50);
    }
    this.broadcast(snap);
  }

  leave(i, voluntary) {
    const p = this.slots[i]; if (!p) return;
    if (this.sim && voluntary) this.sim.forfeit(i);
    this.slots[i] = null;
    try { p.ws && p.ws.close(1000, 'bye'); } catch (e) { }
    this.lobby();
  }

  onClose(ws) {
    const i = this.slotOf(ws); if (i < 0) return;
    const p = this.slots[i]; p.ws = null; p.goneAt = Date.now(); p.ready = false;
    if (this.sim) this.sim.setInput(i, { th: 0, st: 0, br: 0, bo: 0, it: this.sim.GAME.carts[i] ? this.sim.GAME.carts[i].itemCount : 0 });
    this.lobby();
  }
}
