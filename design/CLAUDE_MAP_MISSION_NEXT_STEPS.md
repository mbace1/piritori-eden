# Claude execution brief — map and mission continuation

Updated: 2026-09-24. **Handoff and implementation brief, not completed gameplay.**
Read [CLAUDE_TAKEOVER.md](../CLAUDE_TAKEOVER.md) for verified refs and startup.
This supplements the existing design authority; it does not replace the GDD,
Art Bible, scenario atlas, save contract or battle implementation decision.

## 1. First deliverable: clean M1 inside the existing application

Question: can the player look around without silently moving Aatami or learning
remote prices? Complete this before implementing M2 or adding mission content.

Start a fresh, single-purpose branch from current `origin/main`. On 2026-09-24,
main already contains C.19 and the later existing-fighter repair, and its city
header is v4.51. Do not copy the older v4.48 application over it. Read the actual
current files and recent shared-file commits before editing.

PR #91 is an unmerged, unsuccessful overlay candidate, not the starting
implementation to publish. Preserve it as reference. The continuation direction
is to put the inspection/presence split in `web/js/v3/app.js`, not another
MutationObserver overlay, timer, delayed import or production call to debug APIs.
Once a replacement is reviewed, explicitly mark #91 superseded; do not erase its
history or quietly merge the old overlay.

### Minimal behavior contract

| Concern | Contract |
| --- | --- |
| Presence | Existing `state.selectedAnchor` remains the active location for access. M1 retains existing schedule movement until the separate M2 transition change. |
| Inspection | Add a local `inspectionFocus`; do not save it in campaign state. Map selection, keyboard activation and Show lead update this cursor only. |
| Story lead | Derive it from `currentSchedule`; it is not the inspection cursor or necessarily the active location. |
| Use area | Explicit compatibility action that validates an available anchor, deliberately changes presence and observes that area. M1 spends no new travel block. Explain that limitation in the UI. |
| Show lead | Select the current authored lead for inspection. No movement, quote refresh, reward, reveal of a future encounter, or schedule advance. |
| Availability | Visits, purchases, fencing, chapter operations and actionable encounters remain tied to presence and their existing prerequisites. |
| Routes | Preserve route preview and existing route-delivery functionality. Preview cannot move Aatami; pinning a delivery route is not a personal journey. |
| Reset/reload | Inspection is disposable and resets coherently on new campaign, reload, schedule change and debug jump. Preserve saved presence and ordinary player progress. |

Guard the actual entry/action boundaries, not only a visible map button. Inspect
`openEncounter`, mode navigation (`data-mode-target`), encounter choice handlers,
`markSeen`, and visit/shop predicates. Opening the ENCOUNTER tab while operating
elsewhere must not grant remote interaction or new market knowledge. A disabled
map button is insufficient if another route reaches the same action.

Locked/teaser anchors remain inspectable but unusable. Inspecting a landmark is
not an economic event. Preserve the explicitly isolated training fixture and
its reachable test controls; do not invent a transport edge to Hermanni merely
to make a generic route assertion pass.

Keep the existing materials, responsive layout and art identity. Identify lead,
presence and inspection with text/shape as well as visual emphasis. Do not add a
large competing panel or redraw the whole map to solve one navigation problem.
No new runtime dependency, build configuration, economy, combat rule or asset.

### Files to inspect, then change only as needed

- `web/js/v3/app.js`: `anchorSvg`, route rendering/planning, `handleRootClick`,
  `openEncounter`, mode navigation, boot/reset and pause/debug jumps.
- `web/js/v3/state.js`: `advanceSchedule`, encounter settlement, access predicates,
  `commitRoute`, `sendOnRoute`. Read in M1; transition changes belong to M2.
- `web/js/v3/board.js`: `markSeen`, observed-price history and knowledge decay.
- `web/js/v3/visits.js`: introduction, location, completion and repeat guards.
- `web/js/v3/content.js`: loaded data, asset paths and schematic `shortestPath`.
- `web/index.html`, `web/v3.css`, `web/js/v3/pause.js`: existing entry/layout;
  keep the displayed version, pause version and changed import tokens consistent.
- `content/era1-slice-v1.json`, `map/kallio-era1-2003-v1.json`: preserve IDs and
  authored outcomes. A nearby site does not become its own independent market.

