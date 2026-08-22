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


def strip(src: str, dst: str, resize: int = 0) -> None:
    """resize > 0 keeps the texture but shrinks it to that many pixels square.

    Removing the image is right for an ANIMATION clip, which only needs to bring
    its motion — the character already has a texture. It is wrong for a
    CHARACTER, where the texture is the difference between six people. Meshy
    returns those at 2048 square, which is far more than a figure a hundred
    pixels tall on screen can show.
    """
    js, binary = read_glb(src)
    images = js.get("images", [])
    if not images:
        print("no embedded images in %s; copied unchanged" % src)
        open(dst, "wb").write(open(src, "rb").read())
        return

    drop = {im["bufferView"] for im in images if "bufferView" in im}

    # In resize mode nothing is dropped; the image bytes are replaced in place
    # and the views after it shift by the difference.
    replace = {}
    if resize > 0:
        from PIL import Image
        import io as _io
        for im in images:
            bv = js["bufferViews"][im["bufferView"]]
            raw = binary[bv.get("byteOffset", 0): bv.get("byteOffset", 0) + bv["byteLength"]]
            pic = Image.open(_io.BytesIO(raw)).convert("RGB")
            pic = pic.resize((resize, resize), Image.LANCZOS)
            buf = _io.BytesIO()
            pic.save(buf, "PNG", optimize=True)
            replace[im["bufferView"]] = buf.getvalue()
        drop = set()

    # Rebuild the BIN chunk without the dropped views, remembering where each
    # surviving view moved to.
    views = js.get("bufferViews", [])
    keep, moved, out = [], {}, bytearray()
    for i, v in enumerate(views):
        if i in drop:
            continue
        start = v.get("byteOffset", 0)
        chunk = replace.get(i) or binary[start:start + v["byteLength"]]
        v = dict(v)
        v["byteLength"] = len(chunk)
        moved[i] = len(keep)
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
    if resize <= 0:
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
    else:
        for im in js.get("images", []):
            if "bufferView" in im:
                im["bufferView"] = moved[im["bufferView"]]
                im["mimeType"] = "image/png"

    js_bytes = pad4(json.dumps(js, separators=(",", ":")).encode("utf-8"), b" ")
    bin_bytes = pad4(bytes(out), b"\x00")
    total = 12 + 8 + len(js_bytes) + 8 + len(bin_bytes)
    with open(dst, "wb") as f:
        f.write(b"glTF" + struct.pack("<II", 2, total))
        f.write(struct.pack("<II", len(js_bytes), JSON_CHUNK) + js_bytes)
        f.write(struct.pack("<II", len(bin_bytes), BIN_CHUNK) + bin_bytes)

    a, b = len(open(src, "rb").read()), total
    what = ("%d image(s) resized to %d" % (len(images), resize)) if resize > 0         else ("%d image(s) removed" % len(images))
    print("%s -> %s  %.1f MB -> %.1f MB  (%s)"
          % (src.split("/")[-1], dst.split("/")[-1], a / 1048576, b / 1048576, what))


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        raise SystemExit(__doc__)
    strip(sys.argv[1], sys.argv[2],
          int(sys.argv[3]) if len(sys.argv) == 4 else 0)
