// ---------- soft corals ----------
// leather toadstool (Sarcophyton): smooth pale stalk, a broad folded cap furred with tiny polyps (photo: mushroom-shaped, cap edge rolled into waves)
function genLeather(seed){const r=rng(seed),mb=new MB(),sp=CSP.leather,H=4.5+r()*2,R=5.5+r()*1.5,off=r()*30,lean=[(r()-0.5)*1.2,0,(r()-0.5)*1.2];
  const top=[lean[0],H,lean[2]];
  tube(mb,crs([[0,0,0],[lean[0]*0.3,H*0.4,lean[2]*0.3],[lean[0]*0.8,H*0.85,lean[2]*0.8],top],10),t=>1.9-0.4*Math.sin(PI*t)+0.6*Math.pow(t,5),14,{col:t=>[0,0,0,0.08*t],ext:t=>[0,sp,0.4+0.4*t,4]});
  const NA=104,NR=12,fold=5+Math.floor(r()*3);
  const P=(u,v,s)=>{const a=u*TAU,ed=Math.pow(v,2.2),rr=R*v*(1+0.1*Math.sin(a*2+off));const y=H+1.5*(1-v*v)-1.7*ed*(0.6+0.4*Math.sin(a*fold+off))-0.22*ed*Math.sin(a*fold*2.2+off*3)+s*0.55*(1-0.6*v);
    return[top[0]+Math.cos(a)*rr,y,top[2]+Math.sin(a)*rr];};
  for(const s of[1,-1]){const b=mb.n;for(let j=0;j<=NR;j++)for(let i=0;i<=NA;i++){const u=i/NA,v=0.001+0.999*j/NR;mb.v(P(u,v,s),[0,s,0],[u*R*2,v],[0,0,0,0.35*v*v],[off,sp,s>0?0.7+0.3*v:0.35+0.25*v,s>0?1:0]);}
    for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){const q0=b+j*(NA+1)+i;s>0?mb.q(q0,q0+NA+1,q0+NA+2,q0+1):mb.q(q0,q0+1,q0+NA+2,q0+NA+1);}}
  {const b=mb.n;for(let i=0;i<=NA;i++){const u=i/NA;for(const s of[1,-1])mb.v(P(u,1,s*1.0),[0,1,0],[u*R*2,1],[0,0,0,0.35],[off,sp,0.8,1]);}for(let i=0;i<NA;i++){const a=b+i*2;mb.q(a,a+2,a+3,a+1);}}
  return mb.normals();}
// sea fan (Gorgonia): a flat lattice of thin branches radiating from a short trunk, fine cross-links between them
function genFan(seed){const r=rng(seed),mb=new MB(),sp=CSP.fan,RF=10+r()*4,off=r()*40,th0=-1.15,th1=1.15;
  const Rof=th=>RF*(0.82+0.18*Math.cos(th*1.6)+0.08*Math.sin(th*5+off));
  const P=(th,rr)=>{const x=Math.sin(th)*rr,y=1.2+Math.cos(th)*rr*0.95;return[x,y,0.9*Math.sin(x*0.25+off)*(rr/RF)+0.4*Math.sin(y*0.3)];};
  const fl=rr=>Math.pow(rr/RF,1.3)*1.2;
  tube(mb,[[0,0,0],[0,0.7,0],[0,1.4,0]],[0.45,0.38,0.32],8,{col:()=>Z4,ext:()=>[0,sp,0.5,4]});
  const nm=5+Math.floor(r()*3);for(let k=0;k<nm;k++){const th=lerp(th0*0.8,th1*0.8,(k+0.5)/nm)+(r()-0.5)*0.15,pts=[],R1=Rof(th)*(0.8+r()*0.15);for(let i=0;i<=14;i++){const rr=0.2+R1*i/14;pts.push(P(th+0.05*Math.sin(i*0.8+k),rr));}
    tube(mb,pts,t=>lerp(0.2,0.06,t),6,{col:(t)=>[0,0,0,fl(t*R1)],ext:t=>[0,sp,0.6,4]});}
  const nr=46;for(let k=0;k<nr;k++){const th=lerp(th0,th1,k/(nr-1))+(r()-0.5)*0.02,R1=Rof(th),pts=[];const r0=0.25*R1+r()*1.5;const n=16;for(let i=0;i<=n;i++){const rr=lerp(r0,R1,i/n);pts.push(P(th+0.012*Math.sin(rr*1.7+k*1.3),rr));}
    tube(mb,pts,0.07,4,{col:(t,u)=>[0,0,0,fl(lerp(r0,R1,t))],ext:()=>[0,sp,0.8,1]});}
  for(let rr=2.2;rr<RF;rr+=0.62){const pts=[];let ok=0;for(let i=0;i<=40;i++){const th=lerp(th0,th1,i/40);if(rr>Rof(th)*0.985){if(pts.length>1)break;else continue;}pts.push(P(th,rr+0.15*Math.sin(th*31+rr*3)));}
    if(pts.length>2)tube(mb,pts,0.06,4,{col:()=>[0,0,0,fl(rr)],ext:()=>[0,sp,0.8,1]});}
  return mb.normals();}