Do not change `render3d.js` or replace models in this navigation task. Preserve
the main-branch PR #92 unit/armature-transform fix and its regression coverage.

### M1 acceptance — all are required, none are claimed passed here

1. Cold start -> content warning -> Begin -> real map. Resume must also work.
   Save console errors, failed requests and a screenshot/DOM snapshot on failure.
2. Inspect an active area, a locked area and a landmark using actual controls.
   Compare the entire serialized campaign and persisted save before/after:
   unchanged cash, stock, time, choices, flags, location and market observations.
3. Show lead has the same no-state-change guarantee. Use area, separately,
   changes only the intended access/observation state and preserves the clock.
4. While present away from the lead, try BOTH the map action and the ENCOUNTER
   tab. No remote choice or quote leak. Return explicitly, then interact.
5. Preview/cancel a route without changing state. Pin the existing delivery route
   intentionally; verify this does not masquerade as personal travel.
6. Play the opening purchase and sale: cash 160 -> 115 -> 183; stock 0 -> 1 -> 0.
   Reload along the path and reject duplicate settlement. This is the existing
   M1 story progression, not proof that M2 travel exists.
7. Exercise an introduced Jaska or Slomo return visit through map/area controls,
   including leaving and revisiting. Debug setup may create a clearly labelled
   prerequisite fixture; never use it for the action being tested.
8. Exercise touch portrait and landscape plus keyboard activation; controller
   behavior only where implemented. Check visible/reachable controls, minimum
   touch sizing and screenshot readability. Repeat Begin/reset/Resume to catch
   initialization or stale-cursor regressions.

## 2. Next separate deliverable: M2 Paper Bag travel

Question: can the player preview, cancel and commit an understandable journey,
then complete the existing sale without duplicated time or rewards?

Opening route: **Piritori purchase -> Siltasaari lead -> journey -> first sale**.
After the existing story transition, the lead may advance to Siltasaari, but
presence must remain Piritori until travel is committed. Display both facts.

- Inspect destination -> preview the existing connected route -> Travel / Cancel.
- Preview and Cancel do not persist a journey or change money, stock, time, seed,
  location, prices or mission result.
- Commit revalidates origin, destination, current phase, reachability and access.
  Apply arrival once; only then activate destination interactions/observation.
- Reject sealed, unknown, disconnected and stale previews. No travel during an
  active battle or other incompatible state. Double taps cannot settle twice.
- Reload before commitment leaves the player at origin; reload after arrival
  preserves destination. A discarded preview does not become a saved journey.
- Keep route-delivery `commitRoute`/`sendOnRoute` and personal movement distinct.
  Never grant a delivery payout simply by travelling the same path.

### Time and knowledge: do not invent missing rules

D002 in the scenario atlas is unresolved. Preserve the existing story-clock
charge for this thin slice; do not charge another day/night block, fare or
random complication without a separate authored decision. Show the current
prototype's actual cost and identify unfinished time/risk balancing honestly.
This is not approval of unlimited free travel as the final design.

Audit all schedule-advance call sites, aftermath, encounter entry and boot-time
`seen` seeding. Removing `advanceSchedule`'s relocation is not sufficient if boot
still grants quotes for every previously scheduled place, or an encounter tab
still enters a remote location. Knowledge must reflect an actual observation,
not a lead or a schedule index. Do not discard earned observations from old saves;
any save migration needs explicit tests and a documented compatibility decision.

Keep all later authored story locations reachable after the shared transition
change. Update the full played route for explicit arrival instead of weakening
the test or restoring teleportation solely for the test.

### One owner for money and mission consequences

The existing encounter chain pays the sale once: 160 - 45 + 68 = 183 euros,
with 23 euros of margin and no pack remaining. The mission record separately
contains `cash:+23`; applying that as an extra packet would double the margin.
Do not bolt on the disconnected mission-step engine just to display progress.

M2 passes only when actual controls prove purchase -> preview -> cancel ->
preview -> commit -> arrival -> sale -> reload, with duplicate-input protection,
exact money/stock transitions, honest presence/lead labels, and no hidden second
clock charge. Also test the authored decline/deferred-purchase path and onward
progression; a player who does not buy must not be trapped.

## 3. Testing and diagnostic discipline

