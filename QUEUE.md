# QUEUE

Things noticed while doing something else. Per `CLAUDE.md` rule 1, they get
written down here instead of acted on.

Nothing here is approved work. It is a list of things a future session might
pick up, and half of it will turn out to be wrong.

---

## `v3-playthrough.cjs` had been silently not-running since 2026-08-25

Fixed two real bugs getting it to boot at all (stale `page.goto` target —
`/piritori/`, not `/web/`, same class of drift as `check-project.mjs`; and a
MIME map missing `.mjs`, which made the stances port's `battle.js` import of
`market/model.mjs` — the first cross-directory ES module import a browser
had to load in this gate — serve as `application/octet-stream`, which a
browser silently refuses to execute as a module). Both fixed, and the gate
now actually boots the app and runs 11 of 14 checks.

**Found running it for the first time in a while, not caused by this
session's own changes, not fixed here:**
- **The mode-nav loop (`for (const mode of ['encounter', 'ledger', …])`)
  times out clicking `ledger`.** It predates the committed-context rule
  (`VERSIONS.md` v4.4, 2026-08-27): entering `encounter` mode now correctly
  HIDES the mode-nav (`UX_SPEC.md` §3.2/§3.4), so the very next click in the
  loop has nothing to click. The test's flow needs updating to withdraw/
  return-to-map between mode switches, not the feature.
- **"the whole twelve-anchor Kallio board is present" fails** — already
  named in this file, "Canon drift the browser gate found when it was
  unparked": the map has 14 anchors now, `DESIGN_AUTHORITY.md` still says
  twelve. Open owner question there already; not re-litigated here.
- **One console 404** keeps the "boots with no browser errors" check red —
  `hub/shell.js?v=17`, the cross-repo hub-shell convention this standalone
  repo doesn't have. Harmless, seen throughout this session's other
  captures too.

---

## The stale "THE 2D -> 3D MOVE" section — fixed, 2026-08-28

