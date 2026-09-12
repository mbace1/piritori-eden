# Meshy candidate gate

This is the required future-state path for Piritori character generations.
Its purpose is to spend Meshy retries on bad geometry before spending human time
on remesh repair, rigging, animation, Blender edits, runtime integration, or a
PR review.

The decision record is private. Copy
`meshy-candidate-decision.template.json` beside a candidate's ignored evidence,
fill it with real hashes and review results, then run:

```powershell
python art-src/tools/meshy_candidate_gate.py <private-decision.json> --before remesh
python art-src/tools/meshy_candidate_gate.py <private-decision.json> --before rig
python art-src/tools/meshy_candidate_gate.py <private-decision.json> --before animate
python art-src/tools/meshy_candidate_gate.py <private-decision.json> --before integrate
```

Exit `0` authorizes that next step, `1` means a visual or prerequisite gate is
blocked, and `2` means the record is invalid. Task URLs, credentials, and API
keys are forbidden in the record. Keep masters, evidence, and the completed
record under `.private/`; commit only approved derivatives and non-sensitive
provenance.

## Why generation starts in Workspace

Piritori uses a Meshy Premium account. Meshy's current plan table grants
Premium 12 Free Retries per completed generation. The Workspace loop button
reruns a completed Text-to-3D or Image-to-3D generation with a different random
seed. A technical failure is refunded instead and should not consume a Free
Retry.

Free Retry is not available to self-service Individual or Studio API calls. An
API resubmission is a new charged request, and API-generated assets do not
appear in Workspace for a later free retry. Therefore:

1. Generate and choose the master in Meshy Workspace or 3D Agent.
2. Read and record the live retry counter. Do not infer it from a cached plan
   page.
3. Use Free Retry for stochastic defects in an otherwise sound reference.
4. Download only the winning master and preserve its attempt lineage.
5. Use the API only after accepting its lack of Free Retry, for a batch whose
   repeatability is worth the extra credit cost.

Meshy's own support pages disagree about some team-plan retry counts. Premium's
12 is consistent, but the live Workspace counter remains the operational
authority. Meshy gives no documented hour/day expiry; its guidance says to use
Retry after the generation completes. Review immediately so the opportunity is
not lost.

## Input setup

- Use the exact approved reference and record its SHA-256 plus approval entry.
- Prefer Image to 3D for an approved character identity.
- Use one clear subject on a simple or removed background, at least 512 px.
- Use Meshy 7 and record every visible option in a canonical settings file;
  hash that file rather than copying prompts or credentials into the gate.
- Select a T-pose or A-pose suitable for rigging. Pose choice does not excuse
  incorrect shoulder-to-wrist reach.
- Premium supports Multi-View. Use front, true side, back, and three-quarter
  references only when those exact views are owner-approved and mutually
  consistent. Never manufacture unapproved views and treat them as canon.
- Keep hands away from clothes and torso. Require visible thumb separation and
  four readable fingers on each hand in the input.
- Do not start texturing, remeshing, or rigging while the generation retry
  decision is open.

## Gate 1: generated master

Rotate the uncolored master and capture front, back, both sides,
three-quarter, face, and both hand closeups. A flattering front view is not
enough.

Use Free Retry immediately for any of these:

- arm reach is visibly short/long, asymmetric, or disconnected from the
  approved silhouette;
- either hand is a mitten/paddle or lacks five readable digits;
- fingertips touch, cross, curl under, or fuse through the distal finger area;
- the thumb is missing, fused, or not opposable;
- limbs contact clothes, wrists/cuffs tear, or geometry floats/intersects;
- face, body type, outfit silhouette, or approved character identity drifts.

For hands, require three visible gaps through at least the distal third of the
four-finger group plus an open thumb-index gap. Prefer modest natural splay,
rounded tips, continuous knuckle roots, and a clean wrist transition. If the
same defect survives two stochastic retries, stop spending retries: fix the
reference, pose, crop, or settings and begin a new generation. A systematic
input problem will not become a reliable production asset through rerolls.

Only a passing `generation` record authorizes remesh.

## Gate 2: 15k textured production input

Remesh before texturing. The Piritori fighter target remains 15,000 triangles;
record the actual result and keep it between 14,500 and 16,500 for this gate.
Recreate the same evidence after remesh and texture.

