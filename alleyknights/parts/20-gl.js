// ---------- WebGL2 renderer: instanced meshes, moon shadow map, point lights, night sky, particles ----------
// Derived from Cartastrophe's renderer: same vertex/instance layout and MB builder, re-lit for a wet alley at night.
let gl = null;
const MAXL = 16;
const RND = {
  meshes: [], queue: new Map(), shadowSize: 2048, pcf: 1, pixelRatio: 1, scale: 1,
  sun: [0, 1, 0], sunCol: [0, 0, 0], exposure: 1.0,
  view: m4(), proj: m4(), vp: m4(), invVP: m4(), lightVP: m4(), cam: [0, 10, 10], time: 0,
  skyTop: [0.01, 0.015, 0.04], skyHor: [0.05, 0.06, 0.1], skyGrd: [0.02, 0.02, 0.025], fogCol: [0.04, 0.045, 0.07], fogK: 0.03,
  ambTop: [0.05, 0.06, 0.1], ambBot: [0.03, 0.025, 0.02], stars: 1,
  lights: new Float32Array(MAXL * 4), lightC: new Float32Array(MAXL * 4), lightN: 0, maxLights: MAXL
};
const VSTRIDE = 14; // pos3 nrm3 col3 par3 uv2
const ISTRIDE = 20; // mat4 + tint4

const GLSL_COMMON = `
precision highp float; precision highp int;
uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uCam; uniform float uTime; uniform float uExposure;
uniform vec3 uSkyTop; uniform vec3 uSkyHor; uniform vec3 uSkyGrd; uniform vec3 uFogCol; uniform float uFogK;
vec3 skyCol(vec3 d){
  float y=d.y;
  vec3 c = y>0.0 ? mix(uSkyHor, uSkyTop, pow(clamp(y,0.0,1.0),0.6)) : mix(uSkyHor*0.8, uSkyGrd, clamp(-y*5.0,0.0,1.0));
  float sd=max(dot(d,uSun),0.0);
  c += uSunCol*(pow(sd,2000.0)*30.0 + pow(sd,40.0)*0.12 + pow(sd,6.0)*0.03);
  return c;
}
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
vec3 outCol(vec3 c){ return pow(aces(c*uExposure), vec3(1.0/2.2)); }
vec3 applyFog(vec3 c, vec3 wp){
  float d=length(wp-uCam);
  float f=1.0-exp(-max(d-6.0,0.0)*uFogK);
  return mix(c, uFogCol, f);
}
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
`;

