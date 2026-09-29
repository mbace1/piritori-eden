import { availableVisits, openVisit, activeVisit, chooseVisit, leaveVisit } from './visits.js?v=4';
import { mountSceneSpeaker, disposeSceneSpeaker } from './scene-speaker.js?v=2';
import { renderChapterPeople } from './chapter-narrative.js?v=1';
import { loadGameData, shortestPath, assetUrl } from './content.js?v=2';
import { mountMapRelief } from './map-relief.js?v=1';
import {
  SAVE_KEY, createState, loadState, saveState, currentSchedule, currentEncounter,
  formatBlock, choiceStatus, chooseEncounter, advanceSchedule, deployedCrew,
  transactOffer, applyEffects, commitRoute, sendOnRoute,
  crewRecord, hiringPoolFor, hireFromPool,
  isNamed, careerLeft, careerIsVisible, ageCrew,
  levelOf, unspentPerkPoints, perkValue, skillsOf, skillOffer, spendPerk,
  learnSkill, spendPerkPointOnSkill, train,
  droppedKit, takeLoot, loseKitOf, canFenceHere, sellLoot, resaleAt, conditionWord, isPurchasable,
  canShopHere, buyOf, buyEquipment,
  arrestCrew, chapterProgress, chapterGoalMet, chapterEndingAvailable, attemptChapterEnding,
  forecastEnding, recordFight, fightsToday,
} from './state.js?v=8';
import { createPauseMenu } from './pause.js?v=4';
import { wake as wakeSound, bell, till, steps, sting, arrival, soundOn, setSound, soundState } from './sound.js?v=1';
import { board, exposureHere, markSeen, addFootprint, INFO } from './board.js?v=3';
import { previewJourney, commitJourney } from './journey.js?v=2';
import { buyBowl, bowlBlocker, BOWL_EUR, TOKO_ANCHOR, tokoWeapons, buyFromToko } from './toko.js?v=3';
import { loadStory, caseBoard, keyCluesFound, caseBlocker, caseKnown, resolveCase, briefing, settleCut } from './story.js?v=3';
import { turnPlan, nextChapter } from './chapter.js?v=1';
import { loadDoors, offerDoors, takeDoor, doorBlocker, templateOf, registerTaken, doorFightEffects, canFight, isDoorBlock, escalation } from './doors.js?v=1';
import { loadRoadEvents, rollRoad, resolveRoad, pendingRoad, choiceOpen, clockLabel, forceRoad } from './road.js?v=3';
import {
  createBattleState, attachGrowth, selectedUnit, selectUnit, selectAction, playerAttack, brace, useItem,
  validMoveCells, moveUnit, endPlayerPhase, autoCommand, withdrawBattle,
  negotiateBattle, resultEffects, injuredPlayers, selectStance,
  policeAwaitingPosture, choosePolicePosture, takenByPolice, savedFromPolice, POLICE_POSTURE,
  attackTargets, syncAlliesFor, coverStandingLine, coverAttackLine,
} from './battle.js?v=12';
import { LANES, ROWS, totalRows, depthOf, parseSlotKey, slotKey, describeSlot } from './grid.js?v=2';
import { boot as bootChrome } from './chrome.js?v=2';
import { STANCE, STANCES } from './stance.js?v=2';
import { mountBattleStage3D, disposeBattleStage3D, setBattleLights } from './render3d.js?v=11';
import { positionBattleDOM } from './stage-camera.js?v=5';

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
    in_cover: 'Behind the %s',
    cover_blocks: 'Blocked — nothing gets through that.',
    cover_intercepts: 'Something is in the way. The swing will be caught.',
    cover_pierced: 'This weapon goes through it.',
    'crew.level_n': 'Level %d',
    'crew.pick_skill': 'Something new:',
    'crew.pick_perk': 'Or put %d point into:',
    'crew.train': 'Train with a veteran',
    'crew.trained': 'Already trained',
    'perk.strength': 'Strength',
    'perk.speed': 'Speed',
    'perk.wits': 'Wits',
    'perk.nerve': 'Nerve',
    'perk.toughness': 'Toughness',
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
    in_cover: '%s takana',
    cover_blocks: 'Estetty — mikään ei mene läpi.',
    cover_intercepts: 'Jotain on tiellä. Isku jää kiinni.',
    cover_pierced: 'Tämä ase menee siitä läpi.',
    'crew.level_n': 'Taso %d',
    'crew.pick_skill': 'Jotain uutta:',
    'crew.pick_perk': 'Tai laita %d piste:',
    'crew.train': 'Harjoittele veteraanin kanssa',
    'crew.trained': 'Jo harjoiteltu',
    'perk.strength': 'Voima',
    'perk.speed': 'Nopeus',
    'perk.wits': 'Äly',
    'perk.nerve': 'Hermo',
    'perk.toughness': 'Sitkeys',
  },
  ja: {
    'crew.level_n': 'レベル%d',
    'crew.pick_skill': '新しく覚える:',
    'crew.pick_perk': 'または%dポイントを:',
    'crew.train': 'ベテランに訓練してもらう',
    'crew.trained': '訓練済み',
    'perk.strength': '力',
    'perk.speed': '速さ',
    'perk.wits': '知恵',
    'perk.nerve': '胆力',
    'perk.toughness': '頑丈さ',
  },
};

let data;
let state;
// The road (road.js): events in transit and on arrival. Empty until loaded,
// and a failed load leaves the city exactly as it was, with no events.
// What Toko said at the last bowl ('' = nothing new, null = no bowl yet).
let tokoTold = null;
// The Thursday Load (story.js). Empty until loaded; a failed load hides it.
let story = { missions: [], clues: [], case: null };
let roadEvents = { rules: { first_story_block: Infinity }, events: [] };
let doors = { rules: { offers_min: 0, offers_max: 0, scenes: {} }, templates: [] };
let routePlanning = false;
let routeDraft = [];
let observation = '';
let toastTimer;

function tr(key, ...args) {
  let s = UI[state?.locale ?? 'en'][key] ?? UI.ja?.[key] ?? UI.en[key] ?? key;
  for (const a of args) s = String(s).replace('%d', String(a));
  return s;
}
function persist() { saveState(state); }

// ── M1: where the player is LOOKING is not where Aatami IS ─────────────
// (design/CLAUDE_MAP_MISSION_NEXT_STEPS.md §1.) `state.selectedAnchor` stays
// presence: the one place visits, trades, fencing, the chapter operation and
// the story encounter are available. Tapping the map moves only this cursor,
// which is never saved and never touches the campaign — looking at a place is
// not an economic event. It is forgotten whenever the ground moves under it:
// a new or reloaded campaign (a different state object) or a schedule change.
let inspectionFocus = null;
let inspectionOwner = null;
let inspectionStamp = null;
function inspectedAnchorId() {
  if (inspectionOwner !== state || inspectionStamp !== state.scheduleIndex) {
    inspectionFocus = null;
    inspectionOwner = state;
    inspectionStamp = state.scheduleIndex;
  }
  return inspectionFocus ?? state.selectedAnchor;
}
function inspectAnchor(anchorId) {
  inspectedAnchorId();
  if (inspectionFocus !== anchorId) journeyDraft = null;
  inspectionFocus = anchorId;
}
function resetInspection() { inspectionFocus = null; inspectionOwner = null; journeyDraft = null; }
// M2: a journey PREVIEW is local like the cursor — Cancel, a reload or any
// change of ground throws it away, and a thrown-away preview was never saved.
let journeyDraft = null;
function currentJourney() {
  if (!journeyDraft) return null;
  if (journeyDraft.owner !== state || journeyDraft.preview.scheduleIndex !== state.scheduleIndex
    || journeyDraft.preview.origin !== state.selectedAnchor || journeyDraft.preview.destination !== inspectedAnchorId()) {
    journeyDraft = null;
  }
  return journeyDraft?.preview ?? null;
}
const JOURNEY_REFUSAL = {
  sealed: 'Sealed in this slice — you can look, not go.',
  unknown: 'There is no such place on this map.',
  'already-here': 'Aatami is already here.',
  'campaign-over': 'The seven days are over.',
  'in-battle': 'Not while a fight is on.',
  'in-visit': 'Finish the visit first.',
  disconnected: 'No public path reaches there from here.',
  stale: 'That plan no longer matches where Aatami is — plan the journey again.',
  'no-preview': 'Plan the journey first.',
};
/** The authored story lead: where the schedule's next encounter is. It is
 *  neither the inspection cursor nor necessarily where Aatami stands. */
function storyLeadId() { return currentSchedule(state, data.content)?.anchor_id ?? null; }
function presentAtLead() { const lead = storyLeadId(); return Boolean(lead) && state.selectedAnchor === lead; }
/** Areas Aatami can travel to. Sealed, landmark and the isolated training
 *  fixture are for looking at (training keeps its own button). */
function canTravelTo(anchor) { return anchor?.sliceState === 'active'; }
/**
 * The arrival (v4.59, owner answer 8: "sure, setting up"). A new run opens on
 * the number 3 pulling into Piritori in the rain and Aatami stepping off,
 * before the first tap on the map. Skippable from frame one by any tap or
 * key, and it goes when it is done either way. Under reduced motion it is
 * one still frame with the same lines. It never touches state.
 */
function playOpening() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Owner, answer 12: "Kallio Noir mystery and need to make some profits.
  // Dirty and dingy setting with some weird NPCs." The money and the first
  // payment are read from the save and the content, never typed here.
  const due = data.content.campaign.settlement?.required_payments?.[0];
  const lines = [
    'Kallio, 2003. It has rained for a week and the gutters have given up.',
    `Aatami steps off the 3 at Piritori with €${Math.round(state.cash)}, ${Math.round(state.markka)} mk and a debt of €${Math.round(state.debt)}${due ? `. €${due.amount_eur} of it is due on day ${due.day}` : ''}.`,
    'Up Vaasankatu the Tokon Ramen sign flickers. The man in the fur hat is at the tram stop again. He was there yesterday. Nobody gets on with him.',
  ];
  const veil = document.createElement('div');
  veil.className = `opening${reduce ? ' still' : ''}`;
  veil.id = 'opening';
  veil.setAttribute('role', 'dialog');
  veil.setAttribute('aria-label', 'Arrival');
  veil.innerHTML = `<div class="opening-scene" aria-hidden="true">
      <i class="op-sky"></i><i class="op-block a"></i><i class="op-block b"></i><i class="op-block c"></i>
      <i class="op-rain"></i><i class="op-wire"></i>
      <div class="op-sign"><b>TOKON</b><b>RAMEN</b></div>
      <div class="op-stop"><b>PIRITORI</b><span>3</span></div>
      <i class="op-npc"></i><i class="op-bag"></i><i class="op-puddle"></i>
      <div class="op-tram"><i class="op-window"></i><i class="op-window"></i><i class="op-window"></i><i class="op-door"></i><b>3</b></div>
      <i class="op-figure"></i><i class="op-street"></i>
    </div>
    <div class="opening-lines" aria-live="polite">${lines.map((l, i) => `<p style="--i:${i}">${esc(l)}</p>`).join('')}</div>
    <button class="paper-button opening-skip" type="button">SKIP ›</button>`;
  document.body.append(veil);
  // Focus leaves the Begin button, or the Space that skips (keydown) would
  // press Begin again on its keyup and start a second arrival.
  veil.querySelector('.opening-skip').focus();
  arrival();
  return new Promise(resolve => {
    let done = false;
    const finish = event => {
      if (done) return; done = true;
      event?.preventDefault?.();
      clearTimeout(timer);
      window.removeEventListener('keydown', finish, true);
      veil.classList.add('leaving');
      setTimeout(() => { veil.remove(); resolve(); }, reduce ? 0 : 450);
    };
    const timer = setTimeout(finish, reduce ? 6000 : 9500);
    veil.addEventListener('pointerup', finish);
    window.addEventListener('keydown', finish, true);
  });
}

