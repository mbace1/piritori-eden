# Aatami — owner review gate (2026-11-10)

**Evidence and decisions only. No asset approval, new art pipeline, merge, or runtime promotion.**

## Authority verified

- `DESIGN_AUTHORITY.md`: cut-paper waist-up conversations; study 06 faces camera in single-speaker talk; young final is for side-by-side layout. Speech-bubble tail points toward the mouth without touching the face.
- `ART_BIBLE.md`: `cut-cardstock-hand-ink-v03`; modular movable features remain separate; portrait readability matters.
- `art-library/APPROVALS.md`: Jaska cut-in and Toko paper rig approved; Aatami front/side and Arvo cut-ins semi-approved.
- `ROADMAP.md`: Act I gameplay and device validation take priority; no new character-art pipeline or promotion before gates.
- PR #108 (`art/aatami-concept-brief`): the **three initial outfit explorations A/B/C are superseded**. Selected source set = young final + seven young supporting studies + older final. Extra older study is excluded. These are source selections, *not* production-ready rigs.

## Candidate evidence to review

| Pair | Aatami view | Evidence | What is tested / not tested |
|---|---|---|---|
| Jaska / Scene Club | Front (support 06) | Draft PR #133, actual candidate GIF | 7 s motion context; no mouth visemes, no physical-device acceptance |
| Jaska / Scene Club | Side (young final) | Draft PR #133, actual candidate GIF | Two-speaker composition; no mouth visemes, no physical-device acceptance |
| Toko / shop | Front (support 06) | Draft PR #134, actual candidate GIF + stills | Landscape and portrait still framing; Toko held static in GIF |
| Toko / shop | Side (young final) | Draft PR #134, actual candidate GIF + stills | Same limitation; no real dialogue encounter changes |

The reproducible `review_aatami_motion.py` audit records frame dimensions, 70 frames/10 fps, source hashes and visible change. It **does not** prove lip movement, correct bubble aim, expression quality or real-device legibility.

## Missing-art priority / production boundary

| Need | Current evidence | Next gate |
|---|---|---|
| Aatami animated speaking mouth | Head, torso, eyelids; *no jaw or viseme layer* in existing front/side rigs | Explicit owner permission for source-layer extraction, then isolated candidates and approval |
| Older Aatami cut-in | Owner-selected older final only, in unmerged PR #108 | Review intended scenes/era and front-versus-side layout before producing pieces |
| Arvo news presentation | v05 presenter baseline and semi-approved cut-in | Owner look/animation review; diverse broadcast gestures, news-tab readability |
| Hooded woman | Random information NPC, no approved pose/cut-in | Owner pose choice before extraction |
| Speaking pair polish | Candidate GIFs/stills in #133/#134 | Check mouth-target bubble tails, overlap seams, blink, occlusion and readability on Pixel/iPad |
| Release eligibility | Source-only QC, no new encounter approval | Owner visual sign-off, device check, explicit deliberate promotion and new release validation |

## Short owner decision request

1. **Aatami source extraction:** may a *review-only* mouth/viseme prototype be cut from the approved young front/side sources (no live change)?
2. **Review verdict:** are the Aatami+Jaska and Aatami+Toko current front/side compositions acceptable as **direction only**, or do they need layout revisions?

Until answered, stay with read-only comparisons, audits and documentation. In particular, do not treat owner selection of the nine PR #108 images as approval of any mouth motion, older rig or released art.

## Validation boundary

This gate is review documentation, not new visual evidence. No claim of physical testing, animation completion, owner acceptance, or Act I percentage increase is made. Keep PR #134 draft and do not merge PR #108, #133 or #134 as part of this work.
