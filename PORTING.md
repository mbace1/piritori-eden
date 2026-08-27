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

**Both are real builds.** This is not a prototype and a product. The port exists
to answer a question the browser cannot — whether a game about routes, blocks
and formations is playable with two sticks on a television — and that question
is worth a whole second implementation.

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

## 8. Open

1. **Does the Godot side run the vector gate in CI, or by hand?** By hand is
   fine while one person drives both; it stops being fine the moment it isn't.
2. **What happens when the port finds a rule WRONG?** Landscape and a controller
   will expose things a browser cannot. The answer is presumably that the fix
   lands in JS and comes back as a new vector rev — but it needs saying, or the
   port will quietly fork rather than report.
3. **Does `web/` still owe a portrait layout?** §3.3 says the Godot build owns
   landscape. It does not say the browser build may stop caring about phones,
   and `UX_SPEC.md` still has a responsive-reflow section.
