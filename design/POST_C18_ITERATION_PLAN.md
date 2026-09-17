# Post-C.18: approved sequence and iterative map / mission work

Date: 2026-09-17  
Status: **Owner-approved sequence; implementation and playtest acceptance remain open.**

## Owner decision

The owner approved the preceding four-stage plan, then clarified:

> Yes to all, and then map and missions will take many steps to get right

The approved order is:

1. Close C.18 acceptance gaps, including real-device rendering and mission outcomes.
2. Improve battlefield readability and procedural-character presentation before changing combat rules.
3. Connect one authored city -> contact -> preparation -> peaceful resolution or battle -> city-consequence loop.
4. Only after that loop works, expand toward a short complete chapter.

Map and mission work is a sequence of small, playable design iterations, **not one delivery after an art pass**. Approval of the sequence does not lock a final map layout, mission selection, route structure, balance, art direction or battle-base selection. Keep those decisions explicit and revisit them through play.

This plan supplements, rather than replaces, [DESIGN_AUTHORITY](../DESIGN_AUTHORITY.md), [GDD](../GAME_DESIGN_DOCUMENT.md), [Art Bible](../ART_BIBLE.md), [scenario atlas](SCENARIO_ATLAS.md) and the [long-term scope](https://github.com/mbace1/piritori-eden/blob/fix/godot-approach-cell/PIRITORI_LONG_TERM_SCOPE.md). Later owner rulings override historical constraints such as a mandatory matched 3v3 starting fixture.

## Starting evidence: do not reopen or overstate C.18

Source [PR #87](https://github.com/mbace1/piritori-eden/pull/87) records C.18 integration at `48c9e2950c921521c6f5f0ef084d1eb89ad216a9` on `art/meshy-approved-pilots-2026-09-11`, not source `main`. Feature work is [PR #86](https://github.com/mbace1/piritori-eden/pull/86).

The release record links hub [#537](https://github.com/mbace1/Suds-Jack/pull/537) / [#538](https://github.com/mbace1/Suds-Jack/pull/538), public acceptance run `35221092835`, all 61 public file hashes, and portrait / landscape browser traversal through preparation -> deployment -> confirmed movement -> next round -> retreat -> aftermath -> preparation. It separately records source rescue / extraction / recovery checks.

These are existing release records, not newly executed tests in this documentation change. The owner's physical Pixel 10 Pro and iPad M2 rendering acceptance remains open. Hosted Chromium / SwiftShader results do not establish that the phone's black arena is cured, or that the game is clear and enjoyable.

C.18 is the current release recorded by those receipts. C.16.1 is a retained rollback; older C.08 references in historical startup notes are not a current public-card instruction. The current route is the C.18-labelled Night Shift card, whose package path retains `piritori-c17`.

## First batch: acceptance and battlefield clarity

### Acceptance record

Use the actual hub entry and record build / source receipt, physical device or emulation, browser, orientation, graphics mode, starting state, action sequence, expected result, observed result and evidence. Mark unrun cases **NOT RUN**, not passed.

| Case | Required observation |
| --- | --- |
| Deploy and act | Real arena pixels remain visible; movement and attack commands respond; the round can advance. |
| Rescue and extraction | Objective, rescue state and individual extraction are understandable; aftermath and campaign effects match the result. |
| Retreat | Retreat returns the correct crew and does not count as completed extraction. |
| Defeat / missing crew | The intended terminal state is reachable; crew consequences agree with the existing rules; the player has a valid onward action. |
| Reload / resume | Prep, mid-outing and settled states resume correctly; no duplicated rewards, injuries, time costs or result application. |
| Graphics recovery | Existing safe-graphics / retry paths preserve the outing and do not leave stale uncommitted action previews. |

Exercise portrait and landscape on the actual target phone / tablet when available. Automated checks and real-device reports are separate evidence columns. Do not delay unrelated safe implementation solely because a physical test is unavailable, but keep that acceptance gate visibly open.

### Readability scope (proposed next playable batch, not a released C.19)

- Reduce duplicated floating statistics and inactive-unit panel clutter. Keep selected fighter, current target, objective and extraction readable. Information moves to inspection only where it remains discoverable; **do not hide the stored enemy intentions or action costs required for planning**.
- Use the current unified UI and existing visual references. Preserve the owner shortlist of 03 / Lantern Noir and 06 / Ink After Dark without inventing a final selection or asserting concept parity.
- Improve procedural silhouettes, facing, contrast against the scene, motion and hit / action feedback. External character models, Meshy, rig replacement and production-asset promotions stay parked.
- Check 2 / 6 / 12-person capacity fixtures for overlap, occlusion and touch readability. These are fixtures, not new authored missions or a fixed squad-size rule.
- Finish the environment / presentation pass before combat-rule changes. Movement, attack timing and sound work should initially clarify existing actions, not quietly rebalance the resolver.

Acceptance is player-visible: the objective, current danger and available actions can be understood without somebody narrating the interface. Nonblank screenshots and green logic tests alone do not satisfy this.

## Map / mission programme: revisitable checkpoints

The following is a working breakdown of the approved iterative direction, not seven automatic approvals or seven promised releases. Each checkpoint may take multiple builds; combine or revisit them when playtesting demonstrates a better order. Reuse working systems before replacing anything.

| Checkpoint | Playable question | Boundary / review evidence |
| --- | --- | --- |
| M0 — audit the existing map and content | What can the current campaign already do, and what prevents one connected outing? | Inventory current place / site / contact / mission IDs, routes, schedules, saves and consequence handlers. Separate implemented, authored-only and proposed. Pick the smallest existing mission candidate; document selection rather than inventing it. |
| M1 — orientation and navigation | Can the player identify where they are, what is available and why a destination matters? | Test current / visited / available / unavailable states and selection in portrait and landscape. Keep canonical geography and the anchor / nearby-site distinction. No map-wide redraw or forced branching structure assumed. |
| M2 — a meaningful journey | Does moving create an understandable choice involving time, opportunity and risk? | Preview the applicable costs before commitment; cancel without spending; commit once. Reuse authored travel rules and shared local markets. Moving to a nearby scene must not reroll a disconnected economy. |
| M3 — one contact and opportunity | Does arriving somewhere naturally lead to a person, a choice and preparation? | Use one existing authored scenario and its availability. Support the authored decline / leave route. An entrance's light and Enter action must agree; leaving returns to the correct approach site. |
| M4 — one mission with alternatives | Can that opportunity resolve through its authored peaceful path, escalation or withdrawal without becoming another unrelated game? | Preserve the same scene, actors and meaningful positions through escalation. Respect narrative-character combat restrictions. Preserve campaign preparation and all applicable authored alternatives; no extra arena or generic boss is required. |
| M5 — visible, persistent consequences | Does the result matter once the player returns to the city? | Apply money, time, crew, relationship and mission effects only through the campaign's shared boundary. Check every authored outcome, failed / declined paths and reload before / after settlement. Show what changed; prevent duplicate rewards, injuries and time charges. |
| M6 — return, variation and repeatability | Is revisiting meaningful, and can a second mission be made without special-case glue? | Revisit contacts after relevant state changes. Add one contrasting authored mission only after the first loop holds up. Revise navigation, pacing or presentation from play rather than merely adding more markers. |

Only then build toward the existing **6–8-anchor / 20–30-minute chapter target** with travel, trade, preparation, an avoidable battle, recovery / settlement and a clear end. Those figures are a prototype target, not a quota, a schedule or a claim that the map and missions are now designed. Retain the authored chapter operation rather than inventing a boss to fill the ending.

The living Toko / Dope Wars city remains the strategic baseline. B / Slay-style routing remains a separate map decision, not an automatic replacement. A / Turf and C / Dream Loop remain battle implementation alternatives until their comparison / selection is recorded; this approval does not silently make C the campaign default.

## Completion and handoff rule

One iteration should answer one meaningful playable question with a visible change, a short test route, outcome evidence and the unresolved decisions. The owner can redirect from a screen or playthrough; record that answer in the relevant design / scenario document before the next change. Do not repeatedly ask settled questions. Use numbered questions only for genuinely unresolved design choices.

Each playable batch must include:

- the Piritori source commit, relevant regression checks and reviewable change;
- the matching live Suds Jack package / labels / receipt and a verified actual public route, preserving rollback and unrelated games;
- the Godot port handoff for behavior and presentation changes, with unported or untested behavior stated honestly;
- separate status for source pushed, merged, published, automated acceptance, physical-device acceptance and owner visual / gameplay acceptance.

This document-only batch changes no runtime, save, art asset or public build number. It records authorization and the iteration method; it does not claim C.19, device acceptance, a new mission, or a finished map.
