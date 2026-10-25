# Cut a character's approved concept into waist-up paper-rig pieces, the way Toko's rig was cut
# (Suds-Jack piritori/explorations/toko-loops/tools/seg.py + layers.py): GrabCut seeded by hand,
# then pieces on hidden pivots, and a shaded fill under each moving piece so a gap reads as the
# cut-out's shadow. Nothing is redrawn: every pixel of the character is the concept's.
#
#   uv run --no-project --with opencv-python-headless --with numpy python art-src/cutins/cut.py jaska
#
# Reads art-src/cutins/<id>/rig.src.json (source, crop, seeds, pieces); writes <id>/out/*.png
# (RGBA, each piece cropped to its own box) and <id>/out/rig.json (boxes, pivots) for the player.
# Offline tool: OpenCV runs in a throwaway uv environment, it is not a dependency of the game.
import cv2, numpy as np, json, sys, os
ID = sys.argv[1]; HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, ID)
cfg = json.load(open(os.path.join(D, 'rig.src.json'))); OUT = os.path.join(D, 'out'); os.makedirs(OUT, exist_ok=True)
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
im = cv2.imread(os.path.join(REPO, cfg['source'])); x0, y0, x1, y1 = cfg['crop']; im = im[y0:y1, x0:x1].copy(); H, W = im.shape[:2]
P = lambda pts: np.array([(x - x0, y - y0) for x, y in pts], np.int32)
def poly(pts):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [P(pts)], 255); return m > 0

# ---- the figure: GrabCut, seeded: the frame's border is background, the hand polygons are sure figure
mask = np.full((H, W), cv2.GC_PR_BGD, np.uint8)
cv2.fillPoly(mask, [P(cfg['outer'])], cv2.GC_PR_FGD)
for s in cfg['sure']: cv2.fillPoly(mask, [P(s)], cv2.GC_FGD)
for s in cfg.get('sure_bg', []): cv2.fillPoly(mask, [P(s)], cv2.GC_BGD)
mask[:4, :] = mask[:, :4] = mask[:, -4:] = cv2.GC_BGD
bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
cv2.grabCut(im, mask, None, bgd, fgd, 8, cv2.GC_INIT_WITH_MASK)
fig = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(fig); fig = np.where(lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
inv = cv2.bitwise_not(fig); n, lab, st, _ = cv2.connectedComponentsWithStats(inv)
for i in range(1, n):                                                   # holes inside the figure are figure (glasses, gaps)
    x, y, w, h, a = st[i]
    if x > 0 and y > 0 and x + w < W and y + h < H and a < cfg.get('max_hole', 6000): fig[lab == i] = 255
for s in cfg.get('cut_out', []): fig[poly(s)] = 0                         # background seen through the figure, kept as background
fig = cv2.morphologyEx(fig, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0
# the bottom edge is a cut, not a silhouette: anything below the waist line goes
fig &= ~poly([(x0, cfg['waist']), (x1, cfg['waist']), (x1, y1), (x0, y1)])

# ---- the pieces
pieces, rig = {}, {'id': ID, 'source': cfg['source'], 'crop': cfg['crop'], 'size': [W, H], 'pieces': []}
taken = np.zeros((H, W), bool)
# pieces with a region claim first (lowest "claim" first, so a jaw inside a head goes before it); a piece
# without a region takes what is left. Draw order stays the list's.
for pc in sorted([q for q in cfg['pieces'] if q.get('region')], key=lambda q: q.get('claim', 0)) + [q for q in cfg['pieces'] if not q.get('region')]:
    m = fig & poly(pc['region']) & ~taken if pc.get('region') else fig & ~taken
    pieces[pc['name']] = (m, pc); taken |= m
pieces = {q['name']: pieces[q['name']] for q in cfg['pieces']}
# ---- shaded fills: what each moving piece hides, painted from its own lower band and darkened, on the piece behind it
fills = {}
for name, (m, pc) in pieces.items():
    f = pc.get('fill_under')                                            # {"into": piece name, "band": px, "shade": 0.8}
    if not f: continue
    ys = np.where(m.any(1))[0]; bottom = ys.max() if len(ys) else 0
    band = m & (np.arange(H)[:, None] >= bottom - f['band'])
    fills.setdefault(f['into'], []).append((band, f.get('shade', 0.8)))
def write(name, m, extra=()):
    rgba = np.dstack([im, (m * 255).astype(np.uint8)]).copy()
    for band, shade in extra:
        add = band & ~m; rgba[add, :3] = (im[add] * shade).astype(np.uint8); rgba[add, 3] = 255; m = m | band
    ys, xs = np.where(m)
    if not len(xs): return None
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    cv2.imwrite(os.path.join(OUT, f'{name}.png'), rgba[by0:by1, bx0:bx1])
    return [int(bx0), int(by0), int(bx1 - bx0), int(by1 - by0)]
for name, (m, pc) in pieces.items():
    box = write(name, m, fills.get(name, ()))
    piv = pc.get('pivot'); piv = [piv[0] - x0, piv[1] - y0] if piv else None
    rig['pieces'].append({'name': name, 'file': f'{name}.png', 'box': box, 'pivot': piv})
# eyelids: small cards of the face's own skin over each eye (a blink), sampled just above the eye
for i, e in enumerate(cfg.get('eyes', [])):
    ex0, ey0, ex1, ey1 = e['box']; ex0 -= x0; ex1 -= x0; ey0 -= y0; ey1 -= y0
    sy0, sy1 = (e['sample_at'][0] - y0, e['sample_at'][1] - y0) if e.get('sample_at') else (max(0, ey0 - e.get('sample', 8)), ey0)   # skin rows: above the eye, or where told
    skin = np.median(im[sy0:sy1, ex0:ex1].reshape(-1, 3), axis=0)
    lid = np.zeros((ey1 - ey0, ex1 - ex0, 4), np.uint8); lid[..., :3] = skin; lid[..., 3] = 255
    cv2.ellipse(lid, ((ex1 - ex0) // 2, 0), ((ex1 - ex0) // 2, ey1 - ey0), 0, 0, 180, (0, 0, 0, 0), -1) if False else None
    cv2.imwrite(os.path.join(OUT, f'lid_{i}.png'), lid)
    rig['pieces'].append({'name': f'lid_{i}', 'file': f'lid_{i}.png', 'box': [ex0, ey0, ex1 - ex0, ey1 - ey0], 'pivot': None, 'lid_of': e.get('on', 'head')})
cv2.imwrite(os.path.join(OUT, '_figure.png'), np.dstack([im, (fig * 255).astype(np.uint8)]))
json.dump(rig, open(os.path.join(OUT, 'rig.json'), 'w'), indent=1)
print(ID, 'figure px', int(fig.sum()), 'pieces', [p['name'] for p in rig['pieces']])
