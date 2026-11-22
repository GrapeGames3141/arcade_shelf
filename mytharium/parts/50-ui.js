
// ============================================================
//  UI, INPUT, SAVE, TEST API
// ============================================================
const $=id=>document.getElementById(id);
function toast(msg,ms=2600){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),ms);}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let MODE='view',TOOL={},sheetKind=null;
// ---------- the starter scape ----------
function defaultScape(){for(const it of items.slice())removeItem(it);items=[];nextId=1;crits=[];foods=[];
  const A=(k,x,z,o)=>addItem(k,x,z,Object.assign({seed:Math.round((x+70)*131+(z+40)*71)+k.length*977},o||{}));
  // warm, dry side: basking slate under the heat lamp, the hoard in a stone nook, succulents in the sand
  A('slate',-40,-10,{rot:.4,size:1.3});A('emberrock',-29,-2,{rot:1.1,size:1.2});A('rock',-52,-14,{size:1.6,rot:.3});A('rock',-45,-23,{size:1.5,rot:2});A('rock',-54,-23,{size:1.2});A('hoard',-48,-6,{size:1.3});A('geode',-53,-2,{rot:2.1,size:1.2});
  A('egg',-35,-15,{morph:0});A('echeveria',-50,7,{size:1.7});A('echeveria',-42,15,{morph:1,size:1.5});A('echeveria',-33,11,{morph:2,size:1.3});A('haworthia',-27,17,{size:1.6});A('haworthia',-55,16,{size:1.4});
  A('grass',-48,-3,{morph:1});A('grass',-37,19,{morph:1,size:.8});A('grass',-22,-8,{morph:1,size:.9});
  for(const[x,z,s]of[[-56,-4,2.2],[-52,12,1.6],[-44,-26,2.4],[-33,-26,2],[-56,22,1.5],[-24,10,1.3],[-57,-12,2.6]])A('grass',x,z,{morph:1,size:s});
  A('slate',-27,-17,{rot:1.2,size:.75});A('echeveria',-38,3,{morph:0,size:.8});A('echeveria',-46,-6,{morph:1,size:.7});A('haworthia',-40,22,{size:.9});A('echeveria',-22,20,{morph:2,size:.75});
  // the meadow: clover, wildflowers, a faerie ring, the ruin and the gnome's cottage
  A('bonsai',-21,-17,{rot:.6,size:1.3});A('arch',-5,-21,{rot:-.15,size:1.3});A('cottage',15,-17,{rot:.1,size:1.25});A('lantern',22,-10,{rot:.2});A('lantern',-15,-5,{rot:2.6});A('geode',-25,-6,{rot:.4});A('moonstone',4,2);
  for(const[x,z,k,s]of[[-14,-12,0,1.35],[-1,-13,2,1.2],[16,-22,1,1.3],[-30,-22,0,1.2],[-11,-16,1,1.5],[2,-20,0,1.1]])A('foxglove',x,z,{morph:k,size:s});
  for(const[x,z,k]of[[-19,4,0],[9,3,0],[-10,14,1],[-17,-9,0],[3,-9,1],[15,-3,0]])A('bluebell',x,z,{morph:k,size:1.2});for(const[x,z,k]of[[-6,21,0],[5,22,1],[-18,22,0],[14,16,0]])A('forgetmenot',x,z,{morph:k});
  for(const[x,z]of[[-10,8],[1,13],[-15,17],[8,9]])A('clover',x,z,{morph:(x>0?1:0)});A('grass',-2,7);A('grass',11,13);A('grass',-13,-2);
  const rc=[-5,0,5];for(let i=0;i<7;i++){const a=i/7*TAU;const it=A('toadstool',rc[0]+Math.cos(a)*5.2,rc[2]+Math.sin(a)*5.2,{morph:0,size:.75+((i*37)%5)*.06});it.ring=1;it.ringC=[rc[0],groundH(rc[0],rc[2]),rc[2]];}
  // the humid side: moss, ferns, glowing mushrooms, stones round the pond, the mermaid's rock and shell
  A('rock',27,-6.5,{size:1.4,rot:.7,lift:0});A('riverstone',21,-15,{size:1.2,rot:.4});A('riverstone',33,-4.6,{size:.9});A('riverstone',45.5,-2.5,{size:1.1});A('riverstone',45,7,{size:.9});A('riverstone',39,14,{size:.55,rot:1});A('riverstone',47.5,27,{size:.5,rot:2.2});A('riverstone',23,-24,{size:.8});
  A('shell',37.5,-12.5,{rot:-2.3,size:.9});A('riverstone',35.2,-10.8,{size:.6,rot:.8});A('driftwood',29,-25,{rot:-.4});for(const[x,z,k]of[[34,-11,0],[42,-9,1],[30,-17,0],[45,-15,0],[38,-23,1],[54,-2,0],[56,6,1],[55,17,0],[52.5,24,1]])A('lilypad',x,z,{morph:k});
  for(const[x,z,k]of[[55,-14,0],[56,-6,1],[55.5,2,0],[56,10,0],[52,-20,1],[44,-21,0],[56,19,0],[55.5,26,1]])A('eelgrass',x,z,{morph:k});
  for(const[x,z,k,s]of[[20,-23,0,1.6],[14,-24,1,1.1],[36,9,0,1.2],[26,-26,0,1.3],[-34,-25,0,1]])A('fern',x,z,{morph:k,size:s});
  for(const[x,z,k]of[[40,5,0],[31,24,1],[20,19,0],[25,26,2],[44,-1,0],[26,13,1]])A('moss',x,z,{morph:k});
  A('fittonia',30,19);A('fittonia',37,15,{morph:1});A('fittonia',33,12,{morph:1,size:1.3});A('glowshroom',38,2,{morph:0});A('glowshroom',17,-20,{morph:1});A('glowshroom',-28,-14,{morph:2,size:.8});A('sundew',14,22);
  relayItems();
  addCrit('unicorn',{morph:0,name:'Moonbeam',pos:[-6,0,10]});addCrit('unicorn',{morph:1,name:'Aurora',pos:[6,0,6]});addCrit('foal',{morph:1,name:'Pip',pos:[2,0,12]});
  addCrit('faerie',{morph:0,name:'Thistle'});addCrit('faerie',{morph:1,name:'Rosalind'});addCrit('faerie',{morph:2,name:'Luna'});
  addCrit('mermaid',{morph:0,name:'Marina',pos:[52,PWL-3,-4]});addCrit('dragon',{morph:0,name:'Ember',pos:[-38,0,-6]});addCrit('gnome',{morph:0,name:'Bramblebeard',pos:[4,0,-10]});
  for(const c of crits)if(c.sp!=='mermaid'&&c.sp!=='faerie')c.pos[1]=topH(c.pos[0],c.pos[2]);}
