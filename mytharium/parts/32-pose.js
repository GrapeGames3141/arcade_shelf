
// ---------- posing: procedural gaits with foot IK, then skinning matrices; creature drawing ----------
const RZ=M3.rz,RX=M3.rx,RY=M3.ry,MM=(...a)=>a.reduce((x,y)=>M3.mul(x,y));
function ease(c,dt){if(!c.anim)c.anim={};const k=clamp(dt*2.5,0,1);for(const key in c.at){c.anim[key]=lerp(c.anim[key]||0,c.at[key],k);}}
// legs: [upperBone, lowerBone, footBone|-1, footBind(ground contact), ankleBind (end of the lower bone), pole(local), phase offset walk, trot]
function gaitOffsets(c,trot){return trot?[0,.5,.5,0]:[.25,.75,0,.5];}
function legPhase(c,i,offs,duty,D){const u=(c.phase+offs[i])%1;const L=D*duty;let x,lift;if(u<duty){x=L/2-(u/duty)*L;lift=0;}else{const s=(u-duty)/(1-duty);x=-L/2+sstep(0,1,s)*L;lift=Math.sin(s*PI);}return{x,lift};}
function solveLeg(c,bones,R,out,rootRot,s,leg,footW,pole){const[ub,lb,fb,footB,ankB]=leg;const hip=out.H[ub];
  const kneeB=bones[lb].h;const l1=V.dist(bones[ub].h,kneeB)*s,l2=V.dist(kneeB,ankB)*s;
  const ankT=V.add(footW,V.mul(M3.ap(rootRot,V.sub(ankB,footB)),s));const sol=ik2(hip,l1,l2,ankT,pole);
  const Wp=out.W[bones[ub].p];const bd1=V.norm(V.sub(kneeB,bones[ub].h)),bd2=V.norm(V.sub(ankB,kneeB));
  const Wu=M3.mul(M3.between(V.norm(M3.ap(Wp,bd1)),sol.u1),Wp);R[ub]=M3.mul(M3.tr(Wp),Wu);
  const Wl=M3.mul(M3.between(V.norm(M3.ap(Wu,bd2)),sol.u2),Wu);R[lb]=M3.mul(M3.tr(Wu),Wl);
  if(fb>=0)R[fb]=M3.mul(M3.tr(Wl),rootRot);}
const HORSE_LEGS=[[8,9,10,[2.44,0,.85],[2.29,.8325,.85]],[11,12,13,[2.44,0,-.85],[2.29,.8325,-.85]],[14,15,16,[-2.53,0,.8],[-2.67,.8325,.8]],[17,18,19,[-2.53,0,-.8],[-2.67,.8325,-.8]]];
function wingSpread(aB,aS,upB,upS){const Fb=M3.frame(aB,upB),Fs=M3.frame(aS,upS);return M3.mul(Fs,M3.tr(Fb));}
const PEG_SPREAD={L:wingSpread(V.norm([-1.45,.3,.25]),V.norm([.1,.28,1]),[0,1,0],[1,0,0]),R:wingSpread(V.norm([-1.45,.3,-.25]),V.norm([.1,.28,-1]),[0,1,0],[1,0,0])};
const DRA_FOLD={L:wingSpread(V.norm([-.3,.25,1.33]),V.norm([-1,.18,.3]),[0,1,0],[-.1,-.2,-1]),R:wingSpread(V.norm([-.3,.25,-1.33]),V.norm([-1,.18,-.3]),[0,1,0],[-.1,-.2,1])};
const PHX_SPREAD={L:wingSpread(V.norm([-.7,.05,.15]),V.norm([.05,.2,1]),[0,1,0],[1,0,0]),R:wingSpread(V.norm([-.7,.05,-.15]),V.norm([.05,.2,-1]),[0,1,0],[1,0,0])};
// make one bone's part larger or smaller about its joint (bind-space pivot h), after fk
function scaleBone(out,b,h,k){const M=out.M,o=b*16;const lx=M[o]*h[0]+M[o+4]*h[1]+M[o+8]*h[2],ly=M[o+1]*h[0]+M[o+5]*h[1]+M[o+9]*h[2],lz=M[o+2]*h[0]+M[o+6]*h[1]+M[o+10]*h[2];
  for(let i=0;i<12;i++)if(i%4!==3)M[o+i]*=k;M[o+12]+=(1-k)*lx;M[o+13]+=(1-k)*ly;M[o+14]+=(1-k)*lz;}
