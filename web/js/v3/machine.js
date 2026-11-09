// An explicit state machine is a table: each state names the events it accepts
// and the state each one leads to. `step` is the one way to ask whether a move
// is allowed; it never changes anything, so a caller decides what a refusal
// means and the table stays readable on its own.
//
// Every machine declared with this is listed in design/STATE_MACHINES.md,
// alongside the implicit ones not yet converted, and is held by
// web/test/machines.mjs. To find them all: grep for `machine(`.

/** Declare a machine. `table` is { state: { event: nextState } }. A table that
 *  names a state it does not declare is a mistake, caught here rather than at
 *  the first player who reaches it. */
export function machine(name, table) {
  const states = Object.keys(table);
  for (const [from, events] of Object.entries(table)) {
    for (const [event, to] of Object.entries(events)) {
      if (!Object.hasOwn(table, to)) throw Error(`${name}: ${from} --${event}--> ${to}, and ${to} is not a state`);
    }
  }
  return Object.freeze({ name, states, table: Object.freeze(Object.fromEntries(states.map(s => [s, Object.freeze({ ...table[s] })]))) });
}

/** Where `event` leads from `from`, or why it may not. Never mutates. */
export function step(m, from, event) {
  const to = Object.hasOwn(m.table, from) && Object.hasOwn(m.table[from], event) ? m.table[from][event] : undefined;
  return to === undefined
    ? { ok: false, from, event, reason: `${m.name}: ${event} is not allowed from ${from}` }
    : { ok: true, from, event, to };
}

/** Every allowed move, as `from --event--> to` lines: the table as text, for
 *  the doc and for a person or agent reading a test failure. */
export function describe(m) {
  return m.states.flatMap(from => Object.entries(m.table[from]).map(([event, to]) => `${from} --${event}--> ${to}`));
}
