// ---------- fish ----------
const FISHP={
  // h: half body depth at its deepest (body length ~0.82); tmT/tmB: where the back and belly peak (0 nose, 1 tail base); headE: forehead curve;
  // mouthY: snout centre offset in half-depths (+ up-turned, - underslung); eye: [t, y in half-depths, radius]; dors/dors2/anal: [x centre, length, height]
  clown:{h:.17,w:.07,top:1,bot:1,ped:.42,tmT:.38,tmB:.45,headE:1.6,snT:.28,snB:.22,mouthY:0,eye:[.12,.22,.046],caud:{len:.19,span:.15,fork:0,fan:true},dors:[-.02,.52,.13],notch:[.42,.55],anal:[-.18,.22,.12],pec:.3},
  bluetang:{h:.2,w:.055,top:1,bot:1,ped:.3,tmT:.42,tmB:.46,headE:1.35,snT:.2,snB:.16,mouthY:.1,eye:[.14,.3,.04],caud:{len:.21,span:.21,fork:.25},dors:[-.04,.62,.09],anal:[-.1,.42,.085],pec:.32},
  yellowtang:{h:.31,w:.05,top:1,bot:1,ped:.24,tmT:.5,tmB:.46,headE:.72,snT:.08,snB:.07,mouthY:.25,eye:[.17,.34,.04],caud:{len:.18,span:.17,fork:.1},dors:[-.06,.66,.15],anal:[-.1,.5,.135],pec:.34},
  gramma:{h:.13,w:.05,top:1,bot:1,ped:.42,tmT:.38,tmB:.45,headE:1.6,snT:.22,snB:.18,mouthY:.15,eye:[.12,.2,.05],caud:{len:.21,span:.15,fork:.3},dors:[-.04,.58,.12],anal:[-.16,.3,.1],pec:.3,pelv:1.8},
  mandarin:{h:.145,w:.11,top:1.05,bot:.8,ped:.4,tmT:.35,tmB:.35,headE:1.3,snT:.3,snB:.25,mouthY:-.1,eye:[.14,.5,.055],caud:{len:.22,span:.15,fork:0,fan:true},dors:[.12,.13,.17],dors2:[-.14,.32,.12],anal:[-.12,.36,.1],pec:.3,bigPec:1.7,flat:true,noVent:true},
  firefish:{h:.085,w:.045,top:1,bot:1,ped:.5,tmT:.4,tmB:.45,headE:1.6,snT:.22,snB:.18,mouthY:.25,eye:[.12,.18,.042],caud:{len:.18,span:.1,fork:0,fan:true},dors:[.06,.16,.16],spike:[.12,.48],dors2:[-.16,.32,.12],anal:[-.15,.3,.11],pec:.3},
  chromis:{h:.15,w:.055,top:1,bot:1,ped:.3,tmT:.4,tmB:.45,headE:1.5,snT:.2,snB:.16,mouthY:.15,eye:[.13,.2,.05],caud:{len:.25,span:.19,fork:.68},dors:[-.04,.5,.11],anal:[-.16,.24,.1],pec:.3},
  flame:{h:.22,w:.065,top:1,bot:1,ped:.32,tmT:.42,tmB:.45,headE:1.4,snT:.2,snB:.16,mouthY:.05,eye:[.15,.25,.045],caud:{len:.2,span:.17,fork:0,fan:true},dors:[-.06,.58,.11],anal:[-.14,.38,.11],pec:.32},
  banggai:{h:.2,w:.06,top:1,bot:1,ped:.3,tmT:.38,tmB:.45,headE:1.3,snT:.2,snB:.18,mouthY:.15,eye:[.13,.2,.06],caud:{len:.3,span:.25,fork:.78,lobe:.5},dors:[.1,.15,.3],dors2:[-.12,.2,.28],anal:[-.12,.22,.26],pec:.3,pelv:1.6},
  sixline:{h:.12,w:.05,top:1,bot:1,ped:.45,tmT:.38,tmB:.45,headE:1.6,snT:.18,snB:.15,mouthY:.15,eye:[.12,.22,.04],caud:{len:.2,span:.13,fork:0,fan:true},dors:[-.06,.6,.08],anal:[-.16,.3,.07],pec:.3},
  // Valentini sharpnose puffer: round in section with a pointed snout, high-set eyes, small dorsal and anal fins set far back, no pelvic fins
  puffer:{h:.15,w:.12,top:1.08,bot:1.15,ped:.36,tmT:.32,tmB:.42,headE:1.35,snT:.2,snB:.2,mouthY:.02,eye:[.21,.42,.052],caud:{len:.21,span:.14,fork:0,fan:true},dors:[-.2,.085,.1],anal:[-.2,.075,.09],pec:.34,noVent:true,ball:{cx:.15,yc:-.03,rx:.31,ry:.3,rz:.28}},
  anthias:{h:.15,w:.055,top:1,bot:1,ped:.34,tmT:.4,tmB:.46,headE:1.3,snT:.22,snB:.16,mouthY:.12,eye:[.12,.24,.05],caud:{len:.3,span:.26,fork:.92,lobe:.9},dors:[-.04,.64,.1],anal:[-.15,.24,.11],pec:.3,pelv:1.5},
  copperband:{h:.3,w:.045,top:1,bot:1,ped:.26,tmT:.56,tmB:.5,headE:.55,snT:.05,snB:.05,mouthY:.12,eye:[.24,.26,.042],caud:{len:.15,span:.17,fork:0,fan:true},dors:[-.1,.6,.12],anal:[-.13,.44,.11],pec:.32},
  goby:{h:.11,w:.075,top:1,bot:.85,ped:.42,tmT:.3,tmB:.35,headE:1.6,snT:.45,snB:.35,mouthY:-.05,eye:[.1,.55,.055],caud:{len:.2,span:.12,fork:0,fan:true},dors:[.12,.18,.12],dors2:[-.14,.34,.1],anal:[-.16,.3,.08],pec:.3,pelv:1.2},
  blenny:{h:.11,w:.07,top:1,bot:1,ped:.45,tmT:.25,tmB:.35,headE:1.0,snT:.6,snB:.42,mouthY:-.05,eye:[.1,.55,.045],caud:{len:.18,span:.12,fork:0,fan:true},dors:[-.06,.68,.06],notch:[.3,.35],anal:[-.16,.36,.08],pec:.3,cirri:true},
};
function genFish(name){const P=FISHP[name],mb=new MB();const NX=44,S=22,x0=0.5,x1=-0.32;
  const topF=t=>{const m=P.tmT;if(t<m)return lerp(P.snT,1,1-Math.pow(1-t/m,P.headE));return lerp(1,P.ped,sstep(m,.9,t));};
  const botF=t=>{const m=P.tmB;if(t<m)return lerp(P.snB,1,1-Math.pow(1-t/m,2.2));return lerp(1,P.ped,sstep(m,.92,t));};
  const widF=t=>{if(t<.3)return lerp(.32,1,1-Math.pow(1-t/.3,2));return lerp(1,P.ped*.75,sstep(.3,.92,t));};
  const cyF=t=>P.mouthY*P.h*Math.pow(1-sstep(0,.32,t),1.6);
  const tOf=x=>clamp((x0-x)/(x0-x1),0,1);
  const topAt=x=>{const t=tOf(x);return cyF(t)+P.h*topF(t)*P.top;},botAt=x=>{const t=tOf(x);return -cyF(t)+P.h*botF(t)*P.bot;},widAt=x=>P.w*widF(tOf(x));
  // body rings, nose to tail base; uv = (x + 0.5, sin of ring angle: +1 back, -1 belly)
  for(let i=0;i<=NX;i++){const t=Math.pow(i/NX,1.15),x=lerp(x0,x1,t),cy=cyF(t),ht=P.h*topF(t)*P.top,hb=P.h*botF(t)*P.bot,w=P.w*widF(t);
    for(let j=0;j<=S;j++){const th=j/S*TAU,c=Math.cos(th),sn=Math.sin(th);let y=sn>0?sn*ht:sn*hb;if(P.flat&&sn<0)y*=0.55+0.45*Math.abs(c);
      const zc=c*w*(1-.18*Math.max(sn,0)*Math.max(sn,0));mb.v([x,cy+y,zc],[0,1,0],[x+0.5,sn],[1,1,1,1],[0,0,0,0]);}}
  for(let i=0;i<NX;i++)for(let j=0;j<S;j++){const a=i*(S+1)+j,b=a+1,c=a+S+2,d=a+S+1;mb.q(a,b,c,d);}
  {const tip=mb.v([x0+0.012,cyF(0),0],[1,0,0],[1.01,0],[1,1,1,1],[0,0,0,0]);for(let j=0;j<S;j++)mb.I.push(tip,j+1,j);}
  {const tb=mb.v([x1-0.004,0,0],[-1,0,0],[0.17,0],[1,1,1,1],[0,0,0,0]),o=NX*(S+1);for(let j=0;j<S;j++)mb.I.push(tb,o+j,o+j+1);}
  mb.normals();
  const fgrid=(nu,nv,f,ext)=>{const b=mb.n;for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const u=i/nu,v=j/nv;const r=f(u,v);mb.v(r.p,[0,0,1],r.uv||[u,v],[1,1,1,1],ext(u,v));}
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=b+j*(nu+1)+i;mb.q(a,a+1,a+nu+2,a+nu+1);}};
  const ped=P.h*P.ped,C=P.caud;
  // caudal: forked lobes (or a fan), rays run along u
  fgrid(10,16,(u,v)=>{const vv=v*2-1;const lobe=(C.fan?1-0.12*vv*vv:1-C.fork*(1-Math.pow(Math.abs(vv),.8)))*(1+(C.lobe||0)*Math.pow(Math.abs(vv),3));const x=x1-u*C.len*lobe;const y=vv*lerp(ped*.95,C.span,C.fan?Math.sqrt(u):Math.pow(u,.85));
    return{p:[x+0.012,y,0],uv:[u,vv]};},(u,v)=>[1,u,0,0]);
  // dorsal: tall leading rays sweeping back
  const dfin=(D,nu,notch,ext)=>fgrid(nu,5,(u,v)=>{const fx=D[0]+D[1]/2,rx=D[0]-D[1]/2;const bx=lerp(fx,rx,u);let sh=Math.pow(Math.sin(PI*Math.min(1,u*.9+.1)),.5)*(1.15-.65*u);
    if(notch)sh*=1-notch[1]*Math.exp(-Math.pow((u-notch[0])/0.09,2));if(name==='yellowtang'||name==='bluetang'||name==='flame'||name==='copperband')sh=Math.pow(Math.sin(PI*Math.min(1,u*.85+.12)),.6)*(name==='flame'?1.1-.2*u:1);const rk=(name==='yellowtang'||name==='bluetang'||name==='copperband')?.2:name==='flame'?.22+.1*u:.45+.2*u;return{p:[bx-v*D[1]*rk,topAt(bx)-0.004+v*D[2]*sh,0],uv:[u,v]};},ext);
  dfin(P.dors,10,P.notch,(u,v)=>[1,v,1,0]);if(P.dors2)dfin(P.dors2,8,null,(u,v)=>[1,v,1,0.5]);
  // firefish: one very long, thin first dorsal spine that it flicks up and down
  if(P.spike){const sx=P.spike[0];fgrid(2,8,(u,v)=>{const bx=sx-u*0.03-v*0.05;return{p:[bx,topAt(sx)-0.004+v*P.spike[1]*(1-u*0.4),0],uv:[u,v]};},(u,v)=>[1,v,1,2]);}
  const A=P.anal;fgrid(8,4,(u,v)=>{const fx=A[0]+A[1]/2,rx=A[0]-A[1]/2;const bx=lerp(fx,rx,u);const sh=(name==='yellowtang'||name==='bluetang'||name==='flame'||name==='copperband')?Math.pow(Math.sin(PI*Math.min(1,u*.85+.12)),.6):Math.pow(Math.sin(PI*Math.min(1,u*.85+.15)),.55)*(1.25-.85*u);
    return{p:[bx-v*A[1]*(name==='yellowtang'||name==='copperband'?.18:name==='flame'?.22:.35),-botAt(bx)+0.004-v*A[2]*sh,0],uv:[u,v]};},(u,v)=>[1,v,2,0]);
  if(P.adip){const ax=P.adip[0];fgrid(4,2,(u,v)=>{const bx=ax+.025-u*.05;return{p:[bx-v*.012,topAt(bx)-.003+v*P.adip[1]*Math.sin(PI*u),0],uv:[u,v]};},(u,v)=>[1,v,4,0]);}
  for(const sg of[-1,1]){const bx=P.pec-0.03,by=-botAt(bx)*0.45,bz=sg*widAt(bx)*0.9;
    const pk=P.bigPec||1;fgrid(4,3,(u,v)=>({p:[bx-u*0.12*pk-v*0.02,by-u*0.03+(v-0.5)*0.055*pk*(1-u*.5),bz+sg*u*0.055*pk],uv:[u,v]}),(u,v)=>[2,u,sg*1.5,0]);
    const vx=0.1,pl=P.pelv||1;if(!P.noVent)fgrid(3,2,(u,v)=>({p:[vx-u*0.075*pl-v*.01,-botAt(vx)*0.92-u*0.04*pl,sg*(widAt(vx)*.35+u*0.02+v*0.012)],uv:[u,v]}),(u,v)=>[1,u,3,0]);
    // eye: a shallow glassy dome; uv holds eye-plane coordinates (-1..1)
    const E=P.eye,ex=lerp(x0,x1,E[0]),ey=cyF(E[0])+E[1]*P.h,er=E[2],ez=sg*widAt(ex)*0.86,b=mb.n,NR=6,NA=16;
    for(let r=0;r<=NR;r++)for(let k=0;k<=NA;k++){const rr=r/NR,a=k/NA*TAU,ca=Math.cos(a),sa=Math.sin(a);const bulge=Math.sqrt(Math.max(0,1-rr*rr));
      mb.v([ex+ca*rr*er,ey+sa*rr*er,ez+sg*bulge*er*.2],[ca*rr*.8,sa*rr*.8,sg*bulge+.0001],[ca*rr,sa*rr],[1,1,1,1],[3,0,sg,0]);}
    for(let r=0;r<NR;r++)for(let k=0;k<NA;k++){const a=b+r*(NA+1)+k;if(sg>0)mb.q(a,a+1,a+NA+2,a+NA+1);else mb.q(a,a+NA+1,a+NA+2,a+1);}}
  if(P.ball)puffMorph(mb,P,{topAt,botAt,widAt,cyF,x0,x1});
  if(P.cirri)for(const sg of[-1,1]){const E=P.eye,ex=lerp(x0,x1,E[0]),ey=cyF(E[0])+E[1]*P.h+E[2]*0.8,ez=sg*widAt(ex)*0.7;tube(mb,[[ex,ey,ez],[ex+0.005,ey+0.03,ez+sg*0.004],[ex-0.005,ey+0.055,ez+sg*0.01]],t=>lerp(0.006,0.002,t),4,{cap:true,col:()=>[1,1,1,1],ext:()=>[4,0,0,0]});}
  if(P.barbels)for(const sg of[-1,1])for(const k of[0,1]){tube(mb,[[x0-.015,cyF(0)-P.h*0.15,sg*0.02],[x0+0.0+k*0.012,cyF(0)-P.h*0.3,sg*(0.035+k*0.015)],[x0-0.012,cyF(0)-P.h*0.42,sg*(0.042+k*0.022)]],t=>lerp(0.0085,0.004,t),5,{cap:true,col:()=>[1,1,1,1],ext:()=>[4,0,0,0]});}
  return mb;}

