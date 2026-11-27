// ---------- GLSL ----------
const GLSL_NOISE = `
float h31(vec3 p){ p=fract(p*0.3183099+vec3(0.71,0.113,0.419)); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float h12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vn(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return s/0.9375; }
`;
const VS_FSQ = `#version 300 es
out vec2 vP; void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2), float(gl_VertexID&2))*2.-1.; vP=p; gl_Position=vec4(p,0.,1.); }`;

// Lit instanced mesh. Vertex: pos, normal, rgba8 (a = material+1 or 0), uv. Instance: 3x4 rows, colour (a = material), params.
// params: x emissive gain, y hit flash, z seed, w special (ore / wear / window density)
const VS_MESH = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec4 aCol; layout(location=3) in vec2 aUV;
layout(location=4) in vec4 iM0; layout(location=5) in vec4 iM1; layout(location=6) in vec4 iM2; layout(location=7) in vec4 iCol; layout(location=8) in vec4 iPar;
uniform mat4 uVP; uniform vec3 uCam; uniform float uFadeFar, uUseUV;
out vec3 vW; out vec3 vN; out vec3 vO; out vec3 vON; out vec4 vCol; out vec4 vPar; out vec2 vUV; out float vS; flat out int vMat;
void main(){
  vec4 p=vec4(aPos,1.);
  vec3 w=vec3(dot(iM0,p),dot(iM1,p),dot(iM2,p));
  vec3 ic=vec3(iM0.w,iM1.w,iM2.w); if(uUseUV<0.5){ float fk=1.-smoothstep(uFadeFar*0.78,uFadeFar,length(ic-uCam)); w=ic+(w-ic)*fk; }
  vN=vec3(dot(iM0.xyz,aNor),dot(iM1.xyz,aNor),dot(iM2.xyz,aNor));
  vW=w; vO=aPos; vON=aNor; vUV=aUV; vS=length(iM0.xyz);
  float m=aCol.a*255.;
  vMat = m>0.5 ? int(m+0.5)-1 : int(iCol.a+0.5);
  vCol=vec4(aCol.rgb*iCol.rgb,1.); vPar=iPar;
  gl_Position=uVP*vec4(w,1.);
}`;
const FS_MESH = `#version 300 es
precision highp float; precision highp int; precision highp sampler2DShadow;
in vec3 vW; in vec3 vN; in vec3 vO; in vec3 vON; in vec4 vCol; in vec4 vPar; in vec2 vUV; in float vS; flat in int vMat;
uniform vec3 uCam, uSunDir, uSunCol, uAmbA, uAmbB, uAmbDir, uHaze;
uniform float uHazeDen, uTime, uShadowOn, uShadowTexel, uUseUV, uFadeFar;
uniform int uPCF, uNPL;
uniform vec4 uPL[16]; uniform vec4 uPC[16];
uniform mat4 uShadowVP;
uniform sampler2DShadow uShadow;
out vec4 o;
${GLSL_NOISE}
float shadowAt(vec3 w, vec3 n){
  if(uShadowOn<0.5) return 1.;
  vec4 s=uShadowVP*vec4(w+n*0.25,1.); vec3 p=s.xyz/s.w*0.5+0.5;
  if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.) return 1.;
  float sum=0., cnt=0.;
  for(int y=-2;y<=2;y++) for(int x=-2;x<=2;x++){ if(abs(x)>uPCF||abs(y)>uPCF) continue; sum+=texture(uShadow, vec3(p.xy+vec2(x,y)*uShadowTexel, p.z-0.0008)); cnt+=1.; }
  return sum/cnt;
}
vec3 bumpN(vec3 N, float h, float k){
  vec3 dpx=dFdx(vW), dpy=dFdy(vW); float dhx=dFdx(h), dhy=dFdy(h);
  vec3 r1=cross(dpy,N), r2=cross(N,dpx); float det=dot(dpx,r1);
  if(abs(det)<1e-10) return N;
  vec3 g=sign(det)*(dhx*r1+dhy*r2); vec3 n2=abs(det)*N-k*g; float l=length(n2);
  return l>1e-12 ? n2/l : N;
}
void main(){
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 V=normalize(uCam-vW);
  vec3 alb=vCol.rgb; float rough=0.7, metal=0., wrap=0., ao=1.; vec3 emis=vec3(0.);
  vec3 P=vO+vPar.z*7.13;
  vec3 aN=abs(normalize(vON));
  vec3 Ow=vO*vS;
  vec2 puv = (aN.x>aN.y&&aN.x>aN.z) ? Ow.yz : ((aN.y>aN.z) ? Ow.xz : Ow.xy);
  int m=vMat;
  if(m==0){ // rock
    float n1=fbm3(P*1.1), n2=vn(P*5.3), n3=vn(P*17.);
    float h=n1*0.55+n2*0.3+n3*0.15;
    N=bumpN(N, h*vS*0.07, 1.);
    alb*= (0.55+0.6*n1)*(0.85+0.3*n2);
    ao = 0.55+0.45*smoothstep(0.25,0.7,n1);
    rough=0.85;
    if(vPar.w>0.5){
      float v=abs(fbm3(P*1.9+3.)-0.5);
      float vein=smoothstep(0.07,0.02,v);
      float sp=step(0.93,h31(floor(P*22.)));
      alb=mix(alb, vec3(1.,0.72,0.32), vein*0.85);
      metal=vein; rough=mix(rough,0.25,vein);
      emis+=vec3(1.,0.55,0.15)*(vein*0.35+sp*vein*2.5)*(0.7+0.3*sin(uTime*4.+P.x*9.));
    }
  } else if(m==1){ // ice: deep blue body, glassy highlights, bright rims and cracks
    float n1=fbm3(P*1.3), c=abs(vn(P*3.3)-0.5);
    N=bumpN(N, n1*vS*0.03, 1.);
    alb=mix(vec3(0.1,0.19,0.32), alb*0.3, 0.3)*(0.7+0.45*n1);
    rough=0.07; wrap=0.25;
    float fr=pow(1.-abs(dot(N,V)),2.5);
    emis+=vec3(0.3,0.65,1.)*(0.45*fr+0.05*(0.4+0.6*vn(P*2.)));
    emis+=vec3(0.6,0.9,1.)*smoothstep(0.03,0.0,c)*0.45;
  } else if(m==2||m==7||m==8){ // painted metal (7 lit windows, 8 hazard stripes)
    float psz = vS>4. ? 5. : 1.5;
    vec2 g=puv/psz; vec2 f=abs(fract(g)-0.5);
    float lw = vS>4. ? 0.485 : 0.46;
    float line=smoothstep(lw,0.5,max(f.x,f.y));
    float t=h31(vec3(floor(g),3.));
    alb*= (0.85+0.3*t)*(1.-line*0.55);
    if(m==8){ float s=step(0.5,fract((puv.x+puv.y)*0.55)); alb=mix(vec3(0.9,0.62,0.08),vec3(0.05),s)*(1.-line*0.4); }
    vec3 Pm=Ow*min(1.,3./vS)+vPar.z*7.13;
    float r=fbm3(Pm*0.7+4.);
    float wear=vPar.w>0.0?vPar.w:0.5;
    float rust=smoothstep(0.62-wear*0.15,0.82-wear*0.15,r);
    alb=mix(alb, vec3(0.3,0.14,0.07)*(0.7+0.5*vn(Pm*9.)), rust*0.85);
    float sc=fbm3(Pm*0.33+11.); alb*=mix(1., 0.3, smoothstep(0.62,0.8,sc)*wear);
    N=bumpN(N, (line*0.03+rust*0.02*vn(Pm*12.))*-1., 1.);
    rough=0.5+rust*0.35; metal=0.25*(1.-rust);
    if(m==7){
      vec2 g2=puv/(vS>4.?vec2(3.2,2.6):vec2(1.1,0.75)); vec2 l=fract(g2); vec2 cell=floor(g2);
      float win=step(0.3,l.x)*step(l.x,0.7)*step(0.36,l.y)*step(l.y,0.64)*step(0.5,h31(vec3(floor(cell.y),2.,1.)));
      float lit=step(0.9,h31(vec3(cell,9.)));
      float fl=0.75+0.25*sin(uTime*(2.+h31(vec3(cell,4.))*9.)+cell.x);
      alb=mix(alb, vec3(0.03), win*0.85);
      emis+=mix(vec3(1.,0.72,0.4),vec3(0.5,0.85,1.),step(0.5,h31(vec3(cell,7.))))*win*lit*fl*1.6*max(vPar.x,0.3);
    }
  } else if(m==3){ // dark metal
    float n=vn(P*7.); alb*=0.75+0.35*n; rough=0.35+0.2*n; metal=0.8;
    N=bumpN(N, vn(P*30.)*0.004*vS, 1.);
  } else if(m==4){ // emissive
    emis=alb*vPar.x; alb*=0.15; rough=0.3;
    if(vPar.w<-0.5) emis*=step(0.55,fract(uTime*0.7+vPar.z*0.37))*1.6+0.03;
  } else if(m==5){ // organic
    vec3 Q = uUseUV>0.5 ? vec3(vUV.x*7., cos(vUV.y*6.2832)*1.3, sin(vUV.y*6.2832)*1.3) : P*0.6;
    float n1=fbm3(Q*1.1), v=abs(fbm3(Q*1.6+2.)-0.5);
    float vein=smoothstep(0.045,0.0,v);
    float pulse=0.6+0.4*sin(uTime*2.3-Q.x*1.3);
    alb*=0.6+0.55*n1; alb=mix(alb, alb*vec3(1.4,0.8,1.6), vein*0.5);
    emis+=vec3(0.15,1.,0.8)*vein*pulse*(0.35+vPar.x);
    N=bumpN(N, (vn(Q*5.)*0.6+n1*0.4)*vS*(uUseUV>0.5?0.012:0.03), 1.);
    rough=0.32; wrap=0.45;
    if(uUseUV>0.5){
      float under=smoothstep(0.1,-0.4,sin(vUV.y*6.2832));
      vec2 sq=vec2(vUV.x*46., vUV.y*12.); vec2 fq=fract(sq)-0.5;
      float sk=smoothstep(0.38,0.3,length(fq))*smoothstep(0.12,0.2,length(fq));
      alb=mix(alb, vec3(0.5,0.26,0.36), under*0.45);
      alb=mix(alb, vec3(0.75,0.55,0.6), sk*under*0.6);
      emis+=vec3(1.,0.35,0.6)*sk*under*0.12;
    }
  } else if(m==6){ // creature eye, looks along +z
    vec3 d=normalize(vO); float f=d.z;
    float iris=smoothstep(0.62,0.7,f);
    float pupil=smoothstep(0.1,0.06,abs(d.x))*smoothstep(0.75,0.8,f);
    float rings=0.7+0.3*sin(f*60.);
    alb=mix(vec3(0.35,0.06,0.07), vec3(0.04), iris);
    emis+=mix(vec3(1.,0.55,0.08), vec3(1.,0.95,0.5), smoothstep(0.85,1.,f))*iris*(1.-pupil)*rings*vPar.x*2.5;
    rough=0.06; metal=0.;
  } else if(m==9){ // glass
    alb=vec3(0.02,0.035,0.045); rough=0.05; emis+=vec3(0.15,0.45,0.55)*0.25*max(vPar.x,0.4);
  }
  vec3 L=uSunDir;
  float NL=dot(N,L);
  float sh=shadowAt(vW,N);
  float dif=max((NL+wrap)/(1.+wrap),0.)*sh;
  vec3 H=normalize(L+V); float NH=max(dot(N,H),0.); float NV=max(dot(N,V),1e-3);
  float a=max(rough*rough,0.003), a2=a*a; float dd=NH*NH*(a2-1.)+1.; float D=a2/(3.14159*dd*dd);
  vec3 F0=mix(vec3(0.04),alb,metal);
  vec3 F=F0+(1.-F0)*pow(1.-max(dot(H,V),0.),5.);
  float nl=max(NL,0.); float k=(rough+1.)*(rough+1.)/8.;
  float Gs=NV/(NV*(1.-k)+k)*nl/(nl*(1.-k)+k);
  vec3 spec=min(D*F*Gs/(4.*NV*max(nl,1e-3)+1e-3), vec3(40.));
  vec3 kd=(1.-F)*(1.-metal);
  vec3 amb=mix(uAmbB,uAmbA,dot(N,uAmbDir)*0.5+0.5);
  vec3 col=kd*alb*(uSunCol*dif+amb*ao)+spec*uSunCol*nl*sh;
  vec3 Fr=F0+(1.-F0)*pow(1.-NV,5.);
  col+=Fr*amb*(1.-rough)*0.7*ao;
  col+=amb*0.25*pow(1.-NV,4.)*ao;
  for(int i=0;i<16;i++){
    if(i>=uNPL) break;
    vec3 d=uPL[i].xyz-vW; float d2=dot(d,d); float r=uPL[i].w;
    float att=clamp(1.-d2/(r*r),0.,1.); att*=att; att/=1.+d2*0.004;
    if(att<=0.) continue;
    vec3 l=d*inversesqrt(max(d2,1e-4)); float pl=max((dot(N,l)+wrap)/(1.+wrap),0.);
    vec3 h2=normalize(l+V); float nh=max(dot(N,h2),0.); float d3=nh*nh*(a2-1.)+1.;
    col+=(kd*alb*pl + F0*min(a2/(3.14159*d3*d3),30.)*max(dot(N,l),0.)*0.25)*uPC[i].rgb*att;
  }
  col+=emis;
  col+=vec3(1.,0.85,0.7)*vPar.y*1.6;
  float dist=length(vW-uCam); col=mix(col,uHaze,1.-exp(-dist*uHazeDen));
  if(any(isnan(col))||any(isinf(col))) col=vec3(0.);
  o=vec4(col,1.);
}`;
const VS_SHADOW = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=4) in vec4 iM0; layout(location=5) in vec4 iM1; layout(location=6) in vec4 iM2;
uniform mat4 uVP;
void main(){ vec4 p=vec4(aPos,1.); gl_Position=uVP*vec4(dot(iM0,p),dot(iM1,p),dot(iM2,p),1.); }`;
const FS_SHADOW = `#version 300 es
precision mediump float; void main(){}`;

