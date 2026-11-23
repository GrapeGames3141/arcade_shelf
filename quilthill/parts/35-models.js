// ---------- 35-models: hedgehog, bobbins, scissors, button bumpers, scenery ----------
const HOG={r:0.55};
const HOGC={spine:hex('#7a5236'),spineD:hex('#4e3322'),tip:hex('#e8d7bd'),face:hex('#f0dcc0'),belly:hex('#f4e6cf'),nose:hex('#2a1d1a'),blush:hex('#f39aa9'),foot:hex('#c9a27e')};
// curled ball: spiky felt sphere with the face tucked at +z, ball centre at origin
function buildHogBall(){
  const sb=new SB(6000);const r=HOG.r;
  ellipsoid(sb,[0,0,0],[r*0.8,r*0.8,r*0.8],HOGC.spineD,0.05,{jit:0});
  const n=1500,ga=Math.PI*(3-Math.sqrt(5));
  for(let i=0;i<n;i++){const y=1-2*(i+0.5)/n,rr=Math.sqrt(1-y*y),th=i*ga;const d=[Math.cos(th)*rr,y,Math.sin(th)*rr];
    if(d[2]>0.72)continue; // the tucked face patch
    const len=0.1+Math.random()*0.08;
    for(let k=0;k<3;k++){const t=k/2;const rad=r*0.82+len*t;const c=k===2?HOGC.tip:(Math.random()<0.5?HOGC.spine:HOGC.spineD);
      sb.add(d[0]*rad,d[1]*rad,d[2]*rad,0.055-k*0.012,shade(c,0.92+Math.random()*0.16),d[0],d[1],d[2]);}}
  // tucked face and paws
  ellipsoid(sb,[0,0,r*0.7],[r*0.42,r*0.38,r*0.2],HOGC.face,0.03);
  ellipsoid(sb,[0,-0.02,r*0.88],[0.07,0.06,0.07],HOGC.face,0.02);
  ellipsoid(sb,[0,-0.01,r*0.96],[0.03,0.025,0.025],HOGC.nose,0.012,{vary:0});
  for(const sx of[-1,1]){bead(sb,[sx*0.1,0.08,r*0.84],0.03);ellipsoid(sb,[sx*0.16,-0.04,r*0.8],[0.035,0.022,0.01],HOGC.blush,0.012,{vary:0});
    ellipsoid(sb,[sx*0.13,-0.16,r*0.78],[0.05,0.035,0.04],HOGC.foot,0.02);}
  return makeModel(sb);
}
// standing hedgehog (front +z, feet at y=0)
function buildHogStand(){
  const sb=new SB(6000);
  ellipsoid(sb,[0,0.3,0],[0.36,0.28,0.42],HOGC.belly,0.035,{half:-1});
  const n=1300,ga=Math.PI*(3-Math.sqrt(5));
  for(let i=0;i<n;i++){const y=1-2*(i+0.5)/n,rr=Math.sqrt(1-y*y),th=i*ga;const d=[Math.cos(th)*rr,y,Math.sin(th)*rr];
    if(d[1]<-0.15||d[2]>0.55)continue;const base=[d[0]*0.38,0.3+d[1]*0.3,d[2]*0.44];
    for(let k=0;k<3;k++){const t=k/2,len=0.1+Math.random()*0.07;const p=v3.add(base,v3.sc(v3.norm([d[0],d[1]+0.3,d[2]-0.4]),len*t));
      const c=k===2?HOGC.tip:(Math.random()<0.5?HOGC.spine:HOGC.spineD);sb.add(p[0],p[1],p[2],0.055-k*0.012,shade(c,0.92+Math.random()*0.16),d[0],d[1],d[2]);}}
  ellipsoid(sb,[0,0.3,0.4],[0.2,0.18,0.18],HOGC.face,0.025);
  ellipsoid(sb,[0,0.26,0.6],[0.08,0.07,0.12],HOGC.face,0.02);
  ellipsoid(sb,[0,0.27,0.72],[0.035,0.03,0.03],HOGC.nose,0.012,{vary:0});
  for(const sx of[-1,1]){bead(sb,[sx*0.1,0.38,0.53],0.032);ellipsoid(sb,[sx*0.16,0.3,0.5],[0.04,0.025,0.01],HOGC.blush,0.012,{rot:rotFrom([0,1,0],sx*0.6),vary:0});
    ellipsoid(sb,[sx*0.12,0.48,0.38],[0.05,0.05,0.025],HOGC.face,0.015);
    for(const fz of[-0.2,0.2])ellipsoid(sb,[sx*0.17,0.05,fz],[0.06,0.05,0.07],HOGC.foot,0.02);}
  return makeModel(sb);
}
// wooden bobbin with thread, upright, height ~0.6, centred at origin
function buildBobbin(colHex){
  const sb=new SB();const col=hex(colHex);
  for(const y of[-0.3,0.3])for(let r=0;r<=0.28;r+=0.035){const n=Math.max(1,Math.round(2*Math.PI*r/0.035));for(let i=0;i<n;i++){const a=i/n*Math.PI*2;sb.add(Math.cos(a)*r,y,Math.sin(a)*r,0.05,r>0.24?PAL.woodD:PAL.wood,0,Math.sign(y),0);}}
  for(let y=-0.27;y<=0.27;y+=0.03)for(let i=0;i<34;i++){const a=i/34*Math.PI*2+y*9;const r=0.2;sb.add(Math.cos(a)*r,y,Math.sin(a)*r,0.045,shade(col,0.9+0.15*((i+Math.round(y*33))%2)),Math.cos(a),0,Math.sin(a));}
  // loose thread end
  tube(sb,[[0.2,0.1,0],[0.32,-0.05,0.06],[0.36,-0.25,0.0]],0.012,col,0.02);
  return makeModel(sb);
}
// scissors: blade model (one half), pivot at origin, blade along +z, handle loop along -z. Two halves mirrored.
function buildBlade(handleHex,side){
  const sb=new SB();const steel=hex('#a3acbb'),steelD=hex('#5f6878');const hc=hex(handleHex);
  for(let z=0;z<=2.1;z+=0.035){const w=0.24*(1-z/2.3)+0.03;for(let x=0;x<=w;x+=0.035){const xx=side*x;const edge=x>w-0.05;
    sb.add(xx,0.1,z,0.065,edge?hex('#eef2f7'):steel,side*(edge?0.6:0.15),1,0);sb.add(xx,0.03,z,0.065,steelD,0,-1,0);}
    sb.add(side*(0.24*(1-z/2.3)+0.035),0.065,z,0.06,hex('#f4f7fb'),side,0.2,0);}
  tube(sb,(()=>{const p=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;p.push([side*(0.25+Math.cos(a)*0.28),0,-0.55+Math.sin(a)*0.38]);}return p;})(),0.07,hc,0.045);
  tube(sb,[[0,0,0],[side*0.1,0,-0.2]],0.07,hc,0.045);
  ellipsoid(sb,[0,0.06,0],[0.08,0.04,0.08],steel,0.02,{gloss:false});
  return makeModel(sb);
}
// big coat button bumper lying flat (radius 1.0)
function buildBumper(colHex){
  const sb=new SB();const col=hex(colHex);const R0=1.0;
  for(let r=0;r<=R0;r+=0.06){const n=Math.max(1,Math.round(2*Math.PI*r/0.06));for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const x=Math.cos(a)*r,z=Math.sin(a)*r;
    let c=col,y=0.32;if(r>R0-0.16){c=shade(col,1.15);y=0.36;}else if(r<0.5)y=0.28;
    for(const[hx,hz]of[[0.2,0.2],[-0.2,0.2],[0.2,-0.2],[-0.2,-0.2]])if(Math.hypot(x-hx,z-hz)<0.1)c=shade(col,0.3);
    sb.add(x,y,z,0.09,shade(c,0.95+Math.random()*0.1),0,1,0);}}
  for(let y=0;y<=0.34;y+=0.06)for(let i=0;i<70;i++){const a=i/70*Math.PI*2;sb.add(Math.cos(a)*R0,y,Math.sin(a)*R0,0.09,shade(col,0.82),Math.cos(a),0,Math.sin(a));}
  // thread cross through the holes
  for(let t=-0.2;t<=0.2;t+=0.03){sb.add(t,0.31,t,0.04,PAL.cream,0,1,0);sb.add(t,0.31,-t,0.04,PAL.cream,0,1,0);}
  return makeModel(sb);
}
// tomato pincushion landmark (radius ~3)
function bakePincushion(sb,base){
  const R0=3;const red=hex('#d4483e');
  ellipsoid(sb,v3.add(base,[0,R0*0.7,0]),[R0,R0*0.72,R0],red,0.12,{colFn:d=>{const a=Math.atan2(d[2],d[0]);return Math.abs(Math.sin(a*4))<0.08?shade(red,0.7):red;}});
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;ellipsoid(sb,v3.add(base,[Math.cos(a)*0.45,R0*1.42,Math.sin(a)*0.45]),[0.55,0.1,0.18],PAL.green,0.06,{rot:rotFrom([0,1,0],-a)});}
  const rnd=mulberry(9);const heads=[PAL.mustard,PAL.teal,PAL.white,hex('#e07aa0'),PAL.plum];
  for(let i=0;i<14;i++){const th=rnd()*Math.PI*2,ph=0.3+rnd()*0.9;const d=[Math.cos(th)*Math.sin(ph),Math.cos(ph),Math.sin(th)*Math.sin(ph)];
    const p0=v3.add(base,[d[0]*R0,R0*0.7+d[1]*R0*0.72,d[2]*R0]);const p1=v3.add(p0,v3.sc(d,1.4));tube(sb,[p0,p1],0.03,hex('#c9cfd8'),0.05);
    ellipsoid(sb,p1,[0.16,0.16,0.16],heads[i%heads.length],0.05);}
}
function bakeFlower(sb,base,rnd){
  const cols=[hex('#f4c6d2'),PAL.mustard,PAL.white,PAL.lilac,hex('#e07aa0')];const c=cols[Math.floor(rnd()*cols.length)];const h=0.4+rnd()*0.5;
  tube(sb,[base,v3.add(base,[0,h,0])],0.025,PAL.green,0.05);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;ellipsoid(sb,v3.add(base,[Math.cos(a)*0.1,h,Math.sin(a)*0.1]),[0.08,0.03,0.08],c,0.03);}
  ellipsoid(sb,v3.add(base,[0,h+0.02,0]),[0.05,0.04,0.05],PAL.mustard,0.02);
}
function bakeBush(sb,base,rnd){const g=[PAL.green,PAL.sage,PAL.greenD][Math.floor(rnd()*3)];const s=0.8+rnd()*1.2;
  for(let i=0;i<4;i++)ellipsoid(sb,v3.add(base,[(rnd()-0.5)*s,s*0.5+rnd()*s*0.3,(rnd()-0.5)*s]),[s*0.6,s*0.5,s*0.6],shade(g,0.9+rnd()*0.2),0.22);
  if(rnd()<0.5)for(let i=0;i<5;i++)ellipsoid(sb,v3.add(base,[(rnd()-0.5)*s,s*0.9+rnd()*0.2,(rnd()-0.5)*s]),[0.08,0.08,0.08],PAL.red,0.04);}
