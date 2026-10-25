# C.19 fights in the campaign — the mapping (CAMPAIGN.md P1)

Status: **replanned, 2026-10-24 (§6).** Step 1 shipped in v4.74 on a narrow
reading of "get away"; the owner corrected it the same day: *"No, fighting 75%,
escape 25%. Also police can arrive etc. It's all in the docs. Simplify UX, plan
better."* §6 is the plan now. §§1–5 are kept as the record of what v4.74
built; where they say "every fight is a getaway", §6 replaces them.
Owner, 2026-10-24, on the withdrawn paper fight: *"This is awful and wrong. You
should be looking at C19."* Read with 2026-10-17: *"C19 is the best we have."*

This is P1 of [CAMPAIGN.md](../CAMPAIGN.md) (PR #102): the table that turns an
Act I fight into a Night Shift outing, and the outing's receipt back into Act I's
consequences. It is grounded in what the code does today, not in what it might.

## The principle

**One fight engine: C.19's** (`web/crew-run/` on the C.11 resolver in
`web/fight-module/`). Act I raises a fight; Night Shift plays it in its 3D place;
a receipt comes back through the campaign's one consequence boundary (C.17's
`campaign-adapter.js`, which already applies receipts once and only once). The
formation board gets no new features from here on (CAMPAIGN §7 Q1, treated as
answered by the owner's words above).

## 1. The request: Act I → Night Shift

| Act I has | Where it lives now | Night Shift needs | Status |
|---|---|---|---|
| Who fights: Aatami while he still fights, plus deployed crew, at most 3 | `fighters(state)`, `state.js` | `config.crew`, 2–3 people | **Exists** for crew (`campaignCrew`); **Aatami needs a projection**. He is the protagonist, not a crew record. **Answered (owner, 2026-10-24):** in Act I's first phase he is in every fight; for the rest of Act I he is the **shot caller and not a fighter** (COMBAT.md §9.9) |
| How many | `battle.player_deployed` (2 or 3) | crew size 2–3 | **Fits.** Every Act I fight already requires `fighters>=2` |
| Where | the door's anchor, the road event's place, or the mission's `location_anchor_id` | the C location | `places-v1.json` (v4.71) names a `kit` per anchor. courtyard (Porttikongi), yard (Linjat) and park (Karhupuisto) **exist in `crew-run/locations.js`**. **street** (Piritori, Hakaniemi, Mäkelänsilta, Siltasaari) and **quay** (Sörnäinen) **do not**, and fall back to the courtyard until built (CAMPAIGN P4) |
| Who against | the battle's opponents (2–3: role, cell, weapon, tough), the side `by` (v4.71), generated names | `b.enemies` | Today `makeMission` always fields the same four (2 + 2 arrivals). It must take the fight's own people instead |
| Their weapons | pipe, baton, tire-iron, chain, bat, knife, two handguns, a phone | C knows bat, knife and handgun only (`tactics.js` `WEAPONS`) | Map blunt weapons to **bat**, knife to **knife**, either handgun to **handgun**. A phone has no weapon in C (see Gaps) |
| What the fight is for | the door's stakes, the road event's `fight`, or the mission's success/partial/failure | the objective and the exit | **Answered (owner, 2026-10-24): get away.** Every campaign fight is won by reaching the exit with your people and what you carry; beating them is never needed. This is how C.19 already plays |
| Pressure | Act I heat brings the **police** (arrests) | C pressure 5 brings **two rival arrivals** a turn early | C's arrivals, from the side that is fighting. Police stay out until a later step |
| Death | only the courtyard mission can turn a flagged critical wound into death | C has wounds and **missing** (left behind, a later rescue) | Missing maps onto Act I's existing `missing` crew status, as C.17 already does |
| Walking away | withdrawal from round 1; negotiation from round 2 | `withdraw` exists; `talk` is refused in crew-run | Withdraw is enough for step one. A C negotiation is a later rule |

## 2. The receipt: Night Shift → Act I

| Outcome in C | Door / road fight | Mission fight | Crew |
|---|---|---|---|
| **win**: the objective is met | `fight.win` | the mission's success effects | Per person, via `applyCampaignReceipt`: returned, wounded (−1 condition step), recovered, or **missing** |
| **withdraw**: the crew got out | `fight.lose` | partial effects | Same |
| **loss**: nobody got out | `fight.lose` | failure effects | Same |

Unchanged from Act I: a fight counts toward the day's two when it **starts**
(`recordFight`); a mission or door fight turns the block and a road fight does
not (`app.js`, `advanceAndSettle`); each deployed person ages one fight (`ageCrew`, already in the adapter).
The receipt id is written as a flag before anything else, so a reload never
applies it twice. That is C.17's existing rule.

## 3. The flow

Act I's "it becomes a fight" writes an **outing request** into the campaign save
and opens Night Shift (`web/crew-run/?campaign=1`). Night Shift prepares that
outing instead of its own night: the crew are the fighters (no choosing), the
place is the anchor's kit, and the rivals are the fight's people. It plays,
settles, and writes the receipt. **Back to Kallio** returns to the map with the
consequences applied. Each build keeps its own save; only the receipt crosses.
That is the C.17 bridge made the default, which is CAMPAIGN P3.

## 4. Steps, each one playable and shipped

1. **Door fights launch C.19** (nine templates, every anchor). They are the most
   generic fights and have no mission logic. Exit: take a door, the deal goes
   bad, the fight is in the 3D place at that anchor, and you are back on the map
   with the door's stakes paid. **Done in v4.74** (`web/js/v3/outing.js`,
   `web/crew-run/`; gates `c19-outing.mjs`, `outing-browser.cjs`).
