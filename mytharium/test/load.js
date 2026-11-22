// start-up responsiveness in the real loop: longest stretch the main thread was blocked, and a picture of the loading screen
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:900,height:560}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(/ready in|rror/.test(m.text()))console.log(m.text());});
  await p.addInitScript(()=>{window.__gap={max:0,n:0,over:[]};let t=performance.now();setInterval(()=>{const n=performance.now(),d=n-t;t=n;if(window.MY&&MY.ready)return;window.__gap.n++;if(d>window.__gap.max)window.__gap.max=d;if(d>400)window.__gap.over.push(Math.round(d));},10);});
  await p.goto('http://127.0.0.1:8765/mytharium.html?q=high');await p.waitForTimeout(1500);await p.screenshot({path:process.argv[2]||'/tmp/load.png'});
  await p.waitForFunction(()=>window.MY&&MY.ready,null,{timeout:240000});const g=await p.evaluate(()=>window.__gap);
  console.log('longest block ms',Math.round(g.max),'blocks over 400ms',JSON.stringify(g.over),'timer ticks',g.n,'errs',JSON.stringify(errs));await b.close();})();
