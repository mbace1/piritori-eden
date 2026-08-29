import { loadGameData, shortestPath, assetUrl } from './content.js?v=1';
import {
  SAVE_KEY, createState, loadState, saveState, currentSchedule, currentEncounter,
  formatBlock, choiceStatus, chooseEncounter, advanceSchedule, deployedCrew,
  transactOffer, applyEffects, commitRoute, sendOnRoute,
  crewRecord, hiringPoolFor, hireFromPool,
  isNamed, careerLeft, careerIsVisible, ageCrew,
  droppedKit, takeLoot, loseKitOf, canFenceHere, sellLoot, resaleAt, conditionWord,
  arrestCrew, chapterProgress, chapterGoalMet, chapterEndingAvailable, attemptChapterEnding,
} from './state.js?v=1';
import { createPauseMenu } from './pause.js?v=1';
import { board, exposureHere, markSeen, addFootprint, INFO } from './board.js?v=1';
import {
  createBattleState, selectedUnit, selectUnit, selectAction, playerAttack, brace, useItem,
  validMoveCells, moveUnit, endPlayerPhase, autoCommand, withdrawBattle,
  negotiateBattle, resultEffects, injuredPlayers, selectStance,
  policeAwaitingPosture, choosePolicePosture, takenByPolice, savedFromPolice, POLICE_POSTURE,
} from './battle.js?v=1';
import { LANES, ROWS, totalRows, depthOf, parseSlotKey, slotKey, describeSlot } from './grid.js?v=1';
import { boot as bootChrome } from './chrome.js?v=1';
import { STANCE, STANCES } from './stance.js?v=1';
import { mountBattleStage3D, disposeBattleStage3D } from './render3d.js?v=1';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const money = value => `€${Number(value).toLocaleString('fi-FI', { maximumFractionDigits: 2 })}`;
const cap = value => String(value ?? '').replaceAll('-', ' ').replaceAll('_', ' ').toUpperCase();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Stance labels are the exact English/Finnish/Japanese Godot already ships
// (`locale/ui.csv` battle.stance_*) — one vocabulary for one concept, not a
// second translation of the same three words.
const UI = {
  en: {
    route: 'ROUTE', encounter: 'ENCOUNTER', ledger: 'LEDGER', battle: 'BATTLE', news: 'NEWS',
    enter: 'ENTER ENCOUNTER', continue: 'RETURN TO MAP', planning: 'PLAN A ROUTE',
    commit: 'PIN ROUTE', clear: 'CLEAR', send: 'SEND ONE PACK', objective: 'OBJECTIVE',
    start_training: 'START TRAINING',
    attack: 'ATTACK', move: 'REPOSITION', brace: 'BRACE', end: 'END TEAM TURN',
    use_item: 'USE',
    auto: 'AUTO TEAM', withdraw: 'WITHDRAW', negotiate: 'NEGOTIATE',
    stance: 'STANCE', stance_AGGRESSIVE: 'AGGRESSIVE', stance_DEFENSIVE: 'DEFENSIVE', stance_HOLD_THE_LINE: 'HOLD THE LINE',
    police_here: 'POLICE ARE HERE', police_one_down: 'of the crew is on the ground.',
    police_many_down: 'of the crew are on the ground.',
    police_back_off: 'BACK OFF — LEAVE THEM', police_help: 'GO BACK FOR THEM',
  },
  fi: {
    route: 'REITTI', encounter: 'KOHTAAMINEN', ledger: 'KIRJANPITO', battle: 'TAISTELU', news: 'UUTISET',
    enter: 'MENE KOHTAAMISEEN', continue: 'PALAA KARTALLE', planning: 'SUUNNITTELE REITTI',
    commit: 'KIINNITÄ REITTI', clear: 'TYHJENNÄ', send: 'LÄHETÄ YKSI PAKKAUS', objective: 'TAVOITE',
    start_training: 'ALOITA HARJOITUS',
    attack: 'HYÖKKÄÄ', move: 'VAIHDA ASEMAA', brace: 'SUOJAA', end: 'LOPETA VUORO',
    use_item: 'KÄYTÄ',
    auto: 'AUTO-JOUKKUE', withdraw: 'VETÄYDY', negotiate: 'NEUVOTTELE',
    stance: 'ASENTO', stance_AGGRESSIVE: 'HYÖKKÄÄVÄ', stance_DEFENSIVE: 'PUOLUSTAVA', stance_HOLD_THE_LINE: 'PIDÄ LINJA',
    police_here: 'POLIISI ON PAIKALLA', police_one_down: 'jäsen makaa maassa.',
    police_many_down: 'jäsentä makaa maassa.',
    police_back_off: 'PERÄÄNNY — JÄTÄ HEIDÄT', police_help: 'MENE HEIDÄN LUOKSEEN',
  },
};

let data;
let state;
let routePlanning = false;
let routeDraft = [];
let observation = '';
let toastTimer;

function tr(key) { return UI[state?.locale ?? 'en'][key] ?? UI.en[key] ?? key; }
function persist() { saveState(state); }
function logToast(message) {
  const toast = $('toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function renderHud() {
  $('cashValue').textContent = Number(state.cash).toLocaleString('fi-FI', { maximumFractionDigits: 2 });
  $('markkaValue').textContent = Math.round(state.markka).toLocaleString('fi-FI');
  $('debtValue').textContent = Math.round(state.debt).toLocaleString('fi-FI');
  $('intelValue').textContent = state.intel;
  $('blockLabel').textContent = formatBlock(state, data.content);
  $('localeButton').textContent = state.locale.toUpperCase();
  $('eraLabel').textContent = state.locale === 'fi'
    ? '2003 · AATAMI · ERA I · UI FI / TARINA EN (ALFA)'
    : '2003 · AATAMI · ERA I';
  document.documentElement.lang = state.locale;
}

function renderNav() {
  for (const button of $('modeNav').querySelectorAll('[data-mode-target]')) {
    const mode = button.dataset.modeTarget;
    button.setAttribute('aria-current', state.mode === mode ? 'page' : 'false');
    button.querySelector('span:last-child').textContent = tr(mode);
  }
  $('game').dataset.mode = state.mode;
}

function render() {
  renderHud();
  renderNav();
  const root = $('modeRoot');
  const views = {
    route: renderRoute,
    encounter: renderEncounter,
    ledger: renderLedger,
    battle: renderBattle,
    news: renderNews,
  };
  root.innerHTML = (views[state.mode] ?? renderRoute)();

  // DESIGN_AUTHORITY.md addendum 2026-08-28: real 3D, not just registered
  // meshes, is one of the parity gaps this build owes Godot. Mounted here
  // rather than inside renderBattle() because it needs the REAL <canvas>'s
  // container already attached to the document (WebGL context creation
  // reads its size), which is only true after innerHTML has landed.
  if (state.mode === 'battle' && state.battle) {
    mountBattleStage3D($('stage3dMount'), state.battle, data);
  } else {
    disposeBattleStage3D();
  }
}

function mapPath(path) {
  return path.map((id, index) => {
    const point = data.anchors.get(id)?.board;
    return point ? `${index ? 'L' : 'M'} ${point.x} ${point.y}` : '';
  }).join(' ');
}

function mapBackground() {
  return `
    <path class="map-water" d="M0 0H1000V1000H0Z"/>
    <path class="map-land" d="M58 36L844 39 918 127 872 260 966 350 1000 517 924 674 811 729 758 958 83 954 28 809 77 676 35 511 91 371 36 222Z"/>
    <path class="map-district" d="M112 79L388 76 445 315 338 496 89 448Z"/>
    <path class="map-district" d="M402 67L773 62 855 242 719 356 449 319Z"/>
    <path class="map-district" d="M87 462L339 506 421 742 309 910 69 825Z"/>
    <path class="map-district" d="M358 496L729 356 842 566 753 823 424 742Z"/>
    <path class="map-district" d="M760 336L932 366 951 585 839 632 751 556Z"/>
    <path class="map-park" d="M415 482L540 464 571 575 440 598Z"/>
  `;
}

/** flat [x0,y0,x1,y1,...] board points -> an SVG path `d`. */
function flatPointsToPath(points) {
  let d = '';
  for (let i = 0; i < points.length; i += 2) d += `${i === 0 ? 'M' : 'L'} ${points[i]} ${points[i + 1]} `;
  return d;
}

// Relative luminance off sRGB, same formula `Color.get_luminance()` uses in
// Godot — so a chip's ink colour picks the same side of the line the real
// game does, not a second contrast rule invented for this build.
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  const lin = c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * The real HSL tram/metro network — `map/kallio-transit-layer-v1.json`,
 * ported from Godot's L2 (`TRANSIT_LAYERS.md` §3, §9.3; `city_map.gd`'s
 * `_draw_public_transit()`): the same real GTFS geometry, real per-line
 * colours and corridor fanning `map/tools/transit-layer.mjs` derives for
 * BOTH builds, drawn here as a flat colour line over a hard dark keyline —
 * no glow, because this build has no live layer for a glow to distinguish
 * from. Independent of `data.map.edges` (still what `shortestPath()` plans
 * a route over — no straight line is drawn for it any more, 2026-08-28:
 * "you only use trams, metro, or go by foot on bigger actual streets") —
 * this is the real network a Helsinki player recognises, not the
 * click-to-travel graph.
 */
