> [!WARNING]
> **LEGACY PRODUCTION HISTORY.** Active direction now lives in
> [DESIGN_AUTHORITY.md](DESIGN_AUTHORITY.md), the GDD and
> [art-library/APPROVALS.md](art-library/APPROVALS.md). This file is retained for
> traceability and must not override those sources.

# Piritori → Eden — the art request

One document to hand to whoever makes the art — a person, Codex, or the Nano
Banana pipeline. Everything requested here has a place in the build waiting for
it; nothing is speculative. `art-src/NANO_BANANA.md` holds the generation
prompts and the cut commands; this is the *what and why*, self-contained enough
to work from alone.

---

## 0. There are two ways to fill this request

**A — generate it here, which is now one command.** The repo has a working
graphics pipeline (`assets/README.md`): Nano Banana draws the 2D, Meshy lifts
it to 3D, prompts live in `assets/manifest.mjs` and the bytes land under
`assets/out/`. **Every asset in this document is already written into that
manifest** — fifteen entries, `piritori/*` and `tokomove/day-map`. It has
already produced finished art for Neon Ronin and Toko Trip, so this is not a
proposal.

```bash
node scripts/assets.mjs status                 # what exists, missing, drifted
node scripts/assets.mjs gen --dry              # what a run would do, calls nothing
node scripts/assets.mjs gen --only piritori    # generate them (costs money)
```

**The only thing missing is a key.** Checked 2026-08-18 from this session:
`generativelanguage.googleapis.com` answers — the 403 it returns is *Google's
own* "unregistered caller" reply, not the egress proxy refusing the host — so
the route is open and nothing needs a network-policy change. Set
`GEMINI_API_KEY` (aistudio.google.com/apikey) and fifteen images generate on
the spot. `node scripts/assets.mjs doctor` re-checks key and route separately,
because they fail identically from the outside and need different people to fix.

**B — deliver files by hand.** Everything below still applies; a generated
image and a drawn one land in the same place.

## 0.1 Either way: deliver FILES, or nothing can be used

This has already cost us the first two batches: **art delivered as pictures in
a chat cannot be cut.** The sheets were good, they are catalogued in
`ART_BIBLE.md`, and not one of them exists as a file — so not one pixel of
them is in the game. The pipeline (`kindling/tools/cut.mjs`) keys, resizes,
slices, reads anchor dots and quality-checks automatically, but it eats PNGs.

**How to deliver:**

- PNG, sRGB. Generated originals at full resolution — never screenshots,
  never re-compressed.
- Drop them in **`piritori/art-src/raw/`** on any branch, or hand over a zip.
  Name them after the asset they answer (`arena-harbour.png`, `weapon-crowbar.png`).
- Anything cuttable sits on **flat `#FF00FF` magenta**, subject clear of the
  edges. Full-bleed backgrounds (arenas, the maps) skip the magenta.
- **No presentation boards.** No labels, captions, frames, grids of variants,
  turnaround sheets. One subject per image — the repo assembles sheets itself.
- A **swatch strip** of every colour used along the bottom edge, outside the
  subject (cropped off before cutting; read, not decoration).

### 0.2 Re-delivery of the two existing batches

Everything already made is wanted **as files**, unchanged: the four fight
backgrounds, the street props, the base bodies / body types / trousers, the
action poses (with their joint markers — they are read mechanically and then
erased), the weapon items (with their cyan/orange grip dots), the dogs, the
trees. `art-src/SHEETS.md` lists all of them by letter.

**Checked, so it can be said plainly: none of that art exists anywhere in the
repository.** Every branch and every open pull request was searched for image
files on 2026-08-18. The only Piritori-shaped image in any of them is
`piritori/references/toko-move-2021-concept.jpg`, which is the owner's own 2021
concept and was already on `main`. PR #269 carries art, but all of it is Eeri's.
The sheets are real, they were good, and they are still only pictures in a chat
window.

---

## 1. THE MAP — the flagship request