// Sky: stars, galactic band, baked splat nebula cubemap, sun, gas giant with rings
const FS_SKY = `#version 300 es
precision highp float;
in vec2 vP; out vec4 o;
uniform mat4 uInvVP; uniform samplerCube uNeb;
uniform vec3 uSunDir, uSunCol, uPlanetDir, uPlanetAx, uRingN, uBandN;
uniform float uPlanetR, uPixAng, uTime, uNebGain, uStarGain;
${GLSL_NOISE}
vec3 stars(vec3 d){
  vec3 col=vec3(0.);
  for(int L=0;L<3;L++){
    float N = L==0?70.:(L==1?170.:380.);
    float dens = L==0?0.035:(L==1?0.018:0.006);
    vec3 c=floor(d*N); float h=h31(c+float(L)*17.);
    if(h>dens) continue;
    vec3 sp=c+0.25+0.5*vec3(h31(c+1.3),h31(c+2.7),h31(c+5.1));
    vec3 sd=normalize(sp);
    float ang=length(cross(sd,d));
    if(dot(sd,d)<0.) continue;
    float px=ang/uPixAng;
    float b=exp(-px*px*1.4);
    float mag=pow(h31(c+9.9),4.)*(L==0?10.:(L==1?4.:1.6))+(L==0?0.2:0.1);
    mag*=0.8+0.2*sin(uTime*(2.+h*30.)+h*80.);
    float t=h31(c+4.4);
    col+=mix(vec3(1.,0.62,0.38),vec3(0.62,0.78,1.),t)*b*mag;
  }
  return col;
}
void main(){
  vec4 pw=uInvVP*vec4(vP,1.,1.); vec3 d=normalize(pw.xyz/pw.w);
  vec3 col=stars(d)*uStarGain;
  float bd=dot(d,uBandN);
  float band=exp(-bd*bd/0.025)*(0.35+0.65*fbm3(d*6.))*smoothstep(0.25,0.6,fbm3(d*3.+5.));
  col+=mix(vec3(0.55,0.45,0.4),vec3(0.35,0.4,0.6),fbm3(d*2.))*band*0.07;
  vec4 neb=texture(uNeb,d);
  col=col*neb.a+neb.rgb*uNebGain;
  float sd=dot(d,uSunDir);
  col+=uSunCol*(smoothstep(0.99975,0.9999,sd)*60.+pow(max(sd,0.),900.)*4.+pow(max(sd,0.),60.)*0.25+pow(max(sd,0.),6.)*0.03);
  // gas giant
  vec3 C=uPlanetDir; float R=uPlanetR;
  float b=dot(d,C), c=1.-R*R, disc=b*b-c;
  float tp=1e9; vec3 pc=vec3(0.); float pa=0.;
  if(disc>0.&&b>0.){
    tp=b-sqrt(disc); vec3 P=d*tp; vec3 n=normalize(P-C);
    float lat=dot(n,uPlanetAx);
    float f=lat*10.+1.1*fbm3(n*3.2+uPlanetAx*lat*5.+vec3(uTime*0.004,0.,0.))+0.35*fbm3(n*11.);
    vec3 pcol=mix(vec3(0.78,0.62,0.44),vec3(0.42,0.27,0.17),0.5+0.5*sin(f));
    pcol=mix(pcol,vec3(0.92,0.86,0.74),smoothstep(0.55,0.95,sin(f*1.7+1.3))*0.6);
    vec3 spot=normalize(uPlanetAx*-0.35+normalize(cross(uPlanetAx,vec3(0.3,0.1,1.)))*0.94);
    float sp=length(n-spot); pcol=mix(pcol,vec3(0.75,0.3,0.15),smoothstep(0.16,0.06,sp)*0.8);
    float NL=dot(n,uSunDir);
    float dif=clamp(NL*1.1+0.08,0.,1.);
    float mu=max(dot(n,-d),0.);
    pc=pcol*uSunCol*0.85*dif+pcol*0.012;
    pc+=vec3(0.45,0.6,1.)*pow(1.-mu,3.)*clamp(NL+0.35,0.,1.)*0.9;
    pa=1.;
  } else {
    float dd=sqrt(max(0.,1.-b*b));
    if(b>0.){ vec3 side=normalize(d-C*b); float lit=clamp(dot(side,uSunDir)*0.8+0.3,0.,1.); col+=vec3(0.4,0.55,1.)*exp(-(dd-R)/(R*0.035))*0.5*lit; }
  }
  col=mix(col,pc,pa);
  // rings
  float den=dot(d,uRingN);
  if(abs(den)>1e-4){
    float tr=dot(C,uRingN)/den;
    if(tr>0.){
      vec3 P=d*tr; float rr=length(P-C)/R;
      float dens=smoothstep(1.35,1.42,rr)*smoothstep(2.35,2.22,rr)*(0.3+0.7*vn(vec3(rr*36.,0.,0.)))*(0.6+0.4*vn(vec3(rr*140.,1.,0.)));
      dens*=smoothstep(0.015,0.05,abs(rr-1.83));
      if(dens>0.001&&(tr<tp||pa<0.5)){
        vec3 v=P-C; float bb=dot(v,uSunDir), cc=dot(v,v)-R*R;
        float shd=(bb<0.&&bb*bb-cc>0.)?0.12:1.;
        vec3 rc=vec3(0.8,0.74,0.66)*uSunCol*(0.18+0.42*abs(dot(uRingN,uSunDir)))*shd;
        col=mix(col,rc,clamp(dens*0.75,0.,1.));
      }
    }
  }
  o=vec4(col,1.);
}`;

