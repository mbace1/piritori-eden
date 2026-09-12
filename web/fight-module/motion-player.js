// A complete baked action set takes precedence over prototype arm gestures.
// Clip presence selects playback; it does not approve an asset for production.
const CLIPS={idle:'stance-idle',walk:'grounded-walk',brace:'guard-brace',hit:'recoil-hit',down:'settle-down',strike:'melee-swing',shoot:'pistol-aim',grip:'pistol-aim',item:'use-bandage',talk:'talk-gesture'};
export function bakedMotionPlayer(T,actor){
  if(!Object.values(CLIPS).every(name=>actor.actions[name]))return null;
  const origin=actor.body.position.clone(),rotation=actor.body.quaternion.clone();
  let current=null;
  return {
    play(mode,duration){
      const action=actor.actions[CLIPS[mode]];
      if(!action)throw Error('Missing body action: '+mode);
      actor.body.position.copy(origin);actor.body.quaternion.copy(rotation);
      actor.down=mode==='down';
      const loop=mode==='idle'||mode==='walk';
      if(action===current&&loop&&action.isRunning())return;
      const previous=current;current=action;
      action.reset().setEffectiveWeight(1).setLoop(loop?T.LoopRepeat:T.LoopOnce,loop?Infinity:1);
      action.clampWhenFinished=!loop;
      action.setEffectiveTimeScale(mode==='grip'?0:loop?1:action.getClip().duration/Math.max(.01,duration));
      if(mode==='grip')action.time=action.getClip().duration*.4;
      action.play();
      if(previous&&previous!==action)action.crossFadeFrom(previous,.12,false);
      else for(const a of Object.values(actor.actions))if(a!==action)a.stop();
    },
    update(dt){actor.mixer.update(dt);actor.body.updateMatrixWorld(true);},
    setWalkSpeed(metresPerSecond){
      // The authored cycle travels .88 source metres, scaled with this body.
      actor.actions[CLIPS.walk].setEffectiveTimeScale(Math.max(0,metresPerSecond)/(.88*actor.body.scale.x));
    }
  };
}