// arms are modelled spread from the body by these angles (see the creature defs); poses are written for hanging arms
const ARM_A={faerie:.585,mermaid:.553,gnome:.815};
function armsIn(R,k){R[3]=M3.mul(R[3],RX(ARM_A[k]));R[5]=M3.mul(R[5],RX(-ARM_A[k]));}
function slerpR(Rm,t){return t<=0?M3.id():t>=1?Rm:M3.slerpish(M3.id(),Rm,t);}
function headLook(c,R,bNeck,bHead,rootYaw,amt,maxA=1){if(!c.look||amt<.02)return;const hp=c.headP||c.pos;const d=V.sub(c.look,hp);const a=angDiff(rootYaw,Math.atan2(-d[2],d[0]));const pitch=Math.atan2(d[1],Math.hypot(d[0],d[2]));
  const ya=clamp(a,-maxA,maxA)*amt,pa=clamp(pitch,-.6,.6)*amt;R[bNeck]=M3.mul(R[bNeck],M3.mul(RY(ya*.45),RZ(pa*.4)));R[bHead]=M3.mul(R[bHead],M3.mul(RY(ya*.55),RZ(pa*.5)));}
// ---------- horses: unicorn, foal, pegasus ----------
function poseHorse(c,dt){const A=c.anim,bones=CRT[SPECIES[c.sp].asset].bones,s=c.size,R=c.R;for(let i=0;i<24;i++)R[i]=M3.id();
  const fl=c.fly||0;const D=s*(3+c.speed*.2);const trot=c.speed>8;c.phase=(c.phase+c.speed*dt/D)%1;const gk=clamp(c.speed/1.5,0,1)*(1-fl);
  const yawR=RY(c.yaw);const f=fwdOf(c.yaw);
  const hF=topH(c.pos[0]+f[0]*2.3*s,c.pos[2]+f[2]*2.3*s),hB=topH(c.pos[0]-f[0]*2.5*s,c.pos[2]-f[2]*2.5*s);let pitch=fl>.5?clamp(c.vel[1]*.02,-.4,.4):Math.atan2(hF-hB,4.8*s)*.8;
  const lie=A.lie,rear=A.rear;pitch+=rear*.75;
  const bob=Math.abs(Math.sin(c.phase*TAU*2))*.12*s*gk*(trot?1.6:1);
  let rootRot=M3.mul(yawR,RZ(pitch));let rootPos=[c.pos[0],c.pos[1]+bob-lie*3.0*s,c.pos[2]];
  if(rear>.01){const piv=[-2.5,0,0];const pw=V.add(c.pos,V.mul(M3.ap(yawR,piv),s));rootPos=V.sub(pw,V.mul(M3.ap(rootRot,piv),s));}
  if(fl>.01)rootPos=c.pos.slice();
  // spine, neck, head
  const graze=A.graze,sleep=A.sleep;
  // asleep: the neck curls round and down so the chin rests on the ground beside the forelegs
  const sl=sleep*lie,side=(c.id%2?1:-1);R[3]=MM(RY(.45*sl*side),RZ(-.55*graze-.8*sl+.06*Math.sin(c.phase*TAU*2)*gk));R[4]=MM(RY(.5*sl*side),RZ(-.48*graze-.5*sl+.25*rear));R[5]=MM(RY(.25*sl*side),RZ(-.32*graze+.5*sl+Math.sin(SIMT*9)*.04*graze));
  if(A.toss>.05){R[4]=M3.mul(R[4],RX(Math.sin(SIMT*13)*.32*A.toss));}
  headLook(c,R,4,5,c.yaw,A.look);
  R[6]=MM(RZ(.35+.25*gk-.3*lie),RY(Math.sin(SIMT*.9+c.id)*.25));R[7]=RY(Math.sin(SIMT*.9+c.id-.6)*.2);
  // wings (pegasus): folded at rest, spread and beating in flight
  if(c.sp==='pegasus'){const w=clamp(A.wings+fl,0,1);const show=A.wings*(1-fl); // spread on the ground: raised in a V, outer half arching over
    const flap=fl>.1?Math.sin(SIMT*7.5)*.65*fl:(.34+Math.sin(SIMT*1.3)*.08)*show+Math.sin(SIMT*1.2)*.04*(1-show);
    R[20]=M3.mul(RX(-flap),slerpR(PEG_SPREAD.L,w));R[22]=M3.mul(RX(flap),slerpR(PEG_SPREAD.R,w));const fz=RZ(Math.sin(SIMT*7.5-.6)*.25*fl),arch=(.5+Math.sin(SIMT*1.3-.8)*.1)*show;
    R[21]=M3.mul(fz,RX(-arch));R[23]=M3.mul(fz,RX(arch));}
  const out=fk(bones,R,rootPos,rootRot,s,c.out);
  // legs: IK to planted feet; folded when lying, tucked when rearing or flying
  const offs=gaitOffsets(c,trot);const duty=trot?.5:.62;const fold=Math.max(lie,fl);
  for(let i=0;i<4;i++){const leg=HORSE_LEGS[i];const front=i<2;
    if(fold>.6||(front&&rear>.4)){const tuck=front?(rear>.4?[.9,-1.7]:[1.15,-2.6]):[1.0,-2.1];R[leg[0]]=RZ(tuck[0]);R[leg[1]]=RZ(tuck[1]);R[leg[2]]=RZ(front?.6:.5);continue;}
    const g=legPhase(c,i,offs,duty,D);const nb=leg[3];const loc=[nb[0]+g.x*gk/s,0,nb[2]];const fw=V.add(c.pos,V.mul(M3.ap(yawR,loc),s));
    fw[1]=(rear>.01&&!front)?c.pos[1]:topH(fw[0],fw[2])+g.lift*gk*(trot?.9:.55)*s;
    solveLeg(c,bones,R,out,rootRot,s,leg,fw,M3.ap(yawR,front?[1,0,0]:[-1,0,0]));}
  fk(bones,R,rootPos,rootRot,s,c.out);if(c.sp==='foal')scaleBone(c.out,5,bones[5].h,1.24); // a foal's head is big for its body
  c.headP=boneXf(c.out,5,bones,[5.9,6.96,0],s);c.backP=boneXf(c.out,0,bones,[.3,6.5,0],s);c.hornP=boneXf(c.out,5,bones,[5.4,10.4,0],s);
  c.glow=Math.max(c.glow-dt*.4,LIGHT.night*.35);if(LIGHT.night>.6&&c.sp==='unicorn')event(c,'glow');
  c.swing=V.add(V.mul(c.vel||[0,0,0],-.03),V.mul(f,-c.speed*.06));}
