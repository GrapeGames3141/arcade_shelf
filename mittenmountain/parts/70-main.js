// ---------- 70-main: quality, camera, drawing, loop, menus, test API ----------
const QUALS={
  LOW:{scale:0.55,dpr:1,dens:0.55,snow:350,blur:0,ahead:150,budget:0},
  MEDIUM:{scale:0.8,dpr:1,dens:0.8,snow:700,blur:0,ahead:180,budget:0},
  HIGH:{scale:1,dpr:1.5,dens:1.0,snow:1200,blur:3.5,ahead:200,budget:2.0e6},
  MAX:{scale:1,dpr:4,dens:1.35,snow:2000,blur:5,ahead:230,budget:0},
};
const QORDER=['LOW','MEDIUM','HIGH','MAX'];
let qName='HIGH';try{qName=localStorage.getItem('mm_q')||(matchMedia('(pointer:coarse)').matches?'MEDIUM':'HIGH');}catch(e){}
if(!QUALS[qName])qName='HIGH';
const qm=location.search.match(/[?&]q=(\w+)/);if(qm&&QUALS[qm[1].toUpperCase()])qName=qm[1].toUpperCase();
let Q=QUALS[qName];
let snowModel=null;
function buildSnow(){if(snowModel)freeModel(snowModel);const sb=new SB(Q.snow);const box=[60,34,70];
  for(let i=0;i<Q.snow;i++)sb.add(Math.random()*box[0],Math.random()*box[1],Math.random()*box[2],0.05+Math.random()*0.05,PAL.white,0,1,0);snowModel=makeModel(sb);snowModel.box=box;}
function setQuality(n){qName=n;Q=QUALS[n];try{localStorage.setItem('mm_q',n);}catch(e){}clearChunks();buildSnow();
  const t='QUALITY: '+n;$('bQual2').textContent=t;$('bQual').textContent=n;}
function cycleQuality(){setQuality(QORDER[(QORDER.indexOf(qName)+1)%QORDER.length]);}

// ---- models used every frame
const yarnModels={},needleModels={},rampModels={},buttonModels={};
const mdl=(cache,key,fn)=>cache[key]||(cache[key]=fn());
let sledModel,backdropModel,archModel,partModel,partSB=new SB(600);

const SLED_SCALE=1.4;
// ---- camera
const CAM={eye:[0,3,10],tgt:[0,0,0],fov:62,vp:null,right:[1,0,0],up:[0,1,0]};
function updateCamera(dt,snap){
  const{fr,pos}=playerWorld();const k=P.stack.length;
  let eyeT,tgtT;
  if(GAME.mode==='menu'){const a=GAME.t*0.25;eyeT=v3.add(pos,[Math.sin(a)*4.2,1.9,Math.cos(a)*4.2]);tgtT=v3.add(pos,[0,0.8,0]);}
  else{const back=4.6+k*0.32,up=2.0+k*0.34;const sb=P.s-back;const frb=frame(sb);
    eyeT=v3.add(surf(sb,P.u*0.7,frb),[0,up+P.y*0.45,0]);tgtT=v3.add(v3.add(pos,v3.sc(fr.T,6)),[0,0.6+k*0.18,0]);}
  const f=snap?1:1-Math.exp(-dt*7);CAM.eye=v3.lerp(CAM.eye,eyeT,f);CAM.tgt=v3.lerp(CAM.tgt,tgtT,1-Math.exp(-dt*10)*(snap?0:1));
  CAM.fov=lerp(CAM.fov,58+Math.min(P.v,24)*0.45,1-Math.exp(-dt*3));
  let eye=CAM.eye;if(P.shake>0)eye=v3.add(eye,[(Math.random()-0.5)*P.shake*0.15,(Math.random()-0.5)*P.shake*0.15,0]);
  const asp=canvas.width/canvas.height;const fovY=asp<1?CAM.fov*Math.PI/180*1.25:CAM.fov*Math.PI/180;
  const V=M4.look(eye,CAM.tgt,[0,1,0]);CAM.vp=M4.mul(M4.persp(fovY,asp,0.1,1100),V);CAM.view=V;CAM.e=eye;
  CAM.right=[V[0],V[4],V[8]];CAM.up=[V[1],V[5],V[9]];
}
function project(p){const m=CAM.vp;const x=m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],y=m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return[x/w*0.5+0.5,y/w*0.5+0.5,w];}

