# Fixed-rate bank choice review — 2026-11-07

The existing bank now previews the exact euro proceeds and remaining markka before either conversion. Its authored options, forecasts, effects, rate and rounding are unchanged. Only `convert-markka:*` effects run on a disposable state copy for the preview; the normal choice handler still settles the real payment. No art is added or promoted.

At 390×844 the existing generic scene becomes a short establishing strip and the paper choices use tighter padding. All three choices and their stakes fit the initial viewport with touch targets at least 44px. At 1280×800 the existing two-column composition remains.

Actual browser captures:

| Viewport | Before | After |
|---|---|---|
| 390×844 | [Baseline](bank-before-phone.png) | [Exact quotes](bank-quotes-phone.png) |
| 1280×800 | [Baseline](bank-before-desktop.png) | [Exact quotes](bank-quotes-desktop.png) |

The baseline is the unchanged PR #128 head `a0a60e78efa95a8d2182dea1b4fe2bddec421900`. Both use the real Day 3 bank encounter with 300 mk carried, €160 cash and reduced motion. The baseline's third choice ends at y=961.75 on the phone, below its 844px viewport. These are browser fixtures, not a full chapter run or physical device acceptance.

Verification: `web/test/bank-browser.cjs` passes at both viewports. It enters via Arvo's bulletin and acknowledgement, checks 300 mk → €50.45 / partial 120 mk → €20.18 with 180 mk kept, checks all 600 mk → €100.91, proves rerender leaves the entire serialized save unchanged, checks actual partial/all payments, reload without duplicate payment, return to the next map block, locked 119/0 mk options, visible choices, touch sizes, overflow and browser errors. Existing project, source-content and contract checks also pass. CI runs the new browser test beside the existing Scene Club/visit tests.

Reproduce with the repository served at `PIRITORI_TEST_URL` and Playwright installed:

```sh
PIRITORI_TEST_URL=http://127.0.0.1:8781/web/ PIRITORI_CAPTURE_DIR=/tmp/bank-quotes node web/test/bank-browser.cjs
```

Act I remains 48%; the public build remains v4.96. The bank cast audition, exterior blockout and clerk identity remain separate review work.
