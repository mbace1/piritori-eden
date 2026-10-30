# Fighter animation continuity requirements

Owner direction, 2026-09-12: add future-animation support around the Meshy pilot work. This document is the production acceptance checklist; the scoped v02 browser checkpoint described below does not complete every gate.

Read DESIGN_AUTHORITY.md, ART_BIBLE.md, the current MESHY_AGENT_HANDOFF.md and MESHY_PILOT_RESULTS.md first. Existing character and animation contracts still apply. Scope: F01/F02; no new character generation or production-game deployment.

## Current v02 checkpoint

PR #68 / v4.49 includes public `playable-test-only` v02 bodies and meshless
own-rig Alert/Casual Walk packs. F01's Arm/ForeArm factor is `0.953` and F02's is
`1.080`; the resulting mean shoulder-to-wrist/height ratios are `0.319953` and
`0.250006`. Both bodies retain their 15,512/15,503 triangles, 24-bone skins, 2K
textures, UV/joint/weight contracts, and corrected non-emissive material payloads.
The v01 bodies/packs remain rollback candidates.

Blender full-playback/export checks and the Three.js browser importer pass for
each fighter's own clips. Browser regression is 76/76 across desktop, mobile,
Pixel, and iPad viewport emulations, including touch scrolling, reduced motion,
and BFCache lifecycle. Viewport emulation is not physical-device testing. The
private archive has not yet passed an independent restore, the Godot importer is
still open, and this checkpoint is not final art approval or a hub-deployment
claim.

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

Do not rename/reparent production bones or change their rest pose silently. The
arm-proportion correction is explicitly versioned as v02/v2 and its own-rig
clips were rebuilt against the new rest/bind. Any further rest change creates a
new rig version and requires the same revalidation.

Test one shared clip on BOTH F01 and F02. Their A/T rest-pose difference may require a retarget correction. Check shoulders, elbows, hips, knees, wrists, foot contact and character-specific silhouette. Do not infer compatibility from a static pose or a shared skeleton count.

## Finger and grip support

The current Meshy rigs have no finger bones. Rig v2 is already the
arm-proportion revision, so any hand-articulation derivative needs a new,
explicit rig version. Before declaring detailed grip support complete:
- retain the original body hierarchy; add named finger chains with explicit parenting and skin weights;
- preserve v1 as rollback and v2 as the current proportion-corrected test rig;
- make and inspect open-hand, closed-fist and representative prop-grip poses on each hand of each fighter;
- define stable left/right hand attachment transforms for separately authored props;
- layer finger animation over body clips so existing idle/walk motion remains usable;
- recheck the existing idle and walk after the extension and export/reimport round trip.

A wrist attachment alone does not provide gripping fingers. If the current hand mesh cannot support convincing articulation, report it for owner guidance instead of claiming the limitation is fixed. Do not order new character generation automatically.

## Motion and importer acceptance

Full playback of each fighter's own idle and walk now passes Blender and browser
framing checks. On both models, still inspect stop, turn, and transitions; check
foot sliding, root drift, loop seams, blending, and visible garment collapse.
Keep detailed evidence private until suitable for owner review; show reviewable
motion directly.

The public v02 bodies strip the unskinned Icosphere, preserve the skinned mesh,
and pass exported/reimported hierarchy, own-clip, weight, texture, and durable
material checks. Test shared clips against both actual project importers before
claiming cross-rig or game compatibility. Physical Pixel and iPad behavior
remains a separate runtime gate.

## Merge gate and completion record

The scoped playable hub checkpoint may be published without implying production
completion. Publishing that test does not merge PR #68. Keep PR #68 open until
the receiving agent records the following, or the owner explicitly waives an
individual gate for the merge:

1. archive inventory and successful independent restore;
2. rig signatures and a two-character shared cross-rig clip playback result;
3. finger/grip extension and export/reimport results, or an explicit owner
   decision accepting the documented limitation;
4. stop/turn/transition evidence plus Godot-importer and physical-device results;
5. final owner visual approval.

Current evidence completes the v02 own-rig Alert/Casual Walk Blender and browser
checkpoint only. Shared motion, finger/grip, transitions, archive restore,
Godot, physical devices, and final approval remain open. The owner's direction
not to wait for fingers or final polish applies to the playable hub test, not an
implicit waiver of this merge gate. Do not repeat paid jobs already recorded in
MESHY_PILOT_RESULTS.md.
