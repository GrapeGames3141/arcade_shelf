
// ============================================================
//  WORLD · terrain, ground cover, pond, background, catalogue, placement
// ============================================================
const TG={nx:240,nz:120,x0:TK.ix0,z0:TK.iz0,w:TK.ix1-TK.ix0,d:TK.iz1-TK.iz0};TG.dx=TG.w/TG.nx;TG.dz=TG.d/TG.nz;
const NV=(TG.nx+1)*(TG.nz+1);
const HF=new Float32Array(NV);                  // ground height
const COV={moss:new Float32Array(NV),grass:new Float32Array(NV),sand:new Float32Array(NV),gravel:new Float32Array(NV),clover:new Float32Array(NV),litter:new Float32Array(NV)};
const PM=new Uint8Array(NV);                    // pond region (water wherever the ground there lies below the water level)
const PWL=TK.pwl;
const gi=(i,j)=>j*(TG.nx+1)+i;
const gx=i=>TG.x0+i*TG.dx,gz=j=>TG.z0+j*TG.dz;
function sampleArr(A,x,z){const fx=clamp((x-TG.x0)/TG.dx,0,TG.nx-1e-4),fz=clamp((z-TG.z0)/TG.dz,0,TG.nz-1e-4);const i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j;
  return lerp(lerp(A[gi(i,j)],A[gi(i+1,j)],u),lerp(A[gi(i,j+1)],A[gi(i+1,j+1)],u),v);}
const groundH=(x,z)=>sampleArr(HF,x,z);
function groundN(x,z){const e=.6;return V.norm([groundH(x-e,z)-groundH(x+e,z),2*e,groundH(x,z-e)-groundH(x,z+e)]);}
function inPond(x,z){const fx=Math.round((x-TG.x0)/TG.dx),fz=Math.round((z-TG.z0)/TG.dz);if(fx<0||fz<0||fx>TG.nx||fz>TG.nz)return false;return PM[gi(fx,fz)]>0&&groundH(x,z)<PWL-.05;}
const waterDepth=(x,z)=>inPond(x,z)?PWL-groundH(x,z):0;
// pond basin shape used by the default scape
// a basin in the back right corner (the waterfall comes down the back wall into it) and an arm running along the right glass,
// deep enough at the glass to look into from the side like an aquarium
const POND={cx:40,cz:-17.5,rx:18,rz:12.5,ax:57.6,az0:-22,az1:27,ar:9.5,box:[22,-29.4,59.4,29.4],bx:43,bz:20,br:10};
// the beach: a patch of pale sand shelving gently into the arm of the pond near the front glass
const beachK=(x,z)=>sstep(POND.br,POND.br*.45,Math.hypot(x-POND.bx,(z-POND.bz)*.85));
function pondD(x,z){const a=(x-POND.cx)/POND.rx,b=(z-POND.cz)/POND.rz;const e=Math.sqrt(a*a+b*b)*(1+.05*Math.sin(Math.atan2(b,a)*3+1));
  const zz=clamp(z,POND.az0,POND.az1);const c=Math.hypot(x-POND.ax,z-zz)/POND.ar*(1+.04*Math.sin(z*.31));const k=.22;const h=clamp(.5+.5*(c-e)/k,0,1);return lerp(c,e,h)-k*h*(1-h);}
function defaultTerrain(){
  for(let j=0;j<=TG.nz;j++)for(let i=0;i<=TG.nx;i++){const x=gx(i),z=gz(j),k=gi(i,j);
    let h=7.2+7.5*sstep(26,-28,z);
    const bump=(cx,cz,r,a)=>{const d=Math.hypot(x-cx,z-cz)/r;return d<1?a*Math.pow(Math.cos(d*PI/2),2):0;};
    h+=bump(-22,-19,16,7.5)+bump(46,-22,14,7)+bump(-5,1,17,2.4)+bump(-46,6,13,1.8)+bump(-48,-20,11,3)+bump(10,-22,10,2.5);
    h+=.55*fbm3(x*.07,z*.07,3.1,3);
    const pd=pondD(x,z);if(pd<1.55){// a shelving bowl: a pebbly shallow rim, then down to just above the drainage layer; banks stand clear of the water
      const bk=beachK(x,z);const bowl=PWL+.7-6.6*Math.pow(sstep(1.04,lerp(.3,-.25,bk),pd),lerp(1.1,1.6,bk));const bank=PWL+lerp(.9,.45,bk)+.3*(1-bk)*fbm3(x*.2,z*.2,1,2);const out=lerp(bank,h,sstep(1.04,lerp(1.55,1.9,bk),pd));
      h=pd<1.04?Math.min(bowl,out):Math.max(Math.min(h,out),lerp(bank,h,sstep(1.1,1.55,pd)));}
    {const bk=beachK(x,z);if(bk>0&&pd>=1.04)h=lerp(h,PWL+.45+(pd-1.04)*1.6,bk*sstep(2.2,1.2,pd));}
    HF[k]=Math.max(h,pd<1.04?4.25:4.6);PM[k]=pd<1.08?1:0;
    // ground cover: warm sandy left, meadow middle, mossy right, gravel beach and path, litter under the trees
    const n=fbm3(x*.09,z*.09,7,3);const sand=sstep(-15,-24,x+n*6);const moss=sstep(9,16,x+n*7)*(1-sstep(.95,1.1,pd)*.0)+sstep(14,6,Math.hypot(x+22,z+19))*.6;
    const beach=sstep(.8,.95,pd)*sstep(1.18,1.02,pd)*sstep(-12,4,z-POND.cz);
    const path=sstep(2.4,1.2,Math.abs(x-(-10+Math.sin(z*.12)*5+(z<-8?(z+8)*-.55:0))))*sstep(-20,-16,z)*(1-sand);
    const gravel=clamp(beach+path,0,1);const meadow=(1-sand)*(1-clamp(moss,0,1));
    const bch=beachK(x,z)*sstep(.55,.85,pd);const keep=1-bch;
    COV.sand[k]=clamp(sand*(1-gravel)+bch,0,1);COV.gravel[k]=gravel*keep;COV.moss[k]=clamp(moss,0,1)*(1-gravel)*(pd<.98?0:1)*keep;
    COV.grass[k]=clamp(meadow*(1-gravel)*(.55+.45*sstep(-.1,.3,fbm3(x*.12,z*.12,2,2))),0,1)*keep;
    COV.clover[k]=clamp(meadow*(1-gravel)*sstep(.05,.3,fbm3(x*.1+5,z*.1,4,3)),0,1)*keep;
    COV.litter[k]=clamp(sstep(13,5,Math.hypot(x+22,z+19))*.8+sstep(10,4,Math.hypot(x-46,z+22))*.5,0,1)*(1-gravel);}}
