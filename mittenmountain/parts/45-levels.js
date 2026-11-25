// ---------- 45-levels: difficulty per level, scene themes, finish celebration (cheering + hot cocoa) ----------
// Level N uses theme (N-1)%5. Each finished run unlocks the next level.
const THEMES=[
  {name:'Sunrise',  skyTop:'#9fb4dc',skyHor:'#f8c6a2',fog:'#f4d9c8',sun:[0.55,0.42,0.5],sunCol:[0.74,0.56,0.42],sky:[0.62,0.56,0.62],ground:[0.72,0.62,0.6],
    fogK:1.0,snowMul:0.25,flake:1,disc:{dir:[-0.55,0.05,-0.85],col:'#ffd08a',r:22,glow:'#ffb487'},cloud:'#fbd3c4',mtTint:'#e9b7b0',tintK:0.35,stars:0},
  {name:'Clear Day',skyTop:'#9fc4e2',skyHor:'#eef0ee',fog:'#e6ebef',sun:[0.45,0.8,0.42],sunCol:[0.52,0.49,0.42],sky:[0.6,0.66,0.78],ground:[0.66,0.64,0.62],
    fogK:1.0,snowMul:0.15,flake:1,disc:{dir:[-0.75,0.5,0.2],col:'#fff1b8',r:16},cloud:'#ffffff',mtTint:'#ffffff',tintK:0,stars:0},
  {name:'Snowfall', skyTop:'#a9b6c6',skyHor:'#dfe5ec',fog:'#dde3ea',sun:[0.3,0.9,0.3],sunCol:[0.32,0.33,0.34],sky:[0.72,0.76,0.84],ground:[0.74,0.75,0.78],
    fogK:0.62,snowMul:2.6,flake:1.7,disc:null,cloud:'#d5dbe3',mtTint:'#cfd6e0',tintK:0.5,stars:0},
  {name:'Sunset',   skyTop:'#6c6aa8',skyHor:'#f6a46c',fog:'#efb592',sun:[-0.5,0.38,0.45],sunCol:[0.86,0.52,0.34],sky:[0.5,0.46,0.62],ground:[0.7,0.56,0.52],
    fogK:0.95,snowMul:0.3,flake:1,disc:{dir:[0.6,0.06,-0.8],col:'#ff9d5c',r:26,glow:'#ff7a62'},cloud:'#f2a28e',mtTint:'#9f7fb0',tintK:0.45,stars:0},
  {name:'Starry Night',skyTop:'#0e1838',skyHor:'#33477a',fog:'#2b3a65',sun:[0.3,0.75,0.5],sunCol:[0.24,0.28,0.42],sky:[0.27,0.31,0.47],ground:[0.31,0.34,0.47],
    fogK:0.85,snowMul:0.5,flake:1.2,disc:{dir:[-0.45,0.45,-0.75],col:'#f4f1dc',r:13,moon:true},cloud:null,mtTint:'#53608f',tintK:0.6,stars:1},
  {name:'Christmas Lights',skyTop:'#081028',skyHor:'#22305a',fog:'#1c2748',sun:[-0.3,0.8,0.5],sunCol:[0.18,0.22,0.36],sky:[0.2,0.24,0.38],ground:[0.25,0.27,0.38],
    fogK:0.8,snowMul:0.9,flake:1.3,disc:{dir:[0.4,0.42,-0.8],col:'#f4f1dc',r:12,moon:true},cloud:null,mtTint:'#414d7c',tintK:0.65,stars:1,lights:true},
];
function themeFor(level){return THEMES[(level-1)%THEMES.length];}
// difficulty grows with every level, and keeps growing after the scenes loop
function diffFor(level){const d=Math.min(level-1,9);return{
  d,mogulW:0.10+0.05*d, mogulMin:1+Math.floor(d/3), mogulMax:2+Math.floor(d*0.8), mogulGap:6.5-0.35*d,
  needleW:0.06+0.035*d, needleDouble:d>=2, slalomW:d>=1?0.04+0.04*d:0, rampW:0.2, snakeW:0.22, palP:0.8};}
const LV={level:1,unlocked:1};
try{LV.unlocked=Math.max(1,+localStorage.getItem('mm_unlocked')||1);LV.level=clamp(+localStorage.getItem('mm_level')||LV.unlocked,1,LV.unlocked);}catch(e){}
function saveLevels(){try{localStorage.setItem('mm_unlocked',LV.unlocked);localStorage.setItem('mm_level',LV.level);}catch(e){}}
function levelLabel(l){return'Level '+l+' · '+themeFor(l).name;}

