// ---------- lessons (the manual) ----------
const NEVER = () => false;
function resetHumans() { HUM.length = 0; HUM.push(makeHuman(0), makeHuman(1)); }
function placeHuman(h, o) {
  const sp = o.spot ? SPOT[o.spot] : null;
  if (sp && o.kind === 'lie') { h.x = sp.x; h.z = sp.z; h.y = 0.68; h.h = 0; h.seat = o.spot; h.lying = true; }
  else if (sp && o.kind === 'seat') { h.x = sp.x; h.z = sp.z; h.y = 0; h.h = sp.h; h.seat = o.spot; }
  else if (sp) { h.x = sp.x; h.z = sp.z; h.h = sp.h || 0; } else { h.x = o.x; h.z = o.z; h.h = o.h || 0; }
  h.pose = o.pose || 'stand'; h.awake = o.awake !== false; h.sleep = h.awake ? 0 : 100; h.outfit = o.outfit || 'day'; h.carry = o.carry || null; humanPoseUpdate(h, 0, true);
}
function objDone(id) { const o = LESSON.obj.find(o => o.id === id); if (o && !o.done) { o.done = true; if (o.of) o.n = o.of; G.objFlash = 1.5; AU.objective(); if (LESSON.obj.every(o => o.done) && !G.canFinish) { G.canFinish = true; narr('MANUAL: Lesson complete. Press FINISH, or stay for extra credit.', null, 6); } } }
function objCount(id, n) { const o = LESSON.obj.find(o => o.id === id); if (!o || o.done) return; o.n = Math.min(o.of, n); G.objFlash = 0.8; if (o.n >= o.of) objDone(id); }
function extraDone(id) { const e = LESSON.extra.find(e => e.id === id); if (e && !e.done) { e.done = true; pop('EXTRA CREDIT!', CAT.x, CAT.y + 0.85, CAT.z, 'good'); AU.ding(); G.objFlash = 1; } }
const allDone = () => LESSON.obj.every(o => o.done);
function closedDoorNearCat(front) { for (const k of front ? ['bed', 'bath', 'front'] : ['bed', 'bath']) { const d = DOORS[k]; if (d.open < 0.3 && !d.propped && Math.abs(CAT.z - d.z) < 1.3 && CAT.x > d.x0 - 0.5 && CAT.x < d.x1 + 0.5) return d; } return null; }
function doorSide(h, d) { return roomOf(h.x, h.z) === d.id ? [d.inX, d.inZ] : [d.outX, d.outZ]; }
function planDoorOpen(h, d) {
  const [x, z] = doorSide(h, d);
  setPlan(h, 'door', [stepSay(line(h, 'doorGo')), stepGo(x, z), { k: 'faceTo', x: (d.x0 + d.x1) / 2, z: d.z }, stepPose('door', 0.35), stepDo(() => { d.tgt = 1; d.by = null; d.keepClosed = false; AU.door(); h.stats.doors++; LESSON.onEvent('doorOpened', { h, d }); }), stepSay(line(h, 'doorOpen')), stepWait(0.8, 'stand')], 2);
}
function genericDoorDemand(h, type, m) {
  if (type !== 'paw' && !type.startsWith('meow')) return null;
  const d = (m && m.door) || closedDoorNearCat(); if (!d || d.id === 'front') return null;
  if (!h.awake || h.pinned || h.pri >= 2 || HUM.some(o => o.planName === 'door')) return null;
  return { id: 'door:' + d.id, train: 'door', will: h.id ? 70 : 55, comply: hh => planDoorOpen(hh, d) };
}
function baseLesson(o) {
  return Object.assign({
    sleepy: false, lampsOn: [], tod() { return TOD.day; }, schedule(h) { setPlan(h, 'idle', [stepWait(2, 'stand')]); }, demandFor(h, t, m) { return genericDoorDemand(h, t, m); },
    onStim() { }, onEvent() { }, onWake(h) { humanSay(h, line(h, 'wake')); }, update() { }, context() { return null; }, status() { return ''; }, finishExtras() { },
    onDeadline() { finishLesson(allDone(), 'time'); }
  }, o);
}
const bedSpot = h => h.id ? 'bedD' : 'bedM';

