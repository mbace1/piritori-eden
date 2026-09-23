# A.2 — TURF held to Piritori's rules

Date: 2026-09-23
Status: **implemented and gated in source (both repositories); not playable, not published.**

## Owner direction

After [A.1](A1_TURF_BASE.md) measured the rule gap, the owner said **yes to
both** ways of closing it: put Piritori's rules into TURF, *and* propose
TURF's own rules for both candidates. They are not alternatives:

- **Piritori's rules into TURF**: a rules *profile* in TURF v43. A plays
  C's rules exactly, so the matched comparison compares implementations and
  not rule sets. This half is done.
- **TURF's rules as a proposal for both**: DESIGN_AUTHORITY says a desirable
  rules change "becomes an explicit proposal for both candidates". The
  proposal is below. Nothing about it is implemented in C, and no switch is
  turned on in A.

## What landed

**In TURF** (`mbace1/Suds-Jack`, branch `claude/piritori-eden-game-8ptx2o`,
TURF v43, `turf/js/rules.js`): an encounter opts into a profile with a
`rules` field. `'piritori-c11'` switches:

- armour, with pierce;
- a brace verb and a bandage verb, each spending the action and never the
  move;
- edge cover `[x, y, 'north']`;
- supercover sight in which bodies block a shot;
- no momentum and no drops;
- C's LCG dice, compared in whole percentage points;
- frozen plans, where a broken plan holds whole.

**TURF's own game is unchanged.** With no `rules` field, no profile field
exists in the state:

- `balance.mjs` reads bit-identical (53/82/65/32/68/45/12) under all four
  `--los` modes;
- smoke passes 177/177, and all four browser gates pass;
- the new `test/rules.mjs` (40 checks) was mutation-checked.

**Here**:

- `web/vendor/turf` is re-pinned at TURF v43 (eight modules; `rules.js` is
  new).
- `web/turf-base/adapter.mjs` plays `c11-v1` requests on the profile by
  default, with nothing lost in translation. `{ rules: 'turf' }` keeps
  A.1's behaviour as the control column.
- `web/test/a1-parity.mjs` now reports both columns. It also gates A.2's
  claim that, **wherever the rival brain is not involved, A and C are one
  game**.

## What it measured

`node web/test/a1-parity.mjs --report`. The fixture plus 199 scatters:

| question | A.1 — TURF rules | A.2 — piritori-c11 profile |
|---|---|---|
| reach: cells both agree a fighter can / cannot reach | 91.9% (46.3% of fighters identical) | **100.0%** (100.0%) |
| sight: opposing pairs where both agree | 65.9% | **100.0%** |
| shots legal in place (C / A / both) | 816 / 1064 / 816 | **816 / 816 / 816** |
| odds identical, where both allow the shot | 80.6% | **100.0%** |
| weapon damage identical (before guard) | 100.0% | 100.0% |
| HP lost identical (after guard) | 0.0% | **100.0%** |
| rival plan identical (target and destination) | 41.8% | 43.7% |
| player commands: whole board identical after each | 0.0% | **100.0% of 1,054** |

The last row is the strict one, and the one the gate enforces. Seeded random
scripts of legal player commands (select, move, attack, brace, bandage,
reload) are played on both engines, and the **entire board** is compared after
every command: cells, HP, guard, ammunition, items and who is standing. Dice
are included, because both engines now roll C's LCG. The same harness reads
**0.0%** under TURF's own rules, so the 100% is the rules agreeing rather
than a comparison that cannot fail.

**What still differs is the rival brain, on purpose.** Which plan a rival
picks is each candidate's own program (43.7% identical); the rules those
plans are held to are now shared. That is also why the auto-vs-auto rows
below are not a verdict:

| auto vs auto, 60 seeds | win | loss | mean rounds | mean crew standing |
|---|---|---|---|---|
| A.1 (TURF rules) | 100.0% | 0.0% | 2.4 | 2.90 |
| A.2 (piritori-c11) | 100.0% | 0.0% | 3.0 | 3.00 |
| C (c11-v1) | 100.0% | 0.0% | 3.1 | 2.93 |

A.1's fixture finding still holds: `lab-6` is won by whoever moves first,
whatever the engine. It cannot compare outcomes.

## Proposal for both candidates: momentum

**Status: proposal. Not implemented in C, not switched on in A.** It needs
the owner's decision, and a fixture that can actually be lost to measure it
on.

TURF's movement economy (TURF v24, `turf/js/momentum.js`) is the one TURF
rule with a measured reason to exist:

- **Bank it by moving.** A fighter banks one point per tile it moves under
  its own power, capped at 4.
- **Unspent, it is evasion.** Each point is -6% to be *shot* (never to be
  hit in melee). At the cap that is -24%, deliberately under partial
  cover's penalty, so cover stays a decision.
- **Spent, it is damage.** An attack after a full move, with any weapon, is
  +1. Attacking spends the whole pool, so the same points buy damage *or* evasion, never
  both.

Why it is worth proposing to Piritori:

- **It gives Move a reason once a fighter is in range.** Without it,
  standing still and swinging dominates, and every board knots into a scrum
  by round one. TURF measured exactly that before v24.
- **It is readable.** Pips over each fighter, and a forecast that already
  shows the evasion. Piritori's full-intent UI has room for both.
- **It is balanced against something real.** TURF tuned it over four bots,
  five encounters and 120 seeds against a control column. Two limits are
  recorded in TURF's log: evasion barely moves bot play, because bots always
  attack, and the damage bonus is a cliff, not a dial.

What adopting it would cost, per candidate:

- **A:** one switch, `momentum: true` in a new profile, e.g. `piritori-c12`.
- **C:** a change to `web/fight-module/tactics.js`: bank on `move`, read in
  `forecast`, spend in `attack`. Plus the pips in the C.19 UI.
- **Both:** a new rules id (`c12-v1`), a new fixture, and the command-parity
  gate above, which is what would prove the two implementations agree.

What would decide it:

- A fixture with a real chance of losing. Night Shift's rescue outing is the
  obvious candidate: it is the build that ships, and the player can fail it.
- The owner playing both, with and without, on that fixture.

A bot cannot answer whether momentum makes the fight better. It can only
show that the numbers hold.

## Run it

```bash
node port/battle-fixture.mjs --check     # the request is current and sufficient
node web/tools/vendor-turf.mjs --check   # TURF is the pinned TURF (v43)
node web/test/a1-parity.mjs --report     # the gate, then both columns
```

In Suds-Jack: `node turf/test/rules.mjs` and `node turf/test/balance.mjs`.
