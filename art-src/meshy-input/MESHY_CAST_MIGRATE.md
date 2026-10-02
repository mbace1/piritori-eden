# Meshy cast migrate — shared fight clips (target ~2026-09-11)

> **Correction, 2026-09-06 night (owner):** the untextured 22-joint/`Head1`
> body that landed in `cd64cd2` as "muscle" was **Eeri**, not Piritori. That
> body and its four fight clips were reverted. Piritori `muscle-v01` (textured
> bomber, 24 joints) is restored. Shared playback is off again. The migrate
> below must use **Piritori Meshy** output only — never pull from Eeri.


Owner rule: **one Meshy template for the whole cast**, then **one** re-export of
Idle / Attack / BeHit / Dead. No one-off re-rigs (they land on a foreign
24-joint / no-`Head1` family and tear at ~110–176°).

## Current measured state (2026-10-02 migrate)

| Check | Result |
|---|---|
| Clip source | `art/v3/cast3d/clips/muscle-{idle,attack,behit,dead}-v01.glb` (re-exported vs Piritori muscle Meshy rig `01a0fd0f-c73d-71e6-9f57-39fe9c1501b8`) |
| Compatible body | **muscle** (SHARED_CLIP_COMPATIBLE = muscle; rest drift ~0° vs clips) |
| Pending (12) | driver, enforcer, fixer, hired, hired-b, jaska, local, runner, street-raver, suited-man, toko, watcher — batch Meshy re-rig 2026-10-02 succeeded per-role but rests still drift 29–179° vs muscle template (auto-rig ≠ shared rest). Blender rest-align still needed to graduate them. |
| Unrigged | `parka-man` (no skin) — ambient only |
| Blender | 5.2.1 LTS on Grok Bot box; `art-src/tools/blender_cast_clip_audit.py` |
| Spend | 77 credits (13×5 rig + 4×3 anim); balance after ~3943. Task ids under `/workspace/meshy-cast-migrate/logs/`. |

Godot / web play shared GLB clips on **muscle** only; other roles stay on
fight-motion / still until a rest-align lands.

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