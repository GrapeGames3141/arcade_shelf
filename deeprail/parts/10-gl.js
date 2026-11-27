// ===== WebGL2 renderer: context, shared uniform block, meshes, instanced batches, HDR multi-pass targets =====
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: TEST });
if (!gl) { document.body.innerHTML = '<div style="color:#fff;font:20px sans-serif;padding:40px">Deep Rail needs WebGL2. Try a current Chrome, Edge, Firefox or Safari.</div>'; throw new Error('no webgl2'); }
const EXT_CBF = URLP.has('nofloat') ? null : gl.getExtension('EXT_color_buffer_float');
gl.getExtension('OES_texture_float_linear');
const HDR = !!EXT_CBF;
const CFMT = HDR ? gl.RGBA16F : gl.RGBA8;

// ---------- shared per-frame uniform block (std140, only mat4/vec4 so offsets are trivial) ----------
const UB_FIELDS = [
  ['mat4', 'uVP'], ['mat4', 'uView'], ['mat4', 'uInvVP'],
  ['vec4', 'uCam'],     // camera pos, unused
  ['vec4', 'uTime'],    // time, light count, noise octaves, flash
  ['vec4', 'uFog'],     // fog rgb, density
  ['vec4', 'uAmb'],     // ambient rgb, unused
  ['vec4', 'uClip'],    // near, far, viewport w, h
  ['vec4', 'uHeadP'],   // headlamp pos, intensity
  ['vec4', 'uHeadD'],   // headlamp dir, cos(cutoff)
  ['vec4', 'uRiver'],   // river centre (y = water level), yaw
  ['vec4', 'uRiverR'],  // river half sizes x, z, enabled, flow speed
  ['vec4', 'uLP', MAXL],// light pos, range
  ['vec4', 'uLC', MAXL],// light colour * intensity, kind
];
const UB = (() => {
  const off = {}; let o = 0;
  for (const [t, n, c] of UB_FIELDS) { off[n] = o; o += (t === 'mat4' ? 16 : 4) * (c || 1); }
  const glsl = 'layout(std140) uniform F {\n' + UB_FIELDS.map(([t, n, c]) => `  ${t} ${n}${c ? '[' + c + ']' : ''};`).join('\n') + '\n};\n';
  const data = new Float32Array(o), buf = gl.createBuffer();
  gl.bindBuffer(gl.UNIFORM_BUFFER, buf); gl.bufferData(gl.UNIFORM_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, buf);
  return { off, glsl, data, buf, set(n, v, i) { this.data.set(v, this.off[n] + (i || 0) * 4); }, upload() { gl.bindBuffer(gl.UNIFORM_BUFFER, this.buf); gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.data); } };
})();

// fixed texture units for every sampler (set once at link time)
const TU = { uScene: 1, uDepth: 2, uSrc: 3, uBloom: 4, uDepthS: 5 };

function compile(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); console.error(log + '\n' + src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n')); throw new Error('shader compile: ' + log); }
  return s;
}
function program(vs, fs, defs) {
  const head = '#version 300 es\nprecision highp float;\nprecision highp int;\n' + (defs || '') + '\n' + UB.glsl + GLSL_COMMON;
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, head + vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, head + fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
  const bi = gl.getUniformBlockIndex(p, 'F'); if (bi !== 0xFFFFFFFF) gl.uniformBlockBinding(p, bi, 0);
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  gl.useProgram(p);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i); const name = info.name.replace(/\[0\]$/, '');
    u[name] = gl.getUniformLocation(p, name);
    if (TU[name] !== undefined) gl.uniform1i(u[name], TU[name]);
  }
  return { p, u };
}

// ---------- GLSL shared by every program: noise, lights, fog ----------
const GLSL_COMMON = `
float hash13(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 gIrr;  // diffuse light that reached the last shaded point (caustics reuse it)
vec3 lightAll(vec3 P, vec3 N, vec3 Vd, vec3 alb, float shin, float spec, float ao){
  vec3 dif = uAmb.rgb * ao, sp = vec3(0.);
  { vec3 L = uHeadP.xyz - P; float d2 = max(dot(L, L), 1e-4); vec3 l = L * inversesqrt(d2);
    float cone = smoothstep(uHeadD.w, uHeadD.w + .14, dot(-l, uHeadD.xyz));
    float att = uHeadP.w * cone / (1. + d2) * clamp(1. - d2 / 1600., 0., 1.);
    vec3 c = att * vec3(1., .84, .62); dif += c * max(dot(N, l), 0.); sp += c * pow(max(dot(N, normalize(l + Vd)), 0.), shin); }
  int n = int(uTime.y);
  for (int i = 0; i < ${MAXL}; i++) {
    if (i >= n) break;
    vec4 lp = uLP[i]; vec3 L = lp.xyz - P; float d2 = dot(L, L); float r2 = lp.w * lp.w;
    if (d2 > r2) continue;
    vec3 l = L * inversesqrt(max(d2, 1e-4)); float w = 1. - d2 / r2; float att = uLC[i].w > .5 ? w * w * .05 : w * w / (1. + d2);
    vec3 c = uLC[i].rgb * att;
    dif += c * max(dot(N, l) * .9 + .1, 0.);
    sp += c * pow(max(dot(N, normalize(l + Vd)), 0.), shin);
  }
  gIrr = dif;
  return alb * dif + sp * spec;
}
vec3 fogit(vec3 c, float d){ return mix(c, uFog.rgb, 1. - exp(-d * uFog.w)); }
`;

