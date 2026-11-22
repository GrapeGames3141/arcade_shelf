
// ============================================================
//  HARDSCAPE & DECOR · meshes (shiny and solid things)
// ============================================================
// rock from a displaced icosphere: v 0 granite, 1 slate slab, 2 river stone, 3 lava/ember
function genRock(seed,v=0,o={}){const r=rng(seed);const ic=icosphere(o.sub||4);const mb=new MB();const sx=o.sx||(v===1?1.6:v===2?1.25:1),sy=o.sy||(v===1?.42:v===2?.62:.78),sz=o.sz||(v===1?1.25:1);
  const off=[r()*99,r()*99,r()*99];const amp=v===2?.06:v===1?.12:.28;const fr=v===2?.9:1.6;
  for(const p of ic.P){let d=1+amp*fbm3(p[0]*fr+off[0],p[1]*fr+off[1],p[2]*fr+off[2],4);if(v===0||v===3)d+=.12*Math.abs(noise3(p[0]*3.5+off[0],p[1]*3.5,p[2]*3.5));
    let q=[p[0]*d*sx,p[1]*d*sy,p[2]*d*sz];if(v===1){q[1]+=.12*Math.sin(p[0]*4+off[0])*.0;if(q[1]>0)q[1]*=.9;}
    if(q[1]<-.25*sy)q[1]=-.25*sy+(q[1]+.25*sy)*.25;// flatten the underside so it sits on the ground
    mb.v(q,[0,1,0],[p[0],p[1]],[1,1,1,.5],[0,0,0,0]);}
  for(const f of ic.F)mb.t(f[0],f[1],f[2]);mb.normals();
  // cavity AO: darker where the surface dips
  for(let i=0;i<mb.n;i++){const p=[mb.P[i*3],mb.P[i*3+1],mb.P[i*3+2]];const L=Math.hypot(p[0]/sx,p[1]/sy,p[2]/sz);mb.C[i*4]=clamp(.55+(L-.9)*2.2,.35,1)*(p[1]<0?.7+.3*(1+p[1]/sy):1);}
  return mb;}
// slate stack: a few flat slabs piled with offsets (basking spot)
function genSlateStack(seed){const r=rng(seed);const mb=new MB();let y=0;for(let i=0;i<3;i++){const s=genRock(seed+i*7,1,{sx:1.5-i*.25+r()*.2,sy:.32,sz:1.1-i*.15+r()*.15});
  const ox=(r()-.5)*.5,oz=(r()-.5)*.4,ry=r()*.6;for(let k=0;k<s.n;k++){const p=V.rotY([s.P[k*3],s.P[k*3+1],s.P[k*3+2]],ry);s.P[k*3]=p[0]+ox;s.P[k*3+1]=p[1]+y+.24;s.P[k*3+2]=p[2]+oz;const n=V.rotY([s.N[k*3],s.N[k*3+1],s.N[k*3+2]],ry);s.N[k*3]=n[0];s.N[k*3+1]=n[1];s.N[k*3+2]=n[2];}
  mb.merge(s);y+=.42;}return mb;}
// driftwood / branch: a curved tube with forks, the bark mesh of the bonsai uses the same builder
function branchTube(mb,pts,r0,r1,sides,seed){tube(mb,pts,t=>lerp(r0,r1,Math.pow(t,.8))*(1+.12*noise3(t*9,seed,0)),sides,{vlen:true,cap:true,rmod:(t,u,p)=>1+.14*noise3(p[0]*1.3,p[1]*1.3+u*4,p[2]*1.3)});}
function curve(a,b,ctrl,n,wob,seed){const out=[];for(let i=0;i<=n;i++){const t=i/n;const p=V.add(V.add(V.mul(a,(1-t)*(1-t)),V.mul(ctrl,2*t*(1-t))),V.mul(b,t*t));out.push(V.add(p,[noise3(t*4,seed,1)*wob,noise3(t*4,seed,2)*wob*.6,noise3(t*4,seed,3)*wob]));}return out;}
function genDriftwood(seed){const r=rng(seed);const mb=new MB();const main=curve([-14,0,0],[13,6,0],[0,9,3],24,1.2,seed);branchTube(mb,main,1.5,.35,12,seed);
  for(let i=0;i<4;i++){const k=4+Math.floor(r()*16);const a=main[k];const dir=V.norm([(r()-.5),.6+r()*.6,(r()-.5)*2]);const b=V.madd(a,dir,4+r()*5);branchTube(mb,curve(a,b,V.lerp(a,b,.5),8,.4,seed+i),.55,.1,8,seed+i);}
  for(let i=0;i<mb.n;i++)mb.C[i*4]=clamp(.6+mb.N[i*3+1]*.4,.35,1);return{mb,perch:[main[24],main[16],main[8]]};}
