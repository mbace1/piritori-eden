"""Render a body posed by a clip, the way the GAME applies it, deterministically.

    blender -b -P bl_pose_render.py -- body.glb clip.glb frame out.png [--retarget]

Blender's animation system does NOT reliably evaluate an assigned action in
background mode -- assigning `.action` and pushing an NLA strip both rendered
every frame identical, which is how two earlier verification passes lied. So
nothing here relies on it: the clip's fcurves are evaluated by hand at the
requested frame and written straight into the pose bones, which is also
literally what the runtime does with a glTF channel.
"""
import bpy, sys, math, re
from mathutils import Vector

argv = sys.argv[sys.argv.index("--")+1:]
body_p, clip_p, frame, out_p = argv[0], argv[1], float(argv[2]), argv[3]

bpy.ops.wm.read_factory_settings(use_empty=True)

def imp(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    return next(o for o in new if o.type == 'ARMATURE'), new

tgt, _ = imp(body_p)
tgt.name = 'BODY'
src, src_objs = imp(clip_p)
act = src.animation_data.action if src.animation_data and src.animation_data.action else bpy.data.actions[-1]

# Pull the channel values out of the clip ourselves.
BONE = re.compile(r'pose\.bones\["([^"]+)"\]\.(location|rotation_quaternion|scale)')
vals = {}
for fc in act.fcurves:
    m = BONE.match(fc.data_path)
    if not m:
        continue
    vals.setdefault(m.group(1), {}).setdefault(m.group(2), {})[fc.array_index] = fc.evaluate(frame)

for o in src_objs:
    bpy.data.objects.remove(o, do_unlink=True)

# Neutralise anything the importer left driving the body.
if tgt.animation_data:
    tgt.animation_data.action = None
    for t in list(tgt.animation_data.nla_tracks):
        tgt.animation_data.nla_tracks.remove(t)

applied = 0
for bone, chans in vals.items():
    pb = tgt.pose.bones.get(bone)
    if pb is None:
        continue
    applied += 1
    if 'rotation_quaternion' in chans:
        q = chans['rotation_quaternion']
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = [q.get(i, 1.0 if i == 0 else 0.0) for i in range(4)]
    if 'location' in chans:
        l = chans['location']
        pb.location = [l.get(i, 0.0) for i in range(3)]
    if 'scale' in chans:
        s = chans['scale']
        pb.scale = [s.get(i, 1.0) for i in range(3)]
print("APPLIED %d bones at frame %g" % (applied, frame))
bpy.context.view_layer.update()
h = tgt.pose.bones.get('Hips')
if h:
    print("POSE Hips armspace %s" % (tuple(round(v, 3) for v in h.matrix.to_quaternion()),))

sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.display.shading.light = 'STUDIO'
sc.display.shading.color_type = 'SINGLE'
sc.display.shading.single_color = (0.62, 0.62, 0.66)
sc.render.resolution_x = sc.render.resolution_y = 460
sc.world = bpy.data.worlds.new('w'); sc.world.color = (0.06, 0.07, 0.09)

dg = bpy.context.evaluated_depsgraph_get()
lo = Vector((1e9,)*3); hi = Vector((-1e9,)*3)
for m in [o for o in bpy.data.objects if o.type == 'MESH']:
    for c in m.evaluated_get(dg).bound_box:
        w = m.matrix_world @ Vector(c)
        lo = Vector(min(lo[i], w[i]) for i in range(3))
        hi = Vector(max(hi[i], w[i]) for i in range(3))
ctr = (lo + hi) / 2
span = max(hi[i]-lo[i] for i in range(3)) or 1.0
cam_d = bpy.data.cameras.new('c'); cam = bpy.data.objects.new('c', cam_d)
sc.collection.objects.link(cam); sc.camera = cam
cam_d.type = 'ORTHO'; cam_d.ortho_scale = span * 1.3
cam.location = ctr + Vector((0, -span*3, 0))
cam.rotation_euler = (math.radians(90), 0, 0)
sc.render.filepath = out_p
bpy.ops.render.render(write_still=True)
print("RENDERED", out_p)
