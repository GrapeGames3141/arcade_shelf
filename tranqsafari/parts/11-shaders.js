// ===== GLSL: shared lighting/fog/sky/lamps + all programs =====
// Frame block extras: uFog2 = (height falloff, horizon glow, fog base height, night 0..1); uEnv = (yellow grass patches, bump on/off, 0, 0);
// uL1* = jeep headlights, uL2* = rifle torch: P = xyz + range, D = direction + cos(cone), C = rgb + distance falloff.
const GLSL_COMMON = `
vec3 toLin(vec3 c){ return c*c*(0.3+0.7*c); }
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float hash13(vec3 p3){p3=fract(p3*.1031);p3+=dot(p3,p3.zyx+31.32);return fract((p3.x+p3.y)*p3.z);}
float vn2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x),f.y);}
float fbm2(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vn2(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}
float vn3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  float a=mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x),mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y);
  float b=mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y);
  return mix(a,b,f.z);}
vec3 fogCol(vec3 d){ float s=max(dot(d,uSunDir.xyz),0.); return mix(uFog.rgb, uSunCol.rgb*0.36, clamp(pow(s,6.)*uFog2.y,0.,1.)); }
vec3 skyBase(vec3 d){
  float y=d.y; vec3 zen=uSky.rgb*1.35*(1.-0.45*uFog2.w);   // a night sky is darker than the light it gives
  vec3 c=mix(fogCol(normalize(vec3(d.x,0.,d.z)+1e-4)), zen, pow(clamp(y,0.,1.),0.5));
  float s=max(dot(d,uSunDir.xyz),0.);
  c+=uSunCol.rgb*(pow(s,8.)*0.12+pow(s,90.)*0.5);
  return c;
}
vec3 hemi(vec3 N){ return mix(uGnd.rgb, uSky.rgb, N.y*0.5+0.5); }
vec3 fogApply(vec3 c, vec3 P){
  vec3 v=P-uCam.xyz; float dist=length(v); vec3 d=v/max(dist,1e-3);
  float hf=exp(-max(P.y-uFog2.z,0.)*uFog2.x);
  float f=1.-exp(-dist*uFog.w*mix(0.45,1.,hf));
  return mix(c, fogCol(d), clamp(f,0.,1.));
}
// spot lamps: wrap = 1 lights everything in the cone (foliage, dust), wrap = 0 is Lambert
vec3 lampAt(vec3 P, vec3 N, float wrap, vec4 lp, vec4 ld, vec4 lc){
  vec3 L=lp.xyz-P; float d=length(L); L/=max(d,1e-3);
  float cone=smoothstep(ld.w, mix(ld.w,1.,0.7), dot(-L,ld.xyz));
  float att=cone/(1.+d*d*lc.w)*smoothstep(lp.w, lp.w*0.45, d)*mix(0.38,1.,smoothstep(1.,7.5,d));   // eased close up so things on the hood do not blow out
  return lc.rgb*att*mix(0.25+0.75*max(dot(N,L),0.),1.,wrap);
}
vec3 lamps(vec3 P, vec3 N, float wrap){ if(uL1C.r+uL2C.r<=0.) return vec3(0.); vec3 l=lampAt(P,N,wrap,uL1P,uL1D,uL1C)+lampAt(P,N,wrap,uL2P,uL2D,uL2C); return l/(1.+max(l.r,max(l.g,l.b))*0.42); }   // soft knee: a pale animal in both beams keeps its colour
#ifdef FRAG
// bump from a height value using screen-space derivatives (no extra noise taps)
vec3 bumpN(vec3 N, vec3 P, float h, float k){ vec3 dpx=dFdx(P), dpy=dFdy(P); float hx=dFdx(h), hy=dFdy(h); vec3 r1=cross(dpy,N), r2=cross(N,dpx); float det=dot(dpx,r1); vec3 g=sign(det)*(hx*r1+hy*r2); return normalize(abs(det)*N-k*g); }
#endif
#ifdef LIT
uniform highp sampler2DShadow uShadow;
float shadowAt(vec3 P, vec3 N){
  if(uSunDir.w<0.5) return 1.;
  vec4 s=uShVP*vec4(P+N*0.06+uSunDir.xyz*0.04,1.);
  vec3 c=s.xyz/s.w*0.5+0.5;
  if(c.x<0.||c.y<0.||c.x>1.||c.y>1.||c.z>1.) return 1.;
  float tx=uMisc.x, acc=0.;
  if(uMisc.y>1.5){ for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++) acc+=texture(uShadow,vec3(c.xy+vec2(x,y)*tx*0.8,c.z)); acc/=25.; }
  else if(uMisc.y>0.5){ for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++) acc+=texture(uShadow,vec3(c.xy+vec2(x,y)*tx,c.z)); acc/=9.; }
  else acc=texture(uShadow,c);
  vec2 e=min(c.xy,1.-c.xy); return mix(1.,acc,smoothstep(0.,0.06,min(e.x,e.y)));
}
#else
float shadowAt(vec3 P, vec3 N){ return 1.; }
#endif
`;

