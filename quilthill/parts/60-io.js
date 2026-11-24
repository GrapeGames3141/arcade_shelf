// ---------- 60-io: input, audio, HUD ----------
const INP={steer:0,push:0,brake:0,jumpPress:false};
const KEYS={};
let touchMode=matchMedia('(pointer:coarse)').matches;
addEventListener('keydown',e=>{if(e.repeat&&e.code==='Space')return;KEYS[e.code]=true;
  if(e.code==='Space'){INP.jumpPress=true;e.preventDefault();}
  if((e.code==='KeyP'||e.code==='Escape')&&(GAME.mode==='run'||GAME.mode==='count'))pauseGame();else if((e.code==='KeyP'||e.code==='Escape')&&GAME.mode==='pause')resumeGame();
  if(e.code==='KeyR'&&(GAME.mode==='run'||GAME.mode==='finish'||GAME.mode==='ended'))startRun();
  if(e.code==='Enter'&&GAME.mode==='menu')startRun();
  Sfx.unlock();});
addEventListener('keyup',e=>{KEYS[e.code]=false;});
const JOY={id:null,x0:0,y0:0,dx:0,dy:0};
const joyBase=document.getElementById('joyBase'),joyKnob=document.getElementById('joyKnob');
function showTouch(){document.getElementById('touch').style.display=(touchMode&&(GAME.mode==='run'||GAME.mode==='count'))?'block':'none';}
canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'){touchMode=true;showTouch();}
  Sfx.unlock();
  if(e.pointerType!=='touch')return;
  if(JOY.id===null&&e.clientX<innerWidth*0.6){JOY.id=e.pointerId;JOY.x0=e.clientX;JOY.y0=e.clientY;JOY.dx=JOY.dy=0;
    joyBase.style.display='block';joyBase.style.left=e.clientX+'px';joyBase.style.top=e.clientY+'px';joyKnob.style.transform='';
    document.getElementById('joyHint').style.display='none';}
  else if(e.clientX>=innerWidth*0.6)INP.jumpPress=true;
});
addEventListener('pointermove',e=>{if(e.pointerId!==JOY.id)return;let dx=e.clientX-JOY.x0,dy=e.clientY-JOY.y0;const L=Math.hypot(dx,dy),M=58;if(L>M){dx*=M/L;dy*=M/L;}
  JOY.dx=dx/M;JOY.dy=dy/M;joyKnob.style.transform=`translate(${dx}px,${dy}px)`;});
const joyEnd=e=>{if(e.pointerId!==JOY.id)return;JOY.id=null;JOY.dx=JOY.dy=0;joyBase.style.display='none';};
addEventListener('pointerup',joyEnd);addEventListener('pointercancel',joyEnd);
const jumpBtn=document.getElementById('jumpBtn');
jumpBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();INP.jumpPress=true;Sfx.unlock();});
function readInput(){
  let st=0,pu=0,br=0;
  if(KEYS.KeyA||KEYS.ArrowLeft)st-=1;if(KEYS.KeyD||KEYS.ArrowRight)st+=1;
  if(KEYS.KeyW||KEYS.ArrowUp)pu=1;if(KEYS.KeyS||KEYS.ArrowDown)br=1;
  if(JOY.id!==null){const dz=0.15;const ax=Math.abs(JOY.dx)>dz?(JOY.dx-Math.sign(JOY.dx)*dz)/(1-dz):0;st+=ax;
    if(JOY.dy<-0.3)pu=Math.max(pu,(-JOY.dy-0.3)/0.7);if(JOY.dy>0.3)br=Math.max(br,(JOY.dy-0.3)/0.7);}
  const gps=navigator.getGamepads?navigator.getGamepads():[];for(const gp of gps){if(!gp)continue;
    const ax=gp.axes[0]||0;if(Math.abs(ax)>0.15)st+=ax;if(gp.buttons[7]&&gp.buttons[7].value>0.2)pu=Math.max(pu,gp.buttons[7].value);
    if(gp.buttons[6]&&gp.buttons[6].value>0.2)br=Math.max(br,gp.buttons[6].value);
    if(gp.buttons[0]&&gp.buttons[0].pressed){if(!gp._j)INP.jumpPress=true;gp._j=true;}else gp._j=false;}
  // flip steer when looking: none (camera always behind)
  INP.steer=clamp(st,-1,1);INP.push=pu;INP.brake=br;
  if(window.INP_OVR)Object.assign(INP,window.INP_OVR);
}

