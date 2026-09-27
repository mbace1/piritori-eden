# Meshy New2 character pipeline handoff

Updated: 2026-09-12 PDT. This is an Art-lane continuation record for PR #68.

## Outcome first

- The Street Worker Female now has a geometry-clean 2D source and a successful replacement Meshy 7 raw master. The earlier face-failed master is quarantined. The owner reviewed the replacement renders and replied, **"Perfect."** It has not yet been remeshed, textured, rigged, animated, or published.
- Camo-surplus Male, Dock-worker Male, Tall Fixer, and Older Local were submitted together and all four Meshy geometry tasks succeeded. Independent Blender review rejects all four raw masters because neither hand has five distinct digits. Camo and Dock also have weak face geometry; the Older Local face needs revision. Do not remesh or rig those four.
- The five original selected design plates remain unchanged. Geometry-clean files are additive private derivatives.
- No key, signed asset URL, or account balance is recorded here.

## Private archive boundary

The actual 2D derivatives, raw GLBs, manifests, scripts, and review renders remain under the source checkout's ignored folder:

`/.private/piritori-asset-drafts/2026-09-12/`

They are deliberately not committed. A remote agent must receive the actual private files; this document is provenance and routing, not a substitute for the bytes. Never force-add `.private/`.

Primary records:

- `tpose-new2-battered/SELECTIONS.md`
- `meshy-street-worker-pilot/RAW_GEOMETRY_QC.md`
- `meshy-street-worker-pilot-v2/street-worker-geometry-clean.private.json`
- `meshy-new2-batch/meshy-new2-batch.private.json`
- `meshy-new2-batch/inspection/fast-visual-gate.json`
- `meshy-new2-batch/inspection/new2-fast-gate-contact-sheet.png`

## Geometry-clean source set

The built-in image editor removed face cuts, bruises, and scuffs while preserving identity, T-pose, anatomy, framing, and approved clothing wear. The Street Worker source also suppresses hard eyeliner and lipstick for geometry only; restore those appearance details during texturing. The Older Local already had a clean face and is an exact-byte copy.

| Character | Geometry source | SHA-256 |
|---|---|---|
| Street Worker Female | `tpose-new2-geometry-clean/street-worker-female-battered-v1-geometry-clean-v1.png` | `5A5CAC4152DAF48EE28149E7CB0AF70EC3D4F95DE4F8E7AC7F569A67C0C30070` |
| Camo-surplus Male | `tpose-new2-geometry-clean/camo-surplus-male-battered-v2-geometry-clean-v1.png` | `3E7FABB5014B11D202AF1CB0DED096EA7A2E65AE2425CE9A3364040E57AA4FF7` |
| Dock-worker Male | `tpose-new2-geometry-clean/dock-worker-male-battered-v1-geometry-clean-v1.png` | `3E46D25617418B707E7049FAB451EBF408416834122976B8B75729C3541AC0E4` |
| Tall Fixer | `tpose-new2-geometry-clean/fixer-tall-male-battered-v1-geometry-clean-v1.png` | `A20D588124DEDEA7209F7C04B555004F48B640C078BF76BAC26B0E611313487B` |
| Older Local | `tpose-new2-geometry-clean/local-older-male-tpose-new2-geometry-clean-v1.png` | `61A840FD1AF3328738FBECB3DE75DEDDA6F65F681C116A46881FF7DE0B786E75` |

## Locked Meshy recipe

Every task used geometry-only Meshy 7 with this request body:

```json
{
  "model_type": "standard",
  "ai_model": "meshy-7",
  "ultra_mode": false,
  "should_texture": false,
  "should_remesh": false,
  "pose_mode": "t-pose",
  "image_enhancement": false,
  "target_formats": ["glb"]
}
```

The five replacement tasks consumed 100 credits total: 20 for the Street Worker and 80 for the four-character batch. Meshy Premium free retries do not apply to API-created tasks; a repeat API POST is a new paid task.

## Task and raw-master register

