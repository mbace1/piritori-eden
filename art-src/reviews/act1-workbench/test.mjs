import assert from 'node:assert/strict';
import fs from 'node:fs';
const here=new URL('./',import.meta.url),root=new URL('../../../',import.meta.url);
const p=JSON.parse(fs.readFileSync(new URL('packets.json',here)));
assert.equal(p.estimate,48,'review cannot manufacture a new completion score');
assert.equal(new Set(p.tasks.map(t=>t.id)).size,p.tasks.length,'unique work packets');
assert(p.tasks.length>=30,'broad chapter plan rather than one scene');
for(const t of p.tasks){
 for(const key of ['title','lane','change','acceptance','boundary','status'])assert(t[key]?.trim(),`${t.id}: ${key}`);
 assert(t.milestone>=1&&t.milestone<=7,`${t.id}: existing roadmap milestone`);
 assert(t.sources.length,`${t.id}: source-backed`);
 for(const source of t.sources)assert(fs.existsSync(new URL(source,root)),`${t.id}: missing source ${source}`);
}
assert.equal(p.previews.length,6);
assert(p.previews.every(x=>x.href&&x.status&&x.description));
assert(fs.existsSync(new URL('../../../design/evidence/quiet-map-2026-11-07/map-after-phone.png',import.meta.url)));
console.log(`PASS workbench data: ${p.tasks.length} bounded source-backed packets, six previews, existing milestones, fixed estimate`);
