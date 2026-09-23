# A.1 — Turf base: one battle request, two engines

Date: 2026-09-23
Status: **implemented and gated in source; nothing published, nothing playable yet.**

## Owner direction, 2026-09-23

> C.19 is the main active, Godot is alive and should catch up with that. A.1
> should be started. B.1 is Slay and separate game mode worked in different
> instance. Likely still a part of the bigger Piritori, like the map
> mini-game (also separate) and the dope wars mini-game that needs
> integration to map and narrative side here.

Read against [DESIGN_AUTHORITY](../DESIGN_AUTHORITY.md) (2026-09-10 ruling) and
the long-term scope: **A = Turf battle base**, **B = Slay map/run**,
**C = Dream Loop battle base** (the C.09 → C.19 line). A.1 is the scope's own
"Now" steps 1 and 3: *freeze the matched 3v3 fixture and battle
request/result schema*, then *measure A/Turf against the contract*.

C.19 stays the active build. Nothing here changes C's rules, UI, saves or
public package.

## What landed

| Piece | Path | What it is |
|---|---|---|
| The contract | `port/battle-contract.mjs` | Request v1, result v1, the result vocabulary (`win` / `loss` / `withdraw` / `partial`), and `RULES_C11_V1` — C.19's laboratory rules as numbers instead of literals inside `tactics.js` |
| The fixture | `fixtures/battle-request-lab6-v1.json` | C's own `lab-6` 3v3 (mixed loadout, neutral stand-ins, the seven lab cover pieces), **captured from C**, not typed |
| Its gate | `port/battle-fixture.mjs --check` | Regenerates the fixture; probes `tactics.js` for the rule numbers; rebuilds C **from the request alone** and plays it against native C |
| TURF, pinned | `web/vendor/turf/` + `SOURCE.json` | Seven pure modules of TURF v42 from `mbace1/Suds-Jack@b455359b`, never edited here |
| Its guard | `web/tools/vendor-turf.mjs --check` | Fails on any local edit; refreshes from a Suds-Jack checkout |
| The adapter | `web/turf-base/adapter.mjs` | Request → TURF's inputs; a session with C's `command / snapshot / result` shape; a `lossy` list of everything TURF cannot represent |
| The measurement | `web/test/a1-parity.mjs [--report]` | A gate that keeps the comparison meaningful, and a table of how far apart the rules are |

CI: the `a-turf-base` job in `.github/workflows/gates.yml` runs all three.

## Why the request is captured, not written

Until now there was no battle request at all. C's fixtures are built inside
`session.js`, and the only description of that board was the code. A
hand-written request would be a second description — the kind that drifts.
So the request is **derived from C's state**, and the gate asks the one
question a byte comparison cannot: *is the request sufficient?* C rebuilt from
nothing but the request (on the `lab-2` scaffold, deliberately a different
fixture, so anything the request fails to carry shows up as lab-2 leaking
through) must match native C **command by command**: 25 seeds × `auto` and
`end` scripts, plus a hand script through select, move, attack, brace, item,
reload, withdraw and talk. That is 175 commands, all identical.

The gate was checked against its own failure. Four deliberate breakages —
guard dropped, partial cover ignored, wrong seed, ammo changed — were each
**caught**. A gate that had not caught them would have been measuring
nothing.

## What A.1 measured

`node web/test/a1-parity.mjs --report`. The fixture plus 199 scatters of the
same six fighters over the same cover:

| question | agreement |
|---|---|
| reach: cells both agree a fighter can / cannot reach | 91.9% of cells; 46.3% of fighters identical |
| sight: opposing pairs where both agree on line of sight | 65.9% (C sees 56.7%, A sees 90.7%) |
| sight, cover only (fighters not blocking in either) | 89.2% |
| shots legal in place: C 816, A 1064, both 816 | A allows every shot C does |
| odds identical, where both allow the shot | 80.6% |
| weapon damage identical (before guard) | 100.0% |
| HP lost identical (after C's guard) | 0.0% |
| rival plan identical (target and destination) | 41.8% |
| control, partial cover removed: reach / odds | 100.0% / 100.0% |

What the rows mean, in order of weight:

1. **Guard is the biggest single difference.** Every lab fighter carries 1–2
   guard that absorbs a blow before HP, and TURF has no armour at all. (Its
   field named `guard` is an adjacent ally's *evasion* aura, so the adapter
   deliberately does not copy C's number into it.) The weapon numbers
   themselves transcribe exactly: 100% before guard, 0% after.
2. **Bodies block shots in C and not in TURF.** On cover alone the two
   sight algorithms agree 89%; with fighters counted as blockers the figure
   drops to 66%. That is C's rule, not an algorithm quirk, and TURF would need
   it added to match.
3. **Partial cover is an edge in C and a tile in TURF — and that is the
   entire reach and odds gap.** C's edge blocks crossing *that* edge and takes
   25 points off guns firing through it; TURF's tile softens every ranged
   shot by 30 and blocks nothing. The control row runs the same 200 boards
   with partial cover taken out of the request, and both rows go to 100%.
   Nothing else in the two movement or odds rules disagrees.
4. **The rival brains are different programs.** Same target and destination
   42% of the time. Both keep the ITB promise — frozen, visible plans; an
   invalid plan holds rather than retargets — so this is choice of plan, not
   honesty of plan.
5. **TURF carries rules C does not have**: momentum (evasion and +damage from
   distance moved), knockback (set to 0 by the adapter, because the request's
   weapons have none), weapon drops on a kill, mulberry32 dice where C uses an
   LCG. The same seed is therefore not the same roll in the two engines.

| auto vs auto, 60 seeds | win | loss | mean rounds | mean crew standing |
|---|---|---|---|---|
| A (TURF v42 rules) | 100.0% | 0.0% | 2.4 | 2.90 |
| C (c11-v1) | 100.0% | 0.0% | 3.1 | 2.93 |

**A finding about the fixture itself, not about either engine.** Whichever
engine runs `lab-6`, the side that moves first wins every seed. A mirror 3v3
at this range, with 100%-accurate melee, is decided by initiative. It is a
good fixture for rules parity (every verb, both weapon kinds, both cover
kinds) and **a useless one for comparing outcomes**. The decision gate's
"tactical clarity and player preference after play" needs a fixture with a
real chance of losing — Night Shift's rescue outing is the obvious candidate,
and it is not a 3v3.

## What stays TURF-specific, and what closing the gap would cost

The adapter records it rather than approximating it (`session.lossy`, and the
gate fails if a new kind of loss appears):

- `guard` on every fighter, and the brace verb that raises it;
- the bandage item and the item verb;
- partial cover's edge;
- (in the other direction) momentum, knockback, drops, TURF's dice.

There are two ways to close it, and **this is A.2's decision, not A.1's**:

- **Piritori rules in TURF's architecture.** Add guard, brace, items,
  edge cover and body-blocking to a TURF rules profile, and let the profile
  switch off momentum and drops. That changes TURF, which is its own game in
  Suds-Jack, with its own balance gate — so it is an upstream change there,
  not an edit to `web/vendor/turf/`.
- **Adopt TURF's rules as a proposal for both.** DESIGN_AUTHORITY says a
  desirable rules change "becomes an explicit proposal for both candidates".
  Momentum in particular is a measured, balanced TURF mechanic
  (TURF v24) that C has nothing like.

Either way the numbers above are the baseline to measure against.

## What A.1 is not

- **Not playable.** There is no A page and no hub cabinet. A has an engine, a
  contract and a measurement; the next A step to put in front of a person is
  TURF's own board (render, telegraph, animation, input, the sprite cast)
  drawing this request.
- **Not a verdict.** The long-term scope's decision gate also asks for
  clarity after play, device performance, asset cost and effort per new
  encounter. None of those is measured here.
- **Not published.** No hub, no `versions.json`, no `release.json`.

## Godot handoff

Nothing to port yet: A has no presentation, and the contract changes none of
C's behaviour. When the port picks up C.19, the request/result pair in
`port/battle-contract.mjs` is the boundary its battle should accept and
return. `fixtures/battle-request-lab6-v1.json` is a ready input for it,
and `RULES_C11_V1` is the list of numbers to match without reading
`tactics.js`.

## Run it

```bash
node port/battle-fixture.mjs --check     # the request is current and sufficient
node web/tools/vendor-turf.mjs --check   # TURF is the pinned TURF
node web/test/a1-parity.mjs --report     # the gate, then the table above
```

Refreshing TURF is `node web/tools/vendor-turf.mjs <path-to-Suds-Jack>` from a
clean checkout. Then re-run the report, because a TURF release can move every
row in it.