// ---------- lit opaque geometry (props, creatures, track; ROCK variant for cave walls) ----------
const LIT_VS = `
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec4 aCol;
#ifndef ROCK
layout(location=3) in vec4 aM0; layout(location=4) in vec4 aM1; layout(location=5) in vec4 aM2; layout(location=6) in vec4 aM3;
layout(location=7) in vec4 aTint; layout(location=8) in vec4 aEmi;
#endif
out vec3 vP; out vec3 vN; out vec4 vCol; out vec4 vEmi; out vec3 vLoc;
void main(){
#ifdef ROCK
  vP = aPos; vN = aNrm; vCol = aCol; vEmi = vec4(0.); vLoc = aPos;
#else
  mat4 M = mat4(aM0, aM1, aM2, aM3); vec4 wp = M * vec4(aPos, 1.); vP = wp.xyz;
  mat3 m3 = mat3(M); vN = normalize(transpose(inverse(m3)) * aNrm);
  vCol = vec4(aCol.rgb * aTint.rgb, max(aCol.a, aTint.a)); vEmi = aEmi; vLoc = aPos;
#endif
  gl_Position = uVP * vec4(vP, 1.);
}`;
const LIT_FS = `
in vec3 vP; in vec3 vN; in vec4 vCol; in vec4 vEmi; in vec3 vLoc;
out vec4 o;
#ifdef ROCK
uniform vec4 uCutA[6]; uniform vec4 uCutB[6]; uniform int uNCut;
uniform vec4 uEll[3]; uniform vec4 uEllR[3]; uniform int uNEll;
float caust(vec2 p, float t){
  vec2 q = p; float c = 0.;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    q += vec2(sin(q.y * 1.3 + t * (.7 + fi * .2) + fi), cos(q.x * 1.1 - t * (.6 + fi * .25) - fi * 1.7)) * .55;
    c += .9 / (1. + 22. * abs(sin(q.x * 1.6) * sin(q.y * 1.6)));
  }
  return pow(c / 3., 2.2) * 2.6;
}
#endif
void main(){
#ifdef ROCK
  for (int i = 0; i < 6; i++) { if (i >= uNCut) break;
    vec3 a = uCutA[i].xyz, ba = uCutB[i].xyz - a, pa = vP - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
    if (length(pa - ba * h) < uCutA[i].w && vP.y > uCutB[i].w) discard; }
  for (int i = 0; i < 3; i++) { if (i >= uNEll) break;
    vec3 d = vP - uEll[i].xyz; float c = cos(uEll[i].w), s = sin(uEll[i].w);
    vec3 l = vec3(c * d.x - s * d.z, d.y, -s * d.x - c * d.z) / uEllR[i].xyz;
    if (dot(l, l) < 1. && vP.y > uEllR[i].w) discard; }
#endif
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 toC = uCam.xyz - vP; float dist = length(toC); vec3 Vd = toC / max(dist, 1e-4);
  vec3 alb = vCol.rgb; float shin = 18., spec = .05, ao = 1.;
#ifdef ROCK
  ao = vCol.a;
  // procedural rock: strata bands, speckle, and bump from screen-space derivatives of a height noise
  float oct = uTime.z;
  float h = vn(vP * 2.3) * .45;
  if (oct > 1.5) h += vn(vP * 6.1 + 7.) * .3;
  if (oct > 2.5) h += vn(vP * 15.3 + 3.) * .18;
  float band = vn(vec3(vP.x * .08, vP.y * 2.6, vP.z * .08)), fine = vn(vP * vec3(9., 22., 9.));
  alb *= .8 + .32 * (band - .5) + .3 * (h - .45) + .12 * (fine - .5);
  float wet = smoothstep(.62, .78, vn(vP * vec3(.7, .15, .7)));
  spec = .05 + .45 * wet; shin = 22. + 50. * wet; alb *= 1. - .3 * wet;
  vec3 dpx = dFdx(vP), dpy = dFdy(vP); float dhx = dFdx(h), dhy = dFdy(h);
  vec3 r1 = cross(dpy, N), r2 = cross(N, dpx); float det = dot(dpx, r1);
  vec3 g = sign(det) * (dhx * r1 + dhy * r2);
  N = normalize(abs(det) * N - g * .55);
#else
  float mat = floor(vCol.a * 4. + .5);
  if (mat == 1.) { float gr = vn(vec3(vLoc.x * 3., vLoc.y * 3., vLoc.z * 40.) + vP * .2); alb *= .7 + .5 * gr; spec = .03; }
  else if (mat == 2.) { spec = .7; shin = 70.; alb *= .9 + .2 * vn(vP * 9.); }
  else if (mat == 3.) { spec = .3; shin = 36.; }
  else if (mat == 4.) { spec = .9; shin = 110.; }
#endif
  vec3 col = lightAll(vP, N, Vd, alb, shin, spec, ao);
#ifdef ROCK
  if (uRiverR.z > .5) {
    vec3 d = vP - uRiver.xyz; float c = cos(uRiver.w), s = sin(uRiver.w);
    vec2 l = vec2(c * d.x - s * d.z, -s * d.x - c * d.z);
    float inside = 1. - smoothstep(.85, 1., length(l / uRiverR.xy));
    float above = d.y;
    float k = above > 0. ? exp(-above * .32) * .9 : 1.4;
    if (inside > 0. && above < 10.) {
      float ca = caust(l * .55 + vec2(0., uTime.x * uRiverR.w * .3), uTime.x * 1.3);
      col += alb * (gIrr + vec3(.02, .05, .07)) * ca * k * inside * 1.4;
    }
  }
#endif
  col += vEmi.rgb;
  o = vec4(fogit(col, dist), 1.);
}`;

