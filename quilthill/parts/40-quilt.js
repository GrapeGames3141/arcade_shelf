// ---------- 40-quilt: the quilted hillside (height field, patch types, chunk baking) ----------
// Downhill is -z. s = -z. x is to the right when facing downhill.
const QH={L:700,half:18.5,cell:2.5,s0:-60,s1:900,step:0.5,CH:20,KICK:[]};
(function(){
  const n=Math.ceil((QH.s1-QH.s0)/QH.step)+1;const B=new Float32Array(n);let y=0;
  for(let i=0;i<n;i++){const s=QH.s0+i*QH.step;
    let g=0.19+0.06*Math.sin(s*0.017+0.4)+0.04*Math.sin(s*0.043+1.7);
    g*=0.25+0.75*smooth(0,35,s);g*=1-smooth(QH.L+5,QH.L+50,s);g-=0.12*smooth(QH.L+30,QH.L+90,s);if(s<0)g=0.03;
    y-=g*QH.step;B[i]=y;}
  QH.B=B;
})();
function baseH(s){const f=(clamp(s,QH.s0,QH.s1-1)-QH.s0)/QH.step,i=Math.floor(f);return lerp(QH.B[i],QH.B[i+1],f-i)+0.55*Math.sin(s*0.045)*smooth(45,100,s)*(1-smooth(QH.L-50,QH.L-10,s));}
function kickH(x,s){let h=0;for(const k of QH.KICK){if(s<k.s-k.len||s>k.s)continue;if(x<k.x0-0.8||x>k.x1+0.8)continue;
  const f=(s-(k.s-k.len))/k.len;const e=smooth(k.x0-0.8,k.x0,x)*(1-smooth(k.x1,k.x1+0.8,x));h=Math.max(h,k.h*Math.pow(f,1.6)*e);}return h;}
function latH(x){const a=Math.abs(x);let h=0.0032*x*x;if(a>17.2)h+=(a-17.2)*(a-17.2)*0.9;return h;}
function H(x,s){return baseH(s)+latH(Math.max(-19.5,Math.min(19.5,x)))+kickH(x,s);}
function gradH(x,s){const e=0.15;return[(H(x+e,s)-H(x-e,s))/(2*e),(H(x,s+e)-H(x,s-e))/(2*e)];}// dH/dx, dH/ds
function normalAt(x,s){const g=gradH(x,s);return v3.norm([-g[0],1,g[1]]);} // world normal (z=-s so dH/dz=-dH/ds)
function W(x,s,y){return[x,y===undefined?H(x,s):y,-s];}

// ---- patches
const FABRIC=['#e07a6a','#f2b8a2','#7fb3a6','#f1d28a','#9ab7dd','#c79ad1','#8fc49a','#f4a6b8','#e6a04d','#6f9fc9','#d96f8f','#a7c46a'].map(hex);
const CORD=['#c98a3a','#a9582f','#8a6a3c','#b8743c'].map(hex);
const SATIN=['#ead2f2','#f7d6e0','#d5e6f7','#f6ecc8'].map(hex);
const PT={COTTON:0,CORD:1,SATIN:2};
const PNAME=['cotton','corduroy','satin'];
const PFRIC=[0.035,0.13,0.008],PGRIP=[1,1.45,0.35],PLAT=[1.1,2.6,0.15];
function cellOf(x,s){return[Math.floor((x+QH.half)/QH.cell),Math.floor(s/QH.cell)];}
function patchType(i,j){
  if(j<12||j*QH.cell>QH.L+20)return PT.COTTON;
  const n=vnoise(i*0.33+Math.sin(j*0.09)*1.8,j*0.075);if(n>0.64)return PT.SATIN;
  const m=vnoise(i*0.31+40,j*0.22+7);if(m>0.68)return PT.CORD;return PT.COTTON;}