The flag above (dated the same day) said this wanted a fresh read against the
current render rather than a line-by-line patch. Done: ran the real capture
tool (`godot/tools/capture_battle.gd`, headless + `xvfb-run`) against the
canon 3v3 courtyard, looked at the PNG, then re-read every claim in the three
sections below against both the render and the actual code (not the doc's
memory of the code). Corrections are inline below, each dated and each
saying how it was checked — reading `battle_stage_3d.gd` is not the same
class of evidence as watching it draw, and this file has been burned by that
gap before (`VERSIONS.md` v4.4's retraction).

---

## Debug affordances (blocks rule 3 and rule 6)

- ~~**No URL parameters.**~~ Done — `autoload/debug_entry.gd`. See `CLAUDE.md`
  rule 6 for the vocabulary.
- ~~**No on-screen debug HUD.**~~ Done — `ui/debug_hud.gd`. `?hud=1`, the DEV
  button, or F3. Shows fps / frame time / draw calls / memory (rule 9) and the
  campaign block, purse, stock and roster.

  Still thin: it reports frames but cannot **profile** them. If something is
  slow the HUD says so and not why.

## Canon drift the browser gate found when it was unparked (2026-08-25)

`web/test/v3-contract.mjs` had not run since the build was parked on
2026-08-21, and content moved out from under its assertions. The additions look
legitimate — Sörnäinen harbour and Suvilahti are referenced by the slice — so
the gate now asserts what the content IS, to stop the next drift. But one of
them is a **document disagreeing with data**, which `DESIGN_AUTHORITY.md`'s own
rule says to record rather than average:

| | the doc says | the file has |
|---|---|---|
| anchors | `DESIGN_AUTHORITY.md` locked direction: **twelve-anchor graph** | **14** |
| active slice anchors | **eight** | **11** |
| authored battles | (undocumented) | `2v2, 3v3, 3v3` |
| courtyard scene | `scene-courtyard-prototype-v02` | `…-v05` |

**Owner question: should the locked-direction paragraph move to 14 and 11, or
should anchors come out of the map?** It moved again between 2026-08-25 and
2026-08-27 — `makelansilta` was added — so the gap is widening rather than
sitting still, which is the argument for settling it rather than watching it. Not edited either way here — a
level-2 document and a level-7 file disagreeing is exactly the case the
authority order says to stop on.

The general lesson is already in `PORTING.md` §7: a build nobody runs stops
being a check on anything, and the checks it was carrying die quietly with it.

## Known gaps

- **Finnish and Japanese are drafts.** Written to match register, not
  translated by a native speaker. Same caveat the `toko/` counter records for
  its own packs.
- **`godot/tools/export-web.sh` calls bare `python3`** for the font-subset
  check. On this machine that resolves to a Python without `fontTools`, so the
  export fails at the gate until `python3` is shadowed to the venv that has it.
  The script is right; the environment is not.
- **`.git` is 568MB** and will not shrink from the Piritori split — the art
  blobs are still in Suds-Jack's history. Only a full history rewrite of that
  repo would reclaim it, and that breaks every existing clone. Recorded as a
  decision not to.

## The bigger board (see COMBAT.md 3.0)

- **Deployment is still capped at 4 a side** (`DESIGN_LOCKS.md` §4.1) on a
  20-cell board. Three units looks sparse and the formations sit far apart.
  Owner call, not tuning.
- **The fourth row is named `rear`** as a placeholder. Needs a word, or a
  reason the depth vocabulary should stay three deep with five lanes.
- ~~**Units could not attack.**~~ Not reach after all — `allowed_rows` was being
  compared against a unified depth, so a front-only weapon refused to fire from
  the front rank. Fixed with `FightBoard.row_of()`.
- **Weapon reach is still tuned for three lanes.** `lane_spread`
  `lane_spread` 0 covers one column of six rather than one of three, so a
  swung weapon reaches proportionally less of the board than it did. Nothing is
  broken and units can act, but the numbers were chosen against a narrower
  board and have not been re-judged against this one. Owner question below.
- **Deployment now fills the front rank.** With six lanes, three crew all fit in
  row 0, so nobody stands in middle or back. The old hand-written table put one
  in front and two in middle. `_deploy_order()` follows canon's stated rule
  ("front rank first, then middle") literally, and on a wide board that rule
  produces a flat line. Worth revisiting.

## Careers, now that they exist (COMBAT.md 7)

- **No crew member is marked `named` in the slice.** `is_named()` reads a
  `named` flag on the crew record and nothing sets it, so every hire currently
  ages out — including anyone the story needs later. The two-tier casting is
  built and the content has not caught up.
- **Ten is a playtest gate, not canon.** `CAREER_FIGHTS` is the owner's figure
  from conversation. `DESIGN_LOCKS` §13 forbids hardening a placeholder.
- **Nothing recruits.** Retirement removes people from the roster and there is
  no pipeline putting them back, so a long campaign runs the crew down to
  nothing. `NARRATIVE.md` already says Piritori is the cheapest source of hired
  operatives — that is where the loop closes.
- **Training is a flat two fights.** It should probably depend on who taught it.

## Open question for the owner

- **Should the full grid be permanently visible?** `GDD` §13.3 says only
  occupied, selected, targeted and reachable cells are revealed — "the grid is a
  rule beneath the scene rather than a permanent checkerboard". The owner has
  twice asked to see both grids drawn, which the debug overlay does. Whether
  that should be true in PLAY is a canon change and needs a word, not a quiet
  flip.

## Stages (see STAGE_SPEC.md)

- **The docks art is off-spec.** Supplied 2026-08-21 and registered as
  `scene-sornainen-docks-v02`, but its ground is not drawn at 2:1 and the
  canonical arena does not lie flat on it. Per STAGE_SPEC 5 the fix is the art,
  not the arena. It is registered so it can be worked on, not because it passes.
- **The courtyard v03 fits and is the reference** for what a stage should give.
- **`art-library/archive/needs-rework/`** should probably gain the off-spec
  stages rather than leaving them registered and unusable.
- **Every stage note above was written against the fallback yard, not the
  named one.** `VERSIONS.md` v4.6: `battle_stage_3d.gd` never actually
  showed a battle's own stage until 2026-08-28 — a mounting-order bug meant
  every 3D fight rendered `STAGE_FALLBACK` regardless of `scene_asset_id`.
  Fixed now. Re-judge stage quality against the CORRECT stage per battle,
  not the backyard everything used to silently borrow.

## The stage (see COMBAT.md 3.1)

- ~~**The projections do not match.**~~ Fixed by construction — the floor is
  built from `FORWARD`/`LANE_AXIS` in `_floor_quad()` and a flat top-down
  paving texture is stretched over it, so it aligns on every board size and
  every stage.
- **The paving is not registered art.** It is staged at
  `data/art/surfaces/paving-courtyard-topdown-v01.png` and loaded by path,
  which is exactly what the art rules forbid — runtime code should resolve a
  stable id from `art/v3/manifest.json`. It needs a manifest entry and an
  approval before it is anything but a prototype.
- **The backdrop still paints its own floor.** Now that the engine draws the
  ground, the approved courtyard's painted cobbles sit underneath it and only
  the buildings are wanted. Stage art should become architecture-and-sky with
  the floor left out.
- **`PLAY_AREA` is a port-side estimate living in `formation_battle.gd`.** It
  belongs in `art/v3/manifest.json` beside `portrait_safe_bounds`, as a
  `play_area` on each scene asset. The file says so itself.
- **Every crew member wears the same art.** Six identical figures in a 3v3 is
  the single loudest visual problem in the battle, louder than the grid. The
  pose sets exist per role; the battle is not picking distinct ones.
- **The approved courtyard cannot hold a bigger board.** Its floor is a wedge
  ending near 40% of frame height. A replacement needs a broad floor across the
  lower ~60%.

## THE 2D -> 3D MOVE (see PHASING 1.055)

Re-checked 2026-08-28 against a live capture (`godot/tools/capture_battle.gd`,
canon 3v3 courtyard) and the current code, not the doc's memory of it:

- ~~**The battle renderer draws standees.**~~ **False now.** The capture shows
  five clothed 3D figures with real depth, cast shadows and perspective
  foreshortening on the courtyard floor — not flat cards. Struck rather than
  deleted: this WAS true when written, per `PHASING.md`'s own account, and the
  section existed to be caught up, not erased.
- ~~**No isometric Camera3D exists; the arena assumes a 2:1 projection that
  the 2D code fakes.**~~ **False now.** `battle_stage_3d.gd:500-501`: `_cam =
  Camera3D.new(); _cam.projection = Camera3D.PROJECTION_ORTHOGONAL`. A real
  orthographic camera, not arithmetic pretending to be one.
- **`ART_BIBLE.md` describes a different game now.** Still true — checked
  2026-08-28, not just cited from memory: `git log` shows zero commits to
  `ART_BIBLE.md` since this was first flagged, and it still opens "Visual
  system id: `cut-cardstock-hand-ink-v03`" with §13.2 framing 3D as one
  named exception (Arvo Linde) rather than the rule. It and `PHASING.md`
  still openly disagree; nobody has touched the older document.
- **Six arenas and six cast sets become reference art, not runtime art** —
  not re-verified here. The cast half is covered below ("now reference art").
  The six-arenas claim was not checked against the current stage list; flag
  stands, unconfirmed either way, rather than guessed at.

## The 3D cast, now that it exists

Not flagged as stale, and the fresh capture broadly agrees with it — kept as
written, with one corroboration:

- **The night grade eats them** — partially confirmed by the 2026-08-28
  capture, at close crop: two figures read as near-black silhouettes, three
  as legible olive drab against the lit tile, so the effect is real but not
  as total as "six dark shapes" suggested — some silhouettes ARE already
  reading. Faces wash pale at any distance. Still an open problem, just not
  a uniform one.
- **Only the muscle has fight clips** — still true, checked 2026-08-28
  directly against the code: `battle_stage_3d.gd`'s `CLIPS` dict still points
  all four states (idle/attack/hit/dead) at `cast3d/clips/muscle-*-v01.glb`
  only. Nothing has changed here.
- **The 2D cast sets are now reference art** — not re-checked this pass.

## 3D units (see PHASING 1.06)

Re-checked 2026-08-28 against `art/v3/manifest.json` and `battle_stage_3d.gd`
directly, not the earlier note's memory of either:

- **`art/v3/cast3d/` IS now registered — but the runtime still doesn't read
  the registration, which is the half of the complaint that actually
  mattered.** `art/v3/manifest.json` carries 19 real entries now
  (`cast3d-muscle-v01`, `cast3d-driver-v01`, … `approval_status:
  semi-approved`, `production_status: prototype-only`) — so "staged but NOT
  registered" is literally false. But `battle_stage_3d.gd`'s `UNIT_BY_ROLE`
  and `CLIPS` dicts still hold raw `res://data/art/cast3d/...` paths, and
  neither `battle_stage_3d.gd` nor `content_registry.gd` ever resolves a
  cast3d id through the manifest to get there — grepped for it, nothing
  calls it that way. The registration is real and currently decorative: an
  entry exists to look an id up by, and nothing looks one up. That is a
  smaller, more precise bug than "not registered," and worth its own line
  rather than being marked simply fixed.
- **Textures are "uncapped," but the 6.5MB figure is stale — the underlying
  gap is not.** Current `cast3d/*_texture_0.png` files run 280-470KB each,
  not 6.5MB; citing the old number now would overstate the problem. But
  `process/size_limit=0` is still set on every cast3d texture import — the
  actual fix (a size cap) was never applied, the files just happen to be
  smaller today, for reasons not investigated here. The next asset that
  isn't will hit the same unbounded import with nothing to catch it.
- **`ART_BIBLE.md` §13.2 still says 3D is one exception** — still true, see
  above; same unrewritten document.
- ~~**Nothing draws 3D units in battle. The board renders 2D standees.**~~
  **False now**, and this was the flat self-contradiction sitting inside this
  same file: the section directly above this one ("The 3D cast, now that it
  exists") already said six 3D models are on the board. One of the two was
  wrong and nobody had gone back to strike it. It was this one.

## Art

- **Faces wash out at battle scale.** The cast sheets are 362x543 with real
  faces; drawn at roughly 120px tall a head is ~15px and the night grade
  flattens what is left, so they read as pale ovals. Clothing colour and
  silhouette carry the identification, which is what `ART_BIBLE` asks for — but
  a portrait-scale face may want a simplified battle variant.
- **The pose sets are swapped, not played.** Nine poses per role exist and the
  battle picks one per state. There is no held-frame timing, no weight, no
  torn-edge sway — `ART_BIBLE.md` licenses all of it and none is used.
- **Courtyard and weather art remain visibly semi-approved** per
  `DESIGN_AUTHORITY.md`. They are in the build.

## Loot (COMBAT.md §8) — what is honestly missing

- **There is no equipment shop.** The unbuyable rule is currently enforced by the
  *absence* of a buy screen plus a content gate on authored choices. When a shop
  is built it MUST consult `GameState.is_purchasable`, or §8 is over.
- **Nothing sells loot in the UI.** `GameState.sell_loot()` exists and is tested;
  no screen calls it, so loot cannot actually be converted down into money in
  play yet. The economy is half-wired.
- **Two taken-only weapons is a thin tier.** `chain` and `sawn-off` are the whole
  capability ladder. That is enough to prove the rule and not enough to make
  pushing into faction ground feel like a reason.
- **Resale numbers are invented placeholders** (`DESIGN_LOCKS.md` §13: do not
  silently harden these). They were set to be deliberately poor so selling a
  taken weapon feels wasteful, but no playtest has confirmed that.
- **Rout-vs-break loot asymmetry is unbalanced.** §8.2 makes the merciful win
  yield less. Watch whether it pushes every fight toward maximum violence.

## Download weight — measured, not estimated (CLAUDE.md rule 9)

The first real web export since the 3D pivot. `CLAUDE.md` records "~58MB on disk
and ~28MB gzipped". Measured on 2026-08-22:

    index.wasm   37.7 MB raw    9.7 MB gzipped   (the engine; fixed cost)
    index.pck    49.7 MB raw   47.4 MB gzipped   (our content)

**~57MB gzipped, roughly double the recorded figure.** The pck barely compresses
because it is already-compressed art. Update rule 9's numbers when this settles.

Fixed in the deploy commit: `muscle-walk-v01` and `muscle-run-v01` were never run
through `strip_glb_texture.py` — they carried a 6.8MB texture each, and Godot
extracted a second copy alongside. 7.1MB -> 0.7MB each. This barely moved the
pck (Godot ships imported artifacts, not source glbs) but removed 26MB from the
tree and the import cache.

Still recoverable, NOT done — each is an Art/Content lane call, not Engine:

- **`arvo-linde-v05_texture_0.png` imports to a 6.3MB `.ctex`**, the single
  largest thing in the build. The presenter is one figure; this is a 2048 map.
  Downscaling it the way the cast was handled is the biggest single win.
- **Superseded courtyard prototypes ship to every player.** `courtyard-prototype`
  v02, v03 and v04 are registered in `art/v3/manifest.json` and referenced by
  nothing — only v05 is used by `battle-courtyard-3v3`. ~3.6MB of `.ctex` for
  iterations nobody sees. This is `export_filter="all_resources"` doing exactly
  what rule 11 warns about; the fix is to unregister them.
- The remaining ~35MB is many ~1MB webp arenas and 2D cast art. Death by a
  thousand cuts, and it needs a policy rather than a cleanup.

Also noted: `small-local.glb` survives in `.godot/imported/` with its source gone
— stale local cache only, it does not ship. Same shape as the `_3dtest` stray.

## Hiring and the roster (COMBAT.md §7) — what is placeholder

- **CORRECTION: the tofu bug I reported did not exist.** I claimed "Jelena
  Marković" rendered as boxes on the web build. It does not. Godot's own
  built-in font carries Latin Extended-A, and that face is what the web build
  falls through to when SystemFont finds no operating system to ask — which is
  exactly how the original Japanese tofu bug was diagnosed. I proved the
  bundled subset lacked c-acute, then asserted a rendering failure I never
  observed, and renamed six generated surnames to satisfy it.
  The real defect was in the GATE: `build-font-subset.py` demanded the
  Japanese subset cover every codepoint the project can emit, including ones
  the engine already draws. It now subtracts Godot's own coverage, generated
  by `tools/dump-builtin-font-coverage.gd` into a committed list.
  Two consequences, both good: the subset fell from 171.7 KB to 96.5 KB per
  face, and the surnames are spelled properly again. Regenerate that list
  after a Godot version bump — it is engine-version-specific.
- **Placeholder names, flat pools.** No weighting by era, age or district; a
  1950s-born Finn is as likely as a 1980s one. Fine for churn, wrong for texture.
- **Six portraits for unlimited people.** Generated crew recycle the six drawn
  heads, so hires visibly repeat. The 3D hue-band recolour helps on the board and
  does nothing for the rail portrait.
- **The signing fee is the wage, and that is a guess** (DESIGN_LOCKS §13). Wages
  were displayed and never charged; using the wage as an upfront cost at least
  makes the number mean something, but nothing has playtested whether hiring is
  too cheap. Recurring wages still do not exist — a crew member costs money once.
- **Stat spread is ±1 around the role base.** Deliberately narrow so churn does
  not become a lottery, but it also means hires are nearly identical within a
  role. Competencies are fixed per role, so there is no variety there at all.
- **The pool is three people per day and never runs dry.** No scarcity, no
  reputation gate, no faction refusing to work for you.

## Download weight, second pass — measured again

Local export, same machine, before and after:

    index.pck   49.7 MB raw / 47.4 MB gzipped   ->   39.9 MB / 37.7 MB
    index.wasm  unchanged at 37.7 MB / 9.7 MB   (the engine; not ours)

So roughly 57MB gzipped down to 47MB. Three changes did it:

- **The presenter texture was 2048 square.** Arvo is drawn in a panel at most
  ~620 logical pixels wide, so it was oversampled about eleven times over.
  Downscaled to 1024, which is still generous: 6.5MB -> 2.0MB, and the imported
  `.ctex` was the single largest object in the build at 6.3MB.
- **Three superseded courtyard prototypes were still registered.** v02, v03 and
  v04, where only v05 is used by `battle-courtyard-3v3`. Each imported to a
  ~1.2MB `.ctex` and shipped to every player.
- **Two animation clips were dead.** `cast3d/muscle-walk-v01` and
  `muscle-run-v01` were the first two rigged clips; `battle_stage_3d.gd` loads
  only the four in `cast3d/clips/`. I had spent effort texture-stripping these
  earlier in the same session without noticing nothing loaded them.

`tools/find-orphan-art.py` is committed and reports what nothing references.
It found 34 orphans on its first run, most of them false: code names the MEMBER
ids (`torso-runner-v03`), never the group id (`crew-torsos-era1-v03`), which is
the second half of CLAUDE.md rule 11.

Still open, deliberately not touched:

- **19 registered assets, 2.87 MB of source, are referenced by nothing.** Mostly
  arena backgrounds (`scene-karhupuisto-clearing-v01`, `scene-kallio-service-
  yard-v01`, `scene-hakaniemi-square-v01`, `scene-sornainen-quay-v01`) and the
  whole 2D cast (`cast-muscle-v01` and friends, nine files each). These are NOT
  provably superseded — they may be arenas nobody has wired up yet, and the 2D
  cast may still be wanted. Deleting art on a guess destroys work, so only
  supersession was actioned. Someone who knows the intent should rule on these.
- **`export_filter="all_resources"` is still on**, and is why unreferenced art
  ships at all. It cannot simply be narrowed: art is loaded from `data/` by path
  at runtime, so dependency-following would drop nearly everything. The real fix
  is to keep unused art out of `data/`, which means a `runtime` flag in the
  manifest that `sync-data.mjs` honours.
- **CI's pack measured 56.2MB where the same commit built 49.7MB locally.**
  Unexplained. Probably a stale local import cache, but it has not been proven,
  and it means local size numbers are a lower bound rather than the truth.

## A test scene with a parse error HANGS, it does not fail — fixed, 2026-08-28

Found while adding the aftermath gate: `test_shell.gd` has `check()` but no
`eq()`, and calling the missing helper was a parse error. Every scene ends in
`get_tree().quit()`, so a scene that never loads never quits — the run sat there
until it was killed at 6m40s rather than reporting anything.

CI would have caught it as a timeout, eventually, with no useful message. Worth
a `--timeout` on the gate invocations, or a watchdog in the scene, so the
failure says what it is.

Done: `godot/tools/run-tests.sh` wraps every gate in `timeout`, named per
test. A watchdog INSIDE the scene was considered and rejected — the failure
mode is a parse error IN the script, so nothing inside that same file can
run to rescue itself; the timeout has to live outside the process.

**Found building it, a second and unrelated staleness trap, same shape as
the timeout one but silent instead of slow:** running the full suite showed
`test_locale` and `test_shell` FAILING on two real keys (`cmd.city`,
`cmd.messages`) in every language — but `tools/check-locale.mjs`, which
reads `locale/ui.csv` directly, already said the CSV was fine. The keys
WERE in the CSV (added 26 Aug). The compiled `locale/*.translation` files
Godot actually loads are gitignored, editor-generated artifacts that only
rebuild when the editor opens the project — this checkout had pulled the
CSV change without ever doing that, so `--headless` silently ran every
gate against week-old compiled translations and reported it as a content
regression. One `--editor --quit-after` pass fixed all of it; nothing was
actually wrong with the game. `run-tests.sh` now forces that pass by
default (`PIRITORI_TEST_NO_IMPORT=1` to skip it). Worth remembering next
time a gate fails on something `check-locale.mjs`/`sync-data.mjs --check`
already called clean: the two can disagree, and when they do, the CSV-level
check is reading the real source and the compiled one may just be stale.

**And the fix has its own trap.** Forcing that import pass with a Godot
binary OLDER than the README's declared 4.7.2 (a 4.3 stable happened to be
what was on hand) silently rewrote two font `.import` files and
`ui.csv.import`, each losing two lines — engine-version default params, not
real content, but a tracked-file diff all the same. Reverted rather than
committed. `run-tests.sh` now says so in its own header; repeating it here
because "run the import pass" is exactly the kind of advice someone will
follow without reading the script first.

## The hired character — what is wired and what is not

- **The six animation clips are NOT wired.** `cast3d-hired-clips-v01` holds
  Walking, Running, falling_down, Block6, Draw_and_Shoot_Left and bicep_curl.
  The board loads four named states — idle, attack, hit, dead — from
  `cast3d/clips/`, and these carry neither those names nor an idle at all. The
  file is registered and cheap (0.7MB) but nothing plays it. Mapping is small:
  falling_down→dead, Block6→hit, Draw_and_Shoot_Left→attack, and idle has to
  come from somewhere. `bicep_curl` is gym filler and should be dropped.
- **The hired figure plays the muscle's clips today.** They lift onto any Meshy
  biped rig, and both are 24 bones, so it should retarget — but that has only
  been reasoned about, never watched. If it looks wrong on the board, this is
  why.
- **`hired` has no 2D art.** No torso, legs or portrait sheet, so its
  `torso_asset_id` and `legs_asset_id` are deliberately empty strings rather
  than names of files that do not exist. Nothing loads them today; anything that
  starts loading them must handle the empty case.
- **Its stats are a guess** (DESIGN_LOCKS §13): condition 9, nerve 5, tempo 5,
  wage 14 — cheap, sturdy and easily rattled. Never playtested.

## The skate park arena — a canon decision nobody has made

`stage3d-hermanni-skatepark-v01` is registered art and is **placed nowhere**.

**Hermanni is outside the locked Era I production boundary.** `MAP.md` §4.1 puts
Vallila at the northern and eastern edge; Hermanni is the district beyond it.
The twelve anchors do not include it. Three ways forward, and this is a Design
call, not an Engine one:

1. **Extend the boundary** to take in Hermanni. Real cost: `MAP.md` calls the
   boundary locked, and the map geometry, edges and travel times all assume it.
2. **Re-site the arena** at an anchor already in bounds. Alppiharju (Brahen
   kenttä, sports ground) and Vallila (industrial edge) both plausibly hold a
   concrete skate park in 2003. The model itself is generic — graffitied ramps,
   a bowl, a road along one edge — and only the asset id says Hermanni.
3. **Leave it as a proving ground** reachable by `?stage=` and never placed.

Until someone rules, it is reachable and unplaced, which is honest but means it
is in the download without being in the game.

Also open on it:

- **Scale is inherited, not measured.** `_build_stage()` scales every arena by a
  hardcoded 5.4, chosen for the backyard. The skate park is a different size in
  its own units, and `_measure_ground()` will find a floor either way — but
  whether the board sits sensibly inside the bowl has been reasoned about, not
  watched. `STAGE_SPEC.md` §1.1 wants the floor 1.22x the arena.
- **The ORM map may not be wanted.** It came at 4096 and is now 1024, but the
  stage is lit stylistically. If the shader ignores it, that is another 0.7MB
  doing nothing.

## The second hired body

`cast3d-hired-b-v01` — denim jacket, khaki trousers, dreadlocks, red-gold-green
accents. Registered, wired as a `hired` variant, picked by fighter id.

- **Only two clips came with it** (Walking, Running) against the first body's
  six, and neither set is wired. Both play the muscle's idle/attack/hit/dead.
- **It is 10390 triangles against the other hired body's 6533.** Not a problem
  at this scale, but if a crowd of them ever shares a board it is the one to
  look at first.
- **Both hired bodies are men.** The generator rolls women into the role and
  they will wear one of these two. The six specialists have the same problem in
  reverse — one body each, so a role has one apparent gender. Neither is a bug
  in the code; both are a gap in the cast, and `NARRATIVE.md` asks for a crew
  that includes women and older people.

## Kattilahalli, the street cast, and what is still open

**Kattilahalli is in bounds.** Unlike the skate park: Suvilahti sits at
Sörnäinen and `sornainen_harbour` is already an anchor, roles `docks,
industrial, expansion`. Its `sliceState` is **teaser**, so putting a battle
there is a content decision but NOT a boundary change. That is the difference
between this arena and the Hermanni one, which is still unplaced.

- **Mirrored textures.** Some faces repeat across opposite sides. The owner's
  read is that colour and lighting hide it. Not attempted.
- **Nothing fields either new arena.** Both are reachable only through `?stage=`.
  Kattilahalli has a home anchor waiting; the skate park still does not.
- **The concrete slab is untested against a real hole.** `_build_ground_fill()`
  lays a slab under every arena at 1.22x the footprint. Its constants are gated
  but the *effect* has never been looked at — whether Kattilahalli's open sides
  actually read as hardstanding, or whether the slab is visible as a flat grey
  disc past the hall walls, is a picture question the suite cannot answer.
- **The white suit sits in the `enforcer` slot on sufferance.**
  `MODULAR_CHARACTER_SYSTEM.md` gives Enforcer a rain shell, a dark cap and a
  long silhouette. A white suit is none of those. Either the brief updates or
  the model is re-designated.
- **`baked_text` is declared on every asset and read by nothing.** No gate, no
  documentation. `street-raver-v01` is the first entry to set it true — the
  garment carries "RAVE" and an acid-house smiley — and nothing verifies that
  claim or acts on it.
- **The street cast is three men and the enforcer a fourth.** The generator
  rolls women into `hired`; they will wear one of three male bodies.

## Telegraphs are live — what Phase A still lacks

`PHASING.md` Phase A wants "telegraphs that make Into the Breach readability
real". The live read is now on screen. The rest of Phase A is not:

- **Board hazards and cover.** Content authors `cover` per battle (stone bin,
  bicycle rack, porttikongi edge) and the builder mirrors props onto both
  half-boards, but nothing in the telegraph or the command bar tells the player
  what standing behind one does. Cover that is invisible to the decision is
  scenery.
- **Third-party entry.** Decision 3c — cops arriving mid-fight, a rival crew
  turning up. Nothing exists.
- **Forecast before commitment.** Encounters have `forecast` strings and show
  them; the FIGHT has no equivalent. You commit a crew to a battle without a
  read on what it will cost.
- **The telegraph does not say how hard.** Risk band drives colour only. "Will
  swing at your lane 2" in orange is better than nothing and still not Into the
  Breach, where you see the number.
- **Intel is never explained.** `target_lane == -1` renders as "aim unclear",
  which is honest, but nothing tells the player what raises intel or that a
  watcher's `intent-reading` is what buys the read.

## Cover is visible now — and all of it is soft

Cover was fully implemented in the resolver (hard blocks, soft intercepts unless
the weapon is piercing) and drawn on the 2D board as an unlabelled green
rectangle. So it changed fights without ever telling anyone. It now names itself
on the selected crew member and warns before an attack is committed.

Two things that follow:

- **Nothing in the slice is hard cover.** `BattleBuilder._cover_props()` marks
  every authored effect `"soft"` with the comment that nothing asks for hard
  yet. So the resolver's hard-block branch and the `battle.cover_blocks` copy
  are live code on a dead path. A gate now asserts this is still true, so the
  day hard cover arrives it fails and points at the copy that becomes reachable.
- **The 3D board does not draw cover at all.** `_draw_cover()` is in the 2D
  renderer, and the game is 3D. So the *words* are now right and the *picture*
  still is not: a player is told "behind the bicycle rack" with no rack visible
  on the board they are looking at. This is the next honest step for cover, and
  it needs a prop model or a marker, not more text.

## Three reports from play, 2026-08-22

**"No Arvo in news, only map shows" — not a bug in the code.** The presenter
mounts correctly; it was probed headlessly and `presenter_3d` reports available
with the model imported. The cause is content: **there is exactly one bulletin in
the entire slice and it does not exist until day 3**, so opening NEWS earlier
correctly shows "Nothing has been broadcast yet" over the map.

Arvo is already reachable at `?news=news-markka-afterlife`.

The real gap is editorial and cannot be closed by inventing copy. A news record
carries `documented` (with real source URLs), `inference`, `accusation` and
`fiction` as separate fields — the schema exists precisely to keep verified fact
apart from invention. Writing more bulletins needs sourced 2003 research and the
owner's approval, and the recent ruling that Arvo is the market's narrator and
the authoritative public clock makes **one bulletin per era nowhere near enough**.

**"Menu is small" and "not all touch controls work" are probably ONE bug.** The
project renders at a 1280x720 base with stretch aspect `expand`, so content scale
is `min(win.x/1280, win.y/720)`. On a phone around 412 CSS pixels wide that is
**0.32**: a 19px label draws at 6px, and a 48px button becomes a 15px touch
target, which is below what a thumb can reliably hit.

Fixed by setting `content_scale_factor` from window width, which multiplies on
top of the stretch and leaves the 1280x720 design space every drawing routine is
tuned against untouched. **The default was chosen by arithmetic, not by looking
at a phone** — `?scale=` overrides it so it can be dialled on the device.

Still open on input, and not yet reproduced: whether anything is unreachable for
a reason other than size. `city_map` uses `InputEventMouseMotion` for hover
highlighting, which has no touch equivalent — cosmetic, but it means a tap gives
no preview where a mouse would.

## The fence exists — what it still lacks

- **The rate is flat and invented.** `resale_eur` per weapon, same everywhere,
  every day. `GDD` now rules that prices roll per district per day and move on
  events; the fence should eventually be subject to that rather than a constant.
- **The earned fence is not built** (`COMBAT.md` §9.7): no contact who pays
  better, so the Piritori rate is the only price rather than the floor.
- **You cannot buy anything.** The fence sells only. There is still no equipment
  shop, which means `is_purchasable` is enforced by the absence of a shop rather
  than by a check at the point of sale.
- **Nothing warns you before a fight** that the weapon you are about to lose with
  a fallen crew member is unbuyable. The fence says it at the moment of selling;
  §8 takes kit off the downed silently.

## Character backlog — who needs a model, and who needs to talk

`UX_SPEC.md` §18 makes one component serve the news, a map location and a battle
inset. The frame is generalised and gated. What is missing is people and motion.

### Nobody can talk yet

**No talking animation exists.** `cast3d/clips/` holds idle, attack, behit and
dead; the street bodies shipped with walk, run, block, draw-and-shoot,
falling-down and a bicep curl. Nothing covers speaking.

This is the highest-leverage single asset in the project. All four rigs are
24-bone Meshy bipeds and clips already lift between them, so **one talking clip
makes every one of the ten existing bodies a speaking character**. Do this before
commissioning any new person.

### Who has a model

| Speaker | Model | Needed for |
|---|---|---|
| Arvo Linde | yes | the daily news |
| Toko Slomo | **yes** — his own, apron and all | the noodle bar |
| Sean McCormick | **cast** — the suited man | encounters; the family runs the bars |
| Faction shot-caller | **borrowed** — the white suit | the battle inset, `COMBAT.md` §9.9 |
| Jaska | no | moral counterweight, all through `NARRATIVE.md` |
| McCormick family | no | bars, and where retired crew are found (§9.8) |

**Borrowed is not the same as done.** Owner's call was "use any character in
these places for now", so the framings can be judged before anybody is
commissioned. `presenter_3d.PLACEHOLDER_SPEAKERS` names them and a gate checks
the list stays honest, because a placeholder that nothing distinguishes from
finished art is how the wrong face ships — it looks deliberate, so nobody
questions it.

The white suit standing in for a faction shot-caller is nearly right by accident,
which is precisely the kind of thing that quietly becomes permanent. Toko wearing
the driver's body is plainly wrong and will announce itself.

`presenter_3d.SPEAKERS` holds the list, and a speaker with no model fails by name
rather than rendering nobody. A gate asserts the size of that dictionary, so
adding Toko will fail the suite and point straight back here.

### The two framings nobody has looked at

`LOCATION` and `INSET` camera positions are **starting points chosen by
arithmetic, not measurements**. BROADCAST is unchanged and pinned by a test. The
other two need judging on a screen the first time a real character stands in
them.

## All three framings now have a screen

`UX_SPEC.md` §18 is wired end to end: BROADCAST in the news, INSET over the
battle board, LOCATION at an encounter. One component, three shots.

The LOCATION mount reads the encounter's own `participants`, so no per-encounter
configuration exists and any future scene with a modelled participant gets a
character for free. Today exactly one encounter qualifies —
`enc-toko-quiet-voice` at the noodle bar — and that is correct: most
participants are a bank clerk, a lunch crowd, a dog owner, and never will have
one.

**Still unjudged, and only a screen can settle it:**

- Nobody has looked at LOCATION or INSET. Both camera positions and both frame
  sizes are arithmetic.
- **Nobody talks.** All three framings show a character standing still. Until a
  talking clip exists the showcase is a portrait, not a performance — and that
  one clip lifts onto all four rigs, so it remains the highest-leverage asset in
  the project.
- Toko is wearing a driver's work jacket.

**A participant is not yet a speaker id.** `SPEAKERS` happens to use the same
strings content does (`toko`), which works and is not designed. When a second
character gets a model this needs to be a declared mapping rather than a
coincidence.

### Two models were already paid for and idle

Asked to look deeply at the Meshy account and choose, I found twelve tasks: a
banana, a baseball bat, a diorama, the six role characters, Arvo, and **two
finished character meshes nobody had used**. Both were rigged for 5 credits each
rather than remade, which is 10 against a balance of 388.

- **The suited man** is an earlier Arvo attempt — 20794 triangles against the
  20826 that shipped, which is how it was identified. Cast as **Sean McCormick**,
  a participant in authored encounters who had no model.
- **The parka man** replaces the driver as Toko's stand-in. A proprietor in
  outdoor clothes reads closer to somebody who runs a small place than a courier
  in a hi-vis armband. Still not a Japanese noodle chef, so still a placeholder.

Both are named for what they ARE rather than who they play, so recasting either
costs nothing.

**Neither is Toko, and no Toko exists on the account.** The owner's Toko attempts
were made on the website, and the API only lists tasks created through the API —
proven by timestamps: the newest task the API can see predates the uploaded
Kattilahalli glb by hours. If a web task id can be fetched individually that
would change; untested for want of an id.

## Web-made Meshy assets CAN be fetched by id

Settled by experiment. The list endpoints return only tasks created through the
API — a full listing at `page_size=100` never shows a web-made model. But a
**direct GET on a task id resolves fine**, and the ids are embedded in the HTML
of a `meshy.ai/s/XXXXXX` share page.

`~/.meshy/fetch.py` wraps it: `info`, `get`, `remesh`, `rig`.

**Take the RIGGED task, never the raw one.** The same character exists twice on
the account:

| | triangles | size | usable |
|---|---|---|---|
| raw sculpt | 3,084,844 | 127 MB | no |
| rigged export | 28,765 | 20.8 MB | yes |

The raw sculpt is over the 320,000 rigging limit AND too large for the remesh
endpoint, which rejects it with `model file too large`. There is no API route
from one to the other — rigging has to happen on the website. That is almost
certainly why earlier attempts "didn't work".

So the workflow is: rig it on meshy.ai, then send the share link of the **rigged**
result. No zip, no upload.

## Police are in — and what is deliberately NOT built yet

`COMBAT.md` §9.5 has three parts. One is built.

**Built: heat, arrival, and the bite.** Heat rises per round, per body on the
ground and once for a firearm; past a threshold the police arrive at an END of
the board (§9.5.1, never the middle), and anyone of yours DOWNED when they walk
in is **taken** — off the roster, permanently, with an `arrested:<id>` memory.

Arrest is deliberately a separate ending from retirement. A veteran who got out
is a contact the city remembers and who trains the next one (§9.8); somebody
carried off a yard is a different fact about a different night, and every later
system reads memories.

**Built: the player's posture** (§9.5.2). Back off, or go back for them. The
entry end is now load-bearing rather than flavour: a fallen crew member far from
the police is pulled out free, and one under their feet is pulled out at the cost
of whoever went in — a body on its feet traded for a body on the ground, which is
usually a bad trade and is meant to be.

**Not built: the OPPOSITION's posture.** §9.5.2 gives both crews the choice. Only
the player is asked; the other side neither retreats, rescues nor engages.

**Not built: hostile police** (§9.5.3). Attacking them should turn them into a
third side that fights everyone. There is no third `Side` — the enum is PLAYER
and OPPOSITION — so this needs a real change to targeting and turn order, not a
flag.

**The numbers are a playtest gate, not canon** (`DESIGN_LOCKS` §13): 1 per round,
2.5 per body, 4 for a firearm, threshold 12. Chosen so a clean two-round rout
stays quiet and a long fight with bodies does not. Never played.

**Entry side is a guess.** They come in behind whichever side still has more
people standing, on the reasoning that whoever looks like they are winning looks
like they started it. Defensible, untested, and possibly backwards.

### A finding from writing the posture test

Driving a fight to its end and then asking the question does not work, and it is
not a test problem. By the time a battle resolves, the player side is usually
wiped or victorious, so **there is nobody left standing to go back for anyone** —
the rescue branch is unreachable at the end of a fight.

It only means something MID-fight, which is exactly when the police arrive in
play. Worth remembering when the opposition's posture is built: the same
constraint applies to them.

## The third side exists, and nobody is standing on it yet

`Fighter.Side` has a third value and a **disposition** — REACTIVE for police who
prefer non-lethal and do not start anything, HOSTILE for a rival crew that
attacks on sight (`COMBAT.md` §9.5.35). `is_enemy_of()` is now the only correct
way to ask whether somebody is your enemy.

**The trap this closed, before it shipped.** Everything read
`is_player_controlled == false` as "the enemy". A third party is not
player-controlled either, so it inherited every assumption about the opposition —
and `dropped_kit(false)` collected from all of them, which means **the player
would have looted the police**. Fixed at the two places that mattered, and gated.

**Still to build, in order:**

1. ~~Nobody spawns.~~ **Done.** Two to five arrive, scaled to how loud it got,
   placed from the middle lanes outwards at the end they came in at. They wear
   the white suit as a PLACEHOLDER — uniformed police get their own model later —
   and read in a cold institutional white rather than the opposition's red,
   because a two-way colour choice would have painted them as somebody to fight.
2. **They do not act.** A spawned third party needs a turn, and REACTIVE needs to
   mean something: subdue rather than strike, and only respond once provoked.
3. **Targeting is unwritten.** The ruling is "target logically" — nearest,
   the threat, whoever just hit them — and none of that exists.
4. **Attacking them does not provoke.** `provoked` is a field nothing sets.
5. **The board does not draw them.** `battle_stage_3d` maps two sides to two
   colours; a third needs its own read, and no model is cast for police.

## The scale fix did not work, and the gate did not catch it

Reported from a phone: buttons unchanged. They were about 15 CSS pixels, exactly
as before.

**The cause was in my test, not only my code.** The gate asserted a CONSTANT —
`48 * UI_TARGET_SCALE >= 44` — and never the control. It could not fail, because
the command bar never read that constant: its height comes from `MIN_TARGET`,
which the scale never touches.

**The fix is not scale at all.** The bar is now a FRACTION of the viewport, and
`get_viewport_rect()` is already in design units, so it compensates for whatever
the stretch is doing — correct whether or not `content_scale_factor` applies. On
a 412px phone that is a **78 CSS px bar with a 33px icon and a 20px label**,
against 15px before. The gate now sizes the bar against a phone-shaped viewport
and measures the button.

`content_scale_factor` is left in place but is no longer load-bearing, and
whether it works on the web is still unproven — the debug HUD now prints window
size, stretch, factor, effective scale, resulting button size **and a build
stamp**, so a stale cache announces itself instead of looking like a broken fix.

### The owner's target implies more than sizing

The reference layout is portrait-native, not this layout enlarged:

- ~~language and DEV move behind a hamburger~~ **done** — one control instead of
  four, and a gate presses it rather than inspecting it
- ~~a stat row with icons~~ **done** — sized from the screen, 17px icons on a
  phone against about 5 before
- ~~the title is roughly half the screen wide~~ **done** — 27 CSS px against
  about 9
- **five commands become four** — END DAY is separate in the target. Not done:
  it changes where ending a day lives, which is a design question rather than
  layout.
- map pins carry an **icon and a label plate**, and there is a **legend**. Not
  done, and the largest remaining piece — `city_map.gd` draws its own pins.

### A latent bug found while doing it

`_apply_chrome` decided "narrow" from `vp.x < 620`, but `vp` is in DESIGN units
and the stretch keeps the base width as a floor — so on a phone `vp.x` stays
about 1280 and **the narrow path never fired on the device it was written for**.
It now asks the window. The same mistake is the reason the earlier scale gate
passed while the interface shipped unusable: design units and real pixels are
different things, and reading one as the other is silent.

## The hamburger shipped as a tofu box, and my local run said it was fine

`☰` U+2630 exists in neither Noto Sans JP nor Godot's built-in face, so the one
new control in the header would have been an empty rectangle. Now `≡` U+2261,
which the source font has.

**CI caught it and my local check did not**, because after rebuilding the subset
I ran `test_locale` rather than `build-font-subset.py --check`. Those are not the
same gate:

- `build-font-subset.py --check` **scans every string in the code** and is the
  authority. It knew.
- `test_locale` checks the locale CSVs plus a **hardcoded list of symbols**. The
  glyph lived in a GDScript string, so the runtime test passed by not looking.

The symbol list now includes it, with a comment saying plainly that the list is
a fast warning and not the authority. The real lesson is about the order of
operations: **rebuilding a font and then running a different gate is not
verification**.

## Sörnäinen is open

Owner ruling: Kattilahalli, Suvilahti and Sörnäinen are all places where fights
and other dealings happen. The anchor existed as a `teaser` and the boiler-hall
arena had been registered art with nowhere to be.

- `sornainen_harbour` is **active**, and gains `market` and `faction` roles — it
  is a place with dealings now, not only docks and expansion.
- Two sites: **Suvilahti yard** and **Kattilahalli**.
- **`battle-kattilahalli-3v3`**, a Jade Lantern crew rather than more
  McCormicks. `NARRATIVE.md` puts that network's growth in restaurant fronts and
  firearms and the harbour is where it arrives — and `COMBAT.md` §8 needs a
  second faction, because the unbuyable tier has to come off somebody specific.
  One of them carries the chain.
- **First authored battle where death is eligible** (§9.10). A harbour hall at
  night is where it stops being a scuffle. Gated, so switching it off later is a
  decision rather than drift.

### Three pinned counts fired, and all three were right

Active anchors (8), authored battles (2) and map sites (10) are all asserted
exactly. Every one failed and every one had to be edited by hand with a reason.

That is the design working: **a place cannot become playable through a typo.**
Worth keeping in mind when the chapter schema lands, which will move far more of
these numbers at once.

### Still open here

- **Nothing routes you to Sörnäinen yet.** The anchor is active and the battle
  exists, but no encounter, mission or day in the schedule sends you there — so
  it is reachable only by `?battle=battle-kattilahalli-3v3`.
- The Suvilahti yard site has **no encounter**, so it is a name on a map.

## The map: a legend, and text you can read

- **A legend**, bottom right, drawn last because it is chrome rather than
  geography. Four pin states — open, seen-but-not-reachable, closed, something
  waiting — each drawn as the map draws it, so the panel explains SHAPE as well
  as colour. Until now a dashed orange ring, a padlock, a filled dot and a
  pulsing halo were four facts a player could only learn by clicking everything.
- **Pins and labels now account for the real screen.** `_scale` fits the map to
  its control and the control is in DESIGN units, which stay about 1280 wide on
  a phone — so an 18-design-pixel label was about 6 CSS pixels. `_device_gain()`
  is the ratio that was missing, and it is the same omission that made the
  command bar, the header and the stat chips unreadable. Labels are now 18 CSS
  px on a phone and unchanged on a desktop.

### Role icons in pins: NOT done, and deliberately

The reference layout shows a noodle bowl, a package, a temple. Those are
per-LOCATION marks, and the anchors carry 25 different `roles` against 12
generic icon kinds. Any mapping would be arbitrary symbolism that reads worse
than the plain dot it replaced.

This needs a designed icon set — art, not code — and it is the last piece of the
reference map that is genuinely outstanding.

## Chapters exist, and the persistence ledger is real

`GameState` has a chapter above the day, a goal with a type and a threshold, live
progress counters, and `begin_next_chapter()`.

**The ledger is implemented as the rule, not as a list:** what you BUILT
persists, what you were GRANTED does not. Gear, upgrades, contacts and people
carry a chapter boundary; money and mission unlocks do not. Gated in both
directions, and across a save.

Counters are fed centrally so a new way of earning cannot fail to count: the
fence feeds income, taking loot feeds the loot count, and settling a won battle
feeds the fight count.

### What is NOT built, and matters

- **Nothing ends a chapter.** `begin_next_chapter()` exists and nothing calls it.
  There is no ending mission, no clear condition wired to the schedule, and no
  screen that says a chapter is over. Today the slice simply finishes.
- **The goal is set in code, not content.** `chapter_goal` and
  `chapter_threshold` are variables with placeholder defaults (MONEY, 600). A
  chapter needs a goal type, a threshold and an ending mission id **in the
  authored content**, and the variety the design wants comes from that varying.
- **Ten days against a seven-day slice.** `CHAPTER_DAYS` is the owner's figure
  and the authored content is shorter, so chapter one currently ends before its
  tenth day exists. Deliberate: better a visible mismatch than pretending the
  content is longer.
- **Gear condition is still not per-instance.** `equipment_owned` is a flat list
  of ids and cannot express two pipes in different states, so new/used/faulty/
  broken (`COMBAT.md` §8.4) is still blocked on the same change.
- **Nothing decays.** Without decay, persistence plus re-runnable chapters is a
  farming exploit — that is the load the ledger is carrying and it is not
  carried yet.

## Gear wears out — and "you should own many pipes" corrected a design error

Owner correction, and it mattered. I was about to store condition per **type**,
justified by `take_loot` refusing a weapon you already owned. That refusal was
itself my invention, and it was wrong: a crew of four with a pipe each is the
ordinary case. Equipment is now **instances** — `{"id", "cond"}` — and the
duplicate refusal is gone.

- new → used → faulty → broken, one way only, stepping at a **chapter**
  boundary. One in eight breaks outright instead, because a break is felt as an
  event where a slide is not.
- **Resale follows the particular one**, not the kind. The fence lists one row
  per instance with its condition on the button, because two pipes in different
  states are two different things to sell.
- Losing kit takes the **worst** one; selling takes the **best** one. Both are
  what the person in that situation would actually do.
- Deterministic from seed and chapter, so the same run wears the same way.

### A real bug the decay test found

`to_dict()` returned the live collections rather than copies, so a save held for
a moment and then mutated — which `new_campaign()` does — **took the mutation
with it**. It now deep-copies. That was not specific to equipment; every
collection in the save had it.

### Still open

- **Nothing repairs.** Gear only ever gets worse, so a long campaign trends to
  broken with no counter-pressure. §8.4 does not say there is repair; if there
  is not, the pressure to keep taking things off people is the whole point and
  should be checked in play.
- **`faulty` has no mechanical meaning** beyond a lower price. §8.4 lists that as
  undecided: a chance to fail, reduced effect, or something weapon-specific.
- **`broken` is still usable.** Nothing stops a broken weapon being carried into
  a fight and working normally.

## Suvilahti is not the harbour — a geography error, corrected

Owner correction. Kattilahalli is in **Suvilahti**, the old gasworks; the
**docks** are the waterfront. I had filed both sites and the battle under
`sornainen_harbour`, merging two places into one.

`suvilahti` is now its own anchor with its own edges, and the Kattilahalli battle
moved to it. The harbour lost the `faction` role it should never have had.

**The real gasworks sit just EAST of the locked production boundary** (lon
24.9757 against an east bound of 24.974), so the anchor is placed at the frame
edge and marked `representative-inside-production-boundary` — exactly the
treatment `sornainen_harbour` already carries.

## A chapter can now be finished

Chapter one is authored content, not constants: a goal type, a threshold, and an
ending. `GameState` reads it, so varying the goal between chapters — which is
where top-level variety comes from — is content's to decide.

**The ending is an OPERATION at the docks, not a fight.** The GDD ruling doing
real work: if every chapter ended in a battle the market would be a supply line
to the real game. Buying a shipment and moving it is a climax in its own right.

The threshold buys **entry**; the operation **spends** it. You have to be at the
harbour and you have to have the stake — the same idea as `MAP.md` §12.5 one
magnification up.

### Still open

- **Nothing in the interface offers it.** `attempt_chapter_ending()` works and
  is gated, and no screen calls it — so a chapter still cannot be finished in
  play, only in a test.
- **The operation always succeeds.** There is no risk, no failure, and nothing
  the crew or the market can do to change the outcome. It is a transaction, not
  yet an operation.
- **Only chapter one exists.** Four are planned; chapters two to four have no
  authored goal, ending or content.
- **Three more pinned counts fired** — anchors, edges, active anchors — and all
  three were right.

## A chapter can be finished in play, and the shipment can go wrong

The ending is on screen, in the market rail beside the ledger and the fence —
because a shipment is a purchase, and putting it there says so. It appears only
when the threshold is met, shows the distance while it is not, and refuses from
the wrong place by naming the right one.

### The penalty could not be money, and that decided the design

Cash **resets** at a chapter boundary, so a fine levied at the end of a chapter
costs nothing at all. The persistence ledger therefore decides what failure can
take: only what carries. So the outcomes spend **gear and people**, and a clean
run buys a **built upgrade** — a stash house — because a payout would evaporate
the same way.

    clean   the container is gone and so are you; you gain the stash house
    messy   something was left on the quay; you lose a piece of gear
    lost    somebody did not come back; you lose a crew member

Resolved from crew size, from how many people you have already lost, and from a
seeded roll — deterministic, matching how gear decays, because a player who
reloads to reroll a shipment is playing a different game.

### Two gate lessons

The locale gate reported three live strings as stale because the key was
assembled into a local variable: it scans the SOURCE for interpolated keys, and
`var key := "..." ; tr(key)` is invisible to it. Then the fixed comment quoted
the pattern literally and got scanned as a key itself. Both are now handled, and
the scanner understands prefixes with a suffix after the dot.

### Still open

- **The operation is one roll.** No crew choice, no route, no equipment brought
  to bear. It reads as a dice throw with a nice sentence attached.
- **Only chapter one exists**, so `begin_next_chapter()` moves into a chapter
  with no authored goal or ending.

## Classes and progression — the data exists, the verbs do not

`COMBAT.md` §9.11 is authored as content: six combat classes with a verb, a
weapon family and a look family, plus the five perk axes. Per-person levels,
skills and perk points are in `GameState` and gated, including that a second
crew member of the same class knows none of it.

**Levels come from fights**, which is the same clock the career ceiling runs
down. That is deliberate: somebody becomes good on exactly the clock that is
running out for them.

### Two silent failures worth recording

- A `new_campaign()` reset was written against a line that no longer existed, so
  it **did nothing** and growth leaked between campaigns. The patch had no
  assertion on that particular replacement; the ones that did have assertions
  failed loudly and got fixed immediately. **Every edit needs its own assert.**
- `skills_of()` shipped with a nonsense boolean expression that happened to
  compile. The test caught it at runtime, not the parser.

### What is NOT built

- **None of the six verbs exist.** PIN, COVER, OPEN, LINE, MARK and SHOVE are
  strings in a table. MARK and COVER have the most support already: MARK is the
  intel the telegraph waits for, and cover mechanics are complete.
- **Nothing offers a skill choice.** `learn_skill()` works and nothing calls it;
  there is no list of skills to choose FROM, and §9.11 wants two or three offered
  per level.
- **Nothing awards glory.** `grant_glory()` exists; near-death survival and
  double kills are not detected.
- **Perks do nothing.** Strength, Speed, Wits, Nerve and Toughness are counters
  that no rule reads.
- ~~The migration has not started.~~ **There is no migration.** Owner ruling
  §9.12: the two vocabularies were never competing — the old six describe what
  somebody is FOR and the new six what they DO in a fight — so they are now one
  pool of **twelve aptitudes**, and a person holds two or three of them. Nothing
  had to be moved, which made the better answer the cheaper one as well.

## Aptitudes replaced the migration

A person is not labelled. Twelve aptitudes, each with its own verb; a hire rolls
two, sometimes three. Appearance follows the FIRST one so the look family still
reads, and `verbs_of()` is the point — more than one aptitude means more than one
thing you can do to the board.

Authored crew fall back to their `role`, so nothing broke by adding this.

### Still not built

- **The verbs still do nothing.** Twelve of them now instead of six: pin, cover,
  open, line, mark, shove, steady, deliver, read, talk, extract, know. Not one is
  implemented.
- **Skills are not keyed to aptitudes yet.** §9.12 wants the offer drawn from the
  pools a person holds, and a third aptitude to widen and shallow it — the trade
  that stops three being strictly better. `learn_skill()` takes any string.
- **No skill list exists at all**, so there is nothing to offer.
- **Authored crew hold exactly one aptitude**, their old role. The interesting
  people are combinations, and the six hand-written ones are the least
  interesting crew in the game as a result.

## Thirty-six skills, three per aptitude

Authored, gated, and offered from the pools a person holds. Each aptitude gets a
straight one, a positional one, and one with a twist — something that costs as
well as gives, or that reaches a system you would not expect a fighter to touch.

**Every skill names the system it `hooks` into**, so a skill nobody can implement
is visible as one rather than being discovered during the build. The hooks in use:
cover, pin, intel, telegraph, heat, police, nerve, condition, rescue,
deployment, reposition, withdrawal, stand-down, loot, equipment, initiative,
shove, third-party.

**Breadth is a trade, and it is gated as one.** A third aptitude widens the pool
and the offer stays three, so it costs depth rather than adding power.

Offers are **deterministic** from seed, person and level — a level-up that
rerolls on reload is a slot machine, not a decision.

A few that reach further than expected, on purpose:

- **Back door** (driver) — you know which end the police come in at, and you
  chose it. Reaches into §9.5.1.
- **Names** (fixer) — somebody who runs was never here, and does not raise heat.
- **Spare keys** (driver) — one of yours on the ground is not taken.
- **Who lives here** (local) — third parties do not turn on you, even provoked.
- **Loud** (muscle) and **One in the air** (shooter) both make the night noisier
  as their cost, which ties a fighter's choices to the meta.

### Not built

- **No skill DOES anything yet.** All thirty-six are data with a hook named and
  no code behind it. Same for the twelve verbs.
- **Nothing offers the choice on screen.** `skill_offer()` is gated and no
  interface calls it, so a level-up currently grants a perk point silently and
  nothing else.
- **Tiers are unbalanced by inspection, not by play.** Tier 3 skills are the
  showy ones and nobody has checked that a level-3 crew member is not simply
  better than two level-1s.

## Reading is a ladder that starts in the middle

`FightManager.Read` — INTENT, AIM, AHEAD. Base is **AIM**, the middle, and
everything else moves you along it.

**The floor is a promise.** Into the Breach telegraphs everything and Mewgenics
always shows intent, so what varies here is **precision, never whether you are
told**. Cover and distance cost you the lane; they can never cost you the
warning. A gate asserts that under a debuff of 99.

**A finding that made this necessary.** `_ai_preferred_target_lane` always
returned a real lane, so `target_lane = -1`, its comment, and the translated
string "aim unclear" were **written, translated and unreachable**. The fog the
design asked for had never existed.

Three channels move you along the ladder:

- **Down, by the board** — distance from your own front, and standing behind
  something the yard supplied. Both reuse facts the fight already knows.
- **Up, by the crew** — Wits, and holding `spotter` or `watcher`. The best reader
  you have sets it, which is what makes a Spotter worth **deploying** rather than
  worth spending a turn on.
- **Down, by debuff** — `read_penalty`, plus a SHAKEN reader contributing less.
  A debuff can take the reader away rather than only the sense.

### Still open

- **MARK itself is not built.** Presence pays; spending a turn to mark one target
  for an exact read does not exist yet. That was the plan: presence gives the
  partial read, the action gives the precise one.
- **Nothing sets `read_penalty`.** The channel exists and no skill, weapon or
  event pushes it — the flare and `one-in-the-air` are the obvious first users.
- **AHEAD shows a string, not a forecast.** At the top of the ladder the
  telegraph says "and the one after" without actually computing the next round.

## Two verbs actually do something now

**MARK** (Spotter). Presence already improved the crew's read; MARK is what they
**spend a turn** on, and it buys the top of the ladder on one person — a full
dossier, outranking cover, distance and any debuff, because somebody is standing
there watching them specifically.

**Duration follows the skill**, per owner ruling: a bare Spotter gets a glance,
`call-it` makes it stick for a few rounds, `watch-the-hands` lasts the whole
fight. Refused rather than silently ignored for a non-Spotter, an inactive unit,
or your own crew.

**COVER** (Anchor). Cover had always been something the arena supplied and
something that happened TO a unit. It is now something a person DOES.

**In layers**, per owner ruling: one cell to begin with — the person directly
behind you, so the first version is about facing — widening to three with
`take-it`, and turning from soft to hard with `wall`. The resolver asks one
question and does not care whether the answer is a bin or a body; a body is asked
FIRST, because somebody chose to stand there.

**AHEAD is a dossier, not a forecast** (owner ruling). Stats, guard, nerve,
tempo, what they carry, and — for anyone with a record — their aptitudes, skills
and perks. That removes the problem flagged earlier: a predicted round would be a
claim the fight cannot keep, where a dossier is only ever a fact about now.

### A real bug the gate found

`aptitudes_of()` fell through to `ContentRegistry.crew_member()`, which pushes an
error for an unknown id. Opponents and third parties carry a `character_id` that
is not a crew id, so asking about them — which the cover check now does every
frame — spammed the log. `has_crew()` makes the question askable.

### Still open

- **Four verbs of twelve exist in some form.** PIN, OPEN, LINE, SHOVE and the
  older six are still strings.
- **Nothing in the interface offers MARK.** It is callable and gated; no button
  spends a Spotter's turn on it.
- **`take-it` and `wall` now do two things each** — their authored text describes
  absorbing harm and being hard cover, and they are also the width and hardness
  switches. That is convenient and not obviously right.

## Reachability pass — MARK, glory, and a board that answers back

Owner direction: make what exists reachable before building more. Several
systems had been callable and unpressable, which by CLAUDE.md rule 6 means
unfinished.

- **MARK is a real command**, not a side effect, because it costs the round — a
  free mark would make the aptitude strictly better than not having it. Offered
  beside the ordinary actions since it competes with them, and the forecast says
  how many rounds the read will last before the round is spent.
- **Glory is detected at the hit** (owner: level and glory should register in the
  moment). Two in one round, or still standing on almost nothing. The double
  tally clears with the round, or a kill three rounds later would count.
- **The board has a feedback layer at last.** `event_resolved` had always been
  emitted and never listened to — things happened and nothing on screen
  acknowledged them. Glory is its first user: a rising, fading mark with a
  widening ring, since motion is found before text.

### Two mistakes worth recording

- I connected `event_resolved` before `fight` existed, which took the battle UI
  suite from 28 passing to 8. Caught immediately, and only because that suite
  drives the real screen rather than the model.
- I added a second `_process` to a file that already had one. The parser caught
  that one instantly.

### Still not reachable

- **The level-up choice.** Owner ruling: it should interrupt at the moment of
  levelling. `skill_offer()` is gated and no screen shows it, so a level still
  passes silently.
- **Perks read nowhere except Wits**, which feeds the read ladder. Strength,
  Speed, Nerve and Toughness are counters no rule consults.
- **Eight verbs remain strings.**

## Levelling is reachable — felt in the fight, spent on the crew screen

`UX_SPEC.md` §19, built.

- **In the fight**: a level puts a mark over the person and nothing waits for an
  answer. `GameState.crew_levelled` is a new signal the board listens to. A modal
  mid-round would break the one thing the fight protects — that committing is
  decided with the whole board visible.
- **At the summary**: a button when anything is waiting, counted across the
  **whole roster** rather than only who fought, because a point earned two
  battles ago is still unspent. Skipping is always available.
- **On the crew screen**: the skill offer and the perk buttons, beside who the
  person is. One screen per PERSON rather than one per SYSTEM.

**A level buys a skill OR a perk, not both** — learning spends the point. That is
a balance decision made in passing and it should be checked in play.

The gate asserts the ROUTE rather than the model: the crew screen must actually
grow buttons when something is waiting, and quiet down when it is spent.

### Still not reachable

- **Perks read nowhere but Wits.** Strength, Speed, Nerve and Toughness are
  counters no rule consults, so spending a point on them changes nothing yet.
  This is now the sharpest gap: the screen offers a choice the fight ignores.
- **Eight verbs remain strings.**
- **No sound.** §19 says a level is seen AND heard; there is no audio in the
  project at all.
- **The map does not show mission steps or blink new missions**, which §19 needs
  for the way back from the summary to mean anything.

## Fifty-two skills, and perks the fight reads

Sixteen more skills, spread across all twelve aptitudes (4–5 each). This pass
leans on twists rather than straight bonuses: **No mercy** finishes somebody
already down and is loud with it; **Last one standing** halves everything while
you are the only one upright; **Two quick** strikes twice at half force and lets
cover eat the first; **Grab them** shoves an ally; **Everyone knows** slows heat
on your own street; **Owe me** turns a stand-down into a debt.

**And the four dead perks now do something**, which closes the sharpest gap in
the tree: the crew screen had begun offering Strength, Speed, Nerve and
Toughness while the fight consulted none of them. Worse than not offering it,
because it is a promise the combat does not keep.

- **Strength** is read at the swing rather than folded into the weapon, so the
  person and the tool stay two visible contributions.
- **Toughness** and **Nerve** raise the maxima, applied once at build so they do
  not drift mid-battle as points are spent.
- **Speed** moves you up the order.
- **Wits** already fed the read ladder.

**Deliberately one point at a time.** Bought across a ten-fight career, a large
step would make a veteran a different unit rather than a better one — and §9.10
already says a veteran should be harder to kill, not unkillable. Gated at both
ends: a real step, and a small one.

### UI look — an honest status

Sizing is fixed; the LOOK has not moved. The reference gets its character from
art direction: pins are icon medallions on coloured discs with a label plate,
routes are thick coloured dashed lines with arrowheads, and the map reads as
textured collage. Ours are rings with a dot on flat drawn shapes.

The blocker is a decision recorded earlier — pin icons were declined because 25
anchor ROLES onto 12 generic icons is arbitrary. That still holds, but the
reference's icons are **per-site** (noodle bowl, package, temple) and there are
about six. `PiritoriIcon` draws vector icons in code, so this needs no credits.
**Highest-impact visual change remaining.**

## Found while fitting the carton chrome (2026-08-24)

- **The portrait capture has been lying.** `tools/capture.gd` sets
  `content_scale_size = Vector2i(390, 844)` for the phone shot, so the shell
  lays out in 390 design units. The real build stretches `canvas_items` from a
  1280×720 base, so a phone gets ~1280 design units and everything is a third
  the relative size. Every portrait review shot taken this way has shown a
  layout no device produces — which is very likely part of why the first scale
  fix "did nothing". Engine/tools lane.
- **A chrome gate.** Nothing asserts the UI material is applied: swap a
  `StyleBoxTexture` back for a flat fill and all 672 checks stay green. A cheap
  real one — assert the command bar's panel is a `StyleBoxTexture` and that its
  torn edge really has transparent pixels in the top row. Engine lane.
- **`market_ledger.gd` and `news_event.gd` still build flat boxes.** They were
  out of the pass's reach; they will look like the old game beside the new one.

## Owner observation, 2026-08-24, not yet acted on

**"Even crew looks like 2d pasted marionettes."** About the 3D board, and it is
a different problem from the chrome — that pass touched only the UI on top.
Candidates, cheapest first: the figures are lit by the stage's ambient and rim
only, so they take no light from the sodium lamp and read as stickers; there is
no contact shadow under a fighter, which is most of what glues a figure to a
floor; and the idle pose is a single frame per body, so a standing crew is
literally static cardboard. Worth confirming which of the three it is by
capturing the battle before changing anything.

**Owner's read, 2026-08-24: none of the three. "Bad and old art."** The three
candidates above are all rendering fixes, and the diagnosis behind them is
wrong — the source art is the problem, not the light falling on it or the
shadow under it. Lighting a bad figure better produces a better-lit bad figure.

This promotes the item from a note to a **lane: Art**, and it changes what the
first step is. Not a capture of the battle to tell three rendering causes
apart; a look at what the crew bodies actually are and when they were made,
against what `ART_BIBLE.md` asks for now. The Sprint 1 audit is the precedent —
its dog was called "the best-looking image in the set and the furthest from the
Art Bible", and the fix there was not to render it better but to redraw it
(`art-src/concepts/sprint1/v2/`).

Do not re-rank the three candidates. They stay written down only so nobody
proposes them again as the cause.

## The plates are drawn for a desk, and reviewed on a phone (2026-08-24)

`ux/kallio-master.svg` is 1872x1266 and `ux/helsinki-era2-master.svg` is
1483x1266 - landscape sheets with a right-hand legend column in ~10px type. The
owner reviews on an iPad or a Pixel 10, and `CLAUDE.md` rule 3 already says
testing happens on a phone with no console and no diff. At phone width the
legend is unreadable and the whole point of a legend is that it is read.

Not a rendering bug - the sheets are correct and the tool is sound. It is that
the one device they are looked at on was never in the layout.

Cheapest first, and none of these has been tried:
- a `--portrait` flag on `master-plate.mjs` that stacks the legend UNDER the
  map instead of beside it, at ~1000px wide
- type floor of 28px at that width, which is what survives the downscale
- or accept it and cut a separate phone plate, which is the answer that grows
  two lineages of one thing and 11.1 already warns against that

Lane: Content (map tools). Raised while answering a question about the owner's
viewport, not acted on.

## palette.gd neutrals, and three colours the Art Bible does not name (2026-08-24)

**This entry replaces an earlier one that was wrong.** It claimed `palette.gd`
had drifted from the night palette and shared no hex value with it, and that all
approved art had been judged against unused colours. `DESIGN_LOCKS.md` §12.3 -
the palette lock - records the correction: all eight signal colours are identical
across `ART_BIBLE.md`, `palette.gd` and both reference layouts. There is no
divergence to reconcile.

What is genuinely outstanding is small and not urgent:

- **Three neutrals sit dE 2.4-5.3 from their Art Bible values.** `PANEL #11151A`
  against `night-paper #121719`, `PAPER #D8D2C4` against `paper-offwhite
  #E2D8C2`, and the card grey. Rounding drift. Move `palette.gd` to the Bible's
  values; the Bible is canon rank 7 and the code is the implementation.
  Engine lane.
- **`MAP_GROUND`, `MAP_RELIEF` and `MAP_WATER` exist in code and not in the
  Bible.** That is a gap in the Bible rather than an invention in the code - the
  map needs those three and nothing names them. Naming them is Art lane, and the
  rendered target `art-library/references/ui-target-city-map-v01.jpg` shows what
  they should be.

Neither blocks art approval, which the earlier version of this entry wrongly
said it did.

## What the first honest captures found (2026-08-25)

The fixed capture tool and the new Piritori scene went through the full loop -
generate, register, wire, import, capture - and the captures came back with a
list. Recorded here instead of half-fixed:

- **CORRECTED 2026-08-27: it was THREE, not four, and one is now done.**
  `jaska_studio` already had art — `scene-club`, shipped in PR #11 — so this
  entry had been stale for two days. Checked by asking the loader's own rule
  (`asset.location == site.anchorId`) which sites actually resolve, rather
  than by re-reading the note. `staffed_bank` now has
  `scene-bank-counter-v01` and renders in the running game, verified by
  capture rather than by the manifest saying an id exists — the capture tool
  gained a `piritori-site-*` shot for exactly that.

  **Still placeholder: `harju_pitch` (harju, 1 encounter) and
  `jade_lantern_front` (linjat_yard, 1).** Both are one-encounter sites, so
  this is the low-value tail of the job.

  Two things worth reusing from doing the bank: attach an approved scene as an
  IMAGE reference rather than describing the painted register in prose (the
  same trick its own sidecar uses), and expect to spend a second pass purely
  on composition — the first one read "cut-cardstock with torn fibrous edges"
  literally and drew an actual paper border with a dead black band over the
  bottom 40% of the frame.

  Also note `art-src/scenes/jaska-studio-A-v01.png` and `-B-v01.png`: two
  finished, unused alternates for Jaska's own studio, superseded by the Scene
  Club direction. Kept, not shipped.

  The original entry follows.

- **Four sites still play over the labelled placeholder**: `jaska_studio` (3
  encounters), `staffed_bank` (3), `harju_pitch` (1), `jade_lantern_front` (1).
  Each needs its own scene in the painted-night register; none of the nine
  existing scenes fits honestly. Art lane, one scene at a time, the
  Piritori/Hakaniemi pair is the template.
- ~~**The opening line overflows the frame in portrait.**~~ **FIXED 2026-08-25,
  and it was not a text bug.** The command bar pinned every command to at least
  96 design units wide; five of those plus separation is a 665-unit minimum, and
  a phone at the shipped UI scale has ~410 units. The bar forced the WHOLE SHELL
  to 665, so every screen above it was cut off at the right edge — the hamburger,
  the ends of every line, the fifth command. The command floor is now derived
  from available width, and the words drop to icons when they no longer fit
  beside them. 665 -> 415 against a 410 viewport.
- ~~**The location screen is still flat boxes against the Toko target.**~~
  **DONE 2026-08-26.** Concept A (owner-approved, "a works") is built as real
  procedural UI: `PiritoriChrome.medallion()` is a new torn-ring generator
  matching the existing hash-grain technique; the dialogue text sits on
  `PiritoriChrome.plate()` (already existed, no new drawing code needed for
  that piece); LOOK/ACT/LEAVE are torn-card buttons with three new
  `PiritoriIcon.Kind` glyphs (INFO/RISK/LEAVE) and per-row accent colour.
  Verified against the real Toko encounter via a new capture harness,
  `tools/capture_location_band.gd` — kept, alongside the existing
  `capture_*.gd` tools, as a standing check for this screen.

  The medallion (ringed portrait + NAME plate) from concept A was built,
  verified, then CUT on review 2026-08-26: the standing figure already IS
  the portrait, so a second small face in the rail duplicated it rather than
  identifying anything new. Removed along with everything that existed only
  to support it — `PiritoriChrome.medallion()`, `presenter_3d.display_name()`,
  the app_shell mount — rather than left in the tree unused. If a future
  screen wants a circular frame, `chrome.gd`'s `_pixel()`/`_bite()` pattern is
  the reference for doing it again, not a resurrected copy of this function.

  Three unrelated, real bugs surfaced by actually rendering the full figure
  rather than the tight BROADCAST crop, all fixed in the same pass:
  - `_lower_arms()` matched bone names containing "arm" OR "shoulder"; this
    rig has both a `Shoulder` bone and a child `Arm` bone, so both rotated and
    compounded past vertical, swinging the arm behind the torso — invisible
    on Arvo (BROADCAST crops below the shoulder), and read as "no arms" on
    Toko standing at his own counter. Fixed to rotate only the upper-arm
    bone, and the angle re-tuned by rendering candidates side by side (72°
    alone undershot; 100° lands the hand naturally on the counter).
  - A `SubViewportContainer` pre-set to its own final size never fires
    `NOTIFICATION_RESIZED`, so `presenter_3d.gd`'s internal viewport-size sync
    (which only runs on that notification) never ran — the medallion's INSET
    presenter rendered a fully transparent nothing, not a visibly broken
    something, which is why it read as "no bug" until the pixels were sampled
    directly. Fixed by leaving sizing to anchors alone, like every other
    mount of this component.
  - `location_stage.gd`'s `_ready()` unconditionally rebuilt the text layer
    even when `setup()` had already built it (which happens whenever `setup()`
    runs before the node enters the tree, which app_shell.gd always does) —
    a duplicate, empty-text card clobbered `_copy`/`_card`, while the
    original, correctly-populated one sat on screen unreferenced and
    un-fittable. Guarded with the same `if _copy == null` `setup()` already
    used.

  Not done: the ACT row's icon is the same blade/RISK glyph for every choice
  regardless of whether it is actually risky (e.g. "Eat, listen, owe a
  favour" gets the same icon as "Risk sabotage — €300") — a deliberate scope
  cut to ship the three approved glyphs rather than invent a fourth, but
  worth a look once more encounters exist to judge it against.

- **The bottom command bar was five permanent tabs against its own spec.**
  `UX_SPEC.md` §3.1 ("The five modes") says plainly "these are full
  interaction modes, not five permanent bottom tabs", and §3.3 ("Navigation
  model") names the planning dock as CITY / LEDGER / MESSAGES / MENU, with
  `WAIT / CLOSE BLOCK` "an explicit City action beside the clock, not a
  primary navigation tab." The build had drifted to Route / Crew / Missions /
  News / End Day, five buttons, plus a separate header ≡ for settings.

  Fixed to the MINIMAL spec-conformant shape (owner's call, 2026-08-26,
  choosing this over the fuller rebuild below): the bar is now four —
  `cmd.city` (renamed from `cmd.route`, was already `_show_city`) / CREW /
  `cmd.messages` (renamed from `cmd.news`) / MISSIONS. END DAY moved beside
  the day/block chip in the header as its own small button
  (`_add_end_day_button()`), off the bar entirely. The title "PIRITORI →
  EDEN" now shows only on City — the de facto home screen, since no splash
  screen exists — and is hidden everywhere else via a new `_set_mode()`
  that all six mode switches now go through, instead of assigning `mode`
  directly.

  Not done, and bigger: `UX_SPEC.md` §8.2 wants Ledger as ONE mode with four
  persistent sections (Market, Crew, Loadout, Obligations) — Loadout and
  Obligations do not exist as screens at all yet, so a real merge is a
  multi-screen build, not a rename. §6.6.2 wants missions badged on the map
  itself with a legend/pointer list, which also does not exist — Missions
  currently only has its own standalone list, so it stayed on the bar rather
  than becoming unreachable. Both are the honest next step toward the
  three-item dock (CITY / LEDGER / MESSAGES) the spec actually asks for.

- **`node godot/tools/sync-data.mjs --check` fails on `main` right now**,
  unrelated to the location-screen work above: `data/kallio-era1-2003-v1.json`
  and `data/art-v3-manifest.json` have drifted from their sources. Neither
  source file appears in this session's diff, so this predates it — most
  likely a prior PR merge that updated the source but never re-ran the sync
  script before committing. `CLAUDE.md` rule 7 says run
  `node godot/tools/sync-data.mjs` rather than hand-edit `godot/data/`; this
  was left alone rather than bundled into an unrelated commit.

- **The city map's anchor labels were massively oversized** (reported
  directly, 2026-08-27: "map names are way too big"). Root cause:
  `city_map.gd` had its own `_device_gain()`, a second independent
  implementation of the exact "phone is small, scale up" fix `app_shell.gd`'s
  `content_scale_factor` already applies to the whole window — multiplying
  BOTH together on labels, pins and tab-tears compounded to roughly 10x.
  Removed `_device_gain()` entirely; everything it touched now just uses the
  same design-space clamps as the rest of the shell, correctly stretched
  once by the engine.

  Labels were also shown for every anchor regardless of zoom — twelve names
  fighting for the same small board. Now a label draws only for the
  SELECTED anchor (the click) or a LIVE lead (the minimum needed to still
  find an actionable place without clicking everything), matching "should
  mainly appear when clicked... smaller text can be there as long as
  visibility remains." The existing rail the `anchor_selected` signal opens
  already IS the "small quick view menu" asked for — nothing new needed
  there.

  The legend (already built, §6.6.2) was there but invisibly clipped past
  the right edge of the screen — a real, separate bug found while
  investigating the label sizing: this Control's own `size` can end up wider
  than `get_viewport_rect()` after a runtime resize (proven in isolation;
  root cause not fully chased down, see below), harmless for content that
  fits ITSELF to `size` but fatal for the legend's hard corner anchor.
  Clamped against the true visible rect rather than trusted to match it.
  Also reordered `app_shell.gd`'s two `size_changed` listeners so
  `_apply_ui_scale` always runs before `_reflow` (was backwards; correct
  regardless, even though it did not turn out to be this bug's cause).

  **Not fully explained:** why `city_map`'s Control.size (480 design units,
  observed) exceeds `get_viewport_rect()` (410.5, observed) after a resize
  even when `AppShell` is parented exactly like a real launch (tested
  directly, ruling out "it's just the capture harness"). The legend clamp
  makes this harmless where it was visible; it may still be under-fitting
  the map's own relief/pins by the same small margin, which reads as
  "slightly more zoomed out than ideal" rather than as a visible bug. Worth
  a real investigation if anything else ever hard-anchors to this control's
  edge.

- **Squares removed, land re-coloured, real streets and water wired in
  (2026-08-27/28, direct feedback across several rounds).** In order:
  - The procedural block-grid (`_draw_blocks()`) was suppressed — see that
    function's own comment. It read as filing-cabinet texture competing
    with the pins and lines drawn over it; "the squares should be gone
    first and take it from there."
  - `MapStyle.LAND` moved off the same hue family as the water colours
    (`#171d20` shared its R channel with `#102530`/`#0f2934` — land was
    reading as "slightly less blue water") to a neutral warm grey
    (`#4a4844`), on "only water should be blue."
  - Real coastline (`map/kallio-water-v1.json`, already extracted for the
    offline plates per `TRANSIT_LAYERS.md` §11.2) is now drawn in the
    board's own water backing — real bay shapes instead of a flat rect.
  - Real streets are new: `map/tools/streets-import.mjs` (Overpass, same
    pattern as `water-import.mjs`) produced `map/kallio-streets-v1.json` —
    3624 real OSM ways in the Kallio box, classified major/mid/minor by
    `highway=`. `build-map-geometry.mjs` clips them to the board's own
    hand-drawn landmass at BUILD time (`clipRunsToLand()`, ray casting) —
    the first render fetched by lat/lon box and not by the actual
    coastline, so streets sailed off the edge into open water until this.
    Drawn behind the locked major-road geometry and the transit lines, so
    the canonical hand-placed roads stay the loudest thing on the board.
  - Tram-line topology was cross-referenced against the owner's own
    reference photo directly: both it and this board's `public-transit`
    layer come from the same real HSL GTFS extract
    (`map/kallio-rail-v1.json`), so the branching pattern already agreed —
    no routing correction was needed, only the earlier fixes above.
  - `1T` is excluded from the transit layer by name (owner's diagnostic
    request, "take out 1T and see if the others are real") — a real HSL
    short working, not a data error, and reversible by deleting one line
    in `build-map-geometry.mjs`'s `EXCLUDED_SERVICES`.

  Not done: `streets-real`'s `minor` tier (2403 of 3624 ways — residential,
  unclassified, living_street, pedestrian) draws at low opacity by default;
  worth a look at whether it should be heavier, lighter, or gated behind a
  zoom/selection state once there is feedback on it specifically. `8T`
  still draws with its own chip and may want the same "too many stops"
  scrutiny 1T got.

