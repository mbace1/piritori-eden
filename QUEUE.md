# QUEUE

Things noticed while doing something else. Per `CLAUDE.md` rule 1, they get
written down here instead of acted on.

Nothing here is approved work. It is a list of things a future session might
pick up, and half of it will turn out to be wrong.

---

## Debug affordances (blocks rule 3 and rule 6)

- ~~**No URL parameters.**~~ Done — `autoload/debug_entry.gd`. See `CLAUDE.md`
  rule 6 for the vocabulary.
- ~~**No on-screen debug HUD.**~~ Done — `ui/debug_hud.gd`. `?hud=1`, the DEV
  button, or F3. Shows fps / frame time / draw calls / memory (rule 9) and the
  campaign block, purse, stock and roster.

  Still thin: it reports frames but cannot **profile** them. If something is
  slow the HUD says so and not why.

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

- **`ART_BIBLE.md` describes a different game now.** It is the visual authority
  and it says cut cardstock. It needs rewriting, and until it is, it and
  PHASING openly disagree.
- **The battle renderer draws standees.** 3D units are a renderer change.
- **No isometric Camera3D exists.** The arena assumes a 2:1 projection that the
  2D code fakes; in 3D it wants an orthographic camera actually set to it.
- **Six arenas and six cast sets become reference art**, not runtime art.

## The 3D cast, now that it exists

- **The night grade eats them.** Six models are on the board and four wear dark
  clothes; at battle scale under the current lighting they read as six dark
  shapes rather than six people. The silhouettes differ, which was the point of
  choosing them that way — but the fixer's coat, the local's maroon and the
  driver's hi-vis should be legible and are not. A rim light, or lifting the
  ambient on units only, is the likely fix.
- **Only the muscle has fight clips.** idle / attack / hit / dead are lifted
  onto any rig, so the other five play them — but they were authored against the
  muscle's proportions and may read oddly on the round local or the lanky
  watcher.
- **The 2D cast sets are now reference art.** They still ship and PoseArt still
  resolves them; nothing draws them while `use_3d` is on.

## 3D units (see PHASING 1.06)

- **`art/v3/cast3d/` is staged but NOT registered.** Two rigged glbs sit there
  outside the manifest, which is exactly the antipattern that made every unit
  look identical for weeks. Register them or delete them; do not leave them.
- **Textures are uncapped.** 6.5MB of PNG per character. `process/size_limit`
  on the imported texture is the known fix.
- **`ART_BIBLE.md` §13.2 still says 3D is one exception.** The owner has ruled
  otherwise; the document has not caught up.
- **Nothing draws 3D units in battle.** The board renders 2D standees. Adopting
  3D is a renderer change, not an asset swap.

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

## A test scene with a parse error HANGS, it does not fail

Found while adding the aftermath gate: `test_shell.gd` has `check()` but no
`eq()`, and calling the missing helper was a parse error. Every scene ends in
`get_tree().quit()`, so a scene that never loads never quits — the run sat there
until it was killed at 6m40s rather than reporting anything.

CI would have caught it as a timeout, eventually, with no useful message. Worth
a `--timeout` on the gate invocations, or a watchdog in the scene, so the
failure says what it is.

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
