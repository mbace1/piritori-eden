"""max arm span / height per figure. A strict T-pose is ~1.0; arms down is ~0.5."""
from PIL import Image
import collections, sys
def sheet(path):
    im=Image.open(path).convert("RGB"); W,H=im.size; px=im.load()
    bg=collections.Counter(im.getdata()).most_common(1)[0][0]
    subj=lambda x,y: sum(abs(a-b) for a,b in zip(px[x,y],bg))>90
    step=2; y0,y1=int(H*0.70),int(H*0.96)
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
    out=[]
    for a,b in merged:
        cx=(a+b)//2
        ys=[y for y in range(0,H,step) if any(subj(x,y) for x in range(a,min(b,W),step))]
        if not ys: continue
        top,bot=ys[0],ys[-1]; h=bot-top; best=0
        for row in range(top,bot,step*2):
            c=cx
            if not subj(c,row):
                f=None
                for dx in range(0,260,step):
                    if subj(max(0,c-dx),row): f=c-dx; break
                    if subj(min(W-1,c+dx),row): f=c+dx; break
                if f is None: continue
                c=f
            L=c
            while L-step>=0 and subj(L-step,row): L-=step
            R=c
            while R+step<W and subj(R+step,row): R+=step
            best=max(best,R-L)
        out.append(best/h)
    return out
if __name__=="__main__":
    for p in sys.argv[1:]:
        r=sheet(p); m=sum(r)/len(r) if r else 0
        v="ok" if m>0.88 else ("partial" if m>0.65 else "DROPPED")
        print(f"{p.split('/')[-1]:22} {' '.join(f'{x:.2f}' for x in r):>22}  mean {m:.2f}  {v}")
