// ============================================================
//  LIFE: fish, shrimp, crabs, crawlers (snails, stars, urchins), mantis shrimp, jellyfish, food, flow, tank care
//  No pet: every animal is simulated and shown the same way.
// ============================================================
const FISHSP={
  clown:{name:'Ocellaris Clownfish',L:6,sp:0,cruise:[1.5,4],burst:12,school:.3,zone:[.2,.6],coast:.3,host:true,note:'Moves into an anemone and wiggles among its tentacles.'},
  chromis:{name:'Green Chromis',L:5.5,sp:6,cruise:[3,7],burst:16,school:.9,zone:[.35,.85],coast:.4,note:'Peaceful, shimmering school.'},
  yellowtang:{name:'Yellow Tang',L:10,sp:2,cruise:[3.5,8],burst:18,school:.1,zone:[.2,.8],coast:.35,graze:true,note:'Picks algae off the rocks all day.'},
  bluetang:{name:'Blue Tang',L:11,sp:1,cruise:[4,9],burst:20,school:.1,zone:[.25,.85],coast:.35,graze:true,note:'Fast swimmer that needs room; grazes algae.'},
  gramma:{name:'Royal Gramma',L:6,sp:3,cruise:[1,3],burst:12,school:0,zone:[.08,.45],coast:.6,rocky:true,note:'Keeps close to caves and ledges.'},
  firefish:{name:'Firefish Goby',L:6.5,sp:5,cruise:[.8,2.5],burst:16,school:0,zone:[.08,.3],coast:.85,hover:true,note:'Hovers into the current, flicking its long dorsal fin.'},
  anthias:{name:'Lyretail Anthias',L:7,sp:12,cruise:[2.5,6.5],burst:15,school:.85,zone:[.4,.9],coast:.35,note:'Orange schooling fish that pick plankton out of open water.'},
  copperband:{name:'Copperband Butterflyfish',L:11,sp:13,cruise:[1.2,3.5],burst:11,school:0,zone:[.15,.55],coast:.6,graze:true,rocky:true,note:'Picks food out of the rock with its long snout; famous for eating Aiptasia.'},
  goby:{name:'Yellow Watchman Goby',L:6.5,sp:14,cruise:[.5,2],burst:12,school:0,zone:'bottom',goby:true,note:'Perches at the mouth of a burrow it shares with a pistol shrimp and dives in when startled.'},
  flame:{name:'Flame Angelfish',L:8,sp:7,cruise:[2,5],burst:14,school:0,zone:[.12,.6],coast:.5,graze:true,rocky:true,note:'Dwarf angel that weaves through the rocks.'},
  banggai:{name:'Banggai Cardinal',L:6.5,sp:8,cruise:[.4,1.5],burst:10,school:.6,zone:[.25,.6],coast:.92,hover:true,note:'Hangs almost still, often in a little group.'},
  sixline:{name:'Six-line Wrasse',L:6,sp:9,cruise:[2.5,6],burst:18,school:0,zone:[.06,.45],coast:.2,rocky:true,note:'Darts in and out of the rockwork.'},
  mandarin:{name:'Mandarin Dragonet',L:6,sp:4,cruise:[.6,1.8],burst:6,school:0,zone:'bottom',coast:.85,picker:true,note:'Hovers over the rock picking tiny pods.'},
  blenny:{name:'Lawnmower Blenny',L:9,sp:11,cruise:[.6,2],burst:12,school:0,zone:'bottom',coast:.9,perch:true,graze:true,note:'Perches on rocks and mows the algae.'},
  puffer:{name:'Valentini Puffer',L:7,sp:10,cruise:[.8,2.6],burst:9,school:0,zone:[.15,.7],coast:.8,puffer:true,note:'Puffs up when startled; likes to nip at snails.'},
};
const SHRIMPSP={
  cleaner:{name:'Skunk Cleaner Shrimp',mesh:'lys',pat:0,L:5.2,cleaner:true,note:'Runs a cleaning station: fish queue up to be picked over.'},
  fire:{name:'Fire Shrimp',mesh:'lys',pat:1,L:4.6,cleaner:true,note:'Blood red with white spots; cleans fish too.'},
  pepper:{name:'Peppermint Shrimp',mesh:'lys',pat:2,L:4,note:'See-through with red stripes.'},
  boxer:{name:'Coral Banded Shrimp',mesh:'sten',pat:3,L:5.5,note:'Red and white bands and long claws.'},
  pistol:{name:'Tiger Pistol Shrimp',mesh:'sten',pat:3,L:4.2,pistol:true,note:'Digs the burrow it shares with a watchman goby, shoving sand out with its claws.'},
};
const CRABSP={
  hermit:{name:'Scarlet Hermit Crab',type:0,pat:0,L:2.8,note:'Red legs, yellow eyes; carries a borrowed shell.'},
  bluehermit:{name:'Blue-leg Hermit Crab',type:0,pat:1,L:2.1,note:'Tiny clean-up crew hermit.'},
  emerald:{name:'Emerald Crab',type:1,pat:2,L:3.2,note:'Green, sideways-scuttling algae picker.'},
};
const CRAWLSP={
  nerite:{name:'Zebra Nerite',mesh:'snail0',pat:0,L:2.2,cat:'snail',speed:.18,note:'Striped; grazes the glass.'},
  turbo:{name:'Turbo Snail',mesh:'snail1',pat:1,L:3.6,cat:'snail',speed:.2,note:'Big algae grazer.'},
  trochus:{name:'Trochus Snail',mesh:'snail2',pat:2,L:2.8,cat:'snail',speed:.2,note:'Tall cone shell with stripes.'},
  nassarius:{name:'Nassarius Snail',mesh:'snail3',pat:3,L:1.8,cat:'snail',speed:.2,burrow:true,note:'Lives under the sand; races out when food lands.'},
  linckia:{name:'Blue Linckia Star',mesh:'star0',pat:0,L:16,cat:'star',speed:.25,note:'Cobalt blue sea star.'},
  fromia:{name:'Red Fromia Star',mesh:'star1',pat:1,L:8,cat:'star',speed:.3,note:'Small red star with dark spots.'},
  sifter:{name:'Sand-sifting Star',mesh:'star2',pat:2,L:11,cat:'star',speed:.35,sandOnly:true,note:'Ploughs through the sand bed.'},
  brittle:{name:'Brittle Star',mesh:'star3',pat:3,L:14,cat:'star',speed:.25,night:true,note:'Waves its thin arms from under the rocks.'},
  tuxedo:{name:'Tuxedo Urchin',mesh:'urchin0',pat:0,L:4,cat:'urchin',speed:.2,note:'Blue-banded, short spines.'},
  diadema:{name:'Long-spine Urchin',mesh:'urchin1',pat:1,L:4.2,cat:'urchin',speed:.22,note:'Black needle spines that track shadows.'},
};
const JELLYSP={
  moon:{name:'Moon Jelly',type:0,L:9,note:'Drifts and pulses; in real life it needs a gentle-flow jelly tank.'},
  cassiopea:{name:'Upside-down Jelly',type:1,L:9,note:'Lies on the sand, pulsing, arms up to the light.'},
};
const MANTISSP={peacock:{name:'Peacock Mantis Shrimp',L:11,note:'Lives in a burrow, peeks out, punches snails.'}};
const FOODS={
  pellet:{name:'Pellets',kind:2,sink:1.6,float:3,val:4,fish:true,crab:true,n:12,note:'Slow-sinking pellets for the fish'},
  mysis:{name:'Mysis',kind:3,sink:1.15,val:6,fish:true,crab:true,meat:true,n:14,note:'Frozen mysis shrimp, a favourite of most fish'},
  nori:{name:'Nori',kind:4,sink:.32,float:2,val:5,graze:true,crab:true,n:2,note:'Seaweed for tangs, urchins and crabs'},
  coral:{name:'Coral food',kind:0,cloud:true,val:3,n:0,note:'A fine cloud the corals, dusters and clams filter out'},
};
let SIMT=0;const NOW=()=>SIMT;
// ---------- tank care (the whole tank, not a pet) ----------
const TANK={fed:72,water:92,coral:90,lastFed:0,stamp:Date.now()};
function tankTick(dt){TANK.fed=clamp(TANK.fed-dt*100/(12*3600),0,100);TANK.water=clamp(TANK.water-dt*100/(5*86400),0,100);
  const tgt=clamp(TANK.water*0.75+25+(LIGHT.night>0.5?0:0)-(TANK.fed<15?10:0),0,100);TANK.coral=lerp(TANK.coral,tgt,clamp(dt*0.002,0,1));}
