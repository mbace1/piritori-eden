# PIRITORI → EDEN — phasing

Status: **ACTIVE**
Owner direction: 2026-08-21 (supersedes the earlier entry of the same date)

Supersedes older roadmap material where they disagree. It does **not**
supersede `DESIGN_AUTHORITY.md` or the canon stack beneath it on questions of
story, place and character — but on **what kind of game this is**, this file is
the newest owner direction and wins.

---

## 0. Owner direction — the pivot

> *"the base game should be more around the grid fighter mechanic. this should
> take cues from tactics games (FF: Tactics, Metal Slug Tactics) card battlers
> (Slay the Spire) and other turn based fighting games. the characters weapons
> and everything will be the inventory and item pools that make the game
> interesting. the loot involved will make things meaningful."*
>
> *"the dope wars is the motivation and the meta-game. it's a market game and
> resource management layer that is then executed by the fights and other
> narrative games."*

### 0.1 Why this is more coherent than what it replaces

The old design had a market layer and a battle layer that barely touched. You
could play the economy and almost never fight. That is exactly the
fragmentation `GAME_DESIGN_DOCUMENT.md` §24 warns about, and it is why 215
passing checks still felt like a skeleton.

This closes it into one loop:

**market funds the loadout → fights produce loot → loot buys capability →
capability opens territory → territory opens market.**

One game, rather than two prototypes sharing a save file.

### 0.2 The five decisions

Answered by the owner, 2026-08-21, in this order.

**1 — Campaign with run-shaped chapters.** Each era or act is a self-contained
arc with its own roster and loot pool. What carries between chapters is money,
reputation and a few named survivors. Keeps the fixed narrative beats that canon
will not give up, while letting each chapter have the fresh-build energy that
makes loot mean anything.

**2 — Two tiers of person.**
- **Named characters** are FFT story units: rare, deployed deliberately, and
  never lost to a random alley. They die only in authored beats.
- **Everyone else is disposable**, Mewgenics-style. Hired crew are generated,
  genuinely expendable, and replacing them *is* a loop rather than a penalty.

This promotes a line already in `NARRATIVE.md` to a core mechanic: *"Piritori
starts as the cheapest small-quantity market and cheapest source of hired
operatives."* The recruitment pipeline stops being flavour.

**3 — The loadout is the deck.** No draw randomness in your own actions. Your
weapons, gear and role define a fixed, known action set; the deckbuilding
happens between fights, when you equip. Loot *is* deck construction.

**Randomness lives in the world, not in your hands.** What varies is the board
and who walks onto it: cover and hazards the location supplies, and third
parties — police, a rival crew — entering mid-fight. This is Into the Breach's
model and it is why that game is readable. It also keeps canon's promises
intact: §18.1 forecast before commitment, §13.4 telegraphed intent, §18.3 no
hidden dead ends. A third party arriving is local pressure (§6.6) cashing out
tactically, and it is **forecast before you commit**, never rolled behind the
screen.

**4 — The loot economy is asymmetric.** Loot converts *down* into money freely.
The best gear cannot be bought at any price — only taken off someone carrying
it. Money buys volume; loot buys capability.

This is what gives territory teeth. Pushing into Jade Lantern ground is not
just "new revenue, new threats" — it is **the only place a class of weapon
exists**. It also gives robbery and vengeance (§11.5, already canon) a reason
beyond cash.

**5 — Chapter clock, day/block inside it.** A chapter is a handful of days; a
day is Day and Night blocks; travel and actions spend block time. You are free
inside the budget — you can do anything, but not everything. Debt accrues
nightly. The engine already works this way (`block_index`, nightly settlement,
scheduled reveals), so it is the cheapest option and the one with the most
pressure.

*Owner note: adjustable if chapters feel confining.*

### 0.3 What this overrides

Recorded rather than silently averaged, per `DESIGN_AUTHORITY.md`.

| Canon | Said | Now |
|---|---|---|
| `GDD` pillar 2.4 + §24 kill condition | *"If combat becomes the default profitable solution, lower its rewards"* | Combat **is** the base game. Rewards are the point. |
| `GDD` §24 gate 8 | *"Are battles rare and consequential enough to support roster attachment?"* | Battles are frequent. Attachment comes from named units and from survivors, not from scarcity. |
| `GDD` §13.2 | *"Every crew member remains individually important"* | True of named characters. **Not** true of hired crew, and should not be — their interest comes from generated traits, not authorship. |
| `GDD` §23.2 | Two battles in the slice, one avoidable | Many battles. |
| `GDD` §9.1 | One product in the slice | A product economy **and** an item/loot economy, with §0.2(4)'s asymmetry between them. |
| `DESIGN_LOCKS` §1.1 | Fixed 14-block schedule, one authored encounter per block | Blocks remain the clock. The **schedule** loosens: authored beats sit at fixed points, and free roam fills the rest. |

**Not overridden, and not negotiable by a mechanic:** everything in
`NARRATIVE.md`. Aaro's death stays fixed and never becomes a mission. Arvo is a
fictional homage, not a portrait. People are never scenery — a fight in a stairwell
answers to that before it answers to whether it is fun.

---

## 1. Reference calibration

