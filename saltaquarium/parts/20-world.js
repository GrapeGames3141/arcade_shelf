// ============================================================
//  WORLD: substrate, catalog, items, height maps, picking
// ============================================================
const SX=161,SZ=73;
const sand=new Float32Array(SX*SZ),topm=new Float32Array(SX*SZ),walkm=new Float32Array(SX*SZ),aom=new Float32Array(SX*SZ);
const gxf=x=>(x-TK.x0)/(TK.x1-TK.x0)*(SX-1),gzf=z=>(z-TK.z0)/(TK.z1-TK.z0)*(SZ-1);
const wxf=i=>TK.x0+i/(SX-1)*(TK.x1-TK.x0),wzf=j=>TK.z0+j/(SZ-1)*(TK.z1-TK.z0);
function samp(a,x,z){let fx=clamp(gxf(x),0,SX-1.001),fz=clamp(gzf(z),0,SZ-1.001);const i=Math.floor(fx),j=Math.floor(fz);fx-=i;fz-=j;const k=j*SX+i;
  return lerp(lerp(a[k],a[k+1],fx),lerp(a[k+SX],a[k+SX+1],fx),fz);}
const sandH=(x,z)=>samp(sand,x,z),topH=(x,z)=>samp(topm,x,z),walkH=(x,z)=>samp(walkm,x,z);
function groundAt(x,z){const s=sandH(x,z),w=walkH(x,z);return w-s<=2.3?w:s;}
function topNormal(x,z){const e=0.6;return V.norm([topH(x-e,z)-topH(x+e,z),2*e,topH(x,z-e)-topH(x,z+e)]);}
function sandShape(kind){for(let j=0;j<SZ;j++)for(let i=0;i<SX;i++){const x=wxf(i),z=wzf(j);let h;
  if(kind==='flat')h=4.2+fbm3(x*0.05,z*0.05,7.7,3)*0.5;
  else{const back=Math.pow(sstep(19,-20,z),1.1);h=2.8+3.6*back+fbm3(x*0.055,z*0.055,3.3,3)*0.9+Math.exp(-((x+30)**2+(z+8)**2)/110)*1.1+Math.exp(-((x-28)**2+(z+9)**2)/130)*1.0;
    h+=0.12*Math.sin(x*0.9+z*0.35+fbm3(x*0.2,z*0.2,1,2)*3);}
  sand[j*SX+i]=clamp(h,1.2,20);}}

// ---------- sand mesh (dynamic) ----------
let sandMesh=null;const SANDN=SX*SZ+SX*2+SZ*4+SX*2;
const sandPos=new Float32Array(SANDN*3),sandNor=new Float32Array(SANDN*3);
function fillSand(){let v=0;const put=(x,y,z,nx,ny,nz)=>{sandPos[v*3]=x;sandPos[v*3+1]=y;sandPos[v*3+2]=z;sandNor[v*3]=nx;sandNor[v*3+1]=ny;sandNor[v*3+2]=nz;v++;};
  const dx=(TK.x1-TK.x0)/(SX-1),dz=(TK.z1-TK.z0)/(SZ-1);
  for(let j=0;j<SZ;j++)for(let i=0;i<SX;i++){const k=j*SX+i,hl=sand[j*SX+Math.max(0,i-1)],hr=sand[j*SX+Math.min(SX-1,i+1)],hd=sand[Math.max(0,j-1)*SX+i],hu=sand[Math.min(SZ-1,j+1)*SX+i];
    const n=V.norm([(hl-hr)/(2*dx),1,(hd-hu)/(2*dz)]);put(wxf(i),sand[k],wzf(j),n[0],n[1],n[2]);}
  for(let i=0;i<SX;i++){put(wxf(i),sand[(SZ-1)*SX+i],TK.z1,0,0,1);put(wxf(i),0,TK.z1,0,0,1);}
  for(let j=0;j<SZ;j++){put(TK.x0,sand[j*SX],wzf(j),-1,0,0);put(TK.x0,0,wzf(j),-1,0,0);}
  for(let j=0;j<SZ;j++){put(TK.x1,sand[j*SX+SX-1],wzf(j),1,0,0);put(TK.x1,0,wzf(j),1,0,0);}
  for(let i=0;i<SX;i++){put(wxf(i),sand[i],TK.z0,0,0,-1);put(wxf(i),0,TK.z0,0,0,-1);}}
function buildSandMesh(){fillSand();const idx=[];
  for(let j=0;j<SZ-1;j++)for(let i=0;i<SX-1;i++){const k=j*SX+i;idx.push(k,k+SX,k+SX+1,k,k+SX+1,k+1);}
  let b=SX*SZ;for(let i=0;i<SX-1;i++){const a=b+i*2;idx.push(a,a+1,a+3,a,a+3,a+2);}
  b+=SX*2;for(let j=0;j<SZ-1;j++){const a=b+j*2;idx.push(a,a+1,a+3,a,a+3,a+2);}
  b+=SZ*2;for(let j=0;j<SZ-1;j++){const a=b+j*2;idx.push(a+2,a+3,a+1,a+2,a+1,a);}
  b+=SZ*2;for(let i=0;i<SX-1;i++){const a=b+i*2;idx.push(a+2,a+3,a+1,a+2,a+1,a);}
  const uv=new Float32Array(SANDN*2),col=new Float32Array(SANDN*4).fill(1),ext=new Float32Array(SANDN*4);
  for(let v=SX*SZ;v<SANDN;v++)ext[v*4]=1;
  sandMesh=mkMesh({pos:sandPos,nor:sandNor,uv,col,ext,idx},true);}
