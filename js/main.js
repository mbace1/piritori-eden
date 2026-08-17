// Piritori → Eden — the product. Owns market, debt, heat, trust, narrative and
// the night presentation; borrows every moving part from flow-core.

import { createFlow } from '../../flow-core/sim.js?v=1';
import { KALLIO } from '../../flow-core/city.js?v=1';
import { FlowRenderer } from '../../flow-core/render.js?v=1';
import { RouteDrawer } from '../../flow-core/input.js?v=1';
import { THEME } from './palette.js?v=1';
import { Market, CLASSES } from './market.js?v=1';
import { Heat, THRESHOLD } from './heat.js?v=1';
import { CONTACTS, LINES, MISSIONS, Cast, ending } from './narrative.js?v=1';
import { startFight as buildFight, WEAPONS, consequence } from './fight.js?v=1';
import { FightView } from './fightview.js?v=1';

const $ = id => document.getElementById(id);
const eur = n => `${Math.round(n).toLocaleString('fi-FI')} €`;

const DAYS = 7;
let flow, market, heat, cast, renderer, drawer;
let sel = null, draft = null, over = null, drained = 0, pendingChoice = null;
let fight = null, nextFightAt = 900, fightView = null, armed = null;
let msgs = [], landed = 0;

function say(...lines) {
  for (const l of lines) msgs.unshift(l);
  msgs.length = Math.min(msgs.length, 24);
  renderFeed();
}

function boot(seed = 7) {
  flow = createFlow({
    city: KALLIO, seed, days: DAYS,
    demand: {
      rate: 130,
      pairs: [
        { from: 'home', to: 'work', weight: 3 },
        { from: 'home', to: 'school', weight: 2 },
        { from: 'home', to: 'shop', weight: 2 },
        { from: 'work', to: 'home', weight: 3 },
        { from: 'shop', to: 'home', weight: 2 },
        { from: 'transfer', to: 'shop', weight: 1 },
      ],
    },
    hooks: {
      onTick: tick => {
        market.step(tick);
        heat.step(tick);
        heat.lift(tick);
        drainArrivals();
        for (const p of heat.pending()) {
          if (p.kind === 'warn') say(...LINES.warn(edgeName(p.edge)));
          else if (p.kind === 'act') {
            const r = heat.inspect(p.edge, tick);
            if (r) say(...LINES.inspect(edgeName(p.edge)));
          }
        }
        maybeFight(tick);
      },
      onDay: day => settle(day),
      onEvent: ev => {
        if (ev.kind === 'close_edge') say(...LINES.close_edge(edgeName(ev.target)));
        if (ev.kind === 'slow_edge') say(...LINES.slow_edge(edgeName(ev.target)));
        if (ev.kind === 'surge') { say(...LINES.surge(label(ev.target))); market.shock('scarce', 1.8, 400, flow.clock.tick); }
        if (ev.kind === 'choice') offerChoice();
      },
    },
  });

  market = new Market(flow.graph, seed, flow.clock.ticksPerDay);
  heat = new Heat(flow);
  cast = new Cast();
  drained = 0; msgs = []; over = null; sel = null; pendingChoice = null;
  fight = null; nextFightAt = 900; landed = 0;

  // the canvas takes the diagram's own proportions, so there is no dead band
  // above and below it on a portrait phone
  $('map').style.aspectRatio = `${flow.graph.bounds.w} / ${flow.graph.bounds.h}`;
  renderer = new FlowRenderer($('map'), THEME);
  drawer = new RouteDrawer($('map'), renderer, flow, {
    markersProvider: () => markers(),
    onCommit: (mode, nodes) => {
      const r = flow.addRoute(mode, nodes);
      say(r.error ? `— ${r.error}` : `Line ${r.route.id.toUpperCase()} drawn: ${nodes.map(label).join(' → ')}.`);
      renderHud();
    },
    onTap: (hit, p) => {
      if (hit.kind === 'node') { sel = hit.id; renderSheet(); hidePop(); }
      else showPop(hit, p);
    },
    onDraft: d => { draft = d; },
  });

  say(...LINES.open);
  renderHud(); renderSheet();
}

const label = id => THEME.labelFor(flow.graph.node(id));
const edgeName = id => {
  const e = flow.graph.edge(id);
  return e ? `${label(e.a)}–${label(e.b)}` : id;
};