First run the current baseline before editing. Record its commit and failures.
Use the existing tooling; do not create another CI workflow that patches runtime
files. Run locally to diagnose, batch a coherent commit, then use the existing
CI checks on that exact commit. Avoid repeated blind pushes and tight polling.
A green model test is not a passing interface or a physical-device acceptance.

From the source root, existing checks include:

```sh
node map/validate-map.mjs
node content/validate-slice.mjs
node web/test/v3-contract.mjs
node web/test/v3-state.mjs
node web/test/visits.mjs
node web/test/chapter-narrative.mjs
node web/test/scene-content.mjs
node --check web/js/v3/app.js
node web/test/v3-playthrough.cjs
```

The browser gate requires the existing Playwright test environment; use the
checkout/CI's installed dependency path, not a new runtime dependency. For
`act1-scenes.cjs`, use its documented file server and environment in
`.github/workflows/gates.yml`. Add focused M1/M2 cases to an appropriate existing
test or replace the failed candidate test deliberately. PR #91's tests are
reference material, not automatically valid tests for a clean main checkout.
Do not pin the new tests to old city v4.48/v4.49 labels.

Run the documented Godot/data/locale and relevant campaign/C regression gates
before a playable merge. Record main's known transit-data check issue from PR
#92 if it reproduces; do not waive a red gate or casually rewrite map canon.
Separate reproduction/root cause from a proposed repair and keep scope explicit.

If two attempts fail, capture the exact first failure and reassess the cause
rather than stacking loaders, observers or retry logic. A timeout at a selector
does not prove a loader race. Existing debug hooks may set up fixtures, never
manufacture the action/outcome under test. Never silently remove a failing check.

## 4. Later work — multiple small iterations, not one expansion

After M2, first make Paper Bag's outcome and return visits understandable and
persistent. Then connect one existing contact/opportunity and one authored
mission with peaceful, avoidance/withdrawal and escalation alternatives where
authored. A modest travel complication is a later proposed slice, not an existing
implemented feature or permission to invent a global encounter director.

Escalation preserves people, place and narrative context; resolve battle effects
through the shared campaign boundary. Do not silently choose C over A/Turf.
Slomo and Arvo are not generic combatants. Do not relocate Jaska's Scene Club to
hide the D005 courtyard/site-parent conflict, or invent Arvo's D004 venue.

Use the original programme's M0–M6 numbering: M3 contact, M4 alternatives,
M5 consequences, M6 revisit. The shorter conversation summary grouped Paper Bag
polish under M3; that shorthand does not replace the existing programme. The
actual playable question and acceptance conditions matter more than labels.
Only add another location/mission after the current loop is clear and useful to
revisit. The later short-chapter target is not a quota or final map design.

## 5. Delivery and Claude's closing report

For each playable batch: tested source commit -> reviewed source integration ->
matching scoped Suds Jack cabinet -> actual public hub route -> evidence ->
Godot port note. Inspect both hub `main` and `gh-pages` before packaging; the M0
report documented a stale city copy in main. Do not overwrite later live work,
copy the entire hub, or use the Night Shift packager as an unexamined city builder.
Preserve Night Shift C.19 and every unrelated game/rollback.

Record city title/header/pause/card/bridge/version/import-cache agreement. Follow
`design/HUB_RELEASE.md` together with the actual city packaging code and the hub's
`AGENTS.md`, deployment specification and `.claude/skills/hub-release/SKILL.md`.
C.19 and Act I v4.x are separate release identities. Choose the next available
city version from current source; this document allocates none.

Keep source committed, tests passed, PR merged, Pages deployed, public route
checked, physical Pixel/iPad acceptance and owner visual/gameplay approval as
separate statuses. Godot is a behavior/presentation port handoff until actually
implemented and tested. Keep external models and paid generation parked.

Use the established three-line player test brief, supplemented in repository
receipts with exact commits/checks and unresolved gates:

```text
CHANGED: <one visible result and source/release status>
TEST: <actual reachable hub -> mode -> action path>
LOOK FOR: <expected behavior, remaining limitations and next bounded task>
```

No code was implemented, test suite rerun, model promoted or playable published
by this documentation task. Continue with clean M1, not all remaining checkpoints
in one unreviewable change.