function logToast(message) {
  const toast = $('toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

// Money you can FEEL: the cash card counts to its new value and says the
// change (+€68 / −€45) beside it. Presentation only — the number shown at the
// end is always state.cash, and the first render after a load or a new
// campaign shows no change (there is nothing to have changed from).
let shownCash = null, shownCashOwner = null;
function renderCash() {
  const el = $('cashValue');
  const to = Number(state.cash);
  const fmt = v => Math.round(v).toLocaleString('fi-FI');
  const from = shownCashOwner === state ? shownCash : null;
  shownCash = to; shownCashOwner = state;
  if (from === null || from === to) { el.textContent = Number(to).toLocaleString('fi-FI', { maximumFractionDigits: 2 }); return; }
  const card = el.closest('.res-cash');
  const delta = to - from;
  till(delta);
  card.querySelector('.cash-delta')?.remove();
  card.insertAdjacentHTML('beforeend', `<span class="cash-delta ${delta > 0 ? 'up' : 'down'}" aria-hidden="true">${delta > 0 ? '+' : '−'}€${fmt(Math.abs(delta))}</span>`);
  card.classList.remove('cash-moved'); void card.offsetWidth; card.classList.add('cash-moved');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pill = card.querySelector('.cash-delta');
  const drop = () => pill.remove();
  pill.addEventListener('animationend', drop, { once: true });
  if (reduce) setTimeout(drop, 2400);
  if (reduce) { el.textContent = Number(to).toLocaleString('fi-FI', { maximumFractionDigits: 2 }); return; }
  const t0 = performance.now(), dur = 650;
  const step = now => {
    if (shownCash !== to) return; // a newer change took over
    const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 3;
    el.textContent = k < 1 ? fmt(from + (to - from) * e) : Number(to).toLocaleString('fi-FI', { maximumFractionDigits: 2 });
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderHud() {
  renderCash();
  $('markkaValue').textContent = Math.round(state.markka).toLocaleString('fi-FI');
  $('debtValue').textContent = Math.round(state.debt).toLocaleString('fi-FI');
  $('intelValue').textContent = state.intel;
  const clock = clockLabel(state, currentSchedule(state, data.content), roadEvents);
  $('blockLabel').textContent = formatBlock(state, data.content) + (clock ? ` · ${clock}` : '');
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
  // A pending road event waits for an answer; nothing else opens past it.
  if (state.road?.pending && state.mode !== 'battle') state.mode = 'road';
  const views = {
    route: renderRoute,
    encounter: renderEncounter,
    visit: renderEncounter,
    ledger: renderLedger,
    battle: renderBattle,
    news: renderNews,
    road: renderRoad,
    shop: renderStreet,
    ramen: renderRamen,
    case: renderCase,
  };
  disposeSceneSpeaker();
  root.innerHTML = (views[state.mode] ?? renderRoute)();
  // A new screen starts at its top. The scroller is shared by every mode, so
  // coming back to the map after an encounter used to land mid-panel with the
  // map scrolled away. Same-mode re-renders keep their place.
  if (root.dataset.shown !== state.mode) { root.scrollTop = 0; root.dataset.shown = state.mode; }
  const speakerHost = root.querySelector('[data-speaker]');
  if (speakerHost) mountSceneSpeaker(speakerHost, assetUrl(data, speakerHost.dataset.asset), speakerHost.dataset.speaker);

  // DESIGN_AUTHORITY.md addendum 2026-08-28: real 3D, not just registered
  // meshes, is one of the parity gaps this build owes Godot. Mounted here
  // rather than inside renderBattle() because it needs the REAL <canvas>'s
  // container already attached to the document (WebGL context creation
  // reads its size), which is only true after innerHTML has landed.
  // Same rule as the 3D stage below: a canvas must be attached and laid out
  // before it can be measured, so this runs after innerHTML, not inside
  // renderRoute()'s string.
  if (state.mode === 'route') mountMapRelief($('cityRelief'));

  if (state.mode === 'battle' && state.battle) {
    mountBattleStage3D($('stage3dMount'), state.battle, data);
    // Both calls measure the SAME just-attached container; running this
    // right after gives the DOM grid/unit tokens the real projected
    // positions instead of `cellPosition()`'s static guess — see
    // `stage-camera.js`'s header for why the two ever disagreed.
    positionBattleDOM($('stage3dMount'), state.battle);
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

/**
 * The relief used to be SEVEN INVENTED SHAPES: a twenty-point landmass blob,
 * five "districts" and a park, none of which corresponded to anything in
 * Helsinki. They are gone, replaced by the real OSM land, water, streets and
 * railway that `map-relief.js` draws onto a canvas UNDER this SVG — the last
 * parity gap `PORTING.md` §1.06 measured against the Godot build.
 *
 * Removed rather than kept underneath, deliberately. Reported directly about
 * the Godot map, 2026-08-26: "the grey lines that are there from the squares
 * that you re-colored" — two road networks, or an invented coastline under a
 * real one, disagreeing in one picture is exactly the tell that gets noticed.
 * `city_map.gd` dropped its own hand-drawn roads for the same reason.
 *
 * Nothing replaces the districts. They were decoration standing in for
 * geography this build did not have; it has the geography now.
 */
function mapBackground() {
  return '';
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

function anchorSvg(anchor, current, selected, present) {
  const point = anchor.board;
  const locked = ['locked', 'teaser'].includes(anchor.sliceState);
  const stateClass = [current ? 'current' : '', selected ? 'selected' : '', present ? 'present' : '', locked ? 'locked' : '', anchor.sliceState === 'landmark' ? 'landmark' : ''].join(' ');
  const roles = [present ? 'you are here' : '', current ? 'story lead' : '', openDoorAnchors().has(anchor.id) ? 'a door is open here' : '', selected && !present ? 'inspecting' : ''].filter(Boolean);
  const offset = anchor.labelOffset ?? [14, -20];
  const small = anchor.label.length > 15 ? 'small' : '';
  const schedule = currentSchedule(state, data.content);
  const mission = schedule?.anchor_id === anchor.id ? `<path class="mission-pulse" d="M${point.x - 10} ${point.y - 45}l10 -16 10 16 -10 8Z"/>` : '';
  const door = openDoorAnchors().has(anchor.id) ? `<rect class="door-pin" x="${point.x - 9}" y="${point.y - 58}" width="18" height="26" rx="2"/>` : '';
  return `
    <g class="map-node ${stateClass}" data-anchor-group="${esc(anchor.id)}">
      ${mission}${door}
      ${present ? `<rect class="presence-mark" x="${point.x - 26}" y="${point.y - 26}" width="52" height="52" transform="rotate(45 ${point.x} ${point.y})"/>` : ''}
      <circle class="map-node-dot" cx="${point.x}" cy="${point.y}" r="${locked ? 14 : 18}"/>
      <circle class="map-anchor-hit" data-action="select-anchor" data-anchor="${esc(anchor.id)}"
        cx="${point.x}" cy="${point.y}" r="55" fill="transparent" role="button" tabindex="0"
        aria-label="${esc(anchor.label)}${locked ? ', locked' : ''}${roles.length ? `, ${roles.join(', ')}` : ''}"/>
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
      ? 'A known buyer across the map will pay more tonight. Travel to Siltasaari and make the first profit.'
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

/** THE next action on the route screen — exactly one, derived from state, so
 *  the first two minutes never leave a player on a map with nothing lit.
 *  Measured before this (design/FIRST_TWO_MINUTES.md): 3 of 11 opening steps
 *  on desktop and 5 on a phone had no lit action in view. */
function nextStep(slot) {
  if (!slot || state.endingId) return null;
  const journey = currentJourney();
  if (slot.door && !slot.encounter_id && !journey?.ok) {
    return { step: 'doors', label: 'CHOOSE A DOOR', hint: 'The story leaves this block free. Take one door; the others close with the block.' };
  }
  const leadId = slot.anchor_id;
  const lead = data.anchors.get(leadId);
  if (journey?.ok) return { step: 'commit', label: `TRAVEL · ${data.anchors.get(journey.destination)?.label ?? journey.destination}`, hint: 'Walk there now. Nothing is spent until you arrive.' };
  if (state.selectedAnchor === leadId) {
    const encounter = data.encounters.get(slot.encounter_id);
    if (!encounter || state.choices[encounter.id]) return null;
    return { step: 'enter', label: `ENTER · ${encounterTitle(encounter)}`, hint: `Aatami is at ${lead?.label ?? leadId}. The story is here.` };
  }
  if (lead?.sliceState !== 'active') return null;
  return { step: 'plan', label: `TRAVEL TO ${lead.label}`, hint: 'The story has moved on. Aatami is still where you left him.' };
}

/** Taken, then cleared BEFORE the commit: a second tap finds no plan. */
function commitPlannedJourney() {
  const preview = currentJourney();
  journeyDraft = null;
  const result = commitJourney(state, data, preview);
  if (!result.ok) { logToast(JOURNEY_REFUSAL[result.reason] ?? result.reason); render(); return; }
  inspectAnchor(result.destination);
  // A surprise (owner, answer 6): the preview never forecasts it.
  steps();
  if (rollRoad(state, data, roadEvents, result)) { state.mode = 'road'; setTimeout(sting, 900); }
  else logToast(`Aatami arrives at ${data.anchors.get(result.destination)?.label}.`);
  persist(); render();
}

/** The road: an event on the way, or on arriving (road.js). */
function renderRoad() {
  const r = state.road ?? {};
  const event = pendingRoad(state, roadEvents);
  const last = !event && r.last ? roadEvents.events.find(e => e.id === r.last.id) : null;
  const shown = event ?? last;
  if (!shown) return renderRoute();
  const phase = event ? r.pending.phase : (r.last.phase ?? 'transit');
  const leg = r.pending ?? r.last ?? {};
  const from = data.anchors.get(leg.from)?.label, to = data.anchors.get(leg.to ?? state.selectedAnchor)?.label;
  const where = phase === 'arrival' ? `ARRIVING · ${esc(to ?? '')}` : `ON THE WAY${from && to ? ` · ${esc(from)} → ${esc(to)}` : ''}`;
  const minutes = m => (m ? `+${m} MIN` : 'NO TIME');
  const body = event
    ? `<div class="choice-list">${event.choices.map(choice => {
        const open = choiceOpen(choice, state, data);
        return `<button class="choice-card" type="button" data-action="road-choose" data-choice="${esc(choice.id)}" ${open.ok ? '' : 'disabled'}>
          <strong>${esc(choice.label)}</strong>
          <span>${esc(choice.detail)}</span>
          <small class="road-time">${minutes(choice.minutes)}</small>
          ${open.ok ? '' : `<em>${esc(open.reasons.join(' · ').replace(/deployed-crew >= (\d+)/, 'needs $1 crew with you').replace(/stock piri >= 1/, 'needs a pack on you'))}</em>`}
        </button>`;
      }).join('')}</div>`
    : (() => {
        const choice = last.choices.find(c => c.id === r.last.choice);
        const messages = state.lastOutcome?.length ? state.lastOutcome : [];
        return `<div class="outcome-card">
          <h3>${esc(choice?.label ?? '')}</h3>
          <p>${esc(choice?.detail ?? '')}</p>
          ${messages.map(item => `<p>${esc(item)}</p>`).join('')}
          <div class="consequence-strip">${esc(minutes(r.last.minutes))}${clockLabel(state, currentSchedule(state, data.content), roadEvents) ? ` · NOW ${clockLabel(state, currentSchedule(state, data.content), roadEvents)}` : ''}</div>
          <button class="paper-button primary" data-action="road-continue">${tr('continue')}</button>
        </div>`;
      })();
  return `<div class="road-layout">
    <section class="paper-panel encounter-copy road-card" data-road="${esc(shown.id)}" data-phase="${esc(phase)}">
      <p class="section-label">${where}</p>
      <h2 class="section-title">${esc(shown.title)}</h2>
      <p class="encounter-opening">${esc(shown.text)}</p>
      ${body}
    </section>
  </div>`;
}

function renderNextStep(slot) {
  const next = nextStep(slot);
  if (!next) return '';
  return `<div class="next-step" data-step="${next.step}">
    <p>${esc(next.hint)}</p>
    <button class="paper-button primary" data-action="next-step" data-step="${next.step}">${esc(next.label)}</button>
  </div>`;
}

function renderRoute() {
  const slot = currentSchedule(state, data.content);
  if (!slot) return renderCampaignEnd();
  const present = data.anchors.get(state.selectedAnchor) ?? data.anchors.get(slot.anchor_id);
  const selected = data.anchors.get(inspectedAnchorId()) ?? present;
  const lead = data.anchors.get(slot.anchor_id);
  const here = selected.id === present.id;
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
  const journey = currentJourney();
  const journeySvg = journey?.ok ? `<path class="map-journey" d="${mapPath(journey.path)}"/>` : '';
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
        <div class="map-stage">
        <canvas class="city-relief" id="cityRelief" aria-hidden="true"></canvas>
        <svg class="city-map" viewBox="0 0 1000 1000" role="img" aria-labelledby="mapTitle mapDesc">
          <title id="mapTitle">Kallio operations map, north up</title>
          <desc id="mapDesc">Twelve accurate public anchors compressed into one relief map. The next encounter is at ${esc(data.anchors.get(slot.anchor_id)?.label)}.</desc>
          ${mapBackground()}
          ${transitLayerSvg()}
          <g aria-hidden="true">${routeSvg}${journeySvg}${ordinaryFlowSvg()}${hiddenPips}</g>
          ${data.map.anchors.map(anchor => anchorSvg(anchor, anchor.id === slot.anchor_id, anchor.id === selected.id, anchor.id === present.id)).join('')}
        </svg>
        </div>
      </section>
      <aside class="map-side">
        ${renderDoorBoard(slot)}
        ${progressionCard(slot)}
        <section class="paper-panel inspect-panel" data-inspected="${esc(selected.id)}" data-present="${esc(present.id)}" data-lead="${esc(lead?.id ?? '')}">
          <p class="section-label">${here ? 'YOU ARE HERE' : 'INSPECTING'}${selected.sliceState === 'active' ? '' : ` · ${esc(selected.sliceState === 'landmark' ? 'LANDMARK' : 'SEALED')}`}</p>
          <h2>${esc(selected.label)}</h2>
          <p class="presence-line"><span>AATAMI · <b>${esc(present.label)}</b></span><span>STORY LEAD · <b>${esc(lead?.label ?? '—')}</b></span></p>
          <p>${esc(anchorDescription(selected))}</p>
          <div class="route-steps">${(selected.roles ?? []).map(role => `<span class="tag">${esc(cap(role))}</span>`).join('')}</div>
          <div class="node-actions">
            ${here && canShopHere(state) ? '<button class="paper-button" data-action="open-shop">STREET SELLER · GEAR</button>' : ''}
            ${here && story.case && selected.id === story.case.anchor_id && caseKnown(state, story) && !state.choices[story.case.id] ? `<button class="paper-button case-button" data-action="open-case">CASE · ${esc(story.case.title.toUpperCase())}</button>` : ''}
            ${here && selected.id === TOKO_ANCHOR ? '<button class="paper-button" data-action="open-ramen">TOKON RAMEN · A BOWL AND WHAT HE HEARD</button>' : ''}
            ${here ? availableVisits(state, data).map(v => `<button class="paper-button" data-action="open-visit" data-visit="${esc(v.id)}">VISIT · ${esc(v.participants.includes('jaska') ? 'Jaska' : 'Toko')}</button>`).join('') : ''}
            ${here && selected.id === slot.anchor_id ? `<button class="paper-button" data-action="open-encounter">${tr('enter')} · ${esc(nextEncounter?.id.replace('enc-', '').replaceAll('-', ' '))}</button>` : ''}
            ${!here && canTravelTo(selected) && !journey ? `<button class="paper-button" data-action="plan-journey" data-anchor="${esc(selected.id)}">TRAVEL HERE · ${esc(selected.label)}</button>` : ''}
            ${lead && selected.id !== slot.anchor_id ? `<button class="paper-button" data-action="show-lead">SHOW LEAD · ${esc(lead?.label ?? '')}</button>` : ''}
            ${selected.sliceState === 'training'
              ? `<button class="paper-button primary" data-action="start-training">${tr('start_training')}</button>`
              : `<button class="paper-button" data-action="plan-route">${routePlanning ? tr('clear') : tr('planning')}</button>`}
          </div>
          ${journey ? renderJourneyPreview(journey) : here ? '' : `<p class="consequence-strip">${esc(inspectionNote(selected, slot))}</p>`}
          ${routePlanning ? renderRoutePlanner(draftPath) : ''}
        </section>
        <section class="paper-panel">${routeInfo}</section>
        <section class="paper-panel">
          <p class="section-label">CITY MEMORY</p>
          <ul class="log-list">${state.logs.slice(0, 5).map(item => `<li>${esc(item)}</li>`).join('')}</ul>
        </section>
      </aside>
      ${renderNextStep(slot)}
    </div>`;
}

/** Anchors with a door open on this block (H2): pinned on the map. */
function openDoorAnchors() {
  const slot = data.content.schedule[state.scheduleIndex];
  if (!slot?.door || state.doors?.taken?.[state.scheduleIndex]) return new Set();
  return new Set(offerDoors(state, data, doors).map(o => o.anchor));
}

const DOOR_KIND = { gig: 'GIG', pickup: 'PICKUP', sale: 'SALE', favour: 'FAVOUR', watch: 'WATCH', hit: 'HIT' };
const DOOR_FROM = { network: 'THE NETWORK', street: 'THE STREET', toko: 'TOKO', mccormick_family: 'THE McCORMICKS', jade_lantern_network: 'THE JADE LANTERN' };

/** H2: a block the spine leaves free offers 2-3 doors. Take one; it costs the block. */
function renderDoorBoard(slot) {
  if (!slot?.door || slot.encounter_id) return '';
  const offers = offerDoors(state, data, doors);
  const today = fightsToday(state, data.content);
  const cap = doors.rules.fights_per_day_max ?? 2;
  const cards = offers.map(offer => {
    const t = templateOf(doors, offer.template);
    const anchor = data.anchors.get(offer.anchor);
    const blocked = doorBlocker(state, data, doors, offer, roadEvents);
    return `<article class="door-card" data-door="${esc(t.id)}" data-kind="${esc(t.kind)}" data-anchor="${esc(offer.anchor)}">
      <p class="section-label">${DOOR_KIND[t.kind] ?? esc(t.kind)} · ${DOOR_FROM[t.from] ?? esc(t.from)} · ${esc(anchor?.label ?? offer.anchor)}</p>
      <h3>${esc(t.title)}</h3>
      <p>${esc(t.premise)}</p>
      <ol class="mission-steps">${(t.steps ?? []).map(step => `<li>${esc(step)}</li>`).join('')}</ol>
      <p class="door-stakes"><span class="tag risk-${esc(t.risk)}">${esc(t.risk.toUpperCase())} RISK</span>${canFight(t) ? '<span class="tag door-fight">CAN BECOME A FIGHT</span>' : ''}${t.late ? '<span class="tag">LATE · CLOSES 22:00</span>' : ''}</p>
      <p class="consequence-strip">${esc(t.stakes)}</p>
      <button class="paper-button ${blocked ? '' : 'primary'}" data-action="take-door" data-door="${esc(t.id)}" ${blocked ? 'disabled' : ''}>${blocked === 'closed' ? 'CLOSED' : `TAKE · ${esc(anchor?.label ?? '')}`}</button>
    </article>`;
  }).join('');
  return `<section class="paper-panel door-board" aria-label="Doors open this block">
    <p class="section-label">${esc(formatBlock(state, data.content))} · FREE BLOCK</p>
    <h2>${offers.length} DOORS OPEN</h2>
    <p class="dim">Take one: it becomes this block's work, where it is. The others close with the block. Fights today: ${today} of ${cap}.</p>
    ${offers.length ? cards : '<p class="consequence-strip">Nothing is open. Rest, and let the block pass.</p>'}
    ${offers.length ? '' : '<button class="paper-button" data-action="advance">LET THE BLOCK PASS</button>'}
  </section>`;
}

/** The journey you are about to make, and what it will and will not cost —
 *  the prototype's REAL cost, not a promise about the finished game (D002). */
function renderJourneyPreview(journey) {
  if (!journey.ok) return `<p class="consequence-strip">${esc(JOURNEY_REFUSAL[journey.reason] ?? journey.reason)}</p>`;
  const names = journey.path.map(id => data.anchors.get(id)?.label ?? id);
  return `<div class="journey-preview" data-journey="${esc(journey.origin)}>${esc(journey.destination)}">
    <p class="section-label">JOURNEY · ${journey.path.length - 1} LEG${journey.path.length === 2 ? '' : 'S'}</p>
    <div class="route-steps">${names.map(name => `<span class="tag">${esc(name)}</span>`).join('')}</div>
    <p class="consequence-strip">Aatami walks there himself. The walk costs no money and does not turn the block: the story clock moves only when a story beat ends.</p>
    <div class="route-actions">
      <button class="paper-button" data-action="commit-journey">TRAVEL</button>
      <button class="paper-button" data-action="cancel-journey">CANCEL</button>
    </div>
  </div>`;
}

/** What looking at a place from elsewhere does and does not let you do —
 *  said in words, so the panel never implies an action it will refuse. */
function inspectionNote(anchor, slot) {
  if (['locked', 'teaser'].includes(anchor.sliceState)) return 'Sealed in this slice — you can look, not go.';
  if (anchor.sliceState === 'landmark') return 'A landmark to look at, not a place to work.';
  if (anchor.sliceState === 'training') return 'An isolated test area — its fight costs and pays nothing.';
  const leadNote = anchor.id === slot.anchor_id ? ' The story lead is here.' : '';
  return `You are only looking.${leadNote} TRAVEL HERE plans a journey you can still cancel.`;
}

function anchorDescription(anchor) {
  const descriptions = {
    piritori: 'Vaasanpuistikko, Kurvi and the western Sörnäinen metro entrance share one readable cluster. The street seller works the square; up Vaasankatu, the Tokon Ramen sign never quite goes out.',
    vaasankatu: 'Warm counters, cold pavements and the information that moves between them. Tokon Ramen is here: Toko Slomo sells a bowl and what he heard.',
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
  const encounter = (state.mode === 'visit' ? activeVisit(state, data) : currentEncounter(state, data));
  if (!slot || !encounter) return renderCampaignEnd();
  const site = data.sites.get(encounter.site_id);
  const anchorId = encounter.anchor_override_id ?? site?.anchorId ?? slot.anchor_id;
  const anchor = data.anchors.get(anchorId);
  const art = encounter.scene_asset_id ? assetUrl(data, encounter.scene_asset_id) : '';
  const isToko = encounter.participants?.includes('toko');
  const isJaska = encounter.participants?.includes('jaska');
  const resolved = state.choices[encounter.id];
  const choice = encounter.choices.find(item => item.id === resolved);
  const pendingBattle = state.battle?.status === 'active';
  if (state.mode === 'encounter' && !pendingBattle && !presentAtLead()) return renderAwayFromLead(slot);
  return `
    <div class="encounter-layout">
      <section class="paper-panel scene-card">
        <div class="scene-viewport ${isToko ? 'speaker-stage' : ''}">
          ${art ? `<img class="scene-image" src="${esc(art)}" alt="${esc(site?.label ?? anchor?.label)}">` : genericScene(encounter.site_id)}
          ${isToko ? `<div class="scene-speaker toko-speaker" data-speaker="toko" data-asset="cast3d-toko-v01" aria-label="Toko Slomo behind the counter"></div><img class="counter-foreground" src="${esc(art)}" alt="" aria-hidden="true">` : ''}
          ${isJaska ? '<i class="jaska-contact" aria-hidden="true"></i><div class="scene-speaker jaska-standing" data-speaker="jaska" data-asset="cast3d-jaska-v01" aria-label="Jaska"></div>' : ''}
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
        ${encounter.door ? (() => { const t = templateOf(doors, encounter.door); return `<ol class="mission-steps">${(t?.steps ?? []).map(step => `<li>${esc(step)}</li>`).join('')}</ol><p class="consequence-strip">${esc(t?.stakes ?? '')}</p>`; })() : ''}
        <div class="inspectables" aria-label="Inspect scene">
          ${encounter.inspectables.map((item, index) => `<button class="paper-button inspect-button" data-action="inspect" data-index="${index}" type="button">${esc(item)}</button>`).join('')}
        </div>
        <p class="observation" aria-live="polite">${esc(observation)}</p>
        ${resolved ? renderEncounterOutcome(choice, pendingBattle) : renderChoices(encounter)}
        ${state.mode === 'visit' && !resolved ? '<button class="paper-button" data-action="leave-visit">LEAVE WITHOUT CHOOSING</button>' : ''}
      </section>
    </div>`;
}

function encounterTitle(encounter) {
  if (encounter.title) return encounter.title;
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
    'enc-kello-reckoning': 'THE MAN WHO STAYED',
    'enc-family-calls': 'THE FAMILIES KEEP BOOKS',
    'enc-shipment-night': 'THE SHIPMENT',
  };
  return titles[encounter.id] ?? cap(encounter.id.replace('enc-', ''));
}

function renderChoices(encounter) {
  return `<div class="choice-list">${encounter.choices.map(choice => {
    const status = choiceStatus(choice, state, data);
    return `<button class="choice-card" type="button" data-action="choose" data-choice="${esc(choice.id)}" ${status.ok ? '' : 'disabled'}>
      <strong>${esc(choice.label)}</strong>
      <span>${esc(choice.forecast)}</span>
      ${choice.escalates ? `<small class="road-time">CAN GO BAD · ${Math.round(choice.escalates * 100)}%</small>` : ''}
      ${status.ok ? '' : `<em>${esc(status.reasons.map(readableReason).join(' · '))}</em>`}
    </button>`;
  }).join('')}</div>`;
}

function readableReason(reason) {
  return reason
    .replace(/^deployed-crew >= (\d+)$/, 'needs $1 crew with you')
    .replace(/^fights-today < (\d+)$/, 'already $1 fights today')
    .replace(/^stock piri >= (\d+)$/, 'needs $1 pack on you')
    .replace(/^requires (.+)$/, 'only if $1');
}

function renderAwayFromLead(slot) {
  const lead = data.anchors.get(slot.anchor_id), here = data.anchors.get(state.selectedAnchor);
  return `<section class="paper-panel inspect-panel away-panel" data-present="${esc(here?.id ?? '')}" data-lead="${esc(lead?.id ?? '')}" data-inspected="${esc(inspectedAnchorId())}">
    <p class="section-label">${esc(formatBlock(state, data.content))} · STORY LEAD</p>
    <h2>${esc(lead?.label)}</h2>
    <p class="presence-line"><span>AATAMI · <b>${esc(here?.label)}</b></span><span>STORY LEAD · <b>${esc(lead?.label)}</b></span></p>
    <p>The next encounter happens at ${esc(lead?.label)}. From ${esc(here?.label)} there is nothing to choose and nothing to price.</p>
    <div class="node-actions">
      <button class="paper-button primary" data-action="go-lead">MAP · SHOW LEAD</button>
    </div>
  </section>`;
}

function renderEncounterOutcome(choice, pendingBattle) {
  if (state.mode === 'visit') return `<div class="outcome-card"><h3>${esc(choice?.label)}</h3><p>${esc(choice?.forecast)}</p><button class="paper-button primary" data-action="leave-visit">RETURN TO MAP</button></div>`;
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
      missed: 'The boat left without Aatami on it. No stake, and no upgrade.',
    };
    return `<section class="paper-panel">
      <p class="section-label">CHAPTER ${state.chapter}${def.label ? ` / ${esc(def.label.toUpperCase())}` : ''}</p>
      <h2 class="section-title">${esc((ending.label ?? 'THE OPERATION').toUpperCase())} — ${esc(state.lastEndingOutcome.toUpperCase())}</h2>
      <p>${esc(outcomeCopy[state.lastEndingOutcome] ?? '')}</p>
      ${renderChapterTurn()}
    </section>`;
  }
  const goalMet = chapterGoalMet(state);
  const fmt = value => state.chapterGoal === 'money' ? money(value) : String(value);
  // H1: the shipment is on the schedule now, day 10's night at Sörnäinen.
  // The threshold buys the right to run it there; missing it, the boat
  // still sails and the chapter still closes.
  return `<section class="paper-panel">
    <p class="section-label">CHAPTER ${state.chapter}${def.label ? ` / ${esc(def.label.toUpperCase())}` : ''}</p>
    <h2 class="section-title">${esc(cap(state.chapterGoal))} · ${fmt(progress)} / ${fmt(state.chapterThreshold)}</h2>
    <p>${esc(ending.brief ?? '')}</p>
    <p class="consequence-strip">${goalMet
      ? `Earned. ${esc((ending.label ?? 'The operation'))} runs on day ${def.days ?? 10}'s night at ${esc(anchor?.label ?? 'the harbour')}, for ${money(ending.stake_eur ?? 0)}.`
      : 'Earned by fencing loot at Piritori; market sales and mission payouts do not count. Short of it on day 10, the boat sails without you.'}</p>
  </section>`;
}

/** H7: what crosses into the next chapter, read off the save and the rules
 *  in canon (`chapter_turn`). Shown, never applied here: the turn itself
 *  waits for chapter 2 to be authored (`chapter.js`). */
function renderChapterTurn() {
  const plan = turnPlan(state, data.content);
  if (!plan.length) return '';
  const word = { carry: 'carries', reset: 'resets', stake: 'standard stake' };
  const val = row => v => row.money ? money(v) : String(v);
  const rows = plan.map(row => `<li class="turn-row turn-${row.rule}"><span>${esc(row.label)}</span>
    <span>${esc(val(row)(row.now))} → ${esc(val(row)(row.next))}</span><em>${esc(word[row.rule] ?? row.rule)}</em></li>`).join('');
  const later = nextChapter(state, data.content) ? '' : '<p class="consequence-strip">Chapter 2 opens in a later build. This is what it will open with.</p>';
  return `<p class="section-label">INTO CHAPTER ${state.chapter + 1}</p><ul class="turn-list">${rows}</ul>${later}`;
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
        <td><span class="dim">${row.heard ? `Toko, ${row.age} block${row.age === 1 ? '' : 's'} ago` : row.visited ? `${row.age} block${row.age === 1 ? '' : 's'} ago` : '—'}</span></td>
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
                <td>${offer.anchor_id === state.selectedAnchor
                  ? `<button class="paper-button" data-action="trade" data-offer="${esc(offer.id)}">${offer.side === 'buy' ? 'BUY 1' : 'SELL 1'}</button>`
                  : `<span class="dim">AT ${esc(anchor?.label)}</span>`}</td>
              </tr>`;
            }).join('')}</tbody>
          </table>
          <p class="consequence-strip">The slice trades one abstract good. No dosage, preparation, concealment or consumption detail is simulated.</p>
        </section>
        ${renderChapter()}
        ${renderChapterPeople(state, data.content)}
        ${renderMissions()}
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
            : '<p class="consequence-strip">Nothing fences from here. The street seller on Piritori buys.</p>'}
        </section>
        <section class="paper-panel">
          <p class="section-label">SHOP / MARKET GEAR</p>
          <h2 class="section-title">WHAT CAN BE BOUGHT</h2>
          ${renderShop()}
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
        ${renderCaseBoard()}
      </aside>
    </div>`;
}

function skillLabel(skillId) {
  const sk = (data.content.skills ?? []).find(s => s.id === skillId);
  return sk?.label ?? skillId;
}

/** Growth spend lines — silent when nothing pending (UX_SPEC §19 / Godot _add_level_lines). */
function renderGrowth(member) {
  if (!state.recruited.includes(member.id) && !state.temporaryCrew.includes(member.id)) return '';
  if (state.retiredCrew.includes(member.id) || state.arrestedCrew.includes(member.id)) return '';
  const points = unspentPerkPoints(state, member.id);
  const offer = skillOffer(state, data, member.id);
  const known = skillsOf(state, member.id);
  const canTrain = state.retiredCrew.length > 0
    && !state.trainedCrew.includes(member.id)
    && !isNamed(state, data, member.id)
    && state.recruited.includes(member.id);
  if (points <= 0 && offer.length === 0 && known.length === 0 && !canTrain) {
    // Still show level once they have fights behind them.
    if (levelOf(state, member.id) <= 1 && !state.crewFights[member.id]) return '';
  }
  const perkIds = data.content.perks ?? [];
  let html = `<p class="dim">${esc(tr('crew.level_n', levelOf(state, member.id)))}</p>`;
  if (offer.length && points > 0) {
    html += `<p class="dim">${esc(tr('crew.pick_skill'))}</p>`;
    html += offer.map(sk => `<button class="paper-button" data-action="learn-skill" data-crew="${esc(member.id)}" data-skill="${esc(sk.id)}">${esc(sk.label)} — ${esc(sk.note ?? '')}</button>`).join('');
  }
  if (points > 0) {
    html += `<p class="dim">${esc(tr('crew.pick_perk', points))}</p>`;
    html += `<div class="route-steps">${perkIds.map(pid => {
      const n = perkValue(state, member.id, pid);
      return `<button class="paper-button" data-action="spend-perk" data-crew="${esc(member.id)}" data-perk="${esc(pid)}">${esc(tr(`perk.${pid}`))} ${n}</button>`;
    }).join('')}</div>`;
  }
  if (known.length) {
    html += `<p class="dim">${esc(known.map(skillLabel).join(', '))}</p>`;
  }
  if (canTrain) {
    html += `<button class="paper-button cyan" data-action="train-crew" data-crew="${esc(member.id)}">${esc(tr('crew.train'))}</button>`;
  } else if (state.trainedCrew.includes(member.id)) {
    html += `<span class="tag">${esc(tr('crew.trained'))}</span>`;
  }
  return html;
}

function renderCrewCard(member) {
  const hired = state.recruited.includes(member.id) || state.temporaryCrew.includes(member.id);
  const status = state.crewStatus[member.id] ?? { condition: 0, maxCondition: 0, status: 'available' };
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
      <p>${esc(cap(member.role))} · ${hired ? esc(String(status.status ?? 'available').toUpperCase())
        : state.arrestedCrew.includes(member.id) ? 'ARRESTED'
        : state.retiredCrew.includes(member.id) ? 'RETIRED'
        : 'NOT RECRUITED'}</p>
      <p>${esc(flavor)}</p>
      <div class="status-dots" aria-label="${status.condition} condition">${Array.from({ length: Math.min(8, status.maxCondition || 0) }, (_, index) => `<i class="${index < status.condition ? 'on' : ''}"></i>`).join('')}</div>
      ${hired && careerIsVisible(state, data, member.id)
        ? `<span class="tag warning">${careerLeft(state, data, member.id)} FIGHT${careerLeft(state, data, member.id) === 1 ? '' : 'S'} LEFT</span>` : ''}
      ${renderGrowth(member)}
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


/**
 * TOKON RAMEN, Vaasankatu (v4.60, moved and corrected in v4.61). Owner,
 * 2026-09-27: Toko can be the first shop area; Tokon Ramen is on Vaasankatu
 * (answer 16). Per the GDD (§14.3, §7.4) Toko sells information, so the
 * counter sells a bowl and a price range (toko.js), and the gear went back
 * to the Piritori street seller. He says one line a block: a line, never a rule.
 */
const TOKO_LINES = [
  'Broth has been on since Tuesday. It gets better. Everything else in Kallio gets worse.',
  'The man at table two has eaten the same bowl since 1998. Do not sit near him. He listens.',
  'Gear costs money. Gossip costs a bowl. Both are on the menu if you know where to look.',
  'Somebody paid tonight with a Soviet kopek. I kept it. Things like that come back.',
  'The radio picks up the police band when it rains. So it is always on.',
  'Your debt is not my business. But it walks past my window twice a day.',
  'Three vans on Thursdays. I only count. I never ask.',
  'The woman with the pram full of radios was here again. She paid in stamps.',
  'Somebody keeps leaving one chopstick on the step. Just one. Every night.',
  'Kurvi had a power cut and nobody noticed for an hour. That tells you something about Kurvi.',
];

function renderRamen() {
  if (state.selectedAnchor !== TOKO_ANCHOR) { state.mode = 'route'; return renderRoute(); }
  const art = assetUrl(data, 'scene-toko-noodles-empty-v01');
  const line = TOKO_LINES[state.scheduleIndex % TOKO_LINES.length];
  const blocked = bowlBlocker(state);
  const told = tokoTold ? data.anchors.get(tokoTold) : null;
  const row = told ? board(state, data).rows.find(r => r.id === told.id) : null;
  const band = row?.shown.level === INFO.RANGE
    ? `${money(row.shown.lowSell)}–${money(row.shown.highSell)}` : '';
  return `<div class="encounter-layout ramen-layout">
    <section class="paper-panel scene-card">
      <div class="scene-viewport speaker-stage">
        ${art ? `<img class="scene-image" src="${esc(art)}" alt="Tokon Ramen, the counter">` : genericScene('toko_slomo_noodles')}
        <div class="scene-speaker toko-speaker" data-speaker="toko" data-asset="cast3d-toko-v01" aria-label="Toko Slomo behind the counter"></div>
        ${art ? `<img class="counter-foreground" src="${esc(art)}" alt="" aria-hidden="true">` : ''}
        <i class="scene-vignette"></i>
        <div class="scene-caption">
          <h2>TOKON RAMEN</h2>
          <p>VAASANKATU · TOKO SLOMO · ${esc(formatBlock(state, data.content))}</p>
        </div>
      </div>
    </section>
    <section class="paper-panel encounter-copy ramen-copy">
      <p class="section-label">TOKO, BEHIND THE COUNTER</p>
      <blockquote class="toko-line">“${esc(line)}”</blockquote>
      ${told && band
        ? `<blockquote class="toko-line toko-told">“${esc(told.label)}. They are paying ${esc(band)} for a pack, if you get there soon. That is all I heard.”</blockquote>`
        : told === null && tokoTold === '' ? '<blockquote class="toko-line toko-told">“Nothing new tonight. Eat.”</blockquote>' : ''}
      <p class="section-label">A BOWL AND WHAT HE HEARD · ${money(BOWL_EUR)}</p>
      <p>He tells you a price range for the best place to sell that you do not already know. A range, never a quote, and it ages like anything you saw yourself. One bowl a block: he has other customers.</p>
      <button class="paper-button" data-action="buy-bowl" ${blocked ? 'disabled' : ''}>${blocked === 'already-this-block' ? 'YOU HAVE EATEN THIS BLOCK' : blocked === 'cash' ? `A BOWL IS ${money(BOWL_EUR)}` : `BUY A BOWL · ${money(BOWL_EUR)}`}</button>
      <p class="section-label">UNDER THE COUNTER · EARLY WEAPONS</p>
      <div class="equipment-list">${tokoWeapons(data).map(id => {
        const equipment = data.equipment.get(id); const price = buyOf(data, id);
        return `<div class="equipment-chip">
          ${equipment?.asset_id ? `<img src="${assetUrl(data, equipment.asset_id)}" alt="">` : '<span aria-hidden="true">◇</span>'}
          <span>${esc(cap(id))}<br><span class="dim">${esc(equipment?.hold ?? '')}</span></span>
          <button class="paper-button" data-action="buy-toko-weapon" data-equipment="${esc(id)}" ${state.cash >= price ? '' : 'disabled'}>BUY · ${money(price)}</button>
        </div>`;
      }).join('')}</div>
      <p class="consequence-strip">Toko sells a friend's weapons, nothing that goes bang. The first handgun, the fence and the rest of the gear are the street seller's, on Piritori.</p>
      <button class="paper-button primary" data-action="leave-shop">BACK TO THE STREET</button>
    </section>
  </div>`;
}

/** The Piritori street seller (GDD §10.2: first stock, cheap recruits, the
 *  first weapon gate): the gear shop and the fence, with a face now. */
function renderStreet() {
  if (!canShopHere(state)) { state.mode = 'route'; return renderRoute(); }
  const art = assetUrl(data, 'scene-piritori-square-v01');
  return `<div class="encounter-layout ramen-layout street-layout">
    <section class="paper-panel scene-card">
      <div class="scene-viewport">
        ${art ? `<img class="scene-image" src="${esc(art)}" alt="Piritori square at night">` : genericScene('piritori_first_buy')}
        <i class="scene-vignette"></i>
        <div class="scene-caption">
          <h2>THE STREET SELLER</h2>
          <p>PIRITORI · VAASANPUISTIKKO · ${esc(formatBlock(state, data.content))}</p>
        </div>
      </div>
    </section>
    <section class="paper-panel encounter-copy ramen-copy">
      <p class="section-label">UNDER THE COAT · GEAR</p>
      ${renderShop()}
      <p class="section-label">WHAT YOU CARRY · HE BUYS</p>
      <div class="equipment-list">${state.equipment.map((item, index) => renderEquipment(item, index)).join('')}</div>
      <p class="consequence-strip">He pays best for the best condition and worst for broken. Loot turns into money here, never the other way.</p>
      <button class="paper-button primary" data-action="leave-shop">BACK TO THE STREET</button>
    </section>
  </div>`;
}

/** Effects in words, for briefings and the case (never a rule of its own). */
function effectWords(effects) {
  const out = [];
  for (const fx of effects ?? []) {
    let m;
    if ((m = fx.match(/^cash:([+-]\d+)$/))) out.push(`${m[1].startsWith('-') ? '−' : '+'}€${Math.abs(Number(m[1]))}`);
    else if ((m = fx.match(/^exit-fund:([+-]\d+)$/))) out.push(`+€${Math.abs(Number(m[1]))} to the exit fund`);
    else if ((m = fx.match(/^intel:([+-]\d+)$/))) out.push(`intel ${m[1]}`);
    else if ((m = fx.match(/^stock:([^:]+):([+-]\d+)$/))) out.push(`${m[2].replace('+', '+')} pack${Math.abs(Number(m[2])) === 1 ? '' : 's'}`);
    else if ((m = fx.match(/^relationship:([^:]+):([+-]\d+)$/))) out.push(`${cap(m[1].replaceAll('_', ' '))} ${m[2]}`);
    else if ((m = fx.match(/^obligation:([^:]+):([+-]\d+)$/))) out.push(`owes ${cap(m[1].replaceAll('_', ' '))}`);
    else if ((m = fx.match(/^pressure:([^:]+):([+-]\d+)$/))) out.push(`${cap(data.anchors.get(m[1])?.label ?? m[1])} heat ${m[2]}`);
    else if (fx.startsWith('reveal:offer-')) out.push('a price revealed');
    else if (fx.startsWith('crew-outcome:')) out.push(fx.includes('critical') ? 'a critical wound possible' : 'a wound possible');
    else if (fx.startsWith('service:')) out.push('a contact closed for a day');
    else if (fx.startsWith('debt-holder-memory:')) out.push('the debt holder remembers');
    else if (fx.startsWith('flag:') && /pattern/.test(fx)) out.push(fx.includes('incomplete') ? 'half the pattern' : 'the van pattern');
    else if (fx.endsWith(':advantage')) out.push('a rival gains ground');
  }
  return out.join(' · ') || '—';
}

/** THE MISSIONS (G7): each authored mission as a briefing, not a status word. */
function renderMissions() {
  // Briefed as soon as its opening scene is the next thing to do, or it was
  // revealed, or that scene has been played.
  const nextEnc = currentSchedule(state, data.content)?.encounter_id;
  const status = id => {
    const m = data.missions.get(id);
    if (state.missionStatus[id]) return state.missionStatus[id];
    const told = state.revealedMissions.includes(id) || m?.signal_encounter_id === nextEnc || Boolean(state.choices[m?.signal_encounter_id]);
    return told ? 'open' : 'not yet';
  };
  const statusWord = { complete: 'DONE', partial: 'PARTLY', fail: 'LOST', open: 'OPEN', 'not yet': 'NOT YET' };
  return `<section class="paper-panel missions-panel">
    <p class="section-label">MISSIONS · ${esc(story.thread?.title?.toUpperCase() ?? 'ACT I')}</p>
    <h2 class="section-title">WHAT THE WEEK ASKS</h2>
    <div class="mission-list">${data.content.missions.map(m => {
      const b = briefing(data, story, m.id); if (!b) return '';
      const st = status(m.id); const open = st !== 'not yet';
      return `<article class="mission-card" data-mission="${esc(m.id)}" data-status="${esc(st)}">
        <header><h3>${esc(b.title)}</h3><span class="mission-state ${esc(st.replace(' ', '-'))}">${statusWord[st] ?? esc(st)}</span></header>
        <p class="mission-meta">${esc(cap(b.family))} · by day ${b.deadline?.day ?? '?'} ${esc(b.deadline?.block ?? '')}${b.battleId ? ` · can become a fight${b.avoidable ? ' (a way round exists)' : ' (no way round)'}` : ''}</p>
        ${open ? `<p>${esc(b.premise)}</p>
        <ol class="mission-steps">${b.steps.map(step => `<li><b>${esc(step.verb)}</b> <span class="dim">${esc(data.anchors.get(step.anchor)?.label ?? step.anchor)}</span>${step.alternatives?.length ? `<br><span class="dim">or ${esc(step.alternatives[0])}</span>` : ''}</li>`).join('')}</ol>
        <dl class="mission-stakes">
          <div><dt>CLEAN</dt><dd>${esc(effectWords(b.success))}</dd></div>
          <div><dt>PARTLY</dt><dd>${esc(effectWords(b.partial))}</dd></div>
          <div><dt>LOST</dt><dd>${esc(effectWords(b.failure))}</dd></div>
        </dl>
        ${b.plants ? `<p class="mission-plant">${esc(b.plants)}</p>` : ''}`
        : '<p class="dim">Someone has not told you about this yet.</p>'}
      </article>`;
    }).join('')}</div>
  </section>`;
}

/** THE CASE BOARD (G7): every clue the week can give, found or not. */
function renderCaseBoard() {
  if (!story.case) return '';
  const board = caseBoard(state, story);
  const found = board.filter(c => c.isFound).length;
  const keys = keyCluesFound(state, story); const need = story.case.unlock?.key_clues ?? 0;
  const resolved = state.choices[story.case.id];
  const choice = resolved ? story.case.choices.find(c => c.id === resolved) : null;
  return `<section class="paper-panel case-board">
    <p class="section-label">CASE BOARD · ${found}/${board.length}</p>
    <h2 class="section-title">${esc(story.thread.title.toUpperCase())}</h2>
    <p class="dim">${esc(story.thread.premise)}</p>
    <ul class="clue-list">${board.map(c => `<li class="clue ${c.isFound ? 'found' : 'missing'}${c.key ? ' key' : ''}">
      <b>${c.isFound ? esc(c.title) : '?'}</b>${c.key ? ' <span class="clue-key">KEY</span>' : ''}<br>
      <span>${esc(c.isFound ? c.found : c.hint)}</span></li>`).join('')}</ul>
    <p class="consequence-strip">${resolved
      ? `Settled: ${esc(choice?.label ?? resolved)}.`
      : keys >= need ? `Enough to act. ${esc(story.case.title)} is waiting at ${esc(data.anchors.get(story.case.anchor_id)?.label)}.`
        : `${keys} of ${need} key clues. The week has more to show you.`}</p>
  </section>`;
}

/** THE CASE (G6): the Thursday Tram, answered once, at Piritori. */
function renderCase() {
  const c = story.case;
  if (!c) { state.mode = 'route'; return renderRoute(); }
  const resolved = state.choices[c.id];
  if (!resolved && caseBlocker(state, story)) { state.mode = 'route'; return renderRoute(); }
  const art = assetUrl(data, c.scene_asset_id);
  const choice = resolved ? c.choices.find(ch => ch.id === resolved) : null;
  return `<div class="encounter-layout case-layout">
    <section class="paper-panel scene-card">
      <div class="scene-viewport">
        ${art ? `<img class="scene-image" src="${esc(art)}" alt="Piritori on a Thursday night">` : genericScene('piritori_first_buy')}
        <i class="scene-vignette"></i>
        <div class="scene-caption"><h2>${esc(c.title.toUpperCase())}</h2><p>CAR 41 → PIRITORI · ${esc(formatBlock(state, data.content))}</p></div>
      </div>
    </section>
    <section class="paper-panel encounter-copy">
      <p class="section-label">CASE · ${esc(story.thread.title.toUpperCase())}</p>
      <h2 class="section-title">${esc(c.title)}</h2>
      <p class="encounter-opening">${esc(c.opening)}</p>
      ${choice
        ? `<div class="outcome-card"><h3>${esc(choice.label)}</h3><p>${esc(choice.detail)}</p>
            <div class="consequence-strip">${esc(effectWords(choice.effects))}</div>
            <button class="paper-button primary" data-action="leave-case">BACK TO THE STREET</button></div>`
        : `<div class="choice-list">${c.choices.map(ch => `<button class="choice-card" type="button" data-action="case-choose" data-choice="${esc(ch.id)}">
            <strong>${esc(ch.label)}</strong><span>${esc(ch.detail)}</span><small class="road-time">${esc(effectWords(ch.effects))}</small></button>`).join('')}</div>
          <button class="paper-button" data-action="leave-case">NOT YET · BACK TO THE STREET</button>`}
    </section>
  </div>`;
}

/** The story clock: advance the block, then settle anything the night owes
 *  (Kello's cut). A found-out cut becomes a road event waiting on the map. */
function advanceAndSettle() {
  const ended = currentSchedule(state, data.content);
  advanceSchedule(state, data);
  if (ended?.block !== 'night') return;
  const cut = settleCut(state, story);
  if (cut.paid) logToast(`Kello's cut: €${cut.paid}.`);
  if (cut.foundOut && forceRoad(state, roadEvents, story.case.cut.found_out_event, state.selectedAnchor)) state.mode = 'road';
}

