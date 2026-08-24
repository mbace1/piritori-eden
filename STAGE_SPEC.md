# STAGE SPEC — what a battle location must provide

Status: **ACTIVE**
Owner ruling: 2026-08-21

> *"you should have a grid based game and create fitting arenas to meet the
> needs"*

This document exists because the direction was wrong for a while. The board was
being fitted to each painting: a hand-tuned diamond per stage, measured off the
art, needing the owner to mark a playable area on every new location. That is
backwards. **The grid is the fixed thing. A stage is art produced to sit under
it.**

---

## 1. The arena

One arena, for every location. It lives in `godot/scenes/formation_battle.gd`
as `ARENA` and nothing else may define it:

| | |
|---|---|
| centre | 0.500, 0.620 of the plate |
| half-extent along FORWARD | 0.175 of plate width |
| half-extent along LANE_AXIS | 0.145 of plate width |

The *plate* is the frame minus the command console — the console covers the
bottom **188 of 768** units and nothing composed there is ever seen.

`node godot/tools/stage-template.mjs > stage-template.svg` renders that arena
onto a blank 16:9 frame. It reads the numbers out of the engine rather than
repeating them, so the template cannot drift from the game.

**Draw the location against that template.**

## 1.1 The floor is bigger than the arena

The template draws two diamonds. The solid inner one is the **arena** — where
units stand. The dashed outer one, **1.22x** its size, is where **ground must
still be**.

This is not padding. Units stand ON the outer cells, and a figure is drawn
upward from its feet, so a back-rank unit whose cell sits on the very edge of
the floor has its feet past the ground and its head in a wall. The first stage
built from this template did exactly that.

**Buildings begin beyond the dashed edge, never on it.**

## 2. What the art must do

1. **A flat, unobstructed floor under the blue diamond.** Its edges run on the
   two 2:1 diagonals, up-right and up-left. No bins, crates, steps, kerbs or
   puddled dips inside it.
2. **Clear air above the far edge.** A standing figure is roughly a tile and a
   half tall from its feet, and the back rank stands on the arena's far edge.
   Architecture may begin above that line, not on it.
3. **Nothing composed in the console band.** It is covered in play.
4. **True 2:1 isometric.** Parallel lines stay parallel; there is no vanishing
   point. This is the one instruction image generators reliably get wrong — see
   §4.
5. **The house register.** `ART_BIBLE.md` still governs: cut-cardstock shapes,
   torn fibrous edges, sparse wobbling marker and ink, muted Kallio night.

## 3. What the art may do freely

Everything outside the diamond. The frame is the character of the place:

- a courtyard is walls on three sides;
- a quay is open water on two;
- an alley is close on both flanks with a long sightline out.

Cover objects, hazards and third-party entry points belong at the arena's
**edges**, where they change the fight without standing in it.

## 4. The trap, recorded so nobody pays for it twice

**Image generators do not honour a specified projection.** Asking Nano Banana
for "true 2:1 isometric, rotated 45 degrees, floor as a diamond, no vanishing
point" returned a face-on courtyard twice, in two differently-worded attempts.
The model draws a plausible picture of a place, not a projection.

What works instead:

- **Ask for a top-down texture** and let the engine do the projection — a flat
  sheet has no perspective to get wrong. (Tried and it renders correctly; not
  currently used, because two ground layers at different scales did not cohere
  with a painted stage.)
- **Give it the template as an input image** and ask it to build the scene
  around the marked floor.
- **Accept that a supplied render may need its floor checked** before it is
  registered.
- **The template carries no outlines and no text.** Both get copied. Outlined
  diamonds came back scored into the paving as painted lines on four stages in
  one batch; a captioned console band came back with the caption legible. The
  generator emits soft fills only, and that is why.
- **Strip the template furniture afterwards.** Given the template as an input,
  the model reproduces parts of it — the console band came back baked in, with
  its caption legible. That band is covered in play, but registered art must not
  carry guide marks. `PIRITORI_SHOT_EXTENT=1` draws the arena over the stage so the
  two can be compared directly.

