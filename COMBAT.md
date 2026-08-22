# COMBAT — the base game

Status: **ACTIVE**
Owner direction: 2026-08-21
Authority: sits directly beneath `GAME_DESIGN_DOCUMENT.md` and **supersedes its
§13 where the two differ**. Every such difference is listed in §2, not left to
be discovered.

`PHASING.md` §0 made the grid fighter the base game. This is that system.

**Owner ruling, 2026-08-21:** this design supersedes the previous systems
generally, not only where §2 lists a specific clash. The earlier documents
describe a narrative strategy game in which combat is a rare punctuation; this
is a tactics game with a market and a story wrapped around it. Where an older
document assumes the former shape — in its pacing, its scope, its acceptance
gates or its sense of what the player spends an evening doing — **this document
and `PHASING.md` win.** We are building a larger product than the slice those
documents were sized for.

`NARRATIVE.md` is the exception and remains untouchable (§1.1).

---

## 1. The promise

Inherited from `GDD` §13.1, unchanged, because it was already the right one:

> **Read the other team's intent, decide whose safety to spend, and end the
> fight before the city notices more than it already has.**

This is **triage, not a damage race** — structurally Into the Breach. You are
not maximising output; you are reading telegraphs and deciding what you cannot
save.

That matters more now than when it was written, because `PHASING.md` §0.2(2)
splits the roster into people you can lose and people you cannot. "Whose safety
to spend" stops being a figure of speech.

**And the theme is the mechanic.** `NARRATIVE.md`: *"Aatami calls the shots
while his crew performs the work, suffers wounds and may die."* A man who sends
people is the story and the control scheme at once.

### 1.1 The obligation that comes with it

`NARRATIVE.md` is not negotiable by a mechanic. If the game lets you burn people
without ever noticing, it endorses it. A hireling lost must cost something the
spreadsheet does not show — someone hears about it, someone asks for more next
time, someone stops taking your calls.

**A system that disapproves of what it rewards teaches players to ignore its
disapproval.** The cost has to be real or it should not be claimed.

---

## 2. What this supersedes in `GDD` §13

| § | Said | Now |
|---|---|---|
| §13.4 | Player phase: crew act once each **in any order**, then opponent phase | **Interleaved initiative.** One speed queue holds both sides. See §4. |
| §13.8 | **Tempo:** "action ordering *inside the team phase*" | Speed orders the whole queue, not just your side. It is a build stat. |
| §13.7 | Auto "is **not** a separate statistical auto-resolve" | Still true of Auto. **Skip-to-result is exactly that**, and is a third, deliberate tier. See §6. |
| §13.7 | Auto plan set "before an automated round" | Stance is set in **loadout**, before the fight, and is changeable during it. |
| §13.2 | "Every crew member remains individually important" | True of named characters. Deliberately **false** of hired crew. See §7. |

Everything else in §13 stands: the board (§13.3), position and reach (§13.5),
the core actions (§13.6), the combat values (§13.8), the status vocabulary
(§13.9) and the endings (§13.10).

---

## 3. The board — inherited intact

`GDD` §13.3 is **LOCKED** and survives the pivot without amendment: a horizontal
isometric view, two mirrored half-boards, three depth rows (front / middle /
back) crossed by three or four lanes. Grid revealed only where it is relevant.
Fewer combatants than cells, so empty cells make firing lanes. Reposition is an
action; there is no free walking and no movement-point economy.

This was already closer to Metal Slug Tactics than to what is built. It does not
need replacing — it needs using.

### 3.0 The board, as of 2026-08-21: 5 lanes x 4 rows per side

**Owner ruling.** `GDD` §13.3 locked 3x3 with 3x4 as an arena modifier, sized
for a game where combat was rare punctuation. The grid fighter is the base game
now, and a board that reads as the corner of a chessboard is not enough stage.

Twenty cells a side, forty in play, up from eighteen. Deliberately short of Into
the Breach's 8x8, which survives that size only because units walk freely —
§13.3's "no free walking, no movement-point economy" would not.

Two consequences, both recorded rather than assumed:

- **The fourth row is called `rear` and that name is a placeholder.**
  front/middle/back are semantic in §13.5 (close pressure / flexible /
  long-range safety) and a fourth does not obviously earn a meaning. No authored
  content uses it. `DESIGN_LOCKS.md` §13 forbids hardening it silently.
