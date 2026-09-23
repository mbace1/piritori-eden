# C.19 — Battlefield clarity and outcome acceptance

Date: 2026-09-17. Owner authorized the next bounded step in POST_C18_ITERATION_PLAN.
This implements presentation and regression coverage, not a combat redesign or a city/map expansion.

## Visible changes

Inactive living fighters use compact identifiers; the selected fighter and inspected attack target retain HP/guard. VIEW → Labels: all stats restores every label, independently of the mission save. Accessible descriptions retain names, condition and guard. The same policy is exercised on 2/6/12 capacity fixtures. Enemy intentions, forecasts and action costs remain visible in their existing panels.

Selected and preview-target ground rings have distinct brightness and size. The rescue target has a HELP / ESCORT / DOWN badge. A world-anchored EXIT A1–F1 / EXTRACT · 1 ACTION marker follows the south edge and uses the existing label collision layout; it is not another renderer or texture. Gun inspection hides the exit marker until the overview returns.

Mission copy distinguishes helping, escorting, successful individual extraction and an already-helped colleague falling again. It does not offer a second Help that the existing rules prohibit. These views do not write campaign or battle state.

C.18's direct render path, conservative initialization, graphics recovery and optional safe rendering remain. No external models, paid generation, arena content, campaign resolver selection, tactics rebalance or save schema change.

## Checks and evidence boundaries

`node web/test/crew-run.mjs` imports the new C.19 checks: real unmodified opening rescue/extraction, retreat, and five-turn defeat. Reload after every committed action, terminal checkpoint replay, immediate/reloaded duplicate settlement and a subsequent valid outing are checked. The repeated-down cue has a separate synthetic presentation fixture, not a claimed played outcome.

`web/test/c19-readability-browser.cjs` exercises actual touch controls in portrait/landscape: focused/all labels and independent preference reload, free target preview/cancel, five real End-round commands to defeat, mid-fight reload, once-only aftermath, and an onward rescue outing. It also checks 2/6/12-person label capacity. Existing source rescue/extraction/context-recovery tests and C.18 actual-frame checks remain mandatory.

`tools/publish/arena_lab_release.py` derives build identity from matching title/header/About markers rather than silently publishing a new build as C.16.1. The explicit runtime allowlist includes the presentation helper; changed dependency/importer cache tokens advance together. Scope, hashes and previous-cabinet validation remain mandatory.

Local logic/identity/publishing tests passed during implementation. Browser, merged-source, live-hub and exact release receipts must be recorded from their actual results, not inferred from this document. Physical Pixel 10 Pro / iPad M2 and owner visual/gameplay acceptance are **NOT RUN / OPEN**. Hosted software rendering cannot close those gates.

## Port

Godot has NOT received this presentation port. Reproduce focused/full inspection without changing battle history, selection/target ring cues, rescue labels and the world-bound south-exit marker. Recalculate tag collision layout on actor, text, camera and viewport changes. Preserve all existing campaign and mission result vectors, once-only settlement and graphics-safe recovery behavior. Touch/browser/controller checks do not imply a Godot implementation.

## Following step

Inspect the actual screenshots and target hardware before calling presentation accepted. Map/mission work then starts with M0's existing-system audit, followed by small navigation/contact/mission/consequence iterations; no map layout, new authored mission, A/C battle selection or B map decision is locked by C.19.
