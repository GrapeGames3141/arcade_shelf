// ============================================================
//  SHADERS
// ============================================================
const H=`#version 300 es
precision highp float;precision highp int;precision highp sampler2D;precision highp sampler2DShadow;
`;
const C_UNI=`
uniform float uTime;
uniform vec3 uCam;
uniform mat4 uVP;
uniform vec3 uLdir;
uniform vec3 uLcol;
uniform vec3 uAmb;
uniform float uWL;
uniform vec3 uTmin;
uniform vec3 uTmax;
uniform vec3 uAbs;
uniform vec3 uFogC;
uniform float uFogD;
uniform mat4 uSM;
uniform sampler2DShadow uShadow;
uniform sampler2D uCaus;
uniform sampler2D uSandH;
uniform float uCausScale;
uniform float uCausAmt;
uniform float uShadowOn;
uniform vec3 uRoomAmb;
uniform float uTankGlow;
uniform float uEnvK;
uniform vec4 uRing;
uniform float uSel;
uniform float uLampE;
uniform vec4 uCMap;
uniform vec3 uLw;
uniform sampler2D uSim;
uniform vec4 uSimR;
uniform float uRuffle;
uniform float uCDep;
uniform sampler2D uShadowR;
uniform vec2 uSMk;
uniform float uPCSS;
uniform vec3 uLampC;
uniform float uHealth;
`;
// surface ruffle: eleven short capillary-gravity wavelets (0.9-4.8 cm) with incommensurate wavelengths spread around the filter flow, so the caustic net stays irregular (k rad/cm, direction, slope amplitude, phase), dispersion w^2=gk+(s/p)k^3 slowed x0.6
const SWELL=`
vec2 swellGrad(vec2 p,float t,float amp){vec2 g=vec2(0.);const vec4 W[11]=vec4[11](vec4(1.310,-0.440,0.0240,0.948),vec4(1.730,0.377,0.0212,0.455),vec4(2.070,0.090,0.0195,2.298),vec4(2.580,-1.105,0.0177,3.188),vec4(3.020,-1.156,0.0165,2.725),vec4(3.610,-1.075,0.0152,0.570),vec4(4.170,-0.189,0.0143,5.195),vec4(4.830,-0.940,0.0133,1.403),vec4(5.520,0.319,0.0126,5.954),vec4(6.310,0.193,0.0118,2.492),vec4(7.200,1.191,0.0111,0.293));
  for(int i=0;i<11;i++){vec4 w=W[i];float a=w.y+.245;vec2 d=vec2(cos(a),sin(a));float om=.6*sqrt(981.*w.x+73.*w.x*w.x*w.x);g+=d*w.z*cos(w.x*dot(d,p)-om*t+w.w);}
  return g*amp;}
`;
const C_FN=SWELL+`
#define TAU 6.28318530718
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float hash13(vec3 p3){p3=fract(p3*.1031);p3+=dot(p3,p3.zyx+31.32);return fract((p3.x+p3.y)*p3.z);}
vec2 hash22(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}
float vnoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  float a=hash13(i),b=hash13(i+vec3(1,0,0)),c=hash13(i+vec3(0,1,0)),d=hash13(i+vec3(1,1,0)),
  e=hash13(i+vec3(0,0,1)),g=hash13(i+vec3(1,0,1)),h=hash13(i+vec3(0,1,1)),k=hash13(i+vec3(1,1,1));
  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,g,f.x),mix(h,k,f.x),f.y),f.z);}
float fbm(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vnoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s/.9375;}
float fbm2(vec3 p){return (vnoise(p)*.66+vnoise(p*2.03+1.7)*.34);}
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
vec2 boxT(vec3 ro,vec3 rd,vec3 bmin,vec3 bmax){vec3 inv=1./rd;vec3 t0=(bmin-ro)*inv,t1=(bmax-ro)*inv;vec3 tn=min(t0,t1),tf=max(t0,t1);
  return vec2(max(max(tn.x,tn.y),tn.z),min(min(tf.x,tf.y),tf.z));}
bool inWater(vec3 P){return P.y<uWL+.01&&P.y>-1.&&P.x>uTmin.x-.4&&P.x<uTmax.x+.4&&P.z>uTmin.z-.4&&P.z<uTmax.z+.4;}
float waterSeg(vec3 P){vec3 d=P-uCam;float L=length(d);vec3 rd=d/max(L,1e-4);
  vec2 t=boxT(uCam,rd,uTmin,vec3(uTmax.x,uWL,uTmax.z));float a=max(t.x,0.),b=min(t.y,L);return max(b-a,0.);}
// in-scattered colour dims and turns blue-green with the mean depth of the view segment
vec3 applyWater(vec3 col,vec3 P){float s=waterSeg(P);float md=max(uWL-(P.y+min(uCam.y,uWL))*.5,0.);vec3 fc=uFogC*exp(-uAbs*md*1.2)*1.05;return col*exp(-uAbs*s)+fc*(1.-exp(-uFogD*s));}
vec2 sandUV(vec3 P){return vec2((P.x-uTmin.x)/(uTmax.x-uTmin.x),(P.z-uTmin.z)/(uTmax.z-uTmin.z));}
float shadowAt(vec3 P,vec3 N){
  if(uShadowOn<.5)return 1.;
  vec4 sp=uSM*vec4(P+N*.12,1.);vec3 c=sp.xyz/sp.w;
  if(c.x<0.||c.x>1.||c.y<0.||c.y>1.||c.z>1.)return 1.;
  float ts=1./float(textureSize(uShadow,0).x);float b=.0012;
  if(uPCSS>.5){ // percentage-closer soft shadows: penumbra grows with blocker-receiver distance (lamp ~3 deg)
#ifdef VERTEX_STAGE
    float rot=0.;
#else
    float rot=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))*6.2831;
#endif
   float rs=1.8/uSMk.y;float bd=0.,nb=0.;
    {float d=texture(uShadowR,c.xy).r;if(d<c.z-b){bd+=d;nb+=1.;}} // centre tap: a thin occluder (fish, shrimp, leaf) right above must never be missed by the rotated ring, or the pixel pops fully lit
    int nb0=uPCSS>1.5?8:5,np=uPCSS>1.5?12:8;float fb=float(nb0),fp=float(np);
    for(int i=0;i<8;i++){if(i>=nb0)break;float a=rot+float(i)*2.39996;vec2 o=vec2(cos(a),sin(a))*sqrt((float(i)+.5)/fb)*rs;float d=texture(uShadowR,c.xy+o).r;if(d<c.z-b){bd+=d;nb+=1.;}}
    if(nb<.5)return 1.;bd/=nb;float pen=max(clamp((c.z-bd)*uSMk.x*.055,.03,1.6)/uSMk.y,1.3*ts);float sum=0.;
    for(int i=0;i<12;i++){if(i>=np)break;float a=rot+1.3+float(i)*2.39996;vec2 o=vec2(cos(a),sin(a))*sqrt((float(i)+.5)/fp)*pen;sum+=texture(uShadow,vec3(c.xy+o,c.z-b-pen*.6));}
    return sum/fp;}
  float s=texture(uShadow,vec3(c.xy+vec2(-.6,-.6)*ts,c.z-b))+texture(uShadow,vec3(c.xy+vec2(.6,-.6)*ts,c.z-b))
         +texture(uShadow,vec3(c.xy+vec2(-.6,.6)*ts,c.z-b))+texture(uShadow,vec3(c.xy+vec2(.6,.6)*ts,c.z-b));
  return s*.25;}
float shadow1(vec3 P){if(uShadowOn<.5)return 1.;vec4 sp=uSM*vec4(P,1.);vec3 c=sp.xyz/sp.w;
  if(c.x<0.||c.x>1.||c.y<0.||c.y>1.||c.z>1.)return 1.;return texture(uShadow,vec3(c.xy,c.z-.002));}
vec3 causAt(vec3 P){
  float d=max(uWL-P.y,0.);
  vec2 sp=(P.xz+uLw.xz/uLw.y*d-uCMap.xy)/uCMap.zw;
  float lod=clamp(abs(d-uCDep)*.075,0.,2.6);
  vec3 c=textureLod(uCaus,sp,lod).rgb*4.;c=1.38*c/(1.+.42*c);
  float focus=smoothstep(.5,12.,d);
  return mix(vec3(1.),c,focus*uCausAmt);}
// live surface: slope (dh/dx, dh/dz) from the ripple simulation plus a gentle swell
vec2 simGrad(vec2 xz){vec2 uv=(xz-uSimR.xy)/uSimR.zw;vec2 tx=1./vec2(textureSize(uSim,0));float cx=uSimR.z*tx.x,cz=uSimR.w*tx.y;
  // a 1.5-texel stencil keeps the reflected lamp from showing the simulation's texels
  float l=texture(uSim,uv-vec2(1.5*tx.x,0.)).r,r=texture(uSim,uv+vec2(1.5*tx.x,0.)).r,dn=texture(uSim,uv-vec2(0.,1.5*tx.y)).r,up=texture(uSim,uv+vec2(0.,1.5*tx.y)).r;
  return vec2(r-l,up-dn)/(3.*vec2(cx,cz));}
// thin-film interference (T10): reflectance of a film of index n, thickness t (um), cosine of incidence c
vec3 film(float c,float t,float n){float ct=sqrt(max(1.-(1.-c*c)/(n*n),0.));vec3 ph=12.566*n*t*ct/vec3(.65,.532,.45);return .5-.5*cos(ph);}
vec3 envColor(vec3 d){
  vec3 c=mix(vec3(.010,.009,.008),vec3(.03,.028,.026),clamp(d.y*.5+.5,0.,1.));
  float win=smoothstep(.06,0.,abs(d.x+.62)-.22)*smoothstep(.06,0.,abs(d.y-.12)-.2)*step(0.,d.z);
  c+=vec3(.16,.2,.26)*win;
  c+=vec3(1.,.86,.62)*pow(max(d.y,0.),60.)*.5;
  return c*uEnvK;}
vec3 roomLit(vec3 P,vec3 N,vec3 V,vec3 alb,float rough,float spec){
  vec3 tc=vec3(clamp(P.x,uTmin.x,uTmax.x),clamp(P.y,0.,uWL),clamp(P.z,uTmin.z,uTmax.z));
  vec3 d=tc-P;float dist=length(d)+.5;vec3 L=d/dist;
  float g=1./(1.+dist*dist*.0018);
  vec3 c=alb*(uRoomAmb*(.55+.45*N.y)+uLcol*uTankGlow*g*max(dot(N,L)*.6+.4,0.));
  vec3 R=reflect(-V,N);c+=envColor(R)*spec*.5*(1.-rough);
  // directly under the lamp but above the water (floating leaves, emergent stems, wet rim)
  float under=step(uTmin.x,P.x)*step(P.x,uTmax.x)*step(uTmin.z,P.z)*step(P.z,uTmax.z)*step(P.y,uWL+11.)*step(uWL-1.,P.y);
  if(under>0.){float nl=max(dot(N,uLdir),0.);vec3 Hh=normalize(uLdir+V);float gl=mix(6.,220.,pow(1.-rough,2.));
    c+=uLcol*(alb*nl*.85+pow(max(dot(N,Hh),0.),gl)*(gl+8.)/60.*spec*nl)*shadowAt(P,N);}
  return c;}
vec3 lighting(vec3 P,vec3 N,vec3 V,vec3 alb,float rough,float spec,float trans,float ao){
  if(!inWater(P))return roomLit(P,N,V,alb,rough,spec)*ao;
  float depth=max(uWL-P.y,0.);
  vec3 Lc=uLcol*exp(-uAbs*depth*1.15);
  float ndl=dot(N,uLdir);
  float sh=shadowAt(P,(ndl<0.&&trans>.1)?-N:N);
  vec3 dl=Lc*sh*mix(vec3(1.),causAt(P),.45+.55*abs(N.y));
  vec3 col=alb*dl*(max(ndl,0.)+trans*max(-ndl,0.)*.8);
  col+=alb*dl*trans*.12*vec3(.9,1.,.6);
  vec3 Hh=normalize(uLdir+V);float gl=mix(6.,220.,pow(1.-rough,2.));
  col+=dl*pow(max(dot(N,Hh),0.),gl)*(gl+8.)/60.*spec*max(ndl,0.);
  float hemi=N.y*.5+.5;
  vec3 amb=uAmb*mix(vec3(.46,.43,.36),vec3(1.),hemi)*exp(-uAbs*depth*.55);
  col+=alb*amb*ao*(1.+trans*.6);
  return col;}
`;
const C_FS=`
vec3 perturb(vec3 N,vec3 P,float h){
  vec3 dpdx=dFdx(P),dpdy=dFdy(P);vec3 r1=cross(dpdy,N),r2=cross(N,dpdx);float det=dot(dpdx,r1);
  float hx=dFdx(h),hy=dFdy(h);vec3 g=sign(det)*(hx*r1+hy*r2);
  vec3 n=normalize(abs(det)*N-g);return (abs(det)<1e-12)?N:n;}
`;
const VS_FULL=H+`out vec2 vUV;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vUV=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const FS_DEPTH=H+`void main(){}`;
