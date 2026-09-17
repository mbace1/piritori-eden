import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {auditMapMissions, readAudit} from './map-mission-audit.mjs';
import {createState, currentEncounter, chooseEncounter, advanceSchedule} from '../../web/js/v3/state.js?v=6';
import {availableVisits, openVisit, chooseVisit, leaveVisit} from '../../web/js/v3/visits.js?v=2';
const root = fileURLToPath(new URL('../../', import.meta.url));
const read = path => JSON.parse(readFileSync(new URL('../../'+path, import.meta.url)));
const map = read('map/kallio-era1-2003-v1.json'), content = read('content/era1-slice-v1.json');
const before = structuredClone({map, content}), report = readAudit(root);
assert.deepEqual({map,content}, before);
assert.deepEqual(report, readAudit(root), 'deterministic, no timestamps or changing Git HEAD');
assert.deepEqual(report.counts, {anchors:15, sites:12, edges:25, periodServices:4, encounters:14,
  scheduledSlots:14, missions:4, optionalVisits:2, battles:4, chapterOperations:1});
assert.deepEqual(report.findings, [{kind:'schedule-site-anchor-mismatch', encounter:'enc-courtyard-last-call',
  scheduledAnchor:'torkkelinmaki',site:'jaska_studio',siteAnchor:'makelansilta'}],
  'the existing D005 debt is reported, NOT silently accepted as a consistent binding');
assert.equal(report.contacts.find(p => p.id === 'jaska').anchor, 'makelansilta');
assert.equal(report.contacts.find(p => p.id === 'arvo').site, null, 'do not invent an Arvo door');
assert.equal(report.missions.find(m => m.id === 'mission-paper-bag').battle, null);
assert.equal(report.operations[0].id, 'op-sornainen-shipment');
assert.equal(report.anchors.filter(a => a.state === 'active').length, 11);
assert.deepEqual(auditMapMissions(map, content), auditMapMissions(map, content));
const broken = structuredClone(map);
broken.sites.find(s => s.id === 'jaska_studio').anchorId = 'invented-place';
assert.ok(auditMapMissions(broken,content).findings.some(f => f.kind === 'missing-reference' && f.id === 'invented-place'));
const duplicate = structuredClone(map);duplicate.anchors.push({...duplicate.anchors[0]});
assert.ok(auditMapMissions(duplicate,content).findings.some(f => f.kind === 'invalid-or-duplicate-id'));
const missing = structuredClone(content);missing.schedule[0].encounter_id='missing-scene';
assert.ok(auditMapMissions(map,missing).findings.some(f => f.kind === 'missing-reference' && f.id === 'missing-scene'));
assert.deepEqual({map,content},before,'valid and invalid catalogue inspection never edits source data');
const data = {content, map};
for (const [key,items] of Object.entries({anchors:map.anchors,sites:map.sites,encounters:content.encounters,
  missions:content.missions,battles:content.battles,crew:content.crew,offers:content.market_offers,equipment:content.equipment})) {
  data[key] = new Map(items.map(item => [item.id,item]));
}
// Pure-model evidence only; these calls are NOT a browser or travel playthrough.
const state = createState(content);
for (const id of ['buy','complete']) {
  const encounter = currentEncounter(state,data),choice=encounter.choices.find(choice => choice.id === id);
  assert.ok(chooseEncounter(state,encounter,choice,data).ok);
  const after=structuredClone(state);
  assert.equal(chooseEncounter(state,encounter,choice,data).reason,'already-resolved');
  assert.deepEqual(state,after,'repeated choice cannot settle twice');
  advanceSchedule(state,data);
}
assert.equal(state.cash,183,'existing first margin is exactly 23; never add mission success_effects again');
assert.equal(state.stock.piri,0);
const visitState=createState(content);
visitState.choices['enc-jaska-receipt']='ask-envelope';visitState.selectedAnchor='makelansilta';
const untouched=structuredClone(visitState);
assert.deepEqual(availableVisits(visitState,data).map(v=>v.id),['visit-jaska-room-to-work']);
assert.deepEqual(visitState,untouched,'availability is read-only');
assert.ok(openVisit(visitState,data,'visit-jaska-room-to-work'));
const block=visitState.scheduleIndex,cash=visitState.cash;
assert.ok(chooseVisit(visitState,data,'jaska-listen').ok);leaveVisit(visitState);
assert.equal(visitState.scheduleIndex,block);assert.equal(visitState.cash,cash);
assert.deepEqual(availableVisits(visitState,data),[],'completed optional visit disappears');
assert.ok(visitState.flags.includes('memory:jaska-listen'));
console.log('PASS M0: read-only catalogue, known binding debt, invalid references, opening once-only margin and optional-visit boundary. No browser/device claim.');
