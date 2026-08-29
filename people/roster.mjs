/**
 * The hireling generator — who walks in when you need somebody.
 *
 * Answers `COMBAT.md` §10.2, which is open: *how many traits does a generated
 * hireling carry — two or three worth reading, or a longer tail?* That is not a
 * question you can settle by argument. You generate rosters, read them, and see
 * at what point a person stops being a person and becomes a list. `people/
 * tools/roster-sheet.mjs` prints them for exactly that.
 *
 * WHAT BINDS THIS, all of it already ruled:
 *
 *   §9.12  Nobody has "a class". TWELVE APTITUDES in one pool — the old six
 *          (what somebody is FOR) and the six combat roles (what they DO in a
 *          fight). Most hold two, some three. The third is breadth against
 *          depth, not a strict gain. Appearance follows the FIRST.
 *   §7.1   Named characters are rare and authored. EVERYONE ELSE IS GENERATED
 *          and genuinely expendable; their interest comes from traits worth
 *          reading, not from authorship.
 *   §7.2   A career is about ten fights, then they retire or die. The roster is
 *          a conveyor belt, not a collection.
 *   §5.2   AN ITEM CHANGES WHAT YOU CAN DO. IT DOES NOT ADD A MODIFIER YOU
 *          COMPUTE — "and it applies to people too". So every trait here is a
 *          behaviour or a permission. None of them is a percentage, and there is
 *          nowhere in the shape to put one.
 *   LOCKS §9.2  Ethnicity or nationality is never a combat class, morality
 *          shorthand or a silhouette. The name pool is mixed because Kallio in
 *          2003 was, and **no name touches any aptitude, trait or stat.** Names
 *          are drawn from a separate roll that nothing else reads.
 *
 * Deterministic from a seed, like the market: the same seed is the same people,
 * a test can assert one, and nobody re-rolls a roster by reloading.
 */

// ── seeded ──────────────────────────────────────────────────────────────────
function hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
const rnd = (...parts) => {
  let t = hash(parts.join('|'))();
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr, ...seed) => arr[Math.floor(rnd(...seed) * arr.length) % arr.length];

// ── the twelve aptitudes ────────────────────────────────────────────────────
// `for` is what they are for; `does` is the verb it puts in a fight. Both are
// written out because §9.12's whole point is that the two vocabularies are not
// competing — a driver who can shoot is the ordinary case.
export const APTITUDES = {
  runner: { kind: 'street', for: 'moving product without being the one holding it' },
  muscle: { kind: 'street', for: 'being the reason a conversation stays a conversation' },
  watcher: { kind: 'street', for: 'sitting somewhere for six hours and noticing' },
  fixer: { kind: 'street', for: 'knowing who to ring' },
  driver: { kind: 'street', for: 'getting four people out of somewhere' },
  local: { kind: 'street', for: 'being from here, which is not a skill until it is' },
  bruiser: { kind: 'fight', does: 'closes and keeps them there' },
  anchor: { kind: 'fight', does: 'holds a doorway so nobody flanks' },
  blade: { kind: 'fight', does: 'ends somebody who is already hurt' },
  shooter: { kind: 'fight', does: 'reaches the back row' },
  spotter: { kind: 'fight', does: 'calls what is about to happen, one beat early' },
  courier: { kind: 'fight', does: 'crosses the board and is not where you left them' },
};
const APT_KEYS = Object.keys(APTITUDES);

