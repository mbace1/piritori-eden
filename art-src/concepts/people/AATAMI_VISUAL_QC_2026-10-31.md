# Aatami — independent source-image visual QC (2026-10-31)

**Review only. Not an art approval, production pass, or runtime promotion.** Applies to PR #108's nine selected Aatami PNGs; the extra older study and original two-pose sheet remain outside the nine-image selection.

## Evidence and limits

- Reopened the previously delivered `aatami_pr108_corrected_candidates.zip` and checked **all nine** PNGs against the fixed Git blob SHA-1 and dimensions in `tools/art/audit_aatami_candidates.py`. Result: **9/9 hash matches, 9/9 dimension matches; 0/9 alpha channels** (all opaque RGB). These checks were performed locally on the delivered package; no CI run or fresh browser/device test is claimed.
- Generated and visually inspected a 3×3 contact sheet of the nine selected PNGs, using the ZIP's original image bytes. This sheet is a local inspection artifact, **not** a committed production asset. All nine are legible as full-body character studies at contact-sheet size, but this is not a mobile UI, animation or dialogue-bubble test.
- PR #108's current head at inspection: `0d6c488ed0f20df4d16c59e0973faaae5c3d168c`; PR #118's draft review-page fix is at `7578a05d800c62f90318723733045b2d07036f91`. Neither was merged during this review.

## Visual observations (source illustrations only)

| Selection | Observation | Next check |
|---|---|---|
| Young final | Side/three-quarter pose, olive cardigan, striped shirt, dark trousers and shoulder bag; coherent identity with studies | Use the existing **side** rig for two-speaker layouts only; verify mouth/bubble and edge masks |
| Young supports 01–04 | Same costume/identity, mostly subtle posture and angle differences; limited expression spread | Treat as supporting references, not distinct production variants |
| Young support 05 | Single rightward-looking pose extracted from the original two-pose sheet | Inspect crop edge/shoulder continuity if used |
| Young support 06 | Near-camera/front-facing pose, consistent costume | Existing **front** rig source; inspect eyelid cards, seam and speech-bubble clearance |
| Young support 07 | Single hand-behind-neck pose from the same sheet; useful alternate gesture | Candidate reference only; no animation clip inferred |
| Older final | Clearly older, heavier build, moustache, beige sports coat; distinct silhouette | Older cut-in remains **unbuilt and unapproved for production** |

All nine images have a uniform grey background. The sources cannot be used as transparent cut-paper layers without deliberate extraction and edge QC. Visual consistency at contact-sheet scale does **not** establish an acceptable facial animation, clean cutout or phone readability.

## Next permitted gate

1. Reuse PR #107's two **existing** young cut-ins, rather than generating duplicate layers. PR #118 makes the side variant selectable in the review page; its change is still **draft/unmerged**.
2. Capture actual front and side cut-in clips at phone portrait and desktop landscape; check head/torso joins, eyes, bubble tail and text clearance, grey fringing, rest pose and reduced-motion fallback. Record viewport/device, screenshots and outcome.
3. Seek explicit owner acceptance for each cut-in separately. Keep the extra older study excluded, and do not create the older cut-in until the Act I roadmap permits new character production.

**Authority:** `DESIGN_AUTHORITY.md`, `ART_BIBLE.md`, `ROADMAP.md` §3, `art-library/APPROVALS.md`, `AATAMI_BRIEF.md`, `AATAMI_PRODUCTION_QC.md`. Original A/B/C outfit concepts were superseded, not completed as three separate final designs. No approval register, runtime manifest, playable build or other art was changed by this review.
