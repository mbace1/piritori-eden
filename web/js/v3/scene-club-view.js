// Shared Scene Club presentation. Campaign and review callers own all rules,
// saves and clock changes; this view owns only its current conversation beat.
import { createActors } from './scene-club-actors.js?v=1';

export const SCENE_CLUB_ID = 'enc-jaska-receipt';
export const SCENE_CLUB_STYLES = new URL('./scene-club-view.css?v=1', import.meta.url).href;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const beats = text => text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s => s.trim()) ?? [text];
const compactLabel = choice => ({'ask-envelope':'Ask before taking it','take-envelope':'Call it family money','leave-it':'Leave it under the map'}[choice.id] ?? choice.label);
function stake(choice) {
  const money = choice.effects.find(e => e.startsWith('markka:'))?.split(':')[1];
  const trust = choice.effects.find(e => e.startsWith('relationship:jaska:'))?.split(':')[2];
  return `${money ? `${money} mk` : 'No bank offer'} · trust ${trust}`;
}
function consequences(choice) {
  // This encounter's authored effects are unconditional increments. Rebuild
  // their receipt from the recorded choice on reload, never apply them here.
  const money = choice.effects.find(e => e.startsWith('markka:'))?.split(':')[1];
  const trust = choice.effects.find(e => e.startsWith('relationship:jaska:'))?.split(':')[2];
  return [money ? `${money} mk` : 'Bank offer lost', trust ? `${trust} trust` : null].filter(Boolean);
}

