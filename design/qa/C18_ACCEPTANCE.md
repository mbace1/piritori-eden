# C.18 acceptance receipt

Runtime source and tested head: ef7b4785831aacf54cf00d77c5625b9e1c95f6d4.

- Source standard gates: https://github.com/mbace1/piritori-eden/actions/runs/35151801138 — all eight jobs passed, including gun-camera interruption, full crew outing/persistence and graphics recovery.
- Source UI/pixel gate: https://github.com/mbace1/piritori-eden/actions/runs/35151801196 — all six configurations passed: phone, compact phone, short landscape, tablet, desktop and phone safe rendering. Actual default-framebuffer RGBA readback excludes DOM labels. Screenshots for phone battle, short-landscape movement and tablet movement were inspected after completion.
- Hub nested-cabinet package gate: https://github.com/mbace1/Suds-Jack/actions/runs/35151883814 — all six configurations passed before package eb8cf6c86e2c36dc1e6fc6e8fe8749850f1a5079 was committed. Every recorded cabinet SHA256 was checked.

Hub release PR: https://github.com/mbace1/Suds-Jack/pull/536. Hub PR gates and gh-pages publication are still separate pending steps at the time of this receipt. Physical-device acceptance remains open. None of these tests proves that the owner's actual phone GPU issue is cured.

This receipt changes documentation only. No runtime change follows the tested ef7b478 source in this batch.
