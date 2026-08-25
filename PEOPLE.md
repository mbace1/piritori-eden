# People — who walks in when you need somebody

**Status: design proposal, 2026-08-24. Not canon.** This builds the generator
`COMBAT.md` §9.12 obliges ("a crew member holds a set, and the generator rolls
two or three") and answers §10.2, which was open.

```
people/roster.mjs             the generator — one pure module, no dependencies
people/test/roster.mjs        the gate — 23 checks, bare node
people/tools/roster-sheet.mjs prints hirelings so you can read them
```

---

## 1. §10.2 answered: two traits, and a minority at three

The open question was *"two or three worth reading, or a longer tail?"* It is not
answerable by argument, so `roster-sheet.mjs --compare` prints the **same four
people** at one, two, three and five traits and you read them.

**One** is a fact, not a person. *"Leaves when it turns, and is not sorry"* tells
you one thing and there is nothing to hold it against.

**Two** works, because two traits make a **contradiction you can carry**:

> Anne Savolainen "Peltsi" — bruiser + fixer
> – leaves when it turns, and is not sorry
> – is always there before you are

Reliable about turning up, unreliable about staying. That is a person in two
lines, and you will remember her when she walks out of a fight.

**Three** is richer, and usually for a specific reason: the third supplies the
**cause** of the first two.

> – leaves when it turns, and is not sorry
> – is always there before you are
> – army taught them to hold a line and nothing else

**Five collapses**, and the failure has a diagnosable shape rather than being a
matter of taste: **nothing dominates**. At five, every trait is competing, the
contradictions stop being interesting because there are too many of them to hold
at once, and the reader stops reading and starts scanning. It becomes a stat
block written in sentences.

**So: two, with about 28% at three** — the same shape and the same proportion as
aptitudes in §9.12. One rule for both halves of a person, which also means the
memorable hireling is the one carrying three of each.

**No two traits on one person are the same kind of observation.** Traits carry a
`tag` (nerve, known, habit, ties, history, talk, work, body) and the generator
takes at most one from each. Without that you get "is late" and "is always there
before you are" on the same person, which is not a contradiction — it is a bug.

## 2. Twelve aptitudes, and the distribution is checked

§9.12's pool, with both vocabularies kept: `runner muscle watcher fixer driver
local` (what somebody is FOR) and `bruiser anchor blade shooter spotter courier`
(what they DO in a fight). Two each, 28% at three. Appearance follows the first.

Measured over 2,000 hirelings, no aptitude takes less than 7.9% or more than
9.0% of the pool against an even 8.3%. That is gated, because a generator that
quietly favours one aptitude gives you a roster of the same person.

*(The first six people I generated had `fixer` in four of them, which looked like
exactly that bias. It was the seed. Measuring first is the difference between
fixing a bug and inventing one.)*

## 3. Every trait is a behaviour, and the gate enforces it

`COMBAT.md` §5.2: **an item changes what you can do; it does not add a modifier
you compute — and it applies to people too.** So there are no percentages here,
and the gate fails on any trait containing a number or a percent sign. Thirty-six
traits, all of them sentences.

The useful consequence is that traits compose with the systems that already
exist rather than needing their own arithmetic:

| trait | what it touches |
|---|---|
| *police know the face; a stop lasts longer* | `exposure()` in the market model |
| *can talk to police without it getting worse* | NEGOTIATION.md §6 — they should do the talking |
| *known at Hakaniemi — the market talks to them* | rapport, MARKET.md §7e |
| *drinks the profit, and drinks it here* | §7d's condition layer, and the money |
| *will carry more than is sensible if asked* | §7.8's capacity bands |
| *bad knee — stairs and running are a decision* | the fight board, and travel |

None of those needed a new number. They needed a person who does a thing.

## 4. Names, and a lock made structural

`DESIGN_LOCKS.md` §9.2: ethnicity or nationality is never a combat class,
morality shorthand or a silhouette. The name pool is **mixed, because Kallio in
2003 was**, and the lock is kept by construction: names are rolled from a
separate seed component that nothing else reads.

That is asserted rather than promised. The gate splits 6,000 hirelings by name
origin and compares the two groups' aptitude spread, trait spread and mean
career length. Maximum drift permitted is 2 percentage points.

*(The first version of that test asked whether one capability profile turns up
under two different names. With twelve aptitudes, thirty-six traits and ten
career states almost every profile is unique, so it failed on combinatorics
rather than on coupling. The test was wrong, not the generator — and a test that
fails for the wrong reason is worse than no test, because the next person
"fixes" the code.)*

## 5. The conveyor belt

§7.2's career ceiling is ten fights. A generated hireling starts somewhere on
that clock — most are new, some are already `nearly out` — so the roster you can
hire from always contains people at different distances from the end.

`stage` is a description, not a stat: `new`, `working`, `experienced`, `nearly
out`. It exists so a hiring screen can say what a person is without printing a
number at somebody whose whole design point is that they are a person.

## 6. Open

1. **Do traits ever change?** Somebody who freezes at gunfire and survives six
   fights arguably stops freezing. That is a growth system and §5.2 constrains
   it — a level-up changes what you can do — but nothing here decides it.
2. **Does a nickname mean anything?** It currently arrives with reputation
   (likelier the more fights someone has). It could stay flavour or become the
   thing other people in the fiction call them.
3. **Who is in the hiring pool at all?** Piritori is "the cheapest source of
   hired operatives" (§7.1) — but whether the pool is the same six people until
   you hire one, or refreshes, is a play question.
