
// ---------- behaviour state machines (one per species) ----------
// each sets c.state and animation targets in c.at (eased into c.anim by the poser)
const AT=(c,o)=>{c.at=Object.assign({graze:0,lie:0,rear:0,sleep:0,fly:0,wings:0,sit:0,dance:0,fire:0,tend:0,wave:0,bask:0,curl:0,comb:0,swim:0,look:0,jaw:0,toss:0},o||{});};
function lookAtCam(c){c.look=CAM.pos;}
function pondEdgePoint(c){let best=null,bd=1e9;for(let k=0;k<40;k++){const a=Math.random()*TAU;const x=POND.cx+Math.cos(a)*POND.rx*1.02,z=POND.cz+Math.sin(a)*POND.rz*1.02;
  if(!walkable(x,z,c.sp))continue;const d=Math.hypot(x-c.pos[0],z-c.pos[2]);if(d<bd){bd=d;best=[x,0,z];}}return best;}
function wiltedNear(c,R=40){return nearestItem(c.pos,it=>it.geo.wilts&&(it.wilt||0)>.35,R);}
const BEH={};
// ---------- unicorns, foals, pegasi (walkers) ----------
function horseBrain(c,dt){const S=SPECIES[c.sp];if(!c.at)AT(c);
  if(c.state==='carried'){AT(c,{});return;}
  if(c.state==='pet'){c.speed=lerp(c.speed,0,clamp(dt*5,0,1));lookAtCam(c);AT(c,{look:1,toss:c.t<1?1:0});if(c.t>c.dur){c.look=null;setState(c,'idle',1);}groundFollow(c,dt);return;}
  if(c.state==='fly'){pegasusFly(c,dt);return;}
  const night=LIGHT.night>.7;
  if(c.state==='walk'||c.state==='trot'){const sp=c.state==='trot'?S.trot:S.walk;AT(c,{});const done=walkTo(c,dt,c.target,sp,c.arrive||1.5);groundFollow(c,dt);
    if(done||c.t>30){const n=c.next||'idle';c.next=null;setState(c,n,c.ndur||4+Math.random()*6);}return;}
  c.speed=lerp(c.speed,0,clamp(dt*4,0,1));groundFollow(c,dt);
  if(c.state==='graze'){AT(c,{graze:1});c.hunger=Math.max(0,c.hunger-dt/200);if(c.t>2)event(c,'graze');if(Math.random()<dt*.15){c.yaw+=(Math.random()-.5)*.6;}if(c.t>c.dur)setState(c,'idle',1+Math.random()*2);return;}
  if(c.state==='eat'){AT(c,{graze:1});const f=c.food;if(!f||!foods.includes(f)){setState(c,'idle',1);return;}if(c.t>c.dur){foods.splice(foods.indexOf(f),1);c.hunger=Math.max(0,c.hunger-.45);c.happy=Math.min(1,c.happy+.15);sparkle(V.add(c.pos,[0,3*c.size,0]),[1,.85,.6],4);setState(c,'idle',1.5);}return;}
  if(c.state==='drink'){AT(c,{graze:1});if(Math.random()<dt*2&&c.headP)simDrop(c.headP[0],c.headP[2],.6,.08);if(c.t>2)event(c,'drink');if(c.t>c.dur)setState(c,'idle',1);return;}
  if(c.state==='rest'||c.state==='sleep'){AT(c,{lie:1,sleep:c.state==='sleep'?1:0});if(c.t>4)event(c,c.sp==='foal'?'sleep':'rest');if(c.t>c.dur&&!(c.state==='sleep'&&night)){setState(c,'idle',2);}return;}
  if(c.state==='rear'){AT(c,{rear:1});if(c.t>.6)event(c,'rear');if(c.t>c.dur)setState(c,'idle',1);return;}
  if(c.state==='heal'){AT(c,{graze:.8});c.glow=Math.min(1,c.glow+dt*1.5);const it=c.healItem;if(it&&c.t>1.2){it.wilt=Math.max(0,(it.wilt||0)-dt*.8);if(Math.random()<dt*10)sparkle(V.add([it.x,it.y,it.z],[0,2,0]),[1,.95,.8],1);}
    if(c.t>1.5)event(c,'heal');if(c.t>c.dur){setState(c,'idle',1);}return;}
  if(c.state==='rainbow'){AT(c,{look:1});c.look=TERR.rainbowP;if(c.t>1)event(c,'rainbow');if(c.t>c.dur||TERR.rainbow<.2){c.look=null;setState(c,'idle',1);}return;}
  if(c.state==='prance'){AT(c,{toss:1});event(c,'prance');setState(c,'trot',1,{target:pickWander(c,18)||c.pos,next:'idle'});return;}
  // idle: decide what to do next
  AT(c,{look:c.look?1:0});if(c.t<c.dur)return;c.look=null;
  if(c.sp==='foal'){const mom=nearestCrit(c,['unicorn']);if(mom){const d=V.dist(mom.pos,c.pos);if(mom.state==='rest'||mom.state==='sleep'){if(d<8){setState(c,mom.state,20+Math.random()*20);return;}}
      if(d>7){event(c,'follow');const side=V.madd(mom.pos,fwdOf(mom.yaw+PI/2),3.5);setState(c,d>15?'trot':'walk',1,{target:side,next:Math.random()<.6?'graze':'idle',ndur:5});return;}}}
  if(c.sp==='pegasus'&&Math.random()<.45&&c.energy>.25&&SIMT-(c.lastFly||-99)>25){c.lastFly=SIMT;startPegasusFlight(c);return;}
  const food=c.hunger>.35?nearestFood(c):null;if(food){food.claim=c;setState(c,'walk',1,{target:food.p,next:'eat',ndur:3.5,food,arrive:2.2});return;}
  if(TERR.rainbow>.5&&Math.random()<.6){const p=TERR.rainbowP;setState(c,'walk',1,{target:[p[0]+(Math.random()-.5)*10,0,p[2]+4+Math.random()*6],next:'rainbow',ndur:8+Math.random()*6});return;}
  if(night&&c.energy<.75){const herd=nearestCrit(c,['unicorn','foal','pegasus']);const t=herd&&V.dist(herd.pos,c.pos)>10?V.madd(herd.pos,fwdOf(Math.random()*TAU),8):null;
    if(t&&walkable(t[0],t[2],c.sp))setState(c,'walk',1,{target:t,next:'sleep',ndur:60+Math.random()*60});else setState(c,'sleep',60+Math.random()*60);return;}
  const w=c.sp==='unicorn'?wiltedNear(c):null;if(w&&Math.random()<.5){c.healItem=w;const a=Math.atan2(c.pos[2]-w.z,c.pos[0]-w.x);setState(c,'walk',1,{target:[w.x+Math.cos(a)*(w.geo.r*w.scale*.5+4),0,w.z+Math.sin(a)*(w.geo.r*w.scale*.5+4)],next:'heal',ndur:5});return;}
  const r=Math.random();
  if(r<.12){const e=pondEdgePoint(c);if(e){setState(c,'walk',1,{target:e,next:'drink',ndur:5+Math.random()*4,arrive:1});return;}}
  if(r<.17&&c.happy>.65&&c.sp!=='foal'){setState(c,'rear',2.4);return;}
  if(r<.22&&c.happy>.7){setState(c,'prance',1);return;}
  if(r<.32&&c.energy<.6){setState(c,'rest',20+Math.random()*25);return;}
  if(r<.62){const t=pickWander(c,22);if(t){setState(c,'walk',1,{target:t,next:'graze',ndur:6+Math.random()*10});return;}}
  setState(c,'graze',5+Math.random()*9);}
