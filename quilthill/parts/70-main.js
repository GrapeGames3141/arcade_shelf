// ---------- 70-main: quality, camera, drawing, loop, menus, test API ----------
LIGHT.fog=hex('#e9eee6');LIGHT.skyHor=hex('#f1f2e8');LIGHT.skyTop=hex('#8fbfe6');LIGHT.sunCol=[0.54,0.5,0.42];LIGHT.sky=[0.5,0.55,0.64];LIGHT.ground=[0.56,0.54,0.52];
const QUALS={
  LOW:{scale:0.55,dpr:1,dens:0.5,blur:0,ahead:130,budget:0},
  MEDIUM:{scale:0.8,dpr:1,dens:0.75,blur:0,ahead:160,budget:0},
  HIGH:{scale:1,dpr:1.5,dens:0.85,blur:2.5,ahead:160,budget:2.0e6},
  MAX:{scale:1,dpr:4,dens:1.35,blur:3.5,ahead:210,budget:0},
};
const QORDER=['LOW','MEDIUM','HIGH','MAX'];
let qName='HIGH';try{qName=localStorage.getItem('qh_q')||(matchMedia('(pointer:coarse)').matches?'MEDIUM':'HIGH');}catch(e){}
const qm=location.search.match(/[?&]q=(\w+)/);if(qm&&QUALS[qm[1].toUpperCase()])qName=qm[1].toUpperCase();
if(!QUALS[qName])qName='HIGH';let Q=QUALS[qName];
function setQuality(n){qName=n;Q=QUALS[n];try{localStorage.setItem('qh_q',n);}catch(e){}clearChunks();$('bQual2').textContent='QUALITY: '+n;$('bQual').textContent=n;}
function cycleQuality(){setQuality(QORDER[(QORDER.indexOf(qName)+1)%QORDER.length]);}

const bobModels={},bladeModels={},bumpModels={};const mdl=(c,k,f)=>c[k]||(c[k]=f());
let ballModel,standModel,backdropModel,landModel,partModel,partSB=new SB(700);

const CAM={eye:[0,3,8],tgt:[0,0,0],fov:62,vp:null,right:[1,0,0],up:[0,1,0]};
function updateCamera(dt,snap){
  const c=ballCenter();let eyeT,tgtT;
  if(GAME.mode==='menu'){const a=GAME.t*0.3;eyeT=[c[0]+Math.sin(a)*3.0,c[1]+1.6,c[2]+Math.cos(a)*3.0];tgtT=[c[0],c[1]-0.1,c[2]];}
  else{const f=P.heading;const back=6.2,ex=P.x-f[0]*back,es=P.s-f[1]*back;const ground=Math.max(H(ex,es),H(lerp(P.x,ex,0.5),lerp(P.s,es,0.5)));
    eyeT=[ex,Math.max(ground,P.y)+3.0+(P.air?0.3:0),-es];tgtT=[P.x+f[0]*6,P.y+0.2,-(P.s+f[1]*6)];}
  const k=snap?1:1-Math.exp(-dt*6);CAM.eye=v3.lerp(CAM.eye,eyeT,k);CAM.tgt=v3.lerp(CAM.tgt,tgtT,snap?1:1-Math.exp(-dt*9));
  const sp=Math.hypot(P.vx,P.vs);CAM.fov=lerp(CAM.fov,58+Math.min(sp,22)*0.5,1-Math.exp(-dt*3));
  let eye=CAM.eye;if(P.shake>0)eye=v3.add(eye,[(Math.random()-0.5)*P.shake*0.15,(Math.random()-0.5)*P.shake*0.15,0]);
  const asp=canvas.width/canvas.height;const fovY=(asp<1?1.25:1)*CAM.fov*Math.PI/180;
  const V=M4.look(eye,CAM.tgt,[0,1,0]);CAM.vp=M4.mul(M4.persp(fovY,asp,0.1,1100),V);CAM.e=eye;CAM.right=[V[0],V[4],V[8]];CAM.up=[V[1],V[5],V[9]];
}
function project(p){const m=CAM.vp;const x=m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],y=m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return[x/w*0.5+0.5,y/w*0.5+0.5,w];}
function drawShadow(c,A,B,a){const s=R.shadow;gl.uniform3fv(s.u.uC,c);gl.uniform3fv(s.u.uA,A);gl.uniform3fv(s.u.uB,B);gl.uniform1f(s.u.uAlpha,a);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);}
function lowerItem(s){let lo=0,hi=ITEMS.length;while(lo<hi){const m=(lo+hi)>>1;if(ITEMS[m].s<s)lo=m+1;else hi=m;}return lo;}