// ---- audio: procedural
const Sfx={ctx:null,on:true,master:null,musicT:0,step:0,
  unlock(){if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return;}
    try{const C=window.AudioContext||window.webkitAudioContext;this.ctx=new C();}catch(e){return;}
    const c=this.ctx;this.master=c.createGain();this.master.gain.value=this.on?0.8:0;this.master.connect(c.destination);
    const len=c.sampleRate*2,buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;this.noise=buf;
    const src=c.createBufferSource();src.buffer=buf;src.loop=true;this.rollF=c.createBiquadFilter();this.rollF.type='lowpass';this.rollF.Q.value=2;
    this.rollAM=c.createGain();this.rollG=c.createGain();this.rollG.gain.value=0;
    this.lfo=c.createOscillator();this.lfo.frequency.value=14;const lfoG=c.createGain();lfoG.gain.value=0;this.lfoG=lfoG;this.lfo.connect(lfoG).connect(this.rollAM.gain);this.lfo.start();
    src.connect(this.rollF).connect(this.rollAM).connect(this.rollG).connect(this.master);src.start();
    this.musicG=c.createGain();this.musicG.gain.value=0.16;this.musicG.connect(this.master);this.musicT=c.currentTime+0.2;},
  setOn(v){this.on=v;if(this.master)this.master.gain.value=v?0.8:0;},
  tone(f0,f1,dur,type,vol,delay){if(!this.ctx)return;const c=this.ctx,t=c.currentTime+(delay||0);const o=c.createOscillator(),g=c.createGain();o.type=type||'sine';
    o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||0.2,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g).connect(this.master);o.start(t);o.stop(t+dur+0.05);},
  noiseHit(dur,freq,vol,type,delay){if(!this.ctx)return;const c=this.ctx,t=c.currentTime+(delay||0);const s=c.createBufferSource();s.buffer=this.noise;const f=c.createBiquadFilter();f.type=type||'lowpass';f.frequency.value=freq;
    const g=c.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(f).connect(g).connect(this.master);s.start(t,Math.random());s.stop(t+dur+0.05);},
  jump(){this.tone(320,720,0.16,'sine',0.18);},
  whoosh(){this.noiseHit(0.35,2200,0.12);},
  land(a){this.noiseHit(0.16,450,0.25*Math.min(1,0.3+a*0.4));this.tone(140,90,0.12,'sine',0.15);},
  bobbin(n){const b=700*Math.pow(1.04,n%12);this.tone(b,b,0.08,'triangle',0.16);this.tone(b*1.5,b*1.5,0.12,'triangle',0.11,0.06);},
  boing(){this.tone(180,520,0.25,'sine',0.3);this.tone(260,620,0.2,'triangle',0.1,0.03);},
  snip(){this.noiseHit(0.05,5000,0.4,'highpass');this.noiseHit(0.06,4000,0.4,'highpass',0.09);this.tone(900,300,0.15,'square',0.05);},
  bonk(){this.tone(220,90,0.2,'sine',0.3);this.noiseHit(0.1,900,0.25);},
  zip(){if(!this.ctx)return;const c=this.ctx,t=c.currentTime;const s=c.createBufferSource();s.buffer=this.noise;const f=c.createBiquadFilter();f.type='bandpass';f.Q.value=6;f.frequency.setValueAtTime(800,t);f.frequency.exponentialRampToValueAtTime(5000,t+0.45);
    const g=c.createGain();g.gain.setValueAtTime(0.35,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.5);s.connect(f).connect(g).connect(this.master);s.start(t,Math.random());s.stop(t+0.55);},
  thimble(){[1047,1319,1568,2093].forEach((f,i)=>this.tone(f,f,0.18,'triangle',0.14,i*0.06));},
  hoop(){this.tone(500,1000,0.2,'sine',0.2);this.tone(750,1500,0.2,'sine',0.12,0.08);},
  ouch(){this.tone(1400,700,0.12,'square',0.06);this.tone(300,160,0.2,'sine',0.25,0.05);},
  fanfare(){[523,659,784,1047,784,1047].forEach((f,i)=>this.tone(f,f,0.28,'triangle',0.17,i*0.11));},
  tick(n){this.tone(n?880:520,n?880:520,0.15,'triangle',0.18);},
  update(dt){if(!this.ctx)return;const c=this.ctx;const running=GAME.mode==='run'||GAME.mode==='finish';
    const sp=running?Math.hypot(P.vx,P.vs):0;const on=running&&!P.air&&sp>0.5;
    const t=P.patch;
    this.rollG.gain.setTargetAtTime(on?Math.min(0.16,sp/16*0.13)*(t===PT.SATIN?0.7:t===PT.CORD?1.4:1):0,c.currentTime,0.05);
    this.rollF.frequency.setTargetAtTime(t===PT.SATIN?2400+sp*80:t===PT.CORD?500+sp*20:700+sp*40,c.currentTime,0.1);
    this.lfo.frequency.setTargetAtTime(t===PT.CORD?sp*4.5:sp*1.2+2,c.currentTime,0.1);this.lfoG.gain.setTargetAtTime(t===PT.CORD?0.9:0.25,c.currentTime,0.1);
    // plucky music-box loop
    const tune=[0,7,4,7,9,7,4,2, 0,4,7,9,12,9,7,4, 5,9,12,14,12,9,7,5, 4,7,9,7,4,2,0,-1];
    while(this.musicT<c.currentTime+0.3){const n=tune[this.step%tune.length];const tm=this.musicT;
      if(n>=0){const f=587.33*Math.pow(2,n/12);const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0.0001,tm);g.gain.exponentialRampToValueAtTime(0.45,tm+0.005);g.gain.exponentialRampToValueAtTime(0.0001,tm+0.7);
        o.connect(g).connect(this.musicG);o.start(tm);o.stop(tm+0.8);}
      if(this.step%2===0){const o2=c.createOscillator(),g2=c.createGain();o2.type='triangle';o2.frequency.value=(this.step%8<4?146.83:196);g2.gain.setValueAtTime(0.0001,tm);g2.gain.exponentialRampToValueAtTime(0.25,tm+0.01);g2.gain.exponentialRampToValueAtTime(0.0001,tm+0.35);o2.connect(g2).connect(this.musicG);o2.start(tm);o2.stop(tm+0.4);}
      this.musicT+=0.2;this.step++;}
  }
};
// ---- HUD
const $=id=>document.getElementById(id);
const PLABEL=['Cotton','Corduroy · grippy','Satin · slippery!'];
const HUD={last:'',
  pop(txt,big){const d=document.createElement('div');d.className='pop'+(big?' big':'');d.textContent=txt;const pops=$('pops');d.style.top=(pops.children.length%3)*40+'px';pops.appendChild(d);setTimeout(()=>d.remove(),1300);},
  flash(){const e=$('hBob');e.style.transform='scale(1.3)';setTimeout(()=>e.style.transform='',120);},
  update(){const t=(GAME.mode==='finish'||GAME.mode==='ended'?GAME.finishT:GAME.runT).toFixed(1);const txt=t+'|'+GAME.score+'|'+GAME.bobbins+'|'+P.patch;
    if(txt!==this.last){this.last=txt;$('hTime').textContent=t+'s';$('hScore').textContent=GAME.score;$('hBob').textContent=GAME.bobbins+' / '+GAME.total;
      const pe=$('patch');pe.textContent=PLABEL[P.patch];pe.className='felt patch p'+P.patch;}
    $('progSled').style.left=(clamp(P.s/QH.L,0,1)*100)+'%';},
  end(){GAME.mode='ended';showTouch();const rows=[['Time',GAME.finishT.toFixed(1)+'s'],['Bobbins',GAME.bobbins+' / '+GAME.total+' × 25'],['Thimbles',GAME.thimbles+' × 100'],['Hoops',GAME.hoops+' × 50'],['Air',GAME.airScore],['Boings',GAME.boings+' × 5'],
      ['Time bonus',GAME.timeBonus]].concat(GAME.allBonus?[['Every bobbin!',GAME.allBonus]]:[]).concat([['Snips · Ouches',GAME.snips+' · '+GAME.ouches]]);
    $('endTable').innerHTML=rows.map(r=>`<tr><td style="text-align:left">${r[0]}</td><td>${r[1]}</td></tr>`).join('')+`<tr class="tot"><td style="text-align:left">Total</td><td>${GAME.score}</td></tr>`;
    $('endBest').textContent=GAME.newBest?'New best score!':(GAME.best?'Best: '+GAME.best:'');$('endO').style.display='flex';$('hud').style.display='none';}
};
