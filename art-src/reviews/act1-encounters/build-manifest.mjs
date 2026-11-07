// Deterministic review manifest writer. Reads canon; writes only the adjacent review JSON.
import fs from 'node:fs';import crypto from 'node:crypto';
const root=new URL('../../../',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const content=read('content/era1-slice-v1.json'),art=read('art/v3/manifest.json'),map=read('map/kallio-era1-2003-v1.json');
const bindings=JSON.parse(fs.readFileSync(new URL('./binding-proposals.json',import.meta.url),'utf8'));
const sources=Object.fromEntries(['content/era1-slice-v1.json','art/v3/manifest.json','map/kallio-era1-2003-v1.json','design/scenario-atlas.json'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(new URL(p,root))).digest('hex')]));
const assetMap=new Map(art.assets.map(a=>[a.id,a])),planMap=new Map(bindings.proposals.map(p=>[p.encounter_id,p]));
const encounters=content.encounters.slice().sort((a,b)=>content.schedule.findIndex(s=>s.encounter_id===a.id)-content.schedule.findIndex(s=>s.encounter_id===b.id)).map(e=>{
 const plan=planMap.get(e.id);if(!plan||plan.direct_scene_asset_id!==(e.scene_asset_id??null))throw Error('Stale or missing binding proposal: '+e.id);
 const previewId=e.scene_asset_id??plan.proposed_scene_asset_id,a=assetMap.get(previewId);if(previewId&&!a)throw Error('Unknown asset '+previewId);
 const slot=content.schedule.find(s=>s.encounter_id===e.id),site=map.sites.find(s=>s.id===e.site_id);
 return {id:e.id,day:slot.day,block:slot.block,schedule_anchor:slot.anchor_id,authored_site_id:e.site_id,site_anchor:site?.anchorId??null,opening:e.opening,choices:e.choices.map(c=>({id:c.id,label:c.label,forecast:c.forecast,requirements:c.requirements,effects:c.effects})),direct_scene_asset_id:e.scene_asset_id??null,preview_scene_asset_id:previewId??null,binding_status:plan.status,preview_source:a?{id:a.id,file:a.file,source:a.source,approval_status:a.approval_status,production_status:a.production_status,sha256:a.sha256}:null,participants:e.participants,cast_placeholders:plan.cast_placeholders,production_tasks:plan.production_tasks,uncertainty:plan.uncertainty,combat:plan.combat};
});
const out={schema:1,purpose:'Preview-only encounter source, binding and placeholder inventory; not runtime content or approval',campaign_state_used:false,review_storage_key:'piritori-review:act1-encounters:v1',source_sha256:sources,counts:{encounters:encounters.length,direct:encounters.filter(e=>e.binding_status==='direct').length,proposed_existing:encounters.filter(e=>e.binding_status==='proposed-existing').length,unbuilt:encounters.filter(e=>e.binding_status==='unbuilt').length},encounters};
fs.writeFileSync(new URL('./encounter-manifest.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log('Review manifest built:',JSON.stringify(out.counts));
