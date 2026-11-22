
// ============================================================
//  CREATURES · bind-pose bodies (signed distance), rigs, coats
// ============================================================
// Every creature: +x forward, +y up, +z its left side. Units: cm, bind pose standing on y = 0.
const E_=(c,r,bone,reg=0,k=0.15,o)=>Object.assign({t:'e',c,r,bone,reg,k},o||{});
const C_=(a,b,ra,rb,bone,reg=0,k=0.12,o)=>Object.assign({t:'c',a,b,ra,rb,bone,reg,k},o||{});
// mirror a left-side list onto the right: z -> -z, bones remapped
function mirror(list,bmap){return list.map(q=>{const o=Object.assign({},q);const m=p=>[p[0],p[1],-p[2]];if(q.t==='e'){o.c=m(q.c);if(q.R)o.R=[q.R[0],q.R[1],-q.R[2],q.R[3],q.R[4],-q.R[5],-q.R[6],-q.R[7],q.R[8]];}else{o.a=m(q.a);o.b=m(q.b);}o.bone=bmap[q.bone]!==undefined?bmap[q.bone]:q.bone;return o;});}
const B_=(n,p,h)=>({n,p,h});
let COATK=1; // coat density factor, set from the quality tier

// ---------- unicorn (and pegasus, foal) ----------
function unicornDef(o={}){
  const bones=[B_('body',-1,[0,4.7,0]),B_('pelvis',0,[-2.2,4.8,0]),B_('chest',0,[1.9,4.6,0]),B_('neck1',2,[2.4,5.3,0]),B_('neck2',3,[3.45,6.6,0]),B_('head',4,[4.2,7.95,0]),
    B_('tail1',1,[-3.35,5.3,0]),B_('tail2',6,[-3.95,4.6,0]),
    B_('FLu',2,[2.1,4.0,.85]),B_('FLl',8,[2.22,2.2,.85]),B_('FLh',9,[2.27,.75,.85]),B_('FRu',2,[2.1,4.0,-.85]),B_('FRl',11,[2.22,2.2,-.85]),B_('FRh',12,[2.27,.75,-.85]),
    B_('HLu',1,[-2.3,4.1,.8]),B_('HLl',14,[-2.85,2.25,.8]),B_('HLh',15,[-2.66,.75,.8]),B_('HRu',1,[-2.3,4.1,-.8]),B_('HRl',17,[-2.85,2.25,-.8]),B_('HRh',18,[-2.66,.75,-.8]),
    B_('wL1',2,[1.0,5.65,.8]),B_('wL2',20,[-.45,5.95,1.05]),B_('wR1',2,[1.0,5.65,-.8]),B_('wR2',22,[-.45,5.95,-1.05])];
  const P=[
    E_([-.1,4.55,0],[2.6,1.32,1.0],0,0,.6),E_([.1,4.05,0],[2.0,.8,.86],0,0,.6),E_([1.72,4.36,0],[1.22,1.44,.94],2,0,.7),E_([1.2,5.5,0],[1.25,.55,.55],2,0,.6),
    E_([-2.15,4.9,0],[1.45,1.38,1.06],1,0,.7),E_([-2.85,4.62,0],[.85,1.15,.85],1,0,.5),
    C_([2.0,4.95,0],[3.4,6.55,0],1.32,.86,3,0,.6),C_([3.4,6.55,0],[4.12,7.62,0],.86,.6,4,0,.4),C_([1.35,5.95,0],[3.9,7.95,0],.56,.4,3,0,.55),
    E_([4.42,7.86,0],[.78,.65,.6],5,0,.25),C_([4.6,7.72,0],[5.9,6.55,0],.6,.41,5,0,.3),E_([4.55,7.38,0],[.78,.6,.55],5,0,.25),E_([5.86,6.52,0],[.46,.4,.39],5,10,.18,{pri:.02}),
    E_([6.13,6.62,.24],[.08,.075,.07],5,10,.04,{op:'s'}),E_([6.13,6.62,-.24],[.08,.075,.07],5,10,.04,{op:'s'}),
    C_([4.18,8.46,.3],[3.98,9.2,.37],.16,.035,5,0,.08),C_([4.18,8.46,-.3],[3.98,9.2,-.37],.16,.035,5,0,.08),
    C_([-3.2,5.28,0],[-3.95,4.5,0],.38,.2,6,0,.25),
  ];
  // legs (left, mirrored)
  const L=[
    E_([1.9,3.95,.72],[.9,1.2,.5],8,0,.45),C_([2.04,4.2,.85],[2.23,2.25,.85],.62,.31,8,0,.3),E_([2.23,2.2,.85],[.31,.33,.28],9,0,.12),
    C_([2.23,2.2,.85],[2.27,.82,.85],.24,.19,9,0,.12),E_([2.29,.75,.85],[.27,.25,.23],10,0,.1),C_([2.29,.75,.85],[2.38,.3,.85],.19,.2,10,0,.08),
    C_([2.38,.3,.85],[2.44,.03,.85],.25,.3,10,1,.05,{pri:.03}),
    E_([-2.4,3.75,.7],[1.2,1.25,.56],14,0,.5),C_([-2.4,3.6,.8],[-2.86,2.27,.8],.56,.29,14,0,.3),E_([-2.9,2.22,.8],[.33,.31,.26],15,0,.12),
    C_([-2.86,2.2,.8],[-2.68,.82,.8],.23,.19,15,0,.12),E_([-2.67,.75,.8],[.27,.25,.23],16,0,.1),C_([-2.67,.75,.8],[-2.57,.3,.8],.19,.2,16,0,.08),
    C_([-2.57,.3,.8],[-2.53,.03,.8],.24,.29,16,1,.05,{pri:.03}),
  ];
  P.push(...L,...mirror(L,{8:11,9:12,10:13,14:17,15:18,16:19}));
  if(!o.pegasus)P.push(C_([4.75,8.4,0],[5.62,10.75,0],.15,.01,5,2,.05,{pri:.05}));
  if(o.pegasus){const W=[C_([1.0,5.65,.8],[-.45,5.95,1.05],.2,.13,20,0,.15),C_([-.45,5.95,1.05],[-2.0,5.55,1.0],.12,.05,21,0,.08)];P.push(...W,...mirror(W,{20:22,21:23}));}
  // concept art: a slimmer, longer-legged Arabian build — stretch everything below the belly, lift the rest
  const ys=y=>y<4.2?y*1.11:y+.462,yv=p=>[p[0],ys(p[1]),p[2]];
  for(const q of P){if(q.t==='e'){q.c=yv(q.c);if(q.c[1]<4.6)q.r=[q.r[0],q.r[1]*1.06,q.r[2]];}else{q.a=yv(q.a);q.b=yv(q.b);}}for(const b of bones)b.h=yv(b.h);
  return{name:o.pegasus?'pegasus':'unicorn',prims:P,bones,cell:.1,sigma:.28,aoR:.5,ys,
    eyes:[{c:[4.78,ys(8.04),.5],r:.17,dir:[.35,.2,1],bone:5},{c:[4.78,ys(8.04),-.5],r:.17,dir:[.35,.2,-1],bone:5}],
    regf:(p,reg)=>{if(reg!==0)return reg;const t=clamp((4.0-p[0])/2.95,0,1);const cy=lerp(ys(8.38),ys(6.0),t)+Math.sin(t*PI)*.32;
      if(p[0]>.9&&p[0]<4.25&&p[1]>cy-.42&&Math.abs(p[2])<.42)return 16;if(p[0]<-2.9&&p[1]>ys(4.5)&&Math.abs(p[2])<.42&&p[0]>-4.1)return 16;return reg;},
    uvf:(p,reg)=>reg===2?[Math.atan2(p[2],p[0]-5.0)/TAU+.5,(p[1]-8.86)/2.4]:[p[0],p[1]],
    colf:(p,reg)=>[.5+.3*noise3(p[0]*.8,p[1]*.8,p[2]*.8),0,0]};}
