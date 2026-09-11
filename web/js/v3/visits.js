import {chooseEncounter} from './state.js?v=5';

export function availableVisits(state,data) {
 if(state.chapterCleared||state.endingId||state.battle?.status==='active')return [];
 return (data.content.optional_visits??[]).filter(v=>v.chapter===state.chapter
   &&Boolean(state.choices[v.requires_encounter])&&!state.choices[v.id]
   &&data.sites.get(v.site_id)?.anchorId===state.selectedAnchor);
}
export function openVisit(state,data,id) {
 if(!availableVisits(state,data).some(v=>v.id===id))return false;
 state.activeVisit=id;state.mode='visit';state.lastOutcome=null;return true;
}
export function activeVisit(state,data) {
 if(state.mode!=='visit')return null;
 return (data.content.optional_visits??[]).find(v=>v.id===state.activeVisit)??null;
}
export function chooseVisit(state,data,choiceId) {
 const visit=activeVisit(state,data);
 if(!visit||!availableVisits(state,data).some(v=>v.id===visit.id))return {ok:false,reason:'visit-unavailable'};
 const choice=visit.choices.find(c=>c.id===choiceId);
 if(!choice)return {ok:false,reason:'unknown-choice'};
 return chooseEncounter(state,visit,choice,data);
}
export function leaveVisit(state) {state.activeVisit=null;state.mode='route';state.lastOutcome=null;}

