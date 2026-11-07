import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
const root=new URL('../../../',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const manifest=JSON.parse(fs.readFileSync(new URL('./encounter-manifest.json',import.meta.url),'utf8')),content=read('content/era1-slice-v1.json'),art=read('art/v3/manifest.json');
const proposals=read('art-src/reviews/act1-encounters/binding-proposals.json');
for(const [file,sha] of [[proposals.source.content,proposals.source.content_sha256],[proposals.source.manifest,proposals.source.manifest_sha256]])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex'),sha,'stale binding source '+file);
assert.equal(manifest.encounters.length,17);assert.equal(new Set(manifest.encounters.map(e=>e.id)).size,17);
for(const [p,hash]of Object.entries(manifest.source_sha256))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(p,root))).digest('hex'),hash,`stale source ${p}`);
let checked=0;
for(const e of manifest.encounters){const canonical=content.encounters.find(c=>c.id===e.id);assert(canonical);assert.equal(e.opening,canonical.opening);assert.deepEqual(e.choices,canonical.choices.map(c=>({id:c.id,label:c.label,forecast:c.forecast,requirements:c.requirements,effects:c.effects})));assert.equal(e.direct_scene_asset_id,canonical.scene_asset_id??null);assert.deepEqual(e.participants,canonical.participants);
 if(e.preview_scene_asset_id){const a=art.assets.find(a=>a.id===e.preview_scene_asset_id);assert(a);assert.equal(e.preview_source.approval_status,a.approval_status);assert.equal(e.preview_source.production_status,a.production_status);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('art/v3/'+a.file,root))).digest('hex'),a.sha256);checked++;}
 for(const p of e.cast_placeholders??[])assert(canonical.participants.includes(p.participant_id),'invented participant');
}
const sale=manifest.encounters.find(e=>e.id==='enc-first-sale');assert.equal(sale.binding_status,'unbuilt');assert.equal(sale.preview_scene_asset_id,null,'no illicit first sale staged inside bank');
const court=manifest.encounters.find(e=>e.id==='enc-courtyard-last-call');assert.equal(court.authored_site_id,'torkkelinmaki_courtyard');assert.equal(court.site_anchor,'torkkelinmaki');assert.equal(court.schedule_anchor,court.site_anchor);assert(court.participants.includes('jaska-offscreen'));assert(court.uncertainty,'unapproved art/staging must remain explicit');
assert.equal(manifest.encounters.filter(e=>e.choices.some(c=>c.effects.some(x=>x.startsWith('start-battle:')))).length,2);
const js=fs.readFileSync(new URL('./gallery.js',import.meta.url),'utf8');assert(!/import .*state\.js/.test(js));assert(js.includes(manifest.review_storage_key));assert(!js.includes('battle-3v3'));
console.log(`PASS gallery source audit: 17 exact authored encounters, ${checked} hash-verified plate references, labelled placeholders, first-sale/courtyard constraints and 2 actual combat branches`);
