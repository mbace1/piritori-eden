import { hiringPool } from '../../../people/hiring.mjs?v=1';
import { rand01 } from '../../../market/model.mjs?v=1';
import { machine, step } from './machine.js?v=1';

export const SAVE_KEY = 'piritori-to-eden:v3';
export const STATE_VERSION = 3;
// GameState.gd's own default (`with_seed if with_seed != 0 else
// 20030101`) — a date-shaped constant, not a random per-campaign roll, so
// two players starting fresh see the same hiring pool on the same day
// unless a debug entry ever sets its own.
const DEFAULT_SEED = 20030101;

const PRESSURE = { low: 0, watchful: 1, hot: 2, closed: 3 };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const addUnique = (items, value) => { if (!items.includes(value)) items.push(value); };
const relKey = key => key.replaceAll('-', '_');
const cap = value => String(value ?? '').replaceAll('-', ' ').replaceAll('_', ' ');

// `chapter_def()`/`_sync_chapter_from_content()` — the authored chapter, or
// null if content has none for this number (the slice authors exactly one).
function chapterDef(content, chapterNumber) {
  return content.chapters?.find(item => item.index === chapterNumber) ?? null;
}
function syncChapterFromContent(state, content) {
  const def = chapterDef(content, state.chapter);
  if (!def) return;
  const goal = def.goal ?? {};
  if (['money', 'loot', 'fights'].includes(goal.type)) state.chapterGoal = goal.type;
  if (goal.threshold != null) state.chapterThreshold = goal.threshold;
}

export function createState(content) {
  const start = content.campaign.starting_state;
  const crewStatus = Object.fromEntries([...content.crew, ...(content.protagonist ? [content.protagonist] : [])].map(member => [member.id, {
    condition: member.condition,
    maxCondition: member.condition,
    nerve: member.nerve,
    status: 'available',
    critical: false,
  }]));
  const state = {
    version: STATE_VERSION,
    contentId: content.id,
    seed: DEFAULT_SEED,
    scheduleIndex: 0,
    mode: 'route',
    locale: 'en',
    selectedAnchor: content.campaign.start_anchor_id,
    cash: start.cash_eur,
    markka: start.markka_mk,
    debt: start.debt_eur,
    exitFund: start.exit_fund_eur,
    capacity: start.capacity,
    intel: start.intel,
    stock: { ...start.stock },
    relationships: { ...start.relationships },
    pressure: Object.fromEntries(Object.entries(start.local_pressure)
      .map(([id, band]) => [id, PRESSURE[band] ?? 0])),
    cityHarm: start.city_harm,
    flags: [],
    obligations: {},
    // `{id, cond}` instances, not a set of owned type ids (§8) —
    // `CONDITION.NEW` below.
    equipment: [{ id: 'feature-phone', cond: 0 }],
    recruited: [],
    temporaryCrew: [],
    deployed: [],
    crewStatus,
    // Generated hires (`people/hiring.mjs`), keyed by id — the authored
    // six live in `data.crew` and never need this; `crewRecord()` below
    // checks both so the rest of the game does not have to know which
    // source a recruited id came from.
    hiredCrew: {},
    // Career (`GameState.gd`'s `crew_fights`/`retired_crew`, COMBAT.md
    // §7): a fight survived, per non-named crew id, and who has already
    // aged out. A named crew member never appears in either — they have
    // no ceiling (§7.1).
    crewFights: {},
    retiredCrew: [],
    // Everyone the police took (COMBAT.md §9.5.3) — deliberately not the
    // same list as `retiredCrew`: a veteran who got out is a different
    // fact about a different night than somebody carried off a yard.
    arrestedCrew: [],
    // Growth loop (GameState.gd Phase D / COMBAT.md §9.11–§9.12): perks,
    // skills, unspent points, aptitude sets, and who a veteran already
    // trained. Persisted so a level-up is not lost on reload.
    crewPerks: {},
    crewSkills: {},
    crewPerkPoints: {},
    crewAptitudes: {},
    trainedCrew: [],
    // Chapters (`GameState.gd`'s run structure, GDD): a chapter is a run
    // within the larger campaign, and the authored slice is one chapter's
    // worth, not a whole era's — `CHAPTER_DAYS` below is Godot's own
    // PLACEHOLDER figure (10) against this slice's real 7. `chapterGoal`/
    // `chapterThreshold` are set from content just below, matching
    // `new_campaign()`'s own `_sync_chapter_from_content()` call.
    chapter: 1,
    chapterCleared: false,
    chapterGoal: 'money',
    chapterThreshold: 600,
    chapterEarned: 0,
    chapterLootTaken: 0,
    chapterFightsWon: 0,
    lastEndingOutcome: '',
    // Built or bought, so it carries a chapter boundary (a stash house
    // upgrade earned from the shipment operation, once chapters chain —
    // §13 of the persistence ledger; unreachable with one authored
    // chapter, kept for the shape).
    upgrades: [],
    revealedOffers: ['offer-piritori-buy'],
    revealedMissions: [],
    revealedEncounters: ['enc-first-purchase'],
    missionStatus: {},
    choices: {},
    newsSeen: [],
    route: null,
    battle: null,
    battleHistory: [],
    endingId: null,
    // H2 doors (doors.js): the offers each door block rolled, and the one
    // taken, keyed by schedule index so a reload shows the same offers.
    doors: { offers: {}, taken: {} },
    // Answer 23: at most two fights a day. Counted when a fight starts.
    fightsByDay: {},
    logs: ['Day 1. Piritori is the only corner that already knows Aatami.'],
    lastOutcome: null,
  };
  syncChapterFromContent(state, content);
  return state;
}

export function restoreState(raw, content) {
  if (!raw || raw.version !== STATE_VERSION || raw.contentId !== content.id) return createState(content);
  const fresh = createState(content);
  return settleCrew({
    ...fresh,
    ...raw,
    // Older builds could record an early withdrawal in Chapter 1. It was
    // never valid under the owner's Chapter 1 rule; keep all other memories.
    flags: (raw.flags ?? fresh.flags).filter(flag => (raw.chapter ?? 1) !== 1 || flag !== 'memory:aatami-stepped-back'),
    battle: restoreBattle(raw.battle),
    stock: { ...fresh.stock, ...(raw.stock ?? {}) },
    relationships: { ...fresh.relationships, ...(raw.relationships ?? {}) },
    pressure: { ...fresh.pressure, ...(raw.pressure ?? {}) },
    obligations: { ...fresh.obligations, ...(raw.obligations ?? {}) },
    crewStatus: { ...fresh.crewStatus, ...(raw.crewStatus ?? {}) },
    hiredCrew: { ...fresh.hiredCrew, ...(raw.hiredCrew ?? {}) },
    crewFights: { ...fresh.crewFights, ...(raw.crewFights ?? {}) },
    crewPerks: { ...fresh.crewPerks, ...(raw.crewPerks ?? {}) },
    crewSkills: { ...fresh.crewSkills, ...(raw.crewSkills ?? {}) },
    crewPerkPoints: { ...fresh.crewPerkPoints, ...(raw.crewPerkPoints ?? {}) },
    crewAptitudes: { ...fresh.crewAptitudes, ...(raw.crewAptitudes ?? {}) },
    trainedCrew: Array.isArray(raw.trainedCrew) ? [...raw.trainedCrew] : [],
    doors: { offers: { ...(raw.doors?.offers ?? {}) }, taken: { ...(raw.doors?.taken ?? {}) } },
    fightsByDay: { ...(raw.fightsByDay ?? {}) },
  });
}

// A board battle keeps its cover in a Map and the round's hits in a Set
// (battle.js). Plain JSON flattens both to {}, and a reload mid-battle then
// failed on `cover.has`, every load after it too (found v4.79). The save
// carries them tagged, and the load turns them back.
const keepCollections = (key, value) => (value instanceof Map ? { __map: [...value] } : value instanceof Set ? { __set: [...value] } : value);
const reviveCollections = (key, value) => (value && typeof value === 'object' && !Array.isArray(value)
  ? (Array.isArray(value.__map) ? new Map(value.__map) : Array.isArray(value.__set) ? new Set(value.__set) : value) : value);

/** A saved battle as the board needs it. One saved before v4.79 lost its
 *  cover and hits to JSON: it comes back without them rather than locking
 *  the save. */
