// ---------- 41-quilttex: crisp quilt surface = mesh + painted canvas texture per 20 m chunk ----------
function puff(x,s){const fx=(x+QH.half)/QH.cell,fz=s/QH.cell;const a=Math.sin(Math.PI*(fx-Math.floor(fx)))*Math.sin(Math.PI*(fz-Math.floor(fz)));return 0.08*Math.sqrt(Math.max(0,a));}
function HR(x,s){return H(x,s)+(Math.abs(x)<QH.half?puff(x,s):0);}
const css=c=>`rgb(${Math.round(c[0]*255)},${Math.round(c[1]*255)},${Math.round(c[2]*255)})`;
const PRINTS=['gingham','dots','stripes','floral','calico','plaid','hearts','stars'];
function cottonLook(i,j){const h=hash2(i*7+3,j*13+1);return{base:FABRIC[Math.floor(h*FABRIC.length)],print:PRINTS[Math.floor(hash2(i,j*3+9)*PRINTS.length)],alt:FABRIC[(Math.floor(h*FABRIC.length)+4)%FABRIC.length]};}
function heartPath(g,x,y,s){g.beginPath();g.moveTo(x,y+s*0.3);g.bezierCurveTo(x,y,x-s*0.5,y,x-s*0.5,y+s*0.3);g.bezierCurveTo(x-s*0.5,y+s*0.6,x,y+s*0.8,x,y+s);g.bezierCurveTo(x,y+s*0.8,x+s*0.5,y+s*0.6,x+s*0.5,y+s*0.3);g.bezierCurveTo(x+s*0.5,y,x,y,x,y+s*0.3);g.fill();}
function starPath(g,x,y,r){g.beginPath();for(let k=0;k<10;k++){const a=k/10*Math.PI*2-Math.PI/2,rr=k%2?r*0.45:r;g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}g.closePath();g.fill();}
function paintPatch(g,i,j,X,Y,S,ppm){
  const t=patchType(i,j);const h=hash2(i*7+3,j*13+1);const rnd=mulberry(i*9173+j*131+7);
  g.save();g.beginPath();g.rect(X,Y,S,S);g.clip();
  if(t===PT.CORD){const c=CORD[Math.floor(h*CORD.length)];const w=0.16*ppm;g.fillStyle=css(c);g.fillRect(X,Y,S,S);
    for(let x=X;x<X+S;x+=w){const gr=g.createLinearGradient(x,0,x+w,0);gr.addColorStop(0,css(shade(c,0.62)));gr.addColorStop(0.5,css(shade(c,1.15)));gr.addColorStop(1,css(shade(c,0.62)));g.fillStyle=gr;g.fillRect(x,Y,w,S);}}
  else if(t===PT.SATIN){const c=SATIN[Math.floor(h*SATIN.length)];const gr=g.createLinearGradient(X,Y,X+S,Y+S);
    gr.addColorStop(0,css(shade(c,0.86)));gr.addColorStop(0.35,css(mix3(c,[1,1,1],0.6)));gr.addColorStop(0.5,css(shade(c,0.98)));gr.addColorStop(0.75,css(mix3(c,[1,1,1],0.45)));gr.addColorStop(1,css(shade(c,0.84)));
    g.fillStyle=gr;g.fillRect(X,Y,S,S);g.globalAlpha=0.25;g.strokeStyle='#fff';g.lineWidth=0.04*ppm;for(let k=0;k<3;k++){g.beginPath();g.moveTo(X+S*(0.1+k*0.3),Y);g.quadraticCurveTo(X+S*(0.3+k*0.3),Y+S*0.5,X+S*(0.15+k*0.3),Y+S);g.stroke();}g.globalAlpha=1;}
  else{const L=cottonLook(i,j);const b=L.base,lt=mix3(b,PAL.cream,0.78),dk=shade(b,0.72);const u=ppm;
    switch(L.print){
      case'gingham':{g.fillStyle=css(lt);g.fillRect(X,Y,S,S);g.globalAlpha=0.55;g.fillStyle=css(b);const w=0.17*u;for(let k=0;k*w*2<S;k++){g.fillRect(X+k*w*2,Y,w,S);g.fillRect(X,Y+k*w*2,S,w);}g.globalAlpha=1;break;}
      case'dots':{g.fillStyle=css(b);g.fillRect(X,Y,S,S);g.fillStyle=css(lt);const sp=0.32*u;for(let r=0,y=Y+sp/2;y<Y+S;y+=sp,r++)for(let x=X+(r%2?sp/2:sp)/1;x<X+S+sp;x+=sp){g.beginPath();g.arc(x-sp/2,y,0.07*u,0,7);g.fill();}break;}
      case'stripes':{g.fillStyle=css(lt);g.fillRect(X,Y,S,S);g.save();g.translate(X+S/2,Y+S/2);g.rotate(Math.PI/4);g.fillStyle=css(b);const w=0.14*u;for(let x=-S;x<S;x+=w*2.2)g.fillRect(x,-S,w,S*2);g.restore();break;}
      case'floral':{g.fillStyle=css(dk);g.fillRect(X,Y,S,S);for(let k=0;k<14;k++){const x=X+rnd()*S,y=Y+rnd()*S,r=(0.07+rnd()*0.05)*u;
          g.fillStyle=css(shade(PAL.green,0.9));g.beginPath();g.ellipse(x+r*1.4,y+r*0.6,r*0.8,r*0.35,0.6,0,7);g.fill();
          g.fillStyle=css(rnd()<0.5?L.alt:PAL.cream);for(let p=0;p<5;p++){const a=p/5*Math.PI*2;g.beginPath();g.arc(x+Math.cos(a)*r*0.75,y+Math.sin(a)*r*0.75,r*0.5,0,7);g.fill();}
          g.fillStyle=css(PAL.mustard);g.beginPath();g.arc(x,y,r*0.38,0,7);g.fill();}break;}
      case'calico':{g.fillStyle=css(b);g.fillRect(X,Y,S,S);for(let k=0;k<160;k++){g.fillStyle=k%3?css(lt):css(L.alt);g.beginPath();g.arc(X+rnd()*S,Y+rnd()*S,(0.015+rnd()*0.02)*u,0,7);g.fill();}break;}
      case'plaid':{g.fillStyle=css(b);g.fillRect(X,Y,S,S);g.globalAlpha=0.35;g.fillStyle=css(shade(b,0.5));const w=0.5*u;for(let x=X;x<X+S;x+=w*2){g.fillRect(x,Y,w*0.6,S);}for(let y=Y;y<Y+S;y+=w*2)g.fillRect(X,y,S,w*0.6);
          g.globalAlpha=0.8;g.fillStyle=css(PAL.cream);for(let x=X+w*0.8;x<X+S;x+=w*2)g.fillRect(x,Y,0.03*u,S);for(let y=Y+w*0.8;y<Y+S;y+=w*2)g.fillRect(X,y,S,0.03*u);g.globalAlpha=1;break;}
      case'hearts':{g.fillStyle=css(lt);g.fillRect(X,Y,S,S);g.fillStyle=css(b);const sp=0.42*u;for(let r=0,y=Y+sp*0.2;y<Y+S;y+=sp,r++)for(let x=X+(r%2?sp*0.5:0)+sp*0.25;x<X+S;x+=sp)heartPath(g,x,y,0.2*u);break;}
      case'stars':{g.fillStyle=css(dk);g.fillRect(X,Y,S,S);g.fillStyle=css(PAL.cream);for(let k=0;k<16;k++)starPath(g,X+rnd()*S,Y+rnd()*S,(0.06+rnd()*0.05)*u);break;}
    }}
  // soft pillow shading towards the seams
  const gr=g.createRadialGradient(X+S/2,Y+S/2,S*0.2,X+S/2,Y+S/2,S*0.72);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(40,20,10,0.22)');g.fillStyle=gr;g.fillRect(X,Y,S,S);
  // seam + running stitch
  g.strokeStyle='rgba(50,30,25,0.65)';g.lineWidth=Math.max(1,0.035*ppm);g.strokeRect(X,Y,S,S);
  g.strokeStyle='#fbf3e3';g.lineWidth=Math.max(1,0.028*ppm);g.setLineDash([0.12*ppm,0.08*ppm]);const ins=0.1*ppm;g.strokeRect(X+ins,Y+ins,S-ins*2,S-ins*2);g.setLineDash([]);
  g.restore();
}
function paintZip(g,z,sA,ppm,W){const x0=(z.x+QH.half)*ppm,w=0.55*ppm;const y0=(Math.max(z.s0,sA)-sA)*ppm,y1=(Math.min(z.s1,sA+QH.CH)-sA)*ppm;if(y1<=y0)return;
  g.fillStyle='#3d5a80';g.fillRect(x0-w/2,y0,w,y1-y0);g.strokeStyle='#e8e2d4';g.lineWidth=Math.max(1,0.02*ppm);g.setLineDash([0.06*ppm,0.05*ppm]);g.beginPath();g.moveTo(x0-w*0.42,y0);g.lineTo(x0-w*0.42,y1);g.moveTo(x0+w*0.42,y0);g.lineTo(x0+w*0.42,y1);g.stroke();g.setLineDash([]);
  const tw=0.07*ppm;for(let s=Math.ceil(Math.max(z.s0,sA)/0.06)*0.06;s<Math.min(z.s1,sA+QH.CH);s+=0.06){const y=(s-sA)*ppm;const k=Math.round(s/0.06)%2;
    const gx=x0+(k?0:-tw);const gr=g.createLinearGradient(gx,0,gx+tw,0);gr.addColorStop(0,'#9aa2ad');gr.addColorStop(0.5,'#f2f5f8');gr.addColorStop(1,'#8a929c');g.fillStyle=gr;g.fillRect(gx,y,tw,0.035*ppm);}
  if(z.s0>=sA&&z.s0<sA+QH.CH){const y=(z.s0-sA)*ppm;g.fillStyle='#c9ced6';g.beginPath();g.roundRect(x0-0.14*ppm,y-0.05*ppm,0.28*ppm,0.42*ppm,0.06*ppm);g.fill();g.fillStyle='#7d8590';g.fillRect(x0-0.05*ppm,y+0.12*ppm,0.1*ppm,0.2*ppm);}}