// pulsing xenia: soft stalks crowned with polyps whose eight feathery tentacles open and close (photo: pale cream-pink clusters)
function genXenia(seed){const r=rng(seed),mb=new MB(),sp=CSP.xenia,ns=5+Math.floor(r()*5);
  for(let k=0;k<ns;k++){const a=r()*TAU,rr=k===0?0:0.8+r()*1.5,Hs=1.8+r()*2,top=[Math.cos(a)*rr*1.4,Hs,Math.sin(a)*rr*1.4];
    tube(mb,crs([[Math.cos(a)*rr*0.5,0,Math.sin(a)*rr*0.5],[Math.cos(a)*rr,Hs*0.5,Math.sin(a)*rr],top],8),t=>lerp(0.6,0.5,t),9,{col:t=>[0,0,0,0.25*t],ext:t=>[0,sp,0.4+0.5*t,4]});
    const np=14+Math.floor(r()*8);
    for(let j=0;j<np;j++){const pa=r()*TAU,pr=Math.sqrt(r())*0.8,ax=V.norm([Math.cos(pa)*(0.4+pr),1,Math.sin(pa)*(0.4+pr)]),pb=[top[0]+Math.cos(pa)*pr,top[1]+0.1,top[2]+Math.sin(pa)*pr],c=V.madd(pb,ax,0.45+r()*0.4),ph=r()*TAU;
      tube(mb,[pb,c],0.11,5,{col:()=>[0,0,0,0.3],ext:()=>[ph,sp,0.75,4]});
      const s1=V.perp(ax),s2=V.cross(ax,s1),L=1.0+r()*0.4;
      for(let i=0;i<8;i++){const ta=i/8*TAU,out=V.norm(V.add(V.add(V.mul(s1,Math.cos(ta)),V.mul(s2,Math.sin(ta))),V.mul(ax,0.45)));
        leaf(mb,{base:c,dir:out,side:V.cross(ax,out),len:L,width:0.17,prof:t=>Math.pow(Math.sin(PI*Math.min(1,0.15+t*0.85)),0.6),segs:5,curl:-0.8,flex:()=>0.35,phase:ph,sp,part:2,
          disp:(t,P)=>{const q=V.madd(V.madd(c,ax,t*L*0.75),V.sub(P,c),0.12);return V.sub(q,P);},ao:()=>0.95});}}}
  return mb.normals();}
