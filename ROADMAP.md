# ROADMAP: the one plan for Act I (producer's cut)

Status: **plan of record from 2026-10-25.** Written after an audit of every plan in the repo against what is live (Act I v4.79). It **replaces** the older plans listed in §6 as the answer to "what next". It does not replace the design canon (GDD, COMBAT, the scenario atlas, `DESIGN_AUTHORITY.md` rulings); it orders the work.

Owner, 2026-10-25: *"Check all documentation to see if we are going with the plans, adjust pipeline roadmap and plan accordingly. Act as a super producer focused on gameplay."*

## 1. Where Act I really is (v4.79, live)

- **One chapter** ("What the square is worth"): 10 days, 20 blocks, 17 encounters, 4 missions, 14 door templates, 29 road events, 6 crew, 4 Pasila endings.
- **Every fight but the training fight is fought in Night Shift** (the C.19 3D tactics):
  - door fights with a job (fight or getaway, Withdraw, the police with two answers);
  - road fights;
  - the two mission battles;
  - each in its own set: courtyard, yard, park, tram street, quay.
- The old formation board is only the training fight and the no-3D fallback.
- **Godot stopped at v4.71.** Every web release since says "When C is ported".

## 2. The producer's verdict: built a lot, played very little

1. **The fight is not a fight yet.** This is the headline. `node web/tools/fight-balance.mjs`, run on all 15 Act I fights, 12 seeds each, at heat 0 and 2, gives:
   - **A careless "close and swing" player wins 10 of the 11 fight jobs every time, in about 2 rounds, losing 0.1 HP on average, and nobody goes down.** The 11th, the boiler hall, is won at heat 0; at heat 2 the police arrive first.
   - **Every getaway is won in 2 rounds by walking to the exit.**
   - The dice and the heat change nothing.
   - The trace (`TRACE=door:hit-courtyard-ledger`) shows why. Round 1: both crew step in and hit the tough at 100%, and **all three rivals' plans are cancelled** because the crew stand in their paths. Round 2: the tough falls, counts double, the rest **break and run**. The rivals never act.
   - The design says a fight is *"read the other team's intent, decide whose safety to spend, and end the fight before the city notices"* (COMBAT.md), with lasting wounds and the odd death (GDD slice). Today there is no safety to spend.
2. **A fight feeds nothing back but its stakes.** Night Shift's settlement pays wounds, missing, arrests and careers. It pays **no loot, no kit loss and no glory**; the board did. The fence, the unbuyable weapons and gear condition no longer hear from a fight.
3. **Losing people has no way back.** Every Withdraw and *Back off* now leaves someone missing or taken, and nothing in Act I brings them home (QUEUE :36-42, :158-163; C19_CAMPAIGN_FIGHTS promises "a later rescue").
4. **The chapter's climax is a dice roll.** The shipment operation resolves in one roll, with no crew, route or gear choice (QUEUE :1515).
5. **Nobody has played it.**
   - No owner acceptance on the Pixel or iPad since C.19 (2026-09-17).
   - No full 10-day playtest is recorded (DESIGN_LOCKS §12.1 F7).
   - Six releases in two days, each "not verified: owner acceptance on a device".
