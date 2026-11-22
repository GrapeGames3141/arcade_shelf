// ============================================================
//  UI, INPUT, SAVE, TEST API, MAIN LOOP
// ============================================================
const $=id=>document.getElementById(id);
function toast(msg,ms=2400){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),ms);}
let MODE='view',decorTab='sps',sculptMode=null,brush=6,feedType='mysis';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------- default tank ----------
// a two-island reef scape: rock piles left and right with a sand channel between, corals placed where they would be in a real tank
// (light-hungry SPS up high, LPS and softies lower, plate coral and anemones on the sand), two wavemakers and an overflow at the back
function defaultTank(){items=[];nextId=1;
  const A=(k,x,z,o)=>addItem(k,x,z,Object.assign({seed:Math.round((x+60)*137+(z+30)*71)+k.length*1000},o||{}));
  // rock: many medium craggy pieces, each settled onto whatever is already below it (as real rock is stacked), but never taller
  // than about two thirds of the water column, the way a reef scape leaves open water above it for the corals to grow into
  const S=(k,x,z,sc,mx,o)=>{rebuildTop();const base=topH(x,z)-sandH(x,z);
    const it=A(k,x,z,Object.assign({scale:sc,rot:(x*7.3+z*3.1)%TAU,lift:base>1.2?Math.max(0,base-0.38*sc):0},o||{}));
    for(let g=0;g<8;g++){rebuildTop();let m=0;const R=sc*1.3;for(let u=-R;u<=R;u+=R/5)for(let v=-R;v<=R;v+=R/5)if(u*u+v*v<R*R)m=Math.max(m,topH(x+u,z+v)-sandH(x+u,z+v));
      if(m<=mx)break;if(it.lift>0.5)it.lift=Math.max(0,it.lift-(m-mx)-0.5);else it.scale*=0.88;updateItem(it);}
    return it;};
  // left island: back row tallest, stepping down to the front and toward the centre gap
  for(const[x,z,sc,mx]of[[-40,-14,6.5,20],[-31,-15,6.5,22],[-22,-14,5.5,19],[-37,-6,6,17],[-28,-7,6,18],[-18,-8,5,14],[-43,3,4.5,10],[-33,2,4.5,11],[-23,0,4,9],[-14,-1,4,8],
    [-36,-13,5,24],[-27,-12,5,25],[-31,-8,4.5,22],[-21,-11,4.5,20],[-39,-9,4.5,19],[-30,-14,4,27]])S('live',x,z,sc,mx);
  S('shelf',-25,-4,6,14);S('shelf',-35,-2,5,12);S('rubble',-10,5,4.5,4);S('rubble',-46,10,4,3);
  // right island: a little lower and wider, with an arch to swim through on the inside
  for(const[x,z,sc,mx]of[[40,-14,6.5,19],[31,-15,6,21],[22,-13,5.5,17],[37,-5,6,16],[28,-6,5.5,15],[44,3,4.5,9],[34,3,4.5,10],[24,1,4,8],
    [37,-12,5,22],[28,-11,5,23],[33,-7,4.5,20],[42,-9,4.5,18]])S('live',x,z,sc,mx);
  S('shelf',27,-1,5.5,13);S('rubble',18,7,4,3.5);
  A('arch',13,-7,{scale:7.5,rot:0.3});
  A('wave',-24,0,{lift:4});A('wave',30,0,{lift:2});A('overflow',-40,0);
  finishLayout();
  // corals go on the front lip of a ledge at a chosen height: walk in from the glass until the rock first rises above h, so each one
  // sits where you can see it (as aquarists glue frags to the faces and shoulders of the scape), SPS high, LPS mid, softies low
  rebuildTop();
  const P=(k,x,h,o)=>{for(let z=10;z>-19;z-=0.5)if(topH(x,z)-sandH(x,z)>h){const it=A(k,x,z-0.6,o);rebuildTop();return it;}return null;};
  // left island
  P('acro',-31,20,{morph:0,scale:1.15});P('acro',-38,17,{morph:1});P('bird',-24,16,{morph:0,scale:1.1});P('monti',-35,13,{morph:0,scale:1.1});P('monti',-27,14,{morph:2});P('monti',-19,11,{morph:3,scale:0.9});
  P('torch',-23,9,{morph:0,scale:1.1});P('frog',-41,9,{morph:0});P('xenia',-29,18,{morph:0});P('gsp',-36,7,{morph:0});P('candy',-17,6,{morph:0,scale:0.9});P('chalice',-31,8,{morph:0});
  P('duncan',-27,5,{morph:0,scale:0.9});P('hammer',-34,4,{morph:0,scale:0.9});P('goni',-20,3,{morph:1,scale:0.8});P('bubble',-14,4,{morph:1,scale:0.9});
  P('shroom',-43,3,{morph:0,scale:1.1});P('shroom',-15,1.5,{morph:2});P('shroom',-26,2,{morph:1,scale:0.9});
  P('zoa',-12,1,{morph:0});P('zoa',-21,6,{morph:1});P('zoa',-33,2,{morph:3,scale:0.9});P('zoa',-39,4,{morph:2,scale:0.8});P('acro',-28,23,{morph:3,scale:0.9});
  // right island
  P('brain',25,9,{morph:0,scale:1.1});P('brain',38,6,{morph:1,scale:0.9});P('hammer',36,11,{morph:2,scale:1.05});P('bta',30,8,{morph:2,scale:1.1});P('leather',31,17,{morph:0,scale:0.8});P('fan',42,15,{morph:0});
  P('bubble',21,5,{morph:0});P('acro',34,18,{morph:3,scale:1.15});P('acro',25,16,{morph:2});P('bird',40,14,{morph:1});P('monti',28,13,{morph:1,scale:0.9});P('gsp',21,10,{morph:0});
  P('frog',43,5,{morph:1,scale:0.9});P('candy',27,4,{morph:1});P('chalice',33,4,{morph:1});P('duncan',40,9,{morph:1,scale:0.9});P('goni',23,7,{morph:2,scale:0.8});P('torch',29,11,{morph:2,scale:0.9});
  P('zoa',36,2,{morph:2});P('zoa',20,2,{morph:0,scale:0.8});P('zoa',30,1.5,{morph:3,scale:0.8});P('shroom',43,2,{morph:1});P('clam',26,2,{morph:0});P('sponge',45,8,{morph:0});P('monti',37,15,{morph:0,scale:0.85});
  P('duster',14,1,{morph:0});
  P('scroll',39,13,{morph:0,scale:0.9});P('clove',-37,6,{morph:0,scale:0.9});A('elegance',-7,13,{morph:0,scale:0.9});P('acan',-30,3,{morph:0});P('acan',35,7,{morph:1,scale:0.9});P('sun',18,4,{morph:0,scale:0.9});P('kenya',44,11,{morph:0});P('kenya',-44,12,{morph:1,scale:0.9});
  // sand bed and back corners
  A('plate',3,11,{morph:0});A('flower',-6,9,{morph:0});A('flower',16,4,{morph:1,scale:0.85});A('grass',-44,-17);A('halimeda',8,-15);A('redmacro',-11,-16);A('disco',-17,-6);
  fish=[];shrimp=[];crabs=[];crawlers=[];jellies=[];mantis=[];
  addFish('clown',2);addFish('chromis',5);addFish('yellowtang',1);addFish('gramma',1);addFish('firefish',1);addFish('banggai',2);addFish('mandarin',1);addFish('flame',1);addFish('anthias',3);addFish('goby',1);
  addShrimp('cleaner',2);addShrimp('fire',1);addShrimp('pistol',1);addCrab('hermit',4);addCrab('bluehermit',3);addCrab('emerald',1);
  addCrawler('turbo',2);addCrawler('nerite',2);addCrawler('trochus',1);addCrawler('nassarius',4);addCrawler('linckia',1);addCrawler('fromia',1);addCrawler('brittle',1);addCrawler('tuxedo',1);
  addJelly('moon',2);addJelly('cassiopea',2);addMantis(1);}