- **Three deployed units on twenty cells reads as sparse**, and the two
  formations now sit far apart. `DESIGN_LOCKS.md` §4.1 caps deployment at four
  a side, a number chosen for the small board. It needs revisiting, and that is
  an owner call rather than a tuning knob.

### 3.05 One grid, with no man's land — owner ruling 2026-08-21

The two half-boards are JOINED. They used to be mirrored boards floating apart
across a gap measured in tiles, which read as two grids rather than one
battlefield.

The board is now a single depth axis, banded:

> **3 rows blue · 2 rows grey · 3 rows red**

`GDD` §13.3's front / middle / back survive and gain a clearer meaning: FRONT is
the row nearest the middle for **both** sides, so the two crews face each other
across the neutral band.

The grey rows are **real cells**. Nothing deploys there, but they are ground a
unit can be repositioned or pushed into, and they are what a charge crosses.

**A quiet inconsistency died with the mirroring.** Under the old scheme lane 0
for the player sat physically OPPOSITE lane 0 for the opposition, so "the same
lane" in the targeting rules was not the same column on screen. A lane is a
column now, for both sides, and the picture agrees with the rules.

### 3.1 Is 3x3 enough? Findings, 2026-08-21

The owner asked whether 3x3 per side can carry the visuals the reference games
have. The board's shape is a variable now (`FightBoard`, `?rows=4&lanes=5`) so
the alternatives could be rendered rather than argued about. Four things came
out of looking, and only the first was expected.

**1. A bigger grid ALONE makes the picture worse.** The board is fitted into a
fixed play area — 64% of the width and 32% of the height on the courtyard — so
extra cells only divide the same floor into smaller tiles, and the figures
shrink with them. A 5x4 board renders *smaller on screen* than 3x3. Cell count
is not the lever.

**2. The play area is the lever, and it is far too small.** Enlarged to roughly
70% x 40%, the canon 3x3 already looks like a different game: figures read at a
glance, the board occupies the frame, the composition stops being bottom-heavy.
Most of what reads as "not enough board" is not enough *floor*.

**3. The background art is the binding constraint, exactly as the owner
guessed.** Enlarge the play area on the approved courtyard and the far rank
stands on the building: that painting's floor is a wedge that runs out around
40% of the frame height. A generated replacement with a broad rectangular floor
across the lower 60% fixes it immediately and holds a 4x4 comfortably.

**4. The unexpected one — the projections do not match.** The location art is
drawn **face-on**: the far wall is parallel to the screen and the floor is a
rectangle. The board's axes run **diagonally** (`FORWARD` is up-and-right,
`LANE_AXIS` down-and-right), so the formation lies at roughly 45 degrees across
a floor that is not oriented that way. It reads as a grid dropped onto a
photograph rather than a stage the fight belongs to.

This is the real reason the battle looks unfinished, and it is invisible in any
gate.

**Two attempts to solve it by prompting failed.** Asking Nano Banana for a
"true 2:1 isometric, rotated 45 degrees, floor as a diamond, no vanishing
point" returned a face-on courtyard both times; the model does not reliably
honour a specified projection. Per `CLAUDE.md` rule 8, that is where it stopped
rather than trying a third phrasing.

**What is actually wrong is a fork, and it is the owner's to pick:**

- **(a) Turn the board to suit the art.** Point `FORWARD` up-screen and
  `LANE_AXIS` across it, so the near team is at the bottom and the far team at
  the top of a rectangular floor. Cells become parallelograms rather than
  diamonds. Cheap, keeps every existing background, and matches how location
  art naturally wants to be drawn — but it is less classically isometric.
- **(b) Turn the art to suit the board.** Build stages corner-on, floor as a
  diamond, aligned to the two 2:1 diagonals. Classic tactics look, and the more
  ambitious one. Prompting will not get there on its own; it likely needs the
  floor constructed rather than generated, with the art placed around it.

Both keep §13.3's rules intact. This is a question about the camera, not about
the formation grammar.

---

## 4. Initiative — interleaved

**Decision (Q9): 9b.** One speed queue holds every unit on both sides. A fast
opponent acts between two of your crew. "Who moves next" is live tactical
information, visible at all times.

