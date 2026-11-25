// ---------- 20-render: WebGL2 splat renderer, MSAA + alpha-to-coverage, tilt-shift post ----------
const canvas=document.getElementById('c');
const gl=canvas.getContext('webgl2',{antialias:false,alpha:false,depth:false,powerPreference:'high-performance',preserveDrawingBuffer:TEST});
if(!gl){document.body.innerHTML='<div style="padding:40px;font:20px sans-serif">This game needs WebGL2.</div>';throw new Error('no webgl2');}

const SPLAT_VS=`#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;
layout(location=1) in vec4 aPS;
layout(location=2) in vec4 aCol;
layout(location=3) in vec4 aNrm;
uniform mat4 uVP,uM;
uniform vec3 uCam,uCamR,uCamU,uSun,uSunCol,uSky,uGround,uTintCol,uBox;
uniform float uBoil,uBoilAmt,uScale,uTime,uTint;
uniform vec2 uFog;
uniform int uMode;
out vec2 vC;out vec3 vCol;out float vRnd;out float vGloss;out float vFog;
float h1(float n){return fract(sin(n)*43758.5453);}
void main(){
  float rnd=aNrm.w*0.5+0.5;
  vec3 wp,n;
  if(uMode==1){
    vec3 p=aPS.xyz;
    p.y-=uTime*(0.7+rnd*0.7);
    p.x+=sin(uTime*0.6+rnd*40.)*0.7;
    p.z+=cos(uTime*0.45+rnd*25.)*0.5;
    p=mod(p-uCam+uBox*0.5,uBox)+uCam-uBox*0.5;
    wp=p;n=normalize(uCam-wp);
  }else{
    wp=(uM*vec4(aPS.xyz,1.)).xyz;
    n=normalize(mat3(uM)*aNrm.xyz);
  }
  float sz=aPS.w*uScale;
  if(uBoilAmt>0.){
    vec3 j=vec3(h1(rnd*91.7+uBoil),h1(rnd*53.1+uBoil*1.37),h1(rnd*27.9+uBoil*0.71))-0.5;
    wp+=j*uBoilAmt*sz;
  }
  vec3 V=uCam-wp;float dist=length(V);V/=dist;
  float ndv=dot(n,V);
  float ndl=dot(n,uSun);
  float wrap=clamp((ndl+0.4)/1.4,0.,1.);
  vec3 amb=mix(uGround,uSky,n.y*0.5+0.5);
  vec3 base=aCol.rgb;
  vec3 c=base*(amb+uSunCol*wrap);
  float rim=pow(1.-clamp(ndv,0.,1.),2.5);
  c+=base*rim*0.3+rim*0.05;
  bool em=aCol.a>0.2&&aCol.a<0.32;
  if(em){float tw=0.65+0.35*sin(uTime*2.6+rnd*37.);c=aCol.rgb*(0.75+0.7*tw)+vec3(0.12)*tw;}
  if(uMode==1)c=vec3(1.,.99,.97);
  c=mix(c,uTintCol,uTint);
  vCol=c;
  vFog=smoothstep(uFog.x,uFog.y,dist);
  vGloss=(aCol.a<0.25||em)?1.:0.;
  vRnd=rnd;
  float ang=rnd*6.2831;float cs=cos(ang),sn=sin(ang);
  float sq=(aCol.a>0.4&&aCol.a<0.6)?0.48:0.7+0.3*h1(rnd*17.3);
  vec2 cc=vec2(aCorner.x,aCorner.y*sq);
  cc=vec2(cs*cc.x-sn*cc.y,sn*cc.x+cs*cc.y);
  if(vGloss>0.5)cc=aCorner;
  vec3 p2=wp+(uCamR*cc.x+uCamU*cc.y)*sz;
  gl_Position=uVP*vec4(p2,1.);
  vC=aCorner;
}`;
const SPLAT_FS=`#version 300 es
precision highp float;
in vec2 vC;in vec3 vCol;in float vRnd;in float vGloss;in float vFog;
uniform vec3 uFogCol;
out vec4 o;
float h2(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  float d2=dot(vC,vC);
  if(d2>1.)discard;
  vec3 c=vCol;float a;
  if(vGloss>0.5){
    float hl=smoothstep(0.38,0.0,length(vC-vec2(-0.32,0.38)));
    c=c*(1.0-0.3*d2)+hl*0.85;
    a=smoothstep(1.0,0.82,d2);
  }else{
    a=exp(-d2*2.4);
    float f=h2(floor(gl_FragCoord.xy)+vRnd*311.7);
    a*=0.72+0.56*f;
    c*=0.94+0.12*f;
    c*=1.0-0.12*d2;
  }
  c=mix(c,uFogCol,vFog);
  o=vec4(c,clamp(a*1.55,0.,1.));
}`;
const FS_VS=`#version 300 es
const vec2 P[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3));
out vec2 vUv;
void main(){vec2 p=P[gl_VertexID];vUv=p*0.5+0.5;gl_Position=vec4(p,0.,1.);}`;
const SKY_FS=`#version 300 es
precision highp float;
in vec2 vUv;uniform vec3 uTop,uHor;uniform float uHorY;out vec4 o;
void main(){float t=smoothstep(uHorY-0.15,uHorY+0.55,vUv.y);vec3 c=mix(uHor,uTop,t);o=vec4(c,1.);}`;
const POST_FS=`#version 300 es
precision highp float;
in vec2 vUv;uniform sampler2D uTex;uniform vec2 uRes;uniform float uFocusY,uBlur;out vec4 o;
float h2(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec3 c=texture(uTex,vUv).rgb;
  if(uBlur>0.){
    float d=abs(vUv.y-uFocusY);
    float r=smoothstep(0.16,0.62,d)*uBlur;
    if(r>0.35){
      vec3 acc=c;
      for(int i=0;i<12;i++){float a=float(i)*2.39996;float rr=sqrt((float(i)+0.5)/12.)*r;acc+=texture(uTex,vUv+vec2(cos(a),sin(a))*rr/uRes).rgb;}
      c=acc/13.;
    }
  }
  c=mix(c,c*vec3(1.04,1.0,0.95),0.6);
  float vig=smoothstep(1.25,0.3,length((vUv-0.5)*vec2(1.1,1.3)));
  c*=mix(0.8,1.0,vig);
  c+=(h2(floor(gl_FragCoord.xy))-0.5)*0.03;
  o=vec4(c,1.);
}`;
const SH_VS=`#version 300 es
layout(location=0) in vec2 aCorner;
uniform mat4 uVP;uniform vec3 uC,uA,uB;out vec2 vC;
void main(){vC=aCorner;gl_Position=uVP*vec4(uC+uA*aCorner.x+uB*aCorner.y,1.);}`;
const SH_FS=`#version 300 es
precision highp float;in vec2 vC;uniform float uAlpha;out vec4 o;
void main(){float d=dot(vC,vC);if(d>1.)discard;float a=(1.-d);o=vec4(0.18,0.2,0.32,a*a*uAlpha);}`;