function sledMatrix(){const{fr,pos}=playerWorld();const F=rotAxis(fr.T,fr.N,-P.yaw);const Up=rotAxis(fr.N,F,P.roll);const X=v3.cross(Up,F);
  return{M:M4.mul(M4.basis(X,Up,F,pos),M4.scale(SLED_SCALE)),F,Up,X,pos,fr};}
function itemBasis(it,facingUp){const fr=it.fr;return facingUp?[fr.R,fr.N,v3.sc(fr.T,-1)]:[v3.sc(fr.R,-1),fr.N,fr.T];}

function drawShadow(c,A,B,alpha){const s=R.shadow;gl.uniform3fv(s.u.uC,c);gl.uniform3fv(s.u.uA,A);gl.uniform3fv(s.u.uB,B);gl.uniform1f(s.u.uAlpha,alpha);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);}

function render(){
  // size
  const dpr=Math.min(devicePixelRatio||1,Q.dpr);let w=Math.round(innerWidth*dpr*Q.scale),h=Math.round(innerHeight*dpr*Q.scale);
  if(Q.budget&&w*h>Q.budget){const k=Math.sqrt(Q.budget/(w*h));w=Math.round(w*k);h=Math.round(h*k);}
  w=Math.max(64,w);h=Math.max(64,h);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  setupTargets(w,h);
  const time=GAME.t;const boil=Math.floor(time*12);const qt=boil/12;
  R.splatsDrawn=0;R.draws=0;
  gl.bindFramebuffer(gl.FRAMEBUFFER,R.msFB);gl.viewport(0,0,w,h);
  gl.clearColor(LIGHT.fog[0],LIGHT.fog[1],LIGHT.fog[2],1);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  // sky
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.useProgram(R.sky.p);gl.uniform3fv(R.sky.u.uTop,LIGHT.skyTop);gl.uniform3fv(R.sky.u.uHor,LIGHT.skyHor);
  const hp=project(v3.add(CAM.e,v3.add(v3.sc(v3.norm([CAM.tgt[0]-CAM.e[0],0,CAM.tgt[2]-CAM.e[2]]),500),[0,0,0])));gl.uniform1f(R.sky.u.uHorY,clamp(hp[1],-0.5,1.5));
  gl.bindVertexArray(R.emptyVao);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.depthFunc(gl.LEQUAL);gl.disable(gl.BLEND);
  gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  const cam={vp:CAM.vp,eye:CAM.e,right:CAM.right,up:CAM.up};
  beginSplats(cam,time);const su=R.splat.u;
  gl.uniform2f(su.uFog,180,900);
  drawModel(backdropModel,M4.trans(CAM.e[0],CAM.e[1]-32,CAM.e[2]));
  gl.uniform2f(su.uFog,85,Q.ahead+10);
  for(const m of CHUNKS.values())drawModel(m);
  drawModel(archModel);
  // ---- items
  const i0=lowerItem(P.s-15);
  const live=[];
  for(let i=i0;i<ITEMS.length;i++){const it=ITEMS[i];if(it.s>P.s+Q.ahead-10)break;live.push(it);}
  // shadows first (blended)
  gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  gl.useProgram(R.shadow.p);gl.uniformMatrix4fv(R.shadow.u.uVP,false,CAM.vp);gl.bindVertexArray(R.shVao);
  {const sm=sledMatrix();const ex=rampExtra(P.s,P.u)[0];const c=v3.add(surf(P.s,P.u,sm.fr),v3.sc(sm.fr.N,0.04+ex));const k=1/(1+(P.y-ex)*0.6);
    drawShadow(c,v3.sc(sm.X,(0.6+0.2*(1-k))*SLED_SCALE),v3.sc(sm.F,1.3*SLED_SCALE),0.55*k);}
  for(const it of live){if(!it.alive&&it.type!=='yarn')continue;const N=it.fr.N;
    if(it.type==='yarn'&&!it.hit)drawShadow(v3.add(it.pos,v3.sc(N,0.04)),v3.sc(it.fr.R,0.65),v3.sc(it.fr.T,0.65),0.5);
    else if(it.type==='pal')drawShadow(v3.add(it.pos,v3.sc(N,0.04)),v3.sc(it.fr.R,0.28),v3.sc(it.fr.T,0.24),0.5);
    else if(it.type==='button'&&it.h<1)drawShadow(v3.add(it.pos,v3.sc(N,0.04)),v3.sc(it.fr.R,0.2),v3.sc(it.fr.T,0.12),0.3);
    else if(it.type==='needle')drawShadow(v3.add(it.pos,v3.sc(N,0.04)),v3.sc(it.fr.R,0.9),v3.sc(it.fr.T,0.3),0.35);}
  gl.disable(gl.BLEND);gl.depthMask(true);gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  gl.useProgram(R.splat.p);
  for(const it of live){
    if(it.type==='yarn'){const m=mdl(yarnModels,it.col+(it.seed%3),()=>buildYarn(it.col,it.seed%3+1));const[X,Y,Z]=itemBasis(it,true);let p=it.pos;let M=M4.basis(X,Y,Z,p);
      if(it.hit){const t=Math.min(it.hit.t,3);const off=v3.add(v3.sc(it.fr.R,it.hit.dir*t*4.5),v3.sc(it.fr.N,Math.abs(Math.sin(t*5))*0.6*Math.exp(-t)));
        M=M4.mul(M4.basis(X,Y,Z,v3.add(p,off)),M4.mul(M4.trans(0,0.52,0),M4.mul(M4.rotZ(-it.hit.dir*t*8),M4.trans(0,-0.52,0))));}
      drawModel(m,M);}
    else if(it.type==='needle'){const m=mdl(needleModels,it.col,()=>buildNeedles(it.col));const[X,Y,Z]=itemBasis(it,true);drawModel(m,M4.basis(X,Y,Z,it.pos));}
    else if(it.type==='ramp'){const m=mdl(rampModels,it.col,()=>buildRamp(it.col));const[X,Y,Z]=itemBasis(it,false);drawModel(m,M4.basis(X,Y,Z,it.center));}
    else if(it.type==='button'&&it.alive){const m=mdl(buttonModels,it.col,()=>buildButton(it.col));const[X,Y,Z]=itemBasis(it,true);
      drawModel(m,M4.mul(M4.basis(X,Y,Z,v3.add(it.pos,v3.sc(it.fr.N,it.h+Math.sin(qt*3+it.s)*0.08))),M4.rotY(qt*2.5+it.s)),{boil,boilAmt:0.1});}
    else if(it.type==='pal'&&it.alive){const A=getAnimal(it.key,it.variant);const[X,Y,Z]=itemBasis(it,true);const w=it.wave;
      const near=it.s-P.s<25;const ex=near?1.6:1;
      drawAnimal(A,M4.mul(M4.basis(X,Y,Z,it.pos),M4.scale(SLED_SCALE)),{bob:Math.abs(Math.sin(qt*5*ex+w))*0.06,armL:2.3+Math.sin(qt*9+w)*0.6,armR:near?2.3+Math.sin(qt*9+w+1.5)*0.6:0.3,headTilt:Math.sin(qt*3+w)*0.15},boil);}
  }
  // ---- sled and riders
  const sm=sledMatrix();
  drawModel(sledModel,sm.M,{boil:Math.floor(time*6),boilAmt:0.05});
  const seats=[[0,0.1,0.35],[0,0.1,-0.2],[0,0.1,-0.72]];
  const riders=[{key:GAME.rider,variant:0,driver:true}].concat(P.stack);
  let towerX=0,towerY=0;
  riders.forEach((r,i)=>{
    let lp;if(i<3)lp=seats[i];else{const lvl=i-2;towerX+=Math.sin(P.lean*(1+lvl*0.45))*0.5;towerY+=0.5;lp=[towerX,0.1+towerY,-0.72];}
    const A=getAnimal(r.key,r.variant);
    const ang=P.air?2.6:(r.driver?0.7:(Math.sin(qt*4+i)>0.85?2.2:0.35));
    const pose={lean:P.lean*(i<3?0.6:1+(i-2)*0.4),bob:(P.air?0.05:0)+(GAME.mode==='menu'?Math.abs(Math.sin(qt*4+i))*0.04:0),armL:ang,armR:r.driver&&!P.air?0.7:ang,headTilt:Math.sin(qt*2+i)*0.08,
      tint:P.inv>0&&Math.floor(time*16)%2?0.35:0,tintCol:[1,1,1]};
    let M=M4.mul(sm.M,M4.trans(lp[0],lp[1],lp[2]));
    if(r.hop!==undefined&&r.hop<1){const t=r.hop;const tgt=M4.apply(M,[0,0,0]);const p=v3.add(v3.lerp(r.from,tgt,t),[0,Math.sin(t*Math.PI)*1.6,0]);
      M=M4.basis([M[0],M[1],M[2]],[M[4],M[5],M[6]],[M[8],M[9],M[10]],p);}
    drawAnimal(A,M,pose,boil);
  });
  // flyers
  for(const f of FLYERS){if(f.t>12)continue;const A=getAnimal(f.key,f.variant);const fr=frame(-f.pos[2]);
    let M=M4.mul(M4.basis(fr.R,[0,1,0],v3.sc(fr.T,-1),f.pos),M4.scale(SLED_SCALE));if(!f.landed)M=M4.mul(M,M4.mul(M4.trans(0,0.3,0),M4.mul(M4.rotX(f.spin),M4.trans(0,-0.3,0))));
    drawAnimal(A,M,{armL:2.5+Math.sin(qt*10)*0.4,armR:2.5+Math.sin(qt*10+1)*0.4,bob:f.landed?Math.abs(Math.sin(qt*6))*0.05:0},boil);}
  // particles
  partSB.n=0;for(const q of PARTS_P){const k=1-q.t/q.life;partSB.add(q.p[0],q.p[1],q.p[2],q.s*(0.4+0.6*k),q.col,0,1,0,false,(q.s*97)%1);}
  if(partSB.n){updateModel(partModel,partSB);drawModel(partModel,null,{boil,boilAmt:0.2});}
  // snowfall
  gl.uniform1i(su.uMode,1);gl.uniform3fv(su.uBox,snowModel.box);drawModel(snowModel,null,{boil,boilAmt:0.3});gl.uniform1i(su.uMode,0);
  gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  // resolve + post
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,R.msFB);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,R.resFB);gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.COLOR_BUFFER_BIT,gl.NEAREST);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);gl.disable(gl.DEPTH_TEST);
  gl.useProgram(R.post.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,R.resTex);gl.uniform1i(R.post.u.uTex,0);gl.uniform2f(R.post.u.uRes,w,h);
  const fp=project(v3.add(sm.pos,[0,0.6,0]));gl.uniform1f(R.post.u.uFocusY,clamp(fp[1],0.1,0.9));gl.uniform1f(R.post.u.uBlur,Q.blur*h/900);
  gl.bindVertexArray(R.emptyVao);gl.drawArrays(gl.TRIANGLES,0,3);
}
function lowerItem(s){let lo=0,hi=ITEMS.length;while(lo<hi){const m=(lo+hi)>>1;if(ITEMS[m].s<s)lo=m+1;else hi=m;}return lo;}

