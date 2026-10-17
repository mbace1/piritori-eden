# CAMPAIGN — how the game fits together, and the plan to one game

Status: **active plan**, written 2026-10-17 from the owner's ruling that 3D is
the future and C.19 is the best build we have (`DESIGN_AUTHORITY.md`, top
section; `GAME_DESIGN_DOCUMENT.md`, top section). Read this first. It ties
together what already exists; it does not replace the GDD, `COMBAT.md` or the
Scenario Atlas, and every step below is a small playable iteration, not a
rewrite.

## 1. The game in one paragraph

Kallio, 2003. Aatami arrives at Piritori with €160, 300 mk and a €350 debt.
You read the whole Kallio board, trade, take jobs, meet people and build a
network of crew, information and routes, chapter by chapter, from Piritori
toward Eden. **Fights are central**: every day offers at least one job that
can become a fight, at most two a day, and bad deals escalate easily (owner,
2026-09-29, answers 23–25). Aatami fights the first fights himself; once he can
afford people, his crew fights (COMBAT.md §9.9.1). Those fights, and the places
they happen in, are **3D**: a Kallio courtyard at night, wet cobbles, lit
windows, the crew you brought, a way out.

## 2. What exists today, and where

| Piece | What it is | Where | State |
|---|---|---|---|
| **Act I** | the campaign: Lantern Noir city map, ledger, doors, road events, families, chapters | `web/` (`web/js/v3/`) | v4.69 in source, **v4.68 live** |
| **C.19 Night Shift** | the 3D tactics: crew of 2–3, Move + Act, cover, enemy plans, rescue and extract, aftermath | `web/crew-run/` + `web/fight-module/` | released 2026-09-17, hub cabinet "Night Shift C.19" |
| **The bridge** | campaign crew → Night Shift → a receipt back (who came home, wounded, missing) | `web/crew-run/campaign-adapter.js` (C.17) | works, **opt-in only** (`?campaign=1`) |
| **Godot port** | landscape + controller port of Act I | `godot/` | follows Act I; has `formation_battle.gd`; **no C-track port** |

**Two fight engines exist.** Act I fights on the formation board
(`web/js/v3/battle.js`, `grid.js`; `COMBAT.md`: interleaved initiative, sync
fire). C.19 fights on the C.11 tactical resolver (`web/fight-module/tactics.js`,
`resolver.js`; `design/A_C_TACTICAL_DIRECTION.md`: Move + Act, full intent, two
cover classes). Two implementations of one verb is how this project's lineages
fork. **This plan ends with one.**

## 3. C.19 — what it gets right

Played on the live hub, 2026-10-16, at 412×915 portrait and 915×412 landscape
(emulated Pixel, touch).

1. **A reason to fight that is not "kill everyone".** *Reach → Help → Extract:
   a way out matters more than a cleared arena.* Rescue, carry, retreat and
   leaving people behind are the drama, and they cost something afterwards.
2. **Intent you can read in words.** "R1 → Sanna · 90% · 2 HP / 1 guard",
   "R2 → D4 · moves; no attack planned". Full enemy intent, by default, as
   `A_C_TACTICAL_DIRECTION.md` asks.
3. **The place is the art.** The Porttikongi rain courtyard *is* the Kallio
   block the old 2D brief kept asking for — repeated window bays, granite base,
   one integrated arched gateway — and it reads at phone size. Warm practical
   light, cool fill, wet paving.
4. **People persist.** Names, gear, survived outings, wounds and memories carry;
   the missing become the next rescue. That is the "Mewgenics" half.
5. **Pressure without a timer.** Turns, shots and downs raise pressure; at 5,
   rivals are announced at an entrance a turn before they arrive.
6. **Portrait phone layout is clean.** One command row (Attack / Move / Brace),
   one End round, intents underneath, crew drawer.
7. **It is tested like a product**: reload after every action, checkpoint
   replay, no double settlement, real touch in both orientations.

## 4. C.19 — what is missing

