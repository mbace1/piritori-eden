// Piritori → Eden — the product. Owns market, debt, heat, trust, narrative and
// the night presentation; borrows every moving part from flow-core.

import { createFlow } from '../../flow-core/sim.js?v=1';
import { KALLIO } from '../../flow-core/city.js?v=1';
import { FlowRenderer } from '../../flow-core/render.js?v=1';
import { RouteDrawer } from '../../flow-core/input.js?v=1';
import { THEME, PAL } from './palette.js?v=1';
import { Market, CLASSES } from './market.js?v=2';
import { Heat, THRESHOLD } from './heat.js?v=1';
import { CONTACTS, LINES, MISSIONS, Cast, ending } from './narrative.js?v=1';
import { startFight as buildFight, WEAPONS, ITEMS, consequence } from './fight.js?v=4';
import { FightView } from './fightview.js?v=5';
import { image } from '../../assets/load.js?v=1';

const $ = id => document.getElementById(id);
const eur = n => `${Math.round(n).toLocaleString('fi-FI')} €`;

const DAYS = 7;
let flow, market, heat, cast, renderer, drawer;
let sel = null, draft = null, over = null, drained = 0, pendingChoice = null;
let fight = null, nextFightAt = 900, fightView = null, armed = null;
let msgs = [], landed = 0;
let dealToday = null;            // one bargain a day, from one contact
let roomWith = null;             // whose place you are standing in

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
        // a surge dries up the whole scarce END of the market, not one name
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
  rollDeal(0);

  // the canvas takes the diagram's own proportions, so there is no dead band
  // above and below it on a portrait phone
  $('map').style.aspectRatio = `${flow.graph.bounds.w} / ${flow.graph.bounds.h}`;
  drawer?.destroy();               // or a restart leaves the old one listening
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
  const { n: held, fake } = market.hold(cls, n);
  if (!held) return;
  // the payload stays OPAQUE to the core — it is a tag the core copies and
  // never reads, which is what lets flow-core carry groceries in Toko Move
  const t = flow.inject(from, to, { cls, n: held, fake });
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
    const r = market.settleArrival(t.dest, t.payload.cls, t.payload.n, t.payload.fake || 0);
    const clean = heat.pathClean(t.legsUsed || t.legs);
    landed += 1;
    say(`${t.payload.n} ${t.payload.cls} landed at ${label(t.dest)} — ${eur(r.got)}${clean ? '' : ' (watched)'}.`);
    // where a cut bag is found out: by the money, at the far end, too late
    if (r.fake) {
      say(r.fake >= t.payload.n
        ? `None of it was real. ${r.fake} bags of chalk and a name you will remember.`
        : `${r.fake} of those bags were cut with something. The buyer noticed before you did.`);
    }
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
// ── the bargain ─────────────────────────────────────────────────────────
// One offer a day, from one contact, at their own node. Who offers rotates by
// day so it is never the same face; whether it is worth anything is decided by
// how you have treated them, and the player is told the discount before
// committing. See market.js § the bargain for why that is the whole warning.
function rollDeal(day) {
  dealToday = null;
  for (let i = 0; i < CONTACTS.length; i++) {
    const c = CONTACTS[(day + i) % CONTACTS.length];
    const d = market.dealFor(day, c.id, cast.trust[c.id] ?? 0);
    if (d) { dealToday = { ...d, at: c.at, who: c.name }; return; }
  }
}

// ── the room ────────────────────────────────────────────────────────────
// A place you stand in rather than a tooltip you read. Everything in here
// already existed and was scattered: the bargain was a row at the bottom of a
// price table, and a contact was two lines in a hover. The targets put the
// person in a room and give you two or three things to do about it, which is
// also where the ITEM-shaped question — what can you actually spend money on
// besides stock — finally gets an answer.
function openRoom(id) {
  const c = CONTACTS.find(x => x.id === id);
  if (!c || over) return;
  roomWith = c;
  flow.clock.setPaused(true);
  hidePop();
  $('room').hidden = false;
  paintRoom();
  // the interior, if one has been generated. Additive, like the arenas: with
  // nothing in assets/out/ the card is just the person and the words.
  const art = $('roomArt');
  art.hidden = true;
  image(`piritori/interior-${c.id}`).then(img => {
    if (!img || roomWith?.id !== c.id) return;
    art.hidden = false;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = art.clientWidth * dpr, h = w * 9 / 16;
    art.width = w; art.height = h;
    const g = art.getContext('2d');
    const s = Math.max(w / img.width, h / img.height);
    g.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2,
      img.width * s, img.height * s);
  });
}

function closeRoom() {
  roomWith = null;
  $('room').hidden = true;
  if (!over) flow.clock.setPaused(false);
  renderHud(); renderSheet();
}