export function mountSceneClubView(world, {
  model, onChoose, onContinue, onBack, sound, onError,
  arrival = false, menu = true, reviewOnly = false, pose = 'side',
  externalUi = () => ({}), onChange = () => {},
} = {}) {
  if (!(world instanceof Element) || model?.id !== SCENE_CLUB_ID) throw Error('Scene Club needs its authored encounter and a view root.');
  const $ = id => world.querySelector('#' + id);
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false, loaded = false, frame = 0, fitting = false, armTimer = 0;
  let dialogueDismissed = false, choosing = false, continuing = false;
  let arriving = arrival && !model.choiceId, previousChoice = model.choiceId;
  let continueAt = 0;
  const hadFocus = world.getRootNode().activeElement ?? document.activeElement;

  world.classList.add('scene-club','world','scene-view');
  world.dataset.campaignScene = SCENE_CLUB_ID;
  world.dataset.ready = 'false';
  world.innerHTML = `<img class="backdrop" alt="" src="${esc(model.backdrop)}"><div class="scene-shade"></div>
    <header class="scene-header"><div class="location"><strong>Scene Club</strong><small>Mäkelänsilta</small></div><span class="old-cash"></span></header>
    <div class="actors" id="actors" aria-label="Aatami and Jaska"></div>
    <div class="encounter-overlay" id="encounter-overlay"><section class="speech" id="speech" aria-live="polite"></section><section class="controls" id="controls" aria-label="Your response"></section></div>
    ${menu ? `<details class="scene-menu"><summary aria-label="Open conversation menu">Menu</summary><div class="scene-menu-controls">
      <button id="scene-resume" type="button">Return to conversation</button>
      <div class="scene-inspections"></div>
      ${sound ? '<button id="scene-sound" type="button"></button>' : ''}
      <button id="scene-back" type="button">Back to Kallio</button>
    </div></details>` : ''}`;
  const actorStage = createActors($('actors'), { aatami: pose, partner: 'jaska', reducedMotion: media.matches, reviewOnly });
  const observer = new ResizeObserver(scheduleFit);
  for (const element of [world, ...world.querySelectorAll('.scene-header,.encounter-overlay,.scene-menu'), ...Object.values(externalUi()).flat()]) {
    if (element instanceof Element) observer.observe(element);
  }

  const visible = element => element && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden';
  function budget() {
    const rect = world.getBoundingClientRect(), scale = rect.height / world.clientHeight;
    const extra = externalUi(), ownMenu = world.querySelector('.scene-menu');
    const override = extra.bottom ?? (ownMenu?.open ? ownMenu : null);
    const headers = [world.querySelector('.scene-header'), ...(extra.top ?? []), ...(!ownMenu?.open && ownMenu ? [ownMenu.querySelector('summary')] : [])].filter(visible);
    const bottom = override ?? world.querySelector('.encounter-overlay');
    const topBand = Math.max(0, ...headers.map(e => (e.getBoundingClientRect().bottom - rect.top) / scale));
    const bottomBand = visible(bottom) ? bottom.getBoundingClientRect().height / scale + (parseFloat(getComputedStyle(bottom).bottom) || 0) : 0;
    return { topBand, bottomBand, height: world.clientHeight, ratio: (topBand + bottomBand) / world.clientHeight };
  }
  function fit() {
    if (disposed || fitting || !world.clientHeight) return;
    fitting = true; world.dataset.budgetReady = 'false';
    world.dataset.format = '9:16'; world.dataset.uiDensity = 'full'; world.dataset.uiStage = 'both';
    const speech = $('speech'), choices = world.querySelector('.choices'), respond = $('respond');
    speech.hidden = false; if (choices) choices.hidden = false; if (respond) respond.hidden = true;
    let measured = budget();
    if (measured.ratio > .5) { world.dataset.uiDensity = 'compact'; measured = budget(); }
    if (measured.ratio > .5 && choices) {
      world.dataset.uiStage = dialogueDismissed ? 'choices' : 'dialogue';
      speech.hidden = dialogueDismissed; choices.hidden = !dialogueDismissed; respond.hidden = dialogueDismissed;
      measured = budget();
    }
    world.uiBudget = measured; world.dataset.budgetReady = measured.ratio <= .50001 ? 'true' : 'false';
    fitting = false; onChange();
  }
  function scheduleFit() {
    if (disposed) return;
    world.dataset.budgetReady = 'false';
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; fit(); });
  }
  function armChoices() {
    world.querySelectorAll('[data-choice]').forEach(button => {
      const choice = model.choices.find(c => c.id === button.dataset.choice);
      button.disabled = !loaded || choosing || Boolean(model.choiceId) || choice?.available === false;
    });
  }
  function updateSound() {
    if ($('scene-sound')) $('scene-sound').textContent = `Sound · ${sound.get() ? 'on' : 'off'}`;
  }
  function continueStory() {
    if (disposed || continuing || !model.choiceId || performance.now() < continueAt) return;
    continuing = true;
    world.querySelectorAll('#return,#scene-back').forEach(button => { button.disabled = true; });
    const result = onContinue?.();
    if (!disposed && result?.ok === false) { continuing = false; update(model); }
  }
  function renderConversation() {
    clearTimeout(armTimer); armTimer = 0;
    const chosen = model.choices.find(c => c.id === model.choiceId);
    world.dataset.resolved = String(Boolean(chosen));
    world.dataset.arrival = String(arriving);
    $('speech').dataset.speaker = chosen ? 'aatami' : 'jaska';
    $('speech').innerHTML = `<p class="speaker">${chosen ? 'Aatami' : 'Jaska'}</p><p>${esc(chosen ? chosen.label : arriving ? beats(model.opening)[0] : beats(model.opening).at(-1))}</p>`;
    if (chosen) {
      $('controls').innerHTML = `<p class="result-caption">${esc(chosen.forecast)}</p><div class="receipt">${consequences(chosen).map(value => `<b>${esc(value)}</b>`).join('')}</div><button class="primary" type="button" id="return" aria-label="Back to Kallio. ${esc(chosen.forecast)}">Back to Kallio</button>`;
      $('return').disabled = continuing || performance.now() < continueAt;
      $('return').addEventListener('click', continueStory);
      const remaining = continueAt - performance.now();
      if (remaining > 0) armTimer = setTimeout(() => { if (!disposed && $('return')) $('return').disabled = continuing; }, remaining);
    } else if (arriving) {
      $('controls').innerHTML = '<button class="primary" type="button" id="scene-enter">Continue</button>';
      $('scene-enter').addEventListener('click', () => { if (!disposed) { arriving = false; renderConversation(); fit(); } });
    } else {
      $('controls').innerHTML = `<div class="choices">${model.choices.map(choice => `<button class="choice" type="button" data-choice="${esc(choice.id)}" aria-label="${esc(choice.label+'. '+choice.forecast)}" disabled><strong><span class="full-label">${esc(choice.label)}</span><span class="compact-label" aria-hidden="true">${esc(compactLabel(choice))}</span></strong><span class="forecast">${esc(choice.available === false ? choice.reason : choice.forecast)}</span><span class="compact-stake" aria-hidden="true">${esc(choice.available === false ? choice.reason : stake(choice))}</span></button>`).join('')}</div><button class="primary" id="respond" type="button" hidden>Respond</button>`;
      for (const button of world.querySelectorAll('[data-choice]')) button.addEventListener('click', () => {
        if (disposed || choosing || !loaded || model.choiceId || button.disabled) return;
        choosing = true; armChoices();
        const result = onChoose?.(button.dataset.choice);
        if (!disposed && result?.ok === false) { choosing = false; armChoices(); }
      });
      $('respond').addEventListener('click', () => {
        dialogueDismissed = true; choosing = true; armChoices(); fit();
        armTimer = setTimeout(() => { if (disposed || model.choiceId) return; choosing = false; armChoices(); world.querySelector('[data-choice]:not(:disabled)')?.focus({ preventScroll: true }); }, 300);
      });
      armChoices();
    }
    if (loaded) actorStage.setSpeaker(chosen ? 'aatami' : 'jaska');
  }
  function update(nextModel) {
    if (disposed) return;
    if (nextModel.id !== SCENE_CLUB_ID) throw Error('Another encounter requires another view.');
    const changedChoice = nextModel.choiceId !== previousChoice;
    if (!previousChoice && nextModel.choiceId) { continueAt = performance.now() + 300; arriving = false; }
    model = nextModel; previousChoice = nextModel.choiceId;
    if (!model.choiceId) choosing = false;
    world.querySelector('.old-cash').textContent = model.markka ? `${model.markka} mk` : '';
    renderConversation();
    if (changedChoice && model.choiceId && loaded) {
      actorStage.play('aatami','talk');
      const choice = model.choices.find(c => c.id === model.choiceId);
      actorStage.play('jaska', choice.effects.some(e => e.startsWith('relationship:jaska:-')) ? 'shake' : 'nod');
    }
    fit();
  }
  const ownMenu = world.querySelector('.scene-menu');
  if (ownMenu) {
    ownMenu.addEventListener('toggle', scheduleFit);
    $('scene-resume').addEventListener('click', () => { ownMenu.open = false; ownMenu.querySelector('summary').focus({preventScroll:true}); });
    world.querySelector('.scene-inspections').innerHTML = (model.inspections ?? []).map(item => `<details><summary>${esc(item.label)}</summary><p>${esc(item.text)}</p></details>`).join('');
    $('scene-back').addEventListener('click', () => {
      if (model.choiceId) continueStory();
      else if (!disposed && !continuing) { continuing = true; onBack?.(); }
    });
    $('scene-sound')?.addEventListener('click', () => { sound.set(!sound.get()); updateSound(); });
    updateSound();
  }
  const motionChange = e => actorStage.setReducedMotion(e.matches);
  media.addEventListener('change', motionChange);
  window.addEventListener('resize', scheduleFit);
  document.fonts.ready.then(scheduleFit);
  update(model);
  const api = {
    actors: actorStage, update, fit,
    toggleMenu() { if (!disposed && ownMenu) { ownMenu.open = !ownMenu.open; fit(); } },
    get presentation() { return {density:world.dataset.uiDensity,stage:world.dataset.uiStage,budget:world.uiBudget}; },
    ready: null,
    destroy() {
      if (disposed) return;
      disposed = true; clearTimeout(armTimer); if (frame) cancelAnimationFrame(frame);
      observer.disconnect(); window.removeEventListener('resize',scheduleFit); media.removeEventListener('change',motionChange);
      actorStage.destroy(); world.dataset.ready = 'false';
      if (hadFocus?.isConnected) hadFocus.focus?.({preventScroll:true});
    },
  };
  api.ready = actorStage.ready.then(async () => {
    if (disposed) return api;
    loaded = true; armChoices(); world.dataset.ready = 'true';
    actorStage.setSpeaker(model.choiceId ? 'aatami' : 'jaska'); actorStage.play(model.choiceId ? 'aatami' : 'jaska','talk');
    if (model.choiceId) {
      const choice = model.choices.find(c => c.id === model.choiceId);
      actorStage.play('jaska', choice.effects.some(e => e.startsWith('relationship:jaska:-')) ? 'shake' : 'nod');
    }
    await new Promise(requestAnimationFrame); if (!disposed) fit(); return api;
  }).catch(error => {
    if (!disposed) { world.dataset.ready = 'error'; onError?.(error); }
    throw error;
  });
  return api;
}
