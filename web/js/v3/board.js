/**
 * THE BOARD — the market model, read through what the player actually knows.
 *
 * `market/model.mjs` produces a live price for every anchor from the place's
 * own roles, the day, the hour, any shock, and your own footprint. It has had
 * 35 checks against it since it was written and nothing in the build has ever
 * shown it. This is the adapter that puts it on a screen.
 *
 * It is ADDITIVE. The authored `market_offers` in the slice keep working
 * exactly as they did — they are the leads somebody gives you. The board is the
 * thing you read to decide whether the lead is worth the trip, which is the
 * distinction `MARKET.md` §4 draws between a quote and a rumour.
 *
 * ── The one rule it exists to enforce ─────────────────────────────────────
 *
 * YOU DO NOT SEE PRICES YOU HAVE NOT EARNED. `MARKET.md` §5: a quote is exact
 * for the block you took it in, a range for four, a rumour for twelve, then
 * nothing. So this reads `state.seen[anchor]` — the block you were last there —
 * and hands the model that age. A place you have never stood in shows nothing
 * at all, and that empty row is the reason to go.
 *
 * The model is imported from OUTSIDE `web/`, the same way the app already
 * imports `../../content/`. A deploy of this build must therefore carry
 * `market/model.mjs` beside it; `web/test/v3-contract.mjs` asserts the import
 * so nobody discovers that by shipping a blank panel.
 */
import { offer, present, decay, exposure, INFO, GOODS } from '../../../market/model.mjs';

export { INFO, GOODS };

/** How the model's clock maps onto this build's. */
export function clockOf(state, content) {
  const slot = content.schedule[Math.min(state.scheduleIndex, content.schedule.length - 1)];
  return { day: slot?.day ?? 1, block: slot?.block ?? 'day' };
}

/**
 * One row per active anchor, in the information you have about it.
 *
 * `saturation` is your own footprint at that place — the model prices it into
 * ONE side of the book only (§7), so dumping into a small market punishes what
 * you are selling without also making it cheap to buy back.
 */
export function board(state, data, good = 'piri') {
  const content = data.content;
  const clock = clockOf(state, content);
  const now = state.scheduleIndex;
  const rows = [];

  for (const anchor of data.anchors.values()) {
    if (anchor.sliceState !== 'active') continue;
    const seenAt = state.seen?.[anchor.id];
    const visited = Number.isInteger(seenAt);
    const age = visited ? Math.max(0, now - seenAt) : Infinity;

    const truth = offer(anchor, good, clock, {
      seed: state.contentId ?? 'piritori',
      saturation: { units: state.footprint?.[anchor.id] ?? 0 },
      rapport: rapportAt(state, anchor),
    });

    // A place you have never been is NONE, not a stale rumour: `decay` floors
    // at RUMOUR only for somewhere you have actually stood (§5's `visited`).
    const level = visited ? decay(INFO.QUOTE, age, { visited: true }) : INFO.NONE;
    const shown = level === INFO.NONE
      ? { level }
      : present(truth, INFO.QUOTE, age, state.contentId ?? 'piritori', anchor.id, good,
        { visited: true });

    rows.push({
      id: anchor.id,
      label: anchor.label,
      roles: anchor.roles ?? [],
      here: state.selectedAnchor === anchor.id,
      visited,
      age: visited ? age : null,
      shown,
      truth,
    });
  }
  // Somewhere you know about, first — an unreadable row is a prompt to travel,
  // not the headline.
  rows.sort((a, b) => (a.shown.level === INFO.NONE) - (b.shown.level === INFO.NONE)
    || (a.age ?? 99) - (b.age ?? 99));
  return { clock, rows };
}

/** Rapport narrows the spread rather than moving the mid (MARKET.md §7e). */
function rapportAt(state, anchor) {
  const rels = state.relationships ?? {};
  if (anchor.id === 'vaasankatu') return Math.max(0, rels.toko ?? 0) / 3;
  if (anchor.id === 'torkkelinmaki') return Math.max(0, rels.jaska ?? 0) / 3;
  return 0;
}

/**
 * What standing here right now looks like to everybody else.
 *
 * The same `exposure()` the mission triggers read (`MISSIONS.md` §4.1), so the
 * ledger and a mission step cannot disagree about whether you are conspicuous.
 */
export function exposureHere(state, data) {
  const anchor = data.anchors.get(state.selectedAnchor);
  if (!anchor) return null;
  const { block } = clockOf(state, data.content);
  return exposure(anchor, {
    block,
    condition: state.condition ?? 'clear',
    crew: 1 + (state.recruited?.length ?? 0),
    units: state.stock?.piri ?? 0,
    armed: (state.equipment ?? []).some(item => /firearm|pistol|knife/.test(item.id)),
  });
}

/** Called when the clock moves or a place is entered: you saw it, so you know it. */
export function markSeen(state, anchorId) {
  if (!anchorId) return;
  state.seen = state.seen ?? {};
  state.seen[anchorId] = state.scheduleIndex;
}

/** Your own footprint, which is what saturation prices. */
export function addFootprint(state, anchorId, units) {
  if (!anchorId || !units) return;
  state.footprint = state.footprint ?? {};
  state.footprint[anchorId] = (state.footprint[anchorId] ?? 0) + units;
}
