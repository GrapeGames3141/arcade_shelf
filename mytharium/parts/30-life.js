
// ============================================================
//  LIFE · terrarium care, creatures, behaviour, food, particles, events
// ============================================================
let SIMT=0,LAST_DT=1/60;
// ---------- terrarium climate ----------
const TERR={humid:72,mistD:.0008,fog:.4,groundWilt:0,spray:0,dryT:0,happy:.8,pearls:3,sing:0,rainbow:0,rainbowP:[0,30,0]};
function climate(dt){const T=TERR;
  const target=46-SETTINGS.heat*6;T.humid+=(target-T.humid)*dt/220;T.humid+=dt*.4*(SETTINGS.mist?1:0);T.humid=clamp(T.humid,5,100);
  if(T.spray>0){T.spray=Math.max(0,T.spray-dt);}
  T.fog=lerp(T.fog,clamp((T.humid-48)/40,0,1)*.9+(T.spray>0?.15:0),clamp(dt*.25,0,1));
  T.mistD=lerp(T.mistD,.0004+clamp((T.humid-60)/40,0,1)*.0012+(T.spray>0?.004:0)+LIGHT.night*.0022,clamp(dt*(T.spray>0?3:.4),0,1));
  T.groundWilt=lerp(T.groundWilt,clamp((38-T.humid)/25,0,1)*.8,clamp(dt*.02,0,1));
  // plants wilt in dry air and recover when it is damp; flowers open by day, close at night
  for(const it of items){const g=it.geo;if(g.wilts){it.wilt=clamp((it.wilt||0)+dt*(T.humid<38?.006:T.humid>52?-.01:0),0,1);}
    if(g.blooms){const want=it.dust>0?1:lerp(1,.5,LIGHT.night);it.bloom=lerp(it.bloom===undefined?1:it.bloom,want,clamp(dt*.4,0,1));if(it.dust>0)it.dust-=dt;}
    if(g.egg){it.warm=SETTINGS.heat>0&&Math.hypot(it.x-HEATP[0],it.z-HEATP[2])<16;it.hatch=clamp((it.hatch||0)+(it.warm?dt/(TEST?20:240)*SETTINGS.heat:-dt/900),0,1);
      if(it.hatch>=1){const p=[it.x,0,it.z],m=it.morph||0;removeItem(it);const d=addCrit('dragon',{morph:m,pos:p,size:.72});if(d){d.name=pick(Math.random,['Spark','Ash','Fern','Frost','Pip']);sparkle(V.add(p,[0,topH(p[0],p[2])+1,0]),[1,.7,.3],14);
        if(typeof toast==='function')toast('A dragon egg hatched! Say hello to '+d.name);event(d,'hatch');}break;}}}
  // rainbow: misting while the LED is bright paints an arc in the spray
  T.rainbow=lerp(T.rainbow,T.spray>0&&LIGHT.night<.4?1:0,clamp(dt*(T.spray>0?2:.35),0,1));}
