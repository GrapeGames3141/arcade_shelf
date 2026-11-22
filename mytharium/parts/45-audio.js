
// ============================================================
//  AUDIO · small synthesised soundscape (starts on the first tap)
// ============================================================
const AU={ctx:null,master:null,on:true,water:null,crick:null,last:{}};
function audioInit(){if(AU.ctx||!SETTINGS.sound)return;try{const C=new(window.AudioContext||window.webkitAudioContext)();AU.ctx=C;AU.master=C.createGain();AU.master.gain.value=.55;AU.master.connect(C.destination);
  // trickling water: band-passed noise with a slow wobble
  const nb=C.createBuffer(1,C.sampleRate*2,C.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;AU.noise=nb;
  const src=C.createBufferSource();src.buffer=nb;src.loop=true;const bp=C.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1800;bp.Q.value=.7;const g=C.createGain();g.gain.value=0;
  src.connect(bp);bp.connect(g);g.connect(AU.master);src.start();AU.water={g,bp};
  const lfo=C.createOscillator();lfo.frequency.value=.35;const lg=C.createGain();lg.gain.value=500;lfo.connect(lg);lg.connect(bp.frequency);lfo.start();}catch(e){LOG('audio unavailable',e.message);AU.ctx=null;}}
function audioUpdate(dt){if(!AU.ctx)return;const on=SETTINGS.sound?1:0;AU.master.gain.setTargetAtTime(.55*on,AU.ctx.currentTime,.1);
  const F=FALL.impact||[36,10,-14];const d=V.dist(CAM.pos,F);AU.water.g.gain.setTargetAtTime(.06/(1+d*d*.00004),AU.ctx.currentTime,.3);
  // crickets after dark
  if(LIGHT.night>.6&&Math.random()<dt*.9)chirp();}
function tone(f,dur,type='sine',vol=.1,o={}){if(!AU.ctx||!SETTINGS.sound)return;const C=AU.ctx,t=C.currentTime+(o.at||0);const osc=C.createOscillator();osc.type=type;osc.frequency.setValueAtTime(f,t);
  if(o.slide)osc.frequency.exponentialRampToValueAtTime(o.slide,t+dur);const g=C.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+(o.att||.01));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  let n=osc;if(o.vib){const l=C.createOscillator();l.frequency.value=o.vib;const lg=C.createGain();lg.gain.value=f*.012;l.connect(lg);lg.connect(osc.frequency);l.start(t);l.stop(t+dur);}
  if(o.filt){const fl=C.createBiquadFilter();fl.type='bandpass';fl.frequency.value=o.filt;fl.Q.value=o.q||3;osc.connect(fl);n=fl;}n.connect(g);g.connect(AU.master);osc.start(t);osc.stop(t+dur+.05);}
function noiseBurst(dur,f,vol,type='bandpass',q=1,slide){if(!AU.ctx||!SETTINGS.sound)return;const C=AU.ctx,t=C.currentTime;const s=C.createBufferSource();s.buffer=AU.noise;const fl=C.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f,t);if(slide)fl.frequency.exponentialRampToValueAtTime(slide,t+dur);fl.Q.value=q;
  const g=C.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(fl);fl.connect(g);g.connect(AU.master);s.start(t,Math.random());s.stop(t+dur);}
function sfx(name){if(!AU.ctx)return;const now=performance.now();if(AU.last[name]&&now-AU.last[name]<120)return;AU.last[name]=now;
  if(name==='mist')noiseBurst(.35,5200,.08,'highpass',.7);
  else if(name==='tap'){tone(1900,.08,'triangle',.08);tone(950,.12,'sine',.05);}
  else if(name==='chime'){const b=[1318,1568,1760,2093,2637];for(let i=0;i<3;i++)tone(b[(Math.random()*5)|0],1.2,'sine',.04,{at:i*.09});}
  else if(name==='nicker'){for(let i=0;i<4;i++)tone(240+i*10,.12,'sawtooth',.05,{at:i*.07,filt:900,q:4,slide:200});}
  else if(name==='chirp'){tone(1400,.18,'square',.03,{slide:2600,filt:2200});tone(2100,.12,'sine',.03,{at:.15,slide:1500});}
  else if(name==='fire'){noiseBurst(.7,300,.12,'lowpass',.8,1600);}
  else if(name==='splash'){noiseBurst(.4,1200,.12,'bandpass',.6,400);}
  else if(name==='plop'){tone(600,.12,'sine',.06,{slide:180});}
  else if(name==='pet'){tone(660,.25,'sine',.05,{vib:6});tone(880,.3,'sine',.035,{at:.08,vib:6});}
  else if(name==='cry'){tone(900,.9,'sawtooth',.04,{slide:1500,filt:1800,q:2});tone(1300,.7,'sine',.04,{at:.3,slide:900});}}
function chirp(){if(!AU.ctx)return;const f=4200+Math.random()*400;for(let i=0;i<3;i++)tone(f,.04,'sine',.012,{at:i*.06});}
// the mermaid's dusk song: a slow vowel-shaped melody
function song(){if(!AU.ctx||!SETTINGS.sound)return;const notes=[0,3,7,10,7,5,3,0,-2,0];const base=392;let at=0;for(const n of notes){const f=base*Math.pow(2,n/12);const d=.55+Math.random()*.3;tone(f,d,'triangle',.05,{at,vib:5.5,filt:900,q:2,att:.12});tone(f*2,d,'sine',.012,{at,vib:5.5});at+=d*.85;}}
