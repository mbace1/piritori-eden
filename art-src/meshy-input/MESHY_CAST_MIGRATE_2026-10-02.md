# Meshy cast migrate receipt — 2026-10-02

Piritori only. No Eeri assets. `USE_STAGE3D_ARENAS` left false.

## Credits

| Step | Credits | Task id |
|---|---|---|
| Rig muscle-v01 template | 5 | `01a0fd0f-c73d-71e6-9f57-39fe9c1501b8` |
| Animate Idle (action 0) | 3 | `01a0fd10-6cf8-7590-9f65-2412380a2ef2` |
| Animate Attack (action 4) | 3 | `01a0fd10-6ed7-742d-8916-37782daa1064` |
| Animate BeHit FlyUp (action 7) | 3 | `01a0fd10-702c-716a-88c9-014f39e6675b` |
| Animate Dead (action 8) | 3 | `01a0fd10-717e-705c-a079-b424758704f6` |
| Rig driver | 5 | `01a0fd10-fd66-741d-a872-234858f1f10c` |
| Rig enforcer | 5 | `01a0fd11-10e6-73dd-b78d-afd29eafc0dc` |
| Rig fixer | 5 | `01a0fd11-2492-75b9-811e-425e6b9edff2` |
| Rig hired | 5 | `01a0fd11-3815-7357-adad-b1fefea9547f` |
| Rig hired-b | 5 | `01a0fd11-4a41-73a2-b3c6-fa7b518a936d` |
| Rig jaska | 5 | `01a0fd11-5d51-71c9-8bf9-4337b3b3411a` |
| Rig local | 5 | `01a0fd11-70b5-73a9-bdc4-dd6829a446ce` |
| Rig runner | 5 | `01a0fd11-8a96-7105-9dc9-7a946699bd25` |
| Rig street-raver | 5 | `01a0fd11-9eac-7596-a262-0f69bed95baf` |
| Rig suited-man | 5 | `01a0fd11-b1cc-7383-9dfd-8a79524912f4` |
| Rig toko | 5 | `01a0fd11-c495-7222-8fa7-d6cbb2d26d36` |
| Rig watcher | 5 | `01a0fd11-d74b-7425-9268-c7937f31942c` |
| **Total** | **77** | Balance before 4020 → after 3943 |

No single step exceeded 100 credits. Path stayed under the 800 cap.

## Landed in repo

- Replaced `art/v3/cast3d/muscle-v01.glb` with Meshy-rigged template (textures kept).
- Replaced four `clips/muscle-*-v01.glb` with stripped animation-only GLBs against that rest.
- Synced copies under `godot/data/art/cast3d/`.
- `SHARED_CLIP_COMPATIBLE = {muscle}`; pending shrinks by one (muscle graduated).
- Web `SHARED_CLIP_ROLES` / Godot `_clips` + `_animate` re-enabled for muscle paths only.

## Not landed (honest)

Batch re-rig GLBs for the other 12 roles exist under `/workspace/meshy-cast-migrate/bodies/*-v02.glb` but were **not** promoted: rest vs muscle template still 29–179°. Meshy auto-rigging does not produce a cast-wide shared rest. Next step to graduate them is Blender rest-align / retarget (PR #63 path), not more Meshy re-rig credits.

Runner's re-rig also changed joint names (`Spine1` vs `Spine01`, dropped `head_end`/`headfront`) — 22-joint family — do not promote without a joint-map pass.
