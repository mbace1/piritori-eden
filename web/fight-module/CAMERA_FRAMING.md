# C.06 — wider battle framing and readable fighter tags

The owner approved the wide courtyard/park/yard/harbour concepts and asked to apply the wider battle framing to the playable courtyard, with portrait and landscape checks. This release changes the existing training scene's presentation. The approved concept scenery itself has not been rebuilt here.

## Implementation

- The orthographic overview fits the full existing 6-lane, 8-depth legal board, empty edge cells, 2.3 m headroom and safe space for the HUD. It is wider than C.05 at all tested aspect ratios. The fit depends on board extent and viewport, not surviving actor count, so planning does not drift after a casualty.
- FIT restores the default angle and overview. Manual zoom/orbit remain. No automatic action close-up or narrative-to-battle transition is introduced.
- J1/J2 identify Jade and R1/R2 identify Rust. Compact tags show condition and guard; crew/target controls retain full names and condition. Tags avoid one another, projected bodies and the HUD. Leader lines identify displaced tags. Offscreen manual-zoom cases keep tags within the viewport.
- Phone landscape gives the world another 20 CSS px by reducing the command column from 300 to 280 px. Main action/camera controls keep 44px minimum targets. Optional controls remain scrollable.
- Orientation changes pause presentation and block action input for the short reflow interval, then restore the same committed action. Terminal restart controls re-enable and queued auto-play resumes. No interpolation or camera operation writes to the resolver.
- Conservative touch rendering and C.05 graphics recovery remain. No GLB, material, texture, lighting or combat-rule changes.

## Validation and limits

[Framing report](c06-framing-report.json): seven viewport sizes, 22 checks each. Default overview, eight orbit steps, zoom-out, minimum zoom, FIT, five manual close-ups, movement preview, board tap, rotation during movement, enemy round and restart. The full-board checks project every legal cell and its headroom; they do not create 48 actors.

The four real fighters' tags stay inside the viewport without tag/tag or tag/HUD overlap. Direct taps on the board select the expected move cell after refitting. Camera operations preserve the battle snapshot; orientation during presentation preserves the committed action and resumes it.

[Orientation edge cases](c06-orientation-report.json): result survives rotation, Fight again re-enables, and auto-play continues across reflow.

The existing four-viewport controls suite covers move, brace, end round, talk, truce, item, withdraw, attack, ranged fixtures, rehearsal, camera, defeat and auto-play. Graphics fault injection checks interrupted movement, enemy presentation, rehearsal cancellation, repeated restoration, checkpoint reload and completed outcomes. Results for this release are stored separately as c06-controls-report.json and c06-gpu-recovery-report.json.

All browser checks run on a desktop host. They are not physical Pixel 10 Pro/iPad M2 acceptance, sustained performance or hardware-controller testing. Tags were tested with this four-actor fixture; denser campaign rosters need their own layout evidence. This remains an early combat module, not finished Kallio scenery or a completed Dream Loop.

## Port

The Godot port should reproduce the viewport-aware board/headroom fit, stable planning camera, team-tag identity, condition/guard display, HUD/body/tag separation, FIT control and orientation pause. Combat and campaign rules do not change. No Godot implementation or parity claim is included in C.06.