// fur flow over a horse body
function horseFlow(p){if(p[1]<3.7&&(Math.abs(p[0]-2.2)<1.2||Math.abs(p[0]+2.6)<1.3))return[0,-1,0];if(p[0]>3.9&&p[1]>7.26)return V.norm([.75,-.65,0]);if(p[0]>2.3&&p[1]>5.26)return V.norm([-.55,-.85,0]);return V.norm([-1,-.28,0]);}
function unicornCoat(mb,def,o={}){const sb=new SB(40000);const r=rng(o.seed||7);const D=(o.fluffy?150:110)*COATK;
  sampleSurface(mb,[0],D,r,(p,n,b0,b1,w0,ao)=>{const f=horseFlow(p);const sh=clamp(.58+.5*noise3(p[0]*.8,p[1]*.8,p[2]*.8)+(r()-.5)*.08,0,1);
    furSplat(sb,p,n,f,(o.fluffy?.085:.05)*(.8+.4*r()),(o.fluffy?.045:.032),[sh,0,0],ao,b0,b1,w0,o.fluffy?.25:.05,0,0);});
  // mane: locks rooted along the crest, lifting a little then falling over the near side of the neck (a quarter fall to the far
  // side), with long S-waves; a short upright row along the crest hides the parting
  const PR=prepPrims(def.prims);const K=Math.max(COATK,.6);const ys=def.ys||(y=>y);
  const crest=t=>[lerp(4.0,1.05,t),lerp(ys(8.38),ys(6.0),t)+Math.sin(t*PI)*.32+.05,0];
  const nL=Math.round((o.foal?22:48)*Math.max(K,.75));
  const bAt=t=>t<.3?[5,4,1-t/.3*.6]:t<.7?[4,3,1-(t-.3)/.4*.7]:[3,2,1-(t-.7)/.3*.7];
  for(let i=0;i<nL;i++){const t=(i+r()*.6)/nL;const c=crest(t);const far=r()<(o.foal?.4:.26)?-1:1;
    const L=o.foal?.9+r()*.4:(3.2+r()*1.6)*(t<.85?1:lerp(1,.6,(t-.85)/.15))*(t<.08?.7:1);
    const root=V.add(c,[0,-.04,far*(.04+r()*.05)]);const d0=V.norm([-.5-r()*.2,.12+r()*.15,far*(.9+r()*.3)]);
    const g=drapeGuide(PR,root,d0,L,{seg:18,gap:.09,wave:o.foal?.06:.16+r()*.1,waveF:1.0+r()*.5,stiff:.42,loft:.35},r);const bb=bAt(t);
    hairLock(sb,PR,g,{n:(o.foal?18:34)*K,r0:o.foal?.13:.22,r1:o.foal?.07:.1,w:o.foal?.032:.03,seg:18,frizz:.008,gap:.06,boneAt:()=>bb,h0:.1,h1:1,ao0:.42,stray:.06,tip:.6},r);}
  for(let i=0;i<Math.round(50*K);i++){const t=r();const c=crest(t);const pts=[V.add(c,[0,-.06,(r()-.5)*.1])];let p=pts[0];const L=o.foal?.35:.45+r()*.2;const lean=(r()<.7?1:-1)*(.8+r()*.6);
    for(let k=1;k<=5;k++){p=V.add(p,[-.1*L,L/5*(.5-k*.3),lean*L/5]);pts.push(p);}const bb=bAt(t);hairLock(sb,null,pts,{n:3,r0:.03,r1:.02,w:.05,seg:5,boneAt:()=>bb,h0:0,h1:.3,ao0:.55,lockVar:.2},r);}
  // forelock: a few locks from the poll falling forward between the ears
  const nF=o.foal?3:7;for(let i=0;i<nF;i++){const root=[4.2+r()*.15,ys(8.5)+.12,(r()-.5)*.36];const d0=V.norm([1,.15,(root[2])*1.2]);
    const g=drapeGuide(PR,root,d0,o.foal?.6:1.15+r()*.4,{seg:10,gap:.07,stiff:.28,wave:.06},r);hairLock(sb,PR,g,{n:18*K,r0:.09,r1:.05,w:.028,seg:10,bone:5,h0:.05,h1:.5,ao0:.5,tip:.6},r);}
  // tail: locks from the dock arc back and fall to the hocks, gathered toward the tips
  const nT=Math.round((o.foal?24:40)*Math.max(K,.75));const dock0=[-3.2,ys(5.25),0],dock1=[-3.75,ys(4.75),0];
  for(let i=0;i<nT;i++){const t=r();const base=V.add(V.lerp(dock0,dock1,t),[0,0,(r()-.5)*.3]);const L=(o.foal?3.1+r()*.7:5.0+r()*1.3)*(1-t*.2);
    const d0=V.norm([-1,.55-t*.4,(r()-.5)*.5]);const g=drapeGuide(PR,base,d0,L,{seg:16,gap:.12,stiff:.26,wave:.14,waveF:.9+r()*.4,loft:.3},r);
    hairLock(sb,PR,g,{n:(o.foal?16:34)*K,r0:.19,r1:.1,w:.034,seg:16,frizz:.01,gap:.08,tip:.6,boneAt:(p,s)=>s<.18?[6,7,1-s/.18]:[7,7,1],h0:.2,h1:1,ao0:.5,stray:.06},r);}
  // feathered wings (pegasus): coverts, secondaries, primaries along the folded arm
  if(o.pegasus){for(const side of[1,-1]){const S=[1.0,6.11,.8*side],E=[-.45,6.41,1.05*side],T=[-2.0,6.01,1.0*side];const b1=side>0?20:22,b2=side>0?21:23;
    const nrm=[0,0,side];
    // layered like a bird's wing: small coverts over the arm, then secondaries, then long primaries toward the tip
    const rows=[{n:46,len:[.7,.95],off:.09,t0:0,t1:1,acc:0,w:.3},{n:38,len:[1.3,1.8],off:.05,t0:.02,t1:1,acc:.12,w:.32},{n:30,len:[2.3,3.0],off:.02,t0:.04,t1:.62,acc:.3,w:.34},{n:24,len:[3.1,4.4],off:-.01,t0:.52,t1:1,acc:.5,w:.3}];
    for(const R of rows)for(let i=0;i<R.n;i++){const t=lerp(R.t0,R.t1,i/(R.n-1));const a=t<.5?V.lerp(S,E,t*2):V.lerp(E,T,(t-.5)*2);const L=lerp(R.len[0],R.len[1],t);
      const dir=V.norm(V.lerp([-.35,-1,0],[-1,-.15,0],Math.max(0,t-.5)*1.6));const bb=t<.5?b1:b2;const w=(R.w||.2)*(.85+.3*r());
      const c=V.madd(V.madd(a,dir,L*.5),nrm,R.off*side*0+R.off);
      sb.push(c,V.mul(V.norm(V.cross(dir,nrm)),w),V.mul(dir,L*.5),[.5+.3*r(),1,R.acc,1],1,nrm,0,bb,bb,255,(3<<4));}}}
  return sb;}