function restoreBattle(battle) {
  if (!battle) return null;
  return {
    ...battle,
    cover: battle.cover instanceof Map ? battle.cover : new Map(),
    syncHitsThisRound: battle.syncHitsThisRound instanceof Set ? battle.syncHitsThisRound : new Set(),
  };
}

export function saveState(state, storage = globalThis.localStorage) {
  storage?.setItem(SAVE_KEY, JSON.stringify(state, keepCollections));
}

export function loadState(content, storage = globalThis.localStorage) {
  try {
    return restoreState(JSON.parse(storage?.getItem(SAVE_KEY) ?? 'null', reviveCollections), content);
  } catch {
    return createState(content);
  }
}

export function currentSchedule(state, content) {
  const slot = content.schedule[state.scheduleIndex] ?? null;
  // A door block (H2) has no lead until a door is taken; then the door IS
  // the block's encounter, at the door's anchor.
  const taken = slot?.door ? state.doors?.taken?.[state.scheduleIndex] : null;
  return taken ? { ...slot, anchor_id: taken.anchor, encounter_id: taken.encounterId } : slot;
}

/** The day the schedule is on (the last authored day once it has run out). */
export function currentDay(state, content) {
  return (content.schedule[state.scheduleIndex] ?? content.schedule.at(-1))?.day ?? 1;
}

export function fightsToday(state, content) {
  return state.fightsByDay?.[currentDay(state, content)] ?? 0;
}

/** Answer 23: a day holds at most two fights. Called when a real fight starts. */
export function recordFight(state, content) {
  state.fightsByDay ??= {};
  const day = currentDay(state, content);
  state.fightsByDay[day] = (state.fightsByDay[day] ?? 0) + 1;
}

export function currentEncounter(state, data) {
  const slot = currentSchedule(state, data.content);
  return slot ? data.encounters.get(slot.encounter_id) ?? null : null;
}

export function formatBlock(state, content) {
  const slot = currentSchedule(state, content);
  if (!slot) return 'COMPLETE';
  return `DAY ${slot.day} · ${slot.block.toUpperCase()}`;
}

/** The authored six live in `data.crew` (loaded once, static); a hire off
 *  the street (`people/hiring.mjs`) lives in `state.hiredCrew` instead,
 *  since it does not exist until generated. Everywhere a crew id needs
 *  its full record — deployment, wages, the crew screen — reads through
 *  this rather than assuming the source. */
export function crewRecord(state, data, id) {
  const aatami = data.content?.protagonist;
  return data.crew.get(id) ?? state.hiredCrew[id] ?? (aatami?.id === id ? aatami : null);
}

/** Owner answer 26: Aatami fights throughout Chapter 1. After that he
 *  steps back once enough crew can fight, permanently. */
export function aatamiFights(state, content) {
  const aatami = content?.protagonist;
  if (!aatami) return false;
  if ((state.chapter ?? 1) === 1) return true;
  if (state.flags?.includes('memory:aatami-stepped-back')) return false;
  const able = state.recruited.filter(id => state.crewStatus[id]?.status !== 'missing').length;
  return able < (aatami.steps_back_at_crew ?? 3);
}

/** Called when a fight is about to start: the first time Aatami can stay
 *  out, he does, and the city remembers it. Returns the beat, or ''. */
export function stepBackIfReady(state, content) {
  const aatami = content?.protagonist;
  if ((state.chapter ?? 1) === 1) {
    state.flags = state.flags.filter(flag => flag !== 'memory:aatami-stepped-back');
    return '';
  }
  if (!aatami || state.flags.includes('memory:aatami-stepped-back') || aatamiFights(state, content)) return '';
  addUnique(state.flags, 'memory:aatami-stepped-back');
  addLog(state, aatami.step_back_beat);
  return aatami.step_back_beat;
}

/** Who takes the board: Aatami first while he still fights, then the crew. */
export function fighters(state, data) {
  const crew = deployedCrew(state, data);
  const aatami = data.content?.protagonist;
  return aatami && aatamiFights(state, data.content) ? [aatami, ...crew] : crew;
}

export function deployedCrew(state, data) {
  const available = state.recruited.filter(id => state.crewStatus[id]?.status !== 'missing');
  const chosen = state.deployed.filter(id => available.includes(id));
  const merged = [...chosen, ...available.filter(id => !chosen.includes(id))];
  return merged.slice(0, 3).map(id => crewRecord(state, data, id)).filter(Boolean);
}

// ── career (GameState.gd's crew_fights/retired_crew, COMBAT.md §7) ─────────
// A named crew member (the six authored slots) is an FFT story unit: rare,
// deployed deliberately, never lost to attrition — no ceiling, because they
// leave in authored beats, not by running out of fights. Everyone else is
// hired, and hired crew are disposable: a bounded career that ends in
// retirement, alive, once they have survived enough of them.
const CAREER_FIGHTS = 10;
// Nothing until they are close, then the game tells you — a hidden counter
// would turn the exact spend-or-save decision into a guess.
const CAREER_WARN_AT = 7;

export function isNamed(state, data, id) {
  return crewRecord(state, data, id)?.named === true;
}

export function fightsOf(state, id) {
  return state.crewFights[id] ?? 0;
}

/** -1 for a named character, who has no ceiling. */
export function careerLeft(state, data, id) {
  if (isNamed(state, data, id)) return -1;
  return Math.max(CAREER_FIGHTS - fightsOf(state, id), 0);
}

export function careerIsVisible(state, data, id) {
  if (isNamed(state, data, id)) return false;
  return fightsOf(state, id) >= CAREER_WARN_AT;
}

function retireCrew(state, data, id) {
  if (state.retiredCrew.includes(id)) return;
  state.retiredCrew.push(id);
  const index = state.recruited.indexOf(id);
  if (index >= 0) state.recruited.splice(index, 1);
  // A veteran in the city is a relationship, not a deleted row — the same
  // `memory:` convention `applyEffects()` already writes into `state.flags`.
  addUnique(state.flags, `memory:retired:${id}`);
  addLog(state, `${crewRecord(state, data, id)?.name ?? id} has done enough fights. They retire, alive.`);
}

/** Everyone who was deployed comes out one fight older — called once when a
 *  battle settles (`age_crew()`), never per round. Returns the ids who
 *  reached the ceiling and left this call: RETIRED, not dead.
 *
 *  v4.101 (M3, design/STATE_MACHINES.md) parts from Godot's `age_crew` on
 *  purpose. Someone the police took in this fight is not one fight older
 *  for it, and is never also retired: Godot did both, and bail then brought
 *  back a person still counted as retired, who never aged again. Retiring
 *  waits while someone is critical or missing (`CREW`): the fight counts,
 *  and they retire after their next one. Godot is paused; the port takes
 *  this when it resumes.
 *
 *  Growth is bought with the same currency the ceiling spends: crossing a
 *  level boundary here calls `grantLevel` (GameState.gd `age_crew`). */
export function ageCrew(state, data, deployedIds) {
  const left = [];
  for (const id of deployedIds) {
    if (isNamed(state, data, id) || state.retiredCrew.includes(id) || state.arrestedCrew.includes(id)) continue;
    const beforeLevel = levelOf(state, id);
    state.crewFights[id] = fightsOf(state, id) + 1;
    if (levelOf(state, id) > beforeLevel) grantLevel(state, id);
    if (fightsOf(state, id) >= CAREER_FIGHTS && moveCrew(state, data, id, 'retire').ok) left.push(id);
  }
  return left;
}

// ── growth (GameState.gd Phase D / COMBAT.md §9.11–§9.12) ─────────────────
// PLAYTEST GATE figures, not canon (DESIGN_LOCKS §13) — match Godot exactly.
export const FIGHTS_PER_LEVEL = 3;
export const GLORY_PERK_POINTS = 2;
export const SKILL_OFFER_SIZE = 3;

export function levelOf(state, crewId) {
  return Math.floor(fightsOf(state, crewId) / FIGHTS_PER_LEVEL) + 1;
}

export function perksOf(state, crewId) {
  return state.crewPerks[crewId] ?? {};
}

export function perkValue(state, crewId, perk) {
  return Number(perksOf(state, crewId)[perk] ?? 0) | 0;
}

export function unspentPerkPoints(state, crewId) {
  return Number(state.crewPerkPoints[crewId] ?? 0) | 0;
}

export function skillsOf(state, crewId) {
  return state.crewSkills[crewId] ?? [];
}