// ---------- sky: gradient, sun or moon disc, stars, clouds, ridges, volcano; alpha = open-sky mask for the light shafts ----------
const SKY_VS = `out vec2 vNdc; void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2)*2.-1.; vNdc=p; gl_Position=vec4(p,0.9999,1.); }`;
const SKY_FS = `in vec2 vNdc; uniform mat4 uInvVP; out vec4 o;
float ridge(float az, float f, float seed){ return vn2(vec2(az*f, seed))*0.6+vn2(vec2(az*f*2.7, seed+5.))*0.3+vn2(vec2(az*f*7.1,seed+9.))*0.1; }
void main(){
  vec4 a=uInvVP*vec4(vNdc,1.,1.); vec4 b=uInvVP*vec4(vNdc,-1.,1.);
  vec3 d=normalize(a.xyz/a.w-b.xyz/b.w);
  float night=uFog2.w, mask=1.; float sd=dot(d,uSunDir.xyz);
  vec3 c=skyBase(d);
  c+=uSunCol.rgb*smoothstep(0.99955,0.9998,sd)*3.;
  if(night>0.02&&d.y>-0.02){ vec3 g=d*190.; float h=hash13(floor(g)); if(h>0.9962){ vec3 f=fract(g)-0.5; c+=vec3(0.9,0.95,1.1)*smoothstep(0.32,0.04,length(f))*(0.7+0.3*sin(uCam.w*2.+h*90.))*night*1.5*(0.4+h*0.6)*smoothstep(-0.02,0.12,d.y); } }
  // painterly clouds, lit from the sun side
  if(d.y>0.){
    vec2 uv=d.xz/(d.y+0.12)*1.1+vec2(uCam.w*0.004,0.);
    float n=fbm2(uv*1.3); float n2=fbm2(uv*3.7+3.);
    float cl=smoothstep(0.52,0.78,n+n2*0.18)*smoothstep(0.0,0.2,d.y);
    float lit=0.75+0.35*smoothstep(0.3,0.8,fbm2(uv*1.3+uSunDir.xz*0.08));
    vec3 sunS=uSunCol.rgb*(1.-0.74*night);   // moonlit clouds stay dim, with a silver edge toward the moon
    vec3 cc=((uSky.rgb+uFog.rgb)*0.14+(sunS*0.31*lit+uSky.rgb*0.25)*0.75)*(1.-0.3*night)+uSunCol.rgb*pow(max(sd,0.),5.)*0.35;
    c=mix(c,cc,cl*0.85); mask-=cl*0.75;
  }
  // distant ridges and a smoking volcano (its crater glows after dark)
  float az=atan(d.x,-d.z);
  float h1=0.035+0.07*ridge(az,2.2,1.3);
  float vz=az-0.62; float cone=0.15-abs(vz)*0.55; float crater=0.012*smoothstep(0.035,0.0,abs(vz));
  h1=max(h1,cone-crater);
  float h2=0.012+0.04*ridge(az,4.5,7.7);
  vec3 far=mix(uFog.rgb*(1.-0.5*night), vec3(0.07,0.11,0.17)*(1.-0.85*night), 0.35);
  vec3 nearR=mix(uFog.rgb*(1.-0.6*night), vec3(0.03,0.06,0.025)*(1.-0.8*night), 0.5);
  if(d.y>cone-0.01&&abs(vz)<0.35){ float py=d.y-0.14; float wx=vz-py*0.9; float pl=exp(-wx*wx/(0.0012+py*py*0.08))*smoothstep(-0.01,0.03,py)*smoothstep(0.45,0.1,py);
    pl*=0.6+0.5*fbm2(vec2(wx*40.,py*30.-uCam.w*0.08)); vec3 smoke=mix(vec3(0.15,0.14,0.14),uFog.rgb,0.35)*(1.-0.6*night)+vec3(1.4,0.3,0.05)*night*exp(-py*py*500.);
    c=mix(c, smoke, clamp(pl,0.,0.85)); mask-=pl*0.6; }
  c+=vec3(2.6,0.6,0.1)*night*exp(-(vz*vz*1400.+(d.y-0.15)*(d.y-0.15)*2500.));
  if(d.y<h1){ c=mix(far, uFog.rgb, smoothstep(h1-0.003,h1,d.y)*0.4); mask=0.; }
  if(d.y<h2){ c=nearR; mask=0.; }
  if(d.y<0.){ c=mix(nearR, uGnd.rgb*0.9, smoothstep(0.,-0.2,d.y)); mask=0.; }
  o=vec4(c,clamp(mask,0.,1.));
}`;

