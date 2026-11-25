// ---------- 47-lights: Christmas lights for the night map (emissive bulb splats + additive halo pass) ----------
// A bulb is two splats with the same random byte: an emissive bead in the felt pass and a soft halo in the glow pass,
// so both twinkle together. Halo models are attached to chunk/arch models as m.glow.
const BULB_COLS=[[1,0.2,0.12],[0.15,0.95,0.3],[0.25,0.5,1],[1,0.76,0.15],[1,0.32,0.78],[1,0.52,0.1]];
let LIGHTS_ON=false;
function addBulb(sb,glow,p,col,size,halo){const r=Math.random();sb.add(p[0],p[1],p[2],size||0.085,col,0,0,1,'emis',r);if(glow)glow.add(p[0],p[1],p[2],halo||0.6,col,0,0,1,false,r);}
// a sagging string of bulbs between two points (wire splats + bulbs every `gap` metres)
function lightString(sb,glow,a,b,sag,gap,ci){
  const L=v3.len(v3.sub(b,a));const nW=Math.max(2,Math.round(L/0.1));
  const P=t=>v3.add(v3.lerp(a,b,t),[0,-Math.sin(t*Math.PI)*sag,0]);
  for(let i=0;i<=nW;i++){const p=P(i/nW);sb.add(p[0],p[1],p[2],0.028,[0.12,0.25,0.14],0,1,0);}
  const nB=Math.max(1,Math.round(L/gap));for(let i=0;i<nB;i++){const p=v3.add(P((i+0.5)/nB),[0,-0.07,0]);addBulb(sb,glow,p,BULB_COLS[(ci+i)%BULB_COLS.length]);}
}
// bulbs spiralling up a felt pine (approximate cone of bakeTree)
function treeLights(sb,glow,base,size,seed){
  const rnd=mulberry(seed);const H=size;const turns=3+Math.floor(rnd()*2);const n=Math.round(size*9);const ph=rnd()*6.28;
  for(let i=0;i<n;i++){const t=i/n;const y=H*(0.2+t*0.72);const r=H*0.36*(1-t)*0.92+0.12;const an=ph+t*turns*Math.PI*2;
    addBulb(sb,glow,v3.add(base,[Math.cos(an)*r,y,Math.sin(an)*r]),BULB_COLS[i%BULB_COLS.length],0.09,0.7);}
  addBulb(sb,glow,v3.add(base,[0,H*0.97,0]),[1,0.88,0.4],0.16,1.4); // star bulb on top
}
// ---- halo shader (additive, depth-tested, no depth write)
const GLOW_VS=`#version 300 es
precision highp float;
layout(location=0) in vec2 aCorner;layout(location=1) in vec4 aPS;layout(location=2) in vec4 aCol;layout(location=3) in vec4 aNrm;
uniform mat4 uVP,uM;uniform vec3 uCam,uCamR,uCamU;uniform float uTime,uScale,uGain;uniform vec2 uFog;out vec2 vC;out vec3 vCol;
void main(){float rnd=aNrm.w*0.5+0.5;vec3 wp=(uM*vec4(aPS.xyz,1.)).xyz;float tw=0.65+0.35*sin(uTime*2.6+rnd*37.);
  float dist=length(uCam-wp);float f=1.-smoothstep(uFog.x,uFog.y,dist)*0.85;vCol=aCol.rgb*tw*f*uGain;vC=aCorner;
  gl_Position=uVP*vec4(wp+(uCamR*aCorner.x+uCamU*aCorner.y)*aPS.w*uScale,1.);}`;
const GLOW_FS=`#version 300 es
precision highp float;in vec2 vC;in vec3 vCol;out vec4 o;
void main(){float d2=dot(vC,vC);if(d2>1.)discard;float a=exp(-d2*4.5)*0.42+exp(-d2*30.)*0.55;o=vec4(vCol*a,1.);}`;
const GLOW=compile(GLOW_VS,GLOW_FS);
function beginGlow(cam,time){const u=GLOW.u;gl.useProgram(GLOW.p);gl.uniformMatrix4fv(u.uVP,false,cam.vp);gl.uniform3fv(u.uCam,cam.eye);gl.uniform3fv(u.uCamR,cam.right);gl.uniform3fv(u.uCamU,cam.up);
  gl.uniform1f(u.uTime,time);const fk=LIGHT.fogK||1;gl.uniform2f(u.uFog,85*fk,(Q.ahead+10)*fk);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.depthMask(false);}
function drawGlow(m,M,scale,gain){if(!m||!m.n)return;const u=GLOW.u;gl.uniformMatrix4fv(u.uM,false,M||IDENT);gl.uniform1f(u.uScale,scale||1);gl.uniform1f(u.uGain,gain||1);
  gl.bindVertexArray(m.vao);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,m.n);}
function endGlow(){gl.depthMask(true);gl.disable(gl.BLEND);}
// ---- bulbs on the sled rails (sled local space, front +z)
let sledLights=null;
function buildSledLights(){const sb=new SB(),gw=new SB();let k=0;
  for(const sx of[-0.33,0.33])for(let z=-0.92;z<=0.72;z+=0.17)addBulb(sb,gw,[sx,0.25,z],BULB_COLS[(k++)%BULB_COLS.length],0.045,0.32);
  for(let a=0.3;a<=Math.PI*1.05;a+=0.32){const r=0.22;addBulb(sb,gw,[0,0.14+r-Math.cos(a)*r+0.04,0.9+Math.sin(a)*r+0.03],BULB_COLS[(k++)%BULB_COLS.length],0.045,0.32);}
  const m=makeModel(sb);m.glow=makeModel(gw);return m;}
// ---- bulbs along the cocoa stand awning
function addStandLights(sb,gw){let k=0;for(let x=-0.95;x<=0.96;x+=0.13)addBulb(sb,gw,[x,1.6-Math.abs(Math.sin((x+0.95)/0.26*Math.PI))*0.04,0.66],BULB_COLS[(k++)%BULB_COLS.length],0.04,0.3);
  for(const sx of[-0.75,0.75])for(let y=0.85;y<=1.65;y+=0.14)addBulb(sb,gw,[sx+0.045*Math.sign(sx),y,0.42],BULB_COLS[(k++)%BULB_COLS.length],0.035,0.26);}