| # | Gap | Evidence |
|---|---|---|
| G1 | **Not part of the campaign.** A lab with its own save; the bridge is opt-in and the scenery picker says "fictional staging, not campaign travel". | `?campaign=1`; scenery note |
| G2 | **Two fight engines.** Act I's fights since 2026-09-29 (fights daily, bad-deal escalation, Aatami first) all run on the formation board, none on C.19. | `VERSIONS.md` v4.65–v4.69 |
| G3 | **Aatami cannot fight alone.** Night Shift requires 2–3 crew; ruling 24 has him fight the first fights solo. | "Choose two or three" |
| G4 | **Landscape is weak.** At 915×412 the board is a small diorama in the middle third; HUD rows eat the height. Godot's whole reason to exist is landscape. | screenshot, 2026-10-16 |
| G5 | **Two staged places.** Porttikongi courtyard and the Bear Path park. Act I has 14 anchors. | scenery picker |
| G6 | **Act I's month never reached it.** Families' standing, heat per anchor, travel-event fights, Toko's shop, Kello's cut — none can start or change a Night Shift outing. | `DESIGN_AUTHORITY.md` answers 13–27 |
| G7 | **No physical-device acceptance since 2026-09-17.** C.17.1 was black on the owner's phone; C.18 fixed rendering in emulation; real Pixel/iPad is still open. | `design/C19_ACCEPTANCE.md` |
| G8 | **No Godot port.** `design/C19_READABILITY.md` writes the port boundary; nothing implements it. | `godot/scenes/` |
| G9 | **Stand-ins only** — by owner ruling (2026-10-02), not a gap to fix early. The stand-ins already have stable individual looks. | ruling |

## 5. The plan — one game, in small playable steps

Order matters: each step ships to the hub and is played before the next.
Web leads; Godot follows each step it can (the 2026-08-25 ruling).

**P0 — Look at it on the real devices (owner, ~5 minutes).**
Play Night Shift C.19 on the Pixel and the iPad. Black canvas, or a working
courtyard? Everything below assumes the three.js path renders on the Pixel; if
it does not, P0 becomes "fix that" (C.18's renderer recovery is the starting
point; the Godot PowerVR black screen is a different engine).

**P1 — One fight engine (decision + freeze).**
The C.11 tactical resolver (`web/fight-module/`) becomes *the* combat engine.
The formation board gets no new features. Write the mapping table, as a short
doc, from Act I's fight request (who, where, stakes, enemies, police/heat,
loot) to a Night Shift outing spec, and from the outing receipt back to
Act I's consequences (cash, loot, wounds, heat, standing). Decide which
`COMBAT.md` rules carry over unchanged (loot, gear condition, death, careers,
shot-caller, third parties) and which are replaced (interleaved initiative →
Move + Act; formation slots → free cells with cover). *Exit:* a reviewed table
and an owner yes; no code.

**P2 — Aatami's first fight runs in 3D, from the campaign.**
Aatami's first fight in Act I (whichever job raises it first) starts a Night Shift outing directly — not via the
opt-in lab — with Aatami alone (closes G3: a one-person variant of the rules,
e.g. Help/Extract objectives that work solo). The result comes back through
the campaign's one consequence boundary. *Exit:* cold start → Begin → the
first fight is the courtyard → back to the map with the right cash/heat.

**P3 — Every Act I fight goes to 3D.**
Jobs, bad deals and travel-event fights launch outings; crew come from the
campaign roster (the C.17 bridge becomes the default path, not `?campaign=1`).
Objectives come from the job: *take the bag and leave*, *get Kello out*,
*hold the corner until the tram*, *rescue*, *lost kit*. Pressure and rival
arrivals read the anchor's heat and the families' standing. *Exit:* a full
Act I chapter played with zero formation-board fights.

**P4 — Places.**
Map Act I's 14 anchors to a small set of reusable 3D kits, each lit from its
2D background's mood (GDD 2026-09-12 ruling): courtyard (exists), park
(exists), street/tram stop for Piritori/Kurvi, a shop interior for Tokon Ramen,
a harbour edge for Sörnäinen. A meeting that goes bad becomes a fight in the
same scene, with the face cut-ins (`scene-speaker`). *Exit:* Piritori's own
street is a 3D place.

**P5 — Landscape and controller.**
Fix G4 in the web build (board fills the frame; HUD to the sides), then the
Godot port takes the C engine's presentation (closes G8). *Exit:* the same
fight is good on a TV with a pad.

**P6 — Retire.**
Remove the formation board from both builds; merge the hub's "Night Shift"
cabinet into "Piritori → Eden".

## 6. What does not change

- The city map stays 2D (a relief plan, Art Bible §6.1). 3D is the fights and
  the places they happen in. All non-battle graphics are being overhauled
  (owner, 2026-10-17): [design/ART_DIRECTION_NON_BATTLE.md](design/ART_DIRECTION_NON_BATTLE.md).
- Stand-ins only, in every build, until a model is proven (2026-10-02).
- Web first, Godot follows; content is authored once and flows.
- The campaign's one consequence boundary owns money, time, heat and standing;
  a fight never invents them.

## 7. Questions for the owner

1. **P1:** freeze the formation board now? (Recommended — every week it grows
   is work P6 throws away.)
2. **Map:** confirm the city map stays 2D (overhauled, not 3D) and only fights
   and places go 3D.
3. **Hub:** keep "Night Shift C.19" as its own cabinet until P3, then merge?