// ---------- species ----------
// colours are linear RGB; c1 body, c2 mane/hair/belly/tail, c3 horn/accent/cloth, c4 eyes
const L_=hexL;
const SPECIES={
  unicorn:{name:'Unicorn',asset:'unicorn',scale:1.12,walk:5.5,trot:13,step:1.6,morphs:[
    {name:'Moonbeam',c1:L_('#efebe4'),c2:L_('#a99ccc'),c3:L_('#f3e6ff'),c4:L_('#3a2a4a')},
    {name:'Aurora',c1:L_('#f3e9dc'),c2:L_('#f0b8d8'),c3:L_('#ffe9b0'),c4:L_('#2a3a5a'),rainbow:1},
    {name:'Dusk',c1:L_('#8c8a92'),c2:L_('#2b2a33'),c3:L_('#ffd88a'),c4:L_('#2a2016')},
    {name:'Starlight',c1:L_('#1e1d24'),c2:L_('#2e3f7a'),c3:L_('#bcd8ff'),c4:L_('#1a2a50')},
    {name:'Honey',c1:L_('#c99c62'),c2:L_('#f3ead8'),c3:L_('#fff1d0'),c4:L_('#2a1a10')}]},
  foal:{name:'Unicorn foal',asset:'foal',scale:.66,walk:4.5,trot:10,step:1.1,morphs:null},
  pegasus:{name:'Pegasus',asset:'pegasus',scale:1.05,walk:5.5,trot:12,step:1.6,fly:22,morphs:[
    {name:'Cloud',c1:L_('#f4f2ee'),c2:L_('#f7f5f0'),c3:L_('#9aa0aa'),c4:L_('#20242c')},
    {name:'Sunset',c1:L_('#9a5a32'),c2:L_('#e8c08a'),c3:L_('#5a2a14'),c4:L_('#20140c')}]},
  faerie:{name:'Faerie',asset:'faerie',scale:1,fly:16,morphs:[
    {name:'Thistle',c1:L_('#f2d2be'),c2:L_('#efe6d6'),c3:L_('#d68aa8'),c4:L_('#3a8a6a'),wing:0,w1:[.4,.9,.8],w2:[.6,1,.9],glow:[.55,1,.75]},
    {name:'Rose',c1:L_('#f0c8b4'),c2:L_('#c8643c'),c3:L_('#e4709a'),c4:L_('#5a3a2a'),wing:1,w1:L_('#f2a2c0'),w2:L_('#7a2a6a'),glow:[1,.55,.75]},
    {name:'Luna',c1:L_('#e8d0c4'),c2:L_('#1c1a22'),c3:L_('#a8d8b8'),c4:L_('#4a6a8a'),wing:2,w1:L_('#cfe8d0'),w2:L_('#7fb89a'),glow:[.6,.85,1]},
    {name:'Bramble',c1:L_('#b8866a'),c2:L_('#4a8a3a'),c3:L_('#c8a04a'),c4:L_('#2a4a2a'),wing:0,w1:[.7,.6,.3],w2:[.9,.8,.4],glow:[1,.85,.45],short:1}]},
  mermaid:{name:'Mermaid',asset:'mermaid',scale:1,swim:9,morphs:[
    {name:'Marina',c1:L_('#ecc6ae'),c2:L_('#2f8a7a'),c3:L_('#8ad8d0'),c4:L_('#2a6a5a'),hair:L_('#b0482a'),tail1:L_('#1f6a64'),tail2:L_('#3fb0a0')},
    {name:'Coral',c1:L_('#f2cdb6'),c2:L_('#e8784a'),c3:L_('#f8c8a0'),c4:L_('#4a3020'),hair:L_('#e8c87a'),tail1:L_('#c8483a'),tail2:L_('#f0a050')},
    {name:'Abyss',c1:L_('#d8b49c'),c2:L_('#3a3a9a'),c3:L_('#b0a0ff'),c4:L_('#2a2a5a'),hair:L_('#14141c'),tail1:L_('#2a2470'),tail2:L_('#6a4ac8')}]},
  dragon:{name:'Dragon hatchling',asset:'dragon',scale:1,walk:4.5,trot:9,step:1.2,fly:20,morphs:[
    {name:'Ember',c1:L_('#a8361a'),c2:L_('#e8a83a'),c3:[1,.45,.12],c4:L_('#f2c23a'),fire:[1,.5,.15]},
    {name:'Moss',c1:L_('#3a6a2a'),c2:L_('#d8c890'),c3:[.4,.9,.5],c4:L_('#e8d84a'),fire:[.6,1,.4]},
    {name:'Frost',c1:L_('#a8c8e0'),c2:L_('#f2f6fa'),c3:[.5,.8,1],c4:L_('#5ac8f2'),fire:[.55,.85,1]}]},
  gnome:{name:'Gnome',asset:'gnome',scale:1,walk:3.2,trot:6,step:.9,morphs:[
    {name:'Bramblebeard',c1:L_('#e8b096'),c2:L_('#b8241a'),c3:L_('#2a4a8a'),c4:L_('#2a2018'),beard:L_('#ece8e0')}]},
  phoenix:{name:'Phoenix',asset:'phoenix',scale:1,fly:26,morphs:[{name:'Phoenix',c1:L_('#e8401a'),c2:L_('#ffb83a'),c3:L_('#ffe08a'),c4:L_('#1a1008')}]},
};
const FOALM=SPECIES.unicorn.morphs;SPECIES.foal.morphs=FOALM;
// ---------- creatures ----------
let crits=[];let critId=1;
const NAMES={unicorn:['Moonbeam','Willow','Seraphina','Clover','Nimbus','Opal'],foal:['Pip','Bramble','Dewdrop'],pegasus:['Zephyr','Cirrus'],faerie:['Thistle','Rosalind','Luna','Bramble','Fennel','Wren'],
  mermaid:['Marina','Coralie','Nerys'],dragon:['Ember','Cinder','Sprout','Rime'],gnome:['Bramblebeard','Tobias'],phoenix:['Phoenix']};