function transitLayerSvg() {
  const services = data.transit?.services ?? [];
  const lines = services.map(item => {
    const d = flatPointsToPath(item.points);
    const heavy = item.mode === 'metro';
    const w = heavy ? 10 : 6;
    return `
      <path class="transit-keyline" d="${d}" stroke-width="${w + 3}"/>
      <path class="transit-line" d="${d}" stroke="${item.colour}" stroke-width="${w}"/>`;
  }).join('');
  const chips = services.flatMap(item => item.chips.map(([x, y]) => {
    const label = esc(item.service);
    const h = 34, charW = 15;
    const w = Math.max(h, label.length * charW + 16);
    const ink = luminance(item.colour) > 0.45 ? '#16191b' : '#f0e9d8';
    return `<g class="transit-chip">
      <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${item.colour}"/>
      <text class="transit-chip-text" x="${x}" y="${y}" fill="${ink}">${label}</text>
    </g>`;
  })).join('');
  return `<g aria-hidden="true">${lines}${chips}</g>`;
}

function ordinaryFlowSvg() {
  const selected = data.map.edges.filter((_, index) => index % 2 === 0).slice(0, 11);
  return selected.map((edge, index) => {
    const a = data.anchors.get(edge.from)?.board;
    const b = data.anchors.get(edge.to)?.board;
    if (!a || !b) return '';
    const cx = reducedMotion ? (a.x + b.x) / 2 : a.x;
    const cy = reducedMotion ? (a.y + b.y) / 2 : a.y;
    const animation = reducedMotion ? '' : `
      <animate attributeName="cx" values="${a.x};${b.x};${a.x}" dur="${4.5 + (index % 4)}s" begin="-${index * .43}s" repeatCount="indefinite"/>
      <animate attributeName="cy" values="${a.y};${b.y};${a.y}" dur="${4.5 + (index % 4)}s" begin="-${index * .43}s" repeatCount="indefinite"/>`;
    return `<circle class="map-flow" cx="${cx}" cy="${cy}" r="${index % 3 === 0 ? 7 : 5}">${animation}</circle>`;
  }).join('');
}

function anchorSvg(anchor, current, selected) {
  const point = anchor.board;
  const locked = ['locked', 'teaser'].includes(anchor.sliceState);
  const stateClass = [current ? 'current' : '', selected ? 'selected' : '', locked ? 'locked' : '', anchor.sliceState === 'landmark' ? 'landmark' : ''].join(' ');
  const offset = anchor.labelOffset ?? [14, -20];
  const small = anchor.label.length > 15 ? 'small' : '';
  const schedule = currentSchedule(state, data.content);
  const mission = schedule?.anchor_id === anchor.id ? `<path class="mission-pulse" d="M${point.x - 10} ${point.y - 45}l10 -16 10 16 -10 8Z"/>` : '';
  return `
    <g class="map-node ${stateClass}" data-anchor-group="${esc(anchor.id)}">
      ${mission}
      <circle class="map-node-dot" cx="${point.x}" cy="${point.y}" r="${locked ? 14 : 18}"/>
      <circle class="map-anchor-hit" data-action="select-anchor" data-anchor="${esc(anchor.id)}"
        cx="${point.x}" cy="${point.y}" r="55" fill="transparent" role="button" tabindex="0"
        aria-label="${esc(anchor.label)}${locked ? ', locked' : ''}"/>
      <text class="map-node-label ${small}" x="${point.x + offset[0]}" y="${point.y + offset[1]}">${esc(anchor.label)}</text>
    </g>`;
}

function progressionCard(slot) {
  const firstPurchase = state.flags.includes('first-purchase-made') || (state.stock.piri ?? 0) > 0
    || Boolean(state.choices['enc-first-sale']);
  const firstSaleChoice = state.choices['enc-first-sale'];
  const firstSale = firstSaleChoice === 'complete' || firstSaleChoice === 'ask-introduction';
  const permanentCrew = state.recruited.length;
  const knownSellOffers = data.content.market_offers.filter(offer => offer.side === 'sell'
    && state.revealedOffers.includes(offer.id));

  let phase = 'STREET BUYER';
  let title = 'START AT PIRITORI';
  let body = 'The whole Kallio board is visible. Piritori is highlighted because it is the only live lead Aatami has.';
  let ladder = '<span>€160 CASH</span><i>→</i><strong>BUY €45</strong>';

  if (firstPurchase && !firstSale) {
    phase = 'FIRST ARBITRAGE';
    title = 'DEMAND AT SILTASAARI';
    body = (state.stock.piri ?? 0) > 0
      ? 'A known buyer across the map will pay more tonight. Go to the newly highlighted anchor and make the first profit.'
      : 'The demand lead is live, but Aatami still needs the one abstract pack offered at Piritori.';
    ladder = '<span>PIRITORI €45</span><i>→</i><strong>SILTASAARI €68 · +€23</strong>';
  } else if (firstSale && permanentCrew === 0) {
    phase = 'NEIGHBOURHOOD SELLER';
    title = 'PROFIT CREATES REACH';
    body = 'The first margin is recorded. The next leads introduce a runner and the ordinary traffic that will carry future work.';
    ladder = '<span>ONE SALE</span><i>→</i><strong>RECRUIT A RUNNER</strong>';
  } else if (permanentCrew > 0 && knownSellOffers.length < 3) {
    phase = 'NETWORK BUILDER';
    title = 'DEMAND IS SPREADING';
    body = 'Aatami still names the destinations, but recruited people and shared routes begin doing the street work.';
    ladder = `<span>${permanentCrew} CREW</span><i>→</i><strong>${knownSellOffers.length} KNOWN BUYER${knownSellOffers.length === 1 ? '' : 'S'}</strong>`;
  } else if (knownSellOffers.length >= 3) {
    phase = 'EMERGING SUPPLIER';
    title = 'THE STREET BECOMES A NETWORK';
    body = 'Several areas now depend on Aatami’s supply. Price, crew, information and consequences have replaced the first hand-to-hand sale.';
    ladder = `<span>${knownSellOffers.length} DEMAND POINTS</span><i>→</i><strong>COMMAND THE SUPPLY</strong>`;
  }

  return `<section class="paper-panel progression-card" aria-label="Current business progression">
    <p class="section-label">${phase} · ${esc(formatBlock(state, data.content))}</p>
    <h2>${title}</h2>
    <p>${body}</p>
    <div class="demand-ladder">${ladder}</div>
  </section>`;
}