// ---------- faerie ----------
function poseFaerie(c,dt){const A=c.anim,bones=CRT.faerie.bones,s=c.size,R=c.R;for(let i=0;i<11;i++)R[i]=M3.id();
  const sleep=A.sleep,sit=A.sit*(1-sleep),dance=A.dance;const lean=clamp(c.speed*.04,0,.55)*(1-A.sit);const bob=Math.sin(SIMT*2.2+c.id)*.15*(1-A.sit);
  // seated: the hips come down onto the perch or the unicorn's back (c.pos is where she sits, not a point under her feet).
  // asleep: curled on her side, knees drawn up, hands under her cheek, breathing slowly
  const breathe=Math.sin(SIMT*1.1+c.id)*.03*sleep;
  let rootRot=M3.mul(RY(c.yaw),RZ(-lean));if(sleep>.01)rootRot=MM(RY(c.yaw),RX(1.38*sleep),RZ(.25*sleep));
  const up=M3.ap(rootRot,[0,1,0]);let rootPos=V.add(c.pos,[0,bob-sit*1.5*s,0]);if(sleep>.01)rootPos=V.add(V.add(c.pos,[0,.28*s*sleep,0]),V.mul([up[0],0,up[2]],-1.75*s*sleep));
  const kick=Math.sin(SIMT*3+c.id)*.15*(1-A.sit);
  R[7]=RZ(.35+kick+sit*1.15+sleep*1.25);R[8]=RZ(-.7-kick*.5-sit*.6-sleep*1.15);R[9]=RZ(.45-kick+sit*1.15+sleep*1.0);R[10]=RZ(-.8+kick*.5-sit*.6-sleep*1.2);
  const armUp=dance*2.5;R[3]=MM(RX(-.3-armUp+sleep*.3),RZ(.25+sit*.35+sleep*1.0));R[5]=MM(RX(.3+armUp-sleep*.3),RZ(.25+sit*.35+sleep*1.15));
  R[4]=RZ(.5+Math.sin(SIMT*1.7+c.id)*.15*(1-sleep)+sleep*1.5);R[6]=RZ(.5+Math.sin(SIMT*1.5+c.id)*.15*(1-sleep)+sleep*1.4);
  armsIn(R,'faerie');R[1]=RZ(-sleep*.35+breathe);R[2]=MM(RZ(-sleep*.3),RX(-sleep*.25));headLook(c,R,1,2,c.yaw,A.look*(1-sleep),1.2);
  fk(bones,R,rootPos,rootRot,s,c.out);c.headP=boneXf(c.out,2,bones,[0,3.1,0],s);
  c.swing=V.add(V.mul(c.vel||[0,0,0],-.05),[0,-.05*sleep,0]);}