/** Award a level's worth: one perk point. Felt now, spent later (UX_SPEC §19). */
export function grantLevel(state, crewId) {
  state.crewPerkPoints[crewId] = unspentPerkPoints(state, crewId) + 1;
}

/** Glory: near-death survival or a double kill (§9.11). */
export function grantGlory(state, crewId) {
  state.crewPerkPoints[crewId] = unspentPerkPoints(state, crewId) + GLORY_PERK_POINTS;
  addUnique(state.flags, `memory:glory:${crewId}`);
}

/** Spend one point on a content-defined perk axis. Refuses unknowns. */
export function spendPerk(state, data, crewId, perk) {
  if (unspentPerkPoints(state, crewId) <= 0) return false;
  const perks = data.content?.perks ?? [];
  if (!perks.includes(perk)) return false;
  const bag = { ...(state.crewPerks[crewId] ?? {}) };
  bag[perk] = (Number(bag[perk] ?? 0) | 0) + 1;
  state.crewPerks[crewId] = bag;
  state.crewPerkPoints[crewId] = unspentPerkPoints(state, crewId) - 1;
  return true;
}

/** Stable 32-bit hash for skill-offer seeding — not Godot-bit-identical
 *  (PORTING.md §4); same (crew, seed, level) always yields the same offer. */
