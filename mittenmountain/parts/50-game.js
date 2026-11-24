// ---------- 50-game: course items, sled physics, scoring ----------
const G=9.8;
const RIDERS=['bunny','penguin','fox'];
const PAL_KEYS=['otter','chick','bear','mouse','frog','bunny','penguin','fox'];
const ANIMALS={};
const MODELS={};
function getAnimal(key,variant){const id=key+':'+variant;if(!ANIMALS[id])ANIMALS[id]=buildAnimal(key,SCARF_COLS[variant%SCARF_COLS.length]);return ANIMALS[id];}

// ---- course items (fixed seed so every run is the same mountain)
let ITEMS=[];
function genCourse(level){
  level=level||1;const D=diffFor(level);
  const rnd=mulberry(20261122+level*977);ITEMS=[];const hw=TR.hw;
  const add=(type,s,u,extra)=>{const fr=frame(s);const it=Object.assign({type,s,u,alive:true,pos:surf(s,u,fr),fr},extra||{});ITEMS.push(it);return it;};
  let s=45,palCount=0,lastPal=0;
  const yarnCols=['#e07aa0','#3f8f93','#e2aa3c','#b19ad0','#cf4a42','#7fa36b'];const btnCols=['#cf4a42','#3f8f93','#e2aa3c','#4f8a5b','#e07aa0','#304468'];
  const W=[['mogul',D.mogulW],['ramp',D.rampW],['snake',D.snakeW],['needle',D.needleW],['slalom',D.slalomW]];const Wsum=W.reduce((a,w)=>a+w[1],0);
  while(s<TR.L-45){
    const diff=s/TR.L;
    if(s-lastPal>55&&rnd()<D.palP){
      const u=(rnd()-0.5)*2*(hw-1.0);add('pal',s,u,{key:PAL_KEYS[palCount%PAL_KEYS.length],variant:palCount,wave:rnd()*6});palCount++;lastPal=s;
      for(let k=1;k<=3;k++)add('button',s-k*3,u*(1-k*0.2),{col:btnCols[(k+palCount)%btnCols.length],h:0.55});
      s+=14;continue;}
    let r=rnd()*Wsum,kind='snake';for(const[k,w]of W){if(r<w){kind=k;break;}r-=w;}
    if(kind==='mogul'){ // yarn moguls: few and spread out on early levels
      const n=D.mogulMin+Math.floor(rnd()*(D.mogulMax-D.mogulMin+1+diff*D.d*0.5));
      for(let k=0;k<n;k++){const u=(rnd()-0.5)*2*(hw-0.8);add('yarn',s+k*D.mogulGap+rnd()*2,u,{col:yarnCols[Math.floor(rnd()*yarnCols.length)],seed:Math.floor(rnd()*99)});}
      s+=n*D.mogulGap+10;
    }else if(kind==='ramp'){
      const u=(rnd()-0.5)*2*(hw-1.6);const fr=frame(s);const lenS=RAMP.len/fr.arc;
      add('ramp',s,u,{lenS,col:['#cf4a42','#3f8f93','#80507a','#4f8a5b'][Math.floor(rnd()*4)],center:surf(s+lenS/2,u)});
      for(let k=0;k<5;k++){const t=k/4;add('button',s+lenS+3+t*11,u,{col:btnCols[k%btnCols.length],h:1.6+Math.sin(t*Math.PI)*2.2});}
      s+=lenS+26;
    }else if(kind==='snake'){
      const ph=rnd()*6;for(let k=0;k<8;k++)add('button',s+k*2.6,Math.sin(ph+k*0.55)*(hw-1.2),{col:btnCols[k%btnCols.length],h:0.55});
      s+=26;
    }else if(kind==='needle'){
      const side=rnd()<0.5?-1:1;add('needle',s,side*(hw-1.3),{col:['#b19ad0','#7fa36b','#e07aa0'][Math.floor(rnd()*3)]});
      if(D.needleDouble&&diff>0.3)add('needle',s+0.01,side*(hw-3.4),{col:'#e2aa3c'});
      add('button',s,-side*(hw-1.5),{col:'#e2aa3c',h:0.55});
      s+=18;
    }else{ // slalom
      const n=3+Math.min(3,Math.floor(D.d/2));for(let k=0;k<n;k++)add('yarn',s+k*7,(k%2?1:-1)*(1.0+rnd()*1.5),{col:yarnCols[k%yarnCols.length],seed:k+Math.floor(s)});
      s+=n*7+12;
    }
  }
  ITEMS.sort((a,b)=>a.s-b.s);
  return palCount;
}
function rampExtra(s,u){ // ground offset from ramps
  let e=0,slope=0;
  for(const it of ITEMS){if(it.s>s+1)break;if(it.type!=='ramp')continue;if(s<it.s||s>it.s+it.lenS)continue;if(Math.abs(u-it.u)>RAMP.w/2)continue;
    const f=(s-it.s)/it.lenS;const h=f*RAMP.h;if(h>e){e=h;slope=RAMP.h/RAMP.len;}}
  return[e,slope];
}

