
// ---------- billboards: particles & bubbles ----------
const VS_BILL=H+'#define VERTEX_STAGE\n'+C_UNI+C_FN+`
uniform vec3 uCamR;uniform vec3 uCamU;
in vec3 aPos;in vec4 iM0;in vec4 iM1;
out vec2 vQ;out vec4 vB;out vec3 vW;out vec3 vLit;
void main(){vec3 c=iM0.xyz;float s=iM0.w;vec3 w=c+(uCamR*aPos.x+uCamU*aPos.y)*s;vQ=aPos.xy;vB=iM1;vW=c;
  float dep=max(uWL-c.y,0.);vLit=uLcol*exp(-uAbs*dep)*shadow1(c)*causAt(c);
  gl_Position=uVP*vec4(w,1.);}`;
const FS_BILL=H+C_UNI+C_FN+`
in vec2 vQ;in vec4 vB;in vec3 vW;in vec3 vLit;out vec4 oC;
void main(){float d=length(vQ);if(d>1.)discard;float s=waterSeg(vW);vec3 Tr=exp(-uAbs*s);
  vec3 V=normalize(uCam-vW);float ph=.4+.9*pow(max(dot(-V,-uLdir),0.),3.);
  if(vB.x<.5){float a=pow(1.-d,2.)*vB.y;vec3 c=(vLit*(.35+ph*.8)+uAmb*.35)*a*Tr*.28;oC=vec4(c,a*.12);}
  else if(vB.x>2.5){float a=pow(1.-d,1.5)*vB.y;vec3 c=(vLit*(.5+ph*.6)+uAmb*.7+uFogC*1.2)*vec3(.95,.9,.8)*Tr;oC=vec4(c*a*.9,a*.7);}
  else if(vB.x>1.5){float a=pow(1.-d,1.6)*clamp(vB.y,0.,1.)*(.75+.25*sin(vQ.x*5.+vB.z*20.)*sin(vQ.y*4.-vB.z*9.))*.7;
    vec3 c=(vLit*(.35+ph*.3)+uAmb*.9+uFogC*.6)*vec3(.58,.57,.52)*Tr;oC=vec4(c*a,a);}
  else{float rim=smoothstep(.62,.97,d)*smoothstep(1.,.93,d);float spot=smoothstep(.3,.0,length(vQ-vec2(-.34,.4)));float spot2=smoothstep(.22,0.,length(vQ-vec2(.3,-.38)))*.4;
    float cs=sqrt(max(1.-d*d,0.));float th=.32+.22*sin(vQ.x*3.1+vQ.y*2.3+uTime*.7+vB.z*7.)+.1*sin(vQ.y*7.+uTime*1.3);vec3 fc=mix(vec3(1.),film(cs,th,1.33)*1.6,.22);
    vec3 L=vLit*.55+uAmb*1.2+uFogC*1.5;vec3 c=L*(rim*.9*fc+spot*2.2+spot2*fc+.04)*Tr;float a=clamp(rim*.55+spot*.4+.05,0.,1.)*vB.y;oC=vec4(c*vB.y,a);}}`;

