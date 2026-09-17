import { currentSchedule, commitRoute } from './state.js?v=6';
import { markSeen } from './board.js?v=2';
import { shortestPath } from './content.js?v=2';

const root = document.getElementById('modeRoot');
const SVG = 'http://www.w3.org/2000/svg';
let inspectionFocus = null;
let routePlanning = false;
let routeDraft = [];
let routeMessage = '';
let applying = false;
let queued = false;
let lastScheduleIndex = null;

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const cap = value => String(value ?? '').replaceAll('-', ' ').replaceAll('_', ' ').toUpperCase();

function game() { return window.__ptv3; }
function anchor(id) { return game()?.data?.anchors?.get(id) ?? null; }
function label(id) { return anchor(id)?.label ?? id ?? '—'; }
function sealed(id) { return ['locked', 'teaser'].includes(anchor(id)?.sliceState); }
function slot() { const g = game(); return g ? currentSchedule(g.state, g.data.content) : null; }
function inspectedId() {
  const g = game();
  if (!g) return null;
  return inspectionFocus && anchor(inspectionFocus) ? inspectionFocus : g.state.selectedAnchor;
}

function mapPath(ids) {
  return ids.map((id, index) => {
    const point = anchor(id)?.board;
    return point ? `${index ? 'L' : 'M'} ${point.x} ${point.y}` : '';
  }).join(' ');
}

function updatePreviewPath(path) {
  const svg = root.querySelector('.city-map');
  if (!svg) return;
  let preview = svg.querySelector('.m1-route-preview');
  if (path.length < 2) { preview?.remove(); return; }
  if (!preview) {
    preview = document.createElementNS(SVG, 'path');
    preview.setAttribute('class', 'map-route m1-route-preview');
    const firstAnchor = svg.querySelector('[data-anchor-group]');
    svg.insertBefore(preview, firstAnchor ?? null);
  }
  preview.setAttribute('d', mapPath(path));
}

function routePreview() {
  const g = game();
  if (!g || !routePlanning || routeDraft.length < 2) return [];
  return shortestPath(g.data.map, routeDraft[0], routeDraft[1]);
}

function orientationMarkup() {
  const g = game();
  const schedule = slot();
  if (!g || !schedule) return '';
  const present = g.state.selectedAnchor;
  const inspected = inspectedId();
  const inspectedAnchor = anchor(inspected);
  const lead = schedule.anchor_id;
  const destination = routeDraft.at(-1);
  const preview = routePreview();
  const roles = (inspectedAnchor?.roles ?? []).map(role => `<span class="tag">${esc(cap(role))}</span>`).join('');
  const routeCopy = routePlanning ? `
    <div class="m1-route-box">
      <p class="section-label">ROUTE PREVIEW</p>
      <p>${esc(label(present))} → ${destination && destination !== present ? esc(label(destination)) : 'choose a destination'}</p>
      ${preview.length > 1 ? `<div class="route-steps">${preview.map(id => `<span class="tag">${esc(label(id))}</span>`).join('')}</div>` : ''}
      <div class="route-actions">
        <button class="paper-button cyan" data-action="m1-route-commit" ${preview.length < 2 ? 'disabled' : ''}>PIN ROUTE</button>
        <button class="paper-button" data-action="m1-route-cancel">CLEAR</button>
      </div>
      ${routeMessage ? `<p class="dim">${esc(routeMessage)}</p>` : ''}
    </div>` : '';
  return `
    <p class="section-label">TODAY'S LEAD · M1</p>
    <h2>${esc(label(lead))}</h2>
    <div class="orientation-tags">
      <span class="tag present-tag">YOU ARE HERE · ${esc(label(present))}</span>
      <span class="tag active">INSPECTING · ${esc(label(inspected))}</span>
    </div>
    <p class="dim inspection-summary">${esc(cap(inspectedAnchor?.sliceState ?? 'public'))} AREA · inspection only</p>
    ${roles ? `<div class="route-steps inspection-roles">${roles}</div>` : ''}
    <div class="node-actions">
      <button class="paper-button cyan" data-action="m1-show-lead" ${inspected === lead ? 'disabled' : ''}>SHOW LEAD</button>
      ${inspected !== present && !sealed(inspected) ? `<button class="paper-button primary" data-action="m1-use-area" data-anchor="${esc(inspected)}">USE AREA · ${esc(label(inspected))}</button>` : ''}
    </div>
    <p class="dim location-rule">${sealed(inspected)
      ? 'Visible, but sealed in this slice. Inspection changes nothing.'
      : inspected === present
        ? 'Area access is active here. Looking elsewhere does not move Aatami.'
        : 'Inspection is free. USE AREA deliberately changes the active area; no travel block is spent in M1.'}</p>
    ${routeCopy}`;
}