const coralHealth=()=>clamp((TANK.coral-25)/55,0,1);
// ---------- flow: wavemakers push the water back and forth ----------
const FLOW={A:0,w:1,dir:[1,0,.3],vec:[0,0,0]};
function flowUpdate(){let s=0;for(const it of items){const c=CAT[it.kind];if(c.flow)s+=c.flow;}const on=SETTINGS.air>0?1:0;
  FLOW.A=on*(0.18+0.22*Math.min(2.5,s));FLOW.w=TAU/(5.5+1.5*Math.sin(SIMT*0.05));FLOW.dir=V.norm([1,0,0.3]);
  const sg=Math.sin(SIMT*FLOW.w)*0.8+0.35;FLOW.vec=V.mul(FLOW.dir,FLOW.A*sg*1.6);}

// ---------- fish ----------
let fish=[];
// burrows on open sand at the foot of the rockwork: one per watchman goby, shared with a pistol shrimp if there is one
function findBurrow(){for(let k=0;k<40;k++){const x=lerp(TK.x0+8,TK.x1-8,Math.random()),z=lerp(-2,TK.z1-6,Math.random());if(topH(x,z)-sandH(x,z)>0.2)continue;
    let near=false;for(let a=0;a<6&&!near;a++){const xx=x+Math.cos(a)*6,zz=z+Math.sin(a)*6;if(topH(xx,zz)-sandH(xx,zz)>2)near=true;}if(near||k>30)return[x,sandH(x,z),z];}return[0,sandH(0,8),8];}
function addFish(sp,n){for(let i=0;i<n;i++){const S=FISHSP[sp];const y=S.zone==='bottom'?8:lerp(12,34,Math.random());
  fish.push({sp,p:[lerp(-35,35,Math.random()),y,lerp(-12,12,Math.random())],v:[(Math.random()-0.5)*4,0,(Math.random()-0.5)*4],ph:Math.random()*TAU,size:S.L*(0.85+Math.random()*0.3),
    var:Math.random(),wander:Math.random()*100,bend:0,yaw:Math.random()*TAU,pitch:0,roll:0,amp:0.4,pec:0,rest:0,eat:0,cleanCool:30+Math.random()*90,grazeCool:5+Math.random()*20,rockCool:0,fin:0});if(S.goby){const f=fish[fish.length-1];f.burrow=findBurrow();f.p=[f.burrow[0],f.burrow[1]+1,f.burrow[2]];}}}
// pufferfish defence: swell for a few seconds, then deflate slowly; a cool-down stops it puffing again straight away
function puffUp(f){if(f.puffCool>0)return false;f.puffT=3+Math.random()*2.5;f.puffCool=f.puffT+6;f.beating=true;f.stress=1;return true;}
// tapping the glass: fish dart away, puffers puff, dusters and clams snap shut, the mantis ducks into its burrow, nassarius dig in
let puffTold=false;
function startleAt(p){let puffed=0;for(const f of fish){if(FISHSP[f.sp].goby&&f.burrow&&V.dist(f.burrow,p)<30){f.hideT=4+Math.random()*4;continue;}const d=V.dist(f.p,p);if(d>14)continue;const S=FISHSP[f.sp];
    if(S.puffer){if(puffUp(f))puffed++;}else{const away=V.norm(V.sub(f.p,p));f.v=V.madd(f.v,away,S.burst*0.7*(1-d/14));f.beating=true;f.beatT=0.6;f.host=f.host;f.clean=null;}}
  for(const it of items){if(!CAT[it.kind].retract)continue;if(V.dist(it.wc,p)<28)it.retractT=3+Math.random()*3;}
  for(const m of mantis){if(V.dist(m.p,p)<30&&m.state!=='hide'){m.state='back';m.t=10;}}
  for(const s of shrimp){if(V.dist(s.p,p)<8&&s.state!=='swim'){s.state='swim';s.vy=7;s.curl=1;s.t=0.8;s.yaw=Math.atan2(s.p[2]-p[2],s.p[0]-p[0]);}}
  if(puffed&&!puffTold&&typeof toast==='function'){puffTold=true;toast('The puffer puffs up. Puffing is stressful for it, so tap gently.',3600);}
  return true;}
