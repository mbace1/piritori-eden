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

#### Movement across the bands

**Owner ruling:** *"crews start in their colour areas and can move to all
coloured areas."*

Side decides where a crew BEGINS and which team it is on. It does not fence
where anyone may go — a unit can reposition into the neutral rows and on into
the opposition's ground.

For that to be true rather than decorative, a slot's second component is a
**unified depth** across the whole board, not a row inside a private grid. That
also collapsed two grids into one: the occupancy key used to carry the side, so
two fighters could stand in "the same" cell because it was two different cells.
A cell is a cell now and one body fits in it.

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

### 8.1 What the rule actually constrains — money, not narrative

Building this surfaced a conflict with canon and canon won. `enc-first-firearm`
**sells** the first handgun for €180, in the authored slice, which outranks any
mechanic invented later. So the handgun is market gear, the dearest weapon in
the game is buyable, and the tier is **not** a price ordering.

The rule is therefore stated on the *channel*, not the price:

- **No cash may reach the taken-only tier.** Nothing that spends money may grant
  it — enforced on authored content by `content/validate-slice.mjs`, which is
  where it can really be broken, and on state by `GameState.is_purchasable`.
- **A story beat may still hand you anything.** The story is not a shop, and
  `NARRATIVE.md` is not negotiable by this section.

Currently taken-only: `chain`, `sawn-off`. Both are faction gear.

### 8.2 Loot comes off the fallen, not off the field

`FightManager.dropped_kit()` collects from **downed** fighters only. Somebody who
broke and ran took their weapon with them, so a rout yields less than a break.

That is a deliberate tension against §1's *triage, not a damage race*: the clean,
merciful win should **cost** you capability rather than being free in every
currency at once. It is a live balance question, not a settled one — if it turns
out to push every fight toward maximum violence it is the first thing to change.

### 8.3 Settlement order

What your side dropped is removed **before** anything is picked up, so a win that
cost you a body is never quietly refunded by that body's own weapon.

---

## 8.4 Gear has a condition, and it only goes one way

**Owner ruling, 2026-08-22.** Gear carries between chapters (see the persistence
ledger in `GAME_DESIGN_DOCUMENT.md`) and degrades as it does.

### Four stages

    new  ->  used  ->  faulty  ->  broken

**It steps down at a chapter boundary**, not per fight. That taxes *hoarding*
rather than use, which is the right target: the thing being prevented is a
farmed stockpile carried into chapter four, and a per-fight slide would instead
punish the player for playing.

**Rarely, it breaks outright** rather than stepping. A break is felt as an event
where a slide is not, and it is the version that teaches the lesson in one go —
particularly when what breaks is a §8 weapon that cannot be bought at any price,
because replacing it means going and taking another one off somebody.

### Resale falls with condition

The fence pays less for worn gear. That produces a decision the flat model could
not: **sell it while it is still worth something, or keep using it and watch the
price fall.** Holding a weapon has a carrying cost, so a stockpile is not free
even before it degrades into uselessness.

It also gives freshly-taken loot a premium. Gear off a body is likelier to be new,
which quietly makes winning fights a better source of value than hoarding.

### What this obliges

- Equipment needs a **condition** on the instance, not on the type. Two pipes
  must be able to be in different states, which the current `equipment_owned`
  list of ids cannot express.
- `resale_of()` is currently a flat constant per type. It has to take condition,
  and — per the market ruling — eventually district and day as well.
- **`faulty` needs a mechanical meaning**, not just a lower price. Undecided:
  a chance to fail, reduced effect, or something weapon-specific.
- Whether `broken` is kept, discarded, or sold for scrap is undecided.

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

## 9.5 Third parties — owner ruling, 2026-08-22

**Decision (Q3): 3c, and the trigger is noise and lethality.** Heat rises with
firearms, long fights and bodies on the ground until somebody turns up. That is
what makes the quick, merciful win mechanically valuable rather than just
morally nicer — and it is the counterweight to §8.2, where the merciful win
yields less loot.

### 9.5.1 They enter along the depth axis

A third party arrives at the **top or the bottom of the grid** — behind one
side's back rank, never in the middle. The board is already a corridor of six
lanes by eight depth (§3.05); an arrival at either end is the one entrance that
threatens a formation rather than appearing inside it.

Which end matters: whoever they come in behind is suddenly the side with a
problem at their back.

### 9.5.2 Both crews choose, and the choice is the branch

When they arrive, **each side gets a posture**, not a scripted outcome:

- **back off** — withdraw toward the back of the grid and let it happen
- **help friends** — reach the downed before the third party does
- **engage** — treat them as an enemy

This is deliberately the same shape as the stance system in §6.2: the player is
asked a question, and the fight answers it.

