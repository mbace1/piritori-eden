# Bounded mobile edge smoothing

Owner feedback, 2026-09-13: "Seems ok, bit jagged". This is qualified positive
feedback, not final approval of a specific replacement rig. Pending a more
specific description, this change treats jaggedness as visible pixel edges.
It does not claim to repair jerky motion, skin weights or mesh silhouettes.

The conservative mobile profile previously disabled MSAA and rendered at no
more than one device pixel per CSS pixel. It now applies the three.js r167
FXAA shader to the opaque scene after tone mapping. The shader is vendored
unchanged, with its NVIDIA notice and three.js license retained.

One RGBA8 framebuffer copy and one fullscreen triangle are added. There is
no second depth buffer, HDR target, supersampling, shadow increase or higher
texture resolution. The copy uses already encoded display colors, so the
pass performs no second tone mapping or color conversion. DOM controls and
fighter labels are outside the pass. Desktop rendering retains its existing
MSAA path; a switch to the conservative profile enables the bounded pass.

The existing 650,000-pixel ceiling limits the extra texture to 2,600,000 bytes
(about 2.48 MiB). It is reused every frame, disposed/recreated on size changes,
released when disabled, and rebuilt by Three after context restoration.
`fightModule.metrics().edgeSmoothing` reports method, pixels and bytes.

## Verification

- `node web/test/fight-module-edges.cjs`: actual WebGL rendering with
  preserveDrawingBuffer disabled. Diagonal boundaries gained intermediate
  coverage colors; all 35,234 tested flat pixels stayed byte-identical.
  Asymmetric color patches verify orientation and no extra gamma/tone mapping.
  Five resizes retained one texture, disabling released it, and disposal
  released the fullscreen geometry. No GL or browser errors.
- `node web/test/fight-module-gpu.cjs`: actual fight controls and repeated
  context loss/restoration at phone, tablet and desktop sizes. Turn state,
  input locking, reload fallback, downed outcome, restart and orientation
  recovery passed. Repeated restoration did not grow texture/geometry counts.
- Private comparisons use identical frozen candidate poses before/after at
  phone and tablet sizes, including closer framing. Character and railing
  edges soften; tiny detail at a wide view remains coarse. FXAA can soften
  fine texture detail and cannot reconstruct missing geometric coverage.

These are desktop-host browser checks, not physical Pixel 10 Pro/iPad M2
performance or visual acceptance. The shader costs texture bandwidth and a
draw; device performance still needs testing. Private images, model candidates
and editable masters are not distributed with this code change.

The change is on PR #68 only. The hub remains C.06 until a release is recorded.