function addCrit(sp,o={}){const S=SPECIES[sp];if(!S)return null;ensureAsset(S.asset);const morph=o.morph!==undefined?o.morph:Math.floor(Math.random()*S.morphs.length);
  const c={id:critId++,sp,morph,name:o.name||pick(Math.random,NAMES[sp])||S.name,pos:o.pos||spawnPos(sp),yaw:o.yaw||Math.random()*TAU,vel:[0,0,0],speed:0,state:'idle',t:0,dur:2+Math.random()*3,target:null,
    hunger:.3+Math.random()*.2,energy:.8,happy:.7,phase:Math.random(),R:[],out:{},blink:0,blinkT:Math.random()*4,anim:{},hang:[0,0,0],wet:0,size:(o.size||1)*S.scale*(.94+Math.random()*.12),
    look:null,glow:0,pet:0,feet:null,seen:{},fly:0,perch:null,hidden:false};
  if(sp==='foal')c.size=S.scale*(.94+Math.random()*.1);
  crits.push(c);if(sp==='mermaid')c.pos[1]=PWL-3;else if(sp!=='faerie'&&sp!=='phoenix')c.pos[1]=topH(c.pos[0],c.pos[2]);return c;}
function removeCrit(c){const i=crits.indexOf(c);if(i>=0)crits.splice(i,1);if(SELECTED===c)SELECTED=null;}
function spawnPos(sp){for(let k=0;k<200;k++){const x=lerp(TK.ix0+6,TK.ix1-6,Math.random()),z=lerp(TK.iz0+8,TK.iz1-4,Math.random());
  if(sp==='mermaid'){if(waterDepth(x,z)>4)return[x,PWL-3,z];continue;}
  if(sp==='faerie'||sp==='phoenix')return[x,topH(x,z)+12+Math.random()*10,z];
  if(inPond(x,z))continue;const zoneOk=sp==='dragon'?x<-15:sp==='gnome'?Math.abs(x)<20:x>-25&&x<20;if(!zoneOk&&k<150)continue;if(walkable(x,z,sp))return[x,0,z];}
  return[0,0,10];}
// a spot is walkable when it is inside the glass, not water, not in front of the background relief, and not too steep
const wallGap=sp=>sp==='unicorn'||sp==='pegasus'?5.6:sp==='foal'||sp==='dragon'?4.2:3;
function walkable(x,z,sp){const m=wallGap(sp);if(x<TK.ix0+m||x>TK.ix1-m||z>TK.iz1-m)return false;const bz=TK.iz0+bgDepth(x,topH(x,z)+2)+2.5;if(z<bz)return false;if(inPond(x,z)&&waterDepth(x,z)>(sp==='unicorn'||sp==='pegasus'?1.2:.4))return false;return true;}
function stepOK(c,x,z){if(!walkable(x,z,c.sp))return false;const S=SPECIES[c.sp];const h0=topH(c.pos[0],c.pos[2]),h1=topH(x,z);return h1-h0<(S.step||1)*c.size;}
// ---------- needs and mood ----------
function needs(c,dt){c.hunger=clamp(c.hunger+dt/420,0,1);const night=LIGHT.night>.6;c.energy=clamp(c.energy+(c.state==='sleep'||c.state==='rest'?dt/80:-dt/(night?160:600)),0,1);
  const comfort=c.sp==='dragon'?(nearHeat(c.pos)?1:.5):c.sp==='mermaid'?1:clamp((TERR.humid-25)/30,0,1);
  const want=clamp(1-c.hunger*.6,0,1)*.5+comfort*.3+c.energy*.2+(c.pet>0?.2:0);c.happy=lerp(c.happy,clamp(want,0,1),clamp(dt*.02,0,1));if(c.pet>0)c.pet-=dt;}
