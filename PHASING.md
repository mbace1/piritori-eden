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

### 0.25 The system doc

The combat and progression system these decisions describe is written up in
**`COMBAT.md`**, which sits beneath `GAME_DESIGN_DOCUMENT.md` in the canon order
and supersedes its §13 where they differ. Every such difference is listed in
`COMBAT.md` §2 rather than left to be found.

Phase A builds against that document.

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

### 1.05 What the 3D test actually showed, 2026-08-22

The owner asked whether a 3D character and weapon work. They do — the mesh half
of the pipeline is not the obstacle. Three things it turned up that would
otherwise have been found late:

**Meshy normalises scale.** Both assets came back exactly 2.0 units tall, so the
bat is as tall as the man. Real scale is set at import and is not carried by the
file. A pipeline that trusted the mesh's own size would put a bat in someone's
hand at their full height.

**2D markers survive into 3D.** The equipment sheets carry a cyan grip dot,
which is an anchor for the 2D compositor. Meshy baked it into the bat's texture
as a cyan blob on the pommel. Anything headed for 3D needs its 2D furniture
removed first.

**Rigging is the actual gap**, not modelling. A static prop is ready today; a
character that moves is not, and nothing in the local tooling closes that.

None of this widens `ART_BIBLE.md` §13.2. It is evidence for a decision the
owner has not made.

### 1.055 THE GAME IS 3D — owner ruling, 2026-08-22

> *"change the goal from 2d to 3d"*

This is the largest ruling in this file and it is not a §13.2 amendment. It
replaces the premise `ART_BIBLE.md` is built on.

**What it overturns.** The Art Bible describes a handmade cut-cardstock world:
broad flat paper shapes, torn fibres, sparse marker and ink, "characters,
animals, weapons, foliage, locations and UI belong to the same handmade material
family". §13.2's single 3D exception for the presenter exists *because* of that
premise. With the premise changed, the exception is meaningless — and so is a
good deal of the document around it.

**What survives, and it is more than it looks.** None of this was ever about
being 2D:

- the palette, the Kallio night, the muted practical Finnish register;
- the readability rules — silhouette first, cover as discrete objects,
  telegraphed intent, colour never carrying meaning alone;
- the board: 6×3 a side with a neutral band, true 2:1 isometric, the canonical
  arena, `STAGE_SPEC.md`;
- everything in `COMBAT.md`, which describes rules rather than pixels;
- `NARRATIVE.md`, entirely and permanently.

**What it costs.** Every 2D asset registered so far — six nine-pose cast sets,
six arenas, the equipment sheets — becomes reference rather than runtime art.
They are not wasted: the 3D pipeline is *fed* by them, and the muscle model
exists because its 2D sheet did. But the battle renderer draws standees today
and would have to draw scenes instead.

**What has to happen before this is real, none of it done:**

1. `ART_BIBLE.md` rewritten. It is currently the authority and it currently
   describes a different game. Until then it and this file openly disagree, and
   `DESIGN_AUTHORITY.md` says to record that rather than average it.
2. The battle renderer moved from `_draw()` standees to a 3D scene.
3. The isometric camera made real — an orthographic `Camera3D` at the 2:1 angle
   the arena already assumes.
4. Texture weight solved before six roles land (PHASING §1.06).

**The honest risk.** The reason the Art Bible chose cut paper is that it is
cheap to make consistent and hard to make ugly. 3D is neither. The thing that
made every stage sit right — one canonical arena and art produced to it — has to
survive the change, or the project spends its next weeks the way it spent
tonight: fitting the game to whatever the tool returned.

### 1.056 The grid gets easier in 3D — tested 2026-08-22

The owner's read on seeing the first 3D arena: *"this proves that it may be
easier to do grid structure here as well."* It is, and by more than it looks.

**Everything the 2D board computes by hand becomes a camera property.** The 2D
renderer carries a square-tile rule, `FORWARD (1, -0.5)`, `LANE_AXIS (1, 0.5)`,
a depth sort, an arena diamond in normalised plate coordinates, and a
`STAGE_SPEC` whose job is to make painted art agree with that arithmetic. All of
it exists to fake a projection.

