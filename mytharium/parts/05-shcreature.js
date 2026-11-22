
// ---------- creatures: skinned meshes (bone palette, two bones per vertex) ----------
// aExt = (bone0, bone1, weight0, region); aCol = (shade, palette mix, accent, ao); aUV = surface coords for patterns
// regions: 0 fur-skin · 1 hoof · 2 horn · 3 eye · 4 scales · 5 belly plates · 6 wing membrane · 7 human skin · 8 cloth
//          9 claw/spike/tooth · 10 muzzle · 11 beak · 12 fin · 13 lips/blush · 14 feather base · 15 nose (gnome)
const VS_SKIN=H+'#define VERTEX_STAGE\n'+C_UNI+`
uniform mat4 uBones[24];uniform float uClip;
in vec3 aPos;in vec3 aNor;in vec2 aUV;in vec4 aCol;in vec4 aExt;
out vec3 vW;out vec3 vN;out vec2 vUV;out vec4 vCol;flat out float vReg;out vec3 vO;
void main(){int b0=int(aExt.x+.5),b1=int(aExt.y+.5);float w0=aExt.z;mat4 M=uBones[b0]*w0+uBones[b1]*(1.-w0);
  vec3 pp=aPos;if(int(aExt.w+.5)==12)pp+=aNor*(sin(uTime*5.5+aUV.y*6.-abs(aUV.x)*.8)*.07+sin(uTime*9.+aUV.x*2.)*.02)*aCol.b*aCol.b;
  vec4 w=M*vec4(pp,1.);if(uClip>.5)w.xz=clamp(w.xz,uTmin.xz+.1,uTmax.xz-.1);vW=w.xyz;vN=normalize(mat3(M)*aNor);vUV=aUV;vCol=aCol;vReg=aExt.w;vO=pp;gl_Position=uVP*w;}`;
