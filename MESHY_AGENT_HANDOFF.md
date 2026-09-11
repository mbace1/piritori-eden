# Piritori Meshy pilot handoff

Updated: 2026-09-12. Receiving-agent update added; approved source references
are now included, while generated geometry remains private and unregistered.

The owner requested this repository handoff so agents on other PCs can continue the approved one-character pilot. Do not batch the roster. Coordinate with the art-lane owner before submitting: another agent may have advanced the pilot since this snapshot.

## Receiving-agent update — 2026-09-11 PDT

The owner supplied the two exact chat attachments and clarified: **“These are
the new poses, all others are the old ones.”** The owner then directly asked to
order both and make a PR. That newer instruction expands the original F01-only
authorization below to F01 and F02.

The received JPEG bytes are committed as approved source concepts at:

- `art-library/characters/concepts-3d/pilots/f01-heavy-bruiser-tpose-v01.jpg`
- `art-library/characters/concepts-3d/pilots/f02-wiry-skirmisher-tpose-v01.jpg`

Both geometry-only Meshy jobs completed. See [MESHY_PILOT_RESULTS.md](MESHY_PILOT_RESULTS.md)
for task IDs, exact input hashes and settings, output hashes, Blender findings,
credit usage and remaining gates. The generated GLBs and diagnostic files are
not part of this PR because they are unremeshed review masters, not accepted
runtime assets.

Owner follow-up: **use a 15,000-triangle target for accepted character
derivatives to preserve facial clarity.** This replaces 12k as the target for
these pilots; it does not relax the geometry-review, rigging or device gates.

## Read first
Read [CLAUDE.md](CLAUDE.md), [DESIGN_AUTHORITY.md](DESIGN_AUTHORITY.md), [PHASING.md](PHASING.md), [ART_BIBLE.md](ART_BIBLE.md), [GAME_DESIGN_DOCUMENT.md](GAME_DESIGN_DOCUMENT.md), and [PORTING.md](PORTING.md) before making design changes. The older scope document is not present at the repository root on main at handoff time. Scope reference originally supplied: https://github.com/mbace1/piritori-eden/blob/fix/godot-approach-cell/PIRITORI_LONG_TERM_SCOPE.md (context commit 3c15a60). Resolve current design authority rather than assuming this older branch is current.

## Owner decisions
Explicit approval: "First 2 approved. Scrap 3".
F01 heavy bruiser: broad adult man, receding hair/stubble, black leather jacket, ochre knit, dark trousers, heavy shoes.
F02 wiry skirmisher: lean adult woman, short uneven dark hair, black padded vest, grey hoodie, rust two-stripe track pants, offwhite trainers.
Both are approved front-facing 2D T-pose concepts only. F03 burgundy-bomber stocky brawler is rejected; do not reuse it.
Older poses may be reused ONLY after showing the exact candidate to the owner for approval.
Fighters only, gritty Piritori street combatants with distinct silhouettes. No civilians/grandmas or narrative cast substitutions. Existing plain/janky 3D originals are not the new style baseline. Kallio 2003, no modern techwear. Preserve the approved ink illustration character identities.

## Files on the source Windows desktop at handoff
Source workspace-relative directory: `.private/piritori-asset-drafts/2026-09-11/`. These private files are outside this repository handoff; ask the owner or source agent for the approved PNGs.
Approved images:
concept-review/F01-heavy-bruiser-front-tpose-v01.png
concept-review/F02-wiry-skirmisher-front-tpose-v01.png
F01 SHA256: BC02611151B0D7BB255F899741953ACC5C8BA5D88E597B43D9595E46D720C26C
Other records: FIGHTER_ROSTER.md, ASSET_BRIEF.md, concept-review/TPOSE_PROMPTS.md, meshy-pilot/F01-pilot.json.
These original paths were local and not remotely downloadable attachments. The
later owner-supplied JPEG attachments above are now the authoritative bytes for
the completed pilot run. Their hashes differ from the private PNG provenance
hash because the attachment transport supplied JPEG files; this is recorded,
not silently treated as the same file.

## Historical state at handoff (source agent only)
NO Meshy generation submitted. No task ID, generated mesh, texture or rig exists for these new references. No generation credits spent by this task.
A balance GET failed before an HTTP response: Windows socket permission denied to api.meshy.ai:443. Credential validity and balance remain unverified. The source session has managed permissions and cannot request shell escalation. Do not bypass those controls.
A Meshy key was supplied in the source chat; it is deliberately not copied into this handoff or source files. Use legitimate secret configuration in your own environment, or ask for secure setup. Never echo credentials.
Do not assume user-side permission configuration advice has been applied or will override managed policy.

## Original authorized pilot at handoff
Check current official docs and pricing:
https://docs.meshy.ai/en/api/image-to-3d
https://docs.meshy.ai/en/api/balance
https://docs.meshy.ai/en/api/pricing
Check balance/auth first. Submit one F01 geometry-only job to POST https://api.meshy.ai/openapi/v1/image-to-3d using the approved PNG as image_url data URI.
Prepared parameters:
{"model_type":"standard","ai_model":"meshy-7","should_texture":false,"should_remesh":false,"pose_mode":"t-pose","image_enhancement":false,"target_formats":["glb"]}
Preserve image identity. Fingertip margins are tight, but hands and feet are inside frame. Rear/side views are not approved; inferred rear must be reviewed as provisional.
Record task ID immediately, source hash, parameters and status. If POST outcome is uncertain, reconcile task history before resubmitting to avoid duplicate charges.
Poll GET /openapi/v1/image-to-3d/{id}, download successful GLB, retain the original master.

## Blender inspection and next gates
The source PC used Blender 5.2. Locate Blender on the receiving PC; do not assume the source installation path.
Import master and inspect neutral clay front/side/back/three-quarter views: face likeness, silhouette, hand/finger integrity, armpit separation, leg gap, feet and joint geometry. Save renders and a concrete findings report; repairs go into derivatives.
Only after geometry is acceptable proceed to texture, rig, one purposeful idle, then walk/stop/turn. Preserve strong colour blocks and ink identity; avoid generic realism, shiny plastic or baked lighting.
8–15k triangles and 1k atlas are proposed runtime targets, not proven limits. Actual device targets: Pixel 10 Pro and iPad M2. Browser emulation is not physical-device testing.
Do not claim fully repaired, rigged, animated, device-tested or published without evidence. Keep intermediates/rejected art private. No public deployment is authorized for this pilot.
Show images directly in chat: plain generated-image output was invisible remotely, but saved PNGs displayed through view_image succeeded. Localhost/file links alone do not work for the remote owner.

## Receiving agent completion record

Record the source image hash, task ID, model/settings, output paths, actual credit usage, Blender findings, owner review and outstanding gates in a follow-up commit. Do not include secrets or account billing details. Obtain the actual approved image before generation; written descriptions are identifiers, not replacement prompts.