BEH.unicorn=horseBrain;BEH.foal=horseBrain;BEH.pegasus=horseBrain;
function nearestCrit(c,sps){let best=null,bd=1e9;for(const o of crits){if(o===c||!sps.includes(o.sp)||o.hidden)continue;const d=V.dist(o.pos,c.pos);if(d<bd){bd=d;best=o;}}return best;}
// pegasus flight: take off, loop under the lid, land somewhere high
function startPegasusFlight(c){const perches=[];for(const it of items)for(const p of it.perch||[])if(it.geo.solid&&p[1]>12)perches.push(p);
  c.route=[];for(let i=0;i<3;i++)c.route.push([lerp(-45,45,Math.random()),TK.h*.5+Math.random()*TK.h*.32,lerp(-15,18,Math.random())]);const land=pickWander(c,40)||c.pos;c.route.push([land[0],topH(land[0],land[2]),land[2]]);
  setState(c,'fly',60,{fly:0});event(c,'fly');}
function pegasusFly(c,dt){AT(c,{fly:1,wings:1});const tgt=c.route[0];if(!tgt){setState(c,'idle',3);c.fly=0;return;}
  const d=V.sub(tgt,c.pos);const L=V.len(d);const last=c.route.length===1;const sp=SPECIES[c.sp].fly*(last?clamp(L/10,.25,1):1);
  const want=Math.atan2(-d[2],d[0]);c.yaw+=angDiff(c.yaw,want)*clamp(dt*2,0,1);c.vel=V.lerp(c.vel,V.mul(V.norm(d),sp),clamp(dt*1.5,0,1));c.pos=V.madd(c.pos,c.vel,dt);
  c.pos[1]=Math.max(c.pos[1],topH(c.pos[0],c.pos[2])+(last?0:3));c.fly=lerp(c.fly,last&&L<3?0:1,clamp(dt*2,0,1));c.speed=V.len(c.vel);
  if(L<(last?.6:4)){c.route.shift();if(!c.route.length){c.vel=[0,0,0];c.speed=0;c.fly=0;setState(c,'idle',3);if(c.pos[1]-groundH(c.pos[0],c.pos[2])>6)event(c,'perch');}}}
// ---------- faeries (fliers) ----------
function flyToward(c,tgt,dt,speed,arrive=.4){if(tgt[1]>TK.h-5&&!(c.sp==='phoenix'&&c.state==='leave'))tgt=[tgt[0],TK.h-5,tgt[2]];const d=V.sub(tgt,c.pos);const L=V.len(d);const sp=speed*clamp(L/6,.12,1);
  c.vel=V.lerp(c.vel,V.mul(V.norm(d),L>arrive?sp:0),clamp(dt*2.2,0,1));const np=V.madd(c.pos,c.vel,dt);
  // stay above the ground and plants, inside the glass, in front of the background
  np[0]=clamp(np[0],TK.ix0+2,TK.ix1-2);np[2]=clamp(np[2],TK.iz0+bgDepth(np[0],np[1])+2,TK.iz1-2);np[1]=clamp(np[1],topH(np[0],np[2])+.4,TK.h-4);c.pos=np;
  if(Math.hypot(c.vel[0],c.vel[2])>.3)c.yaw+=angDiff(c.yaw,Math.atan2(-c.vel[2],c.vel[0]))*clamp(dt*3,0,1);c.speed=V.len(c.vel);return L<arrive;}
