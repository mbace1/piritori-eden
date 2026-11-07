# Listed production batch — combined verification

The combined draft adds exact bank conversion quotes, a named treatment cost/result, and the corrected source site for the already-authored Torkkelinmäki porttikongi. The eight-surface workbench includes the bank exterior/counter/ledger study and nine source auditions. Artwork, new staging and animation remain review candidates; no face is assigned or source art promoted.

Runtime source commits: `b48490e6e46bdadd92f85b156827cea33d6143fe` (bank), `a1b55ba` (courtyard, from `e5954f49d860719da16f1347a367c518f621f4ec`) and `8a17ab5beeb361e37e304bea01f63222d9f0fa71` (treatment, from `4a65639676ec2eb888e1b80cf9105c8a724a8a9f`). Later source-fingerprint/documentation updates preserve those tested runtime modules.

Combined local verification:

- **37 web node suites passed**, including the 23 courtyard continuity checks, 57 treatment presentation checks, existing C.19 outing/recovery/tactics, mission, road, chapter, visits and content contracts. [Complete output](node-suites.log).
- **Bank browser:** phone 390×844 and desktop 1280×800 pass against the combined build: bulletin entry, exact quotes, unchanged live/save previews, partial/all payment, reload, next map block and locked choices.
- **Treatment browser:** four flow groups at the same viewports pass against the combined build: real target selection/cost, remaining wounds, named receipt, one payment, reload, map return, exact affordability, condition floor and blockers.
- **Courtyard browser:** the source correction's existing mission suite passed 38 checks across phone/desktop, including actual site DOM, offscreen Jaska, unresolved reload and unchanged C.19 dispatch. [Source evidence](../courtyard-site-contract/).
- **Eight actual review routes** load at both viewports without errors/overflow; review notes persist/export/reset while the campaign sentinel remains byte-for-byte unchanged. [Report](review-integration.json).
- **Production atlas:** 38 packet views and 60 location staging views per viewport pass with campaign storage access blocked. [Report](production-review.json).
- **Bank study:** three scenes, 10 exact authored choices and nine auditions pass per viewport, with isolated review preferences and reduced-motion rest. [Report](bank-review.json).
- Gallery source/browser checks pass all 17 encounters/60 exact choices per viewport after source reconciliation; location/cast/order/bank audits and map/transit/content validators pass. Existing CI job definitions remain intact, with the focused regressions added to their relevant jobs.

The recordings retain their labelled original baselines. The bank/treatment screenshots are actual browser fixtures, not a complete campaign run. Physical Pixel/iPad and full Act I acceptance remain open. No merge, deployment, public version or roadmap-score change is claimed: **Act I 48%, public build v4.96**. New-commit CI is checked separately from these local results.

Latest main integration: `0587dae0609e246a6a59bb43cce9a169545d4fc5` (v4.97) is included. Its chapter-income correction is preserved; resolved plan findings now say market, route and fence sales count, while mission payouts do not. Runtime imports use state13, app68 and treatment2; CSS remains16. All37 node suites, both bank viewports, all four treatment flow groups and chapter review42 checks pass again after integration. Retained screenshots/recordings preserve their original labelled baselines.

CI identified the paused Godot data fixture still expecting 13 sites after the existing courtyard received its own canonical record. Only that fixture count/comment is updated to 14; no Godot gameplay code changes. The local installed Godot 4.6.3 data-spine check passes 271/0; CI separately uses its pinned 4.7.2 version, so this local pass is not a claim about the CI engine. [Local output](godot-spine.log).