function finishLayout(){rebuildTop();for(const it of items)if(CAT[it.kind].place==='epi')updateItem(it);rebuildTop();}

// ---------- save / load ----------
const SAVE_KEY='salt-aquarium.v1';
function counts(arr){const c={};for(const a of arr)c[a.sp]=(c[a.sp]||0)+1;return c;}
function serialize(){const q=new Uint8Array(SX*SZ);for(let k=0;k<SX*SZ;k++)q[k]=clamp(Math.round(sand[k]*10),0,255);let bin='';for(let i=0;i<q.length;i+=4096)bin+=String.fromCharCode.apply(null,q.subarray(i,i+4096));
  return{v:1,items:items.map(i=>({k:i.kind,s:i.seed,x:+i.x.toFixed(2),z:+i.z.toFixed(2),r:+i.rot.toFixed(3),sc:+i.scale.toFixed(3),t:+(i.tilt||0).toFixed(3),l:+(i.lift||0).toFixed(2),m:i.morph})),
    fish:counts(fish),shrimp:counts(shrimp),crabs:counts(crabs),crawlers:counts(crawlers),jellies:counts(jellies),mantis:mantis.length,tank:Object.assign({},TANK,{stamp:Date.now()}),settings:Object.assign({},SETTINGS,{follow:false}),q:QK,sand:btoa(bin)};}
