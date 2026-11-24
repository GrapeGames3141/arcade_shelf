// ---------- 40-quilt: the quilted hillside (height field, patch types, chunk baking) ----------
// Downhill is -z. s = -z. x is to the right when facing downhill.
const QH={L:700,half:18.5,cell:2.5,s0:-60,s1:1200,step:0.5,CH:20,KICK:[],ZIP:[],FY:0};
(function(){
  const n=Math.ceil((QH.s1-QH.s0)/QH.step)+1;const B=new Float32Array(n);let y=0;
  for(let i=0;i<n;i++){const s=QH.s0+i*QH.step;
    let g=0.19+0.06*Math.sin(s*0.017+0.4)+0.04*Math.sin(s*0.043+1.7);
    g*=0.25+0.75*smooth(0,35,s);g*=1-smooth(QH.L+5,QH.L+50,s);if(s<0)g=0.03;
    y-=g*QH.step;B[i]=y;}
  QH.B=B;QH.FY=B[Math.round((QH.L+70-QH.s0)/QH.step)]-0.25;
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

// ---- chunks: meshes with painted textures (41-quilttex.js)
const CHUNKS=new Map();
function updateChunks(sNow,ahead,dens,budget){
  const c0=Math.floor(sNow/QH.CH)-1,c1=Math.floor((sNow+ahead)/QH.CH);
  for(const[k,m]of CHUNKS)if(k<c0-1||k>c1+1){freeChunk(m);CHUNKS.delete(k);}
  let built=0;for(let c=c0;c<=c1&&built<budget;c++){if(c<-3||c*QH.CH>QH.s1-40)continue;if(!CHUNKS.has(c)){CHUNKS.set(c,bakeChunkMesh(c,Q.ppm,dens));built++;}}return built;}
function clearChunks(){for(const m of CHUNKS.values())freeChunk(m);CHUNKS.clear();}
