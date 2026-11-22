
// ---------- pond surface: refracts the scene behind it, reflects the room, ripples from the live simulation ----------
const VS_SURF=H+`uniform mat4 uVP;uniform float uPWL;uniform vec4 uPondB;in vec3 aPos;out vec3 vW;
void main(){vW=vec3(mix(uPondB.x,uPondB.z,aPos.x),uPWL,mix(uPondB.y,uPondB.w,aPos.y));gl_Position=uVP*vec4(vW,1.);}`;
const FS_SURF=H+C_UNI+C_FN+`
uniform sampler2D uScene;uniform vec2 uRes;uniform sampler2D uSim;uniform vec4 uSimR;uniform float uFlowK;
in vec3 vW;out vec4 oC;
vec2 simGrad(vec2 xz){vec2 uv=(xz-uSimR.xy)/uSimR.zw;vec2 tx=1./vec2(textureSize(uSim,0));
  float l=texture(uSim,uv-vec2(1.5*tx.x,0.)).r,r=texture(uSim,uv+vec2(1.5*tx.x,0.)).r,dn=texture(uSim,uv-vec2(0.,1.5*tx.y)).r,up=texture(uSim,uv+vec2(0.,1.5*tx.y)).r;
  return vec2(r-l,up-dn)/(3.*uSimR.zw*tx);}
void main(){vec2 uvm=(vW.xz-uTmin.xz)/(uTmax.xz-uTmin.xz);vec4 pm=texture(uPondM,uvm);if(pm.r<.5)discard;
  float dep=pm.g*16.;
  vec2 g=simGrad(vW.xz);float fw=length(fwidth(vW.xz));float df=1.-smoothstep(.05,.3,fw);
  g+=(vec2(.8,.6)*cos(dot(vec2(.8,.6),vW.xz)*7.+uTime*6.)+vec2(-.3,1.)*cos(dot(vec2(-.3,1.),vW.xz)*11.-uTime*8.)*.6)*.012*df*uFlowK;
  vec3 N=normalize(vec3(-g.x,1.,-g.y));vec3 V=normalize(uCam-vW);
  float F=.02+.98*pow(1.-max(dot(N,V),0.),5.);
  vec3 T=refract(-V,N,1./1.333);float path=dep/max(-T.y,.15);
  vec2 suv=gl_FragCoord.xy/uRes;vec3 refr=texture(uScene,clamp(suv-g*.06*min(dep,8.)/8.,vec2(.002),vec2(.998))).rgb;
  refr*=exp(-uAbs*path);refr+=vec3(.012,.03,.025)*(1.-exp(-path*.08))*lum(uLcol+uSky);
  vec3 R=reflect(-V,N);vec3 env=envColor(R);if(R.y>.0){vec3 hp=vW+R*((uTmax.y+3.-vW.y)/R.y);float lamp=smoothstep(2.5,-1.,abs(hp.x)-40.)*smoothstep(2.,-1.,abs(hp.z+3.)-3.5);env=mix(env,uLcol*.9,lamp);}
  float sp=pow(max(dot(R,uLdir),0.),300.)*shadow1(vW+vec3(0.,.3,0.))*1.6;vec3 col=mix(refr,env,F)+uLcol*sp+pointLights(vW,N,V,vec3(0.),.9,.05,0.);
  // a soft shore line where the water thins out
  float shore=smoothstep(.35,0.,dep);col=mix(col,refr,shore*.6);
  col=applyMist(col,vW);oC=vec4(col,1.);}`;
// ---------- waterfall sheet ----------
const FS_FALL=H+C_UNI+C_FN+`
in vec3 vW;in vec3 vN;in vec2 vUV;in vec4 vCol;in vec4 vExt;in vec3 vO;out vec4 oC;
void main(){vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);if(dot(N,V)<0.)N=-N;
  float s=vUV.y*3.-uTime*2.4;float st=vnoise(vec3(vUV.x*18.,s*6.,1.))*.6+vnoise(vec3(vUV.x*40.,s*12.,3.))*.4;
  float foam=smoothstep(.55,.9,st)*(.4+.6*vUV.y);float edge=smoothstep(0.,.18,vUV.x)*smoothstep(1.,.82,vUV.x);
  vec3 L=uLcol*.7*shadow1(vW)+uSky*1.2;vec3 col=mix(vec3(.6,.75,.8)*.12,vec3(.95),foam)*L+envColor(reflect(-V,N))*.4;
  float a=(.32+foam*.6)*edge;col=applyMist(col,vW);oC=vec4(col*a,a);}`;