function patchAt(x,s){const[i,j]=cellOf(x,s);return patchType(i,j);}
function patchColor(i,j,x,s,rnd){
  const t=patchType(i,j);const h=hash2(i*7+3,j*13+1);
  if(t===PT.CORD){const c=CORD[Math.floor(h*CORD.length)];const ridge=Math.floor((x+100)/0.17)%2;return[shade(c,ridge?0.8:1.08),t,ridge];}
  if(t===PT.SATIN){const c=SATIN[Math.floor(h*SATIN.length)];return[shade(c,0.86+0.32*vnoise(x*0.35+s*0.12,s*0.18)),t,0];}
  const base=FABRIC[Math.floor(h*FABRIC.length)];const print=Math.floor(hash2(i,j*3+9)*5);const lt=mix3(base,PAL.cream,0.75);
  let c=base;
  if(print===0){const a=Math.floor((x+100)/0.34)%2,b=Math.floor((s+100)/0.34)%2;c=a&&b?base:(!a&&!b?lt:mix3(base,lt,0.5));}
  else if(print===1){const gx=Math.round(x/0.5)*0.5,gs=Math.round(s/0.5)*0.5;if(Math.hypot(x-gx,s-gs)<0.12)c=lt;}
  else if(print===2){if(((x*0.7+s*0.7)%0.6+0.6)%0.6<0.25)c=lt;}
  else if(print===3){const gx=Math.round(x/0.8)*0.8,gs=Math.round(s/0.8)*0.8;const d=Math.hypot(x-gx,s-gs);c=shade(base,0.85);
    if(hash2(Math.round(gx*10),Math.round(gs*10))<0.6){if(d<0.05)c=PAL.mustard;else if(d<0.16)c=FABRIC[(Math.floor(h*7)+3)%FABRIC.length];}}
  return[shade(c,0.96+rnd()*0.08),t,0];
}

// ---- chunks
const CHUNKS=new Map();
function bakeChunk(ci,dens){
  const rnd=mulberry(500+ci*7919);const sb=new SB(24000);const sA=ci*QH.CH,sB=sA+QH.CH;const half=QH.half,cell=QH.cell;
  const quiltA=-20,quiltB=QH.L+80;
  const sp=0.235/Math.sqrt(dens);
  if(sB>quiltA&&sA<quiltB)for(let s=Math.max(sA,quiltA);s<Math.min(sB,quiltB);s+=sp)for(let x=-half;x<half;x+=sp){
    const xx=x+(rnd()-0.5)*sp*0.5,ss=s+(rnd()-0.5)*sp*0.5;const[i,j]=cellOf(xx,ss);const fx=(xx+half)/cell-i,fz=ss/cell-j;
    const edge=Math.min(fx,1-fx,fz,1-fz);
    let[c,t,ridge]=patchColor(i,j,xx,ss,rnd);
    const pillow=0.07*Math.sqrt(Math.max(0,Math.sin(Math.PI*fx)*Math.sin(Math.PI*fz)));
    if(edge<0.03)c=shade(c,0.62);else if(edge<0.06)c=shade(c,0.82);
    let nrm=normalAt(xx,ss);
    // pillow tilt for soft shading
    nrm=v3.norm(v3.add(nrm,[Math.cos(Math.PI*fx)*0.35,0,-Math.cos(Math.PI*fz)*0.35]));
    if(t===PT.CORD)nrm=v3.norm(v3.add(nrm,[ridge?0.3:-0.3,0,0]));
    const y=H(xx,ss)+0.03+pillow;
    sb.add(xx,y,-ss,sp*(t===PT.SATIN?1.45:1.25),c,nrm[0],nrm[1],nrm[2],false,rnd());
    // running stitch along seams
    if(edge>0.06&&edge<0.085){const along=(Math.min(fx,1-fx)<Math.min(fz,1-fz))?ss:xx;if(((along*5)%1+1)%1<0.5)sb.add(xx,y+0.02,-ss,sp*0.8,PAL.cream,nrm[0],nrm[1],nrm[2],false,rnd());}
    if(t===PT.SATIN&&rnd()<0.02*dens)sb.add(xx,y+0.01,-ss,0.05,PAL.white,0,1,0,true);
    else if(rnd()<0.03*dens)sb.add(xx,y+0.04,-ss,0.02,shade(c,1.15),nrm[0],nrm[1],nrm[2]);
  }
  // rolled border on both sides
  if(sB>quiltA&&sA<quiltB)for(const sx of[-1,1]){const pts=[];for(let s=Math.max(sA,quiltA);s<=Math.min(sB,quiltB)+0.01;s+=1)pts.push([sx*(half+0.4),H(sx*half,s)+0.45,-s]);
    if(pts.length>1)tube(sb,pts,0.55,null,0.17/Math.sqrt(dens),(seg,an,p)=>((Math.floor((-p[2])*1.2+an*1.3))%2===0)?hex('#cf4a42'):PAL.cream);}
  // kicker piping rolls + drop faces
  for(const k of QH.KICK){if(k.s<sA||k.s>=sB)continue;const pts=[];for(let x=k.x0;x<=k.x1+0.01;x+=0.5)pts.push([x,H(x,k.s-0.05)+0.12,-k.s]);
    tube(sb,pts,0.2,null,0.07,(seg,an,p)=>(Math.floor(p[0]*2.5)%2===0)?PAL.mustard:PAL.cream);
    for(let x=k.x0;x<=k.x1;x+=0.15){const top=H(x,k.s-0.05),bot=H(x,k.s+0.4);for(let y=bot;y<top;y+=0.15)sb.add(x,y,-k.s-0.05,0.2,shade(hex('#7fb3a6'),0.75),0,0,-1);}}
  // felt meadow outside the quilt
  const spG=0.7/Math.sqrt(dens);
  for(let s=sA;s<sB;s+=spG)for(const sx of[-1,1])for(let a=19.2;a<60;a+=spG*(1+(a-19)/25)){const x=sx*(a+rnd()*spG);
    const y=baseH(s)+latH(sx*19.5)-0.15-(a-19.2)*0.06+vnoise(s*0.08,x*0.08)*1.6*smooth(20,26,a);
    const c=shade(rnd()<0.15?PAL.sage:hex('#8fbf6a'),0.9+rnd()*0.15);sb.add(x,y,-s-rnd()*spG,spG*1.6*(1+(a-19)/40),c,0,1,0,false,rnd());}
  const nf=Math.round(14*dens);for(let i=0;i<nf;i++){const s=sA+rnd()*QH.CH,sx=rnd()<0.5?-1:1,a=20.5+rnd()*12;const x=sx*a;
    bakeFlower(sb,[x,baseH(s)+latH(sx*19.5)-0.15-(a-19.2)*0.06+vnoise(s*0.08,x*0.08)*1.6*smooth(20,26,a),-s],rnd);}
  const nb=Math.round(3*dens);for(let i=0;i<nb;i++){const s=sA+rnd()*QH.CH,sx=rnd()<0.5?-1:1,a=22+rnd()*25;const x=sx*a;
    bakeBush(sb,[x,baseH(s)+latH(sx*19.5)-0.15-(a-19.2)*0.06+vnoise(s*0.08,x*0.08)*1.6*smooth(20,26,a),-s],rnd);}
  return makeModel(sb);
}
function updateChunks(sNow,ahead,dens,budget){
  const c0=Math.floor(sNow/QH.CH)-1,c1=Math.floor((sNow+ahead)/QH.CH);
  for(const[k,m]of CHUNKS)if(k<c0-1||k>c1+1){freeModel(m);CHUNKS.delete(k);}
  let built=0;for(let c=c0;c<=c1&&built<budget;c++){if(c<-3||c*QH.CH>QH.s1-40)continue;if(!CHUNKS.has(c)){CHUNKS.set(c,bakeChunk(c,dens));built++;}}return built;}
