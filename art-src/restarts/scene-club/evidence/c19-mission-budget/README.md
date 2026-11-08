# Actual compact C.19 mission controls

`validation.json` verifies the completed native browser assertions against all
four current runtime hashes. Two 360×640 contexts cover seven states; maximum
combined UI rectangle coverage is **45.5315%**.

The authored yard-van getaway uses real Move, End and Extract commands. Crew
inspection/Back leaves the combat snapshot unchanged. A high-pressure outing
naturally downs two crew, presents both police postures and settles the real
aftermath after Help Friends. Mission text stays inside its strip and native
44px controls are unclipped and receive pointer input. Screens show the actual
before/after Extract overlap and final police prompt.

The untouched raw `report.json` retains a source-guard failure: the unrelated
`web/test/c19-ui-budget.cjs` changed during capture. The private probe neither
served nor imported that test; its helpers had already been copied. All four
hosted runtime files remained identical, and every browser/action assertion
passed. `validation.json` records this distinction rather than rewriting the
raw result. `probe.as-run.cjs` is the exact diagnostic with its original local
paths, retained as capture provenance.

The permanent regression is now in `web/test/c19-ui-budget.cjs`, including the
legal extraction and fallen-crew police sequences. Run it from the repository
root; the C.19 workflow runs it as a separate job. This evidence measures these
authored cases, not every possible mission action or physical-device behavior.
