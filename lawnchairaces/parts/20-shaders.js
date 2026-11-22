// GLSL sources. Every lit shader shares SH_COMMON (sky, fog, shadows, cloud shadows).
const SH_HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;
const SH_COMMON = `
uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform vec3 uSkyZen;
uniform vec3 uSkyHor;
uniform vec3 uGround;
uniform vec3 uFogCol;
uniform float uFogDen;
uniform float uTime;
uniform float uClip;
uniform sampler2D uShadow;
uniform mat4 uShadowVP0;
uniform mat4 uShadowVP1;
uniform float uShadowOn;
uniform float uShadowRes;
uniform sampler2D uNoise;
uniform float uCloudCov;

vec3 hemi(vec3 n) {
  float t = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
  return mix(uGround, mix(uSkyHor, uSkyZen, 0.55), t);
}
float cloudDensity(vec2 p) {
  vec2 w = vec2(uTime * 2.2, uTime * 0.9);
  float c = texture(uNoise, (p + w) / 9000.0).r * 0.55
          + texture(uNoise, (p + w * 1.3) / 3100.0 + 0.37).g * 0.3
          + texture(uNoise, (p + w * 1.6) / 1100.0 + 0.71).b * 0.15;
  return smoothstep(1.0 - uCloudCov, 1.0 - uCloudCov + 0.26, c);
}
float cloudShadow(vec3 wp) {
  if (uSunDir.y < 0.03) return 1.0;
  float t = (1600.0 - wp.y) / uSunDir.y;
  vec2 p = wp.xz + uSunDir.xz * t;
  return 1.0 - 0.6 * cloudDensity(p) * smoothstep(0.03, 0.15, uSunDir.y);
}
vec3 skyBase(vec3 d) {
  float y = max(d.y, 0.0);
  float hz = pow(1.0 - y, 5.0);
  vec3 col = mix(uSkyZen, uSkyHor, hz);
  float mu = max(dot(d, uSunDir), 0.0);
  col += uSunCol * (0.035 * pow(mu, 5.0) + 0.16 * pow(mu, 48.0) + 0.6 * pow(mu, 700.0)) * (0.5 + 0.5 * hz);
  if (d.y < 0.0) col = mix(col, uGround * 0.8 + uSkyHor * 0.35, clamp(-d.y * 4.0, 0.0, 1.0));
  return col;
}
vec3 fogColor(vec3 v) {
  float s = pow(max(dot(v, uSunDir), 0.0), 6.0);
  return uFogCol + uSunCol * s * 0.22;
}
vec3 applyFog(vec3 col, vec3 wp) {
  vec3 d = wp - uCamPos;
  float dist = length(d);
  float h0 = max(uCamPos.y, 0.0), h1 = max(wp.y, 0.0);
  float k = 0.0035;
  float dh = h1 - h0;
  float avg = abs(dh) > 0.5 ? (exp(-k * h0) - exp(-k * h1)) / (k * dh) : exp(-k * h0);
  float f = 1.0 - exp(-uFogDen * dist * max(avg, 0.0));
  return mix(col, fogColor(d / max(dist, 1e-3)), f);
}
float shadowSample(vec3 wp, vec3 n) {
  if (uShadowOn < 0.5) return 1.0;
  vec4 c0 = uShadowVP0 * vec4(wp + n * 0.012, 1.0);
  vec3 s = c0.xyz / c0.w * 0.5 + 0.5;
  float bias = 0.0004;
  float lo = 0.0, hi = 0.5;
  if (any(lessThan(s.xy, vec2(0.03))) || any(greaterThan(s.xy, vec2(0.97)))) {
    vec4 c1 = uShadowVP1 * vec4(wp + n * 0.08, 1.0);
    s = c1.xyz / c1.w * 0.5 + 0.5;
    if (any(lessThan(s.xy, vec2(0.0))) || any(greaterThan(s.xy, vec2(1.0))) || s.z > 1.0) return 1.0;
    s.x = s.x * 0.5 + 0.5; lo = 0.5; hi = 1.0; bias = 0.0012;
  } else {
    s.x *= 0.5;
  }
  if (s.z > 1.0) return 1.0;
  vec2 texel = vec2(0.5 / uShadowRes, 1.0 / uShadowRes);
  float sum = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
    vec2 uv = s.xy + vec2(float(i), float(j)) * texel * 1.25;
    uv.x = clamp(uv.x, lo + texel.x, hi - texel.x);
    float dd = texture(uShadow, uv).r;
    sum += (s.z - bias > dd) ? 0.0 : 1.0;
  }
  return sum / 9.0;
}
// GGX specular, returns the sun specular term (already multiplied by n.l)
vec3 ggx(vec3 n, vec3 v, vec3 L, float rough, vec3 F0) {
  vec3 H = normalize(L + v);
  float ndl = max(dot(n, L), 0.0), ndh = max(dot(n, H), 0.0), ndv = max(dot(n, v), 1e-3);
  float a = rough * rough, a2 = a * a;
  float dd = ndh * ndh * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159 * dd * dd);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, v), 0.0), 5.0);
  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float G = (ndv / (ndv * (1.0 - k) + k)) * (ndl / (ndl * (1.0 - k) + k));
  return D * F * G * 3.14159 / max(4.0 * ndv, 1e-3);
}
`;

