// ---------- WebGL2 renderer: instanced primitives, toon light, ink lines ----------
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: TEST });
if (!gl) { document.body.innerHTML = '<div style="padding:30px;font:20px sans-serif;color:#fff">This game needs WebGL2.</div>'; throw new Error('no webgl2'); }

const QUALITY = [
  { name: 'LOW', dpr: 1, scale: 0.8, shadow: 0, shq: 0, post: false, msaa: 0, products: false },
  { name: 'MED', dpr: 1.5, scale: 1, shadow: 1024, shq: 1, post: true, msaa: 4, products: true },
  { name: 'HIGH', dpr: 2, scale: 1, shadow: 2048, shq: 2, post: true, msaa: 4, products: true, budget: 3.2e6 },
  { name: 'MAX', dpr: 99, scale: 1, shadow: 4096, shq: 3, post: true, msaa: 4, products: true }
];

// ----- geometry -----
function geoBox() {
  const P = [], I = [];
  const F = [[0, 0, 1, 1, 0, 0, 0, 1, 0], [0, 0, -1, -1, 0, 0, 0, 1, 0], [1, 0, 0, 0, 0, -1, 0, 1, 0], [-1, 0, 0, 0, 0, 1, 0, 1, 0], [0, 1, 0, 1, 0, 0, 0, 0, -1], [0, -1, 0, 1, 0, 0, 0, 0, 1]];
  for (const f of F) {
    const n = [f[0], f[1], f[2]], u = [f[3], f[4], f[5]], v = [f[6], f[7], f[8]], b = P.length / 8;
    for (const [a, c] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.push(.5 * (n[0] + a * u[0] + c * v[0]), .5 * (n[1] + a * u[1] + c * v[1]), .5 * (n[2] + a * u[2] + c * v[2]), n[0], n[1], n[2], (a + 1) / 2, (c + 1) / 2);
    I.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return { P, I };
}
function geoCyl(seg = 14) {
  const P = [], I = [];
  for (let i = 0; i <= seg; i++) { const a = i / seg * TAU, x = Math.sin(a), z = Math.cos(a); P.push(x * .5, -.5, z * .5, x, 0, z, i / seg, 0, x * .5, .5, z * .5, x, 0, z, i / seg, 1); }
  for (let i = 0; i < seg; i++) { const b = i * 2; I.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
  for (const y of [-.5, .5]) {
    const c = P.length / 8; P.push(0, y, 0, 0, Math.sign(y), 0, .5, .5);
    for (let i = 0; i <= seg; i++) { const a = i / seg * TAU, x = Math.sin(a), z = Math.cos(a); P.push(x * .5, y, z * .5, 0, Math.sign(y), 0, x * .5 + .5, z * .5 + .5); }
    for (let i = 0; i < seg; i++) I.push(c, c + 1 + i, c + 2 + i);
  }
  return { P, I };
}
function geoSph(st = 9, sl = 14) {
  const P = [], I = [];
  for (let i = 0; i <= st; i++) {
    const v = i / st, ph = v * Math.PI;
    for (let j = 0; j <= sl; j++) { const u = j / sl, th = u * TAU, x = Math.sin(ph) * Math.sin(th), y = Math.cos(ph), z = Math.sin(ph) * Math.cos(th); P.push(x * .5, y * .5, z * .5, x, y, z, u, 1 - v); }
  }
  for (let i = 0; i < st; i++) for (let j = 0; j < sl; j++) { const a = i * (sl + 1) + j, b = a + sl + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
  return { P, I };
}
function geoQuad() { return { P: [-.5, -.5, 0, 0, 0, 1, 0, 0, .5, -.5, 0, 0, 0, 1, 1, 0, .5, .5, 0, 0, 0, 1, 1, 1, -.5, .5, 0, 0, 0, 1, 0, 1], I: [0, 1, 2, 0, 2, 3] }; }

const PRIMS = ['box', 'cyl', 'sph', 'quad'];
const GEO = {};
{
  const src = { box: geoBox(), cyl: geoCyl(), sph: geoSph(), quad: geoQuad() };
  for (const k of PRIMS) {
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(src[k].P), gl.STATIC_DRAW);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(src[k].I), gl.STATIC_DRAW);
    GEO[k] = { vb, ib, n: src[k].I.length };
  }
}

// ----- instance batches -----
const STRIDE = 24;
class Batch {
  constructor(prim, cap = 256) { this.prim = prim; this.cap = cap; this.d = new Float32Array(cap * STRIDE); this.n = 0; this.buf = gl.createBuffer(); this.vao = makeVAO(prim, this.buf); this.uploaded = -1; }
  clear() { this.n = 0; }
  push(m, c, uv) {
    if (this.n >= this.cap) { const nd = new Float32Array(this.cap * 2 * STRIDE); nd.set(this.d); this.d = nd; this.cap *= 2; }
    const o = this.n * STRIDE, d = this.d;
    for (let i = 0; i < 16; i++) d[o + i] = m[i];
    d[o + 16] = c[0]; d[o + 17] = c[1]; d[o + 18] = c[2]; d[o + 19] = c[3] || 0;
    if (uv) { d[o + 20] = uv[0]; d[o + 21] = uv[1]; d[o + 22] = uv[2]; d[o + 23] = uv[3]; } else d[o + 20] = d[o + 21] = d[o + 22] = d[o + 23] = 0;
    this.n++;
  }
  upload(usage) { gl.bindBuffer(gl.ARRAY_BUFFER, this.buf); gl.bufferData(gl.ARRAY_BUFFER, this.d.subarray(0, Math.max(1, this.n) * STRIDE), usage); this.uploaded = this.n; }
  draw() { if (!this.n) return; gl.bindVertexArray(this.vao); gl.drawElementsInstanced(gl.TRIANGLES, GEO[this.prim].n, gl.UNSIGNED_SHORT, 0, this.n); }
}
function makeVAO(prim, ibuf) {
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, GEO[prim].vb);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
  gl.enableVertexAttribArray(7); gl.vertexAttribPointer(7, 2, gl.FLOAT, false, 32, 24);
  gl.bindBuffer(gl.ARRAY_BUFFER, ibuf);
  for (let i = 0; i < 4; i++) { gl.enableVertexAttribArray(2 + i); gl.vertexAttribPointer(2 + i, 4, gl.FLOAT, false, STRIDE * 4, i * 16); gl.vertexAttribDivisor(2 + i, 1); }
  gl.enableVertexAttribArray(6); gl.vertexAttribPointer(6, 4, gl.FLOAT, false, STRIDE * 4, 64); gl.vertexAttribDivisor(6, 1);
  gl.enableVertexAttribArray(8); gl.vertexAttribPointer(8, 4, gl.FLOAT, false, STRIDE * 4, 80); gl.vertexAttribDivisor(8, 1);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, GEO[prim].ib);
  gl.bindVertexArray(null); return vao;
}
function makeSet() { const s = {}; for (const p of PRIMS) s[p] = new Batch(p); return s; }
const SET = { stat: makeSet(), semi: makeSet(), dyn: makeSet(), glass: makeSet() };
let SEMI_DIRTY = true;

