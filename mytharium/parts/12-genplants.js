
// ============================================================
//  PLANTS · painterly Gaussian splats (soft things)
// ============================================================
const SH_SOFT=0,SH_DAUB=1,SH_BLADE=2,SH_PETAL=3,SH_DOT=4;
const F_TRANS=1,F_ANCHOR=2,F_GLOW=4,F_PETAL=8,F_GLOSS=16;
const cs=h=>hex(h); // splat colours are stored as sRGB
const cmix=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const cjit=(c,r,k)=>[clamp(c[0]*(1+(r()-.5)*k),0,1),clamp(c[1]*(1+(r()-.5)*k),0,1),clamp(c[2]*(1+(r()-.5)*k),0,1)];
// one elongated splat from base along dir (a leaf, a blade segment, a petal)
function leaf(sb,base,dir,nrm,len,wid,col,ao,flags,shape,sway){const d=V.norm(dir);let n=V.sub(nrm,V.mul(d,V.dot(nrm,d)));if(V.len(n)<1e-4)n=V.perp(d);n=V.norm(n);const side=V.cross(d,n);
  sb.push(V.madd(base,d,len*.5),V.mul(side,wid),V.mul(d,len*.5),col,ao,n,sway,flags,0,0,shape);}
// blade made of a few segments that curve under their weight
function blade(sb,base,dir,len,wid,col,r,flags,sway,seg=3,droop=.35){let p=base,d=V.norm(dir);const side=V.norm(V.cross(d,[0,1,0]).map((x,i)=>x+(i===1?0:1e-3)));
  for(let i=0;i<seg;i++){const t=i/seg;const L=len/seg;const w=wid*(1-t*.6);const n=V.norm(V.cross(side,d));
    const c=cmix(col[0],col[1],t+(r()-.5)*.2);sb.push(V.madd(p,d,L*.5),V.mul(side,w),V.mul(d,L*.55),c,lerp(.55,1,t),n,sway*(t+.4),flags|F_TRANS,0,0,SH_BLADE);
    p=V.madd(p,d,L);d=V.norm(V.add(d,[0,-droop*(t+.3),0]));}return p;}
// ---------- moss cushion: a dome of fine daubs with sporophyte stalks ----------
function genMossCushion(seed,morph=0){const r=rng(seed);const sb=new SB(6000);const R=2.2+r()*1.4,Hh=R*(.45+r()*.15);
  const pal=[[cs('#3f6d1e'),cs('#8fb33c')],[cs('#2f5a1c'),cs('#6f9b2c')],[cs('#58792a'),cs('#b5c45a')]][morph%3];
  const n=Math.round(R*R*190*COATK);for(let i=0;i<n;i++){const a=r()*TAU,u=Math.sqrt(r());const x=Math.cos(a)*u*R,z=Math.sin(a)*u*R*(.85+.15*Math.cos(a*3));const y=Hh*Math.sqrt(Math.max(0,1-u*u))*(1+.12*noise3(x*.9,z*.9,seed))+.05;
    const nn=V.norm([x/R*.9,1.2,z/R*.9]);const c=cjit(cmix(pal[0],pal[1],clamp(.45+y/Hh*.4+noise3(x*2,z*2,1)*.3,0,1)),r,.18);const s=.13+r()*.09;
    sb.push([x,y,z],V.mul(V.perp(nn),s),V.mul(V.norm(V.cross(nn,V.perp(nn))),s),c,clamp(.55+y/Hh*.5,0,1),nn,.05,F_TRANS,0,0,r()<.5?SH_DAUB:SH_SOFT);}
  const ns=Math.round(R*9);for(let i=0;i<ns;i++){const a=r()*TAU,u=Math.sqrt(r())*.8;const x=Math.cos(a)*u*R,z=Math.sin(a)*u*R;const y=Hh*Math.sqrt(1-u*u);const L=.9+r()*.7;
    const top=blade(sb,[x,y,z],[(r()-.5)*.3,1,(r()-.5)*.3],L,.025,[cs('#7a4a22'),cs('#c08a3a')],r,F_ANCHOR,.6,2,.05);sb.push(top,[.06,0,0],[0,.1,0],cs('#a2612a'),1,[0,1,0],.6,0,0,0,SH_DOT);}
  return{sb,r:R,h:Hh+.6};}