function paintTape(g,k,sA,ppm){const y0=(Math.max(k.s-k.len,sA)-sA)*ppm,y1=(Math.min(k.s,sA+QH.CH)-sA)*ppm;if(y1<=y0)return;const x0=(k.x0+QH.half)*ppm,x1=(k.x1+QH.half)*ppm;
  g.fillStyle='#f2c230';g.fillRect(x0,y0,x1-x0,y1-y0);g.fillStyle='#2a2320';g.font=`bold ${Math.round(0.42*ppm)}px sans-serif`;g.textAlign='center';
  for(let x=Math.ceil(k.x0*10)/10;x<=k.x1;x+=0.1){const px=(x+QH.half)*ppm;const m=Math.round(x*10);const L=m%10===0?0.55:m%5===0?0.35:0.18;g.fillRect(px-0.6,y0,1.2,L*ppm);g.fillRect(px-0.6,y1-L*ppm,1.2,L*ppm);
    if(m%10===0){g.fillText(String(Math.round(x+19)),px,(y0+y1)/2+0.15*ppm);}}
  g.fillStyle='rgba(0,0,0,0.25)';g.fillRect(x0,y0,x1-x0,Math.max(1,0.03*ppm));g.fillRect(x0,y1-Math.max(1,0.03*ppm),x1-x0,Math.max(1,0.03*ppm));}