const VS_MAIN = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec3 aCol;
layout(location=3) in vec3 aPar; layout(location=4) in vec2 aUv;
layout(location=5) in vec4 iM0; layout(location=6) in vec4 iM1; layout(location=7) in vec4 iM2; layout(location=8) in vec4 iM3;
layout(location=9) in vec4 iTint;
uniform mat4 uVP; uniform mat4 uLVP;
out vec3 vW; out vec3 vN; out vec3 vCol; out vec3 vPar; out vec2 vUv; out vec4 vL; out float vA;
void main(){
  mat4 M=mat4(iM0,iM1,iM2,iM3);
  vec4 w=M*vec4(aPos,1.0); vW=w.xyz;
  vN=normalize(mat3(M)*aNrm);
  vec3 c=aCol; if(aUv.x<-1.5) c*=iTint.rgb;
  vCol=c; vPar=aPar; vUv=aUv; vA=iTint.a;
  vL=uLVP*vec4(w.xyz+vN*0.04,1.0);
  gl_Position=uVP*w;
}`;

const FS_MAIN = `#version 300 es
${GLSL_COMMON}
in vec3 vW; in vec3 vN; in vec3 vCol; in vec3 vPar; in vec2 vUv; in vec4 vL; in float vA;
uniform highp sampler2DShadow uShadow; uniform sampler2D uAtlas; uniform float uShTexel; uniform int uPcf;
uniform vec3 uAmbTop; uniform vec3 uAmbBot;
uniform vec4 uL[${MAXL}]; uniform vec4 uLC[${MAXL}]; uniform int uLN;
out vec4 frag;
float shadowF(vec4 lp){
  vec3 p=lp.xyz/lp.w*0.5+0.5;
  if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0||p.z>1.0) return 1.0;
  p.z-=0.0004;
  float s=0.0, n=0.0;
  for(int y=-2;y<=2;y++) for(int x=-2;x<=2;x++){
    if(abs(x)>uPcf||abs(y)>uPcf) continue;
    s+=texture(uShadow, vec3(p.xy+vec2(float(x),float(y))*uShTexel, p.z)); n+=1.0;
  }
  return s/n;
}
const float bayer[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
vec3 ggx(vec3 N, vec3 V, vec3 L, vec3 base, float rough, float metal, out float NL){
  NL=max(dot(N,L),0.0);
  vec3 H=normalize(L+V);
  float NH=max(dot(N,H),0.0), NV=max(dot(N,V),1e-3);
  float a=max(rough*rough,0.02), a2=a*a;
  float dd=NH*NH*(a2-1.0)+1.0; float D=a2/(3.14159*dd*dd);
  vec3 F0=mix(vec3(0.04),base,metal);
  vec3 F=F0+(1.0-F0)*pow(1.0-max(dot(H,V),0.0),5.0);
  float G=0.5/mix(2.0*NL*NV, NL+NV, a);
  return D*F*G*NL;
}
void main(){
  if(vA<0.999){ ivec2 q=ivec2(gl_FragCoord.xy)&3; if((bayer[q.y*4+q.x]+0.5)/16.0>vA) discard; }
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 V=normalize(uCam-vW);
  vec3 base=vCol; float rough=vPar.x, metal=vPar.y, emis=vPar.z;
  if(vUv.x>-0.5){ vec4 t=texture(uAtlas, vUv); base=mix(base, t.rgb, t.a); if(emis>0.0) emis*=t.a; }
  float mat=-emis;
  if(emis<-0.5){
    emis=0.0;
    vec2 xz=vW.xz;
    if(mat<1.5){ // brick
      float hcoord = abs(N.x)>abs(N.z) ? vW.z : vW.x;
      float row=floor(vW.y/0.085); float off=mod(row,2.0)*0.115;
      vec2 bc=vec2((hcoord+off)/0.23, vW.y/0.085);
      vec2 f=fract(bc); float mortar=step(f.x,0.06)+step(f.y,0.11);
      float bid=h21(floor(bc)+vec2(row*0.37,3.1));
      base*=(0.72+0.5*bid)*(0.85+0.3*vn(vW.xy*3.0+vW.zy*3.0));
      float grime=smoothstep(1.4,0.0,vW.y)*0.5+0.25*vn(vec2(hcoord*0.4,vW.y*0.7));
      float farB=smoothstep(14.0,32.0,length(vW-uCam)); mortar*=1.0-farB;
      base=mix(base, vec3(0.32,0.30,0.27)*0.6, clamp(mortar,0.0,1.0));
      base*=1.0-grime*0.45;
      rough=0.92;
    } else if(mat<2.5){ // wet asphalt; par.x = base wetness
      float n=fbm(xz*0.9); float sp=h21(floor(xz*40.0));
      vec3 asp=vec3(0.05,0.05,0.055)*(0.7+0.6*n+(sp>0.93?0.35:0.0));
      float crack=smoothstep(0.016,0.0,abs(fbm(xz*0.35+11.0)-0.5))*smoothstep(0.45,0.6,vn(xz*0.07+4.0)); asp*=1.0-crack*0.5;
      float pud=smoothstep(0.56,0.62,fbm(xz*0.22+vec2(5.0,1.0))+0.12*vPar.x);
      float wet=clamp(0.35+pud,0.0,1.0);
      base=mix(asp, asp*0.45, wet);
      rough=mix(0.75,0.06,pud); rough=mix(rough, rough*0.7, 0.3);
      metal=0.0;
      if(pud>0.5){ float rip=sin(length(fract(xz*0.8)-0.5)*40.0-uTime*6.0)*0.5+0.5; N=normalize(N+vec3(0.0,0.0,0.0)+vec3(rip-0.5,0.0,rip-0.5)*0.015); }
    } else if(mat<3.5){ // dirty concrete step / curb
      float n=fbm(xz*1.5+vW.yy); base*=0.75+0.35*n; rough=0.85;
    } else if(mat<4.5){ // concrete with joints
      float n=fbm(xz*1.5+vW.yy); base*=0.8+0.3*n;
      float j=min(abs(fract(vW.x/1.6+0.5)-0.5), abs(fract(vW.z/1.6+0.5)-0.5));
      if(N.y>0.5) base*=mix(0.6,1.0,smoothstep(0.0,0.012,j));
      rough=0.85;
    } else if(mat<5.5){ // corrugated / painted metal with rust
      float r=vn(vW.xy*2.3+vW.zy*2.3)*vn(vW.xz*5.0+vW.y);
      base=mix(base, vec3(0.28,0.12,0.05), smoothstep(0.3,0.6,r));
      rough=0.55;
    } else if(mat<6.5){ // wood (pallets, couch frame, fence boards)
      float g=vn(vec2(vW.x*2.0+vW.z*0.3, vW.z*28.0+vW.x*3.0+vW.y*9.0));
      base*=0.75+0.4*g; rough=0.85;
    } else { // fabric (couch)
      float g=vn(vW.xz*60.0+vW.y*30.0); base*=0.8+0.25*g; rough=0.98;
    }
  }
  float sh=shadowF(vL);
  float NL;
  vec3 spec=ggx(N,V,uSun,base,rough,metal,NL);
  vec3 hemi=mix(uAmbBot, uAmbTop, N.y*0.5+0.5);
  vec3 kd=base*(1.0-metal);
  vec3 col=kd*(hemi + uSunCol*NL*sh) + spec*uSunCol*sh;
  for(int i=0;i<${MAXL};i++){
    if(i>=uLN) break;
    vec3 Lv=uL[i].xyz-vW; float d2=dot(Lv,Lv); float r=uL[i].w;
    if(d2>r*r) continue;
    float d=sqrt(d2); vec3 L=Lv/d;
    float fall=1.0/(1.0+d2/(r*r)*7.0) * (1.0-smoothstep(r*0.6,r,d));
    float nl; vec3 sp=ggx(N,V,L,base,rough,metal,nl);
    col+= (kd*nl + sp*1.4) * uLC[i].rgb * fall;
  }
  vec3 R=reflect(-V,N);
  vec3 env=mix(skyCol(R), uAmbTop, rough);
  if(R.y<0.0) env=mix(env, uSkyGrd, clamp(-R.y*3.0,0.0,1.0));
  float fres=0.04+0.96*pow(1.0-max(dot(N,V),0.0),5.0);
  col+= env*mix(vec3(fres),base,metal)*(1.0-rough*0.9);
  col+= base*emis;
  col=applyFog(col, vW);
  frag=vec4(outCol(col),1.0);
}`;

const VS_SHADOW = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=5) in vec4 iM0; layout(location=6) in vec4 iM1; layout(location=7) in vec4 iM2; layout(location=8) in vec4 iM3;
layout(location=9) in vec4 iTint;
uniform mat4 uLVP; out float vA;
void main(){ vA=iTint.a; gl_Position=uLVP*(mat4(iM0,iM1,iM2,iM3)*vec4(aPos,1.0)); }`;
const FS_SHADOW = `#version 300 es
precision mediump float; in float vA; out vec4 o;
void main(){ if(vA<0.5) discard; o=vec4(1.0); }`;

const VS_SKY = `#version 300 es
uniform mat4 uInvVP; out vec3 vDir;
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2))*2.0-1.0;
  vec4 a=uInvVP*vec4(p,1.0,1.0); vDir=a.xyz/a.w; gl_Position=vec4(p,0.99999,1.0); }`;
const FS_SKY = `#version 300 es
${GLSL_COMMON}
uniform float uStars;
in vec3 vDir; out vec4 frag;
void main(){
  vec3 d=normalize(vDir-uCam);
  vec3 c=skyCol(d);
  if(d.y>0.0){
    vec2 uv=d.xz/(d.y+0.15);
    vec2 g=floor(uv*120.0); float s=h21(g); float tw=0.6+0.4*sin(uTime*2.0+s*40.0);
    c+=vec3(0.9,0.92,1.0)*step(0.996,s)*tw*uStars*0.9*smoothstep(0.0,0.3,d.y);
    vec2 cu=uv*1.2+vec2(uTime*0.006,0.0);
    float cl=smoothstep(0.5,0.9,fbm(cu*1.4)+0.25*fbm(cu*5.0));
    float lit=pow(max(dot(d,uSun),0.0),8.0);
    c=mix(c, uSkyHor*1.4+uSunCol*lit*0.4, cl*smoothstep(0.0,0.25,d.y)*0.75);
  }
  frag=vec4(outCol(c),1.0);
}`;

const VS_PART = `#version 300 es
layout(location=0) in vec4 pPos; layout(location=1) in vec4 pCol; layout(location=2) in vec2 pExt;
uniform mat4 uVP; uniform vec3 uRight; uniform vec3 uUp;
out vec4 vCol; out vec2 vUv; flat out float vKind;
void main(){
  vec2 c=vec2(float(gl_VertexID&1), float((gl_VertexID>>1)&1))*2.0-1.0;
  float r=pExt.x; float cs=cos(r), sn=sin(r);
  vec2 rc=vec2(c.x*cs-c.y*sn, c.x*sn+c.y*cs);
  vec3 w=pPos.xyz+(uRight*rc.x+uUp*rc.y)*pPos.w;
  vCol=pCol; vUv=c; vKind=pExt.y;
  gl_Position=uVP*vec4(w,1.0);
}`;
const FS_PART = `#version 300 es
precision highp float;
in vec4 vCol; in vec2 vUv; flat in float vKind; out vec4 frag;
float h(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
void main(){
  float d=length(vUv);
  if(d>1.0) discard;
  float a;
  if(vKind<0.5){ float n=h(floor(vUv*3.0+vCol.rg*7.0)); a=smoothstep(1.0,0.2,d)*(0.75+0.25*n); }
  else if(vKind<1.5){ a=pow(1.0-d,1.6); }
  else if(vKind<2.5){ a=smoothstep(1.0,0.6,d); }
  else if(vKind<3.5){ a=max(abs(vUv.x),abs(vUv.y))<0.7?1.0:0.0; }
  else { // star / spark cross
    float s=min(abs(vUv.x),abs(vUv.y)); a=smoothstep(0.25,0.0,s)*(1.0-d);
  }
  a*=vCol.a;
  frag=vec4(vCol.rgb*a, a);
}`;

function glCompile(vsSrc, fsSrc, name) {
  const mk = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      console.error(name + ' shader error:\n' + log);
      throw new Error(name + ' shader: ' + log);
    }
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vsSrc)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(name + ' link: ' + gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const nm = info.name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

function glInit(canvas, testMode) {
  gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!testMode });
  if (!gl) throw new Error('This game needs WebGL2, which this browser does not provide.');
  RND.P = {
    main: glCompile(VS_MAIN, FS_MAIN, 'main'),
    shadow: glCompile(VS_SHADOW, FS_SHADOW, 'shadow'),
    sky: glCompile(VS_SKY, FS_SKY, 'sky'),
    part: glCompile(VS_PART, FS_PART, 'particles')
  };
  RND.skyVao = gl.createVertexArray();
  RND.partCap = 6000; RND.partData = new Float32Array(RND.partCap * 10);
  RND.partVao = gl.createVertexArray(); gl.bindVertexArray(RND.partVao);
  RND.partBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, RND.partBuf);
  gl.bufferData(gl.ARRAY_BUFFER, RND.partData.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 40, 0); gl.vertexAttribDivisor(0, 1);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 40, 16); gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 40, 32); gl.vertexAttribDivisor(2, 1);
  gl.bindVertexArray(null);
  glMakeShadow(RND.shadowSize);
  RND.atlas = gl.createTexture();
}