function setFishCount(sp,n){const cur=fish.filter(f=>f.sp===sp);if(cur.length<n)addFish(sp,n-cur.length);else if(cur.length>n){let k=cur.length-n;fish=fish.filter(f=>!(f.sp===sp&&k-->0));}}
const hostItems=()=>items.filter(it=>CAT[it.kind].host);
// a point on top of the rockwork near p (for grazers and rock-hugging fish); null if there is no rock nearby
function rockSpot(p,R){for(let k=0;k<14;k++){const x=clamp(p[0]+(Math.random()-0.5)*R*2,TK.x0+3,TK.x1-3),z=clamp(p[2]+(Math.random()-0.5)*R*2,TK.z0+3,TK.z1-3);const t=topH(x,z);if(t-sandH(x,z)>2.5)return[x,t,z];}return null;}
function fishUpdate(dt){const t=NOW();const night=LIGHT.night;const hosts=hostItems();
  for(const f of fish){const S=FISHSP[f.sp];let acc=[0,0,0];const bottom=S.zone==='bottom';let maxs=lerp(S.cruise[0],S.cruise[1],0.5+0.5*noise3(t*0.2,f.var*5,2));let pinned=false;
    // school and keep apart
    let n=0,ali=[0,0,0],coh=[0,0,0],sep=[0,0,0];
    for(const o of fish){if(o===f)continue;const d=V.sub(o.p,f.p),dd=V.len(d);if(dd<0.01)continue;
      if(dd<(f.size+o.size)*0.7)sep=V.madd(sep,d,-1/(dd*dd));if(o.sp===f.sp&&dd<16){n++;ali=V.add(ali,o.v);coh=V.add(coh,o.p);}}
    if(n&&S.school>0){ali=V.mul(ali,1/n);coh=V.sub(V.mul(coh,1/n),f.p);acc=V.madd(acc,V.sub(ali,f.v),0.45*S.school);acc=V.madd(acc,coh,0.16*S.school);}
    acc=V.madd(acc,sep,f.size*0.6);
    // keep clear of jellies (a sting) and of the mantis
    for(const j of jellies){const d=V.sub(f.p,j.p),dd=V.len(d);if(dd<j.size*0.9+2)acc=V.madd(acc,V.norm(d),(j.size*0.9+2-dd)*1.5);}
    for(const m of mantis){if(m.state==='hide')continue;const d=V.sub(f.p,m.p),dd=V.len(d);if(dd<8)acc=V.madd(acc,V.norm(d),(8-dd)*1.2);}
    // wander
    f.wander+=dt*0.25;const w=[noise3(f.wander,1.3,f.var*9),noise3(f.wander,7.1,f.var*9)*0.35,noise3(f.wander,4.4,f.var*9)];acc=V.madd(acc,w,bottom?1.2:S.hover?0.5:f.hunt||f.peek>0?0.4:2.2);
    const floor=topH(f.p[0],f.p[2]);const ylo=bottom?floor+0.8:lerp(floor+2.5,TK.wl-2,S.zone[0]),yhi=bottom?floor+2.6:lerp(floor+2.5,TK.wl-2,S.zone[1]);
    // food
    let fd=null,fdd=1e9;for(const fo of foods){const F=FOODS[fo.type];if(fo.eaten)continue;const ok=F.fish||(F.graze&&S.graze);if(!ok)continue;const dd=V.dist(fo.p,f.p);if(dd<fdd&&dd<40){fdd=dd;fd=fo;}}
    for(const pk of plankton){if(fd)break;const dd=V.dist(pk.p,f.p);if(dd<10&&!S.host){fd={p:pk.p,pl:pk,type:'coral'};fdd=dd;break;}}
    // clownfish: settle into an anemone and stay there, wiggling into the tentacles
    if(S.host&&hosts.length&&!fd){if(!f.home||!items.includes(f.home)){let b=null,bd=1e9;for(const h of hosts){const d=V.dist(h.wc,f.p);if(d<bd){bd=d;b=h;}}f.home=b;}
      const h=f.home,top=[h.x,h.y+(h.kind==='carpet'?2.2:4.2)*h.scale,h.z],orb=[Math.cos(t*0.4+f.var*9)*2.2*h.scale,0.8*Math.sin(t*0.7+f.var*5),Math.sin(t*0.33+f.var*7)*1.6*h.scale];
      const tg=V.add(top,orb),d=V.sub(tg,f.p),dd=V.len(d);acc=V.madd(acc,d,dd>4?1.6:0.9);acc=V.madd(acc,f.v,-0.6);maxs=dd>6?S.cruise[1]:1.6;pinned=true;if(dd<4&&Math.random()<dt*0.8){f.beating=true;f.beatT=0.5;}}
    // cleaning station: now and then a fish swims to a cleaner shrimp and hovers, head down, while the shrimp picks it over
    f.cleanCool-=dt;if(!f.clean&&f.cleanCool<=0&&!fd&&!S.host&&f.size>5){const cl=shrimp.filter(s=>SHRIMPSP[s.sp].cleaner&&s.state!=='swim'&&!fish.some(o=>o.clean===s));if(cl.length){f.clean=cl[Math.floor(Math.random()*cl.length)];f.cleanT=14;}f.cleanCool=60+Math.random()*90;}
    if(f.clean){const s=f.clean;f.cleanT-=dt;if(!shrimp.includes(s)||f.cleanT<=0||fd){f.clean=null;}
      else{const tg=V.add(s.p,[0,1.2+f.size*0.12,0]),d=V.sub(tg,f.p),dd=V.len(d);acc=V.madd(acc,d,2);acc=V.madd(acc,f.v,-1.5);maxs=dd>4?S.cruise[1]:0.6;pinned=true;
        if(dd<1.8){s.cleanT=Math.max(s.cleanT||0,1);s.cleanFish=f;f.v=V.mul(f.v,Math.exp(-dt*3));f.pitchT=-0.35;if(f.cleanT>6)f.cleanT=Math.min(f.cleanT,5.5);}}}
    // grazers peck algae off the rock: swim to a spot, hold nose-down, peck
    if(S.graze&&!fd&&!f.clean){f.grazeCool-=dt;if(!f.graze&&f.grazeCool<=0){const r=rockSpot(f.p,22);if(r)f.graze={p:r,t:4+Math.random()*4};f.grazeCool=8+Math.random()*18;}
      if(f.graze){const g=f.graze,tg=V.add(g.p,[0,f.size*0.22+0.6,0]),d=V.sub(tg,f.p),dd=V.len(d);acc=V.madd(acc,d,1.8);acc=V.madd(acc,f.v,-1);maxs=dd>3?S.cruise[1]:0.8;pinned=true;
        if(dd<1.5){g.t-=dt;f.pitchT=-0.45;if(Math.random()<dt*2.5){f.v=V.madd(f.v,V.norm(V.sub(g.p,f.p)),1.2);f.beating=true;f.beatT=0.25;}}if(g.t<=0)f.graze=null;}}
    // rock huggers drift between spots close to the rockwork
    if(S.rocky&&!fd&&!f.clean&&!f.graze){f.rockCool-=dt;if(f.rockCool<=0){f.rockT=rockSpot(f.p,18);f.rockCool=4+Math.random()*6;}if(f.rockT){const tg=V.add(f.rockT,[0,2.5+f.var*3,0]);acc=V.madd(acc,V.sub(tg,f.p),0.35);}}
    // hoverers face into the flow and hold station
    if(S.hover&&!fd){acc=V.madd(acc,f.v,-0.8);acc=V.madd(acc,FLOW.vec,-0.15);if(Math.random()<dt*0.3)f.fin=1;}
    f.fin=Math.max(0,(f.fin||0)-dt*1.5);
    // mandarin: stop-start picking over the rock; blenny: perch, then hop
    if(S.picker&&!fd){f.pickT=(f.pickT||0)-dt;if(f.pickT<=0){f.pickT=0.8+Math.random()*1.4;f.rest=0.4+Math.random()*0.6;f.pitchT=-0.3;}}
    if(S.perch&&!fd){f.perchT=(f.perchT||0)-dt;if(f.perchT<=0){if(f.perched){f.perched=false;f.perchT=2+Math.random()*3;f.v=V.add(f.v,[(Math.random()-0.5)*6,3,(Math.random()-0.5)*6]);}else{f.perched=true;f.perchT=6+Math.random()*12;}}
      if(f.perched&&f.p[1]<floor+3){f.v=V.mul(f.v,Math.exp(-dt*5));acc=[0,(floor+0.35*f.size*0.3-f.p[1])*3,0];pinned=true;}}
    if(!pinned&&!f.hunt&&!(f.peek>0)){if(f.p[1]<ylo)acc[1]+=(ylo-f.p[1])*0.8;if(f.p[1]>yhi)acc[1]-=(f.p[1]-yhi)*0.5;}
    // walls, surface, rock ahead
    const m=f.hunt||f.peek>0||pinned?1.2:4+f.size*0.2;if(f.p[0]<TK.x0+m)acc[0]+=(TK.x0+m-f.p[0])*1.5;if(f.p[0]>TK.x1-m)acc[0]-=(f.p[0]-(TK.x1-m))*1.5;
    if(f.p[2]<TK.z0+m)acc[2]+=(TK.z0+m-f.p[2])*1.5;if(f.p[2]>TK.z1-m)acc[2]-=(f.p[2]-(TK.z1-m))*1.5;
    if(f.p[1]>TK.wl-1.5)acc[1]-=(f.p[1]-(TK.wl-1.5))*4;
    const ah=V.madd(f.p,f.v,0.6);const th=topH(ah[0],ah[2]);if(ah[1]<th+1+f.size*0.1){acc[1]+=(th+1+f.size*0.1-ah[1])*3;acc=V.madd(acc,topNormal(ah[0],ah[2]),2);}
    if(fd){const d=V.sub(fd.p,f.p);acc=V.madd(acc,V.norm(d),6);maxs=S.burst*0.6;f.graze=null;
      if(fdd<0.6+f.size*0.08&&f.eat<=0){f.eat=0.6;if(fd.pl){fd.pl.life=0;}else{fd.bites=(fd.bites||0)+1;if(fd.type!=='nori'||fd.bites>8)eatFood(fd,'fish');else TANK.fed=clamp(TANK.fed+0.3,0,100);}}}
    f.eat-=dt;
    if(S.puffer){ // stalks snails: hover a finger's width off the shell to aim, strike, then lose interest for a while
      f.huntCool=(f.huntCool===undefined?15+Math.random()*30:f.huntCool)-dt;const snails=crawlers.filter(c=>CRAWLSP[c.sp].cat==='snail'&&!c.buried);
      if(fd||f.puff>0.15)f.hunt=null;
      else if(!f.hunt&&f.huntCool<=0){let best=null,bd=30;for(const sn of snails){const d=V.dist(sn.p,f.p);if(d<bd){bd=d;best=sn;}}if(best){f.hunt=best;f.huntT=16;f.aim=0;}else f.huntCool=12;}
      if(f.hunt){const sn=f.hunt;f.huntT-=dt;
        if(!crawlers.includes(sn)||f.huntT<=0){f.hunt=null;f.huntCool=25+Math.random()*40;}
        else{const nrm=sn.surf==='floor'?topNormal(sn.p[0],sn.p[2]):PANES[sn.surf].n,hov=V.madd(sn.p,nrm,1.9+sn.size*0.3),d=V.sub(hov,f.p),dd=V.len(d),at=V.norm(V.sub(sn.p,f.p));
          acc=V.madd(acc,d,2.4);acc=V.madd(acc,f.v,-1.4);maxs=dd>4?S.cruise[1]*1.3:1;
          if(dd<1){f.aim+=dt;f.v=V.madd(V.mul(f.v,Math.exp(-dt*4)),at,dt*1.5);f.beating=true;
            if(f.aim>1+f.var){f.v=V.madd(f.v,at,6);sn.stop=3+Math.random()*3;f.hunt=null;f.huntCool=35+Math.random()*60;}}}}
      const near=CAM.pos[2]>TK.z1+1&&CAM.pos[2]<TK.z1+62&&Math.abs(CAM.pos[0])<TK.x1+20;f.peekCool=(f.peekCool===undefined?4+Math.random()*8:f.peekCool)-dt;
      if(!f.peek&&near&&!f.hunt&&!fd&&!(f.puff>0.15)&&f.peekCool<=0&&Math.random()<dt*0.25)f.peek=7+Math.random()*7;
      if(f.peek>0){f.peek-=dt;const tg=[clamp(CAM.pos[0]+(f.var-.5)*12,TK.x0+4,TK.x1-4),clamp(CAM.pos[1]+(f.var-.5)*5,floor+4,TK.wl-4),TK.z1-2.5],d=V.sub(tg,f.p),dd=V.len(d);
        acc=V.madd(acc,d,1.8);acc=V.madd(acc,f.v,-1.2);maxs=dd>4?S.cruise[1]*1.2:0.8;if(dd<1.5)f.v=V.madd(V.mul(f.v,Math.exp(-dt*3)),[0,0,1],dt*1.2);
        if(f.peek<=0||!near||fd||f.hunt||f.puff>0.15){f.peek=0;f.peekCool=18+Math.random()*30;}}
      if(!(f.puffCool>0)){let bump=false;for(const o of fish){if(o!==f&&o.size>f.size*1.3&&V.dist(o.p,f.p)<o.size*0.3+f.size*0.4){bump=true;break;}}if(bump)puffUp(f);}
      f.puffT=(f.puffT||0)-dt;f.puffCool=(f.puffCool||0)-dt;f.stress=Math.max(0,(f.stress||0)-dt/30);f.puffAge=f.puffT>0?(f.puffAge||0)+dt:0;const pt=f.puffT>0?Math.min(1,(1+Math.floor(f.puffAge*3.5))/4):0;f.puff=lerp(f.puff||0,pt,clamp(dt*(pt>(f.puff||0)?7:0.8),0,1));
      if(f.puff>0.15){acc=V.mul(acc,1-f.puff*0.9);f.v=V.mul(f.v,Math.exp(-dt*3*f.puff));f.v[1]+=dt*0.5*f.puff;f.yaw+=dt*0.4*f.puff*(f.var>0.5?1:-1);}}
    // watchman goby: sits propped on its fins at the burrow mouth, darts out for food that drifts close, vanishes into the hole when
    // something startles it or the lights go out, and peeks out again a few seconds later
    if(S.goby&&f.burrow){const b=f.burrow;b[1]=sandH(b[0],b[2]);f.hideT=(f.hideT||0)-dt;if(night>0.5)f.hideT=Math.max(f.hideT,1);
      if(f.hideT>0){f.hidden=true;f.p=[b[0],b[1]-1,b[2]];f.v=[0,0,0];acc=[0,0,0];pinned=true;}
      else{f.hidden=false;const away=fd&&V.dist(fd.p,b)<9;const tg=away?fd.p:[b[0]+Math.cos(f.var*TAU)*0.8,b[1]+f.size*0.1,b[2]+Math.sin(f.var*TAU)*0.8],d=V.sub(tg,f.p),dd=V.len(d);
        acc=V.madd([0,0,0],d,away?3:2.5);acc=V.madd(acc,f.v,-2);maxs=away?S.burst*0.5:dd>1?3:0.2;pinned=true;if(!away&&dd<0.6){f.v=V.mul(f.v,Math.exp(-dt*6));f.yawT=f.var*TAU+PI*0.5;}}}
    // night: reef fish tuck in at the foot of the rockwork (or in a cave) and hover there almost still until the lights come back
    if(night>0.5&&!pinned&&!fd&&!(f.puff>0.15)&&!S.host){f.bedT=(f.bedT||0)-dt;
      if(!f.bed||f.bedT<=0){const rocks=items.filter(i=>CAT[i.kind].cat==='hard'&&i.wr>3);f.bed=null;
        // a spot of open sand right at the foot of a rock (tried a few times so it is not inside other rock)
        for(let k=0;k<12&&rocks.length&&!f.bed;k++){const rk=rocks[Math.floor(Math.random()*rocks.length)],a=lerp(0.25,2.9,Math.random()),R=rk.wr*(0.9+Math.random()*0.5);
          const x=clamp(rk.wc[0]+Math.cos(a)*R,TK.x0+3,TK.x1-3),z=clamp(rk.wc[2]+Math.sin(a)*R,TK.z0+3,TK.z1-3);if(topH(x,z)-sandH(x,z)<0.8)f.bed=[x,sandH(x,z)+1.5+Math.random()*(bottom?1:4),z];}
        f.bedT=60+Math.random()*60;}
      if(f.bed){const d=V.sub(f.bed,f.p),dd=V.len(d);acc=V.madd(V.mul(acc,0.15),d,1.4);acc=V.madd(acc,f.v,-1.6);maxs=dd>3?S.cruise[0]*1.2:0.25;if(dd<1.5){f.v=V.mul(f.v,Math.exp(-dt*2));pinned=true;}}}
    else if(night<=0.5)f.bed=null;
    if(f.rest>0){f.rest-=dt;f.v=V.mul(f.v,Math.exp(-dt*3));acc=[0,0,0];}
    if(night>0.5){maxs*=0.45;}
    // the surge nudges everyone a little, small fish more
    acc=V.madd(acc,FLOW.vec,0.35/Math.max(1,f.size*0.25));
    f.v=V.madd(f.v,acc,dt*2.2);let sp=V.len(f.v);
    if(sp>maxs)f.v=V.mul(f.v,lerp(1,maxs/sp,clamp(dt*2,0,1)));if(sp<0.3&&f.rest<=0&&!S.hover&&!pinned)f.v=V.madd(f.v,[Math.cos(f.yaw),0,Math.sin(f.yaw)],0.3);
    f.v[1]=clamp(f.v[1],-sp*0.6-0.5,sp*0.6+0.5);
    f.p=V.madd(f.p,f.v,dt);f.p[0]=clamp(f.p[0],TK.x0+1,TK.x1-1);f.p[2]=clamp(f.p[2],TK.z0+1,TK.z1-1);if(!f.hidden)f.p[1]=clamp(f.p[1],topH(f.p[0],f.p[2])+(S.goby?0.15:0.5)+f.size*0.06,TK.wl-0.8);
    sp=V.len(f.v);
    if(sp>0.15){const ny=Math.atan2(f.v[2],f.v[0]);const dyaw=angDiff(f.yaw,ny);f.yaw+=clamp(dyaw,-6*dt,6*dt);f.bend=lerp(f.bend,clamp(-dyaw*2,-1.2,1.2),clamp(dt*6,0,1));
      f.roll=lerp(f.roll,clamp(dyaw*1.2,-0.5,0.5),clamp(dt*4,0,1));}
    else if(S.hover){const ny=Math.atan2(-FLOW.dir[2],-FLOW.dir[0]);f.yaw+=clamp(angDiff(f.yaw,ny),-dt*0.4,dt*0.4);}
    const pt2=f.pitchT!==undefined?f.pitchT:clamp(Math.atan2(f.v[1],Math.hypot(f.v[0],f.v[2])),-0.6,0.6);f.pitch=lerp(f.pitch,sp>0.15||f.pitchT!==undefined?pt2:0,clamp(dt*4,0,1));f.pitchT=undefined;
    if(f.p[1]>TK.wl-2&&Math.random()<dt*3)simDrop(f.p[0],f.p[2],0.6,0.01);
    // burst-and-coast swimming
    f.beatT=(f.beatT||0)-dt;if(f.beatT<=0){f.beating=!f.beating||fd||f.rest>0||Math.random()>(S.coast||0);f.beatT=f.beating?0.28+Math.random()*0.5:0.18+Math.random()*0.5*(S.coast||0);}
    f.beatA=lerp(f.beatA===undefined?1:f.beatA,f.beating?1:0.12,clamp(dt*9,0,1));if(!f.beating&&!fd)f.v=V.mul(f.v,Math.exp(-dt*0.5));
    f.amp=lerp(f.amp,(0.35+sp/S.cruise[1]*0.5)*(0.25+0.75*f.beatA),clamp(dt*5,0,1));f.ph+=dt*TAU*(1.5+sp*0.55)*(0.3+0.7*f.beatA);f.pec+=dt*TAU*(S.puffer||S.picker?7:f.rest>0||sp<1?3:1.5);}}

