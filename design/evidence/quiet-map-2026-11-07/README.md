# Quiet map context — review candidate, 7 November 2026

Act I stays **48%** under ROADMAP.md's rubric. This is a small follow-up to PR #120, on the existing UI-diet/map milestone; no art, animation, combat, economy, route or save rules change. No hub release is claimed.

## Playable change

- At the current lead, the inspected place is named once rather than followed by two identical presence/lead labels. When inspection, Aatami and the lead differ, the labels remain.
- The opening map objective uses one short sentence; the purchase price and current objective remain.
- A route-capacity explanation appears when planning a route. An unpinned route no longer adds a separate explanatory panel to the idle map. Pinned routes retain their capacity meter, counts and Send control.
- Remote inspection keeps a short reminder that looking is free and travel is deliberate. Locked, landmark and training restrictions keep their own text.

## Verification

Local on this branch: 35/35 bare-node suites, M1 inspection 71/71, next-step 57/57. The existing M1 suite verifies whole-campaign/save invariance during inspection, route preview/cancel/pin, the opening purchase and sale, reload, visits, desktop and touch. The next-step suite plays the first trade at 390×844, 844×390 and 1280×800 while checking the single primary action stays in view.

Screenshots are actual browser output at 390×844 and 1280×800, aligned to the inspected panel's start. The unchanged map baseline is clean main `b114bf7`; its route rendering matches the PR #120 baseline. The captures use reduced motion and a fresh campaign. They are browser emulation, not physical Pixel/iPad acceptance.

Reproduce: serve the repository root, open `/web/?skip`, Begin, scroll to the inspected place; select another anchor to inspect, or Plan a route to see the contextual explanation. Run `node web/test/m1-inspection.cjs` and `node web/test/next-step.cjs` with Playwright installed. The app cache token advances to 65 for review; hub version remains v4.96 until release.