function paintChunkTex(ci,ppm){
  const sA=ci*QH.CH;const W=Math.round(QH.half*2*ppm),Hc=Math.round(QH.CH*ppm);const cv=canvas2(W,Hc),g=cv.getContext('2d');const S=QH.cell*ppm;
  const nI=Math.ceil(QH.half*2/QH.cell);const j0=Math.floor(sA/QH.cell),j1=Math.ceil((sA+QH.CH)/QH.cell);
  for(let j=j0;j<j1;j++)for(let i=0;i<nI;i++)paintPatch(g,i,j,i*S,(j*QH.cell-sA)*ppm,S,ppm);
  for(const k of QH.KICK)if(k.s>sA&&k.s-k.len<sA+QH.CH)paintTape(g,k,sA,ppm);
  for(const z of QH.ZIP)if(z.s1>sA&&z.s0<sA+QH.CH)paintZip(g,z,sA,ppm,W);
  return cv;
}
// shared fabric textures for the blanket pile and upholstery
let KNIT_TEX=null,UPH_TEX=null;
function sharedTextures(){if(KNIT_TEX)return;
  {const cv=canvas2(256,256),g=cv.getContext('2d');g.fillStyle='#d9cdb4';g.fillRect(0,0,256,256);
    for(let y=0;y<256;y+=16)for(let x=0;x<256;x+=16){const band=Math.floor(y/64)%2;g.fillStyle=band?'#9bb39a':'#e7dcc4';g.beginPath();g.ellipse(x+4,y+8,4,7,0.45,0,7);g.fill();g.beginPath();g.ellipse(x+12,y+8,4,7,-0.45,0,7);g.fill();
      g.strokeStyle='rgba(60,40,20,0.25)';g.lineWidth=1;g.stroke();}
    KNIT_TEX=texFromCanvas(cv,true);}
  {const cv=canvas2(256,256),g=cv.getContext('2d');g.fillStyle='#7b2f35';g.fillRect(0,0,256,256);g.fillStyle='#8e3c41';for(let x=0;x<256;x+=32)g.fillRect(x,0,14,256);
    g.fillStyle='rgba(240,200,120,0.5)';for(let y=16;y<256;y+=64)for(let x=8;x<256;x+=32){g.beginPath();g.moveTo(x+8,y);g.lineTo(x+14,y+12);g.lineTo(x+8,y+24);g.lineTo(x+2,y+12);g.fill();}
    UPH_TEX=texFromCanvas(cv,true);}
}
function sideY(a,s){const top=H(19.6,s);return Math.max(QH.FY,top-(a-19.6)*0.12-Math.pow((a-19.6)/50,2)*6);}
function bakeChunkMesh(ci,ppm,dens){
  sharedTextures();const sA=ci*QH.CH,sB=sA+QH.CH;const out={};
  const quiltA=-20,quiltB=QH.L+90;
  if(sB>quiltA&&sA<quiltB){
    const step=0.42/Math.sqrt(dens);const nu=Math.round(QH.half*2/step),nv=Math.round(QH.CH/step);const m=new MB();const e=0.08;
    m.grid(nu,nv,(u,v)=>{const x=-QH.half+u*QH.half*2,s=sA+v*QH.CH;const y=HR(x,s);const gx=(HR(x+e,s)-HR(x-e,s))/(2*e),gs=(HR(x,s+e)-HR(x,s-e))/(2*e);
      return{p:[x,y,-s],n:v3.norm([-gx,1,gs]),uv:[u,v]};});
    out.quilt=m.build();out.quilt.tex=texFromCanvas(paintChunkTex(ci,ppm));
    // rolled striped borders
    const b=new MB();for(const sx of[-1,1]){const pts=[];for(let s=Math.max(sA,quiltA);s<=Math.min(sB,quiltB)+0.01;s+=1)pts.push([sx*19.7,H(sx*19.5,s)+0.4,-s]);
      if(pts.length>1)b.tube(pts,0.62,14,(t,a,p)=>((Math.floor(-p[2]*1.4+a*4+(sx>0?2:0))%2+2)%2)?[0.81,0.29,0.26]:[0.97,0.93,0.86]);}
    out.border=b.vc?b.build():null;
  }
  // blanket pile beyond the quilt and the upholstery cliff down to the floor
  const sd=new MB();const nsx=Math.round(QH.CH/2),na=24;
  for(const sx of[-1,1]){sd.grid(na,nsx,(u,v)=>{const a=19.6+u*50.4,s=sA+v*QH.CH;const y=sideY(a,s);const y2=sideY(a+0.5,s),ys=sideY(a,s+0.5);
      const n=v3.norm([-(y2-y)/0.5*sx,1,(ys-y)/0.5]);return{p:[sx*a,y,-s],n,uv:[a/6,s/6]};});}
  out.side=sd.build();out.side.tex=KNIT_TEX;
  const cl=new MB();for(const sx of[-1,1])cl.grid(1,nsx,(u,v)=>{const s=sA+v*QH.CH;const top=sideY(70,s);const y=lerp(top,QH.FY,u);return{p:[sx*70,y,-s],n:[sx,0,0],uv:[s/14,y/14]};});
  out.cliff=cl.build();out.cliff.tex=UPH_TEX;
  return out;
}
function freeChunk(c){if(c.side)c.side.tex=null;if(c.cliff)c.cliff.tex=null;for(const k of['quilt','border','side','cliff'])if(c[k])freeMesh(c[k]);}

