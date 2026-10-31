# Hub release: Act I city v4.90 (v4.89 and v4.90: a getaway carries something, and blows can miss)

- **Source:** `mbace1/piritori-eden` @ `a2b5613`, web only.
  - **Gates were green:** run 1107, all nine jobs.
  - v4.89 (`4c32bcc`) was never shipped on its own; it ships here inside v4.90.
- **Site:** `mbace1/Suds-Jack` gh-pages `4a56ef12`, under `piritori/`. **Pages run 1596 succeeded.**
  - Nothing was deleted. `release.json` holds 308 files, and 60 site files changed.
- **What players get** (ROADMAP milestone 2, G1):
  - **v4.89, a getaway is out with something.** One of the crew carries the take and moves 3 tiles instead of 4. It is never Aatami. The brief, the status line ("REIJO CARRIES IT") and the crew card say so.
  - **v4.90, blows can miss** (owner, 2026-10-31: *"Blows can miss, of course"*):
    - in an Act I fight a bat or a knife lands 70%, and the handgun keeps its 90%;
    - every fight rolls its own dice, seeded from the outing, so a reload replays the same rolls.
- **Before and after**, `web/tools/fight-balance.mjs`, Act I's 15 fights × 12 seeds (rows 1–7 at heat 0 and 2):

| # | Measure | v4.88 (live) | v4.90 | Target |
|---|---|---|---|---|
| 1 | Fight jobs, careless: won | 100% | **75%** ✓ | 60–75% |
| 2 | … rounds | 2.4 | 2.8 | 4–6 |
| 3 | … crew HP lost | 2.9 | **3.8** ✓ | 2–4 |
| 4 | … someone goes down | 27% | 37% | 20–30% |
| 5 | Careful over careless | +0 pts | +5 pts | +15 pts |
| 6 | Getaways, straight out | 100% | 76% | under 50% |
| 7 | Getaways, escort the carrier | 100% | **100%** ✓ | 70%+ |
| 8 | Police arrive, heat 0 | 0% | **9%** ✓ | under 20% |
| 9 | Police arrive, heat 3 | 33% | 32% | over 50% |

  - 19 of the 22 fight-and-heat combinations now end differently on different seeds; before, each was all or nothing.
  - Tried and cut: a carrier at 2 tiles; rival lanes over the crew's columns (each made a getaway nobody could win); a brace that also made the fighter harder to hit (bracing spends rounds, and rounds bring the police).
- **Catalogue:**
  - The note moves to v4.90 in en, fi and ja. `versions.json` piritori goes 4.88 → 4.90 by hand.
  - The token cascade ran from `hub/games.js` (`hub/shell.js` v=178), and `sw.js` `VERSION` went 206 → 207. `sw-shell --check` agrees.
- **Verified locally:**
  - **On the repo tree:**
    - all 26 bare-node suites, at v4.89 and again at v4.90;
    - `outing-browser`: 66 at both;
    - `play-card`: 29 at both;
    - `crew-run-browser`: every view at both;
    - `doors-browser`: 52 at v4.90.
  - **`crew-gamepad`** passed twice alone at v4.89. At v4.90 it failed at the same step each time: the press after deploying, while the 3D fight builds, past a 10 s wait. With a 60 s wait it passed, and the whole run took 62 s. CI ran it green on this commit. The receipt commit raises that wait to 30 s, and it passes with it.
  - **On the staged site tree, before the push:**
    - the site check: 8 of 8;
    - playtest links: 29;
    - mission: 32;
    - doors: 52;
    - road: 42;
    - outing: 66.
  - **Restaged once.** The full run above was on gh-pages `47326df4`. Before the push, Toko Drop 2 v74 landed (`4120b5f3`); its cascade moved `hub/shell.js` to 177 on two piritori pages and touched no cabinet code. Restaged on it, the site check (8 of 8) and the playtest links (29) passed again before the push.
- **Not verified:**
  - the public github.io URL;
  - **owner played: pending.**
- **Deploys never merge.** The cabinet was staged on a fresh gh-pages tip (`4120b5f3`, Toko Drop 2 v74).
