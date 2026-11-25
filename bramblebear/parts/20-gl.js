// ---------- WebGL2 renderer: instanced meshes, sun shadow map, sky, water, particles ----------
let gl = null;
const RND = {
  meshes: [], queue: new Map(), shadowSize: 2048, pcf: 1, pixelRatio: 1, scale: 1,
  sun: [0, 0, 0], sunCol: [0, 0, 0], exposure: 1.0, ripples: new Float32Array(4 * 12), rippleN: 0,
  view: m4(), proj: m4(), vp: m4(), invVP: m4(), lightVP: m4(), cam: [0, 10, 10], time: 0
};
const VSTRIDE = 14; // pos3 nrm3 col3 par3 uv2
const ISTRIDE = 20; // mat4 + tint4

const GLSL_COMMON = `
precision highp float; precision highp int;
uniform vec3 uSun; uniform vec3 uSunCol; uniform vec3 uCam; uniform float uTime; uniform float uExposure;
vec3 skyCol(vec3 d){
  float y=d.y;
  vec3 top=vec3(0.16,0.36,0.74), hor=vec3(0.66,0.76,0.84), grd=vec3(0.30,0.32,0.30);
  vec3 c = y>0.0 ? mix(hor, top, pow(clamp(y,0.0,1.0),0.5)) : mix(hor*0.9, grd, clamp(-y*5.0,0.0,1.0));
  float sd=max(dot(d,uSun),0.0);
  c += uSunCol*(pow(sd,900.0)*14.0 + pow(sd,12.0)*0.18 + pow(sd,3.0)*0.05);
  return c;
}
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
vec3 outCol(vec3 c){ return pow(aces(c*uExposure), vec3(1.0/2.2)); }
vec3 applyFog(vec3 c, vec3 wp){
  vec3 dv=wp-uCam; float d=length(dv); vec3 dir=dv/max(d,1e-3);
  float f=1.0-exp(-max(d-35.0,0.0)*0.0068);
  return mix(c, skyCol(normalize(vec3(dir.x, max(dir.y,0.03), dir.z)))*0.92, f);
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
void main(){
  if(vA<0.999){ ivec2 q=ivec2(gl_FragCoord.xy)&3; if((bayer[q.y*4+q.x]+0.5)/16.0>vA) discard; }
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 V=normalize(uCam-vW);
  vec3 base=vCol; float rough=vPar.x, metal=vPar.y, emis=vPar.z;
  if(vUv.x>-0.5){ vec4 t=texture(uAtlas, vUv); base=mix(base, t.rgb, t.a); }
  float mat=-emis; float aoK=1.0;
  if(emis<-0.5){
    emis=0.0;
    vec2 xz=vW.xz;
    if(mat<1.5){ // forest floor: vPar.x = trail, vPar.y = rock, vCol.r = shore (wet sand / pebbles), vCol.g = moss
      float trail=vPar.x, rockW=vPar.y, shore=vCol.r, moss=vCol.g;
      float n=fbm(xz*0.35), n2=fbm(xz*1.7+5.0), sp=h21(floor(xz*9.0));
      vec3 grass=vec3(0.085,0.16,0.04)*(0.7+0.6*n)*(0.85+0.3*n2);
      vec3 needles=vec3(0.13,0.085,0.045)*(0.75+0.5*n2);
      vec3 mossC=vec3(0.06,0.13,0.035)*(0.8+0.4*n2);
      float nd=smoothstep(0.42,0.62,fbm(xz*0.12+3.0));
      vec3 fl=mix(grass, needles, nd*0.8); fl=mix(fl, mossC, moss*0.8);
      fl*= (sp>0.96? 1.25 : 1.0);
      vec3 dirt=vec3(0.19,0.13,0.075)*(0.75+0.45*n2)*(0.9+0.2*vn(xz*6.0));
      float strata=0.82+0.22*sin(vW.y*2.3+fbm(xz*0.3)*4.0); vec3 rk=vec3(0.16,0.155,0.145)*(0.55+0.55*fbm(vec2(vW.x+vW.z, vW.y)*0.5))*strata; rk=mix(rk, vec3(0.05,0.09,0.03), smoothstep(0.6,0.8,fbm(vec2(vW.x+vW.z,vW.y)*0.25+9.0))*0.6);
      vec3 sand=mix(vec3(0.25,0.21,0.15), vec3(0.16,0.15,0.13), smoothstep(0.4,0.7,vn(xz*3.0)))*(0.85+0.3*sp);
      base=mix(fl, dirt, smoothstep(0.15,0.75,trail));
      base=mix(base, sand, shore);
      base=mix(base, rk, rockW);
      rough=mix(0.95, 0.6, shore*0.6); metal=0.0;
    } else if(mat<2.5){ // bark
      float g=vn(vec2(atan(vN.x,vN.z)*6.0, vW.y*3.5)); base*=0.7+0.5*g; rough=0.95;
    } else if(mat<3.5){ // leaves / needles
      float n=vn(vW.xz*2.3+vW.y*1.7); base*=0.75+0.5*n; rough=0.9;
      emis=0.06*max(dot(-N,uSun),0.0);  // a little light through the leaves
    } else if(mat<4.5){ // rock
      float n=fbm(vec2(vW.x+vW.z, vW.y)*0.7); float l=vn(vW.xz*0.4+vW.y);
      base*=0.6+0.6*n; base=mix(base, vec3(0.08,0.12,0.05), smoothstep(0.55,0.8,l)*max(N.y,0.0)*0.7); rough=0.9;
    } else if(mat<5.5){ // falling water: streaks that run down
      float s1=fbm(vec2(vW.x*2.6+vW.z*2.6, vW.y*0.55+uTime*5.0));
      float s2=vn(vec2(vW.x*7.0+vW.z*7.0, vW.y*1.6+uTime*9.0));
      base=mix(vec3(0.32,0.45,0.5), vec3(0.95,0.98,1.0), smoothstep(0.35,0.75,s1*0.7+s2*0.4));
      emis=0.35; rough=0.3;
    } else { // fur
      float f=vn(vW.xz*18.0+vW.y*14.0)*0.6+vn(vW.xy*31.0)*0.4; base*=0.75+0.45*f; rough=0.95;
    }
  }
  float sh=shadowF(vL);
  float NL=max(dot(N,uSun),0.0);
  vec3 H=normalize(uSun+V);
  float NH=max(dot(N,H),0.0), NV=max(dot(N,V),1e-3);
  float a=max(rough*rough,0.03), a2=a*a;
  float dd=NH*NH*(a2-1.0)+1.0; float D=a2/(3.14159*dd*dd);
  vec3 F0=mix(vec3(0.04),base,metal);
  vec3 F=F0+(1.0-F0)*pow(1.0-NV,5.0);
  float G=0.5/mix(2.0*NL*NV, NL+NV, a);
  vec3 spec=D*F*G*NL;
  vec3 hemi=mix(vec3(0.34,0.31,0.27), vec3(0.42,0.55,0.78), N.y*0.5+0.5);
  vec3 diff=base*(1.0-metal)*(hemi*0.55*aoK + uSunCol*NL*sh);
  vec3 R=reflect(-V,N);
  vec3 env=mix(skyCol(R), vec3(0.45,0.52,0.62), rough);
  if(R.y<0.0) env=mix(env, vec3(0.16,0.15,0.14), clamp(-R.y*3.0,0.0,1.0));
  vec3 col=diff + spec*uSunCol*sh + env*F*(1.0-rough*0.85)*(metal>0.5?1.0:0.6) + base*emis;
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
in vec3 vDir; out vec4 frag;
void main(){
  vec3 d=normalize(vDir-uCam);
  vec3 c=skyCol(d);
  if(d.y>0.0){
    vec2 uv=d.xz/(d.y+0.12)*1.6 + vec2(uTime*0.004,0.0);
    float cl=smoothstep(0.52,0.85,fbm(uv*1.3)+0.25*fbm(uv*5.0));
    float lit=0.85+0.25*max(dot(d,uSun),0.0);
    c=mix(c, vec3(1.0,0.98,0.95)*lit*1.15, cl*smoothstep(0.0,0.25,d.y)*0.9);
  }
  frag=vec4(outCol(c),1.0);
}`;

