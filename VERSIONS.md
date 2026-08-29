# Piritori → Eden — versions

> **Numbers are `vMAJOR.MINOR` from v4.** The integer is a milestone, the
> decimal an increment on it — the scheme `eeri/` already uses, adopted because
> burning a whole integer on ordinary work is what makes version collisions
> easy. `?v=` module tokens stay INTEGERS; they are cache-busters tracking
> module churn, not releases, and the two numbers are deliberately different.
>
> **Every entry carries a `### Port` block.** A version is a port unit now
> (`PORTING.md` §2): the block names what the Godot side must re-port, so it
> never has to read a diff to find out.

## v4.25 — 2026-08-29

**Chapters — the operation ending, ported from `attempt_chapter_ending()`/
`chapter_goal_met()`.** Third slice of the sixth audited item, and the
one that gives `content/era1-slice-v1.json`'s `chapter-1-piritori` entry
— read as far back as v4.21 but never reachable — a real path. Godot's
`record_chapter_income()` has exactly one call site, `sell_loot()`
(v4.24, last version), so this was the cheapest remaining piece of
"campaign progression" the moment loot/fencing landed.

- **`state.chapter`/`chapterGoal`/`chapterThreshold`/`chapterEarned`/
  `chapterLootTaken`/`chapterFightsWon`/`chapterCleared`/
  `lastEndingOutcome`/`upgrades`** — `new_campaign()`'s own reset shape,
  synced from content at creation (`chapterDef()`/
  `syncChapterFromContent()` port `chapter_def()`/
  `_sync_chapter_from_content()`; the slice's `goal.threshold: 400`
  overrides Godot's `600` default, same as Godot's own sync would do).
  `CHAPTER_DAYS = 10` is carried over as the same PLACEHOLDER Godot's
  own comment calls it, against this slice's real 7.
- **`chapterProgress`/`chapterGoalMet`** port `chapter_progress()`/
  `chapter_goal_met()` exactly — the threshold buys ENTRY to the climax,
  not the climax itself.
- **`attemptChapterEnding(state, data)`** ports `attempt_chapter_ending()`:
  refuses if the goal isn't met or the chapter is already cleared
  (`'not-available'`), if cash can't cover the stake (`'cannot-afford'`),
  or if not standing at the ending's `anchor_id`, Sörnäinen Harbour
  (`'wrong-place'`) — otherwise charges the stake, resolves the operation,
  and marks the chapter cleared. **`resolveOperation()`** ports
  `_resolve_operation()`'s exact formula (hands-on-the-job margin against
  `OPERATION_IDEAL_CREW = 3`, minus 0.15 per arrested crew member, plus a
  seeded roll in `[-0.35, 0.35]`) and its three outcomes: `clean` (≥1.0,
  grants the chapter's upgrade), `messy` (≥0.5, the LAST equipment
  instance is lost — not the worst one, matching `equipment.remove_at
  (size() - 1)` exactly, a different rule than `removeOne()`'s
  worst-first), `lost` (a non-named crew member is arrested). Deterministic
  from the seed and the chapter, like gear decay — reloading to reroll a
  shipment is playing a different game.
- **`arrestCrew(state, data, id)`** is new infrastructure the `lost`
  outcome needed — `arrest()`'s real behaviour, not the status-only
  stand-in `state.crewStatus[id].status = 'missing'` has been since
  v4.19. `state.arrestedCrew` is Godot's own `arrested_crew`, deliberately
  a different list from `retiredCrew` (a veteran who got out is a
  different fact from somebody carried off). **Retrofitted into the
  existing police-taken flow in `recordBattleConsequences()`**, which is
  the same `arrest()` call Godot's `app_shell.gd` makes for a
  police-taken crew member — the app.js comment on that code has said
  "they are gone" since v4.19 without the removal ever actually
  happening; this closes that specific gap as a direct consequence of
  building the same function chapters needed, not as an unrelated
  change bundled in. The retrofit would have quietly regressed
  `renderCrewCard()` — an arrested veteran, no longer in
  `state.recruited`, would have fallen through to the same
  `'NOT RECRUITED'` label as someone never hired — so the card now
  checks `state.arrestedCrew`/`retiredCrew` first.
- **UI**: a CHAPTER panel in the ledger shows the goal type and progress
  against the threshold; once met, an ATTEMPT button (disabled at the
  wrong anchor or without the stake, with a note saying which) names the
  ending and its cost; once cleared, the panel shows the outcome and its
  consequence in plain language instead of the button.

