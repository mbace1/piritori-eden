// Night Shift places hold together (design/C19_LEVEL_PASS.md layer 8).
// Bare node, on the same data locations.js builds: every join closed, no wall
// ending in the air, nothing standing in a wall or on the board. It cannot see
// how a place LOOKS; that is the audit renderer's job, and an art change ends
// in a picture.
import assert from 'node:assert/strict';
import {LAYOUTS,lay,axis,facing,footprint,FACE,OVERLAP,VOLUME} from '../crew-run/layouts.js';

const CELL=1.17,BOARD=[-3*CELL,3*CELL,-4*CELL,4*CELL];// fight-module/main.js: 6 lanes × 8 rows about the origin
const overlap=(a,b,gap=0)=>a[0]<b[1]-gap&&a[1]>b[0]+gap&&a[2]<b[3]-gap&&a[3]>b[2]+gap;
const inside=(p,box,grow=0)=>p[0]>=box[0]-grow&&p[0]<=box[1]+grow&&p[1]>=box[2]-grow&&p[1]<=box[3]+grow;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
let checks=0;const ok=(cond,msg)=>{assert.ok(cond,msg);checks++;};

for(const [place,L] of Object.entries(LAYOUTS)){
  const runs=Object.fromEntries(L.runs.map(r=>[r.id,{...r,...lay(r)}]));
  const ends=r=>({start:[r.x,r.z],end:r.end});
  const walls=[];// every module's footprint, with its run
  for(const r of Object.values(runs)){
    // 1. A run is continuous: each module starts where the last stopped, less the overlap.
    r.placed.forEach((m,i)=>{if(i)ok(Math.abs(m.from-(r.placed[i-1].to-OVERLAP))<1e-9,`${place}/${r.id}: module ${i} does not follow on`);});
    for(const m of r.placed)walls.push({run:r.id,name:m.name,box:footprint(m.name,m.x,m.z,m.rotation)});
  }
  // 2. Every declared join sits on the other run's face, within its length.
  const closed=new Set();
  for(const j of L.joins){
    const a=runs[j.run],b=runs[j.onto],p=ends(a)[j.at],n=facing(b.rotation),d=axis(b.rotation),o=[b.x,b.z];
    const off=[p[0]-o[0],p[1]-o[1]];
    ok(Math.abs(dot(off,n)-FACE)<.02,`${place}: ${j.run} ${j.at} is ${(dot(off,n)-FACE).toFixed(2)} m off ${j.onto}'s face`);
    const along=dot(off,d);ok(along>-1.1&&along<b.length+1.1,`${place}: ${j.run} ${j.at} misses ${j.onto} (${along.toFixed(2)} along it)`);
    closed.add(`${j.run}:${j.at}`);
  }
  // 3. No wall ends in the air: an end is joined, inside a pier or filler, or
  //    the gable of its own run's building. A shed is a volume and needs none.
  for(const r of Object.values(runs)){
    if(r.modules.every(m=>VOLUME.has(m)))continue;
    for(const [at,p] of Object.entries(ends(r))){
      if(closed.has(`${r.id}:${at}`))continue;
      const covered=L.blocks.some(b=>(b.run===r.id||!b.ridge)&&inside(p,b.box,1.1));
      ok(covered,`${place}: ${r.id} ${at} (${p.map(v=>v.toFixed(2))}) ends in the air`);
    }
  }
  // 4. Nothing stands in a wall or a building, and 5. nothing stands on the board.
  const things=[
    ...L.props.map(([n,x,,z,r])=>({n,box:footprint(n,x,z,r)})),
    ...L.common.map(([n,x,,z,r])=>({n,box:footprint(n,x,z,r)})),
    ...L.planters.map(([x,z,r])=>({n:'planter',box:footprint('planter',x,z,r)})),
  ];
  const masses=L.blocks.filter(b=>b.box[4]===0).map(b=>({run:b.run,box:b.box.slice(0,4)}));
  for(const t of things){
    for(const w of walls)ok(!overlap(t.box,w.box,.02),`${place}: ${t.n} at ${t.box.map(v=>v.toFixed(2))} stands in ${w.run}'s ${w.name}`);
    for(const m of masses)ok(!overlap(t.box,m.box,.02),`${place}: ${t.n} stands inside ${m.run}'s building`);
    ok(!overlap(t.box,BOARD,.02),`${place}: ${t.n} stands on the board`);
  }
  for(const w of walls)ok(!overlap(w.box,BOARD),`${place}: ${w.run}'s ${w.name} stands on the board`);
  for(const m of masses)ok(!overlap(m.box,BOARD),`${place}: ${m.run}'s building stands on the board`);
  // 6. A street's tram stands beside the board, never on it.
  if(L.tram)ok(!overlap([L.tram.x-3.6,L.tram.x+3.6,L.tram.z-.85,L.tram.z+.85],BOARD),`${place}: the tram stands on the board`);
  // 7. Every lamp belongs to a wall that exists.
  for(const l of L.lamps)ok(runs[l[4]],`${place}: a lamp hangs on ${l[4]}, which is not a run`);
  // 8. A quay: the ground stops at its edge, and everything but the boat
  //    stands on the ground, the board a metre short of the water.
  if(L.quay){
    const q=L.quay;
    ok(q.edge>=BOARD[1]+1,`${place}: the board is ${(q.edge-BOARD[1]).toFixed(2)} m from the water`);
    ok(L.floor&&Math.abs(L.floor[1]-q.edge)<1e-9,`${place}: the ground does not stop at the quay edge`);
    for(const w of walls)ok(w.box[1]<=q.edge,`${place}: ${w.run}'s ${w.name} stands in the water`);
    for(const m of masses)ok(m.box[1]<=q.edge,`${place}: ${m.run}'s building stands in the water`);
    for(const t of things)ok(t.box[1]<=q.edge-.1,`${place}: ${t.n} at ${t.box.map(v=>v.toFixed(2))} stands in the water`);
    for(const l of L.litter)ok(l[0]<q.edge-.3,`${place}: litter at x ${l[0]} lies in the water`);
    if(q.boat)ok(q.boat.x-q.boat.beam/2>q.edge+.2,`${place}: the boat is moored inside the quay`);
    // A lamp post stands on the quay, clear of everything else on it.
    for(const [px,pz] of q.posts??[]){const post=[px-.12,px+.12,pz-.12,pz+.12];ok(post[1]<=q.edge-.1,`${place}: a lamp post stands in the water`);
      for(const t of things)ok(!overlap(post,t.box),`${place}: a lamp post at ${px},${pz} stands in a ${t.n}`);}
  }
}
console.log(`level-layout: ${checks} checks passed — every join closed, no wall ends in the air, nothing in a wall or on the board (${Object.keys(LAYOUTS).join(', ')})`);