2. **Road fights**: the families' retaliations and the others. Same path,
   arriving where the event happened.
3. **The two mission battles** (Bear Path at Karhupuisto, the courtyard
   receipts at Torkkelinmäki), with their authored peaceful routes and
   avoidance intact (post-C.18 plan, M4).
4. **The missing places** (CAMPAIGN P4): a street with a tram stop for Piritori
   and Hakaniemi, and a quay edge for Sörnäinen, built from the Kallio kit the
   courtyard and yard already use.
5. **Retire the formation board** (P6) once a full chapter plays with no
   formation fight. Godot follows each step it can (2026-08-25 ruling).

## 5. Gaps this exposes, not decided here

- **A watcher with a phone** (several Act I opponents) has no C weapon. Options:
  a C spotter rule (calls the arrivals early), or an unarmed watcher who flees.
- **Aatami in C**, answered: a fighter in the first phase, then the shot caller
  and never on the board. While he fights he follows Act I's existing rule: he
  can be hurt, never left critical, and the crew always bring him out.
- **The shot caller in C**: C.19 has no shot-caller role yet. COMBAT.md §9.9.2
  says the caller gives the crew an advantage (stances are the caller's
  instrument) rather than standing in a lane. C needs that seat before step 1
  reaches the part of Act I after he steps back.
- **Negotiation**: Act I's NEGOTIATE has no C counterpart yet.
- **Godot** has no C engine at all (CAMPAIGN G8). The campaign's fights moving
  to C widens that gap until P5.

## What step 1 found

- **The getaway is easy.** The first door fight measured (the courtyard
  ledger, three a side) is won in four rounds with no attack and no hit taken.
  C's plans are visible and a broken plan cancels, so a straight run past the
  door's people dodges every blow, and pressure never reaches the arrivals.
  The levers are all in C and none was pulled. They include where the crew
  start, a rival who holds the exit, arrivals that come from the south, and
  pressure that counts rounds. Which way to go is a playtest question for the
  owner.
- **The shot caller is now a visible gap.** Once Aatami steps back he is not
  in the outing at all. The seat (§5) is the next thing C needs before a
  chapter can be played with no formation fight.
- **No 3D, no soft-lock.** A device that cannot open Night Shift plays the same
  fight on the formation board from the waiting screen. That fallback goes when
  the board is retired (step 5).

