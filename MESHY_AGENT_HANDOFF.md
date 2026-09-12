# Piritori Meshy pilot handoff

Updated: 2026-09-12. Receiving-agent update added; approved source references
are now included, while generated geometry remains private and unregistered.

The owner requested this repository handoff so agents on other PCs can continue the two approved source pilots. Do not batch beyond F01 and F02. Coordinate with the art-lane owner before submitting: another agent may have advanced a pilot since this snapshot.

## Production continuation — 2026-09-11 PDT

Owner authorization recorded on PR #68 advanced both masters through the
15k-target remesh, approved-source retexture, rigging, and Alert/Casual Walk
checks. All paid tasks succeeded. Blender 5.2.1 finds complete 24-bone skinning,
no unweighted vertices, and coherent shoulder/elbow/hip/knee deformation in the
sampled frames. F01's A-pose was not a functional blocker. F02's original tiny
boundary loop does not recur after remesh; residual garment/body junction topology
is documented rather than described as fully manifold.

See [MESHY_PILOT_RESULTS.md](MESHY_PILOT_RESULTS.md) for every derivative task
ID, action ID, actual triangle count, credit total, output fingerprint, visual
evidence, caveat, and remaining gate. The generated GLBs/FBXs and full QA data
remain private. No runtime registration, integration, or deployment occurred.

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
not part of this PR. Raw masters and the later remeshed, textured, rigged
review candidates remain private; none is accepted runtime art.

Owner follow-up: **use a 15,000-triangle target for accepted character
derivatives to preserve facial clarity.** This replaces 12k as the target for
these pilots; it does not relax the geometry-review, rigging or device gates.

## Read first
Read [CLAUDE.md](CLAUDE.md), [DESIGN_AUTHORITY.md](DESIGN_AUTHORITY.md), [PHASING.md](PHASING.md), [ART_BIBLE.md](ART_BIBLE.md), [GAME_DESIGN_DOCUMENT.md](GAME_DESIGN_DOCUMENT.md), and [PORTING.md](PORTING.md) before making design changes. The older scope document is not present at the repository root on main at handoff time. Scope reference originally supplied: https://github.com/mbace1/piritori-eden/blob/fix/godot-approach-cell/PIRITORI_LONG_TERM_SCOPE.md (context commit 3c15a60). Resolve current design authority rather than assuming this older branch is current.

## Owner decisions
Explicit approval: "First 2 approved. Scrap 3".
F01 heavy bruiser: broad adult man, receding hair/stubble, black leather jacket, ochre knit, dark trousers, heavy shoes.
F02 wiry skirmisher: lean adult woman, short uneven dark hair, black padded vest, grey hoodie, rust two-stripe track pants, offwhite trainers.
Both approvals are recorded separately in the canonical [art-library/APPROVALS.md](art-library/APPROVALS.md) register. They cover the front-facing 2D T-pose concepts only; the owner subsequently authorized remesh, texture, rigging and motion testing, as recorded above. Final visual acceptance and runtime approval remain outstanding. F03 burgundy-bomber stocky brawler is rejected; do not reuse it.
Older poses may be reused ONLY after showing the exact candidate to the owner for approval.
Fighters only, gritty Piritori street combatants with distinct silhouettes. No civilians/grandmas or narrative cast substitutions. Existing plain/janky 3D originals are not the new style baseline. Kallio 2003, no modern techwear. Preserve the approved ink illustration character identities.

## Files on the source Windows desktop at handoff
Source workspace-relative directory: `.private/piritori-asset-drafts/2026-09-11/`. The root `/.private/` ignore rule protects this repo-local workspace from Git. Never force-add it. These private files are not part of the repository handoff; ask the owner or source agent for the approved PNGs.
Approved images:
concept-review/F01-heavy-bruiser-front-tpose-v01.png
concept-review/F02-wiry-skirmisher-front-tpose-v01.png
F01 SHA256: BC02611151B0D7BB255F899741953ACC5C8BA5D88E597B43D9595E46D720C26C
F02 SHA256 (original PNG): 890E54D58391C7BCB0B332992C643723E81B07298B5AFA86DE7D9BF24D70C212
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

