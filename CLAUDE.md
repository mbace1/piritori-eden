# Working rules — Piritori → Eden

Read this before every session. These rules outrank convenience, speed,
and your own judgment about what would be tidier. If a rule blocks you,
stop and ask — do not route around it.

A narrative strategy game set in Kallio, Helsinki, 2003. Godot 4.7.2,
project at `godot/`. Split out of the Suds-Jack monorepo on 2026-08-21
with its history intact.

---

## 1. One part per prompt

Do the one thing asked. Not the thing asked plus the refactor you noticed,
not the adjacent file that looked wrong, not the "while I was in there."

If you spot something else worth doing, append it to `QUEUE.md` and say so
in your summary. Do not act on it.

**Commit after each step.** Small, single-purpose commits with a message
that says what changed in plain language.

---

## 2. No new dependencies

Do not add Godot addons, plugins, GDExtensions, npm packages or CDN
imports. The engine, the six test scenes and a handful of Node scripts are
the whole toolchain and that is deliberate.

If you believe a dependency is genuinely required, stop and ask before
writing any code. Reaching for a package is usually a sign you are lost in
a problem — say that instead, and we will back up.

Same rule for new build tooling and config files.

**The one honest exception, already taken:** `fontTools`, used offline by
`godot/tools/build-font-subset.py` to cut the CJK glyph subset. It never
runs in the game and never ships with it.

---

## 3. End every step with a test brief

Finish each response with exactly this, and nothing longer:

```
CHANGED: <one line>
TEST: <how to reach it — mode, day/block, input>
LOOK FOR: <what correct looks like, and what failure looks like>
```

Testing happens on a phone by playing the game at the deployed URL.
Assume no console, no devtools, no diff review. If the change is not
reachable in under 30 seconds of play, make it reachable in the same step.

**This is currently harder than it should be, and that is a known gap.**
Nothing in the build reads a URL parameter yet — there is no `?day=5` and
no way to jump to a battle. Until rule 6 is satisfied, a test brief must
give the real click path from a cold start, honestly, including how long
it takes.

---

## 4. One hat at a time

Art, Design, Content and Engine are roles, not parallel workers. Wear one,
finish the pass, commit, then switch. Never edit outside the lane you are
currently in.

| Lane | Owns |
|---|---|
| **Art** | `art-library/`, `art/v3/`, `art-src/`, `godot/ui/` drawing code, `ART_BIBLE.md` |
| **Content** | `content/`, `map/`, `godot/locale/`, the authored slice |
| **Engine** | `godot/autoload/`, `godot/scripts/`, `godot/tools/`, `godot/tests/`, `port/` |
| **Design** | `PHASING.md`, `GAME_DESIGN_DOCUMENT.md`, `DESIGN_LOCKS.md`, `UX_SPEC.md`, `PORTING.md` |

**`web/` was missing from this table entirely until 2026-09-02, and that is
exactly what it cost.** The table was written when `godot/` was the
implementation. `web/` then became the primary build (`PORTING.md` §1.07)
and inherited no lane at all — so every session touching it was, by this
document's own rule, in no lane and therefore in everybody's. In one day
that produced **three collisions on `render3d.js`, and one animation port
written twice in full by two sessions from the same Godot source.** `web/`
splits the same four ways:

| Lane | Owns, in `web/` |
|---|---|
| **Art** | `render3d.js`, `fight-motion.js`, `stage-camera.js`, `map-relief.js`, `v3.css` |
| **Content** | nothing of its own — `web/` reads `content/` and `map/` |
| **Engine** | `state.js`, `battle.js`, `grid.js`, `board.js`, `stance.js`, `web/test/`, `web/tools/` |
| **Design** | — |

`godot/scenes/` and `web/js/v3/app.js` are shared — each is where a mode's
art, content and logic meet. Say in the commit message which lane you were
wearing when you touched either.

If a task needs another lane, finish yours and name the handoff. Do not
reach across.

**Concurrency, because sessions do run at once.** A lane is not a lock, so
before editing a shared file — `app.js`, `godot/scenes/`, a manifest — run
`git fetch origin main` and read the recent commits touching it. Finding
your work already merged under another session's name is the cheap outcome;
finding it mid-rebase is the expensive one. Where two implementations of the
same thing exist, **keep the one that measures its own assumption**: that is
how the duplicated animation port was settled — the copy carrying a rig gate
stood, the copy verified by screenshot was dropped, and the gate then found
a defect no screenshot could have shown.

---

## 5. Canon, in authority order

**Read the documentation FIRST. Every time. Before diagnosing, before
generating, before calling anything broken.** Owner, 2026-08-27: *"please,
always use documentation."*

This is not advice, and it is not satisfied by having read a doc once in some
earlier session. Two failures in a single round produced this rule:

- Toko's gold mask was reported as a shipped bug. It is **canon**, and said so
  in two places — `ART_BIBLE.md` §8.3 is literally titled "Toko Slomo
  character and mask", and `art/v3/manifest.json` says "The gold smiling mask
  is CANON". A render was looked at; the documentation was not.
- Three replacement T-poses were then generated, badly, when the correct
  edited source was already in the repo at
  `art-src/concepts/people/toko-slomo-notext-v01.png`, with its own `.txt`
  sidecar carrying the prompt that made it.

So, before touching anything:

1. **`grep` the docs for the thing you are about to change**, by name. A
   character, a colour, a layer, a file — if it has a name, search for it.