// hair that hugs the scalp first, then falls: roots over the crown and back of an ellipsoid head, never on the face
function hairStrands(sb,r,o){const c=o.c,R=o.r;const n=o.n;let made=0;
  for(let i=0;i<n*3&&made<n;i++){const th=r()*TAU,ph=Math.acos(1-2*r()*.62);const d=[Math.cos(th)*Math.sin(ph),Math.cos(ph),Math.sin(th)*Math.sin(ph)];
    if(d[0]>.25&&d[1]<.8)continue;if(d[1]<-.05)continue;made++;
    let p=V.add(c,[d[0]*R[0]*1.03,d[1]*R[1]*1.03,d[2]*R[2]*1.03]);const pts=[p];const L=o.len[0]+r()*(o.len[1]-o.len[0]);const seg=o.seg||10;const st=L/seg;
    let free=false;let dir=null;
    for(let k=0;k<seg;k++){const q=[(p[0]-c[0])/R[0],(p[1]-c[1])/R[1],(p[2]-c[2])/R[2]];const ql=Math.hypot(q[0],q[1],q[2]);
      if(!free){const nrm=V.norm([q[0]/R[0],q[1]/R[1],q[2]/R[2]]);let want=V.norm([-.55,-1,q[2]*.25]);want=V.norm(V.sub(want,V.mul(nrm,V.dot(want,nrm))));
        p=V.madd(p,want,st);const q2=[(p[0]-c[0])/R[0],(p[1]-c[1])/R[1],(p[2]-c[2])/R[2]];const l2=Math.hypot(q2[0],q2[1],q2[2]);p=V.add(c,[q2[0]/l2*R[0]*1.04,q2[1]/l2*R[1]*1.04,q2[2]/l2*R[2]*1.04]);
        if(q2[1]/l2<o.fallAt){free=true;dir=V.norm([want[0]*.5-.2,-1,want[2]*.4]);}}
      else{dir=V.norm(V.add(dir,[-.02,-.25,-dir[2]*.15]));p=V.madd(p,dir,st);if(o.clamp)p=o.clamp(p);}
      pts.push(p);}
    strand(sb,pts,o.w*(.8+.4*r()),s=>[.35+.45*r(),1,s,1],o.bone,o.bone,1,o.h0,o.h1,2);}
}
// ---------- hair: clumped locks along guide curves that drape over the body ----------
// A guide starts at a root, heads off along d0, bends under gravity and slides over the body (the creature's own
// signed distance field keeps it a gap above the skin); a sideways wave along the surface gives flowing S-curves.
// Each lock is then a bundle of thin strands around its guide, wide at the root and gathered at the tip.
function resampleArc(G,m){const L=[0];for(let i=1;i<G.length;i++)L.push(L[i-1]+V.dist(G[i],G[i-1]));const tot=L[L.length-1];const out=[];let j=0;
  for(let k=0;k<=m;k++){const s=tot*k/m;while(j<G.length-2&&L[j+1]<s)j++;const u=(s-L[j])/Math.max(1e-6,L[j+1]-L[j]);out.push(V.lerp(G[j],G[j+1],clamp(u,0,1)));}return out;}
function pushOut(PR,q,gap){if(!PR)return q;for(let it=0;it<3;it++){const d=sdfE(PR,q[0],q[1],q[2]);if(d>=gap)break;const g=sdfG(PR,q[0],q[1],q[2],.03);q=V.madd(q,g,gap-d);}return q;}
function drapeGuide(PR,root,d0,len,o,r){const seg=o.seg||16,st=len/seg;let p=root.slice(),d=V.norm(d0);const pts=[p.slice()];const grav=o.grav||[0,-1,0];
  for(let i=1;i<=seg;i++){const t=i/seg;const hk=o.hug?clamp((t-o.hug*.5)/o.hug,0,1):1;d=V.norm(V.add(d,V.mul(grav,(o.stiff===undefined?.32:o.stiff)*(.35+t)*(.3+.7*hk))));if(o.back)d=V.norm(V.add(d,V.mul(o.back,.05)));
    const q=pushOut(PR,V.madd(p,d,st),(o.gap||.1)*(1+t*(o.loft||0)));d=V.norm(V.sub(q,p));p=q;pts.push(p.slice());}
  if(o.wave){const ph=r()*TAU,wf=o.waveF||1.6;const out=[pts[0]];for(let i=1;i<pts.length;i++){const t=i/seg;const a=pts[i-1],b=pts[i];const dir=V.norm(V.sub(b,a));
      const g=PR?sdfG(PR,b[0],b[1],b[2],.03):[0,0,1];const w=V.norm(V.cross(dir,g));out.push(pushOut(PR,V.madd(b,w,Math.sin(t*wf*TAU+ph)*o.wave*sstep(.1,.45,t)),(o.gap||.1)*.8));}return out;}
  return pts;}
function ptFrames(G){const n=G.length,T=[],N=[],B=[];for(let i=0;i<n;i++){const a=G[Math.max(0,i-1)],b=G[Math.min(n-1,i+1)];T.push(V.norm(V.sub(b,a)));}
  let nn=V.perp(T[0]);for(let i=0;i<n;i++){nn=V.norm(V.sub(nn,V.mul(T[i],V.dot(nn,T[i]))));N.push(nn);B.push(V.cross(T[i],nn));}return{T,N,B};}
// o: n strands, r0/r1 lock radius at root/tip, w strand width, seg, frizz, gap, boneAt(p,t)->[b0,b1,w0] or bone, h0/h1 swing, ao0 root shading, acc accent
function hairLock(sb,PR,guide,o,r){const G=resampleArc(guide,o.seg||14),F=ptFrames(G),m=G.length;const lockShade=(r()-.5)*(o.lockVar===undefined?.4:o.lockVar);const n=Math.max(2,Math.round(o.n));
  for(let k=0;k<n;k++){const a=r()*TAU,rr=Math.sqrt(r());const ox=Math.cos(a)*rr,oy=Math.sin(a)*rr;const sh=clamp(.5+lockShade+(r()-.5)*.3,0,1);const w=o.w*(.7+.6*r());
    let fz=[0,0,0];const pts=[];const stray=r()<(o.stray||0)?1:0;const ms=Math.max(3,m+Math.floor(r()*5)-2);const sh0=r();const lf=1-Math.pow(r(),1.5)*(o.taper===undefined?.35:o.taper);
    for(let j=0;j<ms;j++){const t=clamp((j+(j>0&&j<ms-1?(sh0-.5)*.8:0))/(ms-1),0,1);const fi=t*(m-1),i0=Math.min(m-2,Math.floor(fi)),fu=fi-i0;const Gi=V.lerp(G[i0],G[i0+1],fu),Ni=V.norm(V.lerp(F.N[i0],F.N[i0+1],fu)),Bi=V.norm(V.lerp(F.B[i0],F.B[i0+1],fu));const i=j;const R=lerp(o.r0,o.r1,Math.pow(t,o.clumpP||1))*(1+stray*t*1.5);fz=V.add(V.mul(fz,.75),V.mul([r()-.5,r()-.5,r()-.5],(o.frizz||0)*(1+stray*3)));
      let q=V.add(V.add(Gi,V.mul(Ni,ox*R)),V.add(V.mul(Bi,oy*R),fz));if(PR&&(i%2===0||i===ms-1))q=pushOut(PR,q,(o.gap||.06)*.6);pts.push(q);}
    for(let i=0;i<pts.length-1;i++){const t=i/(pts.length-1);if(t>lf)break;const A=pts[i],Bp=pts[i+1];const d=V.sub(Bp,A);const L=V.len(d);if(L<1e-5)continue;const dir=V.mul(d,1/L);
      let g=PR?sdfG(PR,A[0],A[1],A[2],.04):V.perp(dir);g=V.sub(g,V.mul(dir,V.dot(g,dir)));if(V.len(g)<1e-4)g=V.perp(dir);const nrm=V.norm(g);const side=V.norm(V.cross(dir,nrm));
      const bb=o.boneAt?o.boneAt(A,t):[o.bone,o.bone,1];const ww=w*lerp(1,o.tip===undefined?.5:o.tip,t);const ao=clamp(lerp(o.ao0===undefined?.5:o.ao0,1,Math.min(1,t*2.2))*(.78+.22*rr),0,1);
      sb.push(V.lerp(A,Bp,.5),V.mul(side,ww),V.mul(dir,L*.78),[clamp(sh+t*(o.tipLight===undefined?.2:o.tipLight),0,1),1,o.acc!==undefined?o.acc:t],ao,nrm,lerp(o.h0||0,o.h1===undefined?1:o.h1,t),bb[0],bb[1],Math.round(bb[2]*255),5<<4);}}}
