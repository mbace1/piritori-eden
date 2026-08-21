# PIRITORI → EDEN — phasing

Status: **ACTIVE**
Owner direction: 2026-08-21
Supersedes older roadmap material where they disagree. It does **not**
supersede `DESIGN_AUTHORITY.md` or the canon stack beneath it — this file says
what happens next and in what order, not what the game is.

---

## 0. Owner direction, 2026-08-21

> *"currently it's a skeleton where nothing really works. it should be a robust
> seedy underworld story with animations and multiple interesting mini games"*

And the standing quality bar, from the same session:

> *"ask me numbered questions when needed and show me art with intention to
> approve if needed"*

### 0.1 The honest diagnosis

The Godot build passes 215 checks and plays the seven-day slice end to end. It
is still a skeleton, and the gates cannot see why, because **a gate that
certifies *works* cannot see *plays*.**

`GAME_DESIGN_DOCUMENT.md` §11.2 names eight mission families and gives each one
a distinct core decision. Here is what each of them actually resolves as today:

| Family | Canon's core decision | Today |
|---|---|---|
| Delivery / collection | route, timing, capacity, trust | a dialogue choice |
| Information | pay, investigate, trade a secret | a dialogue choice |
| Recruitment | price, role, loyalty | a dialogue choice |
| Negotiation | offer, threat, favour | a dialogue choice → **formation battle** |
| Protection | which target gets limited crew | a dialogue choice |
| Recovery | retrieve under time pressure | a dialogue choice |
| Sabotage | invest in an uncertain outcome | a dialogue choice |
| Family / personal | time and truth rather than profit | a dialogue choice |

**One mechanic exists.** Seven of the eight families are a menu of text wearing
a location-scene costume, and the eighth is only interactive when it breaks
down. That is the whole of "nothing really works": there is no *play* in seven
eighths of the game, so no amount of authored content makes it feel like one.

### 0.2 What this does NOT license

`GAME_DESIGN_DOCUMENT.md` §24 carries a kill-or-redesign condition that points
the opposite way from "add more modes":

> *"If the five interaction modes feel fragmented, reduce their number or create
> stronger state continuity before adding content."*

That is not in tension with the owner direction, and reading it as permission to
bolt five loose mini-games onto the side would be a misreading of both. The
resolution:

**A mini-game here is a mission family's core decision made playable. It is not
a new mode, it does not get its own tab, and it shares the campaign state,
the cast and the stakes with everything around it.**

A mechanic that could be lifted out and shipped standalone has failed this test,
however fun it is.

---

## 1. Tool reality — plan against this, not against hope

| Need | Tool | Reality |
|---|---|---|
| 2D concepts, poses, UI, scene art | **Nano Banana** | Strong, free. Style-anchor with `--images` against the cast's own approved art, not against a generic reference. |
| Character pose sets | **Nano Banana** + `art-src/gen-pose-set.sh` | Nine poses per role is the established set. Whole-figure composites, **not** modular parts — the modular T-pose set cannot do hands or contact poses. |
| A 3D presenter (Arvo only) | **Meshy** image-to-3D + rig | Done, registered, `ART_BIBLE.md` §13.2 permits exactly one. **Do not extend 3D to anything else** without an owner ruling. |
| Frame-by-frame character animation | **Code, over the pose set** | Godot tweens and `_draw()` over existing poses. Cut-paper does not want interpolated skeletal motion; it wants held frames and hard cuts. |
| Squash, sway, torn-edge wobble, paper lift | **Code** | Always. `ART_BIBLE.md`'s "visibly wobble, skip, overshoot" is a motion instruction as much as a line one. |

**Meshy credits are real money.** Check the balance before any batch, and
confirm with the owner before spending a large share.

### 1.1 The art rule that has already cost a session

**Anything headed for rigging is concepted in a T-pose with a volumetric body.**
Auto-rigging fails on a stick figure. This applies to Arvo and to nothing else
until the 3D exception is widened.