- All five digits and their gaps must survive. If a finger collapses into a
  tiny lobe, the derivative is not riggable.
- Face, eyes, nose, and mouth must still read at gameplay scale.
- Skin must read as skin rather than default white, and face/hands must agree.
- Hair and clothing colors must remain source-faithful; no skin tint may bleed
  into them.
- Reject hard wrist seams, UV smears, white fallback material, holes, floaters,
  and new self-intersections.

Route the failure to its source: master geometry defects go back to generation
Retry; detail lost only during reduction goes back to Remesh; correct geometry
with bad color goes to Retexture. Do not use Blender sculpting or atlas surgery
as the first response to a failed upstream asset.

Only passing `generation` and `production_input` records authorize rigging.

## Gate 3: rig and motion

The exported artifact is the authority. Product descriptions do not prove its
joint contract. Inspect bone names, hierarchy, weights, and both hands before
animation. Piritori currently requires independently controllable digits and
visible open, relaxed, compact-fist, and real prop-contact grip poses. It also
requires stable arm length in bind, idle, and walk frames.

If the rig does not contain the required finger controls, either use an
explicitly audited compatible rig donor or complete the Blender rig handoff;
do not describe a body-only skeleton as finger-ready. Rig evidence must show
motion and contact, not only a bone count. Once motions are selected, Meshy's
`Download -> Animation -> All Added -> Single File` export can keep multiple
actions together for the Blender handoff.

## Existing Meshy Community characters

Premium permits Community-model downloads, and models published to the Meshy
Community are currently shared under CC0. Meshy advertises a collection of
rigged, animation-ready characters downloadable with their skeletons. These
can shorten prototyping, provide a private skeleton/weight reference, or act as
a candidate rig donor.

They do not automatically become Piritori production characters:

1. Save the Community model page, author, displayed license, download date,
   file hash, and format in the private record.
2. Prefer GLB for Godot/web inspection and FBX or BLEND for Blender editing.
3. Verify that the downloaded file actually contains the advertised skin,
   bones, finger joints, weights, textures, and animations.
4. Run the same production-input and rig gates. Never infer compatibility from
   a `rigged` tag.
5. Use generic Community art only as private reference/donor material unless
   the owner separately approves its visible design for Piritori.

The two approved F01/F02 concepts remain the visual authority. A Community
skeleton may reduce Blender work; a Community character may not silently
replace their identities.

## Before and after

| Old path | Required path |
|---|---|
| API generation, no free reroll | Workspace generation, up to 12 Premium retries |
| Advance immediately from a successful task | Inspect all angles and accept one attempt first |
| Discover proportions/hands during rig or browser work | Reject arms/hands on the unrigged master |
| Repair upstream defects procedurally | Retry generation, remesh, or texture at the responsible stage |
| Green structural checks imply readiness | Structural checks plus saved visual evidence |
| Start integration while art review is open | Validator blocks remesh, rig, animation, and integration |

For the current F01/F02 work, the public v01/v02 files and the private v03
prototype predate this gate. They remain provisional. The next Blender agent
should use the approved concepts and private work as evidence, not as proof of
acceptance, and must not promote a fighter until the relevant gate passes.

## Official Meshy references checked 2026-09-12

- <https://help.meshy.ai/en/articles/12062933-which-meshy-plan-is-right-for-you-free-vs-pro-vs-premium-vs-ultra>
- <https://help.meshy.ai/en/articles/9996860-how-to-use-meshy-image-to-3d>
- <https://help.meshy.ai/en/articles/9992034-does-the-meshy-api-support-retry-for-generations>
- <https://help.meshy.ai/en/articles/9991995-if-one-generation-fails-will-my-credits-still-be-deducted>
- <https://docs.meshy.ai/en/webapp/image-to-3d>
- <https://help.meshy.ai/en/articles/16231707-how-to-create-3d-animation-with-auto-rigging>
- <https://help.meshy.ai/en/articles/11725598-how-do-i-export-multiple-animations-into-a-single-file-for-blender>
- <https://help.meshy.ai/en/articles/10225410-what-are-the-community-guidelines-for-meshy>
- <https://www.meshy.ai/use-cases/free-game-assets/character-rigging>