// green star polyps: a purple encrusting mat with hundreds of tiny star-shaped polyps on short stalks
function genGSP(seed,clove){const r=rng(seed),mb=new MB(),sp=clove?CSP.clove:CSP.gsp;
  blob(mb,[0,0.1,0],[5,0.45,4],3,0.35,r()*20,()=>[0,sp,0.5,0]);
  const n=clove?110+Math.floor(r()*30):380+Math.floor(r()*80);
  for(let k=0;k<n;k++){const a=k*2.39996+r()*0.2,rr=Math.sqrt((k+r())/n),x=Math.cos(a)*rr*4.6,z=Math.sin(a)*rr*3.6,base=[x,0.32*(1-rr*rr)+0.15,z],ax=V.norm([x*0.05+(r()-0.5)*0.4,1,z*0.05+(r()-0.5)*0.4]),h=clove?0.45+r()*0.5:0.22+r()*0.3,ph=r()*TAU;
    const tp=V.madd(base,ax,h),dn=V.sub(base,tp);tube(mb,[base,tp],clove?0.12:0.075,clove?5:4,{col:t=>[dn[0]*t*0.85,dn[1]*t*0.85,dn[2]*t*0.85,0.3*t],ext:t=>[ph,sp,0.6+0.3*t,1]});
    const s1=V.perp(ax),s2=V.cross(ax,s1);for(let i=0;i<8;i++){const ta=i/8*TAU,out=V.norm(V.add(V.add(V.mul(s1,Math.cos(ta)),V.mul(s2,Math.sin(ta))),V.mul(ax,0.15)));
      leaf(mb,{disp:(t,P)=>V.sub(V.madd(base,ax,0.05),P),base:tp,dir:clove?V.norm(V.add(out,V.mul(ax,0.5))):out,side:V.cross(ax,out),len:clove?0.75+r()*0.2:0.32+r()*0.08,width:clove?0.16:0.075,prof:clove?(t=>Math.sin(PI*Math.min(1,0.12+t*0.88))):(t=>1-t*0.7),segs:clove?4:2,curl:clove?-0.6:0,flex:()=>0.4,phase:ph,sp,part:2,ao:()=>1});}}
  return mb.normals();}
// orange or yellow tube sponges: a few open tubes leaning out of the rock
function genSponge(seed){const r=rng(seed),mb=new MB(),sp=CSP.sponge,n=3+Math.floor(r()*3);
  for(let k=0;k<n;k++){const a=k/n*TAU+r(),lean=0.15+r()*0.35,H=3.5+r()*5,R=0.75+r()*0.45,b0=[Math.cos(a)*0.8,0,Math.sin(a)*0.8],top=[b0[0]+Math.cos(a)*lean*H,H,b0[2]+Math.sin(a)*lean*H],off=r()*20;
    const pts=crs([b0,V.lerp(b0,top,0.5),top],8);
    tube(mb,pts,t=>R*(0.85+0.2*t),14,{col:()=>Z4,ext:t=>[off,sp,0.45+0.5*t,1],rmod:(t,u,pp)=>1+0.08*Math.sin(u*TAU*3+off)*(1-t)});
    tube(mb,pts.map(p=>[p[0],p[1]+0.001,p[2]]),t=>R*(0.85+0.2*t)*0.72,14,{col:()=>Z4,ext:()=>[off,sp,0.35,0]});
    const e=top,R1=R*1.05,R2=R1*0.72,b=mb.n;for(let i=0;i<=20;i++){const aa=i/20*TAU;mb.v([e[0]+Math.cos(aa)*R1,e[1],e[2]+Math.sin(aa)*R1],[0,1,0],[i/20,1],Z4,[off,sp,0.9,1]);mb.v([e[0]+Math.cos(aa)*R2,e[1],e[2]+Math.sin(aa)*R2],[0,1,0],[i/20,1],Z4,[off,sp,0.6,1]);}
    for(let i=0;i<20;i++){const q0=b+i*2;mb.q(q0,q0+2,q0+3,q0+1);}}
  const m=mb.normals();
  // inner walls face inward
  for(let i=0;i<m.n;i++)if(m.E[i*4+3]<0.5){m.N[i*3]*=-1;m.N[i*3+1]*=-1;m.N[i*3+2]*=-1;}
  return m;}
