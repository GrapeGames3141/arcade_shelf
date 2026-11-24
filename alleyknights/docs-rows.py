# Adds the Alley Knights rows to the root CLAUDE.md and README.md game tables (idempotent). Run from the repo root.
import os, sys
root = sys.argv[1] if len(sys.argv) > 1 else '.'
def ins(fn, anchor, row):
    p = os.path.join(root, fn); t = open(p, encoding='utf-8', newline='').read()
    if '| Alley Knights |' in t: return False
    lines = t.split('\n'); idx = [i for i, l in enumerate(lines) if l.startswith(anchor)]
    if not idx: print('no anchor in', fn); return False
    i = idx[0]
    while i + 1 < len(lines) and lines[i + 1].startswith('| '): i += 1   # end of that table
    cr = '\r' if lines[i].endswith('\r') else ''
    lines.insert(i + 1, row + cr); open(p, 'w', encoding='utf-8', newline='').write('\n'.join(lines)); print('added Alley Knights to', fn); return True
ins('CLAUDE.md', '| Wool Rampage |', '| Alley Knights | `alleyknights\\alleyknights.html` | none yet |')
ins('README.md', '| Wool Rampage |', '| Alley Knights | `alleyknights/alleyknights.html` | `http://127.0.0.1:8000/alleyknights/alleyknights.html` |')
