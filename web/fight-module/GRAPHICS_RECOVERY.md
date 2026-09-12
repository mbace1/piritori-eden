# C.05 — mobile graphics interruption

Owner feedback, 2026-09-12: the C.04 phone screenshot shows the module's
"Graphics interrupted" overlay over a blank scene. This confirms a WebGL
context-loss event. It does not identify the underlying GPU/browser cause.
The module was an early prototype, not physically accepted on Pixel/iPad.

## Corrected behavior

- C.04 listened only for loss and left its overlay permanently visible. C.05
  handles restoration after Three.js restores its GL resources. It stops
  rendering/input during loss, cancels presentation work and rebuilds actors
  at the already-committed battle state. No command or campaign cost replays
  into the running session; automatic play stops after an interruption.
- Canceled movement/attack/rehearsal continuations cannot advance the scene
  or reset the match after recovery. Per-actor skeleton GPU resources are
  disposed when rebuilding/restarting.
- Touch devices start with 30 FPS target, no MSAA/shadow pass, pixel ratio at
  most 1, and at most 650,000 drawing-buffer pixels. Desktop targets 60 FPS
  with a bounded buffer; a slow or recovered renderer uses lighter settings.
- Character models decode sequentially. Runtime textures are capped at 1K
  on touch/recovery, shared between teams, with retained CPU sources for GPU
  restoration. The original GLBs, their hashes and rig/animation data are
  unchanged. Download size remains about 16 MB.
- If the browser has not restored graphics after five seconds, a real reload
  button appears. The current training command history and camera are kept
  in same-tab sessionStorage and checked against deterministic replay after
  reload. It is cleared on success/new fight and never writes campaign saves.
  Storage denial is handled honestly; without storage, a manual reload cannot
  retain the fight. Automatic recovery still retains in-memory battle state.

## Validation

`node web/test/fight-module-recovery.mjs` checks command/item/outcome restoration,
invalid checkpoints and phone/tablet drawing-buffer budgets.

`node web/test/fight-module-gpu.cjs` uses real WEBGL_lose_context interruptions
during movement, enemy presentation and rehearsal, then actual restoration.
It checks unchanged state, locked controls, repeated recovery without GPU
allocation growth, actual nonblank rendered pixels, reload via the visible
button, completed outcomes and phone orientation changes. Gameplay commands
are issued through real buttons/touch; fault injection is setup only.
See `gpu-recovery-report.json`. Requires Playwright and Sharp.

The existing rule and four-viewport real-control suite also passes. All browser
tests run on a desktop host, including high-DPR touch emulation. They do not
reproduce the owner's physical GPU crash or prove stable Pixel 10 Pro/iPad M2
performance, thermals or browser recovery. C.05 needs that device retest.

API semantics: [MDN: webglcontextrestored](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextrestored_event)
and the [Khronos loss extension](https://registry.khronos.org/webgl/extensions/WEBGL_lose_context/).

## Port

Godot should preserve the same battle outcome/action boundary across a renderer
interruption and pause gameplay input while visuals recover. These browser
context handlers and texture preparation are implementation-specific; no Godot
port or campaign parity is claimed by C.05.
