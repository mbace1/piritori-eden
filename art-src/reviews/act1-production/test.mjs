import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const l=read('./locations.json'),c=read('./characters.json'),o=read('./order.json'),content=read('../../../content/era1-slice-v1.json'),manifest=read('../../../art/v3/manifest.json');
const cast=new Set(c.characters.map(p=>p.id)),locIds=new Set(l.locations.map(p=>p.id)),assets=new Map(manifest.assets.map(a=>[a.id,a]));
assert.equal(cast.size,c.characters.length);assert.equal(locIds.size,l.locations.length);assert.equal(o.expansion.status,'deferred');
for(const entry of o.stages){for(const id of entry.characters)assert(cast.has(id),`${entry.id}: cast packet ${id}`);for(const anchor of entry.anchors)assert(l.locations.some(p=>p.anchorIds.includes(anchor)),`${entry.id}: location packet for ${anchor}`);}
for(const entry of l.locations){for(const id of entry.people)assert(cast.has(id),`${entry.id}: cast plan ${id}`);for(const a of entry.assets)assert(assets.has(a.id),`registered source ${a.id}`);}
for(const encounter of content.encounters){assert(l.locations.some(p=>p.encounters.includes(encounter.id)),`location coverage ${encounter.id}`);for(const id of encounter.participants)assert(cast.has(id),`cast coverage ${id}`);}
assert.notEqual(c.characters.find(p=>p.id==='bank-clerk').id,c.characters.find(p=>p.id==='teller-anne').id);
assert.equal(c.characters.find(p=>p.id==='jaska-offscreen').kind,'offscreen');
console.log(`PASS production joins: ${l.locations.length} locations/contexts, ${c.characters.length} cast/roles, ${o.stages.length} dependency stages, all ${content.encounters.length} encounters; expansion deferred`);
