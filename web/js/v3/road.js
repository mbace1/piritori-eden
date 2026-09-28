// The road — what happens on the way, and on arrival (Act I v4.58).
//
// Owner, 2026-09-27 (DESIGN_AUTHORITY answers 2, 4, 6, 9, 10): travel should
// feel natural; random events can happen in transit and on arriving; about
// every third or fourth journey; a surprise, with no forecast on the journey
// preview; each costs "a bit of time"; the first ones are Aatami meeting
// dealers and doing low-end gigs, and bigger people and money come later.
//
// The rules, one per line:
//   - `content/road-events-v1.json` is the only place an event lives.
//   - Nothing fires before `first_story_block`. After that, the third journey
//     since the last event fires on a coin flip and the fourth always does,
//     so the gap is 3 or 4 journeys, never less.
//   - The roll is deterministic from the save (contentId, block, journey
//     count): a reload replays the same road, so it cannot be farmed.
//   - An event is seen once per campaign. Tier 1 opens when Aatami has
//     recruited anyone or the story is at `schedule_index>=6`.
//   - TIME: a choice costs minutes on the block's clock. D002 is still open,
//     so minutes never turn a block; the clock just reads later. Minutes
//     belong to the block they were spent in and read as zero in the next.
//   - A choice with `requires` is shown and refused, never hidden.
//   - A fight is the ordinary battle with no mission behind it, and it does
//     not turn the block (the app marks it `road`).
//
// Pure: no DOM, no clock. The browser and bare node share this file.
import { applyEffects, requirementStatus, deterministicRoll } from './state.js?v=7';

const ROAD_URL = '../../../content/road-events-v1.json';

export async function loadRoadEvents() {
  const response = await fetch(new URL(ROAD_URL, import.meta.url));
  if (!response.ok) throw new Error(`Could not load ${ROAD_URL} (${response.status})`);
  return response.json();
}

function road(state) {
  state.road ??= { journeys: 0, since: 0, seen: [], pending: null, minutes: 0, minutesBlock: -1, last: null };
  return state.road;
}

function tierOf(state, rules) {
  const recruited = (state.recruited ?? []).length;
  const clause = /recruited>=(\d+)/.exec(rules.tier_1_when ?? '');
  const index = /schedule_index>=(\d+)/.exec(rules.tier_1_when ?? '');
  const open = (clause && recruited >= Number(clause[1])) || (index && state.scheduleIndex >= Number(index[1]));
  return open ? 1 : 0;
}

/** Minutes spent in the CURRENT block (0 once the block has turned). */
export function minutesThisBlock(state) {
  const r = state.road;
  return r && r.minutesBlock === state.scheduleIndex ? r.minutes : 0;
}

/** The block's clock, "HH:MM", or '' when no time has been spent in it. */
export function clockLabel(state, slot, roadEvents) {
  const spent = minutesThisBlock(state);
  if (!spent || !slot) return '';
  const start = roadEvents?.rules?.block_start_minutes?.[slot.block] ?? 0;
  const t = (start + spent) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export function pendingRoad(state, roadEvents) {
  const id = state.road?.pending?.id;
  return id ? roadEvents.events.find(e => e.id === id) ?? null : null;
}

/** Candidates in authored order: unseen, open tier, requirements met. */
function candidates(state, data, roadEvents, phase) {
  const r = road(state);
  const tier = tierOf(state, roadEvents.rules);
  // An event with a `trigger` belongs to the story (story.js raises it); the
  // road never rolls it.
  return roadEvents.events.filter(e => !e.trigger && !r.seen.includes(e.id) && e.tier <= tier
    && (e.phase === phase || e.phase === 'any')
    && (e.requires ?? []).every(req => requirementStatus(req, state, data).ok));
}

/**
 * Called once after a journey really happened (`commitJourney` ok).
 * Returns the event that fired, or null. Mutates `state.road` only.
 */
export function rollRoad(state, data, roadEvents, journey) {
  const r = road(state);
  if (r.pending) return null; // one at a time; nothing stacks
  const rules = roadEvents.rules;
  r.journeys += 1;
  if (state.scheduleIndex < rules.first_story_block) return null;
  r.since += 1;
  if (r.since < rules.earliest_journey_gap) return null;
  const fires = r.since >= rules.guaranteed_by_gap
    || deterministicRoll(state, `road:${r.journeys}:fire`) < rules.chance_at_earliest;
  if (!fires) return null;
  const first = deterministicRoll(state, `road:${r.journeys}:phase`) < 0.5 ? 'transit' : 'arrival';
  const second = first === 'transit' ? 'arrival' : 'transit';
  let pool = candidates(state, data, roadEvents, first);
  let phase = first;
  if (!pool.length) { pool = candidates(state, data, roadEvents, second); phase = second; }
  if (!pool.length) return null; // the road has told everything it knows
  // Higher tiers first once they open: the story moves up, not sideways.
  const top = Math.max(...pool.map(e => e.tier));
  const tierPool = pool.filter(e => e.tier === top);
  const pick = tierPool[Math.floor(deterministicRoll(state, `road:${r.journeys}:pick`) * tierPool.length)];
  r.since = 0;
  r.pending = { id: pick.id, phase: pick.phase === 'any' ? phase : pick.phase,
    from: journey?.path?.[0] ?? null, to: journey?.destination ?? state.selectedAnchor };
  return pick;
}

export function choiceOpen(choice, state, data) {
  const checks = (choice.requires ?? []).map(req => requirementStatus(req, state, data));
  return { ok: checks.every(c => c.ok), reasons: checks.filter(c => !c.ok).map(c => c.reason) };
}

/** Resolve the pending event with one of its choices. */
export function resolveRoad(state, data, roadEvents, choiceId) {
  const r = road(state);
  const event = pendingRoad(state, roadEvents);
  if (!event) return { ok: false, reason: 'no-event' };
  const choice = event.choices.find(c => c.id === choiceId);
  if (!choice) return { ok: false, reason: 'unknown-choice' };
  const open = choiceOpen(choice, state, data);
  if (!open.ok) return { ok: false, reason: open.reasons.join(', ') };
  const outcome = applyEffects(state, choice.effects, data, `road:${event.id}:${choice.id}`);
  if (r.minutesBlock !== state.scheduleIndex) { r.minutes = 0; r.minutesBlock = state.scheduleIndex; }
  r.minutes += choice.minutes ?? 0;
  r.seen.push(event.id);
  r.last = { id: event.id, choice: choice.id, minutes: choice.minutes ?? 0, startBattle: outcome.startBattle ?? null,
    phase: r.pending.phase, from: r.pending.from ?? null, to: r.pending.to ?? null };
  r.pending = null;
  state.logs = Array.isArray(state.logs) ? state.logs : [];
  state.logs.unshift(`${event.title}: ${choice.label}.`);
  state.logs.length = Math.min(24, state.logs.length);
  return { ok: true, event, choice, startBattle: outcome.startBattle ?? null };
}

/** Raise a story-triggered event now (story.js), unless one is already waiting. */
export function forceRoad(state, roadEvents, eventId, anchorId) {
  const r = road(state);
  if (r.pending) return false;
  const event = roadEvents.events.find(e => e.id === eventId);
  if (!event || r.seen.includes(eventId)) return false;
  r.pending = { id: eventId, phase: event.phase === 'any' ? 'arrival' : event.phase, from: null, to: anchorId ?? state.selectedAnchor };
  return true;
}
