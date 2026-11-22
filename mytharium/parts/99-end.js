
// ============================================================
//  START-UP, MAIN LOOP, TEST API
// ============================================================
// Smooth frame rate: when frames run slow, render at a lower resolution (the picture is scaled up to the window) and come back up when
// there is room. Never on MAX. A display that caps the frame rate (30 Hz power saving) is noticed: lowering the resolution changes
// nothing there, so it is put back and left alone.
const FR={t0:1e12,scale:1,acc:0,n:0,avg:16.7,fps:60,hold:0,wait:4,before:0,tried:0,capped:false,worst:0};
function frameRate(ms){if(performance.now()<FR.t0)return;ms=Math.min(ms,250);FR.acc+=ms;FR.n++;if(ms>FR.worst)FR.worst=ms;if(FR.acc<1000)return;FR.avg=FR.acc/FR.n;FR.fps=1000/FR.avg;const worst=FR.worst;FR.acc=0;FR.n=0;FR.worst=0;
  if(SETTINGS.fps){const e=$('fps');if(e)e.textContent=`${FR.fps.toFixed(0)} fps · ${FR.avg.toFixed(1)} ms (worst ${worst.toFixed(0)}) · ${canvas.width}×${canvas.height}${FR.scale<1?' ('+Math.round(FR.scale*100)+'%)':''} · ${(STATS.splats/1000).toFixed(0)}k splats · ${STATS.draws} draws`;}
  if(!SETTINGS.smooth||QK==='max'||TEST||document.hidden||FR.capped||PHOTO.on){if((QK==='max'||!SETTINGS.smooth)&&FR.scale!==1){FR.scale=1;resize();}return;}
  if(FR.tried>0){FR.tried--;if(FR.tried===0&&FR.avg>FR.before*.93&&FR.scale<.8){FR.capped=true;FR.scale=1;resize();LOG('frame rate looks capped at',FR.fps.toFixed(0),'fps: resolution scaling off');}return;}
  if(FR.avg>21.5&&FR.scale>.5){FR.before=FR.avg;FR.scale=Math.max(.5,FR.scale*(FR.avg>30?.75:.87));FR.tried=2;FR.hold=0;resize();}
  else if(FR.avg<17.6&&FR.scale<1){if(++FR.hold>=FR.wait){FR.hold=0;FR.wait=Math.min(60,FR.wait*2);FR.scale=Math.min(1,FR.scale*1.1);resize();}}else FR.hold=0;}
function resize(){const q=QUAL[QK];const dpr=Math.min(window.devicePixelRatio||1,q.dpr)*FR.scale;const w=Math.max(2,Math.round(canvas.clientWidth*dpr)),h=Math.max(2,Math.round(canvas.clientHeight*dpr));
  if(canvas.width!==w||canvas.height!==h||RT.w!==w){canvas.width=w;canvas.height=h;setupRT(w,h);}}
window.addEventListener('resize',()=>{resize();});
let cardT=0;
function tick(dt){LAST_DT=dt;updateLight(dt);lifeUpdate(dt);visitors(dt);poseAll(dt);updateCamera(dt);wipeDecay(dt);audioUpdate(dt);
  for(const c of crits){if(c.prevS!==c.state){const s=c.state;if(s==='fire')sfx('fire');else if(s==='dive'||s==='splash')sfx('splash');else if(s==='sing')song();else if(s==='burst')sfx('cry');c.prevS=s;}}
  if(TER.dirty){brushT+=dt;if(brushT>.25)brushCommit();}
  if(SELECTED){const p=SELECTED.sp?SELECTED.pos:[SELECTED.x,SELECTED.y,SELECTED.z];const r=SELECTED.sp?critRadius(SELECTED)*.8:Math.max(1.5,SELECTED.geo.r*SELECTED.scale*.55);RING=[p[0],SELECTED.sp&&(SELECTED.sp==='faerie'||SELECTED.sp==='phoenix')?topH(p[0],p[2]):p[1],p[2],r];}else RING=[0,0,0,0];
  // lanterns go out at dawn
  if(LIGHT.night<.15)for(const it of items)if(it.lit&&it.geo.lantern)it.lit=0;
  if(DAY>.3&&DAY<.6)TERR.sungToday=0;
  cardT+=dt;if(cardT>.5){cardT=0;updateCard();if(SELECTED&&!$('sel').classList.contains('hidden')&&SELECTED.sp)renderSel();}
  saveT+=dt;if(saveT>30){saveT=0;saveState();}}