// ---------- terrain ----------
const VS_TERRAIN = SH_HEAD + `
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec4 aAux;
uniform mat4 uVP;
out vec3 vWP; out vec3 vN; out vec4 vAux;
void main() { vWP = aPos; vN = aNrm; vAux = aAux; gl_Position = uVP * vec4(aPos, 1.0); }
`;
const FS_TERRAIN = SH_HEAD + SH_COMMON + `
in vec3 vWP; in vec3 vN; in vec4 vAux;
out vec4 o;
void main() {
  if (uClip > 0.5 && vWP.y < -0.05) discard;
  vec3 n = normalize(vN);
  float dist = distance(vWP, uCamPos);
  float n1 = texture(uNoise, vWP.xz / 41.0).r, n2 = texture(uNoise, vWP.xz / 11.0 + 0.3).g, n3 = texture(uNoise, vWP.xz / 2.7 + 0.6).b;
  float n4 = texture(uNoise, vWP.xz / 260.0 + 0.1).a;
  float nz = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
  float h = vWP.y;
  float slope = 1.0 - n.y;
  float forest = vAux.x;
  vec3 sand = mix(vec3(0.52, 0.45, 0.34), vec3(0.64, 0.58, 0.45), n2);
  vec3 wet = vec3(0.29, 0.25, 0.19);
  vec3 bed = mix(vec3(0.24, 0.21, 0.15), vec3(0.33, 0.29, 0.21), n1);
  bed = mix(bed, vec3(0.12, 0.13, 0.08), smoothstep(-2.5, -6.0, h) * 0.6);
  vec3 grass = mix(vec3(0.1, 0.17, 0.05), vec3(0.21, 0.26, 0.09), nz);
  grass = mix(grass, vec3(0.3, 0.28, 0.14), smoothstep(0.6, 0.85, n1) * 0.4);
  vec3 floorC = mix(vec3(0.09, 0.1, 0.05), vec3(0.17, 0.13, 0.07), n2);
  float crowns = texture(uNoise, vWP.xz / 7.0 + 0.2).a;
  float clumps = texture(uNoise, vWP.xz / 23.0 + 0.45).r;
  vec3 canopy = mix(vec3(0.028, 0.05, 0.03), vec3(0.075, 0.11, 0.05), n2) * (0.4 + 1.3 * crowns * clumps);
  canopy = mix(canopy, vec3(0.16, 0.15, 0.06), smoothstep(0.66, 0.82, n4) * 0.45);
  vec3 rock = mix(vec3(0.3, 0.29, 0.27), vec3(0.46, 0.44, 0.41), n2);
  float beachy = vAux.y;
  float beach = (1.0 - smoothstep(0.7, 1.5 + n2, h)) * beachy;
  vec3 bank = mix(vec3(0.2, 0.19, 0.15), vec3(0.32, 0.3, 0.26), n3);
  vec3 col = mix(grass, floorC, smoothstep(0.15, 0.45, forest));
  col = mix(col, canopy, smoothstep(0.3, 0.75, forest) * smoothstep(40.0, 160.0, dist));
  col = mix(col, bank, (1.0 - smoothstep(0.4, 1.4 + n2, h)) * (1.0 - beachy) * step(-0.3, h));
  col = mix(col, sand, beach);
  col = mix(col, wet, smoothstep(0.3, -0.05, h));
  col = mix(col, bed, smoothstep(-0.2, -1.2, h));
  col = mix(col, rock, smoothstep(0.42, 0.62, slope + n3 * 0.15) * step(1.0, h));
  float ndl = max(dot(n, uSunDir), 0.0);
  float sh = cloudShadow(vWP);
  // canopy self-shadowing for far forest
  // a forest canopy is full of its own shadows, so seen from afar it takes much less sun than grass
  float canopyK = smoothstep(0.3, 0.9, forest) * smoothstep(60.0, 300.0, dist);
  float occ = mix(1.0, 0.62, canopyK);
  float sunOcc = mix(1.0, 0.5 + 0.25 * n1, canopyK);
  vec3 light = uSunCol * ndl * sh * sunOcc + hemi(n) * 0.85 * occ;
  if (h < 0.0) {
    float dep = -h;
    float c = texture(uNoise, vWP.xz / 3.1 + vec2(uTime * 0.03, uTime * 0.02)).r + texture(uNoise, vWP.xz / 2.3 - vec2(uTime * 0.025, -uTime * 0.03)).g;
    float caus = pow(smoothstep(0.75, 1.35, c), 2.0) * exp(-dep * 0.4) * 1.6;
    light = light * exp(-dep * vec3(0.5, 0.22, 0.16) * 0.5) + uSunCol * ndl * caus * sh;
  }
  col *= light;
  o = vec4(applyFog(col, vWP), 1.0);
}
`;