function paintRoom() {
  const c = roomWith;
  if (!c) return;
  const t = cast.trust[c.id] ?? 0;
  $('roomWho').textContent = c.name.toUpperCase();
  $('roomRole').textContent = c.role;
  $('roomLine').textContent = c.said
    || (t >= 3 ? 'He puts the cloth down when you come in.'
      : t >= 1 ? 'He nods, and keeps working.'
        : 'He looks up, and takes his time about it.');

  const box = $('roomBtns');
  box.innerHTML = '';
  const add = (text, fn, cls = 'btn wide') => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = cls; b.textContent = text;
    b.onclick = fn; box.append(b); return b;
  };

  // 1. his own offer, if tonight's is his. This is the bargain, moved out of
  //    the price table and into the room where the man is standing.
  if (dealToday && dealToday.seller === c.id && !dealToday.taken) {
    const p = market.dealPrice(c.at, dealToday);
    add(`TAKE THE ${dealToday.good.toUpperCase()} · ${p * dealToday.n} €`, () => {
      const r = market.takeDeal(c.at, dealToday);
      if (!r.n) { say('You cannot cover it.'); return; }
      dealToday.taken = true;
      say(`${r.n} ${dealToday.good} off ${c.name} for ${eur(r.spent)}. He does not count it twice.`);
      paintRoom(); renderHud();
    }, 'btn wide prime');
    const tell = document.createElement('p');
    tell.className = 'dim';
    tell.textContent = market.dealTell(dealToday)
      + (dealToday.appraised ? ` — ${dealToday.appraised}` : '');
    box.append(tell);
  }

  // 2. ask him about SOMEBODY ELSE'S offer. You cannot ask the man selling you
  //    a bag whether the bag is real; a second relationship is the price of
  //    knowing, and that is the point of having more than one.
  if (dealToday && dealToday.seller !== c.id && !dealToday.appraised) {
    const cost = market.appraisalCost(t);
    add(`ASK ABOUT ${dealToday.who.toUpperCase()}'S OFFER · ${cost} €`, () => {  // eslint-disable-line
      const r = market.appraise(dealToday, t);
      if (!r.told && r.why === 'you cannot cover it') { say('You cannot cover it.'); return; }
      dealToday.appraised = r.told
        ? (r.cut ? `${c.name} says it is cut.` : `${c.name} says it is clean.`)
        : `${c.name} took the money and changed the subject.`;
      say(dealToday.appraised);
      paintRoom(); renderHud();
    });
  }

  // what you were told, said in the room you were told it in. Without this the
  // money left and nothing on screen changed, which reads as a broken button.
  if (dealToday?.appraised && dealToday.seller !== c.id) {
    const p = document.createElement('p');
    p.className = 'dim';
    p.textContent = dealToday.appraised;
    box.append(p);
  }

  add('LEAVE', closeRoom);
}

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
  rollDeal(day);                 // a new night, a new offer
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
  fightView.useArena(kind);      // the ground this one is happening on
  // Every roster has somebody faster than Aatami, so the first actor is
  // usually an enemy — and paintFight() draws no controls when the actor is
  // hostile. Without this the panel opened dead and stayed dead forever.
  stepEnemies();
}

