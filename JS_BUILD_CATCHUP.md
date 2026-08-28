# JS build catch-up — assets, canon and what changed

Written 2026-08-27, for whoever brings the JavaScript instance of Piritori
forward. It is an inventory and a status report, not instructions: it says what
exists, where it is, and which decisions have been made since the JS build
stopped.

**Update, 2026-08-28 — the JS build leads now.** `DESIGN_AUTHORITY.md`'s
2026-08-28 ruling reverses the framing this whole document was written under:
new gameplay is designed on the JS build first, Godot ports it after. The
paragraph below is kept as history — it explains why the build was unable to
load its own content, which mattered for exactly the reason this document
gives, and every one of the three bugs it names was found and fixed today. See
`QUEUE.md`, 2026-08-28, for the fix itself.

**Where the JS build stood, and why it could not load.** The live JS instance
on the arcade hub is `piritori/` on Suds-Jack's `gh-pages`, deployed **20 Aug
2026** as "Piritori v3 vertical slice". Its source is `legacy/` in this repo
(name unchanged — a rename to something clearer was proposed and blocked by
tooling, not yet done). It renders with `getContext('2d')` — there is no
WebGL in it. Everything below post-dates the 20 Aug deploy.

The one thing to read before anything else: **`PHASING.md` §1.055, the 3D
ruling of 22 Aug** — *"change the goal from 2d to 3d"*. It landed the day after
the JS build was parked, which is why that build has no 3D in it. It replaces
the premise `ART_BIBLE.md` was written on. A JS build that adopts these assets
is adopting a 3D game with 2D chrome, not a 2D game.

---

## 1. Where the assets are

`art/v3/manifest.json` is the **only valid source of runtime art ids**
(`CLAUDE.md` rule 5, item 11). Do not glob directories — read the manifest.
58 assets, 146 files, schema 1, status `vertical-slice-prototype`, active style
`cut-cardstock-hand-ink-v03`.

An asset entry carries EITHER a single `file`, OR `members[]`, OR `frames[]`.
Reading only `file` is a known trap: it once synced 11 of 52 files and reported
success (`CLAUDE.md` rule 11).

### 3D — 26 GLB files, 32 MB on disk

| Path | Count | What |
|---|---|---|
| `art/v3/cast3d/*.glb` | 14 | the fighters and named characters |
| `art/v3/cast3d/clips/*.glb` | 8 | animation clips, split out from the meshes |
| `art/v3/stage3d/*.glb` | 3 | battle arenas |
| `art/v3/presenter/*.glb` | 1 | Arvo Linde, the TV presenter |

**The 14 characters.** Six are the field roles the generator can produce —
`driver`, `fixer`, `local`, `muscle`, `runner`, `watcher` — plus `hired` and
`hired-b` as generic hires. `enforcer` is opposition-only. `street-raver`,
`suited-man`, `parka-man` are opposition/ambient types. `toko` and `jaska` are
named `NARRATIVE.md` characters.

**Toko's golden smiling mask is CANON** (`ART_BIBLE.md` §8.3, and the manifest
says so outright). It is a full-face orange/gold card hood with three broad
white curved frames and the eye openings cut *inside* the two upper arches. It
is not a bug, it is not a placeholder, and it must survive any port. This was
misdiagnosed as a shipped error in this repo on 2026-08-27; do not repeat it.

**Animation clips.** `muscle` has separate `idle / attack / behit / dead`
clips; `enforcer`, `hired`, `hired-b` and `street-raver` have a single combined
`*-clips-v01.glb`. The rest currently have no clips. `art-library/cast3d/`
holds `toko-v02-clips.glb`, which is not yet registered.

### 2D — still current, still needed

| Path | Files | Size | What |
|---|---|---|---|
| `art/v3/scenes/` | 14 | 2.7 MB | location plates, WebP, 1536×864 |
| `art/v3/cast/` | 54 | 1.5 MB | 2D unit poses, per role |
| `art/v3/animation/` | 18 | 464 KB | ambient animation frames |
| `art/v3/equipment/` | 9 | 192 KB | weapons and gear |
| `art/v3/weather/` | 5 | 17 KB | weather layers |

The 2D cast set is **not** superseded. The Godot build keeps a 2D battle board
alive behind a `use_3d` flag specifically so it stays reachable and testable.
For a JS build it is likely the primary board, not a fallback.

### Scenes are painted EMPTY on purpose

