> [!WARNING]
> **LEGACY PRODUCTION HISTORY.** Active direction now lives in
> [DESIGN_AUTHORITY.md](DESIGN_AUTHORITY.md), the GDD and
> [art-library/APPROVALS.md](art-library/APPROVALS.md). This file is retained for
> traceability and must not override those sources.

# Content production — handover to Codex

**Owner's call, 2026-08-19.** All art and content production for Piritori →
Eden moves to Codex. This document is what you need to make art, cut it, and
get it onto the live arcade, plus an honest list of what the previous pass got
wrong so it is not repeated.

The **code** is in reasonable shape and is not the problem. The art is.

---

## 0. Where everything stands right now

| | state |
|---|---|
| `main` | current. Everything below is on it. |
| `gh-pages` | **live at v2**, commit `4ba15055`, `/Suds-Jack/piritori/` |
| the live art | **the art the owner rejected.** Still on the site. See §6. |
| the code | rooms, fights, props, figures, the money-leak fix — all working |
| the styles | rewritten and *unproven* — three assets regenerated to test them |

The three regenerated assets (`body-base`, `fig-them-stand`, `interior-toko`)
are in `assets/out/2d/`. They are the closest anything has got to the targets
and they are still a starting point, not a delivery.

---

## 1. What the art is supposed to be

`ART_BIBLE.md` §1.-1 is the record of the owner's eight target images and it
**outranks everything else in that file**. It splits the art into two registers
and nothing mixes them:

| register | used for | what it is |
|---|---|---|
| **PAPER** | the map, and every interior you stand in | a **physical cut-paper / torn-card relief diorama**, photographed. Slate paper ground, buildings as raised paper blocks with torn edges and real drop shadow, water as navy card. "Toko's shop is the same craft: **paper lantern, paper shirt, paper bowls**." |
| **INK** | the fights — backgrounds **and figures alike** | **Darkest Dungeon.** Hard black line, painted muted fills, deep warm chiaroscuro, one practical light. The bible notes the arena references are "close to what the pipeline already produces" — i.e. `kallioNight` in `assets/manifest.mjs` is the approved register. |

> "the map is a thing you handle, the fight is a thing you are inside."

**Get the target images from the owner before you generate anything.** They are
not in this repo — no branch carries them, and working from a written summary of
somebody's art instead of their art is the root cause of everything in §5.

---

## 2. The pipeline

Everything is driven from **`assets/manifest.mjs`** — one `STYLES` block per
game and one `ASSETS` entry per image. Change a prompt and the hash changes, so
the output lands at a new filename and the old one is detectably stale. Nothing
under `assets/out/` is edited by hand.

```bash
export GEMINI_API_KEY=...            # ask the owner; never commit it
node scripts/assets.mjs status                     # what is missing / stale
node scripts/assets.mjs gen --only piritori/interior-toko
node scripts/assets.mjs gen --dry                  # what a full run would cost
node scripts/assets.mjs prune                      # delete superseded output
node scripts/assets.mjs index                      # rebuild assets/index.json
node test/assets-smoke.cjs                         # the pipeline's own gate
```

`--only` takes ONE id per invocation in practice; loop in the shell for a batch.

### Fields on a 2D asset

| field | note |
|---|---|
| `id` | `piritori/<thing>`; becomes the filename |
| `style` | key into `STYLES`, prepended to the prompt |
| `prompt` | the subject; read LAST by the model, so it wins on specifics |
| `aspect` | **must be one of** `1:1 1:4 1:8 2:3 3:2 3:4 4:1 4:3 4:5 5:4 8:1 16:9 9:16 21:9`. Anything else 400s at the API, and only once you are mid-batch. `test/assets-smoke.cjs` checks this. |
| `ref` | **another 2D asset id.** Its bytes go into the request as a reference image and its hash rides in this spec's hash. This is the only way a character survives a re-pose — ten poses generated independently are ten different men. The referenced asset must appear EARLIER in `ASSETS`. |

### From a generated plate to a shipped file

`assets/out/` is a **38 MB build directory. It is not deployed.** What ships
lives in `piritori/art/` and gets there through `kindling/tools/cut.mjs`:

```bash
# anything with alpha — props, figures
node kindling/tools/cut.mjs key  assets/out/2d/piritori-cover-bin.HASH.png piritori/art/props/bin.png
node kindling/tools/cut.mjs trim piritori/art/props/bin.png piritori/art/props/bin.png --width 256 --pad 2

# paintings — arenas, interiors
node kindling/tools/cut.mjs web assets/out/2d/piritori-arena-court.HASH.png \
  piritori/art/arenas/court.webp --width 1344 --q 80
```

