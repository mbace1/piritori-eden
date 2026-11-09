// The play log (v4.103): what a person did in Act I, kept on this device.
//
// Every balance number this game has came from a bot, and a bot never
// hesitates, never misses a button and never closes the tab. This reads the
// four things a bot cannot tell us, from a real playthrough:
//   - where the player HESITATED: the time on a screen before their first tap;
//   - what was OFFERED and never used: a control that was on screen, never
//     pressed (Toko, routes, the fence, visits…);
//   - what the game REFUSED or told them, and how often;
//   - where they STOPPED.
// Nothing leaves the browser unless the player presses SEND in the pause
// menu's PLAYTEST NOTES, which goes through the arcade's own feedback (or
// COPY, to paste it anywhere). The recorder is small and the summary is pure,
// so web/test/playlog.mjs holds both in bare node.

export const PLAYLOG_KEY = 'piritori-playlog:v1';
const CAP = 4000;
// A gap longer than this is not hesitation, it is the phone in a pocket.
const IDLE_MS = 5 * 60 * 1000;

/** What a player can find, named the way they would name it, by the
 *  `data-action` controls that use it. */
export const FEATURES = [
  { name: 'market trade', actions: ['trade'] },
  { name: "Toko's bowl", actions: ['buy-bowl'] },
  { name: "Toko's weapons", actions: ['buy-toko-weapon'] },
  { name: 'the street seller', actions: ['open-shop', 'buy-equipment'] },
  { name: 'the fence', actions: ['sell-loot'] },
  { name: 'a delivery route', actions: ['plan-route', 'commit-route', 'send-route'] },
  { name: 'a door (a free block)', actions: ['take-door'] },
  { name: 'a visit', actions: ['open-visit'] },
  { name: 'the case board', actions: ['open-case', 'case-choose'] },
  { name: 'hiring', actions: ['hire-from-pool'] },
  { name: 'crew growth', actions: ['spend-perk', 'learn-skill', 'train-crew'] },
  { name: 'the board fight instead of Night Shift', actions: ['outing-board'] },
  { name: 'showing the lead', actions: ['show-lead', 'go-lead'] },
];

/** The recorder. `storage` and `now` are injectable for tests. */
export function createPlaylog({ storage = globalThis.localStorage, now = () => Date.now() } = {}) {
  let log = [];
  try { log = JSON.parse(storage?.getItem(PLAYLOG_KEY)) || []; } catch { log = []; }
  if (!Array.isArray(log)) log = [];
  const write = () => { try { storage?.setItem(PLAYLOG_KEY, JSON.stringify(log)); } catch { /* full or private: the log is a nicety */ } };
  const offered = new Set();
  let lastScreen = null;
  const recorder = {
    add(type, detail = {}) {
      // After a new session or a hidden tab, the screen is logged again on
      // the next render, so the wait that follows is measured from there.
      if (type === 'session' || type === 'hidden') lastScreen = null;
      log.push({ t: now(), type, ...detail });
      if (log.length > CAP) log = log.slice(-CAP);
      write();
    },
    /** A render: logs the screen when it (or the block) changed, and each
     *  control seen for the first time in this block. */
    seen({ screen, block, label, actions = [] }) {
      const key = `${screen}|${block}`;
      if (key !== lastScreen) { lastScreen = key; recorder.add('screen', { screen, block, label }); }
      for (const action of new Set(actions)) {
        const k = `${block}|${action}`;
        if (offered.has(k)) continue;
        offered.add(k);
        recorder.add('offer', { action, block });
      }
    },
    entries: () => log.slice(),
    clear() { log = []; offered.clear(); lastScreen = null; write(); },
  };
  return recorder;
}

const mmss = ms => `${Math.floor(ms / 60000)}:${String(Math.round(ms / 1000) % 60).padStart(2, '0')}`;