// ---------- shrimp and crabs: walkers on the sand and rock tops ----------
let shrimp=[],crabs=[];
function addShrimp(sp,n){for(let i=0;i<n;i++){const x=lerp(-40,40,Math.random()),z=lerp(-14,14,Math.random());
  shrimp.push({sp,p:[x,topH(x,z),z],yaw:Math.random()*TAU,state:'graze',t:Math.random()*4,walk:0,swim:0,curl:0,vy:0,var:Math.random(),tgt:null,size:SHRIMPSP[sp].L*(0.88+Math.random()*0.24),cleanT:0});}}
function setShrimpCount(sp,n){const cur=shrimp.filter(s=>s.sp===sp);if(cur.length<n)addShrimp(sp,n-cur.length);else if(cur.length>n){let k=cur.length-n;shrimp=shrimp.filter(s=>!(s.sp===sp&&k-->0));}}
function addCrab(sp,n){for(let i=0;i<n;i++){const x=lerp(-40,40,Math.random()),z=lerp(-14,14,Math.random());
  crabs.push({sp,p:[x,topH(x,z),z],yaw:Math.random()*TAU,state:'graze',t:Math.random()*4,walk:0,var:Math.random(),tgt:null,size:CRABSP[sp].L*(0.85+Math.random()*0.3),claw:0});}}
