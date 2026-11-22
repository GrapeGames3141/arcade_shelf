
// ---------- reef rock ----------
// Live rock is old reef limestone: lumpy, full of holes, with stubs of dead coral branches sticking out (photos of aquascapes show
// knobbly, branchy pieces, never smooth boulders). variant 0 live rock, 1 dry rock (same shapes, sharper), 2 shelf rock, 3 rubble pile.
function genRock(seed,variant){const r=rng(seed),mb=new MB();
  const one=(sub,sx,sy,sz,cx,cy,cz,amp,knobs,crat)=>{const s=icosphere(sub),off=r()*100,b=mb.n;
    const K=[];for(let i=0;i<knobs;i++)K.push([V.norm([r()*2-1,r()*1.7-0.25,r()*2-1]),0.2+r()*0.5,0.18+r()*0.2]);
    const C=[];for(let i=0;i<crat;i++)C.push([V.norm([r()*2-1,r()*2-1,r()*2-1]),0.1+r()*0.16,0.12+r()*0.18]);
    for(const p of s.P){let d=fbm3(p[0]*1.05+off,p[1]*1.05,p[2]*1.05,4)*amp;
      d+=(0.42-Math.abs(fbm3(p[0]*2.7+off,p[1]*2.7+3,p[2]*2.7,3)))*amp*0.75+(0.3-Math.abs(fbm3(p[0]*6+off,p[1]*6,p[2]*6+5,2)))*amp*0.25;
      for(const[kd,kh,kw]of K){const c=V.dot(p,kd);if(c>1-kw)d+=kh*Math.pow((c-(1-kw))/kw,1.3);}
      for(const[cd,cr,cdp]of C){const c=V.dot(p,cd);if(c>1-cr)d-=cdp*Math.sin(PI*0.5*(c-(1-cr))/cr);}
      let q=V.mul(p,Math.max(0.35,1+d));q=V.mul(q,1+fbm3(p[0]*6.5+off,p[1]*6.5,p[2]*6.5,2)*(variant===1?0.06:0.035));
      mb.v([q[0]*sx+cx,q[1]*sy+cy,q[2]*sz+cz],p,[0,0],[1,1,1,1],[0,0,0,0]);}
    for(const f of s.F)mb.t(b+f[0],b+f[1],b+f[2]);};
  if(variant===3){const n=5+Math.floor(r()*4);let ang=r()*TAU;
    for(let k=0;k<n;k++){const sc=0.28+r()*0.3,rr=k===0?0:0.6+r()*0.9;ang+=1.4+r();
      if(r()<0.45){const L=0.7+r()*0.8,a2=r()*TAU,pts=[];for(let i=0;i<=8;i++){const t=i/8;pts.push([Math.cos(ang)*rr+Math.cos(a2)*(t-0.5)*L,0.12+Math.sin(t*3+k)*0.05,Math.sin(ang)*rr+Math.sin(a2)*(t-0.5)*L]);}
        const off=r()*50;tube(mb,pts,t=>0.13*(1-0.3*t)+0.02,9,{cap:true,cap0:true,rmod:(t,u,pp)=>1+fbm3(pp[0]*4+off,pp[1]*4,pp[2]*4,2)*0.4});}
      else one(3,sc*(0.9+r()*0.4),sc*(0.6+r()*0.3),sc*(0.8+r()*0.3),Math.cos(ang)*rr,0,Math.sin(ang)*rr,0.25,1,1);}}
  else if(variant===2){one(4,1.15+r()*0.3,0.22+r()*0.06,0.9+r()*0.25,0,0,0,0.16,0,2);
    for(let i=0;i<mb.n;i++){const x=mb.P[i*3],z=mb.P[i*3+2];mb.P[i*3+1]+=0.08*Math.sin(x*2.1+seed)+0.1*x*0.3;}}
  else{const sx=0.85+r()*0.5,sy=0.6+r()*0.55,sz=0.7+r()*0.4;one(4,sx,sy,sz,0,0,0,variant===1?0.44:0.4,6+Math.floor(r()*5),4+Math.floor(r()*4));
    if(r()<0.85){const s2=0.45+r()*0.25,a=r()*TAU;one(3,s2*sx,s2*sy*1.1,s2*sz,Math.cos(a)*sx*0.7,sy*0.35,Math.sin(a)*sz*0.6,0.35,2,1);}
    // stubs of old coral branches poking out of the limestone (the signature of real live rock)
    const ns=3+Math.floor(r()*4),n0=mb.n;
    for(let k=0;k<ns;k++){const d=V.norm([r()*2-1,0.15+r()*1.1,r()*2-1]);let bi=0,bd=-9;
      for(let i=0;i<n0;i++){const q=[mb.P[i*3],mb.P[i*3+1],mb.P[i*3+2]],l=V.len(q)||1,dd=(q[0]*d[0]+q[1]*d[1]+q[2]*d[2])/l;if(dd>bd){bd=dd;bi=i;}}
      const p0=[mb.P[bi*3],mb.P[bi*3+1],mb.P[bi*3+2]],dir=V.norm(V.add(d,[0,0.35,0])),L=0.4+r()*0.5,rad=0.08+r()*0.07,off=r()*40,pts=[];
      for(let i=0;i<=5;i++){const t=i/5;pts.push(V.add(V.madd(p0,dir,-0.06+t*L),[Math.sin(t*3+off)*0.04,0,Math.cos(t*2.5+off)*0.04]));}
      tube(mb,pts,t=>rad*(1-0.45*t),7,{cap:true,capH:0.4,rmod:(t,u,pp)=>1+fbm3(pp[0]*9+off,pp[1]*9,pp[2]*9,2)*0.45});
      if(r()<0.5){const t0=0.5+r()*0.3,pb=V.madd(p0,dir,-0.12+t0*L),d2=V.norm(V.add(V.rot(V.perp(dir),dir,r()*TAU),V.mul(dir,0.8))),p2=[];
        for(let i=0;i<=4;i++)p2.push(V.madd(pb,d2,i/4*L*0.5));tube(mb,p2,t=>rad*0.7*(1-0.4*t),6,{cap:true,capH:0.4,rmod:(t,u,pp)=>1+fbm3(pp[0]*9+off,pp[1]*9,pp[2]*9,2)*0.4});}}}
  mb.normals();
  rockAO(mb);
  const bb=mb.bounds();const sink=bb.mn[1]+(bb.mx[1]-bb.mn[1])*(variant===3?0.25:variant===2?0.05:0.15);for(let i=0;i<mb.n;i++)mb.P[i*3+1]-=sink;
  return mb;}
