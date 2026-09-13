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
