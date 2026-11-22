// Creature studio harness: renders each species alone from several angles and poses, writes one PNG per shot.
// usage: node test/studio.js ../mytharium.html outPrefix [species,...] [poses]  -> then python3 test/sheet.py outPrefix
const {chromium}=require('/opt/npm-tools/node_modules/playwright');const path=require('path');
(async()=>{const file=path.resolve(process.argv[2]);const out=process.argv[3]||'/tmp/studio';
  const SP=(process.argv[4]||'unicorn,foal,pegasus,faerie,mermaid,dragon,gnome,phoenix').split(',');const W=+process.env.W||900,H=+process.env.H||700;
  const POSES=process.argv[5]?JSON.parse(process.argv[5]):null;
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:W,height:H}});const errs=[];p.on('console',m=>{const t=m.text();if(/error|Error/.test(t))errs.push(t);if(t.startsWith('[MY]'))console.log('[log]',t);});p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+file+'?test&seed=1');await p.waitForFunction(()=>window.MY&&MY.ready,null,{timeout:240000});
  await p.evaluate(()=>{MY.time('day');const u=document.getElementById('ui');if(u)u.style.display='none';});
  const DEF={unicorn:['idle','walk'],foal:['idle'],pegasus:['wings','fly'],faerie:['hover','perch'],mermaid:['idle','swim','bask'],dragon:['idle','wings','fire'],gnome:['idle','wave'],phoenix:['perch','fly']};
  // angle sets: [yaw, pitch, dist multiplier, height frac]
  const ANG=[['side',0,.06,1],['q34',.75,.16,1],['front',Math.PI/2,.08,1],['back',-.8,.3,1],['face',.9,.08,.3]];
  for(const sp of SP){const poses=(POSES&&POSES[sp])||DEF[sp]||['idle'];
    for(const pose of poses){const info=await p.evaluate(([sp,pose])=>{const id=MY.studio(sp,pose);const c=MY.get(id);c.yaw=0;MY.step(.4);const H=c.out.H;let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(const q of H)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],q[k]);mx[k]=Math.max(mx[k],q[k]);}mn[1]=Math.min(mn[1],c.pos[1]);const ext=Math.max(mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2])*1.25+.5*c.size;return{id,ext,ctr:[(mn[0]+mx[0])/2,(mn[1]+mx[1])/2,(mn[2]+mx[2])/2],head:c.headP||c.pos,fov:MY._eval('CAM.fov')};},[sp,pose]);
      const angs=pose===poses[0]?ANG:ANG.slice(0,2);
      for(const[an,yaw,pitch,dk]of angs){await p.evaluate(([info,yaw,pitch,dk,an])=>{const tgt=an==='face'?info.head:info.ctr;
          MY.cam({target:tgt,yaw,pitch,dist:Math.max(2.5,info.ext*.62/Math.tan(info.fov/2)*dk)});MY.frame();},[info,yaw,pitch,dk,an]);
        const f=`${out}-${sp}-${pose}-${an}.png`;await p.screenshot({path:f});console.log('[shot]',f);}}}
  const st=await p.evaluate(()=>MY.state());console.log('errs',JSON.stringify(st.errs.concat([])),'page',JSON.stringify(errs.slice(0,5)));await b.close();})();
