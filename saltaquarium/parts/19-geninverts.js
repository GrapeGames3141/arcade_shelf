
// ---------- crabs ----------
// built in straight space: x forward, y up (ground at 0), z to the side. ext.x: 0 body, 1 walking legs (ext.y = t, ext.z = gait phase), 2 claws, 3 eyes, 4 shell, 5 eyestalks and antennae
// type 0: hermit crab in a turbo shell (unit = shell length); type 1: emerald crab (unit = carapace width)
function legInto(mb,base,knee,foot,rad,ph,part=1){const pts=[base,V.lerp(base,knee,0.5),knee,V.lerp(knee,foot,0.5),foot];tube(mb,pts,t=>lerp(rad,rad*0.45,t),5,{cap:true,ext:t=>[part,t,ph,0]});}
function genCrab(type){const mb=new MB();
  if(type===0){shellInto(mb,{base:[-0.08,0.14,0],axis:[-1,0.5,0.12],R:0.4,H:0.95,whorls:4,taper:0.9,round:1.1,flat:0.95,part:4});
    const ic=icosphere(2);{const b=mb.n;for(const p of ic.P)mb.v([0.2+p[0]*0.13,0.2+p[1]*0.09,p[2]*0.11],p,[0,0],[1,1,1,1],[0,0,0,0]);for(const f of ic.F)mb.t(b+f[0],b+f[1],b+f[2]);}
    for(const sg of[-1,1]){tube(mb,[[0.28,0.24,sg*0.03],[0.36,0.33,sg*0.05],[0.4,0.4,sg*0.06]],0.018,5,{ext:()=>[5,0,0,0]});
      {const b=mb.n;for(const p of ic.P)mb.v([0.41+p[0]*0.03,0.42+p[1]*0.03,sg*0.065+p[2]*0.03],p,[0,0],[1,1,1,1],[3,0,0,0]);for(const f of ic.F)mb.t(b+f[0],b+f[1],b+f[2]);}
      tube(mb,crs([[0.3,0.22,sg*0.02],[0.5,0.32,sg*0.06],[0.75,0.36,sg*0.14],[0.95,0.3,sg*0.22]],10),t=>lerp(0.009,0.003,t),4,{ext:t=>[5,t,1,0]});
      const big=sg>0?1.3:0.85,sh=[0.24,0.12,sg*0.08],el=[0.33,0.08,sg*0.17],wr=[0.42,0.1,sg*0.14];
      tube(mb,[sh,el,wr],t=>lerp(0.035,0.03,t)*big,6,{ext:()=>[2,0.3,0,0]});
      tube(mb,[wr,[0.48,0.1,sg*0.12],[0.54,0.09,sg*0.1]],t=>0.05*big*Math.sin(PI*Math.min(1,0.2+t*0.8))+0.01,8,{cap:true,ext:()=>[2,0.8,0,0]});
      for(let k=0;k<2;k++){const bx=0.18-k*0.06;legInto(mb,[bx,0.13,sg*0.08],[bx+0.08-k*0.05,0.2,sg*(0.22+k*0.02)],[bx+0.14-k*0.14,0.0,sg*(0.27+k*0.04)],0.026,k*PI+(sg>0?0:PI*0.5));}}}
  else{const b0=mb.n;grid(mb,24,12,(u,v)=>{const a=u*TAU,k=Math.sin(v*PI/2);return{p:[Math.cos(a)*0.46*k+0.02,0.13+0.16*Math.cos(v*PI/2)*(1-0.1*Math.cos(a)),Math.sin(a)*0.42*k],uv:[u,v],e:[0,0,0,0]};});
    {const c=mb.v([0,0.1,0],[0,-1,0],[0.5,0.5],[1,1,1,1],[0,1,0,0]);for(let i=0;i<=24;i++){const a=i/24*TAU;mb.v([Math.cos(a)*0.46+0.02,0.12,Math.sin(a)*0.42],[0,-1,0],[0,0],[1,1,1,1],[0,1,0,0]);}for(let i=0;i<24;i++)mb.t(c,c+1+i,c+2+i);}
    const ic=icosphere(1);
    for(const sg of[-1,1]){for(let k=0;k<4;k++){const a=(0.35+k*0.32)*PI*0.62,bx=Math.cos(a)*0.38,bz=Math.sin(a)*0.36*sg;
        legInto(mb,[bx,0.13,bz],[bx*1.35+0.02,0.25,bz*1.45],[bx*1.75,0.0,bz*1.85],0.055,k*1.6+(sg>0?0:PI*0.7));}
      const sh=[0.38,0.16,sg*0.16],el=[0.55,0.2,sg*0.22],wr=[0.68,0.16,sg*0.16];tube(mb,[sh,el,wr],0.045,6,{ext:()=>[2,0.3,0,0]});
      tube(mb,[wr,[0.76,0.14,sg*0.13],[0.84,0.12,sg*0.1]],t=>0.05*Math.sin(PI*Math.min(1,0.25+t*0.75))+0.012,7,{cap:true,ext:()=>[2,0.9,0,0]});
      {const b=mb.n;for(const p of ic.P)mb.v([0.44+p[0]*0.035,0.3+p[1]*0.035,sg*0.07+p[2]*0.035],p,[0,0],[1,1,1,1],[3,0,0,0]);for(const f of ic.F)mb.t(b+f[0],b+f[1],b+f[2]);}}}
  return mb.normals();}