// ---- far LOD: whole quilt at one quad per patch (flat patch colours) + blanket pile, drawn beyond the loaded chunks
function patchMean(i,j){const t=patchType(i,j);const h=hash2(i*7+3,j*13+1);if(t===PT.CORD)return CORD[Math.floor(h*CORD.length)];if(t===PT.SATIN)return mix3(SATIN[Math.floor(h*SATIN.length)],[1,1,1],0.2);
  const L=cottonLook(i,j);return L.print==='gingham'||L.print==='hearts'||L.print==='stripes'?mix3(L.base,PAL.cream,0.45):L.print==='floral'||L.print==='stars'?shade(L.base,0.78):L.base;}
let LODM=null;
function buildLOD(){
  const m=new MB();const nI=Math.ceil(QH.half*2/QH.cell);const j1=Math.ceil((QH.L+90)/QH.cell);
  for(let j=-8;j<j1;j++)for(let i=0;i<nI;i++){const c=patchMean(i,j);const x0=-QH.half+i*QH.cell,x1=Math.min(QH.half,x0+QH.cell),s0=j*QH.cell,s1=s0+QH.cell;
    const P=(x,s)=>[x,H(x,s)+0.04,-s];const n=normalAt((x0+x1)/2,(s0+s1)/2);
    const a=m.v(P(x0,s0),n,null,c),b=m.v(P(x1,s0),n,null,c),cc=m.v(P(x1,s1),n,null,c),d=m.v(P(x0,s1),n,null,c);m.quad(a,b,cc,d);}
  for(const sx of[-1,1]){m.grid(10,Math.round((QH.L+110)/8),(u,v)=>{const a=19.5+u*50.5,s=-20+v*(QH.L+110);return{p:[sx*a,sideY(a,s),-s],n:[0,1,0],c:[0.82,0.78,0.68]};});
    m.grid(1,Math.round((QH.L+110)/8),(u,v)=>{const s=-20+v*(QH.L+110);return{p:[sx*70,lerp(sideY(70,s),QH.FY,u),-s],n:[sx,0,0],c:[0.48,0.19,0.21]};});
    const pts=[];for(let s=-20;s<=QH.L+90;s+=4)pts.push([sx*19.7,H(sx*19.5,s)+0.4,-s]);m.tube(pts,0.62,6,[0.9,0.62,0.56]);}
  LODM=m.build();
}
function loadedEnd(sNow){let c=Math.floor(sNow/QH.CH)-1;while(CHUNKS.has(c))c++;return c*QH.CH;}
