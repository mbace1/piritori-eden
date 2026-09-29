# Hub release: Act I city v4.65 (a ten-day chapter, doors, fights every day)

- **Source:** `mbace1/piritori-eden` @ `bfaa104`, CI `gates` green (run 878). It carries web v4.64 (the chapter turn) and v4.65 (H1 + H2, escalation), both ported to Godot.
- **Site:** `mbace1/Suds-Jack` gh-pages `6d0c4aa6`, `piritori/`. 228 staged files; three are new (`content/doors-v1.json`, `js/v3/doors.js`, `js/v3/chapter.js`). `stage_city.py` now reads door and encounter scene art off canon, so a new door's scene cannot be left behind.
- **What players get:**
  - **Chapter 1 runs ten days.** Days 8–10 add three story beats: Kello's reckoning, the families' books, and the shipment on day 10's night. The other three blocks of those days are doors: 2–3 jobs, pinned on the map.
  - **Fights.** Fights happen every day, at most two. Nine doors can become a fight, and ten bad deals can go bad.
  - **Pasila.** Day 7 no longer ends the game. Chapter 1 closes on "to be continued", with *Into chapter 2* and *Where this road points*.
- **Catalogue:** the note moves to v4.65 in en, fi and ja, and `versions.json` piritori goes from 4.63 to 4.65 (v4.64 was never deployed on its own). The token cascade: games 125, shell 88, hub 129, hub-entry 52. AnotherHUB was synced. fighter-test kept the site's token (457 → 458). Nothing was deleted.
- **Verified on the site tree at /Suds-Jack/:**
  - Arcade → Play → `?v=465` → arrival → sound → the opening, to €183. No errors.
  - On a phone, the ledger shows 4 mission briefings and 10 clues. No overflow.
  - On a phone, three door blocks: at Harju, Sörnäinen and Hakaniemi. On each, the board shows, the door is taken, and its scene art loads, with three briefed steps. No failed requests.
- **Not verified:** the public github.io URL (blocked by this session's network policy), owner acceptance on a device, and a Godot visual capture.