// ---------- terrain: aX = dirt, rock, wet, lava weights ----------
const TER_VS = `layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec4 aCol; layout(location=3) in vec4 aX;
out vec3 vP; out vec3 vN; out vec4 vC; out vec4 vX;
void main(){ vP=aPos; vN=aNrm; vC=aCol; vX=aX; gl_Position=uVP*vec4(aPos,1.); }`;
const TER_FS = `in vec3 vP; in vec3 vN; in vec4 vC; in vec4 vX; out vec4 o;
float lavaF(vec2 p){ return sin(p.x*0.045+2.3*sin(p.y*0.021))+sin(p.y*0.037+1.7*sin(p.x*0.018)); }
void main(){
  vec3 N=normalize(vN); vec3 alb=toLin(vC.rgb); float dirt=vX.x, rock=vX.y, wet=vX.z, lavaW=vX.w;
  float dist=length(vP-uCam.xyz);
  float n1=vn2(vP.xz*0.9), n2=vn2(vP.xz*3.1+7.), n3=fbm2(vP.xz*0.06);
  // brush strokes: stretched noise for a painted ground
  float br=vn2(vec2(vP.x*0.35+vP.z*0.9, vP.z*0.35-vP.x*0.9)*1.7);
  alb*=0.82+0.22*n1+0.12*br+0.1*(n3-0.5);
  alb*=mix(1.,0.9+0.2*n2,dirt);
  float st=sin(vP.y*2.3+n3*6.)*0.5+0.5; alb*=mix(1.,0.78+0.3*st+0.15*n2,rock);
  float grass=clamp(1.-dirt-rock-wet,0.,1.);
  alb=mix(alb, alb*vec3(1.35,1.15,0.6), smoothstep(0.55,0.8,n3+n1*0.2)*0.6*grass*uEnv.x);
  // fine relief: pebbles on dirt, cracks on rock, clods under the grass
  float bf=smoothstep(55.,6.,dist)*uEnv.y;
  if(bf>0.01){ vec2 q=vP.xz*mix(2.4,1.2,rock); float hgt=(vn2(q)+0.5*vn2(q*2.9+3.))*mix(0.035,0.11,rock)+n2*0.02*dirt; N=bumpN(N,vP,hgt,bf); }
  float sh=shadowAt(vP,N);
  if(uMisc.w>0.5){ vec4 s4=uShVP*vec4(vP,1.); vec3 cc=s4.xyz/s4.w*0.5+0.5; o=vec4(sh, texture(uShadow,vec3(cc.xy,cc.z-0.01)), texture(uShadow,vec3(cc.xy,0.45)),1.); return; }
  vec3 c=alb*(uSunCol.rgb*max(dot(N,uSunDir.xyz),0.)*sh+hemi(N)*0.95+lamps(vP,N,0.));
  vec3 vd=normalize(vP-uCam.xyz);
  if(wet>0.01){ c*=mix(1.,0.62,wet); c+=skyBase(reflect(vd,N))*0.11*wet; vec3 h=normalize(uSunDir.xyz-vd); c+=uSunCol.rgb*pow(max(dot(N,h),0.),70.)*0.3*wet*sh; }
  if(lavaW>0.004){ // molten channels: crust plates drifting on a bright core, glow on the banks
    float f=abs(lavaF(vP.xz)); float core=1.-smoothstep(0.035,0.11,f);
    float crust=fbm2(vP.xz*0.55+vec2(uCam.w*0.025,uCam.w*0.01)); float crack=smoothstep(0.42,0.6,crust+core*0.22);
    vec3 hot=mix(vec3(1.8,0.22,0.02), vec3(7.5,3.4,0.8), smoothstep(0.5,0.85,crust+core*0.3))*(0.75+0.25*sin(uCam.w*0.9+crust*9.));
    c=mix(c, mix(c*0.25,hot,crack), core*lavaW);
    c+=vec3(1.5,0.3,0.04)*(1.-smoothstep(0.04,0.75,f))*lavaW*(0.06+alb.g*4.);
    c+=alb*vec3(0.5,0.13,0.03)*lavaW*uFog2.w;
  }
  o=vec4(fogApply(c,vP),1.);
}`;

