// real loop (not ?test): does Smooth frame rate lower the resolution when frames are slow, and does MAX leave it alone?
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  for(const q of['med','max']){const ctx=await b.newContext({viewport:{width:800,height:450}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(/capped|rror/.test(m.text()))console.log(m.text());});
    await p.goto('http://127.0.0.1:8765/mytharium.html?q='+q);await p.waitForFunction(()=>window.MY&&MY.ready,null,{timeout:240000});
    const a=await p.evaluate(()=>MY.fr());await p.waitForTimeout(q==='max'?12000:45000);const z=await p.evaluate(()=>MY.fr());console.log(q,'start',JSON.stringify(a),'later',JSON.stringify(z),'errs',JSON.stringify(errs));await ctx.close();}
  await b.close();})();
