"""Tile screenshots into one image: python3 test/sheet.py out.png w a.png b.png ..."""
import sys
from PIL import Image
out, w = sys.argv[1], int(sys.argv[2]); ims = [Image.open(f).convert('RGB') for f in sys.argv[3:]]
cols = 2 if len(ims) > 1 else 1; th = int(ims[0].height * w / ims[0].width)
rows = (len(ims) + cols - 1) // cols; S = Image.new('RGB', (w * cols, th * rows), (0, 0, 0))
for i, im in enumerate(ims): S.paste(im.resize((w, th)), ((i % cols) * w, (i // cols) * th))
S.save(out)
