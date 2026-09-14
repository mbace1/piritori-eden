import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.min.js?v=2';
import {bakedMotionPlayer} from '../fight-module/motion-player.js?v=2';

const names=['stance-idle','grounded-walk','guard-brace','recoil-hit','settle-down','melee-swing','pistol-aim','use-bandage','talk-gesture'];
const body=new T.Group(),bone=new T.Bone();bone.name='test-root';body.add(bone);
const mixer=new T.AnimationMixer(body),actions={};
for(const name of names){
  const values=name==='settle-down'?[0,0,0,0,-1,0]:[0,0,0,0,.1,0];
  const clip=new T.AnimationClip(name,1,[new T.VectorKeyframeTrack('test-root.position',[0,1],values)]);
  actions[name]=mixer.clipAction(clip);
}
const actor={body,mixer,actions},player=bakedMotionPlayer(T,actor);
assert(player);
player.play('walk',1);player.update(.35);player.play('walk',1);player.update(.1);
assert(Math.abs(actions['grounded-walk'].time-.45)<1e-7,'reselecting walk must preserve gait phase');
player.setWalkSpeed(1.76);assert.equal(actions['grounded-walk'].getEffectiveTimeScale(),2);
player.play('down',.5);for(let i=0;i<60;i++)player.update(1/60);
const held=bone.position.clone();for(let i=0;i<300;i++)player.update(1/60);
assert.equal(actor.down,true);assert(held.distanceTo(bone.position)<1e-7,'down must hold still');assert.equal(bone.position.y,-1);
player.play('idle',1);for(let i=0;i<30;i++)player.update(1/60);
assert.equal(actor.down,false);assert(bone.position.y>=0,'return to idle must clear the down pose');
player.play('grip',1);for(let i=0;i<60;i++)player.update(1/60);
assert.equal(actions['pistol-aim'].time,.4,'grip holds its authored contact pose');
mixer.stopAllAction();player.play('idle',1);player.update(.2);assert(actions['stance-idle'].isRunning(),'idle must restart after a mixer reset');
assert.equal(bakedMotionPlayer(T,{actions:{'alert-idle':{}}}),null,'an incomplete set must retain the original path');
console.log('Baked motion transitions, gait phase, clamped down, grip hold and legacy fallback: PASS');
