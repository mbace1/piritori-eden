# Hub release: Act I city v4.59 (with v4.57 and v4.58)

- **Source:** `mbace1/piritori-eden` @ `3dba9f6`. CI `gates` is green on it (run 849); v4.59 (847) and the capture fix (848) are green too.
- **Site:** `mbace1/Suds-Jack` gh-pages @ `e7f74037`, `piritori/`. `release.json` holds a SHA-256 for every staged file.
- **What players get:**
  - v4.57: one lit next step at every moment, and money that moves (+€ / −€).
  - v4.58: the road. Events come every third or fourth journey from story block 2. They are a surprise, cost a bit of time and start with low-end hustle.
  - v4.59: synthesised sound with one mute switch, and the arrival: the 3 tram pulls into Piritori. Landscape phones no longer scroll sideways.
- **Catalogue:** the note moves to v4.59 in en, fi and ja, and `versions.json` piritori goes from 4.56 to 4.59 (one row, edited by hand). games.js changed, so its token cascaded: games 115, shell 78, hub 119, hub-entry 42. AnotherHUB was synced by hand and matches the root page. fighter-test.html kept the site's own token and was bumped by the cascade (452 → 453). Nothing was deleted.
- **Rebuilt, not rebased:** gh-pages moved during the release (Pajatso v4, bd11ce79). The deploy was redone on top of it rather than rebased through the other lane's token cascade.
- **Verified on the site tree, served at /Suds-Jack/:**
  - Arcade card → Play → `?v=459` → the arrival shown, SKIP → sound running → the opening played through travel to €183, with no failed requests.
  - On a phone, a forced fourth journey opened "Three stops, fifteen euros": 9 road events loaded, no horizontal overflow.
- **Not verified here:** the public URL (github.io is blocked by this session's network policy), and owner acceptance on a real device.
