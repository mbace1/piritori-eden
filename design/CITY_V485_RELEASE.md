# Hub release: Act I city v4.85 (v4.80–v4.85 in one deploy: the playtest links, Aatami in chapter 1, rivals that press, a meeting on one screen)

- **Source:** `mbace1/piritori-eden` @ `5f3543a`, web only.
  - **Gates were green:** run 1080, all nine jobs.
  - **Six releases in one deploy.** Three lanes (two Claude sessions and Codex) merged v4.80–v4.85 to main between 25 and 28 October, and none of them was put on the hub. The hub was still on v4.79, so the G0 playtest links could not be played on a phone. This deploy ships all six as they stand on main.
- **Site:** `mbace1/Suds-Jack` gh-pages `92c4ef4f`, under `piritori/`. **Pages run 1579 succeeded.**
  - Nothing was deleted. `release.json` holds 308 files; 18 site files were added and 73 changed.
- **What players get:**
  - **The playtest (v4.81–v4.82).** THINGS TO TEST in the pause menu leads with three links, each one tap from its fight: a door fight in the courtyard, a getaway on the quay, the Bear Path. Your own campaign is set aside and given back.
  - **Characters talk as cut-ins (v4.80):** Jaska at the Scene Club, and Aatami.
  - **Aatami fights all of chapter 1 (v4.83).** Answer 26: he steps back after chapter 1, once three of his own can fight. Older saves that had stepped him back early are corrected.
  - **Blocked rivals press on (v4.84).** A rival whose route is blocked walks as far as it can and strikes if its target is still in reach, instead of dropping the plan.
  - **A meeting's decision is on the first screen (v4.85, the UI diet, step 1).**
  - City memory names encounters without internal ids (v4.82).
- **The fights, measured.** `fight-balance.mjs` (with #117's heat 3 and downed share), 12 seeds:

  | Measure | v4.79 | v4.85 | Target (ROADMAP §5) |
  |---|---|---|---|
  | Fight jobs, careless: won | 95% | 95.5% | 60–75% |
  | rounds | 2.1 | 2.1 | 4–6 |
  | crew HP lost | 0.1 | 1.1 | 2–4 |
  | someone down | 0% | 0% | 20–30% |
  | Getaways, straight out: won | 100% | 87.5% | under 50% |
  | Police, heat 3 | 1 of 15 | 3 of 15 | over 50% |

  The fights are still far too easy. This release does not claim otherwise.
- **Catalogue:**
  - The note moves to v4.85 in en, fi and ja. `versions.json` piritori goes 4.79 → 4.85 by hand.
  - The token cascade ran from `hub/games.js` (v=198, `hub/shell.js` v=161), and `sw.js` `VERSION` went 189 → 190. `sw-shell --check` agrees.
- **Verified on the staged site tree, before the push:**
  - the site check: 8 of 8;
  - the playtest links against `/piritori/`: 29;
  - mission battles: 32;
  - doors: 52;
  - road: 42;
  - outing: 66.
- **Not verified:**
  - the public github.io URL, which this session's network policy blocks;
  - **owner played: pending.** G0 is the owner's Pixel run of the three links.
- **Deploys never merge.** The cabinet was staged on a fresh gh-pages tip (`6ebc96bd`).