---

## 2. Phases

### Phase A — one family becomes playable, end to end *(now)*

Pick **one** mission family and take it from design through art through a real
loop the player can lose. Not a prototype in a lab scene: reachable from the
map, resolving into campaign state, drawn in the game's own material.

Phase A is done when:

1. the family's core decision is made by **playing**, not by picking a line;
2. it can be **failed**, and failing moves the campaign forward rather than
   asking for a reload (`GDD` §11.4);
3. its outcome is visible somewhere that is not a number — a changed service, a
   wounded person, a closed front (`GDD` §11.3 beat 6, "Memory");
4. it reads in **portrait and landscape** (`UX_SPEC.md`);
5. it works in **en / fi / ja**;
6. the six gates stay green and it has gained gates of its own;
7. **the owner has played it and said what is wrong with it.**

Item 7 is the real gate. The other six are what make it worth the owner's time.

**The family is the owner's pick, not an engineering convenience.** Asked which
one mattered most to the story, the answer was to be chosen deliberately —
that question is open and Phase A does not start without it.

### Phase B — the families that share its bones

Two or three more families, chosen because they **reuse** Phase A's mechanic
rather than inventing beside it. Recovery is Delivery with a clock and a
casualty. Protection is Delivery where the cargo is a person and the route is
someone else's. If Phase A is built well, these are content.

Phase B is done when a run touches at least four families and no two of them
feel like the same button.

### Phase C — the city moves, and the cast has faces

- **Animation pass.** The pose sets exist; they are being swapped, not played.
  Held frames, hard cuts, weight, torn-edge sway. `ART_BIBLE.md` already
  licenses this and it is currently unused.
- **The map as a character** (`NARRATIVE.md`): routes that repeat, meanings that
  change, ordinary traffic that a player learns to read.
- **Scene memory** (`GDD` §9.5): a place that remembers what happened in it.

### Phase D — Era I feature-complete

Exactly the seven criteria in `DESIGN_LOCKS.md` §12.1. Not a new list — that one.
Era II opens only when they are all met, and Aaro's death never becomes a
mission.

---

## 3. Standing rules

1. **Canon outranks code.** `DESIGN_AUTHORITY.md` resolves contradictions. When
   two sources at the same level disagree, stop and record a decision; do not
   average them.
2. **A gate that cannot fail is a finding.** Gates drive the real interface —
   press the button, do not call the model.
3. **`data/` is generated.** Never hand-edit it. `sync-data.mjs` verifies by
   sha256 and refuses on drift.
4. **An art change ends in a picture**, not in a green suite. The suite cannot
   see the thing being changed.
5. **Show art with intent to approve.** Owner direction. A render nobody was
   asked about is a render that ships wrong.
6. **Never silently promote a placeholder to canon** (`DESIGN_LOCKS.md` §13).
7. **People remain people** (`NARRATIVE.md`). Suffering is not scenery. The
   portrayal is bleak without reducing vulnerable people to atmosphere, and a
   mini-game about a person's worst day answers to that before it answers to
   whether it is fun.

---

## 4. Open questions for the owner

Numbered so they can be answered by number.

1. **Which mission family should Phase A build?** Delivery is the engineering
   path of least resistance (the flow simulation and the map already exist).
   The question is which one carries the most story.
2. **What does failure feel like?** `GDD` §11.4 lists what failure costs, but
   not how the player should feel about it. Is a botched job a bruise, a debt,
   or a person you have to look at afterwards?
3. **How long is a mini-game?** Pillar 2.4 says combat is "short, legible and
   costly". Do the other families sit at the same length — a minute, two — or
   is one of them meant to be the long one?
4. **Does the player character act?** `DESIGN_LOCKS.md` §3 fixes Aatami's
   physical role. If a delivery is played, is Aatami carrying it, or is he
   choosing who carries it and watching?