// ----- scene building API -----
const _TL = new Float32Array(16), _TM = new Float32Array(16);
let PARENT = null, TGT = SET.dyn;
function put(prim, px, py, pz, ry, rx, rz, sx, sy, sz, col, uv) {
  compose(_TL, px, py, pz, ry, rx, rz, sx, sy, sz);
  if (PARENT) { M4.mul(_TM, PARENT, _TL); TGT[prim].push(_TM, col, uv); } else TGT[prim].push(_TL, col, uv);
}
const box = (px, py, pz, sx, sy, sz, col, ry = 0, uv) => put('box', px, py, pz, ry, 0, 0, sx, sy, sz, col, uv);
const cyl = (px, py, pz, r, h, col, rx = 0, rz = 0, ry = 0) => put('cyl', px, py, pz, ry, rx, rz, r * 2, h, r * 2, col);
const sph = (px, py, pz, r, col, sy = 1) => put('sph', px, py, pz, 0, 0, 0, r * 2, r * 2 * sy, r * 2, col);
// matrix stack for hierarchies
const MSTACK = []; for (let i = 0; i < 12; i++) MSTACK.push(new Float32Array(16));
let msp = 0;
function pushXf(px, py, pz, ry, rx = 0, rz = 0, s = 1) {
  const m = MSTACK[msp++]; compose(_TL, px, py, pz, ry, rx, rz, s, s, s);
  if (PARENT) M4.mul(m, PARENT, _TL); else m.set(_TL);
  PARENT = m;
}
function popXf() { msp--; PARENT = msp > 0 ? MSTACK[msp - 1] : null; }
// cylinder between two local points (limbs)
function limb(ax, ay, az, bx, by, bz, r, col) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = hyp(dx, dy, dz) || 1e-4;
  const ry = Math.atan2(dx, dz), rx = Math.acos(clamp(dy / L, -1, 1));
  put('cyl', (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, ry, rx, 0, r * 2, L, r * 2, col);
}