// ---------- sea stars ----------
// 0 blue Linckia (long round arms), 1 red Fromia (short, tapering), 2 sand-sifting star (broad, flat, spiny-edged), 3 brittle star (tiny disc, long thin spiny arms)
// unit = arm-tip to arm-tip; ext.x: 0 disc, 1 arm (ext.y = t, ext.z = arm), 2 underside, 3 brittle spines
function genStar(type){const mb=new MB(),P=[{rd:0.07,ra:0.06,L:0.45,fl:0.85},{rd:0.12,ra:0.09,L:0.4,fl:0.7},{rd:0.16,ra:0.1,L:0.36,fl:0.45},{rd:0.08,ra:0.025,L:0.47,fl:0.9}][type];
  blob(mb,[0,P.ra*0.9,0],[P.rd*1.2,P.ra*0.95,P.rd*1.2],2,0.05,type*7,()=>[0,0,0,0],()=>[1,1,1,1]);
  for(let k=0;k<5;k++){const a=k/5*TAU+PI/2,d=[Math.cos(a),0,Math.sin(a)],pts=[];const n=type===3?18:12;
    for(let i=0;i<=n;i++){const t=i/n;const w=type===3?0.25*Math.sin(t*PI*1.2+k):0.05*Math.sin(t*PI+k);const q=V.add(V.mul(d,P.rd*0.6+t*(P.L-P.rd*0.6)),V.mul([-d[2],0,d[0]],w*P.L*0.25));q[1]=P.ra*(1-t*0.45)*0.95+(type===3?0.02*Math.sin(t*9):0);pts.push(q);}
    const prof=type===0?t=>P.ra*(1-0.55*Math.pow(t,1.5)):type===3?t=>P.ra*(1-0.7*t):t=>P.ra*(1-0.85*Math.pow(t,0.9))+0.006;
    tube(mb,pts,prof,type===3?5:10,{cap:true,col:()=>[1,1,1,1],ext:(t)=>[1,t,k,0],rmod:(t,u)=>{const c=Math.cos(u*TAU);return c<-0.2?1-(-c-0.2)*0.55*P.fl:1+(type===2?0.12*Math.pow(Math.abs(Math.sin(u*TAU)),8):0);}});
    if(type===3)for(let i=1;i<n;i++)for(const sg of[-1,1]){const q=pts[i],t=i/n,sd=V.mul([-d[2],0,d[0]],sg);tube(mb,[q,V.add(V.madd(q,sd,P.ra*1.6*(1-t*0.5)),[0,0.004,0])],0.0035,3,{ext:()=>[3,t,k,0]});}}
  const m=mb.normals();
  // flatten onto the ground a little and lift so the arms rest on y = 0
  const bb=m.bounds();for(let i=0;i<m.n;i++)m.P[i*3+1]-=bb.mn[1];return m;}

