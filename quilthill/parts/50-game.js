// ---------- 50-game: course items, rolling-ball physics, scoring ----------
const G=9.8,ROLLK=0.72;
let ITEMS=[];
function genCourse(){
  const rnd=mulberry(31415);ITEMS=[];QH.KICK.length=0;QH.ZIP.length=0;let total=0;
  const thread=['#cf4a42','#3f8f93','#e2aa3c','#80507a','#4f8a5b','#e07aa0','#304468'];const btn=['#e07aa0','#3f8f93','#e2aa3c','#cf4a42','#80507a','#4f8a5b'];
  const hnd=['#e8742c','#cf4a42','#3f8f93','#80507a'];const yarnC=['#e07aa0','#3f8f93','#e2aa3c','#b19ad0','#cf4a42','#7fa36b'];
  const add=(type,x,s,ex)=>{const it=Object.assign({type,x,s,alive:true},ex||{});ITEMS.push(it);if(type==='bobbin')total++;return it;};
  const bob=(x,s,h)=>add('bobbin',x,s,{h:h||0.75,col:thread[Math.floor(rnd()*thread.length)]});
  const kinds=[['snake',0.15],['scissors',0.15],['bumpers',0.12],['kicker',0.13],['pins',0.1],['hoop',0.1],['zip',0.1],['yarn',0.08],['scatter',0.07]];
  const ksum=kinds.reduce((a,k)=>a+k[1],0);let s=38,last='';
  while(s<QH.L-40){let r=rnd()*ksum,kind='snake';for(const[k,w]of kinds){if(r<w){kind=k;break;}r-=w;}if(kind===last){continue;}last=kind;const diff=s/QH.L;
    if(kind==='snake'){const ph=rnd()*6,amp=2.5+rnd()*3.5,x0=(rnd()-0.5)*18;for(let k=0;k<8;k++)bob(clamp(x0+Math.sin(ph+k*0.42)*amp,-15,15),s+k*4.5);s+=42;}
    else if(kind==='scissors'){const n=1+Math.floor(rnd()*(1.6+diff*2.2));const xs=[];
      for(let k=0;k<n;k++){const dir=rnd()<0.5?-1:1;const x=clamp(-14+(k+0.5)*(28/n)-dir*1.2,-17,17);xs.push(x+dir*1.2);add('scissors',x,s+k*0.01,{dir,col:hnd[k%hnd.length],phase:rnd()*6,period:1.6+rnd()*1.2});}
      if(rnd()<0.5)add('thimble',clamp(xs[0]+(28/n)/2,-15,15),s+1.5,{h:0.7});else bob(clamp(xs[0]+(28/n)/2,-15,15),s-6);s+=24;}
    else if(kind==='bumpers'){const cx=(rnd()-0.5)*16;const n=3+Math.floor(rnd()*3);
      for(let k=0;k<n;k++){const row=Math.floor((Math.sqrt(8*k+1)-1)/2),col=k-row*(row+1)/2;add('bumper',clamp(cx+(col-row/2)*3.2,-15.5,15.5),s+row*3.4,{col:btn[k%btn.length],squish:0});}
      for(let k=0;k<3;k++)bob(clamp(cx+(k-1)*1.6,-15,15),s+7+k*1.5);s+=26;}
    else if(kind==='kicker'){const full=rnd()<0.4;const w=full?37:8+rnd()*8;const xc=full?0:(rnd()-0.5)*(30-w);const k={s:s+3.5,len:3.5,h:0.95,x0:full?-18.5:xc-w/2,x1:full?18.5:xc+w/2};QH.KICK.push(k);
      if(!full)add('tapecase',k.x0>-15?k.x0-1.3:k.x1+1.3,k.s-1.6,{});
      for(let i=0;i<5;i++){const t=i/4;bob(clamp(xc,-15,15),k.s+3+t*12,1.6+Math.sin(t*Math.PI)*2.4);}
      if(rnd()<0.35)add('thimble',clamp(xc,-15,15),k.s+9,{h:4.4});s+=28;}
    else if(kind==='pins'){ // a row of dress pins stuck in the quilt with a gap to roll through
      const gapX=(rnd()-0.5)*20,gapW=3.2-diff*0.8;const pins=[];for(let x=-16.5;x<=16.5;x+=0.75){if(Math.abs(x-gapX)<gapW/2)continue;if(rnd()<0.12)continue;pins.push({x:x+(rnd()-0.5)*0.2,tilt:(rnd()-0.5)*0.35,tz:(rnd()-0.5)*0.3,col:btn[Math.floor(rnd()*btn.length)]});}
      add('pins',0,s,{pins});bob(gapX,s-5);bob(gapX,s+4);s+=24;}
    else if(kind==='hoop'){const x=(rnd()-0.5)*22;for(let k=0;k<3;k++)bob(x,s-9+k*2.6);add('hoop',x,s,{});if(rnd()<0.4)add('thimble',x,s+5,{h:0.7});s+=26;}
    else if(kind==='zip'){const x=(rnd()-0.5)*24,len=18+rnd()*14;QH.ZIP.push({x,s0:s,s1:s+len,on:false});for(let k=0;k<5;k++)bob(x,s+4+k*(len-6)/4);s+=len+12;}
    else if(kind==='yarn'){const n=2+Math.floor(rnd()*2+diff*1.5);for(let k=0;k<n;k++)add('yarn',(rnd()-0.5)*26,s+k*9,{vx:(rnd()<0.5?-1:1)*(2+rnd()*2.5),vs:0.8+rnd(),col:yarnC[Math.floor(rnd()*yarnC.length)],seed:k+Math.floor(s),r:0.75,rot:0,x0:0,s0:0});
      for(const it of ITEMS)if(it.type==='yarn'&&it.x0===0){it.x0=it.x;it.s0=it.s;}bob((rnd()-0.5)*20,s+n*9+4);s+=n*9+14;}
    else{let cx=(rnd()-0.5)*20;for(let k=0;k<5;k++){cx=clamp(cx+(rnd()-0.5)*4,-14,14);bob(cx,s+k*5);}add('bumper',clamp(cx+(rnd()<0.5?-4:4),-15,15),s+12,{col:btn[0],squish:0});s+=32;}
  }
  ITEMS.sort((a,b)=>a.s-b.s);for(const it of ITEMS)it.y=H(it.x,it.s);
  return total;
}
const GAME={mode:'menu',t:0,runT:0,score:0,bobbins:0,total:0,airScore:0,snips:0,boings:0,bigAirs:0,finishT:0,best:0,auto:false,countT:0};
const P={};const PARTS_P=[];const LOOSE=[];
function resetRun(){
  Object.assign(P,{x:0,s:4,y:H(0,4),vx:0,vs:0,vy:0,air:false,airT:0,coyote:0,inv:0,rot:[[1,0,0],[0,1,0],[0,0,1]],heading:[0,1],curl:0,patch:0,shake:0,jumpBuf:0,spinV:0,hopT:0});
  for(const it of ITEMS){it.alive=true;it.squish=0;if(it.type==='yarn'){it.x=it.x0;it.s=it.s0;it.awake=false;}}for(const z of QH.ZIP)z.on=false;
  PARTS_P.length=0;LOOSE.length=0;
  Object.assign(GAME,{runT:0,score:0,bobbins:0,airScore:0,snips:0,boings:0,bigAirs:0,finishT:0,thimbles:0,hoops:0,ouches:0,zips:0});
}
function popup(t,big){HUD.pop(t,big);}
function ballCenter(){return[P.x,P.y+HOG.r,-P.s];}
function stepPhysics(dt,inp){
  const fin=GAME.mode!=='run';
  const t=patchAt(P.x,P.s);P.patch=t;const fr=PFRIC[t],grip=PGRIP[t];
  const g=gradH(P.x,P.s);const den=1+g[0]*g[0]+g[1]*g[1];
  const sp=Math.hypot(P.vx,P.vs);
  let ax=0,as=0;
  const f=P.heading,r=[f[1],-f[0]];
  if(!P.air){
    ax=-G*g[0]*ROLLK/den;as=-G*g[1]*ROLLK/den;
    if(sp>0.05){ax-=fr*G*P.vx/sp;as-=fr*G*P.vs/sp;}
    ax-=0.006*sp*P.vx;as-=0.006*sp*P.vs;
    if(!fin){const st=inp.steer*7.5*grip;ax+=r[0]*st;as+=r[1]*st;
      if(inp.push>0&&sp<14){ax+=f[0]*3*inp.push*grip;as+=f[1]*3*inp.push*grip;}}
    const br=fin?(GAME.mode==='finish'?2.5:5):inp.brake*6*grip;if(br>0&&sp>0.05){ax-=br*P.vx/sp;as-=br*P.vs/sp;}
    // sideways grip: cotton some, corduroy lots, satin almost none
    ax-=P.vx*PLAT[t];
  }else if(!fin){ax+=r[0]*inp.steer*2;as+=r[1]*inp.steer*2;}
  P.vx+=ax*dt;P.vs+=as*dt;
  if(Math.hypot(P.vx,P.vs)<0.02&&fin){P.vx=P.vs=0;}
  P.prevS=P.s;
  // zipper strips: riding along the teeth pulls you downhill fast
  if(!P.air&&!fin)for(const z of QH.ZIP){const inZ=P.s>z.s0&&P.s<z.s1&&Math.abs(P.x-z.x)<0.45;if(inZ){P.vs+=6.5*dt;P.vx+=(z.x-P.x)*3*dt;if(!z.on){z.on=true;GAME.zips++;popup('ZIP!');Sfx.zip();}}}
  P.x+=P.vx*dt;P.s+=P.vs*dt;
  if(Math.abs(P.x)>18.0){P.x=Math.sign(P.x)*18.0;if(P.vx*Math.sign(P.x)>0)P.vx=-P.vx*0.4;}
  if(P.s<-15){P.s=-15;P.vs=Math.max(0,P.vs);}
  // vertical
  const hN=H(P.x,P.s);
  P.jumpBuf=Math.max(0,P.jumpBuf-dt);if(inp.jumpPress){P.jumpBuf=0.15;inp.jumpPress=false;}
  if(!P.air){const vyG=(hN-P.y)/dt;P.coyote=0.1;
    if(vyG<P.vy-2.5&&P.vy>0.8){P.air=true;P.airT=0;Sfx.whoosh();}else{P.y=hN;P.vy=vyG;}}
  else P.coyote=Math.max(0,P.coyote-dt);
  if(P.jumpBuf>0&&(!P.air||P.coyote>0)&&!fin){P.air=true;P.vy=Math.max(P.vy,0)+5.6;P.airT=0;P.coyote=0;P.jumpBuf=0;Sfx.jump();}
  if(P.air){P.vy-=13*dt;P.y+=P.vy*dt;P.airT+=dt;
    if(P.y<=hN&&P.vy<=0){P.y=hN;
      if(P.vy<-7){P.vy=-P.vy*0.22;}else{P.air=false;P.vy=0;}
      if(P.airT>0.7&&GAME.mode==='run'){const pts=Math.round((P.airT-0.5)*80);GAME.airScore+=pts;GAME.score+=pts;if(P.airT>1.3){GAME.bigAirs++;popup('BIG AIR! +'+pts,true);}else popup('AIR +'+pts);}
      if(P.airT>0.3){spawnPuff(ballCenter(),10,fabricCol(),2.5);Sfx.land(P.airT);P.shake=Math.min(1,P.airT*0.5);}P.airT=0;}}
  // heading follows velocity
  const sp2=Math.hypot(P.vx,P.vs);
  if(sp2>1.5){const k=1-Math.exp(-dt*(P.air?0.8:2.5));let ang=Math.atan2(P.vx,P.vs);ang=clamp(ang,-0.5,0.5);const tx=Math.sin(ang),ts=Math.cos(ang);
    let hx=lerp(P.heading[0],tx,k),hs=lerp(P.heading[1],ts,k);const l=Math.hypot(hx,hs)||1;P.heading=[hx/l,hs/l];}
  // ball spin (visual)
  if(!P.air)P.spinV=sp2/HOG.r;
  if(sp2>0.01){const axis=v3.norm([-P.vs,0,-P.vx]);const ang=P.spinV*dt;P.rot=P.rot.map(c=>rotAxis(c,axis,ang));
    if(Math.random()<0.02){const X=v3.norm(P.rot[0]),Y=v3.norm(v3.sub(P.rot[1],v3.sc(X,v3.dot(X,P.rot[1]))));P.rot=[X,Y,v3.cross(X,Y)];}}
  // curl: 1 = ball. Uncurl once stopped after the finish (and in the menu)
  const wantCurl=(GAME.mode==='menu'||((GAME.mode==='finish'||GAME.mode==='ended')&&sp2<1.2))?0:1;P.curl=clamp(P.curl+(wantCurl?1:-1)*dt*4,0,1);
  P.shake=Math.max(0,P.shake-dt*2);P.inv=Math.max(0,P.inv-dt);
  if(!P.air&&sp2>6&&t===PT.CORD&&Math.random()<dt*20)spawnPuff([P.x,P.y+0.1,-P.s],1,fabricCol(),1);
  if(!P.air&&sp2>8&&t===PT.SATIN&&Math.random()<dt*15)spawnPuff([P.x,P.y+0.05,-P.s],1,PAL.white,0.6);
  collide();stepYarn(dt);
  if(GAME.mode==='run'){GAME.runT+=dt;if(P.s>=QH.L)finishRun();}
}
function fabricCol(){const[i,j]=cellOf(P.x,P.s);return patchColor(i,j,P.x,P.s,Math.random)[0];}
function scissorOpen(it,t){return 0.5+0.5*Math.sin(t*Math.PI*2/it.period+it.phase);}
function collide(){
  const c=ballCenter();
  for(const it of ITEMS){if(it.type==='yarn')continue;if(it.s<P.s-4)continue;if(it.s>P.s+4)break;if(!it.alive)continue;
    if(it.type==='bobbin'){const p=[it.x,it.y+it.h,-it.s];if(v3.len(v3.sub(p,c))<1.05){it.alive=false;GAME.bobbins++;GAME.score+=25;Sfx.bobbin(GAME.bobbins);spawnPuff(p,6,hex(it.col),1.5);HUD.flash();}}
    else if(it.type==='bumper'){const dx=P.x-it.x,ds=P.s-it.s,d=Math.hypot(dx,ds);if(d<1.55&&P.y-it.y<0.6){
        const nx=dx/(d||1),ns=ds/(d||1);P.x=it.x+nx*1.56;P.s=it.s+ns*1.56;const vn=P.vx*nx+P.vs*ns;
        if(vn<0){P.vx-=2.3*vn*nx;P.vs-=2.3*vn*ns;const sp=Math.hypot(P.vx,P.vs);if(sp<8){P.vx*=8/sp;P.vs*=8/sp;}
          if(!P.air){P.air=true;P.vy=2.6;P.airT=0;}it.squish=1;GAME.boings++;GAME.score+=5;Sfx.boing();popup('BOING!');}}}
    else if(it.type==='thimble'){const p=[it.x,it.y+it.h+0.35,-it.s];if(v3.len(v3.sub(p,c))<1.25){it.alive=false;GAME.thimbles++;GAME.score+=100;Sfx.thimble();popup('THIMBLE! +100',true);spawnPuff(p,10,hex('#e9bf52'),2);}}
    else if(it.type==='hoop'){if(P.prevS<it.s&&P.s>=it.s){const lat=Math.abs(P.x-it.x);
        if(lat<1.05&&P.y-it.y<2.4){GAME.hoops++;GAME.score+=50;P.vs+=3;Sfx.hoop();popup('HOOPED! +50');spawnPuff(ballCenter(),10,PAL.mustard,2);}
        else if(lat<1.85&&P.y-it.y<3.4){P.vs=-Math.abs(P.vs)*0.3;P.vx+=Math.sign(P.x-it.x||1)*3;Sfx.bonk();popup('CLONK!');P.shake=0.6;}}}
    else if(it.type==='pins'&&P.inv<=0&&Math.abs(P.s-it.s)<0.7&&P.y-it.y<1.3){for(const pn of it.pins)if(Math.abs(P.x-pn.x)<0.55){ouch();break;}}
    else if(it.type==='tapecase'){const dx=P.x-it.x,ds=P.s-it.s,d=Math.hypot(dx,ds);if(d<1.5&&P.y-it.y<1.6){const nx=dx/(d||1),ns=ds/(d||1);P.x=it.x+nx*1.5;P.s=it.s+ns*1.5;const vn=P.vx*nx+P.vs*ns;if(vn<0){P.vx-=1.5*vn*nx;P.vs-=1.5*vn*ns;Sfx.bonk();}}}
    else if(it.type==='scissors'&&P.inv<=0){const lat=(P.x-it.x)*it.dir,along=it.s-P.s;if(Math.abs(along)<1.0&&lat>-1.2&&lat<4.0&&P.y-it.y<1.6){
        const t=GAME.t,o=scissorOpen(it,t),o2=scissorOpen(it,t+0.05);snip(it,o2<o||o<0.35);}}
  }
}
function ouch(){P.inv=1.0;P.shake=0.8;P.vs=-Math.abs(P.vs)*0.2-1;GAME.ouches++;Sfx.ouch();const lost=Math.min(1,GAME.bobbins);GAME.bobbins-=lost;GAME.score=Math.max(0,GAME.score-lost*25);
  if(lost)LOOSE.push({p:ballCenter(),v:[(Math.random()-0.5)*4,5,-2],t:0,col:'#e2aa3c'});popup(lost?'OUCH! −1 bobbin':'OUCH!');spawnPuff(ballCenter(),8,HOGC.tip,2);}