// bonsai: S-curved trunk with tiered branches; returns pad centres for the splat foliage
function genBonsaiTrunk(seed){const r=rng(seed);const mb=new MB();const trunk=[];let p=[0,0,0];const H0=24;
  for(let i=0;i<=22;i++){const t=i/22;trunk.push(p);p=V.add(p,[Math.sin(t*4.2+seed)*.75+.25,H0/22,Math.cos(t*3.1+seed)*.4]);}
  branchTube(mb,trunk,2.4,.7,14,seed);// nebari: surface roots
  for(let i=0;i<6;i++){const a=i/6*TAU+r()*.4;const b=[Math.cos(a)*5,-.3,Math.sin(a)*4];branchTube(mb,curve([0,1.2,0],b,[Math.cos(a)*2.2,.4,Math.sin(a)*2.2],8,.2,seed+i*3),1.2,.2,8,seed+i*3);}
  const pads=[];const tiers=[[9,-1],[13,1],[17,-1],[20,1]];for(const[k,s]of tiers){const a=trunk[k];const ang=(s>0?.2:PI+.2)+(r()-.5)*.8;const L=7+r()*4;const b=V.add(a,[Math.cos(ang)*L,2+r()*2,Math.sin(ang)*L*.6]);
    branchTube(mb,curve(a,b,V.add(V.lerp(a,b,.5),[0,-1,0]),10,.3,seed+k),.8,.25,9,seed+k);pads.push({c:V.add(b,[0,1.2,0]),R:4.2+r()*1.2});pads.push({c:V.add(V.lerp(a,b,.55),[0,1.8,0]),R:3+r()});}
  pads.push({c:V.add(trunk[22],[0,1.6,0]),R:5});pads.push({c:V.add(trunk[18],[1.5,2,1]),R:3.5});
  for(let i=0;i<mb.n;i++)mb.C[i*4]=clamp(.55+mb.N[i*3+1]*.35,.3,1);return{mb,pads,top:trunk[22]};}
// crystal geode: rind half shell with amethyst points inside
function genGeode(seed){const r=rng(seed);const mb=new MB();const shell=genRock(seed,0,{sx:2.4,sy:1.6,sz:2.1,sub:3});
  for(let i=0;i<shell.n;i++)shell.C[i*4+1]=1;mb.merge(shell);
  for(let i=0;i<16;i++){const a=r()*TAU,u=Math.sqrt(r())*1.7;const base=[Math.cos(a)*u,.9+r()*.4,Math.sin(a)*u*.8];const dir=V.norm([Math.cos(a)*u*.35+(r()-.5)*.4,1,Math.sin(a)*u*.3]);const L=1.2+r()*1.8,w=.22+r()*.18;
    const side=V.perp(dir),up2=V.cross(dir,side);const st=mb.n;const tip=V.madd(base,dir,L);const shade=r();
    for(let k=0;k<6;k++){const ang=k/6*TAU;const d=V.add(V.mul(side,Math.cos(ang)),V.mul(up2,Math.sin(ang)));mb.v(V.madd(base,d,w),d,[0,0],[1,0,shade,0]);mb.v(V.madd(V.madd(base,dir,L*.72),d,w),d,[0,0],[1,0,shade,0]);}
    const ti=mb.v(tip,dir,[0,0],[1,0,shade,0]);for(let k=0;k<6;k++){const a0=st+k*2,a1=st+((k+1)%6)*2;mb.q(a0,a1,a1+1,a0+1);mb.t(a0+1,a1+1,ti);}}
  return mb;}