function applyFps(){const e=$('fps');if(e){e.classList.toggle('hidden',!SETTINGS.fps);if(SETTINGS.fps)e.textContent='measuring…';}}
// ---------- save / load ----------
const SAVE_KEY='mytharium.v1';
function b64(u8){let s='';for(let i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return btoa(s);}
function unb64(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}
function q8(A){const u=new Uint8Array(A.length);for(let i=0;i<A.length;i++)u[i]=clamp(Math.round(A[i]*255),0,255);return b64(u);}
function saveState(){if(TEST)return;try{const h=new Uint16Array(NV);for(let i=0;i<NV;i++)h[i]=clamp(Math.round(HF[i]*500),0,65535);
  const o={v:3,h:b64(new Uint8Array(h.buffer)),pm:b64(PM),cov:{},items:items.map(it=>({k:it.kind,x:+it.x.toFixed(2),z:+it.z.toFixed(2),r:+it.rot.toFixed(3),s:+(it.scale/CAT[it.kind].scale).toFixed(3),seed:it.seed,m:it.morph,l:it.lift||0,ring:it.ring?it.ringC:0})),
    crits:crits.filter(c=>c.sp!=='phoenix').map(c=>({sp:c.sp,m:c.morph,n:c.name,p:c.pos.map(v=>+v.toFixed(2))})),set:{time:SETTINGS.time,heat:SETTINGS.heat,dof:SETTINGS.dof,ao:SETTINGS.ao,sound:SETTINGS.sound,smooth:SETTINGS.smooth,fps:SETTINGS.fps},humid:TERR.humid,pearls:TERR.pearls,journal:JOURNAL.entries,day:DAY};
  for(const k in COV)o.cov[k]=q8(COV[k]);localStorage.setItem(SAVE_KEY,JSON.stringify(o));}catch(e){LOG('save failed',e.message);}}
function loadState(){if(TEST)return false;let o;try{o=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(e){return false;}if(o&&(o.v===1||o.v===2)){// saved before the pond moved: keep the journal and settings, rebuild the scape around the new pond
    try{JOURNAL.entries=o.journal||{};Object.assign(SETTINGS,o.set||{});DAY=o.day??.45;setTimeout(()=>toast('The pond has been reshaped, so the terrarium was replanted. Your journal is kept.'),2600);}catch(e){}return false;}
  if(!o||o.v!==3)return false;
  try{const h=new Uint16Array(unb64(o.h).buffer);for(let i=0;i<NV;i++)HF[i]=h[i]/500;PM.set(unb64(o.pm));for(const k in COV){if(!o.cov[k])continue;const u=unb64(o.cov[k]);for(let i=0;i<NV;i++)COV[k][i]=u[i]/255;}
    items=[];nextId=1;for(const s of o.items){const it=addItem(s.k,s.x,s.z,{rot:s.r,size:s.s,seed:s.seed,morph:s.m,lift:s.l});if(it&&s.ring){it.ring=1;it.ringC=s.ring;}}
    crits=[];for(const c of o.crits)addCrit(c.sp,{morph:c.m,name:c.n,pos:c.p.slice()});Object.assign(SETTINGS,o.set||{});TERR.humid=o.humid||70;TERR.pearls=o.pearls??3;JOURNAL.entries=o.journal||{};DAY=o.day??.45;
    for(const c of crits)if(c.sp!=='mermaid'&&c.sp!=='faerie')c.pos[1]=topH(c.pos[0],c.pos[2]);return true;}catch(e){LOG('load failed',e.message);return false;}}
let saveT=0;function markDirty(){saveT=Math.min(saveT,2);}
function loadPhotos(){try{JOURNAL.photos=JSON.parse(localStorage.getItem('mytharium.photos')||'[]');}catch(e){JOURNAL.photos=[];}}
function savePhotos(){try{localStorage.setItem('mytharium.photos',JSON.stringify(JOURNAL.photos.slice(-12)));}catch(e){toast('Not enough storage for more photos');}}
// ---------- card ----------
function warmth(){return clamp(.25+SETTINGS.heat*.45+(1-LIGHT.night)*.3,0,1);}
function happiness(){if(!crits.length)return .5;let s=0;for(const c of crits)s+=c.happy;return s/crits.length;}
function todName(){const d=DAY;return d<.2?'Night':d<.3?'Dawn':d<.45?'Morning':d<.6?'Midday':d<.7?'Afternoon':d<.8?'Dusk':'Night';}
function updateCard(){const H=TERR.humid/100;$('bHum').style.width=(H*100)+'%';$('bHum').style.background=H<.38?'var(--warn)':'var(--acc)';$('bWarm').style.width=(warmth()*100)+'%';$('bWarm').style.background='#f0b070';
  const hp=happiness();$('bHap').style.width=(hp*100)+'%';$('bHap').style.background=hp<.45?'var(--warn)':'var(--acc2)';$('tod').textContent=todName();
  if(!$('cardMore').classList.contains('hidden')){const wil=items.filter(it=>(it.wilt||0)>.35).length;
    $('cardMore').innerHTML=`Humidity ${Math.round(TERR.humid)}% · heat lamp ${['off','low','high'][SETTINGS.heat]}<br>${crits.length} creatures · ${items.length} plants and pieces${wil?`<br><span style="color:var(--warn)">${wil} plant${wil>1?'s are':' is'} wilting: mist the terrarium</span>`:''}<br>Pearls in the grotto: ${TERR.pearls}`;}}
// ---------- sheets ----------
const BAR_TITLES={care:'Care',feed:'Feed',build:'Build',creatures:'Creatures',settings:'Settings'};
let buildTab='plants';
function openSheet(kind){if(sheetKind===kind){closeSheet();return;}sheetKind=kind;document.querySelectorAll('#bar button').forEach(b=>b.classList.toggle('on',b.dataset.m===kind));$('sheet').classList.remove('hidden');$('sel').classList.add('hidden');renderSheet();}
function closeSheet(){sheetKind=null;$('sheet').classList.add('hidden');document.querySelectorAll('#bar button').forEach(b=>b.classList.remove('on'));}
function chipRow(opts,cur,on){return`<div class="chips">${opts.map(([v,l])=>`<button class="chip${v===cur?' on':''}" data-v="${v}">${l}</button>`).join('')}</div>`;}
function bindChips(el,cb){el.querySelectorAll('.chip').forEach(b=>b.onclick=()=>cb(b.dataset.v));}
function renderSheet(){const k=sheetKind;if(!k)return;$('shTitle').textContent=BAR_TITLES[k];const T=$('shTabs'),B=$('shBody');T.innerHTML='';B.innerHTML='';
  if(k==='care'){B.innerHTML=`<div class="sec">Tools</div><div class="chips"><button class="chip" id="cMist">Mister</button><button class="chip" id="cTap">Tap the glass</button><button class="chip" id="cWipe">Wipe the glass</button><button class="chip" id="cLan">${items.some(it=>it.lit)?'Snuff the lanterns':'Light the lanterns'}</button></div>
    <div class="note">Hold the mister over the terrarium to raise the humidity. In bright light the spray makes a rainbow.</div>
    <div class="sec">Heat lamp</div><div id="cHeat"></div><div class="sec">Light</div><div id="cTime"></div><div class="note">The cycle runs a whole day in ten minutes. "My clock" follows the time where you are.</div>`;
    $('cMist').onclick=()=>setMode('mist');$('cTap').onclick=()=>setMode('tap');$('cWipe').onclick=()=>setMode('wipe');$('cLan').onclick=()=>{const on=!items.some(it=>it.lit);for(const it of items)if(it.geo.lantern)it.lit=on?1:0;renderSheet();};
    $('cHeat').innerHTML=chipRow([['0','Off'],['1','Low'],['2','High']],String(SETTINGS.heat));bindChips($('cHeat'),v=>{SETTINGS.heat=+v;markDirty();renderSheet();});
    $('cTime').innerHTML=chipRow([['cycle','Day cycle'],['clock','My clock'],['dawn','Dawn'],['day','Day'],['dusk','Dusk'],['night','Night']],SETTINGS.time);bindChips($('cTime'),v=>{SETTINGS.time=v;markDirty();renderSheet();});}
  else if(k==='feed'){B.innerHTML=`<div class="grid">${Object.entries(FOODS).map(([key,F])=>`<div class="card${TOOL.food===key&&MODE==='feed'?' on':''}" data-f="${key}"><div class="sw" style="background:rgb(${F.col.map(v=>Math.round(Math.pow(v,1/2.2)*255)).join(',')})"></div><div class="t">${F.name}</div><div class="s">${F.eaters.map(e=>SPECIES[e].name).join(', ')}</div></div>`).join('')}</div><div class="note">Pick a food, then tap where to drop it with the tweezers.</div>`;
    B.querySelectorAll('.card').forEach(c=>c.onclick=()=>{TOOL.food=c.dataset.f;setMode('feed');renderSheet();});}
  else if(k==='build'){for(const[t,l]of[...TABS,['terrain','Terrain']]){const b=document.createElement('button');b.className='tab'+(buildTab===t?' on':'');b.textContent=l;b.onclick=()=>{buildTab=t;renderSheet();};T.appendChild(b);}
    if(buildTab==='terrain'){const tools=[['raise','Raise'],['lower','Lower'],['smooth','Smooth'],['flatten','Flatten']],paints=[['moss','Moss'],['grass','Grass'],['clover','Clover'],['sand','Sand'],['gravel','Gravel'],['litter','Leaf litter'],['soil','Bare soil']],water=[['dig','Dig pond'],['fill','Fill pond']];
      B.innerHTML=`<div class="sec">Sculpt</div>${chipRow(tools,TOOL.sculpt)}<div class="sec">Paint ground cover</div>${chipRow(paints,TOOL.sculpt)}<div class="sec">Water</div>${chipRow(water,TOOL.sculpt)}<div class="sl"><span>Brush</span><input type="range" id="bsz" min="2" max="14" value="${TOOL.brush||5}"><output id="bszO">${TOOL.brush||5} cm</output></div>`;
      bindChips(B,v=>{TOOL.sculpt=v;setMode('sculpt');renderSheet();});$('bsz').oninput=e=>{TOOL.brush=+e.target.value;$('bszO').textContent=TOOL.brush+' cm';};}
    else{const ks=Object.keys(CAT).filter(k=>CAT[k].tab===buildTab);B.innerHTML=`<div class="grid">${ks.map(key=>`<div class="card${TOOL.place===key&&MODE==='place'?' on':''}" data-k="${key}"><div class="t">${CAT[key].name}</div><div class="s">${CAT[key].morphs.join(' · ')}</div></div>`).join('')}</div><div class="note">Pick something, then tap the ground to place it. Tap a placed piece to move, turn, resize or remove it.</div>`;
      B.querySelectorAll('.card').forEach(c=>c.onclick=()=>{TOOL.place=c.dataset.k;TOOL.morph=0;setMode('place');renderSheet();});}}
  else if(k==='creatures'){const sps=['unicorn','foal','pegasus','faerie','mermaid','dragon','gnome'];
    B.innerHTML=`<div class="sec">Add a creature</div><div class="grid">${sps.map(sp=>`<div class="card" data-a="${sp}"><div class="t">${SPECIES[sp].name}</div><div class="s">${SPECIES[sp].morphs.map(m=>m.name).slice(0,4).join(' · ')}</div></div>`).join('')}</div>
      <div class="sec">Living here</div>${crits.filter(c=>c.sp!=='phoenix').map(c=>`<div class="row"><div class="l"><b>${esc(c.name)}</b><span>${SPECIES[c.sp].name} · ${morphOf(c).name} · ${moodWord(c)}</span></div><button class="btn" data-sel="${c.id}">Find</button><button class="btn dan" data-rm="${c.id}">Remove</button></div>`).join('')}`;
    B.querySelectorAll('[data-a]').forEach(c=>c.onclick=()=>{const sp=c.dataset.a;if(sp==='mermaid'&&!items.some(it=>it.kind==='shell')&&!PM.some(v=>v)){toast('A mermaid needs the pond');return;}const n=addCrit(sp);if(n){toast(`${n.name} the ${SPECIES[sp].name.toLowerCase()} moved in`);selectThing(n);markDirty();renderSheet();}});
    B.querySelectorAll('[data-sel]').forEach(b=>b.onclick=()=>{const c=crits.find(x=>x.id===+b.dataset.sel);if(c){selectThing(c);setView('close');}});
    B.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{const c=crits.find(x=>x.id===+b.dataset.rm);if(c){removeCrit(c);markDirty();renderSheet();}});}
  else if(k==='settings'){B.innerHTML=`<div class="sec">Quality</div><div id="sQ"></div><div class="note">MAX draws everything at full detail and your screen's full resolution. HIGH looks the same at a glance with slightly lighter moss and fur. Changing quality reloads the page (your terrarium is kept).</div>
    <div class="sec">Picture</div><div class="chips"><button class="chip${SETTINGS.dof?' on':''}" id="sDof">Depth of field</button><button class="chip${SETTINGS.ao?' on':''}" id="sAo">Soft shadows in crevices</button><button class="chip${SETTINGS.sound?' on':''}" id="sSnd">Sound</button></div>
    <div class="sec">Speed</div><div class="chips"><button class="chip${SETTINGS.smooth&&QK!=='max'?' on':''}" id="sSmooth">Smooth frame rate</button><button class="chip${SETTINGS.fps?' on':''}" id="sFps">Show frame rate</button></div>
    <div class="note">${QK==='max'?'MAX always renders at full resolution, so Smooth frame rate does nothing here.':'Smooth frame rate lowers the rendering resolution a little when frames run slow, and raises it again when they do not.'}</div>
    <div class="sec">Terrarium</div><div class="chips"><button class="chip" id="sSave">Save now</button><button class="chip" id="sReset">Start over</button></div><div class="note" id="sStat"></div>`;
    $('sQ').innerHTML=chipRow([['low','Low'],['med','Medium'],['high','High'],['max','MAX']],QK);bindChips($('sQ'),v=>{if(v===QK)return;try{localStorage.setItem('mytharium.q',v);}catch(e){}saveState();location.reload();});
    $('sSmooth').onclick=()=>{SETTINGS.smooth=!SETTINGS.smooth;FR.capped=false;markDirty();renderSheet();};$('sFps').onclick=()=>{SETTINGS.fps=!SETTINGS.fps;applyFps();markDirty();renderSheet();};$('sDof').onclick=()=>{SETTINGS.dof=!SETTINGS.dof;renderSheet();};$('sAo').onclick=()=>{SETTINGS.ao=!SETTINGS.ao;renderSheet();};$('sSnd').onclick=()=>{SETTINGS.sound=!SETTINGS.sound;audioInit();renderSheet();updateSoundBtn();};
    $('sSave').onclick=()=>{saveState();toast('Saved');};$('sReset').onclick=()=>{if(!confirmReset()){return;}};
    $('sStat').textContent=`${QUAL[QK].msaa?'MSAA '+(RT.samples||0)+'×':'no MSAA'} · shadow map ${SH.size} · ${RT.w}×${RT.h}`;}}
let resetArmed=0;function confirmReset(){if(Date.now()-resetArmed<4000){resetArmed=0;defaultTerrain();updateTerrainMesh();updatePondTex();rebuildChunks(true);defaultScape();JOURNAL.entries={};saveState();toast('A fresh terrarium');closeSheet();return true;}resetArmed=Date.now();toast('Tap "Start over" again to reset everything');return false;}
function moodWord(c){if(c.state==='sleep'||c.state==='curl')return'asleep';if(c.hunger>.7)return'hungry';if(c.happy>.75)return'content';if(c.happy<.4)return'grumpy';return'calm';}
// ---------- modes and tools ----------
const MODE_TXT={mist:'Misting: hold over the terrarium',tap:'Tap the front glass',wipe:'Drag across the front glass to wipe the fog',feed:'Tap to drop food',place:'Tap the ground to place',sculpt:'Drag on the ground'};
function setMode(m){MODE=m;canvas.classList.toggle('tool',m!=='view');if(m==='view'){$('tool').classList.add('hidden');return;}closeSheet();selectThing(null);
  let txt=MODE_TXT[m]||'';if(m==='feed')txt='Tap to drop '+FOODS[TOOL.food].name.toLowerCase();if(m==='place')txt='Tap to place: '+CAT[TOOL.place].name;if(m==='sculpt')txt={raise:'Raise',lower:'Lower',smooth:'Smooth',flatten:'Flatten',dig:'Dig pond',fill:'Fill pond'}[TOOL.sculpt]?({raise:'Raise',lower:'Lower',smooth:'Smooth',flatten:'Flatten',dig:'Dig pond',fill:'Fill pond'}[TOOL.sculpt]+': drag on the ground'):'Paint '+TOOL.sculpt+': drag on the ground';
  $('toolTxt').textContent=txt;$('tool').classList.remove('hidden');}
// ray picking against the ground (walkable height), the pond plane, the front glass
function rayGround(o,d){let t=0;const tmax=900;let prev=null;for(let i=0;i<1600;i++){const p=V.madd(o,d,t);if(p[1]<-1)break;
  const inside=p[0]>TK.ix0&&p[0]<TK.ix1&&p[2]>TK.iz0&&p[2]<TK.iz1&&p[1]<TK.h;if(inside){const h=topH(p[0],p[2]);const w=inPond(p[0],p[2])?PWL:-1e9;if(p[1]<=Math.max(h,w)){
    if(prev){let a=prev,b=p;for(let k=0;k<6;k++){const m=V.lerp(a,b,.5);const hh=Math.max(topH(m[0],m[2]),inPond(m[0],m[2])?PWL:-1e9);if(m[1]<=hh)b=m;else a=m;}return b;}return p;}}
  prev=p;t+=inside?.4:Math.max(.4,boxDist(p)*.9);if(t>tmax)break;}return null;}
function boxDist(p){const dx=Math.max(TK.ix0-p[0],0,p[0]-TK.ix1),dy=Math.max(-p[1],0,p[1]-TK.h),dz=Math.max(TK.iz0-p[2],0,p[2]-TK.iz1);return Math.hypot(dx,dy,dz);}
function rayFront(o,d){if(Math.abs(d[2])<1e-4)return null;const t=(TK.z1-.3-o[2])/d[2];if(t<0)return null;const p=V.madd(o,d,t);if(p[0]<TK.x0||p[0]>TK.x1||p[1]<0||p[1]>TK.h)return null;return{p,u:(p[0]-TK.x0)/(TK.x1-TK.x0),v:p[1]/TK.h};}
function critRadius(c){return(c.sp==='unicorn'||c.sp==='pegasus'?4.2:c.sp==='foal'?3:c.sp==='mermaid'?3.5:c.sp==='dragon'?3.2:c.sp==='faerie'?2.2:2.4)*c.size;}
function critCentre(c){const h=c.sp==='unicorn'||c.sp==='pegasus'?5.4:c.sp==='foal'?3.5:c.sp==='mermaid'?(c.anim&&c.anim.swim>.5?.5:1.5):c.sp==='dragon'?1.6:c.sp==='faerie'?2:2.2;return V.add(c.pos,[0,h*c.size,0]);}
function raySphere(o,d,c,r){const oc=V.sub(o,c);const b=V.dot(oc,d),cc=V.dot(oc,oc)-r*r;const h=b*b-cc;if(h<0)return null;const t=-b-Math.sqrt(h);return t>0?t:null;}
function pickAt(px,py){const{o,d}=screenRay(px,py);let best=null,bt=1e9;
  for(const c of crits){if(c.hidden)continue;const t=raySphere(o,d,critCentre(c),critRadius(c));if(t!==null&&t<bt){bt=t;best=c;}}
  const g=rayGround(o,d);const gt=g?V.dist(o,g):1e9;
  for(const it of items){const r=Math.max(1.2,it.geo.r*it.scale*.6);const ctr=[it.x,it.y+Math.min(it.geo.h*it.scale,30)*.45,it.z];const t=raySphere(o,d,ctr,r);if(t!==null&&t<bt-2&&t<gt+r){bt=t;best=it;}}
  return{thing:best,ground:g};}
// ---------- selection ----------
function selectThing(t){SELECTED=t;if(!t){$('sel').classList.add('hidden');RING=[0,0,0,0];return;}if(MODE!=='view'&&MODE!=='move')setMode('view');closeSheet();$('sel').classList.remove('hidden');renderSel();}
function renderSel(){const t=SELECTED,S=$('sel');if(!t){S.classList.add('hidden');return;}
  if(t.sp){const m=morphOf(t);S.innerHTML=`<div class="hd"><b>${esc(t.name)}</b><span class="note">${SPECIES[t.sp].name} · ${m.name}</span><button class="x" id="sx">✕</button></div>
    <div class="bars" style="display:grid;grid-template-columns:auto 1fr;gap:5px 9px;font-size:11.5px;color:var(--dim);align-items:center"><span>Fed</span><div class="bar"><i style="width:${(1-t.hunger)*100}%"></i></div><span>Rested</span><div class="bar"><i style="width:${t.energy*100}%"></i></div><span>Happy</span><div class="bar"><i style="width:${t.happy*100}%;background:var(--acc2)"></i></div></div>
    <div class="note">${stateWords(t)}</div><div class="acts"><button class="btn pri" id="sPet">Pet</button><button class="btn" id="sFol">Follow</button><button class="btn" id="sMorph">Next look</button><button class="btn" id="sPort">Portrait</button><button class="btn dan" id="sRm">Remove</button></div>`;
    $('sPet').onclick=()=>petCrit(t);$('sFol').onclick=()=>{setView('follow');$('bFollow').classList.add('on');};$('sPort').onclick=()=>{const c=t;selectThing(null);studioEnter(c);};$('sMorph').onclick=()=>{t.morph=(t.morph+1)%SPECIES[t.sp].morphs.length;markDirty();renderSel();};$('sRm').onclick=()=>{removeCrit(t);selectThing(null);markDirty();};}
  else{const c=CAT[t.kind];S.innerHTML=`<div class="hd"><b>${c.name}</b><span class="note">${c.morphs[t.morph%c.morphs.length]}${t.wilt>.35?' · wilting':''}</span><button class="x" id="sx">✕</button></div>
    <div class="sl"><span>Turn</span><input type="range" id="iRot" min="0" max="628" value="${Math.round(((t.rot%TAU)+TAU)%TAU*100)}"><output></output></div>
    <div class="sl"><span>Size</span><input type="range" id="iSize" min="50" max="180" value="${Math.round(t.scale/c.scale*100)}"><output id="iSizeO">${Math.round(t.scale/c.scale*100)}%</output></div>
    <div class="acts">${c.morphs.length>1?'<button class="btn" id="iMorph">Next variety</button>':''}<button class="btn" id="iMove">Move</button>${t.geo.lantern?`<button class="btn" id="iLit">${t.lit?'Snuff':'Light'}</button>`:''}<button class="btn dan" id="iRm">Remove</button></div><div class="note">Drag it with Move, or tap Move then tap a new spot.</div>`;
    $('iRot').oninput=e=>{t.rot=+e.target.value/100;updateItem(t);SOLID.dirty=true;markDirty();};
    $('iSize').oninput=e=>{t.scale=c.scale*e.target.value/100;$('iSizeO').textContent=e.target.value+'%';updateItem(t);SOLID.dirty=true;markDirty();};
    if($('iMorph'))$('iMorph').onclick=()=>{t.morph=(t.morph+1)%c.morphs.length;freeGeo(t.geo);t.geo=geoFor(t);updateItem(t);markDirty();renderSel();};
    $('iMove').onclick=()=>{TOOL.move=t;setMode('move');$('toolTxt').textContent='Tap a new spot for the '+c.name.toLowerCase();};
    if($('iLit'))$('iLit').onclick=()=>{t.lit=t.lit?0:1;renderSel();};$('iRm').onclick=()=>{removeItem(t);selectThing(null);markDirty();};}
  $('sx').onclick=()=>selectThing(null);}
function stateWords(c){const W={graze:'Grazing',eat:'Eating',drink:'Drinking',rest:'Resting',sleep:'Asleep',rear:'Rearing',heal:'Healing a plant',rainbow:'Gazing at the rainbow',walk:'Wandering',trot:'Trotting',fly:'Flying',hop:'Flying',sip:'Sipping nectar',perch:'Perched',ride:'Riding a unicorn',dance:'Dancing',hover:'Hovering',swim:'Swimming',haul:'Swimming to a sunning spot',climb:'Climbing out of the water',bask:'Basking',sing:'Singing',dive:'Slipping into the water',pearl:'Fetching a pearl',splash:'Splashing',curl:'Curled up asleep',fire:'Breathing fire',grab:'Snatching a pearl',hoardrest:'Guarding the hoard',tend:'Tending a plant',home:'At home',wave:'Waving',pet:'Enjoying a pat',carried:'Being carried',idle:'Looking around',pounce:'Hunting',perchP:'Perched',burst:'Bursting into flame',ash:'Ashes…',reborn:'Reborn!',leave:'Leaving'};return W[c.state]||c.state;}
function petCrit(c){c.pet=6;c.happy=Math.min(1,c.happy+.12);if(c.sp==='mermaid'){if(c.state==='swim'||c.state==='idle')setState(c,'splash',1.2);}else setState(c,c.sp==='gnome'?'wave':'pet',2.2);
  sparkle(critCentre(c),c.sp==='faerie'?morphOf(c).glow:[1,.9,.75],8);sfx(c.sp==='unicorn'||c.sp==='foal'||c.sp==='pegasus'?'nicker':c.sp==='dragon'?'chirp':c.sp==='faerie'?'chime':'pet');}
// ---------- terrain brush ----------
function brush(p,dt){const R=TOOL.brush||5,kind=TOOL.sculpt;const i0=Math.max(0,Math.floor((p[0]-R-TG.x0)/TG.dx)),i1=Math.min(TG.nx,Math.ceil((p[0]+R-TG.x0)/TG.dx)),j0=Math.max(0,Math.floor((p[2]-R-TG.z0)/TG.dz)),j1=Math.min(TG.nz,Math.ceil((p[2]+R-TG.z0)/TG.dz));
  const h0=groundH(p[0],p[2]);let avg=0,n=0;if(kind==='smooth')for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){avg+=HF[gi(i,j)];n++;}avg/=Math.max(n,1);
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const d=Math.hypot(gx(i)-p[0],gz(j)-p[2])/R;if(d>1)continue;const w=Math.pow(Math.cos(d*PI/2),2);const k=gi(i,j);
    if(kind==='raise')HF[k]=Math.min(HF[k]+w*dt*6,TK.h*.6);else if(kind==='lower')HF[k]=Math.max(HF[k]-w*dt*6,1.5);else if(kind==='smooth')HF[k]=lerp(HF[k],avg,w*dt*3);else if(kind==='flatten')HF[k]=lerp(HF[k],h0,w*dt*3);
    else if(kind==='dig'){HF[k]=Math.max(HF[k]-w*dt*5,PWL-7.5);if(w>.2)PM[k]=1;}else if(kind==='fill'){if(w>.2)PM[k]=0;HF[k]=Math.max(HF[k],lerp(HF[k],PWL+1,w*dt*2));}
    else{const ch=['moss','grass','clover','sand','gravel','litter'];for(const c of ch){const tgt=c===kind?1:(kind==='clover'&&c==='grass'?COV.grass[k]:0);COV[c][k]=lerp(COV[c][k],tgt,clamp(w*dt*3,0,1));}}}
  TER.dirty=true;TER.dirtyP=p;TER.dirtyR=R;SOLID.dirty=true;}