// ---------- water surface ----------
const FS_SURF=H+C_UNI+C_FN+`
uniform sampler2D uScene;uniform vec2 uRes;
in vec3 vW;in vec3 vN;in vec2 vUV;in vec4 vCol;in vec4 vExt;in vec3 vO;out vec4 oC;
void main(){vec2 gs=simGrad(vW.xz),gw=swellGrad(vW.xz,uTime,uRuffle);vec2 g=gs+gw;
  // fine capillary detail for shading only (sparkle in reflections), faded out where it would alias
  float fw=length(fwidth(vW.xz));float df=1.-smoothstep(.08,.35,fw);vec2 e1=normalize(vec2(.8,.6)),e2=normalize(vec2(-.3,1.));
  g+=(e1*cos(dot(e1,vW.xz)*11.+uTime*9.)+e2*cos(dot(e2,vW.xz)*16.3-uTime*12.)*.7)*.007*uRuffle*df;
  vec3 N=normalize(vec3(-g.x,1.,-g.y));vec3 V=normalize(uCam-vW);vec2 suv=gl_FragCoord.xy/uRes;vec3 col;
  if(uCam.y<uWL){vec3 Nd=-N;vec3 I=-V;vec3 R=reflect(I,Nd);
    vec3 Q=vW+R*14.;vec4 c=uVP*vec4(Q,1.);vec2 ruv=c.xy/max(c.w,.01)*.5+.5;
    vec3 refl=texture(uScene,clamp(ruv,vec2(.002),vec2(.998))).rgb;
    vec3 Tt=refract(I,Nd,1.333);float tir=dot(Tt,Tt)<1e-4?1.:0.;
    float F=tir>.5?1.:clamp(.02+.98*pow(1.-abs(dot(Tt,N)),5.),0.,1.);
    float ly=uWL+12.15;vec3 sky=envColor(Tt)*2.;if(Tt.y>.02){vec3 hp=vW+Tt*((ly-vW.y)/Tt.y);float lamp=smoothstep(.8,0.,abs(hp.x)-44.5)*smoothstep(.8,0.,abs(hp.z)-4.6);sky+=uLampC*uLampE*lamp*1.5;}
    sky+=uLcol*.03;
    col=mix(sky,refl*.92,F);
    col=applyWater(col,vW);}
  else{float F=.02+.98*pow(1.-max(dot(N,V),0.),5.);
    // seen from above, the bed shifts by about depth x slope x 0.25: the steep little wavelets that focus caustics barely move it, so they count for less here
    vec2 gr=gs+gw*.35;vec3 refr=texture(uScene,clamp(suv-gr*.05,vec2(.002),vec2(.998))).rgb;
    vec3 R=reflect(-V,N);vec3 env=envColor(R);float ly=uWL+12.15;if(R.y>.02){vec3 hp=vW+R*((ly-vW.y)/R.y);float lamp=smoothstep(2.5,-1.,abs(hp.x)-44.5)*smoothstep(2.,-1.5,abs(hp.z)-4.6);env=mix(env,uLampC*uLampE*2.2,lamp);}
    float sp=pow(max(dot(R,normalize(vec3(.1,1.,.2))),0.),400.)*uLampE*.15;col=mix(refr,env,F)+sp;}
  oC=vec4(col,1.);}`;