// mushrooms (cap / gills / stem) as lathe meshes; style 0 toadstool, 1 glowing bell cap, 2 shelf
function genMushroom(mb,base,h,R,tilt,style){const st=mb.n;const up=V.norm([tilt[0],1,tilt[1]]);const side=V.perp(up),f=V.cross(up,side);
  const ring=(c,rad,n,col,nrmf,uvv)=>{const s0=mb.n;for(let k=0;k<=n;k++){const a=k/n*TAU;const d=V.add(V.mul(side,Math.cos(a)),V.mul(f,Math.sin(a)));mb.v(V.madd(c,d,rad),nrmf(d),[k/n,uvv],col,[0,0,0,0]);}return s0;};
  const join=(a,b,n)=>{for(let k=0;k<n;k++)mb.q(a+k,a+k+1,b+k+1,b+k);};
  const n=16;const sr=R*(style===1?.18:.22);let prev=-1;
  for(let i=0;i<=5;i++){const t=i/5;const c=V.madd(base,up,h*.95*t);const rr=sr*(1+.25*(1-t)*(1-t)+(i===0?.2:0));const id=ring(c,rr,n,[0,0,0,1],d=>d,t);if(prev>=0)join(prev,id,n);prev=id;}
  const capC=V.madd(base,up,h);const cr=style===1?R*.75:R;const gid=ring(V.madd(capC,up,-h*.05),sr*1.05,n,[0,1,0,1],d=>V.mul(up,-1),0);const gid2=ring(V.madd(capC,up,style===1?-h*.25:-h*.08),cr,n,[0,1,0,1],d=>V.mul(up,-1),1);join(gid,gid2,n);
  prev=-1;const prof=style===1?[[1,-.28],[.95,.0],[.82,.28],[.6,.5],[.32,.62],[0,.66]]:[[1,-.08],[.97,.08],[.85,.24],[.62,.37],[.33,.44],[0,.46]];
  for(let i=0;i<prof.length;i++){const[rf,yf]=prof[i];const c=V.madd(capC,up,yf*R*(style===1?1.2:.9));const id=ring(c,Math.max(cr*rf,.001),n,[1,0,0,1],d=>V.norm(V.add(V.mul(d,rf+.2),V.mul(up,1-rf+.3))),i/(prof.length-1));if(prev>=0)join(prev,id,n);prev=id;}
  void st;}
function genMushroomCluster(seed,style){const r=rng(seed);const mb=new MB();const n=style===1?7:3+Math.floor(r()*3);
  for(let i=0;i<n;i++){const a=r()*TAU,u=r()*(style===1?1.6:1.4);genMushroom(mb,[Math.cos(a)*u,0,Math.sin(a)*u],(style===1?1.6:2.2)*(.6+r()*.8),(style===1?.8:1.3)*(.6+r()*.6),[(r()-.5)*.4,(r()-.5)*.4],style);}
  mb.normals();for(let i=0;i<mb.n;i++)mb.C[i*4+3]=1;return mb;}
// fix normals but keep material flags in vertex colours (the lathe writes them)
// stone arch ruin from blocks
function genArch(seed){const r=rng(seed);const mb=new MB();const blk=(c,h,ry)=>{const st=mb.n;box(mb,[0,0,0],h,[1,1,1,1]);for(let i=st;i<mb.n;i++){const p=V.rotY([mb.P[i*3],mb.P[i*3+1],mb.P[i*3+2]],ry);mb.P[i*3]=p[0]+c[0];mb.P[i*3+1]=p[1]+c[1];mb.P[i*3+2]=p[2]+c[2];
  const n=V.rotY([mb.N[i*3],mb.N[i*3+1],mb.N[i*3+2]],ry);mb.N[i*3]=n[0];mb.N[i*3+1]=n[1];mb.N[i*3+2]=n[2];mb.T[i*2]*=.16;mb.T[i*2+1]*=.25;}};
  for(const sx of[-1,1])for(let i=0;i<5;i++){if(sx>0&&i>3)continue;blk([sx*4.2+(r()-.5)*.2,1+i*2.02,(r()-.5)*.2],[1.1,.98,1.1],(r()-.5)*.1);}
  for(let i=0;i<9;i++){const a=PI*(i/8);const c=[Math.cos(a)*4.2,10+Math.sin(a)*3.4,0];if(i>6)continue;blk(c,[.65,.55,1.05],0);}
  blk([5.5,.5,1.8],[1,.5,.8],.4);blk([-6,.4,-1.2],[.9,.4,.7],-.3);for(let i=0;i<mb.n;i++)mb.C[i*4]=clamp(.6+mb.N[i*3+1]*.3,.4,1);return mb;}