let brushT=0;function brushCommit(force){if(!TER.dirty)return;brushT=0;updateTerrainMesh();updatePondTex();if(TER.dirtyP)rebuildChunks(false,TER.dirtyP[0],TER.dirtyP[2],TER.dirtyR||6);relayItems();
  for(const c of crits)if(c.sp!=='faerie'&&c.sp!=='mermaid'&&c.sp!=='phoenix')c.pos[1]=topH(c.pos[0],c.pos[2]);markDirty();}
// ---------- pointer input ----------
const ptrs=new Map();let lastTap=0,holdT=null,carried=null,mistHold=false,lastPinch=null;
function onDown(e){canvas.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,t0:performance.now(),b:e.button,shift:e.shiftKey});audioInit();
  if(ptrs.size>1){clearTimeout(holdT);drag=null;return;}
  drag={x:e.clientX,y:e.clientY,moved:0,pan:e.button===2||e.shiftKey,vy:0,vp:0};
  if(MODE==='mist'){mistHold=true;sprayAt(e.clientX,e.clientY);return;}
  if(MODE==='wipe'){const{o,d}=screenRay(e.clientX,e.clientY);const f=rayFront(o,d);if(f){wipeAt(f.u,f.v,.035);drag.wipe=true;}return;}
  if(MODE==='sculpt'){const g=pickAt(e.clientX,e.clientY).ground;if(g){drag.sculpt=true;brush(g,.05);}return;}
  if(MODE==='view'&&!STUDIO.on){const pk=pickAt(e.clientX,e.clientY);if(pk.thing&&pk.thing.sp){const c=pk.thing;holdT=setTimeout(()=>{if(drag&&drag.moved<6){carried=c;c.prevState=c.state;setState(c,'carried',1e9);c.at=null;drag.carry=true;sfx('pet');toast('Carrying '+c.name);}},450);}
    else if(pk.thing&&!pk.thing.sp&&SELECTED===pk.thing){drag.moveItem=pk.thing;}}}