// ---------- sea urchins ----------
// 0 tuxedo urchin (blue-banded test, short spines), 1 long-spined Diadema (black, needle spines). unit = test diameter
// ext.x: 0 test, 1 spine (ext.y = t, ext.z = phase), 2 tube feet
function genUrchin(type){const mb=new MB(),R=0.5,Hy=type===0?0.42:0.52;
  {const s=icosphere(3),b=mb.n;for(const p of s.P){const y=p[1]>0?p[1]*Hy:p[1]*0.2;mb.v([p[0]*R,y+0.13,p[2]*R],p,[Math.atan2(p[2],p[0])/TAU+0.5,p[1]*0.5+0.5],[1,1,1,1],[0,0,0,0]);}for(const f of s.F)mb.t(b+f[0],b+f[1],b+f[2]);}
  const n=type===0?240:150,ga=PI*(3-Math.sqrt(5));
  for(let i=0;i<n;i++){const yy=1-(i/(n-1))*1.25;if(yy<-0.2)break;const rr=Math.sqrt(Math.max(0,1-yy*yy)),a=i*ga,nrm=[Math.cos(a)*rr,yy,Math.sin(a)*rr];
    const p0=[nrm[0]*R,(nrm[1]>0?nrm[1]*Hy:nrm[1]*0.2)+0.13,nrm[2]*R];const L=type===0?0.13+0.05*Math.sin(i):(1.0+0.5*((i*0.618)%1))*(0.6+0.4*Math.max(0,nrm[1]+0.4));
    const d=V.norm(V.add(nrm,[Math.sin(i*1.7)*0.12,0.08,Math.cos(i*2.3)*0.12])),ph=(i*0.37)%TAU;
    tube(mb,[p0,V.madd(p0,d,L*0.5),V.madd(p0,d,L)],t=>lerp(type===0?0.022:0.016,0.003,t),type===0?4:3,{cap:true,col:()=>[1,1,1,1],ext:t=>[1,t,ph,0]});}
  return mb.normals();}

