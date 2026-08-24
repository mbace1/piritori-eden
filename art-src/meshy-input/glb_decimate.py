#!/usr/bin/env python
"""Reduce a .glb's triangle count by vertex clustering.

    python glb_decimate.py in.glb out.glb 12000 [--tex 1024]

WHY. Two of the Meshy account's tasks are the raw, undecimated reconstructions:
two million triangles and 74 MB each. The registered bodies in the repo are about
20k, so somewhere a hundred-to-one reduction happened. This does that reduction
locally and for free, so a master can be re-cut to any budget without paying for
a new generation.

THE METHOD, and its honest limit. Vertices are binned into a uniform grid and
each occupied cell collapses to one representative vertex; triangles whose
corners land in fewer than three distinct cells disappear. It is fast, it
preserves UVs well enough for a baked texture, and it keeps the silhouette
because it is driven by position.

It is NOT quadric error decimation. It does not preserve sharp creases
preferentially, and at aggressive ratios it will round a hard edge that a proper
decimator would keep. For flat-fill characters read at battle scale that is an
acceptable trade; for a hero prop it is not.
"""
import json, struct, sys, os, io, math
from PIL import Image

GLB_MAGIC, JSON_CHUNK, BIN_CHUNK = 0x46546C67, 0x4E4F534A, 0x004E4942
COMP = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
        5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NUM = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def read_glb(path):
    d = open(path, "rb").read()
    total = struct.unpack_from("<III", d, 0)[2]
    off, js, bin_ = 12, None, b""
    while off < total:
        clen, ctype = struct.unpack_from("<II", d, off); off += 8
        chunk = d[off:off + clen]; off += clen
        if ctype == JSON_CHUNK: js = json.loads(chunk.decode("utf-8"))
        elif ctype == BIN_CHUNK: bin_ = chunk
    return js, bin_


def write_glb(path, js, bin_):
    jb = json.dumps(js, separators=(",", ":")).encode("utf-8")
    jb += b" " * ((4 - len(jb) % 4) % 4)
    bb = bin_ + b"\0" * ((4 - len(bin_) % 4) % 4)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", GLB_MAGIC, 2,
                            12 + 8 + len(jb) + (8 + len(bb) if bb else 0)))
        f.write(struct.pack("<II", len(jb), JSON_CHUNK)); f.write(jb)
        if bb:
            f.write(struct.pack("<II", len(bb), BIN_CHUNK)); f.write(bb)


def acc(js, bin_, i):
    a = js['accessors'][i]
    fmt, size = COMP[a['componentType']]; n = NUM[a['type']]
    bv = js['bufferViews'][a['bufferView']]
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride') or size * n
    return [struct.unpack_from('<' + fmt * n, bin_, base + k * stride)
            for k in range(a['count'])]


def cluster(pos, uv, idx, target):
    xs = [p[0] for p in pos]; ys = [p[1] for p in pos]; zs = [p[2] for p in pos]
    lo = (min(xs), min(ys), min(zs)); hi = (max(xs), max(ys), max(zs))
    span = max(hi[i] - lo[i] for i in range(3)) or 1.0
    n = max(8, int(round((target / 2.0) ** (1 / 3) * 3)))
    best = (None, None, None, None)
    tried = {n}
    for _ in range(22):
        cell = span / n
        buckets = {}
        # THE UV TERM IS NOT OPTIONAL. Clustering on position alone merges
        # vertices that sit next to each other in space but far apart in the
        # atlas - the two sides of a UV seam - and averaging their coordinates
        # samples the middle of an unrelated island. The mesh stays the right
        # shape and the texture shreds. Binning UV alongside position keeps the
        # islands apart at the cost of a few more vertices.
        UVN = 48
        for vi, p in enumerate(pos):
            u = uv[vi] if uv else (0.0, 0.0)
            key = (int((p[0] - lo[0]) / cell), int((p[1] - lo[1]) / cell),
                   int((p[2] - lo[2]) / cell),
                   int(u[0] * UVN), int(u[1] * UVN))
            b = buckets.get(key)
            if b is None:
                buckets[key] = [list(p), list(uv[vi]) if uv else [0, 0], 1, len(buckets)]
            else:
                for k in range(3): b[0][k] += p[k]
                if uv:
                    b[1][0] += uv[vi][0]; b[1][1] += uv[vi][1]
                b[2] += 1
        vmap = {}
        for key, b in buckets.items():
            vmap[key] = b[3]
        def cellof(vi):
            p = pos[vi]; u = uv[vi] if uv else (0.0, 0.0)
            return (int((p[0] - lo[0]) / cell), int((p[1] - lo[1]) / cell),
                    int((p[2] - lo[2]) / cell),
                    int(u[0] * UVN), int(u[1] * UVN))
        tris = []
        seen = set()
        for t in range(0, len(idx) - 2, 3):
            a, b_, c = idx[t], idx[t + 1], idx[t + 2]
            ka, kb, kc = cellof(a), cellof(b_), cellof(c)
            if ka == kb or kb == kc or ka == kc:
                continue
            tri = (vmap[ka], vmap[kb], vmap[kc])
            sig = tuple(sorted(tri))
            if sig in seen:
                continue
            seen.add(sig)
            tris.append(tri)
        def build():
            v = [None] * len(buckets); u = [None] * len(buckets)
            for kk, bb in buckets.items():
                c = bb[2]
                v[bb[3]] = tuple(x / c for x in bb[0])
                u[bb[3]] = (bb[1][0] / c, bb[1][1] / c)
            return v, u
        # keep the best bracket rather than the first pass under target: the
        # grid is coarse, so a single downward step can undershoot by half
        if best[0] is None or abs(len(tris) - target) < abs(best[0] - target):
            v, u = build()
            best = (len(tris), v, u, tris)
        if target * 0.92 <= len(tris) <= target * 1.08:
            break
        ratio = len(tris) / max(1, target)
        n = max(6, int(round(n / (ratio ** 0.33))))
        if n in tried:
            break
        tried.add(n)
    return best[1], best[2], best[3]