function nearHeat(p){return SETTINGS.heat>0&&Math.hypot(p[0]-HEATP[0],p[2]-HEATP[2])<15;}
// ---------- food ----------
// kinds draw small meshes; eaters lists which species come for it
const FOODS={clover:{name:'Clover sprig',eaters:['unicorn','foal','pegasus'],col:[.2,.45,.12],mesh:'sprig'},apple:{name:'Apple slice',eaters:['unicorn','foal','pegasus','gnome'],col:[.85,.75,.45],mesh:'slice'},
  nectar:{name:'Nectar drop',eaters:['faerie'],col:[1,.75,.2],mesh:'drop',glossy:1},honey:{name:'Honey',eaters:['faerie','gnome'],col:[.85,.5,.08],mesh:'drop',glossy:1},
  seagrape:{name:'Sea grapes',eaters:['mermaid'],col:[.25,.6,.3],mesh:'berry',glossy:1,water:1},shrimp:{name:'Tiny shrimp',eaters:['mermaid','dragon'],col:[.9,.45,.35],mesh:'cricket',water:1},
  cricket:{name:'Cricket',eaters:['dragon'],col:[.25,.18,.1],mesh:'cricket',hops:1},coal:{name:'Glowing coal',eaters:['dragon'],col:[1,.4,.1],mesh:'berry',glow:1}};
let foods=[];
function dropFood(type,p){const F=FOODS[type];if(!F)return;const f={type,p:[p[0],p[1]+3,p[2]],v:[0,0,0],rest:false,t:0,yaw:Math.random()*TAU,claim:null};foods.push(f);if(foods.length>40)foods.shift();return f;}
function foodUpdate(dt){for(let i=foods.length-1;i>=0;i--){const f=foods[i];const F=FOODS[f.type];f.t+=dt;
  const g=topH(f.p[0],f.p[2]);const water=inPond(f.p[0],f.p[2]);
  if(!f.rest){f.v[1]-=(water&&f.p[1]<PWL?120:981)*dt;f.p=V.madd(f.p,f.v,dt);if(water&&f.p[1]<PWL&&f.v[1]<-4){f.v[1]*=.2;simDrop(f.p[0],f.p[2],.8,.12);splash(f.p,4);}
    if(f.p[1]<=g+.2){f.p[1]=g+.2;f.v=[0,0,0];f.rest=true;}}
  else if(F.hops&&Math.random()<dt*.7){const a=Math.random()*TAU;f.v=[Math.cos(a)*14,40,Math.sin(a)*14];f.rest=false;f.p[0]=clamp(f.p[0],TK.ix0+2,TK.ix1-2);f.p[2]=clamp(f.p[2],TK.iz0+6,TK.iz1-2);}
  if(f.t>240)foods.splice(i,1);}}
// ---------- particles ----------
// kind: 0 glow (add), 1 mist, 2 droplet, 3 smoke, 4 flame, 5 sparkle, 6 petal/leaf
const PMAX=3000;const parts=[];
function emit(kind,p,v,size,col,life,o={}){if(parts.length>=PMAX)parts.shift();parts.push({k:kind,p:[...p],v:[...v],s:size,c:col,life,age:0,g:o.g||0,drag:o.drag||0,grow:o.grow||0,seed:Math.random(),rot:Math.random()*TAU,spin:o.spin||0,a:o.a||1,str:o.str||0});}
function splash(p,n){for(let i=0;i<n;i++){const a=Math.random()*TAU;emit(2,[p[0],PWL+.1,p[2]],[Math.cos(a)*12,18+Math.random()*16,Math.sin(a)*12],.12+Math.random()*.1,[1,1,1],.6,{g:981});}}
function sparkle(p,col,n=6){for(let i=0;i<n;i++)emit(5,V.add(p,[(Math.random()-.5)*1.5,Math.random()*1.5,(Math.random()-.5)*1.5]),[0,1.5,0],.35+Math.random()*.2,col,1+Math.random(),{drag:1});}
function partUpdate(dt){for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.age+=dt;if(q.age>q.life){parts.splice(i,1);continue;}
  q.v[1]-=q.g*dt;if(q.drag)q.v=V.mul(q.v,Math.exp(-q.drag*dt));q.p=V.madd(q.p,q.v,dt);q.s+=q.grow*dt;q.rot+=q.spin*dt;
  if(q.k===2&&inPond(q.p[0],q.p[2])&&q.p[1]<PWL){simDrop(q.p[0],q.p[2],.5,.04);parts.splice(i,1);continue;}
  if(q.k===2||q.k===6){const g=groundH(q.p[0],q.p[2]);if(q.p[1]<g+.05){if(q.k===6){q.p[1]=g+.05;q.v=[0,0,0];q.g=0;}else{parts.splice(i,1);}}}}}
