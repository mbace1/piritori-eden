# Piritori Act I — Toko Move UX lessons, C.19 retained

**Review candidate, 2026-11-07.** No change to the approved art direction, combat engine or runtime manifest. Compare Toko Move v3.12 in `mbace1/Suds-Jack/toko-move` (ROADMAP, VERSIONS, journey.js) with Piritori v4.96, `DESIGN_AUTHORITY.md`, `ROADMAP.md`, `design/UI_DIET.md`, and `design/C19_CAMPAIGN_FIGHTS.md`.

## The 50% transfer rule
Borrow the interaction *grammar*, not the graphics or simulation: one visible decision, concise stakes, scene-first encounters, a quiet city board between decisions, and a persistent compact objective strip. Keep Piritori's cut-cardstock/marker art, existing Kallio city map, authored contacts and economy, C.19 3D tactical fights and persistent consequence rules. Do not transplant Toko Move's vector people, tram simulation, card-run economy, or two-choice limit into combat.

## The next playable vertical slice (one encounter, no new art)
1. Start from the current v4.96 city build, not C.19's standalone laboratory. Preserve the existing Act I → `web/crew-run/?campaign=1` → receipt → city bridge.
2. At Jaska's Scene Club encounter, use the existing approved Jaska cut-in and **semi-approved** Aatami front/side rigs. For a single speaker, use Aatami front; for a two-speaker composition, use side. Keep existing bubble-tail rule and avoid covering the choice.
3. Present the first consequential choice within a phone's initial viewport. Keep only location, active speaker, concise stakes, and choice buttons; do not hide odds or consequences that change the decision.
4. Return to a quiet city map that shows where the action happened and what changed; do not add another persistent tab.
5. On a branch that triggers combat, retain C.19's full enemy intentions, move/action costs, escape options, police timing, and battle result. Never turn combat into a card decision or paper-board substitute.
6. Show a compact aftermath (cash, crew, pressure, objective) before returning to the map. Test reload and exactly-once receipt.

## Existing bot evidence and next experiment
- `web/tools/fight-balance.mjs` already runs all 15 authored fight scenarios across heats 0/2/3 and policies fight/careful/focused (plus run/escort for getaways), default 12 seeds. That is historical evidence, not new tests.
- `web/tools/c19-policy-report.mjs` summarizes the existing JSON and exposes where careful policy fails to outperform reckless fighting. Use `SEEDS=30` or larger for exploration, preserve deterministic seeds and report exact sample size.
- **Before changing combat rules:** compare focused vs careful, and inspect a trace for one weak fight; the existing careful bot rarely braces. A bot policy failure is not proof that defensive tactics are useless to players.
- Run browser tests for Jaska + Aatami at 390×844 and 1280×800, dialogue bubble and option visibility, idle/blink/talk, reduced motion, and return from C.19. Physical Pixel/iPad owner acceptance remains open.
- Keep the current 34 bare-node suites, `web/test/aatami-browser.cjs`, `web/test/c19-outing.mjs`, `web/test/outing-browser.cjs`, and relevant scene tests green. Do not infer a passing run without CI evidence.

## Suggested Codex-first implementation order
1. Capture baseline Jaska/Aatami phone and desktop screenshots and actual browser flow.
2. Implement only the Scene Club encounter hierarchy/transition changes required by the captures, behind a review PR.
3. Add regression tests for first-viewport choice, bubble clearance, speaker identity, exactly-once receipt, and return to map.
4. Run all 15 fights at 12 seeds first, then 30 seeds if the policy report shows a meaningful difference; compare before/after outputs.
5. Record screenshots, bot JSON, test logs and exact commit; request owner approval before runtime promotion/deploy.

## Non-goals and constraints
- No A/B/C art mixing, no new Aatami designs, no unapproved character promotion.
- No 3D-to-paper battle conversion. C.19 remains authoritative for Act I fights.
- No merge, no new Godot port, no fabricated browser/device test results.
- Toko Move's approved visual assets remain in Toko Move.
