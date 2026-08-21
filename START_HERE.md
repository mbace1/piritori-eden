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

## Publishing to GitHub

Development happens on a PC and **the GitHub side is part of the job, not a
separate step.** `DESIGN_AUTHORITY.md` § Direct publishing workflow gives the
policy — one owner, one active agent, no waiting on a PR merge. This is the
procedure.

**Source work.** Commit to `main` and push it. Every milestone, document-only
or not, belongs on the remote the same day it is made — an agent's machine is
not a backup and a milestone nobody else can see is a milestone that has to be
described instead of read.

```bash
git pull --rebase origin main && git push origin main
```

**A playable milestone** additionally goes to `gh-pages`, which is the live
arcade at `/Suds-Jack/piritori/`. It is a copy in one direction; deploys never
merge.

```bash
git worktree add /tmp/ghp origin/gh-pages --detach

# 1. replace the folder outright — do NOT ship test/, art-src/ or explorations/,
#    and never the repo-root assets/ build directory
rm -rf /tmp/ghp/piritori && mkdir -p /tmp/ghp/piritori
tar -cf - --exclude=test --exclude=art-src --exclude=explorations -C piritori . \
  | tar -xf - -C /tmp/ghp/piritori

# 2. flow-core too, if it changed — it is shared with Toko Move
tar -cf - --exclude=test --exclude=tools -C flow-core . | tar -xf - -C /tmp/ghp/flow-core

# 3. the HOME button token is the SITE'S, not this branch's
grep -o 'hub/shell.js?v=[0-9]*' /tmp/ghp/flashprince/index.html
sed -i 's|hub/shell.js?v=NN|hub/shell.js?v=<what that printed>|' /tmp/ghp/piritori/index.html

# 4. verify against THAT tree — serve /tmp/ghp and open the cabinet — then push
cd /tmp/ghp && git add -A && git commit && git push origin HEAD:gh-pages
```

Four rules that have each cost a session:

1. **`hub/versions.json` is edited by hand, for this game only.** Do not run
   `scripts/versions.mjs` over the site: it currently disagrees with the
   committed file about eight cabinets, wants to move most of them *down*
   (hyperdagger 31→25, dropcabal 3→2) and wants to delete `kindling` outright.
2. **`hub/games.js` belongs to the site.** Edit the `piritori` entry's `note`
   and `controls` in place. The file lists cabinets that exist only on
   `gh-pages`; overwriting it deletes them.
3. **One `?v=` token per FILE, bumped when that file's bytes change.** A blanket
   `sed` on `palette.js?v=1` hits nine files across this repo, because half the
   games have a module by that name. Same token with different bytes is a
   browser serving the old file out of cache forever.
4. **Verify against the deployed tree, not against `main`.** Serve the worktree
   and load the cabinet: zero console errors, zero 404s, the HOME button
   present, and the game actually reaching its first screen.

`github.io` is blocked outbound from the sandboxed agent environments, so the
live URL cannot be curled from there. Serving the `gh-pages` worktree locally is
the check; confirming the real URL is the owner's.

**Leaving the tree clean.** When a version replaces the runtime rather than
extending it, the superseded files go too. `main` still carries the v2 runtime
(`js/fight.js`, `js/fightview.js`, `js/heat.js`, `js/main.js`, `js/market.js`,
`js/narrative.js`, `js/palette.js`, and `art/arenas|fig|props|rooms/`) which the
site no longer serves — the v3 deploy correctly dropped them. Delete them or
park them explicitly the way `sudsjack/` is parked; an orphan that still parses
is the one somebody edits by mistake.
