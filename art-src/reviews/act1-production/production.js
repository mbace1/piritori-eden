import { CUTINS, REST, rigParts, drawFigure } from '../../../web/js/v3/cutin-stage.js';
const ROOT=new URL('../../../',import.meta.url),$=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const read=async path=>{const r=await fetch(new URL(path,import.meta.url));if(!r.ok)throw Error(`${path}: ${r.status}`);return r.json();};
const [locationData,characterData,sequence,manifest]=await Promise.all([read('locations.json'),read('characters.json'),read('order.json'),read('../../../art/v3/manifest.json')]);
const normalize=rows=>(rows||[]).map(p=>({...p,name:p.name||p.label||p.id}));
const lists={locations:normalize(locationData.locations),characters:normalize(characterData.characters)},deferred={locations:normalize(locationData.deferredExisting),characters:normalize(characterData.deferredExisting)};
const assets=new Map(manifest.assets.map(a=>[a.id,a]));let tab='order',selected=null,stage='approach',renderToken=0;
const STAGES={approach:'Approach',dialogue:'Dialogue',decision:'Decision',tactical:'C.19 handoff',return:'Return'};
const listText=items=>{const ul=el('ul');for(const text of items||[])ul.append(el('li',typeof text==='string'?text:JSON.stringify(text)));return ul;};
const link=(text,url)=>{const a=el('a',text);a.href=url;return a;};
$('counts').append(el('span',`${lists.locations.length} listed location / context packets`),el('span',`${lists.characters.length} listed cast / role packets`),el('span',`${sequence.stages.length} production stages`));
function targetLinks(parent,entry){
 const box=el('div',null,'actions');
 for(const id of entry.encounters||[])box.append(link(id,`../act1-encounters/#${id}`));
 for(const anchor of entry.anchors||[]){const packet=lists.locations.find(p=>(p.anchorIds||[]).includes(anchor));if(packet)box.append(link(`Place: ${packet.name}`,`#locations:${encodeURIComponent(packet.id)}`));}
 for(const id of entry.characters||[]){const packet=lists.characters.find(p=>p.id===id);if(packet)box.append(link(`Cast: ${packet.name}`,`#characters:${encodeURIComponent(packet.id)}`));}
 for(const href of entry.reviewLinks||[])box.append(link(href.includes('blink-comparison')?'Blink comparison':href.includes('scene-club')?'Scene Club motion':href.includes('combat')?'Combat evidence':href.includes('chapter')?'Chapter rehearsal':href.includes('consequences')?'Consequences':'Related review',href));
 if(box.childNodes.length)parent.append(box);
}
for(const entry of sequence.stages){const row=el('article',null,'stage');row.dataset.stage=entry.id;const body=el('div'),meta=el('div',null,'meta');meta.append(el('span',entry.id),el('span',`Milestone ${entry.milestone}`),el('span','Listed scope'));body.append(meta,el('h3',entry.title),el('p',entry.boundary));targetLinks(body,entry);if(entry.dependencies?.length)body.append(el('p',`After: ${entry.dependencies.join(' · ')}`,'muted'));const work=el('div');work.append(el('strong','Deliver'),listText(entry.deliverables),el('strong','Passes when'),listText(entry.checks));row.append(body,work);$('order').append(row);}
$('expansion-copy').append(el('p',sequence.expansion.boundary),listText(sequence.expansion.conditions));
function showTab(next){tab=next;$('order-panel').hidden=tab!=='order';$('browse-panel').hidden=tab==='order';document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));if(tab!=='order')renderList();}
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{selected=null;$('search').value='';$('scope').value='active';location.hash=b.dataset.tab;showTab(b.dataset.tab);};
function current(){return $('scope').value==='deferred'?deferred[tab]:lists[tab];}
function renderList(){
 const q=$('search').value.trim().toLowerCase(),rows=[...current()].sort((a,b)=>(a.priority||99)-(b.priority||99)||a.name.localeCompare(b.name)).filter(p=>!q||JSON.stringify(p).toLowerCase().includes(q));
 $('records').replaceChildren();$('record-count').textContent=`${rows.length} ${$('scope').value==='deferred'?'deferred existing references':'listed packets'}`;
 if(!rows.some(p=>p.id===selected))selected=rows[0]?.id;
 for(const p of rows){const b=el('button',p.name);b.type='button';b.dataset.record=p.id;b.setAttribute('aria-pressed',String(p.id===selected));b.append(el('small',`${p.kind||p.status||'Location'} · priority ${p.priority||'later'}`));b.onclick=()=>{select(p.id);if(innerWidth<560)requestAnimationFrame(()=>$('detail').scrollIntoView({block:'start',behavior:'instant'}));};$('records').append(b);}
 renderDetail(rows.find(p=>p.id===selected));
}
function select(id){selected=id;location.hash=`${tab}:${encodeURIComponent(id)}`;renderList();}
const humanSvg='<svg viewBox="0 0 120 155" aria-hidden="true"><circle cx="60" cy="31" r="23" fill="currentColor"/><path d="M22 148L25 92Q29 63 60 63Q91 63 95 92L98 148Z" fill="currentColor"/></svg>';
function placeholder(packet){const box=el('div',null,`placeholder ${packet.kind||''}`);box.append(el('span',tab==='locations'?'LAYOUT PLACEHOLDER · NOT FINISHED SCENERY':'ROLE PLACEHOLDER · NO NEW IDENTITY','tag'));if(packet.kind!=='offscreen'){const icon=el('div');icon.innerHTML=humanSvg;box.append(icon);}box.append(el('strong',packet.kind==='offscreen'?'Intentionally offscreen':packet.name));if(packet.kind==='group')box.append(el('p','Group / occupied-space marker; actual membership and count come from the scene or campaign.'));box.append(el('p',packet.placeholders?.[0]||'Use the existing authored context; source selection and composition remain review work.'));return box;}
async function reference(packet,container,token){
 if(packet.kind==='offscreen'){container.append(el('strong','Keep this participant offscreen'),el('p','An existing identity reference does not authorize a portrait or new appearance in this authored beat.','muted'));targetLinks(container,packet);return;}
 const ids=tab==='characters'?(packet.existingRigIds||[]):[];const cut=Object.entries(CUTINS).find(([,c])=>ids.includes(c.rig));
 if(cut){const asset=assets.get(cut[1].rig),images={};await Promise.all(asset.members.map(m=>new Promise((ok,no)=>{const img=new Image();img.onload=()=>{images[m.part]=img;ok();};img.onerror=()=>no(Error(`Source member failed: ${m.file}`));img.src=new URL(`art/v3/${m.file}`,ROOT);})));if(token!==renderToken)return;const rig=rigParts(asset,images),canvas=el('canvas');canvas.width=420;canvas.height=470;const g=canvas.getContext('2d');g.fillStyle='#111a1e';g.fillRect(0,0,420,470);const scale=Math.min(410/rig.size[0],455/rig.size[1]);drawFigure(g,rig,REST,(420-rig.size[0]*scale)/2,470-rig.size[1]*scale,scale);container.replaceChildren(canvas,el('p',`Registered rest-pose reference · ${asset.approval_status} · ${asset.id}`,'muted'));return;}
 if(tab==='characters'&&ids.length){container.append(el('strong','Registered rig available'),el('p','Use the existing authored stage to review its framing. This packet does not assign a new standalone portrait.','muted'));targetLinks(container,packet);return;}
 const chosen=(packet.assets||[]).map(a=>assets.get(a.id)).find(a=>a?.file&&/\.(webp|png|jpg|jpeg)$/i.test(a.file));
 if(chosen){const figure=el('figure'),img=el('img');img.alt=`Existing registered source reference for ${packet.name}`;img.src=new URL(`art/v3/${chosen.file}`,ROOT);figure.append(img,el('figcaption',`${chosen.id} · ${chosen.approval_status} · ${chosen.production_status||'registered source'} · reference only, not a new binding`));container.append(figure);return;}
 container.append(el('strong','Source selection / existing review'),el('p','No standalone registered portrait is assigned here. Follow the listed source-selection work; a neutral role placeholder does not establish a face.','muted'));targetLinks(container,packet);
}
function renderDetail(packet){
 const token=++renderToken,root=$('detail');root.replaceChildren();if(!packet){root.append(el('p','No matching packet.'));return;}
 root.dataset.packet=packet.id;const head=el('div',null,'detail-head');head.append(el('span',packet.id,'tag'),el('h2',packet.name),el('p',packet.summary||''),el('p',packet.status||'Source-backed plan','muted'));root.append(head);
 if($('scope').value==='deferred')root.append(el('p','Existing reference only. This packet is deferred; it does not add an authored encounter, identity or location.','warning'));
 const previews=el('div',null,'preview-grid'),ref=el('div',null,'reference');previews.append(placeholder(packet),ref);root.append(previews);reference(packet,ref,token).catch(err=>{if(token===renderToken){ref.replaceChildren(el('p',err.message,'warning'));console.error(err);}});
 if(tab==='locations'){
  const tabs=el('div',null,'stage-tabs'),copy=el('div',null,'staging-copy');for(const [key,name] of Object.entries(STAGES)){const b=el('button',name);b.type='button';b.dataset.view=key;b.setAttribute('aria-pressed',String(stage===key));b.onclick=()=>{stage=key;renderDetail(packet);};tabs.append(b);}root.append(tabs);const text=packet.views?.[stage];copy.append(el('strong',`${STAGES[stage]} · proposed production view`),el('p',typeof text==='string'?text:JSON.stringify(text||'Unbuilt: retain the authored context until a source-backed composition is reviewed.')));if(stage==='tactical')copy.append(el('p','Keep the actual C.19 3D arena, fighters and receipt bridge. This plan does not resolve combat.'),link('Inspect real C.19 evidence','../act1-combat/'));root.append(copy);
 }else{root.append(el('h3','Motion and presence requirements'),listText(packet.animationNeeds||[]));}
 const columns=el('div',null,'columns'),next=el('div'),accept=el('div');next.append(el('h3','Next production actions'),listText(packet.plan?.nextSteps||[]));accept.append(el('h3','Acceptance'),listText(packet.plan?.acceptance||[]));columns.append(next,accept);root.append(columns,el('h3','Must preserve'),listText(packet.plan?.mustPreserve||[]));
 if(packet.placeholders?.length)root.append(el('h3','Still placeholder / unresolved'),listText(packet.placeholders));
 if(packet.encounters?.length){root.append(el('h3','Authored appearances'));targetLinks(root,packet);}
 if(packet.sourceCandidates?.length){const details=el('details');details.append(el('summary','Existing source candidates — selection is not approval'),listText(packet.sourceCandidates.map(s=>typeof s==='string'?s:JSON.stringify(s))));root.append(details);}
 const details=el('details');details.append(el('summary','Source / asset references'));const links=el('div',null,'links');for(const source of packet.sources||[])links.append(link(source,new URL(source,ROOT)));details.append(links);for(const a of packet.assets||[])details.append(el('p',`${a.id} · ${a.approval||a.approval_status||'status in register'} · ${a.production||a.production_status||'readiness separate'}`,'muted'));root.append(details);
 window.__productionAtlas.selected=packet.id;
}
function fromHash(){const raw=location.hash.slice(1),colon=raw.indexOf(':');if(colon<0){if(raw==='order'||lists[raw])showTab(raw);return;}const kind=raw.slice(0,colon),id=decodeURIComponent(raw.slice(colon+1));if(!lists[kind])return;tab=kind;selected=id;if(deferred[kind].some(p=>p.id===id))$('scope').value='deferred';else $('scope').value='active';showTab(tab);}
$('filters').onsubmit=e=>e.preventDefault();$('search').oninput=renderList;$('scope').onchange=()=>{selected=null;renderList();};
window.__productionAtlas={ready:true,get tab(){return tab},selected:null,locations:lists.locations.length,characters:lists.characters.length,stages:sequence.stages.length,expansion:sequence.expansion.status};
addEventListener('hashchange',fromHash);if(location.hash)fromHash();else showTab('order');
