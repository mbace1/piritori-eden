# Aatami ensemble review — candidate test plan (2026-11-06)

Owner direction: Aatami's current designs look good; move forward and test alongside other characters. This is **authorization to test**, not permission to promote, merge, or approve rigs.

## Source and authority
- Read `DESIGN_AUTHORITY.md`, `ART_BIBLE.md`, `art-library/APPROVALS.md`, and `ROADMAP.md` before execution.
- Aatami young front and side cut-ins remain semi-approved; older Aatami is approved source concept only, not a cut-in.
- Use existing registered cut-ins. Do not create new character art or new 3D models for this pass.
- Original three A/B/C outfit prompts were superseded by owner selection; do not restart them.

## Next review-only ensemble pass
1. **Aatami + Jaska** — compare front and side Aatami with approved Jaska cut-in in the same dialogue composition. Check relative head/torso scale, overlap, face direction, hand/shoulder cropping, bubble clearance and consistent paper/ink style.
2. **Aatami + Toko Slomo** — place Aatami's cut-in against the existing approved Toko Noodles paper-rig scene; inspect depth order, legibility, dialogue placement and visual material consistency.
3. **Aatami + Arvo** — use existing semi-approved Arvo cut-in only as a *candidate* comparison; do not treat Arvo as approved runtime art.
4. Capture portrait phone and landscape desktop/tablet review states, idle/talk/blink/reduced-motion; check at native viewport sizes and 50% presentation scale.
5. Review motion *over time* for seam pops, eyelid drift, pivot jumps, speech-bubble collisions and loop continuity. Static screenshots alone do not prove animation acceptance.
6. Record screenshots/video, exact commit and viewport dimensions, pass/fail per pairing, and device limitations. Keep results in a review-only PR or QC report. Physical Pixel/iPad acceptance remains a separate gate.

## Stop conditions
- No runtime manifest registration or production promotion of unapproved Aatami/Arvo art.
- No merges and no gameplay changes from this checklist.
- If the existing preview cannot compose two cut-ins, report that limitation and create a review-only preview fix separately.
- Defer older-Aatami cut-in production until roadmap G4 or explicit owner authorization.

## Current evidence
Browser capture workflow in draft PR #118 previously produced 24 Aatami-only screenshots. That does **not** establish multi-character compatibility. This file is a test specification, not a claim that ensemble tests passed.
