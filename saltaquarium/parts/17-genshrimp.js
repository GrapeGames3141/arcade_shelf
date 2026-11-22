// ---------- shrimp ----------
// Neocaridina / Caridina built in straight space: x forward, y up (ground at 0), z to the side, total length ~1 (rostrum tip to telson tip).
// Parts (ext.x): 0 body, 1 walking legs, 2 antennae, 3 swimmerets, 4 tail fan, 5 eyes, 6 clear plates (rostrum, scale, eye stalks), 7 claws, 8 antennules
function genShrimp(o={}){const mb=new MB();const NS=60,S=20;const AL=o.antL||1,BIG=!!o.boxer;
  const X0=0.25,X1=-0.42,SEG=[0.5,0.565,0.645,0.725,0.795,0.855,1.0];
  const segOf=t=>{for(let i=0;i<6;i++)if(t<SEG[i+1])return[i,(t-SEG[i])/(SEG[i+1]-SEG[i])];return[5,1];};
  const xs=t=>lerp(X0,X1,t);
  const cy=t=>0.175+0.014*Math.sin(PI*clamp((t-0.42)/0.4,0,1))-0.072*Math.pow(sstep(0.64,1,t),1.3);
  const plate=t=>{if(t<0.5)return 1;const u=segOf(t)[1];return 1+0.085*u*u*u;}; // each abdominal plate flares at its back edge over the next
  const hh=t=>(t<0.5?lerp(0.044,0.088,sstep(0,0.18,t))*(1-0.03*sstep(0.4,0.5,t)):t<0.645?lerp(0.086,0.088,(t-0.5)/0.145):t<0.855?lerp(0.088,0.05,sstep(0.645,0.855,t)):lerp(0.05,0.026,(t-0.855)/0.145))*plate(t);
  const ww=t=>(t<0.5?lerp(0.033,0.057,sstep(0,0.2,t)):t<0.645?lerp(0.05,0.047,(t-0.5)/0.145):t<0.855?lerp(0.047,0.028,sstep(0.645,0.855,t)):lerp(0.028,0.016,(t-0.855)/0.145))*plate(t);
  const pleu=t=>{if(t<0.5)return 0.1*sstep(0.08,0.28,t);const[si,u]=segOf(t);return[0.34,0.55,0.45,0.32,0.18,0.02][si]*(0.45+0.55*Math.sin(PI*u));}; // side plates hang below the belly
  for(let i=0;i<=NS;i++){const t=i/NS,x=xs(t),c0=cy(t),h=hh(t),w=ww(t),pl=pleu(t);
    for(let j=0;j<=S;j++){const th=j/S*TAU,c=Math.cos(th),sn=Math.sin(th),ex=t<0.5?0.9:0.82;let y=h*Math.sign(sn)*Math.pow(Math.abs(sn),ex);if(sn<0)y=y*0.92-pl*h*c*c;
      mb.v([x,c0+y,w*Math.sign(c)*Math.pow(Math.abs(c),ex)*(sn>0?1-0.22*sn*sn:1)],[0,1,0],[t,sn],[1,1,1,1],[0,0,0,0]);}}
  for(let i=0;i<NS;i++)for(let j=0;j<S;j++){const a=i*(S+1)+j;mb.q(a,a+1,a+S+2,a+S+1);}
  {const f=mb.v([X0+0.012,cy(0)+0.004,0],[1,0,0],[0,0],[1,1,1,1],[0,0,0,0]);for(let j=0;j<S;j++)mb.t(f,j+1,j);}
  {const o=NS*(S+1),e=mb.v([X1-0.006,cy(1),0],[-1,0,0],[1,0],[1,1,1,1],[0,0,0,0]);for(let j=0;j<S;j++)mb.t(e,o+j,o+j+1);}
  mb.normals();
  const plateQ=(o,d,sv,L,wfn,NU,NV,ext)=>{const b=mb.n,n=V.norm(V.cross(d,sv));for(let i=0;i<=NU;i++)for(let k=0;k<=NV;k++){const u=i/NU,v=k/NV-0.5;mb.v(V.madd(V.madd(o,d,L*u),sv,wfn(u)*v),n,[u,v],[1,1,1,1],ext(u,v));}
    for(let i=0;i<NU;i++)for(let k=0;k<NV;k++){const a=b+i*(NV+1)+k;mb.q(a,a+1,a+NV+2,a+NV+1);}};
  const crs=(P,n)=>{const out=[],m=P.length-1;for(let i=0;i<=n;i++){const f=i/n*m,k=Math.min(m-1,Math.floor(f)),u=f-k,p0=P[Math.max(0,k-1)],p1=P[k],p2=P[k+1],p3=P[Math.min(m,k+2)];
    out.push([0,1,2].map(c=>0.5*(2*p1[c]+(-p0[c]+p2[c])*u+(2*p0[c]-5*p1[c]+4*p2[c]-p3[c])*u*u+(-p0[c]+3*p1[c]-3*p2[c]+p3[c])*u*u*u)));}return out;};
  // rostrum: a thin blade with teeth along its upper edge
  {const b=mb.n,NU=16,K=8;for(let i=0;i<=NU;i++){const u=i/NU,x=lerp(0.232,0.45,u),yc=lerp(0.218,0.227,u)+0.006*Math.sin(PI*u);
      const tooth=0.0055*Math.max(0,Math.sin(u*PI*7.5))*(1-u),up=0.019*Math.pow(1-u,0.85)+tooth,dn=0.011*Math.pow(1-u,1.1),th=0.0065*(1-0.75*u)+0.0006;
      for(let k=0;k<=K;k++){const a=k/K*TAU,ca=Math.cos(a),sa=Math.sin(a);mb.v([x,yc+(sa>0?up:dn)*sa,th*ca],[0,sa,ca],[u,sa],[1,1,1,1],[6,u,0,0]);}}
    for(let i=0;i<NU;i++)for(let k=0;k<K;k++){const a=b+i*(K+1)+k;mb.q(a,a+1,a+K+2,a+K+1);}}
  for(const sg of[-1,1]){
    // stalked eyes
    tube(mb,[[0.236,0.19,sg*0.024],[0.252,0.193,sg*0.036],[0.262,0.195,sg*0.044]],t=>lerp(0.011,0.009,t),6,{ext:()=>[6,0.5,0,0]});
    {const ic=icosphere(2),b=mb.n,c=[0.268,0.197,sg*0.05];for(const q of ic.P)mb.v(V.madd(c,q,0.0195),q,[0,0],[1,1,1,1],[5,0,0,0]);for(const f of ic.F)mb.t(b+f[0],b+f[1],b+f[2]);}
    // antennules: short stalk splitting into two whips
    const a0=[0.255,0.196,sg*0.018],a1=[0.33,0.218,sg*0.03];
    tube(mb,[a0,V.lerp(a0,a1,0.5),a1],t=>lerp(0.009,0.006,t),5,{ext:t=>[8,t*0.3,sg,0]});
    tube(mb,[a1,[0.40,0.252,sg*0.045],[0.465,0.29,sg*0.062]],t=>lerp(0.0045,0.0016,t),4,{ext:t=>[8,0.3+t*0.7,sg,0]});
    tube(mb,[a1,[0.39,0.236,sg*0.062],[0.445,0.252,sg*0.092]],t=>lerp(0.004,0.0015,t),4,{ext:t=>[8,0.3+t*0.7,sg+1.3,0]});
    // long antennae: forward and up, then sweeping back over the body
    {const A0=[0.24,0.172,0.034],P0=[[0.24,0.172,0.034],[0.35,0.2,0.05],[0.45,0.27,0.085],[0.45,0.38,0.15],[0.3,0.46,0.22],[0.02,0.5,0.28],[-0.32,0.48,0.32],[-0.66,0.43,0.34]];
      tube(mb,crs(P0.map(q=>[A0[0]+(q[0]-A0[0])*AL,A0[1]+(q[1]-A0[1])*Math.sqrt(AL),(A0[2]+(q[2]-A0[2])*AL)*sg]),Math.round(34*AL)),t=>lerp(0.0055,0.0016,Math.pow(t,0.7)),4,{ext:t=>[2,t,sg*1.7,0]});
      // cleaner and boxer shrimps wave long white antennae forward as well (the signal to fish that the station is open)
      if(AL>1.2)tube(mb,crs([[0.25,0.18,0.03*sg],[0.42,0.22,0.06*sg],[0.7,0.3,0.12*sg],[1.0,0.42,0.2*sg],[1.25,0.5,0.3*sg]].map(q=>[q[0],q[1],q[2]]),30),t=>lerp(0.004,0.0012,t),4,{ext:t=>[2,t,sg*2.9,0]});}
    // antennal scale: a clear leaf beside the antenna base
    plateQ([0.238,0.176,sg*0.044],V.norm([1,0.06,sg*0.12]),V.norm([0,0.85,sg*0.5]),0.13,u=>0.03*Math.pow(Math.sin(PI*Math.min(1,u*0.9+0.1)),0.7)*(1-0.3*u),6,2,u=>[6,u,0,0]);
    // five pairs of legs: two little claws held forward, three walking legs splayed onto the ground
    [0.15,0.215,0.29,0.36,0.43].forEach((t,k)=>{const bx=xs(t),by=cy(t)-hh(t)*0.82,base=[bx,by,sg*0.03],ph=k*1.25+(sg>0?PI:0);
      if(BIG&&k===2){const kn=[bx+0.12,by+0.05,sg*0.13],wr=[bx+0.36,by+0.09,sg*0.15],tip=[bx+0.6,by+0.07,sg*0.12];
        tube(mb,[base,V.lerp(base,kn,0.5),kn,V.lerp(kn,wr,0.5),wr],t=>lerp(0.012,0.009,t),5,{ext:t=>[7,t*0.5,k*1.9+(sg>0?0:1.1),0]});
        tube(mb,[wr,V.lerp(wr,tip,0.5),tip],t=>0.022*Math.sin(PI*Math.min(1,0.15+t*0.85))+0.006,7,{cap:true,ext:t=>[7,0.5+t*0.5,k*1.9+(sg>0?0:1.1),0]});
        tube(mb,[V.lerp(wr,tip,0.55),V.add(tip,[0.02,-0.025,0])],t=>lerp(0.009,0.003,t),4,{cap:true,ext:()=>[7,1,k*1.9+(sg>0?0:1.1),0]});return;}
      if(k<2){const kn=[bx+0.03+k*0.01,by-0.03+k*0.012,sg*(0.04+k*0.025)],tip=[bx+0.085+k*0.02,0.035+k*0.008,sg*(0.03+k*0.018)];
        tube(mb,[base,V.lerp(base,kn,0.5),kn,V.lerp(kn,tip,0.5),tip],t=>lerp(0.007,0.0035,t),4,{ext:t=>[7,t,k*1.9+(sg>0?0:1.1),0]});
        const dd=V.norm(V.sub(tip,kn));for(const f of[-1,1])tube(mb,[tip,V.madd(V.add(tip,[0,0.004*f,0]),dd,0.013)],0.0022,3,{ext:()=>[7,1,k*1.9+(sg>0?0:1.1),0]});}
      else{const fw=[0.035,-0.012,-0.05][k-2],dfx=[0.085,-0.04,-0.12][k-2];
        const kn=[bx+fw,by+0.012,sg*(0.115+0.01*k)],an=[bx+dfx*0.75,by-0.055,sg*(0.15+0.008*k)],tip=[bx+dfx,0.004,sg*(0.158+0.008*k)];
        tube(mb,[base,V.lerp(base,kn,0.55),kn,an,V.lerp(an,tip,0.6),tip],t=>t<0.4?lerp(0.0085,0.0062,t/0.4):lerp(0.0058,0.0024,(t-0.4)/0.6),4,{ext:t=>[1,t,ph,0]});}});
    // swimmerets under abdominal segments 1-5
    for(let k=0;k<5;k++){const t=(SEG[k]+SEG[k+1])/2;plateQ([xs(t),cy(t)-hh(t)*0.86,sg*0.018],V.norm([-0.45,-1,sg*0.12]),[1,0,0],0.062,u=>0.022*(1-0.4*u),3,1,u=>[3,u,k*0.9+(sg>0?0:0.4),0]);}}
  // tail fan: telson plus two pairs of uropods, folded beside it
  {const te=[X1+0.004,cy(1)-0.002,0];
    for(const[ang,L,W,tilt]of[[0,0.15,0.036,0],[0.16,0.145,0.05,0.55],[-0.16,0.145,0.05,0.55],[0.34,0.15,0.054,0.5],[-0.34,0.15,0.054,0.5]]){
      const d=V.norm([-Math.cos(ang),-0.42,Math.sin(ang)]);const sv=V.norm([Math.sin(ang)*0.3,Math.sign(ang)*tilt,Math.cos(ang)]);
      plateQ(te,d,sv,L,u=>ang===0?W*(1-0.75*u):W*Math.pow(Math.sin(PI*Math.min(1,0.15+u*0.85)),0.6),5,2,u=>[4,u,0,0]);}}
  return mb;}

