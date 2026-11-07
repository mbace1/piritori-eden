# Courtyard site contract — source alignment, 7 November 2026

`enc-courtyard-last-call` now uses `torkkelinmaki_courtyard`, a neutral fictional anchor-only site at the already-authored Torkkelinmäki anchor. There was no appropriate existing courtyard site: the encounter had reused `jaska_studio`, while its schedule, explicit anchor override, mission destination and battle already pointed to Torkkelinmäki.

This identifies an existing scene rather than adding a location, quest, address, service, entrance or map connection. The map retains its 15 anchors/25 edges/11 active anchors; its site records go from 13 to 14. The new record has no coordinate or private address. Availability still comes from the existing schedule/mission, not from a new door rule.

Scene Club remains `jaska_studio` at `makelansilta`. Jaska's two authored room encounters and optional visit remain there, and the courtyard's participant remains `jaska-offscreen`. The courtyard's choices/effects, mission/battle ID and anchor, C.19 job/kit/cast, save/receipt rules and art-binding status are unchanged. No scene image was added or promoted.

## What changes in the browser

The encounter's generic scene now carries `data-site="torkkelinmaki_courtyard"`. The old ID had selected the existing Scene Club-specific brown fallback palette in `web/v3.css`; the corrected site uses the existing neutral generic fallback. No CSS or asset file changes. The visible Torkkelinmäki heading already came from its correct explicit anchor override and remains unchanged.

Actual same-fixture before/after captures at 390×844 and 1280×800 are in `design/evidence/courtyard-site-contract/`. The comparison records the distinct site/anchor/CSS background and matching opening/choice text. These are the existing generic placeholders, not accepted courtyard art or physical-device evidence.

## Old saves and C.19

No migration is required or added. Campaign saves identify the current encounter by schedule/encounter IDs and read its current content after reload. The canonical physical site is not a stored campaign field. Choices retain their IDs, so already-resolved choices do not replay.

The existing mission outing record stores its encounter, mission, battle, anchor, kit, fighters and receipt identity; it does not read this canonical `site_id`. Tests compare records produced from the old and corrected encounter and require identical outings/URLs. Open and settled old outing snapshots restore unchanged. Night Shift's unrelated `config.site` values (`north`/`east`) are tactical configuration, not a physical canonical site and must not be migrated.

`web/test/courtyard-site.mjs` also verifies unresolved/resolved old save continuity, unchanged peaceful effects, duplicate refusal, Scene Club visit separation and the atlas alignment. The test is wired into the existing campaign-state CI job. Content validation now requires each scheduled encounter's physical site anchor to agree with its story lead and explicit override, so an override cannot conceal this mismatch again.

## Atlas scope

D005 moves from open conflict to `resolved-source-alignment` in the canonical scenario atlas. The courtyard site/spatial description is updated and a scoped source hash records this correction. That does not approve art, certify physical-door integration or regenerate other historical atlas records; the atlas's original full-snapshot `content_sha256` is deliberately retained with a scoped note.

Review-generated binding/source snapshots are not changed in this source branch. They need a separate reconciliation against the new content/map hashes and corrected conflict status; stale conflict expectations in those review tests are not new runtime defects.

## Validation

Local results on this source branch:

- All **36 bare-node suites** under `web/test/*.mjs` pass, including the new **23-check** source/save contract test.
- Existing map, transit-layer and content validators pass.
- Existing mission browser test passes **38/38** at phone and desktop. It verifies the actual site DOM, Jaska's offscreen status, unresolved reload and unchanged mission handoff. Its Night Shift destination is stubbed, so this is not a claim of playing/rendering the complete 3D fight.
- Existing `web/test/c19-outing.mjs` passes the real content/engine/settlement checks; no combat rule changed.
- Actual matched base/fixed browser captures pass with matching authored opening/choices, correct site identity and the existing fallback palette change only. No game page/resource errors were recorded; the local hub shell 404 is explicitly excluded by the fixture.
- Syntax and standard `git diff --check` pass. Physical Pixel/iPad acceptance, public deployment and branch CI remain separate/pending.

Reproduce the focused contract and mission browser checks:

```
node map/validate-map.mjs
node map/tools/build-transit-layer.mjs --check
node content/validate-slice.mjs
node web/test/courtyard-site.mjs
node web/test/c19-outing.mjs
node web/test/mission-browser.cjs
```

For aligned before/after capture, pass an unchanged base worktree:

```
node design/evidence/courtyard-site-contract/capture.cjs /path/to/unchanged-base-worktree
```

The capture uses fresh isolated browser contexts and source files from both worktrees. The authoritative facts are `content/era1-slice-v1.json`, `map/kallio-era1-2003-v1.json`, the scenario atlas, GDD's site/anchor contract and `ACT_I_NARRATIVE.md`'s separate Scene Club/courtyard ruling. `ROADMAP.md` remains the plan of record; its completion estimate stays 48%. No merge or release is claimed.