// ---------- glass: reflections, condensation that the player can wipe away ----------
const FS_GLASS=H+C_UNI+C_FN+`
uniform sampler2D uScene;uniform vec2 uRes;uniform sampler2D uWipe;uniform float uFogG;
in vec3 vW;in vec3 vN;in vec2 vUV;in vec4 vCol;in vec4 vExt;in vec3 vO;out vec4 oC;
void main(){vec3 No=normalize(vN);vec3 N=No;vec3 V=normalize(uCam-vW);if(dot(N,V)<0.)N=-N;
  float F=.04+.96*pow(1.-max(dot(N,V),0.),5.);vec3 env=envColor(reflect(-V,N));
  float sm=fbm(vW*.1)*.6+fbm(vW*.8)*.4;vec3 col=env*F*(.6+.6*sm)*1.3;float a=F*.5;
  // condensation: fine fog plus droplets, densest low on the glass and near the pond, swept clean where wiped
  float wipe=1.;if(vCol.r>.5){wipe=1.-texture(uWipe,vUV).r;}
  float fogAmt=clamp(uFogG*smoothstep(55.,4.,vW.y)*(.7+.6*fbm(vW*.05)),0.,1.)*wipe;
  vec2 dp=vec2(dot(vW.xz,vec2(No.z,-No.x)),vW.y);
  vec3 d1=vor2(dp*.9);float drop=smoothstep(.22,.1,d1.x)*step(.7,d1.z);vec3 d2=vor2(dp*7.+7.);float mic=smoothstep(.3,.12,d2.x);
  // drips run down from the big drops, leaving clear tracks
  float col1=floor(dp.x*2.);float hh=hash12(vec2(col1,3.));float run=fract(dp.y*.04+uTime*(.02+.05*hh)+hh);float trackx=abs(fract(dp.x*2.)-.5-(hh-.5)*.6);
  float track=smoothstep(.06,.0,trackx)*step(.8,hh)*smoothstep(.0,.5,run);
  float fogv=fogAmt*(1.-track*.9)*(.85+.15*mic)*.75;drop*=smoothstep(.35,.75,fogAmt);
  vec2 suv=gl_FragCoord.xy/uRes;vec3 bg=texture(uScene,suv).rgb;vec3 blur=(texture(uScene,suv+vec2(.006,.004)).rgb+texture(uScene,suv-vec2(.005,.006)).rgb+texture(uScene,suv+vec2(-.006,.005)).rgb+texture(uScene,suv+vec2(.004,-.006)).rgb)*.25;
  vec3 dropRefr=texture(uScene,clamp(suv+(vec2(d1.x)-.2)*.02,vec2(.002),vec2(.998))).rgb;
  // premultiplied: reflection, then haze over it, then drops that replace what is behind them
  vec3 pc=col;float fa=fogv*.72;vec3 haze=blur*.75+(uSky+uLcol*.06)*.2;
  pc=pc*(1.-fa)+haze*fa;a=a+(1.-a)*fa;
  vec3 dh=envColor(reflect(-V,N))*1.2;float da=drop*.6;pc=pc*(1.-da)+(dropRefr*.7+dh*.4)*da;a=a+(1.-a)*da;
  if(vCol.g>.5){pc=vec3(.012);a=.96;} // door seam and hinge strips
  oC=vec4(pc,clamp(a,0.,.97));}`;
// ---------- ripple simulation: R = height (cm), G = previous height ----------
const FS_RIPPLE=H+`
uniform sampler2D uPrev;uniform vec2 uTx;uniform vec4 uDrops[16];uniform float uDamp;in vec2 vUV;out vec4 o;
void main(){vec4 c=texture(uPrev,vUV);float h=c.r,p=c.g;
  float l=texture(uPrev,vUV-vec2(uTx.x,0.)).r,r=texture(uPrev,vUV+vec2(uTx.x,0.)).r,d=texture(uPrev,vUV-vec2(0.,uTx.y)).r,u=texture(uPrev,vUV+vec2(0.,uTx.y)).r;
  float lap=l+r+u+d-4.*h;float nh=h+(h-p)*uDamp+.3*lap;nh*=.9991;
  for(int i=0;i<16;i++){vec4 dr=uDrops[i];if(dr.z<=0.)continue;vec2 dd=(vUV-dr.xy)/uTx;float u=dot(dd,dd)/(dr.z*dr.z);nh+=dr.w*(1.-u)*exp(-u);}
  o=vec4(clamp(nh,-2.,2.),h,0.,1.);}`;
