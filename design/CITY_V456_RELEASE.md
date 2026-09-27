# Act I city v4.56 — hub release receipt (Lantern Noir)

Date: 2026-09-27 · same procedure as [CITY_V454_RELEASE.md](CITY_V454_RELEASE.md) · owner: "Yes and continue to polish the high level experience"

| | |
|---|---|
| Source | `mbace1/piritori-eden` `main` @ `40d3040` (v4.56 at `54d91b7`, plus the owner-answers record) |
| Source CI | [gates 36271506569](https://github.com/mbace1/piritori-eden/actions/runs/36271506569) on `54d91b7`, all green, including the new `readability.cjs` (50) |
| Hub commit | `mbace1/Suds-Jack` `gh-pages` `a95396e1` |
| Route | hub card `piritori` → `piritori/act1.html` → `piritori/?v=456` |
| Previous | v4.55 (`f7dad2ce`) |

## What changed in the cabinet

- **New files:** `lantern.css` and `fonts/`, which holds 16 WOFF2 files plus their OFL licences.
- **Changed:** `index.html`, `js/v3/app.js`, `act1.html` and `VERSIONS.md`.
- **Unchanged:** `v3.css`.
- `release.json` records the commit and a SHA-256 per file. The page keeps the site's own `fighter-test.html?v=` number.

**Site side:**

- The catalogue note changed v4.55 → v4.56 in en/fi/ja.
- One `versions.json` row changed by hand.
- Token cascade:
  - `games.js?v=112`;
  - `hub.js` 116;
  - `hub-entry.js` 39;
  - `shell.js?v=75` on every page.
- `AnotherHUB/` is identical to the root page apart from its `<base>`.
- No file was deleted.

## Evidence (the final gh-pages tree, served locally, real hub shell)

- The arcade card → Play → `?v=456`, and the header reads **ACT I · v4.56**.
- The opening plays through travel to €183, with no page errors.
- The header is clean at 320/360/390/430/1280px: nothing covered, nothing clipped.

## Not verified

- The public URL, from this session (the network policy refuses `mbace1.github.io`).
- Device and owner acceptance. The owner's word on the look was "looks good for now".
