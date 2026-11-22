// ============================================================
//  GEOMETRY GENERATORS (all units in cm)
// ============================================================
const TK={x0:-49.2,x1:49.2,z0:-22.1,z1:22.1,wl:42.5,top:45,gx:50,gz:22.9,gt:0.8};
// Coral attribute layout: col.rgb = morph displacement (xenia pulse, duster and clam retraction), col.a = sway (flex);
// ext = (phase, species, ao, part + 0.9 * t) where t runs 0 at a strand's base to 1 at its tip. Colours come from per-item uniforms (uC1..3, uFl).
const CSP={acro:0,bird:1,monti:2,brain:3,torch:4,hammer:5,zoa:6,shroom:7,leather:8,fan:9,xenia:10,gsp:11,bubble:12,plate:13,bta:14,carpet:15,flower:16,grass:17,halimeda:18,redmacro:19,duster:20,clam:21,sponge:22,disco:23,goni:24,frog:25,candy:26,chalice:27,duncan:28,acan:29,sun:30,kenya:31,elegance:32,scroll:33,clove:34};
const Z4=[0,0,0,0];
// lumpy blob (encrusting bases, coral domes); extF(p,q) gives the ext attribute
function blob(mb,c,S,sub,amp,off,extF,colF){const s=icosphere(sub),b=mb.n;
  for(const p of s.P){const d=1+fbm3(p[0]*1.6+off,p[1]*1.6,p[2]*1.6,3)*amp;const q=[c[0]+p[0]*S[0]*d,c[1]+p[1]*S[1]*d,c[2]+p[2]*S[2]*d];
    mb.v(q,p,[0.5+Math.atan2(p[2],p[0])/TAU,p[1]*0.5+0.5],colF?colF(p,q):Z4,extF(p,q));}
  for(const f of s.F)mb.t(b+f[0],b+f[1],b+f[2]);return b;}
// a thin two-sided ribbon (tentacles, blades, pinnules): 3 or 5 verts across; uv = (across, t)
function leaf(mb,o){const segs=o.segs||10;let p=o.base.slice(),d=V.norm(o.dir);const side=V.norm(o.side);const rows=[];const thin=o.width<0.35;
  for(let i=0;i<=segs;i++){const t=i/segs,w=o.width*o.prof(t);
    let s=V.sub(side,V.mul(d,V.dot(side,d)));if(V.len(s)<1e-4)s=V.perp(d);s=V.norm(s);if(o.twist)s=V.rot(s,d,o.twist*t);
    const up=V.norm(V.cross(s,d));const wv=o.wave?Math.sin(t*o.waveF+o.phase)*o.wave*Math.max(w,0.3):0;
    const fo=o.fold||0,L=V.madd(V.madd(p,s,-w/2),up,wv),R=V.madd(V.madd(p,s,w/2),up,-wv*0.7),M=V.madd(p,up,w*fo);
    const QL=V.madd(V.madd(p,s,-w/4),up,w*fo*0.72+wv*0.35+w*0.035),QR=V.madd(V.madd(p,s,w/4),up,w*fo*0.72-wv*0.25+w*0.035);
    const f=o.flex(p,t),ao=o.ao?o.ao(t):1,e=[o.phase,o.sp,ao,(o.part||1)+0.9*t];
    rows.push((thin?[L,M,R]:[L,QL,M,QR,R]).map((P,k,A)=>{const dd=o.disp?o.disp(t,P):Z4;return mb.v(P,up,[k/(A.length-1),t],[dd[0],dd[1],dd[2],f],e);}));
    if(i<segs){
      if(o.droop){const ax=V.cross(d,[0,-1,0]),al=V.len(ax);if(al>1e-4)d=V.rot(d,V.mul(ax,1/al),o.droop/segs);}
      if(o.curl)d=V.rot(d,s,o.curl/segs);
      p=V.madd(p,d,o.len/segs);}}
  for(let i=0;i<segs;i++){const a=rows[i],b=rows[i+1];for(let k=0;k<a.length-1;k++)mb.q(a[k],a[k+1],b[k+1],b[k]);}}
// smooth curve through a few control points (Catmull-Rom), n+1 samples
function crs(P,n){const out=[],m=P.length-1;for(let i=0;i<=n;i++){const f=i/n*m,k=Math.min(m-1,Math.floor(f)),u=f-k,p0=P[Math.max(0,k-1)],p1=P[k],p2=P[k+1],p3=P[Math.min(m,k+2)];
  out.push([0,1,2].map(c=>0.5*(2*p1[c]+(-p0[c]+p2[c])*u+(2*p0[c]-5*p1[c]+4*p2[c]-p3[c])*u*u+(-p0[c]+3*p1[c]-3*p2[c]+p3[c])*u*u*u)));}return out;}