In 3D a cell is a **square on the ground** and an orthographic `Camera3D` at
yaw 45°, pitch −26.565° (`atan(0.5)`, the same 2:1) does the projection. The
prototype's grid block contains no projection maths at all. Change the camera
angle and the board follows correctly for free — which is precisely what could
not happen in 2D, where a wrong tile aspect silently made the board
non-isometric and no gate could see it.

**`STAGE_SPEC.md` mostly dissolves with it.** Its whole purpose is making a
painting's floor sit where the arena is. A 3D arena has a real floor; the board
is placed on it by measurement, not by agreement.

**Two things the prototype showed that would have cost time later.**

*The ground is not at y=0.* A Meshy diorama has a base with real thickness, so
the walkable surface sits well up inside its bounding box — the first render
had the crew standing in mid-air above a wall. Measure it from the AABB.

*Lighting is what unifies the styles*, exactly as the owner guessed. A photoreal
arena and a stylised character stop arguing when they share a light source and
the character casts a real shadow onto the ground. The shadow does more work
than any amount of palette matching.

### 1.06 Rig, animation and roster variety, 2026-08-22

**Owner ruling: rig and animate.** This widens `ART_BIBLE.md` §13.2, which until
now made 3D a single tightly-contained exception for the presenter inside the
TV. Recorded here rather than applied quietly; §13.2 needs amending if 3D units
reach the board.

**The whole chain works.** 2D art → T-pose → mesh → rig → clip → Godot, proved
end to end: a 24-bone skeleton with `Hips / LeftUpLeg / …`, a 1.07s walking clip
of 29 tracks, deforming correctly in the engine. 35 credits total (743 → 708),
of which the rig itself was 5 and **walking and running came free with it**.

`~/.meshy/rig.py` is the tool that made it possible. `m3d.sh` stops at
image-to-3d, so a character could be modelled and never move. The two endpoints
it was missing are `POST /openapi/v1/rigging` (input_task_id + model_url) and
`POST /openapi/v1/animations` (rig_task_id + action_id).

**A roster does NOT need a model per person.** One rigged mesh recoloured by a
hue-band shader gives believable separate people at zero credits and zero extra
download — tested with four at once, differing in jacket and trousers while
keeping skin and boots. So the economics are: **one model per ROLE** (the
silhouette and build are what a role is), and its crew are recolours.

The trap that took one pass to find: pale skin and a cream jacket are both
low-saturation and bright, so a band wide enough to catch the jacket caught
faces and hands and turned the crew green. Skin is a narrow warm hue with real
saturation; protect it explicitly before shifting anything.

**Two things not yet solved.**

*Weight.* A rigged glb is 7.1MB and **6.5MB of that is one PNG texture** — the
same problem Arvo had, with the same fix (`process/size_limit` on the imported
texture). Uncapped, six roles would add 42MB to a build that is already 58.

*The boots.* They read as too large on the model, and that is inherited from the
2D T-pose rather than introduced by Meshy. It is fixed by redrawing the source,
not by touching the mesh.

### 1.07 What the Meshy API actually does — verified 2026-08-22

A capability summary was supplied. Rather than plan against it, each claim was
probed against the key we hold, because a vendor page can describe a web app, a
newer tier, or a feature that is not in the API at all.

**Real and callable:**

| Endpoint | Use |
|---|---|
| `POST /openapi/v1/image-to-3d` | the one already in `m3d.sh` |
| `POST /openapi/v1/multi-image-to-3d` | orthographic reference sheets — front/side/rear driving one mesh |
| `POST /openapi/v1/rigging` | skeleton, and walk + run come free with it |
| `POST /openapi/v1/animations` | canned clips onto a rig, 3 credits each |
| `POST /openapi/v1/retexture` | new texture on existing geometry — get the SHAPE right first |
| `POST /openapi/v1/remesh` | topology and polycount |
| `POST /openapi/v2/text-to-3d` | exploration |

