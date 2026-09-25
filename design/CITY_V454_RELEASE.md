# Act I city v4.54 — hub release receipt

Date: 2026-09-25 · procedure: [HUB_RELEASE.md](HUB_RELEASE.md) (the city part; the lab has its own tool)

| | |
|---|---|
| Source | `mbace1/piritori-eden` `main` @ `cfefd81` (Act I v4.54: PR #92's fighter repair, M1 inspection, M2 journeys, the mid-battle save fix) |
| Source CI | [gates 36146283528](https://github.com/mbace1/piritori-eden/actions/runs/36146283528), all 8 jobs green |
| Hub commit | `mbace1/Suds-Jack` `gh-pages` `1216c3c1` — *Deploy Piritori Act I v4.54 — look before you go, travel yourself* |
| Pages | run `36148631977` on `1216c3c1` was **cancelled**, superseded by the next push (`9e3a583a`, Radio Free); run [36148823448](https://github.com/mbace1/Suds-Jack/actions/runs/36148823448) on `9e3a583a`, which contains `1216c3c1`, **succeeded** |
| Route | hub card `piritori` → `piritori/act1.html` → `piritori/?v=454` |
| Previous | Act I v4.48 (`fc8a5e98`) |

## How it was staged

This is a scripted copy, not a hand-copy. `git archive cfefd81` gives the byte-exact source. The only edits are the ones the cabinet's flatter layout needs:

- `'../../../'` becomes `'../../'` in `js/v3`;
- `ART_BASE` becomes `art/v3`;
- the site's own `../hub/shell.js?v=` token.

Art is what the previous cabinet already carried, refreshed from source, plus the F01/F02 v02 pair the splash's F01 / F02 TEST page loads. Nothing was removed.

`piritori/release.json` records the commit and a SHA-256 per file. `siteEdits` names the two files the site's token cascade touched afterwards (`index.html`, `fighter-test.html`).

On the site side:

- The catalogue note was **spliced** into the site's `games.js` in en/fi/ja.
- One `versions.json` row changed by hand (4.48 → 4.54).
- Token cascade: `games.js?v=108`, `hub.js` 111, `hub-entry.js` 35, and `shell.js?v=71` on every page. `toko/js/project-knowledge.js` keeps its deliberate pin.
- `AnotherHUB/` is kept identical to the root page apart from its `<base>`; `sw.js` was updated to the new tokens.
- One rebase over a concurrent Toko deploy took their `index.html`/`toko-live` lines and re-applied only these tokens.

## Evidence

On the staged cabinet, served with the site's real `hub/` and `toko/`:

- `m1-inspection` 70/70;
- `m2-journey` 47/47;
- `act1-scenes` passes. The staged copy of the test has its fixture's `../content`/`../map` fetches pointed at the cabinet layout; the page was not changed.
- `v3-playthrough`: 28 pass. The only failures are the two known Toko-viewport checks (QUEUE.md).

On the final gh-pages tree, served locally:

- The arcade card reads **v4.54** with the new note.
- Play goes to `act1.html`, which redirects to `?v=454`; the header reads **ACT I · v4.54**.
- Begin → buy → Continue → tap Siltasaari → TRAVEL HERE → TRAVEL → sell ends at €183 at Siltasaari, with no page errors.
- `hub-smoke.cjs` (main's copy, run on the site tree) shows the same 9 failures before and after the deploy. They are pre-existing mismatches between main's test and the site tree.

## Not verified

- **The public URL was not loaded from this session**: the environment's network policy refuses `mbace1.github.io`. Pages reports success on a commit containing this deploy; a play check at `https://mbace1.github.io/Suds-Jack/#piritori` is still owed.
- Physical-device and owner acceptance.
