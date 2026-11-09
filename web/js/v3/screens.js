// The city's screen, `state.mode` (design/STATE_MACHINES.md, M2), made explicit
// in two parts: the screens that exist, and the rules that hold whichever one
// was asked for. Before v4.100 the rules lived inside app.js `render()` and
// the nav bar set `state.mode` with none. That left two ways to break a
// campaign: leave a visit by the nav bar and travel was refused for good, or
// come back from a road fight to an empty map. A third, leaving a finished
// fight's result card and turning the block twice, was held off only by a
// stylesheet hiding the nav bar. About 45 places still write `state.mode`
// directly; each is a step on the queue in the doc, not a rule of its own.

import { openOuting } from './outing.js?v=8';

export const SCREENS = Object.freeze(['route', 'encounter', 'visit', 'news', 'battle', 'road', 'outing', 'shop', 'case', 'ramen', 'ledger']);

/** The screen the state is actually on, after the rules that hold whatever
 *  screen was asked for. It repairs as it reads, so a save written before
 *  v4.100 with a stale visit or an empty road screen comes back usable. */
export function settleScreen(state) {
  if (!SCREENS.includes(state.mode)) state.mode = 'route';
  // A pending road event waits for an answer; nothing else opens past it.
  if (state.road?.pending && state.mode !== 'battle') state.mode = 'road';
  // An open outing is the same: the fight is still on in Night Shift.
  if (openOuting(state)) state.mode = 'outing';
  else if (state.mode === 'outing') state.mode = 'route';
  // A road screen with no event on it is the map (a road fight came back
  // from Night Shift and closed its event).
  if (state.mode === 'road' && !state.road?.pending && !state.road?.last) state.mode = 'route';
  // A visit lives only on its own screen: however it was left, it is closed.
  // (News returns only to the encounter or the map, and no visit starts a
  // fight, so nothing comes back to a visit it has left.)
  if (state.mode !== 'visit' && state.activeVisit) state.activeVisit = null;
  return state.mode;
}

/** The nav bar's way to change screen. A fight's result stays on the table
 *  until it is finished: leaving it is how a block turned twice, or a
 *  result was overwritten by the next fight. */
export function enterScreen(state, target) {
  if (!SCREENS.includes(target)) return { ok: false, reason: `There is no ${target} screen.` };
  if (state.mode === 'battle' && target !== 'battle' && state.battle?.status === 'resolved') {
    return { ok: false, reason: 'Finish the fight first: its result is still on the table.' };
  }
  state.mode = target;
  return { ok: true, to: settleScreen(state) };
}