Why, over the cheaper option:

- Speed becomes a **real build stat** that loot can buy (§8), so a fast hireling
  is genuinely a different tool from a strong one.
- It feeds the roster game: speed is a trait worth reading on a generated
  person.
- Under team phases, speed only sequences your own units — and *letting the
  player choose that order* is strictly more interesting than forcing it, which
  makes the stat nearly worthless.

**Documented fallback: 9a.** Team phases, speed ordering only your side. Cheaper,
more readable, and it is what the engine already does. If interleaving proves to
hurt readability in play, fall back rather than patching around it.

Readability is protected by telegraphs, not by turn structure: intent is
declared before it resolves (§13.4 step 1) and remains true under interleaving.

---

## 5. Actions — the loadout is the deck

**Decision (Q3): 3b.** No draw randomness in your own actions. Weapons, gear and
role define a fixed, known action set. Deckbuilding happens **between** fights,
when you equip.

The common actions in `GDD` §13.6 stand: Attack, Brace, Cover, Reposition/Swap,
Use item, Talk/Threaten, Withdraw. Equipment adds up to two more.

### 5.1 Randomness lives in the world, not in your hands

What varies is **the board and who walks onto it**:

- cover and hazards supplied by the location (already canon, §13.3);
- **third parties entering mid-fight** — police, a rival crew.

A third party arriving is local pressure (`GDD` §6.6) cashing out tactically. It
is **forecast before you commit**, never rolled behind the screen. This keeps
§18.1 (forecast before commitment), §13.4 (telegraphed intent) and §18.3 (no
hidden dead ends) intact while still making two fights on the same board
different.

### 5.2 The item rule

**An item changes what you can do. It does not add a modifier you compute.**

- Wrong: *+15% accuracy at range 2.*
- Right: *lets you hit the back row through cover.*

This is what "Mewgenics flavour, not Mewgenics depth" means concretely, and it
is the rule that lets a real item pool coexist with Into the Breach
readability.

**It applies to people too.** A level-up changes what someone can do; it is not
a number you compare.

---

## 6. Three tiers of engagement

The same fight, at three levels of attention. The middle tier is what makes the
other two coherent.

| Tier | The player | For |
|---|---|---|
| **Manual** | Full control, interleaved order | The fights that matter |
| **Auto + stance** | Sets policy, watches, seizes control any round | Low-risk fights, one-handed play |
| **Skip to result** | Face-off screen, then outcome | Players here for the story |

### 6.1 Auto costs bodies, not minutes

Auto plays **competently but not optimally.** It trades correctly and targets
sensibly. It does **not** make the triage call, because triage is a judgement
about which of your people matters tonight and that is not knowable from the
board.

So auto lets someone eat a hit you would have prevented:

- a fight you would win comfortably → auto is free;
- a genuinely dangerous fight → auto spends people;
- auto with a veteran near their limit (§7.2) is a real gamble, and §7.3 means
  you **know** it is one.

That makes AUTO a decision rather than a skip button, and it charges the one
currency this game is about.

**Auto must resolve visibly**, round by round, or taking over mid-fight is not
possible. Toggle on and off freely at any round boundary.

### 6.2 Stances

Stances are **how you instruct the auto-battler**. They are not a layer over
manual play. Set at the start, changeable during, team-wide.

- **Aggressive** — take the best attack, accept exposure.
- **Defensive** — hold, brace, attack when it is free.
- **Hold the line** — keep formation and screen the back rows.

### 6.3 Leaders buff stances; they never gate them

A named character present adds to whichever stance is running — healing,
steadier nerve, a better version of the same policy.

**Not having one must never block auto-battle.** Gating a convenience feature
behind a rare resource would punish exactly the narrative-focused players the
feature exists for.

### 6.4 Skip to result

The full auto-resolve, for players who are here for the story. A **face-off
screen** first — who you are up against, what is at stake — then the outcome.

The face-off is what stops "skip" reading as an admin action. It is a beat, not
a dialog.

This is the one place `GDD` §13.7's "not a separate statistical auto-resolve" is
deliberately broken, and it is broken on purpose for an audience that rule did
not consider.

---

## 7. People

