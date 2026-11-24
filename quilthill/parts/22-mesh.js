// ---------- 22-mesh: lit mesh renderer (textures, vertex colour, specular, fire light), mesh builders, canvas textures ----------
const MESH_VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNrm;layout(location=2) in vec2 aUv;layout(location=3) in vec3 aCol;
uniform mat4 uVP,uM;out vec3 vW;out vec3 vN;out vec2 vUv;out vec3 vCol;
void main(){vec4 w=uM*vec4(aPos,1.);vW=w.xyz;vN=mat3(uM)*aNrm;vUv=aUv;vCol=aCol;gl_Position=uVP*w;}`;
const MESH_FS=`#version 300 es
precision highp float;
in vec3 vW;in vec3 vN;in vec2 vUv;in vec3 vCol;
uniform sampler2D uTex;uniform int uUseTex;uniform vec2 uUvScale;
uniform vec3 uSun,uSunCol,uSky,uGround,uFogCol,uCam,uFireP,uFireCol,uTint;
uniform vec2 uFog;uniform float uFireI,uFireR,uSpec,uShin,uMetal,uWeave,uEmis,uFogMax,uClipS;
out vec4 o;
void main(){
  if(-vW.z<uClipS)discard;
  vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;
  vec3 base=vCol*uTint;if(uUseTex==1)base*=texture(uTex,vUv*uUvScale).rgb;
  if(uWeave>0.){vec2 q=vW.xz*uWeave;float fw=fwidth(q.x)+fwidth(q.y);float k=1.-smoothstep(0.25,0.9,fw);
    float wv=0.5+0.5*sin(q.x*6.2832)*sin(q.y*6.2832);base*=1.-k*0.09*(1.-wv);}
  vec3 V=normalize(uCam-vW);
  float wrap=clamp((dot(n,uSun)+0.25)/1.25,0.,1.);
  vec3 amb=mix(uGround,uSky,n.y*0.5+0.5);
  vec3 Lf=uFireP-vW;float d=length(Lf);Lf/=d;float att=uFireI/(1.+(d/uFireR)*(d/uFireR));
  float fl=clamp((dot(n,Lf)+0.2)/1.2,0.,1.)*att;
  vec3 diff=amb+uSunCol*wrap+uFireCol*fl;
  vec3 c=base*diff*(1.-uMetal*0.55);
  vec3 H=normalize(uSun+V);vec3 Hf=normalize(Lf+V);
  float sp=pow(max(dot(n,H),0.),uShin)*uSpec;float spf=pow(max(dot(n,Hf),0.),uShin)*uSpec*att;
  vec3 specCol=mix(vec3(1.),base,uMetal);
  c+=specCol*(sp*uSunCol*1.6+spf*uFireCol*1.2);
  if(uMetal>0.){float fr=pow(1.-max(dot(n,V),0.),3.);vec3 R=reflect(-V,n);vec3 env=mix(uGround*0.8,uSky*1.3,R.y*0.5+0.5)+uFireCol*0.25*max(dot(R,Lf),0.);c+=specCol*env*uMetal*(0.45+0.55*fr);}
  c+=base*uEmis;
  float f=smoothstep(uFog.x,uFog.y,length(uCam-vW))*uFogMax;c=mix(c,uFogCol,f);
  o=vec4(c,1.);
}`;
const FIRE_VS=`#version 300 es
layout(location=0) in vec2 aCorner;uniform mat4 uVP;uniform vec3 uC,uR,uU;uniform vec2 uSize;out vec2 vC;
void main(){vC=aCorner;vec3 p=uC+uR*aCorner.x*uSize.x+uU*(aCorner.y*0.5+0.5)*uSize.y;gl_Position=uVP*vec4(p,1.);}`;
const FIRE_FS=`#version 300 es
precision highp float;in vec2 vC;uniform float uT,uSeed,uI;uniform int uGlow;out vec4 o;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=0.5;for(int i=0;i<4;i++){s+=a*n2(p);p*=2.03;a*=0.5;}return s;}
void main(){
  vec2 uv=vec2(vC.x,vC.y*0.5+0.5);
  if(uGlow==1){float d=length(vec2(vC.x,(uv.y-0.35)*1.4));float g=exp(-d*d*3.)*uI;o=vec4(vec3(1.,0.45,0.12)*g*0.55,1.);return;}
  float t=uT*1.6+uSeed*10.;
  float nz=fbm(vec2(uv.x*3.+uSeed*7.,uv.y*2.6-t));
  float w=(1.-uv.y)*0.9+0.08;float shape=w-abs(uv.x+ (nz-0.5)*0.6*uv.y)*1.1;
  float fl=smoothstep(0.,0.35,shape+nz*0.45-uv.y*0.55)*smoothstep(0.,0.08,uv.y+0.02);
  vec3 c=mix(vec3(1.,0.25,0.04),vec3(1.,0.72,0.2),smoothstep(0.2,0.8,fl));c=mix(c,vec3(1.,0.95,0.7),smoothstep(0.75,1.,fl)*(1.-uv.y));
  o=vec4(c*fl*uI,1.);
}`;
const MR={prog:compile(MESH_VS,MESH_FS),fire:compile(FIRE_VS,FIRE_FS),aniso:gl.getExtension('EXT_texture_filter_anisotropic'),white:null};
MR.maxAniso=MR.aniso?gl.getParameter(MR.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT):1;
// ---- mesh builder
class MB{
  constructor(){this.p=[];this.n=[];this.uv=[];this.c=[];this.i=[];}
  get vc(){return this.p.length/3;}
  v(p,n,uv,c){this.p.push(p[0],p[1],p[2]);this.n.push(n[0],n[1],n[2]);this.uv.push(uv?uv[0]:0,uv?uv[1]:0);c=c||[1,1,1];this.c.push(c[0],c[1],c[2]);return this.vc-1;}
  tri(a,b,c){this.i.push(a,b,c);}quad(a,b,c,d){this.i.push(a,b,c,a,c,d);}
  // grid over (u,v) in [0,1]^2 with fn(u,v)->{p,n,uv,c}
  grid(nu,nv,fn){const base=this.vc;for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const r=fn(i/nu,j/nv);this.v(r.p,r.n,r.uv,r.c);}
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=base+j*(nu+1)+i;this.quad(a,a+1,a+nu+2,a+nu+1);}}
  box(c,s,col,M){const[hx,hy,hz]=s.map(v=>v/2);const F=[[[1,0,0],[0,0,-1],[0,1,0]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[1,0,0],[0,0,-1]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]];
    for(const[n,u,w]of F){const e=[hx,hy,hz];const ctr=[c[0]+n[0]*hx,c[1]+n[1]*hy,c[2]+n[2]*hz];const ue=Math.abs(u[0])*hx+Math.abs(u[1])*hy+Math.abs(u[2])*hz,we=Math.abs(w[0])*hx+Math.abs(w[1])*hy+Math.abs(w[2])*hz;
      const q=(a,b)=>{let p=v3.add(ctr,v3.add(v3.sc(u,a*ue),v3.sc(w,b*we)));let nn=n;if(M){p=M4.apply(M,p);nn=v3.norm(v3.sub(M4.apply(M,v3.add(p,[0,0,0])),M4.apply(M,[0,0,0])));}return p;};
      const nn=M?v3.norm(v3.sub(M4.apply(M,n),M4.apply(M,[0,0,0]))):n;
      const a=this.v(q(-1,-1),nn,[0,0],col),b=this.v(q(1,-1),nn,[1,0],col),cc=this.v(q(1,1),nn,[1,1],col),d=this.v(q(-1,1),nn,[0,1],col);this.quad(a,b,cc,d);}}
  // revolve profile [[r,y],...] around y; colFn(k,t)
  lathe(prof,seg,col,M){const base=this.vc;for(let k=0;k<prof.length;k++){const[r,y]=prof[k];const a=prof[Math.max(0,k-1)],b=prof[Math.min(prof.length-1,k+1)];
      const dr=b[0]-a[0],dy=b[1]-a[1];for(let s=0;s<=seg;s++){const t=s/seg*Math.PI*2,ct=Math.cos(t),st=Math.sin(t);let p=[r*ct,y,r*st];let n=v3.norm([dy*ct,-dr,dy*st]);
        if(M){p=M4.apply(M,p);n=v3.norm(v3.sub(M4.apply(M,n),M4.apply(M,[0,0,0])));}this.v(p,n,[s/seg,k/(prof.length-1)],typeof col==='function'?col(k,s/seg):col);}}
    for(let k=0;k<prof.length-1;k++)for(let s=0;s<seg;s++){const a=base+k*(seg+1)+s;this.quad(a,a+seg+1,a+seg+2,a+1);}}
  torus(R,r,segU,segV,col,M){const base=this.vc;for(let i=0;i<=segU;i++){const u=i/segU*Math.PI*2;for(let j=0;j<=segV;j++){const w=j/segV*Math.PI*2;
      const n=[Math.cos(u)*Math.cos(w),Math.sin(w),Math.sin(u)*Math.cos(w)];let p=[Math.cos(u)*(R+r*Math.cos(w)),r*Math.sin(w),Math.sin(u)*(R+r*Math.cos(w))];let nn=n;
      if(M){p=M4.apply(M,p);nn=v3.norm(v3.sub(M4.apply(M,n),M4.apply(M,[0,0,0])));}this.v(p,nn,[i/segU,j/segV],typeof col==='function'?col(i/segU,j/segV):col);}}
    for(let i=0;i<segU;i++)for(let j=0;j<segV;j++){const a=base+i*(segV+1)+j;this.quad(a,a+1,a+segV+2,a+segV+1);}}
  // tube along polyline pts
  tube(pts,rad,seg,col){const base=this.vc;for(let k=0;k<pts.length;k++){const a=pts[Math.max(0,k-1)],b=pts[Math.min(pts.length-1,k+1)];const t=v3.norm(v3.sub(b,a));
      const ref=Math.abs(t[1])<0.9?[0,1,0]:[1,0,0];const u=v3.norm(v3.cross(t,ref)),w=v3.cross(t,u);const rr=typeof rad==='function'?rad(k/(pts.length-1)):rad;
      for(let s=0;s<=seg;s++){const an=s/seg*Math.PI*2;const n=v3.add(v3.sc(u,Math.cos(an)),v3.sc(w,Math.sin(an)));this.v(v3.add(pts[k],v3.sc(n,rr)),n,[s/seg,k/(pts.length-1)],typeof col==='function'?col(k/(pts.length-1),s/seg,pts[k]):col);}}
    for(let k=0;k<pts.length-1;k++)for(let s=0;s<seg;s++){const a=base+k*(seg+1)+s;this.quad(a,a+1,a+seg+2,a+seg+1);}}
  sphere(c,r,seg,col){const prof=[];for(let k=0;k<=seg;k++){const a=-Math.PI/2+k/seg*Math.PI;prof.push([Math.cos(a)*r+1e-4,Math.sin(a)*r]);}this.lathe(prof,seg*2,col,M4.trans(c[0],c[1],c[2]));}
  build(){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const mk=(arr,loc,sz)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,sz,gl.FLOAT,false,0,0);return b;};
    const bufs=[mk(this.p,0,3),mk(this.n,1,3),mk(this.uv,2,2),mk(this.c,3,3)];const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
    const big=this.vc>65535;gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,big?new Uint32Array(this.i):new Uint16Array(this.i),gl.STATIC_DRAW);gl.bindVertexArray(null);
    return{vao,bufs,ib,count:this.i.length,type:big?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT};}
}
function freeMesh(m){if(!m)return;gl.deleteVertexArray(m.vao);for(const b of m.bufs)gl.deleteBuffer(b);gl.deleteBuffer(m.ib);if(m.tex)gl.deleteTexture(m.tex);}
function texFromCanvas(cv,repeat){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cv);
  gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const w=repeat?gl.REPEAT:gl.CLAMP_TO_EDGE;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,w);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,w);
  if(MR.aniso)gl.texParameterf(gl.TEXTURE_2D,MR.aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,MR.maxAniso));return t;}
function canvas2(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
const FIRE={p:[0,0,0],col:[1.0,0.55,0.22],i:1,r:420};
function beginMesh(cam){const s=MR.prog;gl.useProgram(s.p);
  gl.uniformMatrix4fv(s.u.uVP,false,cam.vp);gl.uniform3fv(s.u.uCam,cam.eye);gl.uniform3fv(s.u.uSun,LIGHT.sun);gl.uniform3fv(s.u.uSunCol,LIGHT.sunCol);gl.uniform3fv(s.u.uSky,LIGHT.sky);gl.uniform3fv(s.u.uGround,LIGHT.ground);
  gl.uniform3fv(s.u.uFogCol,LIGHT.fog);gl.uniform2f(s.u.uFog,LIGHT.fogN||250,LIGHT.fogF||1700);gl.uniform1f(s.u.uFogMax,LIGHT.fogMax||0.75);
  gl.uniform1f(s.u.uClipS,-1e9);gl.uniform3fv(s.u.uFireP,FIRE.p);gl.uniform3fv(s.u.uFireCol,FIRE.col);gl.uniform1f(s.u.uFireI,FIRE.i);gl.uniform1f(s.u.uFireR,FIRE.r);gl.uniform1i(s.u.uTex,0);}
function drawMesh(m,M,mat){if(!m)return;const u=MR.prog.u;mat=mat||{};
  gl.uniformMatrix4fv(u.uM,false,M||IDENT);gl.uniform3fv(u.uTint,mat.tint||[1,1,1]);gl.uniform1f(u.uSpec,mat.spec||0);gl.uniform1f(u.uShin,mat.shin||16);gl.uniform1f(u.uMetal,mat.metal||0);
  gl.uniform1f(u.uWeave,mat.weave||0);gl.uniform1f(u.uEmis,mat.emis||0);const tex=mat.tex||m.tex;gl.uniform1i(u.uUseTex,tex?1:0);gl.uniform2fv(u.uUvScale,mat.uvScale||[1,1]);
  if(tex){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);}
  gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.count,m.type,0);R.draws++;}