// ----- shaders -----
function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s), src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n')); throw new Error('shader'); } return s; }
function prog(vs, fs) {
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); throw new Error('link'); }
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i), nm = a.name.replace('[0]', ''); u[nm] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}
const VS_MAIN = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=7) in vec2 aUV;
layout(location=2) in vec4 m0; layout(location=3) in vec4 m1; layout(location=4) in vec4 m2; layout(location=5) in vec4 m3;
layout(location=6) in vec4 aC; layout(location=8) in vec4 aR;
uniform mat4 uVP; uniform mat4 uLVP;
out vec3 vW; out vec3 vN; out vec4 vC; out vec2 vUV; out vec4 vR; out vec4 vL;
void main(){ mat4 M=mat4(m0,m1,m2,m3); vec4 w=M*vec4(aP,1.); vW=w.xyz;
 vN=transpose(inverse(mat3(M)))*aN; vC=aC; vUV=aUV; vR=aR; vL=uLVP*w; gl_Position=uVP*w; }`;
const FS_MAIN = (mrt) => `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vW; in vec3 vN; in vec4 vC; in vec2 vUV; in vec4 vR; in vec4 vL;
uniform sampler2DShadow uSh; uniform sampler2D uAtlas; uniform vec3 uLD; uniform vec3 uCam; uniform int uShQ; uniform float uShTex;
uniform vec4 uPL[12]; uniform vec4 uPC[12]; uniform int uNPL; uniform float uAlpha; uniform float uTime;
layout(location=0) out vec4 oC;
${mrt ? 'layout(location=1) out vec4 oN;' : ''}
float shadowF(float nd){ if(uShQ==0) return 1.; vec3 p=vL.xyz/vL.w*.5+.5; if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.) return 1.;
 float b=0.0008+0.0018*(1.-clamp(nd,0.,1.)); float t=1./uShTex; float s=0.;
 if(uShQ==1){ s=texture(uSh,vec3(p.xy,p.z-b)); }
 else if(uShQ==2){ for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++) s+=texture(uSh,vec3(p.xy+vec2(i,j)*t,p.z-b)); s/=9.; }
 else { for(int i=-2;i<=2;i++)for(int j=-2;j<=2;j++) s+=texture(uSh,vec3(p.xy+vec2(i,j)*t*.75,p.z-b)); s/=25.; }
 return s; }