const FS_SKIN=H+C_UNI+C_FN+C_FS+`
uniform vec3 uC1;uniform vec3 uC2;uniform vec3 uC3;uniform vec3 uC4;uniform vec3 uHairC;uniform float uA2C;uniform float uGlow;uniform float uKind;uniform float uWetC;uniform float uBlink;uniform float uHurt;
in vec3 vW;in vec3 vN;in vec2 vUV;in vec4 vCol;flat in float vReg;in vec3 vO;out vec4 oC;
void main(){vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);if(!gl_FrontFacing)N=-N;int reg=int(vReg+.5);
  vec3 alb=mix(uC1,uC2,vCol.g)*(.8+.4*vCol.r);float rough=.6,spec=.06,trans=0.,ao=vCol.a,h=0.,fa=1.;vec3 emis=vec3(0.);vec3 R=reflect(-V,N);float c=max(dot(N,V),0.);
  if(reg==0){alb*=.95;rough=.62;spec=.08;h=vnoise(vO*30.)*.3;N=perturb(N,vW,h*.01);}
  else if(reg==1){alb=mix(vec3(.05,.045,.04),uC3,.25);rough=.3;spec=.35;float st=.5+.5*sin(vO.y*90.);alb*=.85+.15*st;}
  else if(reg==2){ // horn: pearly spiral, glows when it heals and at night
    float sp=fract(vUV.y*7.-vUV.x*1.);float gr=smoothstep(.0,.15,sp)*smoothstep(.5,.3,sp);alb=mix(uC3,vec3(1.,.97,.9),.5)*(.85+.25*gr);
    rough=.22;spec=.6;trans=.5;emis=film(c,.5+.2*vUV.y,1.45)*envColor(R)*1.6+uC3*uGlow*(1.2+.6*vUV.y)*(.8+.2*sin(uTime*3.));h=gr;N=perturb(N,vW,h*.006);}
  else if(reg==3){ // eye: dark iris, glossy cornea, catch-light; blinking lowers the lid
    vec3 ey=normalize(vO-vec3(vCol.r,vCol.g,vCol.b));float lid=step(1.-2.*uBlink,ey.y*.5+.5);
    float ir=smoothstep(.62,.55,length(vUV-.5)*2.);alb=mix(vec3(.01),uC4*.6,ir*.7);
    if(uKind>2.5||(uKind>.5&&uKind<1.5)){ // faerie and mermaid: white of the eye, a big coloured iris, pupil, dark upper lash line
      float rr=length(vUV-.5)*2.;float iris=smoothstep(.62,.55,rr),pup=smoothstep(.26,.21,rr);vec3 sc=vec3(.86,.84,.82);
      alb=mix(sc,uC4*(.75+.45*(1.-rr))*(.85+.2*sin(atan(vUV.y-.5,vUV.x-.5)*12.)),iris);alb=mix(alb,vec3(.01),pup);alb=mix(alb,vec3(.05,.03,.03),smoothstep(.42,.6,ey.y)*.92);ir=iris*(1.-pup);}
    else if(uKind>1.5){vec2 e=vUV-.5;float rr=length(e)*2.;float iris=smoothstep(.98,.9,rr);float slit=smoothstep(.075,.035,abs(e.x)/max(.15,1.-pow(e.y*2.,2.)))*smoothstep(.95,.7,rr);
      vec3 ic=mix(uC4*1.15,mix(uC4,vec3(1.,.55,.1),.5),smoothstep(.2,.9,rr))*(.8+.25*sin(atan(e.y,e.x)*18.+rr*6.));alb=mix(vec3(.03,.02,.01),ic,iris);alb=mix(alb,vec3(.006),slit);ir=iris*(1.-slit);}
    alb=mix(alb,uC1*.6,lid);rough=.03;spec=1.;
    emis=envColor(R)*.9*(1.-lid)+uLcol*pow(max(dot(R,uLdir),0.),400.)*3.*(1.-lid)+uC4*uGlow*.4*ir*(1.-lid);}
  else if(reg==4&&uKind>.5&&uKind<1.5){ // mermaid tail: small overlapping fish scales in staggered rows, free edges toward the fluke
    float yy=vUV.y;float ang=atan(vO.z,vO.x);vec2 sc=vec2(ang/6.2831853*24.,yy*17.+yy*yy*5.);float row=floor(sc.y);sc.x+=mod(row,2.)*.5;vec2 f=fract(sc);vec2 cell=floor(sc);
    float fw=length(fwidth(vO.xy))*16.;float sk=1.-smoothstep(.3,.8,fw);
    // each scale is a rounded tongue: lit crown near its root, a dark crescent where the next row tucks under it
    vec2 q=(f-vec2(.5,.35))*vec2(1.,1.15);float d=length(q);float rim=smoothstep(.36,.52,d)*smoothstep(.2,.6,f.y)*sk;vec2 tl=q*smoothstep(.6,.1,d);
    vec3 Tx=normalize(cross(N,vec3(0.,1.,0.))+1e-4);vec3 Ty=cross(Tx,N);N=normalize(N+(Tx*tl.x+Ty*tl.y)*sk*.5);h=(1.-rim)*sk;float hv=hash12(cell);
    float belly=smoothstep(-.3,.5,vO.x/max(.15,length(vO.xz)));vec3 base=mix(uC2,uC3,smoothstep(.1,1.,vCol.g)*.7+.3*belly)*(.9+.2*hv);
    alb=base*mix(.6,1.,belly)*(1.-rim*.5)*(.9+.15*h);
    // the scales thin out into skin at the waist: scattered single scales first, then bare skin
    float app=smoothstep(.02,.2,yy+(hv-.5)*.14);app*=mix(smoothstep(.5,.4,d),1.,smoothstep(.16,.3,yy));alb=mix(uC1,alb,app);rough=mix(.48,.24,app);spec=mix(.15,.6,app);float c2=max(dot(N,V),0.);
    float fr=pow(1.-c2,3.);emis=(envColor(R)*(.25+.9*fr)*mix(base*1.4,vec3(.6,.9,1.),.35)+film(c2,.36+.1*hv,1.5)*envColor(R)*.22
      +uLcol*pow(max(dot(N,normalize(uLdir+V)),0.),50.)*.5*mix(vec3(1.),base*2.,.5))*app;}
  else if(reg==4&&uKind>1.5){ // dragon: small pebbly scales with larger plates scattered among them, triplanar in bind space
    vec3 bn=normalize(cross(dFdx(vO),dFdy(vO)));vec3 aw=pow(abs(bn),vec3(4.));aw/=aw.x+aw.y+aw.z+1e-4;float k=13.;
    vec3 vx=vor2(vO.yz*k),vy=vor2(vO.xz*k),vz=vor2(vO.xy*k);float ed=(vx.y-vx.x)*aw.x+(vy.y-vy.x)*aw.y+(vz.y-vz.x)*aw.z;float rn=vx.z*aw.x+vy.z*aw.y+vz.z*aw.z;
    float f1=vx.x*aw.x+vy.x*aw.y+vz.x*aw.z;float fwd=length(fwidth(vO))*k;float sk=1.-smoothstep(.35,.9,fwd);
    h=smoothstep(.0,.26,ed)*(1.-f1*.7);float crev=mix(1.,smoothstep(.0,.09,ed),sk);
    // colour: dark maroon along the spine, bright on the flanks, mottled, each scale a slightly different shade with a pale worn crown
    float top=smoothstep(.1,.85,bn.y);float mot=vnoise(vO*1.7)*.6+vnoise(vO*4.3)*.4;vec3 base=mix(uC1,uC2,vCol.g);
    base=mix(base,base*vec3(.5,.36,.4),top*.7);base*=.72+.5*mot;base=mix(base,base*1.25+vec3(.04,.02,0.),smoothstep(.75,.95,rn)*.6);
    alb=base*(.7+.4*h*sk+.3*(1.-sk))*(.86+.28*rn)*mix(.32,1.,crev);rough=mix(.5,.4,h);spec=.2+.12*h;N=perturb(N,vW,h*sk*.012);
    emis=film(c,.45+.2*h,1.5)*envColor(R)*.06*uC3*crev;}
  else if(reg==4){ // scales: cell pattern, keeled, thin-film sheen
    vec2 su=vUV*vec2(26.,14.);su.x+=step(1.,mod(floor(su.y),2.))*.5;vec2 f=fract(su)-.5;float d=length(f*vec2(1.,1.3));
    h=smoothstep(.55,.0,d);float edge=smoothstep(.38,.5,d);alb=mix(uC1,uC2,vCol.g)*(.85+.2*h)*(1.-edge*.3);rough=.3;spec=.45;
    emis=film(c,.42+.25*vCol.b+.1*h,1.6)*envColor(R)*1.2*uC3+film(c,.42+.2*h,1.6)*uLcol*pow(max(dot(N,normalize(uLdir+V)),0.),30.)*.25*length(uC3);N=perturb(N,vW,h*.008);}
  else if(reg==5){vec2 su=vUV*vec2(4.,uKind>1.5?16.:22.);float f=fract(su.y);h=smoothstep(0.,.2,f)*smoothstep(1.,.75,f);alb=uC2*(.75+.3*h);rough=.45;spec=.2;N=perturb(N,vW,h*.006);
    emis=uC3*uGlow*h*.8;}
  else if(reg==6){ // wing membrane: translucent with veins
    float vein=clamp(smoothstep(.05,.0,.5-abs(fract(vUV.x*3.+vUV.y*1.5)-.5))*.8+smoothstep(.03,0.,.5-abs(fract(vUV.y*5.+vUV.x*.6)-.5))*.35,0.,1.);
    float mott=.75+.5*vnoise(vO*14.);alb=mix(uC1*.62+uC2*.14,uC1*.28,vein)*mott;trans=.85;rough=.5;spec=.15;emis=uC3*uGlow*.3*(1.-vein);
    float back=max(dot(V,-uLdir),0.);emis+=(uC1*.9+uC2*.5)*uLcol*pow(back,2.)*(1.-vein*.8)*.45*shadowAt(vW,-N)*mott;}
  else if(reg==7){ // skin: soft wrap lighting with a warm subsurface tint
    alb=uC1*(.95+.1*vnoise(vO*38.))*(.96+.08*vnoise(vO*9.));rough=.46;spec=.2;trans=.1;float bl=smoothstep(.7,1.,vCol.b);alb=mix(alb,alb*vec3(1.12,.72,.72),bl*.55);
    // light bleeds red through skin at the shadow edge; a soft sheen at grazing angles gives the form back
    float ndl=dot(N,uLdir);float scat=smoothstep(-.4,.15,ndl)*(1.-smoothstep(.15,.8,ndl));emis=alb*vec3(1.,.3,.18)*uLcol*scat*.12*shadowAt(vW,N)+uSky*pow(1.-c,3.)*.35*ao;}
  else if(reg==8){alb=uC3*(.8+.3*vnoise(vO*60.));rough=.85;h=vnoise(vO*120.)*.4;N=perturb(N,vW,h*.002);trans=.15;}
  else if(reg==9){alb=vec3(.85,.8,.68);rough=.35;spec=.3;if(uKind>1.5){float rg=.5+.5*sin(length(vO.xz-vec2(2.6,0.))*40.+vO.y*30.);alb=mix(vec3(.62,.46,.26),mix(uC2,vec3(.9,.82,.62),.5),.45)*(.8+.25*rg);rough=.4;}}
  else if(reg==10){alb=mix(uC1*.5,vec3(.42,.32,.33),.65);rough=.55;spec=.1;}
  else if(reg==11){alb=vec3(.9,.62,.18);rough=.3;spec=.5;}
  else if(reg==12){ // fin membrane: rays fanning from the root, clearer and more iridescent toward the free edge
    float e=vCol.b;float rays=smoothstep(.45,1.,abs(sin(vUV.x*7.)));float fw=fwidth(vUV.x*7.);rays=mix(rays,.35,smoothstep(.3,1.,fw));
    alb=mix(uC3*.9,uC3*.6+vec3(.25,.3,.3),e)*(.7+.35*rays);trans=1.;rough=.18;spec=.7;
    emis=film(c,.3+.45*e+.06*rays,1.42)*envColor(R)*(.5+.9*e)+uC3*uLcol*pow(max(dot(V,-uLdir),0.),3.)*.35*(1.-e*.5);
    fa=clamp(mix(.88,.3,smoothstep(.15,1.,e))*(.75+.35*rays)+.25*(1.-c),0.,1.);}
  else if(reg==13){alb=mix(uC1,vec3(.75,.35,.38),.55);rough=.4;spec=.2;}
  else if(reg==14){alb=uC2*.85;rough=.8;}
  else if(reg==15){alb=uC1*vec3(1.12,.82,.78);rough=.45;spec=.15;trans=.3;}
  else if(reg==16){float st=vnoise(vec3(vO.x*3.,vO.y*3.,vO.z*40.));alb=uHairC*(.62+.3*st);rough=.6;spec=.1;} // hair-coloured skin under manes and scalps
  if(uWetC>0.){alb*=1.-uWetC*.25;rough=mix(rough,.15,uWetC*.7);spec=mix(spec,.35,uWetC);}
  vec3 col=lighting(vW,N,V,alb,rough,spec,trans,ao)+emis;
  col+=uHurt*vec3(.3,0.,0.);
  if(uSel>.5){float rim=pow(1.-c,2.5);col+=vec3(.5,.9,.8)*rim*.5;}
  col=applyMist(col,vW);if(fa<.999){if(uA2C<.5){if(fa<fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715)))))discard;fa=1.;}}oC=vec4(col,fa);}`;
