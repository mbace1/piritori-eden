# Piritori → Eden — versions

> **Numbers are `vMAJOR.MINOR` from v4.** The integer is a milestone, the
> decimal an increment on it — the scheme `eeri/` already uses, adopted because
> burning a whole integer on ordinary work is what makes version collisions
> easy. `?v=` module tokens stay INTEGERS; they are cache-busters tracking
> module churn, not releases, and the two numbers are deliberately different.
>
> **Every entry carries a `### Port` block.** A version is a port unit now
> (`PORTING.md` §2): the block names what the Godot side must re-port, so it
> never has to read a diff to find out.

## v4.8 — 2026-08-28

**The cast3d registration gap closed as a gate, not a rewrite.** `QUEUE.md`'s
"3D units" section had one item left unresolved from v4.6's pass: models are
registered in `art/v3/manifest.json` with real ids, but `battle_stage_3d.gd`
resolves them through hardcoded `res://` paths and never reads the
registration — decorative, not load-bearing.

- **Considered and set aside**: making `UNIT_BY_ROLE` resolve through
  `ContentRegistry.art` at runtime. GDScript `const` must be a compile-time
  literal, so this meant converting to `static var` plus static
  initialization that depends on an autoload being ready — real timing
  risk to `test_battle.gd`'s 258 passing checks, for a change whose
  rendered output is identical either way (the hardcoded paths already
  matched what's registered).
- **Done instead**: `_test_battle_stage_matches_manifest()`, new in
  `test_battle.gd` — the same discipline `godot/tools/sync-data.mjs
  --check` and the `port/vectors/` files already use elsewhere in this
  repo, applied to this one spot. Asserts `UNIT_BY_ROLE`/`UNIT_VARIANTS`
  agree with the manifest's registered `mesh-3d` roles. Verified both
  directions before trusting it: passes clean, and fails precisely when a
  hardcoded path is pointed at a real, existing file the manifest does NOT
  say for that role (the actual failure mode worth catching — a plain
  file-exists check passes on a wrong-but-real file and would have missed
  it).

### Port
- **vectors:** unchanged.
- **data:** unchanged.
- **meshes:** none.
- **presentation:** none — Godot-only, a test addition. No behavior change
  on either build.
- **status:** landed. `QUEUE.md`'s "3D units" line for this is closed.

## v4.7 — 2026-08-28

**Stances land in `web/` — the first rule ported the reverse direction, and
it found a real bug in the process.** Scoped as "stances + a minimal
scorer" after the owner picked it over a smaller, less useful proof case.

- **`web/js/v3/stance.js`** ports `FightManager.stance_weight()`
  (`fight_manager.gd:1554`) line for line, verified against a Godot-dumped
  fixture (`godot/tools/stance-dump.gd` → `port/vectors/stance.json` →
  `port/stance-vectors.mjs --check`, same reversed pattern as chrome — all
  24 (stance, command-type) pairs byte-identical).
- **`battle.js`'s `autoCommand`** now scores ATTACK/GUARD/REPOSITION instead
  of always attacking when legal. ATTACK and GUARD's base formulas are
  ported faithfully from `_score_base()` (same fractions, same constants);
  the per-role `behaviour_package` multiplier layer is deliberately NOT
  ported — player crew's `behaviour_package` there is literally their
  `role`, but three of six crew roles (driver/local/muscle) don't appear in
  that match statement at all, and reconciling the two vocabularies is its
  own investigation.
- **A real bug, found by the port and fixed by the port**: the first cut
  always took the single top-scored command. A unit whose own nerve had
  dropped (from being hit) could get permanently GUARD-locked — nerve
  falling raises GUARD's score with no ceiling on ATTACK's side, so once
  GUARD overtook ATTACK it never gave it back. A 2v2 sat at round 60 with
  neither enemy having taken real damage. Fixed by porting the OTHER half
  of `_ai_select_command()` too — weighted-random selection across the top
  3 scored commands, not the flat top pick, seeded through the house
  `rand01()` (`market/model.mjs`) rather than a second hash. `web/test/
  v3-battle.mjs`'s safety-valve cap moved 12 → 60 accordingly: the old
  number was tuned to a heuristic that always attacked by construction, and
  real stance-weighted play (default HOLD_THE_LINE, deliberately cautious)
  takes longer to resolve, not never.
- **A stance picker landed in the battle screen** — three buttons in the
  active-unit panel, wired to `selectStance()`, labelled with Godot's own
  `battle.stance_*` strings so the vocabulary matches across both builds.
  Was previously unreachable in the model with no UI at all.
- **Two unrelated, pre-existing bugs fixed along the way**, found only
  because verifying this needed the browser gate to actually run:
  `web/tools/check-project.mjs` pointed at a repo shape
  (`piritori/`/`flow-core/` as siblings) that was never built — fixed to
  the shape that shipped, and the "999 lines" a stale note already claimed
  turned out to be exactly right once mapped correctly. `web/test/
  v3-playthrough.cjs` had been dead since the 2026-08-25 `web/` promotion
  (still navigated to `/piritori/`) AND was missing `.mjs` in its MIME map,
  which would have silently broken on the very import this port needed —
  a browser refuses to execute a module served as
  `application/octet-stream`, with no error a Node-only test could ever
  have caught.

### Port
- **vectors:** new — `stance@1`, reverse direction (Godot canonical). See
  `PORTING.md` §4 for the general vector discipline; this is the first
  reverse one after chrome's.
- **data:** unchanged
- **meshes:** none
- **presentation:** the stance picker's placement/labels are `web/`'s own;
  Godot's own stance UI (`app_shell.gd` `_auto_col`) is untouched and was
  the reference the labels were read from, not rewritten to match.
- **status:** landed on `web/`. Nothing for Godot to do — it already had
  this; the port caught up to it. If `fight_manager.gd`'s
  `stance_weight()` ever changes, re-run `godot/tools/stance-dump.gd` and
  re-commit the fixture.

## v4.6 — 2026-08-28

**Every 3D battle stage was always the Kallio backyard fallback — found from
owner feedback, not a report.** Owner, looking at a battle capture: *"the 3d
level looks bad an is pointing the wrong way... characters look like they
are weird."* Chasing that down (not assuming it was a taste question) found
a real ordering bug: `formation_battle.gd`'s `_build()` mounts `_stage3d`
from `_ready()`, which fires the instant the scene enters the tree —
**before `begin()` has ever run `_load_stage()`**, so `scene_asset_id` was
always still `""` at the moment `battle_stage_3d.gd` picked its model in its
own `_ready()`. Nothing afterward ever told it the id had changed. Confirmed
by capturing two DIFFERENT battles (`battle-courtyard-3v3`,
`battle-kattilahalli-3v3`) and finding the render pixel-identical both
times — every fight in the game, regardless of what it names, has only ever
shown the same generic yard.

- **Fixed**: `_stage3d` construction moved out of `_build()` into a new
  `_mount_stage3d()`, called from `begin()` *after* `_load_stage(id)` sets
  the real id. Re-captured both battles: courtyard still (correctly) shows
  the fallback, since `scene-courtyard-prototype-v05` is a flat 2D webp with
  no 3D stage of its own — but kattilahalli now shows its own registered
  hall (tank/silo, rust pillars, checkered floor), genuinely different from
  the backyard for the first time.
- **A second, smaller bug found alongside it**: `_load_stage()` (the 2D
  loader, kept live for `use_3d = false`) tried to load every
  `scene_asset_id` as a `Texture2D`, including ones that are now `mesh-3d`
  assets — throwing a script error on every 3D battle
  (`res://scenes/formation_battle.gd:200`). Fixed by skipping any asset
  whose `kind` ends `-3d` before the `load()` call.
- **What the fix did NOT resolve, and the owner's complaint may still stand
  on**: the correctly-matched kattilahalli render is still rough —
  `art/v3/manifest.json`'s own note on that asset already says *"some
  textures are mirrored across opposite sides... owner's read is that
  colour and lighting hide it; not attempted here"*, and a fresh capture at
  the render's own resolution suggests they don't hide it completely. And
  **"characters look weird" has a confirmed, separate cause**, already
  named in `QUEUE.md`'s "3D cast" section and now seen directly in a
  close-crop capture: all six units share the muscle rig's fight clips
  regardless of their own proportions, so a 3v3 currently reads as six
  bodies frozen in one borrowed lunge, several of them clipping into each
  other at battle distance. Neither is a one-line fix. Brought back to the
  owner as a live question rather than picked unilaterally — this reopens
  `PHASING.md` §1.055 (2D vs 3D), which is a ruling this file does not get
  to make a second time on its own.

### Port
- **vectors:** unchanged.
- **data:** unchanged.
- **meshes:** none added; existing `stage3d`/`cast3d` assets unchanged.
- **presentation:** Godot-only — `formation_battle.gd`, `battle_stage_3d.gd`
  loading order. Nothing for `web/` to port; the 2D `web/` build never had
  this bug (no equivalent stage-fallback lookup exists there).
- **status:** landed. The two remaining issues named above are open
  questions for the owner, not follow-up work assigned to either build yet.

## v4.5 — 2026-08-28

**`web/` wears the same chrome as Godot — the actual algorithm, not a
lookalike.** Owner, asked whether `web/` should adopt `godot/ui/chrome.gd`'s
torn-carton material: *"absolutely, no doubt."* Asked whether that should be
a lighter CSS approximation instead of the same system: *"why not the
same?"* — an explicit, current instruction to port the algorithm, not the
look. `PORTING.md` §3.3 gets a named exception for it.

- **`web/js/v3/chrome.js`** is a line-for-line port of `chrome.gd`'s `_hash`,
  `_bite` and `_pixel`/`_paint` — same constants, same seed — reached through
  CSS `border-image` (`border-image-slice: 18 fill` maps to Godot's fixed
  nine-patch margin; `border-image-repeat: repeat` maps to
  `AXIS_STRETCH_MODE_TILE`). Verified byte-for-byte, not "looks close": a
  headless Godot script dumps `PiritoriChrome._paint()` pixel-for-pixel for
  all five box kinds (`panel`/`btn`/`bar`/`plate`/`plateBtn`) at their full
  64×64, and a matching pure-JS harness diffs the two. All five are
  identical, every channel, every pixel, after fixing three real porting
  bugs this same verification caught:
  1. **The hash used 32-bit JS bitwise ops** (`|0`/`Math.imul`/`>>>`) — the
     pattern `market/model.mjs` and `people/roster.mjs`'s own hashes use.
     GDScript's `int` is a true 64-bit signed integer; every value was
     silently wrong, no crash, just a different noise field. Fixed with
     `BigInt` and an explicit 64-bit two's-complement wrap.
  2. **Colour ops rounded to an 8-bit hex string after every step**
     (lighten/darken/lerp each quantised). Godot's `Color` stays in float
     0..1 space through all of that and quantises once, at final write.
     Rounding four times instead of once put pixels ±1 off. Fixed by
     rewriting the colour helpers to operate on `[r,g,b]` float triples
     throughout, one quantisation at the very end.
  3. **The final byte write ROUNDED; `Image.set_pixel` TRUNCATES** (a
     `uint8_t` cast with no `+0.5`). Fixed the same way it was found — this
     one hid behind the float-space fix above and only showed up as a
     stubborn ±1 on 5 of 8 sample pixels until the actual `Image.set_pixel`
     round-trip was isolated from the `ImageTexture`/GPU path (which is NOT
     where the drift was; that was a dead end worth recording so it isn't
     re-chased) and traced to this one cast.
- **Wired into `v3.css`**: `.paper-panel`, `.splash-card`, `.pause-card`,
  `.topbar` (`bar(false)`, torn bottom — the world's edge), `.mode-nav`
  (`bar(true)`, torn top), `.paper-button` + variants, `.choice-card` (now
  `plate_button(ACCENT_ACT)` — cream carton, torn bottom only, per
  `location_stage.gd`'s own words on why: "reads as something taken off a
  pad"). The old clip-path "cut corner" polygons are gone on every one of
  these — the baked texture already carries its own torn/broken edge, and
  layering the two read as two different worn-paper languages fighting.
  `.inspect-button` takes `ACCENT_LOOK` (violet); `.paper-button.danger`
  (WITHDRAW) takes `ACCENT_LEAVE`, not its old red, because withdrawing IS
  "leave, back out" — chrome.gd has no fourth accent for danger.
  `.primary`/`.cyan` keep their own mustard/cyan hex as the `button()`
  accent rather than collapsing into ACT, matching how Godot's own battle
  screen gives each verb its own accent color rather than reusing the
  three icon-button accents everywhere.
- Verified in a real browser (Playwright + the pre-installed Chromium), not
  just the pixel-diff harness: splash, main shell (topbar/rail/mode-nav),
  an encounter (inspect-buttons + choice-cards), and the pause menu all
  render the material correctly with no layout breakage and no console
  errors beyond an unrelated stray favicon 404.
- **Godot's UI is still WIP, so this is a port of a snapshot, not a frozen
  spec.** `chrome.gd` had already moved three times in three commits before
  this entry (worn card → carton choice cards → phone-fit sizing), and
  nothing stops a fourth. A byte-exact verification that only ever runs once
  is exactly the kind of promise this repo has already watched rot silently
  (`market@N`/`missions@N` vectors exist for the same reason). So the
  verification is now a standing gate, not a one-off scratch script:
  `port/chrome-vectors.mjs` (bare node) diffs `chrome.js`'s new exported
  `paintPixels()` against a committed fixture, `port/vectors/chrome.json`,
  generated by `godot/tools/chrome-dump.gd` (also committed). **When
  `chrome.gd` changes, re-run the `.gd` dump and re-commit the fixture** —
  the node gate only catches `chrome.js` drifting from whatever the fixture
  currently says; it cannot know the Godot side moved without a fresh dump.

### Port
- **vectors:** unchanged for market/missions/people/exposure — no rule
  moved. **New:** `chrome@1` — `port/vectors/chrome.json`, the reverse
  direction (Godot is canonical, `web/` is the port); `port/chrome-vectors.mjs
  --check` is the gate.
- **data:** unchanged
- **meshes:** none
- **presentation:** the chrome MATERIAL, which is the one presentation thing
  that did cross — see the `PORTING.md` §3.3 exception this entry adds.
  Nothing else about either build's layout, input or camera moved.
- **status:** landed on `web/`; nothing for Godot to do, it already had this.
  Godot's own UI direction is still moving, so treat this as synced-as-of-now,
  not settled — re-check `port/chrome-vectors.mjs --check` after any
  `chrome.gd` change lands.

## v4.4 — 2026-08-27

> **RETRACTION, added 2026-08-28.** This entry claimed the dock-hiding change
> "matches what the Godot battle screen already does." That was read off a
> document, not checked against a render, and `PORTING.md` §10 exists because
> of exactly this mistake. A capture taken 28 Aug shows the Godot battle screen
> still carrying its full dock, END DAY button and resource icons. Whether the
> two builds should match is still an open question (§10) — they did not match
> when this was written, and the claim is struck rather than quietly edited.

**Committed context: Location and Battle contract the shell.**

- **The planning dock hides, and the resource strip drops to time block and
  cash only**, per `UX_SPEC.md` §3.2/§3.4 — ~~matching what the Godot battle
  screen already does~~ (see the retraction above). The dock was the previous, unintended way out of a
  scene mid-way; the actual exits (`RETURN TO MAP`, `WITHDRAW`) already
  existed in the mode's own content and needed nothing new. Verified in a
  browser: the dock is gone (not disabled), no gap opens where it sat — a real
  CSS Grid row dropping out, not padding hacked to zero — and both exits still
  work, restoring the dock on return.
- **Bug found while verifying it, not caused by it:** the battle screen
  crashed (`unit.name.split` on `undefined`) because `crew-slot-*` records
  lost their authored `name` field when crew names moved to generation
  (2026-08-27, on `main`) and nothing had generated one since. Fixed at the
  content adapter — `content.js` backfills a name from `people/roster.mjs`'s
  own pools, exported as `nameFrom()`, the same FIRST/LAST lists the hiring
  pool uses rather than a third naming scheme. A THINGS TO TEST jump into a
  battle also crashed the same way on a fresh campaign, for a second reason:
  `startBattle` requires `player_deployed` crew and nobody is recruited yet.
  The jump now recruits enough to actually reach the screen.

### Port
- **vectors:** `people@1` unchanged — `nameFrom()` reuses the existing pools
  and rev tracks vector *outputs*, which this did not add any of.
- **data:** unchanged
- **meshes:** none
- **presentation:** `web/`-only (CSS + the mode-nav visibility rule). The
  Godot battle screen already contracts; nothing to port.
- **status:** handed off

## v4.3 — 2026-08-27

**Missions are beats now, not errands — and the texture budget, measured.**

- **All four authored missions carry steps.** `content/era1-slice-v1.json`:
  each mission is now `TAKE`/`MOVE`/`FIND`/`MEET`/`HOLD`/`HURT` across two
  places with alternatives at every step, per `MISSIONS.md` §3. All four
  validate cleanly and none are thin. `mission-bear-path`'s `FIND` step is the
  same act as its `battle_avoidance.choice` ("name-the-empty-van"), and its
  alternative spends the flag `mission-three-vans` can hand you — two missions
  that used to only share a flag in the effects table now share it in the beat.
  `mission-courtyard-receipts` got `HURT` rather than the predicted `LOSE`:
  its `battle_avoidance` is `null` in the data, which is the mission saying it
  has no side door, and a `LOSE` step would have quietly invented one.
  **Not yet wired into the runtime** — `web/` still only shows a mission's
  status line; there is no screen that walks a step. That is the next real
  gap, and it is a mode to build, not more content to write.
- **The texture budget, measured rather than repeated.** `PORTING.md` §9: a
  real `GLTFLoader` measured every registered GLB and image. The full
  catalogue is **234.9MB** uncompressed, worse than `JS_BUILD_CATCHUP.md`'s
  182MB because that figure predates `stage3d/`, `jaska-v01` and `equipment/`.
  But neither engine eager-loads meshes — a realistic single battle (one
  diorama, four bodies, the inset presenter) measures **36MB**, comfortably
  inside budget. The Pixel 10 black screen is still unexplained; ordinary play
  does not approach the number that reportedly broke it.
- **Branch hygiene on the Suds-Jack side:** `claude/piritori-eden-game-8ptx2o`
  had a merged PR (#305, squashed as `83934c8d`) but kept accumulating commits
  on the pre-merge base — 52 behind `main`. Restarted from fresh `main`,
  cherry-picked forward the one genuinely unmerged commit (the two Piritori
  hub cabinets), verified 166/166 hub checks, force-with-lease pushed.

### Port
- **vectors:** `missions@2` — the four missions now carry steps, which the
  vectored `fire()` cases already exercised; `market@2`, `exposure@2`,
  `people@1` unchanged.
- **data:** `content/era1-slice-v1.json` changed; run `sync-data.mjs`
- **meshes:** none
- **presentation:** none
- **status:** handed off

## v4.2 — 2026-08-27

**A pause menu with THINGS TO TEST, and the market model finally on a screen.**

- **Pause menu** (Esc or ⏸) with a **THINGS TO TEST** submenu: twelve screens
  that are hard to reach by playing, each with a jump straight to it and a note
  saying what to look for. Approving one removes it. Approval stamps the item's
  **`rev`**, not a tick — bump the rev when the screen changes and it returns
  marked CHANGED, because a look signed off six versions ago is not a look at
  this build. Godot items carry no jump and say why (§3.3: presentation is
  deliberately different, so only the port can answer them).
- **THE BOARD** in the ledger: `market/model.mjs` rendered for the first time
  since it was written. Every active anchor, priced live, with the model's own
  stated cause — and shown only to the level you have earned. A place you have
  never stood in shows nothing, which is the reason to go there. Additive: the
  authored offers still work, and are still the leads.
- Trading now leaves a **footprint**, which is what saturation prices; standing
  somewhere **marks it seen**, which is what decays.
- **Exposure** is on the ledger, reading the same `exposure()` a mission trigger
  reads, so the two can never disagree about whether you are conspicuous.
- **Bug, mine, from the `legacy/` → `web/` move:** asset URLs resolve against
  the PAGE, not the module, so they needed one more step out of `web/` than the
  JSON fetches did. I fixed the three fetches and left the three asset paths,
  and the only symptom was about forty silent 404s — every unit drew its
  fallback and nothing threw. `v3-contract` now asserts the prefix.

### Port
- **vectors:** unchanged — `market@2`, `exposure@2`, `missions@1`, `people@1`.
  The board renders the model; it does not alter it.
- **data:** unchanged
- **meshes:** none
- **presentation:** the pause menu and the board are `web/` UI. The port wants
  its own pause and its own board — and the three Godot items in THINGS TO TEST
  are the list it should work from.
- **status:** handed off

## v4.1 — 2026-08-27

**Caught up with `main`.** This branch was 74 commits behind and one thing in
v4.0 rested on a premise that had already been overturned.

- Merged `origin/main`. Conflict surface was one file — the rest of v4.0 is
  additive — but the content it brought is not small: the real-data map
  (`kallio-water/streets/railway-v1.json`, no invented geometry), generated crew
  names, the committed-context UI work, the carton chrome, and
  `JS_BUILD_CATCHUP.md`.
- **`PHASING.md` §1.055 (2026-08-22): THE GAME IS 3D.** It landed the day after
  the browser build was parked, which is why that build has none in it.
  `PORTING.md` §1 has been corrected: promoting a `getContext('2d')` build to
  primary tester is not the same as it being the shape the game is now.
- **`STAGE_SPEC.md` §6.3's brief is FULFILLED** —
  `art/v3/scenes/toko-slomo-noodles-empty-v01.webp` exists, built through four
  drafts in `art-src/scenes/`, and `bank-counter-v01.webp` was built the same
  way. Marked done rather than left standing as an ask.
- The map gained `makelansilta`: 14 anchors, 11 active. `QUEUE.md`'s
  document-versus-data question widened rather than closed.

### Port
- **vectors:** `market@2`, `exposure@2` — the new anchor changes both surfaces.
  `missions@1` and `people@1` unchanged, so nothing to re-port there.
- **data:** the map files changed; run `godot/tools/sync-data.mjs`
- **meshes:** `cast3d-jaska-v01` arrived on main
- **presentation:** main added a `COUNTER` framing to `presenter_3d.gd` on top
  of v4.0's fixes — Godot side already
- **status:** handed off

## v4.0 — 2026-08-25

**JS becomes the build; Godot becomes the port.** Owner ruling, recorded in
`DESIGN_AUTHORITY.md` and superseding 2026-08-21's "Godot is the
implementation".

- The browser build moves out of `legacy/` to **`web/`** and runs again from a
  clean checkout. Three fixes: every path to `content/`, `map/` and `art/` was
  one `../` short; `index.html` loaded the old monorepo's `hub/shell.js` with a
  hard `<script>` tag, now an optional dynamic import; and its contract gate
  had not run since the build was parked. What stayed in `legacy/` is the dead
  flow prototype, which still imports a `flow-core/` from another repository.
- **`PORTING.md`** is the working document for the new shape — what each build
  owns, what a version is, and the three kinds of thing that cross between them.
- **`port/vectors.mjs`** emits (input, expected output) rows from every model,
  so "ported" has an objective pass condition instead of a code review. 604
  rows across market, exposure, missions and people. `--check` is the gate.
- **`MISSIONS.md`** and `missions/model.mjs`: the beat, the clock and triggers
  that fire rather than fill. 34 checks.
- The market's clock is corrected to canon — Day / Evening / Night, with the
  slice's two named separately. It had invented a fourth block.
- Unparking the browser gate immediately found canon drift it had been carrying:
  13 anchors where it asserted 12, 10 active where it asserted 8, a third
  authored battle, and a courtyard scene three versions on. Recorded in
  `QUEUE.md`; not silently reconciled.

### Port
- **vectors:** `market@1`, `exposure@1`, `missions@1`, `people@1` — all new, all
  to port
- **data:** unchanged; run `godot/tools/sync-data.mjs`
- **meshes:** none this version
- **presentation:** `presenter_3d.gd` gained `own_world_3d`, derived LOCATION and
  INSET framing, and a `transparent` mode — Godot-side already, no port needed
- **status:** handed off

## v3.1 source pack — 2026-08-21

- Promotes the corrected Toko Slomo screen to the active v02 source and runtime
  derivative. The eye openings now sit inside the white mask arches while a
  visible white rim remains.
- Adds a self-contained `START_HERE.md`, one-command project checks and a local
  no-build file server so a new contributor can run the slice from a clean
  checkout without reconstructing the handoff from chat history.
- Keeps v01 for provenance; only v02 is registered by the active runtime-art
  manifest.

## v3 alpha — 2026-08-20

**The approved design becomes one playable, saved campaign state.**

- **Five modes, one state.** Route, location encounter, ledger, formation
  battle and sourced news are reachable from the same responsive shell. Cash,
  old markka, debt, stock, intel, crew, wounds, relationships and decisions
  persist locally instead of resetting between prototypes.
- **The authored seven days run as data.** The runtime consumes the validated
  fourteen-block Era I package rather than inventing a second story in code.
  Refusing the first purchase or first firearm does not soft-lock progress.
- **The classic loop is the opening.** The full Kallio map appears first with
  Piritori highlighted. Buying there immediately reveals the €68 Siltasaari
  demand lead after the €45 purchase, before the first family detour. The map
  then names the growth ladder from street buyer to emerging supplier.
- **The real graph replaces the old board.** Twelve north-up public anchors,
  eight active slice anchors, attached fictional sites and twenty-two public
  edges drive the one-screen relief map. Ordinary residents and hidden loads
  visibly share route capacity.
- **Approved art enters the runtime.** Toko's flattened narrative-instance
  prototype is cropped above its baked controls and receives live copy and
  choices. Karhupuisto foliage, dog and weather remain separate layers.
  Modular heads, torsos, legs and held props assemble the battle and ledger
  cast. The courtyard remains explicitly semi-approved prototype art.
- **Formation fights are positional.** The authored 2v2 and 3v3 use mirrored
  front, middle and back rows with mostly hidden cells, reposition, brace,
  readable intent, auto-command, negotiation and withdrawal. A critical wound
  is labelled before it can become a final-settlement death.
- **The complete-run contract is recorded.** A full Aatami-to-Kalle campaign
  targets 5–10 hours, with a larger Kallio–Pasila map in its second half.
  Bigger abstract loads raise forecast robbery risk and preparation needs;
  robbing the Jade Lantern Network can accelerate profit while starting a
  persistent, character-specific vengeance chain.
- **Era I media stays period-specific.** Market work lives in a paper ledger;
  calls and SMS belong to feature phones; the markka bulletin arrives through
  a CRT television. The UI has a Finnish-label alpha toggle while the authored
  narrative copy remains transparently labelled English pending translation.

This is the first v3 **alpha**, not an Art Bible completion claim. The active
design documents and art register remain authority over the runtime.

## v2 — 2026-08-19

**The art arrives, and the money stops leaking.**

- **Rooms you stand in.** Each of the four contacts has an interior you walk
  into from the map: full-bleed art, his line spoken over the foot of the
  picture, and two or three things to do about him laid side by side. The
  portrait is CUT OUT OF THAT SAME PICTURE (`face: [cx, cy, r]` per contact)
  rather than drawn beside it — a silhouette next to finished art does not read
  as a placeholder, it reads as a broken image.
- **The appraisal.** You cannot ask the man selling you a bag whether the bag
  is real; you can pay somebody else to look. A contact you have burned takes
  the money and tells you nothing, which is its own information about them.
- **The fight has people in it.** The board drew a rounded rectangle with a
  circle on top since the fight existed. Now: a bomber jacket from behind for
  your side, a dark work coat from the front for theirs, a body on the floor
  for either, five cover props that are real objects, and a lit courtyard,
  harbour, park or yard under all of it. A man who goes down stays down on the
  ground instead of vanishing.
- **Money could be posted into a hole.** A consignment sent to a district no
  drawn line reaches took the goods, planned no trip, arrived nowhere and said
  nothing — in one tap, for as much cash as you were holding. flow-core gained
  `reaches()` and the game asks before it takes.
- **2.6 MB of art, not 16.** The generator's plates are a build directory and
  are not deployed; what ships is cut, trimmed and WebP under `piritori/art/`.

Balance, measured rather than asserted: worked properly the seven nights take
400 € to about 7,400 € against a 3,000 € debt. Played naively — buy at the
square, ship to one fixed stop — it is roughly +8 € a day against six percent
compounding, which is a loss. That gap is the game.

## v1 — 2026-08-18

The first slice on the hub. The night map over real WGS84 Kallio, drawn lines
carrying consignments at the city's own capacity, six named goods on three
tiers, the bargain (and the cut bag), rank fights with guns, nerve, terrain
cover and three exits, seven nights, and an Eden that is never a node.
