# M1 — clean inspection/presence split: checkpoint receipt

Date: 2026-09-24
Status: **source implemented and tested on a feature branch; not merged, not published.**
Brief: [CLAUDE_MAP_MISSION_NEXT_STEPS.md](CLAUDE_MAP_MISSION_NEXT_STEPS.md) §1 ·
takeover: [CLAUDE_TAKEOVER.md](../CLAUDE_TAKEOVER.md)

## Tested source

| | |
|---|---|
| Baseline | `main` at `652d704` (C.19 merged, PR #92 fighter repair, Act I v4.51) |
| Branch | `feat/m1-clean-inspection`, one commit on `main` |
| Tested commit | `d0f6d6f` — *M1: looking is not being there — inspection split from presence (v4.52)* |
| City version | **Act I v4.52** in the header, pause menu and `VERSIONS.md`; `app.js?v=15`, `v3.css?v=6` |
| Changed files | `web/js/v3/app.js`, `web/v3.css`, `web/index.html`, `web/test/m1-inspection.cjs` (new), `web/test/v3-contract.mjs`, `web/test/scene-content.mjs`, `.github/workflows/gates.yml`, `VERSIONS.md` |
| Untouched | `render3d.js` and the PR #92 repair, `state.js`, `board.js`, `visits.js`, content, map, saves |

PR #91's overlay (`feat/m1-navigation-orientation`, `d6aa85a`) was not used, copied
or merged. It stays as reference and should be marked superseded once this branch
is reviewed.

## What was wrong, reproduced before any edit

On unmodified `main` (`652d704`), through visible controls:

- Tapping **any** map area moved Aatami there (`state.selectedAnchor`), recorded
  its prices (`markSeen`) and rewrote the save. That included a sealed area
  (Alppiharju) and a landmark (Kallion kirkko). The M1 gate fails 11 checks on
  that tree.
- Standing at Hakaniemi, the **ENCOUNTER tab** rendered Piritori's first-bag
  encounter with all three choices, and **Buy worked remotely**: cash went
  160 → 115 while Aatami stood at Hakaniemi.
- The **ledger** offered BUY/SELL on every revealed offer anywhere, with no
  presence check. `MARKET.md` §5/§8: you trade where you stand; the ledger records.

## What changed

| Concern | Now |
|---|---|
| Inspection | A local cursor in `app.js`, never saved. Map click, tap and keyboard move only it. It resets on a new campaign, Begin-over-save, Resume, reload, a schedule change and any debug jump. |
| Presence | `state.selectedAnchor`, unchanged in meaning and save format. |
| Story lead | Derived from `currentSchedule`; shown separately. |
| USE AREA | The one deliberate move. Active areas only (not sealed, landmark or training). Sets presence, records that one observation, spends no time or money, persists, and says in the UI that priced travel comes later. |
| SHOW LEAD | Points the cursor at the lead. Changes nothing. |
| Guards | `openEncounter`; encounter `choose` and LOOK; the ENCOUNTER tab, which now shows an away screen with the lead's name and a MAP button (the mode nav is hidden in encounter mode by design); ledger trades. Visits and fencing were already presence-based and are shown only when inspecting where Aatami stands. |
| Legibility | Words: `YOU ARE HERE` / `INSPECTING`, plus `AATAMI · …` and `STORY LEAD · …` on the panel, and `you are here` / `story lead` / `inspecting` in each node's accessible label. Shapes: presence is a dashed diamond, the lead the existing orange pulse, inspection the existing cyan ring. |

**Kept on purpose, for M2 or later:**

- The schedule still moves Aatami to the next lead after a story beat.
- Boot still seeds observations for every past schedule anchor (the M2 audit).
- No travel cost (D002 unresolved).
- Route preview, pin and send are unchanged. The Hermanni training fixture keeps
  its own button.

## Evidence

`web/test/m1-inspection.cjs` — **63 passed, 0 failed** on `d0f6d6f`. Every action
goes through a visible control. The whole serialized campaign and the whole
`localStorage` are compared before and after. The only debug call is one labelled
prerequisite fixture: Toko's earlier encounter marked as answered. Reaching the
visit is the action under test.

| Brief case | Covered by |
|---|---|
| 1 Cold start → Begin → map; Resume | cold start, Resume after reloads, no browser errors (one known `hub/shell.js` 404 forgiven exactly) |
| 2 Inspect active / locked / landmark → nothing changes | all three, state and save byte-identical; no USE AREA on sealed or landmark |
| 3 Show lead no-op; Use area changes only presence + observation | both; clock, cash and stock unchanged; everything but `selectedAnchor`/`seen` identical; persisted |
| 4 Map action AND ENCOUNTER tab away from the lead | no Enter; the tab shows no choice or LOOK and changes nothing but the tab; explicit return re-enables Enter |
| 5 Route preview/cancel; pin is not travel | preview draws, cancel leaves state and save identical; pin records the route without moving Aatami, time or cash |
| 6 Purchase and sale 160 → 115 → 183, stock 0 → 1 → 0, reloads, no duplicate | all, with a reload after each; neither settles twice |
| 7 Return visit through map/area controls | inspected from elsewhere: no visit; USE AREA: visit offered; open, leave, reopen, choose; not offered again |
| 8 Touch portrait + landscape, keyboard, Begin/reset/Resume | keyboard Enter inspects with no change; tap inspects; USE AREA and SHOW LEAD ≥ 44 px and reachable; Begin over a save starts clean; Resume clears a stale cursor |

Screenshots of the panel and of the map with all three states apart were checked
at 1280 × 820 and 390 × 844. Lead, presence and inspection read apart without
relying on colour.

**Regression on the same tree:**

- `web/tools/check-project.mjs`: 13/13.
- visits, chapter-narrative, scene-content, crew-run, tactics, c19-readability,
  fight-module, arena-lab and bear-path all pass.
- Godot data sync and locale pass.
- `act1-scenes.cjs` passes: both return visits, with reload and leave, at 412
  and 1180 px.

`v3-playthrough.cjs` reads **17 passed / 3 failed, identical to `main` before the
change** and to both parents of the C.19 merge. Those three are pre-existing, not
M1:

1–2. The Toko scene viewport (`.scene-viewport.toko`) is missing. The test itself
cites `QUEUE.md`'s scene-asset-id drift.

3. **A real save crash in battle.** The real `startBattle` (`app.js`) stores
   `createBattleState(…, state, data)`, which embeds `growth: {state, data}`. So
   `saveState`'s `JSON.stringify` meets a circular structure on any save during
   a battle. Reproduced; out of M1's scope; a separate bounded fix is proposed
   below.

PR #92's note that "the full project check stops at stale map transit data" does
**not** reproduce from committed files, at #92's own base (`c4d2ddf`) or at `main`.
It is most likely local generated data in that session. It is not claimed fixed.

## CI

[gates run 35993821372](https://github.com/mbace1/piritori-eden/actions/runs/35993821372)
on `d0f6d6f`: **all 8 jobs succeeded**:

- the Godot build, including import, data spine, locale, shell, formation
  battle and the seven-day slice;
- browser campaign state;
- Act I touch scenes and visits, **including the new M1 step**;
- C laboratory tactics and touch;
- C crew outing and persistence;
- the three C art and camera jobs.

`v3-playthrough.cjs` is not part of CI; its local result is recorded above.

## Hub status (read 2026-09-24; nothing deployed by this checkpoint)

| Where | What it serves |
|---|---|
| Suds-Jack `gh-pages` `piritori/` (the **Piritori** city cabinet, `act1.html` → `./?v=448`) | **Act I v4.48**, the F01/F02 fighter-test build (`app.js?v=12`). `hub/versions.json` `piritori` = 4.48. It has neither PR #92's repair nor M1. |
| Suds-Jack `main` `piritori/` | Docs plus a bridge `index.html` redirecting to piritori-eden's own Pages (`…/piritori-eden/web/?v=447`). |
| piritori-eden's own Pages | Deploys `main` on every push, so it will carry v4.52 once this branch merges. That is a preview URL, not the hub cabinet. |
| Night Shift (`optionc-lab` → `piritori-c17/`) | C.19, separate runtime, untouched. |

The hub city cabinet is **not** updated by M1. That is a separate scoped release
under `design/HUB_RELEASE.md`: tested source, then a scoped `piritori/` copy, then
the actual public route, then evidence. A note for that release: the owner
answered "retire" to a question that described `piritori/` as the "old v4
cabinet". That framing was wrong. `piritori/` is the Act I city, where map and
mission work ships, so it was not retired.

## Open gates

- Physical Pixel 10 Pro / iPad M2 acceptance, and the owner's visual/play
  acceptance: **not done**. Browser emulation is not a device test.
- Source review and merge of `feat/m1-clean-inspection`; then mark PR #91
  superseded.
- Hub release of the city (v4.48 → v4.52) as its own scoped step.
- Godot port: behaviour handoff only (see `VERSIONS.md` v4.52 Port block).
- Pre-existing, outside M1: the circular save in battle (proposed fix: keep
  `growth` off the serialized state, e.g. rebuild it from `state`/`data` on use
  or make it non-enumerable, with a save round-trip test); the Toko viewport
  QUEUE item.

## Next bounded task

**M2 — Paper Bag travel**, only after this checkpoint is reviewed:

- After the first purchase the lead moves to Siltasaari while Aatami stays at
  Piritori, and the panel shows both.
- Inspect Siltasaari → preview the connected route → Cancel / Travel.
- Arrival is applied once. Sale 115 → 183, then reload, with no second clock
  charge and no second €23.
- Also cover the decline/deferred-purchase path.

```text
CHANGED: The city map now separates looking from being there (Act I v4.52, source branch feat/m1-clean-inspection @ d0f6d6f; not on the hub yet).
TEST: Piritori repo Pages or local web/ -> Begin -> tap any area on the map -> USE AREA / SHOW LEAD; try the ENCOUNTER tab from elsewhere.
LOOK FOR: tapping never moves Aatami or reveals prices; only USE AREA moves him (no time cost yet); encounter, visits and trades only where he stands. Next: M2 Paper Bag travel.
```