// Gaussian splats (48-byte records, SPLAT-GUIDE layout): centre, U, V, rgba8 colour, i8 normal (here: drift seed), u8 tier/flags/alpha/pad
const VS_SPLAT = `#version 300 es
precision highp float;
layout(location=0) in vec2 aQ; layout(location=1) in vec3 aC; layout(location=2) in vec3 aU; layout(location=3) in vec3 aV;
layout(location=4) in vec4 aCol; layout(location=5) in vec4 aNrm; layout(location=6) in vec4 aX;
uniform mat4 uVP; uniform vec3 uCam, uCR, uCU; uniform float uTime, uMode, uFar, uGain;
out vec2 vQ; out vec4 vC; flat out float vSeed;
void main(){
  vec3 c=aC, U=aU, V=aV;
  float flags=floor(aX.y*255.+0.5);
  float su=length(aU), sv=length(aV);
  if(mod(flags,2.)>0.5){ U=uCR*su; V=uCU*sv; }
  float a=aX.z;
  if(uMode<0.5){
    c+=aNrm.xyz*sin(uTime*0.12+aNrm.w*6.283)*su*0.25;
    float d=length(c-uCam); float s=max(su,sv);
    a*=smoothstep(s*0.45,s*1.7,d)*(1.-smoothstep(uFar*0.7,uFar,d));
    if(mod(floor(flags/2.),2.)>0.5) a*=0.55+0.45*sin(uTime*3.+aNrm.w*40.);
  }
  vQ=aQ; vSeed=float(gl_InstanceID%977); vC=vec4(aCol.rgb*uGain,a);
  if(a<=0.0005){ gl_Position=vec4(2.,2.,2.,1.); return; }
  gl_Position=uVP*vec4(c+U*aQ.x+V*aQ.y,1.);
}`;
const FS_SPLAT = `#version 300 es
precision highp float;
in vec2 vQ; in vec4 vC; flat in float vSeed; uniform float uAbsorb; out vec4 o;
void main(){
  float r2=dot(vQ,vQ); float ang=atan(vQ.y,vQ.x);
  r2*=1.14+0.2*sin(ang*3.+vSeed)+0.12*sin(ang*7.+vSeed*1.7);
  float g=exp(-r2*3.2)-0.035; if(g<=0.) discard;
  if(uAbsorb>0.5) o=vec4(0.,0.,0.,g*vC.a); else o=vec4(vC.rgb*g*vC.a,0.);
}`;

