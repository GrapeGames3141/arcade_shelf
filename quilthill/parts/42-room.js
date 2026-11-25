// ---------- 42-room: giant cozy living room around the quilt pile, fireplace with live fire ----------
// The hedgehog is tiny: the room is about 90x real size. Floor at QH.FY, fireplace wall at s = L+330.
const ROOM={X:420,S0:-160,WALL:0,CEIL:235};
function woodTex(){const cv=canvas2(512,512),g=cv.getContext('2d');const cols=['#9a6a43','#a87650','#8e5f3b','#b07e55','#946440'];
  for(let i=0;i<8;i++){g.fillStyle=cols[i%cols.length];g.fillRect(0,i*64,512,64);const rnd=mulberry(i*31+3);
    for(let k=0;k<40;k++){g.strokeStyle=`rgba(60,35,20,${0.08+rnd()*0.12})`;g.lineWidth=1+rnd()*2;g.beginPath();const y=i*64+rnd()*64;g.moveTo(0,y);g.bezierCurveTo(170,y+rnd()*8-4,340,y+rnd()*8-4,512,y+rnd()*6-3);g.stroke();}
    g.fillStyle='rgba(30,15,8,0.6)';g.fillRect(0,i*64,512,3);const cut=Math.floor(rnd()*400)+50;g.fillRect(cut,i*64,3,64);}
  return texFromCanvas(cv,true);}
function wallpaperTex(){const cv=canvas2(256,512),g=cv.getContext('2d');g.fillStyle='#e8d6b9';g.fillRect(0,0,256,512);
  g.fillStyle='#d7bf9a';for(let x=0;x<256;x+=64)g.fillRect(x+20,0,24,512);g.fillStyle='#9c5a4d';
  for(let y=40;y<512;y+=128)for(let x=0;x<256;x+=64){const cx=x+32,cy=y+(x/64%2)*64;for(let p=0;p<5;p++){const a=p/5*Math.PI*2;g.beginPath();g.arc(cx+Math.cos(a)*7,cy+Math.sin(a)*7,5,0,7);g.fill();}
    g.fillStyle='#6f8a5a';g.beginPath();g.ellipse(cx+12,cy+12,8,3,0.7,0,7);g.fill();g.fillStyle='#9c5a4d';}
  return texFromCanvas(cv,true);}
function stoneTex(){const cv=canvas2(512,512),g=cv.getContext('2d');g.fillStyle='#4a4038';g.fillRect(0,0,512,512);const rnd=mulberry(5);
  for(let r=0;r<8;r++){let x=-rnd()*60;while(x<512){const w=60+rnd()*70;const c=150+rnd()*50|0;g.fillStyle=`rgb(${c},${c*0.92|0},${c*0.84|0})`;g.beginPath();g.roundRect(x+3,r*64+3,w-6,58,14);g.fill();
    g.fillStyle='rgba(0,0,0,0.12)';g.beginPath();g.roundRect(x+3,r*64+40,w-6,21,10);g.fill();x+=w;}}
  return texFromCanvas(cv,true);}
function rugTex(){const cv=canvas2(512,512),g=cv.getContext('2d');const cols=['#7c2f2f','#c98a3a','#2f5d7a','#e8dcc4','#5d7b4a','#9c5a4d'];
  for(let k=0;k<40;k++){g.fillStyle=cols[k%cols.length];g.beginPath();g.ellipse(256,256,256-k*6.3,256-k*6.3,0,0,7);g.fill();}
  g.globalAlpha=0.18;g.strokeStyle='#000';for(let k=0;k<40;k++){g.lineWidth=1;g.beginPath();g.ellipse(256,256,256-k*6.3,256-k*6.3,0,0,7);g.stroke();}g.globalAlpha=1;
  return texFromCanvas(cv,false);}
