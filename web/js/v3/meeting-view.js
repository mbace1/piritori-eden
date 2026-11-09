// Any Act I meeting as a 9:16 scene with a lower-third card (owner, 8 November:
// Toko Move as the reference, "9:16 with overlays", all UI at most half the
// screen). Generalises the Scene Club view (scene-club-view.js) to every
// encounter: the place's own plate fills the frame, Aatami and whoever he meets
// stand in it, and one card at the bottom carries the line and the choices,
// each with what it costs on the right.
//
// The caller owns every rule, save and clock change; this view only presents
// the model it is given and reports a tap. People without approved artwork are
// drawn as a labelled stand-in (owner, 8 November: "Neutral labelled
// placeholders replace unapproved contacts").
import { createActors } from './scene-club-actors.js?v=1';

export const MEETING_STYLES = new URL('./meeting-view.css?v=1', import.meta.url).href;
const APPROVED = new Set(['jaska', 'toko']);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const beats = text => text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s => s.trim()) ?? [text];
const firstLine = text => beats(text).find(b => !/^day \d+[,.]?\s*(day|night)?\.?$/i.test(b)) ?? beats(text)[0];
const signed = (n, unit = '') => `${n > 0 ? '+' : '−'}${unit}${Math.abs(n)}`;

/** "seller-esa" → "Esa", "seller"; "sean-mccormick" → "Sean McCormick". */
export function personLabel(id, names = {}) {
  if (names[id]) return { name: names[id], role: '' };
  const parts = String(id).replace(/_/g, '-').split('-');
  const roles = ['seller', 'buyer', 'teller', 'clerk', 'owner', 'dog'];
  const cap = s => s.replace(/^mc(\w)/, (_, c) => 'Mc' + c.toUpperCase()).replace(/^\w/, c => c.toUpperCase());
  if (parts.length > 1 && roles.includes(parts[0])) return { name: parts.slice(1).map(cap).join(' '), role: parts[0] };
  return { name: parts.map(cap).join(' '), role: '' };
}

/** What a choice costs and gives, from its authored effects: the cost on the
 *  right of the pill (money first), the rest under the label. Hidden effects
 *  (flags, reveals, memories) stay hidden, as they do today. */
export function stakeOf(choice) {
  let cost = '';
  const notes = [];
  for (const effect of choice.effects ?? []) {
    const [kind, a, b] = String(effect).split(':');
    const n = Number(b ?? a);
    if (kind === 'cash' && Number(a)) cost ||= signed(Number(a), '€');
    else if (kind === 'markka' && Number(a)) cost ||= `${signed(Number(a))} mk`;
    else if (kind === 'debt' && Number(a)) notes.push(`debt ${signed(Number(a), '€')}`);
    else if (kind === 'exit-fund' && Number(a)) notes.push(`exit fund ${signed(Number(a), '€')}`);
    else if (kind === 'stock' && Number(b)) notes.push(`${signed(Number(b))} pack${Math.abs(Number(b)) === 1 ? '' : 's'}`);
    else if (kind === 'intel' && Number(a)) notes.push(`${signed(Number(a))} intel`);
    else if (kind === 'equipment') notes.push(`gear: ${String(a).replace(/^\+/, '').replace(/-/g, ' ')}`);
    else if (kind === 'recruit') notes.push('hires them');
    else if (kind === 'recruit-temporary') notes.push('hires them for now');
    else if (kind === 'relationship' && Number(b)) notes.push(`${personLabel(a).name} ${signed(n)}`);
    else if (kind === 'obligation' && Number(b) > 0) notes.push('owes a favour');
    else if (kind === 'start-battle') notes.push('a fight');
    else if (kind === 'start-negotiation') notes.push('a standoff');
    else if (kind === 'pressure' && Number(b)) notes.push(`heat ${signed(Number(b))}`);
    else if (kind === 'convert-markka') notes.push('markka to euros');
  }
  return { cost, notes: notes.slice(0, 2).join(' · ') };
}