function genTower(seed){const mb=new MB();const n=20;const R=3.2,H0=14;
  grid(mb,n,10,(u,v)=>{const a=u*TAU;return{p:[Math.cos(a)*R*(1-.04*v),v*H0,Math.sin(a)*R*(1-.04*v)],n:[Math.cos(a),0,Math.sin(a)],uv:[u*3.5,v*3.5],c:[1,1,1,1]};});
  for(let k=0;k<8;k++){const a=k/8*TAU;const st=mb.n;box(mb,[Math.cos(a)*R*.95,H0+.6,Math.sin(a)*R*.95],[.7,.6,.5],[1,1,1,1]);void st;}
  // roof cone
  const st=mb.n;for(let k=0;k<=n;k++){const a=k/n*TAU;mb.v([Math.cos(a)*R*1.15,H0+1.2,Math.sin(a)*R*1.15],V.norm([Math.cos(a),.6,Math.sin(a)]),[k/n*4,0],[1,1,1,1]);mb.v([0,H0+6,0],V.norm([Math.cos(a),.6,Math.sin(a)]),[k/n*4,1],[1,1,1,1]);}
  for(let k=0;k<n;k++){const a=st+k*2;mb.q(a,a+2,a+3,a+1);}
  return mb;}
// mushroom cottage: spotted cap roof, plaster wall, door and two glowing windows
function genCottage(seed){const mb=new MB();const n=24,R=3.6,H0=5;
  grid(mb,n,6,(u,v)=>{const a=u*TAU;const rr=R*(1-.08*v);return{p:[Math.cos(a)*rr,v*H0,Math.sin(a)*rr],n:[Math.cos(a),0,Math.sin(a)],uv:[u,v],c:[0,1,0,1]};});
  const prof=[[1.55,-.1],[1.5,.25],[1.3,.9],[1.0,1.5],[.6,2.0],[.25,2.25],[0,2.3]];const st=mb.n;for(let i=0;i<prof.length;i++)for(let k=0;k<=n;k++){const a=k/n*TAU;const[rf,yf]=prof[i];
    mb.v([Math.cos(a)*R*rf,H0+yf*2.2,Math.sin(a)*R*rf],V.norm([Math.cos(a),.8,Math.sin(a)]),[k/n,i/prof.length],[1,0,0,1]);}
  for(let i=0;i<prof.length-1;i++)for(let k=0;k<n;k++){const a=st+i*(n+1)+k;mb.q(a,a+1,a+n+2,a+n+1);}
  // underside of the cap
  const s2=mb.n;for(let k=0;k<=n;k++){const a=k/n*TAU;mb.v([Math.cos(a)*R*1.55,H0-.22,Math.sin(a)*R*1.55],[0,-1,0],[k/n,0],[0,1,0,1]);mb.v([Math.cos(a)*R*.95,H0,Math.sin(a)*R*.95],[0,-1,0],[k/n,1],[0,1,0,1]);}
  for(let k=0;k<n;k++){const a=s2+k*2;mb.q(a,a+1,a+3,a+2);}
  box(mb,[0,1.5,R*.98],[.9,1.5,.12],[0,0,1,1]);box(mb,[R*.68,3,R*.7],[.45,.45,.12],[0,0,0,1]);box(mb,[-R*.68,3,R*.7],[.45,.45,.12],[0,0,0,1]);
  return mb;}
// spiral shell (grotto) for the pond
// the mermaid's shell: an open scallop. Two ribbed fans hinged at the back, the lower one a dish resting in the sand, the upper
// standing open behind it. Each valve has an outer skin (vCol.g = 0: sandy, banded) and a pearly lining (vCol.g = 1).
function genShell(seed){const mb=new MB();const nu=40,nv=16,HA=1.22;
  const pt=(u,v,up)=>{const ang=u*HA,rib=Math.cos(u*HA*14.4);const rad=v*1.55*(1-.1*u*u)*(1+.035*rib*v);const dome=.5*Math.pow(Math.sin(v*PI*.55),.9)*(1-.45*u*u)*(1-.35*v*v)+.028*rib*v;
    let x=Math.sin(ang)*rad,z=Math.cos(ang)*rad,y=up?dome:-dome*.6;if(up){const a=1.02,c=Math.cos(a),sn=Math.sin(a);const y2=y*c+z*sn,z2=-y*sn+z*c;y=y2+.04;z=z2;}return[x,y,z];};
  const valve=(up,inner)=>{const st=mb.n;for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const u=i/nu*2-1,v=j/nv;const p=pt(u,v,up);const e=.02;const a=pt(Math.min(1,u+e),v,up),b=pt(u,Math.min(1,v+e),up);let n=V.norm(V.cross(V.sub(b,p),V.sub(a,p)));
      if(V.len(n)<.5)n=[0,up?1:-1,0];if(!up)n=V.mul(n,1);const out=up?n:V.mul(n,1);const q=inner?V.madd(p,out,up?-.05:.05*-1):p;mb.v(q,inner?V.mul(out,-1):out,[u,v],[1,inner?1:0,v,1]);}
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=st+j*(nu+1)+i;mb.q(a,a+1,a+nu+2,a+nu+1);}};
  valve(false,false);valve(false,true);valve(true,false);valve(true,true);return mb;}