// cavity AO into vertex alpha (concave spots darker)
function rockAO(mb){const nb=new Float32Array(mb.n*4);const I=mb.I,P=mb.P;
  for(let k=0;k<I.length;k+=3)for(let e=0;e<3;e++){const a=I[k+e],b=I[k+(e+1)%3];for(let c=0;c<3;c++){nb[a*4+c]+=P[b*3+c];nb[b*4+c]+=P[a*3+c];}nb[a*4+3]++;nb[b*4+3]++;}
  for(let i=0;i<mb.n;i++){const c=nb[i*4+3]||1;const dx=nb[i*4]/c-P[i*3],dy=nb[i*4+1]/c-P[i*3+1],dz=nb[i*4+2]/c-P[i*3+2];
    const cav=dx*mb.N[i*3]+dy*mb.N[i*3+1]+dz*mb.N[i*3+2];mb.C[i*4+3]=clamp(1-cav*28,0.35,1)*(0.7+0.3*clamp(mb.N[i*3+1]*0.5+0.6,0,1));}}
// a rock arch: a lumpy limestone bridge with both feet in the sand
function genArch(seed){const r=rng(seed),mb=new MB(),off=r()*100,pts=[],n=34,R=1.0,H=0.75+r()*0.25;
  for(let i=0;i<=n;i++){const a=PI*i/n;pts.push([Math.cos(a)*R*(1+0.08*Math.sin(a*3+off)),Math.sin(a)*H*(1+0.1*Math.sin(a*2+off)),Math.sin(a*2.3+off)*0.12]);}
  pts[0][1]=-0.15;pts[n][1]=-0.15;
  tube(mb,pts,t=>0.26+0.14*Math.pow(Math.abs(t-0.5)*2,2)+0.04*Math.sin(t*9+off),18,{cap:true,cap0:true,
    rmod:(t,u,pp)=>1+fbm3(pp[0]*2.2+off+Math.cos(u*TAU)*0.6,pp[1]*2.2+Math.sin(u*TAU)*0.6,pp[2]*2.2,4)*0.55+(0.35-Math.abs(fbm3(pp[0]*5+off,pp[1]*5,pp[2]*5+Math.cos(u*TAU),2)))*0.25});
  mb.normals();rockAO(mb);return mb;}
