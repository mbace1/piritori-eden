# Piritori — long-term integration scope

Status: **ACTIVE ROADMAP — owner direction locked; implementation details remain gated by prototypes**  
Date: 2026-09-10  
Authority: `DESIGN_AUTHORITY.md`

## Product shape

Piritori is one project with a shared world, campaign state and content canon.
Its current long-term work has two independent decision axes:

| Axis | Option | Purpose |
|---|---|---|
| Battle | **A — Turf base** | Adapt the existing Turf tactical implementation to Piritori's battle contract. |
| Campaign map | **B — Slay map/run** | Test a branching, authored run across Piritori places and consequences. |
| Battle | **C — Dream Loop base** | Build the same battle mechanic fresh through Dream Loop and compare it directly with A. |

The strategic default remains a Toko Move-derived Helsinki map played through
Piritori / Dope Wars travel, prices, inventory, debt, time and local pressure.
Option B is the alternative navigation structure. A and C are alternative
implementations of the battle that either map structure can request.

## Shared contracts before integration

### World and campaign

- canonical place, corridor, service, faction, contact and era IDs;
- cash, debt, stock, prices, local pressure, trust, crew condition and time;
- one deterministic campaign seed and consequence log;
- no option directly rewrites another option's private state.

### Battle request

A versioned request supplies:

- encounter and seed;
- battlefield/cell geometry and cover;
- both rosters, equipment, injuries and allegiance;
- allowed actions, retreat conditions and victory rules;
- presentation/accessibility flags that do not change mechanics.

### Battle result

Both A and C return the same normalized result:

- winner, retreat or other terminal state;
- survivors, wounds, deaths and equipment changes;
- elapsed campaign time;
- loot/cash within campaign caps;
- territory, faction, trust and local-pressure consequences;
- replay/event log sufficient to compare deterministic resolution.

Neither battle implementation edits campaign state directly.

## Matched A/C battle trial

Use one existing authored 3v3 encounter with identical starting state, random
seed, camera requirements, units, equipment, cover and expected rules. It must
exercise movement, melee, ranged attack, hit reaction, injury/death, retreat and
post-battle consequences.

### Option A — Turf base

- reuse Turf rules and assets where they satisfy Piritori canon;
- adapt through the shared request/result boundary rather than copying campaign
  assumptions into the battle;
- document which parts remain Turf-specific and the cost of maintaining them.

### Option C — Dream Loop base

- capture the current Piritori battle baseline before generating a target;
- create an owner-approved realistic in-engine target screenshot for the same
  3v3 fixture;
- build a fresh playable battle toward that target;
- use a separate critic to compare live captures against the target;
- keep a bounded time/iteration budget and retain each comparison artifact;
- enforce the shared mechanics with tests, because screenshot similarity cannot
  establish rules parity.

Dream Loop is a workflow, not a ready battle engine. C succeeds only if its real
controls, state transitions, tactical information, performance and production
cost pass—not because a still image looks good.

### Decision gate

Record for both candidates:

- tactical clarity and player preference after play;
- input completion on browser touch/mouse and Godot controller where ported;
- deterministic rule/result parity;
- cold load, frame time and memory on the actual target phone and desktop;
- implementation complexity, asset cost and effort to add another encounter;
- unresolved defects after one bounded correction pass.

Select one default battle base. Retain both only if each provides a distinct,
valuable use that justifies duplicate maintenance. Missing evidence is not a
pass.

## Campaign-map prototypes

### Living Toko / Dope Wars structure

The player reads prices, jobs, crew readiness, local pressure and moving
services; buys/sells/equips; travels through the existing network; resolves a
trade, encounter or battle; then settles debt and costs. Travel must consume
time and change exposure, access, inventory opportunity or encounter state.
The map cannot be decorative downtime and the player does not construct the
underlying HSL network.

### Option B — Slay map/run

Generate a small branching chapter from real Piritori place IDs and travel
costs. Show two or three meaningful next choices. Support battle, market,
contact/event, recovery and elite/boss nodes. Run-only builds may exist, but
persistent rewards and injuries return through the shared campaign contracts.

B passes only if it changes route planning, risk appetite and build-making. A
cosmetic node map that produces the same decisions as the living map is not a
second mode worth maintaining.

## Now / next / later

### Now — compare the battle bases, then integrate one thin chapter

1. Freeze the matched 3v3 fixture and battle request/result schema.
2. Preserve current Piritori as a runnable baseline.
3. Measure A/Turf against the contract.
4. Build and measure C/Dream Loop against the same contract.
5. Record the owner decision or explicit reason to extend the test.
6. Connect the selected resolver to a 6–8-anchor Toko-derived Kallio slice.
7. Prove one 20–30 minute Dope Wars/Piritori chapter with travel, trade, one
   avoidable battle, settlement and a clear end.

### Next — prototype B without splitting canon

1. Add a run-director interface rather than hard-coding map flow.
2. Build one seeded 8–12-node branching chapter.
3. Reuse the selected battle resolver and normalized consequences.
4. Compare the living and branching map structures using matched themes,
   duration and end-state metrics.
5. Decide whether B becomes optional contracts, parallel chapter types or an
   archived experiment.

### Later — expand only after both gates

- complete Era I before producing Era II;
- broaden crew roles, skills, equipment and encounter families;
- deepen factions, family consequences and endings;
- add Toko transport/service layers only where they create Piritori decisions;
- settle the long-term 2D/hybrid/full-3D presentation scope;
- consider daily seeds, challenges and free play.

## Guardrails

- No full Helsinki, global Toko logistics, multiplayer, accounts, live service
  or monetization before the integrated slice passes.
- No free switching of navigation rules mid-run during prototypes.
- No simultaneous A and C resolution of one battle; comparison is explicit.
- No separate balance economy per option.
- No large content or paid-asset production before the battle and map gates.
- Combat remains short, costly and often avoidable; it may not become the
  dominant profitable loop.
- A beautiful Dream Loop target cannot overrule Piritori's art authority,
  accessibility requirements or target-device performance gate.

## First milestone completion

The milestone is complete when one build can start a clearly labelled living-map
chapter, buy at one district, travel with time/exposure consequences, sell at
another, trigger or avoid a battle resolved through the selected A-or-C base,
return consequences to crew/territory/pressure/market, settle the day, reach a
clear ending, and replay the same seed. The A/C comparison evidence and decision
must be stored beside the milestone; B remains a data/paper prototype until this
loop works.