// ---------- anemones ----------
// bubble-tip anemone: a short column, an oral disc, and many tentacles that swell into a bulb just below a narrow tip
function genBTA(seed){const r=rng(seed),mb=new MB(),sp=CSP.bta,Rd=2.6+r()*0.9,H=1.3;
  tube(mb,[[0,0,0],[0,H*0.6,0],[0,H,0]],[1.5,1.35,1.7],16,{col:()=>Z4,ext:()=>[0,sp,0.4,4]});
  const c=mb.v([0,H+0.15,0],[0,1,0],[0,0],Z4,[0,sp,0.5,3]);for(let i=0;i<=24;i++){const a=i/24*TAU;mb.v([Math.cos(a)*Rd,H,Math.sin(a)*Rd],[0,1,0],[1,i/24],Z4,[0,sp,0.5,3]);}for(let i=0;i<24;i++)mb.t(c,c+2+i,c+1+i);
  const n=95+Math.floor(r()*30);
  for(let k=0;k<n;k++){const a=k*2.39996+r()*0.3,rd=Rd*Math.sqrt((k+0.5)/n)*0.95,base=[Math.cos(a)*rd,H+0.1,Math.sin(a)*rd],out=[Math.cos(a)*(0.2+rd/Rd*0.75),1,Math.sin(a)*(0.2+rd/Rd*0.75)];
    const len=3.6+r()*2.4,ph=r()*TAU,pts=tentPts(base,out,len,14,0.3+rd/Rd*0.55,r,0.45),bp=0.76+r()*0.07;
    // a slim stalk, a smooth swollen bulb about two thirds of the way out, then a long narrowing glassy tip
    tube(mb,pts,t=>(t<bp?lerp(0.15,0.19,t/bp):lerp(0.19,0.1,Math.pow((t-bp)/(1-bp),0.7)))+0.16*Math.exp(-Math.pow((t-bp)/0.09,2)),8,{cap:true,capH:0.5,col:t=>{const q=pts[Math.min(14,Math.round(t*14))],k=0.4*t;return[(base[0]-q[0])*k,(base[1]-q[1])*k,(base[2]-q[2])*k,0.12+1.3*Math.pow(t,1.2)];},ext:t=>[ph,sp,0.55+0.45*t,1+0.9*t]});}
  return mb.normals();}
// carpet anemone: a broad ruffled disc covered in short sticky tentacles (photo: green, deeply ruffled margin)
function genCarpet(seed){const r=rng(seed),mb=new MB(),sp=CSP.carpet,R=7.5+r()*2.5,off=r()*30,k1=7+Math.floor(r()*4),NA=160,NR=22;
  const P=(u,v,s)=>{const a=u*TAU,rr=R*v*(1+0.1*Math.sin(a*3+off)),y=1.1+0.7*Math.pow(1-v,2)+1.5*Math.pow(v,3.2)*Math.sin(a*k1+off+Math.sin(a*3+off))*(0.75+0.25*Math.sin(a*2.3))+0.5*Math.pow(v,4)*Math.sin(a*k1*2.7+off*2)-0.6*Math.pow(v,4)+s*0.5*(1-0.55*v);return[Math.cos(a)*rr,y,Math.sin(a)*rr];};
  for(const s of[1,-1]){const b=mb.n;for(let j=0;j<=NR;j++)for(let i=0;i<=NA;i++){const u=i/NA,v=Math.max(0.02,j/NR);mb.v(P(u,v,s),[0,s,0],[v,u],[0,0,0,0.28*v*v],[off,sp,s>0?0.6+0.4*v:0.3,s>0?3:0]);}
    for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){const q0=b+j*(NA+1)+i;s>0?mb.q(q0,q0+1,q0+NA+2,q0+NA+1):mb.q(q0,q0+NA+1,q0+NA+2,q0+1);}}
  return mb.normals();}