// ---------- water surface: refraction of a copy of the opaque frame, absorption by thickness, light glints ----------
const WATER_VS = `
layout(location=0) in vec3 aPos;
uniform mat4 uM;
out vec3 vP; out vec2 vL;
void main(){ vec4 wp = uM * vec4(aPos, 1.); vL = aPos.xz; vP = wp.xyz; gl_Position = uVP * wp; }`;
const WATER_FS = `
in vec3 vP; in vec2 vL; out vec4 o;
uniform sampler2D uScene; uniform sampler2D uDepth; uniform float uRefract;
float linz(float d){ float n = uClip.x, f = uClip.y; float z = d * 2. - 1.; return 2. * n * f / (f + n - z * (f - n)); }
void main(){
  float t = uTime.x, fl = uRiverR.w;
  vec2 q1 = vL * .45 + vec2(0., t * fl * .55), q2 = vL * 1.3 + vec2(t * .07, t * fl * 1.1);
  float e = .04;
  float h1 = vn(vec3(q1, t * .2)) + .5 * vn(vec3(q2, t * .35));
  float hx = vn(vec3(q1 + vec2(e, 0.), t * .2)) + .5 * vn(vec3(q2 + vec2(e * 2.9, 0.), t * .35));
  float hz = vn(vec3(q1 + vec2(0., e), t * .2)) + .5 * vn(vec3(q2 + vec2(0., e * 2.9), t * .35));
  vec3 N = normalize(vec3(-(hx - h1) / e * .09, 1., -(hz - h1) / e * .09));
  vec3 toC = uCam.xyz - vP; float dist = length(toC); vec3 Vd = toC / dist;
  vec2 uv = gl_FragCoord.xy / uClip.zw;
  vec3 under = vec3(.004, .012, .016);
  if (uRefract > .5) {
    float zs = linz(texture(uDepth, uv).r), zw = linz(gl_FragCoord.z);
    vec2 uv2 = uv + N.xz * .045 * clamp((zs - zw) * .3, 0., 1.);
    float zs2 = linz(texture(uDepth, uv2).r); if (zs2 < zw) uv2 = uv; else zs = zs2;
    float th = max(zs - zw, 0.);
    vec3 bed = texture(uScene, uv2).rgb;
    bed = mix(bed, vec3(0.), clamp(1. - exp(-dist * uFog.w), 0., 1.) * 0.);
    under = bed * exp(-th * vec3(.55, .22, .14)) + vec3(.003, .01, .013) * (1. - exp(-th * .5));
  }
  float fr = .02 + .98 * pow(1. - max(dot(N, Vd), 0.), 5.);
  vec3 refl = vec3(.002, .004, .006), irr = vec3(0.);
  int n = int(uTime.y);
  for (int i = 0; i < ${MAXL}; i++) { if (i >= n) break;
    vec3 L = uLP[i].xyz - vP; float d2 = dot(L, L); float r = uLP[i].w * 1.6; if (d2 > r * r) continue;
    vec3 l = L * inversesqrt(d2); vec3 H = normalize(l + Vd); float w = 1. - d2 / (r * r);
    refl += uLC[i].rgb * (pow(max(dot(N, H), 0.), 260.) * 6. + pow(max(dot(N, H), 0.), 40.) * .8) / (1. + d2 * .05) * w;
    irr += uLC[i].rgb * w * w * (uLC[i].w > .5 ? .05 : 1. / (1. + d2)) * max(l.y, 0.);
  }
  float foam = smoothstep(.62, .9, vn(vec3(vL.x * .7, vL.y * .16 + t * fl * .9, t * .15))) * .5 + smoothstep(.75, .95, vn(vec3(vL * 2.2 + vec2(0., t * fl * 1.6), 3.)));
  under += irr * (vec3(.012, .03, .036) + foam * vec3(.05, .06, .06));
  { vec3 L = uHeadP.xyz - vP; float d2 = dot(L, L); vec3 l = L * inversesqrt(d2); vec3 H = normalize(l + Vd);
    refl += uHeadP.w * vec3(1., .84, .62) * pow(max(dot(N, H), 0.), 200.) * 4. / (1. + d2 * .1); }
  vec3 R = reflect(-Vd, N);
  float worms = step(.9965, hash13(floor(R * 140.))) * (.5 + .5 * sin(t * 1.3 + hash13(floor(R * 140.) + 7.) * 40.));
  refl += vec3(.008, .028, .032) + worms * vec3(.4, 1.6, 1.3) * smoothstep(.1, .5, R.y);
  vec3 col = mix(under, refl * 3., fr) + refl * .5;
  o = vec4(fogit(col, dist), 1.);
}`;