function setCrabCount(sp,n){const cur=crabs.filter(s=>s.sp===sp);if(cur.length<n)addCrab(sp,n-cur.length);else if(cur.length>n){let k=cur.length-n;crabs=crabs.filter(s=>!(s.sp===sp&&k-->0));}}
function shrimpUpdate(dt){for(const s of shrimp){s.t-=dt;const g=topH(s.p[0],s.p[2]);const S=SHRIMPSP[s.sp];
    // pistol shrimp: lives in the goby's burrow; comes out a few centimetres, bulldozes a load of sand, backs in again
    if(S.pistol){const gb=fish.find(f=>FISHSP[f.sp].goby&&f.burrow);const b=gb?gb.burrow:(s.burrow||(s.burrow=findBurrow()));b[1]=sandH(b[0],b[2]);
      s.cyc=(s.cyc||Math.random()*10)+dt;const ph=s.cyc%11;const out=ph<1.5?ph/1.5:ph<5?1:ph<6.5?1-(ph-5)/1.5:0;const dir=(s.var*TAU)+PI*0.15*Math.sin(s.cyc*0.3);
      const scared=gb&&gb.hideT>0;s.hidden=scared||out<0.05;let r=0.6+2.2*(scared?0:out);for(let rr=0.6;rr<=r;rr+=0.3){const x=b[0]+Math.cos(dir)*rr,z=b[2]+Math.sin(dir)*rr;if(topH(x,z)-sandH(x,z)>0.6){r=Math.max(0.6,rr-0.3);break;}}
      s.p=[b[0]+Math.cos(dir)*r,sandH(b[0]+Math.cos(dir)*r,b[2]+Math.sin(dir)*r),b[2]+Math.sin(dir)*r];
      s.yaw=ph<5?dir:dir+PI;s.walk+=dt*TAU*(ph<1.5||(ph>5&&ph<6.5)?1.6:0.4);s.state='graze';s.curl=lerp(s.curl,0,dt*4);continue;}
    // a big fish rushing close makes it jump back with a tail flick (but not a client being cleaned)
    if(s.state!=='swim'&&!(s.cleanT>0)){for(const f of fish){if(f.size>s.size*1.4&&f.clean!==s&&V.dist(f.p,s.p)<f.size*0.35+1.2&&V.len(f.v)>3){s.state='swim';s.vy=7;s.yaw=Math.atan2(f.p[2]-s.p[2],f.p[0]-s.p[0])+(Math.random()-0.5)*0.6;s.t=0.8;s.curl=1;break;}}}
    if(s.cleanT>0){s.cleanT-=dt;s.state='graze';s.walk+=dt*TAU*1.4;s.curl=lerp(s.curl,-0.35,dt*4);const cf=s.cleanFish;if(cf){const d=Math.atan2(cf.p[2]-s.p[2],cf.p[0]-s.p[0]);s.yaw+=clamp(angDiff(s.yaw,d),-dt*2,dt*2);}s.p[1]=g;continue;}
    if(s.state==='graze'){s.walk+=dt*TAU*0.6;s.curl=lerp(s.curl,0,dt*4);if(s.t<=0){
        let fo=null;for(const f of foods){if(f.state==='rest'&&!f.eaten&&V.dist(f.p,s.p)<28){fo=f;break;}}
        if(fo){s.tgt=[fo.p[0],fo.p[2]];s.food=fo;}else{const a=Math.random()*TAU,r=2+Math.random()*8;s.tgt=[clamp(s.p[0]+Math.cos(a)*r,TK.x0+1,TK.x1-1),clamp(s.p[2]+Math.sin(a)*r,TK.z0+1,TK.z1-1)];s.food=null;}
        s.state=Math.random()<0.03?'swim':'walk';s.t=s.state==='swim'?1.2:8;if(s.state==='swim'){s.vy=5+Math.random()*4;s.curl=0.5;}}
      s.p[1]=g;if(s.food&&!s.food.eaten&&V.dist(s.food.p,s.p)<1.2){s.food.nib=(s.food.nib||0)+dt;if(s.food.nib>14)eatFood(s.food,'shrimp');}}
    else if(s.state==='walk'){const des=Math.atan2(s.tgt[1]-s.p[2],s.tgt[0]-s.p[0]);s.yaw+=clamp(angDiff(s.yaw,des),-2*dt,2*dt);const sp=1.4;
      s.p[0]+=Math.cos(s.yaw)*sp*dt;s.p[2]+=Math.sin(s.yaw)*sp*dt;s.p[1]=topH(s.p[0],s.p[2]);s.walk+=dt*TAU*2.2;s.curl=lerp(s.curl,0,dt*4);
      if(Math.hypot(s.tgt[0]-s.p[0],s.tgt[1]-s.p[2])<0.6||s.t<=0){s.state='graze';s.t=2+Math.random()*7;}}
    else{s.vy-=dt*9;s.p[1]+=s.vy*dt;s.p[0]+=Math.cos(s.yaw)*dt*(s.curl>0.3?-6:0.8);s.p[2]+=Math.sin(s.yaw)*dt*(s.curl>0.3?-6:0.8);s.swim+=dt*TAU*3;s.curl=lerp(s.curl,0,dt*2);
      s.p[0]=clamp(s.p[0],TK.x0+1,TK.x1-1);s.p[2]=clamp(s.p[2],TK.z0+1,TK.z1-1);s.p[1]=Math.min(s.p[1],TK.wl-1);
      if(s.p[1]<=topH(s.p[0],s.p[2])&&s.vy<0){s.p[1]=topH(s.p[0],s.p[2]);s.state='graze';s.t=2+Math.random()*4;}}
    s.p[0]=clamp(s.p[0],TK.x0+1,TK.x1-1);s.p[2]=clamp(s.p[2],TK.z0+1,TK.z1-1);}}
function crabUpdate(dt){for(const c of crabs){c.t-=dt;const S=CRABSP[c.sp],side=S.type===1;c.claw=Math.max(0,c.claw-dt);
    if(c.state==='graze'){c.walk+=dt*TAU*0.15;if(Math.random()<dt*0.9)c.claw=0.3;if(c.t<=0){
        let fo=null;for(const f of foods){if(f.state==='rest'&&!f.eaten&&FOODS[f.type].crab&&V.dist(f.p,c.p)<30){fo=f;break;}}
        if(fo){c.tgt=[fo.p[0],fo.p[2]];c.food=fo;}else{const a=Math.random()*TAU,r=2+Math.random()*7;c.tgt=[clamp(c.p[0]+Math.cos(a)*r,TK.x0+1,TK.x1-1),clamp(c.p[2]+Math.sin(a)*r,TK.z0+1,TK.z1-1)];c.food=null;}
        c.state='walk';c.t=12;}
      c.p[1]=topH(c.p[0],c.p[2]);if(c.food&&!c.food.eaten&&V.dist(c.food.p,c.p)<1.5){c.claw=0.3;c.food.nib=(c.food.nib||0)+dt;if(c.food.nib>18)eatFood(c.food,'crab');}}
    else{const des=Math.atan2(c.tgt[1]-c.p[2],c.tgt[0]-c.p[0]);const face=side?des+(c.var>0.5?PI/2:-PI/2):des;c.yaw+=clamp(angDiff(c.yaw,face),-1.6*dt,1.6*dt);const sp=S.type===0?0.7:1.3;
      c.p[0]+=Math.cos(des)*sp*dt;c.p[2]+=Math.sin(des)*sp*dt;c.p[1]=topH(c.p[0],c.p[2]);c.walk+=dt*TAU*(S.type===0?1.6:2.6);
      if(Math.hypot(c.tgt[0]-c.p[0],c.tgt[1]-c.p[2])<0.6||c.t<=0){c.state='graze';c.t=3+Math.random()*9;}}
    c.p[0]=clamp(c.p[0],TK.x0+1,TK.x1-1);c.p[2]=clamp(c.p[2],TK.z0+1,TK.z1-1);}}

// ---------- crawlers: snails, sea stars and urchins on the sand, the rock and the four glass panes ----------
// On a pane, 'a' is the along-glass coordinate (x on front/back, z on the side panes) and the heading h is in that pane's plane (cos h along it, sin h up).
const PANES={front:{ax:0,fix:2,v:()=>TK.z1-0.05,n:[0,0,-1]},back:{ax:0,fix:2,v:()=>TK.z0+0.05,n:[0,0,1]},left:{ax:2,fix:0,v:()=>TK.x0+0.05,n:[1,0,0]},right:{ax:2,fix:0,v:()=>TK.x1-0.05,n:[-1,0,0]}};
let crawlers=[];
function onPane(s,pane,a,y){const P=PANES[pane];s.surf=pane;s.p=[0,0,0];s.p[P.ax]=a;s.p[P.fix]=P.v();s.p[1]=y;}
function addCrawler(sp,n){const S=CRAWLSP[sp];for(let i=0;i<n;i++){const s={sp,surf:'floor',p:[0,0,0],h:Math.random()*TAU,var:Math.random(),size:S.L*(0.88+Math.random()*0.24),bury:S.burrow?1:S.sandOnly?0.4:0,walk:Math.random()*10};
    const nb=S.cat!=='snail',r=Math.random();let pane=S.sandOnly||S.burrow||S.cat==='star'&&sp==='brittle'?null:r<0.22?'front':r<0.42?'back':r<0.52?'left':r<0.62?'right':null;
    // stars and urchins stay off the back glass: against the background they would seem to float in open water
    // stars and urchins keep to the side glass: seen from inside the front pane they block the view (a star is 14 cm across)
    if((pane==='back'||pane==='front')&&nb)pane=r<0.11?'left':r<0.25?'right':null;
    if(pane){const P=PANES[pane],lo=P.ax===0?TK.x0+3:TK.z0+3,hi=P.ax===0?TK.x1-3:TK.z1-3,a=lerp(lo,hi,Math.random());const fl=P.ax===0?sandH(a,P.v()):sandH(P.v(),a);onPane(s,pane,a,lerp(fl+2,pane==='back'?TK.wl*0.45:pane==='front'?TK.wl*0.6:TK.wl-4,Math.random()));}
    else{let x=0,z=0;for(let t=0;t<10;t++){x=lerp(TK.x0+5,TK.x1-5,Math.random());z=lerp(TK.z0+5,TK.z1-5,Math.random());if(!(S.sandOnly||S.burrow)||topH(x,z)-sandH(x,z)<0.5)break;}s.p=[x,topH(x,z),z];}
    crawlers.push(s);}}
