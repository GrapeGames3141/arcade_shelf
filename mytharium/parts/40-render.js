
// ============================================================
//  RENDER
// ============================================================
// MAX trades nothing away: full device pixel ratio, the most MSAA the GPU offers, 4K shadows, full splat density.
// HIGH smooths: a little less splat density and a lighter pixel ratio. MEDIUM and LOW cut further.
const QUAL={low:{dpr:1,msaa:0,shadow:1024,ao:0,vol:0,steps:0,dens:.5,coat:.55,dof:0,pcss:0},
  med:{dpr:1.25,msaa:4,shadow:2048,ao:10,vol:1,steps:12,dens:.72,coat:.75,dof:1,pcss:1},
  high:{dpr:1.5,msaa:4,shadow:2048,ao:14,vol:1,steps:20,dens:.88,coat:.9,dof:1,pcss:2},
  max:{dpr:3,msaa:8,shadow:4096,ao:20,vol:1,steps:32,dens:1,coat:1,dof:1,pcss:2}};
let QK=(()=>{const q=Q.get('q');if(q&&QUAL[q])return q;try{const s=localStorage.getItem('mytharium.q');if(s&&QUAL[s])return s;}catch(e){}return matchMedia('(pointer: coarse)').matches?'med':'high';})();
COATK=QUAL[QK].coat;
const SETTINGS={smooth:true,fps:false,time:'cycle',dof:true,ao:true,spin:false,follow:false,sound:true,heat:1,mist:0,clock:false};
const LDIR=V.norm([.1,1,.16]);
const TMIN=[TK.ix0,0,TK.iz0],TMAX=[TK.ix1,TK.h,TK.iz1];
let RING=[0,0,0,0];
// ---------- programs ----------
const UNIT={uShadow:0,uCaus:1,uPondM:2,uDepth:3,uScene:4,uA:5,uVol:6,uSrc:7,uC:8,uB1:9,uB2:10,uB3:11,uB4:12,uSim:13,uPrev:14,uAO:15,uShadowR:14,uWipe:12};
const PR={};
// start every program compiling (no waiting); programsLeft() finishes those the driver has done and says how many remain
const PENDING=[];
function programsLeft(force){for(let i=PENDING.length-1;i>=0;i--){const P=PENDING[i];if(!force&&!progDone(P))continue;PENDING.splice(i,1);progFinish(P);use(P);
    for(const k in P.u){const t=P.u[k].type;if(t===gl.SAMPLER_2D||t===gl.SAMPLER_2D_SHADOW){gl.uniform1i(P.u[k].loc,UNIT[k]??13);}}if(force&&!TEST)break;}return PENDING.length;}
function buildPrograms(){
  const mk=(n,vs,fs)=>{const P=progStart(vs,fs,n);PR[n]=P;PENDING.push(P);return P;};
  const DEP=H+'void main(){}';
  mk('std',VS_STD,FS_STD);mk('stdC',VS_STD,FS_STDC);mk('stdS',VS_STD,DEP);mk('skin',VS_SKIN,FS_SKIN);mk('skinS',VS_SKIN,DEP);
  mk('splat',VS_SPLAT,FS_SPLAT);mk('coat',VS_COAT,FS_SPLAT);mk('part',VS_PART,FS_PART);mk('wing',VS_WING,FS_WING);
  mk('surf',VS_SURF,FS_SURF);mk('fall',VS_STD,FS_FALL);mk('glass',VS_STD,FS_GLASS);mk('wwall',VS_STD,FS_WWALL);
  if(SIM.ok){mk('ripple',VS_FULL,FS_RIPPLE);mk('cgrid',VS_CGRID,FS_CGRID);}
  mk('ao',VS_FULL,FS_AO);mk('aob',VS_FULL,FS_AOBLUR);mk('vol',VS_FULL,FS_VOL);mk('res',VS_FULL,FS_RES);mk('dof',VS_FULL,FS_DOF);mk('down',VS_FULL,FS_DOWN);mk('final',VS_FULL,FS_FINAL);}
// ---------- targets ----------
const RT={w:0,h:0};const emptyVAO=gl.createVertexArray();
function freeRT(){for(const k of['A','D','D2','B','V','O','O2','L1','L2','L3','L4'])if(RT[k])gl.deleteTexture(RT[k]);for(const k of['fA','fA2','fB','fBD','fD2','fV','fO','fO2','fL1','fL2','fL3','fL4','fMS'])if(RT[k])gl.deleteFramebuffer(RT[k]);
  if(RT.rbC)gl.deleteRenderbuffer(RT.rbC);if(RT.rbD)gl.deleteRenderbuffer(RT.rbD);RT.rbC=RT.rbD=RT.fMS=null;}
