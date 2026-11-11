# Aatami + Toko paired cut-in — review candidate (2026-11-09)

**Status:** review tooling and automated image evidence only. No game, art-manifest, art source, approval register, or playable release changes. Stacked on [Jaska ensemble draft PR #133](https://github.com/mbace1/piritori-eden/pull/133), which itself relies on [Aatami preview PR #118](https://github.com/mbace1/piritori-eden/pull/118). The authority is `DESIGN_AUTHORITY.md`, `ART_BIBLE.md`, `art-library/APPROVALS.md` and `ROADMAP.md`.

## What exists from PR #108 (do not repeat the three initial outfits)

- The original **A/B/C cardigan / parka / corduroy** exploration was **superseded**, not finished as three separate final outfits.
- PR #108 has **nine owner-selected source concepts**: one young final, seven young studies, one older final. The extra older study is unselected. Its files are not the same as production cutouts; all nine have opaque grey backgrounds.
- Main already contains **two young cut-in rigs** from merged PR #107: front based on young support-06, and side from young final. Both remain *semi-approved*, without independent mouth/jaw/viseme layers.
- The **older Aatami** is a selected *source concept only* with no registered paper cut-in; new extraction is deferred. The older support study remains unselected.

## What this candidate tests

- Pair **Aatami front and side** (existing CUTINS) with the **owner-approved Toko Slomo paper rig**, rendered using `loadTokoStage` and its registered empty-bar plate.
- Test two different compositions: a phone **portrait** review frame and an actual **landscape canvas** (not the portrait letterbox used in the earlier Jaska pair).
- Capture idle, eyelid/blink, Aatami head/torso talk, Toko-response placeholder, nod and reduced-motion rest.
- Capture 70 exact Aatami pose frames per variant at 10 fps for a visual GIF review; Toko remains in the renderer's exact **static rest pose**, so this does **not** test Toko's animation timing.
- Separate browser-art review from a *real encounter test*: this page supplies temporary nonscripted review dialogue and bubble geometry only. Do not copy its text, layout, timing, or art into runtime without approval.

## Test and evidence

`NODE_PATH=/tmp/aatami-review-tools/node_modules node art-src/cutins/toko-pair-qc.cjs /tmp/aatami-toko-evidence`

The isolated GitHub Actions workflow `.github/workflows/aatami-toko-pair.yml` runs Chromium at **390×844** and **1440×900**, saves **24 expected stills**, renders **2×70 frames** and encodes two GIFs, then uploads the result as `aatami-toko-pair-candidate`.

The workflow's pass means resources loaded and captures exist; it **does not** mean the composition is visually approved. Inspect actual art for head/shoulder overlap, Toko mask visibility, paper/ink consistency, bubble-to-mouth aim, and edge/pivot popping before any further development. Native physical Pixel/iPad, owner design judgment, Aatami lip sync, Toko animated pairing, and gameplay transitions remain **OPEN**.

## Outstanding art queue

1. **Review** actual side/front pairings with approved Jaska and Toko; inspect the full GIFs for seams, flickering, blink alignment, facial/mouth behavior and bubble clearance. Preserve all as candidates.
2. **Aatami speaking mouth**: source artwork has no isolated mouth/jaw; propose a minimal cut-layer prototype only after explicit permission. Do not fake this by claiming the current head sway is lip sync.
3. **Older Aatami**: source final exists, but no production-ready transparent extraction, cut-in, animation, device test or promotion.
4. **Arvo**: existing presenter/cut-in candidate; A–D look choice and expressive news-tab animation remain unresolved.
5. **Hooded woman**: standing pose and approved cut-in still absent.
6. Other pairings, interaction fidelity, physical devices and owner acceptance remain separate gates.

`ROADMAP.md` currently reports Act I **50%** (producer estimate, 2026-11-08), and prioritizes playable chapter/combat work. This review must not create a competing production pipeline or silently advance the chapter percentage.

**Do not merge or deploy this draft as an art approval.**