function setCrawlerCount(sp,n){const cur=crawlers.filter(s=>s.sp===sp);if(cur.length<n)addCrawler(sp,n-cur.length);else if(cur.length>n){let k=cur.length-n;crawlers=crawlers.filter(s=>!(s.sp===sp&&k-->0));}}
function crawlerUpdate(dt){const night=LIGHT.night;for(const s of crawlers){const S=CRAWLSP[s.sp];s.tuck=lerp(s.tuck||0,s.stop>0?1:0,Math.min(1,dt*(s.stop>0?8:1.5)));if(s.stop>0){s.stop-=dt;continue;}
    let speed=S.speed*(S.night?(night>0.5?3:0.25):1);
    // nassarius: buried until food lands, then out and racing to it; sand sifter dives under now and then
    if(S.burrow){let fo=null,fd=40;for(const f of foods){if(f.state==='rest'&&!f.eaten){const d=V.dist(f.p,s.p);if(d<fd){fd=d;fo=f;}}}
      s.out=(s.out||0)-dt;if(fo){s.out=25+Math.random()*20;s.h=Math.atan2(fo.p[2]-s.p[2],fo.p[0]-s.p[0])+(noise3(NOW()*0.3,s.var*9,1))*0.4;speed=1.3;if(fd<1){fo.nib=(fo.nib||0)+dt;if(fo.nib>16)eatFood(fo,'snail');speed=0;}}
      s.bury=lerp(s.bury,s.out>0?0:1,clamp(dt*(s.out>0?1.5:0.15),0,1));if(s.bury>0.8&&!fo)speed*=0.1;}
    if(S.sandOnly){s.dive=(s.dive||0)-dt;if(s.dive<=0)s.dive=40+Math.random()*60;s.bury=lerp(s.bury,s.dive<12?1:0.35,clamp(dt*0.3,0,1));}
    s.buried=s.bury>0.7;
    s.h+=(noise3(NOW()*0.05,s.var*20,0))*dt*0.35;const sp=speed*dt;s.walk+=sp/Math.max(0.5,s.size*0.08);
    if(s.surf==='floor'){s.p[0]+=Math.cos(s.h)*sp;s.p[2]+=Math.sin(s.h)*sp;
      if(S.sandOnly||S.burrow){if(topH(s.p[0],s.p[2])-sandH(s.p[0],s.p[2])>0.6){s.p[0]-=Math.cos(s.h)*sp*2;s.p[2]-=Math.sin(s.h)*sp*2;s.h+=PI*(0.5+Math.random()*0.5);}}
      s.p[1]=(S.sandOnly||S.burrow)?sandH(s.p[0],s.p[2]):topH(s.p[0],s.p[2]);
      const m=0.8+s.size*0.15;let pane=null;if(s.p[2]>TK.z1-m)pane='front';else if(s.p[2]<TK.z0+m)pane='back';else if(s.p[0]<TK.x0+m)pane='left';else if(s.p[0]>TK.x1-m)pane='right';
      if(pane){if(S.sandOnly||S.burrow||s.sp==='brittle'||((pane==='back'||pane==='front')&&S.cat!=='snail')){s.h+=PI;s.p[0]=clamp(s.p[0],TK.x0+m+0.1,TK.x1-m-0.1);s.p[2]=clamp(s.p[2],TK.z0+m+0.1,TK.z1-m-0.1);}
        else{const P=PANES[pane];onPane(s,pane,clamp(s.p[P.ax],(P.ax===0?TK.x0:TK.z0)+1,(P.ax===0?TK.x1:TK.z1)-1),s.p[1]+0.3);s.h=PI/2+(Math.random()-0.5)*0.6;}}}
    else{const P=PANES[s.surf];s.p[P.ax]+=Math.cos(s.h)*sp;s.p[1]+=Math.sin(s.h)*sp;s.p[P.fix]=P.v();
      const fl=sandH(s.p[0],s.p[2])+0.5;
      if(s.p[1]<fl){if(Math.random()<0.5){const n=P.n;s.surf='floor';s.p=[s.p[0]+n[0]*(1.2+s.size*0.2),0,s.p[2]+n[2]*(1.2+s.size*0.2)];s.p[1]=topH(s.p[0],s.p[2]);s.h=Math.atan2(n[2],n[0])+(Math.random()-0.5)*1.2;}
        else{s.h=PI/2+(Math.random()-0.5);s.p[1]=fl;}}
      // on the back glass snails keep to the lower part, under the rock line: higher up, against the open blue, they seem to float
      const ytop=s.surf==='back'?TK.wl*0.45:s.surf==='front'?TK.wl*0.6:TK.wl-1.5-s.size*0.2;if(s.p[1]>ytop){s.h=-PI/2+(Math.random()-0.5);s.p[1]=ytop;}
      const lo=(P.ax===0?TK.x0:TK.z0)+0.6+s.size*0.2,hi=(P.ax===0?TK.x1:TK.z1)-0.6-s.size*0.2,a=s.p[P.ax];
      if(a<lo||a>hi){const atHi=a>hi;let next,na;
        if(P.ax===0){next=atHi?'right':'left';na=s.surf==='front'?TK.z1-1-s.size*0.2:TK.z0+1+s.size*0.2;}else{next=atHi?'front':'back';na=s.surf==='right'?TK.x1-1-s.size*0.2:TK.x0+1+s.size*0.2;}
        if((next==='back'||next==='front')&&S.cat!=='snail'){s.h=PI-s.h;s.p[P.ax]=clamp(a,lo,hi);}
        else{const goingUp=Math.sin(s.h),Q=PANES[next],dirNext=(na>0?-1:1);const y=s.p[1];onPane(s,next,na,y);
        s.h=Math.atan2(goingUp,dirNext*Math.max(0.3,Math.abs(Math.cos(s.h))));}}}}}

// ---------- peacock mantis shrimp: a burrow in the sand by the rocks ----------
let mantis=[];
function mantisBurrow(){for(let k=0;k<60;k++){const x=lerp(TK.x0+8,TK.x1-8,Math.random()),z=lerp(TK.z0+6,TK.z1-6,Math.random());const sd=sdfAt(x,z);if(topH(x,z)-sandH(x,z)<0.4&&sd>0.5&&sd<4)return[x,sandH(x,z),z];}return[lerp(-30,30,Math.random()),sandH(0,8),8];}
function addMantis(n){for(let i=0;i<n;i++){const b=mantisBurrow();mantis.push({sp:'peacock',b,p:b.slice(),yaw:Math.random()*TAU,state:'hide',t:4+Math.random()*6,walk:0,strike:0,size:MANTISSP.peacock.L*(0.9+Math.random()*0.2),var:Math.random(),out:0,tgt:null});}}
function setMantisCount(n){if(mantis.length<n)addMantis(n-mantis.length);else mantis.length=n;}
function mantisUpdate(dt){for(const m of mantis){m.t-=dt;m.strike=Math.max(0,m.strike-dt*3);
    if(!(sandH(m.b[0],m.b[2])>-1))m.b=mantisBurrow();m.b[1]=sandH(m.b[0],m.b[2]);
    if(m.state==='hide'){m.out=lerp(m.out,0.25,clamp(dt*2,0,1));m.p=V.lerp(m.p,m.b,clamp(dt*3,0,1));m.yaw+=Math.sin(NOW()*0.3+m.var*9)*dt*0.2;
      if(m.t<=0){const food=foods.find(f=>f.state==='rest'&&!f.eaten&&V.dist(f.p,m.b)<22);m.state=food||Math.random()<0.45?'out':'hide';m.t=m.state==='out'?12+Math.random()*16:5+Math.random()*10;if(food)m.tgt=food;else{const a=Math.random()*TAU,r=4+Math.random()*9;m.tgt={p:[clamp(m.b[0]+Math.cos(a)*r,TK.x0+3,TK.x1-3),0,clamp(m.b[2]+Math.sin(a)*r,TK.z0+3,TK.z1-3)]};}}}
    else if(m.state==='out'){m.out=lerp(m.out,1,clamp(dt*1.5,0,1));
      // hunt: snails and hermits near the burrow get a punch
      if(!m.prey&&Math.random()<dt*0.2){for(const c of crawlers)if(CRAWLSP[c.sp].cat==='snail'&&c.surf==='floor'&&!c.buried&&V.dist(c.p,m.b)<18){m.prey=c;break;}}
      const tg=m.prey&&crawlers.includes(m.prey)?m.prey.p:m.tgt?m.tgt.p:m.b;const d=Math.atan2(tg[2]-m.p[2],tg[0]-m.p[0]),dist=Math.hypot(tg[0]-m.p[0],tg[2]-m.p[2]);
      m.yaw+=clamp(angDiff(m.yaw,d),-1.8*dt,1.8*dt);if(dist>m.size*0.45){const sp=2.4;m.p[0]+=Math.cos(m.yaw)*sp*dt;m.p[2]+=Math.sin(m.yaw)*sp*dt;m.walk+=dt*TAU*2.4;}
      else if(m.prey){m.strike=1;m.prey.stop=4;m.prey=null;m.t=Math.min(m.t,3);}
      else if(m.tgt&&m.tgt.state==='rest'){m.tgt.nib=(m.tgt.nib||0)+dt*2;if(m.tgt.nib>10)eatFood(m.tgt,'mantis');m.tgt=null;}
      m.p[1]=topH(m.p[0],m.p[2]);if(m.t<=0){m.state='back';m.t=20;}}
    else{m.out=lerp(m.out,1,clamp(dt*1.5,0,1));const d=Math.atan2(m.b[2]-m.p[2],m.b[0]-m.p[0]),dist=Math.hypot(m.b[0]-m.p[0],m.b[2]-m.p[2]);
      if(dist>0.8){m.yaw+=clamp(angDiff(m.yaw,d+PI),-2.4*dt,2.4*dt);const sp=3;m.p[0]+=Math.cos(d)*sp*dt;m.p[2]+=Math.sin(d)*sp*dt;m.walk-=dt*TAU*2.4;m.p[1]=topH(m.p[0],m.p[2]);}
      else{m.state='hide';m.t=8+Math.random()*14;m.yaw+=PI*0;}}}}