// ---------- splats (48-byte records) ----------
const SPL_VS = `layout(location=0) in vec2 aCorner; layout(location=1) in vec3 aPos; layout(location=2) in vec3 aU; layout(location=3) in vec3 aV;
layout(location=4) in vec4 aCol; layout(location=5) in vec4 aNrm; layout(location=6) in vec4 aX;
uniform vec4 uPush; // xyz jeep position, w radius: grass leans away
out vec2 vUV; out vec3 vC; flat out float vSeed; flat out float vShape;
void main(){
  float flags=aX.y, sway=aX.z/255.;
  bool blade=mod(flags,2.)>0.5; bool trans=mod(floor(flags/2.),2.)>0.5;
  vec3 U=aU, Vv=aV;
  vec3 toC=uCam.xyz-aPos;
  if(blade){ vec3 side=cross(normalize(Vv),toC); float l=length(side); if(l>1e-4) U=side/l*length(aU); }
  vec3 P=aPos+U*aCorner.x+Vv*aCorner.y;
  float ph=dot(aPos.xz,vec2(0.13,0.11))+uWind.w*1.9;
  float gust=0.65+0.35*sin(uWind.w*0.43+aPos.x*0.017+aPos.z*0.011);
  vec2 w=uWind.xy*uWind.z*gust*(0.55+sin(ph)*0.45+sin(ph*2.3+1.)*0.2);
  float k=blade?(aCorner.y+1.)*0.5:1.; k*=k;
  P.xz+=w*sway*k;
  if(blade&&uPush.w>0.&&Vv.y>0.){ vec2 dd=aPos.xz-uPush.xz; float dl=length(dd); float pu=smoothstep(uPush.w,uPush.w*0.4,dl); P.xz+=dd/max(dl,0.01)*pu*k*length(Vv)*1.4; P.y-=pu*k*length(Vv)*0.5; }
  vec3 N=normalize(aNrm.xyz+1e-5);
  vec3 vd=normalize(toC);
  if(!blade&&dot(N,vd)<0.) N=-N;
  float nl=dot(N,uSunDir.xyz);
  float sh=shadowAt(aPos,vec3(0.,1.,0.));
  vec3 alb=toLin(aCol.rgb); float ao=aCol.a;
  vec3 c=alb*(uSunCol.rgb*max(nl,0.)*sh+hemi(N)*ao+lamps(aPos,N,1.)*0.8);
  if(trans) c+=alb*uSunCol.rgb*sh*(max(-nl,0.)*0.35+pow(max(dot(-vd,uSunDir.xyz),0.),3.)*0.9)*vec3(1.05,1.,0.55);
  vC=fogApply(c,P);
  vUV=aCorner; vSeed=mod(float(gl_InstanceID),977.)+aX.w; vShape=aX.x;
  gl_Position=uVP*vec4(P,1.);
}`;
const SPL_FS = `in vec2 vUV; in vec3 vC; flat in float vSeed; flat in float vShape; out vec4 o;
void main(){
  vec2 uv=vUV; float a; float t=uv.y*0.5+0.5; float grad=1.;
  if(vShape<0.5){ float ang=atan(uv.y,uv.x); float r2=dot(uv,uv)*(1.14+0.2*sin(ang*3.+vSeed)+0.12*sin(ang*7.+vSeed*1.7)); a=1.-smoothstep(0.55,1.,r2); }
  else if(vShape<1.5){ float w=1.-t*0.9; a=1.-smoothstep(w*0.55,w,abs(uv.x)); grad=mix(0.5,1.22,t); }
  else if(vShape<2.5){ float w=sin(t*3.1416)*0.92+0.08; float f=fract(t*13.+abs(uv.x)*0.9+vSeed*0.1); float lp=sin(f*3.1416);
    float leaf=1.-smoothstep(w*mix(0.1,1.,lp)*0.8, w*mix(0.1,1.,lp), abs(uv.x)); float stem=1.-smoothstep(0.04,0.09,abs(uv.x)); a=max(leaf,stem)*(1.-smoothstep(0.92,1.,t)); grad=mix(0.72,1.12,t)*(0.86+0.2*lp); }
  else if(vShape<3.5){ a=exp(-dot(uv,uv)*3.2); }
  else if(vShape<4.5){ a=1.-smoothstep(0.75,1.,abs(uv.x)+t*t*0.4); a*=1.-smoothstep(0.96,1.,t); grad=mix(1.05,0.8,t)*(0.9+0.2*sin(uv.x*9.+vSeed)); }
  else { a=0.; float g=0.;   // tuft: five blades fanned from one root
    for(int i=0;i<5;i++){ float fi=float(i); float hs=0.5+0.5*fract(sin(vSeed*12.9+fi*7.3)*43758.5); float tt=t/hs; if(tt>1.) continue;
      float cx=(fi-2.)*0.2*(0.2+tt*0.8)+(fract(vSeed*0.37+fi*0.61)-0.5)*0.55*tt*tt; float w=0.1*(1.-tt*0.85)+0.012;
      float b=1.-smoothstep(w*0.5,w,abs(uv.x-cx)); if(b>a){ a=b; g=tt; } }
    grad=mix(0.5,1.22,g); }
  vec3 c=vC*(0.93+0.11*sin(uv.y*8.+vSeed*2.3))*grad;
  if(uMisc.z>0.5){ if(a<hash12(gl_FragCoord.xy+vSeed)) discard; a=1.; } else if(a<0.03) discard;
  o=vec4(c,a);
}`;
const SPL_SH_VS = `layout(location=0) in vec2 aCorner; layout(location=1) in vec3 aPos; layout(location=2) in vec3 aU; layout(location=3) in vec3 aV;
out vec2 vUV; void main(){ vUV=aCorner; gl_Position=uVP*vec4(aPos+aU*aCorner.x+aV*aCorner.y,1.); }`;
const SPL_SH_FS = `in vec2 vUV; out vec4 o; void main(){ if(dot(vUV,vUV)>0.7) discard; o=vec4(1); }`;