// ── consignments ────────────────────────────────────────────────────────
// A consignment is an ordinary trip with an opaque payload. It rides the lines
// the player drew, at the capacity everyone else is using, and it sells for
// whatever the price is WHEN IT LANDS.
function send(cls, n, from, to) {
  if (n <= 0) return;
  const held = market.hold(cls, n);
  if (!held) return;
  const t = flow.inject(from, to, { cls, n: held });
  if (!t.legs && !flow.routes.list.some(r => r.serves(from))) {
    say(`No line calls at ${label(from)}. It waits on the pavement.`);
  }
  say(`${held} ${cls} away toward ${label(to)}.`);
  renderHud(); renderSheet();
}

function drainArrivals() {
  const done = flow.trips.completed;
  for (; drained < done.length; drained++) {
    const t = done[drained];
    if (!t.payload) continue;
    const got = market.settleArrival(t.dest, t.payload.cls, t.payload.n);
    const clean = heat.pathClean(t.legsUsed || t.legs);
    landed += 1;
    say(`${t.payload.n} ${t.payload.cls} landed at ${label(t.dest)} — ${eur(got)}${clean ? '' : ' (watched)'}.`);
  }
  // anything that gave up carrying product is money gone
  for (const t of flow.trips.abandoned) {
    if (!t.payload || t._counted) continue;
    t._counted = true;
    say(...LINES.abandoned);
  }
}

// ── the settle beat ─────────────────────────────────────────────────────
// BRIEF § Settle: pay debt or interest, bank profit, answer one human event,
// then the market advances. Interest advances HERE and never while a menu is
// open, which is why the clock stops for it.
function settle(day) {
  if (day === 0 || over) return;
  const owed = market.settleDay();
  say(`— day ${day}. Interest brings it to ${eur(owed)}.`);
  renderHud();
  if (day >= DAYS) { finish(); return; }

  flow.clock.setPaused(true);
  $('settleDay').textContent = `end of day ${day}`;
  const paint = () => {
    $('settleFigs').textContent =
      `cash ${eur(market.cash)} · owed ${eur(market.debt)} · exit fund ${eur(market.exitFund)}`;
    $('sPay').disabled = market.cash <= 0 || market.debt <= 0;
    $('sBank').disabled = market.cash <= 0;
  };
  $('sPay').onclick = () => { market.payDebt(market.cash); paint(); renderHud(); };
  $('sBank').onclick = () => { market.bank(Math.ceil(market.cash / 2)); paint(); renderHud(); };
  $('sGo').onclick = () => { $('settle').hidden = true; flow.clock.setPaused(false); };
  paint();
  $('settle').hidden = false;
}

function finish() {
  const h = heat.hottest().heat;
  over = ending({
    debtCleared: market.debt <= 0,
    exitReached: market.exitFund >= 3000,
    heat: h,
    intact: cast.intact,
  });
  flow.clock.setPaused(true);
  $('overTitle').textContent = over.title;
  $('overLines').innerHTML = '';
  for (const l of over.lines) { const p = document.createElement('p'); p.textContent = l; $('overLines').append(p); }
  $('overStats').textContent =
    `debt ${eur(market.debt)} · exit fund ${eur(market.exitFund)} · hottest line ${(h * 100) | 0}% · contacts kept ${cast.intact}/${CONTACTS.length}`;
  $('over').hidden = false;
}

// ── the pin layer ───────────────────────────────────────────────────────
// Everything on the night map you can ask about: who runs what, who is
// watching, who is in your way, and what you are here to do. Built fresh
// each frame off live state, so a pin is never stale; `slot` fans pins that
// share a node so each stays tappable.
const RIVAL_HAUNTS = ['kurvi', 'torkkelinmaki', 'vaasanaukio'];

function missionState() {
  return {
    debt: market.debt, exitFund: market.exitFund, landed,
    jaskaTrust: cast.trust.jaska ?? 0,
  };
}