// dynamic particles: pos, axis (streak dir * len or 0), size, colour, (shape, rot)
const VS_PART = `#version 300 es
precision highp float;
layout(location=0) in vec2 aQ; layout(location=1) in vec3 aP; layout(location=2) in vec3 aAx; layout(location=3) in vec2 aSz; layout(location=4) in vec4 aCol; layout(location=5) in vec4 aExt;
uniform mat4 uVP; uniform vec3 uCam, uCR, uCU;
out vec2 vQ; out vec4 vC; flat out float vSh;
void main(){
  vec3 U, V;
  float al=length(aAx);
  if(al>1e-4){ vec3 ax=aAx/al; vec3 toC=normalize(uCam-aP); vec3 side=cross(ax,toC); float sl=length(side); side = sl>1e-4? side/sl : uCR; U=side*aSz.x; V=ax*(aSz.y+al*0.5); }
  else { float c=cos(aExt.y), s=sin(aExt.y); U=(uCR*c+uCU*s)*aSz.x; V=(-uCR*s+uCU*c)*aSz.y; }
  vQ=aQ; vC=aCol; vSh=aExt.x;
  gl_Position=uVP*vec4(aP+U*aQ.x+V*aQ.y,1.);
}`;
const FS_PART = `#version 300 es
precision highp float;
in vec2 vQ; in vec4 vC; flat in float vSh; out vec4 o;
void main(){
  float r2=dot(vQ,vQ); float g;
  if(vSh<0.5) g=exp(-r2*4.);
  else if(vSh<1.5){ float r=sqrt(r2); g=exp(-pow((r-0.78)*7.,2.))*step(r,1.); }
  else if(vSh<2.5) g=exp(-r2*10.)+0.25*exp(-r2*2.5);
  else { float ang=atan(vQ.y,vQ.x); r2*=1.1+0.25*sin(ang*3.+vC.a*7.); g=exp(-r2*3.)*0.8; }
  if(g<0.003) discard;
  o=vec4(vC.rgb*vC.a*g,0.);
}`;