function buildBackdrop(){
  const sb=new SB(8000);const rnd=mulberry(77);
  const layers=[{n:16,d:[330,420],h:[60,120],w:[90,160],col:hex('#9fb0cf'),sp:6,cap:true},{n:20,d:[220,280],h:[30,60],w:[70,120],col:hex('#93b98a'),sp:5},{n:26,d:[140,180],h:[10,24],w:[40,80],col:hex('#a9cf8e'),sp:4}];
  for(const L of layers)for(let i=0;i<L.n;i++){const ang=(i+rnd()*0.8)/L.n*Math.PI*2;const D=lerp(L.d[0],L.d[1],rnd()),H=lerp(L.h[0],L.h[1],rnd()),W=lerp(L.w[0],L.w[1],rnd());
    const cx=Math.cos(ang)*D,cz=Math.sin(ang)*D;const tx=-Math.sin(ang),tz=Math.cos(ang);
    for(let y=0;y<H;y+=L.sp)for(let x=-W/2;x<W/2;x+=L.sp){const prof=H*(1-Math.abs(x)/(W/2))*(0.85+0.3*vnoise(x*0.05+i,3));if(y>prof)continue;
      const capC=L.cap&&y>prof-H*0.25;const patch=!L.cap&&((Math.floor(x/18)+Math.floor(y/12))%2===0);
      const c=capC?PAL.white:shade(L.col,(patch?1.08:0.94)+rnd()*0.08);
      sb.add(cx+tx*x,y-10,cz+tz*x,L.sp*1.4,c,-Math.cos(ang)*0.4,0.8,-Math.sin(ang)*0.4,false,rnd());}}
  for(let i=0;i<10;i++){const ang=rnd()*Math.PI*2,D=260+rnd()*80,y=90+rnd()*60;const c=[Math.cos(ang)*D,y,Math.sin(ang)*D];
    for(let k=0;k<5;k++){const o=[(k-2)*9+rnd()*4,rnd()*5,rnd()*6];ellipsoid(sb,v3.add(c,o),[9,6,6],PAL.white,3.2,{jit:0.3});}}
  ellipsoid(sb,[-260,140,60],[16,16,16],hex('#fff1b8'),3.5,{jit:0});
  return makeModel(sb);
}