function updateSandMesh(){fillSand();gl.bindBuffer(gl.ARRAY_BUFFER,sandMesh.bufs.aPos);gl.bufferSubData(gl.ARRAY_BUFFER,0,sandPos);
  gl.bindBuffer(gl.ARRAY_BUFFER,sandMesh.bufs.aNor);gl.bufferSubData(gl.ARRAY_BUFFER,0,sandNor);}
const sandTex=mkTex(SX,SZ,gl.RG16F,gl.RG,gl.FLOAT,gl.LINEAR);const sandTexData=new Float32Array(SX*SZ*2);
function uploadSandTex(){for(let k=0;k<SX*SZ;k++){sandTexData[k*2]=sand[k];sandTexData[k*2+1]=aom[k];}
  gl.bindTexture(gl.TEXTURE_2D,sandTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RG16F,SX,SZ,0,gl.RG,gl.FLOAT,sandTexData);}

// ---------- catalog ----------
// colours are written as sRGB hex (as picked from photos) and turned into linear values for the shaders
const LIN=h=>{const n=parseInt(h.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255].map(c=>Math.pow(c/255,2.2));};
const M=(n,c1,c2,c3,fl,fk,k)=>({n,c1:LIN(c1),c2:LIN(c2),c3:LIN(c3||c1),fl:[...LIN(fl||'#ffffff'),fk||0],k:k||0,hex:[c1,c2,c3||c1]});
const CAT={
  // stony corals
  acro:{cat:'sps',name:'Acropora',sub:'Branching SPS, coloured tips',prog:'coral',gen:s=>genAcro(s,false),scale:1,smin:.6,smax:1.6,place:'epi',noSway:true,
    morphs:[M('Purple tips','#8fa3c8','#5a2d8a','#b8c6e0','#3a8cff',.7),M('Green slimer','#6a9248','#9cc45a','#a7c48a','#58ff40',.6),M('Strawberry','#d88a96','#c24e6a','#f0c0c8','#ff4a6a',.6),M('Tenuis blue','#7fa6d8','#2f5fd0','#bcd2f0','#30a0ff',.8)]},
  bird:{cat:'sps',name:'Birdsnest',sub:'Fine pointed branches',prog:'coral',gen:s=>genAcro(s,true),scale:1,smin:.6,smax:1.6,place:'epi',noSway:true,
    morphs:[M('Pink','#e2a0b0','#f0c8d0','#f5d5dc','#ff6080',.4),M('Green','#a8c87a','#d0e8a0','#c0d8a0','#70ff50',.55)]},
  monti:{cat:'sps',name:'Montipora Cap',sub:'Whorled plates',prog:'coral',gen:s=>genMonti(s),scale:1,smin:.6,smax:1.6,place:'epi',noSway:true,
    morphs:[M('Orange','#e0782a','#f8c080',0,'#ff8a30',.85),M('Red','#a8302a','#d06a50',0,'#ff3020',.4),M('Green','#6a9a3a','#a8d070',0,'#60ff30',.6),M('Purple','#6a3c80','#a080c0',0,'#9050ff',.4)]},
  brain:{cat:'sps',name:'Brain Coral',sub:'Meandering dome',prog:'coral',gen:s=>genBrain(s),scale:1,smin:.6,smax:1.6,place:'epi',noSway:true,
    morphs:[M('Green & brown','#7a5a3a','#4e6e34',0,'#60ff40',.35),M('Red & green','#8a3a30','#527e42',0,'#50ff40',.3),M('Teal','#3a5a50','#60a8a0',0,'#30ffc0',.7,1),M('Tan','#a48a62','#c8b48a',0,'#c0ff80',.3,1)]},
  torch:{cat:'sps',name:'Torch Coral',sub:'Long tentacles, round tips',prog:'coral',gen:s=>genEuphyllia(s,0),scale:1,smin:.6,smax:1.5,place:'epi',
    morphs:[M('Green tips','#8a7a4a','#b8e070','#6a5030','#80ff40',.7),M('Gold','#a08850','#f0d070','#6a5030','#ffd040',.7),M('Purple','#7a5a8a','#d0d8a0','#5a4050','#c0ff80',.6)]},
  hammer:{cat:'sps',name:'Hammer Coral',sub:'Anchor-shaped tips',prog:'coral',gen:s=>genEuphyllia(s,1),scale:1,smin:.6,smax:1.5,place:'epi',
    morphs:[M('Green','#6a8a5a','#a0d890','#5a5040','#60ff60',.9),M('Gold','#b89060','#f0d8a0','#6a5030','#ffe080',.5),M('Orange','#c88a50','#e8c880','#6a5030','#ffc060',.5)]},
  frog:{cat:'sps',name:'Frogspawn Coral',sub:'Knobbed tentacle tips',prog:'coral',gen:s=>genEuphyllia(s,2),scale:1,smin:.6,smax:1.5,place:'epi',
    morphs:[M('Green tips','#7a8a5a','#c8e888','#5a5040','#80ff60',.8),M('Purple tips','#8a7a8a','#d4a8e4','#5a4a50','#e080ff',.6)]},
  candy:{cat:'sps',name:'Candy Cane Coral',sub:'Round polyps on tubes',prog:'coral',gen:s=>genCandy(s),scale:1,smin:.6,smax:1.6,place:'epi',noSway:true,
    morphs:[M('Neon green','#6a5434','#7ad040','#8a7a5a','#80ff40',.65),M('Brown & cream','#4e3a26','#c8c080','#6a5a40','#e0ff90',.4)]},
  goni:{cat:'sps',nightClose:true,name:'Goniopora',sub:'Long swaying polyps',prog:'coral',gen:s=>genGoni(s),scale:1,smin:.6,smax:1.5,place:'epi',
    morphs:[M('Green','#6a8a4a','#9ad070','#e0f4c0','#80ff60',.7),M('Red','#8a3a3a','#d06050','#f4c8b0','#ff6060',.4),M('Purple','#6a4a7a','#a878c8','#e8d0f4','#c080ff',.5)]},
  chalice:{cat:'sps',name:'Chalice Coral',sub:'Plates with bright eyes',prog:'coral',gen:s=>genMonti(s,CSP.chalice),scale:1,smin:.6,smax:1.5,place:'epi',noSway:true,
    morphs:[M('Watermelon','#4e6e38','#e04060','#f0a020','#60ff60',.8),M('Mummy eye','#6a3050','#40d0a0','#f08020','#ff80c0',.7),M('Lime','#38604a','#c8f040','#60c0a0','#80ff80',.6)]},
  duncan:{cat:'sps',name:'Duncan Coral',sub:'Discs on tall stalks',prog:'coral',gen:s=>genDuncan(s),scale:1,smin:.6,smax:1.5,place:'epi',
    morphs:[M('Green','#5a6a4a','#78c060','#d0eca8','#80ff60',.8),M('Purple','#5a4a5a','#a874a8','#e8c8e0','#e080ff',.5)]},
  acan:{cat:'sps',name:'Acan Coral',sub:'Fleshy rainbow polyps',prog:'coral',gen:s=>genAcan(s),scale:1,smin:.6,smax:1.5,place:'epi',noSway:true,
    morphs:[M('Rainbow','#c03030','#30a040','#e0a020','#ff6060',.6),M('Purple & green','#7a3a9a','#40b060','#e070c0','#c080ff',.6),M('Red & orange','#a02020','#e06020','#f0c040','#ff8060',.5)]},
  sun:{cat:'sps',name:'Sun Coral',sub:'Orange cups, yellow tentacles',prog:'coral',gen:s=>genSun(s),scale:1,smin:.6,smax:1.5,place:'epi',
    morphs:[M('Orange','#d86018','#f08a20','#f8c838',0,0),M('Black','#202024','#2a2a30','#d8c060',0,0)]},
  elegance:{cat:'sps',name:'Elegance Coral',sub:'Long tentacles, pink tips',prog:'coral',gen:s=>genElegance(s),scale:1,smin:.6,smax:1.4,place:'sand',
    morphs:[M('Classic','#8a9a80','#c85898','#5a9a50','#ff60c0',.5),M('Green tips','#8a9a80','#a0e060','#7a6a50','#80ff60',.6)]},
  scroll:{cat:'sps',name:'Scroll Coral',sub:'Curling yellow plates',prog:'coral',gen:s=>genScroll(s),scale:1,smin:.6,smax:1.5,place:'epi',noSway:true,
    morphs:[M('Yellow','#a8983a','#e0d050','#f0e8a0','#e0ff60',.5),M('Green','#5a7a3a','#98c060','#c8e0a0','#80ff60',.5)]},
  bubble:{cat:'sps',nightClose:true,name:'Bubble Coral',sub:'Pearly grape-like bubbles',prog:'coral',gen:s=>genBubble(s),scale:1,smin:.6,smax:1.5,place:'epi',
    morphs:[M('White','#e0dccc','#f0f0e0','#806a50','#e0ffd0',.1),M('Green','#b8d0a0','#d8e8c0','#605a40','#80ff60',.5)]},
  plate:{cat:'sps',name:'Plate Coral',sub:'Free-living, lies on the sand',prog:'coral',gen:s=>genPlate(s),scale:1,smin:.6,smax:1.4,place:'sand',noSway:true,
    morphs:[M('Green','#5a7a44','#a8c080','#d070c0','#60ff40',.45),M('Orange','#c87a3a','#e8b080','#f0e0c0','#ff9040',.5)]},
  // soft corals
  zoa:{cat:'soft',name:'Zoanthids',sub:'Colourful polyp colony',prog:'coral',gen:s=>genZoa(s),scale:1,smin:.6,smax:1.6,place:'epi',
    morphs:[M('Rasta','#e8762a','#58b030','#e8d040','#80ff30',1),M('Eagle eye','#58c040','#e86020','#4080e0','#70ff40',1),M('Fire & ice','#3070e0','#e03028','#f0e080','#ff3020',.8),M('Utter chaos','#a050c0','#f08020','#40c080','#ff8040',.8)]},
  shroom:{cat:'soft',name:'Mushrooms',sub:'Discosoma, Ricordea, Rhodactis',prog:'coral',gen:s=>genShroom(s),scale:1,smin:.6,smax:1.6,place:'epi',
    morphs:[M('Blue mushroom','#4a5aa0','#8090d0','#c0c8e8','#4060ff',.5,0),M('Red mushroom','#a03030','#d06a5a','#f0a080','#ff3020',.6,0),M('Ricordea','#4aa040','#90d060','#f08020','#60ff40',1,1),M('Rhodactis','#5a6a40','#90a060','#405030','#80ff40',.3,2)]},
  leather:{cat:'soft',name:'Toadstool Leather',sub:'Big folded cap',prog:'coral',gen:s=>genLeather(s),scale:1,smin:.6,smax:1.4,place:'epi',
    morphs:[M('Tan','#b8a070','#8a7448','#d8ccb0','#c0ff80',.2),M('Green','#8a9a60','#b0c080','#d8d0b0','#80ff40',.5)]},
  xenia:{cat:'soft',nightClose:true,name:'Pulsing Xenia',sub:'Polyps open and close',prog:'coral',gen:s=>genXenia(s),scale:1,smin:.6,smax:1.5,place:'epi',
    morphs:[M('Pom-pom','#c4a898','#ead8cc','#b89a8a','#ffd0c0',.15),M('Blue','#8aa0c8','#c0d0f0','#90a0b8','#4080ff',.4)]},
  gsp:{cat:'soft',nightClose:true,name:'Green Star Polyps',sub:'Glowing mat',prog:'coral',gen:s=>genGSP(s),scale:1,smin:.6,smax:1.6,place:'epi',
    morphs:[M('Green star','#5a2a5a','#60d040',0,'#60ff30',1.2),M('Neon','#3a2a5a','#a0f070',0,'#a0ff40',1.2)]},
  kenya:{cat:'soft',name:'Kenya Tree',sub:'Branching soft coral',prog:'coral',gen:s=>genKenya(s),scale:1,smin:.6,smax:1.6,place:'epi',
    morphs:[M('Tan','#b89a70','#7a6448','#000000','#e0ff90',.15),M('Green','#9aa070','#5a7a40','#000000','#80ff60',.4)]},
  clove:{cat:'soft',nightClose:true,name:'Clove Polyps',sub:'Feathery flowers on a mat',prog:'coral',gen:s=>genGSP(s,true),scale:1,smin:.6,smax:1.5,place:'epi',
    morphs:[M('Brown & green','#6a5a40','#9ab070','#e0f0c0','#a0ff80',.5),M('Purple','#5a4050','#a080b0','#e8d8f0','#c080ff',.4)]},
  fan:{cat:'soft',name:'Sea Fan',sub:'Gorgonian lattice',prog:'coral',gen:s=>genFan(s),scale:1,smin:.6,smax:1.4,place:'epi',
    morphs:[M('Purple','#7a3a7a','#d0a0d0',0,'#c050ff',.2),M('Yellow','#c8a040','#f0e0a0',0,'#ffd040',.2)]},
  // anemones, clams and other invertebrates that stay put
  bta:{cat:'anem',nightClose:true,name:'Bubble-tip Anemone',sub:'Clownfish host',prog:'coral',gen:s=>genBTA(s),scale:1,smin:.6,smax:1.4,place:'epi',host:true,
    morphs:[M('Rose','#c87878','#e8a8a0','#9a5a5a','#ff6070',.4),M('Green','#8a9a60','#b8c890','#6a7a50','#80ff60',.9),M('Tan','#a08060','#c8a880','#7a6040','#e0ff90',.3)]},
  carpet:{cat:'anem',name:'Carpet Anemone',sub:'Huge ruffled disc',prog:'coral',gen:s=>genCarpet(s),scale:1,smin:.6,smax:1.3,place:'sand',host:true,
    morphs:[M('Green','#46783a','#7aa45a','#305020','#60ff40',.4),M('Blue','#4a70c0','#90b0e8','#203050','#4090ff',.55),M('Purple','#7a50a0','#c090d8','#402050','#c060ff',.5)]},
  flower:{cat:'anem',name:'Rock Flower Anemone',sub:'Small and vivid',prog:'coral',gen:s=>genFlower(s),scale:1,smin:.6,smax:1.5,place:'epi',
    morphs:[M('Orange','#e07020','#60b040','#f0d060','#80ff40',.8),M('Red','#c02828','#e8a020','#40a0c0','#ff6020',.6),M('Blue','#2850b0','#d04080','#f0c040','#4080ff',.6)]},
  clam:{cat:'anem',name:'Giant Clam',sub:'Iridescent mantle',prog:'coral',gen:s=>genClam(s,false),scale:1,smin:.6,smax:1.5,place:'epi',noSway:true,retract:true,
    morphs:[M('Maxima blue','#0a3a8a','#28a0c8','#103060','#30a0ff',.5,0),M('Crocea purple','#4a2a9a','#2a70d8','#1a1050','#5080ff',.5,0),M('Derasa','#4a5a5a','#7a8a7a','#2a60a0','#60a0ff',.2,2),M('Squamosa','#5a4a2a','#a08a50','#2a2010','#a0ff80',.1,0)]},
  disco:{cat:'anem',name:'Disco Clam',sub:'Flashing lips',prog:'coral',gen:s=>genClam(s,true),scale:1,smin:.7,smax:1.4,place:'epi',retract:true,
    morphs:[M('Red','#a81810','#e05040')]},
  duster:{cat:'anem',name:'Feather Duster',sub:'Snaps into its tube',prog:'coral',gen:s=>genDuster(s),scale:1,smin:.6,smax:1.4,place:'epi',retract:true,
    morphs:[M('Banded','#d8c8b0','#8a5a40','#f0e8e0'),M('Maroon','#e0d0d0','#6a2030','#f0e0e0')]},
  sponge:{cat:'anem',name:'Tube Sponge',sub:'Bright open tubes',prog:'coral',gen:s=>genSponge(s),scale:1,smin:.6,smax:1.5,place:'epi',noSway:true,
    morphs:[M('Orange','#e06a10','#e06a10'),M('Yellow','#e0c020','#e0c020'),M('Purple','#7a3a8a','#7a3a8a')]},
  // algae and seagrass
  grass:{cat:'algae',name:'Turtle Grass',sub:'Seagrass blades',prog:'coral',gen:s=>genGrass(s),scale:1,smin:.6,smax:1.4,place:'sand',morphs:[M('Green','#4a7a2a','#6a9a3a')]},
  halimeda:{cat:'algae',name:'Halimeda',sub:'Calcified segments',prog:'coral',gen:s=>genHalimeda(s),scale:1,smin:.6,smax:1.6,place:'epi',morphs:[M('Green','#7a9a4a','#c8d8b0')]},
  redmacro:{cat:'algae',name:'Red Gracilaria',sub:'Bushy red macro',prog:'coral',gen:s=>genRedMacro(s),scale:1,smin:.6,smax:1.5,place:'epi',morphs:[M('Red','#7a1a28','#b04050')]},
  // rock
  live:{cat:'hard',name:'Live Rock',sub:'Coralline-crusted, porous',prog:'std',mat:2,v:0,gen:s=>genRock(s,0),scale:9,smin:4,smax:17,solid:true,tilt:true,lift:true},
  dry:{cat:'hard',name:'Dry Reef Rock',sub:'Bone white, branchy',prog:'std',mat:2,v:1,gen:s=>genRock(s,1),scale:8,smin:4,smax:16,solid:true,tilt:true,lift:true},
  shelf:{cat:'hard',name:'Shelf Rock',sub:'Flat ledges for corals',prog:'std',mat:2,v:2,gen:s=>genRock(s,2),scale:9,smin:4,smax:16,solid:true,tilt:true,lift:true},
  rubble:{cat:'hard',name:'Reef Rubble',sub:'Old coral pieces',prog:'std',mat:2,v:3,gen:s=>genRock(s,3),scale:7,smin:4,smax:12,solid:true},
  arch:{cat:'hard',name:'Rock Arch',sub:'Swim-through bridge',prog:'std',mat:2,v:0,gen:s=>genArch(s),scale:11,smin:6,smax:18,solid:true,tunnel:true,lift:true},
  // equipment
  wave:{cat:'decor',name:'Wavemaker',sub:'Pulsing flow pump on the back glass',prog:'std',mat:12,v:0,gen:()=>genPowerhead(),scale:1,smin:.8,smax:1.3,place:'wall',flow:1},
  overflow:{cat:'decor',name:'Overflow & Return',sub:'Weir box with a return nozzle',prog:'multi',gen:()=>genOverflow(),scale:1,smin:1,smax:1,place:'back',flow:.5},
};
const CATS={sps:'Stony',soft:'Soft',anem:'Anemones & more',algae:'Algae',hard:'Rock',decor:'Equipment',sand:'Sand'};
const morphOf=it=>{const m=CAT[it.kind].morphs;return m?m[((it.morph??(it.seed%m.length))%m.length+m.length)%m.length]:null;};

