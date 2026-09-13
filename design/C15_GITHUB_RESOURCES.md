# Rendering and production resources — checked 2026-09-13

Dream Loop is a workflow, not a renderer or a packaged effects collection.
Its current main is still `9bddb901f7d071cfefdd21e264267c757177a9df`, the revision
already named in our design. It combines target-image generation, implementation,
actual screenshots and independent criticism. C.15 used the existing rain target
for UI/lighting and a private courtyard target for the new architecture.

| Resource | Verified fit | Decision |
|---|---|---|
| [Dream Loop](https://github.com/achimala/dream-loop) | MIT workflow; Blender scripting and independent screenshot criticism | Apply its target/build/critique process. Do not claim its showcase engine is installed. |
| [N8AO](https://github.com/N8python/n8ao) | Screen-space contact shading; orthographic/WebGL2 support; lower-cost and half-resolution modes | Best next isolated rendering experiment. Test geometry, alpha cutaway and recovery against this build. README/LICENSE say CC0 while package metadata says ISC: preserve/resolve exact pinned distribution terms before vendor adoption. Not bundled in C.15. |
| [postprocessing](https://github.com/pmndrs/postprocessing) | Vanilla Three.js effect composition, bloom/grading; Zlib license | Current package 6.39.5 requires Three >=0.168 <0.187; our vendored Three is r167. Do not casually load latest or stack tone mapping. Pin a compatible release in an isolated test or explicitly test a Three upgrade. Not bundled. |
| [glTF Transform](https://github.com/donmccurdy/glTF-Transform) | MIT; reproducible inspect/dedup/prune/geometry and texture compression | Appropriate offline production step for kit budgets. Compression requiring new runtime decoders needs import/recovery tests. It does not repair artistic proportions or replace Blender. Not installed by this pass. |

For this delivery, the existing Three.js CubeCamera/PMREM, instancing and
conservative rendering profile supply the new static-scene reflections without
an engine or dependency upgrade. This is a deliberate experiment with our own
stage assets, rather than a claim of feature parity with another demo.

Next controlled rendering comparison: same courtyard, same camera and exposure,
contact shading on/off, then restrained glow separately. Capture startup time,
GPU cost where supported, frame time, memory, context recovery and physical
Pixel/iPad results. Choose from actual comparisons; do not add an entire effect
stack to compensate for unfinished assets.

Generic procedural-city/asset-kit repositories were considered during discovery.
Their generic building styles and uncertain local fit offer less immediate value
than our reproducible Kallio motif kit. No third-party art was downloaded.

## Follow-up checked during release validation

Two additional primary-source options fit the current vanilla Three.js lane:

- [Three.js r167 GTAOPass](https://github.com/mrdoob/three.js/blob/r167/examples/jsm/postprocessing/GTAOPass.js)
  exists in the exact engine release we ship. Its shader distinguishes perspective
  and orthographic cameras, and it provides sized AO/denoise targets. This is an
  alternative contact-shading experiment that avoids changing Three or adopting
  the latest postprocessing package. It still needs its matched Pass/shader/noise
  dependencies, a compatible normal/depth treatment for our cutaway materials,
  and phone performance/recovery checks. It is not a zero-cost effect. Not bundled.
- [drei-vanilla](https://github.com/pmndrs/drei-vanilla) supplies MIT-licensed vanilla
  helpers for blurred surface reflections, volumetric spotlight materials and
  accumulated static shadows. These are closer to the desired wet-night lighting
  than a generic asset pack. The inspected package declares Three >=0.137 but
  develops against ^0.179.1: that declaration alone does not prove our r167
  compatibility. Use only a selected, pinned helper and its necessary dependencies
  in an isolated experiment; no React migration or build-system change is proposed.
  Accumulated static shadows must exclude moving crew; reflections need an explicit
  update/resolution budget. Not installed or bundled in C.15.

Priority: compare existing light/shadow rendering against matched r167 GTAO and
N8AO independently, then test a small planar-reflection or spotlight treatment.
Keep the current low-cost path as fallback. The new courtyard and service yard
provide repeatable geometry and camera positions for these comparisons.
