import * as T from 'three';
import {createEncounter} from './encounter.js?v=1';
import {placeLabels} from '../fight-module/framing.js?v=1';

const inspect={
 bear:{title:'THE GRANITE BEAR',text:'The plinth breaks the sight line. The bench narrows the approach. This is cover, not a dead end.'},
 exit:{title:'THE OPEN PATH',text:'The way back stays clear. Leaving ends the handover; it does not require beating everyone here.'},
 contact:{title:'MIKKO KEEPS LOOKING',text:'He checks the road again. Pauli watches the package. Neither of them is watching the same thing.'},
 note:{title:'SLOMO’S NOTE',text:'“The van is empty. Let them say otherwise.” The earlier Three Vans lead gives you a way to finish this without fighting.'}
};
const endings={
 peaceful:['THE VAN ISN’T COMING','Mikko looks past you one last time. Then he steps aside. The handover is completed without a fight.'],
 win:['THE PATH IS YOURS','The opposition gives ground. The package gets through. The park will remember how it happened.'],
 partial:['AN UNEASY AGREEMENT','A partial account replaces another round. Everyone leaves with something unfinished.'],
 withdraw:['YOU KEEP WALKING','The handover is abandoned. The crew leaves by the open path.'],
 loss:['THE HANDOVER IS LOST','Your crew cannot hold the path. The contact closes, and anyone downed needs a separate condition review.']
};

// Portraits are taken from the same actors with the same renderer, once at boot.
// No second WebGL context, downloaded portrait asset or per-frame render target.
function capturePortraits(api){
 const {renderer,world}=api,actors=[...api.actors().values()],size=renderer.getSize(new T.Vector2()),ratio=renderer.getPixelRatio();
 const portraits={},background=world.background,camera=new T.OrthographicCamera(-.32,.32,.37,-.37,.05,2.8);
 renderer.setPixelRatio(1);renderer.setSize(192,224,false);
 try{for(const a of actors.filter(a=>a.unit.side==='enemy')){
   const subject=new Set(),visibility=new Map();a.body.traverse(n=>subject.add(n));
   world.traverse(n=>{if(n.isMesh||n.isSprite||n.isPoints){visibility.set(n,n.visible);n.visible=subject.has(n)&&n.visible;}});
   const head=a.bones.get('Head')?.getWorldPosition(new T.Vector3())||a.group.position.clone().add(new T.Vector3(0,1.65,0));
   const front=new T.Vector3(.17,.015,1.15).applyQuaternion(a.group.quaternion);
   camera.position.copy(head).add(front);camera.lookAt(head.clone().add(new T.Vector3(0,-.10,0)));world.background=new T.Color('#233b38');
   try{renderer.render(world,camera);portraits[a.id]=renderer.domElement.toDataURL('image/png');}finally{for(const [node,visible] of visibility)node.visible=visible;}
 }}finally{world.background=background;renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);api.fit();}
 return portraits;
}