function render(){
  const dpr=Math.min(devicePixelRatio||1,Q.dpr);let w=Math.round(innerWidth*dpr*Q.scale),h=Math.round(innerHeight*dpr*Q.scale);
  if(Q.budget&&w*h>Q.budget){const k=Math.sqrt(Q.budget/(w*h));w=Math.round(w*k);h=Math.round(h*k);}w=Math.max(64,w);h=Math.max(64,h);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}setupTargets(w,h);
  const time=GAME.t,boil=Math.floor(time*12),qt=boil/12;R.splatsDrawn=0;R.draws=0;
  gl.bindFramebuffer(gl.FRAMEBUFFER,R.msFB);gl.viewport(0,0,w,h);gl.clearColor(LIGHT.fog[0],LIGHT.fog[1],LIGHT.fog[2],1);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.useProgram(R.sky.p);gl.uniform3fv(R.sky.u.uTop,LIGHT.skyTop);gl.uniform3fv(R.sky.u.uHor,LIGHT.skyHor);
  const fw=v3.norm([CAM.tgt[0]-CAM.e[0],0,CAM.tgt[2]-CAM.e[2]]);gl.uniform1f(R.sky.u.uHorY,clamp(project(v3.add(CAM.e,v3.sc(fw,500)))[1],-0.5,1.5));
  gl.bindVertexArray(R.emptyVao);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.depthFunc(gl.LEQUAL);gl.disable(gl.BLEND);gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  beginSplats({vp:CAM.vp,eye:CAM.e,right:CAM.right,up:CAM.up},time);const su=R.splat.u;
  gl.uniform2f(su.uFog,180,900);drawModel(backdropModel,M4.trans(CAM.e[0],CAM.e[1]-34,CAM.e[2]));
  gl.uniform2f(su.uFog,80,Q.ahead+10);
  for(const m of CHUNKS.values())drawModel(m);
  drawModel(landModel);
  const live=[];for(let i=lowerItem(P.s-15);i<ITEMS.length;i++){const it=ITEMS[i];if(it.s>P.s+Q.ahead-10)break;live.push(it);}
  // blob shadows
  gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  gl.useProgram(R.shadow.p);gl.uniformMatrix4fv(R.shadow.u.uVP,false,CAM.vp);gl.bindVertexArray(R.shVao);
  {const gh=H(P.x,P.s);const k=1/(1+(P.y-gh)*0.5);const n=normalAt(P.x,P.s);const A=v3.norm(v3.cross(n,[0,0,1])),B=v3.cross(A,n);
    drawShadow(v3.add([P.x,gh,-P.s],v3.sc(n,0.1)),v3.sc(A,0.6),v3.sc(B,0.6),0.55*k);}
  for(const it of live){if(!it.alive)continue;const p=[it.x,it.y+0.08,-it.s];
    if(it.type==='bobbin'&&it.h<1.2)drawShadow(p,[0.3,0,0],[0,0,0.3],0.35);
    else if(it.type==='bumper')drawShadow(p,[1.15,0,0],[0,0,1.15],0.4);
    else if(it.type==='scissors')drawShadow(v3.add(p,[it.dir*1.6,0,0]),[2.6,0,0],[0,0,0.8],0.35);}
  gl.disable(gl.BLEND);gl.depthMask(true);gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);gl.useProgram(R.splat.p);
  for(const it of live){if(!it.alive)continue;
    if(it.type==='bobbin'){const m=mdl(bobModels,it.col,()=>buildBobbin(it.col));const y=it.y+it.h+Math.sin(qt*3+it.s)*0.08;
      drawModel(m,M4.mul(M4.trans(it.x,y,-it.s),M4.mul(M4.rotY(qt*2+it.s),M4.rotZ(0.25))),{boil,boilAmt:0.12});}
    else if(it.type==='bumper'){const m=mdl(bumpModels,it.col,()=>buildBumper(it.col));const sq=1+Math.sin(it.squish*Math.PI*3)*0.15*it.squish;
      const M=M4.mul(M4.trans(it.x,it.y,-it.s),M4.basis([sq,0,0],[0,1/sq,0],[0,0,sq],[0,0,0]));drawModel(m,M,{boil,boilAmt:0.06});}
    else if(it.type==='scissors'){const o=scissorOpen(it,qt);let half=0.04+o*0.5;if(it.snapT&&GAME.t-it.snapT<0.3)half=0.0;
      const L=mdl(bladeModels,it.col+'L',()=>buildBlade(it.col,-1)),Rm=mdl(bladeModels,it.col+'R',()=>buildBlade(it.col,1));
      const base=M4.mul(M4.mul(M4.mul(M4.trans(it.x,it.y+0.75,-it.s),M4.rotY(it.dir*Math.PI/2)),M4.rotZ(1.25)),M4.scale(1.8));
      drawModel(L,M4.mul(base,M4.rotY(-half)),{boil,boilAmt:0.05});drawModel(Rm,M4.mul(base,M4.mul(M4.trans(0,0.07,0),M4.rotY(half))),{boil,boilAmt:0.05});}
  }
  // hedgehog
  const c=ballCenter();const opt={boil,boilAmt:0.14,tint:P.inv>0&&Math.floor(time*16)%2?0.35:0,tintCol:[1,1,1]};
  if(P.curl>0.5){const k=0.85+0.15*P.curl;const R3=P.rot;drawModel(ballModel,M4.mul(M4.basis(R3[0],R3[1],R3[2],c),M4.scale(k)),opt);}
  else{const f=GAME.mode==='menu'?[0,1]:[-P.heading[0],-P.heading[1]];const Z=v3.norm([f[0],0,-f[1]]);const X=v3.cross([0,1,0],Z);
    const hop=(GAME.mode==='ended'||GAME.mode==='finish')?Math.abs(Math.sin(qt*5))*0.25:Math.abs(Math.sin(qt*3))*0.04;
    drawModel(standModel,M4.basis(X,[0,1,0],Z,[P.x,P.y+hop,-P.s]),opt);}
  for(const l of LOOSE){if(l.t>10)continue;const m=mdl(bobModels,l.col,()=>buildBobbin(l.col));drawModel(m,M4.mul(M4.trans(l.p[0],l.p[1],l.p[2]),M4.rotZ(l.landed?1.57:l.t*9)),{boil,boilAmt:0.12});}
  partSB.n=0;for(const q of PARTS_P){const k=1-q.t/q.life;partSB.add(q.p[0],q.p[1],q.p[2],q.s*(0.4+0.6*k),q.col,0,1,0,false,(q.s*97)%1);}
  if(partSB.n){updateModel(partModel,partSB);drawModel(partModel,null,{boil,boilAmt:0.2});}
  gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,R.msFB);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,R.resFB);gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.COLOR_BUFFER_BIT,gl.NEAREST);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);gl.disable(gl.DEPTH_TEST);
  gl.useProgram(R.post.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,R.resTex);gl.uniform1i(R.post.u.uTex,0);gl.uniform2f(R.post.u.uRes,w,h);
  gl.uniform1f(R.post.u.uFocusY,clamp(project(c)[1],0.1,0.9));gl.uniform1f(R.post.u.uBlur,Q.blur*h/900);gl.bindVertexArray(R.emptyVao);gl.drawArrays(gl.TRIANGLES,0,3);
}
let last=performance.now(),acc=0,fpsS=0,fpsN=0,fps=60;
function frameLoop(now){const dt=Math.min(0.05,(now-last)/1000);last=now;
  fpsS+=dt;fpsN++;if(fpsS>0.5){fps=fpsN/fpsS;fpsS=0;fpsN=0;if(GAME.mode==='run')$('bQual').textContent=qName+' '+Math.round(fps);}
  if(GAME.mode!=='pause')tick(dt);
  updateChunks(P.s,Q.ahead,Q.dens,GAME.mode==='menu'?3:1);updateCamera(dt);render();HUD.update();Sfx.update(dt);requestAnimationFrame(frameLoop);}
