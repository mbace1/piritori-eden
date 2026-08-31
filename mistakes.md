# Mistakes

A running log of mistakes made in this repo, so they don't get repeated.
Kept short: what went wrong, how it was caught, the fix or rule that
prevents it next time. Append, don't rewrite history.

A Stop hook (`.claude/hooks/stop-mistakes-check.sh`) makes Claude check
this file once per session before finishing, and append anything new.

---

- **`hireFromPool()`'s dedup check (`state.recruited.includes(id) ||
  state.hiredCrew[id]`) was quietly stricter than Godot's own `hire()`**,
  which only checks `roster.has(id)`. This shipped in v4.21 and went
  unnoticed for a whole version — it was harmless until retirement (v4.23)
  gave a candidate a way to leave `state.recruited` while staying in
  `state.hiredCrew`, at which point the extra check silently blocked a
  re-hire Godot would have allowed. Caught by a scratch test written for
  the NEW feature (retirement), not by reviewing the OLD code. Rule: when
  a new feature interacts with an existing check, re-derive what that
  check is actually supposed to guard against from source, don't assume
  it's still equivalent just because it hasn't changed.

- **`people/roster.mjs`'s own doc comment claimed names were drawn from
  "the one pool" (DESIGN_LOCKS §9.2's same-origin rule), but the actual
  code drew `FIRST` and `LAST` from two independent flat arrays** — a
  real, shipped bug (every non-Finnish first name got a Finnish family
  name, always) that the comment actively hid rather than revealed.
  Caught only by reading the implementation line by line while porting a
  related feature, not by trusting what the comment said. Rule: a
  comment describing what code does is a claim to verify against the
  code, not a substitute for reading it — this project's CLAUDE.md
  already says as much for docs vs. renders; the same holds for comments
  vs. the lines under them.

- **Arithmetic in a scratch test was wrong** (a sequence of fenced-loot
  sales was meant to total past a 400 threshold; the actual sum was 315).
  Caught immediately by running the assertion and reading the failure —
  not preventable by review, since the mistake was in mental arithmetic,
  not logic. Rule: for a test that depends on a specific numeric total,
  run it and read the real number back rather than trusting hand-added
  arithmetic in the test's own comments.

- **A test assumed `content.crew.filter(c => !c.named)` would find a
  non-named crew member to test "the roster loses someone who isn't
  named" — but all six authored crew are always `named: true`**, so the
  filter returned an empty array and the resulting assertion failed with
  a nonsensical `0 !== -1`. Caught by the failure message itself pointing
  at an empty roster, not by anticipating it. Rule: when a test needs "a
  member of some category" from authored content, confirm that category
  is actually populated in the content before writing the assertion
  around it — don't assume a distinction exists just because the code
  has a name for it (`named` vs. not).

- **An `Edit` call on `QUEUE.md` used an `old_string` that matched only
  part of the section meant to be replaced**, leaving a stale, now-
  duplicate block sitting above the new one. The edit itself reported
  success — nothing about the tool call signaled the problem. Caught
  only by re-reading the file afterward, not by trusting the edit
  succeeded because it returned without error. Rule: after a
  large/structural edit to a long doc file, re-read the surrounding
  section rather than assuming a successful `Edit` call means the
  intended full replacement happened — an edit can succeed exactly as
  written and still leave content half-replaced if the matched range was
  smaller than intended.

- **`QUEUE.md` initially catalogued `train()` as "independently
  portable"** (it only touches `retired_crew`/`crew_fights`, both real by
  that point) without reading closely enough to notice its entire payoff
  is `level_of()` reading higher — and it never calls `grant_level()`, so
  even the perk points those "free" levels would grant are skipped. With
  no leveling ported, `train()` would cost two career fights for zero
  observable benefit. Caught in a later pass, by re-reading the function
  fully before starting to implement it rather than after. Rule: before
  writing down that a piece of unported code is "independent" of some
  other unported piece, trace what its return value or side effect is
  actually FOR, not just what state it happens to touch.