function markers() {
  if (!flow || !market) return [];
  const out = [];
  const slots = {};
  const slot = node => (slots[node] = (slots[node] ?? -1) + 1);

  // the contacts — the people layer: gangs, the wholesale, the brother, the ear
  for (const c of CONTACTS) {
    out.push({
      id: `contact:${c.id}`, node: c.at, slot: slot(c.at),
      glyph: c.name[0], color: '#F0027F', data: c,
    });
  }

  // the square's own sellers — the standing street market
  out.push({
    id: 'dealers', node: 'vaasanaukio', slot: slot('vaasanaukio'),
    glyph: '€', color: '#e8c24a',
  });

  // a rival crew, moving between their haunts by day
  const rivalAt = RIVAL_HAUNTS[flow.clock.day % RIVAL_HAUNTS.length];
  out.push({ id: 'rival', node: rivalAt, slot: slot(rivalAt), glyph: 'R', color: '#e2dccd' });

  // the patrol — appears where the hottest line runs once it is worth watching
  const h = heat.hottest();
  if (h.id && h.heat >= THRESHOLD.notice) {
    out.push({ id: 'patrol', edge: h.id, glyph: '!', color: '#ff7a1a' });
  }

  // mission goals, dimmed once they are met
  const s = missionState();
  for (const m of MISSIONS) {
    out.push({
      id: `mission:${m.id}`, node: m.at, slot: slot(m.at),
      glyph: '★', color: '#e8c24a', dim: m.done(s), data: m,
    });
  }
  return out;
}

// ── the small window ────────────────────────────────────────────────────
function showPop(hit, p) {
  const box = $('pop');
  const body = popBody(hit);
  if (!body) { hidePop(); return; }
  $('popBody').innerHTML = body;
  box.hidden = false;
  // hang it off the tap, clamped to the viewport
  const r = $('map').getBoundingClientRect();
  const w = Math.min(300, innerWidth - 20);
  box.style.width = w + 'px';
  box.style.left = Math.max(10, Math.min(innerWidth - w - 10, r.left + p.x - w / 2)) + 'px';
  box.style.top = Math.max(10, Math.min(innerHeight - 170, r.top + p.y + 14)) + 'px';
}
function hidePop() { $('pop').hidden = true; }

const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

function popBody(hit) {
  if (hit.kind === 'carrier') {
    const r = flow.routes.get(hit.routeId);
    if (!r) return null;
    const c = r.carriers.find(k => k.id === hit.carrierId);
    const yours = c.load.filter(id => flow.trips.byId(id)?.payload).length;
    const name = r.fixed
      ? (r.mode === 'metro' ? 'The metro' : r.mode === 'car' ? `Traffic · ${r.label}` : `Tram ${r.label}`)
      : `Your line ${r.id.toUpperCase()}`;
    return `<h3>${esc(name)}</h3>`
      + `<p>${c.load.length}/${r.carrierCapacity} aboard between ${esc(label(r.nodes[c.idx]))} and ${esc(label(r.nodes[Math.min(c.idx + Math.max(c.dir, 0), r.nodes.length - 1)]))}.</p>`
      + (yours ? `<p class="warn">${yours} of them are carrying for you${c.load.length > yours * 3 ? ' — well buried in the crowd' : c.load.length === yours ? ' — and nothing else is aboard to hide them' : ''}.</p>` : '')
      + (r.fixed ? '<p class="dim">The city runs this one. It was here before you and it will outlast you.</p>' : '');
  }
  if (hit.kind !== 'marker') return null;
  const mk = hit.marker;

  if (mk.id.startsWith('contact:')) {
    const c = mk.data;
    const t = cast.trust[c.id] ?? 0;
    const standing = t >= 3 ? 'He picks up when you call.' : t >= 1 ? 'He knows your face.' : 'He knows your name, which is not the same thing.';
    return `<h3>${esc(c.name)}</h3><p>${esc(c.role)}</p>`
      + `<p class="dim">${esc(standing)}${cast.offers(c.id) ? ` What he offers: ${esc(c.gift)}.` : ''}</p>`;
  }
  if (mk.id === 'dealers') {
    const rows = CLASSES.map(c => `${c.name} ${market.price('vaasanaukio', c.id)} €`).join(' · ');
    return `<h3>The square's sellers</h3>`
      + `<p>Always somebody working the doorway of the metro. Tonight's word on the street: ${rows}.</p>`
      + `<p class="dim">They are not with you and not against you — until one of them is.</p>`;
  }
  if (mk.id === 'rival') {
    return `<h3>The other crew</h3>`
      + `<p>Working ${esc(label(RIVAL_HAUNTS[flow.clock.day % RIVAL_HAUNTS.length]))} tonight. They move their corner every day, same as you should.</p>`
      + `<p class="warn">Carry a full bag past them and it becomes a conversation.</p>`;
  }
  if (mk.id === 'patrol') {
    const h = heat.hottest();
    const pct = Math.round(h.heat * 100);
    const word = h.heat >= THRESHOLD.act ? 'They are moving in.' : h.heat >= THRESHOLD.warn ? 'They are writing things down.' : 'They are looking, that is all — so far.';
    return `<h3>Patrol · ${esc(edgeName(h.id))}</h3>`
      + `<p>${word} Attention on this stretch: ${pct}%.</p>`
      + `<p class="dim">Past ${Math.round(THRESHOLD.warn * 100)}% they warn. Past ${Math.round(THRESHOLD.act * 100)}% they take the line for the night. Rest it, or bury the load deeper in the crowd.</p>`;
  }
  if (mk.id.startsWith('mission:')) {
    const m = mk.data;
    const done = m.done(missionState());
    return `<h3>★ ${esc(m.title)}${done ? ' — done' : ''}</h3><p>${esc(m.text)}</p>`;
  }
  return null;
}

