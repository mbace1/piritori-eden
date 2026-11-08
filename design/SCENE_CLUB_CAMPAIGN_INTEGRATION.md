# Scene Club — approved view, real campaign

8 November 2026. The owner answered “Go” after the current animated Scene
Club preview was offered for composition/motion review. Acceptance covers
the shown side-view young Aatami/Jaska pair and its fixed 9:16 presentation.
Other studies and source-register statuses are unchanged. This is feature
branch integration, not a release, merge, deployment or physical-device verdict.

## Player path

Play the existing opening purchase and sale, travel to Mäkelänsilta and enter
`enc-jaska-receipt`. The room and retained pair now appear in the normal game.
The first authored sentence is an arrival beat; Continue reveals the envelope
sentence and all three original choices. Respond stages dialogue/choices only
when the combined UI cannot fit below 50% with 44px controls and 12px text.

The real campaign controller applies the choice and saves it. The view shows
the selected response, authored consequence and exact unconditional markka/
trust increments. Reload reconstructs this result from the recorded choice;
it does not repay the effects. Back to Kallio calls the existing clock and
settlement path once, preserving Aatami's location and revealing Harju.
The returned map remains the normal campaign map; its visual redesign is
the next city-navigation iteration.

Menu preserves the existing read-only inspectables, master sound switch and
an exit to the actual map. Leaving without choosing does not spend a block
or settle a choice. The menu shares the same 50% budget. Review, Restart,
half-scale and Toko Study controls are absent from the campaign.

## State and view boundaries

- `web/js/v3/scene-club-view.js` owns only dialogue/menu/fit state and actor
  lifetime. Its scoped stylesheet is isolated in an open shadow root so
  legacy campaign typography and UI cannot leak into the approved frame.
- `web/js/v3/app.js` retains the actual state object, save codec, choice
  requirements, `chooseEncounter`, C.19 handoffs and `advanceAndSettle`.
  Location/schedule/encounter/owner checks reject stale view callbacks.
  Continue consumes its token before advancing; short input guards prevent
  a repeated choice tap becoming Continue or a map action.
- Existing saves, crew wounds/missing state, equipment, police pressure,
  trip accounting, last-fight cleanup and processed receipts are preserved.
  Neither the candidate wrapper nor a replacement campaign is imported.
- The standalone candidate uses the same view/actor renderer through its
  original isolated controller. Its own save key and Toko/front studies
  remain private to that review page.
- Leaving, resetting or changing the current campaign disposes actors,
  animation/fit frames, ResizeObserver, media/resize listeners and arming
  timers. Late asset readiness cannot reattach an obsolete view.

## Validation

`web/test/scene-club-campaign.cjs` earns a real opening checkpoint through
native controls, then tests three choices at phone390×844, desktop1280×800
and fitted landscape844×390. Rich normal saves retain crew, injuries, kit,
pressure, trip usage and settled fight history. Full engine/save comparisons,
reloads, native repeated input, menu exit, actual Harju travel and independent
UI rectangle measurements check the integration. Campaign stores must remain
separate from candidate/standalone/C.19 receipt stores.

Existing Scene/Toko browser suites still verify source identity, animation,
font edges, clipping and the shared UI ceiling. A flat hub-cabinet browser
check is also required: the source layout alone cannot prove path rewriting
and copied runtime dependencies load. The tactical-only C.19 package remains
separate and gains no city/art-review dependencies.

[Final evidence and actual 19-second campaign video](../art-src/restarts/scene-club/evidence/campaign-integration/README.md):
normal campaign **1,841/0** (40 measured states); built cabinet **297/0**;
existing Act I scenes **10 checkpoints**, compatibility/C.19 at both viewports,
and all 12 requested campaign-state suites pass. Source hashes stay stable.
Measured Scene Club union peaks at 44.76%; stricter bands at 49.9989% in Menu.
The existing workbench suites separately cover both poses and the Toko study.

Scene entry now dismisses the previous map travel toast. Native double taps
at arrival, Respond, choices and result cannot commit an unintended choice
or advance twice; the first-arrival bug was reproduced before its guard fix.
Dedicated CI runs the actual campaign and nested flat cabinet, alongside the
existing browser and C.19 workflows.

Act I remains **50%** under the current roadmap rubric. This integration
does not claim completed later scenes or owner device acceptance.
