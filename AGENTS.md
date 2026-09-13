# Piritori agent startup

Read `ACTIVE_CONTEXT.md` first, before planning or asking the owner to repeat
decisions. For Meshy work, read `MESHY_AGENT_HANDOFF.md` and its current-production
notice, `3D_PIPELINE.md`, `MESHY_PILOT_RESULTS.md` and the manifest before inferring
status. A partial local checkout is not evidence that a GitHub handoff is absent.

Before 3D work, read `DESIGN_AUTHORITY.md`, `3D_PIPELINE.md`,
`assets/CHARACTER_SPEC.md` and `assets/asset_manifest.json`. Read the relevant
Art Bible and character references before designing or altering an asset.

The production manifest records current character state. Never infer completion
from conversation history, an old PR description, or a successful Meshy job.
`art/v3/manifest.json` remains the runtime ID register; the production manifest
references its IDs and hashes rather than replacing the runtime loader.

Owner direction, 2026-09-12: Astra owns integration/gameplay/visual testing;
the Turf chat is Sol and is the intended pipeline-engineering counterpart.
Routine operations should become deterministic tools, not repeated agent
handoffs. This describes responsibilities, not evidence that another agent is
working. Do not launch tasks or message another chat without owner direction.

Current pilot: CHR_F01 and CHR_F02 only. Their concepts are approved; their v05
models are playable test candidates. CHR_F03 was rejected and is disabled.
Do not generate replacements or expand the roster to fix a pipeline defect.

Incoming assets are welcome beyond that pilot. Record received batches in
`assets/asset_manifest.json` under `incoming_batches` using the intake contract
in `3D_PIPELINE.md`. Inventory existing deliveries before commissioning more.
Receipt, design approval and engine acceptance are different facts. Route props,
scenery and motion to their own checks; do not force them through humanoid rig
gates. Never overwrite a registered asset merely because a newer file arrived.

Run `python tools/meshy/character.py status`, then `check`. Run `validate` before
claiming production readiness. These commands are local and read-only. A
prototype integration does not advance the production lifecycle to INTEGRATED.
Matching joint counts do not establish shared animation compatibility.

Owner clarification, 2026-09-13: a preferred concept option is not automatically
approved. D009's v04 middle/right choice records relative preference, not a
locked direction. Keep exploration open and read the corrected design authority.

Keep raw masters, credentials, signed URLs, intermediate and rejected art
private. Preserve versioned rollback files. Existing candidate/continuity
gates still apply; the new manifest does not waive visual or device acceptance.

Batch related pipeline stages into one reviewable PR. Owner-approved,
non-destructive processing may run automatically once the worker and its cost
policy exist. The worker is not implemented by this startup contract.

JS/web is the primary game build; Godot is a port. Do not migrate engines or
change campaign rules as part of asset-pipeline work.

Before scenario or environment design, read `design/SCENARIO_ATLAS.md` and
`design/scenario-atlas.json`, then the canonical documents and content they
reference. The atlas separates authored facts, proposed staging and pending
owner decisions; it does not override the GDD or certify runtime integration.
Record answers and source changes there so later work can follow the decisions.

Owner continuation, 2026-09-13: temporary neutral characters are authorized
for the Option C laboratory until the approved fighters fit and look good.
They do not replace approved concepts or change production-manifest status.
Push each reviewable slice batch and its tests/handoff to the Piritori GitHub
repository so other PCs can continue. Distinguish source pushed, PR open,
merged and live hub deployment; never claim one from another.