function flowerTargets(){const L=[];for(const it of items)if(it.flower&&CAT[it.kind].nectar)L.push(it);return L;}
BEH.faerie=(c,dt)=>{if(!c.at)AT(c);const night=LIGHT.night>.7;
  if(c.state==='carried'){AT(c,{});return;}
  if(c.state==='pet'){c.vel=V.mul(c.vel,.9);lookAtCam(c);AT(c,{look:1});if(c.t>c.dur){c.look=null;setState(c,'hover',1);}return;}
  if(c.state==='fly'){AT(c,{});if(flyToward(c,c.target,dt,SPECIES.faerie.fly,.35)||c.t>25){const n=c.next||'hover';c.next=null;setState(c,n,c.ndur||3);}return;}
  if(c.state==='eatnectar'){AT(c,{sit:.2});const f=c.food;if(!f||!foods.includes(f)){setState(c,'hover',1);return;}c.vel=[0,0,0];c.pos=V.lerp(c.pos,V.add(f.p,[0,.4,0]),clamp(dt*3,0,1));if(c.t>2){foods.splice(foods.indexOf(f),1);c.hunger=0;sparkle(c.pos,SPECIES.faerie.morphs[c.morph].glow,6);setState(c,'hover',1);}return;}
  if(c.state==='sip'){AT(c,{sit:.2});c.vel=[0,0,0];const it=c.flowerIt;if(it){c.pos=V.lerp(c.pos,V.add(it.flower,c.sipOff),clamp(dt*3,0,1));c.look=it.flower;if(c.t>1)event(c,'sip');
      if(c.t>2.5&&!c.dusted){c.dusted=1;it.dust=40;it.wilt=0;sparkle(it.flower,SPECIES.faerie.morphs[c.morph].glow,10);event(c,'bloom');}}
    c.hunger=Math.max(0,c.hunger-dt/60);if(c.t>c.dur){c.look=null;setState(c,'hover',1);}return;}
  if(c.state==='perch'||c.state==='sleep'){AT(c,{sit:1,sleep:c.state==='sleep'?1:0});c.vel=[0,0,0];if(c.perch)c.pos=V.lerp(c.pos,c.perch,clamp(dt*4,0,1));if(c.state==='sleep'&&c.t>3)event(c,'sleep');
    if(c.t>c.dur&&!(c.state==='sleep'&&LIGHT.night>.85))setState(c,'hover',1);return;}
  if(c.state==='ride'){const m=c.mount;if(!m||m.state==='fly'||m.state==='carried'){setState(c,'hover',1);return;}AT(c,{sit:1});c.vel=[0,0,0];const back=m.backP||V.add(m.pos,[0,6*m.size,0]);c.pos=V.lerp(c.pos,back,clamp(dt*8,0,1));c.yaw=m.yaw+PI/2*0;c.yaw=lerp(c.yaw,m.yaw,clamp(dt*4,0,1));
    if(c.t>1.5){event(c,'ride');if(m.sp==='foal')event(m,'play');}if(c.t>c.dur)setState(c,'fly',1,{target:V.add(c.pos,[0,6,0]),next:'hover'});return;}
  if(c.state==='dance'){AT(c,{dance:1});c.vel=[0,0,0];const ctr=c.ring;const a=SIMT*1.4+c.id*1.7;c.pos=V.lerp(c.pos,[ctr[0]+Math.cos(a)*3.2,ctr[1]+2.5+Math.sin(SIMT*2+c.id)*.8,ctr[2]+Math.sin(a)*3.2],clamp(dt*3,0,1));c.yaw=-a-PI/2;
    if(Math.random()<dt*12)emit(0,V.add(c.pos,[0,1.5,0]),[0,-.6,0],.35,SPECIES.faerie.morphs[c.morph].glow,1.8,{a:.8,drag:.5});if(c.t>2)event(c,'dance');if(c.t>c.dur)setState(c,'hover',1);return;}
  // hover: drift, trail a little dust, decide
  AT(c,{});c.vel=V.lerp(c.vel,[Math.sin(SIMT*.7+c.id)*1.2,Math.sin(SIMT*1.1+c.id*2)*.6,Math.cos(SIMT*.6+c.id)*1.2],clamp(dt,0,1));c.pos=V.madd(c.pos,c.vel,dt);
  c.pos[1]=clamp(c.pos[1],topH(c.pos[0],c.pos[2])+1,TK.h-5);c.pos[0]=clamp(c.pos[0],TK.ix0+3,TK.ix1-3);c.pos[2]=clamp(c.pos[2],TK.iz0+8,TK.iz1-3);
  if(LIGHT.night>.4){event(c,'glow');}
  if(Math.random()<dt*3)emit(0,V.add(c.pos,[0,1.8,0]),[0,-.8,0],.25,SPECIES.faerie.morphs[c.morph].glow,1.4,{a:.5*(.3+LIGHT.night)});
  if(c.t<c.dur)return;
  const food=c.hunger>.4?nearestFood(c):null;if(food){food.claim=c;setState(c,'fly',1,{target:V.add(food.p,[0,.6,0]),next:'eatnectar'});c.food=food;return;}
  if(night&&LIGHT.night>.85&&Math.random()<.5){const p=sleepSpot(c);if(p){c.perch=p;setState(c,'fly',1,{target:p,next:'sleep',ndur:60+Math.random()*80});return;}}
  const ring=items.find(it=>it.kind==='toadstool'&&it.ring);if((night||TERR.rainbow>.5)&&ring&&Math.random()<.45){c.ring=[ring.ringC[0],ring.ringC[1],ring.ringC[2]];setState(c,'fly',1,{target:V.add(c.ring,[3,2.5,0]),next:'dance',ndur:14+Math.random()*10});return;}
  const r=Math.random();
  if(r<.42){const fl=flowerTargets();if(fl.length){const it=pick(Math.random,fl);const off=[(Math.random()-.5)*1.4,.7,1.2];c.flowerIt=it;c.sipOff=off;c.dusted=0;setState(c,'fly',1,{target:V.add(it.flower,off),next:'sip',ndur:4+Math.random()*3});return;}}
  if(r<.55){const m=nearestCrit(c,['unicorn','foal']);if(m&&m.state!=='fly'&&!crits.some(o=>o.mount===m&&o.state==='ride')){c.mount=m;setState(c,'fly',1,{target:V.add(m.pos,[0,7*m.size,0]),next:'ride',ndur:12+Math.random()*12});return;}}
  if(r<.75){const ps=[];for(const it of items)for(const p of it.perch||[])ps.push(p);if(ps.length){const p=V.add(pick(Math.random,ps),[0,.1,0]);c.perch=p;setState(c,'fly',1,{target:p,next:'perch',ndur:6+Math.random()*10});return;}}
  setState(c,'fly',1,{target:[lerp(-50,50,Math.random()),12+Math.random()*(TK.h-22),lerp(-14,20,Math.random())],next:'hover',ndur:2+Math.random()*3});};