function setupRT(w,h){freeRT();RT.w=w;RT.h=h;const q=QUAL[QK];
  RT.A=mkTex(w,h,HDR_IF,gl.RGBA,HDR_T);RT.B=mkTex(w,h,HDR_IF,gl.RGBA,HDR_T);
  RT.D=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,RT.D);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,w,h,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  for(const p of[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  RT.fA=mkFbo(RT.A,RT.D);RT.fA2=mkFbo(RT.A,null);RT.fB=mkFbo(RT.B,null);RT.fBD=mkFbo(RT.B,RT.D);
  RT.D2=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,RT.D2);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,w,h,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  for(const p of[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  RT.fD2=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fD2);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,RT.D2,0);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
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
const SHADOW_EVERY={low:10,med:6,high:3,max:1}; // frames between redraws of the static shadow depth
function setupShadow(){const s=QUAL[QK].shadow;if(SH.size===s)return;if(SH.tex)gl.deleteTexture(SH.tex);if(SH.fbo)gl.deleteFramebuffer(SH.fbo);SH.size=s;
  SH.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,SH.tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,s,s,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
  SH.fbo=mkFbo(null,SH.tex);
  // the unmoving part of the scene keeps its own shadow depth, redrawn every few frames; creatures are drawn over a copy each frame
  if(SH.texS)gl.deleteTexture(SH.texS);if(SH.fboS)gl.deleteFramebuffer(SH.fboS);SH.texS=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,SH.texS);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,s,s,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);SH.fboS=mkFbo(null,SH.texS);SH.age=1e9;
  const c=[0,TK.h/2,0],eye=V.madd(c,LDIR,150),view=M4.lookAt(eye,c,[0,0,-1]);let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
  for(const x of[TK.x0-1,TK.x1+1])for(const y of[-1,TK.h+1])for(const z of[TK.z0-1,TK.z1+1]){const p=M4.xf(view,[x,y,z]);for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],p[k]);mx[k]=Math.max(mx[k],p[k]);}}
  const proj=M4.ortho(mn[0],mx[0],mn[1],mx[1],-mx[2]-5,-mn[2]+5);SH.vp=M4.mul(proj,view);SH.k=[mx[2]-mn[2]+10,Math.max(mx[0]-mn[0],mx[1]-mn[1])];
  if(!SH.raw){SH.raw=gl.createSampler();gl.samplerParameteri(SH.raw,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.samplerParameteri(SH.raw,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.samplerParameteri(SH.raw,gl.TEXTURE_COMPARE_MODE,gl.NONE);gl.samplerParameteri(SH.raw,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.samplerParameteri(SH.raw,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
  const bias=new Float32Array([.5,0,0,0,0,.5,0,0,0,0,.5,0,.5,.5,.5,1]);SH.mat=M4.mul(bias,SH.vp);}
// ---------- pond: ripple simulation and true caustics ----------
const SIM={ok:!!EXT_CBF&&!Q.has('nofloat'),w:160,h:128,tex:[],fbo:[],cur:0,drops:[],acc:0,grid:null,r:[0,0,1,1]};
const CA={tex:null,fbo:null,w:256,h:208};
function setupPond(){const B=POND.box;const b=[B[0]-1,B[1]-1,B[2]-B[0]+2,B[3]-B[1]+2];SIM.r=b;
  CA.tex=mkTex(CA.w,CA.h,SIM.ok?HDR_IF:gl.RGBA8,gl.RGBA,SIM.ok?HDR_T:gl.UNSIGNED_BYTE,gl.LINEAR_MIPMAP_LINEAR,gl.CLAMP_TO_EDGE);gl.generateMipmap(gl.TEXTURE_2D);CA.fbo=mkFbo(CA.tex,null);
  if(!SIM.ok){SIM.tex=[mkTex(1,1,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,gl.NEAREST,gl.CLAMP_TO_EDGE,new Uint8Array(4))];SIM.cur=0;
    gl.bindFramebuffer(gl.FRAMEBUFFER,CA.fbo);gl.clearColor(.25,.25,.25,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.clearColor(0,0,0,1);gl.bindFramebuffer(gl.FRAMEBUFFER,null);return;}
  for(let i=0;i<2;i++){SIM.tex[i]=mkTex(SIM.w,SIM.h,gl.RGBA16F,gl.RGBA,gl.HALF_FLOAT,gl.LINEAR,gl.CLAMP_TO_EDGE);SIM.fbo[i]=mkFbo(SIM.tex[i],null);gl.bindFramebuffer(gl.FRAMEBUFFER,SIM.fbo[i]);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.clearColor(0,0,0,1);
  const P=[],I=[],W=SIM.w,Hh=SIM.h;for(let j=0;j<Hh;j++)for(let i=0;i<W;i++)P.push(i/(W-1),j/(Hh-1),0);
  for(let j=0;j<Hh-1;j++)for(let i=0;i<W-1;i++){const k=j*W+i;I.push(k,k+1,k+W+1,k,k+W+1,k+W);}
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const b2=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b2);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(P),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(I),gl.STATIC_DRAW);
  gl.bindVertexArray(null);SIM.grid={vao,count:I.length};}
// queue a disturbance: world x,z, radius (cm), amplitude (cm)
function simDrop(x,z,rcm,amp){if(!SIM.ok)return;const r=SIM.r;if(x<r[0]||x>r[0]+r[2]||z<r[1]||z>r[1]+r[3])return;SIM.drops.push([(x-r[0])/r[2],(z-r[1])/r[3],Math.max(1.6,rcm/(r[2]/SIM.w)),amp]);if(SIM.drops.length>96)SIM.drops.splice(0,SIM.drops.length-96);}
const DROPU=new Float32Array(64),ZERO64=new Float32Array(64);
function simStepGPU(n){if(!SIM.ok||n<=0)return;const P=PR.ripple;use(P);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.bindVertexArray(emptyVAO);bindUnit(13,null);
  U(P,'uTx',[1/SIM.w,1/SIM.h]);U(P,'uDamp',0.985);
  for(let s=0;s<n;s++){if(s===0){DROPU.fill(0);const k=Math.min(16,SIM.drops.length);for(let i=0;i<k;i++)DROPU.set(SIM.drops[i],i*4);SIM.drops.splice(0,k);U(P,'uDrops',DROPU);}else if(s===1)U(P,'uDrops',ZERO64);
    gl.bindFramebuffer(gl.FRAMEBUFFER,SIM.fbo[1-SIM.cur]);gl.viewport(0,0,SIM.w,SIM.h);bindUnit(14,SIM.tex[SIM.cur]);gl.drawArrays(gl.TRIANGLES,0,3);SIM.cur=1-SIM.cur;}
  bindUnit(14,null);}
function causticPass(){if(!SIM.ok)return;gl.bindFramebuffer(gl.FRAMEBUFFER,CA.fbo);gl.viewport(0,0,CA.w,CA.h);gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.clearColor(0,0,0,1);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);const P=PR.cgrid;use(P);bindUnit(13,SIM.tex[SIM.cur]);
  U(P,'uSimR',SIM.r);U(P,'uCMap',SIM.r);U(P,'uLd',V.mul(LDIR,-1));U(P,'uDepth',5);U(P,'uTime',SIMT);gl.bindVertexArray(SIM.grid.vao);
  const iors=[1.3318,1.334,1.3368];for(let c=0;c<3;c++){gl.colorMask(c===0,c===1,c===2,false);U(P,'uIor',iors[c]);gl.drawElements(gl.TRIANGLES,SIM.grid.count,gl.UNSIGNED_SHORT,0);}
  gl.colorMask(true,true,true,true);gl.disable(gl.BLEND);STATS.draws+=3;gl.bindTexture(gl.TEXTURE_2D,CA.tex);gl.generateMipmap(gl.TEXTURE_2D);}
function bindUnit(u,tex){gl.activeTexture(gl.TEXTURE0+u);gl.bindTexture(gl.TEXTURE_2D,tex);}
// ---------- glass wipe mask (front pane), regrows as fog when the air is humid ----------
const WIPE={w:240,h:150,data:null,tex:null,dirty:true};
function setupWipe(){WIPE.data=new Uint8Array(WIPE.w*WIPE.h);WIPE.tex=mkTex(WIPE.w,WIPE.h,gl.R8,gl.RED,gl.UNSIGNED_BYTE,gl.LINEAR,gl.CLAMP_TO_EDGE,WIPE.data);}
function wipeAt(u,v,rad){const W=WIPE.w,Hh=WIPE.h,r=rad*W;for(let j=Math.floor(v*Hh-r);j<=v*Hh+r;j++)for(let i=Math.floor(u*W-r);i<=u*W+r;i++){if(i<0||j<0||i>=W||j>=Hh)continue;const d=Math.hypot(i-u*W,j-v*Hh)/r;if(d>1)continue;const k=j*W+i;WIPE.data[k]=Math.max(WIPE.data[k],Math.round(255*sstep(1,.6,d)));}WIPE.dirty=true;}
function wipeDecay(dt){if(!WIPE.data)return;WIPE.t=(WIPE.t||0)+dt;if(WIPE.t<.5)return;const k=Math.round(WIPE.t*(4+TERR.humid*.12));WIPE.t=0;let any=false;const D=WIPE.data;for(let i=0;i<D.length;i++)if(D[i]){D[i]=Math.max(0,D[i]-k);any=true;}if(any)WIPE.dirty=true;}
function uploadWipe(){if(!WIPE.dirty)return;gl.bindTexture(gl.TEXTURE_2D,WIPE.tex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,WIPE.w,WIPE.h,gl.RED,gl.UNSIGNED_BYTE,WIPE.data);WIPE.dirty=false;}
// ---------- camera ----------
const CAM={target:[0,30,0],yaw:0,pitch:.1,dist:190,fov:36*PI/180,pos:[0,0,0],view:M4.id(),proj:M4.id(),vp:M4.id(),inv:M4.id(),R:[1,0,0],Uv:[0,1,0],
  t:{target:[0,30,0],yaw:0,pitch:.1,dist:190},vel:{yaw:0,pitch:0},view0:'front'};
const CLIM={pmin:-.2,pmax:1.45,dmin:5,dmax:420,x:62,ymin:1,ymax:80,z:34};
const KEYS=new Set();
const wrapPI=a=>a-Math.round(a/TAU)*TAU;function nearYaw(y){return CAM.t.yaw+wrapPI(y-CAM.t.yaw);}
function clampCam(){const t=CAM.t;t.pitch=clamp(t.pitch,CLIM.pmin,CLIM.pmax);t.dist=clamp(t.dist,CLIM.dmin,CLIM.dmax);
  t.target=[clamp(t.target[0],-CLIM.x,CLIM.x),clamp(t.target[1],CLIM.ymin,CLIM.ymax),clamp(t.target[2],-CLIM.z,CLIM.z)];}
// the whole tank with a little of the stand and the lamps: as close as the window's shape allows
function fitDist(){const asp=RT.w/RT.h||1.6;const fx=2*Math.atan(Math.tan(CAM.fov/2)*asp);const half=asp<.8?40:asp<1.2?56:64;return Math.max(half/Math.tan(fx/2)+30,(TK.h/2+7)/Math.tan(CAM.fov/2)+30);}
function fillDist(){const asp=RT.w/RT.h||1.6;const tx=Math.tan(CAM.fov/2)*asp,ty=Math.tan(CAM.fov/2);const dw=(TK.x1+1)/tx,dh=(TK.h/2+1)/ty;return (asp>=1.15?dw:Math.min(dw,dh*1.08))+TK.z1;}
let drag=null;
function setView(name){const t=CAM.t;CAM.vel.yaw=CAM.vel.pitch=0;if(name!=='follow'){SETTINGS.follow=false;const fb=$('bFollow');if(fb)fb.classList.remove('on');}
  if(name!=='spin')SETTINGS.spin=false;
  if(name==='front')Object.assign(t,{target:[0,TK.h*.41,0],yaw:nearYaw(0),pitch:.155,dist:fitDist()});
  else if(name==='fill')Object.assign(t,{target:[0,TK.h/2,0],yaw:nearYaw(0),pitch:0,dist:fillDist()});
  else if(name==='falls'||name==='back')Object.assign(t,{target:[44,20,-20],yaw:nearYaw(-.35),pitch:.18,dist:62});
  else if(name==='spin'){SETTINGS.spin=!SETTINGS.spin;if(SETTINGS.spin){t.target=[0,TK.h*.45,0];t.pitch=clamp(t.pitch,.05,.4);t.dist=Math.max(t.dist,Math.min(fitDist(),190));}}
  else if(name==='close'){const h=followTarget()||[0,14,6];Object.assign(t,{target:[h[0],h[1]+1,h[2]],yaw:nearYaw(clamp(h[0]*.006,-.4,.4)),pitch:.22,dist:38});}
  else if(name==='left')Object.assign(t,{target:[-28,18,0],yaw:nearYaw(-.75),pitch:.16,dist:96});
  else if(name==='right')Object.assign(t,{target:[28,17,0],yaw:nearYaw(.75),pitch:.18,dist:96});
  else if(name==='window')Object.assign(t,{target:[56,7.2,-4],yaw:nearYaw(PI/2),pitch:.02,dist:62});
  else if(name==='top')Object.assign(t,{target:[0,12,0],yaw:nearYaw(0),pitch:1.38,dist:Math.max(150,fitDist()*1.05)});
  else if(name==='follow'){SETTINGS.follow=true;t.dist=Math.min(t.dist,40);t.pitch=clamp(t.pitch,.08,.6);}
  CAM.view0=name==='spin'?(SETTINGS.spin?'spin':CAM.view0):name;clampCam();if(typeof markView==='function')markView(CAM.view0);}
function zoomBy(f,toward){const t=CAM.t,nd=clamp(t.dist*f,CLIM.dmin,CLIM.dmax),k=1-nd/t.dist;if(toward)t.target=V.lerp(t.target,toward,clamp(k*.9,-.6,.9));t.dist=nd;clampCam();}
function panCam(dx,dy){const s=CAM.dist*.0016,t=CAM.t,r=[Math.cos(CAM.yaw),0,-Math.sin(CAM.yaw)],f=[-Math.sin(CAM.yaw),0,-Math.cos(CAM.yaw)];
  const cp=Math.cos(CAM.pitch),sp=Math.sin(Math.max(0,CAM.pitch));t.target=[t.target[0]-r[0]*dx*s+f[0]*dy*s*sp,t.target[1]+dy*s*cp,t.target[2]-r[2]*dx*s+f[2]*dy*s*sp];clampCam();}
function updateCamera(dt){const t=CAM.t;
  if(KEYS.size){const sp=dt*CAM.dist*.65,r=[Math.cos(CAM.yaw),0,-Math.sin(CAM.yaw)];
    if(KEYS.has('a')||KEYS.has('arrowleft'))t.target=V.madd(t.target,r,-sp);if(KEYS.has('d')||KEYS.has('arrowright'))t.target=V.madd(t.target,r,sp);
    if(KEYS.has('w')||KEYS.has('arrowup'))t.dist*=Math.exp(-dt*1.3);if(KEYS.has('s')||KEYS.has('arrowdown'))t.dist*=Math.exp(dt*1.3);
    if(KEYS.has('q'))t.yaw+=dt*1.1;if(KEYS.has('e'))t.yaw-=dt*1.1;if(KEYS.has('r'))t.target[1]+=sp*.6;if(KEYS.has('c'))t.target[1]-=sp*.6;
    if(KEYS.has('pageup'))t.pitch+=dt*.8;if(KEYS.has('pagedown'))t.pitch-=dt*.8;clampCam();}
  if(!drag&&(Math.abs(CAM.vel.yaw)>1e-4||Math.abs(CAM.vel.pitch)>1e-4)){t.yaw+=CAM.vel.yaw*dt;t.pitch+=CAM.vel.pitch*dt;const d=Math.exp(-dt*5);CAM.vel.yaw*=d;CAM.vel.pitch*=d;clampCam();}
  if(SETTINGS.spin&&!drag)t.yaw+=dt*.11;
  if(SETTINGS.follow){const fp=followTarget();if(fp)t.target=V.lerp(t.target,[fp[0],clamp(fp[1]+1,3,70),fp[2]],clamp(dt*1.6,0,1));}
  const k=TEST?1:clamp(dt*8,0,1);
  CAM.target=V.lerp(CAM.target,t.target,k);CAM.yaw=lerp(CAM.yaw,t.yaw,k);CAM.pitch=lerp(CAM.pitch,t.pitch,k);CAM.dist=Math.exp(lerp(Math.log(CAM.dist),Math.log(t.dist),k));
  const cp=Math.cos(CAM.pitch);const bd=[Math.sin(CAM.yaw)*cp,Math.sin(CAM.pitch),Math.cos(CAM.yaw)*cp];let bl=CAM.dist;
  if(bd[2]<0)bl=Math.min(bl,(-84-CAM.target[2])/bd[2]);if(bd[0]<0)bl=Math.min(bl,(-252-CAM.target[0])/bd[0]);if(bd[0]>0)bl=Math.min(bl,(252-CAM.target[0])/bd[0]);if(bd[1]<0)bl=Math.min(bl,(-74-CAM.target[1])/bd[1]);
  CAM.boom=Math.max(bl,3);CAM.pos=V.madd(CAM.target,bd,CAM.boom);
  const up=Math.abs(CAM.pitch)>1.45?[-Math.sin(CAM.yaw),0,-Math.cos(CAM.yaw)]:[0,1,0];
  CAM.view=M4.lookAt(CAM.pos,CAM.target,up);CAM.proj=M4.persp(CAM.fov,RT.w/RT.h,CAM.dist<20?.25:CAM.dist<60?1:2,1800);CAM.vp=M4.mul(CAM.proj,CAM.view);CAM.inv=M4.inv(CAM.vp);
  CAM.R=[CAM.view[0],CAM.view[4],CAM.view[8]];CAM.Uv=[CAM.view[1],CAM.view[5],CAM.view[9]];}
function screenRay(px,py){const r=canvas.getBoundingClientRect();const x=(px-r.left)/r.width*2-1,y=1-(py-r.top)/r.height*2;
  const a=M4.xf4(CAM.inv,[x,y,-1]),b=M4.xf4(CAM.inv,[x,y,1]);return{o:a,d:V.norm(V.sub(b,a))};}
// ---------- light state: one day value drives the LED, room, moonlight and mist ----------
// day: 0 midnight, .25 dawn, .5 noon, .75 dusk
const LIGHT={lcol:[3,3,3],sky:[.3,.3,.3],gnd:[.1,.1,.1],room:[.02,.02,.02],heat:[0,0,0],expo:1,night:0,warm:0,mistC:[.5,.5,.5]};
let DAY=.45;
function dayPreset(){if(SETTINGS.time==='day')return .5;if(SETTINGS.time==='dusk')return .76;if(SETTINGS.time==='night')return .02;if(SETTINGS.time==='dawn')return .25;
  if(SETTINGS.time==='clock'){const d=new Date();return(d.getHours()+d.getMinutes()/60)/24;}return null;}
function updateLight(dt){const p=dayPreset();if(p===null){DAY=(DAY+dt/600)%1;}else{const dd=wrapPI((p-DAY)*TAU)/TAU;DAY=(DAY+dd*clamp(dt*1.5,0,1)+1)%1;}
  // LED: ramps through warm sunrise and sunset; moonlight blue at night
  const sun=sstep(.2,.32,DAY)*sstep(.82,.7,DAY);const warm=Math.max(sstep(.2,.27,DAY)*sstep(.36,.27,DAY),sstep(.64,.73,DAY)*sstep(.82,.73,DAY));
  const ledC=V.lerp([1,.93,.8],[1,.62,.32],warm);const moon=[.18,.28,.55];
  const tgt={lcol:V.add(V.mul(ledC,2.5*sun),V.mul(moon,.35*(1-sun))),sky:V.add(V.mul(V.lerp([.66,.68,.66],[.8,.55,.4],warm),.36*sun),V.mul([.06,.09,.16],1-sun)),
    gnd:V.add(V.mul([.2,.15,.08],.42*sun),V.mul([.02,.025,.04],1-sun)),room:V.add(V.mul([.075,.052,.03],sun),V.mul([.006,.0045,.004],1-sun)),
    heat:V.mul([1,.55,.25],SETTINGS.heat*3.2),expo:lerp(2.1,.92,sun),night:1-sun,warm,mistC:V.add(V.mul(ledC,.22*sun),V.mul([.02,.035,.07],1+(1-sun)*.6))};
  const k=TEST?1:clamp(dt*3,0,1);for(const q of['lcol','sky','gnd','room','heat','mistC'])LIGHT[q]=V.lerp(LIGHT[q],tgt[q],k);for(const q of['expo','night','warm'])LIGHT[q]=lerp(LIGHT[q],tgt[q],k);}
// ---------- point lights gathered each frame ----------
const PLU=new Float32Array(NPL*4),PCU=new Float32Array(NPL*4);let NPLN=0;
function gatherLights(){const L=[];const night=LIGHT.night;
  if(!STUDIO.on)for(const it of items)for(const l of it.lights||[]){if(l.lantern&&!it.lit)continue;let k=l.night?night:1;if(it.geo.ember)k=1;if(k<.05)continue;L.push({p:l.p,c:V.mul(l.c,k*(l.lantern?2.6:1.6)),r:l.r*1.2});}
  if(typeof creatureLights==='function')creatureLights(L);
  const t=CAM.target;L.sort((a,b)=>V.dist(a.p,t)/(lum(b.c)+.05)-V.dist(b.p,t)/(lum(a.c)+.05)||0);
  NPLN=Math.min(NPL,L.length);for(let i=0;i<NPLN;i++){PLU.set([L[i].p[0],L[i].p[1],L[i].p[2],L[i].r],i*4);PCU.set([L[i].c[0],L[i].c[1],L[i].c[2],0],i*4);}}
function lum(c){return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
// ---------- common uniforms ----------
function common(P,vp){use(P);U(P,'uTime',SIMT);U(P,'uCam',CAM.pos);U(P,'uVP',vp);U(P,'uLdir',LDIR);U(P,'uLcol',LIGHT.lcol);U(P,'uSky',LIGHT.sky);U(P,'uGnd',LIGHT.gnd);U(P,'uRoom',LIGHT.room);
  U(P,'uSM',SH.mat);U(P,'uSMk',SH.k||[100,120]);U(P,'uPCSS',QUAL[QK].pcss);U(P,'uShadowOn',1);U(P,'uHeatP',HEATP);U(P,'uHeatC',LIGHT.heat);
  U(P,'uPL',PLU);U(P,'uPC',PCU);U(P,'uNPL',NPLN);U(P,'uPWL',PWL);U(P,'uPondB',PONDTX.box);U(P,'uAbs',[.05,.022,.026]);U(P,'uCMap',SIM.r);U(P,'uTmin',TMIN);U(P,'uTmax',TMAX);
  U(P,'uHumid',TERR.humid/100);U(P,'uNight',LIGHT.night);U(P,'uEnvK',1);U(P,'uMistD',TERR.mistD);U(P,'uMistC',LIGHT.mistC);U(P,'uRing',RING);U(P,'uSel',0);
  U(P,'uClip',STUDIO.on?0:1);U(P,'uDens',QUAL[QK].dens);U(P,'uSzK',1/Math.sqrt(QUAL[QK].dens));U(P,'uPush',PUSH);U(P,'uA2C',RT.samples>0?1:0);}
const ID4=M4.id(),ID3=new Float32Array([1,0,0,0,1,0,0,0,1]);
const MESH={};const PUSH=new Float32Array(32);
function buildStaticMeshes(){const t=genTank();for(const k in t)MESH[k]=t[k].mesh();MESH.bg=genBackground().mesh();MESH.bgG=splatGPU(genBgGreenery());MESH.fall=genFallMesh().mesh();MESH.wwall=genWaterWall().mesh();
  const q=gl.createVertexArray();gl.bindVertexArray(q);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);const P=[];const I=[];const n=48;for(let j=0;j<=n;j++)for(let i=0;i<=n;i++)P.push(i/n,j/n,0);
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i;I.push(a,a+1,a+n+2,a,a+n+2,a+n+1);}gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(P),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(I),gl.STATIC_DRAW);gl.bindVertexArray(null);MESH.surf={vao:q,count:I.length,itype:gl.UNSIGNED_SHORT};
  MESH.parts=splatParticlesGPU();}
let SELECTED=null;
// ---------- skipping what cannot be seen, thinning what is too small to see ----------
let FRUS=null;
function frustumOf(vp){const r=i=>[vp[i],vp[i+4],vp[i+8],vp[i+12]],R0=r(0),R1=r(1),R2=r(2),R3=r(3),P=[];for(const[a,s]of[[R0,1],[R0,-1],[R1,1],[R1,-1],[R2,1],[R2,-1]])P.push([R3[0]+s*a[0],R3[1]+s*a[1],R3[2]+s*a[2],R3[3]+s*a[3]]);return P;}
function boxSeen(mn,mx,pad=.6){if(!FRUS)return true;for(const p of FRUS){const x=p[0]>0?mx[0]+pad:mn[0]-pad,y=p[1]>0?mx[1]+pad:mn[1]-pad,z=p[2]>0?mx[2]+pad:mn[2]-pad;if(p[0]*x+p[1]*y+p[2]*z+p[3]<0)return false;}return true;}
// splat detail by distance: where a splat would cover less than a pixel or two, draw fewer and slightly larger ones (the set thins
// by a fixed per-splat hash, so nothing flickers). MAX always draws every splat.
function lodBox(mn,mx){if(QK==='max'||STUDIO.on||!FRUS)return 1;const c=CAM.pos;const dx=Math.max(mn[0]-c[0],0,c[0]-mx[0]),dy=Math.max(mn[1]-c[1],0,c[1]-mx[1]),dz=Math.max(mn[2]-c[2],0,c[2]-mx[2]);
  const d=Math.max(Math.hypot(dx,dy,dz),1);const px=RT.h/(2*Math.tan(CAM.fov/2)*d);return clamp(px/10,.4,1);}
function setLod(P,l){const d=QUAL[QK].dens*l;U(P,'uDens',d);U(P,'uSzK',1/Math.sqrt(d));}
const CULLED={items:0,chunks:0};
function drawStd(P,mesh,M,Nm,mat,v,tint,rough,os,seed,glow,sel){U(P,'uModel',M);U(P,'uNmat',Nm);U(P,'uOS',os);U(P,'uMat',mat);U(P,'uVar',v);U(P,'uTint',tint);U(P,'uRough',rough);U(P,'uSeed',seed);U(P,'uGlow',glow||0);U(P,'uSel',sel?1:0);drawMesh(mesh);}
function itemGlow(it,p){if(p.mat===15)return it.lit?1:0;if(p.mat===11)return p.glow?1.2:0;if(p.mat===2&&p.v===3)return 1;if(p.mat===10)return LIGHT.night*.5+.15;if(p.mat===20)return it.hatch||0;return p.glow||0;}
function drawItemMeshes(P,shadow){for(const it of items){if(!shadow&&!(it.seen=boxSeen(it.wmin,it.wmax))){CULLED.items++;continue;}const sel=!shadow&&SELECTED===it;for(const p of it.geo.parts){if(shadow&&p.mat===15)continue;
  drawStd(P,p.mesh,it.M,it.Nm,p.mat,p.v,p.tint,p.rough,it.scale,it.seed%97,itemGlow(it,p),sel);}}}
function drawItemSplats(P,shadow){for(const it of items){const g=it.geo;if(!g.splats)continue;if(!shadow){if(!boxSeen(it.wmin,it.wmax))continue;setLod(P,lodBox(it.wmin,it.wmax));}U(P,'uModel',it.M);U(P,'uNmat',it.Nm);U(P,'uWilt',it.wilt||0);U(P,'uBloom',it.bloom===undefined?1:it.bloom);U(P,'uGlowK',LIGHT.night);U(P,'uTintS',[1,1,1]);drawSplats(g.splats);}
  U(P,'uModel',ID4);U(P,'uNmat',ID3);U(P,'uWilt',TERR.groundWilt);U(P,'uBloom',1);
  const cw=TG.w/CH.nx,cd=TG.d/CH.nz;for(let k=0;k<CH.list.length;k++){const c=CH.list[k];if(!c)continue;
    if(!shadow){const ci=k%CH.nx,cj=(k-ci)/CH.nx;const mn=[TG.x0+ci*cw,3,TG.z0+cj*cd],mx=[mn[0]+cw,26,mn[2]+cd];if(!boxSeen(mn,mx,1.5)){CULLED.chunks++;continue;}setLod(P,lodBox(mn,mx));}drawSplats(c);}
  U(P,'uWilt',TERR.groundWilt*.6);if(MESH.bgG){if(!shadow)setLod(P,Math.max(.6,lodBox([TK.ix0,0,TK.iz0],[TK.ix1,TK.h,TK.iz0+8])));drawSplats(MESH.bgG);}if(!shadow)setLod(P,1);}
// ---------- frame ----------
let frameNo=0;
// stage timing for the perf probe (test only): gl.finish() after each stage
const PROF={on:false,t:{},last:0};function glSync(){if(!PROF.fbo){PROF.fbo=mkFbo(mkTex(1,1,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,gl.NEAREST,gl.CLAMP_TO_EDGE,new Uint8Array(4)),null);PROF.px=new Uint8Array(4);}
  const d=gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),r=gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);gl.bindFramebuffer(gl.FRAMEBUFFER,PROF.fbo);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,PROF.px);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,d);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,r);}
