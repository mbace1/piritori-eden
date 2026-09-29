// The Thursday Load (Act I v4.62). Owner, 2026-09-27: "Go ahead" on the
// greenlight list G1-G7 of The Thursday Load pitch (design/STORY_PITCHES.md).
//
// `content/act1-story-v1.json` holds the woven narrative: a briefing for each
// authored mission, the clues of the case, and the case that settles it.
// This module reads the save and never keeps its own state:
//   - a CLUE is found when its flag is in `state.flags`. Every clue is set by
//     an ordinary choice somewhere in the game (an encounter, a visit, a road
//     event), so the board can never claim something the player did not do.
//   - the CASE opens at its anchor once enough KEY clues are found, and is
//     answered once, like an encounter (`state.choices[case.id]`).
//   - resolving it runs the ordinary effect grammar (`applyEffects`) and does
//     not turn the block.
//
// Pure: no DOM, no clock. The browser and bare node share this file.
import { applyEffects, deterministicRoll } from './state.js?v=9';

const STORY_URL = '../../../content/act1-story-v1.json';

export async function loadStory() {
  const response = await fetch(new URL(STORY_URL, import.meta.url));
  if (!response.ok) throw new Error(`Could not load ${STORY_URL} (${response.status})`);
  return response.json();
}

export function clueFound(state, clue) {
  return (state.flags ?? []).includes(clue.flag);
}

/** Every clue with `found` set; the order is the story's. */
export function caseBoard(state, story) {
  return (story?.clues ?? []).map(clue => ({ ...clue, isFound: clueFound(state, clue) }));
}

export function keyCluesFound(state, story) {
  return caseBoard(state, story).filter(c => c.key && c.isFound).length;
}

/** Why the case cannot be opened right now, or ''. */
export function caseBlocker(state, story) {
  const c = story?.case;
  if (!c) return 'no-case';
  if (state.endingId) return 'campaign-over';
  if (state.choices?.[c.id]) return 'resolved';
  if (keyCluesFound(state, story) < (c.unlock?.key_clues ?? Infinity)) return 'not-enough';
  if (state.selectedAnchor !== c.anchor_id) return 'not-here';
  return '';
}

/** The case is known about (enough clues), wherever Aatami stands. */
export function caseKnown(state, story) {
  const c = story?.case;
  return Boolean(c) && !state.endingId && keyCluesFound(state, story) >= (c.unlock?.key_clues ?? Infinity);
}

export function resolveCase(state, data, story, choiceId) {
  const reason = caseBlocker(state, story);
  if (reason) return { ok: false, reason };
  const choice = story.case.choices.find(ch => ch.id === choiceId);
  if (!choice) return { ok: false, reason: 'unknown-choice' };
  const outcome = applyEffects(state, choice.effects, data, `${story.case.id}:${choice.id}`);
  state.choices[story.case.id] = choice.id;
  state.logs = Array.isArray(state.logs) ? state.logs : [];
  state.logs.unshift(`${story.case.title}: ${choice.label}.`);
  state.logs.length = Math.min(24, state.logs.length);
  return { ok: true, choice, messages: outcome.messages };
}

/** A mission's briefing: the woven words plus the authored steps and stakes. */
export function briefing(data, story, missionId) {
  const mission = data.missions?.get?.(missionId) ?? data.content.missions.find(m => m.id === missionId);
  const words = (story?.missions ?? []).find(m => m.id === missionId) ?? {};
  if (!mission) return null;
  return {
    id: missionId,
    title: words.title ?? missionId,
    premise: words.premise ?? '',
    plants: words.plants ?? '',
    family: mission.family,
    deadline: mission.deadline,
    steps: mission.steps ?? [],
    success: mission.success_effects ?? [],
    partial: mission.partial_effects ?? [],
    failure: mission.failure_effects ?? [],
    battleId: mission.battle_id ?? null,
    avoidable: Boolean(mission.battle_avoidance),
  };
}

/**
 * KELLO'S CUT (v4.63, owner item 2: "the cut pays weekly"). Called once when a
 * NIGHT block has just ended. While the cut runs (flag `thursday-cut`, not
 * `cut-ended`) it pays `nightly_eur`, and from the `from_payment`-th payment
 * each one risks the McCormicks finding out: a deterministic roll against
 * `chance_per_payment` x (payments - from_payment + 1). Returns
 * { paid, foundOut } and records the count in `state.cut`.
 */
export function settleCut(state, story) {
  const cut = story?.case?.cut;
  const flags = state.flags ?? [];
  if (!cut || !flags.includes('thursday-cut') || flags.includes('cut-ended')) return { paid: 0, foundOut: false };
  state.cut = state.cut ?? { payments: 0 };
  state.cut.payments += 1;
  state.cash = Math.round(((state.cash ?? 0) + cut.nightly_eur) * 100) / 100;
  state.logs = Array.isArray(state.logs) ? state.logs : [];
  state.logs.unshift(`Kello's cut, counted on the square: €${cut.nightly_eur}.`);
  state.logs.length = Math.min(24, state.logs.length);
  const n = state.cut.payments - cut.discovery.from_payment + 1;
  const foundOut = n >= 1 && deterministicRoll(state, `kello-cut:${state.cut.payments}`) < Math.min(1, cut.discovery.chance_per_payment * n);
  return { paid: cut.nightly_eur, foundOut };
}