function sleepSpot(c){const L=[];for(const it of items){if(it.kind==='glowshroom'||it.kind==='toadstool')L.push(V.add([it.x,it.y,it.z],[0,2.6*it.scale,0]));if(it.kind==='bonsai')for(const p of it.perch)L.push(p);}return L.length?L[c.id%L.length]:null;}
// ---------- mermaid (swimmer) ----------
function pondTarget(){const B=POND.box;for(let k=0;k<60;k++){const x=lerp(B[0],B[2]-1.5,Math.random()),z=lerp(B[1]+1.5,B[3],Math.random());const d=waterDepth(x,z);if(d>3.2)return[x,groundH(x,z)+1.4+Math.random()*(d-3),z];}return[POND.cx,PWL-3,POND.cz];}
// a rock to sun on: one at the water's edge that is low and close to water deep enough to swim up to (nearest and lowest wins)
function baskRock(){let best=null,bs=1e9;for(const it of items){if(!it.geo.solid||it.kind==='shell'||!it.wmin)continue;const pd=pondD(it.x,it.z);if(pd<.5||pd>1.3)continue;const top=topH(it.x,it.z);if(top<PWL-.5||top>PWL+4.5)continue;
    const en=waterBeside([it.x,0,it.z],it,1.8);if(!en)continue;const sc=Math.hypot(en[0]-it.x,en[2]-it.z)+(top-PWL)*1.5;if(sc<bs&&sc<11){bs=sc;best=it;}}return best;}
// water she can swim in: in the pond, deep enough, and clear of rocks and anything else solid
function swimFree(x,z){return inPond(x,z)&&waterDepth(x,z)>1.5&&topH(x,z)<PWL-.3;}
const SPINE=[[40,-17.5],[49,-15],[54.5,-8],[55.5,2],[55.5,12],[55,22]];
function lineFree(a,b){const d=Math.hypot(b[0]-a[0],b[1]-a[1]);const n=Math.max(1,Math.ceil(d/1.5));for(let i=1;i<=n;i++){const t=i/n;if(!swimFree(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))return false;}return true;}
// the next point to head for on the shortest clear way from p to q (through the spine points of the pond when the straight line is blocked)
function swimRoute(p,q){if(lineFree(p,q))return q;const N=[p,...SPINE.filter(s=>swimFree(s[0],s[1])),q];const n=N.length;const dist=new Array(n).fill(1e9),prev=new Array(n).fill(-1),done=new Array(n).fill(false);dist[0]=0;
  for(;;){let u=-1;for(let i=0;i<n;i++)if(!done[i]&&(u<0||dist[i]<dist[u]))u=i;if(u<0||dist[u]>=1e9||u===n-1)break;done[u]=true;
    for(let v=1;v<n;v++){if(done[v])continue;const w=Math.hypot(N[u][0]-N[v][0],N[u][1]-N[v][1]);if(dist[u]+w<dist[v]&&lineFree(N[u],N[v])){dist[v]=dist[u]+w;prev[v]=u;}}}
  if(prev[n-1]<0)return q;let k=n-1;while(prev[k]>0)k=prev[k];return N[k];}
