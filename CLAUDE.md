# Piritori → Eden

A narrative strategy game set in Kallio, Helsinki, 2003. Godot 4.7.2.

Split out of the [Suds-Jack](https://github.com/mbace1/Suds-Jack) monorepo on
2026-08-21 with its history intact. It lives alone because it is a different
kind of project from the arcade cabinets: it carries real art, a real engine and
a documents-first design process, and it was making every unrelated `git clone`
in that repo pay for it.

## Canon outranks code

**Read `DESIGN_AUTHORITY.md` before changing anything.** It defines the
hierarchy that resolves contradictions, and it is the reason this project has
not drifted into three incompatible versions of itself.

Short form, highest first:

1. Direct owner decisions recorded after the authority reset.
2. `DESIGN_AUTHORITY.md`
3. `DESIGN_LOCKS.md`
4. `GAME_DESIGN_DOCUMENT.md`
5. `ART_BIBLE.md` (visual/asset production)
6. `UX_SPEC.md` (interaction, navigation, reflow)
7. `MAP.md` + `map/kallio-era1-2003-v1.json` (Era I geography)
8. `content/era1-slice-v1.json` (the authored seven-day slice)
9. `art/v3/manifest.json` (registered runtime art ids)

**When two sources at the same level disagree, stop and record a decision.** Do
not silently average them together. A contradiction resolved in code and not in
the document is a contradiction that comes back.

## The engine

Godot 4.7.2, project at `godot/`.

```bash
GODOT="/c/Users/Mikael/Documents/Codex/2026-08-20/can-you-connect-to-godot/tools/godot/Godot_v4.7.2-stable_win64.exe/Godot_v4.7.2-stable_win64_console.exe"
```

Note the doubled folder name — the zip extracted into a directory named after
the exe. Web export templates live at
`~/AppData/Roaming/Godot/export_templates/4.7.2.stable/`.

### The gates — all six must be green

```bash
cd godot
node tools/sync-data.mjs --check     # canon is byte-identical in res://data/
node tools/check-locale.mjs          # no missing or stale translation keys
"$GODOT" --headless --path . --import

for t in spine shell locale battle battle_ui playthrough; do
  "$GODOT" --headless --path . tests/test_$t.tscn
done
```

215 checks at the time of the split. They are **interface-driven**: a gate
drives the real button (`button.pressed.emit()`), never the model directly. A
gate that cannot fail is a finding, not a pass.

## The data seam

`godot/data/` is **git-ignored and generated**. It is a byte-identical copy of
the canon above it, made by `tools/sync-data.mjs`, which verifies by sha256 and
refuses to run on drift.

This exists so there is exactly one copy of canon in the repository. Committing
`data/` would create a second one, and the second copy is the one that goes
stale. Regenerate it, never hand-edit it:

```bash
node tools/sync-data.mjs
```

An asset in `art/v3/manifest.json` carries EITHER a single `file`, OR a
`members[]` array, OR a `frames[]` array. Reading only `file` silently skips
every head, torso, leg, weapon and animation frame in the pack — that bug
shipped once and synced 11 of 52 files while reporting success.

## Art is a first-class asset here, and that is not an exception

The Suds-Jack arcade draws its hub marquees in code and several of its cabinets
are deliberately image-free. **That is a per-project aesthetic choice about
those projects, not a rule this one is violating.** Older wording in this repo
called Piritori "an explicit exception to the repository's global no-image-assets
convention"; there was no such global convention, and the apologetic framing
made a normal decision sound like a debt.

The real rules, which are about pipeline hygiene rather than permission:

- Source art lives in `art-library/`. Web-ready runtime derivatives live in
  `art/v3/` and are registered in `art/v3/manifest.json`.
- **Runtime code resolves stable ids from the manifest.** It never guesses a
  filename and never loads a review sheet directly.
- `art-library/archive/needs-rework/` is provenance only. It may never become a
  runtime dependency.
- Approved does not mean production-ready. It means the direction is settled.

## Generating art

Nano Banana (Gemini) for 2D, Meshy for 3D. Both go through stable wrappers:

```bash
~/.nano-banana/nb.sh --prompt "..." [--images ref.png] [--aspect-ratio 16:9] [--resolution 2K]
~/.meshy/m3d.sh --image prop.png --output prop.glb
```

**Meshy credits are real money.** Check the balance before batch jobs.

Two things learned the hard way:

- Image-to-3D wants a single centred object, three-quarter view, flat neutral
  background, even light, no cast shadow, margin around the silhouette.
- **Anything to be rigged is concepted in a T-pose**, and it needs a
  volumetric body — auto-rigging fails on a stick figure.

## Deploying

The game deploys as a folder on the Suds-Jack `gh-pages` site, which is the
arcade the hub links to. The source lives here; the build lands there.

```bash
cd godot && ./tools/export-web.sh
```

**Threads are off, and that is not a preference.** Godot's web export wants
`SharedArrayBuffer`, which needs COOP/COEP response headers. GitHub Pages serves
static files and cannot set headers, so a threaded build is a black screen with
a console error. `export_presets.cfg` sets `variant/thread_support=false` and
the script verifies the built wasm rather than trusting the setting.

`export_presets.cfg` **is committed**, unusually — it normally carries keystore
passwords, this one carries none, and the thread setting must not live on one
machine only.

## Traps that have each cost a session

- **`export_filter="all_resources"` packs everything under `res://`**, referenced
  or not. A 5.9MB orphaned Meshy test texture shipped in every build this way
  before anyone noticed. Check `data/` for strays before an export.
- A `queue_free()`'d node is **not null**. Freeing a mounted child and then
  reading it in `_process()` is a dangling reference and a crash.
- A child `Control` draws **over** its parent's `_draw()`. Chrome that must sit
  on top of a subviewport needs its own layer added after it.
- Godot **regenerates `.import` files** with a full default `[params]` block on
  reimport, discarding appended keys. Edit the existing key in place.
- `String(null)` crashes. Authored JSON fields are genuinely null sometimes.
