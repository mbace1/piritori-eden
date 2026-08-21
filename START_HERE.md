# Piritori → Eden — start here

A narrative strategy game set in Kallio, Helsinki, 2003: a visible city-flow
simulation, location-based market management, authored encounters and rare
isometric formation battles.

This repository holds the design canon, the source and runtime art, the authored
content slice, the map data and the Godot implementation.

## First five minutes

The game is a Godot 4.7.2 project under `godot/`.

```bash
GODOT="/c/Users/Mikael/Documents/Codex/2026-08-20/can-you-connect-to-godot/tools/godot/Godot_v4.7.2-stable_win64.exe/Godot_v4.7.2-stable_win64_console.exe"

cd godot
node tools/sync-data.mjs          # copy canon into res://data/ (git-ignored)
node tools/build-map-geometry.mjs # SVG -> board-space polylines
"$GODOT" --path .                 # open the editor
```

`godot/data/` is generated and never committed. If the project complains about
missing content, run `sync-data.mjs` first.

## Read in this order

1. `DESIGN_AUTHORITY.md` — resolves contradictions. Read this before changing
   anything.
2. `DESIGN_LOCKS.md` — owner-approved system and content locks.
3. `GAME_DESIGN_DOCUMENT.md` — active game design.
4. `ART_BIBLE.md` — visual and production rules.
5. `UX_SPEC.md` — the five interaction modes and responsive behaviour.
6. `MAP.md` — Kallio geography and the compressed graph.
7. `content/era1-slice-v1.json` — the finite seven-day authored slice.
8. `art/v3/manifest.json` — the only valid runtime-art ids.

`GODOT_HANDOFF.md` is the engine-port guide and sits after the canon stack.
`CLAUDE.md` is the working guide: gates, seams, traps.

Older brief, prompt and exploration files (`ART_BRIEF_CONCEPT.md`,
`ART_PROMPTS.md`, `ART_REQUEST.md`, `ASSETS.md`, `CLAUDE_HANDOFF.md`,
`CONTENT_HANDOVER.md`) are historical evidence, not authority.

## Folder map

| Path | Purpose |
|---|---|
| `godot/` | the game — Godot 4.7.2 project, six test gates |
| `content/` | encounters, crew, missions, market, battles, news and validator |
| `map/` | twelve-anchor Era I graph, structural SVG and validator |
| `art-library/` | approved source assets and production contracts |
| `art/v3/` | optimized registered runtime derivatives + manifest |
| `art-src/` | generation scripts for the Nano Banana pose pipeline |
| `ux/` | the five-modes layout studies |
| `legacy/` | the superseded browser prototype — parked, does not run |

## The gates

All six must be green before a playable milestone.

```bash
cd godot
node tools/sync-data.mjs --check     # canon is byte-identical in res://data/
node tools/check-locale.mjs          # no missing or stale translation keys
"$GODOT" --headless --path . --import

for t in spine shell locale battle battle_ui playthrough; do
  "$GODOT" --headless --path . tests/test_$t.tscn
done
```

215 checks at the time of writing. They drive the real interface — a gate
presses the button rather than calling the model — so a gate that cannot fail is
a finding rather than a pass.

## Current playable scope

- seven in-game days, Day and Night blocks;
- the full compressed Kallio map with eight active anchors;
- fourteen authored encounters on a fixed schedule;
- the Piritori purchase-to-first-profit opening;
- Toko, Jaska, McCormicks, staffed bank and restaurant-front scenes;
- one product, five offers, debt and old-markka conversion;
- six recruitable adults with a nine-pose art set each;
- one information-avoidable 2v2 and one consequential 3v3;
- a scheduled sourced Arvo bulletin with a live 3D presenter;
- four Pasila-reachability outcomes;
- English, Finnish and Japanese.

Era II is phase-gated. Do not start 2024–2025 content until Era I is feature
complete and the owner opens that phase.

## Art rules

- Runtime code resolves stable ids from `art/v3/manifest.json`. It does not
  guess filenames and does not load review sheets directly.
- Source assets stay in `art-library/`; web-ready derivatives stay in `art/v3/`.
- `art-library/archive/needs-rework/` is provenance only and may never become a
  runtime dependency.
- Approved means the direction is settled, not that every sheet is split,
  compressed and animation-ready. Courtyard and weather art remain visibly
  semi-approved.

Shipping real art is a normal decision here, not an exception to anything — see
`DESIGN_AUTHORITY.md` § Assets.

## Deploying

The build lands as a folder on the Suds-Jack `gh-pages` site, which is the
arcade that links to it. Source lives here; the deployed artefact does not.

```bash
cd godot && ./tools/export-web.sh
```

Threads are off deliberately: Godot's web export wants `SharedArrayBuffer`,
which needs COOP/COEP headers that GitHub Pages cannot set. The script verifies
the built wasm rather than trusting the setting.

The export is roughly 58MB on disk and about 28MB gzipped, most of it the engine
binary itself. That is the cost of Godot on the web and no amount of asset
cleanup moves it much.