### 9.5.3 Police subdue until attacked

Their default posture is **subdue**, and its bite is on the fallen: anyone
**downed on the board when they arrive is taken**, and is gone from the roster.
That makes leaving a body behind the real cost of a loud fight, and it lands
directly on the career system (§7) — a downed crew member is not merely hurt,
they are lost, and no money replaces the fights they had learned.

**If they are attacked, they become a third hostile side** and fight everyone.
So the escalation is the player's to cause. A crew that stands still loses its
casualties; a crew that opens fire on police has a genuinely worse night.

### 9.5.35 A third party is a disposition, not a faction — owner ruling

Third parties differ by **how they behave**, not by who they are:

- **Police react.** They prefer a non-lethal approach and do not start anything.
  Subdue is the default and violence is a response.
- **Rivals do not.** Another crew arriving may simply attack on sight.

So the board needs a third side that carries a **disposition**, and "police" and
"rival crew" are two values of it rather than two systems.

**Targeting is logical, not scripted.** Whoever is nearest, whoever is the
threat, whoever just hit them. Not a rule that says police always go for the
player, which would make them a punishment rather than a participant.

### 9.5.36 The trap this creates, found before it shipped

Everything in the fight currently reads `is_player_controlled == false` as
**"the enemy"**. A third side is not player-controlled either, so without care it
inherits every assumption about the opposition. The proof is `dropped_kit(false)`,
which collects the kit of everyone who is not the player's — meaning **the player
would loot the police**.

So `side` becomes the authority on who somebody is, and
`is_player_controlled` goes back to meaning only *who gives them orders*. Any
question of the form "are they my enemy" must ask `side`.

### 9.5.4 What this is not

Not authored per battle. Content does not list which fights have police; the
fight earns them. Anything authored would make the trigger decorative.

---

## 9.6 Cover has two grades — owner ruling, 2026-08-22

**Decision: rare hard cover.** One or two props in a yard genuinely stop a
firearm; everything else stays soft and buys a single intercepted swing.

The resolver has always had both branches — `hard_block` stops anything,
`soft_block` is beaten by a piercing weapon — and `BattleBuilder._cover_props()`
marked every authored effect soft, so the hard branch was live code nobody could
reach. Content now decides.

Why rare rather than none: three arenas have arrived whose whole character is
concrete and steel, and cover that never stops anything makes them scenery. Why
rare rather than common: cover that reliably stops firearms turns every fight
into two crews behind bins.

It also earns the sawn-off. A weapon that ignores most cover is worth taking off
somebody (§8), rather than merely being called unbuyable.

**A gate asserts the current state either way.** `test_battle.gd` checks that all
slice cover is soft; the day a hard prop is authored it fails and points at
`battle.cover_blocks`, the copy that finally becomes reachable.

---

## 9.7 Where loot becomes money — owner ruling, 2026-08-22

**Decision: a fence at Piritori now, an earned contact later.**

`sell_loot()` has been built and tested since §8 and no screen has ever called
it, so loot could not actually convert down in play. It converts at **Piritori**,
which costs no new fiction: `NARRATIVE.md` already makes Piritori the cheapest
small-quantity market and the cheapest source of hired operatives.

The travel requirement is the whole point. Selling from the crew screen would
make loot weightless — a number you clear whenever you like — and would take the
map out of an economy that is supposed to run through it. Having to carry a
sawn-off to Piritori puts you where the hiring pool and the pressure both are.

**Later: a better fence you have to earn.** An encounter introduces a contact
who pays properly, so the Piritori rate becomes the floor rather than the only
price. Deliberately second: the first fence should exist from the start, or
early loot is dead weight with no explanation.

---

## 9.8 What a retired crew member becomes — owner ruling, 2026-08-22

§7.2 already retires people alive and writes a memory. This is what the memory
is for.

**Mostly: a name in the city.** They turn up in Arvo's broadcasts, in market
gossip, in the flavour of an encounter. This is the free layer and it runs under
everything else — the memory is already being recorded, so the city having one
costs almost nothing.

**Sometimes: a person you can find, in a bar.** Specifically the McCormick bars
around the Siltanen / Kuudes Linja complex, or another bar. `NARRATIVE.md`
already gives the McCormicks the bars and restaurants, so this needs no new
fiction and it gives those places a reason to be visited that is not buying a
weapon.

They can also **turn up mid-mission as a saving grace**: a tip that opens an
option, or an extra body on the board. That is what makes retirement pay out
rather than merely stop costing — and it is the strongest argument the game can
make for retiring somebody *before* they are used up, since a veteran who leaves
in one piece is a veteran who can walk back in.

**Rarely: across the board.** Some end up working for the other side, and they
know how you fight. Rare and authored, never systemic: if every retiree could
turn up hostile it becomes noise, and `NARRATIVE.md`'s rule that people are never
scenery cuts in both directions.

