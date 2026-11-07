// Presentation-only observations of the existing treatment effect. The state
// engine still selects the target, charges the choice and changes the wound.
import { applyEffects, choiceStatus, crewRecord } from './state.js?v=12';

export const isTreatmentChoice = choice => choice?.effects?.includes('resolve-critical-wound:one') ?? false;

export function treatmentChange(before, after, data) {
  // Observe the engine's actual change instead of duplicating its selection
  // order, filtering by roster/deployment, or choosing the most hurt person.
  const changed = Object.keys(before.crewStatus ?? {}).filter(id => before.crewStatus[id].critical && after.crewStatus?.[id]?.critical === false);
  if (changed.length !== 1) return null;
  const id = changed[0], prior = before.crewStatus[id], next = after.crewStatus[id];
  return {
    id, name: crewRecord(before, data, id)?.name || 'Crew member',
    cost: before.cash - after.cash,
    beforeStatus: prior.status, status: next.status,
    beforeCondition: prior.condition, condition: next.condition,
    maxCondition: next.maxCondition ?? prior.maxCondition ?? null,
  };
}

export function previewTreatment(state, choice, data) {
  if (!isTreatmentChoice(choice) || !choiceStatus(choice, state, data).ok) return null;
  const preview = structuredClone(state);
  applyEffects(preview, choice.effects, data, 'treatment-preview');
  return treatmentChange(state, preview, data);
}
