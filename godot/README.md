# Piritori → Eden — Godot port

Era I vertical slice (Kallio, 2003). Structure follows `../GODOT_HANDOFF.md` §4.

**Engine:** Godot 4.7.2 stable (handoff targets 4.3+)

## Setup — one command

The canonical JSON and registered art live *above* this folder and Godot can
only load from `res://`, so they are copied in:

```sh
node tools/sync-data.mjs               # copy canon -> data/
node tools/sync-data.mjs --check       # gate: fail if data/ has drifted
node tools/build-map-geometry.mjs      # structural SVG -> data/map-geometry.json
node tools/build-map-geometry.mjs --check
node tools/check-locale.mjs            # gate: locale coverage and drift
```

`data/` is git-ignored on purpose. Two committed copies of canon is how a
second lineage starts. The copy is verified two ways: byte comparison for the
JSON, and sha256 against `art/v3/manifest.json` for every registered asset.

Nothing here rewrites canon values. `map/kallio-era1-2003-v1.json` and
`content/era1-slice-v1.json` remain the comparison source (handoff §3), and all
IDs stay the authored strings.

## Run

```sh
godot --path .                                  # play
godot --headless --path . res://tests/test_spine.tscn   # data spine, 64 checks
godot --headless --path . res://tests/test_shell.tscn   # interface,   34 checks
godot --headless --path . res://tests/test_locale.tscn  # en/fi/ja,     6 checks
godot --path . res://tools/capture.tscn         # write screenshots (needs a GPU)
```

`PIRITORI_SHOT_DIR` sets where `capture.tscn` writes its PNGs.

The shell gate drives real `Button` nodes found by their authored label, never
the model directly — AGENTS.md §4, the rule that a gate calling the model proves
the model and says nothing about the interface.

`capture.tscn` exists because the standing lesson in this repo is that a gate
which certifies *works* cannot see *looks*. Three real bugs were found only by
looking at its output: a duplicated lead, a rail collapsed to one character per
line, and a board squeezed until its labels collided.

## What is implemented

| Handoff §9 gate | State |
|---|---|
| 1. opens on the full Kallio map with Piritori highlighted | **done** — all twelve anchors, north up, routes on graph edges |
| 2. buy the first pack, reveal the profitable sale | **done** — €45 buy, €68 Siltasaari sale, both authored |
| 3. same campaign state across all five modes | **partial** — City, Location, Market, Crew and Missions share `GameState`; News not built |
| 4. complete the seven-day slice | **partial** — the 14-block clock and schedule run; later encounters are reachable but not authored into scenes |
| 5. resolve a 2v2 and a 3v3 | **not started** |
| 6. save, quit, reload, resume | **done** — autosaves at every decision boundary |
| 7. reflow at phone portrait / landscape / desktop | **done** — gated at 390×844, 844×390, 1920×1080 |
| 8. resolve every referenced ID without fallback | **done** — `ContentRegistry` errors rather than substituting |

## Structure

```text
autoload/
  content_registry.gd   canonical IDs; missing references are errors
  game_state.gd         the one serialisable campaign model + effects grammar
  save_service.gd       autosave at decision boundaries
scenes/
  app_shell.tscn/.gd    status strip + world + rail/sheet, landscape & portrait
  city_map.gd           twelve anchors, north up, routes on graph edges
  location_stage.gd     stage art + LOOK/ACT/LEAVE, copy as live UI
  market_ledger.gd      only earned offers, commitment shown first
ui/
  palette.gd            ART_BIBLE §4.2 accents, each paired with a glyph
  map_style.gd          the map's authored treatment, from the SVG <style>
  icon.gd               command and stat icons, drawn in code
tests/                  spine + interface gates
tools/                  sync-data.mjs, build-map-geometry.mjs, capture.tscn
```

## Rules worth knowing before editing

- **Colour never carries a rule alone** (ART_BIBLE §4.2). Every state that has a
  colour also has a glyph or a word. `PiritoriPalette.state_glyph()` is the
  partner to `anchor_color()`.
