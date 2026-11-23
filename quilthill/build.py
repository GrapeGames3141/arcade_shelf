#!/usr/bin/env python3
"""Concatenate parts/* (sorted) into quilthill.html. Edit the parts, never the HTML."""
import os,glob
here=os.path.dirname(os.path.abspath(__file__))
out=''.join(open(f,encoding='utf-8').read().rstrip('\n')+'\n' for f in sorted(glob.glob(os.path.join(here,'parts','*'))))
dst=os.path.join(here,'quilthill.html')
open(dst,'w',encoding='utf-8',newline='\n').write(out)
print('wrote',dst,len(out.encode()),'bytes')