// ---------- items ----------
let items=[],nextId=1;const GEO=new Map();
function geoKey(it){return it.kind+':'+it.seed;}
function geoFor(it){const k=geoKey(it);let g=GEO.get(k);if(g)return g;const c=CAT[it.kind];const out=c.gen(it.seed,it);
  if(c.prog==='multi'){g={parts:[{mb:out.box,mat:11,v:0,tint:[.02,.02,.02],rough:.3},{mb:out.noz,mat:12,v:0,tint:[.02,.02,.02],rough:.4}]};
    for(const p of g.parts)p.mesh=p.mb.mesh();g.mb=out.box;}
  else{g={mb:out,mesh:out.mesh(),caps:out.caps||null};}
  const b=(g.mb||out).bounds();g.mn=b.mn;g.mx=b.mx;g.c=V.mul(V.add(b.mn,b.mx),0.5);g.r=V.len(V.sub(b.mx,b.mn))*0.5;
  GEO.set(k,g);return g;}
function itemY(it){const c=CAT[it.kind];
  if(c.place==='wall')return TK.wl-13+(it.lift||0);
  if(c.place==='back')return -0.1;
  if(c.place==='epi'){const t=it._topEx?samp(it._topEx,it.x,it.z):topH(it.x,it.z);return t-0.35;}
  if(c.place==='sand')return sandH(it.x,it.z)-0.15;
  return sandH(it.x,it.z)-0.3+(it.lift||0);}
