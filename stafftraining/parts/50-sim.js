// ---------- simulation: game state, props, stimuli, staff reactions, cat actions ----------
const G = { later: [], phase: 'menu', time: 0, li: 0, clock: 300, tod: null, lamps: {}, flags: {}, narr: [], pops: [], result: null, stats: {}, meowN: 0, meowT: -9, groomT: 0, groomAmt: 0, zoomAcc: 0, slow: 0, tvOn: false, laptop: 'call', laptopOpen: true, boxAt: { x: -0.3, z: 1.3 }, seen: {}, objFlash: 0 };
let LESSON = null;
const TOD = {
  night: { dark: true, win: 'night', winGlow: 0.55, key: [0.25, 0.33, 0.66], sky: [0.16, 0.2, 0.37], gnd: [0.08, 0.09, 0.18], fog: [0.04, 0.05, 0.12, 0.014], dir: [-0.4, 0.85, 0.15] },
  dawn: { dark: false, win: 'dawn', winGlow: 0.8, key: [0.95, 0.72, 0.55], sky: [0.48, 0.46, 0.56], gnd: [0.28, 0.24, 0.24], fog: [0.6, 0.5, 0.5, 0.006], dir: [0.5, 0.75, 0.2] },
  day: { dark: false, win: 'day', winGlow: 0.95, key: [1.0, 0.96, 0.88], sky: [0.66, 0.68, 0.74], gnd: [0.42, 0.38, 0.34], fog: [0.85, 0.85, 0.88, 0.004], dir: [0.22, 0.95, 0.2] },
  dusk: { dark: false, win: 'dusk', winGlow: 0.7, key: [0.85, 0.55, 0.40], sky: [0.42, 0.36, 0.44], gnd: [0.26, 0.2, 0.2], fog: [0.5, 0.36, 0.36, 0.007], dir: [-0.5, 0.7, 0.3] },
  eve: { dark: true, win: 'night', winGlow: 0.5, key: [0.34, 0.33, 0.5], sky: [0.3, 0.27, 0.3], gnd: [0.17, 0.14, 0.13], fog: [0.1, 0.08, 0.1, 0.008], dir: [-0.3, 0.9, 0.2] }
};
function todMix(a, b, k) { const A = TOD[a], B = TOD[b], m = (x, y) => x.map((v, i) => lerp(v, y[i], k)); return { dark: k < 0.5 ? A.dark : B.dark, win: k < 0.5 ? A.win : B.win, winGlow: lerp(A.winGlow, B.winGlow, k), key: m(A.key, B.key), sky: m(A.sky, B.sky), gnd: m(A.gnd, B.gnd), fog: m(A.fog, B.fog), dir: m(A.dir, B.dir) }; }
const LAMPS = { pend: [[-0.1, 1.75, -2.4, 4.6, 1.0, 0.78, 0.45], [0.7, 1.75, -2.4, 4.6, 1.0, 0.78, 0.45]], floor: [[-5.3, 1.5, 3.5, 5.2, 1.0, 0.75, 0.42]], nsW: [[-5.4, 0.95, -4.2, 3.4, 0.9, 0.6, 0.3]], nsE: [[-2.6, 0.95, -4.2, 3.4, 0.9, 0.6, 0.3]], bath: [[4.6, 2.2, -3.1, 4.2, 0.8, 0.85, 0.8]], tv: [[-4.4, 0.95, 0.5, 3.6, 0.3, 0.5, 0.75]], desk: [[5.3, 1.2, 1.3, 2.8, 0.55, 0.65, 0.8]], hall: [[2.9, 1.6, 4.2, 3.0, 0.9, 0.7, 0.4]] };

function narr(text, key, dur) { if (key) { if (G.seen[key]) return; G.seen[key] = 1; } if (TEST) (G.log = G.log || []).push(fmtClock(G.clock) + ' # ' + text); G.narr.push({ text, t: dur || clamp(2.6 + text.length * 0.045, 3, 7) }); if (G.narr.length > 3) G.narr.splice(1, 1); }
function later(sec, f) { G.later.push({ t: sec, f }); }
function pop(text, x, y, z, cls) { G.pops.push({ text, x, y, z, t: 1.5, cls: cls || '' }); }