// ---------- glass ----------
const FS_GLASS=H+C_UNI+C_FN+`
uniform float uAlgae;uniform sampler2D uScene;uniform vec2 uRes;
in vec3 vW;in vec3 vN;in vec2 vUV;in vec4 vCol;in vec4 vExt;in vec3 vO;out vec4 oC;
void main(){vec3 No=normalize(vN);vec3 N=No;vec3 V=normalize(uCam-vW);if(dot(N,V)<0.)N=-N;float L=lum(uLcol);
  if(vCol.x>.5){vec3 c=vec3(.16,.42,.36)*(.06+.22*L)+vec3(.02,.05,.045);oC=vec4(c,.8);return;}
  // total internal reflection: seen from outside through another pane, the side panes act as mirrors of the tank interior
  bool camOut=any(lessThan(uCam,uTmin-vec3(.5)))||any(greaterThan(uCam,vec3(uTmax.x,uTmax.y+30.,uTmax.z)+vec3(.5)));
  if(camOut&&dot(No,uCam-vW)<0.&&vW.y<uWL-.3&&vW.y>.3){
    vec3 d=normalize(vW-uCam);vec3 ne=abs(uCam.z)>uTmax.z?vec3(0.,0.,sign(uCam.z)):abs(uCam.x)>uTmax.x?vec3(sign(uCam.x),0.,0.):vec3(0.,1.,0.);
    vec3 dw=refract(d,ne,1./1.333);if(dot(dw,dw)>.5){float ci=dot(dw,No);float s2=1.333*1.333*(1.-ci*ci);
      if(ci>0.&&s2>1.){vec3 r=reflect(dw,No);vec3 Hh=vW+r*22.;vec4 cp=uVP*vec4(Hh,1.);vec2 ruv=cp.xy/max(cp.w,.01)*.5+.5;
        float edge=smoothstep(1.,1.12,s2);vec3 refl=texture(uScene,clamp(ruv,vec2(.002),vec2(.998))).rgb*vec3(.9,.96,.94);
        float fade=smoothstep(0.,.03,min(min(ruv.x,1.-ruv.x),min(ruv.y,1.-ruv.y)));
        oC=vec4(refl*edge*fade*.88,edge*fade*.88);return;}}}
  float F=.04+.96*pow(1.-max(dot(N,V),0.),5.);vec3 env=envColor(reflect(-V,N));
  float sm=fbm(vW*.12)*.6+fbm(vW*.9)*.4;vec3 col=env*F*(.6+.6*sm)*1.4;float a=F*.5;
  float al=uAlgae*smoothstep(.45,.75,fbm(vW*.07+2.))*step(vW.y,uWL)*smoothstep(-1.,4.,vW.y);
  col+=vec3(.06,.13,.04)*al*(.2+L*.25);a+=al*.55;
  // a few small coralline spots on the back glass (the front gets scraped clean)
  vec2 cq=vec2(vW.x,vW.y)*.5;vec2 ci=floor(cq);float chs=hash12(ci+7.);float cs=step(.9,chs)*smoothstep(.06,.0,length(fract(cq)-.5-(vec2(hash12(ci),hash12(ci+3.))-.5)*.6)-.05-.08*hash12(ci+5.))*step(vN.z,-.5)*smoothstep(18.,2.,vW.y);
  col+=vec3(.2,.05,.12)*cs*(.15+L*.2);a=max(a,cs*.6);
  float m=smoothstep(.2,0.,abs(vW.y-uWL))*step(.5,vCol.y);col+=vec3(.55,.68,.7)*m*(.05+.12*L);a=max(a,m*.35);
  oC=vec4(col,clamp(a,0.,.95));}`;

// ---------- caustics generator ----------
const FS_CAUS=H+`
uniform float uTime;uniform vec2 uScale;in vec2 vUV;out vec4 o;
vec2 h22(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}
float vor(vec2 p,float t,float per){vec2 ip=floor(p),fp=fract(p);float f1=9.,f2=9.;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j));vec2 c=mod(ip+g,per);vec2 h=h22(c);
    vec2 o=.5+.42*sin(t*(.55+h*.6)+6.2831*h);vec2 r=g+o-fp;float d=dot(r,r);if(d<f1){f2=f1;f1=d;}else if(d<f2)f2=d;}
  return sqrt(f2)-sqrt(f1);}
void main(){vec2 p=vUV*uScale;float t=uTime;
  vec2 w=vec2(sin(6.2831*(p.y*2.+t*.05)),sin(6.2831*(p.x*2.-t*.043)))*.035;
  vec2 w2=vec2(sin(6.2831*(p.y*3.-t*.07)+1.),sin(6.2831*(p.x*3.+t*.06)+2.))*.02;
  float e1=vor((p+w)*6.,t*.85,6.),e2=vor((p-w*1.2+w2+.37)*10.,t*1.1+3.,10.);
  float c1=exp(-e1*10.),c2=exp(-e2*13.);
  float c=c1*.62+c2*.48;c=pow(c,1.5)*1.25;
  o=vec4(vec3((.58+clamp(c*.75,0.,1.)*1.75)*.25),1.);}`;