function growthHash(text) {
  let h = 2166136261 >>> 0;
  const s = String(text);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function offerRng(crewId, seed, level) {
  let state = (growthHash(crewId) + (Number(seed) | 0) * 13 + level * 101) >>> 0;
  return {
    range(maxInclusive) {
      // xorshift32 — enough for a stable shuffle, not a crypto claim.
      state ^= state << 13; state >>>= 0;
      state ^= state >>> 17; state >>>= 0;
      state ^= state << 5; state >>>= 0;
      const span = maxInclusive + 1;
      return span <= 0 ? 0 : (state >>> 0) % span;
    },
  };
}

/** What this person could learn next — aptitude pools × tier ≤ level,
 *  size SKILL_OFFER_SIZE, deterministic from crew + campaign seed + level. */
export function skillOffer(state, data, crewId) {
  const level = levelOf(state, crewId);
  const known = new Set(skillsOf(state, crewId));
  const eligible = [];
  for (const a of aptitudesOf(state, data, crewId)) {
    for (const sk of data.content?.skills ?? []) {
      if (String(sk.aptitude ?? '') !== String(a)) continue;
      if ((Number(sk.tier ?? 1) | 0) > level) continue;
      if (known.has(String(sk.id ?? ''))) continue;
      eligible.push(sk);
    }
  }
  if (eligible.length <= SKILL_OFFER_SIZE) return eligible.slice();
  const rng = offerRng(crewId, state.seed, level);
  const pool = eligible.slice();
  const out = [];
  for (let i = 0; i < SKILL_OFFER_SIZE; i += 1) {
    const at = rng.range(pool.length - 1);
    out.push(pool.splice(at, 1)[0]);
  }
  return out;
}

export function skillPoolSize(state, data, crewId) {
  let n = 0;
  for (const a of aptitudesOf(state, data, crewId)) {
    for (const sk of data.content?.skills ?? []) {
      if (String(sk.aptitude ?? '') === String(a)) n += 1;
    }
  }
  return n;
}

/** Learning costs the level's point — skill OR perk, not both. */
export function spendPerkPointOnSkill(state, crewId) {
  if (unspentPerkPoints(state, crewId) <= 0) return;
  state.crewPerkPoints[crewId] = unspentPerkPoints(state, crewId) - 1;
}

export function learnSkill(state, data, crewId, skillId) {
  const have = [...skillsOf(state, crewId)];
  if (have.includes(skillId)) return false;
  let found = false;
  for (const sk of data.content?.skills ?? []) {
    if (String(sk.id ?? '') !== skillId) continue;
    if (!hasAptitude(state, data, crewId, String(sk.aptitude ?? ''))) return false;
    if ((Number(sk.tier ?? 1) | 0) > levelOf(state, crewId)) return false;
    found = true;
    break;
  }
  if (!found) return false;
  have.push(skillId);
  state.crewSkills[crewId] = have;
  return true;
}

export function aptitudesOf(state, data, crewId) {
  if (Object.prototype.hasOwnProperty.call(state.crewAptitudes, crewId)) {
    return state.crewAptitudes[crewId] ?? [];
  }
  const rec = crewRecord(state, data, crewId);
  if (!rec) return [];
  const role = String(rec.role ?? '');
  return role ? [role] : [];
}

export function setAptitudes(state, crewId, ids) {
  state.crewAptitudes[crewId] = [...ids];
}

export function hasAptitude(state, data, crewId, aptitudeId) {
  return aptitudesOf(state, data, crewId).includes(aptitudeId);
}

export function primaryAptitude(state, data, crewId) {
  const a = aptitudesOf(state, data, crewId);
  return a.length > 0 ? String(a[0]) : '';
}

/** A retired veteran starts a rookie ahead (§7.4). +2 fights, does NOT call
 *  grantLevel — match Godot even though that skips the perk points those
 *  levels would have granted. */
export function train(state, data, crewId) {
  if (!state.retiredCrew.length || state.trainedCrew.includes(crewId) || isNamed(state, data, crewId)) {
    return false;
  }
  state.trainedCrew.push(crewId);
  state.crewFights[crewId] = fightsOf(state, crewId) + 2;
  return true;
}

// ── equipment (GameState.gd's equipment/Condition, COMBAT.md §8) ───────────
// new -> used -> faulty -> broken, and it only goes one way. `state.equipment`
// is an ARRAY OF INSTANCES (`{id, cond}`), not a set of owned type ids — a
// crew of four can each carry a pipe, and a good one and a wrecked one in
// the same stash are two different things. Deliberately separate from what
// a crew member actually wields in a fight: `makePlayer()` picks a weapon
// off `member.initial_equipment` (the crew record's own authored kit), the
// same way `battle_builder.gd`'s `_crew_to_unit()` reads `initial_equipment`
// rather than `GameState.equipment` — the owned/looted stash is a fencing
// economy, not a loadout screen. Buying market gear is `buyEquipment()` —
// Piritori only, `isPurchasable` at the point of sale (COMBAT.md §8).
export const CONDITION = { NEW: 0, USED: 1, FAULTY: 2, BROKEN: 3 };
const CONDITION_WORD = ['New', 'Used', 'Faulty', 'Broken'];
const CONDITION_RESALE = { 0: 1.0, 1: 0.7, 2: 0.4, 3: 0.15 };

export function conditionWord(cond) {
  return CONDITION_WORD[cond] ?? CONDITION_WORD[0];
}

export function addEquipment(state, typeId, cond = CONDITION.NEW) {
  if (!typeId) return;
  // Authored grants may repeat: a second pipe is a second pipe. No dedup —
  // `add_equipment()` has none either.
  state.equipment.push({ id: typeId, cond });
}

export function countOf(state, typeId) {
  return state.equipment.filter(item => item.id === typeId).length;
}

/** Takes the WORST first: what a fallen crew member was carrying is gone,
 *  and if a good one and a wrecked one were both in the stash, the wrecked
 *  one is the one that was being used. */
export function removeOne(state, typeId) {
  let worst = -1;
  for (let i = 0; i < state.equipment.length; i++) {
    if (state.equipment[i].id !== typeId) continue;
    if (worst < 0 || state.equipment[i].cond > state.equipment[worst].cond) worst = i;
  }
  if (worst < 0) return false;
  state.equipment.splice(worst, 1);
  return true;
}

/** §8 is asymmetric on purpose: loot converts DOWN into money freely, but
 *  the best gear cannot be bought at any price. */
export function isPurchasable(data, equipmentId) {
  return (data.equipment.get(equipmentId)?.acquisition ?? 'market') !== 'taken';
}

export function resaleOf(data, equipmentId) {
  return data.equipment.get(equipmentId)?.resale_eur ?? 0;
}

export function resaleAt(state, data, index) {
  const item = state.equipment[index];
  if (!item) return 0;
  return Math.round(resaleOf(data, item.id) * (CONDITION_RESALE[item.cond] ?? 1.0));
}

// ── time: D002 (owner, 2026-10-26: "30%"; ROADMAP §9 item 6), built in v4.98 ──
// A trip, or a visit to a seller however much changes hands, uses 30% of a
// block, so three fit. A VISIT is every trade at one place between two trips.
// Trips always go: the block's scene, door or nightfall turns the block, and
// refusing a walk could strand Aatami away from the story. Trades do not: once
// the block's time is spent, the next one waits for the block to turn. A route
// send is not Aatami's time (the route has its own capacity), and road events
// keep their own minutes on top (road.js). Units are tenths of a block.
export const TIME = { block: 10, trip: 3, visit: 3 };
function blockClock(state) {
  if (state.time?.block !== state.scheduleIndex) state.time = { block: state.scheduleIndex, spent: 0, visitAt: null };
  return state.time;
}
/** Tenths of the current block already used (0 once the block has turned). */
export function timeSpent(state) {
  return state.time?.block === state.scheduleIndex ? state.time.spent : 0;
}
/** How many more trips or seller visits fit in this block. */
export function actionsLeft(state) {
  return Math.max(0, Math.floor((TIME.block - timeSpent(state)) / TIME.trip));
}
/** What trading at `anchorId` would cost now: nothing more within a visit. */
export function tradeCost(state, anchorId) {
  return state.time?.block === state.scheduleIndex && state.time.visitAt === anchorId ? 0 : TIME.visit;
}
/** Why a trade at `anchorId` cannot happen now, or ''. */
export function tradeBlocker(state, anchorId) {
  const cost = tradeCost(state, anchorId);
  return cost && timeSpent(state) + cost > TIME.block ? 'No time left to trade this block. It comes back when the block turns.' : '';
}
function chargeTrade(state, anchorId) {
  const clock = blockClock(state);
  if (clock.visitAt !== anchorId) { clock.spent += TIME.visit; clock.visitAt = anchorId; }
}
/** A trip: always allowed, and the end of any visit. */
export function chargeTrip(state) {
  const clock = blockClock(state);
  clock.spent += TIME.trip;
  clock.visitAt = null;
}

/** Piritori, and only Piritori for now (§9.7) — carrying loot across the
 *  city to sell it puts you where the hiring pool and the pressure both
 *  are; the better fence you have to earn later is not attempted. */
const FENCE_ANCHORS = ['piritori'];
export function canFenceHere(state) {
  return FENCE_ANCHORS.includes(state.selectedAnchor);
}

/** Sells the BEST one you have — what somebody selling would do, leaving
 *  the worn one to keep using or lose. Deliberately one-way and
 *  deliberately poor: loot only ever converts down into money. */
export function sellLoot(state, data, equipmentId) {
  let best = -1;
  for (let i = 0; i < state.equipment.length; i++) {
    if (state.equipment[i].id !== equipmentId) continue;
    if (best < 0 || state.equipment[i].cond < state.equipment[best].cond) best = i;
  }
  if (best < 0) return 0;
  if (tradeBlocker(state, state.selectedAnchor)) return 0;
  chargeTrade(state, state.selectedAnchor);
  const paid = resaleAt(state, data, best);
  state.equipment.splice(best, 1);
  state.cash += paid;
  // Counted centrally (GDD run structure): a chapter cleared by earning
  // has to see every way of earning, and the fence is one of them. Here
  // that is three: a market sale (`transactOffer`), a pack sent down a route
  // (`sendOnRoute`) and the fence. Mission payouts do not count. (Godot's
  // `game_state.gd` counts only the fence; this build does not follow it,
  // and v3-state.mjs holds the panel's wording to what is counted here.)
  recordChapterIncome(state, paid);
  addLog(state, `Fenced ${cap(equipmentId)} for €${paid}.`);
  return paid;
}


/** Same corner as the fence — Piritori only. */
export function canShopHere(state) {
  return canFenceHere(state);
}

/** What the shop asks. Content sets `buy_eur` on market items (~2.5–3×
 *  resale). Fallback max(resale*3, resale+10) is provisional only
 *  (DESIGN_LOCKS.md §13). */
export function buyOf(data, equipmentId) {
  const e = data.equipment.get(equipmentId);
  if (!e) return 0;
  if (e.buy_eur != null) return e.buy_eur;
  const resale = e.resale_eur ?? 0;
  return Math.max(resale * 3, resale + 10);
}

/** Buy market gear at Piritori. Refuses taken-only, wrong place, short cash.
 *  Returns { ok, paid } — paid is 0 on refusal. */
export function buyEquipment(state, data, equipmentId) {
  if (!canShopHere(state)) return { ok: false, paid: 0 };
  if (!isPurchasable(data, equipmentId)) return { ok: false, paid: 0 };
  const price = buyOf(data, equipmentId);
  if (price <= 0 || state.cash < price) return { ok: false, paid: 0 };
  if (tradeBlocker(state, state.selectedAnchor)) return { ok: false, paid: 0, reason: 'no-time' };
  chargeTrade(state, state.selectedAnchor);
  state.cash -= price;
  addEquipment(state, equipmentId, CONDITION.NEW);
  addLog(state, `Bought ${cap(equipmentId)} for €${price}.`);
  return { ok: true, paid: price };
}

/** What is lying on the ground when a battle ends, for one side —
 *  `dropped_kit()`. Gear is carried by a PERSON, so it comes off the
 *  fallen, not off the field: only a downed unit's WEAPON drops (a
 *  support item, the feature-phone, never does — mirrors Godot's
 *  `weapon_ids` vs `item_ids` split, read here off the equipment
 *  content's own `kind` since this build's single-slot `unit.equipment`
 *  does not distinguish the two on the unit object itself). `'police'` is
 *  deliberately not a valid `side` — `battle.police` is a third side, and
 *  asking here would have the player looting them. Returns type ids, not
 *  unique ones: two people carrying pipes drop two pipes. */
export function droppedKit(battle, data, side) {
  const units = side === 'player' ? battle.players : battle.enemies;
  const out = [];
  for (const unit of units ?? []) {
    if (unit.alive || !unit.equipment) continue;
    if (data.equipment.get(unit.equipment)?.kind !== 'weapon') continue;
    out.push(unit.equipment);
  }
  return out;
}

/** Take what the losing side was carrying — the ONLY way taken-only gear
 *  enters the game. Returns the ids actually added, for a spoils line. No
 *  duplicate check: a crew of four with a pipe each is ordinary. */
export function takeLoot(state, data, equipmentIds) {
  const got = [];
  for (const id of equipmentIds ?? []) {
    if (!id || !data.equipment.get(id)) continue;
    addEquipment(state, id, CONDITION.NEW);
    recordChapterLoot(state, 1);
    got.push(id);
  }
  return got;
}

/** What a fallen crew member was carrying is gone — an attempted removal
 *  per id, which is usually a no-op: a battle unit's weapon comes off its
 *  own authored `initial_equipment`, not off `state.equipment`, so most of
 *  the time there is nothing here to take. Ported as-is (`lose_kit_of()`
 *  makes the same attempt unconditionally) rather than skipped as
 *  pointless — Godot's own version is exactly this quiet. */
export function loseKitOf(state, equipmentIds) {
  for (const id of equipmentIds ?? []) removeOne(state, id);
}

// ── chapters (GameState.gd's run structure, GDD) ────────────────────────
// PLACEHOLDER (DESIGN_LOCKS §13): ten days is Godot's own figure and the
// slice authors seven, so its one chapter ends early on purpose rather
// than pretending the content is longer than it is.
export const CHAPTER_DAYS = 10;

export function chapterProgress(state) {
  if (state.chapterGoal === 'loot') return state.chapterLootTaken;
  if (state.chapterGoal === 'fights') return state.chapterFightsWon;
  return state.chapterEarned;
}

/** The threshold buys ENTRY to the climax; it is not the climax itself
 *  (`MAP.md` §12.5 is the same idea one magnification down). */
export function chapterGoalMet(state) {
  return chapterProgress(state) >= state.chapterThreshold;
}

/** Counted here rather than at each call site, so a new way of earning
 *  cannot quietly fail to count toward the chapter. */
function recordChapterIncome(state, amount) {
  if (amount > 0) state.chapterEarned += amount;
}
function recordChapterLoot(state, n) {
  if (n > 0) state.chapterLootTaken += n;
}

function chapterEnding(state, content) {
  return chapterDef(content, state.chapter)?.ending ?? {};
}

export function chapterEndingAvailable(state, data) {
  return chapterGoalMet(state) && chapterDef(data.content, state.chapter) != null && !state.chapterCleared;
}

/** Everyone the police took, or who did not come back from an operation
 *  (`arrest()`). Deliberately not the same list as `retiredCrew` — a
 *  veteran who got out is a different fact from somebody carried off. */
export function arrestCrew(state, data, id) {
  if (state.arrestedCrew.includes(id)) return;
  state.arrestedCrew.push(id);
  const index = state.recruited.indexOf(id);
  if (index >= 0) state.recruited.splice(index, 1);
  addUnique(state.flags, `memory:arrested:${id}`);
  addLog(state, `${crewRecord(state, data, id)?.name ?? id} is taken. Gone from the roster.`);
}

// ── crew status, an explicit machine (v4.101; design/STATE_MACHINES.md, M3) ──
// Stored as before, so every save loads: `crewStatus[id].status` and
// `.critical`, plus the `recruited`, `arrestedCrew` and `retiredCrew` lists.
// Before v4.101 three writers (the board's consequences, Night Shift's
// receipt, the effects below) kept those fields three ways, and they
// disagreed: a critical person hurt again read 'wounded' while the ending
// counted them dead; an arrested person stayed critical; the police's
// arrest and a last fight's retirement could both happen. Now each move is
// one row here and `moveCrew` writes every field it touches.
export const CREW = machine('crew', {
  available: { wound: 'wounded', maim: 'critical', lose: 'missing', arrest: 'arrested', retire: 'retired' },
  wounded: { wound: 'wounded', maim: 'critical', lose: 'missing', arrest: 'arrested', retire: 'retired' },
  // Hurt again, a critical person stays critical. Retiring waits for
  // treatment: the wound is still the player's to deal with.
  critical: { wound: 'critical', maim: 'critical', treat: 'wounded', lose: 'missing', arrest: 'arrested' },
  // Left behind: found again hurt. Retiring waits until they are home.
  missing: { rescue: 'wounded' },
  arrested: { bail: 'available' },
  retired: {},
  // Written only by the chapter's ending (`chooseEnding`, M11), which the
  // shipped game cannot reach yet.
  dead: {},
});

/** Where a person stands, read from the stored fields. The lists win over
 *  the status string: 'missing' in `status` means arrested when they are on
 *  `arrestedCrew`, and lost (still on the roster) when they are not. */
export function crewState(state, id) {
  if (state.arrestedCrew?.includes(id)) return 'arrested';
  if (state.retiredCrew?.includes(id)) return 'retired';
  const s = state.crewStatus?.[id];
  if (!s) return 'none';
  if (s.status === 'dead') return 'dead';
  if (s.status === 'missing') return 'missing';
  if (s.critical || s.status === 'critical') return 'critical';
  if (s.status === 'wounded') return 'wounded';
  return 'available';
}

/** The one way a person's standing moves. `loss` is what a wound costs in
 *  condition (the board's 4, Night Shift's 1) and `floor` the least it
 *  leaves. A refusal changes nothing and says why. */
export function moveCrew(state, data, id, event, { loss = 0, floor = 1 } = {}) {
  const moved = step(CREW, crewState(state, id), event);
  if (!moved.ok) return moved;
  const s = event === 'bail' ? (state.crewStatus[id] ??= {}) : state.crewStatus[id];
  if (event === 'wound' || event === 'maim') {
    s.condition = Math.max(floor, Math.min(s.maxCondition ?? s.condition ?? 1, (s.condition ?? 1) - loss));
    if (event === 'maim') s.critical = true;
    s.status = s.critical ? 'critical' : 'wounded';
  } else if (event === 'treat' || event === 'rescue') {
    Object.assign(s, { status: 'wounded', critical: false, condition: Math.max(1, s.condition ?? 0) });
  } else if (event === 'lose' || event === 'arrest') {
    Object.assign(s, { status: 'missing', critical: false, condition: 0 });
    if (event === 'arrest') arrestCrew(state, data, id);
  } else if (event === 'bail') {
    state.arrestedCrew.splice(state.arrestedCrew.indexOf(id), 1);
    addUnique(state.recruited, id);
    Object.assign(s, { status: 'available', critical: false, condition: Math.max(1, s.maxCondition ?? s.condition ?? 1) });
  } else if (event === 'retire') {
    retireCrew(state, data, id);
  }
  return moved;
}

/** What a board fight does to the crew (COMBAT.md §9.5.3): whoever the
 *  police took is arrested; the rest who went down are hurt, and in the
 *  courtyard receipts' fight (`maim`) left critical, Aatami excepted. */
export function battleCrew(state, data, { injured = [], taken = [], maim = false }) {
  const takenSet = new Set(taken);
  for (const id of injured) {
    if (takenSet.has(id)) continue;
    if (maim && id !== data.content.protagonist?.id) moveCrew(state, data, id, 'maim', { loss: 4, floor: 0 });
    else moveCrew(state, data, id, 'wound', { loss: 4 });
  }
  for (const id of takenSet) {
    if (!moveCrew(state, data, id, 'arrest').ok && !state.crewStatus[id]) arrestCrew(state, data, id);
  }
}

/** A save written before v4.101 can hold the states the machine no longer
 *  makes; this puts each back on a row of `CREW` as it loads. */
export function settleCrew(state) {
  for (const [id, s] of Object.entries(state.crewStatus ?? {})) {
    const arrested = state.arrestedCrew?.includes(id);
    if (arrested) { s.critical = false; s.status = 'missing'; }
    else if (s.critical && s.status !== 'missing' && s.status !== 'dead') s.status = 'critical';
    else if (s.status === 'critical') s.critical = true;
    // Arrested in the fight that would have been their last, or bailed back
    // onto the roster after it: they are not also retired.
    if ((arrested || state.recruited?.includes(id)) && state.retiredCrew?.includes(id)) state.retiredCrew.splice(state.retiredCrew.indexOf(id), 1);
  }
  return state;
}

/** How many hands it takes for a container to move quietly. */
const OPERATION_IDEAL_CREW = 3;

/** The shipment night (owner, 2026-11-09: "a choice, odds shown"). The
 *  player picks who goes and which route; the screen shows the odds before
 *  the stake is paid. The score is the old one, now visible: hands against an
 *  ideal three, less for each arrest, plus the route, the families' mood and
 *  the heat at the harbour, plus one roll of ±0.35. 1.0 or more is clean, 0.5
 *  or more messy, less is lost. THE PENALTY CANNOT BE MONEY: what can be lost
 *  is what carries, gear and people; a clean run buys a built upgrade. */
const OPERATION_ROLL = 0.35;
const OPERATION_HEAT = 0.1;
const OPERATION_ARREST = 0.15;

/** Who can go: on the roster and able (a wounded hand can carry; a critical,
 *  missing or arrested one cannot). */
export function shipmentCrew(state) {
  return state.recruited.filter(id => ['available', 'wounded'].includes(crewState(state, id)));
}

/** The chapter's routes, each with whether it is open to this campaign. */
export function shipmentRoutes(state, data) {
  return (chapterEnding(state, data.content).routes ?? []).map(route => ({
    ...route, open: choiceStatus({ requirements: route.requirements ?? [] }, state, data).ok,
  }));
}

/** Everyone able, and the safest open route: the plan when none is given. */
export function defaultShipmentPlan(state, data) {
  const open = shipmentRoutes(state, data).filter(r => r.open).sort((a, b) => (b.edge ?? 0) - (a.edge ?? 0));
  return { crew: shipmentCrew(state), route: open[0]?.id ?? null };
}

function shipmentBase(state, data, plan) {
  const ending = chapterEnding(state, data.content);
  const route = shipmentRoutes(state, data).find(r => r.id === plan.route);
  const hands = plan.crew.length;
  const heat = state.pressure?.[ending.anchor_id] ?? 0;
  const parts = [{ label: `${hands} of ${OPERATION_IDEAL_CREW} hands`, edge: hands / OPERATION_IDEAL_CREW - 1 }];
  if (route) parts.push({ label: route.label, edge: route.edge ?? 0 });
  for (const m of ending.modifiers ?? []) if (state.flags.includes(m.flag)) parts.push({ label: m.label, edge: m.edge });
  if (heat) parts.push({ label: `Heat at the harbour: ${heat}`, edge: -OPERATION_HEAT * heat });
  if (state.arrestedCrew.length) parts.push({ label: `${state.arrestedCrew.length} taken by the police this chapter`, edge: -OPERATION_ARREST * state.arrestedCrew.length });
  return { base: 1 + parts.reduce((n, part) => n + part.edge, 0), parts, route };
}

/** Clean, messy and lost as whole percentages that add to 100, and what tipped them. */
export function shipmentOdds(state, data, plan = defaultShipmentPlan(state, data)) {
  const { base, parts } = shipmentBase(state, data, plan);
  const above = threshold => Math.max(0, Math.min(1, (base + OPERATION_ROLL - threshold) / (2 * OPERATION_ROLL)));
  const clean = Math.round(100 * above(1)), messy = Math.round(100 * above(0.5)) - clean;
  return { clean, messy, lost: 100 - clean - messy, parts: parts.filter(part => part.edge) };
}

/** Is this plan one the player could make: able crew only, an open route. */
export function shipmentPlanReason(state, data, plan) {
  if (!plan || !Array.isArray(plan.crew)) return 'no-plan';
  const able = new Set(shipmentCrew(state));
  if (plan.crew.some(id => !able.has(id)) || new Set(plan.crew).size !== plan.crew.length) return 'crew-not-able';
  const route = shipmentRoutes(state, data).find(r => r.id === plan.route);
  if (!route?.open) return 'route-closed';
  return '';
}

/** One roll per playthrough: drawn from the choices that made it, so walking
 *  away and coming back cannot reroll it, and two different weeks do not share
 *  it (every campaign starts from the same seed). */
function shipmentRoll(state) {
  const path = Object.keys(state.choices ?? {}).sort().map(id => `${id}=${state.choices[id]}`).join(',');
  return rand01(state.seed, 'operation', state.chapter, path) * 2 * OPERATION_ROLL - OPERATION_ROLL;
}

function resolveOperation(state, data, ending, plan) {
  const { base, route } = shipmentBase(state, data, plan);
  const score = base + shipmentRoll(state);
  if (route?.effects?.length) applyEffects(state, route.effects, data, `shipment:${route.id}`);
  if (route) addUnique(state.flags, `memory:shipment-route:${route.id}`);
  let outcome, taken = null, left = null;
  if (score >= 1.0) {
    if (ending.grants_upgrade) addUnique(state.upgrades, ending.grants_upgrade);
    outcome = 'clean';
  } else if (score >= 0.5) {
    // Something had to be left behind: the LAST thing in the stash, unless
    // the warehouse took it in.
    if (!route?.keeps_stash && state.equipment.length) left = state.equipment.pop();
    outcome = 'messy';
  } else {
    // Somebody who went did not come back.
    taken = plan.crew.find(id => !isNamed(state, data, id)) ?? null;
    if (taken) arrestCrew(state, data, taken);
    outcome = 'lost';
  }
  state.lastShipment = { route: route?.id ?? null, crew: [...plan.crew], outcome, taken, left, odds: shipmentOdds(state, data, plan) };
  return outcome;
}

/** Run the ending, and turn the chapter over. An OPERATION rather than a
 *  battle: buying a shipment and moving it, not a fight — commerce is
 *  allowed to be the climax (the GDD ruling `attempt_chapter_ending()`'s
 *  own comment cites). Returns '' on success, or a reason it could not be
 *  attempted. */
export function attemptChapterEnding(state, data, plan = state.shipmentPlan ?? defaultShipmentPlan(state, data)) {
  if (!chapterEndingAvailable(state, data)) return 'not-available';
  const ending = chapterEnding(state, data.content);
  const stake = ending.stake_eur ?? 0;
  if (state.cash < stake) return 'cannot-afford';
  if (ending.anchor_id && state.selectedAnchor !== ending.anchor_id) return 'wrong-place';
  // A chapter with routes needs a plan the player could have made.
  if ((ending.routes ?? []).length) { const bad = shipmentPlanReason(state, data, plan); if (bad) return bad; }

  state.cash -= stake;
  state.chapterCleared = true;
  state.lastEndingOutcome = resolveOperation(state, data, ending, plan);
  delete state.shipmentPlan;
  // A chapter you finished is a thing the city remembers (§9.8: memories
  // are the seam every later system reads) — the same `memory:` convention
  // `applyEffects()` and `retireCrew()` already write into `state.flags`.
  addUnique(state.flags, `memory:chapter-cleared:${state.chapter}:${state.lastEndingOutcome}`);
  addLog(state, `${ending.label ?? 'The operation'} goes ${state.lastEndingOutcome}.`);
  return '';
}

/** Today's three candidates — `hiringPool()` is pure and re-derives the
 *  same people every time it is called for the same day, so nothing here
 *  is stored: walking away and coming back must not reroll the board.
 *  `GameState.gd`'s `hiring_pool()` drops anyone already on the roster
 *  (recognisable by id even after the day turns over, since the seed and
 *  day pair are stable) — otherwise a hired candidate would keep
 *  reappearing as an offer next to the person they already are. */
export function hiringPoolFor(state, data) {
  const day = currentSchedule(state, data.content)?.day ?? 1;
  return hiringPool(state.seed, day).filter(candidate => !state.recruited.includes(candidate.id));
}

/** Hire a candidate off today's pool. `GameState.gd`'s `hire()`: the
 *  signing fee is the candidate's own wage, deducted once up front — a
 *  placeholder derived from authored data rather than invented, but the
 *  owner's comment there is explicit that it was never playtested. Fails
 *  outright (no partial hire) if cash can't cover it.
 *
 *  Godot's own dedup is `roster.has(id)` alone — NOT whether the id has
 *  ever been seen in `generated_crew` before. That is weaker than it
 *  sounds once retirement exists (`ageCrew()`): a retired candidate is off
 *  `state.recruited`, so the exact same person can resurface in a later
 *  pool read and be hired again — and because `state.retiredCrew` is
 *  never cleared, `ageCrew()` will then skip them forever, an odd
 *  immortality this port carries over rather than closes. */
export function hireFromPool(state, data, candidateId) {
  if (state.recruited.includes(candidateId)) return false;
  const day = currentSchedule(state, data.content)?.day ?? 1;
  const candidate = hiringPoolFor(state, data).find(item => item.id === candidateId);
  if (!candidate) return false;
  const fee = candidate.wage_eur;
  if (state.cash < fee) return false;
  state.cash -= fee;
  state.hiredCrew[candidateId] = candidate;
  state.crewStatus[candidateId] = {
    condition: candidate.condition,
    maxCondition: candidate.condition,
    nerve: candidate.nerve,
    status: 'available',
    critical: false,
  };
  addUnique(state.recruited, candidateId);
  // What they can do, not what they are called (COMBAT.md §9.12) — Godot
  // `hire()` copies `record.aptitudes` onto crew_aptitudes when present.
  if (Array.isArray(candidate.aptitudes) && candidate.aptitudes.length) {
    setAptitudes(state, candidateId, candidate.aptitudes);
  }
  addLog(state, `Day ${day}: ${candidate.name} hired on for €${fee} — ${candidate.role}, €${candidate.wage_eur}/night after.`);
  return true;
}

export function requirementStatus(requirement, state, data) {
  const numeric = (prefix, value) => {
    const match = requirement.match(new RegExp(`^${prefix}(>=|>|<=|<|=)(-?\\d+)$`));
    if (!match) return null;
    const target = Number(match[2]);
    const ok = ({ '>=': value >= target, '>': value > target, '<=': value <= target,
      '<': value < target, '=': value === target })[match[1]];
    return { ok, reason: `${prefix.replaceAll(':', ' ')} ${match[1]} ${target}` };
  };

  let result = numeric('cash', state.cash)
    ?? numeric('markka', state.markka)
    ?? numeric('intel', state.intel)
    ?? numeric('deployed-crew', deployedCrew(state, data).length)
    // Who can take the board: the crew, and Aatami while he still fights (answer 24).
    ?? numeric('fighters', fighters(state, data).length)
    ?? numeric('crew-critical', Object.values(state.crewStatus).filter(x => x.critical).length)
    // v4.92, a way home: who never made it back, and who the police took.
    ?? numeric('missing-crew', state.recruited.filter(id => state.crewStatus[id]?.status === 'missing').length)
    ?? numeric('arrested-crew', state.arrestedCrew.length)
    ?? numeric('fights-today', data?.content ? fightsToday(state, data.content) : 0);
  if (result) return result;
  if (requirement === 'chapter-goal-met') return { ok: chapterGoalMet(state), reason: 'the chapter goal is not met' };

  let match = requirement.match(/^stock:([^><=]+)(>=|>|<=|<|=)(-?\d+)$/);
  if (match) {
    const value = state.stock[match[1]] ?? 0;
    return numeric(`stock:${match[1]}`, value);
  }
  match = requirement.match(/^relationship:([^><=]+)(>=|>|<=|<|=)(-?\d+)$/);
  if (match) {
    const value = state.relationships[relKey(match[1])] ?? 0;
    return numeric(`relationship:${match[1]}`, value);
  }
  match = requirement.match(/^obligation:([^><=]+)(>=|>|<=|<|=)(-?\d+)$/);
  if (match) {
    const value = state.obligations[relKey(match[1])] ?? 0;
    return numeric(`obligation:${match[1]}`, value);
  }
  if (requirement.startsWith('flag:')) {
    const id = requirement.slice(5);
    return { ok: state.flags.includes(id), reason: `requires ${id.replaceAll('-', ' ')}` };
  }
  if (requirement.startsWith('crew-role:')) {
    const role = requirement.slice(10);
    const ok = deployedCrew(state, data).some(member => member.role === role);
    return { ok, reason: `requires a ${role}` };
  }
  return { ok: true, reason: requirement };
}

export function choiceStatus(choice, state, data) {
  const checks = (choice.requirements ?? []).map(req => requirementStatus(req, state, data));
  return {
    ok: checks.every(check => check.ok),
    reasons: checks.filter(check => !check.ok).map(check => check.reason),
  };
}

export function deterministicRoll(state, label) {
  const text = `${state.contentId}|${state.scheduleIndex}|${label}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function addLog(state, message) {
  state.logs.unshift(message);
  state.logs.length = Math.min(24, state.logs.length);
}

function adjustNumber(state, key, delta) {
  state[key] = Math.max(0, (state[key] ?? 0) + delta);
}

function reveal(state, id) {
  if (id.startsWith('offer-')) addUnique(state.revealedOffers, id);
  else if (id.startsWith('mission-')) addUnique(state.revealedMissions, id);
  else if (id.startsWith('enc-')) addUnique(state.revealedEncounters, id);
  else addUnique(state.flags, `revealed-${id}`);
}

/** The Pasila ending the run points at right now, with no side effects
 *  (H8: the four endings are the ERA's result; until chapter 4 exists the
 *  game shows where the road points instead of ending on day 7). */
export function forecastEnding(state, data) {
  const deaths = Object.values(state.crewStatus).filter(x => x.status === 'dead' || x.critical).length;
  let id;
  if (deaths) id = 'pasila-haunted';
  else if (state.exitFund >= 180 && state.debt > 250) id = 'pasila-expensive';
  else if (state.exitFund >= 180 && state.debt <= 250 && state.recruited.length >= 2) id = 'pasila-nearer';
  else id = 'pasila-deferred';
  return data.content.endings.find(item => item.id === id) ?? null;
}

function chooseEnding(state, data) {
  const unresolved = Object.entries(state.crewStatus).filter(([, status]) => status.critical);
  for (const [id, status] of unresolved) {
    status.critical = false;
    status.status = 'dead';
    addUnique(state.flags, `unresolved-critical:${id}`);
    addLog(state, `${crewRecord(state, data, id)?.name ?? id}'s clearly flagged critical wound was not treated before final settlement.`);
  }
  const deaths = Object.values(state.crewStatus).filter(x => x.status === 'dead').length;
  let id;
  if (deaths) id = 'pasila-haunted';
  else if (state.exitFund >= 180 && state.debt > 250) id = 'pasila-expensive';
  else if (state.exitFund >= 180 && state.debt <= 250 && state.recruited.length >= 2) id = 'pasila-nearer';
  else id = 'pasila-deferred';
  state.endingId = id;
  return data.content.endings.find(item => item.id === id);
}