- **The land shape is real now, not hand-drawn** (2026-08-28, direct
  feedback: "the map is not aligned at all with real maps, start from
  scratch with the PR layers and then add details"). Overlaying the old
  hand-drawn `land-relief` "land" polygon against the real coastline showed
  why: a rough rectangle that ignored every real bay, the island and the
  harbour complexity, while the streets and transit lines drawn on top of
  it were already real and correctly positioned — sitting on a silhouette
  that was not.

  `build-map-geometry.mjs`'s new `buildRealLand()` derives the shape from
  real streets and real anchors instead of the coastline. Three different
  coastline-only flood-fill attempts failed first, in order, and are
  recorded in that function's own comment because the next person will try
  the same things: seeding from the grid border (leaked across Kallio's
  coastline-free north), seeding from the "sea side" of every coastline
  segment per OSM's own left-hand convention (one reversed way among 27
  flooded almost the whole grid from a seed that was actually on land), and
  treating each water area's outline as a barrier (safe, but left no way to
  seed the open sea at all, so everything but the explicit bays read as
  "land" — the opposite failure). Each was caught by dumping the raster and
  looking at it, not by trusting a cell count, which changed for a
  plausible-sounding reason each time and was wrong twice anyway.

  The fix uses a different, unambiguous signal: real streets exist only on
  land, no directionality to get backwards. Land is a buffer around real
  street points and real anchors, with enclosed gaps filled (a city block
  with no road through its own middle is not water), then the real bays
  carved back out last. Emitted as merged rectangles rather than a traced
  outline — two real bugs in a hand-built contour tracer (a broken
  marching-squares table, then a trace that silently stopped at a
  one-cell-wide pinch) cost more time than a smooth outline is worth for
  what is fundamentally a backdrop everything else already sits correctly
  on. All 14 board anchors verified to land inside the result.

  A standalone twin, `map/tools/land-from-coastline.mjs`, exists for future
  tuning (`LAND_DEBUG=1`, `LAND_DUMP_RASTER=1` env vars dump a raw raster to
  eyeball) and must be kept in sync BY HAND with `buildRealLand()` if either
  changes.

  Not done: the buffer radii (26/20/16 board units by tier) and the anchor
  buffer (55 units) were picked once and eyeballed on a render, not tuned
  against a measured block size — worth a look if the land shape reads as
  too generous or too thin around any particular street once there is
  feedback on it specifically.