// ---------- mermaid ----------
function poseMermaid(c,dt){const A=c.anim,bones=CRT.mermaid.bones,s=c.size,R=c.R;for(let i=0;i<12;i++)R[i]=M3.id();
  const sw=A.swim,bask=A.bask;const f=c.speed>.5?V.norm(c.vel):fwdOf(c.yaw);const fh=V.norm([f[0],clamp(f[1],-.5,.5),f[2]]);
  // swimming: belly down, head along the motion; upright otherwise
  const Wsw=(()=>{const y=fh;const x=V.norm(V.sub([0,-1,0],V.mul(y,-y[1])));const z=V.cross(x,y);return[x[0],x[1],x[2],y[0],y[1],y[2],z[0],z[1],z[2]];})();
  const Wup=M3.mul(RY(c.yaw),RZ(Math.sin(SIMT*.8)*.06));let rootRot=sw>.5?M3.slerpish(Wup,Wsw,clamp((sw-.5)*2,0,1)):Wup;
  const om=c.speed>.5?6+c.speed*.4:2.2;const amp=sw>.5?.28:.1;
  // floating upright in water shallower than her tail is long: the tail curls back behind her instead of going through the pond bed
  const room=STUDIO.on?9:c.pos[1]-groundH(c.pos[0],c.pos[2])-.45;const curl=clamp((5.4-room)/3.6,0,1)*.6*(1-clamp(sw*2,0,1))*(1-bask);c.curlT=lerp(c.curlT||0,curl,clamp(dt*3,0,1)||1);
  for(let i=0;i<5;i++)R[7+i]=RZ(Math.sin(SIMT*om-i*.75)*amp*(.4+i*.25)*(1-bask)-c.curlT*(i===0?.7:1));
  if(bask>.05){const k=bask;R[7]=M3.mul(R[7],MM(RZ(1.35*k),RX(.25*k)));R[8]=M3.mul(R[8],RX(.55*k));R[9]=M3.mul(R[9],MM(RZ(-.5*k),RX(.3*k)));R[10]=M3.mul(R[10],RZ((-.3+Math.sin(SIMT*.9)*.15)*k));R[11]=M3.mul(R[11],RZ(-.2*k));}
  const comb=A.comb;const ca=Math.sin(SIMT*2.2);
  R[3]=MM(RX(-.05-sw*.2),RZ(.12+Math.sin(SIMT*1.3)*.12*(1-sw)));R[5]=MM(RX(.05+sw*.2),RZ(.12+Math.sin(SIMT*1.2+1)*.12*(1-sw)));armsIn(R,'mermaid');R[4]=RZ(.45);R[6]=RZ(.45);
  R[2]=RZ(sw>.5?.55*sw:0);if(comb>.1)R[2]=M3.mul(R[2],RX(-.25*comb));headLook(c,R,1,2,c.yaw,A.look,.8);
  const rootPos=bask>.5?V.add(c.pos,[0,.1,0]):c.pos;fk(bones,R,rootPos,rootRot,s,c.out);
  if(comb>.02){const u=.5-.5*Math.cos(SIMT*1.9);const st=u<.75?u/.75:1-(u-.75)/.25; // a slow stroke down, a quick lift back up
    const o=c.out,Wh=o.W[2];const tgt=V.add(o.H[2],V.mul(M3.ap(Wh,[-.2-.12*st,.42-1.15*st,-.5-.06*st]),s));const pole=M3.ap(o.W[1],V.norm([.5,-.6,-1]));
    const d5=R[5],d6=R[6];solveLeg(c,bones,R,o,rootRot,s,[5,6,-1,[0,.5,-1.42],[0,.5,-1.42]],tgt,pole);R[5]=M3.slerpish(d5,R[5],comb);R[6]=M3.slerpish(d6,R[6],comb);fk(bones,R,rootPos,rootRot,s,c.out);}
  c.headP=boneXf(c.out,2,bones,[0,2.6,0],s);
  c.swing=V.add(V.mul(c.vel||[0,0,0],-.06),[0,bask>.5?-.1:0,0]);}