// ── traits ──────────────────────────────────────────────────────────────────
// EVERY ONE IS A BEHAVIOUR OR A PERMISSION (§5.2). Not one is a number.
// `tag` groups them so the generator does not hand somebody two traits that are
// the same observation twice.
export const TRAITS = [
  // nerve
  { id: 'first_in', tag: 'nerve', text: 'goes first, whether or not you asked' },
  { id: 'freezes', tag: 'nerve', text: 'freezes the first time a gun comes out' },
  { id: 'wont_run', tag: 'nerve', text: 'will not withdraw while anyone is still down' },
  { id: 'leaves', tag: 'nerve', text: 'leaves when it turns, and is not sorry' },
  // the street
  { id: 'known_hakaniemi', tag: 'known', text: 'known at Hakaniemi — the market talks to them' },
  { id: 'known_harbour', tag: 'known', text: 'known at the harbour, and not fondly' },
  { id: 'known_police', tag: 'known', text: 'police know the face; a stop lasts longer' },
  { id: 'invisible', tag: 'known', text: 'nobody remembers them, which is its own talent' },
  // habits
  { id: 'drinks', tag: 'habit', text: 'drinks the profit, and drinks it here' },
  { id: 'never_drinks', tag: 'habit', text: 'does not drink, and stands out at a table that does' },
  { id: 'smokes_up', tag: 'habit', text: 'turns up already somewhere else' },
  { id: 'early', tag: 'habit', text: 'is always there before you are' },
  { id: 'late', tag: 'habit', text: 'is late, and it has cost something before' },
  // ties
  { id: 'sends_money', tag: 'ties', text: 'sends money home and will not miss a week' },
  { id: 'kid', tag: 'ties', text: 'has a kid in Vallila and a reason to get out' },
  { id: 'nobody', tag: 'ties', text: 'has nobody, and takes the jobs that show it' },
  { id: 'brother_inside', tag: 'ties', text: 'brother is inside; a name gets a reaction' },
  // history
  { id: 'did_time', tag: 'history', text: 'did eighteen months and will not go back' },
  { id: 'conscript', tag: 'history', text: 'army taught them to hold a line and nothing else' },
  { id: 'boxed', tag: 'history', text: 'boxed at Brahen kenttä, badly, for years' },
  { id: 'was_a_nurse', tag: 'history', text: 'was a nurse once and still acts like one' },
  { id: 'trade', tag: 'history', text: 'has a trade and could stop doing this tomorrow' },
  // talk
  { id: 'talks_police', tag: 'talk', text: 'can talk to police without it getting worse' },
  { id: 'cannot_lie', tag: 'talk', text: 'cannot lie convincingly, and knows it' },
  { id: 'threatens_well', tag: 'talk', text: 'threatens well enough that it usually stops there' },
  { id: 'listens', tag: 'talk', text: 'listens, and repeats it back to you later' },
  { id: 'no_finnish', tag: 'talk', text: 'little Finnish — some doors open, others do not' },
  // work
  { id: 'counts', tag: 'work', text: 'counts everything twice and is never short' },
  { id: 'skims', tag: 'work', text: 'skims, small enough that you might not mind' },
  { id: 'carries_more', tag: 'work', text: 'will carry more than is sensible if asked' },
  { id: 'asks_why', tag: 'work', text: 'asks what the job is before agreeing to it' },
  { id: 'no_questions', tag: 'work', text: 'never asks what the job is' },
  // body
  { id: 'bad_knee', tag: 'body', text: 'bad knee — stairs and running are a decision' },
  { id: 'big', tag: 'body', text: 'big enough that rooms rearrange themselves' },
  { id: 'small', tag: 'body', text: 'small, quick, and underestimated on purpose' },
  { id: 'doesnt_sleep', tag: 'body', text: 'does not sleep much; the night shift is free' },
];

// ── names ───────────────────────────────────────────────────────────────────
// Kallio in 2003. The pool is mixed because the neighbourhood was, and it is
// rolled from a SEPARATE seed that no aptitude, trait or stat ever reads —
// DESIGN_LOCKS §9.2, made structural rather than promised.
//
// Origin-paired, not two independent pools. This file's own comment used to
// claim "both halves come from the one pool" while `FIRST`/`LAST` were two
// FLAT lists drawn independently — `LAST` held nothing but Finnish surnames,
// so anyone whose first name landed non-Finnish (`Ahmed`, `Nadia`, `Goran`…)
// was guaranteed a Finnish family name every single time. That is exactly
// the failure `crew_generator.gd`'s own comment on `GIVEN`/`FAMILY` warns
// about — "the randomiser would quietly turn the neighbourhood Finnish over
// a long campaign" — except here it wasn't quiet or gradual, it was 100% of
// the time from the first roll. `GIVEN`/`FAMILY` below are that file's exact
// tables (`crew_generator.gd`, diacritics intact — Latin Extended-A, the
// same font this build already relies on for the authored cast), so a first
// and a family name are drawn from the SAME origin, and the two halves
// really are the one pool `_name_from()`'s comment describes.
export const GIVEN = {
  fi: ['Aino', 'Eero', 'Hannele', 'Jouni', 'Kirsti', 'Lasse', 'Marja',
    'Olli', 'Pirjo', 'Reijo', 'Sanna', 'Tuomas', 'Ulla', 'Veikko'],
  so: ['Abdi', 'Ayaan', 'Farah', 'Hodan', 'Idil', 'Nasra', 'Yusuf'],
  vi: ['Anh', 'Bao', 'Hien', 'Lan', 'Minh', 'Quang', 'Thuy'],
  yu: ['Boris', 'Dragan', 'Ivana', 'Milena', 'Nikola', 'Vesna', 'Zoran'],
  ee: ['Kadri', 'Maarja', 'Priit', 'Tarmo', 'Ülle'],
  ru: ['Galina', 'Igor', 'Ludmila', 'Sergei', 'Tatjana'],
};
const FAMILY = {
  fi: ['Aaltonen', 'Heikkilä', 'Järvinen', 'Kinnunen', 'Laine', 'Mäkelä',
    'Nieminen', 'Peltola', 'Rantanen', 'Saarinen', 'Toivonen', 'Virtanen'],
  so: ['Ahmed', 'Dirie', 'Hassan', 'Jama', 'Osman', 'Warsame'],
  vi: ['Bui', 'Dang', 'Ho', 'Le', 'Pham', 'Tran', 'Vu'],
  yu: ['Babić', 'Ilić', 'Jovanović', 'Kovač', 'Popović', 'Savić'],
  ee: ['Kask', 'Lepik', 'Mägi', 'Saar', 'Tamm'],
  ru: ['Ivanov', 'Morozov', 'Petrov', 'Smirnov', 'Volkov'],
};
const ORIGINS = Object.keys(GIVEN);
// A street name is not everybody's. It arrives with reputation, so it is more
// likely on somebody who has already done a few fights.
const NICK = [
  'Kurvi', 'Pikku', 'Lankku', 'Tohtori', 'Rusina', 'Sähkö', 'Nappi', 'Kelmi',
  'Pastori', 'Rouva', 'Kettu', 'Peltsi', 'Musta', 'Hiiri', 'Vinkki', 'Pomo',
];

