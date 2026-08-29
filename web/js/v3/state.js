import { hiringPool } from '../../../people/hiring.mjs';
import { rand01 } from '../../../market/model.mjs';

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
  const crewStatus = Object.fromEntries(content.crew.map(member => [member.id, {
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
    logs: ['Day 1. Piritori is the only corner that already knows Aatami.'],
    lastOutcome: null,
  };
  syncChapterFromContent(state, content);
  return state;
}

export function restoreState(raw, content) {
  if (!raw || raw.version !== STATE_VERSION || raw.contentId !== content.id) return createState(content);
  const fresh = createState(content);
  return {
    ...fresh,
    ...raw,
    stock: { ...fresh.stock, ...(raw.stock ?? {}) },
    relationships: { ...fresh.relationships, ...(raw.relationships ?? {}) },
    pressure: { ...fresh.pressure, ...(raw.pressure ?? {}) },
    obligations: { ...fresh.obligations, ...(raw.obligations ?? {}) },
    crewStatus: { ...fresh.crewStatus, ...(raw.crewStatus ?? {}) },
    hiredCrew: { ...fresh.hiredCrew, ...(raw.hiredCrew ?? {}) },
    crewFights: { ...fresh.crewFights, ...(raw.crewFights ?? {}) },
  };
}

export function saveState(state, storage = globalThis.localStorage) {
  storage?.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadState(content, storage = globalThis.localStorage) {
  try {
    return restoreState(JSON.parse(storage?.getItem(SAVE_KEY) ?? 'null'), content);
  } catch {
    return createState(content);
  }
}

export function currentSchedule(state, content) {
  return content.schedule[state.scheduleIndex] ?? null;
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
  return data.crew.get(id) ?? state.hiredCrew[id] ?? null;
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
 *  reached the ceiling and left this call: RETIRED, not dead. Godot's own
 *  loop does not special-case a crew member the police already took this
 *  same fight (`state.crewStatus[id].status === 'missing'`) — they still
 *  age, and can still be pushed into `retiredCrew` on top of already being
 *  gone. Kept exactly that way rather than added a check Godot doesn't have. */
export function ageCrew(state, data, deployedIds) {
  const left = [];
  for (const id of deployedIds) {
    if (isNamed(state, data, id) || state.retiredCrew.includes(id)) continue;
    state.crewFights[id] = fightsOf(state, id) + 1;
    if (fightsOf(state, id) >= CAREER_FIGHTS) {
      retireCrew(state, data, id);
      left.push(id);
    }
  }
  return left;
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
// economy, not a loadout screen. Godot has no equipment PURCHASE function
// anywhere either, despite `acquisition: 'market'` existing in content, so
// none is built here — `isPurchasable()` stays read-only informational, the
// same way `_add_spoils_lines()` only uses it for a "cannot be bought" tag.
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
  const paid = resaleAt(state, data, best);
  state.equipment.splice(best, 1);
  state.cash += paid;
  // Counted centrally (GDD run structure): a chapter cleared by earning
  // has to see every way of earning, and the fence is one of them —
  // `sell_loot()`'s own `record_chapter_income(paid)` call, and in fact
  // the ONLY place `record_chapter_income` is called from in the whole of
  // `game_state.gd` — market sales and mission payouts do not count
  // toward a chapter's money goal, however the comment there reads.
  recordChapterIncome(state, paid);
  addLog(state, `Fenced ${cap(equipmentId)} for €${paid}.`);
  return paid;
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

/** How many hands it takes for a container to move quietly. */
const OPERATION_IDEAL_CREW = 3;

/** Resolved from the seed and the chapter, like gear decay — a player who
 *  reloads to reroll a shipment is playing a different game from the one
 *  being built. THE PENALTY CANNOT BE MONEY (cash resets at a chapter
 *  boundary elsewhere in Godot; this build has no boundary to reset it at
 *  yet either, so the rule is carried forward on principle): what can be
 *  lost is what carries — gear and people. Likewise the reward: a payout
 *  would mean nothing here, so a clean run buys a built upgrade. */
function resolveOperation(state, data, ending) {
  const hands = state.recruited.length;
  const margin = hands / OPERATION_IDEAL_CREW;
  // Heat carried into the night makes it worse — connects §9.5 (police)
  // to the meta rather than leaving it a battle-only idea.
  const seen = state.arrestedCrew.length * 0.15;
  const roll = rand01(state.seed, 'operation', state.chapter) * 0.7 - 0.35;
  const score = margin - seen + roll;

  if (score >= 1.0) {
    if (ending.grants_upgrade) addUnique(state.upgrades, ending.grants_upgrade);
    return 'clean';
  }
  if (score >= 0.5) {
    // Something had to be left behind — the LAST thing in the stash, not
    // the worst; `equipment.remove_at(equipment.size() - 1)` in Godot.
    if (state.equipment.length) state.equipment.pop();
    return 'messy';
  }
  // Somebody did not come back. Costs a person — the only currency that
  // still means anything at a chapter boundary.
  const target = state.recruited.find(id => !isNamed(state, data, id));
  if (target) arrestCrew(state, data, target);
  return 'lost';
}

/** Run the ending, and turn the chapter over. An OPERATION rather than a
 *  battle: buying a shipment and moving it, not a fight — commerce is
 *  allowed to be the climax (the GDD ruling `attempt_chapter_ending()`'s
 *  own comment cites). Returns '' on success, or a reason it could not be
 *  attempted. */
export function attemptChapterEnding(state, data) {
  if (!chapterEndingAvailable(state, data)) return 'not-available';
  const ending = chapterEnding(state, data.content);
  const stake = ending.stake_eur ?? 0;
  if (state.cash < stake) return 'cannot-afford';
  if (ending.anchor_id && state.selectedAnchor !== ending.anchor_id) return 'wrong-place';

  state.cash -= stake;
  state.chapterCleared = true;
  state.lastEndingOutcome = resolveOperation(state, data, ending);
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
    ?? numeric('crew-critical', Object.values(state.crewStatus).filter(x => x.critical).length);
  if (result) return result;

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
      const target = Object.keys(state.crewStatus).find(id => state.crewStatus[id].critical);
      if (target) {
        state.crewStatus[target].critical = false;
        state.crewStatus[target].status = 'wounded';
        state.crewStatus[target].condition = Math.max(1, state.crewStatus[target].condition);
      }
      continue;
    }
    if (effect === 'resolve-ending:best-match') {
      outcome.ending = chooseEnding(state, data);
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
  state.lastOutcome = null;
  state.mode = 'route';
  const next = currentSchedule(state, data.content);
  if (next) {
    state.selectedAnchor = next.anchor_id;
    addUnique(state.revealedEncounters, next.encounter_id);
  }
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
    state.cash -= price;
    state.stock.piri = (state.stock.piri ?? 0) + 1;
    addLog(state, `Ledger: bought one abstract pack at ${offer.anchor_id} for €${price}.`);
    return { ok: true, message: `One pack added for €${price}.` };
  }
  if ((state.stock.piri ?? 0) < 1) return { ok: false, message: 'No stock to sell.' };
  state.stock.piri -= 1;
  state.cash += price;
  addLog(state, `Ledger: sold one abstract pack at ${offer.anchor_id} for €${price}.`);
  return { ok: true, message: `One pack moved for €${price}.` };
}

export function commitRoute(state, path) {
  if (!path || path.length < 2) return { ok: false, message: 'Choose two connected anchors.' };
  const ordinary = 1 + Math.floor(deterministicRoll(state, `route:${path.join('>')}`) * 3);
  state.route = { path, capacity: 4, ordinary, hidden: 0 };
  addLog(state, `A route is pinned through ${path.length} public anchors; ${ordinary}/4 places are already ordinary traffic.`);
  return { ok: true, message: 'Route pinned to the public graph.' };
}

export function sendOnRoute(state, data) {
  const route = state.route;
  if (!route) return { ok: false, message: 'Pin a route first.' };
  if ((state.stock.piri ?? 0) < 1) return { ok: false, message: 'No stock to assign.' };
  if (route.ordinary + route.hidden >= route.capacity) return { ok: false, message: 'The ordinary service is full this block.' };
  const destination = route.path.at(-1);
  const offer = data.content.market_offers.find(item => item.anchor_id === destination
    && item.side === 'sell' && state.revealedOffers.includes(item.id));
  if (!offer) return { ok: false, message: 'No known buyer at the destination.' };
  state.stock.piri -= 1;
  state.cash += offerPrice(offer);
  route.hidden += 1;
  if (route.ordinary < 2) state.pressure[destination] = clamp((state.pressure[destination] ?? 0) + 1, 0, 3);
  addLog(state, `One hidden load shares ${route.ordinary} ordinary journeys and settles at ${destination}.`);
  return { ok: true, message: `The route settles one pack for €${offerPrice(offer)}.` };
}