// ---------- dragon ----------
const DRA_LEGS=[[12,13,-1,[1.4,0,.9],[1.25,.12,.88]],[14,15,-1,[1.4,0,-.9],[1.25,.12,-.88]],[16,17,-1,[-1.0,0,.92],[-1.2,.12,.88]],[18,19,-1,[-1.0,0,-.92],[-1.2,.12,-.88]]];
function poseDragon(c,dt){const A=c.anim,bones=CRT.dragon.bones,s=c.size,R=c.R;for(let i=0;i<24;i++)R[i]=M3.id();
  const fl=c.fly||0;const D=s*(1.8+c.speed*.18);c.phase=(c.phase+c.speed*dt/D)%1;const gk=clamp(c.speed/1.2,0,1)*(1-fl);const yawR=RY(c.yaw);const f=fwdOf(c.yaw);
  const lie=Math.max(A.lie,A.curl);const und=Math.sin(c.phase*TAU)*.16*gk;
  const hF=topH(c.pos[0]+f[0]*1.2*s,c.pos[2]+f[2]*1.2*s),hB=topH(c.pos[0]-f[0]*1.2*s,c.pos[2]-f[2]*1.2*s);const pitch=fl>.5?clamp(c.vel[1]*.03,-.5,.5):Math.atan2(hF-hB,2.4*s)*.8;
  const rootRot=M3.mul(yawR,M3.mul(RZ(pitch),RY(und*.5)));const rootPos=V.add(c.pos,[0,(fl>.5?0:-lie*.85*s)+Math.abs(Math.sin(c.phase*TAU))*.06*gk*s,0]);
  R[1]=RY(-und);R[2]=RY(und);
  const curl=A.curl;for(let i=0;i<5;i++)R[7+i]=MM(RY(Math.sin(SIMT*1.3-i*.6+c.id)*.12*(1-curl)+(-und*.6)+curl*.62),RZ(fl>.5?.05:-.02*i));
  R[3]=MM(RZ(.25*A.fire-.2*A.graze-.2*lie+.15*fl),RY(curl*.55));R[4]=MM(RZ(.15*A.fire-.35*A.graze-.15*lie),RY(curl*.45));R[5]=MM(RZ(-.1*A.fire-.3*A.graze-.1*lie),RY(curl*.3));
  R[6]=RZ(-.5*A.jaw);headLook(c,R,4,5,c.yaw,A.look,1.1);
  // wings: folded along the body, spread to bask, beating in flight
  const w=clamp(A.wings+fl,0,1);const flap=fl>.1?Math.sin(SIMT*9)*.75*fl:A.bask>.3?Math.sin(SIMT*.5)*.05-.15:0;
  R[20]=M3.mul(RX(-flap),slerpR(DRA_FOLD.L,1-w));R[22]=M3.mul(RX(flap),slerpR(DRA_FOLD.R,1-w));R[21]=RZ(fl>.1?Math.sin(SIMT*9-.7)*.3*fl:0);R[23]=R[21];
  const out=fk(bones,R,rootPos,rootRot,s,c.out);
  const offs=[0,.5,.5,0];for(let i=0;i<4;i++){const leg=DRA_LEGS[i];const front=i<2;
    if(fl>.5||lie>.6){R[leg[0]]=MM(RX(front?(i===0?-.9:.9):(i===2?-.9:.9)),RZ(front?.9:-.6));R[leg[1]]=RZ(front?-1.2:1.0);continue;}
    const g=legPhase(c,i,offs,.55,D);const nb=leg[3];const fw=V.add(c.pos,V.mul(M3.ap(yawR,[nb[0]+g.x*gk/s,0,nb[2]]),s));fw[1]=topH(fw[0],fw[2])+g.lift*gk*.5*s;
    solveLeg(c,bones,R,out,rootRot,s,leg,fw,M3.ap(yawR,[front?-.3:.3,.4,nb[2]>0?1:-1]));}
  fk(bones,R,rootPos,rootRot,s,c.out);c.mouthP=boneXf(c.out,5,bones,[4.18,2.82,0],s);c.headF=V.norm(V.sub(c.mouthP,boneXf(c.out,5,bones,[3.0,3.08,0],s)));c.headP=c.mouthP;
  c.swing=[0,0,0];}