- **Copy is live Godot UI, never painted into the stage** (handoff §5). The
  opening text is a `Label` for exactly this reason; a `draw_string` version
  could not reflow and was invisible to assistive tech.
- **44px is the floor, 48 is preferred** (UX_SPEC). The shell gate measures it.
- **The schedule gates content.** `content/era1-slice-v1.json`'s `schedule`
  puts one encounter in each of the 14 blocks. `piritori_first_buy` hosts both
  the day 1 purchase and the day 5 firearm scene, so revealing by *site* leaks
  day 5 content onto day 1. Reveal by schedule; `test_spine.gd` guards it.
- **JSON numbers arrive as floats.** `int()` them before display or the rail
  reads "Day 1.0".
- Era II (Pasila, 2024–2025) is canon but **production-gated**. Do not build it
  until `DESIGN_LOCKS.md` §12.1 is satisfied.

## Languages — en / fi / ja

**Owner extension, 2026-08-20.** UX_SPEC §13 says "Finnish and English are
complete slice languages"; Japanese was added on direct owner instruction. That
is recorded here and in `autoload/loc.gd` rather than left as a silent
contradiction (AGENTS.md §1), and UX_SPEC should list three languages when it is
next revised.

Strings live in `locale/ui.csv` (Godot's CSV translation format, one column per
language). English is the per-key fallback, which is the house rule — but that
fallback is *silent*, which is precisely how this repo once shipped English-only
entries in two packs with every gate green. So `tools/check-locale.mjs` fails on
a missing cell, on a fi/ja cell identical to its English one, on mismatched
format specifiers, on a `tr()` key with no row, and on a row nothing uses.

Language changes at a decision boundary and does not restart the run (§13); the
shell rebuilds presentation only and `test_shell.gd` asserts cash, block and
flags survive the switch.

**What is NOT translated, deliberately.** The authored slice — encounter prose,
choice labels, forecasts, crew names — is owner-written narrative in
`content/era1-slice-v1.json` and exists in English. Machine-translating it and
presenting the result as canon would be fabrication, so the UI states
`Loc.CONTENT_LANGUAGE` plainly instead ("Story text is authored in English
only."). When the owner supplies translated content packages, point
`CONTENT_LANGUAGE` at them.

**Both packs need a native read.** They were written to fit the game's register
by someone who is not a native speaker of either language — the same caveat
`toko/` records about its own fi/ja packs. Treat them as drafts.

Japanese needs glyphs the bundled Godot font does not carry, so `ui/fonts.gd`
asks the system for a face and lets Godot fall back per glyph, rather than
committing a multi-megabyte Noto binary. `test_locale.gd` measures a CJK string
and fails if it comes back tofu-width.

## The city map

Built to MAP.md §6's twelve-layer contract, back to front: paper backing, water,
district relief, rail and road cuts, block collage, transit corridors, ordinary
people flow, crew and goods flow, anchors, selection, labels, chrome.

Geometry is the canonical structural drawing `map/kallio-era1-2003-v1.svg`,
flattened to board-space polylines by `tools/build-map-geometry.mjs`. Treatment
is that file's own `<style>` block, transcribed into `ui/map_style.gd` — road
casing widths, the tan fibre coast stroke, rail tie dashes, tram green and metro
orange all come from there rather than from taste.

Two things are elaborated rather than copied, and MAP.md §2 is what permits it:
the nineteen authored block masses are subdivided into a denser cut-card collage,
and the land is given a lighter street bed so the gaps between blocks read as
streets. §2 allows "no more than 12% local displacement" to "labels, minor blocks
and decorative streets" while "public anchors, coastline, rail edge and major
corridor order may not be mirrored or rearranged" — so anchors, coast, rail and
corridors are untouched and the subdivision is seeded to be identical every run.

Routes are drawn from the graph, never straight: `_corridor()` walks the 22 public
edges breadth-first, so a line never crosses water or a block.

## Placeholders, labelled as such

The map relief and the Piritori stage are code-drawn placeholders and say so on
screen (handoff §6). Registered art from `art/v3/manifest.json` is used where it
exists — Karhupuisto, the Toko interior and the courtyard — and no art is ever
silently substituted for a missing asset.
