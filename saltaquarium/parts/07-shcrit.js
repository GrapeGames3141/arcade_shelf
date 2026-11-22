
// ---------- critters (instanced): 0 shrimp, 1 snails, 2-5 food, 6 crabs, 7 sea stars, 8 urchins, 9 moon jelly, 10 upside-down jelly, 11 mantis shrimp ----------
const VS_CRIT=H+C_UNI+`
uniform int uKind;
in vec3 aPos;in vec3 aNor;in vec2 aUV;in vec4 aCol;in vec4 aExt;in vec4 iM0;in vec4 iM1;in vec4 iM2;in vec4 iM3;in vec4 iA;in vec4 iB;
out vec3 vW;out vec3 vN;out vec2 vUV;out vec4 vExt;out vec4 vB;out vec3 vO;
void main(){mat4 M=mat4(iM0,iM1,iM2,iM3);vec3 p=aPos,n=aNor;int part=int(aExt.x+.5);float t=uTime;
  if(uKind==0){float walk=iA.x,swim=iA.y,curl=iA.z;float code=floor(iA.w/20.);float walking=mod(code,2.),swimming=step(1.5,code),vr=iA.w-code*20.;
    if(part==1){float ph=walk+aExt.z;p.x+=sin(ph)*.03*aExt.y*walking;p.y+=max(0.,cos(ph))*.026*aExt.y*aExt.y*walking;p.x-=swimming*.05*aExt.y*aExt.y;p.y+=swimming*.03*aExt.y;}
    if(part==7){float ph=t*(4.5+vr*.4)+aExt.z;float pk=pow(.5+.5*sin(ph),3.)*(1.-walking*.7)*(1.-swimming);p.y+=pk*.035*aExt.y*aExt.y;p.x-=pk*.012*aExt.y;}
    if(part==2){float f=aExt.y*aExt.y;p.y+=sin(t*1.7+aExt.z+vr)*.05*f;p.z+=sin(t*1.1+aExt.z*2.+vr)*.07*f;}
    if(part==8){p.y+=sin(t*4.+aExt.z+vr)*.012*aExt.y;}
    if(part==3){float amp=.008+.03*swimming;p.x+=sin(t*(6.+12.*swimming)+aExt.z)*amp*aExt.y;}
    if(p.x<-.08){float a=-curl*clamp((-.08-p.x)/.4,0.,1.);vec2 r=vec2(p.x+.08,p.y-.17);float c=cos(a),s=sin(a);p.xy=vec2(-.08,.17)+vec2(r.x*c+r.y*s,-r.x*s+r.y*c);n.xy=vec2(n.x*c+n.y*s,-n.x*s+n.y*c);}}
  else if(uKind==3){p.y+=sin(t*3.+p.x*6.+iA.x)*.03*iA.y;}
  else if(uKind==1){if(part==2){p.y+=sin(t*1.3+iA.x)*.03*aExt.y;vec3 b0=vec3(.5,.09,sign(p.z)*.08);p=mix(p,b0,iA.y*.85);}if(part==1&&p.x>.38)p.x-=iA.y*.07;}
  else if(uKind==6){if(part==1){float ph=iA.x+aExt.z;p.y+=max(0.,sin(ph))*.07*aExt.y;p.x+=cos(ph)*.05*aExt.y;}if(part==2)p.y+=iA.y*.05*aExt.y;if(part==5&&aExt.z>.5)p.y+=sin(t*3.+aPos.z*20.)*.02*aExt.y;}
  else if(uKind==7){if(part==1||part==3){float pat=floor(iB.w+.01);float k=aExt.y*aExt.y;
      if(pat>2.5){float a=sin(t*1.6+aExt.z*2.1+iA.x)*.4*aExt.y+sin(iA.z*3.+aExt.z)*.3*aExt.y;float c=cos(a),s=sin(a);p.xz=vec2(p.x*c-p.z*s,p.x*s+p.z*c);p.y+=k*(.05+.04*sin(t*1.1+aExt.z*3.));}
      else{p.y+=k*(.02+.015*sin(t*.4+aExt.z*1.3+iA.x));float a=sin(iA.z*2.+aExt.z*1.7)*.05*aExt.y;float c=cos(a),s=sin(a);p.xz=vec2(p.x*c-p.z*s,p.x*s+p.z*c);}}}
  else if(uKind==8){if(part==1){float L=length(p-vec3(0.,.13,0.));float a=aExt.y*aExt.y;p.x+=sin(t*1.1+aExt.z*3.+iA.x)*.07*a*L;p.z+=cos(t*.8+aExt.z*2.+iA.x)*.07*a*L;}}
  else if(uKind==9){float ph=iA.x,c=ph<.32?sin(3.14159*ph/.32):0.;c=c*c*(3.-2.*c);
    if(part==0){float rr=aExt.y;p.xz*=1.-.22*c*pow(rr,1.2);p.y=p.y*(1.+.3*c)-.03*c*rr*rr;}
    else{float att=part==1?1.:.15;p.xz*=1.-.22*c*att;float tt=aExt.y;p.xz+=vec2(sin(t*1.3+aPos.x*9.+aPos.z*5.),cos(t*1.1+aPos.z*9.))*.05*tt;p.y+=c*.04*tt*(part==1?1.:0.)+.06*c*(1.-tt)*att;}}
  else if(uKind==10){float ph=iA.x,c=ph<.4?sin(3.14159*ph/.4):0.;if(part==0){float rr=aExt.y;p.y+=.06*c*rr*rr;p.xz*=1.-.06*c*rr;}else{p.xz+=vec2(sin(t*.9+aExt.z),cos(t*.7+aExt.z*1.3))*.015*aExt.y;}}
  else if(uKind==11){if(part==1){float ph=iA.x+aExt.z;p.y+=max(0.,sin(ph))*.012*aExt.y;p.x+=cos(ph)*.015*aExt.y;}
    if(part==2&&aExt.y>.5){float s=iA.z;p.x+=s*.17*(p.x-.38+.12);p.y+=s*.03;}
    if(part==4&&aExt.z>.5){p.y+=sin(t*2.3+aPos.z*12.)*.012*aExt.y;p.z+=sin(t*1.7+aPos.x*9.)*.01*aExt.y;}}
  vec4 w=M*vec4(p,1.);vW=w.xyz;vN=normalize(mat3(M)*n);vUV=aUV;vExt=aExt;if(uKind==1)vExt.w=iA.y;vB=iB;vO=p;gl_Position=uVP*w;}`;