// ---------- static / rigid meshes: colour alpha = material (1 bark, 2 rock, 3 metal, 4 rubber, 5 emissive, 6 cloth, 7 glass) ----------
const MESH_VS = `layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec4 aCol;
uniform mat4 uM; out vec3 vP; out vec3 vN; out vec4 vC; out vec3 vO;
void main(){ vec4 P=uM*vec4(aPos,1.); vP=P.xyz; vN=mat3(uM)*aNrm; vC=aCol; vO=aPos; gl_Position=uVP*P; }`;
const MESH_FS = `in vec3 vP; in vec3 vN; in vec4 vC; in vec3 vO; uniform vec4 uTint; uniform vec4 uFill; out vec4 o;
void main(){
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N; vec3 alb=toLin(vC.rgb)*uTint.rgb; float mat=floor(vC.a*255.+.5);
  vec3 vd=normalize(uCam.xyz-vP); float spec=0.04, gloss=16.;
  if(mat==1.){ float g=vn2(vec2(vO.x*9.+vO.z*9.,vO.y*1.2)); alb*=0.75+0.35*g; if(uEnv.y>0.5) N=bumpN(N,vP,g*0.03,1.); }
  else if(mat==2.){ float n=vn3(vP*1.3)*0.6+vn3(vP*4.1)*0.4; alb*=0.7+0.45*n; float st=sin(vP.y*3.+n*4.)*0.5+0.5; alb*=0.9+0.15*st; if(uEnv.y>0.5) N=bumpN(N,vP,n*0.12,1.); }
  else if(mat==3.){ spec=0.5; gloss=60.; }
  else if(mat==4.){ alb*=0.8+0.2*vn3(vO*30.); spec=0.02; }
  else if(mat==6.){ alb*=0.85+0.25*vn2(vO.xy*60.); }
  else if(mat==7.){ spec=0.9; gloss=120.; }
  else if(mat==0.){ spec=0.12; gloss=28.; }
  if(mat==5.){ o=vec4(fogApply(alb*uTint.a,vP),1.); return; }
  float sh=shadowAt(vP,N); float nl=dot(N,uSunDir.xyz);
  vec3 c=alb*(uSunCol.rgb*max(nl,0.)*sh+hemi(N)*0.9+lamps(vP,N,0.)+uFill.rgb*(0.6+0.4*N.y));
  vec3 h=normalize(uSunDir.xyz+vd); c+=uSunCol.rgb*spec*pow(max(dot(N,h),0.),gloss)*sh*step(0.,nl);
  if(mat==3.||mat==7.||mat==0.) c+=skyBase(reflect(-vd,N))*spec*0.22*pow(1.-max(dot(N,vd),0.),2.);
  o=vec4(fogApply(c,vP),1.);
}`;
const DEPTH_FS = `out vec4 o; void main(){ o=vec4(1); }`;

// ---------- skinned creatures ----------
const SKIN_VS = `layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec4 aCol; layout(location=3) in vec4 aBone; layout(location=4) in float aW;
uniform mat4 uBones[32]; out vec3 vP; out vec3 vN; out vec3 vO; out vec4 vC;
void main(){ int b0=int(aBone.x+.5), b1=int(aBone.y+.5); mat4 M=uBones[b0]*aW+uBones[b1]*(1.-aW);
  vec4 P=M*vec4(aPos,1.); vP=P.xyz; vN=mat3(M)*aNrm; vO=aPos; vC=aCol; gl_Position=uVP*P; }`;
