import {missionCue} from '../fight-module/readability.js?v=1';
import {LOCATIONS,locationId} from './locations.js?v=3';
import {SAVE_KEY,newRun,available,rescueTarget,configure,toggleCrew,launch,launchConfig,waitNight,callReserve,makeMission,restoreMission,missionCheckpoint,settle,continueRun,loadRun} from './run.js?v=8';
import {icon} from './icons.js?v=2';
import {coordinate} from '../fight-module/tactics.js?v=7';
const $=id=>document.getElementById(id),text=(tag,value,className)=>{const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;};
const dist=(a,b)=>{const[x,y]=a.split(',').map(Number),[u,v]=b.split(',').map(Number);return Math.abs(x-u)+Math.abs(y-v);};
export function mountCrew({content,button,replaceSession,getSession,refresh,run,tile}){
 let state,storageOK=true,loadError='',portrait=()=>'';
 function face(p){const wrap=document.createElement('span');wrap.className='unit-portrait';const src=portrait(p);if(src){const img=document.createElement('img');img.src=src;img.alt='';img.width=80;img.height=94;wrap.append(img);}return wrap;}
 function stamp(value,kind=''){return text('span',value,'state-stamp '+kind);}
 function pictButton(label,kind,fn,attrs={}){const b=button(label,fn,attrs);b.prepend(icon(kind));return b;}
 function equip(p){$('loadout-name').textContent=p.name;const area=$('loadout-content');area.replaceChildren(face(p),text('p',p.traits[0]||'','memory'),gearChoices(p,'equipment',[['baseball-bat','Bat','Breaks guard in close combat.'],['folding-knife','Knife','Close range. Bypasses one guard.'],['first-handgun','Handgun','Ranged. Four rounds. Each shot adds pressure.']]),gearChoices(p,'kit',[['boots','Escape boots','Spend Action for a second Move after moving.'],['medical','Field kit','Help restores 3 HP. Treat one adjacent ally once.'],['light','Light pack','One self bandage. Restores 2 HP.']]));$('loadout-name').tabIndex=-1;$('loadout-dialog').showModal();$('loadout-name').focus({preventScroll:true});}
 function gearChoices(p,key,choices){
  const field=document.createElement('fieldset');field.className='gear-choices';field.append(text('legend',key==='kit'?'SUPPORT':'WEAPON'));const cards=document.createElement('div');cards.className='gear-options';const note=text('p',choices.find(c=>c[0]===p[key])[2],'gear-effect');
  for(const [value,label,effect]of choices){const b=pictButton(label,value,()=>{act(()=>configure(state,p.id,{[key]:value}));for(const el of cards.children)el.setAttribute('aria-pressed',String(el.dataset.value===value));note.textContent=effect;},{'aria-pressed':String(p[key]===value),'data-value':value,'aria-label':p.name+' '+label});cards.append(b);}field.append(cards,note);return field;
 }
 function crewCard(p,ready,picked){
  const card=document.createElement('article');card.dataset.person=p.id;card.className='crew-card'+(picked&&ready?' picked':'')+(!ready?' unavailable':'');card.style.setProperty('--crew-color','#'+p.color.toString(16).padStart(6,'0'));
  const identity=document.createElement('div');identity.className='crew-card-title';const name=document.createElement('div');name.append(text('h3',p.name),text('p',p.missing?'Missing':!ready?'Resting · outing '+p.readyAt:p.equipment==='first-handgun'?'Handgun / ranged':p.equipment==='folding-knife'?'Knife / close range':'Bat / breaks guard','crew-role'));identity.append(face(p),name);card.append(identity);
  if(ready){const controls=document.createElement('div');controls.className='crew-pick';const pick=button(picked?'Selected':'Choose crew',()=>act(()=>toggleCrew(state,p.id)),{'aria-pressed':String(picked),'data-crew':p.id});pick.disabled=!picked&&state.selected.length>=3;controls.append(pick,button('Equip',()=>equip(p),{'aria-label':'Equip '+p.name}));card.append(controls);}
  else card.append(stamp(p.missing?'RECOVER':'RESTING',p.missing?'missing':'resting'));const record=document.createElement('div');record.className='crew-record';record.append(text('p',`${p.fights} outings survived · ${p.wounds} wounds`),text('p',p.aptitudes.slice(0,2).join(' / '),'aptitudes'));if(p.memories[0])record.append(text('p',p.memories[0],'crew-memory'));card.append(record);return card;
 }
 function rules(){const d=document.createElement('details');d.className='field-notes';d.append(text('summary','Field notes · costs & pressure'));for(const line of ['Each person gets one Move and one Action, in either order.','Help an adjacent fallen ally once. Field kit: 3 HP; other kits: 1 HP.','Extract uses Action at any south-edge cell. Leave opponents alive if you can.','Pressure: enemy turn +1, gunshot +1, anyone down +2. At 5, arrivals are announced at A8 / F8 before entry. They cannot attack on entry.'])d.append(text('p',line));return d;}
 function paintBattle(b,u){
  const selected=$('selected-unit');selected.replaceChildren();if(!u)return;selected.append(face(u));const info=document.createElement('div');info.className='selected-info';info.append(text('h2',u.name));const vitality=text('p',`HP ${u.hp}/${u.maxHp} · GUARD ${u.guard}${u.maxAmmo?' · AMMO '+u.ammo+'/'+u.maxAmmo:''}`,'vitality');const segments=document.createElement('span');segments.className='condition-pips';segments.setAttribute('aria-hidden','true');for(let i=0;i<u.maxHp;i++)segments.append(text('i','',i<u.hp?'filled':''));vitality.append(segments);info.append(vitality);const budget=document.createElement('p');budget.className='action-budget';budget.append(stamp(u.evacuated?'HOME':!u.alive?'DOWN':b.moved.includes(u.id)?'MOVE USED':'MOVE READY',b.moved.includes(u.id)?'used':''),stamp(!u.alive?'':b.acted.includes(u.id)?'ACTION USED':'ACTION READY',b.acted.includes(u.id)?'used':''));info.append(budget);selected.append(info);
  for(const el of document.querySelectorAll('#roster button')){const p=b.players.find(p=>p.id===el.dataset.unitid);el.setAttribute('aria-label',`${p.label} · ${p.name} · HP ${p.hp}/${p.maxHp} · ${p.evacuated?'home':p.alive?'select crew':'down'}`);el.replaceChildren(face(p),text('span',p.name.split(' ')[0],'roster-name'),text('small',p.evacuated?'HOME':!p.alive?'DOWN':`${p.hp}/${p.maxHp}`));el.classList.toggle('home',!!p.evacuated);}
  for(const el of document.querySelectorAll('#actions [data-action]')){const type=el.dataset.action;el.hidden=type==='reload'&&!u.maxAmmo||type==='item'&&!u.itemIds?.length;if(!el.querySelector('svg')){el.prepend(icon(type==='attack'?u.equipment:type==='item'?'medical':type));el.append(text('small','','command-cost'));}const spent=type==='move'?b.moved.includes(u.id):b.acted.includes(u.id);el.querySelector('.command-cost').textContent=spent?'USED':type==='move'?'1 MOVE':'1 ACTION';}
  $('actions').querySelector('[data-action=attack] svg')?.replaceWith(icon(u.equipment));$('actions').style.setProperty('--command-count',document.querySelectorAll('#actions [data-action]:not([hidden])').length);
  $('phase').textContent=b.status!=='active'?'COMPLETE':document.body.classList.contains('resolving')?'RESOLVING':'YOUR TURN';
 }
 try{state=loadRun(localStorage.getItem(SAVE_KEY),content);}catch(e){loadError='The saved outing could not be resumed. A fresh preview is open; the old save is retained until you start an outing.';state=newRun();}
 const save=()=>{if(loadError)return false;try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));storageOK=true;return true;}catch{storageOK=false;return false;}};
 function preview(){let s;try{s=state.active?restoreMission(content,state.active.config,state.active.checkpoint):makeMission(content,launchConfig(state));}catch{const fresh=newRun();s=makeMission(content,launchConfig(fresh));}return s;}
 function act(fn){const focus=document.activeElement?.dataset.crew,scroll=$('crew-screen').scrollTop;fn();save();refresh();if(focus)document.querySelector(`[data-crew="${focus}"]`)?.focus({preventScroll:true});$('crew-screen').scrollTop=scroll;}
 function deploy(){try{const config=launch(state),s=makeMission(content,config);state.active.checkpoint=missionCheckpoint(s);loadError='';save();replaceSession(s);refresh();}catch(e){$('crew-message').textContent=e.message;}}
 function render(busy){
  const b=getSession().battle,menu=state.phase!=='battle'&&!busy;document.body.classList.toggle('crew-menu',menu);$('crew-screen').hidden=!menu;$('mission-bar').hidden=menu;
  for(const id of ['fixtures','secondary','result'])$(id).hidden=true;
  if(menu){
   $('outing-options').replaceChildren();
   const screen=$('crew-content'),scroll=$('crew-screen').scrollTop;screen.replaceChildren();$('crew-message').textContent=loadError||(!storageOK?'Saving unavailable · keep this tab open':'Saved on this browser');
   $('crew-night').textContent=`KALLIO 2003 / NIGHT ${String(state.night).padStart(2,'0')}`;
   const left=document.createElement('section');left.className='mission-copy';const ledger=document.createElement('section');ledger.className='crew-ledger';
   if(state.phase==='aftermath'){
    const last=state.last;left.append(text('p','THE WAY HOME','eyebrow'),text('h2',last.title),text('p',last.text,'lead'));ledger.append(text('p','AFTERMATH / CREW LEDGER','eyebrow'));
    const grid=document.createElement('div');grid.className='aftermath-grid';for(const c of last.changes){const p=state.crew.find(p=>p.id===c.id),card=document.createElement('article');card.className='consequence';card.append(face(p));const info=document.createElement('div');info.append(text('h3',c.name),text('p',c.state),text('small',c.kit));card.append(info,stamp(c.state.startsWith('Missing')?'MISSING':c.state.startsWith('Wounded')?'REST':'HOME',c.state.startsWith('Missing')?'missing':''));grid.append(card);}ledger.append(grid,text('p',`${last.rounds} rounds · pressure ${last.heat}. Wounded crew rest for one outing. Missing colleagues need recovery.`,'aftermath-note'),button('Plan next outing',()=>act(()=>{continueRun(state);replaceSession(preview());}),{class:'primary',id:'crew-next'}));
   }else{
    const target=rescueTarget(state);left.append(text('p',LOCATIONS[locationId()].toUpperCase(),'eyebrow'),text('h2',target?'Bring them home.':'Pick up the pieces.'),text('p',target?`${target.name} is stranded by the ${state.night%2?'north cover':'east cover'}. Get them up. Bring the crew out through the south gate.`:'Recover the kit inside the arena, then bring your crew home.','lead'));
    const note=document.createElement('div');note.className='route-note';note.append(icon(target?'help':'kit'),text('strong',target?'REACH → HELP → EXTRACT':'RECOVER → EXTRACT'),text('p','A way out matters more than a cleared arena.'));left.append(note,rules());const field=document.createElement('label');field.className='location-choice';field.append(text('span','SCENERY PILOT'));const select=document.createElement('select');select.setAttribute('aria-label','Arena location');for(const [id,name]of Object.entries(LOCATIONS)){const o=document.createElement('option');o.value=id;o.textContent=name;o.selected=id===locationId();select.append(o);}select.disabled=!storageOK||!!loadError;select.addEventListener('change',()=>{if(!save()){select.value=locationId();refresh();return;}const url=new URL(location.href);url.searchParams.set('arena',select.value);location.assign(url.href);});field.append(select,text('small','Same outing rules. Fictional staging, not campaign travel.'));left.append(field);
    const n=available(state).filter(p=>state.selected.includes(p.id)).length,heading=document.createElement('div');heading.className='ledger-heading';heading.append(text('h2','Who’s coming?'),stamp(`${n} / 3 CHOSEN`));ledger.append(text('p','CREW / EQUIPMENT','eyebrow'),heading,text('p','Choose two or three. Equip each before leaving.','ledger-intro'));
    const grid=document.createElement('div');grid.className='crew-grid';for(const p of state.crew){const ready=available(state).some(v=>v.id===p.id);grid.append(crewCard(p,ready,state.selected.includes(p.id)));}ledger.append(grid);
    const footer=document.createElement('div');footer.className='crew-deploy';const go=pictButton(`Start outing · ${n} crew`,'end',deploy,{class:'primary',id:'crew-deploy'});go.disabled=n<2||n>3;footer.append(go,pictButton('Take a recovery night','rest',()=>act(()=>{waitNight(state);replaceSession(preview());}),{class:'quiet'}));if(available(state).length<2)footer.append(button('Call a reserve',()=>act(()=>{callReserve(state);replaceSession(preview());})));ledger.append(footer);
    if(state.ledger.length){const details=document.createElement('details');details.append(text('summary','Crew history'));for(const item of state.ledger.slice(0,6))details.append(text('p',`${item.title} — ${item.text}`));ledger.append(details);}
   }
   screen.append(left,ledger);$('crew-screen').scrollTop=scroll;return;
  }
  paintBattle(b,b.players.find(p=>p.id===b.selectedId));

  const m=b.mission,u=b.players.find(p=>p.id===b.selectedId),target=b.players.find(p=>p.id===m.targetId),carrier=b.players.find(p=>p.id===m.carrierId),goal=missionCue(b,coordinate).goal;
  $('mission-goal').textContent=goal;$('mission-pressure').textContent=m.arrived?'RIVALS ENTERED':m.arrival?`ARRIVALS: AFTER TURN ${m.arrival.afterRound} · A8 / F8`:`PRESSURE ${m.heat}/5`; $('mission-pressure').dataset.hot=String(!!m.arrival);
  $('mission-count').textContent=`${b.players.filter(p=>p.evacuated).length}/${b.players.length} HOME${storageOK?'':' · SAVING UNAVAILABLE'}`;
  for(let x=0;x<6;x++)tile(`${x},0`,0x38b8c8,.08);if(target&&!target.evacuated)tile(target.cell,0xffdb80,.5);if(!target&&!m.recovered)tile(m.targetCell,0xffdb80,.5);if(m.arrival&&!m.arrived)for(const c of m.arrival.cells)tile(c,0xee8f74,.48);
  const commands=$('mission-actions');commands.replaceChildren();const can=!busy&&b.status==='active'&&u?.alive&&!b.acted.includes(u.id);
  function cmd(label,type,value,enabled=true){const el=button(label,()=>run(type,value),{'data-mission-action':type,'aria-label':label});el.prepend(icon(type==='sprint'?'boots':type==='aid'?'medical':type==='recover'?'kit':type));el.append(text('small','1 ACTION','command-cost'));el.disabled=!can||!enabled;el.hidden=!enabled;commands.append(el);}
  cmd('Extract · south edge','extract',undefined,u?.cell.endsWith(',0'));
  if(u?.kit==='boots')cmd('Sprint · spend Action','sprint',undefined,b.moved.includes(u.id));
  if(!target&&!m.recovered)cmd('Recover kit','recover',undefined,u&&dist(u.cell,m.targetCell)<=1);
  for(const p of b.players.filter(p=>p.id!==u?.id&&!p.evacuated)){
   if(!p.alive&&!p.helped)cmd(`Help ${p.name}`,'help',p.id,u&&dist(u.cell,p.cell)<=1);
   if(u?.kit==='medical'&&p.alive&&p.hp<p.maxHp)cmd(`Treat ${p.name} +3 HP`,'aid',p.id,!u.medicalUsed&&dist(u.cell,p.cell)<=1);
  }
  const retreat=button('Withdraw from outing…',()=>{$('help-dialog').close();$('retreat-dialog').showModal();});retreat.setAttribute('aria-label','Retreat with standing crew');retreat.className='withdraw-command';retreat.disabled=busy||b.status!=='active';const end=$('end');$('outing-options').replaceChildren(retreat);$('utility-actions').replaceChildren(end);

 }
 $('confirm-retreat').replaceWith(button('Retreat now',()=>{$('retreat-dialog').close();run('withdraw');},{id:'confirm-retreat'}));
 return {setPortraitSource(fn){portrait=fn;},initial:preview,render,state:()=>copyState(),inBattle:()=>state.phase==='battle',commit(s){if(state.phase==='battle'){state.active.checkpoint=missionCheckpoint(s);settle(state,s);save();}},persist(){if(state.phase==='battle')state.active.checkpoint=missionCheckpoint(getSession());save();}};
 function copyState(){return structuredClone(state);}
}
