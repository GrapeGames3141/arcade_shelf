// ---------- 40-track: the scarf course, frames, chunks of baked splats ----------
const TR={L:1500,hw:4.0,s0:-60,s1:1700,step:0.5,CH:20,n:0};
(function buildTrack(){
  const n=Math.ceil((TR.s1-TR.s0)/TR.step)+1;TR.n=n;
  const X=new Float32Array(n),Y=new Float32Array(n),Z=new Float32Array(n);
  let y=0;
  for(let i=0;i<n;i++){const s=TR.s0+i*TR.step;
    const st=smooth(0,70,s);
    X[i]=(14*Math.sin(s*0.011)+7*Math.sin(s*0.027+1.3)+3.2*Math.sin(s*0.061+0.4)-(14*0+7*Math.sin(1.3)+3.2*Math.sin(0.4)))*st;
    Z[i]=-s;
    let g=0.17+0.06*Math.sin(s*0.012+0.5)+0.035*Math.sin(s*0.041+2.0);
    g*=0.3+0.7*smooth(0,40,s);
    g*=1-smooth(TR.L+5,TR.L+60,s);
    g-=0.1*smooth(TR.L+40,TR.L+110,s);
    if(s<0)g=0.04;
    y-=g*TR.step;
    Y[i]=y+0.45*Math.sin(s*0.07)*smooth(60,120,s)*(1-smooth(TR.L-40,TR.L,s));
  }
  TR.X=X;TR.Y=Y;TR.Z=Z;
  // per-sample frames
  const T=new Float32Array(n*3),Rr=new Float32Array(n*3),N=new Float32Array(n*3),head=new Float32Array(n),arc=new Float32Array(n),grade=new Float32Array(n);
  for(let i=0;i<n;i++){const a=Math.max(0,i-1),b=Math.min(n-1,i+1);
    const d=[X[b]-X[a],Y[b]-Y[a],Z[b]-Z[a]];const L=Math.hypot(d[0],d[1],d[2]);const t=[d[0]/L,d[1]/L,d[2]/L];
    const r=v3.norm(v3.cross(t,[0,1,0]));const nn=v3.cross(r,t);
    T.set(t,i*3);Rr.set(r,i*3);N.set(nn,i*3);head[i]=Math.atan2(d[0],-d[2]);arc[i]=L/((b-a)*TR.step);grade[i]=-t[1];}
  const kap=new Float32Array(n);for(let i=0;i<n;i++){const a=Math.max(0,i-2),b=Math.min(n-1,i+2);kap[i]=(head[b]-head[a])/((b-a)*TR.step);}
  Object.assign(TR,{T,R:Rr,N,head,arc,grade,kap});
})();
function trIdx(s){const f=(clamp(s,TR.s0,TR.s1-1)-TR.s0)/TR.step;const i=Math.floor(f);return[i,f-i];}
function frame(s){const[i,f]=trIdx(s);const j=i*3,k=j+3;
  const L=(A)=>[lerp(A[j],A[k],f),lerp(A[j+1],A[k+1],f),lerp(A[j+2],A[k+2],f)];
  return{C:[lerp(TR.X[i],TR.X[i+1],f),lerp(TR.Y[i],TR.Y[i+1],f),lerp(TR.Z[i],TR.Z[i+1],f)],T:v3.norm(L(TR.T)),R:v3.norm(L(TR.R)),N:v3.norm(L(TR.N)),
    arc:lerp(TR.arc[i],TR.arc[i+1],f),grade:lerp(TR.grade[i],TR.grade[i+1],f),kap:lerp(TR.kap[i],TR.kap[i+1],f)};}
// lateral profile height (relative to centre line, along N)
function profile(u){const a=Math.abs(u),hw=TR.hw;if(a<=hw)return 0.1*(a/hw)*(a/hw);return 0.1+(a-hw)*0.38+Math.max(0,a-hw-6)*0.25;}
function profileSlope(u){const a=Math.abs(u),hw=TR.hw,s=Math.sign(u);if(a<=hw)return s*0.2*a/(hw*hw);return s*(0.38+(a>hw+6?0.25:0));}
function surf(s,u,fr){fr=fr||frame(s);return v3.add(v3.add(fr.C,v3.sc(fr.R,u)),v3.sc(fr.N,profile(u)));}

