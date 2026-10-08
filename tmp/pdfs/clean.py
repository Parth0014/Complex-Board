from PIL import Image, ImageDraw
import json
from pathlib import Path
p=Path('public/vision-kit')
for x in json.loads((p/'manifest.json').read_text(encoding='utf8'))['assets']:
    if x['category'] not in ['icon stickers','labels']:continue
    im=Image.open(p/(x['id']+'.webp')).convert('RGBA');rgb=im.convert('RGB')
    seeds=[(0,0),(rgb.width-1,0),(0,rgb.height-1),(rgb.width-1,rgb.height-1),(rgb.width//2,0),(rgb.width//2,rgb.height-1),(0,rgb.height//2),(rgb.width-1,rgb.height//2)]
    for seed in seeds:
        if min(rgb.getpixel(seed))>245:ImageDraw.floodfill(rgb,seed,(255,0,255),thresh=10)
    mark=list(rgb.getdata())
    im.putdata([(r,g,b,0 if mark[i]==(255,0,255) or (x['category']=='labels' and max(r,g,b)-min(r,g,b)<8 and 165<r<250) else a) for i,(r,g,b,a) in enumerate(im.getdata())])
    im.save(p/(x['id']+'.webp'),quality=92);im.thumbnail((180,180));im.save(p/(x['id']+'-thumb.webp'),quality=82)
