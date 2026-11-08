// Scene Club presentation candidate. Only this wrapper is saved; the normal
// campaign save and C.19 receipt stores are never opened by this module.
import { createState, chooseEncounter, advanceSchedule } from '../../../web/js/v3/state.js?v=14';

export const CANDIDATE_SAVE_KEY = 'piritori:restart:scene-club:v1';
export const SCENE_ENCOUNTER_ID = 'enc-jaska-receipt';
const VERSION = 1;
const SCENE_INDEX = 2;
const ANCHOR = 'makelansilta';
const copy = value => structuredClone(value);
const defaultStorage = () => {
  try { return globalThis.localStorage; } catch { return null; }
};

function scene(data) {
  const encounter = data.encounters?.get(SCENE_ENCOUNTER_ID)
    ?? data.content.encounters.find(item => item.id === SCENE_ENCOUNTER_ID);
  const slot = data.content.schedule[SCENE_INDEX];
  if (!encounter || slot?.encounter_id !== encounter.id || slot.anchor_id !== ANCHOR
    || !data.map.anchors.some(anchor => anchor.id === ANCHOR)) {
    throw new Error('Scene Club candidate does not match the loaded campaign and map.');
  }
  return encounter;
}

function newCandidate(data) {
  scene(data);
  const state = createState(data.content);
  // A standalone entry checkpoint, not an invented playthrough of days 1–2.
  // No earlier choices, travel charges, recruited crew or outcomes are added.
  state.scheduleIndex = SCENE_INDEX;
  state.selectedAnchor = ANCHOR;
  state.mode = 'encounter';
  return { version: VERSION, state, phase: 'scene', lastReceipt: null };
}

export function persistCandidate(candidate, storage = defaultStorage()) {
  try {
    if (!storage) return false;
    storage.setItem(CANDIDATE_SAVE_KEY, JSON.stringify(candidate));
    return true;
  } catch { return false; }
}

export function restartCandidate(data, storage = defaultStorage()) {
  const candidate = newCandidate(data);
  persistCandidate(candidate, storage);
  return candidate;
}

function validSaved(candidate, data) {
  if (candidate?.version !== VERSION || candidate.state?.version !== 3
    || candidate.state.contentId !== data.content.id || candidate.state.selectedAnchor !== ANCHOR) return false;
  const { state, phase, lastReceipt } = candidate;
  // A valid JSON header alone is not a usable engine state. Reject truncated
  // candidate saves instead of importing them into the playable scene.
  if (Object.entries(createState(data.content)).some(([key, initial]) => {
    const value = state[key];
    if (initial === null) return !(key in state);
    if (Array.isArray(initial)) return !Array.isArray(value);
    if (typeof initial === 'object') return !value || typeof value !== 'object' || Array.isArray(value);
    return typeof value !== typeof initial || (typeof value === 'number' && !Number.isFinite(value));
  })) return false;
  const choiceId = state.choices?.[SCENE_ENCOUNTER_ID];
  if (phase === 'scene') return state.scheduleIndex === SCENE_INDEX && state.mode === 'encounter' && !choiceId && lastReceipt === null;
  if (!scene(data).choices.some(choice => choice.id === choiceId)
    || lastReceipt?.choiceId !== choiceId || lastReceipt.before?.choices?.[SCENE_ENCOUNTER_ID]
    || lastReceipt.after?.choices?.[SCENE_ENCOUNTER_ID] !== choiceId) return false;
  if (phase === 'result') return state.scheduleIndex === SCENE_INDEX && state.mode === 'encounter'
    && lastReceipt.returned === null && JSON.stringify(state) === JSON.stringify(lastReceipt.after);
  if (phase === 'map') return state.scheduleIndex === SCENE_INDEX + 1 && state.mode === 'route'
    && JSON.stringify(state) === JSON.stringify(lastReceipt.returned);
  return false;
}

export function loadCandidate(data, storage = defaultStorage()) {
  scene(data);
  try {
    const candidate = JSON.parse(storage?.getItem(CANDIDATE_SAVE_KEY) ?? 'null');
    if (validSaved(candidate, data)) return candidate;
  } catch { /* Missing, malformed or unavailable candidate storage starts here. */ }
  return restartCandidate(data, storage);
}

export function chooseCandidate(candidate, choiceId, data, storage = defaultStorage()) {
  if (candidate.phase !== 'scene' || candidate.state.choices[SCENE_ENCOUNTER_ID]) return { ok: false, reason: 'already-resolved' };
  if (candidate.state.scheduleIndex !== SCENE_INDEX || candidate.state.selectedAnchor !== ANCHOR) return { ok: false, reason: 'not-at-scene' };
  const encounter = scene(data);
  const choice = encounter.choices.find(item => item.id === choiceId);
  if (!choice) return { ok: false, reason: 'unknown-choice' };
  const before = copy(candidate.state);
  const result = chooseEncounter(candidate.state, encounter, choice, data);
  if (!result.ok) return result;
  candidate.phase = 'result';
  candidate.lastReceipt = {
    choiceId, label: choice.label, forecast: choice.forecast,
    before, after: copy(candidate.state), returned: null,
  };
  return { ...result, persisted: persistCandidate(candidate, storage) };
}

export function returnToMap(candidate, data, storage = defaultStorage()) {
  if (candidate.phase !== 'result' || candidate.state.scheduleIndex !== SCENE_INDEX
    || candidate.state.choices[SCENE_ENCOUNTER_ID] !== candidate.lastReceipt?.choiceId) {
    return { ok: false, reason: candidate.phase === 'map' ? 'already-returned' : 'choice-required' };
  }
  // The engine advances the authored day/night clock and reveals the next lead.
  // It does not teleport Aatami, charge a trip or replay the preceding night.
  const next = advanceSchedule(candidate.state, data);
  candidate.phase = 'map';
  candidate.lastReceipt.returned = copy(candidate.state);
  return { ok: true, next, persisted: persistCandidate(candidate, storage) };
}
