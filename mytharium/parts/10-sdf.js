
// ============================================================
//  GEOMETRY · signed-distance creatures, surface nets, skinning, splat records
// ============================================================
// ---------- splat buffer: 48-byte records (see 04-shsplat) ----------
class SB{
  constructor(cap=1024){this.buf=new ArrayBuffer(cap*48);this.f=new Float32Array(this.buf);this.u8=new Uint8Array(this.buf);this.i8=new Int8Array(this.buf);this.n=0;this.cap=cap;}
  grow(){const nb=new ArrayBuffer(this.cap*2*48);new Uint8Array(nb).set(this.u8);this.buf=nb;this.f=new Float32Array(nb);this.u8=new Uint8Array(nb);this.i8=new Int8Array(nb);this.cap*=2;}
  // p centre, u and v half-axes, col sRGB 0..1 (+ao), n normal, sway -1..1, ext 4 bytes
  push(p,u,v,col,ao,n,sway,e0,e1,e2,e3){if(this.n>=this.cap)this.grow();const o=this.n*12,f=this.f;
    f[o]=p[0];f[o+1]=p[1];f[o+2]=p[2];f[o+3]=u[0];f[o+4]=u[1];f[o+5]=u[2];f[o+6]=v[0];f[o+7]=v[1];f[o+8]=v[2];
    const b=this.n*48+36,U8=this.u8,I8=this.i8;U8[b]=clamp(col[0]*255,0,255);U8[b+1]=clamp(col[1]*255,0,255);U8[b+2]=clamp(col[2]*255,0,255);U8[b+3]=clamp(ao*255,0,255);
    I8[b+4]=clamp(Math.round(n[0]*127),-127,127);I8[b+5]=clamp(Math.round(n[1]*127),-127,127);I8[b+6]=clamp(Math.round(n[2]*127),-127,127);I8[b+7]=clamp(Math.round(sway*127),-127,127);
    U8[b+8]=e0&255;U8[b+9]=e1&255;U8[b+10]=e2&255;U8[b+11]=e3&255;this.n++;}
  append(o){while(this.n+o.n>this.cap)this.grow();this.u8.set(o.u8.subarray(0,o.n*48),this.n*48);this.n+=o.n;}
}
const QUADBUF=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,QUADBUF);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
const SLOC={sC:0,sP:1,sU:2,sV:3,sCol:4,sNor:5,sExt:6,pA:1,pB:2,pC:3};
for(const k in SLOC)ATTR[k]=SLOC[k];
// upload a splat buffer; returns a drawable {vao,n,buf}
function splatGPU(sb,dynamicCap){const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,QUADBUF);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(0,0);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
  if(dynamicCap)gl.bufferData(gl.ARRAY_BUFFER,dynamicCap*48,gl.DYNAMIC_DRAW);else gl.bufferData(gl.ARRAY_BUFFER,sb.u8.subarray(0,Math.max(1,sb.n)*48),gl.STATIC_DRAW);
  const fl=(l,off)=>{gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,3,gl.FLOAT,false,48,off);gl.vertexAttribDivisor(l,1);};
  fl(1,0);fl(2,12);fl(3,24);
  gl.enableVertexAttribArray(4);gl.vertexAttribPointer(4,4,gl.UNSIGNED_BYTE,true,48,36);gl.vertexAttribDivisor(4,1);
  gl.enableVertexAttribArray(5);gl.vertexAttribPointer(5,4,gl.BYTE,true,48,40);gl.vertexAttribDivisor(5,1);
  gl.enableVertexAttribArray(6);gl.vertexAttribPointer(6,4,gl.UNSIGNED_BYTE,false,48,44);gl.vertexAttribDivisor(6,1);
  gl.bindVertexArray(null);return{vao,n:sb?sb.n:0,buf:b,cap:dynamicCap||0};}
function splatFree(g){if(!g)return;gl.deleteBuffer(g.buf);gl.deleteVertexArray(g.vao);}
function drawSplats(g,n){const c=n===undefined?g.n:n;if(!c)return;gl.bindVertexArray(g.vao);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,c);STATS.draws++;STATS.splats+=c;}