// coins and gems for the hoard
function genHoard(seed){const r=rng(seed);const mb=new MB();const gem=new MB();for(let i=0;i<70;i++){const a=r()*TAU,u=Math.sqrt(r())*2.2;const hh=Math.max(0,1.3-u*.55)*r();const c=[Math.cos(a)*u,hh+.08,Math.sin(a)*u];
  const tilt=[(r()-.5)*1.2,(r()-.5)*1.2];const st=mb.n;const up=V.norm([tilt[0],1,tilt[1]]);const side=V.perp(up),f=V.cross(up,side);
  for(let k=0;k<=12;k++){const ang=k/12*TAU;const d=V.add(V.mul(side,Math.cos(ang)),V.mul(f,Math.sin(ang)));mb.v(V.madd(V.madd(c,d,.32),up,.04),up,[0,0],[1,1,1,1]);mb.v(V.madd(V.madd(c,d,.32),up,-.04),d,[0,0],[1,1,1,1]);}
  const ci=mb.v(V.madd(c,up,.04),up,[0,0],[1,1,1,1]);for(let k=0;k<12;k++){const a0=st+k*2;mb.t(a0,a0+2,ci);mb.q(a0,a0+1,a0+3,a0+2);}}
  for(let i=0;i<9;i++){const a=r()*TAU,u=r()*1.6;const c=[Math.cos(a)*u,.25+r()*.5,Math.sin(a)*u];const s=.22+r()*.12;const ic=icosphere(0);const st=gem.n;for(const p of ic.P)gem.v(V.madd(c,p,s),p,[0,0],[1,0,r(),0]);for(const f of ic.F)gem.t(st+f[0],st+f[1],st+f[2]);}
  return{mb,gem};}
function genLantern(seed,post){const mb=new MB(),glass=new MB(),pole=new MB();const H0=post?7:0;
  if(post){tube(pole,[[0,0,0],[0,H0,0],[.6,H0+.6,0],[1.4,H0+.6,0]],t=>.18,6,{});}
  const top=post?[1.4,H0-.2,0]:[0,0,0];box(mb,V.add(top,[0,.1,0]),[.45,.06,.45]);box(mb,V.add(top,[0,-1.3,0]),[.4,.06,.4]);
  for(const[x,z]of[[-.38,-.38],[.38,-.38],[-.38,.38],[.38,.38]])box(mb,V.add(top,[x,-.6,z]),[.04,.65,.04]);
  const st=mb.n;for(let k=0;k<=8;k++){const a=k/8*TAU;mb.v(V.add(top,[Math.cos(a)*.5,.15,Math.sin(a)*.5]),V.norm([Math.cos(a),.7,Math.sin(a)]),[0,0],[1,1,1,1]);mb.v(V.add(top,[0,.65,0]),[0,1,0],[0,0],[1,1,1,1]);}
  for(let k=0;k<8;k++){const a=st+k*2;mb.q(a,a+2,a+3,a+1);}
  box(glass,V.add(top,[0,-.6,0]),[.34,.62,.34]);return{mb,glass,pole,light:V.add(top,[0,-.6,0])};}
function genBridge(seed){const mb=new MB();for(let i=0;i<9;i++){const x=(i-4)*1.15;const y=2.2*(1-Math.pow(x/5.2,2));box(mb,[x,y,0],[.5,.14,2.2],[1,1,1,1]);}
  for(const z of[-2.1,2.1]){const pts=[];for(let i=0;i<=10;i++){const x=(i-5)*1.05;pts.push([x,2.2*(1-Math.pow(x/5.6,2))+1.6,z]);}tube(mb,pts,.12,6,{});for(let i=0;i<=4;i++){const x=(i-2)*2.3;box(mb,[x,2.2*(1-Math.pow(x/5.2,2))+.8,z],[.12,.85,.12]);}}
  return mb;}