// ---------- additive / alpha glow billboards: sparks, flares, eyes, tracers, dust ----------
const GLOW_VS = `
layout(location=0) in vec2 aC; layout(location=1) in vec4 aA; layout(location=2) in vec4 aB; layout(location=3) in vec4 aT;
out vec2 vUV; out vec4 vB; out float vD;
void main(){
  vec3 camR = vec3(uView[0][0], uView[1][0], uView[2][0]), camU = vec3(uView[0][1], uView[1][1], uView[2][1]);
  vec3 w; float sh = aB.w;
  if (sh > .5 && sh < 1.5) {
    vec3 ax = aT.xyz - aA.xyz, mid = (aA.xyz + aT.xyz) * .5;
    vec3 side = normalize(cross(ax, uCam.xyz - mid) + vec3(1e-5)) * aA.w;
    w = mid + ax * .5 * aC.y + side * aC.x;
  } else {
    float a = aT.w; vec2 c = vec2(cos(a) * aC.x - sin(a) * aC.y, sin(a) * aC.x + cos(a) * aC.y);
    w = aA.xyz + (camR * c.x + camU * c.y) * aA.w;
  }
  vUV = aC; vB = aB; vD = length(uCam.xyz - w);
  gl_Position = uVP * vec4(w, 1.);
}`;
const GLOW_FS = `
in vec2 vUV; in vec4 vB; in float vD; out vec4 o;
uniform float uAlpha;
void main(){
  float r2 = dot(vUV, vUV), sh = vB.w, a;
  if (sh < .5) a = exp(-r2 * 4.5) * (1. - smoothstep(.8, 1., r2));
  else if (sh < 1.5) a = exp(-vUV.x * vUV.x * 5.) * (1. - vUV.y * vUV.y) ;
  else if (sh < 2.5) a = exp(-pow(sqrt(r2) - .72, 2.) * 70.);
  else if (sh < 3.5) a = smoothstep(1., .55, r2) + exp(-r2 * 2.) * .4;
  else a = smoothstep(1., 0., r2) * (.6 + .4 * hash13(vec3(floor(vUV * 3.), sh)));
  float f = exp(-vD * uFog.w * .8);
  if (uAlpha > .5) o = vec4(vB.rgb * a * f, a * clamp(sh - 4., 0., 1.));
  else o = vec4(vB.rgb * a * f, 0.);
}`;

