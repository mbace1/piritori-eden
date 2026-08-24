#!/usr/bin/env python
"""Render a .glb to a PNG with no engine and no dependencies beyond Pillow.

    python glb_render.py model.glb out.png [--size 512] [--yaw 0]

WHY THIS EXISTS. Comparing two character models is the whole job and there was no
way to look at one — Meshy returns a thumbnail only for models it just made, and
the thirteen bodies already in the repo have none. Opening Godot to eyeball a
mesh is a session; this is a few seconds.

WHAT IT IS NOT. A z-buffered rasteriser with one directional light and nearest-
neighbour texture lookup. It is for judging silhouette, proportion and whether
the texture still reads as flat ink over flat fill. It is not a preview of how
the game will light anything.
"""
import json, struct, math, sys, io, os
from PIL import Image

COMP = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
        5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NUM = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def read_glb(path):
    d = open(path, 'rb').read()
    total = struct.unpack_from('<III', d, 0)[2]
    off, js, bin_ = 12, None, None
    while off < total:
        clen, ctype = struct.unpack_from('<II', d, off); off += 8
        chunk = d[off:off + clen]; off += clen
        if ctype == 0x4E4F534A: js = json.loads(chunk.decode('utf-8'))
        elif ctype == 0x004E4942: bin_ = chunk
    return js, bin_


def accessor(js, bin_, idx):
    a = js['accessors'][idx]
    fmt, size = COMP[a['componentType']]
    n = NUM[a['type']]
    bv = js['bufferViews'][a['bufferView']]
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride') or size * n
    out = []
    for i in range(a['count']):
        out.append(struct.unpack_from('<' + fmt * n, bin_, base + i * stride))
    return out


def node_matrix(nd):
    if 'matrix' in nd:
        m = nd['matrix']
        return [m[0:4], m[4:8], m[8:12], m[12:16]]
    t = nd.get('translation', [0, 0, 0])
    r = nd.get('rotation', [0, 0, 0, 1])
    s = nd.get('scale', [1, 1, 1])
    x, y, z, w = r
    rot = [[1-2*(y*y+z*z), 2*(x*y+z*w),   2*(x*z-y*w),   0],
           [2*(x*y-z*w),   1-2*(x*x+z*z), 2*(y*z+x*w),   0],
           [2*(x*z+y*w),   2*(y*z-x*w),   1-2*(x*x+y*y), 0],
           [0, 0, 0, 1]]
    for i in range(3):
        for j in range(3):
            rot[i][j] *= s[i]
    rot[3][0], rot[3][1], rot[3][2] = t
    return rot


def mul(v, m):
    x, y, z = v
    return (x*m[0][0]+y*m[1][0]+z*m[2][0]+m[3][0],
            x*m[0][1]+y*m[1][1]+z*m[2][1]+m[3][1],
            x*m[0][2]+y*m[1][2]+z*m[2][2]+m[3][2])


def collect(js, bin_):
    """Walk the scene graph so node transforms are honoured."""
    tris = []
    tex = None
    if js.get('images'):
        im = js['images'][0]
        if 'bufferView' in im:
            bv = js['bufferViews'][im['bufferView']]
            o = bv.get('byteOffset', 0)
            tex = Image.open(io.BytesIO(bin_[o:o + bv['byteLength']])).convert('RGB')

    def walk(ni, parent):
        nd = js['nodes'][ni]
        m = node_matrix(nd)
        acc = [[sum(m[i][k] * parent[k][j] for k in range(4)) for j in range(4)]
               for i in range(4)]
        if 'mesh' in nd:
            for pr in js['meshes'][nd['mesh']].get('primitives', []):
                at = pr.get('attributes', {})
                if 'POSITION' not in pr.get('attributes', {}):
                    continue
                pos = accessor(js, bin_, at['POSITION'])
                uv = accessor(js, bin_, at['TEXCOORD_0']) if 'TEXCOORD_0' in at else None
                idx = [i[0] for i in accessor(js, bin_, pr['indices'])] if 'indices' in pr \
                      else list(range(len(pos)))
                wp = [mul(p, acc) for p in pos]
                for i in range(0, len(idx) - 2, 3):
                    a, b, c = idx[i], idx[i+1], idx[i+2]
                    tris.append((wp[a], wp[b], wp[c],
                                 uv[a] if uv else None,
                                 uv[b] if uv else None,
                                 uv[c] if uv else None))
        for ch in nd.get('children', []):
            walk(ch, acc)

    I = [[1 if i == j else 0 for j in range(4)] for i in range(4)]
    scene = js.get('scenes', [{}])[js.get('scene', 0)]
    for ni in scene.get('nodes', range(len(js.get('nodes', [])))):
        walk(ni, I)
    return tris, tex