// rock flower anemone: small, patterned oral disc ringed with short tentacles
function genFlower(seed){const r=rng(seed),mb=new MB(),sp=CSP.flower,R=3.2+r()*0.9,off=r()*20;
  tube(mb,[[0,0,0],[0,0.7,0]],[1.1,1.3],12,{col:()=>Z4,ext:()=>[0,sp,0.4,4]});
  const NA=40,NR=8,b=mb.n;for(let j=0;j<=NR;j++)for(let i=0;i<=NA;i++){const u=i/NA,v=j/NR,a=u*TAU;mb.v([Math.cos(a)*R*v,0.75+0.25*v*v+0.12*Math.sin(a*8+off)*v*v,Math.sin(a)*R*v],[0,1,0],[v,u],[0,0,0,0.08*v],[off,sp,0.7+0.3*v,3]);}
  for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){const q0=b+j*(NA+1)+i;mb.q(q0,q0+1,q0+NA+2,q0+NA+1);}
  const nt=64;for(let i=0;i<nt;i++){const a=i/nt*TAU+(i%2)*0.05,out=[Math.cos(a),0.35+0.15*(i%2),Math.sin(a)];
    leaf(mb,{base:[Math.cos(a)*R*0.98,0.95+0.12*Math.sin(a*8+off),Math.sin(a)*R*0.98],dir:V.add(out,[0,0.25,0]),side:[-Math.sin(a),0,Math.cos(a)],len:0.6+r()*0.25,width:0.34,prof:t=>Math.sqrt(Math.max(0,1-t*t*0.9)),segs:4,droop:0.6,flex:()=>0.2,phase:off+a,sp,part:2,ao:()=>1});}
  return mb.normals();}
// ---------- macroalgae and seagrass ----------
function genGrass(seed){const r=rng(seed),mb=new MB(),sp=CSP.grass,n=10+Math.floor(r()*8);
  for(let k=0;k<n;k++){const x=(r()-0.5)*6,z=(r()-0.5)*4,ta=r()*TAU,tilt=0.05+r()*0.25,len=10+r()*12,ph=r()*TAU,g=r();
    leaf(mb,{base:[x,0,z],dir:[Math.cos(ta)*tilt,1,Math.sin(ta)*tilt],side:[-Math.sin(ta),0,Math.cos(ta)],len,width:0.75+r()*0.35,prof:t=>Math.min(1,0.25+t*14)*Math.pow(t>0.93?(1-t)/0.07:1,0.5)+0.05,
      droop:0.2+r()*0.4,twist:(r()-0.5)*1.5,segs:18,flex:p=>Math.pow(clamp(p[1]/20,0,1),1.2)*2.2,phase:ph,sp,part:1,ao:t=>0.4+0.6*Math.min(1,t*4),fold:0.05});}
  return mb.normals();}
// Halimeda: branching chains of flat, calcified, kidney-shaped segments
function genHalimeda(seed){const r=rng(seed),mb=new MB(),sp=CSP.halimeda;
  const seg=(c,d,R,ph,f)=>{const s0=V.norm(V.cross(d,[0.2,0.1,1])),s1=V.rot(s0,d,(r()-0.5)*1.6),b=mb.n,N=12;mb.v(c,V.cross(s1,d),[0.5,0.5],[0,0,0,f],[ph,sp,0.8,1]);
    for(let i=0;i<=N;i++){const a=i/N*TAU,rr=R*(1-0.18*Math.max(0,Math.cos(a+PI/2))*0);mb.v(V.add(c,V.add(V.mul(s1,Math.cos(a)*rr*1.15),V.mul(d,Math.sin(a)*rr*0.85))),V.cross(s1,d),[0.5+Math.cos(a)*0.5,0.5+Math.sin(a)*0.5],[0,0,0,f],[ph,sp,0.85,1]);}
    for(let i=0;i<N;i++)mb.t(b,b+1+i,b+2+i);};
  const chain=(p,d,n,R,ph,depth)=>{let c=p.slice(),dd=V.norm(d);for(let i=0;i<n;i++){const f=clamp(c[1]/12,0,1)*0.9;seg(c,dd,R*(1-i*0.03),ph,f);
      if(depth<3&&r()<0.42){const nd=V.norm(V.add(V.rot(dd,[0,0,1],(r()<0.5?-1:1)*0.7),[r()-0.5,0,r()-0.5]));chain(V.madd(c,nd,R*1.5),nd,n-i-1,R*0.95,ph+1,depth+1);}
      dd=V.norm(V.add(dd,[(r()-0.5)*0.3,0.08,(r()-0.5)*0.3]));c=V.madd(c,dd,R*1.55);}};
  const n=6+Math.floor(r()*4);for(let k=0;k<n;k++){const a=r()*TAU;chain([Math.cos(a)*0.7,0.2,Math.sin(a)*0.7],[Math.cos(a)*0.45,1,Math.sin(a)*0.45],5+Math.floor(r()*4),0.55+r()*0.14,r()*TAU,0);}
  const m=mb.normals();return m;}
