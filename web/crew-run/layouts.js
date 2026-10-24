// Night Shift places as data (design/C19_LEVEL_PASS.md): the runs of wall,
// the buildings behind them, what hangs on them and what stands in the open.
// Pure, with no three.js, so test/level-layout.mjs can hold every join in bare
// node; locations.js builds exactly this and nothing else.

// Measured off kallio-kit-v02.glb in the browser, 2026-10-24. A façade bay is
// a 1.03 m slab: its face is 0.66 in front of its origin and its back 0.37
// behind. Modules in a run overlap by 4 cm, which hides the seam.
export const WIDTH={facade_bay:3.12,facade_bay_b:3.12,archway:3.28,service_bay:4};
export const FACE=.66,BACK=.37,OVERLAP=.04;
// Ground footprints [x0,x1,z0,z1] in each motif's own frame: what stands
// below 2 m, measured the same way (a shed's awning is overhead, not ground). A service bay is a whole shed, not a slab, so its run's ends
// need no building behind them.
export const FOOT={facade_bay:[-1.56,1.56,-.37,.66],facade_bay_b:[-1.56,1.56,-.37,.66],archway:[-1.64,1.64,-3.73,.9],service_bay:[-2,2,-.32,.58],
  planter:[-1.02,1.19,-1.04,1],container:[-.5,.5,-.5,.53],pallets:[-.54,.54,-.45,.45],bicycle:[-.87,.87,-.18,.18],drain:[-.43,.43,-.25,.25]};
export const VOLUME=new Set(['service_bay']);
/** A motif's footprint on the ground, as an axis-aligned box in the world. */
export function footprint(name,x,z,rotation=0){
  const [x0,x1,z0,z1]=FOOT[name],c=Math.cos(rotation),s=Math.sin(rotation),xs=[],zs=[];
  for(const lx of [x0,x1])for(const lz of [z0,z1]){xs.push(x+lx*c+lz*s);zs.push(z-lx*s+lz*c);}
  return [Math.min(...xs),Math.max(...xs),Math.min(...zs),Math.max(...zs)];
}

// A run's direction is its rotation's local +x and its face is local +z.
export const axis=rotation=>[Math.cos(rotation),-Math.sin(rotation)];
export const facing=rotation=>[Math.sin(rotation),Math.cos(rotation)];

/** Where each module of a run stands, and where the run ends. */
export function lay(run){
  const [ax,az]=axis(run.rotation);let s=0;const placed=[];
  for(const name of run.modules){const w=WIDTH[name];placed.push({name,x:run.x+ax*(s+w/2),z:run.z+az*(s+w/2),rotation:run.rotation,from:s,to:s+w});s+=w-OVERLAP;}
  const length=s+OVERLAP;
  return {placed,length,end:[run.x+ax*length,run.z+az*length]};
}

// What every place shares: litter, bicycles, the drain and the planters,
// none of them standing in a wall or on the board.
const COMMON={
  planters:[[-4.7,4.3,Math.PI/2],[5.2,4.0,Math.PI/2],[3.0,-5.8,0]],
  litter:[[-5.7,4.9],[-5.5,1],[-5.4,-2.9],[5.7,3.8],[4.0,-6.4],[-2.5,-6.8]],
  common:[['bicycle',-4.8,0,-6.25,.14],['bicycle',-3.7,0,-6.35,-.08],['drain',4.2,0,2.9,0]],
};

const bays=n=>Array.from({length:n},(_,i)=>i%2?'facade_bay_b':'facade_bay');

