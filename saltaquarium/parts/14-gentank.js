// ---------- tank, stand, room ----------
function genTank(){const o={};const g=TK.gt,X=TK.gx,Z=TK.gz,Y0=-g,Y1=TK.top;
  const bgm=new MB();bgm.v([-X,Y0,-Z-0.05],[0,0,1]);bgm.v([X,Y0,-Z-0.05],[0,0,1]);bgm.v([X,Y1,-Z-0.05],[0,0,1]);bgm.v([-X,Y1,-Z-0.05],[0,0,1]);bgm.q(0,1,2,3);o.bg=bgm;
  const sil=new MB();for(const x of[TK.x0+0.3,TK.x1-0.3])for(const z of[TK.z0+0.3,TK.z1-0.3])box(sil,[x,TK.top/2-0.2,z],[0.32,TK.top/2-0.4,0.32]);
  o.sil=sil;
  // glass faces
  const gm=new MB();const face=(a,b,c,d,n,edge,men)=>{const k=gm.n;for(const p of[a,b,c,d])gm.v(p,n,[0,0],[edge,men,0,1]);gm.q(k,k+1,k+2,k+3);};
  face([-X,Y0,Z],[X,Y0,Z],[X,Y1,Z],[-X,Y1,Z],[0,0,1],0,1);
  face([X,Y0,Z],[X,Y0,-Z],[X,Y1,-Z],[X,Y1,Z],[1,0,0],0,1);
  face([-X,Y0,-Z],[-X,Y0,Z],[-X,Y1,Z],[-X,Y1,-Z],[-1,0,0],0,1);
  face([X,Y0,-Z],[-X,Y0,-Z],[-X,Y1,-Z],[X,Y1,-Z],[0,0,-1],0,1);
  // top edges
  face([-X,Y1,Z-g],[X,Y1,Z-g],[X,Y1,Z],[-X,Y1,Z],[0,1,0],1,0);
  face([-X,Y1,-Z],[X,Y1,-Z],[X,Y1,-Z+g],[-X,Y1,-Z+g],[0,1,0],1,0);
  face([X-g,Y1,-Z+g],[X,Y1,-Z+g],[X,Y1,Z-g],[X-g,Y1,Z-g],[0,1,0],1,0);
  face([-X,Y1,-Z+g],[-X+g,Y1,-Z+g],[-X+g,Y1,Z-g],[-X,Y1,Z-g],[0,1,0],1,0);
  // vertical front edges (pane thickness seen from the side)
  face([X,Y0,Z-g],[X,Y0,Z],[X,Y1,Z],[X,Y1,Z-g],[1,0,0],1,0);
  face([-X,Y0,Z],[-X,Y0,Z-g],[-X,Y1,Z-g],[-X,Y1,Z],[-1,0,0],1,0);
  face([X,Y0,-Z],[X,Y0,-Z+g],[X,Y1,-Z+g],[X,Y1,-Z],[1,0,0],1,0);
  face([-X,Y0,-Z+g],[-X,Y0,-Z],[-X,Y1,-Z],[-X,Y1,-Z+g],[-1,0,0],1,0);
  // bottom glass front edge
  face([-X,Y0,Z],[X,Y0,Z],[X,0,Z],[-X,0,Z],[0,0,1],1,0);
  face([X,Y0,-Z],[-X,Y0,-Z],[-X,0,-Z],[X,0,-Z],[0,0,-1],1,0);
  o.glass=gm;
  const st=new MB();box(st,[0,-2.8,0],[53.5,1.5,26.5]);box(st,[0,-43.5,-0.5],[51.5,39.2,25]);
  box(st,[-25.6,-43.5,24.55],[25.3,38.6,0.15]);box(st,[25.6,-43.5,24.55],[25.3,38.6,0.15]);o.stand=st;
  const mat=new MB();box(mat,[0,-1.05,0],[X+0.2,0.25,Z+0.2]);o.mat=mat;
  const rm=new MB();const q4=(a,b,c,d,n)=>{const k=rm.n;for(const p of[a,b,c,d])rm.v(p,n);rm.q(k,k+1,k+2,k+3);};
  q4([-400,-82.3,400],[400,-82.3,400],[400,-82.3,-400],[-400,-82.3,-400],[0,1,0]);o.room=rm;
  const wl=new MB();{const k=wl.n;for(const p of[[-400,-82.3,-48],[400,-82.3,-48],[400,250,-48],[-400,250,-48]])wl.v(p,[0,0,1]);wl.q(k,k+1,k+2,k+3);}o.wall=wl;
  const fx=new MB();box(fx,[0,TK.wl+13,0],[46,0.8,5.5]);const k=fx.n;
  fx.v([-44.5,TK.wl+12.15,-4.6],[0,-1,0],[0,0],[1,1,1,1],[1,0,0,0]);fx.v([44.5,TK.wl+12.15,-4.6],[0,-1,0],[0,0],[1,1,1,1],[1,0,0,0]);
  fx.v([44.5,TK.wl+12.15,4.6],[0,-1,0],[0,0],[1,1,1,1],[1,0,0,0]);fx.v([-44.5,TK.wl+12.15,4.6],[0,-1,0],[0,0],[1,1,1,1],[1,0,0,0]);fx.q(k,k+3,k+2,k+1);
  for(const x of[-45.5,45.5])for(const z of[-4,4])tube(fx,[[x,TK.wl+12.4,z],[x*1.04,TK.top+0.4,z*1.6]],0.35,6,{cap:true,cap0:true});
  o.fixture=fx;
  const sm=new MB();grid(sm,48,24,(u,v)=>({p:[lerp(TK.x0,TK.x1,u),TK.wl,lerp(TK.z1,TK.z0,v)],n:[0,1,0]}));o.surf=sm;
  return o;}

