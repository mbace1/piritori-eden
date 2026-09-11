import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
const c=JSON.parse(await read('../../content/era1-slice-v1.json'));
const m=JSON.parse(await read('../../map/kallio-era1-2003-v1.json'));
const a=JSON.parse(await read('../../art/v3/manifest.json'));
const ids=new Set(c.encounters.map(e=>e.id));
for(const v of c.optional_visits??[]){
 assert(!ids.has(v.id),'Unique visit id');ids.add(v.id);
 assert(c.encounters.some(e=>e.id===v.requires_encounter),'Authored introduction');
 assert(c.chapters.some(ch=>ch.index===v.chapter),'Real chapter');
 assert(m.sites.some(s=>s.id===v.site_id),'Real site');
 assert(a.assets.some(x=>x.id===v.scene_asset_id),'Registered room');
 assert(v.choices.length>=2,'Two authored answers plus leave');
 assert.equal(new Set(v.choices.map(x=>x.id)).size,v.choices.length);
 for(const ch of v.choices)assert(ch.effects.every(e=>e.startsWith('memory:')),'Short visits only record memories');
}
const app=await read('../js/v3/app.js');
for(const id of ['cast3d-jaska-v01','cast3d-toko-v01','presenter-arvo-linde-v05']){
 assert(app.includes(id));assert(a.assets.some(x=>x.id===id),'Registered speaker');
}
assert((await read('../index.html')).includes('ACT I · v4.47'));
console.log('PASS: optional visit content, chapter/site/art links, memory-only effects, registered speakers and release marker');