// ---------- gnome ----------
const GNOME_LEGS=[[7,8,-1,[.1,0,.19],[0,.22,.19]],[9,10,-1,[.1,0,-.19],[0,.22,-.19]]];
function poseGnome(c,dt){const A=c.anim,bones=CRT.gnome.bones,s=c.size,R=c.R;for(let i=0;i<11;i++)R[i]=M3.id();
  const D=s*1.5;c.phase=(c.phase+c.speed*dt/D)%1;const gk=clamp(c.speed/.8,0,1);const yawR=RY(c.yaw);const tend=A.tend;
  const bob=Math.abs(Math.sin(c.phase*TAU))*.07*s*gk;const rootRot=yawR;const rootPos=V.add(c.pos,[0,bob-tend*.32*s,0]);
  R[1]=MM(RZ(-.65*tend),RY(Math.sin(c.phase*TAU)*.12*gk));const sw=Math.sin(c.phase*TAU)*.55*gk;
  R[3]=MM(RX(-.15),RZ(sw+tend*1.1+(c.carry?1.0:0)));R[5]=MM(RX(.15+A.wave*2.4),RZ(-sw+tend*1.1+(c.carry?1.0:0)));R[4]=RZ(.3+(c.carry?.5:0));R[6]=A.wave>.1?RX(.4+Math.sin(SIMT*10)*.45*A.wave):RZ(.3+(c.carry?.5:0));armsIn(R,'gnome');
  R[2]=RZ(Math.sin(SIMT*1.1)*.04-tend*.2);headLook(c,R,1,2,c.yaw,A.look,1);
  const out=fk(bones,R,rootPos,rootRot,s,c.out);
  for(let i=0;i<2;i++){const leg=GNOME_LEGS[i];const g=legPhase(c,i,[0,.5],.6,D);const nb=leg[3];const fw=V.add(c.pos,V.mul(M3.ap(yawR,[nb[0]+g.x*gk/s,0,nb[2]]),s));fw[1]=topH(fw[0],fw[2])+g.lift*gk*.35*s;
    if(tend>.5){const sq=V.add(c.pos,V.mul(M3.ap(yawR,[nb[0]-.15,0,nb[2]*1.4]),s));sq[1]=topH(sq[0],sq[2]);solveLeg(c,bones,R,out,rootRot,s,leg,sq,M3.ap(yawR,[1,0,0]));}
    else solveLeg(c,bones,R,out,rootRot,s,leg,fw,M3.ap(yawR,[1,0,0]));}
  fk(bones,R,rootPos,rootRot,s,c.out);c.handP=boneXf(c.out,6,bones,[.04,1.25,-1.14],s);c.carryP=V.lerp(boneXf(c.out,4,bones,[.04,1.25,1.14],s),c.handP,.5);c.headP=boneXf(c.out,2,bones,[.3,2.4,0],s);c.swing=V.mul(fwdOf(c.yaw),-c.speed*.04);}
// ---------- phoenix ----------
function posePhoenix(c,dt){const A=c.anim,bones=CRT.phoenix.bones,s=c.size*(c.scaleK===undefined?1:c.scaleK),R=c.R;for(let i=0;i<10;i++)R[i]=M3.id();
  const fl=A.fly;const w=clamp(A.wings+fl,0,1);const flap=Math.sin(SIMT*8)*.8*fl;R[4]=M3.mul(RX(-flap),slerpR(PHX_SPREAD.L,w));R[6]=M3.mul(RX(flap),slerpR(PHX_SPREAD.R,w));
  R[3]=RZ(-.2+fl*.3+Math.sin(SIMT*.8)*.05);R[1]=RZ(Math.sin(SIMT*.7)*.08);R[2]=RY(Math.sin(SIMT*.5)*.4*(1-fl));R[8]=RZ(fl*1.2);R[9]=RZ(fl*1.2);
  const rootRot=M3.mul(RY(c.yaw),RZ(-clamp(c.speed*.03,0,.6)));fk(bones,R,c.pos,rootRot,Math.max(s,.001),c.out);c.headP=boneXf(c.out,2,bones,[1.0,3.42,0],Math.max(s,.001));c.swing=V.mul(c.vel||[0,0,0],-.05);}
const POSE={unicorn:poseHorse,foal:poseHorse,pegasus:poseHorse,faerie:poseFaerie,mermaid:poseMermaid,dragon:poseDragon,gnome:poseGnome,phoenix:posePhoenix};
function poseAll(dt){for(const c of crits){if(c.hidden)continue;if(!c.at)AT(c);ease(c,dt);try{POSE[c.sp](c,dt);}catch(e){if(!poseAll.err){poseAll.err=1;LOG('pose error',c.sp,e.message);}}}}
// ---------- drawing creatures ----------
function morphOf(c){const S=SPECIES[c.sp];return S.morphs[c.morph%S.morphs.length];}
function critColors(c){const m=morphOf(c);
  if(c.sp==='mermaid')return{c1:m.c1,c2:m.tail1,c3:m.c3,c4:m.c4,coat1:m.hair,coat2:m.hair,coat3:V.mul(m.hair,1.4),tail2:m.tail2,cloth:m.c3};
  if(c.sp==='faerie')return{c1:m.c1,c2:m.c3,c3:m.c3,c4:m.c4,coat1:m.c3,coat2:m.c2,coat3:m.flower||[1,.7,.85]};
  if(c.sp==='gnome')return{c1:m.c1,c2:m.c2,c3:m.c3,c4:m.c4,coat1:m.beard,coat2:m.beard,coat3:m.beard};
  if(c.sp==='dragon')return{c1:m.c1,c2:m.c2,c3:m.c3,c4:m.c4};
  if(c.sp==='phoenix')return{c1:m.c1,c2:m.c2,c3:m.c3,c4:m.c4,coat1:m.c1,coat2:m.c1,coat3:m.c3};
  return{c1:m.c1,c2:m.c1,c3:m.c3,c4:m.c4,coat1:m.c1,coat2:m.c2,coat3:m.c3,rainbow:m.rainbow};}
