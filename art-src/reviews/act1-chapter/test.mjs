import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createState,transactOffer,sendOnRoute} from '../../../web/js/v3/state.js?v=12';
import {chapterInventory,timeBudget,crewChoices,shipmentFixture,shipmentReadiness,settleFixture,carryPreview,endingExamples,proposalSummary} from './model.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../../../'+p,import.meta.url)));
const content=read('content/era1-slice-v1.json'),story=read('content/act1-story-v1.json'),map=read('map/kallio-era1-2003-v1.json');
let count=0;const check=(condition,label)=>{assert(condition,label);count++};
const inventory=chapterInventory(content,story,map);
check(inventory.length===20,'20 authored blocks');check(new Set(inventory.map(s=>s.day)).size===10,'10 authored days');check(inventory.filter(s=>s.encounter).length===17,'17 authored encounters');check(inventory.filter(s=>s.door).length===3,'3 authored free door blocks');
check(content.missions.length===4,'4 authored missions');check(inventory[19].encounter.id==='enc-shipment-night','authored final shipment');
for(const n of [0,1,3,4,10]){const b=timeBudget(n,0);check(b.proposedBlocks===n*.3||Math.abs(b.proposedBlocks-n*.3)<1e-9,'D002 arithmetic');check(b.currentBlocks===0,'current personal trip/trade block cost');}
check(timeBudget(2,1).wholeBlocks===0&&timeBudget(2,1).remainderTenths===9,'three visits fit fractionally');check(timeBudget(2,2).wholeBlocks===1&&timeBudget(2,2).remainderTenths===2,'fourth turns one block in estimate');
for(const n of [-1,1.5,101,NaN]){assert.throws(()=>timeBudget(n,0));count++;}
const offer=content.market_offers.find(o=>o.side==='sell'&&o.quote.kind==='exact');
const market=createState(content);market.stock.piri=1;check(transactOffer(market,offer).ok&&market.chapterEarned===offer.quote.eur,'current web market sales also count chapter income');
const route=createState(content);route.stock.piri=1;route.revealedOffers.push(offer.id);route.route={path:['piritori',offer.anchor_id],capacity:4,ordinary:1,hidden:0};check(sendOnRoute(route,{content}).ok&&route.chapterEarned===offer.quote.eur,'current web route receipts also count chapter income');
const ids=crewChoices(content).slice(0,3).map(c=>c.id);
const poor=shipmentFixture(content,{crewIds:ids,cash:399});check(settleFixture(poor,content).reason==='cannot-afford','real engine cash gate');
const notEarned=shipmentFixture(content,{crewIds:ids,earned:399});check(!shipmentReadiness(notEarned,content).goalAvailable,'real fence progress gate');check(settleFixture(notEarned,content).reason==='not-available','real engine progress refusal');
const state=shipmentFixture(content,{crewIds:ids}),same=structuredClone(state),result=settleFixture(state,content),replay=settleFixture(same,content);
check(result.reason===''&&result.cashDelta===-400,'real operation pays source stake');check(result.outcome===replay.outcome,'same seed replays same real operation');check(['clean','messy','lost'].includes(result.outcome),'existing engine outcome');
const terminal=JSON.stringify(state);check(settleFixture(state,content).reason==='not-available','real engine refuses duplicate settlement');check(JSON.stringify(state)===terminal,'duplicate settlement leaves fixture unchanged');
const carry=carryPreview(state,content);check(carry.rows.find(r=>r.key==='cash').next===160,'source chapter opening stake');check(carry.rows.find(r=>r.key==='gear').rule==='carry','source weapons carry');check(!carry.nextChapterAuthored,'chapter 2 not authored');
for(const ending of endingExamples(content))check(ending.id===ending.engineForecast,`real ending forecast ${ending.id}`);
const driver=content.crew.find(c=>c.role==='driver').id,plan=proposalSummary(content,[...ids,driver],'van');check(plan.reserve.id===driver&&plan.container.length===3&&plan.proposed&&!plan.implemented,'proposal uses actual extraction competency and stays proposed');
check(JSON.stringify(content)===JSON.stringify(read('content/era1-slice-v1.json')),'source content untouched');
console.log(`Chapter rehearsal model: ${count} passed; actual model fixtures, not full playthrough outcomes.`);
