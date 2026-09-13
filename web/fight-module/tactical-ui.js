import {coverEdges,coverDescription} from './cover-edges.js?v=1';
import {routes,forecast,threats,coordinate,coverName,weapon} from './tactics.js?v=4';

export function tacticalUI({getSession,button,tile,edgeMark,run,hint,refresh}){
  let preview=null;
  const $=id=>document.getElementById(id);
  function pick(type,value){preview={type,value};refresh();$('commit-preview')?.focus({preventScroll:true});}
  function cancel(){preview=null;}
  function render(action,busy){
    const b=getSession().battle,u=b.players.find(v=>v.id===b.selectedId),enabled=!busy&&b.status==='active'&&u?.alive;
    const moveReady=enabled&&!b.moved.includes(u.id),actReady=enabled&&!b.acted.includes(u.id);
    for(const el of document.querySelectorAll('[data-action]')){const a=el.dataset.action;el.disabled=a==='move'?!moveReady:!actReady||a==='reload'&&(!u.maxAmmo||u.ammo===u.maxAmmo)||a==='item'&&(!u.itemIds.length||u.hp===u.maxHp);}
    for(const el of document.querySelectorAll('#roster button')){const p=b.players.find(v=>v.id===el.dataset.unitid);el.disabled=busy||b.status!=='active'||!p.alive;
      el.querySelector('small').textContent=`${weapon(p).name}${p.maxAmmo?` ${p.ammo}/${p.maxAmmo}`:''} · ${p.alive?`MOVE ${b.moved.includes(p.id)?'—':'✓'}  ACT ${b.acted.includes(p.id)?'—':'✓'}`:'DOWN'}`;
    }
    const choices=$('choices');choices.replaceChildren();choices.hidden=!enabled||!['move','attack'].includes(action);
    if(enabled&&action==='move'&&moveReady)for(const [cell,path] of routes(b,u)){if(!path.length)continue;tile(cell,0x77b9ba,.15);choices.append(button(coordinate(cell),()=>pick('move',cell),{'data-cell':cell,'aria-label':`Preview move to ${coordinate(cell)} · ${coverName(b,cell)}`}));}
    if(enabled&&action==='attack'&&actReady)for(const t of b.enemies.filter(v=>v.alive)){const f=forecast(b,u,t),el=button(`${t.label} · ${f.valid?`${f.chance}% · ${f.hpDamage} HP + ${f.guardDamage} guard`:f.reason}`,()=>pick('attack',t.id),{'data-target':t.id});el.disabled=!f.valid;choices.append(el);}
    const card=$('tactical-preview');card.replaceChildren();card.hidden=!preview||!enabled;
    let destination=null;
    if(preview&&enabled){let text,valid=false;
      if(preview.type==='move'){
        const path=routes(b,u).get(preview.value);valid=moveReady&&!!path?.length;
        if(valid){destination={id:u.id,cell:preview.value};for(const c of path)tile(c,0xe8e6ad,.48);
          const shots=b.enemies.filter(v=>v.alive).map(t=>({t,f:forecast(b,u,t,preview.value)})).filter(v=>v.f.valid);
          text=`${coordinate(u.cell)} → ${path.map(coordinate).join(' → ')} · ${path.length}/4 steps. ${coverDescription(b,preview.value)} ${actReady?`Action remains. Attacks here: ${shots.map(({t,f})=>`${t.label} ${f.chance}%`).join(', ')||'none'}.`:'Action already used.'}`;}
      }else{const t=b.enemies.find(v=>v.id===preview.value),f=forecast(b,u,t);valid=actReady&&f.valid;if(valid){tile(t.cell,0xf9b870,.6);text=`${u.label} → ${t.label}: ${f.chance}% to hit; ${f.hpDamage} HP + ${f.guardDamage} guard if hit. ${f.cover==='partial'?`${f.coverEdge.toUpperCase()} wall: −25 points. `:f.flanked?'FLANKED: wall gives no protection. ':''}${moveReady?'Movement remains available.':'Movement used.'}`;}}
      if(valid){const p=document.createElement('p');p.textContent=text;card.append(p,button(preview.type==='move'?'Confirm move':'Confirm attack',()=>{const p=preview;cancel();run(p.type,p.value);},{id:'commit-preview'}),button('Cancel',()=>{cancel();refresh();}));}
      else {cancel();card.hidden=true;}
    }
    const danger=threats(b,destination),panel=$('enemy-plans');panel.replaceChildren();
    const summary=document.createElement('p'),total=danger.totals[u?.id];
    summary.textContent=`ENEMY PLANS · ${destination?'AFTER PREVIEWED MOVE':'CURRENT POSITIONS'} · ${u?.label}: ${total?`${total.attacks} attacks, up to ${total.hp} HP + ${total.guard} guard damage${total.hp>=u.hp?' · POTENTIALLY LETHAL':''}`:'no planned hits'}`;
    panel.append(summary);
    for(const v of danger.views){const enemy=b.enemies.find(p=>p.id===v.id);if(!enemy.alive)continue;const t=b.players.find(p=>p.id===v.target);
      const text=`${enemy.label} · ${v.path.length?`→ ${coordinate(v.to)} · `:''}${v.type==='attack'?`tracks ${t?.label} · ${v.valid?`${v.chance}% · ${v.hpDamage} HP + ${v.guardDamage} guard${v.cover==='partial'?' · WALL':v.flanked?' · FLANKED':''}`:v.reason+' — CANCELLED'}`:v.reason}`;
      const p=document.createElement('div');p.className='enemy-plan '+(!v.valid?'cancelled':'');p.textContent=text;panel.append(p);
      if(v.valid){tile(v.to,0xdb946f,.19);if(v.type==='attack')tile(destination?.id===t.id?destination.cell:t.cell,0xf07862,.30);}
    }
    for(const [c,cover] of b.cover){if(cover.hardBlock)tile(c,0x8dacc6,.18);else edgeMark(c,cover.edge,0xe4ce92,.65);}
    $('tactical-legend').textContent='Blue: full cover / blocks route & sight · Gold edge: wall / −25 points across it; sides exposed; walk around · Red: planned danger';
  }
  return {pick,cancel,render,confirm:()=>{if(preview)$('commit-preview')?.click();}};
}