void main(){
 vec3 base=vC.rgb;
 if(vR.z>0.){ vec4 tx=texture(uAtlas, vR.xy+vUV*vR.zw); if(tx.a<.4) discard; base*=tx.rgb; }
 base=pow(max(base,0.),vec3(2.2));
 vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
 vec3 V=normalize(uCam-vW); float dist=length(uCam-vW);
 float inside=(1.-smoothstep(0.12,0.32,vW.z))*(1.-smoothstep(40.08,40.3,abs(vW.x)))*smoothstep(-56.3,-56.08,vW.z)*(1.-smoothstep(7.6,7.9,vW.y));
 float nd=dot(N,uLD);
 float band=smoothstep(-0.05,0.05,nd)*0.6+smoothstep(0.42,0.52,nd)*0.4;
 band*=mix(0.,1.,shadowF(nd));
 vec3 key=mix(vec3(0.20,0.27,0.52)*0.55, vec3(1.0,0.96,0.88)*1.05, inside);
 vec3 sky=mix(vec3(0.09,0.10,0.21), vec3(0.62,0.66,0.76), inside);
 vec3 gnd=mix(vec3(0.05,0.045,0.07), vec3(0.46,0.42,0.40), inside);
 vec3 hemi=mix(gnd,sky,N.y*.5+.5);
 vec3 col=base*(hemi+key*band);
 for(int i=0;i<12;i++){ if(i>=uNPL) break; vec3 L=uPL[i].xyz-vW; float d=length(L); float a=clamp(1.-d/uPL[i].w,0.,1.); a*=a;
   float df=smoothstep(-0.1,0.25,dot(N,L/d)); col+=base*uPC[i].rgb*a*(0.25+0.75*df); }
 float r=1.-max(dot(N,V),0.); col+=hemi*base*smoothstep(0.62,0.72,r)*0.45;
 float e=vC.a; col=col*(1.-min(e,1.))+base*e*1.4;
 vec3 fogc=mix(vec3(0.035,0.04,0.10), vec3(0.80,0.80,0.86), inside);
 float f=1.-exp(-dist*mix(0.022,0.004,inside)); col=mix(col,fogc,f*(1.-min(e,1.)*.5));
 col=(col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14);
 col=pow(clamp(col,0.,1.),vec3(1./2.2));
 oC=vec4(col,uAlpha<1.?uAlpha*(0.55+0.45*r):1.);
 ${mrt ? 'oN=vec4(N*.5+.5,1.);' : ''}
}`;
const VS_SH = `#version 300 es
layout(location=0) in vec3 aP; layout(location=2) in vec4 m0; layout(location=3) in vec4 m1; layout(location=4) in vec4 m2; layout(location=5) in vec4 m3;
uniform mat4 uLVP; void main(){ gl_Position=uLVP*mat4(m0,m1,m2,m3)*vec4(aP,1.); }`;
const FS_SH = `#version 300 es
precision mediump float; out vec4 o; void main(){ o=vec4(1.); }`;
const VS_FULL = `#version 300 es
const vec2 P[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3)); out vec2 vUV;
void main(){ vec2 p=P[gl_VertexID]; vUV=p*.5+.5; gl_Position=vec4(p,0.99999,1.); }`;
const FS_SKY = (mrt) => `#version 300 es
precision highp float; in vec2 vUV; uniform mat4 uIVP; uniform float uTime;
layout(location=0) out vec4 oC; ${mrt ? 'layout(location=1) out vec4 oN;' : ''}
float h(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
void main(){ vec4 a=uIVP*vec4(vUV*2.-1.,1.,1.); vec3 d=normalize(a.xyz/a.w);
 float y=d.y; vec3 top=vec3(0.02,0.03,0.10), mid=vec3(0.10,0.07,0.24), hor=vec3(0.55,0.25,0.30);
 vec3 c=mix(hor,mid,smoothstep(-0.02,0.18,y)); c=mix(c,top,smoothstep(0.15,0.7,y));
 vec3 q=floor(d*180.); float s=h(q); c+=vec3(step(0.9965,s)*smoothstep(0.05,0.3,y)*(0.6+0.4*sin(uTime*2.+s*60.)));
 oC=vec4(c,1.); ${mrt ? 'oN=vec4(0.5,1.,0.5,1.);' : ''} }`;
const FS_POST = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uC,uN,uD; uniform vec2 uPx; uniform float uNear,uFar,uInk;
out vec4 o;
float lin(float d){ float z=d*2.-1.; return 2.*uNear*uFar/(uFar+uNear-z*(uFar-uNear)); }
void main(){ vec3 c=texture(uC,vUV).rgb; float d0=lin(texture(uD,vUV).r); vec3 n0=texture(uN,vUV).rgb*2.-1.;
 float dd=0., nd=0.; vec2 off[4]=vec2[4](vec2(1,0),vec2(-1,0),vec2(0,1),vec2(0,-1));
 for(int i=0;i<4;i++){ vec2 uv=vUV+off[i]*uPx*uInk; float di=lin(texture(uD,uv).r); dd+=max(d0-di,0.); vec3 ni=texture(uN,uv).rgb*2.-1.; nd+=1.-clamp(dot(ni,n0),0.,1.); }
 float e=smoothstep(0.035,0.09,dd/d0)+smoothstep(0.3,0.7,nd);
 e=clamp(e,0.,1.)*(1.-smoothstep(35.,80.,d0));
 c=mix(c,c*0.16,e*0.85);
 vec2 v=vUV-.5; c*=1.-dot(v,v)*0.55;
 o=vec4(c,1.); }`;

const P_MAIN_MRT = prog(VS_MAIN, FS_MAIN(true)), P_MAIN = prog(VS_MAIN, FS_MAIN(false));
const P_SH = prog(VS_SH, FS_SH), P_POST = prog(VS_FULL, FS_POST);
const P_SKY_MRT = prog(VS_FULL, FS_SKY(true)), P_SKY = prog(VS_FULL, FS_SKY(false));
const EMPTY_VAO = gl.createVertexArray();

// ----- atlas (signs, product prints) -----
const ATLAS = { cv: document.createElement('canvas'), tex: gl.createTexture(), rects: {} };
ATLAS.cv.width = 2048; ATLAS.cv.height = 2048;
const actx = ATLAS.cv.getContext('2d');
let atX = 0, atY = 0, atRow = 0;
function atlasRect(name, w, h, draw) {
  if (atX + w > 2048) { atX = 0; atY += atRow + 2; atRow = 0; }
  actx.save(); actx.translate(atX, atY); actx.beginPath(); actx.rect(0, 0, w, h); actx.clip(); draw(actx, w, h); actx.restore();
  // uv with flipY: canvas row 0 -> v=1
  ATLAS.rects[name] = [(atX + .5) / 2048, 1 - (atY + h - .5) / 2048, (w - 1) / 2048, (h - 1) / 2048];
  atX += w + 2; atRow = Math.max(atRow, h);
  return ATLAS.rects[name];
}
function atlasUpload() {
  gl.bindTexture(gl.TEXTURE_2D, ATLAS.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ATLAS.cv); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const an = gl.getExtension('EXT_texture_filter_anisotropic'); if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, 8);
}