| Character | Meshy task | Raw GLB SHA-256 | Current gate |
|---|---|---|---|
| Street Worker Female | `01a0966b-ada1-7070-a540-dc7d48a5b657` | `26D48AD3F9C75727744EF41BFAA15F56094C6CF543B55B4412D3CA11626522D0` | Owner visual pass; clean face and coherent body. Confirm close-up five-digit hands before remesh. |
| Camo-surplus Male | `01a096a2-e30a-72df-8cec-0f009d563372` | `3E84336D66AA9EDE43D23FF0AE0E218AA41A542FA9F95E410D15E56133980FB8` | **FAIL:** fused/missing fingers; weak eyes/lips/hair; fragile garment spikes. |
| Dock-worker Male | `01a096a2-eee3-710f-a76e-02d21323064f` | `9B8D1105DF623EB3EA03CD97F9D816D6678370CBC4CBB5C688F6447665B69317` | **FAIL:** severe finger fusion; distorted face/beard; invented faceted clothing relief. |
| Tall Fixer | `01a096a2-fb83-7485-aaec-d3f6444445a3` | `2DA611D460BB747B926A9EBDD377EB473D8A15F6E79153A4E8C1AE93A050CE6A` | **FAIL:** face usable, but both hands lack five digits; floating strands/loop. |
| Older Local | `01a096a3-0771-70ba-8090-9d0cf153fed1` | `5BE77E34D2DC84FA8E4576BFE981C58F6D75BEB3592CE6DB68A5A84783845213` | **FAIL:** severe finger fusion; closed eyes, enlarged nose, compressed mouth, fragmented hair. |

The rejected first Street Worker task is `01a0963c-883d-76b0-9c87-0007c0611b63`. Its face markings became floating/extruded geometry; never advance that master.

Fast measured arm-span/height ratios for the four-model batch are Camo `1.061840`, Dock `1.063627`, Fixer `0.979732`, and Older Local `0.999122`. The ratios are not their blocking issue; hands are.

## Exact continuation

1. Read `CLAUDE.md`, `MESHY_AGENT_HANDOFF.md`, `MESHY_PILOT_RESULTS.md`, and this file.
2. Verify the Street Worker raw GLB hash and inspect both hands at close range. If five distinct digits and usable joints are present, submit the raw task to Meshy Remesh with triangle topology and target `15000`. Do not rig the multi-million-triangle master.
3. Inspect the 15k derivative. Retexture that remeshed descendant using the owner-approved battered colour plate as the style image so makeup and face damage return as texture, not geometry.
4. Rig the validated textured 15k GLB via `model_url`, then inspect idle/walk and finger support before publication.
5. Do not advance the other four masters. Their next source pass must clarify four separated fingers plus a dropped/separated thumb. Preserve the current clean faces for Camo, Dock, and Fixer; also clarify open eyelids and reduce nose exaggeration for the Older Local. Show exact revised bytes before another paid task.
6. Keep every failed master for provenance. Never overwrite a source, task manifest, or GLB; create the next version.

Restart-safe local commands:

```powershell
python .private\piritori-asset-drafts\2026-09-12\meshy-street-worker-pilot-v2\submit_geometry.py status
python .private\piritori-asset-drafts\2026-09-12\meshy-new2-batch\submit_geometry_batch.py status
```

The status commands retrieve existing task state; do not run `submit` again for a recorded task.

## Handoff guardrails

- Required chain: raw geometry master -> visual gate -> 15k remesh -> source-image retexture -> textured `model_url` rigging -> animation.
- Five distinct digits on each hand are a hard gate. Automated success and task status do not override visual failure.
- Facial cuts, bruises, makeup, dirt, nail colour, and similar surface details belong in texturing, not the geometry source.
- Keep concise 2D edit prompts and change one thing per version. Preserve identity, silhouette, pose, framing, and clothing condition.
- Do not publish or add raw GLBs to the runtime manifest. Only optimized, reviewed derivatives may enter the playable test.