function applyTheme(level){
  const T=themeFor(level);
  LIGHT.skyTop=hex(T.skyTop);LIGHT.skyHor=hex(T.skyHor);LIGHT.fog=hex(T.fog);LIGHT.sun=v3.norm(T.sun);LIGHT.sunCol=T.sunCol;LIGHT.sky=T.sky;LIGHT.ground=T.ground;LIGHT.fogK=T.fogK;
  LIGHT.snowMul=T.snowMul;LIGHT.flake=T.flake;
  const on=!!T.lights;if(on!==LIGHTS_ON){LIGHTS_ON=on;clearChunks();if(typeof archModel!=='undefined'&&archModel){if(archModel.glow)freeModel(archModel.glow);freeModel(archModel);archModel=buildArches();}}
}
// backdrop per theme: tinted mountains, sun / moon disc with glow, clouds, stars
function buildBackdropTheme(level){
  const T=themeFor(level);const sb=new SB(12000);const rnd=mulberry(77);const tint=hex(T.mtTint);
  const layers=[{n:16,d:[330,420],h:[70,140],w:[90,160],col:hex('#a7b4cf'),sp:6},{n:20,d:[220,280],h:[30,70],w:[70,120],col:hex('#c3cfe0'),sp:5},{n:26,d:[140,180],h:[10,26],w:[40,80],col:hex('#e8eef4'),sp:4}];
  const snowCap=mix3(PAL.white,tint,T.tintK*0.5);
  for(const L of layers)for(let i=0;i<L.n;i++){const ang=(i+rnd()*0.8)/L.n*Math.PI*2;const D=lerp(L.d[0],L.d[1],rnd()),H=lerp(L.h[0],L.h[1],rnd()),W=lerp(L.w[0],L.w[1],rnd());
    const cx=Math.cos(ang)*D,cz=Math.sin(ang)*D;const tx=-Math.sin(ang),tz=Math.cos(ang);const base=mix3(L.col,tint,T.tintK);
    for(let y=0;y<H;y+=L.sp)for(let x=-W/2;x<W/2;x+=L.sp){const prof=H*(1-Math.abs(x)/(W/2))*(0.85+0.3*vnoise(x*0.05+i,3));if(y>prof)continue;
      const cap=y>prof-H*0.28&&L.n<25;const c=cap?snowCap:shade(base,0.92+rnd()*0.12);
      sb.add(cx+tx*x,y-10,cz+tz*x,L.sp*1.4,c,-Math.cos(ang)*0.4,0.8,-Math.sin(ang)*0.4,false,rnd());}}
  if(T.cloud){const cc=hex(T.cloud);for(let i=0;i<10;i++){const ang=rnd()*Math.PI*2,D=260+rnd()*80,y=90+rnd()*60;const c=[Math.cos(ang)*D,y,Math.sin(ang)*D];
    for(let k=0;k<5;k++){const o=[(k-2)*9+rnd()*4,rnd()*5,rnd()*6];ellipsoid(sb,v3.add(c,o),[9,6,6],cc,3.2,{jit:0.3});}}}
  else rnd();
  if(T.disc){const d=v3.norm(T.disc.dir);const D=480;const c=v3.add(v3.sc(d,D),[0,T.disc.dir[1]<0.1?14:0,0]);
    if(T.disc.glow)for(let k=3;k>=1;k--){const R0=T.disc.r*(1+k*0.75);ellipsoid(sb,v3.add(c,v3.sc(d,k*6)),[R0,R0,R0],mix3(hex(T.disc.glow),hex(T.skyHor),0.15+k*0.2),7,{jit:0,keep:q=>v3.dot(q,d)>0.1});}
    ellipsoid(sb,c,[T.disc.r,T.disc.r,T.disc.r],hex(T.disc.col),3.5,{jit:0});
    if(T.disc.moon)for(const[ox,oy,r]of[[4,3,3],[-5,-2,2.2],[1,-6,1.6]])ellipsoid(sb,v3.add(c,v3.sc(v3.norm([-d[2],0,d[0]]),ox)).map((v,i)=>i===1?v+oy:v),[r,r,r*0.4],shade(hex(T.disc.col),0.82),1.2,{jit:0});}
  if(T.stars)for(let i=0;i<700;i++){const th=rnd()*Math.PI*2,ph=0.12+rnd()*1.2;const d=[Math.cos(th)*Math.cos(ph),Math.sin(ph),Math.sin(th)*Math.cos(ph)];
    const big=rnd()<0.08;sb.add(d[0]*600,d[1]*600-10,d[2]*600,big?3.4:1.6+rnd()*1.2,big?hex('#fff6d8'):PAL.white,-d[0],-d[1],-d[2],big,rnd());}
  return makeModel(sb);
}

