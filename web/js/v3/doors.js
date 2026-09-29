// Doors (H2 of The Long Game, owner greenlight 2026-09-29).
//
// A door is an offer on the map for a block the spine leaves free
// (`schedule[i].door`). The rules, one per line:
//   - `content/doors-v1.json` is the only place a door lives: templates, not
//     scenes. A template names who offers it, where, the risk, a briefing
//     and its choices, in the ordinary effect grammar.
//   - A door block offers 2-3 doors, rolled once from the save and kept in
//     `state.doors.offers[i]`, so a reload shows the same offers.
//   - Answer 23: fights every day, at most two. While fewer than two fights
//     have happened today, a door block offers at least one door that can
//     become a fight. A fight choice carries `fights-today<2` and a crew.
//   - A door is taken once per chapter. Taking one costs the block, as an
//     encounter does: the door becomes the block's encounter at its anchor.
//   - A LATE door closes when the block clock passes 22:00 (road minutes).
//
// Pure: no DOM, no clock. The browser and bare node share this file.
import { deterministicRoll, requirementStatus, fightsToday } from './state.js?v=8';
import { minutesThisBlock } from './road.js?v=3';

const DOORS_URL = '../../../content/doors-v1.json';

export async function loadDoors() {
  const response = await fetch(new URL(DOORS_URL, import.meta.url));
  if (!response.ok) throw new Error(`Could not load ${DOORS_URL} (${response.status})`);
  return response.json();
}

export function isDoorBlock(state, content) {
  return Boolean(content.schedule[state.scheduleIndex]?.door);
}

export const canFight = template => Boolean(template.fight);
export const encounterIdOf = (index, templateId) => `door-${index}-${templateId}`;

function takenIds(state) {
  return Object.values(state.doors?.taken ?? {}).map(t => t.template);
}

function eligible(state, data, doors, slot) {
  const taken = new Set(takenIds(state));
  return doors.templates.filter(t => !taken.has(t.id)
    && !(t.late && slot.block !== 'night')
    && (t.requires ?? []).every(req => requirementStatus(req, state, data).ok));
}

/**
 * The offers for the current door block: rolled the first time and kept.
 * Returns [] off a door block. Each offer is { template, anchor }.
 */
export function offerDoors(state, data, doors) {
  const slot = data.content.schedule[state.scheduleIndex];
  if (!slot?.door) return [];
  state.doors ??= { offers: {}, taken: {} };
  const kept = state.doors.offers[state.scheduleIndex];
  if (kept) return kept;
  const rules = doors.rules;
  const pool = eligible(state, data, doors, slot);
  const roll = label => deterministicRoll(state, `door:${label}`);
  const count = Math.min(pool.length, rules.offers_min + Math.floor(roll('count') * (rules.offers_max - rules.offers_min + 1)));
  const picked = [];
  const pick = (from, label) => {
    const rest = from.filter(t => !picked.includes(t));
    if (!rest.length) return;
    picked.push(rest[Math.floor(roll(label) * rest.length)]);
  };
  if (rules.fight_door_each_block && fightsToday(state, data.content) < rules.fights_per_day_max) {
    pick(pool.filter(canFight), 'fight');
  }
  // One of each kind before a second of any: a board of three sales is a menu, not a choice.
  for (let i = 0; picked.length < count && i < 12; i += 1) {
    const kinds = new Set(picked.map(t => t.kind));
    const fresh = pool.filter(t => !kinds.has(t.kind));
    pick(fresh.length ? fresh : pool, `pick:${i}`);
  }
  const offers = picked.map((t, i) => ({ template: t.id, anchor: t.anchors[Math.floor(roll(`anchor:${i}`) * t.anchors.length)] }));
  state.doors.offers[state.scheduleIndex] = offers;
  return offers;
}

export function templateOf(doors, id) {
  return doors.templates.find(t => t.id === id) ?? null;
}

/** Why a door cannot be taken now, or ''. */
export function doorBlocker(state, data, doors, offer, roadEvents) {
  const slot = data.content.schedule[state.scheduleIndex];
  if (!slot?.door) return 'not-a-door-block';
  if (state.doors?.taken?.[state.scheduleIndex]) return 'already-taken';
  const t = templateOf(doors, offer.template);
  if (!t) return 'unknown-door';
  const start = roadEvents?.rules?.block_start_minutes?.[slot.block] ?? 0;
  if (t.late && start + minutesThisBlock(state) > doors.rules.late_closes_at_minutes) return 'closed';
  return '';
}

/** The door as an encounter the ordinary encounter screen can play. */
export function doorEncounter(doors, index, templateId, anchor) {
  const t = templateOf(doors, templateId);
  if (!t) return null;
  return {
    id: encounterIdOf(index, t.id),
    door: t.id,
    kind: t.kind,
    from: t.from,
    title: t.title,
    anchor_override_id: anchor,
    site_id: null,
    participants: ['aatami'],
    source_status: 'fiction',
    scene_asset_id: doors.rules.scenes?.[anchor] ?? null,
    opening: t.premise,
    inspectables: t.inspectables ?? [],
    choices: t.choices,
  };
}

/** Put every taken door back into `data.encounters` (after a load). */
export function registerTaken(state, data, doors) {
  for (const [index, taken] of Object.entries(state.doors?.taken ?? {})) {
    const encounter = doorEncounter(doors, Number(index), taken.template, taken.anchor);
    if (encounter) data.encounters.set(encounter.id, encounter);
  }
}

/** Take one of this block's doors: it becomes the block's encounter. */
export function takeDoor(state, data, doors, templateId, roadEvents) {
  const offer = (state.doors?.offers?.[state.scheduleIndex] ?? []).find(o => o.template === templateId);
  if (!offer) return { ok: false, reason: 'not-offered' };
  const reason = doorBlocker(state, data, doors, offer, roadEvents);
  if (reason) return { ok: false, reason };
  const encounter = doorEncounter(doors, state.scheduleIndex, offer.template, offer.anchor);
  data.encounters.set(encounter.id, encounter);
  state.doors.taken[state.scheduleIndex] = { template: offer.template, anchor: offer.anchor, encounterId: encounter.id };
  if (!state.revealedEncounters.includes(encounter.id)) state.revealedEncounters.push(encounter.id);
  state.logs = Array.isArray(state.logs) ? state.logs : [];
  state.logs.unshift(`${templateOf(doors, offer.template).title}: taken.`);
  state.logs.length = Math.min(24, state.logs.length);
  return { ok: true, encounter, offer };
}

/** A door fight's result, in the ordinary effect grammar. */
export function doorFightEffects(doors, templateId, result) {
  const fight = templateOf(doors, templateId)?.fight;
  if (!fight) return [];
  return result === 'win' ? fight.win : fight.lose;
}