// ---------- lines ----------
const LINES = {
  wake: [["Mmf. ...Biscuit?", "It's five. In the morning.", "Buddy. No.", "Whuh. What year is it."], ["No.", "Biscuit, I swear.", "It is FIVE. A. M.", "Absolutely not."]],
  backToSleep: [["Five more hours.", "Go to sleep, Biscuit.", "Zzz... not real... dream cat..."], ["Good NIGHT.", "We have a deal. The deal is 7.", "Nope. Asleep. Look how asleep."]],
  yourTurn: [["It's your turn.", "He's looking at you, though.", "I got up yesterday."], ["I did it yesterday.", "He's on YOUR face.", "He's your cat before seven."]],
  caveFeed: [["Okay. OKAY. I'm up. You win.", "Fine. Breakfast. At five. Like animals.", "I'm up, I'm up, I'm up."], ["Fine. FINE. But I am not happy.", "You are the worst roommate.", "Okay! Stop. I'm getting up."]],
  caveFeedDay: [["Okay, okay. Breakfast. I hear you.", "Alright, buddy. Food. I know.", "Yes. YES. I'm getting it."], ["Okay! Okay. Stop yelling.", "Did nobody feed you? Poor baby.", "Fine. You are SO hungry. I get it."]],
  feedPour: [["There. Bon appetit, your majesty.", "Breakfast is served. Sir.", "Eat it. You ASKED for it."], ["There. Happy?", "Eat. And then leave me alone.", "One scoop. That's it."]],
  refuseFed: [["You ate. I WATCHED you eat.", "Dana fed you, you little liar.", "Nice try, buddy."], ["Marcus already fed you.", "You've had breakfast. I can smell it on you.", "Do not give me the eyes."]],
  caveFed: [["...Maybe just a little more.", "He does look kind of thin.", "Okay, but don't tell Dana."], ["...Fine. A tiny bit. TINY.", "You're lucky you're cute.", "Don't tell Marcus."]],
  bowlFull: [["There's food in your bowl, bud.", "You HAVE food. Right there."], ["There is food. In the bowl. Behind you.", "It's not empty, you can see the bottom a LITTLE."]],
  pushSee: [["Don't.", "Don't you dare.", "Biscuit. Look at me. No.", "We talked about this."], ["Don't.", "Biscuit. BISCUIT.", "I am looking right at you.", "Think about your choices."]],
  knocked: [["WHY.", "Why are you like this?", "...He looked me right in the eye.", "Every. Single. Day."], ["Why.", "Why are you like this?", "That was a gift.", "He made eye contact. The whole time."]],
  crashHear: [["What was that?", "BISCUIT?!", "That sounded expensive."], ["What was THAT?", "Biscuit!", "Please be the cheap one."]],
  shatter: [["That was my favorite one!", "This is why we buy the cheap glasses."], ["I liked that one!", "We are down to four mugs."]],
  fetchGo: [["I'll just... put that back.", "Okay. Back it goes.", "I've got it. I've always got it."], ["I'll get it.", "Leave it. I said LEAVE it.", "Putting it back. Again."]],
  fetchGoT: [["Yep. Fetching.", "I know my job.", "Good throw, I guess."], ["Fetching. Apparently.", "I see how this works now.", "Yes, your highness."]],
  fetchDone: [["And STAY.", "There. Please leave it.", "Third time today."], ["There. Do not.", "It lives HERE.", "Stay. I'm talking to the mug."]],
  sweep: [["I'll get the broom.", "Nobody walk barefoot."], ["Broom. Great. Love the broom.", "Don't step in it, Biscuit. BISCUIT."]],
  counter: [["Off the counter, bud.", "Paws. Floor."], ["Off.", "We EAT there.", "Counter is lava. Off."]],
  laptopOff: [["Not now, bud, I'm working.", "Biscuit. Buddy. I'm in a meeting.", "Okay, down you go. Again.", "You have a BED. Right there. I bought it.", "One email. Let me send one email."], ["He's working, Biscuit.", "Come here, leave him alone."]],
  laptopCave: [["You know what? Fine. It's a bed now.", "I'll take the call on my phone. From the floor."], ["Fine."]],
  meeting: [["Sorry, everyone, that's-- that's my cat.", "No, he's not 'saying hi,' Greg.", "Yes, that's his butt. I apologize."], ["..."]],
  lapNo: [["One sec, buddy, I'm holding a drink."], ["Not now, I have hot tea.", "I JUST sat down.", "I have to pee in five minutes. Don't."]],
  lapYes: [["Okay, c'mere, buddy.", "Lap's open."], ["...Okay, come here.", "Ugh. Fine. Up.", "You win. Lap."]],
  pinned: [["I can't move. Cat's on me.", "Dana? Can you bring me... everything?"], ["I can't get up. The cat's on me.", "Marcus? I'm pinned. Bring snacks."]],
  doorGo: [["Okay, okay, I'm coming.", "You want through? I got you.", "Door. Sure."], ["Coming. Stop yelling.", "I hear you. The building hears you.", "Okay! Door!"]],
  doorOpen: [["There you go.", "After you."], ["There. Go.", "Door's open."]],
  inOrOut: [["In or out, bud.", "...You wanted this.", "Any time now."], ["In. Or. Out.", "You ASKED for this.", "I'm holding a door for a cat. Again."]],
  doorClose: [["Cool. Great. Closing it.", "Okay then."], ["Unbelievable.", "Closing it. Don't even."]],
  doorProp: [["I'm just leaving it open. Forever.", "Doors are over. No more doors."], ["Fine. It stays open. Happy?", "We live in a tent now."]],
  bathYell: [["Occupied!", "Dude. I'm in here."], ["I'm in the SHOWER.", "Occupied!", "Marcus! He's doing the door thing!"]],
  bathOther: [["She's in the shower, bud. Not for you.", "Leave her be."], ["He's in there. He'll be out."]],
  trip: [["WHOA-- Biscuit!", "He's trying to kill me.", "One day, pal."], ["Biscuit! FEET!", "Every time I carry something!", "He wants the insurance money."]],
  sprayGo: [["Okay. That's it. Where's the bottle."], ["Okay. That's it. Spray bottle.", "You've earned this."]],
  spray: [["Pssht! No!"], ["PSST! NO.", "Bad! Pssht!"]],
  sprayMiss: [["I'll get you later."], ["He's hiding. Coward."]],
  carryGo: [["Alright, mister. Time out.", "That's it. Come here."], ["Come here, you little gremlin.", "Time out. Now."]],
  carry: [["Up we go. Yes, you're very long.", "Don't go limp. You always go limp."], ["Oof. Somebody's been eating two breakfasts.", "Who's a long boy. You. In trouble."]],
  carryDone: [["Think about what you did.", "Time out, mister."], ["Sit. Stay. I know you won't."]],
  pet: [["Who's a good boy?", "Awww. Hi, Biscuit.", "See, you CAN be sweet."], ["Hi, baby.", "Okay, you're forgiven.", "Who's my handsome man?"]],
  trap: [["Aww, belly-- OW. OW!", "Every time! EVERY time!"], ["It's a trap. I KNOW it's a-- OW.", "OW! Teeth!"]],
  zoomNight: [["It's the middle of the night, you psycho.", "WHAT is he DOING."], ["Is he running LAPS?", "Biscuit! SLEEP!"]],
  zoomDay: [["He's got the zoomies!", "There he goes."], ["Zoomies! Look at him go.", "Pfff. Maniac."]],
  stare: [["...What.", "Stop looking at me like that.", "It's unsettling, bud."], ["What. WHAT.", "I can feel you staring.", "Blink. Please blink."]],
  advocate: [["Aw, don't yell at him.", "He just loves you."], ["Be nice. He's a baby.", "Leave him alone, he's perfect."]],
  advocated: [["Unbelievable. You always take his side."], ["Oh, NOW he's 'perfect.'"]],
  united: [["Don't give in.", "Stay strong, babe.", "He's playing you."], ["Do NOT give in.", "He's manipulating you.", "Hold the line, Marcus."]],
  scratch: [["NOT the couch! You have a POST!"], ["The COUCH, Biscuit! You have a post!", "That couch was eight hundred dollars!"]],
  post: [["Good boy! Use your post!"], ["Yes! Good boy! THAT'S what it's for!"]],
  bonk: [["Pff-- he ran into the wall."], ["Ha! Smooth, Biscuit."]],
  box: [["Forty-dollar bed. Prefers the box."], ["He's in the box again. Don't recycle it."]],
  blink: [["Aw. He blinked at me.", "Love you too, bud."], ["Aww. Slow blink.", "Okay, that was cute."]],
  splash: [["GAAH! Cold! COLD!", "WET! Why am I WET!"], ["AAH! Water!"]],
  puzzle: [["THE PUZZLE.", "Eleven hundred pieces. ELEVEN HUNDRED."], ["My PUZZLE!", "Three weeks. Three WEEKS of sky pieces."]],
  plant: [["Not the monstera!"], ["My plant! That's a forty-dollar plant!"]],
  bedPush: [["Mmf. Scoot.", "How is he this heavy.", "I have four inches of bed."], ["Biscuit. Move.", "He's a liquid. A heavy liquid.", "My leg is asleep."]],
  bedLeave: [["I'm going to the couch.", "You win. Bed's yours."], ["I'm sleeping on the couch. With MY blanket."]],
  kneadOw: [["Ow. Claws. Ow.", "Biscuits. He's making biscuits. Ow."], ["Claws! Claws.", "Aw-- ow-- aw."]],
  alarm: [["Morning! Oh hey, Biscuit. Hungry?"], ["Ugh. Alarm. Come on, cat. Breakfast."]],
  notes1: [["Did you feed him?", "Hey, has Biscuit eaten?"], ["Did you feed the cat?", "Has he had breakfast?"]],
  notes2: [["Yeah. Like ten minutes ago.", "Yep. Full scoop."], ["Yes. A while ago.", "Obviously. He's a liar."]],
  notes3: [["...He told me he was starving.", "He did the EYES."], ["He looked me dead in the face and lied.", "Wow. WOW."]],
  played: [["Wait. YOU fed him?", "...We've been played."], ["You fed him TOO?", "He double-dipped. He double-dipped us."]],
  emailOops: [["Did I just-- did that SEND?", "Oh no. Oh no no no."], ["..."]],
  putAway: [["That's it. This lives in a drawer now.", "Okay, this one's going in the cupboard."], ["I'm putting this AWAY.", "Drawer. It goes in a drawer now."]],
  yourDoor: [["Your turn, babe. I got the last one.", "Nope. I just did a door."], ["Your turn. I did the last door.", "Marcus. Door. It's you."]],
  hello: [["Hey, Biscuit."], ["Hi, baby."]]
};
const line = (h, k) => { const L = LINES[k]; if (!L) return k; const a = L[h.id] && L[h.id].length ? L[h.id] : L[0]; let s = pick(a); if (a.length > 1 && s === h.lastLine) s = pick(a); h.lastLine = s; return s; };
function sayCd(h, k, cd = 4, key) { key = key || k; if (h.cd[key] > 0 || !h.awake) return false; h.cd[key] = cd; humanSay(h, line(h, k)); return true; }

