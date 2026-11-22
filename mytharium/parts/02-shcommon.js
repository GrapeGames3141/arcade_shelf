
// ============================================================
//  SHADERS · shared GLSL
// ============================================================
const H=`#version 300 es
precision highp float;precision highp int;precision highp sampler2D;precision highp sampler2DShadow;
`;
const NPL=16;
const C_UNI=`
uniform float uTime;
uniform vec3 uCam;
uniform mat4 uVP;
uniform vec3 uLdir;      // toward the LED bar (sun of the terrarium)
uniform vec3 uLcol;      // LED colour x intensity
uniform vec3 uSky;       // ambient from above (lit lid, room)
uniform vec3 uGnd;       // bounce from the soil
uniform vec3 uRoom;      // room light outside the glass
uniform mat4 uSM;
uniform sampler2DShadow uShadow;
uniform sampler2D uShadowR;
uniform vec2 uSMk;
uniform float uPCSS;
uniform float uShadowOn;
uniform vec3 uHeatP;     // heat lamp bulb position
uniform vec3 uHeatC;     // heat lamp colour x intensity
uniform vec4 uPL[${NPL}];  // point lights: xyz, radius
uniform vec4 uPC[${NPL}];  // colour, unused
uniform int uNPL;
uniform float uPWL;      // pond water level
uniform vec4 uPondB;     // pond bounds x0,z0,x1,z1
uniform sampler2D uPondM;// pond mask over the tank floor plan
uniform vec3 uAbs;       // pond water absorption per cm
uniform sampler2D uCaus;
uniform vec4 uCMap;
uniform vec3 uTmin;
uniform vec3 uTmax;
uniform float uHumid;
uniform float uNight;
uniform float uEnvK;
uniform float uMistD;
uniform vec3 uMistC;
uniform vec4 uRing;
uniform float uSel;
`;
const C_FN=`
#define TAU 6.28318530718
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float hash13(vec3 p3){p3=fract(p3*.1031);p3+=dot(p3,p3.zyx+31.32);return fract((p3.x+p3.y)*p3.z);}
vec2 hash22(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}
vec3 hash33(vec3 p3){p3=fract(p3*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yxz+33.33);return fract((p3.xxy+p3.yxx)*p3.zyx);}
float vnoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  float a=hash13(i),b=hash13(i+vec3(1,0,0)),c=hash13(i+vec3(0,1,0)),d=hash13(i+vec3(1,1,0)),
  e=hash13(i+vec3(0,0,1)),g=hash13(i+vec3(1,0,1)),h=hash13(i+vec3(0,1,1)),k=hash13(i+vec3(1,1,1));
  return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,g,f.x),mix(h,k,f.x),f.y),f.z);}
float fbm(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vnoise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s/.9375;}
float fbm2(vec3 p){return (vnoise(p)*.66+vnoise(p*2.03+1.7)*.34);}
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
// cellular noise: x = distance to nearest, y = second nearest, z = cell id hash
vec3 vor2(vec2 p){vec2 ip=floor(p),fp=fract(p);float f1=9.,f2=9.,id=0.;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j));vec2 h=hash22(ip+g);vec2 r=g+h-fp;float d=dot(r,r);
    if(d<f1){f2=f1;f1=d;id=hash12(ip+g+7.1);}else if(d<f2)f2=d;}
  return vec3(sqrt(f1),sqrt(f2),id);}
vec2 boxT(vec3 ro,vec3 rd,vec3 bmin,vec3 bmax){vec3 inv=1./rd;vec3 t0=(bmin-ro)*inv,t1=(bmax-ro)*inv;vec3 tn=min(t0,t1),tf=max(t0,t1);
  return vec2(max(max(tn.x,tn.y),tn.z),min(min(tf.x,tf.y),tf.z));}
bool inTank(vec3 P){return all(greaterThan(P,uTmin-vec3(.3)))&&all(lessThan(P,uTmax+vec3(.3)));}
float pondMask(vec2 xz){vec2 uv=(xz-uTmin.xz)/(uTmax.xz-uTmin.xz);return texture(uPondM,uv).r;}
float pondDepth(vec3 P){if(P.y>uPWL)return 0.;return pondMask(P.xz)>.5?uPWL-P.y:0.;}
// thin-film interference: reflectance of a film of index n, thickness t (um), cosine of incidence c
vec3 film(float c,float t,float n){float ct=sqrt(max(1.-(1.-c*c)/(n*n),0.));vec3 ph=12.566*n*t*ct/vec3(.65,.532,.45);return .5-.5*cos(ph);}
float shadowAt(vec3 P,vec3 N){
  if(uShadowOn<.5)return 1.;
  vec4 sp=uSM*vec4(P+N*.05,1.);vec3 c=sp.xyz/sp.w;
  if(c.x<0.||c.x>1.||c.y<0.||c.y>1.||c.z>1.)return 1.;
  float ts=1./float(textureSize(uShadow,0).x);float b=.0009;
#ifndef VERTEX_STAGE
  if(uPCSS>.5){ // percentage-closer soft shadows: penumbra grows with blocker-receiver distance (an LED bar is a broad light)
    float rot=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))*6.2831;
    float rs=2.2/uSMk.y;float bd=0.,nb=0.;
    {float d=texture(uShadowR,c.xy).r;if(d<c.z-b){bd+=d;nb+=1.;}}
    int nb0=uPCSS>1.5?8:5,np=uPCSS>1.5?12:8;float fb=float(nb0),fp=float(np);
    for(int i=0;i<8;i++){if(i>=nb0)break;float a=rot+float(i)*2.39996;vec2 o=vec2(cos(a),sin(a))*sqrt((float(i)+.5)/fb)*rs;float d=texture(uShadowR,c.xy+o).r;if(d<c.z-b){bd+=d;nb+=1.;}}
    if(nb<.5)return 1.;bd/=nb;float pen=max(clamp((c.z-bd)*uSMk.x*.07,.02,1.8)/uSMk.y,1.3*ts);float sum=0.;
    for(int i=0;i<12;i++){if(i>=np)break;float a=rot+1.3+float(i)*2.39996;vec2 o=vec2(cos(a),sin(a))*sqrt((float(i)+.5)/fp)*pen;sum+=texture(uShadow,vec3(c.xy+o,c.z-b-pen*.4));}
    return sum/fp;}
#endif
  float s=texture(uShadow,vec3(c.xy+vec2(-.7,-.7)*ts,c.z-b))+texture(uShadow,vec3(c.xy+vec2(.7,-.7)*ts,c.z-b))
         +texture(uShadow,vec3(c.xy+vec2(-.7,.7)*ts,c.z-b))+texture(uShadow,vec3(c.xy+vec2(.7,.7)*ts,c.z-b));
  return s*.25;}
float shadow1(vec3 P){if(uShadowOn<.5)return 1.;vec4 sp=uSM*vec4(P,1.);vec3 c=sp.xyz/sp.w;
  if(c.x<0.||c.x>1.||c.y<0.||c.y>1.||c.z>1.)return 1.;return texture(uShadow,vec3(c.xy,c.z-.0015));}
// caustics on the pond bed: the map is built by refracting a light grid through the live surface
vec3 causAt(vec3 P,float d){vec2 sp=(P.xz-uCMap.xy)/uCMap.zw;vec3 c=textureLod(uCaus,sp,clamp(abs(d-5.)*.15,0.,2.)).rgb*4.;c=1.3*c/(1.+.35*c);
  return mix(vec3(1.),c,smoothstep(.3,3.,d));}
// the room seen in reflections: dim walls, a window behind the viewer, the lamp bar above
vec3 envColor(vec3 d){
  vec3 c=mix(uRoom*.35,uRoom*1.1,clamp(d.y*.5+.5,0.,1.));
  float win=smoothstep(.07,0.,abs(d.x+.55)-.25)*smoothstep(.07,0.,abs(d.y-.15)-.22)*step(0.,d.z);
  c+=uRoom*vec3(1.4,1.6,2.)*win*2.;
  c+=uLcol*.06*pow(max(d.y,0.),24.);
  return c*uEnvK;}
vec3 pointLights(vec3 P,vec3 N,vec3 V,vec3 alb,float spec,float rough,float trans){vec3 c=vec3(0.);
  for(int i=0;i<${NPL};i++){if(i>=uNPL)break;vec3 d=uPL[i].xyz-P;float r=uPL[i].w;float dd=dot(d,d);if(dd>r*r)continue;float L=sqrt(dd)+1e-4;vec3 l=d/L;
    float att=1./(1.+dd/(r*r*.08))*smoothstep(r,r*.55,L);if(att<=0.)continue;float nl=dot(N,l);
    vec3 Hh=normalize(l+V);float gl=mix(8.,160.,pow(1.-rough,2.));
    c+=uPC[i].rgb*att*(alb*(max(nl,0.)+trans*max(-nl,0.)*.7+.06)+spec*pow(max(dot(N,Hh),0.),gl)*(gl+8.)/40.*max(nl,0.));}
  return c;}
vec3 heatLamp(vec3 P,vec3 N,vec3 V,vec3 alb,float spec,float rough){vec3 d=uHeatP-P;float dd=dot(d,d);vec3 l=d*inversesqrt(dd);
  float cone=smoothstep(.15,.75,-l.y);float att=cone/(1.+dd*.0012);float nl=max(dot(N,l),0.);
  vec3 Hh=normalize(l+V);float gl=mix(8.,180.,pow(1.-rough,2.));
  return uHeatC*att*(alb*nl+spec*pow(max(dot(N,Hh),0.),gl)*(gl+8.)/50.*nl);}
// outside the glass: room light plus the glow spilling from the tank
vec3 roomLit(vec3 P,vec3 N,vec3 V,vec3 alb,float rough,float spec){
  vec3 tc=clamp(P,uTmin,uTmax);vec3 d=tc-P;float dist=length(d)+.5;vec3 L=d/dist;float g=1./(1.+dist*dist*.0015);
  vec3 c=alb*(uRoom*(.55+.45*N.y)+(uLcol*.07+uSky*.4)*g*max(dot(N,L)*.6+.4,0.));
  // the lamp sits on the lid, above the glass
  vec3 ldv=normalize(vec3(0.,uTmax.y+4.,-4.)-P);c+=alb*uLcol*.035*max(dot(N,ldv),0.)/(1.+dot(P,P)*.00002);
  vec3 kp=vec3(-150.,40.,150.)-P;float kd=length(kp);vec3 kl=kp/kd;float ka=40000./(kd*kd+20000.);vec3 kc=vec3(1.,.72,.42)*.42*ka;
  vec3 Hk=normalize(kl+V);float gk=mix(8.,260.,pow(1.-rough,2.));c+=alb*kc*max(dot(N,kl),0.)+kc*pow(max(dot(N,Hk),0.),gk)*(gk+8.)/40.*spec*max(dot(N,kl),0.);
  vec3 R=reflect(-V,N);c+=envColor(R)*spec*.5*(1.-rough);
  return c;}
// main lighting inside the tank
vec3 lighting(vec3 P,vec3 N,vec3 V,vec3 alb,float rough,float spec,float trans,float ao){
  if(!inTank(P))return roomLit(P,N,V,alb,rough,spec)*ao;
  float pd=pondDepth(P);vec3 att=pd>0.?exp(-uAbs*pd*1.1):vec3(1.);
  float ndl=dot(N,uLdir);
  float sh=shadowAt(P,(ndl<0.&&trans>.1)?-N:N);
  vec3 dl=uLcol*sh*att;if(pd>0.)dl*=mix(vec3(1.),causAt(P,pd),.5+.5*abs(N.y));
  vec3 col=alb*dl*(max(ndl,0.)+trans*max(-ndl,0.)*.75);
  vec3 Hh=normalize(uLdir+V);float gl=mix(6.,220.,pow(1.-rough,2.));
  col+=dl*pow(max(dot(N,Hh),0.),gl)*(gl+8.)/60.*spec*max(ndl,0.);
  float hemi=N.y*.5+.5;
  col+=alb*mix(uGnd,uSky,hemi)*ao*(1.+trans*.5)*mix(vec3(1.),att,.7);
  col+=heatLamp(P,N,V,alb,spec,rough)*att;
  col+=pointLights(P,N,V,alb,spec,rough,trans);
  vec3 R=reflect(-V,N);col+=envColor(R)*spec*(1.-rough)*.25*ao;
  return col;}
// mist inside the tank: in-scatter along the view segment that crosses the tank volume
vec3 applyMist(vec3 col,vec3 P){vec3 d=P-uCam;float L=length(d);vec3 rd=d/max(L,1e-4);vec2 t=boxT(uCam,rd,uTmin,uTmax);float a=max(t.x,0.),b=min(t.y,L);float s=max(b-a,0.);
  float f=1.-exp(-uMistD*s);return mix(col,uMistC,f);}
`;
const C_FS=`
vec3 perturb(vec3 N,vec3 P,float h){
  vec3 dpdx=dFdx(P),dpdy=dFdy(P);vec3 r1=cross(dpdy,N),r2=cross(N,dpdx);float det=dot(dpdx,r1);
  float hx=dFdx(h),hy=dFdy(h);vec3 g=sign(det)*(hx*r1+hy*r2);
  vec3 n=normalize(abs(det)*N-g);return (abs(det)<1e-12)?N:n;}
// selection ring drawn on whatever surface lies under the selected thing
vec3 ringAt(vec3 col,vec3 P){if(uRing.w<=0.)return col;float d=length(P.xz-uRing.xz);float r=uRing.w;float a=smoothstep(.25,0.,abs(d-r))*step(abs(P.y-uRing.y),r*1.2+4.);
  return mix(col,vec3(.55,.95,.85)*1.2,a*.7);}
`;
const VS_FULL=H+`out vec2 vUV;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vUV=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const FS_DEPTH=H+`void main(){}`;
