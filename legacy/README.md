# legacy — the browser prototype, parked

**Nothing in this folder is live.** It is kept the way `sudsjack/` is kept in
the Suds-Jack repo: as the record of a lineage that taught the design, not as
code anybody should extend.

Parked 2026-08-21, when the Godot port at `../godot/` became the build.

## What is in here

| Path | What it was |
|---|---|
| `index.html`, `v3.css`, `js/v3/` | the v3.1 browser slice — the last playable JS build |
| `js/*.js` (not `v3/`) | the older v2 runtime, already superseded before the split |
| `test/` | the JS runtime's own gates |
| `tools/` | its no-build local runner and validator |
| `package.json` | npm scripts for the above |
| `explorations/trading-prototype` | an early trading sketch |

## Why it is parked rather than deleted

Deleting it would take the evidence with it. Several decisions now recorded in
`../DESIGN_AUTHORITY.md` and `../GAME_DESIGN_DOCUMENT.md` were made by building
this and watching it fail — the market table that was more interesting than the
map, the encounters that were clicked through for rewards. The documents state
the conclusions; this is the working that produced them.

## It does not run here

`index.html` loads `../hub/shell.js` — the Suds-Jack arcade's HOME button, which
lived one level above `piritori/` in the monorepo. That path does not exist in
this repository, so the page is broken by construction as well as by intent.

That is deliberate. An orphan that still runs is the one somebody edits by
mistake.

## The canon it read is still live

`content/`, `map/`, `art/` and the design documents did **not** move in here.
They are shared: the Godot build syncs from exactly those files through
`godot/tools/sync-data.mjs`. This folder is the only part that was superseded.
