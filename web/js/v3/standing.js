// The families' standing (H5 of The Long Game, owner greenlight 2026-09-29;
// corners shelved by answer 27, 2026-09-30).
//
// `content/families-v1.json` holds the ladder and the two families. The
// rules, one per line:
//   - Standing is READ from `state.relationships[family]`, which choices,
//     doors and fights already move. The rung is the highest whose `min`
//     the number reaches: Friendly >= 2, Neutral >= 0, Wary -1, Insulted -2,
//     Retaliating -3, Vendetta below.
//   - Friendly: their doors are offered first. Wary or worse: their doors
//     are not offered at all.
//   - Night settles standing (called once after a night block ends):
//       Insulted    -> a restitution demand, once per fall to Insulted;
//       Retaliating -> a warning one night, the retaliation the next;
//       Vendetta    -> the retaliation every night.
//     Demands and retaliation are triggered, repeatable road events, raised
//     one at a time like the found-out cut. The police are not a family.
//
// Pure: no DOM, no clock. The browser and bare node share this file.

const FAMILIES_URL = '../../../content/families-v1.json';

export async function loadFamilies() {
  const response = await fetch(new URL(FAMILIES_URL, import.meta.url));
  if (!response.ok) throw new Error(`Could not load ${FAMILIES_URL} (${response.status})`);
  return response.json();
}

const ORDER = ['friendly', 'neutral', 'wary', 'insulted', 'retaliating', 'vendetta'];

export function rungOf(value, families) {
  return families.rungs.find(r => value >= r.min) ?? families.rungs.at(-1);
}

export function standingOf(state, families, familyId) {
  const family = families.families.find(f => f.id === familyId);
  if (!family) return null;
  const value = state.relationships?.[familyId] ?? 0;
  const rung = rungOf(value, families);
  return { family, value, rung, warned: Boolean(state.standing?.warned?.[familyId]) };
}

export function standings(state, families) {
  return families.families.map(f => standingOf(state, families, f.id));
}

const worse = (rung, than) => ORDER.indexOf(rung.id) >= ORDER.indexOf(than);

/** A door from a family that is Wary or worse is not offered. */
export function doorAllowed(state, families, template) {
  const s = families && standingOf(state, families, template.from);
  return !s || !worse(s.rung, 'wary');
}

/** A door from a Friendly family is offered first. */
export function doorFavoured(state, families, template) {
  const s = families && standingOf(state, families, template.from);
  return Boolean(s && s.rung.id === 'friendly');
}

/**
 * Settle standing after a night. Returns { raise, warnings }: at most one
 * event id to raise (the caller raises it with forceRoad), and the warnings
 * to show. Only the family whose event is raised has its bookkeeping moved,
 * so a family that could not be raised tonight tries again tomorrow.
 */
export function settleStanding(state, families) {
  state.standing ??= { warned: {}, demanded: {} };
  state.standing.warned ??= {};
  state.standing.demanded ??= {};
  const warnings = [];
  let raise = null;
  for (const family of families.families) {
    const { rung } = standingOf(state, families, family.id);
    if (!worse(rung, 'insulted')) state.standing.demanded[family.id] = false;
    if (!worse(rung, 'retaliating')) state.standing.warned[family.id] = false;
    if (rung.id === 'insulted' && !state.standing.demanded[family.id] && !raise) {
      raise = family.restitution_event;
      state.standing.demanded[family.id] = true;
    } else if (rung.id === 'retaliating') {
      if (!state.standing.warned[family.id]) {
        state.standing.warned[family.id] = true;
        warnings.push(family.warning);
      } else if (!raise) {
        raise = family.retaliation_event;
        state.standing.warned[family.id] = false;
      }
    } else if (rung.id === 'vendetta' && !raise) {
      raise = family.retaliation_event;
    }
  }
  if (warnings.length) {
    state.logs = Array.isArray(state.logs) ? state.logs : [];
    for (const w of warnings) state.logs.unshift(w);
    state.logs.length = Math.min(24, state.logs.length);
  }
  return { raise, warnings };
}
