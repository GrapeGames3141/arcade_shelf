// ============================================================
//  Reef Aquarium (saltaquarium) — single-file WebGL2 reef tank, built from Axolotl Aquarium
//  Sections: core · shaders · geometry · world · life · render · ui
// ============================================================
const Q=new URLSearchParams(location.search);
const TEST=Q.has('test');
if(TEST){const _r=rng0(+(Q.get('seed')||1));Math.random=_r;}
function rng0(seed){let a=(seed>>>0)||1;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const LOG=(...a)=>console.log('[SA]',...a);
const ERRS=[];
function fatal(msg){ERRS.push(String(msg));console.error('[SA] '+msg);const e=document.getElementById('err');if(e){e.classList.remove('hidden');e.textContent=String(msg);}}
window.addEventListener('error',ev=>{ERRS.push(String(ev.message));console.error('[SA] error: '+ev.message+' @'+ev.lineno);});

// ---------- math ----------
const PI=Math.PI,TAU=PI*2;
const clamp=(x,a,b)=>x<a?a:(x>b?b:x);
const lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const angDiff=(a,b)=>{let d=b-a;while(d>PI)d-=TAU;while(d<-PI)d+=TAU;return d;};
function rng(seed){let a=(seed>>>0)||1;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
const V={
  add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
  sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
  madd:(a,b,s)=>[a[0]+b[0]*s,a[1]+b[1]*s,a[2]+b[2]*s],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  len:a=>Math.hypot(a[0],a[1],a[2]),
  norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];},
  lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],
  dist:(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),
  rotY:(a,g)=>{const c=Math.cos(g),s=Math.sin(g);return[a[0]*c+a[2]*s,a[1],-a[0]*s+a[2]*c];},
  rot:(v,k,g)=>{const c=Math.cos(g),s=Math.sin(g),kv=V.cross(k,v),kd=V.dot(k,v)*(1-c);return[v[0]*c+kv[0]*s+k[0]*kd,v[1]*c+kv[1]*s+k[1]*kd,v[2]*c+kv[2]*s+k[2]*kd];},
  perp:a=>{const t=Math.abs(a[1])<0.9?[0,1,0]:[1,0,0];return V.norm(V.cross(a,t));},
};
const M4={
  id(){const m=new Float32Array(16);m[0]=m[5]=m[10]=m[15]=1;return m;},
  mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];}return o;},
  persp(fy,asp,n,f){const t=1/Math.tan(fy/2),m=new Float32Array(16);m[0]=t/asp;m[5]=t;m[10]=(f+n)/(n-f);m[11]=-1;m[14]=2*f*n/(n-f);return m;},
  ortho(l,r,b,t,n,f){const m=new Float32Array(16);m[0]=2/(r-l);m[5]=2/(t-b);m[10]=-2/(f-n);m[12]=-(r+l)/(r-l);m[13]=-(t+b)/(t-b);m[14]=-(f+n)/(f-n);m[15]=1;return m;},
  lookAt(e,c,up){const z=V.norm(V.sub(e,c)),x=V.norm(V.cross(up,z)),y=V.cross(z,x),m=new Float32Array(16);
    m[0]=x[0];m[4]=x[1];m[8]=x[2];m[1]=y[0];m[5]=y[1];m[9]=y[2];m[2]=z[0];m[6]=z[1];m[10]=z[2];
    m[12]=-V.dot(x,e);m[13]=-V.dot(y,e);m[14]=-V.dot(z,e);m[15]=1;return m;},
  inv(m){const o=new Float32Array(16),
    a00=m[0],a01=m[1],a02=m[2],a03=m[3],a10=m[4],a11=m[5],a12=m[6],a13=m[7],a20=m[8],a21=m[9],a22=m[10],a23=m[11],a30=m[12],a31=m[13],a32=m[14],a33=m[15],
    b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,
    b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
    let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(!det)return M4.id();det=1/det;
    o[0]=(a11*b11-a12*b10+a13*b09)*det;o[1]=(a02*b10-a01*b11-a03*b09)*det;o[2]=(a31*b05-a32*b04+a33*b03)*det;o[3]=(a22*b04-a21*b05-a23*b03)*det;
    o[4]=(a12*b08-a10*b11-a13*b07)*det;o[5]=(a00*b11-a02*b08+a03*b07)*det;o[6]=(a32*b02-a30*b05-a33*b01)*det;o[7]=(a20*b05-a22*b02+a23*b01)*det;
    o[8]=(a10*b10-a11*b08+a13*b06)*det;o[9]=(a01*b08-a00*b10-a03*b06)*det;o[10]=(a30*b04-a31*b02+a33*b00)*det;o[11]=(a21*b02-a20*b04-a23*b00)*det;
    o[12]=(a11*b07-a10*b09-a12*b06)*det;o[13]=(a00*b09-a01*b07+a02*b06)*det;o[14]=(a31*b01-a30*b03-a32*b00)*det;o[15]=(a20*b03-a21*b01+a22*b00)*det;return o;},
  // translation · Ry(yaw) · Rx(pitch) · Rz(roll) · scale
  trs(t,yaw,s,pitch=0,roll=0){const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch),cz=Math.cos(roll),sz=Math.sin(roll);
    const r00=cy*cz+sy*sx*sz,r01=-cy*sz+sy*sx*cz,r02=sy*cx,r10=cx*sz,r11=cx*cz,r12=-sx,r20=-sy*cz+cy*sx*sz,r21=sy*sz+cy*sx*cz,r22=cy*cx;
    const m=new Float32Array(16);m[0]=r00*s;m[1]=r10*s;m[2]=r20*s;m[4]=r01*s;m[5]=r11*s;m[6]=r21*s;m[8]=r02*s;m[9]=r12*s;m[10]=r22*s;m[12]=t[0];m[13]=t[1];m[14]=t[2];m[15]=1;return m;},
  // from basis vectors (x=right,y=up,z=fwd) and origin, uniform scale
  basis(o,x,y,z,s){const m=new Float32Array(16);m[0]=x[0]*s;m[1]=x[1]*s;m[2]=x[2]*s;m[4]=y[0]*s;m[5]=y[1]*s;m[6]=y[2]*s;m[8]=z[0]*s;m[9]=z[1]*s;m[10]=z[2]*s;m[12]=o[0];m[13]=o[1];m[14]=o[2];m[15]=1;return m;},
  xf(m,p){return[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];},
  xfv(m,p){return[m[0]*p[0]+m[4]*p[1]+m[8]*p[2],m[1]*p[0]+m[5]*p[1]+m[9]*p[2],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]];},
  nmat(m){// inverse-transpose 3x3 of upper-left (assumes uniform scale) -> normalized rotation
    const s=Math.hypot(m[0],m[1],m[2])||1;return new Float32Array([m[0]/s,m[1]/s,m[2]/s,m[4]/s,m[5]/s,m[6]/s,m[8]/s,m[9]/s,m[10]/s]);},
  xf4(m,p){const x=p[0],y=p[1],z=p[2];const w=m[3]*x+m[7]*y+m[11]*z+m[15];return[(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,(m[2]*x+m[6]*y+m[10]*z+m[14])/w];},
};
function m3rot(axis,ang){const c=Math.cos(ang),s=Math.sin(ang),t=1-c,[x,y,z]=axis;
  return[t*x*x+c,t*x*y+s*z,t*x*z-s*y, t*x*y-s*z,t*y*y+c,t*y*z+s*x, t*x*z+s*y,t*y*z-s*x,t*z*z+c];}// column-major