/** Why a choice is locked, in words, from its own requirements. */
export function lockedReason(choice, reasons = []) {
  const words = (choice.failed ?? choice.requirements ?? []).map(r => String(r)).map(r => {
    let m;
    if ((m = r.match(/^cash>=(\d+)/))) return `needs €${m[1]}`;
    if ((m = r.match(/^markka>(?:=)?(\d+)/))) return 'needs old markka';
    if ((m = r.match(/^stock:piri>=(\d+)/))) return `needs ${m[1]} pack on you`;
    if ((m = r.match(/^fighters>=(\d+)/))) return `needs ${m[1]} who can fight`;
    if ((m = r.match(/^deployed-crew>=(\d+)/))) return `needs ${m[1]} crew with you`;
    if ((m = r.match(/^relationship:([\w-]+)>=/))) return `needs ${personLabel(m[1]).name}'s trust`;
    if ((m = r.match(/^obligation:([\w-]+)>=/))) return `needs a favour from ${personLabel(m[1]).name}`;
    if ((m = r.match(/^crew-role:(\w+)/))) return `needs a ${m[1]} in the crew`;
    if (/^intel>=/.test(r)) return 'needs more intel';
    if (/^chapter-goal-met/.test(r)) return "the chapter's goal isn't met yet";
    if (/^crew-critical/.test(r)) return 'only if someone is badly hurt';
    if (/^flag:/.test(r)) return 'needs something you learn first';
    return null;
  }).filter(Boolean);
  return [...new Set(words)].join(' · ') || reasons.join(' · ');
}

/** A choice you earned elsewhere (a clue, a favour, someone's trust, the right
 *  person) is the special one, Toko Move's third option. Money alone is not. */
export function isSpecial(choice) {
  return (choice.requirements ?? []).some(r => {
    const text = String(r), n = Number(text.match(/>=\s*(-?\d+)/)?.[1] ?? 1);
    return /^(flag:|crew-role:|chapter-goal-met)/.test(text) || (/^(relationship:|obligation:|intel)/.test(text) && n >= 1);
  });
}

