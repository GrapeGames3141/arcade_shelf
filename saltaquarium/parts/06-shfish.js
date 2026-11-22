
// ---------- fish (instanced) ----------
// species index uSp: 0 clown, 1 blue tang, 2 yellow tang, 3 royal gramma, 4 mandarin, 5 firefish, 6 green chromis, 7 flame angel, 8 banggai, 9 six-line, 10 valentini puffer, 11 lawnmower blenny
const VS_FISH=H+C_UNI+`
uniform int uSp;
in vec3 aPos;in vec3 aNor;in vec2 aUV;in vec4 aCol;in vec4 aExt;in vec4 iM0;in vec4 iM1;in vec4 iM2;in vec4 iM3;in vec4 iA;in vec4 iB;
out vec3 vW;out vec3 vN;out vec2 vUV;out vec4 vExt;out vec4 vI;
void main(){mat4 M=mat4(iM0,iM1,iM2,iM3);vec3 p=aPos,n=aNor;float x=p.x;bool puf=uSp==10;
  // a startled pufferfish gulps water and becomes a ball: genFish stores each vertex's push onto the ball in aCol (xyz) and how much of the ball normal to take (w)
  float pf=puf?iB.y:0.;if(pf>.001){p+=aCol.xyz*pf;if(aCol.w>0.)n=normalize(mix(n,normalize((p-vec3(.15,-.03,0.))/vec3(.0961,.09,.0784)),aCol.w*pf));}
  // puffers scull with dorsal and anal fins (the tail is a rudder); tangs and angels swim mostly with the tail but stiffly
  float u=clamp((.3-x)/.8,0.,1.);float k=7.5,ph=iA.x,A=iA.y*.2*(puf?.3*(1.-pf):uSp==1||uSp==2||uSp==7?.75:1.),B=iA.z*.3*(puf?.6:1.);
  float sw=sin(ph-x*k),cw=cos(ph-x*k);
  p.z+=A*u*u*sw+B*u*u;
  float du=(x<.3&&x>-.5)?-1.25:0.;float dl=A*(2.*u*du*sw-u*u*k*cw)+B*2.*u*du;
  n=normalize(vec3(n.x-n.z*dl,n.y,n.z));
  // pectorals: mandarins and puffers hover on fast-beating pectorals
  if(aExt.x>1.5&&aExt.x<2.5)p.z+=sign(aPos.z)*sin(iA.w+aExt.z)*(puf||uSp==4?.045:.025)*aExt.y;
  if(aExt.x>.5)p.z+=sin(uTime*6.+x*18.+aExt.z)*.007*aExt.y;
  if(puf&&aExt.x>.5&&aExt.x<1.5&&aExt.z>.5&&aExt.z<2.5)p.z+=sin(ph*1.7+aExt.z*1.3-x*9.)*.06*aExt.y;
  // firefish: the long dorsal spine flicks forward and back
  if(aExt.w>1.5&&aExt.x>.5&&aExt.x<1.5){float fl=iB.w;p.x+=(sin(uTime*7.)*.5+.5)*fl*.12*aExt.y-.06*aExt.y*(1.-fl);}
  vec4 w=M*vec4(p,1.);vW=w.xyz;vN=normalize(mat3(M)*n);vUV=aUV;vExt=aExt;vI=iB;gl_Position=uVP*w;}`;
