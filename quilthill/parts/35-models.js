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