BEH.mermaid=(c,dt)=>{if(!c.at)AT(c);
  if(c.state==='carried'){AT(c,{});return;}
  // open water: in the pond and clear of rocks and anything else solid
  const free=swimFree;
  const swimTo=(tgt,sp,arr)=>{const d=V.sub(tgt,c.pos);const L=V.len(d);let want=V.norm(d);
    // the way round: every half second, find the next point to head for (straight there if the water is clear, else along the pond's spine)
    if(!(c.wayT>SIMT)||c.wayG!==tgt){c.wayT=SIMT+.5;c.wayG=tgt;c.way=swimRoute([c.pos[0],c.pos[2]],[tgt[0],tgt[2]]);}
    if(c.way&&Math.hypot(c.way[0]-tgt[0],c.way[1]-tgt[2])>.1){const wd=[c.way[0]-c.pos[0],(tgt[1]-c.pos[1])*.3,c.way[1]-c.pos[2]];if(Math.hypot(wd[0],wd[2])>.8)want=V.norm(wd);else c.wayT=0;}
    // steer round rocks and the shore: if the way ahead is blocked, try headings to either side (keeping to the side chosen last)
    if(L>arr+.5&&!(free(c.pos[0]+want[0]*1.6,c.pos[2]+want[2]*1.6)&&free(c.pos[0]+want[0]*.7,c.pos[2]+want[2]*.7))){const a0=Math.atan2(want[2],want[0]);const sd=c.steer||1;let ok=false;
      for(const da of[.55,-.55,1.1,-1.1,1.7,-1.7,2.4,-2.4]){const a=a0+da*sd;const x=Math.cos(a),z=Math.sin(a);if(free(c.pos[0]+x*1.6,c.pos[2]+z*1.6)&&free(c.pos[0]+x*.7,c.pos[2]+z*.7)){want=V.norm([x,want[1]*.5,z]);c.steer=da*sd>0?1:-1;ok=true;break;}}
      if(!ok)want=[0,0,0];}
    c.vel=V.lerp(c.vel,V.mul(want,L>arr?sp*clamp(L/5,.25,1):0),clamp(dt*1.8,0,1));const np=V.madd(c.pos,c.vel,dt);
    if(free(np[0],np[2])){np[1]=clamp(np[1],groundH(np[0],np[2])+.9,PWL-.6);c.pos=np;}else{c.vel=V.mul(c.vel,-.3);}
    if(Math.hypot(c.vel[0],c.vel[2])>.4)c.yaw+=angDiff(c.yaw,Math.atan2(-c.vel[2],c.vel[0]))*clamp(dt*2.5,0,1);c.speed=V.len(c.vel);
    if(c.speed>3&&Math.random()<dt*2&&c.pos[1]>PWL-2)simDrop(c.pos[0],c.pos[2],1,.06);return L<arr;};
  // she only swims in the water: if she is somehow out of it (on a rock, on the bank), she slips in first
  if((c.state==='swim'||c.state==='pearl'||c.state==='eat'||c.state==='splash'||c.state==='haul')&&!(inPond(c.pos[0],c.pos[2])&&c.pos[1]<PWL+.9)){c.from=c.pos.slice();c.entry=null;setState(c,'dive',1.4);}
  if(c.state==='swim'){AT(c,{swim:1});if(swimTo(c.target,SPECIES.mermaid.swim,1)||c.t>20){const n=c.next||'idle';c.next=null;setState(c,n,c.ndur||3);}return;}
  // onto the rock: swim to the water beside it, then climb up and over its edge, turning to sit facing the pond
  if(c.state==='haul'){AT(c,{swim:1});if(swimTo(c.entry,5,.9)||c.t>12){c.from=c.pos.slice();splash(c.pos,5);setState(c,'climb',1.3+V.dist(c.pos,c.target)*.22);}return;}
  if(c.state==='climb'){const u=clamp(c.t/c.dur,0,1),e=u*u*(3-2*u);AT(c,{bask:1});c.vel=[0,0,0];c.speed=0;c.wet=1;c.pos=V.lerp(c.from,c.target,e);c.pos[1]=Math.max(c.pos[1]+Math.sin(u*PI)*1.1,topH(c.pos[0],c.pos[2])+.5*e);
    const d=V.sub(c.from,c.target);c.yaw+=angDiff(c.yaw,Math.atan2(-d[2],d[0]))*clamp(dt*3.5,0,1);if(u>=1){const n=c.afterBask==='sing'?'sing':'bask';c.afterBask=null;setState(c,n,25+Math.random()*25);}return;}
  if(c.state==='bask'||c.state==='sing'){AT(c,{bask:1,comb:c.state==='bask'?1:0});c.vel=[0,0,0];c.wet=1;if(c.t>2)event(c,c.state==='bask'?'bask':'sing');
    if(c.state==='sing'){TERR.sing=1;if(Math.random()<dt*3)emit(5,V.add(c.pos,[0,3.2,0]),[(Math.random()-.5)*2,3,(Math.random()-.5)*2],.4,[1,.95,.75],2,{drag:.6});}
    if(c.t>c.dur){if(c.state==='sing')TERR.sing=0;c.from=c.pos.slice();setState(c,'dive',1.4);}return;}
  // back into the water: she slides off the rock to the water beside it (still sitting up), and only swims once she is under
  if(c.state==='dive'){if(!c.from)c.from=c.pos.slice();if(!c.entry||!inPond(c.entry[0],c.entry[2]))c.entry=waterBeside(c.from,null,1.8)||pondTarget();if(c.t<dt*1.5)c.dur=1.1+Math.hypot(c.entry[0]-c.from[0],c.entry[2]-c.from[2])*.2;
    const u=clamp(c.t/c.dur,0,1),e=u*u;AT(c,{bask:u<.55?1:0,swim:u>.75?1:0});c.vel=[0,0,0];c.speed=0;c.pos=V.lerp(c.from,[c.entry[0],PWL-1.5,c.entry[2]],e);c.pos[1]=Math.max(c.pos[1]+Math.sin(u*PI)*.5,Math.min(topH(c.pos[0],c.pos[2])+.5,c.from[1]));
    const d=V.sub(c.entry,c.from);if(Math.hypot(d[0],d[2])>.3)c.yaw+=angDiff(c.yaw,Math.atan2(-d[2],d[0]))*clamp(dt*4,0,1);
    if(u>=1){splash(c.pos,10);simDrop(c.pos[0],c.pos[2],2,.4);event(c,'dive');c.from=null;setState(c,'swim',1,{target:pondTarget(),next:'idle'});}return;}
  if(c.state==='pearl'){AT(c,{swim:1});const sh=items.find(it=>it.kind==='shell');if(!sh){setState(c,'idle',1);return;}if(swimTo([sh.x,sh.y+2.5,sh.z],6,1.6)){TERR.pearls=Math.min(9,TERR.pearls+1);sparkle([sh.x,sh.y+2,sh.z],[.9,.95,1],5);event(c,'pearl');setState(c,'idle',3);}else if(c.t>18)setState(c,'idle',2);return;}
  if(c.state==='splash'){AT(c,{swim:1});if(c.t<.1){for(let i=0;i<3;i++)splash(c.pos,8);simDrop(c.pos[0],c.pos[2],2.5,.5);event(c,'splash');}if(c.t>c.dur)setState(c,'idle',2);return;}
  if(c.state==='eat'){AT(c,{swim:1});const f=c.food;if(!f||!foods.includes(f)){setState(c,'idle',1);return;}if(swimTo(f.p,7,.8)){foods.splice(foods.indexOf(f),1);c.hunger=Math.max(0,c.hunger-.5);sparkle(c.pos,[.8,1,.9],3);setState(c,'idle',2);}else if(c.t>16){f.claim=null;setState(c,'idle',2);}return;}
  // idle: float upright, gentle hover
  AT(c,{});c.vel=V.mul(c.vel,Math.exp(-dt*2));c.pos=V.madd(c.pos,c.vel,dt);c.pos[1]=lerp(c.pos[1],Math.min(PWL-2,c.pos[1]),dt);if(c.t<c.dur)return;
  const dusk=DAY>.7&&DAY<.8;const rock=baskRock();
  const f=c.hunger>.35?nearestFood(c):null;if(f&&inPond(f.p[0],f.p[2])){f.claim=c;setState(c,'eat',8,{food:f});return;}
  if(dusk&&rock&&!TERR.sungToday){const en=waterBeside([rock.x,0,rock.z],rock);if(en){TERR.sungToday=1;c.target=baskPoint(rock);c.entry=en;setState(c,'haul',1);c.afterBask='sing';return;}}
  const r=Math.random();
  if(r<.3&&rock){const en=waterBeside([rock.x,0,rock.z],rock);if(en){c.target=baskPoint(rock);c.entry=en;setState(c,'haul',1);return;}}
  if(r<.52){const sp=beachSpot();const en=sp&&waterBeside(sp,null,1.8);if(en){c.target=sp;c.entry=en;setState(c,'haul',1);return;}} // or she suns on the beach
  if(r<.42&&items.some(it=>it.kind==='shell')){setState(c,'pearl',1);return;}
  setState(c,'swim',1,{target:pondTarget(),next:'idle',ndur:1+Math.random()*3});};
