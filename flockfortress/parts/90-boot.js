// ================= boot + test hooks =================
layout(); resetWorld(); setSound(SET.sound); setDiff(SET.diff); showRejoin();
if (Q.get('room')) { drawer('friend'); $('roomIn').value = Q.get('room').toUpperCase(); mpConnect(Q.get('room').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 5)); }
requestAnimationFrame(loop);
window.FF = {
  start(o = {}) { newMatch(Object.assign({ mode: 'cpu', seed: 1234 }, o)); },
  state() { return G && { phase: G.phase, round: G.round, wins: G.wins.slice(), turn: G.turn, dmg: G.dmg.slice(), ammo: JSON.parse(JSON.stringify(G.ammo)), shot: !!G.shot, wind: G.wind, bodies: BODIES.length, pieces: [0, 1].map(s => BODIES.filter(b => b.side === s && b.piece).length), bells: [0, 1].map(s => { const b = bellOf(s); return b ? [Math.round(b.x), Math.round(b.y)] : null; }), money: [money(0), money(1)] }; },
  advance(sec, dt = 1 / 60) { for (let s = 0; s < sec; s += dt) tick(dt); camStep(1); draw(0); return FF.state(); },
  place(side, t, x, y, rot = 0) { return !!placePiece(side, t, x, y, rot, true); },
  ready(side) { readyUp(side); },
  cpuBuild(side) { cpuBuild(side); },
  fire(side, type, vx, vy) { return fire(side, type, vx, vy); },
  cpuShoot() { cpuShoot(); },
  hideCard() { hideCard(); }
};
