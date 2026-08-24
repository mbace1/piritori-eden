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