// a place to sun on the beach: dry sand just above the waterline, clear of anything placed there
function beachSpot(){let best=null,bs=-1;for(let x=POND.bx-POND.br;x<=Math.min(POND.bx+POND.br,TK.ix1-3);x+=.8)for(let z=POND.bz-POND.br/.85;z<=Math.min(POND.bz+POND.br/.85,TK.iz1-3);z+=.8){
    if(inPond(x,z)||beachK(x,z)<.3)continue;const h=groundH(x,z);if(h<PWL+.1||h>PWL+1.3||topH(x,z)>h+.3)continue;const sc=beachK(x,z)-Math.abs(h-PWL-.5)*.6+Math.random()*.15;if(sc>bs){bs=sc;best=[x,h+.55,z];}}return best;}
function baskPoint(rock){const top=topH(rock.x,rock.z);return[rock.x,top+.55,rock.z];} // her hips rest on the rock, not in it
// open water next to a point (or a rock): the nearest spot that is deep enough to float in and clear of anything solid
function waterBeside(p,rock,minD=2.2){const R=rock?Math.max(rock.wmax[0]-rock.wmin[0],rock.wmax[2]-rock.wmin[2])*.5+1.4:1.5;let best=null,bd=1e9;
  for(let ring=0;ring<5;ring++)for(let k=0;k<16;k++){const a=k/16*TAU,rr=R+ring*1.6;const x=p[0]+Math.cos(a)*rr,z=p[2]+Math.sin(a)*rr;if(!inPond(x,z)||waterDepth(x,z)<minD||topH(x,z)>PWL-1)continue;
    const d=rr-waterDepth(x,z)*.2;if(d<bd){bd=d;best=[x,PWL-.9,z];}}return best;}
