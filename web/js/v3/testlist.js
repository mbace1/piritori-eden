/**
 * THINGS TO TEST — the list that empties itself.
 *
 * A checklist of screens that are hard to reach by playing, each with a jump
 * straight to it and a note saying what to look at when you get there. Approve
 * one and it leaves the list; the list is therefore always "what still needs
 * looking at" rather than a menu of everything.
 *
 * ── The rule that stops this rotting ──────────────────────────────────────
 *
 * APPROVAL IS STAMPED WITH THE ITEM'S `rev`, NOT WITH A BOOLEAN.
 *
 * A screen approved at rev 1 and then rebuilt is not an approved screen, and a
 * plain tick would say it was. So bump an item's `rev` whenever the thing it
 * points at changes, and it comes back at the top of the list marked CHANGED
 * with the version it was last approved at. This repo has paid for the other
 * behaviour more than once — `CLAUDE.md`'s standing lesson is that a gate that
 * certifies *works* cannot see *looks*, and a look that was signed off six
 * versions ago is not a look at this build.
 *
 * ── Builds ────────────────────────────────────────────────────────────────
 *
 * `build` says which build an item is about, and it is the reason the Godot
 * entries carry no jump. `PORTING.md` §3.3: presentation is deliberately
 * different between the two, so "does the counter letterbox correctly in
 * landscape" is a question only the port can answer. Offering a dead button
 * here would be worse than offering none — it would imply this build could
 * answer it.
 *
 *   'js'    reachable from this build; the jump works
 *   'godot' about the port; checklist only, and it says so
 *   'both'  jump here, then check the same screen there
 */

export const APPROVAL_KEY = 'piritori-to-eden:approvals:v1';

/**
 * Every item: what it is, where it goes, what to look for.
 *
 * `note` is the whole point of the feature — a jump with no instruction is a
 * bookmark, and the person arriving at a screen three weeks after it was built
 * does not know what it was supposed to prove.
 */
