# Piritori runtime art v3

This directory is the optimized, registered prototype pack for the Era I
vertical slice. Source and review material stays in `piritori/art-library/`.

The pack follows `ART_BIBLE.md`:

- opaque location stages are lazy-loaded WebP;
- modular characters, equipment and ambient motion use WebP alpha;
- formation and weather geometry remains SVG;
- dynamic text, focus and controls stay in the runtime UI;
- the Toko v02 screen is the approved corrected-mask flattened prototype with baked copy and
  controls, so v3 must overlay live interaction and later separate its layers;
- the courtyard and weather pieces remain explicitly semi-approved prototype
  material. Their presence here is not final-art approval.

`manifest.json` is the only runtime asset register. Code should resolve assets
by stable id rather than guessing filenames. No file under
`art-library/archive/needs-rework/` may be referenced.