// red macroalgae (Gracilaria): bushy, forking, fleshy red branches
function genRedMacro(seed){const r=rng(seed),mb=new MB(),sp=CSP.redmacro;
  const br=(p,d,len,rad,depth,ph)=>{const pts=tentPts(p,d,len,Math.max(3,Math.round(len/0.7)),-0.1,r,0.6);
    tube(mb,pts,t=>lerp(rad,rad*0.6,t),5,{cap:true,col:(t)=>[0,0,0,clamp((pts[0][1]+t*len)/10,0,1)*1.1],ext:t=>[ph,sp,0.5+0.5*clamp(pts[0][1]/8,0,1),1+0.9*t]});
    if(depth<3){const nk=2+Math.floor(r()*2);for(let k=0;k<nk;k++){const i=Math.floor(pts.length*(0.4+r()*0.5)),pd=V.norm(V.sub(pts[Math.min(pts.length-1,i+1)],pts[i]));const nd=V.norm(V.add(V.rot(pd,V.perp(pd),0.6+r()*0.5),[0,0.3,0]));br(pts[i],nd,len*0.6,rad*0.8,depth+1,ph);}}};
  const n=4+Math.floor(r()*3);for(let k=0;k<n;k++){const a=r()*TAU;br([Math.cos(a)*0.5,0,Math.sin(a)*0.5],[Math.cos(a)*0.5,1,Math.sin(a)*0.5],3.5+r()*2,0.17,0,r()*TAU);}
  return mb.normals();}
// ---------- feather duster worm: a parchment tube and a two-lobed crown of banded, feathery radioles that snap back into the tube ----------
function genDuster(seed){const r=rng(seed),mb=new MB(),sp=CSP.duster,H=2+r()*2.5,lean=[(r()-0.5)*1.5,0,(r()-0.5)*1.5],top=[lean[0],H,lean[2]];
  tube(mb,crs([[0,0,0],[lean[0]*0.4,H*0.5,lean[2]*0.4],top],8),0.45,10,{col:()=>Z4,ext:t=>[0,sp,0.5+0.4*t,0]});
  const ax=V.norm([lean[0]*0.15,1,lean[2]*0.15]),s1=V.perp(ax),s2=V.cross(ax,s1),n=44+Math.floor(r()*12),L=3.8+r()*1.4,ph=r()*TAU;
  for(let k=0;k<n;k++){const lobe=k%2,a=(lobe?PI:0)+(Math.floor(k/2)/(n/2)-0.5)*2.9,out=V.add(V.mul(s1,Math.cos(a)),V.mul(s2,Math.sin(a)));const dir=V.norm(V.add(V.mul(out,0.62),V.mul(ax,1.0)));
    leaf(mb,{base:V.madd(top,out,0.3),dir,side:V.cross(ax,out),len:L*(0.9+r()*0.2),width:0.3,prof:t=>Math.pow(Math.sin(PI*Math.min(1,0.08+t*0.92)),0.35),segs:9,curl:-0.35,droop:0.35,twist:0.6,flex:()=>0.35,phase:ph+lobe,sp,part:2,
      disp:(t,P)=>V.sub(V.madd(top,ax,-0.6-t*0.4),P),ao:t=>0.7+0.3*t});}
  return mb.normals();}
