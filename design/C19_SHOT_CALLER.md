# The shot caller in Night Shift — a proposal for the owner

Status: **proposal, not built; suggested answers below, waiting for a yes. Chapter 2 work since 2026-10-26** (Aatami fights all of chapter 1, ROADMAP §9). This is step 3 of `C19_CAMPAIGN_FIGHTS.md` §6.4: *"a design for COMBAT §9.9.4's open questions, brought for a greenlight before it is built."* Nothing below is in the game.

## What is already settled

- **Aatami fights the first phase of Act I, then calls the shots and does not fight** (owner, 2026-10-24; COMBAT §9.9.1). In the code he steps back once three of his own can fight (`aatamiFights`, `stepBackIfReady`), and the city remembers it.
- **A caller gives an advantage, not a body** (§9.9.2). Named people can still fight; the option is never removed.
- **A veteran can be promoted into the chair, and their buffs double** (§9.9.3).
- **Stances are the caller's instrument** (§6.2). They are orders to the auto-battler: Aggressive, Defensive, Hold the line.

## The problem

Night Shift is played **by hand**. The player moves and acts for every fighter, so a stance has nothing to instruct. Today, once Aatami steps back he is simply not in the fight (`C19_CAMPAIGN_FIGHTS.md`, "What step 1 found"). The chair is empty, and nothing on screen says he is the one calling it.

## The proposal: calls

The caller is on the phone. **A call is a team-wide order**:

- it is free: it spends nobody's move or action;
- one call at most a round, made at the top of the player's turn;
- a fight carries a number of calls set by **who is in the chair**.

Three calls, each pulling a lever C already has.

| Call | What it does | Why this one |
|---|---|---|
| **Go now** | Every standing crew member has +1 move this round. | Getaways are a quarter of the fights (4 of 15). The best one is a run, and this pays for it. |
| **Hold** | Every standing crew member has +1 guard until the player's next turn. | The defensive stance, as one round of it. |
| **Keep them talking** | The police come one round later. Once a fight, and only after they are announced. | Heat is the clock of every fight. The caller is the one person not in the yard, so the call buys time. |

Each call is visible before it is made, and the board's forecasts update the moment it is made. A full-information fight cannot have a hidden buff.

**Who is in the chair:**

- **Aatami: one call** a fight.
- **A promoted veteran: two** (§9.9.3, *"buffs double"*). Their two calls are spent in different rounds, never both in one.

That doubles what the chair is worth without doubling any single call.

## §9.9.4's three questions, with a proposed answer each

1. **Does promotion end a fighting career, or change the default?**
   - Proposed: **it changes the default.** A promoted caller is not deployed unless you deploy them (§9.9.2: the option is never removed).
   - If they fight, the chair is empty for that fight and there are no calls. That makes the choice real: a body on the board, or the calls.
2. **One chair or several?**
   - Proposed: **one.** Several chairs multiply calls, and the question becomes "how many", not "who". One chair also keeps Aatami's arc legible: the chair is his until he hands it over.
3. **Does the doubled buff apply to stance weighting, competencies, or both?**
   - Proposed: **to calls in Night Shift, and to stance weighting where there is an auto-battle** (the formation board, and later the landscape fights).
   - Competencies have no C counterpart yet, so "both" can wait until they do.

## What it would take

- **Act I:**
  - the outing record carries `caller: {id, calls}`: Aatami once he has stepped back, or the promoted veteran;
  - the receipt brings back which calls were made, for the log ("Aatami called it: go now");
  - promotion is a crew-screen action for a high-level, named crew member. Its threshold is the owner's call, and stays out of this first step.
- **Night Shift:**
  - a CALL button in the command bar, beside Withdraw, with the caller's name and the calls left;
  - three entries in `run.js` options, each changing state the resolver already reads (move budget, guard, `police.afterRound`);
  - the police arrival code already counts rounds, so *Keep them talking* is one number.
- **Measure:** play the four getaways and two fights with and without calls, by hand and by the playthrough bot, before any number is fixed.

## Questions for the owner

1. **Calls, or something else?** For example, the caller picks one of the three stances before the fight, as a standing buff with no per-round decision.
2. **Are these the right three?** Other candidates:
   - **Eyes**: the caller warns of arrivals a round early;
   - **Pull out**: a free Withdraw that takes the downed with it.
3. **One call for Aatami, two for a promoted veteran?** Or one each, with the veteran's calls stronger?
4. **Should Aatami appear while he calls?** His cut-in portrait, on the phone, is the obvious picture. PR #107's cut-ins would carry it.

## Suggested answers (owner, 2026-10-26: *"Please suggest"*)

Waiting for a yes. None of this is built, and it is chapter 2 work: Aatami fights every chapter 1 fight (answer 26).

1. **Calls, not a pre-fight stance.**
   - A stance picked before the fight is decided once and then forgotten.
   - A call is a decision in the middle of the fight, when you can see what it buys.
2. **These three: Go now, Hold, Keep them talking.**
   - **Eyes** is already true: Night Shift shows every rival's plan and the police clock, so a warning would repeat what is on screen.
   - **Pull out** would make running free, and running has a price on purpose (DESIGN_NOTES 2026-09-13).
3. **One call for Aatami, two for a promoted veteran.**
   - Two of the same calls double what the chair is worth and keep every call one size, so the forecasts stay simple.
   - Stronger calls would need a second set of numbers.
4. **Yes, Aatami appears while he calls, but small.**
   - For now: his name on the CALL button, and one line in the fight log ("Aatami calls it: go now").
   - His waist-up cut-in comes when the cut-ins grow a two-speaker layout. That waits for G1 under ROADMAP §3.
