// Broad cut silhouettes and a sparse second ink stroke, Art Bible section 5.
// Labels carry every action; these symbols never carry a rule alone.
const paths={
 attack:'M9 41 18 27 20 11 27 8 29 25 34 12 40 14 38 29 46 24 52 30 45 43 34 54 20 52Z',
 move:'M7 24 36 23 35 12 57 31 36 49 36 38 8 39Z',
 brace:'M12 10 32 5 53 12 50 34 41 48 30 57 17 45 10 31Z M21 17 31 14 44 18 41 34 30 45 22 33Z',
 item:'M24 7 40 7 40 17 45 24 46 51 40 57 20 56 17 49 19 24 24 17Z M25 32 38 32 38 39 25 39Z',
 reload:'M17 18 17 7 4 21 18 32 18 23 C40 15 52 31 43 44 L48 50 C64 29 44 5 17 18Z M21 37 34 35 38 58 24 60Z',
 help:'M5 32 20 21 32 30 42 21 59 31 48 49 35 56 17 49Z M21 31 32 42 42 31',
 extract:'M10 8 38 5 39 22 30 23 29 15 19 17 20 49 30 49 30 43 39 43 40 57 10 57Z M27 29 46 28 45 19 61 34 45 48 45 39 28 40Z',
 boots:'M14 8 32 9 30 35 49 42 53 52 47 57 10 55 8 43Z M9 48 50 49',
 medical:'M10 16 23 16 24 8 41 8 42 16 55 17 54 54 9 55Z M27 25 37 25 37 33 45 33 45 41 37 41 37 49 27 49 27 41 19 41 19 33 27 33Z',
 light:'M22 8 41 8 44 17 51 22 52 54 13 55 12 24 19 18Z M22 32 42 32 41 44 22 45Z',
 'baseball-bat':'M42 4 51 11 25 45 22 49 15 59 8 54 18 43 20 40Z',
 'folding-knife':'M44 4 54 6 48 29 33 43 27 39 17 58 10 55 9 48 24 31 29 33Z',
 'first-handgun':'M6 18 53 16 58 22 54 31 37 32 33 38 29 38 26 54 13 51 19 32 6 31Z M30 31 29 35 33 35 35 31Z',
 rest:'M7 33 14 33 14 40 54 40 54 30 60 30 59 57 53 57 53 48 14 48 14 57 7 57Z M17 24 29 23 32 36 18 36Z M34 29 49 28 52 36 34 36Z',
 end:'M13 9 53 31 14 55Z',
 kit:'M9 20 28 8 55 18 55 48 34 58 9 48Z M10 21 34 31 55 19 M34 31 34 58 M24 11 46 22 45 31',
 close:'M15 10 32 26 49 10 55 16 38 33 54 49 48 56 31 39 15 56 8 49 25 32 8 16Z'
};
export function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 64 64');svg.setAttribute('aria-hidden','true');svg.classList.add('paper-icon');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[name]||paths.kit);p.setAttribute('fill','currentColor');p.setAttribute('fill-rule','evenodd');p.setAttribute('stroke','#13191c');p.setAttribute('stroke-width','1.8');svg.append(p);return svg;}
