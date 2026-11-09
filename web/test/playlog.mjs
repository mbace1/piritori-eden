// The play log (v4.103): the recorder and the summary, in bare node.
//
//   node web/test/playlog.mjs
//
// A log is made by hand here, as a player would make it on a phone: a session,
// screens appearing, taps after a pause, a control seen and never pressed, a
// refusal, a pocketed phone and a second session. v4.104 adds a fight played
// on Night Shift's page, which writes into the same log.
import assert from 'node:assert/strict';
const { createPlaylog, summarise, report, FEATURES, PLAYLOG_KEY } = await import('../js/v3/playlog.js?v=2');
const { nameOf, fightScreen, watchFight } = await import('../crew-run/fight-log.js?v=2');

const store = new Map();
const storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
let clock = 1_000_000;
const now = () => clock;
const log = createPlaylog({ storage, now });
const at = s => { clock += s * 1000; };

// ── the recorder ───────────────────────────────────────────────────────────
log.add('session', { version: 'v4.103' });
log.seen({ screen: 'route', block: 0, label: 'DAY 1 · DAY', actions: ['open-encounter', 'plan-journey', 'buy-bowl', 'open-encounter'] });
log.seen({ screen: 'route', block: 0, label: 'DAY 1 · DAY', actions: ['open-encounter', 'plan-journey'] });
let e = log.entries();
assert.equal(e.filter(x => x.type === 'screen').length, 1, 'a re-render of the same screen is not a new screen');
assert.deepEqual(e.filter(x => x.type === 'offer').map(x => x.action), ['open-encounter', 'plan-journey', 'buy-bowl'], 'each control is offered once a block');
at(40); log.add('act', { action: 'open-encounter', screen: 'route', block: 0 });
log.seen({ screen: 'encounter', block: 0, label: 'DAY 1 · DAY', actions: ['choose'] });
at(95); log.add('act', { action: 'choose', screen: 'encounter', block: 0 });
log.add('toast', { message: 'No time left to trade this block. It comes back when the block turns.' });
log.seen({ screen: 'route', block: 1, label: 'DAY 1 · NIGHT', actions: ['trade', 'take-door', 'buy-bowl'] });
at(12); log.add('act', { action: 'trade', screen: 'route', block: 1 });
log.add('toast', { message: 'No time left to trade this block. It comes back when the block turns.' });
// the phone goes in a pocket for an hour
at(3600); log.add('session', { version: 'v4.103' });
log.seen({ screen: 'route', block: 1, label: 'DAY 1 · NIGHT', actions: ['take-door'] });
at(20); log.add('act', { action: 'take-door', screen: 'route', block: 1 });
log.add('error', { message: 'TypeError: x is undefined' });
assert.ok(store.get(PLAYLOG_KEY).length > 0, 'it is kept on the device');
assert.equal(createPlaylog({ storage, now }).entries().length, log.entries().length, 'and read back after a reload');

// ── the summary ────────────────────────────────────────────────────────────
const s = summarise(log.entries());
assert.equal(s.sessions, 2, 'the hour away is a second session');
assert.equal(Math.round(s.playedMs / 1000), 40 + 95 + 12 + 20, 'play time leaves out the hour away');
assert.deepEqual(s.slowest.map(w => [Math.round(w.ms / 1000), w.screen, w.action]), [[95, 'encounter', 'choose'], [40, 'route', 'open-encounter'], [20, 'route', 'take-door'], [12, 'route', 'trade']], 'the longest waits first, each with where it was');
assert.deepEqual(s.neverUsed, ["Toko's bowl"], 'Toko was on screen twice and never asked');
assert.ok(s.used.includes('market trade') && s.used.includes('a door (a free block)'));
assert.ok(s.neverOffered.includes('the fence'), 'and the fence never came up at all, which is a different finding');
assert.deepEqual(s.toasts, [{ message: 'No time left to trade this block. It comes back when the block turns.', count: 2 }]);
assert.equal(s.stopped.label, 'DAY 1 · NIGHT');
assert.equal(s.stopped.after, 'take-door');
assert.equal(s.furthest.label, 'DAY 1 · NIGHT');
assert.deepEqual(s.errors, ['TypeError: x is undefined']);