// a tentacle: a curve from base along dir that droops and sways; returns its points
function tentPts(base,dir,len,segs,droop,r,wob=0.25){const pts=[];let p=base.slice(),d=V.norm(dir);
  for(let i=0;i<=segs;i++){pts.push(p.slice());if(i<segs){d=V.norm(V.add(V.add(d,[0,-droop/segs,0]),[(r()-0.5)*wob/segs*4,0,(r()-0.5)*wob/segs*4]));p=V.madd(p,d,len/segs);}}return pts;}

// ---------- SPS: Acropora (branching, radial corallites, coloured tips) ----------
// photos of A. tenuis and kenti: a dense bush of short upright branches studded with tubular corallites, tips a different colour
function genAcro(seed,thin){const r=rng(seed),mb=new MB(),sp=thin?CSP.bird:CSP.acro;const off=r()*50;
  blob(mb,[0,0.25,0],thin?[2,0.6,1.8]:[2.3,0.55,2.1],3,0.3,off,()=>[0,sp,0.55,0]);
  const maxD=3,sides=thin?6:8;
  const br=(p,d,len,rad,depth)=>{const sl=thin?0.45:0.55,segs=Math.max(3,Math.round(len/sl)),pts=[];let q=p.slice(),dd=V.norm(d);
    for(let i=0;i<=segs;i++){pts.push(q.slice());if(i<segs){dd=V.norm(V.add(dd,[(r()-0.5)*0.28,0.07,(r()-0.5)*0.28]));q=V.madd(q,dd,len/segs);}}
    const ph=r()*TAU,tip=rad*(thin?0.3:0.62);
    tube(mb,pts,t=>lerp(rad,tip,Math.pow(t,0.8)),sides,{vlen:true,cap:true,capH:thin?2.2:0.85,col:()=>Z4,ext:(t,u,pp)=>[ph,sp,0.5+0.5*clamp(pp[1]/9,0,1),1+0.9*t]});
    if(depth<maxD){const nk=thin?2+Math.floor(r()*2):depth<2?2+Math.floor(r()*2.2):1+Math.floor(r()*1.6);
      for(let k=0;k<nk;k++){const ti=Math.floor(segs*(0.3+r()*0.55)),pd=V.norm(V.sub(pts[Math.min(segs,ti+1)],pts[ti]));
        const ax=V.rot(V.perp(pd),pd,r()*TAU);let nd=V.rot(pd,ax,(thin?0.5:0.42)+r()*0.35);nd=V.norm(V.add(nd,[0,0.25,0]));
        br(pts[ti],nd,len*(thin?0.62:0.55)+r()*len*0.2,lerp(rad,tip,ti/segs)*(thin?0.88:0.85),depth+1);}}};
  const n=thin?11+Math.floor(r()*5):11+Math.floor(r()*6);
  for(let k=0;k<n;k++){const a=k/n*TAU+r()*0.5,rr=Math.sqrt(r())*(thin?1.4:2.4),spread=thin?0.45+r()*0.35:0.55+r()*0.6;
    br([Math.cos(a)*rr,0.4,Math.sin(a)*rr],[Math.cos(a)*spread,1,Math.sin(a)*spread],thin?2.6+r()*1.8:3.4+r()*2.4,thin?0.24:0.36+r()*0.07,0);}
  return mb.normals();}
// ---------- Montipora capricornis: whorled plates ----------
function genMonti(seed,spo){const r=rng(seed),mb=new MB(),sp=spo===undefined?CSP.monti:spo;const n=4+Math.floor(r()*3);let a0=r()*TAU;
  blob(mb,[0,0.6,0],[1.4,1.2,1.4],2,0.2,r()*9,()=>[0,sp,0.5,0]);
  for(let k=0;k<n;k++){const y=0.4+k*0.85+r()*0.35,R=3.6-k*0.3+r()*0.9,span=PI*(1.0+r()*0.8),th=0.2,tilt=0.32+r()*0.22,off=r()*50,NA=34,NR=9;
    const P=(u,v,s)=>{const a=a0+u*span;const Re=R*(1+0.12*Math.sin(u*6.5+off)+0.05*Math.sin(u*17+off));const rr=lerp(0.5,Re,v);
      return[Math.cos(a)*rr,y+rr*tilt+0.35*Math.sin(u*8+off)*v*v+0.15*Math.sin(u*19+off*2)*v*v-0.3*v*v*v+s*th*0.5*(1-0.6*v),Math.sin(a)*rr];};
    for(const s of[1,-1]){const b=mb.n;for(let j=0;j<=NR;j++)for(let i=0;i<=NA;i++){const u=i/NA,v=j/NR;mb.v(P(u,v,s),[0,s,0],[u*span*R*0.35,v],Z4,[0,sp,s>0?0.5+0.5*v:0.35+0.3*v,(s>0?1:0)+0.9*v]);}
      for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){const a=b+j*(NA+1)+i;s>0?mb.q(a,a+NA+1,a+NA+2,a+1):mb.q(a,a+1,a+NA+2,a+NA+1);}}
    // rounded growing edge
    {const b=mb.n;for(let i=0;i<=NA;i++){const u=i/NA;for(const s of[1,0,-1]){const q=P(u,1,s*0.9),a=a0+u*span;mb.v(V.madd(q,[Math.cos(a),0,Math.sin(a)],s===0?0.16:0),[0,1,0],[u*span*R*0.35,1],Z4,[0,sp,0.9,1.9]);}}
      for(let i=0;i<NA;i++){const a=b+i*3;mb.q(a,a+3,a+4,a+1);mb.q(a+1,a+4,a+5,a+2);}}
    a0+=span*0.55+r()*1.5;}
  return mb.normals();}