function renderRoute() {
  const slot = currentSchedule(state, data.content);
  if (!slot) return renderCampaignEnd();
  const selected = data.anchors.get(state.selectedAnchor) ?? data.anchors.get(slot.anchor_id);
  const draftPath = routeDraft.length === 2 ? shortestPath(data.map, routeDraft[0], routeDraft[1]) : routeDraft;
  const routePath = routePlanning ? draftPath : state.route?.path ?? [];
  // No straight bee-line edges drawn between every anchor pair any more
  // (owner, 2026-08-28: "the direct map lines... don't make sense. you
  // only use trams, metro, or go by foot on bigger actual streets") — the
  // real tram/metro network is `transitLayerSvg()`; a straight schematic
  // line ignoring the streets it claims to run along read as wrong the
  // moment the real curved geometry was drawn right next to it.
  // `data.map.edges` still exists and is still what `shortestPath()`
  // plans over — only the always-on visual web of every connection is
  // gone, not the underlying route graph.
  const routeSvg = routePath.length > 1 ? `<path class="map-route" d="${mapPath(routePath)}"/>` : '';
  const hiddenPips = (state.route?.hidden ?? 0) && !routePlanning
    ? `<circle class="map-hidden-flow" r="9"><animateMotion path="${mapPath(state.route.path)}" dur="3s" repeatCount="indefinite"/></circle>` : '';
  const routeInfo = state.route ? `
    <p class="section-label">SHARED CAPACITY</p>
    <h2>${esc(data.anchors.get(state.route.path[0])?.label)} → ${esc(data.anchors.get(state.route.path.at(-1))?.label)}</h2>
    <div class="route-capacity" aria-label="${state.route.ordinary} ordinary and ${state.route.hidden} hidden loads of ${state.route.capacity}">
      ${Array.from({ length: state.route.capacity }, (_, index) => {
        const className = index < state.route.ordinary ? 'ordinary' : index < state.route.ordinary + state.route.hidden ? 'hidden' : '';
        return `<i class="${className}"></i>`;
      }).join('')}
    </div>
    <p class="dim">${state.route.ordinary} ordinary journeys · ${state.route.hidden} hidden · ${state.route.capacity} total</p>
    <button class="paper-button cyan" data-action="send-route">${tr('send')}</button>
  ` : `<p class="dim">Pin a public path. Ordinary people use its capacity first; hidden traffic never gets a private lane.</p>`;
  const nextEncounter = data.encounters.get(slot.encounter_id);
  return `
    <div class="route-layout">
      <section class="paper-panel map-panel" aria-label="Era I Kallio operations map">
        <svg class="city-map" viewBox="0 0 1000 1000" role="img" aria-labelledby="mapTitle mapDesc">
          <title id="mapTitle">Kallio operations map, north up</title>
          <desc id="mapDesc">Twelve accurate public anchors compressed into one relief map. The next encounter is at ${esc(data.anchors.get(slot.anchor_id)?.label)}.</desc>
          ${mapBackground()}
          ${transitLayerSvg()}
          <g aria-hidden="true">${routeSvg}${ordinaryFlowSvg()}${hiddenPips}</g>
          ${data.map.anchors.map(anchor => anchorSvg(anchor, anchor.id === slot.anchor_id, anchor.id === selected.id)).join('')}
        </svg>
      </section>
      <aside class="map-side">
        ${progressionCard(slot)}
        <section class="paper-panel">
          <p class="section-label">${esc(selected.sliceState)} · PUBLIC ANCHOR</p>
          <h2>${esc(selected.label)}</h2>
          <p>${esc(anchorDescription(selected))}</p>
          <div class="route-steps">${(selected.roles ?? []).map(role => `<span class="tag">${esc(cap(role))}</span>`).join('')}</div>
          <div class="node-actions">
            ${selected.id === slot.anchor_id ? `<button class="paper-button primary" data-action="open-encounter">${tr('enter')} · ${esc(nextEncounter?.id.replace('enc-', '').replaceAll('-', ' '))}</button>` : ''}
            ${selected.sliceState === 'training'
              ? `<button class="paper-button primary" data-action="start-training">${tr('start_training')}</button>`
              : `<button class="paper-button" data-action="plan-route">${routePlanning ? tr('clear') : tr('planning')}</button>`}
          </div>
          ${routePlanning ? renderRoutePlanner(draftPath) : ''}
        </section>
        <section class="paper-panel">${routeInfo}</section>
        <section class="paper-panel">
          <p class="section-label">CITY MEMORY</p>
          <ul class="log-list">${state.logs.slice(0, 5).map(item => `<li>${esc(item)}</li>`).join('')}</ul>
        </section>
      </aside>
    </div>`;
}

function anchorDescription(anchor) {
  const descriptions = {
    piritori: 'Vaasanpuistikko, Kurvi and the western Sörnäinen metro entrance share one readable cluster.',
    vaasankatu: 'Warm counters, cold pavements and the information that moves between them.',
    harju: 'Brahenkenttä, tram-facing streets and the first people willing to work.',
    karhupuisto: 'Lime trees, gravel paths and a park porous enough to reveal repeated movement.',
    torkkelinmaki: 'Residential hill, courtyards and Jaska’s unfinished cardboard city.',
    linjat_yard: 'The 2003 public area around Linjat and Hämeentie; faction services remain fictional.',
    hakaniemi: 'Market, metro and the strongest ordinary crowd source in the southern board.',
    siltasaari: 'A threshold to the centre, a staffed teller and money that no longer works at the till.',
    kallio_church: 'A public landmark, not an enterable criminal service.',
    alppiharju: 'Visible north-western expansion, sealed during this slice.',
    vallila: 'Visible northern expansion, sealed during this slice.',
    sornainen_harbour: 'A distant industrial teaser at the old harbour edge.',
    hermanni_skatepark: 'A test area, not a real destination — the crew never has business here. Fight the training set as often as you like; nothing carries back to the campaign.',
  };
  return descriptions[anchor.id] ?? 'A public map anchor. Fictional services inherit the area without claiming a real address.';
}

function renderRoutePlanner(path) {
  const names = routeDraft.map(id => data.anchors.get(id)?.label ?? id);
  return `
    <div class="consequence-strip">
      ${names.length ? names.map(esc).join(' → ') : 'Choose a starting anchor, then a destination.'}
      ${path.length > 2 ? `<div class="route-steps">${path.map(id => `<span class="tag">${esc(data.anchors.get(id)?.label)}</span>`).join('')}</div>` : ''}
    </div>
    <div class="route-actions">
      <button class="paper-button cyan" data-action="commit-route" ${path.length < 2 ? 'disabled' : ''}>${tr('commit')}</button>
      <button class="paper-button" data-action="cancel-route">${tr('clear')}</button>
    </div>`;
}

function genericScene(siteId) {
  return `<div class="generic-scene" data-site="${esc(siteId)}" aria-hidden="true">
    <i class="moon"></i><i class="block b1"></i><i class="block b2"></i><i class="block b3"></i>
    <i class="street"></i><i class="tram"></i><i class="figure"></i>
  </div>`;
}

function ambientLayers(encounter) {
  if (encounter.id !== 'enc-karhupuisto-watch' && encounter.id !== 'enc-bear-path') return '';
  return `
    <img class="weather-layer" src="${assetUrl(data, 'weather-wet-sheen-v01')}" alt="">
    <img class="weather-layer front" src="${assetUrl(data, 'weather-rain-fine-v01')}" alt="">
    <img class="ambient-cutout tree" src="${assetUrl(data, 'foliage-lime-tree-v01:calm')}" alt="">
    <img class="ambient-cutout grass" src="${assetUrl(data, 'foliage-grass-v01:calm')}" alt="">
    <img class="ambient-cutout dog" src="${assetUrl(data, 'animal-spitz-v03:idle')}" alt="">`;
}

function renderEncounter() {
  if (state.endingId) return renderCampaignEnd();
  const slot = currentSchedule(state, data.content);
  const encounter = currentEncounter(state, data);
  if (!slot || !encounter) return renderCampaignEnd();
  const site = data.sites.get(encounter.site_id);
  const anchorId = encounter.anchor_override_id ?? site?.anchorId ?? slot.anchor_id;
  const anchor = data.anchors.get(anchorId);
  const art = encounter.scene_asset_id ? assetUrl(data, encounter.scene_asset_id) : '';
  const isToko = encounter.scene_asset_id === 'scene-toko-noodles-prototype-v02';
  const resolved = state.choices[encounter.id];
  const choice = encounter.choices.find(item => item.id === resolved);
  const pendingBattle = state.battle?.status === 'active';
  return `
    <div class="encounter-layout">
      <section class="paper-panel scene-card">
        <div class="scene-viewport ${isToko ? 'toko' : ''}">
          ${art ? `<img class="scene-image" src="${esc(art)}" alt="${esc(site?.label ?? anchor?.label)}">` : genericScene(encounter.site_id)}
          ${ambientLayers(encounter)}
          <i class="scene-vignette"></i>
          <div class="scene-caption">
            <h2>${esc(site?.label ?? anchor?.label)}</h2>
            <p>${esc(anchor?.label)} · ${esc(slot.block.toUpperCase())} · ${encounter.source_status === 'fiction' ? 'FICTIONAL COMPOSITE' : 'MIXED SOURCE'}</p>
          </div>
        </div>
      </section>
      <section class="paper-panel encounter-copy">
        <p class="section-label">${formatBlock(state, data.content)} · ${esc(anchor?.label)}</p>
        <h2 class="section-title">${esc(encounterTitle(encounter))}</h2>
        <p class="encounter-opening">${esc(encounter.opening)}</p>
        <div class="inspectables" aria-label="Inspect scene">
          ${encounter.inspectables.map((item, index) => `<button class="paper-button inspect-button" data-action="inspect" data-index="${index}" type="button">${esc(item)}</button>`).join('')}
        </div>
        <p class="observation" aria-live="polite">${esc(observation)}</p>
        ${resolved ? renderEncounterOutcome(choice, pendingBattle) : renderChoices(encounter)}
      </section>
    </div>`;
}

function encounterTitle(encounter) {
  const titles = {
    'enc-first-purchase': 'THE FIRST BAG',
    'enc-jaska-receipt': 'DEAD MONEY',
    'enc-first-sale': 'THE QUEUE',
    'enc-mira-at-tram-stop': 'A TIMETABLE AND A PROMISE',
    'enc-bank-counter': 'THE FIXED RATE',
    'enc-toko-quiet-voice': 'THREE VANS',
    'enc-karhupuisto-watch': 'THE MAN WHO NEVER ARRIVES',
    'enc-mccormick-yard': 'AFTER THE PUBLIC ROOM',
    'enc-bear-path': 'THE WRONG SIDE OF THE BEAR',
    'enc-first-firearm': 'THE OBJECT UNDER THE COAT',
    'enc-jade-window': 'THE LUNCH QUEUE',
    'enc-courtyard-last-call': 'THE PORTTIKONGI',
    'enc-pasila-ledger': 'A CLEAN ADDRESS',
    'enc-jaska-last-light': 'THE BLANK SHAPE',
  };
  return titles[encounter.id] ?? cap(encounter.id.replace('enc-', ''));
}

