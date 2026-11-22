const { chromium } = require('/opt/npm-tools/node_modules/playwright');const path=require('path');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:640,height:400}});const p=await ctx.newPage();const logs=[];p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>logs.push('ERR '+e.message));
 const url='http://127.0.0.1:8765/mytharium.html';
 await p.goto(url);await p.waitForFunction(()=>window.MY&&window.MY.ready,null,{timeout:120000});await p.waitForTimeout(3000);
 await p.evaluate(()=>{MY.add('fern',0,15,{seed:5});MY.crit('pegasus',{morph:1});});
 await p.reload();await p.waitForFunction(()=>window.MY&&window.MY.ready,null,{timeout:120000});
 const st=await p.evaluate(()=>MY.state());console.log('after reload items',st.items,'crits',st.crits.map(c=>c.sp).join(','));
 console.log(logs.filter(l=>l.includes('ready')||l.includes('ERR')||l.includes('save')||l.includes('load')).join('\n'));await b.close();})();