function m3mul(a,b){const o=new Array(9);for(let c=0;c<3;c++)for(let r=0;r<3;r++)o[c*3+r]=a[r]*b[c*3]+a[3+r]*b[c*3+1]+a[6+r]*b[c*3+2];return o;}

// ---------- CPU noise ----------
function ihash(x,y,z){let h=(Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(z,1274126177))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296;}
function noise3(x,y,z){const xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);
  const a=ihash(xi,yi,zi),b=ihash(xi+1,yi,zi),c=ihash(xi,yi+1,zi),d=ihash(xi+1,yi+1,zi),e=ihash(xi,yi,zi+1),f=ihash(xi+1,yi,zi+1),g=ihash(xi,yi+1,zi+1),h=ihash(xi+1,yi+1,zi+1);
  return lerp(lerp(lerp(a,b,u),lerp(c,d,u),v),lerp(lerp(e,f,u),lerp(g,h,u),v),w)*2-1;}
function fbm3(x,y,z,o=4){let s=0,a=0.5,n=0;for(let i=0;i<o;i++){s+=a*noise3(x,y,z);n+=a;x=x*2.03+1.7;y=y*2.03+9.2;z=z*2.03+3.1;a*=0.5;}return s/n;}

// ---------- GL ----------
const canvas=document.getElementById('gl');
const gl=canvas.getContext('webgl2',{antialias:false,alpha:false,depth:false,stencil:false,premultipliedAlpha:false,powerPreference:'high-performance',preserveDrawingBuffer:TEST});
if(!gl){fatal('WebGL2 is not available in this browser, so the reef aquarium cannot run here.');throw new Error('no webgl2');}
const EXT_CBF=gl.getExtension('EXT_color_buffer_float');
gl.getExtension('OES_texture_float_linear');
const HDR_IF=EXT_CBF?gl.RGBA16F:gl.RGBA8, HDR_T=EXT_CBF?gl.HALF_FLOAT:gl.UNSIGNED_BYTE;
const ATTR={aPos:0,aNor:1,aUV:2,aCol:3,aExt:4,iM0:5,iM1:6,iM2:7,iM3:8,iA:9,iB:10};
const STATS={draws:0,tris:0};

