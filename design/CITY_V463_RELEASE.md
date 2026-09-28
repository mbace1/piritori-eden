# Hub release: Act I city v4.63 (Kello's cut, the network roads)

- **Source:** `mbace1/piritori-eden` @ `683e0c9`, CI `gates` green (run 866). This commit also merges the Godot port of v4.58–v4.62. The Godot gates all pass: spine 264, locale 21, shell 237, battle 292, battle_ui 29, playthrough 72, story 139.
- **Site:** `mbace1/Suds-Jack` gh-pages `805e996f`, `piritori/`. Staged byte-exact with `release.json` hashes; 225 files, no new paths.
- **What players get:**
  - Kello's cut pays €30 at each night's settlement.
  - From the second payment on, each payment risks a family finding out. When one does, the story raises the road event "found out", with three ways to answer it: pay, give up Kello, or stand and fight (needs a crew).
  - Five road events carry the Thursday Load through the network.
  - Two new clues, for 10 in all.
- **Catalogue:** the note moves to v4.63 in en, fi and ja, and `versions.json` piritori goes from 4.62 to 4.63 (by hand). The token cascade: games 123, shell 86, hub 127, hub-entry 50. AnotherHUB was synced. fighter-test kept the site's token (456 → 457). Nothing was deleted.
- **Verified on the site tree at /Suds-Jack/:**
  - Arcade → Play → `?v=463` → arrival → sound → the opening, to €183. No errors.
  - On a phone, the ledger shows 4 mission briefings and 10 clues. No overflow.
- **Not verified:** the public github.io URL (blocked by this session's network policy), and owner acceptance on a device.
- **Still to do:** the Godot port of v4.63 (the cut, the triggered event, the 2 new clues).
