# Claude takeover — Piritori

Verified repository snapshot: **2026-09-24**. This is a documentation handoff,
not a gameplay release, a fresh browser test, or evidence that a Claude session
has been started. Owner request: “Next steps? Can you add docs so Claude can take over?”

## Start here

**Work from current `origin/main`, not the old M1 overlay branch.** Read the
[execution brief](design/CLAUDE_MAP_MISSION_NEXT_STEPS.md), then implement only
**clean M1: separate map inspection from active presence inside the existing
`web/js/v3/app.js`**. Prove that slice before M2 travel or new missions.

The old pickup advice to start at v4.40, and older notes saying the latest C work
exists only on `art/meshy-approved-pilots-2026-09-11`, are historical. They must
not send this task back to an older runtime. Preserve the rest of CLAUDE.md's
scope, canon, dependency, testing and non-destructive working rules.

## Verified status, not the earlier chat summary

| Item | State at this handoff | Evidence / meaning |
| --- | --- | --- |
| Source main | `0432dff2bc1c26f887eb927f27efcde478a8b3e4` before these documentation commits | [September 23 source-log commit](https://github.com/mbace1/piritori-eden/commit/0432dff2bc1c26f887eb927f27efcde478a8b3e4) records C.19's arrival on main. Main now contains C.19; do not assume the older branch is the newest source. |
| City campaign | Main header is **Act I v4.51** | [Pinned entry](https://github.com/mbace1/piritori-eden/blob/0432dff2bc1c26f887eb927f27efcde478a8b3e4/web/index.html). This is a different release series from Night Shift C.19. Do not allocate v4.49 again. |
| Existing-fighter repair | [PR #92](https://github.com/mbace1/piritori-eden/pull/92) merged into main on September 21; merge `d234c34c8cb844a1cc0afa7893b4d359ebfcf9b9` | Preserves imported GLB armature/unit transforms. Keep the fix and its tests; navigation work must not replace the newer renderer. Its PR reports a separate stale transit-data full-check issue; reproduce rather than waive it. |
| Night Shift C.19 | Released connected-crew pilot; source [#89](https://github.com/mbace1/piritori-eden/pull/89), hub [#546](https://github.com/mbace1/Suds-Jack/pull/546) / [#547](https://github.com/mbace1/Suds-Jack/pull/547) | Historical acceptance covers battlefield clarity, outings, persistence and public route. It is not the full authored city/mission integration. |
| Current Pages receipt read | Pages tree `40b197df7778d7bfa2f6a3d19d65047dc7798be9` still declares C.19 from tested source `69b23168653d6dccb0c0a626755eac890ac686ad` | [Pinned receipt](https://github.com/mbace1/Suds-Jack/blob/40b197df7778d7bfa2f6a3d19d65047dc7798be9/piritori-c17/release.json): neutral stand-ins; `physical_devices_verified: false`. This handoff read repository state, not every public URL again. |
| M0 | [PR #90](https://github.com/mbace1/piritori-eden/pull/90) completed the audit; hub [#549](https://github.com/mbace1/Suds-Jack/pull/549) carries its pointer | M0's audit/tooling lives on old integration tip `f5ba93457f5aeba98eaefa172ee867391dfd7998`, not wholly in the current main ancestry. Read the pinned audit below; absence from main is not absence from GitHub. |
| M1 | [PR #91](https://github.com/mbace1/piritori-eden/pull/91) remains **open, unmerged** | Candidate `feat/m1-navigation-orientation` at `d6aa85a684bf9bc217683f61bde2647daf7a08e5`. Not an accepted M1, not a new public city release. |
| M1 latest checks | M0 audit passed; general gates failed; M1 acceptance cancelled | [Audit 35280772097](https://github.com/mbace1/piritori-eden/actions/runs/35280772097), [gates 35280772154](https://github.com/mbace1/piritori-eden/actions/runs/35280772154), [M1 35280772130](https://github.com/mbace1/piritori-eden/actions/runs/35280772130). Earlier attempts failed around boot/Begin/orientation-card availability. No successful clean-app replacement is recorded here. |
| Clean M1 (replacement) | **Merged to `main` (`d0f6d6f`, receipt `6ff36a5`, Act I v4.52); not on the hub** | Inspection split from presence inside `app.js`, no overlay. Gate `web/test/m1-inspection.cjs`. Receipt: [design/M1_CLEAN_INSPECTION.md](design/M1_CLEAN_INSPECTION.md). #91 marked superseded. |
| M2 Paper Bag travel | **Merged to `main` (`dc6e53f`, receipt `8425d30`, Act I v4.53); not on the hub** | The schedule moves the lead, not Aatami; `journey.js` preview/commit, TRAVEL HERE → TRAVEL / CANCEL, no invented travel time (D002). Gate `web/test/m2-journey.cjs` 47/47; [gates 36015540528](https://github.com/mbace1/piritori-eden/actions/runs/36015540528) all 8 jobs green. Receipt: [design/M2_PAPER_BAG_TRAVEL.md](design/M2_PAPER_BAG_TRAVEL.md). |

Main and the old integration branch have diverged. Their verified merge base
was `69b23168`; main is nine commits ahead and four behind that integration tip.
Do **not** wholesale merge, reset to, or copy that branch merely to recover M0.
Review the missing audit files explicitly. The candidate M1 overlay is also not
a reason to discard later main work.

### What was actually accomplished

C.19 reduced inactive fighter-label clutter, clarified selected/target/objective
and exit cues, fixed crew-drawer targeting obstruction, and added outcome/reload
acceptance. Its procedural-character route remains. M0 inventoried map, sites,
schedules, visits, missions and consequence boundaries. Neither completed M1,
personal travel, a new chapter, or the Godot presentation port.

The direct-app M1 rewrite is the continuation direction from the latest chat;
it is **not yet implemented or tested**. Earlier references to “loader/race
nonsense” were not a measured root-cause report. Diagnose the first actual
failure; do not preserve that label as a proven explanation.

## Required reading without rereading the entire repository

1. This file, [the execution brief](design/CLAUDE_MAP_MISSION_NEXT_STEPS.md),
   [CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md) and the dated sections in
   [ACTIVE_CONTEXT.md](ACTIVE_CONTEXT.md). Read current status here before
   following historical release links in older startup material.
2. [PHASING.md](PHASING.md), [DESIGN_AUTHORITY.md](DESIGN_AUTHORITY.md),
   [DESIGN_LOCKS.md](DESIGN_LOCKS.md), [GAME_DESIGN_DOCUMENT.md](GAME_DESIGN_DOCUMENT.md),
   [ART_BIBLE.md](ART_BIBLE.md), [UX_SPEC.md](UX_SPEC.md), [MAP.md](MAP.md),
   [PORTING.md](PORTING.md). Existing canon controls design and engine boundaries.
3. [M0 audit at its verified source](https://github.com/mbace1/piritori-eden/blob/f5ba93457f5aeba98eaefa172ee867391dfd7998/design/M0_MAP_MISSION_AUDIT.md)
   and [approved iterative programme at the same source](https://github.com/mbace1/piritori-eden/blob/f5ba93457f5aeba98eaefa172ee867391dfd7998/design/POST_C18_ITERATION_PLAN.md).
   Their release/status paragraphs describe September 17, not today's main.
4. [Scenario atlas](design/SCENARIO_ATLAS.md), `design/scenario-atlas.json`,
   `ACT_I_NARRATIVE.md`, `content/era1-slice-v1.json`, and
   `map/kallio-era1-2003-v1.json`; inspect D002/D004/D005 before touching those seams.
   [Long-term scope](https://github.com/mbace1/piritori-eden/blob/fix/godot-approach-cell/PIRITORI_LONG_TERM_SCOPE.md)
   remains a broader roadmap, not an instruction to implement everything now.
5. For release: [source delivery guide](design/HUB_RELEASE.md) and the hub's
   [map/mission handoff](https://github.com/mbace1/Suds-Jack/blob/main/piritori/MAP_MISSION_HANDOFF.md),
   `AGENTS.md`, deployment specification and existing hub-release skill.

The M0 tools are `tools/audit/map-mission-audit.mjs` and
`tools/audit/test-map-mission-audit.mjs` on the pinned M0 tip. Read/recover that
small audited tooling change intentionally before running it on the new baseline;
do not claim its September 17 inventory is a fresh inventory of main.

## Safe first-session sequence

```sh
git status --short
git fetch origin main art/meshy-approved-pilots-2026-09-11 feat/m1-navigation-orientation
git log -5 --oneline origin/main
git log --oneline origin/main...origin/art/meshy-approved-pilots-2026-09-11
git show origin/main:CLAUDE_TAKEOVER.md
git show origin/art/meshy-approved-pilots-2026-09-11:design/M0_MAP_MISSION_AUDIT.md
```

Preserve any dirty worktree and coordinate shared-file edits before changing
branches. Then create a clean feature branch/worktree from updated main. Record
baseline test results, reproduce the map-selection side effect, and implement
only the direct-app M1 contract. Do not force-push, rebase shared history, amend
pushed commits, or restart paid asset jobs. A documentation checkout is not a
runtime merge, and a branch named “main” is not proof that a local copy is current.

## Next steps in order

**M1:** local inspection cursor, explicit presence action, honest story-lead
indication, all access paths checked, existing playing/reload/visit tests green.

**M2:** Piritori -> Siltasaari preview / Cancel / Travel / arrival, with presence
preserved when the story lead advances. Existing clock semantics only until
D002 is deliberately resolved. Keep one campaign settlement owner.

**Then:** finish Paper Bag consequence/revisit clarity; connect one existing
contact and authored mission alternatives; return results to the city; only
then add another useful location or expand the short chapter. Each checkpoint
may require many builds. The execution brief reconciles the conversation's
short M3/M4 shorthand with the original M0–M6 programme.

## Non-negotiable boundaries

- “Yes to all, and then map and missions will take many steps to get right” is
  the owner's approved iteration method, not final map/mission-design approval.
- New external character models, Meshy jobs, paid generation, new arenas and
  combat-rule rewrites remain outside this continuation. Preserve already
  merged asset fixes without reopening the pipeline.
- Night Shift and the authored city are distinct runtimes. C/A-Turf selection is
  still a separate decision; do not replace the campaign battle base implicitly.
- Keep canonical people and places, shared local markets and same-scene context.
  No new venue for Arvo or relocation of Jaska to conceal a binding conflict.
- A model test, browser emulation, successful deployment and a physical-device
  or owner acceptance are different facts. Pixel/iPad and visual/play acceptance
  remain open. No remote worker or Claude session was dispatched by these docs.
- End each small implementation with a commit, actual test route, evidence,
  source/hub status, open gates and the next bounded task. Read documents first;
  do not ask the owner to reconstruct repository facts or repeat settled choices.

## Ready-to-use Claude instruction

> Read CLAUDE_TAKEOVER.md and design/CLAUDE_MAP_MISSION_NEXT_STEPS.md on current
> main. Check the current refs and preserve PR #92's existing-fighter repair.
> Replace the failed PR #91 overlay approach with a minimal inspection/presence
> split inside the existing city app. Complete and test only M1 first, including
> cold start, Resume, map/ENCOUNTER access, visits, route planning and the original
> purchase/sale loop. Commit the result and document the exact tested source and
> hub status. Continue to M2 only after that checkpoint is proven. Keep external
> models, combat-rule changes and full-map expansion parked.
