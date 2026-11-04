import { SPECIES } from './sanctuary.js';

// The director watches the simulation and raises missions that match what is actually happening: a sick animal,
// low supplies, a newborn, an unrepaired habitat, visitors disturbing sensitive wildlife, a rare species spotted.
// Each mission has a real completion condition checked against live state; none are random busywork.
const DAY=1440;
export function createDirector(sim,sanct,ops,journal,rescue,{rng=Math.random}={}){
 const state={active:[],done:[],seen:{},births:sanct.state.births,serial:0,failed:0};
 const nowM=()=>sanct.state.minutes;
 const residents=()=>sanct.residents();
 const byId=id=>sim.animals.find(a=>a.id===id);
 // Each rule: find candidates, make a key so the same situation is only raised once, define a done() and optional expiry.
 const RULES=[
  {id:'sick',scan:()=>residents().concat(sim.animals.filter(a=>a.rescueCase&&a.stage==='rehabilitating')).filter(a=>a.health<48).map(a=>({key:'sick:'+a.id,a})),
   make:({a})=>({title:'Treat '+a.name,detail:a.name+' ('+(SPECIES[a.kind]?.common||a.kind)+') is in poor health ('+Math.round(a.health)+'%). Treat the animal and keep it fed and calm.',reward:{funds:45,reputation:1},done:()=>{const x=byId(a.id);return !x||x.health>=75},expireDays:5,focus:a.id})},
  {id:'food',scan:()=>Object.keys(sanct.state.stock).filter(k=>['meat','hay','browse','aquatic'].includes(k)&&sanct.state.stock[k]<7&&residents().some(a=>SPECIES[a.kind].foods[0]===k)).map(k=>({key:'food:'+k,k})),
   make:({k})=>({title:'Restock '+k,detail:'Supplies of '+k+' are almost gone. Keepers cannot feed residents without it.',reward:{funds:0,reputation:1,credits:0},done:()=>sanct.state.stock[k]>=20,expireDays:3})},
  {id:'newborn',scan:()=>sanct.summary().familyTree.filter(f=>!state.seen['born:'+f.id]).map(f=>({key:'born:'+f.id,f})),
   make:({f})=>({title:'Welcome '+f.name,detail:f.name+' has been born. Keep the mother well fed and the young one calm and fed.',reward:{funds:60,reputation:2,credits:1},done:()=>{const a=byId(f.id);return !a||(a.nutrition>=65&&a.stress<=40&&(a.ageDays||0)>=1.5)},expireDays:6,focus:f.id})},
  {id:'habitat',scan:()=>Object.keys(SPECIES).filter(k=>residents().some(a=>a.kind===k)&&ops.habitatScore(k)<55).map(k=>({key:'hab:'+k,k})),
   make:({k})=>({title:'Improve the '+SPECIES[k].common.toLowerCase()+' habitat',detail:'The habitat only meets '+ops.habitatScore(k)+'% of this species\' needs. Open Build mode and add what is missing.',reward:{funds:50,reputation:2},done:()=>ops.habitatScore(k)>=80,expireDays:8,focusSpecies:k})},
  {id:'visitors',scan:()=>residents().filter(a=>a.stress>62&&ops.summary().visitors.onSite>0&&!ops.summary().visitors.restricted[a.kind]).map(a=>({key:'vis:'+a.kind,a})),
   make:({a})=>({title:'Protect the '+SPECIES[a.kind].common.toLowerCase()+' from visitors',detail:a.name+' is stressed ('+Math.round(a.stress)+'%) while visitors are on site. Close the habitat to visitors or calm the animal.',reward:{funds:30,reputation:2},done:()=>ops.summary().visitors.restricted[a.kind]||residents().filter(x=>x.kind===a.kind).every(x=>x.stress<45),expireDays:2})},
  {id:'rare',scan:()=>Object.entries(journal.state.entries).filter(([k,e])=>e.first!==null&&e.photos.length===0&&['Endangered','Critically Endangered','Vulnerable'].includes(journal.info(k)?.status)).map(([k])=>({key:'rare:'+k,k})),
   make:({k})=>({title:'Document the '+journal.info(k).common.toLowerCase(),detail:'You have seen a '+journal.info(k).status.toLowerCase()+' species. Photograph it in Camera mode for the journal.',reward:{funds:40,reputation:1,credits:1},done:()=>(journal.state.entries[k]?.photos.length||0)>0,expireDays:10})},
  {id:'welfare',scan:()=>sanct.summary().avgWelfare<55&&residents().length?[{key:'welf'}]:[],
   make:()=>({title:'Turn welfare around',detail:'Average welfare has dropped below 55%. Check food, water, enrichment and habitats.',reward:{funds:40,reputation:2},done:()=>sanct.summary().avgWelfare>=70,expireDays:5})},
 ];
 function scan(){
  const m=nowM();
  for(const r of RULES){
   for(const c of r.scan()){
    if(state.seen[c.key]!==undefined&&m<state.seen[c.key])continue;
    if(state.active.some(x=>x.key===c.key))continue;
    const made=r.make(c);const mission={id:'m-'+(++state.serial),key:c.key,rule:r.id,...made,raisedAt:m,expires:m+made.expireDays*DAY,done:made.done};
    state.active.push(mission);state.seen[c.key]=m+DAY*(made.expireDays+2);   // not raised again for a while
    sanct.say('📋 New mission: '+made.title+'.');
   }
  }
  for(const mi of state.active.slice()){
   if(mi.done()){state.active.splice(state.active.indexOf(mi),1);complete(mi);continue}
   if(m>mi.expires){state.active.splice(state.active.indexOf(mi),1);state.failed++;sanct.state.reputation=Math.max(0,sanct.state.reputation-1);state.done.unshift({title:mi.title,result:'expired',day:sanct.state.day});sanct.say('⌛ Mission expired: '+mi.title+'.')}
  }
  if(state.done.length>20)state.done.length=20;
 }
 function complete(mi){
  const r=mi.reward||{};if(r.funds)sanct.earn(r.funds);if(r.reputation)sanct.state.reputation+=r.reputation;if(r.credits)sanct.state.credits+=r.credits;
  state.done.unshift({title:mi.title,result:'complete',day:sanct.state.day,reward:r});sanct.say('✅ Mission complete: '+mi.title+(r.funds?' (+'+r.funds+' funds)':'')+'.');
 }
 const summary=()=>({active:state.active.map(m=>({id:m.id,rule:m.rule,title:m.title,detail:m.detail,reward:m.reward,daysLeft:Math.max(0,Math.ceil((m.expires-nowM())/DAY)),focus:m.focus,focusSpecies:m.focusSpecies})),done:state.done.slice(0,8),failed:state.failed});
 const serialize=()=>({seen:state.seen,done:state.done,serial:state.serial,failed:state.failed,births:state.births,active:state.active.map(m=>({key:m.key,rule:m.rule,raisedAt:m.raisedAt}))});
 function restore(d){if(!d)return;Object.assign(state,{seen:d.seen&&typeof d.seen==='object'?d.seen:{},done:Array.isArray(d.done)?d.done:[],serial:Number.isFinite(d.serial)?d.serial:0,failed:Number.isFinite(d.failed)?d.failed:0});/* active missions are re-derived by scan() from live state */}
 sanct.extend({key:'director',tick:()=>{},summary:()=>({}),serialize,restore});
 return {state,scan,summary,RULES};
}