function glMakeShadow(size) {
  if (RND.shadowTex) { gl.deleteTexture(RND.shadowTex); gl.deleteFramebuffer(RND.shadowFbo); }
  RND.shadowSize = size;
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, size, size);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t, 0);
  gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  RND.shadowTex = t; RND.shadowFbo = f;
}

function glUploadAtlas(canvas) {
  gl.bindTexture(gl.TEXTURE_2D, RND.atlas);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const af = gl.getExtension('EXT_texture_filter_anisotropic');
  if (af) gl.texParameterf(gl.TEXTURE_2D, af.TEXTURE_MAX_ANISOTROPY_EXT, 8);
}

function glMesh(verts, idx, opts = {}) {
  const m = { vao: gl.createVertexArray(), count: idx.length, cast: opts.cast !== false, name: opts.name || '', instCap: 0, instBuf: gl.createBuffer(), isStatic: !!opts.isStatic };
  gl.bindVertexArray(m.vao);
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const S = VSTRIDE * 4;
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, S, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, S, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, S, 24);
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 3, gl.FLOAT, false, S, 36);
  gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 2, gl.FLOAT, false, S, 48);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, m.instBuf);
  const IS = ISTRIDE * 4;
  for (let i = 0; i < 4; i++) { gl.enableVertexAttribArray(5 + i); gl.vertexAttribPointer(5 + i, 4, gl.FLOAT, false, IS, i * 16); gl.vertexAttribDivisor(5 + i, 1); }
  gl.enableVertexAttribArray(9); gl.vertexAttribPointer(9, 4, gl.FLOAT, false, IS, 64); gl.vertexAttribDivisor(9, 1);
  gl.bindVertexArray(null);
  m.verts = verts.length / VSTRIDE;
  RND.meshes.push(m);
  RND.queue.set(m, { arr: new Float32Array(ISTRIDE * 8), n: 0 });
  return m;
}

