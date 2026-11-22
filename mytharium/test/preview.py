# numpy z-buffer preview of OBJ meshes with vertex colours: side, front, three-quarter views in one image
import sys,numpy as np
from PIL import Image
def load(fn):
    V=[];C=[];F=[]
    for l in open(fn):
        if l.startswith('v '):p=l.split();V.append([float(x) for x in p[1:4]]);C.append([float(x) for x in p[4:7]] if len(p)>=7 else [.8,.8,.8])
        elif l.startswith('f '):F.append([int(x.split('/')[0])-1 for x in l.split()[1:4]])
    return np.array(V),np.array(C),np.array(F)
def render(V,C,F,R,W=420,H=420):
    P=V@R.T;mn=P.min(0);mx=P.max(0);s=0.9*min(W/(mx[0]-mn[0]),H/(mx[1]-mn[1]));c=(mn+mx)/2
    X=(P[:,0]-c[0])*s+W/2;Y=H/2-(P[:,1]-c[1])*s;Z=P[:,2]
    img=np.full((H,W,3),0.12);zb=np.full((H,W),-1e9)
    tri=F;a=P[tri[:,0]];b=P[tri[:,1]];cc=P[tri[:,2]];n=np.cross(b-a,cc-a);nl=np.linalg.norm(n,axis=1)+1e-12;n/=nl[:,None]
    L=np.array([.4,.6,.7]);L/=np.linalg.norm(L);sh=np.abs(n@L)*0.75+0.25
    order=np.argsort((Z[tri].mean(1)))
    for t in order:
        i0,i1,i2=tri[t];xs=np.array([X[i0],X[i1],X[i2]]);ys=np.array([Y[i0],Y[i1],Y[i2]])
        x0=max(int(xs.min()),0);x1=min(int(xs.max())+1,W-1);y0=max(int(ys.min()),0);y1=min(int(ys.max())+1,H-1)
        if x1<x0 or y1<y0:continue
        col=(C[i0]+C[i1]+C[i2])/3*sh[t];z=Z[[i0,i1,i2]].mean()
        gx,gy=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5)
        d=(ys[1]-ys[2])*(xs[0]-xs[2])+(xs[2]-xs[1])*(ys[0]-ys[2])
        if abs(d)<1e-9:continue
        l0=((ys[1]-ys[2])*(gx-xs[2])+(xs[2]-xs[1])*(gy-ys[2]))/d;l1=((ys[2]-ys[0])*(gx-xs[2])+(xs[0]-xs[2])*(gy-ys[2]))/d;l2=1-l0-l1
        m=(l0>=-1e-3)&(l1>=-1e-3)&(l2>=-1e-3)
        sub=zb[y0:y1+1,x0:x1+1];upd=m&(z>sub)
        sub[upd]=z;img[y0:y1+1,x0:x1+1][upd]=col
    return (np.clip(img,0,1)**(1/1.6)*255).astype(np.uint8)
def rot(yaw,pitch):
    cy,sy=np.cos(yaw),np.sin(yaw);cp,sp=np.cos(pitch),np.sin(pitch)
    Ry=np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]]);Rx=np.array([[1,0,0],[0,cp,-sp],[0,sp,cp]]);return Rx@Ry
for fn in sys.argv[1:]:
    V,C,F=load(fn)
    ims=[render(V,C,F,rot(y,p)) for y,p in [(0,0),(np.pi/2,0),(0.7,0.35),(2.4,0.3)]]
    Image.fromarray(np.concatenate(ims,1)).save(fn.replace('.obj','.png'))
    print('wrote',fn.replace('.obj','.png'),len(V),len(F))