**NOT available on this key: text-to-motion.** All of `/v1/text-to-motion`,
`/v2/text-to-motion` and `/v1/motions` return NoMatchingRoute. Bespoke described
motion is not something we can plan around; clips come from the canned library.

**The animation library, enumerated.** `action_id` is an INT, not a string, and
there is no list endpoint — but the clip's name is in the returned URL, so the
library can be read without downloading anything:

| id | clip | | id | clip |
|---|---|---|---|---|
| 0 | Idle | | 5 | BackLeft_run |
| 1 | Walking_Woman | | 6 | BackRight_Run |
| 2 | Alert | | 7 | BeHit_FlyUp |
| 3 | Arise | | 8 | Dead |
| 4 | Attack | | 9 | ForwardLeft_Run_Fight |

0, 4, 7 and 8 are exactly the four a fight needs. Enumerating cost 30 credits
and is done once for all time.

**The production rules worth keeping from the summary**, all consistent with
what was observed: image-to-3D beats text-to-3D for final assets; give it boring
references — one object, plain background, even light, nothing crossing the
silhouette; separate geometry from texture and fix the shape first; keep small
detail in the texture rather than the mesh; generate character, weapon and hat
as separate assets rather than one figure holding things; and put T-POSE in the
prompt for anything to be rigged, which this project learned the hard way twice.

### 1.08 What Meshy actually costs — measured 2026-08-22

Estimates in this file were wrong and are corrected from the balance, not from
the price list.

| step | estimated | ACTUAL |
|---|---|---|
| image-to-3d, textured, 18k polycount | 15 | **30** |
| image-to-3d, 12k, prop | 15 | 15 |
| rigging (walk + run included) | 5 | 5 |
| one canned animation clip | — | 3 |

The 15 figure came from a 12k untextured prop. A textured character at 18k is
**30**, so a role is **35 credits** from concept to rigged, not 20 — and six
roles is **210, not 120**. That difference was noticed as it happened by
watching the balance drop 663 → 483 across six meshes.

**Watch the balance, do not trust the estimate.** Credits are real money
(global `CLAUDE.md`), and an estimate that is half the true cost is worse than
no estimate because it gets used to authorise a batch.

### 1.09 The two Meshy traps that cost real money, 2026-08-22

**`target_polycount` does nothing without `should_remesh: true`.** A batch of six
characters was submitted with `target_polycount: 18000` and came back at roughly
TWO MILLION faces each. The parameter is not rejected and no warning is given;
it is simply ignored. The rigging endpoint then refused all six, because its
limit is 320,000 faces.

`~/.meshy/m3d.sh` has always sent `should_remesh=True` — the single muscle
rigged earlier went through it. The batch script was written fresh against the
API and did not, which is the whole difference between a riggable character and
an unriggable one. **Use the wrapper, or copy its body exactly.**

**The recovery is cheap, and the error message points the wrong way.** Meshy's
own rejection says to use `POST /openapi/v2/remesh`; that route returns 404 and
the real one is `v1`. Remesh costs **5 credits** and produces a riggable model
from an existing one, so six recoverable characters cost 30 rather than the 180
that regenerating them would.

Neither of these is discoverable from the outside. Both are recorded because the
next batch will be written by someone who did not watch this one fail.

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
| A 3D **prop** | **Meshy** image-to-3D | **Tested 2026-08-22 and it works.** The baseball bat went from its own 2D asset to a clean textured mesh in 90s for 15 credits, and imports and renders in Godot untouched. |
| A 3D **character** | **Meshy** image-to-3D | **Tested and it works, with one caveat.** A T-posed muscle came back faithful — build, jacket patches, teal trousers, boots. The caveat is the T-pose itself: Nano Banana ignored the instruction on the first attempt and drew arms-down, which is the pose that cannot be rigged. Say "the figure forms the capital letter T" and name the horizontal line through both shoulders. |
| **Rigging** a character | — | **Not available here.** `~/.meshy/m3d.sh` has no rig command; whatever rigged Arvo was not this wrapper. Needs building or doing by hand before any character can animate in 3D. |
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
