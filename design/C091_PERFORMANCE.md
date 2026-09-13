# C.09.1 — stable cadence and movement-cell visibility

The 30 FPS limiter discarded each frame's fractional remainder and stationary
labels repeated a collision/layout search every render. Keep the display timing
remainder and invalidate labels when the camera, viewport, actor anchor, text or
font changes. Resume/recovery reset the clock; stalls do not enqueue catch-up
renders. All three source entry pages use one canonical controller URL.

An expanded visibility sweep found benches hiding legs at some back-row cells:
the cutaway compared scenery against only the actor's centre depth. It now
includes the standing figure's depth extent. No collision, cover, cost, reach,
damage, save/replay or production-character rules change.

## Evidence

See [measured results](C091_VERIFICATION.json). On the same desktop Chromium
setup, the four-layout samples improved from 46/27/26/27 FPS to 60/30/30/30
(desktop / portrait phone / landscape phone / landscape tablet). These are
observations, not physical Pixel 10 Pro or iPad M2 acceptance.

- A 12-person, 45-second idle sample rendered 1,350 frames with 23 label layouts,
  stable renderer geometry/texture counts and no console errors.
- Actual UI rotation invalidates labels. Resizing during a Move preserves the
  committed action and replay; repeated graphics recovery also passes.
- 12 fighters × 8 angles plus one broad standing probe moved to each of 36
  currently empty legal cells × 8 angles: 384 silhouette comparisons. Scenery
  visibility improved from a minimum 82.7% to 100% in this sample. Other fighters
  still overlap at side angles; minimum total visibility was about 62.6%.
- Existing arena actions, enemy rounds, restart, checkpoint, 720 motion samples,
  and four-layout authored Bear Path meeting/battle/recovery checks pass.
- Frame-clock regression covers jittered 60/90/120/144 Hz delivery, 30/60 FPS
  budgets, long stalls, resume and quality changes.

The cell sweep is rendering setup, not evidence of traversing every cell through
the UI or testing every down/action pose there. Short stable resource counts do
not prove a leak-free long session. Raw screenshots/rejected art stay private.

## Reproduce

```sh
node web/test/frame-clock.mjs
node web/test/arena-lab.mjs
node web/test/arena-lab-browser.cjs
node web/test/arena-lab-capacity.cjs
node web/test/bear-path-browser.cjs
```

Browser gates use Playwright + Edge. Set `ARENA_LAB_URL` / `BEAR_PATH_URL` when
serving a different repository-root URL. Outputs default to private directories.
Use the [release procedure](HUB_RELEASE.md) to publish the same tested bytes.

## Port

Godot should preserve the target render cadence under varying display refresh
and only recalculate labels when their anchors/layout change. Match the scenery
cutaway extent. There are no changed combat vectors or new character approvals.

## Next

Test on the actual Pixel/iPad in both orientations, then strengthen deliberate
practical lighting and reproduce a second staging from the same environment
kit. Actor overlap, final character rigs, richer materials and campaign
integration remain open. C.09.1 is a stability improvement, not the finished
Dream Loop visual target.