// ---------- grass tuft ----------
function genGrass(seed,morph=0){const r=rng(seed);const sb=new SB(800);const pal=morph===1?[cs('#7a6a3a'),cs('#d8c27a')]:morph===2?[cs('#24481a'),cs('#5f9a33')]:[cs('#2f5a1c'),cs('#8db446')];
  const n=36+Math.floor(r()*30);const H0=morph===1?3.5:4.5;for(let i=0;i<n;i++){const a=r()*TAU,u=r()*.9;const b=[Math.cos(a)*u,0,Math.sin(a)*u];const out=.25+r()*.45;
    blade(sb,b,[Math.cos(a)*out,1,Math.sin(a)*out],H0*(.6+r()*.7),.075+r()*.04,[cjit(pal[0],r,.2),cjit(pal[1],r,.2)],r,F_ANCHOR,1,4,.35);}
  return{sb,r:1.8,h:H0};}
// ---------- clover patch with a few white flower heads ----------
function cloverLeaf(sb,r,base,h,a,s,pal){const top=[base[0],base[1]+h,base[2]];leaf(sb,base,[0,1,0],[1,0,0],h,.025,pal[2],.6,F_TRANS|F_ANCHOR,SH_BLADE,.3);
  for(let k=0;k<3;k++){const aa=a+k*TAU/3;const d=[Math.cos(aa),.15,Math.sin(aa)];const c=cjit(pal[k===1?1:0],r,.15);
    leaf(sb,top,d,[0,1,0],s,s*.55,c,.95,F_TRANS,SH_PETAL,.45);
    // the pale chevron each leaflet carries
    sb.push(V.madd(top,V.norm(d),s*.45),V.mul(V.norm(V.cross(d,[0,1,0])),s*.18),V.mul(V.norm(d),s*.1),cmix(c,[.85,.9,.75],.45),1,[0,1,0],.45,F_TRANS,0,0,SH_SOFT);}}
function genClover(seed,morph=0){const r=rng(seed);const sb=new SB(1500);const pal=[cs('#356f25'),cs('#4c8a30'),cs('#5b7a2c')];const R=2.4;
  const n=40+Math.floor(r()*20);for(let i=0;i<n;i++){const a=r()*TAU,u=Math.sqrt(r())*R;cloverLeaf(sb,r,[Math.cos(a)*u,0,Math.sin(a)*u],.8+r()*1.4,r()*TAU,.32+r()*.14,pal);}
  const nf=morph===1?9:4;for(let i=0;i<nf;i++){const a=r()*TAU,u=Math.sqrt(r())*R*.8;const b=[Math.cos(a)*u,0,Math.sin(a)*u];const h=2.2+r()*1.1;const top=blade(sb,b,[(r()-.5)*.2,1,(r()-.5)*.2],h,.025,[pal[2],pal[1]],r,F_ANCHOR,.5,2,.04);
    for(let k=0;k<26;k++){const d=V.norm([r()-.5,r()-.2,r()-.5]);const c=morph===1?cmix(cs('#f2d7e6'),cs('#c24f86'),r()*.7):cmix(cs('#f4f1e6'),cs('#e8d6c8'),r());
      sb.push(V.madd(top,d,.22),V.mul(V.perp(d),.06),V.mul(d,.09),c,.9,d,.5,F_PETAL,0,0,SH_PETAL);}}
  return{sb,r:R,h:2.5,flowers:nf};}
