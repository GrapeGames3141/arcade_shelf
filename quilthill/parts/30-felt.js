// ---------- 30-felt: felt primitives (shared with Mitten Mountain) ----------
const PAL={
  white:hex('#f7f4ee'),snow:hex('#e9edf2'),snowB:hex('#d6e0ec'),black:hex('#221d22'),pink:hex('#f1a2b4'),blush:hex('#f39aa9'),
  orange:hex('#ee8a2c'),brownD:hex('#5b3a2a'),wood:hex('#b8794a'),woodD:hex('#93593a'),red:hex('#cf4a42'),cream:hex('#f6ecda'),
  green:hex('#4f8a5b'),greenD:hex('#386b49'),sage:hex('#7fa36b'),teal:hex('#3f8f93'),mustard:hex('#e2aa3c'),plum:hex('#80507a'),
  navy:hex('#304468'),lilac:hex('#b19ad0'),sky:hex('#8fbbe0'),
};
// generic ellipsoid surface. rot: optional 3x3 as [X,Y,Z] columns
function ellipsoid(sb,c,r,col,sp,o={}){
  const a=r[0],b=r[1],cc=r[2],p=1.6;
  const area=4*Math.PI*Math.pow((Math.pow(a*b,p)+Math.pow(a*cc,p)+Math.pow(b*cc,p))/3,1/p);
  const n=Math.max(6,Math.round(area/(sp*sp)*(o.dens||1)));
  const ga=Math.PI*(3-Math.sqrt(5));const rot=o.rot;const jit=o.jit===undefined?0.25:o.jit;
  for(let i=0;i<n;i++){
    const y=1-2*(i+0.5)/n,rr=Math.sqrt(1-y*y),th=i*ga;
    let d=[Math.cos(th)*rr,y,Math.sin(th)*rr];
    if(o.half!==undefined&&d[1]<o.half)continue;
    if(o.keep&&!o.keep(d))continue;
    let pp=[d[0]*a,d[1]*b,d[2]*cc],nn=[d[0]/a,d[1]/b,d[2]/cc];
    if(rot){pp=v3.add(v3.add(v3.sc(rot[0],pp[0]),v3.sc(rot[1],pp[1])),v3.sc(rot[2],pp[2]));nn=v3.add(v3.add(v3.sc(rot[0],nn[0]),v3.sc(rot[1],nn[1])),v3.sc(rot[2],nn[2]));}
    nn=v3.norm(nn);
    const j=(Math.random()-0.5)*sp*jit;
    const k=o.colFn?o.colFn(d):col;
    const vary=1+(Math.random()-0.5)*(o.vary===undefined?0.08:o.vary);
    sb.add(c[0]+pp[0]+nn[0]*j,c[1]+pp[1]+nn[1]*j,c[2]+pp[2]+nn[2]*j,sp*(o.sz||1.25)*(0.85+Math.random()*0.3),shade(k,vary),nn[0],nn[1],nn[2],o.gloss);
  }
}
function bead(sb,c,r,col){ // glossy bead eye
  sb.add(c[0],c[1],c[2],r,col||PAL.black,0,0,1,true,0.5);
}
// a few stray fibres around a part to make silhouettes fuzzy
function fuzz(sb,c,r,col,n){for(let i=0;i<n;i++){const d=v3.norm([Math.random()-0.5,Math.random()-0.5,Math.random()-0.5]);const k=1.02+Math.random()*0.12;
  sb.add(c[0]+d[0]*r[0]*k,c[1]+d[1]*r[1]*k,c[2]+d[2]*r[2]*k,0.012+Math.random()*0.014,shade(col,1.05),d[0],d[1],d[2]);}}
function rotFrom(ax,ang){const X=rotAxis([1,0,0],ax,ang),Y=rotAxis([0,1,0],ax,ang),Z=rotAxis([0,0,1],ax,ang);return[X,Y,Z];}
// tube along a polyline
function tube(sb,pts,rad,col,sp,colFn){
  for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];const d=v3.sub(b,a),L=v3.len(d),t=v3.sc(d,1/L);
    let ref=Math.abs(t[1])<0.9?[0,1,0]:[1,0,0];const u=v3.norm(v3.cross(t,ref)),w=v3.cross(t,u);
    const nl=Math.max(1,Math.round(L/sp)),nr=Math.max(5,Math.round(2*Math.PI*rad/sp));
    for(let l=0;l<nl;l++)for(let k=0;k<nr;k++){const f=(l+0.5)/nl,an=(k+(l%2)*0.5)/nr*Math.PI*2;
      const nn=v3.add(v3.sc(u,Math.cos(an)),v3.sc(w,Math.sin(an)));const p=v3.add(v3.lerp(a,b,f),v3.sc(nn,rad));
      const c=colFn?colFn(i+f,an,p):col;sb.add(p[0],p[1],p[2],sp*1.3,shade(c,0.95+Math.random()*0.1),nn[0],nn[1],nn[2]);}}
}