// ---- scarf colour pattern
const SCARF_PALS=[['#cf4a42','#f6ecda','#4f8a5b'],['#3f8f93','#f6ecda','#e2aa3c'],['#80507a','#f4c6d2','#f6ecda'],['#304468','#f7f4ee','#cf4a42'],['#e2aa3c','#f6ecda','#cf4a42']].map(p=>p.map(hex));
const MOTIF={heart:[".XX.XX.","XXXXXXX","XXXXXXX",".XXXXX.","..XXX..","...X..."],flake:["X..X..X",".X.X.X.","..XXX..","XXXXXXX","..XXX..",".X.X.X.","X..X..X"],
  tree:["...X...","..XXX..",".XXXXX.","..XXX..",".XXXXX.","XXXXXXX","...X..."],star:["...X...","...X...","XXXXXXX",".XXXXX.","..XXX..",".XX.XX.","X.....X"]};
const MOTIF_KEYS=Object.keys(MOTIF);
const ROWH=0.24,COLW=0.3;
function stitchColor(r,c,ncol){
  const sect=Math.floor(r/72);const P=SCARF_PALS[((sect%SCARF_PALS.length)+SCARF_PALS.length)%SCARF_PALS.length];
  const k=((r%72)+72)%72;
  if(c===0||c===ncol-1||c===1||c===ncol-2)return(k%2===0)?shade(P[0],0.82):P[0];
  if(k<5)return P[0];if(k<8)return P[1];
  if(k>=8&&k<16){const m=MOTIF[MOTIF_KEYS[((sect%4)+4)%4]];const mr=m.length-1-(k-8);if(mr<0||mr>=m.length)return P[1];
    const cc=(c-2)%9;if(cc<7&&m[mr][cc]==='X')return P[0];return P[1];}
  if(k<20)return P[1];if(k<24)return P[2];if(k<27)return P[1];
  if(k>=27&&k<31)return((c+k)%4<2)?P[0]:P[1]; // checker band
  if(k<36)return P[1];if(k<42)return P[2];if(k<46)return P[1];
  if(k>=46&&k<54){const m=MOTIF[MOTIF_KEYS[((sect+2)%4+4)%4]];const mr=m.length-1-(k-46);if(mr<0||mr>=m.length)return P[1];
    const cc=(c+2)%9;if(cc<7&&m[mr][cc]==='X')return P[2];return P[1];}
  if(k<58)return P[1];if(k<64)return P[0];return P[1];
}

