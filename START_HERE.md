# Piritori → Eden — start here

This folder is the complete working handoff for the game. It contains the
playable browser implementation, authored Era I slice, approved source art,
optimized runtime art, map data, tests and the current design authority.

## First five minutes

From the repository root:

```bash
npm --prefix piritori run check
npm --prefix piritori run serve
```

Open `http://localhost:8080/piritori/`.

There is no build step and no generated dependency folder. The game is vanilla
HTML, CSS and ES modules, so it must be opened through the included file server
rather than by double-clicking `index.html`.

For the browser playthrough gate, install Playwright globally or in your normal
tool environment, then run:

```bash
npm --prefix piritori run check:browser
```

## Read in this order

1. `DESIGN_AUTHORITY.md` — resolves contradictions.
2. `DESIGN_LOCKS.md` — owner-approved system and content locks.
3. `GAME_DESIGN_DOCUMENT.md` — active game design.
4. `ART_BIBLE.md` — visual and production rules.
5. `UX_SPEC.md` — five modes and responsive behaviour.
6. `MAP.md` — Kallio geography and compressed graph.
7. `content/era1-slice-v1.json` — finite seven-day authored slice.
8. `art/v3/manifest.json` — only valid runtime-art ids.

`GODOT_HANDOFF.md` is the engine-port guide after the canon stack. Older brief,
prompt and exploration files are historical evidence, not authority.

## Folder map

| Path | Purpose |
|---|---|
| `index.html`, `v3.css`, `js/v3/` | current playable v3.1 browser slice |
| `content/` | encounters, crew, missions, market, battles, news and validator |
| `map/` | twelve-anchor Era I graph, structural SVG and validator |
| `art-library/` | approved/semi-approved source assets and production contracts |
| `art/v3/` | optimized registered runtime derivatives |
| `test/` | state, battle, contract and browser playthrough gates |
| `../flow-core/` | neutral city graph, routes, time and movement shared with Toko Move |
| `tools/` | local project check and static server |

## Art rules that prevent pipeline failure

- Runtime code resolves stable ids from `art/v3/manifest.json`; it does not
  guess filenames or load review sheets directly.
- Source PNG/SVG files stay in `art-library/`; web-ready derivatives stay in
  `art/v3/`.
- `art-library/archive/needs-rework/` is provenance only and may never become a
  runtime dependency.
- Approved does not mean fully separated. Toko v02 is an explicit flattened
  prototype exception with live text and controls overlaid by the runtime.
- Courtyard and weather art remain visibly semi-approved.

## Current playable scope

- seven days, Day and Night blocks;
- full compressed Kallio map with eight active anchors;
- fourteen authored encounters;
- Piritori purchase-to-first-profit opening;
- Toko, Jaska, McCormicks, staffed bank and restaurant-front scenes;
- one product, five offers, debt and old-markka conversion;
- six recruitable adults and modular art;
- one information-avoidable 2v2 and one consequential 3v3;
- scheduled sourced Arvo bulletin;
- four Pasila-reachability outcomes.

Era II is phase-gated. Do not start 2024–2025 content until Era I is feature
complete and the owner opens that phase.

## Before committing

Run `npm --prefix piritori run check`. If a runtime module changes, bump its one
and only `?v=` token. Do not add a bundler or copy adult Piritori data into the
neutral `flow-core/` or Toko Move adapter.
