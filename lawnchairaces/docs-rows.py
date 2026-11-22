# Adds the Lawnchair Aces rows to the root CLAUDE.md and README.md game tables (idempotent). Run from the repo root.
import os, sys
root = sys.argv[1] if len(sys.argv) > 1 else '.'
def ins(fn, anchors, row):
    p = os.path.join(root, fn)
    t = open(p, encoding='utf-8', newline='').read()
    if '| Lawnchair Aces |' in t:
        print('Lawnchair Aces already listed in', fn); return False
    lines = t.split('\n')
    for after in anchors:
        idx = [i for i, l in enumerate(lines) if l.startswith(after)]
        if idx:
            cr = '\r' if lines[idx[0]].endswith('\r') else ''
            lines.insert(idx[0] + 1, row + cr)
            open(p, 'w', encoding='utf-8', newline='').write('\n'.join(lines))
            print('added Lawnchair Aces to', fn); return True
    print('no anchor row in', fn); return False
ins('CLAUDE.md', ['| Mytharium |', '| Wool Rampage |'], '| Lawnchair Aces | `lawnchairaces\\lawnchairaces.html` | none yet |')
ins('README.md', ['| Mytharium |', '| Wool Rampage |'], '| Lawnchair Aces | `lawnchairaces/lawnchairaces.html` | `http://127.0.0.1:8000/lawnchairaces/lawnchairaces.html` |')
