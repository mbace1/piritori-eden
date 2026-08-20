# Piritori → Eden — Godot implementation handoff

Status: **ACTIVE implementation guidance**
Baseline main commit: `53fae45fa868647382ef47244f45a5f8d7cd1eef`
Target: Godot 4.3+; desktop and mobile-first responsive presentation

This file is the coordination surface for a remote or desktop instance porting
Piritori → Eden to Godot. It does not create new canon. When it conflicts with
the authority stack below, the authority stack wins.

## 1. Read before building

In order:

1. `DESIGN_AUTHORITY.md`
2. `DESIGN_LOCKS.md`
3. `GAME_DESIGN_DOCUMENT.md`
4. `ART_BIBLE.md`
5. `UX_SPEC.md`
6. `MAP.md`
7. `content/era1-slice-v1.json`
8. `art/v3/manifest.json`
9. this handoff

`NARRATIVE.md` contains the current character canon, including Kati, Aida,
Aaro's inevitable death and Aatami's later stroke. Era II may be designed in
documents but remains production-gated. Do not build Pasila 2024–2025 content
until `DESIGN_LOCKS.md` §12.1 is satisfied.

## 2. Port boundary

Port the **validated seven-day Era I slice**, not the whole 5–10-hour campaign.
The first Godot milestone must preserve:

- the complete twelve-anchor Kallio map visible from the opening;
- Piritori selected as the only live first lead;
- the authored first purchase and profitable first sale;
- fourteen Day/Night blocks across seven days;
- the five modes: City, Location, Market, Mission/Battle and News/Events;
- the finite crew, offers, missions, 2v2 and 3v3 encounters in the slice JSON;
- the same saved campaign state across every mode;
- landscape and portrait layouts using the same world and data.

Do not replace this with a free-roaming action game, generic roguelike map,
menu-only *Drug Wars* clone or tile-by-tile tactics game.

## 3. Canonical data inputs

Treat these files as importable data rather than rewriting their values into
scene scripts:

| Source | Godot responsibility |
|---|---|
| `map/kallio-era1-2003-v1.json` | anchors, sites, public corridors, coordinates and slice states |
| `content/era1-slice-v1.json` | campaign state, encounters, offers, crew, missions and bulletins |
| `art/v3/manifest.json` | active runtime asset ids, files, approval and production status |
| `art-library/animation/manifest.json` | source animation poses and layer identity |
| `art-library/weather/manifest.json` | weather layer order and variants |
| `art-library/characters/system/role-tabs.json` | modular role/UI vocabulary |

Keep stable string IDs. A Godot resource may cache parsed data, but the JSON
remains the comparison source until a separately validated migration is
approved.

## 4. Recommended Godot structure

```text
piritori/godot/
  project.godot
  autoload/
    content_registry.gd
    game_state.gd
    save_service.gd
  scenes/
    app_shell.tscn
    city_map.tscn
    location_stage.tscn
    market_ledger.tscn
    mission_brief.tscn
    formation_battle.tscn
    news_event.tscn
  ui/
    top_status.tscn
    bottom_commands.tscn
    focus_sheet.tscn
  tests/
```

`GameState` owns one serialisable campaign model. Scenes emit commands and
render state; they do not keep parallel cash, stock, relationship or time
values. `ContentRegistry` resolves canonical IDs and reports missing references
as errors rather than silently substituting placeholders.

## 5. Mode contracts

### City

- North remains up and public topology follows `MAP.md`.
- The full Era I frame fits before any focus zoom.
- Routes follow graph edges and never draw through buildings or water.
- Ordinary people flow, crew/goods flow, weather, pressure and UI are separate
  render layers.

### Location

- Use the LOOK / TALK / USE / LEAVE grammar plus earned contextual actions.
- Text and controls stay live Godot UI; do not bake new copy into scene art.
- Toko's existing flattened image is an explicit prototype exception. Overlay
  live copy and buttons now; later split stage, Toko, mask, props, steam and
  window pass as required by its manifest note.

### Market and mission

- The ledger reveals only earned contacts, offers and quote confidence.
- Commitment shows time, cash, crew, equipment, pressure and uncertainty first.
- Criminal logistics remain abstract; add no weights, concealment, dosing or
  evasion instructions.

### Formation battle

- Mostly invisible mirrored 3×3 formations with front, middle and back rows.
- The slice concentrates on 2v2 and 3v3; four per side is the later cap.
- Position, cover, weapon reach and commitment matter more than movement.
- Repositioning costs an action. Support auto-command and withdrawal.
- Downed is not automatic death; lethal risk must be forecast.

## 6. Art import rules

- Use `art/v3/manifest.json` for prototype-ready runtime derivatives.
- Use `art-library/` only when producing a new derivative; never activate files
  from `art-library/archive/needs-rework/`.
- Preserve transparent alpha on modular heads, torsos, legs, equipment and
  animation poses.
- Keep broad cut-cardstock shapes, torn fibres, shallow physical shadows and
  sparse imperfect marker detail. Do not redraw everything as clean vector art
  or generic polished comic art.
- Keep weather, foliage, animals, characters, foreground props and UI on
  separable layers for animation and responsive cropping.
- Semi-approved courtyard, docks, props, weather and battle layouts remain
  visibly labelled placeholders rather than being promoted to final art.

## 7. UI and responsive rules

- Minimum interactive target: 44 logical pixels.
- Use Godot `Control` containers and anchors; do not scale a single desktop
  canvas down for mobile.
- Landscape keeps the world dominant with a command rail. Portrait crops the
  same world camera and moves commands into a lower mobile sheet.
- Text, prices, probabilities, focus and disabled states must remain readable
  without relying on colour alone.
- Era I has feature phones, SMS, television and place-bound desktop internet;
  never use smartphone-app visual language.

## 8. Save, determinism and accessibility

- Save at every non-combat decision boundary and after battle resolution.
- Store schema version, content package id and stable authored flags.
- Seed any simulation randomness and keep integer strategic ticks so a saved
  run can be reproduced.
- Provide reduced-motion fallbacks for wind, weather, route flow and character
  idle animation.
- Keyboard, controller and touch must all reach the same actions and readable
  focus states.

## 9. First Godot acceptance gate

The port is ready for review when a clean checkout can:

1. open on the full Kallio map with Piritori highlighted;
2. enter Piritori, buy the first abstract pack and reveal the profitable sale;
3. progress the same campaign state through all five modes;
4. complete the seven-day slice and produce its current ending state;
5. resolve both a 2v2 and 3v3 formation encounter;
6. save, quit, reload and resume at the same decision boundary;
7. reflow at representative phone portrait, phone landscape and desktop sizes;
8. resolve every referenced map, content and art ID without fallback assets.

Before publishing, the existing source gates must still pass:

```sh
node piritori/map/validate-map.mjs
node piritori/content/validate-slice.mjs
node piritori/test/v3-contract.mjs
node piritori/test/v3-state.mjs
node piritori/test/v3-battle.mjs
```

Add Godot headless import and smoke gates alongside these; do not delete the
browser gates while the implementations coexist.

## 10. Git coordination

- Fetch current `main` before every milestone; do not work from historical PR
  #269 or the old Claude handoff files.
- Keep `.godot/`, imported caches and editor-local settings out of Git.
- Commit source scenes, scripts, resources, import metadata required by Godot
  and project-owned art only.
- Never overwrite unrelated work. A remote conversion should use a dedicated
  branch while active, then publish one validated, reviewable milestone to
  `main` without force.
- Record the exact source commit and Godot version in each milestone message.