// ---------- ripple simulation (T5): R = height (cm), G = previous height ----------
const FS_RIPPLE=H+`
uniform sampler2D uPrev;uniform vec2 uTx;uniform vec4 uDrops[16];uniform float uDamp;in vec2 vUV;out vec4 o;
void main(){vec4 c=texture(uPrev,vUV);float h=c.r,p=c.g;
  float l=texture(uPrev,vUV-vec2(uTx.x,0.)).r,r=texture(uPrev,vUV+vec2(uTx.x,0.)).r,d=texture(uPrev,vUV-vec2(0.,uTx.y)).r,u=texture(uPrev,vUV+vec2(0.,uTx.y)).r;
  float lap=l+r+u+d-4.*h;float nh=h+(h-p)*uDamp+.3*lap;nh*=.9993;
  for(int i=0;i<16;i++){vec4 dr=uDrops[i];if(dr.z<=0.)continue;vec2 dd=(vUV-dr.xy)/uTx;float u=dot(dd,dd)/(dr.z*dr.z);nh+=dr.w*(1.-u)*exp(-u);}
  o=vec4(clamp(nh,-2.,2.),h,0.,1.);}`;
// ---------- true caustics (T7): refract a light grid through the live surface ----------
const VS_CGRID=H+SWELL+`
uniform float uRuffle;uniform sampler2D uSim;uniform vec4 uSimR;uniform vec4 uCMap;uniform vec3 uLd;uniform float uIor;uniform float uDepth;uniform float uTime;
in vec3 aPos;out vec2 vOld;out vec2 vNew;
void main(){vec2 uv=aPos.xy;vec2 S=uSimR.xy+uv*uSimR.zw;vec2 tx=1./vec2(textureSize(uSim,0));
  float l=texture(uSim,uv-vec2(tx.x,0.)).r,r=texture(uSim,uv+vec2(tx.x,0.)).r,dn=texture(uSim,uv-vec2(0.,tx.y)).r,up=texture(uSim,uv+vec2(0.,tx.y)).r;
  vec2 g=vec2(r-l,up-dn)/(2.*uSimR.zw*tx)+swellGrad(S,uTime,uRuffle);vec3 n=normalize(vec3(-g.x,1.,-g.y));
  vec3 rf=refract(uLd,vec3(0.,1.,0.),1./uIor),rr=refract(uLd,n,1./uIor);
  vec2 Pf=S+rf.xz*(uDepth/-rf.y),P=S+rr.xz*(uDepth/max(-rr.y,.2));
  vec2 m=S+(P-Pf);vOld=S;vNew=m;gl_Position=vec4((m-uCMap.xy)/uCMap.zw*2.-1.,0.,1.);}`;
const FS_CGRID=H+`
in vec2 vOld;in vec2 vNew;out vec4 o;
void main(){vec2 ax=dFdx(vOld),ay=dFdy(vOld),bx=dFdx(vNew),by=dFdy(vNew);
  float a0=abs(ax.x*ay.y-ax.y*ay.x),a1=abs(bx.x*by.y-bx.y*by.x);float I=min(a0/max(a1,a0*.06),9.);o=vec4(vec3(I*.25),1.);}`;

