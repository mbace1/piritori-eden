#!/usr/bin/env python
"""Rescale the texture inside a .glb without touching the mesh.

    python glb_retex.py in.glb out.glb 1024 [--quality 88]

WHY THIS IS FREE AND REGENERATING IS NOT. Meshy's texture size is not a knob on
the job, and the repo's 512px bodies turned out to be its 2048px masters with the
texture downscaled - `parka-man-v01` and its Meshy task are the same 18,761
triangles and differ only in the image. So the whole resolution question is a
local re-encode, not a new generation, and comparing 2048 against 1024 against
512 costs nothing.

It rewrites the image bytes in place and repacks the binary chunk, because a
shorter image left at its old bufferView length gives a file that is technically
valid and reads garbage past the end of the JPEG.
"""
import json, struct, sys, os, io
from PIL import Image

GLB_MAGIC, JSON_CHUNK, BIN_CHUNK = 0x46546C67, 0x4E4F534A, 0x004E4942


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
    total = 12 + 8 + len(jb) + (8 + len(bb) if bb else 0)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", GLB_MAGIC, 2, total))
        f.write(struct.pack("<II", len(jb), JSON_CHUNK)); f.write(jb)
        if bb:
            f.write(struct.pack("<II", len(bb), BIN_CHUNK)); f.write(bb)


def retex(src, dst, size, quality=88):
    js, bin_ = read_glb(src)
    if not js.get("images"):
        sys.exit(f"{src}: no embedded image")

    new_images = []
    for im in js["images"]:
        bv = js["bufferViews"][im["bufferView"]]
        o = bv.get("byteOffset", 0)
        raw = bin_[o:o + bv["byteLength"]]
        pic = Image.open(io.BytesIO(raw)).convert("RGB")
        if max(pic.size) > size:
            pic = pic.resize((size, size), Image.LANCZOS)
        buf = io.BytesIO()
        pic.save(buf, "JPEG", quality=quality, optimize=True)
        new_images.append((im, buf.getvalue(), pic.size))

    # repack every bufferView, substituting the new image bytes
    new_bin = bytearray()
    sub = {im["bufferView"]: data for im, data, _ in new_images}
    for i, bv in enumerate(js["bufferViews"]):
        while len(new_bin) % 4:
            new_bin.append(0)
        if i in sub:
            data = sub[i]
        else:
            o = bv.get("byteOffset", 0)
            data = bin_[o:o + bv["byteLength"]]
        bv["byteOffset"] = len(new_bin)
        bv["byteLength"] = len(data)
        bv["buffer"] = 0
        new_bin += data
    js["buffers"] = [{"byteLength": len(new_bin)}]
    for im, _, _ in new_images:
        im["mimeType"] = "image/jpeg"

    write_glb(dst, js, bytes(new_bin))
    a, b = os.path.getsize(src), os.path.getsize(dst)
    print(f"  {os.path.basename(dst):40} {new_images[0][2][0]}px  "
          f"{a/1e6:.1f} -> {b/1e6:.2f} MB  ({a/b:.1f}x smaller)")


if __name__ == "__main__":
    q = 88
    if "--quality" in sys.argv:
        q = int(sys.argv[sys.argv.index("--quality") + 1])
    pos = [a for i, a in enumerate(sys.argv[1:])
           if not a.startswith("--") and not (i > 0 and sys.argv[i].startswith("--"))]
    retex(pos[0], pos[1], int(pos[2]), q)
