# Piritori → Eden — art bible

Catalogue of delivered art, the conventions it establishes, and the places it
disagrees with canon or with the code. Companion to `ART_BRIEF_CONCEPT.md`
(the intended look) and `ASSETS.md` (what was requested).

**Status: first delivery received 2026-08-18, files not yet in the repo.**
See §5 for how to land them.

---

## 1. What arrived

Thirteen images, in three groups. Every sheet follows the **magenta rule**
already established in `kindling/art-src/NANO_BANANA_PIPELINE.md` — flat
`#FF00FF` background, subject clear of the edges — so `kindling/tools/cut.mjs`
can key, fit, slice and check them without modification.

### 1.1 Screens (mockups, not assets)

| | what |
|---|---|
| A | **Map screen, portrait** — `PIRITORI → EDEN`, `2003 · AATAMI`, `DAY 04`, four HUD counters, two route lines, four node pins, bottom nav |
| B | **Map screen, landscape** — same, localised (`PÄIVÄ 04`, `€ 6 420`) |
| C | **Fight screen, landscape** — `KIERROS 2`, isometric, rank labels both sides, crew panel, six action buttons |
| D | **Fight screen, portrait** — same layout stacked |
| E | **Fight screen, landscape, alt** — different crew, wider street |

### 1.2 Backgrounds (fight arenas)

| | what | reads as |
|---|---|---|
| F | **Harbour at night** — warehouses, cranes, ship, rail in the setts | Sörnäinen / the wholesale end |
| G | **Courtyard with arch** — brick, one lit doorway, wet stone | a back court off the linjat |
| H | **Park square** — gazebo, railings, autumn trees, plinth | Karhupuisto |
| I | **Tenement courtyard** — four storeys, lit windows, gravel | the linjat |

### 1.3 Sheets (cuttable, on magenta)

| | what |
|---|---|
| J | **Street props** — barrier, bollard, bin, bike rack, noticeboard, bench, pallet+crate, **bear statue** |
| K | **Base bodies** — male/female, front/side/back/side, T-pose |
| L | **Body types** — thin / medium / heavy, both sexes, T-pose |
| M | **Trousers** — six, with footwear |
| N | **Action poses** — phone, baton low, baton raised, shotgun, pistol aimed, bat shouldered, bat raised, shotgun held |
| O | **Dogs** — shiba and rottweiler, four poses each |
| P | **Trees and bushes** — four wind frames each |

---

## 2. What the delivery establishes

These are now the house conventions, because the art says so more clearly than
any document did:

- **Ink-line illustration over painted texture.** Hard black outline, flat-ish
  fills, grain on top. Closer to Darkest Dungeon than to a risograph print.
- **Cyan is yours, red is theirs.** Consistent across both fight mockups, and it
  matches the code's existing `draft: #57c8e8`.
- **Rank labels are literal text** — `BACK / MIDDLE / FRONT` down both sides.
  Better than my code-drawn version, which labelled only the player's side.
- **Two bars per fighter, and they are named**: `GUARD` (cyan) and `NERVE`
  (magenta), with a separate heart HP number. Nerve arriving in the art
  independently is a good sign for the v2 fight design.
- **Character construction is modular** — base body → body type → trousers →
  pose. That is a paper-doll system, and it wants a layer contract.
- **Bilingual from the start** (`KIERROS`, `PÄIVÄ` vs `DAY`).

---

## 3. Conflicts — flagged, not resolved

Per `AGENTS.md`, canon-level conflicts need an owner decision rather than a
unilateral fix. These are the five.

### 3.1 Guns — CANON

Sheet N contains **a pistol and a shotgun**, both held as working firearms.

`BRIEF.md` puts *guns* and *combat* on the Dope Wars do-not-copy list, and
§ Pressure/heat says flatly *"there is no gunfight."* The code removed the
pistol for exactly this reason, and there is now a **structural test** enforcing
it: *anything that can reach the back row must draw no blood.*

Note the pistol pose is not necessarily a problem — the **blank gun** is a real
gun that does not fire, so a pistol-aimed pose is perfectly canon and is
probably the single most important pose in the game. **The shotgun is the
question.**

