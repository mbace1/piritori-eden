# Act I encounter gallery: source bindings and production plan

Review-only, 7 November 2026. The gallery joins `binding-proposals.json` with the canonical encounter, map and art registers; it must not copy/rewrite authored dialogue, requirements or consequences. This plan authorizes no art promotion, campaign-rule change, release or completion increase. Act I remains **48%** under ROADMAP's existing rubric.

## What is ready to show

The current slice has **17 authored encounters: 11 direct plate bindings, five proposed bindings to existing plates, and one unbuilt exterior composition**. A registered asset is available; `approved`, `semi-approved`, `prototype-only` and device acceptance remain separate states. All proposed plate/rig IDs below were checked against `art/v3/manifest.json`. The JSON records their exact source approval and production state.

| Authored encounter | Current direct plate | Gallery proposal / status | Required work or uncertainty |
|---|---|---|---|
| `enc-first-purchase` | `scene-piritori-square-v01` | Direct | Select seller Esa source; review pocket-bag/watcher staging. |
| `enc-jaska-receipt` | `scene-scene-club-v01` | Direct | Approved Jaska rig; Aatami front/side and new entrance motion remain candidates. |
| `enc-first-sale` | None | **Unbuilt**, neutral exterior/queue placeholder | Leena waits outside the legitimate queue. Bank-interior art is contextual reference only, never presented as the actual sale stage. |
| `enc-runner-at-tram-stop` | None | `scene-harju-pitch-v01` — proposed existing | Pitch backdrop is available; tram-stop foreground/approach is unbuilt. Label that distinction. |
| `enc-bank-counter` | None | `scene-bank-counter-v01` — proposed existing | Plate fits the teller scene; source-select Anne and retain live ticket/conversion copy. |
| `enc-toko-quiet-voice` | `scene-toko-noodles-empty-v01` | Direct | Approved paper Toko is reusable; preserve mask, room/rig registration and counter alignment. |
| `enc-karhupuisto-watch` | `scene-karhupuisto-v01` | Direct | Approved park baseline; watcher, owner, dog and wind are separate review placeholders/layers. |
| `enc-mccormick-yard` | `scene-kallio-service-yard-v01` | Direct | Source-select Sean/crew; review invoice/photo composition without new family facts. |
| `enc-bear-path` | `scene-karhupuisto-clearing-v01` | Direct | Gallery illustration is not its fight. Link actual C.19 park mission; preserve bear/plinth/withdrawal continuity. |
| `enc-first-firearm` | `scene-piritori-square-v01` | Direct | Alternate crop/prop emphasis only; no direct authored fight effect here. |
| `enc-jade-window` | None | `scene-jade-lantern-front-v01` — proposed existing | Ordinary shop/lunch queue. Current authored anchor is Hakaniemi; older Linjat context must not become baked geography. |
| `enc-courtyard-last-call` | None | `scene-courtyard-prototype-v05` — proposed existing | Porttikongi plate fits the authored mission; `jaska_studio` site conflicts with schedule/battle at Torkkelinmäki. Show conflict, do not silently relocate Scene Club. |
| `enc-pasila-ledger` | None | `scene-bank-counter-v01` — proposed existing | Current site is staffed bank/Siltasaari. Pasila is a brochure subject, not the present location. |
| `enc-jaska-last-light` | `scene-scene-club-v01` | Direct | Reuse Jaska/room; conditional portraits/receipts require actual survivor state when integrated. |
| `enc-kello-reckoning` | `scene-piritori-square-v01` | Direct | Source-select Kello; bench/tram/watcher variants must follow authored Thursday consequences. |
| `enc-family-calls` | `scene-kallio-service-yard-v01` | Direct | Family/group placeholders; account book/kettle/van are authored facts, not new reward mechanics. |
| `enc-shipment-night` | `scene-sornainen-docks-v02` | Direct | Container/clock/van staging candidate; retain current chapter-operation contract while finale decision remains open. |

Except `scene-karhupuisto-v01` (`approved` / `prototype-ready`), the listed scene plates are `semi-approved` / `prototype-only`. Toko's separately registered paper rig is approved; his empty-room plate is still semi-approved.

## Cast placeholders must say what they are

The register supplies `cutin-jaska-rig-v01` (approved), `cutin-aatami-front-rig-v01` and `cutin-aatami-rig-v01` (semi-approved), `cutin-arvo-rig-v01` (semi-approved) and `scene-toko-rig-v01` (approved). One-at-a-time Aatami speech uses the front/near-camera study. The side pose belongs in a reviewed opposite-sides composition.

Other named participants have **no dedicated registered cut-in** in this audit. Use labelled neutral source-selection placeholders for seller Esa, buyer Leena, teller Anne, Sean, Mei-Lan, Kello and the bank clerk. This does not assert that no modular cast source exists. Select an existing approved identity/source before extraction; do not redraw a named person merely because a dedicated rig is absent.

