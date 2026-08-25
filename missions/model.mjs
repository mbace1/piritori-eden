/**
 * Missions — the shape, the clock and the triggers.
 *
 * `MISSIONS.md` is the argument; this is the part that produces numbers, so the
 * argument can be checked instead of admired. Pure ES module, no dependencies,
 * runs in bare node — same house pattern as `market/model.mjs` and
 * `people/roster.mjs`.
 *
 * It does three jobs:
 *
 *   cost(mission)      what a mission costs in both currencies — in-game
 *                      minutes and real minutes — and whether it fits.
 *   validate(mission)  everything MISSIONS.md claims a mission must be, as
 *                      findings rather than a boolean, so a partly-written
 *                      mission tells you which half is missing.
 *   fire(step, ctx)    which triggers fire at a step boundary, whether the
 *                      answer was present, and what an unanswered one costs.
 *
 * The one rule the whole file is built around, from §4: A TRIGGER DECIDES
 * WHETHER, EXPOSURE DECIDES HOW BADLY. Nothing here rolls dice. Given the same
 * mission and the same state it returns the same answer, because a risk system
 * the player cannot reason about is the thing the owner's note was arguing
 * against.
 */

/** §2: a block is about a third of a waking day, and the owner's "3h" is one. */
export const BLOCK_MINUTES = 180;

/** §2.2, the real-time budget. Not enforced by the game — enforced here. */
export const REAL_BUDGET = { min: 10, max: 15 };

/**
 * What each verb costs, in in-game minutes and in real minutes.
 *
 * The real column is the one that matters and the one nobody usually writes
 * down. It is "how long does a player spend on this screen", and the numbers
 * are deliberately blunt: a MEET is a conversation you read, a MOVE is a route
 * you picked, a HURT is a fight.
 *
 * A step that needs the ledger open is too big to be a step (§2.2), which is
 * why nothing here costs more than three real minutes except the battle.
 */
export const VERBS = {
  MEET: { igm: 25, real: 2.0, ends: false, note: 'be somewhere and talk' },
  MOVE: { igm: 30, real: 1.0, ends: false, note: 'get there; the route is the risk' },
  SELL: { igm: 40, real: 2.5, ends: false, note: 'shift stock fast, to whoever will take it' },
  TAKE: { igm: 20, real: 1.5, ends: false, note: 'pick something up' },
  HOLD: { igm: 45, real: 1.0, ends: false, note: 'be somewhere and stay' },
  FIND: { igm: 35, real: 2.5, ends: false, note: 'they are not where you were told' },
  LOSE: { igm: 25, real: 2.0, ends: true, note: 'you are being followed' },
  HURT: { igm: 30, real: 3.5, ends: true, note: 'the hit job — escalates to the board' },
};

/**
 * §4.2. Each trigger is a CONDITION, an ANSWER and a COST.
 *
 * `when` is a pure predicate over the step context. `answer` names the thing
 * that spends it — an item, a choice, or a state — and `answered` is how the
 * context says you have it. `cost` is what an unanswered one does, and it is a
 * KIND rather than a number: `exposure()` supplies the severity (§4.1), so the
 * same fired trigger is a look at a quiet stop and a lost bag at midday.
 */
export const TRIGGERS = {
  smell: {
    label: 'it can be smelled',
    when: c => c.carrying?.includes('weed') && c.transport === 'public',
    answer: 'a carbon-lined bag',
    answered: c => c.kit?.includes('carbon-bag'),
    cost: 'attention on the vehicle, and a stop',
  },
  bulk: {
    label: 'more than a coat hides',
    when: c => (c.units ?? 0) > 6,
    answer: 'a bag, a crew member, or a car',
    answered: c => c.kit?.includes('bag') || (c.crew ?? 1) > 1 || c.transport === 'car',
    cost: 'searched at the destination',
  },
  shape: {
    // The owner's "travel with a big crew and weapons and it arouses suspicion".
    // Its consequence is deliberately NOT police — see §4.2.
    label: 'a shape people notice',
    when: c => (c.crew ?? 1) >= 3 && c.armed && c.block !== 'night',
    answer: 'split up, go unarmed, or go at night',
    answered: c => false,
    cost: 'noticed and remembered — grievance, not police',
  },
  drunk: {
    label: 'drunk where there are eyes',
    when: c => c.condition === 'drunk' && c.block === 'day' && c.busy,
    answer: 'wait for night, or go somewhere quiet',
    answered: c => false,
    cost: 'a conversation you did not want',
  },
  stoned: {
    label: 'not sharp for this one',
    when: c => c.condition === 'stoned' && (c.verb === 'MEET' || c.verb === 'SELL'),
    answer: 'be clear for the step that matters',
    answered: c => false,
    cost: 'you misread the room; the terms worsen',
  },
  known: {
    label: 'they know your face here',
    when: c => (c.grievance ?? 0) > 0,
    answer: 'a different face — send a crew member',
    answered: c => Boolean(c.speaker && c.speaker !== 'aatami'),
    cost: 'they were waiting',
  },
  dry: {
    label: 'this lane is already fouled',
    when: c => c.verb === 'SELL' && (c.saturation ?? 0) > 6,
    answer: 'spread the load',
    answered: c => Boolean(c.spread),
    cost: 'no buyers, and the clock runs',
  },
};