export const LAYOUTS={
  // A closed courtyard (courtyard-prototype-v05): the back wall with its
  // passage at x 0, the left wing butting into it, and on the right a return
  // stepping forward into a wing. Each run starts where another's face stops.
  courtyard:{
    runs:[
      {id:'back',x:-13.96,z:-7.7,rotation:0,modules:[...bays(4),'archway','facade_bay_b'],
        hangs:[['balcony',-6.24,3.7,-7.2,0],['balcony',3.16,3.7,-7.2,0],['bike_rack',-4.5,0,-6.5,0]]},
      {id:'left',x:-6.4,z:5.32,rotation:Math.PI/2,modules:['facade_bay_b','facade_bay','facade_bay_b','facade_bay'],
        hangs:[['vent',-5.9,1.3,-3,Math.PI/2]]},
      {id:'return',x:5.38,z:-7.04,rotation:-Math.PI/2,modules:['facade_bay_b']},
      {id:'wing',x:4.72,z:-4.58,rotation:0,modules:bays(5),
        hangs:[['balcony',9.36,3.7,-4.08,0],['balcony',15.52,3.7,-4.08,0]]},
    ],
    // Where two runs meet: `a`'s end (or start) sits on `b`'s face plane.
    joins:[
      {run:'left',at:'end',onto:'back'},
      {run:'return',at:'start',onto:'back',plane:'face'},
      {run:'back',at:'end',onto:'return'},
      {run:'wing',at:'start',onto:'return'},
    ],
    // The buildings behind the façades: [x0,x1,z0,z1,y0,y1], a roof ridge or
    // none. The passage stays open under a bridge; a filler closes the roof
    // behind the inner corner and a stone pier covers the outer one.
    blocks:[
      {run:'back',box:[-17,-1.64,-16,-8.05,0,6.3],ridge:'x'},
      {run:'back',box:[1.64,5.75,-16,-8.05,0,6.3],ridge:'z'},
      {run:'back',box:[-1.64,1.64,-16,-8.05,3.5,6.3],ridge:null},
      {run:'left',box:[-15,-6.75,-16,5.32,0,6.3],ridge:'z'},
      {run:'wing',box:[4.7,5.75,-8.07,-7.04,0,6.3],ridge:null},
      {run:'wing',box:[5.73,21.5,-16,-4.93,0,6.3],ridge:'x'},
      {run:'wing',box:[4.66,5.79,-5.01,-3.86,0,6.55],ridge:null,stone:true},
    ],
    lamps:[[-4.6,3.2,-7.1,0,'back'],[3.4,3.2,-7.1,0,'back'],[-5.9,3.6,1.1,Math.PI/2,'left']],
    props:[['pallets',5.8,0,2.4,0],['container',-5.25,0,2.15,0],['container',-5.25,0,3.3,0]],
    ...COMMON,
  },
  // A Kallio tram street (layer 6), duplicated from the park's municipal
  // street: a row of tenements with a porttikongi on the far pavement, and
  // the board standing on the road with the tram track across it. A tram
  // waits beside the board; the near side is lifted away like every set.
  street:{
    runs:[{id:'row',x:-21.64,z:-7.7,rotation:0,modules:[...bays(5),'archway',...bays(9)],
      hangs:[['balcony',-13.92,3.7,-7.2,0],['balcony',1.64,3.7,-7.2,0],['balcony',10.88,3.7,-7.2,0],['bike_rack',-11.2,0,-6.5,0]]}],
    joins:[],
    blocks:[
      {run:'row',box:[-21.64,-6.24,-16,-8.05,0,6.3],ridge:'x'},
      {run:'row',box:[-2.96,24.76,-16,-8.05,0,6.3],ridge:'x'},
      {run:'row',box:[-6.24,-2.96,-16,-8.05,3.5,6.3],ridge:null},
    ],
    road:{z0:-5.2,z1:2.6},rails:[-1.9],tram:{x:12,z:-1.9},rear:[-4.6,2.5,-8],
    lamps:[[13.96,3.2,-7.1,0,'row'],[4.72,3.2,-7.1,0,'row'],[-7.76,3.2,-7.1,0,'row']],
    props:[['container',-9.4,0,-6.4,0],['container',-8.3,0,-6.4,0]],
    ...COMMON,
    planters:[[-4.7,4.3,Math.PI/2],[5.2,4.0,Math.PI/2]],
  },
  // The yard: sheds along the back, two down the left, and the tenement row
  // behind the sheds with its building.
  yard:{
    runs:[
      {id:'sheds',x:-9,z:-8.4,rotation:0,modules:Array(6).fill('service_bay'),hangs:[['bike_rack',-5.4,0,-6.5,0]]},
      {id:'side',x:-7,z:1.2,rotation:Math.PI/2,modules:['service_bay','service_bay']},
      {id:'far',x:-11.6,z:-13,rotation:0,modules:bays(8)},
    ],
    joins:[],
    blocks:[{run:'far',box:[-11.6,13.08,-21.5,-13.35,0,6.3],ridge:'x'}],
    lamps:[[-4.5,3.2,-7.4,0,'sheds'],[4,3.2,-7.4,0,'sheds'],[-6.4,3.2,.4,Math.PI/2,'side']],
    props:[['pallets',-5.8,0,2.4,0],['pallets',-5.8,.5,2.4,0],['pallets',5.5,0,-5.6,0],['container',6.5,0,-3,0],['container',6.5,0,-1.8,0],['container',6.5,0,0,0]],
    ...COMMON,
  },
};