// speed motes wrapped around the camera
const VS_MOTE = `#version 300 es
precision highp float;
layout(location=0) in vec2 aQ; layout(location=1) in vec4 aB;
uniform mat4 uVP; uniform vec3 uCam, uVel, uMoteCol; uniform float uBox;
out vec2 vQ; out vec3 vC;
void main(){
  vec3 rel=mod(aB.xyz-uCam,uBox)-uBox*0.5; vec3 p=uCam+rel; float d=length(rel);
  float fade=smoothstep(uBox*0.5,uBox*0.3,d)*smoothstep(1.5,6.,d);
  vec3 ax=-uVel*0.035; float sl=length(ax); vec3 dir= sl>0.01? ax/sl : vec3(0.,1.,0.);
  vec3 side=cross(dir,normalize(uCam-p)); float ss=length(side); side= ss>1e-4? side/ss : vec3(1.,0.,0.);
  float w=0.035+0.035*aB.w;
  gl_Position=uVP*vec4(p+side*w*aQ.x+dir*(w+sl*0.5)*aQ.y,1.);
  vQ=aQ; vC=uMoteCol*fade*(0.35+aB.w);
}`;
const FS_MOTE = `#version 300 es
precision highp float; in vec2 vQ; in vec3 vC; out vec4 o;
void main(){ float g=exp(-dot(vQ,vQ)*3.); o=vec4(vC*g,0.); }`;