// ---------- foxglove: rosette, tall spike of speckled bells hanging to one side ----------
function genFoxglove(seed,morph=0){const r=rng(seed);const sb=new SB(3000);const pal=[[cs('#b0478a'),cs('#e7a6cf')],[cs('#f1ece4'),cs('#f8f2ea')],[cs('#d98a48'),cs('#f2c58c')]][morph%3];const leafc=[cs('#3c5f24'),cs('#6b8f3a')];
  for(let i=0;i<14;i++){const a=i*2.4+r()*.3;const d=[Math.cos(a),.25+r()*.25,Math.sin(a)];leaf(sb,[0,.1,0],d,[0,1,0],2.4+r()*1.4,.7+r()*.3,cjit(cmix(leafc[0],leafc[1],r()),r,.15),.75,F_TRANS,SH_PETAL,.25);}
  const H0=10+r()*5;const lean=[(r()-.5)*.15,1,(r()-.5)*.15];let p=[0,.2,0];const pts=[];const N=24;
  for(let i=0;i<=N;i++){pts.push(p);p=V.madd(p,V.norm([lean[0]+Math.sin(i*.4+seed)*.03,1,lean[2]]),H0/N);}
  for(let i=0;i<N;i++){const t=i/N;leaf(sb,pts[i],V.sub(pts[i+1],pts[i]),[1,0,0],H0/N*1.1,.07*(1-t*.5),cmix(leafc[0],cs('#5f7a35'),t),.8,F_ANCHOR,SH_BLADE,.4*t);}
  const face=r()*TAU;for(let i=6;i<N;i++){const t=(i-6)/(N-6);const bp=pts[i];const a=face+(r()-.5)*1.3;const out=[Math.cos(a),0,Math.sin(a)];const size=lerp(.85,.35,t);
    if(t>.85){sb.push(V.madd(bp,out,.15),[.1,0,0],[0,.16,0],cs('#78924a'),.9,out,.6,F_ANCHOR,0,0,SH_DOT);continue;}
    const mouth=V.add(V.madd(bp,out,size*.9),[0,-size*.55,0]);const ax=V.norm(V.sub(mouth,bp));
    for(let k=0;k<7;k++){const ang=k/7*TAU;const side=V.norm(V.cross(ax,out));const up=V.cross(side,ax);const rr=V.add(V.mul(side,Math.cos(ang)),V.mul(up,Math.sin(ang)));
      const c=cjit(cmix(pal[0],pal[1],.3+.5*(Math.sin(ang)*.5+.5)),r,.12);
      sb.push(V.madd(V.madd(bp,ax,size*.55),rr,size*.22),V.mul(V.cross(ax,rr),size*.2),V.mul(ax,size*.5),c,.85,rr,.5,F_TRANS|F_PETAL,0,0,SH_PETAL);}
    // speckled throat
    for(let k=0;k<3;k++)sb.push(V.madd(mouth,[r()-.5,r()-.5,r()-.5],size*.12),[.035,0,0],[0,.035,0],cs('#5a1838'),.8,out,.5,F_PETAL,0,0,SH_DOT);}
  return{sb,r:2.5,h:H0,perch:[pts[N]]};}
