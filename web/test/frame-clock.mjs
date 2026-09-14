import assert from 'node:assert/strict';
import {createFrameClock,createPresentationClock} from '../fight-module/frame-clock.js';

for(const refresh of [60,90,120,144])for(const fps of [30,60]){
  const clock=createFrameClock();let count=0,elapsed=0;
  // Alternating delivery jitter preserves average display refresh.
  for(let i=1;i<=refresh*10;i++){
    const sample=clock.take(i*1000/refresh+(i%2?.8:-.8),fps);
    if(sample){count++;elapsed+=sample.real;assert.ok(sample.dt>=0&&sample.dt<=.05);}
  }
  assert.ok(Math.abs(count-fps*10)<=1,JSON.stringify({refresh,fps,count}));
  assert.ok(Math.abs(elapsed-10)<.05);
}
const clock=createFrameClock();
assert.equal(clock.take(1,30),null);
assert.equal(clock.take(1000,30).dt,.05);
assert.equal(clock.take(1001,30),null,'no catch-up burst after a stall');
clock.reset(30000);
assert.equal(clock.take(30001,30),null);
assert.ok(clock.take(30034,30).dt<.04,'resume starts at the new epoch');
assert.ok(clock.take(30051,60),'quality changes adopt the new rate');
assert.equal(clock.take(30052,60),null);
console.log('frame clock: 30/60 FPS at 60/90/120/144 Hz, stalls, resume and quality changes pass');

for(const hz of [1,2,15,30,60]){
  const movement=createPresentationClock();let elapsed=0,time=0;
  while(elapsed<2){time+=1000/hz;elapsed=movement.take(time);}
  assert.ok(time<=2000+1000/hz+.001,'a two-second movement stays bounded at '+hz+' FPS');
}
const movement=createPresentationClock();
assert.equal(movement.take(500),.5);
movement.pause(true,500);
assert.equal(movement.take(30000),.5);
movement.pause(false,40000);
assert.equal(movement.take(40500),1,'hidden time is excluded, including the resume interval');
movement.pause(true,40500);movement.pause(false,41000);
assert.equal(movement.take(41500),1.5,'orientation pause also preserves progress');
console.log('presentation clock: real action durations at 1–60 FPS; hidden and orientation time excluded');
