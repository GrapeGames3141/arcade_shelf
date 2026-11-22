import os,glob,sys
d=os.path.dirname(os.path.abspath(__file__))
parts=sorted(glob.glob(os.path.join(d,'parts','*')))
out=''.join(open(p,encoding='utf-8').read() for p in parts)
open(os.path.join(d,'saltaquarium.html'),'w',encoding='utf-8',newline='').write(out)
print('built',len(out),'bytes from',len(parts),'parts')
