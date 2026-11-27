"""Writes a copy of deeprail.html shaped for a claude.ai artifact (the host adds the document wrapper; no Arcade Shelf link).
usage: python test/artifact.py <out.html>"""
import re, sys, os
here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s = open(os.path.join(here, 'deeprail.html'), encoding='utf-8').read()
s = re.sub(r'<!DOCTYPE html>\s*<html lang="en">\s*<head>\s*', '', s, count=1)
s = re.sub(r'<meta charset="utf-8">\s*', '', s, count=1)
s = re.sub(r'<meta name="viewport"[^>]*>\s*', '', s, count=1)
s = s.replace('</head>\n<body>\n', '', 1).replace('</body>\n</html>', '')
s = re.sub(r'<button type="button" class="go alt" data-arcade-home[^>]*>ARCADE SHELF</button>', '', s)
s = s.replace(':root{--ink:#f3e7cf;', ':root{color-scheme:dark;--ink:#f3e7cf;', 1)
s = s.replace('<meta name="theme-color" content="#07060a">\n<title>Deep Rail</title>', '<title>Deep Rail</title>\n<meta name="theme-color" content="#07060a">', 1)
assert s.startswith('<title>Deep Rail</title>'), s[:80]
open(sys.argv[1], 'w', encoding='utf-8').write(s); print('wrote', sys.argv[1], len(s))