function onMove(e){const P=ptrs.get(e.pointerId);if(!P)return;const dx=e.clientX-P.x,dy=e.clientY-P.y;P.x=e.clientX;P.y=e.clientY;
  if(ptrs.size===2){const a=[...ptrs.values()];const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);const mx=(a[0].x+a[1].x)/2,my=(a[0].y+a[1].y)/2;
    if(lastPinch){zoomBy(lastPinch.d/d);panCam(mx-lastPinch.x,my-lastPinch.y);}lastPinch={d,x:mx,y:my};return;}
  if(!drag)return;drag.moved+=Math.abs(dx)+Math.abs(dy);
  if(MODE==='mist'){sprayAt(e.clientX,e.clientY);return;}
  if(drag.wipe){const{o,d}=screenRay(e.clientX,e.clientY);const f=rayFront(o,d);if(f)wipeAt(f.u,f.v,.035);return;}
  if(drag.sculpt){const g=pickAt(e.clientX,e.clientY).ground;if(g)brush(g,.05);return;}
  if(drag.carry&&carried){const{o,d}=screenRay(e.clientX,e.clientY);const g=rayGround(o,d);if(g){const lift=carried.sp==='mermaid'?2:4;carried.pos=[clamp(g[0],TK.ix0+2,TK.ix1-2),g[1]+lift,clamp(g[2],TK.iz0+6,TK.iz1-2)];}return;}
  if(drag.moveItem&&drag.moved>6){const g=pickAt(e.clientX,e.clientY).ground;if(g){const it=drag.moveItem;it.x=g[0];it.z=g[2];updateItem(it);SOLID.dirty=true;markDirty();}return;}
  if(drag.moved>6)clearTimeout(holdT);
  if(MODE!=='view'&&MODE!=='place'&&MODE!=='feed'&&MODE!=='tap'&&MODE!=='move')return;
  if(drag.pan||P.b===2||P.shift)panCam(dx,dy);else{const k=.0055;CAM.t.yaw-=dx*k;CAM.t.pitch+=dy*k;clampCam();drag.vy=-dx*k/Math.max(LAST_DT,.008);drag.vp=dy*k/Math.max(LAST_DT,.008);canvas.classList.add('dragging');}}