// ---------- jellyfish ----------
// type 0 moon jelly (Aurelia): translucent bell with four horseshoe gonads, a fringe of fine tentacles, four frilly oral arms. unit = bell diameter
// type 1 upside-down jelly (Cassiopea): lies bell-down on the sand, eight branching frilly oral arms up
// ext.x: 0 bell (ext.y = radius 0..1), 1 marginal tentacles (ext.y = t), 2 oral arms (ext.y = t), 3 vesicles
function genJelly(type){const mb=new MB(),r=rng(11+type);
  if(type===0){const NA=48,NR=14;
    for(const s of[1,-1]){const b=mb.n;for(let j=0;j<=NR;j++)for(let i=0;i<=NA;i++){const v=j/NR,a=i/NA*TAU,y=0.3*Math.pow(1-v*v,0.65)-0.035*v*v*v*v-(s<0?0.03*(1-v):0);mb.v([Math.cos(a)*0.5*v,y,Math.sin(a)*0.5*v],[0,s,0],[v,i/NA],[1,1,1,1],[0,v,s,0]);}
      for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){const q0=b+j*(NA+1)+i;s>0?mb.q(q0,q0+1,q0+NA+2,q0+NA+1):mb.q(q0,q0+NA+1,q0+NA+2,q0+1);}}
    for(let k=0;k<72;k++){const a=k/72*TAU+r()*0.03,b0=[Math.cos(a)*0.5,-0.03,Math.sin(a)*0.5],L=0.15+r()*0.35;
      leaf(mb,{base:b0,dir:[Math.cos(a)*0.35,-1,Math.sin(a)*0.35],side:[-Math.sin(a),0,Math.cos(a)],len:L,width:0.009,prof:()=>1,segs:6,curl:(r()-0.5)*1.2,flex:()=>1,phase:a,sp:0,part:1,ao:()=>1});}
    for(let k=0;k<4;k++){const a=k/4*TAU+0.4,b0=[Math.cos(a)*0.04,0.0,Math.sin(a)*0.04];
      leaf(mb,{base:b0,dir:[Math.cos(a)*0.25,-1,Math.sin(a)*0.25],side:[-Math.sin(a),0,Math.cos(a)],len:0.55+r()*0.15,width:0.075,prof:t=>0.6+0.4*Math.sin(PI*Math.min(1,0.2+t)),segs:12,wave:0.12,waveF:34,twist:2.5,flex:()=>1,phase:a,sp:0,part:2,ao:()=>1});}
    for(let i=0;i<mb.n;i++){const e=mb.E[i*4+3];if(e>=1&&e<3){mb.E[i*4+1]=(e-Math.floor(e))/0.9;mb.E[i*4]=Math.floor(e);}}}
  else{const NA=40,NR=10;
    for(const s of[1,-1]){const b=mb.n;for(let j=0;j<=NR;j++)for(let i=0;i<=NA;i++){const v=j/NR,a=i/NA*TAU,y=0.06+0.05*v*v+(s<0?-0.02:0)+0.015*Math.sin(a*16)*v*v;mb.v([Math.cos(a)*0.5*v,y,Math.sin(a)*0.5*v],[0,s,0],[v,i/NA],[1,1,1,1],[0,v,s,0]);}
      for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){const q0=b+j*(NA+1)+i;s>0?mb.q(q0,q0+1,q0+NA+2,q0+NA+1):mb.q(q0,q0+NA+1,q0+NA+2,q0+1);}}
    const ic=icosphere(1);
    for(let k=0;k<8;k++){const a=k/8*TAU+0.2,pts=[[Math.cos(a)*0.05,0.08,Math.sin(a)*0.05],[Math.cos(a)*0.17,0.16,Math.sin(a)*0.17],[Math.cos(a)*0.3,0.18,Math.sin(a)*0.3],[Math.cos(a)*0.4,0.14,Math.sin(a)*0.4]];
      const cp=crs(pts,10);tube(mb,cp,t=>lerp(0.04,0.02,t),6,{cap:true,col:()=>[1,1,1,1],ext:t=>[2,t,k,0]});
      for(let j=0;j<16;j++){const t=0.15+0.85*j/16,q=cp[Math.min(10,Math.round(t*10))],R=0.035+r()*0.025,off=[(r()-0.5)*0.09,0.02+r()*0.05,(r()-0.5)*0.09],b=mb.n,vs=r()<0.25?3:2;
        for(const p of ic.P)mb.v(V.add(V.add(q,off),V.mul(p,R)),p,[0,0],[1,1,1,1],[vs,t,k,0]);for(const f of ic.F)mb.t(b+f[0],b+f[1],b+f[2]);}}}
  return mb.normals();}

