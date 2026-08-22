#!/usr/bin/env python
"""Report what is actually inside a .glb, and optionally pull its textures out.

    python art-src/tools/glb_info.py model.glb
    python art-src/tools/glb_info.py model.glb --extract /tmp/tex

Written because "trust the filename" has been wrong twice: a Meshy zip called
"Worn Out Wanderer" turned out to be the Hired subclass, identifiable only by
reading its UV atlas, and every incoming asset needs its triangle count and
texture size checked before it is registered rather than after it has shipped.

A glb is a 12-byte header then chunks of [uint32 length][uint32 type][payload]:
JSON (0x4E4F534A) holds the glTF document, BIN (0x004E4942) holds every buffer
it points into. Both are read here; nothing is written back.
"""

import json
import struct
import sys

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def read(path):
    d = open(path, "rb").read()
    if d[:4] != b"glTF":
        raise SystemExit("%s is not a glb" % path)
    off, js, binary = 12, None, b""
    while off < len(d):
        ln, ty = struct.unpack_from("<II", d, off)
        payload = d[off + 8: off + 8 + ln]
        if ty == JSON_CHUNK:
            js = json.loads(payload)
        elif ty == BIN_CHUNK:
            binary = payload
        off += 8 + ln
    if js is None:
        raise SystemExit("%s has no JSON chunk" % path)
    return js, binary, len(d)


def report(path, extract=None):
    js, binary, size = read(path)

    tris = 0
    for mesh in js.get("meshes", []):
        for prim in mesh.get("primitives", []):
            if "indices" in prim:
                tris += js["accessors"][prim["indices"]]["count"] // 3

    print("=" * 68)
    print(path.replace("\\", "/").split("/")[-1])
    print("  file        %.2f MB" % (size / 1048576.0))
    print("  triangles   %d" % tris)
    print("  meshes %d   nodes %d   materials %d   skins %d"
          % (len(js.get("meshes", [])), len(js.get("nodes", [])),
             len(js.get("materials", [])), len(js.get("skins", []))))
    for skin in js.get("skins", []):
        print("  skeleton    %d joints" % len(skin.get("joints", [])))

    for i, im in enumerate(js.get("images", [])):
        bv = js["bufferViews"][im["bufferView"]] if "bufferView" in im else None
        n = bv["byteLength"] if bv else 0
        print("  image %d     %s  %.2f MB" % (i, im.get("mimeType", "?"), n / 1048576.0))
        if extract and bv:
            start = bv.get("byteOffset", 0)
            out = "%s-%d.png" % (extract, i)
            open(out, "wb").write(binary[start:start + bv["byteLength"]])
            print("              -> %s" % out)

    anims = js.get("animations", [])
    if anims:
        print("  animations  %d" % len(anims))
        for a in anims:
            print("      %-30s %d channels"
                  % (a.get("name", "<unnamed>"), len(a.get("channels", []))))


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    extract = None
    if "--extract" in sys.argv:
        extract = sys.argv[sys.argv.index("--extract") + 1]
        args = [a for a in args if a != extract]
    if not args:
        raise SystemExit(__doc__)
    for p in args:
        report(p, extract)
