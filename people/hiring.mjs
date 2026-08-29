/**
 * The hiring pool — a battle-ready wrapper around `people/roster.mjs`'s
 * `hireling()`, ported from `godot/scripts/crew_generator.gd`.
 *
 * Two generators exist in this codebase and neither alone can drive a
 * hire: `crew_generator.gd` rolls a battle-deployable person (one of the
 * six art-backed roles, condition/nerve/tempo, a wage, real portrait/
 * torso/legs ids) but names them with a flat, un-paired pool and no
 * traits worth reading; `roster.mjs`'s `hireling()` rolls a genuinely
 * interesting person (paired first/family names from ONE origin, real
 * traits, a career stage) but has no wage, no combat stats, and no art
 * ids — its twelve APTITUDES are a broader, separate vocabulary from the
 * six crew roles the 2D/3D art actually has bodies for.
 *
 * `hireCandidate()` combines them: `hireling()` for the name and the
 * flavour, a role and battle stats rolled the same way
 * `CrewGenerator.generate()` does (same tables, same spread, same
 * origin-paired-name discipline `_name_from()` documents — DESIGN_LOCKS
 * §9.2: no name touches any aptitude, trait or stat, so the role roll and
 * the name roll are two separate draws here too), seeded through this
 * codebase's one hash convention (`market/model.mjs`'s `rand01`) rather
 * than Godot's own `RandomNumberGenerator` — `PORTING.md` §4: rules travel
 * as (input, output) pairs and a fixed data shape, not as an RNG
 * implementation neither build needs to share bit-for-bit.
 */
import { hireling } from './roster.mjs';
import { rand01 } from '../market/model.mjs';

/** CrewGenerator.ROLES — the six the art has bodies for, plus the
 *  cheap generic "hired" body (`cast3d-hired-v01`, `render3d.js`'s own
 *  fallback for any player-side role it does not recognise — already
 *  correct for this role with no change needed there). */
export const ROLES = ['driver', 'fixer', 'local', 'muscle', 'runner', 'watcher', 'hired'];

/** CrewGenerator.ROLE_BASE — read off the authored six, not invented. */
const ROLE_BASE = {
  driver: { condition: 8, nerve: 6, tempo: 5, wage: 22 },
  fixer: { condition: 7, nerve: 7, tempo: 6, wage: 26 },
  local: { condition: 8, nerve: 8, tempo: 6, wage: 24 },
  muscle: { condition: 10, nerve: 7, tempo: 4, wage: 30 },
  runner: { condition: 8, nerve: 6, tempo: 8, wage: 18 },
  watcher: { condition: 7, nerve: 8, tempo: 7, wage: 20 },
  // Cheap and blunt: the worst nerve in the cast and the lowest wage —
  // what you are buying is a body in a lane and both of you know it.
  hired: { condition: 9, nerve: 5, tempo: 5, wage: 14 },
};

const ROLE_COMPETENCIES = {
  driver: ['route-reliability', 'extraction'],
  fixer: ['negotiation', 'control'],
  local: ['local-access', 'faction-memory'],
  muscle: ['cover', 'improvised-support'],
  runner: ['delivery', 'withdrawal'],
  watcher: ['marking', 'intent-reading'],
  hired: ['cover', 'control'],
};

/** CrewGenerator.PORTRAITS — only six heads are drawn; a generated person
 *  wears a face somebody else is already wearing. A known placeholder,
 *  not a claim that six is enough (`QUEUE.md`). */
const PORTRAITS = [
  'head-kallio-01-v03', 'head-kallio-03-v03', 'head-kallio-05-v03',
  'head-kallio-07-v03', 'head-kallio-09-v03', 'head-kallio-11-v03',
];

/** CrewGenerator.SPREAD — kept narrow on purpose: churn is supposed to
 *  cost you continuity, not hand you a lottery ticket that beats every
 *  authored crew member. */
const SPREAD = 1;

function pick(arr, ...seed) {
  return arr[Math.floor(rand01(...seed) * arr.length) % arr.length];
}
function spread(base, ...seed) {
  return Math.max(1, base + (Math.floor(rand01(...seed) * (SPREAD * 2 + 1)) - SPREAD));
}

/**
 * One battle-ready candidate. `seed` is the campaign seed, `i` the
 * candidate's stable index within the day's pool — same pair always
 * produces the same person, which is what lets a pool be regenerated on
 * demand instead of stored (walking away and back must not reroll it).
 */
export function hireCandidate(seed, i) {
  const person = hireling(seed, i);
  const role = pick(ROLES, seed, 'hire-role', i);
  const base = ROLE_BASE[role];
  return {
    id: `hire-${seed}-${i}`,
    name: person.name,
    nick: person.nick,
    role,
    traits: person.traits,
    fights: person.fights,
    stage: person.stage,
    age: 19 + Math.floor(rand01(seed, 'hire-age', i) * 30),
    condition: spread(base.condition, seed, 'hire-condition', i),
    nerve: spread(base.nerve, seed, 'hire-nerve', i),
    tempo: spread(base.tempo, seed, 'hire-tempo', i),
    wage_eur: Math.max(1, base.wage + Math.floor(rand01(seed, 'hire-wage', i) * 9) - 4),
    competencies: [...ROLE_COMPETENCIES[role]],
    portrait_asset_id: pick(PORTRAITS, seed, 'hire-portrait', i),
    // The 2D cast has no "hired" torso or legs — an empty id is honest
    // where a made-up filename would be a dangling reference.
    torso_asset_id: role === 'hired' ? '' : `torso-${role}-v03`,
    legs_asset_id: role === 'hired' ? '' : `legs-${role}-v03`,
    initial_equipment: [],
    named: false,
    generated: true,
  };
}

/**
 * A hiring pool. Derived from the campaign seed and the day, so the same
 * day always offers the same people — coming back later must not reroll
 * the board, or the choice costs nothing.
 */
export function hiringPool(seed, day, count = 3) {
  return Array.from({ length: count }, (_, i) => hireCandidate(seed, day * 10 + i));
}
