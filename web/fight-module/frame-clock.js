// Keep the fractional refresh remainder: resetting to each RAF timestamp turns
// a 30 FPS budget into 20–27 FPS on otherwise capable, jittering displays.
export function createFrameClock(now=0) {
  let previous=now,next=now,rate=0;
  return {
    reset(time) { previous=next=time;rate=0; },
    take(time,fps) {
      const interval=1000/fps;
      if(rate!==fps){rate=fps;next=previous+interval;}
      if(time+1<next)return null;
      const real=Math.max(0,(time-previous)/1000);previous=time;
      next+=interval;
      // A long stall must not enqueue catch-up renders or advance animations
      // by the entire hidden/blocked interval.
      if(next<=time-1)next=time+interval;
      return {real,dt:Math.min(.05,real)};
    }
  };
}

// Presentation follows visible elapsed time, even on a slow renderer. Capping
// each RAF to 50 ms turns a two-second route into forty seconds at 1 FPS.
// Pause boundaries reset the epoch, so hidden time never finishes an action.
export function createPresentationClock(now=0) {
  let previous=now,elapsed=0,paused=false;
  return {
    pause(value,time) { if(!paused)elapsed+=Math.max(0,time-previous)/1000;previous=time;paused=value; },
    take(time) {
      if(!paused)elapsed+=Math.max(0,time-previous)/1000;
      previous=time;
      return elapsed;
    },
  };
}