- `key` — flat `#FF00FF` background → real alpha, with despill, an outward
  bleed, and despeckling. It also samples the four corners, because a style
  that asks for grain will tint the background and the ratio test misses it.
- `trim` — crop to the ink. A sprite's anchor is its own edge; an untrimmed one
  is anchored wherever the model felt like putting the subject.
- `web` — WebP. Took the eight paintings from 16 MB to 2.6 MB. A cabinet opens
  on a phone.

The game loads `piritori/art/...` by plain relative path and **every load is
allowed to fail** — a missing file means the board draws flat paper and plain
shapes, and nothing throws. Keep that property.

### Where the game reads each thing

| file | drawn by |
|---|---|
| `art/rooms/<contact>.webp` | `js/main.js` — `roomPicture()` |
| `art/arenas/<kind>.webp` | `js/fightview.js` — `useArena()` |
| `art/props/<kind>.png` | `js/fightview.js` — `propArt()` |
| `art/fig/{you,them}-{stand,down}.png` | `js/fightview.js` — `figArt()` |

The room portrait is **cropped out of the room picture** — `face: [cx, cy, r]`
per contact in `js/narrative.js`, fractions of width/height and a radius in
fractions of the short side. **Redraw a room and you must re-read its face
triple**, or the portrait crops the wrong part of the picture. Check it in a
screenshot; there is no other way to check a crop.

---

## 3. Pushing to the hub

The site is the **`gh-pages` branch**. Static files, no server, no build at
deploy time. `DEPLOY_SPEC.md` at the repo root is the general contract; this is
the Piritori-specific procedure.

### Directly, if you have push access

```bash
git worktree add /tmp/ghp origin/gh-pages --detach

# 1. the game folder — NEVER test/, art-src/ or assets/
rm -rf /tmp/ghp/piritori && mkdir -p /tmp/ghp/piritori
tar -cf - --exclude=test --exclude=art-src --exclude=explorations -C piritori . \
  | tar -xf - -C /tmp/ghp/piritori

# 2. flow-core, if it changed — shared with toko-move
tar -cf - --exclude=test --exclude=tools -C flow-core . | tar -xf - -C /tmp/ghp/flow-core

# 3. the shell token is the SITE'S, not main's
grep -o 'hub/shell.js?v=[0-9]*' /tmp/ghp/flashprince/index.html   # what the site uses
sed -i 's|hub/shell.js?v=17|hub/shell.js?v=NN|' /tmp/ghp/piritori/index.html

# 4. verify against THAT tree, then push
cd /tmp/ghp && git add -A && git commit && git push origin HEAD:gh-pages
```

Four rules that are not optional:

1. **`hub/versions.json` is edited BY HAND, one game at a time.** Do **not**
   run `scripts/versions.mjs` over the site. It currently disagrees with the
   committed file about eight cabinets and wants to move most of them *down*
   (hyperdagger 31→25, dropcabal 3→2) and delete `kindling` outright. Somebody
   should reconcile that; a deploy of one game is not the place.
2. **`hub/games.js` belongs to the site.** Edit the piritori entry's `note` /
   `controls` in place. Overwriting the file deletes cabinets that only exist
   there.
3. **Bump `?v=` tokens for every module whose bytes changed**, and only those.
   A token belongs to a *file*, not a filename — a blanket `sed` on
   `palette.js?v=1` hits nine files across this repo because half the games
   have a module by that name.
4. **Deploys never merge.** Copy in one direction only.

### Through me, if you cannot push

Open a PR into `main` with the manifest changes, the generated output under
`assets/out/`, and the cut files under `piritori/art/`. Say in the description
which assets are new and which are replacements. I will run the gates, look at
a render of each screen, and do the `gh-pages` copy above.

### Verifying

The gates prove the code works; they cannot see whether it looks right.

```bash
node piritori/test/fight.mjs        # 93
node piritori/test/market.mjs       # 47
node flow-core/test/contract.mjs    # 29
NODE_PATH=$(npm root -g) node flow-core/test/smoke.cjs   # 67, real browser
NODE_PATH=$(npm root -g) node test/hub-smoke.cjs         # the cabinet
node test/assets-smoke.cjs                               # the pipeline
```

**An art change ends in a screenshot, never in a green suite.** Serve the tree
and look at: a room, a fight standing, a fight with somebody down, and the map.

Note for whoever runs in this container: **`github.io` is blocked outbound**
(the proxy 403s the CONNECT), so the live URL cannot be curled from here. Serve
the `gh-pages` worktree locally and check that instead, and have the owner
confirm the real URL.

---

## 4. What is still owed, art-wise