function drawCreatures(vp,shadow){const P=shadow?PR.skinS:PR.skin;common(P,vp);
  for(const c of crits){if(c.hidden||!c.out.M||(STUDIO.on&&c!==STUDIO.c))continue;if(c.sp==='phoenix'&&(c.scaleK!==undefined&&c.scaleK<.02))continue;const A=CRT[SPECIES[c.sp].asset];
    if(!shadow){const r=critRadius(c)*2.2;c.bmn=[c.pos[0]-r,c.pos[1]-r,c.pos[2]-r];c.bmx=[c.pos[0]+r,c.pos[1]+r,c.pos[2]+r];c.seen=boxSeen(c.bmn,c.bmx);if(!c.seen)continue;}const col=critColors(c);
    U(P,'uBones',c.out.M);if(!shadow){U(P,'uC1',col.c1);U(P,'uC2',c.sp==='mermaid'?col.c2:col.c2);U(P,'uC3',c.sp==='mermaid'?col.cloth:col.c3);U(P,'uC4',col.c4);
      U(P,'uGlow',c.sp==='unicorn'||c.sp==='foal'?c.glow:c.sp==='dragon'?(c.fire||0)*.6+LIGHT.night*.15:0);U(P,'uWetC',c.wet||0);U(P,'uBlink',c.blink);U(P,'uSel',SELECTED===c?1:0);U(P,'uKind',c.sp==='mermaid'?1:c.sp==='dragon'?2:c.sp==='faerie'?3:0);U(P,'uHurt',0);U(P,'uHairC',col.coat2||col.c2);
      if(c.sp==='mermaid'){U(P,'uC1',col.c1);U(P,'uC2',col.c2);}}
    // mermaid: tail colours ride on the palette mix (c1 skin -> tail gradient handled by regions)
    const far=QK!=='max'&&(shadow||lodBox(c.bmn,c.bmx)<.5);const mesh=far?A.lo:A.mesh;
    if(c.sp==='mermaid'&&!shadow){U(P,'uC1',col.c1);U(P,'uC2',col.c2);U(P,'uC3',col.tail2);}
    drawMesh(mesh);}
  // coats
  const Pc=PR.coat;common(Pc,vp);U(Pc,'uShadowPass',shadow?1:0);
  for(const c of crits){if(c.hidden||!c.out.M||(STUDIO.on&&c!==STUDIO.c))continue;const key=c.sp==='faerie'&&morphOf(c).short?'faerieS':SPECIES[c.sp].asset;const A=CRT[key];if(!A||!A.coat)continue;if(c.sp==='phoenix'&&(c.scaleK!==undefined&&c.scaleK<.02))continue;
    if(!shadow){if(c.seen===false)continue;setLod(Pc,Math.max(.5,lodBox(c.bmn,c.bmx)));}else setLod(Pc,QK==='max'?1:.5);
    const col=critColors(c);U(Pc,'uBones',c.out.M);U(Pc,'uC1',col.coat1);U(Pc,'uC2',col.coat2);U(Pc,'uC3',col.coat3);U(Pc,'uRainbow',col.rainbow?1:0);U(Pc,'uSwing',c.swing||[0,0,0]);U(Pc,'uWetC',c.wet||0);U(Pc,'uSzC',1);
    drawSplats(A.coat);}
  // carried things and food
  const Ps=shadow?PR.stdS:PR.std;common(Ps,vp);if(STUDIO.on)return;
  for(const c of crits){if(c.hidden)continue;if(c.carry==='pebble'&&c.carryP)drawStd(Ps,MESH.pebble,M4.trs(c.carryP,0,.45),ID3,2,2,[1,1,1],.6,1,3);
    if(c.carry==='pearl'&&c.mouthP)drawStd(Ps,MESH.pearl,M4.trs(c.mouthP,0,.22),ID3,16,0,[1,1,1],.3,1,1);}
  for(const f of foods){const F=FOODS[f.type];drawStd(Ps,MESH.food[F.mesh],M4.trs(f.p,f.yaw,1),ID3,19,F.glossy?1:F.glow?3:0,F.col,.5,1,0,F.glow?1.5:0);}
  // pearls in the grotto
  const sh=items.find(it=>it.kind==='shell');if(sh){for(let i=0;i<TERR.pearls;i++){const a=i*2.1;const p=M4.xf(sh.M,[Math.cos(a)*.38,-.08+(i%3)*.05,.55+Math.sin(a)*.3]);drawStd(Ps,MESH.pearl,M4.trs(p,0,.2),ID3,16,0,[1,1,1],.3,1,1);}}}