/** Read a log. Pure. */
export function summarise(entries, { features = FEATURES } = {}) {
  const list = (entries ?? []).filter(e => e && Number.isFinite(e.t)).sort((a, b) => a.t - b.t);
  // Play time: the sum of gaps between events, a long gap counting as idle.
  // A session is a page load, or coming back after a long gap with the page
  // left open; a gap is never play time.
  let played = 0, sessions = 0;
  for (let i = 0; i < list.length; i += 1) {
    const gap = i ? list[i].t - list[i - 1].t : Infinity;
    if (list[i].type === 'session') { sessions += 1; continue; }
    if (gap > IDLE_MS) { if (i) sessions += 1; continue; }
    played += gap;
  }
  if (!sessions && list.length) sessions = 1;
  // Hesitation: from a screen appearing to the next tap, within one session.
  const waits = [];
  let open = null;
  for (const e of list) {
    if (e.type === 'screen') open = e;
    else if (e.type === 'session' || e.type === 'hidden') open = null;
    else if (e.type === 'act' && open) {
      const ms = e.t - open.t;
      if (ms <= IDLE_MS) waits.push({ ms, screen: open.screen, label: open.label, action: e.action });
      open = null;
    }
  }
  waits.sort((a, b) => b.ms - a.ms);
  const used = new Set(list.filter(e => e.type === 'act').map(e => e.action));
  const offeredActions = new Set(list.filter(e => e.type === 'offer').map(e => e.action));
  const featureState = features.map(f => ({
    name: f.name,
    offered: f.actions.some(a => offeredActions.has(a)),
    used: f.actions.some(a => used.has(a)),
  }));
  const toasts = new Map();
  for (const e of list.filter(e => e.type === 'toast')) toasts.set(e.message, (toasts.get(e.message) ?? 0) + 1);
  const screens = list.filter(e => e.type === 'screen');
  const furthest = screens.reduce((best, e) => (best == null || (e.block ?? -1) > (best.block ?? -1) ? e : best), null);
  const last = list.at(-1) ?? null;
  const lastScreen = screens.at(-1) ?? null;
  const lastAct = [...list].reverse().find(e => e.type === 'act') ?? null;
  return {
    events: list.length,
    sessions,
    playedMs: played,
    furthest: furthest ? { block: furthest.block, label: furthest.label } : null,
    stopped: last ? { screen: lastScreen?.screen ?? null, label: lastScreen?.label ?? null, after: lastAct?.action ?? null } : null,
    slowest: waits.slice(0, 5),
    neverUsed: featureState.filter(f => f.offered && !f.used).map(f => f.name),
    used: featureState.filter(f => f.used).map(f => f.name),
    neverOffered: featureState.filter(f => !f.offered).map(f => f.name),
    toasts: [...toasts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([message, count]) => ({ message, count })),
    errors: list.filter(e => e.type === 'error').map(e => e.message).slice(0, 5),
    cleared: list.some(e => e.type === 'ending'),
  };
}

/** The summary as text, to read or paste. */
export function report(summary, { version = '' } = {}) {
  const s = summary;
  const lines = [`PIRITORI → EDEN · Act I ${version} · playtest notes`];
  if (!s.events) return [...lines, 'Nothing played on this device yet.'].join('\n');
  lines.push(`Played: ${s.sessions} session${s.sessions === 1 ? '' : 's'}, ${Math.round(s.playedMs / 60000)} min of play. Furthest: ${s.furthest?.label ?? '—'}${s.cleared ? ' (the chapter closed)' : ''}.`);
  if (s.stopped) lines.push(`Stopped: ${s.stopped.label ?? '—'}, on the ${s.stopped.screen ?? '—'} screen${s.stopped.after ? `, after ${s.stopped.after}` : ''}.`);
  lines.push('Slowest moments (time on a screen before the first tap):');
  if (s.slowest.length) s.slowest.forEach((w, i) => lines.push(`  ${i + 1}. ${mmss(w.ms)} on ${w.screen} · ${w.label ?? ''} → ${w.action}`));
  else lines.push('  none yet');
  lines.push(`Offered, never used: ${s.neverUsed.join(', ') || 'nothing'}.`);
  lines.push(`Used: ${s.used.join(', ') || 'nothing yet'}.`);
  lines.push(`Never on screen: ${s.neverOffered.join(', ') || 'nothing'}.`);
  lines.push('What the game said most:');
  if (s.toasts.length) for (const t of s.toasts) lines.push(`  ×${t.count} ${t.message}`);
  else lines.push('  nothing');
  lines.push(`Errors: ${s.errors.length ? s.errors.join(' | ') : 'none'}.`);
  return lines.join('\n');
}