| | |
|---|---|
| **all four interiors** | only Toko has been regenerated to `paperRoom` v3; sean / igor / jaska are still v2 storybook |
| **the figures** | `them-stand` only. Needs `you-stand`, both `down`, and the bible's fuller sheet: base bodies × body types × trousers × action poses (targets K/L/M/N) |
| **the clothing split** | the enemy prompt says "dark work coat, different from the reference" and the model copies the reference's jacket anyway. Probably needs its own base body rather than a `ref` it is told to disobey |
| **the props** | five exist, cut and shipping, but generated under the OLD flattened style — regenerate under the corrected `kallioProp` |
| **weapons** | eleven specified in `ART_REQUEST.md` §2, none composited. Needs the cyan grip / orange fore-grip anchor dots and `cut.mjs anchors` |
| **the map** | `piritori/night-map` exists but the game draws the map in code; the PAPER-register map is unbuilt |
| **the ground** | real Kallio coastline blocked — OSM Overpass is 403 at this environment's egress. `flow-core/GROUND.md` has the spec and `tools/ground.mjs` the importer, ready for whenever it is reachable |

---

## 5. The traps — everything the last pass got wrong

Read these. Each one cost a full generate-and-look cycle.

1. **Judging by a contents list instead of by the look.** "Is the mask there,
   is there a lantern, is there a tram in the window" is not the same question
   as "does this look like the reference", and it passed four rooms and four
   figures that did not.

2. **Over-correcting off a complaint by deleting the register.** The first
   interior was a grey cardboard model with a blank-faced mannequin. Four
   things were wrong: grey paper, unlit lamps, no signage, no face. The fix
   written was *"not a photograph, not a 3D render, not a beige cardboard
   model"* — which threw out the cut-paper medium the bible specifies, and the
   next version came back a warm storybook illustration. **Fix the named
   faults; do not delete the medium.**

3. **Flattening the ink register to make keying easy.** A new style was written
   for cut-outs that stripped the paint, the falloff and the grain — and
   produced exactly what `kallio` names as its own failure mode, "a comic".
   Keying was never the problem; `cut.mjs key` handles a painted subject on
   magenta perfectly well.

4. **"Relief diorama" pulls the model to a shadow-box on white, every time.**
   Saying "full bleed, no border, no mount" is not enough. What works is
   instructing the **camera**: *inside the room, walls and counter and ceiling
   running past all four frame edges, you cannot see the outside of the box.*

5. **A style block beats a prompt.** `kallio` ends by asking for paper grain
   over everything and a swatch strip along the bottom edge — right for a
   reference plate somebody looks at, fatal for a sprite somebody cuts out. The
   five cover props came back on a cream ground the magenta key could not touch
   and `trim` reported the crop box as the whole frame. A prompt cannot argue
   with its style; write a second style.

6. **A hash field added to `HASHED_2D` restages the entire catalogue.** Adding
   `ref` to that list gave every spec without a reference a new empty field to
   hash, and 20 assets went stale at once. It rides in `parentHash` instead,
   which only exists where there actually is a reference.

7. **`?v=` tokens: one per file, bumped when that file's bytes change.** Same
   token with different bytes is a browser serving the old file out of cache
   forever. `market.js` nearly shipped that way.

---

## 6. The rejected art is currently live

`gh-pages` commit `4ba15055` put the v2 art on the site along with the code
fixes. The owner has since said it is "nothing like the target art". It is
still there.

Two options, owner's call:

- **Leave it** and let the first Codex batch replace it. The cabinet works and
  looks finished-ish; it is just not the intended register.
- **Pull the art, keep the code.** Delete `piritori/art/rooms/` and
  `piritori/art/fig/` on `gh-pages` and push. The game falls back to flat paper
  and plain shapes on its own — that fallback is deliberate and tested — so
  nothing breaks, and the money-leak fix, the rooms UX and the weight reduction
  all stay live.

---

## 7. Design decisions that are locked

Do not reopen these without the owner saying so in their own words. Full list
in `DECISIONS.md`; the ones that touch art:

- **There are guns.** The blank gun is a real object and the most important one
  in the game — draw it plausibly, because its whole job is that nobody can
  tell.
- **Cover is terrain**, drawn as real objects between the ranks.
- **Only the map STYLE is canon** from the reference maps; the places must
  follow the actual Kallio map.
- **Eden is never a node** and is never explained.
- **Substance names are Dope Wars-style street names**, and some sellers sell
  fake product.
- **Pasila 2024 is canon but phase-gated** — no second-act art until Act I is
  feature complete.
- Reserved colours that never appear in art because code applies them and they
  mean something: warning orange `#ff7a1a`, product magenta `#F0027F`.
