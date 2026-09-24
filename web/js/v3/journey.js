// M2 — a JOURNEY is Aatami moving himself (design/CLAUDE_MAP_MISSION_NEXT_STEPS.md §2).
//
// Not a pinned delivery route: `commitRoute`/`sendOnRoute` in state.js move
// packs along shared capacity and pay at the far end. Walking the same streets
// yourself pays nothing and never touches `state.route`.
//
// The contract, one rule per line:
//   - a PREVIEW is plain data. Making one, or throwing it away, changes nothing:
//     not money, stock, time, seed, place, prices or any mission.
//   - COMMIT revalidates everything the preview assumed (same origin, same
//     block, destination still open, still connected, nothing incompatible
//     going on) and applies arrival ONCE. A stale or replayed preview is
//     refused, so a double tap cannot move you twice.
//   - arrival is an observation of the destination, and nothing else is.
//   - TIME: D002 (scenario atlas) is unresolved, so a journey costs no extra
//     block, fare or complication. The existing story clock still advances
//     after a story beat exactly as before. The UI says this plainly; it is not
//     a claim that free travel is the final design.
//
// Pure: no DOM, no clock. The browser and bare node share this file.
import { shortestPath } from './content.js?v=2';
import { markSeen } from './board.js?v=2';

export const JOURNEY_EXTRA_BLOCKS = 0;

/** Why a journey to `destinationId` cannot be planned right now, or ''. */
export function journeyBlocker(state, data, destinationId) {
  const destination = data.anchors.get(destinationId);
  if (!destination) return 'unknown';
  if (destination.sliceState !== 'active') return 'sealed';
  if (destinationId === state.selectedAnchor) return 'already-here';
  if (state.endingId) return 'campaign-over';
  if (state.battle?.status === 'active') return 'in-battle';
  if (state.mode === 'visit' || state.activeVisit) return 'in-visit';
  return '';
}

/** A proposed journey. Never mutates `state`. */
export function previewJourney(state, data, destinationId) {
  const origin = state.selectedAnchor;
  const base = { origin, destination: destinationId, scheduleIndex: state.scheduleIndex };
  const reason = journeyBlocker(state, data, destinationId);
  if (reason) return { ok: false, reason, ...base };
  const path = shortestPath(data.map, origin, destinationId);
  if (!path || path.length < 2) return { ok: false, reason: 'disconnected', ...base };
  return { ok: true, ...base, path, extraBlocks: JOURNEY_EXTRA_BLOCKS };
}

/** Arrive, once. Returns { ok, reason } — `reason` names why a preview was
 *  refused: 'no-preview', 'stale', or anything `journeyBlocker` can say. */
export function commitJourney(state, data, preview) {
  if (!preview) return { ok: false, reason: 'no-preview' };
  if (!preview.ok) return { ok: false, reason: preview.reason };
  // The board moved under the preview: somebody else already arrived
  // (a double tap), the story turned a block, or a reload changed places.
  if (preview.origin !== state.selectedAnchor || preview.scheduleIndex !== state.scheduleIndex) {
    return { ok: false, reason: 'stale' };
  }
  const fresh = previewJourney(state, data, preview.destination);
  if (!fresh.ok) return { ok: false, reason: fresh.reason };
  if (fresh.path.join('>') !== preview.path.join('>')) return { ok: false, reason: 'stale' };
  state.selectedAnchor = preview.destination;
  markSeen(state, preview.destination);
  const names = preview.path.map(id => data.anchors.get(id)?.label ?? id);
  // state.js's addLog, which is not exported: newest first, 24 kept.
  state.logs = Array.isArray(state.logs) ? state.logs : [];
  state.logs.unshift(`Aatami walks ${names.join(' → ')}.`);
  state.logs.length = Math.min(24, state.logs.length);
  return { ok: true, destination: preview.destination, path: [...preview.path] };
}
