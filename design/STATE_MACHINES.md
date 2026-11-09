# State machines: the map, what is explicit, and the queue

Owner, 2026-11-09: *"Find all of the implicit state machines in my app. Make the best decision that will elevate all three: the user experience (UX), developer experience (DX), and agent experience (AX) always, without breaking anything."*

An **implicit state machine** is a value that moves through states, where neither the set of states nor the allowed moves is written in one place. Instead they live in string literals, booleans and nullable fields assigned in scattered code. Three read-only audits on 2026-11-09 found **30** of them:
- the city (`web/js/v3/`);
- Night Shift and the outing handoff (`web/crew-run/`, `outing.js`);
- the fight engine (`web/fight-module/`, `web/js/v3/battle.js`).

## The decision (v4.100)

**Convert one machine at a time, starting where a bug costs the player their campaign. Never rewrite them all at once.** A big rewrite would break things, and it would collide with Codex's open work (PR #132 rewrites `app.js`, `fight-module/main.js` and `crew-run/ui.js`). v4.100 does four things:

1. **One primitive, `web/js/v3/machine.js`.**
   - `machine(name, table)` declares a machine, where the table is `{ state: { event: nextState } }`. A table that points at an undeclared state fails when it loads.
   - `step(m, from, event)` answers whether a move is allowed, with a reason, and never mutates.
   - `describe(m)` prints the table as lines.
2. **M1, the outing**, becomes a declared table with one function that moves it. This removes the fight that was paid twice.
3. **M2, the city's screen**, gets its screens and rules in one module. This removes the permanent travel lock and the blank map after a road fight, and moves the fight screen's "finish first" rule out of the stylesheet into the state.
4. **This file is the map.** `web/test/machines.mjs` fails if a declared table and this file disagree.

**Why each reader gains:**
- **UX:** three bugs a player could hit are gone: the fight paid twice, the permanent travel lock, and the blank map. Saves already broken by the travel lock are repaired when they load.
- **DX:** each machine has one place to read and one function to call, and a refusal comes back with a reason instead of a silent overwrite.
- **AX:** an agent finds every explicit machine with `grep machine(`, reads its moves here, and gets a named refusal ("outing: settle is not allowed from none") instead of a corrupted save.

### Rules for converting the next one

1. Declare it with `machine()` in the module that owns the state. Only one function moves it, and a refusal changes nothing.
2. **Write the failing test first.** It must reproduce the fault on the old code, as `c19-outing.mjs` and `machines.mjs` do for M1 and M2.
3. Keep the storage shape when you can, so old saves load. Where a save can be broken, repair it as it is read, as `settleScreen` does.
4. List its moves here in backticks; `machines.mjs` checks them.
5. One machine per release. Do not convert one in a file another lane is rewriting until that lane lands.

## Explicit now

### M1. The outing, across both apps (`web/js/v3/outing.js` `OUTING`, `moveOuting`)
- **Stored as** `state.outing.status`: `open` or `settled`, or no outing (`none`).
- **The only moves:**
  - `none --open--> open`: Act I raises the fight (a door, the road or a mission). Called from app.js `startOuting`, `startRoadOuting` and `startMissionOuting`.
  - `open --settle--> settled`: Night Shift writes its receipt (campaign-adapter.js `applyCampaignReceipt`).
  - `open --board--> none`: Act I fights it on its own board instead (app.js `fightOutingOnBoard`).
  - `settled --pay--> none`: Act I pays the stakes and turns the block (app.js `settleReturnedOuting`).
- **Fixed in v4.100:**
  - **A fight was paid twice.** The path: begin it in Night Shift, press Back, fight it on the board, press Forward. Night Shift resumed its saved fight (run.js `loadRun` never asked the campaign). Its receipt then fell through to the C.17 branch and hurt and aged the crew a second time.
  - Now a receipt lands only on its own outing while that outing is still open.
  - Night Shift resumes a fight only while the campaign still has it open; a finished result can still be shown.
  - When Back or Forward restores the city page from memory, the page reads the save again instead of writing its old copy over Night Shift's.
  - Pinned by `c19-outing.mjs` ("one outing, one result"), which fails on v4.99 at both guards separately.
- **Still open:**
  - If the campaign save cannot be read at the moment Night Shift settles, the outing stays open; there is no retry (run.js `settle`).
  - `?outing=board` stays in the URL, so Back into that history entry boards whatever outing is open then. The table makes that need an open outing, but it should not happen at all.

