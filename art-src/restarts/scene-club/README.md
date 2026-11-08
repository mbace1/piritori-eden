# Scene Club — 9:16 scenes with overlays

Owner correction, 8 November 2026: use Toko Move as the UX reference,
**9:16 with overlays**, and delete the old UI and modular cast basis.
The earlier wide/full-viewport candidate is replaced by this presentation.

[Latest UI-cap preview](evidence/ui-cap-scene-club.mp4) ·
[narrow dialogue → choices](evidence/ui-cap-narrow.mp4) ·
[Toko study](evidence/ui-cap-toko.mp4).

[Earlier full progress trailer](trailer/piritori-progress-trailer.mp4) ·
[shot list and capture provenance](trailer/README.md). The earlier cut predates
this UI-budget pass; use the previews above to assess the current presentation.

Serve the repository and open **`/art-src/restarts/scene-club/`**.
The quiet Kallio map leads into the authored Aatami/Jaska encounter. Both
characters stay in the illustrated room; dialogue and all three choices
float over it. Real campaign effects persist across reload and the actual
clock advances when returning to the map.

[Actual 9:16 stage capture](evidence/phone-side-reduce-choices-stage.png) ·
[phone animation](evidence/visual-restart-phone.mp4) ·
[landscape animation](evidence/visual-restart-landscape.mp4).

## The frame

There is one fixed 9:16 stage, centered and fitted to the available viewport:

| Browser viewport | Scene frame |
|---|---|
| Phone 390×844 | 390×693⅓ |
| Desktop 1280×800 | 450×800 |
| Landscape 844×390 | 219⅜×390 |

The room and actor layers fill that frame, including the area behind the
HUD, dialogue and choices. No footer reserves or cuts off part of the art.
There is no wide desktop composition. Overlays adapt to the fitted width
with actual 44px targets and at least 12px text, including landscape; they
are not a scaled-down wide page. Narrow choices show compact stakes derived
from the actual effects and retain the complete authored accessible label.

This follows the active **Toko Move v3.15 journey** at
`af5d870790fc22dba82d55ac8c6182d73fa16ca4`, especially
`toko-move/js/play.js`: scene layers, compact top status, bottom choice
overlays, transitions and remembered consequences. Its old map/sheet UI
is explicitly removed by that runtime and is not the reference. Piritori
keeps its own art, all authored choices and C.19 tactical combat. The fixed
9:16 requirement applies even where Toko itself switches to landscape.

## One shared UI ceiling

All HUD, dialogue, choices, consequences and temporary controls share a hard
**50% maximum**. It is a ceiling, not a target. The city checks both painted
panel union area and the stricter combined top/bottom height bands, including
insets and gaps; it does not count the scene/map artwork as a panel.

[Independent 32-state measurements](evidence/ui-budget-audit.json) and
[recorded settled layouts](evidence/ui-cap-steady-layouts.json) back these values.
The new clips were captured at `f18c5a5`; subsequent entry-footprint accounting
reserves the same steady layout throughout animation.

Actual choice-state bands are **43.85%** on phone, **38.44%** on desktop and
**47.69%** in fitted landscape. Across tested gameplay states the maximum is
47.69%; the bounded Review sheet reaches 50.00%. Native text remains at least
12px and targets at least 44px.

Where simultaneous dialogue and three choices cannot fit, Respond changes
presentation only and replaces the dialogue with all three options. A 300ms
input guard prevents the same repeated tap from choosing. Compact results
remove duplicate forecast cards but keep the selected response, actual
consequence and map continuation. The complete authored labels remain
accessible. The map retains its authored arrival text.

## Retained sources

| Source | Register ID | Status |
|---|---|---|
| Jaska concept v03 | `cutin-jaska-rig-v01` | Approved cut-in |
| Young Aatami support 06 | `cutin-aatami-front-rig-v01` | Selected source; rig semi-approved |
| Young Aatami final | `cutin-aatami-rig-v01` | Selected source; rig semi-approved |
| Toko v02 paper painting | `scene-toko-rig-v01` | Approved paper artwork |
| Scene Club / empty noodle bar | `scene-scene-club-v01`, `scene-toko-noodles-empty-v01` | Existing semi-approved scene plates |

Source paintings and registered parts retain their hashes. Toko's room,
body, counter and hands share one original camera; Aatami is foreground.
Speaking uses head/body acting: **the source mouths remain static**.

The small Review menu selects front/side Aatami, the Toko comparison, 50%
inspection scale and restart. Direct routes:

- `?start=scene&pose=side`
- `?start=scene&pose=front`
- `?pair=toko&pose=front&start=scene`
- Add `&scale=0.5` for half-size composition review. This does not establish
  native touch acceptance.

## Gameplay boundary

Based on current main `804613a3d4eaa1e5180dfb0ef2cb88952d15bd97` / v4.99.
`campaign.js` calls state v16's real `chooseEncounter` and `advanceSchedule`.
Only `piritori:restart:scene-club:v1` is written. Normal campaign, Night Shift
and outing receipts are never opened or replaced by this candidate.

The first authored opening sentence appears on arrival; its envelope sentence
appears in the encounter. The three labels, stakes and consequences retain
the existing story. Returning reveals the next lead, Harju, while Aatami
remains at Mäkelänsilta. No trip is invented or charged twice.

These three choices do not start combat. C.19 and its campaign bridge stay
in the existing game; this candidate does not invent another fight entry.
The Toko ensemble comparison uses two existing source sentences and applies
no choice effects.

## Old basis removed

The old modular 2D heads, bodies, clothing, cast poses, UI textures, obsolete
preview launchers and exports are deleted with their registrations, callers
and misleading active approval rows. The old city material/skin and 3D news
portrait presentation are removed. Existing campaign compatibility screens
use neutral identity labels for contacts without retained artwork. No new
character design is inferred from an old roster.

All 15 superseded local review worktrees are removed; branch history and
private test evidence remain recoverable. Do not restore those designs from
history as new placeholders. Startup instructions and the Art Bible now
state the 9:16 overlay contract directly. C.19's 3D stand-ins, arena kits,
weapons, geography and gameplay remain outside this obsolete 2D cleanup.

[Cleanup inventory](evidence/cleanup-summary.json): **414 old source paths**,
153,212,438 bytes removed; semantic role vocabulary is preserved as content.
Obsolete visual/UI instructions are replaced in startup, Art Bible and UX
specification. Tests reject restoration of the retired libraries and references.

## Verification and actual output

- **35 Node suites** pass: [actual campaign/combat output](evidence/baseline-node.log).
- Adapter: 135 checks for three exact effects, engine settlement and clock,
  reload, duplicate refusal and isolated storage.
- [Scene Club browser report](evidence/browser-results.json): **5,082 main +
  1,308 edge checks**, zero failures. Both poses,
  three viewports, motion/reduced motion, fixed 9:16 geometry, full-scene
  layering, real target/text sizes, face clearance, half-size review and
  nine actual choice/reload/map flows. Additional DejaVu Sans and monospace
  probes reproduce and prevent the CI font-metric overlap.
- [Toko ensemble report](evidence/ensemble-results.json): **4,104 main +
  830 edge checks**, zero failures. Both poses, three
  viewports, one room/counter camera, sampled actual canvas motion, clear
  heads, source text and unchanged saves.
- [Compatibility browser report](evidence/cleanup-browser-results.json):
  phone/desktop neutral identities, byte-identical saved campaigns and actual
  C.19 procedural models. [2,000 matched hiring results](evidence/cleanup-gameplay.json)
  and [324 paused Godot battle checks](evidence/godot-battle.log) also pass.
- [Phone recording](evidence/visual-restart-phone.mp4) and
  [landscape recording](evidence/visual-restart-landscape.mp4). WebM originals
  and stage/viewport screenshots are included beside them.
  The earlier short clips were filmed at `9cdfdc0`; the new trailer’s 450×800
  view remains pixel-identical after the narrow-font correction.
  MP4s fit the actual scene to 720×1280; WebMs retain the native browser
  viewport and letterboxing. No artwork is reconstructed for the recordings.

```sh
node web/test/visual-reset.mjs
node art-src/restarts/scene-club/campaign-test.mjs
node art-src/restarts/scene-club/browser.cjs
node art-src/restarts/scene-club/ensemble.cjs
```

Browser scripts self-host the checkout and use the existing Playwright
installation. `RESET_CAPTURE_DIR` / `RESET_ENSEMBLE_DIR` choose private output.
The ensemble script accepts `--record` for actual browser video. CI includes
both the corrected presentation checks and obsolete-library guards.

New animation and composition remain visual approval candidates. This is
not a release or deployment. Browser testing does not establish physical
Pixel/iPad acceptance. The latest main roadmap check-in is **50%**; this UI
pass does not increase that score. Next: review this actual
9:16 output, then integrate the accepted presentation through the campaign
boundary and continue the existing listed locations and cast.
