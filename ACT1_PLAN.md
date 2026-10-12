# Act 1 plan: what "feature complete" needs

**Piritori version:** written against `main` at **v4.68** (`5a567bd`). v4.69 is open in PR #100 and not merged; nothing here depends on it.
**Status:** a plan only. Nothing in it is approved work. It changes no code, data or deploy.
**Written:** 2026-10-11.

## How to read this

- Plain words. "Stand-in" means the plain grey fight figure with mitten hands that every playable fight uses now.
- Every requirement cites a file and line, as `FILE:line`. Line numbers are from `5a567bd`.
- **[UNSURE]** marks anything I could not confirm from the repo.
- The order follows the repo's rules: **the design docs and the Godot build lead, and the web hub follows later.** That is the owner's current direction for this plan. Note that `DESIGN_AUTHORITY.md:22` and `PORTING.md` §1 still say "web-first, then a Port block". Q1 asks Mikael to confirm the change so the docs stop disagreeing.
- This file sits in the repo root because that is where the design docs live (there is no `docs/` folder).

## 0. First, what "Act 1" means (the scope problem)

The docs give three sizes for Act 1:

| Source | What it says |
|---|---|
| `ACT_I_NARRATIVE.md:3,13,27,36` | Act I = Chapter 1 (playable) + two *proposed* later chapters, all in 2003 |
| `GAME_DESIGN_DOCUMENT.md:1428-1439` (§16.5) | Era I = three 7-day chapters (The Square, The Route, The Supplier) |
| `DESIGN_AUTHORITY.md:47` + `design/STORY_PITCHES.md:28,35` (H1, H8, greenlit) | an era is 4 chapters of about 10 days; chapter 4 is the Pasila move |
| `DESIGN_LOCKS.md:341-350` (§12.1) | the formal "Era I feature-complete" list: 7 criteria, written for the **seven-day** loop |

The game itself has **one** authored chapter: `chapter-1-piritori`, "What the square is worth", 10 days (`content/era1-slice-v1.json`, `chapters`).

**Working assumption for this plan:** "Act 1 feature complete" means **Chapter 1, played start to finish in Godot, meets every `DESIGN_LOCKS` §12.1 criterion that applies to one chapter, with stand-ins**. Later Act I chapters are left out of scope (Q2). If Mikael wants all of Act I, steps 1–12 still apply and Part 4b adds about four chapters' worth of work.

---

## 1. What Act 1 has to contain

### 1.1 The formal bar (DESIGN_LOCKS §12.1)

| # | Criterion | Source |
|---|---|---|
| F1 | The loop plays from the first purchase through to an Eden (Pasila) outcome | `DESIGN_LOCKS.md:343` |
| F2 | Ordinary and hidden traffic share working route capacity | `DESIGN_LOCKS.md:344` |
| F3 | Location, market, mission, fight and news modes all change the same saved campaign | `DESIGN_LOCKS.md:345-346` |
| F4 | The phone and landscape layouts pass their acceptance checks | `DESIGN_LOCKS.md:347`; `UX_SPEC.md` §6.7, §7.8 |
| F5 | "The approved art pipeline produces registered runtime assets" | `DESIGN_LOCKS.md:348`. **Conflicts with the stand-in lock, see Q3** |
| F6 | Save/resume and the critical accessibility paths work | `DESIGN_LOCKS.md:349`; `GAME_DESIGN_DOCUMENT.md` §20 (l.1695) |
| F7 | The full Era I length has a recorded playtest decision | `DESIGN_LOCKS.md:350`, `:32-35` |

`PHASING.md:471-474` says Phase E (Era I feature-complete) is exactly this list.

### 1.2 Story beats