### M2. The city's screen (`web/js/v3/screens.js`: `SCREENS`, `settleScreen`, `enterScreen`)
- **Screens:** `route`, `encounter`, `visit`, `news`, `battle`, `road`, `outing`, `shop`, `case`, `ramen`, `ledger`.
- **Rules that hold whatever screen was asked for** (`settleScreen`, called by `render()`):
  - an unknown screen is the map;
  - a pending road event holds the screen, except over a fight;
  - an open outing holds it;
  - a road screen with nothing on it is the map;
  - a visit is closed whenever its own screen is left.
- **The nav bar** goes through `enterScreen`, which keeps a finished fight's result on the table until it is finished.
- **Fixed in v4.100:**
  - **Travel locked for good.** Leaving a visit by the nav bar kept `activeVisit`, and every journey was refused ('in-visit') for the rest of the campaign. A save already locked is repaired as it is read.
  - **A blank map after a road fight.** The screen stayed `road` with nothing on it, so the map's relief never mounted.
  - **Guarded, though a player could not reach it: a block turned twice, or a result was lost.**
    - Leaving a finished fight's result card by the nav bar offered 'advance' on the encounter screen. Finishing the fight later turned the block again, and the next fight overwrote the unfinished one.
    - The audit reported this as a player bug. It is not one today: `v3.css` hides the nav bar over a fight (UX_SPEC §3.2).
    - That rule lived only in a stylesheet, and PR #132 replaces stylesheets, so it now lives in the state too.
  - Pinned by `machines.mjs` and, as a player meets it, `screens-browser.cjs`. The browser test fails on v4.99 at the visit.
- **Still open:** about 45 places write `state.mode` directly. Converting them to a full table, with each screen's exit, is the next step for M2.

### M3. Crew status (`web/js/v3/state.js`: `CREW`, `crewState`, `moveCrew`, `battleCrew`, `settleCrew`), v4.101
- **Stored as before**, so every save loads: `crewStatus[id].status` and `.critical`, plus the `recruited`, `arrestedCrew` and `retiredCrew` lists.
- `crewState` reads them as one state; the lists win over the status string. `missing` in `status` means arrested on `arrestedCrew` and lost (still on the roster) otherwise.
- **States:** `available`, `wounded`, `critical`, `missing`, `arrested`, `retired`, `dead`.
- **The only moves:**
  - from `available`: `available --wound--> wounded`, `available --maim--> critical`, `available --lose--> missing`, `available --arrest--> arrested`, `available --retire--> retired`;
  - from `wounded`: `wounded --wound--> wounded`, `wounded --maim--> critical`, `wounded --lose--> missing`, `wounded --arrest--> arrested`, `wounded --retire--> retired`;
  - from `critical`: `critical --wound--> critical`, `critical --maim--> critical`, `critical --treat--> wounded`, `critical --lose--> missing`, `critical --arrest--> arrested`;
  - `missing --rescue--> wounded` and `arrested --bail--> available`.
  - `dead` is written only by the chapter's ending (M11), which the shipped game cannot reach yet.
- **Who moves it:**
  - the board's consequences (app.js `recordBattleConsequences` → `battleCrew`);
  - Night Shift's receipt (campaign-adapter.js `applyCampaignReceipt`);
  - the effects `rescue:missing`, `bail:arrested` and `resolve-critical-wound:one`;
  - `ageCrew` (`retire`).
- **Fixed in v4.101:**
  - **A critical person hurt again read "wounded".** The card said WOUNDED while the ending counted them dead. The board now keeps them critical, as Night Shift already did.
  - **An arrested person stayed critical**, so the ending counted them among the dead. An arrest clears it, as Night Shift's receipt already did.
  - **Arrested and retired at once.** `ageCrew` aged and retired someone the police had just taken. Bail then brought back a person still counted as retired, who never aged again. The arrested now neither age for that fight nor retire.
  - **Retirement waits while someone is critical or missing.** The fight still counts, and they retire after their next one, so a critical wound stays treatable and the missing stay findable. Before, someone could retire while critical, missing or arrested.
  - A save written before v4.101 is put back on a row of the table as it loads.
  - These depart from Godot's `age_crew` on purpose; Godot is paused, and the port takes them when it resumes.
  - Pinned by `machines.mjs`, which fails on v4.100.

## The queue (implicit; ranked by what a fault costs the player)

The faults below were found by reading the code in the 9 November audit. Each will be reproduced by a failing test before it is fixed.

