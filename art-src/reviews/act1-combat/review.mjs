import { SOURCES, sourcePath, POLICY_NAMES, validateRows, selectRow, peers, comparison, metricText, PROPOSALS } from './model.mjs';
const root = new URL('../../../', location.href);
const $ = id => document.getElementById(id);
const data = {}, provenance = {};
const esc = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function option(value, text) { const el = document.createElement('option'); el.value = value; el.textContent = text; return el; }
let proposal = 'intent';
try {
  await Promise.all(Object.entries(SOURCES).map(async ([id, source]) => {
    const response = await fetch(new URL(sourcePath(source), root));
    if (!response.ok) throw Error(`Evidence HTTP ${response.status}: ${source.file}`);
    data[id] = validateRows(await response.json(), id);
    if (source.provenanceFile) {
      const response = await fetch(new URL(source.directory + source.provenanceFile, root));
      if (!response.ok) throw Error(`Provenance HTTP ${response.status}: ${source.provenanceFile}`);
      provenance[id] = await response.json();
    }
  }));
  // Register stable order after loading; fetch timing cannot choose a source.
  Object.entries(SOURCES).forEach(([id, source]) => $('source').append(option(id, source.label)));
  const requestedSource = new URLSearchParams(location.search).get('source');
  $('source').value = Object.hasOwn(SOURCES, requestedSource) ? requestedSource : 'baseline30';
  const fights = [...new Set(data.baseline30.map(row => row.fight))];
  fights.forEach(fight => $('scenario').append(option(fight, fight.replace(':', ' · ').replaceAll('-', ' '))));
  $('scenario').value = 'door:hit-courtyard-ledger';
  function render() {
    const sourceId = $('source').value, source = SOURCES[sourceId], rows = data[sourceId], fight = $('scenario').value, heat = Number($('heat').value), defensiveSource = sourceId === 'defensive30';
    const matched = peers(rows, fight, heat), previousPolicy = $('policy').value || (defensiveSource ? 'defensive' : 'careful');
    $('policy').replaceChildren(...matched.map(row => option(row.policy, POLICY_NAMES[row.policy])));
    $('policy').value = matched.some(row => row.policy === previousPolicy) ? previousPolicy : 'careful';
    const row = selectRow(rows, fight, heat, $('policy').value);
    if (!row) throw Error('Missing selected evidence row');
    $('sample').textContent = `15 fights · 3 heats · ${rows.length} rows · ${(rows.length * source.seeds).toLocaleString()} simulations`;
    $('source-note').textContent = defensiveSource ? 'EXPERIMENT · Corrected 30-seed sampler on integrated v4.97: 147 retained peer rows + 45 defensive rows, measured together. Defensive is opt-in; no rule or default-policy promotion. This page runs no simulations.' : source.experiment ? 'EXPERIMENT · Historical v4.96 dodge-first bot movement order. The default policy is unchanged. This page runs no simulations.' : 'BASELINE · Historical v4.96 default bot outcomes through the existing campaign bridge. This page runs no simulations.';
    $('fight-heading').textContent = `${fight.replace(':', ' · ').replaceAll('-', ' ')} · ${row.goal === 'fight' ? 'fight job' : 'getaway job'}`;
    const metrics = [['Won','win','%','Runs won'],['Withdrew','withdraw','%','Costly withdrawal outcome'],['Lost','loss','%','Runs lost'],['Rounds','rounds','','Average battle rounds; not seconds'],['Net HP lost','hpLost','','Terminal crew HP shortfall, including healing; not cumulative damage'],['Someone down','downed','%','Runs with a down/taken fighter; not permanent campaign deaths'],['Crew downs','downs','','Average downs per fight'],['Police arrived','police','%','Runs reaching police arrival'],['Brace commands','braces','','Average successful player commands'],['Move commands','moves','','Average successful player commands'],['Attack commands','attacks','','Average successful player commands'],['Wall-clock time','wallClock','','Not recorded by this tool']];
    if (defensiveSource) metrics.push(['Brace with incoming','braceWithIncoming','','Chosen forecast has an incoming attack'],['Brace preparation','bracePreparing','','Chosen spare-action preparation'],['Forecast down prevented','bracePredictedDownPrevented','','Chosen forecast condition; not measured saved lives']);
    $('metrics').innerHTML = metrics.map(([label,key,suffix,note]) => `<div class="metric"><span>${label}</span><strong>${esc(metricText(row,key,suffix))}</strong><small>${note}</small></div>`).join('');
    const delta = comparison(rows, fight, heat), signed = value => value > 0 ? '+' + value : String(value);
    const defensiveDelta = comparison(rows, fight, heat, 'defensive');
    $('comparison').innerHTML = `<p data-comparison="careful">Careful versus aggressive in this scenario: ${signed(delta.winPoints)} win-rate points · ${signed(delta.hpSaved)} net HP saved · ${signed(delta.extraRounds)} rounds. ${source.seeds} seeds per policy; rounded source values.</p>${defensiveDelta ? `<p data-comparison="defensive"><strong>Defensive (opt-in) versus aggressive · selected scenario / heat:</strong> ${signed(defensiveDelta.winPoints)} win-rate points · ${signed(defensiveDelta.hpSaved)} net HP saved · ${signed(defensiveDelta.extraRounds)} rounds · ${signed(defensiveDelta.policePoints)} police-arrival points · ${signed(defensiveDelta.downedPoints)} downed-fight points.</p><p class="fine">Observational policy comparison: movement, targeting, order and healing decisions also differ. This does not isolate Brace as the cause; no no-Brace ablation was run. Defensive is not a promoted default.</p>` : ''}`;
    $('policy-table').innerHTML = matched.map(peer => `<tr class="${peer.policy === row.policy ? 'selected' : ''}"><th scope="row">${POLICY_NAMES[peer.policy]}</th><td>${peer.win}%</td><td>${peer.withdraw}%</td><td>${peer.loss}%</td><td>${peer.hpLost}</td><td>${peer.rounds}</td><td>${peer.police}%</td></tr>`).join('');
    const p = provenance[sourceId];
    $('provenance').innerHTML = `<p>File: <a href="${new URL(sourcePath(source),root)}">${esc(sourcePath(source))}</a>. ${source.seeds} deterministic seeds per scenario/heat/policy, using outing IDs m{seed}h{heat}. ${defensiveSource ? `Freshly measured on integrated v4.97, including main 0587dae. Sampler-start commit <code>${esc(p.samplerStartCommit)}</code>; runtime base <code>${esc(p.runtimeBaseCommit)}</code>. <a href="${new URL(source.directory + source.provenanceFile,root)}">Exact command and selected source hashes</a>. The 147 retained peer rows came from this same opt-in run, not an independent default run. Historical baseline fields match exactly; newly measured command counters do not retrofill that older file. <a href="${new URL(source.directory + 'README.md',root)}">Integrated evidence and limits</a>.` : 'Historical v4.96 rules, main b114bf7. Recorded on 7 November 2026; diagnostics preserved by feature commit 2a3e9f3 and evidence commit fecb8d3.'} ${source.actions ? 'Successful player command counters are included where recorded. Defensive-specific decision counters remain unmeasured for other policies.' : 'This historical default 30-seed file predates action counters. Brace/move/attack counts are unmeasured, not zero.'}</p><p>Net HP loss is terminal HP shortfall including any healing, not cumulative incoming damage. Bandage/reload counts, per-seed raw outcomes and confidence intervals were not measured here. Rounded Brace components need not sum exactly; forecast down prevention is not observed saved lives.</p>`;
    $('status').textContent = 'Evidence loaded. Filters and proposal annotations are local display state only; no campaign save is read or written.';
    window.__combatReview = { ready: true, selected: { source: sourceId, fight, heat, policy: row.policy }, row: structuredClone(row), scenarioCount: fights.length, rows: rows.length, sourceVersion: source.version, defensiveDelta: defensiveDelta && structuredClone(defensiveDelta) };
  }
  ['source','scenario','heat','policy'].forEach(id => $(id).addEventListener('change',render));
  function showProposal(id) {
    proposal = id; const item = PROPOSALS.find(item => item.id === id);
    $('proposal-overlay').hidden = id === 'original';
    document.querySelectorAll('#proposal-tabs button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.proposal === id)));
    if (id === 'original') { $('proposal-copy').innerHTML = '<h3>Original captured frame</h3><p>Existing C.19 campaign opening, with no proposal annotation. Use the real-game links to interact with the tactical arena.</p>'; return; }
    $('proposal-overlay').dataset.proposal = id;
    $('proposal-overlay').innerHTML = `${esc(item.label)}<small>PROPOSED ANNOTATION · NO COMMAND SENT</small>`;
    $('proposal-copy').innerHTML = `<h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><p><strong>Acceptance:</strong> ${esc(item.acceptance)}</p><p class="fine">Source: ${esc(item.source)}. Overlay placement is illustrative, not a recorded world-space target location.</p>`;
  }
  PROPOSALS.forEach(item => { const button = document.createElement('button'); button.type = 'button'; button.dataset.proposal = item.id; button.textContent = item.title; button.onclick = () => showProposal(item.id); $('proposal-tabs').append(button); });
  const original = document.createElement('button'); original.type = 'button'; original.dataset.proposal = 'original'; original.textContent = 'Original frame'; original.onclick = () => showProposal('original'); $('proposal-tabs').append(original);
  render(); showProposal(proposal);
} catch (error) { $('status').textContent = 'Unable to load evidence: ' + error.message; $('status').dataset.error = 'true'; throw error; }