// ---------- trees (instanced) ----------
const VS_TREE = SH_HEAD + `
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec4 aCol;
layout(location=3) in vec3 iPos;
layout(location=4) in vec3 iSize;
layout(location=5) in vec3 iTint;
uniform mat4 uVP;
uniform float uTime;
uniform float uWS;
out vec3 vWP; out vec3 vN; out vec4 vCol; out vec3 vTint; out float vH;
void main() {
  float c = cos(iSize.z), s = sin(iSize.z);
  float ws = iSize.x * iSize.y * uWS;
  vec3 p = vec3(aPos.x * ws, aPos.y * iSize.x, aPos.z * ws);
  p = vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
  vec3 n = vec3(aNrm.x / max(ws, 0.01), aNrm.y / iSize.x, aNrm.z / max(ws, 0.01));
  n = normalize(vec3(c * n.x - s * n.z, n.y, s * n.x + c * n.z));
  float sway = sin(uTime * 1.1 + iPos.x * 0.07 + iPos.z * 0.05) * 0.012 * aPos.y * aPos.y * iSize.x;
  p.x += sway; p.z += sway * 0.6;
  vWP = iPos + p; vN = n; vCol = aCol; vTint = iTint; vH = aPos.y;
  gl_Position = uVP * vec4(vWP, 1.0);
}
`;
const FS_TREE = SH_HEAD + SH_COMMON + `
in vec3 vWP; in vec3 vN; in vec4 vCol; in vec3 vTint; in float vH;
out vec4 o;
void main() {
  if (uClip > 0.5 && vWP.y < -0.05) discard;
  vec3 n = normalize(vN);
  vec3 v = normalize(uCamPos - vWP);
  float leaf = vCol.a;
  vec3 alb = vCol.rgb * mix(vec3(1.0), vTint, leaf);
  float ndl = dot(n, uSunDir);
  float wrap = max((ndl + 0.5) / 1.5, 0.0);
  float ao = mix(0.35, 1.05, clamp(vH * 1.1, 0.0, 1.0));
  float sh = cloudShadow(vWP);
  vec3 light = uSunCol * wrap * sh * 0.95 + hemi(n) * 0.9;
  float tr = pow(max(dot(-v, uSunDir), 0.0), 5.0) * leaf * 0.28;
  light += uSunCol * tr * sh * vec3(0.8, 1.0, 0.55);
  vec3 col = alb * light * ao;
  o = vec4(applyFog(col, vWP), 1.0);
}
`;