// hair on an ellipsoid scalp: roots over the crown and back of the head (never the face), each lock combed back from a parting and draped
function scalpLocks(sb,PR,r,o){let made=0;
  for(let i=0;i<o.n*6&&made<o.n;i++){const th=r()*TAU,ph=Math.acos(1-2*r()*(o.cover||.62));const d=[Math.cos(th)*Math.sin(ph),Math.cos(ph),Math.sin(th)*Math.sin(ph)];
    if(d[0]>(o.faceX===undefined?.3:o.faceX)&&d[1]<.78)continue;if(d[1]<(o.minY===undefined?-.1:o.minY))continue;made++;
    const root=V.add(o.c,[d[0]*o.r[0]*.97,d[1]*o.r[1]*.97,d[2]*o.r[2]*.97]);const nrm=V.norm([d[0]/o.r[0],d[1]/o.r[1],d[2]/o.r[2]]);
    // combed away from a parting at the top front of the head, along the scalp
    const part=[.45,.85,o.partZ||0];let want=V.sub(d,part);want=V.sub(want,V.mul(nrm,V.dot(want,nrm)));if(V.len(want)<1e-3)want=[-1,0,0];want=V.norm(V.add(V.norm(want),[0,-.25,0]));
    want=V.norm(V.sub(want,V.mul(nrm,V.dot(want,nrm))));const d0=V.norm(V.add(want,V.mul(nrm,o.lift===undefined?.08:o.lift)));
    const L=lerp(o.len[0],o.len[1],r())*(d[0]>.2?(o.fringe||.8):1);const g=drapeGuide(PR,root,d0,L,{seg:o.seg||16,gap:o.gap,wave:o.wave,waveF:o.waveF,stiff:o.stiff,loft:o.loft,hug:o.hug===undefined?.25:o.hug},r);
    hairLock(sb,PR,g,Object.assign({n:o.per,r0:o.r0,r1:o.r1,w:o.w,seg:o.seg||16},o.lock||{}),r);}}
// skin under the hair takes the hair colour: the crown and back of an ellipsoid head, never the face
const scalpReg=(c,R,face=.3)=>(p,reg)=>{if(reg!==7)return reg;const d=[(p[0]-c[0])/R[0],(p[1]-c[1])/R[1],(p[2]-c[2])/R[2]];const l=Math.hypot(d[0],d[1],d[2]);if(l>1.12)return reg;
  const u=d[0]/l,v=d[1]/l;if(v<-.05)return reg;if(u>face&&v<.72)return reg;return 16;};
// ---------- faerie ----------
function faerieDef(){
  const bones=[B_('pelvis',-1,[0,1.75,0]),B_('chest',0,[0,2.4,0]),B_('head',1,[0,2.95,0]),B_('uaL',1,[0,2.68,.28]),B_('faL',3,[0,2.3,.52]),B_('uaR',1,[0,2.68,-.28]),B_('faR',5,[0,2.3,-.52]),
    B_('thL',0,[0,1.62,.13]),B_('shL',7,[0,.92,.14]),B_('thR',0,[0,1.62,-.13]),B_('shR',9,[0,.92,-.14])];
  const P=[E_([0,1.74,0],[.16,.18,.2],0,8,.1),E_([0,2.06,0],[.15,.25,.18],1,8,.12),E_([.01,2.4,0],[.18,.24,.23],1,8,.14),
    C_([0,2.0,0],[0,1.5,0],.17,.31,0,8,.05,{pri:.01}),
    C_([0,2.6,0],[0,2.88,0],.07,.058,2,7,.06),E_([-.01,3.13,0],[.25,.28,.23],2,7,.1),E_([.08,3.0,0],[.17,.19,.16],2,7,.1),C_([.2,3.08,0],[.25,3.02,0],.03,.02,2,7,.03),
    E_([.17,2.94,0],[.05,.03,.06],2,13,.02,{pri:.01})];
  // arms are modelled held away from the body so they never fuse with the chest or skirt; the pose brings them in (ARM_A)
  const L=[C_([0,2.66,.27],[0,2.3,.52],.055,.045,3,7,.05),C_([0,2.29,.53],[0,1.94,.75],.043,.034,4,7,.03),E_([.01,1.88,.79],[.045,.06,.04],4,7,.03),
    C_([-.02,3.1,.21],[-.12,3.32,.34],.05,.008,2,7,.04),
    C_([0,1.62,.12],[0,.95,.13],.09,.055,7,7,.08,{sig:.025}),C_([0,.93,.13],[0,.16,.13],.05,.034,8,7,.04,{sig:.03}),E_([.06,.07,.13],[.12,.045,.05],8,7,.04)];
  P.push(...L,...mirror(L,{3:5,4:6,7:9,8:10}));
  return{name:'faerie',prims:P,bones,cell:.032,sigma:.08,aoR:.12,regf:scalpReg([-.01,3.13,0],[.25,.28,.23],.32),
    eyes:[{c:[.185,3.125,.098],r:.07,dir:[1,.06,.42],bone:2},{c:[.185,3.125,-.098],r:.07,dir:[1,.06,-.42],bone:2}],
    colf:(p,reg)=>[.5,0,p[1]>2.9&&p[0]>.1&&Math.abs(p[2])>.06?.9:0]};}
function faerieCoat(mb,def,o={}){const sb=new SB(6000);const r=rng(o.seed||11);const PR=prepPrims(def.prims);const K=Math.max(COATK,.6);
  // layered petal skirt: three rings of petals hanging from the waist, flaring out
  for(let ring=0;ring<3;ring++){const y=2.0-ring*.17,R0=.18+ring*.05,n=16+ring*4;for(let i=0;i<n;i++){const a=i/n*TAU+ring*.4+r()*.15;const out=[Math.cos(a),0,Math.sin(a)];
    const dir=V.norm(V.add(V.mul(out,.42+ring*.12),[0,-1,0]));const L=.34+ring*.06+r()*.06;const base=[out[0]*R0,y,out[2]*R0];const n_=V.norm(V.add(out,[0,.3,0]));
    sb.push(V.madd(base,dir,L*.5),V.mul(V.norm(V.cross(dir,n_)),.11+ring*.02),V.mul(dir,L*.5),[.55+.35*r(),0,0,1],1,n_,.15,0,0,255,(3<<4));}}
  // bodice petals
  for(let i=0;i<14;i++){const a=i/14*TAU;const out=[Math.cos(a)*.9,0,Math.sin(a)];const p=[out[0]*.17,2.3+(i%2)*.1,out[2]*.2];const d=V.norm([0,1,0]);
    sb.push(p,V.mul(V.norm(V.cross(d,out)),.07),V.mul(d,.12),[.6+.3*r(),0,0,1],1,out,0,1,1,255,(3<<4));}
  // flower crown
  if(!o.short)for(let i=0;i<9;i++){const a=PI*.15+i/8*PI*1.1;const p=[-.02+Math.cos(a)*.24,3.33+Math.sin(i*1.7)*.02,Math.sin(a)*.22*(a>PI?1:1)];
    sb.push(p,[.05,0,0],[0,.05,0],[.8,0,1,1],1,[0,1,0],0,2,2,255,(4<<4));}
  scalpLocks(sb,PR,r,{c:[-.01,3.13,0],r:[.25,.28,.23],n:Math.round((o.short?60:85)*K),per:o.short?9:14,len:o.short?[.3,.5]:[.9,1.35],r0:.05,r1:.03,w:.013,seg:o.short?8:16,gap:.02,wave:o.short?.01:.045,waveF:1.4,stiff:.45,lift:.06,
    lock:{bone:2,boneAt:(p,t)=>t<.25||o.short?[2,2,1]:[2,1,1-Math.min(1,(t-.25)/.6)*.6],h0:.05,h1:.8,ao0:.5,frizz:.004,gap:.02,taper:.3}});
  return sb;}
