// C laboratory low walls. Grid north is increasing row (world -Z).
// One wall is stored once; either adjacent cell can use its facing edge.
export const EDGES={north:[0,1],east:[1,0],south:[0,-1],west:[-1,0]};
const opposite={north:'south',east:'west',south:'north',west:'east'};
const xy=c=>c.split(',').map(Number),key=(x,y)=>`${x},${y}`;
export function coverEdges(b,cell){
  const [x,y]=xy(cell),result=[],own=b.cover.get(cell);
  if(own?.softBlock&&EDGES[own.edge])result.push({edge:own.edge,anchor:cell});
  for(const [edge,[dx,dy]] of Object.entries(EDGES)){
    const n=key(x+dx,y+dy),v=b.cover.get(n);
    if(v?.softBlock&&v.edge===opposite[edge])result.push({edge,anchor:n});
  }return result;
}
export function crossesCoverEdge(b,from,to){
  const [x,y]=xy(from),[tx,ty]=xy(to);
  return coverEdges(b,from).some(({edge})=>{const [dx,dy]=EDGES[edge];return tx-x===dx&&ty-y===dy;});
}
export function coverProtection(b,from,to){
  const [sx,sy]=xy(from),[tx,ty]=xy(to),dx=sx-tx,dy=sy-ty;
  for(const wall of coverEdges(b,to)){
    const [nx,ny]=EDGES[wall.edge],normal=dx*nx+dy*ny,tangent=dx*ny-dy*nx;
    // The ray enters the protected square through this face. Exact 45-degree
    // corners count as protected; side/rear and same-cell rays do not.
    if(normal>0&&normal>=Math.abs(tangent))return {...wall,point:[tx+dx/(2*normal),ty+dy/(2*normal)]};
  }return null;
}
export function coverDescription(b,cell){
  const edges=coverEdges(b,cell);return edges.length?'Low wall: '+edges.map(v=>v.edge.toUpperCase()).join(' / ')+'. Flanks exposed.':'Exposed';
}
