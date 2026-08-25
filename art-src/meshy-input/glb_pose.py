#!/usr/bin/env python
"""Bake one animation frame onto a rigged mesh, from ANY same-skeleton source.

    python glb_pose.py mesh.glb anim.glb "Clip Name" 0.4 out.glb

WHY. To compare how a gesture reads on three different bodies, the gesture has
to actually be applied to each body's mesh. The characters share a skeleton
(confirmed: 26 nodes, identical names, because they all came through the same
Meshy rigging endpoint) but an animation clip and a body can live in different
files - Jaska's clips file carries no mesh at all (glb_make_clips.py --no-mesh).
glb_render.py only ever drew raw POSITION values, so posing was invisible.

WHAT IT DOES. Standard glTF linear-blend skinning, evaluated at one instant:
for each vertex, blend the up-to-4 joint transforms it is weighted to, using
each joint's CURRENT global pose (from the anim file, by BONE NAME - not node
index, because two separately-exported glb files number their nodes
differently even with identical bone names) composed with that joint's inverse
bind matrix (from the MESH file's own skin - the two files need not agree on
IBMs, only on which bone means what). Nearest-keyframe sampling, not
interpolated - a still frame does not need it.

WHAT IT ASSUMES. The skinned mesh's own node has an identity transform (true
here - confirmed by the fact that the existing un-skinned renderer already drew
correct bind poses by treating POSITION as world space directly). A rig with a
real mesh-node offset would need that folded in too.
"""
import json, struct, sys, math

COMP = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
        5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NUM = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
NORM_MAX = {5121: 255.0, 5123: 65535.0}


def read_glb(path):
    d = open(path, 'rb').read()
    total = struct.unpack_from('<III', d, 0)[2]
    off, js, bin_ = 12, None, b''
    while off < total:
        clen, ctype = struct.unpack_from('<II', d, off); off += 8
        chunk = d[off:off + clen]; off += clen
        if ctype == 0x4E4F534A: js = json.loads(chunk.decode('utf-8'))
        elif ctype == 0x004E4942: bin_ = chunk
    return js, bin_


def write_glb(path, js, bin_):
    jb = json.dumps(js, separators=(',', ':')).encode('utf-8')
    jb += b' ' * ((4 - len(jb) % 4) % 4)
    bb = bin_ + b'\0' * ((4 - len(bin_) % 4) % 4)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2,
                            12 + 8 + len(jb) + (8 + len(bb) if bb else 0)))
        f.write(struct.pack('<II', len(jb), 0x4E4F534A)); f.write(jb)
        if bb:
            f.write(struct.pack('<II', len(bb), 0x004E4942)); f.write(bb)


def acc(js, bin_, i, normalized_ok=False):
    a = js['accessors'][i]
    fmt, size = COMP[a['componentType']]; n = NUM[a['type']]
    bv = js['bufferViews'][a['bufferView']]
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride') or size * n
    out = [struct.unpack_from('<' + fmt * n, bin_, base + k * stride)
           for k in range(a['count'])]
    if normalized_ok and a.get('normalized') and a['componentType'] in NORM_MAX:
        m = NORM_MAX[a['componentType']]
        out = [tuple(v / m for v in row) for row in out]
    return out


def mat_mul(a, b):
    """4x4, row-major-as-4-rows-of-4."""
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def mat_from_trs(t, r, s):
    x, y, z, w = r
    m = [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0],
         [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0],
         [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0],
         [0, 0, 0, 1]]
    for i in range(3):
        for j in range(3):
            m[i][j] *= s[j]
    m[0][3], m[1][3], m[2][3] = t
    return m


def mat_from_gltf16(v):
    # glTF stores column-major flat 16; convert to our row-of-rows form.
    return [[v[c * 4 + r] for c in range(4)] for r in range(4)]


def mat_inverse(m):
    # General 4x4 Gauss-Jordan. Small and robust; these are affine so it
    # always exists.
    a = [row[:] + [1 if i == j else 0 for j in range(4)] for i, row in enumerate(m)]
    for col in range(4):
        piv = max(range(col, 4), key=lambda r: abs(a[r][col]))
        a[col], a[piv] = a[piv], a[col]
        pv = a[col][col]
        a[col] = [x / pv for x in a[col]]
        for r in range(4):
            if r != col:
                f = a[r][col]
                a[r] = [x - f * y for x, y in zip(a[r], a[col])]
    return [row[4:] for row in a]


