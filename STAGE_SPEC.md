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
  registered. `PIRITORI_SHOT_EXTENT=1` draws the arena over the stage so the
  two can be compared directly.

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
