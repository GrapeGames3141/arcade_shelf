// ---------- 36-notions: sewing notions as lit meshes (scissors, thimble, hoop, pins, buttons, tape measure) + felt yarn balls ----------
const MAT={steel:{spec:1.3,shin:70,metal:0.9},gold:{spec:1.4,shin:60,metal:1.0},plastic:{spec:0.6,shin:40},wood:{spec:0.15,shin:12},glossy:{spec:0.9,shin:80}};
// one scissor half: blade along +z from the pivot, handle loop behind it. side=-1 left, +1 right
function buildScissorHalf(side){
  const steel=[0.78,0.8,0.84],steelEdge=[0.93,0.95,0.97];const bl=new MB();const L=2.15;
  const w=z=>{const t=z/L;return 0.27*Math.pow(1-t,0.85)*(1-0.15*Math.sin(t*Math.PI))+0.004;};
  const nz=28,cols=[0,0.25,0.6,1];const yTop=k=>[0.006,0.03,0.042,0.034][k],yBot=k=>-[0.006,0.03,0.042,0.034][k];
  const ring=(z,top)=>cols.map((c,k)=>[side*c*w(z),top?yTop(k):yBot(k),z]);
  for(const top of[true,false]){const base=bl.vc;for(let i=0;i<=nz;i++){const z=-0.05+i/nz*(L+0.05);const r=ring(z,top);r.forEach((p,k)=>bl.v(p,[0,top?1:-1,0],[k/3,i/nz],k===0?steelEdge:steel));}
    for(let i=0;i<nz;i++)for(let k=0;k<3;k++){const a=base+i*4+k;if(top===(side>0))bl.quad(a,a+4,a+5,a+1);else bl.quad(a,a+1,a+5,a+4);}}
  // spine wall
  {const base=bl.vc;for(let i=0;i<=nz;i++){const z=-0.05+i/nz*(L+0.05);bl.v([side*w(z),0.034,z],[side,0,0],[0,0],steel);bl.v([side*w(z),-0.034,z],[side,0,0],[0,0],steel);}
    for(let i=0;i<nz;i++){const a=base+i*2;bl.quad(a,a+1,a+3,a+2);}}
  // shank to the handle
  bl.tube([[side*0.05,0,-0.02],[side*0.12,0,-0.22],[side*0.22,0,-0.38]],0.06,10,steel);
  const blade=bl.build();
  const hd=new MB();hd.torus(0.32,0.075,28,10,[1,1,1],M4.mul(M4.trans(side*0.36,0,-0.72),M4.scale(1)));
  hd.tube([[side*0.18,0,-0.34],[side*0.3,0,-0.42]],0.085,10,[1,1,1]);
  const handle=hd.build();
  return{blade,handle};
}
function buildPivot(){const m=new MB();m.lathe([[0.001,0.13],[0.075,0.13],[0.085,0.1],[0.085,-0.06],[0.001,-0.06]],16,[0.88,0.86,0.8]);return m.build();}
function buildThimble(){
  const m=new MB();const prof=[[0.38,0],[0.4,0.04],[0.38,0.09],[0.35,0.1],[0.34,0.5],[0.31,0.6],[0.24,0.68],[0.12,0.72],[0.001,0.73]];
  m.lathe(prof,32,[1,1,1]);const mesh=m.build();
  const cv=canvas2(256,128),g=cv.getContext('2d');g.fillStyle='#e9bf52';g.fillRect(0,0,256,128);
  for(let y=26;y<128;y+=11)for(let x=(y/11%2)*5;x<256;x+=10){const gr=g.createRadialGradient(x,y,0,x,y,4.5);gr.addColorStop(0,'#8a6618');gr.addColorStop(1,'rgba(233,191,82,0)');g.fillStyle=gr;g.fillRect(x-5,y-5,10,10);}
  g.fillStyle='#f7dc8a';g.fillRect(0,0,256,10);mesh.tex=texFromCanvas(cv,true);return mesh;
}
function buildHoop(){
  const m=new MB();const wood=[0.82,0.63,0.4],woodD=[0.7,0.52,0.32];const rot=M4.rotX(Math.PI/2);
  m.torus(1.5,0.1,48,10,wood,rot);m.torus(1.64,0.08,48,10,woodD,M4.mul(M4.trans(0,0,0.06),rot));
  m.box([0,1.72,0.06],[0.34,0.16,0.26],[0.85,0.73,0.36]);m.lathe([[0.001,0],[0.06,0],[0.06,0.3],[0.09,0.32],[0.09,0.4],[0.001,0.42]],12,[0.86,0.76,0.4],M4.mul(M4.trans(0.17,1.72,0.06),M4.rotZ(-Math.PI/2)));
  return m.build();
}
function buildPin(){const m=new MB();m.tube([[0,-0.3,0],[0,1.15,0]],z=>z>0.98?0.006:0.028,8,[0.82,0.84,0.88]);return m.build();}
function buildPinHead(){const m=new MB();m.sphere([0,1.2,0],0.15,10,[1,1,1]);return m.build();}
function buildBumperMesh(colHex){
  const c=hex(colHex),cd=shade(c,0.8),hole=shade(c,0.35);const m=new MB();
  m.lathe([[0.001,0.27],[0.52,0.27],[0.62,0.29],[0.76,0.36],[0.9,0.4],[0.99,0.37],[1.02,0.28],[1.0,0.02],[0.95,0]],40,(k)=>k<2?c:k<6?shade(c,1.08):cd);
  for(const[hx,hz]of[[0.2,0.2],[-0.2,0.2],[0.2,-0.2],[-0.2,-0.2]])m.lathe([[0.001,0.275],[0.085,0.275],[0.085,0.2]],14,hole,M4.trans(hx,0,hz));
  const cream=[0.97,0.93,0.84];m.tube([[-0.22,0.29,-0.22],[0,0.32,0],[0.22,0.29,0.22]],0.035,6,cream);m.tube([[-0.22,0.29,0.22],[0,0.32,0],[0.22,0.29,-0.22]],0.035,6,cream);
  return m.build();
}
function buildTapeCase(){const m=new MB();const y=[0.95,0.76,0.18],g=[0.25,0.25,0.27];
  m.lathe([[0.001,-0.36],[0.9,-0.36],[0.95,-0.3],[0.95,0.3],[0.9,0.36],[0.001,0.36]],32,(k)=>k===0||k===5?g:y,M4.rotZ(Math.PI/2));
  m.lathe([[0.001,0.37],[0.35,0.37],[0.35,0.4],[0.001,0.42]],20,g,M4.rotZ(Math.PI/2));m.box([0,-0.75,0.2],[0.6,0.3,0.5],y);return m.build();}
// felt yarn ball (splats), centre at y=r
function buildYarnBall(colHex,seed,r){
  const rnd=mulberry(seed);const sb=new SB();const col=hex(colHex);
  ellipsoid(sb,[0,r,0],[r*0.95,r*0.95,r*0.95],shade(col,0.72),0.08,{jit:0});
  for(let k=0;k<16;k++){const ax=v3.norm([rnd()-0.5,rnd()-0.5,rnd()-0.5]);const ref=Math.abs(ax[1])<0.9?[0,1,0]:[1,0,0];
    const u=v3.norm(v3.cross(ax,ref)),w=v3.cross(ax,u);const n=Math.round(r*115);const kc=shade(col,0.9+rnd()*0.22);
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const d=v3.add(v3.sc(u,Math.cos(a)),v3.sc(w,Math.sin(a)));sb.add(d[0]*r,r+d[1]*r,d[2]*r,0.065,kc,d[0],d[1],d[2]);}}
  return makeModel(sb);
}