function compile(vs,fs){
  const mk=(t,s)=>{const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh;};
  const p=gl.createProgram();gl.attachShader(p,mk(gl.VERTEX_SHADER,vs));gl.attachShader(p,mk(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={};const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const info=gl.getActiveUniform(p,i);u[info.name]=gl.getUniformLocation(p,info.name);}
  return{p,u};
}
const R={
  splat:compile(SPLAT_VS,SPLAT_FS),sky:compile(FS_VS,SKY_FS),post:compile(FS_VS,POST_FS),shadow:compile(SH_VS,SH_FS),
  quad:null,emptyVao:gl.createVertexArray(),shVao:null,
  W:0,H:0,samples:Math.min(4,gl.getParameter(gl.MAX_SAMPLES)),
  splatsDrawn:0,draws:0,
};
R.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,R.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
R.shVao=gl.createVertexArray();gl.bindVertexArray(R.shVao);gl.bindBuffer(gl.ARRAY_BUFFER,R.quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.bindVertexArray(null);

// GPU model: VAO + instance buffer
function makeModel(sb,dynamic){
  const vao=gl.createVertexArray(),buf=gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,R.quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  if(dynamic)gl.bufferData(gl.ARRAY_BUFFER,sb.cap*24,gl.DYNAMIC_DRAW);else gl.bufferData(gl.ARRAY_BUFFER,sb.data(),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,24,0);gl.vertexAttribDivisor(1,1);
  gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,4,gl.UNSIGNED_BYTE,true,24,16);gl.vertexAttribDivisor(2,1);
  gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,4,gl.BYTE,true,24,20);gl.vertexAttribDivisor(3,1);
  gl.bindVertexArray(null);
  return{vao,buf,n:sb.n,cap:sb.cap};
}
function updateModel(m,sb){gl.bindBuffer(gl.ARRAY_BUFFER,m.buf);
  if(sb.n>m.cap){gl.bufferData(gl.ARRAY_BUFFER,sb.cap*24,gl.DYNAMIC_DRAW);m.cap=sb.cap;}
  gl.bufferSubData(gl.ARRAY_BUFFER,0,sb.data());m.n=sb.n;}