function genEgg(seed){const mb=new MB();const ic=icosphere(3);for(const p of ic.P){const q=[p[0]*.75,(p[1]>0?p[1]*1.15:p[1]*.95)+1,p[2]*.75];mb.v(q,p,[Math.atan2(p[2],p[0])/TAU+.5,p[1]*.5+.5],[1,1,1,1]);}for(const f of ic.F)mb.t(f[0],f[1],f[2]);mb.normals();return mb;}
function genMoonstone(seed){const mb=new MB();const ic=icosphere(3);const r=rng(seed);for(const p of ic.P){const d=1+.05*noise3(p[0]*2+seed,p[1]*2,p[2]*2);mb.v([p[0]*1.2*d,p[1]*.85*d+.7,p[2]*d],p,[0,0],[1,1,1,1]);}for(const f of ic.F)mb.t(f[0],f[1],f[2]);mb.normals();void r;return mb;}
// succulent rosettes: echeveria (fleshy spoon leaves) and haworthia (striped points)
function genEcheveria(seed,morph){const r=rng(seed);const mb=new MB();const n=34;for(let i=0;i<n;i++){const t=i/n;const a=i*2.39996;const L=lerp(2.2,.6,t),W=lerp(.9,.35,t);const lift=lerp(.15,1.05,t);
  const dir=V.norm([Math.cos(a)*(1-lift*.6),lift,Math.sin(a)*(1-lift*.6)]);const side=V.norm(V.cross(dir,[0,1,0]));const up=V.cross(side,dir);const st=mb.n;
  for(let j=0;j<=6;j++)for(let k=0;k<=4;k++){const u=j/6,v=k/4-.5;const w=W*Math.sin(Math.min(u*1.15,1)*PI*.5)*(1-Math.pow(u,5))*(1.05-u*.1);const thick=.22*(1-u)*(1-4*v*v)+.04;
    const p=V.add(V.add(V.madd([0,.15+t*.8,0],dir,u*L),V.mul(side,v*w*2)),V.mul(up,thick*.5-(4*v*v)*.12*W+u*u*.25));mb.v(p,up,[u,v],[1,1,1,u]);}
  for(let j=0;j<6;j++)for(let k=0;k<4;k++){const a0=st+j*5+k;mb.q(a0,a0+5,a0+6,a0+1);}}
  mb.normals();return mb;}
function genHaworthia(seed){const r=rng(seed);const mb=new MB();const n=26;for(let i=0;i<n;i++){const t=i/n;const a=i*2.39996;const L=lerp(2.4,1.0,t),W=lerp(.42,.2,t);const lift=lerp(.45,1.2,t);
  const dir=V.norm([Math.cos(a),lift,Math.sin(a)]);const side=V.norm(V.cross(dir,[0,1,0]));const up=V.cross(side,dir);const st=mb.n;
  for(let j=0;j<=5;j++)for(let k=0;k<=3;k++){const u=j/5,v=k/3-.5;const w=W*(1-u);const p=V.add(V.add(V.madd([0,.1,0],dir,u*L),V.mul(side,v*w*2)),V.mul(up,(1-4*v*v)*w*.5));mb.v(p,up,[u*6,v],[1,1,1,u]);}
  for(let j=0;j<5;j++)for(let k=0;k<3;k++){const a0=st+j*4+k;mb.q(a0,a0+4,a0+5,a0+1);}}
  mb.normals();return mb;}
// lily pad: a waxy disc with a notch, floating flat
function genLilyPad(seed){const r=rng(seed);const mb=new MB();const n=26,R=1.1+r()*.6;const notch=r()*TAU;const c0=mb.v([0,.03,0],[0,1,0],[.5,.5],[1,1,1,.8]);
  for(let i=0;i<=n;i++){const a=notch+.18+i/n*(TAU-.36);const rr=R*(1+.04*Math.sin(a*5+seed));mb.v([Math.cos(a)*rr,.0,Math.sin(a)*rr],[0,1,0],[.5+.5*Math.cos(a),.5+.5*Math.sin(a)],[1,1,1,1]);}
  for(let i=0;i<n;i++)mb.t(c0,c0+1+i+1,c0+1+i);return mb;}
