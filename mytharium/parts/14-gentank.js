
// ============================================================
//  TANK & ROOM
// ============================================================
// 120 x 60 x 54 cm front-opening terrarium (long and low, like the concept); inner glass faces at x = ±59.4, z = ±29.4; floor glass top at y = 0
const TK={x0:-60,x1:60,z0:-30,z1:30,h:54,g:.6,ix0:-59.4,ix1:59.4,iz0:-29.4,iz1:29.4,doorY:13,pwl:9.5};
const HEATP=[-40,TK.h+4.5,-6],LEDY=TK.h+2.5;
function genTank(){const o={};
  // glass: front (doors above doorY, fixed strip below), sides; vCol.r marks the front (wipeable), vCol.g the dark seams
  const gl_=new MB();const quad=(a,b,c,d,n,col,uvs)=>{const s=gl_.n;gl_.v(a,n,uvs[0],col);gl_.v(b,n,uvs[1],col);gl_.v(c,n,uvs[2],col);gl_.v(d,n,uvs[3],col);gl_.q(s,s+1,s+2,s+3);};
  const fz=TK.z1-.3,x0=TK.x0+.3,x1=TK.x1-.3,H0=TK.h;const uvF=(x,y)=>[(x-x0)/(x1-x0),y/H0];
  quad([x0,0,fz],[x1,0,fz],[x1,H0,fz],[x0,H0,fz],[0,0,1],[1,0,0,1],[uvF(x0,0),uvF(x1,0),uvF(x1,H0),uvF(x0,H0)]);
  for(const sx of[-1,1]){const x=sx*(TK.x1-.3);quad([x,0,TK.z0],[x,0,TK.z1],[x,H0,TK.z1],[x,H0,TK.z0],[sx,0,0],[0,0,0,1],[[0,0],[1,0],[1,1],[0,1]]);}
  // seams: the door split in the middle, the rail above the fixed strip
  const seam=(x,y,w,h)=>{quad([x-w,y-h,fz+.05],[x+w,y-h,fz+.05],[x+w,y+h,fz+.05],[x-w,y+h,fz+.05],[0,0,1],[1,1,0,1],[[0,0],[1,0],[1,1],[0,1]]);};
  seam(0,(TK.doorY+H0)/2,.25,(H0-TK.doorY)/2);seam(0,TK.doorY,x1,.22);
  o.glass=gl_;
  // black frame: vertical posts, top and bottom rails, door handles
  const fr=new MB();for(const x of[TK.x0,TK.x1])for(const z of[TK.z0,TK.z1])box(fr,[x,H0/2,z],[.9,H0/2+.6,.9]);
  for(const y of[-.6,H0+.3]){box(fr,[0,y,TK.z0],[TK.x1+.9,.7,.9]);box(fr,[0,y,TK.z1],[TK.x1+.9,.7,.9]);box(fr,[TK.x0,y,0],[.9,.7,TK.z1+.9]);box(fr,[TK.x1,y,0],[.9,.7,TK.z1+.9]);}
  box(fr,[0,TK.doorY,TK.z1+.2],[TK.x1,.2,.35]);for(const sx of[-1,1])box(fr,[sx*1.8,TK.h*.55,TK.z1+.9],[.25,4.5,.4]);
  box(fr,[0,-1.6,0],[TK.x1+1.2,.8,TK.z1+1.2]);
  o.frame=fr;
  // mesh lid (perforated in the shader)
  const lid=new MB();grid(lid,8,4,(u,v)=>({p:[lerp(TK.x0,TK.x1,u),H0+.6,lerp(TK.z0,TK.z1,v)],n:[0,1,0],uv:[u,v]}));o.lid=lid;
  // LED bar and heat-lamp dome sitting on the lid; vCol.r = diffuser, vCol.g = bulb
  const lamp=new MB();box(lamp,[0,LEDY,-6],[46,1.2,4],[0,0,0,1]);box(lamp,[0,LEDY-1.25,-6],[44,.08,3.4],[1,0,0,1]);
  const dc=HEATP;const st=lamp.n;for(let j=0;j<=8;j++)for(let i=0;i<=16;i++){const a=i/16*TAU,t=j/8;const rr=lerp(6,1.5,t*t),y=dc[1]+t*6.5;lamp.v([dc[0]+Math.cos(a)*rr,y,dc[2]+Math.sin(a)*rr],V.norm([Math.cos(a),.7,Math.sin(a)]),[0,0],[0,0,0,1]);}
  for(let j=0;j<8;j++)for(let i=0;i<16;i++){const a=st+j*17+i;lamp.q(a,a+1,a+18,a+17);}
  const ib=icosphere(2);const s2=lamp.n;for(const p of ib.P)lamp.v(V.madd([dc[0],dc[1]+1.6,dc[2]],p,2.2),p,[0,0],[0,1,0,1]);for(const f of ib.F)lamp.t(s2+f[0],s2+f[1],s2+f[2]);
  o.lamp=lamp;
  o.cab=genStand();
  // room: wooden floor and panelled walls (vCol.g marks the floor), a rug under the stand (vCol.b)
  const room=new MB();grid(room,1,1,(u,v)=>({p:[lerp(-400,400,u),-80,lerp(-90,500,v)],n:[0,1,0],uv:[u,v],c:[0,1,0,1]}),true);
  grid(room,1,1,(u,v)=>({p:[lerp(-95,95,u),-79.9,lerp(-55,75,v)],n:[0,1,0],uv:[u,v],c:[0,1,1,1]}),true);
  grid(room,1,1,(u,v)=>({p:[lerp(-400,400,u),lerp(-80,260,v),-90],n:[0,0,1],uv:[u,v],c:[0,0,0,1]}));
  grid(room,1,1,(u,v)=>({p:[-260,lerp(-80,260,v),lerp(-90,500,u)],n:[1,0,0],uv:[u,v],c:[0,0,0,1]}),true);
  grid(room,1,1,(u,v)=>({p:[260,lerp(-80,260,v),lerp(-90,500,u)],n:[-1,0,0],uv:[u,v],c:[0,0,0,1]}));
  grid(room,1,1,(u,v)=>({p:[lerp(-260,260,u),lerp(-80,260,v),500],n:[0,0,-1],uv:[u,v],c:[0,0,0,1]}),true);o.room=room;
  return o;}

