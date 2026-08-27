"""Remove anything not connected to the central figure.
   The 3-up sheets are T-poses, so a neighbour's fingertips reach past the cut
   boundary and land in the crop. They are never connected to the figure, so a
   flood from the centre keeps the figure and drops the strays."""
from PIL import Image
from collections import deque, Counter
import sys
def clean(path,out):
    im=Image.open(path).convert("RGB"); W,H=im.size; px=im.load()
    bg=Counter(im.getdata()).most_common(1)[0][0]
    S=4                                   # coarse grid; strays are far from the body
    gw,gh=W//S,H//S
    solid=[[sum(abs(a-b) for a,b in zip(px[min(x*S,W-1),min(y*S,H-1)],bg))>90
            for y in range(gh)] for x in range(gw)]
    # seed at the figure's own centre column, mid height
    sx,sy=gw//2,gh//2
    if not solid[sx][sy]:
        found=False
        for dy in range(0,gh//2):
            for yy in (sy-dy,sy+dy):
                if 0<=yy<gh and solid[sx][yy]: sy=yy; found=True; break
            if found: break
    seen=[[False]*gh for _ in range(gw)]
    q=deque([(sx,sy)]); seen[sx][sy]=True
    while q:
        x,y=q.popleft()
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx,ny=x+dx,y+dy
            if 0<=nx<gw and 0<=ny<gh and not seen[nx][ny] and solid[nx][ny]:
                seen[nx][ny]=True; q.append((nx,ny))
    wiped=0
    for gx in range(gw):
        for gy in range(gh):
            if solid[gx][gy] and not seen[gx][gy]:
                for x in range(gx*S,min((gx+1)*S,W)):
                    for y in range(gy*S,min((gy+1)*S,H)):
                        px[x,y]=bg
                wiped+=1
    im.save(out)
    return wiped
if __name__=="__main__":
    for p in sys.argv[1:]:
        n=clean(p,p)
        print(f"  {p.split('/')[-1]:26} wiped {n} stray cells")