const VS_WATER = `#version 300 es
layout(location=0) in vec3 aPos; layout(location=2) in vec3 aCol;
uniform mat4 uVP; uniform mat4 uLVP; out vec3 vW; out float vDepth; out vec4 vL;
void main(){ vW=aPos; vDepth=aCol.r; vL=uLVP*vec4(aPos,1.0); gl_Position=uVP*vec4(aPos,1.0); }`;
const FS_WATER = `#version 300 es
${GLSL_COMMON}
in vec3 vW; in float vDepth; in vec4 vL; out vec4 frag;
uniform vec4 uRip[12]; uniform int uRipN; uniform vec3 uDeep; uniform vec3 uShallow; uniform float uScale;
uniform highp sampler2DShadow uShadow;
void main(){
  vec2 p=vW.xz*uScale;
  float t=uTime;
  vec2 g=vec2(0.0);
  g+=vec2(cos(p.x*1.3+t*1.1), sin(p.y*1.1+t*0.9))*0.06;
  g+=vec2(cos(p.x*2.7-p.y*1.9+t*1.7), cos(p.x*2.1+p.y*2.4-t*1.5))*0.04;
  g+=(vec2(vn(p*3.0+t*0.4), vn(p*3.0-t*0.37+7.0))-0.5)*0.12;
  for(int i=0;i<12;i++){ if(i>=uRipN) break; vec4 r=uRip[i]; float age=t-r.z; if(age<0.0||age>3.0) continue;
    vec2 d=vW.xz-r.xy; float dist=length(d); float ring=dist-age*3.2;
    float w=exp(-ring*ring*3.0)*exp(-age*1.3)*r.w;
    g+=normalize(d+1e-4)*cos(ring*9.0)*w*0.7; }
  vec3 N=normalize(vec3(-g.x,1.0,-g.y));
  vec3 V=normalize(uCam-vW);
  float fres=0.03+0.97*pow(1.0-max(dot(N,V),0.0),5.0);
  vec3 R=reflect(-V,N); vec3 refl=skyCol(vec3(R.x,abs(R.y),R.z));
  vec3 lp=vL.xyz/vL.w*0.5+0.5; float sh=1.0;
  if(lp.x>0.0&&lp.x<1.0&&lp.y>0.0&&lp.y<1.0&&lp.z<1.0) sh=texture(uShadow, vec3(lp.xy, lp.z-0.001));
  vec3 body=mix(uShallow, uDeep, smoothstep(0.0,1.2,vDepth))*(0.55+0.45*sh);
  vec3 H=normalize(uSun+V); float sp=pow(max(dot(N,H),0.0),400.0)*6.0*sh;
  vec3 col=mix(body, refl, fres)+uSunCol*sp;
  float alpha=clamp(0.45+vDepth*0.9,0.0,0.94);
  alpha=max(alpha, fres);
  col=applyFog(col, vW);
  frag=vec4(outCol(col), alpha);
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
  if(vKind<0.5){ // soft smoke puff
    float n=h(floor(vUv*3.0+vCol.rg*7.0));
    a=smoothstep(1.0,0.2,d)*(0.75+0.25*n);
  } else if(vKind<1.5){ // flame / glow (additive)
    a=pow(1.0-d,1.6);
  } else if(vKind<2.5){ // hard droplet / spark
    a=smoothstep(1.0,0.6,d);
  } else { // confetti square
    a=max(abs(vUv.x),abs(vUv.y))<0.7?1.0:0.0;
  }
  a*=vCol.a;
  frag=vec4(vCol.rgb*a, a);
}`;