// ---------- signed distance primitives ----------
// ellipsoid {t:'e',c,r,R?}, round cone {t:'c',a,b,ra,rb}; every primitive names a bone, a region and its blend radius k.
// prepPrims() precomputes constants and bounding boxes so evaluation is scalar and allocation free.
function prepPrims(prims){if(prims._prep)return prims._prep;const out=[];
  for(const q of prims){const o={q,s:q.op==='s',k:q.k||0.05,t:q.t};
    if(q.t==='e'){o.cx=q.c[0];o.cy=q.c[1];o.cz=q.c[2];o.rx=q.r[0];o.ry=q.r[1];o.rz=q.r[2];o.R=q.R||null;}
    else{o.ax=q.a[0];o.ay=q.a[1];o.az=q.a[2];o.bx=q.b[0]-q.a[0];o.by=q.b[1]-q.a[1];o.bz=q.b[2]-q.a[2];o.l2=o.bx*o.bx+o.by*o.by+o.bz*o.bz;o.r1=q.ra;o.r2=q.rb;o.rr=q.ra-q.rb;o.a2=o.l2-o.rr*o.rr;o.il2=1/o.l2;}
    const bb=primBox(q);o.mnx=bb.mn[0];o.mny=bb.mn[1];o.mnz=bb.mn[2];o.mxx=bb.mx[0];o.mxy=bb.mx[1];o.mxz=bb.mx[2];out.push(o);}
  prims._prep=out;return out;}
function sdQ(o,px,py,pz){if(o.t==='e'){let x=px-o.cx,y=py-o.cy,z=pz-o.cz;const R=o.R;if(R){const X=R[0]*x+R[3]*y+R[6]*z,Y=R[1]*x+R[4]*y+R[7]*z,Z=R[2]*x+R[5]*y+R[8]*z;x=X;y=Y;z=Z;}
    const ax=x/o.rx,ay=y/o.ry,az=z/o.rz,k0=Math.sqrt(ax*ax+ay*ay+az*az),bx=ax/o.rx,by=ay/o.ry,bz=az/o.rz,k1=Math.sqrt(bx*bx+by*by+bz*bz);return k1<1e-9?-Math.min(o.rx,o.ry,o.rz):k0*(k0-1)/k1;}
  const pax=px-o.ax,pay=py-o.ay,paz=pz-o.az,l2=o.l2,y=pax*o.bx+pay*o.by+paz*o.bz,z=y-l2;
  const xx=pax*l2-o.bx*y,xy=pay*l2-o.by*y,xz=paz*l2-o.bz*y,x2=xx*xx+xy*xy+xz*xz,y2=y*y*l2,z2=z*z*l2,rr=o.rr;
  const k=Math.sign(rr)*rr*rr*x2;
  if(Math.sign(z)*o.a2*z2>k)return Math.sqrt(x2+z2)*o.il2-o.r2;
  if(Math.sign(y)*o.a2*y2<k)return Math.sqrt(x2+y2)*o.il2-o.r1;
  return(Math.sqrt(x2*o.a2*o.il2)+y*rr)*o.il2-o.r1;}
function sdPrim(p,q){return sdQ(prepPrims([q])[0],p[0],p[1],p[2]);}
function primBox(q){if(q.t==='e'){const m=Math.max(...q.r);return{mn:V.sub(q.c,[m,m,m]),mx:V.add(q.c,[m,m,m])};}
  const m=Math.max(q.ra,q.rb);return{mn:[Math.min(q.a[0],q.b[0])-m,Math.min(q.a[1],q.b[1])-m,Math.min(q.a[2],q.b[2])-m],mx:[Math.max(q.a[0],q.b[0])+m,Math.max(q.a[1],q.b[1])+m,Math.max(q.a[2],q.b[2])+m]};}
// field: ordered smooth union / subtraction; op 's' subtracts. A primitive whose box lies farther than d + k cannot change d.
function sdfE(PR,px,py,pz){let d=1e9;for(let i=0;i<PR.length;i++){const o=PR[i];
    const dx=Math.max(o.mnx-px,0,px-o.mxx),dy=Math.max(o.mny-py,0,py-o.mxy),dz=Math.max(o.mnz-pz,0,pz-o.mxz);const lb=Math.sqrt(dx*dx+dy*dy+dz*dz)*0.85;
    if(o.s){if(lb>o.k)continue;const di=sdQ(o,px,py,pz),k=o.k;const h=clamp(0.5-0.5*(d+di)/k,0,1);d=d+(-di-d)*h+k*h*(1-h);}
    else{if(d<1e8&&lb>=d+o.k)continue;const di=sdQ(o,px,py,pz);if(d>=1e8){d=di;continue;}const k=o.k;const h=clamp(0.5+0.5*(di-d)/k,0,1);d=di+(d-di)*h-k*h*(1-h);}}
  return d;}