function renderChoices(encounter) {
  return `<div class="choice-list">${encounter.choices.map(choice => {
    const status = choiceStatus(choice, state, data);
    return `<button class="choice-card" type="button" data-action="choose" data-choice="${esc(choice.id)}" ${status.ok ? '' : 'disabled'}>
      <strong>${esc(choice.label)}</strong>
      <span>${esc(choice.forecast)}</span>
      ${status.ok ? '' : `<em>${esc(status.reasons.join(' · '))}</em>`}
    </button>`;
  }).join('')}</div>`;
}

function renderEncounterOutcome(choice, pendingBattle) {
  const messages = state.lastOutcome?.length ? state.lastOutcome : ['The choice is now part of the city’s memory.'];
  return `<div class="outcome-card">
    <h3>${esc(choice?.label ?? 'CHOICE RECORDED')}</h3>
    ${messages.map(item => `<p>${esc(item)}</p>`).join('')}
    <div class="consequence-strip">${esc(choice?.forecast ?? '')}</div>
    <button class="paper-button primary" data-action="${pendingBattle ? 'show-battle' : 'advance'}">${pendingBattle ? tr('battle') : tr('continue')}</button>
  </div>`;
}

/**
 * THE BOARD — every active anchor, in the information you have about it.
 *
 * This is `market/model.mjs` on a screen for the first time. It sits UNDER the
 * paper book rather than replacing it: the authored offers are leads somebody
 * gave you, and this is what you read to decide whether the lead is worth the
 * trip.
 */
/**
 * THE CHAPTER — progress toward the authored operation ending
 * (`chapter-1-piritori` → `op-sornainen-shipment`), ported from
 * `chapter_goal_met()`/`attempt_chapter_ending()`. The threshold buys
 * ENTRY to the climax; it is not the climax itself.
 */
function renderChapter() {
  const def = data.content.chapters?.find(item => item.index === state.chapter);
  if (!def) return '';
  const ending = def.ending ?? {};
  const anchor = data.anchors.get(ending.anchor_id);
  const progress = chapterProgress(state);
  if (state.chapterCleared) {
    const outcomeCopy = {
      clean: `The shipment got away clean.${ending.grants_upgrade ? ` ${esc(cap(ending.grants_upgrade))} is yours.` : ''}`,
      messy: 'Something had to be left behind, but it got away.',
      lost: 'Somebody did not come back.',
    };
    return `<section class="paper-panel">
      <p class="section-label">CHAPTER ${state.chapter}${def.label ? ` / ${esc(def.label.toUpperCase())}` : ''}</p>
      <h2 class="section-title">${esc((ending.label ?? 'THE OPERATION').toUpperCase())} — ${esc(state.lastEndingOutcome.toUpperCase())}</h2>
      <p>${esc(outcomeCopy[state.lastEndingOutcome] ?? '')}</p>
    </section>`;
  }
  const goalMet = chapterGoalMet(state);
  const atAnchor = Boolean(ending.anchor_id) && state.selectedAnchor === ending.anchor_id;
  const canAfford = state.cash >= (ending.stake_eur ?? 0);
  const fmt = value => state.chapterGoal === 'money' ? money(value) : String(value);
  return `<section class="paper-panel">
    <p class="section-label">CHAPTER ${state.chapter}${def.label ? ` / ${esc(def.label.toUpperCase())}` : ''}</p>
    <h2 class="section-title">${esc(cap(state.chapterGoal))} · ${fmt(progress)} / ${fmt(state.chapterThreshold)}</h2>
    ${goalMet
      ? `<p>${esc(ending.brief ?? '')}</p>
         <button class="paper-button primary" data-action="attempt-chapter-ending" ${atAnchor && canAfford ? '' : 'disabled'}>
           ATTEMPT ${esc((ending.label ?? 'THE OPERATION').toUpperCase())} · ${money(ending.stake_eur ?? 0)}
         </button>
         ${!atAnchor ? `<p class="consequence-strip">Stand at ${esc(anchor?.label ?? 'the site')} to attempt it.</p>` : ''}
         ${atAnchor && !canAfford ? '<p class="consequence-strip">Not enough cash on hand for the stake.</p>' : ''}`
      : '<p class="consequence-strip">Earned by fencing loot at Piritori — market sales and mission payouts do not count.</p>'}
  </section>`;
}

function renderBoard() {
  const { clock, rows } = board(state, data);
  const eye = exposureHere(state, data);
  const known = rows.filter(row => row.shown.level !== INFO.NONE);

  const priceCell = row => {
    const s = row.shown;
    if (s.level === INFO.NONE) return '<span class="dim">never been</span>';
    if (s.level === INFO.QUOTE) return `${money(s.buy)} <span class="dim">/</span> ${money(s.sell)}`;
    if (s.level === INFO.RANGE) return `${money(s.lowBuy)}–${money(s.highBuy)}<br><span class="dim">${money(s.lowSell)}–${money(s.highSell)}</span>`;
    return `<span class="dim">${esc(s.text ?? 'a rumour, no more')}</span>`;
  };

  return `<section class="paper-panel">
    <p class="section-label">THE BOARD · DAY ${clock.day} · ${clock.block.toUpperCase()}</p>
    <h2 class="section-title">WHAT YOU KNOW</h2>
    <p class="consequence-strip">A quote is exact for the block you took it in, a range for four,
      a rumour for twelve, then nothing. Standing somewhere is how you learn its price.</p>
    <table class="offer-table board-table">
      <thead><tr><th>PLACE</th><th>BUY / SELL</th><th>WHY</th><th>KNOWN</th></tr></thead>
      <tbody>${rows.map(row => `<tr class="${row.here ? 'board-here' : ''}${row.shown.level === INFO.NONE ? ' board-dark' : ''}">
        <td><b>${esc(row.label)}</b>${row.here ? ' <span class="board-tag">HERE</span>' : ''}</td>
        <td class="quote">${priceCell(row)}</td>
        <td><span class="dim">${esc(row.shown.level === INFO.NONE ? '—' : (row.shown.causeText ?? row.shown.cause ?? 'ordinary'))}</span></td>
        <td><span class="dim">${row.visited ? `${row.age} block${row.age === 1 ? '' : 's'} ago` : '—'}</span></td>
      </tr>`).join('')}</tbody>
    </table>
    ${known.length === 0
      ? '<p class="consequence-strip">You have not stood anywhere long enough to know a price. Go somewhere.</p>'
      : ''}
    ${eye ? `<p class="board-exposure"><span class="dim">STANDING HERE READS AS</span>
      <b>${esc(String(eye.band).toUpperCase())}</b> — ${esc(eye.causeText ?? eye.cause)}</p>` : ''}
  </section>`;
}

