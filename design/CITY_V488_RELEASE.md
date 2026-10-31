# Hub release: Act I city v4.88 (fights cost something)

- **Source:** `mbace1/piritori-eden` @ `85910e0`, web only. That is v4.88 (`2efa7c9`) plus a test-only fix that gives `opening.cjs` a two-minute navigation limit.
  - **Gates were green:** run 1105, all nine jobs. Run 1104, on `2efa7c9`, was superseded and cancelled.
  - The fix is there because run 1101, on the v4.87 receipt commit (docs only), failed in `opening.cjs`. The `page.goto` timed out at 30 s on the software renderer's WebGL teardown, the same fault the v4.87 doors check hit.
- **Site:** `mbace1/Suds-Jack` gh-pages `913bee29`, under `piritori/`. **Pages run 1589 succeeded.**
  - Nothing was deleted. `release.json` holds 308 files, and 57 site files changed.
- **What players get** (ROADMAP milestone 2, G1 levers 2 and 3; owner: *"Find a lane and work"*):
  - **They break later:** at two-thirds of their weight down, not half. Putting the tough one down no longer ends the fight.
  - **Every blow lands one harder.**
  - **The police come at pressure 6**, not 5. The brief and the pressure line say so.
- **Before and after**, `web/tools/fight-balance.mjs`, Act I's 15 fights × 12 seeds:

| # | Measure | v4.87 | v4.88 | Target |
|---|---|---|---|---|
| 1 | Fight jobs, careless: won | 95% | 100% | 60–75% |
| 2 | … rounds | 2.1 | 2.4 | 4–6 |
| 3 | … crew HP lost | 1.1 | **2.9** | 2–4 ✓ |
| 4 | … someone goes down | 0% | **27%** | 20–30% ✓ |
| 5 | Careful over careless | +5 pts | +0 pts | +15 pts |
| 6 | Getaways, straight out: won | 88% | 100% | under 50% |
| 7 | Getaways, careful | 100% | 100% | 70%+ at a cost |
| 8 | Police arrive, heat 0 | 0% | 0% | under 20% ✓ |
| 9 | Police arrive, heat 3 | 3 of 15 | 5 of 15 | over 50% |

  - Rows 3, 4 and 8 are on target. Rows 1, 5 and 7 cannot move by tuning numbers alone: every fight is deterministic, and careful play spends rounds that bring the police. That is the open design question in ROADMAP §8, item 6.
- **Catalogue:**
  - The note moves to v4.88 in en, fi and ja. `versions.json` piritori goes 4.87 → 4.88 by hand.
  - The token cascade ran from `hub/games.js` (v=208, `hub/shell.js` v=171), and `sw.js` `VERSION` went 199 → 200. `sw-shell --check` agrees.
- **Verified locally:**
  - **On the repo tree:**
    - all 26 bare-node suites;
    - `outing-browser`: 66;
    - `doors-browser`: 52, now with a two-minute navigation limit;
    - `opening`: 56;
    - `crew-run-browser`: all views;
    - `crew-gamepad`: all checks.
    - Crew-run and gamepad timed out once when four browsers shared the software renderer (0.2 fps). Each passed when run on its own.
  - **On the staged site tree, before the push:**
    - the site check: 8 of 8;
    - playtest links: 29;
    - mission: 32;
    - doors: 52;
    - road: 42;
    - outing: 66.
- **Not verified:**
  - the public github.io URL;
  - **owner played: pending.**
- **Deploys never merge.** The cabinet was staged on a fresh gh-pages tip (`b98844a9`, Toko Drop 2 v68).