// ── encounters ──────────────────────────────────────────────────────────
// Who turns up is not a die roll on a timer: the debt brings Igor's man, a hot
// line brings a rival, and carrying a lot brings the McCormicks. So an
// encounter is always something the player did, and can always be read coming.
function maybeFight(tick) {
  if (fight || over || pendingChoice || tick < nextFightAt) return;
  const carrying = Object.values(market.stock).reduce((a, b) => a + b, 0);
  const hottest = heat.hottest().heat;
  let kind = null;
  if (market.debt > 2600) kind = 'collector';
  else if (hottest >= THRESHOLD.warn) kind = 'rival';
  else if (carrying >= 15) kind = 'mccormick';
  if (!kind) { nextFightAt = tick + 180; return; }
  startFight(kind, tick);
}

function startFight(kind, tick) {
  fight = buildFight(kind, (flow.rng.seed ^ tick) >>> 0);
  armed = null;
  nextFightAt = tick + 700;
  flow.clock.setPaused(true);
  $('fight').hidden = false;
  if (!fightView) {
    fightView = new FightView($('board'));
    $('board').addEventListener('pointerup', onBoardTap);
    $('board').addEventListener('touchend', onBoardTap, { passive: true });
  }
  fightView.resize();
  paintFight();
}

// Tapping a ringed body commits the armed weapon at it. Nothing else on the
// board is clickable, so a mis-tap costs nothing.
function onBoardTap(e) {
  if (!fight || fight.over || !armed) return;
  const r = $('board').getBoundingClientRect();
  const p = e.changedTouches?.[0] || e;
  const u = fightView.hit(fight, p.clientX - r.left, p.clientY - r.top);
  if (!u) return;
  const legal = fight.targets(fight.actor, armed).some(t => t.id === u.id);
  if (!legal) return;
  fight.act({ kind: 'attack', weapon: armed, target: u.id });
  armed = null; fightView.arm(null);
  paintFight();
  stepEnemies();
}

// Run every non-player turn (and every turn at all, on auto) until it is the
// player's move again or the fight is done.
function stepEnemies() {
  let guard = 0;
  while (fight && !fight.over && guard++ < 60) {
    const u = fight.actor;
    if (!u) break;
    if (u.side === 'you' && !fight.auto) break;
    fight.autoTurn();
  }
  paintFight();
}