/** One origin, then a given and a family name from THAT origin's pool —
 *  `_name_from()`'s own shape. Never draw `GIVEN`/`FAMILY` separately. */
function pairedName(...seed) {
  const origin = pick(ORIGINS, ...seed, 'origin');
  return `${pick(GIVEN[origin], ...seed, 'first')} ${pick(FAMILY[origin], ...seed, 'last')}`;
}

/**
 * A first + family name from a stable id, with nothing else attached.
 *
 * For the SLICE's six named crew slots, not the hiring pool — they carry a
 * role, stats and a recruit encounter already, and lost their authored
 * `name` field when `COMBAT.md` §7.1 moved names to generation (2026-08-27).
 * `hireling()` needs a numeric index and a trait count; a crew slot has
 * neither, so this is the origin-paired name draw alone, keyed on whatever
 * string the caller has to hand — `id` for a crew slot, and it produces the
 * same person every time for the same id, which is the property a
 * recurring character needs.
 */
export function nameFrom(seed) {
  return pairedName(seed);
}

// ── generate ────────────────────────────────────────────────────────────────
/**
 * @param {string} seed   campaign seed
 * @param {number} i      which hireling — stable, so person 3 is always person 3
 * @param {object} o      {traits} how many traits to roll (the open question)
 */
export function hireling(seed, i, o = {}) {
  const s = (...p) => rnd(seed, 'person', i, ...p);

  // Aptitudes: two, sometimes three. §9.12 — the third is breadth against
  // depth, so it is a minority rather than the reward for a good roll.
  const three = s('n') < 0.28;
  const apts = [];
  for (let k = 0; apts.length < (three ? 3 : 2) && k < 40; k++) {
    const a = pick(APT_KEYS, seed, 'apt', i, k);
    if (!apts.includes(a)) apts.push(a);
  }

  // Traits: TWO, and a minority at THREE — the same shape as aptitudes, and
  // the same 28%. That is the answer to COMBAT.md §10.2, and it was read rather
  // than argued: at one a person is a fact and not a person; at two you get a
  // contradiction you can hold (turns up early, leaves when it turns); at three
  // the extra one usually supplies the REASON for the other two; at five it
  // collapses, because nothing dominates and the contradictions stop meaning
  // anything. `--compare` in people/tools/roster-sheet.mjs prints the same four
  // people at 1/2/3/5 so anyone can check that for themselves.
  const want = o.traits ?? (s('tn') < 0.28 ? 3 : 2);
  const traits = [], usedTags = new Set();
  for (let k = 0; traits.length < want && k < 80; k++) {
    const t = TRAITS[Math.floor(s('trait', k) * TRAITS.length) % TRAITS.length];
    if (usedTags.has(t.tag)) continue;
    usedTags.add(t.tag);
    traits.push(t);
  }

  // Career. §7.2: about ten fights, then out. Most walk in fresh; some have
  // already spent part of a life somewhere else.
  const fights = Math.floor(s('fights') * s('fights2') * 9);
  const CAREER = 10;

  const nick = s('hasnick') < 0.12 + fights * 0.04;
  return {
    id: `${seed}:${i}`,
    name: pairedName(seed, i),
    nick: nick ? pick(NICK, seed, 'nick', i) : null,
    aptitudes: apts,
    look: apts[0],                       // §9.12: appearance follows the first
    traits,
    fights,
    left: CAREER - fights,
    // Not a stat — a description of where they are on the conveyor belt.
    stage: fights === 0 ? 'new' : fights < 4 ? 'working' : fights < 8 ? 'experienced' : 'nearly out',
  };
}

export function roster(seed, n, o = {}) {
  return Array.from({ length: n }, (_, i) => hireling(seed, i, o));
}