## Questions for the owner

1. ~~What is a campaign fight for?~~ **Answered 2026-10-24: get away.** Every
   campaign fight is won by reaching the exit with your people and what you
   carry. Beating them is never needed. A crew member who does not get out is
   missing (a later rescue), and the job's losing stakes are paid.
2. ~~Can Aatami be left behind?~~ **Answered 2026-10-24:** *"Aatami is in the
   first phase of act1 in all fights and then for rest of act1 he is the shot
   caller but not a fighter."*

## 6. The replan (owner correction, 2026-10-24)

### 6.1 What the documents already settle

v4.74 read one answer and missed the canon around it. In order of authority:

| The docs say | Where | v4.74 did |
|---|---|---|
| Fights are central, daily (at most two a day), and escalate from bad deals | DESIGN_AUTHORITY answers 23–25 | kept |
| A fight ends when **they withdraw or break**, by negotiation, by the objective, when **you withdraw**, or when one side cannot go on. Killing everyone is rarely required | GDD §13.10 | only "you leave" counted |
| Breaking their nerve (a **rout**) is a first-class win; it is the cheap, merciful way through | FIGHT_BRIEF §5 | no |
| Escape is a first-class strategy with a cost, and withdrawing is always findable | DESIGN_NOTES 2026-09-13; UX_SPEC §9.9 | escape was the only way to win, and Withdraw was removed |
| **Owner, today:** fighting 75%, escape 25% | DESIGN_AUTHORITY, top | — |
| **Police.** Heat from rounds, bodies on the ground and firearms brings them. They arrive at one end of the board, behind the side that looks like it started it. The player answers **Back off** (the downed are taken) or **Help your friends** (the standing pull the downed out; anyone too close to the police is taken too). Not authored per fight | COMBAT §9.5; built in `web/js/v3/battle.js` and Bear Path | no police in Night Shift at all |
| A hot place brings the police sooner | H4_H5_PLAN (anchor pressure 0–3) | no |
| A third party is **forecast before you commit**, never rolled behind the screen | PHASING (owner direction 2026-08-21); COMBAT §5.1 | — |
| Which fights must be fought, and how you can get out of them, comes from authored data, not a universal shortcut | PIRITORI_CHAPTER_EXECUTION (owner direction 2026-09-11) | one rule for every fight |
| Rivals are a different third party: they attack on sight | COMBAT §9.5.35; C.12 arrivals | kept as the pressure arrivals |
| Aatami fights in Act I's first phase, then calls it from the edge; a shot caller gives an advantage, not a body | owner today; COMBAT §9.9 | he fights, then is simply absent |
| The meeting is the arena: escalation happens in the same scene, with the same people | GDD 2026-09-12; NEGOTIATION §1 | a separate page in a separate app |
| One blocking mode at a time; a consequence is a strip in the destination, not a separate screen; a battle opens with a brief | UX_SPEC §4, §9.2 | six stops for one fight (below) |
| *"The whole face and name screen is not needed. Only when a character is active"*; *"less clutter and less patchwork"*; the C.12 interface was *"poorly grounded in the design"* | owner, QUEUE 2026-08-27; ACTIVE_CONTEXT 2026-09-16 | added a crew page |

### 6.2 The fight, as the docs describe it

- **Every fight has a job, and three in four jobs are fights.** The job is data
  on the door, road event or mission (`fight.goal`), so the 75/25 split is
  visible and testable rather than a feeling:
  - **Fight** (the default): make them back off. You win when nobody on their
    side is still standing on the board, whether downed or run off.
  - **Getaway**: get out with what you came for. You win when everyone is out
    by the exit.
  - Proposed tags for the 15 fights that exist (owner can move any of them):
    getaway: `pickup-fish-stall`, `pickup-yard-van`, `watch-back-door`,
    `sale-quay-shift` (4 of 15). Fight: the other five doors, the four road
    fights and both mission battles (11 of 15).
- **They can break.** C has no nerve track, so the smallest honest version of
  FIGHT_BRIEF's rout: when half of their side is down, the rest run and the
  fight is won. A tough one down counts double. Proposed, playtest gate.
