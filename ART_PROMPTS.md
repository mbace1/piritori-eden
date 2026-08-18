# Copy-paste art prompts

Self-contained prompt blocks. Each one repeats every constraint inline, because
a pasted prompt arrives without this document attached.

**Current art in the project: none.** Everything on screen is code-drawn
placeholder.

**Two uses, and they want different things.** Read §0 before generating.

---

## 0. Reference or shipped?

This repo ships **no image files** — everything is drawn in code. So by default
these are **reference an implementer reads**, and that changes what makes a good
image:

- **Flat colour, hard seams, few colours.** A gradient costs nothing to
  generate and hours to reproduce in canvas. An 8-colour composition with hard
  edges becomes code in an afternoon.
- **A visible palette strip** along one edge. The implementer picks hex values
  off it rather than guessing.
- **Composition over rendering.** Where things sit matters; how they are lit
  does not.

If you decide to **ship** generated sheets instead, that is a real change to a
standing repo rule and needs saying out loud — the sizes below are already
power-of-two friendly so either path works.

---

## 1. The house preamble — prepend to every prompt below

```
Style: risograph / photocopied civic map. Flat screen-print colour separations,
visible paper grain, slight registration drift between colour layers, municipal
sans-serif labels. No gradients, no 3D, no glow, no photographic detail, no
lens effects. Everything reads as printed ink on paper. Limited palette, hard
seams between colours. Include a small swatch strip of every colour used along
the bottom edge.

Do NOT include: coloured geometric station symbols of the Mini Metro kind,
passenger-figure icons, map pins of the Google kind, coloured houses, cyberpunk
neon, crime-movie imagery, cash, weapons, drug paraphernalia, people's faces,
photographic realism.
```

## 2. Palettes — paste with the relevant prompt

```
NIGHT palette (Piritori):
paper #0f1216 · ink #e2dccd · dim #8c8778 · marks #b9b2a0 · unbuilt #232a33
water #1b2c3a · warning orange #ff7a1a (pressure only) · slow amber #c8a24a
lines: #e2dccd #57c8e8 #7fc98a #c98ad8
city services: metro #b06a2a · tram #5d6b5e · car #46525e
accents: magenta #F0027F (product/player only) · gold #e8c24a (money)
```

```
DAY palette (Toko Move):
paper #f4f1e8 · ink #20272e · dim #5d6a72 · water #bcd8e6
warning coral #e2683c · amber #e0a53a
lines: #2f9fb8 #5aa860 #e0a53a #c86f9a
city services: metro #e07b2f · tram #86a98c · car #9aa4ac
```

---

## 3. P1 — the four that unblock work

### 3.1 Night map, whole board

```
[HOUSE PREAMBLE] [NIGHT PALETTE]

A transit diagram of the Kallio district of Helsinki, printed on dark charcoal
paper. Portrait, tall — the district is roughly twice as tall as it is wide.

Ten stops, running from bottom-left to top-right. From the bottom: Hakaniemi
low and west beside open water; Kuudes linja above it; Kallion kirkko far west
on high ground; Karhupuisto beside it; Torkkelinmäki east of those; Harju west;
then a tight cluster at the top right where three stops sit close together —
Vaasanaukio, Kurvi and Sörnäinen — with Vaasankatu just north of them.

Each stop is a small disc outlined in heavy ink with a tiny geometric glyph
inside. Fat straight route lines connect them, bending only at 45 or 90
degrees. One long arterial runs the full diagonal from bottom-left to top-right.
Faint dashed lines show corridors nobody has built on yet.

Tiny tick-marks — dozens of them, each a single dash — queue in fans beside the
busier stops and travel along the routes. No human figures, just marks.

Hand annotations and a rubber stamp in one corner. Dark, quiet, used.

Aspect ratio 3:5. 1200 x 2000.
```

### 3.2 Day map, identical geometry

```
[HOUSE PREAMBLE] [DAY PALETTE]

The exact same transit diagram as the night map — same ten stops in the same
positions, same route geometry, same tall portrait proportion — printed instead
on warm off-white day paper with clean dark type.

Mint, sky-blue, coral and amber inks. Tiny dark tick-marks moving along the
routes and queuing at stops. A soft pale stain spreading behind the busiest
line, like ink bleeding into paper.

Optimistic, legible, busy. Same city, opposite weather.

Aspect ratio 3:5. 1200 x 2000.
```