function renderLedger() {
  const visibleOffers = data.content.market_offers.filter(offer => state.revealedOffers.includes(offer.id));
  const critical = Object.values(state.crewStatus).filter(item => item.critical).length;
  return `
    <div class="ledger-layout">
      <div class="ledger-main">
        <section class="paper-panel">
          <p class="section-label">MARKET / INVENTORY</p>
          <h2 class="section-title">THE PAPER BOOK</h2>
          <div class="ledger-summary">
            <div><span class="dim">CASH</span><b>${money(state.cash)}</b></div>
            <div><span class="dim">OLD CASH</span><b>${Math.round(state.markka)} mk</b></div>
            <div><span class="dim">PIRI</span><b>${state.stock.piri}/${state.capacity}</b></div>
            <div><span class="dim">EXIT FUND</span><b>${money(state.exitFund)}</b></div>
          </div>
          <table class="offer-table">
            <thead><tr><th>PLACE</th><th>SIDE / CAUSE</th><th>QUOTE</th><th></th></tr></thead>
            <tbody>${visibleOffers.map(offer => {
              const anchor = data.anchors.get(offer.anchor_id);
              const exact = offer.quote.kind === 'exact' ? money(offer.quote.eur) : `${money(offer.quote.min_eur)}–${money(offer.quote.max_eur)}`;
              return `<tr>
                <td><b>${esc(anchor?.label)}</b></td>
                <td>${esc(offer.side.toUpperCase())}<br><span class="dim">${esc(offer.dominant_cause)}</span></td>
                <td class="quote">${exact}<br><small>${esc(offer.confidence.toUpperCase())}</small></td>
                <td><button class="paper-button" data-action="trade" data-offer="${esc(offer.id)}">${offer.side === 'buy' ? 'BUY 1' : 'SELL 1'}</button></td>
              </tr>`;
            }).join('')}</tbody>
          </table>
          <p class="consequence-strip">The slice trades one abstract good. No dosage, preparation, concealment or consumption detail is simulated.</p>
        </section>
        ${renderChapter()}
        ${renderBoard()}
        <section class="paper-panel">
          <p class="section-label">CREW / FRONT THREE DEPLOY AUTOMATICALLY</p>
          <div class="crew-grid">${[...data.content.crew, ...Object.values(state.hiredCrew)].map(renderCrewCard).join('')}</div>
        </section>
        ${renderHiringPool()}
      </div>
      <aside class="ledger-side">
        <section class="paper-panel">
          <p class="section-label">EQUIPMENT</p>
          <h2 class="section-title">WHAT CAN BE HELD</h2>
          <div class="equipment-list">${state.equipment.map((item, index) => renderEquipment(item, index)).join('')}</div>
          ${canFenceHere(state)
            ? '<p class="consequence-strip">Fencing pays best on the best condition, worst on broken. Loot converts down into money — never the other way.</p>'
            : '<p class="consequence-strip">Nothing fences from here. Piritori is the only corner buying.</p>'}
        </section>
        <section class="paper-panel">
          <p class="section-label">OBLIGATIONS</p>
          <p>Debt <strong class="orange">${money(state.debt)}</strong></p>
          <p>Crew wages settle after each night. Short wages become visible debt, never an invisible failure.</p>
          <div class="route-steps">
            ${Object.entries(state.obligations).map(([id, amount]) => `<span class="tag warning">${esc(cap(id))} · ${amount}</span>`).join('') || '<span class="tag">NO PERSONAL FAVOURS OWED</span>'}
            ${critical ? `<span class="tag warning">${critical} CRITICAL WOUND${critical === 1 ? '' : 'S'}</span>` : ''}
          </div>
        </section>
        <section class="paper-panel">
          <p class="section-label">ACTIVE MISSION MEMORY</p>
          <ul class="log-list">${data.content.missions.map(mission => `<li><b>${esc(cap(mission.family))}</b><br>${esc(state.missionStatus[mission.id] ?? (state.revealedMissions.includes(mission.id) ? 'available' : 'not yet open'))}</li>`).join('')}</ul>
        </section>
      </aside>
    </div>`;
}

function renderCrewCard(member) {
  const hired = state.recruited.includes(member.id) || state.temporaryCrew.includes(member.id);
  const status = state.crewStatus[member.id];
  // Authored crew carry a one-line `strength`; a generated hire
  // (`people/hiring.mjs`) has no such field and leans on its first
  // rolled trait instead — both read as one line of flavour under the role.
  const flavor = member.strength ?? member.traits?.[0]?.text ?? '';
  return `<article class="crew-card ${hired ? '' : 'not-hired'}">
    <div class="crew-portrait" aria-hidden="true">
      <img class="legs" src="${assetUrl(data, member.legs_asset_id)}" alt="">
      <img class="torso" src="${assetUrl(data, member.torso_asset_id)}" alt="">
      <img class="head" src="${assetUrl(data, member.portrait_asset_id)}" alt="">
    </div>
    <div>
      <h3>${esc(member.name)}${member.nick ? ` <span class="dim">"${esc(member.nick)}"</span>` : ''}</h3>
      <p>${esc(cap(member.role))} · ${hired ? esc(status.status.toUpperCase())
        : state.arrestedCrew.includes(member.id) ? 'ARRESTED'
        : state.retiredCrew.includes(member.id) ? 'RETIRED'
        : 'NOT RECRUITED'}</p>
      <p>${esc(flavor)}</p>
      <div class="status-dots" aria-label="${status.condition} condition">${Array.from({ length: Math.min(8, status.maxCondition) }, (_, index) => `<i class="${index < status.condition ? 'on' : ''}"></i>`).join('')}</div>
      ${hired && careerIsVisible(state, data, member.id)
        ? `<span class="tag warning">${careerLeft(state, data, member.id)} FIGHT${careerLeft(state, data, member.id) === 1 ? '' : 'S'} LEFT</span>` : ''}
    </div>
  </article>`;
}

/** Today's street offer (`state.hiringPoolFor`) — regenerated on demand
 *  from the campaign seed and the day, so it is not stored and cannot
 *  drift out of sync with the day (`GameState.gd`'s `hiring_pool()`). */
function renderHiringPool() {
  const pool = hiringPoolFor(state, data);
  if (pool.length === 0) return '';
  return `<section class="paper-panel">
    <p class="section-label">HIRE / TODAY'S CANDIDATES</p>
    <p class="consequence-strip">The signing fee is a candidate's own nightly wage, taken once, up front. Nobody stays for free after that.</p>
    <div class="crew-grid">${pool.map(renderHireCandidate).join('')}</div>
  </section>`;
}

function renderHireCandidate(candidate) {
  const affordable = state.cash >= candidate.wage_eur;
  const flavor = candidate.traits?.[0]?.text ?? '';
  return `<article class="crew-card not-hired">
    <div class="crew-portrait" aria-hidden="true">
      <img class="legs" src="${assetUrl(data, candidate.legs_asset_id)}" alt="">
      <img class="torso" src="${assetUrl(data, candidate.torso_asset_id)}" alt="">
      <img class="head" src="${assetUrl(data, candidate.portrait_asset_id)}" alt="">
    </div>
    <div>
      <h3>${esc(candidate.name)}${candidate.nick ? ` <span class="dim">"${esc(candidate.nick)}"</span>` : ''}</h3>
      <p>${esc(cap(candidate.role))} · AGE ${candidate.age}</p>
      <p>${esc(flavor)}</p>
      <p><span class="dim">SIGNING FEE</span> <b>${money(candidate.wage_eur)}</b> · <span class="dim">THEN</span> ${money(candidate.wage_eur)}/night</p>
      <button class="paper-button" data-action="hire-from-pool" data-candidate="${esc(candidate.id)}" ${affordable ? '' : 'disabled'}>${affordable ? 'HIRE' : 'CANNOT AFFORD'}</button>
    </div>
  </article>`;
}

function renderEquipment(item, index) {
  const equipment = data.equipment.get(item.id);
  const artId = equipment?.asset_id;
  const canFence = canFenceHere(state);
  return `<div class="equipment-chip">
    ${artId ? `<img src="${assetUrl(data, artId)}" alt="">` : '<span aria-hidden="true">◇</span>'}
    <span>${esc(cap(item.id))}<br><span class="dim">${esc(conditionWord(item.cond))}${equipment?.hold ? ` · ${esc(equipment.hold)}` : ''}</span></span>
    ${canFence
      ? `<button class="paper-button" data-action="sell-loot" data-equipment="${esc(item.id)}">FENCE · ${money(resaleAt(state, data, index))}</button>`
      : ''}
  </div>`;
}

/**
 * Slot -> screen percentage. One unified board now (grid.js: a lane/depth
 * pair, not a per-side layout) — depth runs vertically, player's own back
 * row nearest the bottom of the stage and the opposition's back row
 * nearest the top, lane spread evenly across the width. Independent of
 * `worldFor()` in render3d.js (same slot vocabulary, a different, 3D
 * output space) — see that file's note on why the two do not share units.
 */
function cellPosition(cell) {
  const { lane, depth } = parseSlotKey(cell);
  const x = 8 + (lane / (LANES - 1)) * 84;
  const y = 88 - (depth / (totalRows() - 1)) * 76;
  return { x, y };
}

/** A depth's row label, along the stage's left edge — the unified board
 *  runs depth vertically now, so "front"/"back" is one label per depth
 *  rather than one per side-and-row. */
function rowLabel(text, depth) {
  const y = 88 - (depth / (totalRows() - 1)) * 76;
  return `<span class="row-label" style="left:4%;top:${y}%">${text}</span>`;
}

function renderFormationCells(battle) {
  const valid = battle.action === 'move' ? new Set(validMoveCells(battle)) : new Set();
  const occupied = new Set(battle.players.concat(battle.enemies).filter(unit => unit.alive).map(unit => unit.cell));
  const cover = battle.cover; // Map: slotKey -> { propId, effect, ... }
  const cells = [];
  for (let lane = 0; lane < LANES; lane += 1) {
    for (let depth = 0; depth < totalRows(); depth += 1) {
      const cell = slotKey(lane, depth);
      const pos = cellPosition(cell);
      const isValid = valid.has(cell) && !occupied.has(cell);
      const isCover = cover.has(cell);
      cells.push(`<button type="button" class="formation-cell ${isValid ? 'valid' : ''} ${isCover ? 'cover' : ''}"
        style="left:${pos.x}%;top:${pos.y}%" data-action="${isValid ? 'move-cell' : ''}" data-cell="${cell}"
        aria-label="${esc(describeSlot(lane, depth))}${isCover ? ', cover' : ''}" ${isValid ? '' : 'disabled'}></button>`);
    }
  }
  return cells.join('');
}

