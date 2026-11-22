// ============================================================
//  RENDER
// ============================================================
const QUAL={low:{scale:.8,dpr:1,msaa:0,shadow:1024,vol:0,steps:0,bloom:1,ao:0,coralShadow:0},med:{scale:1,dpr:1.25,msaa:4,shadow:1536,vol:1,steps:14,bloom:1,ao:10,coralShadow:7.5},high:{scale:1,dpr:1.5,msaa:4,shadow:2048,vol:1,steps:22,bloom:1,ao:14},
  // MAX trades nothing away: full device pixel ratio, the most MSAA the GPU offers (up to 8), 4K shadows, more volumetric and AO samples
  max:{scale:1,dpr:3,msaa:8,shadow:4096,vol:1,steps:34,bloom:1,ao:20}};
let QK=Q.get('q')||(matchMedia('(pointer: coarse)').matches?'med':'high');if(!QUAL[QK])QK='high';
const SETTINGS={light:'reef',bg:'blue',air:1,sub:0,autoDay:false,follow:false,filter:true,dof:true,ao:true,spin:false};
// reef LED presets: col is the light colour reaching the tank; led = (white, royal blue, violet) channel levels drawn on the fixture
const LIGHTS={
  reef:{name:'Reef 20K',col:[.68,.81,1],I:2.6,amb:.28,fog:[.012,.06,.14],room:.018,lamp:5,expo:1.0,caus:1,night:0,led:[.85,1,.9]},
  day:{name:'Daylight 10K',col:[1,.98,.95],I:2.4,amb:.3,fog:[.02,.075,.11],room:.02,lamp:5,expo:1.0,caus:1,night:0,led:[1,.6,.4]},
  actinic:{name:'Actinic blue',col:[.22,.33,1],I:1.7,amb:.12,fog:[.004,.022,.1],room:.008,lamp:3,expo:1.45,caus:.8,night:0,led:[0,1,1]},
  moon:{name:'Moonlight',col:[.25,.38,1],I:.45,amb:.09,fog:[.004,.016,.05],room:.006,lamp:.7,expo:1.7,caus:.7,night:1,led:[0,.25,0]},
  off:{name:'Lights off',col:[.25,.32,.5],I:.07,amb:.035,fog:[.003,.006,.012],room:.012,lamp:0,expo:2.2,caus:.3,night:1,led:[0,0,0]},
};
const LIGHT={lcol:[3,3,3],amb:[.3,.3,.3],fog:[.05,.12,.14],fogD:.008,abs:[.0055,.0021,.0015],room:[.02,.02,.02],env:1,lamp:5,expo:1,caus:1,night:0,scat:.006,bgK:1,led:[1,1,1],lampC:[1,1,1]};
const LDIR=V.norm([.18,1,.12]);
// direction toward the light inside the water (refracted at the surface)
const LW=(()=>{const eta=1/1.333,I=V.mul(LDIR,-1),c=LDIR[1],k=1-eta*eta*(1-c*c);const T=V.add(V.mul(I,eta),[0,eta*c-Math.sqrt(k),0]);return V.norm(V.mul(T,-1));})();
const TMIN=[TK.x0,0,TK.z0],TMAX=[TK.x1,TK.wl,TK.z1];
let RING=[0,0,0,0];

// ---------- programs ----------
const UNIT={uShadow:0,uCaus:1,uSandH:2,uDepth:3,uScene:4,uA:5,uVol:6,uSrc:7,uC:8,uB1:9,uB2:10,uB3:11,uB4:12,uSim:13,uPrev:14,uAO:15,uShadowR:14};
const PR={};
function buildPrograms(){
  const mk=(n,vs,fs)=>{const P=mkProg(vs,fs,n);use(P);for(const k in P.u){const t=P.u[k].type;if(t===gl.SAMPLER_2D||t===gl.SAMPLER_2D_SHADOW){gl.uniform1i(P.u[k].loc,UNIT[k]??13);}}PR[n]=P;return P;};
  mk('std',VS_STD,FS_STD);mk('stdS',VS_STD,FS_DEPTH);mk('coral',VS_CORAL,FS_CORAL);mk('coralS',VS_CORAL,FS_DEPTH);
  mk('fish',VS_FISH,FS_FISH);mk('fishS',VS_FISH,FS_DEPTH);
  mk('crit',VS_CRIT,FS_CRIT);mk('critS',VS_CRIT,FS_DEPTH);mk('bill',VS_BILL,FS_BILL);mk('surf',VS_STD,FS_SURF);mk('glass',VS_STD,FS_GLASS);
  mk('caus',VS_FULL,FS_CAUS);mk('ao',VS_FULL,FS_AO);mk('dof',VS_FULL,FS_DOF);mk('aob',VS_FULL,FS_AOBLUR);if(SIM.ok){mk('ripple',VS_FULL,FS_RIPPLE);mk('cgrid',VS_CGRID,FS_CGRID);}mk('vol',VS_FULL,FS_VOL);mk('res',VS_FULL,FS_RES);mk('down',VS_FULL,FS_DOWN);mk('final',VS_FULL,FS_FINAL);}

// ---------- targets ----------
const RT={w:0,h:0};const emptyVAO=gl.createVertexArray();
function freeRT(){for(const k of['A','D','B','V','O','O2','L1','L2','L3','L4'])if(RT[k])gl.deleteTexture(RT[k]);for(const k of['fA','fA2','fB','fBD','fV','fO','fO2','fL1','fL2','fL3','fL4','fMS'])if(RT[k])gl.deleteFramebuffer(RT[k]);
  if(RT.rbC)gl.deleteRenderbuffer(RT.rbC);if(RT.rbD)gl.deleteRenderbuffer(RT.rbD);RT.rbC=RT.rbD=RT.fMS=null;}
function setupRT(w,h){freeRT();RT.w=w;RT.h=h;const q=QUAL[QK];
  RT.A=mkTex(w,h,HDR_IF,gl.RGBA,HDR_T);RT.B=mkTex(w,h,HDR_IF,gl.RGBA,HDR_T);
  RT.D=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,RT.D);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,w,h,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  for(const p of[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  RT.fA=mkFbo(RT.A,RT.D);RT.fA2=mkFbo(RT.A,null);RT.fB=mkFbo(RT.B,null);RT.fBD=mkFbo(RT.B,RT.D);
  let samples=0;if(q.msaa){try{const s=gl.getInternalformatParameter(gl.RENDERBUFFER,HDR_IF,gl.SAMPLES);samples=s&&s.length?Math.min(q.msaa,Math.max(...s)):0;}catch(e){samples=0;}}
  if(samples>1){RT.rbC=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,RT.rbC);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,samples,HDR_IF,w,h);
    RT.rbD=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,RT.rbD);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,samples,gl.DEPTH_COMPONENT24,w,h);
    RT.fMS=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fMS);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,RT.rbC);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,RT.rbD);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){LOG('MSAA fbo incomplete, disabling');gl.deleteFramebuffer(RT.fMS);RT.fMS=null;}gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
  RT.samples=RT.fMS?samples:0;
  RT.vw=Math.max(1,w>>1);RT.vh=Math.max(1,h>>1);RT.V=mkTex(RT.vw,RT.vh,HDR_IF,gl.RGBA,HDR_T);RT.fV=mkFbo(RT.V,null);
  if(EXT_CBF){RT.O=mkTex(RT.vw,RT.vh,gl.RGBA16F,gl.RGBA,gl.HALF_FLOAT,gl.LINEAR);RT.fO=mkFbo(RT.O,null);RT.O2=mkTex(RT.vw,RT.vh,gl.RGBA16F,gl.RGBA,gl.HALF_FLOAT,gl.LINEAR);RT.fO2=mkFbo(RT.O2,null);}
  let bw=w,bh=h;for(let i=1;i<=4;i++){bw=Math.max(1,bw>>1);bh=Math.max(1,bh>>1);RT['L'+i]=mkTex(bw,bh,HDR_IF,gl.RGBA,HDR_T);RT['fL'+i]=mkFbo(RT['L'+i],null);RT['w'+i]=bw;RT['h'+i]=bh;}}