function onUp(e){const P=ptrs.get(e.pointerId);ptrs.delete(e.pointerId);if(ptrs.size<2)lastPinch=null;clearTimeout(holdT);canvas.classList.remove('dragging');
  if(!P||!drag){if(ptrs.size===0)drag=null;return;}
  mistHold=false;
  if(drag.carry&&carried){const c=carried;carried=null;if(c.sp==='mermaid'){if(inPond(c.pos[0],c.pos[2]))c.pos[1]=PWL-2;else{const t=pondTarget();c.pos=t;}setState(c,'idle',2);}
    else if(c.sp==='faerie'||c.sp==='phoenix')setState(c,c.sp==='faerie'?'hover':'perch',2);else{if(!walkable(c.pos[0],c.pos[2],c.sp)){const p=spawnPos(c.sp);c.pos=p;}c.pos[1]=topH(c.pos[0],c.pos[2]);setState(c,'idle',1.5);}c.at=null;drag=null;return;}
  if(drag.sculpt){brushCommit(true);drag=null;return;}
  if(drag.moveItem&&drag.moved>6){drag=null;return;}
  const click=drag.moved<6&&performance.now()-P.t0<450;
  if(!click&&MODE!=='mist'&&!drag.wipe){CAM.vel.yaw=clamp(drag.vy||0,-4,4);CAM.vel.pitch=clamp(drag.vp||0,-3,3);}
  if(click)onClick(e.clientX,e.clientY);drag=null;}