// ---------- true caustics: refract a light grid through the live pond surface ----------
const VS_CGRID=H+`
uniform sampler2D uSim;uniform vec4 uSimR;uniform vec4 uCMap;uniform vec3 uLd;uniform float uIor;uniform float uDepth;uniform float uTime;
in vec3 aPos;out vec2 vOld;out vec2 vNew;
void main(){vec2 uv=aPos.xy;vec2 S=uSimR.xy+uv*uSimR.zw;vec2 tx=1./vec2(textureSize(uSim,0));
  float l=texture(uSim,uv-vec2(tx.x,0.)).r,r=texture(uSim,uv+vec2(tx.x,0.)).r,dn=texture(uSim,uv-vec2(0.,tx.y)).r,up=texture(uSim,uv+vec2(0.,tx.y)).r;
  vec2 g=vec2(r-l,up-dn)/(2.*uSimR.zw*tx);
  g+=vec2(.7,.5)*cos(dot(vec2(.8,.6),S)*1.9+uTime*2.2)*.035+vec2(-.4,.8)*cos(dot(vec2(-.3,1.),S)*2.6-uTime*2.9)*.028+vec2(.9,-.2)*cos(dot(vec2(.97,-.2),S)*3.4+uTime*3.3)*.02;
  vec3 n=normalize(vec3(-g.x,1.,-g.y));
  vec3 rf=refract(uLd,vec3(0.,1.,0.),1./uIor),rr=refract(uLd,n,1./uIor);
  vec2 Pf=S+rf.xz*(uDepth/-rf.y),P=S+rr.xz*(uDepth/max(-rr.y,.2));
  vec2 m=S+(P-Pf);vOld=S;vNew=m;gl_Position=vec4((m-uCMap.xy)/uCMap.zw*2.-1.,0.,1.);}`;
const FS_CGRID=H+`
in vec2 vOld;in vec2 vNew;out vec4 o;
void main(){vec2 ax=dFdx(vOld),ay=dFdy(vOld),bx=dFdx(vNew),by=dFdy(vNew);
  float a0=abs(ax.x*ay.y-ax.y*ay.x),a1=abs(bx.x*by.y-bx.y*by.x);float I=min(a0/max(a1,a0*.06),9.);o=vec4(vec3(I*.25),1.);}`;
// ---------- light shafts through the mist ----------
const FS_VOL=H+C_UNI+C_FN+`
uniform sampler2D uDepth;uniform mat4 uInvVP;uniform int uSteps;uniform float uScat;uniform float uFrame;
in vec2 vUV;out vec4 o;
void main(){float d=texture(uDepth,vUV).r;vec4 nd=vec4(vUV*2.-1.,d*2.-1.,1.);vec4 wp=uInvVP*nd;vec3 P=wp.xyz/wp.w;
  vec3 dv=P-uCam;float L=length(dv);vec3 rd=dv/L;
  vec2 t=boxT(uCam,rd,uTmin,uTmax);float a=max(t.x,0.),b=min(t.y,L);vec3 acc=vec3(0.);
  if(b>a){float j=fract(52.9829189*fract(dot(gl_FragCoord.xy+uFrame*vec2(5.588,3.3),vec2(.06711056,.00583715))));
    float dt=(b-a)/float(uSteps);
    for(int i=0;i<48;i++){if(i>=uSteps)break;float tt=a+(float(i)+j)*dt;vec3 X=uCam+rd*tt;
      float sh=shadow1(X);float den=.35+.65*smoothstep(.3,.7,vnoise(X*.08+vec3(0.,-uTime*.15,uTime*.05)));
      float low=smoothstep(55.,5.,X.y);acc+=uLcol*sh*den*(.4+.6*low)*dt;
      vec3 hd=uHeatP-X;acc+=uHeatC*smoothstep(.4,.9,-normalize(hd).y)/(1.+dot(hd,hd)*.002)*den*dt*.25;}
    float cs=dot(rd,uLdir);float g=.6;float hg=(1.-g*g)/pow(1.+g*g-2.*g*cs,1.5)/12.566;
    acc*=uScat*(hg*5.+.15);}
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
  float R=uRad*clamp(L/80.,.12,2.);float occ=0.;
  for(int i=0;i<20;i++){if(i>=uN)break;float fi=(float(i)+.5)/float(uN);float ang=a0+float(i)*2.39996;float rr=sqrt(fi);
    vec3 dir=T*(cos(ang)*rr)+B*(sin(ang)*rr)+N*sqrt(max(1.-rr*rr,0.)+.04);vec3 S=P+dir*R*mix(.2,1.,fi*fi)+N*.04;
    vec4 c=uVP*vec4(S,1.);vec2 su=c.xy/c.w*.5+.5;if(any(lessThan(su,vec2(0.)))||any(greaterThan(su,vec2(1.))))continue;
    float sd=texture(uDepth,su).r;vec3 Q=wpos(su,sd);float lq=length(Q-uCam),ls=length(S-uCam);
    float dz=ls-lq;occ+=step(.05,dz)*smoothstep(R*2.,R*.6,dz);}
  o=vec4(1.-occ/float(uN),L,0.,1.);}`;