const SH={size:0,tex:null,fbo:null,mat:M4.id(),vp:M4.id()};
function setupShadow(){const s=QUAL[QK].shadow;if(SH.size===s)return;if(SH.tex)gl.deleteTexture(SH.tex);if(SH.fbo)gl.deleteFramebuffer(SH.fbo);SH.size=s;
  SH.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,SH.tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,s,s,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
  SH.fbo=mkFbo(null,SH.tex);
  const c=[0,TK.wl/2,0],eye=V.madd(c,LDIR,140),view=M4.lookAt(eye,c,[0,0,-1]);let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
  for(const x of[TK.x0-1,TK.x1+1])for(const y of[-1,TK.wl+1])for(const z of[TK.z0-1,TK.z1+1]){const p=M4.xf(view,[x,y,z]);for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],p[k]);mx[k]=Math.max(mx[k],p[k]);}}
  const proj=M4.ortho(mn[0],mx[0],mn[1],mx[1],-mx[2]-5,-mn[2]+5);SH.vp=M4.mul(proj,view);SH.k=[mx[2]-mn[2]+10,Math.max(mx[0]-mn[0],mx[1]-mn[1])];
  if(!SH.raw){SH.raw=gl.createSampler();gl.samplerParameteri(SH.raw,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.samplerParameteri(SH.raw,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.samplerParameteri(SH.raw,gl.TEXTURE_COMPARE_MODE,gl.NONE);gl.samplerParameteri(SH.raw,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.samplerParameteri(SH.raw,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
  const bias=new Float32Array([.5,0,0,0,0,.5,0,0,0,0,.5,0,.5,.5,.5,1]);SH.mat=M4.mul(bias,SH.vp);}
// caustic map over the tank floor plan (+4 cm margin); values are intensity * 0.25
const CA={tex:null,fbo:null,w:512,h:256};const CMAP=[TK.x0-4,TK.z0-4,TK.x1-TK.x0+8,TK.z1-TK.z0+8];
function setupCaustics(){CA.tex=mkTex(CA.w,CA.h,SIM.ok?HDR_IF:gl.RGBA8,gl.RGBA,SIM.ok?HDR_T:gl.UNSIGNED_BYTE,gl.LINEAR_MIPMAP_LINEAR,gl.CLAMP_TO_EDGE);gl.generateMipmap(gl.TEXTURE_2D);CA.fbo=mkFbo(CA.tex,null);
  if(SIM.ok)setupSim();else{SIM.tex=[mkTex(1,1,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,gl.NEAREST,gl.CLAMP_TO_EDGE,new Uint8Array(4))];SIM.cur=0;}}
// ---------- ripple simulation (T5) ----------
const SIM={ok:!!EXT_CBF&&!Q.has('nofloat'),w:256,h:116,tex:[],fbo:[],cur:0,drops:[],acc:0,grid:null};const SIMR=[TK.x0,TK.z0,TK.x1-TK.x0,TK.z1-TK.z0];
const SIM_CELL=(TK.x1-TK.x0)/256;
function setupSim(){for(let i=0;i<2;i++){SIM.tex[i]=mkTex(SIM.w,SIM.h,gl.RGBA16F,gl.RGBA,gl.HALF_FLOAT,gl.LINEAR,gl.CLAMP_TO_EDGE);SIM.fbo[i]=mkFbo(SIM.tex[i],null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,SIM.fbo[i]);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.clearColor(0,0,0,1);
  const P=[],I=[],W=SIM.w,Hh=SIM.h;for(let j=0;j<Hh;j++)for(let i=0;i<W;i++)P.push(i/(W-1),j/(Hh-1),0);
  for(let j=0;j<Hh-1;j++)for(let i=0;i<W-1;i++){const k=j*W+i;I.push(k,k+1,k+W+1,k,k+W+1,k+W);}
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(P),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(ATTR.aPos);gl.vertexAttribPointer(ATTR.aPos,3,gl.FLOAT,false,0,0);const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(I),gl.STATIC_DRAW);
  gl.bindVertexArray(null);SIM.grid={vao,count:I.length};}
// queue a disturbance: world x,z, radius (cm), amplitude (cm)
function simDrop(x,z,rcm,amp){if(!SIM.ok)return;if(x<TK.x0||x>TK.x1||z<TK.z0||z>TK.z1)return;SIM.drops.push([(x-SIMR[0])/SIMR[2],(z-SIMR[1])/SIMR[3],Math.max(1.6,rcm/SIM_CELL),amp]);if(SIM.drops.length>96)SIM.drops.splice(0,SIM.drops.length-96);}
const DROPU=new Float32Array(64),ZERO64=new Float32Array(64);
function simStepGPU(n){if(!SIM.ok||n<=0)return;const P=PR.ripple;use(P);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.bindVertexArray(emptyVAO);bindUnit(13,null);
  U(P,'uTx',[1/SIM.w,1/SIM.h]);U(P,'uDamp',0.988);
  for(let s=0;s<n;s++){if(s===0){DROPU.fill(0);const k=Math.min(16,SIM.drops.length);for(let i=0;i<k;i++)DROPU.set(SIM.drops[i],i*4);SIM.drops.splice(0,k);U(P,'uDrops',DROPU);}else if(s===1)U(P,'uDrops',ZERO64);
    gl.bindFramebuffer(gl.FRAMEBUFFER,SIM.fbo[1-SIM.cur]);gl.viewport(0,0,SIM.w,SIM.h);bindUnit(14,SIM.tex[SIM.cur]);gl.drawArrays(gl.TRIANGLES,0,3);SIM.cur=1-SIM.cur;}
  bindUnit(14,null);}
function ambientDrops(dt){if(!SIM.ok)return;if(Math.random()<dt*20)simDrop(lerp(TK.x0,TK.x1,Math.random()),lerp(TK.z0,TK.z1,Math.random()),0.7+Math.random()*0.8,0.006+Math.random()*0.008);
  if(SETTINGS.air>0)for(const e of emitters()){if(e.it.on===false)continue;if(Math.random()<dt*18){const a=Math.random()*6.283,r=Math.random()*(2+e.spread);simDrop(e.p[0]+Math.cos(a)*r,e.p[2]+Math.sin(a)*r,0.9+Math.random()*0.7,0.012+Math.random()*0.012);}}}
function dumpTex(fbo,w,h,ch,scale,off){const px=new Float32Array(w*h*4);gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.readPixels(0,0,w,h,gl.RGBA,gl.FLOAT,px);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),id=x.createImageData(w,h);let mn=1e9,mx=-1e9,sum=0;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const k=(j*w+i)*4,o=((h-1-j)*w+i)*4;for(let q=0;q<3;q++){const v=px[k+(ch<0?q:ch)];id.data[o+q]=clamp((v*scale+off)*255,0,255);}id.data[o+3]=255;const v=px[k+(ch<0?1:ch)];mn=Math.min(mn,v);mx=Math.max(mx,v);sum+=v;}
  x.putImageData(id,0,0);console.log('[AQ] dump min',mn.toFixed(4),'max',mx.toFixed(4),'mean',(sum/(w*h)).toFixed(4));return c.toDataURL();}
function causticPass(){gl.bindFramebuffer(gl.FRAMEBUFFER,CA.fbo);gl.viewport(0,0,CA.w,CA.h);gl.disable(gl.DEPTH_TEST);
  if(!SIM.ok){use(PR.caus);U(PR.caus,'uTime',SIMT);U(PR.caus,'uScale',[CMAP[2]/22,CMAP[3]/22]);gl.bindVertexArray(emptyVAO);gl.drawArrays(gl.TRIANGLES,0,3);}
  else{gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.clearColor(0,0,0,1);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);const P=PR.cgrid;use(P);bindUnit(13,SIM.tex[SIM.cur]);
    U(P,'uSimR',SIMR);U(P,'uCMap',CMAP);U(P,'uLd',V.mul(LDIR,-1));U(P,'uDepth',CDEP);U(P,'uRuffle',ruffle());U(P,'uTime',SIMT);gl.bindVertexArray(SIM.grid.vao);
    const iors=[1.3318,1.334,1.3368];for(let c=0;c<3;c++){gl.colorMask(c===0,c===1,c===2,false);U(P,'uIor',iors[c]);gl.drawElements(gl.TRIANGLES,SIM.grid.count,gl.UNSIGNED_SHORT,0);}
    gl.colorMask(true,true,true,true);gl.disable(gl.BLEND);STATS.draws+=3;}
  gl.bindTexture(gl.TEXTURE_2D,CA.tex);gl.generateMipmap(gl.TEXTURE_2D);}
let LAST_DT=1/60;const CDEP=34;
function ruffle(){return 0.6+0.8*SETTINGS.air*(SETTINGS.filter?1:0.4);}
function bindUnit(u,tex){gl.activeTexture(gl.TEXTURE0+u);gl.bindTexture(gl.TEXTURE_2D,tex);}

// ---------- camera ----------
const CAM={target:[0,21,0],yaw:0,pitch:0.07,dist:135,fov:38*PI/180,pos:[0,0,0],view:M4.id(),proj:M4.id(),vp:M4.id(),inv:M4.id(),R:[1,0,0],Uv:[0,1,0],
  t:{target:[0,21,0],yaw:0,pitch:0.07,dist:135},vel:{yaw:0,pitch:0},view0:'front'};
const CLIM={yaw:1e9,pmin:-0.28,pmax:1.48,dmin:12,dmax:300,x:48,ymin:2,ymax:46,z:21};
const KEYS=new Set();
// yaw is unbounded (full orbit); presets turn the short way round
const wrapPI=a=>a-Math.round(a/TAU)*TAU;function nearYaw(y){return CAM.t.yaw+wrapPI(y-CAM.t.yaw);}
function clampCam(){const t=CAM.t;t.pitch=clamp(t.pitch,CLIM.pmin,CLIM.pmax);t.dist=clamp(t.dist,CLIM.dmin,CLIM.dmax);
  t.target=[clamp(t.target[0],-CLIM.x,CLIM.x),clamp(t.target[1],CLIM.ymin,CLIM.ymax),clamp(t.target[2],-CLIM.z,CLIM.z)];}
// whole tank in view (with the stand and lamp)
function fitDist(){const asp=RT.w/RT.h||1.6;const fx=2*Math.atan(Math.tan(CAM.fov/2)*asp);const half=asp<0.8?34:asp<1.2?46:57;return Math.max(asp<1.2?70:118,half/Math.tan(fx/2)+24,30/Math.tan(CAM.fov/2)+24);}
// tank glass edge to edge: width fit on wide screens, cover (crop the sides) on tall ones
function fillDist(){const asp=RT.w/RT.h||1.6;const tx=Math.tan(CAM.fov/2)*asp,ty=Math.tan(CAM.fov/2);const dw=(TK.gx+0.3)/tx,dh=(TK.top/2+0.6)/ty;return (asp>=1.15?dw:Math.min(dw,dh*1.08))+TK.gz;}
function setView(name){const t=CAM.t;CAM.vel.yaw=CAM.vel.pitch=0;if(name!=='follow'){SETTINGS.follow=false;const fb=$('bFollow');if(fb)fb.classList.remove('on');}
  if(name!=='spin')SETTINGS.spin=false;
  if(name==='front')Object.assign(t,{target:[0,21,0],yaw:nearYaw(0),pitch:0.07,dist:fitDist()});
  else if(name==='fill')Object.assign(t,{target:[0,22.3,0],yaw:nearYaw(0),pitch:0,dist:fillDist()});
  else if(name==='back')Object.assign(t,{target:[0,21,0],yaw:nearYaw(Math.PI),pitch:0.07,dist:fitDist()});
  else if(name==='spin'){SETTINGS.spin=!SETTINGS.spin;if(SETTINGS.spin){t.target=[0,21,0];t.pitch=clamp(t.pitch,0.04,0.35);t.dist=Math.max(t.dist,Math.min(fitDist(),150));}}
  else if(name==='close'){const h=followTarget()||[0,14,6];Object.assign(t,{target:[h[0],h[1]+1,h[2]],yaw:nearYaw(clamp(Math.atan2(h[0]*0.02,1),-0.4,0.4)+(Math.cos(CAM.yaw)<0?Math.PI:0)),pitch:0.22,dist:34});}
  else if(name==='left')Object.assign(t,{target:[-6,20,0],yaw:nearYaw(-1.22),pitch:0.1,dist:Math.max(80,fitDist()*0.7)});
  else if(name==='right')Object.assign(t,{target:[6,20,0],yaw:nearYaw(1.22),pitch:0.1,dist:Math.max(80,fitDist()*0.7)});
  else if(name==='top')Object.assign(t,{target:[0,8,0],yaw:nearYaw(Math.cos(CAM.yaw)<0?Math.PI:0),pitch:1.42,dist:Math.max(120,fitDist()*1.05)});
  else if(name==='follow'){SETTINGS.follow=true;t.dist=Math.min(t.dist,62);t.pitch=clamp(t.pitch,0.05,0.6);}
  CAM.view0=name==='spin'?(SETTINGS.spin?'spin':CAM.view0):name;clampCam();if(typeof markView==='function')markView(CAM.view0);}
function zoomBy(f,toward){const t=CAM.t,nd=clamp(t.dist*f,CLIM.dmin,CLIM.dmax),k=1-nd/t.dist;if(toward)t.target=V.lerp(t.target,toward,clamp(k*0.9,-0.6,0.9));t.dist=nd;clampCam();}
function panCam(dx,dy){const s=CAM.dist*0.0016,t=CAM.t,r=[Math.cos(CAM.yaw),0,-Math.sin(CAM.yaw)],f=[-Math.sin(CAM.yaw),0,-Math.cos(CAM.yaw)];
  const cp=Math.cos(CAM.pitch),sp=Math.sin(Math.max(0,CAM.pitch));t.target=[t.target[0]-r[0]*dx*s+f[0]*dy*s*sp,t.target[1]+dy*s*cp,t.target[2]-r[2]*dx*s+f[2]*dy*s*sp];clampCam();}
function updateCamera(dt){const t=CAM.t;
  // keyboard
  if(KEYS.size){const sp=dt*CAM.dist*0.65,r=[Math.cos(CAM.yaw),0,-Math.sin(CAM.yaw)];
    if(KEYS.has('a')||KEYS.has('arrowleft'))t.target=V.madd(t.target,r,-sp);if(KEYS.has('d')||KEYS.has('arrowright'))t.target=V.madd(t.target,r,sp);
    if(KEYS.has('w')||KEYS.has('arrowup'))t.dist*=Math.exp(-dt*1.3);if(KEYS.has('s')||KEYS.has('arrowdown'))t.dist*=Math.exp(dt*1.3);
    if(KEYS.has('q'))t.yaw+=dt*1.1;if(KEYS.has('e'))t.yaw-=dt*1.1;if(KEYS.has('r'))t.target[1]+=sp*0.6;if(KEYS.has('c'))t.target[1]-=sp*0.6;
    if(KEYS.has('pageup'))t.pitch+=dt*0.8;if(KEYS.has('pagedown'))t.pitch-=dt*0.8;clampCam();}
  // inertia after a flick
  if(!drag&&(Math.abs(CAM.vel.yaw)>1e-4||Math.abs(CAM.vel.pitch)>1e-4)){t.yaw+=CAM.vel.yaw*dt;t.pitch+=CAM.vel.pitch*dt;const d=Math.exp(-dt*5);CAM.vel.yaw*=d;CAM.vel.pitch*=d;
    if(t.pitch<=CLIM.pmin||t.pitch>=CLIM.pmax)CAM.vel.pitch=0;clampCam();}
  if(SETTINGS.spin&&!drag)t.yaw+=dt*0.13;
  if(SETTINGS.follow){const fp=followTarget();if(fp)t.target=V.lerp(t.target,[fp[0],clamp(fp[1]+1,4,38),fp[2]*0.7],clamp(dt*1.5,0,1));}
  const k=clamp(dt*8,0,1);
  CAM.target=V.lerp(CAM.target,t.target,k);CAM.yaw=lerp(CAM.yaw,t.yaw,k);CAM.pitch=lerp(CAM.pitch,t.pitch,k);CAM.dist=Math.exp(lerp(Math.log(CAM.dist),Math.log(t.dist),k));
  const cp=Math.cos(CAM.pitch);CAM.pos=V.madd(CAM.target,[Math.sin(CAM.yaw)*cp,Math.sin(CAM.pitch),Math.cos(CAM.yaw)*cp],CAM.dist);
  const up=Math.abs(CAM.pitch)>1.45?[-Math.sin(CAM.yaw),0,-Math.cos(CAM.yaw)]:[0,1,0];
  CAM.view=M4.lookAt(CAM.pos,CAM.target,up);CAM.proj=M4.persp(CAM.fov,RT.w/RT.h,CAM.dist<30?1:2,1500);CAM.vp=M4.mul(CAM.proj,CAM.view);CAM.inv=M4.inv(CAM.vp);
  CAM.R=[CAM.view[0],CAM.view[4],CAM.view[8]];CAM.Uv=[CAM.view[1],CAM.view[5],CAM.view[9]];}
function screenRay(px,py){const r=canvas.getBoundingClientRect();const x=(px-r.left)/r.width*2-1,y=1-(py-r.top)/r.height*2;
  const a=M4.xf4(CAM.inv,[x,y,-1]),b=M4.xf4(CAM.inv,[x,y,1]);return{o:a,d:V.norm(V.sub(b,a))};}

// ---------- light state ----------
let lightBlend=null;
function updateLight(dt){let key=SETTINGS.light;
  // follow my clock: actinic dawn, full reef day, actinic dusk, moonlight at night (the way reef controllers ramp)
  if(SETTINGS.autoDay){const h=new Date().getHours()+new Date().getMinutes()/60;key=(h>=10&&h<20)?'reef':(h>=8.5&&h<10)||(h>=20&&h<21.5)?'actinic':'moon';}
  const L=LIGHTS[key]||LIGHTS.reef;const k=lightBlend===null?1:clamp(dt*1.8,0,1);lightBlend=1;
  const wq=TANK.water/100,haze=1-wq;
  const tgt={lcol:V.mul(L.col,L.I),amb:V.mul(V.lerp([.7,.84,.9],L.col,.5),L.amb*L.I/3*2.5),fog:V.mul(V.lerp(L.fog,V.mul([.07,.11,.06],L.I/3),haze*.6),1+haze*1.2),fogD:.0022+haze*.018,
    room:[L.room,L.room*.95,L.room*.9],lamp:L.lamp,expo:L.expo,caus:L.caus*(1-clamp(haze,0,1)*0.55),night:L.night,scat:.0011*(1+haze*5),bgK:L.I/3,led:L.led,lampC:V.lerp([1,1,1],L.col,.7)};
  for(const p of['lcol','amb','fog','room','led','lampC'])LIGHT[p]=V.lerp(LIGHT[p],tgt[p],k);
  for(const p of['fogD','lamp','expo','caus','night','scat','bgK'])LIGHT[p]=lerp(LIGHT[p],tgt[p],k);
  LIGHT.abs=[.0055+haze*.008,.0021+haze*.004,.0015+haze*.009];}

// ---------- common uniforms ----------
function common(P,vp){use(P);U(P,'uTime',SIMT);U(P,'uCam',CAM.pos);U(P,'uVP',vp);U(P,'uLdir',LDIR);U(P,'uLcol',LIGHT.lcol);U(P,'uAmb',LIGHT.amb);U(P,'uWL',TK.wl);
  U(P,'uTmin',TMIN);U(P,'uTmax',TMAX);U(P,'uAbs',LIGHT.abs);U(P,'uFogC',LIGHT.fog);U(P,'uFogD',LIGHT.fogD);U(P,'uSM',SH.mat);U(P,'uSMk',SH.k||[100,120]);U(P,'uPCSS',QK==='low'?0:QK==='med'?1:2);U(P,'uCausScale',1/22);U(P,'uCausAmt',LIGHT.caus);
  U(P,'uShadowOn',1);U(P,'uRuffle',ruffle());U(P,'uCDep',CDEP);U(P,'uCMap',CMAP);U(P,'uLw',LW);U(P,'uSimR',SIMR);U(P,'uRoomAmb',LIGHT.room);U(P,'uTankGlow',.045);U(P,'uEnvK',1);U(P,'uRing',RING);U(P,'uSel',0);U(P,'uLampE',LIGHT.lamp);U(P,'uBgK',LIGHT.bgK);U(P,'uLampC',LIGHT.lampC);U(P,'uHealth',coralHealth());U(P,'uLed',LIGHT.led);}
const ID4=M4.id(),ID3=new Float32Array([1,0,0,0,1,0,0,0,1]);
const MESH={};
function buildStaticMeshes(){const t=genTank();for(const k in t)MESH[k]=t[k].mesh();buildSandMesh();
  MESH.fish={};for(const k in FISHP){MESH.fish[k]=addInstancing(genFish(k).mesh(),40);}
  MESH.shrimp={lys:addInstancing(genShrimp({antL:1.75}).mesh(),40),sten:addInstancing(genShrimp({antL:1.9,boxer:true}).mesh(),16)};
  MESH.crawl={};for(let i=0;i<4;i++)MESH.crawl['snail'+i]=addInstancing(genSnail(i).mesh(),24);for(let i=0;i<4;i++)MESH.crawl['star'+i]=addInstancing(genStar(i).mesh(),8);for(let i=0;i<2;i++)MESH.crawl['urchin'+i]=addInstancing(genUrchin(i).mesh(),8);
  MESH.crab=[addInstancing(genCrab(0).mesh(),30),addInstancing(genCrab(1).mesh(),10)];
  MESH.jelly=[addInstancing(genJelly(0).mesh(),8),addInstancing(genJelly(1).mesh(),8)];MESH.mantis=addInstancing(genMantis().mesh(),4);
  MESH.food={};for(const k of[2,3,4,5])MESH.food[k]=addInstancing(genFood(k).mesh(),160);
  MESH.bill=addInstancing(genQuad().mesh(),2200);}
let SELECTED=null;
function drawStd(P,mesh,M,Nm,mat,v,tint,rough,os,seed,sel){U(P,'uModel',M);U(P,'uNmat',Nm);U(P,'uOS',os);U(P,'uMat',mat);U(P,'uVar',v);U(P,'uTint',tint);U(P,'uRough',rough);U(P,'uSeed',seed);U(P,'uSel',sel?1:0);drawMesh(mesh);}
function coralUniforms(PP,it,c,shadow){const m=morphOf(it);U(PP,'uModel',it.M);U(PP,'uNmat',it.Nm);U(PP,'uSway',c.noSway?0:1);U(PP,'uPhase',(it.seed%100)*0.37);U(PP,'uMorph',it.retract||0);
  if(!shadow&&m){U(PP,'uC1',m.c1);U(PP,'uC2',m.c2);U(PP,'uC3',m.c3);U(PP,'uFl',m.fl);U(PP,'uKind',m.k||0);}U(PP,'uSel',!shadow&&SELECTED===it?1:0);}
function drawItems(P,PP,shadow){for(const it of items){const c=CAT[it.kind],g=it.geo,sel=!shadow&&SELECTED===it;
  if(c.prog==='coral')continue;
  use(P);
  if(c.prog==='multi'){for(const p of g.parts)drawStd(P,p.mesh,it.M,it.Nm,p.mat,p.v,p.tint,p.rough,it.scale,it.seed%97,sel);}
  else drawStd(P,g.mesh,it.M,it.Nm,c.mat,c.v,[1,1,1],.5,it.scale,it.seed%97,sel);}
  use(PP);U(PP,'uCur',FLOW.A>0?V.mul(FLOW.dir,FLOW.A):[0,0,0]);U(PP,'uFlowW',FLOW.w);U(PP,'uAxP',AXP);
  // cheaper tiers leave small corals out of the shadow map (Low: all corals); High and MAX keep every shadow
  const cs=QUAL[QK].coralShadow;
  for(const it of items){const c=CAT[it.kind];if(c.prog!=='coral')continue;if(shadow&&cs!==undefined&&(cs===0||(it.wr||0)<cs))continue;coralUniforms(PP,it,c,shadow);drawMesh(it.geo.mesh);}}
const AXP=new Float32Array(32);
function crawlBasis(s){let up,fw;if(s.surf==='floor'){up=topNormal(s.p[0],s.p[2]);fw=[Math.cos(s.h),0,Math.sin(s.h)];fw=V.norm(V.sub(fw,V.mul(up,V.dot(fw,up))));}
  else{const P=PANES[s.surf];up=P.n;fw=P.ax===0?[Math.cos(s.h),Math.sin(s.h),0]:[0,Math.sin(s.h),Math.cos(s.h)];}return{up,fw};}
function fillInstances(){
  // anemone tentacles part round clownfish nestled in them
  AXP.fill(0);let na=0;for(const f of fish){if(na>=8)break;if(!f.home)continue;if(V.dist(f.p,f.home.wc)<f.home.wr*1.1){AXP.set(f.p,na*4);AXP[na*4+3]=f.size*0.45+0.8;na++;}}
  for(const k in MESH.fish)MESH.fish[k].n=0;
  for(const f of fish){if(f.hidden)continue;const m=MESH.fish[f.sp];if(m.n>=m.maxN)continue;const cp=Math.cos(f.pitch);const fw=[cp*Math.cos(f.yaw),Math.sin(f.pitch),cp*Math.sin(f.yaw)];
    let sd=V.norm(V.cross(fw,[0,1,0]));let up=V.cross(sd,fw);const cr=Math.cos(f.roll),sr=Math.sin(f.roll);const up2=V.add(V.mul(up,cr),V.mul(sd,sr)),sd2=V.sub(V.mul(sd,cr),V.mul(up,sr));
    setInst(m,m.n++,M4.basis(f.p,fw,up2,sd2,f.size),[f.ph,f.amp,f.bend,f.pec],[f.var,f.puff||0,f.stress||0,f.fin||0]);}
  for(const k in MESH.shrimp)MESH.shrimp[k].n=0;
  for(const s of shrimp){if(s.hidden)continue;const S=SHRIMPSP[s.sp],sm=MESH.shrimp[S.mesh];if(sm.n>=sm.maxN)continue;const up=s.state==='swim'?[0,1,0]:topNormal(s.p[0],s.p[2]);let fw=[Math.cos(s.yaw),0,Math.sin(s.yaw)];fw=V.norm(V.sub(fw,V.mul(up,V.dot(fw,up))));const sd=V.cross(fw,up);
    const code=(s.state==='walk'?1:0)+(s.state==='swim'?2:0);
    setInst(sm,sm.n++,M4.basis(V.madd(s.p,up,0.05),fw,up,sd,s.size),[s.walk,s.swim,s.curl,s.var*9+code*20],[1,1,1,S.pat+s.var*0.9]);}
  for(const m of MESH.crab)m.n=0;
  for(const c of crabs){const S=CRABSP[c.sp],m=MESH.crab[S.type];if(m.n>=m.maxN)continue;const up=topNormal(c.p[0],c.p[2]);let fw=[Math.cos(c.yaw),0,Math.sin(c.yaw)];fw=V.norm(V.sub(fw,V.mul(up,V.dot(fw,up))));
    setInst(m,m.n++,M4.basis(c.p,fw,up,V.cross(fw,up),c.size),[c.walk,c.claw>0?Math.sin(c.claw*20)*0.5+0.5:0,0,0],[1,1,1,S.pat+c.var*0.9]);}
  for(const k in MESH.crawl)MESH.crawl[k].n=0;
  for(const s of crawlers){const S=CRAWLSP[s.sp],m=MESH.crawl[S.mesh];if(m.n>=m.maxN)continue;const{up,fw}=crawlBasis(s);const sink=(s.bury||0)*(S.burrow?s.size*0.75:s.size*0.06);
    setInst(m,m.n++,M4.basis(V.madd(s.p,up,-sink),fw,up,V.cross(fw,up),s.size),[s.var*9,s.tuck||0,s.walk||0,0],[1,1,1,S.pat+s.var*0.9]);}
  for(const m of MESH.jelly)m.n=0;
  for(const j of jellies){const J=JELLYSP[j.sp],m=MESH.jelly[J.type];if(m.n>=m.maxN)continue;const up=j.ax;const fw=V.norm(V.cross(V.perp(up),up));
    setInst(m,m.n++,M4.basis(j.p,fw,up,V.cross(fw,up),j.size),[j.ph,0,0,0],[1,1,1,j.var*0.9]);}
  {const m=MESH.mantis;m.n=0;for(const q of mantis){if(m.n>=m.maxN)break;const fw0=[Math.cos(q.yaw),0,Math.sin(q.yaw)];const pitch=(1-q.out)*0.9;const up0=topNormal(q.p[0],q.p[2]);
    const fw=V.norm(V.add(V.mul(fw0,Math.cos(pitch)),V.mul(up0,Math.sin(pitch)))),sd=V.norm(V.cross(fw,up0)),up=V.cross(sd,fw);const sink=(1-q.out)*q.size*0.42;
    setInst(m,m.n++,M4.basis(V.add(q.p,[0,-sink,0]),fw,up,sd,q.size),[q.walk,0,q.strike,0],[1,1,1,q.var*0.9]);}}
  for(const k in MESH.food)MESH.food[k].n=0;
  for(const f of foods){const F=FOODS[f.type],m=MESH.food[F.kind];if(!m||m.n>=m.maxN)continue;
    setInst(m,m.n++,M4.trs(f.p,f.yaw,f.size||1,f.type==='mysis'||f.type==='pellet'?0:f.state==='rest'?0:f.pitch*0.3,f.type==='nori'&&f.state!=='rest'?f.pitch*0.5:0),[f.ph,f.state==='rest'?0.3:1,0,0],[f.col[0],f.col[1],f.col[2],0]);}
  // goby burrows: a dark hole in the sand (drawn with the wafer disc, flagged in iB.w)
  {const m=MESH.food[5];for(const f of fish){if(!f.burrow||m.n>=m.maxN)continue;const b=f.burrow;setInst(m,m.n++,M4.trs([b[0],sandH(b[0],b[2])-0.07,b[2]],f.var*TAU,0.62,0,0),[0,0,0,0],[0,0,0,1]);}}
  const b=MESH.bill;b.n=0;const d=b.idata;
  const pc=QK==='low'?140:Math.round(NPART*0.6);for(let i=0;i<pc;i++){const o=b.n*24;d[o]=parts[i*4];d[o+1]=parts[i*4+1];d[o+2]=parts[i*4+2];d[o+3]=0.035+parts[i*4+3]*0.05;d[o+4]=0;d[o+5]=0.5+parts[i*4+3]*0.5;d[o+6]=parts[i*4+3];b.n++;}
  for(const q of plankton){if(b.n>=b.maxN)break;const o=b.n*24;d[o]=q.p[0];d[o+1]=q.p[1];d[o+2]=q.p[2];d[o+3]=0.05+q.s*0.04;d[o+4]=3;d[o+5]=Math.min(1,q.life/6);d[o+6]=q.s;b.n++;}
  for(const bb of bubbles){if(b.n>=b.maxN)break;const o=b.n*24;d[o]=bb.p[0];d[o+1]=bb.p[1];d[o+2]=bb.p[2];d[o+3]=bb.r;d[o+4]=1;d[o+5]=1;d[o+6]=bb.ph;b.n++;}
  for(const q of dust){if(b.n>=b.maxN)break;const o=b.n*24,f=q.age/q.max;d[o]=q.p[0];d[o+1]=q.p[1];d[o+2]=q.p[2];d[o+3]=q.s*(1+q.age*1.4);d[o+4]=2;d[o+5]=Math.min(1,q.age*6)*(1-f)*(1-f)*2.2;d[o+6]=q.seed;b.n++;}}

// critters by kind; the see-through ones (shrimp, moon jellies) are drawn here only when there is no see-through pass (or for shadows)
function drawCritters(P,shadow,solidSee){
  if(shadow||solidSee){U(P,'uKind',0);for(const k in MESH.shrimp)drawInst(MESH.shrimp[k]);U(P,'uKind',9);drawInst(MESH.jelly[0]);}
  U(P,'uKind',1);for(let i=0;i<4;i++)drawInst(MESH.crawl['snail'+i]);
  U(P,'uKind',7);for(let i=0;i<4;i++)drawInst(MESH.crawl['star'+i]);
  U(P,'uKind',8);for(let i=0;i<2;i++)drawInst(MESH.crawl['urchin'+i]);
  U(P,'uKind',6);for(const m of MESH.crab)drawInst(m);
  U(P,'uKind',10);drawInst(MESH.jelly[1]);U(P,'uKind',11);drawInst(MESH.mantis);
  if(!shadow)for(const k of[2,3,4,5]){U(P,'uKind',k);drawInst(MESH.food[k]);}}
// ---------- frame ----------
let frameNo=0;
function render(){STATS.draws=0;STATS.tris=0;frameNo++;const q=QUAL[QK];updateDOF(LAST_DT);
  gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
  // live water surface, then caustics refracted through it
  if(SIM.ok){ambientDrops(LAST_DT);SIM.acc+=LAST_DT;let n=TEST?2:Math.min(4,Math.floor(SIM.acc*120));SIM.acc-=n/120;if(SIM.acc>0.1)SIM.acc=0;simStepGPU(n);}
  bindUnit(1,null);if(QK!=='low'||frameNo%2===0||!SIM.ok)causticPass();
  // shadow map
  bindUnit(0,null);gl.bindFramebuffer(gl.FRAMEBUFFER,SH.fbo);gl.viewport(0,0,SH.size,SH.size);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.clear(gl.DEPTH_BUFFER_BIT);
  common(PR.stdS,SH.vp);common(PR.coralS,SH.vp);drawItems(PR.stdS,PR.coralS,true);
  common(PR.fishS,SH.vp);for(const k in MESH.fish){U(PR.fishS,'uSp',FISHSP[k].sp);drawInst(MESH.fish[k]);}
  common(PR.critS,SH.vp);drawCritters(PR.critS,true);
  bindUnit(0,SH.tex);bindUnit(1,CA.tex);bindUnit(2,sandTex);bindUnit(3,null);bindUnit(13,SIM.tex[SIM.cur]);bindUnit(14,SH.tex);gl.bindSampler(14,SH.raw);
  // main opaque
  gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fMS||RT.fA);gl.viewport(0,0,RT.w,RT.h);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const vp=CAM.vp,P=PR.std;common(P,vp);
  drawStd(P,MESH.room,ID4,ID3,8,0,[1,1,1],.9,1,0,false);if(CAM.pos[2]>-47)drawStd(P,MESH.wall,ID4,ID3,8,0,[1,1,1],.9,1,0,false);
  drawStd(P,MESH.stand,ID4,ID3,9,3,[1,1,1],.5,1,3,false);drawStd(P,MESH.mat,ID4,ID3,11,0,[1,1,1],.8,1,0,false);
  if(!(CAM.pos[1]>TK.wl+18&&CAM.pitch>0.95))drawStd(P,MESH.fixture,ID4,ID3,10,0,[1,1,1],.4,1,0,false);
  if(CAM.pos[2]>-TK.gz-0.1)drawStd(P,MESH.bg,ID4,ID3,7,{black:0,blue:1,frosted:2}[SETTINGS.bg]??2,[1,1,1],.9,1,0,false);
  drawStd(P,MESH.sil,ID4,ID3,11,0,[1,1,1],.3,1,0,false);
  drawStd(P,sandMesh,ID4,ID3,1,SETTINGS.sub,[1,1,1],.9,1,0,false);
  common(PR.coral,vp);drawItems(P,PR.coral,false);
  const seeOn=QK!=='low';
  common(PR.fish,vp);U(PR.fish,'uFinPass',0);for(const k in MESH.fish){U(PR.fish,'uSp',FISHSP[k].sp);drawInst(MESH.fish[k]);}
  common(PR.crit,vp);U(PR.crit,'uSee',0);drawCritters(PR.crit,false,!seeOn);
  // see-through shrimp and moon jellies: copy the opaque scene drawn so far, then draw them (still multisampled) blending with that copy
  if(seeOn){const tgt=RT.fMS||RT.fA,src=RT.fMS?RT.A:RT.B;gl.bindFramebuffer(gl.READ_FRAMEBUFFER,tgt);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,RT.fMS?RT.fA2:RT.fB);
    gl.blitFramebuffer(0,0,RT.w,RT.h,0,0,RT.w,RT.h,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);
    gl.bindFramebuffer(gl.FRAMEBUFFER,tgt);gl.viewport(0,0,RT.w,RT.h);bindUnit(4,src);common(PR.crit,vp);U(PR.crit,'uSee',1);U(PR.crit,'uRes',[RT.w,RT.h]);
    U(PR.crit,'uKind',0);for(const k in MESH.shrimp)drawInst(MESH.shrimp[k]);U(PR.crit,'uKind',9);drawInst(MESH.jelly[0]);U(PR.crit,'uSee',0);bindUnit(4,null);}
  if(RT.fMS){gl.bindFramebuffer(gl.READ_FRAMEBUFFER,RT.fMS);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,RT.fA);gl.blitFramebuffer(0,0,RT.w,RT.h,0,0,RT.w,RT.h,gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT,gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);}
  gl.disable(gl.DEPTH_TEST);gl.bindVertexArray(emptyVAO);
  // ambient occlusion (half res, bilateral blur)
  const aoOn=q.ao>0&&!!RT.O&&SETTINGS.ao!==false;
  if(aoOn){gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fO);gl.viewport(0,0,RT.vw,RT.vh);bindUnit(3,RT.D);const Pa=PR.ao;use(Pa);U(Pa,'uInvVP',CAM.inv);U(Pa,'uVP',vp);U(Pa,'uCam',CAM.pos);U(Pa,'uRad',2.2);U(Pa,'uN',q.ao);gl.bindVertexArray(emptyVAO);gl.drawArrays(gl.TRIANGLES,0,3);
    gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fO2);use(PR.aob);bindUnit(7,RT.O);gl.drawArrays(gl.TRIANGLES,0,3);bindUnit(7,null);}
  // volumetric shafts
  const volOn=q.vol&&LIGHT.lcol[1]>0.2;
  if(volOn){gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fV);gl.viewport(0,0,RT.vw,RT.vh);bindUnit(3,RT.D);const Pv=PR.vol;common(Pv,vp);U(Pv,'uInvVP',CAM.inv);U(Pv,'uSteps',q.steps);U(Pv,'uScat',LIGHT.scat);U(Pv,'uFrame',TEST?0:frameNo%64);gl.bindVertexArray(emptyVAO);gl.drawArrays(gl.TRIANGLES,0,3);}
  // resolve into B
  gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fB);gl.viewport(0,0,RT.w,RT.h);bindUnit(3,RT.D);bindUnit(5,RT.A);bindUnit(6,RT.V);
  const Pr=PR.res;use(Pr);U(Pr,'uInvVP',CAM.inv);U(Pr,'uCam',CAM.pos);U(Pr,'uVolRes',[RT.vw,RT.vh]);U(Pr,'uVolOn',volOn?1:0);bindUnit(15,aoOn?RT.O2:null);U(Pr,'uAOOn',aoOn?1:0);U(Pr,'uAOK',0.85);U(Pr,'uAOFog',LIGHT.fogD*0.5);gl.bindVertexArray(emptyVAO);gl.drawArrays(gl.TRIANGLES,0,3);
  // transparent surfaces refract the resolved scene (shafts included): copy B -> A first
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,RT.fB);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,RT.fA2);gl.blitFramebuffer(0,0,RT.w,RT.h,0,0,RT.w,RT.h,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);
  bindUnit(3,null);bindUnit(4,RT.A);gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fBD);gl.enable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  // fins write depth: otherwise depth of field reads the depth behind them and blurs the fins like the background
  gl.depthMask(true);common(PR.fish,vp);U(PR.fish,'uFinPass',1);for(const k in MESH.fish){U(PR.fish,'uSp',FISHSP[k].sp);drawInst(MESH.fish[k]);}gl.depthMask(false);
  const Pb=PR.bill;common(Pb,vp);U(Pb,'uCamR',CAM.R);U(Pb,'uCamU',CAM.Uv);drawInst(MESH.bill);
  gl.disable(gl.BLEND);gl.depthMask(true);
  const Ps=PR.surf;common(Ps,vp);U(Ps,'uModel',ID4);U(Ps,'uNmat',ID3);U(Ps,'uOS',1);U(Ps,'uRes',[RT.w,RT.h]);drawMesh(MESH.surf);
  gl.depthMask(false);gl.enable(gl.BLEND);
  const Pg=PR.glass;common(Pg,vp);U(Pg,'uModel',ID4);U(Pg,'uNmat',ID3);U(Pg,'uOS',1);U(Pg,'uRes',[RT.w,RT.h]);U(Pg,'uAlgae',clamp((70-TANK.water)/50,0,1));drawMesh(MESH.glass);
  gl.disable(gl.BLEND);gl.depthMask(true);gl.disable(gl.DEPTH_TEST);bindUnit(4,null);bindUnit(14,null);gl.bindSampler(14,null);
  // depth of field (focus pulls toward the orbit target)
  let scene=RT.B;const dofOn=QK!=='low'&&SETTINGS.dof!==false&&DOF.aper>0.002;
  if(dofOn){gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fA2);gl.viewport(0,0,RT.w,RT.h);const Po=PR.dof;use(Po);bindUnit(7,RT.B);bindUnit(3,RT.D);
    U(Po,'uInvVP',CAM.inv);U(Po,'uCam',CAM.pos);U(Po,'uFocus',DOF.focus);U(Po,'uAper',DOF.aper);U(Po,'uRes',[RT.w,RT.h]);gl.bindVertexArray(emptyVAO);gl.drawArrays(gl.TRIANGLES,0,3);bindUnit(7,null);bindUnit(3,null);scene=RT.A;}
  // bloom
  const Pd=PR.down;use(Pd);gl.bindVertexArray(emptyVAO);let src=scene,sw=RT.w,sh=RT.h;
  for(let i=1;i<=4;i++){gl.bindFramebuffer(gl.FRAMEBUFFER,RT['fL'+i]);gl.viewport(0,0,RT['w'+i],RT['h'+i]);bindUnit(7,src);U(Pd,'uSrc',7);U(Pd,'uTx',[0.5/sw,0.5/sh]);U(Pd,'uThr',i===1?1.15:0);gl.drawArrays(gl.TRIANGLES,0,3);src=RT['L'+i];sw=RT['w'+i];sh=RT['h'+i];}
  bindUnit(7,null);
  // final
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);const Pf=PR.final;use(Pf);
  bindUnit(8,scene);bindUnit(9,RT.L1);bindUnit(10,RT.L2);bindUnit(11,RT.L3);bindUnit(12,RT.L4);
  U(Pf,'uExpo',LIGHT.expo);U(Pf,'uBloom',0.22);U(Pf,'uTime',SIMT);U(Pf,'uRes',[canvas.width,canvas.height]);gl.drawArrays(gl.TRIANGLES,0,3);
  for(const u of[5,6,8,9,10,11,12,15])bindUnit(u,null);}