// ---------- brain coral (Platygyra / Favites): a lobed dome; the meanders are drawn in the shader ----------
function genBrain(seed){const r=rng(seed),mb=new MB(),sp=CSP.brain,off=r()*50,R=4.2+r()*1.6;
  const lobes=[];for(let i=0;i<3;i++)lobes.push([V.norm([r()*2-1,0.4+r(),r()*2-1]),0.12+r()*0.15]);
  const s=icosphere(4),b=mb.n;
  for(const p of s.P){let d=1+fbm3(p[0]*1.2+off,p[1]*1.2,p[2]*1.2,3)*0.18;for(const[ld,lh]of lobes){const c=V.dot(p,ld);if(c>0.6)d+=lh*Math.pow((c-0.6)/0.4,1.4);}
    let y=p[1]*0.72;if(y<-0.05)y=-0.05+(y+0.05)*0.15;const q=[p[0]*R*d,(y+0.12)*R*d,p[2]*R*0.92*d];
    mb.v(q,p,[0,0],Z4,[0,sp,0.45+0.55*clamp(p[1]+0.4,0,1),p[1]<-0.1?0:1]);}
  for(const f of s.F)mb.t(b+f[0],b+f[1],b+f[2]);return mb.normals();}
// ---------- Euphyllia: torch (round tips) or hammer (anchor tips) on branching skeleton walls ----------
// photos: a mass of long fleshy tentacles, each ending in a pale ball (torch) or a curled anchor (hammer), over brown branching walls
function genEuphyllia(seed,mode){const hammer=mode===true||mode===1,frog=mode===2;const r=rng(seed),mb=new MB(),sp=frog?CSP.frog:hammer?CSP.hammer:CSP.torch,nh=2+Math.floor(r()*3);
  for(let h=0;h<nh;h++){const a=h/nh*TAU+r()*0.6,rr=h===0?0:1.4+r()*1.2,top=[Math.cos(a)*rr,1.6+r()*1.2,Math.sin(a)*rr];
    tube(mb,crs([[top[0]*0.4,0,top[2]*0.4],[top[0]*0.8,top[1]*0.6,top[2]*0.8],top],6),t=>lerp(0.75,1.05,t),10,{cap:true,col:()=>Z4,ext:()=>[0,sp,0.45,0]});
    const nt=frog?36+Math.floor(r()*12):hammer?58+Math.floor(r()*16):72+Math.floor(r()*24);
    for(let k=0;k<nt;k++){const aa=r()*TAU,rd=Math.sqrt(r())*1.1,base=[top[0]+Math.cos(aa)*rd,top[1]+0.15,top[2]+Math.sin(aa)*rd];
      const out=[Math.cos(aa)*(0.45+rd)+top[0]*0.25,hammer?1.5:1.0,Math.sin(aa)*(0.45+rd)+top[2]*0.25],len=hammer?2.0+r()*1.3:3.6+r()*2.6,ph=r()*TAU;
      const pts=tentPts(base,out,frog?len*0.7:len,hammer?8:frog?8:11,hammer?0.45:frog?0.8:1.2,r,hammer?0.35:0.55);
      const fl=t=>0.15+1.35*Math.pow(t,1.25);
      // torch: slender tentacles that swell into a small rounded tip; hammer: a little thicker, ending in a curved crossbar
      tube(mb,pts,t=>hammer?lerp(0.24,0.2,t):(frog?lerp(0.2,0.15,t):lerp(0.19,0.15,t)+0.05*sstep(0.86,0.95,t)),hammer?7:frog?6:8,{cap:!hammer&&!frog,capH:0.6,col:t=>[0,0,0,fl(t)],ext:t=>[ph,sp,0.55+0.45*t,1+0.85*t]});
      // frogspawn: each tentacle forks at its end into a little cluster of round knobs, like a clump of frog eggs
      if(frog){const e=pts[pts.length-1],td=V.norm(V.sub(e,pts[pts.length-2])),nb=3+Math.floor(r()*3),ic=icosphere(0);
        for(let j=0;j<nb;j++){const dj=V.norm(V.add(V.mul(td,0.8),[(r()-0.5)*1.4,(r()-0.4)*1.2,(r()-0.5)*1.4])),L=0.1+r()*0.18,c=V.madd(e,dj,L);
          const b=mb.n,R=0.16+r()*0.06;for(const q of ic.P)mb.v(V.madd(c,q,R),q,[0,0],[0,0,0,fl(1)],[ph,sp,1,2.5]);for(const f of ic.F)mb.t(b+f[0],b+f[1],b+f[2]);}}
      if(hammer){const e=pts[pts.length-1],td=V.norm(V.sub(e,pts[pts.length-2])),sd=V.norm(V.cross(td,[0.3,1,0.2])),u2=V.cross(sd,td),L=0.45+r()*0.2,cp=[];for(let i=0;i<=8;i++){const s=(i/8-0.5)*2;cp.push(V.madd(V.madd(e,sd,s*L),V.madd(td,u2,-0.6),0.38*(1-s*s)-0.2));}
        tube(mb,cp,t=>0.24*(1-0.25*Math.pow(Math.abs(t-0.5)*2,2)),7,{cap:true,cap0:true,col:()=>[0,0,0,fl(1)],ext:t=>[ph,sp,1,2.5]});}}}
  return mb.normals();}