function compile(type,src,name){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(s);
    const lines=src.split('\n');const m=/ERROR: \d+:(\d+)/.exec(log);let ctx='';if(m){const ln=+m[1];ctx=lines.slice(Math.max(0,ln-3),ln+2).map((l,i)=>(ln-2+i)+': '+l).join('\n');}
    throw new Error('Shader '+name+' failed:\n'+log+'\n'+ctx);}return s;}
function mkProg(vs,fs,name){const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs,name+'.vs'));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs,name+'.fs'));
  for(const k in ATTR)gl.bindAttribLocation(p,ATTR[k],k);gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('Link '+name+': '+gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(let i=0;i<n;i++){const inf=gl.getActiveUniform(p,i);let nm=inf.name;if(nm.endsWith('[0]'))nm=nm.slice(0,-3);u[nm]={loc:gl.getUniformLocation(p,inf.name),type:inf.type,size:inf.size};}
  return{p,u,name,units:{}};}
let CUR=null;
function use(P){if(CUR!==P){gl.useProgram(P.p);CUR=P;}}
function U(P,name,v){const x=P.u[name];if(!x)return;const l=x.loc;
  switch(x.type){case gl.FLOAT:x.size>1?gl.uniform1fv(l,v):gl.uniform1f(l,v);break;
    case gl.FLOAT_VEC2:gl.uniform2fv(l,v);break;case gl.FLOAT_VEC3:gl.uniform3fv(l,v);break;case gl.FLOAT_VEC4:gl.uniform4fv(l,v);break;
    case gl.FLOAT_MAT3:gl.uniformMatrix3fv(l,false,v);break;case gl.FLOAT_MAT4:gl.uniformMatrix4fv(l,false,v);break;
    case gl.INT:case gl.BOOL:gl.uniform1i(l,v);break;default:gl.uniform1i(l,v);}}
function T(P,name,tex,unit){const x=P.u[name];if(!x)return;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(x.loc,unit);}

function mkTex(w,h,ifmt,fmt,type,filter=gl.LINEAR,wrap=gl.CLAMP_TO_EDGE,data=null){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texImage2D(gl.TEXTURE_2D,0,ifmt,w,h,0,fmt,type,data);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter===gl.LINEAR_MIPMAP_LINEAR?gl.LINEAR:filter);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,wrap);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,wrap);return t;}
function mkFbo(color,depth){const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);
  if(color)gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,color,0);
  if(depth)gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,depth,0);
  if(!color){gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);}
  const st=gl.checkFramebufferStatus(gl.FRAMEBUFFER);if(st!==gl.FRAMEBUFFER_COMPLETE)LOG('framebuffer incomplete',st.toString(16));
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);return f;}

function mkMesh(d,dynamic=false){
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);const bufs={};
  const att=(name,data,size)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
    gl.bufferData(gl.ARRAY_BUFFER,data instanceof Float32Array?data:new Float32Array(data),dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);
    gl.enableVertexAttribArray(ATTR[name]);gl.vertexAttribPointer(ATTR[name],size,gl.FLOAT,false,0,0);bufs[name]=b;};
  const nv=d.pos.length/3;
  att('aPos',d.pos,3);att('aNor',d.nor,3);att('aUV',d.uv,2);att('aCol',d.col,4);att('aExt',d.ext,4);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
  const big=nv>65535;const idx=big?new Uint32Array(d.idx):new Uint16Array(d.idx);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STATIC_DRAW);gl.bindVertexArray(null);
  return{vao,count:idx.length,itype:big?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT,bufs,nv};}
function addInstancing(mesh,maxN){gl.bindVertexArray(mesh.vao);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,maxN*96,gl.DYNAMIC_DRAW);
  for(let i=0;i<6;i++){const l=ATTR.iM0+i;gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,4,gl.FLOAT,false,96,i*16);gl.vertexAttribDivisor(l,1);}
  gl.bindVertexArray(null);mesh.ibuf=b;mesh.idata=new Float32Array(maxN*24);mesh.maxN=maxN;mesh.n=0;return mesh;}