// ---------- bluebells: arching stems with pendant bells ----------
function genBluebell(seed,morph=0){const r=rng(seed);const sb=new SB(1600);const pal=morph===1?[cs('#f2eef6'),cs('#dcd2ea')]:[cs('#4b4fb8'),cs('#8a8fe6')];const lc=[cs('#2d5a24'),cs('#5d8a3a')];
  for(let i=0;i<10;i++){const a=r()*TAU;blade(sb,[0,0,0],[Math.cos(a)*.5,1,Math.sin(a)*.5],4+r()*2.5,.16,[lc[0],lc[1]],r,F_ANCHOR,.7,3,.5);}
  const ns=3+Math.floor(r()*3);for(let s=0;s<ns;s++){const a=r()*TAU;const H0=6+r()*3;let p=[Math.cos(a)*.3,0,Math.sin(a)*.3];let d=V.norm([Math.cos(a)*.15,1,Math.sin(a)*.15]);const pts=[p];
    for(let i=0;i<14;i++){const t=i/14;d=V.norm(V.add(d,V.mul([Math.cos(a),0,Math.sin(a)],t>.5?.12:.02)));d=V.norm(V.add(d,[0,t>.55?-.12:0,0]));p=V.madd(p,d,H0/14);pts.push(p);}
    for(let i=0;i<14;i++)leaf(sb,pts[i],V.sub(pts[i+1],pts[i]),[1,0,0],H0/14*1.1,.04,lc[1],.8,F_ANCHOR,SH_BLADE,.7*i/14);
    for(let i=7;i<14;i++){const bp=pts[i];const hang=[0,-1,0];const sz=.32+r()*.08;const side=[Math.cos(a+PI/2),0,Math.sin(a+PI/2)];const cb=V.add(bp,[0,-sz*.7,0]);
      for(let k=0;k<6;k++){const ang=k/6*TAU;const rr=V.add(V.mul(side,Math.cos(ang)),V.mul(V.cross(side,hang),Math.sin(ang)));const c=cjit(cmix(pal[0],pal[1],r()*.6),r,.1);
        sb.push(V.madd(cb,rr,sz*.32),V.mul(V.cross(hang,rr),sz*.24),V.mul(hang,sz*.55),c,.85,rr,.8,F_TRANS|F_PETAL,0,0,SH_PETAL);}}}
  return{sb,r:1.8,h:8};}
// ---------- forget-me-nots ----------
function genForgetMeNot(seed,morph=0){const r=rng(seed);const sb=new SB(2400);const pc=morph===1?cs('#f0a8c8'):cs('#6fa6e8');const lc=[cs('#3a6326'),cs('#6d9645')];
  for(let i=0;i<22;i++){const a=r()*TAU,u=r()*1.6;const base=[Math.cos(a)*u,0,Math.sin(a)*u];const top=blade(sb,base,[(r()-.5)*.6,1,(r()-.5)*.6],2.5+r()*2.5,.035,[lc[0],lc[1]],r,F_ANCHOR,.6,3,.1);
    for(let k=0;k<3;k++)leaf(sb,V.lerp(base,top,.3+k*.2),[Math.cos(a+k*2),.4,Math.sin(a+k*2)],[0,1,0],.9,.28,cjit(lc[0],r,.2),.8,F_TRANS,SH_PETAL,.4);
    const nfl=4+Math.floor(r()*5);for(let f=0;f<nfl;f++){const c=V.add(top,[(r()-.5)*.8,(r()-.3)*.5,(r()-.5)*.8]);const n=V.norm([r()-.5,1.5,r()-.5]);const t1=V.perp(n),t2=V.cross(n,t1);
      for(let k=0;k<5;k++){const ang=k/5*TAU;const d=V.add(V.mul(t1,Math.cos(ang)),V.mul(t2,Math.sin(ang)));sb.push(V.madd(c,d,.09),V.mul(V.cross(n,d),.07),V.mul(d,.08),cjit(pc,r,.15),1,n,.6,F_PETAL,0,0,SH_PETAL);}
      sb.push(V.madd(c,n,.02),[.035,0,0],[0,0,.035],cs('#f5d84a'),1,n,.6,F_PETAL,0,0,SH_DOT);}}
  return{sb,r:2,h:4.5};}