// ---------- zoanthids: a mat of small colonial polyps, each a column, a patterned oral disc and a skirt of short tentacles ----------
function genZoa(seed){const r=rng(seed),mb=new MB(),sp=CSP.zoa,pts=[];
  blob(mb,[0,0.05,0],[4.6,0.35,3.8],3,0.25,r()*20,()=>[0,sp,0.4,0]);
  for(let t=0;t<1800&&pts.length<72;t++){const x=(r()*2-1)*4.6,z=(r()*2-1)*3.8;if((x/4.6)**2+(z/3.8)**2>1)continue;if(pts.some(p=>Math.hypot(p[0]-x,p[1]-z)<0.9))continue;pts.push([x,z]);}
  for(const[x,z]of pts){const ph=r()*TAU,id=r(),hc=0.3+r()*0.55,ax=V.norm([x*0.1+(r()-0.5)*0.3,1,z*0.1+(r()-0.5)*0.3]),base=[x,0.15,z],top=V.madd(base,ax,hc),Rd=0.46+r()*0.07;
    tube(mb,[base,V.madd(base,ax,hc*0.5),top],t=>lerp(0.3,0.34,t),8,{col:t=>[0,0,0,0.12*t],ext:t=>[ph,sp,0.45+0.4*t,4]});
    const s1=V.perp(ax),s2=V.cross(ax,s1),c=mb.v(V.madd(top,ax,-0.06),ax,[0,id],[0,0,0,0.15],[ph,sp,0.9,3]),N=14;
    for(let i=0;i<=N;i++){const a=i/N*TAU;mb.v(V.madd(top,V.add(V.mul(s1,Math.cos(a)*Rd),V.mul(s2,Math.sin(a)*Rd)),1),ax,[1,id],[0,0,0,0.15],[ph,sp,0.9,3]);}
    for(let i=0;i<N;i++)mb.t(c,c+1+i,c+2+i);
    const nt=26;for(let i=0;i<nt;i++){const a=i/nt*TAU+0.1,out=V.add(V.mul(s1,Math.cos(a)),V.mul(s2,Math.sin(a)));
      leaf(mb,{base:V.madd(top,out,Rd*0.94),dir:V.add(V.mul(out,1),V.mul(ax,0.4+(i%2)*0.3)),side:V.cross(ax,out),len:0.28+r()*0.08,width:0.085,prof:t=>1-t*0.85,segs:2,flex:()=>0.18,phase:ph,sp,part:2,ao:()=>0.95});}}
  return mb.normals();}