// ---------- fullscreen passes ----------
const FS_VS = `out vec2 vUV; void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); vUV = p; gl_Position = vec4(p * 2. - 1., 0., 1.); }`;
const DOWN_FS = `
in vec2 vUV; out vec4 o; uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uKaris;
vec3 sm(vec2 uv){ vec3 c = texture(uSrc, uv).rgb; if (any(isnan(c)) || any(isinf(c))) c = vec3(0.); return min(c, vec3(4000.)); }
void main(){
  vec2 d = uTexel;
  vec3 a = sm(vUV + d * vec2(-1, -1)), b = sm(vUV + d * vec2(1, -1)), c = sm(vUV + d * vec2(-1, 1)), e = sm(vUV + d * vec2(1, 1)), m = sm(vUV);
  if (uKaris > .5) {
    float wa = 1. / (1. + dot(a, vec3(.3, .6, .1))), wb = 1. / (1. + dot(b, vec3(.3, .6, .1))), wc = 1. / (1. + dot(c, vec3(.3, .6, .1))), we = 1. / (1. + dot(e, vec3(.3, .6, .1))), wm = 1. / (1. + dot(m, vec3(.3, .6, .1)));
    o = vec4((a * wa + b * wb + c * wc + e * we + m * wm * 2.) / (wa + wb + wc + we + wm * 2.), 1.);
  } else o = vec4((a + b + c + e) * .125 + m * .5, 1.);
}`;
const UP_FS = `
in vec2 vUV; out vec4 o; uniform sampler2D uSrc; uniform vec2 uTexel; uniform float uW;
void main(){
  vec2 d = uTexel; vec3 s = texture(uSrc, vUV).rgb * 4.;
  s += (texture(uSrc, vUV + vec2(d.x, 0.)).rgb + texture(uSrc, vUV - vec2(d.x, 0.)).rgb + texture(uSrc, vUV + vec2(0., d.y)).rgb + texture(uSrc, vUV - vec2(0., d.y)).rgb) * 2.;
  s += texture(uSrc, vUV + d).rgb + texture(uSrc, vUV - d).rgb + texture(uSrc, vUV + vec2(d.x, -d.y)).rgb + texture(uSrc, vUV + vec2(-d.x, d.y)).rgb;
  o = vec4(s / 16. * uW, 1.);
}`;
const SCAT_FS = `
in vec2 vUV; out vec4 o; uniform sampler2D uDepthS; uniform int uNS; uniform float uDen;
void main(){
  float d = texture(uDepthS, vUV).r;
  vec4 wp = uInvVP * vec4(vUV * 2. - 1., d * 2. - 1., 1.); vec3 P = wp.xyz / wp.w;
  vec3 ro = uCam.xyz, rd = P - ro; float T = length(rd); rd /= T; T = min(T, 90.);
  vec3 s = vec3(0.);
  for (int i = 0; i < 16; i++) { if (i >= uNS) break; if (uLC[i].w > .5) continue;
    vec3 lp = uLP[i].xyz; float s0 = dot(lp - ro, rd); vec3 cp = ro + rd * s0; float h = max(length(lp - cp), .25);
    float I = (atan((T - s0) / h) - atan(-s0 / h)) / h;
    s += uLC[i].rgb * I * min(1., uLP[i].w / 12.);
  }
  { vec3 lp = uHeadP.xyz + uHeadD.xyz * 3.; float s0 = dot(lp - ro, rd); vec3 cp = ro + rd * s0; float h = max(length(lp - cp), .4);
    s += uHeadP.w * vec3(1., .84, .62) * (atan((T - s0) / h) - atan(-s0 / h)) / h * .25; }
  o = vec4(s * uDen * exp(-T * uFog.w * .3), 0.);
}`;
const COMP_FS = `
in vec2 vUV; out vec4 o; uniform sampler2D uScene; uniform sampler2D uBloom;
uniform float uExpo, uBloomK, uHurt, uFade, uGrain; uniform vec3 uFadeCol;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
void main(){
  vec3 c = texture(uScene, vUV).rgb; if (any(isnan(c)) || any(isinf(c))) c = vec3(0.);
  vec3 b = texture(uBloom, vUV).rgb; if (any(isnan(b)) || any(isinf(b))) b = vec3(0.);
  c = c + b * uBloomK;
  c *= uExpo;
  vec2 q = vUV - .5; float vig = 1. - dot(q, q) * 1.1;
  c *= vig;
  c = aces(c);
  c = pow(c, vec3(1. / 2.2));
  float hr = uHurt * smoothstep(.15, .75, length(q * vec2(1.4, 1.)));
  c = mix(c, vec3(.55, .02, .02), hr * .65);
  c += (hash13(vec3(gl_FragCoord.xy, uTime.x * 60.)) - .5) * uGrain;
  c = mix(c, uFadeCol, uFade);
  o = vec4(c, 1.);
}`;

// ---------- programs ----------
const PROG = {};
function buildPrograms() {
  PROG.lit = program(LIT_VS, LIT_FS, '');
  PROG.rock = program(LIT_VS, LIT_FS, '#define ROCK');
  PROG.water = program(WATER_VS, WATER_FS, '');
  PROG.glow = program(GLOW_VS, GLOW_FS, '');
  PROG.down = program(FS_VS, DOWN_FS, '');
  PROG.up = program(FS_VS, UP_FS, '');
  PROG.scat = program(FS_VS, SCAT_FS, '');
  PROG.comp = program(FS_VS, COMP_FS, '');
}

// ---------- meshes ----------
// d = { pos: Float32Array, nrm: Float32Array, col: Uint8Array (rgba), idx: Uint16/32Array }
function makeMesh(d) {
  const m = { vao: gl.createVertexArray(), n: d.idx.length, type: d.idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
  gl.bindVertexArray(m.vao);
  m.pb = vbuf(0, d.pos, 3, gl.FLOAT, false); m.nb = vbuf(1, d.nrm, 3, gl.FLOAT, false); m.cb = vbuf(2, d.col, 4, gl.UNSIGNED_BYTE, true);
  m.ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, d.idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return m;
}
function vbuf(loc, data, size, type, normed) {
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, type, normed, 0, 0); return b;
}
function freeMesh(m) { if (!m) return; gl.deleteVertexArray(m.vao); for (const b of [m.pb, m.nb, m.cb, m.ib]) gl.deleteBuffer(b); }

// mesh builder with per-vertex colour; normals computed from faces when not given
class MB {
  constructor() { this.p = []; this.n = []; this.c = []; this.i = []; }
  v(p, n, c) { this.p.push(p[0], p[1], p[2]); this.n.push(n ? n[0] : 0, n ? n[1] : 0, n ? n[2] : 0); this.c.push(c[0], c[1], c[2], c[3] === undefined ? 0 : c[3]); return this.p.length / 3 - 1; }
  tri(a, b, c) { this.i.push(a, b, c); }
  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }
  get count() { return this.p.length / 3; }
  calcNormals() {
    const p = this.p, n = new Float32Array(p.length);
    for (let k = 0; k < this.i.length; k += 3) {
      const a = this.i[k] * 3, b = this.i[k + 1] * 3, c = this.i[k + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const j of [a, b, c]) { n[j] += nx; n[j + 1] += ny; n[j + 2] += nz; }
    }
    for (let j = 0; j < n.length; j += 3) { const l = Math.hypot(n[j], n[j + 1], n[j + 2]) || 1; n[j] /= l; n[j + 1] /= l; n[j + 2] /= l; }
    this.n = Array.from(n); return this;
  }
  build() {
    const col = new Uint8Array(this.c.length); for (let k = 0; k < col.length; k++) col[k] = clamp(Math.round(this.c[k] * 255), 0, 255);
    const idx = this.count > 65535 ? new Uint32Array(this.i) : new Uint16Array(this.i);
    return makeMesh({ pos: new Float32Array(this.p), nrm: new Float32Array(this.n), col, idx });
  }
}