// ----- render targets -----
const RT = { w: 0, h: 0, q: -1, shadowSize: 0 };
function makeTex(w, h, ifmt, fmt, type, filter) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t;
}
function freeRT() {
  for (const k of ['msFbo', 'rsFbo', 'rsFboN', 'dFboR']) if (RT[k]) gl.deleteFramebuffer(RT[k]);
  for (const k of ['msC', 'msN', 'msD']) if (RT[k]) gl.deleteRenderbuffer(RT[k]);
  for (const k of ['tC', 'tN', 'tD']) if (RT[k]) gl.deleteTexture(RT[k]);
  RT.msFbo = null;
}
function setupShadow(size) {
  if (RT.shadowSize === size) return;
  if (RT.shTex) { gl.deleteTexture(RT.shTex); gl.deleteFramebuffer(RT.shFbo); }
  RT.shadowSize = size;
  if (!size) { RT.shTex = makeTex(1, 1, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, gl.NEAREST); }
  else RT.shTex = makeTex(size, size, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, gl.LINEAR);
  gl.bindTexture(gl.TEXTURE_2D, RT.shTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  RT.shFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, RT.shFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, RT.shTex, 0);
  gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function setupRT(w, h, q) {
  const Q = QUALITY[q];
  setupShadow(Q.shadow);
  if (RT.w === w && RT.h === h && RT.q === q) return;
  freeRT(); RT.w = w; RT.h = h; RT.q = q;
  if (!Q.post) return;
  const samples = Math.min(Q.msaa, gl.getParameter(gl.MAX_SAMPLES));
  RT.msFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, RT.msFbo);
  const rb = (fmt, att) => { const r = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, r); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, fmt, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, att, gl.RENDERBUFFER, r); return r; };
  RT.msC = rb(gl.RGBA8, gl.COLOR_ATTACHMENT0); RT.msN = rb(gl.RGBA8, gl.COLOR_ATTACHMENT1); RT.msD = rb(gl.DEPTH_COMPONENT24, gl.DEPTH_ATTACHMENT);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  RT.tC = makeTex(w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.NEAREST); RT.tN = makeTex(w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.NEAREST);
  RT.tD = makeTex(w, h, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, gl.NEAREST);
  RT.rsFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, RT.rsFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, RT.tC, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, RT.tD, 0);
  RT.rsFboN = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, RT.rsFboN);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, RT.tN, 0);
  const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER); if (st !== gl.FRAMEBUFFER_COMPLETE) console.warn('fbo', st);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// ----- camera + lights state -----
