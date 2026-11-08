# Scene Club in the normal campaign

8 November 2026. [Actual campaign short](normal-campaign-scene-club-19s.mp4), captured
from native browser controls after the owner accepted the shown composition
and motion for campaign integration. It follows the original arrival,
decision, saved result and return to the existing Kallio map. It contains no
new story, reconstructed artwork or simulated outcome.

The capture starts with a real Begin → purchase → Siltasaari sale → travel →
Scene Club path. The shown ask-envelope decision adds the engine's authored
300 mk / Jaska trust +1, and continuation reaches schedule index 3 with Aatami
still at Mäkelänsilta. The returned map is the existing campaign map; a quiet
city-navigation redesign is the next iteration.

[Capture provenance](capture-report.json) · [19-second edit provenance](preview-summary.json) ·
[native raw recording](normal-campaign-450-native.webm) ·
[phone choices](phone-choices.png) · [desktop choices](desktop-choices.png) ·
[fitted landscape](landscape-choices-stage.png) · [phone Menu](phone-menu.png).
The reports retain original capture filenames; selected stills have shorter
names here. All ten captured production/core/art hashes match runtime commit
`5e440ab6cca85e67fc2faff91ed95d9170cd8f58` and remain unchanged.

| Gate | Actual result |
|---|---|
| [Normal campaign](campaign-report.json) | **1,841 / 0**, 40 measured states; 37 input hashes stable |
| [Flat nested cabinet](cabinet-report.json) | **297 / 0**, three native choice/device flows; 249 source and 247 built-file hashes stable |
| [Existing browser regressions](regression-results.json) | Act I scenes: 10 checkpoints; cleanup: both phone/desktop with six real C.19 stand-ins each; zero browser errors |
| [Campaign state suites](node-results.json) | All 12 requested existing Node suites exit 0; input hashes stable |
| [Shared-renderer workbench](prototype-run.json) | Adapter **135/0**; [Scene](../browser-results.json) **6,390/0**; [Toko](../ensemble-results.json) **4,934/0**; all nine shared/workbench source hashes stable |

The normal campaign's maximum measured union is **44.76%**; its stricter
combined height bands peak at **49.9989%** in Menu. Targets and text retain
their 44px/12px floors. [Scene log](act1-scenes.log),
[cleanup log](visual-reset-browser.log), [campaign log](scene-club-campaign.log)
and [cabinet build log](cabinet-build.log) preserve the actual output.

## Reproducible gates

- `NODE_PATH=… SCENE_CLUB_CAPTURE_DIR=… node web/test/scene-club-campaign.cjs`
  earns an opening checkpoint, then exercises all three choices at phone
  390×844, desktop 1280×800 and landscape 844×390. Rich-save fixtures test
  injuries, missing crew, equipment, police pressure and settled receipts;
  the normal engine and serializer are the full-state oracle. Native repeated
  input, result reload, unresolved exit and actual Harju travel are included.
- `NODE_PATH=… SCENE_CLUB_CABINET_DIR=… node web/test/scene-club-cabinet.cjs`
  builds the actual flat cabinet, serves it below `/cabinet/`, then verifies
  all three decisions across the three devices. Every requested runtime file
  must belong to the built closure; the hub shell is an explicit inert fixture.
  Source and complete built-output hashes must remain stable.
- Existing `act1-scenes.cjs` checks retained Jaska/Toko visits and the broadcast;
  `visual-reset-browser.cjs` checks neutral identities, save compatibility and
  real C.19 models at phone/desktop. The Scene/Toko workbench suites continue
  to check source identity, motion, font edges and geometry using the same
  shared renderer, with their private controller/save.

All Scene Club panels, including Menu and arrival/result states, share the
50% ceiling. Reports independently measure rectangle union and stricter
top/bottom bands with gaps/insets, plus real 44px targets and 12px text.

## Issues found and fixed

The first actual recording exposed an old map travel toast over the arrival
caption; scene entry now dismisses and clears that toast. An independent
native-input review reproduced arrival Continue double-tapping into
`leave-it` on phone and desktop. A 300ms choice-arming guard fixes it; the
campaign gate now repeats arrival taps and compares the complete save.
The exact independent before/after probe confirms no choice or state change
at all three sizes after the fix: [reproduction](arrival-doubletap-before.json)
and [fixed result](arrival-doubletap-after.json).

Initial extraction runs caught a missing overlay ID and a mixed-source run
correctly failed its provenance guard. A clean workbench run also exposed an
implicit `/favicon.ico` 404; the workbench now declares a blank data favicon,
with strict browser-error checks retained. The cabinet harness initially had an
incomplete synthetic fight record and treated closed-details descendants as
painted; those fixtures/visibility checks were corrected without changing the
builder or relaxing target/text limits. Earlier failed runs remain private
as-run evidence, not passing verification.

This is browser emulation, not physical Pixel/iPad acceptance. C.19 battle
rules, assets and receipt settlement are unchanged; these three authored
choices do not trigger combat. Act I remains **50%** under the ROADMAP rubric.
No merge, deployment or new front/Toko-study acceptance is claimed.
