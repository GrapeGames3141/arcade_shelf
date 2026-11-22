#!/usr/bin/env python3
"""Build lawnchairaces.html from parts/.

Edit the files in parts/, never the generated HTML. Run:  python build.py
Parts are joined in name order: *.html parts are pasted as-is, *.js parts are
wrapped together in one <script> block placed where 00-head.html ends.
"""
import os, sys, hashlib

ROOT = os.path.dirname(os.path.abspath(__file__))
PARTS = os.path.join(ROOT, 'parts')
OUT = os.path.join(ROOT, 'lawnchairaces.html')


def main():
    names = sorted(os.listdir(PARTS))
    head = [n for n in names if n.endswith('.html') and n.startswith('00')]
    tail = [n for n in names if n.endswith('.html') and n.startswith('99')]
    js = [n for n in names if n.endswith('.js')]
    out = []
    for n in head:
        out.append(open(os.path.join(PARTS, n), encoding='utf-8').read())
    out.append('<script>\n"use strict";\n')
    for n in js:
        src = open(os.path.join(PARTS, n), encoding='utf-8').read()
        out.append('// ===== ' + n + ' =====\n' + src + '\n')
    out.append('</script>\n')
    for n in tail:
        out.append(open(os.path.join(PARTS, n), encoding='utf-8').read())
    html = ''.join(out)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    data = html.encode('utf-8')
    print('built %s  %d bytes (%.1f KB)  sha256 %s' % (
        os.path.basename(OUT), len(data), len(data) / 1024,
        hashlib.sha256(data).hexdigest()[:16]))


if __name__ == '__main__':
    main()