// pufferfish inflation as a morph target: for each vertex, the push (in aCol.xyz) that moves it onto the ball, and in aCol.w how much of the ball's normal to take.
// Body rings are pushed straight out from the ball's axis; the eyes ride the ball surface and turn with it; pectorals move with their roots; dorsal, anal and tail sit behind the ball.
// VS_FISH repeats the ball centre and squared radii for the normals: keep them in sync with FISHP.puffer.ball.
function puffMorph(mb,P,F){const B=P.ball,PP=mb.P,C=mb.C,E=mb.E,n=mb.n;
  // smooth max of the body and ball radii (k = 0.045) rounds the creases where the snout and the tail stalk leave the ball
  const push=q=>{const dx=q[0]-B.cx,s2=1-(dx/B.rx)**2,dy=q[1]-B.yc,dz=q[2],r0=Math.hypot(dy,dz);if(r0<1e-6)return[0,0,0,0];
    const cy=dy/r0,cz=dz/r0,rE=s2>0?1/Math.sqrt((cy/(B.ry*Math.sqrt(s2)))**2+(cz/(B.rz*Math.sqrt(s2)))**2):0,k=0.045,rN=(r0+rE+Math.sqrt((r0-rE)**2+k*k))/2,d=Math.max(0,rN-r0);
    return[0,cy*d,cz*d,clamp((rE-r0)/0.02+0.5,0,1)];};
  const ballN=q=>V.norm([(q[0]-B.cx)/B.rx**2,(q[1]-B.yc)/B.ry**2,q[2]/B.rz**2]);
  const rot=(v,k,c,sn)=>{const kv=V.cross(k,v),kd=V.dot(k,v);return[v[0]*c+kv[0]*sn+k[0]*kd*(1-c),v[1]*c+kv[1]*sn+k[1]*kd*(1-c),v[2]*c+kv[2]*sn+k[2]*kd*(1-c)];};
  const eyeT={};for(const sg of[-1,1]){const E0=P.eye,ex=lerp(F.x0,F.x1,E0[0]),ec=[ex,F.cyF(E0[0])+E0[1]*P.h,sg*F.widAt(ex)*0.86],d=push(ec),q=V.add(ec,d),nb=ballN(q),a=[0,0,sg];
    const ax=V.cross(a,nb),l=V.len(ax);eyeT[sg]={ec,q,k:l>1e-6?V.mul(ax,1/l):[1,0,0],c:V.dot(a,nb),s:l};}
  const pecD={};for(const sg of[-1,1]){const bx=P.pec-0.03;pecD[sg]=push([bx,-F.botAt(bx)*0.45,sg*F.widAt(bx)*0.9]);}
  for(let i=0;i<n;i++){const v=[PP[i*3],PP[i*3+1],PP[i*3+2]],part=E[i*4],fid=E[i*4+2];let d=[0,0,0,0];
    if(part<0.5)d=push(v);
    else if(part>2.5&&part<3.5){const T=eyeT[fid<0?-1:1],o=V.sub(v,T.ec),w=V.add(T.q,rot(o,T.k,T.c,T.s));d=[w[0]-v[0],w[1]-v[1],w[2]-v[2],0];}
    else if(part>1.5&&part<2.5){const pd=pecD[fid<0?-1:1];d=[pd[0],pd[1],pd[2],0];}
    else if(part>0.5&&part<1.5&&(fid>0.5&&fid<2.5)){const bp=fid<1.5?[v[0],F.topAt(v[0]),0]:[v[0],-F.botAt(v[0]),0],pd=push(bp);d=[pd[0],pd[1],pd[2],0];}
    C[i*4]=d[0];C[i*4+1]=d[1];C[i*4+2]=d[2];C[i*4+3]=d[3];}}

