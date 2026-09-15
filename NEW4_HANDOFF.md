# new4 handoff

## Owner requirements

- Consolidate the six distinct characters represented by new1/new2/new3.
- Use one restrained, simplified game-art style, with broad forms, clean matte colors and little surface noise.
- Preserve character identities and distinguishing outfits.
- Submit **only Meshy-approved results** to `art-src/meshy-input/new4/`.
- New3 failed its finger gate in **raw geometry**, as confirmed by the owner.

## Status

**No new4 character has Meshy approval yet.** `art-src/meshy-input/new4/approved-manifest.json` therefore contains zero entries. The directory contains policy/index files only; no unverified images or models.

Six front-reference candidates are in preparation in the current continuation workspace, outside the approved set. They are generated 2D art, not verified low-poly meshes. Earlier detailed drafts are superseded by a common simpler style. No new Meshy task was submitted.

The current continuation has no configured Meshy connector or MESHY environment variable. A request is pending for the workflow or accessible raw GLBs/review reports that will supply approval. Do not assume that another agent is running jobs or that this note grants an unlimited spending budget.

## Identity mapping

| Set-local ID | Name / descriptive label | Source identity |
| --- | --- | --- |
| new4_m01 | Heavy Bruiser | CHR_F01; complete original pilot restores the corrupt new3 source |
| new4_m02 | Bucket Hat Tracksuit | new3_m02 |
| new4_m03 | White Blazer | new3_m03 |
| new4_m04 | Green Mohawk | new3_m04 |
| new4_f01 | Wiry Skirmisher | CHR_F02; new3_f01 and repeated new1/new2 style studies |
| new4_f02 | Bomber Cargo | new3_f02 |

These descriptive labels do not assign new global production IDs. New1/new2 contain variants of F02; they do not add six extra roster identities.

## Proposed Meshy evaluation

Use one consistent candidate's views per job. Generate geometry with texturing and remesh disabled first; inspect both raw hands. Preserve originals. Then reduce a passing result toward the existing approximately 15k-triangle target and repeat hand/shape checks. Record actual geometry counts, task IDs, settings, hashes and review evidence before admission.

Simple images do not enforce polygon budgets. A lower-poly appearance is a reference design choice; actual mesh complexity and finger survival must be measured.

The input pose is A-pose with readable palms and separated limbs. In a documented API trial, use `ai_model: meshy-7`, `should_texture: false`, `should_remesh: false`, `pose_mode: a-pose`, and record the quality/enhancement options explicitly. Current web 7.1 Ultra 2K supports multiple views; Ultra 4K is single-view only. Confirm available options before spending.

For persistent raw finger failure, consider a separately reviewed hand repair derivative instead of repeated whole-roster regeneration. That does not retroactively approve the failed raw result.

## Primary guidance

- [Meshy hand troubleshooting](https://help.meshy.ai/en/articles/16102152-fix-character-pose-face-and-hand-issues-in-meshy): hands and thin details remain unreliable; clear inputs and external repair may be needed.
- [Multi-view guidance](https://help.meshy.ai/en/articles/16102789-meshy-multi-view-best-practices-angles-and-images): keep the same pose, style, scale and identity; inconsistent extra views can worsen results.
- [Meshy 7.1 availability](https://www.meshy.ai/blog/meshy-7-1-launch): quality modes concern geometric detail, not a guarantee of correct digit count.
- [API settings](https://docs.meshy.ai/en/api/multi-image-to-3d): preserve raw generation before remeshing and record exact parameters.

Thread: `01a0a628-7247-7493-ba5b-2439f9a68041`. This handoff records state; it does not dispatch another agent.
