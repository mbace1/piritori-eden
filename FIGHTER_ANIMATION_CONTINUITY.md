# Fighter animation continuity requirements

Owner direction, 2026-09-12: add future-animation support before merging the Meshy pilot work. This document is an implementation and acceptance checklist, not evidence of completion.

Read DESIGN_AUTHORITY.md, ART_BIBLE.md, the current MESHY_AGENT_HANDOFF.md and MESHY_PILOT_RESULTS.md first. Existing character and animation contracts still apply. Scope: F01/F02; no new character generation or runtime deployment.

## Preserve reusable source assets

Meshy's non-Enterprise API assets are retained for a maximum of three days. Downloaded files, not task IDs or temporary URLs, are the long-term source of truth. See https://docs.meshy.ai/en/api/asset-retention.

Before merging the asset follow-up:
- Preserve the accepted textured skinned GLB, an editable Blender scene, textures, original rig hierarchy/rest transforms, and every accepted animation clip.
- Keep raw masters and rejected experiments private and separate from accepted deliverables.
- Create a private handoff archive with a relative-path manifest recording each file's SHA-256, byte size, role, character ID, source task ID and rig version. Never include API keys, account details or signed download URLs.
- Put the accepted handoff archive in owner-controlled private storage accessible from another PC. Do not publish private masters to the public repository.
- Restore the archive on a second PC or independent clean directory, verify all hashes and reopen a rig and its clips with network disabled. A path on the generating PC alone does not satisfy this gate.
- Record the private storage locator in a private handoff, and the verification date/result in MESHY_PILOT_RESULTS.md without exposing credentials or restricted links.

## Add animations without replacing the character

While the Meshy rig task remains usable, apply a preset action or Text-to-Motion clip using its rig_task_id; preserve every task/action ID and downloaded result. Recheck availability and price before submitting. Do not assume expired tasks can be reused indefinitely.
Official reference: https://docs.meshy.ai/en/api/animation.

After server-side expiry, author or retarget motion in Blender on the preserved local rig. This path does not require a new Image-to-3D generation. Meshy may require another rigging task if its old rig task is unavailable; that is not necessary for local Blender animation.

Package runtime motion as reusable clips without duplicated character textures where the importer supports it. Preserve a complete editable source separately. Never remove the skeleton data needed to interpret animation tracks.

## Rig compatibility gate

Matching 24-bone counts is not compatibility proof. Record a versioned rig signature covering:
- bone names, parent hierarchy and deform flags;
- rest matrices, local axes, scale, forward/up convention and root placement;
- bind matrices and skin influence limits;
- character height and the intended root-motion policy.

Do not rename/reparent production bones or change their rest pose silently. Such changes create a new rig version and require revalidation of existing clips.

Test one shared clip on BOTH F01 and F02. Their A/T rest-pose difference may require a retarget correction. Check shoulders, elbows, hips, knees, wrists, foot contact and character-specific silhouette. Do not infer compatibility from a static pose or a shared skeleton count.

## Finger and grip support

The current Meshy rigs have no finger bones. Add hand articulation in a Blender derivative before declaring detailed grip support complete:
- retain the original body hierarchy; add named finger chains with explicit parenting and skin weights;
- preserve the original rig as v1 and identify the extended rig as v2;
- make and inspect open-hand, closed-fist and representative prop-grip poses on each hand of each fighter;
- define stable left/right hand attachment transforms for separately authored props;
- layer finger animation over body clips so existing idle/walk motion remains usable;
- recheck the existing idle and walk after the extension and export/reimport round trip.

A wrist attachment alone does not provide gripping fingers. If the current hand mesh cannot support convincing articulation, report it for owner guidance instead of claiming the limitation is fixed. Do not order new character generation automatically.

## Motion and importer acceptance

On both models, inspect full playback of idle, walk, stop and turn transitions, not only five sampled stills. Check foot sliding, root drift, loop seams, blending and visible garment collapse. Keep evidence private until suitable for owner review; show reviewable motion directly.

Strip the unskinned Icosphere helper, preserve the skinned mesh, and verify exported/reimported bone hierarchy, animation timing, skin weights and texture references. Test shared clips against the actual project importer before claiming game compatibility. Physical Pixel 10 Pro and iPad M2 performance remains a separate runtime gate.

## Merge gate and completion record

The documentation PR may record these requirements, but the owner asked for actual animation continuity work before merging the asset follow-up. Keep PR #68 unmerged until the receiving agent records:
1. archive inventory and successful independent restore;
2. rig signatures and a two-character shared-clip playback result;
3. finger/grip extension and export/reimport results, or an explicit owner decision accepting a documented limitation;
4. full motion/transition evidence and remaining importer/device limitations.

Current evidence only establishes the previously reported 24-bone rigs and sampled Alert/Casual Walk QA. This new checklist is NOT yet passed. Do not repeat paid jobs already recorded in MESHY_PILOT_RESULTS.md.