const SKIN_SH_VS = `layout(location=0) in vec3 aPos; layout(location=3) in vec4 aBone; layout(location=4) in float aW; uniform mat4 uBones[32];
void main(){ int b0=int(aBone.x+.5), b1=int(aBone.y+.5); mat4 M=uBones[b0]*aW+uBones[b1]*(1.-aW); gl_Position=uVP*(M*vec4(aPos,1.)); }`;
const SKIN_FS = `in vec3 vP; in vec3 vN; in vec3 vO; in vec4 vC; out vec4 o;
uniform vec4 uEye; uniform vec4 uEyeCol; uniform vec4 uScale; uniform vec4 uFx; // uFx: hit flash, wet gloss, water line y (or -1e4), fill light
void main(){
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 alb=toLin(vC.rgb); float reg=floor(vC.a*255.+.5);
  vec3 vd=normalize(uCam.xyz-vP);
  float spec=0.07, gloss=26., shine=0.;
  // scales: cell ridges in bind space, raised a little so they catch the light
  if(reg<1.5||reg==5.){ float n=vn3(vO*uScale.x); float sc=smoothstep(0.08,0.45,abs(n-0.5)*2.); alb*=0.8+0.28*sc; alb*=0.92+0.16*vn3(vO*uScale.x*0.21); if(uEnv.y>0.5) N=bumpN(N,vP,sc*uScale.y,1.); }
  if(reg==2.){ spec=0.3; gloss=40.; alb*=0.85+0.25*vn3(vO*40.); }
  if(reg==3.){ alb=vec3(0.7,0.64,0.5); spec=0.3; }
  if(reg==4.){ alb=vec3(0.12,0.02,0.02); }
  // eyes: drawn from bind-space position, crisp at any mesh resolution
  float side=sign(vO.z); vec3 e=vO-vec3(uEye.x,uEye.y,side*uEye.z); float er=length(e)/uEye.w;
  if(er<1.&&uEye.w>0.){
    vec3 ed=e/max(length(e),1e-4); vec3 look=normalize(vec3(0.45,0.12,side));
    float f=dot(ed,look);
    vec3 ec=mix(vec3(0.01), toLin(uEyeCol.rgb), smoothstep(0.35,0.5,f));
    ec=mix(ec, vec3(0.02), smoothstep(0.84,0.9,f));
    float lid=mix(1.2,-1.0,uEyeCol.w); // closure lowers the lid line
    float lidMask=smoothstep(lid-0.08,lid,ed.y);
    ec=mix(ec, alb*0.75, lidMask);
    float rim=smoothstep(0.85,1.,er); alb=mix(ec, alb*0.6, rim); spec=mix(1.2,0.05,max(lidMask,rim)); gloss=90.; shine=(1.-max(lidMask,rim))*smoothstep(0.3,0.6,f);
  }
  // wet hide below and just above the water line
  float wetK=uFx.y*smoothstep(uFx.z+0.9,uFx.z+0.1,vP.y); alb*=1.-0.35*wetK; spec+=0.5*wetK; gloss=mix(gloss,70.,wetK);
  float sh=shadowAt(vP,N); float nl=dot(N,uSunDir.xyz);
  vec3 c=alb*(uSunCol.rgb*max(nl,0.)*sh+hemi(N)*0.85+lamps(vP,N,0.)+vec3(1.,0.9,0.75)*uFx.w);
  if(reg==6.) c+=alb*uSunCol.rgb*sh*max(-nl,0.)*0.9*vec3(1.1,0.75,0.45);
  vec3 h=normalize(uSunDir.xyz+vd); c+=uSunCol.rgb*spec*pow(max(dot(N,h),0.),gloss)*sh*step(0.,nl);
  float rimL=pow(1.-max(dot(N,vd),0.),3.); c+=hemi(N)*rimL*0.2+uSunCol.rgb*rimL*max(dot(-vd,uSunDir.xyz),0.)*0.12*sh;
  c+=lamps(vP,vd,1.)*shine*vec3(0.9,1.,0.55)*1.6;   // eyeshine in the torch
  c=mix(c, vec3(1.6,1.1,0.6)*(1.-0.45*uFog2.w), uFx.x*0.4);
  o=vec4(fogApply(c,vP),1.);
}`;

// ---------- water: aInfo = depth, flow x, flow z, murk ----------
const WAT_VS = `layout(location=0) in vec3 aPos; layout(location=1) in vec4 aInfo; out vec3 vP; out vec4 vI;
void main(){ vP=aPos; vI=aInfo; gl_Position=uVP*vec4(aPos,1.); }`;
const WAT_FS = `in vec3 vP; in vec4 vI; out vec4 o;
void main(){
  float depth=vI.x; vec2 flow=vI.yz; float murk=vI.w; float t=uCam.w;
  vec2 p=vP.xz;
  vec2 q1=p*0.55-flow*t*1.1, q2=p*1.7-flow*t*1.6+vec2(3.1,1.7);
  float e=0.06;
  float h0=vn2(q1)*0.6+vn2(q2)*0.4;
  float hx=vn2(q1+vec2(e,0))*0.6+vn2(q2+vec2(e*3.1,0))*0.4;
  float hz=vn2(q1+vec2(0,e))*0.6+vn2(q2+vec2(0,e*3.1))*0.4;
  float amp=mix(0.22,0.11,murk);
  vec3 N=normalize(vec3(-(hx-h0)/e*amp,1.,-(hz-h0)/e*amp));
  vec3 vd=normalize(vP-uCam.xyz);
  float fr=0.03+0.97*pow(1.-max(dot(-vd,N),0.),5.);
  vec3 refl=skyBase(reflect(vd,N));
  vec3 deep=mix(vec3(0.008,0.03,0.04), vec3(0.03,0.035,0.016), murk), shallow=mix(vec3(0.1,0.12,0.07), vec3(0.085,0.08,0.045), murk);
  vec3 body=mix(shallow,deep,smoothstep(0.,1.4,depth))*(uSunCol.rgb*0.45+hemi(vec3(0,1,0))*0.6+lamps(vP,vec3(0,1,0),0.)*0.5);
  float canopy=clamp((murk-0.75)*4.,0.,1.)*smoothstep(0.32,0.62,fbm2(p*0.07+3.));   // swamp water mirrors the trees over it, not open sky
  refl=mix(refl, hemi(vec3(0,1,0))*vec3(0.05,0.075,0.04), canopy*0.85);
  vec3 c=mix(body,refl*mix(1.,0.62,murk),fr*mix(0.85,0.6,murk));
  vec3 h=normalize(uSunDir.xyz-vd); float ndh=max(dot(N,h),0.); c+=uSunCol.rgb*(pow(ndh,180.)*1.6+pow(ndh,24.)*0.07);
  float foam=smoothstep(0.12,0.0,depth)*0.7*(1.-murk*0.6)+smoothstep(0.62,0.9,vn2(p*2.2-flow*t*2.))*0.12*smoothstep(0.6,0.2,depth);
  c=mix(c, vec3(0.8)*(uSunCol.rgb*0.45+uSky.rgb*0.6), foam);
  float a=clamp(smoothstep(0.0,0.35,depth)*mix(0.75,0.86,murk)+fr*0.3+foam,0.,0.96);
  o=vec4(fogApply(c,vP)*a,a);
}`;