// ---------- terrain mesh: grid plus a cut-away skirt along the front and both sides ----------
const TER={mesh:null,pos:null,nor:null,col:null,ext:null,dirty:true,skirtStart:0};
function terrainBuffers(){const NS=(TG.nx+1)*2*2+(TG.nz+1)*2*2;const n=NV+NS;
  TER.pos=new Float32Array(n*3);TER.nor=new Float32Array(n*3);TER.uv=new Float32Array(n*2);TER.col=new Float32Array(n*4);TER.ext=new Float32Array(n*4);const I=[];
  for(let j=0;j<TG.nz;j++)for(let i=0;i<TG.nx;i++){const a=gi(i,j),b=a+1,c=a+TG.nx+2,d=a+TG.nx+1;I.push(a,d,c,a,c,b);}
  TER.skirtStart=NV;let s=NV;const sk=(list)=>{const st=s;for(const[i,j]of list){s+=2;}for(let k=0;k<list.length-1;k++){const a=st+k*2,b=a+2;I.push(a,b,b+1,a,b+1,a+1);}return st;};
  TER.skirts=[];const front=[],left=[],right=[];for(let i=0;i<=TG.nx;i++)front.push([i,TG.nz]);for(let j=0;j<=TG.nz;j++){left.push([0,j]);right.push([TG.nx,TG.nz-j]);}
  for(const L of[front,left,right]){TER.skirts.push({st:sk(L),list:L});}
  TER.idx=I;TER.n=n;}
function terrainFill(){const P=TER.pos,N=TER.nor,C=TER.col,E=TER.ext,T=TER.uv;
  for(let j=0;j<=TG.nz;j++)for(let i=0;i<=TG.nx;i++){const k=gi(i,j);const x=gx(i),z=gz(j),h=HF[k];P[k*3]=x;P[k*3+1]=h;P[k*3+2]=z;
    const hl=HF[gi(Math.max(i-1,0),j)],hr=HF[gi(Math.min(i+1,TG.nx),j)],hd=HF[gi(i,Math.max(j-1,0))],hu=HF[gi(i,Math.min(j+1,TG.nz))];const n=V.norm([hl-hr,2*TG.dx,hd-hu]);N[k*3]=n[0];N[k*3+1]=n[1];N[k*3+2]=n[2];
    T[k*2]=x;T[k*2+1]=z;C[k*4]=COV.moss[k];C[k*4+1]=Math.max(COV.grass[k],COV.clover[k]*.8);C[k*4+2]=COV.sand[k];C[k*4+3]=COV.gravel[k];
    const pd=PM[k]?clamp((PWL+1.5-h)/2,0,1):0;E[k*4]=0;E[k*4+1]=clamp(pd+COV.moss[k]*.25,0,1);E[k*4+2]=COV.litter[k];E[k*4+3]=0;}
  for(const S of TER.skirts){const L=S.list;for(let q=0;q<L.length;q++){const[i,j]=L[q];const k=gi(i,j);const x=gx(i),z=gz(j);const v0=S.st+q*2;
    const nn=j===TG.nz&&i!==0&&i!==TG.nx?[0,0,1]:i===0?[-1,0,0]:i===TG.nx?[1,0,0]:[0,0,1];const px=x+nn[0]*.02,pz=z+nn[2]*.02;
    for(const[v,y]of[[v0,HF[k]],[v0+1,0]]){P[v*3]=px;P[v*3+1]=y;P[v*3+2]=pz;N[v*3]=nn[0];N[v*3+1]=nn[1];N[v*3+2]=nn[2];T[v*2]=x+z;T[v*2+1]=y;C[v*4]=C[v*4+1]=C[v*4+2]=C[v*4+3]=0;E[v*4]=1;E[v*4+1]=HF[k];E[v*4+2]=0;E[v*4+3]=0;}}}}