// ---------- generic lit object ----------
const VS_OBJ = SH_HEAD + `
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec4 aCol;
uniform mat4 uVP;
uniform mat4 uModel;
out vec3 vWP; out vec3 vN; out vec4 vCol;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vWP = wp.xyz; vN = mat3(uModel) * aNrm; vCol = aCol;
  gl_Position = uVP * wp;
}
`;
const FS_OBJ = SH_HEAD + SH_COMMON + `
in vec3 vWP; in vec3 vN; in vec4 vCol;
uniform vec4 uTint;
uniform float uWet;
out vec4 o;
void main() {
  if (uClip > 0.5 && vWP.y < -0.05) discard;
  vec3 n = normalize(vN);
  vec3 v = normalize(uCamPos - vWP);
  if (dot(n, v) < 0.0) n = -n;
  float code = vCol.a;
  vec3 alb = vCol.rgb * uTint.rgb;
  float rough = mix(0.9, 0.2, smoothstep(0.0, 0.85, code));
  float metal = smoothstep(0.88, 0.94, code);
  rough = mix(rough, 0.35, metal);
  vec3 F0 = mix(vec3(0.04), alb, metal);
  float sh = shadowSample(vWP, n) * cloudShadow(vWP);
  float ndl = max(dot(n, uSunDir), 0.0);
  vec3 diff = alb * (1.0 - metal) * (uSunCol * ndl * sh + hemi(n));
  vec3 spec = ggx(n, v, uSunDir, rough, F0) * uSunCol * sh;
  vec3 r = reflect(-v, n);
  float fr = pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 envF = F0 + (max(vec3(1.0 - rough), F0) - F0) * fr;
  vec3 env = skyBase(r) * envF * mix(0.35, 1.0, metal) * (1.0 - rough * 0.7);
  if (r.y < 0.0) env *= 0.5;
  vec3 col = diff + spec + env;
  o = vec4(applyFog(col, vWP), 1.0);
}
`;

// ---------- balloons (instanced latex) ----------
const VS_BALLOON = SH_HEAD + `
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec4 aCol;
layout(location=3) in vec4 iPosR;
layout(location=4) in vec4 iAxis;
layout(location=5) in vec4 iCol;
uniform mat4 uVP;
uniform float uTime;
out vec3 vWP; out vec3 vN; out vec3 vCol; out float vKnot; out vec3 vCenter; out float vR; out float vGloss; out vec3 vLocal;
void main() {
  vec3 up = normalize(iAxis.xyz);
  vec3 t = abs(up.y) < 0.95 ? normalize(cross(up, vec3(0.0, 1.0, 0.0))) : normalize(cross(up, vec3(1.0, 0.0, 0.0)));
  vec3 b = cross(up, t);
  float wob = 1.0 + 0.012 * sin(uTime * 2.3 + iAxis.w * 6.0);
  vec3 lp = aPos * vec3(wob, 1.0 / wob, wob);
  vec3 p = iPosR.xyz + (t * lp.x + up * lp.y + b * lp.z) * iPosR.w;
  vWP = p; vN = t * aNrm.x + up * aNrm.y + b * aNrm.z; vCol = iCol.rgb; vKnot = aCol.a; vCenter = iPosR.xyz; vR = iPosR.w; vGloss = iCol.a; vLocal = aPos;
  gl_Position = uVP * vec4(p, 1.0);
}
`;
const FS_BALLOON = SH_HEAD + SH_COMMON + `
in vec3 vWP; in vec3 vN; in vec3 vCol; in float vKnot; in vec3 vCenter; in float vR; in float vGloss; in vec3 vLocal;
out vec4 o;
void main() {
  if (uClip > 0.5 && vWP.y < -0.05) discard;
  vec3 n = normalize(vN);
  vec3 v = normalize(uCamPos - vWP);
  vec3 L = uSunDir;
  vec3 alb = vCol * mix(1.0, 0.75, vKnot);
  float ndl = dot(n, L);
  float sh = shadowSample(vWP, n);
  float cs = cloudShadow(vWP);
  // light reaching the balloon's lit hemisphere (for transmission)
  float shT = mix(0.3, 1.0, shadowSample(vCenter + L * vR * 0.9, L));
  float diff = max(ndl, 0.0);
  // other balloons shade with coloured light (latex is translucent), and the cluster bounces light around
  vec3 col = alb * (uSunCol * diff * mix(0.28, 1.0, sh) * cs * 0.85 + hemi(n) * 0.95 + uSunCol * alb * 0.09 * cs);
  // transmission: light passes through the latex and exits on the shaded side
  float fwd = pow(max(dot(-v, L), 0.0), 2.0);
  float exitSide = smoothstep(0.25, -0.65, ndl);
  float thick = mix(1.0, 0.55, pow(max(dot(n, v), 0.0), 2.0));
  col += alb * alb * uSunCol * shT * cs * exitSide * (0.22 + 1.5 * fwd) * thick * (1.0 - vKnot);
  // inner glow from the sunlit cap seen through the skin
  col += alb * uSunCol * shT * cs * 0.05 * (1.0 - vKnot);
  // satin latex specular: broad lobe + sharp highlight
  vec3 F0 = vec3(0.045);
  vec3 spec = ggx(n, v, L, 0.34, F0) * 0.7 + ggx(n, v, L, 0.11, F0) * vGloss * 1.6;
  col += spec * uSunCol * sh * cs;
  vec3 r = reflect(-v, n);
  float fr = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  col += skyBase(r) * fr * 0.55 * vGloss;
  o = vec4(applyFog(col, vWP), 1.0);
}
`;

