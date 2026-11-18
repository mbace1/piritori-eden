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


## 2026-11-17 — ensemble review status and current production boundary

This update records the later review-only pairing work. It does not convert any candidate capture into visual approval or a production asset.

### Verified source branch and CI

- PR #108 head: `447d8d97df615b61d5314452fe79492b6bb7135a`; open, not merged. Its dedicated [nine-source QC run](https://github.com/mbace1/piritori-eden/actions/runs/43844667372) and repository [gates run](https://github.com/mbace1/piritori-eden/actions/runs/43844667360) both completed successfully on 2026-11-16. The nine-source artifact is [available until 2026-11-30](https://github.com/mbace1/piritori-eden/actions/runs/43844667372/artifacts/14214218743).
- PR #118 remains draft/unmerged. Its existing-rig browser review route is tooling only; the earlier motion evidence artifact expired 2026-11-14.
- PR #133 (Aatami + Jaska) remains draft/unmerged. Its candidate-evidence workflow [run 42468302616 succeeded](https://github.com/mbace1/piritori-eden/actions/runs/42468302616); the artifact is no longer listed. Its separate gates run failed: the Godot download was not a valid ZIP, and mission-browser reported a failed request for an existing character WebP. These are not failures of the candidate-render job.
- PR #134 (Aatami + Toko) remains draft/unmerged. Candidate workflow [run 42994073470 succeeded](https://github.com/mbace1/piritori-eden/actions/runs/42994073470), with [candidate artifact 13843146760 available until 2026-11-18](https://github.com/mbace1/piritori-eden/actions/runs/42994073470/artifacts/13843146760). Its separate repository gates run 42994073220 also succeeded. Toko is held in its approved rest pose; this is not a Toko-motion test.
- PR #136 (Aatami + Arvo) remains draft/unmerged. Candidate workflow [run 43187485770 succeeded](https://github.com/mbace1/piritori-eden/actions/runs/43187485770), with [candidate artifact 13928578847 available until 2026-11-19](https://github.com/mbace1/piritori-eden/actions/runs/43187485770/artifacts/13928578847). Its separate repository gates run 43187485753 failed in mission-browser on requests for existing character WebPs. The candidate-render job itself passed. Arvo remains a comparison source, not an approved news-tab composition.

### Pairing coverage now available

| Pair | Candidate evidence | Limits still open |
|---|---|---|
| Aatami + Jaska | Draft #133: 28 viewport stills and two 70-frame GIFs were produced by a successful candidate workflow | Artifact no longer listed; desktop capture is letterboxed portrait, not native responsive landscape; no physical device or owner acceptance |
| Aatami + Toko | Draft #134: 24 stills and two 70-frame Aatami-motion GIFs; portrait and native-landscape review captures | Toko is static; placeholder dialogue/bubble; no Aatami mouth motion, physical device or owner acceptance |
| Aatami + Arvo | Draft #136: 56 native-resolution still candidates and two 70-frame Aatami-motion GIFs | Neutral comparison cards, not the real news-tab UI; Arvo's final look remains unselected; no Aatami mouth motion, physical device or owner acceptance |

Workflow success means the capture jobs completed and their scripted checks passed. It is not a human visual verdict. No claim is made here that every captured frame has been independently inspected or that the pairings are approved.

### Current art inventory and decisions

- **Original A/B/C outfit concepts (cardigan / parka / corduroy): superseded.** They are not three unfinished final designs and should not be restarted. The current selected source set remains one young final, seven young supporting studies and one older final.
- **Young Aatami:** the two existing front/side rigs are already on `main` from merged PR #107 and remain semi-approved. Their torso/head/eyelid layers support idle, blink and body/head gesture clips; there is no separate jaw, mouth or viseme layer, so the mouth stays static during the talk clip.
- **Older Aatami:** selected source concept only; no cut-in or rig. The extra older support image remains excluded.
- **Arvo:** presenter model v05 is the broadcast baseline; the cut-in rig is semi-approved. The A–D look choice and final expressive news-tab presentation/animation remain open.
- **Hooded woman:** the owner-selected standing pose and cut-in remain open.

### Next permitted step

The existing-rig pairing comparisons are now present as draft review candidates. The next action is **owner visual review of the actual candidate artifacts**, followed by physical Pixel/iPad checks for the existing young Aatami rigs and any pairing the owner wants to keep exploring. The #134 and #136 artifacts are time-limited (see links above).

The current ROADMAP (8 November) still has G4 awaiting the owner's €400/finale decisions and a full ten-day owner playthrough; its Codex lane says art is coordinated rather than built here, and new character production remains deferred until G4. Therefore this update does **not** authorize mouth-layer extraction, older-Aatami cut-in production, new Arvo art, hooded-woman extraction, runtime registration or any promotion. A separate explicit owner authorization or the roadmap gate is required first.

