# Hub release: Act I city v4.67 (the families keep books)

- **Source:** `mbace1/piritori-eden` @ `cb98a3f`, CI `gates` green (run 888). That is web v4.67 plus its Godot port.
- **Site:** `mbace1/Suds-Jack` gh-pages `d2600017`, `piritori/`. 230 staged files; two are new (`content/families-v1.json`, `js/v3/standing.js`).
- **What players get:**
  - Each family has a standing ladder, from Friendly to Vendetta, shown on a card in the ledger.
  - Their jobs close at Wary or worse, and come first at Friendly.
  - Nights settle the books: a bill when they are Insulted; a warning, then retaliation, when they are Retaliating (pay, fight or be robbed); every night at Vendetta.
- **Catalogue:** the note moves to v4.67 in en, fi and ja, and `versions.json` piritori goes from 4.66 to 4.67 (by hand). The token cascade: games 128, shell 91, hub 132, hub-entry 55. AnotherHUB was synced. fighter-test kept the site's token (459 → 460). Nothing was deleted.
- **Verified on the site tree at /Suds-Jack/:**
  - Arcade → Play → `?v=467` → the opening, to €183.
  - On a phone: 10 clues, a door block, Aatami in a one-hire door fight, and two family cards in the ledger. No overflow and no failed requests.
- **Known issue (Godot, not the web):** the Godot phone layout overflows at about 410px wide. Its top bar asks for about 506px, and the case board already ran past the edge before v4.67. It needs a layout pass.
- **Not verified:** the public github.io URL (blocked by this session's network policy), owner acceptance on a device, and a Godot visual capture.
