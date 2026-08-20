export const SAVE_KEY = 'piritori-to-eden:v3';
export const STATE_VERSION = 3;

const PRESSURE = { low: 0, watchful: 1, hot: 2, closed: 3 };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const addUnique = (items, value) => { if (!items.includes(value)) items.push(value); };
const relKey = key => key.replaceAll('-', '_');

export function createState(content) {
  const start = content.campaign.starting_state;
  const crewStatus = Object.fromEntries(content.crew.map(member => [member.id, {
    condition: member.condition,
    maxCondition: member.condition,
    nerve: member.nerve,
    status: 'available',
    critical: false,
  }]));
  return {
    version: STATE_VERSION,
    contentId: content.id,
    scheduleIndex: 0,
    mode: 'route',
    locale: 'en',
    selectedAnchor: content.campaign.start_anchor_id,
    cash: start.cash_eur,
    markka: start.markka_mk,
    debt: start.debt_eur,
    exitFund: start.exit_fund_eur,
    capacity: start.capacity,
    intel: start.intel,
    stock: { ...start.stock },
    relationships: { ...start.relationships },
    pressure: Object.fromEntries(Object.entries(start.local_pressure)
      .map(([id, band]) => [id, PRESSURE[band] ?? 0])),
    cityHarm: start.city_harm,
    flags: [],
    obligations: {},
    equipment: ['feature-phone'],
    recruited: [],
    temporaryCrew: [],
    deployed: [],
    crewStatus,
    revealedOffers: ['offer-piritori-buy'],
    revealedMissions: [],
    revealedEncounters: ['enc-first-purchase'],
    missionStatus: {},
    choices: {},
    newsSeen: [],
    route: null,
    battle: null,
    battleHistory: [],
    endingId: null,
    logs: ['Day 1. Piritori is the only corner that already knows Aatami.'],
    lastOutcome: null,
  };
}

export function restoreState(raw, content) {
  if (!raw || raw.version !== STATE_VERSION || raw.contentId !== content.id) return createState(content);
  const fresh = createState(content);
  return {
    ...fresh,
    ...raw,
    stock: { ...fresh.stock, ...(raw.stock ?? {}) },
    relationships: { ...fresh.relationships, ...(raw.relationships ?? {}) },
    pressure: { ...fresh.pressure, ...(raw.pressure ?? {}) },
    obligations: { ...fresh.obligations, ...(raw.obligations ?? {}) },
    crewStatus: { ...fresh.crewStatus, ...(raw.crewStatus ?? {}) },
  };
}

