# C.19 evidence and readability workbench

Review-only, 7 November 2026. Act I remains **48%** under the existing `ROADMAP.md` rubric. This page adds no combat resolver, campaign state, art approval or release. Its controls filter preserved measurements or annotate a captured frame; they never issue a combat command.

Open `/art-src/reviews/act1-combat/` from a server rooted at the repository. The shared review hub is `../act1-workbench/`. Peer links are reserved for the encounter gallery, consequences and chapter rehearsal; they are sibling review routes, not new permanent game tabs.

## What is concrete

- Fifteen actual Act I scenarios, heats 0/2/3, all policies present in the source data.
- Baseline and dodge-first experiment, each at 12 and 30 deterministic seeds: four evidence sets, 147 scenario/heat/policy rows each. A 12-seed set contains 1,764 simulated fights; a 30-seed set contains 4,410. Switching sets does not run new simulations.
- Exact preserved win/withdraw/loss percentages, crew damage and downs, rounds, police arrivals and available successful player action counters. Missing telemetry displays **Not measured**, especially baseline-30 action counts and wall-clock duration. Round counts are not seconds. Recovery/death after campaign settlement was not measured by these files.
- Policy comparison within the same scenario and heat. The filter does not mix fight and getaway goals into a misleading global win rate. `fight` is labelled Aggressive; `careful`, `focused`, `run` and `escort` retain their source meanings.
- Actual C.19 courtyard opening screenshots from a real `?play=g0-door` → choice → campaign outing → Fight flow, using separate fresh browser contexts. These are not invented arena images or mock battle states.
- Five explicitly proposed annotations over the real frame: intent, target, movement, pressure and exit. Placement and label composition are illustrative; they are not recorded world-space target positions or live odds. The actual C.19 game remains the place to play combat.
- Three links to existing integrated campaign playtests: courtyard fight, quay getaway and Bear Path mission. The dashboard itself reads/writes no campaign save. The linked game uses its existing set-aside/restore flow.

## Source files and provenance

Data is loaded directly from `design/evidence/scene-club-2026-11-07/`:

| Set | File | Seeds | Action counters |
|---|---|---:|---|
| Baseline 12 | `instrumented-default-12.json` | 12 | Included; core outcomes match original baseline exactly |
| Baseline 30 | `baseline-30.json` | 30 | Not recorded |
| Dodge first 12 | `dodge-first-instrumented-12.json` | 12 | Included |
| Dodge first 30 | `dodge-first-30.json` | 30 | Included |

Campaign rules are v4.96, source main `b114bf7`. Diagnostics were preserved by feature `2a3e9f3` and extended evidence `fecb8d3`. Source documentation describes deterministic outing IDs, commands and earlier QA limits. These are historical saved measurements, not new simulations performed by the dashboard. Percentages and averages are rounded by the original tool, so small sample differences should not be overinterpreted.

The alternate bot skips an available early attack so safe movement can be evaluated first. It changes no combat rules and is not the default. At 30 seeds the prior report finds lower damage without a useful win advantage; the dashboard exposes the per-scenario tradeoffs. Zero observed Brace commands in an instrumented policy is evidence about that bot, not a verdict against Brace for players.

## Proposed implementation slices

These extend the existing roadmap; they do not replace its order, gates or score.

1. **G1 policy instrumentation.** Add a trace/fixture where a real telegraphed hit cannot be dodged, verify Brace is exercised, and compare against aggressive/focused/escort. Record attempted and successful decisions separately if the next investigation needs them. No balance change before this coverage exists. Gate: all 15 scenarios retained with reproducible seeds, no stuck runs, and the targeted policy actually uses its intended tactic.
2. **Target/destination readability.** Implement one small preview change through the existing C.19 command interface, preserving free cancellation, live odds, route, action costs and selected-versus-target rings. Gate: before/after real browser captures; resource/state snapshots unchanged until Confirm; confirm/reload settles once. Test 390×844, 1280×800 and landscape.
3. **Five-set arena audit.** Capture courtyard, yard, park, tram street and quay from the same eight camera angles before geometry edits. `C19_LEVEL_PASS.md` describes an earlier pass; current fixes and authority live in `ROADMAP.md`. Gate: each proposed join/occlusion/material fix has current visual evidence, preserves walkable cells/cover/exits, and is checked at multiple angles.
4. **G2 aftermath clarity.** Connect a compact money/crew/pressure/objective strip to the existing receipt boundary. Show victory, withdrawal and police consequences distinctly; name the lost/injured person where it changes a decision. Gate: no reward or injury applied twice across terminal reload and a subsequent valid outing. See sibling consequences workbench.
5. **G0/device and release.** Physical Pixel/iPad testing is still open. Measure touch comfort, frame pacing, label occlusion, graphics recovery and battery/thermal behavior before calling browser captures accepted. No new art or model promotion is implied by this dashboard.

## Test and capture

```
node art-src/reviews/act1-combat/model-test.mjs
node art-src/reviews/act1-combat/capture.cjs --real-frames
```

The capture script serves an ephemeral local root, opens fresh contexts, records actual game frames, then tests scenario/source/heat/policy filters, missing values, all five proposal toggles, 44px targets, no document overflow, no storage changes, and HTTP/page errors at phone 390×844 and desktop 1280×800. Run without `--real-frames` to reuse the preserved arena screenshots and perform the faster dashboard regression. It never repeats the full combat suite or changes the owner's campaign.

`verification.json` records exact results, measurements and limitations. These are desktop-host browser captures under software rendering, not physical Pixel/iPad acceptance or final character/arena art approval.

Relevant canon: `ROADMAP.md` G0/G1 and arena/readability milestones; `DESIGN_AUTHORITY.md`; `COMBAT.md`'s triage promise (with later movement rulings); `design/C19_CAMPAIGN_FIGHTS.md` §6; `design/C19_READABILITY.md`; `design/UI_DIET.md`.

## Recorded checks

The committed capture completed both real C.19 opening frames (phone/desktop), each with three players, three rivals and pressure 0/6, with no page/HTTP failures. The final dashboard regression passes at both sizes, including all five proposal toggles plus Original frame, all four evidence sets, available-policy filtering, missing telemetry, 44px controls and unchanged localStorage. Data tests validate all four 147-row sources and reject duplicate rows; numeric differences are checked against the source rows. `capture.log`, `model-test.log` and `verification.json` preserve these results. No full combat simulation or physical device test was run by this review task.