const FS_FISH=H+C_UNI+C_FN+C_FS+`
uniform int uSp;uniform int uFinPass;
in vec3 vW;in vec3 vN;in vec2 vUV;in vec4 vExt;in vec4 vI;out vec4 oC;
float band(float v,float c,float w,float s){return smoothstep(w+s,w,abs(v-c));}
void main(){float part=vExt.x;bool fin=part>.5&&part<2.5,eye=part>2.5&&part<3.5,barb=part>3.5;if(uFinPass==0&&fin)discard;if(uFinPass==1&&!fin)discard;
  vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);if(fin){if(dot(N,V)<0.)N=-N;}else if(!gl_FrontFacing)N=-N;
  float x=vUV.x,y=vUV.y;float nv=max(dot(N,V),0.);vec3 N0=N;
  vec3 alb=vec3(.6);float rough=.3,spec=.6,trans=.2,alpha=1.,silv=0.,ir=0.;vec3 irc=vec3(0.);float fid=part>1.5?5.:vExt.z,edge=vExt.y;
  const vec3 ORA=vec3(.9,.2,.012),WHT=vec3(.82,.82,.8),BLK=vec3(.012,.012,.014);
  if(barb){alb=uSp==11?vec3(.4,.3,.2):vec3(.82,.74,.68);rough=.5;spec=.3;trans=.5;}
  else if(eye){ // glassy eye: black pupil, coloured iris, clear cornea
    vec2 eu=vUV;if(uSp==10){float tt=uTime*.75+vI.x*7.+vExt.z*1.7,k=floor(tt);vec2 la=vec2(hash12(vec2(k,vExt.z)),hash12(vec2(k,vExt.z+5.)))-.5,lb=vec2(hash12(vec2(k+1.,vExt.z)),hash12(vec2(k+1.,vExt.z+5.)))-.5;
      eu-=mix(la,lb,smoothstep(.0,.12,fract(tt)))*vec2(.42,.26);} // puffers swivel each eye on its own, in quick darts
    float r=length(eu),rs=length(vUV);
    vec3 irisC=uSp==0?vec3(.85,.3,.02):uSp==1?vec3(.05,.08,.2):uSp==2?vec3(.02,.02,.02):uSp==3?vec3(.6,.4,.05):uSp==4?vec3(.7,.3,.02):uSp==5?vec3(.75,.55,.1):uSp==6?vec3(.3,.45,.4):uSp==7?vec3(.85,.3,.03):uSp==8?vec3(.85,.7,.2):uSp==9?vec3(.75,.35,.05):uSp==10?vec3(.1,.55,.6):uSp==12?vec3(.9,.45,.1):uSp==13?vec3(.15,.1,.05):uSp==14?vec3(.85,.6,.1):vec3(.6,.45,.2);
    if(uSp==2)irisC=mix(vec3(.02),vec3(.9,.75,.1),smoothstep(.62,.8,r)); // yellow tang: dark eye in a yellow ring
    if(uSp==10)irisC=mix(vec3(.05,.45,.55),vec3(.9,.6,.1),smoothstep(.62,.8,r));
    float pu=uSp==10?smoothstep(.47,.41,r):smoothstep(.6,.54,r);alb=mix(irisC*.55*(.85+.15*sin(atan(eu.y,eu.x)*9.)),vec3(.01),pu);alb*=mix(.25,1.,smoothstep(1.,.78,max(r,rs)));
    rough=.04;spec=2.;trans=0.;silv=(1.-pu)*smoothstep(1.,.8,r)*.22;if(uSp==10||uSp==6){ir=(1.-pu)*smoothstep(.74,.55,r)*.45;irc=vec3(.1,.7,.55);}}
  else if(!fin){
    // overlapping scales: dark posterior rims, each scale slightly domed; fades out where it would alias (scaleless mandarin, puffer, blenny skip it)
    float scl=uSp==4||uSp==10||uSp==11||uSp==2||uSp==1?0.:1.;
    vec2 sc=vec2(x*(uSp==2||uSp==1?90.:58.),y*(uSp==2||uSp==1?12.:8.));float row=floor(sc.y);sc.x+=row*.5;vec2 f=fract(sc);float fw=length(fwidth(sc));
    float sk=(1.-smoothstep(.25,.7,fw))*smoothstep(.86,.74,x)*smoothstep(.15,.22,x)*scl;
    float d=length((f-vec2(.22,.5))*vec2(1.,1.25));float rim=smoothstep(.46,.62,d)*sk;
    vec2 q=(f-vec2(.25,.5))*vec2(1.,1.25);vec2 tl=q*smoothstep(.62,.15,length(q));vec3 Tx=normalize(cross(N,vec3(0.,1.,0.))+1e-4);vec3 Ty=cross(Tx,N);N=normalize(N+(Tx*tl.x+Ty*tl.y)*sk*.4);
    float oper=band((1.-x)-(.155+.035*y*y),0.,.006,.012)*smoothstep(.95,.5,abs(y));
    float belly=smoothstep(.05,-.55,y);float dk=.3,pbl=0.;
    if(uSp==0){ // ocellaris: orange, three white bands edged in thin black (head band arcs, mid band bulges forward), pale belly
      alb=mix(ORA,vec3(1.,.42,.06),belly*.5);float c1=.8+.03*y*y,c2=.55-.07*(1.-y*y),c3=.27;
      float wb=max(max(band(x,c1,.035,.008),band(x,c2,.04,.008)),band(x,c3,.024,.008));float bk=max(max(band(x,c1,.05,.007),band(x,c2,.055,.007)),band(x,c3,.036,.007))*(1.-wb);
      alb=mix(alb,BLK,bk*.9);alb=mix(alb,WHT,wb);silv=wb*.15;dk=.12;rim*=.6;}
    else if(uSp==1){ // blue tang: royal blue, the black 'palette' sweeping from the eye along the back to the tail, a loop below enclosing a blue patch
      alb=mix(vec3(.015,.1,.6),vec3(.05,.2,.75),belly*.4+.2*sin(x*30.)*0.);
      float yc=.36-.5*(.84-x);float up=band(y,yc,.13,.04)*smoothstep(.9,.84,x)*smoothstep(.22,.3,x);
      float e=length(vec2((x-.6)/.19,(y-.04)/.27));float ring=smoothstep(.04,.0,abs(e-.92)-.1)*smoothstep(.35,.1,y);
      float stalk=smoothstep(.34,.3,x)*smoothstep(.2,.24,x)*band(y,0.,.6,.2);alb=mix(alb,vec3(.01,.012,.03),clamp(up+ring+stalk*.8,0.,1.));
      ir=(1.-clamp(up+ring,0.,1.))*.35;irc=vec3(.1,.35,1.);dk=.05;}
    else if(uSp==2){ // yellow tang: vivid yellow all over, faint vertical striations, a white scalpel at the tail base
      alb=mix(vec3(.9,.56,.01),vec3(1.,.74,.03),smoothstep(-.6,.4,y)*(1.-smoothstep(.5,.95,y))*.8+.2)*(.93+.07*sin(x*120.+y*3.))*(.94+.06*sin(y*40.+x*8.));float sc2=smoothstep(.04,.02,length(vec2((x-.245)*2.,y*.6)));alb=mix(alb,vec3(.9,.9,.85),sc2);dk=.14;}
    else if(uSp==3){ // royal gramma: magenta-purple front, yellow rear, a dark line through the eye
      float t=smoothstep(.43,.58,x+.06*y);alb=mix(vec3(.95,.55,.015),vec3(.36,.03,.42),t);float el=band(y-(x-.9)*1.4,.2,.03,.03)*smoothstep(.82,.86,x);alb=mix(alb,vec3(.06,.01,.08),el*.8);
      alb*=.92+.12*step(.6,hash12(floor(vec2(x*120.,y*16.))));dk=.08;ir=t*.15;irc=vec3(.6,.2,1.);}
    else if(uSp==4){ // mandarin: wavy orange lines and blotches over electric blue-green, outlined in dark blue
      vec2 q2=vec2(x*14.,y*4.);q2+=vec2(fbm(vec3(q2*.6,vI.x*9.)),fbm(vec3(q2*.6+7.,vI.x*9.)))*1.6;float f2=fbm(vec3(q2*.5,vI.x*4.));float bd=fract(f2*6.);float mm=abs(bd-.5)*2.;
      float orange=smoothstep(.32,.2,mm),edgeB=smoothstep(.42,.33,mm)-orange;alb=mix(vec3(.006,.11,.34),vec3(.02,.24,.16),smoothstep(.6,1.,x));alb=mix(alb,vec3(.95,.3,.02),orange);alb=mix(alb,vec3(.01,.04,.25),edgeB*.9);
      ir=(1.-orange)*.3;irc=vec3(.1,.7,.9);dk=0.;rough=.3;}
    else if(uSp==5){ // firefish: yellow head, pearly white front, blending to flame red and maroon at the rear
      alb=mix(vec3(.98,.88,.78),vec3(.95,.62,.12),smoothstep(.8,.9,x));alb=mix(alb,vec3(.92,.18,.03),smoothstep(.55,.32,x));alb=mix(alb,vec3(.35,.03,.03),smoothstep(.3,.2,x));silv=.2*smoothstep(.45,.65,x);dk=.05;}
    else if(uSp==6){ // green chromis: pale apple green with a blue-green iridescent sheen
      alb=mix(vec3(.12,.5,.3),vec3(.42,.72,.5),belly*.6);silv=.2+belly*.3;ir=.9;irc=vec3(.1,.85,.6);dk=.35;}
    else if(uSp==7){ // flame angel: red-orange, a yellow-orange glow mid-flank, four or five black vertical bars, blue-black stripes at the rear fin bases
      alb=mix(vec3(.9,.06,.01),vec3(1.,.36,.015),smoothstep(.45,0.,length(vec2((x-.55)*1.8,y+.05))));
      float bars=0.;for(int i=0;i<5;i++){float c=.76-float(i)*.095+.01*sin(y*6.+float(i));bars=max(bars,band(x,c,.011+.004*(1.-y),.012)*smoothstep(-.7,-.1,y));}
      alb=mix(alb,vec3(.02,.005,.005),bars*.9);dk=.08;}
    else if(uSp==8){ // banggai: silver with three black bars and white spots on the rear body
      alb=mix(vec3(.5,.5,.48),vec3(.72,.72,.68),belly);silv=.6;float b1=band(x,.885,.025,.01),b2=band(x,.71+.04*y,.045,.012),b3=band(x,.5+.03*y,.05,.012);
      alb=mix(alb,vec3(.015),max(max(b1,b2),b3));silv*=1.-max(max(b1,b2),b3);
      vec2 sq=vec2(x*40.,y*9.);vec2 sc3=fract(sq+vec2(.5*floor(sq.y),0.))-.5;float spot=smoothstep(.22,.12,length(sc3))*step(.55,hash12(floor(sq)))*smoothstep(.45,.38,x)*(1.-smoothstep(.3,.8,length(fwidth(sq))));alb=mix(alb,vec3(.95),spot);dk=.3;}
    else if(uSp==9){ // six-line wrasse: thin orange stripes on purple-blue, a dark spot near the tail
      float st=pow(.5+.5*sin(y*20.+.4),6.)*smoothstep(.86,.8,x)*smoothstep(.2,.28,x);alb=mix(vec3(.12,.1,.5),vec3(.95,.38,.03),st);alb=mix(alb,vec3(.12,.5,.35),smoothstep(.3,.22,x));
      alb=mix(alb,vec3(.01),smoothstep(.035,.02,length(vec2(x-.26,(y-.35)*.4))));ir=.3*(1.-st);irc=vec3(.3,.4,1.);dk=.15;}
    else if(uSp==10){ // valentini: white with four dark saddles, orange-brown spots, blue lines round the eye
      float ang=asin(clamp(y,-1.,1.));alb=mix(vec3(.82,.78,.66),vec3(.92,.9,.86),smoothstep(-.1,-.6,y));
      float sd=0.;for(int i=0;i<4;i++){float c=i==0?.87:i==1?.64:i==2?.45:.27,w=i==1?.07:i==0?.035:.05,yl=i==1?-.25:i==0?.2:-.05;sd=max(sd,band(x,c+.04*y,w,.02)*smoothstep(yl-.1,yl+.1,y));}
      alb=mix(alb,vec3(.07,.04,.03),sd*.95);float spt=smoothstep(.72,.8,vnoise(vec3(x*55.,ang*24.,vI.x*5.)))*(1.-sd);alb=mix(alb,vec3(.7,.3,.08),spt*.8);
      float bl=pow(.5+.5*sin(atan(y-.42,(x-.82)*1.6)*14.),8.)*smoothstep(.98,.82,x)*smoothstep(.0,.25,y);alb=mix(alb,vec3(.1,.45,.85),bl*.7*(1.-sd));
      alb=mix(alb,vec3(.2,.19,.14),vI.z*(1.-vI.y)*smoothstep(-.25,-.6,y)*.4);
      if(vI.y>.05){vec2 sq=vec2(x*55.,ang*26.),ci=floor(sq),fs=fract(sq)-.5-(vec2(hash12(ci),hash12(ci+7.))-.5)*.45;float dd=length(fs),kk=smoothstep(-.05,-.45,y)*vI.y*(1.-smoothstep(.25,.7,length(fwidth(sq))));
        N=normalize(N+(Tx*fs.x+Ty*fs.y)*smoothstep(.32,.0,dd)*kk*.9);alb*=1.-.2*smoothstep(.2,.0,dd)*kk;}
      oper=0.;rim=0.;dk=.05;pbl=sd;}
    else if(uSp==12){ // lyretail anthias (female): orange-gold with yellow scale flecks and a violet stripe from the eye down to the pectoral
      alb=mix(vec3(.92,.2,.045),vec3(1.,.42,.12),belly*.7);alb*=.92+.12*step(.62,hash12(floor(vec2(x*90.,y*14.))));
      float vs=band(y-(x-.86)*1.6,-.12,.05,.03)*smoothstep(.62,.7,x)*smoothstep(.98,.9,x);alb=mix(alb,vec3(.55,.2,.75),vs*.85);ir=.15;irc=vec3(1.,.4,.6);dk=.12;}
    else if(uSp==13){ // copperband: pearly white with four copper bands edged in black, an orange eye band and a dark false eye at the rear
      alb=mix(vec3(.88,.86,.8),vec3(.95,.94,.9),belly);silv=.3;float cb=0.,ed=0.;
      for(int i=0;i<4;i++){float c=i==0?.77:i==1?.58:i==2?.4:.17,w=i==3?.035:.05;float b=band(x,c+.03*y,w,.008),e=band(x,c+.03*y,w+.012,.006)-b;cb=max(cb,b);ed=max(ed,e);}
      alb=mix(alb,vec3(.85,.3,.04),cb);alb=mix(alb,vec3(.02,.02,.03),ed*.9);silv*=1.-cb;
      dk=.05;}
    else if(uSp==14){ // yellow watchman goby: lemon yellow with small pale-blue spots ringed darker, blue lines on the cheek
      alb=mix(vec3(.85,.62,.02),vec3(.95,.78,.12),belly);vec2 sq=vec2(x*34.,y*7.);vec2 sc=fract(sq+vec2(.5*floor(sq.y),0.))-.5;float dd=length(sc);float aa=1.-smoothstep(.3,.8,length(fwidth(sq)));
      float spot=smoothstep(.2,.13,dd)*step(.4,hash12(floor(sq)))*aa*smoothstep(.9,.8,x);alb=mix(alb,vec3(.1,.35,.75),spot*.85);
      float ch=pow(.5+.5*sin((y-x*1.2)*30.),10.)*smoothstep(.78,.86,x)*smoothstep(.98,.9,x);alb=mix(alb,vec3(.1,.4,.85),ch*.7);dk=.08;}
    else{ // lawnmower blenny: olive-tan, mottled dark spots, pale lines
      alb=mix(vec3(.2,.16,.07),vec3(.45,.38,.24),belly);float sp2=smoothstep(.62,.72,vnoise(vec3(x*30.,y*8.,vI.x*7.)));alb=mix(alb,vec3(.08,.07,.05),sp2*.7);
      alb=mix(alb,vec3(.7,.68,.55),pow(.5+.5*sin(x*70.+y*2.),12.)*.4);oper=0.;rim=0.;dk=.15;}
    alb*=1.-rim*.16;alb=mix(alb,alb*vec3(1.,.6,.55),oper*.5);
    // countershading: darker back on the silvery schooling fish, hardly any on the boldly coloured reef fish
    float dors=smoothstep(.3,.88,y)*dk;alb=mix(alb,alb*vec3(.18,.17,.15)+vec3(.02,.02,.015),dors*.94);silv*=1.-smoothstep(.35,.85,y)*dk;
    rough=mix(.38,.14,silv);spec=mix(.45,1.,silv)*(1.-dors*.4);trans=.18;if(uSp==10){rough=.46+pbl*.2;spec*=.7*(1.-pbl*.5);}if(uSp==4){rough=.3;spec=.8;}}
  else{ // fins: thin, rayed
    float ray=fid<.5?abs(vUV.y):vUV.x;float rays=smoothstep(.5,1.,abs(sin(ray*(fid<.5?30.:22.))));trans=.85;rough=.35;spec=.5;
    alb=vec3(.82,.84,.82);alpha=.2+rays*.08;
    if(uSp==0){alb=ORA;alpha=.85;float m2=smoothstep(.78,.9,edge);alb=mix(alb,BLK,m2*.9);if(fid<.5)alb=mix(alb,BLK,smoothstep(.85,.95,edge));if(fid>4.5)alb=ORA;}
    else if(uSp==1){if(fid<.5){alb=vec3(.98,.75,.02);float mg=smoothstep(.7,.95,abs(vUV.y))*smoothstep(.2,.5,vUV.x);alb=mix(alb,BLK,mg);alpha=.9;}
      else if(fid>4.5){alb=mix(vec3(.02,.1,.55),vec3(.98,.75,.02),smoothstep(.45,.8,vUV.x));alpha=.8;}else{alb=vec3(.02,.12,.62);alb=mix(alb,BLK,band(edge,.8,.06,.04));alb=mix(alb,vec3(.1,.4,1.),smoothstep(.9,1.,edge));alpha=.85;}}
    else if(uSp==2){alb=mix(vec3(.98,.7,.02),vec3(.95,.55,.02),smoothstep(.6,1.,edge));alpha=fid<.5?.7:.78;if(fid>4.5)alpha=.5;}
    else if(uSp==3){alb=fid<.5||(fid>.5&&fid<1.5&&vUV.x>.5)?vec3(.95,.6,.02):vec3(.36,.03,.42);if(fid>.5&&fid<1.5)alb=mix(alb,BLK,smoothstep(.12,.06,length(vec2(vUV.x-.12,edge-.5)*vec2(1.,.6))));alpha=.75;}
    else if(uSp==4){alb=vec3(.008,.12,.36);float w2=smoothstep(.75,.95,.5+.5*sin(vUV.x*25.+edge*14.+sin(edge*9.)*2.));alb=mix(alb,vec3(.9,.3,.03),w2*.8);alb=mix(alb,vec3(.02,.1,.6),smoothstep(.8,.95,edge));alpha=.8;}
    else if(uSp==5){alb=fid<.5?mix(vec3(.85,.15,.04),vec3(.04),smoothstep(.55,.7,vUV.x)):vec3(.95,.4,.25);if(fid>.5&&fid<1.5&&vUV.x<.3)alb=vec3(.95,.92,.88);alpha=fid<.5?.8:.55;}
    else if(uSp==6){alb=vec3(.3,.65,.55);alpha=.32+rays*.06;}
    else if(uSp==7){alb=fid<.5?mix(vec3(.95,.25,.03),vec3(1.,.55,.1),smoothstep(.4,1.,vUV.x)):vec3(.95,.15,.02);if(fid>.5&&fid<2.5){float bs=pow(.5+.5*sin(edge*26.),4.)*smoothstep(.45,.75,vUV.x);alb=mix(alb,vec3(.03,.06,.35),bs*smoothstep(.4,.8,edge));}alpha=fid<.5?.72:.85;}
    else if(uSp==8){alb=vec3(.5,.5,.48);alb=mix(alb,BLK,fid<.5?smoothstep(.6,.9,abs(vUV.y)):smoothstep(.55,.85,edge)*.9);if(fid>1.5&&fid<2.5)alb=BLK;float sp3=smoothstep(.3,.15,length(fract(vUV*vec2(8.,5.))-.5))*step(.5,hash12(floor(vUV*vec2(8.,5.))));alb=mix(alb,vec3(.95),sp3*(fid>.5?1.:.6));alpha=.75;}
    else if(uSp==9){alb=fid<.5?vec3(.2,.55,.35):vec3(.35,.2,.55);alpha=.45;}
    else if(uSp==10){if(fid>.5&&fid<2.5){alb=vec3(.9,.82,.6);alpha=.5;}else if(fid<.5){alb=mix(vec3(.95,.78,.15),vec3(.08,.06,.04),smoothstep(.7,.9,abs(vUV.y)));alpha=.6;}else{alb=vec3(.9,.86,.6);alpha=.18;}}
    else if(uSp==14){alb=vec3(.9,.65,.04);float sp4=smoothstep(.18,.1,length(fract(vUV*vec2(6.,4.))-.5))*step(.5,hash12(floor(vUV*vec2(6.,4.))));alb=mix(alb,vec3(.1,.35,.75),sp4*.8);alb=mix(alb,vec3(.1,.3,.8),smoothstep(.85,.95,edge)*.6);alpha=.75;}
    else if(uSp==12){alb=fid<.5?mix(vec3(.95,.25,.04),vec3(.9,.1,.3),smoothstep(.6,1.,abs(vUV.y))):fid<1.5?vec3(1.,.32,.04):fid<2.5?vec3(.95,.3,.08):fid>4.5?vec3(1.,.4,.1):vec3(.6,.05,.2);alpha=fid>4.5?.35:.75;}
    else if(uSp==13){alb=vec3(.9,.88,.82);if(fid<.5){alb=mix(alb,vec3(.02),band(vUV.x,.3,.05,.02));alpha=.45;}else if(fid<2.5){alb=mix(alb,vec3(.9,.5,.08),smoothstep(.55,.65,edge)*smoothstep(.85,.75,edge));alb=mix(alb,vec3(.02),smoothstep(.86,.92,edge)*.8);
      if(fid<1.5){float oc=length(vec2((vUV.x-.82)*2.2,edge-.42));alb=mix(alb,vec3(.01),smoothstep(.17,.13,oc));alb=mix(alb,vec3(.95),smoothstep(.2,.18,oc)*smoothstep(.16,.18,oc));}alpha=.82;}else{alpha=.3;}}
    else{alb=vec3(.5,.46,.36);alb=mix(alb,vec3(.12,.09,.06),smoothstep(.58,.66,vnoise(vec3(vUV*vec2(14.,6.),vI.x*3.))));alpha=.38+rays*.06;}
    if(fid>4.5){alpha*=smoothstep(0.,.3,vUV.y)*smoothstep(1.,.7,vUV.y)*smoothstep(1.,.55,vUV.x)*1.3;}
    alpha*=mix(1.,.65,smoothstep(.75,1.,edge));}
  vec3 col=lighting(vW,N,V,alb,rough,spec,trans,1.);
  if(inWater(vW)){float dep=max(uWL-vW.y,0.);vec3 Lc=uLcol*exp(-uAbs*dep);float sh=shadowAt(vW,N);vec3 R=reflect(-V,N),R0=reflect(-V,N0);
    float fr=.25+.75*pow(1.-nv,3.);col+=silv*(envColor(R0)*1.6*fr+Lc*sh*pow(max(dot(R,uLdir),0.),18.)*.45*causAt(vW)+uFogC*.8*fr);
    if(ir>0.){vec3 tf=film(nv,.19+.03*sin(x*14.+vI.x*6.),1.62);col+=ir*mix(irc,tf*1.6,.5)*(Lc*sh*(.12+.7*pow(max(dot(R,uLdir),0.),4.))+uFogC*2.5+uAmb*.25);}}
  col=applyWater(col,vW);
  if(uFinPass==1&&alpha<.07)discard;
  oC=uFinPass==1?vec4(col*alpha,alpha):vec4(col,1.);}`;