// ---------- particles (premultiplied): kind 0 soft lit, 1 streak, 2 additive glow, 3 lit flecks ----------
const PAR_VS = `layout(location=0) in vec2 aCorner; layout(location=1) in vec4 aP; layout(location=2) in vec4 aV; layout(location=3) in vec4 aC;
out vec2 vUV; out vec4 vC; flat out float vK;
void main(){
  vec3 P=aP.xyz; float s=aP.w; float kind=aV.w;
  vec3 R=uCamR.xyz, U=uCamU.xyz;
  vec3 W;
  if(kind>0.5&&kind<1.5){ // streak along velocity
    vec3 vel=aV.xyz; float l=length(vel); vec3 dir=vel/max(l,1e-4);
    vec3 side=normalize(cross(dir,uCam.xyz-P)); W=P+side*aCorner.x*s+dir*aCorner.y*max(l*0.5,s);
  } else W=P+R*aCorner.x*s+U*aCorner.y*s;
  vUV=aCorner; vC=aC; vK=kind;
  vec3 lit=toLin(aC.rgb);
  if(kind<0.5||kind>2.5) lit*=uSunCol.rgb*0.55+hemi(vec3(0,1,0))*0.8+lamps(P,vec3(0,1,0),1.)*0.6;
  else lit*=3.;   // glows and tracers are stored in 8 bits; lift them into HDR so they bloom
  vC.rgb=fogApply(lit,P);
  gl_Position=uVP*vec4(W,1.);
}`;
const PAR_FS = `in vec2 vUV; in vec4 vC; flat in float vK; out vec4 o;
void main(){
  float r2=dot(vUV,vUV); float a;
  if(vK>0.5&&vK<1.5) a=(1.-smoothstep(0.2,1.,abs(vUV.x)))*smoothstep(1.,0.2,abs(vUV.y));
  else a=exp(-r2*3.)*(1.-smoothstep(0.8,1.,r2));
  if(vK>2.5){ float ang=atan(vUV.y,vUV.x); a*=0.75+0.25*sin(ang*5.+vC.a*20.); }
  if(vK>1.5&&vK<2.5) { o=vec4(vC.rgb*a*vC.a,0.); return; }
  o=vec4(vC.rgb*a*vC.a, a*vC.a);
}`;

// ---------- post ----------
const POST_VS = `out vec2 vUV; void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUV=p; gl_Position=vec4(p*2.-1.,0.,1.); }`;
const DOWN_FS = `in vec2 vUV; uniform sampler2D uTex; uniform vec4 uTx; out vec4 o;
vec3 g(vec2 uv){ vec3 c=texture(uTex,uv).rgb; return (any(isnan(c))||any(isinf(c)))?vec3(0):c; }
void main(){ vec2 t=uTx.xy; vec3 c=(g(vUV+vec2(-t.x,-t.y))+g(vUV+vec2(t.x,-t.y))+g(vUV+vec2(-t.x,t.y))+g(vUV+vec2(t.x,t.y)))*0.25;
  if(uTx.z>0.){ float l=max(c.r,max(c.g,c.b)); c*=smoothstep(uTx.z,uTx.z*2.2,l); c=min(c,vec3(30.)); }
  o=vec4(c,1.); }`;