// focus distance eases toward the camera's orbit target; aperture opens for close views
const DOF={focus:60,aper:0};
function updateDOF(dt){const tgt=CAM.dist;DOF.focus=TEST?tgt:lerp(DOF.focus,tgt,clamp(dt*4,0,1));const a=clamp((70-CAM.dist)/55,0,1)*0.55+0.04;DOF.aper=TEST?a:lerp(DOF.aper,a,clamp(dt*3,0,1));}
function agitation(){const a=new Float32Array(16);let i=0;for(const e of emitters()){if(i>=4)break;a.set([e.p[0],e.p[2],SETTINGS.air*(e.rate>10?0.6:1),e.rate>10?2.5:3.5],i*4);i++;}return a;}

// ---------- thumbnails ----------
const TH={fbo:null,tex:null,rb:null,cache:{}};
function thumb(kind){if(TH.cache[kind])return TH.cache[kind];const S=128;
  if(!TH.fbo){TH.tex=mkTex(S,S,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE);TH.rb=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,TH.rb);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,S,S);
    TH.fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,TH.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,TH.tex,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,TH.rb);}
  const c=CAT[kind];const it={kind,seed:c.prog==='coral'?17:23,x:0,z:0,rot:0.5,scale:c.scale};const g=geoFor(it);
  const M=M4.trs([0,0,0],0.5,c.scale);const ctr=M4.xf(M,g.c),rad=Math.max(1,g.r*c.scale);
  const eye=V.add(ctr,V.mul(V.norm([0.35,0.45,1]),rad*2.6)),view=M4.lookAt(eye,ctr,[0,1,0]),vp=M4.mul(M4.persp(0.75,1,rad*0.3,rad*8),view);
  gl.bindFramebuffer(gl.FRAMEBUFFER,TH.fbo);gl.viewport(0,0,S,S);gl.clearColor(0.045,0.07,0.08,1);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const set=P=>{common(P,vp);U(P,'uCam',eye);U(P,'uWL',1000);U(P,'uTmin',[-500,-500,-500]);U(P,'uTmax',[500,500,500]);U(P,'uAbs',[0,0,0]);U(P,'uFogD',0);U(P,'uFogC',[0,0,0]);U(P,'uShadowOn',0);U(P,'uCausAmt',0);
    U(P,'uLcol',[1.15,1.1,1.05]);U(P,'uAmb',[.26,.29,.32]);U(P,'uLdir',V.norm([.4,1,.6]));U(P,'uTime',0);U(P,'uRing',[0,0,0,0]);};
  const Nm=M4.nmat(M);
  if(c.prog==='coral'){const P=PR.coral;set(P);const m=c.morphs[0];U(P,'uAxP',new Float32Array(32));U(P,'uModel',M);U(P,'uNmat',Nm);U(P,'uSway',0);U(P,'uPhase',0);U(P,'uMorph',0);U(P,'uSel',0);U(P,'uCur',[0,0,0]);U(P,'uC1',m.c1);U(P,'uC2',m.c2);U(P,'uC3',m.c3);U(P,'uFl',m.fl);U(P,'uKind',m.k||0);U(P,'uHealth',1);drawMesh(g.mesh);}
  else{const P=PR.std;set(P);if(c.prog==='multi')for(const p of g.parts)drawStd(P,p.mesh,M,Nm,p.mat,p.v,p.tint,p.rough,1,3,false);else drawStd(P,g.mesh,M,Nm,c.mat,c.v,[1,1,1],.5,c.scale,3,false);}
  const px=new Uint8Array(S*S*4);gl.readPixels(0,0,S,S,gl.RGBA,gl.UNSIGNED_BYTE,px);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.clearColor(0,0,0,1);
  const cv=document.createElement('canvas');cv.width=cv.height=S;const cx=cv.getContext('2d');const im=cx.createImageData(S,S);const lut=new Uint8Array(256);for(let i=0;i<256;i++)lut[i]=Math.round(Math.pow(i/255,1/2.2)*255);
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const si=((S-1-y)*S+x)*4,di=(y*S+x)*4;im.data[di]=lut[px[si]];im.data[di+1]=lut[px[si+1]];im.data[di+2]=lut[px[si+2]];im.data[di+3]=255;}
  cx.putImageData(im,0,0);const url=cv.toDataURL('image/png');TH.cache[kind]=url;return url;}
