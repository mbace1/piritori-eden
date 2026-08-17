// Piritori → Eden — the product. Owns market, debt, heat, trust, narrative and
// the night presentation; borrows every moving part from flow-core.

import { createFlow } from '../../flow-core/sim.js?v=1';
import { KALLIO } from '../../flow-core/city.js?v=1';
import { FlowRenderer } from '../../flow-core/render.js?v=1';
import { RouteDrawer } from '../../flow-core/input.js?v=1';
import { THEME } from './palette.js?v=1';
import { Market, CLASSES } from './market.js?v=1';
import { Heat, THRESHOLD } from './heat.js?v=1';
import { CONTACTS, LINES, Cast, ending } from './narrative.js?v=1';

const $ = id => document.getElementById(id);
const eur = n => `${Math.round(n).toLocaleString('fi-FI')} €`;

const DAYS = 7;
let flow, market, heat, cast, renderer, drawer;
let sel = null, draft = null, over = null, drained = 0, pendingChoice = null;
let msgs = [];

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

  // the canvas takes the diagram's own proportions, so there is no dead band
  // above and below it on a portrait phone
  $('map').style.aspectRatio = `${flow.graph.bounds.w} / ${flow.graph.bounds.h}`;
  renderer = new FlowRenderer($('map'), THEME);
  drawer = new RouteDrawer($('map'), renderer, flow, {
    onCommit: (mode, nodes) => {
      const r = flow.addRoute(mode, nodes);
      say(r.error ? `— ${r.error}` : `Line ${r.route.id.toUpperCase()} drawn: ${nodes.map(label).join(' → ')}.`);
      renderHud();
    },
    onTap: id => { sel = id; renderSheet(); },
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
    renderer.draw(flow, { draft, selected: null, alpha: flow.clock.alpha() });
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

boot(7);
requestAnimationFrame(frame);

window.__pt = {
  get flow() { return flow; },
  get market() { return market; },
  get heat() { return heat; },
  get cast() { return cast; },
  debug: { boot, send, settle, finish, say, get over() { return over; } },
};