## Blender inspection, required remesh and next gates
The source PC used Blender 5.2. Locate Blender on the receiving PC; do not assume the source installation path.
Import master and inspect neutral clay front/side/back/three-quarter views: face likeness, silhouette, hand/finger integrity, armpit separation, leg gap, feet and joint geometry. Save renders and a concrete findings report; repairs go into derivatives.
For these two pilots, continuation was authorized and the following derivative chain has already completed; consult MESHY_PILOT_RESULTS.md rather than submit duplicate jobs. The required workflow is to create a remeshed derivative before any rigging. Keep `should_remesh:false` on the initial Image to 3D request so the untouched high-resolution master is retained, then submit its successful task ID to `POST https://api.meshy.ai/openapi/v1/remesh`:

```json
{
  "input_task_id": "<successful-image-to-3d-task-id>",
  "target_formats": ["glb"],
  "topology": "triangle",
  "target_polycount": 15000
}
```

Meshy's target is approximate, so record the derivative's actual triangle count. The 15k target is the owner-selected pilot budget for facial clarity. Inspect the remeshed GLB again in Blender for likeness, silhouette, hands, joints, manifold defects, UV readiness and deformation-friendly topology. Do not send the raw multi-million-face master to rigging: Meshy's current `input_task_id` rigging limit is 300,000 faces and its API explicitly directs larger inputs through Remesh first.

Only after the remeshed derivative passes inspection, texture that derivative. For this geometry-only pilot, submit the successful **remesh task ID**, never the original Image to 3D task ID, as `input_task_id` to `POST /openapi/v1/retexture`. Use the approved source image as `image_style_url` so the accepted colour blocks and ink identity remain the reference. Record the retexture task ID and validate its output GLB.

The direct remesh output is untextured and therefore is not a valid rig input. Submit the validated, textured descendant of the 15k remesh to `POST /openapi/v1/rigging` via `model_url`:

```json
{
  "model_url": "<successful-retexture-output-model_urls.glb>",
  "height_meters": 1.7
}
```

Replace the example height with the measured character height. Do not run `rig.py --task` with the original Image to 3D task ID. If that helper cannot accept the textured derivative GLB URL, update or bypass it rather than routing the raw master into rigging. Verify the GLB faces toward +Z as Meshy requires for `model_url`, record the rigging task ID, then use that ID as `rig_task_id` for each `POST /openapi/v1/animations` request. Record every animation task ID together with its preset `action_id` or custom `motion_task_id`. Current references: [Remesh API](https://docs.meshy.ai/en/api/remesh), [Retexture API](https://docs.meshy.ai/en/api/retexture), [Rigging API](https://docs.meshy.ai/en/api/rigging), and [Animation API](https://docs.meshy.ai/en/api/animation).

After rigging, inspect one purposeful idle, then walk/stop/turn. Avoid generic realism, shiny plastic or baked lighting. A 1k atlas is the proposed runtime texture target, not a proven limit; Meshy's current Retexture API generates 2k or larger, so create and validate the 1k runtime derivative separately. Actual device targets: Pixel 10 Pro and iPad M2. Browser emulation is not physical-device testing.
Do not claim fully repaired, rigged, animated, device-tested or published without evidence. Keep intermediates/rejected art private. No public deployment is authorized for this pilot.
Show images directly in chat: plain generated-image output was invisible remotely, but saved PNGs displayed through view_image succeeded. Localhost/file links alone do not work for the remote owner.

## Receiving agent completion record

Record the source image hash; Image to 3D, remesh, retexture and rigging task IDs; every animation task ID and its `action_id` or `motion_task_id`; model/settings; output paths; actual credit usage; master and derivative triangle counts; Blender findings; owner review; and outstanding gates in a follow-up commit. Do not include secrets or account billing details. Obtain the actual approved image before generation; written descriptions are identifiers, not replacement prompts.