// ---------- mushroom corals: 0 Discosoma (smooth, striped), 1 Ricordea (bubbly), 2 Rhodactis (hairy) ----------
function genShroom(seed){const r=rng(seed),mb=new MB(),sp=CSP.shroom,n=4+Math.floor(r()*5);
  for(let k=0;k<n;k++){const a=k/n*TAU+r(),rr=k===0?0:1.6+r()*1.8,R=1.5+r()*1.2,c=[Math.cos(a)*rr,0.3+r()*0.5,Math.sin(a)*rr],tilt=[Math.cos(a)*(0.15+rr*0.08),1,Math.sin(a)*(0.15+rr*0.08)],ph=r()*TAU,off=r()*30,cup=0.12+r()*0.25;
    const up=V.norm(tilt),s1=V.perp(up),s2=V.cross(up,s1);
    tube(mb,[[c[0],0,c[2]],V.madd(c,up,-0.1)],0.55,8,{col:()=>[0,0,0,0.05],ext:()=>[ph,sp,0.45,4]});
    const NA=32,NR=9;for(const s of[1,-1]){const b=mb.n;for(let j=0;j<=NR;j++)for(let i=0;i<=NA;i++){const u=i/NA,v=j/NR,aa=u*TAU,rad=R*v*(1+0.08*Math.sin(aa*3+off));
        const yy=cup*v*v-0.22*v*v*v*v+0.08*Math.sin(aa*5+off)*v*v*v+0.05*Math.sin(aa*11+off*2)*Math.pow(v,6)+0.14*Math.exp(-v*v*40)+s*0.22*(1-v*0.75);const q=V.add(V.add(c,V.mul(up,yy)),V.add(V.mul(s1,Math.cos(aa)*rad),V.mul(s2,Math.sin(aa)*rad)));
        mb.v(q,up,[v,u],[0,0,0,0.12*v],[ph,sp,s>0?0.6+0.4*v:0.4,s>0?3:0]);}
      for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){const q0=b+j*(NA+1)+i;s>0?mb.q(q0,q0+1,q0+NA+2,q0+NA+1):mb.q(q0,q0+NA+1,q0+NA+2,q0+1);}}}
  return mb.normals();}
// ---------- plate coral (Fungia): a free-living oval disc with radial septa, lying on the sand ----------
function genPlate(seed){const r=rng(seed),mb=new MB(),sp=CSP.plate,Rx=5+r()*1.5,Rz=Rx*(0.75+r()*0.15),NA=64,NR=14;
  for(const s of[1,-1]){const b=mb.n;for(let j=0;j<=NR;j++)for(let i=0;i<=NA;i++){const u=i/NA,v=j/NR,a=u*TAU;
      const y=s>0?0.25+1.15*Math.pow(1-v*v,0.75):0.05+0.2*(1-v);mb.v([Math.cos(a)*Rx*v,y,Math.sin(a)*Rz*v],[0,s,0],[v,u],Z4,[0,sp,s>0?0.8:0.3,s>0?3:0]);}
    for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){const q0=b+j*(NA+1)+i;s>0?mb.q(q0,q0+1,q0+NA+2,q0+NA+1):mb.q(q0,q0+NA+1,q0+NA+2,q0+1);}}
  return mb.normals();}
// ---------- bubble coral (Plerogyra): packed grape-like vesicles ----------
function genBubble(seed){const r=rng(seed),mb=new MB(),sp=CSP.bubble,ic=icosphere(2),n=58+Math.floor(r()*20),R=3.6+r()*1.0;
  blob(mb,[0,0.6,0],[R*0.7,1.2,R*0.6],2,0.2,r()*9,()=>[0,sp,0.3,0]);
  for(let k=0;k<n;k++){const u=k*0.618034%1+r()*0.05,v=Math.acos(1-(k+0.5)/n*1.2),a=u*TAU,nrm=[Math.sin(v)*Math.cos(a),Math.cos(v),Math.sin(v)*Math.sin(a)],c=[nrm[0]*R*0.95,0.4+nrm[1]*R*0.82,nrm[2]*R*0.85];
    const t1=V.norm(V.rot(V.perp(nrm),nrm,r()*TAU)),t2=V.cross(nrm,t1),L=0.72+r()*0.25,W=0.6+r()*0.14,Hn=0.6+r()*0.12,ph=r()*TAU,b=mb.n;
    for(const q of ic.P){const p=V.add(c,V.add(V.add(V.mul(t1,q[0]*L),V.mul(t2,q[2]*W)),V.mul(nrm,q[1]*Hn))),cd=[c[0]*0.66,0.4+(c[1]-0.4)*0.66,c[2]*0.66],dz=V.sub(V.madd(cd,V.sub(p,c),0.3),p);mb.v(p,q,[q[0],q[2]],[dz[0],dz[1],dz[2],0.12],[ph,sp,0.6+0.4*clamp(nrm[1],0,1),2]);}
    for(const f of ic.F)mb.t(b+f[0],b+f[1],b+f[2]);}
  return mb.normals();}

