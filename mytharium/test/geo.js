// node geometry test: stubs the DOM and GL, builds creature meshes, writes OBJ files with region colours to /home/claude/out/geo
const fs=require('fs');const path=require('path');
const which=process.argv.slice(2);
let pre=`global.document={getElementById:()=>({getContext:()=>gl,classList:{remove(){}},addEventListener(){}})};
global.location={search:''};global.window={addEventListener(){}};global.matchMedia=()=>({matches:false});
const gl=new Proxy({},{get:(t,k)=>k in t?t[k]:(typeof k==='string'&&k===k.toUpperCase()?1:()=>({}))});\n`;
let src=['01-core.js','10-sdf.js','11-creatures.js'].map(f=>fs.readFileSync(path.join(__dirname,'../parts',f),'utf8')).join('\n');
src=src.replace("const gl=canvas.getContext","const gl0=canvas.getContext");
src+=`
const RC={0:[.85,.8,.75],1:[.15,.12,.1],2:[1,.9,.5],3:[.05,.05,.1],4:[.3,.6,.5],5:[.9,.8,.4],6:[.6,.3,.3],7:[.95,.75,.65],8:[.3,.4,.8],9:[.95,.95,.85],10:[.6,.45,.45],11:[1,.7,.2],12:[.5,.8,.9],13:[.8,.3,.3],14:[.9,.3,.2],15:[.9,.6,.55]};
const W=${JSON.stringify(which)};
for(const f of[unicornDef,faerieDef,mermaidDef,dragonDef,gnomeDef,phoenixDef]){const d=f();if(W.length&&!W.includes(d.name))continue;const mb=buildCreatureMesh(d);
  let o='';for(let i=0;i<mb.n;i++){const c=RC[mb.E[i*4+3]]||[1,0,1];const ao=mb.C[i*4+3];o+='v '+mb.P[i*3].toFixed(4)+' '+mb.P[i*3+1].toFixed(4)+' '+mb.P[i*3+2].toFixed(4)+' '+(c[0]*ao).toFixed(3)+' '+(c[1]*ao).toFixed(3)+' '+(c[2]*ao).toFixed(3)+'\\n';}
  for(let t=0;t<mb.I.length;t+=3)o+='f '+(mb.I[t]+1)+' '+(mb.I[t+1]+1)+' '+(mb.I[t+2]+1)+'\\n';require('fs').writeFileSync('/home/claude/out/geo/'+d.name+'.obj',o);}
`;
fs.writeFileSync('/tmp/geo_run.js',pre+src);require('/tmp/geo_run.js');