export function saveState(state, storage = globalThis.localStorage) {
  storage?.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadState(content, storage = globalThis.localStorage) {
  try {
    return restoreState(JSON.parse(storage?.getItem(SAVE_KEY) ?? 'null'), content);
  } catch {
    return createState(content);
  }
}

export function currentSchedule(state, content) {
  return content.schedule[state.scheduleIndex] ?? null;
}

export function currentEncounter(state, data) {
  const slot = currentSchedule(state, data.content);
  return slot ? data.encounters.get(slot.encounter_id) ?? null : null;
}

export function formatBlock(state, content) {
  const slot = currentSchedule(state, content);
  if (!slot) return 'COMPLETE';
  return `DAY ${slot.day} · ${slot.block.toUpperCase()}`;
}

export function deployedCrew(state, data) {
  const available = state.recruited.filter(id => state.crewStatus[id]?.status !== 'missing');
  const chosen = state.deployed.filter(id => available.includes(id));
  const merged = [...chosen, ...available.filter(id => !chosen.includes(id))];
  return merged.slice(0, 3).map(id => data.crew.get(id)).filter(Boolean);
}

export function requirementStatus(requirement, state, data) {
  const numeric = (prefix, value) => {
    const match = requirement.match(new RegExp(`^${prefix}(>=|>|<=|<|=)(-?\\d+)$`));
    if (!match) return null;
    const target = Number(match[2]);
    const ok = ({ '>=': value >= target, '>': value > target, '<=': value <= target,
      '<': value < target, '=': value === target })[match[1]];
    return { ok, reason: `${prefix.replaceAll(':', ' ')} ${match[1]} ${target}` };
  };

  let result = numeric('cash', state.cash)
    ?? numeric('markka', state.markka)
    ?? numeric('intel', state.intel)
    ?? numeric('deployed-crew', deployedCrew(state, data).length)
    ?? numeric('crew-critical', Object.values(state.crewStatus).filter(x => x.critical).length);
  if (result) return result;

  let match = requirement.match(/^stock:([^><=]+)(>=|>|<=|<|=)(-?\d+)$/);
  if (match) {
    const value = state.stock[match[1]] ?? 0;
    return numeric(`stock:${match[1]}`, value);
  }
  match = requirement.match(/^relationship:([^><=]+)(>=|>|<=|<|=)(-?\d+)$/);
  if (match) {
    const value = state.relationships[relKey(match[1])] ?? 0;
    return numeric(`relationship:${match[1]}`, value);
  }
  match = requirement.match(/^obligation:([^><=]+)(>=|>|<=|<|=)(-?\d+)$/);
  if (match) {
    const value = state.obligations[relKey(match[1])] ?? 0;
    return numeric(`obligation:${match[1]}`, value);
  }
  if (requirement.startsWith('flag:')) {
    const id = requirement.slice(5);
    return { ok: state.flags.includes(id), reason: `requires ${id.replaceAll('-', ' ')}` };
  }
  if (requirement.startsWith('crew-role:')) {
    const role = requirement.slice(10);
    const ok = deployedCrew(state, data).some(member => member.role === role);
    return { ok, reason: `requires a ${role}` };
  }
  return { ok: true, reason: requirement };
}

export function choiceStatus(choice, state, data) {
  const checks = (choice.requirements ?? []).map(req => requirementStatus(req, state, data));
  return {
    ok: checks.every(check => check.ok),
    reasons: checks.filter(check => !check.ok).map(check => check.reason),
  };
}

export function deterministicRoll(state, label) {
  const text = `${state.contentId}|${state.scheduleIndex}|${label}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function addLog(state, message) {
  state.logs.unshift(message);
  state.logs.length = Math.min(24, state.logs.length);
}

function adjustNumber(state, key, delta) {
  state[key] = Math.max(0, (state[key] ?? 0) + delta);
}

function reveal(state, id) {
  if (id.startsWith('offer-')) addUnique(state.revealedOffers, id);
  else if (id.startsWith('mission-')) addUnique(state.revealedMissions, id);
  else if (id.startsWith('enc-')) addUnique(state.revealedEncounters, id);
  else addUnique(state.flags, `revealed-${id}`);
}

function chooseEnding(state, data) {
  const unresolved = Object.entries(state.crewStatus).filter(([, status]) => status.critical);
  for (const [id, status] of unresolved) {
    status.critical = false;
    status.status = 'dead';
    addUnique(state.flags, `unresolved-critical:${id}`);
    addLog(state, `${data.crew.get(id)?.name ?? id}'s clearly flagged critical wound was not treated before final settlement.`);
  }
  const deaths = Object.values(state.crewStatus).filter(x => x.status === 'dead').length;
  let id;
  if (deaths) id = 'pasila-haunted';
  else if (state.exitFund >= 180 && state.debt > 250) id = 'pasila-expensive';
  else if (state.exitFund >= 180 && state.debt <= 250 && state.recruited.length >= 2) id = 'pasila-nearer';
  else id = 'pasila-deferred';
  state.endingId = id;
  return data.content.endings.find(item => item.id === id);
}