function sdfEval(prims,p){return sdfE(prepPrims(prims),p[0],p[1],p[2]);}
// tetrahedral gradient: four evaluations
function sdfG(PR,px,py,pz,e){const a=sdfE(PR,px+e,py-e,pz-e),b=sdfE(PR,px-e,py-e,pz+e),c=sdfE(PR,px-e,py+e,pz-e),d=sdfE(PR,px+e,py+e,pz+e);
  const gx=a-b-c+d,gy=-a-b+c+d,gz=-a+b-c+d,l=Math.sqrt(gx*gx+gy*gy+gz*gz)||1;return[gx/l,gy/l,gz/l];}
function sdfGrad(prims,p,e){return sdfG(prepPrims(prims),p[0],p[1],p[2],e);}

// ---------- surface nets mesher with a narrow band ----------
function surfaceNets(prims,h){const PR=prepPrims(prims);
  let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(const q of prims){if(q.op==='s')continue;const b=primBox(q);for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],b.mn[k]);mx[k]=Math.max(mx[k],b.mx[k]);}}
  mn=V.sub(mn,[h*3,h*3,h*3]);mx=V.add(mx,[h*3,h*3,h*3]);
  const nx=Math.ceil((mx[0]-mn[0])/h)+1,ny=Math.ceil((mx[1]-mn[1])/h)+1,nz=Math.ceil((mx[2]-mn[2])/h)+1;
  const F=new Float32Array(nx*ny*nz);const B=4;
  const idx=(i,j,k)=>(k*ny+j)*nx+i;
  for(let bk=0;bk<nz;bk+=B)for(let bj=0;bj<ny;bj+=B)for(let bi=0;bi<nx;bi+=B){
    const dc=sdfE(PR,mn[0]+(bi+B/2)*h,mn[1]+(bj+B/2)*h,mn[2]+(bk+B/2)*h);const far=Math.abs(dc)>B*h*1.2;
    for(let k=bk;k<Math.min(bk+B+1,nz);k++)for(let j=bj;j<Math.min(bj+B+1,ny);j++)for(let i=bi;i<Math.min(bi+B+1,nx);i++){const id=idx(i,j,k);
      if(far){if(F[id]===0)F[id]=dc>0?1e3:-1e3;}else if(F[id]===0||Math.abs(F[id])>=1e3)F[id]=sdfE(PR,mn[0]+i*h,mn[1]+j*h,mn[2]+k*h)||1e-7;}}
  const P=[],cell=new Int32Array((nx-1)*(ny-1)*(nz-1)).fill(-1);const cid=(i,j,k)=>(k*(ny-1)+j)*(nx-1)+i;
  const E=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  const CO=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]];const v=new Float32Array(8);
  for(let k=0;k<nz-1;k++)for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){let m=0;
    for(let c=0;c<8;c++){v[c]=F[idx(i+CO[c][0],j+CO[c][1],k+CO[c][2])];if(v[c]<0)m|=1<<c;}
    if(m===0||m===255)continue;let sx=0,sy=0,sz=0,cnt=0;
    for(const[a,b]of E){if((v[a]<0)!==(v[b]<0)){const t=v[a]/(v[a]-v[b]);sx+=CO[a][0]+(CO[b][0]-CO[a][0])*t;sy+=CO[a][1]+(CO[b][1]-CO[a][1])*t;sz+=CO[a][2]+(CO[b][2]-CO[a][2])*t;cnt++;}}
    cell[cid(i,j,k)]=P.length/3;P.push(mn[0]+(i+sx/cnt)*h,mn[1]+(j+sy/cnt)*h,mn[2]+(k+sz/cnt)*h);}
  const I=[];
  for(let k=1;k<nz-1;k++)for(let j=1;j<ny-1;j++)for(let i=1;i<nx-1;i++){const f0=F[idx(i,j,k)]<0;
    if(i<nx-1&&(F[idx(i+1,j,k)]<0)!==f0){const a=cell[cid(i,j-1,k-1)],b=cell[cid(i,j,k-1)],c=cell[cid(i,j,k)],d=cell[cid(i,j-1,k)];if(a>=0&&b>=0&&c>=0&&d>=0){if(f0)I.push(a,b,c,a,c,d);else I.push(a,c,b,a,d,c);}}
    if(j<ny-1&&(F[idx(i,j+1,k)]<0)!==f0){const a=cell[cid(i-1,j,k-1)],b=cell[cid(i,j,k-1)],c=cell[cid(i,j,k)],d=cell[cid(i-1,j,k)];if(a>=0&&b>=0&&c>=0&&d>=0){if(f0)I.push(a,c,b,a,d,c);else I.push(a,b,c,a,c,d);}}
    if(k<nz-1&&(F[idx(i,j,k+1)]<0)!==f0){const a=cell[cid(i-1,j-1,k)],b=cell[cid(i,j-1,k)],c=cell[cid(i,j,k)],d=cell[cid(i-1,j,k)];if(a>=0&&b>=0&&c>=0&&d>=0){if(f0)I.push(a,b,c,a,c,d);else I.push(a,c,b,a,d,c);}}}
  // pull each vertex onto the surface and take the normal from the field gradient
  const N=new Float32Array(P.length);
  for(let n=0;n<P.length;n+=3){let x=P[n],y=P[n+1],z=P[n+2];const d=sdfE(PR,x,y,z);let g=sdfG(PR,x,y,z,h*0.3);x-=g[0]*d;y-=g[1]*d;z-=g[2]*d;
    g=sdfG(PR,x,y,z,h*0.4);P[n]=x;P[n+1]=y;P[n+2]=z;N[n]=g[0];N[n+1]=g[1];N[n+2]=g[2];}
  return{P,N,I};}