// ---------- fern: arching fronds with alternating pinnae ----------
function genFern(seed,morph=0){const r=rng(seed);const sb=new SB(6000);const lc=morph===1?[cs('#5c7a1e'),cs('#b0c84a')]:[cs('#28531c'),cs('#5e8f35')];
  const nf=6+Math.floor(r()*4);const L0=morph===1?7:11;for(let f=0;f<nf;f++){const a=f/nf*TAU+r()*.4;const L=L0*(.7+r()*.5);const out=[Math.cos(a),0,Math.sin(a)];let p=[0,.2,0];let d=V.norm(V.add(V.mul(out,.45),[0,1,0]));const pts=[p];const N=18;
    for(let i=0;i<N;i++){const t=i/N;d=V.norm(V.add(d,V.add(V.mul(out,.07),[0,-.11*t,0])));p=V.madd(p,d,L/N);pts.push(p);}
    for(let i=0;i<N;i++){const t=i/N;leaf(sb,pts[i],V.sub(pts[i+1],pts[i]),[0,1,0],L/N*1.1,.05*(1-t*.6),cmix(lc[0],cs('#4a5a26'),.4),.7,F_ANCHOR,SH_BLADE,.9*t);
      if(i<2)continue;const tang=V.norm(V.sub(pts[i+1],pts[i]));const side=V.norm(V.cross(tang,[0,1,0]));const up=V.cross(side,tang);const pl=Math.sin(t*PI)*L*.16+.25;
      for(const sgn of[1,-1]){const pd=V.norm(V.add(V.mul(side,sgn),V.mul(tang,.35)));const n=V.norm(V.add(up,V.mul(side,-sgn*.15)));const c=cjit(cmix(lc[0],lc[1],.3+t*.5+(r()-.5)*.2),r,.15);
        // pinna: a row of small lobes
        const nl=3;for(let k=0;k<nl;k++){const q=V.madd(pts[i],pd,pl*(k+.5)/nl);leaf(sb,q,V.add(pd,V.mul(tang,.6)),n,pl/nl*1.4,pl/nl*.45,cjit(c,r,.1),.8,F_TRANS,SH_PETAL,.9*t);}}}}
  return{sb,r:L0*.75,h:L0*.6};}
// ---------- fittonia: low mound of veined leaves ----------
function genFittonia(seed,morph=0){const r=rng(seed);const sb=new SB(1500);const base=morph===1?[cs('#2c4a24'),cs('#d27a96')]:[cs('#2f5228'),cs('#cfe0c0')];
  for(let i=0;i<60;i++){const a=r()*TAU,u=Math.sqrt(r())*2;const p=[Math.cos(a)*u,1.2*Math.sqrt(Math.max(0,1-u*u/4))+.3,Math.sin(a)*u];const d=V.norm([Math.cos(a),.2,Math.sin(a)]);const n=V.norm([Math.cos(a)*.4,1,Math.sin(a)*.4]);
    leaf(sb,p,d,n,.9,.45,cjit(base[0],r,.15),.85,F_TRANS,SH_PETAL,.25);
    for(let k=0;k<3;k++)leaf(sb,V.madd(p,d,.18+k*.22),V.add(d,V.mul(V.cross(d,n),k%2?.5:-.5)),n,.22,.03,base[1],.95,0,SH_BLADE,.25);leaf(sb,V.madd(p,d,.05),d,n,.75,.025,base[1],1,0,SH_BLADE,.25);}
  return{sb,r:2,h:1.6};}
// ---------- sundew: spoon leaves with red tentacles tipped with dew ----------
function genSundew(seed){const r=rng(seed);const sb=new SB(1800);
  for(let i=0;i<12;i++){const a=i/12*TAU+r()*.3;const d=[Math.cos(a),.35,Math.sin(a)];const stem=V.madd([0,.05,0],V.norm(d),.9);leaf(sb,[0,.05,0],d,[0,1,0],.9,.05,cs('#7a8a3a'),.8,0,SH_BLADE,.2);
    const pad=V.madd(stem,V.norm(d),.35);leaf(sb,stem,d,[0,1,0],.7,.3,cs('#a83a2a'),.9,F_TRANS,SH_PETAL,.2);
    for(let k=0;k<14;k++){const q=V.add(pad,[(r()-.5)*.5,.05,(r()-.5)*.5]);const tip=V.add(q,[(r()-.5)*.15,.22+r()*.1,(r()-.5)*.15]);leaf(sb,q,V.sub(tip,q),[1,0,0],.25,.012,cs('#c0302a'),.9,0,SH_BLADE,.2);
      sb.push(tip,[.03,0,0],[0,.03,0],cs('#f0e6e0'),1,[0,1,0],.2,F_GLOSS,0,0,SH_DOT);}}
  return{sb,r:1.4,h:.8};}
