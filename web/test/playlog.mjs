// The play log (v4.103): the recorder and the summary, in bare node.
//
//   node web/test/playlog.mjs
//
// A log is made by hand here, as a player would make it on a phone: a session,
// screens appearing, taps after a pause, a control seen and never pressed, a
// refusal, a pocketed phone and a second session.
import assert from 'node:assert/strict';
const { createPlaylog, summarise, report, FEATURES, PLAYLOG_KEY } = await import('../js/v3/playlog.js?v=1');

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

console.log(`PASS playlog: ${s.sessions} sessions, ${s.slowest.length} waits, never used: ${s.neverUsed.join(', ')}`);
