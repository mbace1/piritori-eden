// Source/DAG validation for the finite existing-content production sequence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const DIR=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(DIR,'../../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const content=read('content/era1-slice-v1.json'),map=read('map/kallio-era1-2003-v1.json');
const encounterIds=new Set(content.encounters.map(e=>e.id));
const characterIds=new Set([content.protagonist.id,...content.encounters.flatMap(e=>e.participants||[]),...content.optional_visits.flatMap(e=>e.participants||[]),...content.crew.map(c=>c.id),...content.chapters.flatMap(c=>c.narrative?.people?.map(p=>p.id)||[])]);
const anchorIds=new Set(map.anchors.map(a=>a.id)),requiredAnchors=new Set(content.schedule.map(s=>s.anchor_id).filter(Boolean));
const fields=['id','title','milestone','encounters','characters','anchors','dependencies','deliverables','checks','boundary','reviewLinks'];
const nonemptyText=(v,label)=>assert(typeof v==='string'&&v.trim(),label);
const strictKeys=(o,keys,label)=>assert.deepEqual(Object.keys(o).sort(),[...keys].sort(),label);
export function validateOrder(order){
 strictKeys(order,['schemaVersion','scope','stages','expansion'],'known top-level schema; no self-approval fields');
 assert.equal(order.schemaVersion,1);nonemptyText(order.scope,'scope');assert(Array.isArray(order.stages)&&order.stages.length>0&&order.stages.length<=32,'finite bounded stages');
 const stages=new Map();
 for(const [index,stage] of order.stages.entries()){
  strictKeys(stage,fields,'known stage schema; no self-approval fields');
  for(const field of ['id','title','milestone','boundary'])nonemptyText(stage[field],field);
  assert(!stages.has(stage.id),'unique stage ID');stages.set(stage.id,{stage,index});
  for(const [field,known] of [['encounters',encounterIds],['characters',characterIds],['anchors',anchorIds]]){
   assert(Array.isArray(stage[field]),field);assert.equal(new Set(stage[field]).size,stage[field].length,'unique '+field);
   for(const id of stage[field])assert(known.has(id),`unknown source ${field}: ${id}`);
  }
  for(const field of ['dependencies','deliverables','checks','reviewLinks']){
   assert(Array.isArray(stage[field])&&(field==='dependencies'||stage[field].length>0),field);
   for(const text of stage[field])nonemptyText(text,field);
  }
  assert.equal(new Set(stage.dependencies).size,stage.dependencies.length,'duplicate dependency');
  for(const link of stage.reviewLinks){
   assert(!/^[a-z]+:/i.test(link),'review links are local relative paths');
   const target=path.resolve(DIR,decodeURIComponent(link.split(/[?#]/)[0]));
   assert(target.startsWith(ROOT+path.sep),'review link inside repository');
   assert(fs.existsSync(target),'missing review path: '+link);
   if(fs.statSync(target).isDirectory())assert(fs.existsSync(path.join(target,'index.html')),'review directory has index: '+link);
  }
 }
 const visited=new Set(),visiting=new Set();
 const visit=id=>{assert(stages.has(id),'unknown dependency: '+id);assert(!visiting.has(id),'dependency cycle');if(visited.has(id))return;visiting.add(id);for(const dep of stages.get(id).stage.dependencies)visit(dep);visiting.delete(id);visited.add(id)};
 for(const id of stages.keys())visit(id);
 for(const {stage,index} of stages.values())for(const dep of stage.dependencies)assert(stages.get(dep).index<index,'production sequence is topologically ordered');
 strictKeys(order.expansion,['status','conditions','boundary'],'known expansion schema; no automatic permission fields');
 assert.equal(order.expansion.status,'deferred');assert(Array.isArray(order.expansion.conditions)&&order.expansion.conditions.length>=4);order.expansion.conditions.forEach(c=>nonemptyText(c,'expansion condition'));nonemptyText(order.expansion.boundary,'expansion boundary');
 assert(/separate explicit owner\/design direction/.test(order.expansion.boundary),'expansion needs separate owner direction');
 assert(/no automatic permission/.test(order.expansion.conditions.join(' ')),'conditions never grant automatic permission');
 const production=order.stages.filter(s=>s.id!=='complete-run-device-release');
 const covered=key=>new Set(production.flatMap(s=>s[key]));
 for(const id of encounterIds)assert(covered('encounters').has(id),'missing encounter production coverage: '+id);
 for(const id of characterIds)assert(covered('characters').has(id),'missing cast/crew/group production coverage: '+id);
 for(const id of requiredAnchors)assert(covered('anchors').has(id),'missing authored anchor coverage: '+id);
 assert.equal(order.stages[0].id,'baseline-contract');assert.equal(order.stages[1].id,'scene-club-fidelity');assert.equal(order.stages[2].id,'courtyard-site-contract');
 assert(stages.get('courtyard-presentation').stage.dependencies.includes('courtyard-site-contract'),'court dressing waits for site contract');
 return {stages:order.stages.length,dependencies:order.stages.reduce((n,s)=>n+s.dependencies.length,0),encounters:covered('encounters').size,castCrewGroupIds:covered('characters').size,authoredAnchors:covered('anchors').size,expansion:order.expansion.status};
}
const order=read('art-src/reviews/act1-production/order.json'),before=JSON.stringify(order),summary=validateOrder(order);
assert.equal(JSON.stringify(order),before,'validation must not mutate plan');
let checks=2;
const rejects=(label,edit)=>{const bad=structuredClone(order);edit(bad);assert.throws(()=>validateOrder(bad),label);checks++};
rejects('unknown encounter',o=>o.stages[0].encounters.push('enc-invented'));
rejects('unknown character',o=>o.stages[0].characters.push('new-face'));
rejects('unknown place',o=>o.stages[0].anchors.push('new-district'));
rejects('missing dependency',o=>o.stages[1].dependencies.push('missing-stage'));
rejects('cycle',o=>o.stages[0].dependencies.push('complete-run-device-release'));
rejects('duplicate stage',o=>o.stages[1].id=o.stages[0].id);
rejects('empty deliverable',o=>o.stages[1].deliverables=[]);
rejects('missing review link',o=>o.stages[0].reviewLinks=['../not-built/']);
rejects('approval toggle',o=>o.stages[0].approved=true);
rejects('automatic expansion status',o=>o.expansion.status='ready');
rejects('silent source removal',o=>o.stages.forEach(s=>s.characters=s.characters.filter(c=>c!=='seller-esa')));
console.log(`Production order: ${checks} validator/mutation checks passed. ${JSON.stringify(summary)}`);
