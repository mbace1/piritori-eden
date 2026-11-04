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

## 2026-11-01 — source framing of the two existing young cut-ins

**Read-only production QC; no new artwork, extraction, approval or runtime edit.** Reopened the delivered corrected nine-image ZIP and constructed a side-by-side, locally generated review board showing each full-body source with the existing `main` rig crop overlaid, plus the actual cropped RGB pixels. This board is a review artifact supplied separately, not a committed source or evidence of an animated/phone pass.

| Review view | Existing `main` source rig | Source and exact crop | Static source-framing finding |
|---|---|---|---|
| **Front (one-at-a-time dialogue)** | `art-src/cutins/aatami-front/rig.src.json` | `aatami-young-support-06.png`; source 1145×1374; crop `[310,15,760,700]` → 450×685 | Near-camera gaze is visible; hair, eyes, shoulders, cardigan and shoulder-bag strap remain in the waist-up framing. The bottom edge intentionally cuts at the hips. |
| **Side (two-speaker layout)** | `art-src/cutins/aatami/rig.src.json` | `aatami-young-final-v01.png`; source 1144×1375; crop `[330,10,800,710]` → 470×700 | Profile looks to the right, and hair, face, shoulder, cardigan and bag strap remain in the waist-up framing. The bottom edge intentionally cuts at the hips. |

**Observation:** both source crops preserve the correct character identity and intended gaze distinction. The crop pixels themselves **still carry the opaque grey source background**, as expected. Therefore the source board cannot certify transparent layer edges, head/torso seam concealment, blink cards, safe-area placement, mouth-to-bubble clearance or reduced motion in the assembled cut-in. Those must be checked on the already extracted `main` rigs at actual rendered phone/desktop sizes, not inferred from these crops.

**Current review path:** `art-src/cutins/review.html?who=aatami` on `main` for the front; `?who=aatami-side` on draft PR #118 for the side (PR #118 remains separate and unmerged as inspected on 1 November). PR #108 remains an unmerged candidate-only source-art review. Do not change `art-library/APPROVALS.md`, any runtime manifest or `main` character art based on this source framing check.

**Still missing:** owner and device/viewport evidence for both existing young rig assemblies; separately approved older-Aatami cut-in production; owner choices for Arvo's look and hooded woman's pose. New character production remains deferred by `ROADMAP.md` §3 until the Chapter 1 gate. The initial A/B/C concepts remain superseded, not delivered as independent finals.


## 2026-11-02 — existing young rig binary/registration audit

**Read-only inspection of assets already on `main`; no new extraction or runtime work.** Cross-checked the two `main` rig source configs, extracted `out/rig.json` records, `art/v3/manifest.json` entries, and each registered part's source PNG and runtime WebP via GitHub. Also compared the two rig input PNG Git blobs between `main` and PR #108.

| Existing rig | Input Git blob identical on `main` and PR #108 | Crop/canvas and exported members | Manifest approval |
|---|---|---|---|
| Front, near-camera (`aatami-front`) | support 06: `20ed3517211356d0bc17e4a0f505b9c888fa045e` | `[310,15,760,700]`, 450×685; torso, head, lid_0, lid_1 | semi-approved |
| Side, two-speaker (`aatami`) | young final: `1a2d028710a03cf26f8179bfd919e358cc14cf08` | `[330,10,800,710]`, 470×700; torso, head, lid_0 | semi-approved |

**Static metadata results:** 2/2 rig sources agree with their extraction JSON and manifest canvas sizes; all 7/7 exported member names, rectangle coordinates and defined pivots agree with the manifest. All 7/7 extracted PNG piece files exist and advertise 8-bit RGBA (PNG colour type 6) with dimensions matching the recorded boxes. All 7/7 manifest WebP files exist and have valid `RIFF/WEBP` headers. The four head/torso WebPs advertise an alpha-capable `VP8X` container with alpha flag set; the three tiny, opaque eyelid cards use ordinary `VP8 ` frames, which is not itself a defect. Manifest status has **not** been upgraded from `semi-approved`.

