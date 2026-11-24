// ---------- 30-models: felt primitives and creatures, built from splats ----------
const PAL={
  white:hex('#f7f4ee'),snow:hex('#e9edf2'),snowB:hex('#d6e0ec'),black:hex('#221d22'),pink:hex('#f1a2b4'),blush:hex('#f39aa9'),
  orange:hex('#ee8a2c'),brownD:hex('#5b3a2a'),wood:hex('#b8794a'),woodD:hex('#93593a'),red:hex('#cf4a42'),cream:hex('#f6ecda'),
  green:hex('#4f8a5b'),greenD:hex('#386b49'),sage:hex('#7fa36b'),teal:hex('#3f8f93'),mustard:hex('#e2aa3c'),plum:hex('#80507a'),
  navy:hex('#304468'),lilac:hex('#b19ad0'),sky:hex('#8fbbe0'),
};
// generic ellipsoid surface. rot: optional 3x3 as [X,Y,Z] columns
function ellipsoid(sb,c,r,col,sp,o={}){
  const a=r[0],b=r[1],cc=r[2],p=1.6;
  const area=4*Math.PI*Math.pow((Math.pow(a*b,p)+Math.pow(a*cc,p)+Math.pow(b*cc,p))/3,1/p);
  const n=Math.max(6,Math.round(area/(sp*sp)*(o.dens||1)));
  const ga=Math.PI*(3-Math.sqrt(5));const rot=o.rot;const jit=o.jit===undefined?0.25:o.jit;
  for(let i=0;i<n;i++){
    const y=1-2*(i+0.5)/n,rr=Math.sqrt(1-y*y),th=i*ga;
    let d=[Math.cos(th)*rr,y,Math.sin(th)*rr];
    if(o.half!==undefined&&d[1]<o.half)continue;
    if(o.keep&&!o.keep(d))continue;
    let pp=[d[0]*a,d[1]*b,d[2]*cc],nn=[d[0]/a,d[1]/b,d[2]/cc];
    if(rot){pp=v3.add(v3.add(v3.sc(rot[0],pp[0]),v3.sc(rot[1],pp[1])),v3.sc(rot[2],pp[2]));nn=v3.add(v3.add(v3.sc(rot[0],nn[0]),v3.sc(rot[1],nn[1])),v3.sc(rot[2],nn[2]));}
    nn=v3.norm(nn);
    const j=(Math.random()-0.5)*sp*jit;
    const k=o.colFn?o.colFn(d):col;
    const vary=1+(Math.random()-0.5)*(o.vary===undefined?0.08:o.vary);
    sb.add(c[0]+pp[0]+nn[0]*j,c[1]+pp[1]+nn[1]*j,c[2]+pp[2]+nn[2]*j,sp*(o.sz||1.25)*(0.85+Math.random()*0.3),shade(k,vary),nn[0],nn[1],nn[2],o.gloss);
  }
}
function bead(sb,c,r,col){ // glossy bead eye
  sb.add(c[0],c[1],c[2],r,col||PAL.black,0,0,1,true,0.5);
}
// a few stray fibres around a part to make silhouettes fuzzy
function fuzz(sb,c,r,col,n){for(let i=0;i<n;i++){const d=v3.norm([Math.random()-0.5,Math.random()-0.5,Math.random()-0.5]);const k=1.02+Math.random()*0.12;
  sb.add(c[0]+d[0]*r[0]*k,c[1]+d[1]*r[1]*k,c[2]+d[2]*r[2]*k,0.012+Math.random()*0.014,shade(col,1.05),d[0],d[1],d[2]);}}
function rotFrom(ax,ang){const X=rotAxis([1,0,0],ax,ang),Y=rotAxis([0,1,0],ax,ang),Z=rotAxis([0,0,1],ax,ang);return[X,Y,Z];}
// tube along a polyline
function tube(sb,pts,rad,col,sp,colFn){
  for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];const d=v3.sub(b,a),L=v3.len(d),t=v3.sc(d,1/L);
    let ref=Math.abs(t[1])<0.9?[0,1,0]:[1,0,0];const u=v3.norm(v3.cross(t,ref)),w=v3.cross(t,u);
    const nl=Math.max(1,Math.round(L/sp)),nr=Math.max(5,Math.round(2*Math.PI*rad/sp));
    for(let l=0;l<nl;l++)for(let k=0;k<nr;k++){const f=(l+0.5)/nl,an=(k+(l%2)*0.5)/nr*Math.PI*2;
      const nn=v3.add(v3.sc(u,Math.cos(an)),v3.sc(w,Math.sin(an)));const p=v3.add(v3.lerp(a,b,f),v3.sc(nn,rad));
      const c=colFn?colFn(i+f,an,p):col;sb.add(p[0],p[1],p[2],sp*1.3,shade(c,0.95+Math.random()*0.1),nn[0],nn[1],nn[2]);}}
}

