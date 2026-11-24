// ---------- 60-io: input, audio, HUD ----------
const INP={steer:0,push:0,brake:0,jumpPress:false};
const KEYS={};
let touchMode=matchMedia('(pointer:coarse)').matches;
addEventListener('keydown',e=>{if(e.repeat&&e.code==='Space')return;KEYS[e.code]=true;
  if(e.code==='Space'){INP.jumpPress=true;e.preventDefault();}
  if((e.code==='KeyP'||e.code==='Escape')&&(GAME.mode==='run'||GAME.mode==='count'))pauseGame();else if((e.code==='KeyP'||e.code==='Escape')&&GAME.mode==='pause')resumeGame();
  if(e.code==='KeyR'&&(GAME.mode==='run'||GAME.mode==='finish'))startRun();
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
}

// ---- audio: all procedural
const Sfx={ctx:null,on:true,master:null,hiss:null,hissG:null,hissF:null,musicT:0,step:0,
  unlock(){if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return;}
    try{const C=window.AudioContext||window.webkitAudioContext;this.ctx=new C();}catch(e){return;}
    const c=this.ctx;this.master=c.createGain();this.master.gain.value=this.on?0.8:0;this.master.connect(c.destination);
    const len=c.sampleRate*2,buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;this.noise=buf;
    const src=c.createBufferSource();src.buffer=buf;src.loop=true;this.hissF=c.createBiquadFilter();this.hissF.type='bandpass';this.hissF.Q.value=0.7;
    this.hissG=c.createGain();this.hissG.gain.value=0;src.connect(this.hissF).connect(this.hissG).connect(this.master);src.start();
    this.musicG=c.createGain();this.musicG.gain.value=0.18;this.musicG.connect(this.master);this.musicT=c.currentTime+0.2;},
  setOn(v){this.on=v;if(this.master)this.master.gain.value=v?0.8:0;},
  tone(f0,f1,dur,type,vol,delay){if(!this.ctx)return;const c=this.ctx,t=c.currentTime+(delay||0);const o=c.createOscillator(),g=c.createGain();o.type=type||'sine';
    o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||0.2,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g).connect(this.master);o.start(t);o.stop(t+dur+0.05);},
  noiseHit(dur,freq,vol){if(!this.ctx)return;const c=this.ctx,t=c.currentTime;const s=c.createBufferSource();s.buffer=this.noise;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=freq;
    const g=c.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(f).connect(g).connect(this.master);s.start(t,Math.random());s.stop(t+dur+0.05);},
  jump(){this.tone(300,700,0.18,'sine',0.18);},
  whoosh(){this.noiseHit(0.35,2500,0.12);},
  land(a){this.noiseHit(0.18,500,0.25*Math.min(1,0.3+a*0.4));},
  button(n){const b=660*Math.pow(1.06,Math.min(n,8));this.tone(b,b,0.09,'triangle',0.16);this.tone(b*1.5,b*1.5,0.14,'triangle',0.12,0.06);},
  pickup(n){this.tone(700,1300,0.12,'sine',0.18);this.tone(900,1700,0.12,'sine',0.14,0.1);},
  bonk(){this.tone(180,70,0.3,'sine',0.35);this.noiseHit(0.2,800,0.3);},
  cheer(){for(let i=0;i<9;i++){const f=700+Math.random()*700;this.tone(f,f*1.5,0.16,'sine',0.09,0.1+i*0.11+Math.random()*0.05);}this.noiseHit(0.6,3000,0.06);},
  fanfare(){[523,659,784,1047].forEach((f,i)=>this.tone(f,f,0.3,'triangle',0.18,i*0.12));},
  tick(n){this.tone(n?880:520,n?880:520,0.15,'triangle',0.18);},
  update(dt){if(!this.ctx)return;const c=this.ctx;
    const running=GAME.mode==='run'||GAME.mode==='finish';const v=running&&!CELEB.on?P.v:0;
    this.hissG.gain.setTargetAtTime(running&&!P.air?Math.min(0.12,v/22*0.1)*(P.inSnow?2:1):0,c.currentTime,0.05);
    this.hissF.frequency.setTargetAtTime(P.inSnow?600:900+v*70,c.currentTime,0.1);
    // music box loop (pentatonic, lookahead scheduling)
    const tune=[0,4,7,9,7,4,2,4, 0,4,7,12,9,7,4,2, 5,9,12,9,7,4,2,0, 4,7,9,7,4,2,-1,0];
    while(this.musicT<c.currentTime+0.3){const n=tune[this.step%tune.length];if(n>=0){const f=523.25*Math.pow(2,n/12);const t=this.musicT;
        const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.5,t+0.005);g.gain.exponentialRampToValueAtTime(0.0001,t+0.9);
        o.connect(g).connect(this.musicG);o.start(t);o.stop(t+1);
        if(this.step%4===0){const o2=c.createOscillator(),g2=c.createGain();o2.type='triangle';o2.frequency.value=f/4;g2.gain.setValueAtTime(0.0001,t);g2.gain.exponentialRampToValueAtTime(0.35,t+0.01);g2.gain.exponentialRampToValueAtTime(0.0001,t+0.8);o2.connect(g2).connect(this.musicG);o2.start(t);o2.stop(t+0.9);}}
      this.musicT+=0.24;this.step++;}
  }
};