function buildTerrainMesh(){terrainBuffers();terrainFill();TER.mesh=mkMesh({pos:TER.pos,nor:TER.nor,uv:TER.uv,col:TER.col,ext:TER.ext,idx:TER.idx},true);TER.dirty=false;}
function updateTerrainMesh(){terrainFill();const m=TER.mesh;for(const[k,a]of[['aPos',TER.pos],['aNor',TER.nor],['aCol',TER.col],['aExt',TER.ext]]){gl.bindBuffer(gl.ARRAY_BUFFER,m.bufs[k]);gl.bufferSubData(gl.ARRAY_BUFFER,0,a);}TER.dirty=false;}
// ---------- pond mask texture: R = water here, G = depth / 16 ----------
const PONDTX={tex:null,data:new Uint8Array((TG.nx+1)*(TG.nz+1)*4),box:[0,0,1,1]};
function updatePondTex(){const D=PONDTX.data;let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;
  for(let j=0;j<=TG.nz;j++)for(let i=0;i<=TG.nx;i++){const k=gi(i,j);const w=PM[k]&&HF[k]<PWL;D[k*4]=w?255:0;D[k*4+1]=w?clamp((PWL-HF[k])/16*255,0,255):0;D[k*4+2]=0;D[k*4+3]=255;
    if(w){x0=Math.min(x0,gx(i));x1=Math.max(x1,gx(i));z0=Math.min(z0,gz(j));z1=Math.max(z1,gz(j));}}
  if(!PONDTX.tex)PONDTX.tex=mkTex(TG.nx+1,TG.nz+1,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,gl.LINEAR,gl.CLAMP_TO_EDGE,D);else{gl.bindTexture(gl.TEXTURE_2D,PONDTX.tex);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,TG.nx+1,TG.nz+1,gl.RGBA,gl.UNSIGNED_BYTE,D);}
  PONDTX.box=x0<x1?[x0-1,z0-1,x1+1,z1+1]:[0,0,.01,.01];if(typeof MESH!=='undefined'&&MESH.wwall){MESH.wwall=genWaterWall().mesh();}}
// ---------- cork background with a waterfall ledge ----------
const FALL={x:47,top:TK.h-9,w:2.6};
function bgDepth(x,y){// how far the background relief stands out from the back glass
  // vertical bark plates and fissures, then the waterfall shelf and a couple of low ledges
  const plate=Math.abs(fbm3(x*.09,y*.025,3,3));const fis=Math.pow(Math.abs(fbm3(x*.22,y*.05,9,2)),.6);
  let d=1.2+2.2*plate+1.4*fis+.8*fbm3(x*.04,y*.04,5,3);
  const led=(cx,cy,w,h,a)=>{const u=(x-cx)/w,v=(y-cy)/h;if(Math.abs(u)>1||v<-1||v>1)return 0;const top=v>0?Math.pow(1-v,.35):Math.pow(1+v,1.6);return a*Math.pow(1-u*u,.6)*top;};
  // the falls: a smooth worn channel down the bark, a spout block at the top
  const ch=Math.exp(-Math.pow((x-FALL.x)/(FALL.w*1.6),2))*sstep(FALL.top+2,FALL.top-1,y);d=lerp(d,2.2+.35*fbm3(x*.1,y*.06,2,2)+y*.012,ch*.85);
  d+=led(FALL.x,FALL.top+1.6,6.5,2.6,3.2);
  return d;}
// falls path: hugs the channel a few mm proud of the bark, from the spout down to the pond
function fallZ(y){return TK.iz0+bgDepth(FALL.x,y)+.45+.9*sstep(FALL.top,FALL.top-3,y)*sstep(FALL.top-9,FALL.top-3,y);}
function genBackground(){const mb=new MB();const nx=120,ny=74;
  grid(mb,nx,ny,(u,v)=>{const x=lerp(TK.ix0,TK.ix1,u),y=v*TK.h;return{p:[x,y,TK.iz0+bgDepth(x,y)],uv:[u,v],c:[1,1,1,1]};});mb.normals();
  for(let i=0;i<mb.n;i++){const d=mb.P[i*3+2]-TK.iz0;mb.C[i*4]=clamp(.45+d*.12,.4,1);}
  return mb;}
function genFallMesh(){const mb=new MB();const pts=[];const n=40;const yb=PWL-.3;for(let i=0;i<=n;i++){const y=lerp(FALL.top+.4,yb,i/n);pts.push([FALL.x+Math.sin(y*.21)*.35,y,fallZ(y)]);}
  FALL.lip=pts[0];FALL.impact=[FALL.x,PWL,fallZ(PWL)+.6];const nP=pts.length;
  for(let i=0;i<nP;i++){const t=i/(nP-1);const w=FALL.w*(.75+.35*t);const p=pts[i];for(let k=0;k<=8;k++){const u=k/8;mb.v([p[0]+(u-.5)*w*2,p[1],p[2]+Math.sin(u*PI)*.35],[0,.15,1],[u,t*3.2],[1,1,1,1]);}}
  for(let i=0;i<nP-1;i++)for(let k=0;k<8;k++){const a=i*9+k;mb.q(a,a+1,a+10,a+9);}mb.normals();return mb;}
// the window into the pond: strips on the inside of the right and front glass from the pond bed up to the water line
function genWaterWall(){const mb=new MB();const strip=(pts,n)=>{const st=mb.n;for(const[x,z]of pts){const h=Math.min(groundH(x,z),PWL);mb.v([x,h-.05,z],n,[x,z],[1,1,1,1]);mb.v([x,PWL+.02,z],n,[x,z],[1,1,1,1]);}
    for(let k=0;k<pts.length-1;k++){const a=st+k*2;mb.q(a,a+2,a+3,a+1);}};
  const R=[],F=[];for(let j=0;j<=TG.nz;j++){const z=gz(j);R.push([TK.ix1-.04,z]);}for(let i=0;i<=TG.nx;i++){const x=gx(i);F.push([x,TK.iz1-.04]);}
  strip(R,[1,0,0]);strip(F,[0,0,1]);return mb;}