// ---------- faerie / insect wings: thin-film membranes with veins, drawn see-through ----------
const VS_WING=H+'#define VERTEX_STAGE\n'+C_UNI+`
uniform mat4 uModel;uniform float uClip;
in vec3 aPos;in vec3 aNor;in vec2 aUV;in vec4 aCol;in vec4 aExt;
out vec3 vW;out vec3 vN;out vec2 vUV;out vec4 vCol;
void main(){vec4 w=uModel*vec4(aPos,1.);if(uClip>.5)w.xz=clamp(w.xz,uTmin.xz+.1,uTmax.xz-.1);vW=w.xyz;vN=normalize(mat3(uModel)*aNor);vUV=aUV;vCol=aCol;gl_Position=uVP*w;}`;
const FS_WING=H+C_UNI+C_FN+`
uniform vec3 uC1;uniform vec3 uC2;uniform float uType;uniform float uGlow;
in vec3 vW;in vec3 vN;in vec2 vUV;in vec4 vCol;out vec4 oC;
void main(){vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);if(dot(N,V)<0.)N=-N;float c=max(dot(N,V),0.);vec2 u=vUV;
  float edge=smoothstep(.0,.06,vCol.r);float vein,cell;vec3 col;float a;
  if(uType<.5){ // dragonfly: dense polygon cells, clear with a rainbow film
    vec3 vv=vor2(u*vec2(16.,7.));vein=smoothstep(.06,.02,vv.y-vv.x)+smoothstep(.03,0.,abs(u.y-.18))*.8+smoothstep(.02,0.,abs(u.y-.5))*.6;
    vec3 f=film(c,.5+.25*u.x+.1*vv.z,1.4);col=f*envColor(reflect(-V,N))*2.2+f*uLcol*.12+uC1*.03;a=.18+.25*(1.-c)+vein*.5;}
  else if(uType<1.5){ // butterfly: scaled colour with eyespots and dark margins
    float r=length(u-vec2(.55,.5));float eye=smoothstep(.13,.1,length(u-vec2(.62,.58)));float ring=smoothstep(.2,.17,length(u-vec2(.62,.58)))-eye;
    vec3 base=mix(uC1,uC2,smoothstep(.3,.9,u.x+.2*sin(u.y*6.)));base=mix(base,vec3(.02),smoothstep(.85,.97,vCol.g));base=mix(base,uC2*1.4,ring);base=mix(base,vec3(.02),eye*.8);
    vein=smoothstep(.04,0.,.5-abs(fract(atan(u.y-.1,u.x)*5.)-.5));base*=1.-vein*.5;
    vec3 L=uLcol*max(dot(N,uLdir),0.)*.8+uSky*.9+uLcol*max(dot(-N,uLdir),0.)*.35;col=base*L+film(c,.3,1.5)*envColor(reflect(-V,N))*.25;a=.92;}
  else{ // moth: dusty velvet, soft and pale with a faint glow at night
    float f=fbm(vec3(u*9.,1.));vec3 base=mix(uC1,uC2,f)*(.8+.3*smoothstep(.4,.6,sin(u.x*20.+f*4.)));
    vec3 L=uLcol*max(dot(N,uLdir),0.)*.7+uSky+uLcol*max(dot(-N,uLdir),0.)*.4;col=base*L;a=.9;vein=0.;}
  col+=uC2*uGlow*(.6+.4*sin(uTime*2.+u.x*4.))*1.2;
  col+=pointLights(vW,N,V,uC1*.3,.2,.4,.6);
  a*=edge;col=applyMist(col,vW);oC=vec4(col*a,a);}`;