export function applyEffects(state, effects, data, label = 'choice') {
  const outcome = { messages: [], startBattle: null, ending: null };
  const message = text => { outcome.messages.push(text); addLog(state, text); };
  for (const effect of effects ?? []) {
    let match;
    if ((match = effect.match(/^(cash|markka|debt|intel|exit-fund):([+-]?\d+)$/))) {
      const key = ({ cash: 'cash', markka: 'markka', debt: 'debt', intel: 'intel', 'exit-fund': 'exitFund' })[match[1]];
      adjustNumber(state, key, Number(match[2]));
      continue;
    }
    if ((match = effect.match(/^stock:([^:]+):([+-]?\d+)$/))) {
      state.stock[match[1]] = Math.max(0, (state.stock[match[1]] ?? 0) + Number(match[2]));
      continue;
    }
    if ((match = effect.match(/^(relationship|obligation):([^:]+):([+-]?\d+)$/))) {
      const bucket = match[1] === 'relationship' ? state.relationships : state.obligations;
      const key = relKey(match[2]);
      bucket[key] = (bucket[key] ?? 0) + Number(match[3]);
      continue;
    }
    if ((match = effect.match(/^pressure:([^:]+):([+-]?\d+)$/))) {
      state.pressure[match[1]] = clamp((state.pressure[match[1]] ?? 0) + Number(match[2]), 0, 3);
      continue;
    }
    if (effect.startsWith('flag:')) { addUnique(state.flags, effect.slice(5)); continue; }
    // v4.92, a way home. A missing crew member comes home hurt; an arrested one
    // is bailed back onto the roster. Each brings back the first who was lost.
    if (effect === 'rescue:missing') {
      const id = state.recruited.find(x => crewState(state, x) === 'missing');
      if (!id || !moveCrew(state, data, id, 'rescue').ok) continue;
      addUnique(state.flags, `memory:found:${id}`);
      message(`${crewRecord(state, data, id)?.name ?? id} is home. Hurt, but home.`);
      continue;
    }
    if (effect === 'bail:arrested') {
      const id = state.arrestedCrew[0];
      if (!id || !moveCrew(state, data, id, 'bail').ok) continue;
      addUnique(state.flags, `memory:bailed:${id}`);
      message(`${crewRecord(state, data, id)?.name ?? id} walks out of the station in Pasila. Back on the roster.`);
      continue;
    }
    if (effect.startsWith('memory:')) { addUnique(state.flags, effect); continue; }
    if (effect.startsWith('reveal:')) { reveal(state, effect.slice(7)); continue; }
    // Authored grants may repeat: a second pipe is a second pipe (§8).
    if (effect.startsWith('equipment:+')) { addEquipment(state, effect.slice(11)); continue; }
    if (effect.startsWith('recruit:') || effect.startsWith('recruit-temporary:')) {
      const temporary = effect.startsWith('recruit-temporary:');
      const id = effect.slice(temporary ? 18 : 8);
      addUnique(temporary ? state.temporaryCrew : state.recruited, id);
      addUnique(state.deployed, id);
      message(`${data.crew.get(id)?.name ?? id} joins the working roster${temporary ? ' for one job' : ''}.`);
      continue;
    }
    if ((match = effect.match(/^(complete|partial|fail):(.+)$/))) {
      state.missionStatus[match[2]] = match[1];
      continue;
    }
    if (effect === 'convert-markka:all' || effect.startsWith('convert-markka:')) {
      const amount = effect.endsWith(':all') ? state.markka : Math.min(state.markka, Number(effect.split(':')[1]));
      const euros = Math.floor((amount / 5.94573) * 100) / 100;
      state.markka -= amount;
      state.cash = Math.round((state.cash + euros) * 100) / 100;
      message(`${amount} mk becomes €${euros.toFixed(2)} at the fixed rate.`);
      continue;
    }
    if (effect.startsWith('start-battle:') || effect.startsWith('start-negotiation:')) {
      outcome.startBattle = effect.split(':')[1];
      if (effect.startsWith('start-negotiation:')) addUnique(state.flags, 'battle-negotiation-open');
      continue;
    }
    if (effect.startsWith('battle-on-failure:')) {
      const battleId = effect.split(':')[1];
      const chance = clamp(0.35 + state.intel * 0.15, 0.35, 0.8);
      if (deterministicRoll(state, `${label}:fixer`) < chance) {
        state.missionStatus['mission-bear-path'] = 'complete';
        adjustNumber(state, 'cash', 70);
        message('The fixer makes the warning legible. The handover ends without a fight.');
      } else {
        outcome.startBattle = battleId;
        message('The warning lands badly. Both crews take their rows.');
      }
      continue;
    }
    if (effect === 'resolve:sabotage-wager-45') {
      if (deterministicRoll(state, `${label}:sabotage`) < 0.45) {
        addUnique(state.flags, 'toko-sabotage-succeeded');
        adjustNumber(state, 'intel', 1);
        message('The wager lands. One competing route goes quiet for a night.');
      } else {
        state.relationships.toko = (state.relationships.toko ?? 0) - 1;
        state.pressure.vaasankatu = clamp((state.pressure.vaasankatu ?? 0) + 1, 0, 3);
        message('The wager fails in public. Toko writes the loss beside Aatami’s name.');
      }
      continue;
    }
    if (effect === 'resolve:fixer-negotiation') continue;
    if (effect === 'resolve-critical-wound:one') {
      const target = Object.keys(state.crewStatus).find(id => crewState(state, id) === 'critical');
      if (target) moveCrew(state, data, target, 'treat');
      continue;
    }
    if (effect === 'resolve-ending:best-match') {
      outcome.ending = chooseEnding(state, data);
      continue;
    }
    if (effect === 'forecast-ending:best-match') {
      const ending = forecastEnding(state, data);
      if (ending) addUnique(state.flags, `memory:pasila-forecast:${ending.id}`);
      continue;
    }
    if (effect === 'chapter-ending:attempt') {
      const reason = attemptChapterEnding(state, data);
      if (reason) message(`The shipment cannot run: ${reason.replaceAll('-', ' ')}.`);
      continue;
    }
    if (effect === 'chapter-ending:missed') {
      if (!state.chapterCleared) {
        state.chapterCleared = true;
        state.lastEndingOutcome = 'missed';
        addUnique(state.flags, `memory:chapter-cleared:${state.chapter}:missed`);
        message('The boat leaves without Aatami on it.');
      }
      continue;
    }
    if (effect === 'battle:avoided') { addUnique(state.flags, 'battle-karhupuisto-avoided'); continue; }
    if (effect.startsWith('opponent-nerve:')) {
      state.battleOpeningNerve = Number(effect.split(':')[1]);
      continue;
    }
    if (effect.startsWith('service:') || effect.startsWith('market-history:')
      || effect.startsWith('crew-outcome:') || effect.startsWith('debt-holder-memory:')
      || effect.endsWith(':advantage') || effect.startsWith('label:')) {
      addUnique(state.flags, effect);
    }
  }
  state.lastOutcome = outcome.messages;
  return outcome;
}

