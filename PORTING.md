# Porting — JS is the build, Godot is the port

**Status: ACTIVE from 2026-08-25.** It implements the owner ruling recorded in
`DESIGN_AUTHORITY.md` and **supersedes the 2026-08-21 ruling that Godot is the
implementation.** Where an older document still says the browser build is
parked, this wins.

> "we develop on js and the version control and documentation assumes that each
> version will be ported to Godot for landscape and controller testing. Only
> meshes will be given to you via PR, but you control the primary tester build
> and hand off each version to the godot side." — owner, 2026-08-25

---

## 1. The shape

| | **`web/`** | **`godot/`** |
|---|---|---|
| what it is | **the primary tester build** | the **port**, for landscape and controller |
| authority | the behaviour is defined here | reproduces it; never invents it |
| who drives it | this side | the Godot side |
| what it proves | *do the rules work* | *does it play on a pad, in landscape* |
| moves first | always | never |

### 1.0 A correction, made the day after this document was written

**`PHASING.md` §1.055 — "change the goal from 2d to 3d", 2026-08-22 — was in
force before any of this was written, and this document did not know it.** It
landed the day after the browser build was parked, which is exactly why that
build has no 3D in it: it renders with `getContext('2d')` and nothing else.

So the table above is right about *authority* and was quietly wrong about
*shape*. Promoting the browser build to primary tester does not make a 2D canvas
the form of the game. The honest statement is:

- **`web/` is where behaviour is defined, and it is not yet the game's shape.**
  A 2D board is a legitimate presentation choice — `JS_BUILD_CATCHUP.md` notes
  the Godot build deliberately keeps one behind a `use_3d` flag — but choosing it
  is a decision to write down, not a default to inherit from a parked prototype.
- **The 3D assets are the assets.** 26 GLBs, 32 MB. Any build adopting them
  inherits the texture budget in §4 of the catch-up brief, not just the meshes.

**Both are real builds.** This is not a prototype and a product. The port exists
to answer a question the browser cannot — whether a game about routes, blocks
and formations is playable with two sticks on a television — and that question
is worth a whole second implementation.

### 1.05 The ruling has a start line — owner addendum, 2026-08-28

**"That ruling only starts AFTER js has feature and asset parity with
Godot!"** Full text in `DESIGN_AUTHORITY.md`'s matching addendum, which is
the authoritative record; this is the pointer so nobody reads §1's table in
isolation and assumes new work belongs here before parity is real.

**Direction unchanged, starting line moved.** Until `web/` is not visibly
behind `godot/`, the flow for anything Godot already has is Godot → web, not
the reverse — concretely: the 3D fighters and stages actually rendering in
the browser (not just registered as meshes), the transit-layer map
(`TRANSIT_LAYERS.md`'s L0–L5, live on Godot's board since 2026-08-27), and
whatever gap `MARKET.md`'s full ruleset has against what `web/`'s screens
currently show. `market/model.mjs` etc. staying JS-canonical is unaffected —
that was already true and parity does not change it.

Once parity holds — judged on a screen, the way this project judges every
look, not off a checklist — §1's table governs again as written.

### 1.06 Parity measured, 2026-09-02 — three of four gaps closed, one is wide

§1.05 named the gaps in a sentence. This is what they measure at, read out of
the code rather than recalled, so the start line is a fact and not a feeling.

**1. The 3D fighters and stages — CLOSED.** `web/js/v3/render3d.js` loads the
real `cast3d/` bodies AND the real `stage3d/` arena, at the same fixed scale
`battle_stage_3d.gd` uses, and as of v4.25 it animates them: idle, attack,
hit and dead, driven by the same four shared clips Godot plays.
`port/rig-vectors.mjs` now gates the thing that made those shared clips safe —
13 of 14 cast bodies carry an identical 24-joint skeleton.

**2. The transit-layer map — CLOSED, and honestly.** `web/`'s board draws the
real HSL GTFS geometry from `map/kallio-transit-layer-v1.json`, per-line
colours and corridor fanning included, out of the same generator that feeds
Godot's L2. Not a schematic standing in for one.

