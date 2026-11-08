import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {hireCandidate} from '../../people/hiring.mjs';
import {createSession,checkpoint,restoreSession} from '../fight-module/session.js';

const root=new URL('../../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const missing=async path=>{await assert.rejects(access(new URL(path,root)),{code:'ENOENT'},path+' stays deleted');};
const manifest=JSON.parse(await read('art/v3/manifest.json'));
const content=JSON.parse(await read('content/era1-slice-v1.json'));
const retainedPeople=new Set(['jaska-concept-v03.jpg','aatami-young-final-v01.png','aatami-young-final-v01.txt','aatami-young-support-06.png','aatami-young-support-06.txt']);
assert((await readdir(new URL('art-src/concepts/people/',root))).every(file=>retainedPeople.has(file)),'Old unselected faces/outfits cannot return to the source shelf');
for(const path of ['godot/tools/capture_counter.gd','godot/tools/capture_counter.tscn','art-src/cutins/review.html','art-src/cutins/render.cjs','art-src/cutins/renders','web/lantern.css','web/js/v3/chrome.js','web/js/v3/scene-speaker.js','web/scene-speaker.css','art-library/MODULAR_CHARACTER_SYSTEM.md','art-src/gen-pose-set.sh','art-src/install-poses.sh','art/v3/characters','art/v3/cast','art/v3/animation/runner','art/v3/ui','art-library/characters/modules','art-src/approved/cast','art-library/archive/needs-rework/modular-detail-v01','art-library/archive/needs-rework/fixed-cast-detail-v00','art-library/archive/needs-rework/character-animation-detail-v01'])await missing(path);
const removed=/^(crew-(heads|torsos|legs)-era1|cast-(driver|fixer|local|muscle|runner|watcher)-|animation-runner-|formation-grid-|command-console-|cutin-arvo-)/;
assert(manifest.assets.every(asset=>!removed.test(asset.id)),'No deleted visual family remains registered');
assert(content.asset_refs.every(id=>!removed.test(id)),'Content does not request deleted UI/cast');
for(const person of [...content.crew,...Array.from({length:50},(_,i)=>hireCandidate('reset-test',i))]){
  assert.equal(person.portrait_kind,'initials');
  for(const key of ['portrait_asset_id','torso_asset_id','legs_asset_id'])assert(!person[key],'No modular portrait pointer: '+key);
}
for(const id of ['scene-toko-rig-v01','scene-toko-noodles-empty-v01','cutin-jaska-rig-v01','cutin-aatami-front-rig-v01','cutin-aatami-rig-v01','prop-karhupuisto-bear-v01','surface-karhupuisto-gravel-v01']){
  const asset=manifest.assets.find(row=>row.id===id);assert(asset,id+' retained');
  for(const part of asset.file?[asset]:asset.members){
    const bytes=await readFile(new URL('art/v3/'+part.file,root));
    if(part.sha256)assert.equal(createHash('sha256').update(bytes).digest('hex'),part.sha256,id+' source identity');
  }
}
const [html,app,css]=await Promise.all(['web/index.html','web/js/v3/app.js','web/v3.css'].map(read));
assert(!/lantern\.css|scene-speaker\.css/.test(html));
assert(!/openCutin|CUTIN_SCRIPT|chrome\.js|bootChrome|scene-speaker|portrait_asset_id|torso_asset_id|legs_asset_id/.test(app));
assert(!/--chrome-|border-image/.test(css),'Old generated material is physically disconnected');
assert(css.includes('Compatibility layout')&&app.includes('data-news-identity="arvo"'));

// A pre-reset emergency checkpoint may contain appearance IDs. Ignore those
// only; command replay must still reject changed gameplay state.
const session=createSession(content,'mixed','training');
const saved=checkpoint(session);
for(const person of saved.snapshot.units)Object.assign(person,{head:'head-kallio-01-v03',torso:'torso-runner-v03',legs:'legs-runner-v03'});
assert.deepEqual(restoreSession(content,saved).snapshot(),session.snapshot(),'Legacy appearance metadata cannot invalidate a replay');
const corrupt=structuredClone(saved);corrupt.snapshot.units[0].hp++;
assert.throws(()=>restoreSession(content,corrupt),/Checkpoint does not match/,'Appearance compatibility never relaxes combat validation');
console.log('PASS: deleted UI/cast stays absent; selected sources and C19 park assets retain hashes; 56 neutral identities; old appearance-only checkpoints reload and combat tampering fails.');