export function chooseEncounter(state, encounter, choice, data) {
  if (state.choices[encounter.id]) return { ok: false, reason: 'already-resolved' };
  const status = choiceStatus(choice, state, data);
  if (!status.ok) return { ok: false, reason: status.reasons.join(', ') };
  const result = applyEffects(state, choice.effects, data, `${encounter.id}:${choice.id}`);
  state.choices[encounter.id] = choice.id;
  addUnique(state.revealedEncounters, encounter.id);
  addLog(state, `${encounter.id}: ${choice.label}`);
  return { ok: true, ...result };
}

function settleNight(state, content, day) {
  const settlement = content.campaign.settlement;
  state.debt += settlement.nightly_interest_eur;
  const wages = state.recruited.reduce((sum, id) => {
    const member = content.crew.find(item => item.id === id) ?? state.hiredCrew[id];
    return sum + (member?.wage_eur ?? 0);
  }, 0);
  const paid = Math.min(state.cash, wages);
  state.cash -= paid;
  if (paid < wages) {
    state.debt += wages - paid;
    addUnique(state.flags, `wages-short-day-${day}`);
    addLog(state, `Night ${day}: €${wages - paid} in unpaid wages becomes a visible obligation.`);
  } else if (wages) {
    addLog(state, `Night ${day}: €${wages} settles the crew wages.`);
  }
  const due = settlement.required_payments.find(item => item.day === day);
  if (due) addLog(state, `A debt demand of €${due.amount_eur} is now due; it does not end the game invisibly.`);
}

