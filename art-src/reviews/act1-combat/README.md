# C.19 evidence and readability workbench

Review-only, 7 November 2026. Act I remains **48%** under the existing `ROADMAP.md` rubric. This page adds no combat resolver, campaign state, art approval or release. Its controls filter preserved measurements or annotate a captured frame; they never issue a combat command.

Open `/art-src/reviews/act1-combat/` from a server rooted at the repository, or use **`?source=defensive30`** to open the corrected 30-seed defensive dataset with Defensive (opt-in) selected. The default remains the historical baseline 30. The shared review hub is `../act1-workbench/`. Peer links are sibling review routes, not new permanent game tabs.

## What is concrete

- Fifteen actual Act I scenarios, heats 0/2/3, all policies present in the source data.
- Baseline and dodge-first experiment, each at 12 and 30 deterministic seeds: four evidence sets, 147 scenario/heat/policy rows each. A 12-seed set contains 1,764 simulated fights; a 30-seed set contains 4,410. Switching sets does not run new simulations.
- A fifth, separate **Defensive (opt-in) · 30 seeds · v4.97** dataset: 192 rows / 5,760 simulations, including 147 retained peers and 45 new defensive rows. It is loaded directly from the corrected integrated evidence, not combined with historical dodge-first rows.
- Exact preserved win/withdraw/loss percentages, **net terminal HP shortfall including healing**, downs, rounds, police arrivals and available successful player command counters. Net HP loss is not cumulative incoming damage. Missing telemetry displays **Not measured**, especially historical baseline-30 action counts, defensive-specific counters for other policies and wall-clock duration. Round counts are not seconds. Recovery/death after campaign settlement was not measured by these files.
- Policy comparison within the same scenario and heat. The filter does not mix fight and getaway goals into a misleading global win rate. `fight` is labelled Aggressive; `careful`, `focused`, `run` and `escort` retain their source meanings.
- The corrected dataset adds **Defensive (opt-in)** beside those peers, with exact selected-scenario/heat deltas versus aggressive: win points, net HP saved, extra rounds, police-arrival points and downed-fight points. Multiple policy decisions change; the comparison does not isolate Brace as the cause or establish a human-player benefit. No default policy is promoted.
- Actual C.19 courtyard opening screenshots from a real `?play=g0-door` → choice → campaign outing → Fight flow, using separate fresh browser contexts. These are not invented arena images or mock battle states.
- Five explicitly proposed annotations over the real frame: intent, target, movement, pressure and exit. Placement and label composition are illustrative; they are not recorded world-space target positions or live odds. The actual C.19 game remains the place to play combat.
- Three links to existing integrated campaign playtests: courtyard fight, quay getaway and Bear Path mission. The dashboard itself reads/writes no campaign save. The linked game uses its existing set-aside/restore flow.

## Source files and provenance

The four historical datasets are loaded directly from `design/evidence/scene-club-2026-11-07/`:

| Set | File | Seeds | Action counters |
|---|---|---:|---|
| Baseline 12 | `instrumented-default-12.json` | 12 | Included; core outcomes match original baseline exactly |
| Baseline 30 | `baseline-30.json` | 30 | Not recorded |
| Dodge first 12 | `dodge-first-instrumented-12.json` | 12 | Included |
| Dodge first 30 | `dodge-first-30.json` | 30 | Included |

Those four sets use v4.96 rules, source main `b114bf7`. Diagnostics were preserved by feature `2a3e9f3` and extended evidence `fecb8d3`. The dashboard retains their original rows and missing counters. Source documentation describes deterministic outing IDs, commands and earlier QA limits. These are saved measurements, not new simulations performed by the dashboard. Percentages and averages are rounded by the original tool, so small sample differences should not be overinterpreted.

The alternate bot skips an available early attack so safe movement can be evaluated first. It changes no combat rules and is not the default. At 30 seeds the prior report finds lower damage without a useful win advantage; the dashboard exposes the per-scenario tradeoffs. Zero observed Brace commands in an instrumented policy is evidence about that bot, not a verdict against Brace for players.

### Corrected defensive dataset

The fifth dataset comes from
`design/evidence/defensive-policy-2026-11-07/integrated-v497/defensive-30.json`.
Its source and limits are recorded in the adjacent `source.json`, `README.md`
and `comparison-30.json`, which the dashboard links separately from the old
v4.96 provenance. It was measured afresh on integrated **v4.97**, including main
`0587dae`, using sampler-start commit
`3d18d8adc3c0de1375c85a1ce826dc48523e589d` and runtime base
`cd47d2a0f364f21cbe4a326f3a665221ba3c23d0`.

The exact matrix is 11 fight jobs × 3 heats × 4 policies (132 rows) plus
4 getaways × 3 heats × 5 policies (60 rows). That is 45 defensive cohorts /
1,350 defensive simulations and 147 retained-peer rows / 4,410 simulations,
30 deterministic seeds per cohort. The retained peers come from the **same
opt-in sampler run**, not a second independent baseline run. All historical
baseline fields match exactly; newly measured successful-command counters do
not retrofill the older baseline file. Missing policy/goal cohorts are not
sampled and are never treated as zero.