## 4.5 Cover on the board — owner ruling, 2026-08-22

**Decision: a flat marker now, real props later.**

Cover is fully implemented in the resolver and the crew panel now names it —
"behind the bicycle rack" — but `_draw_cover()` lives in the old 2D renderer, so
the 3D board draws nothing. The words are right and the picture is not.

**Now: a low slab or outline on the covered cell**, in the cover colour, no
model. The tactical question is *which cell is protected*, and a marker answers
it completely at zero cost. It is also honest: a game piece that looks like a
game piece, on a board that is already a grid.

**Later: a model per prop type** — bin, rack, plinth, skip. The better picture,
and it makes the arena art and the mechanics agree instead of merely coexisting.
Deliberately second, because it costs Meshy credits per prop and nobody has yet
judged whether cover reads on the board at all.

**Rejected: snapping cover cells to whatever the diorama already has nearby.**
Tempting — the arenas are full of bins and railings — but the alignment would be
approximate, and approximate alignment on a grid game is the same class of bug
as the isometric mismatch in `PHASING.md` §1.056, which cost a day of tuning a
board against art it could never match. A marker that is obviously a marker
never lies about which cell it means.

---

## 5. Checking a stage before registering it

```bash
cd godot
PIRITORI_SHOT_DIR=/tmp PIRITORI_SHOT_EXTENT=1 PIRITORI_SHOT_NOCHROME=1 \
  PIRITORI_SHOT_BG=/path/to/candidate.png \
  godot --path . tools/capture_battle.tscn
```

The white diamond is the arena. Look for:

- every edge of it lying on flat ground;
- no building base crossing it;
- the far rank standing clear of architecture;
- the grid's cell edges parallel to the location's own lines.

If it fails, **fix the art, not the arena.** An arena override exists in
`formation_battle.gd` and is deliberately empty: a stage that plays differently
from every other stage, for reasons the player cannot see, is worse than a
location that had to be redrawn.

### 5.1 Checking all of them at once, without Godot

```bash
node godot/tools/stage-contact.mjs > stage-contact.svg   # keep it at the repo root
```

Every plate in `art/v3/scenes/` on one sheet with the arena drawn on it, read
out of `formation_battle.gd` the same way the template is. It answers a
different question from the capture above — not *is this candidate right* but
*which of the ones we already have are usable tonight* — and it needs no engine,
so it is cheap enough to run before asking for new art.

### 5.2 What the sheet says today — 2026-08-24

**The floor is the only thing being judged here.** The frame is a separate
question and all ten are in register and in the house palette.

| plate | holds the board |
|---|---|
| `courtyard-prototype-v05` | **yes** — ground fills arena and margin, buildings begin past the dashed edge |
| `hakaniemi-square-v01` | **yes** — the emptied square is the cleanest floor of the set |
| `kallio-backyard-v01` | **yes** — every prop that gives the yard its character sits outside |
| `sornainen-quay-v01` | **yes** — the rail tracks cross the arena, but they are flush, which is what flush means |
| `kallio-service-yard-v01` | **one prop out** — the stacked kegs and crates cross into the arena's right quadrant. §2.1 allows nothing inside the diamond; they want moving, not a redraw |
| `karhupuisto-clearing-v01` | **one edge short** — the far-left arena edge runs onto the railing line, and the floor margin overshoots into the console band at the bottom |
| `sornainen-docks-v02` | **check in engine** — owner-supplied and pre-template; the arena's far edge sits near the water line, so the back rank wants the §5 capture before a real fight is staged here |
| `karhupuisto-v01` | **not as a battle floor** — pre-template, and a bench-sized block stands inside the arena. It is an approved *location plate*, which is a different job |
| `toko-slomo-noodles-prototype-v01/v02` | **not stages** — fullscreen narrative screens, correctly registered as such. The arena means nothing over them |

Four usable unchanged, two needing a prop moved rather than a redraw, one to
check in engine, and the two that fail were never battle floors. That is a
healthier position than it looked — and it is the sheet saying so rather than
anybody's memory, which is the whole reason it exists.
