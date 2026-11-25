// ---------- 10-util: math, rng, colours, splat builder ----------
const TEST = /[?&]test\b/.test(location.search);
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const v3={
  add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
  sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  sc:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  len:a=>Math.hypot(a[0],a[1],a[2]),
  norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];},
  mad:(a,b,s)=>[a[0]+b[0]*s,a[1]+b[1]*s,a[2]+b[2]*s],
  lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],
};
// rotate vector v around unit axis k by angle a (Rodrigues)
function rotAxis(v,k,a){const c=Math.cos(a),s=Math.sin(a),d=v3.dot(k,v),cr=v3.cross(k,v);
  return[v[0]*c+cr[0]*s+k[0]*d*(1-c),v[1]*c+cr[1]*s+k[1]*d*(1-c),v[2]*c+cr[2]*s+k[2]*d*(1-c)];}
function mulberry(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function hash2(x,y){let h=(x|0)*374761393+(y|0)*668265263;h=(h^(h>>>13))*1274126177;return((h^(h>>>16))>>>0)/4294967296;}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi),b=hash2(xi+1,yi),c=hash2(xi,yi+1),d=hash2(xi+1,yi+1);return lerp(lerp(a,b,u),lerp(c,d,u),v);}
function hex(h){const n=parseInt(h.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];}
function shade(c,k){return[clamp(c[0]*k,0,1),clamp(c[1]*k,0,1),clamp(c[2]*k,0,1)];}
function mix3(a,b,t){return[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];}

// column-major 4x4
const M4={
  ident(){const m=new Float32Array(16);m[0]=m[5]=m[10]=m[15]=1;return m;},
  mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;},
  persp(fov,asp,n,f){const t=1/Math.tan(fov/2),m=new Float32Array(16);m[0]=t/asp;m[5]=t;m[10]=(f+n)/(n-f);m[11]=-1;m[14]=2*f*n/(n-f);return m;},
  look(e,t,up){const z=v3.norm(v3.sub(e,t)),x=v3.norm(v3.cross(up,z)),y=v3.cross(z,x);const m=new Float32Array(16);
    m[0]=x[0];m[4]=x[1];m[8]=x[2];m[1]=y[0];m[5]=y[1];m[9]=y[2];m[2]=z[0];m[6]=z[1];m[10]=z[2];
    m[12]=-v3.dot(x,e);m[13]=-v3.dot(y,e);m[14]=-v3.dot(z,e);m[15]=1;return m;},
  // basis columns X,Y,Z (already scaled if wanted) and translation p
  basis(X,Y,Z,p){const m=new Float32Array(16);m[0]=X[0];m[1]=X[1];m[2]=X[2];m[4]=Y[0];m[5]=Y[1];m[6]=Y[2];m[8]=Z[0];m[9]=Z[1];m[10]=Z[2];m[12]=p[0];m[13]=p[1];m[14]=p[2];m[15]=1;return m;},
  trans(x,y,z){const m=M4.ident();m[12]=x;m[13]=y;m[14]=z;return m;},
  rotX(a){const m=M4.ident(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;},
  rotY(a){const m=M4.ident(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;},
  rotZ(a){const m=M4.ident(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;},
  scale(s){const m=M4.ident();m[0]=m[5]=m[10]=s;return m;},
  apply(m,p){return[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];},
};

// ---- splat builder: 24 bytes per splat: pos xyz f32, size f32, rgba u8 (a<128 = glossy bead), normal xyz s8 + random s8
class SB{
  constructor(cap=2048){this.n=0;this.alloc(cap);}
  alloc(cap){const old=this.u8;this.cap=cap;this.buf=new ArrayBuffer(cap*24);this.f=new Float32Array(this.buf);this.u8=new Uint8Array(this.buf);this.i8=new Int8Array(this.buf);if(old)this.u8.set(old.subarray(0,this.n*24));}
  add(x,y,z,s,c,nx,ny,nz,gloss,rnd){
    if(this.n>=this.cap)this.alloc(this.cap*2);
    const o=this.n*6,b=o*4;this.f[o]=x;this.f[o+1]=y;this.f[o+2]=z;this.f[o+3]=s;
    this.u8[b+16]=c[0]*255;this.u8[b+17]=c[1]*255;this.u8[b+18]=c[2]*255;this.u8[b+19]=gloss==='stitch'?128:gloss==='emis'?70:gloss?0:255;
    const l=Math.hypot(nx,ny,nz)||1;this.i8[b+20]=nx/l*127;this.i8[b+21]=ny/l*127;this.i8[b+22]=nz/l*127;
    this.i8[b+23]=(rnd===undefined?Math.random():rnd)*254-127;this.n++;
  }
  data(){return this.u8.subarray(0,this.n*24);}
}