function clearChunks(){for(const m of CHUNKS.values())freeModel(m);CHUNKS.clear();}
function buildLandmarks(){
  const sb=new SB(12000);
  // finish: two giant pins and a gingham ribbon
  const s=QH.L;for(const sx of[-1,1]){const b=W(sx*19.6,s);tube(sb,[b,v3.add(b,[0,5,0])],0.09,hex('#c9cfd8'),0.06);ellipsoid(sb,v3.add(b,[0,5.2,0]),[0.45,0.45,0.45],sx<0?PAL.teal:hex('#e07aa0'),0.08);}
  const a=v3.add(W(-19.6,s),[0,4.6,0]),bb=v3.add(W(19.6,s),[0,4.6,0]);
  for(let i=0;i<=120;i++){const t=i/120;const p=v3.add(v3.lerp(a,bb,t),[0,-Math.sin(t*Math.PI)*0.9,0]);for(let y=0;y<1.0;y+=0.1){
    const c=(Math.floor(t*60)+Math.floor(y*5))%2?PAL.red:PAL.cream;sb.add(p[0],p[1]-y,p[2],0.14,c,0,0,1);}}
  // start banner: a spool post
  bakePincushion(sb,W(-27,QH.L+25,baseH(QH.L+25)+latH(19.5)-1));
  bakePincushion(sb,v3.add(W(24,12,baseH(12)+latH(19.5)-0.6),[0,0,0]));
  return makeModel(sb);
}