2. **Look for the asset before making one.** `art-src/` is organised by
   pipeline stage — `concepts/people/`, `meshy-input/`, `scenes/`,
   `approved/` — and every `.png` there has a `.txt` beside it with the prompt
   that produced it. `art-library/references/` holds the formats known to
   work. Generating a duplicate of something that already exists is worse than
   doing nothing, because it looks like progress.
3. **"It looks wrong to me" is not a finding until the docs have been
   checked.** Deliberate design reads as a bug all the time.

If the documentation is genuinely silent, say so explicitly and ask — do not
fill the gap with an assumption and carry on.

1. Direct instruction in this session
2. `PHASING.md` — current phase and its exit gates
3. `DESIGN_AUTHORITY.md` — resolves contradictions between the rest
4. `DESIGN_LOCKS.md` — owner-approved system and content locks
5. `GAME_DESIGN_DOCUMENT.md` — what the game does
6. `COMBAT.md` — the base game: board, initiative, loot, roster churn.
   Supersedes `GAME_DESIGN_DOCUMENT.md` §13 where they differ; §2 of it lists
   every difference
7. `ART_BIBLE.md` — how it looks
8. `UX_SPEC.md` — interaction, navigation, responsive reflow
9. `MAP.md` + `map/kallio-era1-2003-v1.json` — Era I geography
10. `content/era1-slice-v1.json` — the authored seven-day slice
11. `art/v3/manifest.json` — the only valid runtime-art ids

Newer owner direction beats older docs. If two canon docs disagree, say so
and ask — do not pick one silently.

Do not start work belonging to the next phase while a gate in your lane is
still open.

`NARRATIVE.md` holds character canon and is not negotiable by a mechanic:
Aaro's death is fixed, Arvo is a fictional homage and not a portrait, and
people are never scenery.

---

## 6. Debug affordances are features

When adding a system, add the means to test it from a phone in the same
step:

- URL params for state (`?day=5&block=night&battle=courtyard-3v3`)
- A toggleable on-screen HUD: current block, cash, flags, load errors
- Never require a console, a keyboard, or a desktop browser to verify
  something works

**None of this exists yet.** The first system built under these rules
builds the first slice of it. A mode with no way to reach it from a phone
in under 30 seconds is not finished.

---

## 7. Never touch

- `.env`, keystores, signing configs, store credentials — these live in
  GitHub Secrets and never enter the tree
- Git history — no rebase, no force push, no amend of pushed commits
- The deploy workflow and `godot/export_presets.cfg`, unless the task is
  explicitly about deploys. `variant/thread_support=false` in particular:
  GitHub Pages cannot send COOP/COEP headers, so a threaded build is a
  black screen
- `godot/data/` — it is generated. Run `node godot/tools/sync-data.mjs`;
  never hand-edit it. It is the copy, not the canon

---

## 8. When stuck

Two failed attempts at the same problem means stop. Do not try a third
angle, do not add a dependency, do not rewrite the surrounding system.

Report: what you tried, what happened, what you think is actually wrong.
A clear dead end is more useful than a working hack.

---

## 9. Performance gate

**Runs well on a mid-range Android phone is a phase gate, not a
pre-release check.** If a change costs frames on the target device, say so
in your summary even if it looks fine on desktop.

The download is part of this. The build is ~58MB on disk and ~28MB
gzipped, most of it the Godot engine binary — a real cost on a phone data
connection, and the reason art weight is watched rather than assumed. A
new asset that is bigger than the thing it replaces needs a sentence
explaining why.

---

## 10. The gates

Green before any playable milestone. They drive the real interface — a
gate presses the button rather than calling the model, and **a gate that
cannot fail is a finding, not a pass.**

```bash
cd godot
node ../map/validate-map.mjs         # canon is sound
node ../content/validate-slice.mjs
node tools/sync-data.mjs --check     # the copy is faithful
node tools/check-locale.mjs          # en / fi / ja complete
"$GODOT" --headless --path . --import

for t in spine shell locale battle battle_ui playthrough; do
  "$GODOT" --headless --path . tests/test_$t.tscn
done
```

215 checks. `$GODOT` is the 4.7.2 console binary; the doubled folder name
in its path is real.

**A cold `.godot/` segfaults on the first import pass** after doing most
of the work. Run it twice; CI does.

---

## 11. Traps that have each cost a session

- **`export_filter="all_resources"` packs everything under `res://`**,
  referenced or not. A 5.9MB orphaned Meshy test texture shipped in every
  build this way. Check `data/` for strays before an export.
- An asset in `art/v3/manifest.json` carries EITHER a single `file`, OR
  `members[]`, OR `frames[]`. Reading only `file` synced 11 of 52 files
  and reported success.
- A `queue_free()`'d node is **not null**. Freeing a mounted child and
  reading it in `_process()` is a crash.
- A child `Control` draws **over** its parent's `_draw()`.
- Godot **regenerates `.import` files** with a full default `[params]`
  block on reimport, discarding appended keys. Edit the existing key.
- `String(null)` crashes. Authored JSON fields are genuinely null.
- **A negative-width `Rect2` mirrors a texture but does NOT mirror it in
  place** — it lands a full width to the side. Every opposition figure stood
  about a tile off its own cell for a long time because of this, invisible
  because both sides were drawn the same way and nothing marked where the feet
  belonged. Mirror with `draw_set_transform(..., Vector2(-1, 1))` about the
  rect's right edge. (And `draw_texture_rect`'s fifth argument is `transpose`,
  which rotates 90 degrees; flipping there lays the crew on its side.)
- **An art change ends in a picture, not a green suite.** The suite
  certifies *works* and cannot see *looks*.