let saveT=0;
function save(){if(TEST)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(serialize()));}catch(e){}}
function load(){let s=null;try{s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(e){s=null;}if(!s||s.v!==1)return false;
  try{const bin=atob(s.sand);for(let k=0;k<SX*SZ&&k<bin.length;k++)sand[k]=bin.charCodeAt(k)/10;
    items=[];nextId=1;for(const o of s.items||[])if(CAT[o.k])addItem(o.k,o.x,o.z,{seed:o.s,rot:o.r,scale:o.sc,tilt:o.t,lift:o.l,morph:o.m});
    fish=[];shrimp=[];crabs=[];crawlers=[];jellies=[];mantis=[];
    for(const k in s.fish||{})if(FISHSP[k])addFish(k,Math.min(20,s.fish[k]));for(const k in s.shrimp||{})if(SHRIMPSP[k])addShrimp(k,Math.min(20,s.shrimp[k]));
    for(const k in s.crabs||{})if(CRABSP[k])addCrab(k,Math.min(20,s.crabs[k]));for(const k in s.crawlers||{})if(CRAWLSP[k])addCrawler(k,Math.min(12,s.crawlers[k]));
    for(const k in s.jellies||{})if(JELLYSP[k])addJelly(k,Math.min(6,s.jellies[k]));addMantis(Math.min(2,s.mantis||0));
    Object.assign(SETTINGS,s.settings||{});SETTINGS.follow=false;SETTINGS.spin=false;if(!LIGHTS[SETTINGS.light])SETTINGS.light='reef';if(s.q&&QUAL[s.q]&&!Q.get('q'))QK=s.q;
    if(s.tank){Object.assign(TANK,s.tank);const away=clamp((Date.now()-(s.tank.stamp||Date.now()))/1000,0,3*86400);for(let t=0;t<away;t+=600)tankTick(Math.min(600,away-t));}
    return true;}catch(e){LOG('load failed',e.message);return false;}}

// ---------- tank card ----------
function barCol(v){return v>60?'var(--acc)':v>30?'var(--warn)':'var(--bad)';}
function ago(ms){const m=Math.round(ms/60000);if(m<1)return'just now';if(m<60)return m+' min ago';const h=Math.round(m/60);if(h<48)return h+' h ago';return Math.round(h/24)+' days ago';}
function nCorals(){return items.filter(i=>CAT[i.kind].prog==='coral'&&['sps','soft'].includes(CAT[i.kind].cat)).length;}
function updatePetCard(){$('petName').textContent='Reef tank';$('petMorph').textContent='180 L mixed reef';
  for(const[id,v]of[['bHunger',TANK.fed],['bWater',TANK.water],['bMood',TANK.coral]]){const b=$(id);b.style.width=clamp(v,3,100)+'%';b.style.background=barCol(v);}
  const m=$('petMore');if(!m.classList.contains('hidden')){const tips=[];
    if(TANK.fed<35)tips.push('The fish are hungry. Mysis is a favourite.');else if(TANK.fed>95)tips.push('Everyone is full; extra food will rot.');
    if(TANK.water<55)tips.push('Nitrate is creeping up. Do a water change in Tank.');if(TANK.coral<55)tips.push('Corals are paling. Better water brings their colour back.');
    if(fish.filter(f=>f.sp==='bluetang').length&&items.length)tips.push('A blue tang outgrows a 180 L tank in real life.');
    if(jellies.some(j=>j.sp==='moon'))tips.push('Real moon jellies need a round, gentle-flow jelly tank.');
    const inv=shrimp.length+crabs.length+crawlers.length+mantis.length+jellies.length;
    m.innerHTML=`Water 25.5 °C · salinity 1.025 · 180 L<br>${fish.length} fish · ${inv} invertebrates · ${nCorals()} corals<br>Last fed ${TANK.lastFed?ago(Date.now()-TANK.lastFed):'not yet'}`+(tips.length?'<br><span style="color:var(--warn)">'+tips.map(esc).join('<br>')+'</span>':'');}}

// ---------- sheets ----------
function openSheet(title,tabs,activeTab,onTab){$('sheet').classList.remove('hidden');$('shTitle').textContent=title;const tb=$('shTabs');tb.innerHTML='';
  if(tabs)for(const[k,l]of tabs){const b=document.createElement('button');b.className='tab'+(k===activeTab?' on':'');b.textContent=l;b.onclick=()=>onTab(k);tb.appendChild(b);}}
function closeSheet(){$('sheet').classList.add('hidden');}
function setMode(m){if(MODE===m)m='view';MODE=m;sculptMode=null;RING=[0,0,0,0];
  document.querySelectorAll('#bar button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
  canvas.classList.toggle('feed',m==='feed');$('feedbar').classList.toggle('hidden',m!=='feed');if(m!=='decor')select(null);
  if(m==='decor')renderDecor();else if(m==='animals')renderAnimals();else if(m==='tank')renderTank();else closeSheet();
  if(m==='feed')renderFeed();}
const SUBS=[{n:'Aragonite reef sand',c:'#ddd6c6',note:'Bright, with pink coralline grains.'},{n:'Black Tahitian sand',c:'#1b1b1d',note:'Makes colours pop.'},{n:'Crushed coral',c:'#cbbfae',note:'Coarse, chunky fragments.'},{n:'Pink oolite',c:'#ead3c8',note:'Very fine and soft.'}];
function renderDecor(){openSheet('Decorate',Object.entries(CATS),decorTab,k=>{decorTab=k;sculptMode=null;renderDecor();});const body=$('shBody');
  if(decorTab==='sand'){body.innerHTML=`<div class="sec">Substrate</div><div class="grid" id="subs"></div><div class="sec">Shape</div><div class="chips"><button class="chip" data-sh="slope">Slope to back</button><button class="chip" data-sh="flat">Flat</button></div>
    <div class="sec">Sculpt</div><div class="chips" id="sct">${['raise','lower','smooth','flatten'].map(m=>`<button class="chip${sculptMode===m?' on':''}" data-sc="${m}">${m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div>
    <div class="sl"><span>Brush</span><input type="range" id="brush" min="3" max="14" step="0.5" value="${brush}"><output>${brush}</output></div><div class="note">Pick a sculpt tool, then drag across the sand.</div>`;
    const sg=$('subs');SUBS.forEach((s,i)=>{const d=document.createElement('div');d.className='card'+(SETTINGS.sub===i?' on':'');d.innerHTML=`<div class="th" style="background:${s.c}"></div><div class="t">${s.n}</div><div class="s"${s.warn?' style="color:var(--warn)"':''}>${s.note}</div>`;d.onclick=()=>{SETTINGS.sub=i;if(s.warn)toast('Sand-sifting stars and nassarius snails prefer fine sand.');renderDecor();save();};sg.appendChild(d);});
    body.querySelectorAll('[data-sh]').forEach(b=>b.onclick=()=>{sandShape(b.dataset.sh);updateSandMesh();for(const it of items)updateItem(it);finishLayout();save();});
    body.querySelectorAll('[data-sc]').forEach(b=>b.onclick=()=>{sculptMode=sculptMode===b.dataset.sc?null:b.dataset.sc;renderDecor();});
    const br=$('brush');br.oninput=()=>{brush=+br.value;br.nextElementSibling.textContent=brush;};return;}
  body.innerHTML='<div class="grid" id="cards"></div><div class="note">Tap an item to add it, then drag it into place. Tap anything in the tank to select it.</div>';const g=$('cards');
  const ks=Object.keys(CAT).filter(k=>CAT[k].cat===decorTab);let delay=0;
  for(const k of ks){const c=CAT[k],d=document.createElement('div');d.className='card';d.innerHTML=`<div class="th">…</div><div class="t">${c.name}</div><div class="s">${c.sub}</div>`;
    d.onclick=()=>placeNew(k);g.appendChild(d);const th=d.querySelector('.th');
    if(TH.cache[k])th.style.backgroundImage=`url(${TH.cache[k]})`,th.textContent='';else setTimeout(()=>{try{th.style.backgroundImage=`url(${thumb(k)})`;th.textContent='';}catch(e){th.textContent='';}},(delay+=40));}}
function placeNew(kind){const c=CAT[kind];const r=screenRay(innerWidth/2,innerHeight*0.55);let p=pickGround(r.o,r.d)||[0,0,0];
  if(c.place==='epi'){const hard=items.filter(i=>CAT[i.kind].cat==='hard');if(hard.length){const h=hard[Math.floor(Math.random()*hard.length)];p=[h.x,0,h.z];}}
  const it=addItem(kind,p[0]+(Math.random()-0.5)*6,p[2]+(Math.random()-0.5)*4);if(c.solid)finishLayout();else if(c.place==='epi')updateItem(it);
  select(it);save();toast(c.name+' added. Drag it into place.');}
function select(it){SELECTED=it;const s=$('sel');if(!it){s.classList.add('hidden');RING=[0,0,0,0];if(MODE==='decor')$('sheet').classList.remove('hidden');return;}
  const c=CAT[it.kind];$('sheet').classList.add('hidden');s.classList.remove('hidden');const deg=Math.round(((it.rot%TAU)+TAU)%TAU*180/PI);
  s.innerHTML=`<div class="hd"><b>${c.name}</b><button class="x" id="selX" aria-label="Done"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button></div>
    <div class="sl"><span>Rotate</span><input type="range" id="sRot" min="0" max="360" value="${deg}"><output>${deg}°</output></div>
    <div class="sl"><span>Size</span><input type="range" id="sSc" min="${c.smin}" max="${c.smax}" step="${(c.smax-c.smin)/60}" value="${it.scale}"><output>${Math.round(it.scale/c.scale*100)}%</output></div>
    ${c.tilt?`<div class="sl"><span>Tilt</span><input type="range" id="sTl" min="-30" max="30" value="${Math.round((it.tilt||0)*180/PI)}"><output>${Math.round((it.tilt||0)*180/PI)}°</output></div>`:''}
    ${c.lift||c.place==='wall'?`<div class="sl"><span>Height</span><input type="range" id="sLf" min="${c.place==='wall'?-26:0}" max="${c.place==='wall'?8:20}" step="0.5" value="${it.lift||0}"><output>${Math.round(it.lift||0)} cm</output></div>`:''}
    ${c.morphs&&c.morphs.length>1?`<div class="chips" style="margin-top:6px">${c.morphs.map((m,i)=>`<button class="chip${morphOf(it)===m?' on':''}" data-mo="${i}"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;background:linear-gradient(135deg,${m.hex[0]},${m.hex[1]})"></span>${esc(m.n)}</button>`).join('')}</div>`:''}
    <div class="acts"><button class="btn" id="sNew">New shape</button><button class="btn" id="sDup">Duplicate</button><button class="btn dan" id="sDel">Delete</button></div>`;
  const live=(id,f,fmt)=>{const el=$(id);if(!el)return;el.oninput=()=>{f(+el.value);el.nextElementSibling.textContent=fmt(+el.value);updateItem(it);topDirty=CAT[it.kind].solid;};el.onchange=()=>{finishLayout();save();};};
  live('sRot',v=>it.rot=v*PI/180,v=>v+'°');live('sSc',v=>it.scale=v,v=>Math.round(v/c.scale*100)+'%');live('sTl',v=>it.tilt=v*PI/180,v=>v+'°');live('sLf',v=>it.lift=v,v=>Math.round(v)+' cm');
  s.querySelectorAll('[data-mo]').forEach(b=>b.onclick=()=>{it.morph=+b.dataset.mo;select(it);save();});
  $('selX').onclick=()=>select(null);
  $('sNew').onclick=()=>{it.seed=Math.floor(Math.random()*1e6);updateItem(it);finishLayout();save();};
  $('sDup').onclick=()=>{const n=addItem(it.kind,it.x+5,it.z+2,{seed:Math.floor(Math.random()*1e6),rot:it.rot+0.8,scale:it.scale,tilt:it.tilt,lift:it.lift,morph:it.morph});finishLayout();select(n);save();};
  $('sDel').onclick=()=>{removeItem(it);select(null);finishLayout();save();toast(c.name+' removed');};}
function counterRow(name,note,swatch,val,max,onSet,warn){const d=document.createElement('div');d.className='row';
  d.innerHTML=`<div class="sw" style="background:${swatch}"></div><div class="l"><b>${esc(name)}</b><span${warn?' style="color:var(--warn)"':''}>${esc(note)}</span></div><div class="cnt"><button aria-label="Fewer">−</button><output>${val}</output><button aria-label="More">+</button></div>`;
  const o=d.querySelector('output');const[m,p]=d.querySelectorAll('button');m.onclick=()=>{val=Math.max(0,val-1);o.textContent=val;onSet(val);save();};p.onclick=()=>{val=Math.min(max,val+1);o.textContent=val;onSet(val);save();};return d;}
const FSW={goby:'radial-gradient(circle at 40% 40%,#ffe060,#e0a800)',anthias:'linear-gradient(135deg,#f8a050,#f06a30)',copperband:'linear-gradient(90deg,#eee 0 20%,#d8701a 20% 35%,#eee 35% 50%,#d8701a 50% 65%,#eee 65%)',clown:'linear-gradient(90deg,#f26a0f 0 22%,#fff 22% 30%,#f26a0f 30% 52%,#fff 52% 62%,#f26a0f 62% 85%,#fff 85% 90%,#f26a0f 90%)',chromis:'linear-gradient(135deg,#6fd6b0,#2f9f8a)',
  yellowtang:'radial-gradient(circle at 40% 40%,#fff060,#f5c800)',bluetang:'linear-gradient(160deg,#2a5fe8 0 40%,#111 40% 55%,#2a5fe8 55% 80%,#ffd500 80%)',gramma:'linear-gradient(90deg,#b03cc0 50%,#ffc000 50%)',
  firefish:'linear-gradient(90deg,#f6e4c8 0 45%,#f04018 75%,#5a0a0a)',flame:'repeating-linear-gradient(90deg,#ff3a06 0 7px,#111 7px 9px)',banggai:'linear-gradient(90deg,#bbb 0 20%,#111 20% 30%,#bbb 30% 50%,#111 50% 62%,#bbb 62%)',
  sixline:'repeating-linear-gradient(180deg,#3a2aa8 0 4px,#ff7a10 4px 6px)',mandarin:'radial-gradient(circle at 30% 30%,#ff7a10 0 20%,transparent 22%),radial-gradient(circle at 70% 65%,#ff7a10 0 18%,transparent 20%),linear-gradient(135deg,#1aa0c0,#1a50a0)',
  blenny:'radial-gradient(circle at 30% 40%,#2a2010 0 12%,transparent 14%),radial-gradient(circle at 65% 60%,#2a2010 0 12%,transparent 14%),#8a7a58',puffer:'linear-gradient(90deg,#eee 0 15%,#3a2a20 15% 30%,#eee 30% 42%,#3a2a20 42% 60%,#eee 60%)'};
const ISW={pistol:'repeating-linear-gradient(90deg,#f08a30 0 5px,#fff 5px 8px)',cleaner:'linear-gradient(180deg,#fff 0 18%,#b01010 18% 50%,#e8b040 50%)',fire:'radial-gradient(circle at 30% 30%,#fff 0 8%,transparent 10%),#8a0808',pepper:'repeating-linear-gradient(90deg,#d8e4e0 0 5px,#c02020 5px 7px)',boxer:'repeating-linear-gradient(90deg,#fff 0 6px,#c01010 6px 12px)',
  hermit:'radial-gradient(circle at 70% 40%,#7a6a5a 0 40%,transparent 42%),#b01010',bluehermit:'radial-gradient(circle at 70% 40%,#5a5040 0 40%,transparent 42%),#102040',emerald:'radial-gradient(circle,#3a7a20,#1a4a10)',
  nerite:'repeating-linear-gradient(120deg,#1a120a 0 4px,#c49a3a 4px 8px)',turbo:'radial-gradient(circle,#6a5a30,#3a3018)',trochus:'repeating-linear-gradient(135deg,#e8dccc 0 5px,#8a2a18 5px 8px)',nassarius:'radial-gradient(circle,#9a9080,#6a6050)',
  linckia:'radial-gradient(circle,#1a40d0,#0a1a80)',fromia:'radial-gradient(circle,#e04020,#901808)',sifter:'radial-gradient(circle,#c8b490,#7a6a50)',brittle:'repeating-linear-gradient(90deg,#8a7060 0 4px,#3a2a20 4px 6px)',
  tuxedo:'repeating-conic-gradient(#1a6a9a 0 18deg,#140a10 18deg 36deg)',diadema:'radial-gradient(circle,#222,#000)',moon:'radial-gradient(circle,rgba(255,255,255,.2) 0 30%,#b090d0 31% 38%,rgba(220,230,255,.25) 39%)',cassiopea:'radial-gradient(circle,#5a5020,#2a2410)',peacock:'linear-gradient(90deg,#3a6a10 0 50%,#c03010 50%)'};
function renderAnimals(){openSheet('Animals');const b=$('shBody');b.innerHTML=`<div class="sec">Fish</div><div id="fl"></div><div class="sec">Shrimp, crabs and the mantis</div><div id="sl"></div>
  <div class="sec">Snails, stars and urchins</div><div id="snl"></div><div class="sec">Jellyfish</div><div id="jl"></div>
  <div class="note">Every animal here is simulated the same way. Tap one in the tank to see what it is, or use the follow button to ride along with one.</div>`;
  const fc=counts(fish),sc=counts(shrimp),cc=counts(crabs),nc=counts(crawlers),jc=counts(jellies);
  for(const k in FISHSP){const S=FISHSP[k];$('fl').appendChild(counterRow(S.name,S.note,FSW[k]||'#888',fc[k]||0,12,v=>setFishCount(k,v),k==='bluetang'));}
  for(const k in SHRIMPSP){const S=SHRIMPSP[k];$('sl').appendChild(counterRow(S.name,S.note,ISW[k],sc[k]||0,10,v=>setShrimpCount(k,v)));}
  for(const k in CRABSP){const S=CRABSP[k];$('sl').appendChild(counterRow(S.name,S.note,ISW[k],cc[k]||0,12,v=>setCrabCount(k,v)));}
  $('sl').appendChild(counterRow(MANTISSP.peacock.name,MANTISSP.peacock.note,ISW.peacock,mantis.length,2,v=>setMantisCount(v)));
  for(const k in CRAWLSP){const S=CRAWLSP[k];$('snl').appendChild(counterRow(S.name,S.note,ISW[k],nc[k]||0,S.cat==='snail'?12:4,v=>setCrawlerCount(k,v)));}
  for(const k in JELLYSP){const S=JELLYSP[k];$('jl').appendChild(counterRow(S.name,S.note,ISW[k],jc[k]||0,6,v=>setJellyCount(k,v),k==='moon'));}}
function renderTank(){openSheet('Tank');const b=$('shBody');const ch=(key,opts,cur)=>`<div class="chips">${opts.map(([k,l])=>`<button class="chip${cur===k?' on':''}" data-${key}="${k}">${l}</button>`).join('')}</div>`;
  b.innerHTML=`<div class="sec">Light</div>${ch('lt',Object.entries(LIGHTS).map(([k,v])=>[k,v.name]),SETTINGS.autoDay?'':SETTINGS.light)}
    <div class="chips" style="margin-top:6px"><button class="chip${SETTINGS.autoDay?' on':''}" id="auto">Follow my clock</button></div>
    <div class="sec">Background</div>${ch('bg',[['blue','Deep blue'],['black','Black'],['frosted','Frosted']],SETTINGS.bg)}
    <div class="sec">Flow</div><div class="chips"><button class="chip${SETTINGS.air>0?' on':''}" id="air">Wavemakers ${SETTINGS.air>0?'on':'off'}</button></div>
    <div class="sec">Water</div><div class="row"><div class="l"><b>Water quality ${Math.round(TANK.water)}%</b><span>Leftover food and time raise nitrate; corals pale when it is poor.</span></div><button class="btn pri" id="wc">Water change</button></div>
    <div class="sec">Graphics</div>${ch('q',[['low','Low'],['med','Medium'],['high','High'],['max','MAX']],QK)}
    <div class="chips" style="margin-top:6px"><button class="chip${SETTINGS.dof!==false?' on':''}" id="dof">Camera focus blur</button><button class="chip${SETTINGS.ao!==false?' on':''}" id="aoc">Contact shading</button></div>
    <div class="sec">Layout</div><div class="chips"><button class="chip" id="rst">Reset to starter tank</button><button class="chip" id="emp">Remove all decor</button></div>`;
  b.querySelectorAll('[data-lt]').forEach(e=>e.onclick=()=>{SETTINGS.light=e.dataset.lt;SETTINGS.autoDay=false;renderTank();save();});
  $('auto').onclick=()=>{SETTINGS.autoDay=!SETTINGS.autoDay;renderTank();save();};
  b.querySelectorAll('[data-bg]').forEach(e=>e.onclick=()=>{SETTINGS.bg=e.dataset.bg;renderTank();save();});
  $('air').onclick=()=>{SETTINGS.air=SETTINGS.air>0?0:1;renderTank();save();};
  $('wc').onclick=()=>{TANK.water=clamp(TANK.water+40,0,100);foods=foods.filter(f=>f.state!=='rest');toast('Changed 20% of the water with fresh salt mix.');renderTank();save();};
  b.querySelectorAll('[data-q]').forEach(e=>e.onclick=()=>{QK=e.dataset.q;applyQuality();renderTank();save();});
  $('dof').onclick=()=>{SETTINGS.dof=SETTINGS.dof===false;renderTank();save();};$('aoc').onclick=()=>{SETTINGS.ao=SETTINGS.ao===false;renderTank();save();};
  $('rst').onclick=()=>{if(!confirmTap('rst'))return;sandShape('slope');defaultTank();updateSandMesh();finishLayout();save();renderTank();toast('Starter reef restored');};
  $('emp').onclick=()=>{if(!confirmTap('emp'))return;items=items.filter(i=>CAT[i.kind].cat==='decor');finishLayout();save();toast('Rock and corals removed. Decorate to start fresh.');};}
let confirmK=null,confirmT=0;function confirmTap(k){const n=performance.now();if(confirmK===k&&n-confirmT<2500){confirmK=null;return true;}confirmK=k;confirmT=n;toast('Tap again to confirm');return false;}
function renderFeed(){const fb=$('feedbar');fb.innerHTML=`<div class="chips">${Object.entries(FOODS).map(([k,f])=>`<button class="chip${feedType===k?' on':''}" data-f="${k}">${f.name}</button>`).join('')}<button class="chip" id="fDone">Done</button></div><div class="hint">${esc(FOODS[feedType].note)}: tap the water to drop some in.</div>`;
  fb.querySelectorAll('[data-f]').forEach(e=>e.onclick=()=>{feedType=e.dataset.f;renderFeed();});$('fDone').onclick=()=>setMode('view');}

// ---------- quality / resize ----------
let needRT=true;
function applyQuality(){needRT=true;setupShadow();}
function resize(){const q=QUAL[QK],dpr=Math.min(devicePixelRatio||1,q.dpr)*q.scale;const w=Math.max(2,Math.round(canvas.clientWidth*dpr)),h=Math.max(2,Math.round(canvas.clientHeight*dpr));
  if(needRT||canvas.width!==w||canvas.height!==h){const first=!RT.w;canvas.width=w;canvas.height=h;setupRT(w,h);needRT=false;if(first)resetView(true);}}
function resetView(snap){setView('front');if(snap){const t=CAM.t;Object.assign(CAM,{target:t.target.slice(),yaw:t.yaw,pitch:t.pitch,dist:t.dist});}}
function markView(name){document.querySelectorAll('#views [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===name));$('bFollow').classList.toggle('on',!!SETTINGS.follow);}

// ---------- fullscreen ----------
const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
function toggleFs(){const B=document.body;
  if(fsEl()){(document.exitFullscreen||document.webkitExitFullscreen).call(document);return;}
  if(B.classList.contains('fake')){B.classList.remove('fake');onFsChange();return;}
  const el=document.documentElement,req=el.requestFullscreen||el.webkitRequestFullscreen;if(!req){fsFallback();return;}
  let pr=null;try{pr=req.call(el);}catch(e){fsFallback();return;}if(pr&&pr.then)pr.then(()=>{},()=>fsFallback());}
function fsFallback(){document.body.classList.add('fake');onFsChange();toast('This window blocks real fullscreen (press F11, or open the file in your browser). Showing the full tank view instead.',4200);}
function onFsChange(){const B=document.body,on=!!fsEl()||B.classList.contains('fake');B.classList.toggle('fs',on);
  setTimeout(()=>{resize();setView(on?'fill':'front');},80);if(on)idleKick();else{B.classList.remove('idle');clearTimeout(idleT);}}
document.addEventListener('fullscreenchange',onFsChange);document.addEventListener('webkitfullscreenchange',onFsChange);
let idleT=0;
function idleKick(){const B=document.body;B.classList.remove('idle');clearTimeout(idleT);if(!B.classList.contains('fs'))return;
  idleT=setTimeout(()=>{const busy=MODE!=='view'||SELECTED||!$('views').classList.contains('hidden')||!$('help').classList.contains('hidden');if(busy)idleKick();else B.classList.add('idle');},2800);}
addEventListener('pointermove',idleKick,{passive:true});addEventListener('keydown',idleKick);addEventListener('pointerdown',idleKick);

// ---------- input ----------
const ptrs=new Map();let drag=null,lastTap=0,lastTapXY=[0,0];
// every animal as a pick target: [kind label, object, centre, radius]
function animalTargets(){const out=[];
  for(const f of fish)out.push(['fish',f,f.p,f.size*0.32+0.4,FISHSP[f.sp]]);
  for(const s of shrimp)out.push(['shrimp',s,V.add(s.p,[0,s.size*0.15,0]),s.size*0.3+0.4,SHRIMPSP[s.sp]]);
  for(const c of crabs)out.push(['crab',c,V.add(c.p,[0,c.size*0.2,0]),c.size*0.4+0.3,CRABSP[c.sp]]);
  for(const c of crawlers){if(c.buried&&CRAWLSP[c.sp].burrow)continue;const{up}=crawlBasis(c);out.push(['crawler',c,V.madd(c.p,up,c.size*0.15),c.size*(CRAWLSP[c.sp].cat==='star'?0.42:0.45)+0.3,CRAWLSP[c.sp]]);}
  for(const j of jellies)out.push(['jelly',j,j.p,j.size*0.5,JELLYSP[j.sp]]);
  for(const m of mantis)out.push(['mantis',m,V.add(m.p,[0,1,0]),m.size*(0.15+0.3*m.out)+0.6,MANTISSP.peacock]);
  return out;}
function pickAnimal(o,d){let best=null,bt=1e9;for(const a of animalTargets()){const t=raySphere(o,d,a[2],a[3]);if(t>=0&&t<bt){bt=t;best=a;}}return best?{a:best,t:bt}:null;}
// follow: ride along with one animal; pressing follow again moves on to the next one
const FOLLOW={o:null,kind:'',name:''};
function followTarget(){const o=FOLLOW.o;if(!o)return null;const alive=FOLLOW.kind==='fish'?fish.includes(o):FOLLOW.kind==='shrimp'?shrimp.includes(o):FOLLOW.kind==='crab'?crabs.includes(o):FOLLOW.kind==='crawler'?crawlers.includes(o):FOLLOW.kind==='jelly'?jellies.includes(o):mantis.includes(o);
  if(!alive){FOLLOW.o=null;return null;}return o.p;}
function followNext(){const all=animalTargets();if(!all.length)return null;let i=all.findIndex(a=>a[1]===FOLLOW.o);i=(i+1+Math.floor(Math.random()*Math.max(1,all.length-1)))%all.length;const a=all[i];FOLLOW.o=a[1];FOLLOW.kind=a[0];FOLLOW.name=a[4].name;return a;}
function hitPoint(px,py){const r=screenRay(px,py);const an=pickAnimal(r.o,r.d);const it=pickItem(r.o,r.d);const g=pickGround(r.o,r.d);
  let best=g?V.dist(r.o,g):1e9,p=g;if(it&&it.t<best){best=it.t;p=V.madd(r.o,r.d,it.t);}if(an&&an.t<best){p=an.a[2].slice();}return p;}
function closePops(){$('views').classList.add('hidden');}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{const wake=document.body.classList.contains('idle');closePops();try{canvas.setPointerCapture(e.pointerId);}catch(_){}ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2){const[a,b]=[...ptrs.values()];drag={type:'pinch',d:Math.hypot(a.x-b.x,a.y-b.y),a:Math.atan2(b.y-a.y,b.x-a.x),mx:(a.x+b.x)/2,my:(a.y+b.y)/2,moved:true};CAM.vel.yaw=CAM.vel.pitch=0;return;}
  if(ptrs.size>2)return;
  const base={x0:e.clientX,y0:e.clientY,lx:e.clientX,ly:e.clientY,lt:e.timeStamp,t0:performance.now(),moved:false,wake,vy:0,vp:0};
  CAM.vel.yaw=CAM.vel.pitch=0;
  if(MODE==='decor'){const r=screenRay(e.clientX,e.clientY);
    if(sculptMode){drag=Object.assign(base,{type:'sculpt'});return;}
    const h=pickItem(r.o,r.d);if(h){if(SELECTED!==h.it)select(h.it);const it=h.it;const gp=pickGround(r.o,r.d,sand)||[it.x,0,it.z];
      drag=Object.assign(base,{type:'move',it,off:[it.x-gp[0],it.z-gp[2]]});if(CAT[it.kind].place==='epi')it._topEx=topWithout(it);return;}}
  drag=Object.assign(base,{type:(e.button===1||e.button===2||e.shiftKey)?'pan':'orbit'});canvas.classList.add('dragging');});
canvas.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;if(!drag)return;
  if(drag.type==='pinch'){if(ptrs.size<2)return;const[a,b]=[...ptrs.values()];const d=Math.max(10,Math.hypot(a.x-b.x,a.y-b.y)),ang=Math.atan2(b.y-a.y,b.x-a.x),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    let da=ang-drag.a;if(da>PI)da-=TAU;if(da<-PI)da+=TAU;
    if(SELECTED&&MODE==='decor'){SELECTED.rot-=da;updateItem(SELECTED);topDirty=CAT[SELECTED.kind].solid;}
    else{zoomBy(drag.d/d,hitPoint(mx,my));panCam(mx-drag.mx,my-drag.my);CAM.t.yaw-=da;clampCam();}
    drag.d=d;drag.a=ang;drag.mx=mx;drag.my=my;return;}
  const now=e.timeStamp,ix=e.clientX-drag.lx,iy=e.clientY-drag.ly,idt=Math.max(4,now-drag.lt);drag.lx=e.clientX;drag.ly=e.clientY;drag.lt=now;
  if(Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)>6)drag.moved=true;
  if(drag.type==='orbit'){const fy=-ix*0.0055,fp=iy*0.0045;CAM.t.yaw+=fy;CAM.t.pitch+=fp;clampCam();drag.vy=lerp(drag.vy,fy/idt*1000,0.5);drag.vp=lerp(drag.vp,fp/idt*1000,0.5);}
  else if(drag.type==='pan'){panCam(ix,iy);if(SETTINGS.follow){SETTINGS.follow=false;markView('');}}
  else if(drag.type==='move'&&drag.moved){const r=screenRay(e.clientX,e.clientY);const g=pickGround(r.o,r.d,sand);if(g){const it=drag.it;it.x=clamp(g[0]+drag.off[0],TK.x0+1.5,TK.x1-1.5);it.z=clamp(g[2]+drag.off[1],TK.z0+1.5,TK.z1-1.5);if(it.drift){it.drift[0]=it.drift[1]=0;}updateItem(it);}}
  else if(drag.type==='sculpt'){const r=screenRay(e.clientX,e.clientY);const g=pickGround(r.o,r.d,sand);if(g){sculpt(g[0],g[2],sculptMode,brush,1/60);updateSandMesh();topDirty=true;drag.sculpted=true;RING=[g[0],g[2],brush,1];}}});
function endPtr(e){ptrs.delete(e.pointerId);canvas.classList.remove('dragging');if(!drag)return;const d=drag;
  if(d.type==='pinch'){if(ptrs.size===0){drag=null;if(SELECTED){finishLayout();save();}}return;}drag=null;
  if(d.type==='move'){delete d.it._topEx;if(d.moved){updateItem(d.it);finishLayout();save();}return;}
  if(d.type==='sculpt'){if(d.sculpted){for(const it of items)updateItem(it);finishLayout();save();}RING=[0,0,0,0];return;}
  if(d.type==='orbit'&&d.moved&&e.timeStamp-d.lt<90){CAM.vel.yaw=clamp(d.vy*0.7,-3,3);CAM.vel.pitch=clamp(d.vp*0.7,-2,2);}
  if(!d.moved&&performance.now()-d.t0<450&&!d.wake)tap(e);}
canvas.addEventListener('pointerup',endPtr);canvas.addEventListener('pointercancel',endPtr);
function flyTo(px,py){const h=hitPoint(px,py);const near=CAM.t.dist<50;
  if(!h||near){setView(CAM.view0==='fill'||document.body.classList.contains('fs')?'fill':'front');return;}
  SETTINGS.follow=false;markView('');CAM.t.target=[h[0],h[1]+1.2,h[2]];CAM.t.dist=36;CAM.t.pitch=clamp(CAM.t.pitch,0.05,0.9);clampCam();}
function tap(e){if(document.body.classList.contains('clean')){document.body.classList.remove('clean');return;}
  const now=performance.now(),dbl=now-lastTap<330&&Math.hypot(e.clientX-lastTapXY[0],e.clientY-lastTapXY[1])<40;lastTap=dbl?0:now;lastTapXY=[e.clientX,e.clientY];const r=screenRay(e.clientX,e.clientY);
  if(MODE==='feed'){const g=pickGround(r.o,r.d)||[0,0,0];if(foods.length<140)dropFood(feedType,g[0],g[2]);return;}
  if(MODE==='decor'){if(dbl)flyTo(e.clientX,e.clientY);else select(null);return;}
  if(dbl){flyTo(e.clientX,e.clientY);return;}
  // tap anything to see what it is; tapping the glass startles whatever is near
  const an=pickAnimal(r.o,r.d),it=pickItem(r.o,r.d),g=pickGround(r.o,r.d);const tg=g?V.dist(r.o,g):1e9;
  if(an&&an.t<=Math.min(tg,it?it.t:1e9)+0.5){toast(an.a[4].name+(an.a[4].note?': '+an.a[4].note:''),3200);return;}
  if(it&&it.t<tg+0.5){const c=CAT[it.it.kind],m=morphOf(it.it);toast(c.name+(m&&c.morphs.length>1?' ('+m.n+')':'')+': '+c.sub,2800);if(c.retract){it.it.retractT=3;}return;}
  const gp=glassPoint(r.o,r.d);if(gp){startleAt(gp);return;}}
// where a tap ray meets a side pane of the tank (null for the open top, or if the camera is inside the tank)
function glassPoint(o,d){const lo=[TK.x0,0,TK.z0],hi=[TK.x1,TK.top,TK.z1];if(o[0]>lo[0]&&o[0]<hi[0]&&o[1]>lo[1]&&o[1]<hi[1]&&o[2]>lo[2]&&o[2]<hi[2])return null;
  let t0=-1e9,t1=1e9,ax=-1;for(let k=0;k<3;k++){if(Math.abs(d[k])<1e-6){if(o[k]<lo[k]||o[k]>hi[k])return null;continue;}let a=(lo[k]-o[k])/d[k],b=(hi[k]-o[k])/d[k];if(a>b){const tt=a;a=b;b=tt;}if(a>t0){t0=a;ax=k;}t1=Math.min(t1,b);}
  if(t0>t1||t0<0||ax===1)return null;const p=V.madd(o,d,t0);return p[1]<TK.wl?p:null;}
canvas.addEventListener('wheel',e=>{e.preventDefault();const dy=e.deltaMode===1?e.deltaY*30:e.deltaY;const f=Math.exp(clamp(dy,-240,240)*(e.ctrlKey?0.006:0.0012));
  const toward=f<1?hitPoint(e.clientX,e.clientY):null;zoomBy(f,toward);if(SETTINGS.follow&&toward){SETTINGS.follow=false;markView('');}},{passive:false});
const MOVEK=new Set(['w','a','s','d','q','e','r','c','arrowup','arrowdown','arrowleft','arrowright','pageup','pagedown']);
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.toLowerCase();
  if(MOVEK.has(k)){KEYS.add(k);CAM.vel.yaw=CAM.vel.pitch=0;if(k.startsWith('arrow')||k.startsWith('page'))e.preventDefault();if(SETTINGS.follow&&'adrc'.includes(k[0])&&k.length===1){SETTINGS.follow=false;markView('');}return;}
  if(k==='h')document.body.classList.toggle('clean');
  else if(k==='f')toggleFs();
  else if(k==='?'||k==='/'){$('help').classList.toggle('hidden');closePops();}
  else if(k==='0'||k==='home')setView(document.body.classList.contains('fs')?'fill':'front');
  else if(k>='1'&&k<='9'){const v=['front','fill','close','left','right','top','follow','back','spin'][+k-1];if(v==='follow'){const a=followNext();if(a){setView('follow');toast('Following a '+a[4].name,1800);}}else{if(v==='close'&&!FOLLOW.o)followNext();setView(v);}}
  else if(k==='escape'){if(!$('help').classList.contains('hidden'))$('help').classList.add('hidden');else if(SELECTED)select(null);else setMode('view');}
  else if((k==='delete'||k==='backspace')&&SELECTED&&MODE==='decor'){const it=SELECTED;removeItem(it);select(null);finishLayout();save();}});
addEventListener('keyup',e=>KEYS.delete(e.key.toLowerCase()));addEventListener('blur',()=>KEYS.clear());
document.querySelectorAll('#bar button').forEach(b=>b.onclick=()=>setMode(b.dataset.m));
$('shClose').onclick=()=>setMode('view');
$('pet').onclick=()=>{$('petMore').classList.toggle('hidden');updatePetCard();};
$('bFs').onclick=toggleFs;
$('bViews').onclick=()=>{$('views').classList.toggle('hidden');$('help').classList.add('hidden');markView(SETTINGS.follow?'follow':CAM.view0);};
document.querySelectorAll('#views [data-v]').forEach(b=>b.onclick=()=>setView(b.dataset.v));
$('zIn').onclick=()=>zoomBy(1/1.3,CAM.t.target);$('zOut').onclick=()=>zoomBy(1.3,CAM.t.target);
$('bFollow').onclick=()=>{const a=followNext();if(!a){toast('No animals to follow');return;}setView('follow');toast('Following a '+a[4].name+'. Press again for another, or pick a view to stop.',2600);};
$('bClean').onclick=()=>{document.body.classList.add('clean');toast('Tap anywhere (or press H) to bring the controls back',1800);};
$('bHelp').onclick=()=>{$('help').classList.toggle('hidden');closePops();};$('helpX').onclick=()=>$('help').classList.add('hidden');
addEventListener('visibilitychange',()=>{if(document.hidden)save();});addEventListener('pagehide',save);

// ---------- test API ----------
const SA={ready:false,errors:ERRS,stats:STATS,
  state(){return{t:+SIMT.toFixed(2),mode:MODE,q:QK,res:[RT.w,RT.h],msaa:RT.samples,items:items.length,corals:nCorals(),fish:fish.length,shrimp:shrimp.length,crabs:crabs.length,crawlers:crawlers.length,jellies:jellies.length,mantis:mantis.map(m=>m.state),
    foods:foods.length,plankton:plankton.length,bubbles:bubbles.length,flow:+FLOW.A.toFixed(2),tank:{fed:+TANK.fed.toFixed(1),water:+TANK.water.toFixed(1),coral:+TANK.coral.toFixed(1)},light:SETTINGS.light,draws:STATS.draws,tris:Math.round(STATS.tris),errors:ERRS.length};},
  step(sec,dt=1/30){const n=Math.round(sec/dt);for(let i=0;i<n;i++){simStep(dt);if(SIM.ok&&SA.ready){ambientDrops(dt);simStepGPU(Math.round(dt*120));}}return SA.state();},
  cam(o){Object.assign(CAM.t,o);Object.assign(CAM,o);SETTINGS.follow=false;},snap(){const t=CAM.t;Object.assign(CAM,{target:t.target.slice(),yaw:t.yaw,pitch:t.pitch,dist:t.dist});},
  add(kind,x,z,o){const it=addItem(kind,x,z,o||{});finishLayout();return it&&it.id;},
  remove(id){const it=items.find(i=>i.id===id);if(it){removeItem(it);finishLayout();}},
  clear(){items=[];fish=[];shrimp=[];crabs=[];crawlers=[];jellies=[];mantis=[];foods=[];plankton=[];finishLayout();},
  items(){return items.map(i=>({id:i.id,kind:i.kind,x:+i.x.toFixed(1),z:+i.z.toFixed(1),y:+i.y.toFixed(1),scale:i.scale,morph:morphOf(i)?morphOf(i).n:null}));},
  select(id){if(MODE!=='decor')setMode('decor');select(items.find(i=>i.id===id)||null);},
  feed(type,x,z){dropFood(type,x,z);},glassTap(x,y,z){return startleAt([x,y,z]);},mode(m){setMode(m);},view(v){setView(v);},key(k,down){down?KEYS.add(k):KEYS.delete(k);},fs(){toggleFs();},
  animals(kind,sp,n){({fish:setFishCount,shrimp:setShrimpCount,crab:setCrabCount,crawler:setCrawlerCount,jelly:setJellyCount})[kind](sp,n);},mantis(n){setMantisCount(n);},
  place(list,kind,sp,pos){const L={fish,shrimp,crabs,crawlers,jellies,mantis}[list];const o=L.find(a=>a.sp===sp)||L[0];if(o&&pos){o.p=pos.slice();if(o.b)o.b=pos.slice();if(o.surf)o.surf='floor';}return!!o;},
  follow(){const a=followNext();if(a)setView('follow');return a?a[4].name:null;},
  set(k,v){if(k==='q'){QK=v;applyQuality();}else if(k in SETTINGS)SETTINGS[k]=v;else if(k in TANK)TANK[k]=v;},
  sandShape(s){sandShape(s);updateSandMesh();for(const it of items)updateItem(it);finishLayout();},
  frame(){resize();updateCamera(1);updateLight(1);if(topDirty)rebuildTop();fillInstances();render();},
  thumb(k){return thumb(k);},
  pix(x,y){const p=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return[...p];}};
if(TEST)SA._eval=src=>eval(src);
window.SA=SA;

// ---------- main loop ----------
let last=performance.now(),uiT=0,perf={t:0,n:0,acc:0,checked:0};
function frame(now){requestAnimationFrame(frame);const dt=Math.min(0.05,Math.max(0,(now-last)/1000));last=now;
  LAST_DT=TEST?1/60:dt;
  try{if(!TEST)simStep(dt);resize();updateCamera(TEST?1:dt);updateLight(TEST?1:dt);if(topDirty)rebuildTop();
    if(SELECTED&&MODE==='decor')RING=[SELECTED.x+(SELECTED.drift?SELECTED.drift[0]:0),SELECTED.z+(SELECTED.drift?SELECTED.drift[1]:0),Math.max(3,SELECTED.wr*0.75),1];
    fillInstances();render();}
  catch(err){if(!frame.err){frame.err=1;fatal('Render error: '+err.message);}}
  uiT+=dt;if(uiT>0.5){uiT=0;updatePetCard();}
  saveT+=dt;if(saveT>20){saveT=0;save();}
  if(!TEST&&perf.checked<2){perf.t+=dt;if(perf.t>3){perf.acc+=dt;perf.n++;if(perf.n>=90){const avg=perf.acc/perf.n;perf.n=0;perf.acc=0;perf.t=0;
      if(avg>1/26&&QK!=='low'&&QK!=='max'){QK=QK==='high'?'med':'low';applyQuality();perf.checked++;toast('Graphics set to '+(QK==='med'?'Medium':'Low')+' for smoother motion');}else perf.checked=2;}}}}
function init(){
  try{buildPrograms();}catch(e){fatal(e.message);return;}
  setupCaustics();setupShadow();buildStaticMeshes();initParticles();
  const loaded=!TEST&&load();if(!loaded){sandShape(Q.get('sand')==='flat'?'flat':'slope');defaultTank();}
  setupShadow();updateSandMesh();finishLayout();
  resize();updateCamera(1);updateLight(1);updatePetCard();
  requestAnimationFrame(frame);
  setTimeout(()=>$('load').classList.add('out'),TEST?0:250);
  SA.ready=true;LOG('ready',JSON.stringify({q:QK,res:[RT.w,RT.h],msaa:RT.samples,hdr:!!EXT_CBF,items:items.length,loaded}));
  const desk=!matchMedia('(pointer: coarse)').matches;
  if(!loaded&&!TEST){setTimeout(()=>toast('Welcome to the reef. Tap any animal or coral to see what it is.',4200),900);if(desk)setTimeout(()=>toast('Press ? for controls, F for fullscreen',3200),5600);}
  else if(!TEST&&!matchMedia('(pointer: coarse)').matches)setTimeout(()=>toast('Press ? for controls, F for fullscreen',3000),900);}
init();
})();
</script>
</body>
</html>