const FS_AOBLUR=H+`
uniform sampler2D uSrc;in vec2 vUV;out vec4 o;
void main(){vec2 tx=1./vec2(textureSize(uSrc,0));vec2 c0=texture(uSrc,vUV).rg;float s=0.,w=0.;
  for(int j=-2;j<=1;j++)for(int i=-2;i<=1;i++){vec2 c=texture(uSrc,vUV+(vec2(i,j)+.5)*tx).rg;float k=1./(1.+abs(c.y-c0.y)*2.5/max(c0.y*.02,.05));s+=c.x*k;w+=k;}
  o=vec4(s/max(w,1e-4),c0.y,0.,1.);}`;
const FS_RES=H+`
uniform sampler2D uAO;uniform float uAOOn;uniform float uAOK;
uniform sampler2D uA;uniform sampler2D uVol;uniform sampler2D uDepth;uniform mat4 uInvVP;uniform vec3 uCam;uniform vec2 uVolRes;uniform float uVolOn;
in vec2 vUV;out vec4 o;
void main(){vec3 c=texture(uA,vUV).rgb;if(any(isnan(c))||any(isinf(c)))c=vec3(0.);
  float d=texture(uDepth,vUV).r;vec4 nd=vec4(vUV*2.-1.,d*2.-1.,1.);vec4 wp=uInvVP*nd;float L=length(wp.xyz/wp.w-uCam);
  if(uAOOn>.5&&d<.99999){vec2 px=vUV*uVolRes-.5;vec2 f=fract(px);vec2 b=(floor(px)+.5)/uVolRes;vec2 tx=1./uVolRes;
    vec2 a00=texture(uAO,b).rg,a10=texture(uAO,b+vec2(tx.x,0.)).rg,a01=texture(uAO,b+vec2(0.,tx.y)).rg,a11=texture(uAO,b+tx).rg;
    float w00=(1.-f.x)*(1.-f.y),w10=f.x*(1.-f.y),w01=(1.-f.x)*f.y,w11=f.x*f.y;float k=2./max(L*.02,.05);
    w00/=1.+abs(a00.y-L)*k;w10/=1.+abs(a10.y-L)*k;w01/=1.+abs(a01.y-L)*k;w11/=1.+abs(a11.y-L)*k;
    float ao=(a00.x*w00+a10.x*w10+a01.x*w01+a11.x*w11)/max(w00+w10+w01+w11,1e-4);
    c*=mix(1.,ao,uAOK);}
  if(uVolOn>.5){
    vec2 px=vUV*uVolRes-.5;vec2 f=fract(px);vec2 b=(floor(px)+.5)/uVolRes;vec2 tx=1./uVolRes;
    vec4 s00=texture(uVol,b),s10=texture(uVol,b+vec2(tx.x,0.)),s01=texture(uVol,b+vec2(0.,tx.y)),s11=texture(uVol,b+tx);
    float w00=(1.-f.x)*(1.-f.y),w10=f.x*(1.-f.y),w01=(1.-f.x)*f.y,w11=f.x*f.y;
    float k=.15;w00/=1.+abs(s00.a-L)*k;w10/=1.+abs(s10.a-L)*k;w01/=1.+abs(s01.a-L)*k;w11/=1.+abs(s11.a-L)*k;
    c+=(s00.rgb*w00+s10.rgb*w10+s01.rgb*w01+s11.rgb*w11)/max(w00+w10+w01+w11,1e-4);}
  if(any(isnan(c)))c=vec3(0.);o=vec4(c,1.);}`;