// ---- creatures. Front = +z. Height ~0.62 standing. Parts: body, head, armL, armR (pivots below)
const SPECIES={
  bunny:{name:'Bunny',em:'🐰',main:'#f2ebe1',belly:'#fffaf3',ear:'long',nose:PAL.pink,tail:'pom',feet:'#efe6da'},
  otter:{name:'Otter',em:'🦦',main:'#8a5c3b',belly:'#ead3b1',ear:'tiny',muzzle:'#ead3b1',nose:PAL.brownD,tail:'long'},
  penguin:{name:'Penguin',em:'🐧',main:'#2e3552',belly:'#fbf8f2',ear:'none',beak:true,feet:'#ee8a2c',flipper:true,faceMask:true},
  fox:{name:'Fox',em:'🦊',main:'#e27a39',belly:'#fbf3e6',ear:'point',muzzle:'#fbf3e6',nose:PAL.black,tail:'bushy',feet:'#5a3a2a'},
  chick:{name:'Chick',em:'🐥',main:'#f5cf47',belly:'#fae08a',ear:'none',beak:true,feet:'#ee8a2c',tuft:true,scale:0.82},
  bear:{name:'Bear',em:'🐻',main:'#a7714c',belly:'#dfbf9b',ear:'round',muzzle:'#e3c4a1',nose:PAL.brownD,tail:'nub'},
  mouse:{name:'Mouse',em:'🐭',main:'#bab3ae',belly:'#ece6e1',ear:'big',nose:PAL.pink,tail:'thin',scale:0.9},
  frog:{name:'Frog',em:'🐸',main:'#7cba5a',belly:'#daedb2',ear:'none',frog:true},
};
const SCARF_COLS=['#cf4a42','#3f8f93','#e2aa3c','#80507a','#4f8a5b','#e07aa0','#304468'];
function buildAnimal(key,scarfHex){
  const S=SPECIES[key],main=hex(S.main),belly=hex(S.belly);const sp=0.03;
  const body=new SB(),head=new SB(),armL=new SB(),armR=new SB();
  // body
  ellipsoid(body,[0,0.2,0],[0.17,0.2,0.155],main,sp,{colFn:d=>(d[2]>0.35&&d[1]<0.7)?belly:main});
  fuzz(body,[0,0.2,0],[0.17,0.2,0.155],main,40);
  const feetC=S.feet?hex(S.feet):main;
  for(const sx of[-1,1])ellipsoid(body,[sx*0.08,0.03,0.06],[0.06,0.035,0.085],feetC,sp*0.8);
  // scarf ring at neck
  const scol=hex(scarfHex||'#cf4a42');
  for(let i=0;i<46;i++){const a=i/46*Math.PI*2;for(let k=0;k<3;k++){const b=k/3*Math.PI*2;const R0=0.13,r=0.032;
    const n=[Math.cos(a)*Math.cos(b),Math.sin(b),Math.sin(a)*Math.cos(b)];const stripe=Math.floor(i/5)%2?scol:PAL.cream;
    body.add(Math.cos(a)*(R0+r*Math.cos(b)),0.37+r*Math.sin(b),Math.sin(a)*(R0+r*Math.cos(b)),0.04,stripe,n[0],n[1],n[2]);}}
  tube(body,[[0.07,0.37,0.11],[0.09,0.27,0.155],[0.1,0.2,0.16]],0.026,scol,0.028);
  // tails
  if(S.tail==='pom')ellipsoid(body,[0,0.13,-0.17],[0.07,0.07,0.06],hex('#ffffff'),sp*0.8),fuzz(body,[0,0.13,-0.17],[0.07,0.07,0.06],PAL.white,25);
  if(S.tail==='long')tube(body,[[0,0.08,-0.12],[0,0.04,-0.28],[0,0.03,-0.42]],0.045,main,0.03);
  if(S.tail==='bushy'){ellipsoid(body,[0,0.14,-0.24],[0.08,0.08,0.16],main,sp,{colFn:d=>d[2]<-0.6?PAL.white:main,rot:rotFrom([1,0,0],-0.5)});fuzz(body,[0,0.14,-0.24],[0.08,0.08,0.16],main,30);}
  if(S.tail==='nub')ellipsoid(body,[0,0.1,-0.15],[0.04,0.04,0.035],main,sp*0.8);
  if(S.tail==='thin')tube(body,[[0,0.06,-0.14],[0.05,0.03,-0.3],[0.12,0.06,-0.4],[0.14,0.12,-0.42]],0.014,PAL.pink,0.02);
  // head (pivot 0,0.38,0)
  const hc=[0,0.16,0.01],hr=[0.17,0.155,0.15];
  if(S.faceMask)ellipsoid(head,hc,hr,main,sp,{colFn:d=>(d[2]>0.25&&d[1]<0.55&&Math.abs(d[0])<0.75)?belly:main});
  else if(S.frog)ellipsoid(head,hc,[0.19,0.13,0.15],main,sp,{colFn:d=>(d[1]<-0.3&&d[2]>0)?belly:main});
  else ellipsoid(head,hc,hr,main,sp);
  fuzz(head,hc,hr,main,35);
  let eyeY=0.17,eyeX=0.065,eyeZ=0.138;
  if(S.frog){for(const sx of[-1,1]){ellipsoid(head,[sx*0.09,0.27,0.05],[0.055,0.055,0.05],main,sp*0.8);bead(head,[sx*0.09,0.28,0.1],0.032);}
    for(let i=0;i<9;i++){const x=(i-4)/4*0.08;head.add(x,0.11+x*x*2,0.155,0.012,hex('#3d5a2b'),0,0,1);}}
  else{for(const sx of[-1,1])bead(head,[sx*eyeX,eyeY,eyeZ],0.03);}
  for(const sx of[-1,1])ellipsoid(head,[sx*0.105,0.115,0.115],[0.035,0.022,0.012],PAL.blush,0.012,{rot:rotFrom([0,1,0],sx*0.5),vary:0.02});
  if(S.muzzle){ellipsoid(head,[0,0.1,0.125],[0.075,0.05,0.045],hex(S.muzzle),sp*0.7);}
  if(S.nose)ellipsoid(head,[0,0.125,S.muzzle?0.17:0.15],[0.022,0.016,0.014],S.nose,0.012);
  if(S.beak){ellipsoid(head,[0,0.11,0.165],[0.045,0.024,0.05],PAL.orange,0.014);}
  if(S.tuft)for(let i=0;i<3;i++)ellipsoid(head,[(i-1)*0.025,0.33,0],[0.018,0.05,0.018],main,0.014,{rot:rotFrom([0,0,1],(i-1)*0.5)});
  const earPink=PAL.pink;
  if(S.ear==='long')for(const sx of[-1,1]){const rot=rotFrom([0,0,1],-sx*0.18);ellipsoid(head,[sx*0.065,0.38,-0.01],[0.045,0.14,0.03],main,sp*0.8,{rot});
    ellipsoid(head,[sx*0.066,0.38,0.018],[0.026,0.11,0.01],earPink,0.014,{rot});}
  if(S.ear==='tiny')for(const sx of[-1,1])ellipsoid(head,[sx*0.12,0.27,0],[0.035,0.03,0.022],main,0.016);
  if(S.ear==='round')for(const sx of[-1,1]){ellipsoid(head,[sx*0.12,0.28,0],[0.055,0.05,0.03],main,0.02);ellipsoid(head,[sx*0.12,0.28,0.025],[0.03,0.028,0.008],hex(S.muzzle),0.012);}
  if(S.ear==='big')for(const sx of[-1,1]){ellipsoid(head,[sx*0.13,0.29,-0.01],[0.085,0.085,0.022],main,0.02);ellipsoid(head,[sx*0.13,0.29,0.012],[0.06,0.06,0.006],earPink,0.014);}
  if(S.ear==='point')for(const sx of[-1,1]){const rot=rotFrom([0,0,1],-sx*0.3);ellipsoid(head,[sx*0.1,0.3,0],[0.055,0.1,0.025],main,0.018,{rot,colFn:d=>d[1]>0.6?PAL.black:main});
    ellipsoid(head,[sx*0.1,0.29,0.02],[0.03,0.065,0.006],PAL.cream,0.012,{rot});}
  // arms (pivots at shoulders)
  const armC=S.flipper?main:main;
  for(const[sb,sx]of[[armL,-1],[armR,1]]){
    if(S.flipper)ellipsoid(sb,[sx*0.02,-0.09,0.01],[0.025,0.1,0.06],armC,0.02,{rot:rotFrom([0,0,1],sx*0.2)});
    else ellipsoid(sb,[sx*0.015,-0.075,0.02],[0.045,0.085,0.045],armC,0.022,{colFn:d=>(d[1]<-0.6&&S.feet&&key==='fox')?hex(S.feet):armC});
  }
  const sc=S.scale||1;
  return{key,S,scale:sc,body:makeModel(body),head:makeModel(head),armL:makeModel(armL),armR:makeModel(armR),
    n:body.n+head.n+armL.n+armR.n};
}
// pose: {bob, headTilt, headTurn, armL, armR (angle up), lean}
function drawAnimal(A,M,pose,boil){
  const sc=A.scale;const Mb=M4.mul(M,M4.mul(M4.scale(sc),M4.mul(M4.trans(0,pose.bob||0,0),M4.rotZ(pose.lean||0))));
  const op={boil,boilAmt:0.18,scale:sc,tint:pose.tint,tintCol:pose.tintCol};
  drawModel(A.body,Mb,op);
  const Mh=M4.mul(Mb,M4.mul(M4.trans(0,0.38,0),M4.mul(M4.rotY(pose.headTurn||0),M4.mul(M4.rotZ(pose.headTilt||0),M4.rotX(pose.headNod||0)))));
  drawModel(A.head,Mh,op);
  drawModel(A.armL,M4.mul(Mb,M4.mul(M4.trans(-0.15,0.31,0.02),M4.mul(M4.rotZ(-(pose.armL||0)),M4.rotX(-(pose.armLX||0))))),op);
  const Ma=M4.mul(Mb,M4.mul(M4.trans(0.15,0.31,0.02),M4.mul(M4.rotZ(pose.armR||0),M4.rotX(-(pose.armRX||0)))));
  drawModel(A.armR,Ma,op);
  if(pose.mug){const mm=mugModels[pose.mug]||(mugModels[pose.mug]=buildMug(pose.mug));
    drawModel(mm,M4.mul(Ma,M4.mul(M4.trans(0.0,-0.17,0.05),M4.mul(M4.rotX((pose.armRX||0)-(pose.mugTilt||0)),M4.mul(M4.rotZ(-(pose.armR||0)),M4.trans(-0.02,-0.03,0))))),{boil:op.boil,boilAmt:0.08,scale:sc});}
}

