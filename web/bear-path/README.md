# Bear Path — C.07

A playable Karhupuisto handover: inspect, talk, finish peacefully, hold the path for the authored 2v2, or leave. The same space, actors and cover carry the encounter through its outcome and remembered return. The approved park concept directs the prototype environment; see [director packet](../../design/BEAR_PATH_DIRECTOR_PACKET.md).

Serve the repository root and open `web/bear-path/`. The hub route is `https://mbace1.github.io/Suds-Jack/piritori-fighters/web/bear-path/`. The earlier isolated training fixture remains at `web/fight-module/`.

Slomo's Three Vans information is explicitly supplied as the starting brief. This crew has no fixer. Inspection is free; a committed choice costs one block, including any resulting combat. Choice and mission effects come from `content/era1-slice-v1.json`. A local replayed ledger settles once and survives reload. It neither reads nor writes campaign saves. Restart resets only this scene.

Combat supports movement, cover, attacks, bracing, negotiation after round one, withdrawal and auto rounds. Longer fights can draw the existing police response; Back off and Help your friends resolve that pause. Blue labeled police markers are temporary. Portraits use the same actual actors and renderer. Battle-start pullback and drifting leaves respect reduced motion. Graphics recovery preserves both action and story state.

## Verification

From the repository root: `node web/test/bear-path.mjs`, `node web/test/bear-path-police.mjs`, then browser tests with Playwright and an available Edge installation: `web/test/bear-path-browser.cjs` and `web/test/bear-path-transitions.cjs`. Set `BEAR_PATH_URL` for your file server. Run the police unit test before transition checks; it writes a private valid-history seed. Screenshots and detailed reports stay in `.private/bear-path/`. [verification.json](verification.json) records the bounded public results.

Four desktop-host viewport shapes pass mouse/touch UI, once-only outcomes, portrait loading, orientation, repeated real WebGL loss, final dialogue interruption and GPU-allocation checks. Separate transition checks cover police controls, corrupted preview save fallback and recovery during pullback. These do not establish physical Pixel 10 Pro/iPad M2 performance or controller hardware acceptance.

## Current limits

- Existing v05 fighters remain provisional, including temporary combat gestures. Private v06 animation GLBs are not registered or included. Named opponents use prototype casting.
- Scenery is a directed blockout with cut-leaf trees and rough props, not final concept parity.
- Bespoke package-taking AI, full campaign dispatch/casualty settlement, travel, nearby doors and interiors remain unfinished.
- The legacy training resolver is reused with canonical Bear Path configuration; no global campaign rules or content changed.

### Port

Browser only. Port the encounter command/history and canonical result contract before matching the staging. Keep standalone local progress isolated until campaign dispatch is explicitly connected and tested.