// ---------- depth of field: circle of confusion from depth, 24-tap gather with near/far rejection ----------
const FS_DOF=H+`
uniform sampler2D uSrc;uniform sampler2D uDepth;uniform mat4 uInvVP;uniform vec3 uCam;uniform float uFocus;uniform float uAper;uniform vec2 uRes;uniform int uTaps;in vec2 vUV;out vec4 o;
float distAt(vec2 uv){float d=texture(uDepth,uv).r;vec4 w=uInvVP*vec4(uv*2.-1.,d*2.-1.,1.);return length(w.xyz/w.w-uCam);}
float coc(float L){return clamp(uAper*abs(L-uFocus)/max(L,1.),0.,1.);}
vec3 sfd(vec2 uv){vec3 c=texture(uSrc,uv).rgb;return (any(isnan(c))||any(isinf(c)))?vec3(0.):min(c,vec3(64.));}
void main(){vec3 c0=sfd(vUV);float L0=distAt(vUV);float r0=coc(L0);float maxR=uRes.y*.014;
  if(r0*maxR<.6){o=vec4(c0,1.);return;}
  vec3 acc=c0;float w=1.;float ign=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))*6.2831;
  float nt=float(uTaps);for(int i=0;i<24;i++){if(i>=uTaps)break;float fi=(float(i)+.5)/nt;float a=ign+float(i)*2.39996;vec2 off=vec2(cos(a),sin(a))*sqrt(fi)*r0*maxR/uRes;
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
uniform float uExpo;uniform float uBloom;uniform float uTime;uniform vec2 uRes;uniform float uWarm;in vec2 vUV;out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
void main(){vec2 qd=vUV-.5;float ca=dot(qd,qd)*.003;vec3 c=vec3(texture(uC,vUV-qd*ca).r,texture(uC,vUV).g,texture(uC,vUV+qd*ca).b);
  vec3 b=texture(uB1,vUV).rgb*.5+texture(uB2,vUV).rgb*.4+texture(uB3,vUV).rgb*.35+texture(uB4,vUV).rgb*.3;
  if(any(isnan(c))||any(isinf(c)))c=vec3(0.);if(any(isnan(b))||any(isinf(b)))b=vec3(0.);
  c+=b*uBloom;c*=uExpo;c*=mix(vec3(1.),vec3(1.04,1.,.94),uWarm);c=aces(c);
  float lm=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(lm),c,1.16);c=mix(c,c*c*(3.-2.*c),.22);c=clamp(c,0.,1.);
  vec2 q=vUV-.5;q.x*=uRes.x/uRes.y;c*=1.-dot(q,q)*.3;
  c=pow(c,vec3(1./2.2));
  c+=(h12(gl_FragCoord.xy+fract(uTime)*91.7)-.5)/200.;
  o=vec4(c,1.);}`;

// ---------- the pond seen from the side through the glass: light lost along the path through the water, the depths' haze, the
// silvered underside of the surface (total internal reflection at a glancing angle) and a bright meniscus line on the glass ----------
const FS_WWALL=H+C_UNI+C_FN+`
uniform sampler2D uScene;uniform sampler2D uDepth;uniform vec2 uRes;uniform mat4 uInvVP;
in vec3 vW;in vec3 vN;in vec2 vUV;in vec4 vCol;in vec4 vExt;in vec3 vO;out vec4 oC;
void main(){if(vW.y>uPWL+.01)discard;vec3 Nw=normalize(vN);if(dot(uCam-vW,Nw)<0.)discard;if(pondMask(vW.xz-Nw.xz*.6)<.5)discard;
  vec2 suv=gl_FragCoord.xy/uRes;float dz=texture(uDepth,suv).r;vec4 q=uInvVP*vec4(suv*2.-1.,dz*2.-1.,1.);vec3 Ps=q.xyz/q.w;
  vec3 rd=normalize(vW-uCam);float tW=dot(vW-uCam,rd);float tS=dot(Ps-uCam,rd);float tUp=rd.y>1e-4?(uPWL-uCam.y)/rd.y:1e9;
  bool surf=tUp<tS&&tUp>tW;float L=max(min(tS,tUp)-tW,0.);
  vec3 scene=texture(uScene,suv).rgb;float dep=max(uPWL-vW.y,0.);
  vec3 haze=vec3(.022,.07,.062)*(uLcol*.45*exp(-dep*.09)+uSky*1.4+vec3(.01))*mix(1.,.3,uNight)+uNight*vec3(.0,.003,.006);
  vec3 Tr=exp(-uAbs*1.35*L-vec3(.012,.008,.009)*L);
  vec3 beyond=scene;
  if(surf){vec3 sp=uCam+rd*tUp;float tir=smoothstep(.72,.6,rd.y);vec2 cw=sp.xz*.6+vec2(uTime*.13,uTime*.09);
    float shim=.5+.5*sin(cw.x*3.1+sin(cw.y*2.3+uTime))*sin(cw.y*2.7+sin(cw.x*1.9-uTime*.8));
    vec3 mirror=haze*2.2+uLcol*.05*shim*shim;beyond=mix(scene*.95+uSky*.15,mirror,tir);}
  vec3 col=beyond*Tr+haze*(1.-Tr);
  col+=(uLcol*.12+uSky*.5)*smoothstep(.18,.0,dep)*(1.-uNight*.5);
  oC=vec4(col,1.);}`;
