"""Cut one chosen figure out of a 3-up phenotype sheet.
   usage: cut_one.py <sheet.png> <index 1-3> <out.png>
   Splits on leg-band centres, cuts at the midpoints between them, trims to the
   subject with a 6% margin, and keeps the sheet's own background value."""
from PIL import Image
import collections, sys
def cut(path, idx, out, band=(0.70,0.90)):
    im=Image.open(path).convert("RGB"); W,H=im.size; px=im.load()
    bg=collections.Counter(im.getdata()).most_common(1)[0][0]
    subj=lambda x,y: sum(abs(a-b) for a,b in zip(px[x,y],bg))>90
    # NOTE: the band stops at 0.90, not the bottom. Some sheets carry a faint
    # drawn groundline under the feet, and a band that includes it reads as one
    # continuous figure and the split silently fails.
    step=2; y0,y1=int(H*band[0]),int(H*band[1])
    cols=[any(subj(x,y) for y in range(y0,y1,step)) for x in range(0,W,step)]
    runs=[];s=None
    for i,v in enumerate(cols):
        if v and s is None: s=i
        elif not v and s is not None:
            if i-s>10: runs.append((s*step,i*step))
            s=None
    if s is not None: runs.append((s*step,W))
    merged=[]
    for a,b in runs:
        if merged and a-merged[-1][1]<150: merged[-1]=(merged[-1][0],b)
        else: merged.append((a,b))
    if len(merged)!=3:
        raise SystemExit(f"{path}: found {len(merged)} figures, expected 3")
    centres=[(a+b)//2 for a,b in merged]
    bounds=[]
    for i,c in enumerate(centres):
        left  = 0 if i==0 else (centres[i-1]+c)//2
        right = W if i==2 else (c+centres[i+1])//2
        bounds.append((left,right))
    L,R=bounds[idx-1]
    ys=[y for y in range(0,H,step) if any(subj(x,y) for x in range(L,R,step))]
    xs=[x for x in range(L,R,step) if any(subj(x,y) for y in range(0,H,step))]
    top,bot,l,r=ys[0],ys[-1],xs[0],xs[-1]
    m=int((bot-top)*0.06)
    box=(max(L,l-m),max(0,top-m),min(R,r+m),min(H,bot+m))
    im.crop(box).save(out)
    print(f"  {out.split('/')[-1]:34} {box[2]-box[0]}x{box[3]-box[1]}")
if __name__=="__main__":
    b=(0.70,0.90)
    if len(sys.argv)>5: b=(float(sys.argv[4]),float(sys.argv[5]))
    cut(sys.argv[1], int(sys.argv[2]), sys.argv[3], b)