// ---------- volumetric light shafts ----------
const FS_VOL=H+C_UNI+C_FN+`
uniform sampler2D uDepth;uniform mat4 uInvVP;uniform int uSteps;uniform float uScat;uniform float uFrame;
in vec2 vUV;out vec4 o;
void main(){float d=texture(uDepth,vUV).r;vec4 nd=vec4(vUV*2.-1.,d*2.-1.,1.);vec4 wp=uInvVP*nd;vec3 P=wp.xyz/wp.w;
  vec3 dv=P-uCam;float L=length(dv);vec3 rd=dv/L;
  vec2 t=boxT(uCam,rd,uTmin,vec3(uTmax.x,uWL,uTmax.z));float a=max(t.x,0.),b=min(t.y,L);vec3 acc=vec3(0.);
  if(b>a){float j=fract(52.9829189*fract(dot(gl_FragCoord.xy+uFrame*vec2(5.588,3.3),vec2(.06711056,.00583715))));
    float dt=(b-a)/float(uSteps);
    for(int i=0;i<48;i++){if(i>=uSteps)break;float tt=a+(float(i)+j)*dt;vec3 X=uCam+rd*tt;
      float sh=shadow1(X);float dep=max(uWL-X.y,0.);
      vec2 sp=(X.xz+uLw.xz/uLw.y*dep-uCMap.xy)/uCMap.zw;float c=textureLod(uCaus,sp,3.).g*4.;
      float beam=mix(.32,.1+c*.55,smoothstep(1.,16.,dep)*uCausAmt);
      acc+=uLcol*exp(-uAbs*(dep+(tt-a)))*sh*beam*dt;}
    float cs=dot(rd,uLdir);float g=.55;float hg=(1.-g*g)/pow(1.+g*g-2.*g*cs,1.5)/12.566;
    acc*=uScat*(hg*6.+.08);}
  o=vec4(acc,L);}`;
// ---------- screen-space ambient occlusion (half res): R = visibility, G = distance from camera ----------
const FS_AO=H+`
uniform sampler2D uDepth;uniform mat4 uInvVP;uniform mat4 uVP;uniform vec3 uCam;uniform vec2 uRes;uniform float uRad;uniform int uN;in vec2 vUV;out vec4 o;
vec3 wpos(vec2 uv,float d){vec4 w=uInvVP*vec4(uv*2.-1.,d*2.-1.,1.);return w.xyz/w.w;}
void main(){ivec2 fs=ivec2(textureSize(uDepth,0));ivec2 ip=ivec2(gl_FragCoord.xy)*2;float d=texelFetch(uDepth,ip,0).r;
  if(d>.99999){o=vec4(1.,1e4,0.,1.);return;}
  vec2 uv=(vec2(ip)+.5)/vec2(fs);vec3 P=wpos(uv,d);float L=length(P-uCam);
  vec2 t=1./vec2(fs);vec3 pr=wpos(uv+vec2(2.*t.x,0.),texelFetch(uDepth,ip+ivec2(2,0),0).r),pl=wpos(uv-vec2(2.*t.x,0.),texelFetch(uDepth,ip-ivec2(2,0),0).r);
  vec3 pu=wpos(uv+vec2(0.,2.*t.y),texelFetch(uDepth,ip+ivec2(0,2),0).r),pd=wpos(uv-vec2(0.,2.*t.y),texelFetch(uDepth,ip-ivec2(0,2),0).r);
  vec3 dx=dot(pr-P,pr-P)<dot(P-pl,P-pl)?pr-P:P-pl,dy=dot(pu-P,pu-P)<dot(P-pd,P-pd)?pu-P:P-pd;vec3 N=normalize(cross(dx,dy));if(dot(N,uCam-P)<0.)N=-N;
  float ign=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));float a0=ign*6.2831;
  vec3 T=normalize(abs(N.y)<.99?cross(N,vec3(0.,1.,0.)):cross(N,vec3(1.,0.,0.)));vec3 B=cross(N,T);
  float R=uRad*clamp(L/60.,.2,2.2);float occ=0.; // shrinks in macro close-ups so small fish do not occlude themselves
  for(int i=0;i<16;i++){if(i>=uN)break;float fi=(float(i)+.5)/float(uN);float ang=a0+float(i)*2.39996;float rr=sqrt(fi);
    vec3 dir=T*(cos(ang)*rr)+B*(sin(ang)*rr)+N*sqrt(max(1.-rr*rr,0.)+.04);vec3 S=P+dir*R*mix(.2,1.,fi*fi)+N*.08;
    vec4 c=uVP*vec4(S,1.);vec2 su=c.xy/c.w*.5+.5;if(any(lessThan(su,vec2(0.)))||any(greaterThan(su,vec2(1.))))continue;
    float sd=texture(uDepth,su).r;vec3 Q=wpos(su,sd);float lq=length(Q-uCam),ls=length(S-uCam);
    float dz=ls-lq;occ+=step(.12,dz)*smoothstep(R*2.,R*.6,dz);}
  o=vec4(1.-occ/float(uN),L,0.,1.);}`;
