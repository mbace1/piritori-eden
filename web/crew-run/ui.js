import {SAVE_KEY,KITS,newRun,available,rescueTarget,configure,toggleCrew,launch,launchConfig,waitNight,callReserve,makeMission,restoreMission,missionCheckpoint,settle,continueRun,loadRun} from './run.js?v=2';
import {coordinate} from '../fight-module/tactics.js?v=5';
const $=id=>document.getElementById(id),text=(tag,value,className)=>{const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;};
const dist=(a,b)=>{const[x,y]=a.split(',').map(Number),[u,v]=b.split(',').map(Number);return Math.abs(x-u)+Math.abs(y-v);};
export function mountCrew({content,button,replaceSession,getSession,refresh,run,tile}){
 let state,storageOK=true,loadError='';
 try{state=loadRun(localStorage.getItem(SAVE_KEY),content);}catch(e){loadError='The saved outing could not be resumed. A fresh preview is open; the old save is retained until you start an outing.';state=newRun();}
 const save=()=>{if(loadError)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));storageOK=true;}catch{storageOK=false;}};
 function preview(){let s;try{s=state.active?restoreMission(content,state.active.config,state.active.checkpoint):makeMission(content,launchConfig(state));}catch{const fresh=newRun();s=makeMission(content,launchConfig(fresh));}return s;}
 function act(fn){fn();save();refresh();}
 function deploy(){try{const config=launch(state),s=makeMission(content,config);state.active.checkpoint=missionCheckpoint(s);loadError='';save();replaceSession(s);refresh();}catch(e){$('crew-message').textContent=e.message;}}
 function selectBox(p,key,choices){const label=text('label',key==='kit'?'Support':'Weapon'),select=document.createElement('select');select.setAttribute('aria-label',`${p.name} ${key}`);for(const [v,n]of choices){const o=text('option',n);o.value=v;select.append(o);}select.value=p[key];select.addEventListener('change',()=>act(()=>configure(state,p.id,{[key]:select.value})));label.append(select);return label;}
 function render(busy){
  const b=getSession().battle,menu=state.phase!=='battle'&&!busy;document.body.classList.toggle('crew-menu',menu);$('crew-screen').hidden=!menu;$('mission-bar').hidden=menu;
  for(const id of ['fixtures','secondary','result'])$(id).hidden=true;
  if(menu){
   const screen=$('crew-content');screen.replaceChildren();$('crew-message').textContent=loadError||(!storageOK?'Saving is unavailable. Keep this tab open to retain the crew.':'Saved on this browser · authored campaign save stays separate');
   $('crew-night').textContent=`KALLIO 2003 / OUTING ${String(state.night).padStart(2,'0')}`;
   if(state.phase==='aftermath'){
    const last=state.last;screen.append(text('p','AFTERMATH','eyebrow'),text('h2',last.title),text('p',last.text,'lead'));
    const grid=document.createElement('div');grid.className='crew-grid';for(const c of last.changes){const card=document.createElement('article');card.className='crew-card consequence';card.append(text('h3',c.name),text('p',c.state),text('small',c.kit));grid.append(card);}screen.append(grid);
    screen.append(text('p',`${last.rounds} rounds · noise ${last.heat}. Wounded crew sit out one outing. Missing colleagues become recovery objectives. Down does not mean dead in this pilot.`),button('Plan next outing',()=>act(()=>{continueRun(state);replaceSession(preview());}),{class:'primary',id:'crew-next'}));
   }else{
    const target=rescueTarget(state);screen.append(text('p','CREW / LOADOUT / COMMITMENT','eyebrow'),text('h2',target?'Bring them home':'Pick up the pieces'),text('p',target?`${target.name} is stranded by the ${state.night%2?'north bench':'east path'}. Reach them, help them up, and get the crew through the south exit.`:'The crew made it home. Recover the lost kit near the park path, then extract your people.','lead'));
    const brief=document.createElement('div');brief.className='mission-brief';for(const [a,z]of [['01 / GET IN','Choose two or three people. Each gets one Move and one Action.'],['02 / HELP','Adjacent Help raises a fallen ally once. Medical kit restores 3 HP.'],['03 / GET OUT','Reach any south-edge cell and Extract. You can leave rivals standing.']]){const p=document.createElement('p');p.append(text('b',a),text('span',z));brief.append(p);}screen.append(brief);
    screen.append(text('p','Pressure: each enemy turn +1; each gunshot +1; each person down +2. At 5, two rival arrivals are announced before entering at A8 / F8. No surprise attack on entry.','pressure-rule'));
    const grid=document.createElement('div');grid.className='crew-grid';for(const p of state.crew){const ready=available(state).some(v=>v.id===p.id),picked=state.selected.includes(p.id),card=document.createElement('article');card.className='crew-card'+(picked&&ready?' picked':'')+(!ready?' unavailable':'');card.style.setProperty('--crew-color','#'+p.color.toString(16).padStart(6,'0'));
     const title=document.createElement('div');title.className='crew-card-title';title.append(text('span',p.name.split(' ').map(s=>s[0]).slice(0,2).join(''),'portrait-token'),text('h3',p.name));card.append(title,text('p',p.aptitudes.slice(0,2).join(' / '),'aptitudes'),text('small',p.missing?'MISSING · recovery needed':ready?`${p.fights} outings survived · ${p.wounds} recorded wounds`:`WOUNDED · ready outing ${p.readyAt}`));
     if(ready){const pick=button(picked?'Selected':'Choose crew',()=>act(()=>toggleCrew(state,p.id)),{'aria-pressed':String(picked),'data-crew':p.id});pick.disabled=!picked&&state.selected.length>=3;card.append(pick,selectBox(p,'equipment',[['baseball-bat','Bat · guard breaking'],['folding-knife','Knife · pierces 1 guard'],['first-handgun','Handgun · ranged / noisy']]),selectBox(p,'kit',Object.entries(KITS)));}
     card.append(text('p',p.traits[0]||'', 'memory'));
     if(p.memories.length)card.append(text('p',p.memories[0],'memory'));grid.append(card);
    }screen.append(grid);
    const footer=document.createElement('div');footer.className='crew-deploy';const n=available(state).filter(p=>state.selected.includes(p.id)).length,go=button(`Start outing · ${n} crew`,deploy,{class:'primary',id:'crew-deploy'});go.disabled=n<2||n>3;footer.append(go,button('Take a recovery night',()=>act(()=>{waitNight(state);replaceSession(preview());})));
    if(available(state).length<2)footer.append(button('Call a reserve',()=>act(()=>{callReserve(state);replaceSession(preview());})));screen.append(footer);
    if(state.ledger.length){const details=document.createElement('details');details.append(text('summary','Crew history'));for(const item of state.ledger.slice(0,6))details.append(text('p',`${item.title} — ${item.text}`));screen.append(details);}
   }
   screen.append(text('p','Connected gameplay pilot · temporary stand-ins and supplied training equipment. These repeatable outings test crew consequences; they are not new authored chapter missions.','pilot-note'));return;
  }
  const m=b.mission,u=b.players.find(p=>p.id===b.selectedId),target=b.players.find(p=>p.id===m.targetId),carrier=b.players.find(p=>p.id===m.carrierId),goal=target?(target.extracted?'Colleague extracted':target.alive?`Get ${target.name} to the south exit`:`Help ${target.name} at ${coordinate(target.cell)}`):carrier?`${carrier.name} carries the kit · extract them`:`Recover the kit at ${coordinate(m.targetCell)}`;
  $('mission-goal').textContent=goal;$('mission-pressure').textContent=m.arrived?'RIVALS ENTERED · new plans visible':m.arrival?`ARRIVALS AFTER ENEMY TURN ${m.arrival.afterRound} · A8 / F8`:`PRESSURE ${m.heat}/5 · gunshots +1 / down +2 / turn +1`;
  $('mission-count').textContent=`${b.players.filter(p=>p.evacuated).length}/${b.players.length} HOME · all survivors may extract; no need to clear the park${storageOK?'':' · SAVE UNAVAILABLE: KEEP TAB OPEN'}`;
  for(let x=0;x<6;x++)tile(`${x},0`,0x92d7bf,.38);if(target&&!target.evacuated)tile(target.cell,0xffdb80,.5);if(!target&&!m.recovered)tile(m.targetCell,0xffdb80,.5);if(m.arrival&&!m.arrived)for(const c of m.arrival.cells)tile(c,0xee8f74,.48);
  const commands=$('mission-actions');commands.replaceChildren();const can=!busy&&b.status==='active'&&u?.alive&&!b.acted.includes(u.id);
  function cmd(label,type,value,enabled=true){const el=button(label,()=>run(type,value),{'data-mission-action':type});el.disabled=!can||!enabled;commands.append(el);}
  cmd('Extract · south edge','extract',undefined,u?.cell.endsWith(',0'));
  if(u?.kit==='boots')cmd('Sprint · spend Action','sprint',undefined,b.moved.includes(u.id));
  if(!target&&!m.recovered)cmd('Recover kit','recover',undefined,u&&dist(u.cell,m.targetCell)<=1);
  for(const p of b.players.filter(p=>p.id!==u?.id&&!p.evacuated)){
   if(!p.alive&&!p.helped)cmd(`Help ${p.name}`,'help',p.id,u&&dist(u.cell,p.cell)<=1);
   if(u?.kit==='medical'&&p.alive&&p.hp<p.maxHp)cmd(`Treat ${p.name} +3 HP`,'aid',p.id,!u.medicalUsed&&dist(u.cell,p.cell)<=1);
  }
  const retreat=button('Retreat with standing crew',()=>{$('retreat-dialog').showModal();});retreat.disabled=busy||b.status!=='active';commands.append(retreat);
  for(const el of document.querySelectorAll('#roster button')){const p=b.players.find(p=>p.id===el.dataset.unitid);if(p.evacuated)el.querySelector('small').textContent='HOME · KIT SAFE';}
 }
 $('confirm-retreat').replaceWith(button('Retreat now',()=>{$('retreat-dialog').close();run('withdraw');},{id:'confirm-retreat'}));
 return {initial:preview,render,state:()=>copyState(),inBattle:()=>state.phase==='battle',commit(s){if(state.phase==='battle'){state.active.checkpoint=missionCheckpoint(s);settle(state,s);save();}},persist(){if(state.phase==='battle')state.active.checkpoint=missionCheckpoint(getSession());save();}};
 function copyState(){return structuredClone(state);}
}