function glPush(mesh, M, r = 1, g = 1, b = 1, a = 1) {
  const q = RND.queue.get(mesh);
  if ((q.n + 1) * ISTRIDE > q.arr.length) { const na = new Float32Array(q.arr.length * 2); na.set(q.arr); q.arr = na; }
  const o = q.n * ISTRIDE; q.arr.set(M, o); q.arr[o + 16] = r; q.arr[o + 17] = g; q.arr[o + 18] = b; q.arr[o + 19] = a; q.n++;
  q.uploaded = false;
}

const PART = { alpha: [], add: [] };
function glPart(list, x, y, z, s, r, g, b, a, rot, kind) { list.push(x, y, z, s, r, g, b, a, rot, kind); }

function glSetCamera(eye, target, fov, aspect) {
  m4look(RND.view, eye[0], eye[1], eye[2], target[0], target[1], target[2], 0, 1, 0);
  m4persp(RND.proj, fov, aspect, 0.06, 400);
  m4mul(RND.vp, RND.proj, RND.view);
  m4inv(RND.invVP, RND.vp);
  RND.cam = eye.slice();
}
function glSetLight(center, radius) {
  const s = RND.sun, d = 120;
  const lv = m4(), lp = m4();
  const ex = center[0] + s[0] * d, ey = center[1] + s[1] * d, ez = center[2] + s[2] * d;
  m4look(lv, ex, ey, ez, center[0], center[1], center[2], 0, 1, 0);
  m4ortho(lp, -radius, radius, -radius, radius, d - 60, d + 60);
  m4mul(RND.lightVP, lp, lv);
  const ts = 2 / RND.shadowSize;
  const ox = RND.lightVP[12] / ts, oy = RND.lightVP[13] / ts;
  RND.lightVP[12] += (Math.round(ox) - ox) * ts; RND.lightVP[13] += (Math.round(oy) - oy) * ts;
}
// world-space point -> screen pixels (css), or null when behind the camera
function glProject(x, y, z) {
  const m = RND.vp; const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (cw < 0.1) return null;
  return [(cx / cw * 0.5 + 0.5) * innerWidth, (1 - (cy / cw * 0.5 + 0.5)) * innerHeight];
}