function onClick(x,y){const now=performance.now();const dbl=now-lastTap<320;lastTap=now;if(STUDIO.on)return;
  if(MODE==='feed'){const g=pickAt(x,y).ground;if(g){dropFood(TOOL.food,g);sfx('plop');}return;}
  if(MODE==='place'){const g=pickAt(x,y).ground;if(g){const c=CAT[TOOL.place];if((c.place==='water'||c.place==='float')&&!inPond(g[0],g[2])){toast('That goes in the pond');return;}const it=addItem(TOOL.place,g[0],g[2],{morph:TOOL.morph||0});markDirty();sparkle([g[0],g[1]+1,g[2]],[.9,1,.8],5);}return;}
  if(MODE==='move'){const g=pickAt(x,y).ground;const it=TOOL.move;if(g&&it){it.x=g[0];it.z=g[2];updateItem(it);SOLID.dirty=true;markDirty();}setMode('view');return;}
  if(MODE==='tap'){glassTap(x,y);return;}
  if(MODE!=='view')return;
  const pk=pickAt(x,y);
  if(dbl&&pk.ground&&!pk.thing){flyTo(pk.ground);return;}
  if(pk.thing&&pk.thing.sp){if(SELECTED===pk.thing)petCrit(pk.thing);else{selectThing(pk.thing);petCrit(pk.thing);}return;}
  if(pk.thing){selectThing(pk.thing);return;}
  selectThing(null);}