function glCompile(vsSrc, fsSrc, name) {
  const mk = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      const lines = src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n');
      console.error(name + ' shader error:\n' + log + '\n' + lines.slice(0, 4000));
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
    water: glCompile(VS_WATER, FS_WATER, 'water'),
    part: glCompile(VS_PART, FS_PART, 'particles')
  };
  RND.skyVao = gl.createVertexArray();
  // particles
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

// mesh from builder arrays
function glMesh(verts, idx, opts = {}) {
  const m = { vao: gl.createVertexArray(), count: idx.length, cast: opts.cast !== false, name: opts.name || '', instCap: 0, instBuf: gl.createBuffer() };
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
}

// particles: x,y,z,size, r,g,b,a, rot, kind ; additive kinds go in second list
const PART = { alpha: [], add: [] };
function glPart(list, x, y, z, s, r, g, b, a, rot, kind) { list.push(x, y, z, s, r, g, b, a, rot, kind); }

function glSetCamera(eye, target, fov, aspect, up) {
  m4look(RND.view, eye[0], eye[1], eye[2], target[0], target[1], target[2], 0, 1, 0);
  m4persp(RND.proj, fov, aspect, 0.08, 900);
  m4mul(RND.vp, RND.proj, RND.view);
  m4inv(RND.invVP, RND.vp);
  RND.cam = eye.slice();
}
function glSetLight(center, radius) {
  const s = RND.sun, d = 160;
  const lv = m4(), lp = m4();
  // snap the light origin to shadow texels to avoid shimmering
  const ex = center[0] + s[0] * d, ey = center[1] + s[1] * d, ez = center[2] + s[2] * d;
  m4look(lv, ex, ey, ez, center[0], center[1], center[2], 0, 1, 0);
  m4ortho(lp, -radius, radius, -radius, radius, d - 70, d + 70);
  m4mul(RND.lightVP, lp, lv);
  const ts = 2 / RND.shadowSize;
  const ox = RND.lightVP[12] / ts, oy = RND.lightVP[13] / ts;
  RND.lightVP[12] += (Math.round(ox) - ox) * ts; RND.lightVP[13] += (Math.round(oy) - oy) * ts;
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

function glRender(w, h, waters) {
  // ---- shadow pass ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, RND.shadowFbo);
  gl.viewport(0, 0, RND.shadowSize, RND.shadowSize);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.6, 3.0);
  const S = RND.P.shadow; gl.useProgram(S.p); gl.uniformMatrix4fv(S.u.uLVP, false, RND.lightVP);
  glDrawQueue(true);
  gl.disable(gl.POLYGON_OFFSET_FILL);
  // ---- main pass ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, w, h);
  gl.clearColor(0.5, 0.6, 0.7, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const P = RND.P.main; gl.useProgram(P.p); glCommon(P);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, RND.shadowTex); gl.uniform1i(P.u.uShadow, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, RND.atlas); gl.uniform1i(P.u.uAtlas, 1);
  gl.uniform1f(P.u.uShTexel, 1 / RND.shadowSize); gl.uniform1i(P.u.uPcf, RND.pcf);
  glDrawQueue(false);
  // sky
  const K = RND.P.sky; gl.useProgram(K.p); glCommon(K); gl.uniformMatrix4fv(K.u.uInvVP, false, RND.invVP);
  gl.depthFunc(gl.LEQUAL); gl.depthMask(false);
  gl.bindVertexArray(RND.skyVao); gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.depthFunc(gl.LESS);
  // water
  const W = RND.P.water; gl.useProgram(W.p); glCommon(W);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, RND.shadowTex); gl.uniform1i(W.u.uShadow, 0);
  gl.uniform4fv(W.u.uRip, RND.ripples); gl.uniform1i(W.u.uRipN, RND.rippleN);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(true);
  for (const wt of waters) {
    gl.uniform3fv(W.u.uDeep, wt.deep); gl.uniform3fv(W.u.uShallow, wt.shallow); gl.uniform1f(W.u.uScale, wt.scale);
    gl.bindVertexArray(wt.mesh.vao); gl.drawElements(gl.TRIANGLES, wt.mesh.count, gl.UNSIGNED_INT, 0);
  }
  // particles
  gl.depthMask(false);
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

function glResetQueue(keepStatic) {
  for (const [m, q] of RND.queue) { if (keepStatic && m.isStatic) continue; q.n = 0; q.uploaded = false; }
  PART.alpha.length = 0; PART.add.length = 0;
}
