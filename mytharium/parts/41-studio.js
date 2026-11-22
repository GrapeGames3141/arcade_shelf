// ============================================================
//  CREATURE STUDIO · one creature alone on a plain sweep
//  The test harness renders each species from several angles here (test\studio.js); players reach it as
//  "Portrait" in a creature's panel. The tank is not drawn, the creature's brain is paused, and its pose comes
//  from a preset below (walk and fly run on the spot).
// ============================================================
const STUDIO={on:false,c:null,y:14,pose:'idle',mesh:null,saved:null};
const STUDIO_POSES={
  horse:{idle:{},walk:{speed:3},trot:{speed:10},graze:{at:{graze:1}},rear:{at:{rear:1}},lie:{at:{lie:1}},sleep:{at:{lie:1,sleep:1}}},
  pegasus:{idle:{},walk:{speed:3},wings:{at:{wings:1}},fly:{fly:1}},
  faerie:{hover:{fly:1},stand:{},perch:{at:{sit:1}},sleep:{at:{sit:1,sleep:1}},dance:{fly:1,at:{dance:1}}},
  mermaid:{idle:{},swim:{speed:5,at:{swim:1}},bask:{at:{bask:1}},comb:{at:{bask:1,comb:1}}},
  dragon:{idle:{},walk:{speed:3},fire:{at:{fire:1,jaw:1}},curl:{at:{curl:1,lie:1,sleep:1}},wings:{at:{wings:1}}},
  gnome:{idle:{},walk:{speed:2},wave:{at:{wave:1}},tend:{at:{tend:1}}},
  phoenix:{perch:{},fly:{fly:1,at:{fly:1}}}};
function studioSet(c){const k=c.sp==='unicorn'||c.sp==='foal'?'horse':c.sp;return STUDIO_POSES[k]||{idle:{}};}
function genStudio(){const mb=new MB();const NR=40,NA=72,F=26,RR=22,H=34;const len=F+PI*RR/2+H;
  for(let i=0;i<=NR;i++)for(let k=0;k<=NA;k++){const s=i/NR*len,a=k/NA*TAU,ca=Math.cos(a),sa=Math.sin(a);let r,y,nr,ny;
    if(s<F){r=s;y=0;nr=0;ny=1;}else if(s<F+PI*RR/2){const th=(s-F)/RR;r=F+Math.sin(th)*RR;y=RR-Math.cos(th)*RR;nr=-Math.sin(th);ny=Math.cos(th);}else{r=F+RR;y=RR+(s-F-PI*RR/2);nr=-1;ny=0;}
    mb.v([ca*r,STUDIO.y+y-.02,sa*r],[ca*nr,ny,sa*nr],[r,y],[0,0,0,1],[0,0,0,0]);}
  for(let i=0;i<NR;i++)for(let k=0;k<NA;k++){const a=i*(NA+1)+k;mb.q(a,a+NA+1,a+NA+2,a+1);}
  return mb;}
function studioEnter(c,pose){if(!c)return;if(!STUDIO.mesh)STUDIO.mesh=genStudio().mesh();
  if(STUDIO.on&&STUDIO.c!==c)studioExit(true);
  if(!STUDIO.on){STUDIO.saved={pos:c.pos.slice(),yaw:c.yaw,state:c.state,t:c.t,dur:c.dur,speed:c.speed,fly:c.fly,vel:(c.vel||[0,0,0]).slice(),cam:JSON.parse(JSON.stringify({target:CAM.t.target,yaw:CAM.t.yaw,pitch:CAM.t.pitch,dist:CAM.t.dist}))};}
  STUDIO.on=true;STUDIO.c=c;c.studio=true;c.pos=[0,STUDIO.y+(c.sp==='faerie'||c.sp==='phoenix'?0:0),0];
  studioPose(pose||Object.keys(studioSet(c))[0]);
  document.body.classList.add('studio');const b=$('studioBar');if(b){b.classList.remove('hidden');renderStudioBar();}
  const h=critRadius(c);Object.assign(CAM.t,{target:[0,STUDIO.y+h*.55,0],yaw:.35,pitch:.12,dist:Math.max(8,h*3.4)});}
function studioPose(name){const c=STUDIO.c;if(!c)return;const P=studioSet(c)[name]||{};STUDIO.pose=name;
  c.speed=P.speed||0;c.fly=P.fly||0;c.vel=c.fly?[0,0,0]:V.mul(fwdOf(c.yaw),c.speed);if(!c.anim)c.anim={};AT(c,P.at||{});c.state='studio';c.look=null;
  if(c.sp==='faerie'||c.sp==='phoenix')c.pos[1]=STUDIO.y+(c.fly?(c.sp==='phoenix'?3.5:2.2)*c.size:P.at&&P.at.sit&&!P.at.sleep?1.5*c.size:0);
  if(c.sp==='mermaid')c.pos[1]=STUDIO.y+(P.at&&P.at.swim?2.4*c.size:P.at&&P.at.bask?.4:6.9*c.size);
  if(c.sp==='pegasus'&&c.fly)c.pos[1]=STUDIO.y+3*c.size;
  if(TEST){c.anim=Object.assign({},c.at);}renderStudioBar();}
function studioExit(keepBar){const c=STUDIO.c,S=STUDIO.saved;if(c&&S){c.pos=S.pos;c.yaw=S.yaw;c.speed=S.speed;c.fly=S.fly;c.vel=S.vel;c.studio=false;setState(c,'idle',1);c.at=null;
    Object.assign(CAM.t,S.cam);CAM.t.target=S.cam.target.slice();}
  STUDIO.on=false;STUDIO.c=null;STUDIO.saved=null;if(!keepBar){document.body.classList.remove('studio');const b=$('studioBar');if(b)b.classList.add('hidden');}}
// the paused creature still breathes, blinks and runs its gait on the spot
function studioUpdate(dt){const c=STUDIO.c;if(!c)return;c.t+=dt;c.blinkT-=dt;if(c.blinkT<0){c.blink=1;c.blinkT=2+Math.random()*5;}c.blink=Math.max(0,c.blink-dt*7);
  if(c.at&&c.at.fire&&c.mouthP&&Math.random()<dt*30)emit(4,c.mouthP,V.add(V.mul(fwdOf(c.yaw),14+Math.random()*6),[(Math.random()-.5)*3,(Math.random()-.2)*3,(Math.random()-.5)*3]),.45+Math.random()*.3,[1,.55,.15],.45,{grow:2.2,drag:2});
  if(c.speed>0)c.vel=V.mul(fwdOf(c.yaw),c.speed);}
function renderStudioBar(){const b=$('studioBar');if(!b||!STUDIO.c)return;const c=STUDIO.c;const set=studioSet(c);
  b.innerHTML=`<span class="note">${esc(c.name)} · drag to turn</span>`+Object.keys(set).map(k=>`<button class="chip${k===STUDIO.pose?' on':''}" data-p="${k}">${k[0].toUpperCase()+k.slice(1)}</button>`).join('')+`<button class="btn pri" id="studioDone">Done</button>`;
  b.querySelectorAll('[data-p]').forEach(e=>e.onclick=()=>studioPose(e.dataset.p));$('studioDone').onclick=()=>studioExit();}
