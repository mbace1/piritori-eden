#!/usr/bin/env python
"""Strip embedded textures out of a .glb, keeping geometry, skin and animation.

    python art-src/tools/strip_glb_texture.py in.glb out.glb

WHY. Meshy returns each animation clip as a COMPLETE character: mesh, skeleton,
clip, and a copy of the same 6.5MB PNG every time. Four clips is 28MB of which
26MB is one texture repeated four times, and this repository exists partly
because binary art does not diff (`CLAUDE.md`).

The base character already carries the texture. The clips only need to bring
their animation, so the image is removed and the material left untextured —
Godot binds the clip to the character that already has one.

HOW A GLB IS BUILT, since this edits one by hand:

    12-byte header, then chunks of [uint32 length][uint32 type][payload]
      type 0x4E4F534A  JSON   the glTF document
      type 0x004E4942  BIN    every buffer the document points into

Images live in the BIN chunk like everything else, addressed by a bufferView.
Removing one means dropping the image, rebuilding the BIN without its bytes,
and RE-POINTING every surviving bufferView at its new offset — a bufferView
whose offset is stale is worse than a large file, because it decodes to
garbage rather than failing.
"""

import json
import struct
import sys

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def read_glb(path: str):
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
    return js, binary


def pad4(b: bytes, fill: bytes) -> bytes:
    return b + fill * ((4 - len(b) % 4) % 4)


def strip(src: str, dst: str) -> None:
    js, binary = read_glb(src)
    images = js.get("images", [])
    if not images:
        print("no embedded images in %s; copied unchanged" % src)
        open(dst, "wb").write(open(src, "rb").read())
        return

    drop = {im["bufferView"] for im in images if "bufferView" in im}

    # Rebuild the BIN chunk without the dropped views, remembering where each
    # surviving view moved to.
    views = js.get("bufferViews", [])
    keep, moved, out = [], {}, bytearray()
    for i, v in enumerate(views):
        if i in drop:
            continue
        start = v.get("byteOffset", 0)
        chunk = binary[start:start + v["byteLength"]]
        moved[i] = len(keep)
        v = dict(v)
        v["byteOffset"] = len(out)
        keep.append(v)
        out += chunk
        out += b"\x00" * ((4 - len(out) % 4) % 4)

    # Every index into bufferViews has to follow them.
    for acc in js.get("accessors", []):
        if "bufferView" in acc:
            acc["bufferView"] = moved[acc["bufferView"]]
    for mesh in js.get("meshes", []):
        for prim in mesh.get("primitives", []):
            for tgt in prim.get("targets", []) or []:
                pass  # targets index accessors, already remapped above

    js["bufferViews"] = keep
    js["buffers"] = [{"byteLength": len(out)}]
    js.pop("images", None)
    js.pop("samplers", None)
    js.pop("textures", None)
    for m in js.get("materials", []):
        pbr = m.get("pbrMetallicRoughness", {})
        pbr.pop("baseColorTexture", None)
        pbr.pop("metallicRoughnessTexture", None)
        m.pop("normalTexture", None)
        m.pop("emissiveTexture", None)
        m.pop("occlusionTexture", None)

    js_bytes = pad4(json.dumps(js, separators=(",", ":")).encode("utf-8"), b" ")
    bin_bytes = pad4(bytes(out), b"\x00")
    total = 12 + 8 + len(js_bytes) + 8 + len(bin_bytes)
    with open(dst, "wb") as f:
        f.write(b"glTF" + struct.pack("<II", 2, total))
        f.write(struct.pack("<II", len(js_bytes), JSON_CHUNK) + js_bytes)
        f.write(struct.pack("<II", len(bin_bytes), BIN_CHUNK) + bin_bytes)

    a, b = len(open(src, "rb").read()), total
    print("%s -> %s  %.1f MB -> %.1f MB  (%d image(s) removed)"
          % (src.split("/")[-1], dst.split("/")[-1], a / 1048576, b / 1048576, len(images)))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    strip(sys.argv[1], sys.argv[2])
