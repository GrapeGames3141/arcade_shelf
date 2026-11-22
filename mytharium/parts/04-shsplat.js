
// ---------- Gaussian splats ----------
// One 48-byte record per splat (instanced quad, see SPLAT-GUIDE):
//   sP f32x3 centre · sU f32x3 half-axis · sV f32x3 half-axis · sCol u8x4 (sRGB colour, ao) · sNor i8x4 (normal, sway) · sExt u8x4
// Static splats (plants, ground cover): sExt = flags, glow, wilt group, shape.
//   flags: 1 translucent leaf · 2 blade anchored at its base · 4 emissive · 8 petal (opens with bloom) · 16 fruit/berry (glossy)
//   shape: 0 soft gaussian · 1 lobed daub · 2 blade/strand · 3 petal · 4 round dot (berry, flower centre)
// Skinned coat splats (fur, manes, hair, beard, feathers): positions in bind pose, sExt = bone0, bone1, weight0, flags|shape<<4,
//   sCol = shade, palette mix (c1 to c2), strand t (accent c3 or rainbow), ao; sNor.w = how much the splat hangs and swings.
const SPLAT_COMMON=`
in vec2 sC;in vec3 sP;in vec3 sU;in vec3 sV;in vec4 sCol;in vec4 sNor;in vec4 sExt;
uniform float uDens;uniform float uSzK;uniform vec4 uPush[8];
out vec2 vQ;out vec3 vLit;flat out vec4 vF;out float vA;
vec3 s2l(vec3 c){return c*c*(c*.3+.7);}
float cull(){float h=fract(sin(float(gl_InstanceID)*12.9898+78.233)*43758.5453);return step(uDens,h);}
`;
const VS_SPLAT=H+'#define VERTEX_STAGE\n'+C_UNI+C_FN+SPLAT_COMMON+`
uniform mat4 uModel;uniform mat3 uNmat;uniform float uWilt;uniform float uBloom;uniform float uGlowK;uniform float uShadowPass;uniform vec3 uTintS;
void main(){
  int flags=int(sExt.x+.5);float glow=sExt.y/255.;int shape=int(sExt.w+.5);
  if(cull()>.5){gl_Position=vec4(2.,2.,2.,1.);return;}
  float szk=uSzK;vec3 U=sU*szk,Vv=sV*szk;
  float sway=sNor.w;
  // petals open with bloom, plants wilt: droop the far axis and shrink
  if((flags&8)!=0){U*=mix(.25,1.,uBloom);Vv*=mix(.25,1.,uBloom);}
  vec3 P0=sP;
  if(uWilt>0.){Vv*=1.-uWilt*.35;P0.y-=uWilt*sway*1.2;}
  vec3 corner=P0+U*sC.x+Vv*sC.y;
  vec4 w=uModel*vec4(corner,1.);vec3 Wc=(uModel*vec4(P0,1.)).xyz;
  if(Wc.x<uTmin.x-.2||Wc.x>uTmax.x+.2||Wc.z<uTmin.z-.2||Wc.z>uTmax.z+.2){gl_Position=vec4(2.,2.,2.,1.);return;}
  // sway: blades move at the tip only; the whole stalk bends as one because the phase comes from the rest position
  float tip=(flags&2)!=0?(sC.y+1.)*.5:1.;
  float ph=dot(Wc.xz,vec2(.31,.17));
  vec3 off=vec3(sin(uTime*1.3+ph)+.4*sin(uTime*2.7+ph*1.7),0.,cos(uTime*1.1+ph*1.3))*.06*sway*tip;
  // creatures push plants aside as they pass through
  for(int i=0;i<8;i++){vec4 pu=uPush[i];if(pu.w<=0.)continue;vec3 d=Wc-pu.xyz;d.y=0.;float L=length(d);float k=smoothstep(pu.w,pu.w*.3,L)*(sway*.85+.15);
    off+=vec3(d.x,-.25*L,d.z)/max(L,.01)*k*pu.w*.45*tip;}
  w.xyz+=off;w.xz=clamp(w.xz,uTmin.xz+.08,uTmax.xz-.08);
  gl_Position=uVP*w;vQ=sC;vF=vec4(float(flags),float(shape),glow,float(gl_InstanceID%977));
  if(uShadowPass>.5){vLit=vec3(0.);vA=1.;return;}
  vec3 N=normalize(uNmat*sNor.xyz);vec3 Vd=normalize(uCam-Wc);if(dot(N,Vd)<0.)N=-N;
  vec3 alb=s2l(sCol.rgb)*uTintS;float ao=sCol.a;
  if(uWilt>0.){alb=mix(alb,vec3(lum(alb))*vec3(1.25,1.,.62),uWilt*.75);}
  float trans=(flags&1)!=0?.7:0.;float spec=(flags&16)!=0?.5:.06;float rough=(flags&16)!=0?.2:.7;
  vec3 col=lighting(Wc,N,Vd,alb,rough,spec,trans,ao);
  if((flags&1)!=0){float bl=pow(max(dot(-Vd,uLdir),0.),3.);col+=alb*uLcol*bl*.6*shadow1(Wc);}
  if((flags&4)!=0)col+=alb*glow*uGlowK*(1.6+.4*sin(uTime*2.+ph*3.));
  vLit=applyMist(col,Wc);vA=1.;}`;
