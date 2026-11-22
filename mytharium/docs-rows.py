# Adds the Mytharium rows to the root CLAUDE.md and README.md game tables (idempotent). Run from the repo root.
import os,sys
root=sys.argv[1] if len(sys.argv)>1 else '.'
def ins(fn,after,row):
    p=os.path.join(root,fn);t=open(p,encoding='utf-8',newline='').read()
    if '| Mytharium |' in t:return False
    lines=t.split('\n');idx=[i for i,l in enumerate(lines) if l.startswith(after)]
    if not idx:print('no anchor in',fn);return False
    cr='\r' if lines[idx[0]].endswith('\r') else ''
    lines.insert(idx[0]+1,row+cr);open(p,'w',encoding='utf-8',newline='').write('\n'.join(lines));print('added Mytharium to',fn);return True
ins('CLAUDE.md','| Wool Rampage |','| Mytharium | `mytharium\\mytharium.html` | none yet |')
ins('README.md','| Wool Rampage |','| Mytharium | `mytharium/mytharium.html` | `http://127.0.0.1:8000/mytharium/mytharium.html` |')