// ---------- ground cover splats in 10 x 10 cm chunks ----------
const CH={nx:12,nz:6,list:[]};
function chunkBuild(ci,cj){const r=rng(9973+ci*131+cj*7);const sb=new SB(4000);const x0=TG.x0+ci*TG.w/CH.nx,z0=TG.z0+cj*TG.d/CH.nz,w=TG.w/CH.nx,d=TG.d/CH.nz;
  const mossP=[cs('#2c5a1a'),cs('#84b23c')],grassP=[cs('#2c5a19'),cs('#93bd4c')];
  const N=Math.round(w*d*COATK);
  // sheet moss: lobed daubs hugging the ground
  // cushions: the moss swells into mounds (a slow noise lifts it), darker and shaded low down, bright yellow-green on the crowns
  for(let k=0;k<N*34;k++){const x=x0+r()*w,z=z0+r()*d;const m=sampleArr(COV.moss,x,z);if(r()>m*m*1.2)continue;if(inPond(x,z))continue;const y=groundH(x,z);const n=groundN(x,z);
    const mound=clamp(.5+.9*fbm3(x*.33,z*.33,5,2),0,1)*m;const up=r();const c=cjit(cmix(mossP[0],mossP[1],clamp(.15+.55*up*mound+.3*fbm3(x*.4,z*.4,2,2)+(r()-.5)*.25,0,1)),r,.18);const s=.34+r()*.3;const t1=V.perp(n);
    sb.push([x,y+.12+up*mound*1.5,z],V.mul(t1,s),V.mul(V.cross(n,t1),s*.85),c,.55+.45*up,V.norm(V.add(n,[(r()-.5)*.7,0,(r()-.5)*.7])),.03,F_TRANS,0,0,SH_DAUB);}
  // grass blades
  for(let k=0;k<N*8;k++){const x=x0+r()*w,z=z0+r()*d;const g=sampleArr(COV.grass,x,z);if(r()>g)continue;if(inPond(x,z))continue;const y=groundH(x,z);const a=r()*TAU;
    blade(sb,[x,y-.1,z],[Math.cos(a)*.4,1,Math.sin(a)*.4],1.3+r()*2.4*g,.075+r()*.04,[cjit(grassP[0],r,.2),cjit(grassP[1],r,.2)],r,F_ANCHOR,1,3,.3);}
  // a low green fuzz under the meadow so soil never shows between the blades
  for(let k=0;k<N*10;k++){const x=x0+r()*w,z=z0+r()*d;const g=Math.max(sampleArr(COV.grass,x,z),sampleArr(COV.clover,x,z));if(r()>g*1.1)continue;if(inPond(x,z))continue;const y=groundH(x,z);const n=groundN(x,z);const s=.3+r()*.25;const t1=V.perp(n);
    sb.push([x,y+.1+r()*.25,z],V.mul(t1,s),V.mul(V.cross(n,t1),s*.8),cjit(cmix(grassP[0],grassP[1],r()*.6),r,.2),.6+.3*r(),V.norm(V.add(n,[(r()-.5)*.6,0,(r()-.5)*.6])),.05,F_TRANS,0,0,SH_DAUB);}
  // meadow flowers: daisies, buttercups and violets dotted through the clover
  const flw=[cs('#f4f1e6'),cs('#f2d24a'),cs('#b89af0'),cs('#f0a8c8')];
  for(let k=0;k<N*.5;k++){const x=x0+r()*w,z=z0+r()*d;const c=sampleArr(COV.clover,x,z)*.8+sampleArr(COV.grass,x,z)*.3;if(r()>c)continue;if(inPond(x,z))continue;const y=groundH(x,z);const hh=.7+r()*1.3;const col=flw[Math.floor(r()*flw.length)];
    blade(sb,[x,y-.05,z],[(r()-.5)*.3,1,(r()-.5)*.3],hh,.03,[grassP[0],grassP[1]],r,F_ANCHOR,1,2,.3);const fs=.16+r()*.1;
    for(let q=0;q<5;q++){const a=q/5*TAU+r();sb.push([x+Math.cos(a)*fs*.6,y+hh,z+Math.sin(a)*fs*.6],[Math.cos(a)*fs*.5,0,Math.sin(a)*fs*.5],[-Math.sin(a)*fs*.3,0,Math.cos(a)*fs*.3],col,1,[0,1,0],.3,0,0,0,SH_PETAL);}
    sb.push([x,y+hh+.02,z],[fs*.3,0,0],[0,0,fs*.3],cs('#e8b830'),1,[0,1,0],.3,0,0,0,SH_DOT);}
  // clover
  const pal=[cs('#356f25'),cs('#4c8a30'),cs('#5b7a2c')];
  for(let k=0;k<N*2.6;k++){const x=x0+r()*w,z=z0+r()*d;const c=sampleArr(COV.clover,x,z);if(r()>c)continue;if(inPond(x,z))continue;cloverLeaf(sb,r,[x,groundH(x,z)-.05,z],.5+r()*1.1,r()*TAU,.28+r()*.12,pal);}
  // leaf litter
  for(let k=0;k<N*1.2;k++){const x=x0+r()*w,z=z0+r()*d;const l=sampleArr(COV.litter,x,z);if(r()>l)continue;if(inPond(x,z))continue;litterLeaf(sb,r,[x,groundH(x,z),z],groundN(x,z));}
  // a few pebbles in the gravel and on the sand
  return sb;}
function chunkAt(x,z){return[clamp(Math.floor((x-TG.x0)/(TG.w/CH.nx)),0,CH.nx-1),clamp(Math.floor((z-TG.z0)/(TG.d/CH.nz)),0,CH.nz-1)];}
async function buildChunksStepped(step){for(let cj=0;cj<CH.nz;cj++){await step('Planting the moss');for(let ci=0;ci<CH.nx;ci++){const k=cj*CH.nx+ci;if(CH.list[k])splatFree(CH.list[k]);CH.list[k]=splatGPU(chunkBuild(ci,cj));}}}
function rebuildChunks(all,x,z,rad){for(let cj=0;cj<CH.nz;cj++)for(let ci=0;ci<CH.nx;ci++){const k=cj*CH.nx+ci;
  if(!all){const cx=TG.x0+(ci+.5)*TG.w/CH.nx,cz=TG.z0+(cj+.5)*TG.d/CH.nz;if(Math.abs(cx-x)>TG.w/CH.nx/2+rad||Math.abs(cz-z)>TG.d/CH.nz/2+rad)continue;}
  if(CH.list[k])splatFree(CH.list[k]);const sb=chunkBuild(ci,cj);CH.list[k]=splatGPU(sb);}}