Crew/team IDs are group placeholders, lunch crowd is ambient staging, and `jaska-offscreen` is intentionally offscreen context. Do not invent a portrait, dead crew member, named rival or surviving crew selection from those labels. Their presence depends on actual campaign data. Hooded-camera-woman concepts already exist, but she is not an authored participant in these 17 encounters and has no registered rig; her review work is a separate later candidate, not an excuse to add a new storyline here.

## Actual combat routes, with limits stated

Only two of these 17 encounters carry direct `start-battle:` effects:

| Encounter / choice | Actual mission and C.19 kit | Safe entry / existing verification |
|---|---|---|
| `enc-bear-path` / `hold-path` | `mission-bear-path`, `battle-karhupuisto-2v2`, `park` | `web/?play=g0-bear` is the existing saved-campaign playtest. It sets the prior campaign aside, fields two crew and opens this authored choice. `web/test/play-card.cjs` checks handoff. |
| `enc-courtyard-last-call` / `take-positions` | `mission-courtyard-receipts`, `battle-courtyard-3v3`, `courtyard` | Ordinary campaign progression, or the existing `web/test/mission-browser.cjs` fixture: schedule index 11, selected anchor `torkkelinmaki`, three recruited/deployed crew, then real choice click. There is **no dedicated current mission `?play=` URL**. |

The game generates `web/crew-run/?campaign=1&outing=<persisted outing id>&arena=<kit>` through `outingUrl()` and `startMissionOuting()`. Never fabricate an outing ID or resolve combat in this gallery. The real bridge handles fighters, enemy intentions, weapons, police, withdrawal, injury/recovery and exactly-once receipt settlement. `mission-browser.cjs` checks the campaign handoff while stubbing the destination; it is not evidence of played/rendered C.19 by itself. `web/test/c19-outing.mjs` and `web/test/outing-browser.cjs` cover the record/return boundary.

`web/?play=g0-door` is an actual C.19 courtyard **door** playtest, useful as a separately labelled related combat demonstration; it is not Courtyard Receipts. `web/?play=g0-getaway` is the actual quay getaway playtest. `web/?play=battle-3v3` and `?battle=...` are legacy formation/debug entries, not substitutes for C.19 campaign missions.

Every encounter has an existing `web/?encounter=<id>` preview URL. It is a fresh **unsaved** dialogue/debug preview with no recruited crew. The gallery may link it with that label. It must not claim a persistent decision, valid C.19 handoff or receipt test from that URL.

## Concrete production batches

1. **P0 — Scene Club source fidelity and motion review.** Reuse the existing room and Jaska/Aatami pieces. Render arrival, one-at-a-time speech, blink/head gesture, authored decision and return transition. Check source seams, proportions, phone choice/bubble clearance, reduced motion and actual animation. New staging remains candidate until owner review.
2. **P0 — Courtyard location clarity.** Keep the narrative `jaska_studio` conflict visible in review metadata while using the battle's actual Torkkelinmäki anchor for combat. Resolve/record the content binding before runtime visual promotion. Do not turn the illustrated review plate into the arena.
3. **P1 — Bank pair.** Review the available bank interior for teller/ledger scenes; make a separate exterior/queue placeholder for first sale. Source-select Leena/Anne/clerk and clarify whether the latter two share an identity before producing extra faces. Keep all bank rates, numbers and copy live.
4. **P1 — Harju and Jade approaches.** Reuse the registered pitch/shopfront as contextual planes, then review the unbuilt stop foreground and ordinary lunch queue. Show the current authored anchors; do not imply that a sports pitch is a completed tram-stop picture.
5. **P1 — Return/memory props and the docks.** Use existing Scene Club, square, service-yard and docks images with labelled receipt/portrait/bench/account-book/container/clock/van candidates. Conditional overlays must later read real flags/crew state. No invented finale fight.
6. **P2 — Remaining cast and arena cohesion.** Produce one source-selected speaker extraction at a time after approval; use the current modular baselines and Toko's hidden-pivot technique. Arena work starts with actual C.19 captures and existing-kit joins/readability, not new battle cards or a cast-generation pipeline.

## Acceptance boundary

Gallery selections, placeholders, staged props and animation are review candidates. They change no content, runtime manifests, approval registers, combat rules or saves. Source hashes/registration establish availability only. Phone 390×844, desktop 1280×800 and relevant landscape/tablet captures are browser evidence; physical Pixel/iPad acceptance stays open. Use current authored choices/forecasts/requirements and preserve peaceful alternatives. The roadmap finale decision remains a high-level owner gate; this gallery does not answer it by illustration.

Sources: `DESIGN_AUTHORITY.md`, `ROADMAP.md`, `ART_BIBLE.md`, `art-library/APPROVALS.md`, `design/SCENARIO_ATLAS.md`, `design/C19_CAMPAIGN_FIGHTS.md` §6, `content/era1-slice-v1.json`, `content/places-v1.json`, `web/js/v3/testlist.js`, `web/js/v3/outing.js`, `web/js/v3/app.js`, `web/test/play-card.cjs`, `web/test/mission-browser.cjs`. See JSON `source` for the exact base commit and content/register SHA-256.