// ---- run state
const GAME={mode:'menu',t:0,runT:0,rider:'bunny',score:0,buttons:0,airScore:0,bonks:0,bigAirs:0,palsTotal:0,finishT:0,best:0,auto:false,countT:0};
const P={};
const FLYERS=[];const PARTS_P=[];
function resetRun(){
  Object.assign(P,{s:6,u:0,v:0,vu:0,y:0,vy:0,air:false,airT:0,coyote:0,inv:0,stack:[],lean:0,leanV:0,yaw:0,roll:0,shake:0,jumpBuf:0,inSnow:false,lastAu:0});
  for(const it of ITEMS){it.alive=true;delete it.taken;delete it.hit;delete it.fly;}
  ITEMS=ITEMS.filter(it=>!it.dropped);
  FLYERS.length=0;PARTS_P.length=0;CELEB.on=false;CELEB.t=0;
  Object.assign(GAME,{runT:0,score:0,buttons:0,airScore:0,bonks:0,bigAirs:0,finishT:0,ended:false});
}
function playerWorld(){const fr=frame(P.s);return{fr,pos:v3.add(surf(P.s,P.u,fr),v3.sc(fr.N,P.y))};}

function popup(txt,big){HUD.pop(txt,big);}

function stepPhysics(dt,inp){
  const fr=frame(P.s);const hw=TR.hw;
  const steer=clamp(inp.steer,-1,1);
  P.inSnow=Math.abs(P.u)>hw+0.05;
  const finished=GAME.mode==='finish';
  // forward
  let a=G*fr.grade;
  if(!P.air)a-=(P.inSnow?0.55:0.03)*G*Math.sign(P.v);
  a-=0.0042*P.v*P.v;
  if(!finished&&inp.push>0&&P.v<17&&!P.air)a+=3.4*inp.push;
  if((inp.brake>0||finished)&&!P.air)a-=(finished?6:7.5)*Math.max(inp.brake,finished?1:0);
  P.v=Math.max(0,P.v+a*dt);
  // lateral
  let au=steer*(P.air?3.5:(P.inSnow?7:13.5))*(finished?0.3:1);
  au+=-P.v*P.v*fr.kap*0.75;
  if(!P.air)au+=-G*profileSlope(P.u)*(P.inSnow?1:1.6);
  P.lastAu=au;
  P.vu+=au*dt;P.vu*=Math.exp(-(P.air?0.4:2.6)*dt);
  P.u+=P.vu*dt;
  if(Math.abs(P.u)>12.5){P.u=Math.sign(P.u)*12.5;P.vu=0;}
  P.s+=P.v*dt/fr.arc;
  // vertical (ramps and jumps)
  const[ex,rs]=rampExtra(P.s,P.u);
  P.jumpBuf=Math.max(0,P.jumpBuf-dt);if(inp.jumpPress){P.jumpBuf=0.15;inp.jumpPress=false;}
  if(!P.air){
    P.coyote=0.1;
    if(ex<P.y-0.08&&P.y>0.25){P.air=true;P.vy=P.v*rs*0.95+1.5;P.airT=0;Sfx.whoosh();}
    else{P.vy=0;P.y=ex;}
  }else P.coyote=Math.max(0,P.coyote-dt);
  if(P.jumpBuf>0&&(!P.air||P.coyote>0)&&!finished){P.air=true;P.vy=Math.max(P.vy,0)+6.2;P.airT=0;P.coyote=0;P.jumpBuf=0;Sfx.jump();}
  if(P.air){P.vy-=13.5*dt;P.y+=P.vy*dt;P.airT+=dt;
    if(P.y<=ex&&P.vy<=0){P.y=ex;P.air=false;
      if(P.airT>0.75){const pts=Math.round((P.airT-0.5)*60)*(1+P.stack.length);GAME.airScore+=pts;GAME.score+=pts;
        if(P.airT>1.35){GAME.bigAirs++;popup('BIG AIR! +'+pts,true);}else popup('AIR +'+pts);}
      P.shake=Math.min(1,P.airT*0.4);spawnPuff(playerWorld().pos,10,PAL.snow,2.5);Sfx.land(P.airT);P.airT=0;}}
  // tower wobble spring
  P.leanV+=(-55*P.lean-5*P.leanV-au*0.06+(P.shake>0?(Math.random()-0.5)*P.shake*4:0))*dt;P.lean+=P.leanV*dt;
  P.yaw=lerp(P.yaw,clamp(Math.atan2(P.vu,Math.max(P.v,2))*0.8,-0.6,0.6),1-Math.exp(-8*dt));
  P.roll=lerp(P.roll,-steer*0.12-P.vu*0.01,1-Math.exp(-6*dt));
  P.shake=Math.max(0,P.shake-dt*2);P.inv=Math.max(0,P.inv-dt);
  if(P.inSnow&&P.v>3&&Math.random()<dt*25)spawnPuff(playerWorld().pos,2,PAL.snow,1.5);
  if(!P.air&&Math.abs(steer)>0.6&&P.v>9&&Math.random()<dt*30)spawnPuff(playerWorld().pos,1,PAL.snow,1.2);
  collide();
  // finish
  if(GAME.mode==='run'){GAME.runT+=dt;if(P.s>=TR.L)finishRun();}
  if(GAME.mode==='finish'&&!CELEB.on&&(P.v<0.8||GAME.runT>0&&performance.now()-GAME.finishWall>6000))startCelebration();
  if(CELEB.on)CELEB.t+=dt;
}
function collide(){
  const pw=playerWorld().pos;
  for(const it of ITEMS){if(it.s<P.s-6)continue;if(it.s>P.s+6)break;if(!it.alive)continue;
    const d=v3.sub(it.pos,pw);
    if(it.type==='button'){const bp=v3.add(it.pos,v3.sc(it.fr.N,it.h));const dd=v3.len(v3.sub(bp,v3.add(pw,v3.sc(it.fr.N,0.6))));
      if(dd<1.15){it.alive=false;const pts=10*(1+P.stack.length);GAME.score+=pts;GAME.buttons++;Sfx.button(P.stack.length);HUD.flashScore();
        spawnPuff(bp,6,hex(it.col),1.6);}}
    else if(it.type==='pal'){const dh=Math.hypot(d[0],d[2]);if(dh<1.4&&P.y<1.2){it.alive=false;
        if(P.stack.length>=8){popup('SLED FULL!');it.alive=true;continue;}
        P.stack.push({key:it.key,variant:it.variant,hop:0,from:it.pos.slice(),item:it});popup('+ '+SPECIES[it.key].name.toUpperCase()+'!');Sfx.pickup(P.stack.length);HUD.stack();}}
    else if(it.type==='yarn'||it.type==='needle'){
      const rad=it.type==='yarn'?0.95:0.95,hgt=it.type==='yarn'?1.05:9;
      const lat=Math.abs(v3.dot(d,it.fr.R)),lon=Math.abs(v3.dot(d,it.fr.T));
      if(lat<rad&&lon<0.9&&P.y<hgt&&P.inv<=0){bonk(it);}
      else if(it.type==='yarn'&&lat<rad&&lon<0.9&&P.y>=hgt&&!it.cleared){it.cleared=true;const pts=15*(1+P.stack.length);GAME.score+=pts;popup('HOP! +'+pts);}
    }
  }
}
function bonk(it){
  P.inv=1.2;P.v*=0.45;P.vu=-Math.sign(it.u-P.u||1)*4;P.shake=1;GAME.bonks++;Sfx.bonk();
  spawnPuff(it.pos,14,hex(it.col||'#e07aa0'),3);
  if(it.type==='yarn'){it.hit={t:0,dir:Math.sign(P.u-it.u)||1};}
  if(P.stack.length){const top=P.stack.pop();const{fr,pos}=playerWorld();
    FLYERS.push({key:top.key,variant:top.variant,pos:v3.add(pos,v3.sc(fr.N,1.2+P.stack.length*0.5)),vel:v3.add(v3.add(v3.sc(fr.T,P.v*0.6+2),v3.sc(fr.N,6)),v3.sc(fr.R,(Math.random()-0.5)*8)),spin:0,t:0});
    popup('BONK! '+SPECIES[top.key].name+' fell off');HUD.stack();}
  else popup('BONK!');
}
function finishRun(){
  GAME.mode='finish';GAME.finishT=GAME.runT;
  const pals=P.stack.length;const palPts=pals*150;const timeBonus=Math.max(0,Math.round((110-GAME.runT)*10));
  GAME.palPts=palPts;GAME.timeBonus=timeBonus;GAME.score+=palPts+timeBonus;
  try{const key='mm_best_'+LV.level;const b=+localStorage.getItem(key)||0;GAME.best=b;if(GAME.score>b){localStorage.setItem(key,GAME.score);GAME.newBest=true;}else GAME.newBest=false;}catch(e){}
  GAME.finishWall=performance.now();GAME.levelDone=LV.level;
  if(LV.level>=LV.unlocked){LV.unlocked=LV.level+1;GAME.unlockedNew=true;}else GAME.unlockedNew=false;saveLevels();
  popup('FINISH!',true);Sfx.fanfare();
}
// ---- particles (felt puffs)
function spawnPuff(p,n,col,spd){for(let i=0;i<n;i++){if(PARTS_P.length>500)PARTS_P.shift();
  PARTS_P.push({p:p.slice(),v:[(Math.random()-0.5)*spd,Math.random()*spd*0.9+0.5,(Math.random()-0.5)*spd],t:0,life:0.5+Math.random()*0.5,col,s:0.06+Math.random()*0.08});}}
