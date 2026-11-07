# Day 7 treatment choice and receipt

Base: `b48490e` (`review/listed-production-batch`), November 7, 2026.

This is a playable presentation change for the existing `enc-pasila-ledger` / `treat-crew` choice. The choice now shows the actual person's name, the €80 charge and `critical → wounded` before commitment. Its saved outcome names the treated person and explicitly says the wound remains. The authored forecast about the weaker financial ending stays beside it.

`web/js/v3/treatment.js` runs the existing `applyEffects` on a disposable clone and observes the critical flag change. It does not select a target or calculate treatment rules. The receipt observes the before/after states around the real `chooseEncounter`, then appends its text to the existing saved `lastOutcome`. No state engine, save schema, authored content, recovery rule, cost or requirement changed.

The existing engine selects the first critical entry in `crewStatus` key order, including entries outside the current roster. This slice makes that selection visible; it does not silently replace it with roster, deployment, injury severity or player selection. Treatment clears one critical flag, sets the person to wounded, and keeps their condition with the existing minimum of 1. It does not fully heal them. The encounter's existing choice guard prevents a second payment, including after reload. Continue retains the authored block advance and map return.

## Validation

- `node web/test/treatment.mjs`: **57 checks passed**. The fixtures cover multiple critical people with disagreeing roster/key order; condition 0 and condition 2; generated hired names; an existing critical entry outside the roster; poor/no-critical blockers; unchanged previews; actual settlement equivalence; unchanged timing/flag; and repeat/reload rejection. A throwing storage accessor verifies this presentation helper never accesses campaign storage.
- `PIRITORI_CAPTURE_DIR=design/evidence/treatment-2026-11-07 node web/test/treatment-browser.cjs`: **four flow groups passed**, two each at 390 × 844 and 1280 × 800. Real browser flows cover immutable live and saved previews, the visible initial treatment choice, actual named receipt, one €80 payment/one treated person, remaining critical crew, save/reload, map return, exact affordability, minimum condition floor and poor/no-critical blockers. Strict page, console, HTTP and request checks passed; only the exact absent local `/hub/shell.js` 404 and navigation cancellation are exempted.
- Existing `v3-contract.mjs`, `v3-state.mjs` and `scene-content.mjs`: **passed**; exact outputs are in `regression-results.txt`.
- Both new focused suites are in the existing gates workflow. No new dependencies or broad browser-suite rerun were needed for this presentation slice.

The PNG files are actual matching Playwright Chromium headless-shell browser captures, with reduced motion. `treatment-before-*` and `treatment-receipt-*` show the main multiple-critical case; `treatment-floor-*`, `treatment-poor-*` and `treatment-none-*` show the other real-engine fixture states. Fixture values are test setup, not measured combat or balance outcomes.

The phone treatment choice is visible without scrolling, at a minimum 44px touch height and 14px quote text. The narrower Day 7 ledger layout reuses the compact financial-choice styling; desktop layout stays as before. These captures are browser emulation, not physical Pixel/iPad acceptance. No new source artwork or art approval is included. Act I completion remains the existing roadmap figure, **48%**.

Review atlas source hashes are intentionally left to the integration owner after the pending canonical courtyard correction and runtime changes are combined. This branch does not claim deployment or CI success for its eventual integration commit.