**Verified**: all bare-node gates green, `port/vectors.mjs --check`
green. A scratch bare-node script confirmed the goal syncs from content
at creation (400, not Godot's 600 default), that only fencing moves
`chapterEarned` (a plain cash grant does not), the full refusal ladder
(`wrong-place`/`cannot-afford`/`not-available` after clearing), that the
stake is always charged regardless of outcome, that the same seed/chapter
resolves the operation identically across two independent states, and
`arrestCrew`'s real removal + idempotency. A 30-seed sweep at full crew
margin confirmed `clean` and `messy` are both reachable (not just the
one outcome the deterministic test happened to land on). A real
Playwright run drove the whole thing through the live ledger UI: no
button before the goal, a disabled button at the wrong anchor with a
"go here" note, a real click charging the stake and recording a real
outcome, and the panel switching from progress to outcome once cleared.
`v3-playthrough.cjs` unchanged at 23/28 (same pre-existing failures).

**Not attempted:** `begin_next_chapter()` — the content only authors one
chapter (`ERA_CHAPTERS = 4` in Godot, one in this slice), so there is
nowhere for it to transition TO; building it now would ship a function
with no reachable second chapter to verify against. `decay_equipment()`
is the same situation (its only call site is `begin_next_chapter()`) and
stays unported for the same reason. `day_of_chapter()` is not ported —
nothing reads it yet, since there is only one chapter for a day to be
"of." No UI distinguishes "cannot be bought" loot the way
`_add_spoils_lines()` does (same gap v4.24 already named).

### Port
- **rules:** ported — `attempt_chapter_ending()`/`_resolve_operation()`/
  `chapter_goal_met()`/`arrest()` and the scoring constants are the
  canonical copy; nothing to re-port.
- **data/vectors/meshes:** unchanged.
- **presentation:** the CHAPTER panel is `web/`-only UI.
- **status:** the operation ending lands. `begin_next_chapter()`/
  `decay_equipment()` stay queued pending a second authored chapter.
  Leveling/perks/skills (`battle.js` combat-math changes) and `train()`
  remain unstarted — see `QUEUE.md`.

## v4.24 — 2026-08-29

**Equipment as condition-tracked instances, loot, and fencing —
`take_loot()`/`sell_loot()`/`decay_equipment()`'s `Condition` half.**
Second slice of the sixth audited item. `state.equipment` was a flat
array of type-id strings (a de-duplicated set, via `addUnique`); Godot's
`equipment` is `Array[Dictionary]` — real instances, each with its own
`cond` — and nothing in `web/js/v3` could put anything IN it except
narrative effects, since there was no loot-from-battle path at all.

Read `_crew_to_unit()`/`_best_unlocked_weapon()` in `battle_builder.gd`
before writing anything, because it settles a question that shapes the
whole port: **a battle unit's weapon comes from the crew record's own
authored `initial_equipment`, never from `GameState.equipment`.** The
owned/looted stash and a fighter's loadout are two unconnected systems
in Godot — there is no equipment-purchase function anywhere in
`game_state.gd` either, despite `acquisition: 'market'` sitting in
content for several items. So this version does not wire loot into
what crew can wield (there is nothing in Godot to port that would do
that), and does not add a "buy a weapon" screen (Godot doesn't have
one). It is a self-contained fencing economy: loot comes off downed
opponents, decays with wear, and converts down into cash — never back
into capability.

- **`state.equipment` is now `{id, cond}[]`.** `CONDITION` (NEW/USED/
  FAULTY/BROKEN, 0-3) and `CONDITION_RESALE` (1.0/0.7/0.4/0.15) are
  `game_state.gd`'s own enum and table. `addEquipment`/`countOf`/
  `removeOne`/`conditionWord` port `add_equipment`/`count_of`/
  `remove_one`/`condition_word` — `removeOne` takes the WORST instance
  first, matching the comment on why (a wrecked one and a good one in
  the same stash means the wrecked one was in use).
- **Found and fixed a real bug this structural change would have hit
  anyway**: the `equipment:+` narrative-effect handler used `addUnique`,
  silently deduping owned gear — Godot's own effect-application switch
  calls `add_equipment(eq)` with an explicit comment, "Authored grants
  may repeat: a second pipe is a second pipe." Fixed to match.
- **`isPurchasable`/`resaleOf`/`resaleAt`** port the read side of §8's
  asymmetry (loot converts down into money freely; the best gear —
  `acquisition: 'taken'`, `chain` and `sawn-off` in this slice's content
  — cannot be bought at any price, though nothing buys anything yet on
  either build).
- **`droppedKit(battle, data, side)`** ports `dropped_kit()`: only a
  downed unit's real WEAPON drops, never the feature-phone — checked
  here off the equipment content's own `kind`, since this build's
  single-slot `unit.equipment` field doesn't carry Godot's separate
  `weapon_ids`/`item_ids` split on the unit object itself. `'police'`
  stays excluded by construction (only `'player'`/`'enemy'` are valid
  sides, matching the comment on why asking about police here would
  have the player looting them).
- **`takeLoot`/`loseKitOf`** port `take_loot`/`lose_kit_of`, wired into
  `recordBattleConsequences()` in `app.js` ahead of the mission-effects
  call, matching `_settle_loot()`'s position at the top of
  `app_shell.gd`'s `battle_finished` handler. `loseKitOf` (the player's
  own downed crew) fires on every non-training result; `takeLoot`
  (the losing side's dead) only on `battle.result === 'win'` — the
  closest this build's simpler win/loss model has to Godot's
  `VICTORY_ROUT`/`VICTORY_BREAK` gate. **Ported a quiet Godot behaviour
  rather than "fixing" it**: because a unit's weapon is read off its own
  authored kit, not off `state.equipment`, `loseKitOf`'s attempted
  removal usually finds nothing to remove and is a silent no-op — this
  is exactly how `lose_kit_of()` behaves too, not a JS-side gap.
- **Fencing**: `canFenceHere`/`sellLoot` port `can_fence_here`/
  `sell_loot` — Piritori only (§9.7), sells the BEST instance of a
  type (lowest `cond`), pays `resaleAt`, one-way. A FENCE button now
  sits on every EQUIPMENT chip when standing at Piritori, showing the
  live resale price for that specific instance; the panel names why
  it's absent everywhere else. A battle's spoils toast names what was
  taken.
- **`board.js`'s `exposureHere()`** read `state.equipment` as a flat
  array of strings for its "armed" exposure signal
  (`/firearm|pistol|knife/.test(id)`) — fixed to read `item.id` now
  that the array holds instances. Left the regex itself untouched: it
  is JS-original (no Godot equivalent exists to check it against) and
  already only ever matches `folding-knife` against this slice's actual
  weapon ids (`first-handgun`/`sawn-off` don't contain "firearm" or
  "pistol" as substrings) — a pre-existing, narrower-than-it-reads
  heuristic this version didn't touch beyond the type fix.

**Verified**: all bare-node gates green, `port/vectors.mjs --check`
green. A scratch bare-node script covered the instance model end to
end: no-dedup on `addEquipment`, worst-first `removeOne`, purchasable/
resale reads including the `taken`-only gate, fencing paying the
condition-scaled price and picking the BEST instance of a type,
`droppedKit` against a real `createBattleState()` 2v2 (nothing drops
before anyone is down, a downed armed opponent drops their weapon, a
downed feature-phone-only unit drops nothing), and both loot wrappers
including the faithful no-op case. A real Playwright run forced a real
2v2 to a win with a marked-down armed opponent, finished it through the
actual `finish-battle` control, confirmed the real weapon landed in
`state.equipment` at NEW condition, then fenced it through the live
EQUIPMENT panel at Piritori and confirmed the cash payout, the
instance leaving the stash, and the FENCE button disappearing once
nothing of that type remained. `v3-playthrough.cjs` unchanged at
23/28 (same pre-existing failures).

**Not attempted:** `decay_equipment()` itself — its only call site in
Godot is `begin_next_chapter()`, which doesn't exist in this build yet
(chapters, still queued), so porting it now would ship a function with
no caller. `record_chapter_loot()` is not called from `takeLoot()`
either, for the same reason — chapters isn't wired up to record
anything yet. No equipment-purchase UI (Godot has none to port). No
UI distinguishes "cannot be bought" loot from ordinary loot the way
`_add_spoils_lines()`'s tag does — `isPurchasable()` exists and is
tested but nothing calls it from `app.js` yet.

### Port
- **rules:** ported — `add_equipment`/`remove_one`/`take_loot`/
  `sell_loot`/`dropped_kit`/`condition_word`/the `Condition` enum and
  `CONDITION_RESALE` table are the canonical copy; nothing to re-port.
- **data/vectors/meshes:** unchanged.
- **presentation:** the FENCE button and condition display are
  `web/`-only UI.
- **status:** loot/fencing lands. `decay_equipment()` and chapters are
  the two remaining, coupled pieces of "campaign progression" — see
  `QUEUE.md`. Leveling/perks/skills (combat-math changes to `battle.js`)
  and `train()` remain unstarted and independent of this entry.

## v4.23 — 2026-08-29

**Career length and retirement, ported from `age_crew()`/`retire()`.**
First slice of the sixth audited item, "campaign progression" — which
turned out, on reading `game_state.gd` in full, to not be one item.
It is at least six: career length/retirement (this entry), leveling
(`level_of`/`grant_level`, fights-per-level), perks and glory
(`crew_perks`/`grant_glory`, and both are read by `fight_manager.gd`'s
combat math — `perk_value(cid, 'wits')` and specific learned skills
change what a unit can do mid-fight), skills (`skill_offer`/
`learn_skill`, gated by a 12-class/52-skill aptitude system this build's
`battle.js` does not currently read at all), equipment as
condition-tracked instances plus loot and fencing (`Condition` enum,
`take_loot`/`sell_loot`, `state.equipment` would need to stop being a
flat array of type-ids), and chapters (goal tracking, the operation
ending, `decay_equipment()` at the chapter boundary) — the last of
which depends on loot/fencing to mean anything, since Godot's own
`record_chapter_income` is wired to exactly one source: fencing loot,
not market sales or mission payouts, despite its comment claiming
otherwise (the same class of overpromising-comment gap this port has
now met twice — see v4.20's item-use entry). Leveling/perks/skills touch
`fight_manager.gd`'s actual damage and cover resolution, not just data —
porting them properly means changing `battle.js`'s combat math, which
was judged too large and too risky to fold into the same pass as
anything else. See `QUEUE.md` for the full breakdown.

Career length and retirement was the one piece of the six with no
dependency on any of the others, so it goes first:

- **`state.crewFights`** (persisted, id → fight count) and
  **`state.retiredCrew`** (persisted array) — `crew_fights`/
  `retired_crew`'s exact shapes. **`CAREER_FIGHTS = 10`,
  `CAREER_WARN_AT = 7`** — `game_state.gd`'s own constants.
- **`isNamed(state, data, id)`** reads the SAME `named` field
  `crewRecord()` already resolves across both `data.crew` (the six,
  `named: true`) and `state.hiredCrew` (`people/hiring.mjs` candidates,
  `named: false`) — `is_named()`'s exact check, and no new field needed
  since v4.21 already carries it. A named crew member has no ceiling —
  never ages, never retires.
- **`fightsOf`/`careerLeft`/`careerIsVisible`** port `fights_of`/
  `career_left`/`career_is_visible` exactly, including the "nothing
  until they are close, then the game tells you" design: the warning
  only becomes visible at 7 fights, never before.
- **`ageCrew(state, data, deployedIds)`** ports `age_crew()`, wired into
  `recordBattleConsequences()` in `app.js` — after the police-taken loop
  (mirroring `_settle_loot()`/`arrest()`-before-`age_crew()` in
  `app_shell.gd`), inside the same `!battle.training` guard everything
  else in that function already uses (Godot has no training-battle
  concept to compare against; this follows the guard's own established
  spirit rather than inventing a second rule). **Kept a Godot quirk
  faithfully**: `age_crew()` does not check whether a deployed id was
  just taken by police this same fight — it still ages them, and can
  still force them into `retiredCrew` on top of already being gone. Not
  special-cased here either.
- **A real, if obscure, second Godot quirk surfaced and was matched
  rather than closed**: `hire()`'s dedup is `roster.has(id)` ALONE, not
  "have I ever generated this id before." Once retirement exists, that
  is weaker than it reads — a retired candidate is off `state.recruited`,
  so the exact same person can resurface in a later pool read and be
  re-hired, and because `state.retiredCrew` is never cleared,
  `ageCrew()` then skips them forever: a re-hired "retired" veteran
  becomes immortal. **v4.21's `hireFromPool` had accidentally been
  stricter than Godot** (an extra `state.hiredCrew[candidateId]` check
  that was redundant before retirement existed and became a real
  divergence once it did) — removed here to match `roster.has(id)`
  exactly, discovered by the scratch test below failing against the
  original, stricter guard.
- **UI**: `renderCrewCard()` shows a `N FIGHTS LEFT` warning tag once
  `careerIsVisible()` is true, for a hired-and-active crew member only.
  A battle's aftermath toasts `"<name> retires after this one."` for
  each id `ageCrew()` returns.

**Verified**: all bare-node gates green, `port/vectors.mjs --check`
green. A scratch bare-node script drove `ageCrew`/`careerLeft`/
`careerIsVisible` directly: a named crew member never ages across 20
forced calls; a hired candidate's ceiling counts down from 10, the
warning stays hidden through fight 6 and turns visible at 7, retirement
fires exactly on fight 10 and not before, a retired id is idempotent
against further aging, the missing-crew-still-ages quirk, and the
re-hire-after-retirement immortality quirk. A real Playwright run hired
a candidate through the live UI, deployed them into the real 2v2, forced
four battles to a win through the actual `finish-battle` control, and
confirmed the fight count climbing, the warning tag appearing at the
right moment, and real retirement (off `state.recruited`, into
`state.retiredCrew`) at fight 10. `v3-playthrough.cjs` unchanged at
23/28 (same pre-existing failures).

**Not attempted:** leveling, perks, skills, glory, equipment-as-
instances/loot/fencing/decay, and chapters — see `QUEUE.md` for the
full scope of each; none of career/retirement's code touches or assumes
any of them. `train()` (a retired veteran giving a rookie a head start)
is not ported — it reads `retired_crew`, which now exists and is
populated, but the training-contact interaction itself is a separate,
unattempted piece. No UI lists who has retired, only who is close to it.

### Port
- **rules:** ported — `age_crew()`/`retire()`/`career_left()`/
  `career_is_visible()`/`is_named()` and the two constants are the
  canonical copy; nothing to re-port. The `hire()` dedup fix is also a
  match to the canonical behaviour, not a new rule.
- **data/vectors/meshes:** unchanged.
- **presentation:** the warning tag and the retirement toast are
  `web/`-only UI.
- **status:** career/retirement lands. The remaining five pieces of
  "campaign progression" are unstarted and unordered among themselves —
  see `QUEUE.md` for the dependency notes (skills/perks need
  `battle.js` combat-math changes; chapters need loot/fencing first).

## v4.22 — 2026-08-29

**`roster.mjs`'s name-pairing bug, fixed.** Fifth item on the audited
"continue in order" list, and the one that turned up while porting the
fourth (v4.21): `people/roster.mjs`'s own comment claimed first and
family names came "from the one pool" (DESIGN_LOCKS §9.2's rule,
mirroring `crew_generator.gd`'s `_name_from()`), but `FIRST` and `LAST`
were two FLAT lists drawn independently. `LAST` held nothing but Finnish
surnames — so anyone whose first name landed non-Finnish (`Ahmed`,
`Nadia`, `Goran`…) got a Finnish family name **every single time**, not
"eventually" the way `crew_generator.gd`'s own warning describes
("the randomiser would quietly turn the neighbourhood Finnish over a
long campaign"). It wasn't quiet or gradual here; it was 100% of the
time from the first roll, on both the six authored crew slots
(`nameFrom()`, keyed off crew id) and every hireling `roster()` /
`hireling()` ever produced — which also means every hire v4.21 offered
through the pool up to now.

- **`GIVEN`/`FAMILY`**, `crew_generator.gd`'s exact origin-keyed tables
  (fi/so/vi/yu/ee/ru, diacritics intact), replace the flat `FIRST`/`LAST`
  pools. `GIVEN` is exported for the test suite; `FAMILY` stays private.
- **`pairedName(...seed)`** rolls one origin, then a given and a family
  name from THAT origin's pool — `_name_from()`'s own shape — and both
  `nameFrom(seed)` (the six authored crew slots) and `hireling()`'s
  `name` field now call it instead of drawing the two halves apart.
  Nothing else in `hireling()` changed: aptitudes, traits, career stage,
  and the nickname roll all use the same seeds and code as before.
- **`people/test/roster.mjs`'s DESIGN_LOCKS §9.2 test** used a hand-kept
  set of "the non-Finnish first names" to split the roster for the
  statistical-independence check — the exact kind of drift-prone list
  the fix above replaces elsewhere, so it would have silently stopped
  testing anything the moment the pool changed. Rewritten to read origin
  back off `GIVEN` itself.
- **`port/vectors.mjs`'s `people@1` fixture went stale** the moment the
  output changed (rows compare unequal — that's the mechanism, not a
  bug) and was regenerated to **`people@2`** (`node port/vectors.mjs`,
  24 rows, same seeds/indices as before — only the generated names and
  nicks differ, e.g. `port:0` was `"Tero Nurmi"` before and is now
  `"Sergei Ivanov"`).

**Verified**: `node people/test/roster.mjs` — 23/23, including the
rewritten origin-independence check. All bare-node project gates green.
`port/vectors.mjs --check` clean at `people@2` (was correctly STALE
before regenerating — confirmed the mechanism caught the change rather
than silently passing). The v4.21 hiring scratch script and the real
Playwright hiring-UI run were both re-run against the new names and stayed
green (hire flow, cash, roster membership, pool exclusion, deployability,
wage collection — none of that logic reads a specific name, so nothing
there was expected to move, and nothing did). `v3-playthrough.cjs`
unchanged at 23/28 (same pre-existing failures, confirmed against a
stashed `main`).

**Not attempted:** the pools themselves are still small (`GIVEN`/`FAMILY`
are `crew_generator.gd`'s own tables, and that file already calls its own
pools a first guess) — widening them is a content task, not a bug; this
version only fixes how the two halves are drawn relative to each other.
The six authored crew's displayed names change with this fix (a
consequence of the pool swap, not a separate decision) — nothing pins a
specific authored-crew name anywhere in `web/js/v3` or its tests, so this
was not treated as a compatibility break.

### Port
- **rules:** ported — `crew_generator.gd`'s `GIVEN`/`FAMILY` tables and
  `_name_from()`'s same-origin discipline are the canonical copy; nothing
  to re-port.
- **data/vectors/meshes:** `port/vectors/people.json` moved to **rev 2** —
  name it as such in any Godot-side changelog that tracks vector revs.
- **presentation:** none — no UI changed shape, only the names it shows.
- **status:** the name-pairing bug is closed. Next in order: campaign
  progression (leveling, chapters, equipment decay, career lifecycle),
  then `ja` localization for the battle UI, then the hardcoded
  `bulletin[0]` in news — see `QUEUE.md`.

## v4.21 — 2026-08-29

**The hiring pool, ported.** Third item on the audited "continue in order"
list: `crew_generator.gd` — the disposable half of the roster
(COMBAT.md §7, decision 2b) — had nothing in `web/js/v3` at all. Walking
into a fight with only the six authored crew, forever, was the whole
gap.

Two generators already existed in this codebase and neither alone could
drive a hire: `crew_generator.gd` rolls a battle-deployable person (one
of the six art-backed roles, condition/nerve/tempo, a wage, real
portrait/torso/legs ids) but names them from a flat, un-paired pool and
gives them no traits worth reading; `people/roster.mjs`'s `hireling()`
rolls a genuinely interesting person (paired first/family names from ONE
origin — the exact discipline DESIGN_LOCKS §9.2 asks for — real traits,
a career stage) but has no wage, no combat stats, and no art ids. Asked
which to build on, the owner chose **combine both**.

- **New `people/hiring.mjs`.** `hireCandidate(seed, i)` calls `hireling()`
  for the name and the flavour, then rolls a role and battle stats the
  same way `CrewGenerator.generate()` does — same `ROLES`, `ROLE_BASE`,
  `ROLE_COMPETENCIES`, `PORTRAITS`, and `SPREAD` tables, read off
  `crew_generator.gd` rather than invented. Seeded through this
  codebase's one hash convention (`market/model.mjs`'s `rand01`) instead
  of Godot's own `RandomNumberGenerator` — `PORTING.md` §4: rules travel
  as (input, output) pairs and a fixed data shape, not a shared RNG
  implementation. `roster.mjs` itself is untouched, so `port/vectors.mjs`'s
  existing `people@1` fixture (24 rows) stays valid.
- **`state.js` gains `state.hiredCrew`** (persisted, keyed by id) — a
  second crew-record source alongside the static `data.crew` Map, since a
  hired-off-the-street candidate does not exist in content loaded at
  boot. **`crewRecord(state, data, id)`** checks both and every existing
  call site that assumed `data.crew.get(id)` was the only source now
  goes through it — `deployedCrew()`, the critical-wound log line in
  `chooseEnding()`, and (a real, previously-latent bug) `settleNight()`'s
  wage sum, which used `content.crew.find(...)` and would never have
  matched a generated id, so a hired crew member's wage would silently
  never have been collected.
- **`hiringPoolFor(state, data)`** wraps `hiringPool(seed, day)`, derived
  from the campaign seed (`state.seed`, defaulted to `GameState.gd`'s own
  constant `20030101` — a fixed date-shaped seed, not a random roll) and
  the current day, so the offer is stable across renders and cannot drift
  out of sync with the day — walking away and back does not reroll the
  board. Ported `GameState.gd`'s `hiring_pool()` exactly: candidates
  already on `state.recruited` are filtered out of the pool, so a hired
  person stops being offered next to themselves.
- **`hireFromPool(state, data, candidateId)`** ports `GameState.gd`'s
  `hire()`, signing-fee included: the fee is the candidate's own wage,
  charged once up front, and the hire fails outright if cash can't cover
  it — the owner's own comment there calls this a PLACEHOLDER, "never
  playtested," and this port carries that caveat forward rather than
  smoothing it into something that reads as settled design.
- **UI**: a new "HIRE / TODAY'S CANDIDATES" panel in the ledger
  (`app.js`) lists the day's three offers (name, role, age, one trait
  line, the fee) each with a HIRE button, disabled and labelled CANNOT
  AFFORD when short on cash. The existing CREW panel's grid now includes
  hired-off-the-street crew alongside the authored six;
  `renderCrewCard()` falls back to a hire candidate's first trait line
  where an authored member would show `member.strength` (a field a
  generated person never has).

**Verified**: all bare-node gates green, `port/vectors.mjs --check`
green (`people@1` unaffected). A scratch bare-node script exercised
`hiringPoolFor`/`hireFromPool`/`crewRecord`/`settleNight` directly:
determinism across repeated calls on the same day, the signing fee
charged exactly once, insufficient cash refused, a hired candidate
dropped from the next pool read, deployability alongside authored crew,
and wage collection on night settlement for a hired-off-the-street
person specifically (not just the authored six). A real Playwright run
against the live UI hired a candidate through the actual HIRE button and
confirmed the cash drop, the roster/hiredCrew update, the candidate's
disappearance from the pool, and their appearance in the CREW grid, with
no new console errors. `v3-playthrough.cjs` unchanged at 23/28 (the 5
failures are pre-existing on `main`, confirmed by re-running it stashed).

**Not attempted:** no way to fire or release a hired crew member (Godot
has none either — `state.crewStatus`'s `'missing'` status already has
nowhere further to go, per `QUEUE.md`'s v4.19 note, and this is the same
gap surfacing a second way); no UI to view a hired candidate's full
trait list, only the first one; the six recycled portraits are exactly
as flagged a placeholder in `crew_generator.gd`'s own comment, not
expanded; `ja` locale strings for the new panel — the panel follows the
existing precedent that most non-battle panel labels in `app.js` are
English-only text, not run through `tr()`, so this does not widen the
localization gap `VERSIONS.md`'s ordered list already tracks as its own
item.

### Port
- **rules:** ported — `crew_generator.gd`'s tables and the signing-fee
  behaviour are the canonical copy; nothing to re-port.
- **data/vectors/meshes:** unchanged. `people/roster.mjs` and its
  `people@1` vector fixture are untouched.
- **presentation:** the HIRE panel is `web/`-only UI.
- **status:** hiring pool lands. Next in order: `roster.mjs`'s
  name-pairing bug (its `FIRST`/`LAST` pools are flat and drawn
  independently, unlike `_name_from()`'s same-origin discipline this
  version just leaned on for `hireling()`), then campaign progression —
  see `QUEUE.md`.

## v4.20 — 2026-08-28

**In-combat item use, ported.** Second item on the audited "continue in
order" list: `fight_manager.gd`'s `Command.Type.ITEM` — a fighter using a
carried consumable mid-fight — had no reference anywhere in `web/js/v3`.

- **`equipment.js` gains `itemsFrom()`** — `EquipmentRules.items()`
  ported exactly: every `content.equipment` entry with `kind: 'support'`
  gets the same generic `{effectType:'signal', magnitude:1, target:
  'ally', singleUse:false}` shape. Today that is exactly one entry
  (feature-phone) — the slice's only support item.
- **`battle.js` gains `useItem()`**, ported from `_resolve_item()`'s
  effect-type match. Honest about what it found: Godot's own match has no
  `'signal'` branch, so using the slice's one registered item is a legal
  command on BOTH builds that logs and spends the action without changing
  a single stat — not a gap this port introduced, a gap it faithfully
  reproduced rather than quietly "fixed" by inventing an effect Godot
  itself doesn't have. `restore_condition` and `restore_nerve` — the two
  effect types this build actually has a stat for — are real and would
  fire the moment content registers an item that uses them.
- **`item_ids` follows `battle_builder.gd`'s exact rule**: a crew
  member's `initial_equipment` filtered to `feature-phone` specifically
  — other carried equipment is a held WEAPON, not a usable item — and
  opponents never get any (`_opponent_to_unit()` sets none either).
- **A "USE · Feature-phone" button** appears in the battle console only
  for a unit that actually carries one, one click like brace (no target
  picker — Godot's `target: 'ally'` implies one, building it for an item
  with no observable effect on either build is not attempted here).

**Verified**: all bare-node gates green, `port/vectors.mjs --check`
green, `v3-playthrough.cjs` unchanged at 23/28. A real Playwright run
used the item through the actual UI and confirmed the log line, the
spent action, and no stat change (the honest, faithful result).

**Not attempted:** wiring item use into `autoCommand()`'s AI scoring —
Godot's own comment on its flat `0.5` score ("extend per item type")
already marks it a placeholder, and risking the tested, previously-
regressed auto-play scorer for a currently-inert command was judged not
worth it this pass. An ally-target picker, per the note above.

### Port
- **rules:** ported — nothing to re-port, Godot has the canonical copy.
- **data/vectors/meshes:** unchanged. **presentation:** the button is
  `web/`-only UI.
- **status:** item use lands. Next in order: the hiring pool
  (`crew_generator.gd`), then `roster.mjs`'s name-pairing bug — see
  `QUEUE.md`.

## v4.19 — 2026-08-28

**Police and heat (COMBAT.md §9.5), ported.** Owner: "continue in order" —
the first item on the audited list of Godot mechanics with no web
counterpart: `fight_manager.gd`'s heat/police intervention (spawn on a
threshold, the player's posture choice, arrest-vs-rescue), previously not
referenced anywhere in `web/js/v3`. Ported into `battle.js` as a real
third combat side rather than a stand-in.

- **Heat accrues per round** (`+1`), **per downed body either side**
  (`+2.5`), and **once**, the first round any fighter who acted was
  holding a lethal-held weapon (`+4` — `equipment.js`'s `lethal` flag,
  already covering blades as well as firearms, not a separate check
  invented for this). At `HEAT_THRESHOLD` (12) the police arrive — 2 to 5
  of them, scaled to how far past the threshold heat climbed, filling
  lanes from the centre outward at whichever end the side still standing
  in greater numbers is NOT behind (§9.5.1: "the ones who look like they
  are winning are the ones who look like they started it"). Skipped
  entirely for a training battle — "no cost, this is a test area" (v4.18)
  now covers heat too, not just injury and the campaign clock.
- **Police are a real third side** (`battle.police`, `side: 'police'`),
  occupying the shared grid like anyone else — they block movement and
  stop a non-piercing shot exactly like a body from either crew — but
  `attackTargets()` now explicitly excludes `'police'` from ever becoming
  a valid target for either side, matching `Fighter.Side.THIRD_PARTY` /
  `Disposition.REACTIVE`: on the board, not yet anybody's enemy, starting
  nothing. They never act — this build's simple deterministic AI has no
  concept of a third side taking a turn, and neither does Godot's (`"noth-
  ing gives them a turn yet — that is the next piece"`).
- **The posture choice outranks every other command** (§9.5.2) while
  awaiting an answer: `attack`/`brace`/`move`/`end-turn`/`withdraw`/
  `negotiate`/`autoCommand` all refuse to act, and the battle console
  replaces its whole action panel with the two available postures —
  matching `formation_battle.gd`'s own framing exactly. ENGAGE (fighting
  the police) is refused, not faked: neither build has a real third
  combat side to run that fight on.
- **`resolvePoliceOutcome()`** ports `_resolve_police_outcome()` exactly:
  BACK_OFF loses every downed player to the police; HELP_FRIENDS spends
  standing crew to pull the fallen out, nearest the entry point first (the
  ones actually in danger), and a rescue close enough that the helper
  "walks into it" (within `RESCUE_DANGER_DEPTH`) costs the helper too — a
  body on its feet for a body on the ground, usually a bad trade and meant
  to be. Verified against a hand-placed scenario (near/far fallen, one
  standing helper) matching Godot's own function line for line.
- **The consequence lands in `recordBattleConsequences()`** (app.js): a
  taken player's status becomes `'missing'` — reusing the status value
  `deployedCrew()` already excludes on, not a new vocabulary half the
  codebase wouldn't recognise — instead of the ordinary wounded/critical
  path; a STANDING helper taken during a rescue gets the same outcome
  despite never being wounded in the fight itself, which is the whole
  point of the trade being real.

**Verified**: all bare-node gates green, `port/vectors.mjs --check` green,
`v3-playthrough.cjs` unchanged at the established 23/28 baseline. A real
Playwright run drove the police panel directly: forced heat to threshold,
confirmed the action panel is replaced by the posture choice, confirmed
two blue-bordered police tokens render on the board (a new `.unit-token
.police` treatment, `--police` added to the palette), clicked BACK OFF,
confirmed the panel reverts and the correct crew member is recorded taken.
`web/test/v3-battle.mjs`'s existing 100+-round auto-play regression test
now also doubles as heat-clock coverage — the fight runs long enough to
cross the threshold on its own, and the harness answers the posture the
same way a player would (HELP_FRIENDS, the branch with real logic to
exercise) rather than getting stuck, which it now correctly would without
an answer.

**Not attempted here:**

- **`Command.Type.ITEM`** (in-combat item use) — next on the audited list,
  a separate mechanic from police/heat and not touched by this version.
- **Police taking a real turn.** Both builds currently have them stand and
  be seen; Godot's own comment names this as future work, not a gap this
  version was expected to close.
- **A 3D-specific police body pose/animation.** `render3d.js` loads the
  same registered `cast3d-enforcer-v01` Godot's own `UNIT_BY_ROLE` uses for
  police (the generic non-player fallback already resolved to it
  correctly, needing no new mapping) — no clip wiring, matching the
  existing "no animation" disclaimer standing since v4.14.

### Port
- **vectors:** unchanged.
- **data:** unchanged.
- **rules:** THIS is the port — `battle.js`'s heat/police block mirrors
  `fight_manager.gd`'s constants and control flow directly; nothing to
  re-port from web to Godot, since Godot already has the canonical copy.
- **meshes:** none new — uses the enforcer body already registered.
- **presentation:** the police-choice panel and unit-token treatment are
  `web/`-only UI, patterned after `formation_battle.gd`'s own framing but
  not a pixel port of it.
- **status:** heat/police lands. Item use, the hiring pool, `roster.mjs`'s
  name-pairing bug, campaign progression (leveling/chapters/equipment
  decay/career), `ja` localization for the battle UI, and the news-bulletin
  lookup are next in the audited order — see `QUEUE.md`.

## v4.18 — 2026-08-28

**The Hermanni skate park is a real, playable test area for battle
training.** Owner ruling, directly: "add the Hermanni spot as a test area
for battle training in Era1. keep putting parity there." `stage3d-hermanni-
skatepark-v01` had been registered art since it arrived — a real, textured
concrete skate park glb — and QUEUE.md's own "The skate park arena — a
canon decision nobody has made" recorded it as "placed nowhere," reachable
only through `?stage=` on the Godot side and not renderable as an arena on
`web/` at all (`render3d.js` only ever loaded the cast, never a stage —
named explicitly in v4.14's "not attempted" list). This closes both gaps
at once: the arena gets a real place in the game, and `render3d.js` gains
its second capability.

- **`hermanni_skatepark` (new anchor, `map/kallio-era1-2003-v1.json`,
  15th anchor)** — `sliceState: 'training'`, a value that exists nowhere
  else on purpose: it keeps the anchor out of the 11 `active` anchors
  `board.js`'s market participates in (a training ground has no market
  offers, no schedule slot, no travel-time economy) while still rendering
  and being selectable like any other anchor. Its wgs84 is nudged to sit
  just inside the locked production boundary and marked `representative-
  inside-production-boundary` — the exact compromise `suvilahti`'s anchor
  already uses for the same reason (the real district sits just past the
  boundary; QUEUE.md's skate-park entry names this precisely). No edge
  connects it to the route graph: reaching a practice ground isn't a
  smuggling run, and inventing a tram/street connection with no research
  behind it would be exactly the "invent first" TRANSIT_LAYERS.md's own
  ruling #3 forbids.
- **`battle-hermanni-training` (new battle, 4th authored battle — the
  pinned count in both `content/validate-slice.mjs` and `v3-contract.mjs`
  moves 3→4 deliberately, matching the existing convention for
  intentional battle additions)** — a repeatable, no-stakes 3v3 against a
  fixed training set (`hold-position` intent, one of each: baseball-bat/
  front-adjacent reach, folding-knife/front-only, first-handgun/all-rows) —
  chosen to exercise the full reach-pattern and cover system the grid
  rebuild (v4.15) shipped, in one sparring session. `scene_asset_id` is
  the real registered manifest id (`stage3d-hermanni-skatepark-v01`)
  directly, the same convention `battle-kattilahalli-3v3` already uses.
- **A training battle costs nothing, by construction, not by a special
  case scattered through the code.** `battle.js`'s `missionId` derivation
  — previously a two-way ternary that could not correctly support a third
  battle, let alone a fourth — becomes a real `BATTLE_MISSION` lookup;
  anything absent from it (any new battle) gets `missionId: null`, and
  `resultEffects()` already treated a missing mission as "no effects."
  `recordBattleConsequences()` (app.js) now also skips the permanent
  crew-condition damage and the campaign-clock advance specifically when
  `battle.training` is true — verified end-to-end with a real Playwright
  run: fight, withdraw, finish, and the campaign day and every crew
  member's condition are bit-for-bit unchanged after.
- **`render3d.js` renders the real arena now, not just the cast.**
  `loadStageModel()` loads whichever asset a battle's `scene_asset_id`
  names IF it is itself a registered `mesh-3d` asset (which is exactly
  how `battle-kattilahalli-3v3` and the new training battle both already
  author it) — battles with real 2D scene art (karhupuisto, courtyard)
  have no such entry and render exactly as before. The arena is scaled by
  the same fixed 5.4 `battle_stage_3d.gd`'s `_build_stage()` uses, then
  centred on its own bounding box and dropped so its lowest point sits at
  y=0 — NOT a port of Godot's real auto-fit (vertex-sampling the open
  middle of the mesh to find the true walkable surface, then deriving the
  board's own cell size from the measured footprint); this build's board
  is already a fixed size, so the arena only needs to look right under
  it, and that gap is named rather than silently simplified away. A new
  `stage3d-arena` class (parallel to `stage3d-ready`) only appears once
  the real arena mesh has actually loaded, and only then does CSS hide
  the flat 2D scene image underneath — this quietly fixes
  `battle-kattilahalli-3v3` too, which had been pointing its 2D
  `<img>` at an unloadable `.glb` URL with nothing behind it since v4.14.
- **`battle_stage_3d.gd` gets a one-line fix**, the only Godot-side edit
  this version makes: `STAGE_BY_SCENE` had no entry for the real
  registered id (`stage3d-hermanni-skatepark-v01`), only for the `scene-`
  alias — a battle authored with the real id (as `battle-kattilahalli-
  3v3` already established the convention for) would have silently
  fallen through to the default backyard on Godot's side while `web/`
  showed the correct arena. Added, mirroring the exact pattern the
  kattilahalli entry already uses two lines above it.
- **The stale "CANON NOTE" on the registered asset itself
  (`art/v3/manifest.json`) is updated** — it had said "NOT placed at any
  anchor... until someone rules." Someone has.

**Verified**: `map/validate-map.mjs`, `content/validate-slice.mjs`,
`v3-contract.mjs` (pinned counts moved deliberately), `v3-battle.mjs`,
`missions`/`market` model suites, `port/vectors.mjs --check` all green;
`v3-playthrough.cjs` unchanged at the established 23/28 baseline. A real
Playwright run (SwiftShader) drove the actual UI: selected the anchor,
started training, confirmed `stage3d-arena stage3d-ready` on the stage,
screenshotted the real arena with six character models standing in it,
withdrew, finished, and confirmed the campaign day and crew condition
were untouched. No new console errors beyond the same pre-existing,
unrelated `hub/shell.js?v=` 404 every prior version this session has
disclaimed.

**Not attempted here:**

- **The auto-fit arena system** (vertex-sampled ground height, board size
  derived from the measured arena) — named above; this build's fixed
  board and a bounding-box ground estimate are the honest substitute.
- **A second or third training battle.** "Test area" implied one
  repeatable session is enough to start; more sparring configurations
  (different weapon sets, different formats) are additional content, not
  required by this version.
- **`battle-kattilahalli-3v3`'s pre-existing mission-sharing with
  `battle-courtyard-3v3`** — noticed while building the new
  `BATTLE_MISSION` table, preserved exactly as it was rather than
  silently "corrected," since whether that sharing is intentional is a
  separate question this version does not resolve.

### Port
- **vectors:** unchanged.
- **data:** `content/era1-slice-v1.json` (`battle-hermanni-training`) and
  `map/kallio-era1-2003-v1.json` (`hermanni_skatepark`) are the shared
  source both builds read — Godot needed no content change.
- **rules:** the training-battle no-consequence behaviour
  (`missionId: null` → no effects, `battle.training` → no injury/clock
  cost) is `web/`-only bookkeeping around content flags Godot already
  reads the same way (an absent mission link, an explicit `training`
  field) — nothing to re-port.
- **meshes:** none new — uses the arena already registered.
- **presentation:** `render3d.js`'s arena loading is `web/`-only, closing
  a gap named since v4.14; the one Godot edit (`STAGE_BY_SCENE`) is a
  missing-key fix, not new presentation.
- **status:** the Hermanni arena is placed and playable on both sides.
  MARK, anchor cover, persistent injuries, tempo/initiative, L3/L4
  transit, the wait mechanic, and the corridors underlay remain open —
  see `QUEUE.md`.

## v4.17 — 2026-08-28

**The fake straight-line edges are gone from the route map.** Owner,
directly, minutes after v4.16 shipped the real transit network: "the
direct map lines from location to the next don't make sense so let's
remove those. you only use trams, metro, or go by foot on bigger actual
streets." Every anchor pair in `data.map.edges` had been drawn as a
straight schematic segment (`.map-edge`, tinted by mode) regardless of
what actually lay between the two points — and once the real curved HSL
geometry was drawn right next to it in v4.16, a diagonal line cutting
through blocks a real tram or a real street would never cross read as
straightforwardly wrong rather than as a stylised abstraction.

- **`renderRoute()`'s `edgeSvg` (the always-on web of every connection)
  is removed**, along with the now-dead `.map-edge`/`.map-edge.tram`/
  `.map-edge.metro` CSS. `data.map.edges` itself is untouched — it is
  still the graph `shortestPath()` plans a route over, and it still
  carries a real `corridor` id per edge (`e.g. "hameentie"`,
  `"fleminginkatu"`) that was never fictional to begin with. Only the
  ALWAYS-VISIBLE straight-line rendering of every possible connection is
  gone; the DATA a route is planned over is unchanged.
- **What stayed, and why**: the player's own actively-chosen route
  (`.map-route`, drawn only once a route is drafted or pinned) is left
  as a straight highlighted line between its stops. It is not what the
  owner's "direct map lines from location to the next" describes (that
  read as the persistent all-pairs web, always on, not the one path a
  player picked); it is also the one line this build has no real street
  geometry to replace yet — same honest gap `QUEUE.md`'s v4.16 entry
  already named. `ordinaryFlowSvg()`'s ambient drifting dots are also
  untouched — they render as points, not lines, and were not the thing
  reported.
- **Verified by screenshot**: the route map now shows only the real
  transit network and the fourteen anchor dots at rest; drafting a route
  via `debug.setState({ route: {...} })` still draws `.map-route`
  correctly. No new console errors.

### Port
- **vectors/data/rules/meshes:** unchanged.
- **presentation:** `web/`-only visual cleanup; nothing for Godot to
  re-port (`city_map.gd` never drew this schematic edge web — it draws
  the real corridor-and-street data directly, per `TRANSIT_LAYERS.md`
  §10.8's `map/kallio-corridors-v1.json` underlay, which `web/` still
  does not load).
- **status:** the straight-route highlight and the ambient flow dots are
  the two remaining places this build still draws a straight line
  standing in for a real path — see `QUEUE.md`.

## v4.16 — 2026-08-28

**The real transit network reaches `web/`'s map — L2, ported.** Owner
picked "map / economy" as the next Godot→web gap after the grid rebuild
(`QUEUE.md`'s "Sync fire was designed in the wrong build" entry had flagged
`TRANSIT_LAYERS.md` and `MARKET.md` as substantial, owner-ruled systems
never engaged with this session). Audited both against the current build:
`MARKET.md`'s economy is NOT a Godot-ahead gap — `web/js/v3/board.js` /
`market/model.mjs` already exceed Godot's simple `market_ledger.gd` (see
v4.13/earlier audit) — but the map is: `city_map.gd`'s L2 (real HSL tram
and metro geometry, `TRANSIT_LAYERS.md` §3, live on the Godot board since
2026-08-27) had no counterpart here at all — `web/`'s route screen drew
twelve schematic anchor dots, straight-line edges, and one hand-sketched
dashed rail path with no relation to a real network.

- **`map/tools/transit-layer.mjs` (new)** — `buildTransitLines()` moved out
  of `godot/tools/build-map-geometry.mjs` verbatim (confirmed byte-identical
  output before/after), so it is now a SHARED module rather than something
  only Godot's build could call: real GTFS geometry for the seven services
  that actually serve Kallio (`TRANSIT_LAYERS.md` §10.5), real per-line
  colours, the same corridor-fanning algorithm `map/tools/master-plate.mjs`'s
  offline plates use, projected into the shared board coordinate space.
  `godot/tools/build-map-geometry.mjs` now imports it instead of defining
  it locally — one algorithm, not two copies that can drift.
- **`map/tools/build-transit-layer.mjs` (new)** — calls the same function
  and commits the result as `map/kallio-transit-layer-v1.json` (63 KB, 9
  services), matching the naming and `--check`-gated convention of its
  sibling committed extracts (`kallio-rail-v1.json`, `kallio-corridors-
  v1.json`). `web/` has no build step (`CLAUDE.md`), so the derived layer
  has to already exist as a file a plain `fetch()` can read — this is DATA
  (`PORTING.md` §1), generated once from committed sources and shared, not
  ported or reimplemented per side.
- **`web/js/v3/content.js`** loads it alongside the existing map/content
  fetches; **`web/js/v3/app.js`**'s route screen draws it as a new
  `transitLayerSvg()` layer, between the paper board background and the
  existing schematic anchor graph — hard dark keyline under each line's
  real HSL-derived colour (`§9.3`'s Era I "printed" register: flat colour,
  no glow, since this build has no live layer for a glow to distinguish
  from), a rounded paper-chip badge with the line's own number where it
  crosses the visible board, ink colour picked by the SAME relative-
  luminance formula Godot's `Color.get_luminance()` uses so a chip's text
  contrast rule isn't invented twice. The old single hand-drawn `.map-rail`
  dashed path — the exact leftover `build-map-geometry.mjs`'s own comment
  names as replaced on the Godot side — is removed rather than left drawn
  underneath the real thing.
- **The schematic anchor graph (`data.map.edges`, `.map-edge`) is
  untouched and stays** — `shortestPath()` still routes over it, and it
  is not the same graph as the real transit geometry (it has no per-stop
  structure to route over). The new layer is the real network a Kallio
  player recognises; the schematic graph is still what "pin a route"
  clicks against. Two data shapes doing two different jobs, not a
  duplication to resolve.
- **Verified by screenshot** (`PHASING.md` standing rule 4), not by "no
  console errors": nine lines, fourteen chips, distinct real colours,
  running the correct corridors past the correct anchors (the metro through
  Hakaniemi, tram 7 and tram 3 sharing Hämeentie fanned apart rather than
  overdrawing one line). No new console errors beyond the same pre-existing
  unrelated `hub/shell.js?v=` 404 v4.15 already disclaimed.

**Not attempted here:**

- **L3 (live vehicles) and L4 (pressure/congestion)** are explicitly
  "proposal and phase-gated" per `TRANSIT_LAYERS.md`'s own status line —
  nothing exists on the Godot side to port yet, so building either here
  would be new cross-build design work, not a port.
- **The waiting-for-a-real-tram mechanic (`TRANSIT_LAYERS.md` §4)** —
  Story/Timetable/Live rate modes, the service model's `nextDepartures()`,
  the wait screen — is design proposal only, not canon, and not built on
  either side.
- **`MARKET.md`'s own §8 spec gaps** (factor-breakdown bars, map-integrated
  info-state marks, no drinking/condition UI) are real but are NOT a
  Godot-ahead gap — `web/`'s economy already leads Godot's — so they are
  out of scope for a Godot→web port pass and belong to `web/`'s own
  backlog instead.
- **No route-planner integration.** Clicking a route still plans over
  `data.map.edges`; the real transit layer is not yet consulted to prefer
  or narrate a route along an actual tram line.

### Port
- **vectors:** unchanged.
- **data:** `map/kallio-transit-layer-v1.json` is new, committed, shared —
  `map/tools/build-transit-layer.mjs --check` is the gate (wired into
  `web/tools/check-project.mjs`); regenerate with
  `node map/tools/build-transit-layer.mjs` whenever `map/kallio-rail-v1.json`
  changes.
- **rules:** none — this is a presentation/data slice, no combat or
  economy rule moved either direction.
- **meshes:** none.
- **presentation:** `web/`'s own printed-register rendering of the shared
  layer; Godot's `city_map.gd` is untouched (confirmed via a byte-identical
  `data/map-geometry.json` before/after the `transit-layer.mjs` extraction).
- **status:** L2 landed on `web/`. L3/L4 and the wait mechanic remain
  proposal-only on both sides — see `QUEUE.md`.

## v4.15 — 2026-08-28

**The grid rebuild: `battle.js`'s board IS `board.gd` now, not a JS
invention of its own.** Owner ruling, this same day: "the grid structure
was already set and much bigger. please check Godot repo for actual
details" — followed by "use all the Godot info, never revert to the JS
version. do this until all Godot features are in the JS version." v4.14's
`render3d.js` had positioned real meshes correctly onto `battle.js`'s OWN
small mirrored 3-lane board, which was never a port of anything: two
private per-side grids, adjacency-limited reposition, and role-based reach
shortcuts (`role === 'watcher' || role === 'fixer'`, a hardcoded
`first-handgun` special case) hand-invented for this build and never
checked against Godot's real combat code. This version replaces that board
and its reach/movement rules wholesale with a faithful port of
`godot/scripts/fight/board.gd`, `battle_builder.gd`, and
`equipment_rules.gd`.

- **`web/js/v3/grid.js` (new)** — `FightBoard`, ported: 6 lanes, ONE unified
  depth axis shared by both sides (`totalRows() = 8`: 3 player rows + 2 real,
  occupiable neutral rows + 3 opposition rows), front nearest the midline
  for both sides, `depthOf`/`rowOf`/`bandOf` as the exact inverse pair
  `board.gd` defines. Authored content ("front-2") is centred onto the wider
  canon board via `AUTHORED_LANES`/`authoredLaneOffset()`
  (`battle_builder.gd`'s `_authored_lane_offset()`), and `deployOrder()` /
  `defaultPlayerSlot()` port `_deploy_order()` / `_default_player_slot()`
  exactly — front rank first, each row read from the lane centre outward,
  two-fighter crews holding the centre lane at two depths instead of
  spreading wide.
- **`web/js/v3/equipment.js` (new)** — `EquipmentRules.weapons()`, ported:
  the five `reach_pattern`s (`front-same-lane`, `front-same-or-adjacent-
  lane`, `clear-same-lane-through-front`, `front-same-lane-through`,
  `front-wide-short`) and the `HOLD_TUNING` harm/nerve table, read straight
  off each item's own `hold`/`reach_pattern` in `content.equipment` — not a
  hand-kept catalogue in `battle.js`.
- **Reach is equipment-only now — nothing reads `role`.** The old
  `role === 'watcher' || role === 'fixer'` lane-only exception and the
  `first-handgun` special case are both gone; `attackTargets()` (ported from
  `FightManager._get_attack_targets()`) walks the shared depth axis outward
  from the attacker per lane, checking cover then occupancy, non-piercing
  stopping at the first body or soft cover, piercing continuing to hard
  cover. A fighter who has advanced out of their own band counts as FRONT
  by definition (`row_of()` returning -1 falls back to `ROW_FRONT`) — a
  normal position on this board, not an edge case, and now vectored
  (`sync@2`'s `advanced-past-own-band-still-counts-as-front`).
- **Cover is real now.** `battle.cover` (built from each battle's own
  `cover` field via the same `parseCell()` opponent cells use) blocks a
  non-piercing walk at the exact depth it sits on — including the depth a
  body is standing on, since Godot's own cover check runs before the
  occupancy check at each step. `battle-courtyard-3v3`'s "stone-bin" at
  the opposition's front-1 is a genuine no-shot cell now; the sync-fire
  vectors were moved off it on purpose, not by accident (see below).
- **Reposition is a placement anywhere free, not a step.** `free_slots_for()`
  (ported as `validMoveCells()`) has no adjacency check in Godot at all —
  the old build's Manhattan-distance-1 rule was never a port either. Godot's
  own version loops `range(3)` rather than `FightBoard.total_rows()`, which
  — per `board.gd`'s own docstring, "a `range(3)` in the intent scan" was
  one of four places a leftover three-row assumption hid, three of which
  were already found and fixed there — reads as an unported leftover: it
  would silently cap every fighter, opposition included, at depths 0-2 (the
  PLAYER's home band), contradicting both the function's own comment
  ("free cells on this unit's own half-board") and the owner's board.gd
  ruling ("crews start in their colour areas and can move to ALL coloured
  areas"; the neutral rows are explicitly "ground a unit can be pushed or
  repositioned into"). This port uses the documented-correct wide range
  rather than replicating what reads as a bug — flagged in `battle.js`'s
  own doc comment rather than silently diverging, for whoever ports
  `free_slots_for()` next to weigh.
- **The 2D formation board (`app.js`) and the 3D stage (`render3d.js`) both
  read the SAME `grid.js` slot** a unit's `cell` now carries (a `slotKey`
  — `"lane,depth"` — not the authored "front-2" text, which cannot name the
  neutral cells a unit can now stand in). `cellPosition()` lays depth out
  vertically (player's own back row at the bottom, the opposition's at the
  top) across one continuous 48-cell board instead of two mirrored 3×3
  halves; `worldFor()` maps the same slot into 3D space, with the camera
  and ground plane resized for a board that is now deeper than it is wide.
  `describeSlot()` (grid.js) extends Godot's own `cell_name()` — which is
  only ever called on a side's own band — to label the real neutral cells
  too, for logs and aria-labels.
- **`web/test/v3-battle.mjs`, `port/vectors.mjs`'s sync-fire vectors, and
  `web/test/v3-playthrough.cjs` all updated for the real board**: cells are
  set via `parseCellFor()` rather than assigned as raw authored strings
  (which are no longer what `unit.cell` holds); the sync-fire vectors'
  `watcher-and-fixer-reach-by-lane-alone-ignoring-row` scenario — testing a
  rule that no longer exists — is replaced with
  `advanced-past-own-band-still-counts-as-front`, a real ported rule worth
  protecting; the formation-cell count assertion moves from 18 (two mirrored
  3×3 halves) to 48 (one 6×8 board). The 2v2 smoke battle's auto-play safety
  cap moves from 60 to 150 rounds: the ported deployment for a 2-fighter
  crew no longer happens to land lane-for-lane with this battle's authored
  opponent positions the way the old board's hand-picked opening cells
  coincidentally did, so `HOLD_THE_LINE`'s real GUARD-over-REPOSITION
  weighting (`stance.js`, ported from `fight_manager.gd`) makes an
  out-of-reach crew brace far more often than it drifts into range before
  the fight resolves — a real consequence of the port, not a bug in it.

**Verified**: `map/validate-map.mjs`, `content/validate-slice.mjs`,
`v3-contract.mjs`, `v3-state.mjs`, `v3-battle.mjs`, `missions/test/
model.mjs`, `market/test/model.mjs`, `port/vectors.mjs --check` (`sync`
moved `1 -> 2`, four other vector files unchanged) all green.
`v3-playthrough.cjs` (real Chromium) passes the same 23/28 it passed before
this version, including the two checks this version touches directly
("2v2 renders four modular combatants", "the shared formation board
renders every lane and depth" — 48, not 18); the 5 pre-existing failures
(a stale `hub/shell.js?v=` reference this repo has never carried a real
`hub/` for, a map-anchor-count assertion, and two `.toko` viewport checks
tracked in `QUEUE.md`) reproduce identically on `main` before this change
and are untouched by it — confirmed by running the same gate against a
stash of this version's diff. The v4.14 3D stage was also re-verified by
screenshot against the new coordinates (real Playwright + SwiftShader,
not "no console errors"): four distinct meshes at four distinct depths on
the wider ground plane, no new errors beyond that same pre-existing
`hub/shell.js` 404.

**Not attempted here — comprehensive parity is a direction, not one
version's scope, and this is the grid/reach/cover/deployment slice of it:**

- **MARK** (`fight_manager.gd`'s real Spotter verb — a duration-tracked
  intent-priority command, `Command.Type.MARK`, `_resolve_mark()`,
  `MARK_ROUNDS_BASE`/`MARK_ROUNDS_CALL_IT`/`MARK_WHOLE_FIGHT`) is a
  separate, larger system than reach and is NOT ported; `battle.js` keeps
  its own much simpler watcher/feature-phone guard-and-nerve shortcut,
  unchanged, now gated by the same universal reach test as every other
  attack rather than a role exception.
- **Anchor cover** (`fight_manager.gd`'s `anchor_cover_at()` — a standing
  fighter as cover, gated by a `GameState.skills_of()` perk) depends on a
  skills system this build does not have; only prop cover from each
  battle's own `cover` field is ported.
- **Persistent injuries, tempo/initiative ordering, and the full
  condition/nerve/guard numeric model** (`fight_manager.gd`'s `_roll_range`,
  `_apply_perks_to`, the tempo queue) are untouched — `battle.js` still
  uses its own simpler hp=3/guard=1-3 model from before this version.
- **`?rows=&lanes=` live board-size overrides** (`board.gd`'s own debug
  query) are not plumbed through `web/` — `grid.js`'s `ROWS`/`LANES` are
  the canon default only.

### Port
- **vectors:** `sync@2` — five rows, all cross-checked against the new
  equipment-driven reach and the real board; `advanced-past-own-band-
  still-counts-as-front` is new.
- **data:** unchanged — `content.equipment`'s `hold`/`reach_pattern`/
  `unlock` fields are read directly, same as `equipment_rules.gd` reads
  them.
- **rules:** THIS is the port, running Godot -> web for the first time
  under the 2026-08-28 addendum (`DESIGN_AUTHORITY.md`) — `board.gd`,
  the grid half of `battle_builder.gd`, and `equipment_rules.gd` are now
  canonical on the Godot side and mirrored here; sync fire (`sync@2`)
  remains web-designed-first per PORTING.md §3.2 and is unaffected by
  which side owns the board under it.
- **meshes:** none new.
- **presentation:** `render3d.js`'s `worldFor()` and `app.js`'s
  `cellPosition()` both moved to the new board; no art or camera pass.
- **status:** the grid/reach/cover/deployment slice landed. MARK, anchor
  cover, persistent injuries, tempo/initiative, and the map/economy gaps
  named in the 2026-08-28 audit remain open — see `QUEUE.md`.

## v4.14 — 2026-08-28

**The first slice of 3D parity: real `.glb` cast rendering live in the
browser.** `DESIGN_AUTHORITY.md`'s addendum this same day — "that ruling
only starts AFTER js has feature and asset parity with Godot" — named this
as the single biggest gap: `web/` rendered battles as flat DOM images;
Godot's `battle_stage_3d.gd` renders the real registered meshes.

- **`web/vendor/`** gains a local Three.js r167 (`three.module.min.js` +
  `jsm/loaders/GLTFLoader.js` + its `BufferGeometryUtils.js` dependency),
  copied from the same MIT-licensed vendored copy this repo's sibling
  projects already use (`eeri/vendor/`) rather than a CDN — no new build
  step, matching this project's own "no new dependencies without asking"
  rule; flagged rather than silently added.
- **`web/js/v3/render3d.js`** loads and positions the SAME registered
  assets every other screen resolves through `assetUrl()` — `art/v3/
  manifest.json`'s `cast3d-<role>-v01` ids, one id convention shared with
  Godot's `UNIT_BY_ROLE`, not a second path table. Deliberately NOT
  cached/cloned per unit: Three.js's default `Object3D.clone()` does not
  correctly share a `SkinnedMesh`'s bone bindings, so two units of the same
  role would move together if the same loaded template were reused. A
  fresh load per unit is correct at this battle's scale (≤6 bodies);
  `SkeletonUtils.clone()` is the real fix once animation makes sharing
  worth it.
- **Additive, verified by screenshot, not by "no console errors."** The
  existing flat 2D unit sprites stay in the DOM underneath the 3D canvas
  and only hide (`.stage3d-ready`, CSS) once EVERY unit's mesh has actually
  loaded — a partial failure (one 404) leaves the 2D fallback showing for
  the whole battle rather than mixing a rendered body with a blank one. A
  browser with no WebGL, or a network that drops a mesh, still gets the
  complete screen it always had.
- **A real bug caught before it shipped**: the first cut only vendored
  `three.module.min.js` and `GLTFLoader.js`; GLTFLoader's own static import
  of `BufferGeometryUtils.js` 404'd, which — because it's a module-graph
  failure, not a runtime one — broke the ENTIRE app's boot, not just the 3D
  feature. Found by an actual Playwright capture (headless Chromium +
  `--use-gl=swiftshader`) timing out on the app's own boot check, not by
  reading the diff.
- **`WebGLRenderer` is disposed and recreated on every render**, not
  reused: `root.innerHTML = view()` destroys the `<canvas>` on every single
  battle-mode re-render (any action), so a renderer that does not release
  its old context leaks one per click — browsers cap live WebGL contexts
  (commonly 8–16), so a battle would go dark a few actions in without this.

**Not attempted here, and this is one slice of a much larger gap, not the
whole of it:**

- **No animation.** `cast3d/clips/*` (idle/attack/behit/dead) is not wired;
  every model renders in its bind pose.
- **The stage itself is still the flat 2D scene image**, not the registered
  `stage3d/*.glb` arenas — the 3D canvas currently only replaces the CAST,
  sitting over the same background this build already had.
- **No `ART_BIBLE` §13.2 stylisation** (the posterize/CRT treatment the
  presenter gets) — this is a plain lit render, unstylised on purpose, to
  prove the pipeline before spending effort on a look.
- **Camera, lighting and ground plane are first-honest-look numbers**, not
  measured — `PHASING.md` standing rule 4 (an art change ends in a picture)
  applies to whatever comes next here too.
- **No mobile/perf budget check.** `JS_BUILD_CATCHUP.md` §4 already found a
  Pixel 10 black-screens on Godot's own web export under an uncompressed
  182 MB texture load; this build now carries the same textured meshes and
  has not been measured on a real device at all.

### Port
- **vectors:** unchanged.
- **data:** unchanged.
- **meshes:** none new — uses the meshes already registered.
- **presentation:** `web/`-only; this is closing a `web/` gap against
  Godot, not something for Godot to re-port.
- **status:** first slice landed. Animation, the 3D stage background, and
  the art pass are open — see `QUEUE.md`.

## v4.13 — 2026-08-28

**Sync fire reconciled to the correct build.** v4.11 designed and shipped it
directly in `fight_manager.gd` — backwards, per `DESIGN_AUTHORITY.md`'s
2026-08-25 ruling (reaffirmed 2026-08-28, the same day): `web/` is the
primary build, new rules are designed there first, and Godot reproduces
them. `DESIGN_AUTHORITY.md` went unread this session despite being #2 in
`CLAUDE.md` rule 5's authority order — the actual failure, not the mechanic
itself, which was already correct.

- **`web/js/v3/battle.js`** gains `syncAlliesFor()`/`triggerSyncFire()`,
  wired into `playerAttack()` and `enemyPhase()` (symmetric, same as the
  Godot side): every OTHER active ally on the attacking side who can also
  reach the target via the same `attackableInBattle()` reach test fires
  free, one hop only, and a target downed mid-chain stops the rest of the
  chain.
- **`port/vectors/sync.json`** (`rev 1`) — five hand-placed formations
  proving the rule: an adjacent-lane front-row ally syncs, a same-lane
  non-front-row ordinary role does not, two lanes out is past reach, no
  ally in reach syncs nobody, and `watcher`/`fixer` roles reach by lane
  alone regardless of row (their own pre-existing special case in
  `attackable()`, which very nearly produced a wrong scenario name before
  the actual rule was traced through).
- **Honestly scoped, not silently overclaimed**: this is NOT a literal
  cross-build vector replay the way `stance.json`/`chrome.json` are. Those
  two work because `stance_weight()` is a pure lookup table with no board
  geometry in it at all. Sync fire inherently depends on board shape, and
  the two builds do not share one — `web/` is 3 lanes, mirrored
  front/middle/back per side; Godot is 6 lanes on one unified depth axis
  (`COMBAT.md` §3.05). Inventing a coordinate translation between them is a
  real job and not this reconciliation's. `port/vectors/sync.json` pins
  this build's own rule objectively; Godot's existing implementation
  already satisfies the same rule description (`COMBAT.md` §9.13,
  corrected in place rather than rewritten) and needed no code change here.
- **A pre-existing gap, found while in this exact code, not fixed here**:
  `port/vectors/market.json`, `missions.json` and `people.json` have existed
  since before this session and nothing on the Godot side actually reads
  any of them — there is no GDScript test consuming `port/vectors/*.json`
  at all except the two reversed-direction dumps (`stance-dump.gd`,
  `chrome-dump.gd`). The "Godot reproduces the vectors" half of `PORTING.md`
  §4 is unbuilt for every model, not just this one. `QUEUE.md`.

### Port
- **vectors:** `sync@1` — new. `market`/`missions`/`people` unchanged.
- **data:** unchanged.
- **meshes:** none.
- **presentation:** none — `battle.js`'s change is rules, not layout.
- **status:** landed on the `web/` side, which is now canonical. Godot's
  `fight_manager.gd` needs no change — its existing v4.11 implementation
  already satisfies the rule vectored here — but is retroactively
  reclassified as the port rather than the origin.

## v4.12 — 2026-08-28

**The sync-fire purple-tile overlay** — v4.11's first recorded follow-up,
closed the same day. Every cell a valid attack target occupies now paints
on the board BEFORE the target is committed, not just named in the
after-the-fact flash and the text forecast: green when picking it would
chain an ally in, dim red when it would not. One question
(`_would_sync(source_id, target_id)`) answers the tile fill, the tile
outline, the standee ring, AND the forecast line — it just asks
`get_command_forecast()`, the same function the mechanic itself resolves
through, so nothing here can show the player a promise the actual attack
would break.

Caught in review before it shipped: the first cut asked the sync question
for `_hovered_target` unconditionally, but `_hovered_target` is also set
while targeting MARK (COMBAT.md §9.11's Spotter verb) — MARK has no sync
question to answer, and would have tinted its target ring by asking a
hypothetical ATTACK's sync eligibility instead. Gated on
`Command.Type.ATTACK` specifically in both places it appears.

**Not verified by eye.** `capture_battle.gd` hung on every attempt this
session, in this sandbox specifically — the same failure the portrait
console reflow hit earlier, and not something either change caused (a
capture with zero code changes hung identically). Shipped on code review
plus the passing gates rather than a render; `QUEUE.md` names it as worth an
actual look once a capture succeeds again.

### Port
- **vectors:** unchanged.
- **data:** unchanged.
- **meshes:** none.
- **presentation:** Godot-only board painting; no `web/` counterpart (sync
  fire itself isn't ported there yet — see v4.11's Port block).
- **status:** landed, Godot-only.

## v4.11 — 2026-08-28

**Sync fire** (COMBAT.md §9.13) — the one Metal Slug Tactics mechanic
`PHASING.md`'s reference table credited MST for but never actually took. Any
attack that lands now pulls in every ally who could also reach the target:
they fire their held weapon too, for free, using the SAME reach test
(`_get_attack_targets()`) a normal attack already uses, so there is no second
targeting model to keep in sync with the first.

- **`FightManager._resolve_attack()`** now calls `_trigger_sync_attacks()`
  after a hit lands. The harm/nerve roll-and-apply core was pulled out into
  `_apply_attack_harm()`, shared by a normal hit and a sync hit so the two
  can never drift apart. `_sync_allies_for()` is the one function that
  decides who's in range — called both by the trigger (after the fact) and
  by `get_command_forecast()` (before commitment), so the forecast IS the
  list sync will actually use, not a second guess at it.
- **One hop, not a cascade**: a sync shot can down a target, absorb guard,
  earn Glory — but never triggers a second wave of sync off its own hit.
- **A downed target stops the chain mid-resolution**, not just before it —
  proved with a three-ally setup where the SECOND sync shot is what actually
  downs the target (this game's roster takes two condition-zero hits to go
  down, so the first hit alone never does) and the third ally is skipped.
  Verified failing first: temporarily disabling the trigger call failed all
  four of the mechanic's new assertions with the exact wrong numbers, then
  passed clean again restored.
- **Symmetric**, like cover and reach already are — an ally for sync purposes
  is `other.side == attacker.side`, nothing softer, so the opposition earns
  it the same way the player does.
- Surfaced in play as a flash over the syncing ally (`battle.sync` — SYNC /
  SYNKRONI / 連携, same pattern Glory's flash already uses) and, before
  commitment, as a forecast line next to harm and risk.
- **Not built**: MST's Desync (tough enemies immune to further sync after
  the first hit each round) — this content has no "tough" flag yet, and
  inventing one to gate a brand-new mechanic in the same pass is exactly the
  unrequested infrastructure `CLAUDE.md` rule 1 exists to stop. Also not
  built: the purple-tile range overlay showing sync BEFORE you pick a
  target, not just confirming it after — real UI work on top of a forecast
  field that already carries the data. Both recorded in `QUEUE.md`.

271 of `test_battle`'s checks pass (was 260); the other five gates
(`test_battle_ui`, `test_shell`, `test_spine`, `test_locale`,
`test_playthrough`) plus `map/validate-map.mjs`, `content/validate-slice.mjs`
and `tools/sync-data.mjs --check` all still pass.

### Port
- **vectors:** unchanged.
- **data:** unchanged.
- **meshes:** none.
- **presentation:** none — the flash/forecast additions are Godot-only UI.
- **status:** landed, Godot-only. `web/`'s battle system has no sync
  equivalent yet; not ported here, and not silently assumed away — `web/`'s
  own combat model would need its own pass to decide whether and how it
  applies (`PORTING.md` §3.3's chrome/stance exception is the precedent for
  Godot-canonical systems the other build re-derives, not this).

## v4.10 — 2026-08-28

**`v3-playthrough.cjs` runs to completion again**, and found two more real
drifts in the process. `QUEUE.md`'s "found running it, not fixed here" list
named the mode-nav loop's crash as the reason AUTO-battle/news/portrait
checks never ran at all; that crash is fixed (the loop now withdraws through
`battle`'s real `go-route` button — the same one a player would use — before
continuing, and tests `encounter` last since the only real way out of it is
choosing and advancing, not something this loop should do). The whole test
runs now: 23 passed, 5 failed, up from 11 checks even reached before.

Fixing the crash uncovered two more drifts, both genuinely pre-existing and
unrelated to this fix: `battle-karhupuisto-2v2`'s test setup used two
pre-pool crew ids that crashed on `undefined.status` (`content.crew` moved
to generated `crew-slot-*` ids a while back) — fixed, trivially, by using
real current ids. The Toko scene is a different animal: `web/`'s `isToko`
check still hardcodes the retired prototype art id, and even pointing it at
the current one wouldn't help — that asset is Godot's live-3D-presenter
background plate with no Toko drawn into it, and `web/` has no compositing
system to put him there. Recorded in `QUEUE.md`, not fixed — it's a real
system gap, not a one-line id swap. The test now soft-fails that section
instead of throwing, so one content gap can't blind the gate to everything
after it again.

### Port
- **vectors:** unchanged.
- **data:** unchanged.
- **meshes:** none.
- **presentation:** none — `web/`-only test fixes, no app behavior change.
- **status:** landed. The mode-nav-loop and crew-id items in `QUEUE.md`'s
  `v3-playthrough.cjs` section are closed; the Toko compositing gap is
  intentionally left open there.

## v4.9 — 2026-08-28

**The portrait battle console reflows the automation column below the verb
cards.** `QUEUE.md`'s "still worth doing, not attempted" note from v4.4's
1.3-ceiling pass, picked back up.

- **`CONSOLE_H` is a `var` now, not a `const`**, set once in `_build()` off
  the same `vp.x < vp.y` test `_text_scale()` already uses. Portrait stacks
  `top_row` (crew card + verb cards) above `_auto_col`, which now spans the
  console's full width instead of a fixed 210px third; landscape reassigns
  nothing and stays the original single `HBoxContainer` row.
- **The added height was measured, not guessed once and left**: `+110` still
  clipped the stance buttons off the bottom of a real 1079×2047 capture with
  AUTO toggled on (the tallest state — three stance buttons only render in
  automation mode, and nothing before this stress-tested that state). `+300`
  confirmed generous. `+210 * _text_scale()` is the value that landed: a
  cropped capture shows verb cards, AUTOMATION / AUTO ON, the STANCE row and
  SKIP TO RESULT / WITHDRAW all present with margin to spare.
- **The stance row lays out horizontally in portrait** (`_build_auto_column()`,
  gated on the new `_console_portrait` flag) — three buttons stacked
  vertically inside the reflowed column were tall enough on their own to blow
  the height budget a second time, so the fix spends the width the reflow
  bought back instead of inflating the height estimate again. Landscape keeps
  the original vertical stack.
- **`capture_battle.gd`** gained `PIRITORI_SHOT_SIZE=phone` (1079×2047, the
  same shape v4.4 added to the browser-side capture tool but this tool never
  had) and an AUTO-ON toggle step after the existing attack-open step, so the
  tallest automation-column state is reachable by the capture tool itself.

### Port
- **vectors:** unchanged.
- **data:** unchanged.
- **meshes:** none.
- **presentation:** Godot-only layout fix; no `web/` counterpart (the v3
  battle UI's stance row is already a CSS grid, not a stacked column).
- **status:** landed. `QUEUE.md`'s "still worth doing" note for this is
  closed.

## v4.8 — 2026-08-28

**The cast3d registration gap closed as a gate, not a rewrite.** `QUEUE.md`'s
"3D units" section had one item left unresolved from v4.6's pass: models are
registered in `art/v3/manifest.json` with real ids, but `battle_stage_3d.gd`
resolves them through hardcoded `res://` paths and never reads the
registration — decorative, not load-bearing.

- **Considered and set aside**: making `UNIT_BY_ROLE` resolve through
  `ContentRegistry.art` at runtime. GDScript `const` must be a compile-time
  literal, so this meant converting to `static var` plus static
  initialization that depends on an autoload being ready — real timing
  risk to `test_battle.gd`'s 258 passing checks, for a change whose
  rendered output is identical either way (the hardcoded paths already
  matched what's registered).
- **Done instead**: `_test_battle_stage_matches_manifest()`, new in
  `test_battle.gd` — the same discipline `godot/tools/sync-data.mjs
  --check` and the `port/vectors/` files already use elsewhere in this
  repo, applied to this one spot. Asserts `UNIT_BY_ROLE`/`UNIT_VARIANTS`
  agree with the manifest's registered `mesh-3d` roles. Verified both
  directions before trusting it: passes clean, and fails precisely when a
  hardcoded path is pointed at a real, existing file the manifest does NOT
  say for that role (the actual failure mode worth catching — a plain
  file-exists check passes on a wrong-but-real file and would have missed
  it).

### Port
- **vectors:** unchanged.
- **data:** unchanged.
- **meshes:** none.
- **presentation:** none — Godot-only, a test addition. No behavior change
  on either build.
- **status:** landed. `QUEUE.md`'s "3D units" line for this is closed.

## v4.7 — 2026-08-28

**Stances land in `web/` — the first rule ported the reverse direction, and
it found a real bug in the process.** Scoped as "stances + a minimal
scorer" after the owner picked it over a smaller, less useful proof case.

- **`web/js/v3/stance.js`** ports `FightManager.stance_weight()`
  (`fight_manager.gd:1554`) line for line, verified against a Godot-dumped
  fixture (`godot/tools/stance-dump.gd` → `port/vectors/stance.json` →
  `port/stance-vectors.mjs --check`, same reversed pattern as chrome — all
  24 (stance, command-type) pairs byte-identical).
- **`battle.js`'s `autoCommand`** now scores ATTACK/GUARD/REPOSITION instead
  of always attacking when legal. ATTACK and GUARD's base formulas are
  ported faithfully from `_score_base()` (same fractions, same constants);
  the per-role `behaviour_package` multiplier layer is deliberately NOT
  ported — player crew's `behaviour_package` there is literally their
  `role`, but three of six crew roles (driver/local/muscle) don't appear in
  that match statement at all, and reconciling the two vocabularies is its
  own investigation.
- **A real bug, found by the port and fixed by the port**: the first cut
  always took the single top-scored command. A unit whose own nerve had
  dropped (from being hit) could get permanently GUARD-locked — nerve
  falling raises GUARD's score with no ceiling on ATTACK's side, so once
  GUARD overtook ATTACK it never gave it back. A 2v2 sat at round 60 with
  neither enemy having taken real damage. Fixed by porting the OTHER half
  of `_ai_select_command()` too — weighted-random selection across the top
  3 scored commands, not the flat top pick, seeded through the house
  `rand01()` (`market/model.mjs`) rather than a second hash. `web/test/
  v3-battle.mjs`'s safety-valve cap moved 12 → 60 accordingly: the old
  number was tuned to a heuristic that always attacked by construction, and
  real stance-weighted play (default HOLD_THE_LINE, deliberately cautious)
  takes longer to resolve, not never.
- **A stance picker landed in the battle screen** — three buttons in the
  active-unit panel, wired to `selectStance()`, labelled with Godot's own
  `battle.stance_*` strings so the vocabulary matches across both builds.
  Was previously unreachable in the model with no UI at all.
- **Two unrelated, pre-existing bugs fixed along the way**, found only
  because verifying this needed the browser gate to actually run:
  `web/tools/check-project.mjs` pointed at a repo shape
  (`piritori/`/`flow-core/` as siblings) that was never built — fixed to
  the shape that shipped, and the "999 lines" a stale note already claimed
  turned out to be exactly right once mapped correctly. `web/test/
  v3-playthrough.cjs` had been dead since the 2026-08-25 `web/` promotion
  (still navigated to `/piritori/`) AND was missing `.mjs` in its MIME map,
  which would have silently broken on the very import this port needed —
  a browser refuses to execute a module served as
  `application/octet-stream`, with no error a Node-only test could ever
  have caught.

### Port
- **vectors:** new — `stance@1`, reverse direction (Godot canonical). See
  `PORTING.md` §4 for the general vector discipline; this is the first
  reverse one after chrome's.
- **data:** unchanged
- **meshes:** none
- **presentation:** the stance picker's placement/labels are `web/`'s own;
  Godot's own stance UI (`app_shell.gd` `_auto_col`) is untouched and was
  the reference the labels were read from, not rewritten to match.
- **status:** landed on `web/`. Nothing for Godot to do — it already had
  this; the port caught up to it. If `fight_manager.gd`'s
  `stance_weight()` ever changes, re-run `godot/tools/stance-dump.gd` and
  re-commit the fixture.

## v4.6 — 2026-08-28

**Every 3D battle stage was always the Kallio backyard fallback — found from
owner feedback, not a report.** Owner, looking at a battle capture: *"the 3d
level looks bad an is pointing the wrong way... characters look like they
are weird."* Chasing that down (not assuming it was a taste question) found
a real ordering bug: `formation_battle.gd`'s `_build()` mounts `_stage3d`
from `_ready()`, which fires the instant the scene enters the tree —
**before `begin()` has ever run `_load_stage()`**, so `scene_asset_id` was
always still `""` at the moment `battle_stage_3d.gd` picked its model in its
own `_ready()`. Nothing afterward ever told it the id had changed. Confirmed
by capturing two DIFFERENT battles (`battle-courtyard-3v3`,
`battle-kattilahalli-3v3`) and finding the render pixel-identical both
times — every fight in the game, regardless of what it names, has only ever
shown the same generic yard.

- **Fixed**: `_stage3d` construction moved out of `_build()` into a new
  `_mount_stage3d()`, called from `begin()` *after* `_load_stage(id)` sets
  the real id. Re-captured both battles: courtyard still (correctly) shows
  the fallback, since `scene-courtyard-prototype-v05` is a flat 2D webp with
  no 3D stage of its own — but kattilahalli now shows its own registered
  hall (tank/silo, rust pillars, checkered floor), genuinely different from
  the backyard for the first time.
- **A second, smaller bug found alongside it**: `_load_stage()` (the 2D
  loader, kept live for `use_3d = false`) tried to load every
  `scene_asset_id` as a `Texture2D`, including ones that are now `mesh-3d`
  assets — throwing a script error on every 3D battle
  (`res://scenes/formation_battle.gd:200`). Fixed by skipping any asset
  whose `kind` ends `-3d` before the `load()` call.
- **What the fix did NOT resolve, and the owner's complaint may still stand
  on**: the correctly-matched kattilahalli render is still rough —
  `art/v3/manifest.json`'s own note on that asset already says *"some
  textures are mirrored across opposite sides... owner's read is that
  colour and lighting hide it; not attempted here"*, and a fresh capture at
  the render's own resolution suggests they don't hide it completely. And
  **"characters look weird" has a confirmed, separate cause**, already
  named in `QUEUE.md`'s "3D cast" section and now seen directly in a
  close-crop capture: all six units share the muscle rig's fight clips
  regardless of their own proportions, so a 3v3 currently reads as six
  bodies frozen in one borrowed lunge, several of them clipping into each
  other at battle distance. Neither is a one-line fix. Brought back to the
  owner as a live question rather than picked unilaterally — this reopens
  `PHASING.md` §1.055 (2D vs 3D), which is a ruling this file does not get
  to make a second time on its own.

### Port
- **vectors:** unchanged.
- **data:** unchanged.
- **meshes:** none added; existing `stage3d`/`cast3d` assets unchanged.
- **presentation:** Godot-only — `formation_battle.gd`, `battle_stage_3d.gd`
  loading order. Nothing for `web/` to port; the 2D `web/` build never had
  this bug (no equivalent stage-fallback lookup exists there).
- **status:** landed. The two remaining issues named above are open
  questions for the owner, not follow-up work assigned to either build yet.

## v4.5 — 2026-08-28

**`web/` wears the same chrome as Godot — the actual algorithm, not a
lookalike.** Owner, asked whether `web/` should adopt `godot/ui/chrome.gd`'s
torn-carton material: *"absolutely, no doubt."* Asked whether that should be
a lighter CSS approximation instead of the same system: *"why not the
same?"* — an explicit, current instruction to port the algorithm, not the
look. `PORTING.md` §3.3 gets a named exception for it.

- **`web/js/v3/chrome.js`** is a line-for-line port of `chrome.gd`'s `_hash`,
  `_bite` and `_pixel`/`_paint` — same constants, same seed — reached through
  CSS `border-image` (`border-image-slice: 18 fill` maps to Godot's fixed
  nine-patch margin; `border-image-repeat: repeat` maps to
  `AXIS_STRETCH_MODE_TILE`). Verified byte-for-byte, not "looks close": a
  headless Godot script dumps `PiritoriChrome._paint()` pixel-for-pixel for
  all five box kinds (`panel`/`btn`/`bar`/`plate`/`plateBtn`) at their full
  64×64, and a matching pure-JS harness diffs the two. All five are
  identical, every channel, every pixel, after fixing three real porting
  bugs this same verification caught:
  1. **The hash used 32-bit JS bitwise ops** (`|0`/`Math.imul`/`>>>`) — the
     pattern `market/model.mjs` and `people/roster.mjs`'s own hashes use.
     GDScript's `int` is a true 64-bit signed integer; every value was
     silently wrong, no crash, just a different noise field. Fixed with
     `BigInt` and an explicit 64-bit two's-complement wrap.
  2. **Colour ops rounded to an 8-bit hex string after every step**
     (lighten/darken/lerp each quantised). Godot's `Color` stays in float
     0..1 space through all of that and quantises once, at final write.
     Rounding four times instead of once put pixels ±1 off. Fixed by
     rewriting the colour helpers to operate on `[r,g,b]` float triples
     throughout, one quantisation at the very end.
  3. **The final byte write ROUNDED; `Image.set_pixel` TRUNCATES** (a
     `uint8_t` cast with no `+0.5`). Fixed the same way it was found — this
     one hid behind the float-space fix above and only showed up as a
     stubborn ±1 on 5 of 8 sample pixels until the actual `Image.set_pixel`
     round-trip was isolated from the `ImageTexture`/GPU path (which is NOT
     where the drift was; that was a dead end worth recording so it isn't
     re-chased) and traced to this one cast.
- **Wired into `v3.css`**: `.paper-panel`, `.splash-card`, `.pause-card`,
  `.topbar` (`bar(false)`, torn bottom — the world's edge), `.mode-nav`
  (`bar(true)`, torn top), `.paper-button` + variants, `.choice-card` (now
  `plate_button(ACCENT_ACT)` — cream carton, torn bottom only, per
  `location_stage.gd`'s own words on why: "reads as something taken off a
  pad"). The old clip-path "cut corner" polygons are gone on every one of
  these — the baked texture already carries its own torn/broken edge, and
  layering the two read as two different worn-paper languages fighting.
  `.inspect-button` takes `ACCENT_LOOK` (violet); `.paper-button.danger`
  (WITHDRAW) takes `ACCENT_LEAVE`, not its old red, because withdrawing IS
  "leave, back out" — chrome.gd has no fourth accent for danger.
  `.primary`/`.cyan` keep their own mustard/cyan hex as the `button()`
  accent rather than collapsing into ACT, matching how Godot's own battle
  screen gives each verb its own accent color rather than reusing the
  three icon-button accents everywhere.
- Verified in a real browser (Playwright + the pre-installed Chromium), not
  just the pixel-diff harness: splash, main shell (topbar/rail/mode-nav),
  an encounter (inspect-buttons + choice-cards), and the pause menu all
  render the material correctly with no layout breakage and no console
  errors beyond an unrelated stray favicon 404.
- **Godot's UI is still WIP, so this is a port of a snapshot, not a frozen
  spec.** `chrome.gd` had already moved three times in three commits before
  this entry (worn card → carton choice cards → phone-fit sizing), and
  nothing stops a fourth. A byte-exact verification that only ever runs once
  is exactly the kind of promise this repo has already watched rot silently
  (`market@N`/`missions@N` vectors exist for the same reason). So the
  verification is now a standing gate, not a one-off scratch script:
  `port/chrome-vectors.mjs` (bare node) diffs `chrome.js`'s new exported
  `paintPixels()` against a committed fixture, `port/vectors/chrome.json`,
  generated by `godot/tools/chrome-dump.gd` (also committed). **When
  `chrome.gd` changes, re-run the `.gd` dump and re-commit the fixture** —
  the node gate only catches `chrome.js` drifting from whatever the fixture
  currently says; it cannot know the Godot side moved without a fresh dump.

### Port
- **vectors:** unchanged for market/missions/people/exposure — no rule
  moved. **New:** `chrome@1` — `port/vectors/chrome.json`, the reverse
  direction (Godot is canonical, `web/` is the port); `port/chrome-vectors.mjs
  --check` is the gate.
- **data:** unchanged
- **meshes:** none
- **presentation:** the chrome MATERIAL, which is the one presentation thing
  that did cross — see the `PORTING.md` §3.3 exception this entry adds.
  Nothing else about either build's layout, input or camera moved.
- **status:** landed on `web/`; nothing for Godot to do, it already had this.
  Godot's own UI direction is still moving, so treat this as synced-as-of-now,
  not settled — re-check `port/chrome-vectors.mjs --check` after any
  `chrome.gd` change lands.

## v4.4 — 2026-08-27

> **RETRACTION, added 2026-08-28.** This entry claimed the dock-hiding change
> "matches what the Godot battle screen already does." That was read off a
> document, not checked against a render, and `PORTING.md` §10 exists because
> of exactly this mistake. A capture taken 28 Aug shows the Godot battle screen
> still carrying its full dock, END DAY button and resource icons. Whether the
> two builds should match is still an open question (§10) — they did not match
> when this was written, and the claim is struck rather than quietly edited.

**Committed context: Location and Battle contract the shell.**

- **The planning dock hides, and the resource strip drops to time block and
  cash only**, per `UX_SPEC.md` §3.2/§3.4 — ~~matching what the Godot battle
  screen already does~~ (see the retraction above). The dock was the previous, unintended way out of a
  scene mid-way; the actual exits (`RETURN TO MAP`, `WITHDRAW`) already
  existed in the mode's own content and needed nothing new. Verified in a
  browser: the dock is gone (not disabled), no gap opens where it sat — a real
  CSS Grid row dropping out, not padding hacked to zero — and both exits still
  work, restoring the dock on return.
- **Bug found while verifying it, not caused by it:** the battle screen
  crashed (`unit.name.split` on `undefined`) because `crew-slot-*` records
  lost their authored `name` field when crew names moved to generation
  (2026-08-27, on `main`) and nothing had generated one since. Fixed at the
  content adapter — `content.js` backfills a name from `people/roster.mjs`'s
  own pools, exported as `nameFrom()`, the same FIRST/LAST lists the hiring
  pool uses rather than a third naming scheme. A THINGS TO TEST jump into a
  battle also crashed the same way on a fresh campaign, for a second reason:
  `startBattle` requires `player_deployed` crew and nobody is recruited yet.
  The jump now recruits enough to actually reach the screen.

### Port
- **vectors:** `people@1` unchanged — `nameFrom()` reuses the existing pools
  and rev tracks vector *outputs*, which this did not add any of.
- **data:** unchanged
- **meshes:** none
- **presentation:** `web/`-only (CSS + the mode-nav visibility rule). The
  Godot battle screen already contracts; nothing to port.
- **status:** handed off

## v4.3 — 2026-08-27

**Missions are beats now, not errands — and the texture budget, measured.**

- **All four authored missions carry steps.** `content/era1-slice-v1.json`:
  each mission is now `TAKE`/`MOVE`/`FIND`/`MEET`/`HOLD`/`HURT` across two
  places with alternatives at every step, per `MISSIONS.md` §3. All four
  validate cleanly and none are thin. `mission-bear-path`'s `FIND` step is the
  same act as its `battle_avoidance.choice` ("name-the-empty-van"), and its
  alternative spends the flag `mission-three-vans` can hand you — two missions
  that used to only share a flag in the effects table now share it in the beat.
  `mission-courtyard-receipts` got `HURT` rather than the predicted `LOSE`:
  its `battle_avoidance` is `null` in the data, which is the mission saying it
  has no side door, and a `LOSE` step would have quietly invented one.
  **Not yet wired into the runtime** — `web/` still only shows a mission's
  status line; there is no screen that walks a step. That is the next real
  gap, and it is a mode to build, not more content to write.
- **The texture budget, measured rather than repeated.** `PORTING.md` §9: a
  real `GLTFLoader` measured every registered GLB and image. The full
  catalogue is **234.9MB** uncompressed, worse than `JS_BUILD_CATCHUP.md`'s
  182MB because that figure predates `stage3d/`, `jaska-v01` and `equipment/`.
  But neither engine eager-loads meshes — a realistic single battle (one
  diorama, four bodies, the inset presenter) measures **36MB**, comfortably
  inside budget. The Pixel 10 black screen is still unexplained; ordinary play
  does not approach the number that reportedly broke it.
- **Branch hygiene on the Suds-Jack side:** `claude/piritori-eden-game-8ptx2o`
  had a merged PR (#305, squashed as `83934c8d`) but kept accumulating commits
  on the pre-merge base — 52 behind `main`. Restarted from fresh `main`,
  cherry-picked forward the one genuinely unmerged commit (the two Piritori
  hub cabinets), verified 166/166 hub checks, force-with-lease pushed.

### Port
- **vectors:** `missions@2` — the four missions now carry steps, which the
  vectored `fire()` cases already exercised; `market@2`, `exposure@2`,
  `people@1` unchanged.
- **data:** `content/era1-slice-v1.json` changed; run `sync-data.mjs`
- **meshes:** none
- **presentation:** none
- **status:** handed off

## v4.2 — 2026-08-27

**A pause menu with THINGS TO TEST, and the market model finally on a screen.**

- **Pause menu** (Esc or ⏸) with a **THINGS TO TEST** submenu: twelve screens
  that are hard to reach by playing, each with a jump straight to it and a note
  saying what to look for. Approving one removes it. Approval stamps the item's
  **`rev`**, not a tick — bump the rev when the screen changes and it returns
  marked CHANGED, because a look signed off six versions ago is not a look at
  this build. Godot items carry no jump and say why (§3.3: presentation is
  deliberately different, so only the port can answer them).
- **THE BOARD** in the ledger: `market/model.mjs` rendered for the first time
  since it was written. Every active anchor, priced live, with the model's own
  stated cause — and shown only to the level you have earned. A place you have
  never stood in shows nothing, which is the reason to go there. Additive: the
  authored offers still work, and are still the leads.
- Trading now leaves a **footprint**, which is what saturation prices; standing
  somewhere **marks it seen**, which is what decays.
- **Exposure** is on the ledger, reading the same `exposure()` a mission trigger
  reads, so the two can never disagree about whether you are conspicuous.
- **Bug, mine, from the `legacy/` → `web/` move:** asset URLs resolve against
  the PAGE, not the module, so they needed one more step out of `web/` than the
  JSON fetches did. I fixed the three fetches and left the three asset paths,
  and the only symptom was about forty silent 404s — every unit drew its
  fallback and nothing threw. `v3-contract` now asserts the prefix.

### Port
- **vectors:** unchanged — `market@2`, `exposure@2`, `missions@1`, `people@1`.
  The board renders the model; it does not alter it.
- **data:** unchanged
- **meshes:** none
- **presentation:** the pause menu and the board are `web/` UI. The port wants
  its own pause and its own board — and the three Godot items in THINGS TO TEST
  are the list it should work from.
- **status:** handed off

## v4.1 — 2026-08-27

**Caught up with `main`.** This branch was 74 commits behind and one thing in
v4.0 rested on a premise that had already been overturned.

- Merged `origin/main`. Conflict surface was one file — the rest of v4.0 is
  additive — but the content it brought is not small: the real-data map
  (`kallio-water/streets/railway-v1.json`, no invented geometry), generated crew
  names, the committed-context UI work, the carton chrome, and
  `JS_BUILD_CATCHUP.md`.
- **`PHASING.md` §1.055 (2026-08-22): THE GAME IS 3D.** It landed the day after
  the browser build was parked, which is why that build has none in it.
  `PORTING.md` §1 has been corrected: promoting a `getContext('2d')` build to
  primary tester is not the same as it being the shape the game is now.
- **`STAGE_SPEC.md` §6.3's brief is FULFILLED** —
  `art/v3/scenes/toko-slomo-noodles-empty-v01.webp` exists, built through four
  drafts in `art-src/scenes/`, and `bank-counter-v01.webp` was built the same
  way. Marked done rather than left standing as an ask.
- The map gained `makelansilta`: 14 anchors, 11 active. `QUEUE.md`'s
  document-versus-data question widened rather than closed.

### Port
- **vectors:** `market@2`, `exposure@2` — the new anchor changes both surfaces.
  `missions@1` and `people@1` unchanged, so nothing to re-port there.
- **data:** the map files changed; run `godot/tools/sync-data.mjs`
- **meshes:** `cast3d-jaska-v01` arrived on main
- **presentation:** main added a `COUNTER` framing to `presenter_3d.gd` on top
  of v4.0's fixes — Godot side already
- **status:** handed off

## v4.0 — 2026-08-25

**JS becomes the build; Godot becomes the port.** Owner ruling, recorded in
`DESIGN_AUTHORITY.md` and superseding 2026-08-21's "Godot is the
implementation".

- The browser build moves out of `legacy/` to **`web/`** and runs again from a
  clean checkout. Three fixes: every path to `content/`, `map/` and `art/` was
  one `../` short; `index.html` loaded the old monorepo's `hub/shell.js` with a
  hard `<script>` tag, now an optional dynamic import; and its contract gate
  had not run since the build was parked. What stayed in `legacy/` is the dead
  flow prototype, which still imports a `flow-core/` from another repository.
- **`PORTING.md`** is the working document for the new shape — what each build
  owns, what a version is, and the three kinds of thing that cross between them.
- **`port/vectors.mjs`** emits (input, expected output) rows from every model,
  so "ported" has an objective pass condition instead of a code review. 604
  rows across market, exposure, missions and people. `--check` is the gate.
- **`MISSIONS.md`** and `missions/model.mjs`: the beat, the clock and triggers
  that fire rather than fill. 34 checks.
- The market's clock is corrected to canon — Day / Evening / Night, with the
  slice's two named separately. It had invented a fourth block.
- Unparking the browser gate immediately found canon drift it had been carrying:
  13 anchors where it asserted 12, 10 active where it asserted 8, a third
  authored battle, and a courtyard scene three versions on. Recorded in
  `QUEUE.md`; not silently reconciled.

### Port
- **vectors:** `market@1`, `exposure@1`, `missions@1`, `people@1` — all new, all
  to port
- **data:** unchanged; run `godot/tools/sync-data.mjs`
- **meshes:** none this version
- **presentation:** `presenter_3d.gd` gained `own_world_3d`, derived LOCATION and
  INSET framing, and a `transparent` mode — Godot-side already, no port needed
- **status:** handed off

## v3.1 source pack — 2026-08-21

- Promotes the corrected Toko Slomo screen to the active v02 source and runtime
  derivative. The eye openings now sit inside the white mask arches while a
  visible white rim remains.
- Adds a self-contained `START_HERE.md`, one-command project checks and a local
  no-build file server so a new contributor can run the slice from a clean
  checkout without reconstructing the handoff from chat history.
- Keeps v01 for provenance; only v02 is registered by the active runtime-art
  manifest.

## v3 alpha — 2026-08-20

**The approved design becomes one playable, saved campaign state.**

- **Five modes, one state.** Route, location encounter, ledger, formation
  battle and sourced news are reachable from the same responsive shell. Cash,
  old markka, debt, stock, intel, crew, wounds, relationships and decisions
  persist locally instead of resetting between prototypes.
- **The authored seven days run as data.** The runtime consumes the validated
  fourteen-block Era I package rather than inventing a second story in code.
  Refusing the first purchase or first firearm does not soft-lock progress.
- **The classic loop is the opening.** The full Kallio map appears first with
  Piritori highlighted. Buying there immediately reveals the €68 Siltasaari
  demand lead after the €45 purchase, before the first family detour. The map
  then names the growth ladder from street buyer to emerging supplier.
- **The real graph replaces the old board.** Twelve north-up public anchors,
  eight active slice anchors, attached fictional sites and twenty-two public
  edges drive the one-screen relief map. Ordinary residents and hidden loads
  visibly share route capacity.
- **Approved art enters the runtime.** Toko's flattened narrative-instance
  prototype is cropped above its baked controls and receives live copy and
  choices. Karhupuisto foliage, dog and weather remain separate layers.
  Modular heads, torsos, legs and held props assemble the battle and ledger
  cast. The courtyard remains explicitly semi-approved prototype art.
- **Formation fights are positional.** The authored 2v2 and 3v3 use mirrored
  front, middle and back rows with mostly hidden cells, reposition, brace,
  readable intent, auto-command, negotiation and withdrawal. A critical wound
  is labelled before it can become a final-settlement death.
- **The complete-run contract is recorded.** A full Aatami-to-Kalle campaign
  targets 5–10 hours, with a larger Kallio–Pasila map in its second half.
  Bigger abstract loads raise forecast robbery risk and preparation needs;
  robbing the Jade Lantern Network can accelerate profit while starting a
  persistent, character-specific vengeance chain.
- **Era I media stays period-specific.** Market work lives in a paper ledger;
  calls and SMS belong to feature phones; the markka bulletin arrives through
  a CRT television. The UI has a Finnish-label alpha toggle while the authored
  narrative copy remains transparently labelled English pending translation.

This is the first v3 **alpha**, not an Art Bible completion claim. The active
design documents and art register remain authority over the runtime.

## v2 — 2026-08-19

**The art arrives, and the money stops leaking.**

- **Rooms you stand in.** Each of the four contacts has an interior you walk
  into from the map: full-bleed art, his line spoken over the foot of the
  picture, and two or three things to do about him laid side by side. The
  portrait is CUT OUT OF THAT SAME PICTURE (`face: [cx, cy, r]` per contact)
  rather than drawn beside it — a silhouette next to finished art does not read
  as a placeholder, it reads as a broken image.
- **The appraisal.** You cannot ask the man selling you a bag whether the bag
  is real; you can pay somebody else to look. A contact you have burned takes
  the money and tells you nothing, which is its own information about them.
- **The fight has people in it.** The board drew a rounded rectangle with a
  circle on top since the fight existed. Now: a bomber jacket from behind for
  your side, a dark work coat from the front for theirs, a body on the floor
  for either, five cover props that are real objects, and a lit courtyard,
  harbour, park or yard under all of it. A man who goes down stays down on the
  ground instead of vanishing.
- **Money could be posted into a hole.** A consignment sent to a district no
  drawn line reaches took the goods, planned no trip, arrived nowhere and said
  nothing — in one tap, for as much cash as you were holding. flow-core gained
  `reaches()` and the game asks before it takes.
- **2.6 MB of art, not 16.** The generator's plates are a build directory and
  are not deployed; what ships is cut, trimmed and WebP under `piritori/art/`.

Balance, measured rather than asserted: worked properly the seven nights take
400 € to about 7,400 € against a 3,000 € debt. Played naively — buy at the
square, ship to one fixed stop — it is roughly +8 € a day against six percent
compounding, which is a loss. That gap is the game.

## v1 — 2026-08-18

The first slice on the hub. The night map over real WGS84 Kallio, drawn lines
carrying consignments at the city's own capacity, six named goods on three
tiers, the bargain (and the cut bag), rank fights with guns, nerve, terrain
cover and three exits, seven nights, and an Eden that is never a node.