| # | Machine | Where | What can go wrong |
|---|---|---|---|
| M4 | The block turn (`advanceAndSettle`) and the night's road-event slot | app.js, standing.js, story.js | No preconditions. **Fixed in v4.102:** a family's demand on the night the cut is found out waits for the next free night instead of being lost. |
| M5 | The police in a fight | resolver.js, battle.js, run.js, session.js | Three implementations. After the answer the fight module ends the fight while Act I continues it. A helper can be "taken" but still alive. The posture is not validated. A Withdraw while the police are announced leaves `police.taken` empty. |
| M6 | Fight outcome and phase | resolver.js, battle.js, tactics.js, run.js | `resolved` vs `complete`. The win/loss rule is written three times and the talk gate three ways. The phase stays `enemy` after a loss. The battle.js fork has drifted: an enemy with no legal target still hits. |
| M7 | Unit life | run.js, tactics.js | About ten booleans (`alive`, `home`, `evacuated`, `taken`, `fled`, …), each reader decoding them differently. |
| M8 | Night Shift run (`phase`, `active`, `last`, and the mode) | run.js, ui.js | `?campaign=1` without an outing takes over the ordinary save. A rules change strands a mid-fight outing ('gone'). The phase is not tied to `active`/`last`. |
| M9 | How a fight ended (`m.end`, `withdraw`) | run.js, tactics.js, outing.js | `withdraw` means "you pulled out", "some got out" and "the police ended it". |
| M10 | The road event (`state.road`) | road.js | **Fixed in v4.102:** a pending event no longer in content is dropped as the save loads (`settleRoad`); it locked the road screen for good. |
| M11 | The chapter ending | state.js, chapter.js | `turnChapter` and `endingId` cannot be reached in the shipped game. `doors.taken` is not reset. |
| M12 | D002 time (`state.time`) | state.js, toko.js | Toko's counter is never charged. The road clock and the pips are two clocks. |
| M13 | A battle from the city (`state.battle`) | app.js | `startBattle` overwrites an unfinished battle. Training can start over a mission battle. A mission's stakes are skipped if its fight cannot start. |
| M14 | The command flow (action → target → preview → commit) | fight-module main.js, tactical-ui.js | A view function cancels state. The preview has no actor. |
| M15 | Busy and presentation locks | fight-module main.js | Seven flags. A render error reuses `graphicsPreparing`. |
| M16 | Turn budget and selection | resolver.js, tactics.js | The rules differ between engines. Selection can stay on a spent unit. |
| M17 | Camera preset | fight-module main.js | Rotating keeps the highlighted preset, which is then wrong. |
| M18 | URL parameters (`?outing=`, `?campaign=`, `?skip`) | app.js, run.js, startup.js | `?outing=board` is never removed (see M1). |
| M19 | The route pin and the planner | state.js, app.js | No way to unpin. The planner's local state survives a new campaign. |
| M20 | Mission status | state.js, battle.js, outing.js | Can be overwritten. Results are mapped to missions in two places. |
| M21 | Kello's cut | story.js | The found-out event cannot repeat, which leaves an undeclared "defended" state. |
| M22 | Family standing rungs | standing.js | The rung order is copied into code. |
| M23 | Flags used as states | state.js | `battle-negotiation-open` is set and never read. |
| M24 | City UI locals (`talkSetAside`) | app.js | Never reset. **Fixed in v4.102:** Toko's line (`tokoTold`) is now the save's, per block (`toko.js` `tokoSaid`). |
| M25 | The save itself | state.js | `STATE_VERSION` has stayed 3 while fields were added. A mismatch silently starts a new campaign. |
| M26 | Journey preview → commit | journey.js | Sound: local, cleared before commit, revalidated. |
| M27 | Crew lock, objective, carrier | run.js, ui.js | The carrier has two representations, and the brief's "Sides" counts a different crew from the fight's. |
| M28 | Counters: `fightsByDay` and heat | state.js, run.js, ui.js | Two police thresholds: 5 for rescues, 6 for outings. |
| M29 | Stance | stance.js | Already explicit (one declaration, a validated setter). |
| M30 | Mid-fight reload | session.js, run.js | Sound by replay. The snapshot omits four police fields, so the drift check cannot see them. |

**Next to convert:**
1. **M4, the block turn.**
2. **M5 to M7, the fight**, after Codex's PR #132 lands, since it rewrites the fight module's UI.