// ---------- jellyfish ----------
let jellies=[];
function addJelly(sp,n){const J=JELLYSP[sp];for(let i=0;i<n;i++){const x=lerp(-30,30,Math.random()),z=lerp(-10,10,Math.random());
  jellies.push({sp,p:J.type===1?[x,sandH(x,z),z]:[x,lerp(18,34,Math.random()),z],v:[0,0,0],ax:V.norm([(Math.random()-0.5)*0.4,1,(Math.random()-0.5)*0.4]),ph:Math.random(),rate:J.type===1?0.75+Math.random()*0.3:0.55+Math.random()*0.25,size:J.L*(0.8+Math.random()*0.4),var:Math.random(),hop:0});}}
function setJellyCount(sp,n){const cur=jellies.filter(s=>s.sp===sp);if(cur.length<n)addJelly(sp,n-cur.length);else if(cur.length>n){let k=cur.length-n;jellies=jellies.filter(s=>!(s.sp===sp&&k-->0));}}
function jellyUpdate(dt){for(const j of jellies){const J=JELLYSP[j.sp];j.ph=(j.ph+dt*j.rate)%1;
    if(J.type===1){j.hop=Math.max(0,j.hop-dt);j.p[1]=lerp(j.p[1],sandH(j.p[0],j.p[2])+(j.hop>0?3*Math.sin(PI*j.hop/2.5):0),clamp(dt*3,0,1));
      if(j.hop>0){j.p[0]+=j.v[0]*dt;j.p[2]+=j.v[2]*dt;}else if(Math.random()<dt*0.004){j.hop=2.5;const a=Math.random()*TAU;j.v=[Math.cos(a)*4,0,Math.sin(a)*4];}
      if(topH(j.p[0],j.p[2])-sandH(j.p[0],j.p[2])>0.5){j.p[0]-=j.v[0]*dt*2;j.p[2]-=j.v[2]*dt*2;}
      j.p[0]=clamp(j.p[0],TK.x0+j.size*0.6,TK.x1-j.size*0.6);j.p[2]=clamp(j.p[2],TK.z0+j.size*0.6,TK.z1-j.size*0.6);j.ax=topNormal(j.p[0],j.p[2]);continue;}
    // moon jelly: each contraction pushes it along its axis; between pulses it sinks slowly and drifts with the surge
    const c=j.ph<0.32?Math.sin(PI*j.ph/0.32):0;j.v=V.madd(j.v,j.ax,c*dt*7);j.v=V.mul(j.v,Math.exp(-dt*1.2));j.v[1]-=dt*0.35;j.v=V.madd(j.v,FLOW.vec,dt*0.25);
    // steer the bell: wander, away from walls, sand and surface, mostly upright
    const want=[noise3(NOW()*0.07,j.var*9,1)*0.6,1,noise3(NOW()*0.07,j.var*9,5)*0.6],m=j.size*0.8+3;
    if(j.p[0]<TK.x0+m)want[0]+=1.5;if(j.p[0]>TK.x1-m)want[0]-=1.5;if(j.p[2]<TK.z0+m)want[2]+=1.5;if(j.p[2]>TK.z1-m)want[2]-=1.5;
    if(j.p[1]>TK.wl-j.size*0.6)want[1]=-0.6;if(j.p[1]<topH(j.p[0],j.p[2])+j.size*1.2)want[1]=2;
    j.ax=V.norm(V.lerp(j.ax,V.norm(want),clamp(dt*0.35,0,1)));
    j.p=V.madd(j.p,j.v,dt);j.p[0]=clamp(j.p[0],TK.x0+j.size*0.55,TK.x1-j.size*0.55);j.p[2]=clamp(j.p[2],TK.z0+j.size*0.55,TK.z1-j.size*0.55);
    j.p[1]=clamp(j.p[1],topH(j.p[0],j.p[2])+j.size*0.7,TK.wl-j.size*0.35);}}

// ---------- retracting animals (feather dusters, clams) ----------
function sessileUpdate(dt){for(const it of items){const c=CAT[it.kind];
    // polyp corals (star polyps, clove polyps, Goniopora) pull their polyps in at night and open again in the morning
    if(c.nightClose){const tg=LIGHT.night>0.5?1:0;it.retract=lerp(it.retract||0,tg,clamp(dt*0.25,0,1));continue;}
    if(!c.retract)continue;
    // a fish passing right over the crown or a shadow on the mantle
    if(!(it.retractT>0)&&Math.random()<dt*2){const top=V.add(it.wc,[0,it.wr*0.35,0]);for(const f of fish){if(V.dist(f.p,top)<f.size*0.4+it.wr*0.5&&Math.random()<0.35){it.retractT=2+Math.random()*3;break;}}}
    it.retractT=(it.retractT||0)-dt;const tg=it.retractT>0?1:0;it.retract=lerp(it.retract||0,tg,clamp(dt*(tg>it.retract?14:0.7),0,1));}}

// ---------- food ----------
let foods=[],plankton=[];
function dropFood(type,x,z){const F=FOODS[type];const sx=clamp(x,TK.x0+3,TK.x1-3),sz=clamp(z,TK.z0+3,TK.z1-3);
  if(F.cloud){for(let i=0;i<160&&plankton.length<900;i++){const a=Math.random()*TAU,r=Math.random()*4;plankton.push({p:[sx+Math.cos(a)*r,TK.wl-1-Math.random()*4,sz+Math.sin(a)*r],v:[(Math.random()-0.5)*2,-0.6-Math.random(),(Math.random()-0.5)*2],life:40+Math.random()*40,s:Math.random()});}
    TANK.coral=clamp(TANK.coral+1.5,0,100);addRipple(sx,sz,1);return;}
  for(let i=0;i<F.n;i++){const r=Math.random()*(type==='nori'?1:2),a=Math.random()*TAU;
    foods.push({type,p:[sx+Math.cos(a)*r,TK.wl-0.1-Math.random()*0.3,sz+Math.sin(a)*r],state:F.float?'float':'sink',age:0,yaw:Math.random()*TAU,pitch:Math.random()*PI,spin:(Math.random()-0.5)*3,eaten:false,
      col:type==='pellet'?[[.36,.18,.08],[.45,.25,.1],[.3,.22,.12]][Math.floor(Math.random()*3)]:type==='mysis'?[.8,.72,.66]:[.03,.12,.04],ph:Math.random()*TAU,floatT:F.float?F.float*(0.5+Math.random()):0,size:type==='nori'?2.2+Math.random():1});}
  addRipple(sx,sz,1);}
