# Meshy cast migrate — shared fight clips (target ~2026-09-11)

Owner rule: **one Meshy template for the whole cast**, then **one** re-export of
Idle / Attack / BeHit / Dead. No one-off re-rigs (they land on a foreign
24-joint / no-`Head1` family and tear at ~110–176°).

## Current measured state (2026-09-06)

| Check | Result |
|---|---|
| Clip source | `art/v3/cast3d/clips/muscle-{idle,attack,behit,dead}-v01.glb` |
| Compatible body | `muscle` only (`port/rig-vectors.mjs` SHARED_CLIP_COMPATIBLE) |
| Pending (12) | driver, enforcer, fixer, hired, hired-b, jaska, local, runner, street-raver, suited-man, toko, watcher — missing `Head1`, rest drift ~172–179° at neck/Spine02 |
| Unrigged | `parka-man` (no skin) — ambient only |
| Blender | 5.2.1 LTS on Grok Bot box; `art-src/tools/blender_cast_clip_audit.py` |

Godot / web play shared clips **only** on paths containing `muscle-v01` until
this migrate lands.

## Do not do before migrate day

- Spend Meshy credits on single-role re-rigs “just to try.”
- Promote any pending role into `SHARED_CLIP_COMPATIBLE` without a green
  `node port/rig-vectors.mjs --check` after re-rig.
- Turn `USE_STAGE3D_ARENAS` back on (arenas stay parked until cast motion is
  honest).

## Migrate day checklist

1. **Show 2D T-poses** for every role that will be re-rigged (owner review rule).
2. Check Meshy balance (weekday 9:00 routine watches refresh).
3. Re-rig **every** pending fighter onto the **same** current Meshy template /
   muscle archive rest (~5 cr each historically — verify before batch).
4. Re-export the **four** fight clips once against that rest.
5. Run `python art-src/tools/strip_glb_texture.py` on clip GLBs; keep textures
   on bodies only.
6. Replace `art/v3/cast3d/*.glb` + `clips/muscle-*-v01.glb` (or new ids +
   manifest — do not orphan Godot `CLIPS` / web `CLIP_SOURCES`).
7. `node port/rig-vectors.mjs` then `--check` — pending set must empty (or
   shrink honestly).
8. Blender eye check:
   `xvfb-run -a blender --background --python art-src/tools/blender_cast_clip_audit.py`
9. Godot: widen shared-clip allowlist past `muscle-v01`; web: same.
10. Smoke one 3v3 with mixed roles; capture landscape.

## Blender notes (box)

- Binary: `/home/box/apps/blender` → 5.2.1 LTS (`blender` on PATH via
  `~/.local/bin`).
- Headless needs `xvfb-run` on this machine.
- Muscle clay-gray in audits = stripped texture, not a missing download.
