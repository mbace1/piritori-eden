# M0 — city, mission and consequence audit

Date: 2026-09-17. **Completed repository audit; no gameplay release or physical-device acceptance.**

Owner continuation: “Go next”, following C.19 and the many-small-iterations plan.
This is checkpoint M0 in [POST_C18_ITERATION_PLAN.md](POST_C18_ITERATION_PLAN.md).
It inventories what exists, exposes prerequisites and chooses the smallest first
mission candidate. It does not approve a final map, change travel/economy rules,
select A or C, or implement a new mission.

## Evidence boundary

Inspected source baseline: `14f42ad5f2de62fc72c5519a6dec00d6eed7d9bc` on
`art/meshy-approved-pilots-2026-09-11`, after [C.19 source PR #89](https://github.com/mbace1/piritori-eden/pull/89).
The retrieved text workspace was from `37e18e3`; GitHub's full comparison to
`14f42ad` establishes that the city runtime, map, content and mission model
used below did not change between those heads. Current ACTIVE_CONTEXT and
long-term scope were read separately. C.19 is a separate laboratory release,
not version 19 of the authored city campaign.

Hub tree snapshots: development `bb2f5ac74811e2c8ccdd631bb61570eaf9275e47` and
Pages `4d758244583b1d5cb8a8ab5d27ec953c4c40f805`. Audit snapshot run
[35272255553](https://github.com/mbace1/Suds-Jack/actions/runs/35272255553)
records these exact trees and text hashes. These are **repository tree reads,
not a fresh public campaign playthrough**. They must be re-read before publication.

Generate the machine-readable inventory from the checked-out canon:

```sh
node tools/audit/map-mission-audit.mjs > /tmp/piritori-m0.json
node tools/audit/test-map-mission-audit.mjs
node web/test/v3-state.mjs
```

The auditor reads files and writes only JSON to stdout. It includes input hashes,
all anchors/sites, corridors/services, scheduled encounters, recurring contacts,
mission steps, optional visits, chapter operations and binding findings. It is
not a static proof of runtime execution. The implementation assessments below
come from reading the named handlers. Model checks do not count as UI tests.

## 1. Current catalogue — reuse this before creating content

| Layer | Current source inventory | Meaning |
| --- | --- | --- |
| Public anchors | 15: 11 active, 1 landmark, 2 locked, 1 training | Do not use the stale twelve-anchor total in older prose/UI. |
| Sites | 12, each with an anchor parent | Sites are not independent markets or new geographic nodes. |
| Graph | 25 edges and 4 period-service declarations | Connectivity alone is not implemented travel or a timetable. |
| Scheduled story | 14 encounters across 14 day/night slots | Seven-day sequential spine, not a free-roam mission director. |
| Mission records | 4 | Declared packets and steps are not equivalent to a running mission system. |
| Optional visits | 2 | Existing Jaska/Slomo return conversations, not new economic services. |
| Battle records | 4, including the training fixture | Not four integrated chapter missions. |
| Chapter ending | 1: `op-sornainen-shipment` | An operation; do not invent a boss to replace it. |

Active anchors: `siltasaari`, `hakaniemi`, `linjat_yard`, `karhupuisto`,
`torkkelinmaki`, `harju`, `vaasankatu`, `piritori`, `sornainen_harbour`,
`suvilahti`, `makelansilta`. Landmark: `kallio_church`. Locked: `alppiharju`,
`vallila`. Training: `hermanni_skatepark`, intentionally disconnected from the
campaign graph; do not “fix” it by adding a fictional journey.

Sources: [map JSON](../map/kallio-era1-2003-v1.json),
[content slice](../content/era1-slice-v1.json), [scenario atlas](SCENARIO_ATLAS.md),
[Act I narrative](../ACT_I_NARRATIVE.md). MAP.md's older harbour-teaser and
Torkkelinmäki-studio descriptions lag the later authored records; the later
narrative correction explicitly places Jaska at Scene Club near Mäkelänsilta.

### Scheduled location bindings

| Day / block | Encounter | Scheduled anchor | Site |
| --- | --- | --- | --- |
| 1 day | `enc-first-purchase` | `piritori` | `piritori_first_buy` |
| 1 night | `enc-first-sale` | `siltasaari` | `staffed_bank` |
| 2 day | `enc-jaska-receipt` | `makelansilta` | `jaska_studio` |
| 2 night | `enc-runner-at-tram-stop` | `harju` | `harju_pitch` |
| 3 day | `enc-bank-counter` | `siltasaari` | `staffed_bank` |
| 3 night | `enc-toko-quiet-voice` | `vaasankatu` | `toko_slomo_noodles` |
| 4 day | `enc-karhupuisto-watch` | `karhupuisto` | `karhupuisto_bench` |
| 4 night | `enc-mccormick-yard` | `linjat_yard` | `mccormick_yard` |
| 5 day | `enc-bear-path` | `karhupuisto` | `karhupuisto_bench` |
| 5 night | `enc-first-firearm` | `piritori` | `piritori_first_buy` |
| 6 day | `enc-jade-window` | `linjat_yard` | `jade_lantern_front` |
| 6 night | `enc-courtyard-last-call` | `torkkelinmaki` | `jaska_studio` — **parent is Mäkelänsilta: D005 conflict** |
| 7 day | `enc-pasila-ledger` | `siltasaari` | `staffed_bank` |
| 7 night | `enc-jaska-last-light` | `makelansilta` | `jaska_studio` |

### Recurring people and return visits

Jaska: `jaska_studio` at `makelansilta`; `visit-jaska-room-to-work` follows
`enc-jaska-receipt`. Slomo: `toko_slomo_noodles` at `vaasankatu`;
`visit-toko-after-service` follows `enc-toko-quiet-voice`. Arvo has the existing
broadcast `news-markka-afterlife`, before the bank; **no authored enterable
personal venue**. Keep D004 open rather than attach him to a convenient door.
Slomo and Arvo are noncombatants. Jaska needs an explicit authored combat case.

The optional-visit predicate in `web/js/v3/visits.js` checks chapter, completed
introduction, selected anchor, prior visit choice, chapter/campaign completion
and active battle. Opening/choosing rechecks that predicate. Leaving or choosing
does not call `advanceSchedule`; choices record memory once. This is implemented
availability, but not a physical entrance/approach/return-location system.

## 2. Implemented versus declared versus still missing

| System | Implemented / evidence | Limit that the next work must respect |
| --- | --- | --- |
| Story progression | `state.js`: `currentSchedule`, `chooseEncounter`, `advanceSchedule`; `app.js`: map/scene rendering | Advancing changes `selectedAnchor` to the next scheduled place. It does not execute a journey. |
| Area selection | `app.js`: `select-anchor` sets `selectedAnchor` and calls `markSeen` | Selection doubles as location/access and refreshes market knowledge. It is NOT side-effect-free map inspection. |
| Map “current” marker | `anchorSvg` receives the scheduled anchor; selection has its own ring | The marker means current story lead, not a separately tracked physical position. |
| Market knowledge | `board.js`: `seen`, decay and seeded quotes; `app.js` seeds knowledge on boot | `seen` is a market-observation record, not reliable evidence that a journey happened. |
| Public route | `content.js`: unweighted, undirected `shortestPath`; `state.js`: `commitRoute` | No mode-dependent travel time, fare, journey checkpoint or transit event is executed by this route planner. |
| Route delivery | `state.js`: `sendOnRoute` consumes one stock unit and pays a known buyer under capacity limits | Immediate settlement, not a timed mission journey. Do not charge a second journey later without an explicit migration. |
| Mission steps | `missions/model.mjs` has `cost`, `validate`, `fire`; records author TAKE/MOVE/SELL/etc. | The city app does not import that model. The cabinet builder explicitly omits it. Declared step support is not live integration. |
| Consequences | `applyEffects` handles resources, relationships, flags, reveals, equipment, crew, mission status and battle dispatch; `chooseEncounter` rejects repeated choices | Some declarations only become flags. `service:park-contact:closed-one-day` is stored, not an implemented expiring-closure predicate. |
| Chapter operation | `chapterEndingAvailable`, `attemptChapterEnding`, deterministic operation outcome | Threshold offers access; selection supplies the location check. Neither is a travel system. |
| C/Night Shift | Separate crew-run laboratory and opt-in campaign adapter | C.19 does not select the default campaign resolver or finish the shared-scene bridge. |

`selectedAnchor` is also used by `canShopHere`, `canFenceHere`, the chapter
operation and visit availability. Introducing a preview cursor by overwriting
it would change access and prices. The M1 view needs its own presentation-only
focus; M2 must deliberately separate inspected place, actual presence and story
lead before making promises about travel.

## 3. Mission candidates and settlement ownership

| Record | Existing chain | Integration decision |
| --- | --- | --- |
| `mission-paper-bag` | Piritori purchase -> Siltasaari first sale | **First thin-loop candidate.** Smallest existing no-combat loop; use it to establish navigation/journey/return. |
| `mission-three-vans` | Slomo information -> Harju observation -> return | Later information/return variation. The declared steps are not yet a dispatched mission. |
| `mission-bear-path` | Watcher/Slomo information -> Karhupuisto handover | First later shared-scene battle candidate: preserve information, fixer, confrontation and withdrawal alternatives. Not an A/C selection. |
| `mission-courtyard-receipts` | Jade front -> Torkkelinmäki courtyard -> family consequences | Block physical scene/door integration on D005. Give the courtyard its own authored binding; do not relocate Scene Club. |

Paper Bag is a working implementation choice within the approved audit, not
final mission-design approval. The model replay of the existing `buy` then
`complete` choices yields **€160 -> €115 -> €183**, with no stock remaining:
exactly €23 margin. Each choice rejects a repeat. The mission record separately
lists `cash:+23`; blindly applying that packet on top of the encounter's €68
sale would reward the same margin twice. Keep one campaign settlement owner.

## 4. Publication prerequisite — do not overwrite the wrong campaign

The hub's `main/piritori/` is an older runtime snapshot, not byte-equivalent to
the active source or Pages campaign. At the audited heads:

- source and Pages campaign header/pause are v4.48;
- both hub card notes still say v4.47;
- main's version metadata and `act1.html` external redirect use v4.47;
- Pages version metadata and the local `act1.html` redirect use v4.48;
- `deployedOnly: true` / `external: mbace1/piritori-eden` are part of the card's
  existing source/deployment arrangement, not evidence that main's old app is current.

Do not ship main's old `piritori/js/v3/app.js` over the current live city. Do not
copy the whole live hub into main either. For the first playable city change,
resolve the campaign's publication contract: pinned canonical source, scoped
package or delta, current card/bridge/version identity, and normal public-route
checks. Preserve the separate C.19 cabinet and all other games. The old cabinet
builder copies the whole `web/` tree and assumes fighter binaries; it is not the
allowlisted C.19 publisher. Audit its output before reusing it for a city release.

## 5. Next bounded playable question — M1, not the whole map

**Can a player find today's existing lead, distinguish it from an inspected
area, and get back to it without changing the campaign?**

Proposed first slice: a compact current-lead strip and a large, keyboard/touch
reachable “Show lead” action, plus explicit selected-area and availability
labels. Use a presentation-only inspection focus. Keep all canonical geography
and the current scheduled story. Do not introduce route costs, extra markers,
new mission content or a new battle default in this slice.

Acceptance: inspect an active, locked and landmark area; return to the lead;
compare cash/stock/time/choices/market observations before and after inspection;
complete the existing purchase and sale through visible controls; reload and
repeat. Show only known contacts and completed-encounter memory, not hidden
future outcomes or a misleading “visited” claim from `seen`. Exercise phone
portrait/landscape and keyboard/controller focus where implemented.

After that: M2 makes the Paper Bag journey meaningful using an explicit
preview/cancel/commit/presence contract. The time boundary in atlas D002 is
still unresolved; do not invent it or spend the scheduled story block twice.
M3–M6 add contact, authored alternatives, one-time consequences and revisits,
with multiple builds per checkpoint as needed.

## Port / remaining gates

No runtime, save migration or Godot change is made in M0. Godot's next handoff
must preserve canonical IDs and separate inspection, presence and scheduled
lead; read current Godot code before assuming its implementation matches this
browser audit. A/C comparison, D002 time semantics, D004 Arvo venue, D005
courtyard binding, physical Pixel/iPad and owner visual/play acceptance remain
open. External models remain parked. M0 deliberately does not create a C.20
or claim navigation is implemented.