| Requirement | Source |
|---|---|
| The locked capability order: arrive, first purchase, first sale, first runner, hidden payload, Toko's information, several offers, a team of three, first firearm, first fight, McCormicks and restaurant fronts, delegation, Pasila made possible, leaving Kallio | `GAME_DESIGN_DOCUMENT.md:1377-1392` (§16.1) |
| Chapter 1 people: Jaska (day 2 studio, day 6 pressure, day 7 return), Toko Slomo (day 3 night, noodle bar), Arvo (day 3 bulletin) | `ACT_I_NARRATIVE.md:17-21` |
| Jaska is at Scene Club near Mäkelänsilta, not the old Torkkelinmäki studio | `ACT_I_NARRATIVE.md:25` |
| Toko's place is Tokon Ramen on Vaasankatu, open from day one. He sells information and melee gear. The first handgun stays at Piritori | `DESIGN_AUTHORITY.md:38-44` |
| The Thursday Load thread (G1–G7): Kello, the Jade front at Hakaniemi, the Thursday Tram, briefings, a case board | `DESIGN_AUTHORITY.md:45`; `design/STORY_PITCHES.md:12-19` |
| Days 8–10: The Man Who Stayed, The Families Keep Books, The Shipment | `VERSIONS.md:134-138` (v4.65) |
| The arrival opening sells "Kallio Noir mystery" and money pressure | `DESIGN_AUTHORITY.md:28,36` |
| Jaska, Slomo and Arvo never join random fights or recruitment | `ACT_I_NARRATIVE.md:7` |
| At least one quiet family or neighbourhood beat per chapter | `GAME_DESIGN_DOCUMENT.md:1570` |
| The ending: Pasila's meaning is worked out from debt, exit fund, crew, Jaska, factions, harm, and whether Aatami still does the work | `GAME_DESIGN_DOCUMENT.md:1603-1613` (§17.3) |
| The story is woven by the agent and greenlit by Mikael. Mikael does not write plots | `DESIGN_AUTHORITY.md:42` |

### 1.3 Scenes and places

| Requirement | Source |
|---|---|
| Slice scenes: Piritori first purchase, Toko's Noodles, Jaska's studio, one McCormick venue, the bank counter, one restaurant-front teaser | `GAME_DESIGN_DOCUMENT.md:1836-1842` |
| Key characters have their own nearby places. A lit door means you can go in | `DESIGN_AUTHORITY.md:133-138` |
| A meeting can turn into a fight in the same place with the same people. Talk uses face close-ups | `DESIGN_AUTHORITY.md:124-127` |
| No 3D arena dioramas ("awful + bury fighters"). 2D scene plates or a blank background | `godot/scenes/battle_stage_3d.gd:29,38,55`; owner context for this plan |

### 1.4 Fights

| Requirement | Source |
|---|---|
| A fight every day is possible, and there are at most two fights a day | `DESIGN_AUTHORITY.md:50` |
| Aatami fights the first fights, then steps back when he has crew | `DESIGN_AUTHORITY.md:51`; `VERSIONS.md:115-121` |
| Fights can grow out of bad deals or aggressive play, and the forecast warns about it | `DESIGN_AUTHORITY.md:52` |
| Slice: one 2v2 and one 3v3 fight, one of them avoidable through information. Lasting wounds and one possible death | `GAME_DESIGN_DOCUMENT.md:1847-1849` |
| At most two *required* fights per chapter, 8–12 minutes each | `GAME_DESIGN_DOCUMENT.md:1567-1568` |
| Most chapters (about 80%) end in a fight. Chapter 1 ends in an operation (the shipment) | `GAME_DESIGN_DOCUMENT.md:2319-2330`; `PIRITORI_CHAPTER_EXECUTION.md:15` (Q5) |
| Move + Act, full intent shown, cover classes | `DESIGN_AUTHORITY.md:80-82` |

### 1.5 Systems

| Requirement | Source |
|---|---|
| Day and Night blocks. A block turns only on a story beat, a door or nightfall. Trips and trades cost minutes | `DESIGN_LOCKS.md:17-24`; `DESIGN_AUTHORITY.md:48` |
| Travel events in about one trip in three or four, as a surprise, costing a bit of time | `DESIGN_AUTHORITY.md:20,27,30` |
| A chapter has a goal type, a threshold and an ending mission. Progress can be counted live | `GAME_DESIGN_DOCUMENT.md:2173-2178` |
| Trade income counts toward the chapter. Reaching the threshold offers the ending and does not force it | `PIRITORI_CHAPTER_EXECUTION.md:28-31` |
| Committing to the finale is saved (available, committed, resolved) | `PIRITORI_CHAPTER_EXECUTION.md:31` |
| Debt and markka conversion at a staffed bank | `GAME_DESIGN_DOCUMENT.md:238,1844` |
| Families' standing ladder. Corners (H4) are shelved | `DESIGN_AUTHORITY.md:53`; `VERSIONS.md:93-99` |
| Chapter turn: gear carries over, cash restarts at a standard stake, stock resets | `DESIGN_AUTHORITY.md:49` |
| Six recruitable crew with three field roles | `GAME_DESIGN_DOCUMENT.md:1845` |