function renderShop() {
  if (!canShopHere(state)) {
    return '<p class="consequence-strip">Not here. Gear is bought from the street seller on Piritori.</p>';
  }
  const market = [...data.equipment.values()].filter(e => isPurchasable(data, e.id) && buyOf(data, e.id) > 0);
  if (market.length === 0) {
    return '<p class="consequence-strip">Nothing on offer right now.</p>';
  }
  return `<div class="equipment-list">${market.map(equipment => {
    const price = buyOf(data, equipment.id);
    const affordable = state.cash >= price;
    const artId = equipment.asset_id;
    return `<div class="equipment-chip">
      ${artId ? `<img src="${assetUrl(data, artId)}" alt="">` : '<span aria-hidden="true">◇</span>'}
      <span>${esc(cap(equipment.id))}<br><span class="dim">${esc(equipment.hold ?? equipment.kind ?? '')}</span></span>
      <button class="paper-button" data-action="buy-equipment" data-equipment="${esc(equipment.id)}" ${affordable ? '' : 'disabled'}>BUY · ${money(price)}</button>
    </div>`;
  }).join('')}</div>
  <p class="consequence-strip">Taken-only gear never appears here. Money buys volume; loot buys capability.</p>`;
}

function renderEquipment(item, index) {
  const equipment = data.equipment.get(item.id);
  const artId = equipment?.asset_id;
  const canFence = canFenceHere(state);
  const takenOnly = Boolean(equipment) && !isPurchasable(data, item.id);
  return `<div class="equipment-chip">
    ${artId ? `<img src="${assetUrl(data, artId)}" alt="">` : '<span aria-hidden="true">◇</span>'}
    <span>${esc(cap(item.id))}<br><span class="dim">${esc(conditionWord(item.cond))}${equipment?.hold ? ` · ${esc(equipment.hold)}` : ''}${takenOnly ? ' · taken only' : ''}</span></span>
    ${canFence
      ? `<button class="paper-button" data-action="sell-loot" data-equipment="${esc(item.id)}">FENCE · ${money(resaleAt(state, data, index))}</button>`
      : ''}
    ${canFence && takenOnly ? '<p class="dim fence-unbuyable">You will not be able to buy another one. Not at any price.</p>' : ''}
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

/** Attack-mode board read (COMBAT.md §9.13 / Godot purple-tile parity):
 *  which enemies the selected fighter can actually reach, and which of those
 *  would pull free sync fire. Built once per render so every token agrees. */
function attackPreview(battle) {
  const attacker = selectedUnit(battle);
  if (battle.action !== 'attack' || !attacker?.alive) {
    return { reachableIds: new Set(), syncTargetIds: new Set(), syncAllyIds: new Set() };
  }
  const reachable = attackTargets(battle, attacker);
  const syncTargetIds = new Set();
  const syncAllyIds = new Set();
  for (const target of reachable) {
    const allies = syncAlliesFor(battle, attacker, target);
    if (allies.length) {
      syncTargetIds.add(target.id);
      for (const ally of allies) syncAllyIds.add(ally.id);
    }
  }
  return {
    reachableIds: new Set(reachable.map(u => u.id)),
    syncTargetIds,
    syncAllyIds,
  };
}

function renderUnit(unit, battle, preview = null) {
  const pos = cellPosition(unit.cell);
  const selected = unit.id === battle.selectedId && unit.side === 'player';
  const prev = preview ?? attackPreview(battle);
  // Police (COMBAT.md §9.5) are a third side: on the board, never anybody's
  // enemy yet — see attackTargets() in battle.js — so they are never a
  // valid attack target regardless of the current action.
  const targetable = unit.side === 'enemy' && prev.reachableIds.has(unit.id);
  const syncChain = targetable && prev.syncTargetIds.has(unit.id);
  const syncSolo = targetable && !syncChain;
  const syncReady = unit.side === 'player' && prev.syncAllyIds.has(unit.id);
  const classes = [
    'unit-token',
    unit.side === 'enemy' ? 'enemy' : '',
    unit.side === 'police' ? 'police' : '',
    selected ? 'selected' : '',
    // Keep `.intent` for any reachable enemy (existing CSS); add sync tint.
    targetable ? 'intent' : '',
    syncChain ? 'sync-chain' : '',
    syncSolo ? 'sync-solo' : '',
    syncReady ? 'sync-ready' : '',
    unit.alive ? '' : 'down',
  ].filter(Boolean).join(' ');
  const disabled = unit.side === 'player'
    ? battle.acted.includes(unit.id) || battle.phase !== 'player'
    : !targetable;
  const syncHint = syncChain
    ? ', sync chain'
    : syncSolo
      ? ', solo shot'
      : syncReady
        ? ', would sync'
        : '';
  return `<button type="button" class="${classes}"
    style="left:${pos.x}%;top:${pos.y}%" data-action="${unit.side === 'player' ? 'select-unit' : 'target-unit'}" data-unit="${esc(unit.id)}"
    aria-label="${esc(unit.name)}, ${unit.role}, condition ${unit.hp}, guard ${unit.guard}${syncHint}" ${disabled ? 'disabled' : ''}>
    <span class="unit-body">
      <img class="legs" src="${assetUrl(data, unit.legs)}" alt="">
      <img class="torso" src="${assetUrl(data, unit.torso)}" alt="">
      <img class="head" src="${assetUrl(data, unit.head)}" alt="">
    </span>
    <span class="unit-label">${esc(unit.name.split(' ')[0])}<br><b>${unit.hp}♥ · ${unit.guard}◇ · ${unit.nerve}!</b></span>
  </button>`;
}

function renderSyncForecast(battle, preview) {
  if (battle.action !== 'attack' || !preview.reachableIds.size) return '';
  const attacker = selectedUnit(battle);
  const lines = [];
  const coverLines = [];
  for (const enemy of battle.enemies) {
    if (!preview.reachableIds.has(enemy.id)) continue;
    const allies = syncAlliesFor(battle, attacker, enemy);
    if (allies.length) {
      lines.push(`${enemy.name.split(' ')[0]} — sync with ${allies.map(a => a.name.split(' ')[0]).join(', ')}`);
    } else {
      lines.push(`${enemy.name.split(' ')[0]} — solo`);
    }
    const verdict = coverAttackLine(battle, attacker, enemy);
    if (verdict) {
      let key = 'cover_intercepts';
      if (verdict.startsWith('Blocked')) key = 'cover_blocks';
      else if (verdict.startsWith('This weapon')) key = 'cover_pierced';
      coverLines.push(`${enemy.name.split(' ')[0]} — ${tr(key)}`);
    }
  }
  const parts = [];
  if (lines.length) {
    parts.push(`<p class="sync-forecast section-label">SYNC READ<br>${lines.map(esc).join('<br>')}</p>`);
  }
  if (coverLines.length) {
    parts.push(`<p class="cover-forecast section-label">COVER READ<br>${coverLines.map(esc).join('<br>')}</p>`);
  }
  return parts.join('');
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
            ${availableVisits(state, data).map(v => `<button class="paper-button" data-action="open-visit" data-visit="${esc(v.id)}">VISIT · ${esc(v.participants.includes('jaska') ? 'Jaska' : 'Toko')}</button>`).join('')}
        <button class="paper-button danger" data-action="police-posture" data-posture="${POLICE_POSTURE.BACK_OFF}">${tr('police_back_off')}</button>
        <button class="paper-button primary" data-action="police-posture" data-posture="${POLICE_POSTURE.HELP_FRIENDS}">${tr('police_help')}</button>
      </div>
    </div>`;
}