// ---- HUD
const $=id=>document.getElementById(id);
const HUD={lastTxt:'',
  pop(txt,big){const d=document.createElement('div');d.className='pop'+(big?' big':'');d.textContent=txt;
    const pops=$('pops');d.style.top=(pops.children.length%3)*40+'px';pops.appendChild(d);setTimeout(()=>d.remove(),1300);},
  stack(){$('stack').innerHTML=P.stack.map(p=>'<span>'+SPECIES[p.key].em+'</span>').join('');},
  flashScore(){const e=$('hScore');e.style.transform='scale(1.3)';setTimeout(()=>e.style.transform='',120);},
  update(){const t=(GAME.mode==='finish'||GAME.mode==='ended'?GAME.finishT:GAME.runT).toFixed(1);const txt=t+'|'+GAME.score+'|'+GAME.buttons;
    if(txt!==this.lastTxt){this.lastTxt=txt;$('hTime').textContent=t+'s';$('hScore').textContent=GAME.score;$('hBtn').textContent=GAME.buttons;}
    $('progSled').style.left=(clamp(P.s/TR.L,0,1)*100)+'%';},
  end(){GAME.mode='ended';showTouch();const rows=[['Time',GAME.finishT.toFixed(1)+'s'],['Buttons',GAME.buttons],['Air & hops',GAME.airScore],
      ['Pals '+P.stack.map(p=>SPECIES[p.key].em).join(''),P.stack.length+' × 150'],['Time bonus',GAME.timeBonus],['Bonks',GAME.bonks]];
    let h='';for(let i=0;i<rows.length;i+=2){h+='<tr>';for(const r of rows.slice(i,i+2))h+=`<td style="text-align:left;opacity:.75">${r[0]}</td><td>${r[1]}</td>`;h+='</tr>';}
    $('endTable').innerHTML=h+`<tr class="tot"><td style="text-align:left">Total</td><td>${GAME.score}</td><td colspan=2></td></tr>`;
    $('endBest').textContent=GAME.newBest?'New best score!':(GAME.best?'Best: '+GAME.best:'');
    $('endLevel').textContent=levelLabel(GAME.levelDone)+' complete!'+(GAME.unlockedNew?'  Unlocked '+levelLabel(GAME.levelDone+1):'');
    $('bNext').textContent='LEVEL '+(GAME.levelDone+1)+' ▶';$('endO').style.display='flex';$('hud').style.display='none';}
};