**3. Economy depth — NOT A PARITY GAP.** Measured, this is a different thing
from what §1.05 assumed. `web/`'s board imports `offer`, `present`, `decay`
and `exposure` — the whole live loop. What is missing is `CONDITION`, the
seller's-condition table behind `MARKET.md` §7e, "drinking is an investment,
not only a cost". **Godot does not implement it either** (its `condition` is
an unrelated crew stat in `crew_generator.gd`). So it is an unbuilt design,
not `web/` lagging, and moving it under the parity heading would have had the
wrong build waiting on the wrong build.

**4. THE MAP'S REAL GEOMETRY — OPEN, and this is the whole remaining gap.**

`godot/data/map-geometry.json` is 425 KB of imported OSM, nine layers:

| layer | polylines |
|---|---|
| `streets-real` | 4020 |
| `railway-real` | 169 |
| `land-real` | 969 |
| `water-real` | 48 |

Godot's `city_map.gd` draws all of it — coastline, land, the street network,
rail. `web/` draws **one hard-coded twenty-point SVG blob** for the landmass
(`app.js`, `class="map-land"`) and nothing at all for streets, water or rail.
Zero references to any of those layers anywhere in `web/js/`.

This is the one place a screenshot of the two builds side by side still tells
you instantly which is which, so by this project's own standard — judged on a
screen, not a checklist — parity does not hold yet, and this is why.

**It is not a copy-paste, and that is the point of writing it down.** 4020
street polylines as SVG paths is both a download (rule 9, the phone gate) and
a DOM cost that the board re-renders on every state change. Godot pays it once
into a `_draw()` on a canvas. Closing this needs a decision about form —
simplified geometry at build time, a canvas element, or a pre-rendered layer —
and the generator is `godot/tools/build-map-geometry.mjs`, which already
serves one build and should serve both rather than being copied.

### 1.07 PARITY HOLDS — 2026-09-02. The start line has been crossed.

§1.06 left one gap open and named it "the whole remaining gap". It closed the
same day: `4d3acc9` draws the real OSM geometry — streets, coastline, rail —
on a canvas in `web/`, out of the same `build-map-geometry.mjs` that feeds
Godot's L2, which is the "one generator, both builds" form §1.06 asked for.

**All four gaps are now closed, so §1.05's condition is met** — the owner's
2026-08-28 addendum said the 2026-08-25 ruling "only starts AFTER js has
feature and asset parity with Godot", and that is now a fact rather than an
aspiration:

| gap | state |
|---|---|
| 3D fighters and stages | closed — real bodies, real arenas, animated |
| transit-layer map | closed — real HSL GTFS geometry, not a schematic |
| economy depth | not a parity gap; `CONDITION` is unbuilt in BOTH builds |
| the map's real geometry | **closed 2026-09-02** (`4d3acc9`) |

**What changes, concretely, from today:**

- **`web/` is where behaviour is defined.** New rules are designed there
  first. This is the 2026-08-25 ruling, now live.
- **`godot/` is the port.** The flow reverses: it was Godot → web while this
  document's §1.05 held; it is **web → Godot** from here. Godot reproduces
  behaviour and does not invent it.
- **Every version still carries its `### Port` block**, but the block's job
  flips with the flow. It now names what the GODOT side must re-port, which
  is what §2 always said it was for — the last several versions could
  honestly write "nothing to re-port" only because they were catch-up.
- **A version that closes a gap the other way is a bug**, not progress: if
  Godot grows a rule web does not have, that is a lineage starting, and
  `CLAUDE.md`'s lane table exists to stop it.

**Recorded because it was nearly missed.** Parity arrived and no document
said so, so sessions kept working in catch-up mode for a day — polishing an
additive render layer (`render3d.js`'s own header: the 2D board is complete
and playable without it) while the build's actual gap, a campaign with no
growth loop, went untouched. A phase that ends without being declared does
not end.

### 1.08 TURF is a sibling build, and a legitimate source

Owner ruling, 2026-09-02: work here "should use anything from TURF that it
can". `turf/` lives on **Suds-Jack's `gh-pages` branch**, not in this repo,
and is at v9.