function renderUnit(unit, battle) {
  const pos = cellPosition(unit.cell);
  const selected = unit.id === battle.selectedId && unit.side === 'player';
  // Police (COMBAT.md §9.5) are a third side: on the board, never anybody's
  // enemy yet — see attackTargets() in battle.js — so they are never a
  // valid attack target regardless of the current action.
  const targetable = unit.side === 'enemy' && battle.action === 'attack';
  const disabled = unit.side === 'player' ? battle.acted.includes(unit.id) || battle.phase !== 'player' : !targetable;
  return `<button type="button" class="unit-token ${unit.side === 'enemy' ? 'enemy' : ''} ${unit.side === 'police' ? 'police' : ''} ${selected ? 'selected' : ''} ${targetable ? 'intent' : ''} ${unit.alive ? '' : 'down'}"
    style="left:${pos.x}%;top:${pos.y}%" data-action="${unit.side === 'player' ? 'select-unit' : 'target-unit'}" data-unit="${esc(unit.id)}"
    aria-label="${esc(unit.name)}, ${unit.role}, condition ${unit.hp}, guard ${unit.guard}" ${disabled ? 'disabled' : ''}>
    <span class="unit-body">
      <img class="legs" src="${assetUrl(data, unit.legs)}" alt="">
      <img class="torso" src="${assetUrl(data, unit.torso)}" alt="">
      <img class="head" src="${assetUrl(data, unit.head)}" alt="">
    </span>
    <span class="unit-label">${esc(unit.name.split(' ')[0])}<br><b>${unit.hp}♥ · ${unit.guard}◇ · ${unit.nerve}!</b></span>
  </button>`;
}

/**
 * COMBAT.md §9.5.2, ported from `formation_battle.gd`'s `_build_police_
 * choice()`: "the police are here and nobody has answered them... outranks
 * everything else on the console" — takes the whole action panel rather
 * than sitting under the ordinary attack/brace/reposition buttons, and
 * ENGAGE is not offered at all (Godot refuses it too — fighting the
 * police is a third combat side neither build has).
 */
function renderPoliceChoice(battle) {
  const down = injuredPlayers(battle).length;
  return `
    <div class="paper-panel police-choice">
      <h2 class="section-title">${tr('police_here')}</h2>
      <p>${down} ${down === 1 ? tr('police_one_down') : tr('police_many_down')}</p>
      <div class="node-actions">
        <button class="paper-button danger" data-action="police-posture" data-posture="${POLICE_POSTURE.BACK_OFF}">${tr('police_back_off')}</button>
        <button class="paper-button primary" data-action="police-posture" data-posture="${POLICE_POSTURE.HELP_FRIENDS}">${tr('police_help')}</button>
      </div>
    </div>`;
}

function renderBattle() {
  const battle = state.battle;
  if (!battle) {
    const last = state.battleHistory.at(-1);
    return `<section class="paper-panel empty-state">
      <p class="section-label">FORMATION BOARD</p>
      <h2 class="section-title">${last ? esc(cap(last.id)) : 'NO ACTIVE FIGHT'}</h2>
      <p>${last ? `Last result: ${esc(last.result)}. Consequences already returned to the shared campaign state.` : 'Battles appear only when a mission turns into a formation conflict. Information can prevent one of the two slice battles.'}</p>
      <button class="paper-button" data-action="go-route">${tr('route')}</button>
    </section>`;
  }
  const unit = selectedUnit(battle);
  const scene = assetUrl(data, battle.sceneAssetId);
  const negotiationReady = battle.round >= 2 || battle.enemies.filter(item => item.alive).reduce((sum, item) => sum + item.nerve, 0) <= 4;
  return `
    <div class="battle-layout">
      <section class="battle-stage" aria-label="${esc(battle.format)} isometric formation battle">
        <img class="scene-image" src="${scene}" alt="">
        <img class="weather-layer front" src="${assetUrl(data, 'weather-rain-fine-v01')}" alt="">
        <div class="stage3d-mount" id="stage3dMount" aria-hidden="true"></div>
        <p class="battle-objective"><b>${tr('objective')} · ${esc(battle.format)}</b><br>${esc(battle.objective)}</p>
        ${rowLabel('BACK', depthOf(ROWS - 1, true))}
        ${rowLabel('FRONT', depthOf(0, true))}
        ${rowLabel('FRONT', depthOf(0, false))}
        ${rowLabel('BACK', depthOf(ROWS - 1, false))}
        ${renderFormationCells(battle)}
        ${battle.players.concat(battle.enemies, battle.police ?? []).map(item => renderUnit(item, battle)).join('')}
      </section>
      <section class="battle-console">
        <div class="paper-panel active-unit">
          <p class="section-label">ROUND ${battle.round} · ${esc(battle.phase.toUpperCase())}</p>
          <h3>${esc(unit?.name ?? 'NO ACTIVE UNIT')}</h3>
          <p>${esc(unit ? `${cap(unit.role)} · ${cap(unit.equipment)}` : 'Choose a standing crew member.')}</p>
          ${unit ? `
            <div class="track-row"><span>CONDITION</span><span class="track danger">${Array.from({ length: unit.maxHp }, (_, i) => `<i class="${i < unit.hp ? 'on' : ''}"></i>`).join('')}</span></div>
            <div class="track-row"><span>GUARD</span><span class="track">${Array.from({ length: 3 }, (_, i) => `<i class="${i < unit.guard ? 'on' : ''}"></i>`).join('')}</span></div>
            <div class="track-row"><span>NERVE</span><span class="track">${Array.from({ length: 3 }, (_, i) => `<i class="${i < unit.nerve ? 'on' : ''}"></i>`).join('')}</span></div>` : ''}
          ${battle.status === 'active' ? `
            <p class="section-label stance-label">${tr('stance')}</p>
            <div class="stance-row">
              ${STANCES.map(s => `<button class="paper-button ${battle.stance === s ? 'cyan' : ''}" data-action="select-stance" data-stance="${s}">${tr(`stance_${s}`)}</button>`).join('')}
            </div>` : ''}
        </div>
        <div class="paper-panel battle-log" aria-live="polite">${battle.log.slice(0, 7).map(item => `<p>${esc(item)}</p>`).join('')}</div>
        ${battle.status === 'active' ? (policeAwaitingPosture(battle) ? renderPoliceChoice(battle) : `
          <div class="paper-panel battle-actions">
            <button class="paper-button ${battle.action === 'attack' ? 'cyan' : ''}" data-action="battle-action" data-battle-action="attack" ${unit ? '' : 'disabled'}>${tr('attack')}</button>
            <button class="paper-button ${battle.action === 'move' ? 'cyan' : ''}" data-action="battle-action" data-battle-action="move" ${unit ? '' : 'disabled'}>${tr('move')}</button>
            <button class="paper-button" data-action="brace" ${unit ? '' : 'disabled'}>${tr('brace')}</button>
            ${(unit?.itemIds ?? []).map(itemId => `<button class="paper-button" data-action="use-item" data-item="${esc(itemId)}">${tr('use_item')} · ${esc(cap(itemId))}</button>`).join('')}
            <button class="paper-button" data-action="auto">${tr('auto')}</button>
            <button class="paper-button" data-action="end-turn">${tr('end')}</button>
            <button class="paper-button" data-action="negotiate" ${negotiationReady ? '' : 'disabled'}>${tr('negotiate')}</button>
            <button class="paper-button danger wide" data-action="withdraw">${tr('withdraw')} · ${esc(battle.withdrawal.known_cost)}</button>
          </div>`) : `
          <div class="paper-panel battle-result">
            <h2>${esc(cap(battle.result))}</h2>
            <p>The battle ends here. Wounds, pressure and money return to the same campaign state.</p>
            <button class="paper-button primary" data-action="finish-battle">${tr('continue')}</button>
          </div>`}
      </section>
    </div>`;
}