Two deliverables, **one geometry**: the night map (Piritori) and the day map
(Toko Move). Same streets, same lines, same stops, opposite weather — the
whole design says the two products are one city, so the two images must be
provably the same drawing re-inked. Generate night first, lock it, re-skin.

**Format:** 1200 × 2000 portrait each. Full bleed, no magenta. Style per §4.

### 1.1 The authentic ground — this is not a fantasy map

Kallio is a real steep rectangle, **~610 m wide × ~1010 m tall** — one metro
stop end to end. The board's geometry is projected from real WGS84 positions
(`flow-core/city.js`; the arithmetic is in `MAP.md`) and a local is meant to
be able to check it. **The ten stops are placed, named and non-negotiable:**

| stop | x, y (of 61 × 101) | what it is |
|---|---|---|
| Vaasankatu | 39, 4 | the restaurant street — Toko Slomo's noodle shop |
| Sörnäinen | 61, 6 | metro station (opened 1984), the wholesale end |
| Kurvi | 55, 11 | the bend where Hämeentie meets Helsinginkatu |
| Vaasanaukio → *"Piritori"* | 45, 16 | the plaza at the metro's west door — the starting square |
| Harju | 9, 23 | Brahen kenttä, the sports fields |
| Torkkelinmäki | 39, 41 | the residential hill, 1920s courtyards |
| Karhupuisto | 24, 45 | the bear statue; Jaska's bench |
| Kallion kirkko | 6, 46 | the church on its rock, crowning the west ridge |
| Kuudes linja | 20, 59 | the linjat — the McCormicks' bar |
| Hakaniemi | 12, 101 | the market hall and the water |

**The street structure to draw** (all real; a 2003 Helsinki street map is the
reference — Karttakeskus or the HKL network map of that year):

- **Hämeentie** — the eastern arterial, running the full height past Kurvi to
  Sörnäinen. The heaviest line on the sheet.
- **Helsinginkatu** — the east–west cut meeting Hämeentie at Kurvi, passing
  Brahen kenttä and Urheilutalo.
- **Vaasankatu** — one block, dense with restaurant fronts, off Vaasanaukio.
- **The linjat** — the numbered parallel streets (Ensi linja … Kuudes linja)
  fanning south-west between Hakaniemi and Kallion kirkko.
- **Siltasaarenkatu** — the spine from Hakaniemi bridge north into Kallio,
  splitting around the church rock.
- **Torkkelinmäki** — the hill's curving 1920s streets, a soft oval knot
  distinct from the grid around it.
- **Karhupuisto** — the triangular park wedge with the bear at its point.
- **Water on two sides**: Eläintarhanlahti to the west, Hakaniemenranta and
  the Sörnäinen harbour edge to the south-east. Kallio reads as a high block
  between two waters — keep that.

### 1.2 The transit — real lines, 2003

The map carries the city's own services, drawn as printed transit lines over
the street structure. These are period-real; verify route paths against a
**2003 HKL network map**, and where that map and this table disagree on a
detail, follow the table (it is what the game simulates):

| line | mode | path on this board |
|---|---|---|
| **M** | metro | one tube under Hämeentie's side: **Hakaniemi ↔ Sörnäinen**, 900 m, only two stations on this board. Drawn as a heavier, straighter, *underground* line — visibly not a street |
| **6** | tram | Hakaniemi → Kurvi → Sörnäinen, riding Hämeentie |
| **3B** | tram | Hakaniemi → Kuudes linja → Kallion kirkko → Karhupuisto → Vaasanaukio → Kurvi — the figure-eight's Kallio loop, climbing through the heart of the district. (3B/3T lettering is period-correct; the letters lasted until 2013) |
| **1** | tram | Harju → Vaasanaukio → Kurvi, the Helsinginkatu side |
| — | car | Hämeentie and Helsinginkatu as ordinary traffic — present, quieter than the trams |

Tram lines follow **real streets** — a tram that cuts a corner no rail ever
took breaks the local's trust the same way a moved stop does. Metro is the
only line allowed to run straight through blocks, because it really does.

