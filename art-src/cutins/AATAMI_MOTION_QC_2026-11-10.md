# Aatami source-motion QC — 10 November 2026 (approval candidates only)

**No runtime/art promotion.** This is a source-evidence audit of the existing young Aatami cut-ins paired with Jaska (draft PR #133) and Toko (draft PR #134). It does not create new Aatami art, decide a look, or modify the game. Source authority: `DESIGN_AUTHORITY.md`, `ART_BIBLE.md`, `art-library/APPROVALS.md`, `ROADMAP.md`, and Aatami's [concept PR #108](https://github.com/mbace1/piritori-eden/pull/108).

## A/B/C clarification

The three initial outfit alternatives (cardigan / parka / corduroy) were **superseded**, not a backlog of three missing final concepts. PR #108 holds the owner's **nine selected sources**: young final (olive cardigan), seven young supporting images (01–07), and older final. The extra older study is excluded from the nine. These are **concept/source images**, not nine independently approved runtime rigs.

The shipped-source main branch already has two *semi-approved* young cut-in rigs from PR #107: **front (support-06)** for one-at-a-time conversation and **side (young final)** for two speakers on screen. Jaska's cut-in and Toko's paper rig are approved; that approval does **not** transfer to Aatami.

## What was checked

Used the previously generated, locally available **actual review GIFs** from PRs #133 and #134, not recreated character illustrations. Ran `art-src/cutins/review_aatami_motion.py` to verify that each GIF is 390×844, 70 frames at 100 ms/frame (7 seconds), with detectable frame changes; made a six-timepoint filmstrip and machine-readable hashes. The code runs again inside PR #134's isolated GitHub workflow on its two Aatami+Toko candidate GIFs, and its contact PNG/JSON are uploaded as artifact evidence.

| Context | Aatami variant | Distinct rendered frames / 70 | SHA256 (review GIF) |
|---|---|---:|---|
| Scene Club with Jaska | Front | 70 | `361f7042a4b1aafe308c28d0c37feda8a33280437e79e0d50e9b85129d920cec` |
| Scene Club with Jaska | Side | 70 | `d663e7027927b4df772a5756d14dc9454da6b5bc581ed29b15e5e40ea5719146` |
| Toko shop | Front | 64 | `148445f325b71469bbf31e2c12a408c26b692f3a06fef7789a4cadcd60201941` |
| Toko shop | Side | 64 | `022877c7c26dc0e0143213cfab3d869e2f81888942130473231345d99b7205f6` |

These are **file integrity and source-frame variation** checks, **not an owner gameplay/visual acceptance score**. The Toko paired GIFs hold Toko in a static rest pose, so they do not test Toko's approved animation clips. The Jaska paired page is a portrait review composition; the Toko candidate also has native landscape stills, but the four GIFs are portrait.

## Art-production findings and boundaries

1. **Aatami speaking mouth still missing.** The registered front and side cut-in rigs have head, torso, eyelid pieces; neither has a separate jaw/mouth/viseme layer. `PERSON.talk` animates head/torso poses, not phonemes. The GIFs must not be advertised as lip-sync. A source cut-layer/viseme prototype needs distinct owner permission, per PR #134's recorded gate.
2. **Older Aatami cut-in is absent.** Selected older final source exists on PR #108; no isolated transparent pieces, pivots, idle/talk clips, physical-device check or owner approval for an older cut-in.
3. **Arvo:** an existing semi-approved paper cut-in rig is registered, and a v05 presenter concept exists, but look choice/final expressive news pass and owner sign-off remain open. Arvo's rig has a jaw; that does not mean Aatami has one.
4. **Hooded woman:** background NPC design/pose selection and approved cut-in are still missing.
5. **Pairing quality:** review bubble-tail aim, face/shoulder seams, blink alignment, visual balance and whether text blocks decisions. Source GIF integrity does not close these quality gates.
6. **Runtime/device:** real encounters, physical Pixel and iPad, reduced-motion accessibility and approval remain open. No merges, source art replacement, manifest edits or release.

## Next permitted action

Use this filmstrip plus the [PR #133](https://github.com/mbace1/piritori-eden/pull/133) and [PR #134](https://github.com/mbace1/piritori-eden/pull/134) actual GIFs for **owner visual review**. Request an explicit decision about Aatami mouth extraction before creating a new jaw/viseme layer; otherwise continue source-only inspection and UI tests. The core Act I roadmap retains priority and remains **50% (8 November estimate)**; this review does not advance it.

To reproduce after downloading the two review artifacts:

```bash
python3 -m pip install Pillow
python3 art-src/cutins/review_aatami_motion.py --out /tmp/aatami-review \
  --pair Jaska /path/to/aatami-jaska-ensemble.gif /path/to/aatami-side-jaska-ensemble.gif \
  --pair Toko /path/to/aatami-toko-pair.gif /path/to/aatami-side-toko-pair.gif
```