const FS_AOBLUR=H+`
uniform sampler2D uSrc;in vec2 vUV;out vec4 o;
void main(){vec2 tx=1./vec2(textureSize(uSrc,0));vec2 c0=texture(uSrc,vUV).rg;float s=0.,w=0.;
  for(int j=-2;j<=1;j++)for(int i=-2;i<=1;i++){vec2 c=texture(uSrc,vUV+(vec2(i,j)+.5)*tx).rg;float k=1./(1.+abs(c.y-c0.y)*2.5/max(c0.y*.02,.05));s+=c.x*k;w+=k;}
  o=vec4(s/max(w,1e-4),c0.y,0.,1.);}`;
const FS_RES=H+`
uniform sampler2D uAO;uniform float uAOOn;uniform float uAOK;uniform float uAOFog;
uniform sampler2D uA;uniform sampler2D uVol;uniform sampler2D uDepth;uniform mat4 uInvVP;uniform vec3 uCam;uniform vec2 uVolRes;uniform float uVolOn;
in vec2 vUV;out vec4 o;
void main(){vec3 c=texture(uA,vUV).rgb;if(any(isnan(c))||any(isinf(c)))c=vec3(0.);
  float d=texture(uDepth,vUV).r;vec4 nd=vec4(vUV*2.-1.,d*2.-1.,1.);vec4 wp=uInvVP*nd;float L=length(wp.xyz/wp.w-uCam);
  if(uAOOn>.5&&d<.99999){vec2 px=vUV*uVolRes-.5;vec2 f=fract(px);vec2 b=(floor(px)+.5)/uVolRes;vec2 tx=1./uVolRes;
    vec2 a00=texture(uAO,b).rg,a10=texture(uAO,b+vec2(tx.x,0.)).rg,a01=texture(uAO,b+vec2(0.,tx.y)).rg,a11=texture(uAO,b+tx).rg;
    float w00=(1.-f.x)*(1.-f.y),w10=f.x*(1.-f.y),w01=(1.-f.x)*f.y,w11=f.x*f.y;float k=2./max(L*.02,.05);
    w00/=1.+abs(a00.y-L)*k;w10/=1.+abs(a10.y-L)*k;w01/=1.+abs(a01.y-L)*k;w11/=1.+abs(a11.y-L)*k;
    float ao=(a00.x*w00+a10.x*w10+a01.x*w01+a11.x*w11)/max(w00+w10+w01+w11,1e-4);
    c*=mix(1.,ao,uAOK*exp(-L*uAOFog));}
  if(uVolOn>.5){
    vec2 px=vUV*uVolRes-.5;vec2 f=fract(px);vec2 b=(floor(px)+.5)/uVolRes;vec2 tx=1./uVolRes;
    vec4 s00=texture(uVol,b),s10=texture(uVol,b+vec2(tx.x,0.)),s01=texture(uVol,b+vec2(0.,tx.y)),s11=texture(uVol,b+tx);
    float w00=(1.-f.x)*(1.-f.y),w10=f.x*(1.-f.y),w01=(1.-f.x)*f.y,w11=f.x*f.y;
    float k=.15;w00/=1.+abs(s00.a-L)*k;w10/=1.+abs(s10.a-L)*k;w01/=1.+abs(s01.a-L)*k;w11/=1.+abs(s11.a-L)*k;
    c+=(s00.rgb*w00+s10.rgb*w10+s01.rgb*w01+s11.rgb*w11)/max(w00+w10+w01+w11,1e-4);}
  if(any(isnan(c)))c=vec3(0.);o=vec4(c,1.);}`;