function updateItem(it){const c=CAT[it.kind];
  if(c.place==='wall'){it.z=TK.z0+0.05;it.rot=0;it.x=clamp(it.x,TK.x0+4,TK.x1-4);it.lift=clamp(it.lift||0,-26,8);}
  if(c.place==='back'){it.z=TK.z0+0.05;it.rot=0;it.x=clamp(it.x,TK.x0+9,TK.x1-14);}
  it.geo=geoFor(it);it.y=itemY(it);
  it.M=M4.trs([it.x,it.y,it.z],it.rot,it.scale,c.tilt?it.tilt||0:0,0);
  if(!c.place||c.place==='epi'||c.place==='sand'){// keep the whole item inside the glass
    const g=it.geo;let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(let k=0;k<8;k++){const p=M4.xf(it.M,[k&1?g.mx[0]:g.mn[0],k&2?g.mx[1]:g.mn[1],k&4?g.mx[2]:g.mn[2]]);x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[2]);z1=Math.max(z1,p[2]);}
    const m=c.prog==='coral'?-0.5:0.4;let dx=0,dz=0;if(x0<TK.x0+m)dx=TK.x0+m-x0;else if(x1>TK.x1-m)dx=TK.x1-m-x1;if(z0<TK.z0+m)dz=TK.z0+m-z0;else if(z1>TK.z1-m)dz=TK.z1-m-z1;
    if(x1-x0>TK.x1-TK.x0-2*m)dx=-(x0+x1)/2;if(z1-z0>TK.z1-TK.z0-2*m)dz=-(z0+z1)/2;
    if(dx||dz){it.x+=dx;it.z+=dz;it.y=itemY(it);it.M=M4.trs([it.x,it.y,it.z],it.rot,it.scale,c.tilt?it.tilt||0:0,0);}}
  it.Nm=M4.nmat(it.M);
  it.wc=M4.xf(it.M,it.geo.c);it.wr=it.geo.r*it.scale;}
