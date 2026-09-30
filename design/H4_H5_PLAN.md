# H4 + H5 build plan: corners, and the families' standing

> **2026-09-30, owner answer 27: corners are shelved** ("Let's forget postin people on the corner, that seems to advanced at this point"). H5 is built on its own. Standing moves through choices, doors and fights, and retaliation hits stock, cash or an exposed crew member. The H4 section below is kept as a record, not a to-do list.

Owner, 2026-09-29: The Long Game is greenlit ("good to go in your order"), and the build continues after v4.66. Answer 25: "Fights are central and can escalate easily from bad deals or if you want to play agressive." This is the plan, not a build.

## What exists today

- **The families.** Each has a relationship number: `relationships.mccormick_family` and `relationships.jade_lantern_network`. Choices move it by ±1 or ±2. Nothing reads it except a few requirements (`relationship:X>=1`) and the day-9 beat.
- **Heat.** `pressure` per anchor runs 0–3 (low / watchful / hot / closed). Choices and fights raise it. The police read it inside fights (COMBAT §9.5).
- **Ground.** The families' home anchors are canon (G1): the McCormicks at Siltanen and Linjat (`linjat_yard`), the Jade Lantern front at Hakaniemi. Piritori belongs to nobody.

## H5 first: standing is a ladder you can read

H4 needs it: holding a corner on a family's ground is what moves their standing.

- **The rungs are the GDD's (§16.8), with two above them.** Friendly (≥ 2), Neutral (0 to 1), Wary (−1), Insulted (−2), Retaliating (−3), Vendetta (≤ −4). It is derived from the number that already exists, so no save changes.
- **What each rung does.** One rule each, all visible on the family's card in the ledger.
  - **Friendly:** their doors are offered first, and you get one favour a chapter (a fighter for a fight, or a price).
  - **Neutral:** business only.
  - **Wary:** their doors stop being offered, and quotes at their anchors are one band worse.
  - **Insulted:** a restitution demand arrives, in € with a deadline. Pay it and you are back on Wary.
  - **Retaliating:** after a readable delay (the next night) they hit something you hold: a corner, a pack, or an exposed crew member. It arrives as a triggered road event, like the found-out cut, with a fight on the table and a way to pay instead.
  - **Vendetta:** each chapter, a fight comes to you until something changes.
- **The way down is always priced.** Restitution, returning what you took, trading a name, or protecting one of theirs. Each is a door or event choice in the ordinary grammar.
- **The police are not a family.** They have no rung and react to heat only, as they do now.

## H4: corners

- **A corner is an anchor with one of your crew on it.** You can post someone where you stand, if the anchor is active and has market demand. A posted crew member is off the fight roster while posted. That is the trade-off: reach against fighters, and it is owner question 27.
- **Every night settles every corner.**
  - **Pay:** a base by the anchor's demand, the same demand the market already models. It is lower while the anchor is hot.
  - **Heat:** each corner adds a chance of +1 pressure.
  - **Family ground:** a corner on a family's anchor costs their standing −1 a night, unless you are Friendly with them.
  - **A bad night** (a deterministic roll, higher when hot or when the family is Wary or worse) becomes a door on the next free block. It can also arrive as a triggered road event: *Trouble at the corner*. That event can become a fight, with a way round. This is where answer 25 lives on the map.
- **Corners carry between chapters.** What you built persists (H7 / GDD). A chapter turn row is added.
- **On the map,** each corner is a small mark in the family's colour when it is on their ground, and the ledger lists what each corner made last night.

## Order of work

1. `standing.js` (pure): the ladder, the rung effects as data in `content/families-v1.json`, the family cards in the ledger, doors filtered by standing, and quotes by standing. Gates first.
2. The Insulted, Retaliating and Vendetta events, as triggered road events, with restitution choices.
3. ~~`corners.js`~~ shelved (answer 27).
4. Godot port by agent, then one hub release (v4.67).

## Open until the owner answers

- **26:** what makes Aatami step back. A crew of three is provisional.
- ~~27~~ answered: no corners for now.