function splatParticlesGPU(){const vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,QUADBUF);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,PMAX*48*1.5,gl.DYNAMIC_DRAW);for(let i=0;i<3;i++){gl.enableVertexAttribArray(1+i);gl.vertexAttribPointer(1+i,4,gl.FLOAT,false,48,i*16);gl.vertexAttribDivisor(1+i,1);}
  gl.bindVertexArray(null);return{vao,buf:b,data:new Float32Array(PMAX*12*1.5)};}
function drawParticles(vp){const G=MESH.parts,D=G.data;let n=0;const cap=PMAX*1.5;
  const put=(p,s,c,a,k,seed,rot,str)=>{if(n>=cap)return;const o=n*12;D[o]=p[0];D[o+1]=p[1];D[o+2]=p[2];D[o+3]=s;D[o+4]=c[0];D[o+5]=c[1];D[o+6]=c[2];D[o+7]=a;D[o+8]=k;D[o+9]=seed;D[o+10]=rot;D[o+11]=str;n++;};
  for(const q of parts){const f=q.age/q.life;const fade=Math.min(1,q.age*8)*(1-f*f);put(q.p,q.s,q.c,q.a*fade,q.k,q.seed,q.rot,q.str);}
  // rainbow: an arc of soft coloured glows inside the spray, opposite the light
  if(TERR.rainbow>.02){const c=TERR.rainbowP;const R=16;for(let i=0;i<110;i++){const t=i/109;const a=lerp(.15,PI-.15,t);for(let b=0;b<6;b++){const hue=b/6;const col=hsvRgb(.0+hue*.78);
    put([c[0]+Math.cos(a)*(R+b*.55),c[1]+Math.sin(a)*(R+b*.55)*.8,c[2]],.9,col,TERR.rainbow*.05*Math.sin(t*PI),0,0,0,0);}}}
  if(!n)return;const P=PR.part;common(P,vp);U(P,'uCamR',CAM.R);U(P,'uCamU',CAM.Uv);gl.bindVertexArray(G.vao);gl.bindBuffer(gl.ARRAY_BUFFER,G.buf);gl.bufferSubData(gl.ARRAY_BUFFER,0,D,0,n*12);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,n);STATS.draws++;}
function hsvRgb(h){const f=(n)=>{const k=(n+h*6)%6;return 1-Math.max(0,Math.min(k,4-k,1));};return[f(5),f(3),f(1)];}
// ---------- events and journal ----------
const JOURNAL={entries:{},photos:[]};
const BEHAVIOURS={
  unicorn:[['graze','Grazing in the clover'],['drink','Drinking at the pond'],['rest','Resting in the meadow'],['rear','Rearing up'],['heal','Healing a wilted plant'],['rainbow','Standing under a rainbow'],['prance','Prancing for joy'],['glow','Horn glowing at night']],
  foal:[['follow','Trotting after its mother'],['graze','Nibbling clover'],['drink','Drinking at the pond'],['prance','Kicking up its heels'],['play','Giving a faerie a ride'],['sleep','Napping beside the herd']],
  pegasus:[['fly','Flying under the lid'],['perch','Perched up high'],['graze','Grazing']],
  faerie:[['sip','Sipping nectar'],['bloom','Waking the flowers'],['ride','Riding a unicorn'],['dance','Dancing in the faerie ring'],['sleep','Asleep in a mushroom'],['glow','Glowing at night']],
  mermaid:[['bask','Basking on a rock'],['sing','Singing at dusk'],['dive','Diving'],['pearl','Collecting pearls'],['splash','Splashing the dragon']],
  dragon:[['hatch','Hatching from an egg'],['bask','Basking under the heat lamp'],['lantern','Lighting a lantern'],['smoke','Blowing smoke rings'],['steal','Stealing a pearl'],['curl','Sleeping curled up'],['fly','Flying'],['hoard','Guarding the hoard']],
  gnome:[['tend','Tending the plants'],['pebble','Carrying a pebble'],['home','Going home at dusk'],['wave','Waving at you']],
  phoenix:[['arrive','Arriving'],['reborn','Reborn from the ashes']],
  wisp:[['seen','Will-o\'-wisps over the pond']],
};
let onEvent=null;
function event(c,key,label){const sp=c?(c.sp==='foal'?'foal':c.sp):'wisp';const id=sp+':'+key;if(JOURNAL.entries[id])return;if(!(BEHAVIOURS[sp]||[]).some(b=>b[0]===key))return;
  // must be on screen to count as observed
  const p=c?c.pos:[POND.cx,PWL+4,POND.cz];const s=M4.xf4(CAM.vp,p);if(!(Math.abs(s[0])<1&&Math.abs(s[1])<1&&s[2]<1)&&!TEST)return;
  JOURNAL.entries[id]={t:Date.now()};if(onEvent)onEvent(sp,key,label);}
