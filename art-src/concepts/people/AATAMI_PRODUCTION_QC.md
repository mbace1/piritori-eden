# Aatami source-art QC and next production gate — 2026-10-28

This is a **read-only production handoff**, not a new approval. The owner's
selected PR #108 set is one young final, seven individual young studies and
one older final. A/B/C (cardigan/parka/corduroy) were superseded, not completed
as three separate final designs. The extra older study is **not selected**.

## Verified source inventory

Checked the nine corrected review PNGs against the GitHub PR branch's exact
Git blob SHA-1s and dimensions on 2026-10-28. The two young crops are individual
570 × 1374 source images; their original two-pose sheet remains provenance only.

Run the reproducible read-only check:

    python3 tools/art/audit_aatami_candidates.py

Or pass the previously delivered review package with \`--zip PATH\`. The script
requires only Python's standard library and makes **no changes**.

**Result:** 9/9 exact source matches, 0/9 with an alpha channel. All nine are
opaque RGB PNGs with a grey backdrop. That is acceptable for concept review
but **not** a transparent, separated, production-ready cutout. No source image
should be silently treated as a ready-to-animate layer.

## Do not duplicate work from PR #107

[PR #107](https://github.com/mbace1/piritori-eden/pull/107) was merged and
already includes **two Aatami waist-up paper-rig sources and derivatives**:

- \`art-src/cutins/aatami/rig.src.json\` uses \`aatami-young-final-v01.png\`
  (side/three-quarter source), with extracted torso, head and eyelid.
- \`art-src/cutins/aatami-front/rig.src.json\` uses
  \`aatami-young-support-06.png\`, with torso, head and two eyelids.

Those existing cut-ins have a **separate** review and implementation history.
Their presence does not promote all PR #108 art, approve older Aatami, or
establish phone/desktop acceptance for any new cut-in.

## Remaining art-production work, in order

1. **Concept review boundary:** keep nine selected source images distinct from
   the unselected older study. Do not request the old A/B/C set again.
2. **Reuse and inspect the two existing young cut-ins:** inspect head/torso
   joins, eye closure, shoulder silhouette and dialogue bubble clearance in
   portrait and landscape; record actual device evidence before declaring
   acceptance. Avoid a redundant extraction pass.
3. **Older Aatami is only a concept final:** there is no older Aatami cut-in
   in PR #108 or the inspected PR #107 rig set. A proposed waist-up extraction
   must be a separately labelled review candidate, with explicit approval
   before promotion. Do not modify runtime manifests.
4. **Production layer and device gate:** if further production is approved,
   isolate the character from the grey backdrop, preserve original ink edges,
   use hidden pivots and overlap fills, then validate actual Pixel/iPad and
   desktop readability. Review at real output scale, not just thumbnails.
5. **Other pending cut-in decisions (separate from Aatami):** PR #107 leaves
   Arvo's A–D look and the hooded woman's standing pose awaiting owner review.

Authority: \`DESIGN_AUTHORITY.md\`, \`ART_BIBLE.md\` §§9, 14, 18–19,
\`art-library/APPROVALS.md\`, and \`AATAMI_BRIEF.md\`. Stand-ins remain the
default where explicit promotion has not occurred.

**No gameplay changes, art promotion, approval-register changes or merge.**
