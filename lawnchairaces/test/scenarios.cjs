// Test scenarios for test/run.cjs. Each receives {page, ev, shot, frames, args, q}.
module.exports = {
  async boot({ ev, shot, frames }) {
    await ev(() => LA.freeze(true));
    await frames(2);
    await shot('boot-title');
    console.log(JSON.stringify(await ev(() => LA.state()), null, 0).slice(0, 900));
  },
  async times({ ev, shot, frames, args }) {
    await ev(() => LA.freeze(true));
    if (args.fp) { await ev(() => { LA.start('ffa', 'normal'); LA.freeze(true); LA.step(4); LA.aimAt(1); }); }
    for (const t of ['golden', 'noon', 'morning', 'sunset']) {
      await ev((t) => LA.setTime(t), t);
      await frames(2);
      await shot('time-' + t);
    }
  },
  async fp({ ev, shot, frames, args }) {
    await ev(() => LA.start('duel', 'normal'));
    await ev(() => LA.freeze(true));
    await ev(() => LA.step(4));
    await ev(() => { LA.aimAt(1); });
    await frames(2);
    await shot('fp-aim');
    await ev(() => LA.look(LA.state().chairs ? 0.3 : 0, 1.2));
    await frames(2);
    await shot('fp-up');
    await ev(() => LA.look(0.2, -1.1));
    await frames(2);
    await shot('fp-down');
    await ev(() => { LA.aimAt(1); LA.ads(true); });
    await ev(() => LA.step(0.4));
    await frames(2);
    await shot('fp-scope');
    console.log(JSON.stringify(await ev(() => LA.state())).slice(0, 1200));
  },
  async top({ ev, shot, frames, args }) {
    await ev(() => LA.freeze(true));
    await ev(() => LA.view({ pos: [0, 2600, 300], look: [0, 0, -100], fov: 75 }));
    await frames(2);
    await shot('top');
    await ev(() => LA.view({ pos: [-600, 120, -500], look: [600, 60, 600], fov: 60 }));
    await frames(2);
    await shot('shore');
  },
  async combat({ ev, shot, frames }) {
    await ev(() => { LA.start('duel', 'normal'); LA.freeze(true); LA.step(4); });
    let hits = 0, shots = 0, popShot = false;
    for (let k = 0; k < 6; k++) {
      const r = await ev(() => { LA.pumpTo(10); const a = LA.autoAim(1); LA.fire(); return a; });
      shots++;
      for (let i = 0; i < 40; i++) {
        await ev(() => LA.step(1 / 30));
        const st = await ev(() => LA.state().chairs[0].stats.hits);
        if (st > hits) {
          hits = st;
          if (!popShot) { await ev(() => LA.step(0.08)); await ev(() => LA.ads(true)); await ev(() => LA.step(0.3)); await frames(2); await shot('combat-pop-scope'); await ev(() => LA.ads(false)); await ev(() => LA.step(0.3)); await frames(2); await shot('combat-pop'); popShot = true; }
          break;
        }
      }
      console.log('shot ' + k + ' dist ' + r.dist.toFixed(0) + ' tf ' + r.tf.toFixed(2) + ' hits ' + hits);
    }
    // pumping pose
    await ev(() => { LA.state(); });
    await ev(() => { G.player.rifle.state = 'stroke'; G.player.rifle.t = 0.2; G.player.rifle.lower = 1; G.player.rifle.lever = 0.8; });
    await frames(2);
    await shot('combat-pump');
    await ev(() => { G.player.rifle.state = 'idle'; G.player.rifle.lever = 0; G.player.rifle.lower = 0; });
    // opponent close-up while it pumps and aims
    await ev(() => LA.step(2));
    await ev(() => LA.closeView(1, 5, 0.8, 2.4));
    await frames(2);
    await shot('combat-opponent');
    await ev(() => LA.closeView(1, 14, 4, 2.4));
    await frames(2);
    await shot('combat-opponent-wide');
    // pour + jug leak + cut
    await ev(() => { LA.view(null); LA.holeJug(1, 2); INPUT.pour = true; LA.step(1.2); INPUT.pour = false; LA.cut(0); LA.step(0.5); });
    await ev(() => LA.closeView(0, 7, -1.5, 1.2));
    await frames(2);
    await shot('combat-pour');
    // splash the opponent
    await ev(() => { LA.view(null); LA.pop(1, 12); LA.pour(1, 30); });
    let st;
    for (let i = 0; i < 60; i++) { st = await ev(() => LA.step(2)); if (!st.chairs[1].alive) break; }
    console.log('opponent out: ' + st.chairs[1].out + ' at t=' + st.t + ' phase ' + st.phase + ' winner ' + st.winner);
    await ev(() => LA.step(0.6));
    await ev(() => LA.closeView(1, 16, 5, 0.5));
    await frames(2);
    await shot('combat-splash');
    await ev(() => LA.step(8));
    await ev(() => LA.closeView(1, 22, 6, 0.9));
    await frames(2);
    await shot('combat-rescue');
    await ev(() => { LA.view(null); LA.step(3); });
    await frames(2);
    await shot('combat-results');
    console.log(JSON.stringify(await ev(() => LA.state().feed)));
  },
  async pose({ ev, shot, frames, args }) {
    await ev(() => { LA.start('duel', 'normal'); LA.freeze(true); LA.step(4); LA.aimAt(1); });
    const poses = JSON.parse(args.poses || '[[0.5,-0.35,-0.5]]');
    let i = 0;
    for (const [y, p, r] of poses) {
      for (const lev of [0.1, 0.9]) {
        await ev(({ y, p, r, lev }) => { POSE.yaw = y; POSE.pitch = p; POSE.roll = r; const rf = G.player.rifle; rf.state = 'stroke'; rf.t = 0.2; rf.lower = 1; rf.lever = lev; rf.pumps = 3; }, { y, p, r, lev });
        await frames(1);
        await shot('pose-' + i + '-' + lev);
      }
      i++;
    }
  },
  async practice({ ev, shot, frames }) {
    await ev(() => { LA.start('practice', 'normal'); LA.freeze(true); LA.step(4); });
    let pts = 0;
    for (let k = 0; k < 8; k++) {
      const r = await ev(() => {
        const p = G.player; let best = null;
        for (const t of G.targets) { if (!t.alive) continue; const d = v3.dist(t.hub, seatPos(p)); if (!best || d < best.d) best = { t, d }; }
        if (!best) return null;
        LA.pumpTo(10); updateCamera(0);
        const origin = v3.add(CAM.pos, v3.mul(CAM.fwd, 0.7));
        const live = best.t.balloons.find((b) => b.alive);
        const sol = solveAim(origin, p.vel, live.p, [0, 0, 0], muzzleVel(10));
        INPUT.yaw = Math.atan2(sol.dir[0], sol.dir[2]); INPUT.pitch = Math.asin(sol.dir[1]);
        LA.fire(); LA.step(1.6);
        return { d: best.d, score: G.score };
      });
      if (!r) break;
      if (k === 1) { await frames(2); await shot('practice'); }
      pts = r.score;
    }
    console.log('practice score ' + pts + ' ' + JSON.stringify(await ev(() => LA.state().chairs[0].stats)));
    await ev(() => LA.step(181));
    await frames(1);
    await ev(() => LA.step(3));
    await frames(2);
    await shot('practice-end');
    console.log(JSON.stringify(await ev(() => ({ phase: LA.state().phase, res: document.getElementById('results').classList.contains('hidden') }))));
  },
  async audio({ ev }) {
    const r = await ev(async () => {
      LA.start('duel', 'normal'); LA.freeze(true); AUD.init();
      if (!AUD.ctx) return 'no ctx';
      await AUD.ctx.resume().catch(() => {});
      const p = [10, 120, 10];
      AUD.pop(p, 0.8); AUD.shot(200); AUD.shotFar(p, 150); AUD.pumpOpen(3); AUD.pumpClose(3); AUD.boltOpen(); AUD.boltClose(); AUD.dry();
      AUD.whiz(p, 2); AUD.plink(p, true); AUD.plink(p, false); AUD.snip(p); AUD.splash(p, 1); AUD.squeak(); AUD.creak(); AUD.tick(true); AUD.go(); AUD.loon();
      AUD.setListener([0, 100, 0], [0, 0, 1], [0, 1, 0]);
      AUD.update(0.1, { wind: 2, alt: 20, pour: true, motor: true, motorPos: [1, 0, 1] });
      LA.step(3);
      INPUT.pump = true; LA.step(2); INPUT.pump = false; INPUT.fireEdge = true; LA.step(0.1);
      return 'ok ' + AUD.ctx.state + ' sr ' + AUD.ctx.sampleRate;
    });
    console.log('audio: ' + r);
  },
  async touch({ ev, shot, frames }) {
    await ev(() => { LA.setting('touch', true); LA.start('ffa', 'normal'); LA.freeze(true); LA.step(4); LA.aimAt(1); });
    await frames(2);
    await shot('touch');
    await ev(() => LA.title());
    await frames(2);
    await shot('touch-title');
  },
  async guide({ ev, shot, frames }) {
    await ev(() => { LA.start('duel', 'normal'); LA.freeze(true); LA.step(4); LA.pumpTo(4); LA.aimAt(1); });
    for (let i = 0; i < 6; i++) await frames(1);
    await shot('guide-hip');
    await ev(() => { LA.ads(true); LA.step(0.4); });
    for (let i = 0; i < 6; i++) await frames(1);
    await shot('guide-scope');
    await ev(() => { LA.ads(false); LA.step(0.4); LA.look(INPUT.yaw + 2.6, -0.75); G.player.yaw = INPUT.yaw; });
    await frames(3);
    await shot('fp-high-down');
  },
  async defend({ ev, shot, frames }) {
    await ev(() => { LA.start('duel', 'hard'); LA.freeze(true); LA.step(4); });
    let st, shotTaken = false;
    for (let i = 0; i < 90; i++) {
      st = await ev(() => { LA.aimAt(1); return LA.step(2); });
      const me = st.chairs[0];
      if (!shotTaken && me.eq < 0 && me.alive) { await frames(2); await shot('defend-sinking'); shotTaken = true; await ev(() => { INPUT.pour = true; LA.step(1.5); }); await frames(2); await shot('defend-pouring'); await ev(() => { INPUT.pour = false; }); }
      if (!me.alive || st.phase === 'over') break;
    }
    console.log('t=' + st.t + ' me ' + JSON.stringify(st.chairs[0]) + ' phase ' + st.phase);
    console.log(st.feed.join(' / '));
    await ev(() => LA.step(3));
    await frames(2);
    await shot('defend-end');
  },
  async hero({ ev, shot, frames, args }) {
    await ev(() => { LA.start('ffa', 'normal'); LA.freeze(true); LA.step(14); });
    await ev(() => { LA.view({ mode: 'chase' }); LA.aimAt(2); INPUT.yaw += 0.35; INPUT.pitch = 0.12; });
    await frames(3);
    await shot('hero-chase');
    await ev(() => { LA.view({ mode: 'fp' }); LA.pumpTo(8); LA.aimAt(1); INPUT.pitch += 0.02; });
    await frames(3);
    await shot('hero-fp');
    await ev(() => LA.setTime('sunset'));
    await ev(() => LA.closeView(2, 9, -2.5, 2.0));
    await frames(3);
    await shot('hero-sunset');
  },
  async blower({ ev, shot, frames }) {
    await ev(() => { LA.start('duel', 'normal'); LA.freeze(true); LA.step(4); LA.aimAt(1); });
    const before = await ev(() => LA.state().chairs[0]);
    await ev(() => { LA.blow(true); LA.step(2.0); });
    const mid = await ev(() => LA.state().chairs[0]);
    await ev(() => { LA.view({ mode: 'chase' }); INPUT.yaw += 2.4; INPUT.pitch = 0.05; G.player.yaw = INPUT.yaw + 2.4; });
    await ev(() => { LA.blow(false); LA.step(0.05); LA.blow(true); LA.step(0.6); });
    await frames(2);
    await shot('blower-chase');
    await ev(() => LA.closeView(0, 2.6, 0.9, Math.atan2(-Math.cos(G.player.yaw), -Math.sin(G.player.yaw)) + 0.6));
    await frames(2);
    await shot('blower-close');
    await ev(() => { LA.view(null); LA.step(3); });
    const hot = await ev(() => LA.state().chairs[0]);
    await ev(() => { LA.blow(false); LA.step(4); });
    const cool = await ev(() => LA.state().chairs[0]);
    await ev(() => LA.step(3));
    const cool2 = await ev(() => LA.state().chairs[0]);
    const sp = (c) => Math.hypot(c.vh[0], c.vh[1]).toFixed(2);
    console.log('speed before ' + sp(before) + ' after 2s blowing ' + sp(mid) + ' heat ' + mid.blower.heat);
    console.log('after more blowing: ' + JSON.stringify(hot.blower) + ' cool 4s: ' + JSON.stringify(cool.blower) + ' cool 7s: ' + JSON.stringify(cool2.blower));
    await ev(() => { LA.view({ mode: 'fp' }); LA.aimAt(1); });
    await frames(2);
    await shot('blower-fp');
  },
  async chase({ ev, shot, frames }) {
    await ev(() => LA.start('ffa', 'normal'));
    await ev(() => LA.freeze(true));
    await ev(() => LA.step(4));
    await ev(() => { LA.view({ mode: 'chase' }); LA.look(2.2, 0.15); });
    await frames(2);
    await shot('chase');
  },
  async match({ ev, shot, frames, args }) {
    // AI vs AI to completion (sim only), report the outcome
    const mode = args.mode || 'duel', diff = args.diff || 'normal';
    const res = await ev(({ mode, diff, seed }) => {
      LA.freeze(true);
      LA.spectate(mode, diff, seed);
      const out = [];
      let t = 0;
      while (t < 900) {
        LA.step(5); t += 5;
        const s = LA.state();
        const d = s.chairs.length > 1 ? Math.hypot(s.chairs[0].pos[0] - s.chairs[1].pos[0], s.chairs[0].pos[1] - s.chairs[1].pos[1]).toFixed(0) : 0;
        if (t % 30 === 0) out.push(t + 's d01=' + d + ' ' + s.chairs.map((c) => c.name + ':' + (c.alive ? c.alt + 'm/' + c.balloons + 'b/' + c.water + 'kg r' + Math.hypot(c.pos[0], c.pos[1]).toFixed(0) : c.out)).join(' | '));
        if (s.phase === 'over') { out.push('OVER at ' + t + ' winner ' + s.winner); break; }
      }
      const s = LA.state();
      out.push(JSON.stringify(s.chairs.map((c) => ({ n: c.name, st: c.stats }))));
      out.push(s.feed.join(' / '));
      return out;
    }, { mode, diff, seed: +(args.seed || 1) });
    console.log(res.join('\n'));
    await frames(2);
    await shot('match-end');
  },
};