// wing outline meshes (quad strip around an outline), type 0 dragonfly (4 narrow wings), 1 butterfly, 2 moth
function genWing(type,hind){const mb=new MB();const nu=18,nv=8;
  const shape=(u,v)=>{// u along span 0..1, v chord 0..1 -> local xy (x span outward, y chord)
    if(type===0){const L=hind?1.45:1.6,C=hind?.34:.3;const c=C*(Math.sin(Math.min(u*1.2,1)*PI*.5)*.6+.4)*(1-Math.pow(u,6));return[u*L,(v-.3)*c*2];}
    if(type===1){if(!hind){const L=1.55;const ang=lerp(.35,-.55,v);const rr=L*(.35+.65*Math.sin(Math.min(1,u)*PI*.5))*(1-.15*Math.pow(Math.abs(v-.4),2));return[Math.cos(ang)*rr*u/Math.max(u,.001),Math.sin(ang)*rr*u/Math.max(u,.001)];}
      const L=1.25;const ang=lerp(-.35,-1.4,v);const rr=L*(1-.25*Math.pow(v,2));return[Math.cos(ang)*rr*u,Math.sin(ang)*rr*u];}
    const L=hind?1.1:1.45;const ang=hind?lerp(-.4,-1.3,v):lerp(.3,-.5,v);const rr=L*(1-.2*v*v);return[Math.cos(ang)*rr*u,Math.sin(ang)*rr*u];};
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const u=i/nu,v=j/nv;let xy=shape(u,v);if(type===0&&false)xy=xy;
    const edge=Math.min(1-u,Math.min(v,1-v)*2);mb.v([xy[0],0,-xy[1]],[0,1,0],type===0?[u,v]:[xy[0]/1.6+.1,xy[1]/1.6+.5],[edge*3,v>.9||u>.92?1:0,0,1],[0,0,0,0]);}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i;mb.q(a,a+1,a+nu+2,a+nu+1);}
  return mb;}

// ---------- mermaid ----------
function mermaidDef(){
  const bones=[B_('hips',-1,[0,0,0]),B_('chest',0,[0,1.1,0]),B_('head',1,[0,2.55,0]),B_('uaL',1,[0,1.9,.6]),B_('faL',3,[0,1.2,1.0]),B_('uaR',1,[0,1.9,-.6]),B_('faR',5,[0,1.2,-1.0]),
    B_('t1',0,[0,-.6,0]),B_('t2',7,[0,-1.7,0]),B_('t3',8,[0,-2.8,0]),B_('t4',9,[0,-3.8,0]),B_('t5',10,[0,-4.6,0])];
  const P=[E_([-.04,-.08,0],[.4,.58,.58],0,7,.3),E_([0,.62,0],[.36,.5,.48],1,7,.3),E_([.02,1.25,0],[.4,.54,.56],1,7,.3),
    E_([.3,1.45,.23],[.2,.19,.19],1,8,.1,{pri:.01}),E_([.3,1.45,-.23],[.2,.19,.19],1,8,.1,{pri:.01}),
    E_([0,1.78,.4],[.2,.16,.2],1,7,.18),E_([0,1.78,-.4],[.2,.16,.2],1,7,.18),
    C_([0,1.72,0],[0,2.24,0],.16,.135,2,7,.1),E_([-.02,2.63,0],[.39,.45,.35],2,7,.15),E_([.12,2.46,0],[.29,.31,.26],2,7,.14),C_([.35,2.56,0],[.41,2.47,0],.05,.035,2,7,.05),
    E_([.33,2.36,0],[.06,.035,.11],2,13,.03,{pri:.01}),E_([-.02,2.56,.34],[.06,.1,.04],2,7,.05),E_([-.02,2.56,-.34],[.06,.1,.04],2,7,.05),
    C_([0,-.25,0],[0,-1.7,0],.6,.5,7,4,.45,{pri:.04}),C_([0,-1.7,0],[0,-2.8,0],.5,.37,8,4,.4,{pri:.04}),C_([0,-2.8,0],[0,-3.8,0],.37,.25,9,4,.3,{pri:.04}),
    C_([0,-3.8,0],[0,-4.65,0],.25,.13,10,4,.22,{pri:.04}),C_([0,-4.6,0],[0,-5.0,0],.13,.09,11,4,.15,{pri:.04})];
  // arms are modelled held away from the body (so the hands never fuse with the hips); the pose brings them in
  const L=[C_([0,1.85,.6],[0,1.2,1.0],.12,.1,3,7,.1),C_([0,1.18,1.01],[0,.6,1.36],.095,.07,4,7,.06),E_([.02,.47,1.44],[.09,.13,.07],4,7,.05)];
  P.push(...L,...mirror(L,{3:5,4:6}));
  return{name:'mermaid',prims:P,bones,cell:.055,sigma:.2,aoR:.25,regf:(p,reg)=>{if(reg===7&&p[1]<-.12&&Math.abs(p[0])<.7)return 4;return scalpReg([-.02,2.63,0],[.39,.45,.35],.12)(p,reg);},
    eyes:[{c:[.31,2.67,.15],r:.078,dir:[1,.05,.38],bone:2},{c:[.31,2.67,-.15],r:.078,dir:[1,.05,-.38],bone:2}],
    uvf:(p,reg)=>reg===4?[Math.atan2(p[2],p[0])/TAU*1.5+.5,-p[1]*.36]:reg===12?[Math.atan2(p[2],-p[1]-4.6)/1.4+.5,Math.hypot(p[2],p[1]+4.7)/1.4]:[p[0],p[1]],
    colf:(p,reg)=>reg===4?[.5,clamp((-p[1]-.3)/4.5,0,1),clamp(.5+.5*Math.sin(p[1]*2.),0,1)]:[.5,0,p[1]>2.3&&p[0]>.15&&Math.abs(p[2])>.08?.9:0],
    extra:[mb=>mermaidFins(mb)]};}
// fins as thin membranes (the aquarium's fish fins): a wide two-lobed fluke whose rays fan out from the tail tip, and a pair of
// long frilled fins at the hips. aUV.x = ray coordinate, aCol.b = 0 at the root .. 1 at the free edge (drives flutter and fade).
function mermaidFins(mb){
  const fan=(base,ax,sd,R,phiMax,bone0,bone1,nu,nv,cup,bend)=>{const st=mb.n;
    for(let j=0;j<=nv;j++){const v=j/nv*2-1;const ph=v*phiMax;const rr=R(Math.abs(v));const dir=V.norm(V.add(V.mul(ax,Math.cos(ph)),V.mul(sd,Math.sin(ph))));const nrm=V.norm(V.cross(ax,sd));
      for(let i=0;i<=nu;i++){const u=.04+.96*i/nu;let p=V.madd(base,dir,rr*u);p=V.madd(p,nrm,cup*u*u*(.4+Math.abs(v))+Math.sin(v*PI*1.5)*bend*u*u);
        const e=clamp(u*1.05,0,1);const bw=bone0===bone1?[bone0,bone0,1]:[bone0,bone1,clamp(1-u*1.6,0,1)];
        mb.v(p,nrm,[v*phiMax*3.,u],[.5,u,e,1],[bw[0],bw[1],bw[2],12]);}}
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=st+j*(nu+1)+i;mb.q(a,a+1,a+nu+2,a+nu+1);}};
  // fluke: rays fan across the left-right plane from the end of the tail, short at the central notch, long at the lobe tips
  const tipLen=a=>{const s=sstep(0,.86,a);return a<.93?lerp(.55,1.8,Math.pow(s,1.15)):1.8*Math.sqrt(Math.max(0,1-(a-.93)/.07))+.05;};
  fan([0,-4.92,0],[0,-1,0],[0,0,1],tipLen,1.36,11,11,10,44,.06,.0);
  // hip fins: drooping frills either side where the scales begin
  for(const sg of[1,-1]){const R=a=>lerp(1.25,.35,Math.pow(a,1.6))*(a>.9?Math.sqrt(Math.max(0,1-(a-.9)/.1)):1)+.02;
    fan([-.08,-.5,sg*.5],V.norm([-.25,-1,sg*.35]),V.norm([-.9,.2,sg*.15]),a=>R(Math.abs(a)),.62,7,7,8,18,-.05,.03);}}
