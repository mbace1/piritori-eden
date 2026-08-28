# legacy — the flow prototype, genuinely parked

**Nothing in this folder is live**, and unlike the last time that sentence was
written here, it is now true of everything that is left.

The browser build that used to live here **was promoted to `../web/` on
2026-08-25** and is the primary tester build again — see `../PORTING.md`. This
folder keeps only the lineage that really is dead.

## What is in here

| Path | What it was |
|---|---|
| `js/main.js`, `js/fight.js`, `js/market.js` | the city-flow prototype |
| `js/fightview.js`, `js/heat.js`, `js/narrative.js`, `js/palette.js` | its supporting modules |
| `test/fight.mjs`, `test/market.mjs` | its gates |
| `explorations/` | the trading prototype that preceded all of it |

## Why it cannot be revived as-is

It imports **`../flow-core/`**, the neutral engine shared with Toko Move, which
lives in the **Suds-Jack** repository and did not come across in the split. See
`../SHARED_ENGINE.md`. That is a real dependency on another tree, not a broken
path — which is the difference between this folder and the one that moved out.

Its ideas are not dead: the heat model fed `market/model.mjs`'s `exposure()`,
and the city-flow reading is still what `MAP.md` describes.