// ---------- bonsai foliage pads (splats); the trunk is a mesh from 13-genhard ----------
function foliagePad(sb,r,c,R,pal,flags=F_TRANS){const n=Math.round(R*R*R*55*COATK)+40;for(let i=0;i<n;i++){const d=V.norm([r()-.5,(r()-.35)*.8,r()-.5]);const u=Math.cbrt(r());const p=V.add(c,[d[0]*R*u,d[1]*R*.55*u,d[2]*R*u]);
  const nn=V.norm(V.sub(p,V.add(c,[0,-R*.4,0])));const s=.22+r()*.16;const top=clamp((p[1]-c[1])/R*.6+.5,0,1);const col=cjit(cmix(pal[0],pal[1],top*.8+(r()-.5)*.25),r,.15);
  const t1=V.perp(nn),t2=V.cross(nn,t1);const a=r()*TAU;const tt=V.add(V.mul(t1,Math.cos(a)),V.mul(t2,Math.sin(a)));
  sb.push(p,V.mul(V.cross(nn,tt),s*.55),V.mul(tt,s),col,lerp(.45,1,top)*(.6+.4*u),nn,.15,flags,0,0,SH_PETAL);}}
// ---------- leaf litter for the ground cover ----------
function litterLeaf(sb,r,p,n){const pal=[cs('#6b4a22'),cs('#9a6a2c'),cs('#4e3a20'),cs('#b08a4a')];const a=r()*TAU;const d=[Math.cos(a),0,Math.sin(a)];const s=.35+r()*.35;
  sb.push(V.add(p,[0,.04,0]),V.mul(V.norm(V.cross(n,d)),s*.5),V.mul(d,s),cjit(pick(r,pal),r,.2),.75,n,0,0,0,0,SH_PETAL);}

// eelgrass (vallisneria): long ribbon leaves from the pond bed, drawn as chains of translucent blades that sway
function genEelgrass(seed,morph=0){const r=rng(seed);const sb=new SB(3000);const pal=morph===1?[cs('#5a2a1a'),cs('#b0503a')]:[cs('#1f4a1a'),cs('#6aa040')];const n=26;
  for(let i=0;i<n;i++){const a=r()*TAU,rr=Math.sqrt(r())*1.4;let p=[Math.cos(a)*rr,0,Math.sin(a)*rr];const L=3.2+r()*2.6;const seg=9;const lean=[Math.cos(a)*.18+(r()-.5)*.3,1,Math.sin(a)*.18+(r()-.5)*.3];let d=V.norm(lean);
    const side0=V.norm(V.cross(d,[Math.cos(a+1.3),0,Math.sin(a+1.3)]));
    for(let k=0;k<seg;k++){const t=k/seg;const q=V.madd(p,d,L/seg);const c=cmix(pal[0],pal[1],clamp(t*.8+(r()-.5)*.2,0,1));const side=V.norm(V.cross(d,V.cross(side0,d)));
      sb.push(V.lerp(p,q,.5),V.mul(side0,.09),V.mul(d,L/seg*.62),c,.8+.2*t,V.norm(V.cross(side0,d)),.15+.85*t,F_TRANS,0,0,SH_BLADE);
      d=V.norm(V.add(d,[(r()-.5)*.12+Math.cos(a)*.04,0,(r()-.5)*.12+Math.sin(a)*.04]));p=q;}}
  return{sb,r:2,h:5};}
