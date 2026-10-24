# C.19 fights in the campaign — the mapping (CAMPAIGN.md P1)

Status: **step 1 shipped in Act I v4.74 (2026-10-24).** Proposed the same day;
both owner questions were answered before any code.
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