STAGE_SPEC 6.3: a location plate contains **no people**, and the space where a
person would stand is painted as a room that continues. The figure is
composited in as a separate layer. `toko-slomo-noodles-empty-v01.webp` and
`bank-counter-v01.webp` are both built this way. Do not paint characters into
plates.

Each scene entry carries `portrait_safe_bounds` (typically
`[0.24, 0, 0.76, 1]`) — the horizontal band that must survive a portrait crop.

### Source and tooling

| Path | Size | Role |
|---|---|---|
| `art-src/` | 97 MB | generation sources. Every `.png` has a `.txt` beside it holding the prompt that made it |
| `art-src/meshy-input/` | — | what was sent to Meshy, plus the GLB toolchain |
| `art-library/` | 256 MB | the manifest's declared `source_root`, with `CATALOG.md`, `APPROVALS.md`, `MODULAR_CHARACTER_SYSTEM.md`, `ANIMATION_LAYER_CONTRACT.md` |

`art-src/meshy-input/` also holds the offline GLB tools, which are the
practical way to re-cut assets without regenerating them:

- `glb_inspect.py` — dump a GLB's meshes, materials and textures
- `glb_decimate.py` — reduce polycount
- `glb_retex.py` — swap or re-encode the baked texture
- `glb_pose.py` — repose a mesh
- `glb_make_clips.py` — split animation clips out of a combined GLB
- `glb_render.py` — render a preview

**Meshy costs real credits.** Image-to-3D at 30k polycount is roughly 15
credits; the balance was 114 on 2026-08-27. Check before batch work and get an
explicit go-ahead. Balance endpoint is `openapi/v1/balance` — the `v1/balance`
some notes cite returns `NoMatchingRoute`, and `m3d.sh` has no `--balance`
flag.

**The T-pose rule, if a character is ever remade.** `ART_BIBLE.md` §7:
full-figure T-pose, **front, direct to camera**, flat neutral ground, even
light, no cast shadow, margin on all four sides. Before spending anything,
zoom in and check four things individually — the head (dead front, both ears
equal), both armpits (open background between sleeve and torso), both feet
(exactly two, fully separate). Written after a three-quarter head was sent to
Meshy and broke the mesh down its centreline. `art-library/references/bodies/`
holds the format that is known to work, and
`art-src/concepts/people/toko-slomo-notext-v01.png` is a good worked example.

---

## 2. The runtime contract

From the manifest, and it is aimed squarely at a web build:

| Key | Value |
|---|---|
| `opaque_scenes` | WebP, lazy-loaded per location |
| `transparent_units` | WebP with verified alpha |
| `scalable_layers` | SVG |
| `text_and_controls` | DOM/SVG UI unless a flattened prototype is explicitly declared |
| `final_art_claim` | `false` — nothing here is final art |

---

## 3. What changed since the JS build was parked

### The map is real public data

The city map was rebuilt from real sources and contains **no invented
geometry**. A JS build can consume the same data files:

- `map/kallio-water-v1.json` — real OSM coastline, 27 ways that chain into
  continuous shoreline plus three real islands
- `map/kallio-streets-v1.json` — real OSM streets, 5652 ways, tiered
  major/mid/minor
- `map/kallio-railway-v1.json` — real OSM railway, 485 ways, tiered
  main/branch/yard
- `map/kallio-rail-v1.json` — real HSL GTFS transit geometry
- `map/kallio-era1-2003-v1.json` — the board, and the canonical
  `coordinateSystem` block for wgs84 ↔ board conversion

Land is derived by flooding from the 14 board anchors (known land, by
authorship) with the chained coastline as the barrier. Three earlier
coastline-only approaches failed; the reasons are recorded in
`godot/tools/build-map-geometry.mjs` and `map/tools/land-from-coastline.mjs` so
they are not retried.

### Crew names are generated, never authored

`COMBAT.md` §7.1: named characters are story units; **everyone else is
generated and disposable**. The slice's six crew lost their authored names on
2026-08-27 — their ids are now `crew-slot-runner`, `-muscle`, `-watcher`,
`-fixer`, `-driver`, `-local`, and the display name is drawn from first/family
pools seeded by the crew id. Both halves of a name come from **one** origin
pool; mixing them invents people no family ever had.

Careful with the word `named`: on a crew record it means *"an encounter refers
to this id, so careers must not retire them"* — a content-dependency fact, not
"is canon".

