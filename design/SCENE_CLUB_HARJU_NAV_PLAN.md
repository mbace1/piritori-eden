# Phase B readiness: Scene Club → Harju

Read-only audit of `94e25c83c92674aa719b1d945a608dec6911a49e`, 8 November 2026. Proposal only: no city redesign, runtime change, new artwork, approval, deployment or completion increase is claimed. ROADMAP remains **50%**; this belongs to milestone 4, City and UI.

## Observed starting point

Inspected the actual normal-campaign [map-return.png](../art-src/restarts/scene-club/evidence/campaign-integration/map-return.png). It shows Day 2 night after the Scene Club choice: Aatami stays at Mäkelänsilta, Harju is the next lead, and the existing pinned action says Travel to Harju / Brahenkenttä. The large campaign header, progression card and five mode tabs remain visible. The progression card continues below the map; the current map has not inherited the approved encounter's fixed portrait composition. No current-map UI percentage was measured by this audit.

There is no separate normal-campaign `map.js`. The relevant owners are:

- `web/js/v3/app.js:849` `renderRoute()`: map, inspection, progression, doors, delivery capacity, memory and next action.
- `app.js:765` `nextStep()`: already supplies plan / commit / enter / doors without a second progression engine.
- `app.js:693` `anchorSvg()`: separately marks presence, story lead and inspection. Actual map data has **15 anchors**, including sealed, landmark and training entries.
- `app.js:783` `commitPlannedJourney()`: consumes the local preview before committing, then runs the existing road-event hook and saves.
- `web/js/v3/journey.js`: presence/travel authority. A personal trip costs **3/10 of a block**, no fare and no extra scheduled block. A journey remains legal when trading time has run out. It neither delivers stock nor changes the pinned delivery route.
- `web/js/v3/map-relief.js`: static geography canvas, paired with the interactive SVG's exact `xMidYMid meet` projection. Keep their rectangles and coordinate transform identical.

One clarity gap to fix in the pilot: the current journey card promises no money/no block advance, but omits the real 30% block cost. Show that cost from `TIME.trip / TIME.block`; do not add a fee or change the rule.

## Smallest playable next slice

Build a **normal-campaign city journey view for the single Day 2 night leg**, from the resolved Scene Club encounter through Harju arrival and encounter entry. Gate it to route mode, the authored `enc-runner-at-tram-stop` slot, a recorded Scene Club choice, and no pending road event/open outing/ending. Other blocks keep their existing route view in this first iteration. The seam after the runner is explicit; this is not a claim that every Act I map state is redesigned.

Use `mountCityJourneyView(host, { model, onAction }) → { update, destroy }` under `web/`. The parent supplies the same present/inspected/lead/journey/next-step values already derived by `renderRoute()`. The component has no save, clock or mission logic. Keep it keyed to campaign object + schedule index; discard local panels/previews when that owner changes.

Proposed composition, pending actual review:

```text
fixed maximum-fit 9:16 frame
┌ Kallio · Day 2 night                  Menu ┐
│                                           │
│ existing Kallio geography / transit        │
│ HERE: Mäkelänsilta     NEXT: Harju          │
│ map continues behind every overlay         │
│                                           │
│ Here: Scene Club · next: Harju              │
│ [Plan walk to Harju]               [Places] │
└───────────────────────────────────────────┘
```

The tray **replaces itself**, rather than stacking sheets: default → path/cost confirmation → arrived/enter. Show one primary action. Keep actual place names and the here/lead distinction; remove the repeated explainer, brand lockup and generic progression paragraph from this pilot's first view. Keep existing map geometry and transit as geography, not transport mechanics. Do not crop/move anchors merely to fill the portrait frame.

Default map labels emphasize current position, next lead and the inspected place. A bounded Places panel exposes **all 15 actual locations and their statuses** through existing inspection actions. On narrow stages, use native list buttons instead of depending on shrunken/overlapping SVG hit circles. Do not retain tiny interactive hotspots and count them as 44px controls. Other locations remain inspectable/traversable under existing eligibility rules; the pilot must not lock the player to Harju.

Menu/Places/details replace the ordinary tray/header while open and stay within the same cap. Keep ledger/news, optional visits, local shop/Toko/case access, delivery-route planning/capacity and city memory available through the appropriate existing contextual actions/details. The BATTLE tab is not a new navigation destination; fights retain their existing triggers. Do not delete existing gameplay to make the first screen quieter.

## Reuse the existing actions exactly

