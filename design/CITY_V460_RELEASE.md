# Hub release: Act I city v4.60

- **Source:** `mbace1/piritori-eden` @ `e5027f3`, CI `gates` green (run 854; v4.60 alone, 853, is green too). It includes the merged Godot port of v4.56–v4.57.
- **Site:** `mbace1/Suds-Jack` gh-pages @ `34480b9a`, `piritori/`. `release.json` holds a SHA-256 for every staged file.
- **What players get:**
  - Tokon Ramen, Toko's shop, at Piritori and open from day one. It is the first shop: gear, the fence, and one line from Toko a block.
  - A Kallio noir arrival: grime, the flickering sign, the man in the fur hat, and the €75 due on day 4.
  - 19 road events, 10 of them new, with weird people and mystery threads.
- **Catalogue:** the note moves to v4.60 in en, fi and ja, and `versions.json` piritori goes from 4.59 to 4.60 (one row, edited by hand). The token cascade: games 116, shell 79, hub 120, hub-entry 42 → 43. AnotherHUB was synced by hand. fighter-test.html kept the site's own token (453 → 454 through the cascade). Nothing was deleted.
- **Verified on the site tree, served at /Suds-Jack/:**
  - Arcade card → Play → `?v=460` → arrival, SKIP → sound → the opening played through to €183, with no failed requests.
  - On a phone, the Tokon Ramen counter opens with Toko's line, 19 road events load, and there is no horizontal overflow.
- **Not verified here:** the public URL (github.io is blocked by this session's network policy), and owner acceptance on a device.