// ---------- a fleshy polyp crown: an oral disc (uv.x = 0 at the mouth .. 1 at the rim, uv.y = angle) ringed by short tentacles ----------
function polypCrown(mb,top,ax,R,nt,tl,tw,ph,sp,r,partDisc,partTent,fl,cup=0.35,NA=18,NR=4,lsegs=3,domeK=0.18,sink=null){const s1=V.perp(ax),s2=V.cross(ax,s1),b=mb.n,sk=P=>sink?V.sub(sink,P):[0,0,0];
  for(let j=0;j<=NR;j++){const v=j/NR;for(let i=0;i<=NA;i++){const a=i/NA*TAU,rr=R*v,dome=domeK*R*(1-v*v)-0.08*R*Math.exp(-v*v*30);
    const P0=V.madd(V.madd(top,ax,dome),V.add(V.mul(s1,Math.cos(a)*rr),V.mul(s2,Math.sin(a)*rr)),1),d0=sk(P0);mb.v(P0,ax,[v,i/NA],[d0[0],d0[1],d0[2],fl],[ph,sp,0.9,partDisc]);}}
  for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){const q0=b+j*(NA+1)+i;mb.q(q0,q0+NA+1,q0+NA+2,q0+1);}
  for(let i=0;i<nt;i++){const a=i/nt*TAU+(i%2)*0.08,out=V.add(V.mul(s1,Math.cos(a)),V.mul(s2,Math.sin(a)));
    leaf(mb,{disp:sink?((t,P)=>V.sub(sink,P)):undefined,base:V.madd(top,out,R*0.93),dir:V.add(out,V.mul(ax,cup+(i%2)*0.25)),side:V.cross(ax,out),len:tl*(0.85+r()*0.3),width:tw,prof:t=>1-t*0.6,segs:lsegs,droop:0.25,flex:()=>fl+0.15,phase:ph+a,sp,part:partTent,ao:()=>1});}}
// ---------- candy cane coral (Caulastrea): branching tubes, each capped by one round polyp with a bright centre ----------
function genCandy(seed){const r=rng(seed),mb=new MB(),sp=CSP.candy,n=11+Math.floor(r()*7);
  blob(mb,[0,0.3,0],[1.6,0.6,1.6],2,0.25,r()*9,()=>[0,sp,0.4,0]);
  for(let k=0;k<n;k++){const a=k*2.39996+r()*0.4,rd=Math.sqrt((k+0.5)/n)*1.7,h=1.3+r()*1.6+(1-rd/1.7)*0.9,ph=r()*TAU;
    const tip=[Math.cos(a)*(rd+0.5+h*0.2),h,Math.sin(a)*(rd+0.5+h*0.2)],pts=crs([[Math.cos(a)*rd*0.5,0.2,Math.sin(a)*rd*0.5],[Math.cos(a)*rd,h*0.5,Math.sin(a)*rd],tip],6);
    tube(mb,pts,t=>lerp(0.34,0.42,t),9,{col:t=>[0,0,0,0.05*t],ext:t=>[ph,sp,0.45+0.4*t,0.9*t]});
    const ax=V.norm(V.sub(pts[6],pts[5]));polypCrown(mb,V.madd(tip,ax,0.05),ax,0.68+r()*0.1,0,0,0,ph,sp,r,2,3,0.05);}
  return mb.normals();}
// ---------- Duncan coral: tall slender stalks, each topped with a wide fleshy disc and a ring of tentacles ----------
function genDuncan(seed){const r=rng(seed),mb=new MB(),sp=CSP.duncan,n=5+Math.floor(r()*6);
  blob(mb,[0,0.25,0],[1.3,0.5,1.3],2,0.25,r()*9,()=>[0,sp,0.4,0]);
  for(let k=0;k<n;k++){const a=k*2.39996+r()*0.5,rd=Math.sqrt((k+0.5)/n)*1.6,h=1.4+r()*2.2,ph=r()*TAU;
    const tip=[Math.cos(a)*(rd*1.6+1.0),h,Math.sin(a)*(rd*1.6+1.0)],pts=crs([[Math.cos(a)*rd*0.4,0.2,Math.sin(a)*rd*0.4],[Math.cos(a)*rd,h*0.55,Math.sin(a)*rd],tip],5);
    tube(mb,pts,t=>lerp(0.36,0.4,t)+0.12*sstep(0.75,1,t),8,{col:t=>[0,0,0,0.08*t],ext:t=>[ph,sp,0.45+0.4*t,4+0.9*t]});
    const ax=V.norm(V.sub(pts[5],pts[4]));polypCrown(mb,tip,ax,0.9+r()*0.15,24,0.6,0.22,ph,sp,r,3,2,0.25,0.7);}
  return mb.normals();}
