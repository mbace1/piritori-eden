# C.15 — Night Places

Owner direction: the park is boring; explore different arenas, use Dream Loop,
return to concept 02's restrained UI, improve lighting and test cameras.

## Scope

The default Night Shift scenery is now **Porttikongi / rain courtyard**.
Preparation also offers **Linjat / service yard** and the previous park. These
are separate static scene assemblies with the same C.12 mission rules and save.
Changing scenery is a visual pilot selection, not travel or a market reroll.
No campaign site binding, NPC availability, chapter, reward or price is invented.

Sources: GDD owner places ruling and §6.5; scenario atlas Courtyard Receipts,
McCormick yard and Jade front; Art Bible painted-night environments / cut-card
interactive layers. The unresolved courtyard/Jaska binding is still unresolved.
The Linjat setting is a fictional 2003 service yard, not a later real venue.

## Assets and rendering

`tools/blender/build_kallio_courtyard.py` generates twelve reusable motifs in
Blender 5.2.1: facade bay, open archway, balcony, service bay, container, low wall,
lamp, bicycle, rack, drain, pallets and vent. Export is metres / Y-up / +Z front.
The whole kit is 20,428 triangles and 1,431,032 bytes; engine placement shares
geometry/materials with instancing. It is prototype scenery, not accepted art.

Two image-generated 1254px source albedos (runtime uploads capped at 1024px) accompany it. Total new downloaded
kit + textures: 6,974,837 bytes. `web/crew-run/assets/kallio-kit-v01.manifest.json`
pins exact bytes/hashes. The loader verifies both before use. No Meshy jobs or
character promotions. F01/F02 remain at their existing gates; stand-ins remain.

The first broad beige light treatment failed visual review. The final candidate
uses cooler fill, localized warm spots, a dark painted-sett floor and a **128px
static scenery cubemap**, captured only at load/context restore and filtered to
a shared PMREM probe. This is actual static stage reflection data, not a live
planar mirror. No character reflection or every-frame reflection pass is claimed.
One practical casts a shadow on desktop. Mobile retains the existing no-shadow,
30fps, 650,000-pixel conservative profile. Real-device performance remains open.

## Interface and cameras

One selected person, shallow action strip, persistent complete enemy plans.
Crew drawer replaces the always-visible roster. VIEW exposes three genuinely
different projections: Tactical, Oblique, Overhead, plus orbit/zoom/focus/FIT.
The camera changes no action, ammo, RNG or mission state. Gun inspection retains
its forecast, confirmation, cancellation and exact overview return. Selection
now persists when the page reloads. All visible command targets remain >=44px.
Long forecasts and intent remain scrollable rather than being dropped.

## Validation and limits

Local full outing passes: desktop, phone portrait, phone landscape, tablet;
rescue, individual extraction, reload, context recovery, one-time aftermath,
next outing, gear and healing. Gun checks cover actual projection, unchanged
forecast, Escape/controller cancellation, manual interruption, reduced motion,
context restore and one-shot resource consumption. Scene/camera suite exercises
3 locations × 3 presets × 4 layouts, including legal-board framing, actual
hit tests, preserved save and no browser errors. Final packaged checks are
recorded in the release receipt, not inferred from local source tests.

The independent private visual reviews progressed 4.3 → 5.5 → 6.1/10. The
last review still found a significant material/window-detail gap; this delivery
is an experimental new-arena build, not a completed Dream Loop parity result.

Physical Pixel 10 Pro and iPad M2, final character rigs, concept parity and
campaign integration remain open. New architecture creates useful variation;
it does not establish target fidelity. Next visual work: window recess/interior
variation, stronger authored material wear and camera-specific perimeter framing.

## Reproduce and extend

```powershell
blender --background --python tools/blender/build_kallio_courtyard.py -- web/crew-run/assets/kallio-kit-v01.glb
node web/test/night-places-browser.cjs
node web/test/crew-run-browser.cjs
node web/test/gun-aim-camera.cjs
```

Blender rebuild updates the motif report and manifest using the existing texture
files. Do not regenerate texture art for routine rebuilds. Private target and
rejected iterations remain in ignored `.dream-loop/` and local `.private/`.
See [GitHub resource assessment](C15_GITHUB_RESOURCES.md). Release/deployment
evidence is recorded separately in `C15_RELEASE.json` after public verification.