function stepParticles(dt){
  for(const q of PARTS_P){q.t+=dt;if(q.slow){q.v[1]-=(q.col[0]>0.9&&q.col[1]>0.9?-0.25:1.0)*dt;q.v[0]+=Math.sin(q.t*4+q.s*50)*dt*0.6;}else q.v[1]-=6*dt;q.p=v3.mad(q.p,q.v,dt);}
  while(PARTS_P.length&&PARTS_P[0].t>PARTS_P[0].life)PARTS_P.shift();
  for(let i=PARTS_P.length-1;i>=0;i--)if(PARTS_P[i].t>PARTS_P[i].life)PARTS_P.splice(i,1);
  for(const f of FLYERS){f.t+=dt;if(f.landed)continue;f.vel[1]-=12*dt;f.pos=v3.mad(f.pos,f.vel,dt);f.spin+=dt*9;
    // land on the snow: find rough s from z
    const s=-f.pos[2];const ground=surf(s,v3.dot(v3.sub(f.pos,frame(s).C),frame(s).R));if(f.pos[1]<ground[1]&&f.vel[1]<0){f.landed=true;f.pos=ground;spawnPuff(ground,8,PAL.snow,2);}}
  for(const it of ITEMS)if(it.hit){it.hit.t+=dt;}
  for(const r of P.stack)if(r.hop<1)r.hop=Math.min(1,r.hop+dt*2.8);
}
// ---- simple autopilot used by headless tests (and a demo)
function autopilot(inp){
  let target=0,best=-1e9,danger=null;
  for(const it of ITEMS){if(it.s<P.s+1)continue;if(it.s>P.s+30)break;if(!it.alive)continue;const dist=it.s-P.s;
    if(it.type==='pal'||(it.type==='button'&&it.h<1)){const w=(it.type==='pal'?60:8)-dist;if(w>best){best=w;target=it.u;}}
    if((it.type==='yarn'||it.type==='needle')&&dist<14&&Math.abs(it.u-P.u)<1.7&&(!danger||dist<danger.s-P.s))danger=it;
    if(it.type==='ramp'&&dist<20&&best<0){target=it.u;best=0;}}
  if(danger){const side=danger.u>P.u?-1:1;target=danger.u+side*2.4;if(Math.abs(target)>TR.hw-0.4)target=danger.u-side*2.4;
    if(danger.type==='yarn'&&danger.s-P.s<P.v*0.32&&Math.abs(danger.u-P.u)<1)inp.jumpPress=true;}
  target=clamp(target,-TR.hw+0.5,TR.hw-0.5);
  const err=target-P.u;inp.steer=clamp(err*0.9-P.vu*0.35,-1,1);inp.push=P.v<15?1:0;inp.brake=0;
}