function drawMesh(m){gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,m.itype,0);STATS.draws++;STATS.tris+=m.count/3;}
function drawInst(m){if(!m.n)return;gl.bindVertexArray(m.vao);gl.bindBuffer(gl.ARRAY_BUFFER,m.ibuf);
  gl.bufferSubData(gl.ARRAY_BUFFER,0,m.idata,0,m.n*24);gl.drawElementsInstanced(gl.TRIANGLES,m.count,m.itype,0,m.n);STATS.draws++;STATS.tris+=m.count/3*m.n;}
// write one instance: model matrix + two vec4
function setInst(m,i,M,a,b){const o=i*24,d=m.idata;d.set(M,o);d[o+16]=a[0];d[o+17]=a[1];d[o+18]=a[2];d[o+19]=a[3];d[o+20]=b[0];d[o+21]=b[1];d[o+22]=b[2];d[o+23]=b[3];}

// ---------- mesh builder ----------
class MB{
  constructor(){this.P=[];this.N=[];this.T=[];this.C=[];this.E=[];this.I=[];}
  get n(){return this.P.length/3;}
  v(p,n=[0,1,0],uv=[0,0],c=[1,1,1,1],e=[0,0,0,0]){this.P.push(p[0],p[1],p[2]);this.N.push(n[0],n[1],n[2]);this.T.push(uv[0],uv[1]);this.C.push(c[0],c[1],c[2],c[3]);this.E.push(e[0],e[1],e[2],e[3]);return this.n-1;}
  t(a,b,c){this.I.push(a,b,c);}
  q(a,b,c,d){this.I.push(a,b,c,a,c,d);}
  normals(from=0){const P=this.P,N=this.N,I=this.I,n=this.n;for(let i=from*3;i<n*3;i++)N[i]=0;
    for(let k=0;k<I.length;k+=3){const a=I[k],b=I[k+1],c=I[k+2];if(a<from)continue;
      const ax=P[a*3],ay=P[a*3+1],az=P[a*3+2],ux=P[b*3]-ax,uy=P[b*3+1]-ay,uz=P[b*3+2]-az,vx=P[c*3]-ax,vy=P[c*3+1]-ay,vz=P[c*3+2]-az;
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      for(const j of[a,b,c]){N[j*3]+=nx;N[j*3+1]+=ny;N[j*3+2]+=nz;}}
    for(let i=from;i<n;i++){const l=Math.hypot(N[i*3],N[i*3+1],N[i*3+2]);if(l<1e-9){N[i*3]=0;N[i*3+1]=1;N[i*3+2]=0;}else{N[i*3]/=l;N[i*3+1]/=l;N[i*3+2]/=l;}}return this;}
  merge(o){const off=this.n;this.P.push(...o.P);this.N.push(...o.N);this.T.push(...o.T);this.C.push(...o.C);this.E.push(...o.E);for(const i of o.I)this.I.push(i+off);return this;}
  bounds(){let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(let i=0;i<this.P.length;i+=3)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],this.P[i+k]);mx[k]=Math.max(mx[k],this.P[i+k]);}return{mn,mx};}
  mesh(dyn){for(const A of[this.P,this.N,this.T,this.C,this.E])for(let i=0;i<A.length;i++)if(!isFinite(A[i])){LOG('non-finite vertex attribute fixed');A[i]=0;}const m=mkMesh({pos:this.P,nor:this.N,uv:this.T,col:this.C,ext:this.E,idx:this.I},dyn);m.bounds=this.bounds();return m;}
}
// parametric grid: f(u,v)->{p,uv,c,e}; wrapU closes seam with duplicated column for uv continuity
function grid(mb,nu,nv,f,flip=false){const base=mb.n;
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const r=f(i/nu,j/nv,i,j);mb.v(r.p,r.n||[0,1,0],r.uv||[i/nu,j/nv],r.c,r.e);}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=base+j*(nu+1)+i,b=a+1,c=a+nu+2,d=a+nu+1;flip?mb.q(a,d,c,b):mb.q(a,b,c,d);}
  return base;}