// ---------- creature behaviour ----------
function pickWander(c,R=25){for(let k=0;k<30;k++){const a=Math.random()*TAU,d=4+Math.random()*R;const x=c.pos[0]+Math.cos(a)*d,z=c.pos[2]+Math.sin(a)*d;if(walkable(x,z,c.sp))return[x,0,z];}return null;}
function nearestItem(p,f,maxd=1e9){let best=null,bd=maxd;for(const it of items){if(!f(it))continue;const d=Math.hypot(it.x-p[0],it.z-p[2]);if(d<bd){bd=d;best=it;}}return best;}
function nearestFood(c){let best=null,bd=60;for(const f of foods){if(!FOODS[f.type].eaters.includes(c.sp))continue;if(f.claim&&f.claim!==c)continue;if(!f.rest&&!FOODS[f.type].water)continue;const d=V.dist(f.p,c.pos);if(d<bd){bd=d;best=f;}}return best;}
function setState(c,s,dur,extra){c.state=s;c.t=0;c.dur=dur;if(extra)Object.assign(c,extra);}
function faceToward(c,p,dt,rate=3){const d=Math.atan2(p[2]-c.pos[2],p[0]-c.pos[0]);const yt=-d;c.yaw+=angDiff(c.yaw,yt)*clamp(dt*rate,0,1);}
// walkers: yaw convention: forward = (cos yaw, 0, -sin yaw)  (rotation about +y)
const fwdOf=y=>[Math.cos(y),0,-Math.sin(y)];
function walkTo(c,dt,tgt,speed,arrive=1.2){const dx=tgt[0]-c.pos[0],dz=tgt[2]-c.pos[2];const d=Math.hypot(dx,dz);if(d<arrive){c.speed=lerp(c.speed,0,clamp(dt*6,0,1));return true;}
  const want=Math.atan2(-dz,dx);c.yaw+=angDiff(c.yaw,want)*clamp(dt*2.6,0,1);const ang=Math.abs(angDiff(c.yaw,want));
  const sp=speed*clamp(1.2-ang,0.15,1)*clamp(d/4,.35,1);c.speed=lerp(c.speed,sp,clamp(dt*3,0,1));
  const f=fwdOf(c.yaw);const nx=c.pos[0]+f[0]*c.speed*dt,nz=c.pos[2]+f[2]*c.speed*dt;
  if(stepOK(c,nx,nz)){c.pos[0]=nx;c.pos[2]=nz;c.block=0;}else{c.block=(c.block||0)+dt;c.yaw+=dt*2.5*(c.id%2?1:-1);if(c.block>1.2){c.block=0;return true;}}
  return false;}
function groundFollow(c,dt){const h=topH(c.pos[0],c.pos[2]);c.pos[1]=lerp(c.pos[1],h,clamp(dt*10,0,1));}
// pushes for plants: creatures part the grass as they move through it
function updatePush(){PUSH.fill(0);let n=0;for(const c of crits){if(n>=8)break;if(c.hidden||c.fly>.5)continue;if(c.sp==='faerie'||c.sp==='phoenix'||c.sp==='mermaid')continue;
  const r=c.sp==='unicorn'||c.sp==='pegasus'?2.6*c.size:c.sp==='foal'?1.8:1.6;PUSH.set([c.pos[0],c.pos[1],c.pos[2],r],n*4);n++;}}