let flyBack=null;function flyTo(p){if(flyBack&&V.dist(CAM.t.target,p)<4){Object.assign(CAM.t,flyBack);flyBack=null;return;}flyBack={target:CAM.t.target.slice(),dist:CAM.t.dist,pitch:CAM.t.pitch,yaw:CAM.t.yaw};CAM.t.target=[p[0],p[1]+2,p[2]];CAM.t.dist=Math.min(CAM.t.dist,40);clampCam();}
function sprayAt(x,y){const{o,d}=screenRay(x,y);const g=rayGround(o,d)||[0,20,0];TERR.spray=.35;TERR.sprayP=g;TERR.humid=Math.min(100,TERR.humid+LAST_DT*9);sfx('mist');
  TERR.rainbowP=[clamp(g[0],-35,35),20,clamp(g[2]+4,-10,22)];if(TERR.rainbow>.6)for(const c of crits)if(c.sp==='faerie'&&Math.random()<.002)event(c,'bloom');
  for(const it of items)if(it.geo.wilts&&Math.hypot(it.x-g[0],it.z-g[2])<12)it.wilt=Math.max(0,(it.wilt||0)-LAST_DT*.15);}
function glassTap(x,y){sfx('tap');const{o,d}=screenRay(x,y);const f=rayFront(o,d);const p=f?f.p:[0,30,TK.z1];
  for(const c of crits){if(c.hidden)continue;c.look=CAM.pos;if(c.sp==='faerie'&&c.state!=='sleep'){c.vel=V.add(c.vel,[(Math.random()-.5)*20,8,-12]);setState(c,'hover',1.5);}
    else if(c.sp==='mermaid'){if(c.state==='swim'||c.state==='idle')setState(c,'splash',1.2);}else if(c.state!=='sleep'&&c.state!=='curl'&&c.state!=='carried'){setState(c,c.sp==='gnome'?'wave':'idle',2.5);c.at=null;AT(c,{look:1});}}
  for(let i=0;i<4;i++)emit(5,V.add(p,[(Math.random()-.5)*2,(Math.random()-.5)*2,-.5]),[0,0,-2],.3,[1,1,1],.4,{});}
canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{e.preventDefault();const pk=pickAt(e.clientX,e.clientY);zoomBy(Math.exp(e.deltaY*.0012),pk.ground);},{passive:false});
canvas.addEventListener('dblclick',e=>e.preventDefault());
// ---------- keyboard ----------
window.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;const k=e.key.toLowerCase();if(['w','a','s','d','q','e','r','c','arrowleft','arrowright','arrowup','arrowdown','pageup','pagedown'].includes(k)){KEYS.add(k);e.preventDefault();}
  const V_={'1':'front','2':'fill','3':'close','4':'left','5':'right','6':'top','8':'falls','9':'spin'};if(V_[k])setView(V_[k]);if(k==='7'){FOLLOW_I++;setView('follow');$('bFollow').classList.add('on');}
  if(k==='0')setView('front');if(k==='u')setView('window');if(k==='f')toggleFs();if(k==='h')document.body.classList.toggle('clean');if(k==='p')togglePhoto();if(k==='j')toggleJournal();if(k==='m'){SETTINGS.sound=!SETTINGS.sound;audioInit();updateSoundBtn();}
  if(k==='escape'){if(STUDIO.on)studioExit();else if(MODE!=='view')setMode('view');else if(sheetKind)closeSheet();else selectThing(null);}});
