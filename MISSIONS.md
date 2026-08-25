# Missions — the beat that pays

**Status: design proposal, 2026-08-25. Not canon.** It builds the system the
owner has described across several sessions and that `content/era1-slice-v1.json`
already carries data for. Where it disagrees with `DESIGN_LOCKS.md` or the GDD,
they win — and §2 records one place the disagreement was real and had to be
settled rather than averaged.

```
missions/model.mjs             the shape, the clock and the triggers
missions/test/model.mjs        the gate — bare node
missions/tools/mission-sheet.mjs  prints a mission so you can read it
```

> "remember, the dope wars side is a side hustle, the big bucks come from
> missions with risk" — owner
>
> "missions are narrative beats, usually multiple steps and locations and may
> include selling lots of drugs fast or then hit jobs, fights, chasing someone,
> etc" — owner
>
> "It should take you 3h and real time 10-15mins max" — owner

---

## 1. What a mission is, stated so it can be checked

**A mission is a narrative beat with somewhere to be.** Four things, all
required:

1. **A signal** — a person told you. Missions do not appear on a board; they
   arrive through somebody, which is GDD §2.2's rule that every system is
   attached to a person or place. The slice data already carries
   `signal_encounter_id` on every one.
2. **Steps** — more than one, in more than one place.
3. **A deadline** — a day and a block after which it is gone.
4. **Three outcomes** — success, partial and failure, each with effects. Not
   two. A mission you can only pass or fail is a test; a mission with a partial
   is a **story**, and it is what lets a bad night still leave you somewhere.

Everything the slice already has fits that. What it does **not** have is steps —
the four authored missions carry one `destination_anchor_id` each, which makes
them errands rather than beats. §3 is the missing half.

## 2. The clock, and the disagreement it exposed

The owner's figure is **3 in-game hours and 10–15 real minutes**. The lock is
*"a normal trip, encounter or mission consumes one block"* (`DESIGN_LOCKS.md`
§1.1). Those look like different statements and are the same one:

| | |
|---|---|
| full Era I day | **Day, Evening, Night** (§1.2) |
| a block | roughly a third of a waking day — **about three hours** |
| a mission | **one block** |

**So the owner's three hours IS one block**, and the two sources agree. That is
worth stating because the temptation is to give a multi-step mission a bigger
budget than an errand, and the lock is right to refuse.

### 2.1 Why one block is the correct answer for a multi-step mission

Not an accounting convenience. **A mission costs one block because it is one
commitment.** Its steps happen *inside* the block, and the player does not get
to duck out to the market between them. That is the same rule
`NEGOTIATION.md` §1.1 and `COMBAT.md` run on, and it produces the right
feeling: once you are in, you are in.

It also draws the line between the two halves of the game cleanly:

| | the side hustle | a mission |
|---|---|---|
| costs | a block per **stop** | a block for the **whole beat** |
| you may leave | between any two stops | no |
| pays | a margin per pack | a purse, and consequences |

The market is interruptible and small. A mission is neither. **That is why the
big money is there** — not because the numbers are bigger, but because you
spent the thing you cannot get back and could not change your mind halfway.

### 2.2 The real-time budget is a content constraint, not a timer

10–15 minutes across four to six steps is **about two minutes a step**, and
nothing in the game enforces it. It is a rule for whoever writes the content:

- **a step is one screen and one decision.** No sub-menus, no shopping.
- **a step that needs the ledger open is too big** — split it or cut it.
- **a battle is a step**, and it is the one allowed to run long, which is why
  `DESIGN_LOCKS.md` §1.1 already says a battle charges no extra block.

`missions/model.mjs` costs a mission in both currencies and the gate fails one
that cannot be played in the budget. A clock nobody measures is a wish.

## 3. Steps: a place and a demand

A step is **one location and one verb**. The verbs are named so content can be
written against them and so the UI knows what screen to open:

| verb | what it asks | ends the block early if you fail? |
|---|---|---|
| `MEET` | be somewhere and talk — `NEGOTIATION.md`'s venue rules decide which view | no |
| `MOVE` | get there, and the route is the risk | no |
| `SELL` | shift stock fast, into whatever the board will take | no |
| `TAKE` | pick something up, from somebody who may not offer it | no |
| `HOLD` | be somewhere and stay for a while | no |
| `FIND` | somebody or something is not where you were told | no |
| `LOSE` | you are being followed | **yes** |
| `HURT` | the hit job. Escalates to the board | **yes** |

`SELL` is the owner's own example — *"here are 10 units of drug x, go find
buyers, not a retailer"* — and it is the one that ties the two halves together:
it reads the same `market/model.mjs` the side hustle does, so a fouled lane or a
saturated anchor makes a mission harder without anything being written twice.

**A step has alternatives or it is not a step.** At minimum, every step names a
second way through. A chain of single answers is a corridor, and GDD §9.4 bars
choices where one answer is obviously correct.

## 4. Risk TRIGGERS. It does not fill.

> "we can think of how things trigger. One could be that weed can smell on trams
> if not packed well, you should have a carbon lined bag, etc." — owner

