#!/usr/bin/env python3
"""Blender 5.x headless audit: shared fight clips on muscle vs a pending body.

Requires Blender on PATH (or BLENDER env). Example:

  export PATH="$HOME/.local/bin:$PATH"
  xvfb-run -a blender --background --python art-src/tools/blender_cast_clip_audit.py

Writes PNGs under /workspace/piritori-blender-audit/ (override with AUDIT_OUT).

WHY. `port/rig-vectors.mjs` already gates joint names + rest drift. This script
is the eye check: muscle + shared idle/attack should read as the same figure
moving; a pending role + those clips must NOT be promoted until Meshy re-rig
puts that body on the muscle rest (Head1 family). Clay-gray muscle is expected
— textures were stripped from the clip-source body on purpose.

Blender 5 note: glTF actions are layered; assign `action_slot = action.slots[0]`.
Drop Meshy junk meshes named Icosphere/Sphere before framing.
"""

import bpy
import math
import os
from mathutils import Vector, Euler


ROOT = "/workspace/repos/piritori-eden"
OUT = "/workspace/piritori-blender-audit"
CAST = f"{ROOT}/art/v3/cast3d"
CLIPS = f"{CAST}/clips"

SHOTS = [
    ("01_muscle_bind", f"{CAST}/muscle-v01.glb", None, 0.0, "muscle bind"),
    ("02_muscle_idle", f"{CAST}/muscle-v01.glb", f"{CLIPS}/muscle-idle-v01.glb", 0.5, "muscle + idle"),
    ("03_muscle_attack", f"{CAST}/muscle-v01.glb", f"{CLIPS}/muscle-attack-v01.glb", 0.45, "muscle + attack"),
    ("04_fixer_bind", f"{CAST}/fixer-v01.glb", None, 0.0, "fixer bind"),
    ("05_fixer_plus_muscle_idle", f"{CAST}/fixer-v01.glb", f"{CLIPS}/muscle-idle-v01.glb", 0.5, "fixer + muscle idle (torn)"),
]


def wipe():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def purge_junk():
    for o in list(bpy.data.objects):
        if o.type == "MESH" and (
            o.name.lower().startswith("ico") or o.name.lower().startswith("sphere")
        ):
            bpy.data.objects.remove(o, do_unlink=True)


def assign_action(arm, action):
    if arm.animation_data is None:
        arm.animation_data_create()
    arm.animation_data.action = action
    if hasattr(arm.animation_data, "action_slot") and len(action.slots):
        # Prefer a slot; Blender 5 ties slots to source ID names.
        arm.animation_data.action_slot = action.slots[0]


def setup_view(meshes):
    coords = []
    for o in meshes:
        for c in o.bound_box:
            coords.append(o.matrix_world @ Vector(c))
    min_v = Vector((min(v.x for v in coords), min(v.y for v in coords), min(v.z for v in coords)))
    max_v = Vector((max(v.x for v in coords), max(v.y for v in coords), max(v.z for v in coords)))
    center = (min_v + max_v) * 0.5
    height = max(max_v.z - min_v.z, 0.2)
    cam_data = bpy.data.cameras.new("AuditCam")
    cam = bpy.data.objects.new("AuditCam", cam_data)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    cam.location = (center.x, center.y - height * 2.7, center.z + height * 0.05)
    cam.rotation_euler = Euler((math.radians(90), 0, 0), "XYZ")
    sun = bpy.data.lights.new("Sun", type="SUN")
    sun.energy = 2.5
    sun_o = bpy.data.objects.new("Sun", sun)
    bpy.context.scene.collection.objects.link(sun_o)
    sun_o.rotation_euler = Euler((math.radians(50), 0, math.radians(35)), "XYZ")
    fill = bpy.data.lights.new("Fill", type="AREA")
    fill.energy = 80
    fill.size = 4
    fill_o = bpy.data.objects.new("Fill", fill)
    bpy.context.scene.collection.objects.link(fill_o)
    fill_o.location = (center.x - height, center.y - height, center.z + height)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "TEXTURE"
    sc.render.resolution_x = 480
    sc.render.resolution_y = 720
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"


def render_one(name, body, clip, t_norm):
    wipe()
    bpy.ops.import_scene.gltf(filepath=body)
    purge_junk()
    arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
    if clip:
        bpy.ops.import_scene.gltf(filepath=clip)
        clip_arm = next(o for o in bpy.data.objects if o.type == "ARMATURE" and o != arm)
        action = clip_arm.animation_data.action
        assign_action(arm, action)
        f0, f1 = action.frame_range
        bpy.context.scene.frame_set(int(round(f0 + (f1 - f0) * t_norm)))
        for o in list(bpy.data.objects):
            if o.type == "ARMATURE" and o != arm:
                bpy.data.objects.remove(o, do_unlink=True)
    else:
        # clear embedded single-frame clip so bind rest shows
        if arm and arm.animation_data:
            arm.animation_data.action = None
        bpy.context.scene.frame_set(1)
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    setup_view(meshes)
    path = f"{OUT}/{name}.png"
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("WROTE", path)
    return path


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, body, clip, t, label in SHOTS:
        render_one(name, body, clip, t)
        print("LABEL", name, label)


if __name__ == "__main__":
    main()