// ---------- props ----------
const PROPDEFS = [
  ['water', 'WATER GLASS', 'nsW', -5.2, -4.02, 'glass', 1, 14, 0.8], ['phone', 'PHONE', 'nsW', -5.4, -4.0, 'phone', 0, 12, 0.5],
  ['book', 'BOOK', 'nsE', -2.8, -4.02, 'book', 0, 5, 0.5], ['cream', 'HAND CREAM', 'nsE', -2.58, -4.0, 'tube', 0, 4, 0.3],
  ['perfume', 'PERFUME', 'dresser', -2.02, -3.1, 'perfume', 1, 18, 0.9], ['dish', 'JEWELRY DISH', 'dresser', -2.02, -2.5, 'dish', 1, 14, 0.9], ['photo', 'PHOTO', 'dresser', -1.98, -1.95, 'frame', 0, 10, 0.6],
  ['basil', 'BASIL', 'counter', -1.2, -4.0, 'pot', 1, 14, 0.9], ['salt', 'SALT', 'counter', -0.85, -3.98, 'salt', 0, 4, 0.3], ['glass', 'GLASS', 'counter', 1.25, -3.98, 'glass', 1, 12, 0.9], ['mug', 'MUG', 'counter', 1.62, -4.0, 'mug', 1, 12, 0.9],
  ['cmug', 'COFFEE MUG', 'island', -0.25, -2.22, 'mug', 1, 12, 0.9], ['or1', 'ORANGE', 'island', 0.2, -2.33, 'orange', 0, 3, 0.25], ['or2', 'ORANGE', 'island', 0.4, -2.34, 'orange', 0, 3, 0.25], ['or3', 'ORANGE', 'island', 0.3, -2.5, 'orange', 0, 3, 0.25],
  ['vase', 'VASE', 'table', 1.95, 0.75, 'vase', 1, 16, 1.0], ['puzzle', 'PUZZLE', 'table', 1.55, 1.0, 'puzzle', 1, 30, 0.7],
  ['remote', 'REMOTE', 'ctable', -3.95, 1.86, 'remote', 0, 5, 0.4], ['candle', 'CANDLE', 'ctable', -3.45, 2.12, 'candle', 1, 12, 0.8], ['tea', 'TEA', 'ctable', -3.0, 1.86, 'mug', 1, 13, 0.9],
  ['pad', 'CONTROLLER', 'tvstand', -5.14, -0.2, 'pad', 0, 6, 0.5], ['succ', 'SUCCULENT', 'tvstand', -3.66, -0.2, 'pot', 1, 12, 0.9],
  ['trophy', 'TROPHY', 'shelf', -5.77, 1.1, 'trophy', 0, 9, 1.0], ['globe', 'SNOW GLOBE', 'shelf', -5.77, 1.85, 'globe', 1, 18, 1.0],
  ['dmug', 'DESK MUG', 'desk', 5.36, 0.66, 'mug', 1, 12, 0.9], ['cactus', 'CACTUS', 'desk', 5.72, 0.6, 'pot', 1, 12, 0.9], ['pens', 'PEN CUP', 'desk', 5.7, 1.98, 'pens', 0, 6, 0.6], ['stapler', 'STAPLER', 'desk', 5.32, 2.02, 'stapler', 0, 5, 0.6],
  ['papers', 'PAPERS', 'filing', 5.66, 2.6, 'papers', 0, 6, 0.3], ['shoe1', 'SHOE', 'shoes', 3.95, 4.24, 'shoe', 0, 3, 0.3], ['shoe2', 'SHOE', 'shoes', 4.42, 4.24, 'shoe', 0, 3, 0.3],
  ['cup', 'TOOTHBRUSHES', 'vanity', 5.52, -2.66, 'pens', 0, 7, 0.6], ['soap', 'SOAP', 'vanity', 5.5, -3.14, 'tube', 0, 4, 0.4]
].map(a => ({ id: a[0], name: a[1], surf: a[2], x: a[3], z: a[4], shape: a[5], frag: !!a[6], annoy: a[7], loud: a[8] }));
const PROPS = [];
const PLANT = { st: 'home', t: 0 };
function propsReset() { PROPS.length = 0; for (const def of PROPDEFS) PROPS.push({ def, x: def.x, y: FBY[def.surf].top, z: def.z, st: 'home', vx: 0, vy: 0, vz: 0, rot: (def.x * 7 + def.z * 3) % 6.28, tilt: 0, t: 0, shards: null, fetcher: null, by: 0 }); PLANT.st = 'home'; PLANT.fetcher = null; }
const PCOL = { mug: C('#f1e4cc'), glass: C('#cfe9f2'), orange: C('#f08a24'), pot: C('#c7673f'), vase: C('#5a8fc4'), candle: C('#f3e3c0'), perfume: C('#e9a7c8'), dish: C('#e8e2f2'), globe: C('#cfe9f2'), tube: C('#f6f1e6'), salt: C('#f7f7f2') };
function drawPropShape(p, x, y, z, ry, rx) {
  const s = p.def.shape; pushXf(x, y, z, ry, rx, 0);
  switch (s) {
    case 'mug': { const mc = p.def.id === 'tea' ? C('#7fb3a6') : p.def.id === 'dmug' ? C('#3f7fc4') : p.def.id === 'cmug' ? C('#d9442e') : PCOL.mug; cyl(0, 0.05, 0, 0.042, 0.1, mc); cyl(0.05, 0.05, 0, 0.012, 0.05, mc); cyl(0, 0.098, 0, 0.034, 0.006, C('#4a2f1e')); break; }
    case 'glass': cyl(0, 0.06, 0, 0.034, 0.12, PCOL.glass); cyl(0, 0.045, 0, 0.03, 0.08, C('#8fc4e8')); break;
    case 'phone': box(0, 0.008, 0, 0.075, 0.014, 0.15, C('#20242c')); box(0, 0.016, 0, 0.065, 0.002, 0.13, C('#3f6fb0', G.tod && G.tod.dark ? 0.3 : 0)); break;
    case 'book': put('box', 0, 0.02, 0, 0, 0, 0, 0.15, 0.04, 0.21, C('#8a5aa8')); box(0.002, 0.02, 0, 0.14, 0.03, 0.2, C('#f6f1e6')); break;
    case 'tube': cyl(0, 0.06, 0, 0.026, 0.12, PCOL.tube); cyl(0, 0.13, 0, 0.018, 0.03, C('#e58a8a')); break;
    case 'perfume': box(0, 0.045, 0, 0.07, 0.09, 0.04, PCOL.perfume); cyl(0, 0.105, 0, 0.014, 0.03, C('#d9b24a')); break;
    case 'dish': put('cyl', 0, 0.012, 0, 0, 0, 0, 0.13, 0.024, 0.13, PCOL.dish); sph(0.02, 0.03, 0, 0.012, C('#d9b24a')); break;
    case 'frame': put('box', 0, 0.08, 0, 0, -0.2, 0, 0.13, 0.16, 0.015, COLS.walnut); put('box', 0, 0.08, 0.009, 0, -0.2, 0, 0.1, 0.13, 0.004, C('#e8943a')); break;
    case 'salt': cyl(0, 0.04, 0, 0.022, 0.08, PCOL.salt); cyl(0, 0.085, 0, 0.022, 0.012, COLS.steel); break;
    case 'pot': cyl(0, 0.045, 0, 0.05, 0.09, PCOL.pot); for (let i = 0; i < 4; i++) put('sph', Math.sin(i * 1.7) * 0.03, 0.13 + (i % 2) * 0.03, Math.cos(i * 1.7) * 0.03, i, 0.5, 0, 0.07, 0.03, 0.05, p.def.id === 'cactus' ? C('#5aa05a') : COLS.leaf); if (p.def.id === 'cactus') put('sph', 0, 0.15, 0, 0, 0, 0, 0.06, 0.16, 0.06, C('#5aa05a')); break;
    case 'orange': sph(0, 0.04, 0, 0.04, PCOL.orange); break;
    case 'vase': put('sph', 0, 0.08, 0, 0, 0, 0, 0.1, 0.16, 0.1, PCOL.vase); cyl(0, 0.17, 0, 0.022, 0.06, PCOL.vase); for (let i = 0; i < 3; i++) { limb(0, 0.18, 0, Math.sin(i * 2.1) * 0.07, 0.34, Math.cos(i * 2.1) * 0.07, 0.006, COLS.leaf); sph(Math.sin(i * 2.1) * 0.07, 0.35, Math.cos(i * 2.1) * 0.07, 0.03, C(['#e04a6a', '#f0c030', '#f08a24'][i])); } break;
    case 'puzzle': put('box', 0, 0.004, 0, 0, 0, 0, 0.46, 0.008, 0.32, C('#ffffff'), ATLAS.rects.puzzle); break;
    case 'remote': box(0, 0.01, 0, 0.045, 0.02, 0.16, C('#2a2c33')); box(0, 0.022, 0.05, 0.016, 0.004, 0.016, C('#e04040')); break;
    case 'candle': cyl(0, 0.04, 0, 0.04, 0.08, PCOL.candle); cyl(0, 0.09, 0, 0.004, 0.02, C('#333')); if (p.st === 'home') sph(0, 0.115, 0, 0.012, C('#ffc040', 1)); break;
    case 'pad': put('box', 0, 0.015, 0, 0, 0, 0, 0.15, 0.03, 0.08, C('#3b3f4a')); sph(-0.04, 0.035, 0, 0.012, C('#e04040')); sph(0.04, 0.035, 0, 0.012, C('#4fb0d8')); break;
    case 'trophy': cyl(0, 0.02, 0, 0.045, 0.04, COLS.walnut); cyl(0, 0.08, 0, 0.012, 0.08, C('#d9b24a')); put('sph', 0, 0.16, 0, 0, 0, 0, 0.09, 0.1, 0.09, C('#e6c04a')); break;
    case 'globe': cyl(0, 0.02, 0, 0.05, 0.04, C('#c44b4b')); sph(0, 0.09, 0, 0.055, PCOL.globe); sph(0, 0.07, 0, 0.02, C('#3f8f4f')); break;
    case 'pens': cyl(0, 0.05, 0, 0.038, 0.1, C('#4f7a6c')); for (let i = 0; i < 4; i++) limb(Math.sin(i * 1.6) * 0.015, 0.06, Math.cos(i * 1.6) * 0.015, Math.sin(i * 1.6) * 0.035, 0.17, Math.cos(i * 1.6) * 0.035, 0.005, C(['#e04040', '#3f6fb0', '#e0b13c', '#222'][i])); break;
    case 'stapler': box(0, 0.02, 0, 0.045, 0.04, 0.15, C('#c44b4b')); box(0, 0.05, -0.01, 0.04, 0.02, 0.13, C('#a03a3a')); break;
    case 'papers': for (let i = 0; i < 3; i++) put('box', i * 0.008, 0.004 + i * 0.006, i * 0.006, i * 0.12, 0, 0, 0.21, 0.004, 0.29, C('#fbfaf5')); break;
    case 'shoe': put('box', 0, 0.035, 0, 0, 0, 0, 0.1, 0.07, 0.26, C(p.def.id === 'shoe1' ? '#e9e4d8' : '#c9546a')); put('box', 0, 0.075, -0.05, 0, 0, 0, 0.09, 0.05, 0.13, C(p.def.id === 'shoe1' ? '#d9d2c2' : '#b3445a')); break;
  }
  popXf();
}
function drawProps() {
  for (const p of PROPS) {
    if (p.st === 'gone' || p.st === 'held') continue;
    if (p.st === 'broken') {
      const col = p.def.shape === 'puzzle' ? null : PCOL[p.def.shape] || C('#ddd');
      for (const s of p.shards) { if (col) put('box', p.x + s[0], p.y + 0.008, p.z + s[1], s[2], 0, 0, 0.035 + s[3] * 0.03, 0.012, 0.025 + s[3] * 0.02, col); else put('box', p.x + s[0], p.y + 0.005, p.z + s[1], s[2], 0, 0, 0.04, 0.008, 0.04, C(['#6fb6ee', '#3f8f4f', '#c44b4b', '#e9dfcf'][Math.floor(s[3] * 4)])); }
      if (['glass', 'vase'].includes(p.def.shape) || p.def.id === 'tea') put('cyl', p.x, p.y + 0.003, p.z, 0, 0, 0, 0.5, 0.004, 0.42, C('#8fc4e8'));
      if (p.def.shape === 'pot' || p.def.shape === 'vase') put('cyl', p.x + 0.05, p.y + 0.006, p.z, 0, 0, 0, 0.3, 0.01, 0.26, C('#5a4030'));
      continue;
    }
    drawPropShape(p, p.x, p.y, p.z, p.rot, p.tilt);
  }
  // monstera
  const tip = PLANT.st === 'home' ? 0 : 1.35;
  pushXf(1.32, 0, 4.02, 2.4, tip, 0);
  cyl(0, 0.2, 0, 0.2, 0.4, COLS.terra); cyl(0, 0.4, 0, 0.18, 0.02, C('#5a4030')); cyl(0, 0.7, 0, 0.02, 0.6, C('#4f7a3a'));
  for (let i = 0; i < 6; i++) { const a = i * 1.05, r = 0.22 + (i % 2) * 0.1, y = 0.75 + i * 0.09; limb(0, y - 0.15, 0, Math.sin(a) * r, y, Math.cos(a) * r, 0.01, C('#4f7a3a')); put('sph', Math.sin(a) * (r + 0.06), y + 0.02, Math.cos(a) * (r + 0.06), a, 0.5, 0, 0.3, 0.03, 0.22, COLS.leaf); }
  popXf();
  if (PLANT.st === 'tipped') put('cyl', 1.5, 0.006, 3.5, 0, 0, 0, 0.8, 0.012, 0.6, C('#5a4030'));
}
function openEdgeDir(p, cx, cz) {
  const f = FBY[p.def.surf] || supportAt(p.x, p.z, p.y).f; if (!f) return [Math.sin(CAT.h), Math.cos(CAT.h), 0.3];
  let wx = p.x - cx, wz = p.z - cz; const wl = hyp(wx, wz) || 1; wx /= wl; wz /= wl;
  const cands = [[1, 0, f.x1 - p.x], [-1, 0, p.x - f.x0], [0, 1, f.z1 - p.z], [0, -1, p.z - f.z0]]; let best = null, bs = -9;
  for (const c of cands) {
    const ex = p.x + c[0] * (c[2] + 0.16), ez = p.z + c[1] * (c[2] + 0.16); let open = ex > APT.x0 + 0.1 && ex < APT.x1 - 0.1 && ez > APT.z0 + 0.1 && ez < APT.z1 - 0.1;
    if (open) for (const w of WALLS) if (inBox(w, ex, ez, 0.04)) { open = false; break; }
    if (open) { const t = topAt(ex, ez); if (t.y > p.y + 0.1) open = false; }
    if (!open) continue; const sc = c[0] * wx + c[1] * wz - c[2] * 0.25; if (sc > bs) { bs = sc; best = c; }
  }
  return best || [wx, wz, 0.2];
}
function knockProp(p, slow) {
  const d = openEdgeDir(p, CAT.x, CAT.z); p.st = 'slide'; p.dir = d; p.t = 0; p.dur = slow ? 1.25 : 0.3; p.dist = Math.min(d[2] + 0.1, slow ? 9 : 0.55) ; p.x0 = p.x; p.z0 = p.z; p.slow = slow; p.by = G.time;
}
function propsUpdate(dt) {
  for (const p of PROPS) {
    if (p.st === 'slide') {
      p.t += dt; const k = clamp(p.t / p.dur, 0, 1), e = p.slow ? k * k : k; p.x = p.x0 + p.dir[0] * p.dist * e; p.z = p.z0 + p.dir[1] * p.dist * e;
      if (k >= 1) { const s = supportAt(p.x, p.z, p.y + 0.02); if (s.y >= p.y - 0.03) { p.st = 'home'; p.y = s.y; } else { p.st = 'fall'; p.vx = p.dir[0] * 0.9; p.vz = p.dir[1] * 0.9; p.vy = 0.3; p.spin = rr(-6, 6); } }
    } else if (p.st === 'fall') {
      p.vy -= 9.8 * dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt; p.tilt += p.spin * dt; p.rot += p.spin * 0.5 * dt;
      const g = supportAt(p.x, p.z, p.y + 0.05).y;
      if (p.y <= g) { p.y = g; propLanded(p); }
    } else if (p.st === 'floor' && (Math.abs(p.vx) > 0.02 || Math.abs(p.vz) > 0.02)) {
      const q = { x: p.x + p.vx * dt, z: p.z + p.vz * dt }, bx = q.x, bz = q.z; collideCat(q, 0.05, p.y);
      if (Math.abs(q.x - bx) > 1e-4) p.vx *= -0.5; if (Math.abs(q.z - bz) > 1e-4) p.vz *= -0.5; p.x = q.x; p.z = q.z;
      const f = Math.exp(-(p.def.shape === 'orange' ? 0.7 : 4) * dt); p.vx *= f; p.vz *= f; p.rot += hyp(p.vx, p.vz) * dt * 8;
      const s = supportAt(p.x, p.z, p.y + 0.02); if (s.y < p.y - 0.03) { p.st = 'fall'; p.vy = 0; p.spin = 3; }
    }
    if ((p.st === 'floor' || p.st === 'broken') && !p.fetcher) { p.t -= dt; if (p.t <= 0) { p.t = 1.2; assignFetch(p); } }
  }
  if (PLANT.st === 'tipped' && !PLANT.fetcher) { PLANT.t -= dt; if (PLANT.t <= 0) { PLANT.t = 1.5; assignFetch(PLANT); } }
}
function propLanded(p) {
  const d = p.def, onBed = FBY.bed && inBox(FBY.bed, p.x, p.z) && p.y > 0.4;
  p.tilt = d.shape === 'orange' ? 0 : (d.frag ? 0 : Math.PI / 2 * (['book', 'phone', 'remote', 'papers', 'pad', 'stapler', 'frame', 'shoe'].includes(d.shape) ? 0 : 1));
  if (d.frag && !onBed) {
    p.st = 'broken'; p.shards = []; const n = d.shape === 'puzzle' ? 26 : 7; for (let i = 0; i < n; i++) p.shards.push([rr(-0.3, 0.3) * (d.shape === 'puzzle' ? 1.6 : 1), rr(-0.3, 0.3) * (d.shape === 'puzzle' ? 1.6 : 1), rr(0, 6), rnd()]);
    AU.shatter(p.x, p.z); pop(d.shape === 'puzzle' ? 'SCATTERED!' : 'SMASH!', p.x, p.y + 0.3, p.z, 'bad');
  } else { p.st = 'floor'; p.vx *= 0.5; p.vz *= 0.5; if (d.shape === 'orange') { p.vx = p.vx * 3 + rr(-0.5, 0.5); p.vz = p.vz * 3 + rr(-0.5, 0.5); } AU.thud(p.x, p.z, 0.4 + d.loud * 0.6); pop(d.loud > 0.5 ? 'CLUNK!' : 'thunk', p.x, p.y + 0.25, p.z); }
  p.t = 0.6;
  // water glass landing on a sleeper
  if (d.id === 'water' && onBed) { p.st = 'floor'; for (const h of HUM) if (h.lying && Math.abs(h.x - p.x) < 0.7) { h.sleep = 0; h.patience -= 18; if (!h.awake) wakeUp(h); humanSay(h, line(h, 'splash')); pop('SPLASH!', p.x, 1.0, p.z, 'bad'); AU.splash(); LESSON.onEvent('splash', { h }); } }
  const seenBy = [];
  for (const h of HUM) {
    if (h.hidden) continue;
    const dd = d2(h.x, h.z, p.x, p.z), k = clamp(1.3 - dd / (6 + 10 * d.loud), 0, 1) * humanHears(h, p.x, p.z); if (k <= 0) continue;
    const saw = humanSees(h) && G.time - p.by < 4, eye = saw && p.slow;
    applyStim(h, 'knock', k, { annoy: d.annoy * (p.st === 'broken' ? 1.25 : 1) * (saw ? 1 : 0.7), press: eye ? 30 : 16, wake: 26 * d.loud + (p.st === 'broken' ? 16 : 0), saw, eye, prop: p });
    if (h.awake) { h.lookCat = 4; if (d.shape === 'puzzle') humanSay(h, line(h, 'puzzle')); else if (saw) sayCd(h, 'knocked', 3, 'kn'); else sayCd(h, p.st === 'broken' ? 'shatter' : 'crashHear', 3, 'kn'); if (saw) seenBy.push(h); }
  }
  LESSON.onEvent('knock', { p, broken: p.st === 'broken', eye: seenBy.length > 0 && p.slow });
  if (seenBy.length && p.slow) { pop('EYE CONTACT!', CAT.x, CAT.y + 0.6, CAT.z, 'good'); }
}
function canFetch(h) { return h.awake && !h.hidden && !h.pinned && !h.lying && h.pri < 2 && h.planName !== 'shower' && h.planName !== 'feed'; }
function assignFetch(p) {
  if (LESSON.noFetch) return;
  const isPlant = p === PLANT, px = isPlant ? 1.5 : p.x, pz = isPlant ? 3.5 : p.z;
  let best = null, bd = 1e9; for (const h of HUM) { if (!canFetch(h)) continue; if (LESSON.fetchOk && !LESSON.fetchOk(h, p)) continue; const d = d2(h.x, h.z, px, pz) * (humanHears(h, px, pz) < 1 ? 1.5 : 1); if (d < bd) { bd = d; best = h; } }
  if (!best) return; const h = best; p.fetcher = h;
  const tr = (SAVE.get('train', {}).fetch || [0, 0])[h.id] > 0.5;
  const [nx, nz] = navNearestFree(px + clamp(h.x - px, -0.5, 0.5), pz + clamp(h.z - pz, -0.5, 0.5));
  if (isPlant) { setPlan(h, 'fetch', [stepSay(line(h, 'plant')), stepGo(nx, nz), { k: 'do', f: () => { h.carry = 'broom'; } }, stepPose('sweep', 3.2), stepDo(() => { h.carry = null; PLANT.st = 'home'; PLANT.fetcher = null; fetchCredit(h, p, true); })], 2); return; }
  if (p.st === 'broken') {
    const puz = p.def.shape === 'puzzle';
    setPlan(h, 'fetch', [stepSay(line(h, puz ? 'puzzle' : 'sweep')), stepGo(nx, nz), { k: 'faceTo', x: p.x, z: p.z }, stepDo(() => { if (!puz) h.carry = 'broom'; }), stepPose(puz ? 'kneel' : 'sweep', puz ? 5 : 2.4), stepDo(() => { h.carry = null; if (puz) { p.st = 'home'; p.x = p.def.x; p.z = p.def.z; p.y = FBY[p.def.surf].top; p.tilt = 0; p.shards = null; } else p.st = 'gone'; p.fetcher = null; fetchCredit(h, p, true); })], 2);
    return;
  }
  const f = FBY[p.def.surf];
  const [ax, az] = fetchStand(p.def);
  setPlan(h, 'fetch', [stepSay(line(h, tr ? 'fetchGoT' : 'fetchGo')), stepGo(nx, nz), { k: 'faceTo', x: p.x, z: p.z }, stepPose('bend', 0.55),
    stepDo(() => { if (p.st !== 'floor') { p.fetcher = null; h.plan.length = 0; return; } p.st = 'held'; h.carry = p; }), stepGo(ax, az), { k: 'faceTo', x: p.def.x, z: p.def.z }, stepPose(f.top > 1.4 ? 'reachHi' : 'reach', 0.5),
    stepDo(() => { h.carry = null; p.st = 'home'; p.x = p.def.x; p.z = p.def.z; p.y = f.top; p.tilt = 0; p.vx = p.vz = 0; p.fetcher = null; p.fetchN = (p.fetchN || 0) + 1; fetchCredit(h, p, false); if (LESSON.putAway && p.fetchN >= 2) { p.st = 'gone'; humanSay(h, line(h, 'putAway')); pop('PUT AWAY', p.def.x, f.top + 0.3, p.def.z, 'bad'); narr('MANUAL: Staff hide a toy after the second fetch. Find a new one.', 'putaway'); } else humanSay(h, line(h, 'fetchDone')); })], 2);
}
function fetchStand(def) { const f = FBY[def.surf]; let best = null, bd = 1e9; for (let a = 0; a < 16; a++) for (const r of [0.45, 0.6, 0.8]) { const x = def.x + Math.sin(a / 16 * TAU) * r, z = def.z + Math.cos(a / 16 * TAU) * r; if (!navFree(x, z) || !losClear(x, z, def.x, def.z)) continue; if (r < bd) { bd = r; best = [x, z]; } } return best || navNearestFree(def.x, def.z); }
function fetchCredit(h, p, swept) { h.stats.fetch++; pop(swept ? 'SWEPT!' : 'GOOD FETCH!', h.x, 1.9, h.z, 'good'); AU.ding(); LESSON.onEvent('fetch', { h, p, swept }); }
function dropCarried(h) { const p = h.carry; if (p && p.def) { p.st = 'floor'; p.x = h.x + Math.sin(h.h) * 0.3; p.z = h.z + Math.cos(h.h) * 0.3; p.y = 0; p.vx = p.vz = 0; p.fetcher = null; p.t = 2; } h.carry = null; }