// ---------- dragon hatchling ----------
BEH.dragon=(c,dt)=>{if(!c.at)AT(c);const S=SPECIES.dragon;c.fire=Math.max(0,(c.fire||0)-dt*2);
  if(c.state==='carried'){AT(c,{wings:.5});return;}
  if(c.state==='pet'){c.speed=lerp(c.speed,0,clamp(dt*5,0,1));lookAtCam(c);AT(c,{look:1});if(c.t>.4&&c.t<.5)puff(c,'smoke');if(c.t>c.dur){c.look=null;setState(c,'idle',1);}groundFollow(c,dt);return;}
  if(c.state==='hop'){AT(c,{fly:1,wings:1});const tgt=c.target;const d=V.sub(tgt,c.pos);const L=V.len(d);
    c.vel=V.lerp(c.vel,V.mul(V.norm(V.add(d,[0,L>6?4:0,0])),S.fly*clamp(L/8,.3,1)),clamp(dt*2,0,1));c.pos=V.madd(c.pos,c.vel,dt);c.pos[1]=Math.max(c.pos[1],topH(c.pos[0],c.pos[2]));
    c.yaw+=angDiff(c.yaw,Math.atan2(-d[2],d[0]))*clamp(dt*3,0,1);c.speed=V.len(c.vel);c.fly=1;if(c.t>.8)event(c,'fly');
    if(L<.7||c.t>14){c.vel=[0,0,0];c.fly=0;const n=c.next||'idle';c.next=null;setState(c,n,c.ndur||3);}return;}
  c.fly=0;
  if(c.state==='walk'){AT(c,{});const done=walkTo(c,dt,c.target,S.walk,c.arrive||1.2);groundFollow(c,dt);if(done||c.t>25){const n=c.next||'idle';c.next=null;setState(c,n,c.ndur||3);}return;}
  c.speed=lerp(c.speed,0,clamp(dt*4,0,1));groundFollow(c,dt);
  if(c.state==='bask'){AT(c,{bask:1,wings:.9,lie:.8});c.energy=Math.min(1,c.energy+dt/120);if(c.t>3&&nearHeat(c.pos))event(c,'bask');if(Math.random()<dt*.08)puff(c,'smoke');if(c.t>c.dur)setState(c,'idle',1);return;}
  if(c.state==='curl'||c.state==='hoardrest'){AT(c,{curl:1,lie:1,sleep:c.state==='curl'?1:0});if(c.t>4)event(c,c.state==='curl'?'curl':'hoard');if(c.t>c.dur&&!(c.state==='curl'&&LIGHT.night>.8))setState(c,'idle',1);return;}
  if(c.state==='fire'){AT(c,{fire:1,jaw:1});if(c.t>.5&&c.t<1.6){c.fire=1;if(Math.random()<dt*40)puff(c,c.smoke?'smoke':'flame');}
    if(c.lantern&&c.t>1){c.lantern.lit=1;event(c,'lantern');c.lantern=null;}if(c.smoke&&c.t>1)event(c,'smoke');if(c.t>c.dur)setState(c,'idle',1);return;}
  if(c.state==='grab'){AT(c,{graze:1});if(c.t>.8&&!c.carry){c.carry='pearl';TERR.pearls=Math.max(0,TERR.pearls-1);event(c,'steal');const m=crits.find(o=>o.sp==='mermaid');if(m&&m.state!=='bask'){m.state='splash';m.t=0;m.dur=2.5;}}
    if(c.t>c.dur){const h=items.find(it=>it.geo.hoard);setState(c,'hop',1,{target:h?[h.x,topH(h.x,h.z),h.z]:pickWander(c,20)||c.pos,next:'drop',vel:[0,0,0]});}return;}
  if(c.state==='drop'){AT(c,{graze:1});if(c.t>.6){c.carry=null;setState(c,'hoardrest',8+Math.random()*8);}return;}
  if(c.state==='eat'){AT(c,{graze:1,jaw:c.t<.4?1:0});const f=c.food;if(!f||!foods.includes(f)){setState(c,'idle',1);return;}if(c.t>1.4){foods.splice(foods.indexOf(f),1);c.hunger=Math.max(0,c.hunger-.4);if(f.type==='coal')c.fire=1;setState(c,'idle',1.5);}return;}
  if(c.state==='pounce'){AT(c,{});const f=c.food;if(!f||!foods.includes(f)){setState(c,'idle',1);return;}const done=walkTo(c,dt,f.p,S.trot,1.6);groundFollow(c,dt);if(done){setState(c,'eat',1.5,{food:f});}else if(c.t>12)setState(c,'idle',1);return;}
  AT(c,{look:c.look?1:0});if(c.t<c.dur)return;c.look=null;
  const night=LIGHT.night>.75,dusk=LIGHT.night>.3&&LIGHT.night<.8&&DAY>.6;
  const f=c.hunger>.35?nearestFood(c):null;if(f){f.claim=c;if(f.type==='cricket'){setState(c,'pounce',1,{food:f});}else setState(c,'walk',1,{target:f.p,next:'eat',food:f,arrive:1.6});return;}
  if(dusk){const L=items.find(it=>it.geo.lantern&&!it.lit);if(L){const lp=it2p(L,[-.6,0,0]);c.lantern=L;setState(c,'hop',1,{target:[L.x-2,topH(L.x-2,L.z),L.z+1.5],next:'fire',ndur:2,smoke:false,vel:[0,0,0]});return;}}
  if(night&&c.energy<.8){const sl=items.find(it=>it.geo.bask)||items.find(it=>it.geo.hoard);if(sl){const p=[sl.x,topH(sl.x,sl.z),sl.z];if(V.dist(p,c.pos)>3){setState(c,'hop',1,{target:p,next:'curl',ndur:60+Math.random()*80,vel:[0,0,0]});return;}}setState(c,'curl',60+Math.random()*60);return;}
  const r=Math.random();
  if(r<.32&&SETTINGS.heat>0){const sl=items.find(it=>it.geo.bask);const p=sl?[sl.x,topH(sl.x,sl.z),sl.z]:[HEATP[0],topH(HEATP[0],HEATP[2]),HEATP[2]];setState(c,V.dist(p,c.pos)>12?'hop':'walk',1,{target:p,next:'bask',ndur:25+Math.random()*30,vel:[0,0,0]});return;}
  if(r<.4&&TERR.pearls>0&&crits.some(o=>o.sp==='mermaid')){const e=pondEdgePoint(c);if(e){setState(c,'hop',1,{target:[e[0],topH(e[0],e[2]),e[2]],next:'grab',ndur:1.6,vel:[0,0,0]});return;}}
  if(r<.5){c.smoke=true;setState(c,'fire',2.2);return;}
  if(r<.6){const h=items.find(it=>it.geo.hoard);if(h){setState(c,'walk',1,{target:[h.x,0,h.z],next:'hoardrest',ndur:10+Math.random()*10});return;}}
  if(r<.72){const t=pickWander(c,35);if(t){setState(c,'hop',1,{target:[t[0],topH(t[0],t[2]),t[2]],next:'idle',vel:[0,0,0]});return;}}
  const t=pickWander(c,14);if(t)setState(c,'walk',1,{target:t,next:'idle',ndur:2+Math.random()*3});else setState(c,'idle',2);};
function it2p(it,p){return M4.xf(it.M,p);}
function puff(c,kind){const m=SPECIES.dragon.morphs[c.morph%3];const p=c.mouthP||V.add(c.pos,[3*c.size,2.8*c.size,0]);const f=c.headF||fwdOf(c.yaw);
  if(kind==='smoke'){emit(3,p,V.add(V.mul(f,3),[0,2,0]),.5,[.55,.55,.58],2.4,{grow:1.6,drag:.8,a:.5});}
  else{for(let i=0;i<2;i++)emit(4,p,V.add(V.mul(f,14+Math.random()*6),[(Math.random()-.5)*3,(Math.random()-.2)*3,(Math.random()-.5)*3]),.45+Math.random()*.3,m.fire,.45+Math.random()*.2,{grow:2.2,drag:2});emit(3,p,V.add(V.mul(f,6),[0,3,0]),.4,[.3,.3,.32],1.6,{grow:1.4,drag:1,a:.35});}}