// ---------- peacock mantis shrimp (Odontodactylus scyllarus) ----------
// photos: green banded abdomen, a leopard-spotted carapace, red-orange folded clubs, pink-and-teal stalked eyes, orange antennal scales, red legs.
// unit = body length; x forward. ext.x: 0 body (uv = t from head 0 to tail 1, around), 1 walking legs, 2 raptorial clubs (ext.y = segment 0 upper arm .. 1 club), 3 eyes, 4 antennae and scales, 5 tail fan
function genMantis(){const mb=new MB(),NS=64,S=18,X0=0.48,X1=-0.42;
  const w=t=>t<0.18?lerp(0.05,0.085,t/0.18):t<0.3?0.085:t<0.86?lerp(0.09,0.1,Math.sin(PI*(t-0.3)/0.56)):lerp(0.095,0.06,(t-0.86)/0.14);
  const h=t=>t<0.2?lerp(0.035,0.055,t/0.2):t<0.86?0.058+0.006*Math.sin(PI*(t-0.2)/0.66):lerp(0.055,0.03,(t-0.86)/0.14);
  const seg=t=>{if(t<0.3)return 0;const s=(t-0.3)/0.56*6;return t<0.86?Math.pow(s%1,3)*0.12:0;};
  for(let i=0;i<=NS;i++){const t=i/NS,x=lerp(X0,X1,t),cy=0.075+0.01*Math.sin(t*PI);for(let j=0;j<=S;j++){const a=j/S*TAU,c=Math.cos(a),sn=Math.sin(a);const k=1+seg(t);
      mb.v([x,cy+(sn>0?sn*h(t)*k:sn*h(t)*0.6),c*w(t)*k*(sn>0?1-0.12*sn*sn:1)],[0,1,0],[t,sn],[1,1,1,1],[0,0,0,0]);}}
  for(let i=0;i<NS;i++)for(let j=0;j<S;j++){const a=i*(S+1)+j;mb.q(a,a+1,a+S+2,a+S+1);}
  {const f=mb.v([X0+0.01,0.075,0],[1,0,0],[0,0],[1,1,1,1],[0,0,0,0]);for(let j=0;j<S;j++)mb.t(f,j+1,j);}
  mb.normals();
  const ic=icosphere(2);
  for(const sg of[-1,1]){
    // stalked eyes: two hemispheres with a midband
    tube(mb,[[0.46,0.1,sg*0.015],[0.5,0.14,sg*0.025],[0.52,0.17,sg*0.03]],0.012,5,{ext:()=>[4,0,0,0]});
    {const b=mb.n,c=[0.525,0.19,sg*0.032];for(const p of ic.P)mb.v(V.add(c,[p[0]*0.03,p[1]*0.038,p[2]*0.03]),p,[p[1],p[0]],[1,1,1,1],[3,0,0,0]);for(const f of ic.F)mb.t(b+f[0],b+f[1],b+f[2]);}
    // antennules and antennae, orange antennal scales
    tube(mb,crs([[0.48,0.09,sg*0.01],[0.6,0.14,sg*0.03],[0.72,0.2,sg*0.06],[0.82,0.22,sg*0.1]],8),t=>lerp(0.007,0.002,t),4,{ext:t=>[4,t,1,0]});
    tube(mb,crs([[0.47,0.08,sg*0.03],[0.58,0.08,sg*0.09],[0.66,0.1,sg*0.16],[0.7,0.14,sg*0.24]],8),t=>lerp(0.006,0.002,t),4,{ext:t=>[4,t,1,0]});
    leaf(mb,{base:[0.47,0.085,sg*0.04],dir:[0.6,0.25,sg*0.7],side:[0,1,0],len:0.09,width:0.05,prof:t=>Math.sin(PI*Math.min(1,0.15+t*0.85)),segs:4,flex:()=>0,phase:0,sp:0,part:4,ao:()=>1});
    // raptorial appendage folded under the head like a praying mantis: upper arm back, club forward and down
    const sh=[0.42,0.05,sg*0.04],el=[0.5,0.02,sg*0.07],cl=[0.38,0.015,sg*0.075];
    tube(mb,[sh,V.lerp(sh,el,0.5),el],t=>lerp(0.022,0.026,t),7,{ext:()=>[2,0.2,sg,0]});
    tube(mb,[el,V.lerp(el,cl,0.5),cl],t=>0.03*Math.sin(PI*Math.min(1,0.2+t*0.8))+0.012,8,{cap:true,cap0:true,ext:()=>[2,0.8,sg,0]});
    // walking legs (three pairs) and the tail fan
    for(let k=0;k<3;k++){const bx=0.22-k*0.05;legInto(mb,[bx,0.04,sg*0.05],[bx+0.01,0.03,sg*0.11],[bx-0.02,0.0,sg*0.14],0.009,k*2.1+(sg>0?0:PI));}
    leaf(mb,{base:[X1+0.04,0.075,sg*0.03],dir:[-0.8,-0.05,sg*0.55],side:[0,1,0],len:0.13,width:0.06,prof:t=>Math.sin(PI*Math.min(1,0.15+t*0.85)),segs:4,flex:()=>0,phase:0,sp:0,part:5,ao:()=>1});}
  leaf(mb,{base:[X1+0.02,0.072,0],dir:[-1,-0.05,0],side:[0,0,1],len:0.1,width:0.075,prof:t=>1-t*0.4,segs:3,flex:()=>0,phase:0,sp:0,part:5,ao:()=>1});
  for(let i=0;i<mb.n;i++){const e=mb.E[i*4+3];if(mb.E[i*4+1]===0&&e>=1){mb.E[i*4]=Math.floor(e);mb.E[i*4+1]=(e-Math.floor(e))/0.9;mb.E[i*4+3]=0;}}
  return mb;}