// ---------- stimuli ----------
const MOVES = {
  meow1: { press: 9, annoy: 3, wake: 10, loud: 9 }, meow2: { press: 12, annoy: 4.5, wake: 14, loud: 11 }, meow3: { press: 17, annoy: 7, wake: 22, loud: 14 },
  stare: { press: 5.5, annoy: 0, wake: 5 }, tap: { press: 13, annoy: 4, wake: 17 }, stepOn: { press: 6, annoy: 3, wake: 9 },
  scratch: { press: 14, annoy: 12, wake: 12, loud: 8 }, paw: { press: 11, annoy: 3, wake: 8, loud: 8 }, zoom: { press: 4, annoy: 1.2, wake: 9, loud: 10 }, bonk: { press: 0, annoy: 0, wake: 9, loud: 7 },
  rub: { cute: 10, soothe: 8 }, headbutt: { cute: 12, soothe: 10, wake: 5, press: 4 }, purr: { cute: 4, soothe: 3 }, blink: { cute: 6, soothe: 5 }, knead: { cute: 8, soothe: 2, press: 7, annoy: 1.5, wake: 7 },
  trap: { press: 24, annoy: 10 }, sitOn: { press: 20, annoy: 9 }, boxCute: { cute: 3, soothe: 1.5 }
};
function unitedFront(h) { const p = partner(h); return p.awake && !p.hidden && p.guilt < 60 && p.planName !== 'shower' && p.planName !== 'fetch' && d2(h.x, h.z, p.x, p.z) < 5 && losClear(h.x, h.z, p.x, p.z); }
function pressure(h, amt, type) {
  if (!h.awake || amt <= 0) return;
  const d = LESSON.demandFor(h, type); if (!d) return;
  if (!h.demand || h.demand.id !== d.id) { const tr = (SAVE.get('train', {})[d.id] || [0, 0])[h.id] || 0; h.demand = { id: d.id, will: d.will * (1 - 0.45 * tr), max: d.will * (1 - 0.45 * tr), def: d }; }
  const uni = unitedFront(h);
  h.demand.will -= amt * (1 + h.guilt / 100) * h.pers.push * (uni ? 0.5 : 1) * (d.mult || 1); h.demandIdle = 0; h.lookCat = 3;
  if (h.demand.will <= 0) { const def = h.demand.def; h.demand = null; h.guilt = Math.max(0, h.guilt - 35); h.stats.caves++; pop('GAVE IN!', h.x, 2.0, h.z, 'good'); AU.ding(); def.comply(h); }
  else if (uni) { const p = partner(h); if (sayCd(p, LESSON.unitedLine || 'united', 9)) narr('MANUAL: Staff in the same room back each other up. Separate them.', 'united'); }
}
function applyStim(h, type, k, o) {
  if (h.hidden && type !== 'paw' && !type.startsWith('meow')) return;
  const m = Object.assign({}, MOVES[type] || {}, o || {});
  const night = G.tod && G.tod.dark && LESSON.sleepy;
  if (!h.awake) {
    if (m.wake) { h.sleep -= m.wake * k * h.pers.sleepK * (h.pillow > 0 ? 0.15 : 1); h.patience -= (m.annoy || 0) * k * 0.5 * h.pers.annoy; h.zz = 0.6; if (h.sleep <= 0) wakeUp(h); }
    if (m.cute) h.guilt = Math.min(100, h.guilt + m.cute * 0.5);
    LESSON.onStim(h, type, m, k); return;
  }
  if (m.annoy) { h.patience -= m.annoy * k * h.pers.annoy * (1 - h.guilt / 250) * (night && type === 'zoom' ? 4 : 1); h.charm = 0; h.calmT = 0; }
  if (m.cute) { const dim = 1 / (1 + 0.4 * (h.charm || 0)); h.guilt = Math.min(100, h.guilt + m.cute * h.pers.cute * dim * k); h.patience = Math.min(100, h.patience + (m.soothe || 0) * dim * k); if (type !== 'purr' && type !== 'boxCute') h.charm = (h.charm || 0) + 1; h.lookCat = 3; }
  if (m.press) pressure(h, m.press * k, type);
  LESSON.onStim(h, type, m, k);
  if (h.patience <= 0) retaliate(h);
}
// area sound from the cat
function stimArea(type, o) { const m = MOVES[type]; for (const h of HUM) { const d = d2(h.x, h.z, CAT.x, CAT.z), k = clamp(1.25 - d / m.loud, 0, 1) * humanHears(h, CAT.x, CAT.z); if (k > 0.02) applyStim(h, type, k, o); } }
function wakeUp(h) {
  if (h.awake) return; h.awake = true; h.sleep = 0; h.stats.woke++; h.patience = Math.min(h.patience, 80); h.lookCat = 4;
  pop('AWAKE', h.x, 1.3, h.z - 1.2); LESSON.onWake(h);
}
function retaliate(h) {
  h.patience = 50; h.stats.incidents++; G.stats.incidents++; h.demand = null;
  const p = partner(h);
  if (p.awake && !p.hidden && p.guilt >= 60 && d2(h.x, h.z, p.x, p.z) < 9) { p.guilt -= 40; humanSay(p, line(p, 'advocate')); later(1.4, () => humanSay(h, line(h, 'advocated'))); h.patience = 45; pop('DEFENDED!', p.x, 2, p.z, 'good'); narr('MANUAL: A charmed staff member will defend you from the other one. Use this.', 'advocate'); return; }
  if (LESSON.retaliate && LESSON.retaliate(h)) return;
  if (h.id === 1) planSpray(h); else planTimeout(h);
}
function catReachable() { return CAT.y < 1.3 && CAT.mode !== 'held'; }
function planSpray(h) {
  setPlan(h, 'spray', [stepSay(line(h, 'sprayGo')), stepSpot('spray'), stepPose('reach', 0.35), stepDo(() => { h.carry = 'spray'; }), stepChase(2.3, 9, 2.1), stepFaceCat(), stepPose('spray', 0.3),
    stepDo(() => { if (d2(h.x, h.z, CAT.x, CAT.z) < 3.4 && losClear(h.x, h.z, CAT.x, CAT.z) && CAT.mode !== 'held') { humanSay(h, line(h, 'spray')); sprayCat(h); } else humanSay(h, line(h, 'sprayMiss')); }), stepPose('spray', 0.5), stepDo(() => { h.carry = null; })], 4);
}
function sprayCat(h) {
  AU.spray(); pop('SPRAYED!', CAT.x, CAT.y + 0.6, CAT.z, 'bad'); indignity(26, 'You have been SPRAYED.');
  if (CAT.sit) catRelease(); CAT.mode = 'flee'; CAT.flee = { t: 1.7, x: h.x, z: h.z }; CAT.act = null; CAT.jump = null; CAT.zoomT = 0;
}
function indignity(n, why) { CAT.dignity = Math.max(0, CAT.dignity - n); G.groomT = 7; G.groomAmt = n * 0.5; G.stats.indignities++; narr('MANUAL: After any embarrassment, groom at once. It looks like you meant it.', 'groom'); }
function planTimeout(h, dest) {
  setPlan(h, 'carry', [stepSay(line(h, 'carryGo')), stepChase(1.45, 8, 2.0), stepFaceCat(), stepPose('reach', 0.25), stepDo(() => {
    if (!h.chaseOk || !catReachable() || d2(h.x, h.z, CAT.x, CAT.z) > 1.7) { humanSay(h, line(h, 'sprayMiss')); h.plan.length = 0; return; }
    if (CAT.sit) { const s = CAT.sit; CAT.sit = null; onCatLeftSit(s); } CAT.mode = 'held'; CAT.heldBy = h; CAT.act = null; CAT.jump = null; CAT.zoomT = 0; h.carry = 'cat'; humanSay(h, line(h, 'carry')); indignity(12); AU.mrow();
    const inBed = roomOf(h.x, h.z) === 'bed', sp = dest || (inBed ? SPOT.living : SPOT.timeout); h.plan.unshift(stepGo(sp.x, sp.z, { sp: 1.9 })); DOORS.bed.keepClosed = true; DOORS.bed.propped = false;
  }), stepPose('bend', 0.4), stepDo(() => { putCatDown(h); humanSay(h, line(h, 'carryDone')); }), stepDo(() => { if (LESSON.afterTimeout) LESSON.afterTimeout(h); })], 4);
}
function putCatDown(h) { if (CAT.heldBy !== h) return; narr('MANUAL: You have been put in time-out. PAW AT DOOR until someone cracks.', 'timeout'); const p = { x: h.x + Math.sin(h.h) * 0.5, z: h.z + Math.cos(h.h) * 0.5 }; collideCat(p, CATK.R, 0); CAT.x = p.x; CAT.z = p.z; CAT.y = 0; CAT.mode = 'free'; CAT.heldBy = null; h.carry = null; }
function planFeed(h, sayKey) {
  h.demand = null;
  setPlan(h, 'feed', [stepSay(line(h, sayKey || 'caveFeed')), stepSpot('cabinet'), stepPose('reach', 0.5), stepDo(() => { h.carry = 'kibble'; }), stepSpot('bowl'), stepPose('pour', 1.0), stepDo(() => { AU.pour(); }), stepPose('pour', 0.5),
    stepDo(() => { BOWL.food = 1; h.knowsFed = true; h.fedCount++; h.carry = null; pop('FOOD!', BOWL.x, 0.4, BOWL.z, 'good'); LESSON.onEvent('fed', { h }); }), stepSay(line(h, 'feedPour')), stepWait(0.6)], 3);
}
function planPet(h) {
  setPlan(h, 'pet', [stepChase(1.2, 5, 1.4), stepFaceCat(), stepDo(() => { if (h.chaseOk) { humanSay(h, line(h, 'pet')); h.patience = Math.min(100, h.patience + 14); h.guilt = Math.min(100, h.guilt + 8); pop('♥', CAT.x, CAT.y + 0.5, CAT.z, 'good'); AU.purr(1.5); } else h.plan.length = 0; }), stepPose('crouch', 2.2), stepDo(() => { if (CAT.sit && CAT.sit.kind === 'belly') catRelease(); })], 1);
}
function planTalk(a, b, ka, kb, kc, after) {
  const fa = angTo(a.x, a.z, b.x, b.z), fb = angTo(b.x, b.z, a.x, a.z);
  setPlan(a, 'talk', [{ k: 'face', a: fa }, stepSay(line(a, ka)), stepWait(1.9, 'stand'), stepWait(1.9, 'stand'), kc ? stepSay(line(a, kc)) : stepWait(0.1), stepPose(kc ? 'facepalm' : 'stand', 1.4), stepDo(() => { if (after) after(); })], 3);
  setPlan(b, 'talk', [{ k: 'face', a: fb }, stepWait(1.9, 'stand'), stepSay(line(b, kb)), stepPose('hips', 1.9), stepWait(1.5)], 3);
}