// ---- cocoa: mug (red felt with marshmallows) and a little felt stand
function buildMug(colHex){
  const sb=new SB();const col=hex(colHex);const r=0.06,h=0.11;
  for(let y=0;y<=h;y+=0.012)for(let i=0;i<22;i++){const a=i/22*Math.PI*2;sb.add(Math.cos(a)*r,y,Math.sin(a)*r,0.02,(Math.floor(y/0.03)%2&&y>0.03)?PAL.cream:col,Math.cos(a),0,Math.sin(a));}
  for(let rr=0;rr<r;rr+=0.012){const n=Math.max(1,Math.round(rr*2*Math.PI/0.012));for(let i=0;i<n;i++){const a=i/n*Math.PI*2;sb.add(Math.cos(a)*rr,h-0.008,Math.sin(a)*rr,0.018,hex('#6b3d26'),0,1,0);sb.add(Math.cos(a)*rr,0,Math.sin(a)*rr,0.018,col,0,-1,0);}}
  for(const[mx,mz]of[[0.02,0.01],[-0.02,0.015],[0,-0.02]])ellipsoid(sb,[mx,h+0.005,mz],[0.016,0.012,0.016],PAL.white,0.008,{vary:0.03});
  tube(sb,(()=>{const p=[];for(let i=0;i<=10;i++){const a=-Math.PI/2+i/10*Math.PI;p.push([r+Math.cos(a)*0.035,h/2+Math.sin(a)*0.035,0]);}return p;})(),0.011,col,0.012);
  return makeModel(sb);
}
function buildCocoaStand(){
  const sb=new SB(9000);const wood=PAL.wood,woodD=PAL.woodD;
  // counter
  for(let x=-0.8;x<=0.8;x+=0.05)for(let y=0;y<=0.75;y+=0.05){sb.add(x,y,0.4,0.07,(Math.floor(x*10)%2)?wood:woodD,0,0,1);sb.add(x,y,-0.4,0.07,woodD,0,0,-1);}
  for(let z=-0.4;z<=0.4;z+=0.05)for(let y=0;y<=0.75;y+=0.05)for(const sx of[-1,1])sb.add(sx*0.8,y,z,0.07,woodD,sx,0,0);
  for(let x=-0.85;x<=0.85;x+=0.05)for(let z=-0.45;z<=0.45;z+=0.05)sb.add(x,0.78,z,0.07,hex('#c48756'),0,1,0);
  // posts + striped awning
  for(const sx of[-0.75,0.75])tube(sb,[[sx,0.78,0.38],[sx,1.7,0.38]],0.035,PAL.red,0.04);
  for(const sx of[-0.75,0.75])tube(sb,[[sx,0.78,-0.38],[sx,1.85,-0.38]],0.035,PAL.red,0.04);
  for(let x=-0.95;x<=0.95;x+=0.045)for(let t=0;t<=1;t+=0.06){const z=lerp(-0.5,0.62,t),y=lerp(1.9,1.68,t);const c=(Math.floor((x+1)/0.19)%2)?PAL.red:PAL.cream;sb.add(x,y,z,0.07,c,0,0.9,0.4);}
  for(let x=-0.95;x<=0.95;x+=0.045){const c=(Math.floor((x+1)/0.19)%2)?PAL.red:PAL.cream;for(let k=0;k<3;k++){const y=1.66-k*0.04-((Math.floor((x+1)/0.095)%2)?0.03:0);sb.add(x,y,0.63,0.06,c,0,0,1);}}
  // big cocoa pot + ladle, a few mugs on the counter
  ellipsoid(sb,[-0.35,0.98,0],[0.24,0.2,0.24],hex('#3b4252'),0.035,{half:-0.6});
  for(let rr=0;rr<0.22;rr+=0.03){const n=Math.max(1,Math.round(rr*2*Math.PI/0.03));for(let i=0;i<n;i++){const a=i/n*Math.PI*2;sb.add(-0.35+Math.cos(a)*rr,1.12,Math.sin(a)*rr,0.04,hex('#6b3d26'),0,1,0);}}
  tube(sb,[[-0.3,1.1,0.05],[-0.15,1.35,0.15]],0.015,PAL.woodD,0.02);
  // sign: a big felt mug on a board
  for(let x=-0.3;x<=0.3;x+=0.04)for(let y=1.92;y<=2.25;y+=0.04)sb.add(x+0.25,y,-0.38,0.06,PAL.cream,0,0,1);
  ellipsoid(sb,[0.22,2.07,-0.34],[0.09,0.1,0.02],PAL.red,0.02);ellipsoid(sb,[0.33,2.08,-0.34],[0.03,0.05,0.015],PAL.red,0.012);
  return makeModel(sb);
}
// ---- celebration state, set up when the sled stops after the finish
const CELEB={on:false,t:0,spots:[],stand:null,C:null,fr:null};
function startCelebration(){
  const{fr,pos}=playerWorld();CELEB.on=true;CELEB.t=0;CELEB.fr=fr;
  const C=v3.add(pos,v3.sc(fr.T,3.2));CELEB.C=C;
  const riders=[{key:GAME.rider,variant:0,driver:true}].concat(P.stack);
  const n=riders.length;CELEB.spots=riders.map((r,i)=>{
    const a=n===1?0:lerp(-1.05,1.05,i/(n-1));const rad=1.4+0.25*n;
    const ss=P.s+3.2-Math.cos(a)*rad*0.45+0.5,uu=clamp(P.u*0.3+Math.sin(a)*rad,-3.6,3.6);const p=surf(ss,uu);
    const seatZ=i===0?0.35:i===1?-0.2:-0.72;const from=M4.apply(sledMatrix().M,[0,0.1+(i>2?(i-2)*0.5:0),seatZ]);
    return{r,i,from,to:p,drink:i%2===1,delay:i*0.12};});
  CELEB.stand=surf(P.s+1.2,clamp(P.u*0.3-1.6,-2.4,2.4));CELEB.C=surf(P.s+3.2,P.u*0.3);
  for(let k=0;k<60;k++){const p=v3.add(C,[(Math.random()-0.5)*4,3+Math.random()*2,(Math.random()-0.5)*3]);const cols=[PAL.red,PAL.mustard,PAL.teal,PAL.green,hex('#e07aa0')];
    PARTS_P.push({p,v:[(Math.random()-0.5)*2,Math.random()*1.5,(Math.random()-0.5)*2],t:0,life:2.2+Math.random(),col:cols[k%5],s:0.06+Math.random()*0.05,slow:true});}
  Sfx.cheer();
}
function celebCamera(){const fr=CELEB.fr,C=CELEB.C;const n=CELEB.spots.length;const k=0.75+n*0.05;return{eye:v3.add(v3.add(v3.add(C,v3.sc(fr.T,5.2*k)),v3.sc(fr.R,-0.8)),[0,1.6*k,0]),tgt:v3.add(v3.add(C,v3.sc(fr.T,0.8)),[0,-0.05,0])};}
let mugModels={},standModels={};
function drawCelebration(time,qt,boil){
  const fr=CELEB.fr;const X=v3.sc(fr.R,-1),Z=fr.T,Y=fr.N;
  const key=LIGHTS_ON?'lit':'plain';if(!standModels[key]){standModels[key]=buildCocoaStand();if(LIGHTS_ON){const sb=new SB(),gw=new SB();addStandLights(sb,gw);standModels.litBulbs=makeModel(sb);standModels.litBulbs.glow=makeModel(gw);}}
  CELEB.standM=M4.mul(M4.basis(X,Y,Z,CELEB.stand),M4.scale(1.25));drawModel(standModels[key],CELEB.standM,{boil,boilAmt:0.06});if(LIGHTS_ON)drawModel(standModels.litBulbs,CELEB.standM);
  for(const sp of CELEB.spots){const A=getAnimal(sp.r.key,sp.r.variant);const t=clamp((CELEB.t-sp.delay)/0.6,0,1);
    let p=v3.add(v3.lerp(sp.from,sp.to,t),[0,Math.sin(t*Math.PI)*1.2,0]);
    const ph=qt*1+sp.i*1.7;const M=M4.mul(M4.basis(X,Y,Z,p),M4.scale(SLED_SCALE));
    let pose;
    if(t<1)pose={armL:2.6,armR:2.6};
    else if(sp.drink){const sip=(Math.sin(qt*1.6+sp.i)>0.3);pose={armL:0.35,armR:0.25,armRX:sip?2.35:1.2,headNod:sip?-0.28:0.05,mug:SCARF_COLS[sp.i%SCARF_COLS.length],mugTilt:sip?0.7:0,
        bob:Math.abs(Math.sin(qt*2+sp.i))*0.02,headTilt:sip?0:Math.sin(qt*2+sp.i)*0.12};
      if(Math.random()<0.05)spawnSteam(M,pose);}
    else{const hop=Math.abs(Math.sin(qt*5.5+sp.i*1.3));pose={armL:2.4+Math.sin(qt*11+sp.i)*0.5,armR:2.4+Math.sin(qt*11+sp.i+1.6)*0.5,bob:hop*0.22,headTilt:Math.sin(qt*4+sp.i)*0.2};}
    drawAnimal(A,M,pose,boil);
  }
}
function spawnSteam(M,pose){const p=M4.apply(M,[0.17,0.62,0.22]);PARTS_P.push({p,v:[(Math.random()-0.5)*0.15,0.45,(Math.random()-0.5)*0.15],t:0,life:1.4,col:hex('#f4f4f4'),s:0.05,slow:true});}