export function applyEffects(state, effects, data, label = 'choice') {
  const outcome = { messages: [], startBattle: null, ending: null };
  const message = text => { outcome.messages.push(text); addLog(state, text); };
  for (const effect of effects ?? []) {
    let match;
    if ((match = effect.match(/^(cash|markka|debt|intel|exit-fund):([+-]?\d+)$/))) {
      const key = ({ cash: 'cash', markka: 'markka', debt: 'debt', intel: 'intel', 'exit-fund': 'exitFund' })[match[1]];
      adjustNumber(state, key, Number(match[2]));
      continue;
    }
    if ((match = effect.match(/^stock:([^:]+):([+-]?\d+)$/))) {
      state.stock[match[1]] = Math.max(0, (state.stock[match[1]] ?? 0) + Number(match[2]));
      continue;
    }
    if ((match = effect.match(/^(relationship|obligation):([^:]+):([+-]?\d+)$/))) {
      const bucket = match[1] === 'relationship' ? state.relationships : state.obligations;
      const key = relKey(match[2]);
      bucket[key] = (bucket[key] ?? 0) + Number(match[3]);
      continue;
    }
    if ((match = effect.match(/^pressure:([^:]+):([+-]?\d+)$/))) {
      state.pressure[match[1]] = clamp((state.pressure[match[1]] ?? 0) + Number(match[2]), 0, 3);
      continue;
    }
    if (effect.startsWith('flag:')) { addUnique(state.flags, effect.slice(5)); continue; }
    if (effect.startsWith('memory:')) { addUnique(state.flags, effect); continue; }
    if (effect.startsWith('reveal:')) { reveal(state, effect.slice(7)); continue; }
    if (effect.startsWith('equipment:+')) { addUnique(state.equipment, effect.slice(11)); continue; }
    if (effect.startsWith('recruit:') || effect.startsWith('recruit-temporary:')) {
      const temporary = effect.startsWith('recruit-temporary:');
      const id = effect.slice(temporary ? 18 : 8);
      addUnique(temporary ? state.temporaryCrew : state.recruited, id);
      addUnique(state.deployed, id);
      message(`${data.crew.get(id)?.name ?? id} joins the working roster${temporary ? ' for one job' : ''}.`);
      continue;
    }
    if ((match = effect.match(/^(complete|partial|fail):(.+)$/))) {
      state.missionStatus[match[2]] = match[1];
      continue;
    }
    if (effect === 'convert-markka:all' || effect.startsWith('convert-markka:')) {
      const amount = effect.endsWith(':all') ? state.markka : Math.min(state.markka, Number(effect.split(':')[1]));
      const euros = Math.floor((amount / 5.94573) * 100) / 100;
      state.markka -= amount;
      state.cash = Math.round((state.cash + euros) * 100) / 100;
      message(`${amount} mk becomes €${euros.toFixed(2)} at the fixed rate.`);
      continue;
    }
    if (effect.startsWith('start-battle:') || effect.startsWith('start-negotiation:')) {
      outcome.startBattle = effect.split(':')[1];
      if (effect.startsWith('start-negotiation:')) addUnique(state.flags, 'battle-negotiation-open');
      continue;
    }
    if (effect.startsWith('battle-on-failure:')) {
      const battleId = effect.split(':')[1];
      const chance = clamp(0.35 + state.intel * 0.15, 0.35, 0.8);
      if (deterministicRoll(state, `${label}:fixer`) < chance) {
        state.missionStatus['mission-bear-path'] = 'complete';
        adjustNumber(state, 'cash', 70);
        message('The fixer makes the warning legible. The handover ends without a fight.');
      } else {
        outcome.startBattle = battleId;
        message('The warning lands badly. Both crews take their rows.');
      }
      continue;
    }
    if (effect === 'resolve:sabotage-wager-45') {
      if (deterministicRoll(state, `${label}:sabotage`) < 0.45) {
        addUnique(state.flags, 'toko-sabotage-succeeded');
        adjustNumber(state, 'intel', 1);
        message('The wager lands. One competing route goes quiet for a night.');
      } else {
        state.relationships.toko = (state.relationships.toko ?? 0) - 1;
        state.pressure.vaasankatu = clamp((state.pressure.vaasankatu ?? 0) + 1, 0, 3);
        message('The wager fails in public. Toko writes the loss beside Aatami’s name.');
      }
      continue;
    }
    if (effect === 'resolve:fixer-negotiation') continue;
    if (effect === 'resolve-critical-wound:one') {
      const target = Object.keys(state.crewStatus).find(id => state.crewStatus[id].critical);
      if (target) {
        state.crewStatus[target].critical = false;
        state.crewStatus[target].status = 'wounded';
        state.crewStatus[target].condition = Math.max(1, state.crewStatus[target].condition);
      }
      continue;
    }
    if (effect === 'resolve-ending:best-match') {
      outcome.ending = chooseEnding(state, data);
      continue;
    }
    if (effect === 'battle:avoided') { addUnique(state.flags, 'battle-karhupuisto-avoided'); continue; }
    if (effect.startsWith('opponent-nerve:')) {
      state.battleOpeningNerve = Number(effect.split(':')[1]);
      continue;
    }
    if (effect.startsWith('service:') || effect.startsWith('market-history:')
      || effect.startsWith('crew-outcome:') || effect.startsWith('debt-holder-memory:')
      || effect.endsWith(':advantage') || effect.startsWith('label:')) {
      addUnique(state.flags, effect);
    }
  }
  state.lastOutcome = outcome.messages;
  return outcome;
}