// ---------- creature build: mesh + per-vertex bones, regions and pattern coords ----------
// def: {prims, bones:[{n,p,head}], sigma, cell, uvf(p,reg)->[u,v], colf(p,reg)->[shade,mix,accent]}
// a creature body in three stages (surface, skin weights, shading) so start-up can breathe between them
function cmNets(def){return surfaceNets(def.prims,def.cell);}
function cmSkin(def,sn){const mb=new MB();const nv=sn.P.length/3;
  const sig=def.sigma||0.2;const nb=def.bones.length;const PR=prepPrims(def.prims);const wts=new Float32Array(nb);
  for(let i=0;i<nv;i++){const p=[sn.P[i*3],sn.P[i*3+1],sn.P[i*3+2]],n=[sn.N[i*3],sn.N[i*3+1],sn.N[i*3+2]];wts.fill(0);let best=1e9,reg=0,bp=null;
    for(const o of PR){if(o.s)continue;const q=o.q;const d=sdQ(o,p[0],p[1],p[2]);if(d>sig*6)continue;const w=Math.exp(-Math.max(d,0)/(q.sig||sig));wts[q.bone]+=w;const dd=d-(q.pri||0);if(dd<best){best=dd;reg=q.reg||0;bp=q;}}
    // only the bone that owns this bit of surface and its neighbours in the skeleton may move it: a hand resting by the hip must not drag the hip
    if(bp){const ob=bp.bone,B=def.bones;for(let b=0;b<nb;b++)if(b!==ob&&B[b].p!==ob&&B[ob].p!==b)wts[b]=0;}
    let b0=0,b1=0;for(let b=0;b<nb;b++){if(wts[b]>wts[b0])b0=b;}b1=b0;let w1=-1;for(let b=0;b<nb;b++){if(b!==b0&&wts[b]>w1){w1=wts[b];b1=b;}}
    const s=wts[b0]+Math.max(w1,0);const w0=s>0?wts[b0]/s:1;
    if(def.regf)reg=def.regf(p,reg,n);const uv=def.uvf?def.uvf(p,reg,n):[p[0],p[1]];const cc=def.colf?def.colf(p,reg,n,bp):[0.5,0,0];
    mb.v(p,n,uv,[cc[0],cc[1],cc[2],cc[3]===undefined?1:cc[3]],[b0,b1,w0,reg]);}
  mb.I=Array.from(sn.I);
  // eyes: glossy spheres with the iris facing outward
  for(const e of def.eyes||[])eyeSphere(mb,e.c,e.r,e.dir,e.bone);
  for(const x of def.extra||[])x(mb);
  // make every triangle face the way its field normal points
  for(let t=0;t<mb.I.length;t+=3){const a=mb.I[t],b=mb.I[t+1],c=mb.I[t+2];const P=mb.P,Nn=mb.N;
    const e1=[P[b*3]-P[a*3],P[b*3+1]-P[a*3+1],P[b*3+2]-P[a*3+2]],e2=[P[c*3]-P[a*3],P[c*3+1]-P[a*3+1],P[c*3+2]-P[a*3+2]];const fn=V.cross(e1,e2);
    const vn=[Nn[a*3]+Nn[b*3]+Nn[c*3],Nn[a*3+1]+Nn[b*3+1]+Nn[c*3+1],Nn[a*3+2]+Nn[b*3+2]+Nn[c*3+2]];if(V.dot(fn,vn)<0){mb.I[t+1]=c;mb.I[t+2]=b;}}
  return mb;}