Validation accepts this exact 192-row matrix only when explicitly selecting
`defensive30`; the four historical sources and default `validateRows()` retain
their strict 147-row contract. Every scenario/heat policy set is checked.
Duplicate, missing, unexpected-policy and wrong-source matrices are rejected.

The policy saves net HP in the stored matched fight-job summary but loses win
points, takes longer and raises police arrivals; the source also reports poor
getaway performance relative to escort. The dashboard shows individual cohorts
instead of averaging unlike goals or presenting defensive as a universal
improvement. A getaway routing rivals is not the same as successful extraction.

Brace-with-incoming, preparation and predicted-down-prevention counters describe
chosen forecast conditions. They are successful player commands/decision
annotations, not enemy commands or measured saved lives; rounded components
need not sum exactly. There was no no-Brace ablation. Healing, movement,
targeting and ordering also differ. Bandage/reload counts, per-seed raw outcomes,
confidence intervals, cumulative incoming damage, campaign recovery/death,
wall-clock duration, device performance and human acceptance were not measured.

## Proposed implementation slices

These extend the existing roadmap; they do not replace its order, gates or score.

1. **G1 policy diagnostics.** Completed evidence now includes constrained legal Brace-survival and target-free extraction fixtures plus the corrected 30-seed integrated measurement across all 15 scenarios, with zero stuck rows. This establishes fixture semantics and exercises the opt-in policy; it does not close the roadmap's broader combat targets or owner acceptance. Possible next diagnostics are a goal-aware getaway policy and a no-Brace ablation that separates one mechanic from the other changed policy decisions. Measure those before proposing any balance/default-policy change.
2. **Target/destination readability.** Implement one small preview change through the existing C.19 command interface, preserving free cancellation, live odds, route, action costs and selected-versus-target rings. Gate: before/after real browser captures; resource/state snapshots unchanged until Confirm; confirm/reload settles once. Test 390×844, 1280×800 and landscape.
3. **Five-set arena audit.** Capture courtyard, yard, park, tram street and quay from the same eight camera angles before geometry edits. `C19_LEVEL_PASS.md` describes an earlier pass; current fixes and authority live in `ROADMAP.md`. Gate: each proposed join/occlusion/material fix has current visual evidence, preserves walkable cells/cover/exits, and is checked at multiple angles.
4. **G2 aftermath clarity.** Connect a compact money/crew/pressure/objective strip to the existing receipt boundary. Show victory, withdrawal and police consequences distinctly; name the lost/injured person where it changes a decision. Gate: no reward or injury applied twice across terminal reload and a subsequent valid outing. See sibling consequences workbench.
5. **G0/device and release.** Physical Pixel/iPad testing is still open. Measure touch comfort, frame pacing, label occlusion, graphics recovery and battery/thermal behavior before calling browser captures accepted. No new art or model promotion is implied by this dashboard.

## Test and capture

```
node art-src/reviews/act1-combat/model-test.mjs
NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules node art-src/reviews/act1-combat/capture.cjs
```

The capture script serves an ephemeral local root and opens fresh contexts. Its
dashboard regression checks all five sources, all 45 defensive cohorts and exact
deltas, policy filtering, historical missing counters, deep-link/reload behavior,
per-source provenance, all five proposal toggles, 44px targets, no document
overflow, unchanged storage/campaign sentinel and HTTP/console/page/request
errors at phone 390×844 and desktop 1280×800. It runs no bot simulation and does
not change the owner's campaign.

The original v4.96 C.19 arena screenshots are preserved and labelled historical.
No fresh arena capture is required for a data-dashboard change. The optional
`--real-frames` path remains available for a deliberate future acceptance check;
any such captures now use new `defensive-c19-courtyard-*` filenames.

The new `defensive-verification.json`, `defensive-capture.log` and
`defensive-model-test.log` record this update's results. Actual new views are
[`defensive-dashboard-phone.png`](defensive-dashboard-phone.png),
[`defensive-dashboard-desktop.png`](defensive-dashboard-desktop.png),
[`defensive-comparison-phone.png`](defensive-comparison-phone.png) and
[`defensive-comparison-desktop.png`](defensive-comparison-desktop.png).
`verification.json`, the original logs and screenshots remain historical and
unchanged. These are desktop-host browser captures, not physical Pixel/iPad
acceptance or final character/arena art approval.

Relevant canon: `ROADMAP.md` G0/G1 and arena/readability milestones; `DESIGN_AUTHORITY.md`; `COMBAT.md`'s triage promise (with later movement rulings); `design/C19_CAMPAIGN_FIGHTS.md` §6; `design/C19_READABILITY.md`; `design/UI_DIET.md`.

## Original recorded checks (preserved)

The committed capture completed both real C.19 opening frames (phone/desktop), each with three players, three rivals and pressure 0/6, with no page/HTTP failures. The final dashboard regression passes at both sizes, including all five proposal toggles plus Original frame, all four evidence sets, available-policy filtering, missing telemetry, 44px controls and unchanged localStorage. Data tests validate all four 147-row sources and reject duplicate rows; numeric differences are checked against the source rows. `capture.log`, `model-test.log` and `verification.json` preserve these results. No full combat simulation or physical device test was run by this review task.