/**
 * What a mission costs, in both currencies.
 *
 * Returns `fits` separately from the numbers so a caller can report WHY a
 * mission is over budget — "too long to play" and "too long to happen" are
 * different problems with different fixes.
 */
export function cost(mission) {
  const steps = mission.steps ?? [];
  let igm = 0, real = 0;
  const unknown = [];
  for (const s of steps) {
    const v = VERBS[s.verb];
    if (!v) { unknown.push(s.verb); continue; }
    igm += v.igm;
    real += v.real;
  }
  return {
    steps: steps.length,
    igm,
    real: Math.round(real * 10) / 10,
    unknown,
    fitsBlock: igm <= BLOCK_MINUTES,
    fitsReal: real <= REAL_BUDGET.max,
    // Under the floor is its own failure: a two-step mission inside the budget
    // is an errand, and §1 says a mission is a beat.
    thin: steps.length < 3 || real < REAL_BUDGET.min * 0.5,
  };
}

/**
 * Everything §1–§3 says a mission must be, as a list of findings.
 *
 * Findings rather than a boolean on purpose. A mission is usually written over
 * more than one sitting, and "invalid" tells you nothing about which half you
 * were in the middle of.
 */
export function validate(mission) {
  const out = [];
  const add = (level, what) => out.push({ level, what });

  if (!mission.id) add('error', 'no id');
  if (!mission.signal_encounter_id) add('error', '§1: no signal — a mission arrives through somebody');
  if (!mission.deadline?.day) add('error', '§1: no deadline');

  const outcomes = ['success_effects', 'partial_effects', 'failure_effects'];
  const missing = outcomes.filter(k => !Array.isArray(mission[k]) || mission[k].length === 0);
  if (missing.length) {
    add('error', `§1: needs three outcomes; missing ${missing.map(m => m.split('_')[0]).join(', ')}`);
  }

  const steps = mission.steps ?? [];
  if (steps.length === 0) {
    add('error', '§3: no steps — this is an errand, not a beat');
  } else if (steps.length < 3) {
    add('warn', `§1: ${steps.length} step(s); a beat is more than one place`);
  }

  const places = new Set(steps.map(s => s.anchor).filter(Boolean));
  if (steps.length && places.size < 2) {
    add('warn', '§1: every step is in the same place');
  }

  for (const [i, s] of steps.entries()) {
    if (!VERBS[s.verb]) add('error', `step ${i + 1}: '${s.verb}' is not a verb (§3)`);
    if (!s.anchor) add('error', `step ${i + 1}: no place`);
    // §3: "a step has alternatives or it is not a step."
    if (!Array.isArray(s.alternatives) || s.alternatives.length === 0) {
      add('warn', `step ${i + 1}: no alternative — a chain of single answers is a corridor (§3)`);
    }
    for (const t of s.triggers ?? []) {
      if (!TRIGGERS[t]) add('error', `step ${i + 1}: unknown trigger '${t}'`);
    }
  }

  // §5: a mission must never pay only cash.
  const eff = mission.success_effects ?? [];
  const onlyCash = eff.length > 0 && eff.every(e => /^(cash|purse|money)[:.]/.test(e));
  if (onlyCash) add('error', '§5: pays only cash — that is a side hustle with a cutscene');

  const c = cost(mission);
  if (c.unknown.length) add('error', `unknown verbs: ${[...new Set(c.unknown)].join(', ')}`);
  if (!c.fitsBlock) add('error', `§2: ${c.igm} in-game minutes over a ${BLOCK_MINUTES}-minute block`);
  if (!c.fitsReal) add('error', `§2.2: ~${c.real} real minutes over the ${REAL_BUDGET.max}-minute budget`);
  if (steps.length && c.thin) add('warn', `§2.2: ~${c.real} real minutes — thin for a beat`);

  return { ok: out.every(f => f.level !== 'error'), findings: out, cost: c };
}

/**
 * Which triggers fire at this step boundary, and what each one did.
 *
 * `exposure` is passed in rather than imported so this module stays dependency
 * free and the market can be stubbed in a test — but the intent is that the
 * caller hands it `market/model.mjs`'s own `exposure()`, because §4.1's whole
 * argument is that this is not a second risk system.
 *
 * `ctx.anchor` must be the anchor RECORD, not its id: `exposure()` reads the
 * place's roles to decide how many eyes are on it, and handed a string it
 * quietly profiles a place with no roles and returns the same severity
 * everywhere — which looks exactly like the trigger system working and is the
 * severity half silently switched off.
 */
export function fire(step, ctx, exposure = null) {
  const c = { ...ctx, verb: step.verb };
  const fired = [];
  for (const id of step.triggers ?? []) {
    const t = TRIGGERS[id];
    if (!t || !t.when(c)) continue;
    const answered = Boolean(t.answered(c));
    const e = answered || !exposure ? null : exposure(c.anchor ?? step.anchor, c);
    fired.push({
      id,
      label: t.label,
      answered,
      // §4.1: a mitigation nobody sees work is one nobody buys twice.
      text: answered
        ? `${t.label} — ${t.answer}, so nothing came of it`
        : `${t.label}: ${t.cost}`,
      answer: t.answer,
      band: e?.band ?? null,
      severity: e?.score ?? null,
    });
  }
  return {
    fired,
    // §3: only LOSE and HURT can end the block early, and only unanswered.
    ends: Boolean(VERBS[step.verb]?.ends) && fired.some(f => !f.answered),
    clean: fired.length === 0,
  };
}