function glCommon(P) {
  const u = P.u;
  if (u.uSun) gl.uniform3fv(u.uSun, RND.sun);
  if (u.uSunCol) gl.uniform3fv(u.uSunCol, RND.sunCol);
  if (u.uCam) gl.uniform3fv(u.uCam, RND.cam);
  if (u.uTime) gl.uniform1f(u.uTime, RND.time);
  if (u.uExposure) gl.uniform1f(u.uExposure, RND.exposure);
  if (u.uVP) gl.uniformMatrix4fv(u.uVP, false, RND.vp);
  if (u.uLVP) gl.uniformMatrix4fv(u.uLVP, false, RND.lightVP);
  if (u.uSkyTop) gl.uniform3fv(u.uSkyTop, RND.skyTop);
  if (u.uSkyHor) gl.uniform3fv(u.uSkyHor, RND.skyHor);
  if (u.uSkyGrd) gl.uniform3fv(u.uSkyGrd, RND.skyGrd);
  if (u.uFogCol) gl.uniform3fv(u.uFogCol, RND.fogCol);
  if (u.uFogK) gl.uniform1f(u.uFogK, RND.fogK);
  if (u.uAmbTop) gl.uniform3fv(u.uAmbTop, RND.ambTop);
  if (u.uAmbBot) gl.uniform3fv(u.uAmbBot, RND.ambBot);
}