const CAM = { pos: [0, 5, 10], tgt: [0, 0, 0], fov: 62 * Math.PI / 180, near: 0.15, far: 260, V: new Float32Array(16), P: new Float32Array(16), VP: new Float32Array(16), IVP: new Float32Array(16) };
const LIGHT = { dir: [0.28, 0.92, 0.27], LVP: new Float32Array(16) };
{ const l = hyp(...LIGHT.dir); LIGHT.dir = LIGHT.dir.map(v => v / l); }
const PL = new Float32Array(48), PC = new Float32Array(48); let NPL = 0;
const RSTAT = { scale: 1, draws: 0, inst: 0, fps: 60 };

function drawSet(set, prog) { for (const p of PRIMS) { const b = set[p]; if (b.n) { b.draw(); RSTAT.draws++; RSTAT.inst += b.n; } } }
function bindMain(P, w, h) {
  gl.useProgram(P.p); const u = P.u;
  gl.uniformMatrix4fv(u.uVP, false, CAM.VP); gl.uniformMatrix4fv(u.uLVP, false, LIGHT.LVP);
  gl.uniform3fv(u.uLD, LIGHT.dir); gl.uniform3fv(u.uCam, CAM.pos); gl.uniform1i(u.uShQ, QUALITY[RT.q].shadow ? QUALITY[RT.q].shq : 0);
  gl.uniform1f(u.uShTex, RT.shadowSize || 1); gl.uniform4fv(u.uPL, PL); gl.uniform4fv(u.uPC, PC); gl.uniform1i(u.uNPL, NPL);
  gl.uniform1f(u.uAlpha, 1); gl.uniform1f(u.uTime, performance.now() / 1000);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, RT.shTex); gl.uniform1i(u.uSh, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ATLAS.tex); gl.uniform1i(u.uAtlas, 1);
}
function renderFrame(q) {
  const Q = QUALITY[q];
  const cssW = canvas.clientWidth || innerWidth, cssH = canvas.clientHeight || innerHeight;
  let dpr = Math.min(devicePixelRatio || 1, Q.dpr) * Q.scale;
  if (Q.budget && cssW * cssH * dpr * dpr > Q.budget) dpr = Math.sqrt(Q.budget / (cssW * cssH));
  RSTAT.scale = dpr;
  const w = Math.max(2, Math.round(cssW * dpr)), h = Math.max(2, Math.round(cssH * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  setupRT(w, h, q);
  RSTAT.draws = 0; RSTAT.inst = 0;
  // matrices
  const asp = w / h; let fov = CAM.fov; if (asp < 1.1) fov = 2 * Math.atan(Math.tan(CAM.fov / 2) * Math.min(1.75, 1.1 / asp));
  M4.persp(CAM.P, fov, asp, CAM.near, CAM.far); M4.lookAt(CAM.V, CAM.pos, CAM.tgt, [0, 1, 0]); M4.mul(CAM.VP, CAM.P, CAM.V); M4.invert(CAM.IVP, CAM.VP);
  // upload dynamic
  for (const p of PRIMS) { SET.dyn[p].upload(gl.DYNAMIC_DRAW); SET.glass[p].upload(gl.DYNAMIC_DRAW); if (SET.stat[p].uploaded !== SET.stat[p].n) SET.stat[p].upload(gl.STATIC_DRAW); if (SEMI_DIRTY) SET.semi[p].upload(gl.DYNAMIC_DRAW); }
  SEMI_DIRTY = false;
  gl.disable(gl.CULL_FACE); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND);
  // shadow pass
  if (Q.shadow) {
    const ext = q >= 3 ? 34 : 26, c = SHADOW_CENTER, L = LIGHT.dir;
    const lv = new Float32Array(16), lp = new Float32Array(16);
    const texel = ext * 2 / Q.shadow;
    const eye = [c[0] + L[0] * 40, c[1] + L[1] * 40, c[2] + L[2] * 40];
    M4.lookAt(lv, eye, c, [0, 0, -1]);
    // snap to texels to stop shimmer
    lv[12] = Math.round(lv[12] / texel) * texel; lv[13] = Math.round(lv[13] / texel) * texel;
    M4.ortho(lp, -ext, ext, -ext, ext, 1, 90); M4.mul(LIGHT.LVP, lp, lv);
    gl.bindFramebuffer(gl.FRAMEBUFFER, RT.shFbo); gl.viewport(0, 0, Q.shadow, Q.shadow); gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(P_SH.p); gl.uniformMatrix4fv(P_SH.u.uLVP, false, LIGHT.LVP);
    gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3);
    for (const p of ['box', 'cyl', 'sph']) { SET.stat[p].draw(); SET.semi[p].draw(); SET.dyn[p].draw(); }
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }
  const mrt = Q.post;
  gl.bindFramebuffer(gl.FRAMEBUFFER, mrt ? RT.msFbo : null); gl.viewport(0, 0, w, h);
  gl.clearColor(0.03, 0.03, 0.08, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // sky
  const PS = mrt ? P_SKY_MRT : P_SKY; gl.useProgram(PS.p); gl.uniformMatrix4fv(PS.u.uIVP, false, CAM.IVP); gl.uniform1f(PS.u.uTime, performance.now() / 1000);
  gl.depthMask(false); gl.bindVertexArray(EMPTY_VAO); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.depthMask(true);
  // scene
  const PM = mrt ? P_MAIN_MRT : P_MAIN; bindMain(PM, w, h);
  drawSet(SET.stat); drawSet(SET.semi); drawSet(SET.dyn);
  // glass
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
  if (mrt) gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]);
  gl.uniform1f(PM.u.uAlpha, 0.28); drawSet(SET.glass);
  if (mrt) gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  gl.depthMask(true); gl.disable(gl.BLEND);
  if (mrt) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, RT.msFbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, RT.rsFbo); gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, RT.rsFboN); gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h); gl.disable(gl.DEPTH_TEST);
    gl.useProgram(P_POST.p); const u = P_POST.u;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, RT.tC); gl.uniform1i(u.uC, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, RT.tN); gl.uniform1i(u.uN, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, RT.tD); gl.uniform1i(u.uD, 2);
    gl.uniform2f(u.uPx, 1 / w, 1 / h); gl.uniform1f(u.uNear, CAM.near); gl.uniform1f(u.uFar, CAM.far); gl.uniform1f(u.uInk, Math.max(1, h / 900));
    gl.bindVertexArray(EMPTY_VAO); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.enable(gl.DEPTH_TEST);
  }
  gl.bindVertexArray(null);
}
const SHADOW_CENTER = [0, 0, 0];
function project(x, y, z, out) {
  const m = CAM.VP, cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (cw < 0.2) return false;
  out[0] = (cx / cw * .5 + .5) * (canvas.clientWidth || innerWidth); out[1] = (1 - (cy / cw * .5 + .5)) * (canvas.clientHeight || innerHeight); out[2] = cw; return true;
}