const UP_FS = `in vec2 vUV; uniform sampler2D uTex; uniform vec4 uTx; out vec4 o;
void main(){ vec2 t=uTx.xy; vec3 c=texture(uTex,vUV).rgb*4.;
  c+=texture(uTex,vUV+vec2(t.x,0)).rgb*2.+texture(uTex,vUV-vec2(t.x,0)).rgb*2.+texture(uTex,vUV+vec2(0,t.y)).rgb*2.+texture(uTex,vUV-vec2(0,t.y)).rgb*2.;
  c+=texture(uTex,vUV+t).rgb+texture(uTex,vUV-t).rgb+texture(uTex,vUV+vec2(t.x,-t.y)).rgb+texture(uTex,vUV+vec2(-t.x,t.y)).rgb;
  o=vec4(c/16.*uTx.w,1.); }`;
// light shafts: march from each pixel toward the sun over the open-sky mask in the scene's alpha
const RAYS_FS = `in vec2 vUV; uniform sampler2D uTex; uniform vec4 uSunUV; out vec4 o; // xy sun position in uv, z strength, w samples
void main(){ float n=uSunUV.w; vec2 stp=(uSunUV.xy-vUV)/n*0.92; vec2 p=vUV+stp*hash12(gl_FragCoord.xy); float acc=0., w=1., ws=0.;
  for(int i=0;i<32;i++){ if(float(i)>=n) break; acc+=texture(uTex,p).a*w; ws+=w; w*=0.955; p+=stp; }
  o=vec4(vec3(acc/max(ws,1e-3)*uSunUV.z),1.); }`;
const FINAL_FS = `in vec2 vUV; uniform sampler2D uScene; uniform sampler2D uBloom; uniform sampler2D uRays; uniform vec4 uPost; uniform vec4 uGrade; uniform vec4 uRayCol; out vec4 o;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.); }
void main(){
  vec3 c=texture(uScene,vUV).rgb; if(any(isnan(c))||any(isinf(c))) c=vec3(0);
  if(uPost.y>0.){ vec3 b=texture(uBloom,vUV).rgb; if(!(any(isnan(b))||any(isinf(b)))) c+=b*uPost.y; }
  if(uRayCol.w>0.){ vec2 t=uRayCol.w*vec2(1.,1.); float r=texture(uRays,vUV).r*0.4+(texture(uRays,vUV+vec2(t.x,0.)*uGrade.zw).r+texture(uRays,vUV-vec2(t.x,0.)*uGrade.zw).r+texture(uRays,vUV+vec2(0.,t.y)*uGrade.zw).r+texture(uRays,vUV-vec2(0.,t.y)*uGrade.zw).r)*0.15; c+=uRayCol.rgb*r*r; }
  c*=uPost.x;
  c=mix(c, c*vec3(1.6,0.25,0.2), uGrade.x); // damage flash
  c=aces(c);
  c=pow(c,vec3(1./2.2));
  float l=dot(c,vec3(0.299,0.587,0.114));
  c=mix(vec3(l),c,1.06+uGrade.y);
  c=mix(c, c*c*(3.-2.*c), 0.16);                                   // a little more contrast
  c+=vec3(0.012,0.004,-0.012)*smoothstep(0.35,0.9,l)+vec3(-0.008,0.,0.012)*smoothstep(0.4,0.,l);   // warm highlights, cool shadows
  vec2 q=vUV-0.5; c*=1.-dot(q,q)*uPost.z;
  c+=(hash12(gl_FragCoord.xy+uPost.w)-0.5)/255.;
  o=vec4(c,1.);
}`;

let P_SKY, P_TER, P_SPL, P_SPLSH, P_MESH, P_MESHSH, P_SKIN, P_SKINSH, P_WAT, P_PAR, P_DOWN, P_UP, P_RAYS, P_FINAL;
function buildPrograms() {
  const L = { vhead: '#define LIT\n', fhead: '#define LIT\n#define FRAG\n' }, F = { fhead: '#define FRAG\n' };
  P_SKY = program('sky', SKY_VS, SKY_FS, F);
  P_TER = program('terrain', TER_VS, TER_FS, L);
  P_SPL = program('splat', SPL_VS, SPL_FS, L);
  P_SPLSH = program('splatSh', SPL_SH_VS, SPL_SH_FS, F);
  P_MESH = program('mesh', MESH_VS, MESH_FS, L);
  P_MESHSH = program('meshSh', MESH_VS, DEPTH_FS, F);
  P_SKIN = program('skin', SKIN_VS, SKIN_FS, L);
  P_SKINSH = program('skinSh', SKIN_SH_VS, DEPTH_FS, F);
  P_WAT = program('water', WAT_VS, WAT_FS, F);
  P_PAR = program('particles', PAR_VS, PAR_FS, F);
  P_DOWN = program('down', POST_VS, DOWN_FS, F);
  P_UP = program('up', POST_VS, UP_FS, F);
  P_RAYS = program('rays', POST_VS, RAYS_FS, F);
  P_FINAL = program('final', POST_VS, FINAL_FS, F);
}
