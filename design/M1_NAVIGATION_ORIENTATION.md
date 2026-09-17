# M1 — navigation orientation

M1 answers one question from the M0 audit: can the player inspect the city without the inspection itself becoming a journey?

## Player contract

- **Today’s lead** is the authored scheduled encounter and stays orange.
- **You are here** is the existing `state.selectedAnchor` access/market position and gets a separate green ring.
- **Inspecting** is a presentation-only cursor. It is cyan, is not saved, and never calls `markSeen`.
- **Show lead** returns the inspection cursor to the authored lead without moving Aatami.
- **Use area** is the explicit compatibility action for the old location/access behavior. It changes `selectedAnchor` and market observation on purpose. It spends no travel time; M2 replaces it with preview/cancel/commit travel while the unresolved D002 time boundary remains explicit.

Locked/teaser anchors can be inspected but cannot be activated. Existing encounters, visits, shops/fences and route planning remain keyed to the active area, not the inspection cursor. No geography, prices, mission rewards, combat resolver or save schema changes.

## Acceptance

Browser acceptance covers active, locked and landmark inspection with byte-equivalent campaign state; Show lead; deliberate area activation; first purchase and first sale (€160 → €115 → €183, stock 0 → 1 → 0); reload; and a Jaska return visit reached through the actual map/Use area controls. Both portrait and landscape are exercised.

## Next

M2 makes the Paper Bag Piritori → Siltasaari movement a real preview/cancel/commit journey while retaining one settlement owner and not inventing a second schedule-time cost.
