#!/usr/bin/env python3
"""Build flockfortress.html from parts/ (edit the parts, never the HTML)."""
import os, sys, glob

here = os.path.dirname(os.path.abspath(__file__))
parts = sorted(glob.glob(os.path.join(here, 'parts', '*')))
html = [p for p in parts if p.endswith('.html')]
js = [p for p in parts if p.endswith('.js')]
out = []
for p in html:
    out.append(open(p, encoding='utf-8').read())
out.append('<script>\n')
for p in js:
    out.append('// ===== ' + os.path.basename(p) + ' =====\n')
    out.append(open(p, encoding='utf-8').read())
    out.append('\n')
out.append('</script>\n</body>\n</html>\n')
dst = os.path.join(here, 'flockfortress.html')
with open(dst, 'w', encoding='utf-8', newline='\n') as f:
    f.write(''.join(out))
print('wrote', dst, os.path.getsize(dst), 'bytes')
