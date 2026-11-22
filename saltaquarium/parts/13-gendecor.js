
// ---------- reef equipment ----------
// propeller wavemaker on a magnet mount, facing out from the back glass (+z); ext.x: 0 body, 1 slotted cage, 2 hub
function genPowerhead(){const mb=new MB();
  tube(mb,[[0,0,-0.1],[0,0,1.1]],2.2,24,{cap:true,cap0:true,ext:()=>[0,0,0,0]});
  tube(mb,[[0,0,1.1],[0,0,1.9]],0.9,12,{ext:()=>[0,0,0,0]});
  tube(mb,[[0,0,1.8],[0,0,2.2],[0,0,6.4],[0,0,6.8]],[2.2,2.75,2.75,2.5],28,{cap0:true,ext:(t)=>[0,0,0,0]});
  tube(mb,[[0,0,6.7],[0,0,8.3],[0,0,8.6]],[2.55,2.55,2.3],28,{cap:true,capH:0.02,ext:()=>[1,0,0,0]});
  tube(mb,[[0,0,8.5],[0,0,8.9]],0.7,12,{cap:true,ext:()=>[2,0,0,0]});
  mb.normals();for(let i=0;i<mb.n;i++)mb.C[i*4+3]=1;return mb;}
// overflow box with a slotted comb at the waterline, and a return nozzle (loc-line elbow) beside it
function genOverflow(){const bx=new MB(),W=7,D=3.6,top=TK.wl+0.6;
  box(bx,[0,top/2,D],[W,top/2,D]);
  // comb teeth sticking up above the box's front lip
  for(let i=-6;i<=6;i++)box(bx,[i*1.05,TK.wl-0.3,D*2+0.05],[0.32,1.6,0.08]);
  bx.normals();for(let i=0;i<bx.n;i++)bx.C[i*4+3]=bx.P[i*3+1]<3?0.6:1;
  const noz=new MB();const segs=[[W+3,TK.wl+3,1],[W+3,TK.wl-1,1.5],[W+3.4,TK.wl-3.4,3.5],[W+4.4,TK.wl-4.4,6.5]];
  tube(noz,[[W+3,TK.top+3,1],...segs],0.75,14,{cap:true,cap0:true});
  for(let k=1;k<segs.length;k++){const c=segs[k];tube(noz,[[c[0],c[1]+0.4,c[2]-0.2],[c[0],c[1]-0.3,c[2]+0.25]],0.95,14,{cap:true,cap0:true});}
  noz.normals();for(let i=0;i<noz.n;i++)noz.C[i*4+3]=1;
  return{box:bx,noz};}