function addItem(kind,x,z,o={}){const c=CAT[kind];if(!c)return null;
  const it={id:nextId++,kind,seed:o.seed??Math.floor(Math.random()*1e6),x:clamp(x,TK.x0+2,TK.x1-2),z:clamp(z,TK.z0+2,TK.z1-2),rot:o.rot??Math.random()*TAU,scale:o.scale??c.scale,tilt:o.tilt||0,lift:o.lift||0,morph:o.morph,retract:0,retractT:0};
  items.push(it);updateItem(it);return it;}
function removeItem(it){items=items.filter(i=>i!==it);}
// emitters in world space (bubbles): none in a reef tank by default
function emitters(){return[];}

// ---------- height maps ----------
let topDirty=true;
function rasterItem(it,arr,M,lowLim,fixY){const P=it.geo.mb.P,I=it.geo.mb.I;const n=P.length/3;const wp=new Float32Array(n*3);const lim=lowLim===undefined?1e9:lowLim;
  for(let i=0;i<n;i++){const x=P[i*3],y=P[i*3+1],z=P[i*3+2];wp[i*3]=M[0]*x+M[4]*y+M[8]*z+M[12];wp[i*3+1]=M[1]*x+M[5]*y+M[9]*z+M[13];wp[i*3+2]=M[2]*x+M[6]*y+M[10]*z+M[14];
    if(wp[i*3+1]>lim)continue;const gi=Math.round(gxf(wp[i*3])),gj=Math.round(gzf(wp[i*3+2]));if(gi>=0&&gi<SX&&gj>=0&&gj<SZ){const k=gj*SX+gi;const yy=fixY===undefined?Math.min(wp[i*3+1],TK.wl):fixY;if(yy>arr[k])arr[k]=yy;}}
  for(let t=0;t<I.length;t+=3){const a=I[t]*3,b=I[t+1]*3,c=I[t+2]*3;if(Math.min(wp[a+1],wp[b+1],wp[c+1])>lim)continue;
    const ax=gxf(wp[a]),az=gzf(wp[a+2]),bx=gxf(wp[b]),bz=gzf(wp[b+2]),cx=gxf(wp[c]),cz=gzf(wp[c+2]);
    const i0=Math.max(0,Math.ceil(Math.min(ax,bx,cx))),i1=Math.min(SX-1,Math.floor(Math.max(ax,bx,cx))),j0=Math.max(0,Math.ceil(Math.min(az,bz,cz))),j1=Math.min(SZ-1,Math.floor(Math.max(az,bz,cz)));
    if(i1<i0||j1<j0)continue;const den=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(den)<1e-9)continue;
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const w1=((bz-cz)*(i-cx)+(cx-bx)*(j-cz))/den,w2=((cz-az)*(i-cx)+(ax-cx)*(j-cz))/den,w3=1-w1-w2;
      if(w1<-1e-4||w2<-1e-4||w3<-1e-4)continue;const y=fixY===undefined?Math.min(w1*wp[a+1]+w2*wp[b+1]+w3*wp[c+1],TK.wl):fixY;const k=j*SX+i;if(y>arr[k])arr[k]=y;}}}