// ---- loop
let last=performance.now(),acc=0,fpsS=0,fpsN=0,fps=60,paused=false;
function frameLoop(now){
  const dt=Math.min(0.05,(now-last)/1000);last=now;
  fpsS+=dt;fpsN++;if(fpsS>0.5){fps=fpsN/fpsS;fpsS=0;fpsN=0;if(GAME.mode==='run')$('bQual').textContent=qName+' '+Math.round(fps);}
  if(GAME.mode!=='pause')tick(dt);
  updateChunks(P.s,Q.ahead,Q.dens,GAME.mode==='menu'?3:1);
  updateCamera(dt);render();HUD.update();Sfx.update(dt);
  requestAnimationFrame(frameLoop);
}
function tick(dt){
  GAME.t+=dt;
  readInput();
  if(GAME.auto&&(GAME.mode==='run'))autopilot(INP);
  if(GAME.mode==='count'){const before=Math.ceil(GAME.countT);GAME.countT-=dt;const now=Math.ceil(GAME.countT);
    const el=$('count');if(GAME.countT<=0){GAME.mode='run';el.textContent='GO!';Sfx.tick(1);setTimeout(()=>{el.style.display='none';},600);}
    else if(now!==before){el.textContent=now;el.style.display='flex';Sfx.tick(0);}}
  if(GAME.mode==='run'||GAME.mode==='finish'||GAME.mode==='ended'){acc+=dt;const h=1/120;
    while(acc>=h){stepPhysics(h,GAME.mode==='ended'?{steer:0,push:0,brake:1}:INP);acc-=h;}}
  stepParticles(dt);
}
// ---- menus
let selRider='bunny';try{selRider=localStorage.getItem('mm_rider')||'bunny';}catch(e){}
function buildMenu(){const box=$('riders');box.innerHTML='';
  for(const k of RIDERS){const d=document.createElement('div');d.className='rider felt'+(k===selRider?' sel':'');d.innerHTML=`<span class="em">${SPECIES[k].em}</span>${SPECIES[k].name}`;
    d.onclick=()=>{selRider=k;GAME.rider=k;try{localStorage.setItem('mm_rider',k);}catch(e){}buildMenu();Sfx.unlock();};box.appendChild(d);}
  let b=0;try{b=+localStorage.getItem('mm_best')||0;}catch(e){}$('bestLine').textContent=b?'Best score: '+b:'';
  if(touchMode)$('ctlHint').innerHTML='Left thumb: drag to steer, push up to go faster, pull down to brake · Right side: JUMP<br>Every pal on your sled multiplies button points. Bonking a yarn ball knocks the top pal off.';
}
function startRun(){Sfx.unlock();GAME.rider=selRider;resetRun();GAME.mode='count';GAME.countT=3.0;['menu','endO','pauseO'].forEach(i=>$(i).style.display='none');$('hud').style.display='block';
  HUD.stack();showTouch();updateCamera(0,true);$('bQual').textContent=qName;const el=$('count');el.textContent='3';el.style.display='flex';Sfx.tick(0);}