// ---------- the stand: a carved mahogany cabinet worthy of the tank ----------
// vCol = (grain axis 0 x · .5 z · 1 y, carving 0 none · .5 fluting · 1 relief, brass, ao)
function genStand(){const mb=new MB();const GX=[0,0,0,1],GY=[1,0,0,1],GZ=[.5,0,0,1],CV=[0,1,0,1],FL=[1,.5,0,1],BR=[0,0,1,1];
  const B=(c,h,col)=>box(mb,c,h,col);
  const lathe=(c,prof,seg,col)=>{const st=mb.n;for(let i=0;i<prof.length;i++){const[y,r]=prof[i];const yp=prof[Math.max(0,i-1)],yn=prof[Math.min(prof.length-1,i+1)];const dy=yn[0]-yp[0],dr=yn[1]-yp[1];
      for(let k=0;k<=seg;k++){const a=k/seg*TAU,ca=Math.cos(a),sa=Math.sin(a);const n=V.norm([ca*dy,-dr,sa*dy]);mb.v([c[0]+ca*r,c[1]+y,c[2]+sa*r],n,[k/seg,i/prof.length],col);}}
    for(let i=0;i<prof.length-1;i++)for(let k=0;k<seg;k++){const a=st+i*(seg+1)+k;mb.q(a,a+seg+1,a+seg+2,a+1);}};
  // raised panel: a bevelled field standing proud of its frame; face = +z, -z, +x or -x
  const panel=(c,hw,hh,face,depth,bev,col)=>{const st=mb.n;const ax=face[0]!==0;const s=face[0]+face[2];const P=(u,v,d)=>ax?[c[0]+s*d,c[1]+v,c[2]+u*-s]:[c[0]+u*s,c[1]+v,c[2]+s*d];
    const back=[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]],front=[[-hw+bev,-hh+bev],[hw-bev,-hh+bev],[hw-bev,hh-bev],[-hw+bev,hh-bev]];
    for(let e=0;e<4;e++){const a=back[e],b=back[(e+1)%4],cF=front[(e+1)%4],dF=front[e];const p0=P(a[0],a[1],0),p1=P(b[0],b[1],0),p2=P(cF[0],cF[1],depth),p3=P(dF[0],dF[1],depth);
      const n=V.norm(V.cross(V.sub(p1,p0),V.sub(p3,p0)));const k=mb.n;mb.v(p0,n,[0,0],[col[0],0,0,.8]);mb.v(p1,n,[1,0],[col[0],0,0,.8]);mb.v(p2,n,[1,1],[col[0],0,0,1]);mb.v(p3,n,[0,1],[col[0],0,0,1]);mb.q(k,k+1,k+2,k+3);}
    const k=mb.n;const fn=face;for(const f of front)mb.v(P(f[0],f[1],depth),fn,[f[0],f[1]],col);mb.q(k,k+1,k+2,k+3);
    for(let i=st;i<mb.n;i++){const nn=[mb.N[i*3],mb.N[i*3+1],mb.N[i*3+2]];if(V.dot(nn,face)<-.01){mb.N[i*3]*=-1;mb.N[i*3+1]*=-1;mb.N[i*3+2]*=-1;}}};
  const bead=(a,b,r,col)=>tube(mb,[a,b],r,10,{col:()=>col});
  // top: thick board with a moulded edge, cove and bead below
  B([0,-3.25,0],[66,.85,35.2],GX);B([0,-4.4,0],[65.2,.35,34.5],GX);B([0,-5.15,0],[64.2,.45,33.6],GX);
  for(const z of[-34.1,34.1])bead([-64.6,-4.82,z],[64.6,-4.82,z],.42,GX);for(const x of[-64.6,64.6])bead([x,-4.82,-34.1],[x,-4.82,34.1],.42,GZ);
  // carved frieze, with a small moulding under it
  B([0,-7.6,0],[63.4,2.05,32.9],CV);B([0,-9.95,0],[63.9,.35,33.4],GX);
  // carcass
  B([0,-34,0],[62,24.2,31],GY);
  // two raised-panel doors with brass pulls and a keyhole
  for(const sx of[-1,1]){const cx=sx*30.4,z=31;
    B([cx-27.4,-34,z+.45],[1.9,22,.45],GY);B([cx+27.4,-34,z+.45],[1.9,22,.45],GY);B([cx,-14,z+.45],[25.5,2,.45],GX);B([cx,-54,z+.45],[25.5,2,.45],GX);
    panel([cx,-34,z+.9],25.5,18,[0,0,1],1.1,3.4,[1,1,0,1]);
    // a brass pull: turned along y, then stood out of the door along +z
    const st=mb.n;lathe([sx*3.2,-34,z+1.3],[[0,0],[.15,.55],[.5,.42],[.9,.75],[1.25,.6],[1.35,0]],12,BR);
    for(let i=st;i<mb.n;i++){const cy=-34,cz=z+1.3;const y=mb.P[i*3+1]-cy,zz=mb.P[i*3+2]-cz;mb.P[i*3+1]=cy+zz;mb.P[i*3+2]=cz+y;const ny=mb.N[i*3+1],nz=mb.N[i*3+2];mb.N[i*3+1]=nz;mb.N[i*3+2]=ny;}}
  B([0,-34,32.15],[1.1,1.9,.12],BR);B([0,-34.4,32.3],[.2,.55,.05],[0,0,0,.2]);
  for(const sx of[-1,1])for(const y of[-19,-49])B([sx*59.2,y,31.95],[.35,2.2,.18],BR);
  // side panels
  for(const sx of[-1,1]){const x=sx*62;B([x+sx*.45,-34,-27.4],[.45,22,1.9],GY);B([x+sx*.45,-34,27.4],[.45,22,1.9],GY);B([x+sx*.45,-14,0],[.45,2,25.5],GZ);B([x+sx*.45,-54,0],[.45,2,25.5],GZ);
    panel([x+sx*.9,-34,0],25.5,18,[sx,0,0],1.1,3.4,[1,1,0,1]);}
  // fluted pilasters at the front corners, with capitals and bases
  for(const sx of[-1,1]){const x=sx*60.6;B([x,-34,31.4],[2.5,21.2,1.3],FL);B([x,-12.2,31.5],[3.1,.8,1.6],GX);B([x,-11.2,31.6],[3.4,.3,1.75],GX);B([x,-56.1,31.5],[3.1,1.0,1.6],GX);B([x,-57.4,31.6],[3.4,.35,1.75],GX);}
  // base mouldings and a carved apron
  B([0,-58.6,0],[63.4,1.5,32.6],GX);B([0,-60.35,0],[64.3,.45,33.3],GX);for(const z of[-33.2,33.2])bead([-64,-60.85,z],[64,-60.85,z],.4,GX);
  B([0,-62.6,0],[60.6,1.9,29.8],CV);
  // cabriole legs with carved knees and ball feet
  for(const sx of[-1,1])for(const sz of[-1,1]){const c=[sx*57.2,0,sz*26.6];const o=V.norm([sx,0,sz]);const pts=[];const N=22;
    for(let i=0;i<=N;i++){const t=i/N;const off=2.7*Math.exp(-Math.pow((t-.16)/.17,2))-1.0*Math.exp(-Math.pow((t-.8)/.12,2))+.9*sstep(.86,1,t);pts.push([c[0]+o[0]*off,lerp(-60.8,-78.0,t),c[2]+o[2]*off]);}
    tube(mb,pts,t=>lerp(3.3,1.15,sstep(0,.82,t))+.5*Math.exp(-Math.pow((t-.1)/.1,2)),14,{col:t=>[1,t<.26?1:0,0,1],smooth:true});
    const f=V.add(pts[N],[0,-.4,0]);lathe([f[0],-80,f[2]],[[0,0],[0,1.2],[.4,1.8],[1.2,2.05],[2.1,1.7],[2.6,1.0],[2.8,0]],14,GY);}
  mb.normals&&0;return mb;}