export function mountBearPath(api,saved){
 const model=createEncounter(api.content,saved),$=id=>document.getElementById(id),portraits=capturePortraits(api);
 const deck=$('story-controls'),hotspots=$('story-hotspots'),battleControls=$('battle-controls');
 let listOpen=false,lastPhase=null;
 const fire=(type,value)=>{
   if(api.locked())return;
   const previous=model.state.phase;if(!model.command(type,value).ok)return;
   api.save();render();
   if(type==='talk'){const actor=api.actors().get('opp-mikko-rinne');actor?.play('talk',1.3);}
   if(model.state.phase==='battle'&&previous!=='battle')api.beginBattle();
   else if(model.state.phase==='aftermath'){api.stage.aftermath(model.state.outcome);api.calmAftermath();}
 };
 function button(label,action,attrs={}){const el=document.createElement('button');el.textContent=label;for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);el.addEventListener('click',action);return el;}
 function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
 function render(){
   const s=model.state,battle=s.phase==='battle';document.body.dataset.phase=s.phase;
   deck.hidden=battle;battleControls.hidden=!battle;$('labels').hidden=!battle;$('roundbar').hidden=!battle;hotspots.hidden=battle||s.phase==='aftermath';
   $('result').hidden=true;$('story-location').textContent=s.phase==='aftermath'?'KARHUPUISTO · AFTERMATH':'KARHUPUISTO · DAY 05';
   if(battle){lastPhase=s.phase;return;}
   const focused=document.activeElement?.dataset.story;deck.replaceChildren();
   const article=el('article','story-copy');
   for(const actor of api.actors().values())if(actor.unit.side==='enemy'){actor.group.visible=!(s.returned&&!s.contactOpen);if(!actor.group.visible)actor.prop.visible=false;}
   if(s.phase==='aftermath'){
     const [title,text]=endings[s.outcome];article.append(el('small','eyebrow',s.returned?'RETURN TO THE PARK':'BEAR PATH · RESOLVED'),el('h2','',s.returned?'THE PLACE REMEMBERS':title),el('p','',s.returned?(s.contactOpen?'The contact is still here. The finished handover is remembered; returning does not collect the reward again.':'The meeting spot is empty. The park contact is closed for one day.'):text));
     const facts=el('div','outcome-facts');facts.append(el('span','',`€${s.cash} settled`),el('span','',`${s.timeSpent} block spent`),el('span','',s.contactOpen?'Contact open':'Contact closed · 1 day'));
     if(s.pressure)facts.append(el('span','',`Local pressure +${s.pressure}`));article.append(facts);
     if(s.policeTaken.length)facts.append(el('span','',`${s.policeTaken.length} crew taken by police`));
     if(s.policeSaved.length)facts.append(el('span','',`${s.policeSaved.length} crew pulled out`));
     const actions=el('div','story-return');if(!s.returned)actions.append(button('Return to the park',()=>fire('return'),{'data-story':'return'}));
     actions.append(button('Play another approach',()=>api.restart(),{'data-story':'restart'}));article.append(actions);
   }else{
     const view=s.subject?inspect[s.subject]:null;
     const speaking=s.phase==='dialogue'&&s.subject==='contact';
     const title=speaking?'“YOU BROUGHT COMPANY.”':view?.title||'THE WRONG SIDE OF THE BEAR';
     const text=speaking?'Mikko checks the road. Pauli stays beside the package. You have Slomo’s information, two crew and a way back.':view?.text||'The handover crew waits beside the granite bear. One keeps looking toward a van that is not coming. Look around before you commit.';
     article.append(el('small','eyebrow',s.phase==='dialogue'?'MIKKO “MIKKI” RINNE · BLOCKING THE HANDOVER':'BEAR PATH · ARRIVAL'),el('h2','',title),el('p','',text));
     if(s.phase==='dialogue'){
       const portrait=el('img','speaker-cutout');portrait.src=portraits['opp-mikko-rinne'];portrait.alt='Close-up of Mikko’s current prototype actor';article.prepend(portrait);
     }
     const verbs=el('nav','story-verbs');verbs.setAttribute('aria-label','Location actions');
     verbs.append(button('LOOK',()=>{listOpen=!listOpen;render();},{'data-story':'look','aria-expanded':String(listOpen)}),
       button('TALK',()=>fire('talk'),{'data-story':'talk'}),button('USE',()=>{fire('look','note');listOpen=true;render();},{'data-story':'use'}),
       button('LEAVE',()=>{if(s.phase==='approach')fire('talk');fire('look','exit');},{'data-story':'leave'}));
     article.append(verbs);
     if(listOpen){const list=el('div','inspect-list');for(const [id,v] of Object.entries(inspect))list.append(button((s.seen.includes(id)?'✓ ':'')+v.title,()=>fire('look',id),{'data-story':'inspect-'+id}));article.append(list);}
   }
   deck.append(article);
   if(s.phase==='dialogue'){
     const choices=el('div','story-choices');choices.setAttribute('aria-label','Handover choices');
     for(const choice of model.authored.choices){
       const b=button('',()=>fire('choose',choice.id),{'data-story':choice.id});b.append(el('strong','',choice.label),el('small','',choice.id==='send-fixer'?'No fixer in this crew.':choice.forecast));b.disabled=!model.canChoose(choice.id);if(choice.id==='name-empty-van')b.classList.add('informed-choice');choices.append(b);
     }deck.append(choices);
   }
   const note=el('p','scene-note','Standalone chapter scene · local progress');deck.append(note);
   hotspots.replaceChildren();for(const [id,v] of Object.entries(inspect)){
     const b=button((s.seen.includes(id)?'✓ ':'')+({bear:'Bear / cover',exit:'Open path',contact:'Mikko',note:'Slomo’s note'}[id]),()=>id==='contact'?fire('talk'):fire('look',id),{'data-hotspot':id,'aria-label':v.title});hotspots.append(b);
   }
   if(focused)deck.querySelector(`[data-story="${focused}"]`)?.focus({preventScroll:true});
   else if(lastPhase!==s.phase)deck.querySelector('[data-story]')?.focus({preventScroll:true});
   lastPhase=s.phase;layout();
 }
 function layout(){
   const markers=$('police-markers'),battle=api.battle();markers.hidden=!model.state||model.state.phase!=='battle'||!battle.policeArrived;
   if(!markers.hidden){if(markers.children.length!==battle.police.length){markers.replaceChildren();for(const officer of battle.police){const marker=el('span','police-marker','POLICE');marker.dataset.officer=officer.id;markers.append(marker);}}
     for(const officer of battle.police){const p=api.project(api.position(officer.cell).setY(.1)),marker=markers.querySelector(`[data-officer="${officer.id}"]`);marker.style.left=p.x+'px';marker.style.top=p.y+'px';}}
   if(hotspots.hidden)return;const width=$('arena').clientWidth,height=$('arena').clientHeight;
   const items=[...hotspots.children].map(b=>({id:b.dataset.hotspot,anchor:api.project(api.stage.landmarks[b.dataset.hotspot]),width:b.offsetWidth,height:b.offsetHeight}));
   const bodies=[...api.actors().values()].filter(a=>a.group.visible).map(a=>{const feet=api.project(a.group.position),head=api.project(a.group.position.clone().add(new T.Vector3(0,1.95,0))),w=Math.max(18,(feet.y-head.y)*.42);return {x:head.x-w/2,y:head.y,width:w,height:Math.max(20,feet.y-head.y)};});
   const arena=$('arena').getBoundingClientRect(),art=$('art-toggle').getBoundingClientRect(),artBox={x:art.x-arena.x-5,y:art.y-arena.y-5,width:art.width+10,height:art.height+10};
   for(const placed of placeLabels(items,width,height,[{x:0,y:0,width,height:62},artBox,...bodies])){const b=hotspots.querySelector(`[data-hotspot="${placed.id}"]`);b.style.left=placed.x+'px';b.style.top=placed.y+'px';}
 }
 return {model,isBattle:()=>model.state.phase==='battle',render,layout,
   checkpoint:()=>model.checkpoint(),result:()=>model.result(),
   complete(result){fire('battle-result',{outcome:result.result,taken:result.police?.taken||[],saved:result.police?.saved||[]});},
   tapActor(id){if(api.actors().get(id)?.unit.side==='enemy')fire('talk');else fire('look','note');},
   key(key){if(key==='Escape'&&model.state.phase==='dialogue'){fire('back');return true;}if(!this.isBattle())return true;return false;}
 };
}
