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
| **G0. Play it** | The owner plays the live build on the Pixel: one door fight, one getaway, the Bear Path (about 20 minutes). This is CAMPAIGN.md's P0, still open. **The play card (v4.81):** `?play=g0-door`, `?play=g0-getaway`, `?play=g0-bear`, each one tap from its fight; the same three lead THINGS TO TEST. | Two answers. Did any fight make you decide something? Did anything break on the device? |
| **G1. The fight is a fight** | Tune Night Shift against targets the owner signs (§5). The levers are measured below. | `fight-balance.mjs` meets the targets for all 15 fights; the owner plays three fights and says yes. |
| **G2. Fights feed the city** | Night Shift pays what the board paid: loot off the fallen, kit lost with the downed, glory. Missing crew get a way back (a rescue door, or bail at the bank). The shipment becomes a played outing or a real choice, not a roll. | A fight's spoils reach the fence. A missing person can come home. The finale asks something of the crew. |
| **G3. The shot caller** | Build the owner-approved version of `design/C19_SHOT_CALLER.md`. Aatami's step-back becomes a role, not an absence. | His call changes a measured fight. |
| **G4. Chapter 1, start to finish** | A playthrough bot plays the 10 days. The owner plays them. The playtest decision (F7) is recorded. `DESIGN_LOCKS` §12.1 is rewritten for the chapter as built: Night Shift fights, 10 days. | A recorded "this is fun / this is not, because…" and a feature-complete checklist that matches the game. |
| **G5. Then grow** | In this order, each its own plan: landscape and retiring the board (CAMPAIGN P5/P6); the meeting in the place (after PR #107's cut-ins land); chapter 2 (pitch R1–R5 awaits greenlight); Godot (see §6). | |

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

| Fight job (careless play) | Getaway (walk straight out) | Police |
|---|---|---|
| wins 60–75% | wins under 50% | heat 0: in fewer than 1 fight in 5 |
| 4–6 rounds | the safe line costs a round or HP | heat 3: in most fights |
| 2–4 HP lost | | |
| someone down in about 1 fight in 4 | | |
| careful play wins more and loses less | | |

## 6. Pipeline and housekeeping

- **Releases:**
  - Keep the receipt.
  - Add two lines: "owner played: yes/pending", and the `fight-balance` table whenever a release touches fights.
  - Ship only bytes that CI saw green. v4.78 shipped with CI green on a later, test-only head; the bytes matched, but say so in the receipt.
- **Godot: owner decision.**
  - (a) Pause it officially until G4. Port notes keep piling up in VERSIONS.md, and its CI stays green only because it does not change.
  - (b) Port the C engine now, which is CAMPAIGN P5 pulled forward.
  - **Recommended: (a).** A port of fights that are not yet fun is work done twice.
- **Hub reconcile.** `design/HUB_RELEASE.md` step 4 (reconcile `gh-pages` → Suds-Jack `main` with a game PR) has not been done since 2026-10-02. Either do one reconcile PR or drop the rule. Owner's call.
- **Open PRs (17).**
  - #101 and #102 are folded in here: their still-live parts are G0, G4, P5 and P6.
  - Proposed to close as overtaken: #39, #63, #64, #65, #67, #68, #72, #75, #91, #93. Owner's call; nothing is closed without a yes.
  - Art PRs #103, #104, #106 and #108 wait on owner picks.
  - #107 (cut-ins) must renumber past v4.79 and take `app.js?v=47+`.
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

GSAP is the candidate for the non-fight motion graphics (cut-ins, map, Toko), because it is one file with no build step. Adding it needs the owner's yes (`CLAUDE.md` §2: no new dependencies).

## 8. Decisions only the owner can make

1. The G1 targets (§5).
2. The shot caller: the four questions at the end of `design/C19_SHOT_CALLER.md`.
3. Godot: pause (recommended) or port now.
4. Which stale PRs to close.
5. Question 26: what makes Aatami step back. Three crew is provisional.
6. D002: what travel and trades cost in time. Today they are free on the web.