6. **The documents describe three different games.**
   - 20 of the 24 plan documents are stale. Every startup doc (`CLAUDE.md`, `AGENTS.md`, `START_HERE.md`, `CLAUDE_TAKEOVER.md`, `ACTIVE_CONTEXT.md`) still describes September (v4.40–v4.51).
   - The current plan (CAMPAIGN.md, PR #102) and the Act I plan (ACT1_PLAN.md, PR #101) were never merged.
   - The locks (`DESIGN_LOCKS` §4) still forbid the tile movement Night Shift is built on.

## 3. Rules for the next stretch

- **Play before build.** Every milestone ends with the owner playing it on the Pixel, and the receipt records it or says it is pending.
- **Measure, then tune.** Fight numbers come from `web/tools/fight-balance.mjs`, never from one played opening. A tuning change ships with its before/after table.
- **Chapter 1 is a game before anything gets bigger.** Chapter 2, the Godot catch-up, new places and new art wait until G4.
- **Freeze what is not gameplay.** Until G1 closes: no new sets, no new art pipelines, no new libraries. The trailer kit (§7) is the one exception: it touches no game code.

## 4. The road (each step ships to the hub and is played before the next)

| Step | What | Exit (how we know) |
|---|---|---|
| **G0. Play it** | The owner plays the live build on the Pixel (picture: `design/G0_PLAYTEST.jpg`): one door fight, one getaway, the Bear Path (about 20 minutes). This is CAMPAIGN.md's P0, still open. **The playtest links (v4.81):** `?play=g0-door`, `?play=g0-getaway`, `?play=g0-bear`, each one tap from its fight; the same three lead THINGS TO TEST. | Two answers. Did any fight make you decide something? Did anything break on the device? |
| **G1. The fight is a fight** | Tune Night Shift against the targets in §5. The levers are measured below. **Aatami is in every chapter 1 fight** (answer 26, §9), so G1 puts him on the board first and tunes with him there. | `fight-balance.mjs` meets the targets for all 15 fights; the owner plays three fights and says yes. |
| **G2. Fights feed the city** | Night Shift pays what the board paid: loot off the fallen, kit lost with the downed, glory. Missing crew get a way back (a rescue door, or bail at the bank). The shipment becomes a played outing or a real choice, not a roll. | A fight's spoils reach the fence. A missing person can come home. The finale asks something of the crew. |
| ~~G3. The shot caller~~ | **Moved to chapter 2 (G5).** Aatami fights all of chapter 1 (answer 26), so chapter 1 has no caller. The design waits in `design/C19_SHOT_CALLER.md`. | |
| **G4. Chapter 1, start to finish** | Travel and trades start costing time (D002: 30% of a block each, §9). A playthrough bot plays the 10 days, so it measures what that does to them. The owner plays them. The playtest decision (F7) is recorded. `DESIGN_LOCKS` §12.1 is rewritten for the chapter as built: Night Shift fights, 10 days. | Every story beat is still reachable with the time costs on. A recorded "this is fun / this is not, because…", and a feature-complete checklist that matches the game. |
| **G5. Then grow** | In this order, each its own plan: landscape and retiring the board (CAMPAIGN P5/P6); the meeting in the place (the v4.80 cut-ins are its faces); chapter 2, with the shot caller (pitch R1–R5 awaits greenlight); Godot (see §6). | |

### The G1 levers, already measured

Measured on scratch copies (not shipped), over the 11 fight jobs, 6 seeds, with the careless policy. "Crew downed" is the average number of crew put down per fight.

| Rules | Win | Rounds | HP lost | Crew downed |
|---|---|---|---|---|
| Today: rout at ½, a blocked plan is cancelled | 95% | 2.1 | 0.1 | 0 |
| Rout at ⅔ | 50%, the police end the rest | 3.0 | 0.1 | 0 |
| Blocked rivals walk as far as they can and strike | 95% | 2.1 | 1.7 | 0 |
| Both | 45% | 3.0 | 2.7 | 0.05 |

**Reading:** the fight is a stack of clocks: the first move reaches them, the rout comes at half, and the police at about round 3. No single number fixes it.

G1 is a tuning pass on four levers, in this order:
1. rivals that press when blocked;
2. a later rout;
3. the police clock pushed out to round 5 or later at low heat;
4. for getaways, rivals who start between the crew and the exit.

Each lever is measured on its own before they are combined.

## 5. Targets to sign (G1). Proposed; the owner moves any number

Owner, 2026-10-26, on the first draft: *"What specifically."* These are the specifics.

**What is measured.** `node web/tools/fight-balance.mjs` plays every Act I fight through Night Shift's own commands, 12 seeds each, at heat 0, 2 and 3. Heat 3 joins the tool in G1; today's heat-3 numbers came from a one-off copy. It plays:
- the **11 fight jobs**: 5 door fights, 4 road fights and the 2 mission battles;
- the **4 getaways** (doors whose job is getting out).

**Three ways of playing**, each a policy in the tool:
- **careless**: everyone walks at the nearest rival and swings. No guard, no reading the plans. This is the floor any player reaches. It exists today (`fight`).
- **straight out**: everyone walks to the exit. It exists today (`run`).
- **careful**: steps out of a telegraphed hit, guards when one cannot be dodged, and puts the tough down first. **G1 adds it.** Without it we cannot say whether thinking pays.

**For scale:** a crew of two has about 10 HP (5 each), and a rival has 4–5.

| # | Measure | Today (v4.81) | Target |
|---|---|---|---|
| 1 | Fight jobs, careless: won | 95% | **60–75%** |
| 2 | Fight jobs, careless: rounds | 2.1 | **4–6** |
| 3 | Fight jobs, careless: crew HP lost | 0.1 | **2–4** (a fifth to two fifths of the crew) |
| 4 | Fight jobs, careless: someone goes down | 0% of fights | **20–30%** (about 1 fight in 4) |
| 5 | Fight jobs, careful over careless | (no careful policy yet) | **15+ points** more won, and **1+ HP** less lost |
| 6 | Getaways, straight out: won | 100% in 2 rounds | **under 50%** |
| 7 | Getaways, careful: won | (no careful policy yet) | **70%+**, at a cost against straight out of a round or a point of HP |
| 8 | Police arrive, heat 0 | 0 of 15 fights | **under 20%** of fights |
| 9 | Police arrive, heat 3 | 1 of 15 fights | **over 50%** of fights |

**Why these numbers:**
- A fight should be won more often than lost when played without thought (rows 1–4), but not for free.
- It is a fight if thinking pays (rows 5 and 7).
- A getaway is a different job (rows 6–7).
- Heat is the clock the player can see (rows 8–9).

Today rows 8–9 look "fine" only because every fight ends before the police are due.

**Passes when** all nine rows hold over the 15 fights, then the owner plays three of them and says yes. The before/after table goes into the release receipt.

## 6. Pipeline and housekeeping

- **Releases:**
  - Keep the receipt.
  - Add two lines: "owner played: yes/pending", and the `fight-balance` table whenever a release touches fights.
  - Ship only bytes that CI saw green. v4.78 shipped with CI green on a later, test-only head; the bytes matched, but say so in the receipt.
- **Godot: paused.** Owner, 2026-10-26: *"No Godot until later."* That is option (a): no ports until the web build has earned them (G4 at the earliest). Releases stop writing Port sections and say "Godot paused" instead.
- **Hub reconcile.** `design/HUB_RELEASE.md` step 4 (reconcile `gh-pages` → Suds-Jack `main` with a game PR) has not been done since 2026-10-02. Either do one reconcile PR or drop the rule. Owner's call.
- **Open PRs (17).**
  - #101 and #102 are folded in here: their still-live parts are G0, G4, P5 and P6.
  - Proposed to close as overtaken (twelve, §9): #39, #63, #64, #65, #67, #68, #72, #75, #91, #93, and #101 and #102 now that this plan holds them. Nothing is closed without a yes.
  - Art PRs #103, #104, #106 and #108 wait on owner picks.
  - #107 merged as v4.80 (the cut-ins) and #109 as v4.81 (the playtest). #110 is the playtest follow-up.
- **The stale documents** now carry a one-line banner pointing here:
  - `PHASING.md`, `ACTIVE_CONTEXT.md`, `START_HERE.md`, `CLAUDE_TAKEOVER.md`, `DECISIONS.md`, `PIRITORI_CHAPTER_EXECUTION.md`, `JS_BUILD_CATCHUP.md`;
  - `design/POST_C18_ITERATION_PLAN.md`, `design/OPTION_C_VERTICAL_SLICE.md`, `design/CLAUDE_MAP_MISSION_NEXT_STEPS.md`, `design/C19_ACCEPTANCE.md`, `design/H1_H2_PLAN.md`;
  - and the current-state banners in `CLAUDE.md` and `AGENTS.md`.
  - Their bodies are kept as history.
- **QUEUE.md** is about half obsolete (board, Godot stage and cast items overtaken by Night Shift). Its triage is at its top; the full item-by-item reading is in this commit's message.

## 7. Outside the game: the marketing MP4s

The Suds-Jack goal *"export cool MP4s that work as marketing for Toko and the games"* gets a trailer kit that touches no game code:
- a browser recorder captures the real game;
- FFmpeg (already in this environment) encodes it;
- optionally, Kokoro voiceover (English and Japanese; no Finnish voice) and whisper.cpp captions.

- **The Toko dance (v3, made with the Grok bot, 2026-10-26).** A 7.5-second transparent loop at 128 BPM from AIST++ motion capture (Google), licensed **CC BY 4.0**: any published use needs the credit *"Motion data: AIST++ (Google), CC BY 4.0"*. The files are in the bot's own workspace, not in this repo.

GSAP is the candidate for the non-fight motion graphics (cut-ins, map, Toko), because it is one file with no build step. Adding it needs the owner's yes (`CLAUDE.md` §2: no new dependencies).

## 8. Decisions only the owner can make (answered 2026-10-26: §9)

1. The G1 targets (§5).
2. The shot caller: the four questions at the end of `design/C19_SHOT_CALLER.md`.
3. ~~Godot: pause or port now.~~ **Answered 2026-10-26: "No Godot until later."**
4. Which stale PRs to close.
5. Question 26: what makes Aatami step back. Three crew is provisional.
6. D002: what travel and trades cost in time. Today they are free on the web.

## 9. The owner's answers, 2026-10-26

Owner: *"1. What specifically 2. Please suggest 3. Pause 4. You suggest 5. Sure and after chapter 1 6. 30%"*

1. **The G1 targets: "What specifically."**
   - §5 now spells out each measure, how it is taken and today's number.
   - It waits for a yes.
2. **The shot caller: "Please suggest."**
   - The suggested answers are at the end of `design/C19_SHOT_CALLER.md`.
   - Nothing is urgent: after answer 26 the caller is chapter 2 work.
3. **Godot: "Pause."** This is the same answer as *"No Godot until later"* (PR #110). No ports before G4.
4. **The PRs: "You suggest."**
   - **Close twelve as overtaken:**
     - #39, #72 and #75: September orientation and pipeline notes;
     - #63 and #64: Godot fights (paused);
     - #65: board-era fight stats (Night Shift replaced the board);
     - #67, #68 and #93: Meshy 3D fighters (characters are cut paper now);
     - #91: M1 map inspection, overtaken by the shipped M1/M2;
     - #101 and #102: folded into this plan.
   - **Keep five:**
     - the art picks #103, #104, #106 and #108;
     - #110, the live playtest follow-up.
   - Nothing is closed until the owner says "close".
5. **Answer 26, when Aatami steps back: "Sure and after chapter 1."**
   - **The rule.** Aatami fights every fight in chapter 1. After chapter 1 he steps back, at the first fight where three of his own can fight (the existing rule, `steps_back_at_crew`). This is the 2026-10-24 ruling (*"the first phase of act1 in all fights"*) with chapter 1 as the first phase.
   - **What it moves:**
     - Chapter 1 has no shot caller, so G3 moves to chapter 2.
     - Today the game steps him back inside chapter 1, at three crew. The fix is one chapter check in `aatamiFights`. It lands with G1, because it changes who stands in every chapter 1 fight and G1 measures every fight.
     - Until then the G0 playtest shows today's rule.
6. **D002, what travel and trades cost: "30%."**
   - **Read as:** a trip, or a visit to a seller (however much changes hands), costs 30% of a block. Three fit in a block, and the fourth turns it. Road events keep their own minutes on top.
   - **What it replaces:** answer 21's "trips and trades cost minutes, never a block".
   - **When it lands:** G4, where the playthrough bot can see what it does to the 10 days.
   - **To check:** if "30%" meant something else, for example how often a journey has an event, this reading is wrong.