// ---------- ribbons (strings, ropes, water streams) ----------
const VS_RIBBON = SH_HEAD + `
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aCol;
uniform mat4 uVP;
out vec3 vWP; out vec4 vCol;
void main() { vWP = aPos; vCol = aCol; gl_Position = uVP * vec4(aPos, 1.0); }
`;
const FS_RIBBON = SH_HEAD + SH_COMMON + `
in vec3 vWP; in vec4 vCol;
out vec4 o;
void main() {
  if (uClip > 0.5 && vWP.y < -0.05) discard;
  vec3 col = vCol.rgb * (uSunCol * 0.32 * shadowSample(vWP, uSunDir) + hemi(vec3(0.0, 1.0, 0.0)) * 0.8);
  col = applyFog(col, vWP);
  o = vec4(col * vCol.a, vCol.a);
}
`;

// ---------- sky ----------
const VS_FULL = SH_HEAD + `
layout(location=0) in vec2 aPos;
out vec2 vNdc;
void main() { vNdc = aPos; gl_Position = vec4(aPos, 1.0, 1.0); }
`;
const FS_SKY = SH_HEAD + SH_COMMON + `
in vec2 vNdc;
uniform mat4 uInvVP;
out vec4 o;
vec4 clouds(vec3 ro, vec3 d) {
  if (d.y < 0.008) return vec4(0.0);
  float t = (1600.0 - ro.y) / d.y;
  vec2 p = ro.xz + d.xz * t;
  float den = cloudDensity(p);
  if (den < 0.002) return vec4(0.0);
  vec2 sd = normalize(uSunDir.xz + vec2(1e-4));
  float den2 = cloudDensity(p + sd * 160.0);
  float den3 = cloudDensity(p + sd * 420.0);
  float lit = exp(-(den2 * 1.6 + den3 * 0.9));
  float mu = max(dot(d, uSunDir), 0.0);
  vec3 base = uSkyHor * 0.5 + uSkyZen * 0.25 + uGround * 0.3;
  vec3 col = mix(base, uSunCol * 1.05 + uSkyZen * 0.3, lit);
  col += uSunCol * pow(mu, 10.0) * (1.0 - den) * 2.0;
  float fade = smoothstep(0.008, 0.1, d.y);
  col = mix(uSkyHor * 1.05, col, exp(-t / 26000.0));
  return vec4(col, den * fade * 0.95);
}
void main() {
  vec4 a = uInvVP * vec4(vNdc, 1.0, 1.0);
  vec3 d = normalize(a.xyz / a.w - uCamPos);
  vec3 col = skyBase(d);
  vec4 c = clouds(uCamPos, d);
  float mu = dot(d, uSunDir);
  float disk = smoothstep(0.99993, 0.99997, mu);
  col += uSunCol * disk * 28.0 * (1.0 - c.a) * smoothstep(-0.01, 0.01, d.y);
  col = mix(col, c.rgb, c.a);
  o = vec4(col, 1.0);
}
`;

