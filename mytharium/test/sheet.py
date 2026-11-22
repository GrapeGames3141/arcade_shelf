# contact sheet per species from studio shots: python3 test/sheet.py outPrefix
import sys,glob,os
from PIL import Image,ImageDraw
pre=sys.argv[1];files=sorted(glob.glob(pre+'-*.png'));by={}
for f in files:
    sp=os.path.basename(f)[len(os.path.basename(pre))+1:].split('-')[0];by.setdefault(sp,[]).append(f)
for sp,fs in by.items():
    ims=[Image.open(f).convert('RGB') for f in fs];w=480;h=int(ims[0].height*w/ims[0].width);cols=min(4,len(ims));rows=(len(ims)+cols-1)//cols
    S=Image.new('RGB',(cols*w,rows*h),(20,20,20));d=ImageDraw.Draw(S)
    for i,(im,f) in enumerate(zip(ims,fs)):
        x,y=(i%cols)*w,(i//cols)*h;S.paste(im.resize((w,h)),(x,y));d.text((x+6,y+6),os.path.basename(f)[len(os.path.basename(pre))+1:-4],fill=(255,255,0))
    S.save(f'{pre}-SHEET-{sp}.jpg',quality=88);print('sheet',f'{pre}-SHEET-{sp}.jpg')