let last=performance.now();
function loop(now){requestAnimationFrame(loop);let dt=(now-last)/1000;last=now;if(!(dt>0))dt=1/60;frameRate(dt*1000);dt=Math.min(dt,.05);resize();tick(dt);try{render();}catch(e){if(!loop.err){loop.err=1;fatal('Render error: '+e.message);}}if(wantShot)takeShot();}
// Start-up runs in small steps with a breath between them, so the loading screen keeps moving and the browser never decides the
// page has hung. Shaders compile in the background meanwhile (see progStart).
async function init(){const L=$('load'),bar=$('loadBar'),txt=$('loadTxt');const t0=performance.now();let done=0;const STEPS=46;
  const breath=()=>TEST?Promise.resolve():new Promise(r=>{let f=false;const go=()=>{if(!f){f=true;r();}};if(document.hidden)setTimeout(go,0);else{requestAnimationFrame(()=>setTimeout(go,0));setTimeout(go,120);}});
  const step=async label=>{done++;if(txt&&label)txt.textContent=label+'…';if(bar)bar.style.transform='scaleX('+Math.min(.98,done/STEPS).toFixed(3)+')';await breath();};
  try{
    await step('Mixing the light');buildPrograms();
    await step('Filling the pond');setupShadow();setupPond();setupWipe();
    const want={};try{const sv=TEST?null:JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(sv&&sv.v===3)for(const c of sv.crits||[])want[c.sp]=1;}catch(e){}
    await buildCreatureAssets(step,want);
    await step('Laying the soil');defaultTerrain();buildTerrainMesh();updatePondTex();
    await step('Arranging the terrarium');const loaded=loadState();if(loaded){updateTerrainMesh();updatePondTex();}else defaultScape();
    await buildChunksStepped(step);
    await step('Hanging the ivy');buildStaticMeshes();buildSmallMeshes();loadPhotos();
    // wait for the driver to finish the shaders, a frame at a time
    await step('Mixing the light');if(TEST)programsLeft(true);else{let guard=0;while(programsLeft(false)>0){await breath();if(++guard>1500){while(programsLeft(true)>0)await breath();}}}
    applyFps();resize();setView('front');CAM.target=CAM.t.target.slice();CAM.yaw=CAM.t.yaw;CAM.pitch=CAM.t.pitch;CAM.dist=CAM.t.dist;updateSoundBtn();
    LOG('ready in',Math.round(performance.now()-t0),'ms',QK,'items',items.length,'creatures',crits.length,loaded?'(loaded save)':'(starter scape)',EXT_PAR?'':'(no parallel shader compile)');
    if(!TEST){await step('Opening the doors');tick(1/60);render();await breath();} // the first frame warms the driver while the screen is still covered
  }catch(e){fatal(e.message||String(e));throw e;}
  if(bar)bar.style.transform='scaleX(1)';L.classList.add('out');setTimeout(()=>L.remove(),900);
  FR.t0=performance.now()+4000; // let shaders and textures settle before judging the frame rate
  if(!TEST){last=performance.now();requestAnimationFrame(loop);setTimeout(()=>toast('Welcome to the Mytharium. Tap a creature to pet it.'),1200);}
  else{for(let i=0;i<4;i++)tick(1/30);}
  window.MY.ready=true;}
