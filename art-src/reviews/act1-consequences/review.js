import { CASES, loadData, caseOf, createFixture, projectFixture, applyFixture, reloadFixture, summarize, actionCost } from './model.js';
const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let data, fixture, projected, view = 'before', replayCount = 0;
function card(state, label) {
  const s = summarize(state, data);
  return `<h3>${label}</h3><div class="metrics"><div class="metric"><b>€${s.cash}</b><span>cash</span></div><div class="metric"><b>${s.stock}</b><span>packs</span></div><div class="metric"><b>${s.roster}</b><span>crew</span></div><div class="metric"><b>${s.pressure}/3</b><span>local pressure</span></div></div><ul class="roster">${s.people.map(p => `<li><span>${esc(p.name)}</span><span class="person-tag ${esc(p.status)}">${esc(p.status)} · ${p.condition}/${p.max}</span></li>`).join('')}</ul><p class="detail-line">Stash: ${s.gear.map(esc).join(', ') || 'empty'}</p><p class="detail-line">Debt €${s.debt} · C.19 history ${s.history} · fixture block ${s.block + 1}</p>`;
}
function render() {
  const def = fixture.definition;
  $('place').textContent = `${def.place.toUpperCase()} · ${fixture.applied ? 'APPLIED' : 'FIXTURE'}`;
  $('title').textContent = def.title; $('premise').textContent = def.premise;
  const asset = data.artManifest.assets.find(a => a.id === def.scene) || data.artManifest.assets.find(a => a.id === 'scene-piritori-square-v01');
  $('scene').style.backgroundImage = asset?.file ? `url('${new URL(`../../../art/v3/${asset.file}`, import.meta.url).href}')` : 'none';
  $('plate-note').textContent = `Existing plate · ${asset?.approval_status || 'placeholder'} · not a C.19 render`;
  $('receipt-kind').textContent = fixture.receipt ? 'TERMINAL RECEIPT FIXTURE · ONE NIGHT BLOCK' : 'AUTHORED / EXISTING API EFFECTS · FIXTURE VALUES';
  $('cost').textContent = fixture.receipt ? `Job ${projected.lastResult.jobCash >= 0 ? '+' : '−'}€${Math.abs(projected.lastResult.jobCash)} · wages −€${projected.lastResult.nightlyPaid} · debt +€${projected.lastResult.debtAdded}` : actionCost(fixture);
  $('before').innerHTML = card(fixture.before, 'BEFORE');
  $('after').innerHTML = card(fixture.applied ? fixture.state : projected.state, fixture.applied ? 'AFTER · APPLIED TO FIXTURE' : 'AFTER · PROJECTED PREVIEW');
  $('comparison').dataset.view = view;
  $('before-tab').setAttribute('aria-pressed', String(view === 'before')); $('after-tab').setAttribute('aria-pressed', String(view === 'after'));
  $('after-tab').textContent = fixture.applied ? 'After' : 'Preview after';
  $('apply').textContent = fixture.id === 'hire' ? `${def.action} · €${fixture.candidate.wage_eur}` : def.action;
  $('apply').disabled = fixture.applied;
  $('repeat').hidden = !fixture.applied || !['victory', 'withdraw', 'police', 'hire'].includes(fixture.id);
  $('repeat').textContent = fixture.id === 'hire' ? 'Attempt same hire again' : 'Replay same receipt';
  $('reload').disabled = !fixture.applied;
  $('provenance').textContent = def.provenance; $('source').textContent = def.source; $('proposed').textContent = def.proposed;
  $('limit').textContent = def.limit; $('roadmap').textContent = def.roadmap;
  const markers = fixture.state.flags.filter(flag => flag.startsWith('memory:c17-receipt:') || flag.startsWith('memory:outing-settled:'));
  $('proof').textContent = `${fixture.receipt ? `Receipt: ${fixture.receipt.bridgeReceiptId}\n` : ''}State lives in page memory only.\nReceipt/city markers: ${markers.length}\nReplay checks: ${replayCount}\n${markers.join('\n')}`;
  window.__consequenceReview = { id: fixture.id, applied: fixture.applied, state: () => structuredClone(fixture.state), before: () => structuredClone(fixture.before), projected: () => structuredClone(projected.state) };
}
function select(id) {
  fixture = createFixture(data, caseOf(id).id); projected = projectFixture(data, fixture.id); view = 'before'; replayCount = 0;
  $('case-select').value = fixture.id; $('result').textContent = 'Preview only. Apply to the isolated fixture when ready.';
  if (fixture.candidate) $('result').textContent = `${fixture.candidate.name} · ${fixture.candidate.role} · existing generated candidate. Review the signing fee and nightly wage.`;
  const url = new URL(location.href); url.searchParams.set('case', fixture.id); history.replaceState(null, '', url);
  render();
}
$('before-tab').onclick = () => { view = 'before'; render(); };
$('after-tab').onclick = () => { view = 'after'; render(); };
$('apply').onclick = () => { const result = applyFixture(fixture, data); $('result').textContent = result.message; view = 'after'; render(); };
$('repeat').onclick = () => {
  const before = JSON.stringify(fixture.state), result = applyFixture(fixture, data), unchanged = before === JSON.stringify(fixture.state); replayCount += 1;
  if (result.ok || !unchanged) throw Error('Duplicate fixture settlement changed the state');
  $('result').textContent = fixture.id === 'hire' ? 'Same hire refused by the existing API. No second fee.' : 'Same receipt refused by the existing adapter. No second payment, loot, wound or history entry.';
  render();
};
$('reload').onclick = () => { reloadFixture(fixture, data); $('result').textContent = 'Fixture restored from JSON in memory. Campaign storage remains untouched. Try the same receipt again.'; render(); };
$('reset').onclick = () => select(fixture.id);
$('case-select').onchange = event => select(event.target.value);
try {
  data = await loadData();
  $('case-select').innerHTML = CASES.map((item, i) => `<option value="${item.id}">${String(i + 1).padStart(2, '0')} · ${esc(item.short)}</option>`).join('');
  select(new URLSearchParams(location.search).get('case') || 'victory');
  $('loading').hidden = true; $('workbench').hidden = false;
} catch (error) { $('loading').textContent = `Review unavailable: ${error.message}`; console.error(error); }