function pauseGame(){if(GAME.mode!=='run'&&GAME.mode!=='count')return;GAME.prevMode=GAME.mode;GAME.mode='pause';$('pauseO').style.display='flex';showTouch();}
function resumeGame(){if(GAME.mode!=='pause')return;GAME.mode=GAME.prevMode||'run';$('pauseO').style.display='none';showTouch();last=performance.now();}
function toMenu(){GAME.mode='menu';resetRun();['endO','pauseO','hud'].forEach(i=>$(i).style.display='none');$('menu').style.display='flex';$('count').style.display='none';buildMenu();showTouch();}
function soundToggle(){Sfx.unlock();Sfx.setOn(!Sfx.on);const t=Sfx.on?'SOUND ON':'SOUND OFF';$('bSound').textContent=t;$('bSound2').textContent=t;try{localStorage.setItem('mm_snd',Sfx.on?1:0);}catch(e){}}
$('bGo').onclick=startRun;$('bAgain').onclick=startRun;$('bRestart').onclick=startRun;$('bMenu').onclick=toMenu;$('bMenu2').onclick=toMenu;$('bResume').onclick=resumeGame;
$('bPause').onclick=()=>GAME.mode==='pause'?resumeGame():pauseGame();
$('bQual').onclick=cycleQuality;$('bQual2').onclick=cycleQuality;$('bSound').onclick=soundToggle;$('bSound2').onclick=soundToggle;
try{if(localStorage.getItem('mm_snd')==='0'){Sfx.on=false;$('bSound').textContent=$('bSound2').textContent='SOUND OFF';}}catch(e){}
addEventListener('blur',()=>{if(GAME.mode==='run')pauseGame();});

