// Night Shift's half of the play log (v4.104).
//
// Act I's play log (web/js/v3/playlog.js) went blind at the door of every
// fight: Night Shift is its own page, so the core of the game showed up in
// PLAYTEST NOTES as a gap between two Act I screens. This writes into the same
// log, on the same device, from the OUTSIDE: it reads the snapshots the fight
// already publishes (`window.crewRun`, `window.fightModule`), the turn line on
// the page, and the taps, and it calls nothing in the fight. So it can fail
// without the fight noticing, and the fight's own files do not change for it.
//
// What it writes, in the play log's own words:
//   - a SCREEN for the brief, for each round once it is the player's turn
//     (so "the slowest moments" include the first tap of a round), for the
//     police question, and for the result;
//   - an ACT for every tap, named by the control (`fight:brace`,
//     `fight:help`, `fight:end`…), and for the fight's keyboard keys;
//   - the controls on screen, so a fight's unused verbs reach "Offered,
//     never used";
//   - one FIGHT entry per outing as it ends: how (won, the police, withdrew,
//     lost), and after how many rounds.
// Only a campaign outing (one Act I sent) is logged; the standalone Night
// Shift cabinet is a test bench, not a playthrough.
import { createPlaylog } from '../js/v3/playlog.js?v=2';

const POLL_MS = 400;
// A page whose fight never booted (no 3D on this phone) stops asking.
const BOOT_MS = 90_000;
// The fight's keyboard (crew-run/index.html's help text): A/M/B/I/R and Enter.
const KEYS = { a: 'attack', m: 'move', b: 'brace', i: 'item', r: 'reload', Enter: 'end' };
const IDS = {
  help: 'menu', 'confirm-retreat': 'retreat', 'crew-picker': 'crew',
  'camera-menu': 'camera', rotate: 'camera', zoomin: 'camera', zoomout: 'camera', resetcam: 'camera', actioncam: 'camera',
};
const CONTROLS = 'button, a[href], summary, select, [role="button"]';

/** A control's name in the log: its own action, else where it sits, else its
 *  id, else the first words on it. Never a person's name: a Help button says
 *  "Help Aatami", and the log only needs "help". */
export function nameOf(el) {
  const d = el?.dataset ?? {};
  if (d.action) return d.action;
  if (d.missionAction) return d.missionAction;
  if (d.police) return `police-${d.police.toLowerCase().replace(/_/g, '-')}`;
  if (d.unitid) return 'select';
  if (d.cameraPreset || el.closest?.('#camera-panel')) return 'camera';
  if (el.closest?.('#choices')) return 'pick';
  if (el.classList?.contains('withdraw-command')) return 'withdraw';
  if (el.id) return IDS[el.id] ?? el.id;
  const words = String(el.getAttribute?.('aria-label') || el.textContent || '')
    .toLowerCase().replace(/[^a-z ]+/g, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 3).join('-');
  return words || String(el.tagName ?? 'control').toLowerCase();
}

/** How a fight ended, in the receipt's words when it has one (`win`,
 *  `police`, `withdraw`, `loss`), else the board's. */
export const endOf = (run, fight) => run?.last?.end ?? fight?.result ?? 'over';

/** Where the player is, from the two snapshots. `null` while the fight is
 *  resolving: a round is the player's when its turn line says so, and the
 *  wait before their first tap starts there, not during the enemy's moves. */
export function fightScreen(run, fight, { yourTurn = true } = {}) {
  if (!run) return null;
  const place = run.outing?.place ?? 'the fight';
  const block = run.bridge?.sourceScheduleIndex;
  if (run.phase === 'prep') return { screen: 'fight-brief', block, label: place };
  if (run.phase === 'aftermath' || (fight && fight.status !== 'active')) {
    return { screen: 'fight-result', block, label: `${endOf(run, fight)} · ${place}` };
  }
  if (!fight || !yourTurn) return null;
  const police = fight.mission?.police;
  const asked = police?.arrived && !police.resolved;
  return { screen: 'fight', block, label: `${asked ? 'police · ' : ''}round ${fight.round} · ${place}` };
}

const visible = el => !el.disabled && !el.closest('[hidden]') && el.getClientRects().length > 0;

