import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createState,restoreState} from '../js/v3/state.js';
import {availableVisits,openVisit,chooseVisit,leaveVisit} from '../js/v3/visits.js';
const content=JSON.parse(await readFile(new URL('../../content/era1-slice-v1.json',import.meta.url)));
const map=JSON.parse(await readFile(new URL('../../map/kallio-era1-2003-v1.json',import.meta.url)));
const data={content,sites:new Map(map.sites.map(s=>[s.id,s]))};
for(const v of content.optional_visits){
 let s=createState(content);s.selectedAnchor=data.sites.get(v.site_id).anchorId;
 assert.equal(openVisit(s,data,v.id),false,'Introduction is required');
 s.choices[v.requires_encounter]='already-met';
 s.selectedAnchor='piritori';assert.equal(openVisit(s,data,v.id),false,'Must be at the site');
 s.selectedAnchor=data.sites.get(v.site_id).anchorId;
 s.battle={status:'active'};assert.equal(openVisit(s,data,v.id),false);s.battle=null;
 assert(openVisit(s,data,v.id));
 s=restoreState(JSON.parse(JSON.stringify(s)),content);
 assert.equal(s.mode,'visit','Resume active visit');
 const before={cash:s.cash,intel:s.intel,clock:s.scheduleIndex,earned:s.chapterEarned,relations:{...s.relationships}};
 assert.equal(chooseVisit(s,data,'invented').ok,false);
 assert(chooseVisit(s,data,v.choices[0].id).ok);
 assert.equal(chooseVisit(s,data,v.choices[1].id).ok,false,'No duplicate choice');
 assert.deepEqual({cash:s.cash,intel:s.intel,clock:s.scheduleIndex,earned:s.chapterEarned,relations:{...s.relationships}},before);
 assert(s.flags.includes(v.choices[0].effects[0]));
 leaveVisit(s);assert.equal(s.mode,'route');assert.equal(s.activeVisit,null);
 assert.equal(openVisit(s,data,v.id),false,'Cannot reopen resolved visit');
 const fresh=createState(content);fresh.choices[v.requires_encounter]='met';fresh.selectedAnchor=data.sites.get(v.site_id).anchorId;fresh.chapterCleared=true;
 assert.equal(availableVisits(fresh,data).length,0,'Finale closes visits');
 fresh.chapterCleared=false;assert(openVisit(fresh,data,v.id));leaveVisit(fresh);assert(openVisit(fresh,data,v.id),'Leaving unresolved can return');
}
for(const slot of content.schedule.filter(s=>/enc-jaska-(receipt|last-light)/.test(s.encounter_id)))assert.equal(slot.anchor_id,data.sites.get('jaska_studio').anchorId);
console.log('PASS visits: prerequisites, location, battle/finale exclusion, reload, cancellation, one-time memories, unchanged rewards and clock, Jaska location alignment');