def mat_apply(m, p):
    x, y, z = p
    return tuple(m[i][0] * x + m[i][1] * y + m[i][2] * z + m[i][3] for i in range(3))


class Rig:
    """Node hierarchy + local TRS, keyed by both index and NAME."""
    def __init__(self, js, bin_):
        self.js, self.bin_ = js, bin_
        self.name_of = {i: n.get('name', str(i)) for i, n in enumerate(js.get('nodes', []))}
        self.idx_of = {v: k for k, v in self.name_of.items()}
        self.children = {i: n.get('children', []) for i, n in enumerate(js.get('nodes', []))}
        self.parent = {}
        for i, ch in self.children.items():
            for c in ch:
                self.parent[c] = i
        self.local = {}
        for i, n in enumerate(js.get('nodes', [])):
            if 'matrix' in n:
                self.local[i] = mat_from_gltf16(n['matrix'])
            else:
                self.local[i] = mat_from_trs(n.get('translation', [0, 0, 0]),
                                              n.get('rotation', [0, 0, 0, 1]),
                                              n.get('scale', [1, 1, 1]))
        self.roots = [i for i in range(len(js.get('nodes', []))) if i not in self.parent]

    def global_of(self, overrides=None):
        overrides = overrides or {}
        out = {}
        def walk(i, parent_g):
            m = overrides.get(i, self.local[i])
            g = mat_mul(parent_g, m)
            out[i] = g
            for c in self.children.get(i, []):
                walk(c, g)
        I = [[1 if i == j else 0 for j in range(4)] for i in range(4)]
        for r in self.roots:
            walk(r, I)
        return out


def sample_anim(js, bin_, rig, clip_substr, t):
    """Return {node_idx: local_matrix} overrides for `rig`'s nodes, sampled
    from whichever animation in this file matches clip_substr, at time t,
    remapped from the anim file's own node indices to `rig`'s by bone NAME."""
    anims = js.get('animations', [])
    match = [a for a in anims if clip_substr.lower() in a.get('name', '').lower()]
    if not match:
        names = [a.get('name') for a in anims]
        sys.exit(f'no animation matching "{clip_substr}". have: {names}')
    clip = match[0]
    anim_names = {i: n.get('name', str(i)) for i, n in enumerate(js.get('nodes', []))}
    overrides = {}
    per_node = {}  # anim node idx -> {'t':.., 'r':.., 's':..}
    for ch in clip['channels']:
        target = ch['target']['node']
        path = ch['target']['path']
        samp = clip['samplers'][ch['sampler']]
        times = [v[0] for v in acc(js, bin_, samp['input'])]
        values = acc(js, bin_, samp['output'])
        # nearest keyframe <= t, else the first
        idx = 0
        for k, tt in enumerate(times):
            if tt <= t:
                idx = k
            else:
                break
        per_node.setdefault(target, {})[path] = values[idx]
    for anim_idx, comps in per_node.items():
        name = anim_names.get(anim_idx)
        rig_idx = rig.idx_of.get(name)
        if rig_idx is None:
            continue
        base = rig.js['nodes'][rig_idx]
        t0 = comps.get('translation', base.get('translation', [0, 0, 0]))
        r0 = comps.get('rotation', base.get('rotation', [0, 0, 0, 1]))
        s0 = comps.get('scale', base.get('scale', [1, 1, 1]))
        overrides[rig_idx] = mat_from_trs(t0, r0, s0)
    return overrides


