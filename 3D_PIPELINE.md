# Manifest-driven character production

Owner direction, 2026-09-12. F01/F02 are the complete pipeline pilot. Stop
expanding the roster until the same build process works for both.

## Implemented now

`assets/asset_manifest.json` records production IDs, approved concepts, exact
candidate files/hashes, rig provenance, motion gaps and prototype integration.
`assets/character_spec.json` holds limits and required evidence gates.
`tools/meshy/character.py` reads these locally using Python's standard library:

```sh
python tools/meshy/character.py status
python tools/meshy/character.py status CHR_F02 --json
python tools/meshy/character.py check
python tools/meshy/character.py validate CHR_F01
python -m unittest discover -s tools/meshy/tests
```

Run from the repository root. `check` verifies records, GLB identity/inventory
and agreement with the runtime register. A consistent incomplete pilot can
pass `check`; `validate` must fail until production gates pass. Exit codes:
0 success, 1 incomplete/failed validation, 2 malformed input or unknown ID.
No command generates, spends, downloads, promotes, publishes or edits files.
There is no running Meshy worker and no `character build` command yet.

## State contract

`CONCEPT → APPROVED → GENERATING → GENERATED → RIGGED → VALIDATED → GAME_READY → INTEGRATED`

These are achieved production stages, not job health. A failed/canceled job
records its health and reason separately and cannot advance a stage. Missing
files are validation failures, not a ninth lifecycle state. F03 stays disabled
with rejected concept approval; no build request may resurrect it.

F01/F02 currently remain RIGGED, with `integration.mode = prototype`. The live
C.03 scene demonstrates gameplay, not completed normalization, shared motion
or physical-device acceptance. Older prose claiming no fingers/no runtime
integration is historical. This manifest supersedes that production status,
while preserving the design authority and outstanding acceptance requirements.

Production state is a ledger of evidence, not a declaration that can make art
finished. Candidate hashes bind evidence to a version. Replacing a candidate
invalidates prior gates and keeps the old version for rollback. No automatic
promotion from Meshy's SUCCEEDED response to GAME_READY.

## Service implementation contract — next engineering batch

The intended engineering owner is Sol (Turf chat); Astra integrates and tests
the result. This document is a handoff specification, not a dispatched task.

1. Add `character build ID` and `resume ID` with a durable private job journal.
   Store the asset ID/version, source hash, request fingerprint, selected API
   model, payload without secrets, cost authorization, task/parent IDs, stage,
   attempts and downloaded hashes. One writer/lease per asset. Use atomic
   manifest writes and compare the previous revision before committing.
2. Adopt existing downloaded F01/F02 inputs by hash. Resume at the first unmet
   gate. Do not regenerate or repeat old paid jobs. Future generation must use
   the exact owner-approved image; F03 and unknown IDs fail before submission.
3. For approved images: geometry-only Image-to-3D, private turntable review,
   remesh to the candidate budget, retexture from the approved image, then rig
   the accepted textured derivative. Use the existing candidate gate before
   each expensive stage. Text-to-3D's preview/refine path applies to genuinely
   text-led assets; it is not a substitute for these approved character images.
4. Use an SSE-consuming persistent desktop worker initially. Persist each
   event, reconcile completion through authenticated task GET, download
   promptly, validate and resume after interruption. Bounded backoff GET is a
   recovery path, not an agent sitting in a polling loop. Later, a reachable
   HTTPS receiver can enqueue webhook events; static Pages cannot host it.
5. Make duplicate/out-of-order events harmless. A timeout after a paid POST
   leaves submission outcome uncertain: reconcile before another POST. Do not
   assume provider idempotency or retry permission. Expired URLs are not stored
   as durable asset identities. Download to a temporary file, verify it, then
   atomically promote the local artifact. Keep URLs and credentials private.
6. Run versioned Blender scripts for repair/retarget/export. Capture source
   and destination rig signatures, normalization metadata, texture/triangle
   inventory, numerical roundtrip and full in-engine motion evidence. Preserve
   the accepted skeleton and common clips locally so future animation work
   does not require regenerating a character.
7. Update the runtime register only from a validated candidate. The C.03 test
   fixture may explicitly load prototype candidates; production loading must
   require GAME_READY. Astra owns the integration/visual checks and deployment.
8. Commit stages automatically on one batch branch after explicit scope/cost
   authorization. Redact job logs; keep intermediates/rejected art private.
   Open one PR when the batch is reviewable. Do not merge or overwrite approved
   designs merely because the worker finished.

The worker must have an explicit spending ceiling, bounded attempts and a
durable pause on uncertainty. Concept approval is not an unlimited API budget.
No new Meshy job is authorized or submitted by this contract change.

## Pilot completion experiment

Finish F01 through one accepted normalized rig/motion recipe. Then start F02
from its preserved input with the same command/configuration. It must reach
the same gates without manual per-character code decisions. Record elapsed
machine time, credits, human interventions and failures. Fix the recipe when
F02 fails; do not hide a bespoke repair behind a GAME_READY flag. Any design
change still goes to the owner. Existing accepted work must remain reversible.

The first paired proof is one common body clip plus finger layering, both
characters, full playback/transition, actual Three.js importer. After this
passes, expand the common action set and finish device/visual acceptance.
The private v05 archive has restored in an independent local directory, but
delivery to owner-controlled private storage accessible from another PC remains
outstanding. No private storage locator belongs in this public manifest.

## Verified Meshy API distinctions

Checked 2026-09-12 against official documentation:

- [Image-to-3D](https://docs.meshy.ai/en/api/image-to-3d) supports geometry-only
  output, A/T pose options and requested `target_formats`. GLB-only is useful
  where an endpoint supports it; do not send that parameter to every endpoint.
- [Text-to-3D](https://docs.meshy.ai/en/api/text-to-3d) has preview/refine stages.
- [Rigging](https://docs.meshy.ai/en/api/rigging) expects a clear textured
  humanoid biped and +Z facing for `model_url`; it exposes a task SSE stream.
- [Webhooks](https://docs.meshy.ai/en/api/webhooks) require HTTPS and events
  can arrive out of order. Verify task state before trusting an event.
- [Text-to-Motion](https://docs.meshy.ai/en/api/text-to-motion) produces FBX
  (prime) or BVH (swift), requiring conversion for a GLB runtime library.
  [Animation](https://docs.meshy.ai/en/api/animation) can apply a motion task to
  a rig. This does not establish compatibility between our repaired local rigs.
- [Retention](https://docs.meshy.ai/en/api/asset-retention) is at most three
  days for non-Enterprise API assets. Preserve downloads immediately.

An MCP wrapper is optional transport. The journal, deterministic processing,
evidence gates and durable assets must work independently of an agent session.