// ---------- gnome ----------
BEH.gnome=(c,dt)=>{if(!c.at)AT(c);const S=SPECIES.gnome;
  if(c.state==='carried'){AT(c,{});return;}
  if(c.state==='pet'||c.state==='wave'){c.speed=lerp(c.speed,0,clamp(dt*5,0,1));lookAtCam(c);AT(c,{look:1,wave:1});if(c.t>.6)event(c,'wave');if(c.t>c.dur){c.look=null;setState(c,'idle',1);}groundFollow(c,dt);return;}
  if(c.state==='home'){c.hidden=true;c.speed=0;AT(c,{});if(LIGHT.night<.4&&c.t>5){c.hidden=false;setState(c,'idle',2);}return;}
  if(c.state==='walk'){AT(c,{});const done=walkTo(c,dt,c.target,S.walk,c.arrive||.8);groundFollow(c,dt);if(c.carry&&c.t>1)event(c,'pebble');if(done||c.t>40){const n=c.next||'idle';c.next=null;setState(c,n,c.ndur||3);}return;}
  c.speed=lerp(c.speed,0,clamp(dt*4,0,1));groundFollow(c,dt);
  if(c.state==='tend'){AT(c,{tend:1});const it=c.tendItem;if(it){it.wilt=Math.max(0,(it.wilt||0)-dt*.25);if(Math.random()<dt*8&&c.handP)emit(2,c.handP,[(Math.random()-.5)*2,-2,(Math.random()-.5)*2],.07,[1,1,1],.8,{g:300});}if(c.t>1)event(c,'tend');if(c.t>c.dur)setState(c,'idle',1.5);return;}
  if(c.state==='drop'){AT(c,{tend:.6});if(c.t>.8){c.carry=null;setState(c,'idle',2);}return;}
  AT(c,{});if(c.t<c.dur)return;
  const home=items.find(it=>it.geo.home==='gnome');if(LIGHT.night>.65&&home){const door=it2p(home,home.geo.door);setState(c,'walk',1,{target:door,next:'home',ndur:999,arrive:.8});event(c,'home');return;}
  const f=c.hunger>.4?nearestFood(c):null;if(f){f.claim=c;setState(c,'walk',1,{target:f.p,next:'idle',arrive:1});foods.splice(foods.indexOf(f),1);c.hunger=0;return;}
  const r=Math.random();const w=nearestItem(c.pos,it=>it.geo.wilts,60);
  if(r<.4&&w){c.tendItem=w;const a=Math.random()*TAU;const R=w.geo.r*w.scale*.5+2;setState(c,'walk',1,{target:[w.x+Math.cos(a)*R,0,w.z+Math.sin(a)*R],next:'tend',ndur:5+Math.random()*4});return;}
  if(r<.55&&home){c.carry='pebble';const p=pickWander(c,30);if(p){setState(c,'walk',1,{target:p,next:'idle'});c.next='walkhome';}const door=it2p(home,[(Math.random()-.5)*8,0,6]);setState(c,'walk',1,{target:door,next:'drop',ndur:1});return;}
  const t=pickWander(c,20);if(t)setState(c,'walk',1,{target:t,next:'idle',ndur:2+Math.random()*4});else setState(c,'idle',3);};
// ---------- phoenix: a rare visitor ----------
const VISIT={t:120+Math.random()*240,active:null};
function visitors(dt){if(VISIT.active){return;}VISIT.t-=dt;if(VISIT.t>0)return;VISIT.t=300+Math.random()*400;
  const ember=items.some(it=>it.geo.ember);const dr=crits.find(c=>c.sp==='dragon'&&c.happy>.55);if(!(ember&&dr)&&!TEST)return;const c=addCrit('phoenix',{pos:[lerp(-40,40,Math.random()),TK.h-4,0]});c.state='arrive';VISIT.active=c;}
BEH.phoenix=(c,dt)=>{if(!c.at)AT(c);
  if(c.state==='carried'){AT(c,{});return;}
  if(c.state==='arrive'||c.state==='fly'){AT(c,{fly:1,wings:1});if(!c.target){// lands in the open where it can be seen: the ember rock first, else a slate stack, rock or the arch
    const ps=[];for(const k of['emberrock','slate','rock','arch']){for(const it of items)if(it.kind===k)ps.push([it.x,topH(it.x,it.z)+.1,it.z]);if(ps.length)break;}c.target=ps.length?pick(Math.random,ps):[0,topH(0,0),0];}
    if(flyToward(c,c.target,dt,SPECIES.phoenix.fly,.8)||c.t>14){if(c.state==='arrive')event(c,'arrive');c.perchP=c.pos.slice();setState(c,'perch',40+Math.random()*30);}
    if(Math.random()<dt*20)emit(4,V.add(c.pos,[-1,2.2,0]),[(Math.random()-.5)*2,-1,(Math.random()-.5)*2],.4,[1,.6,.2],.6,{grow:.5,drag:1});return;}
  if(c.state==='perch'){AT(c,{});c.vel=[0,0,0];if(c.perchP)c.pos=V.lerp(c.pos,c.perchP,clamp(dt*3,0,1));if(Math.random()<dt*6)emit(4,V.add(c.pos,[-1.2,2,0]),[0,1.5,0],.3,[1,.55,.2],.8,{grow:.4,drag:1});if(c.t>c.dur)setState(c,'burst',4);return;}
  if(c.state==='burst'){AT(c,{wings:1});if(c.t<3.4)for(let i=0;i<Math.round(dt*90);i++)emit(4,V.add(c.pos,[(Math.random()-.5)*3,Math.random()*4,(Math.random()-.5)*3]),[(Math.random()-.5)*4,6+Math.random()*6,(Math.random()-.5)*4],.6+Math.random()*.6,[1,.55,.2],.8,{grow:1.2,drag:1.2});
    c.scaleK=c.t<3?1:Math.max(0,1-(c.t-3)*2);if(c.t>c.dur){for(let i=0;i<30;i++)emit(3,V.add(c.pos,[(Math.random()-.5)*2,Math.random()*2,(Math.random()-.5)*2]),[(Math.random()-.5)*2,1,(Math.random()-.5)*2],.4,[.3,.3,.3],3,{grow:.5,drag:1,g:4});setState(c,'ash',5);}return;}
  if(c.state==='ash'){c.scaleK=0;if(c.t>c.dur){c.scaleK=0;setState(c,'reborn',3);}return;}
  if(c.state==='reborn'){c.scaleK=Math.min(1,c.t/2.5);AT(c,{wings:1});sparkle(V.add(c.pos,[0,2,0]),[1,.8,.3],1);if(c.t>.5)event(c,'reborn');if(c.t>c.dur){setState(c,'leave',20);c.target=[c.pos[0],TK.h+10,0];}return;}
  if(c.state==='leave'){AT(c,{fly:1,wings:1});flyToward(c,c.target,dt,SPECIES.phoenix.fly,1);c.pos[1]=Math.min(c.pos[1],TK.h+12);if(c.pos[1]>TK.h-2||c.t>c.dur){removeCrit(c);VISIT.active=null;}return;}};