// ---------- lake surface ----------
const VS_WATER = SH_HEAD + `
layout(location=0) in vec3 aPos;
uniform mat4 uVP;
out vec3 vWP;
void main() { vWP = aPos; gl_Position = uVP * vec4(aPos, 1.0); }
`;
const FS_WATER = SH_HEAD + SH_COMMON + `
in vec3 vWP;
uniform sampler2D uRefl;
uniform sampler2D uWave;
uniform sampler2D uHeight;
uniform vec4 uHRect;
uniform vec2 uRes;
uniform float uWaveAmp;
uniform vec4 uRipples[16];
uniform vec3 uWaterDeep;
out vec4 o;
void main() {
  vec3 d = vWP - uCamPos;
  float dist = length(d);
  vec3 v = -d / dist;
  float fade = 1.0 / (1.0 + dist / 260.0);
  vec2 g = texture(uWave, vWP.xz / 31.0 + uTime * vec2(0.011, 0.006)).xy * 0.9
         + texture(uWave, vWP.xz / 8.3 - uTime * vec2(0.016, -0.021)).xy * 0.6 * fade
         + texture(uWave, vWP.xz / 2.9 + uTime * vec2(-0.03, 0.025)).xy * 0.35 * fade * fade
         + texture(uWave, vWP.xz / 140.0 + uTime * vec2(0.002, 0.004)).xy * 1.2;
  g *= uWaveAmp;
  vec2 rip = vec2(0.0);
  for (int i = 0; i < 16; i++) {
    vec4 r = uRipples[i];
    if (r.w <= 0.0) continue;
    vec2 dv = vWP.xz - r.xy;
    float dd = length(dv);
    float ringR = r.z * 2.6;
    float env = exp(-pow((dd - ringR) / (0.6 + r.z * 0.35), 2.0)) * r.w * exp(-r.z * 0.45);
    rip += dv / max(dd, 0.01) * sin((dd - ringR) * 5.0) * env;
  }
  g += rip * 0.5;
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  float ndv = max(dot(n, v), 0.0);
  float F = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
  vec2 suv = gl_FragCoord.xy / uRes + n.xz * 0.045 * clamp(30.0 / dist, 0.15, 1.0);
  vec3 refl = texture(uRefl, suv).rgb;
  // depth from the terrain height field
  vec2 huv = (vWP.xz - uHRect.xy) / uHRect.z;
  float hgt = (huv.x > 0.0 && huv.x < 1.0 && huv.y > 0.0 && huv.y < 1.0) ? texture(uHeight, huv).r : -40.0;
  float depth = max(-hgt, 0.0);
  float path = depth * (1.0 + 1.6 * (1.0 - v.y));
  float a = 1.0 - exp(-path * 0.42);
  float cs = cloudShadow(vWP);
  vec3 scatter = uWaterDeep * (hemi(vec3(0.0, 1.0, 0.0)) * 0.9 + uSunCol * max(uSunDir.y, 0.0) * 0.5 * cs);
  vec3 spec = ggx(n, v, uSunDir, 0.06 + uWaveAmp * 0.25, vec3(0.02)) * uSunCol * cs;
  vec3 rgb = refl * F + (1.0 - F) * a * scatter + spec;
  float alpha = 1.0 - (1.0 - F) * (1.0 - a);
  // shoreline foam lines
  float foam = smoothstep(0.35, 0.0, depth) * smoothstep(0.45, 0.75, texture(uNoise, vWP.xz / 1.7 + uTime * 0.05).r + 0.3 * sin(depth * 18.0 - uTime * 1.5));
  rgb += hemi(vec3(0.0, 1.0, 0.0)) * foam * 0.6 + uSunCol * foam * 0.3 * cs;
  alpha = max(alpha, foam * 0.6);
  // fog
  float h0 = max(uCamPos.y, 0.0), k = 0.0035;
  float avg = h0 > 0.5 ? (exp(-k * h0) - 1.0) / (k * (0.0 - h0)) : 1.0;
  float f = 1.0 - exp(-uFogDen * dist * avg);
  vec3 fc = fogColor(-v);
  rgb = rgb * (1.0 - f) + fc * f * alpha;
  o = vec4(rgb, alpha);
}
`;