const FS_CRIT=H+C_UNI+C_FN+C_FS+`
uniform int uKind;uniform sampler2D uScene;uniform vec2 uRes;uniform float uSee;in vec3 vW;in vec3 vN;in vec2 vUV;in vec4 vExt;in vec4 vB;in vec3 vO;out vec4 oC;
void main(){vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);if(dot(N,V)<0.)N=-N;int part=int(vExt.x+.5);
  vec3 alb=vB.rgb;float rough=.4,spec=.5,trans=.4,h=0.;float op=1.;vec3 tint=vec3(1.);float pat=floor(vB.a+.01),vr=fract(vB.a+.01)/.9;
  float hf=1.-smoothstep(.3,1.,length(fwidth(vO))*20.);
  if(uKind==0){ // shrimp: thin shell over clear tissue; pattern sets how much of the scene shows through
    float t=vUV.x,hy=vUV.y;vec3 clr=vec3(.6,.64,.62);rough=.26;spec=.85;trans=.6;
    const vec3 RED=vec3(.62,.02,.015),WH=vec3(.9,.88,.84);
    if(part==0||part==6){
      float sb=0.;const float SG[7]=float[7](.5,.565,.645,.725,.795,.855,1.);for(int i=0;i<6;i++)sb=max(sb,1.-smoothstep(.0015,.007,abs(t-SG[i])));if(part==6)sb=0.;
      if(pat<.5){ // skunk cleaner: white stripe down the middle of the back between two red bands, pale yellow sides
        float red=smoothstep(.4,.5,hy)*smoothstep(.97,.9,hy),wst=smoothstep(.9,.95,hy);alb=mix(vec3(.85,.62,.2),RED,red);alb=mix(alb,WH,wst);op=mix(.55,.95,max(red,wst));
        alb=mix(alb,vec3(.85,.7,.35),smoothstep(.0,-.5,hy)*.5);}
      else if(pat<1.5){ // fire shrimp: deep blood red with white spots
        alb=vec3(.5,.015,.012);float sp=smoothstep(.75,.82,vnoise(vec3(t*40.,hy*10.,vr*9.)))*hf;alb=mix(alb,WH,sp);op=.96;}
      else if(pat<2.5){ // peppermint: clear with thin red stripes along and around
        float ln=pow(.5+.5*sin(hy*22.),18.)+pow(.5+.5*sin(t*95.),24.)*.7;alb=mix(clr,RED*1.3,clamp(ln,0.,1.));op=mix(.28,.9,clamp(ln,0.,1.));}
      else{ // coral banded: white with broad red bands
        float bd=step(.5,fract(t*5.2+.3));alb=mix(WH,RED,bd);op=.92;float spn=smoothstep(.7,.8,vnoise(vec3(t*60.,hy*14.,1.)))*hf;h=spn*.004;}
      alb*=1.-sb*.3;op=max(op,sb*.65);
      if(part==6){op*=.8;alb=mix(alb,WH,.3);}}
    else if(part==1||part==7){float bnd=smoothstep(.45,.9,sin(vExt.y*19.+1.));alb=pat<.5?mix(WH,RED,.25*bnd):pat<1.5?mix(WH,RED,.15):pat<2.5?mix(clr,RED,.6*bnd):mix(WH,RED,step(.5,fract(vExt.y*4.)));op=pat<2.5?.6+.3*bnd:.92;
      if(part==7&&pat>2.5){alb=mix(WH,RED,step(.5,fract(vExt.y*5.)));op=.95;}}
    else if(part==2||part==8){alb=WH;op=.9;}
    else if(part==3){alb=mix(clr,pat<1.5?RED:clr,.4);op=.4;}
    else if(part==4){alb=pat<1.5?mix(RED,WH,step(.85,vnoise(vec3(vUV*12.,3.)))):pat<2.5?mix(clr,RED,.5):mix(WH,RED,.6);op=.8*mix(1.,.5,smoothstep(.65,1.,vExt.y));}
    else if(part==5){alb=vec3(.012);spec=1.7;rough=.06;op=1.;trans=0.;}}
  else if(uKind==1){
    if(part==0){float a=vUV.x*TAU,r=vUV.y;
      if(pat<.5){float w=a*21.+r*4.5+1.1*sin(r*9.+a*2.)+.6*vnoise(vec3(a*3.,r*6.,1.));float st=.5+.5*sin(w);float sw=.62+.12*vnoise(vec3(a*5.,r*9.,4.));
        vec3 gold=mix(vec3(.7,.46,.1),vec3(.44,.33,.08),smoothstep(.2,1.,r));alb=mix(gold,vec3(.03,.025,.015),smoothstep(sw,sw+.07,st));alb*=.92+.12*sin(r*140.);rough=.3;spec=.75;alb*=mix(.7,1.,smoothstep(0.,.2,r));}
      else if(pat<1.5){ // turbo: brown-green with growth lines, crusted with coralline and fuzz
        float gl=.5+.5*sin(r*160.+vnoise(vec3(a,r*8.,1.))*4.);alb=mix(vec3(.18,.15,.08),vec3(.34,.3,.18),gl*.6+.4*vnoise(vec3(a*3.,r*12.,2.)));
        float cor=smoothstep(.55,.75,fbm(vec3(cos(a)*2.,sin(a)*2.,r*6.)));alb=mix(alb,vec3(.55,.24,.42),cor*.6);rough=.7;spec=.2;h=gl*.02;}
      else if(pat<2.5){ // trochus: cream with oblique red-brown stripes, pearly near the aperture
        float st=step(.5,fract(a/TAU*9.+r*5.));alb=mix(vec3(.82,.76,.66),vec3(.5,.14,.08),st*.85);alb=mix(alb,vec3(.85,.82,.8),smoothstep(.12,.0,r)*.6);float rid=.5+.5*sin(r*120.);h=rid*.01;rough=.45;spec=.5;}
      else{float rid=.5+.5*sin(r*90.);alb=mix(vec3(.42,.38,.32),vec3(.6,.56,.5),rid*.5+.3*vnoise(vec3(a*4.,r*10.,1.)));h=rid*.015;rough=.5;spec=.4;}
      trans=.05;}
    else if(part==3){float rr=length(vUV-.5)*2.;alb=mix(vec3(.82,.78,.66),vec3(.6,.5,.3),smoothstep(.75,1.,rr));rough=.3;spec=.6;trans=.1;}
    else if(part==1){alb=(pat>.5&&pat<1.5?vec3(.2,.18,.15):vec3(.46,.45,.41))*(.9+.12*vnoise(vec3(vUV*18.,1.)));alb*=1.-.14*smoothstep(.74,.9,vnoise(vec3(vUV*95.,3.)));
      float pw=sin(vUV.x*34.-uTime*2.4);alb*=1.-.2*(1.-vExt.w)*smoothstep(.2,1.,pw)*smoothstep(.62,.2,abs(vUV.y)*2.)*smoothstep(-.42,-.2,vUV.x);trans=.5;rough=.55;spec=.35;}
    else{alb=vExt.z>.5?mix(vec3(.5,.48,.42),vec3(.15,.12,.1),step(.5,fract(vExt.y*6.))):vec3(.2,.2,.18)*(.85+.3*vnoise(vW*30.));trans=.45;rough=.5;}}
  else if(uKind==2){alb=vB.rgb*(.8+.4*vnoise(vW*20.));rough=.6;spec=.2;trans=.15;}
  else if(uKind==3){alb=vec3(.82,.7,.62)*(.8+.3*abs(sin(vUV.y*40.)));rough=.3;spec=.6;trans=.7;}
  else if(uKind==4){alb=vB.rgb*(.75+.4*vnoise(vW*6.));rough=.5;spec=.3;trans=.5;}
  else if(uKind==5){if(vB.w>.5){float rr=length(vO.xz)/.9;alb=mix(vec3(.008,.007,.006),vec3(.35,.32,.27),smoothstep(.55,1.,rr));rough=.95;spec=0.;}else{alb=vec3(.17,.16,.08)*(.8+.4*vnoise(vW*15.));rough=.8;spec=.1;trans=.1;}}
  else if(uKind==6){ // crabs
    if(part==4){float a=vUV.x*TAU,r=vUV.y;float gl=.5+.5*sin(r*150.+vnoise(vec3(a,r*8.,1.))*4.);alb=mix(vec3(.3,.2,.11),vec3(.62,.5,.34),gl*.45+.55*vnoise(vec3(a*3.,r*10.,2.)));float spt=smoothstep(.62,.72,vnoise(vec3(a*6.,r*22.,3.)));alb=mix(alb,vec3(.16,.09,.05),spt*.7);alb=mix(alb,vec3(.8,.74,.62),smoothstep(.7,.8,vnoise(vec3(a*7.,r*26.,9.)))*.5);
      alb=mix(alb,vec3(.55,.24,.42),smoothstep(.55,.75,fbm(vec3(cos(a)*2.,sin(a)*2.,r*6.)))*.6);rough=.6;spec=.3;h=gl*.02;trans=.05;}
    else if(pat<.5){alb=part==3?vec3(.9,.75,.1):part==5&&vExt.z<.5?vec3(.9,.7,.1):vec3(.6,.04,.025)*(.85+.3*vnoise(vO*40.));if(part==1)alb=mix(alb,vec3(.85,.8,.7),smoothstep(.85,.95,fract(vExt.y*2.6))*.6);rough=.35;spec=.6;trans=.3;}
    else if(pat<1.5){alb=part==3?vec3(.05):vec3(.04,.06,.15);if(part==1)alb=mix(alb,vec3(.85,.4,.05),smoothstep(.8,.95,fract(vExt.y*2.6)));if(part==2)alb=vec3(.08,.08,.12);rough=.35;spec=.6;trans=.2;}
    else{alb=vec3(.05,.13,.025)*(.75+.5*vnoise(vO*30.));if(part==2)alb=mix(alb,vec3(.6,.55,.4),smoothstep(.6,.95,vExt.y));if(part==3)alb=vec3(.4,.05,.03);if(part==0)h=vnoise(vO*60.)*.01;rough=.6;spec=.3;trans=.2;}}
  else if(uKind==7){ // sea stars: granular skin, species colours
    float gran=vnoise(vO*90.)*.6+vnoise(vO*200.)*.4;h=gran*.008*hf;
    if(pat<.5){alb=vec3(.02,.1,.55)*(.85+.3*gran);alb=mix(alb,vec3(.01,.04,.25),smoothstep(.72,.8,vnoise(vO*30.))*.6);rough=.55;spec=.3;}
    else if(pat<1.5){alb=vec3(.72,.1,.04)*(.85+.25*gran);alb=mix(alb,vec3(.15,.02,.02),smoothstep(.7,.78,vnoise(vO*50.))*.8);alb=mix(alb,vec3(.95,.5,.2),smoothstep(.75,1.,vExt.y)*.4);rough=.6;spec=.25;}
    else if(pat<2.5){alb=vec3(.58,.5,.38)*(.85+.3*gran);alb=mix(alb,vec3(.22,.2,.17),smoothstep(.55,.7,fbm(vO*8.))*.7);if(part==2)alb=vec3(.8,.75,.62);rough=.8;spec=.15;}
    else{alb=mix(vec3(.38,.3,.24),vec3(.12,.09,.08),step(.5,fract(vExt.y*14.)))*(.85+.25*gran);if(part==3)alb=vec3(.7,.65,.58);if(part==0)alb=mix(vec3(.4,.32,.25),vec3(.1),step(.7,vnoise(vO*40.)));rough=.6;spec=.25;}
    trans=.25;}
  else if(uKind==8){ // urchins
    if(part==0){float a=atan(vO.z,vO.x);float sec=fract(a/TAU*10.+.5);
      if(pat<.5){alb=mix(vec3(.05,.25,.4),vec3(.02,.015,.02),step(.5,sec));alb=mix(alb,vec3(.5,.08,.06),step(.85,sec)*.6);}else{alb=vec3(.012);float sp=smoothstep(.9,.97,vnoise(vO*25.))*step(.3,vO.y);alb=mix(alb,vec3(.1,.5,.9),sp*.8);}
      rough=.4;spec=.5;h=vnoise(vO*70.)*.01*hf;}
    else if(part==1){alb=pat<.5?vec3(.03,.025,.03):mix(vec3(.01),vec3(.08,.05,.1),vExt.y);rough=.25;spec=.9;trans=.1;}
    else{alb=vec3(.2,.15,.18);trans=.4;}}
  else if(uKind==9){ // moon jelly: almost clear bell, four lilac horseshoe gonads, faint radial canals, whitish fringe and frilly oral arms
    if(part==0){float rr=vUV.x,an=vUV.y*TAU;float ring=smoothstep(.07,.03,abs(rr-.3))*step(.18,abs(fract(an/TAU*4.+.125)-.5)*2.);float can=pow(.5+.5*cos(an*16.),30.)*smoothstep(.15,.4,rr);
      alb=mix(vec3(.75,.82,.9),vec3(.75,.5,.85),ring);op=.08+ring*.55+can*.12+smoothstep(.9,1.,rr)*.15;}
    else if(part==1){alb=vec3(.85,.88,.92);op=.3;}else{alb=vec3(.82,.86,.95);op=.24+.1*sin(vUV.y*40.);}
    rough=.15;spec=1.;trans=.9;}
  else if(uKind==10){ // upside-down jelly: olive-brown bell with pale radial bands; frilly oral arms with white and blue-green vesicles
    if(part==0){float an=vUV.y*TAU,rr=vUV.x;alb=mix(vec3(.25,.22,.1),vec3(.62,.6,.42),pow(.5+.5*cos(an*16.),4.)*smoothstep(.2,.6,rr));alb=mix(alb,vec3(.15,.12,.06),smoothstep(.15,.0,rr));}
    else if(part==3){alb=vr>.5?vec3(.75,.8,.75):vec3(.15,.45,.5);}else{alb=vec3(.3,.28,.13)*(.8+.4*vnoise(vO*30.));}
    rough=.5;spec=.4;trans=.5;}
  else if(uKind==11){ // peacock mantis shrimp
    float t=vUV.x;
    if(part==0){if(t<.3){alb=vec3(.25,.35,.08);float lp=smoothstep(.65,.72,vnoise(vO*60.));float rg=smoothstep(.78,.72,vnoise(vO*60.))*lp;alb=mix(alb,vec3(.8,.7,.45),lp);alb=mix(alb,vec3(.06,.04,.02),(lp-rg)*.0+smoothstep(.62,.66,vnoise(vO*60.))*(1.-lp)*.7);}
      else if(t<.86){float s=fract((t-.3)/.56*6.);alb=mix(vec3(.08,.38,.12),vec3(.04,.22,.08),smoothstep(.3,.8,s));alb=mix(alb,vec3(.1,.5,.7),smoothstep(.88,.97,s));alb=mix(alb,vec3(.5,.55,.3),smoothstep(-.2,-.7,vUV.y)*.5);}
      else{alb=vec3(.12,.4,.12);alb=mix(alb,vec3(.8,.3,.05),smoothstep(.93,.99,t));}
      rough=.35;spec=.6;trans=.2;h=vnoise(vO*120.)*.006*hf;}
    else if(part==1){alb=vec3(.7,.1,.04);rough=.4;spec=.5;}
    else if(part==2){alb=mix(vec3(.75,.12,.04),vec3(.85,.45,.1),vExt.y);alb=mix(alb,vec3(.05,.02,.02),smoothstep(.72,.78,vnoise(vO*70.))*.7);rough=.35;spec=.6;}
    else if(part==3){float mb=smoothstep(.16,.1,abs(vUV.x));alb=mix(vec3(.75,.35,.45),vec3(.15,.55,.6),smoothstep(.3,.7,abs(vUV.x)));alb=mix(alb,vec3(.05),mb*.8);alb=mix(alb,vec3(.9,.9,.85),pow(.5+.5*sin(vUV.x*60.),8.)*mb*.5);rough=.1;spec=1.4;trans=0.;}
    else if(part==4){alb=vExt.z>.5?vec3(.75,.3,.1):vec3(.9,.45,.35);trans=.5;}
    else{alb=mix(vec3(.85,.35,.08),vec3(.05,.15,.5),smoothstep(.5,.9,vExt.y));trans=.4;}}
  if(h!=0.)N=perturb(N,vW,h);
  vec3 col=lighting(vW,N,V,alb,rough,spec,trans,1.);
  if(uKind==9&&inWater(vW)){float fr=pow(1.-max(dot(N,V),0.),2.);col+=vec3(.6,.7,.85)*fr*(uAmb*.6+uLcol*.08)*1.5;op=clamp(op+fr*.25,0.,1.);}
  col=applyWater(col,vW);
  if((uKind==0||uKind==9)&&uSee>.5&&op<.999){ // see-through: blend with the scene behind, tinted by the tissue, bent slightly by the surface
    vec3 Rt=normalize(cross(vec3(0.,1.,0.),V)+1e-5),Up=cross(V,Rt);vec2 off=vec2(dot(N,Rt),dot(N,Up))*(uKind==9?.012:.006);
    vec3 bh=texture(uScene,clamp(gl_FragCoord.xy/uRes+off,vec2(.001),vec2(.999))).rgb;float fr=pow(1.-max(dot(N,V),0.),2.);
    col=mix(bh*mix(vec3(1.),alb*1.5+.08,uKind==9?.15:.55)*tint,col,clamp(op+fr*.3,0.,1.));}
  oC=vec4(col,1.);}`;