const FS_SPLAT=H+C_UNI+`
uniform float uA2C;uniform float uShadowPass;
in vec2 vQ;in vec3 vLit;flat in vec4 vF;in float vA;out vec4 oC;
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
void main(){int shape=int(vF.y+.5);float seed=vF.w;vec2 q=vQ;float r2=dot(q,q);float a;float shade=1.;
  if(shape==2){float t=(q.y+1.)*.5;float w=max(1.-pow(t,1.6),.04);a=smoothstep(w,w*.45,abs(q.x));shade=.8+.35*t-.15*abs(q.x)/w;}
  else if(shape==5){a=smoothstep(1.,.35,abs(q.x))*smoothstep(1.,.62,abs(q.y));shade=1.-.12*abs(q.x);} // hair strand: even width, soft ends that overlap
  else if(shape==3){vec2 p=vec2(q.x/(.55+.45*(q.y*.5+.5)),q.y);float rr=dot(p,p);a=smoothstep(1.,.75,rr);shade=.85+.25*(1.-rr)+.06*sin(q.x*14.);}
  else if(shape==4){a=smoothstep(1.,.82,r2);shade=.75+.5*sqrt(max(1.-r2,0.));}
  else if(shape==1){float ang=atan(q.y,q.x);r2*=1.12+.18*sin(ang*3.+seed)+.1*sin(ang*7.+seed*1.7);a=smoothstep(1.,.62,r2);shade=.92+.1*sin(q.y*8.+seed*2.3);}
  else{a=exp(-r2*3.2)*1.25;shade=.9+.15*(1.-r2);}
  if(uShadowPass>.5){if(a<.5)discard;oC=vec4(0.);return;}
  if(uA2C<.5){if(a<ign(gl_FragCoord.xy+seed))discard;a=1.;}else if(a<.04)discard;
  oC=vec4(vLit*shade,clamp(a,0.,1.));}`;
// skinned coat splats: fur, manes, tails, hair, beards, feathers
const VS_COAT=H+'#define VERTEX_STAGE\n'+C_UNI+C_FN+SPLAT_COMMON+`
uniform mat4 uBones[24];uniform vec3 uC1;uniform vec3 uC2;uniform vec3 uC3;uniform float uRainbow;uniform vec3 uSwing;uniform float uShadowPass;uniform float uWetC;uniform float uSzC;uniform float uClip;
vec3 hsv(float h){return clamp(abs(fract(h+vec3(0.,2./3.,1./3.))*6.-3.)-1.,0.,1.);}
void main(){
  int b0=int(sExt.x+.5),b1=int(sExt.y+.5);float w0=sExt.z/255.;int fs=int(sExt.w+.5);int shape=fs/16;int flags=fs-shape*16;
  if(cull()>.5){gl_Position=vec4(2.,2.,2.,1.);return;}
  mat4 M=uBones[b0]*w0+uBones[b1]*(1.-w0);
  float hang=max(sNor.w,0.);float k=uSzK*uSzC;
  vec3 U=mat3(M)*sU*k,Vv=mat3(M)*sV*k;vec3 C=(M*vec4(sP,1.)).xyz;
  // hanging strands swing behind the motion and settle with gravity; wet hair clings
  float ph=sCol.b*6.+float(gl_InstanceID%31)*.2;
  vec3 sw=uSwing*hang+vec3(sin(uTime*2.1+ph),0.,cos(uTime*1.7+ph*1.3))*.05*hang*(1.-uWetC*.8);
  vec3 W=C+sw+U*sC.x+Vv*sC.y;if(uClip>.5)W.xz=clamp(W.xz,uTmin.xz+.1,uTmax.xz-.1);
  gl_Position=uVP*vec4(W,1.);vQ=sC;vF=vec4(float(flags),float(shape),0.,float(gl_InstanceID%977));vA=1.;
  if(uShadowPass>.5){vLit=vec3(0.);return;}
  vec3 N=normalize(mat3(M)*sNor.xyz);vec3 Vd=normalize(uCam-C);
  vec3 base=mix(uC1,uC2,sCol.g);if(shape==4)base=uC3;if(uRainbow>.5)base=mix(base,s2l(hsv(sCol.b*.85+.02))*.85+.08,step(.5,sCol.g)*.85);else base=mix(base,uC3,sCol.b*step(.5,sCol.g)*.12);
  vec3 alb=base*(.86+.24*sCol.r);alb*=1.-uWetC*.35;
  // fur and hair: Kajiya-ish sheen along the strand, two-sided diffuse wrap
  float ndl=dot(N,uLdir);vec3 T=normalize(Vv);vec3 Hh=normalize(uLdir+Vd);float th=dot(T,Hh);float sheen=pow(max(sqrt(max(1.-th*th,0.)),0.),60.)*.07;
  bool hair=shape==5;
  if(dot(N,Vd)<0.)N=-N;
  vec3 col=lighting(C,N,Vd,alb,.6,.05,hair?.45:.25,sCol.a);
  if(hair){vec3 T2=normalize(T-N*.18),T1=normalize(T+N*.1);float a1=dot(T1,Hh),a2=dot(T2,Hh);float s1=pow(sqrt(max(1.-a1*a1,0.)),90.),s2=pow(sqrt(max(1.-a2*a2,0.)),24.);
    col+=uLcol*shadow1(C)*(s1*.16+s2*.3*alb)*sCol.a*max(ndl*.5+.5,0.);}
  else col+=uLcol*sheen*shadow1(C)*mix(vec3(1.),alb*2.,.5);
  vLit=applyMist(col,C);}`;
