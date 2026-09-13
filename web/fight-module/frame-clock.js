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