// ---------- depth of field: circle of confusion from depth, 24-tap gather with near/far rejection ----------
const FS_DOF=H+`
uniform sampler2D uSrc;uniform sampler2D uDepth;uniform mat4 uInvVP;uniform vec3 uCam;uniform float uFocus;uniform float uAper;uniform vec2 uRes;in vec2 vUV;out vec4 o;
float distAt(vec2 uv){float d=texture(uDepth,uv).r;vec4 w=uInvVP*vec4(uv*2.-1.,d*2.-1.,1.);return length(w.xyz/w.w-uCam);}
float coc(float L){return clamp(uAper*abs(L-uFocus)/max(L,1.),0.,1.);}
vec3 sfd(vec2 uv){vec3 c=texture(uSrc,uv).rgb;return (any(isnan(c))||any(isinf(c)))?vec3(0.):min(c,vec3(64.));}
void main(){vec3 c0=sfd(vUV);float L0=distAt(vUV);float r0=coc(L0);float maxR=uRes.y*.012;
  if(r0*maxR<.6){o=vec4(c0,1.);return;}
  vec3 acc=c0;float w=1.;float ign=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))*6.2831;
  for(int i=0;i<24;i++){float fi=(float(i)+.5)/24.;float a=ign+float(i)*2.39996;vec2 off=vec2(cos(a),sin(a))*sqrt(fi)*r0*maxR/uRes;
    vec2 uv=vUV+off;float Ls=distAt(uv);float rs=coc(Ls);
    float k=Ls<L0?smoothstep(sqrt(fi)*r0-.08,sqrt(fi)*r0+.08,rs):1.;
    vec3 cs=min(sfd(uv),vec3(8.));acc+=cs*k;w+=k;}
  vec3 r=acc/w;o=vec4(any(isnan(r))?c0:r,1.);}`;
const FS_DOWN=H+`
uniform sampler2D uSrc;uniform vec2 uTx;uniform float uThr;in vec2 vUV;out vec4 o;
vec3 sf(vec2 uv){vec3 c=texture(uSrc,uv).rgb;return (any(isnan(c))||any(isinf(c)))?vec3(0.):min(c,vec3(64.));}
void main(){vec3 c=(sf(vUV+uTx*vec2(-1.,-1.))+sf(vUV+uTx*vec2(1.,-1.))+sf(vUV+uTx*vec2(-1.,1.))+sf(vUV+uTx*vec2(1.,1.)))*.25;
  if(uThr>0.){float l=max(max(c.r,c.g),c.b);c*=max(l-uThr,0.)/max(l,1e-4);}o=vec4(c,1.);}`;
const FS_FINAL=H+`
uniform sampler2D uC;uniform sampler2D uB1;uniform sampler2D uB2;uniform sampler2D uB3;uniform sampler2D uB4;
uniform float uExpo;uniform float uBloom;uniform float uTime;uniform vec2 uRes;in vec2 vUV;out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
void main(){vec2 qd=vUV-.5;float ca=dot(qd,qd)*.006;vec3 c=vec3(texture(uC,vUV-qd*ca).r,texture(uC,vUV).g,texture(uC,vUV+qd*ca).b);
  vec3 b=texture(uB1,vUV).rgb*.5+texture(uB2,vUV).rgb*.35+texture(uB3,vUV).rgb*.3+texture(uB4,vUV).rgb*.25;
  if(any(isnan(c))||any(isinf(c)))c=vec3(0.);if(any(isnan(b))||any(isinf(b)))b=vec3(0.);
  c+=b*uBloom;c*=uExpo;c=aces(c);
  vec2 q=vUV-.5;q.x*=uRes.x/uRes.y;c*=1.-dot(q,q)*.32;
  c=pow(c,vec3(1./2.2));
  c+=(h12(gl_FragCoord.xy+fract(uTime)*91.7)-.5)/200.;
  o=vec4(c,1.);}`;