function rebuildTop(excl){topm.set(sand);walkm.set(sand);
  for(const it of items){if(it===excl)continue;const c=CAT[it.kind];if(!c.solid)continue;rasterItem(it,topm,it.M);if(!c.tunnel)rasterItem(it,walkm,it.M);else rasterItem(it,walkm,it.M,it.y+2.6*it.scale/11,it.y+7*it.scale/11);}
  // ambient occlusion from nearby objects
  const occ=new Float32Array(SX*SZ),tmp=new Float32Array(SX*SZ);for(let k=0;k<SX*SZ;k++)occ[k]=Math.min(6,topm[k]-sand[k]);
  const R=5;for(let pass=0;pass<2;pass++){for(let j=0;j<SZ;j++)for(let i=0;i<SX;i++){let s=0,c=0;for(let d=-R;d<=R;d++){const ii=i+d;if(ii<0||ii>=SX)continue;s+=occ[j*SX+ii];c++;}tmp[j*SX+i]=s/c;}
    for(let j=0;j<SZ;j++)for(let i=0;i<SX;i++){let s=0,c=0;for(let d=-R;d<=R;d++){const jj=j+d;if(jj<0||jj>=SZ)continue;s+=tmp[jj*SX+i];c++;}occ[j*SX+i]=s/c;}}
  for(let k=0;k<SX*SZ;k++)aom[k]=clamp(1-occ[k]*0.12,0.42,1);
  // floor contact near glass walls
  for(let j=0;j<SZ;j++)for(let i=0;i<SX;i++){const e=Math.min(i,SX-1-i,j)*0.62;aom[j*SX+i]*=lerp(0.7,1,clamp(e/3,0,1));}
  uploadSandTex();buildSDF();topDirty=false;}
