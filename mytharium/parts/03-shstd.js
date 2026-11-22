
// ---------- standard surfaces: terrain, rock, wood, cork, tank hardware, room, decor ----------
const VS_STD=H+'#define VERTEX_STAGE\n'+C_UNI+`
uniform mat4 uModel;uniform mat3 uNmat;uniform float uOS;
in vec3 aPos;in vec3 aNor;in vec2 aUV;in vec4 aCol;in vec4 aExt;
out vec3 vW;out vec3 vN;out vec2 vUV;out vec4 vCol;out vec4 vExt;out vec3 vO;
void main(){vec4 w=uModel*vec4(aPos,1.);vW=w.xyz;vN=normalize(uNmat*aNor);vUV=aUV;vCol=aCol;vExt=aExt;vO=aPos*uOS;gl_Position=uVP*w;}`;
// Two builds of one shader: the plain one has no cut-outs, so the depth test can reject hidden pixels before any shading
// (nearly everything uses it); CUTOUT adds the ones the perforated lid needs.
const FS_STD_BODY=C_UNI+C_FN+C_FS+`
uniform int uMat;uniform float uClip;uniform float uA2C;uniform float uVar;uniform vec3 uTint;uniform float uRough;uniform float uSeed;uniform float uGlow;uniform float uWetK;
in vec3 vW;in vec3 vN;in vec2 vUV;in vec4 vCol;in vec4 vExt;in vec3 vO;out vec4 oC;
// coco-coir soil: fibrous dark brown with crumbs
vec3 soilAlb(vec3 P,out float h){float f=fbm(P*vec3(1.6,1.6,1.6));vec3 v=vor2(P.xz*2.6+P.y*.3);float crumb=smoothstep(.32,.0,v.x)*.6;
  float fib=smoothstep(.6,.95,vnoise(vec3(P.x*9.,P.z*1.6,P.y*3.)))*.4+smoothstep(.6,.95,vnoise(vec3(P.z*8.,P.x*1.4,P.y*3.+4.)))*.4;
  h=crumb*.5+fib*.25+f*.6;vec3 a=mix(vec3(.068,.042,.026),vec3(.13,.085,.05),f);a=mix(a,vec3(.18,.12,.07),fib*.45);a*=.8+.4*v.z*crumb;return a;}
vec3 sandAlb(vec3 P,out float h){float g=hash12(floor(P.xz*22.))*.5+hash12(floor(P.xz*47.+3.))*.5;float f=fbm(P*.9);h=g*.25+f*.4;
  return mix(vec3(.33,.25,.16),vec3(.48,.38,.26),f)*(.8+.3*g);}
vec3 gravelAlb(vec3 P,out float h){vec3 v=vor2(P.xz*3.4+vec2(P.y));float r=smoothstep(.6,.2,v.x);h=r*.7;vec3 c=mix(vec3(.2,.18,.16),vec3(.36,.33,.29),v.z);c=mix(c,vec3(.27,.2,.15),step(.72,v.z));c=mix(c,vec3(.12,.12,.12),step(.9,v.z));return mix(vec3(.05,.04,.035),c,smoothstep(0.,.3,r));}
// clay drainage balls (LECA) seen in the cross-section, then the mesh, the soil, the litter on top
vec3 sectionAlb(vec3 P,float top,out float h,out float rough){float y=P.y;float u=P.x+P.z;
  if(y<3.6){vec3 v=vor2(vec2(u,y)*1.25+vec2(0.,3.));float r=1.-smoothstep(.25,.52,v.x);h=sqrt(max(r,0.))*1.4;rough=.8;
    vec3 c=mix(vec3(.36,.17,.09),vec3(.55,.28,.15),v.z)*(.65+.5*r);return mix(vec3(.025,.015,.01),c,smoothstep(0.,.12,r));}
  if(y<4.0){float g=step(.5,fract(u*4.))*step(.5,fract(y*14.));h=g*.2;rough=.6;return mix(vec3(.02),vec3(.06,.06,.055),g);}
  float hs;vec3 s=soilAlb(vec3(u,y*1.3,u*.37),hs);float root=smoothstep(.04,0.,abs(vnoise(vec3(u*.6,y*.25,7.))-.5-.03*sin(y*3.)))*.6;
  s=mix(s,vec3(.32,.24,.16),root);float dt=top-y;if(dt<.7){float lit=fbm(vec3(u*3.,y*4.,1.));s=mix(s,mix(vec3(.16,.12,.05),vec3(.09,.16,.05),lit),smoothstep(.7,.2,dt));}
  // moisture darkens the bottom of the soil
  s*=mix(.65,1.,smoothstep(4.,9.,y));h=hs;rough=.9;return s;}
void main(){
#ifdef CUTOUT
  if(uClip>.5&&(vW.x<uTmin.x||vW.x>uTmax.x||vW.z<uTmin.z||vW.z>uTmax.z||vW.y>uTmax.y+.5))discard;
#endif
  vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);if(!gl_FrontFacing)N=-N;
  vec3 alb=uTint;float rough=uRough,spec=.04,trans=0.,ao=1.,h=0.;vec3 emis=vec3(0.);float aOut=1.;
  if(uMat==1){ // terrain: soil, sand, gravel, moss and grass bases blended from vertex weights
    if(vExt.x>.5){alb=sectionAlb(vW,vExt.y,h,rough);N=perturb(N,vW,h*.05);}
    else{float hs=0.,hd=0.,hg=0.;vec3 s=vec3(.09,.06,.035),d=vec3(0.),g=vec3(0.);
      vec4 w=vCol;float n=fbm(vW*.35);w.z=clamp(w.z+(n-.5)*.6*w.z,0.,1.);float soil=max(1.-w.x-w.y-w.z-w.w,0.);
      // only work out the covers that are actually here: bare soil shows through thin moss and grass, not under thick cover
      if(soil+(w.x+w.y)*.5>.2)s=soilAlb(vW,hs);else hs=n;if(w.z>.01)d=sandAlb(vW,hd);if(w.w>.01)g=gravelAlb(vW,hg);
      vec3 moss=mix(vec3(.05,.07,.025),vec3(.09,.12,.035),n);vec3 grass=mix(vec3(.07,.06,.03),vec3(.08,.10,.04),n);
      alb=(s*soil+d*w.z+g*w.w+moss*w.x+grass*w.y)/max(soil+w.x+w.y+w.z+w.w,1e-3);h=hs*soil+hd*w.z+hg*w.w+hs*(w.x+w.y);
      float wet=clamp(vExt.y+uWetK*.35,0.,1.);alb*=1.-wet*.42;rough=mix(.95,.42,wet*(1.-w.x));spec=mix(.03,.12,wet);
      N=perturb(N,vW,h*.08);
      float pd=pondDepth(vW);if(pd>0.){alb=mix(alb,vec3(.06,.08,.035),smoothstep(.5,4.,pd)*.6);rough=.6;}
      ao=mix(1.,.55,w.x*.8+w.y*.6);}}
  else if(uMat==2){ // rock: granite / slate / river stone / lava, wet where the mist or the pond reach
    float v=uVar;vec3 P=vO*.9+uSeed;float f=fbm(P*.55),f2=fbm(P*2.3);
    if(v<.5){alb=mix(vec3(.17,.16,.15),vec3(.33,.31,.28),f);float sp=step(.86,hash13(floor(P*9.)));alb=mix(alb,vec3(.09),sp*.6);h=f*.6+f2*.4+sp*.1;}
    else if(v<1.5){float lay=sin(P.y*5.+f*5.);alb=mix(vec3(.13,.14,.15),vec3(.25,.25,.26),f2)*(.85+.2*lay);h=lay*.15+f2*.5;rough=.75;}
    else if(v<2.5){alb=mix(vec3(.24,.22,.19),vec3(.42,.39,.34),f);alb=mix(alb,vec3(.42,.38,.3)*.7,smoothstep(.5,.7,f2)*.5);h=f2*.25;rough=.55;}
    else{vec3 vv=vor2(P.xz*1.8+P.y);alb=mix(vec3(.06,.05,.05),vec3(.16,.12,.1),f2);h=vv.x*.6+f2*.4;rough=.85;
      // ember rock: glowing fissures that pulse slowly
      float crack=smoothstep(.08,0.,vv.y-vv.x)*smoothstep(.3,.7,fbm(P*1.3));emis=vec3(1.,.32,.06)*crack*uGlow*(.7+.3*sin(uTime*1.7+vv.z*6.));}
    // moss on the upper faces of damp stones
    float mz=smoothstep(.55,.85,N.y)*smoothstep(.5,.65,fbm(P*.8+3.))*clamp(vCol.a+uWetK*.4,0.,1.);alb=mix(alb,vec3(.06,.11,.03),mz);h+=mz*.3;
    N=perturb(N,vW,h*.35);float wet=clamp(uWetK*.6+pondDepth(vW+vec3(0.,.4,0.))*2.,0.,1.);alb*=1.-wet*.35;rough=mix(rough,.25,wet);spec=mix(.04,.25,wet);ao=vCol.r;}
  else if(uMat==3){ // weathered driftwood / bonsai bark
    vec3 P=vO;float g=sin((vUV.x*40.+fbm(P*1.2)*6.)*1.);float f=fbm(vec3(vUV.x*30.,vUV.y*4.,uSeed));
    if(uVar<.5){alb=mix(vec3(.33,.28,.22),vec3(.58,.52,.43),f)*(.85+.15*g);h=g*.3+f*.5;rough=.8;}
    else{float pl=smoothstep(.4,.7,vnoise(vec3(vUV.x*18.,vUV.y*3.,uSeed)));alb=mix(vec3(.16,.11,.08),vec3(.27,.2,.14),f)*(.8+.2*g);alb=mix(alb,vec3(.1,.13,.06),pl*.4);h=g*.4+pl*.3;rough=.9;}
    N=perturb(N,vW,h*.25);ao=vCol.r;}
  else if(uMat==4){ // cork bark background panel with damp crevices
    vec3 P=vW;float f=fbm(P*vec3(.25,.12,.25));float r=fbm(P*vec3(1.4,.5,1.4));float cr=smoothstep(.45,.2,abs(r-.5));
    alb=mix(vec3(.13,.085,.052),vec3(.36,.25,.15),f)*mix(.55,1.,cr);alb=mix(alb,vec3(.05,.09,.03),smoothstep(.55,.8,fbm(P*.3+5.))*.7);
    h=r*.8+f*.4;N=perturb(N,vW,h*.6);rough=.92;ao=mix(.55,1.,cr)*vCol.r;}
  else if(uMat==5){alb=vec3(.02,.021,.023);rough=.35;spec=.4;} // black anodised frame
  else if(uMat==6){ // perforated lid screen
    vec2 q=vec2(vW.x,vW.z)*2.2;vec2 g=fract(q);float wire=1.-step(.22,min(g.x,g.y));float fw=max(fwidth(q.x),fwidth(q.y));aOut=mix(wire,.42,smoothstep(.25,.7,fw));

#ifdef CUTOUT
    if(uA2C<.5){if(aOut<.5)discard;aOut=1.;}else if(aOut<.02)discard;
#endif
    alb=vec3(.03);rough=.5;spec=.2;}
  else if(uMat==7){ // room: painted wall, wooden floor
    if(vCol.b>.5){ // rug: a deep red field, a pale medallion and patterned borders
      vec2 q=vec2((vW.x)/95.,(vW.z-10.)/65.);vec2 a=abs(q);float bd=max(a.x,a.y);float m=length(q*vec2(1.,1.4));float ang=atan(q.y,q.x);
      vec3 red=vec3(.32,.05,.04),navy=vec3(.05,.06,.14),cream=vec3(.6,.5,.34);alb=red*(.85+.15*fbm(vec3(vW.xz*.4,1.)));
      float border=smoothstep(.86,.87,bd)*smoothstep(.97,.96,bd);float pat=step(.5,fract((a.x>a.y?q.y:q.x)*18.+.25*sin(bd*40.)));alb=mix(alb,mix(navy,cream,pat*.6),border);
      alb=mix(alb,navy,smoothstep(.975,.98,bd));alb=mix(alb,cream*.8,smoothstep(.83,.84,bd)*smoothstep(.86,.85,bd));
      float med=smoothstep(.32,.3,m*(1.+.12*cos(ang*8.)));alb=mix(alb,mix(navy,cream,.3+.3*sin(m*38.+cos(ang*8.)*2.5)),med);alb*=.75+.25*smoothstep(.0,.2,abs(sin(vW.x*3.)*sin(vW.z*3.)));
      rough=.95;spec=.02;}
    else if(vCol.g>.5){float pl=floor(vW.x/14.);float f=fbm(vec3(vW.x*.05,pl*3.1,vW.z*.6));alb=mix(vec3(.24,.15,.08),vec3(.38,.25,.14),f)*(.85+.15*hash12(vec2(pl,1.)));rough=.5;spec=.08;}
    else if(vW.y<-6.){ // wainscot: dark oak panels with a dado rail
      vec2 w=vec2(abs(N.z)>.5?vW.x:vW.z,vW.y);float px=fract(w.x/34.),py=fract((w.y+80.)/37.);float fr=step(.08,px)*step(px,.92)*step(.1,py)*step(py,.9);
      alb=mix(vec3(.09,.05,.03),vec3(.16,.09,.05),fbm(vec3(w*.08,2.)))*(fr>.5?1.08:.8);float dado=smoothstep(-7.8,-8.,vW.y)*smoothstep(-11.,-10.6,vW.y);alb=mix(alb,vec3(.2,.11,.06),dado);rough=.45;spec=.12;}
    else{vec2 w=vec2(abs(N.z)>.5?vW.x:vW.z,vW.y)*.11;vec2 cel=fract(w)-.5;float dm=smoothstep(.36,.3,length(cel*vec2(1.,.75))*(1.+.25*cos(atan(cel.y,cel.x)*6.)));
      alb=mix(vec3(.18,.2,.17),vec3(.24,.26,.21),dm*.6)*(.95+.05*fbm(vW*.08));rough=.9;}}
  else if(uMat==8){ // lamp hardware: LED bar diffuser, heat-lamp dome and bulb
    if(vCol.r>.5){alb=vec3(.9);emis=uLcol*.55;}else if(vCol.g>.5){alb=vec3(.8);emis=uHeatC*.06;}else{alb=vec3(.05);rough=.3;spec=.5;}}
  else if(uMat==9){ // carved mahogany stand: grain along each board, a deep French polish, fluting, relief carving, brass
    vec3 P=vW;ao=vCol.a;
    if(vCol.b>.5){alb=vec3(.78,.55,.22)*(.85+.2*fbm(P*2.));rough=.22;spec=1.4;vec3 R=reflect(-V,N);emis=envColor(R)*vec3(.9,.66,.32)*.5;}
    else{float ax=vCol.r;float l=ax<.25?P.x:ax>.75?P.y:P.z;float cc=ax<.25?P.y*1.3+P.z*.7:ax>.75?P.x*.8+P.z:P.x+P.y*1.3;
      float fig=fbm(vec3(l*.03,cc*.35,7.));float ring=sin(cc*2.6+fig*7.+sin(l*.05)*2.);float pore=smoothstep(.62,.9,vnoise(vec3(l*.35,cc*24.,3.)));
      alb=mix(vec3(.11,.04,.02),vec3(.3,.12,.05),smoothstep(-.6,.9,ring*.6+fig*.8))*(1.-pore*.25);rough=.3;spec=.34;
      vec2 pl=abs(N.z)>abs(N.x)?vec2(P.x,P.y):vec2(P.z,P.y);
      if(vCol.g>.25&&vCol.g<.75&&abs(N.y)<.5){float fl=pl.x*1.65;float u=abs(fract(fl)-.5)*2.;h=sqrt(max(1.-u*u,0.));float cap=smoothstep(-13.4,-14.4,P.y)*smoothstep(-54.5,-53.5,P.y);h*=cap;
        vec3 Tg=abs(N.z)>abs(N.x)?vec3(1.,0.,0.):vec3(0.,0.,1.);N=normalize(N-Tg*sign(fract(fl)-.5)*(1.-u)*1.2*cap);alb*=mix(1.,.62,(1.-h)*cap);}
      if(vCol.g>.75&&abs(N.y)<.6){ // relief: scrolling acanthus on the frieze and apron, a medallion on each raised panel
        float u=pl.x,v=pl.y;float vine=abs(sin(u*.62+1.7*sin(v*1.4+u*.21)));float leaf=smoothstep(.0,.6,vine)*(.55+.45*sin(u*2.3+v*3.1));
        float band=P.y>-12.?1.:P.y<-60.?1.:0.;vec2 mc=vec2(u-(abs(N.z)>abs(N.x)?sign(u)*30.4:0.),v+34.);float rr=length(mc*vec2(1.,1.15));float ang=atan(mc.y,mc.x);
        float med=(1.-band)*(smoothstep(7.5,6.8,rr)*(.5+.5*cos(ang*10.+rr*.6))*smoothstep(1.2,2.5,rr)+smoothstep(1.6,1.1,rr)+smoothstep(9.2,8.8,rr)*smoothstep(8.2,8.6,rr));
        h=clamp(band*leaf+med,0.,1.);N=perturb(N,vW,h*.22);alb*=mix(.5,1.08,h);rough=mix(.38,.24,h);}}}
  else if(uMat==24){alb=uTint;}
  else if(uMat==10){ // crystal: amethyst points rising from a dark geode rind
    vec3 P=vO;if(vCol.g>.5){alb=vec3(.20,.16,.13)*(.7+.5*fbm(P*3.));rough=.85;h=fbm(P*6.);N=perturb(N,vW,h*.2);}
    else{vec3 R=reflect(-V,N);float fr=.04+.96*pow(1.-max(dot(N,V),0.),5.);vec3 base=mix(vec3(.30,.12,.55),vec3(.75,.55,.95),vCol.b);
      alb=base*.35;spec=.9;rough=.08;emis=base*(.08+.5*pow(max(dot(N,uLdir),0.),3.))*lum(uLcol)*.4+base*uGlow*.6;emis+=envColor(R)*fr*2.;
      emis+=uLcol*pow(max(dot(R,uLdir),0.),300.)*1.5;}}
  else if(uMat==11){ // mushrooms: cap (vCol.r), gills (vCol.g), stem; glowing species carry uGlow
    vec3 P=vO;if(vCol.r>.5){float sp=smoothstep(.12,.06,vor2(vUV*vec2(9.,5.)).x)*step(.5,uVar);alb=mix(uTint,vec3(.92,.88,.8),sp);rough=.4;spec=.15;trans=.3;
        emis=uTint*uGlow*(.6+.4*fbm(P*4.+uTime*.2))*uNight*3.2;emis+=vec3(.95,.9,.8)*sp*uGlow*uNight*.4;}
      else if(vCol.g>.5){float gl=.5+.5*sin(atan(vO.z,vO.x)*60.);alb=mix(uTint*.5,vec3(.85,.78,.66),.6)*(.75+.25*gl);emis=uTint*uGlow*uNight*.9*gl;}
      else{alb=vec3(.82,.78,.68)*(.85+.15*fbm(P*5.));trans=.2;emis=uTint*uGlow*uNight*.15;}}
  else if(uMat==12){ // masonry: ruins and tower
    vec3 P=vO;vec2 bq=vec2(vUV.x*6.,vUV.y*4.);bq.x+=step(1.,mod(floor(bq.y),2.))*.5;vec2 f2=fract(bq);float mortar=smoothstep(.06,.0,min(min(f2.x,1.-f2.x)*.7,min(f2.y,1.-f2.y)));
    float f=fbm(P*1.5+floor(bq).xyx*.37);alb=mix(vec3(.42,.40,.36),vec3(.62,.6,.55),f)*(1.-mortar*.55);alb=mix(alb,vec3(.07,.12,.04),smoothstep(.6,.85,fbm(P*.7+2.))*.7*smoothstep(.2,.8,N.y+.3));
    h=f*.4-mortar*.5;N=perturb(N,vW,h*.15);rough=.9;ao=vCol.r;}
  else if(uMat==13){ // mushroom cottage: spotted cap, plaster wall, wooden door, glowing windows at night
    vec3 P=vO;if(vCol.r>.5){float sp=smoothstep(.16,.10,vor2(vUV*vec2(7.,4.)).x);alb=mix(vec3(.55,.06,.04),vec3(.93,.9,.84),sp);rough=.45;spec=.12;}
    else if(vCol.g>.5){alb=vec3(.85,.8,.68)*(.85+.15*fbm(P*3.));rough=.95;}
    else if(vCol.b>.5){float pl=step(.5,fract(vUV.x*5.));alb=mix(vec3(.25,.14,.07),vec3(.33,.2,.1),pl);rough=.7;}
    else{alb=vec3(.1,.08,.04);emis=vec3(1.,.62,.25)*(.04+uNight*1.6);rough=.2;spec=.6;}}
  else if(uMat==14){ // gold and brass: coins, lantern frames, hoard
    alb=vec3(1.,.74,.32);float f=fbm(vO*4.+uSeed);alb*=.75+.3*f;rough=.28+.2*f;spec=1.;vec3 R=reflect(-V,N);emis=envColor(R)*alb*.6;}
  else if(uMat==15){ // lantern glass: warm flame light when lit
    alb=vec3(.9,.8,.6);emis=vec3(1.,.66,.3)*uGlow*2.4*(.85+.15*sin(uTime*13.+uSeed)*sin(uTime*7.3));rough=.1;spec=.5;}
  else if(uMat==16){ // scallop shell (and pearls): a sandy ribbed outside with growth bands, a pearly thin-film lining
    float u=vUV.x,v=vUV.y;float rib=.5+.5*cos(u*17.57);float c=max(dot(N,V),0.);vec3 R=reflect(-V,N);
    if(vCol.g<.5){float band=.5+.5*sin(v*40.+fbm(vO*2.)*3.);alb=mix(vec3(.5,.3,.26),vec3(.84,.68,.58),rib*.6+.2)*(.78+.26*band)*mix(.7,1.,v);
      alb=mix(alb,vec3(.26,.32,.18),smoothstep(.5,.8,fbm(vO*1.3+3.))*.4);rough=.75;spec=.08;h=rib*.5+band*.15;N=perturb(N,vW,h*.05);}
    else{alb=mix(vec3(.86,.8,.77),vec3(1.,.95,.92),rib)*mix(.75,1.,v);emis=film(c,.35+.2*v+.05*rib,1.5)*envColor(R)*1.0;rough=.22;spec=.5;h=rib*.2;N=perturb(N,vW,h*.03);}}
  else if(uMat==17){ // moonstone: milky stone with a blue sheen that slides with the view
    float c=max(dot(N,V),0.);vec3 R=reflect(-V,N);alb=vec3(.78,.8,.84)*.8;float sh=pow(max(dot(R,uLdir),0.),6.);
    emis=vec3(.35,.55,1.)*(sh*.8+uNight*.55*(.6+.4*sin(uTime*.7+uSeed)))*(1.-c*.4);rough=.25;spec=.6;trans=.4;}
  else if(uMat==18){ // succulents: waxy, frosted, blushing tips
    float t=vCol.a;alb=mix(uTint,uTint*vec3(1.6,.9,1.1)+vec3(.12,0.,.06),smoothstep(.65,1.,t));float fr=pow(1.-max(dot(N,V),0.),2.);
    alb=mix(alb,vec3(.55,.62,.6),fr*.35*uVar);rough=mix(.35,.65,uVar);spec=.18;trans=.25;ao=mix(.6,1.,t);}
  else if(uMat==19){ // food: clover sprig, apple, nectar drop, honey, berries, fish, crickets, glowing coal
    alb=uTint;rough=.5;spec=.1;if(uVar>.5&&uVar<1.5){rough=.05;spec=.6;trans=.6;}if(uVar>2.5){emis=uTint*uGlow*(.8+.2*sin(uTime*5.));}}
  else if(uMat==20){ // dragon egg: pebbly scales with warm glow when about to hatch
    vec3 v=vor2(vUV*vec2(14.,10.));alb=mix(uTint*.6,uTint,smoothstep(.0,.5,v.x));h=smoothstep(.05,.35,v.x);N=perturb(N,vW,h*.08);rough=.4;spec=.25;
    emis=vec3(1.,.4,.1)*uGlow*smoothstep(.15,.0,v.y-v.x)*(.6+.4*sin(uTime*3.));}
  else if(uMat==21){ // bark-pole lantern post, bridge planks
    float f=fbm(vec3(vUV.x*12.,vUV.y*2.,uSeed));alb=mix(vec3(.22,.15,.09),vec3(.36,.26,.16),f);rough=.8;h=f*.3;N=perturb(N,vW,h*.1);}
  else if(uMat==22){float r=vUV.x;alb=vec3(.66,.65,.62)*mix(1.,.72,smoothstep(14.,40.,r+vUV.y*.6))*(.97+.03*vnoise(vW*.3));rough=.9;spec=.02;}
  else{alb=uTint*vCol.rgb;}
  vec3 col=lighting(vW,N,V,alb,rough,spec,trans,ao)+emis;
  col=ringAt(col,vW);
  if(uSel>.5){float rim=pow(1.-max(dot(N,V),0.),2.5);col+=vec3(.5,.9,.8)*rim*.6;}
  col=applyMist(col,vW);
  oC=vec4(col,aOut);}`;
const FS_STD=H+FS_STD_BODY,FS_STDC=H+'#define CUTOUT\n'+FS_STD_BODY;