function renderNews() {
  const slot = currentSchedule(state, data.content);
  const bulletin = data.content.news[0];
  const hasAired = state.newsSeen.includes(bulletin.id) || slot?.news_before === bulletin.id || state.scheduleIndex >= 4;
  if (!hasAired) {
    return `<section class="paper-panel empty-state"><p class="section-label">TV / PHONE / ONLINE</p><h2 class="section-title">NO BULLETIN YET</h2><p>The television still matters. Scheduled news will interrupt the route before the staffed-bank encounter.</p><button class="paper-button" data-action="go-route">${tr('route')}</button></section>`;
  }
  const fresh = !state.newsSeen.includes(bulletin.id);
  return `
    <div class="news-layout">
      <section class="tv-shell" aria-label="Television bulletin presented by fictional newscaster Arvo Linde">
        <div class="tv-screen">
          <div class="studio"></div>
          <div class="arvo" aria-hidden="true"><i class="body"></i><i class="shirt"></i><i class="tie"></i><i class="head"></i><i class="hair"></i><i class="face-line"></i></div>
          <div class="news-lower-third">ARVO LINDE · HELSINKI · DOCUMENTED FACT / FICTIONAL SERVICE</div>
        </div>
        <div class="tv-knobs" aria-hidden="true"><i></i><i></i></div>
      </section>
      <section class="paper-panel news-copy">
        <p class="section-label">SCHEDULED TV · ${esc(bulletin.day)} / 2003</p>
        <h2 class="section-title">THE MARKKA AFTERLIFE</h2>
        <blockquote>“${esc(bulletin.arvo_copy)}”</blockquote>
        <div class="source-card"><h3>DOCUMENTED FACT</h3><p>${esc(bulletin.documented)}</p></div>
        <div class="source-card"><h3>CHARACTER INFERENCE</h3><p>${esc(bulletin.inference)}</p></div>
        <div class="source-card"><h3>FICTIONAL COMPOSITE</h3><p>${esc(bulletin.fiction)}</p></div>
        <ul class="source-links">${bulletin.sources.map((source, index) => `<li><a href="${esc(source)}" target="_blank" rel="noreferrer">Source ${index + 1}</a></li>`).join('')}</ul>
        ${fresh ? `<button class="paper-button primary" data-action="ack-news">ACKNOWLEDGE BULLETIN</button>` : `<button class="paper-button" data-action="go-route">${tr('route')}</button>`}
      </section>
    </div>`;
}

function renderCampaignEnd() {
  const ending = data.content.endings.find(item => item.id === state.endingId);
  if (!ending) {
    return `<section class="paper-panel empty-state"><p class="section-label">SEVEN-DAY SLICE</p><h2 class="section-title">THE LAST BLOCK IS QUIET</h2><p>The campaign has reached its authored edge.</p></section>`;
  }
  return `<section class="paper-panel empty-state">
    <p class="section-label">ERA I OUTCOME · NOT A MORALITY SCORE</p>
    <h2 class="section-title">${esc(ending.label)}</h2>
    <p>${esc(ending.summary)}</p>
    <div class="ledger-summary">
      <div><span class="dim">EXIT FUND</span><b>${money(state.exitFund)}</b></div>
      <div><span class="dim">DEBT</span><b>${money(state.debt)}</b></div>
      <div><span class="dim">CREW</span><b>${state.recruited.length}</b></div>
      <div><span class="dim">JASKA</span><b>${state.relationships.jaska ?? 0}</b></div>
    </div>
    <p class="consequence-strip">Pasila is a possibility, not a victory screen. The route map remains part of what the family inherits.</p>
    <button class="paper-button" data-action="reset-campaign">START A NEW SEVEN DAYS</button>
  </section>`;
}

function openEncounter() {
  const slot = currentSchedule(state, data.content);
  markSeen(state, slot?.anchor_id);
  if (slot?.news_before && !state.newsSeen.includes(slot.news_before)) {
    state.newsReturnMode = 'encounter';
    state.mode = 'news';
  } else {
    state.mode = 'encounter';
  }
  observation = '';
  persist();
  render();
}

function startBattle(id) {
  const definition = data.battles.get(id);
  const crew = deployedCrew(state, data);
  try {
    state.battle = createBattleState(definition, crew, state, data);
    state.mode = 'battle';
  } catch (error) {
    logToast(error.message);
    return false;
  }
  return true;
}

function recordBattleConsequences() {
  const battle = state.battle;
  if (!battle || battle.status !== 'resolved') return;
  // A training battle (content's own `training: true` field, "no cost —
  // this is a test area") is not allowed to cost anything real: no mission
  // effects (already guaranteed — `resultEffects()` returns [] when
  // `missionId` is null), no permanent crew condition loss, and no
  // campaign-clock advance. Without this a "test area" would quietly
  // punish the very thing it exists to let you do safely.
  if (!battle.training) {
    // COMBAT.md §8: gear is carried by a person, so it comes off the
    // fallen. `_settle_loot()`'s order — the player's own downed crew's
    // weapons are always attempted lost, win or not; only a real win
    // loots the losing side's dead. `takeLoot` returns [] if nothing
    // qualified, so the toast is silent on an empty haul.
    loseKitOf(state, droppedKit(battle, data, 'player'));
    if (battle.result === 'win') {
      const spoils = takeLoot(state, data, droppedKit(battle, data, 'enemy'));
      if (spoils.length) logToast(`Took: ${spoils.map(cap).join(', ')}.`);
    }
    applyEffects(state, resultEffects(battle, data), data, `battle:${battle.id}:${battle.result}`);
    // COMBAT.md §9.5.3: the police's default posture is subdue, and its
    // bite is on the fallen — a downed crew member the police take is not
    // merely hurt, they are gone. `taken` can also name a STANDING crew
    // member who went back for a fallen ally and paid for it (§9.5.2's
    // rescue trade) — arrested without ever being wounded in the fight.
    const taken = new Set(takenByPolice(battle));
    const injured = new Set(injuredPlayers(battle));
    for (const id of injured) {
      const status = state.crewStatus[id];
      if (taken.has(id)) { status.status = 'missing'; continue; }
      status.condition = Math.max(0, status.condition - 4);
      if (battle.id === 'battle-courtyard-3v3') {
        status.status = 'critical';
        status.critical = true;
      } else {
        status.status = 'wounded';
        status.condition = Math.max(1, status.condition);
      }
    }
    for (const id of taken) {
      if (injured.has(id) || !state.crewStatus[id]) continue;
      state.crewStatus[id].status = 'missing';
    }
    // §9.5.3: they are gone — `arrest()`'s real consequence, not just a
    // status label. Off the active roster (`crewRecord()` still resolves
    // them for logs and history; `state.crewStatus` keeps 'missing' for
    // what a card would show if one still pointed at them).
    for (const id of taken) arrestCrew(state, data, id);
    // A fight is where a career is spent (COMBAT.md §7.2) — after the
    // police have taken whoever they took, so an already-gone crew member
    // does not also come out of it one fight older for nothing.
    const retired = ageCrew(state, data, battle.players.map(p => p.id));
    for (const id of retired) logToast(`${crewRecord(state, data, id)?.name ?? id} retires after this one.`);
  }
  state.battleHistory.push({ id: battle.id, result: battle.result, round: battle.round });
  state.battle = null;
  state.battleOpeningNerve = 0;
  if (!battle.training) advanceSchedule(state, data);
  state.mode = 'route';
}

function handleRootClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const action = target.dataset.action;
  if (action === 'select-anchor') {
    const id = target.dataset.anchor;
    state.selectedAnchor = id;
    // Standing somewhere is how you learn its price (board.js). Without this
    // line the board is permanently blank and looks broken rather than unearned.
    markSeen(state, id);
    if (routePlanning) {
      const anchor = data.anchors.get(id);
      if (['locked', 'teaser'].includes(anchor?.sliceState)) {
        logToast(`${anchor.label} is visible but sealed in this slice.`);
      } else if (routeDraft.length >= 2) routeDraft = [id];
      else if (!routeDraft.includes(id)) routeDraft.push(id);
    }
    persist(); render();
  } else if (action === 'open-encounter') openEncounter();
  else if (action === 'start-training') {
    if (!startBattle('battle-hermanni-training')) { render(); return; }
    persist(); render();
  } else if (action === 'plan-route') {
    routePlanning = !routePlanning;
    routeDraft = routePlanning ? [state.selectedAnchor] : [];
    render();
  } else if (action === 'cancel-route') {
    routePlanning = false; routeDraft = []; render();
  } else if (action === 'commit-route') {
    const path = shortestPath(data.map, routeDraft[0], routeDraft[1]);
    const result = commitRoute(state, path);
    if (result.ok) { routePlanning = false; routeDraft = []; persist(); }
    logToast(result.message); render();
  } else if (action === 'send-route') {
    const result = sendOnRoute(state, data); logToast(result.message); persist(); render();
  } else if (action === 'inspect') {
    const encounter = currentEncounter(state, data);
    const item = encounter.inspectables[Number(target.dataset.index)];
    observation = inspectionCopy(item);
    render();
  } else if (action === 'choose') {
    const encounter = currentEncounter(state, data);
    const choice = encounter.choices.find(item => item.id === target.dataset.choice);
    const result = chooseEncounter(state, encounter, choice, data);
    if (!result.ok) logToast(result.reason);
    else if (result.startBattle) startBattle(result.startBattle);
    persist(); render();
  } else if (action === 'advance') {
    advanceSchedule(state, data); persist(); render();
  } else if (action === 'show-battle') {
    state.mode = 'battle'; persist(); render();
  } else if (action === 'trade') {
    const offer = data.offers.get(target.dataset.offer);
    const result = transactOffer(state, offer);
    // Your own footprint at that place, which is the ONE side of the book
    // saturation moves (MARKET.md §7). Selling into a small market lowers what
    // it pays you without also making it cheap to buy back.
    if (result?.ok !== false) {
      addFootprint(state, offer.anchor_id, offer.side === 'sell' ? 1 : -1);
      markSeen(state, offer.anchor_id);
    }
    logToast(result.message); persist(); render();
  } else if (action === 'sell-loot') {
    const paid = sellLoot(state, data, target.dataset.equipment);
    logToast(paid > 0 ? `Fenced for ${money(paid)}.` : 'Nothing there to fence.');
    persist(); render();
  } else if (action === 'attempt-chapter-ending') {
    const reason = attemptChapterEnding(state, data);
    if (reason) logToast({ 'not-available': 'Not ready yet.', 'cannot-afford': 'Not enough cash for the stake.', 'wrong-place': 'Wrong place for this.' }[reason] ?? reason);
    persist(); render();
  } else if (action === 'hire-from-pool') {
    const ok = hireFromPool(state, data, target.dataset.candidate);
    logToast(ok ? 'Hired on.' : 'Cannot hire — not enough cash, or already on the roster.');
    persist(); render();
  } else if (action === 'select-unit') {
    selectUnit(state.battle, target.dataset.unit); persist(); render();
  } else if (action === 'battle-action') {
    selectAction(state.battle, target.dataset.battleAction); persist(); render();
  } else if (action === 'target-unit') {
    const result = playerAttack(state.battle, target.dataset.unit);
    if (!result.ok) logToast(result.message); persist(); render();
  } else if (action === 'move-cell') {
    const result = moveUnit(state.battle, target.dataset.cell);
    if (!result.ok) logToast(result.message); persist(); render();
  } else if (action === 'brace') {
    selectAction(state.battle, 'brace'); const result = brace(state.battle);
    if (!result.ok) logToast(result.message); persist(); render();
  } else if (action === 'use-item') {
    selectAction(state.battle, 'item'); const result = useItem(state.battle, target.dataset.item);
    if (!result.ok) logToast(result.message); persist(); render();
  } else if (action === 'end-turn') {
    endPlayerPhase(state.battle); persist(); render();
  } else if (action === 'auto') {
    autoCommand(state.battle); persist(); render();
  } else if (action === 'select-stance') {
    selectStance(state.battle, target.dataset.stance); persist(); render();
  } else if (action === 'withdraw') {
    withdrawBattle(state.battle); persist(); render();
  } else if (action === 'police-posture') {
    choosePolicePosture(state.battle, target.dataset.posture); persist(); render();
  } else if (action === 'negotiate') {
    if (!negotiateBattle(state.battle)) logToast('The opposing formation is not ready to talk.');
    persist(); render();
  } else if (action === 'finish-battle') {
    recordBattleConsequences(); persist(); render();
  } else if (action === 'ack-news') {
    const bulletin = data.content.news[0];
    if (!state.newsSeen.includes(bulletin.id)) state.newsSeen.push(bulletin.id);
    applyEffects(state, bulletin.effects, data, bulletin.id);
    state.mode = state.newsReturnMode ?? 'route';
    state.newsReturnMode = null;
    persist(); render();
  } else if (action === 'go-route') {
    state.mode = 'route'; persist(); render();
  } else if (action === 'reset-campaign') resetCampaign();
}

function inspectionCopy(item) {
  const specific = {
    "seller's wet cuff": 'The cuff is fresh with rain; the pocket stays dry and weighted.',
    'night tram through the window': 'Tram 8 crosses the wet glass. Toko waits until its sound covers his next sentence.',
    'dog changing direction': 'The dog changes first. Its owner follows the leash and notices the repeated crossing.',
    'fixed conversion notice': '5.94573 markka to one euro. Nostalgia changes no digit.',
    'open withdrawal path': 'The route behind the lime trees remains open before anyone commits.',
    'porttikongi withdrawal lane': 'The passage is a retreat lane as long as nobody chooses to seal it.',
  };
  return specific[item?.toLowerCase()] ?? `${item}. It changes what Aatami knows, not what the player must pretend to know.`;
}

function resetCampaign() {
  if (!confirm('Reset the seven-day campaign and remove its local save?')) return;
  localStorage.removeItem(SAVE_KEY);
  state = createState(data.content);
  routePlanning = false;
  routeDraft = [];
  observation = '';
  persist();
  render();
}

async function boot() {
  try {
    bootChrome(); // the same torn-carton material as godot/ui/chrome.gd — before first render, or the flat CSS fallback flashes
    data = await loadGameData();
    const hasSave = Boolean(localStorage.getItem(SAVE_KEY));
    state = loadState(data.content);
    $('resumeButton').hidden = !hasSave;
    $('beginButton').addEventListener('click', () => {
      if (hasSave) state = createState(data.content);
      persist();
      $('splash').hidden = true;
      render();
      $('modeRoot').focus();
    });
    $('resumeButton').addEventListener('click', () => {
      $('splash').hidden = true;
      render();
      $('modeRoot').focus();
    });
    $('localeButton').addEventListener('click', () => {
      state.locale = state.locale === 'en' ? 'fi' : 'en';
      persist(); render();
    });
    $('resetButton').addEventListener('click', resetCampaign);
    $('modeNav').addEventListener('click', event => {
      const button = event.target.closest('[data-mode-target]');
      if (!button) return;
      state.mode = button.dataset.modeTarget;
      observation = '';
      persist(); render();
    });
    $('modeRoot').addEventListener('click', handleRootClick);
    $('modeRoot').addEventListener('keydown', event => {
      const target = event.target.closest('.map-anchor-hit');
      if (target && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    // ── the pause menu, and the jumps THINGS TO TEST depends on ──────────
    //
    // Every jump puts the app into a state a player would have to earn. They
    // are deliberately written here rather than inside the menu: the menu
    // should not know how this game changes mode, or it becomes the thing that
    // breaks when the game does.
    function jumpTo(target) {
      if (!target) return;
      if (target.kind === 'encounter') {
        // Walk the schedule to the block this encounter belongs to, so the
        // screen arrives with the state around it rather than out of context —
        // a conversation with the wrong day on the clock is not the screen.
        const index = data.content.schedule.findIndex(slot => slot.encounter_id === target.id);
        if (index >= 0) state.scheduleIndex = index;
        state.mode = 'encounter';
        observation = '';
      } else if (target.kind === 'battle') {
        // A jump must not depend on how far the campaign has been played.
        // startBattle throws if fewer than player_deployed are recruited, and
        // on a fresh campaign that is everyone — the jump found this itself
        // the first time it was driven rather than read from the code.
        const def = data.battles.get(target.id);
        const need = def?.player_deployed ?? 2;
        for (const crew of data.content.crew) {
          if (state.recruited.length >= need) break;
          if (!state.recruited.includes(crew.id)) state.recruited.push(crew.id);
        }
        if (!startBattle(target.id)) return;
      } else if (target.kind === 'news') {
        state.newsSeen = state.newsSeen.filter(id => id !== target.id);
        state.newsReturnMode = 'route';
        state.mode = 'news';
      } else if (target.kind === 'ending') {
        state.scheduleIndex = data.content.schedule.length;
        state.mode = 'route';
      } else if (target.kind === 'ledger') {
        state.mode = 'ledger';
      } else if (target.kind === 'day') {
        const index = data.content.schedule.findIndex(slot => slot.day === target.day);
        if (index >= 0) state.scheduleIndex = index;
        state.mode = 'route';
      }
      persist();
      render();
      $('modeRoot').focus();
    }

    // You are STANDING at the opening anchor, and at whatever each scheduled
    // block puts you in front of. Without seeding those the board opens
    // completely blank, which reads as broken rather than as unearned.
    markSeen(state, state.selectedAnchor);
    for (let i = 0; i <= state.scheduleIndex; i++) {
      const slot = data.content.schedule[i];
      if (slot?.anchor_id) { const keep = state.scheduleIndex; state.scheduleIndex = i; markSeen(state, slot.anchor_id); state.scheduleIndex = keep; }
    }

    const pause = createPauseMenu({
      root: $('pause'),
      version: 'v4.1',
      jump: jumpTo,
    });
    $('pauseButton').addEventListener('click', () => pause.toggle());
    // Esc pauses from anywhere. The menu handles Esc itself once it is open,
    // where it backs out one level instead of closing.
    window.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || pause.isOpen) return;
      if ($('splash').hidden === false) return;
      event.preventDefault();
      pause.open();
    });

    render();
    window.__ptv3 = {
      get data() { return data; },
      get state() { return state; },
      debug: {
        setState(next) { state = next; persist(); render(); },
        startBattle(id) { startBattle(id); persist(); render(); },
        openEncounter,
        render,
        jumpTo,
        pause,
      },
    };
  } catch (error) {
    console.error(error);
    $('splash').hidden = true;
    $('modeRoot').innerHTML = `<section class="paper-panel empty-state"><p class="section-label">LOAD FAILURE</p><h2 class="section-title">THE FILES DID NOT ARRIVE</h2><p>${esc(error.message)}</p></section>`;
  }
}

boot();