- **You can always run.** Withdraw comes back in every fight. Everyone standing
  leaves by the exit; anyone downed stays behind and is missing (C.17). It pays
  the job's losing stakes. In a getaway the exit is the win instead.
- **The police come, and you see them coming.** Night Shift already counts
  pressure: a round +1, a gunshot +1, someone down +2. The place's own heat is
  added at the start. The brief and the pressure line say where the police
  come in (*"police at 5"*), so it is forecast, never a surprise. At 5 they are
  announced at one end of the board, a round early, as C's arrivals already
  are. When they arrive, the fight pauses on one question: **Back off** or
  **Help your friends**, with Act I's rules exactly. The question names who
  each answer costs, which no screen does yet (QUEUE), and then the fight ends.
  Anyone taken is arrested and gone from the roster (`arrestCrew`). Fighting
  the police is not offered (GDD §14.6; Act I refuses it too).
- **Rivals still arrive** where the job brings them (a retaliation, a crew that
  wants the bag). They attack on sight, announced a round early as now.
- **Aatami**, while he fights, is on the board and is carried out if he goes
  down. After he steps back he is not on the board. The shot-caller's advantage
  is open in COMBAT §9.9.4 and is a later step, not invented here.

### 6.3 The UX, cut down

v4.74 put six stops between a choice and the map:

    choice → IT IS A FIGHT screen → Night Shift crew page → fight
           → aftermath page → Back to Kallio → map

The docs ask for three:

    choice → the fight, in its place, with a brief over it
           → the result, in the same scene → the map, with a consequence strip

- **No waiting screen.** A choice that becomes a fight goes straight to it. If
  the fight is left unfinished, the map's existing next-step bar says
  **Back to the fight** and the block cannot pass. A device without 3D gets
  the formation board from Night Shift's own graphics-failure screen, not from
  a button on every fight.
- **No crew page.** The people are Act I's and the support kit is prototype
  supply, so the page decides nothing. The fight opens with the brief that
  UX_SPEC §9.2 already asks for: the place, who they are, the job, the exit,
  the heat. One button: **Fight**.
- **No aftermath page.** The end is one line in the scene ("They ran." /
  "Everyone got out." / "The police took Lan.") and **Back to Kallio**. The map
  then shows what changed as a strip: money, wounds, missing, arrested, heat.

### 6.4 Steps

Each step ships to the hub and is played before the next.

1. **v4.75: the fight and its UX.** Ship the job tags, rout, Withdraw, police
   with the two postures, the place's heat, and the three-stop flow above.
   v4.74's plumbing stays: the outing record, the receipt applied once, Aatami
   carried, and the cabinet carrying Night Shift.
   *Built (VERSIONS.md v4.75).* It differs from the plan above in three places:
   - The end is a short card over the scene, with a line per person, not a single line in the scene: arrests and the carried need naming.
   - The police question is asked even when nobody is down. Both answers then cost nothing, and the question could be skipped. *Fixed in v4.78:* with nobody down there is one answer, *Clear out*.
   - The rout threshold, half their weight with a tough one counting two, is unmeasured beyond one played opening.
2. **Road fights**: the same path, arriving where the event happened.
   *Built (VERSIONS.md v4.77):* `roadOuting` is the door's record made from the road event. It is staged where the event happened, pays the event's own stakes, and does not turn the block.
3. **The shot caller**: a design for COMBAT §9.9.4's open questions, brought for
   a greenlight before it is built.
4. **The meeting in the place**: a door's conversation staged in the 3D scene
   with face cut-ins, so escalation needs no transition (Bear Path already does
   this for one encounter).
5. **The two mission battles** with their authored alternatives.
6. **Street and quay kits**, then **landscape**, then retiring the board
   (CAMPAIGN P4–P6).
   *Street and quay built (VERSIONS.md v4.77, v4.78)* as sets assembled from the v02 kit, not new Blender kits. Every Act I fight place now has its own set.