function mark(k){if(!PROF.on)return;glSync();const n=performance.now();PROF.t[k]=(PROF.t[k]||0)+n-PROF.last;PROF.last=n;}
function render(){STATS.draws=0;STATS.tris=0;STATS.splats=0;frameNo++;const q=QUAL[QK];updateDOF(LAST_DT);gatherLights();uploadWipe();
  gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
  if(SIM.ok){SIM.acc+=LAST_DT;let n=TEST?2:Math.min(4,Math.floor(SIM.acc*120));SIM.acc-=n/120;if(SIM.acc>.1)SIM.acc=0;simStepGPU(n);}
  bindUnit(1,null);if(QK!=='low'||frameNo%2===0)causticPass();
  // shadow map: meshes, splats (alpha tested), creatures
  if(PROF.on){glSync();PROF.last=performance.now();}mark('sim');
  const SO=STUDIO.on;FRUS=null;const every=SHADOW_EVERY[QK]||1;SH.age++;
  bindUnit(0,null);gl.viewport(0,0,SH.size,SH.size);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);
  if(SO){gl.bindFramebuffer(gl.FRAMEBUFFER,SH.fbo);gl.clear(gl.DEPTH_BUFFER_BIT);SH.age=1e9;}
  else{if(SH.age>=every||(TEST&&!PROF.cache)){SH.age=0;gl.bindFramebuffer(gl.FRAMEBUFFER,SH.fboS);gl.clear(gl.DEPTH_BUFFER_BIT);
      common(PR.stdS,SH.vp);drawStd(PR.stdS,TER.mesh,ID4,ID3,1,0,[1,1,1],1,1,0);drawStd(PR.stdS,MESH.bg,ID4,ID3,4,0,[1,1,1],1,1,0);drawItemMeshes(PR.stdS,true);
      bindUnit(2,PONDTX.tex);common(PR.splat,SH.vp);U(PR.splat,'uShadowPass',1);drawItemSplats(PR.splat,true);U(PR.splat,'uShadowPass',0);}
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,SH.fboS);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,SH.fbo);gl.blitFramebuffer(0,0,SH.size,SH.size,0,0,SH.size,SH.size,gl.DEPTH_BUFFER_BIT,gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);gl.bindFramebuffer(gl.FRAMEBUFFER,SH.fbo);}
  mark('shadowStatic');bindUnit(2,PONDTX.tex);
  drawCreatures(SH.vp,true);mark('shadowCreatures');
  bindUnit(0,SH.tex);bindUnit(1,CA.tex);bindUnit(2,PONDTX.tex);bindUnit(3,null);bindUnit(13,SIM.tex[SIM.cur]);bindUnit(14,SH.tex);gl.bindSampler(14,SH.raw);bindUnit(12,WIPE.tex);
  // main opaque
  gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fMS||RT.fA);gl.viewport(0,0,RT.w,RT.h);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const vp=CAM.vp,P=PR.std;FRUS=frustumOf(vp);CULLED.items=CULLED.chunks=0;common(P,vp);U(P,'uWetK',TERR.humid/100);
  U(P,'uClip',0);if(SO){drawStd(P,STUDIO.mesh,ID4,ID3,22,0,[1,1,1],.9,1,0);}else{
  // nearest first, so the depth test spares the shader: things in the tank, the ground, the bark, then hardware, stand and room
  mark('pre');U(P,'uClip',1);drawItemMeshes(P,false);mark('mItems');U(P,'uClip',0);drawStd(P,TER.mesh,ID4,ID3,1,0,[1,1,1],.9,1,0);mark('mTerrain');drawStd(P,MESH.bg,ID4,ID3,4,0,[1,1,1],.9,1,0);mark('mBark');
  drawStd(P,MESH.frame,ID4,ID3,5,0,[1,1,1],.4,1,0);drawStd(P,MESH.lamp,ID4,ID3,8,0,[1,1,1],.4,1,0);
  {const Pc=PR.stdC;common(Pc,vp);U(Pc,'uClip',0);if(RT.samples>0)gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);drawStd(Pc,MESH.lid,ID4,ID3,6,0,[1,1,1],.5,1,0);gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);use(P);}mark('mHardware');
  drawStd(P,MESH.cab,ID4,ID3,9,0,[1,1,1],.5,1,0);mark('mStand');drawStd(P,MESH.room,ID4,ID3,7,0,[1,1,1],.9,1,0);mark('mRoom');U(P,'uClip',1);}
  mark('meshes');
  if(RT.samples>0)gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  common(PR.splat,vp);U(PR.splat,'uShadowPass',0);if(!SO)drawItemSplats(PR.splat,false);mark('splats');
  drawCreatures(vp,false);mark('creatures');
  gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  if(RT.fMS){gl.bindFramebuffer(gl.READ_FRAMEBUFFER,RT.fMS);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,RT.fA);gl.blitFramebuffer(0,0,RT.w,RT.h,0,0,RT.w,RT.h,gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT,gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);}
  if(!SO&&RT.fD2){gl.bindFramebuffer(gl.READ_FRAMEBUFFER,RT.fA);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,RT.fD2);gl.blitFramebuffer(0,0,RT.w,RT.h,0,0,RT.w,RT.h,gl.DEPTH_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);}
  gl.disable(gl.DEPTH_TEST);gl.bindVertexArray(emptyVAO);
  const aoOn=q.ao>0&&!!RT.O&&SETTINGS.ao!==false;
  if(aoOn){gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fO);gl.viewport(0,0,RT.vw,RT.vh);bindUnit(3,RT.D);const Pa=PR.ao;use(Pa);U(Pa,'uInvVP',CAM.inv);U(Pa,'uVP',vp);U(Pa,'uCam',CAM.pos);U(Pa,'uRad',1.6);U(Pa,'uN',q.ao);gl.drawArrays(gl.TRIANGLES,0,3);
    gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fO2);use(PR.aob);bindUnit(7,RT.O);gl.drawArrays(gl.TRIANGLES,0,3);bindUnit(7,null);}
  mark('resolveAO');const volOn=!SO&&q.vol&&TERR.mistD>.0004;
  if(volOn){gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fV);gl.viewport(0,0,RT.vw,RT.vh);bindUnit(3,RT.D);const Pv=PR.vol;common(Pv,vp);U(Pv,'uInvVP',CAM.inv);U(Pv,'uSteps',q.steps);U(Pv,'uScat',TERR.mistD*1.4);U(Pv,'uFrame',TEST?0:frameNo%64);gl.drawArrays(gl.TRIANGLES,0,3);}
  gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fB);gl.viewport(0,0,RT.w,RT.h);bindUnit(3,RT.D);bindUnit(5,RT.A);bindUnit(6,RT.V);
  const Pr=PR.res;use(Pr);U(Pr,'uInvVP',CAM.inv);U(Pr,'uCam',CAM.pos);U(Pr,'uVolRes',[RT.vw,RT.vh]);U(Pr,'uVolOn',volOn?1:0);bindUnit(15,aoOn?RT.O2:null);U(Pr,'uAOOn',aoOn?1:0);U(Pr,'uAOK',.8);gl.drawArrays(gl.TRIANGLES,0,3);
  mark('volRes');
  // see-through things refract the resolved scene: copy B -> A first
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,RT.fB);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,RT.fA2);gl.blitFramebuffer(0,0,RT.w,RT.h,0,0,RT.w,RT.h,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);
  bindUnit(3,null);bindUnit(4,RT.A);gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fBD);gl.enable(gl.DEPTH_TEST);
  // pond surface (writes depth so blur treats it as a surface)
  gl.depthMask(true);gl.disable(gl.BLEND);if(!SO){const Ps=PR.surf;common(Ps,vp);U(Ps,'uRes',[RT.w,RT.h]);U(Ps,'uSimR',SIM.r);U(Ps,'uFlowK',1);gl.bindVertexArray(MESH.surf.vao);gl.drawElements(gl.TRIANGLES,MESH.surf.count,MESH.surf.itype,0);}
  gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  if(!SO&&MESH.wwall){gl.disable(gl.BLEND);bindUnit(3,RT.D2);const Pw=PR.wwall;common(Pw,vp);U(Pw,'uModel',ID4);U(Pw,'uNmat',ID3);U(Pw,'uOS',1);U(Pw,'uRes',[RT.w,RT.h]);U(Pw,'uInvVP',CAM.inv);drawMesh(MESH.wwall);bindUnit(3,null);gl.enable(gl.BLEND);}
  if(!SO){const Pf=PR.fall;common(Pf,vp);U(Pf,'uModel',ID4);U(Pf,'uNmat',ID3);U(Pf,'uOS',1);drawMesh(MESH.fall);}
  drawWings(vp);
  drawParticles(vp);
  if(!SO){const Pg=PR.glass;common(Pg,vp);U(Pg,'uModel',ID4);U(Pg,'uNmat',ID3);U(Pg,'uOS',1);U(Pg,'uRes',[RT.w,RT.h]);U(Pg,'uFogG',TERR.fog);drawMesh(MESH.glass);}
  gl.disable(gl.BLEND);gl.depthMask(true);gl.disable(gl.DEPTH_TEST);bindUnit(4,null);bindUnit(14,null);gl.bindSampler(14,null);gl.bindVertexArray(emptyVAO);
  mark('transparent');let scene=RT.B;const dofOn=q.dof&&SETTINGS.dof!==false&&DOF.aper>.002;
  if(dofOn){gl.bindFramebuffer(gl.FRAMEBUFFER,RT.fA2);gl.viewport(0,0,RT.w,RT.h);const Po=PR.dof;use(Po);bindUnit(7,RT.B);bindUnit(3,RT.D);
    U(Po,'uTaps',QK==='max'?24:QK==='high'?16:12);U(Po,'uInvVP',CAM.inv);U(Po,'uCam',CAM.pos);U(Po,'uFocus',DOF.focus);U(Po,'uAper',DOF.aper);U(Po,'uRes',[RT.w,RT.h]);gl.drawArrays(gl.TRIANGLES,0,3);bindUnit(7,null);bindUnit(3,null);scene=RT.A;}
  const Pd=PR.down;use(Pd);let src=scene,sw=RT.w,sh=RT.h;
  for(let i=1;i<=4;i++){gl.bindFramebuffer(gl.FRAMEBUFFER,RT['fL'+i]);gl.viewport(0,0,RT['w'+i],RT['h'+i]);bindUnit(7,src);U(Pd,'uSrc',7);U(Pd,'uTx',[.5/sw,.5/sh]);U(Pd,'uThr',i===1?1.1:0);gl.drawArrays(gl.TRIANGLES,0,3);src=RT['L'+i];sw=RT['w'+i];sh=RT['h'+i];}
  bindUnit(7,null);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);const Pfi=PR.final;use(Pfi);
  bindUnit(8,scene);bindUnit(9,RT.L1);bindUnit(10,RT.L2);bindUnit(11,RT.L3);bindUnit(12,RT.L4);
  U(Pfi,'uExpo',LIGHT.expo*(PHOTO.expo||1));U(Pfi,'uBloom',.24+LIGHT.night*.2);U(Pfi,'uTime',SIMT);U(Pfi,'uRes',[canvas.width,canvas.height]);U(Pfi,'uWarm',LIGHT.warm);gl.drawArrays(gl.TRIANGLES,0,3);
  for(const u of[5,6,8,9,10,11,12,15])bindUnit(u,null);mark('post');}
// focus eases toward the orbit target; aperture opens for close views (macro); photo mode can pin it
const DOF={focus:80,aper:0};const PHOTO={on:false,focus:0,aper:0,expo:1};
function updateDOF(dt){let tgt=CAM.dist,a=clamp((90-CAM.dist)/70,0,1)*.6+.05;if(STUDIO.on)a=.04;if(PHOTO.on&&PHOTO.focus>0){tgt=PHOTO.focus;a=PHOTO.aper||a;}
  DOF.focus=TEST?tgt:lerp(DOF.focus,tgt,clamp(dt*4,0,1));DOF.aper=TEST?a:lerp(DOF.aper,a,clamp(dt*3,0,1));}