/** Owner 2026-09-06: stage3d dioramas parked. Battles that authored a
 *  mesh-3d as `scene_asset_id` (Hermanni training, Kattilahalli) have no
 *  usable <img> — map them to the nearest Era I 2D plate until real plates
 *  or better dioramas exist. */
const PARKED_ARENA_PLATE = {
  'stage3d-hermanni-skatepark-v01': 'scene-harju-pitch-v01',
  'stage3d-suvilahti-kattilahalli-v01': 'scene-kallio-service-yard-v01',
  'stage3d-kallio-backyard-v01': 'scene-kallio-backyard-v01',
};
function plateForBattleScene(id) {
  return PARKED_ARENA_PLATE[id] || id;
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
  const scene = assetUrl(data, plateForBattleScene(battle.sceneAssetId));
  const negotiationReady = battle.round >= 2 || battle.enemies.filter(item => item.alive).reduce((sum, item) => sum + item.nerve, 0) <= 4;
  const preview = attackPreview(battle);
  const boardUnits = battle.players.concat(battle.enemies, battle.police ?? []);
  return `
    <div class="battle-layout">
      <section class="battle-stage" aria-label="${esc(battle.format)} isometric formation battle">
        <img class="scene-image" src="${scene}" alt="">
        <img class="weather-layer front" src="${assetUrl(data, 'weather-rain-fine-v01')}" alt="">
        <div class="stage3d-mount" id="stage3dMount" aria-hidden="true"></div>
        <p class="battle-objective"><b>${tr('objective')} · ${esc(battle.format)}</b><br>${esc(battle.objective)}</p>
        ${battle.entryForecast ? `<div class="consequence-strip battle-entry-forecast" role="note">${esc(battle.entryForecast)}</div>` : ''}
        ${rowLabel('BACK', depthOf(ROWS - 1, true))}
        ${rowLabel('FRONT', depthOf(0, true))}
        ${rowLabel('FRONT', depthOf(0, false))}
        ${rowLabel('BACK', depthOf(ROWS - 1, false))}
        ${renderFormationCells(battle)}
        ${boardUnits.map(item => renderUnit(item, battle, preview)).join('')}
      </section>
      <section class="battle-console">
        <div class="paper-panel active-unit">
          <p class="section-label">ROUND ${battle.round} · ${esc(battle.phase.toUpperCase())}</p>
          <h3>${esc(unit?.name ?? 'NO ACTIVE UNIT')}</h3>
          <p>${esc(unit ? `${cap(unit.role)} · ${cap(unit.equipment)}` : 'Choose a standing crew member.')}</p>
          ${(() => {
            if (!unit) return '';
            const line = coverStandingLine(battle, unit);
            if (!line) return '';
            const prop = line.replace(/^behind the /i, '');
            const templ = tr('in_cover');
            const shown = templ.includes('%s') ? templ.replace('%s', prop) : line;
            return `<p class="cover-standing">${esc(shown)}</p>`;
          })()}
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
            ${renderSyncForecast(battle, preview)}
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
          <div class="scene-speaker arvo-speaker" data-speaker="arvo" data-asset="presenter-arvo-linde-v05" aria-label="Arvo Linde"></div><div class="arvo arvo-fallback" aria-hidden="true"><i class="body"></i><i class="shirt"></i><i class="tie"></i><i class="head"></i><i class="hair"></i><i class="face-line"></i></div>
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

/** H1/H8: chapter 1 ends on the chapter turn, not on Pasila. The four
 *  endings are the era's result; until chapter 4 exists this screen shows
 *  where the road points, and what crosses into chapter 2. */
function renderChapterClose() {
  const def = data.content.chapters?.find(item => item.index === state.chapter);
  const outcome = state.lastEndingOutcome || (state.chapterCleared ? '' : 'missed');
  const words = { clean: 'The shipment got away clean.', messy: 'The shipment got away, and something was left behind.', lost: 'The shipment got away. Somebody did not come back.', missed: 'The boat left without Aatami on it.' };
  const forecast = forecastEnding(state, data);
  return `<section class="paper-panel chapter-close">
    <p class="section-label">CHAPTER ${state.chapter} CLOSES${def?.label ? ` / ${esc(def.label.toUpperCase())}` : ''}</p>
    <h2 class="section-title">TO BE CONTINUED</h2>
    <p>${esc(words[outcome] ?? '')}</p>
    ${renderChapterTurn()}
    ${forecast ? `<div class="pasila-forecast"><p class="section-label">WHERE THIS ROAD POINTS · ERA I</p><h3>${esc(forecast.label)}</h3><p>${esc(forecast.summary)}</p></div>` : ''}
    <div class="ledger-summary">
      <div><span class="dim">EXIT FUND</span><b>${money(state.exitFund)}</b></div>
      <div><span class="dim">DEBT</span><b>${money(state.debt)}</b></div>
      <div><span class="dim">CREW</span><b>${state.recruited.length}</b></div>
      <div><span class="dim">JASKA</span><b>${state.relationships.jaska ?? 0}</b></div>
    </div>
    <button class="paper-button" data-action="reset-campaign">START A NEW TEN DAYS</button>
  </section>`;
}

function renderCampaignEnd() {
  const ending = data.content.endings.find(item => item.id === state.endingId);
  if (!ending) return renderChapterClose();
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
    <button class="paper-button" data-action="reset-campaign">START A NEW TEN DAYS</button>
  </section>`;
}