// ---------- catalogue ----------
// part: {mesh, mat, v, tint, rough, glow}; geo: {parts, splats(SB), r, h, solid, perch[], lights[]}
const M_=(mb,mat,v=0,tint=[1,1,1],rough=.6,glow=0)=>({mb,mat,v,tint,rough,glow});
const CAT={
  moss:{name:'Cushion moss',tab:'plants',place:'ground',scale:1,morphs:['Bright','Deep','Golden'],gen:(s,m)=>{const g=genMossCushion(s,m);return{parts:[],sb:g.sb,r:g.r,h:g.h,wilts:1,perch:[]};}},
  grass:{name:'Meadow grass',tab:'plants',place:'ground',scale:1,morphs:['Green','Dry','Lush'],gen:(s,m)=>{const g=genGrass(s,m);return{parts:[],sb:g.sb,r:g.r,h:g.h,wilts:1};}},
  clover:{name:'Clover patch',tab:'plants',place:'ground',scale:1,morphs:['White flowers','Red flowers'],food:'clover',gen:(s,m)=>{const g=genClover(s,m);return{parts:[],sb:g.sb,r:g.r,h:g.h,wilts:1,blooms:1};}},
  foxglove:{name:'Foxglove',tab:'plants',place:'ground',scale:1,morphs:['Purple','White','Apricot'],nectar:1,gen:(s,m)=>{const g=genFoxglove(s,m);return{parts:[],sb:g.sb,r:g.r,h:g.h,wilts:1,blooms:1,perch:g.perch,flower:[0,g.h*.6,0]};}},
  bluebell:{name:'Bluebells',tab:'plants',place:'ground',scale:1,morphs:['Blue','White'],nectar:1,gen:(s,m)=>{const g=genBluebell(s,m);return{parts:[],sb:g.sb,r:g.r,h:g.h,wilts:1,blooms:1,flower:[0,g.h*.7,0]};}},
  forgetmenot:{name:'Forget-me-nots',tab:'plants',place:'ground',scale:1,morphs:['Blue','Pink'],nectar:1,gen:(s,m)=>{const g=genForgetMeNot(s,m);return{parts:[],sb:g.sb,r:g.r,h:g.h,wilts:1,blooms:1,flower:[0,g.h,0]};}},
  fern:{name:'Fern',tab:'plants',place:'ground',scale:1,morphs:['Sword fern','Golden fern'],gen:(s,m)=>{const g=genFern(s,m);return{parts:[],sb:g.sb,r:g.r,h:g.h,wilts:1};}},
  fittonia:{name:'Fittonia',tab:'plants',place:'ground',scale:1,morphs:['White vein','Pink vein'],gen:(s,m)=>{const g=genFittonia(s,m);return{parts:[],sb:g.sb,r:g.r,h:g.h,wilts:1};}},
  sundew:{name:'Sundew',tab:'plants',place:'ground',scale:1.4,morphs:['Red'],gen:(s)=>{const g=genSundew(s);return{parts:[],sb:g.sb,r:g.r,h:g.h,wilts:1};}},
  echeveria:{name:'Echeveria',tab:'plants',place:'ground',scale:1,morphs:['Blue-grey','Rose','Jade'],gen:(s,m)=>({parts:[M_(genEcheveria(s,m),18,1,[[.36,.48,.5],[.5,.38,.42],[.24,.42,.26]][m%3],.5)],r:2.2,h:2,solid:1})},
  haworthia:{name:'Haworthia',tab:'plants',place:'ground',scale:1,morphs:['Zebra'],gen:(s)=>({parts:[M_(genHaworthia(s),18,0,[.08,.2,.1],.5)],r:2,h:2.4,solid:1})},
  bonsai:{name:'Bonsai tree',tab:'plants',place:'ground',scale:1,morphs:['Juniper','Autumn maple'],gen:(s,m)=>{const t=genBonsaiTrunk(s);const sb=new SB(20000);const r=rng(s+1);
    const pal=m===1?[cs('#7a2a14'),cs('#e0782a')]:[cs('#25461a'),cs('#6c9a3a')];for(const p of t.pads)foliagePad(sb,r,p.c,p.R,pal);
    return{parts:[M_(t.mb,3,1)],sb,r:4,h:34,solid:1,wilts:1,perch:t.pads.map(p=>V.add(p.c,[0,p.R*.45,0])),canopy:t.pads};}},
  glowshroom:{name:'Glow mushrooms',tab:'plants',place:'ground',scale:1,morphs:['Teal','Violet','Amber'],gen:(s,m)=>({parts:[M_(genMushroomCluster(s,1),11,0,[[.2,.85,.75],[.6,.35,1],[1,.6,.2]][m%3],.5,1)],r:2,h:2.5,glowLight:[[.2,.85,.75],[.6,.35,1],[1,.6,.2]][m%3]})},
  toadstool:{name:'Toadstools',tab:'plants',place:'ground',scale:1,morphs:['Fly agaric','Brown cap'],gen:(s,m)=>({parts:[M_(genMushroomCluster(s,0),11,m===0?1:0,m===0?[.62,.06,.03]:[.42,.26,.14],.5,0)],r:2,h:3,perch:[[0,3.2,0]]})},
  rock:{name:'Granite rock',tab:'stone',place:'ground',scale:5,morphs:['Grey'],gen:(s)=>({parts:[M_(genRock(s,0),2,0)],r:1.1,h:.8,solid:1})},
  slate:{name:'Slate basking stack',tab:'stone',place:'ground',scale:5.5,morphs:['Dark slate'],gen:(s)=>({parts:[M_(genSlateStack(s),2,1)],r:1.6,h:1.4,solid:1,bask:1})},
  riverstone:{name:'River stone',tab:'stone',place:'ground',scale:3.5,morphs:['Pale'],gen:(s)=>({parts:[M_(genRock(s,2),2,2)],r:1.3,h:.65,solid:1})},
  emberrock:{name:'Ember rock',tab:'stone',place:'ground',scale:3.2,morphs:['Glowing'],gen:(s)=>({parts:[M_(genRock(s,3),2,3,[1,1,1],.6,1)],r:1.1,h:.8,solid:1,ember:1,glowLight:[1,.35,.08]})},
  driftwood:{name:'Driftwood branch',tab:'stone',place:'ground',scale:1,morphs:['Bleached'],gen:(s)=>{const d=genDriftwood(s);return{parts:[M_(d.mb,3,0)],r:14,h:10,solid:1,perch:d.perch};}},
  geode:{name:'Amethyst geode',tab:'stone',place:'ground',scale:1.6,morphs:['Amethyst'],gen:(s)=>({parts:[M_(genGeode(s),10,0,[1,1,1],.2,.25)],r:2.4,h:2.6,solid:1,shiny:1})},
  moonstone:{name:'Moonstone',tab:'stone',place:'ground',scale:1.4,morphs:['Blue sheen'],gen:(s)=>({parts:[M_(genMoonstone(s),17,0)],r:1.2,h:1.6,solid:1,shiny:1,glowLight:[.35,.55,1]})},
  arch:{name:'Stone arch ruin',tab:'builds',place:'ground',scale:1,morphs:['Mossy'],gen:(s)=>({parts:[M_(genArch(s),12,0)],r:6,h:13.5,solid:1,perch:[[0,13.6,0],[-4.2,10.6,0]]})},
  tower:{name:'Little tower',tab:'builds',place:'ground',scale:1,morphs:['Stone'],gen:(s)=>({parts:[M_(genTower(s),12,0)],r:3.6,h:20,solid:1,perch:[[0,20.1,0]]})},
  cottage:{name:'Mushroom cottage',tab:'builds',place:'ground',scale:1,morphs:['Red cap'],gen:(s)=>({parts:[M_(genCottage(s),13,0)],r:5.6,h:10,solid:1,home:'gnome',perch:[[0,10,0]],door:[0,0,4.2]})},
  lilypad:{name:'Lily pad',tab:'plants',place:'float',scale:1,morphs:['Green','Bronze'],gen:(s,m)=>({parts:[M_(genLilyPad(s),18,0,m?[.2,.16,.06]:[.06,.2,.05],.4)],r:1.6,h:.2})},
  eelgrass:{name:'Eelgrass',tab:'plants',place:'water',scale:1,morphs:['Green','Red'],gen:(s,m)=>{const g=genEelgrass(s,m);return{parts:[],sb:g.sb,r:g.r,h:g.h};}},
  shell:{name:'Scallop shell',tab:'builds',place:'water',scale:1.5,morphs:['Pearl'],gen:(s)=>({parts:[M_(genShell(s),16,0)],r:2.4,h:2,home:'mermaid'})},
  hoard:{name:'Dragon hoard',tab:'builds',place:'ground',scale:1,morphs:['Gold'],gen:(s)=>{const h=genHoard(s);return{parts:[M_(h.mb,14,0),M_(h.gem,10,0,[1,1,1],.1,.2)],r:2.4,h:1.4,solid:1,hoard:1,shiny:1};}},
  lantern:{name:'Lantern post',tab:'builds',place:'ground',scale:1,morphs:['Brass'],gen:(s)=>{const l=genLantern(s,true);return{parts:[M_(l.pole,21,0),M_(l.mb,14,0),M_(l.glass,15,0,[1,1,1],.2,1)],r:1,h:8,lantern:l.light,perch:[[.8,7.7,0]]};}},
  bridge:{name:'Plank bridge',tab:'builds',place:'ground',scale:1,morphs:['Oak'],gen:(s)=>({parts:[M_(genBridge(s),21,0)],r:5,h:3,solid:1})},
  egg:{name:'Dragon egg',tab:'builds',place:'ground',scale:1,morphs:['Ember','Moss','Frost'],gen:(s,m)=>({parts:[M_(genEgg(s),20,0,[[.75,.25,.12],[.25,.5,.2],[.6,.75,.9]][m%3],.4,0)],r:.8,h:2.2,solid:1,egg:1})},
};
const TABS=[['plants','Plants'],['stone','Stone & wood'],['builds','Builds']];
// ---------- items ----------
let items=[],nextId=1;
function itemY(it){const c=CAT[it.kind];const R=Math.max(.5,(it.geo?it.geo.r:1)*it.scale*.5);let h=1e9;
  for(let a=0;a<6;a++){const x=it.x+Math.cos(a)*R,z=it.z+Math.sin(a)*R;h=Math.min(h,c.place==='ground'&&!c.solidOn?groundH(x,z):groundH(x,z));}
  const base=Math.min(h,groundH(it.x,it.z));if(c.place==='float')return PWL+.04;return(c.place==='water'?groundH(it.x,it.z)-.3:base-.15)+(it.lift||0);}
