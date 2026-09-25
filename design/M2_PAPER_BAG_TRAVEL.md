# M2 — Paper Bag travel: checkpoint receipt

Date: 2026-09-24
Status: **source implemented and tested on a feature branch; not merged, not published.**
Brief: [CLAUDE_MAP_MISSION_NEXT_STEPS.md](CLAUDE_MAP_MISSION_NEXT_STEPS.md) §2 ·
previous checkpoint: [M1_CLEAN_INSPECTION.md](M1_CLEAN_INSPECTION.md)

## Tested source

| | |
|---|---|
| Baseline | `main` at `6ff36a5` (M1 merged, Act I v4.52) |
| Branch | `feat/m2-paper-bag-travel` |
| Tested commit | `dc6e53f` — *M2: Paper Bag travel — the story moves the lead, not Aatami (v4.53)* |
| City version | **Act I v4.53** in the header, pause menu and `VERSIONS.md` |
| New | `web/js/v3/journey.js`, `web/test/m2-journey.cjs` |
| Changed behaviour | `web/js/v3/state.js` (`advanceSchedule`), `web/js/v3/app.js`, `web/v3.css` |
| Token-only | the importers of `state.js` (battle, visits, fight-module, crew-run) and their pages and tests: one token per module |
| Untouched | `render3d.js` and PR #92's repair, `board.js`, `visits.js` logic, content, map, save format |

## What changed

| Concern | Now |
|---|---|
| Schedule | A finished story beat moves the **lead** only. Aatami stays where he is. |
| Journey | Inspect an active area → **TRAVEL HERE** → the preview draws the connected public path (thin dashed cream, apart from the cyan delivery route) and states the cost → **TRAVEL** or **CANCEL**. |
| Preview | Local, never saved. Making one, cancelling it, reloading before commit or moving the inspection cursor changes nothing. |
| Commit | Revalidates the origin, the block, the destination and the path. Then it applies arrival once: presence, one observation of the destination, one log line. A stale or replayed plan is refused and moves nobody. The handler also drops the plan before committing, so a double tap finds nothing to commit. |
| Refusals | unknown, sealed (locked, teaser, landmark, training), already-here, campaign-over, in-battle, in-visit, disconnected. Each has its own words in the UI. |
| Time and money | **D002 is unresolved, so a journey costs no extra block, fare or complication**, and the preview says so. The story clock moves only when a story beat ends, as before. The opening reads €160 → €115 → €183: one €23 profit and no second clock charge. |
| USE AREA | Removed; TRAVEL replaces it. |
| Route delivery | `commitRoute`/`sendOnRoute` are untouched. A journey never touches `state.route`, and pinning a route never moves Aatami. |
| Boot | No longer re-stamps every past schedule anchor as freshly seen, which also rewrote the age of old observations. It records presence only if it was never seen. Old saves keep `seen` exactly. |

Every later story lead is reachable by a journey. The audit found 1–3 hops from
the previous lead, all active, including the chapter ending at Sörnäinen harbour.
The full-route gate below proves it by walking the route.

## Evidence

**`web/test/m2-journey.cjs`: 47 passed, 0 failed.** Every action goes through
visible controls: click, double tap, touch tap and reload. No debug hook is used.

| Brief requirement | Covered by |
|---|---|
| purchase → lead moves, Aatami stays, panel shows both | A: 160 → 115; `AATAMI · PIRITORI` / `STORY LEAD · SILTASAARI`; no Enter from Piritori; Siltasaari prices still unknown |
| preview → cancel → preview → commit | A: preview names `piritori>siltasaari`, draws `.map-journey`, says the cost; preview and cancel leave the whole campaign and save identical |
| stale / reload before commit | A: a reload drops the plan; looking elsewhere discards it and it does not come back |
| duplicate input | A: a real double tap on TRAVEL arrives once, with one log line and the same block, cash and stock |
| arrival → sale → reload | A: arrival observes Siltasaari; reload keeps presence, €115 and one pack; sale €115 → €183; reload keeps it; not settled twice |
| onward progression | A: next lead Mäkelänsilta, Aatami stays at Siltasaari, travel enables it |
| decline / deferred purchase | B: walk (€160) → the lead still moves → buy from the ledger where Aatami stands (€115) → travel → sell (€183). C: walk → travel → abort (spends nothing) → the next lead is reachable by travel |
| route delivery is not travel | D: after pinning a route, a journey leaves the route byte-identical and costs nothing |
| sealed / landmark | A: no locked, teaser or landmark area offers TRAVEL |
| touch | E: portrait and landscape; the preview is reachable, and cancel by tap moves nobody |

**Other gates on the same tree:**

- `v3-state.mjs` walks the whole played route with an explicit journey to every
  lead, and asserts none costs money, stock or a block.
- It holds the journey contract in bare node: a pure preview; the
  unknown/already-here/sealed/disconnected/in-visit/in-battle/campaign-over
  refusals; stale on a turned block; a replay refused; and a save round trip.
- Mutation-checked:
  - dropping the stale check fails it;
  - restoring the schedule relocation fails it.
- `m1-inspection.cjs`: 70/70. It now travels where it used to Use area, and
  checks that a planned journey is not yet arrival.
- `check-project`: 13/13.
- These pass:
  - v3-contract, scene-content, visits, v3-battle and chapter-narrative;
  - crew-run, tactics, c17/c18 contracts, fight-module, arena-lab, bear-path
    and c19-readability;
  - the map and slice validators, Godot data sync and map geometry, and locale;
  - `act1-scenes.cjs`, at 412 and 1180 px.
- `v3-playthrough.cjs`: **19 passed / 3 failed**. The 3 failures are the same
  ones on `main` (the Toko viewport QUEUE item twice, and the circular save in
  battle). Its opening now travels to Siltasaari explicitly.

Screenshots of the preview were checked at 1280 × 820 and 390 × 844.

## CI

[gates run 36015540528](https://github.com/mbace1/piritori-eden/actions/runs/36015540528) on `dc6e53f`: **all 8 jobs succeeded**:

- the Godot build, including the seven-day slice playthrough;
- browser campaign state (v3-state's full route with explicit journeys);
- Act I touch scenes and visits, **including M1 and the new M2 step**;
- C laboratory;
- C crew outing (which exercises the token cascade);
- the three C art and camera jobs.

`v3-playthrough.cjs` is not part of CI; its local result is recorded above.

## Hub status (unchanged by M2; nothing deployed)

The hub's `piritori/` city cabinet still serves **Act I v4.48**; `hub/versions.json` `piritori` = 4.48. It has neither PR #92, M1 nor M2. piritori-eden's own Pages deploys `main` on push, so it will carry v4.53 once this branch merges; that is a preview URL, not the cabinet. Night Shift (C.19) is a separate runtime and untouched. The hub release (v4.48 → current) stays its own scoped step under `design/HUB_RELEASE.md`.

## Open gates

- Physical-device and owner play acceptance: **not done**.
- D002 (travel time, fare, risk): **open**. This build deliberately invents none.
- Godot port: behaviour handoff in `VERSIONS.md` v4.53's Port block.
- Pre-existing, outside M2: the circular save in battle; the Toko viewport QUEUE item.

```text
CHANGED: Aatami now travels himself — the story moves the lead, you walk there (Act I v4.53, source branch feat/m2-paper-bag-travel; not on the hub yet).
TEST: Begin -> buy the first bag -> Continue -> tap Siltasaari -> TRAVEL HERE -> Cancel / TRAVEL -> sell.
LOOK FOR: after buying he stays at Piritori while the lead moves; the dashed path and cost line; €160 → €115 → €183; no clock or cash charge for walking.
```