function findAreaCard(side) {
  return [...side.querySelectorAll(':scope > section.paper-panel')]
    .find(section => !section.classList.contains('m1-orientation-card') && section.querySelector('[data-action="plan-route"]')) ?? null;
}

function apply() {
  if (applying) return;
  const g = game();
  if (!g || g.state.mode !== 'route' || !root.querySelector('.city-map')) return;
  applying = true;
  try {
    const schedule = slot();
    if (!schedule) return;
    if (lastScheduleIndex !== null && g.state.scheduleIndex !== lastScheduleIndex) {
      inspectionFocus = null;
      routePlanning = false;
      routeDraft = [];
      routeMessage = '';
    }
    lastScheduleIndex = g.state.scheduleIndex;
    const present = g.state.selectedAnchor;
    const inspected = inspectedId();

    for (const group of root.querySelectorAll('[data-anchor-group]')) {
      const id = group.dataset.anchorGroup;
      group.classList.toggle('selected', id === inspected);
      group.classList.toggle('present', id === present);
      const oldRing = group.querySelector('.map-presence-ring');
      if (id !== present) oldRing?.remove();
      else if (!oldRing) {
        const dot = group.querySelector('.map-node-dot');
        const point = anchor(id)?.board;
        if (dot && point) {
          const ring = document.createElementNS(SVG, 'circle');
          ring.setAttribute('class', 'map-presence-ring');
          ring.setAttribute('cx', String(point.x));
          ring.setAttribute('cy', String(point.y));
          ring.setAttribute('r', '30');
          group.insertBefore(ring, dot);
        }
      }
    }

    const side = root.querySelector('.map-side');
    if (!side) return;
    let card = side.querySelector('.m1-orientation-card');
    if (!card) {
      card = document.createElement('section');
      card.className = 'paper-panel m1-orientation-card';
      card.setAttribute('aria-label', 'Map orientation');
      side.prepend(card);
    }
    const markup = orientationMarkup();
    if (card.dataset.markup !== markup) {
      card.innerHTML = markup;
      card.dataset.markup = markup;
    }

    const areaCard = findAreaCard(side);
    const areaLabel = areaCard?.querySelector('.section-label');
    if (areaLabel) {
      const desired = `YOU ARE HERE · ${anchor(present)?.sliceState ?? 'active'} · PUBLIC ANCHOR`;
      if (areaLabel.textContent !== desired) areaLabel.textContent = desired;
    }
    const plan = areaCard?.querySelector('[data-action="plan-route"]');
    if (plan) plan.textContent = routePlanning ? 'CLEAR' : 'PLAN A ROUTE';
    updatePreviewPath(routePreview());
  } finally { applying = false; }
}

function queueApply() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => { queued = false; apply(); });
}

function stop(event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

root.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target || !game() || game().state.mode !== 'route') return;
  const action = target.dataset.action;
  if (action === 'select-anchor') {
    stop(event);
    inspectionFocus = target.dataset.anchor;
    if (routePlanning && !sealed(inspectionFocus)) {
      routeDraft = [game().state.selectedAnchor, inspectionFocus].filter((id, index, ids) => index === 0 || id !== ids[0]);
    }
    routeMessage = sealed(inspectionFocus) ? `${label(inspectionFocus)} is visible but sealed.` : '';
    apply();
  } else if (action === 'm1-show-lead') {
    stop(event);
    inspectionFocus = slot()?.anchor_id ?? game().state.selectedAnchor;
    apply();
  } else if (action === 'm1-use-area') {
    stop(event);
    const id = target.dataset.anchor;
    if (sealed(id)) return;
    const state = game().state;
    state.selectedAnchor = id;
    markSeen(state, id);
    inspectionFocus = id;
    routePlanning = false;
    routeDraft = [];
    routeMessage = '';
    game().debug.setState(state);
  } else if (action === 'plan-route') {
    stop(event);
    routePlanning = !routePlanning;
    routeDraft = routePlanning ? [game().state.selectedAnchor] : [];
    routeMessage = '';
    apply();
  } else if (action === 'm1-route-cancel') {
    stop(event);
    routePlanning = false;
    routeDraft = [];
    routeMessage = '';
    apply();
  } else if (action === 'm1-route-commit') {
    stop(event);
    const path = routePreview();
    const result = commitRoute(game().state, path);
    routeMessage = result.message;
    if (result.ok) {
      routePlanning = false;
      routeDraft = [];
      game().debug.setState(game().state);
    } else apply();
  }
}, true);

const observer = new MutationObserver(queueApply);
observer.observe(root, { childList: true, subtree: true });

function start() {
  if (!game()) { setTimeout(start, 25); return; }
  apply();
}
start();
