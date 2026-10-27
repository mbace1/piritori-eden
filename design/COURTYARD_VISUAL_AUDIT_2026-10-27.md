# Courtyard visual audit — 27 October 2026

Source candidate `c03b7468e42ad07aa2be8c65c469a5f0d1f54732`. C18 renderer
review run 40524921514, artifact `c18-ui-rendering`, includes `phone-battle.png`
and `desktop-battle.png`. These are automated browser captures, not a physical
Pixel or iPad acceptance. They show the existing Night Shift rescue fixture,
not the Act I campaign's full experience.

## What the pictures show

- The courtyard has a clear floor, warm windows and readable fighter rings;
  those are worth keeping.
- The long rows repeat the same façade and windows, so the place reads as
  stacked modules rather than a lived-in Kallio courtyard.
- Large pale caps and perpendicular roof/wall pieces dominate the upper corners;
  the joins read as components laid across each other. Verify from more camera
  angles before concluding whether an actual geometric gap or intersection
  exists.
- In desktop framing, an exceptionally large blank exterior wall is visible to
  the left, with little context beyond the playable floor. On the phone, the
  action occupies a relatively small part of a dark board. Neither layout
  test scores visual coherence or the relative importance of the characters.
- `web/test/level-layout.mjs` passes 870 numerical checks for the four
  assembled locations. They verify the declared footprints/joins, not the
  appearance of the actual kit meshes, roof transitions or materials.

## Next visual slice: courtyard only

1. Capture the actual courtyard in tactical, oblique and overhead views at
   phone portrait, landscape and desktop, and inspect the exterior walls and
   roof intersections. Include a shot with multiple people and cover.
2. Make one targeted pass to connect or disguise the worst visible corner,
   reduce repeated-window rhythm and improve the blank exterior surface while
   keeping the authored floor, door, cover, exit and playable cells clear.
   Reuse the existing kit; avoid a new model/asset pipeline.
3. Compare before/after at the same camera, lighting and device sizes; check
   joins and occlusion, then measure draw calls, first-load size and phone
   performance. Keep the warm/cold lighting and the readable fighting space.
4. Show the resulting playable hub build to the owner; do not count the
   numerical layout test alone as visual approval. Only after courtyard works,
   carry the lessons to yard, street, quay and the separately built park.
