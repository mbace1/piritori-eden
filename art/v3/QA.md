# Runtime art v3 — extraction QA

Checked: 2026-08-21.

- All 44 WebP files decode and all eight SVG files are non-empty.
- The three scene plates retain their intended 16:9 composition.
- Character, equipment, animal and foliage derivatives preserve alpha.
- The optimized pack is approximately 1.3 MB, down from the much larger PNG
  sources, while the source library remains untouched.
- Desktop contact sheets and full-size Toko v02, Karhupuisto and courtyard plates
  were visually inspected after conversion.
- `content/validate-slice.mjs` checks file presence, WebP headers, declared
  scene hashes, stable ids and archive exclusions.

Known prototype limits:

- Toko v02 corrects the nested eye openings but still contains baked copy and controls; live v3 interaction must sit
  above the image and later replace those baked areas with separated layers.
- The courtyard remains semi-approved because its building consistency needs
  another art pass.
- Weather layers remain semi-approved until density, masks and palette are
  tuned in motion.
- Character cuts retain the approved concept-extraction edge treatment and
  socket cues. Production cleanup, hair/hat separation and rig normalization
  remain required; do not call these final sprites.