### 7.1 Two tiers of person

**Named characters** are FFT story units: rare, deployed deliberately, never
lost to a random alley. They die only in authored beats. Aaro's death remains
fixed canon and never becomes a mission outcome.

**Everyone else is disposable**, Mewgenics-style: generated, genuinely
expendable, and replacing them is a loop rather than a penalty. Their interest
comes from **generated traits worth reading**, not from authorship.

This promotes a line already in `NARRATIVE.md` to a core mechanic: *"Piritori
starts as the cheapest small-quantity market and cheapest source of hired
operatives."*

### 7.2 The career ceiling

A hireling grows for a few levels and then **ages out**. Owner's stated figure:
**about ten fights**, then they retire or die.

*(Ten is the owner's number and a **playtest gate**, per `DESIGN_LOCKS.md` §13 —
not canon until it has been played. Do not silently harden it.)*

The ceiling is the point. Without it, XP builds a permanent super-squad and kills
the churn the roster game depends on. With it:

- **the roster is a conveyor belt, not a collection**;
- investment is real but bounded, and **cannot be re-bought** — money replaces a
  body, nothing replaces six fights of accumulated skill;
- **retirement becomes an earnable good ending.** Most tactics games have one
  exit. Two — and one of them being *they got out* — is emotionally rarer and
  worth having;
- a career of ~10 fights is roughly a chapter, so each chapter naturally has a
  generation of people.

Growth paths differ: some fight hard and level fast, some are simply reliable.
Injuries may take someone off the board for a while without ending them.

### 7.3 The counter is visible late

**Decision (Q6): 6c.** Nothing until they are close to the end, then the game
starts telling you.

Hidden counters would turn the exact spend-or-save decision that is the whole
game into a guess, and canon promises forecast before commitment (§18.1). Fully
visible from fight one is the safe fallback if "late" reads as unfair.

### 7.4 What a retired veteran leaves

**Decision (Q7): 7b + 7c, as one system.** They leave the crew and stay in the
city.

- **They train.** A rookie starts ahead — a level, or an inherited skill.
- **They become a contact.** A name in a bar. Someone who knows what you did.

Training is a service the contact offers, so this is one mechanic, not two. It
turns roster churn into a growing web of people who owe you or resent you —
which is the meta-game the market layer was for, made of humans instead of
prices.

---

## 8. Loot

**Decision (Q4): 4c, asymmetric.** Loot converts **down** into money freely. The
best gear **cannot be bought at any price** — only taken off someone carrying
it. Money buys volume; loot buys capability.

This is what gives territory teeth. Pushing into Jade Lantern ground is not
merely new revenue and new threats: it is **the only place a class of weapon
exists**. It also gives robbery and vengeance (`GDD` §11.5, already canon) a
reason beyond cash.

Gear is carried by people, so **losing a hireling loses their kit** — the
tactical half of the brake in §7.2.

---

## 9. Why you would spend a hireling, and why you would not

The brakes, in the order they bite:

1. **Capability** — they carry your gear, and it goes with them (§8).
2. **Investment** — accumulated levels cannot be re-bought (§7.2).
3. **Reputation** — Piritori remembers. Burn people and the pool thins, prices
   rise, or the only ones who will still work for you are the ones nobody else
   wants.
4. **Money** — bodies cost, and the market layer starves. Real, but the weakest
   alone: money is too fungible to be a brake by itself.
5. **The city notices** (§1.1) — and this one is narrative, never only
   narrative.

---

## 10. Open questions

1. **Trivial fights and skip-to-result:** does *every* fight get a face-off
   screen, or do genuinely trivial ones resolve with no ceremony?
2. **How many traits does a generated hireling carry?** Two or three worth
   reading, or a longer tail? §5.2 caps how deep any one of them can go.
3. **Does Aatami ever stand on the board?** `DESIGN_LOCKS.md` §3 fixes his
   physical role, and §7.1 makes named units rare and precious. Unresolved.
4. **Where does free roam get its fights?** Wandering into trouble, a posted
   job board, provoking a rival — or all three?
5. **What does a leader buff look like** under §5.2's rule? "+healing" is a
   modifier you compute, which the rule forbids. Either the rule bends for
   leaders, or leadership changes what a stance *does*.
