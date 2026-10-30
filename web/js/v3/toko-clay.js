// Toko at the counter, in clay: video loops that change only on reactions.
//
// Owner, 2026-10-19: "These can technically be videos too right? Can't this be
// in game narration sequences as loops that only change as reactions." The clips
// are rendered with the Radio Free clay kit (art-src/clay-toko/) and play over the
// whole speaker stage: each includes the painted room, so there is no seam.
//
//   idle  — loops for as long as you stand there
//   wave  — once, as you come in
//   nod   — buying something
//   tilt  — the films' 'bwoop?', when he tells you what he heard
//
// Every reaction starts and ends on idle's first frame, and idle restarts from 0
// after one, so the cuts do not show. The screen is re-rendered on every action,
// so the controller's state lives here, not in the DOM: a reaction asked for by an
// action plays on the next mount, and the greeting plays once per visit.
// Reduced motion: the idle still, no reactions. A video that cannot play leaves
// the painted plate and the still underneath, which is what you would see anyway.
import { tokoCue, warmTokoCues } from './toko-voice.js?v=1';

const CLIPS = ['idle', 'wave', 'nod', 'tilt'];
let pending = null, greeted = false, live = null;

/** Ask for a reaction. Every action re-renders the screen, so it is queued and plays
 *  on the next mount (measured: playing it at once on the outgoing elements lost it). */
export function tokoReact(name) { pending = name; }
/** The visit is over: the next time you come in, he waves again. */
export function tokoLeft() { greeted = false; pending = null; }
export function disposeTokoClay() { live?.stop(); live = null; }

export function mountTokoClay(stage, urlOf) {
  disposeTokoClay();
  if (!stage) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const box = document.createElement('div'); box.className = 'toko-clay'; box.setAttribute('aria-hidden', 'true');
  const vids = {};
  for (const name of reduced ? ['idle'] : CLIPS) {
    const v = document.createElement('video');
    Object.assign(v, { muted: true, playsInline: true, preload: 'auto', loop: name === 'idle', src: urlOf(name) });
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.dataset.clip = name;
    if (name !== 'idle') v.hidden = true;
    box.append(v); vids[name] = v;
  }
  const plate = stage.querySelector('.scene-image');
  plate ? plate.after(box) : stage.prepend(box);
  const idle = vids.idle;
  idle.addEventListener('playing', () => box.classList.add('playing'), { once: true });
  const start = (v) => { const p = v.play(); if (p?.catch) p.catch(() => {}); };
  let current = null;
  const react = (name) => {
    const v = vids[name]; if (!v || reduced) return;
    if (current) { current.pause(); current.hidden = true; }
    current = v; v.currentTime = 0;
    v.onplaying = () => { v.hidden = false; tokoCue(name); };
    v.onended = () => { v.hidden = true; current = null; idle.currentTime = 0; start(idle); };
    start(v);
  };
  if (reduced) { idle.loop = false; idle.addEventListener('loadeddata', () => { idle.currentTime = 0; }, { once: true }); }
  else { start(idle); warmTokoCues(); }
  live = { react, stop() { for (const v of Object.values(vids)) { v.pause(); v.removeAttribute('src'); v.load(); } box.remove(); } };
  stage.dataset.toko = 'clay';
  if (!greeted) { greeted = true; react('wave'); }
  else if (pending) { const p = pending; pending = null; react(p); }
}