### 1.3 What the map must NOT do

- Do not move, add, merge or rename stops — not for composition, not for
  balance. (Owner ruling: *"only map style is canon, the places need to
  follow actual map."*)
- No Mini-Metro symbol language: no coloured geometric station shapes, no
  passenger icons, no Google-style pins.
- No text beyond place names and line letters/numbers; municipal sans-serif.
- The night map is **quiet**: charcoal paper, worn ink, no neon, no crime
  imagery. The day map is the same sheet in daylight inks.

---

## 2. The fight assets

The turn-based fights are isometric, two 3×3 grids facing across a street.
Full specs with pixel sizes in `NANO_BANANA.md` §5; the short list:

| what | count | note |
|---|---|---|
| **Arenas** | 4 | harbour (McCormicks) · courtyard (Igor) · Karhupuisto (rivals) · tenement yard (fallback). Wide 16:9, action ground empty in the lower two-thirds |
| **Cover props** | 5 × 2 states | concrete barrier, boulder, wheelie bin, pallet+crate, bike rack — **whole and broken**. Wide and LOW: waist height at most, never tall enough to hide a person |
| **Fighter poses** | 5 states × 2 facings | stand · strike · hit · down · walk-away; toward and away from viewer. Empty hands — weapons composite in. Joint markers in pure cyan `#00FFFF` (shoulder, elbow, knee) — they are read and erased |
| **Weapons** | 11 | fists, bottle, bat, steel pipe, blank gun (a starting pistol — draw it plausible; its whole job is that nobody can tell), hook, crowbar, plank, pistol, sawn-off shotgun, hunting rifle. Grip dot cyan `#00FFFF`, fore-grip dot orange `#FF6A00` |

## 3. The map's small art

| what | count | note |
|---|---|---|
| **Pin glyphs** | 9 | contact bust, €, R, !, ★, and the four stop glyphs (circle / diamond / square / triangle). Must read at 18 px |
| **Heat states** | 4 | one stretch of line: clean → noticed → watched → moving in. Same composition, only the ink treatment changes |
| **Key art** | 1 | `PIRITORI → EDEN`, 1600 × 1000, municipal type, EDEN cropped by the sheet edge |

## 4. The style — the 2026-08-18 hybrid

Locked by the owner, catalogued in `ART_BIBLE.md` §3.2:

> Hard black ink-line illustration with flat, slightly muted fills — Darkest
> Dungeon rather than a comic — printed as a risograph: paper grain over
> everything, screen-print colour separations, slight registration drift.
> Limited palette, hard seams, the silhouette doing the work. No gradients,
> no glow, no photographic rendering. Helsinki in 2003, not a crime film
> about it.

Palette (night): paper `#0f1216` · ink `#e2dccd` · dim `#8c8778` · water
`#1b2c3a` · line colours `#e2dccd #57c8e8 #7fc98a #c98ad8` · metro `#b06a2a` ·
tram `#5d6b5e` · car `#46525e`. Day palette in `ART_PROMPTS.md` §2.
**Reserved, never in art:** warning orange `#ff7a1a` and product magenta
`#F0027F` — both are applied in code and both mean something.

## 5. The named cast — second wave, after the sheets above land

Aatami (the builder), Jaska (the artist brother — charcoal under his nails),
Toko Slomo (noodle chef, Vaasankatu), Sean McCormick (the bar family, Kuudes
linja), Igor (the back booth, Sörnäinen). Each needs a **silhouette that reads
at 30 px** — build them on the delivered base bodies so the paper-doll layers
still fit. Not needed until the generic fighters are cut and compositing.

---

## 6. What is NOT requested

No audio (synthesised in code, always). No fonts. No UI kits or button art.
No tilesets. No animation frames — states, not sheets. No arcade marquee —
that is drawn in ~60 lines of canvas by house rule, from your key art as
reference. And nothing for **Pasila 2024**: it is canon and phase-gated
(`DECISIONS.md` §5) — no second-act art until Act I is feature complete.