- **Still open, asked and not yet answered:** whether the Suds-Jack arcade
  hub is supposed to carry both a Godot build and a separate lighter JS
  version side by side. Interrupted before it was investigated — the
  now-orphaned old `piritori/` JS-prototype folder on Suds-Jack's
  `gh-pages` (noted earlier in this file, "Download weight" section) is
  probably the same question from the other direction.

- **The land was real but the view was still fitted to the fake shape**
  (2026-08-26, direct feedback: "the grey can continue on the right as
  well. add some bigger streets"). The harbour/Sörnäinen side was missing
  two separate ways, both engine bugs rather than missing data:

  1. `streets-import.mjs`'s Overpass query excluded `highway=service` and
     `highway=track` — exactly the road classes common in a harbour and
     industrial area. Re-fetched with them included (`TIER` maps both to
     `minor`); `kallio-streets-v1.json` grew from missing that whole
     texture to covering it, and `land-real` fell from 1037 to 850
     rectangles — fewer but more contiguous, the shape closing up rather
     than fragmenting.
  2. The real fix: `city_map.gd`'s `_rebuild_layout()` — the function that
     fits the whole board into the screen — was still measuring its
     bounding box from `land-relief`, the retired hand-drawn SVG rectangle
     the real land shape replaced two rounds ago. `land-real` is genuinely
     wider than that old rectangle, so the fit box was too small and the
     real land, streets and transit past its edge were drawn correctly but
     scrolled off past the visible Control's own clip — reading as a hard
     cut a good deal short of the true coastline. Refitting the bounding
     box to `land-real` itself was the actual fix; the harbour texture had
     been correct in the data since the streets round, just not shown.
     Also boosted major/mid street line weight (alpha 0.60→0.78/width
     3.2→4.8, and 0.40→0.55/1.9→2.6) per "add some bigger streets", with
     minor tier trimmed slightly (0.20→0.16, 1.1→1.0) since it nearly
     doubled in count from the service/track roads.

  One more thing surfaced only by re-running the full gate suite, not
  asked for: `_draw_backing_and_water()` was throwing "Invalid polygon
  data, triangulation failed" every single frame, for six of the real
  water areas out of the water-import fetch — four were zero-area (a
  closed OSM way whose first and last point round to the same board
  pixel, seen on a few of the small decorative ponds/fountains the same
  fetch also picked up), two were genuinely self-intersecting. Both are
  now filtered out at build time in `buildWaterOverlay()`
  (`hasArea()`/`isSimple()`), rather than drawn and silently failing.
  Worth a look some day why those two specific OSM ways self-intersect —
  not investigated, just kept off the board.

  The metro's own real endpoint (Kalasatama/Itäkeskus direction) still
  runs a short stretch past the fitted land edge with no grey under it —
  its real board coordinate is about 130 units east of the nominal
  1000-unit board, beyond `buildRealLand()`'s 60-unit pad, and every rail
  line's raw shape already ran hundreds of units past the board before this
  round (checked: e.g. tram `6`'s y-range alone is -215 to 1204). Reads as
  the line continuing into the unmapped rest of the city rather than a
  bug, and left alone rather than guessed at — a real fix, if one is
  wanted, would be raising the query box on `streets-import.mjs`/pad on
  `buildRealLand()` enough to cover it without pulling in the far-flung,
  unrelated street segments a raw Overpass fetch also returns, which needs
  its own pass, not a PAD bump today.

- **A second pass, direct feedback 2026-08-26: "closer, but do some more
  passes with bigger roads, maybe larger landmarks."** Major real streets
  went 4.8→6.6 width / 0.78→0.88 alpha, mid 2.6→3.6 / 0.55→0.66, minor left
  alone on purpose (it is the fine grain the majors are meant to stand out
  of). Anchor pins went 28→34 board-scaled radius, with the touch-target
  hit rect in `_rebuild_layout()` grown to match (26→32) so the drawn size
  and the clickable size do not drift apart again.

  Found re-running the gates for this, not asked for: `tests/test_shell.gd`
  called a `_device_gain()` method on the map that an earlier round this
  same session had already deliberately removed (the fix for oversized map
  labels turned out to be showing fewer of them, not scaling them bigger —
  see `city_map.gd`'s `_draw_labels()` comment) — the call hit a hard
  GDScript runtime error and silently aborted the whole test function
  before a single assertion ran, so "0 failed" was true only because
  nothing had run to fail. `_test_map_reads_on_a_phone()` is rewritten to
  assert something real instead: every anchor's `_hits` rectangle clears
  the 44px touch floor at a phone-width window. CLAUDE.md rule 10's own
  line about this — "a gate that cannot fail is a finding, not a pass" —
  named exactly, for once, by the gate itself.


- **HANDOFF, 2026-08-26. The land is still a rectangle, and I built three
  rounds of detail on top of it instead of fixing that.** Direct feedback,
  ending the session: "the map, it's clearly not made from scratch since
  you can still see the squares under."

  Correct, and measurable. `buildRealLand()` rasterises into a grid padded
  60 board units around the nominal 1000-unit board, so the grid runs
  -60..1060 on both axes. Of the 850 emitted land rectangles, **182 sit
  flush against the right pad edge and 60 against the left** — those are
  not coastline, they are the grid boundary cutting the street buffer off
  flat. That is the visible "square". The straight top/right edges of the
  landmass are an artefact of the derivation box, full stop.

  The deeper problem, which is mine and not the data's: **the land mask
  never consults the coastline at all.** After three failed
  coastline-flood-fill attempts (documented at length in `buildRealLand()`'s
  own comment, and those failures are still worth reading) I switched to
  "land = buffer around real streets and anchors, holes filled, bays carved
  out". That produces a *plausible* blob with correct streets and transit
  on it, but it is structurally incapable of ever having a real shoreline,
  because the only thing that could give it one — `kallio-water-v1.json`'s
  27 real coastline edges — is used exclusively as a thin decorative
  stroked line in `_draw_backing_and_water()` and never as a cutting edge.
  The hole-filling pass makes it worse: any pocket not touching the grid
  border becomes land, which is what turns a sparse street buffer into a
  solid slab.

  So the last three rounds (harbour service/track roads, the fit-boundary
  refit, bigger roads, bigger landmarks) were all real fixes to real bugs,
  and all of them were detail work on a silhouette that was wrong
  underneath. That was the wrong call — the "squares should be gone first"
  instruction from 2026-08-27 was still unmet the whole time, and I should
  have said so instead of polishing.

  **What a fresh attempt should probably do**, in the spirit of the
  original instruction rather than my workaround: build the land as a real
  polygon from the real coastline, using the fact that OSM `natural=
  coastline` ways are a directed *network*, not 27 independent strokes —
  join them end-to-end into continuous chains first, then close each chain
  against the fetch-box edge to get genuine polygons, and only then decide
  inside/outside. The winding-direction inconsistency that killed attempt
  (2) is survivable once the ways are chained, because a chain's overall
  orientation can be checked against known-land anchors instead of trusted
  per-segment. The 14 board anchors are the ground truth available for
  that check, and all 14 are already verified to land inside the current
  blob. Do NOT re-try per-segment sea-side seeding or border-seeded
  flood-fill; both are recorded above with the exact reason each failed.

  Everything else on the board — transit lines, chips, streets, water
  overlay, the anchor/label/legend chrome — is real, aligned and verified,
  and does not need redoing. It is only the silhouette under it.


- **The land is derived from the real coastline now, and the squares are
  gone** (2026-08-26, direct feedback: "the map, it's clearly not made from
  scratch since you can still see the squares under" and "just use public
  data to make the map look good and useful. trying to fake it will show").

  The handoff note above diagnosed it correctly, so this is the fix rather
  than a fresh investigation. What unlocked it was noticing that the 27
  `natural=coastline` ways in `kallio-water-v1.json` are a NETWORK, not 27
  loose strokes: 25 of 27 join another way head-to-tail, and the 2 loose
  tails both sit on the fetch box's east edge where the data was cut.
  Chained, they resolve to two open coastal runs plus three closed rings,
  and those three rings are real islands.

  With the shoreline continuous, the flood-fill finally has a real barrier —
  and the seed problem that killed all three earlier attempts turned out to
  be already solved in canon. The 14 board anchors are real places standing
  on real ground, so they are the seed. Barrier = chained coastline + island
  rings + real inland water; seed = the anchors; land = whatever the flood
  reaches. Nothing guessed in either direction. Islands are filled back
  afterwards (the mainland flood cannot cross to them), the bays are carved
  last. `buildRealLand()` now throws outright if any anchor lands in water,
  so the derivation cannot silently ship wrong again.

  The grid is the real data box with no pad, and each open chain's ends are
  extended to the nearest grid edge — the old 60-unit pad was exactly what
  let the flood walk around the end of the coastline and get chopped flat
  against the grid, which is what the "squares" were.

  Found and fixed on the way, worth naming because it looked completely
  plausible: the shore-reclaim pass (which widens land by one cell so the
  coast is not a brush-width thin) read and wrote the same array in a single
  scan, so one reclaimed cell qualified its neighbour and cascaded a 1-cell
  land thread straight out across open water along any chain touching land
  once. The cell count moved by less than 1% and the rect count by 13%;
  neither would have caught it. Zooming into the raster dump did. That is
  now the fourth bug in this file's history caught only by looking at the
  picture, which is why `LAND_DUMP_RASTER=1` stays.

  Also: `_rebuild_layout()` now fits the view to the board's own declared
  extent from the coordinate system, not to the land's extent — real land
  is deliberately wider than the playable board, and fitting to it shrank
  Kallio to a patch surrounded by off-board water. And `_draw_edge_mask()`
  gives the board a real frame, because real streets and transit lines
  genuinely continue past the shoreline and, unmasked, read as lines
  floating on open sea — which looked exactly like the invented geometry
  this map spent several rounds removing, despite being the honest data.

  Not done: the land is still emitted as merged rectangles (969 of them at
  a 1.2-unit cell, roughly 2.8 m) rather than a traced outline. At the
  current fit that is well under a pixel per cell so the shore reads smooth,
  but if the map ever gains zoom it will need a real contour, and the two
  tracer attempts recorded earlier both failed — budget properly for it.


- **The last squares were the transit chips, not the land** (2026-08-26,
  direct feedback: "The square frames still are there"). With the coastline
  rebuilt, 107 line-number chips — one every 90 board units, each a filled
  rectangle with a hard keyline border — were the last hard-cornered thing
  on the board, and read as a rash of squares over the geography. Cut to 14
  (two per line, placed on the visible board, well spaced, kept off the
  anchors) and redrawn as rounded capsules, which is the shape a transit map
  actually uses. The drawn frame added the round before — a hairline
  rectangle around the board — was itself one more square frame, and is
  gone; the edge mask alone gives a clean cut.

- **The hand-drawn road ribbons are gone** (2026-08-26, direct feedback:
  "The grey lines that are there from the squares that you re-colored").
  The 5 `road`, 5 `roadInner` and 6 `street` runs in `rail-and-roads` were
  the last of the original structural SVG — the same invented geometry the
  blocks came from. Recolouring them had made them quieter without making
  them true: broad blunt ribbons corresponding to no real street, laid over
  `streets-real`, which is real OSM geometry for the same ground. Two road
  networks disagreeing in one picture, one of them fake. `MapStyle`'s
  `ROAD`, `ROAD_W`, `ROAD_INNER`, `ROAD_INNER_W` and `STREET_W` retired with
  them.

- **The label tab is a rectangle now** (2026-08-26, direct feedback: "the
  Piritori text box is wavy, not like a proper rectangle"). It was a
  torn-cardstock effect with its edge jittered from a hash of the anchor id
  — at phone label size that reads as a rendering fault, not as paper.
  `_torn_tab()` replaced by `_label_tab()`: straight edges, one drop shadow,
  one edge line.

- ~~**STILL HAND-DRAWN, and it will show:** the single `rail` + `railTie`
  pair.~~ **DONE 2026-08-26.** `map/tools/railway-import.mjs` fetches real
  OSM `railway=rail|light_rail|narrow_gauge` for the same box the streets
  and water use — 485 ways, tiered `main` (311, `usage=main`), `branch` (52)
  and `yard` (122, `service=yard|siding|crossover`). `subway` and `tram` are
  deliberately NOT fetched: the metro and trams already come from real HSL
  GTFS in `kallio-rail-v1.json`, and fetching their track again would draw
  every one of them twice, in two styles, from two sources that do not
  perfectly agree. Yard track is carried by the importer but dropped by
  `buildRealRailway()` — 122 ways of depot scribble is texture, not
  information, and the real streets already do texture. Clipped to real land
  like the streets, for the same reason (the fetch is a lat/lon box, not a
  landmass).

  Two treatment things fell out of it, both worth naming because both were
  stylisation standing in for geometry we now actually have:

  `RAIL_W` was 18 board units, sized for ONE schematic hand-drawn line. The
  real alignment is 143 parallel track runs through one corridor, and 18
  units each merged them into a solid black slab. Now 3.2.

  The dark-bed-plus-dashed-sleeper treatment is what sells a single line as
  a railway. Applied to 143 real parallel tracks it gave every track its own
  ladder and the corridor came out as a zebra crossing laid across Kallio.
  Dropped entirely — real parallel alignments say "railway" by being
  parallel. `RAIL_TIE`, `RAIL_TIE_W` and `RAIL_TIE_DASH` retired with it.

  **There is now no invented geometry anywhere on the city map.** Every line
  on it is real OSM or real HSL GTFS.

- **Dead layers still in the generated geometry:** `land-relief` (3),
  `minor-blocks` (19) and `rail-and-roads` (18) are all still built and
  emitted, and none of them is drawn any more. They are kept on purpose for
  now — the `build-map-geometry.mjs --check` gate verifies them against the
  structural SVG, so they act as a canary that the SVG has not been
  tampered with, and they cost a few KB against a 415 KB file that is mostly
  real land and streets. But nothing reads them, and a future session
  deciding the SVG is fully retired should drop all three and find the
  drift gate a new subject.

- **Asked for, not started: UI visual elements** (2026-08-26, "Maybe we
  start also adding UI visual elements soon as the map gets close"). Noted
  rather than begun — the map was the task in hand and CLAUDE.md rule 1 says
  one part per prompt. Worth knowing before it starts: the legend panel and
  the header chips are currently the only real chrome on the city screen,
  `art-library/ux-concepts/README.md` already settles cardstock as the
  interface material, and `UX_SPEC.md` §3.1 and §3.3 (the nav dock, and END
  DAY sitting beside the clock rather than in a tab) are the canon a first
  pass has to agree with.


- **First UI pass: carton choice cards** (2026-08-26, "Maybe we start also
  adding UI visual elements soon as the map gets close" → "Go ahead").
  `art-library/ux-concepts/README.md` already settles the direction — "a 3D
  world, and torn-carton UI on top of it... cardstock is the interface, not
  the world" — and `PiritoriChrome` already had the machinery (`plate()`,
  `CARTON_INK`, torn-edge nine-patch). It was applied in exactly ONE place,
  the location screen's narration plate. Directly beneath that plate its own
  choice rows were dark cards with a hairline accent outline, which read as
  the wireframe the plate was built to replace.

  New `PiritoriChrome.plate_button()` — same cream carton, pressable, torn on
  the bottom edge only (torn both edges reads as a scrap; torn one edge reads
  as taken off a pad, and keeps stacked rows separable without dividers).
  `_make_icon_button()` uses it: carton face, near-black ink, and the accent
  moved OFF the text onto a printed spine down the left edge, the way the
  concept sheet rules its name plates. Violet-on-charcoal was never as
  legible as ink-on-cream.

- **The portrait split follows the scene now** (2026-08-26: "Text options
  below should be a bit more condensed and hopefully no scrolling too much"
  and "We need to see the small characters and their faces close up screens
  when they talk, so that area needs a bit more room on the vertical
  format").

  These two pull against each other, and the first attempt — just cutting the
  rail from 34% to 26% — bought the stage its room by pushing ACT below the
  fold on EVERY screen, including the ones with nobody standing in them.
  That traded one half of the request for the other.

  The operative words were WHEN THEY TALK. The split now follows the scene:
  25% rail when a speaker is actually mounted, 33% when the stage is only a
  place. The condensing paid for the rest — row separation 8→4, separators
  8→3, rail padding 14→8/12. The rows themselves could not shrink: they are
  44px touch targets and that floor is a gate.

- **The capture tool can see a talking scene now.** Every capture it has ever
  taken used the opening encounter, which is a place with no speaker — so the
  empty case was the only case ever looked at, and it is exactly the one that
  does NOT exercise the portrait split, the speaker mount or `presenter_3d`.
  Added `piritori-speaker-*.png`, using `enc-toko-quiet-voice`. Previously
  the only way to see a face was to play to day 3 by hand.

- ~~**FOUND BY THAT SHOT: Toko's face is a yellow smiley.**~~ **WRONG, AND
  CORRECTED 2026-08-27 — the mask is CANON.** `ART_BIBLE.md` §8.3 is titled
  "Toko Slomo character and mask" and `art/v3/manifest.json` says outright
  "The gold smiling mask is CANON". I called a canon character design a
  shipped bug because I diagnosed from a render without reading the art
  bible first. The whole entry below is kept rather than deleted because the
  free 14-model survey in it is still useful and the mistake is worth
  leaving visible. **Nothing about Toko's face needs fixing.** The real
  follow-up is the opposite one: his 3D model should be judged against §8.3's
  mask spec (eye openings cut INSIDE the white arches), not replaced.

  **And the source art already existed.** Told 2026-08-27: "you should also
  already have edited versions of the attachment. see documentation." Correct
  — `art-src/meshy-input/toko-slomo-tpose-v01.png` is the owner T-pose that
  was actually meshed, and `art-src/concepts/people/toko-slomo-notext-v01.png`
  is the edited, apron-blanked version that fed the 12k remesh the manifest
  records. That second file is canon-correct in every way three generations
  of mine were not: the gold mask sits at face size over a real NECK, the eye
  slits are cut inside the white arches with white all round them, the
  proportions are a normal adult, and the apron is already clean. Its `.txt`
  sidecar even carries the exact edit prompt used.

  So the correct answer to "regenerate Toko" was never to generate anything.
  The lesson, and it is the second half of the same mistake: **before making
  a new asset, look for the existing one.** `art-src/` is organised by
  pipeline stage — `concepts/people/`, `meshy-input/`, `scenes/`, `approved/`
  — each `.png` carries a `.txt` with the prompt that made it. A generated
  `art-src/cast3d-refs/` folder was created here in ignorance of that and has
  been deleted.

  The original, incorrect entry follows.

- **Toko's face is a yellow smiley.** Not a render fault — extracted the texture atlas out of
  `art/v3/cast3d/toko-v01.glb` and the smiley UV islands are baked into it.
  A Meshy image-to-3D generation went wrong and shipped. He is a named
  character in `NARRATIVE.md`, he is the first face the game shows, and he is
  currently wearing an emoji.

  The fix is regenerating the model, which **costs real Meshy credits and
  therefore needs an explicit go-ahead** (CLAUDE.md rule 2 / the Meshy note
  in the user's global preferences: image-to-3D at 30k polycount is ~15
  credits, and the balance should be checked first).

  **All 14 `cast3d/` models were checked first, for free** — extract the
  texture atlas straight out of each GLB and measure how much of it is
  emoji-yellow (warm hue, very high saturation, bright; skin tones are far
  less saturated and hi-vis workwear sits lower in hue). **Only Toko is
  affected.** He scores 0.95% on an actual emoji; the runner-up, `hired-b`,
  scores 0.14% on a red/yellow/green hat band and is fine. So this is one
  regeneration, not a batch. Balance at the time of checking: 114 credits.

  Two tooling notes found while checking that balance, both wrong in the
  notes they came from: `~/.meshy/m3d.sh` has **no `--balance` flag**, and
  the endpoint is **`openapi/v1/balance`**, not the documented `v1/balance`,
  which returns `NoMatchingRoute`.


- **Crew names are generated now, not authored** (2026-08-27, direct: "there
  are no crew members that are canon, only mainline characters. every other
  name is generated from first and last pool to make combo. fix this").
  `COMBAT.md` §7.1 already said it — named characters are FFT story units,
  "everyone else is disposable... generated... their interest comes from
  generated traits worth reading, not from authorship" — but six crew shipped
  with hand-written names, and one of them turned up on a battle screen
  looking like canon. Authored `name` fields removed from the slice; the six
  ids renamed from people to slots (`crew-slot-runner` etc.) so nothing in the
  data carries a fake canon name; `enc-mira-at-tram-stop` renamed to
  `enc-runner-at-tram-stop`; six lines of prose de-named. The name now comes
  from `CrewGenerator.name_for_id()`, seeded from the crew id so a slot is the
  same person every run and across a save.

  **Careful with the word "named".** A crew member's `named` flag is NOT "is
  canon" — `content/validate-slice.mjs` uses it to mean "an encounter refers
  to this id, so careers must not retire them and break that content". Those
  three flags are content-dependency facts and were left alone.

  Two gates were hardcoding authored names and are fixed: `test_battle_ui`
  asserted `"Mira" in labels` (now asks the registry what this fighter is
  actually called, which is the stronger check), and `test_spine`'s
  named-character career test was wrapped in `if named != ""` so it skipped
  silently — rule 10's "a gate that cannot fail is a finding", two assertions
  that had quietly stopped existing.

- **The name pools are still flagged PLACEHOLDER** by `crew_generator.gd`
  itself, and generating the six slots showed two specific weaknesses worth
  naming before someone mistakes them for design:
  - **No gendered family forms.** The Russian pool produced "Galina Smirnov"
    and "Galina Ivanov"; a woman called Galina would be Smirnova / Ivanova.
    The Slavic and Baltic pools need either gendered pairs or given names
    tagged with gender.
  - **The pools are small enough to collide.** Six slots drew "Galina" twice.
    Fine for a hiring pool you meet one at a time, visible when a roster is
    listed together.

- ~~**Not looked at:** "non-optimized UI edges, sizes"~~ **DONE 2026-08-27.**
  Three separate faults, all reproduced by adding the owner's real viewport
  (1079x2047) to the capture tool, which had only ever photographed 390x844:

  1. **The header ran off the right edge.** `_apply_chrome` decided narrow by
     `real_w < 620`, and a Pixel reports 1079 physical pixels — so a screen
     that is narrow in the hand read as desktop. A raw pixel count has not
     meant physical width since phones got dense screens. Portrait is now
     always narrow, which is true on every device with no DPI guesswork.
  2. **The dock lost MISSIONS entirely.** The label size was
     `h * COMMAND_LABEL_FRACTION` with a floor and no ceiling, so a tall phone
     made a tall bar made a huge font — and a button whose CONTENT exceeds its
     `custom_minimum_size` simply grows. `per` was never the real width. The
     type is now fitted by measuring the longest command against the space it
     has, which also protects Finnish and Japanese, where the words differ.
  3. **Body text was a thread.** The header and command bar scaled themselves;
     the rail did not, so ~70 call sites passed literal 12/13/15px and the rail
     rendered a third the height of the dock beneath it. `_make_label` now
     scales against the viewport, and rail buttons, the carton choice cards and
     the location narration plate with it.

  Two traps hit on the way, both recorded because they are cheap to repeat:
  **double-scaling** (the status chips already computed their size from the
  screen, so scaling again gave 130px chips that shoved the header off-screen —
  the exact bug `_device_gain()` was removed for, so `_make_label` has an
  explicit opt-out), and **a floor that did not grow with its type** (cards
  stayed 44px tall while the label scaled, slicing the descenders off).

  Trade-off worth knowing: legible location text means the ACT list scrolls
  again on a phone, against "no scrolling too much" from earlier the same day.
  Readability won on the grounds that an unreadable list does not benefit from
  fitting. If the balance is wrong, the lever is `_text_scale()`'s 2.2 ceiling.

- **Superseded note, kept for the reasoning:** "non-optimized UI edges, sizes" —
  from a Pixel screenshot, the command dock and the battle console both run
  off the right edge, clipped mid-word ("MESSAGE", "MISSIO", "WITHDR"). The
  capture tool only ever photographed 390x844 (aspect 0.462); that phone is
  1079x2047 (0.527), a shape it has never been tested at. Testing one narrow
  portrait is not testing portrait. Adding that viewport to `SHOTS` is the
  first move.


- **The battle console is legible on a phone now** (2026-08-27, continuing
  "non-optimized UI edges, sizes"). It had never been photographed at ANY
  size — the capture tool shot the city, the location and a speaker scene and
  stopped — so the owner's own screenshot was the first look anyone had at it.
  A screen the capture tool cannot see is a screen nobody checks. It now takes
  `piritori-battle-*` and `piritori-site-*` shots too.

  Three corrections in a row before it was right, which is worth recording:
  scaling the type 2.2x like the rail made the labels outgrow their cards and
  clipped REPOSITION and WITHDRAW; dropping to 1.55 fixed the verbs but the
  automation column, pinned at a fixed 210px while its buttons grew, still lost
  WITHDRAW off the edge; 1.3 is the largest ceiling at which the crew card,
  four verb cards and the automation column all fit side by side on a
  1079-wide phone.

  **The real bug underneath was in all three scenes at once.** `_text_scale()`
  fell back to the viewport HEIGHT in landscape, so an ordinary 1280x720
  desktop window scaled its type up by 1.67 — inflating layouts that were
  already correct, and pushing the battle console 8px off the bottom of the
  viewport. Caught by `test_battle_ui`'s "sits inside the viewport" check, the
  second time that same gate has caught that same thing. Landscape now returns
  1.0 outright: the reason to scale at all is a dense portrait phone, and a
  landscape window is the size the authored numbers were chosen for.

- **Still worth doing, not attempted:** in portrait the battle console would
  read better with the automation column REFLOWED BELOW the verb cards rather
  than beside them. That buys back enough width to raise the 1.3 ceiling. Left
  alone deliberately — it would have been a fourth correction in one sitting,
  and CLAUDE.md rule 8 says stop after two.


- **The old 2D faces are off the battle console** (2026-08-27, direct: "the
  whole face and name screen is not needed. only when a character is active
  and even then the old faces add nothing").

  Half of it was already true and worth checking before changing anything:
  `_select_first_actionable()` only builds the card for a fighter who
  `can_act()`, so it did already appear only for an active character. The
  faces were the real complaint and the complaint was right — a 64px crop of a
  2D idle pose, from the cast art that predates the 3D ruling in
  `PHASING.md` §1.055, sitting beside a board where that same person is a lit
  3D figure doing the thing being described. It repeated what the board showed,
  in an older style, using the widest slot in the console to do it.

  `PoseArt.portrait()` and `PoseArt.draw_portrait()` retired with it — this was
  their only caller. The role colour moved onto the card's border, which is now
  what says who is active. The column dropped 230px → 150px, and the verbs and
  automation column took the width back.

  Note for whoever revisits the 2D cast art: `art/v3/cast/*/idle-smile-*.webp`
  is now used only for the board figures via `PoseArt.draw_into()`, not for any
  portrait. If the board ever goes fully 3D there, that whole set is dead.


Lane: mixed, each named above. Found by testing, which is the point of the
capture tool existing.
