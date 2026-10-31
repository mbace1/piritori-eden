# Aatami — concept-art review (PR #108)

**Owner direction, 2026-10-24:** "Think of Kurt Cobain in the Piritori style." The original three outfit explorations (A cardigan, B parka, C corduroy) were **superseded**, not delivered as three separate final concepts. Do not resurrect them without a new request.

## Verified assets and review status (2026-10-27)

The owner's selected **nine individual review images** are now committed on this PR branch: one young final, seven young supporting poses, one older final. The original three outfit concepts A/B/C were superseded; no separate A/B/C finals are claimed.

| File stem | Contents | Review status |
|---|---|---|
| `aatami-young-final-v01` | Young Aatami (2003): olive cardigan, striped shirt, dark jeans, shoulder bag | Owner-selected concept final; source art only |
| `aatami-young-support-01` … `04` | Four young studies | Supporting reference candidates |
| `aatami-young-support-05` | Left single pose extracted from the original two-pose sheet | Supporting reference candidate |
| `aatami-young-support-06` | Young front-facing study | Supporting reference candidate |
| `aatami-young-support-07` | Right single pose extracted from the original two-pose sheet | Supporting reference candidate |
| `aatami-older-final-v01` | Heavier older Aatami with moustache and beige sports coat | Owner-selected concept final; source art only |
| `aatami-older-support-01` | Extra older study, originally mislabelled as young support 07 | **Not owner-selected; excluded from nine-image handoff** |
| `aatami-young-pose-sheet-v01` | Unmodified original two-pose source sheet | Provenance/reference only; not an additional selected image |

**Verified provenance:** the original two-pose source sheet has Git blob SHA-1 `31fa3213699dc2bee57ebf53511ef2a7da031578`. The individual crops committed on 2026-10-27 match the corrected candidate package: support-05 `3d981e303d65ce4991f283b30996548472b0c490`, support-07 `9d5e297455c3cf9756fd9f3370bf32de37b9f807`. The reproducible extraction script is `tools/art/split_aatami_pose_sheet.py`.

The **nine-image selection is complete as committed review art**, not as production-approved, animated, rigged, or runtime-ready character art. The additional older study remains outside that selection.

### Production boundary

These are review/source illustrations. Per `DESIGN_AUTHORITY.md` (2026-10-02 and 2026-10-23), neutral stand-ins remain the default for playable characters; paper/motion-graphic cut-ins require explicit asset-specific approval and device-readability checks. A reference from PR #107 to a young-Aatami cut-in does not itself approve this PR's files for runtime use. Do not modify runtime manifests, ship the unapproved older study, or merge this PR as an art-approval action.

## Character canon

From `NARRATIVE.md`: Era I protagonist, early thirties, Kallio, Helsinki, 2003. He arrives at Piritori with cash, debt, one small bag and one known route; his brother is Jaska. The grunge-era reference is an homage, not a likeness. Use `ART_BIBLE.md`'s `cut-cardstock-hand-ink-v03` style and `art-library/APPROVALS.md` as the approval register.

Exact generation prompts were not supplied with the images; the adjacent `.txt` provenance files should not invent them.