// ---------- giant clam (Tridacna): two heavy ribbed valves with a wavy gape, the coloured mantle spread over it ----------
// photos: the mantle bulges out over the zig-zag shell edge, with an oval incurrent siphon; kind 1 is a small disco (file) clam
function genClam(seed,disco){const r=rng(seed),mb=new MB(),sp=disco?CSP.disco:CSP.clam,L=disco?5.5:10+r()*3,Wd=disco?1.7:2.6+r()*0.6,Dp=disco?1.5:4.2+r()*0.8,folds=disco?0:5,NU=48,NV=14,off=r()*20;
  const w=u=>Wd*Math.pow(Math.sin(PI*u),0.55),D=u=>Dp*Math.pow(Math.sin(PI*u),0.45),f=u=>folds?Math.cos(folds*TAU*(u-0.5)):0,ye=u=>(disco?0.8:1.5)*Math.pow(Math.sin(PI*u),0.4)+0.8*f(u)*Math.sin(PI*u);
  for(const s of[-1,1]){const b=mb.n;for(let j=0;j<=NV;j++)for(let i=0;i<=NU;i++){const u=i/NU,v=j/NV,x=(u-0.5)*L,ph=v*PI/2;
      const zz=s*w(u)*Math.cos(ph)*(1+(disco?0:0.3)*f(u)*(1-v*0.4)),yy=ye(u)*(1-v)-D(u)*Math.sin(ph)+0.15*Math.sin(v*PI);mb.v([x*(1-0.12*v),yy+Dp*0.8,zz],[0,0,s],[u,v],Z4,[0,sp,0.4+0.5*(1-v),0]);}
    for(let j=0;j<NV;j++)for(let i=0;i<NU;i++){const q0=b+j*(NU+1)+i;s>0?mb.q(q0,q0+NU+1,q0+NU+2,q0+1):mb.q(q0,q0+1,q0+NU+2,q0+NU+1);}}
  const NW=12,b=mb.n;
  for(let j=0;j<=NW;j++)for(let i=0;i<=NU;i++){const u=i/NU,wv=j/NW*2-1,x=(u-0.5)*L,sn=Math.pow(Math.sin(PI*u),0.5);
    const zz=wv*(w(u)*(disco?0.6:0.62)+(disco?0.05:0.9)*sn),yy=ye(u)+(disco?0.12:0.5)*(1-wv*wv)*sn-(disco?0:0.55)*Math.pow(Math.abs(wv),4)*sn+0.18*Math.sin(u*22+wv*3+off)*sn;
    mb.v([x*0.98,yy+Dp*0.8+0.05,zz],[0,1,0],[u,wv],[0,-(disco?0.4:1.1)*(1-wv*wv)*sn,-zz*0.55,0.05],[off,sp,0.8,3]);}
  for(let j=0;j<NW;j++)for(let i=0;i<NU;i++){const q0=b+j*(NU+1)+i;mb.q(q0,q0+1,q0+NU+2,q0+NU+1);}
  if(disco){for(let k=0;k<130;k++){const u=0.05+0.9*(k>>1)/64,s=k%2?1:-1,x=(u-0.5)*L,base=[x*0.98,ye(u)+Dp*0.8,s*w(u)*0.62];
      tube(mb,tentPts(base,[0,0.35,s*1.0],0.45+r()*0.35,4,0.9,r,0.5),t=>lerp(0.05,0.022,t),4,{cap:true,col:t=>[0,-0.4*t,-s*0.3*t,0.3*t],ext:t=>[k,sp,0.9,2]});}}
  return mb.normals();}