function mermaidCoat(mb,def,o={}){const sb=new SB(30000);const r=rng(o.seed||13);const PR=prepPrims(def.prims);const K=Math.max(COATK,.6);
  // long wavy hair: down her back and over the shoulders, in loose curls
  scalpLocks(sb,PR,r,{c:[-.02,2.63,0],r:[.39,.45,.35],faceX:.12,partZ:.12,n:Math.round(80*K),per:26,len:[2.6,3.6],r0:.075,r1:.055,w:.014,seg:22,gap:.025,wave:.1,waveF:2.6,stiff:.5,lift:.04,loft:.05,fringe:.75,
    lock:{boneAt:(p,t)=>t<.18?[2,2,1]:[2,1,1-Math.min(1,(t-.18)/.5)*.65],h0:.08,h1:1,ao0:.45,frizz:.006,gap:.04,taper:.35,stray:.05}});
  return sb;}
// ---------- dragon hatchling ----------
// after the concept: a chunky baby dragon with a big rounded head, large slit-pupil eyes, ridged horns swept back, cheek frills,
// an S-neck with pale throat plates, heavy haunches, clawed hands, a row of pale spines and a long thick tail
function dragonDef(){
  const bones=[B_('body',-1,[0,1.6,0]),B_('pelvis',0,[-1.1,1.6,0]),B_('chest',0,[1.0,1.65,0]),B_('neck1',2,[1.75,1.95,0]),B_('neck2',3,[2.4,2.55,0]),B_('head',4,[2.9,3.0,0]),B_('jaw',5,[3.1,2.8,0]),
    B_('tail1',1,[-1.9,1.55,0]),B_('tail2',7,[-2.9,1.35,0]),B_('tail3',8,[-3.9,1.1,0]),B_('tail4',9,[-4.8,.9,0]),B_('tail5',10,[-5.6,.75,0]),
    B_('FLu',2,[1.1,1.38,.5]),B_('FLl',12,[1.15,.78,.85]),B_('FRu',2,[1.1,1.38,-.5]),B_('FRl',14,[1.15,.78,-.85]),B_('HLu',1,[-1.2,1.35,.48]),B_('HLl',16,[-1.08,.78,.85]),B_('HRu',1,[-1.2,1.35,-.48]),B_('HRl',18,[-1.08,.78,-.85]),
    B_('wL1',2,[.55,2.1,.42]),B_('wL2',20,[.16,2.43,2.15]),B_('wR1',2,[.55,2.1,-.42]),B_('wR2',22,[.16,2.43,-2.15])];
  const P=[
    // torso: barrel, chest, hips, pale belly and chest plates
    E_([0,1.64,0],[1.35,.66,.66],0,4,.4),E_([.95,1.72,0],[.78,.74,.66],2,4,.38),E_([-1.05,1.6,0],[.8,.6,.6],1,4,.35),
    E_([.1,1.27,0],[1.42,.4,.52],0,5,.3,{pri:.02}),E_([1.12,1.42,0],[.6,.46,.46],2,5,.25,{pri:.02}),
    // neck: a thick S with throat plates on its underside
    C_([1.3,1.85,0],[1.9,2.2,0],.52,.43,3,4,.3),C_([1.9,2.2,0],[2.45,2.72,0],.43,.36,4,4,.24),
    C_([1.55,1.66,0],[2.05,2.0,0],.33,.29,3,5,.2,{pri:.015}),C_([2.05,2.0,0],[2.62,2.52,0],.29,.25,4,5,.18,{pri:.015}),
    // head: big rounded cranium, short thick snout, pale jaw, nostrils
    E_([2.95,3.08,0],[.64,.56,.52],5,4,.22),C_([3.2,2.98,0],[3.95,2.86,0],.37,.25,5,4,.16),E_([3.98,2.88,0],[.23,.21,.23],5,4,.1),
    C_([3.0,2.72,0],[3.86,2.68,0],.27,.15,6,5,.1,{pri:.01}),
    E_([4.12,2.96,.1],[.045,.04,.045],5,4,.03,{op:'s'}),E_([4.12,2.96,-.1],[.045,.04,.045],5,4,.03,{op:'s'}),
    // tail: thick at the root, tapering to a fine tip
    C_([-1.6,1.55,0],[-2.9,1.35,0],.5,.36,7,4,.28),C_([-2.9,1.35,0],[-3.9,1.1,0],.36,.25,8,4,.18),C_([-3.9,1.1,0],[-4.8,.9,0],.25,.16,9,4,.12),
    C_([-4.8,.9,0],[-5.6,.75,0],.16,.09,10,4,.08),C_([-5.6,.75,0],[-6.25,.66,0],.09,.03,11,4,.05)];
  // spines down the middle of the back and tail, tallest over the shoulders
  const topY=x=>x>2.0?lerp(3.0,2.55,clamp((2.45-x)/.5,0,1)):x>1.0?lerp(2.55,2.32,(2.0-x)):x>-1.6?2.28-(1.0-x)*.04:lerp(2.12,.75,clamp((-1.6-x)/4.6,0,1));
  const bAt=x=>x>1.95?4:x>1.2?3:x>-1.0?0:x>-1.9?1:x>-2.9?7:x>-3.9?8:x>-4.8?9:10;
  for(let i=0;i<19;i++){const t=i/18;const x=lerp(2.25,-5.7,t);const y=topY(x);const h=t<.25?lerp(.24,.36,t/.25):lerp(.36,.07,(t-.25)/.75);P.push(C_([x,y-.1,0],[x-.16,y+h,0],h*.32+.025,.008,bAt(x),9,.04,{pri:.02}));}
  const L=[
    // front leg: shoulder, upper arm, forearm, hand, four claws
    E_([1.05,1.36,.5],[.44,.46,.32],12,4,.15),C_([1.1,1.4,.55],[1.15,.82,.84],.27,.19,12,4,.12),C_([1.15,.8,.85],[1.27,.18,.88],.18,.13,13,4,.08),E_([1.42,.1,.9],[.3,.085,.21],13,4,.06),
    C_([1.62,.1,1.0],[1.86,.03,1.07],.05,.012,13,9,.02,{pri:.02}),C_([1.67,.1,.92],[1.92,.03,.94],.05,.012,13,9,.02,{pri:.02}),C_([1.64,.1,.83],[1.88,.03,.8],.05,.012,13,9,.02,{pri:.02}),C_([1.55,.1,.75],[1.75,.03,.69],.045,.012,13,9,.02,{pri:.02}),
    // hind leg: heavy haunch, shin, long foot, claws
    E_([-1.12,1.28,.52],[.6,.52,.36],16,4,.2),C_([-1.15,1.3,.55],[-1.05,.8,.86],.27,.17,16,4,.12),C_([-1.05,.8,.86],[-1.2,.14,.88],.16,.11,17,4,.08),E_([-.98,.08,.92],[.32,.08,.19],17,4,.05),
    C_([-.76,.08,1.0],[-.52,.03,1.06],.045,.012,17,9,.02,{pri:.02}),C_([-.72,.08,.92],[-.46,.03,.93],.045,.012,17,9,.02,{pri:.02}),C_([-.75,.08,.83],[-.5,.03,.8],.045,.012,17,9,.02,{pri:.02}),
    // ridged horns sweeping back from the brow
    C_([2.86,3.46,.27],[2.6,3.74,.4],.12,.095,5,9,.05,{pri:.02}),C_([2.6,3.74,.4],[2.22,3.82,.48],.095,.065,5,9,.04,{pri:.02}),C_([2.22,3.82,.48],[1.98,3.62,.52],.065,.02,5,9,.03,{pri:.02}),
    // brow ridge, cheek, cheek frill spikes, little spikes behind the skull
    E_([3.3,3.3,.26],[.34,.11,.14],5,4,.08),E_([3.1,2.92,.24],[.42,.34,.3],5,4,.15),
    C_([2.72,2.95,.42],[2.4,2.84,.64],.065,.01,5,9,.03,{pri:.02}),C_([2.76,3.13,.44],[2.44,3.22,.66],.06,.01,5,9,.03,{pri:.02}),C_([2.88,2.8,.38],[2.62,2.62,.56],.05,.01,5,9,.03,{pri:.02}),
    C_([2.55,3.45,.18],[2.3,3.6,.24],.05,.008,5,9,.03,{pri:.02})];
  P.push(...L,...mirror(L,{12:14,13:15,16:18,17:19}));
  return{name:'dragon',prims:P,bones,cell:.052,sigma:.18,aoR:.22,
    eyes:[{c:[3.33,3.14,.37],r:.17,dir:[.55,.18,1],bone:5},{c:[3.33,3.14,-.37],r:.17,dir:[.55,.18,-1],bone:5}],
    uvf:(p,reg)=>reg===5?[p[2],p[0]*.5]:[p[0]*.42,Math.atan2(p[2],p[1]-1.4)/TAU*1.2+.5],
    colf:(p,reg)=>[.5+.3*noise3(p[0]*2,p[1]*2,p[2]*2),clamp((1.45-p[1])/1.1,0,1)*.45,clamp(.5+.5*noise3(p[0],p[1],p[2]),0,1)],
    extra:[mb=>dragonWings(mb)]};}