// ---------- Goniopora (flowerpot coral): a dome covered in long fleshy polyps, each ending in a little 24-tentacle flower ----------
function genGoni(seed){const r=rng(seed),mb=new MB(),sp=CSP.goni,R=2.6+r()*0.8;
  blob(mb,[0,0.4,0],[R,R*0.6,R],3,0.12,r()*9,()=>[0,sp,0.35,0]);
  const n=120+Math.floor(r()*30);
  for(let k=0;k<n;k++){const y=1-(k+0.5)/n*0.85,rr=Math.sqrt(1-y*y),a=k*2.39996,p=[Math.cos(a)*rr,y,Math.sin(a)*rr];
    const base=[p[0]*R*0.95,0.4+p[1]*R*0.6*0.95,p[2]*R*0.95],out=V.norm([p[0],p[1]*1.4+0.3,p[2]]),len=1.2+r()*0.9,ph=r()*TAU;
    const pts=tentPts(base,out,len,4,0.25,r,0.4),dg=t=>{const i=Math.min(4,Math.round(t*4));return V.mul(V.sub(base,pts[i]),0.85);};tube(mb,pts,t=>lerp(0.17,0.14,t),5,{col:t=>{const d=dg(t);return[d[0],d[1],d[2],0.1+1.1*t];},ext:t=>[ph,sp,0.5+0.4*t,1+0.9*t]});
    const e=pts[4],ax=V.norm(V.sub(e,pts[3]));polypCrown(mb,e,ax,0.22,12,0.34,0.11,ph,sp,r,3,2,1.2,1.1,8,2,2,0.18,V.madd(base,out,0.15));}
  return mb.normals();}

// ---------- Acan (Micromussa / Acanthastrea): a low mound tiled with big fleshy polyps, each a domed disc in rings of colour ----------
function genAcan(seed){const r=rng(seed),mb=new MB(),sp=CSP.acan,R=2.6+r()*0.9,n=14+Math.floor(r()*10);
  blob(mb,[0,0.2,0],[R*1.05,0.9,R*1.05],2,0.18,r()*9,()=>[0,sp,0.35,0]);
  for(let k=0;k<n;k++){const v=Math.sqrt((k+0.5)/n),a=k*2.39996,x=Math.cos(a)*v*R*0.85,z=Math.sin(a)*v*R*0.85,y=0.2+0.9*Math.sqrt(Math.max(0,1-v*v*0.8));
    const ax=V.norm([x*0.35/R,1,z*0.35/R]),Rd=0.82+r()*0.16;polypCrown(mb,[x,y,z],ax,Rd,0,0,0,r(),sp,r,3,2,0.02,0.35,20,5,1,0.5);}
  return mb.normals();}
// ---------- sun coral (Tubastraea): a cluster of orange cups, each with a ring of yellow tentacles held open to feed ----------
function genSun(seed){const r=rng(seed),mb=new MB(),sp=CSP.sun,n=9+Math.floor(r()*8);
  blob(mb,[0,0.25,0],[1.6,0.55,1.6],2,0.2,r()*9,()=>[0,sp,0.35,0]);
  for(let k=0;k<n;k++){const a=k*2.39996+r()*0.4,rd=Math.sqrt((k+0.5)/n)*1.6,h=0.9+r()*1.1+(1-rd/1.6)*0.6,ph=r()*TAU;
    const tip=[Math.cos(a)*(rd+0.35),h,Math.sin(a)*(rd+0.35)],pts=crs([[Math.cos(a)*rd*0.5,0.2,Math.sin(a)*rd*0.5],tip],4);
    tube(mb,pts,t=>lerp(0.38,0.46,t),9,{col:t=>[0,0,0,0.04*t],ext:t=>[ph,sp,0.45+0.4*t,0.9*t]});
    const ax=V.norm(V.sub(pts[4],pts[3]));polypCrown(mb,V.madd(tip,ax,0.04),ax,0.42,22,0.62,0.14,ph,sp,r,3,2,0.35,0.9,12,2,3);}
  return mb.normals();}
// ---------- Kenya tree (Capnella): a soft trunk that forks into short branches tipped with clusters of tiny polyps ----------
function genKenya(seed){const r=rng(seed),mb=new MB(),sp=CSP.kenya;
  const branch=(p,d,len,rad,lvl)=>{const pts=tentPts(p,d,len,5,-0.15,r,0.35);tube(mb,pts,t=>lerp(rad,rad*0.75,t),lvl>1?6:8,{cap:lvl===3,col:t=>[0,0,0,0.12+0.25*lvl+0.2*t],ext:t=>[0,sp,0.45+0.15*lvl,0.9*t]});
    const e=pts[5],de=V.norm(V.sub(e,pts[4]));
    if(lvl<3){const nk=lvl===0?3+Math.floor(r()*2):2+Math.floor(r()*2);for(let i=0;i<nk;i++){const a=i/nk*TAU+r();const nd=V.norm(V.add(de,[Math.cos(a)*0.8,0.15,Math.sin(a)*0.8]));branch(e,nd,len*(0.55+r()*0.2),rad*0.65,lvl+1);}}
    else{const ic=icosphere(1);for(let j=0;j<4;j++){const c=V.madd(e,V.norm(V.add(de,[(r()-0.5)*1.2,(r()-0.3)*0.8,(r()-0.5)*1.2])),0.15+r()*0.2),R=0.26+r()*0.1,b=mb.n;
        for(const q of ic.P)mb.v(V.madd(c,q,R),q,[0,0],[0,0,0,0.75],[0,sp,0.9,3]);for(const f of ic.F)mb.t(b+f[0],b+f[1],b+f[2]);}}};
  blob(mb,[0,0.2,0],[1.1,0.4,1.1],2,0.2,r()*9,()=>[0,sp,0.35,0]);
  branch([0,0.1,0],[(r()-0.5)*0.3,1,(r()-0.5)*0.3],1.3+r()*0.6,0.6,0);
  return mb.normals();}

