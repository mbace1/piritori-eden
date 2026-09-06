"""Retarget a Meshy fight clip onto a body's OWN rest. Offline, free, in Blender.

    blender -b -P bl_retarget.py -- body.glb clip.glb out.glb ACTIONNAME

THE CLIPS BELONG TO A BODY THAT IS NOT IN THIS REPO. Rendering
clips/muscle-idle-v01.glb on its own skeleton shows a hooded parka figure, not
the bald man in a bomber jacket the file is named for. That is why every
attempt to play them raw tears: they are another character's absolute pose.

WHAT THIS DOES, and why the first version of this script was still wrong:
copying the source bone's WORLD rotation is the same disease as playing the
clip raw -- it replaces the target's rest orientation with the source's. The
correct transfer is the source's DELTA FROM ITS OWN REST, applied to the
target's rest:

    delta        = src_pose_world * inverse(src_rest_world)
    target_world = delta * tgt_rest_world

so each rig keeps its own rest, its own bone roll and its own limb lengths, and
only the MOTION crosses. Bones are walked parent-first because a bone's world
matrix depends on parents already being posed.
"""
import bpy, sys, os
from mathutils import Matrix

argv = sys.argv[sys.argv.index("--") + 1:]
body_p, out_p = argv[0], argv[1]
PAIRS = [(argv[i], argv[i+1]) for i in range(2, len(argv), 2)]   # clip.glb ACTIONNAME

import bpy, os, re
from mathutils import Matrix

bpy.ops.wm.read_factory_settings(use_empty=True)

def imp(path, tag):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new_objs = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new_objs if o.type == 'ARMATURE')
    arm.name = tag
    return arm, new_objs

tgt, _ = imp(body_p, 'TARGET')
if tgt.animation_data:
    tgt.animation_data.action = None
    for t in list(tgt.animation_data.nla_tracks):
        tgt.animation_data.nla_tracks.remove(t)
tgt.animation_data_create()
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a, do_unlink=True)

BONE = re.compile(r'pose\.bones\["([^"]+)"\]\.(location|rotation_quaternion|scale)')

def rest_world(obj, name):
    return obj.matrix_world @ obj.data.bones[name].matrix_local

made = []
for clip_p, action_name in PAIRS:
    src, src_objs = imp(clip_p, 'SOURCE')
    src_action = src.animation_data.action if src.animation_data and src.animation_data.action         else [a for a in bpy.data.actions if a.name not in [m.name for m in made]][-1]
    f0, f1 = (int(round(v)) for v in src_action.frame_range)

    chan = {}
    for fc in src_action.fcurves:
        m = BONE.match(fc.data_path)
        if m:
            chan.setdefault(m.group(1), {}).setdefault(m.group(2), {})[fc.array_index] = fc

    common = [b.name for b in tgt.pose.bones if b.name in src.pose.bones]
    root = 'Hips' if 'Hips' in common else common[0]
    ratio = rest_world(tgt, root).to_translation().z / rest_world(src, root).to_translation().z

    order, seen = [], set()
    def walk(b):
        if b.name in seen:
            return
        seen.add(b.name)
        if b.name in common:
            order.append(b.name)
        for c in b.children:
            walk(c)
    for b in tgt.pose.bones:
        if b.parent is None:
            walk(b)
    for n in common:
        if n not in order:
            order.append(n)

    act = bpy.data.actions.new(action_name)
    act.use_fake_user = True
    tgt.animation_data.action = act

    src_rest = {n: rest_world(src, n).to_quaternion() for n in common}
    tgt_rest = {n: rest_world(tgt, n).to_quaternion() for n in common}
    src_root_rest_loc = rest_world(src, root).to_translation()

    for f in range(f0, f1 + 1):
        for name, chans in chan.items():
            pb = src.pose.bones.get(name)
            if pb is None:
                continue
            if 'rotation_quaternion' in chans:
                q = chans['rotation_quaternion']
                pb.rotation_mode = 'QUATERNION'
                pb.rotation_quaternion = [q[i].evaluate(f) if i in q else (1.0 if i == 0 else 0.0)
                                          for i in range(4)]
            if 'location' in chans:
                l = chans['location']
                pb.location = [l[i].evaluate(f) if i in l else 0.0 for i in range(3)]
        bpy.context.view_layer.update()
        for name in order:
            spb, tpb = src.pose.bones[name], tgt.pose.bones[name]
            delta = (src.matrix_world @ spb.matrix).to_quaternion() @ src_rest[name].inverted()
            want = delta @ tgt_rest[name]
            cur = tgt.matrix_world @ tpb.matrix
            loc = cur.to_translation()
            if name == root:
                off = (src.matrix_world @ spb.matrix).to_translation() - src_root_rest_loc
                loc = rest_world(tgt, root).to_translation() + off * ratio
            tpb.matrix = tgt.matrix_world.inverted() @ Matrix.LocRotScale(loc, want, cur.to_scale())
            bpy.context.view_layer.update()
        for name in order:
            tpb = tgt.pose.bones[name]
            tpb.keyframe_insert('rotation_quaternion', frame=f, group=name)
            if name == root:
                tpb.keyframe_insert('location', frame=f, group=name)

    made.append(act)
    print("  %-8s %d bones, frames %d..%d" % (action_name, len(common), f0, f1))
    for o in src_objs:
        bpy.data.objects.remove(o, do_unlink=True)

for o in list(bpy.data.objects):
    if o.type == 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
tgt.select_set(True)
bpy.context.view_layer.objects.active = tgt
bpy.ops.export_scene.gltf(filepath=out_p, export_format='GLB', use_selection=True,
                          export_animations=True, export_animation_mode='ACTIONS',
                          export_skins=True, export_materials='NONE')
print("WROTE", out_p, os.path.getsize(out_p), "actions:", [a.name for a in made])
