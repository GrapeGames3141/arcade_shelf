
// ---------- static meshes ----------
const VS_STD=H+C_UNI+`
uniform mat4 uModel;uniform mat3 uNmat;uniform float uOS;
in vec3 aPos;in vec3 aNor;in vec2 aUV;in vec4 aCol;in vec4 aExt;
out vec3 vW;out vec3 vN;out vec2 vUV;out vec4 vCol;out vec4 vExt;out vec3 vO;
void main(){vec4 w=uModel*vec4(aPos,1.);vW=w.xyz;vN=normalize(uNmat*aNor);vUV=aUV;vCol=aCol;vExt=aExt;vO=aPos*uOS;gl_Position=uVP*w;}`;
const FS_STD=H+C_UNI+C_FN+C_FS+`
uniform int uMat;uniform int uVar;uniform vec3 uTint;uniform float uSeed;uniform float uRough;uniform float uBgK;uniform vec3 uLed;
in vec3 vW;in vec3 vN;in vec2 vUV;in vec4 vCol;in vec4 vExt;in vec3 vO;
out vec4 oC;
// reef substrates: 0 aragonite reef sand (1-2 mm grains of coral, shell and coralline bits), 1 black Tahitian sand, 2 crushed coral (3-6 mm), 3 pink oolite (fine, rounded)
vec3 sandMat(vec3 P,vec3 N,out float h,out float rough,out float spec){
  int t=uVar;
  float gs=t==2?1.75:(t==3?11.5:(t==1?7.5:5.8));
  vec2 q=abs(N.y)>.6?P.xz:(abs(N.z)>abs(N.x)?P.xy:P.zy);
  vec2 g=q*gs,gi=floor(g),gf=fract(g);
  float md=8.,md2=8.;vec2 mc=gi;
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 o=vec2(float(i),float(j));vec2 r=o+hash22(gi+o)*.92+.04-gf;float d=dot(r,r);if(d<md){md2=md;md=d;mc=gi+o;}else if(d<md2)md2=d;}
  float cr=hash12(mc*1.31+7.),c2=hash12(mc+3.1);
  float fw=length(fwidth(g));float det=1.-smoothstep(.3,1.1,fw);
  float edge=sqrt(md2)-sqrt(md);float gr=.42+.2*hash12(mc*2.7+1.);float circ=sqrt(max(0.,1.-md/(gr*gr)));float dome=min(circ,smoothstep(0.,.22,edge));
  h=dome*(.55/gs)*det;
  vec3 base,gc;
  if(t==0){ // photos of reef sand: bright cream-white, with pink and lilac coralline grains, tan shell bits and the odd grey or black grain
    base=vec3(.74,.71,.64);gc=cr<.4?vec3(.86,.84,.79):cr<.58?vec3(.8,.74,.62):cr<.68?vec3(.82,.62,.62):cr<.75?vec3(.6,.5,.6):cr<.86?vec3(.72,.62,.48):cr<.94?vec3(.62,.62,.6):cr<.98?vec3(.42,.4,.38):vec3(.12,.11,.11);
    gc*=.86+.24*c2;rough=.88;spec=.16;}
  else if(t==1){base=vec3(.05,.05,.055);gc=vec3(.035,.035,.04)+cr*.03;rough=.55;spec=.4+step(.9,cr)*2.5;}
  else if(t==2){ // crushed coral: angular fragments, some with the ribbed pores of the old skeleton, deep shadowed gaps between them
    base=vec3(.6,.57,.52);gc=cr<.42?vec3(.88,.86,.82):cr<.6?vec3(.84,.76,.66):cr<.72?vec3(.84,.6,.62):cr<.8?vec3(.6,.5,.62):cr<.9?vec3(.74,.68,.56):vec3(.52,.5,.48);gc*=.85+.22*c2;
    float ang=smoothstep(0.,.16,edge);dome=mix(dome,ang,.65);
    vec2 lc=(g-mc)*9.;float pore=smoothstep(.55,.85,vnoise(vec3(lc,cr*40.)))*det*step(.45,c2);gc*=1.-pore*.35;
    rough=.62;spec=.3;h=(dome*.3-pore*.04)*det;}
  else{base=vec3(.86,.79,.73);gc=mix(vec3(.9,.84,.79),vec3(.84,.7,.68),cr)*(.92+.12*c2);rough=.8;spec=.2;}
  vec3 alb=mix(base,gc,det*.85);if(t!=2)alb*=mix(1.,mix(.76,1.,smoothstep(0.,.45,dome)),det*det);
  alb*=.95+.1*hash12(floor(g*2.3));
  if(t==2)alb*=mix(.3,1.,smoothstep(0.,.45,dome*det+1.-det));
  float n=fbm(vec3(q*.11,1.3));alb*=.88+.24*n;alb*=.93+.14*fbm(vec3(q*.9,4.1));
  // a mature sand bed: faint brown diatom film in quiet spots, a little green near the rocks
  if(t!=1){float film=smoothstep(.56,.8,fbm(vec3(q*.18,7.7)));alb=mix(alb,alb*vec3(.86,.8,.66),film*.45);
    vec2 mq=q*1.7;vec2 mi=floor(mq);vec2 mo=hash22(mi+19.);float mr=length(fract(mq)-.25-mo*.5);float shell=step(.95,hash12(mi+4.))*(1.-smoothstep(.08,.16+.1*mo.x,mr))*det;alb=mix(alb,vec3(.9,.86,.8),shell*.6);
    float glint=step(.985,cr)*det;spec+=glint*1.6;rough=mix(rough,.3,glint);}
  return alb;}
// a few big round pores of the old reef skeleton (cellular F1)
float pores(vec3 p){vec3 ip=floor(p),fp=fract(p);float f1=9.;vec3 cid=ip;
  for(int k=0;k<27;k++){vec3 o=vec3(float(k%3),float((k/3)%3),float(k/9))-1.;vec3 r=o+vec3(hash13(ip+o),hash13(ip+o+17.3),hash13(ip+o+41.7))*.8+.1-fp;float d=dot(r*vec3(1.,1.25,.85),r);if(d<f1){f1=d;cid=ip+o;}}
  // not every cell has a hole, and their sizes vary a lot, so the rock reads as eroded rather than spotted
  float hv=hash13(cid+3.);if(hash13(cid+11.)<.38)return 0.;float sz=.06+.34*hv*hv;return smoothstep(sz,sz*.3,f1);}
// reef rock: 0 cured live rock (pale porous limestone with patchy maroon, rose, lilac and sea-green coralline and a green film, as in photos),
// 1 new dry rock (bone white, very porous), 2 shelf rock (layered plates), 3 reef rubble (old coral branches and cobbles)
vec3 rockMat(vec3 o,vec3 N,inout float ao,out float h,out float rough,out float spec){
  int t=uVar;o=mat3(.80,.36,-.48,-.6,.48,-.64,0.,.8,.6)*o;float fw=length(fwidth(o));
  // each detail fades out only once it gets smaller than a pixel or two (by its own frequency), so distant rock keeps its pores
  #define FD(f) (1.-smoothstep(.22,.6,fw*(f)))
  #define FB(f) (1.-smoothstep(.08,.3,fw*(f)))
  float n1=fbm(o*.28+uSeed),n2=fbm(o*1.3+3.1+uSeed),n3=mix(.5,vnoise(o*6.),FD(6.));
  vec3 ow=o+vec3(vnoise(o*.6),vnoise(o*.6+5.),vnoise(o*.6+9.))*1.1;float big=pores(ow*.5+uSeed)*FD(.5),mid=pores(ow*1.4+uSeed*1.7+9.)*FD(1.4),fine=pores(ow*4.+uSeed*2.9+21.)*FB(4.)*.8,
    small=smoothstep(.62,.8,vnoise(o*7.))*FB(7.)*.6;
  float pit=clamp(big*.8+mid*.9+fine*.7+small*.5,0.,1.);
  vec3 stone=t==1?mix(vec3(.8,.77,.7),vec3(.64,.6,.52),n1):mix(vec3(.6,.53,.42),vec3(.42,.36,.28),n1);
  stone=mix(stone,stone*vec3(.78,.72,.62),smoothstep(.5,.72,n2)*.6);
  if(t==2){float ly=o.y*1.4+n1*1.6;float lay=abs(fract(ly)-.5);stone*=.9+.14*smoothstep(.1,.4,lay);}
  if(t==3)stone=mix(vec3(.74,.7,.62),vec3(.56,.52,.45),n2);
  vec3 alb=stone;
  // brown and olive algal turf over bare stone (photos of live rock are mostly tan-brown where the coralline has not taken over)
  float turf=smoothstep(.35,.7,fbm(o*.7+uSeed+41.))*(t==1?.15:.75);alb=mix(alb,mix(vec3(.44,.35,.2),vec3(.36,.36,.18),vnoise(o*2.2))*(.8+.4*vnoise(o*14.)*FD(14.)),turf*.7);
  // coralline crusts: ragged patches that hug the upper faces, in purple, rose, lilac and pink; crisp edges, speckled inside
  float cov=t==1?.18:t==3?.5:.56;float up=smoothstep(-.5,.6,N.y);
  float cn=fbm(o*.36+uSeed*2.3+5.)*.72+fbm(o*1.6+uSeed+13.)*.2+vnoise(o*5.)*.08*FD(5.);float cv=cn*.76+up*.26,cw=max(.035,fwidth(cv)*1.6);float cpatch=smoothstep(1.-cov,1.-cov+cw,cv);
  float hue=fbm(o*.19+uSeed+19.);vec3 cc=hue<.4?vec3(.4,.11,.28):hue<.52?vec3(.58,.24,.4):hue<.64?vec3(.42,.28,.5):vec3(.66,.42,.5);
  float mot=vnoise(o*3.1+7.)*.55+vnoise(o*9.)*.45*FD(9.);cc*=.68+.55*mot;
  float edge=cpatch*(1.-cpatch)*4.;cc=mix(cc,cc*1.35+vec3(.06,.05,.06),edge*.6);
  pit*=1.-cpatch*.45;alb=mix(alb,cc,cpatch*.95);
  // little bright green and brown spots on lit faces, the odd orange or yellow sponge in the shade
  float gsp=smoothstep(.72,.8,vnoise(o*2.4+uSeed*3.))*smoothstep(.0,.6,N.y)*(t==1?0.:1.);alb=mix(alb,vec3(.12,.3,.06),gsp*.45);
  float spg=step(.988,hash13(floor(o*1.6+uSeed)))*smoothstep(.2,-.4,N.y)*(t==1?0.:1.);alb=mix(alb,hash13(floor(o*1.6))>.5?vec3(.85,.42,.08):vec3(.82,.72,.12),spg*.85);
  alb=mix(alb,alb*vec3(.34,.28,.22),pit*.58);alb*=mix(.45,1.,ao);
  // bump only from features a few pixels wide (finer ones turn into 2x2 derivative blocks)
  float grit=vnoise(o*9.)*FB(9.);
  float cps=smoothstep(1.-cov-.1,1.-cov+.15,cv); // a soft version of the crust edge for the bump, so its outline does not alias
  h=(n2*.3+n3*.08*FB(6.)/max(FD(6.),.01)+grit*.05)*(1.-cps*.4)-(big*FB(1.6)+mid*.9*FB(4.4)+fine*.5*FB(12.))*.26+cps*.03;rough=mix(.95,.82,cpatch);spec=mix(.05,.09,cpatch);
  return alb;}
vec3 woodMat(inout float h,out float rough,out float spec){
  int t=uVar;float u=vUV.x,v=vUV.y;vec3 o=vO;
  float rings=sin(o.x*.9+fbm(o*vec3(.04,.4,.4))*7.)*.5+.5;vec3 alb=mix(vec3(.14,.08,.045),vec3(.24,.14,.08),rings);h=rings*.01;rough=.42;spec=.55;
  if(t==4){alb=mix(vec3(.82,.83,.84),vec3(.92,.92,.93),rings*.3);rough=.3;spec=.5;}
  return alb;}
void main(){
  vec3 N=normalize(vN);if(!gl_FrontFacing&&uMat!=1)N=-N;
  vec3 V=normalize(uCam-vW);
  vec3 alb=uTint;float rough=uRough,spec=.3,trans=0.,ao=vCol.a,h=0.;vec3 emis=vec3(0.);bool lit=true;
  if(uMat==1){alb=sandMat(vW,N,h,rough,spec);ao*=texture(uSandH,sandUV(vW)).g;
    if(vExt.x>.5){vec3 sb=uVar==0?vec3(.7,.67,.6):uVar==1?vec3(.05):uVar==2?vec3(.62,.58,.52):vec3(.8,.73,.68);alb=mix(alb,sb,.4);float layer=fbm(vec3(vW.x*.18,vW.y*1.3,vW.z*.18));alb*=.7+.22*layer;alb*=mix(.62,.92,smoothstep(0.,3.,vW.y));
      alb=mix(alb,alb*vec3(.82,.78,.68),smoothstep(.45,.6,fbm(vec3(vW.x*.08,vW.y*.9,1.))));}}
  else if(uMat==2){alb=rockMat(vO,N,ao,h,rough,spec);}
  else if(uMat==6){spec=.6;}
  else if(uMat==7){lit=false;float y=vW.y;
    if(uVar==0){alb=vec3(.006);lit=true;rough=.9;spec=.05;}
    else if(uVar==1){emis=mix(vec3(0.,.018,.07),vec3(.01,.12,.34),smoothstep(-2.,46.,y))*uBgK;}
    else{emis=mix(vec3(.12,.17,.22),vec3(.5,.62,.72),smoothstep(-6.,52.,y))*uBgK*(.96+.08*fbm(vW*.05));}}
  else if(uMat==8){alb=vec3(.15,.14,.13)*(.88+.15*fbm(vO*.06));rough=.95;spec=.05;}
  else if(uMat==9){alb=woodMat(h,rough,spec);}
  else if(uMat==10){alb=vec3(.07,.075,.08)*(.95+.05*sin(vO.x*35.));spec=.8;rough=.35;
    if(vExt.x>.5){ // LED bar seen from below: a grid of white, royal blue, violet and cyan diodes behind lenses, on a dark board
      vec2 lc=vec2(vO.x/2.15,vO.z/2.3+.5);vec2 li=floor(lc),lf=fract(lc)-.5;float hs=hash12(li+3.7);
      vec3 lw=hs<.5?vec3(1.,.97,.95)*uLed.x:hs<.85?vec3(.12,.25,1.)*uLed.y:hs<.93?vec3(.42,.12,1.)*uLed.z:vec3(.1,.8,1.)*uLed.y*.7;
      float d=length(lf*vec2(1.,1.08));float lens=smoothstep(.3,.18,d);float core=smoothstep(.14,.04,d);
      emis=lw*uLampE*(core*2.6+lens*.55)+uLampC*uLampE*.03;alb=vec3(.02);spec=.9;rough=.2;}}
  else if(uMat==11){alb=vec3(.015);spec=.8;rough=.25;}
  else if(uMat==12){alb=vec3(.022,.023,.025);spec=.45;rough=.42; // pump body: matte black plastic; the cage has slots
    if(vExt.x>.5){float sl=step(.5,fract(atan(vO.y,vO.x)*2.546));alb*=.5+sl;}
    if(vExt.x>1.5){alb=vec3(.12,.13,.14);spec=.7;rough=.3;}}
  if(h!=0.)N=perturb(N,vW,h);
  vec3 col=lit?lighting(vW,N,V,alb,rough,spec,trans,ao):vec3(0.);
  col+=emis;
  if(uRing.w>.5&&uMat==1){float d=length(vW.xz-uRing.xy);float r=smoothstep(.7,.15,abs(d-uRing.z));col+=vec3(.35,.9,.8)*r*(.45+.25*sin(uTime*5.))*(lum(uLcol)*.25+.25);}
  if(uSel>0.)col+=vec3(.04,.11,.1)*uSel*(.6+.4*sin(uTime*4.));
  col=applyWater(col,vW);
  oC=vec4(col,1.);}`;