This is the most important sentence in the design and the easiest to build
wrong. **A trigger is a condition that is either true or not at the moment it is
checked.** It is not a meter creeping toward an incident.

The difference is not cosmetic:

| | a meter | a trigger |
|---|---|---|
| the player asks | "how much have I got left?" | **"what am I carrying, and where am I going?"** |
| the answer to danger | do less | **carry it differently** |
| a carbon-lined bag is | −12% risk | **the answer to a named question** |
| being wrong feels | unlucky | **stupid, in a way you can fix** |

A meter turns every mitigation into a percentage and every incident into
weather. A trigger makes the bag *mean something*, which is what the owner's
example is actually about.

### 4.1 How one resolves

**The trigger decides whether. `exposure()` decides how badly.** That split is
the whole mechanism, and it is why the existing market model is already most of
this system:

1. **At a step boundary**, every trigger whose condition is met **fires**.
2. A fired trigger with an **answer present** is spent — you packed it right,
   nothing happens, and *the game says so*, because a mitigation nobody sees
   work is one nobody buys twice.
3. A fired trigger with **no answer** reads `exposure(anchor, ctx)` — the same
   function the market uses for the hour, the place, the crew, the load, the
   weapons and your condition — and the band it returns picks the consequence.

So the same fired trigger is a look from a conductor at a quiet stop and a lost
bag at Piritori at midday. **Nothing is rolled that the player could not see
coming**, which is GDD §2.5: uncertainty from missing information, never
unexplained punishment.

### 4.2 The starting set

Each is a condition, an answer, and what it costs when unanswered. All of them
are things the owner named.

| trigger | fires when | the answer | unanswered |
|---|---|---|---|
| `smell` | carrying weed on public transport | a carbon-lined bag | attention on the vehicle; a stop |
| `bulk` | carrying more than a coat hides | a bag, a crew member, a car | searched at the destination |
| `shape` | three or more, armed, together, in the open | split up, or go unarmed, or go at night | noticed and remembered — grievance, not police |
| `drunk` | condition drunk, in daylight, somewhere with eyes | wait for night, or go somewhere quiet | a conversation you did not want |
| `stoned` | condition stoned, at a checkpoint or a counter | be clear for the step that matters | you misread the room; the step's terms worsen |
| `known` | at an anchor where you already have grievance | a different face — send a crew member | they were waiting |
| `dry` | selling into a lane you have already fouled | spread the load | no buyers, and the clock runs |

`shape` is the owner's *"if you travel with a big crew and weapons it can arouse
suspicion"*, and it earns its place by being the one trigger whose consequence
is **not** police: it is other people remembering. That keeps the system from
collapsing into a single opponent.

### 4.3 The bag you lose

> "You can lose your bag drunk." — owner

`CONDITION.drunk.slip` in `market/model.mjs` already carries this and it is
deliberately **its own accident**, not an exposure consequence: it can happen
with nobody watching. That is the honest version — being drunk is not only a
police problem, it is a *you* problem, and a mission that ends because you put
the bag down is a better story than one that ends in a search.

## 5. Why you take one at all

The market pays a margin per pack against a spread and a saturation curve, and
`market/tools/income-curve.mjs` puts a ceiling on it. A mission pays a **purse**
plus effects, and the effects are the point:

- **access** — an anchor, a person, a route, a better book at one place;
- **standing** — rapport, which `MARKET.md` §7e turns into a narrower spread
  rather than a better mid;
- **an option closed for somebody else** — the McCormick advantage in the slice
  data is exactly this, running the other way.

**A mission must never pay only cash.** Cash is what the side hustle is for, and
a mission that pays only cash is a side hustle with a cutscene.

## 6. What the four authored missions already prove

Run through `missions/model.mjs`, the slice's four validate as *errands* — they
have signals, deadlines, requirements, three outcome sets and intel levels, and
**one location each**. Which is the useful finding: the schema is nearly right
and the content is one field short.

| mission | family | has | wants |
|---|---|---|---|
| `mission-paper-bag` | delivery-collection | signal, deadline, 3 outcomes | steps; a `smell` or `bulk` trigger |
| `mission-three-vans` | information | intel levels, 3 approaches | steps; it is a `FIND` beat |
| `mission-bear-path` | protection | battle + `battle_avoidance` | steps; `shape` is its natural trigger |
| `mission-courtyard-receipts` | recovery | battle + avoidance | steps; a `LOSE` beat on the way out |

`approaches` is already the alternatives rule from §3 written at mission scope.
Moving it down to per-step is most of the work.

## 7. Open

1. **Can a mission be abandoned mid-beat, and what does it cost?** §2.1 says you
   cannot duck out to the market; it does not say you cannot walk away entirely.
   Walking away should probably be possible and expensive, because a system with
   no exit turns a bad read into a punishment.
2. **Do triggers fire on the way home?** Everything above checks at step
   boundaries. The trip back with the money is the classic place to be caught,
   and it is either a real step or deliberately free.
3. **How many missions are live at once?** The slice has four across seven days.
   Whether they can overlap decides whether the deadline is pressure or a queue.