It is not a port target and nothing syncs between them. It is a **second
battle tester of the same genre** — grid tactics, Nordic street underworld,
a persistent named crew of three, lost on a squad wipe — that reached a
polished look through **sprite** art where this build reaches for 3D. Where
it has already shipped something this build has not, read its solution
before writing one:

- **The growth loop.** `awardXp`, `xpToNext`, `crewProgress` and a level-up
  line on the result screen, live since TURF v6. This build has none, which
  makes it the reference for the growth-loop work rather than a blank page.
- **A real feedback loop.** TURF v8 and v9 each came from one annotated
  screenshot of the live build on a real phone. Nothing here has an
  equivalent.

**And one difference that must not be papered over:** TURF scopes XP to a
single run and clears `crewProgress` when a new one starts — it is a
roguelike. This build's crew persist across a ten-day chapter and into the
next. Same mechanic, different lifetime, and both the storage and the
balance follow the lifetime, so its numbers are a starting point and never a
drop-in.

The debt runs the other way too, and is worth offering: **TURF has no tests
at all**, while this repo's gates caught a dead asset (`parka-man-v01.glb`,
no skeleton) that had sat in a live pool for ten days behind a joint count
nobody had measured.

### 1.1 `legacy/` really is legacy now, and `web/` is not

The browser build has been moved out of `legacy/` to **`web/`**, because a
directory named `legacy` that holds the primary build is a lie and this repo's
whole culture is that names must not lie. What stayed behind in `legacy/` is the
genuinely dead flow prototype — `js/main.js`, `js/fight.js`, `js/market.js` and
`explorations/` — which still imports a `flow-core/` that lives in another
repository.

**Unparking it cost three small fixes and immediately proved why parking was
expensive:**

- every path to `content/`, `map/` and `art/` was one `../` short, left over
  from when this folder was the repository root;
- `index.html` loaded `../hub/shell.js` from the old monorepo with a hard
  `<script>` tag, which is the *entire* reason the 2026-08-21 ruling could say
  the browser build "does not run in this repository by construction". It is
  now an optional dynamic import: a missing shell is a missing nicety, never
  the reason a clean checkout fails to boot;
- **its contract gate had stopped running, and canon drifted out from under
  it.** See §6.

## 2. What a version is

**A version is a port unit.** That is the whole change to how versions are kept:
a version number now names *a thing the Godot side is expected to reproduce*,
not just a thing that shipped.

Numbers are **`vMAJOR.MINOR`**, the same decimal scheme `eeri/` adopted and for
the same reason — burning a whole integer on ordinary work is what makes version
collisions easy. `?v=` module tokens stay integers; they are cache-busters
tracking module churn, not releases, and the two numbers are deliberately
different.

Every `VERSIONS.md` entry from here carries a **`### Port`** block:

```markdown
## v4.1 — 2026-08-25

- what changed, as always.

### Port
- **vectors:** `market@3`, `missions@1`   ← changed; re-port these
- **data:** unchanged
- **meshes:** +`cast3d-toko-v01`
- **presentation:** the counter's foreground layer (godot side's own problem)
- **status:** handed off / in progress / landed
```

The point of that block is that **the Godot side never has to read a diff to
know what to do.** A version that changes only presentation costs them nothing;
a version that moves a vector costs them exactly the rule it names.

## 3. Three things cross, and they cross differently

This is the load-bearing distinction. Everything that has to get from here to
there is one of three kinds, and confusing them is how ports rot.

### 3.1 DATA — shared, never ported

`content/`, `map/`, `art/v3/manifest.json`. Both builds read the same JSON.
`godot/tools/sync-data.mjs` already copies it byte-identically and asserts the
count. **Nothing to do per version except run it.**

### 3.2 RULES — ported, and proved by vectors

`market/model.mjs`, `missions/model.mjs`, `people/roster.mjs`, and the state
machine in `web/js/v3/`. GDScript cannot run these, so they are re-implemented —
and re-implementation is exactly where a port silently stops agreeing.

**So rules do not travel as code. They travel as VECTORS.** §4.

### 3.3 PRESENTATION — deliberately different, never ported

