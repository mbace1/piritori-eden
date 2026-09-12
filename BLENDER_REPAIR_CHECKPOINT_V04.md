# Blender repair checkpoint v04 — F01 / F02

Date: 2026-09-12. Status: **INCOMPLETE — private repair checkpoint, not final art and not a merge approval.**

This is actual local Blender 5.2.1 LTS work against the four byte-verified v02 files named in [the owner handoff](https://github.com/mbace1/piritori-eden/pull/68#issuecomment-5646150188), originating at commit `74e45f15630151a6dbfca2d3ed517cf42d09b1c4`. The source files remain unchanged. No Meshy generation or paid rigging jobs were submitted.

## Implemented locally

- F01 mean shoulder-to-wrist chain: 0.607912 m → 0.575000 m (5.41% shorter).
- F02 mean shoulder-to-wrist chain: 0.475011 m → 0.535000 m (12.63% longer).
- Original 24 body bone names and parent hierarchy retained. Arm rest positions changed explicitly in the new v04 derivative; existing v02 files are the rollback.
- Added three joints for each of five digits on each hand: 54 bones total per fighter, with normalized skin weights capped at four influences.
- Reconnected coincident hand vertices at imported UV/normal seams before refining topology and smoothing weights. This stops seam tearing during flexion.
- Added relaxed finger tracks to the existing own-character idle/walk and a separate hand open/fist/grip test action. Added named left/right prop attachment nodes.
- Adjusted skin texels and matte material values in Blender. The final GLB embeds the exact corrected PNG bytes, verified by hash. A stale image export was caught and corrected.
- Corrected Blender's one-frame animation start offset. The exported existing clips now start at zero and retain 4.0 s idle / 4.2 s walk at 30 Hz.
- Body and facial topology retained; extra faces are localized to hands. Total triangles: F01 19,412; F02 17,329, compared with 15,512 / 15,503 source triangles. The hand extension increases the mesh budget; it is not a claim of unchanged 15k totals.

## Verified

- Fresh GLB import into a clean Blender scene: 358 sampled frames per fighter across the two original actions and the hand test.
- Maximum source-scene/exported joint position discrepancy: F01 0.000012904 m; F02 0.000013002 m.
- No nonfinite deformed vertex positions. Maximum separation at matching rest-position seam vertices: zero over the sampled frames.
- Both GLBs load in a browser harness using the exact Piritori vendored GLTFLoader (`27170277e22c0358135feb06678b73153244b354`) and Three.js (`0606aa60a84a6d89b53f2fb41eef11949d90cd98`). Three clips each, 54 bones each; no browser errors or animation binding warnings.
- Browser harness sampled 180 frames per clip and 180 idle/walk/idle transition frames per fighter. This establishes importer/playback integrity, not full game acceptance or foot-contact quality.
- A private checkpoint archive with 27 hashed files was extracted into an independent clean directory. Both editable Blender scenes reopened offline with packed textures and all three actions. This is a local restore, **not an off-PC private-storage handoff**.

## Visual decision still required

The topology repair eliminates tearing, but it does not make F02's flat source hands convincing in a closed fist. Palm-side inspection shows flattened fingers and poor thumb-web deformation. **F02 hand/grip quality is rejected.** Failed hand renders, experimental meshes and Blender masters remain private.

F01's hand flexion is substantially improved and retains the bruiser's bulky silhouette, but neither fighter is declared final or owner-approved.

The owner has been asked whether to rebuild F02's hand geometry locally while preserving the wrist and character identity; whether to retain F01's bulky hands; and whether hand quality should target gameplay distance or closeups. No new character generation is proposed.

## Remaining gates

1. Resolve F02 hand geometry and repeat palm/dorsal grip inspection before offering final derivative review.
2. Owner review of the new arm proportions and material appearance.
3. Shared **body** motion retargeting across the different rest poses, full game transitions/foot-contact review, and physical Pixel 10 Pro / iPad M2 testing remain separate. Testing each fighter's own clips is not shared-clip compatibility proof.
4. Preserve accepted masters in owner-controlled private storage accessible from another PC; the local checkpoint does not meet that delivery requirement.
5. Upload the suitable explicit-version derivatives and review evidence after the failed hand geometry is resolved. No v04 model has been registered, published to the hub, or substituted for v02.

PR #68 remains open and unmerged. The abandoned local v3 experiment is not used here.