// ---------- particles ----------
const VS_PART = SH_HEAD + `
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 iPos;
layout(location=2) in vec4 iCol;
layout(location=3) in vec4 iVel;
uniform mat4 uVP;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform float uTime;
out vec2 vUV; out vec4 vCol; flat out int vType; out vec3 vWP;
void main() {
  int type = int(iVel.w + 0.5);
  vec3 p = iPos.xyz;
  float sz = iPos.w;
  vec2 c = aCorner;
  vec3 wp;
  if (type == 2) {
    vec3 dir = iVel.xyz; float sp = length(dir);
    vec3 dn = dir / max(sp, 1e-3);
    vec3 side = normalize(cross(dn, normalize(uCamPos - p)));
    float len = clamp(sp * 0.018, 0.05, 4.0);
    wp = p - dn * (c.y * 0.5 + 0.5) * len + side * c.x * sz;
  } else if (type == 1) {
    float a = uTime * (3.0 + fract(iCol.a * 7.0) * 9.0) + iCol.a * 40.0;
    float ca = cos(a), sa = sin(a);
    vec2 r = vec2(ca * c.x - sa * c.y * 0.55, sa * c.x + ca * c.y * 0.55);
    vec3 ax2 = normalize(vec3(sin(a * 0.7), cos(a * 0.4), sin(a * 0.3 + 1.0)));
    vec3 ax1 = normalize(cross(ax2, vec3(0.3, 1.0, 0.2)));
    wp = p + (ax1 * r.x + cross(ax1, ax2) * r.y) * sz;
  } else {
    wp = p + (uCamRight * c.x + uCamUp * c.y) * sz;
  }
  vUV = c; vCol = iCol; vType = type; vWP = wp;
  gl_Position = uVP * vec4(wp, 1.0);
}
`;
const FS_PART = SH_HEAD + SH_COMMON + `
in vec2 vUV; in vec4 vCol; flat in int vType; in vec3 vWP;
out vec4 o;
void main() {
  if (uClip > 0.5 && vWP.y < -0.05) discard;
  if (vType == 2) {
    float a = (1.0 - abs(vUV.x)) * vCol.a;
    o = vec4(vCol.rgb * a, 0.0);
  } else if (vType == 1) {
    // latex shred: ragged opaque piece
    float r = length(vUV * vec2(1.0, 1.4));
    float edge = 0.85 + 0.15 * sin(atan(vUV.y, vUV.x) * 5.0 + vCol.a * 30.0);
    if (r > edge) discard;
    vec3 col = vCol.rgb * (uSunCol * 0.6 + hemi(vec3(0.0, 1.0, 0.0)) + uSunCol * 0.4);
    o = vec4(applyFog(col, vWP), 1.0);
  } else {
    float r = length(vUV);
    float a = smoothstep(1.0, 0.2, r) * vCol.a;
    vec3 col = vCol.rgb * (uSunCol * 0.7 + hemi(vec3(0.0, 1.0, 0.0)) * 1.1);
    if (vType == 3) col = vCol.rgb; // emissive glint
    o = vec4(applyFog(col, vWP) * a, a * (vType == 3 ? 0.0 : 1.0));
  }
}
`;

// ---------- shadow depth ----------
const VS_SHADOW_OBJ = SH_HEAD + `
layout(location=0) in vec3 aPos;
uniform mat4 uLightVP;
uniform mat4 uModel;
void main() { gl_Position = uLightVP * uModel * vec4(aPos, 1.0); }
`;
const VS_SHADOW_BALLOON = SH_HEAD + `
layout(location=0) in vec3 aPos;
layout(location=3) in vec4 iPosR;
layout(location=4) in vec4 iAxis;
uniform mat4 uLightVP;
void main() {
  vec3 up = normalize(iAxis.xyz);
  vec3 t = abs(up.y) < 0.95 ? normalize(cross(up, vec3(0.0, 1.0, 0.0))) : normalize(cross(up, vec3(1.0, 0.0, 0.0)));
  vec3 b = cross(up, t);
  vec3 p = iPosR.xyz + (t * aPos.x + up * aPos.y + b * aPos.z) * iPosR.w;
  gl_Position = uLightVP * vec4(p, 1.0);
}
`;
const FS_SHADOW = SH_HEAD + `
out vec4 o;
void main() { o = vec4(1.0); }
`;