| Reference | Take | Do not take |
|---|---|---|
| **Into the Breach** | The goal for readability. Perfect information, small board, deterministic player actions, telegraphed everything. | Its tiny item count — this game wants more. |
| **Final Fantasy Tactics** | Story units used rarely and deliberately. A world map with nodes, travel, and encounters en route. | Its sprawl, its job grind, its free-walking grid. |
| **Metal Slug Tactics** | Compact encounters, momentum, the feel of a fight that resolves fast. | — |
| **Mewgenics** | The item and buff *flavour* — generated units with traits worth reading. | **Its depth.** Owner: "likely even too deep for this game." |
| **Slay the Spire** | Build-crafting: a run is defined by what you assembled. | Literal cards, draw, energy, discard. |
| **Dope Wars** | The market pressure and the clock. | Being the whole game. |
| **Darkest Dungeon** | Roster weight, consequence, presentation. | — |

### 1.1 The item rule

**An item changes what you can do. It does not add a modifier you have to
compute.**

"+15% accuracy at range 2" is the wrong kind of item. "Lets you hit the back row
through cover" is the right kind. This is what "Mewgenics but shallower" means
concretely, and it is the rule that keeps Into the Breach readability while
having a real item pool.

---

## 2. Tool reality

| Need | Tool | Reality |
|---|---|---|
| 2D concepts, poses, UI, scene art | **Nano Banana** | Strong, free. Style-anchor with `--images` against the cast's own approved art. |
| Character pose sets | **Nano Banana** + `art-src/gen-pose-set.sh` | Nine poses per role. Whole-figure composites, not modular parts. |
| A 3D presenter (Arvo only) | **Meshy** | Done and registered. `ART_BIBLE.md` §13.2 permits exactly one. Do not widen without an owner ruling. |
| Animation | **Code, over the pose set** | Held frames and hard cuts, not interpolated skeletal motion. Cut-paper does not want tweening. |

**Meshy credits are real money.** Check the balance before a batch; confirm
before spending a large share.

**Anything headed for rigging is concepted in a T-pose** with a volumetric body.
Auto-rigging fails on a stick figure.

---

## 3. Phases

### Phase 0 — make it testable from a phone *(prerequisite)*

`CLAUDE.md` rules 3 and 6 are currently unsatisfiable: nothing reads a URL
parameter, so reaching a battle means playing a dozen blocks from cold. Every
phase below is iterated by **feel**, and feel cannot be reviewed through a
twelve-block click path.

Done when `?day=5&battle=courtyard-3v3` drops you straight into a fight on a
phone, and a debug HUD shows block, cash and load errors.

This is small and it pays for itself the first afternoon.

### Phase A — the fight is worth repeating

The tactics core, built with the gear that already exists. Not new content:
better verbs.

- Deterministic player actions drawn from loadout (§0.2 3)
- Telegraphs that make Into the Breach readability real
- Board hazards and cover the location supplies
- Third-party entry, forecast before commitment
- The 3×3 / 3×4 formation from `GDD` §13.3 — that survives intact

**Gate: you would voluntarily fight ten of these.** If the answer is no, nothing
downstream saves it, and that judgement is the owner's, made on a phone.

### Phase B — loot makes it varied

The item pool and the asymmetric economy. Gear that changes what you can do, per
§1.1. Enough breadth that two crews with different kit play differently against
the same opposition.

**Gate: the same fight, fought twice with different loadouts, is two fights.**

### Phase C — the map is a game

Travel as a mini-game rather than a menu: random encounters en route, evading
police and rivals, transport choices that help and limit. Territory unlocks that
open services, enemies and gear pools together.

**Gate: choosing a route is a real decision, not a confirmation dialog.**

### Phase D — the meta closes the loop

The market layer wired to the fights: chapters, crew churn, the recruitment
pipeline at Piritori, debt pressure, and the narrative sections that sit in each
city area on the way through a mission.

**Gate: a full chapter arc plays, and the loop in §0.1 is legible to a player
who was told nothing.**

### Phase E — Era I feature-complete

Exactly the seven criteria in `DESIGN_LOCKS.md` §12.1. Not a new list — that
one. Era II opens only when they are all met.

---

## 4. Standing rules

1. **Canon outranks code.** `DESIGN_AUTHORITY.md` resolves contradictions. When
   two sources at the same level disagree, stop and record a decision.
2. **A gate that cannot fail is a finding.** Gates press the button; they do not
   call the model.
3. **`data/` is generated.** Never hand-edit it.
4. **An art change ends in a picture**, not a green suite. The suite certifies
   *works* and cannot see *looks* — or *plays*.
5. **Show art with intent to approve.**
6. **Never silently promote a placeholder to canon** (`DESIGN_LOCKS.md` §13).
7. **People remain people** (`NARRATIVE.md`).

---

## 5. Open questions

1. **How big is a chapter?** §0.2(5) says "a handful of days". Three? Seven? The
   current slice is seven and that is the only number that has been playtested.
2. **What does a hired crew member have?** Mewgenics-lite means generated traits
   worth reading. Two or three per person, or a longer tail?
3. **Where does free roam get its fights?** Wandering into trouble, a posted
   job board, provoking a rival — or all three?
4. **Does the player character stand on the board?** `DESIGN_LOCKS.md` §3 fixes
   Aatami's physical role, and §0.2(2) now makes named units rare and precious.
   Is Aatami himself ever deployed?
