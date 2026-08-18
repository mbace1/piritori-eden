# Piritori → Eden — art bible

Catalogue of delivered art, the conventions it establishes, and the places it
disagrees with canon or with the code. Companion to `ART_BRIEF_CONCEPT.md`
(the intended look) and `ASSETS.md` (what was requested).

**Status: two deliveries received 2026-08-18, files not yet in the repo.**
See §5 for how to land them.

**The owner's ruling on the same day: "take all art pushed here as canon and
target."** So this document stops being a list of objections. §3 records the
five answers and what each one changed in the code; anything the art and an
older document disagree about, the art wins and the older document is the one
that gets rewritten.

---

## 1. What arrived

Two batches. The first was thirteen images in three groups (§1.1–1.3); the
second (§1.0) arrived with the ruling and changes the handling. Every sheet
follows the **magenta rule**
already established in `kindling/art-src/NANO_BANANA_PIPELINE.md` — flat
`#FF00FF` background, subject clear of the edges — so `kindling/tools/cut.mjs`
can key, fit, slice and check them without modification.

### 1.0 The second batch

A further set arrived with the ruling, and it shifts the house style rather
than adding to it:

- **Flatter, paper-cutout / construction-paper handling** on the figures, where
  the first batch was ink-line over painted texture. §3.2's hybrid has to
  absorb this too.
- **Joint markers** — dark circles at shoulders, elbows and knees on the action
  poses. Read alongside *"some characters will be also tested in Meshy 3d"*,
  those are rig points, not decoration, and they are a real constraint on the
  paper-doll layer contract (§4.3): the anchors have to sit where the markers
  are.
- **Anchor dots on the weapon sheet** — cyan and orange, one at the grip and
  one at the fore-grip. That is a two-point contract: a held item is placed by
  matching grip to hand and fore-grip to the second hand, which is what lets
  one pose hold a bat, a crowbar and a rifle.
- **New weapons that were not in the table**: crowbar, plank, shotgun, rifle.
  All four are now in `WEAPONS` — see §3.1 and `FIGHT_BRIEF.md` §6.

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

## 3. The five conflicts, and how they were answered

Raised 2026-08-18, all five answered the same day. Each entry is the question,
the owner's words, and what actually changed.

### 3.1 Guns — ANSWERED: **"there are guns"**