// world box of an item: the rotated local box, never wider than its turning circle
function itemBox(it){const g=it.geo,a=g.bmin,b=g.bmax,s=it.scale,c=Math.abs(Math.cos(it.rot)),sn=Math.abs(Math.sin(it.rot));
  const cx=(a[0]+b[0])/2,cz=(a[2]+b[2])/2,hx=(b[0]-a[0])/2,hz=(b[2]-a[2])/2;const w=M4.xf(it.M,[cx,0,cz]);const R=Math.hypot(hx,hz)*s;
  const ex=Math.min((c*hx+sn*hz)*s,R),ez=Math.min((sn*hx+c*hz)*s,R);it.wmin=[w[0]-ex,it.y+a[1]*s,w[2]-ez];it.wmax=[w[0]+ex,it.y+b[1]*s,w[2]+ez];}
const KEEP_IN=true;
function updateItem(it){it.y=itemY(it);it.M=M4.trs([it.x,it.y,it.z],it.rot,it.scale);it.Nm=M4.nmat(it.M);itemBox(it);
  if(KEEP_IN){// slide the item inward until its whole footprint is inside the glass (and clear of the bark at the back)
    const m=.5,x0=TK.ix0+m,x1=TK.ix1-m,z0=TK.iz0+1.2,z1=TK.iz1-m;let dx=0,dz=0;
    if(it.wmax[0]-it.wmin[0]>x1-x0)dx=(x0+x1)/2-(it.wmin[0]+it.wmax[0])/2;else if(it.wmin[0]<x0)dx=x0-it.wmin[0];else if(it.wmax[0]>x1)dx=x1-it.wmax[0];
    if(it.wmax[2]-it.wmin[2]>z1-z0)dz=(z0+z1)/2-(it.wmin[2]+it.wmax[2])/2;else if(it.wmin[2]<z0)dz=z0-it.wmin[2];else if(it.wmax[2]>z1)dz=z1-it.wmax[2];
    if(dx||dz){it.x+=dx;it.z+=dz;it.moved=[dx,dz];it.y=itemY(it);it.M=M4.trs([it.x,it.y,it.z],it.rot,it.scale);it.Nm=M4.nmat(it.M);itemBox(it);}}
  it.lights=[];const g=it.geo;if(g.lantern)it.lights.push({p:M4.xf(it.M,g.lantern),c:[1,.6,.25],r:9,lantern:1});if(g.glowLight)it.lights.push({p:M4.xf(it.M,[0,g.h*.6,0]),c:g.glowLight,r:7,night:1});
  it.perch=(g.perch||[]).map(p=>M4.xf(it.M,p));if(g.flower)it.flower=M4.xf(it.M,g.flower);}