Layout, input, camera, the shape of a screen. The Godot side is *for* landscape
and a controller; asking it to reproduce a browser layout would defeat the point
of having it. **The JS build must never assume a portrait phone**, and the Godot
build must never be asked to look like the browser.

**Exception, owner ruling 2026-08-28: the UI MATERIAL is not a screen shape.**
Asked whether `web/` should adopt `godot/ui/chrome.gd`'s torn-carton chrome —
"absolutely, no doubt" — and whether that should be a lighter CSS
approximation or the same algorithm — "why not the same?" `web/js/v3/chrome.js`
is accordingly a pixel-exact port of `chrome.gd`, reached through CSS
`border-image` rather than a `StyleBoxTexture`. This does not reopen §3.3:
layout, input, camera and portrait-vs-landscape are still each build's own,
and nothing here ports a screen's *shape*. Only the card/button/plate
material — a texture built from constants, not a layout decision — crossed,
and it crossed because the owner named it a shared decision rather than a
look either side improvises.

**But the reminder that mattered here: Godot's own UI was also very WIP** —
`chrome.gd` had already moved three times in three commits when this was
written. So "verified byte-for-byte" cannot mean a one-off diff against
whatever `chrome.gd` happened to say that day; it has to mean a standing
check, or the port is exact today and silently stale the next time Godot's
UI moves. It runs **backwards** from every other vector in §4 — Godot is
canonical here, `web/` is the port — but it uses the same fixture-file
discipline: `godot/tools/chrome-dump.gd` (headless, committed) dumps
`PiritoriChrome._paint()` for all five box kinds at full 64×64 into
`port/vectors/chrome.json`, and `node port/chrome-vectors.mjs --check` (bare
node, no Godot needed) diffs `chrome.js`'s exported `paintPixels()` against
it. **Whoever changes `chrome.gd` next re-runs the dump and re-commits the
fixture** — the node gate only notices `chrome.js` drifting from the fixture,
never the fixture drifting from a `chrome.gd` nobody re-dumped.

## 4. Vectors: what "ported" actually means

A **vector file** is a list of `(input, expected output)` rows generated from
the JS model. The Godot side has one test that reads it and must reproduce every
row. That gives the port an **objective pass condition** instead of a code
review, and it is the same discipline this repo already runs everywhere else: a
promise nobody checks drifts.

```bash
node port/vectors.mjs            # write port/vectors/*.json
node port/vectors.mjs --check    # fail if any is stale (this is the gate)
```

Rules for the vectors, each of which is the reason one exists:

- **Deterministic inputs only.** Every model here is already seeded and
  dice-free, which is what makes this possible at all. A rule that cannot be
  vectored is a rule that cannot be ported honestly.
- **They carry the CAUSE, not just the number.** `market/model.mjs` names the
  dominant factor and `missions/model.mjs` names which trigger fired. A port
  that gets the price right and the reason wrong has not reproduced the game,
  it has reproduced the arithmetic.
- **Each file carries a `rev`.** That integer is what a `VERSIONS.md` **Port**
  block names. It moves when the *outputs* move, not when the file is
  regenerated — so a no-op run does not tell the Godot side to do work.
- **Floats are rounded on the way out.** GDScript and JS do not have to agree
  to seventeen digits, and demanding it turns a port into a fight with IEEE 754.

## 5. The handoff packet

What crosses per version, and nothing else:

1. the **`### Port`** block from `VERSIONS.md`;
2. `port/vectors/*.json` for anything whose `rev` moved;
3. the canon JSON, via `sync-data.mjs`;
4. any **new meshes**, already registered in `art/v3/manifest.json`.

**Deploys and ports never merge.** The Godot side does not pull `web/`, and this
side does not pull `godot/scenes/`. The two builds meet at data and vectors,
which is what keeps either free to be itself.

## 6. Mesh intake — the only art that arrives here

> "Only meshes will be given to you via PR" — owner

So this side **does not make art**. It receives meshes, registers them, and
checks the handful of things that have actually gone wrong before. A mesh PR is
accepted when:

| check | why it is on the list |
|---|---|
| **it is in `art/v3/manifest.json`** | an unregistered file is invisible to `sync-data.mjs` and ships to neither build |
| **the note says what it IS, not who it plays** | recasting must cost nothing — `cast3d-parka-man-v01` was cast, recast and had a stale note claiming otherwise |
| **placeholders are declared** | a placeholder nothing distinguishes from a finished asset is how the wrong face ships permanently |
| **textures are stripped to 512** | 7.1 MB → 1.1 MB, already the house rule |
| **it is rigged, and the skeleton is measurable** | `presenter_3d._rig_height()` reads bone rests. A mesh whose bones do not span its body frames itself wrong in every framing at once |
| **its height is human** | measured, not declared: Toko 1.683, the shot-caller 1.730, Arvo 1.777 units. Something at 0.016 or 17 is an export-scale error and looks like a framing bug for a day |

**Nothing about a mesh PR needs a vector.** A mesh is data (§3.1) — it crosses
untouched.

## 7. What unparking already found

The browser build's contract gate had not run since 2026-08-21, and in that time
canon moved out from under it three ways:

| assertion | said | is |
|---|---|---|
| anchors on the map | 12 | **13** |
| active slice anchors | 8 | **10** |
| authored battles | `2v2, 3v3` | `2v2, 3v3, 3v3` |
| registered courtyard scene | `…-v02` | `…-v05` |

The additions are legitimate — Sörnäinen harbour and Suvilahti are referenced by
the slice — so the gate now asserts what the content actually is, to stop the
*next* drift. **But `DESIGN_AUTHORITY.md`'s locked-direction paragraph still
says "twelve-anchor graph … with eight active slice anchors", and that is a
level-2 document disagreeing with a level-7 one.** Per its own rule that is a
decision to record rather than average, so it is in `QUEUE.md` for the owner and
has not been edited here.

**That is the argument for this whole ruling in one table.** A build nobody runs
stops being a check on anything, and the checks it was carrying die quietly with
it. Two builds only stay honest if both of them run.

## 9. The texture budget, measured rather than repeated — 2026-08-27

`JS_BUILD_CATCHUP.md` §4 reported a Pixel 10 black-screening the Godot web
build against **182MB of uncompressed texture**, and flagged that any build
adopting the 3D assets inherits that budget. Before writing more art-dependent
`web/` code it was worth checking whether that number still describes the
catalogue, and whether "182MB" is actually what a play session loads.

**Method.** A real `GLTFLoader` (the same vendored three.js the rest of this
repo uses) loaded every registered GLB and every registered scene/cast image,
and every decoded texture was measured as `width × height × 4` — uncompressed
RGBA, the number that actually determines VRAM, not file size on disk.

### The whole catalogue is worse than the number on record

| | JS_BUILD_CATCHUP (22 Aug) | measured today |
|---|---|---|
| scope | scenes(14) + cast3d(14) + 2D cast(72) | **everything currently registered**: 26 GLB + 112 images |
| total | 182 MB | **234.9 MB** |

The gap is not drift in the old categories — it is categories that did not
exist yet when 182MB was measured: the three `stage3d/` dioramas (32MB, none
counted before), `jaska-v01` (4MB, cast after 22 Aug), and `equipment/` (6.7MB).
**The number was right for what existed on 22 Aug and is stale now**, which is
the same shape of finding as the anchor-count drift in §7 — a figure that
was never wrong when written keeps getting quoted after the thing it measured
moved.

### But nothing loads the whole catalogue at once

Neither engine eager-loads meshes. `godot/scenes/battle_stage_3d.gd` and
`presenter_3d.gd` call `load(path)` per unit as it is deployed, not at boot —
checked directly, not assumed. Simulating one realistic 2v2 battle (one
`stage3d` diorama, four cast bodies with their clips, the inset presenter) came
to **36MB**, comfortably inside any device's budget. **182–235MB is a
stress-test number, not a play-session number.**

### What this does and does not settle

- **`web/` owes nothing here today.** It is a `getContext('2d')` build that
  loads zero GLBs (checked: `app.js` never references a `.glb`, only
  `assetUrl()` for 2D layers). The 3D texture budget is not this build's
  problem until §1.0's open question — does `web/` adopt 3D — is answered.