export function advanceSchedule(state, data) {
  const slot = currentSchedule(state, data.content);
  if (slot?.block === 'night') settleNight(state, data.content, slot.day);
  state.scheduleIndex += 1;
  routeThisBlock(state);
  state.lastOutcome = null;
  state.mode = 'route';
  const next = currentSchedule(state, data.content);
  // M2: the story moving on moves the LEAD, not Aatami. Presence changes only
  // through an explicit journey (journey.js) — the schedule used to teleport
  // him to the next lead, which made the map's travel meaningless.
  if (next?.encounter_id) addUnique(state.revealedEncounters, next.encounter_id);
  return next;
}

export function offerPrice(offer) {
  if (offer.quote.kind === 'exact') return offer.quote.eur;
  return Math.round((offer.quote.min_eur + offer.quote.max_eur) / 2);
}

export function transactOffer(state, offer, side = offer.side) {
  const price = offerPrice(offer);
  if (side === 'buy') {
    if (state.cash < price) return { ok: false, message: 'Not enough euro cash.' };
    if ((state.stock.piri ?? 0) >= state.capacity) return { ok: false, message: 'No free carrying capacity.' };
    const late = tradeBlocker(state, offer.anchor_id);
    if (late) return { ok: false, message: late };
    chargeTrade(state, offer.anchor_id);
    state.cash -= price;
    state.stock.piri = (state.stock.piri ?? 0) + 1;
    addLog(state, `Ledger: bought one abstract pack at ${offer.anchor_id} for €${price}.`);
    return { ok: true, message: `One pack added for €${price}.` };
  }
  if ((state.stock.piri ?? 0) < 1) return { ok: false, message: 'No stock to sell.' };
  const late = tradeBlocker(state, offer.anchor_id);
  if (late) return { ok: false, message: late };
  chargeTrade(state, offer.anchor_id);
  state.stock.piri -= 1;
  state.cash += price;
  recordChapterIncome(state, price);
  addLog(state, `Ledger: sold one abstract pack at ${offer.anchor_id} for €${price}.`);
  return { ok: true, message: `One pack moved for €${price}.` };
}