// ---------- doors ----------
function doorsUpdate(dt) {
  for (const k in DOORS) {
    const d = DOORS[k], was = d.open; d.open = appr(d.open, d.propped ? 1 : d.tgt, 2.6 * dt);
    if (was > 0.05 && d.open <= 0.05 && d.tgt === 0) AU.doorShut();
    if (d.by && d.tgt === 1 && d.keepClosed && !d.propped && !d.hold) {
      const cx = (d.x0 + d.x1) / 2; if (d2(d.by.x, d.by.z, cx, d.z) > 1.0 && !(Math.abs(CAT.z - d.z) < 0.4 && CAT.x > d.x0 - 0.2 && CAT.x < d.x1 + 0.2)) { d.tgt = 0; d.by = null; }
    }
  }
}

// ---------- cat actions ----------
const CTX = { mis: null, charm: null };
function nearestHuman(f, maxD) { let b = null, bd = maxD || 1e9; for (const h of HUM) { if (h.hidden || (f && !f(h))) continue; const d = d2(h.x, h.z, CAT.x, CAT.z); if (d < bd) { bd = d; b = h; } } return b; }
function humanBodyNear(h) { // closest point of a lying human's body to the cat
  if (!h.lying) return [h.x, h.z]; const hd = humanHead(h); const t = clamp(((CAT.x - h.x) * (hd[0] - h.x) + (CAT.z - h.z) * (hd[2] - h.z)) / (d2(h.x, h.z, hd[0], hd[2]) ** 2), 0, 1); return [lerp(h.x, hd[0], t), lerp(h.z, hd[2], t), t];
}
function buildContext() {
  CTX.mis = CTX.charm = null; const c = CAT; if (G.phase !== 'play' || c.mode === 'held' || c.mode === 'flee' || c.mode === 'jump') return;
  const fx = Math.sin(c.h), fz = Math.cos(c.h), px = c.x + fx * 0.2, pz = c.z + fz * 0.2;
  const L = LESSON.context ? LESSON.context() : null;
  // --- mischief ---
  const petter = HUM.find(h => h.planName === 'pet' && h.pose === 'crouch' && d2(h.x, h.z, c.x, c.z) < 1.3);
  if (petter && c.sit && c.sit.kind === 'belly') CTX.mis = { label: 'SPRING THE TRAP', fn: () => doTrap(petter) };
  if (!CTX.mis && L && L.mis) CTX.mis = L.mis;
  if (!CTX.mis) { let bp = null, bd = 0.46; for (const p of PROPS) { if ((p.st !== 'home' && p.st !== 'floor') || Math.abs(p.y - c.y) > 0.3) continue; const d = d2(px, pz, p.x, p.z); if (d < bd) { bd = d; bp = p; } }
    if (bp) CTX.mis = { label: (bp.st === 'floor' ? 'BAT ' : 'KNOCK ') + bp.def.name, fn: () => doKnock(bp), prop: bp }; }
  if (!CTX.mis) { let sl = null, sd = 0.62; for (const h of HUM) if (h.lying && !h.awake && c.y > 0.4) { const hd = humanHead(h), d = d2(hd[0], hd[2], c.x, c.z); if (d < sd) { sd = d; sl = h; } } if (sl) CTX.mis = { label: 'TAP FACE', fn: () => doTap(sl) }; }
  if (!CTX.mis && c.y < 0.1) {
    for (const k in DOORS) { const d = DOORS[k]; if (d.open < 0.3 && Math.abs(c.z - d.z) < 0.8 && c.x > d.x0 - 0.25 && c.x < d.x1 + 0.25) { CTX.mis = { label: 'PAW AT DOOR', fn: () => doPawDoor(d) }; break; } }
    if (!CTX.mis && PLANT.st === 'home' && d2(c.x, c.z, 1.32, 4.02) < 0.62) CTX.mis = { label: 'TIP THE PLANT', fn: doPlant };
    if (!CTX.mis && c.x > -4.95 && c.x < -2.05 && c.z > 2.85 && c.z < 4.2 && (c.z < 3.25 || c.x < -4.75 || c.x > -2.25)) CTX.mis = { label: 'SCRATCH SOFA', fn: () => doScratch('sofa') };
    if (!CTX.mis && d2(c.x, c.z, -1.35, 3.72) < 0.5) CTX.mis = { label: 'SCRATCH POST', fn: () => doScratch('post') };
  }
  if (!CTX.mis) { const h = nearestHuman(h => (h.awake ? humanSees(h) || d2(h.x, h.z, c.x, c.z) < 2 : d2(h.x, h.z, c.x, c.z) < 3.2 && roomOf(h.x, h.z) === roomOf(c.x, c.z)), 6.5); if (h && losClear(h.x, h.z, c.x, c.z)) CTX.mis = { label: 'STARE', fn: () => doStare(h) }; }
  // --- charm ---
  if (BOWL.food > 0 && d2(c.x, c.z, BOWL.x, BOWL.z) < 0.6 && c.y < 0.1) CTX.charm = { label: 'EAT', fn: doEat };
  else if (G.groomT > 0) CTX.charm = { label: 'GROOM', fn: doGroom };
  else if (L && L.charm) CTX.charm = L.charm;
  else {
    const hs = nearestHuman(h => h.awake && h.seat && !h.lying, 0.95), hl = nearestHuman(h => h.lying, 1.6), hn = nearestHuman(h => h.awake && !h.seat && !h.lying, 0.85);
    if (hs && c.y > 0.3 && !(c.sit && c.sit.kind === 'lap')) CTX.charm = hs.pose === 'type' || hs.pose === 'typeAround' || hs.pose === 'carry' ? { label: 'HEADBUTT', fn: () => doHeadbutt(hs) } : { label: 'CLAIM LAP', fn: () => doLap(hs) };
    else if (hl && c.y > 0.4 && d2(...humanBodyNear(hl).slice(0, 2), c.x, c.z) < 0.6) { const near = humanBodyNear(hl); CTX.charm = near[2] > 0.72 ? { label: 'HEADBUTT', fn: () => doHeadbutt(hl) } : { label: 'MAKE BISCUITS', fn: () => doKnead(hl) }; }
    else if (hn && c.y < 0.2) CTX.charm = { label: 'RUB LEGS', fn: () => doRub(hn) };
    else if (d2(c.x, c.z, G.boxAt.x, G.boxAt.z) < 0.6 && c.y < 0.2 && !(c.sit && c.sit.kind === 'box')) CTX.charm = { label: 'GET IN BOX', fn: doBox };
    else if (c.y > 0.45 && FBY.bed && inBox(FBY.bed, c.x, c.z)) { if (!(c.sit && c.sit.kind === 'bed')) CTX.charm = { label: 'LOAF', fn: doLoaf }; }
    else { const h = nearestHuman(h => h.awake && humanSees(h), 7); if (h) CTX.charm = d2(h.x, h.z, c.x, c.z) < 3.2 && !h.seat && !h.lying && h.pri < 2 && c.y < 0.2 ? { label: 'SHOW BELLY', fn: () => doBelly(h) } : { label: 'SLOW BLINK', fn: () => doBlink(h) }; }
    if (!CTX.charm && !(c.sit && c.sit.kind === 'loaf')) CTX.charm = { label: 'LOAF', fn: doLoaf };
  }
}
function doMeow() {
  const c = CAT; if (c.mode === 'held' || c.mode === 'flee') return;
  G.meowN = G.time - G.meowT < 2.6 ? Math.min(3, G.meowN + 1) : 1; G.meowT = G.time; c.meowT = G.meowN === 3 ? 0.9 : 0.45; AU.meow(G.meowN); G.stats.meows++;
  pop(['', 'meow', 'MEOW', 'MRRROWWW'][G.meowN], c.x, c.y + 0.55, c.z, 'cat'); stimArea('meow' + G.meowN);
  LESSON.onEvent('meow', { n: G.meowN });
  for (const h of HUM) if (h.awake && !h.hidden && d2(h.x, h.z, c.x, c.z) < 7) h.lookCat = 2.5;
}
function doKnock(p) {
  const c = CAT; c.h = angTo(c.x, c.z, p.x, p.z);
  if (p.st === 'floor') { catAct('swipe', 0.35, 0.15, () => { p.vx = Math.sin(c.h) * 2.4; p.vz = Math.cos(c.h) * 2.4; AU.tink(p.x, p.z); for (const h of HUM) if (humanSees(h)) applyStim(h, 'boxCute', 1); }); return; }
  const watcher = HUM.find(h => humanSees(h) && d2(h.x, h.z, c.x, c.z) < 8);
  if (watcher) { c.pose.pawSide = 1; catAct('push', 1.35, 0.1, () => { knockProp(p, true); sayCd(watcher, 'pushSee', 2.5, 'kn'); watcher.lookCat = 4; G.slow = 1.2; narr('MANUAL: Maintain eye contact while pushing. It is the eye contact that teaches them.', 'eye'); }); c.lookAt = { x: watcher.x, z: watcher.z, y: 1.5 }; }
  else catAct('swipe', 0.45, 0.16, () => knockProp(p, false));
  G.stats.knocks++;
}
function doTap(h) { const c = CAT, hd = humanHead(h); c.h = angTo(c.x, c.z, hd[0], hd[2]); catAct('tap', 0.5, 0.2, () => { applyStim(h, 'tap', 1); AU.pat(); pop('pat', hd[0], 1.0, hd[2], 'cat'); }); }
function doStare(h) { const c = CAT; c.h = angTo(c.x, c.z, h.x, h.z); catSit('stare', h); narr('MANUAL: The Stare costs no patience. It is slow, and it is deeply upsetting.', 'stare'); }
function doPawDoor(d) { const c = CAT; c.h = c.z > d.z ? Math.PI : 0; catAct('scratch', 0.7, 0.25, () => { AU.scratch(); pop('scritch', c.x, 0.5, d.z, 'cat'); for (const h of HUM) { const dd = d2(h.x, h.z, c.x, c.z), k = clamp(1.3 - dd / 9, 0.25, 1) * (h.planName === 'shower' ? 0.6 : 1); applyStim(h, 'paw', k, { door: d }); } LESSON.onEvent('paw', { d }); }); }
function doScratch(what) {
  const c = CAT;
  catAct('scratch', 0.9, 0.3, () => {
    AU.scratch();
    if (what === 'sofa') { stimArea('scratch'); for (const h of HUM) if (h.awake && d2(h.x, h.z, c.x, c.z) < 9 && humanHears(h, c.x, c.z) > 0.4) sayCd(h, 'scratch', 4); pop('RRRIP', c.x, 0.6, c.z, 'bad'); LESSON.onEvent('scratch', {}); }
    else { let seen = false; for (const h of HUM) if (humanSees(h)) { seen = true; sayCd(h, 'post', 5); h.patience = Math.min(100, h.patience + 6); } if (seen) { CAT.dignity = Math.max(0, CAT.dignity - 6); pop('-DIGNITY', c.x, 0.7, c.z, 'bad'); narr('MANUAL: WARNING. Using the post in front of staff is what THEY want. This is how staff train YOU.', 'post'); } }
  });
}
function doPlant() { const c = CAT; c.h = angTo(c.x, c.z, 1.32, 4.02); catAct('push', 0.9, 0.5, () => { PLANT.st = 'tipped'; PLANT.t = 0.8; AU.shatter(1.4, 3.8); pop('TIMBER!', 1.4, 0.8, 3.7, 'bad'); for (const h of HUM) { const k = clamp(1.3 - d2(h.x, h.z, 1.4, 3.8) / 14, 0, 1) * humanHears(h, 1.4, 3.8); if (k > 0) { applyStim(h, 'knock', k, { annoy: 24, press: 18, wake: 40 }); if (h.awake) sayCd(h, 'plant', 3, 'kn'); } } LESSON.onEvent('knock', { p: PLANT, broken: true }); }); }
function doEat() { const c = CAT; c.h = angTo(c.x, c.z, BOWL.x, BOWL.z); catAct('eat', 2.4, 2.3, () => { BOWL.food = 0; c.meals++; pop('NOM', BOWL.x, 0.4, BOWL.z, 'good'); LESSON.onEvent('ate', {}); }); AU.crunch(); }
function doGroom() { catAct('groom', 1.5, 1.4, () => { CAT.dignity = Math.min(100, CAT.dignity + G.groomAmt); G.groomT = 0; pop('+DIGNITY', CAT.x, CAT.y + 0.6, CAT.z, 'good'); narr('You meant to do that.', null, 2.5); }); }
function doRub(h) {
  const c = CAT; catAct('rub', 0.9, 0.35, () => {
    if (h.moving && !h.cd.trip) { h.cd.trip = 6; const pl = h.plan.slice(), cur = h.cur, nm = h.planName, pr = h.pri; if (cur) pl.unshift(cur); h.plan = [stepSay(line(h, 'trip')), stepPose('stumble', 1.0)].concat(pl); h.cur = null; h.moving = false; h.planName = nm; h.pri = pr; applyStim(h, 'tap', 1, { annoy: 14, press: 0, wake: 0 }); pop('TRIPPED!', h.x, 1.6, h.z, 'bad'); AU.thud(h.x, h.z, 0.7); G.stats.trips++; LESSON.onEvent('trip', { h }); narr('MANUAL: Never rub the legs of staff in motion. Unless it is funny.', 'trip'); }
    else { applyStim(h, 'rub', 1); pop('♥', h.x, 1.2, h.z, 'good'); AU.purr(0.9); }
  });
}
function doHeadbutt(h) { const c = CAT, hd = humanHead(h); c.h = angTo(c.x, c.z, hd[0], hd[2]); catAct('headbutt', 0.7, 0.3, () => { applyStim(h, 'headbutt', 1); pop('♥ bonk', hd[0], 1.0, hd[2], 'good'); AU.purr(0.8); }); }
function doKnead(h) { const c = CAT; catAct('knead', 1.3, 0.5, () => { applyStim(h, 'knead', 1); if (h.awake) sayCd(h, 'kneadOw', 5); AU.purr(1.2); pop('knead knead', c.x, c.y + 0.5, c.z, 'cat'); LESSON.onEvent('knead', { h }); }); }
function doBlink(h) { const c = CAT; c.h = angTo(c.x, c.z, h.x, h.z); if (c.cdBlink > G.time) { catAct('blink', 0.9, 0.5, () => { }); return; } c.cdBlink = G.time + 3.5; catAct('blink', 1.1, 0.6, () => { if (humanSees(h)) { applyStim(h, 'blink', 1); sayCd(h, 'blink', 8); pop('♥', h.x, 1.9, h.z, 'good'); } }); }
function doBelly(h) { const c = CAT; c.h = angTo(c.x, c.z, h.x, h.z); catSit('belly', h); if (h.pri < 1 && !h.cd.pet) { h.cd.pet = 7; planPet(h); narr('MANUAL: The Belly looks like a reward. It is a correction. Press MISCHIEF when the hand arrives.', 'belly'); } }
function doTrap(h) { catAct('trap', 0.8, 0.15, () => { applyStim(h, 'trap', 1); humanSay(h, line(h, 'trap')); AU.mrow(); pop('GOT THE HAND', h.x, 1.0, h.z, 'bad'); h.plan = [stepPose('shrug', 0.9)]; h.cur = null; G.stats.traps++; LESSON.onEvent('trap', { h }); }); }
function doLoaf() { catSit(CAT.y > 0.45 && FBY.bed && inBox(FBY.bed, CAT.x, CAT.z) ? 'bed' : 'loaf', null); }
function doBox() { catSit('box', null, G.boxAt.x, G.boxAt.z, 0.03, CAT.h); narr('MANUAL: If it fits, you sits. Boxes restore dignity.', 'box'); for (const h of HUM) if (humanSees(h)) sayCd(h, 'box', 20); }
function doLap(h) {
  const c = CAT; if (LESSON.lapAllowed && !LESSON.lapAllowed(h)) return;
  const lx = h.x + Math.sin(h.h) * 0.27 * h.look.s, lz = h.z + Math.cos(h.h) * 0.27 * h.look.s; catSit('lap', h, lx, lz, 0.62 * h.look.s, h.h + Math.PI / 2); h.pinned = true; if (!h.seat) h.pinned = false; h.posePrev = h.pose; h.pose = 'lapcat'; h.carryPrev = h.carry; h.carry = null;
  AU.purr(2); pop('♥', lx, 1.1, lz, 'good'); LESSON.onEvent('lap', { h }); sayCd(h, 'pinned', 12);
}
function onCatLeftSit(s) { if (!s) return; if (s.kind === 'lap' && s.ref) { const h = s.ref; h.pinned = false; if (h.pose === 'lapcat') h.pose = h.posePrev || 'sit'; if (h.carryPrev) h.carry = h.carryPrev; LESSON.onEvent('lapEnd', { h }); } if (LESSON.onLeftSit) LESSON.onLeftSit(s); }
function onZoomStart() { G.stats.zooms++; narr('MANUAL: Zoomies need no reason. Steer. Or do not.', 'zoom'); pop('ZOOM!', CAT.x, CAT.y + 0.6, CAT.z, 'cat'); }
function onZoomEnd() { }
function onCatLanded() { for (const h of HUM) if (h.lying && CAT.y > 0.4 && Math.abs(CAT.x - h.x) < 0.3 && CAT.z < h.z + 0.1 && CAT.z > h.z - 1.5) { applyStim(h, 'stepOn', 1.6); pop('OOF', h.x, 1.0, CAT.z, 'cat'); AU.oof(h); } LESSON.onEvent('landed', {}); }
function onCatBonk() { AU.thud(CAT.x, CAT.z, 0.8); pop('BONK', CAT.x, CAT.y + 0.5, CAT.z, 'cat'); CAT.zoomT = Math.min(CAT.zoomT, 0.3); stimArea('bonk'); for (const h of HUM) if (humanSees(h)) { sayCd(h, 'bonk', 10); h.guilt = Math.min(100, h.guilt + 4); } indignity(4); }