// ---------- billboard particles: dust, mist, droplets, smoke, flame, sparkles, petals ----------
const VS_PART=H+'#define VERTEX_STAGE\n'+C_UNI+C_FN+`
uniform vec3 uCamR;uniform vec3 uCamU;uniform float uClip;
in vec2 sC;in vec4 pA;in vec4 pB;in vec4 pC;
out vec2 vQ;out vec4 vCo;flat out vec4 vK;out vec3 vLit;
void main(){vec3 c=pA.xyz;float s=pA.w;float kind=pC.x;vec3 R=uCamR,Uu=uCamU;
  float ro=pC.z;float cr=cos(ro),sr=sin(ro);vec3 R2=R*cr+Uu*sr,U2=-R*sr+Uu*cr;
  vec3 w=c+(R2*sC.x+U2*sC.y*(1.+pC.w))*s;if(uClip>.5){w.xz=clamp(w.xz,uTmin.xz+.1,uTmax.xz-.1);w.y=min(w.y,uTmax.y);}vQ=sC;vCo=pB;vK=pC;
  float lit=shadow1(c);vLit=uLcol*lit*.6+uSky*.8+uGnd*.3;
  gl_Position=uVP*vec4(w,1.);}`;
const FS_PART=H+C_UNI+C_FN+`
in vec2 vQ;in vec4 vCo;flat in vec4 vK;in vec3 vLit;out vec4 oC;
void main(){float d=length(vQ);if(d>1.)discard;float k=vK.x;vec3 c=vCo.rgb;float a=vCo.a;
  if(k<.5){float g=exp(-d*d*5.)+.35*exp(-d*d*28.);oC=vec4(c*g*a,0.);}                                   // soft glow, additive
  else if(k<1.5){float g=pow(1.-d,1.7)*(.75+.25*sin(vQ.x*4.+vK.y*20.)*sin(vQ.y*3.-vK.y*9.));float aa=g*a;oC=vec4(c*vLit*aa,aa);} // mist puff
  else if(k<2.5){float rim=smoothstep(.55,.95,d)*smoothstep(1.,.9,d);float sp=smoothstep(.35,0.,length(vQ-vec2(-.3,.35)));
    vec3 cc=vLit*(rim*.6+sp*2.)+envColor(vec3(vQ,1.))*.4;float aa=clamp(rim*.5+sp*.5+.08,0.,1.)*a;oC=vec4(cc*aa,aa);}         // droplet
  else if(k<3.5){float g=pow(1.-d,1.4);float aa=g*a*(.7+.3*vnoise(vec3(vQ*3.,vK.y*10.)));oC=vec4(c*vLit*aa,aa);}              // smoke
  else if(k<4.5){float t=clamp(1.-d,0.,1.);vec3 fc=mix(vec3(1.,.25,.03),vec3(1.,.85,.5),t*t)*2.5;oC=vec4(fc*c*t*t*a,0.);}        // flame
  else if(k<5.5){vec2 q=abs(vQ);float st=max(exp(-q.x*14.)*exp(-q.y*2.2),exp(-q.y*14.)*exp(-q.x*2.2))+exp(-d*d*16.)*.8;oC=vec4(c*st*a,0.);} // sparkle
  else{vec2 q=vQ;float sh=smoothstep(1.,.7,dot(vec2(q.x*1.8,q.y),vec2(q.x*1.8,q.y)));oC=vec4(c*vLit*sh*a,sh*a);}                // petal / leaf
}`;