export function chooseEncounter(state, encounter, choice, data) {
  if (state.choices[encounter.id]) return { ok: false, reason: 'already-resolved' };
  const status = choiceStatus(choice, state, data);
  if (!status.ok) return { ok: false, reason: status.reasons.join(', ') };
  const result = applyEffects(state, choice.effects, data, `${encounter.id}:${choice.id}`);
  state.choices[encounter.id] = choice.id;
  addUnique(state.revealedEncounters, encounter.id);
  addLog(state, `${encounter.id}: ${choice.label}`);
  return { ok: true, ...result };
}

function settleNight(state, content, day) {
  const settlement = content.campaign.settlement;
  state.debt += settlement.nightly_interest_eur;
  const wages = state.recruited.reduce((sum, id) => {
    const member = content.crew.find(item => item.id === id);
    return sum + (member?.wage_eur ?? 0);
  }, 0);
  const paid = Math.min(state.cash, wages);
  state.cash -= paid;
  if (paid < wages) {
    state.debt += wages - paid;
    addUnique(state.flags, `wages-short-day-${day}`);
    addLog(state, `Night ${day}: €${wages - paid} in unpaid wages becomes a visible obligation.`);
  } else if (wages) {
    addLog(state, `Night ${day}: €${wages} settles the crew wages.`);
  }
  const due = settlement.required_payments.find(item => item.day === day);
  if (due) addLog(state, `A debt demand of €${due.amount_eur} is now due; it does not end the game invisibly.`);
}

export function advanceSchedule(state, data) {
  const slot = currentSchedule(state, data.content);
  if (slot?.block === 'night') settleNight(state, data.content, slot.day);
  state.scheduleIndex += 1;
  state.lastOutcome = null;
  state.mode = 'route';
  const next = currentSchedule(state, data.content);
  if (next) {
    state.selectedAnchor = next.anchor_id;
    addUnique(state.revealedEncounters, next.encounter_id);
  }
  return next;
}

export function offerPrice(offer) {
  if (offer.quote.kind === 'exact') return offer.quote.eur;
  return Math.round((offer.quote.min_eur + offer.quote.max_eur) / 2);
}

export function transactOffer(state, offer, side = offer.side) {
  const price = offerPrice(offer);
  if (side === 'buy') {
    if (state.cash < price) return { ok: false, message: 'Not enough euro cash.' };
    if ((state.stock.piri ?? 0) >= state.capacity) return { ok: false, message: 'No free carrying capacity.' };
    state.cash -= price;
    state.stock.piri = (state.stock.piri ?? 0) + 1;
    addLog(state, `Ledger: bought one abstract pack at ${offer.anchor_id} for €${price}.`);
    return { ok: true, message: `One pack added for €${price}.` };
  }
  if ((state.stock.piri ?? 0) < 1) return { ok: false, message: 'No stock to sell.' };
  state.stock.piri -= 1;
  state.cash += price;
  addLog(state, `Ledger: sold one abstract pack at ${offer.anchor_id} for €${price}.`);
  return { ok: true, message: `One pack moved for €${price}.` };
}

export function commitRoute(state, path) {
  if (!path || path.length < 2) return { ok: false, message: 'Choose two connected anchors.' };
  const ordinary = 1 + Math.floor(deterministicRoll(state, `route:${path.join('>')}`) * 3);
  state.route = { path, capacity: 4, ordinary, hidden: 0 };
  addLog(state, `A route is pinned through ${path.length} public anchors; ${ordinary}/4 places are already ordinary traffic.`);
  return { ok: true, message: 'Route pinned to the public graph.' };
}

export function sendOnRoute(state, data) {
  const route = state.route;
  if (!route) return { ok: false, message: 'Pin a route first.' };
  if ((state.stock.piri ?? 0) < 1) return { ok: false, message: 'No stock to assign.' };
  if (route.ordinary + route.hidden >= route.capacity) return { ok: false, message: 'The ordinary service is full this block.' };
  const destination = route.path.at(-1);
  const offer = data.content.market_offers.find(item => item.anchor_id === destination
    && item.side === 'sell' && state.revealedOffers.includes(item.id));
  if (!offer) return { ok: false, message: 'No known buyer at the destination.' };
  state.stock.piri -= 1;
  state.cash += offerPrice(offer);
  route.hidden += 1;
  if (route.ordinary < 2) state.pressure[destination] = clamp((state.pressure[destination] ?? 0) + 1, 0, 3);
  addLog(state, `One hidden load shares ${route.ordinary} ordinary journeys and settles at ${destination}.`);
  return { ok: true, message: `The route settles one pack for €${offerPrice(offer)}.` };
}