const LESSONS = [
  // ===== 1 =====
  baseLesson({
    id: 'breakfast', title: 'BREAKFAST IS AT 5 AM', start: 300, end: 390, rate: 0.5, sleepy: true, unitedLine: 'yourTurn', train: 'feed',
    rule: 'Staff believe breakfast happens "when they wake up." This is backwards. Staff wake up when breakfast happens.',
    tips: ['Jump on the bed and wake ONE of them. Two awake staff each assume the other will get up.', 'The Stare is silent and costs no patience. Meowing is faster and wakes everybody.', 'The tall one sleeps like furniture but has a soft heart. The other one wakes easily. That is not the same as willingly.', 'Once the bowl is filled, EAT. An uneaten breakfast teaches them nothing.'],
    failText: 'The alarm rang at 6:30 and they fed you on THEIR schedule. This must never be spoken of.',
    winText: 'Breakfast was served before dawn by a person with their eyes closed. Textbook.',
    tod(c) { return todMix('night', 'dawn', clamp((c - 335) / 55, 0, 1) * 0.9); },
    setup() {
      placeHuman(HUM[0], { spot: 'bedM', kind: 'lie', pose: 'lie', awake: false, outfit: 'pj' }); placeHuman(HUM[1], { spot: 'bedD', kind: 'lie', pose: 'lie', awake: false, outfit: 'pj' });
      catReset(-4.0, -1.7, Math.PI); this.S = { first: null };
      this.obj = [{ id: 'fed', text: 'Get a staff member to fill your bowl' }, { id: 'ate', text: 'Eat breakfast' }];
      this.extra = [{ id: 'one', text: 'First breakfast with only one of them woken' }, { id: 'early', text: 'Bowl filled before 5:45' }, { id: 'second', text: 'Get the other one to feed you too' }];
      narr('MANUAL: Staff are asleep. Jump on the bed and choose one.', null, 6);
    },
    sleepNow(h) { h.awake = false; h.sleep = 60; h.demand = null; h.shuffle = false; G.lamps[h.id ? 'nsE' : 'nsW'] = false; setPlan(h, 'sleep', [stepLie(bedSpot(h), 'lie'), stepUntil(NEVER, 'lie')]); },
    settle(h, first) { return [stepLie(bedSpot(h), 'lieSit'), stepUntil((hh, t) => t > (first ? 7 : 5) && !hh.demand, 'lieSit'), stepSay(line(h, 'backToSleep')), stepDo(() => this.sleepNow(h))]; },
    schedule(h) { if (!h.awake) setPlan(h, 'sleep', [stepLie(bedSpot(h), 'lie'), stepUntil(NEVER, 'lie')]); else setPlan(h, 'settle', this.settle(h, false)); },
    onWake(h) {
      G.lamps[h.id ? 'nsE' : 'nsW'] = true; AU.click(); humanSay(h, line(h, 'wake')); setPlan(h, 'awakeBed', this.settle(h, true), 1);
      narr('MANUAL: The subject is awake but pretending otherwise. Keep at it until the RESOLVE bar is empty.', 'resolve');
      if (partner(h).awake) narr('MANUAL: Both are awake. Each now expects the other to get up. This will be slow.', 'both');
    },
    demandFor(h, type, m) {
      if (!h.awake || h.planName === 'feed' || h.planName === 'carry' || h.planName === 'door') return null;
      if (BOWL.food > 0) { sayCd(h, 'bowlFull', 6); return null; }
      const again = h.knowsFed;
      return { id: 'feed', will: again ? 170 : h.id ? 100 : 75, comply: hh => { hh.shuffle = true; planFeed(hh, again ? 'caveFed' : 'caveFeed'); hh.plan.push(stepLie(bedSpot(hh), 'lie'), stepDo(() => this.sleepNow(hh))); } };
    },
    retaliate(h) {
      if (h.id === 0) { humanSay(h, "I can't hear you. I'm a pillow."); h.pillow = 16; this.sleepNow(h); h.sleep = 100; narr('MANUAL: He has deployed the pillow. Give it a moment, or try the other one.', 'pillow'); return true; }
      DOORS.bed.keepClosed = true; planTimeout(h, SPOT.living); narr('MANUAL: You have been removed. PAW AT DOOR. Loudly.', 'ejected'); return true;
    },
    onEvent(n, d) {
      if (n === 'fed') { objDone('fed'); if (G.clock < 345) extraDone('early'); if (this.S.first && this.S.first !== d.h) extraDone('second'); if (!this.S.first) { this.S.first = d.h; if (partner(d.h).stats.woke === 0) extraDone('one'); } narr('MANUAL: The bowl is full. Go and eat before they change their mind.', 'goeat'); }
      if (n === 'ate') objDone('ate');
    },
    status() { return ''; }
  }),
  // ===== 2 =====
  baseLesson({
    id: 'second', title: 'SECOND BREAKFAST', start: 420, end: 510, rate: 0.5, train: 'feed',
    rule: 'Each staff member can be led to believe you have never eaten in your life. The one rule: they must not compare notes.',
    tips: ['Beg from one while the other is in another room. Meow at them. Stare. Be thin.', 'Empty the bowl before the next one sees it. A full bowl is evidence.', 'When they stand close together they talk, and what one knows the other learns.', 'A staff member who knows you have eaten can still be worked on. Charm first. Guilt is a lever.'],
    failText: 'One breakfast. ONE. Like a dog.', winText: 'Two breakfasts, two staff, zero suspicion until it was far too late.',
    tod(c) { return todMix('dawn', 'day', clamp((c - 420) / 50, 0, 1)); },
    setup() {
      placeHuman(HUM[0], { spot: 'coffee', pose: 'cook', outfit: 'day' }); placeHuman(HUM[1], { spot: 'shower', kind: 'seat', pose: 'shower', outfit: 'towel' });
      catReset(0.4, -0.9, Math.PI); DOORS.bath.keepClosed = true;
      this.S = { ri: [0, 0], talkCd: 4, compared: false, played: false };
      this.obj = [{ id: 'm1', text: 'Eat breakfast number one' }, { id: 'm2', text: 'Eat breakfast number two' }];
      this.extra = [{ id: 'm3', text: 'A third breakfast' }, { id: 'quiet', text: 'They never compare notes in time' }, { id: 'calm', text: 'Nobody loses their patience' }];
      this.R = [[
        h => ['routine', [stepSpot('coffee'), stepPose('cook', 9)]],
        h => ['routine', [stepDo(() => { h.carry = 'mug'; }), stepSeat('chair', 'type'), stepDo(() => { h.carry = null; }), stepWait(42, 'type')]],
        h => ['routine', [stepSpot('sink'), stepPose('reach', 7)]],
        h => ['routine', [stepSeat('sofaM', 'phone'), stepDo(() => { h.carry = 'phone'; }), stepWait(38, 'phone'), stepDo(() => { h.carry = null; })]]
      ], [
        h => ['shower', [stepSeat('shower', 'shower'), stepWait(22, 'shower')]],
        h => ['routine', [stepSpot('vanity'), stepPose('reach', 5)]],
        h => ['routine', [stepGo(-2.65, -2.3, { face: Math.PI / 2 }), stepPose('reachHi', 6), stepDo(() => { h.outfit = 'day'; }), stepPose('reach', 2)]],
        h => ['routine', [stepSpot('coffee'), stepPose('cook', 11)]],
        h => ['routine', [stepSeat('sofaD', 'phone'), stepDo(() => { h.carry = 'phone'; }), stepWait(36, 'phone'), stepDo(() => { h.carry = null; })]],
        h => ['routine', [stepSpot('sink'), stepPose('reach', 7)]]
      ]];
      this.loopAt = [1, 3];
      narr('MANUAL: The tall one is making coffee. The other is in the shower. Begin with the tall one.', null, 6);
    },
    schedule(h) { const R = this.R[h.id], i = this.S.ri[h.id], e = R[i](h); if (h.id === 1 && i > 2) h.outfit = 'day'; this.S.ri[h.id] = i + 1 >= R.length ? this.loopAt[h.id] : i + 1; setPlan(h, e[0], e[1]); },
    demandFor(h, type, m) {
      const dg = genericDoorDemand(h, type, m); if (dg) return dg;
      if (!h.awake || ['feed', 'talk', 'shower', 'carry', 'spray', 'door', 'fetch'].includes(h.planName)) return null;
      if (BOWL.food > 0) { sayCd(h, 'bowlFull', 6); return null; }
      if (h.knowsFed) { sayCd(h, 'refuseFed', 7); narr('MANUAL: This one knows. Charm them until the guilt sets in, then ask again.', 'knows'); return { id: 'feed2', will: 210, comply: hh => planFeed(hh, 'caveFed') }; }
      return { id: 'feed', will: h.id ? 125 : 95, comply: hh => planFeed(hh, 'caveFeedDay') };
    },
    update(dt) {
      const S = this.S, a = HUM[0], b = HUM[1];
      for (const h of HUM) if (BOWL.food > 0 && !h.knowsFed && h.awake && h.planName !== 'feed' && d2(h.x, h.z, BOWL.x, BOWL.z) < 3.0 && losClear(h.x, h.z, BOWL.x, BOWL.z)) { h.knowsFed = true; humanSay(h, 'Oh. Somebody already fed you.'); narr('MANUAL: They saw the full bowl. Evidence. Eat faster next time.', 'evidence'); }
      S.talkCd -= dt;
      const free = h => h.awake && !h.hidden && h.pri < 2 && !['talk', 'shower', 'feed'].includes(h.planName);
      if (S.talkCd <= 0 && free(a) && free(b) && d2(a.x, a.z, b.x, b.z) < 2.3 && losClear(a.x, a.z, b.x, b.z)) {
        if (a.knowsFed !== b.knowsFed) { const ask = a.knowsFed ? b : a, kn = partner(ask); planTalk(ask, kn, 'notes1', 'notes2', 'notes3', () => { ask.knowsFed = true; }); S.compared = true; S.talkCd = 14; narr('MANUAL: They compared notes. Now they both know.', 'notes'); }
        else if (a.fedCount > 0 && b.fedCount > 0 && !S.played) { S.played = true; S.talkCd = 14; planTalk(a, b, 'played', 'played', null, () => { a.patience -= 12; b.patience -= 12; }); }
      }
    },
    onEvent(n) { if (n === 'ate') { const m = CAT.meals; if (m >= 1) objDone('m1'); if (m >= 2) objDone('m2'); if (m >= 3) extraDone('m3'); } },
    finishExtras() { if (!this.S.compared && CAT.meals >= 2) extraDone('quiet'); if (G.stats.incidents === 0) extraDone('calm'); },
    status() { return 'BREAKFASTS ' + CAT.meals; }
  }),
  // ===== 3 =====
  baseLesson({
    id: 'laptop', title: 'THE LAPTOP IS A BED', start: 600, end: 690, rate: 0.45, train: 'laptop',
    rule: 'Anything staff stare at for more than ten minutes is a bed. The warmest bed is the one they are typing on.',
    tips: ['Jump onto the desk and SIT ON LAPTOP. You will be lifted off. Return. Persistence is the entire technique.', 'Each removal weakens his resolve. A little charm between attempts keeps his patience from running out.', 'Staff with a cat on the lap cannot stand up. This is called being pinned.', 'For extra credit, attend his meeting.'],
    failText: 'The meeting ended and the laptop was put away. It was never a bed.', winText: 'The laptop is a bed. It was always a bed. He simply needed to be shown.',
    setup() {
      placeHuman(HUM[0], { spot: 'chair', kind: 'seat', pose: 'type' }); placeHuman(HUM[1], { spot: 'sofaD', kind: 'seat', pose: 'read', carry: 'book' });
      catReset(1.0, 2.6, Math.PI / 2); G.laptop = 'call'; G.laptopOpen = true; DOORS.bath.open = DOORS.bath.tgt = 1;
      this.S = { sitN: 0, removed: 0, surrender: false, lapOk: [false, false], lapT: 0, callCd: 6, meeting: false, email: false, carried: false };
      this.obj = [{ id: 'laptop', text: 'Make the laptop a bed (wear down Marcus)' }, { id: 'lap', text: 'Hold a lap for 8 seconds', n: 0, of: 8 }];
      this.extra = [{ id: 'meeting', text: 'Attend the meeting' }, { id: 'email', text: 'Send an email' }, { id: 'noCarry', text: 'Never get carried out of the room' }];
      narr('MANUAL: He is at the desk. Jump up and sit on the warm rectangle.', null, 6);
    },
    schedule(h) {
      if (h.id === 0) { const p = this.S.surrender ? 'phone' : 'type'; setPlan(h, 'work', [stepSeat('chair', p), stepDo(() => { h.carry = this.S.surrender ? 'phone' : null; }), stepUntil(NEVER, p)]); }
      else setPlan(h, 'read', [stepSeat('sofaD', 'read'), stepDo(() => { h.carry = 'book'; }), stepUntil(NEVER, 'read')]);
    },
    context() {
      const c = CAT, S = this.S; if (!(c.y > 0.7 && c.x > 5.1 && d2(c.x, c.z, 5.5, 1.3) < 0.8) || (c.sit && c.sit.kind === 'laptop')) return null;
      return { mis: { label: 'SIT ON LAPTOP', fn: () => this.sitLaptop() }, charm: !S.meeting && !S.surrender ? { label: 'JOIN THE MEETING', fn: () => this.meeting() } : null };
    },
    sitLaptop() {
      const S = this.S, M = HUM[0]; catSit('laptop', M, 5.5, 1.3, 0.77, -Math.PI / 2); S.sitN++; AU.keys();
      if (!S.email && !S.surrender) { S.email = true; extraDone('email'); toast('EMAIL SENT', "To: Entire Company. Subject: 'jjjjjjjkkkk;;;;lp'"); humanSay(M, line(M, 'emailOops')); }
      if (S.surrender) { objDone('laptop'); return; }
      applyStim(M, 'sitOn', 1);
      if (!S.surrender && M.pri < 2 && M.seat === 'chair') setPlan(M, 'remove', [stepWait(1.5 + rr(0, 0.8), 'typeAround'), stepSay(line(M, 'laptopOff')), stepPose('carry', 0.45),
        stepDo(() => { if (CAT.sit && CAT.sit.kind === 'laptop') { CAT.sit = null; CAT.mode = 'held'; CAT.heldBy = M; M.carry = 'cat'; S.removed++; AU.mrow(); } else M.plan.length = 0; }), stepPose('carry', 0.6),
        stepDo(() => { if (CAT.heldBy === M) { CAT.mode = 'free'; CAT.heldBy = null; M.carry = null; CAT.x = 4.3; CAT.z = 2.2; CAT.y = 0; CAT.h = -1; narr('MANUAL: Removed. This is normal. Go back up.', 'removed'); } })], 1);
    },
    meeting() { const S = this.S, M = HUM[0]; S.meeting = true; CAT.h = -Math.PI / 2; catAct('stretch', 1.3, 0.4, () => { extraDone('meeting'); humanSay(M, line(M, 'meeting')); toast('MEETING CHAT', '"omg who is THAT" - "cat tax paid" - "promote him"'); applyStim(M, 'sitOn', 0.5); }); },
    surrender(M) {
      const S = this.S; S.surrender = true; G.laptopOpen = false; humanSay(M, line(M, 'laptopCave'));
      setPlan(M, 'work', [stepPose('facepalm', 1.3), stepDo(() => { M.carry = 'phone'; }), stepUntil(NEVER, 'phone')]);
      if (CAT.sit && CAT.sit.kind === 'laptop') objDone('laptop'); else narr('MANUAL: He has closed it. It is still warm. Go and sit on it.', null, 5);
    },
    demandFor(h, type, m) {
      const dg = genericDoorDemand(h, type, m); if (dg) return dg; const S = this.S;
      if (!h.awake || h.pri >= 2) return null;
      if (h.id === 0 && h.seat === 'chair' && !S.surrender) { if (type === 'sitOn' || d2(CAT.x, CAT.z, h.x, h.z) < 2.6) return { id: 'laptop', will: 230, comply: hh => this.surrender(hh) }; return null; }
      if (h.seat && !S.lapOk[h.id] && d2(CAT.x, CAT.z, h.x, h.z) < 2.8) return { id: 'lap', will: 85, comply: hh => { S.lapOk[hh.id] = true; humanSay(hh, line(hh, 'lapYes')); narr('MANUAL: The lap is open. CLAIM LAP.', null, 4); } };
      return null;
    },
    lapAllowed(h) { const S = this.S; if (S.lapOk[h.id]) return true; applyStim(h, 'sitOn', 0.7, { annoy: 2 }); if (!S.lapOk[h.id]) { sayCd(h, 'lapNo', 2.5); pop('NOT YET', h.x, 1.4, h.z); narr('MANUAL: A refused lap is a negotiation. Headbutt. Slow blink. Ask again.', 'lapno'); } return S.lapOk[h.id]; },
    update(dt) {
      const S = this.S, M = HUM[0], D = HUM[1];
      if (CAT.sit && CAT.sit.kind === 'laptop') { if (S.surrender) objDone('laptop'); else applyStim(M, 'stare', dt, { press: 4.5, wake: 0 }); }
      if (CAT.sit && CAT.sit.kind === 'lap') { S.lapT += dt; objCount('lap', Math.floor(S.lapT)); }
      S.callCd -= dt;
      if (M.patience < 45 && S.callCd <= 0 && !S.surrender && M.seat === 'chair') {
        S.callCd = 20; humanSay(M, 'Dana! Come get your cat!');
        later(1.3, () => {
          if (D.pinned) humanSay(D, "Can't. I'm pinned.");
          else if (D.guilt >= 50) { humanSay(D, 'He just wants to be near you!'); if (M.demand) M.demand.will -= 20; pop('DEFENDED!', D.x, 1.8, D.z, 'good'); }
          else { S.carried = true; DOORS.bed.keepClosed = true; planTimeout(D, SPOT.timeout); narr('MANUAL: The other one was summoned. Next time, charm her first. Or pin her.', 'summoned'); }
        });
      }
    },
    finishExtras() { if (!this.S.carried) extraDone('noCarry'); },
    status() { return this.S.surrender ? 'LAPTOP: SURRENDERED' : 'REMOVALS ' + this.S.removed; }
  }),
  // ===== 4 =====
  baseLesson({
    id: 'doors', title: 'DOORS ARE A SUGGESTION', start: 840, end: 930, rate: 0.45, train: 'door',
    rule: 'A closed door is an insult. An open door is an option. You do not wish to go through. You wish it to be possible.',
    tips: ['Stand by a closed door and PAW AT DOOR, or meow. Staff will come.', 'When it opens, do not go through. Sit. Look at it. This teaches patience. Theirs.', 'Every open-and-decline is one rep. Three reps on a door and they stop closing it.', 'The bathroom counts for extra credit when it is occupied.'],
    failText: 'The doors stayed closed. Somewhere, a dog laughed.', winText: 'They now open doors on request and expect nothing in return. This is the foundation of civilization.',
    setup() {
      placeHuman(HUM[0], { spot: 'sofaM', kind: 'seat', pose: 'tv' }); placeHuman(HUM[1], { spot: 'shower', kind: 'seat', pose: 'shower', outfit: 'towel' });
      catReset(-0.6, 0.9, Math.PI); G.tvOn = true;
      for (const k of ['bed', 'bath']) { DOORS[k].open = DOORS[k].tgt = 0; DOORS[k].keepClosed = true; }
      this.S = { reps: [0, 0], doorReps: { bed: 0, bath: 0, front: 0 }, total: 0, bathT: 75, side: 1, crossed: false };
      this.obj = [{ id: 'reps', text: 'Door reps (opened, then declined)', n: 0, of: 5 }, { id: 'both', text: 'At least one rep from each of them' }];
      this.extra = [{ id: 'bath', text: 'Get the bathroom opened while occupied' }, { id: 'prop', text: 'Get a door left open for good' }, { id: 'front', text: 'Decline the front door' }];
      narr('MANUAL: Every door is closed. Choose one and complain.', null, 6);
    },
    schedule(h) {
      if (h.id === 0) setPlan(h, 'tv', [stepSeat('sofaM', 'tv'), stepUntil(NEVER, 'tv')]);
      else if (this.S.bathT > 0) setPlan(h, 'shower', [stepSeat('shower', 'shower'), stepUntil(() => this.S.bathT <= 0, 'shower')]);
      else setPlan(h, 'read', [stepDo(() => { h.outfit = 'day'; }), stepSeat('sofaD', 'read'), stepDo(() => { h.carry = 'book'; }), stepUntil(NEVER, 'read')]);
    },
    update(dt) { this.S.bathT -= dt; },
    demandFor(h, type, m) {
      if (type !== 'paw' && !type.startsWith('meow')) return null; const S = this.S;
      const d = (m && m.door) || closedDoorNearCat(true); if (!d || HUM.some(o => o.planName === 'door')) return null;
      if (!h.awake) return null; if (h.pinned) { sayCd(h, 'pinned', 8); return null; }
      const inBath = h.planName === 'shower';
      if (d.id === 'bath' && inBath) { sayCd(h, 'bathYell', 5); return { id: 'doorB', will: 50, comply: hh => this.planDoor(hh, d, true) }; }
      if (inBath || h.pri >= 2) return null;
      if (d.id === 'bath' && partner(h).planName === 'shower') { sayCd(h, 'bathOther', 7); return null; }
      const o = partner(h); if (S.last === h && o.awake && !o.pinned && o.planName !== 'shower' && o.pri < 2) { if (sayCd(h, 'yourDoor', 7)) narr('MANUAL: Staff take turns at door duty. Keep complaining and the other one will come.', 'turns'); return null; }
      return { id: 'door:' + d.id, train: 'door', will: (h.id ? 78 : 60) * Math.pow(0.85, S.reps[h.id]), comply: hh => this.planDoor(hh, d, false) };
    },
    planDoor(h, d, bath) {
      const S = this.S, [x, z] = d.id === 'front' ? [d.inX, d.inZ] : doorSide(h, d);
      setPlan(h, 'door', [stepSay(line(h, 'doorGo')), stepGo(x, z), { k: 'faceTo', x: (d.x0 + d.x1) / 2, z: d.z }, stepPose('door', 0.35),
        stepDo(() => { d.tgt = 1; d.hold = true; d.by = h; AU.door(); S.side = Math.sign(CAT.z - d.z) || 1; S.crossed = false; humanSay(h, line(h, 'doorOpen')); narr('MANUAL: It is open. Do NOT go through. Sit there and consider it.', 'decline'); }),
        stepUntil((hh, t) => { if (d.id !== 'front' && Math.sign(CAT.z - d.z) !== S.side) S.crossed = true; hh.lookCat = 1; return S.crossed || t > 4.2; }, bath ? 'arms' : 'stand'),
        stepDo(() => { if (!S.crossed) this.rep(h, d, bath); else { humanSay(h, 'Finally.'); narr('MANUAL: You went through. That is what THEY wanted. No rep.', 'through'); } }),
        stepWait(1.7, 'hips'),
        stepDo(() => { d.hold = false; d.by = null; if (S.doorReps[d.id] >= 3 && d.id !== 'front') { d.propped = true; humanSay(h, line(h, 'doorProp')); extraDone('prop'); pop('LEFT OPEN FOR GOOD', (d.x0 + d.x1) / 2, 1.6, d.z, 'good'); } else { d.tgt = 0; if (!S.crossed) sayCd(h, 'doorClose', 1); } })], 2);
    },
    rep(h, d, bath) {
      const S = this.S; S.last = h; S.reps[h.id]++; S.total++; S.doorReps[d.id]++; h.stats.doors++; humanSay(h, line(h, 'inOrOut')); applyStim(h, 'tap', 1, { annoy: 6, press: 0, wake: 0 });
      pop('DOOR REP!', CAT.x, CAT.y + 0.8, CAT.z, 'good'); AU.ding(); objCount('reps', S.total); if (S.reps[0] > 0 && S.reps[1] > 0) objDone('both'); if (bath) extraDone('bath'); if (d.id === 'front') extraDone('front');
    },
    status() { return 'REPS  Marcus ' + this.S.reps[0] + '  Dana ' + this.S.reps[1]; }
  }),
  // ===== 5 =====
  baseLesson({
    id: 'fetch', title: 'TEACH THEM TO FETCH', start: 1080, end: 1170, rate: 0.45, train: 'fetch', putAway: true, lampsOn: ['pend', 'floor', 'desk', 'hall'],
    rule: 'Staff adore fetch. Push an object off a high place. A staff member retrieves it and puts it back. Repeat until they are tired.',
    tips: ['Sturdy objects make good fetch toys. Fragile ones end the game early, and loudly.', 'If they are watching, push slowly. Eye contact doubles the lesson.', 'Both of them need the exercise. Three fetches each.', 'Mind their patience. Charm between throws. You are a professional.'],
    failText: 'They are still not fetching reliably. Some staff simply cannot be taught. Try again tomorrow.', winText: 'Both staff now retrieve on command. One of them said "good throw." We are so proud.',
    tod(c) { return todMix('dusk', 'eve', clamp((c - 1080) / 40, 0, 1)); },
    setup() {
      placeHuman(HUM[0], { spot: 'stove', pose: 'cook', carry: 'pan' }); placeHuman(HUM[1], { spot: 'sofaD', kind: 'seat', pose: 'tv' });
      catReset(0.3, 1.2, Math.PI); G.tvOn = true; DOORS.bath.open = DOORS.bath.tgt = 1;
      this.S = { f: [0, 0], broke: 0, total: 0 };
      this.obj = [{ id: 'f0', text: 'Marcus fetches', n: 0, of: 3 }, { id: 'f1', text: 'Dana fetches', n: 0, of: 3 }];
      this.extra = [{ id: 'eye', text: 'Knock something over with full eye contact' }, { id: 'clean', text: 'Nothing gets broken' }, { id: 'ten', text: 'Ten fetches in total' }];
      narr('MANUAL: Find something on a high place. Introduce it to the floor.', null, 6);
    },
    schedule(h) { if (h.id === 0) setPlan(h, 'cook', [stepSpot('stove'), stepDo(() => { h.carry = 'pan'; }), stepUntil(NEVER, 'cook')]); else setPlan(h, 'tv', [stepSeat('sofaD', 'tv'), stepUntil(NEVER, 'tv')]); },
    onEvent(n, d) {
      const S = this.S;
      if (n === 'fetch') { S.f[d.h.id]++; S.total++; objCount('f' + d.h.id, S.f[d.h.id]); if (S.total >= 10) extraDone('ten'); if (S.total === 1) narr('MANUAL: Good. They fetched. Reward them with a slow blink so they know they did well.', null, 5); }
      if (n === 'knock') { if (d.broken) S.broke++; if (d.eye) extraDone('eye'); }
    },
    finishExtras() { if (this.S.broke === 0) extraDone('clean'); },
    status() { return 'FETCHES ' + this.S.total; }
  }),
  // ===== 6 =====
  baseLesson({
    id: 'bed', title: 'THE BED IS YOURS', start: 1350, end: 1425, rate: 0.4, sleepy: true, train: 'bed',
    rule: 'The bed has three zones: the middle, which is yours, and two edges, which are where staff are stored.',
    tips: ['Jump up, get between them, and STRETCH. Staff slide outward. They will grumble. Grumbling is consent.', 'Staff drift back toward the middle the moment you leave it. LOAF there to hold the ground.', 'Sleeping staff move less per stretch, but they do not complain.', 'Own 70% of the bed, then loaf in the middle until both are asleep.'],
    failText: 'You slept at the foot of the bed. Like a guest.', winText: 'Seventy percent of the bed, zero percent of the rent.',
    tod(c) { return this.S && !this.S.lights ? TOD.night : TOD.eve; },
    setup() {
      placeHuman(HUM[0], { spot: 'bedM', kind: 'lie', pose: 'lieRead', outfit: 'pj', carry: 'phone' }); placeHuman(HUM[1], { spot: 'bedD', kind: 'lie', pose: 'lieRead', outfit: 'pj', carry: 'book' });
      catReset(-4.0, -1.7, Math.PI); G.lamps.nsW = G.lamps.nsE = true;
      this.S = { lights: true, hold: 0, share: 25, wokeAfter: false, left: [false, false], face: false };
      this.obj = [{ id: 'share', text: 'Own 70% of the bed' }, { id: 'settle', text: 'Loaf in the middle while they both sleep' }];
      this.extra = [{ id: 'couch', text: 'Send one of them to the couch' }, { id: 'nowake', text: 'Never wake a sleeper' }, { id: 'face', text: 'Loaf on a pillow that is in use' }];
      narr('MANUAL: They are in YOUR bed. Lights out at 11:00. Get between them.', null, 6);
    },
    sleepNow(h) { h.awake = false; h.sleep = 100; h.carry = null; h.demand = null; setPlan(h, 'sleep', this.S.left[h.id] ? [stepSeat(h.id ? 'sofaD' : 'sofaM', 'sit'), stepUntil(NEVER, 'sit')] : [stepLie(bedSpot(h), 'lie'), stepUntil(NEVER, 'lie')]); },
    schedule(h) {
      const S = this.S;
      if (S.left[h.id]) { setPlan(h, 'couch', [stepSeat(h.id ? 'sofaD' : 'sofaM', 'sit'), stepDo(() => this.sleepNow(h))]); return; }
      if (!h.awake) { this.sleepNow(h); return; }
      if (S.lights) setPlan(h, 'bedread', [stepLie(bedSpot(h), 'lieRead'), stepDo(() => { h.carry = h.id ? 'book' : 'phone'; }), stepUntil(() => !S.lights, 'lieRead'), stepDo(() => this.sleepNow(h))]);
      else setPlan(h, 'resettle', [stepLie(bedSpot(h), 'lieAwake'), stepUntil((hh, t) => t > 7 && hh.calmT > 5, 'lieAwake'), stepDo(() => this.sleepNow(h))]);
    },
    onWake(h) { if (!this.S.lights) this.S.wokeAfter = true; humanSay(h, line(h, 'wake')); setPlan(h, 'resettle', [stepUntil((hh, t) => t > 7 && hh.calmT > 5, this.S.left[h.id] ? 'sit' : 'lieAwake'), stepDo(() => this.sleepNow(h))]); },
    context() {
      const c = CAT; if (!(c.y > 0.45 && inBox(FBY.bed, c.x, c.z))) return null;
      if (!HUM.some(h => h.lying && Math.abs(c.x - h.x) < 0.9 && c.z < h.z + 0.25)) return null;
      return { mis: { label: 'STRETCH', fn: () => this.stretch() }, charm: null };
    },
    stretch() {
      const c = CAT, between = HUM[0].lying && HUM[1].lying && c.x > HUM[0].x && c.x < HUM[1].x;
      catAct('stretch', 0.95, 0.4, () => {
        AU.stretch();
        for (const h of HUM) {
          if (!h.lying || Math.abs(c.x - h.x) > 0.9 || c.z > h.z + 0.25) continue;
          const side = h.id ? 1 : -1; if ((c.x - h.x) * side > 0.05) continue;
          h.bedOff = Math.min(0.33, h.bedOff + (between ? 0.045 : 0.06) * (h.awake ? 1 : 0.6)); pop('scoot', h.x, 1.0, c.z, 'cat');
          if (h.awake) { applyStim(h, 'tap', 1, { annoy: 5, press: 0, wake: 0 }); sayCd(h, 'bedPush', 5); } else applyStim(h, 'stepOn', 0.3);
        }
      });
    },
    retaliate(h) {
      const S = this.S;
      if (h.id === 0) { S.left[0] = true; humanSay(h, line(h, 'bedLeave')); h.carry = null; setPlan(h, 'couch', [stepSeat('sofaM', 'sit'), stepDo(() => { extraDone('couch'); this.sleepNow(h); })], 4); return true; }
      DOORS.bed.keepClosed = true; planTimeout(h, SPOT.living); narr('MANUAL: Ejected. PAW AT DOOR until someone lets you back in.', 'ejected'); return true;
    },
    update(dt) {
      const S = this.S, M = HUM[0], D = HUM[1], c = CAT;
      if (S.lights && (G.clock >= 1380 || S.early > 3)) { S.lights = false; G.lamps.nsW = G.lamps.nsE = false; AU.click(); if (G.clock < 1380) humanSay(M.awake && !S.left[0] ? M : D, 'Okay. He wins. Lights out.'); narr('Lights out. Hold the middle until they are both asleep.', null, 4); }
      const mx = S.left[0] ? -4.95 : M.x, dx = S.left[1] ? -3.05 : D.x;
      const inGap = c.mode === 'sit' && (c.sit.kind === 'bed' || c.sit.kind === 'loaf') && c.y > 0.45 && c.x > mx && c.x < dx && c.z < -2.45 && c.z > -4.3;
      for (const h of HUM) if (h.lying && h.seat === bedSpot(h) && !(h.cur && h.cur.k === 'slide')) { if (!inGap) h.bedOff = Math.max(0, h.bedOff - (h.awake ? 0.012 : 0.006) * dt); h.x = SPOT[bedSpot(h)].x + (h.id ? 1 : -1) * h.bedOff; }
      const k = clamp((dx - mx - 0.9) / 0.66, 0, 1.2); S.share = Math.min(95, Math.round(25 + 60 * k));
      if (S.share >= 70) objDone('share');
      S.early = S.lights && inGap && S.share >= 70 ? (S.early || 0) + dt : 0;
      if (inGap && S.share >= 70 && !M.awake && !D.awake) { S.hold += dt; if (S.hold > 4) objDone('settle'); } else S.hold = 0;
      if (!S.face && c.mode === 'sit' && c.y > 0.45) for (const h of HUM) if (h.lying) { const hd = humanHead(h); if (d2(hd[0], hd[2], c.x, c.z) < 0.32) { S.face = true; extraDone('face'); if (h.awake) { humanSay(h, 'Mmph. Cat. On my face.'); applyStim(h, 'tap', 1, { annoy: 8, press: 0, wake: 0 }); } } }
    },
    finishExtras() { if (!this.S.wokeAfter) extraDone('nowake'); },
    status() { return 'YOUR SHARE OF THE BED  ' + this.S.share + '%'; }
  })
];