// ---------- elegance coral (Catalaphyllia): an oval fleshy disc with a striped centre and a dense crown of long tentacles with swollen tips ----------
function genElegance(seed){const r=rng(seed),mb=new MB(),sp=CSP.elegance,Rx=2.6+r()*0.6,Rz=Rx*0.62,H=1.0;
  tube(mb,[[0,0,0],[0,H*0.6,0],[0,H,0]],[1.2,1.3,1.5],14,{col:()=>Z4,ext:()=>[0,sp,0.4,0]});
  {const NA=28,NR=5,b=mb.n;for(let j=0;j<=NR;j++)for(let i=0;i<=NA;i++){const v=j/NR,a=i/NA*TAU;mb.v([Math.cos(a)*Rx*v,H+0.25*(1-v*v)+0.15*v*Math.sin(a*6),Math.sin(a)*Rz*v],[0,1,0],[v,i/NA],Z4,[0,sp,0.6,3]);}
    for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){const q0=b+j*(NA+1)+i;mb.q(q0,q0+NA+1,q0+NA+2,q0+1);}}
  const n=90+Math.floor(r()*30);
  for(let k=0;k<n;k++){const a=k*2.39996+r()*0.3,v=0.35+0.65*Math.sqrt((k+0.5)/n),base=[Math.cos(a)*Rx*v,H+0.1,Math.sin(a)*Rz*v],out=[Math.cos(a)*(0.3+v*0.9),1,Math.sin(a)*(0.3+v*0.9)*1.3];
    const len=3.4+r()*2.2,ph=r()*TAU,pts=tentPts(base,out,len,10,0.5+v*0.6,r,0.5);
    tube(mb,pts,t=>lerp(0.2,0.17,t)+0.06*sstep(0.8,0.95,t),7,{cap:true,capH:0.7,col:t=>[0,0,0,0.12+1.2*Math.pow(t,1.2)],ext:t=>[ph,sp,0.55+0.45*t,1+0.9*t]});}
  return mb.normals();}
// ---------- scroll coral (Turbinaria): a few broad plates curling up into a vase, the face fuzzy with small extended polyps ----------
function genScroll(seed){const r=rng(seed),mb=new MB(),sp=CSP.scroll,n=2+Math.floor(r()*2);let a0=r()*TAU;
  blob(mb,[0,0.5,0],[1.1,1.0,1.1],2,0.2,r()*9,()=>[0,sp,0.45,0]);
  for(let k=0;k<n;k++){const span=PI*(1.1+r()*0.6),R=3.4+r()*1.0-k*0.4,off=r()*40,NA=36,NR=10,th=0.22,y0=0.5+k*0.9;
    const P=(u,v,s)=>{const a=a0+u*span,rr=lerp(0.6,R*(1+0.08*Math.sin(u*7+off)),v),up=0.9*v*v+0.25*Math.sin(u*5+off)*v*v;
      return[Math.cos(a)*rr,y0+rr*0.25+up*R*0.45+s*th*0.5*(1-0.5*v),Math.sin(a)*rr];};
    for(const s of[1,-1]){const b=mb.n;for(let j=0;j<=NR;j++)for(let i=0;i<=NA;i++){const u=i/NA,v=j/NR;mb.v(P(u,v,s),[0,s,0],[u*span*R*0.35,v],Z4,[0,sp,s>0?0.5+0.5*v:0.35+0.3*v,(s>0?1:0)+0.9*v]);}
      for(let j=0;j<NR;j++)for(let i=0;i<NA;i++){const q=b+j*(NA+1)+i;s>0?mb.q(q,q+NA+1,q+NA+2,q+1):mb.q(q,q+1,q+NA+2,q+NA+1);}}
    {const b=mb.n;for(let i=0;i<=NA;i++){const u=i/NA;for(const s of[1,-1])mb.v(P(u,1,s),[0,1,0],[u*span*R*0.35,1],Z4,[0,sp,0.9,1.9]);}for(let i=0;i<NA;i++){const a=b+i*2;mb.q(a,a+2,a+3,a+1);}}
    a0+=span*0.6+r()*1.2;}
  return mb.normals();}
