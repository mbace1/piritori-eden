# Piritori agent startup

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

Keep raw masters, credentials, signed URLs, intermediate and rejected art
private. Preserve versioned rollback files. Existing candidate/continuity
gates still apply; the new manifest does not waive visual or device acceptance.

Batch related pipeline stages into one reviewable PR. Owner-approved,
non-destructive processing may run automatically once the worker and its cost
policy exist. The worker is not implemented by this startup contract.

JS/web is the primary game build; Godot is a port. Do not migrate engines or
change campaign rules as part of asset-pipeline work.