// ---------- post ----------
const VS_POST = SH_HEAD + `
layout(location=0) in vec2 aPos;
out vec2 vUV;
void main() { vUV = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;
const FS_DOWN = SH_HEAD + `
in vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uThresh;
out vec4 o;
vec3 thr(vec3 c) {
  if (uThresh <= 0.0) return c;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThresh + 0.5, 0.0, 1.0);
  soft = soft * soft * 0.5;
  float w = max(soft, br - uThresh) / max(br, 1e-4);
  return c * w;
}
void main() {
  vec3 a = texture(uTex, vUV + uTexel * vec2(-1.0, -1.0)).rgb;
  vec3 b = texture(uTex, vUV + uTexel * vec2(1.0, -1.0)).rgb;
  vec3 c = texture(uTex, vUV + uTexel * vec2(-1.0, 1.0)).rgb;
  vec3 d = texture(uTex, vUV + uTexel * vec2(1.0, 1.0)).rgb;
  vec3 e = texture(uTex, vUV).rgb;
  vec3 s = (a + b + c + d) * 0.125 + e * 0.5;
  s = min(s, vec3(60.0));
  o = vec4(thr(s), 1.0);
}
`;
const FS_UP = SH_HEAD + `
in vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uGain;
out vec4 o;
void main() {
  vec3 s = texture(uTex, vUV).rgb * 4.0;
  s += texture(uTex, vUV + vec2(uTexel.x, 0.0)).rgb * 2.0 + texture(uTex, vUV - vec2(uTexel.x, 0.0)).rgb * 2.0;
  s += texture(uTex, vUV + vec2(0.0, uTexel.y)).rgb * 2.0 + texture(uTex, vUV - vec2(0.0, uTexel.y)).rgb * 2.0;
  s += texture(uTex, vUV + uTexel).rgb + texture(uTex, vUV - uTexel).rgb;
  s += texture(uTex, vUV + vec2(uTexel.x, -uTexel.y)).rgb + texture(uTex, vUV + vec2(-uTexel.x, uTexel.y)).rgb;
  o = vec4(s / 16.0 * uGain, 1.0);
}
`;
const FS_COMPOSITE = SH_HEAD + `
in vec2 vUV;
uniform sampler2D uHDR;
uniform sampler2D uBloom;
uniform float uExposure;
uniform float uBloomAmt;
uniform float uVignette;
uniform vec3 uGrade;
uniform float uDamage;
out vec4 o;
vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
void main() {
  vec3 hdr = texture(uHDR, vUV).rgb;
  vec3 bl = texture(uBloom, vUV).rgb;
  vec3 c = (hdr + bl * uBloomAmt) * uExposure;
  c *= uGrade;
  c = aces(c);
  vec2 q = vUV - 0.5;
  float vig = 1.0 - dot(q, q) * uVignette;
  c *= vig;
  c = mix(c, c * vec3(1.0, 0.75, 0.7), uDamage * smoothstep(0.15, 0.7, length(q)));
  c = pow(c, vec3(1.0 / 2.2));
  float dith = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) / 255.0;
  o = vec4(c + dith - 0.5 / 255.0, 1.0);
}
`;
const FS_FXAA = SH_HEAD + `
in vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uTexel;
out vec4 o;
float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
void main() {
  vec3 rgbNW = texture(uTex, vUV + vec2(-1.0, -1.0) * uTexel).rgb;
  vec3 rgbNE = texture(uTex, vUV + vec2(1.0, -1.0) * uTexel).rgb;
  vec3 rgbSW = texture(uTex, vUV + vec2(-1.0, 1.0) * uTexel).rgb;
  vec3 rgbSE = texture(uTex, vUV + vec2(1.0, 1.0) * uTexel).rgb;
  vec3 rgbM = texture(uTex, vUV).rgb;
  float lNW = lum(rgbNW), lNE = lum(rgbNE), lSW = lum(rgbSW), lSE = lum(rgbSE), lM = lum(rgbM);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
  float dirReduce = max((lNW + lNE + lSW + lSE) * 0.25 * 0.125, 1.0 / 128.0);
  float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
  dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * uTexel;
  vec3 A = 0.5 * (texture(uTex, vUV + dir * (1.0 / 3.0 - 0.5)).rgb + texture(uTex, vUV + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 B = A * 0.5 + 0.25 * (texture(uTex, vUV + dir * -0.5).rgb + texture(uTex, vUV + dir * 0.5).rgb);
  float lB = lum(B);
  o = vec4((lB < lMin || lB > lMax) ? A : B, 1.0);
}
`;