// membrane wings: leading edge (shoulder, elbow, wrist), three fingers, scalloped trailing edge, skinned to chest / upper arm / hand
function dragonWings(mb){const WS=1.3,S0=[.55,2.1,.42],sc=v=>V.add(S0,V.mul(V.sub(v,S0),WS));for(const side of[1,-1]){const z=v=>[v[0],v[1],v[2]*side];const S=z(S0),E=z(sc([.25,2.35,1.75])),W=z(sc([.55,2.42,2.9]));
  const tips=[z(sc([-.55,2.38,3.65])),z(sc([-1.35,2.2,3.15])),z(sc([-1.85,2.0,2.2])),z(sc([-1.2,1.98,.5]))];const b1=side>0?20:22,b2=side>0?21:23;
  const outline=[];const seg=(a,b,n,bow)=>{for(let i=0;i<n;i++){const t=i/n;const p=V.lerp(a,b,t);const mid=V.lerp(W,S,.55);if(bow)outline.push(V.lerp(p,mid,Math.sin(t*PI)*bow));else outline.push(p);}};
  seg(S,E,6,0);seg(E,W,5,0);seg(W,tips[0],4,0);seg(tips[0],tips[1],6,.16);seg(tips[1],tips[2],6,.17);seg(tips[2],tips[3],7,.2);seg(tips[3],S,4,0);
  const ctr=V.lerp(V.lerp(S,W,.5),tips[2],.3);const base=mb.n;const wfor=p=>{const d1=V.dist(p,S),d2=V.dist(p,E),d3=V.dist(p,W);
    const t=clamp((V.dot(V.sub(p,S),V.norm(V.sub(W,S)))/V.dist(S,W)),0,1);if(t<.35)return[2,b1,1-t/.35];return[b1,b2,clamp(1-(t-.35)/.4,0,1)];};
  const nrm=[0,side,0];const add=(p,edge)=>{const w=wfor(p);return mb.v(p,nrm,[(p[0]+2)/4,(p[2]*side)/4],[.5,1,0,1],[w[0],w[1],w[2],6]);};
  const c=add(ctr);const ids=outline.map(p=>add(p));for(let i=0;i<ids.length;i++){const a=ids[i],b=ids[(i+1)%ids.length];mb.t(c,a,b);}
  // midpoints ring for smoother shading
  // finger bones along the edges
  const bone=(a,b,r0,r1,bb)=>{const pts=[];for(let i=0;i<=5;i++)pts.push(V.lerp(a,b,i/5));const st=mb.n;tube(mb,pts,t=>lerp(r0,r1,t),5,{});
    for(let i=st;i<mb.n;i++){const p=[mb.P[i*3],mb.P[i*3+1],mb.P[i*3+2]];const w=bb===undefined?wfor(p):[bb,bb,1];mb.E[i*4]=w[0];mb.E[i*4+1]=w[1];mb.E[i*4+2]=w[2];mb.E[i*4+3]=4;mb.C[i*4]=.5;mb.C[i*4+1]=.0;mb.C[i*4+2]=.5;mb.C[i*4+3]=1;}};
  bone(S,E,.12,.08,b1);bone(E,W,.08,.06,b2);bone(W,tips[0],.05,.015,b2);bone(W,tips[1],.045,.015,b2);bone(W,tips[2],.04,.015,b2);
  const st=mb.n;for(let k=0;k<1;k++){}void st;void base;}}

// ---------- gnome ----------
function gnomeDef(){
  const bones=[B_('pelvis',-1,[0,1.2,0]),B_('chest',0,[0,1.7,0]),B_('head',1,[0,2.3,0]),B_('uaL',1,[0,1.98,.44]),B_('faL',3,[0,1.64,.8]),B_('uaR',1,[0,1.98,-.44]),B_('faR',5,[0,1.64,-.8]),
    B_('thL',0,[0,1.05,.18]),B_('shL',7,[0,.55,.19]),B_('thR',0,[0,1.05,-.18]),B_('shR',9,[0,.55,-.19])];
  const P=[E_([.05,1.48,0],[.5,.6,.5],1,8,.25),E_([0,1.08,0],[.42,.35,.42],0,8,.2),E_([0,1.22,0],[.46,.08,.46],0,9,.05,{pri:.01}),
    E_([.04,2.42,0],[.38,.4,.36],2,7,.15),E_([.42,2.36,0],[.15,.14,.14],2,15,.06,{pri:.01}),E_([0,2.42,.35],[.07,.12,.05],2,7,.05),E_([0,2.42,-.35],[.07,.12,.05],2,7,.05),
    C_([0,2.62,0],[-.42,4.2,0],.45,.03,2,14,.06,{pri:.02}),E_([0,2.66,0],[.46,.12,.46],2,14,.06,{pri:.02})];
  const L=[C_([0,1.95,.44],[0,1.64,.8],.13,.11,3,8,.08),C_([0,1.62,.81],[0,1.32,1.08],.1,.09,4,8,.06),E_([.04,1.25,1.14],[.1,.1,.09],4,7,.05),
    C_([0,1.0,.18],[0,.56,.19],.17,.14,7,8,.08),C_([0,.55,.19],[0,.22,.19],.13,.14,8,1,.06,{pri:.01}),E_([.1,.14,.19],[.26,.14,.14],8,1,.06,{pri:.01})];
  P.push(...L,...mirror(L,{3:5,4:6,7:9,8:10}));
  return{name:'gnome',prims:P,bones,cell:.045,sigma:.14,aoR:.2,
    eyes:[{c:[.33,2.52,.13],r:.05,dir:[1,.1,.3],bone:2},{c:[.33,2.52,-.13],r:.05,dir:[1,.1,-.3],bone:2}],
    colf:(p,reg)=>[.5+.2*noise3(p[0]*3,p[1]*3,p[2]*3),0,p[0]>.25&&p[1]>2.3&&Math.abs(p[2])>.12?.9:0]};}
function gnomeCoat(mb,def,o={}){const sb=new SB(12000);const r=rng(o.seed||17);const PR=prepPrims(def.prims);const K=Math.max(COATK,.6);
  // beard: locks from the cheeks and chin falling over the chest, gathered to a soft point
  for(let i=0;i<Math.round(34*K);i++){const a=(r()-.5)*2.3;const root=[.22+.17*Math.cos(a),2.3-.1*Math.abs(Math.sin(a))+r()*.07,.32*Math.sin(a)];
    const L=(.75+r()*.55)*(1-Math.abs(a)/3);const d0=V.norm([.5,-1,Math.sin(a)*.3]);const g=drapeGuide(PR,root,d0,L,{seg:12,gap:.05,stiff:.35,wave:.05,waveF:1.5},r);
    hairLock(sb,PR,g,{n:16*K,r0:.08,r1:.05,w:.03,seg:12,boneAt:(p,t)=>t<.3?[2,2,1]:[2,1,.6],h0:.05,h1:.45,ao0:.55,frizz:.01,gap:.03,taper:.4},r);}
  // a fringe of hair under the hat
  for(let i=0;i<90;i++){const a=PI*.35+r()*PI*1.3;const root=[-.05+.36*Math.cos(a)*.9,2.55,.36*Math.sin(a)];const pts=[root,V.add(root,[-.05,-.18,Math.sin(a)*.04]),V.add(root,[-.08,-.32,Math.sin(a)*.06])];hairLock(sb,null,pts,{n:2,r0:.02,r1:.02,w:.04,seg:4,bone:2,h0:0,h1:.2,ao0:.6,lockVar:.15},r);}
  return sb;}

