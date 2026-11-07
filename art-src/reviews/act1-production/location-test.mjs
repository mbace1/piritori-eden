// Read-only coverage/traceability audit for the location production packets.
import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import vm from 'node:vm';
const root=new URL('../../../',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const data=read('art-src/reviews/act1-production/locations.json'),content=read('content/era1-slice-v1.json'),map=read('map/kallio-era1-2003-v1.json'),doors=read('content/doors-v1.json'),roads=read('content/road-events-v1.json'),places=read('content/places-v1.json'),art=read('art/v3/manifest.json');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(new URL(p,root))).digest('hex');
const sorted=a=>[...a].sort(),flat=(key)=>data.locations.flatMap(p=>p[key]??[]);
for(const [path,want]of Object.entries(data.source.hashes))assert.equal(hash(path),want,'Source changed: '+path);
assert.equal(data.locations.length,12);assert.equal(new Set(data.locations.map(p=>p.id)).size,12);
const physical=data.locations.filter(p=>p.anchorIds.length),shared=data.locations.find(p=>p.id==='loc-shared-journey-beats');assert(shared);assert.deepEqual(shared.anchorIds,[]);assert.deepEqual(shared.siteIds,[]);
assert.equal(physical.length,11);assert.deepEqual(sorted(physical.flatMap(p=>p.anchorIds)),sorted(map.anchors.filter(a=>a.sliceState==='active').map(a=>a.id)));
assert.deepEqual(sorted(flat('encounters')),sorted(content.encounters.map(e=>e.id)),'all17 encounters covered exactly once');assert.equal(new Set(flat('encounters')).size,17);
assert.deepEqual(sorted(flat('doors')),sorted(doors.templates.map(d=>d.id)),'all16 doors covered exactly once');assert.equal(new Set(flat('doors')).size,16);
assert.deepEqual(sorted(flat('roadEvents')),sorted(roads.events.map(e=>e.id)),'all29 roads in dynamic pool');assert.equal(new Set(flat('roadEvents')).size,29);assert.equal(physical.flatMap(p=>p.roadEvents).length,0,'no invented fixed road geography');
assert.deepEqual(sorted(shared.eligibleAnchorIds),sorted(map.anchors.filter(a=>a.sliceState==='active').map(a=>a.id)));
assert.deepEqual(sorted(shared.forcedOnlyIds),sorted(roads.events.filter(e=>e.trigger).map(e=>e.id)));assert.equal(shared.randomPoolIds.length,24);assert.equal(shared.forcedOnlyIds.length,5);
for(const phase of ['transit','arrival','any'])assert.deepEqual(sorted(shared.phaseIds[phase]),sorted(roads.events.filter(e=>e.phase===phase).map(e=>e.id)));
assert(roads.events.every(e=>!e.anchors&&!e.anchor_id&&!e.site_id),'road packet must be revisited if canon adds fixed bindings');
assert.deepEqual(sorted(new Set(flat('missions'))),sorted(content.missions.map(e=>e.id)),'four mission records covered');assert.deepEqual(sorted(flat('optionalVisits')),sorted(content.optional_visits.map(v=>v.id)),'three optional visits covered');
const schedule=new Map(content.schedule.filter(s=>s.encounter_id).map(s=>[s.encounter_id,s]));
const participantIds=new Set([content.protagonist.id,...content.encounters.flatMap(e=>e.participants),...content.optional_visits.flatMap(v=>v.participants)]);
const locationSource=fs.readFileSync(new URL('web/crew-run/locations.js',root),'utf8'),literal=locationSource.match(/export const LOCATIONS=({[^;]+});/);assert(literal);const kitIds=Object.keys(vm.runInNewContext('('+literal[1]+')',{}, {timeout:1000}));
const assetById=new Map(art.assets.map(a=>[a.id,a]));let refs=0;
for(const p of data.locations){assert(p.priority>=1&&Number.isInteger(p.priority));assert.equal(typeof p.status,'string');assert.equal(typeof p.summary,'string');for(const view of ['approach','dialogue','decision','tactical','return'])assert(p.views[view]?.length>30,`${p.id} missing ${view}`);for(const key of ['nextSteps','acceptance','mustPreserve'])assert(p.plan[key]?.length>=3,`${p.id} missing plan ${key}`);assert(p.placeholders.length);assert(p.sources.length);
 for(const s of p.sources){assert(fs.existsSync(new URL(s,root)),`${p.id} missing source ${s}`);assert(data.source.hashes[s],`unhashed source ${s}`);}
 for(const id of p.people)assert(participantIds.has(id),`invented source participant ${id}`);
 for(const id of p.encounters){assert(p.anchorIds.includes(schedule.get(id).anchor_id),'wrong schedule anchor '+id);assert(p.siteIds.includes(content.encounters.find(e=>e.id===id).site_id),'encounter site not covered '+id);}
 for(const id of p.doors){const d=doors.templates.find(d=>d.id===id);assert(d.anchors.every(a=>p.anchorIds.includes(a)),`door geography ${id}`);}
 for(const id of p.siteIds){const s=map.sites.find(s=>s.id===id);assert(s&&p.anchorIds.includes(s.anchorId),`site geography ${id}`);}
 for(const a of p.assets){const canonical=assetById.get(a.id);assert(canonical);assert.equal(a.approval,canonical.approval_status);assert.equal(a.production,canonical.production_status);assert.equal(a.file,'art/v3/'+canonical.file);assert.equal(hash(a.file),canonical.sha256);refs++;}
 if(p.runtimePlace){const r=places.places.find(x=>x.anchor===p.runtimePlace.anchor);assert(r);assert.equal(p.runtimePlace.kit,r.kit);assert(kitIds.includes(r.kit));assert.equal(p.runtimePlace.plate,r.plate??null);assert.equal(p.runtimePlace.standIn,Boolean(r.stand_in));assert.equal(p.runtimePlace.wayOut,r.way_out);assert.equal(p.runtimePlace.bespokeSiteGeometryAccepted,false);}
}
const silt=physical.find(p=>p.anchorIds.includes('siltasaari'));assert.match(silt.views.approach,/outside/i);assert.match(silt.plan.mustPreserve.join(' '),/Pasila.*Siltasaari/);assert(silt.placeholders.some(s=>/First-sale exterior.*unbuilt/i.test(s)));
const jade=physical.find(p=>p.anchorIds.includes('hakaniemi'));assert(jade.encounters.includes('enc-jade-window'));assert.match(jade.plan.mustPreserve.join(' '),/Hakaniemi/);
const court=physical.find(p=>p.anchorIds.includes('torkkelinmaki'));assert.deepEqual(court.siteIds,['torkkelinmaki_courtyard']);assert.equal(court.authoredSiteConflict.resolved,true);assert.equal(court.authoredSiteConflict.siteId,'torkkelinmaki_courtyard');assert.equal(court.authoredSiteConflict.siteAnchor,'torkkelinmaki');assert.equal(court.authoredSiteConflict.previousSiteId,'jaska_studio');assert.equal(court.authoredSiteConflict.previousSiteAnchor,'makelansilta');assert.equal(court.authoredSiteConflict.scheduleAndBattleAnchor,'torkkelinmaki');
assert.deepEqual(sorted(data.deferredExisting.map(a=>a.anchorId)),sorted(map.anchors.filter(a=>a.sliceState!=='active').map(a=>a.id)));assert.equal(data.deferredExisting.length,4);assert(data.deferredExisting.find(a=>a.anchorId==='hermanni_skatepark').existingContent.includes('battle-hermanni-training'));
assert.equal(data.locations[0].id,'loc-scene-club-makelansilta');assert(silt.priority<physical.find(p=>p.anchorIds.includes('harju')).priority);assert(physical.find(p=>p.anchorIds.includes('harju')).priority<jade.priority);assert(jade.priority<court.priority);
console.log(`PASS location plans: 12 packets / 11 active anchors + dynamic road pool, 17 encounters, 16 doors, 29 roads, 4 missions, 3 visits, ${refs} verified asset refs, 5 reused C19 kits and 4 deferred anchors`);