function openEncounter() {
  const slot = currentSchedule(state, data.content);
  // The story encounter happens where it happens: from anywhere else, no
  // choice and no quote (M1). Guarded here, not only by hiding a button.
  if (slot && !presentAtLead()) {
    logToast(`${data.anchors.get(slot.anchor_id)?.label ?? 'The lead'} is the lead — travel there first.`);
    render(); return;
  }
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
    if (!state.battle.training) recordFight(state, data.content);
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
    if (battle.door) applyEffects(state, doorFightEffects(doors, battle.door, battle.result), data, `door:${battle.door}:${battle.result}`);
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
  // A road fight has no mission behind it and does not turn the block.
  if (!battle.training && !battle.road) advanceAndSettle();
  state.mode = 'route';
}

function handleRootClick(event) {
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const action = target.dataset.action;
  if (action === 'open-visit') {
    if (openVisit(state, data, target.dataset.visit)) { observation = ''; persist(); render(); }
  } else if (action === 'leave-visit') {
    leaveVisit(state); persist(); render();
  } else if (action === 'select-anchor') {
    const id = target.dataset.anchor;
    if (!data.anchors.has(id)) return;
    // Looking only: no presence, no price, no save (M1). A journey (M2) is the
    // one deliberate move.
    inspectAnchor(id);
    if (routePlanning) {
      const anchor = data.anchors.get(id);
      if (['locked', 'teaser'].includes(anchor?.sliceState)) {
        logToast(`${anchor.label} is visible but sealed in this slice.`);
      } else if (routeDraft.length >= 2) routeDraft = [id];
      else if (!routeDraft.includes(id)) routeDraft.push(id);
    }
    render();
  } else if (action === 'plan-journey') {
    const id = target.dataset.anchor;
    inspectAnchor(id);
    journeyDraft = { owner: state, preview: previewJourney(state, data, id) };
    render();
  } else if (action === 'cancel-journey') {
    journeyDraft = null;
    render();
  } else if (action === 'commit-journey') {
    commitPlannedJourney();
  } else if (action === 'go-lead') {
    const lead = storyLeadId();
    state.mode = 'route';
    if (lead) inspectAnchor(lead);
    persist(); render();
  } else if (action === 'show-lead') {
    const lead = storyLeadId();
    if (lead) inspectAnchor(lead);
    render();
  } else if (action === 'next-step') {
    // The pinned bar only ROUTES to the ordinary actions; it never has rules
    // of its own. A stale step (the state moved under it) does nothing.
    const slot = currentSchedule(state, data.content);
    const next = nextStep(slot);
    if (!next || next.step !== target.dataset.step) { render(); return; }
    if (next.step === 'enter') openEncounter();
    else if (next.step === 'doors') {
      state.mode = 'route'; render();
      document.querySelector('.door-board')?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
    }
    else if (next.step === 'plan') {
      inspectAnchor(slot.anchor_id);
      journeyDraft = { owner: state, preview: previewJourney(state, data, slot.anchor_id) };
      render();
    } else if (next.step === 'commit') {
      commitPlannedJourney();
    }
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
    if (state.mode === 'encounter' && !presentAtLead()) { render(); return; }
    const encounter = (state.mode === 'visit' ? activeVisit(state, data) : currentEncounter(state, data));
    const item = encounter.inspectables[Number(target.dataset.index)];
    observation = inspectionCopy(item);
    render();
  } else if (action === 'choose') {
    if (state.mode === 'encounter' && !presentAtLead() && state.battle?.status !== 'active') {
      logToast('Not from here — the choice is at the story lead.'); render(); return;
    }
    const encounter = (state.mode === 'visit' ? activeVisit(state, data) : currentEncounter(state, data));
    const choice = encounter.choices.find(item => item.id === target.dataset.choice);
    const result = state.mode === 'visit' ? chooseVisit(state, data, target.dataset.choice) : chooseEncounter(state, encounter, choice, data);
    if (!result.ok) logToast(result.reason);
    else if (result.startBattle && startBattle(result.startBattle) && encounter.door) {
      // A door fight has no mission behind it: its stakes are the door's own.
      state.battle.missionId = null;
      state.battle.door = encounter.door;
    } else if (!result.startBattle && encounter.door) {
      // Answer 25: a bad deal can turn into a fight.
      const bad = escalation(state, data, doors, encounter.door, choice.id);
      if (bad?.battle && startBattle(bad.battle)) {
        state.battle.missionId = null;
        state.battle.door = encounter.door;
        state.lastOutcome = [...(state.lastOutcome ?? []), 'The deal goes bad. It is a fight now.'];
      } else if (bad?.effects) {
        applyEffects(state, bad.effects, data, `door:${encounter.door}:alone`);
        state.lastOutcome = ['The deal goes bad, and nobody was standing with Aatami.', ...(state.lastOutcome ?? [])];
      }
    }
    persist(); render();
  } else if (action === 'take-door') {
    const result = takeDoor(state, data, doors, target.dataset.door, roadEvents);
    if (!result.ok) { logToast(result.reason === 'closed' ? 'That door closed at 22:00.' : result.reason); render(); return; }
    inspectAnchor(result.offer.anchor);
    logToast(`${result.encounter.title}: travel to ${data.anchors.get(result.offer.anchor)?.label} to do it.`);
    persist(); render();
  } else if (action === 'road-choose') {
    const result = resolveRoad(state, data, roadEvents, target.dataset.choice);
    if (!result.ok) { logToast(result.reason); render(); return; }
    if (result.startBattle && startBattle(result.startBattle)) {
      state.battle.missionId = null;
      state.battle.road = result.event.id;
    }
    persist(); render();
  } else if (action === 'road-continue') {
    state.mode = 'route'; state.lastOutcome = null;
    if (state.road) state.road.last = null;
    persist(); render();
  } else if (action === 'advance') {
    advanceAndSettle(); persist(); render();
  } else if (action === 'show-battle') {
    state.mode = 'battle'; persist(); render();
  } else if (action === 'trade') {
    const offer = data.offers.get(target.dataset.offer);
    // MARKET.md §5/§8: you trade where you stand; the ledger records.
    if (!offer || offer.anchor_id !== state.selectedAnchor) {
      logToast(`Trade at ${data.anchors.get(offer?.anchor_id)?.label ?? 'that place'} happens there.`); render(); return;
    }
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
  } else if (action === 'open-shop') {
    if (!canShopHere(state)) { render(); return; }
    state.mode = 'shop'; persist(); render();
  } else if (action === 'leave-shop') {
    state.mode = 'route'; persist(); render();
  } else if (action === 'open-case') {
    if (caseBlocker(state, story)) { render(); return; }
    state.mode = 'case'; persist(); render();
  } else if (action === 'case-choose') {
    const result = resolveCase(state, data, story, target.dataset.choice);
    if (!result.ok) logToast(result.reason);
    persist(); render();
  } else if (action === 'leave-case') {
    state.mode = 'route'; persist(); render();
  } else if (action === 'open-ramen') {
    if (state.selectedAnchor !== TOKO_ANCHOR) { render(); return; }
    state.mode = 'ramen'; persist(); render();
  } else if (action === 'buy-toko-weapon') {
    const result = buyFromToko(state, data, target.dataset.equipment);
    logToast(result.ok ? `Bought from Toko for ${money(result.paid)}.` : ({ cash: 'Not enough cash.', 'not-here': 'Toko is on Vaasankatu.' }[result.reason] ?? 'He does not sell that.'));
    persist(); render();
  } else if (action === 'buy-bowl') {
    const result = buyBowl(state, data);
    if (!result.ok) logToast({ 'already-this-block': 'One bowl a block. He has other customers.', cash: `A bowl is ${money(BOWL_EUR)}.`, 'not-here': 'Toko is on Vaasankatu.' }[result.reason] ?? result.reason);
    else logToast(result.anchorId ? `Toko on ${data.anchors.get(result.anchorId)?.label}: a price range, on the board.` : 'Toko has nothing new tonight. The broth is good.');
    tokoTold = result.ok ? (result.anchorId ?? '') : tokoTold;
    persist(); render();
  } else if (action === 'buy-equipment') {
    const result = buyEquipment(state, data, target.dataset.equipment);
    logToast(result.ok ? `Bought for ${money(result.paid)}.` : 'Cannot buy — wrong place, taken-only, or short on cash.');
    persist(); render();
  } else if (action === 'attempt-chapter-ending') {
    const reason = attemptChapterEnding(state, data);
    if (reason) logToast({ 'not-available': 'Not ready yet.', 'cannot-afford': 'Not enough cash for the stake.', 'wrong-place': 'Wrong place for this.' }[reason] ?? reason);
    persist(); render();
  } else if (action === 'hire-from-pool') {
    const ok = hireFromPool(state, data, target.dataset.candidate);
    logToast(ok ? 'Hired on.' : 'Cannot hire — not enough cash, or already on the roster.');
    persist(); render();
  } else if (action === 'spend-perk') {
    const ok = spendPerk(state, data, target.dataset.crew, target.dataset.perk);
    logToast(ok ? 'Point spent.' : 'Cannot spend that point.');
    persist(); render();
  } else if (action === 'learn-skill') {
    const crewId = target.dataset.crew;
    const skillId = target.dataset.skill;
    if (learnSkill(state, data, crewId, skillId)) {
      spendPerkPointOnSkill(state, crewId);
      logToast(`Learned ${skillLabel(skillId)}.`);
    } else {
      logToast('Cannot learn that.');
    }
    persist(); render();
  } else if (action === 'train-crew') {
    const ok = train(state, data, target.dataset.crew);
    logToast(ok ? 'A veteran starts them ahead.' : 'Cannot train — no veteran, already trained, or named.');
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
  resetInspection();
  persist();
  render();
}

async function boot() {
  try {
    bootChrome(); // the same torn-carton material as godot/ui/chrome.gd — before first render, or the flat CSS fallback flashes
    data = await loadGameData();
    roadEvents = await loadRoadEvents().catch(() => roadEvents);
    story = await loadStory().catch(() => story);
    doors = await loadDoors().catch(() => doors);
    const hasSave = Boolean(localStorage.getItem(SAVE_KEY));
    state = loadState(data.content);
    registerTaken(state, data, doors); // a taken door is the block's encounter; put it back
    attachGrowth(state.battle, state, data); // a saved fight comes back without its live campaign link
    $('resumeButton').hidden = !hasSave;
    $('beginButton').addEventListener('click', () => {
      wakeSound();
      if (hasSave) state = createState(data.content);
      resetInspection();
      persist();
      $('splash').hidden = true;
      render();
      // The arrival (owner, answer 8): a new run opens on the tram pulling in.
      // A deep link or a gate asks for `?skip`, the house convention.
      if (new URLSearchParams(location.search).has('skip')) $('modeRoot').focus();
      else playOpening().then(() => $('modeRoot').focus());
    });
    $('resumeButton').addEventListener('click', () => {
      wakeSound();
      resetInspection();
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
      resetInspection();
      if (target.kind === 'encounter') {
        // Walk the schedule to the block this encounter belongs to, so the
        // screen arrives with the state around it rather than out of context —
        // a conversation with the wrong day on the clock is not the screen.
        const index = data.content.schedule.findIndex(slot => slot.encounter_id === target.id);
        if (index >= 0) state.scheduleIndex = index;
        // A jump is a fixture: it arrives AT the encounter, as a player would
        // have by travelling (M2 no longer moves Aatami with the schedule).
        if (index >= 0) state.selectedAnchor = data.content.schedule[index].anchor_id;
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
        if (index >= 0) state.selectedAnchor = data.content.schedule[index].anchor_id;
        state.mode = 'route';
      }
      persist();
      render();
      $('modeRoot').focus();
    }

    // You are STANDING at the opening anchor, and at whatever each scheduled
    // block puts you in front of. Without seeding those the board opens
    // completely blank, which reads as broken rather than as unearned.
    // M2: knowledge is an OBSERVATION. A fresh campaign starts standing at
    // Piritori, so that one place is known; everything else is learned by
    // being there (an encounter, a journey, a trade). This used to stamp every
    // past lead on every boot — back to the block it was scheduled in, which
    // aged a place you had revisited and quoted leads Aatami never reached.
    // Old saves keep every observation they stored (restoreState spreads raw).
    if (state.seen?.[state.selectedAnchor] == null) markSeen(state, state.selectedAnchor);

    const pause = createPauseMenu({
      root: $('pause'),
      version: 'v4.65',
      jump: jumpTo,
      sound: { get: soundOn, set: setSound },
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

    // ?battle=<id> — the same debug entry Godot has had since Phase 0
    // (godot/autoload/debug_entry.gd), ported per DESIGN_AUTHORITY.md's
    // parity addendum: anything Godot already has flows Godot -> web. The
    // console hook below (__ptv3.debug.startBattle) already existed, but a
    // phone has no console, and CLAUDE.md rule 6 is explicit that reaching a
    // battle must never require one. Written for exactly the test that
    // needs it first: opening render3d on the owner's PowerVR Pixel 10,
    // where Godot's own 3D is a known driver black-screen (upstream
    // godotengine/godot#121005) and the open question is whether three.js
    // takes a different-enough driver path to survive.
    const wantBattle = new URLSearchParams(location.search).get('battle');
    if (wantBattle) {
      if (!data.battles.get(wantBattle)) {
        logToast(`unknown battle id '${wantBattle}'`);
      } else {
        // A fresh state has NOBODY recruited or deployed (deployedCrew()
        // returns [] on day one), so a bare startBattle() throws its
        // "requires N deployed crew" and silently stays on the route map —
        // exactly what happened on this handler's first test run. Field the
        // slice's crew slots the same way v3-playthrough.cjs does. Not
        // persisted: a debug jump must not overwrite a real save
        // (debug_entry.gd makes the same choice).
        state = createState(data.content);
        const need = data.battles.get(wantBattle).player_deployed;
        const slots = data.content.crew.map(c => c.id).slice(0, need);
        state.recruited = slots;
        state.deployed = slots;
        for (const id of slots) state.crewStatus[id].status = 'available';
        $('splash').hidden = true;
        if (startBattle(wantBattle)) render();
      }
    }

    window.__ptv3 = {
      get data() { return data; },
      get state() { return state; },
      get road() { return roadEvents; },
      get story() { return story; },
      get sound() { return soundState(); },
      debug: {
        setState(next) { state = next; registerTaken(state, data, doors); attachGrowth(state.battle, state, data); persist(); render(); },
        startBattle(id) { startBattle(id); persist(); render(); },
        setBattleLights,
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


