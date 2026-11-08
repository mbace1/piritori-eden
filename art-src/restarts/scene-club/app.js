import { loadGameData } from '../../../web/js/v3/content.js?v=2';
import { createActors } from './actors.js';
import { createTokoComposition } from './toko-composition.js';
import { loadCandidate, restartCandidate, chooseCandidate, returnToMap, SCENE_ENCOUNTER_ID } from './campaign.js';

const $ = id => document.getElementById(id);
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root = new URL('../../../', import.meta.url);
const params = new URLSearchParams(location.search);
const pose = params.get('pose') === 'front' ? 'front' : 'side';
const partner = params.get('pair') === 'toko' ? 'toko' : 'jaska';
const half = params.get('scale') === '0.5';
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let actors = null, candidate, data, arrived = params.get('start') === 'scene', generation = 0;
let observer = null;
let tokoBeat = 0;
const world = $('world');
const image = id => {
  const asset = data.artManifest.assets.find(a => a.id === id);
  if (!asset?.file) throw Error('Missing retained scene source: ' + id);
  return new URL('art/v3/' + asset.file, root).href;
};
const scene = () => data.encounters.get(SCENE_ENCOUNTER_ID);
const mapLabel = id => ({makelansilta:'Scene Club',harju:'Harju',piritori:'Piritori',hakaniemi:'Hakaniemi'}[id] ?? data.anchors.get(id)?.label ?? id);
function deltas() {
  const receipt = candidate.lastReceipt;
  if (!receipt) return [];
  const mk = receipt.after.markka - receipt.before.markka;
  const trust = (receipt.after.relationships.jaska ?? 0) - (receipt.before.relationships.jaska ?? 0);
  return [mk ? `${mk > 0 ? '+' : ''}${mk} mk` : 'Old money left with Jaska', trust ? `${trust > 0 ? '+' : ''}${trust} trust` : null].filter(Boolean);
}
function mapMarkup() {
  const anchors = data.map.anchors.filter(a => a.sliceState === 'active'), byId = new Map(anchors.map(a => [a.id,a]));
  const route = data.map.edges.filter(e => byId.has(e.from) && byId.has(e.to)).map(e => {
    const a = byId.get(e.from).board, b = byId.get(e.to).board;
    return `<path class="map-street" d="M${a.x},${a.y} L${b.x},${b.y}"/>`;
  }).join('');
  const dots = anchors.map(a => `<circle class="map-dot" cx="${a.board.x}" cy="${a.board.y}" r="5"/>`).join('');
  const current = byId.get('makelansilta').board, lead = byId.get('harju').board;
  const returned = candidate.phase === 'map';
  const labels = ['piritori','hakaniemi'].map(id => {const a=byId.get(id);return `<text class="map-label" x="${a.board.x+12}" y="${a.board.y+7}">${mapLabel(id)}</text>`;}).join('');
  return `<svg class="city-map" viewBox="70 85 820 800" role="img" aria-label="Kallio. Aatami is at Scene Club.${returned ? ' The next lead is Harju.' : ''}">
    ${route}${dots}<circle class="map-ring" cx="${current.x}" cy="${current.y}" r="17"/><circle class="map-current" cx="${current.x}" cy="${current.y}" r="7"/>
    <text class="map-label current" x="${current.x-18}" y="${current.y-30}" text-anchor="middle">Scene Club</text>
    ${returned ? `<circle class="map-lead" cx="${lead.x}" cy="${lead.y}" r="7"/><text class="map-label" x="${lead.x-15}" y="${lead.y-20}" text-anchor="end">Harju</text>` : ''}${labels}
  </svg>`;
}
function renderMap() {
  const returned = candidate.phase === 'map';
  world.className = `world map-view${half ? ' half' : ''}`;
  world.innerHTML = `<header class="map-header"><h1>Kallio</h1><span>${candidate.state.markka ? `${candidate.state.markka} mk` : 'Day 2'}</span></header>${mapMarkup()}
    <section class="map-footer">
      ${returned ? `<div class="map-receipt"><p class="eyebrow">Scene Club · remembered</p><div class="receipt">${deltas().map(d=>`<b>${esc(d)}</b>`).join('')}</div></div>
        <div class="next-place"><span>Harju</span><small>Next authored encounter</small></div>` : `<p class="eyebrow">Mäkelänsilta</p><h2>Scene Club</h2><p>Jaska’s place.</p><button type="button" class="primary" id="enter">Go inside</button>`}
    </section>`;
  $('enter')?.addEventListener('click', () => { arrived = true; render(); });
  expose(true, returned ? 'map' : 'arrival');
}
function fitControls() {
  const controls = $('controls');
  if (!controls) return;
  world.style.setProperty('--control-h', `${Math.ceil(controls.getBoundingClientRect().height / (half ? .5 : 1))}px`);
  const speech = $('speech'), speaker = speech?.dataset.speaker;
  const bounds = actors?.bounds?.();
  const mouth = bounds?.[speaker]?.mouth;
  if (speech && mouth) {
    const box = speech.getBoundingClientRect();
    const x = typeof mouth.x === 'number' ? mouth.x : null;
    if (x !== null) {
      speech.dataset.tail = x < box.left + box.width / 2 ? 'left' : 'right';
      speech.style.setProperty('--tail-x', `${Math.max(16,Math.min(box.width / (half ? .5 : 1) - 36,(x-box.left)/(half ? .5 : 1)-10))}px`);
    }
  }
}
function resultControls() {
  return `<p class="result-caption">${esc(candidate.lastReceipt.forecast)}</p><div class="receipt">${deltas().map(d=>`<b>${esc(d)}</b>`).join('')}</div><button type="button" class="primary" id="return">Back to Kallio</button>`;
}
function showResult() {
  const speech = $('speech');
  speech.dataset.speaker = 'aatami';
  speech.innerHTML = `<p class="speaker">Aatami</p><p>${esc(candidate.lastReceipt.label)}</p>`;
  $('controls').innerHTML = resultControls();
  actors.setSpeaker('aatami'); actors.play('aatami','talk');
  actors.play('jaska', (candidate.lastReceipt.after.relationships.jaska ?? 0) > (candidate.lastReceipt.before.relationships.jaska ?? 0) ? 'nod' : 'shake');
  $('return').addEventListener('click', () => {if(returnToMap(candidate,data).ok)render();});
  if (!motion.matches) speech.animate([{opacity:.45},{opacity:1}],{duration:180});
  fitControls(); expose(true,'scene');
}
async function renderScene() {
  const thisGeneration = ++generation, study = partner === 'toko';
  const resolved = candidate.phase !== 'scene';
  const source = study ? data.encounters.get('enc-toko-quiet-voice') : scene();
  const studyLines = [source.opening.match(/^[^.]+\./)?.[0] ?? source.opening, source.opening.replace(/^[^.]+\.\s*/, '')];
  world.className = `world scene-view${study ? ' toko-study' : ''}${half ? ' half' : ''}`;
  world.innerHTML = `${study ? '<div class="room-composite" id="room-composite"></div>' : `<img class="backdrop" alt="" src="${image(source.scene_asset_id)}">`}<div class="scene-shade"></div>
    <header class="scene-header"><div class="location"><strong>${study ? 'Toko Slomo’s' : 'Scene Club'}</strong><small>${study ? 'Vaasankatu · ensemble study' : 'Mäkelänsilta'}</small></div><span class="old-cash">${candidate.state.markka ? `${candidate.state.markka} mk` : ''}</span></header>
    <div class="actors" id="actors" aria-label="Aatami and ${study ? 'Toko' : 'Jaska'}"></div>
    <section class="speech" id="speech" data-speaker="${resolved && !study ? 'aatami' : partner}" aria-live="polite"><p class="speaker">${study ? 'Toko' : resolved ? 'Aatami' : 'Jaska'}</p><p>${esc(study ? studyLines[tokoBeat] : resolved ? candidate.lastReceipt.label : source.opening)}</p></section>
    <section class="controls" id="controls" aria-label="${study ? 'Ensemble study' : 'Your response'}">
      ${study ? `<p class="result-caption">Aatami + Toko · source composition study</p><div class="study-actions"><button class="choice" type="button" id="next-line">${tokoBeat ? 'First line' : 'Next line'}</button><button class="primary" type="button" id="back-to-scene">Return to Scene Club</button></div>` : resolved ? resultControls() : `<div class="choices">${source.choices.map(c => `<button class="choice" type="button" data-choice="${esc(c.id)}" disabled><strong>${esc(c.label)}</strong><span>${esc(c.forecast)}</span></button>`).join('')}</div>`}
    </section>`;
  observer?.disconnect(); observer = new ResizeObserver(fitControls); observer.observe($('controls')); fitControls();
  const stage = study ? createTokoComposition($('room-composite'),$('actors'),{aatami:pose,reducedMotion:motion.matches,focus:()=>innerWidth<600?[.36,.5]:innerHeight<600?[.5,0]:[.5,.5]}) : createActors($('actors'), { aatami: pose, partner, reducedMotion: motion.matches });
  actors = stage;
  await stage.ready;
  if (generation !== thisGeneration) { stage.destroy(); return; }
  stage.setSpeaker(resolved && !study ? 'aatami' : partner);
  stage.play(resolved && !study ? 'aatami' : partner, 'talk');
  if (resolved && !study) stage.play('jaska', (candidate.lastReceipt.after.relationships.jaska ?? 0) > (candidate.lastReceipt.before.relationships.jaska ?? 0) ? 'nod' : 'shake');
  world.querySelectorAll('[data-choice]').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => {
      const result = chooseCandidate(candidate, button.dataset.choice, data);
      if (result.ok) showResult();
    });
  });
  $('return')?.addEventListener('click', () => { if (returnToMap(candidate, data).ok) render(); });
  $('back-to-scene')?.addEventListener('click', () => { const u = new URL(location.href);u.searchParams.delete('pair');u.searchParams.set('start','scene');location.href=u; });
  $('next-line')?.addEventListener('click', () => {tokoBeat=1-tokoBeat;$('speech').lastElementChild.textContent=studyLines[tokoBeat];$('next-line').textContent=tokoBeat?'First line':'Next line';stage.play('toko','talk');fitControls();});
  await new Promise(requestAnimationFrame); fitControls();
  expose(true, study ? 'study' : 'scene');
}
function expose(ready, view) {
  window.__sceneReset = { ready, view, pose, partner, half, candidate, actors,
    sourceCommit:'804613a3d4eaa1e5180dfb0ef2cb88952d15bd97',
    refresh:render, enter(){arrived=true;return render();},
  };
}
async function render() {
  actors?.destroy(); actors = null;
  expose(false, 'loading');
  if (partner !== 'toko' && (!arrived && candidate.phase === 'scene' || candidate.phase === 'map')) renderMap();
  else await renderScene();
}
for (const [id,key] of [['pose','pose'],['pair','pair'],['scale','scale']]) {
  $(id).value = id === 'pose' ? pose : id === 'pair' ? partner : half ? '0.5' : '1';
  $(id).addEventListener('change', () => { const u=new URL(location.href);u.searchParams.set(key,$(id).value);u.searchParams.set('start','scene');location.href=u; });
}
$('restart').addEventListener('click', () => {candidate=restartCandidate(data);arrived=false;render();});
motion.addEventListener('change', () => actors?.setReducedMotion?.(motion.matches));
window.addEventListener('resize', fitControls);
try { data = await loadGameData(); candidate = loadCandidate(data); await render(); }
catch (error) {world.innerHTML=`<p class="loading" role="alert">The candidate could not open: ${esc(error.message)}</p>`;throw error;}
