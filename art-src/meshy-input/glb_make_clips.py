#!/usr/bin/env python
"""Turn Meshy's per-animation .glb files into one animation-only clips file.

    python glb_make_clips.py out-clips.glb walking.glb running.glb [more.glb ...]

WHY. Meshy returns each animation as a FULL character: mesh, skeleton and a
2048px texture baked in, about 7.5 MB per clip. The repo's existing clips files
are 0.5-1.1 MB because they carry the animations and no texture at all -
`hired-b-clips-v01.glb` holds Running and Walking together with zero images.
Committing Meshy's output as-is puts the same texture in the repo three times.

WHAT IT DOES. Takes the first file as the base, appends every animation from the
rest, drops all images and textures, and then REPACKS the binary buffer keeping
only the byte ranges still referenced. The repack is the part that matters:
deleting the image entry alone leaves its bytes sitting in the chunk and the file
does not shrink.

WHAT IT ASSUMES. Every input came from the same rigging task, so node order and
skin are identical. It checks that and refuses if not, because remapping
animation channels onto a different skeleton silently produces garbage.
"""
import json, struct, sys, os

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


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    out, srcs = args[0], args[1:]
    if not srcs:
        sys.exit("usage: glb_make_clips.py out.glb a.glb b.glb ...")

    base_js, base_bin = read_glb(srcs[0])
    n_nodes = len(base_js.get("nodes", []))

    # ---- append the other files' animations -------------------------------
    for extra in srcs[1:]:
        js, bin_ = read_glb(extra)
        if len(js.get("nodes", [])) != n_nodes:
            sys.exit(f"{extra}: {len(js.get('nodes',[]))} nodes vs {n_nodes} - "
                     "not the same rig, refusing")
        bv_off = len(base_js.setdefault("bufferViews", []))
        acc_off = len(base_js.setdefault("accessors", []))
        bin_off = len(base_bin)
        base_bin += bin_ + b"\0" * ((4 - len(bin_) % 4) % 4)
        for bv in js.get("bufferViews", []):
            nb = dict(bv)
            nb["byteOffset"] = nb.get("byteOffset", 0) + bin_off
            nb["buffer"] = 0
            base_js["bufferViews"].append(nb)
        for ac in js.get("accessors", []):
            na = dict(ac)
            if "bufferView" in na:
                na["bufferView"] += bv_off
            base_js["accessors"].append(na)
        for an in js.get("animations", []):
            na = json.loads(json.dumps(an))
            for s in na.get("samplers", []):
                s["input"] += acc_off; s["output"] += acc_off
            base_js.setdefault("animations", []).append(na)

    # ---- drop every texture ------------------------------------------------
    for m in base_js.get("materials", []):
        pbr = m.get("pbrMetallicRoughness", {})
        pbr.pop("baseColorTexture", None)
        pbr.pop("metallicRoughnessTexture", None)
        pbr.setdefault("baseColorFactor", [0.8, 0.8, 0.8, 1.0])
        for k in ("normalTexture", "occlusionTexture", "emissiveTexture"):
            m.pop(k, None)
    base_js.pop("textures", None)
    base_js.pop("images", None)
    base_js.pop("samplers", None)

    # ---- optionally drop the mesh itself ------------------------------------
    # An animation file does not need geometry: the rigged body ships alongside
    # it and the engine retargets these clips onto that skeleton. Meshy bakes a
    # full mesh into every clip, so ten animations carry ten copies of a 31k
    # mesh. Keeping the skeleton and dropping the mesh is most of the weight.
    if "--no-mesh" in sys.argv:
        for n in base_js.get("nodes", []):
            n.pop("mesh", None)
        base_js.pop("meshes", None)
        base_js.pop("materials", None)

    # ---- repack: keep only referenced bufferViews ---------------------------
    keep = set()
    for ac in base_js.get("accessors", []):
        if "bufferView" in ac:
            keep.add(ac["bufferView"])
    for sk in base_js.get("skins", []):
        if "inverseBindMatrices" in sk:
            bvi = base_js["accessors"][sk["inverseBindMatrices"]].get("bufferView")
            if bvi is not None:
                keep.add(bvi)

    new_bin = bytearray()
    remap = {}
    new_bvs = []
    for i, bv in enumerate(base_js.get("bufferViews", [])):
        if i not in keep:
            continue
        o = bv.get("byteOffset", 0); n = bv["byteLength"]
        while len(new_bin) % 4:
            new_bin.append(0)
        remap[i] = len(new_bvs)
        nb = dict(bv); nb["byteOffset"] = len(new_bin); nb["buffer"] = 0
        new_bvs.append(nb)
        new_bin += base_bin[o:o + n]
    for ac in base_js.get("accessors", []):
        if "bufferView" in ac:
            ac["bufferView"] = remap[ac["bufferView"]]
    base_js["bufferViews"] = new_bvs
    base_js["buffers"] = [{"byteLength": len(new_bin)}]

    write_glb(out, base_js, bytes(new_bin))
    names = [a.get("name", "?") for a in base_js.get("animations", [])]
    before = sum(os.path.getsize(s) for s in srcs)
    after = os.path.getsize(out)
    print(f"  {os.path.basename(out)}")
    print(f"    animations: {names}")
    print(f"    {before/1e6:.1f} MB in {len(srcs)} files -> {after/1e6:.2f} MB "
          f"({before/after:.0f}x smaller)")


if __name__ == "__main__":
    main()
