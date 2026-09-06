# Blender tools — free repairs on existing assets

Blender 4.5.13, headless, at
`~/tools/blender/blender-4.5.13-windows-x64/blender.exe`. Nothing here costs
credits. **Meshy is for a NEW object; Blender is for a wrong one.**

## `rest_drift.py` — measure before you spend

```bash
~/.nano-banana/venv/Scripts/python.exe art-src/blender/rest_drift.py
```

Pure Python, no Blender. Prints each cast body's worst rest-orientation drift
against `muscle-v01`, the intended clip donor. **This is the script that found
the cast does not share a rest** (driver 160.8°, hired-b 137°, suited-man 131°)
and that one shared clip set therefore cannot work, whatever is bought.

## `retarget_clips.py` — move motion between rigs, correctly

```bash
B=~/tools/blender/blender-4.5.13-windows-x64/blender.exe
"$B" -b -P art-src/blender/retarget_clips.py -- \
  art/v3/cast3d/muscle-v01.glb  out.glb \
  art/v3/cast3d/clips/muscle-idle-v01.glb   Idle \
  art/v3/cast3d/clips/muscle-attack-v01.glb Attack
```

Body first, output second, then `clip.glb ACTIONNAME` pairs. Writes ONE glb
carrying every action, animation only (meshes dropped).

The transfer is the source's **delta from its own rest**, applied to the
target's rest:

    delta        = src_pose_world * inverse(src_rest_world)
    target_world = delta * tgt_rest_world

so each rig keeps its own rest, bone roll and limb lengths and only the motion
crosses. Bones are walked parent-first. Copying the source's *absolute* world
rotation instead is the same defect as playing a clip raw — it overwrites the
target's rest — and that was the first version of this script.

## `pose_render.py` — look at the result

```bash
"$B" -b -P art-src/blender/pose_render.py -- body.glb clip.glb 12 out.png
```

Poses `body.glb` by `clip.glb` at one frame and renders a flat PNG. An art
change ends in a picture; this is the cheap way to get one.

## Two traps, each of which cost a verification pass

- **`object.animation_data.action = act` does NOT evaluate in background
  mode.** Neither does pushing an NLA strip. Every frame renders identical and
  a perfectly good retarget looks frozen. Evaluate fcurves yourself
  (`fc.evaluate(frame)`) and write pose bones directly — which is also what the
  runtime does with a glTF channel.
- **The glTF exporter writes EVERY action in the blend.** The body's own rest
  clip and the imported source both ride along and the importer picks the wrong
  one. Purge `bpy.data.actions` down to what you mean to export.

## Related, and not superseded

`art-src/meshy-input/` holds `glb_render.py` (engine-free PNG), `glb_inspect.py`,
`glb_retex.py`, `glb_decimate.py`, `glb_make_clips.py`. They are faster than
Blender for looking and for byte-level surgery. Blender is for the thing they
cannot do: change a rig.