// per-frame cat side effects
function simCat(dt) {
  const c = CAT; c.meowT = (c.meowT || 0) - dt; G.groomT = Math.max(0, G.groomT - dt); c.bump = 0;
  // head target
  const hh = nearestHuman(null, 6); c.lookAt = (c.mode === 'sit' && c.sit.ref && c.sit.ref.x !== undefined && c.sit.kind !== 'lap') ? { x: c.sit.ref.x, z: c.sit.ref.z, y: humanHead(c.sit.ref)[1] } : c.act && c.act.name === 'push' ? c.lookAt : hh && c.idleT > 0.6 ? { x: hh.x, z: hh.z, y: humanHead(hh)[1] } : null;
  // walking over sleepers
  for (const h of HUM) if (h.lying && c.y > 0.4 && c.mode !== 'jump' && Math.abs(c.x - h.x) < 0.27 && c.z < h.z + 0.1 && c.z > h.z - 1.45) { c.bump = 0.13; if (Math.abs(c.speed) > 0.3 && !(h.cd.step > 0)) { h.cd.step = 0.9; applyStim(h, 'stepOn', 1); pop('step', c.x, 1.0, c.z, 'cat'); AU.oof(h, 0.5); LESSON.onEvent('stepOn', { h }); } }
  // continuous: stare, purr, box, zoomies
  G.zoomAcc += dt;
  if (c.mode === 'sit') {
    const s = c.sit;
    if (s.kind === 'stare') { const h = s.ref; if (h && !h.hidden && d2(h.x, h.z, c.x, c.z) < 7 && losClear(h.x, h.z, c.x, c.z)) { applyStim(h, 'stare', dt, {}); if (h.awake && s.t > 1.5 && humanSees(h)) sayCd(h, 'stare', 9); } }
    else if (s.kind === 'lap' && s.ref) { applyStim(s.ref, 'purr', dt); AU.purrHold(); }
    else if (s.kind === 'box') { c.dignity = Math.min(100, c.dignity + 5 * dt); for (const h of HUM) if (humanSees(h)) applyStim(h, 'boxCute', dt); }
    else if (s.kind === 'belly' && s.t > 6) catRelease();
  }
  if (c.zoomT > 0 && G.zoomAcc > 0.5) { G.zoomAcc = 0; stimArea('zoom', { press: 2, annoy: 0.6, wake: 4.5 }); const night = G.tod.dark && LESSON.sleepy; for (const h of HUM) if (h.awake && !h.hidden && humanHears(h, c.x, c.z) > 0.4 && d2(h.x, h.z, c.x, c.z) < 10) { if (sayCd(h, night ? 'zoomNight' : 'zoomDay', 8, 'zoom') && !night) h.guilt = Math.min(100, h.guilt + 5); } AU.skitter(); }
  // counter scolding
  const sup = supportAt(c.x, c.z, c.y).f;
  if (sup && (sup.id === 'counter' || sup.id === 'island' || sup.id === 'table') && c.mode !== 'jump') for (const h of HUM) if (humanSees(h) && h.pri < 2 && d2(h.x, h.z, c.x, c.z) < 7 && sayCd(h, 'counter', 11)) { h.patience -= 3; h.lookCat = 3; }
}
function simHumans(dt) {
  for (const h of HUM) {
    humanUpdate(h, dt);
    if (h.awake) {
      h.calmT += dt; if (h.calmT > 4 && h.patience < 100) h.patience = Math.min(100, h.patience + 1.4 * dt);
      h.guilt = Math.max(0, h.guilt - 0.6 * dt); if (h.calmT > 12) h.charm = 0;
      if (h.demand) { h.demandIdle += dt; if (h.demandIdle > 5) { h.demand.will = Math.min(h.demand.max, h.demand.will + 6 * dt); if (h.demand.will >= h.demand.max && h.demandIdle > 8) { const d = h.demand; h.demand = null; if (d.def.drop) d.def.drop(h); } } }
    } else { h.zz -= dt; h.sleep = Math.min(100, h.sleep + 0.5 * dt); if (h.pillow > 0) h.pillow -= dt; }
  }
}
