# Scene Club — visual restart

Owner direction, 8 November 2026: keep Jaska, young Aatami and Toko paper
artwork; replace the old UI and modular cast library. This is a fresh,
playable presentation candidate based on main
`12d5486efed24d9f66d21716f605d387bfbfe4e6` / **v4.98**.

Open `/art-src/restarts/scene-club/` with the repository served over HTTP.
The initial map leads into Scene Club. Both characters remain in the room;
the three authored decisions use the actual campaign engine. Their effects
persist across reload, and the real clock advances when returning to Kallio.
The next lead is Harju; Aatami remains physically at Mäkelänsilta.

Actual browser recordings:

- [Phone, 390×844](evidence/visual-restart-phone.mp4) — 13.36 seconds.
- [Landscape, 844×390](evidence/visual-restart-landscape.mp4) — 13.44 seconds.

Both show arrival, the paired Scene Club decision, Aatami's response, the
remembered consequence on the map, and the source-aligned Toko comparison.
The WebM originals are included beside the MP4 files.

## Current sources

| Source | Retained register ID | Status |
|---|---|---|
| Jaska concept v03 | `cutin-jaska-rig-v01` | Approved |
| Young Aatami study 06 | `cutin-aatami-front-rig-v01` | Selected source; rig semi-approved |
| Young Aatami final | `cutin-aatami-rig-v01` | Selected source; rig semi-approved |
| Toko v02 painting | `scene-toko-rig-v01` | Approved paper artwork |
| Scene Club / empty noodle bar | `scene-scene-club-v01`, `scene-toko-noodles-empty-v01` | Existing semi-approved scene plates |

The interface uses fresh HTML/CSS and source-sized character canvases. Source
paintings and registered pieces are unchanged. Toko's room, body, counter
and hands share one camera; Aatami is foreground. Speaking is head/body
acting: **these sources have static mouths**, not lip sync.

The source audit includes PR #108's newer
[motion notes](https://github.com/mbace1/piritori-eden/blob/art/aatami-concept-brief/art-src/concepts/people/AATAMI_MOTION_REVIEW_2026-11-07.md)
and [ensemble plan](https://github.com/mbace1/piritori-eden/blob/art/aatami-concept-brief/art-src/concepts/people/AATAMI_ENSEMBLE_TEST_PLAN.md).
Toko Move is studied at v3.14 / `64fadf5105ba`: illustrated encounters,
clear stakes, compact decisions, transitions and visible consequences. Its
art and tram mechanics are not part of this candidate.

## Play and inspect

The small **Review** menu selects front/side Aatami, the Toko ensemble
study, and 50% presentation scale. Useful direct routes:

- `?start=scene&pose=side` — paired Scene Club.
- `?start=scene&pose=front` — alternate selected Aatami source.
- `?pair=toko&pose=front&start=scene` — counter/depth comparison.
- Add `&scale=0.5` for the requested half-size composition check.

The candidate writes only `piritori:restart:scene-club:v1`. Normal campaign,
Night Shift and outing receipt saves remain untouched. `campaign.js` calls
state v14's actual `chooseEncounter` and `advanceSchedule`; it does not
replace their rules or invent previous choices. The Toko comparison displays
two beats from its existing opening and applies no choice effects.

Scene Club's three existing choices do not trigger combat. C.19 and its
campaign bridge remain in the current game; this preview makes no claim to
have implemented another battle entry point.

## Verification

- All **34 existing web node suites** pass on this base, including campaign,
  C.19 outing, recovery and tactical checks. [Output](evidence/baseline-node.log).
- Candidate adapter: **135 checks** covering all three exact effects,
  engine-equivalent before/after states, reload, duplicate refusal, real clock
  advancement and storage isolation.
- Scene Club browser: **12 contexts**, nine choice/reload/map flows at
  390×844, 844×390 and 1280×800. Both Aatami poses, sampled motion, actual
  canvas pixels, reduced-motion rest, painted visibility, face clearance and
  six half-size compositions pass. Native choice height exceeds 49px;
  forecast text is at least 12px. Campaign/receipt sentinels are unchanged;
  legacy UI/cast resources are rejected by an explicit request allowlist.
  [Report](evidence/browser-results.json).
- Toko ensemble: **12 native contexts and 12 half-size views** cover both
  poses, three viewports, motion samples, counter alignment, source head
  clearance and both source text beats, with unchanged saves and no browser
  errors. [Report](evidence/ensemble-results.json).

```sh
node art-src/restarts/scene-club/campaign-test.mjs
node art-src/restarts/scene-club/browser.cjs
node art-src/restarts/scene-club/ensemble.cjs
```

Browser scripts self-host the checkout and require the existing Playwright
installation. Set `RESET_CAPTURE_DIR` / `RESET_ENSEMBLE_DIR` for private output;
add `--record` to the ensemble script to record both native browser views.
The existing Act I scenes CI job runs these focused checks.

This is an art/motion approval candidate, not a runtime promotion or release.
Browser evidence does not establish physical Pixel/iPad acceptance. The
roadmap estimate remains **48%**. After visual review, integrate the accepted
presentation through the campaign boundary, then continue the listed places
and cast using the corrected source direction.
