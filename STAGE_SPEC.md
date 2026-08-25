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
| `toko-slomo-noodles-prototype-v01/v02` | **a different kind of screen entirely** — see §6. Drawing an arena on them was a category error on the sheet's part, not a defect in the art |

Four usable unchanged, two needing a prop moved rather than a redraw, one to
check in engine, one that is a location plate rather than a battle floor, and
two that are not battle art at all. That is a healthier position than it looked
— and it is the sheet saying so rather than anybody's memory, which is the whole
reason it exists.

---

## 6. The counter — the other kind of screen

> "the two marked at the bottom are not levels, but Toko Slomo's Noodle Bar,
> where you chat and get info, the scene and Toko are slightly animated. this is
> the goal reference for conversations that don't happen on a fight area, but
> also slightly to how Arvo Linde will work on the daily news bulletins"
> — owner, 2026-08-24

`toko-slomo-noodles-prototype-v02` is **the goal reference**, not a prototype
that missed. It is the picture the whole non-combat conversation class is aiming
at, and it is also the nearest thing on disk to what `UX_SPEC.md` §18 calls the
LOCATION framing.

**It is built the opposite way round from a stage, in every respect that
matters:**

| | a battle stage | the counter |
|---|---|---|
| projection | true 2:1 isometric, floor as a diamond | **frontal** — a counter across the frame, no board and no arena |
| the console band | covered in play, compose nothing there | **the screen's other half** — portrait, transcript and choices live in it |
| the character | a unit on a cell, small | **the subject**, filling the middle of the frame |
| what moves | units, on their turn | the room: steam off the pot, the tram in the window, rain, Toko himself |

So a plate for this class must not be judged against §2 at all. Judged against
its own job it needs: a **frontal composition with the speaker behind something**
(the counter is what makes it a conversation and not an interview); **a deep
window or opening** so the world outside is visible and can move; **the
character's face clear of the bottom band**; and **room in the band** for a
portrait medallion, a name plate, a transcript slab and three or four choices.

**What the art already demonstrates, and should be copied rather than
re-derived:**

- **The choices carry their price and their odds inline** — `BUY INFO · €120`,
  `RISK SABOTAGE · €300 · 45%`. That is `NEGOTIATION.md` §3's visible-requirement
  rule, already drawn, in a scene with no fight in it.
- **The transcript is a torn paper slab**, not a rounded box — the house register
  reaches the UI, not just the scenery.
- **LEAVE is always the last option**, which is `DESIGN_LOCKS.md` §2's grammar.
- **The place dates itself** without a caption: `VAASANKATU · 2003` on the sign,
  a tram in the window, a mechanical till.

**Known, and it is the whole production gap:** the plate is a **single baked
image**. The manifest has said from the start that production must separate
stage, Toko, mask, props, steam and window into passes; nothing in `godot/` yet
references `scene-toko-noodles-prototype-v02`, so the "slightly animated" half of
the reference is the part that does not exist. `presenter_3d.gd` already has the
`LOCATION` framing and Toko already has his own model — the missing pieces are
the layer separation and a speaking clip, not the engine.

**And its relation to the news.** UX_SPEC §18 says the broadcast is the showcase
and what is learned there defines how narrative animation works at map
locations. That still holds, and it now runs both ways: **Arvo inside the
television and Toko behind the counter are the same screen with different
furniture** — a character in a place, animated, saying something, over a band
carrying a portrait, a transcript and what you may do about it. One component,
built once.

## 6.1 How easy is layer separation? — the ramp

**Start from the thing that decides the whole answer: there is no layered
source.** The plate is a lossy 1536×864 VP8 WebP with no alpha channel,
generated whole. So "separation" here never means *extraction* — every pixel
behind a lifted element is simply **not in the file**, and has to be invented or
re-generated. Nobody can cut Toko out and find shelving behind him, because
there is no behind.

That single fact sorts the work into four tiers, and they are wildly different
sizes:

| tier | what it buys | how it is actually done | cost |
|---|---|---|---|
| **0 — add, never separate** | steam, rain, glow, flicker, breath, a warm wash | draw over the plate; nothing is lifted | **hours, no new art, no credits** |
| **1 — mask a bounded region** | the window: weather, reflections, something crossing it | one hand-drawn polygon; what is behind it is *not needed*, because the region **is** the layer | an afternoon per region |
| **2 — regenerate the room empty** | Toko lifted out, live 3D Toko composited into the gap | a Nano Banana pass with the plate as `ref` and nobody behind the counter | 1–3 generate-and-look cycles |
| **3 — true per-element extraction** | every prop independently animated | unavailable — the hidden pixels do not exist | don't |

**Tier 0 is most of what "slightly animated" means, and it is nearly free.**
`art-src/prototypes/counter-motion.html` is that claim built: the shipped plate,
untouched, with steam off the pot, rain in the window, the lantern and the
tram's headlamps breathing, and a slow warm wash — all in code, all toggleable,
so the plate alone stays available as the honest baseline. Open it and judge it;
that is the point of it existing.

**The reason tier 0 works is worth stating, because it also says where it
stops.** Light, weather and particles are *additive* — they contribute photons
and never have to occlude anything cleanly, so they do not care what is
underneath. The moment you want a baked **object** to move — Toko's arm, the
tram crossing the window rather than sitting in it — you need what was behind
it, and no compositing trick invents that. **Tier 0 buys you a room that is
alive. It cannot buy you a room where things happen.**

> **Owner ruling, 2026-08-24: "Toko needs to be a 3D layer for this to work."**
> That settles tier 2 as the required path rather than one option among several,
> and it is recorded in `DESIGN_AUTHORITY.md`. §6.3 is the brief it obliges.

### The routing rule that removes most of the work

The manifest has always listed six passes: *stage, Toko, mask, props, steam,
window*. Read against the tiers, **three of the six dissolve**:

- **steam** is tier 0 — it was never a layer, it is a pass;
- **window** is tier 1 — bounded by real architecture on all four sides, which
  makes it the cheapest region in the picture to own;
- **props** are tier 0 if they only need to catch light, and tier 3 if they need
  to move, so the answer is: light them;
- **Toko and the mask are not a 2D layer at all.**

That last one is the finding. `presenter_3d.gd` already renders a 3D character
into a SubViewport through the posterise shader, it already has
`Framing.LOCATION` sized for exactly this shot, and **Toko already has his own
model**. So the requirement was never "cut Toko out of the painting" — it is
**"the room without Toko"**, which is a *generation prompt*, not an extraction
problem. And that matters practically, because an image model is far better at
drawing a room empty than at removing a man and inventing the shelving he was
standing in front of.

Which leaves **exactly one real cost in the whole job: one regeneration.** The
rest is tier 0 and tier 1.

### What tier 2 risks, so it is entered with eyes open

The plate is the **approved** baseline. A regeneration is a fresh roll and may
not match it — `CONTENT_HANDOVER.md` §5 records both failure modes already:
judging the result by a contents list instead of by the look (trap 1), and
over-correcting off one complaint by deleting the register (trap 2). Two
mitigations, both already in the pipeline: pass the shipped plate as `ref`,
which is the mechanism that exists precisely so a subject survives a re-render;
and keep the empty room as a **new asset id** rather than replacing v02, so the
approved plate is never the thing at risk.

## 6.2 The band is deeper here, and here is the number

The band begins at the **torn cream seam that runs the full width**, y = 559 of
864:

| | battle console | the counter's band |
|---|---|---|
| band begins at | **0.755** of frame height (188 of 768) | **0.647** |
| depth | 24.5% | **35.3%** |
| holds | commands | portrait medallion, name plate, transcript slab, three or four choices |

**The counter's band is about 1.44× deeper than the battle console's**, which is
correct rather than sloppy — it is carrying a conversation, not a command row.
Recorded here so the next plate in this class is drawn to a number instead of to
a memory of this one. Below `0.647`, compose nothing: the torn seam runs to
about `0.665`, flat band paper to the transcript slab at `0.675`, and the
choices sit from roughly `0.85`.