function paintingTex(){const cv=canvas2(512,320),g=cv.getContext('2d');const gr=g.createLinearGradient(0,0,0,320);gr.addColorStop(0,'#9fb4dc');gr.addColorStop(1,'#f8c6a2');g.fillStyle=gr;g.fillRect(0,0,512,320);
  g.fillStyle='#ffd08a';g.beginPath();g.arc(380,190,34,0,7);g.fill();
  const mt=(c,pts)=>{g.fillStyle=c;g.beginPath();g.moveTo(0,320);for(const[x,y]of pts)g.lineTo(x,y);g.lineTo(512,320);g.fill();};
  mt('#a7b4cf',[[0,220],[90,120],[170,200],[260,90],[360,210],[450,130],[512,190]]);g.fillStyle='#fff';
  mt('#e8eef4',[[0,270],[120,220],[230,260],[330,215],[512,262]]);
  g.strokeStyle='#cf4a42';g.lineWidth=10;g.beginPath();g.moveTo(140,320);g.bezierCurveTo(220,270,300,300,330,232);g.stroke();
  return texFromCanvas(cv,false);}
function windowTex(){const cv=canvas2(256,384),g=cv.getContext('2d');const gr=g.createLinearGradient(0,0,0,384);gr.addColorStop(0,'#0e1838');gr.addColorStop(1,'#3a4f86');g.fillStyle=gr;g.fillRect(0,0,256,384);
  const rnd=mulberry(11);g.fillStyle='#fff';for(let k=0;k<70;k++){g.globalAlpha=0.4+rnd()*0.6;g.beginPath();g.arc(rnd()*256,rnd()*384,1+rnd()*2.5,0,7);g.fill();}g.globalAlpha=1;
  g.fillStyle='#f4f1dc';g.beginPath();g.arc(190,70,22,0,7);g.fill();g.fillStyle='#e6edf5';g.beginPath();g.moveTo(0,384);g.lineTo(0,330);g.quadraticCurveTo(120,300,256,340);g.lineTo(256,384);g.fill();
  return texFromCanvas(cv,false);}
