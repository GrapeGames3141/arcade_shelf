// Run the server sim headless in Node: two scripted carts, check ramming, scoring and events.
import { makeSim } from '../src/sim.js';
const a = makeSim({ lives: 3 }), b = makeSim({ lives: 3 });
a.startMatch([0, 4], 42); b.startMatch([1, 2], 7);
if (a.GAME === b.GAME) throw new Error('rooms share state!');
let evs = {}, snaps = 0, bytes = 0;
const G = a.GAME;
for (let tick = 0; tick < 30 * 120 && G.mode !== 'end'; tick++) {
  // cart 0 chases cart 1 and boosts; cart 1 drives in circles
  const c0 = G.carts[0], c1 = G.carts[1];
  const want = Math.atan2(c1.x - c0.x, c1.z - c0.z), err = ((want - c0.yaw + Math.PI * 3) % (2 * Math.PI)) - Math.PI;
  a.setInput(0, { th: 1, st: Math.max(-1, Math.min(1, -err * 2)), bo: Math.abs(err) < 0.3 ? 1 : 0, it: tick > 300 ? Math.floor(tick / 200) : 0 });
  a.setInput(1, { th: 0.7, st: 0.6 });
  for (let k = 0; k < 4; k++) a.physicsStep(a.PHYS_DT);
  const s = a.snapshot(); s.ev = a.drainEvents(); snaps++; bytes += JSON.stringify(s).length;
  for (const e of s.ev) evs[e.t] = (evs[e.t] || 0) + 1;
}
console.log('mode', G.mode, 'sim time', G.now.toFixed(1), 'timer', G.timer.toFixed(1));
console.log('events', JSON.stringify(evs));
console.log('koLog', JSON.stringify(G.koLog.slice(0, 6)), '...', G.koLog.length);
console.log('results', JSON.stringify(a.results().map(r => [r.name, r.points, r.wipeouts, r.self, r.lives])));
console.log('avg snapshot bytes', Math.round(bytes / snaps), 'at 30/s =', Math.round(bytes / snaps * 30 / 1024), 'KB/s per client');

// ---- credited takedown: cart 0 rams cart 1 over the cliff edge; the server must credit cart 0 ----
{
  const s = makeSim({ lives: 3 }); s.startMatch([0, 4], 5);
  const G = s.GAME; G.mode = 'play'; G.countT = 0;
  const [a, b] = G.carts;
  b.reset(33.5, 0, Math.PI / 2); a.reset(26, 0, Math.PI / 2);   // both facing +x (east, toward the cliff)
  let ko = null;
  for (let k = 0; k < 120 * 4 && !ko; k++) {
    s.setInput(0, { th: 1, st: 0, bo: 1 }); s.setInput(1, { th: 0, st: 0 });
    s.physicsStep(s.PHYS_DT);
    for (const e of s.drainEvents()) if (e.t === 'ko') ko = e;
  }
  console.log('ram test ko event', ko && JSON.stringify({ victim: ko.c, by: ko.by, kind: ko.kind, final: ko.final }));
  console.log('ram test scores: rammer', a.stats.points, 'takedowns', a.stats.wipeouts, '| victim lives', b.lives, 'points', b.stats.points);
  if (!ko || ko.by !== 0 || a.stats.points !== 1) { console.log('RAM TEST FAILED'); process.exitCode = 1; } else console.log('RAM TEST OK');
}
