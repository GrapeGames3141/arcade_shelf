
// ---------- corals, anemones, algae and other sessile life ----------
const VS_CORAL=H+C_UNI+`
uniform mat4 uModel;uniform mat3 uNmat;uniform float uSway;uniform vec3 uCur;uniform float uFlowW;uniform float uPhase;uniform float uMorph;uniform vec4 uAxP[8];
in vec3 aPos;in vec3 aNor;in vec2 aUV;in vec4 aCol;in vec4 aExt;
out vec3 vW;out vec3 vN;out vec2 vUV;out vec4 vCol;out vec4 vExt;out vec3 vO;
void main(){vec3 p=aPos;float f=aCol.a;float ph=aExt.x+uPhase;int sp=int(aExt.y+.5);float t=uTime;
  // morph target: xenia polyps pulse on their own clocks (open, snap shut, open again); dusters and clams retract with uMorph
  float k=uMorph;if(sp==10){float pt=fract(t*.62+aExt.x*.1591);k=mix(smoothstep(0.,.18,pt)*smoothstep(.62,.3,pt)*.9,.8,uMorph);}
  p+=aCol.rgb*k;
  vec4 w=uModel*vec4(p,1.);
  // wavemaker surge: back and forth along uCur, the wave travelling across the tank so neighbours sway out of step, plus a little turbulence
  float sg=sin(t*uFlowW-w.x*.05-w.z*.03+ph*.35)*.85+sin(t*uFlowW*2.3+ph*1.7+w.x*.11)*.25+.12;
  vec3 cur=uCur*sg+vec3(.5,0.,1.)*sin(t*1.9+ph*2.3+w.x*.09)*.1*length(uCur);
  vec3 nn=normalize(uNmat*aNor);
  w.xyz+=cur*f*uSway+nn*sin(t*2.6+ph*3.)*.035*f*uSway;
  // fish nestling in an anemone (or brushing past soft coral) push the tentacles aside
  float pf=clamp(f*1.4,0.,1.);
  if(pf>0.)for(int i=0;i<8;i++){vec4 a=uAxP[i];if(a.w<=0.)continue;vec3 d=w.xyz-a.xyz;float l=length(d),r=a.w;if(l<r&&l>1e-3)w.xyz+=d/l*(r-l)*pf*.8;}
  w.y=min(w.y,uWL-.15);
  vW=w.xyz;vN=nn;vUV=aUV;vCol=aCol;vExt=aExt;vO=aPos;gl_Position=uVP*w;}`;
