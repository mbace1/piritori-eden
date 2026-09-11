# Act I — Kallio, 2003

Owner-directed integration, 2026-09-11. Chapter 1 uses existing authored content. The two later chapter groupings below are a proposed expansion structure, not unlocked runtime chapters or a locked final chapter count. All remain in 2003; references to Pasila foreshadow later life without beginning Era II.

## Rules shared by every chapter

Jaska, Toko Slomo and Arvo Linde are recurring scene characters. Slomo and Arvo never enter recruitment, random enemy or battle-animation pools. Jaska fights only when a specific authored encounter allows it; being threatened offscreen does not make him a combatant.

Keep the map open for trade, travel, missions and optional visits until the player commits to an authored finale. Meeting a financial threshold offers that finale; it does not resolve it or force a story visit. Do not turn all three characters into required errands before every ending.

Carry relationships, decisions, obligations, injuries, deaths and memories across chapters. NPC scenes read campaign consequences; they do not maintain a parallel economy. Public bulletins may describe the district, but Arvo is not omniscient about private player choices. Fictional reports must remain clearly separated from sourced historical facts.

## Chapter 1 — What the square is worth (existing playable content)

The week connects the first purchase and sale to people who give the money meaning. The authored Sörnäinen shipment remains an operation with its existing threshold, stake and outcomes.

| Character | Entry and return | Player decision | Visual continuity |
|---|---|---|---|
| Jaska | Day 2 studio; day 6 pressure outside his home; day 7 studio return | Existing envelope, relationship and final reckoning choices | Receipt city, family photo, envelope; later receipts and absent crew reflected only when authored |
| Slomo | Day 3 night, Vaasankatu noodle bar | Buy information, take a risky offer, eat/listen and owe a favour, or leave | Bowl, repaired radio, steam, rain, tram; mask remains part of his model |
| Arvo | Day 3 bulletin before the bank visit | Listen and use the lead; retain the existing acknowledgement/effects | CRT, restrained studio framing, script glance and dated source card |

Implemented in this local change: chapter metadata binds all five existing beats to their people and places; a read-only People and Places panel on the ledger derives ahead/current/passed/remembered state from the real schedule, choices and newsSeen. Merely viewing it cannot complete an encounter or grant a reward. Unseen outcomes stay hidden behind neutral teasers. This does not replace the existing sequential schedule with a free-roam director.

Correction after runtime inspection: the current map site and registered scene explicitly place Jaska at Scene Club near Mäkelänsilta. The older Torkkelinmäki studio plates are historical references, not the current room assignment. The two studio-visit schedule anchors now agree with that site; the separate courtyard event retains its authored location. Slomo already has an empty background, so prioritize counter occlusion and working gestures. Arvo's TV shell and restrained movement already have Godot implementations; browser visual parity needs a separate tested pass.

## Next chapter — A place in the neighbourhood (working title)

Purpose: the network grows, and earlier exchanges become relationships with boundaries. Opening availability follows the shipment's clean/messy/lost result rather than resetting everyone to strangers.

- **Jaska / studio:** an optional return reads the envelope decision and shipment losses. Proposed scene: he asks what may be included in the receipt city. Allow an honest account, withholding names or refusing the conversation. Return before the finale to see whether he accepted the material. He continues his own work; he does not become an upgrade vendor.
- **Slomo / noodle bar:** an optional conversation reads the previous information purchase, sabotage result and any favour owed. Proposed scene: help with an ordinary shop problem, pay an existing obligation where its amount is authored, or decline. Trust changes the candour of later information, not guaranteed perfect intelligence. Author the job and costs before exposing a payable button.
- **Arvo / TV:** an opening district bulletin and a pre-finale bulletin provide public context. New copy is fictional until its source ledger is written. Private sabotage stays out of the broadcast unless an authored public event has exposed it.
- **Finale connection:** Jaska reflects on the cost, Slomo provides conditional context, Arvo establishes what is publicly known. None automatically initiates a fight. Select an operation or authored mandatory confrontation only after the chapter's mission and economy content exists.

## Later Act I chapter — What stays behind (working title)

Purpose: bring the first act's family, neighbourhood and public stories together before any Era II transition.

- **Jaska / studio:** the receipt city is the recurring visual anchor. Proposed scene reads accumulated losses, previous honesty and relationship state. Offer to acknowledge people, protect private details or retreat into the business account. Keep the existing day-7 scene intact; this is a later return, not a second copy of that ending. Jaska's possible combat appearance requires a separately authored trigger and outcome.
- **Slomo / noodle bar:** a return resolves or explicitly carries outstanding favours. His willingness to speak reflects how the player treated him; the shop remains his place. A strained relationship may close an information route without blocking the whole act.
- **Arvo / TV:** the act-closing bulletin reports public consequences with the same source-status discipline. Private family resolution belongs in Jaska's scene. Broadcast framing stays recognisable across the act.
- **Finale connection:** lock in only after the player elects to proceed. Resolve the chosen finale exactly once, then allow authored aftermath conversations before recording the act result. Do not open a blank next chapter or move the year to 2025.

## Implementation order and port contract

1. Validate the Chapter 1 metadata and read-only panel against new and resumed campaigns.
2. Review/register Jaska's studio derivative; integrate existing Slomo/Arvo scene presentation and validate Pixel 10 Pro / iPad M2 framing.
3. Build optional visit availability separately from time advancement, retaining existing encounters and one-time effect protection.
4. Author the next chapter's missions, ending and persistent transition contract, then turn its proposed scenes above into real encounter records. Test ignored visits, low trust, losses and reload.
5. Repeat for the later Act I chapter only after the previous transition works.

Godot port: consume chapters[].narrative.people and the same schedule/choices/newsSeen state. Resolve beat states in this order: completed, missing schedule entry, passed, current, ahead. Display neutral teasers until completion. No new save fields or rewards are introduced. The current local JavaScript panel has not yet been ported or deployed.

## Local scene integration

The browser now composites Jaska into the existing Scene Club room, Slomo behind the noodle counter, and Arvo inside the television. All use existing registered models with procedural breathing and glances. Arm lowering derives from world-space bone directions. These are restrained idle motions, not authored hand-to-prop interaction or lip sync. No new room art was generated.

Two local optional visits now exist: Room to Work (Jaska) and After Service (Slomo). Each requires the earlier introduction and the matching selected map location, and is unavailable after the chapter is cleared, after the campaign ends or during active combat. Visits record one memory choice, have no cash/intel/relationship rewards and do not advance a story block. Leaving before choosing keeps a visit available. Reload restores an active visit. These brief conversations use the existing map's location-selection behavior; they do not establish a new travel simulation or replace its scheduled spine.

Port: optional_visits is a separate content collection. Persist activeVisit alongside existing campaign state, validate the introduction/site/chapter/battle checks on opening and choosing, and store completion through existing choices and memory flags. Return to the map without advanceSchedule or settlement. No new chapter-transition behavior is included in this milestone.

