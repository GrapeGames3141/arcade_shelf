#!/usr/bin/env python3
"""Build stafftraining.html from parts/. Edit the parts, never the HTML."""
import glob, os
here = os.path.dirname(os.path.abspath(__file__))
parts = os.path.join(here, 'parts')
shell = open(os.path.join(parts, 'shell.html'), encoding='utf-8').read()
css = open(os.path.join(parts, 'style.css'), encoding='utf-8').read()
js = []
for f in sorted(glob.glob(os.path.join(parts, '*.js'))):
    js.append('// ===== ' + os.path.basename(f) + ' =====\n' + open(f, encoding='utf-8').read())
out = shell.replace('/*@CSS*/', css).replace('/*@JS*/', '\n'.join(js))
dst = os.path.join(here, 'stafftraining.html')
open(dst, 'w', encoding='utf-8', newline='\n').write(out)
print('built', dst, f'{os.path.getsize(dst)/1024:.1f} KB')