function cmShade(def,mb,t0){ambientOcclusionVerts(mb,def);LOG('creature',def.name,'verts',mb.n,'tris',mb.I.length/3,'in',Math.round(performance.now()-t0),'ms');return mb;}
function buildCreatureMesh(def){const t0=performance.now();return cmShade(def,cmSkin(def,cmNets(def)),t0);}
async function buildCreatureMeshStepped(def,step,label){const t0=performance.now();const sn=cmNets(def);await step(label);const mb=cmSkin(def,sn);await step(label);return cmShade(def,mb,t0);}
function eyeSphere(mb,c,r,dir,bone){const base=mb.n,nu=14,nv=10;const d=V.norm(dir);const t=Math.abs(d[1])<.95?V.norm(V.cross([0,1,0],d)):V.perp(d),b=V.cross(d,t);
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const th=j/nv*PI,ph=i/nu*TAU;const n=V.add(V.add(V.mul(d,Math.cos(th)),V.mul(t,Math.sin(th)*Math.cos(ph))),V.mul(b,Math.sin(th)*Math.sin(ph)));
    const uv=[0.5+0.5*Math.sin(th)*Math.cos(ph)*(th<PI/2?1:1),0.5+0.5*Math.sin(th)*Math.sin(ph)];const uvv=th<PI/2?uv:[0.98,0.98];
    mb.v(V.madd(c,n,r),n,uvv,[c[0],c[1],c[2],1],[bone,bone,1,3]);}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=base+j*(nu+1)+i;mb.q(a,a+1,a+nu+2,a+nu+1);}}
// cheap AO: count how much of the body lies within a few cm along the normal hemisphere (sampled from the SDF)
function ambientOcclusionVerts(mb,def){const R=def.aoR||def.cell*6;const PR=prepPrims(def.prims);for(let i=0;i<mb.n;i++){if(mb.E[i*4+3]===3)continue;const p=[mb.P[i*3],mb.P[i*3+1],mb.P[i*3+2]],n=[mb.N[i*3],mb.N[i*3+1],mb.N[i*3+2]];
  let o=0;for(let s=1;s<=3;s++){const t=R*s/3;const d=sdfE(PR,p[0]+n[0]*t,p[1]+n[1]*t,p[2]+n[2]*t);o+=Math.max(0,t-d)/t;}mb.C[i*4+3]=clamp(1-o/3*0.9,0.25,1);}}

// ---------- rig: forward kinematics over a bone tree, bind frames axis aligned ----------
// bones: [{n:name, p:parentIndex, h:[bind head]}]; pose.R[i] local rotation (3x3); root transform pos, rot (3x3), scale
function fk(bones,R,rootPos,rootRot,s,out){const n=bones.length;const W=out.W||(out.W=new Array(n)),Hd=out.H||(out.H=new Array(n));
  for(let i=0;i<n;i++){const b=bones[i];const Rl=R[i]||M3.id();
    if(b.p<0){W[i]=M3.mul(rootRot,Rl);Hd[i]=V.add(rootPos,V.mul(M3.ap(rootRot,b.h),s));}
    else{const P=bones[b.p];W[i]=M3.mul(W[b.p],Rl);Hd[i]=V.add(Hd[b.p],V.mul(M3.ap(W[b.p],V.sub(b.h,P.h)),s));}}
  const M=out.M||(out.M=new Float32Array(24*16));
  for(let i=0;i<n;i++){const w=W[i];const t=V.sub(Hd[i],V.mul(M3.ap(w,bones[i].h),s));const o=i*16;
    M[o]=w[0]*s;M[o+1]=w[1]*s;M[o+2]=w[2]*s;M[o+3]=0;M[o+4]=w[3]*s;M[o+5]=w[4]*s;M[o+6]=w[5]*s;M[o+7]=0;M[o+8]=w[6]*s;M[o+9]=w[7]*s;M[o+10]=w[8]*s;M[o+11]=0;M[o+12]=t[0];M[o+13]=t[1];M[o+14]=t[2];M[o+15]=1;}
  return out;}
