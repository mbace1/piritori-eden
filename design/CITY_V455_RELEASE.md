# Act I city v4.55 — hub release receipt

Date: 2026-09-26 · same procedure as [CITY_V454_RELEASE.md](CITY_V454_RELEASE.md)

| | |
|---|---|
| Source | `mbace1/piritori-eden` `main` @ `0f2f570` — Act I v4.55: the header fits from 320px to desktop |
| Source CI | [gates 36251401117](https://github.com/mbace1/piritori-eden/actions/runs/36251401117) on `ed9a221` and [36251442722](https://github.com/mbace1/piritori-eden/actions/runs/36251442722) on `0f2f570`, both green; `header-fit.cjs` (42) runs in the Act I job |
| Hub commit | `mbace1/Suds-Jack` `gh-pages` `f7dad2ce` — *Deploy Piritori Act I v4.55 — the header fits, from 320px to desktop* |
| Route | hub card `piritori` → `piritori/act1.html` → `piritori/?v=455` |
| Previous | Act I v4.54 (`1216c3c1`) |

## What changed in the cabinet

Only five cabinet files changed against the live one: `v3.css`, `index.html`, `js/v3/app.js`, `act1.html` and `VERSIONS.md`. `release.json` records the commit and a SHA-256 per file.

The page keeps the site's own `fighter-test.html?v=` number. The fresh stage carried the source's 449, which would have moved the site backwards from 450. After that, the site cascade moved it to 451 together with the shell.

Site side:

- The catalogue note changed v4.54 → v4.55 in en/fi/ja, spliced into the site's `games.js`.
- One `versions.json` row changed by hand.
- Token cascade: `games.js?v=109`, `hub.js` 112, `hub-entry.js` 36, and `shell.js?v=72` on every page.
- `AnotherHUB/` stays identical to the root page apart from its `<base>`, and `sw.js` has the new tokens.
- No file was deleted.

## Evidence (the final gh-pages tree, served locally, real hub shell mounted)

- The arcade card → Play → `?v=455`, and the header reads **ACT I · v4.55**.
- The opening plays through travel to €183 at Siltasaari, with no page errors.
- At 320/360/390/430/1280px:
  - the shell's floating HUB button is hidden;
  - nothing in the header is covered;
  - no resource label or value clips;
  - the wordmark clears the day card;
  - there is no horizontal scroll.

## Not verified

- The public URL, from this session: the environment's network policy refuses `mbace1.github.io`.
- Physical-device and owner acceptance.