### 1.6 UI

| Requirement | Source |
|---|---|
| Five modes: map, location, ledger, fight, news | `UX_SPEC.md:110`; `GAME_DESIGN_DOCUMENT.md:379` |
| Lantern Noir city look ("good for now") | `DESIGN_AUTHORITY.md:17` |
| A forecast before every commitment, a recap afterwards, no hidden dead ends | `GAME_DESIGN_DOCUMENT.md:1642,1656,1662` (§18) |
| Pixel 10 Pro and iPad M2 are the test devices | `PIRITORI_CHAPTER_EXECUTION.md:74` |

### 1.7 Saves

| Requirement | Source |
|---|---|
| Save at every non-combat decision and after each fight resolves. Store the schema version and content id | `godot/autoload/save_service.gd:4-6` (quoting `GODOT_HANDOFF.md` §8) |
| Save and resume work | `DESIGN_LOCKS.md:349` |
| A committed finale survives reload and cannot charge twice | `PIRITORI_CHAPTER_EXECUTION.md:31` |

### 1.8 Audio

| Requirement | Source |
|---|---|
| Functional cues: route load, opportunity expiry, shop open/close, unconfirmed vs confirmed info, fight intent, guard break, nerve loss, withdrawal, cash/stock, TV bulletin, SMS, someone becoming unavailable | `GAME_DESIGN_DOCUMENT.md:1678-1688` (§19) |
| City ambience plus small sounds on buy, sell and travel | `DESIGN_AUTHORITY.md:28` (answer 7) |
| No constant sirens and no celebrating violence | `GAME_DESIGN_DOCUMENT.md:1690-1691` |

### 1.9 The stand-in art lock (#94, #95)