**No source image, rig, manifest, approval register, gameplay file or public build was changed by this update. All pairings and images remain approval candidates.**


## 2026-11-18 — independent visual inspection of the Aatami + Arvo candidate artifact

This is a source-only reviewer observation of the existing PR #136 artifact, not an owner verdict, approval, or device test.

### Current PR #108 status correction

The current PR #108 head is `44b2a87f091dd435aa09521b6f1d6622b4edd598` (open, not merged). Its dedicated nine-source QC run **44055157077** and repository gates run **44055159812** both completed successfully at that head. This supersedes the older `447d8d9` head reference above. The nine-image source selection and exclusion rules are unchanged.

### Artifact inspected

- PR #136 head: `d08025e32c6f1e3e07a16b148e30ea0e9c6d7246` (draft, unmerged).
- Candidate artifact: [aatami-arvo-review-candidate, ID 13928578847](https://github.com/mbace1/piritori-eden/actions/runs/43187485770/artifacts/13928578847), available through 2026-11-19.
- Artifact source commit recorded by its manifest: GitHub's synthetic PR merge ref `d13cf13f1ddee998f6acfa2f17cbf23ac3e63bb8`; the PR head remains `d08025e`.
- Manifest: 56 PNG stills (28 at 390×844 portrait, 28 at 1440×900 landscape), using dark and kraft backing, plus two 390×844 GIFs.
- Both GIFs were checked locally: 70 frames, 100 ms per frame, 7 seconds, 70 distinct frame images each. All 56 manifest paths exist and match their declared dimensions.

### Visual observations from the actual captures

- Portrait places Aatami above Arvo in separate waist-up cards. At 390×844 both identities and wardrobe read; the cards remain separated. Landscape uses a genuinely side-by-side comparison at 1440×900 and gives both figures more room.
- Dark and kraft backing make the ink and paper-edge contrast easier to compare. No obvious missing head/torso piece or gross crop loss was visible in the inspected stills.
- The sampled front and side GIF frames show Aatami's existing head/torso gesture and blink motion. **His mouth remains static** through the Aatami-talk segment; this is not lip-sync.
- Arvo's existing read/gesture clips visibly include jaw movement. That does not settle Arvo's final look or the news-tab composition.
- Aatami's denser, sketchier marker line and Arvo's cleaner, more graphic rendering are visibly different. Treat that as an owner art-direction choice, not an automatic defect.
- The comparison uses labelled neutral cards, not dialogue bubbles, a real encounter, or Arvo's news UI. It cannot prove bubble-tail aim, story readability, actual game-flow behaviour, or physical-device performance.
- This was a visual inspection of representative stills and sampled motion frames, not a frame-by-frame alpha/seam certification. No Pixel or iPad was available for physical testing.

### Current missing-art and approval gates

| Item | Verified state | Still needed |
|---|---|---|
| Original A/B/C outfits | Superseded; not three unfinished finals | Do not restart without a new owner request |
| Young Aatami source selection | Nine selected opaque concept PNGs on PR #108; 0/9 have alpha | Keep as source concepts; extraction is a separate gate |
| Young Aatami front/side cut-ins | Existing on main from PR #107; semi-approved | Owner visual sign-off, edge/seam/bubble review and physical device check |
| Aatami speech | Existing head/torso/eyelids only; no jaw/mouth/viseme layer | Explicit authorization and a separately reviewed prototype; no extraction or promotion yet |
| Older Aatami | One owner-selected older concept final; no cut-in/rig | Deferred until G4 or explicit owner authorization |
| Arvo | Presenter v05 is approved broadcast baseline; cut-in v01 is semi-approved | Owner A–D look choice and actual news-tab layout/expressive presentation |
| Hooded woman | No owner-selected standing pose/cut-in | Owner pose selection before production |

### Disposition and next permitted step

The existing Aatami + Jaska, + Toko and + Arvo comparisons constitute the authorized review-only ensemble test lane. The next action is the owner's visual decision on those actual candidates, then physical Pixel/iPad checks for the existing young Aatami rigs and any pairing selected to continue. The #133 artifact is no longer listed; #134's artifact is no longer listed; #136's artifact above is time-limited.

The current ROADMAP still defers new character production until G4. Therefore this review does **not** authorize mouth-layer extraction, older-Aatami production, new Arvo artwork, hooded-woman extraction, manifest registration, approval-register changes, merge or runtime promotion.

**No source artwork, rig, manifest, approval status, gameplay file or public build was changed. All reviewed imagery remains an approval candidate.**