// unit primitives for instancing (white, material from the instance tint alpha)
const PRIM = {};
function buildPrims() {
  const W = [1, 1, 1, 0];
  { // box -0.5..0.5
    const b = new MB(), F = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]];
    for (const [n, u, v] of F) {
      const q = []; for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) q.push(b.v([(n[0] + u[0] * su + v[0] * sv) * .5, (n[1] + u[1] * su + v[1] * sv) * .5, (n[2] + u[2] * su + v[2] * sv) * .5], n, W));
      // winding so the face normal points outward
      const a = V.sub([b.p[q[1] * 3], b.p[q[1] * 3 + 1], b.p[q[1] * 3 + 2]], [b.p[q[0] * 3], b.p[q[0] * 3 + 1], b.p[q[0] * 3 + 2]]);
      const c = V.sub([b.p[q[2] * 3], b.p[q[2] * 3 + 1], b.p[q[2] * 3 + 2]], [b.p[q[0] * 3], b.p[q[0] * 3 + 1], b.p[q[0] * 3 + 2]]);
      if (V.dot(V.cross(a, c), n) > 0) b.quad(q[0], q[1], q[2], q[3]); else b.quad(q[0], q[3], q[2], q[1]);
    }
    PRIM.box = b.build();
  }
  { // sphere radius 1
    const b = new MB(), NU = 16, NV = 10;
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const t = j / NV * Math.PI, f = i / NU * TAU; const n = [Math.sin(t) * Math.cos(f), Math.cos(t), Math.sin(t) * Math.sin(f)]; b.v(n, n, W); }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, c = a + NU + 1; b.quad(a, a + 1, c + 1, c); }
    PRIM.sph = b.build();
  }
  { // cylinder radius 1, y -0.5..0.5, capped
    const b = new MB(), N = 14;
    for (let i = 0; i <= N; i++) { const f = i / N * TAU, n = [Math.cos(f), 0, Math.sin(f)]; b.v([n[0], -.5, n[2]], n, W); b.v([n[0], .5, n[2]], n, W); }
    for (let i = 0; i < N; i++) { const a = i * 2; b.quad(a, a + 1, a + 3, a + 2); }
    for (const y of [-.5, .5]) { const c = b.v([0, y, 0], [0, Math.sign(y), 0], W), s = b.count; for (let i = 0; i <= N; i++) { const f = i / N * TAU; b.v([Math.cos(f), y, Math.sin(f)], [0, Math.sign(y), 0], W); } for (let i = 0; i < N; i++) y > 0 ? b.tri(c, s + i + 1, s + i) : b.tri(c, s + i, s + i + 1); }
    PRIM.cyl = b.build();
  }
  { // cone: base radius 1 at y=0, tip at y=1
    const b = new MB(), N = 12;
    for (let i = 0; i <= N; i++) { const f = i / N * TAU; const n = V.norm([Math.cos(f), .7, Math.sin(f)]); b.v([Math.cos(f), 0, Math.sin(f)], n, W); b.v([0, 1, 0], n, W); }
    for (let i = 0; i < N; i++) b.tri(i * 2, i * 2 + 1, i * 2 + 2);
    const c = b.v([0, 0, 0], [0, -1, 0], W), s = b.count; for (let i = 0; i <= N; i++) { const f = i / N * TAU; b.v([Math.cos(f), 0, Math.sin(f)], [0, -1, 0], W); } for (let i = 0; i < N; i++) b.tri(c, s + i, s + i + 1);
    PRIM.cone = b.build();
  }
  { // bat wing: membrane in the local xz plane from the shoulder (x=0) out to x=1, scalloped trailing edge
    const b = new MB(); const pts = [[0, .18], [.35, .3], [.7, .22], [1, .05], [.82, -.12], [.62, -.02], [.45, -.22], [.25, -.08], [0, -.2]];
    const c = b.v([.12, 0, .02], [0, 1, 0], W); const s = b.count; for (const [x, z] of pts) b.v([x, 0, z], [0, 1, 0], W);
    for (let i = 0; i < pts.length - 1; i++) b.tri(c, s + i, s + i + 1);
    PRIM.wing = b.build();
  }
  { // tapered leg / claw segment: cylinder from y=0 (r=1) to y=1 (r=0.45)
    const b = new MB(), N = 8;
    for (let i = 0; i <= N; i++) { const f = i / N * TAU, n = [Math.cos(f), .25, Math.sin(f)]; b.v([Math.cos(f), 0, Math.sin(f)], n, W); b.v([Math.cos(f) * .45, 1, Math.sin(f) * .45], n, W); }
    for (let i = 0; i < N; i++) { const a = i * 2; b.quad(a, a + 1, a + 3, a + 2); }
    PRIM.leg = b.build();
  }
  { // shard: elongated hexagonal crystal, base at y=0, pointed tip at y=1
    const b = new MB(), N = 6;
    for (let i = 0; i < N; i++) {
      const f0 = i / N * TAU, f1 = (i + 1) / N * TAU, a0 = [Math.cos(f0), 0, Math.sin(f0)], a1 = [Math.cos(f1), 0, Math.sin(f1)];
      const n = V.norm([Math.cos((f0 + f1) / 2), 0, Math.sin((f0 + f1) / 2)]);
      const p0 = b.v(a0, n, W), p1 = b.v(a1, n, W), p2 = b.v([a1[0], .72, a1[2]], n, W), p3 = b.v([a0[0], .72, a0[2]], n, W); b.quad(p0, p3, p2, p1);
      const nt = V.norm([n[0], .7, n[2]]); const q0 = b.v([a0[0], .72, a0[2]], nt, W), q1 = b.v([a1[0], .72, a1[2]], nt, W), q2 = b.v([0, 1, 0], nt, W); b.tri(q0, q2, q1);
    }
    PRIM.shard = b.build();
  }
}