**What this does not prove:** This checked file presence, headers, Git blobs and JSON agreement; it did not recompute runtime WebP SHA-256 values, decode transparency pixels, composite frames, play animations or test on an actual phone/iPad/desktop viewport. RGBA headers alone do not certify clean edges or the absence of grey-source contamination. Those visual and owner gates remain open; `main` is the source of truth for these rigs, and draft [PR #118](https://github.com/mbace1/piritori-eden/pull/118) contains the separate side-preview selector. Do not promote, merge or approve this source-art PR on the basis of binary-header QC.

**Still needed:** actual in-scene front/side playback at portrait and landscape sizes, blink/seam/text/tail/grey-fringe and reduced-motion checks, plus separate owner acceptance. The older final has no approved cut-in; the extra older study remains excluded. Arvo A–D look and the hooded woman's pose await owner choices. `ROADMAP.md` §3 still blocks a new character-art pipeline until G4.

## 2026-11-03 — runtime WebP SHA-256 integrity check

**Completed: read-only byte-integrity check of the two existing young rigs on `main`.**
Fetched the seven registered `art/v3/cutins/*/*.webp` bytes from GitHub,
decoded their base64 response bodies and computed SHA-256. Every digest matched
the matching `members[].sha256` in `art/v3/manifest.json` (manifest Git blob
`f46142b946ae918a5fcce427a196c7ad34f179bd`). The SHA-256 implementation
was self-tested against the published SHA-256 digest for `abc` before use.

| Existing rig (on `main`) | Piece | Bytes | Result |
|---|---|---:|---|
| `cutin-aatami-rig-v01` (side) | torso | 31,648 | SHA-256 matches manifest |
| same | head | 14,572 | SHA-256 matches manifest |
| same | lid_0 | 80 | SHA-256 matches manifest |
| `cutin-aatami-front-rig-v01` (front) | torso | 33,684 | SHA-256 matches manifest |
| same | head | 13,726 | SHA-256 matches manifest |
| same | lid_0 | 76 | SHA-256 matches manifest |
| same | lid_1 | 76 | SHA-256 matches manifest |

**Result: 7/7 byte-for-byte registered WebPs match.** Combined with the
2026-11-02 static extraction/registration audit, no missing or mismatched
young-Aatami runtime derivative has been found. The full hash values and
file paths remain in the manifest. This is evidence about **existing** rigs on
`main`; PR #108 itself remains a source-art candidate branch and does not
contain these extracted rigs.

**What this does not prove:** the WebPs were not decoded into pixels or
animated in a browser on a device in this check. Hashes cannot establish
alpha-edge cleanliness, head/torso seam concealment, blink quality, dialogue
bubble clearance, portrait/landscape readability or reduced-motion behavior.
The current `art-src/cutins/render.cjs` also uses a fixed 1080 × 1920
review canvas, not a responsive physical-device acceptance test. A separate
draft [PR #118](https://github.com/mbace1/piritori-eden/pull/118) enables the
side pose on the review page. Neither it nor PR #108 is approved to merge.

**Next permissible step:** capture/play both assembled existing rigs in a
real browser (phone portrait and desktop landscape), inspect motion, edges,
bubble clearance and reduced motion, then ask for separate owner acceptance.
`ROADMAP.md` §3 continues to defer a **new** older-Aatami cut-in or art
pipeline until the Chapter 1/G4 gate. The unselected older study remains
excluded; original A/B/C outfit explorations remain superseded.

No artwork, existing extracted layers, manifest, approval register, gameplay
or player-facing build was modified by this QC.

## 2026-11-04 — individual cut-in layer preview and review-evidence tooling

**Read-only inspection; existing rigs remain semi-approved.** Retrieved and viewed
the seven registered `main` WebP parts of the two existing young-Aatami
cut-ins (front: torso/head/two eyelids; side: torso/head/one eyelid). The
inspected paths and SHA-256 expectations are recorded in
`art/v3/manifest.json` and the November 3 audit above.

- **Front rig:** the extracted torso retains the olive cardigan, striped
  shirt and shoulder bag; its front-facing head retains the near-camera gaze.
  Two small skin-tone eyelid cards are present.
- **Side rig:** the torso preserves the same outfit and bag; the profile head
  retains the sideways gaze. Its single small eyelid card is present.
- **No replacement asset is needed solely because the two source poses are
  different:** their use cases are intentionally distinct under
  `DESIGN_AUTHORITY.md` (one-speaker versus opposite-side two-speaker).
- **Unresolved visual issues:** individual transparent-layer previews do not
  prove the assembled head/torso seam, alpha-fringe quality, eyelid-over-eye
  placement during an actual blink, bubble-to-mouth clearance, text readability
  or motion smoothness. The preview backgrounds and extracted edges must be
  judged on the real composed frame, not from these thumbnails.

The separate, **draft and unmerged** [PR #118](https://github.com/mbace1/piritori-eden/pull/118)
now contains a review-only capture helper
(`art-src/cutins/aatami-qc.cjs`) for both already-existing poses, fixed
portrait/desktop simulated viewports and reduced-motion rest frames. Its
review page supports the rest pose without changing runtime behavior.
**The new helper was committed, not executed against a local repository
checkout or on physical devices in this run; no screenshot, CI or acceptance
claim is made.** Its images, when generated, will be review evidence only.

**Outstanding:** run the helper in a repository-backed browser, inspect the
composite screenshots/animation, then validate on an actual phone/iPad and
desktop in the playable cut-in. Record owner approval separately. The older
Aatami cut-in remains deferred under `ROADMAP.md` §3 until G4; Arvo's look
and the hooded woman's pose still need owner choices. Original A/B/C outfit
concepts remain superseded. No new art layers, manifests, approvals, runtime
files or gameplay were changed by this source-art inspection.