function eatFood(f,who){f.eaten=true;foods=foods.filter(x=>x!==f);const F=FOODS[f.type];TANK.fed=clamp(TANK.fed+F.val*(who==='fish'?0.6:0.25),0,100);TANK.lastFed=Date.now();}
function foodUpdate(dt){for(const f of foods){f.age+=dt;
    if(f.state==='float'){f.floatT-=dt;f.p[0]+=(Math.sin(NOW()*0.3+f.ph)*0.3+FLOW.vec[0]*0.3)*dt;f.p[2]+=FLOW.vec[2]*0.3*dt;if(f.floatT<=0)f.state='sink';}
    else if(f.state==='sink'){const F=FOODS[f.type];f.p[1]-=F.sink*dt;f.p[0]+=(Math.sin(NOW()*1.3+f.ph)*0.4+FLOW.vec[0]*0.5)*dt;f.p[2]+=FLOW.vec[2]*0.5*dt;f.yaw+=f.spin*dt;f.pitch+=f.spin*dt*0.7;
      f.p[0]=clamp(f.p[0],TK.x0+1,TK.x1-1);f.p[2]=clamp(f.p[2],TK.z0+1,TK.z1-1);
      const g=topH(f.p[0],f.p[2]);if(f.p[1]<=g+0.12){f.p[1]=g+0.12;f.state='rest';f.age=0;kickDust(f.p[0],f.p[2],4,0.4,0.9);f.pitch=0;}}}
  foods=foods.filter(f=>{if(f.state==='rest'&&f.age>300){TANK.water=clamp(TANK.water-1.2,0,100);return false;}return true;});
  // coral food drifts with the surge; corals, dusters and clams filter it out as it passes
  for(const q of plankton){q.life-=dt;q.v[1]=lerp(q.v[1],-0.25,dt*0.5);q.p=V.madd(q.p,V.add(q.v,V.mul(FLOW.vec,0.6)),dt);q.v=V.mul(q.v,Math.exp(-dt*0.8));
    q.p[0]=clamp(q.p[0],TK.x0+0.5,TK.x1-0.5);q.p[2]=clamp(q.p[2],TK.z0+0.5,TK.z1-0.5);if(q.p[1]<topH(q.p[0],q.p[2])+0.3)q.life-=dt*6;}
  plankton=plankton.filter(q=>q.life>0);}

// ---------- bubbles, ripples, particles ----------
let bubbles=[];const ripples=new Float32Array(64);let ripI=0;let emitAcc=new Map();
function spawnBubble(p,r){if(bubbles.length<700){const a=Math.random()*TAU,dr=Math.random()*0.8;bubbles.push({p:p.slice(),r,vy:0,ph:Math.random()*TAU,wob:0.6+Math.random()*0.8,dx:Math.cos(a)*dr,dz:Math.sin(a)*dr});}}
// pearling: under strong light, oxygen bubbles form on leaves and float up (stiff leaf parts only, so leaf sway barely shows)
let pearlAcc=0;
function pearlUpdate(dt){if(LIGHT.night>0.5||LIGHT.lcol[1]<1.2)return;pearlAcc+=dt*LIGHT.lcol[1]*0.18;
  while(pearlAcc>1){pearlAcc-=1;const pl=items.filter(it=>CAT[it.kind].cat==='algae'&&it.geo&&it.geo.mb);if(!pl.length)return;
    const it=pl[Math.floor(Math.random()*pl.length)],mb=it.geo.mb,n=mb.n;
    for(let t=0;t<6;t++){const k=Math.floor(Math.random()*n);if(mb.C[k*4+3]>0.6)continue;const q=M4.xf(it.M,[mb.P[k*3],mb.P[k*3+1],mb.P[k*3+2]]);
      if(q[1]<topH(q[0],q[2])+0.8||q[1]>TK.wl-1.5)continue;spawnBubble(q,0.03+Math.random()*0.03);break;}}}
function addRipple(x,z,a){simDrop(x,z,0.9+a*0.6,0.05*a);}
let lastPop=0;
function bubbleUpdate(dt){const em=emitters();
  for(const e of em){if(!e.it.on&&e.it.on!==undefined)continue;let a=(emitAcc.get(e.it)||0)+dt*e.rate*SETTINGS.air;
    while(a>=1){a-=1;const ang=Math.random()*TAU,rr=Math.sqrt(Math.random())*e.spread;spawnBubble([e.p[0]+Math.cos(ang)*rr,e.p[1],e.p[2]+Math.sin(ang)*rr],lerp(e.r[0],e.r[1],Math.pow(Math.random(),1.5)));}
    emitAcc.set(e.it,a);}
  // small bubbles rise at 15-25 cm/s and zig-zag; the stream fans out a little as it climbs
  for(const b of bubbles){if(b.surf)continue;const vt=clamp(11+b.r*75,11,28);b.vy=lerp(b.vy,vt,clamp(dt*6,0,1));b.p[1]+=b.vy*dt;b.ph+=dt*(10+b.wob*8);b.p[0]+=(Math.sin(b.ph)*b.r*b.wob*6+(b.dx||0))*dt;b.p[2]+=(Math.cos(b.ph*0.8)*b.r*b.wob*5+(b.dz||0))*dt;b.r*=1+dt*0.025;}
  // at the surface a bubble lingers for a moment, half out of the water, drifting outward before it pops
  bubbles=bubbles.filter(b=>{if(b.surf){b.life-=dt;b.p[0]+=(b.dx||0)*dt*2.2;b.p[2]+=(b.dz||0)*dt*2.2;b.p[1]=TK.wl-b.r*0.3+Math.sin(b.ph+=dt*6)*0.01;
      if(b.life<=0||b.p[0]<TK.x0+0.5||b.p[0]>TK.x1-0.5||b.p[2]<TK.z0+0.5||b.p[2]>TK.z1-0.5){simDrop(b.p[0],b.p[2],b.r*2.2+0.4,0.008+b.r*0.06);return false;}return true;}
    if(b.p[1]>=TK.wl-b.r*0.5){simDrop(b.p[0],b.p[2],b.r*2.2+0.4,0.012+b.r*0.09);if(b.r<0.22&&Math.random()<0.55){b.surf=true;b.life=0.25+Math.random()*1.3;b.vy=0;return true;}return false;}return true;});}
const NPART=480;const parts=new Float32Array(NPART*4);
// sand dust kicked up by landings, steps and sinking food: drifts, spreads and settles
const dust=[];
function kickDust(x,z,n,spread,spd){const g=topH(x,z);for(let i=0;i<n&&dust.length<180;i++){const a=Math.random()*TAU,r=Math.random()*spread,u=Math.random();
  dust.push({p:[x+Math.cos(a)*r,g+0.45+u*0.7,z+Math.sin(a)*r],v:[Math.cos(a)*spd*(0.4+Math.random()),spd*(0.35+u*0.7),Math.sin(a)*spd*(0.4+Math.random())],age:0,max:2.5+Math.random()*3,s:0.35+Math.random()*0.45,seed:Math.random()});}}
function dustUpdate(dt){for(const q of dust){q.age+=dt;const k=Math.exp(-dt*2.4);q.v[0]*=k;q.v[2]*=k;q.v[1]=q.v[1]*k-0.22*dt;
  q.p[0]+=q.v[0]*dt;q.p[1]+=q.v[1]*dt;q.p[2]+=q.v[2]*dt;const g=topH(q.p[0],q.p[2])+q.s*0.6;if(q.p[1]<g){q.p[1]=g;q.v[1]=0;}}
  for(let i=dust.length-1;i>=0;i--)if(dust[i].age>dust[i].max)dust.splice(i,1);}
function initParticles(){for(let i=0;i<NPART;i++){parts[i*4]=lerp(TK.x0,TK.x1,Math.random());parts[i*4+1]=lerp(2,TK.wl,Math.random());parts[i*4+2]=lerp(TK.z0,TK.z1,Math.random());parts[i*4+3]=Math.random();}}
function particleUpdate(dt){const t=NOW();for(let i=0;i<NPART;i++){const o=i*4,s=parts[o+3];
  parts[o]+=(0.12+Math.sin(t*0.1+s*20)*0.15+FLOW.vec[0]*0.7)*dt;parts[o+2]+=FLOW.vec[2]*0.7*dt;parts[o+1]+=(Math.sin(t*0.3+s*40)*0.12-0.03)*dt;parts[o+2]+=Math.cos(t*0.13+s*30)*0.15*dt;
  if(parts[o]>TK.x1)parts[o]=TK.x0;if(parts[o]<TK.x0)parts[o]=TK.x1;if(parts[o+1]<1)parts[o+1]=TK.wl-1;if(parts[o+1]>TK.wl)parts[o+1]=2;if(parts[o+2]>TK.z1)parts[o+2]=TK.z0;if(parts[o+2]<TK.z0)parts[o+2]=TK.z1;}}
function simStep(dt){SIMT+=dt;tankTick(dt);flowUpdate();fishUpdate(dt);shrimpUpdate(dt);crabUpdate(dt);crawlerUpdate(dt);mantisUpdate(dt);jellyUpdate(dt);sessileUpdate(dt);foodUpdate(dt);bubbleUpdate(dt);pearlUpdate(dt);particleUpdate(dt);dustUpdate(dt);}
