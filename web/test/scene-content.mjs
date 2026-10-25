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
const app=await read('../js/v3/app.js?v=45');
for(const id of ['cast3d-jaska-v01','presenter-arvo-linde-v05']){
 assert(app.includes(id));assert(a.assets.some(x=>x.id===id),'Registered speaker');
}
// Toko is the paper rig over the empty bar (owner, 2026-10-21), not the 3D speaker: the app mounts it, the stage names
// the registered rig, and the rig's plate is the empty bar every Toko scene points at.
const stage=await read('../js/v3/toko-stage.js');
assert(app.includes("from './toko-stage.js?v=1'")&&app.includes('data-toko-stage'),'Toko stage mounted by the app');
const rig=a.assets.find(x=>x.id==='scene-toko-rig-v01');
assert(rig&&stage.includes("'scene-toko-rig-v01'"),'Registered Toko rig');
assert.equal(rig.plate_asset_id,'scene-toko-noodles-empty-v01','Rig drawn over the empty bar');
assert(c.encounters.concat(c.optional_visits??[]).filter(e=>e.participants?.includes('toko')).every(e=>e.scene_asset_id===rig.plate_asset_id),'Every Toko scene is the empty bar');
for(const part of ['torso','head','hood_bare','brow_l','brow_r','eye_l','eye_r','counter','fore_r','note','hand_l'])assert(rig.members.some(m=>m.part===part),`rig part ${part}`);
assert((await read('../index.html')).includes('ACT I · v4.78'));
const fight=await read('../fight-module/main.js');
assert(!fight.includes('loadFighters('),'playable fight routes never load candidate meshes');
assert(fight.includes('makeActor({placeholder:true},u,world)'),'playable fight routes always build stand-ins');
// One stand-in runtime: the three pages ask for the same main.js token (a
// literal here went stale the first time the module moved, v4.75).
const runtimeToken=(await read('../fight-module/index.html')).match(/main\.js\?v=(\d+)/)?.[1];
assert(runtimeToken,'fight-module names its runtime token');
for(const page of ['../fight-module/index.html','../bear-path/index.html','../arena-lab/index.html']){
  assert((await read(page)).includes(`main.js?v=${runtimeToken}`),'shared stand-in runtime cache token');
}
assert((await read('../crew-run/startup.js')).includes(`main.js?v=${runtimeToken}`),'Night Shift uses the shared stand-in runtime');
console.log('PASS: optional visit content, chapter/site/art links, memory-only effects, registered speakers and release marker');