def render(path, out, size=512, yaw=0.0, bg=(24, 26, 30)):
    js, bin_ = read_glb(path)
    tris, tex = collect(js, bin_)
    if not tris:
        sys.exit('no triangles')
    xs = [p[0] for t in tris for p in t[:3]]
    ys = [p[1] for t in tris for p in t[:3]]
    zs = [p[2] for t in tris for p in t[:3]]
    cx, cy, cz = (min(xs)+max(xs))/2, (min(ys)+max(ys))/2, (min(zs)+max(zs))/2
    span = max(max(xs)-min(xs), max(ys)-min(ys), max(zs)-min(zs)) or 1.0
    scale = size * 0.86 / span
    ca, sa = math.cos(yaw), math.sin(yaw)
    W = H = size
    img = Image.new('RGB', (W, H), bg)
    px = img.load()
    zbuf = [[1e30]*W for _ in range(H)]
    tw, th = (tex.size if tex else (0, 0))
    tpx = tex.load() if tex else None
    LX, LY, LZ = 0.35, 0.55, 0.75
    ln = math.sqrt(LX*LX+LY*LY+LZ*LZ)
    LX, LY, LZ = LX/ln, LY/ln, LZ/ln
    for (p0, p1, p2, u0, u1, u2) in tris:
        proj = []
        for (X, Y, Z) in (p0, p1, p2):
            X -= cx; Y -= cy; Z -= cz
            rx = X*ca + Z*sa
            rz = -X*sa + Z*ca
            proj.append((W/2 + rx*scale, H/2 - Y*scale, rz))
        (ax, ay, az), (bx, by, bz), (cx_, cy_, cz_) = proj
        area = (bx-ax)*(cy_-ay) - (by-ay)*(cx_-ax)
        if abs(area) < 1e-9:
            continue
        ux, uy, uz = p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]
        vx, vy, vz = p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]
        nx, ny, nz = uy*vz-uz*vy, uz*vx-ux*vz, ux*vy-uy*vx
        nl = math.sqrt(nx*nx+ny*ny+nz*nz) or 1.0
        nx, ny, nz = nx/nl, ny/nl, nz/nl
        rnx = nx*ca + nz*sa
        rnz = -nx*sa + nz*ca
        lam = max(0.0, rnx*LX + ny*LY + rnz*LZ)
        shade = 0.42 + 0.58*lam
        x0 = max(0, int(min(ax, bx, cx_))); x1 = min(W-1, int(max(ax, bx, cx_))+1)
        y0 = max(0, int(min(ay, by, cy_))); y1 = min(H-1, int(max(ay, by, cy_))+1)
        for y in range(y0, y1+1):
            for x in range(x0, x1+1):
                w0 = ((bx-ax)*(y+0.5-ay) - (by-ay)*(x+0.5-ax)) / area
                w1 = ((cx_-bx)*(y+0.5-by) - (cy_-by)*(x+0.5-bx)) / area
                w2 = 1.0 - w0 - w1
                if w0 < 0 or w1 < 0 or w2 < 0:
                    continue
                z = w1*az + w2*bz + w0*cz_
                if z >= zbuf[y][x]:
                    continue
                zbuf[y][x] = z
                if tpx and u0:
                    tu = w1*u0[0] + w2*u1[0] + w0*u2[0]
                    tv = w1*u0[1] + w2*u1[1] + w0*u2[1]
                    sx = min(tw-1, max(0, int(tu*tw)))
                    sy = min(th-1, max(0, int(tv*th)))
                    r, g, b = tpx[sx, sy]
                else:
                    r = g = b = 190
                px[x, y] = (min(255, int(r*shade)), min(255, int(g*shade)), min(255, int(b*shade)))
    img.save(out)
    return len(tris)


if __name__ == '__main__':
    a = sys.argv[1:]
    size = 512; yaw = 0.0
    if '--size' in a: size = int(a[a.index('--size')+1])
    if '--yaw' in a: yaw = math.radians(float(a[a.index('--yaw')+1]))
    pos = [x for i, x in enumerate(a) if not x.startswith('--')
           and not (i > 0 and a[i-1].startswith('--'))]
    n = render(pos[0], pos[1], size, yaw)
    print(f"  {os.path.basename(pos[0]):32} {n} tris -> {pos[1]}")
