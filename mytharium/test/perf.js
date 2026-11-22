// relative timings under SwiftShader (software GL): node test/perf.js ../mytharium.html [quality]
const {chromium}=require('/opt/npm-tools/node_modules/playwright');const path=require('path');
(async()=>{const file=path.resolve(process.argv[2]);const q=process.argv[3]||'high';
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:1280,height:720}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{const t=m.text();if(/assets|ready in/.test(t))console.log(t);});
  await p.goto('file://'+file+'?test&seed=1&q='+q);await p.waitForFunction(()=>window.MY&&MY.ready,null,{timeout:240000});
  const run=async(name,setup)=>{const r=await p.evaluate(`(()=>{${setup};MY.step(.5);MY.perf(1);return MY.perf(5);})()`);console.log(name.padEnd(10),JSON.stringify(r));};
  await run('front',"MY.view('front')");await run('close',"MY.view('close')");
  for(const v of['front','close']){const r=await p.evaluate(`(()=>{MY.view('${v}');MY.step(.2);MY.prof(1);return [MY.prof(3),MY.prof(3,true)];})()`);console.log('stages',v,JSON.stringify(r[0]));console.log('  cached shadow',JSON.stringify(r[1]));}
  console.log('errs',JSON.stringify((await p.evaluate(()=>MY.state().errs)).concat(errs)).slice(0,300));await b.close();})();