### 9.8.1 What this makes true elsewhere

- Bars become a destination, not a shopfront.
- The career ceiling (§7.1) stops being purely a loss.
- `retired:<id>` memories, which are written today and read by nothing, get
  their first consumer.

---

## 9.9 The shot-caller — owner ruling, 2026-08-22

### 9.9.1 Aatami fights early, then stops

He fights the first battles because he cannot afford crew, and then he stops.
The withdrawal **is** the arc: `NARRATIVE.md` says he ends up calling the shots
while his crew performs the work, suffers wounds and may die, and the moment he
stops going himself is the moment he becomes the thing the story is about. The
game says it without a line of dialogue.

It also answers an ordinary early-game problem honestly. On day one there is
almost no money and the roster is thin, so *who fights the first battle* has one
sensible answer: he does.

### 9.9.2 Narrative characters are usually a bonus, not a body

Named people (§7.1) generally act **from the shot-caller side**, supplying an
advantage rather than standing in a lane. They **can** still fight — the option
is never removed — but their normal contribution is what they give the crew.

This keeps the two-tier roster honest. A named character who fought every battle
would make the disposable tier decorative, which is the failure §7 exists to
avoid.

### 9.9.3 A veteran can be promoted into the chair

**High-level crew may be designated shot-caller, and their buffs double** (or an
equivalent advantage).

This is the important one, because it gives §7 a **third thing to do with a
veteran**. Today there are two exits — reach the ceiling, or retire early — and
both remove the person. Promotion keeps them, changes what they are for, and
makes the career ladder point somewhere other than the door.

It also gives the stance system (§6.2) a source: stances are the shot-caller's
instrument, so *who is calling* should change what calling is worth.

### 9.9.4 Open, and deliberately not decided here

- Does promotion end their fighting career, or merely change their default?
- Is there one chair or several?
- Does the doubled buff apply to stance weighting, to competencies, or both?

---

## 9.10 Death — owner ruling, 2026-08-22

**People die.** Not authored per battle, not gated behind a flag on a fight.
Death is a standing possibility and the fight decides it.

That supersedes the current `death_eligible` handling, where the slice's early
battles simply say no. A flag that decides whether death exists makes death an
event the content grants; the ruling is that it is a risk the player runs.

### 9.10.1 Lethality is a rate, not a switch

**Guns kill faster than knives, and fists can kill too.** Every weapon can end
somebody; they differ in how quickly.

This matters more than a lethal / non-lethal tag, which is what the code has
today (`_weapon_is_lethal`, a boolean on a tag). A rate means an unarmed brawl
that goes long is genuinely dangerous, which is the thing that makes a quick
resolution valuable on its own terms — and it lines up with §9.5, where long
loud fights are also what brings the police.

It also sharpens §8. The unbuyable weapons are precisely the ones that kill
fastest, so taking a sawn-off off a body raises the stakes for **both** sides.
Arming yourself is a decision with a cost, not an upgrade.

### 9.10.2 The disposable are disposable; veterans are not

**Early-tier people are disposable. Higher-tier people are much less so.**

Two things at once, and both are wanted:

- **Economically** a rookie is cheap and replaceable — that is the churn §7 is
  built on, and the hiring pool exists to feed it.
- **Mechanically** a veteran is harder to kill. Experience buys survivability,
  not only effectiveness.

The consequence is the point: investing in somebody is rational because they
become likelier to come back, and the **career ceiling stays the main thing that
removes a veteran** rather than a stray hit. Losing one is supposed to be a
disaster, not a die roll — while losing a rookie is Tuesday.

### 9.10.3 Three ways to lose somebody, now

1. **The ceiling** (§7) — they age out, alive, and become part of the city (§9.8).
2. **The police** (§9.5) — downed on the board when they arrive, and taken.
3. **Death** — anywhere, by any weapon, fastest by firearm and least likely to a
   veteran.

Only the first is chosen. That is the right balance: the game should let a player
retire somebody deliberately, and never let them feel safe.

### 9.10.4 What this obliges

- Weapons need a **kill rate**, replacing the lethal boolean.
- Fighters need survivability that scales with fights survived, distinct from
  condition.
- `death_eligible` needs re-purposing or removing; a gate asserts today's
  authored value and will have to be revisited.
- `NARRATIVE.md` is untouched: Aaro's death remains fixed canon and is never a
  battle outcome.

---

## 9.11 Classes are combat roles — owner ruling, 2026-08-23

**Redone from combat outward**, against FFT, Mewgenics and Into the Breach. The
previous six — runner, muscle, watcher, fixer, driver, local — were narrative and
logistical roles that happened to fight. These are fighting roles.