const FS_DOWN = `#version 300 es
precision highp float; in vec2 vP; out vec4 o;
uniform sampler2D uTex; uniform vec2 uTexel; uniform float uFirst, uThresh;
vec3 S(vec2 uv){ return texture(uTex,uv).rgb; }
void main(){
  vec2 uv=vP*0.5+0.5, t=uTexel;
  vec3 a=S(uv+t*vec2(-2,2)), b=S(uv+t*vec2(0,2)), c=S(uv+t*vec2(2,2)), d=S(uv+t*vec2(-2,0)), e=S(uv), f=S(uv+t*vec2(2,0));
  vec3 g=S(uv+t*vec2(-2,-2)), h=S(uv+t*vec2(0,-2)), i=S(uv+t*vec2(2,-2)), j=S(uv+t*vec2(-1,1)), k=S(uv+t*vec2(1,1)), l=S(uv+t*vec2(-1,-1)), m=S(uv+t*vec2(1,-1));
  vec3 col=e*0.125+(a+c+g+i)*0.03125+(b+d+f+h)*0.0625+(j+k+l+m)*0.125;
  if(uFirst>0.5){ float br=max(col.r,max(col.g,col.b)); float soft=clamp(br-uThresh+0.5,0.,1.); soft=soft*soft*0.5; float w=max(soft,br-uThresh)/max(br,1e-4); col=min(col*w,vec3(80.)); }
  if(any(isnan(col))||any(isinf(col))) col=vec3(0.);
  o=vec4(col,1.);
}`;
const FS_UP = `#version 300 es
precision highp float; in vec2 vP; out vec4 o;
uniform sampler2D uTex; uniform vec2 uTexel; uniform float uRad, uW;
void main(){
  vec2 uv=vP*0.5+0.5, t=uTexel*uRad;
  vec3 s=texture(uTex,uv-t).rgb+2.*texture(uTex,uv+vec2(0.,-t.y)).rgb+texture(uTex,uv+vec2(t.x,-t.y)).rgb
   +2.*texture(uTex,uv+vec2(-t.x,0.)).rgb+4.*texture(uTex,uv).rgb+2.*texture(uTex,uv+vec2(t.x,0.)).rgb
   +texture(uTex,uv+vec2(-t.x,t.y)).rgb+2.*texture(uTex,uv+vec2(0.,t.y)).rgb+texture(uTex,uv+t).rgb;
  o=vec4(s/16.*uW,1.);
}`;
const FS_COMP = `#version 300 es
precision highp float; in vec2 vP; out vec4 o;
uniform sampler2D uScene, uBloom; uniform float uBloomStr, uExpo, uTime, uFlash, uCA, uVig, uGrain, uHasBloom; uniform vec3 uFlashCol; uniform vec2 uRes;
${GLSL_NOISE}
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.); }
void main(){
  vec2 uv=vP*0.5+0.5;
  vec3 c;
  if(uCA>0.){ vec2 d=(uv-0.5)*uCA*0.0035; c=vec3(texture(uScene,uv+d).r,texture(uScene,uv).g,texture(uScene,uv-d).b); }
  else c=texture(uScene,uv).rgb;
  if(uHasBloom>0.5) c+=texture(uBloom,uv).rgb*uBloomStr;
  if(any(isnan(c))||any(isinf(c))) c=vec3(0.);
  c*=uExpo;
  float r=length((uv-0.5)*vec2(uRes.x/uRes.y,1.));
  c*=1.-uVig*smoothstep(0.45,1.15,r);
  c+=uFlashCol*uFlash*smoothstep(0.2,0.95,r);
  c=aces(c);
  c=pow(c,vec3(1./2.2));
  c+=(h12(gl_FragCoord.xy+fract(uTime*7.)*100.)-0.5)*uGrain;
  o=vec4(c,1.);
}`;