function lifeUpdate(dt){SIMT+=dt;if(STUDIO.on){partUpdate(dt);studioUpdate(dt);return;}climate(dt);foodUpdate(dt);partUpdate(dt);ambientLife(dt);
  for(const c of crits){needs(c,dt);const B=BEH[c.sp];if(B)B(c,dt);c.t+=dt;c.blinkT-=dt;if(c.blinkT<0){c.blink=1;c.blinkT=2+Math.random()*5;}c.blink=Math.max(0,c.blink-dt*7);
    if(c.state==='sleep')c.blink=1;c.wet=Math.max(0,c.wet-dt*.05);
    const m=(c.sp==='faerie'?1.6:c.sp==='mermaid'?1.2:c.sp==='phoenix'?2.5:wallGap(c.sp)*.75)*c.size;c.pos[0]=clamp(c.pos[0],TK.ix0+m,TK.ix1-m);c.pos[2]=clamp(c.pos[2],TK.iz0+m+1.5,TK.iz1-m);if(c.pos[1]>TK.h-3&&!(c.sp==='phoenix'&&(c.state==='leave'||c.state==='arrive')))c.pos[1]=TK.h-3;}
  // creatures on the ground never stand or lie inside one another: overlapping pairs ease apart
  const G=crits.filter(c=>!c.hidden&&c.state!=='carried'&&(c.sp==='unicorn'||c.sp==='foal'||c.sp==='pegasus'||c.sp==='dragon'||c.sp==='gnome')&&!(c.fly>.3)&&c.pos[1]<topH(c.pos[0],c.pos[2])+1.5);
  const cap=c=>{const horse=c.sp==='unicorn'||c.sp==='pegasus'||c.sp==='foal';const lie=c.anim&&c.anim.lie>.3;const f=fwdOf(c.yaw);const hl=horse?3.1*c.size:c.sp==='dragon'?2.2*c.size:0;
    return{a:[c.pos[0]-f[0]*hl,c.pos[2]-f[2]*hl],b:[c.pos[0]+f[0]*hl*1.15,c.pos[2]+f[2]*hl*1.15],r:(horse?(lie?1.75:1.25):c.sp==='dragon'?1.0:1.1)*c.size};};
  const segPt=(p,a,b)=>{const ax=b[0]-a[0],az=b[1]-a[1];const l=ax*ax+az*az;const t=l>1e-6?clamp(((p[0]-a[0])*ax+(p[1]-a[1])*az)/l,0,1):0;return[a[0]+ax*t,a[1]+az*t];};
  const C=G.map(cap);
  for(let i=0;i<G.length;i++)for(let j=i+1;j<G.length;j++){const A=C[i],B=C[j];
    // nearest points of the two body segments (a few alternating projections converge well enough for 2D segments)
    let p=segPt([(B.a[0]+B.b[0])/2,(B.a[1]+B.b[1])/2],A.a,A.b),q=segPt(p,B.a,B.b);for(let k=0;k<3;k++){p=segPt(q,A.a,A.b);q=segPt(p,B.a,B.b);}
    let dx=q[0]-p[0],dz=q[1]-p[1];let d=Math.hypot(dx,dz);const r=A.r+B.r;if(d>=r)continue;if(d<.05){dx=G[j].pos[0]-G[i].pos[0];dz=G[j].pos[2]-G[i].pos[2];const l=Math.hypot(dx,dz);if(l<.05){dx=Math.cos(i*2.4+j);dz=Math.sin(i*2.4+j);}else{dx/=l;dz/=l;}d=1;dx*=1;dz*=1;}else{dx/=d;dz/=d;}
    const push=Math.min(r-Math.min(d,r),r)*.5*Math.min(1,dt*6);const a=G[i],b=G[j];
    const ax=a.pos[0]-dx*push,az=a.pos[2]-dz*push,bx=b.pos[0]+dx*push,bz=b.pos[2]+dz*push;if(walkable(ax,az,a.sp)){a.pos[0]=ax;a.pos[2]=az;}if(walkable(bx,bz,b.sp)){b.pos[0]=bx;b.pos[2]=bz;}}
  updatePush();}
