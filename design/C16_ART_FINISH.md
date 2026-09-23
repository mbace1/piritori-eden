# C.16 — Wet Courtyard art pass

Published as C.16.1 with controller, timing/recovery and cache corrections.
Source/hub checks, Pages and public gameplay are verified; read
[C161_RELEASE.json](C161_RELEASE.json). Concept parity and physical-device
acceptance remain open. The implementation notes below retain their chronology.

## Release repair — 2026-09-14

The CPU/software-rendered browser reproduced an approximately 18-second gap
before the first FPS reading: the runtime discarded 30 rendered frames. It
now excludes only the initial two frames and reports fresh sampling windows.
The wet gate waits for actual completed frames and new measurements, checks
the active reflection budget after automatic quality adaptation, and still
requires camera invalidation, stationary capture reuse, stable allocations and
unchanged game state across context loss/restoration.

Presentation no longer limits each animation RAF to 50ms. Movement and actions
follow visible elapsed time at low frame rates; hiding or rotating the page
pauses their clock. This changes presentation timing only, not the resolver,
turn costs or saved outcomes. Pure clock tests cover 1–60 FPS and pause/resume.
The complete rescue/extraction/aftermath/recovery loop passed through actual
mouse/touch controls in four layouts with forced SwiftShader. Each route action
must complete within a finite 30-second test bound.

Context restoration prepares the reflection and compiles the main scene shaders
before controls unlock; the metrics record that preparation time separately.
This uses the existing Three renderer's `compileAsync`, with no new dependency.
Four software-rendered wet/recovery layouts passed. The final source head and
public cabinet still need their complete release receipt; local CPU correctness
is not physical Pixel/iPad performance or final art approval.

No newer concept choice was inferred. The existing After the Rain direction,
neutral fighters, camera presets and tactics remain the release scope.

Owner: “Let's start finalizing the art pass. Mechanics and gameplay pass next.”
This batch refines the C.15 courtyard and service yard toward concept 02 / After
the Rain. It changes environment presentation, not Move + Act, intent, costs,
cover, saving, crew identity, campaign sites or character acceptance.

## Reproducible scenery

Blender 5.2.1 LTS generates `kallio-kit-v02.glb`: 15 reusable motifs, 41,800
triangles, 3,586,560 bytes. The kit and two existing painted source textures total
9,130,365 downloaded bytes; texture uploads are capped at 1024px. Version 01 is
retained in source for rollback. No paid generation, new designs or Meshy jobs.

Windows have actual openings, reveals, curtains, furniture silhouettes and two
lit-window patterns. The arch has a passage floor, side walls, ceiling, rear
gate and fixture. Planters, leaf debris, bin wear and facade drainage marks
extend the kit. Cavity vertex colours are exported on every primitive; material
base colours remain intact. Engine placement shares geometry through instances.

World-scaled material variation adds wall-base damp and paint mottling. Paving
uses its actual image for joints and a continuous puddle mask: broad mirror
patches and dithered obstacle fringes found in private review were corrected.

## Bounded rendering

The existing 128px cubemap still lights props. A separate planar target reflects
static scenery on the paving: 256px desktop, 128px touch/recovery, at most 10
updates per second while the camera changes; no updates when it is stationary.
It excludes fighters, ground feedback and actor cutaways during capture. It
uses the same WebGL context and respects the conservative recovery profile.

Reflection clipping follows the homogeneous plane construction in Three r167's
Reflector, including orthographic projection. No Three upgrade, React,
postprocessing framework, GTAO, N8AO or drei dependency was installed. See the
[resource assessment](C15_GITHUB_RESOURCES.md) for the separate future options.

## Validation and acceptance

`wet-environment.cjs` drives the actual VIEW controls, checks that camera motion
refreshes the reflection, stationary cameras stop captures, resource counts
stay stable and context restoration reduces the buffer without changing the
turn. Tests at device-like DPRs are desktop emulation, not physical hardware.

The first corrected build measured 60 FPS desktop, 29–30 FPS touch profiles and
30 FPS after recovery in local Edge. The final packaged test receipt must pin
the released bytes; these measurements alone are not that receipt. The source
CI separates outing, gun-camera, 36-view and wet-environment checks so each has
its own outcome and finite timeout. CI uses half DPR for software rendering;
local visual checks use the target layout and device-like DPRs.

Private visual review improved from C.15's 6.1 to 6.4 then 7.1/10 before the
last paving-scale, material-weathering and debris refinement. This is not a
claim of completed concept parity or owner approval. Physical Pixel 10 Pro and
iPad M2 testing, final F01/F02 rigs and campaign site binding remain open.

## Art closure and next pass

Keep the minimalist command strip and tactical, oblique, overhead and reversible
gun-inspection cameras. Finish the art pass against actual playable views and
device feedback before changing mechanics. Remaining art questions concern
architectural richness, motivated lighting and the final fighter fit. Do not
expand arenas or buy more assets to avoid resolving those gaps.

The subsequent gameplay pass should audit movement/aim/cover clarity, attack
animation timing, readable enemy intent, firearm feedback, encounter variety
and persistent crew consequences against the shared Mewgenics/XCOM direction.
That list is next work, not an implementation claim.

```powershell
blender --background --python tools/blender/build_kallio_courtyard.py -- web/crew-run/assets/kallio-kit-v02.glb
node web/test/night-places-browser.cjs
node web/test/wet-environment.cjs
node web/test/gun-aim-camera.cjs
node web/test/crew-run-browser.cjs
```

Publish through the existing exact-source allowlist and record source, hub and
Pages receipts separately. Keep target renders and rejected iterations private.

Final local suite: 36 views, gun preview/confirm/cancel and complete outings passed
in all four layouts. A repeated desktop recovery sample reported 0–1 FPS during
the initial shader-warmup window, then two consecutive 30 FPS windows. Treat
that recovery hitch as an open profiling item; do not call recovery hitch-free.
The owner has now requested stronger stylization: see the six numbered
[finish concepts](concepts/c16-stylized/README.md). Await a direction choice before
claiming the art finish is locked. At that checkpoint the verified public build was C.15; C.16.1 is now published.

2026-09-14 CI follow-up: PR #81's night-places check timed out scrolling to
Equip; wet-environment failed its FPS-sampled assertion after a fixed wait.
Both remain unresolved release blockers. Local Edge results are not Linux CI
or physical-device acceptance. The 55-file source audit found `crew-run/ui.js`
still using an older locations import in the published subset; the follow-up
includes that file and advances the importing entry tokens. Do not describe
the earlier local test suite as verification of byte-identical published code.

The follow-up repair holds the last scene behind crew planning, the open roster and modal dialogs, redrawing on selection/resize. This avoids continuous GPU work while scrolling UI. The browser gate asserts a stationary planning scene and logs each real route action duration. CI explicitly selects the same SwiftShader backend used for local software-renderer verification; scenery storage checks now honor the configured DPR. The first repaired-head CI passed wet reflections but stalled during UI scrolling, so publication waited for the new exact-head gate. Those checks subsequently passed.

CI now passes the formerly blocked equipment menu and wet-state assertions, then times out taking screenshots in the legacy Chrome headless shell. The four C.16 browser gates use the regular Chromium channel in headless mode, matching the browser architecture used by local Edge checks (Playwright browser documentation: https://playwright.dev/docs/browsers). No gameplay assertion, action deadline or screenshot is removed.