function buildRoom(){
  const FY=QH.FY,L=QH.L;ROOM.WALL=L+330;const Wz=-ROOM.WALL;const out={};
  // floor
  {const m=new MB();m.grid(1,1,(u,v)=>{const x=lerp(-ROOM.X,ROOM.X,u),s=lerp(ROOM.S0,ROOM.WALL,v);return{p:[x,FY,-s],n:[0,1,0],uv:[x/100,s/100]};});out.floor=m.build();out.floor.tex=woodTex();}
  // walls (back, left, right) with wainscot
  {const m=new MB();const top=FY+ROOM.CEIL;
    m.grid(1,1,(u,v)=>({p:[lerp(-ROOM.X,ROOM.X,u),lerp(FY+80,top,v),Wz],n:[0,0,1],uv:[lerp(-ROOM.X,ROOM.X,u)/50,lerp(FY+80,top,v)/100]}));
    for(const sx of[-1,1])m.grid(1,1,(u,v)=>({p:[sx*ROOM.X,lerp(FY+80,top,v),-lerp(ROOM.S0,ROOM.WALL,u)],n:[-sx,0,0],uv:[lerp(ROOM.S0,ROOM.WALL,u)/50,lerp(FY+80,top,v)/100]}));
    out.walls=m.build();out.walls.tex=wallpaperTex();}
  {const m=new MB();const pan=[0.55,0.36,0.24],pan2=[0.47,0.3,0.2];
    m.box([0,FY+40,Wz+2],[ROOM.X*2,80,4],pan);m.box([0,FY+82,Wz+5],[ROOM.X*2,6,10],pan2);
    for(const sx of[-1,1]){m.box([sx*(ROOM.X-2),FY+40,-(ROOM.S0+ROOM.WALL)/2],[4,80,ROOM.WALL-ROOM.S0],pan);m.box([sx*(ROOM.X-5),FY+82,-(ROOM.S0+ROOM.WALL)/2],[10,6,ROOM.WALL-ROOM.S0],pan2);}
    m.grid(1,1,(u,v)=>({p:[lerp(-ROOM.X,ROOM.X,u),FY+ROOM.CEIL,-lerp(ROOM.S0,ROOM.WALL,v)],n:[0,-1,0],c:[0.42,0.3,0.22]}));
    for(let s=ROOM.S0+60;s<ROOM.WALL;s+=140)m.box([0,FY+ROOM.CEIL-8,-s],[ROOM.X*2,16,18],[0.34,0.22,0.15]);
    out.trim=m.build();}
  // fireplace: stone surround, firebox, mantel, hearth
  {const m=new MB();const cx=0,W=170,Hh=125,D=40,ow=86,oh=78;const z=Wz+D/2;const st=[1,1,1];
    m.box([cx-(ow/2+(W-ow)/4),FY+Hh/2,z],[(W-ow)/2,Hh,D],st);m.box([cx+(ow/2+(W-ow)/4),FY+Hh/2,z],[(W-ow)/2,Hh,D],st);m.box([cx,FY+oh+(Hh-oh)/2,z],[ow,Hh-oh,D],st);
    m.box([cx,FY+Hh+60,Wz+12],[W*0.82,120,24],st);
    out.stone=m.build();out.stone.tex=stoneTex();
    const f=new MB();f.box([cx,FY+oh/2,Wz+3],[ow,oh,6],[0.12,0.08,0.07]);f.box([cx-ow/2+2,FY+oh/2,Wz+D/2],[4,oh,D],[0.18,0.12,0.1]);f.box([cx+ow/2-2,FY+oh/2,Wz+D/2],[4,oh,D],[0.18,0.12,0.1]);
    f.box([cx,FY+Hh+5,Wz+D/2+4],[W+16,10,D+14],[0.5,0.32,0.2]);f.box([cx,FY+2.5,Wz+D+25],[W+30,5,50],[0.55,0.5,0.46]);
    // grate and logs
    f.box([cx,FY+8,Wz+20],[60,3,18],[0.15,0.15,0.16]);for(const[a,b,r]of[[-26,22,7],[-22,24,6.5],[-8,-10,7.5]]){f.tube([[cx+a,FY+16,Wz+14],[cx+b,FY+16+(r>7?6:0),Wz+28]],r,12,(t,s)=>s<0.1||s>0.9?[0.75,0.6,0.42]:[0.38,0.24,0.15]);}
    // mantel clock, candles, picture frame
    f.lathe([[0.001,0],[9,0],[9,2],[7,4],[7,20],[0.001,24]],20,[0.42,0.26,0.16],M4.trans(cx-55,FY+Hh+10,Wz+22));
    f.box([cx-55,FY+Hh+22,Wz+29],[10,10,1],[0.95,0.92,0.84]);
    for(const dx of[45,58])f.lathe([[0.001,0],[3.2,0],[3.2,18],[0.001,18]],12,[0.96,0.93,0.86],M4.trans(cx+dx,FY+Hh+10,Wz+24));
    f.box([cx,FY+Hh+60,Wz+25.5],[96,64,3],[0.6,0.42,0.18]);
    out.firebox=f.build();
    const pic=new MB();pic.grid(1,1,(u,v)=>({p:[cx-42+84*u,FY+Hh+32+56*v,Wz+27.2],n:[0,0,1],uv:[u,1-v]}));out.pic=pic.build();out.pic.tex=paintingTex();
  }
  // rug, armchair, side table + lamp, bookshelf, window, yarn basket
  {const m=new MB();m.grid(1,1,(u,v)=>({p:[lerp(-160,160,u),FY+0.4,-lerp(L+190,L+300,v)],n:[0,1,0],uv:[u,v]}));out.rug=m.build();out.rug.tex=rugTex();}
  {const m=new MB();const red=[0.62,0.2,0.2],redD=[0.48,0.15,0.16],wood=[0.35,0.22,0.13];const Mx=M4.mul(M4.trans(-220,FY,-(L+250)),M4.rotY(0.5));
    m.box([0,30,0],[90,22,80],red,Mx);m.box([0,70,-34],[90,80,14],redD,Mx);for(const sx of[-1,1])m.box([sx*48,48,0],[16,40,82],redD,Mx);m.box([0,45,8],[76,10,62],[0.78,0.3,0.3],Mx);
    for(const sx of[-1,1])for(const sz of[-1,1])m.box([sx*40,8,sz*34],[8,16,8],wood,Mx);
    out.chair=m.build();
    const t=new MB();const tx=210,tz=-(L+255);t.lathe([[0.001,0],[14,0],[14,3],[4,6],[4,52],[26,54],[26,58],[0.001,58]],24,[0.4,0.25,0.15],M4.trans(tx,FY,tz));
    t.lathe([[0.001,0],[9,0],[7,10],[3,14],[3,30],[0.001,30]],18,[0.25,0.45,0.52],M4.trans(tx,FY+58,tz));
    out.table=t.build();
    const sh=new MB();sh.lathe([[22,0],[13,26],[0.001,26]],24,[1.0,0.86,0.62],M4.trans(tx,FY+84,tz));out.shade=sh.build();
    const bs=new MB();const bx=-ROOM.X+18,bz=-(L+60);bs.box([bx,FY+90,bz],[30,180,140],[0.36,0.23,0.14]);const rnd=mulberry(3);const bc=[[0.62,0.2,0.2],[0.2,0.35,0.5],[0.3,0.45,0.28],[0.8,0.65,0.3],[0.45,0.3,0.5],[0.85,0.8,0.7]];
    for(let sh2=0;sh2<4;sh2++){const y0=FY+12+sh2*42;bs.box([bx+14,y0-2,bz],[4,4,136],[0.3,0.19,0.12]);let z=bz-64;while(z<bz+62){const w=4+rnd()*5,h=26+rnd()*10;bs.box([bx+14,y0+h/2,z+w/2],[18,h,w-0.6],bc[Math.floor(rnd()*bc.length)]);z+=w;}}
    out.shelf=bs.build();
    const wn=new MB();const wx=ROOM.X-1,ws=L-120;wn.grid(1,1,(u,v)=>({p:[wx,FY+110+v*90,-(ws-40+u*80)],n:[-1,0,0],uv:[u,1-v]}));out.win=wn.build();out.win.tex=windowTex();
    const wf=new MB();const fc=[0.94,0.92,0.86];wf.box([wx-2,FY+110,-ws],[4,4,86],fc);wf.box([wx-2,FY+200,-ws],[4,4,86],fc);wf.box([wx-2,FY+155,-(ws-41)],[4,94,4],fc);wf.box([wx-2,FY+155,-(ws+41)],[4,94,4],fc);
    wf.box([wx-2,FY+155,-ws],[3,90,2],fc);wf.box([wx-2,FY+155,-ws],[3,2,80],fc);wf.box([wx-6,FY+106,-ws],[10,4,96],fc);
    for(const sz of[-1,1]){const c0=-(ws+sz*56);wf.box([wx-8,FY+150,c0],[6,120,26],[0.6,0.24,0.28]);}
    out.winframe=wf.build();
  }
  // finish: two giant pins with a gingham ribbon between them
  {const m=new MB();const s=L,a=[-19.2,H(-18.5,s)+5.6,-s],b=[19.2,H(18.5,s)+5.6,-s];
    for(let i=0;i<=80;i++)for(const k of[0,1]){}
    m.grid(80,6,(u,v)=>{const p=v3.add(v3.lerp(a,b,u),[0,-Math.sin(u*Math.PI)*1.1-v*1.1,0]);const c=(Math.floor(u*40)+Math.floor(v*6))%2?[0.81,0.29,0.26]:[0.97,0.93,0.86];return{p,n:[0,0,1],c};});
    out.ribbon=m.build();}
  return out;
}
let ROOMM=null,PINM=null,PINH=null,TOMATO=null;
function buildTomato(){const m=new MB();const red=[0.83,0.28,0.24];
  m.lathe((()=>{const p=[];for(let k=0;k<=16;k++){const a=-Math.PI/2+k/16*Math.PI;p.push([Math.cos(a)*3+1e-3,Math.sin(a)*2.2+2.2]);}return p;})(),40,(k,t)=>Math.abs(Math.sin(t*Math.PI*8))<0.08?shade(red,0.7):red);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;m.box([Math.cos(a)*0.55,4.45,Math.sin(a)*0.55],[1.1,0.12,0.38],[0.31,0.55,0.36],M4.rotY(-a));}
  m.tube([[0,4.4,0],[0.1,5.0,0.05]],0.09,8,[0.31,0.55,0.36]);return m.build();}