// rolling yarn balls: wake when you get near, roll across and down the hill, bounce off the borders
function stepYarn(dt){for(const it of ITEMS){if(it.type!=='yarn')continue;if(!it.awake){if(it.s-P.s<60&&it.s>P.s-10)it.awake=true;else continue;}
    it.x+=it.vx*dt;it.s+=it.vs*dt;if(Math.abs(it.x)>16.5){it.x=Math.sign(it.x)*16.5;it.vx=-it.vx;}it.y=H(it.x,it.s);it.rot+=Math.hypot(it.vx,it.vs)/it.r*dt;
    const dx=P.x-it.x,ds=P.s-it.s,d=Math.hypot(dx,ds);if(d<it.r+0.6&&P.y-it.y<1.5){const nx=dx/(d||1),ns=ds/(d||1);P.x=it.x+nx*(it.r+0.61);P.s=it.s+ns*(it.r+0.61);
      const vn=(P.vx-it.vx)*nx+(P.vs-it.vs)*ns;if(vn<0){P.vx-=1.6*vn*nx;P.vs-=1.6*vn*ns;it.vx+=vn*nx*0.4;Sfx.bonk();popup('BONK!');spawnPuff(ballCenter(),8,hex(it.col),2);}}}}
function v3n2(a){const l=Math.hypot(a[0],a[1])||1;return[a[0]/l,a[1]/l];}
function snip(it,cut){
  P.inv=1.4;P.shake=1;const sp=Math.hypot(P.vx,P.vs);P.vs=-Math.abs(P.vs)*0.25-1;P.vx=(P.x>=it.x?1:-1)*3;
  if(cut){GAME.snips++;Sfx.snip();const lost=Math.min(3,GAME.bobbins);GAME.bobbins-=lost;GAME.score=Math.max(0,GAME.score-lost*25);
    for(let k=0;k<lost;k++)LOOSE.push({p:ballCenter(),v:[(Math.random()-0.5)*6,5+Math.random()*3,(Math.random()-0.5)*4-2],t:0,col:'#e2aa3c'});
    spawnPuff(ballCenter(),18,HOGC.spine,3);popup(lost?'SNIP! −'+lost+' bobbins':'SNIP!',true);it.snapT=GAME.t;}
  else{Sfx.bonk();spawnPuff(ballCenter(),8,HOGC.tip,2);popup('CLONK!');}
}
function finishRun(){
  GAME.mode='finish';GAME.finishT=GAME.runT;const tb=Math.max(0,Math.round((95-GAME.runT)*10));GAME.timeBonus=tb;
  const all=GAME.bobbins===GAME.total?500:0;GAME.allBonus=all;GAME.score+=tb+all;
  try{const b=+localStorage.getItem('qh_best')||0;GAME.best=b;GAME.newBest=GAME.score>b;if(GAME.newBest)localStorage.setItem('qh_best',GAME.score);}catch(e){}
  popup('FINISH!',true);Sfx.fanfare();setTimeout(()=>{if(GAME.mode==='finish')HUD.end();},TEST?50:2600);
}
function spawnPuff(p,n,col,spd){for(let i=0;i<n;i++){if(PARTS_P.length>500)PARTS_P.shift();
  PARTS_P.push({p:p.slice(),v:[(Math.random()-0.5)*spd,Math.random()*spd*0.9+0.5,(Math.random()-0.5)*spd],t:0,life:0.5+Math.random()*0.5,col,s:0.05+Math.random()*0.07});}}