// signed distance (cm) to anything a crawler cannot walk over: negative inside obstacles
const sdf=new Float32Array(SX*SZ);
function buildSDF(){const N=SX*SZ,INF=1e6,blk=new Uint8Array(N),cs=(TK.x1-TK.x0)/(SX-1);
  for(let j=0;j<SZ;j++)for(let i=0;i<SX;i++){const k=j*SX+i,edge=Math.min(i,SX-1-i,j,SZ-1-j)*cs;blk[k]=(walkm[k]-sand[k]>2.3||edge<0.8)?1:0;}
  const dt=tg=>{const d=new Float32Array(N);for(let k=0;k<N;k++)d[k]=blk[k]===tg?0:INF;const b=1.4142;
    for(let j=0;j<SZ;j++)for(let i=0;i<SX;i++){const k=j*SX+i;let v=d[k];if(i>0)v=Math.min(v,d[k-1]+1);if(j>0){v=Math.min(v,d[k-SX]+1);if(i>0)v=Math.min(v,d[k-SX-1]+b);if(i<SX-1)v=Math.min(v,d[k-SX+1]+b);}d[k]=v;}
    for(let j=SZ-1;j>=0;j--)for(let i=SX-1;i>=0;i--){const k=j*SX+i;let v=d[k];if(i<SX-1)v=Math.min(v,d[k+1]+1);if(j<SZ-1){v=Math.min(v,d[k+SX]+1);if(i<SX-1)v=Math.min(v,d[k+SX+1]+b);if(i>0)v=Math.min(v,d[k+SX-1]+b);}d[k]=v;}return d;};
  const dO=dt(1),dI=dt(0);for(let k=0;k<N;k++)sdf[k]=blk[k]?-(dI[k]-0.5)*cs:(dO[k]-0.5)*cs;}