function drawMermaidSplit(P,c,A,col){U(P,'uC1',col.c1);U(P,'uC2',col.c2);U(P,'uC3',col.tail2);drawMesh(A.mesh);}
// faerie wings: four (dragonfly) or two pairs; see-through, drawn after the opaque scene
function drawWings(vp){const P=PR.wing;common(P,vp);for(const c of crits){if(c.sp!=='faerie'||c.hidden||!c.out.W||(STUDIO.on&&c!==STUDIO.c))continue;const m=morphOf(c);const type=m.wing;const W=c.out.W[1],Hc=c.out.H[1],s=c.size;
  const sit=c.anim.sit||0,dance=c.anim.dance||0;const fast=type===0?17:type===1?3.2:7;const ph=SIMT*fast*TAU;
  U(P,'uC1',m.w1);U(P,'uC2',m.w2);U(P,'uType',type);U(P,'uGlow',LIGHT.night*.35+dance*.2);
  for(const side of[1,-1])for(const hind of[0,1]){let open;if(type===0)open=lerp(.95+.35*Math.sin(ph+hind*1.6),1.45,sit);else if(type===1)open=lerp(.35+1.0*(.5+.5*Math.sin(ph+hind*.3)),.12,sit);else open=lerp(.5+.75*(.5+.5*Math.sin(ph)),1.35,sit);
    const sweep=type===0?(hind?-.5:-.15):type===1?(hind?-.35:.15):(hind?-.55:-.1);
    const span=V.norm([Math.sin(sweep)*.9+(type===0?-.2:-.15),Math.cos(open),Math.sin(open)*side]);let fwd=[1,0,0];fwd=V.norm(V.sub(fwd,V.mul(span,V.dot(fwd,span))));const nrm=V.cross(fwd,span);
    const Xw=M3.ap(W,span),Yw=M3.ap(W,nrm),Zw=M3.ap(W,fwd);const root=V.add(Hc,V.mul(M3.ap(W,[-.12,.18-hind*.06,side*.05]),s));
    const k=s*(hind?.92:1)*(type===0?1.32:1.22);const M=new Float32Array([Xw[0]*k,Xw[1]*k,Xw[2]*k,0,Yw[0]*k*side,Yw[1]*k*side,Yw[2]*k*side,0,Zw[0]*k,Zw[1]*k,Zw[2]*k,0,root[0],root[1],root[2],1]);
    U(P,'uModel',M);const mesh=CRT.wings[type][type===0?hind:hind];if(type===1&&hind){U(P,'uC1',V.mul(m.w1,.85));}drawMesh(mesh);}
  U(P,'uC1',m.w1);}}
function buildSmallMeshes(){MESH.pebble=genRock(51,2,{sub:2}).mesh();const pe=new MB();const ic=icosphere(2);for(const p of ic.P)pe.v(p,p,[0,0],[1,1,0,1]);for(const f of ic.F)pe.t(f[0],f[1],f[2]);MESH.pearl=pe.mesh();
  MESH.food={};const sph=(mb,c,r,col=[1,1,1,1])=>{const ic=icosphere(1);const st=mb.n;for(const p of ic.P)mb.v(V.add(c,V.mul(p,r)),p,[0,0],col);for(const f of ic.F)mb.t(st+f[0],st+f[1],st+f[2]);};
  {const m=new MB();for(let k=0;k<3;k++){const a=k/3*TAU;sph(m,[Math.cos(a)*.3,.15,Math.sin(a)*.3],.28);}tube(m,[[0,0,0],[0,.12,.6]],.04,4,{});m.normals();MESH.food.sprig=m.mesh();}
  {const m=new MB();box(m,[0,.15,0],[.6,.15,.25]);MESH.food.slice=m.mesh();}
  {const m=new MB();sph(m,[0,.2,0],.25);MESH.food.drop=m.mesh();}
  {const m=new MB();for(let k=0;k<5;k++)sph(m,[(k%3-1)*.22,.2+(k>2?.2:0),(k%2)*.2-.1],.17);MESH.food.berry=m.mesh();}
  {const m=new MB();sph(m,[0,.2,0],.18);sph(m,[-.3,.2,0],.15);sph(m,[.25,.25,0],.12);for(const z of[-1,1])for(let k=0;k<3;k++)tube(m,[[-.1+k*.15,.2,z*.1],[-.2+k*.2,.35,z*.3],[-.25+k*.25,0,z*.4]],.025,3,{});MESH.food.cricket=m.mesh();}}