// ---- sled (front +z)
function buildSled(){
  const sb=new SB();const sp=0.035;
  const plank=[PAL.wood,PAL.woodD,hex('#c48756'),PAL.woodD];
  for(let z=-1.0;z<=0.9;z+=sp)for(let x=-0.3;x<=0.3;x+=sp){const pi=Math.floor((x+0.3)/0.15);const c=plank[clamp(pi,0,3)];
    const seam=Math.abs(((x+0.3)%0.15)-0.075)>0.065;sb.add(x,0.14,z,sp*1.3,seam?shade(c,0.7):c,0,1,0);
    if(Math.abs(x)>0.28)sb.add(x,0.1,z,sp*1.3,shade(c,0.8),Math.sign(x),0,0);}
  // underside
  for(let z=-1.0;z<=0.9;z+=sp*2)for(let x=-0.3;x<=0.3;x+=sp*2)sb.add(x,0.08,z,sp*2.2,PAL.woodD,0,-1,0);
  // front curl
  for(let a=0;a<=Math.PI*1.1;a+=0.08){const r=0.22,cz=0.9+Math.sin(a)*r,cy=0.14+r-Math.cos(a)*r;const n=[0,-Math.cos(a)+0.0,Math.sin(a)];
    for(let x=-0.3;x<=0.3;x+=sp){const c=plank[clamp(Math.floor((x+0.3)/0.15),0,3)];sb.add(x,cy,cz,sp*1.35,c,0,-n[1]*-1,n[2]);}}
  // red runners + rails
  for(const sx of[-0.24,0.24]){tube(sb,[[sx,0.04,-0.95],[sx,0.04,0.85],[sx,0.12,1.02],[sx,0.25,1.02]],0.022,PAL.red,0.025);}
  for(const sx of[-0.33,0.33])tube(sb,[[sx,0.2,-0.95],[sx,0.2,0.75]],0.022,PAL.red,0.025);
  // rope from curl to driver
  const rope=[];for(let i=0;i<=10;i++){const t=i/10;rope.push([-0.28+0.56*t,0.38+0.06*Math.sin(t*Math.PI)-0.1*Math.sin(t*Math.PI),1.0-0.12*Math.sin(t*Math.PI)]);}
  tube(sb,rope,0.015,PAL.mustard,0.02);
  // plaid cushion
  for(let z=-0.95;z<=0.55;z+=0.03)for(let x=-0.26;x<=0.26;x+=0.03){const plaid=(Math.floor((x+1)*10)%2)^(Math.floor((z+2)*10)%2);
    sb.add(x,0.165,z,0.04,plaid?hex('#2f5d7a'):hex('#5f8fb0'),0,1,0);}
  return makeModel(sb);
}
// ---- yarn ball radius ~0.55 centred at y=0.52
function buildYarn(colHex,seed){
  const rnd=mulberry(seed);const sb=new SB();const col=hex(colHex),r=0.52;
  ellipsoid(sb,[0,r,0],[r*0.95,r*0.95,r*0.95],shade(col,0.72),0.08,{jit:0});
  for(let k=0;k<16;k++){const ax=v3.norm([rnd()-0.5,rnd()-0.5,rnd()-0.5]);let ref=Math.abs(ax[1])<0.9?[0,1,0]:[1,0,0];
    const u=v3.norm(v3.cross(ax,ref)),w=v3.cross(ax,u);const n=60;const kc=shade(col,0.9+rnd()*0.22);
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const d=v3.add(v3.sc(u,Math.cos(a)),v3.sc(w,Math.sin(a)));
      sb.add(d[0]*r,r+d[1]*r,d[2]*r,0.065,kc,d[0],d[1],d[2]);}}
  // loose strand trailing on ground
  const pts=[[0.3,0.1,0.38],[0.5,0.03,0.7],[0.3,0.02,1.05],[0.55,0.02,1.4]];tube(sb,pts,0.025,col,0.03);
  return makeModel(sb);
}
// ---- knitting needle pair, crossed X, ~2.4 tall
function buildNeedles(colHex){
  const sb=new SB();const col=hex(colHex);
  for(const sx of[-1,1]){const a=[sx*0.75,-0.1,0],b=[-sx*0.55,2.3,0.1*sx];tube(sb,[a,b],0.05,col,0.035);
    ellipsoid(sb,b,[0.11,0.11,0.11],PAL.mustard,0.03);}
  // a scrap of knitting hanging off the cross
  for(let y=1.0;y<1.5;y+=0.05)for(let x=-0.3;x<=0.3;x+=0.05)sb.add(x,y+Math.abs(x)*0.25,0.02,0.06,(Math.floor(y*20)%4<2)?PAL.cream:PAL.red,0,0,1);
  return makeModel(sb);
}
// ---- mitten ramp: width 2.6 (x), length 3.6 (z, rising toward +z), height 1.1
const RAMP={w:2.6,len:3.6,h:1.1};
function buildRamp(colHex){
  const sb=new SB();const col=hex(colHex);const{w,len,h}=RAMP;const sp=0.07;const sl=Math.atan2(h,len);const n=v3.norm([0,Math.cos(sl),-Math.sin(sl)]);
  const heart=[".XX.XX.","XXXXXXX","XXXXXXX",".XXXXX.","..XXX..","...X..."];
  for(let z=-len/2;z<=len/2;z+=sp)for(let x=-w/2;x<=w/2;x+=sp){const y=h*(z+len/2)/len;
    let c=col;const zi=Math.floor((z+len/2)/0.18),xi=Math.floor((x+w/2)/0.18);
    if(z<-len/2+0.5)c=PAL.cream; // cuff
    const hr=Math.floor((len/2-0.4-z)/0.18),hc=xi-4;if(hr>=0&&hr<6&&hc>=0&&hc<7&&heart[hr][hc]==='X')c=PAL.cream;
    if(Math.abs(Math.abs(x)-w/2+0.12)<sp*0.6&&zi%2===0)c=PAL.cream; // stitched edge
    sb.add(x,y+0.02,z,sp*1.35,shade(c,0.95+Math.random()*0.1),n[0],n[1],n[2]);}
  for(const sx of[-1,1])for(let z=-len/2;z<=len/2;z+=sp)for(let y=0;y<=h*(z+len/2)/len;y+=sp)sb.add(sx*w/2,y,z,sp*1.35,shade(col,0.85),sx,0,0);
  for(let y=0;y<=h;y+=sp)for(let x=-w/2;x<=w/2;x+=sp)sb.add(x,y,len/2,sp*1.35,shade(col,0.75),0,0,1);
  // thumb bump
  ellipsoid(sb,[w/2+0.15,0.35,0.3],[0.28,0.35,0.6],col,0.07);
  return makeModel(sb);
}
// ---- coat button
function buildButton(colHex){
  const sb=new SB();const col=hex(colHex);const R0=0.24;
  for(const fz of[-1,1])for(let r=0;r<=R0;r+=0.03){const n=Math.max(1,Math.round(2*Math.PI*r/0.03));for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const x=Math.cos(a)*r,y=Math.sin(a)*r;
    let c=col;if(r>R0-0.05)c=shade(col,1.15);
    for(const[hx,hy]of[[0.06,0.06],[-0.06,0.06],[0.06,-0.06],[-0.06,-0.06]])if(Math.hypot(x-hx,y-hy)<0.03)c=shade(col,0.35);
    sb.add(x,y,fz*0.03,0.045,c,0,0,fz);}}
  for(let i=0;i<50;i++){const a=i/50*Math.PI*2;sb.add(Math.cos(a)*R0,Math.sin(a)*R0,0,0.05,shade(col,0.9),Math.cos(a),Math.sin(a),0);}
  return makeModel(sb);
}
// ---- trees etc. are baked into chunk builders (world space). These helpers write into a given SB with a transform fn.
function bakeTree(sb,base,R,N,T,size,rnd,dens){
  const P=(x,y,z)=>v3.add(v3.add(v3.add(base,v3.sc(R,x)),v3.sc([0,1,0],y)),v3.sc(T,z));
  const greens=[PAL.green,PAL.greenD,PAL.sage,hex('#3e7a6a')];const g=greens[Math.floor(rnd()*greens.length)];
  const tiers=3+Math.floor(rnd()*2);const H=size;const sp=0.14/Math.sqrt(dens);
  // trunk
  for(let y=0;y<H*0.18;y+=sp*0.7)for(let a=0;a<6;a++){const an=a/6*Math.PI*2;const p=P(Math.cos(an)*0.12*size/4,y,Math.sin(an)*0.12*size/4);sb.add(p[0],p[1],p[2],sp*1.2,PAL.brownD,Math.cos(an)*R[0],0,Math.sin(an));}
  for(let t=0;t<tiers;t++){const y0=H*(0.15+t*0.22),hh=H*0.36,r0=H*0.36*(1-t*0.2);
    for(let y=0;y<hh;y+=sp){const f=y/hh,r=r0*(1-f)+0.02;const n=Math.max(4,Math.round(2*Math.PI*r/sp));
      for(let i=0;i<n;i++){const an=(i+rnd())/n*Math.PI*2;const nx=Math.cos(an),nz=Math.sin(an);const p=P(nx*r,y0+y,nz*r);
        const snowy=f<0.18&&rnd()<0.75;const c=snowy?PAL.snow:shade(g,0.9+rnd()*0.2);
        const nrm=v3.norm(v3.add(v3.add(v3.sc(R,nx),v3.sc([0,1,0],0.6)),v3.sc(T,nz)));sb.add(p[0],p[1],p[2],sp*1.5,c,nrm[0],nrm[1],nrm[2],false,rnd());}}}
  const top=P(0,H*(0.15+(tiers-1)*0.22)+H*0.36,0);
  if(rnd()<0.6)ellipsoid(sb,top,[0.16*size/4,0.16*size/4,0.16*size/4],rnd()<0.5?PAL.red:PAL.mustard,0.05);
}
function bakeCane(sb,base,height,R,T,dens,rnd){
  const sp=0.05;const r=0.06;const up=[0,1,0];
  const pts=[];for(let y=0;y<=height;y+=0.1)pts.push(v3.mad(base,up,y));
  for(let a=0;a<=Math.PI;a+=0.25)pts.push(v3.add(v3.mad(base,up,height+Math.sin(a)*0.22),v3.sc(R,0.22-Math.cos(a)*0.22)));
  tube(sb,pts,r,null,sp,(i,an,p)=>((Math.floor(p[1]*6+an/Math.PI*1.0))%2===0)?PAL.red:PAL.white);
}
function bakeSnowman(sb,base,rnd){
  const s=[[0,0.45,0.48],[0,1.15,0.34],[0,1.68,0.25]];for(const[x,y,r]of s){ellipsoid(sb,v3.add(base,[0,y,0]),[r,r,r],PAL.snow,0.07);}
  // face toward +z world-ish (uphill = +z in world since course runs -z)
  for(const sx of[-1,1])bead(sb,v3.add(base,[sx*0.08,1.73,0.22]),0.035);
  ellipsoid(sb,v3.add(base,[0,1.66,0.3]),[0.035,0.035,0.12],PAL.orange,0.025);
  for(let i=0;i<40;i++){const a=i/40*Math.PI*2;sb.add(base[0]+Math.cos(a)*0.27,base[1]+1.42,base[2]+Math.sin(a)*0.27,0.08,i%8<4?PAL.red:PAL.cream,Math.cos(a),0,Math.sin(a));}
  for(const y of[1.0,1.2])bead(sb,v3.add(base,[0,y,0.33]),0.035);
}
// ---- distant backdrop (drawn around the camera)
function buildBackdrop(){
  const sb=new SB(8000);const rnd=mulberry(77);
  const layers=[{n:16,d:[330,420],h:[70,140],w:[90,160],col:hex('#a7b4cf'),sp:6},{n:20,d:[220,280],h:[30,70],w:[70,120],col:hex('#c3cfe0'),sp:5},{n:26,d:[140,180],h:[10,26],w:[40,80],col:hex('#e8eef4'),sp:4}];
  for(const L of layers)for(let i=0;i<L.n;i++){const ang=(i+rnd()*0.8)/L.n*Math.PI*2;const D=lerp(L.d[0],L.d[1],rnd()),H=lerp(L.h[0],L.h[1],rnd()),W=lerp(L.w[0],L.w[1],rnd());
    const cx=Math.cos(ang)*D,cz=Math.sin(ang)*D;const tx=-Math.sin(ang),tz=Math.cos(ang);
    for(let y=0;y<H;y+=L.sp)for(let x=-W/2;x<W/2;x+=L.sp){const prof=H*(1-Math.abs(x)/(W/2))*(0.85+0.3*vnoise(x*0.05+i,3));if(y>prof)continue;
      const snowcap=y>prof-H*0.28&&L.n<25;const c=snowcap?PAL.white:shade(L.col,0.92+rnd()*0.12);
      sb.add(cx+tx*x,y-10,cz+tz*x,L.sp*1.4,c,-Math.cos(ang)*0.4,0.8,-Math.sin(ang)*0.4,false,rnd());}}
  // felt clouds
  for(let i=0;i<10;i++){const ang=rnd()*Math.PI*2,D=260+rnd()*80,y=90+rnd()*60;const c=[Math.cos(ang)*D,y,Math.sin(ang)*D];
    for(let k=0;k<5;k++){const o=[(k-2)*9+rnd()*4,rnd()*5,rnd()*6];ellipsoid(sb,v3.add(c,o),[9,6,6],PAL.white,3.2,{jit:0.3});}}
  // sun
  ellipsoid(sb,[-170,160,180],[16,16,16],hex('#fff1b8'),3.5,{jit:0});
  return makeModel(sb);
}
