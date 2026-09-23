# C.04 — night courtyard lighting reference

Owner, 2026-09-12: recreate the mood and light of Piritori's old 2D backgrounds
in the 3D environments. Read ART_BIBLE.md §§6.2/7.5, STAGE_SPEC.md and the
reference index before changing this scene. The existing art was visually
inspected; no new reference art or Meshy job was commissioned.

## Sources used

- `art-library/references/stages/stage-kallio-kulma-yard-night-v01.jpg`:
  painted night target; warm localized lamps, cool dark surroundings, stone
  paving and an open meeting/fight space framed by buildings and railings.
- `art/v3/scenes/courtyard-prototype-v05.webp`: coherent courtyard architecture,
  repeated window bays, granite base and porttikongi. Prototype geometry reference.
- `art/v3/scenes/kallio-service-yard-v01.webp`: concentrated practical light,
  wet ground and peripheral service objects. Its props must not dictate cells.
- `art/v3/scenes/karhupuisto-v01.webp` and the gazebo-night reference: dark
  foliage and warm windows. Location mood references; the park plate is not a
  ready battle floor according to STAGE_SPEC.md.
- `art/v3/scenes/sornainen-docks-v02.webp`: restrained cold/warm night contrast.
- `art/v3/scenes/toko-slomo-noodles-prototype-v02.webp`: intimate warm interior
  against cold street light, retained for future character-location scenes.

The source register retains approved/semi-approved distinctions. Using mood or
light as reference does not promote every plate or the new 3D study to final art.

## Implemented in C.04

`environment.js` builds a first courtyard study: two warm streetlamps, a cool sky
and restrained visibility fill, localized shadows, individually lit windows,
dark architecture, staggered paving and small wet patches. The old permanent
tactical grid is removed; actionable cells still appear through the existing UI.
Furniture stays around the edge. Existing cover remains at exact resolver cells.

The environment uses instanced boxes and embedded code, adding no texture/model
download. One lamp casts a shadow; no full-screen bloom or reflection pass is
introduced. Camera-side building wings hide on orbit to preserve a view of the
actors; the foreground stays open. This is an inexpensive first environment
pass, not the finished modeled/dressed location or a passed Dream Loop target.

The current door has no assigned NPC destination, so its entrance light remains
off. Streetlamps and lit windows are atmosphere. A narrative door's availability
lamp must later share the exact state of its real Enter action.

## Connected location direction — specified, not implemented here

The GDD's 2026-09-12 owner ruling defines several nearby meeting sites around a
tram-stop/central Kallio area, similar local prices and tram travel to other
markets. Meetings retain the isometric cast behind face close-up dialogue;
authored escalation keeps the same actors/site. Jaska, Slomo, Arvo and other
key people have their own nearby enterable locations, usually signalled by a
lit door when available. Availability follows schedule, chapter and access state.
Leaving returns to the approach site. Existing character roles and canonical
location assignments control placement; Arvo's enterable venue needs authoring.

Those narrative, market, doorway and campaign transitions are not present in
this isolated training module. It remains suitable for lighting, actor, control
and combat testing while the incoming environment assets are inventoried.
