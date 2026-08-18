# Piritori → Eden — the Nano Banana pipeline

`ART_BIBLE.md` catalogues what has arrived and what it decided. `ASSETS.md`
says what is wanted and why. **This says what to type.**

Every prompt in §6 is self-contained once you paste the three blocks in §3 and
the palette in §4 ahead of it, because a prompt travels without this file
attached.

---

## 0. How this differs from Kindling's pipeline

Same tool, same magenta rule, **opposite target**. Kindling is 16-bit pixel art
on a 192×128 grid, so its pipeline ends by snapping everything to a small
palette and proving the result is 1:1 pixel art. Piritori is **ink-line
illustration** — flat fills inside a hard black line, printed. Quantising that
to fourteen flats destroys it, and it is not supposed to survive a pixel-art
round trip.

So `kindling/tools/cut.mjs` now takes three flags, and Piritori uses all three:

```
fit   --palette <file>    snap to another project's palette
fit   --no-quantise       resize + binary alpha only          ← scenes, characters
check --illustration      skip the pixel-art round trip
check --colours N         raise the colour ceiling
```

Kindling's own commands are unchanged and still mean what they did.

---

## 1. What the model can and cannot do

Carried over from `kindling/art-src/NANO_BANANA_PIPELINE.md` and
`eeri/ART_PIPELINE.md`, where each of these cost a day:

- **`gemini-2.5-flash-image` is the workhorse.** Start on base; escalate to Pro
  only for a composition that keeps failing.
- **It cannot output transparency.** Ask and you get white or a checkerboard
  painted in. §2.
- **It cannot count.** "A 4×3 grid of 128px cells" returns a picture *of* a grid
  with roughly the right number of roughly-sized things in it. **Generate one
  subject per image and assemble the sheet yourself.** Every cell size in §5 is
  what you `fit` a single image to, not a grid to ask for.
- **It cannot hold a pixel grid** — irrelevant here, but it means never accept
  raw output as an asset.
- **`--ref` is how a character survives a re-pose.** Attach the approved
  concept and say what to copy and what to disown: *"copy only the body plan,
  proportions and clothing; do not copy the pose, the background or the
  framing."*
- **It drifts on palette between runs.** Generate the anchor image of a group
  first (the night map, the first arena, the base body), then feed it back as a
  reference for everything else in that group.

---

## 2. THE MAGENTA RULE

Flat `#FF00FF` background, every time, on everything **except full-bleed
backgrounds** (§5 marks which). Magenta appears nowhere in this game's palette
except the product accent `#F0027F` — which is close enough to matter, so the
key is run before anything is tinted, and no cut asset may contain `#F0027F`.
Put the accent in code, not in the art.

Say it verbatim:

> The background is a completely flat, solid, uniform magenta (#FF00FF) with
> nothing on it — no gradient, no vignette, no shadow, no texture, no border and
> no frame. The subject does not touch the edges of the image.

`cut.mjs key` does the rest: hue-ratio key, despill, and an outward bleed so the
downscale cannot sample magenta out of pixels it is about to make invisible.

---

## 3. The three blocks — paste on EVERY prompt

**Block A — the house style** (the 2026-08-18 hybrid: ink-line illustration
carried on risograph print language):

```
Style: a hybrid. Hard black ink-line illustration with flat, slightly muted
fills — Darkest Dungeon rather than a comic — printed as a risograph: visible
paper grain over everything, screen-print colour separations, slight
registration drift between layers. Limited palette, hard seams between colours,
flat cut-paper shapes where the silhouette does the work rather than the
shading. No gradients, no glow, no lens effects, no photographic rendering.
Night, cold, used, deadpan. Helsinki in 2003, not a crime film about it.
```

**Block B — the magenta rule** (skip only for full-bleed backgrounds):

```
The background is a completely flat, solid, uniform magenta (#FF00FF) with
nothing on it — no gradient, no vignette, no shadow, no texture, no border and
no frame. The subject does not touch the edges of the image.
```

**Block C — kill the presentation board:**

```
No text, no letters, no numbers, no labels, no captions, no watermark, no logo,
no UI chrome, no panel, no card, no drop shadow. Do not present this as a sheet,
a poster, a turnaround or a reference board. Just the subject.
```

Block C matters most. **Every sheet delivered to this repo so far has been a
board**, and a board cannot be cut because its background is not separable from
its art. The one deliberate exception is the swatch strip, asked for explicitly
in §4 and cropped off before `key`.

---

## 4. The palette block

Paste with every prompt. Ask for the swatch strip **every time** — models drop
it unless told, and it is the single most useful thing in the output.

```
NIGHT palette (Piritori):
paper #0f1216 · ink #e2dccd · dim #8c8778 · marks #b9b2a0 · unbuilt #232a33
water #1b2c3a · warning orange #ff7a1a (pressure only) · slow amber #c8a24a
lines: #e2dccd #57c8e8 #7fc98a #c98ad8
city services: metro #b06a2a · tram #5d6b5e · car #46525e
money gold #e8c24a
Include a small swatch strip of every colour used along the bottom edge,
outside the subject.
```

**Two colours are reserved and must not appear in generated art.** Warning
orange `#ff7a1a` means immediate pressure and nothing else; product magenta
`#F0027F` is the player and the product, and is also the key colour. Both are
applied in code.

---

## 5. Asset specs

**Generate at 1024×1024** (or 1024×576 for wide) and `fit` down. Larger than the
target, always — a downscale is free, an upscale is a blur.

**P1 — unblocks the build that exists today.**

| # | asset | cells | native size | magenta? | fit to | quantise | what it unblocks |
|---|---|---|---|---|---|---|---|
| 1 | **Fight arenas** | 4 | 1024×576 | **no**, full bleed | `1024x576` | no | `fightview.js` draws bare paper behind the grid. Arenas are named in `OPPONENTS`: `harbour` · `court` · `park` · one spare |
| 2 | **Cover props** | 5 × 2 states | 1024² each | yes | `128x128` | no | `COVER` in `fight.js`. Whole **and broken**, because a prop that reaches 0 hp says *"comes apart"* and currently vanishes |
| 3 | **Fighter states** | 5 × 2 facings | 1024² each | yes | `128x192` | no | the board draws a rounded rectangle with a circle on it. States: `stand · strike · hit · down · walk-away` |
| 4 | **Weapons** | 11 | 1024² each | yes | `64x64` | no | `WEAPONS`, all eleven, each with the two anchor dots |
| 5 | **Pin glyphs** | 5 + 4 | 512² each | yes | `64x64` | **yes** — `--palette piritori/js/palette.js` | the map's pin layer, which draws letters in circles today |

**P2 — needed before it reads as a game rather than a diagram.**

| # | asset | cells | native | magenta? | fit to | quantise |
|---|---|---|---|---|---|---|
| 6 | **Night map, whole board** | 1 | 1200×2000 | no, full bleed | `1200x2000` | no |
| 7 | **Day map** (Toko Move) | 1 | 1200×2000 | no, full bleed | `1200x2000` | no |
| 8 | **Heat states of one line** | 4 | 512² each | yes | `256x256` | yes |

**P3 — once the loop survives play.**

| # | asset | cells | native | notes |
|---|---|---|---|---|
| 9 | **Arcade marquee** | 1 | 512×288 | fit `128x72`, **quantised**. It must also be reproducible as ~60 lines of canvas — see `hub/art.js` |
| 10 | **Key art** | 1 | 1600×1000 | `PIRITORI → EDEN`, municipal type, EDEN cropped by the sheet edge |

### 5.1 The board's own geometry — spec 1, 2 and 3 against this

`fightview.js` places everything on an isometric grid, **3 columns × 3 rows a
side**, two sides facing across a dashed line. Half-tile is 34 × 17 px at 1.6×,
so a cell is roughly **109 × 54 px** on screen at 1× DPR.

- A **body** occupies ~15 px wide × 45 px tall on screen, standing on the cell
  centre with a flat elliptical shadow under it. At `128x192` a fitted figure is
  drawn ~3× that and scaled down, which is the margin needed for the ink line to
  survive.
- A **prop** is drawn ~30 px wide × 15–20 px tall — deliberately **low**, so it
  never hides the body behind it. That is a hard constraint on spec 2: cover is
  waist height or lower, seen from the same 3/4 angle, and anything tall enough
  to occlude a standing figure is wrong however good it looks.
- **Hard cover is drawn heavier than soft**, because that difference decides
  whether a bullet gets through. Concrete and stone read as mass; a bin and a
  crate read as hollow.

### 5.2 The two anchor contracts

The delivered art already half-wrote these, and they only work as numbers.

**Weapons — two dots.** The item sheet marks a **cyan dot at the grip** and an
**orange dot at the fore-grip**. A held weapon is placed by matching grip to the
primary hand and fore-grip to the second, which is what lets one pose hold a
bat, a crowbar and a rifle. Record both as pixel coordinates in the fitted
64×64 cell, in `SHEETS.md`, per weapon.

**Figures — joint markers.** The action poses carry dark circles at shoulders,
elbows and knees. Read next to *"some characters will be tested in Meshy 3d"*,
those are rig points. **Recommend they are a registration layer that gets keyed
out**, like the magenta background — generate the pose twice, once with markers
for measuring and once clean for shipping, or accept a marked master and record
the coordinates before painting them out. Either way the numbers go in
`SHEETS.md` and the shipped PNG has no dots on it.

Until §5.2 has numbers in it, nothing composites, and specs 3 and 4 are
concept art rather than assets. It is the highest-value thing in this document.

---

## 6. The prompts

Paste **Block A + Block B + Block C + the palette block**, then one body below.

### 6.1 Fight arena — the harbour (McCormicks)

Full bleed: **omit Block B.**

```
A wide isometric-friendly backdrop for a night street confrontation: the
wholesale end of a Helsinki harbour. Warehouses in flat silhouette, two gantry
cranes, the side of a moored ship, tram rails set into wet cobbles catching one
sodium light. The horizon sits in the UPPER THIRD of the frame. The entire
lower two thirds is empty open ground — flat wet setts, nothing standing on it,
nothing in the middle of the frame. Composition is a stage seen slightly from
above: the viewer is looking down into an empty yard.

Cold, quiet, industrial. One warm light source only. No people, no vehicles in
the foreground, no clutter below the horizon line.

16:9 landscape, 1024 x 576.
```

### 6.2 Fight arena — the courtyard (Igor's men)

```
Same brief as the harbour, different ground: a back courtyard off a Helsinki
tenement street. Four storeys of brick on three sides, one lit doorway under an
arch, a fire escape, wet gravel. The buildings occupy the UPPER THIRD only.
The lower two thirds is empty gravel with nothing standing on it.

Enclosed, watched, nowhere to run. Two lit windows, everything else dark.

16:9 landscape, 1024 x 576.
```

### 6.3 Fight arena — the park (Karhupuisto)

```
Same brief again: a small city park square at night. Iron railings, bare autumn
trees, a bandstand at the left edge, and a low stone plinth carrying a BEAR
STATUE at the right edge — both cropped by the frame, both in the UPPER THIRD.
The lower two thirds is empty frosted grass and path, nothing standing on it.

Municipal, cold, ordinary. One park lamp.

16:9 landscape, 1024 x 576.
```

### 6.4 Fight arena — the tenement yard (spare)

```
Same brief: a residential inner courtyard. A carpet-beating rack, a bicycle
shed, rubbish bins against a wall, lit kitchen windows above. Buildings in the
UPPER THIRD, lower two thirds bare gravel with nothing on it.

Domestic, close, embarrassing to fight in.

16:9 landscape, 1024 x 576.
```

### 6.5 Cover props — one prompt, run ten times

Replace the bracketed line. **One subject per image.**

```
A single piece of street cover, seen from a low three-quarter isometric angle,
lit from one side, standing on nothing.

[ONE OF:
  a concrete road barrier, scuffed, with reflective tape worn off
  a rough granite boulder, the kind set at a park edge to stop cars
  a green municipal wheelie bin, lid closed
  a stacked wooden pallet with one crate on it
  a steel bicycle rack, empty
  — and the BROKEN state of each: the barrier cracked in half with rebar
    showing · the boulder split · the bin on its side, lid open, empty · the
    pallet burst and the crate staved in · the rack bent flat]

It is WIDE AND LOW — wider than it is tall, waist height at most. It must never
be tall enough to hide a standing person behind it. Heavy, solid, worth taking
cover behind. Hard black outline, flat fills, one clear silhouette.

Square, 1024 x 1024.
```

### 6.6 Fighter states — the paper-doll poses

Run per character × per state. Attach the approved base body as `--ref`.

```
One standing figure, full body, seen from a low three-quarter angle, feet
together on nothing, drawn as a FLAT SHAPE inside a hard black outline — the
silhouette carries the whole read, there is no rendering inside it.

[ONE OF:
  STAND — weight on the back foot, hands loose, waiting, not yet committed
  STRIKE — mid-swing, weight fully forward, the arm extended past the body
  HIT — recoiling, head back, one arm up, still on both feet
  DOWN — on the ground, one arm under, not moving, small in the frame
  WALK-AWAY — turned away from the viewer, walking out of frame, unhurt]

[FACING: three-quarter towards the viewer  |  three-quarter away from the
viewer — generate both, they are the two sides of the board]

The hands are EMPTY and open — a weapon is composited in later and must not be
drawn. Clothing is 2003 Helsinki: bomber jacket, tracksuit, work coat, jeans,
trainers or boots. No face detail beyond the barest suggestion.

Copy only the body plan, proportions and clothing from the reference. Do not
copy its pose, background or framing.

Portrait, 1024 x 1536.
```

### 6.7 Weapons

```
A single object lying flat, seen straight on from the side, isolated, drawn as
a flat shape inside a hard black outline. Worn, ordinary, second-hand — nothing
tactical, nothing shiny, nothing heroic.

[ONE OF: bare fists (a pair of hands, no weapon) · a beer bottle · a wooden
baseball bat · a length of steel pipe · a starting pistol with a blocked barrel
· a docker's cargo hook · a crowbar · a length of splintered plank · a small
revolver · a sawn-off single-barrel shotgun · a bolt-action hunting rifle]

Mark the grip with a small solid CYAN dot where the primary hand closes, and
the fore-grip with a small solid ORANGE dot where a second hand would go. Both
dots sit ON the object. Nothing else is added.

Square, 1024 x 1024.
```

The three firearms are canon as of 2026-08-18 (`FIGHT_BRIEF.md` §2.1). The
starting pistol is the **blank gun** and is the most important object in the
game — draw it plausibly, because its whole job is that nobody in the fiction
can tell.

### 6.8 Pin glyphs

```
A sheet of nine map-marker glyphs, each in its own square cell with generous
margin, arranged 3 x 3 on dark charcoal paper.

1. a person's silhouette bust — a contact
2. a euro sign — the street sellers
3. the letter R — a rival crew
4. an exclamation mark — a patrol
5. a five-pointed star — a mission
6. a hollow circle — an ordinary stop
7. a hollow diamond — an interchange
8. a hollow square — a shop
9. a hollow triangle — a service

Each glyph is a flat single-colour shape inside a thin circular ink outline,
drawn to read clearly when shrunk to 18 pixels. Bold, simple, no detail that
disappears at that size, high contrast against the paper.

1200 x 1200.
```

This one asks for a real grid because the glyphs must agree about line weight,
and it is the only sheet simple enough that the model can hold nine of anything.
Expect to cut it by hand anyway.

### 6.9 The maps

`ART_PROMPTS.md` §3.1 and §3.2 hold these, with all ten stops named and placed.
**Do not re-place the stops for composition** — owner ruling, 2026-08-18: *only
map style is canon, the places need to follow actual map.* The coordinates are
projected from real WGS84 positions in `flow-core/city.js` and a local is meant
to be able to check them.

---

## 7. The run

```bash
cd piritori/art-src

# 1. magenta -> real alpha (skip for full-bleed backgrounds)
node ../../kindling/tools/cut.mjs key raw/prop-barrier-whole.png work/prop-barrier-whole.png

# 2. down to the target size. Illustration keeps its colours.
node ../../kindling/tools/cut.mjs fit \
  work/prop-barrier-whole.png approved/props/barrier-whole.png 128x128 --no-quantise

#    …except pins and the marquee, which live in the UI and must sit in its palette
node ../../kindling/tools/cut.mjs fit \
  work/pins.png approved/pins.png 192x192 --palette ../js/palette.js

# 3. only if the generator really gave you a grid (it usually will not)
node ../../kindling/tools/cut.mjs slice approved/pins.png approved/pins 64 \
  contact,dealers,rival,patrol,mission,stop,transfer,shop,service

# 4. the gate — before committing anything
node ../../kindling/tools/cut.mjs check approved/props --illustration --colours 512
node ../../kindling/tools/cut.mjs check approved/pins --cell 64
```

Note the last two lines differ on purpose: **props are illustration, pins are
UI**. A pin that needs 512 colours is not a pin.

---

## 8. Where files go, and what gets committed

```
piritori/art-src/
  raw/        generated originals              (gitignored — they are large and regenerable)
  work/       keyed intermediates              (gitignored)
  approved/   committed, cut, checked, in use
    arenas/   harbour.png court.png park.png yard.png
    props/    barrier-whole.png barrier-broken.png … (10)
    cast/     <name>-<state>-<near|far>.png
    weapons/  fists.png bottle.png … (11)
    pins/     contact.png … (9)
  SHEETS.md   one line per asset — see below
```

`SHEETS.md` is the archive that survives a lost zip, which is a thing that has
already happened once in this repo (`kindling/art-src/SHEETS.md` exists for
exactly that reason). One line per approved asset:

```
props/barrier-whole.png  128x128  hard cover, 14hp  ·  gen 2026-08-19 flash  ·  §6.5
weapons/rifle.png         64x64   grip 22,41  fore 39,36  ·  gen 2026-08-19 flash  ·  §6.7
```

The anchor coordinates in that second line are the whole point of §5.2. An
asset without them is not finished.

---

## 9. Done means

1. `cut.mjs check` passes with the right flags for that asset class.
2. Alpha is **binary** — a half-transparent pixel is a smudge, not an edge.
3. No `#F0027F` and no `#ff7a1a` anywhere in the pixels. Both are applied in
   code and both mean something.
4. The fitted size matches §5 exactly.
5. Anchors recorded in `SHEETS.md` for anything in `weapons/` or `cast/`.
6. **The code still runs with the file missing.** Nothing in this game may
   depend on a PNG loading. Every asset replaces a code-drawn element that
   stays in place as the fallback — which is also what keeps the smoke gates
   able to run without any art in the tree at all.

Point 6 is not a nicety. This repo's standing rule is that everything is drawn
in code; shipping image assets here is a deliberate exception (`ART_BIBLE.md`
§5), and it stays an exception rather than a dependency.