const FS_CORAL=H+C_UNI+C_FN+C_FS+`
uniform vec3 uC1;uniform vec3 uC2;uniform vec3 uC3;uniform vec4 uFl;uniform int uKind;uniform float uPhase;
in vec3 vW;in vec3 vN;in vec2 vUV;in vec4 vCol;in vec4 vExt;in vec3 vO;out vec4 oC;
void main(){vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;vec3 V=normalize(uCam-vW);
  int sp=int(vExt.y+.5);float pr=vExt.w+.001;int part=int(floor(pr));float tf=clamp(fract(pr)/.9,0.,1.);vec2 uv=vUV;vec3 o=vO;
  vec3 alb=uC1;float rough=.5,spec=.3,trans=.3,ao=vExt.z,h=0.,fm=0.,irid=0.,pearl=0.;vec3 emis=vec3(0.);bool bleach=true;
  float hf=1.-smoothstep(.3,1.,length(fwidth(o))*5.);
  if(sp<=1){ // Acropora / Seriatopora: radial corallites as little cups round each branch, axial corallite and tip in a second colour
    if(part==0){alb=mix(uC1,uC3,.3)*.62*(.85+.3*fbm(o*3.));rough=.8;spec=.1;h=fbm(o*3.)*.04;fm=.25;}
    else{float kk=sp==0?8.:5.;vec2 g=vec2(uv.x*kk,uv.y/(sp==0?.36:.22));g.x+=floor(g.y)*.5;vec2 ff=fract(g)-.5,id=floor(g);
      float aa=1.-smoothstep(.3,.85,length(fwidth(g)));float d=length(ff*vec2(1.,.8));float cup=smoothstep(.44,.2,d)*aa;float hole=smoothstep(.15,.05,length(ff-vec2(0.,.1)))*aa;
      float tipm=smoothstep(.62,.95,tf),axial=smoothstep(.95,1.,tf);h=(cup*.14-hole*.1)*(sp==0?1.:.35)*(1.-tipm*.5);
      alb=mix(uC1,uC2,tipm);alb=mix(alb,mix(alb,uC3,.5),cup*.25*(1.-tipm*.5));alb*=1.-hole*.15;alb=mix(alb,vec3(.85,.85,.82),axial*.6);alb*=.88+.16*hash12(id);
      alb*=.85+.2*vnoise(vec3(uv.x*3.,uv.y*.4,vExt.x));
      rough=.42;spec=.38;trans=.15;fm=.5+.5*tipm;}}
  else if(sp==2){ // Montipora: densely pored surface with little papillae, a pale growing margin
    vec2 q=o.xz*5.5;vec2 c=fract(q+vec2(.5*floor(q.y),0.))-.5;float pore=smoothstep(.16,.06,length(c))*(1.-smoothstep(.3,.8,length(fwidth(q))));
    float pap=vnoise(o*2.4)*.6+vnoise(o*6.)*.4;float edge=smoothstep(.82,1.,tf);float gl=.5+.5*sin(tf*60.+vnoise(o)*3.);h=pap*.08-pore*.045+gl*.01;
    alb=mix(uC1,uC2,edge*.85)*(1.-pore*.18)*(.85+.25*pap)*(.94+.06*gl);
    if(part==0){alb=uC1*.75;h*=.3;}rough=.58;spec=.22;trans=.12;fm=.55;}
  else if(sp==3){ // brain coral: meandering valleys between septate walls (isolines of a warped noise field)
    if(part==0){alb=uC1*.4;rough=.8;}
    else{ // Truchet maze: quarter-circle walls in a warped grid make continuous meandering valleys of an even width that close into
      // loops here and there, like a real Platygyra; the radial angle about each arc gives the septa that cross the walls
      vec3 oc=o-vec3(0.,.5,0.);float rr=length(oc.xz);vec2 p2=oc.xz/max(rr,1e-3)*atan(rr,max(oc.y,-2.))*length(oc);
      float cell=uKind==1?1.5:1.15;p2+=vec2(vnoise(o*.32+3.),vnoise(o*.32+7.))*1.6;vec2 c=p2/cell,id=floor(c),f=fract(c);
      if(hash13(vec3(id,uPhase))>.5)f.x=1.-f.x;vec2 d0=f,d1=f-1.;float e0=abs(length(d0)-.5),e1=abs(length(d1)-.5);float d=min(e0,e1);
      float an=e0<e1?atan(d0.y,d0.x):atan(d1.y,d1.x);float aa=1.-smoothstep(.12,.35,fwidth(c.x)+fwidth(c.y));
      float wall=smoothstep(.2,.11,d),valley=smoothstep(.17,.3,d),crest=smoothstep(.06,.0,d);float sep=pow(.5+.5*cos(an*22.),5.)*(1.-wall*.6)*(1.-valley*.5)*aa*hf;
      h=(wall*.32-valley*.1+crest*.04+sep*.04)*aa;alb=mix(uC2,uC1,mix(.5,wall,aa));alb=mix(alb,uC1*1.3+.03,crest*aa*.4);alb*=mix(1.,.62,valley*aa*.6);alb=mix(alb,alb*1.25+.02,sep*.5);alb*=.9+.15*vnoise(o*1.3);
      fm=valley*.22+.04;rough=.5;spec=.3;trans=.15;}}
  else if(sp==4||sp==5||sp==25){ // Euphyllia: skeleton walls, translucent striped tentacles, pale fluorescent tips
    if(part==0){alb=uC3*.95*(.8+.3*fbm(o*2.));rough=.8;spec=.1;h=fbm(o*4.)*.05;bleach=false;}
    else if(part==1){alb=mix(uC1*.7,uC1,tf);float lines=.5+.5*sin(uv.x*TAU*6.);alb*=.9+.14*lines;trans=.7;rough=.36;spec=.45;fm=sp==4?.06+.12*tf:.2+.35*tf;
      if(sp==4){float tp=smoothstep(.87,.94,tf);alb=mix(alb,uC2*(.95+.1*vnoise(vW*9.)),tp);fm=mix(fm,1.,tp);trans=mix(trans,.6,tp);}}
    else{alb=uC2*(.95+.1*vnoise(vW*9.));if(sp==5)alb=mix(alb,uC2*1.15+.04,.5+.5*sin(uv.y*20.));trans=.6;rough=.3;spec=.6;fm=1.;}}
  else if(sp==26){ // candy cane: ribbed brown-green tubes, each polyp a bright green centre in a brown ring with radial septa
    if(part==0){alb=uC3*.55*(.8+.3*fbm(o*2.));rough=.8;spec=.1;}
    else if(part<2){float rib=.5+.5*sin(uv.x*TAU*14.);alb=mix(uC3,uC1,.55)*.8*(.95+.35*rib)*(.85+.2*vnoise(o*3.));h=rib*.03;rough=.7;spec=.15;}
    else{float rr=uv.x,an=uv.y*TAU;float sep=pow(.5+.5*cos(an*28.),3.)*smoothstep(.25,.6,rr);vec3 c=mix(uC2*1.1,uC1,smoothstep(.35,.62,rr));c=mix(c,uC2*.6,smoothstep(.12,.0,rr));
      alb=c*(1.-sep*.25);h=sep*.03;fm=1.-smoothstep(.4,.7,rr)*.8;rough=.4;spec=.4;trans=.25;}}
  else if(sp==27){ // chalice: encrusting plates studded with bright "eyes" (oral discs) and a contrasting growing rim
    vec2 q=o.xz*.95;vec2 id=floor(q+vec2(.5*floor(q.y),0.)),c=fract(q+vec2(.5*floor(q.y),0.))-.5;c+=vec2(hash12(id),hash12(id+7.))*.3-.15;float d=length(c);
    float eye=smoothstep(.27,.2,d),ring=smoothstep(.33,.27,d)-eye,mouth=smoothstep(.07,.035,d);float sep=pow(.5+.5*cos(atan(c.y,c.x)*16.),4.)*smoothstep(.3,.42,d)*hf;
    float edge=smoothstep(.85,1.,tf);alb=uC1*(.85+.25*vnoise(o*2.))*(1.-sep*.2);alb=mix(alb,uC1*.55,ring*.8);alb=mix(alb,uC2,eye);alb=mix(alb,uC2*.4,mouth);alb=mix(alb,uC3*1.1,edge*.9);
    h=eye*.06+ring*.04-mouth*.05+sep*.02;fm=max(eye,edge)*.9+.1;if(part==0){alb=uC1*.5;h*=.3;}rough=.5;spec=.3;trans=.15;}
  else if(sp==28){ // Duncan: brown stalks, flesh-coloured upper tube, a disc that fades from its centre colour, pale-tipped tentacles
    if(part==0){alb=uC1*.45*(.8+.3*fbm(o*2.));rough=.8;spec=.1;}
    else if(part==4){alb=mix(uC1,uC2*.8,tf)*(.9+.12*vnoise(vW*8.));trans=.4;rough=.5;spec=.3;fm=.2;}
    else if(part==3){float rr=uv.x;alb=mix(uC2*.55,uC2*1.1,smoothstep(.05,.3,rr));alb=mix(alb,uC3*.9,smoothstep(.7,1.,rr)*.5);alb*=.92+.12*sin(uv.y*TAU*13.)*smoothstep(.2,.6,rr);trans=.35;rough=.4;spec=.4;fm=.8;}
    else{alb=mix(uC2,uC3,smoothstep(.3,1.,tf));trans=.6;rough=.35;spec=.45;fm=.5+.5*tf;}}
  else if(sp==24){ // Goniopora: fleshy stalks, flowers of slim tentacles with pale tips around a pale mouth
    if(part==0){alb=uC1*.45*(.8+.3*fbm(o*3.));rough=.8;spec=.1;}
    else if(part==1){alb=mix(uC1*.8,uC1*1.1,tf)*(.92+.1*sin(uv.x*TAU*5.));trans=.55;rough=.4;spec=.35;fm=.25+.3*tf;}
    else if(part==3){alb=mix(uC3,uC2,smoothstep(.2,.8,uv.x));fm=1.;trans=.4;rough=.4;spec=.4;}
    else{alb=mix(uC2,uC3,smoothstep(.5,1.,tf));trans=.65;rough=.35;spec=.4;fm=.7+.3*tf;}}
  else if(sp==29){ // Acan: fleshy domed polyps, mouth, two rings of colour that vary polyp to polyp, septal ridges at the rim
    if(part==0){alb=mix(uC1,vec3(.3,.22,.15),.6)*.4*(.8+.3*fbm(o*2.));rough=.8;spec=.1;}
    else{float rr=uv.x,an=uv.y*TAU;float hv=fract(vExt.x*7.31);vec3 a1=mix(uC1,uC2,hv),a2=mix(uC2,uC3,hv);
      vec3 c=mix(uC3*.5,a2,smoothstep(.06,.18,rr));c=mix(c,a1,smoothstep(.45,.6,rr));c=mix(c,a2*1.15,smoothstep(.82,.95,rr));
      float sep=pow(.5+.5*cos(an*18.),4.)*smoothstep(.55,.9,rr)*hf;float puff=vnoise(o*5.)*.5+vnoise(o*11.)*.5*hf;
      alb=c*(1.-sep*.18)*(.9+.15*puff);h=puff*.03+sep*.03;fm=.65+.35*smoothstep(.5,.9,rr);trans=.35;rough=.45;spec=.4;}}
  else if(sp==30){ // sun coral: ribbed orange cups, an orange disc, translucent yellow tentacles
    if(part==0){alb=uC1*.55*(.8+.3*fbm(o*2.));rough=.8;spec=.1;}
    else if(part<2){float rib=.5+.5*sin(uv.x*TAU*16.);alb=uC1*(.8+.3*rib)*(.9+.15*vnoise(o*4.));h=rib*.03;rough=.6;spec=.2;trans=.15;}
    else if(part==3){alb=mix(uC2*.7,uC2,smoothstep(.1,.5,uv.x));trans=.4;rough=.4;spec=.4;fm=.2;}
    else{alb=mix(uC3*.9,uC3*1.15+.03,tf);trans=.75;rough=.35;spec=.4;fm=.25;}}
  else if(sp==31){ // Kenya tree: smooth tan trunk with faint spicule speckle, darker polyp clusters at the tips
    if(part==3){float pp=smoothstep(.55,.75,vnoise(o*14.))*hf;alb=mix(uC2,uC2*.6,pp)*(.9+.15*vnoise(o*5.));h=pp*.02;trans=.4;rough=.5;spec=.3;fm=.4;}
    else{alb=mix(uC1,uC1*.85,vnoise(o*3.))*(1.-.12*smoothstep(.7,.9,vnoise(o*25.))*hf);trans=.35;rough=.55;spec=.25;fm=.1;}}
  else if(sp==32){ // elegance: green striped disc, translucent grey-green tentacles with magenta swollen tips
    if(part==0){alb=uC1*.4*(.8+.3*fbm(o*2.));rough=.8;spec=.1;}
    else if(part==3){float rr=uv.x,an=uv.y*TAU;float st=.5+.5*sin(an*22.+rr*3.);alb=mix(uC3*.7,uC3,st*smoothstep(.15,.5,rr));alb=mix(alb,uC3*.4,smoothstep(.12,.0,rr));fm=.8;trans=.35;rough=.45;spec=.35;}
    else{float tp=smoothstep(.8,.92,tf);float ln=.5+.5*sin(uv.x*TAU*5.);alb=mix(uC1*(.85+.15*ln),uC2,tp);trans=.7;rough=.35;spec=.45;fm=.2+.8*tp;}}
  else if(sp==33){ // scroll coral: yellow-green plates furred with small polyps, a pale growing rim, plain underside
    vec2 q=o.xz*4.2+o.y*1.3;vec2 c=fract(q+vec2(.5*floor(q.y),0.))-.5;float aa=1.-smoothstep(.3,.8,length(fwidth(q)));float pol=smoothstep(.36,.1,length(c))*aa;
    float fur=vnoise(o*16.)*.5+vnoise(o*33.)*.5;float edge=smoothstep(.85,1.,tf);
    alb=mix(uC1*.8,uC2,pol*.7)*(.85+.25*fur*hf);alb=mix(alb,uC3,edge*.7);h=pol*.05+fur*.02*hf;fm=.3+.3*pol;trans=.2;rough=.75;spec=.12;
    if(part==0){alb=uC1*.55;h*=.3;}}
  else if(sp==34){ // clove polyps: dull mat, tall translucent stalks, flowers of eight pinnate tentacles around a pale mouth
    if(part==0){alb=uC1*.6*(.8+.3*fbm(o*2.));rough=.65;spec=.2;trans=.2;}
    else if(part==1){alb=mix(uC1,uC2*.7,tf);trans=.6;fm=.2;rough=.4;}
    else{float edge=abs(uv.x-.5)*2.;float pin=smoothstep(.25,.75,.5+.5*sin(tf*40.-edge*2.));float fr=smoothstep(.3,.75,edge);
      alb=mix(uC2,uC3,pin*fr*.7+tf*.2);alb*=mix(1.,.55,(1.-pin)*fr);trans=.65;fm=.6;rough=.4;spec=.35;}}
  else if(sp==6){ // zoanthids: column, oral disc with a dark mouth, a coloured ring and a bright rim, a skirt of short tentacles
    float id=uv.y;
    if(part==0){alb=uC3*.4*(.8+.3*fbm(o*3.));rough=.85;spec=.1;}
    else if(part==4){alb=mix(uC3*.55,uC3*.85,tf)*(.9+.12*vnoise(vW*8.));rough=.55;spec=.25;trans=.35;}
    else if(part==3){float rr=uv.x;vec3 c=mix(uC1*.35,uC1*1.1,smoothstep(.08,.2,rr));c=mix(c,uC2,smoothstep(.38,.48,rr));c=mix(c,uC3*1.25+.05,smoothstep(.74,.84,rr));
      alb=c*(.85+.3*id);fm=1.;rough=.32;spec=.5;trans=.3;h=smoothstep(.1,.25,rr)*.02;}
    else{alb=mix(uC3,uC2,.35)*(.8+.35*tf)*(.85+.3*id);trans=.55;fm=.7;rough=.4;}}
  else if(sp==7){ // mushrooms: 0 Discosoma (striped, raised mouth), 1 Ricordea (bubbly, contrasting mouth), 2 Rhodactis (hairy)
    if(part!=3){alb=uC1*.45;rough=.7;spec=.15;trans=.3;}
    else{float rr=uv.x,an=uv.y*TAU;vec3 c=mix(uC1,uC2,smoothstep(.35,1.,rr)*.6);
      if(uKind==0){float st=.5+.5*sin(an*30.+sin(rr*9.)*.6);c=mix(c,uC2*1.2,st*.3*smoothstep(.2,.9,rr));h=st*.012;float mo=smoothstep(.14,.0,rr);c=mix(c,uC3,mo);h+=mo*.06;
        vec2 sq=vec2(cos(an),sin(an))*rr*7.;vec2 sc=fract(sq)-.5;float spots=smoothstep(.22,.1,length(sc))*step(.55,hash12(floor(sq)))*smoothstep(.3,.6,rr)*(1.-smoothstep(.3,.8,length(fwidth(sq))));c=mix(c,uC3*.8+.1,spots*.35);h+=spots*.03;}
      else if(uKind==1){vec2 pq=vec2(cos(an),sin(an))*rr*8.;vec2 ce=fract(pq)-.5;float bub=smoothstep(.45,.12,length(ce))*(1.-smoothstep(.3,.8,length(fwidth(pq))));h=bub*.08;c=mix(c,uC2*1.1,bub*.55);c=mix(c,uC3,smoothstep(.22,.07,rr));}
      else{float hair=vnoise(vec3(an*22.,rr*30.,1.))*.6+vnoise(vec3(an*48.,rr*64.,2.))*.4;h=hair*.06;c*=.75+.45*hair;}
      float rim=smoothstep(.86,1.,rr);c=mix(c,uC2*1.15,rim*.5);alb=c;rough=.5;spec=.3;trans=.35;fm=.8;}}
  else if(sp==8){ // leather toadstool: smooth pale stalk, cap furred with polyps (velvety sheen)
    if(part==4){alb=uC3*(.9+.1*fbm(o*1.5));rough=.42;spec=.35;trans=.3;h=fbm(o*3.)*.02;}
    else if(part==0){alb=uC3*.85;rough=.55;spec=.25;trans=.35;}
    else{vec2 q=o.xz*6.;vec2 c=fract(q+vec2(0.,.5*floor(q.x)))-.5;float aa=1.-smoothstep(.3,.8,length(fwidth(q)));float pol=smoothstep(.42,.08,length(c))*aa;float ctr=smoothstep(.12,.0,length(c))*aa;
      float fur=vnoise(o*14.)*.5+vnoise(o*31.)*.5;alb=mix(uC2*.85,uC1*1.15,pol*.8)*(.82+.3*fur);alb=mix(alb,uC3,ctr*.6);h=pol*.06+fur*.03*hf;rough=.9;spec=.08;trans=.38;fm=.3;alb=mix(alb,uC3,smoothstep(.9,1.,tf)*.3);
      float rimF=pow(1.-max(dot(N,V),0.),2.);alb+=uC3*rimF*.18;}}
  else if(sp==9){ // sea fan
    alb=uC1*(.85+.25*vnoise(vW*3.));if(part==4)alb=uC1*.7;float pol=step(.82,vnoise(vW*11.));alb=mix(alb,uC2,pol*.55);rough=.6;spec=.2;trans=.45;fm=.25;}
  else if(sp==10){ // xenia: the eight tentacles carry rows of pinnules
    if(part==4){alb=uC3*(.85+.2*fbm(o*3.));trans=.45;rough=.55;spec=.25;}
    else{float edge=abs(uv.x-.5)*2.;float pin=smoothstep(.25,.75,.5+.5*sin(tf*72.-edge*2.));float fringe=smoothstep(.3,.75,edge);
      alb=mix(uC1,uC2,pin*fringe*.8+tf*.25);alb*=mix(1.,.5,(1.-pin)*fringe);alb*=1.-.25*smoothstep(.12,.0,edge);trans=.75;rough=.45;spec=.3;fm=.45;h=pin*fringe*.03;}}
  else if(sp==11){ // green star polyps
    if(part==0){alb=uC1*(.8+.3*fbm(o*2.));rough=.65;spec=.2;trans=.2;}
    else if(part==1){alb=mix(uC1*.9,uC2*.5,tf);trans=.55;fm=.3;rough=.4;}
    else{alb=uC2*(.9+.2*tf);trans=.55;fm=1.;rough=.35;spec=.4;}}
  else if(sp==12){ // bubble coral: pearly, translucent vesicles over a skeleton of tall, widely spaced septa
    if(part==0){float an=atan(o.z,o.x);float se=pow(.5+.5*cos(an*28.+vnoise(o*.8)*2.),5.)*hf;alb=mix(uC3*.3,uC3*.85,se)*(.85+.25*vnoise(o*4.));h=se*.12;rough=.75;spec=.15;}
    else{float rid=.5+.5*sin(uv.x*7.+uv.y*5.);alb=uC1*(.9+.12*rid);trans=.85;rough=.16;spec=1.;fm=.25;pearl=1.;}}
  else if(sp==13){ // plate coral: dense radial septa, toothed, a slit mouth
    if(part==0){alb=uC1*.4;}
    else{float an=uv.y*TAU,rr=uv.x;float sc=an*96./TAU;float sep=abs(fract(sc)-.5)*2.;float aa=1.-smoothstep(.35,.9,fwidth(sc));
      float major=step(.5,fract(floor(sc)*.5));float rid=smoothstep(.42,.05,sep)*aa*(.55+.45*major)*smoothstep(.04,.14,rr);
      float teeth=smoothstep(.45,.75,vnoise(vec3(rr*55.,floor(sc),1.)))*rid;h=rid*.16+teeth*.05-(1.-rid)*aa*.03;
      float mouth=smoothstep(.1,.05,length(vec2(cos(an)*rr,sin(an)*rr*2.)));alb=mix(uC1*.62,uC2,rid*.75+smoothstep(.6,1.,rr)*.2);alb=mix(alb,uC2*1.15+.03,teeth*.4);alb=mix(alb,uC3,mouth);fm=.25+.45*rid;rough=.5;spec=.3;trans=.2;}}
  else if(sp==14){ // bubble-tip anemone: stem, a swollen striped bulb, then a narrow glassy tip
    if(part==4){alb=uC3*(.8+.25*fbm(o*2.));rough=.5;spec=.3;trans=.35;}
    else if(part==3){alb=mix(uC3,uC1,.5)*(.9+.15*(.5+.5*sin(uv.y*TAU*24.)));trans=.3;}
    else{float bulb=smoothstep(.62,.74,tf)*smoothstep(.96,.84,tf);float tip=smoothstep(.9,.98,tf);float lines=.5+.5*sin(uv.x*TAU*10.);
      alb=mix(uC1,uC2,bulb);alb*=.88+.16*lines*bulb;alb=mix(alb,uC3,tip);trans=.6+bulb*.2;rough=.3;spec=.55;fm=.35+.5*bulb;}}
  else if(sp==15){ // carpet anemone: dense sticky nubs over the ruffled disc
    if(part==0){alb=mix(uC1,vec3(.55,.45,.32),.55)*.75;rough=.6;spec=.2;}
    else{vec2 q=o.xz*5.;q+=vec2(vnoise(o*.9),vnoise(o*.9+4.))*.8;vec2 c=fract(q+vec2(.5*floor(q.y),0.))-.5;float aa=1.-smoothstep(.3,.8,length(fwidth(q)));float nub=smoothstep(.46,.08,length(c))*aa;
      h=nub*.1;alb=mix(uC1*.7,uC2,nub*.6+smoothstep(.75,1.,uv.x)*.2)*(.85+.25*vnoise(o*.6));alb=mix(alb,uC1*.5,(1.-aa)*.3);alb=mix(alb,uC3,smoothstep(.07,.03,uv.x));fm=.35+.3*nub;rough=.45;spec=.35;trans=.35;}}
  else if(sp==16){ // rock flower anemone
    if(part==4){alb=uC3*.55;}
    else if(part==3){float rr=uv.x,an=uv.y*TAU;float spoke=.5+.5*cos(an*16.);float ring=smoothstep(.3,.42,rr)*smoothstep(.75,.62,rr);
      alb=mix(uC1,uC2,ring);alb=mix(alb,uC3,spoke*smoothstep(.55,.9,rr)*.7);alb=mix(alb,uC1*.5,smoothstep(.1,.0,rr));h=spoke*.02*rr;fm=.8;trans=.3;rough=.4;spec=.4;}
    else{alb=mix(uC3,uC2,tf);trans=.5;fm=.6;}}
  else if(sp==17){ // seagrass: parallel veins, old tips dusted with epiphytes
    float pv=sin(uv.x*TAU*3.)*.5+.5;alb=uC1*(.85+.15*pv)*mix(.75,1.1,tf);trans=.6;rough=.5;spec=.3;bleach=false;
    float epi=smoothstep(.6,.8,vnoise(vec3(uv.x*4.,tf*20.,vExt.x*3.)))*smoothstep(.4,.9,tf);alb=mix(alb,vec3(.55,.5,.45),epi*.35);}
  else if(sp==18){alb=uC1*(.85+.25*vnoise(vW*6.));alb=mix(alb,uC2,smoothstep(.38,.5,length(uv-.5))*.6);rough=.8;spec=.15;trans=.3;h=vnoise(vW*14.)*.02;bleach=false;}
  else if(sp==19){alb=mix(uC1,uC2,tf)*(.85+.25*vnoise(vW*5.));trans=.55;rough=.5;spec=.3;fm=.15;bleach=false;}
  else if(sp==20){ // feather duster: sandy parchment tube; banded radioles with pinnules
    if(part==0){float gr=vnoise(o*18.)*.6+vnoise(o*40.)*.4;alb=mix(vec3(.4,.36,.3),vec3(.6,.56,.48),gr);rough=.9;spec=.1;h=gr*.04;}
    else{float band=smoothstep(.35,.65,.5+.5*sin(tf*38.));float edge=abs(uv.x-.5)*2.;float pin=.5+.5*sin(edge*30.-tf*55.);float rach=smoothstep(.12,.0,edge);
      alb=mix(uC1,uC2,band*.85);alb=mix(alb,uC3,smoothstep(.8,1.,tf)*.5);alb*=.7+.4*pin;alb=mix(alb,uC2*.7,rach*.6);alb*=1.-smoothstep(.85,1.,edge)*.35;trans=.7;rough=.45;spec=.3;fm=.25;}
    bleach=false;}
  else if(sp==21||sp==23){ // clams
    if(part==0){float rib=sp==21?.5+.5*cos(uv.x*TAU*5.):.5;float gl=.5+.5*sin(uv.y*55.+vnoise(o*2.)*3.);alb=mix(vec3(.6,.58,.53),vec3(.8,.78,.72),gl*.5)*(.85+.2*rib);
      alb=mix(alb,vec3(.5,.22,.42),smoothstep(.6,.8,fbm(o*.5))*.5);alb=mix(alb,vec3(.25,.24,.12),smoothstep(.6,.75,fbm(o*1.3+5.))*.4);h=rib*.05+gl*.012*hf;rough=.75;spec=.2;bleach=false;
      if(sp==23){float rb=.5+.5*cos(uv.x*TAU*26.+vnoise(o*3.)*2.);alb=mix(vec3(.2,.12,.08),vec3(.4,.27,.17),rb*.6+gl*.3)*(.85+.25*vnoise(o*7.));h=rb*.03+gl*.01*hf;rough=.85;spec=.12;}}
    else if(part==3&&sp==21){float u=uv.x,w=uv.y;float s1=vnoise(vec3(u*38.,w*6.,1.)),s2=vnoise(vec3(u*90.,w*14.,2.));
      vec3 c=mix(uC1,uC2,smoothstep(.45,.7,s1));float edgeW=smoothstep(.72,.98,abs(w));c=mix(c,uC3,edgeW*.7);c=mix(c,vec3(.55,.95,1.),smoothstep(.72,.8,s2)*edgeW*.6);
      if(uKind==2)c=mix(c,uC3,(.5+.5*sin(w*26.+sin(u*30.)*1.5))*.45);
      vec2 sq=vec2((u-.7)*6.,w*2.4);float sip=smoothstep(.45,.3,length(sq));c=mix(c,c*.22,sip);alb=c;irid=.85*(1.-sip);rough=.3;spec=.55;trans=.2;fm=.55;}
    else if(part==3){float u=uv.x,w=uv.y;alb=uC1*(.85+.2*vnoise(vec3(u*30.,w*5.,1.)));float flash=pow(.5+.5*sin(u*38.-uTime*7.+sin(uTime*1.1+u*3.)*5.),14.)*smoothstep(.55,.95,abs(w));
      alb=mix(alb,vec3(.95),flash*.8);emis=vec3(.85,.9,1.)*flash*(.2+lum(uLcol)*.25);rough=.4;spec=.4;trans=.4;bleach=false;}
    else{alb=uC1*(.8+.3*tf);trans=.55;rough=.4;bleach=false;}}
  else if(sp==22){float por=smoothstep(.6,.8,vnoise(o*7.))*.6;alb=uC1*(.8+.3*fbm(o*2.))*(1.-por*.4);if(part==0)alb=uC1*.32;h=-por*.03+vnoise(o*20.)*.02*hf;rough=.85;spec=.1;trans=.25;bleach=false;}
  // poor water slowly bleaches coral tissue toward white
  if(bleach)alb=mix(alb,vec3(.86,.84,.8),(1.-uHealth)*.75);
  if(h!=0.)N=perturb(N,vW,h);
  vec3 col=lighting(vW,N,V,alb,rough,spec,trans,ao);
  if(inWater(vW)){float dep=max(uWL-vW.y,0.);vec3 Lc=uLcol*exp(-uAbs*dep);float nv=max(dot(N,V),0.);
    // light through thin tissue seen against the lamp
    float bl=pow(max(dot(-V,uLdir),0.),3.);col+=alb*alb*Lc*trans*bl*.8*shadow1(vW+N*.2);
    // fluorescence: pigments in the tissue absorb blue and violet light and glow green, orange or red (strongest under actinics)
    if(fm>0.){float ex=uLcol.b*exp(-uAbs.b*dep*1.1)*(.35+.65*shadow1(vW+N*.25));col+=uFl.rgb*uFl.w*fm*ex*.21*mix(1.,.35,1.-uHealth);}
    // giant clam mantle: iridophores flash blue-green with the viewing angle
    if(irid>0.){vec3 tf2=film(nv,.24+.04*sin(uv.x*30.),1.5);col+=irid*tf2*(Lc*.18+uFogC*2.)*uC3*1.6;}
    if(pearl>0.){float fr=.04+.96*pow(1.-nv,4.);col+=envColor(reflect(-V,N))*fr*.8+Lc*pow(max(dot(reflect(-V,N),uLdir),0.),40.)*.6*shadow1(vW);}}
  col+=emis;
  if(uSel>0.)col+=vec3(.04,.11,.1)*uSel*(.6+.4*sin(uTime*4.));
  oC=vec4(applyWater(col,vW),1.);}`;
