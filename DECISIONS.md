# Owner decisions — Piritori → Eden

The rulings, dated, in the owner's words, with what each one changed.

**Why this file exists.** Decisions were landing in five places at once — a
section of `ART_BIBLE.md`, a numbered answer in `ASSETS.md`, a new §2.1 in
`FIGHT_BRIEF.md`, and `OWNER OVERRIDE` blocks in the code. Each of those is the
right home for the *detail*. None of them is a place a second agent can look to
find out what has been decided at all. This is the index.

**It does not outrank anything.** `BRIEF.md`, `SHARED_ENGINE.md` and
`FIGHT_BRIEF.md` are still canon (`AGENTS.md` §1). This records where canon has
been overridden and by what, so that an unrecorded contradiction stays a
finding and a recorded one stays a decision.

---

## 2026-08-18 — the art delivery

> "take all art pushed here as canon and target"

Two batches of art become the target. `ART_BIBLE.md` is the catalogue; §3 there
holds the five conflicts and how each was answered.

### 1. Guns

> "there are guns"

Reverses the reading that removed the pistol. `BRIEF.md`'s *"there is no
gunfight"* is kept and made true structurally instead of by absence — four
rules in `FIGHT_BRIEF.md` §2.1, enforced in `test/fight.mjs`.
**Changed:** `js/fight.js` (OWNER OVERRIDE 2) — `pistol`, `shotgun`, `rifle`.

### 2. The style is a hybrid

> "sure, it's a hybrid"

Ink-line illustration carried on risograph print language, rather than either
alone. **Changed:** `ART_PROMPTS.md` §1 and `art-src/NANO_BANANA.md` §3 Block A.

### 3. The map's style is canon; its places are not

> "only map style is canon, the places need to follow actual map"

`flow-core/city.js` keeps the ten WGS84-projected stops. Art that renames or
moves them is regenerated. **Changed:** nothing in code — this confirms it.

### 4. Cover is terrain

> "cover is terrain and also others" · "sure, we can have rocks etc"

Props stand on cells and shield the lane behind them; hard cover stops a bullet
and shuts the lane. `FIGHT_BRIEF.md` §4.1. **Changed:** `js/fight.js` (OWNER
OVERRIDE 3), `js/fightview.js`.

---

## 2026-08-18 — three pipeline calls handed back

> "you tell me"

Decided by Claude, recorded in `ASSETS.md` §3 items 11–13, reversible by a
sentence: cell sizes from the board's own arithmetic, joint markers keyed out
via `cut.mjs anchors`, and the tenement yard as the fallback arena.

---

## 2026-08-19 — the two mockup contradictions, answered

Both were raised in ART_BIBLE §1.-1 as places where the final targets show
something the build does not have.

### 7. GUARD stays what it is

> "1 a"

The mockup draws GUARD as a five-segment pool that depletes. The code has flat
damage reduction plus BRACE as an action, and **the code wins** — the segments
in the unit panel simply DISPLAY that reduction rather than becoming a resource
you spend. Nothing changed; this closes the question.

### 8. ITEM is real, and it is a bottle and a rock

> "2 b add bottle and rock"

`ITEMS` in `js/fight.js`. Both are **thrown**, which is the whole point of
them: they are the only way anyone on your side reaches past the front rank
without owning a gun or a blank one. One use, **shared by the crew** rather
than carried per unit, and **picked up off the street** each fight rather than
bought — a bottle and half a brick are what the ground gives you, and making
them a purchase would turn a scuffle into a shopping trip.

A rock is the quieter one (less harm, more fright); a bottle hurts more, which
is the same trade the weapons table makes everywhere else. Hard cover stops a
thrown thing exactly as it stops a bullet, because one rule for "what is in the
way" is the reason cover generalised at all — and cover is never itself a
target for a throw, since smashing a barrier by lobbing your last bottle at it
is not a decision anybody wants to be offered.

Only your side has any. That is deliberate and the gate asserts it: the item
pile is a small advantage the player brings to a fight they did not choose.

---

## 2026-08-18 — the second act, and what things are called

### 5. Pasila 2024 is canon — and phase-gated

> "Pasila 2024 is canon but for development when we are feature complete in
> 2000s Kallio."

So `ASSETS.md` #6 is answered **yes**, with a gate attached, and the gate is the
operative half. Kalle and Aaro, Pasila, Tripla, Peukku and the 2024 act are real
and may be written about, referenced and designed for. **Nothing about them is
built or drawn until Act I — 2003 Kallio — is feature complete.**

This is `eeri/PHASING.md`'s rule applied here, for the same reason it exists
there: an agent that starts Phase 2 while Phase 1 has holes in it produces two
half-games. Concretely, until the gate lifts:

- no 2024 art is commissioned or generated (`ASSETS.md` P3 item 9 stays parked);
- no second-act nodes, goods, or cast enter `flow-core/city.js`,
  `js/market.js` or `js/narrative.js`;
- `ART_BRIEF_CONCEPT.md`'s Pasila material is **reference, not a work item**.

**What "feature complete in 2000s Kallio" means** is not yet written down, and
it is the next thing worth an owner sentence, because it is the thing that opens
the gate. Claude's reading of the open list: the loop survives play end to end,
edge capacity is real (`ASSETS.md` #5), and the campaign length is settled
(#7). Until the owner says otherwise, treat those three as the gate.

### 6. Substance names: Dope Wars, nicknames, and fakes

> "substance names are same as in Dope Wars, all nicknames are ok. there can
> even be people that sell you fake drugs, etc"

Answers `ASSETS.md` #8 and overrides `BRIEF.md` § Market's *"a small set of
abstract product classes"*. **Changed:** `js/market.js` (OWNER OVERRIDE 4).

**The goods are named.** Six, in the street register of Kallio in 2003 — pilvi ·
hasis · subu · piri · koka · hepo. `piri` is not decoration: the square in the
title is named after it, so this was already half in canon.

**The abstraction is kept where it was doing work rather than deleted.** A good
declares a **tier** (`bulk` / `steady` / `scarce`) and the tier owns every number
the economy runs on. Nothing in the pricing reads a name. That is what lets the
2024 act add Peukku later without touching the model, and it is what the gate
checks first.

**And people sell you fakes.** A contact offers a bargain; a cut bag fetches
`FAKE_RATE` of the going price when it lands, which is where you find out. The
rule this obeys is canon's, not mine — `BRIEF.md` forbids *random punishment
without a readable warning* — so:

- **the warning is the relationship.** Trust drives the discount and the odds of
  a cut bag in the *same direction*: somebody you burned offers the best price in
  the game and means none of it. A contact you have kept never sells you a fake.
- the player is told the discount and the seller **before** committing, and the
  percentage in the sentence is the percentage charged. The gate asserts both.
- a consignment carries a **proportional** share of whatever is in the pile, so
  a bad batch cannot be quarantined by sending the good stuff first.
- the one genuinely hidden number in the build is `fakeShare()`, and it is hidden
  because the fiction says you cannot tell by looking.

`test/market.mjs` is new (39 checks) and exists because of this: a hidden fact
without a test is a bug waiting to be shipped.

**What this does not license.** Naming the goods does not make the game about
using them. No effects, no consumption, no instruction — it is a price list, the
way Dope Wars' is.