// ---------- ambient: waterfall spray, wisps at night, mist puffs, fireflies of faerie dust ----------
const WISPS=[];
function ambientLife(dt){const F=FALL.impact;if(F&&Math.random()<dt*25){simDrop(F[0]+(Math.random()-.5)*2,F[2]+(Math.random()-.5)*1.5,.9,.05+Math.random()*.05);}
  if(F&&Math.random()<dt*6)emit(1,[F[0]+(Math.random()-.5)*3,PWL+.6,F[2]+(Math.random()-.5)*2],[(Math.random()-.5)*2,2+Math.random()*2,(Math.random()-.5)*2+2],1.2+Math.random(),[1,1,1],2.5,{grow:.8,a:.18});
  if(F&&Math.random()<dt*8){const a=Math.random()*TAU;emit(2,[F[0],PWL+.2,F[2]],[Math.cos(a)*10,15+Math.random()*15,Math.sin(a)*10],.09,[1,1,1],.7,{g:981});}
  // misting: fine droplets fall from the lid while spraying
  if(TERR.spray>0){for(let i=0;i<Math.round(dt*220);i++){const p=TERR.sprayP;emit(1,[p[0]+(Math.random()-.5)*16,TK.h-3-Math.random()*6,p[2]+(Math.random()-.5)*12],[(Math.random()-.5)*3,-6-Math.random()*6,(Math.random()-.5)*3],1.4+Math.random()*1.2,[1,1,1],3+Math.random()*2,{grow:1.2,a:.13,drag:.4});
    if(Math.random()<.3)emit(2,[p[0]+(Math.random()-.5)*18,TK.h-4,p[2]+(Math.random()-.5)*14],[0,-20,0],.08+Math.random()*.06,[1,1,1],3,{g:400,drag:.5});}}
  // will-o'-wisps drift over the pond after dark
  const wantW=LIGHT.night>.65?4:0;while(WISPS.length<wantW)WISPS.push({ph:Math.random()*TAU,s:.3+Math.random()*.4,h:2+Math.random()*4,r:4+Math.random()*7,a:0});
  for(let i=WISPS.length-1;i>=0;i--){const w=WISPS[i];w.a=lerp(w.a,wantW?1:0,clamp(dt*.5,0,1));if(!wantW&&w.a<.02){WISPS.splice(i,1);continue;}w.ph+=dt*w.s;
    w.p=[POND.cx+Math.cos(w.ph)*w.r+Math.sin(w.ph*2.3)*2,PWL+w.h+Math.sin(w.ph*3.1)*1.2,POND.cz+Math.sin(w.ph*1.3)*w.r*.7];if(Math.random()<dt*20)emit(0,w.p,[(Math.random()-.5)*.5,.6,(Math.random()-.5)*.5],.9+Math.random()*.6,[.4,.8,1],1.2,{a:.6*w.a,drag:1});}
  if(WISPS.length&&WISPS[0].a>.5)event(null,'seen','Will-o\'-wisps over the pond');}
function creatureLights(L){for(const c of crits){if(c.hidden)continue;const S=SPECIES[c.sp];const m=S.morphs[c.morph%S.morphs.length];
    if(c.sp==='faerie'){const k=.25+LIGHT.night*1.6;L.push({p:V.add(c.pos,[0,2.4*c.size,0]),c:V.mul(m.glow,k*1.3),r:11});if(LIGHT.night>.3&&Math.random()<.4)emit(0,V.add(c.pos,[(Math.random()-.5)*.6,2.2+Math.random()*.6,(Math.random()-.5)*.6]),[0,.3,0],.9+Math.random()*.5,m.glow,.5,{a:.55*LIGHT.night,drag:1});}
    if((c.sp==='unicorn'||c.sp==='foal')&&c.glow>0.05)L.push({p:c.headP||c.pos,c:V.mul(m.c3,c.glow*1.6),r:9});
    if(c.sp==='dragon'&&c.fire>0)L.push({p:c.mouthP||c.pos,c:V.mul(m.fire,c.fire*4),r:14});
    if(c.sp==='phoenix')L.push({p:V.add(c.pos,[0,2.5,0]),c:[1.4,.6,.2],r:14});}
  for(const w of WISPS)if(w.p)L.push({p:w.p,c:V.mul([.35,.75,1],w.a*1.4),r:10});}
function followTarget(){const c=SELECTED&&SELECTED.sp?SELECTED:crits[FOLLOW_I%Math.max(1,crits.length)];return c?V.add(c.pos,[0,(c.sp==='mermaid'?1:c.sp==='faerie'?2:4)*c.size,0]):null;}
let FOLLOW_I=0;