function tick(dt){GAME.t+=dt;readInput();if(GAME.auto&&GAME.mode==='run')autopilot(INP);
  if(GAME.mode==='count'){const b=Math.ceil(GAME.countT);GAME.countT-=dt;const n=Math.ceil(GAME.countT);const el=$('count');
    if(GAME.countT<=0){GAME.mode='run';el.textContent='ROLL!';Sfx.tick(1);setTimeout(()=>el.style.display='none',600);}else if(n!==b){el.textContent=n;el.style.display='flex';Sfx.tick(0);}}
  if(GAME.mode==='run'||GAME.mode==='finish'||GAME.mode==='ended'){acc+=dt;const h=1/120;while(acc>=h){stepPhysics(h,INP);acc-=h;}}
  else if(GAME.mode==='menu'||GAME.mode==='count'){P.curl=GAME.mode==='count'?Math.min(1,P.curl+dt*2):0;}
  stepParticles(dt);}
function startRun(){Sfx.unlock();resetRun();GAME.mode='count';GAME.countT=3;['menu','endO','pauseO'].forEach(i=>$(i).style.display='none');$('hud').style.display='block';
  showTouch();updateCamera(0,true);$('bQual').textContent=qName;const el=$('count');el.textContent='3';el.style.display='flex';Sfx.tick(0);}