export const TESTS = [
  {
    id: 'counter-toko',
    rev: 2,
    build: 'both',
    title: 'The counter — Toko Slomo’s Noodles',
    where: 'Day 3 · night · Vaasankatu',
    note: 'The goal reference for every conversation staged off the fight board (STAGE_SPEC §6). Check the speaker sits BEHIND the counter rather than pasted on it, that nothing draws below the band at 0.647, and that the room reads as one picture rather than a figure over a painting.',
    jump: { kind: 'encounter', id: 'enc-toko-quiet-voice' },
  },
  {
    id: 'counter-bank',
    rev: 1,
    build: 'both',
    title: 'The staffed bank counter',
    where: 'Day 3 · day · Siltasaari',
    note: 'The second plate built to the empty-room rule. Era I material culture: markka is only spendable after a physical teller visit, so this screen is load-bearing for the fiction and not just for the art.',
    jump: { kind: 'encounter', id: 'enc-bank-counter' },
  },
  {
    id: 'battle-2v2',
    rev: 1,
    build: 'both',
    title: 'Formation battle — 2v2, Karhupuisto',
    where: 'the first fight, and the teaching one',
    note: 'Both ranks on a six-lane board. Watch that three crew do not all deploy into the front rank — QUEUE.md records that the deployment rule produces a flat line on a wide board.',
    jump: { kind: 'battle', id: 'battle-karhupuisto-2v2' },
  },
  {
    id: 'battle-3v3',
    rev: 1,
    build: 'both',
    title: 'Formation battle — 3v3, the courtyard',
    where: 'the fight that can leave somebody critical',
    note: 'The heavier board. Check the crew panel names cover — "behind the bicycle rack" — and that the cell it means is the cell that is marked.',
    jump: { kind: 'battle', id: 'battle-courtyard-3v3' },
  },
  {
    id: 'battle-kattilahalli',
    rev: 1,
    build: 'js',
    title: 'Formation battle — 3v3, Suvilahti',
    where: 'never reached in a normal seven days',
    note: 'The third authored battle, added after the contract gate was parked. Nothing in the schedule leads here, so without a jump it is only ever seen by someone reading JSON.',
    jump: { kind: 'battle', id: 'battle-kattilahalli-3v3' },
  },
  {
    id: 'news-arvo',
    rev: 1,
    build: 'both',
    title: 'The bulletin — Arvo Linde',
    where: 'Day 3 · before the bank',
    note: 'Television is the authoritative public clock in 2003. Check the DOCUMENTED / INFERENCE / FICTION ledger stays visibly separated — that separation is the fiction boundary, not decoration.',
    jump: { kind: 'news', id: 'news-markka-afterlife' },
  },
  {
    id: 'the-board',
    rev: 1,
    build: 'js',
    title: 'The board — live prices and what you know',
    where: 'LEDGER, under the paper book',
    note: 'market/model.mjs on a screen for the first time. Check that a place you have never stood in shows NOTHING (that empty row is the reason to travel), that a quote decays to a range and then a rumour as blocks pass, and that the stated cause never disagrees with the number — the model names the dominant factor and the table must print that one.',
    jump: { kind: 'ledger' },
  },
  {
    id: 'committed-context',
    rev: 1,
    build: 'js',
    title: 'Committed context — the dock disappears',
    where: 'any encounter or battle',
    note: 'UX_SPEC §3.2/§3.4: Location and Battle contract the shell — the planning dock hides and the resource strip drops to time block and cash only, so a scene cannot be tab-switched away from mid-way. Check the dock is genuinely gone (not just disabled), that no gap opens where it sat, and that RETURN TO MAP / WITHDRAW still gets you out — those are the scene’s own exits, not the dock.',
    jump: { kind: 'encounter', id: 'enc-toko-quiet-voice' },
  },
  {
    id: 'placeholder-harju-pitch',
    rev: 1,
    build: 'js',
    title: 'The generic scene — Harju pitch',
    where: 'Day 2 · night · Harju',
    note: 'JS_BUILD_CATCHUP §1: no scene art exists for this site — it falls back to genericScene(), a decorative silhouette (moon, blocks, a tram, a figure) rather than a photo of nothing. Check the fallback reads as intentional atmosphere rather than a broken image, and that the site label in the caption still names the place even with no art behind it.',
    jump: { kind: 'encounter', id: 'enc-runner-at-tram-stop' },
  },
  {
    id: 'placeholder-jade-lantern',
    rev: 1,
    build: 'js',
    title: 'The generic scene — the Jade Lantern front',
    where: 'Day 6 · day · Linjat / Hämeentie',
    note: 'The other unbuilt site (JS_BUILD_CATCHUP §1), and it is also the SIGNAL for mission-courtyard-receipts — the mission that now ends at battle-courtyard-3v3 with no avoidance (MISSIONS.md §6). Same check as the pitch: the fallback should read as deliberate, not broken.',
    jump: { kind: 'encounter', id: 'enc-jade-window' },
  },
  {
    id: 'ending-screen',
    rev: 1,
    build: 'js',
    title: 'The Era I outcome',
    where: 'after seven days, and only then',
    note: 'Reachable by playing a whole campaign, which is why nobody looks at it. It is an outcome, NOT a morality score — check nothing on it reads as a grade.',
    jump: { kind: 'ending' },
  },
  {
    id: 'last-day',
    rev: 1,
    build: 'js',
    title: 'Day 7 — the last light',
    where: 'the end of the schedule',
    note: 'Jumps the clock to the final block with the campaign intact. The cheapest way to look at late-game copy without playing six days first.',
    jump: { kind: 'day', day: 7 },
  },
  {
    id: 'godot-landscape',
    rev: 1,
    build: 'godot',
    title: 'Godot · landscape, for visual glitches',
    where: 'the port, on a television or a desktop window',
    note: 'Test Godot in landscape for visual glitches. Watch specifically for: type scaled twice (a size derived from the screen and then scaled again produced 130px chips that shoved the header off), the battle console losing its nav dock as UX_SPEC §3.4 requires, and any panel whose torn edge is drawn at label scale — a jittered edge on a small label reads as a rendering fault.',
    jump: null,
  },
  {
    id: 'godot-pad',
    rev: 1,
    build: 'godot',
    title: 'Godot · a controller, all five modes',
    where: 'the port, with a pad in your hands',
    note: 'The one question the browser cannot answer, and the whole reason the port exists (PORTING.md §1). Every mode must be reachable and every action committable without a pointer. A screen that needs a cursor is a screen that has not been ported.',
    jump: null,
  },
  {
    id: 'godot-pixel10',
    rev: 1,
    build: 'godot',
    title: 'Godot · the Pixel 10 black screen',
    where: 'the device that does not run it',
    note: 'JS_BUILD_CATCHUP §4: a Pixel 10 black-screens the Godot web build against 182MB of uncompressed texture. toko-drop renders 3D on the same device — but from procedural primitives with no GLTFLoader and no TextureLoader, so it proves the context works and nothing about the upload. Re-check after any texture-compression change.',
    jump: null,
  },
];

/** Read the approvals map: { [id]: { rev, at, version } }. */
export function loadApprovals(storage = globalThis.localStorage) {
  try {
    return JSON.parse(storage?.getItem(APPROVAL_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

export function saveApprovals(map, storage = globalThis.localStorage) {
  try {
    storage?.setItem(APPROVAL_KEY, JSON.stringify(map));
  } catch { /* private mode; the list simply stops remembering */ }
}

/**
 * The list, sorted into what still needs looking at and what does not.
 *
 * `changed` is the interesting bucket: approved once, but the item has moved
 * since. It goes back into `open` rather than staying signed off, because that
 * is the entire argument for stamping a rev instead of a tick.
 */
export function partition(tests = TESTS, approvals = loadApprovals()) {
  const open = [], done = [];
  for (const test of tests) {
    const seen = approvals[test.id];
    if (!seen) { open.push({ ...test, changed: false }); continue; }
    if (seen.rev !== test.rev) {
      open.push({ ...test, changed: true, approvedRev: seen.rev, approvedAt: seen.at });
    } else {
      done.push({ ...test, approvedAt: seen.at, approvedVersion: seen.version });
    }
  }
  return { open, done };
}

export function approve(id, version, storage = globalThis.localStorage) {
  const test = TESTS.find(t => t.id === id);
  if (!test) return null;
  const map = loadApprovals(storage);
  map[id] = { rev: test.rev, at: new Date().toISOString().slice(0, 10), version };
  saveApprovals(map, storage);
  return map[id];
}

export function unapprove(id, storage = globalThis.localStorage) {
  const map = loadApprovals(storage);
  delete map[id];
  saveApprovals(map, storage);
  return map;
}