// ---- boot
GAME.palsTotal=genCourse();
sledModel=buildSled();backdropModel=buildBackdrop();archModel=buildArches();partModel=makeModel(partSB,true);
for(const k of RIDERS)getAnimal(k,0);
setQuality(qName);resetRun();GAME.rider=selRider;buildMenu();
updateChunks(P.s,Q.ahead,Q.dens,99);updateCamera(0,true);
requestAnimationFrame(frameLoop);

// ---- headless test API
window.MM={
  state:()=>({mode:GAME.mode,s:+P.s.toFixed(2),u:+P.u.toFixed(2),v:+P.v.toFixed(2),y:+P.y.toFixed(2),air:P.air,stack:P.stack.map(p=>p.key),score:GAME.score,buttons:GAME.buttons,
    bonks:GAME.bonks,bigAirs:GAME.bigAirs,airScore:GAME.airScore,time:+GAME.runT.toFixed(2),finishT:GAME.finishT,fps:Math.round(fps),splats:R.splatsDrawn,draws:R.draws,chunks:CHUNKS.size,
    quality:qName,items:ITEMS.length,pals:GAME.palsTotal,canvas:[canvas.width,canvas.height]}),
  start(rider,skipCount){if(rider)selRider=rider;startRun();if(skipCount){GAME.mode='run';GAME.countT=0;$('count').style.display='none';}},
  auto(on){GAME.auto=on;},
  sim(seconds,dt){dt=dt||1/120;const n=Math.round(seconds/dt);for(let i=0;i<n;i++){if(GAME.auto)autopilot(INP);if(GAME.mode==='run'||GAME.mode==='finish')stepPhysics(dt,INP);stepParticles(dt);GAME.t+=dt;}return MM.state();},
  teleport(s,u){P.s=s;P.u=u||0;P.vu=0;updateChunks(P.s,Q.ahead,Q.dens,99);updateCamera(0,true);},
  input(o){Object.assign(INP,o);},
  quality:setQuality,
  items:()=>ITEMS.map(i=>({type:i.type,s:+i.s.toFixed(1),u:+i.u.toFixed(1)})),
  frame(){updateChunks(P.s,Q.ahead,Q.dens,99);updateCamera(1/60,true);render();return MM.state();},
  menu:toMenu,
};