### What this supersedes

- `MODULAR_CHARACTER_SYSTEM.md`'s subclass table, as a description of what a unit
  DOES. Its silhouette and diegetic-cue guidance still stands as art direction.
- `art-library/characters/concepts-3d/SPEC.md` §5, "a role needs one mesh".

### The six

Each class is a **verb**, not a stat block — Into the Breach's discipline, where
a unit is the one thing it does to the board.

| Class | Weapons | Board role | Signature verb |
|---|---|---|---|
| **Bruiser** | fists, blunt | front | **PIN** — the target cannot reposition next round |
| **Anchor** | blunt | front | **COVER** — an adjacent ally takes reduced harm |
| **Blade** | hand weapons | flank | **OPEN** — ignores soft cover; hits the exposed |
| **Shooter** | firearms | back | **LINE** — clear-lane damage at range |
| **Spotter** | light ranged | back | **MARK** — grants the exact read on a target |
| **Courier** | fists, light | anywhere | **SHOVE** — moves a body one cell |

Two of these have homes already waiting. **MARK** is precisely the intel that
gates `target_lane` in the telegraph — that gate exists and nothing supplies it.
**COVER** is the cover system in §9.6, which is fully implemented.

### Perks are the stats

**Strength** (harm) · **Speed** (tempo and initiative) · **Wits** (accuracy and
intel) · **Nerve** (morale) · **Toughness** (condition).

### Progression is per PERSON, both halves

Each level: **choose one skill from two or three offered**, and **spend one perk
point**. A **glory bonus** — surviving at near-death, or a double kill — pays
**two perk points**.

Per person rather than per class, for both. That is the harder version to build
and the one that agrees with everything else: §7 makes a crew member a bounded
investment, §9.8 makes a retiree a contact worth having, and §9.10 makes a
veteran harder to kill. A class that learned centrally would make all of that
decoration.

It also gives the career ceiling its meaning back. Ten fights is a handful of
levels, so a crew member arrives, becomes genuinely good, and leaves — and the
levels are the reason losing one hurts.

### Appearance is a family, not a fixed body

A class does **not** own one mesh. It owns a **look**: thin, hooded, heavy,
and so on — with **multiple colours and variants** inside it.

This softens `SPEC.md` §5 rather than discarding it. The reason a role had to be
readable at a glance still holds; what changes is that the read comes from a
family resemblance plus the free hue-band recolour, not from one silhouette per
class. It is also the only version that survives a roster of generated people.

### What this obliges

- A class table in content, with verb, weapon family and look family.
- Per-crew-member level, chosen skills and spent perks — none of which exist.
- Skill offers: two or three per level, drawn from somewhere.
- The verbs themselves. None of the six is implemented; MARK and COVER have the
  most support already built.
- A migration for the six existing roles, which are wired into
  `CrewGenerator.ROLES`, `UNIT_BY_ROLE`, authored crew, authored opponents and
  the 3D bodies.

---

## 9.12 A person is not labelled — owner ruling, 2026-08-23

**Nobody has "a class". People hold aptitudes, and most hold more than one.**

This supersedes §9.11's framing, not its content. The six combat classes stand;
what changes is that they are **not exclusive** and they do not replace the six
older roles. Runner, muscle, watcher, fixer, driver and local join bruiser,
anchor, blade, shooter, spotter and courier as **twelve aptitudes in one pool**.

### Why this is better than the migration it replaces

The tree had two vocabularies and I was about to spend a day making one of them
win. They were never competing — the old six describe what somebody is FOR and
the new six describe what they DO in a fight, and a person can obviously be both.
A driver who can shoot is not a contradiction; it is the ordinary case.

**Potential, not framework.** The point is what a person could become, not which
box they were put in.

### Two or three, and hybrids are the interesting ones

Most people hold **two**, some **three**. The combinations are the design:

- muscle + spotter — a heavy who reads the room
- courier + blade — gets there first and opens somebody up
- local + fixer — the person who can end a fight before it starts

None of that needs a name. A crew member is the sum of what they can do, and
naming the hybrid would put the box back.

### Skills follow the aptitudes

A skill is offered because of an aptitude the person holds. Somebody with two
draws from two pools; somebody with three has a wider and shallower choice. That
makes the third aptitude a real trade rather than a strict gain — breadth against
depth — which is what stops "three is simply better".

### What this obliges

- The class table becomes an **aptitude** table, with the old six added and
  their own verbs written.
- A crew member holds a **set**, and the generator rolls two or three.
- Appearance follows the **first** aptitude, so the look family still reads.
- Skills are keyed by aptitude rather than by a single class.
- Nothing needs migrating away. Both vocabularies stay, which is why this is
  cheaper as well as better.

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
