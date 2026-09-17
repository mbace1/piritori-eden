#!/usr/bin/env node
// Read-only catalogue of authored bindings. It is NOT a runtime-coverage analyser.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function auditMapMissions(map, content) {
  const findings = [];
  const index = (items, kind) => {
    const result = new Map();
    for (const item of items ?? []) {
      if (!item?.id || result.has(item.id)) findings.push({kind:'invalid-or-duplicate-id', collection:kind, id:item?.id ?? null});
      else result.set(item.id, item);
    }
    return result;
  };
  const anchors = index(map.anchors, 'anchors');
  const sites = index(map.sites, 'sites');
  const encounters = index(content.encounters, 'encounters');
  const missions = index(content.missions, 'missions');
  const battles = index(content.battles, 'battles');
  const visits = index(content.optional_visits, 'optional_visits');
  const requireId = (collection, id, owner, field) => {
    if (!collection.has(id)) findings.push({kind:'missing-reference', owner, field, id:id ?? null});
  };
  for (const site of sites.values()) requireId(anchors, site.anchorId, site.id, 'anchorId');
  const links = new Map([...anchors.keys()].map(id => [id, []]));
  for (const edge of map.edges ?? []) {
    requireId(anchors, edge.from, edge.id, 'from');
    requireId(anchors, edge.to, edge.id, 'to');
    links.get(edge.from)?.push(edge.to);
    links.get(edge.to)?.push(edge.from);
  }
  for (const encounter of encounters.values()) requireId(sites, encounter.site_id, encounter.id, 'site_id');
  const schedule = (content.schedule ?? []).map((slot, position) => {
    requireId(anchors, slot.anchor_id, slot.encounter_id, 'schedule.anchor_id');
    requireId(encounters, slot.encounter_id, `schedule[${position}]`, 'encounter_id');
    const encounter = encounters.get(slot.encounter_id);
    const site = sites.get(encounter?.site_id);
    if (site && slot.anchor_id !== site.anchorId) findings.push({
      kind:'schedule-site-anchor-mismatch', encounter:slot.encounter_id,
      scheduledAnchor:slot.anchor_id, site:site.id, siteAnchor:site.anchorId,
    });
    return {index:position, day:slot.day, block:slot.block, encounter:slot.encounter_id,
      anchor:slot.anchor_id, site:encounter?.site_id ?? null, siteAnchor:site?.anchorId ?? null,
      participants:[...(encounter?.participants ?? [])], newsBefore:slot.news_before ?? null};
  });
  const missionRows = [...missions.values()].map(mission => {
    requireId(encounters, mission.signal_encounter_id, mission.id, 'signal_encounter_id');
    requireId(anchors, mission.destination_anchor_id, mission.id, 'destination_anchor_id');
    if (mission.battle_id) requireId(battles, mission.battle_id, mission.id, 'battle_id');
    for (const step of mission.steps ?? []) requireId(anchors, step.anchor, mission.id, 'steps.anchor');
    return {id:mission.id, signal:mission.signal_encounter_id, destination:mission.destination_anchor_id,
      battle:mission.battle_id ?? null, deadline:mission.deadline ?? null,
      approaches:[...(mission.approaches ?? [])], steps:(mission.steps ?? []).map(s => ({verb:s.verb, anchor:s.anchor})),
      // Declared success/partial/failure packets are not proof that a runner executes them.
      declaredEffects:{success:mission.success_effects ?? [], partial:mission.partial_effects ?? [], failure:mission.failure_effects ?? []}};
  });
  const visitRows = [...visits.values()].map(visit => {
    requireId(encounters, visit.requires_encounter, visit.id, 'requires_encounter');
    requireId(sites, visit.site_id, visit.id, 'site_id');
    return {id:visit.id, chapter:visit.chapter, requiresEncounter:visit.requires_encounter,
      site:visit.site_id, anchor:sites.get(visit.site_id)?.anchorId ?? null,
      participants:[...(visit.participants ?? [])]};
  });
  const contacts = (content.chapters ?? []).flatMap(chapter => (chapter.narrative?.people ?? []).map(person => {
    if (person.site_id) requireId(sites, person.site_id, person.id, 'narrative.site_id');
    return {id:person.id, chapter:chapter.index, name:person.name, site:person.site_id ?? null,
      anchor:sites.get(person.site_id)?.anchorId ?? null, presentation:person.presentation ?? 'scene',
      combatPolicy:person.combat_policy, beats:(person.beats ?? []).map(beat => ({kind:beat.kind, id:beat.id}))};
  }));
  const reachable = new Set(), queue = [content.campaign.start_anchor_id];
  while (queue.length) {
    const id = queue.shift();
    if (reachable.has(id) || !anchors.has(id)) continue;
    reachable.add(id); queue.push(...(links.get(id) ?? []));
  }
  requireId(anchors, content.campaign.start_anchor_id, 'campaign', 'start_anchor_id');
  const operations = (content.chapters ?? []).filter(chapter => chapter.ending).map(chapter => {
    const ending = chapter.ending;
    if (ending.anchor_id) requireId(anchors, ending.anchor_id, ending.id, 'ending.anchor_id');
    return {chapter:chapter.index, ...ending};
  });
  return {
    schemaVersion:1,
    scope:'Authored catalogue and reference checks only. Runtime, public-build and physical-device acceptance are separate.',
    counts:{anchors:anchors.size, sites:sites.size, edges:(map.edges ?? []).length,
      periodServices:(map.periodServices ?? []).length, encounters:encounters.size, scheduledSlots:schedule.length,
      missions:missions.size, optionalVisits:visits.size, battles:battles.size, chapterOperations:operations.length},
    anchors:[...anchors.values()].map(anchor => ({id:anchor.id, label:anchor.label, state:anchor.sliceState,
      sites:[...sites.values()].filter(site => site.anchorId === anchor.id).map(site => site.id),
      graphReachable:reachable.has(anchor.id)})),
    edges:(map.edges ?? []).map(edge => ({id:edge.id, from:edge.from, to:edge.to, corridor:edge.corridor, modes:edge.modes})),
    services:(map.periodServices ?? []).map(service => ({id:service.id, mode:service.mode, anchors:service.anchorSequence})),
    graphCaveat:'Undirected declared-edge reachability is not available travel, timing, a fare, or a period-service simulation.',
    schedule, contacts, missions:missionRows, visits:visitRows, operations, findings,
  };
}

export function readAudit(root) {
  const inputs = {};
  const read = path => {
    const bytes = readFileSync(resolve(root, path));
    inputs[path] = createHash('sha256').update(bytes).digest('hex');
    return bytes.toString('utf8');
  };
  const map = JSON.parse(read('map/kallio-era1-2003-v1.json'));
  const content = JSON.parse(read('content/era1-slice-v1.json'));
  // These fingerprints identify the manually reviewed implementation, not an inferred coverage score.
  for (const path of ['web/js/v3/app.js','web/js/v3/state.js','web/js/v3/content.js',
    'web/js/v3/board.js','web/js/v3/visits.js','missions/model.mjs']) read(path);
  return {inputs, ...auditMapMissions(map, content)};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 2) {
    console.error('Usage: node tools/audit/map-mission-audit.mjs > /tmp/piritori-m0.json');
    process.exitCode = 2;
  } else {
    try { console.log(JSON.stringify(readAudit(resolve(dirname(fileURLToPath(import.meta.url)), '../..')), null, 2)); }
    catch (error) { console.error(`Audit failed: ${error.message}`); process.exitCode = 1; }
  }
}
