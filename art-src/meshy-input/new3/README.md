# new3 — Meshy input set

Six-character replacement set for the Meshy hand-pass: **4 male + 2 female**.

## Files

- `new3_m01.jpg`
- `new3_m02.jpg`
- `new3_m03.jpg`
- `new3_m04.jpg`
- `new3_f01.jpg`
- `new3_f02.jpg`

These are clean Meshy-ready derivatives of the approved front T-pose concepts. The on-image filename labels were removed so they are not interpreted as geometry.

## Meshy pass

Use a **NEW Meshy 7 image-to-3D geometry job** for every character.

- `should_texture: false`
- `should_remesh: false`
- Do **not** reuse `01a0966b` or a quarantined character master.

## Hard gate before remesh

Open the **RAW** Meshy result in Blender and inspect both hands.

Required per hand:
- four visibly distinct fingers
- one distinct, separated/dropped thumb
- five distinct digits in raw geometry

If either hand reads as a mitten, reject that geometry job. Do not try to recover it with remesh, retexture, or rigging.

After raw hand QC passes:

`remesh → battered-colour retexture → rig → idle/walk`

Apply the same hand gate to any older quarantined characters before they re-enter the production recipe.