// tube along polyline with parallel-transport frames
function tube(mb,pts,rad0,sides,o={}){const n=pts.length;if(n<2)return;const base=mb.n;
  const rad=typeof rad0==='function'?rad0:Array.isArray(rad0)?((t,i)=>rad0[i]):(()=>rad0);
  const Tn=[];for(let i=0;i<n;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)];Tn.push(V.norm(V.sub(b,a)));}
  let Nn=o.n0||V.perp(Tn[0]);let len=0;
  for(let i=0;i<n;i++){if(i>0){len+=V.dist(pts[i],pts[i-1]);Nn=V.norm(V.sub(Nn,V.mul(Tn[i],V.dot(Nn,Tn[i]))));}
    const B=V.cross(Tn[i],Nn),r=rad(i/(n-1),i);
    for(let j=0;j<=sides;j++){const a=j/sides*TAU,ca=Math.cos(a),sa=Math.sin(a);
      const dir=[Nn[0]*ca+B[0]*sa,Nn[1]*ca+B[1]*sa,Nn[2]*ca+B[2]*sa];
      const rr=o.rmod?r*o.rmod(i/(n-1),j/sides,pts[i]):r;
      mb.v(V.madd(pts[i],dir,rr),dir,[j/sides,o.vlen?len:i/(n-1)],o.col?o.col(i/(n-1),j/sides):[1,1,1,1],o.ext?o.ext(i/(n-1),j/sides,pts[i]):[0,0,0,0]);}}
  for(let i=0;i<n-1;i++)for(let j=0;j<sides;j++){const a=base+i*(sides+1)+j,b=a+1,c=a+sides+2,d=a+sides+1;mb.q(a,b,c,d);}
  if(o.cap){const e=n-1,c=mb.v(V.madd(pts[e],Tn[e],rad(1,e)*(o.capH===undefined?0.6:o.capH)),Tn[e],[0.5,o.vlen?len:1],o.col?o.col(1,0):[1,1,1,1],o.ext?o.ext(1,0,pts[e]):[0,0,0,0]);
    for(let j=0;j<sides;j++){const a=base+e*(sides+1)+j;mb.t(a,a+1,c);}}
  if(o.cap0){const c=mb.v(V.madd(pts[0],Tn[0],-rad(0,0)*0.5),V.mul(Tn[0],-1),[0.5,0],o.col?o.col(0,0):[1,1,1,1],o.ext?o.ext(0,0,pts[0]):[0,0,0,0]);
    for(let j=0;j<sides;j++){const a=base+j;mb.t(a+1,a,c);}}
  if(o.smooth){mb.normals(base);for(let i=0;i<n;i++){const a=base+i*(sides+1),b=a+sides;for(let c=0;c<3;c++){const v=(mb.N[a*3+c]+mb.N[b*3+c])/2;mb.N[a*3+c]=v;mb.N[b*3+c]=v;}}}
  return base;}
function icosphere(sub){const t=(1+Math.sqrt(5))/2;let P=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(V.norm);
  let F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  for(let s=0;s<sub;s++){const cache=new Map(),nf=[];const mid=(a,b)=>{const k=a<b?a*65536+b:b*65536+a;let r=cache.get(k);if(r===undefined){r=P.length;P.push(V.norm(V.lerp(P[a],P[b],0.5)));cache.set(k,r);}return r;};
    for(const[a,b,c]of F){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);nf.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);}F=nf;}
  return{P,F};}
function box(mb,c,h,col=[1,1,1,1],ext=[0,0,0,0]){const fs=[[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,1,0],[0,0,-1]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[0,0,-1],[1,0,0]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]];
  for(const[n,u,w]of fs){const b=mb.n;const ctr=[c[0]+n[0]*h[0],c[1]+n[1]*h[1],c[2]+n[2]*h[2]];
    const hu=Math.abs(u[0]*h[0]+u[1]*h[1]+u[2]*h[2]),hw=Math.abs(w[0]*h[0]+w[1]*h[1]+w[2]*h[2]);
    for(const[a,bb]of[[-1,-1],[1,-1],[1,1],[-1,1]]){mb.v([ctr[0]+u[0]*hu*a+w[0]*hw*bb,ctr[1]+u[1]*hu*a+w[1]*hw*bb,ctr[2]+u[2]*hu*a+w[2]*hw*bb],n,[(a+1)/2*hu*2,(bb+1)/2*hw*2],col,ext);}
    // ensure CCW outward
    const p0=[mb.P[b*3],mb.P[b*3+1],mb.P[b*3+2]],p1=[mb.P[b*3+3],mb.P[b*3+4],mb.P[b*3+5]],p2=[mb.P[b*3+6],mb.P[b*3+7],mb.P[b*3+8]];
    const fn=V.cross(V.sub(p1,p0),V.sub(p2,p0));if(V.dot(fn,n)>0)mb.q(b,b+1,b+2,b+3);else mb.q(b,b+3,b+2,b+1);}}
