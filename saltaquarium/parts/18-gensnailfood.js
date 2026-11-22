
// ---------- snail shells ----------
// a coiled shell as a cone of whorls: apex up and back, aperture forward and low. uv = (around, 0 aperture .. 1 apex)
function shellInto(mb,o){const NA=30,NV=34,base=o.base,ax=V.norm(o.axis),s1=V.norm(V.cross(ax,[0,0,1])),s2=V.cross(ax,s1);
  for(let j=0;j<=NV;j++)for(let i=0;i<=NA;i++){const u=i/NA,v=j/NV,a=u*TAU;const wh=o.whorls*v;
    const bulge=1+o.round*Math.pow(Math.sin(PI*(wh%1)),0.8)*0.18-0.1*o.round;const rr=o.R*Math.pow(1-v,o.taper)*bulge+0.002;
    const off=V.add(V.mul(s1,Math.cos(a+wh*TAU*0.25)*rr),V.mul(s2,Math.sin(a+wh*TAU*0.25)*rr*o.flat));
    mb.v(V.add(V.madd(base,ax,o.H*Math.pow(v,o.hp||1)),off),[0,1,0],[u,v],[1,1,1,1],[o.part,0,0,0]);}
  const b=mb.n-(NV+1)*(NA+1);for(let j=0;j<NV;j++)for(let i=0;i<NA;i++){const q0=b+j*(NA+1)+i;mb.q(q0,q0+1,q0+NA+2,q0+NA+1);}}
// 0 nerite (low, round), 1 turbo (rounded whorls), 2 trochus (tall straight cone), 3 nassarius (small, pointed, with a long siphon)
function genSnail(type=0){const mb=new MB();
  if(type===0){grid(mb,40,20,(u,v)=>{const a=u*TAU,k=Math.sin(Math.min(v,1)*PI/2),rx=0.5*k+0.001,rz=0.43*k+0.001,b=Math.pow(1-v,1.6);const y=0.11+0.34*Math.cos(v*PI/2)+0.03*Math.pow(1-v,6);
      return{p:[Math.cos(a)*rx-0.3*b,y,Math.sin(a)*rz+0.06*b],uv:[u,v],e:[0,0,0,0]};});}
  else if(type===1)shellInto(mb,{base:[-0.02,0.1,0],axis:[-0.35,1,0.1],R:0.5,H:0.62,whorls:4,taper:0.85,round:1.2,flat:0.92,part:0,hp:0.9});
  else if(type===2)shellInto(mb,{base:[-0.02,0.1,0],axis:[-0.2,1,0.05],R:0.5,H:0.95,whorls:6.5,taper:1.0,round:0.35,flat:1,part:0});
  else shellInto(mb,{base:[-0.05,0.09,0],axis:[-0.9,0.55,0.05],R:0.36,H:0.85,whorls:5,taper:1.1,round:0.8,flat:0.95,part:0});
  mb.normals();
  {const c=mb.v([0,0.11,0],[0,-1,0],[0.5,0.5],[1,1,1,1],[3,0,0,0]);const N=40;for(let i=0;i<=N;i++){const a=i/N*TAU;mb.v([Math.cos(a)*0.5,0.11,Math.sin(a)*0.43],[0,-1,0],[0.5+Math.cos(a)*0.5,0.5+Math.sin(a)*0.5],[1,1,1,1],[3,1,0,0]);}for(let i=0;i<N;i++)mb.t(c,c+1+i,c+2+i);}
  const s=icosphere(2);for(const[sx,sy,sz,ox,oy]of[[0.5,0.06,0.34,0.06,0.05],[0.11,0.05,0.1,0.52,0.065]]){const b=mb.n;for(const p of s.P){const q=[p[0]*sx+ox,p[1]*sy+oy,p[2]*sz];mb.v(q,p,[q[0],q[2]],[1,1,1,1],[1,0,0,0]);}for(const f of s.F)mb.t(b+f[0],b+f[1],b+f[2]);}
  for(const sg of[-1,1])tube(mb,[[0.5,0.09,sg*0.08],[0.6,0.12,sg*0.13],[0.68,0.13,sg*0.17]],t=>lerp(0.025,0.008,t),4,{ext:t=>[2,t,0,0]});
  if(type===3)tube(mb,crs([[0.45,0.12,0],[0.62,0.25,0],[0.78,0.45,0],[0.86,0.62,0]],10),t=>lerp(0.035,0.022,t),6,{cap:true,ext:t=>[2,t,1,0]});
  return mb;}

// ---------- food ----------
function genFood(kind){const mb=new MB();
  if(kind===2)tube(mb,[[-0.12,0,0],[0.12,0,0]],0.16,8,{cap:true,cap0:true,smooth:true});
  else if(kind===3){const p=[];for(let i=0;i<=14;i++)p.push([lerp(-0.45,0.45,i/14),0.04*Math.sin(i/14*PI),0]);tube(mb,p,t=>0.07*(1-Math.pow(Math.abs(t-0.4)*1.7,3)*0.6),6,{cap:true,cap0:true});}
  else if(kind===4){const r=rng(5);const c=mb.v([0,0,0],[0,1,0]);const n=11;for(let i=0;i<=n;i++){const a=i/n*TAU,R=0.9+r()*0.35;mb.v([Math.cos(a)*R,0.05*Math.sin(a*3),Math.sin(a)*R*0.8],[0,1,0]);}for(let i=0;i<n;i++)mb.t(c,c+2+i,c+1+i);}
  else tube(mb,[[0,-0.1,0],[0,0.1,0]],0.9,14,{cap:true,cap0:true});
  return mb;}
function genQuad(){const mb=new MB();mb.v([-1,-1,0]);mb.v([1,-1,0]);mb.v([1,1,0]);mb.v([-1,1,0]);mb.q(0,1,2,3);return mb;}
