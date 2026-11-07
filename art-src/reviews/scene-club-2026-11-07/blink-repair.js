// Review-only Jaska blink repair. No source pixel/file or registered rig is mutated.
// Coordinates are calibrated on the existing 166x213 head.webp, inside the glasses.
// Original rectangles: lid_0 [40,98,45,22], lid_1 [125,96,45,22] in head-local pixels.
export const EYE_OPENINGS = [
  { part:'lid_0', x:70, y:105, w:36, h:16, skinY:104 },
  { part:'lid_1', x:132, y:105, w:29, h:16, skinY:104 },
];
export const AATAMI_EYE_OPENINGS = [
 {part:'lid_0',x:58,y:98,w:32,h:14,skinY:122,polygon:[[0,1],[8,0],[16,1],[24,4],[30,8],[31,11],[24,14],[16,14],[8,11],[2,6]],marker:[[3,5],[16,9],[28,9.5]]},
 {part:'lid_1',x:109,y:106,w:30,h:14,skinY:124,polygon:[[0,3],[8,0],[18,1],[27,5],[30,8],[27,12],[20,14],[10,12],[3,8]],marker:[[4,6],[15,10],[26,8]]},
];
function makeEyeOpeningRepair(rig,openings) {
 const head=rig.parts.head;
 const lids=openings.map(eye=>{
  const canvas=document.createElement('canvas');canvas.width=eye.w;canvas.height=eye.h;
  const g=canvas.getContext('2d');
  // Protect the existing face silhouette even if a future source trim changes.
  g.drawImage(head.img,-eye.x,-eye.y);
  g.globalCompositeOperation='source-in';
  // A narrow clean strip of this same face, below the glasses and above the ink eye.
  // This keeps the original grain/skin; it does not repaint the head or frame.
  g.drawImage(head.img,eye.x,eye.skinY,eye.w,2,0,0,eye.w,eye.h);
  g.globalCompositeOperation='destination-in';
  g.beginPath();if(eye.polygon){eye.polygon.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();}else g.ellipse(eye.w/2,eye.h/2,eye.w/2,eye.h/2,0,0,Math.PI*2);g.fill();
  g.globalCompositeOperation='source-over';
  // Minimal held-paper closed-eye marker, fully inside the eye opening mask.
  g.strokeStyle='#302823';g.lineWidth=1.5;g.lineCap='round';
  g.beginPath();if(eye.marker){const [a,b,c]=eye.marker;g.moveTo(...a);g.quadraticCurveTo(...b,...c);}else{g.moveTo(4,7.8);g.quadraticCurveTo(eye.w*.43,11,eye.w*.62,9.8);g.lineTo(eye.w-4,8.2);}g.stroke();
  return {part:eye.part,x:head.x+eye.x,y:head.y+eye.y,w:eye.w,h:eye.h,img:canvas};
 });
 return {...rig,lids};
}

export const makeJaskaBlinkRepair=rig=>makeEyeOpeningRepair(rig,EYE_OPENINGS);
export const makeAatamiBlinkRepair=rig=>makeEyeOpeningRepair(rig,AATAMI_EYE_OPENINGS);
