# Hub release: Act I city v4.61

- **Source:** `mbace1/piritori-eden` @ `d337b58`, CI `gates` green (run 858; 843dacf, run 857, is green too).
- **Site:** `mbace1/Suds-Jack` gh-pages @ `64f59b13`, `piritori/`. `release.json` holds a SHA-256 for every staged file.
- **What players get:**
  - Tokon Ramen is back on Vaasankatu and open from day one.
  - A €6 bowl buys what Toko heard, a price range shown on the board as "Toko, N blocks ago". He also sells early weapons.
  - The Piritori street seller keeps the gear, the fence and the first handgun.
- **Catalogue:** the note moves to v4.61 in en, fi and ja, and `versions.json` piritori goes from 4.60 to 4.61 (one row, edited by hand). The token cascade: games 119, shell 82, hub 123, hub-entry 46. AnotherHUB was synced by hand. fighter-test.html kept the site's own token (454 → 455 through the cascade). Nothing was deleted.
- **Rebuilt, not rebased:** gh-pages moved during the release (Pajatso v5, Flash Prince v71, Powder v11, Toko). The deploy was redone on top of it.
- **Verified on the site tree, served at /Suds-Jack/:**
  - Arcade → Play → `?v=461` → arrival, SKIP → sound → the opening played through to €183, with no failed requests.
  - On a phone: the street seller is at Piritori; after travelling to Vaasankatu, Toko's counter shows 5 early weapons and a bowl names Mäkelänsilta with a range. No overflow.
- **Not verified here:** the public URL (github.io is blocked by this session's network policy), and owner acceptance on a device.