def main():
    mesh_path, anim_path, clip, t, out = sys.argv[1:6]
    t = float(t)
    mjs, mbin = read_glb(mesh_path)
    ajs, abin = read_glb(anim_path)

    prim = mjs['meshes'][0]['primitives'][0]
    at = prim['attributes']
    pos = acc(mjs, mbin, at['POSITION'])
    uv = acc(mjs, mbin, at['TEXCOORD_0']) if 'TEXCOORD_0' in at else None
    joints4 = acc(mjs, mbin, at['JOINTS_0'])
    weights4 = acc(mjs, mbin, at['WEIGHTS_0'], normalized_ok=True)
    idx = [i[0] for i in acc(mjs, mbin, prim['indices'])] if 'indices' in prim \
          else list(range(len(pos)))

    skin = mjs['skins'][0]
    joint_nodes = skin['joints']            # skin-local index -> mesh-file node index
    ibms = [mat_from_gltf16(v) for v in acc(mjs, mbin, skin['inverseBindMatrices'])]

    rig = Rig(mjs, mbin)
    overrides = sample_anim(ajs, abin, rig, clip, t)
    posed_global = rig.global_of(overrides)

    skin_matrix = [mat_mul(posed_global[joint_nodes[j]], ibms[j]) for j in range(len(joint_nodes))]

    new_pos = []
    for vi, p in enumerate(pos):
        js4, ws4 = joints4[vi], weights4[vi]
        wsum = sum(ws4) or 1.0
        acc_p = [0.0, 0.0, 0.0]
        for k in range(4):
            w = ws4[k] / wsum
            if w <= 0:
                continue
            sm = skin_matrix[js4[k]]
            x, y, z = mat_apply(sm, p)
            acc_p[0] += w * x; acc_p[1] += w * y; acc_p[2] += w * z
        new_pos.append(tuple(acc_p))

    # Write a small static (unskinned) glb: posed positions, original UVs and
    # texture, no skin, no animation - exactly what glb_render.py already knows
    # how to draw.
    nb = bytearray()
    def add(data):
        while len(nb) % 4: nb.append(0)
        o = len(nb); nb.extend(data); return o
    pbytes = b''.join(struct.pack('<fff', *v) for v in new_pos)
    po = add(pbytes)
    out_js = {
        "asset": {"version": "2.0", "generator": "glb_pose.py"},
        "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1,
                                    "material": 0}]}],
        "materials": mjs.get("materials", [{}])[:1],
        "accessors": [{"bufferView": 0, "componentType": 5126, "count": len(new_pos),
                        "type": "VEC3",
                        "min": [min(v[0] for v in new_pos), min(v[1] for v in new_pos), min(v[2] for v in new_pos)],
                        "max": [max(v[0] for v in new_pos), max(v[1] for v in new_pos), max(v[2] for v in new_pos)]}],
        "bufferViews": [{"buffer": 0, "byteOffset": po, "byteLength": len(pbytes)}],
        "buffers": [{"byteLength": 0}],
    }
    if uv:
        ubytes = b''.join(struct.pack('<ff', *u) for u in uv)
        uo = add(ubytes)
        out_js["accessors"].append({"bufferView": 1, "componentType": 5126,
                                     "count": len(uv), "type": "VEC2"})
        out_js["bufferViews"].append({"buffer": 0, "byteOffset": uo, "byteLength": len(ubytes)})
        out_js["meshes"][0]["primitives"][0]["attributes"]["TEXCOORD_0"] = 1
    ibytes = b''.join(struct.pack('<III', idx[k], idx[k + 1], idx[k + 2])
                       for k in range(0, len(idx) - 2, 3))
    io_ = add(ibytes)
    out_js["bufferViews"].append({"buffer": 0, "byteOffset": io_, "byteLength": len(ibytes)})
    out_js["accessors"].append({
        "bufferView": len(out_js["bufferViews"]) - 1, "componentType": 5125,
        "count": (len(idx) // 3) * 3, "type": "SCALAR"})
    out_js["meshes"][0]["primitives"][0]["indices"] = len(out_js["accessors"]) - 1
    if mjs.get('images'):
        im0 = mjs['images'][0]; bv = mjs['bufferViews'][im0['bufferView']]
        o = bv.get('byteOffset', 0)
        img = mbin[o:o + bv['byteLength']]
        imo = add(img)
        out_js["bufferViews"].append({"buffer": 0, "byteOffset": imo, "byteLength": len(img)})
        out_js["images"] = [{"bufferView": len(out_js["bufferViews"]) - 1, "mimeType": "image/jpeg"}]
        out_js["textures"] = [{"source": 0}]
        out_js["materials"] = [{"pbrMetallicRoughness": {"baseColorTexture": {"index": 0},
                                                           "baseColorFactor": [1, 1, 1, 1]}}]
    out_js["buffers"][0]["byteLength"] = len(nb)
    write_glb(out, out_js, bytes(nb))
    print(f"  {out}  posed at t={t}  ({len(new_pos)} verts)")


if __name__ == '__main__':
    main()