function paintFight() {
  if (!fight) return;
  fightView.draw(fight);
  $('fightWho').textContent = fight.foe.name.toUpperCase();
  $('fightRound').textContent = `round ${fight.round}`;
  $('fightLog').innerHTML = '';
  for (const l of fight.log.slice(0, 3)) {
    const p = document.createElement('p'); p.textContent = l; $('fightLog').append(p);
  }

  const box = $('fightBtns'); box.innerHTML = '';
  if (fight.over) {
    $('fightTell').textContent = '';
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn prime wide'; b.textContent = 'CONTINUE';
    b.onclick = endFight;
    box.append(b);
    return;
  }

  const u = fight.actor;
  $('fightTell').textContent = fight.intent();
  if (!u || u.side !== 'you') return;

  // one row of weapons — greyed where this row cannot use them, which is the
  // positioning rule taught by the buttons themselves
  for (const id of u.weapons) {
    const w = WEAPONS[id];
    const can = fight.canUse(u, id);
    const t = can ? fight.targets(u, id) : [];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn wide' + (armed === id ? ' prime' : '');
    b.disabled = !t.length;
    b.textContent = `${w.name.toUpperCase()} · ${w.dmg[1] ? `${w.dmg[0]}–${w.dmg[1]}` : 'no damage'}`
      + (can ? (t.length ? '' : ' · nothing in reach') : ` · not from the ${u.rowName}`);
    b.onclick = () => { armed = armed === id ? null : id; fightView.arm(armed); paintFight(); };
    box.append(b);
  }
  for (const o of fight.options(u).filter(o => o.kind === 'move')) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn wide';
    b.textContent = `MOVE TO THE ${(o.row > u.row ? 'BACK' : 'FRONT')} — ${['front', 'middle', 'back'][o.row]}`;
    b.onclick = () => { fight.act(o); armed = null; fightView.arm(null); paintFight(); stepEnemies(); };
    box.append(b);
  }
  const g = document.createElement('button');
  g.type = 'button'; g.className = 'btn wide'; g.textContent = 'BRACE';
  g.onclick = () => { fight.act({ kind: 'guard' }); paintFight(); stepEnemies(); };

  const auto = document.createElement('button');
  auto.type = 'button'; auto.className = 'btn wide';
  auto.textContent = fight.auto ? 'AUTO — ON' : 'LET THEM HANDLE IT (AUTO)';
  auto.onclick = () => { fight.auto = !fight.auto; if (fight.auto) stepEnemies(); else paintFight(); };

  const pay = document.createElement('button');
  pay.type = 'button'; pay.className = 'btn wide';
  pay.disabled = market.cash < fight.foe.pay;
  pay.textContent = `PAY THEM (${eur(fight.foe.pay)})`;
  pay.onclick = () => { fight.pay(); paintFight(); };

  const run = document.createElement('button');
  run.type = 'button'; run.className = 'btn wide';
  run.textContent = 'GET OUT OF THERE';
  run.onclick = () => { fight.flee(); paintFight(); };

  box.append(g, auto, pay, run);
}

function endFight() {
  const c = consequence(fight.over, fight.kind);
  market.cash = Math.max(0, market.cash + c.cash);
  if (c.stockLoss) {
    for (const k of Object.keys(market.stock)) {
      market.stock[k] = Math.floor(market.stock[k] * (1 - c.stockLoss));
    }
  }
  if (c.heat) {
    const h = heat.hottest();
    if (h.id) heat.edge.set(h.id, Math.min(1.2, heat.edge.get(h.id) + c.heat));
  }
  if (c.trust) cast.nudge(fight.kind === 'mccormick' ? 'sean' : 'igor', c.trust);
  say(c.line);
  fight = null; armed = null;
  $('fight').hidden = true;
  flow.clock.setPaused(false);
  renderHud(); renderSheet();
}

function offerChoice() {
  if (over) return;
  pendingChoice = LINES.choice;
  flow.clock.setPaused(true);
  $('choiceText').textContent = pendingChoice.text;
  const box = $('choiceBtns'); box.innerHTML = '';
  for (const o of pendingChoice.options) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn wide';
    b.textContent = o.label;
    b.onclick = () => {
      cast.nudge('jaska', o.trust);
      if (o.cash) market.cash += o.cash;
      $('choice').hidden = true;
      pendingChoice = null;
      flow.clock.setPaused(false);
      say(o.trust > 0 ? 'You sit. The charcoal keeps going.' : 'You say you are working. He nods and does not look up.');
      renderHud();
    };
    box.append(b);
  }
  $('choice').hidden = false;
}

// ── ui ──────────────────────────────────────────────────────────────────
function renderHud() {
  $('cash').textContent = eur(market.cash);
  $('debt').textContent = eur(market.debt);
  $('fund').textContent = eur(market.exitFund);
  const h = heat.hottest();
  $('heat').textContent = h.heat < THRESHOLD.notice ? 'quiet'
    : h.heat < THRESHOLD.warn ? `noticed · ${edgeName(h.id)}`
      : h.heat < THRESHOLD.act ? `watched · ${edgeName(h.id)}` : `moving in · ${edgeName(h.id)}`;
  $('heat').className = h.heat >= THRESHOLD.warn ? 'hot' : '';
  $('day').textContent = `day ${Math.min(flow.clock.day + 1, DAYS)}/${DAYS}`;
  $('lines').textContent = `${flow.routes.list.length}/${flow.routes.maxRoutes} lines`;
}

