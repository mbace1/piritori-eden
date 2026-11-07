import { SOURCES, POLICY_NAMES, validateRows, selectRow, peers, comparison, metricText, PROPOSALS } from './model.mjs';
const root = new URL('../../../', location.href);
const evidenceRoot = new URL('design/evidence/scene-club-2026-11-07/', root);
const $ = id => document.getElementById(id);
const data = {};
const esc = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function option(value, text) { const el = document.createElement('option'); el.value = value; el.textContent = text; return el; }
let proposal = 'intent';
try {
  await Promise.all(Object.entries(SOURCES).map(async ([id, source]) => {
    const response = await fetch(new URL(source.file, evidenceRoot));
    if (!response.ok) throw Error(`Evidence HTTP ${response.status}: ${source.file}`);
    data[id] = validateRows(await response.json());
    $('source').append(option(id, source.label));
  }));
  // Fetch completion order must never choose an unintended source.
  $('source').value = 'baseline30';
  const fights = [...new Set(data.baseline30.map(row => row.fight))];
  fights.forEach(fight => $('scenario').append(option(fight, fight.replace(':', ' · ').replaceAll('-', ' '))));
  $('scenario').value = 'door:hit-courtyard-ledger';
  function render() {
    const source = SOURCES[$('source').value], rows = data[$('source').value], fight = $('scenario').value, heat = Number($('heat').value);
    const matched = peers(rows, fight, heat), previousPolicy = $('policy').value || 'careful';
    $('policy').replaceChildren(...matched.map(row => option(row.policy, POLICY_NAMES[row.policy])));
    $('policy').value = matched.some(row => row.policy === previousPolicy) ? previousPolicy : 'careful';
    const row = selectRow(rows, fight, heat, $('policy').value);
    if (!row) throw Error('Missing selected evidence row');
    $('sample').textContent = `15 fights · 3 heats · ${rows.length} rows · ${(rows.length * source.seeds).toLocaleString()} simulations`;
    $('source-note').textContent = source.experiment ? 'EXPERIMENT · Same combat rules, different bot movement order. The default policy is unchanged.' : 'BASELINE · Preserved default bot outcomes through the existing campaign bridge. No fresh simulation is being run by this page.';
    $('fight-heading').textContent = `${fight.replace(':', ' · ').replaceAll('-', ' ')} · ${row.goal === 'fight' ? 'fight job' : 'getaway job'}`;
    const metrics = [['Won','win','%','Runs won'],['Withdrew','withdraw','%','Costly withdrawal outcome'],['Lost','loss','%','Runs lost'],['Rounds','rounds','','Average battle rounds'],['HP lost','hpLost','','Average crew damage'],['Someone down','downed','%','Runs with a down/taken fighter'],['Crew downs','downs','','Average downs per fight'],['Police arrived','police','%','Runs reaching police arrival'],['Brace commands','braces','','Average successful player commands'],['Move commands','moves','','Average successful player commands'],['Attack commands','attacks','','Average successful player commands'],['Wall-clock time','wallClock','','Not recorded by this tool']];
    $('metrics').innerHTML = metrics.map(([label,key,suffix,note]) => `<div class="metric"><span>${label}</span><strong>${esc(metricText(row,key,suffix))}</strong><small>${note}</small></div>`).join('');
    const delta = comparison(rows, fight, heat), signed = value => value > 0 ? '+' + value : String(value);
    $('comparison').textContent = `Careful versus aggressive in this scenario: ${signed(delta.winPoints)} win-rate points · ${signed(delta.hpSaved)} HP saved · ${signed(delta.extraRounds)} rounds. ${source.seeds} seeds per policy; rounded source values.`;
    $('policy-table').innerHTML = matched.map(peer => `<tr class="${peer.policy === row.policy ? 'selected' : ''}"><th scope="row">${POLICY_NAMES[peer.policy]}</th><td>${peer.win}%</td><td>${peer.withdraw}%</td><td>${peer.loss}%</td><td>${peer.hpLost}</td><td>${peer.rounds}</td><td>${peer.police}%</td></tr>`).join('');
    $('provenance').innerHTML = `<p>File: <a href="${new URL(source.file,evidenceRoot)}">${source.file}</a>. ${source.seeds} deterministic seeds per scenario/heat/policy, using outing IDs m{seed}h{heat}. Campaign rules: v4.96, main b114bf7. Recorded on 7 November 2026; diagnostics preserved by feature commit 2a3e9f3 and evidence commit fecb8d3. ${source.actions ? 'Additive action counters are included.' : 'This default 30-seed file predates the action counters. Brace/move/attack counts are unmeasured, not zero.'}</p>`;
    $('status').textContent = 'Evidence loaded. Filters and proposal annotations are local display state only; no campaign save is read or written.';
    window.__combatReview = { ready: true, selected: { source: $('source').value, fight, heat, policy: row.policy }, row: structuredClone(row), scenarioCount: fights.length, rows: rows.length };
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