window.addEventListener('keyup',e=>KEYS.delete(e.key.toLowerCase()));
// ---------- buttons ----------
document.querySelectorAll('#bar button').forEach(b=>b.onclick=()=>{audioInit();openSheet(b.dataset.m);});
$('shClose').onclick=closeSheet;$('toolDone').onclick=()=>setMode('view');
$('card').onclick=()=>{$('cardMore').classList.toggle('hidden');updateCard();};
function toggleFs(){const no=()=>toast('Fullscreen is not allowed here');try{const p=!document.fullscreenElement?document.documentElement.requestFullscreen():document.exitFullscreen();if(p&&p.catch)p.catch(no);}catch(e){no();}}
document.addEventListener('fullscreenchange',()=>document.body.classList.toggle('fs',!!document.fullscreenElement));
$('fsBtn').onclick=toggleFs;$('bViews').onclick=()=>$('views').classList.toggle('hidden');
document.querySelectorAll('#views [data-v]').forEach(b=>b.onclick=()=>setView(b.dataset.v));
function markView(v){document.querySelectorAll('#views [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===v||(v==='spin'&&b.dataset.v==='spin'&&SETTINGS.spin)));}
$('zIn').onclick=()=>zoomBy(.8);$('zOut').onclick=()=>zoomBy(1.25);
$('bFollow').onclick=()=>{if(SETTINGS.follow){FOLLOW_I++;}setView('follow');$('bFollow').classList.add('on');};
$('bClean').onclick=()=>document.body.classList.toggle('clean');$('bHelp').onclick=()=>$('help').classList.toggle('hidden');$('helpX').onclick=()=>$('help').classList.add('hidden');
function updateSoundBtn(){$('bSound').classList.toggle('on',SETTINGS.sound);$('bSound').querySelector('.snd').style.display=SETTINGS.sound?'':'none';}
$('bSound').onclick=()=>{SETTINGS.sound=!SETTINGS.sound;audioInit();updateSoundBtn();};
// ---------- journal ----------
let jTab='b';
function toggleJournal(){const J=$('journal');J.classList.toggle('hidden');if(!J.classList.contains('hidden'))renderJournal();}
$('bJournal').onclick=toggleJournal;$('jClose').onclick=()=>$('journal').classList.add('hidden');
document.querySelectorAll('#jTabs .tab').forEach(t=>t.onclick=()=>{jTab=t.dataset.j;document.querySelectorAll('#jTabs .tab').forEach(x=>x.classList.toggle('on',x===t));renderJournal();});
function renderJournal(){const B=$('jBody');if(jTab==='p'){B.innerHTML=JOURNAL.photos.length?`<div class="jph">${JOURNAL.photos.slice().reverse().map(p=>`<img src="${p.src}" alt="photo">`).join('')}</div>`:'<div class="note">No photos yet. Open photo mode (the lens button, or P) and take one.</div>';return;}
  let got=0,total=0;const boxes=Object.entries(BEHAVIOURS).map(([sp,list])=>{const nm=sp==='wisp'?'Will-o\'-wisps':SPECIES[sp]?SPECIES[sp].name:sp;const lis=list.map(([k,l])=>{total++;const g=!!JOURNAL.entries[sp+':'+k];if(g)got++;return`<li class="${g?'got':''}">${g?l:'???'}</li>`;}).join('');
    const known=sp==='wisp'||sp==='phoenix'?list.some(([k])=>JOURNAL.entries[sp+':'+k]):true;return`<div class="jbox"><b>${known?nm:'A rare visitor'}</b><ul>${lis}</ul></div>`;}).join('');
  B.innerHTML=`<div class="note">${got} of ${total} behaviours observed. Things only count when you see them happen on screen.</div><div class="jsp">${boxes}</div>`;}
onEvent=(sp,key,label)=>{const L=(BEHAVIOURS[sp]||[]).find(b=>b[0]===key);toast('Journal: '+(L?L[1]:label||key));sfx('chime');markDirty();if(!$('journal').classList.contains('hidden'))renderJournal();};
// ---------- photo mode ----------
function togglePhoto(){PHOTO.on=!PHOTO.on;$('photo').classList.toggle('hidden',!PHOTO.on);document.body.classList.toggle('photo',PHOTO.on);document.body.classList.remove('clean');if(!PHOTO.on){PHOTO.focus=0;PHOTO.aper=0;PHOTO.expo=1;}closeSheet();}
$('bPhoto').onclick=togglePhoto;$('phExit').onclick=togglePhoto;
$('phFocus').oninput=e=>{const v=+e.target.value;PHOTO.focus=v===0?0:lerp(8,300,Math.pow(v/100,1.6));$('phFocusO').textContent=v===0?'Auto':Math.round(PHOTO.focus)+' cm';};
$('phAper').oninput=e=>{const v=+e.target.value;PHOTO.aper=lerp(.02,1.1,v/100);$('phAperO').textContent='f/'+(16/Math.pow(2,v/25)).toFixed(1);};
$('phExpo').oninput=e=>{const v=+e.target.value;PHOTO.expo=Math.pow(2,v/60);$('phExpoO').textContent=(v/60).toFixed(1);};
let wantShot=false;$('phShot').onclick=()=>{wantShot=true;sfx('tap');$('photo').style.visibility='hidden';};
function takeShot(){wantShot=false;$('photo').style.visibility='';try{const w=480,h=Math.round(480*canvas.height/canvas.width);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(canvas,0,0,w,h);const src=c.toDataURL('image/jpeg',.82);
  JOURNAL.photos.push({src,t:Date.now()});if(JOURNAL.photos.length>12)JOURNAL.photos.shift();savePhotos();toast('Photo saved to the journal');
  const u=canvas.toDataURL('image/png'),bin=atob(u.slice(u.indexOf(',')+1)),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
  saveFile('mytharium-'+Date.now()+'.png',new Blob([arr],{type:'image/png'}));}catch(e){toast('Could not save the photo here');}}
// Offer a file: through the artifact viewer's downloads capability when running as a claude.ai artifact, else a plain link.
async function saveFile(name,blob){const c=window.claude;if(c&&typeof c.use==='function'){try{const d=await c.use('downloads');if(d){await d.save({filename:name,data:blob});toast('Photo saved');}}catch(e){if(!e||e.code!=='declined')LOG('save file',e&&e.code);}return;}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);}