// ---------- phoenix ----------
function phoenixDef(){
  const bones=[B_('body',-1,[0,2.4,0]),B_('neck',0,[.6,2.8,0]),B_('head',1,[.95,3.35,0]),B_('tail',0,[-.8,2.2,0]),B_('wL1',0,[.2,2.75,.45]),B_('wL2',4,[-.5,2.8,.6]),B_('wR1',0,[.2,2.75,-.45]),B_('wR2',6,[-.5,2.8,-.6]),B_('legL',0,[.05,1.95,.22]),B_('legR',0,[.05,1.95,-.22])];
  const P=[E_([0,2.4,0],[.82,.58,.52],0,14,.3),E_([.4,2.5,0],[.55,.6,.48],0,14,.3),C_([.55,2.78,0],[.95,3.3,0],.3,.22,1,14,.2),E_([1.0,3.42,0],[.3,.28,.25],2,14,.12),
    C_([1.25,3.44,0],[1.56,3.28,0],.09,.012,2,11,.04,{pri:.02}),C_([-.6,2.3,0],[-1.1,2.15,0],.3,.12,3,14,.15)];
  const L=[C_([.05,1.95,.22],[.08,1.2,.24],.11,.06,8,11,.04),C_([.08,1.2,.24],[.1,.96,.24],.06,.05,8,11,.03),C_([.08,.96,.24],[.42,.9,.34],.045,.015,8,11,.02),C_([.08,.96,.24],[.4,.9,.16],.045,.015,8,11,.02),C_([.08,.96,.24],[-.2,.9,.24],.045,.015,8,11,.02)];
  P.push(...L,...mirror(L,{8:9}));
  return{name:'phoenix',prims:P,bones,cell:.05,sigma:.16,aoR:.2,eyes:[{c:[1.13,3.5,.19],r:.06,dir:[.5,.1,1],bone:2},{c:[1.13,3.5,-.19],r:.06,dir:[.5,.1,-1],bone:2}],colf:(p)=>[.5,0,0]};}
function phoenixCoat(mb,o={}){const sb=new SB(9000);const r=rng(o.seed||23);
  sampleSurface(mb,[14],190*Math.max(COATK,.6),r,(p,n,b0,b1,w0,ao)=>{const f=V.norm([-1,-.15,0]);const t=clamp((1.2-p[0])/2,0,1);furSplat(sb,p,n,f,.17*(.8+.4*r()),.085,[.5+.3*r(),1,t*.5,1],ao,b0,b1,w0,.16,3,0);});
  for(let i=0;i<46;i++){const a=(r()-.5)*1.2;const root=[1.0+.1*Math.cos(a),3.62,.12*Math.sin(a)];const pts=[root];let p=root;for(let k=1;k<=4;k++){p=V.add(p,[-.12,.12-.03*k,Math.sin(a)*.04]);pts.push(p);}strand(sb,pts,.05,s=>[.6,1,.2+s*.4,1],2,2,1,.05,.4,2);}
  for(const side of[1,-1]){const b1=side>0?4:6,b2=side>0?5:7;for(const row of[{n:26,l0:.7,l1:1.2,o:.06,acc:.15},{n:30,l0:1.3,l1:3.1,o:.02,acc:.45}])for(let i=0;i<row.n;i++){const t=i/(row.n-1);const a=V.lerp([.25,2.82,.47*side],[-1.0,2.78,.66*side],t);const L=lerp(row.l0,row.l1,t);const dir=V.norm([-1,-.4+.25*t,0]);
    sb.push(V.madd(V.madd(a,dir,L*.5),[0,0,side],row.o),V.mul([0,.1,side*.15],2.2),V.mul(dir,L*.5),[.5+.3*r(),1,row.acc+t*.5,1],1,[0,0,side],0,t<.5?b1:b2,t<.5?b1:b2,255,3<<4);}}
  for(let i=0;i<16;i++){const a=(i/15-.5)*.6;const pts=[];let p=[-1.0,2.15,a*.3];const L=4.5+r()*2.5;for(let k=0;k<=12;k++){pts.push(p);p=V.add(p,[-L/12*Math.cos(a),-L/12*.18-k*.01,L/12*Math.sin(a)*.6]);}
    strand(sb,pts,.26,s=>[.5+.4*r(),1,.4+s*.6,1],3,3,1,.2,1,3);}
  return sb;}

// ---------- registry: one mesh and one coat per species, colours per individual via uniforms ----------
const CRT={};
// kinds that are not in the starter terrarium are built the first time one is wanted (a pegasus costs about a second)
function ensureAsset(k){if(CRT[k]||k!=='pegasus')return;const def=unicornDef({pegasus:true});const mb=buildCreatureMesh(def);const hi=mb.mesh();const lo=buildCreatureMesh(Object.assign({},def,{cell:def.cell*1.5,name:def.name+' (far)'})).mesh();
  const coat=unicornCoat(mb,def,{pegasus:true,seed:9});CRT[k]={def,lo,mesh:hi,coat:splatGPU(coat),coatN:coat.n,bones:def.bones,mb};}
async function buildCreatureAssets(step,want){const t0=performance.now();step=step||(async()=>{});want=want||{};
  // each body, far body and coat is its own step, so the page can breathe (and repaint the loading screen) between them
  const reg=async(k,label,def,coatF,o,share)=>{const S=share?CRT[share]:null;if(!S)await step(label);const mb=S?S.mb:await buildCreatureMeshStepped(def,step,label);const hi=S?S.mesh:mb.mesh();
    let lo=S?S.lo:hi;if(!S&&mb.I.length>60000){await step(label);lo=(await buildCreatureMeshStepped(Object.assign({},def,{cell:def.cell*1.5,name:def.name+' (far)'}),step,label)).mesh();}
    if(coatF)await step(label);const coat=coatF?coatF(mb,def,o||{}):null;CRT[k]={def,lo,mesh:hi,coat:coat?splatGPU(coat):null,coatN:coat?coat.n:0,bones:def.bones,mb};};
  await reg('unicorn','Brushing the unicorns',unicornDef(),unicornCoat);if(want.pegasus)await reg('pegasus','Preening the pegasus',unicornDef({pegasus:true}),(m,d)=>unicornCoat(m,d,{pegasus:true,seed:9}));
  await reg('foal','Waking the foal',unicornDef(),(m,d)=>unicornCoat(m,d,{foal:true,fluffy:true,seed:5}),null,'unicorn');
  await reg('faerie','Dusting the faeries',faerieDef(),faerieCoat);await reg('faerieS','Dusting the faeries',faerieDef(),(m,d)=>faerieCoat(m,d,{short:true,seed:3}),null,'faerie');
  await reg('mermaid','Combing the mermaid\'s hair',mermaidDef(),mermaidCoat);await reg('dragon','Polishing dragon scales',dragonDef(),null);await reg('gnome','Trimming the gnome\'s beard',gnomeDef(),gnomeCoat);await reg('phoenix','Kindling the phoenix',phoenixDef(),phoenixCoat);
  CRT.wings={};for(const t of[0,1,2])CRT.wings[t]=[genWing(t,false).mesh(),genWing(t,true).mesh()];
  LOG('creature assets',Math.round(performance.now()-t0),'ms');}