// local bounds of an item's meshes and splats: used to keep it inside the glass and to skip it when it is off screen
function geoBounds(g){const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
  for(const p of g.parts){const P=p.mb.P;for(let k=0;k<P.length;k+=3)for(let a=0;a<3;a++){const v=P[k+a];if(v<mn[a])mn[a]=v;if(v>mx[a])mx[a]=v;}}
  if(g.sb){const f=g.sb.f;for(let i=0;i<g.sb.n;i++){const o=i*12;for(let a=0;a<3;a++){const r=Math.abs(f[o+3+a])+Math.abs(f[o+6+a]),v=f[o+a];if(v-r<mn[a])mn[a]=v-r;if(v+r>mx[a])mx[a]=v+r;}}}
  if(mn[0]>mx[0]){mn.fill(-1);mx.fill(1);}g.bmin=mn;g.bmax=mx;}
function geoFor(it){const c=CAT[it.kind];const g=c.gen(it.seed,it.morph||0);geoBounds(g);for(const p of g.parts)p.mesh=p.mb.mesh();if(g.sb){g.splats=splatGPU(g.sb);g.splatN=g.sb.n;g.sb=null;}return g;}
function freeGeo(g){for(const p of g.parts){for(const k in p.mesh.bufs)gl.deleteBuffer(p.mesh.bufs[k]);gl.deleteVertexArray(p.mesh.vao);}if(g.splats)splatFree(g.splats);}
function addItem(kind,x,z,o={}){const c=CAT[kind];if(!c)return null;const it=Object.assign({id:nextId++,kind,x,z,rot:o.rot!==undefined?o.rot:Math.random()*TAU,scale:c.scale*(o.size||1),seed:o.seed||Math.floor(Math.random()*1e6),morph:o.morph||0,lift:o.lift||0,wilt:0,bloom:1,glow:0,lit:0},o);
  it.scale=c.scale*(o.size||1);it.geo=geoFor(it);updateItem(it);items.push(it);SOLID.dirty=true;return it;}
function removeItem(it){const i=items.indexOf(it);if(i<0)return;items.splice(i,1);freeGeo(it.geo);SOLID.dirty=true;}
function relayItems(){for(const it of items)updateItem(it);SOLID.dirty=true;}
// ---------- walkable height: ground plus the tops of solid things (1 cm grid) ----------
const SOLID={nx:120,nz:60,h:new Float32Array(121*61),dirty:true};
function rebuildSolid(){const S=SOLID;for(let j=0;j<=S.nz;j++)for(let i=0;i<=S.nx;i++){S.h[j*(S.nx+1)+i]=groundH(TG.x0+i*TG.w/S.nx,TG.z0+j*TG.d/S.nz);}
  for(const it of items){const g=it.geo;if(!g.solid)continue;for(const p of g.parts){const P=p.mb.P;for(let k=0;k<P.length;k+=9){const w=M4.xf(it.M,[P[k],P[k+1],P[k+2]]);
    const i=Math.round((w[0]-TG.x0)/TG.w*S.nx),j=Math.round((w[2]-TG.z0)/TG.d*S.nz);for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>S.nx||jj>S.nz)continue;const q=jj*(S.nx+1)+ii;if(w[1]>S.h[q])S.h[q]=w[1];}}}}
  S.dirty=false;}