function freeModel(m){gl.deleteVertexArray(m.vao);gl.deleteBuffer(m.buf);}

function setupTargets(w,h){
  if(R.W===w&&R.H===h)return;R.W=w;R.H=h;
  for(const k of['msFB','resFB'])if(R[k])gl.deleteFramebuffer(R[k]);
  for(const k of['msCol','msDep'])if(R[k])gl.deleteRenderbuffer(R[k]);
  if(R.resTex)gl.deleteTexture(R.resTex);
  R.msFB=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,R.msFB);
  R.msCol=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,R.msCol);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,R.samples,gl.RGBA8,w,h);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,R.msCol);
  R.msDep=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,R.msDep);gl.renderbufferStorageMultisample(gl.RENDERBUFFER,R.samples,gl.DEPTH_COMPONENT24,w,h);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,R.msDep);
  R.resFB=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,R.resFB);
  R.resTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,R.resTex);gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA8,w,h);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,R.resTex,0);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);
}

const LIGHT={sun:v3.norm([0.45,0.8,0.42]),sunCol:[0.52,0.49,0.42],sky:[0.6,0.66,0.78],ground:[0.66,0.64,0.62],
  fog:hex('#e6ebef'),skyTop:hex('#9fc4e2'),skyHor:hex('#eef0ee')};

// begin a splat frame: cam = {vp, eye, right, up}
function beginSplats(cam,time){
  const s=R.splat;gl.useProgram(s.p);
  gl.uniformMatrix4fv(s.u.uVP,false,cam.vp);
  gl.uniform3fv(s.u.uCam,cam.eye);gl.uniform3fv(s.u.uCamR,cam.right);gl.uniform3fv(s.u.uCamU,cam.up);
  gl.uniform3fv(s.u.uSun,LIGHT.sun);gl.uniform3fv(s.u.uSunCol,LIGHT.sunCol);gl.uniform3fv(s.u.uSky,LIGHT.sky);gl.uniform3fv(s.u.uGround,LIGHT.ground);
  gl.uniform3fv(s.u.uFogCol,LIGHT.fog);gl.uniform2f(s.u.uFog,90,230);gl.uniform1f(s.u.uTime,time);
  gl.uniform1i(s.u.uMode,0);gl.uniform1f(s.u.uTint,0);gl.uniform3f(s.u.uTintCol,1,1,1);gl.uniform1f(s.u.uScale,1);
  gl.uniform1f(s.u.uBoil,0);gl.uniform1f(s.u.uBoilAmt,0);
}
const IDENT=M4.ident();
function drawModel(m,M,opt){
  if(!m||!m.n)return;const u=R.splat.u;
  gl.uniformMatrix4fv(u.uM,false,M||IDENT);
  gl.uniform1f(u.uScale,opt&&opt.scale||1);
  gl.uniform1f(u.uBoil,opt&&opt.boil||0);gl.uniform1f(u.uBoilAmt,opt&&opt.boilAmt||0);
  if(opt&&opt.tint){gl.uniform1f(u.uTint,opt.tint);gl.uniform3fv(u.uTintCol,opt.tintCol||[1,1,1]);}
  gl.bindVertexArray(m.vao);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,m.n);
  if(opt&&opt.tint)gl.uniform1f(u.uTint,0);
  R.splatsDrawn+=m.n;R.draws++;
}