function stepParticles(dt){
  for(const q of PARTS_P){q.t+=dt;q.v[1]-=6*dt;q.p=v3.mad(q.p,q.v,dt);}
  for(let i=PARTS_P.length-1;i>=0;i--)if(PARTS_P[i].t>PARTS_P[i].life)PARTS_P.splice(i,1);
  for(const l of LOOSE){l.t+=dt;if(l.landed)continue;l.v[1]-=12*dt;l.p=v3.mad(l.p,l.v,dt);const h=H(l.p[0],-l.p[2]);if(l.p[1]<h+0.3){l.p[1]=h+0.3;l.landed=true;}}
  for(const it of ITEMS)if(it.squish>0)it.squish=Math.max(0,it.squish-dt*3);
}
// autopilot for headless tests: go for bobbins, avoid scissors and bumpers, prefer corduroy when fast
function autopilot(inp){
  let tx=P.x,best=-1e9,danger=null;
  for(const it of ITEMS){if(it.s<P.s+1)continue;if(it.s>P.s+28)break;if(!it.alive)continue;const d=it.s-P.s;
    if(it.type==='bobbin'&&it.h<1.2){const reach=Math.abs(it.x-P.x)<d*0.9+1;const w=(reach?30:0)-d-Math.abs(it.x-P.x)*0.3;if(w>best){best=w;tx=it.x;}}
    if(it.type==='scissors'&&d<18){const c=it.x+it.dir*1.4;if(Math.abs(P.x-c)<3.6&&(!danger||d<danger.s-P.s))danger={s:it.s,x:c,w:3.8};}
    if(it.type==='bumper'&&d<9&&Math.abs(it.x-P.x)<2.2&&(!danger||d<danger.s-P.s))danger={s:it.s,x:it.x,w:2.4};
    if(it.type==='hoop'&&d<20){tx=it.x;best=1e9;}
    if(it.type==='pins'&&d<16){let gap=null,bw=0;const xs=[-17.5].concat(it.pins.map(p=>p.x)).concat([17.5]);for(let k=0;k<xs.length-1;k++){const w=xs[k+1]-xs[k];if(w>bw){bw=w;gap=(xs[k]+xs[k+1])/2;}}tx=gap;best=1e9;}}
  if(danger){const side=danger.x>P.x?-1:1;tx=danger.x+side*danger.w;if(Math.abs(tx)>15.5)tx=danger.x-side*danger.w;}
  tx=clamp(tx,-16,16);
  // steer in heading frame: positive steer pushes toward +x when heading downhill
  const err=tx-P.x;const r0=P.heading[1];
  inp.steer=clamp((err*1.2-P.vx*0.9)*Math.sign(r0||1),-1,1);
  const sp=Math.hypot(P.vx,P.vs);inp.push=sp<11?1:0;inp.brake=sp>17?0.6:0;
  if(P.vs<1&&GAME.mode==='run'){inp.push=1;}
}
