# Aatami dialogue motion — review candidate evidence (2026-11-07)

**Not approved art, not a runtime promotion, not a merged release.** This note belongs to PR #108's concept/source review; the actual browser review tooling is isolated in the separate draft [PR #118](https://github.com/mbace1/piritori-eden/pull/118).

## Source and original three concepts

- The original A/B/C exploration (cardigan / parka / corduroy) was **superseded**, not three delivered final designs. Do not commission or claim those three as finished.
- The corrected [PR #108](https://github.com/mbace1/piritori-eden/pull/108) selection is **nine individual candidate PNGs**: young final, seven young supporting studies, older final. The extra older study remains **unselected**.
- The two young dialogue rigs already exist on **main** from merged PR #107: front from young support-06 and side from young final. Both remain **semi-approved** in `art-library/APPROVALS.md`; PR #108's pre-merge source branch must not copy, rebuild or claim to promote them.
- The older final has **no existing approved cut-in or rig**. The roadmap defers new character-production pipelines until G4.

## Verified new deliverable: existing-rig motion preview

Draft PR #118 now includes a deterministic browser-to-GIF evidence pass for **both** existing young rigs, from the actual `web/js/v3/cutin-stage.js` poses and `art/v3/manifest.json` layers. It does not generate, replace or register character art.

- Workflow source commit: [`9bb4bd76a27e269fb0d8bdd096dd99661c7cb58e`](https://github.com/mbace1/piritori-eden/commit/9bb4bd76a27e269fb0d8bdd096dd99661c7cb58e).
- Verified [GitHub Actions run **42361560092**](https://github.com/mbace1/piritori-eden/actions/runs/42361560092): **completed, success**, on 2026-11-07.
- Artifact: **aatami-cutins-review-evidence**, ID **13569648226**, [download](https://github.com/mbace1/piritori-eden/actions/runs/42361560092/artifacts/13569648226), expires **2026-11-14**. Workflow uploads **two 390×844 looping GIFs**, 10 fps, 116 frames/11.6 seconds each (idle → talk → nod → shake), **24** still browser captures at simulated 390×844 phone and 1440×900 desktop viewports, exact source commit, static/motion manifests and read-only HTML index.
- The workflow verified all 24 PNG viewport/header checks and both GIF headers/sizes and sampled non-identical frames. After downloading the ZIP, independently opened both GIFs and checked 390×844, 116 frames and 11,600 ms duration for each.
- Inspected actual front and side idle/blink screen captures and sampled 10 frames per GIF across idle/talk/nod/shake. Source identities, wardrobe, card framing and blink coverage remain visible; no conspicuous missing cut-in layer in these samples. This **does not** prove no subtle head/neck seam pop or edge halo across all 232 frames.

### What is and is not animated

- **Present in the reused rigs:** subtle idle torso breathing/sway, blinking from existing eyelid cards, small head shifts during the speech *clip*, nod and shake. The GIFs expose these actual existing code clips for review, not newly approved performance animation.
- **Missing for convincing facial speech:** young Aatami's manifest rigs contain only torso, head and eyelids (front has 2 lids; side has 1). There is **no separate jaw/mouth/viseme layer**; `PERSON.talk` does not change `jaw`. Consequently the talk clip changes pose/dialogue but the **mouth is static**. Do not claim lip sync or full talking animation.
- **Not yet tested:** paired Aatami + Jaska or Toko Slomo scene placement; true responsive landscape two-speaker composition; longer/localized dialogue; full motion-by-motion seam/alpha-fringe and speech-bubble tail QC; physical Pixel/iPad; game flow/UX; owner sign-off. Desktop sample is a letterboxed portrait review canvas, not native desktop/landscape gameplay.

## Next permitted step

Review the two existing GIFs with the owner, then capture **Aatami plus Jaska**, **Aatami plus Toko Slomo** and (candidate comparison only) **Arvo** using existing approved/semi-approved sources in a **review-only** stage. Inspect shoulder and head scale, bubble-to-mouth aim, occlusion and actual scene readability in both orientations. If true speaking mouth animation is wanted, first propose a small source-driven cut-layer prototype for explicit owner review; no new production-mouth extraction or runtime registration is authorized by this test alone.

## Separate remaining asset gates

Older Aatami cut-in; Arvo's A–D look and hooded woman's pose; genuine device and owner approval of the two existing young rigs. Old A/B/C outfit finals remain superseded, not missing work to restart.

**No merge, runtime manifest change, approval-status upgrade, new source art, mesh generation, or public build change occurred.** Authority: `ROADMAP.md`, `DESIGN_AUTHORITY.md`, `ART_BIBLE.md`, `art-library/APPROVALS.md`.
