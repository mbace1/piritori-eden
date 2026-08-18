# Assets needed — and design decisions still open

For whoever is making art, and for the owner. Companion to
`ART_BRIEF_CONCEPT.md` (the look) and `MAP.md` (the board).

---

## 0. Read this first: what "asset" means in this repository

**Nothing here ships an image file.** Every project in this repo draws its
graphics in code — canvas primitives, procedural texture, no sprites, no
tilesets, no PNGs. That is a standing rule in `CLAUDE.md`, not a phase we are
in.

So concept art has a different job than usual. It is **reference that a
programmer implements**, not a file that gets loaded. A drawing is "delivered"
when the code reproduces its composition, palette and read — the drawing itself
never enters the build.

This changes what is worth making. **Detail is nearly free to draw and
expensive to reproduce.** A painting with subtle gradients and 400 colours
tells the implementer almost nothing actionable; a flat 8-colour composition
with hard seams can be turned into code in an afternoon. Please aim at the
second.

**The one real exception** is PWA manifest icons, if this ever goes
offline-first. Those are genuine PNGs — and even they are *generated from the
app's own palette* by a script, the way `kindling/tools/make-icons.mjs` does
it, so a handed-over icon cannot drift from the app.

---

## 1. Reference art needed, in priority order

Specs for all of these: **PNG, sRGB, flat colour, no gradients where a hard
seam will do.** Put a hex-value swatch strip along one edge — the implementer
reads colours off that, not out of the image.

### P1 — unblocks work already in progress

| # | what | size | what it unblocks |
|---|---|---|---|
| 1 | **The night map, whole** | 1200 × 2000 (the board is a tall 2:1) | the Piritori skin. Currently placeholder-grade: flat charcoal, no paper, no grain, no registration drift |
| 2 | **The day map, same geometry** | same | proves the two products read as one city. Toko Move's palette is unvalidated guesswork right now |
| 3 | **One stop, close** | 600 × 600 | how a queue, an overload ring and a glyph sit together — the single most-read thing in the game |
| 4 | **The isometric fight board** | 1200 × 900 | six bodies on two 3×3 grids. Bodies are currently rounded rectangles with a circle for a head |

For 1 and 2, work from `MAP.md` — it has all ten stops with real coordinates.
The geometry must match; **do not re-place the stops for composition.**

### P2 — needed before this looks like a game rather than a diagram

| # | what | size | notes |
|---|---|---|---|
| 5 | **Heat staining a line** | 800 × 800 | clean → noticed → watched → moving in, as four states of the same stretch of street |
| 6 | **The six pin glyphs** | 200 × 200 each | contact, seller, rival, patrol, mission, delivery. Must read at 18px |
| 7 | **Key art / title** | 1600 × 1000 | `PIRITORI → EDEN`, municipal type |

### P3 — only once the loop survives play

| # | what | notes |
|---|---|---|
| 8 | **The arcade marquee** | 128 × 72, and it must be **implementable as ~60 lines of canvas code** — every cabinet on the hub is drawn that way. See `hub/art.js` for a dozen worked examples |
| 9 | **Act two, 2024** | Pasila / Tripla in the same printed language. **Not in canon yet** — see design request 6 |

---

## 2. What is NOT needed — please do not spend time on these

- **Character portraits, sprites or animations.** People are tiny marks; the
  brief is explicit.
- **Tilesets, UI kits, button art, panel frames.** The interface is CSS on flat
  colour.
- **Audio of any kind.** All audio in this repo is synthesised at runtime; in
  `eeri/` a binary audio file *fails the gate on purpose*.
- **Fonts.** System monospace, and the one licensed brand face is the owner's
  and lives outside the repo.
- **3D, photography, or anything with a perspective camera.**
- **Textures as files** — paper grain is generated procedurally so it can be
  dropped under load.

---

## 3. Design requests — decisions I cannot make alone

Numbered so they can be answered by number. My recommendation is in **bold**
where I have one.

**Fight system** (from `FIGHT_BRIEF.md` §9, still open):

1. **3×3 or 3×4 grid per side?** It is one constant. **Recommend 3×3** — three
   rows already give every weapon a distinct job, and a fourth row mostly adds
   walking.
2. **Where do Aatami's other two fighters come from?** A fixed trio is fielded
   now. **Recommend: contacts with enough trust turn up** — it makes the trust
   system pay out in a second currency, and it means burning people costs you
   bodies later.
3. **Does a death stick across the campaign?** Currently a downed unit is out
   for that fight only. **Recommend: not for now** — permanent loss plus a
   seven-day campaign is very punishing, and it interacts with 2.

**Economy** (raised by the Codex review, and both are real design calls):

4. **Should a consignment occupy its own quantity in carrier capacity?** Today
   `SEND 5` takes one seat, so the hidden layer moves five times what the UI
   claims. Honouring it makes the shared-capacity thesis true, and makes the
   game materially harder. **Recommend: honour it and drop SEND to 3.**
5. **Should edges enforce concurrent-carrier capacity?** Today unlimited
   carriers can share an edge, so there is no congestion between your lines and
   the city's. This is the brief's central claim and the largest gap.
   **Recommend: yes, but as its own slice** — it needs a queueing model, not a
   one-line fix.

**Narrative:**

6. **Is the 2024 second act canon?** Kalle and Aaro, Pasila, Tripla and
   Alpha-PVP came from conversation and appear in `ART_BRIEF_CONCEPT.md`, but
   are in **no** canon document. Until they are, they should not drive art
   spend. **Recommend: write them into `BRIEF.md`, or explicitly park them.**
7. **Campaign length.** `BRIEF.md` says 30 days and also lists it as open; the
   build runs 7. **Recommend: 7 for the slice, decide 30 when the loop is
   proven.**
8. **How explicit do substance names get?** Canon defers this until the loop
   works; the street register (`piri`, `peukku`) exists in conversation only.
   Product classes in code are abstract and should stay that way regardless.

**Presentation:**

9. **Does Piritori go on the arcade hub, and when?** That needs a catalogue
   entry, a code-drawn marquee (asset 8) and a `hub/versions.json` bump.
   `BRIEF.md` puts hub deployment outside the first slice, so **recommend: not
   yet** — but it decides whether asset 8 is worth commissioning now.
10. **Should either product be offline-first / installable?** That is the only
    thing that would create real PNG deliverables. **Recommend: not for the
    slice.**

---

## 4. How to hand art over

Drop files anywhere under `piritori/references/` with a short note saying which
numbered item each one answers. **A palette strip in the image is worth more
than a written spec** — the implementer will read hex values straight off it.

If a drawing and `MAP.md` disagree about where a stop is, `flow-core/city.js`
wins: those coordinates are projected from real WGS84 positions and the map is
meant to survive a local checking it.
