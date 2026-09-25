import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createEncounter} from '../bear-path/encounter.js?v=2';
import {createSession,checkpoint,restoreSession} from '../fight-module/session.js?v=14';
const content=JSON.parse(fs.readFileSync(new URL('../../content/era1-slice-v1.json',import.meta.url)));
function reachPolice(){const s=createSession(content,'melee','bear-path');for(let n=0;n<20&&!s.battle.policeArrived&&s.battle.status==='active';n++){
 for(const u of s.battle.players.filter(u=>u.alive)){s.command('select',u.id);assert(s.command('brace').ok);}assert(s.command('end').ok);
}assert(s.battle.policeArrived,'Sustained guarding eventually brings the authored police response');assert.equal(s.battle.status,'active');return s;}
const s=reachPolice(),story=createEncounter(content);story.command('talk');story.command('choose','hold-path');
fs.mkdirSync('.private/bear-path',{recursive:true});fs.writeFileSync('.private/bear-path/police-fixture.json',JSON.stringify({fight:checkpoint(s),story:story.checkpoint(),angle:.65,zoom:1}));
for(const posture of ['BACK_OFF','HELP_FRIENDS']){
 const restored=restoreSession(content,checkpoint(s));for(const type of ['end','withdraw','brace','talk'])assert(!restored.command(type).ok);
 assert(!restored.command('police','ENGAGE').ok);assert(restored.command('police',posture).ok);assert.equal(restored.battle.result,'withdraw');assert.equal(restored.battle.policeResolved,true);
 assert.deepEqual(restoreSession(content,checkpoint(restored)).snapshot(),restored.snapshot());
 const e=createEncounter(content,story.checkpoint());assert(e.command('battle-result',{outcome:'withdraw',taken:restored.battle.policeTaken,saved:restored.battle.policeSaved}).ok);assert.equal(e.state.settlements,1);
}
const auto=createSession(content,'melee','bear-path');for(let n=0;n<60&&auto.battle.status==='active';n++){if(auto.battle.policeArrived&&!auto.battle.policeResolved)assert(auto.command('police','BACK_OFF').ok);else assert(auto.command('auto').ok);}assert.notEqual(auto.battle.status,'active');
console.log(JSON.stringify({result:'PASS',policeAtRound:s.battle.round,policeCount:s.battle.police.length,checks:['natural heat escalation','pending posture blocks ordinary actions','both authored postures','checkpoint replay','one aftermath settlement','autoplay reaches outcome'],autoResult:auto.battle.result,autoRound:auto.battle.round}));