> **Decision needed:** is the pistol pose the blank gun (canon intact), and is
> the shotgun cut — or has canon changed?

### 3.2 Risograph → painted realism — CANON

`BRIEF.md` § Visual direction specifies *"a living printed city diagram… a
risograph / photocopied civic map: paper grain, screen-print flats, slight
registration drift, municipal typography."*

The delivered map is a **dark, relief-shaded, near-photographic city model**.
It is good, and it is not that.

> **Decision needed:** does the delivered direction replace `BRIEF.md`
> § Visual direction? If yes, that section should be rewritten rather than left
> to contradict the art. `ART_BRIEF_CONCEPT.md` and `ART_PROMPTS.md` both
> describe the risograph look and would need reissuing.

### 3.3 The map's places do not match the code — DRIFT

| on the delivered map | in `flow-core/city.js` |
|---|---|
| Piritori, Sörnäinen, Harju | ✅ present |
| Toko Noodles | ✅ `vaasankatu` (Toko Slomo's shop) |
| **Siltanen, Merihaka, Siltasaari, Alppiharju** | ❌ not in the graph |
| — | ❌ missing from art: Kuudes linja, Kallion kirkko, **Karhupuisto**, Torkkelinmäki, Kurvi |

The code's ten stops are projected from real WGS84 coordinates and a local is
meant to be able to check them. Karhupuisto is missing from the map even though
the bear statue is in the props sheet and Jaska's bench is a story beat there.

> **Decision needed:** does the art's place list replace the code's, or is the
> art a compressed view? If the art wins, `city.js`, `MAP.md` and every gate
> that names a stop change together.

### 3.4 Cover is now terrain — DESIGN

Both fight mockups show **concrete barriers standing between the ranks**. The
code's cover rule is *cover is a body*: a non-piercing weapon resolves against
the frontmost living enemy in that column.

Terrain cover is a real addition and a good one — it would let a fight's arena
matter. It is also not in `FIGHT_BRIEF.md`.

> **Decision needed:** are the barriers set dressing, or do they block?

### 3.5 ITEM, and GUARD as a bar — DESIGN

The fight UI has an **ITEM** button (no consumable system exists) and shows
**GUARD as a five-segment bar**, where the code has guard as a flat damage
reduction and BRACE as an action.

> **Decision needed:** add consumables, or drop the button from the mockup?

---

## 4. What the art implies we still need

Not requests yet — consequences of the delivery, for the next batch:

1. **Arena inventory.** Four backgrounds exist; encounters are triggered by
   debt, heat and carrying. Which arena goes with which trigger?
2. **The named cast.** Sheets K–N are generic bodies. Aatami, Jaska, Toko
   Slomo, Sean McCormick and Igor need identifiable silhouettes.
3. **A layer contract** for the paper-doll system — body / legs / torso / held
   item, with anchor points, or the parts will not line up when composited.
4. **Node pin art** for the six pin types the map layer already draws.
5. **Hit, down and rout states** for each pose — the fight has three exits and
   currently only standing art.

---

## 5. Landing the files

Nothing is in the repo yet. Structure mirrors Kindling's, so the existing tool
works unchanged:

```
piritori/art-src/
  raw/        generated originals            (gitignored)
  work/       intermediate key/fit output    (gitignored)
  approved/   committed, cut, checked
  SHEETS.md   one line per sheet: source prompt, cell size, contents
```

Then, per `kindling/art-src/NANO_BANANA_PIPELINE.md`:

```bash
node kindling/tools/cut.mjs key   raw/poses.png work/poses.png
node kindling/tools/cut.mjs fit   work/poses.png work/poses.fit.png 512x512
node kindling/tools/cut.mjs slice work/poses.fit.png approved/poses 128
node kindling/tools/cut.mjs check approved/poses/*.png
```

**`check` is the gate, not an opinion.** Kindling's own report currently reads
`0/10 usable` on its approved folder — thumbnails and baked-in labels. Run it
before committing anything here.

**One standing-rule note:** this repo ships no image assets, everywhere except
generated PWA icons. Committing cut PNGs is a deliberate departure. Kindling is
already heading the same way, so this is a repo-wide direction change rather
than a Piritori exception — worth saying once, in `CLAUDE.md`, rather than
twice by accident.