window.addEventListener('beforeunload',()=>saveState());
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveState();});
// ---------- test API (headless runs use ?test&seed=N) ----------
window.MY={ready:false,
  state:()=>({q:QK,day:+DAY.toFixed(3),humid:+TERR.humid.toFixed(1),items:items.length,crits:crits.map(c=>({id:c.id,sp:c.sp,name:c.name,state:c.state,pos:c.pos.map(v=>+v.toFixed(1)),hunger:+c.hunger.toFixed(2),happy:+c.happy.toFixed(2)})),
    journal:Object.keys(JOURNAL.entries),stats:{draws:STATS.draws,tris:Math.round(STATS.tris),splats:STATS.splats},rt:[RT.w,RT.h,RT.samples],errs:ERRS.slice(0,5),pearls:TERR.pearls,foods:foods.length,parts:parts.length}),
  step:(sec,dt=1/30)=>{const n=Math.round(sec/dt);for(let i=0;i<n;i++)tick(dt);return SIMT;},
  frame:()=>{poseAll(0);updateCamera(0);render();return STATS;},
  cam:o=>{Object.assign(CAM.t,o);if(o.target)CAM.t.target=o.target.slice();clampCam();updateCamera(1);return CAM.pos;},
  view:v=>{setView(v);updateCamera(1);},
  add:(k,x,z,o)=>{const it=addItem(k,x,z,o||{});return it&&it.id;},items:()=>items.map(it=>({id:it.id,kind:it.kind,x:+it.x.toFixed(1),z:+it.z.toFixed(1),y:+it.y.toFixed(1),wilt:+(it.wilt||0).toFixed(2)})),
  crit:(sp,o)=>{const c=addCrit(sp,o||{});return c&&c.id;},get:id=>crits.find(c=>c.id===id),
  setState:(id,s,dur,extra)=>{const c=crits.find(c=>c.id===id);if(c){setState(c,s,dur||5,extra);c.at=null;}return !!c;},
  feed:(type,x,z)=>{const g=[x,topH(x,z)+4,z];return !!dropFood(type,g);},
  mist:(x,z,sec=1)=>{TERR.spray=sec;TERR.sprayP=[x,topH(x,z),z];TERR.humid=Math.min(100,TERR.humid+sec*9);TERR.rainbowP=[clamp(x,-35,35),20,clamp(z+4,-10,22)];},
  time:t=>{SETTINGS.time=t;updateLight(10);updateLight(10);return DAY;},day:d=>{SETTINGS.time='cycle';DAY=d;updateLight(1);},
  set:(k,v)=>{if(k==='q'){QK=v;setupShadow();resize();setupRT(canvas.width,canvas.height);}else SETTINGS[k]=v;},
  tap:()=>glassTap(innerWidth/2,innerHeight/2),select:id=>{const t=crits.find(c=>c.id===id)||items.find(i=>i.id===id);selectThing(t||null);},
  wipe:(u,v,r=.05)=>wipeAt(u,v,r),humid:h=>{TERR.humid=h;},sculpt:(kind,x,z,n=10,R=6)=>{TOOL.sculpt=kind;TOOL.brush=R;for(let i=0;i<n;i++)brush([x,0,z],.05);brushCommit(true);},
  photo:on=>{if(!!on!==PHOTO.on)togglePhoto();},journal:()=>{toggleJournal();return Object.keys(JOURNAL.entries);},sheet:k=>openSheet(k),
  event:(id,key)=>{const c=crits.find(c=>c.id===id);event(c,key);},visitor:()=>{VISIT.t=0;visitors(1);return !!VISIT.active;},
  studio:(sp,pose,o)=>{if(sp===null){studioExit();return true;}const c=crits.find(c=>c.sp===sp&&(!o||o.morph===undefined||c.morph===o.morph))||addCrit(sp,o||{});if(o&&o.morph!==undefined)c.morph=o.morph;studioEnter(c,pose);if(TEST){for(let i=0;i<20;i++){poseAll(1/30);studioUpdate(1/30);}}return c.id;},
  fr:()=>({scale:+FR.scale.toFixed(2),avg:+FR.avg.toFixed(1),capped:FR.capped,w:canvas.width,h:canvas.height,culled:[CULLED.items,CULLED.chunks]}),
  prof:(n=3,cache)=>{PROF.on=true;PROF.cache=!!cache;PROF.t={};for(let i=0;i<n;i++)render();PROF.on=false;PROF.cache=false;const o={};let s=0;for(const k in PROF.t){o[k]=Math.round(PROF.t[k]/n);s+=o[k];}o.total=s;return o;},
  perf:(n=6)=>{const p=new Uint8Array(4);const t0=performance.now();for(let i=0;i<n;i++)tick(1/60);const t1=performance.now();for(let i=0;i<n;i++){render();gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);}const t2=performance.now();
    return{tick:+((t1-t0)/n).toFixed(2),frame:+((t2-t1)/n).toFixed(1),draws:STATS.draws,tris:Math.round(STATS.tris),splats:STATS.splats};},
  pix:(x,y)=>{const p=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p);},
  _eval:TEST?(s=>eval(s)):undefined};
setTimeout(init,TEST?0:40);
})();
</script>
</body>
</html>