Canon changed. `BRIEF.md`'s *"there is no gunfight"* is **not** deleted — it was
never about whether firearms exist (the McCormicks have sold *"hard steel or
blank guns"* since the first pitch), it is about what a fight in this game is.
So the sentence is now kept true structurally instead of by absence.

**Changed in code** (`js/fight.js` OWNER OVERRIDE 2, `FIGHT_BRIEF.md` §2.1):

- `pistol`, `shotgun` and `rifle` added, flagged `live: true`, all drawing real
  blood. The shotgun does not pierce — spread, so a body really does stop it.
- **The structural test that enforced the old reading is gone.** It asserted
  *"nothing that reaches the back row draws blood"*; four rules replace it —
  guns work, no starting roster carries one, fear is still the only *free* way
  to reach the back row, and a shot costs more heat and trust than any other
  way out of any fight.
- A shot is heard: everyone on the board is shaken, and a fight with a shot in
  it can never be recorded as *routed*.
- The auto-battler will not reach for a gun while anything else is in range, or
  handing the fight to AUTO would quietly play a different game.

The **blank gun is untouched** and is still one of the strongest pieces on the
board. The pistol-aimed pose serves both.

### 3.2 Risograph vs painted — ANSWERED: **"sure, it's a hybrid"**

Not a replacement, a blend. The house look is now: **the risograph's flat
screen-print separations, paper grain and municipal type, carried on the
delivered ink-line-over-painted-texture illustration.** Where they pull against
each other — and they do, on grain and on how much rendering a surface gets —
the delivered art is the target and the print language is the treatment on top
of it.

**Changed:** `ART_PROMPTS.md` §1 house preamble reissued as the hybrid, so
every future generation inherits it. `ART_BRIEF_CONCEPT.md` still describes the
pure risograph read and is the older document.

### 3.3 The map's places — ANSWERED: **"only map style is canon, the places need to follow actual map"**

Split decision, and the useful kind. The delivered map's **style** is the
target; its **place list is not**. `flow-core/city.js` keeps the ten stops
projected from real WGS84 coordinates, so Siltanen / Merihaka / Siltasaari /
Alppiharju do not enter the graph, and Karhupuisto, Kuudes linja, Kallion
kirkko, Torkkelinmäki and Kurvi have to appear in the art.

**Changed:** nothing in code — this confirms what is there. `ART_PROMPTS.md`
§3.1 already prompts the real ten and gains a line saying the geometry is
non-negotiable while everything about the rendering is.

#### The original table, kept for whoever regenerates the map

| on the delivered map | in `flow-core/city.js` |
|---|---|
| Piritori, Sörnäinen, Harju | ✅ present |
| Toko Noodles | ✅ `vaasankatu` (Toko Slomo's shop) |
| **Siltanen, Merihaka, Siltasaari, Alppiharju** | ❌ not in the graph |
| — | ❌ missing from art: Kuudes linja, Kallion kirkko, **Karhupuisto**, Torkkelinmäki, Kurvi |

Karhupuisto matters most of the five: the bear statue is already in the props
sheet and Jaska's bench is a story beat there.

### 3.4 Cover — ANSWERED: **"cover is terrain and also others"**

Both, and terrain is now real. See `FIGHT_BRIEF.md` §4.1 for the full rule.

**Changed in code** (`js/fight.js` OWNER OVERRIDE 3):

- Props stand on cells — barrier, boulder, bin, crate, bike rack — and occupy
  them, so nobody may move into cover.
- The old rule generalised rather than changed: a non-piercing weapon resolves
  against the frontmost **thing** in the lane, body or barrier alike.
- **Hard** cover stops a piercing weapon and shuts the lane; soft cover does
  not. `breach` is what a weapon does to a thing rather than a person, which is
  what the crowbar is for.
- Props carry no nerve, breaking one shakes nobody, and they cannot win or lose
  a fight.
- `fightview.js` draws them as low slabs with their own condition bar, and each
  opponent now names an **arena** — which is the hook the four delivered
  backgrounds hang on.

### 3.5 Props and obstacles — ANSWERED: **"sure, we can have rocks etc"**

Confirmed, and implemented as part of §3.4: the boulder is in `COVER` and
standing in Karhupuisto. The street props sheet (barrier, bollard, bin, bike
rack, noticeboard, bench, pallet+crate, bear statue) is the source list, and
everything on it that could plausibly stop a swing is a candidate.

### 3.6 Still open: ITEM, and GUARD as a bar — DESIGN

Not among the five, and still unanswered. The fight UI mockup has an **ITEM**
button (no consumable system exists) and shows **GUARD as a five-segment bar**,
where the code has guard as flat damage reduction and BRACE as an action.

> **Decision needed:** add consumables, or drop the button from the mockup?

---

## 4. What the art implies we still need

Not requests yet — consequences of the delivery, for the next batch:

1. ~~**Arena inventory.**~~ Answered in code now that §3.4 gave arenas a
   purpose: debt brings Igor's men to the **courtyard**, a hot line brings the
   rival crew to the **park** (Karhupuisto), and carrying a lot brings the
   McCormicks to the **harbour**. The tenement courtyard is unassigned and is
   the obvious home for whatever encounter comes next.
2. **The named cast.** Sheets K–N are generic bodies. Aatami, Jaska, Toko
   Slomo, Sean McCormick and Igor need identifiable silhouettes.
3. **A layer contract** for the paper-doll system — body / legs / torso / held
   item. The second batch has already half-written it: the **joint markers** on
   the action poses are where the anchors go, and the **two dots on the weapon
   sheet** (grip, fore-grip) say a held item is placed by two points rather than
   one. What is still needed is the numbers — pixel positions per pose, at a
   stated cell size — and a decision on whether the markers are visible in the
   shipped art or a registration layer that gets keyed out. **Recommend: keyed
   out**, the way the magenta background already is.
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