function topH(x,z){if(STUDIO.on)return STUDIO.y;if(SOLID.dirty)rebuildSolid();const S=SOLID;const fx=clamp((x-TG.x0)/TG.w*S.nx,0,S.nx-1e-4),fz=clamp((z-TG.z0)/TG.d*S.nz,0,S.nz-1e-4);const i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j;const A=S.h,W=S.nx+1;
  return lerp(lerp(A[j*W+i],A[j*W+i+1],u),lerp(A[(j+1)*W+i],A[(j+1)*W+i+1],u),v);}
// ---------- greenery on the background: moss, creeping fig vines, small ferns near the falls ----------
function genBgGreenery(){const r=rng(4242);const sb=new SB(60000);const mossP=[cs('#2a4a18'),cs('#6a8f34')];const figP=[cs('#1f4a1c'),cs('#4f8a34')];const K=COATK;
  const surf=(x,y)=>[x,y,TK.iz0+bgDepth(x,y)];const nrmAt=(x,y)=>{const e=.5;const dx=bgDepth(x+e,y)-bgDepth(x-e,y),dy=bgDepth(x,y+e)-bgDepth(x,y-e);return V.norm([-dx/(2*e),-dy/(2*e),1]);};
  // moss: dense where it is damp (low, near the falls, in fissures)
  for(let k=0;k<56000*K;k++){const x=lerp(TK.ix0+.5,TK.ix1-.5,r()),y=r()*TK.h*.97;const damp=sstep(48,5,y)*.55+sstep(26,4,Math.hypot((x-FALL.x)*1.4,y-22))*.7+.5*sstep(.0,.42,fbm3(x*.06,y*.06,3,3))+sstep(15,40,x)*.2;
    if(r()>damp*damp*1.4)continue;if(y<topH(x,TK.iz0+3)-1)continue;const p=surf(x,y);const n=nrmAt(x,y);const s=.4+r()*.45;const t1=V.perp(n);const up=r();
    sb.push(V.madd(p,n,.12+up*.5),V.mul(t1,s),V.mul(V.cross(n,t1),s),cjit(cmix(mossP[0],mossP[1],clamp(up*.9+(r()-.5)*.2,0,1)),r,.2),.5+.5*up,V.norm(V.add(n,[(r()-.5)*.5,.3,(r()-.5)*.2])),0,F_TRANS,0,0,SH_DAUB);}
  // creeping fig: a few vines wandering up from the soil with small round leaves
  for(let v=0;v<24;v++){let x=lerp(TK.ix0+4,TK.ix1-4,r()),y=topH(x,TK.iz0+3)-1;let a=PI/2+(r()-.5)*.9;const L=12+r()*36;
    let side=1;for(let s=0;s<L;s+=.38){x+=Math.cos(a)*.38;y+=Math.sin(a)*.38;a+=(r()-.5)*.55+(PI/2-a)*.015;if(x<TK.ix0+1||x>TK.ix1-1||y>TK.h-3)break;
      if(r()<.25&&s>4){const b=a+(r()<.5?1:-1)*(.6+r()*.6);let bx=x,by=y;for(let t=0;t<4+r()*8;t+=.38){bx+=Math.cos(b)*.38;by+=Math.sin(b)*.38;const n=nrmAt(bx,by);leaf(sb,V.madd(surf(bx,by),n,.15),[Math.cos(b+1.1),Math.sin(b+1.1),.4],n,.46+r()*.2,.28,cjit(cmix(figP[0],figP[1],r()),r,.18),.85,F_TRANS,SH_PETAL,0);}}
      side=-side;const n=nrmAt(x,y);const lp=V.madd(surf(x+side*.22,y),n,.12);const d=V.norm([Math.cos(a+side*1.1),Math.sin(a+side*1.1),.4]);
      leaf(sb,lp,d,n,.5+r()*.22,.3,cjit(cmix(figP[0],figP[1],r()),r,.18),.85,F_TRANS,SH_PETAL,0);}}
  // small ferns around the waterfall shelf
  // ferns rooted in the bark: a cluster round the falls, more scattered across the wall, fronds arching out and down
  for(let f=0;f<20;f++){const nearF=f<9;const x=nearF?FALL.x+(r()<.5?-1:1)*(4+r()*10):lerp(TK.ix0+6,TK.ix1-6,r()),y=nearF?12+r()*(TK.h-24):14+r()*(TK.h-22);const base=surf(x,y);const n=nrmAt(x,y);const big=nearF?1.5:1+r()*.6;
   for(let k=0;k<8;k++){const a=k/8*TAU;let d=V.norm(V.add(V.mul(n,.7),[Math.cos(a),Math.sin(a)*.6-.2,0]));
    let p=base;for(let s=0;s<Math.round(7*big);s++){d=V.norm(V.add(d,[0,-.07,.02]));const q=V.madd(p,d,.5);const sd=V.norm(V.cross(d,n));const ll=.75*big*(1-s/(8*big));leaf(sb,q,V.add(V.mul(sd,1),V.mul(d,.5)),n,ll,.24,cjit(cmix(figP[0],figP[1],.5+.5*r()),r,.2),.8,F_TRANS,SH_PETAL,.2);leaf(sb,q,V.add(V.mul(sd,-1),V.mul(d,.5)),n,ll,.24,cjit(cmix(figP[0],figP[1],.5+.5*r()),r,.2),.8,F_TRANS,SH_PETAL,.2);p=V.madd(p,d,.5);}}}
  return sb;}