def main():
    src, dst, target = sys.argv[1], sys.argv[2], int(sys.argv[3])
    tex = int(sys.argv[sys.argv.index('--tex') + 1]) if '--tex' in sys.argv else None
    js, bin_ = read_glb(src)
    prim = js['meshes'][0]['primitives'][0]
    at = prim['attributes']
    pos = acc(js, bin_, at['POSITION'])
    uv = acc(js, bin_, at['TEXCOORD_0']) if 'TEXCOORD_0' in at else None
    idx = [i[0] for i in acc(js, bin_, prim['indices'])]
    before = len(idx) // 3
    verts, uvs, tris = cluster(pos, uv, idx, target)

    nb = bytearray()
    def add(data, target_align=4):
        while len(nb) % target_align: nb.append(0)
        o = len(nb); nb.extend(data); return o
    pbytes = b''.join(struct.pack('<fff', *v) for v in verts)
    po = add(pbytes)
    ubytes = b''.join(struct.pack('<ff', *u) for u in uvs)
    uo = add(ubytes)
    ibytes = b''.join(struct.pack('<III', *t) for t in tris)
    io_ = add(ibytes)
    img_bytes = None
    if js.get('images'):
        im0 = js['images'][0]; bv = js['bufferViews'][im0['bufferView']]
        o = bv.get('byteOffset', 0)
        raw = bin_[o:o + bv['byteLength']]
        pic = Image.open(io.BytesIO(raw)).convert('RGB')
        if tex and max(pic.size) > tex:
            pic = pic.resize((tex, tex), Image.LANCZOS)
        buf = io.BytesIO(); pic.save(buf, 'JPEG', quality=88, optimize=True)
        img_bytes = buf.getvalue()
        imo = add(img_bytes)

    xs = [v[0] for v in verts]; ys = [v[1] for v in verts]; zs = [v[2] for v in verts]
    out = {
        "asset": {"version": "2.0", "generator": "glb_decimate.py"},
        "scene": 0, "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "TEXCOORD_0": 1},
                                    "indices": 2, "material": 0}]}],
        "materials": [{"pbrMetallicRoughness": {
            "baseColorTexture": {"index": 0} if img_bytes else None,
            "baseColorFactor": [1, 1, 1, 1], "metallicFactor": 0, "roughnessFactor": 1}}],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": len(verts), "type": "VEC3",
             "min": [min(xs), min(ys), min(zs)], "max": [max(xs), max(ys), max(zs)]},
            {"bufferView": 1, "componentType": 5126, "count": len(uvs), "type": "VEC2"},
            {"bufferView": 2, "componentType": 5125, "count": len(tris) * 3, "type": "SCALAR"},
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": po, "byteLength": len(pbytes), "target": 34962},
            {"buffer": 0, "byteOffset": uo, "byteLength": len(ubytes), "target": 34962},
            {"buffer": 0, "byteOffset": io_, "byteLength": len(ibytes), "target": 34963},
        ],
        "buffers": [{"byteLength": len(nb)}],
    }
    if img_bytes:
        out["bufferViews"].append({"buffer": 0, "byteOffset": imo, "byteLength": len(img_bytes)})
        out["images"] = [{"bufferView": 3, "mimeType": "image/jpeg"}]
        out["textures"] = [{"source": 0}]
    else:
        out["materials"][0]["pbrMetallicRoughness"].pop("baseColorTexture")
    write_glb(dst, out, bytes(nb))
    a, b = os.path.getsize(src), os.path.getsize(dst)
    print(f"  {os.path.basename(dst):34} {before:,} -> {len(tris):,} tris   "
          f"{a/1e6:.1f} -> {b/1e6:.2f} MB")


if __name__ == "__main__":
    main()
