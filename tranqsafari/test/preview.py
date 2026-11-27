"""Render OBJ files from test/geo.js to a contact sheet (side, front, top, three-quarter) with numpy only.
usage: python3 test/preview.py <dir with .obj> <out.png>"""
import sys, os, glob, numpy as np
from PIL import Image
def load(fn):
    V=[];C=[];F=[]
    for l in open(fn):
        if l.startswith('v '): a=l.split(); V.append([float(x) for x in a[1:4]]); C.append([float(x) for x in a[4:7]])
        elif l.startswith('f '): F.append([int(t.split('//')[0])-1 for t in l.split()[1:4]])
    return np.array(V),np.array(C),np.array(F)
def render(V,C,F,R,W=360,H=240):
    P=V@R.T; mn=P.min(0); mx=P.max(0); sc=min((W-20)/(mx[0]-mn[0]),(H-20)/(mx[1]-mn[1]))
    X=(P[:,0]-mn[0])*sc+10; Y=H-((P[:,1]-mn[1])*sc+10); Z=P[:,2]
    img=np.ones((H,W,3))*0.92; zb=np.full((H,W),-1e9)
    tri=P[F]; n=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]); n/=np.linalg.norm(n,axis=1,keepdims=True)+1e-9
    L=np.array([0.4,0.7,0.6]); L/=np.linalg.norm(L); sh=0.35+0.65*np.clip(n@L,0,1)
    for t in np.argsort(Z[F].mean(1)):
        i=F[t]; xs=X[i]; ys=Y[i]
        if n[t,2]<0: continue
        x0,x1=int(max(0,xs.min())),int(min(W-1,xs.max()+1)); y0,y1=int(max(0,ys.min())),int(min(H-1,ys.max()+1))
        if x1<x0 or y1<y0: continue
        gx,gy=np.meshgrid(np.arange(x0,x1+1),np.arange(y0,y1+1))
        d=(ys[1]-ys[2])*(xs[0]-xs[2])+(xs[2]-xs[1])*(ys[0]-ys[2])
        if abs(d)<1e-9: continue
        a=((ys[1]-ys[2])*(gx-xs[2])+(xs[2]-xs[1])*(gy-ys[2]))/d; b=((ys[2]-ys[0])*(gx-xs[2])+(xs[0]-xs[2])*(gy-ys[2]))/d; c=1-a-b
        m=(a>=-0.01)&(b>=-0.01)&(c>=-0.01)
        z=a*Z[i[0]]+b*Z[i[1]]+c*Z[i[2]]
        m&=z>zb[gy,gx]
        col=C[i].mean(0)*sh[t]
        img[gy[m],gx[m]]=col; zb[gy[m],gx[m]]=z[m]
    return (np.clip(img,0,1)**(1/1.6)*255).astype(np.uint8)
def rot(yaw,pitch):
    cy,sy=np.cos(yaw),np.sin(yaw); cp,sp=np.cos(pitch),np.sin(pitch)
    Ry=np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]]); Rx=np.array([[1,0,0],[0,cp,-sp],[0,sp,cp]]); return Rx@Ry
files=sorted(glob.glob(os.path.join(sys.argv[1],'*.obj')))
views=[rot(0,0),rot(np.pi/2,0),rot(0,-np.pi/2+0.001),rot(0.7,-0.35)]
rows=[]
for fn in files:
    V,C,F=load(fn); rows.append(np.concatenate([render(V,C,F,R) for R in views],1)); print('rendered',os.path.basename(fn),len(F))
Image.fromarray(np.concatenate(rows,0)).save(sys.argv[2])