function renderSheet() {
  const box = $('sheet');
  if (!sel) { box.innerHTML = '<p class="hint">Drag between two stops to draw a line. Tap a stop to trade.</p>'; return; }
  const n = flow.graph.node(sel);
  const contact = CONTACTS.find(c => c.at === sel);
  const q = n.waiting.length;
  let html = `<h2>${label(sel)}</h2><p class="hint">${q} waiting${contact ? ` · ${contact.name} — ${contact.role}` : ''}</p><table>`;
  for (const c of CLASSES) {
    const p = market.price(sel, c.id);
    const was = market.lastSeen(c.id);
    const arrow = p > was ? '▲' : p < was ? '▼' : '·';
    html += `<tr><td>${c.name}</td><td class="p">${p} € <span class="was">${arrow} ${was}</span></td>`
      + `<td class="own">${market.stock[c.id]}</td>`
      + `<td><button class="btn" data-buy="${c.id}">BUY 5</button>`
      + `<button class="btn send" data-send="${c.id}">SEND 5</button></td></tr>`;
  }
  html += '</table>';
  box.innerHTML = html;
  for (const b of box.querySelectorAll('[data-buy]')) {
    b.onclick = () => { market.buy(sel, b.dataset.buy, 5); renderHud(); renderSheet(); };
  }
  for (const b of box.querySelectorAll('[data-send]')) {
    b.onclick = () => {
      const dest = bestDest(b.dataset.send, sel);
      if (!dest) { say('Nowhere better to send it tonight.'); return; }
      send(b.dataset.send, 5, sel, dest);
    };
  }
}

// the destination paying most for it right now — the player still chooses
// WHEN, which is the decision that matters once loads arrive late
function bestDest(cls, from) {
  let best = null, v = market.price(from, cls);
  for (const n of flow.graph.nodes.values()) {
    if (n.id === from) continue;
    const p = market.price(n.id, cls);
    if (p > v) { v = p; best = n.id; }
  }
  return best;
}

function renderFeed() {
  const f = $('feed');
  if (!f) return;
  f.innerHTML = '';
  for (const m of msgs.slice(0, 5)) { const d = document.createElement('div'); d.textContent = m; f.append(d); }
}

// ── loop ────────────────────────────────────────────────────────────────
let last = 0;
function frame(now) {
  const dt = last ? Math.min(120, now - last) : 0; last = now;
  if (flow) {
    flow.update(dt);
    renderer.draw(flow, { draft, selected: null, alpha: flow.clock.alpha(), markers: markers() });
    if (flow.clock.tick % 10 === 0) renderHud();
  }
  requestAnimationFrame(frame);
}

addEventListener('resize', () => renderer?.resize());
$('play').addEventListener('click', () => {
  $('title').hidden = true;
  flow.clock.setPaused(false);
});
$('pause').addEventListener('click', () => {
  flow.clock.setPaused(!flow.clock.paused);
  $('pause').textContent = flow.clock.paused ? '▶' : '❚❚';
  $('pause').setAttribute('aria-label', flow.clock.paused ? 'Resume' : 'Pause');
});
$('speed').addEventListener('click', () => {
  const s = flow.clock.speed >= 4 ? 1 : flow.clock.speed * 2;
  flow.clock.setSpeed(s);
  $('speed').textContent = `×${s}`;
});
$('again').addEventListener('click', () => { $('over').hidden = true; boot(7); flow.clock.setPaused(false); });
$('popClose').addEventListener('click', hidePop);
addEventListener('keydown', e => { if (e.key === 'Escape') hidePop(); });

boot(7);
requestAnimationFrame(frame);

window.__pt = {
  get flow() { return flow; },
  get market() { return market; },
  get heat() { return heat; },
  get cast() { return cast; },
  debug: {
    boot, send, settle, finish, say, startFight,
    markers, showPop, hidePop, paintFight,
    get fight() { return fight; },
    get over() { return over; },
  },
};
