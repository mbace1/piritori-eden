// The chapter turn (H7 of The Long Game, owner greenlight 2026-09-29).
//
// Owner, answer 22: weapons carry; cash and produce need not, and a chapter
// opens on a standard stake instead. That is the GDD persistence table
// (2026-08-22) read literally: what you built persists, what you were
// granted does not. `content.chapter_turn.rules` says what happens to each
// thing, one word each:
//   carry  - it crosses the boundary as it is
//   reset  - it goes back to nothing (stock) or to what is re-earned (unlocks)
//   stake  - cash: the chapter opens on `opening_cash_eur`, whatever you had
//
// The rules are data so they can be TESTED both ways (the owner: "let's test
// these") without touching this file. `turnPlan` reads the save and changes
// nothing; `turnChapter` applies it and is the only writer.
//
// Pure: no DOM, no clock. The browser and bare node share this file.

const ROWS = [
  { key: 'cash', label: 'Cash', read: s => s.cash, money: true },
  { key: 'stock', label: 'Stock', read: s => Object.values(s.stock ?? {}).reduce((a, b) => a + b, 0) },
  { key: 'gear', label: 'Weapons and gear', read: s => (s.equipment ?? []).length },
  { key: 'crew', label: 'Crew', read: s => (s.recruited ?? []).length },
  { key: 'relationships', label: 'Standing with people', read: s => Object.keys(s.relationships ?? {}).length },
  { key: 'upgrades', label: 'Built upgrades', read: s => (s.upgrades ?? []).length },
  { key: 'debt', label: 'Debt', read: s => s.debt, money: true },
  { key: 'obligations', label: 'Favours owed', read: s => Object.values(s.obligations ?? {}).filter(Boolean).length },
  { key: 'markka', label: 'Markka', read: s => s.markka },
  { key: 'exit_fund', label: 'Exit fund', read: s => s.exitFund, money: true },
  { key: 'mission_unlocks', label: 'Mission unlocks', read: s => (s.revealedMissions ?? []).length },
];

function rules(content) {
  return content?.chapter_turn?.rules ?? {};
}

/** One row per thing the rules name: what it is now, and what the next chapter opens with. */
export function turnPlan(state, content) {
  const r = rules(content);
  const stake = content?.chapter_turn?.opening_cash_eur ?? 0;
  return ROWS.filter(row => r[row.key]).map(row => {
    const now = row.read(state) ?? 0;
    const rule = r[row.key];
    const next = rule === 'carry' ? now : rule === 'stake' ? stake : 0;
    return { key: row.key, label: row.label, rule, now, next, money: Boolean(row.money) };
  });
}

/** Where the next chapter is authored, or null (the slice authors one). */
export function nextChapter(state, content) {
  return content?.chapters?.find(c => c.index === state.chapter + 1) ?? null;
}

/**
 * Turn the chapter over. Only after the chapter's ending has run. Applies the
 * rules, opens the next chapter's goal, and returns the plan it applied.
 */
export function turnChapter(state, content) {
  if (!state.chapterCleared) return { ok: false, reason: 'chapter-not-cleared' };
  const plan = turnPlan(state, content);
  const r = rules(content);
  if (r.cash === 'stake') state.cash = content.chapter_turn.opening_cash_eur ?? 0;
  if (r.cash === 'reset') state.cash = 0;
  if (r.stock === 'reset') state.stock = Object.fromEntries(Object.keys(state.stock ?? {}).map(k => [k, 0]));
  if (r.gear === 'reset') state.equipment = [];
  if (r.crew === 'reset') { state.recruited = []; state.deployed = []; }
  if (r.relationships === 'reset') state.relationships = Object.fromEntries(Object.keys(state.relationships ?? {}).map(k => [k, 0]));
  if (r.upgrades === 'reset') state.upgrades = [];
  if (r.debt === 'reset') state.debt = 0;
  if (r.obligations === 'reset') state.obligations = {};
  if (r.markka === 'reset') state.markka = 0;
  if (r.exit_fund === 'reset') state.exitFund = 0;
  if (r.mission_unlocks === 'reset') state.revealedMissions = [];
  // Help hired for one job does not follow you into the next chapter.
  state.temporaryCrew = [];

  const from = state.chapter;
  state.chapter += 1;
  state.chapterCleared = false;
  state.chapterEarned = 0;
  state.chapterLootTaken = 0;
  state.chapterFightsWon = 0;
  state.lastEndingOutcome = '';
  const def = nextChapter({ chapter: from }, content);
  const goal = def?.goal ?? {};
  if (['money', 'loot', 'fights'].includes(goal.type)) state.chapterGoal = goal.type;
  if (goal.threshold != null) state.chapterThreshold = goal.threshold;
  state.flags = Array.isArray(state.flags) ? state.flags : [];
  if (!state.flags.includes(`memory:chapter-turned:${from}`)) state.flags.push(`memory:chapter-turned:${from}`);
  state.logs = Array.isArray(state.logs) ? state.logs : [];
  state.logs.unshift(`Chapter ${state.chapter} opens on €${state.cash}.`);
  state.logs.length = Math.min(24, state.logs.length);
  return { ok: true, plan, authored: Boolean(def) };
}