const text = report(s, { version: 'v4.103' });
for (const line of ['playtest notes', 'Played: 2 sessions', 'Slowest moments', "Offered, never used: Toko's bowl.", '×2 No time left to trade', 'Errors: TypeError']) {
  assert.ok(text.includes(line), `the notes say "${line}"`);
}
assert.match(report(summarise([])), /Nothing played on this device yet/);

// ── it stays small ─────────────────────────────────────────────────────────
const big = createPlaylog({ storage: { getItem: () => null, setItem: () => {} }, now });
for (let i = 0; i < 4100; i += 1) big.add('act', { action: 'trade' });
assert.equal(big.entries().length, 4000, 'the oldest go first past 4,000 entries');
big.clear();
assert.equal(big.entries().length, 0);
assert.ok(FEATURES.every(f => f.actions.length), 'every feature names its controls');

// ── v4.104: a fight, from Night Shift's page ──────────────────────────────
{
  const shared = new Map();
  const disk = { getItem: k => shared.get(k) ?? null, setItem: (k, v) => shared.set(k, String(v)) };
  let t = 5_000_000;
  const clockNow = () => t;
  const wait = s => { t += s * 1000; };
  const actOne = createPlaylog({ storage: disk, now: clockNow });
  actOne.add('session', { version: 'v4.104' });
  actOne.seen({ screen: 'route', block: 3, label: 'DAY 2 · NIGHT', actions: ['take-door'] });
  wait(8); actOne.add('act', { action: 'take-door', screen: 'route', block: 3 });
  wait(1); actOne.add('hidden'); // Act I's page goes; Night Shift loads

  // Night Shift: snapshots of the run and the fight, as the page publishes them.
  const listeners = [];
  const target = { addEventListener: (type, fn) => listeners.push([type, fn]), removeEventListener() {} };
  const phase = { textContent: 'JADE · YOUR TURN' };
  const doc = { ...target, hidden: false, getElementById: id => (id === 'phase' ? phase : null), querySelectorAll: () => [] };
  let run = { phase: 'prep', outing: { place: 'the yard' }, bridge: { mode: 'campaign-v3', outingId: 'o-7', sourceScheduleIndex: 3 } };
  let fight = null;
  const win = { ...target, crewRun: { snapshot: () => structuredClone(run) }, fightModule: { snapshot: () => fight && structuredClone(fight) } };
  wait(3);
  const night = watchFight({ win, doc, makeLog: () => createPlaylog({ storage: disk, now: clockNow }) });
  assert.deepEqual(night.current && [night.current.screen, night.current.label], ['fight-brief', 'the yard'], 'the brief is a screen');
  const tap = (el, type = 'pointerup') => { for (const [kind, fn] of listeners) if (kind === type) fn({ type, target: el, timeStamp: t, detail: 1, clientX: 0, clientY: 0 }); };
  const control = (attrs = {}, text = '') => ({ dataset: attrs.dataset ?? {}, id: attrs.id ?? '', textContent: text, classList: { contains: c => (attrs.classes ?? []).includes(c) }, getAttribute: () => null, closest(sel) { return /button/.test(sel) ? this : null; } });
  wait(6); tap(control({}, 'Fight'));
  run = { ...run, phase: 'battle' };
  fight = { round: 1, status: 'active', mission: {} };
  phase.textContent = 'RESOLVING'; night.tick();
  assert.equal(night.current.screen, 'fight-brief', 'a round is not the player\'s while it resolves');
  phase.textContent = 'JADE · YOUR TURN'; night.tick();
  assert.equal(night.current.label, 'round 1 · the yard');
  wait(25); const brace = control({ dataset: { action: 'brace' } }); tap(brace); tap(brace, 'touchend');
  wait(2); tap(control({ id: 'end' }));
  fight = { ...fight, round: 2 }; night.tick();
  wait(4); tap(control({ dataset: { missionAction: 'help' } }, 'Help Aatami'));
  fight = { ...fight, status: 'complete', result: 'win' }; night.tick(); night.tick();
  assert.equal(createPlaylog({ storage: disk, now: clockNow }).entries().filter(e => e.type === 'fight').length, 0, 'the fight is written when its receipt is');
  run = { ...run, phase: 'aftermath', last: { end: 'win' } }; night.tick(); night.tick();
  wait(5); tap(control({}, 'Back to Kallio'));
  night.stop();
  // A second watcher on a reload of the result page does not count it twice.
  watchFight({ win, doc, makeLog: () => createPlaylog({ storage: disk, now: clockNow }) }).stop();

  // Back on Act I. A page restored from memory reads the log again first.
  actOne.reload();
  wait(2); actOne.add('session', { version: 'v4.104' });
  const all = actOne.entries();
  const acts = all.filter(e => e.type === 'act').map(e => e.action);
  assert.deepEqual(acts, ['take-door', 'fight:fight', 'fight:brace', 'fight:end', 'fight:help', 'fight:back-to-kallio'], 'one entry per tap, named by the control, never by a person');
  assert.equal(all.filter(e => e.type === 'fight').length, 1, 'one fight entry for one outing');
  const f = summarise(all);
  assert.equal(f.sessions, 1, 'a fight is two page loads and still one sitting');
  assert.ok(f.slowest.some(w => w.screen === 'fight' && w.label === 'round 1 · the yard' && Math.round(w.ms / 1000) === 25 && w.action === 'fight:brace'), 'the first tap of a round is a wait, counted from the player\'s turn');
  assert.ok(f.slowest.some(w => w.label === 'round 2 · the yard' && w.action === 'fight:help'));
  assert.deepEqual(f.fights, { count: 1, ends: { win: 1 }, rounds: 2 });
  assert.ok(f.used.includes('Brace (guard up)') && f.used.includes('helping a fallen friend up'));
  assert.ok(!f.used.includes('Withdraw from a fight'));
  assert.equal(Math.round(f.playedMs / 1000), 8 + 1 + 6 + 25 + 2 + 4 + 5, 'the time a page was gone or loading is not play time');
  assert.match(report(f), /Fights: 1 \(1 won\), 2 rounds on average\./);
  assert.match(report(summarise([...all, { t: t + 1, type: 'fight', result: 'police', rounds: 4 }])), /Fights: 2 \(1 won, 1 ended by the police\), 3 rounds on average\./);
  assert.equal(nameOf(control({ dataset: { police: 'HELP_FRIENDS' } })), 'police-help-friends');
  assert.equal(nameOf(control({ id: 'help' })), 'menu', 'the Menu button is not the Help action');
  assert.equal(nameOf(control({ classes: ['withdraw-command'] }, 'Withdraw from outing…')), 'withdraw');
  assert.equal(fightScreen({ phase: 'battle', outing: { place: 'the quay' } }, { round: 3, status: 'active', mission: { police: { arrived: true, resolved: false } } }).label, 'police · round 3 · the quay', 'the police question is its own screen');
  // The standalone Night Shift cabinet is a test bench, not a playthrough.
  const bench = createPlaylog({ storage: disk, now: clockNow }).entries().length;
  run = { phase: 'prep', bridge: null };
  watchFight({ win, doc, makeLog: () => createPlaylog({ storage: disk, now: clockNow }) });
  assert.equal(createPlaylog({ storage: disk, now: clockNow }).entries().length, bench, 'nothing is written outside a campaign outing');
}

console.log(`PASS playlog: ${s.sessions} sessions, ${s.slowest.length} waits, never used: ${s.neverUsed.join(', ')}`);
