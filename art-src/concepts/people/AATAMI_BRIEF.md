# Aatami — concept-art review (PR #108)

**Owner direction, 2026-10-24:** "Think of Kurt Cobain in the Piritori style." The original three outfit explorations (A cardigan, B parka, C corduroy) were **superseded**, not delivered as three separate final concepts. Do not resurrect them without a new request.

## Verified assets and review status (2026-10-25)

The nine PNGs below are present on this PR branch. Their Git blob SHA-1 values were cross-checked against the nine files in the delivered Aatami package. **Committed does not mean runtime-approved.**

| File stem | Contents | Status |
|---|---|---|
| `aatami-young-final-v01` | Young Aatami (2003): olive cardigan, striped shirt, dark jeans, shoulder bag, camera-right look | **Owner-selected concept final**; source art only |
| `aatami-young-support-01` … `04` | Four young studies; 02 shows a cigarette | Supporting concept references |
| `aatami-young-support-05` | **Two young poses in one PNG**, not an individual single-pose image | Supporting sheet; split/extract for one-pose-per-file delivery |
| `aatami-young-support-06` | Young front-facing study | Supporting concept reference |
| `aatami-older-final-v01` | Older Aatami: heavier, moustache, beige sports coat | **Owner-selected concept final**; source art only |
| `aatami-older-support-01` | An additional older Aatami study, originally packaged as `young-support-07` | **Not selected or approved by owner.** Retain only as a clearly marked review candidate; do not promote |

### Outstanding correction

The owner's requested selection is **one young final + seven individual young supporting images + one older final**. The current branch instead contains **one young final + six young supporting PNGs (one with two poses) + one older final + one unapproved older supporting PNG**. The extra older study does **not** count as the seventh young support. Deliver a separate seventh young single-pose support PNG, preferably by cleanly extracting one of the two poses in support-05 with the original preserved, and remove/exclude the extra older study from the approved-selection handoff. **Do not represent this nine-file set as fully matching the owner's requested breakdown.**

### Production boundary

These are review/source illustrations. Per `DESIGN_AUTHORITY.md` (2026-10-02 and 2026-10-23), neutral stand-ins remain the default for playable characters; paper/motion-graphic cut-ins require explicit asset-specific approval and device-readability checks. A reference from PR #107 to a young-Aatami cut-in does not itself approve this PR's files for runtime use. Do not modify runtime manifests, ship the unapproved older study, or merge this PR as an art-approval action.

## Character canon

From `NARRATIVE.md`: Era I protagonist, early thirties, Kallio, Helsinki, 2003. He arrives at Piritori with cash, debt, one small bag and one known route; his brother is Jaska. The grunge-era reference is an homage, not a likeness. Use `ART_BIBLE.md`'s `cut-cardstock-hand-ink-v03` style and `art-library/APPROVALS.md` as the approval register.

Exact generation prompts were not supplied with the images; the adjacent `.txt` provenance files should not invent them.