// A route's shared capacity is a block's: ordinary traffic is rolled for the
// block, and the hidden loads sent in it stay counted until the block turns.
// Until the chapter bot (G4) found it, re-pinning a route emptied the count,
// so one Piritori visit could buy, send and re-pin without end: €3,400
// counted toward the €400 inside a single block, D002's time never touched.
const routeOrdinary = (state, path) => 1 + Math.floor(deterministicRoll(state, `route:${path.join('>')}`) * 3);
function routeThisBlock(state) {
  const route = state.route;
  if (route && route.block !== state.scheduleIndex) {
    route.block = state.scheduleIndex;
    route.ordinary = routeOrdinary(state, route.path);
    route.hidden = 0;
  }
  return route;
}

export function commitRoute(state, path) {
  if (!path || path.length < 2) return { ok: false, message: 'Choose two connected anchors.' };
  const ordinary = routeOrdinary(state, path);
  const hidden = routeThisBlock(state)?.hidden ?? 0;
  state.route = { path, capacity: 4, ordinary, hidden, block: state.scheduleIndex };
  addLog(state, `A route is pinned through ${path.length} public anchors; ${ordinary}/4 places are already ordinary traffic.`);
  return { ok: true, message: 'Route pinned to the public graph.' };
}

export function sendOnRoute(state, data) {
  const route = routeThisBlock(state);
  if (!route) return { ok: false, message: 'Pin a route first.' };
  if ((state.stock.piri ?? 0) < 1) return { ok: false, message: 'No stock to assign.' };
  if (route.ordinary + route.hidden >= route.capacity) return { ok: false, message: 'The ordinary service is full this block.' };
  const destination = route.path.at(-1);
  const offer = data.content.market_offers.find(item => item.anchor_id === destination
    && item.side === 'sell' && state.revealedOffers.includes(item.id));
  if (!offer) return { ok: false, message: 'No known buyer at the destination.' };
  const receipt = offerPrice(offer);
  state.stock.piri -= 1;
  state.cash += receipt;
  recordChapterIncome(state, receipt);
  route.hidden += 1;
  if (route.ordinary < 2) state.pressure[destination] = clamp((state.pressure[destination] ?? 0) + 1, 0, 3);
  addLog(state, `One hidden load shares ${route.ordinary} ordinary journeys and settles at ${destination}.`);
  return { ok: true, message: `The route settles one pack for €${receipt}.` };
}