/** Start logging this page, once the fight has booted. Returns `stop`. */
export function watchFight({ win = globalThis, doc = globalThis.document, makeLog = () => createPlaylog(), interval = POLL_MS } = {}) {
  // `dirty`: the controls on screen are read again only after a tap or a new
  // screen, not on every tick (each read is a layout).
  let log = null, timer = 0, current = null, stopped = false, dirty = true;
  const started = Date.now();
  const recorded = new Set();
  const outingId = () => current?.outingId;
  const add = (type, detail) => { try { log?.add(type, detail); } catch { /* the log is a nicety */ } };

  function tick() {
    if (stopped) return;
    let run, fight;
    try { run = win.crewRun?.snapshot(); } catch { return; }
    if (!run) { if (Date.now() - started > BOOT_MS) stop(); return; } // not booted yet
    if (!log) {
      if (run.bridge?.mode !== 'campaign-v3') { stop(); return; } // the test bench
      log = makeLog();
      add('session', { page: 'night-shift', outing: run.bridge.outingId });
    }
    try { fight = win.fightModule?.snapshot(); } catch { fight = null; }
    const turn = doc.getElementById('phase')?.textContent;
    const at = fightScreen(run, run.phase === 'prep' ? null : fight, { yourTurn: turn == null || /YOUR TURN/i.test(turn) });
    if (!at) return;
    if (at.screen !== current?.screen || at.label !== current?.label) dirty = true;
    current = { ...at, outingId: run.bridge.outingId };
    const actions = dirty ? [...doc.querySelectorAll(CONTROLS)].filter(visible).map(el => `fight:${nameOf(el)}`) : [];
    dirty = false;
    // Withdraw lives behind the Menu button for the whole fight.
    if (at.screen === 'fight') actions.push('fight:withdraw');
    try { log.seen({ ...at, actions }); } catch { /* as above */ }
    // The fight entry, once the receipt is written (the run's aftermath), and
    // once per outing, also across a reload of the result page.
    if (run.phase === 'aftermath' && !recorded.has(outingId())) {
      recorded.add(outingId());
      if (!log.entries().some(e => e.type === 'fight' && e.outing === outingId())) {
        add('fight', { outing: outingId(), result: endOf(run, fight), rounds: fight?.round ?? null, place: run.outing?.place ?? null });
      }
    }
  }

  // A tap is logged once: the fight's buttons answer pointerup, touchend AND
  // a keyboard click (fight-module/main.js `activate`), so this listens to the
  // same three and keeps the first.
  const lastTap = new WeakMap();
  let down = null;
  function act(name) {
    if (!log) return;
    dirty = true;
    add('act', { action: `fight:${name}`, screen: current?.screen ?? 'fight', block: current?.block });
  }
  function onTap(e) {
    if (e.type === 'click' && e.detail !== 0) return;
    const el = e.target?.closest?.(CONTROLS);
    if (!el) {
      // A tap on the board (not a drag to turn the camera) is a choice too.
      if (e.type === 'pointerup' && e.target?.id === 'scene' && down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10) act('board');
      return;
    }
    if (el.disabled) return;
    const t = e.timeStamp || Date.now();
    if (t - (lastTap.get(el) ?? -1e9) < 260) return;
    lastTap.set(el, t);
    act(nameOf(el));
  }
  const onDown = e => { down = { x: e.clientX, y: e.clientY }; };
  function onKey(e) {
    // A key on a focused control comes back as its click, logged above.
    if (e.repeat || e.target?.closest?.(`input, textarea, ${CONTROLS}`)) return;
    const name = KEYS[e.key] ?? KEYS[e.key?.toLowerCase?.()] ?? (/^[1-6]$/.test(e.key) ? 'select' : null);
    if (name) act(name);
  }
  const onError = e => add('error', { message: String(e.message ?? e.error ?? 'error').slice(0, 200), page: 'night-shift' });
  const onRejection = e => add('error', { message: String(e.reason?.message ?? e.reason ?? 'rejection').slice(0, 200), page: 'night-shift' });
  // The other page may have written while this one was away.
  const onVisibility = () => { if (!log) return; if (doc.hidden) add('hidden'); else { log.reload(); add('visible'); } };
  const onShow = e => { if (e.persisted) log?.reload(); };

  const listeners = [
    [doc, 'pointerdown', onDown], [doc, 'pointerup', onTap], [doc, 'touchend', onTap], [doc, 'click', onTap],
    [doc, 'keydown', onKey], [doc, 'visibilitychange', onVisibility],
    [win, 'error', onError], [win, 'unhandledrejection', onRejection], [win, 'pageshow', onShow],
  ];
  // Capture: a tap is logged as it lands, before the fight acts on it, and
  // the screen it leads to on a later tick.
  for (const [target, type, fn] of listeners) target.addEventListener?.(type, fn, true);
  timer = win.setInterval?.(tick, interval) ?? 0;
  tick();

  function stop() {
    stopped = true;
    win.clearInterval?.(timer);
    for (const [target, type, fn] of listeners) target.removeEventListener?.(type, fn, true);
  }
  return { stop, tick, get current() { return current; } };
}