export function mountMeetingView(world, { model, onChoose, onContinue, onBack } = {}) {
  if (!(world instanceof Element) || !model?.id) throw Error('A meeting needs its encounter and a view root.');
  const $ = sel => world.querySelector(sel);
  let disposed = false, loaded = false, choosing = false, armTimer = 0, actors = null, frame = 0;
  const partner = model.people.find(p => p !== 'aatami' && APPROVED.has(p)) ?? null;
  const standIns = model.people.filter(p => p !== 'aatami' && !APPROVED.has(p) && !/team|crowd|offscreen|optional/.test(p)).slice(0, 1);

  world.classList.add('meeting');
  world.dataset.meeting = model.id;
  world.innerHTML = `<img class="backdrop" alt="" src="${esc(model.backdrop)}"><div class="shade"></div>
    <header class="pill"><span class="when">${esc(model.when)}</span><strong class="where">${esc(model.place)}</strong><span class="cash">${esc(model.cash)}</span></header>
    <button class="menu-button" type="button" aria-label="Menu">☰</button>
    <div class="actors" aria-hidden="true"></div>
    <section class="card" aria-live="polite"></section>`;
  if (model.people.includes('aatami')) actors = createActors($('.actors'), { aatami: 'side', partner, reviewOnly: true });
  for (const id of standIns) {
    const { name, role } = personLabel(id, model.names);
    $('.actors').insertAdjacentHTML('beforeend', `<figure class="stand-in" data-person="${esc(id)}"><svg viewBox="0 0 100 160" aria-hidden="true"><circle cx="50" cy="34" r="22"/><path d="M8 160 C10 92 28 66 50 66 C72 66 90 92 92 160 Z"/></svg><figcaption><b>${esc(name)}</b>${role ? `<span>${esc(role)}</span>` : ''}<small>stand-in</small></figcaption></figure>`);
  }

  function speakerName() {
    const id = partner ?? standIns[0];
    return id ? personLabel(id, model.names).name : '';
  }
  function budget() {
    const h = world.clientHeight, top = $('.pill').getBoundingClientRect(), card = $('.card').getBoundingClientRect(), box = world.getBoundingClientRect();
    const scale = box.height / h;
    return ((top.bottom - box.top) + (box.bottom - card.top)) / scale / h;
  }
  function fit() {
    if (disposed || !world.clientHeight) return;
    world.dataset.density = 'full';
    if (budget() > 0.5) world.dataset.density = 'compact';
    if (budget() > 0.5 && world.dataset.stage === 'both') { world.dataset.stage = 'line'; }
    world.dataset.ui = budget().toFixed(3);
  }
  function render() {
    clearTimeout(armTimer);
    const chosen = model.choices.find(c => c.id === model.choiceId);
    world.dataset.resolved = String(Boolean(chosen));
    if (chosen) {
      const s = stakeOf(chosen);
      $('.card').innerHTML = `<div class="line"><span class="who">Aatami</span><p>${esc(chosen.label)}</p></div>
        <p class="result">${esc(chosen.forecast ?? '')}</p>
        ${s.cost || s.notes ? `<p class="receipt">${[s.cost, s.notes].filter(Boolean).map(esc).join(' · ')}</p>` : ''}
        <button class="primary" type="button" id="continue">Back to Kallio</button>`;
      $('#continue').addEventListener('click', () => onContinue?.());
    } else {
      const who = speakerName();
      $('.card').innerHTML = `<div class="line">${who ? `<span class="who">${esc(who)}</span>` : ''}<p>${esc(firstLine(model.opening))}</p></div>
        <div class="choices">${model.choices.map(choice => {
          const s = stakeOf(choice), special = choice.available !== false && isSpecial(choice);
          return `<button class="choice${special ? ' special' : ''}" type="button" data-choice="${esc(choice.id)}" ${choice.available === false ? 'disabled' : ''}
            aria-label="${esc(`${choice.label}. ${choice.available === false ? choice.reason : choice.forecast ?? ''}`)}">
            ${special ? '<span class="tag">★ Special</span>' : ''}
            <span class="label">${esc(s.cost && choice.available !== false ? choice.label.replace(/\s*[—–-]\s*€\s?\d+\s*$/, '') : choice.label)}</span>
            <span class="cost${choice.available === false ? ' why' : ''}">${esc(choice.available === false ? lockedReason(choice, choice.reason ? [choice.reason] : []).split(' · ')[0] : s.cost)}</span>
            <span class="sub">${esc(choice.available === false ? '' : s.notes)}</span>
          </button>`;
        }).join('')}</div>
        <button class="primary respond" type="button" hidden>Respond</button>`;
      world.dataset.stage = 'both';
      $('.respond').addEventListener('click', () => {
        world.dataset.stage = 'choices'; choosing = true;
        armTimer = setTimeout(() => { choosing = false; world.querySelector('[data-choice]:not(:disabled)')?.focus({ preventScroll: true }); }, 300);
      });
      choosing = true;
      // A tap that arrived with the card must not choose (Toko Move arms after 300ms).
      armTimer = setTimeout(() => { choosing = false; }, 300);
      for (const button of world.querySelectorAll('[data-choice]')) button.addEventListener('click', () => {
        if (disposed || choosing || button.disabled) return;
        choosing = true;
        const result = onChoose?.(button.dataset.choice);
        if (result?.ok === false) choosing = false;
      });
    }
    actors?.ready?.then(() => { if (!disposed) { actors.setSpeaker(chosen || !partner ? 'aatami' : partner); actors.play(chosen ? 'aatami' : (partner ?? 'aatami'), 'talk'); } }).catch(() => {});
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; fit(); });
  }
  const resize = () => fit();
  window.addEventListener('resize', resize);
  $('.menu-button').addEventListener('click', () => onBack?.());
  render();
  const api = {
    update(next) { if (disposed) return; model = next; render(); },
    fit,
    get budget() { return Number(world.dataset.ui); },
    ready: (actors?.ready ?? Promise.resolve()).then(() => { loaded = true; world.dataset.ready = 'true'; fit(); return api; }),
    destroy() { disposed = true; clearTimeout(armTimer); window.removeEventListener('resize', resize); actors?.destroy(); },
  };
  return api;
}