Known limitation: the pools have no gendered family forms (the Russian pool
yields "Galina Smirnov" where a woman would be *Smirnova*) and are small enough
to collide.

### UI direction: cardstock over a 3D world

`art-library/ux-concepts/README.md` settles it — *"a 3D world, and torn-carton
UI on top of it… cardstock is the interface, not the world."* `chrome-carton-test.png`
is the approved direction. Cream carton panels, ink lettering, soft drop
shadow, torn edges at panel scale only — **not** on small labels, where a
jittered edge reads as a rendering fault.

### Sizing lessons that will apply to any build

Learned the hard way on a Pixel 10 this week, and they are framework-agnostic:

- A raw pixel count has not meant physical width since phones got dense
  screens. Decide "narrow" by orientation, not by a pixel threshold.
- Fit type by **measuring** the longest string against the space it has.
  A button whose content is wider than its minimum simply grows and pushes the
  row off-screen — and the words differ in length in Finnish and Japanese.
- Never scale a size that was already derived from the screen. Doing it twice
  produced 130px status chips that shoved the header off the window.
- A floor must grow with its type. A target tall enough to press but too short
  to read is not finished.
- Landscape should not scale up. A desktop window is the size the authored
  numbers were chosen for.

### Committed context is now enforced

`UX_SPEC` §3.2: Location and Battle are committed contexts — the shell
contracts and switching to unrelated modes is disabled. As of 2026-08-27 the
battle screen drops the navigation dock and the END DAY button and shows only
time block and cash (§3.4). Location still needs the same treatment.

---

## 4. Device and performance findings

A Pixel 10 (Tensor G5, **Imagination PowerVR D-Series** — a new driver stack,
not the Mali of earlier Tensors) black-screens on the Godot web build. Relevant
measurements, because they bear on any web build:

| Group | Uncompressed VRAM |
|---|---|
| scene plates (14) | 75.2 MB |
| cast3d textures (14) | 53.0 MB |
| 2D cast sprites (72) | 54.0 MB |
| **total** | **182 MB** |

The Godot export ships with `vram_texture_compression/for_mobile=false`, so
none of that is compressed, and `thread_support=false` because GitHub Pages
cannot send COOP/COEP headers.

**What this does and does not prove.** `toko-drop` on the same hub renders 3D
on that device — but it is built entirely from procedural primitives
(spheres, boxes, cylinders, `InstancedMesh`) with **no `GLTFLoader` and no
`TextureLoader`**. So it proves the device can make a WebGL/WebGPU context and
run shaders. It proves nothing about uploading 128 MB of textured meshes and
plates. A JS build adopting these assets should assume texture budget is the
binding constraint and compress accordingly (ETC2/ASTC, or smaller atlases —
the cast3d textures are 1024² and may not need to be).

---

## 5. Canon a JS build must not quietly break

In authority order (`CLAUDE.md` rule 5):

- **`PHASING.md` §1.055** — the game is 3D. A 2D board is a presentation
  choice, not a reversal of the ruling. Write it down if you rely on it.
- **`NARRATIVE.md`** — character canon, not negotiable by a mechanic. Aaro's
  death is fixed. Arvo is a fictional homage, not a portrait. People are never
  scenery. Toko is an independent shop owner, never an ethnic servant analogue.
- **The fiction boundary** (`content/era1-slice-v1.json`) — all criminal
  characters, organisations and exchanges are fictional composites; public
  places and sourced facts stay clearly separated from the fiction. The bank in
  Siltasaari is fictional and `addressPrecision: "anchor-only"` for this reason.
- **`art/v3/manifest.json`** — the only valid runtime art ids.
- **Era I material culture** (`NARRATIVE.md`) — 2003: euro is current, markka
  turns up in drawers and is only spendable after a physical teller visit;
  television is the authoritative public clock; phones are calls and SMS only;
  going online means reaching a desktop terminal somewhere.

---

## 6. Open questions for whoever picks this up

- Is the JS instance meant to be a **parallel product** or a **compatibility
  path** for devices the Godot build cannot reach? The answer decides whether
  the 2D cast set is maintained art or a diagnostic.
- If parallel: it needs its own capture/verification story. The lesson that has
  cost this repo most is that *a screen nobody photographs is a screen nobody
  checks* — the battle console shipped unreadable on a phone because no tool
  ever took its picture.
- `harju_pitch` and `jade_lantern_front` still have no scene art and fall back
  to a labelled placeholder.