### 3.3 One stop, close

```
[HOUSE PREAMBLE] [NIGHT PALETTE]

Extreme close crop of a single stop on a risograph civic map. A circular node
outlined in heavy ink, a small geometric glyph inside it. A fanned row of about
a dozen tiny tick-marks waiting beside it in an arc. A thin orange warning ring
beginning to draw itself around the outside. Two fat route lines meeting at
the node, one thicker than the other.

Square, 600 x 600.
```

### 3.4 Isometric fight board

```
[HOUSE PREAMBLE] [NIGHT PALETTE]

An isometric view of a small street confrontation, drawn as flat printed
shapes. Two facing grids of three columns by three rows, seen at a low
isometric angle — the near grid tinted cool blue-grey, the far grid tinted
warm red-grey, with a dashed line separating them.

Three simple standing figures on each side, placed on grid cells. Figures are
FLAT SILHOUETTES inside a hard black outline — no faces, no detail, no
shading. Near figures in pale bone colour, far figures in dull brick red. Each
casts a small flat elliptical shadow.

Above each figure, two tiny horizontal bars stacked: a longer one and a shorter
one beneath it.

Empty street around the grids — asphalt texture as flat printed grain. Night.

4:3 landscape, 1200 x 900.
```

---

## 4. P2 — the sheet you asked about

### 4.1 Pin glyph sheet — best candidate for one generated sheet

```
[HOUSE PREAMBLE] [NIGHT PALETTE]

A sheet of six map-marker glyphs arranged in a 3 x 2 grid on dark charcoal
paper, each in its own square cell with generous margin.

1. a person's silhouette bust, magenta outline
2. a euro sign, gold
3. the letter R, bone white
4. an exclamation mark, warning orange
5. a five-pointed star, gold
6. a filled square inside an outlined square, coral

Every glyph is a flat single-colour shape inside a thin circular ink outline,
drawn to read clearly when shrunk to 18 pixels. No detail that disappears when
small. Bold, simple, high contrast against the paper.

1200 x 800.
```

### 4.2 Heat states — four panels of one street

```
[HOUSE PREAMBLE] [NIGHT PALETTE]

Four square panels in a row, each showing the SAME short stretch of a printed
transit route between two stops, at four stages of accumulating attention:

1. clean — thin pale ink line, nothing else
2. noticed — the line slightly thicker, a faint pencil annotation beside it
3. watched — the line heavy, a rubber-stamp mark across it, orange creeping in
4. moving in — the line broken into orange dashes with a heavy X over the middle

Same composition in all four; only the ink treatment changes.

1600 x 400, four 400 x 400 panels.
```

### 4.3 Key art

```
[HOUSE PREAMBLE] [NIGHT PALETTE]

Poster. A risograph-printed night transit diagram of a Helsinki district fills
the sheet, running diagonally from bottom-left to top-right. The words
PIRITORI in heavy municipal sans-serif across the upper area, an arrow, then
EDEN — with EDEN placed at the very edge of the sheet so the paper's border
crops it. One magenta line runs through the whole diagram toward it.

Charcoal, dirty off-white, cold blue, one orange accent. Bleak, dry, deadpan.
No people, no crime imagery, no glow.

1600 x 1000.
```

---

## 5. Notes for the Nano Banana pass

- **Generate the night map first and lock its palette.** Everything else should
  be colour-matched to whatever that produces, rather than each asset inventing
  its own greys.
- **The day map must be a re-skin of the night map, not a fresh composition.**
  If the geometry drifts, the "same city" claim breaks — feed the night map
  back in as a reference image rather than prompting from scratch.
- **Ask for the swatch strip explicitly every time.** It is the single most
  useful thing in the output and models drop it unless told.
- **Sheets beat singles** for the glyphs and the heat states — one image with
  consistent treatment, rather than six that disagree about line weight.
- **Geometry is authoritative and lives in `flow-core/city.js`.** The ten stops
  are projected from real WGS84 coordinates; `MAP.md` lists them with x/y. If a
  generated map disagrees about where a stop is, the code wins — a local is
  meant to be able to check it.