**A trap, because it cost a wrong number that looked rigorous.** The first
attempt found this row by scanning for the darkest, flattest row in the frame —
which returned `0.575` with convincing statistics (mean luminance 4, σ 7) and
was **the shadow under the counter overhang**, two furniture elements above the
seam. Drawing the line on the picture is what caught it. The general shape is
the one `kindling/` already paid for: *a measurement that certifies **a number**
cannot see **a place***. Find the band by looking for the **bright** seam, not
the dark one — the darkest row in a night interior is always some overhang.

---

## 6.3 The brief: THE EMPTY BAR

**One asset. Everything else in §6 is waiting on it.** Under the 2026-08-24
ruling Toko is a 3D layer, so what the painting has to supply is the room he
stands in — and only that.

| | |
|---|---|
| **proposed id** | `scene-toko-noodles-empty-v01` |
| **file** | `art/v3/scenes/toko-slomo-noodles-empty-v01.webp` |
| **size** | 1536 × 864, exactly, to match the plate it replaces |
| **reference** | `toko-slomo-noodles-prototype-v02.webp`, passed as `ref` |
| **background rule** | **full-bleed — the magenta rule does NOT apply.** This is a painting, not a cut-out |
| **replaces** | nothing. v02 stays registered and approved |
| **manifest** | `kind: scene`, `layer: location-stage`, `location: vaasankatu`, `format: webp-opaque`, **`baked_text: false`, `baked_ui: false`**, and its own `portrait_safe_bounds` |

### What is being asked for, in one sentence

**The same bar, from the same camera, at the same moment — with nobody behind
the counter.**

### What must not change

This is the whole difficulty, and it is why the plate goes in as `ref`. The
empty room has to be **the same room**, not a room like it:

- the camera, the framing and the crop — identical, to the pixel where possible;
- `TOKO SLOMO'S NOODLES · VAASANKATU · 2003` on the signboard, unchanged;
- the paper lantern, the noren curtains, the menu strips, the KALLIO poster, the
  bowl shelves, the pot, the till, the radio, the chopstick jars, the stools;
- the window onto Vaasankatu with the tram in it, and the rain;
- the light: the same warm interior against the same cold street;
- **the cut-cardstock register** — torn fibrous edges, sparse crooked marker,
  muted Kallio night. `ART_BIBLE.md` still governs.

### What changes

- **Toko is gone.** No figure behind the counter.
- **What was behind him is now visible** — the tiled splashback, the shelving
  and the bowls he was standing in front of, continued honestly rather than
  smeared. This is the actual work, and it is why regenerating beats erasing.
- **His hands leave with him**, along with the cup and the notes on the counter.
  The counter surface where he was working is bare.

### What must NOT be in it

- **No UI band.** No portrait medallion, no transcript slab, no choice buttons,
  no text of any kind below `0.647`. The band is live Godot UI —
  `GODOT_HANDOFF.md` §5: *text and controls stay live Godot UI; do not bake new
  copy into scene art.* **The shipped plate carries `baked_text: true` and
  `baked_ui: true`**, which is the standing "Toko baked-screen exception" in
  `art-library/APPROVALS.md`, and the runtime currently draws live copy over the
  top of baked copy. The new asset ships `false` for both, the room continues to
  the bottom edge of the frame, and **the exception retires with it** — which is
  a second thing this one regeneration buys.
- No arena, no diamond, no floor markings — this is not a stage (§6).
- No substitute figure, no silhouette, no "ghost" of where he was.
- No caption, watermark, border, mount or presentation board. This is
  `art-src/NANO_BANANA.md` Block C, and it is the trap that has caught every
  delivery to this repo so far.

### How it will be judged

Against the plate, side by side, at full size — not against a contents list.
`CONTENT_HANDOVER.md` §5 trap 1 is exactly this: *"is the mask there, is there a
lantern, is there a tram in the window" is not the same question as "does this
look like the reference"*, and it passed four rooms that did not. The test is:
**put the two images side by side and the only difference a stranger can name is
that the man has gone.**

### Concept art welcome, in one specific place

The empty room is a **match**, not an invention, so it is not where concepts
help. Where they do:

1. **Toko's speaking poses** — he is a 3D layer now and has no talking clips.
   Concepts of him leaning on the counter, drying a bowl mid-sentence, pushing
   something across: **T-pose for anything to be rigged**, the standing rule in
   the pipeline docs.
2. **The next counter in this class.** Kallio has more people who talk without a
   fight starting. A second location built to §6 and §6.2's band geometry from
   the first stroke — rather than fitted to it afterwards — is the thing that
   proves this is a format and not one lucky picture.

## 6.4 What the engine actually showed — 2026-08-24

**All three framings were put on a screen for the first time**, with
`godot/tools/capture_counter.tscn` built for the counter, which had never had a
picture of itself. Four things came back, and none of them were findable by
reading.

**1. The board's INSET was rendering the battle's world.** A `SubViewport`
**shares its parent's `World3D`** unless told otherwise. On the news that is
invisible — nothing else is in the scene — so it survived every capture of the
only screen that used the component. Over the board it was not: the shot-caller
appeared with one of the yard's dead birches behind him, lit by the battle's
lights *on top of* the studio's own, which posterised his white suit into a flat
white blob with two faint eyes in it. **One line** (`own_world_3d = true`) fixes
both symptoms, because they were one cause.

**2. The LOCATION and INSET framings were hand numbers, and hand numbers do not
generalise.** Their own comment called them "starting points to be judged on a
screen". Judged: the INSET cropped the top of the shot-caller's head off. The
reason is that a hand offset is a measurement of *one model* — measured live,
Toko is 1.683 units, the shot-caller 1.730 and Arvo 1.777, a 6% spread that
frames each of them differently through the same camera. Both are now **derived
from the model's own height**. BROADCAST keeps its exact hand numbers, because
that shot is approved and nothing may move it.

**3. A speaker needs a FOREGROUND, and it is not in the manifest's six passes.**
Stage, Toko, mask, props, steam and window are all things *behind* him. With
only those he stands **in front of his own counter** like a cut-out pasted on
the picture — which is precisely the failure the 3D-layer ruling exists to
avoid. The room needs three layers, not two:

| layer | what | tier (§6.1) |
|---|---|---|
| **back** | the empty room | 2 — the regeneration §6.3 asks for |
| **middle** | the speaker | live 3D |
| **front** | the counter, its front and the stools | **1 — a bounded mask, an afternoon** |

The harness draws that front layer from the same plate, clipped between the
counter's own hard edge and the band, and it is what turns the composite from a
sticker into a man standing behind a bar. **§6.3's brief should be read as
asking for both**: the empty room, and the counter cut from it as a foreground
strip.

**4. A speaker must be clipped to above the band.** Unclipped he carries on down
over the transcript and the choices. That is worse than any framing error,
because it makes the interface unreadable rather than merely wrong.

### One thing this does NOT settle, and it is the owner's

**Does a speaker outside the television get the CRT treatment?** `ART_BIBLE.md`
§13.2 grants the 3D exception to "the moving presenter inside the TV" and asks
for limited colour, analogue softness, slight scanlines and CRT bloom on its
output. That is a description of a *broadcast*, and it predates the counter.

The harness reads it as: **posterise yes, scanlines no.** The posterise is the
load-bearing half — limited colour is what lets a rendered figure sit inside
cut-paper art at all — while scanlines on Toko would tell the player they are
watching him on a screen rather than standing at his counter. That is a reading,
not a ruling, and it is flagged in `presenter_3d.gd` where it is applied.

### Then, and only then, the engine work

1. Register the empty room in `art/v3/manifest.json`.
2. Point a counter scene at it and mount `presenter_3d.gd` with
   `speaker_id = "toko"`, `framing = Framing.LOCATION`.
3. **Match the framing to the plate** — the 3D Toko stands where the painted one
   stood, same size, behind the same counter. `_frame_presenter()`'s LOCATION
   numbers are described in their own comment as "starting points to be judged on
   a screen, not measurements", and this is the screen that judges them.
4. Port the tier-0 passes out of `art-src/prototypes/counter-motion.html`. They
   are canvas today and the regions are in source-plate coordinates precisely so
   they can move without being re-derived.