// ---- chunk baking
const CHUNKS=new Map();
function bakeChunk(ci,dens){
  const rnd=mulberry(1000+ci*7919);const sb=new SB(16000);const glow=LIGHTS_ON?new SB(600):null;
  const sA=ci*TR.CH,sB=sA+TR.CH;const hw=TR.hw;
  const scarfEnd=TR.L+110,scarfStart=-25;
  const ncol=Math.round(2*hw/COLW);
  // scarf stitches
  const r0=Math.ceil(Math.max(sA,scarfStart)/ROWH),r1=Math.floor(Math.min(sB,scarfEnd)/ROWH);
  for(let r=r0;r<=r1;r++){const s=r*ROWH;if(s<sA||s>=sB)continue;const fr=frame(s);
    for(let c=0;c<ncol;c++){const u=-hw+(c+0.5)*COLW;const col=stitchColor(r,c,ncol);
      const base=v3.add(v3.add(fr.C,v3.sc(fr.R,u)),v3.sc(fr.N,profile(u)+0.03));
      // dark gap between stitch columns
      if(dens>=0.7){const g=v3.add(v3.add(base,v3.sc(fr.R,COLW/2)),v3.sc(fr.N,-0.02));sb.add(g[0],g[1],g[2],0.11,shade(col,0.62),fr.N[0],fr.N[1],fr.N[2],false,rnd());}
      const v=0.94+rnd()*0.1;
      if(dens<0.7){sb.add(base[0],base[1],base[2],0.19,shade(col,v),fr.N[0],fr.N[1],fr.N[2],false,rnd());}
      else for(const sx of[-1,1]){const leg=v3.add(v3.add(base,v3.sc(fr.R,sx*0.07)),v3.sc(fr.T,0.02));
        const nn=v3.norm(v3.add(v3.add(fr.N,v3.sc(fr.R,sx*0.45)),v3.sc(fr.T,-0.25)));
        const ang=Math.PI/2-sx*0.5+(rnd()-0.5)*0.12;
        sb.add(leg[0],leg[1],leg[2],0.17,shade(col,v),nn[0],nn[1],nn[2],'stitch',ang/(Math.PI*2));
        if(dens>1.1){const l2=v3.add(leg,v3.sc(fr.T,0.05));sb.add(l2[0],l2[1]+0.005,l2[2],0.1,shade(col,v*1.05),nn[0],nn[1],nn[2],'stitch',ang/(Math.PI*2));}}
      if(rnd()<0.05*dens){const f=v3.add(base,v3.sc(fr.N,0.05));sb.add(f[0],f[1],f[2],0.02,shade(col,1.1),fr.N[0],fr.N[1],fr.N[2]);}
    }
    // rolled edges down into the snow
    for(const sx of[-1,1])for(let k=0;k<3;k++){const p=v3.add(surf(s,sx*(hw+0.04),fr),v3.sc(fr.N,-0.06*k));const col=stitchColor(r,0,ncol);
      sb.add(p[0],p[1],p[2],0.12,shade(col,0.85),fr.R[0]*sx,fr.R[1]*sx+0.3,fr.R[2]*sx,false,rnd());}
  }
  // fringe tassels at the scarf ends
  for(const se of[scarfStart,scarfEnd]){if(se<sA||se>=sB)continue;const fr=frame(se);const dir=se===scarfEnd?1:-1;
    for(let c=0;c<ncol;c+=1){const u=-hw+(c+0.5)*COLW;const col=stitchColor(Math.round(se/ROWH),c,ncol);
      for(let k=0;k<12;k++){const p=v3.add(surf(se,u,fr),v3.add(v3.sc(fr.T,dir*k*0.06),v3.sc(fr.N,-k*0.012)));sb.add(p[0],p[1],p[2],0.06,shade(col,0.95),fr.N[0],fr.N[1],fr.N[2]);}}}
  // snow banks (cotton-batting felt)
  const spN=0.42/Math.sqrt(dens);
  for(let s=sA;s<sB;s+=spN){const fr=frame(s);
    for(const sx of[-1,1]){
      const uStart=(s>scarfStart&&s<scarfEnd)?hw+0.15:0;
      for(let a=uStart;a<16;a+=spN){const u=sx*(a+rnd()*spN*0.8);const bump=vnoise(s*0.25,u*0.25)*0.35*smooth(hw,hw+3,Math.abs(u))+vnoise(s*0.07+9,u*0.07)*0.8*smooth(hw+2,12,Math.abs(u));
        const p=v3.add(surf(s+rnd()*spN,u,fr),v3.sc(fr.N,bump));const c=rnd()<0.2?PAL.snowB:shade(PAL.snow,0.95+rnd()*0.06);
        const nn=v3.norm(v3.add(fr.N,v3.sc(fr.R,-sx*0.25+(rnd()-0.5)*0.4)));sb.add(p[0],p[1],p[2],spN*(1.0+rnd()*0.35),c,nn[0],nn[1],nn[2],false,rnd());}
    }}
  const spF=1.0/Math.sqrt(dens);
  for(let s=sA;s<sB;s+=spF){const fr=frame(s);for(const sx of[-1,1])for(let a=16;a<48;a+=spF*(1+(a-16)/30)){const u=sx*(a+rnd()*spF);
    const p=v3.add(surf(s+rnd()*spF,u,fr),v3.sc(fr.N,vnoise(s*0.05,u*0.05)*2.5));sb.add(p[0],p[1],p[2],spF*1.7*(1+(a-16)/40),shade(PAL.snow,0.93+rnd()*0.07),fr.N[0],fr.N[1],fr.N[2],false,rnd());}}
  // candy cane markers
  for(let s=Math.ceil(sA/15)*15;s<sB;s+=15){if(s<5||s>TR.L+100)continue;const fr=frame(s);for(const sx of[-1,1]){const p=surf(s,sx*(hw+0.9),fr);bakeCane(sb,p,1.1,v3.sc(fr.R,-sx),fr.T,dens,rnd);
    if(glow&&s+15<=TR.L+100){const q=surf(s+15,sx*(hw+0.9));lightString(sb,glow,v3.add(p,[0,1.18,0]),v3.add(q,[0,1.18,0]),0.38,0.55,(s/15|0)+(sx>0?2:0));}}}
  // trees, snowmen
  const nt=Math.round((3+rnd()*3)*Math.min(1.2,dens));
  for(let i=0;i<nt;i++){const s=sA+rnd()*TR.CH;const sx=rnd()<0.5?-1:1;const u=sx*(hw+4+rnd()*rnd()*30);const fr=frame(s);const base=surf(s,u,fr);
    const tsz=3+rnd()*4.5;bakeTree(sb,v3.add(base,[0,-0.1,0]),[1,0,0],[0,1,0],[0,0,1],tsz,rnd,dens);if(glow)treeLights(sb,glow,v3.add(base,[0,-0.1,0]),tsz,ci*31+i);}
  if(rnd()<0.25&&sA>40){const s=sA+rnd()*TR.CH,sx=rnd()<0.5?-1:1;bakeSnowman(sb,surf(s,sx*(hw+3+rnd()*4)),rnd);}
  const m=makeModel(sb);if(glow&&glow.n)m.glow=makeModel(glow);return m;
}
function updateChunks(sNow,ahead,dens,budget){
  const c0=Math.floor(sNow/TR.CH)-1,c1=Math.floor((sNow+ahead)/TR.CH);
  for(const[k,m]of CHUNKS)if(k<c0-1||k>c1+1){freeChunkM(m);CHUNKS.delete(k);}
  let built=0;
  for(let c=c0;c<=c1&&built<budget;c++){if(c<-3||c*TR.CH>TR.s1-40)continue;if(!CHUNKS.has(c)){CHUNKS.set(c,bakeChunk(c,dens));built++;}}
  return built;
}
function freeChunkM(m){if(m.glow)freeModel(m.glow);freeModel(m);}
function clearChunks(){for(const m of CHUNKS.values())freeChunkM(m);CHUNKS.clear();}