| Requirement | Source |
|---|---|
| "Stand ins should be the only characters used until others are proven to work. Make this to all versions." | `DESIGN_AUTHORITY.md:5-11`; `VERSIONS.md:80-91` (v4.68, PR #94) |
| A candidate only enters a game after visual, rig, animation and in-game checks, promoted in both builds | `DESIGN_AUTHORITY.md:8-11`; PR #95 (review gate) |
| Godot `USE_APPROVED_CHARACTER_MODELS` stays hard-off | `godot/scenes/battle_stage_3d.gd:142-146`; test `godot/tests/test_battle.gd:1191-1193` |
| One shared fight animation set (idle/attack/hit/dead) for the whole cast; mitten hands are fine; a simple cast | owner context for this plan (not yet written in a repo doc, see step 1) |
| 2D T-poses are shown to Mikael before any Meshy/3D generation | owner context for this plan (not yet written as a rule, see step 1) |

---

## 2. What already works (evidence)

**Test run on `5a567bd`, Godot 4.7.2 headless, 2026-10-11. All suites passed with 0 failures:**
spine 271 · locale 21 · shell 365 · battle 321 · battle_ui 29 · playthrough 100 · story 359.
(PR #100 reports battle at 324 because it adds tests.)
**Web `node web/test/*.mjs`:** all 35 passed, including chapter 41, doors 692, road 360, standing 74, story 63, toko 25, aatami 18, visits, v3-contract ("five modes, 44px floor, 15-anchor map, 20 blocks"), and the v3-battle mid-fight save round trip. The browser `.cjs` suites were not run.

| Area | Evidence |
|---|---|
| A 10-day chapter: 20 blocks, 17 encounters, days 8–10 authored | `content/era1-slice-v1.json` `schedule` (20 entries, 17 named encounters, 3 open door blocks: d8 night, d9 day, d10 day); Godot `test_playthrough` 100 |
| Missions | 4 in `era1-slice-v1.json` (`mission-paper-bag`, `-three-vans`, `-bear-path`, `-courtyard-receipts`); story thread `content/act1-story-v1.json` (10 clues, case `case-thursday-tram`) |
| Thursday Tram case in Godot | `godot/scenes/app_shell.gd:2567`; `godot/tests/test_shell.gd:1093` |
| Fights | 4 authored battles (`battle-karhupuisto-2v2`, `-courtyard-3v3`, `-kattilahalli-3v3`, `-hermanni-training`); fight model `godot/scripts/fight/fight_manager.gd`; test_battle 321 |
| Doors, road events, families | `content/doors-v1.json` (14 templates), `road-events-v1.json` (29 events), `families-v1.json` (6 rungs, 2 families); Godot `scripts/city/doors.gd`, `road.gd`, `standing.gd`; test_story 359 against `tools/web-reference.mjs` |
| Aatami fights first, then steps back | `VERSIONS.md:128` (Godot port landed) |
| Chapter ending and Pasila endings | `godot/autoload/game_state.gd` `chapter_ending()` l.731, `attempt_chapter_ending()` l.802, `resolve_ending()` l.1938, `forecast_ending()` l.1952; 4 endings `pasila-nearer/-deferred/-expensive/-haunted` |
| Chapter turn rules | `godot/scripts/city/chapter.gd` `turn_chapter()` l.104; `chapter_turn` in canon (stake €160) |
| Saves | `godot/autoload/save_service.gd` (`user://piritori-era1-slice.json`, saves on every decision and block, l.23-31); `GameState.to_dict/from_dict` l.2049/2132; fight state `fight_manager.gd:2322,2354` |
| Audio | `godot/autoload/sound.gd`: synthesised rain bed, tram bell, till on cash, footsteps, road sting, arrival brakes; one on/off switch kept in settings. Web reference `web/js/v3/sound.js` |
| Languages | en/fi/ja, test_locale 21 |
| Optional visits | 3 in canon (`visit-jaska-room-to-work`, `visit-toko-after-service`, `visit-harju-thursday`); Godot `content_registry.gd:123,321`, `app_shell.gd:77,230` |
| Stand-ins | `battle_stage_3d.gd:142-146` (`USE_APPROVED_CHARACTER_MODELS := false`), `_make_stand_in` (a procedural body, side ring, breathing idle l.704-721); dioramas parked l.29-55 |
| Arrival, news, ledger, map scenes | `godot/scenes/arrival.gd`, `news_event.gd`, `story_ledger.gd`, `market_ledger.gd`, `city_map.gd`, `location_stage.gd`, `road_stage.gd` |

---

## 3. What is missing or broken (evidence)

| # | Gap | Evidence | Blocks |
|---|---|---|---|
| G1 | **Godot fighters do not attack, flinch or fall in motion.** The shared clip loader returns `{}` and `_animate()` returns at once. Stand-ins only breathe, and a downed one is a static tilt. The web build uses `fight-motion.js` | `battle_stage_3d.gd:795-822`, `:704-727`; `QUEUE.md:8-10` | F3, the fight look |
| G2 | **The shared animation set (idle/attack/hit/dead) is not written down as the rule.** The only clip paths point at old `muscle-*` Meshy clips that are switched off | `battle_stage_3d.gd:171-174` | lock 1.9 |
| G3 | **The 2D T-pose gate is not in any doc.** `art-library/characters/turnarounds/era1` exists, but no rule says "T-pose first" **[UNSURE whether those turnarounds count]** | `rg -i t-pose` finds mentions only, no gate | lock 1.9 |
| G4 | **DESIGN_LOCKS F5 contradicts the stand-in lock.** "Approved pipeline produces runtime assets" cannot pass while only stand-ins are allowed | `DESIGN_LOCKS.md:348` vs `DESIGN_AUTHORITY.md:5` | F5 |
| G5 | **The pacing of days 1–7 still predates "fights every day, at most 2".** VERSIONS says days 1–7 "keep their authored rhythm until H6", and only H6.1 has shipped | `VERSIONS.md:156`, `:115`; `DESIGN_AUTHORITY.md:50` | 1.4 |
| G6 | **The finale has no saved "committed" phase** in the inspected state. The ending settles at once **[UNSURE whether that is still true at v4.68; the doc is from 2026-09-11]** | `PIRITORI_CHAPTER_EXECUTION.md:86,93` | F1, F6 |
| G7 | **After Chapter 1 there is nowhere to go.** Only one chapter is authored, `next_chapter()` returns `{}`, and `begin_next_chapter`/`decay_equipment` have nothing to transition to. An end screen or epilogue is needed | `chapter.gd:91-96`; `QUEUE.md:74-80` | F1 |
| G8 | **Fight audio cues are missing.** `sound.gd` covers city and cash only. Intent, guard break, nerve loss, withdrawal, SMS, bulletin start, shop open/close and expiry are not listed | `sound.gd:18-21` vs GDD §19 | 1.8 |
| G9 | **Route capacity (F2) is not shown by any test name** I found **[UNSURE: may exist under M2 journeys]** | — | F2 |
| G10 | **Phone and device acceptance has not been recorded.** The C.19 and v4.x release notes keep saying "physical device acceptance pending" | `VERSIONS.md:3` | F4 |
| G11 | **Accessibility paths have no test** (reduced motion, text size, colour-not-alone) **[UNSURE]** | GDD §20 l.1697 | F6 |
| G12 | **The chapter-length playtest decision is not recorded** | `DESIGN_LOCKS.md:350` | F7 |
| G13 | **Fight scene backgrounds:** dioramas are parked, but no plate per fight location is mapped for Godot. It falls back to a slab | `battle_stage_3d.gd:346-347,379` | 1.3 |
| G14 | **Godot spends a block per ledger trade; the web build spends none.** Answer 21 says follow the web, and it is unclear whether the port was fixed **[UNSURE]** | `QUEUE.md:20-32`; `DESIGN_AUTHORITY.md:48` | 1.5 |
| G15 | **Travel time cost model (D002) is still open** | `DESIGN_AUTHORITY.md:18` | 1.5 |
| G16 | **Aatami's step-back threshold (question 26) has not been answered.** The number 3 is provisional | `VERSIONS.md:121`; answer 26 is absent from `DESIGN_AUTHORITY.md` | 1.4 |
| G17 | **No per-person campaign condition in Godot.** Wounds and critical states from the web are not ported | `VERSIONS.md:128` | 1.4 (lasting wounds and a possible death) |
| G18 | **Chapter 1 ends in an operation, not a fight.** The GDD default is a fight | GDD l.2319-2330 | Q5 |

---

## 4. Steps (one PR each)

Every step's PR must: keep all 7 Godot suites and the web `.mjs` suites green, add the Piritori version to its report, leave #93 and #100 alone, and **not deploy**. Godot comes first and the web follows in a later step. Sizes: S ≈ 2–4 h, M ≈ 1 day, L ≈ 2–3 days. All sizes are rough guesses.

1. **Write the art rules down (docs, S).** Add to `DESIGN_AUTHORITY.md`: one shared animation set (idle/attack/hit/dead), mitten hands, 2D plates or blank behind fights, and 2D T-poses shown before any Meshy job. Amend `DESIGN_LOCKS` §12.1 item 5 to read "stand-ins pass the in-game readability check" (after Q3). *Accept:* the doc diff only; Mikael's wording is quoted.
2. **Shared stand-in fight motion in Godot (M).** Procedural attack (a lunge), hit (a flinch) and dead (a fall, then lie still) on the stand-in. `_animate()` drives them from `clip_for()`. No imported clips. *Accept:* new test_battle cases: each of the 4 states plays the right track; a downed fighter ends lying down; reduced motion skips the tweens; `USE_APPROVED_CHARACTER_MODELS` is still false.
3. **2D fight plates (M).** Map each of the 4 battles to an existing 2D scene plate, or blank. Make sure no diorama loads unless `?stage=` is set. *Accept:* a test asserting the plate id per battle and no diorama by default; screenshots of all 4 fights for Mikael.
4. **The finale commit phase (M).** Add `available → committed → resolved` to GameState and save it. Show a forecast before committing. *Accept:* reload after commit resumes; resolving twice charges once; the playthrough reaches all 4 Pasila endings.
5. **The end of Act 1 (S–M).** After the ending, show an epilogue (the ending card, the recap of §17.3 factors) and a clear "Act 1 complete" state instead of an empty next chapter. *Accept:* the test reaches the epilogue from a fresh campaign and from a resumed save; no blank chapter 2 opens.
6. **Wounds and the possible death in Godot (M–L).** Port the per-person condition (`crewStatus`) from the web. *Accept:* web-reference vectors for wound, recovery and death; Aatami is never critical (`VERSIONS.md:117`).
7. **Fight and city audio cues (M).** Add the missing §19 cues, all synthesised the way `sound.gd` already does. *Accept:* a test listing every §19 cue mapped to a sound id; the off switch mutes them all.
8. **Re-pace days 1–7 (H6 remainder). First a story pitch for Mikael's greenlight (docs, S), then the build (L).** Every day offers a job that can become a fight, and no day holds more than 2. *Accept:* a playthrough test counts fights per day ≤ 2 and ≥ 1 offered per day; the briefing shows the fight risk.
9. **Time-cost parity (S).** Confirm or fix G14 so a ledger trade costs minutes, not a block. *Accept:* a test showing a trade on day 1 night does not move to day 2.
10. **Route capacity proof (S–M).** Find or add the test for F2. *Accept:* a test where hidden stock and an ordinary trip share one capacity number.
11. **Accessibility and phone pass (M).** Reduced motion, text scale, 44 px targets, colour plus shape. Capture screenshots at Pixel 10 Pro and iPad M2 sizes. *Accept:* checklist items in `UX_SPEC.md` §6.7/§7.8 ticked with screenshots; real-device checks are left to Mikael.
12. **Full playtest and feature-complete record (S + Mikael's time).** A 10-day run by Mikael, then record the F7 length decision and a §12.1 checklist. *Accept:* a docs PR with the checklist, all 7 criteria marked pass or waived by Mikael.
13. **Web catch-up (L, later).** Port steps 2–9 to `web/`, then a hub release in its own approved PR. *Accept:* `tools/web-reference.mjs --check` OK, browser suites green.

**Step count: 13** (steps 1 and 8 include a docs or greenlight part).

### 4b. If Act 1 means all of Act I (Q2)
Add per chapter: a story pitch → greenlight → canon data → Godot build → playthrough. The chapter 2 case pitch (R1–R5) is already waiting (`design/STORY_PITCHES.md:39-51`). Rough size: 1–2 weeks per chapter **[UNSURE]**.

---

## 5. Questions only Mikael can answer

Each has options and a recommended default. If there is no answer, the default is used.

1. **Which build leads?** The docs still say the web leads (`DESIGN_AUTHORITY.md:22`). (a) Godot first, web later; (b) the web stays first. **Default: (a)**, and the docs get updated in step 1.
2. **How big is "Act 1"?** (a) Chapter 1 only, 10 days; (b) all of Act I, about 4 chapters ending in Pasila. **Default: (a)** now, with (b) as the next plan.
3. **The art rule in the "feature complete" list.** It currently requires approved models. (a) Change it so stand-ins that read well are enough; (b) keep it, which means Act 1 cannot finish until a model passes. **Default: (a).**
4. **How fight figures move.** (a) Simple made-in-code moves (lunge, flinch, fall); (b) wait for a shared Meshy clip set, T-poses first. **Default: (a).**
5. **How Chapter 1 ends.** It ends in a shipment deal, not a fight, while the GDD says about 80% of chapters end in a fight. (a) Keep the shipment; (b) add a fight to the shipment night. **Default: (a)** for Chapter 1.
6. **When Aatami steps back (question 26).** (a) Once he has 3 crew (current); (b) after chapter 2; (c) another number. **Default: (a).**
7. **Travel time (D002).** (a) Each trip costs a few minutes; (b) cost by distance; (c) cost by line. **Default: (a).**
8. **What happens after the Chapter 1 ending?** (a) An epilogue and "Act 1 complete"; (b) a "chapter 2 coming" teaser. **Default: (a).**
9. **Can a crew member die in Act 1?** The GDD slice says one possible death (l.1849). (a) Yes, one; (b) wounds only for now. **Default: (a)**, as the GDD says.
10. **The playtest.** Who plays the full 10 days, and on which device? **Default: Mikael, on the Pixel 10 Pro, once step 11 is done.**
