import sys,glob
from PIL import Image,ImageDraw
# usage: sheet.py out.png cols w img1 img2 ...
out,cols,w=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]);files=sys.argv[4:]
ims=[Image.open(f).convert('RGB') for f in files];h=int(w*ims[0].height/ims[0].width)
rows=(len(ims)+cols-1)//cols;S=Image.new('RGB',(cols*w,rows*h),(20,20,20));d=ImageDraw.Draw(S)
for i,(f,im) in enumerate(zip(files,ims)):
    x,y=(i%cols)*w,(i//cols)*h;S.paste(im.resize((w,h)),(x,y));d.text((x+4,y+4),f.split('/')[-1].split('-',2)[-1][:-4],fill=(255,255,0))
S.save(out)