- **The Pixel 10 black screen is still unexplained.** Ordinary play does not
  approach the number that reportedly broke it, so uncompressed VRAM is
  probably not the direct cause. `JS_BUILD_CATCHUP.md` already named two other
  live suspects — `vram_texture_compression/for_mobile=false` and
  `thread_support=false` (GitHub Pages cannot send COOP/COEP) — and this
  measurement narrows toward them without confirming either. **Nobody has
  reproduced this on the actual device since**; a real Pixel 10 (or the same
  PowerVR driver family) is what settles it, not another desktop measurement.

## 10. Before touching UI on either side — render both, first

> owner, 2026-08-28, on a session of `web/` UI work built without once looking
> at the current Godot screens: "you seem to have old 2d graphics and UI"

**What happened.** A pause menu, a market panel and committed-context CSS were
all built against `v3.css`'s existing flat dark panels — the material that
predates `PHASING.md` §1.055 entirely. In the same checkout, `godot/ui/chrome.gd`
had already shipped a torn-carton material (dark card, ripped edges, cream
plates, per-action accent colours) weeks earlier, following the direction
`art-library/ux-concepts/README.md` settled on 24 Aug. Nothing forced a look at
it before adding more of the old material on the other side.

**The general shape, and it is not new — it is §7 again.** A build nobody
looks at stops being a check on anything. §7 was about a gate that stopped
running; this is the same failure one layer up, about a *person* who stopped
looking. Having both trees in one checkout does not fix it by itself — it has
to be a step, not a hope.

**The rule.** Before UI or chrome work on either side, render **both**, in the
same sitting:

```bash
NODE_PATH=$(npm root -g) node web/tools/capture.mjs .capture   # this build
cd godot && PIRITORI_SHOT_DIR=../.capture xvfb-run -a \
  /path/to/Godot --path . --rendering-driver opengl3 res://tools/capture.tscn
```

Both write `piritori(-web)-<screen>-<size>-<lang>.png` into the same
directory, so `ls .capture` puts a `web-` file next to its Godot counterpart
by name. `web/tools/capture.mjs` needs Playwright, and ESM `import` does not
honour `NODE_PATH` the way CJS `require` does — symlink it once:
`ln -sfn "$(npm root -g)" web/tools/node_modules` (gitignored — see the note
in `.gitignore` about why a *symlinked* `node_modules` needed its own rule).

**What this is not.** It does not mean `web/` must match Godot's material —
§1.0 already leaves open whether `web/` even adopts 3D, and matching a chrome
built for a 3D board onto a 2D canvas might be the wrong move entirely. It
means the decision gets made **looking at the current render of both**, which
is the one thing that did not happen this time.

## 11. A correction to §7's own list, made looking rather than reading

§7's drift table and `QUEUE.md`'s "THE 2D -> 3D MOVE" section both still say
things like *"the board renders 2D standees"* and *"nothing draws 3D units in
battle."* Both are now false — `battle_stage_3d.gd` renders a lit 3D board with
3D cast models, confirmed by capturing it. Neither has been corrected here
before now; VERSIONS.md's v4.4 entry also stated, without checking, that
`web/`'s committed-context change matched "what the Godot battle screen
already does" for hiding its planning dock — a captured battle screen still
shows it. Recorded as a retraction there rather than edited quietly. `QUEUE.md`'s
whole 2D→3D section wants a fresh pass against the current render, not a
patch; flagged there rather than done piecemeal here.

## 12. Open

1. **Does the Godot side run the vector gate in CI, or by hand?** By hand is
   fine while one person drives both; it stops being fine the moment it isn't.
2. **What happens when the port finds a rule WRONG?** Landscape and a controller
   will expose things a browser cannot. The answer is presumably that the fix
   lands in JS and comes back as a new vector rev — but it needs saying, or the
   port will quietly fork rather than report.
3. **Does `web/` still owe a portrait layout?** §3.3 says the Godot build owns
   landscape. It does not say the browser build may stop caring about phones,
   and `UX_SPEC.md` still has a responsive-reflow section.
4. **Does anything actually reproduce on the Pixel 10?** §9 narrowed the
   texture-budget theory without confirming it. The device (or its PowerVR
   driver family) is the only thing that can settle this now.