// instanced batch: 24 floats per instance = mat4 + tint (rgb, material) + emissive (rgb, flags)
class Batch {
  constructor(mesh, cap, dynamic = true) {
    this.mesh = mesh; this.cap = cap; this.f = new Float32Array(cap * 24); this.n = 0; this.dyn = dynamic;
    this.vao = gl.createVertexArray(); this.ib = gl.createBuffer(); this._setup();
  }
  _setup() {
    const m = this.mesh; gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.pb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.nb); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.cb); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ib); gl.bufferData(gl.ARRAY_BUFFER, this.f.byteLength, this.dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    for (let i = 0; i < 6; i++) { gl.enableVertexAttribArray(3 + i); gl.vertexAttribPointer(3 + i, 4, gl.FLOAT, false, 96, i * 16); gl.vertexAttribDivisor(3 + i, 1); }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib); gl.bindVertexArray(null);
  }
  clear() { this.n = 0; }
  _grow() { const f = new Float32Array(this.cap * 2 * 24); f.set(this.f); this.f = f; this.cap *= 2; this._setup(); }
  // F: frame {p,x,y,z}; sx,sy,sz scale; col [r,g,b,mat]; emi [r,g,b] or null
  add(F, sx, sy, sz, col, emi) {
    if (this.n >= this.cap) this._grow();
    const o = this.n++ * 24, f = this.f;
    M4.basis(f, o, F.p, F.x, F.y, F.z, sx, sy, sz);
    f[o + 16] = col[0]; f[o + 17] = col[1]; f[o + 18] = col[2]; f[o + 19] = col[3] || 0;
    if (emi) { f[o + 20] = emi[0]; f[o + 21] = emi[1]; f[o + 22] = emi[2]; } else { f[o + 20] = f[o + 21] = f[o + 22] = 0; }
    f[o + 23] = 0;
  }
  // segment-aligned primitive (cylinder/box/leg) from a to b with radius r (local y runs along a->b)
  addSeg(a, b, r, col, emi, up, rz) {
    const d = V.sub(b, a), L = V.len(d) || 1e-3, y = V.scl(d, 1 / L);
    let x = V.cross(y, up || [0, 1, 0]); if (V.len(x) < 1e-3) x = V.cross(y, [1, 0, 0]); x = V.norm(x); const z = V.cross(x, y);
    const isLeg = this.mesh === PRIM.leg || this.mesh === PRIM.cone || this.mesh === PRIM.shard;
    this.add({ p: isLeg ? a : V.lerp(a, b, .5), x, y, z }, r, L, rz || r, col, emi);
  }
  upload() { if (!this.n) return; gl.bindBuffer(gl.ARRAY_BUFFER, this.ib); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.f, 0, this.n * 24); }
  draw() { if (!this.n) return; gl.bindVertexArray(this.vao); gl.drawElementsInstanced(gl.TRIANGLES, this.mesh.n, this.mesh.type, 0, this.n); }
  free() { gl.deleteVertexArray(this.vao); gl.deleteBuffer(this.ib); }
}
// draw a plain (non-instanced) mesh with the lit program: identity instance attributes
function drawPlain(m) {
  gl.bindVertexArray(m.vao);
  gl.vertexAttrib4f(3, 1, 0, 0, 0); gl.vertexAttrib4f(4, 0, 1, 0, 0); gl.vertexAttrib4f(5, 0, 0, 1, 0); gl.vertexAttrib4f(6, 0, 0, 0, 1);
  gl.vertexAttrib4f(7, 1, 1, 1, 0); gl.vertexAttrib4f(8, 0, 0, 0, 0);
  gl.drawElements(gl.TRIANGLES, m.n, m.type, 0);
}