const sdfAt=(x,z)=>samp(sdf,x,z);
function sdfDir(x,z){const e=0.45;let gx=samp(sdf,x+e,z)-samp(sdf,x-e,z),gz=samp(sdf,x,z+e)-samp(sdf,x,z-e);let l=Math.hypot(gx,gz);if(l<1e-5){gx=-x;gz=-z+2;l=Math.hypot(gx,gz)||1;}return[gx/l,gz/l];}
// move p (in place, x/z only) until it is at least r cm clear of obstacles
function pushOut(p,r,it=3){for(let n=0;n<it;n++){const d=samp(sdf,p[0],p[2]);if(d>=r)break;const g=sdfDir(p[0],p[2]);p[0]+=g[0]*(r-d);p[2]+=g[1]*(r-d);}p[0]=clamp(p[0],TK.x0+0.5,TK.x1-0.5);p[2]=clamp(p[2],TK.z0+0.5,TK.z1-0.5);return p;}
function topWithout(it){const save=new Float32Array(topm);rebuildTop(it);const ex=new Float32Array(topm);topm.set(save);rebuildTop();return ex;}

// ---------- picking ----------
function raySphere(o,d,c,r){const oc=V.sub(o,c),b=V.dot(oc,d),cc=V.dot(oc,oc)-r*r,h=b*b-cc;if(h<0)return -1;const t=-b-Math.sqrt(h);return t>0?t:(-b+Math.sqrt(h)>0?0:-1);}
function raySeg(o,d,a,b,r){let best=-1;const n=6;for(let i=0;i<=n;i++){const t=raySphere(o,d,V.lerp(a,b,i/n),r);if(t>=0&&(best<0||t<best))best=t;}return best;}
function pickItem(o,d){let best=null,bt=1e9;
  for(const it of items){const t0=raySphere(o,d,it.wc,it.wr*1.05);if(t0<0)continue;let t=t0;const g=it.geo;
    if(g.caps){t=-1;for(const cp of g.caps){const tt=raySeg(o,d,M4.xf(it.M,cp[0]),M4.xf(it.M,cp[1]),Math.max(cp[2],0.6)*it.scale+0.4);if(tt>=0&&(t<0||tt<t))t=tt;}if(t<0)continue;}
    else if(CAT[it.kind].prog==='coral'||CAT[it.kind].mat===2){const r2=it.wr*(CAT[it.kind].prog==='coral'?0.62:0.85);t=raySphere(o,d,it.wc,r2);if(t<0)continue;}
    if(t<bt){bt=t;best=it;}}
  return best?{it:best,t:bt}:null;}
function pickGround(o,d,arr=topm){const tb=boxRay(o,d,[TK.x0,0,TK.z0],[TK.x1,TK.wl,TK.z1]);if(!tb)return null;let t=Math.max(tb[0],0);const t1=tb[1];let prev=t;
  for(;t<=t1;t+=0.35){const p=V.madd(o,d,t);if(p[1]<=samp(arr,p[0],p[2])){let lo=prev,hi=t;for(let k=0;k<10;k++){const m=(lo+hi)/2,q=V.madd(o,d,m);if(q[1]<=samp(arr,q[0],q[2]))hi=m;else lo=m;}return V.madd(o,d,hi);}prev=t;}
  const p=V.madd(o,d,t1);return[clamp(p[0],TK.x0,TK.x1),samp(arr,p[0],p[2]),clamp(p[2],TK.z0,TK.z1)];}
function boxRay(o,d,mn,mx){let t0=-1e9,t1=1e9;for(let k=0;k<3;k++){if(Math.abs(d[k])<1e-9){if(o[k]<mn[k]||o[k]>mx[k])return null;continue;}let a=(mn[k]-o[k])/d[k],b=(mx[k]-o[k])/d[k];if(a>b)[a,b]=[b,a];t0=Math.max(t0,a);t1=Math.min(t1,b);}return t1>=Math.max(t0,0)?[t0,t1]:null;}

// ---------- sculpting ----------
function sculpt(x,z,mode,rad,dt){const r2=rad*rad;const i0=Math.max(0,Math.floor(gxf(x-rad))),i1=Math.min(SX-1,Math.ceil(gxf(x+rad))),j0=Math.max(0,Math.floor(gzf(z-rad))),j1=Math.min(SZ-1,Math.ceil(gzf(z+rad)));
  const avg=mode==='smooth'||mode==='flatten'?(()=>{let s=0,c=0;for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){s+=sand[j*SX+i];c++;}return s/c;})():0;
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const dx=wxf(i)-x,dz=wzf(j)-z,d2=dx*dx+dz*dz;if(d2>r2)continue;const w=Math.pow(1-d2/r2,2),k=j*SX+i;
    if(mode==='raise')sand[k]+=w*dt*6;else if(mode==='lower')sand[k]-=w*dt*6;
    else if(mode==='smooth'){const n=(sand[k-1]||sand[k])+(sand[k+1]||sand[k])+(sand[k-SX]||sand[k])+(sand[k+SX]||sand[k]);sand[k]=lerp(sand[k],n/4,clamp(w*dt*8,0,1));}
    else sand[k]=lerp(sand[k],avg,clamp(w*dt*4,0,1));
    sand[k]=clamp(sand[k],1.2,22);}}
