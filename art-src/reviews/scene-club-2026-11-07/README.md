# Scene Club — animated presentation candidate

**Review only.** No runtime file, art register, source painting, character rig, campaign rule or save integration is changed. New entrance/composition/transition work awaits owner review. Act I remains 48% under `ROADMAP.md`.

Open `/art-src/reviews/scene-club-2026-11-07/?repair=1` for the repaired candidate (without the query, the original baseline is retained) while serving the repository root. Choose **Arrive at Scene Club**, then one of the three existing encounter choices. Aatami responds, Jaska reacts, and **Back to Kallio** reviews the return transition. **Replay candidate** starts it again.

The visual sequence is:

1. The existing Kallio map, captured from the game in an isolated test context.
2. A short crossfade into the existing painted Scene Club. Aatami's existing front rig eases into a waist-up approach pose. This is an arrival cue, **not a new full-body walk cycle**.
3. Approved Jaska cut-in, using the shared talk clip and returning to shared idle/blink after that one-shot ends.
4. All three authored `enc-jaska-receipt` choices, with their exact forecasts visible before commitment.
5. Aatami's existing front rig says the choice label with the shared talk/head/blink clip. Jaska's existing nod or shake accompanies the authored forecast.
6. A crossfade to the captured map. The forecast remains visible as a review of the consequence strip.

The candidate intentionally does **not** apply or save the choice. The actual runtime choice/receipt integration remains the gameplay branch's responsibility. This particular authored encounter has no combat-triggering effect; no fight has been added to it.

## Source and approval boundaries

| Used source | Status retained |
|---|---|
| `cutin-jaska-rig-v01`, cut from `jaska-concept-v03.jpg` | Approved rig; new presentation remains a candidate. |
| `cutin-aatami-front-rig-v01`, cut from owner-committed study 06 | Semi-approved rig, owner review pending. One speaker at a time uses the near-camera front pose. |
| `scene-scene-club-v01` / `scene-club-v04.png` | Semi-approved, prototype-only plate. Its appearance here is not final-art approval. |
| `scene-toko-rig-v01` | Approved construction/motion reference only; no Toko pixel or identity is copied into the scene. |

Aatami's side rig is available and inventoried; it is reserved for a future two-speaker composition as directed by the owner. No generated image, replacement face, fresh costume, invented room or new art pipeline was needed. The shared `drawFigure`, `drawCutin`, `pose` and `REST` APIs in `web/js/v3/cutin-stage.js` draw the original registered pieces. Existing character clips retain the 10fps held-paper rhythm.

The landscape composition is new review work: figure at left, painted room behind, a short bottom-tail kraft bubble in the center and choices at right. It avoids shrinking the whole portrait interface to an unreadable strip. The tail retains a vertical side at the bubble bottom and stops clear of the face. Portrait preserves the existing approved bubble geometry.

## Reproduce the browser evidence

```
node art-src/reviews/scene-club-2026-11-07/capture.cjs
```

The script serves the repository on an ephemeral local port, uses Playwright's matching Chromium headless shell, captures the existing map in a fresh context, and tests the review in separate fresh contexts. `BROWSER_PATH` can explicitly select another installed Chromium. No dependency is added to the game.

The script checks:

- 390×844 phone, 1280×800 desktop and 844×390 landscape;
- dialogue at least 12px, no clipped dialogue, no horizontal overflow;
- all three choices in the first viewport with at least 44px targets;
- dialogue/choice rectangles remain separate;
- completed talk returns to idle and a visible blink;
- choice → response → outcome → map return, without storage writes;
- no page errors or failed-resource responses;
- reduced motion holds the exact same rendered rest frame over time.

The generated `verification.json` records actual measurements. PNGs and `scene-club-baseline.webm` are actual browser captures. A derived MP4 may accompany the same recording for convenient playback; it does not substitute a still-image slideshow for motion.

## Measured output and a visual issue found

Final captures measure dialogue at **14.44px** on 390×844, **19px** on 1280×800, and **13px** on 844×390. All three choices fit without scrolling; measured targets are 48.33px tall, with the longer landscape choice 62.72px. Dialogue and choice rectangles do not intersect. The original WebM is **16.2 seconds** of browser-recorded animation; its MP4 is derived from that recording.

The baseline captures exposed rectangular lid bars in **both Jaska and Aatami front**, including a Jaska tab outside the face and wiped glasses. These original defects are preserved in `idle-blink-phone.png`, `aatami-full-blink-phone.png`, both face comparison images, and `scene-club-baseline.webm` / `.mp4`.

## Bounded blink repair candidate

The `?repair=1` route uses **in-memory review-only rig variants**. `blink-repair.js` samples clean skin from each same original head, intersects the patch with the face alpha and a calibrated eye-opening shape, and adds a minimal closed-eye marker inside that opening. Original head pixels, rig files, poses, source drawings and manifests remain untouched. Jaska's mask sits inside his glasses; Aatami's follows the eye angle under his original frown. The Aatami side rig is not used or assessed by this study.

- [Watch the repaired phone loop](scene-club-blink-repair.mp4) — actual recorded arrival, Jaska, Aatami response, outcome and map transition.
- [Jaska full-blink before / after](blink-full-before-after.png), or animate the paired faces in [the comparison page](blink-comparison.html).
- [Aatami front full-blink before / after](aatami-blink-full-before-after.png), or [its live comparison](blink-comparison.html?who=aatami).
- [Original baseline recording](scene-club-baseline.mp4) remains available for comparison.

Pixel checks on fixed registration confirm an unchanged rest pose and **zero changes outside the calibrated eye boxes**: 876 eye pixels change for Jaska's full closure and 628 for Aatami's. Actual held captures show Jaska's glasses and face silhouette and Aatami's brow/expression preserved, with the rectangular bars removed. The 390×844, 1280×800 and 844×390 repaired scene captures retain the passing dialogue/choice measurements. Reduced motion holds the unchanged rendered rest frame. These checks establish a bounded repair candidate, not owner approval.

Reproduce the repair comparisons, held scene blinks and actual phone video with:

```
node art-src/reviews/scene-club-2026-11-07/capture-blink-repair.cjs
```

`blink-repair-verification.json` and `blink-repair-capture.log` record the results. Calibration grids are private in `/workspace/evidence/scene-club-art-private/`; the public review folder contains final review outputs and necessary baseline comparisons, not construction grids or raw masters.

## Acceptance still open

Owner review of Aatami's front rig, the prototype room, the new arrival/landscape composition, bounded blink-mask/marker variants and return timing is required before runtime promotion. Captures use browser emulation, not a physical Pixel/iPad; device readability, touch comfort and performance acceptance remain open. The map shown here is a labelled static capture for transition review, not a replacement runtime map.

See [visual inventory](VISUAL_BACKLOG.md) for the next real gaps. Several Act I scenes need existing plate bindings/composition before additional art is commissioned.