| View state / control | Existing dispatch and effect |
|---|---|
| Inspect a location | `select-anchor`, `data-anchor=id`: changes only the inspection cursor; no save, presence or quote observation. |
| Default primary | `next-step`, `data-step=plan`: selects the current authored lead and creates `previewJourney()`. |
| Travel somewhere else | `plan-journey`, `data-anchor=id`: same existing preview, from actual current presence. |
| Confirm path | `next-step`, `data-step=commit`, or existing `commit-journey`: consumes `journeyDraft` once and invokes `commitPlannedJourney()`. Show destination/path, 30% block use, €0 fare and no scheduled-block advance. |
| Cancel | `cancel-journey`: discards only the local preview. |
| At Harju | `next-step`, `data-step=enter`: uses `openEncounter()` and its presence/news gate. No automatic entry on arrival. |
| Return to lead inspection | `show-lead`: moves the inspection cursor, never Aatami. |
| Other contextual services | Retain `open-shop`, `open-ramen`, `open-case`, `open-visit` with their existing availability checks. |
| Delivery tools | Retain `plan-route`, `commit-route`, `cancel-route`, `send-route`; never substitute these for personal travel. |
| Ledger / News / map return | Reuse the existing mode-navigation transition identified by `data-mode-target="ledger"`, `"news"`, `"route"` through a parent callback. Extract that dispatcher if necessary; do not synthesize DOM clicks or let the view write `state.mode` itself. |

Keep `next-step`'s stale-step validation. Do not call `advanceSchedule()` from the view. A road event raised by a confirmed trip must replace navigation through the existing road mode. Active C.19 outings must retain the existing `render()` precedence and receipt settlement. The pilot adds no combat entry.

## UI budget and reference boundary

Reuse the approved encounter's maximum-fit 9:16 sizing, readable native text and measured adaptation principle. **Combined HUD, tray, menus, receipts and temporary controls ≤50%** by both painted rectangle union and combined edge bands, including insets/gaps. Target substantially less in the ordinary plan/confirm/arrived states. On short fitted landscape, replace text/choices sequentially or use a bounded scrolling panel; never scale 44px controls or 12px decision text down. Transition frames and delayed toasts count too. No new numerical coverage result is claimed here.

Studied the active Toko journey `toko-move/js/play.js` at reference commit `af5d870790fc22dba82d55ac8c6182d73fa16ca4` (v3.15). Relevant behavior: `paintHud()` shows current job context; `paintMini()` limits background labels; `openBoard()` temporarily replaces decision controls; `paintCard()` states stakes and arms input after 300ms. Borrow focused context, one short loop and presentation/input separation. Do not copy its art, tram gameplay, freeform aspect switching or small-text scaling fallback. Its retired map/sheet UI is not the reference.

## Existing tests to reuse, with only meaningful additions

- **`web/test/scene-club-campaign.cjs`**: retain the earned normal save and exact Scene Club result oracle; extend its return → Harju preview/cancel/commit/entry leg to the new view. Confirm no old receipt, crew, injury, pressure or equipment field changes.
- **`web/test/next-step.cjs`**: keep one primary in view, real enter/plan/commit routing, stale-step refusal, keyboard/touch behavior and zero errors. Update selectors only when the new component requires it; do not weaken the action-count contract.
- **`web/test/m1-inspection.cjs`**: complete state/save byte identity for inspection, remote interaction refusal, sealed/landmark/training handling, optional visits, reload cursor reset.
- **`web/test/m2-journey.cjs`**: preview/cancel/reload/stale-owner cases, exact one-trip arrival under native repeated taps, no teleport or fare, presence/observation update and untouched delivery route. Add an explicit independent 3/10 clock assertion; some old test wording calls travel “nothing” while checking only cash/schedule.
- **`web/test/road-browser.cjs`, `play-card.cjs`, `outing-browser.cjs`**: reuse existing interruption and C.19 handoff/result checks; do not create a duplicate combat suite.
- Reuse the campaign view's actual geometry/text/hit-test helpers for 390×844, 1280×800, 844×390 and 271/320px breakpoints. Check every panel state, alternate-location inspection, both motion preferences, native scrolling/list reachability and transition input guards. New browser cases must use native taps, not the force-clicked SVG inspection helpers in some older tests.

## How this supports the six scene packets

Harju is the first real navigation acceptance leg, using the existing runner encounter and its neutral/unapproved character boundary. If it plays well, extend the same controller/view to the subsequent authored leads: Siltasaari bank (preserve preceding Arvo bulletin), Vaasankatu Toko (four choices), Karhupuisto watcher, Linjat yard and Bear Path (existing C.19 battle branches). That is a later extension of scope, not six new scenes implemented here. Keep the source/name ambiguities and location/character approval limits in `design/SCENE_OVERLAY_NEXT_PLANS.md`.

Recommended next implementation order: **(1)** build the one-leg portrait navigation pilot with existing callbacks and native targets; **(2)** run M1/M2/next-step + earned Scene Club → Harju and budget captures, then show the actual output before extending to the six packets. No owner design decision is needed to prepare this reviewable slice; the proposed new map composition itself is not yet approved.
