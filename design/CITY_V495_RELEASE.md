# Hub release: Act I city v4.95 (v4.93–v4.95: a won fight takes the fallen's weapons, a hot place brings the police sooner, and the yard faces the next block)

- **Source:** `mbace1/piritori-eden` @ `c127516`, web only.
  - **Gates were green:** run 1117, all nine jobs. v4.94 (`3fb0b95`) was green on its own in run 1116.
  - v4.93 (`9f6e8e1`) and v4.94 were never shipped on their own; they ship here inside v4.95.
- **Site:** `mbace1/Suds-Jack` gh-pages `2380ff8c`, under `piritori/`. **Pages run 1610 succeeded.**
  - Nothing was deleted. `release.json` holds 308 files, and 61 site files changed.
- **What players get** (owner, 2026-11-01: *"Continue"*, on the pitch that ordered these):
  - **v4.93, a won fight takes the fallen's weapons** (ROADMAP G2).
    - A win takes the weapon of every rival you put down. Whoever ran keeps theirs, and a phone is not a weapon.
    - The weapons go in the stash, and the fence on Piritori buys them. The strip after the fight says so.
    - **Why it matters:** fence money is the only money the chapter's €400 goal counts. What the story hands you fences for €155 at most, so from v4.74 the shipment was out of reach in ordinary play. A won fight now adds €25–100. The gate is part of the finale question (ROADMAP §8, item 7).
      - **Correction, 2026-11-07 (v4.97):** that is wrong. Market sales and packs sent down a route count too, so the shipment was never out of reach. The chapter panel said the same wrong thing to players; v4.97 fixes it.
  - **v4.94, a place at its hottest is a round from the police** (ROADMAP G1, row 9). A place at pressure 3 starts the fight at 5 of 6, and the brief says so.
  - **v4.95, the yard faces the next block across a lane** (ROADMAP milestone 3). From the yard's opening camera, the left of the frame is lit windows where it was black. `design/YARD_LANE.jpg` is the before and after.
- **G1, measured** (`web/tools/fight-balance.mjs`, Act I's 15 fights × 12 seeds):

| # | Measure | v4.92 (live) | v4.95 | Target |
|---|---|---|---|---|
| 1–8 | (unchanged) | | identical | |
| 9 | Police arrive, heat 3 | 32% | **53%** ✓ | over 50% |

  - Rows 1–8 are identical because they are measured at heat 0 and 2, which do not move.
  - The other levers were measured and not shipped (VERSIONS v4.94 has the table). Longer fights hurt careful play more than careless play, so row 5 (careful play paying) needs a design change, not a number.
- **Catalogue:**
  - The note moves to v4.95 in en, fi and ja. `versions.json` piritori goes 4.92 → 4.95 by hand.
  - The token cascade ran from `hub/games.js` (`hub/shell.js` v=190), and `sw.js` `VERSION` went 218 → 219. `sw-shell --check` agrees.
- **Verified locally:**
  - **On the repo tree:**
    - all 34 bare-node suites, at each of v4.93, v4.94 and v4.95;
    - `outing-browser`: 69 at v4.93 and again at v4.94 (the police scenario re-routed for the hot place);
    - `night-places-browser`: green at v4.95, four layouts × five places;
    - `level-layout`: 1797 at v4.95.
  - **On the staged site tree, before the push:**
    - the site check: 8 of 8;
    - playtest links: 29;
    - mission: 32;
    - doors: 52;
    - road: 42;
    - outing: 69.
- **Not verified:**
  - the public github.io URL;
  - **owner played: pending.**
  - **Restaged once.** The full run above was on gh-pages `decaed34` (Toko Drop 2 v97). Before the push, Toko Move v2.69 landed (`943e1d73`). Restaged on it, the site check (8 of 8) and the playtest links (29) passed again before the push.
- **Deploys never merge.** The cabinet was staged on a fresh gh-pages tip (`943e1d73`, Toko Move v2.69).