function glDrawQueue(shadowPass) {
  for (const [m, q] of RND.queue) {
    if (!q.n) continue;
    if (shadowPass && !m.cast) continue;
    gl.bindVertexArray(m.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.instBuf);
    const bytes = q.n * ISTRIDE * 4;
    if (m.instCap < bytes || !q.uploaded) {
      if (m.instCap < bytes) { m.instCap = Math.max(bytes, q.arr.byteLength); gl.bufferData(gl.ARRAY_BUFFER, m.instCap, gl.DYNAMIC_DRAW); }
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, q.arr, 0, q.n * ISTRIDE);
      q.uploaded = true;
    }
    gl.drawElementsInstanced(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0, q.n);
  }
}

function glRender(w, h) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, RND.shadowFbo);
  gl.viewport(0, 0, RND.shadowSize, RND.shadowSize);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.6, 3.0);
  const S = RND.P.shadow; gl.useProgram(S.p); gl.uniformMatrix4fv(S.u.uLVP, false, RND.lightVP);
  glDrawQueue(true);
  gl.disable(gl.POLYGON_OFFSET_FILL);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const P = RND.P.main; gl.useProgram(P.p); glCommon(P);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, RND.shadowTex); gl.uniform1i(P.u.uShadow, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, RND.atlas); gl.uniform1i(P.u.uAtlas, 1);
  gl.uniform1f(P.u.uShTexel, 1 / RND.shadowSize); gl.uniform1i(P.u.uPcf, RND.pcf);
  gl.uniform4fv(P.u.uL, RND.lights); gl.uniform4fv(P.u.uLC, RND.lightC); gl.uniform1i(P.u.uLN, Math.min(RND.lightN, RND.maxLights));
  glDrawQueue(false);
  const K = RND.P.sky; gl.useProgram(K.p); glCommon(K); gl.uniformMatrix4fv(K.u.uInvVP, false, RND.invVP); gl.uniform1f(K.u.uStars, RND.stars);
  gl.depthFunc(gl.LEQUAL); gl.depthMask(false);
  gl.bindVertexArray(RND.skyVao); gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.depthFunc(gl.LESS);
  gl.enable(gl.BLEND);
  const Q = RND.P.part; gl.useProgram(Q.p);
  gl.uniformMatrix4fv(Q.u.uVP, false, RND.vp);
  const v = RND.view; gl.uniform3f(Q.u.uRight, v[0], v[4], v[8]); gl.uniform3f(Q.u.uUp, v[1], v[5], v[9]);
  gl.bindVertexArray(RND.partVao); gl.bindBuffer(gl.ARRAY_BUFFER, RND.partBuf);
  const drawList = (list, add) => {
    let n = Math.min(list.length / 10, RND.partCap); if (!n) return;
    RND.partData.set(list.length > RND.partData.length ? list.slice(0, RND.partData.length) : list);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, RND.partData, 0, n * 10);
    if (add) gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
  };
  drawList(PART.alpha, false);
  drawList(PART.add, true);
  gl.depthMask(true); gl.disable(gl.BLEND);
  gl.bindVertexArray(null);
}

function glResetQueue() {
  for (const [m, q] of RND.queue) { if (m.isStatic) continue; q.n = 0; q.uploaded = false; }
  PART.alpha.length = 0; PART.add.length = 0;
}