// world position of a bind-space point carried by bone i
function boneXf(out,i,bones,p,s){return V.add(out.H[i],V.mul(M3.ap(out.W[i],V.sub(p,bones[i].h)),s));}
// two-bone IK: rotate a (hip) and b (knee) so the chain hip->knee->foot reaches target; returns local rotations in parent frame
// works in world space: returns world rotations for the upper and lower segment
function ik2(hip,l1,l2,target,pole){let d=V.sub(target,hip);let L=V.len(d);const maxL=(l1+l2)*0.999;if(L>maxL){d=V.mul(d,maxL/L);L=maxL;}if(L<Math.abs(l1-l2)+1e-3){L=Math.abs(l1-l2)+1e-3;}
  const dir=V.norm(d);const ca=clamp((l1*l1+L*L-l2*l2)/(2*l1*L),-1,1);const a=Math.acos(ca);
  let pl=V.sub(pole,V.mul(dir,V.dot(pole,dir)));if(V.len(pl)<1e-5)pl=V.perp(dir);pl=V.norm(pl);
  const u1=V.add(V.mul(dir,Math.cos(a)),V.mul(pl,Math.sin(a)));const knee=V.madd(hip,u1,l1);const u2=V.norm(V.sub(V.add(hip,d),knee));return{u1,u2,knee};}

// ---------- coat sampling: area-weighted points over the mesh triangles of chosen regions ----------
function sampleSurface(mb,regions,density,rnd,cb){const P=mb.P,I=mb.I,E=mb.E,Nn=mb.N;
  for(let t=0;t<I.length;t+=3){const a=I[t],b=I[t+1],c=I[t+2];const reg=E[a*4+3];if(!regions.includes(reg))continue;
    const pa=[P[a*3],P[a*3+1],P[a*3+2]],pb=[P[b*3],P[b*3+1],P[b*3+2]],pc=[P[c*3],P[c*3+1],P[c*3+2]];
    const area=0.5*V.len(V.cross(V.sub(pb,pa),V.sub(pc,pa)));let cnt=area*density;let n=Math.floor(cnt);if(rnd()<cnt-n)n++;
    for(let k=0;k<n;k++){let u=rnd(),v=rnd();if(u+v>1){u=1-u;v=1-v;}const w=1-u-v;const p=[pa[0]*w+pb[0]*u+pc[0]*v,pa[1]*w+pb[1]*u+pc[1]*v,pa[2]*w+pb[2]*u+pc[2]*v];
      const nn=V.norm([Nn[a*3]*w+Nn[b*3]*u+Nn[c*3]*v,Nn[a*3+1]*w+Nn[b*3+1]*u+Nn[c*3+1]*v,Nn[a*3+2]*w+Nn[b*3+2]*u+Nn[c*3+2]*v]);
      const vi=w>=u&&w>=v?a:u>=v?b:c;cb(p,nn,E[vi*4],E[vi*4+1],E[vi*4+2],mb.C[vi*4+3]);}}}
// fur splat: lies along the flow direction, lifted slightly off the skin
function furSplat(sb,p,n,flow,len,wid,col,ao,b0,b1,w0,lift=0.35,shape=2,hang=0){
  let f=V.sub(flow,V.mul(n,V.dot(flow,n)));if(V.len(f)<1e-4)f=V.perp(n);f=V.norm(f);const fo=V.norm(V.add(f,V.mul(n,lift)));const side=V.norm(V.cross(n,f));
  sb.push(V.madd(p,fo,len*0.85),V.mul(side,wid),V.mul(fo,len),col,ao,n,hang,b0,b1,Math.round(w0*255),shape<<4);}
// strand of hair: a chain of splats along a polyline (bind space), hang grows toward the tip
function strand(sb,pts,wid,colf,b0,b1,w0,hang0,hang1,shape=2){for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];const t=i/(pts.length-1);const d=V.sub(b,a);const L=V.len(d);if(L<1e-5)continue;
  const dir=V.mul(d,1/L);const side=V.norm(V.cross(dir,Math.abs(dir[1])<0.95?[0,1,0]:[1,0,0]));const n=V.norm(V.cross(side,dir));const w=wid*(1-t*0.55);
  const c=colf(t);sb.push(V.lerp(a,b,0.5),V.mul(side,w),V.mul(dir,L*0.62),c,c[3]===undefined?1:c[3],n,lerp(hang0,hang1,t),b0,b1,Math.round(w0*255),shape<<4);}}