// ---- start and finish arches (world baked)
function buildArches(){
  const sb=new SB(6000);const rnd=mulberry(5);const glow=LIGHTS_ON?new SB(200):null;
  for(const[s,cols]of[[4,[PAL.teal,PAL.mustard,PAL.red,PAL.cream]],[TR.L,[PAL.red,PAL.cream,PAL.green,PAL.mustard,PAL.plum]]]){
    const fr=frame(s);const pl=surf(s,-(TR.hw+0.6),fr),pr=surf(s,TR.hw+0.6,fr);
    bakeCane(sb,pl,4.2,fr.R,fr.T,1,rnd);bakeCane(sb,pr,4.2,v3.sc(fr.R,-1),fr.T,1,rnd);
    const a=v3.add(pl,[0,4.3,0]),b=v3.add(pr,[0,4.3,0]);const N=36;
    if(glow)for(const[pp,dir]of[[pl,1],[pr,-1]])for(let y=0.3;y<4.1;y+=0.32)addBulb(sb,glow,v3.add(v3.add(pp,[0,y,0]),v3.sc(fr.T,0.12)),BULB_COLS[Math.round(y/0.32)%BULB_COLS.length],0.1,0.75);
    for(let i=0;i<=N;i++){const t=i/N;const p=v3.add(v3.lerp(a,b,t),[0,-Math.sin(t*Math.PI)*0.7,0]);sb.add(p[0],p[1],p[2],0.05,PAL.brownD,0,0,1);
      if(glow&&i%3===0)addBulb(sb,glow,v3.add(p,[0,-0.09,0]),BULB_COLS[(i/3)%BULB_COLS.length],0.11,0.85);
      if(i%3===1&&i<N-1){const col=cols[(i/3|0)%cols.length];for(let y=0;y<0.6;y+=0.05){const w=0.28*(1-y/0.6);for(let x=-w;x<=w;x+=0.05){const q=v3.add(v3.add(p,v3.sc(fr.R,x)),[0,-y-0.04,0]);sb.add(q[0],q[1],q[2],0.065,col,-fr.T[0],0,-fr.T[2]);}}}}
  }
  const m=makeModel(sb);if(glow&&glow.n)m.glow=makeModel(glow);return m;
}