function pauseGame(){if(GAME.mode!=='run'&&GAME.mode!=='count')return;GAME.prevMode=GAME.mode;GAME.mode='pause';$('pauseO').style.display='flex';showTouch();}
function resumeGame(){if(GAME.mode!=='pause')return;GAME.mode=GAME.prevMode||'run';$('pauseO').style.display='none';showTouch();last=performance.now();}
function buildMenu(){let b=0;try{b=+localStorage.getItem('qh_best')||0;}catch(e){}$('bestLine').textContent=b?'Best score: '+b:'';
  if(touchMode)$('ctlHint').innerHTML='Left thumb: drag to steer, push up to roll faster, pull down to brake · Right side: HOP<br>Ramps of piping throw you into the air. Collect every bobbin for a 500 bonus.';}
function toMenu(){GAME.mode='menu';resetRun();['endO','pauseO','hud'].forEach(i=>$(i).style.display='none');$('menu').style.display='flex';$('count').style.display='none';buildMenu();showTouch();}
function soundToggle(){Sfx.unlock();Sfx.setOn(!Sfx.on);const t=Sfx.on?'SOUND ON':'SOUND OFF';$('bSound').textContent=t;$('bSound2').textContent=t;try{localStorage.setItem('qh_snd',Sfx.on?1:0);}catch(e){}}
$('bGo').onclick=startRun;$('bAgain').onclick=startRun;$('bRestart').onclick=startRun;$('bMenu').onclick=toMenu;$('bMenu2').onclick=toMenu;$('bResume').onclick=resumeGame;
$('bPause').onclick=()=>GAME.mode==='pause'?resumeGame():pauseGame();$('bQual').onclick=cycleQuality;$('bQual2').onclick=cycleQuality;$('bSound').onclick=soundToggle;$('bSound2').onclick=soundToggle;
document.getElementById('jumpBtn').textContent='HOP';
try{if(localStorage.getItem('qh_snd')==='0'){Sfx.on=false;$('bSound').textContent=$('bSound2').textContent='SOUND OFF';}}catch(e){}
addEventListener('blur',()=>{if(GAME.mode==='run')pauseGame();});
// boot
GAME.total=genCourse();
ballModel=buildHogBall();standModel=buildHogStand();backdropModel=buildBackdrop();landModel=buildLandmarks();partModel=makeModel(partSB,true);
setQuality(qName);resetRun();buildMenu();updateChunks(P.s,Q.ahead,Q.dens,99);updateCamera(0,true);requestAnimationFrame(frameLoop);
window.QR={
  state:()=>({mode:GAME.mode,x:+P.x.toFixed(2),s:+P.s.toFixed(2),y:+P.y.toFixed(2),speed:+Math.hypot(P.vx,P.vs).toFixed(2),air:P.air,patch:PNAME[P.patch],curl:+P.curl.toFixed(2),
    score:GAME.score,bobbins:GAME.bobbins,total:GAME.total,snips:GAME.snips,boings:GAME.boings,bigAirs:GAME.bigAirs,airScore:GAME.airScore,time:+GAME.runT.toFixed(2),finishT:GAME.finishT,
    fps:Math.round(fps),splats:R.splatsDrawn,draws:R.draws,chunks:CHUNKS.size,quality:qName,items:ITEMS.length,kickers:QH.KICK.length,canvas:[canvas.width,canvas.height]}),
  start(skip){startRun();if(skip){GAME.mode='run';GAME.countT=0;P.curl=1;$('count').style.display='none';}},
  auto(on){GAME.auto=on;},
  sim(sec,dt){dt=dt||1/120;const n=Math.round(sec/dt);for(let i=0;i<n;i++){if(GAME.auto&&GAME.mode==='run')autopilot(INP);if(GAME.mode==='run'||GAME.mode==='finish'||GAME.mode==='ended')stepPhysics(dt,INP);stepParticles(dt);GAME.t+=dt;}return QR.state();},
  teleport(s,x){P.s=s;P.x=x||0;P.y=H(P.x,s);P.vx=0;P.vs=4;P.heading=[0,1];P.air=false;P.vy=0;updateChunks(P.s,Q.ahead,Q.dens,99);updateCamera(0,true);},
  input(o){window.INP_OVR=o;Object.assign(INP,o);},quality:setQuality,
  items:()=>ITEMS.map(i=>({type:i.type,s:+i.s.toFixed(1),x:+i.x.toFixed(1)})),kicks:()=>QH.KICK,
  frame(){updateChunks(P.s,Q.ahead,Q.dens,99);updateCamera(1/60,true);render();return QR.state();},menu:toMenu,
};
