# Piritori to Eden Art Library

This is the categorized, production-facing asset library for approved and
semi-approved visual work. [Art Bible v1](../ART_BIBLE.md) defines the active
visual and production rules; this library records the assets, statuses and
system contracts that support it.

Start with [CATALOG.md](CATALOG.md) for visual links, [APPROVALS.md](APPROVALS.md)
for status, and [manifest.json](manifest.json) for machine-readable categories.
Semi-approved work remains visibly revisable even when the Art Bible establishes
the wider direction.

## Approval labels

Approval and production readiness are tracked separately:

| Label | Meaning |
|---|---|
| `approved` | Accepted as a visual or structural baseline; it may still need cleanup or more frames. |
| `semi-approved` | Useful direction that is safe to retain but still open to visible revision. |
| `needs-rework` | Preserved for comparison only; active work must not depend on it. |

## Active visual grammar

The active character, animal and equipment pass is
`cut-cardstock-hand-ink-v03`:

- large, blunt cardstock shapes establish the silhouette;
- edges can be scissor-cut or lightly torn, never uniformly perfect;
- faces, joints, folds and highlights use only a few visibly hand-drawn marker
  strokes with wobble, dry gaps, pressure variation and occasional overshoot;
- proportions use original early-1990s adult-animation caricature: awkward
  jaws, specific noses, uneven hairlines, deadpan posture and readable hands;
- the result stays personable and sometimes funny rather than uniformly bleak;
- casting reflects ordinary Kallio across Finnish and immigrant-background
  faces, ages, genders and body types, without tying ethnicity to faction,
  morality or combat role.

The `approved-clean-cut-v02` sheets are retained as a simpler approved variant
and structural reference. The more rendered character, animal and weapon pass
is archived under `archive/needs-rework/`.

## Categories

| Directory | Contents | Current status |
|---|---|---|
| `characters/` | T-poses, optional 3D turnaround, heads, clothing, grips and role tabs | approved baseline |
| `weapons/` | separated one- and two-hand Era I silhouettes | approved baseline |
| `animation/characters/` | runner and holding key poses | approved baseline |
| `animation/animals/` | spitz and mixed urban dog key poses | approved baseline |
| `animation/vegetation/` | lime-tree and grass wind poses | approved baseline |
| `locations/` | empty Kallio, Karhupuisto and Sörnäinen plates | mixed; see approvals |
| `props/` | street, park, dock and cover pieces | semi-approved |
| `weather/` | back, mid, front and ground weather vectors | semi-approved |
| `ui/` | formation and responsive battle geometry | approved system baseline |
| `screens/` | landscape and portrait battle assemblies | semi-approved layout only |
| `variants/` | approved alternate visual treatments | approved reference |
| `archive/` | superseded or rejected passes | needs-rework; inactive |

## Battle separation contract

Every battle composition is assembled in this order:

| Layer | Contents | Motion contract |
|---|---|---|
| `00_backdrop` | sky, distant silhouette, far water | slow parallax only |
| `10_facade` | location-defining buildings, tram or dock structure | independent shallow parallax |
| `20_ground` | isometric street, park or dock plane | fixed camera anchor |
| `30_tracks_edges` | rails, curb, path and water edge | fixed to ground |
| `40_cover` | barriers, benches, bins, kiosks and utility objects | individually placeable |
| `50_units` | one transparent asset per combatant | feet-centre pivot |
| `60_cells` | selected, valid, target and cover cells | SVG or engine-rendered |
| `70_fx` | intent, targeting, impact and status | transient overlays |
| `80_top_ui` | round and enemy intent | safe-area aware |
| `90_command_ui` | portrait, condition, actions, auto and withdrawal | responsive modules |

Weather and ambient life remain separate: far fog behind façades, foliage and
dogs in world space, rain and snow in near/far passes, and wet sheen on the
ground. Plates never bake in combatants, grids, targeting or UI.

## Formats and anchors

- Background plates: PNG, landscape `16:9`, with a portrait crop guide.
- Unit cutouts: transparent PNG, feet-centre anchor.
- Cover and props: transparent PNG, ground-centre anchor.
- Character modules: transparent PNG registered to the shared rig.
- Character turnarounds: orthographic PNG sheets for optional 3D conversion.
- Motion: equal-canvas frame sequences or a manifest-defined sprite sheet.
- Weather: transparent SVG layers split into back, mid, front and ground.
- Cells, target paths and command geometry: SVG or engine primitives.

Generated pieces do not bake in floor shadows. Shadows belong to the engine so
modules can move, change rows and swap equipment.

## Helsinki and Era I anchors

- Practical wool caps, parkas, rain shells, work jackets, thrifted coats,
  early-2000s tracksuits and worn trainers.
- Green trams, overhead wires, granite bases, plaster and brick walls, blue
  street signs, printed notices, feature phones, staffed banks and television.
- Euro cash is current; leftover markka can appear as obsolete cash that must
  be exchanged through a teller.
- No smartphones, contemporary LED street furniture, polished cyberpunk neon
  or later Kalasatama skyline.

## Location baselines

- **Karhupuisto:** approved. Small urban park, porous low cover, layered lime
  trees and the abstract red-granite bear landmark.
- **Sörnäinen docks:** semi-approved. Open asphalt, quay edge, warehouse, crane,
  pallets, bollards and sodium lamps.
- **Kallio courtyard v02:** semi-approved replacement candidate. One coherent
  perimeter block, repeated window bays, granite base and a porttikongi.
- **Kallio alley v01:** needs-rework and archived. It remains only as a record
  of the rejected architectural inconsistency.

## System documents

- [Active Art Bible](../ART_BIBLE.md)
- [Modular character system](MODULAR_CHARACTER_SYSTEM.md)
- [Animation and environmental layers](ANIMATION_LAYER_CONTRACT.md)
- [Photo-grounding notes](REFERENCE_NOTES.md)
- [Approval register](APPROVALS.md)

## Responsive battle composition

Landscape keeps the complete mirrored 3x3 or 3x4 formation space visible.
Portrait moves closer and crops quiet outer scenery while keeping the current
unit, relevant cover and valid targets together. The selected portrait and
condition sit above a compact action grid; `AUTO` and `WITHDRAW` share the
bottom utility row.