// glow billboards: 12 floats per instance (pos,size | rgb,shape | tail/rot)
class GlowBatch {
  constructor(cap) {
    this.cap = cap; this.f = new Float32Array(cap * 12); this.n = 0; this.vao = gl.createVertexArray(); this.ib = gl.createBuffer(); this._setup();
  }
  _setup() {
    gl.bindVertexArray(this.vao);
    if (!GlowBatch.cb) { GlowBatch.cb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, GlowBatch.cb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW); }
    gl.bindBuffer(gl.ARRAY_BUFFER, GlowBatch.cb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ib); gl.bufferData(gl.ARRAY_BUFFER, this.f.byteLength, gl.DYNAMIC_DRAW);
    for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(1 + i); gl.vertexAttribPointer(1 + i, 4, gl.FLOAT, false, 48, i * 16); gl.vertexAttribDivisor(1 + i, 1); }
    gl.bindVertexArray(null);
  }
  clear() { this.n = 0; }
  // shape: 0 soft dot, 1 streak (p -> tail), 2 ring, 3 hard eye dot, 5+ smoke (alpha batch)
  add(p, size, r, g, b, shape, tail, rot) {
    if (this.n >= this.cap) { const f = new Float32Array(this.cap * 2 * 12); f.set(this.f); this.f = f; this.cap *= 2; this._setup(); }
    const o = this.n++ * 12, f = this.f;
    f[o] = p[0]; f[o + 1] = p[1]; f[o + 2] = p[2]; f[o + 3] = size; f[o + 4] = r; f[o + 5] = g; f[o + 6] = b; f[o + 7] = shape || 0;
    if (tail) { f[o + 8] = tail[0]; f[o + 9] = tail[1]; f[o + 10] = tail[2]; } else { f[o + 8] = f[o + 9] = f[o + 10] = 0; }
    f[o + 11] = rot || 0;
  }
  draw() { if (!this.n) return; gl.bindVertexArray(this.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.ib); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.f, 0, this.n * 12); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n); }
}

// ---------- render targets ----------
const RT = { W: 0, H: 0, samples: 0, bloom: [] };
function mkTex(w, h, ifmt, fmt, type, filt) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texStorage2D(gl.TEXTURE_2D, 1, ifmt, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function mkFB(col, dep) {
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  if (col) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, col, 0);
  if (dep) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, dep, 0);
  if (!col) { gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE); }
  return f;
}
function setupTargets(W, H, q) {
  const ns = HDR ? q.msaa : Math.min(q.msaa, 4);
  if (RT.W === W && RT.H === H && RT.samples === ns && RT.nb === q.bloom) return;
  // free old
  for (const k of ['msFB', 'sceneFB', 'depthFB', 'copyFB']) if (RT[k]) gl.deleteFramebuffer(RT[k]);
  for (const k of ['msCol', 'msDep']) if (RT[k]) gl.deleteRenderbuffer(RT[k]);
  for (const k of ['sceneTex', 'depthTex', 'copyTex', 'copyDep']) if (RT[k]) gl.deleteTexture(RT[k]);
  for (const b of RT.bloom) { gl.deleteFramebuffer(b.fb); gl.deleteTexture(b.t); }
  RT.W = W; RT.H = H; RT.nb = q.bloom;
  let maxS = 0; try { const s = gl.getInternalformatParameter(gl.RENDERBUFFER, CFMT, gl.SAMPLES); maxS = s && s.length ? Math.max(...s) : 0; } catch (e) {}
  RT.samples = Math.min(ns, maxS);
  RT.msCol = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, RT.msCol); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, RT.samples, CFMT, W, H);
  RT.msDep = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, RT.msDep); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, RT.samples, gl.DEPTH_COMPONENT24, W, H);
  RT.msFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, RT.msFB);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, RT.msCol);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, RT.msDep);
  const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER); if (st !== gl.FRAMEBUFFER_COMPLETE) console.warn('msFB incomplete', st);
  RT.sceneTex = mkTex(W, H, CFMT, gl.RGBA, HDR ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, gl.LINEAR); RT.sceneFB = mkFB(RT.sceneTex, null);
  RT.depthTex = mkTex(W, H, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, gl.NEAREST); RT.depthFB = mkFB(null, RT.depthTex);
  RT.copyTex = mkTex(W, H, CFMT, gl.RGBA, HDR ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, gl.LINEAR);
  RT.copyDep = mkTex(W, H, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, gl.NEAREST); RT.copyFB = mkFB(RT.copyTex, RT.copyDep);
  RT.bloom = []; let w = W, h = H;
  for (let i = 0; i < q.bloom; i++) { w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); const t = mkTex(w, h, CFMT, gl.RGBA, HDR ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, gl.LINEAR); RT.bloom.push({ t, fb: mkFB(t, null), w, h }); }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function blit(src, dst, W, H, mask) {
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, src); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dst);
  gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, mask, gl.NEAREST);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
}
function bindTex(unit, t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); }
function unbindTex(unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, null); }