// Tapping a ringed body commits the armed weapon at it. Nothing else on the
// board is clickable, so a mis-tap costs nothing.
function onBoardTap(e) {
  if (!fight || fight.over || !armed) return;
  const r = $('board').getBoundingClientRect();
  const p = e.changedTouches?.[0] || e;
  const u = fightView.hit(fight, p.clientX - r.left, p.clientY - r.top);
  if (!u) return;
  // `!bottle` means the armed thing is an ITEM rather than a weapon. One
  // variable rather than two, so there is no state where both are armed.
  const item = armed.startsWith('!') ? armed.slice(1) : null;
  const legal = item
    ? fight.itemTargets(fight.actor).some(t => t.id === u.id)
    : fight.targets(fight.actor, armed).some(t => t.id === u.id);
  if (!legal) return;
  fight.act(item
    ? { kind: 'throw', item, target: u.id }
    : { kind: 'attack', weapon: armed, target: u.id });
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

// The acting unit's panel. Segments rather than a smooth bar, because the
// question a player actually has is "how many more of those can he take", and
// a bar you can count answers it while a percentage does not.
function paintUnit(u) {
  const box = $('fightUnit');
  if (!u || u.prop) { box.hidden = true; return; }
  box.hidden = false;
  $('fuName').textContent = u.name.toUpperCase() + (u.side === 'you' ? '' : ' — THEIRS');
  $('fuHp').textContent = `♥ ${Math.max(0, u.hp)} / ${u.maxHp}`;
  const beads = (el, now, max, on, off) => {
    el.innerHTML = '';
    const n = Math.min(8, max);
    const lit = Math.round((Math.max(0, now) / max) * n);
    for (let i = 0; i < n; i++) {
      const b = document.createElement('b');
      b.style.background = i < lit ? on : off;
      el.append(b);
    }
  };
  // guard is a flat reduction rather than a pool, so it shows what it IS —
  // how much is coming off each hit — instead of pretending to be a meter
  beads($('fuGuard'), (u.guard || 0) + (u.bracing ? 2 : 0), 5, PAL.draft, '#1d2630');
  beads($('fuNerve'), u.nerve, u.maxNerve, PAL.magenta, '#2a1d27');
  drawFace($('fightFace'), u);
}

// No character art yet, so the portrait is drawn: the same flat silhouette in
// a hard line the board uses, tinted by side. It is a placeholder that obeys
// the house rule rather than a grey box that admits nothing was made.
function drawFace(cv, u) {
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  g.fillStyle = u.side === 'you' ? '#141b22' : '#1d1416';
  g.fillRect(0, 0, W, H);
  g.fillStyle = u.side === 'you' ? PAL.ink : '#b4655a';
  g.strokeStyle = '#0b0e13';
  g.lineWidth = 3;
  g.beginPath(); g.arc(W / 2, H * 0.42, W * 0.22, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath();
  g.moveTo(W * 0.18, H); g.lineTo(W * 0.28, H * 0.68);
  g.lineTo(W * 0.72, H * 0.68); g.lineTo(W * 0.82, H);
  g.closePath(); g.fill(); g.stroke();
}

function paintFight() {
  if (!fight) return;
  fightView.draw(fight);
  paintUnit(fight.actor);
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
  // ITEM, from the mockups and now a real thing: what is lying about on this
  // street. Shown only while there is any left, because a permanently greyed
  // button is a promise the game keeps failing to keep.
  for (const o of fight.options(u).filter(o => o.kind === 'throw')) {
    const it = ITEMS[o.item];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn wide' + (armed === `!${o.item}` ? ' prime' : '');
    b.textContent = `THROW THE ${it.name.toUpperCase()} · ${it.dmg[0]}–${it.dmg[1]} · ${fight.items[o.item]} left`;
    b.onclick = () => {
      armed = armed === `!${o.item}` ? null : `!${o.item}`;
      fightView.arm(armed); paintFight();
    };
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
  g.type = 'button'; g.className = 'btn wide'; g.textContent = 'BRACE — get a grip';
  g.onclick = () => { fight.act({ kind: 'guard' }); paintFight(); stepEnemies(); };

  // Never greyed out, every single round. Timshel: the choice stays open, and
  // whether they take it is about their nerve, not about the button.
  const down = document.createElement('button');
  down.type = 'button'; down.className = 'btn wide';
  down.textContent = 'OFFER THEM THE OUT';
  down.onclick = () => { fight.standDown(); paintFight(); if (!fight.over) stepEnemies(); };

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

  box.append(g, down, auto, pay, run);
}

function endFight() {
  const c = consequence(fight.over, fight.kind, fight);
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
  $('lines').textContent = `${flow.routes.drawn.length}/${flow.routes.maxRoutes} lines`;
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

  // Anybody standing here is worth walking in on. The bargain used to be a row
  // at the bottom of this table; it lives in the room now, because a man with
  // an offer is a person and not a line item.
  if (contact) {
    html += `<div class="deal"><p><strong>${esc(contact.name)}</strong> is here.`
      + `${dealToday && dealToday.seller === contact.id && !dealToday.taken ? ' He has something for you.' : ''}</p>`
      + `<button class="btn" id="visit">GO IN AND SEE ${esc(contact.name.split(' ')[0].toUpperCase())}</button></div>`;
  }

  box.innerHTML = html;
  const visit = $('visit');
  if (visit) visit.onclick = () => openRoom(contact.id);
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
    boot, send, settle, finish, say, startFight, openRoom, closeRoom, paintRoom,
    get room() { return roomWith; },
    markers, showPop, hidePop, paintFight, renderSheet,
    // SETUP ONLY (AGENTS.md §4): force tonight's offer to a known shape so a
    // gate can click it. The taking is still done by clicking the button.
    forceDeal(d) { dealToday = { n: 5, discount: 0.4, fake: false, trust: 0, ...d }; renderSheet(); },
    get deal() { return dealToday; },
    get sel() { return sel; },
    set sel(v) { sel = v; renderSheet(); },
    get fightView() { return fightView; },
    get fight() { return fight; },
    get over() { return over; },
  },
};
