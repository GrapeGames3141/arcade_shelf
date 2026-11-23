"""Add the Cartastrophe Online row to experiments/README.md (idempotent). Usage: python docs-row.py <repo root>"""
import sys, os
root = sys.argv[1] if len(sys.argv) > 1 else '.'
p = os.path.join(root, 'experiments', 'README.md')
s = open(p, encoding='utf-8').read()
row = '| Cartastrophe Online (2-player, Cloudflare Worker + Durable Objects) | `cartastrophe-online/` (run `run-local.cmd`, see its README) | `http://127.0.0.1:8787/` (wrangler dev, not the static server) |'
if 'cartastrophe-online/' in s:
    print('row already present')
else:
    nl = '\r\n' if '\r\n' in s else '\n'
    s = s.rstrip('\r\n') + nl + row + nl
    open(p, 'w', encoding='utf-8', newline='').write(s)
    print('row added')