function drawRoom(time){
  if(!ROOMM){ROOMM=buildRoom();TOMATO=buildTomato();}
  const R0=ROOMM;drawMesh(R0.floor,null,{weave:0});drawMesh(R0.walls,null,{});drawMesh(R0.trim,null,{spec:0.2,shin:20});
  drawMesh(R0.stone,null,{uvScale:[0.02,0.02]});drawMesh(R0.firebox,null,{spec:0.3,shin:30});drawMesh(R0.pic,null,{emis:0.1});
  drawMesh(R0.rug,null,{weave:0.6});drawMesh(R0.chair,null,{weave:0.5});drawMesh(R0.table,null,{spec:0.4,shin:30});drawMesh(R0.shade,null,{emis:0.9});
  drawMesh(R0.shelf,null,{});drawMesh(R0.win,null,{emis:0.6});drawMesh(R0.winframe,null,{});drawMesh(R0.ribbon,null,{weave:12});
  // finish pins and two tomato pincushions
  if(!PINM){PINM=buildPin();PINH=buildPinHead();}
  for(const sx of[-1,1]){const M=M4.mul(M4.trans(sx*19.2,H(sx*18.5,QH.L)-0.1,-QH.L),M4.scale(4.5));drawMesh(PINM,M,MAT.steel);drawMesh(PINH,M,Object.assign({tint:sx<0?[0.25,0.56,0.58]:[0.88,0.48,0.63]},MAT.glossy));}
  drawMesh(TOMATO,M4.trans(22,sideY(22,14)-0.6,-14),{weave:8});drawMesh(TOMATO,M4.mul(M4.trans(-24,sideY(24,QH.L+30)-0.6,-(QH.L+30)),M4.scale(1.3)),{weave:8});
}
function drawFire(cam,time){
  const s=MR.fire;gl.useProgram(s.p);gl.uniformMatrix4fv(s.u.uVP,false,cam.vp);gl.bindVertexArray(R.shVao);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.depthMask(false);
  const fw=v3.norm([cam.right[0],0,cam.right[2]]);gl.uniform3fv(s.u.uR,fw);gl.uniform3fv(s.u.uU,[0,1,0]);gl.uniform1f(s.u.uT,time);
  const z=-ROOM.WALL+22,y=QH.FY+12;
  gl.uniform1i(s.u.uGlow,1);gl.uniform3fv(s.u.uC,[0,QH.FY+2,z+8]);gl.uniform2f(s.u.uSize,95,110);gl.uniform1f(s.u.uI,0.9*FIRE.i);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.uniform1i(s.u.uGlow,0);
  const fl=[[-22,20,52,0.1],[18,22,58,0.7],[-2,28,72,0.4],[-34,14,36,0.9],[32,14,40,0.25],[6,18,46,0.55],[-12,16,40,0.8]];
  for(const[dx,w,h,sd]of fl){gl.uniform3fv(s.u.uC,[dx,y,z+4+sd*6]);gl.uniform2f(s.u.uSize,w,h*(0.9+0.12*Math.sin(time*3+sd*9)));gl.uniform1f(s.u.uSeed,sd);gl.uniform1f(s.u.uI,1.25);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);}
  gl.depthMask(true);gl.disable(gl.BLEND);
}
