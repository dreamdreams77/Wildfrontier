import { SPECIES } from './sanctuary.js';

// Field activities, research, conservation milestones and regions. Every activity changes real state: journal sightings,
// habitat quality, research points that unlock perks, funds, reputation. Spots refresh over days so they stay worth visiting.
const DAY=1440;
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));

export const REGIONS=[
 {id:'woodland',label:'Northern Woodland',x:-10,z:0,r:16,unlock:null,blurb:'Mixed oak and pine woodland around the ranger station.'},
 {id:'creek',label:'Creekside Wetlands',x:7,z:0,r:9,unlock:null,blurb:'Slow water, reeds and the animals that depend on them.'},
 {id:'savanna',label:'Safari Reserve',x:30,z:0,r:16,unlock:{landmark:'gate'},blurb:'Open grassland, acacia and the waterhole.'},
 {id:'highland',label:'Highland Marsh',x:15,z:-13,r:7,unlock:{reputation:20},blurb:'Rocky ledges, a quiet pool and shy marsh birds. Opens as your reputation grows.'},
];
export const FOOT_KINDS=['deer','rabbit','fox','raccoon','beaver','riverOtter','bobcat','redWolf','opossum','skunk'];
export const TRACK_CLUE={deer:'two-toed heart-shaped hoof prints',rabbit:'small paired prints with long hind feet',fox:'neat oval prints in a straight line with claw marks',raccoon:'small hand-like prints with five long toes',beaver:'webbed hind prints and a dragged tail',riverOtter:'webbed five-toed prints beside a mud slide',bobcat:'round four-toed prints with no claw marks',redWolf:'large oval prints with four toes and claws',opossum:'hand-like prints with a splayed opposable toe',skunk:'five-toed prints with long front claws'};
const SPOTS=[
 ['footprints','woodland',-6,-8],['footprints','woodland',-16,2],['footprints','creek',5,-11],['footprints','creek',6,9],['footprints','savanna',23,-3],
 ['hide','woodland',-9,13],['hide','creek',9,-4],['hide','savanna',33,-9],
 ['water','creek',6,-2],['water','creek',8,11],['water','savanna',31,5],['water','savanna',36,-8],
 ['plant','woodland',-13,-12],['plant','woodland',-8,-14],['plant','woodland',-1,-12],['plant','creek',3,-4],['plant','creek',10,5],['plant','savanna',27,-7],
 ['litter','woodland',-4,5],['litter','woodland',-17,-9],['litter','creek',4,3],['litter','creek',9,-9],['litter','woodland',-10,8],['litter','savanna',22,6],['litter','savanna',34,2],['litter','woodland',-2,-10],
 ['footprints','highland',14,-12],['hide','highland',16,-11],['water','highland',17,-13],['plant','highland',12,-14],['litter','highland',15,-9],
];
export const ACTIVITY_LABEL={footprints:'Identify tracks',hide:'Watch from the hide',water:'Test water quality',plant:'Plant a tree',litter:'Collect litter'};
export const PLANT_COST=30;
export const PERKS=[
 {at:20,id:'scope',label:'Tracking scope',blurb:'Clues and tracks are easier to spot (larger pickup radius).'},
 {at:45,id:'bulk',label:'Bulk building',blurb:'Building materials cost 10% less.'},
 {at:80,id:'lab',label:'Field laboratory',blurb:'Water tests give more research and your journal photos pay 25% more.'},
 {at:130,id:'network',label:'Partner network',blurb:'Transfers pay an extra 60 in partner grants.'},
];
export const MILESTONES=[
 {id:'rescue1',label:'First rescue',blurb:'Close a rescue case.',check:c=>c.rescue.rescued>=1,reward:{funds:80,reputation:2}},
 {id:'rescue3',label:'Dedicated rescuer',blurb:'Close three rescue cases.',check:c=>c.rescue.rescued>=3,reward:{funds:200,reputation:4,credits:2}},
 {id:'journal10',label:'Naturalist',blurb:'Discover 10 species.',check:c=>c.journal.discovered>=10,reward:{funds:100,reputation:2}},
 {id:'journal26',label:'Complete field guide',blurb:'Discover all 26 species.',check:c=>c.journal.discovered>=26,reward:{funds:400,reputation:8,credits:3}},
 {id:'birth',label:'New life',blurb:'Welcome a birth in the breeding programme.',check:c=>c.sanct.births>=1,reward:{funds:100,reputation:2}},
 {id:'gene',label:'Diverse gene pool',blurb:'Hold three founder lines of one species.',check:c=>c.sanct.maxFounders>=3,reward:{funds:150,reputation:3,credits:1}},
 {id:'visitors',label:'Open doors',blurb:'Welcome 50 visitors.',check:c=>c.visitors>=50,reward:{funds:100,reputation:2}},
 {id:'green',label:'Green thumb',blurb:'Plant five trees.',check:c=>c.activities.planted>=5,reward:{funds:80,reputation:2}},
 {id:'clean',label:'Clean reserve',blurb:'Collect eight pieces of litter.',check:c=>c.activities.litter>=8,reward:{funds:80,reputation:2}},
 {id:'tracker',label:'Master tracker',blurb:'Identify tracks correctly five times.',check:c=>c.activities.tracksRight>=5,reward:{funds:100,reputation:2,credits:1}},
 {id:'trust',label:'Trusted by wildlife',blurb:'Earn the trust of an animal (70+).',check:c=>c.maxTrust>=70,reward:{funds:100,reputation:3}},
 {id:'welfare',label:'Thriving sanctuary',blurb:'Hold average welfare at 85% or more.',check:c=>c.sanct.avgWelfare>=85,reward:{funds:250,reputation:5,credits:2}},
];

export function createActivities(sim,sanct,journal,rescue,{rng=Math.random,nearbyKinds=()=>[]}={}){
 const state={research:0,done:{},planted:[],counts:{planted:0,litter:0,tracksRight:0,tracksWrong:0,water:0,hides:0,sightings:0},milestones:{},unlocked:{},serial:0,quiz:{}};
 const day=()=>sanct.state.day;
 const spots=SPOTS.map(([type,region,x,z],i)=>({id:type+'-'+i,type,region,x,z}));
 const regionOf=id=>REGIONS.find(r=>r.id===id);
 const perks=()=>PERKS.filter(p=>state.research>=p.at).map(p=>p.id);
 const hasPerk=id=>state.research>=PERKS.find(p=>p.id===id).at;
 function regionUnlocked(r){
  if(!r.unlock||state.unlocked[r.id])return true;const u=r.unlock;
  const ok=(u.reputation===undefined||sanct.state.reputation>=u.reputation)&&(!u.landmark||!!journal.state.landmarks[u.landmark]);
  if(ok){state.unlocked[r.id]=true;sanct.say('🗺 New region opened: '+r.label+'.')}return ok;
 }
 const available=s=>{const r=regionOf(s.region);if(!regionUnlocked(r))return false;if(s.type==='plant'&&state.planted.some(p=>p.spot===s.id))return false;const d=state.done[s.id];return d===undefined||day()-d>=(s.type==='litter'?99999:s.type==='plant'?99999:3)};
 const nearest=(pos,r=2.8)=>{let b=null,bd=r;for(const s of spots){if(!available(s))continue;const d=Math.hypot(s.x-pos.x,s.z-pos.z);if(d<bd){bd=d;b=s}}return b};
 const reward=(r)=>{if(r.funds)sanct.earn(r.funds);if(r.reputation)sanct.state.reputation+=r.reputation;if(r.credits)sanct.state.credits+=r.credits;if(r.research)state.research+=r.research};
 // ---- tracks: pick the animal that made them ----
 function startTracks(spot){
  const pool=FOOT_KINDS.filter(k=>sim.animals.some(a=>a.kind===k)||true);const answer=pool[Math.floor(rng()*pool.length)];
  const wrong=pool.filter(k=>k!==answer).sort(()=>rng()-.5).slice(0,2);const options=[answer,...wrong].sort(()=>rng()-.5);
  state.quiz[spot.id]={answer,options};return {type:'footprints',spotId:spot.id,clue:TRACK_CLUE[answer],options:options.map(k=>({kind:k,label:journal.info(k)?.common||k}))};
 }
 function answerTracks(spotId,kind){
  const q=state.quiz[spotId];if(!q)return {ok:false,message:'Nothing to identify here.'};const spot=spots.find(s=>s.id===spotId);delete state.quiz[spotId];
  state.done[spotId]=day();
  if(kind===q.answer){state.counts.tracksRight++;journal.sight(q.answer,day());reward({funds:25,research:6,reputation:0});return {ok:true,correct:true,message:'Correct: '+(journal.info(q.answer)?.common||q.answer)+' tracks. Journal updated.'}}
  state.counts.tracksWrong++;reward({research:1});return {ok:true,correct:false,message:'Not quite: those were '+(journal.info(q.answer)?.common||q.answer).toLowerCase()+' tracks ('+TRACK_CLUE[q.answer]+').'};
 }
 // ---- hides: log the species actually near the hide ----
 function useHide(spot){
  const kinds=[...new Set(nearbyKinds(spot.x,spot.z,16))];const phase=sim.phase;const found=[];let fresh=0;
  for(const k of kinds){const r=journal.sight(k,day());found.push(k);if(r.first)fresh++}
  state.done[spot.id]=day();state.counts.hides++;state.counts.sightings+=found.length;
  const rp=3+found.length*2+fresh*5+(phase==='Dawn'||phase==='Dusk'?3:0);reward({funds:10+fresh*20,research:rp});
  return {ok:true,message:found.length?'You logged '+found.map(k=>journal.info(k)?.common||k).join(', ')+(fresh?' ('+fresh+' new for the journal)':'')+'. +'+rp+' research.':'Quiet for now. Come back at dawn or dusk. +'+rp+' research.',found,fresh};
 }
 // ---- water quality: real habitat water drives the readings ----
 function testWater(spot){
  const w=sim.habitat.water,wet=sim.habitat.wetland;const q=clamp((w*.7+wet*.3)+((spot.x*13+spot.z*7)%9)-4);
  const ph=Math.round((6.2+q/100*1.8)*10)/10,clarity=Math.round(clamp(q+6)),oxygen=Math.round((4+q/100*6)*10)/10;
  const grade=q>=75?'Excellent':q>=55?'Good':q>=35?'Poor':'Unhealthy';
  state.done[spot.id]=day();state.counts.water++;reward({research:hasPerk('lab')?8:4,funds:15});
  return {ok:true,grade,ph,clarity,oxygen,quality:Math.round(q),message:'Water quality: '+grade+' (pH '+ph+', clarity '+clarity+'%, oxygen '+oxygen+' mg/L).'+(q<55?' Restoring creek-side planting would help.':'')};
 }
 // ---- trees: planted saplings grow and add real habitat cover ----
 function plant(spot){
  if(!sanct.spend(PLANT_COST))return {ok:false,message:'Planting costs '+PLANT_COST+' for stock and tools.'};
  state.planted.push({id:'t'+(++state.serial),spot:spot.id,x:spot.x,z:spot.z,plantedDay:day()});state.counts.planted++;sim.habitat.cover=clamp(sim.habitat.cover+1.4);sim.habitat.biodiversity=clamp(sim.habitat.biodiversity+.4);reward({research:2});
  return {ok:true,message:'Sapling planted. It will grow over the coming days and improve woodland cover.'};
 }
 const growth=p=>clamp((day()-p.plantedDay)/6,0,1);
 function collectLitter(spot){state.done[spot.id]=day();state.counts.litter++;sim.habitat.disturbance=clamp(sim.habitat.disturbance-1.2);reward({funds:8,research:1,reputation:state.counts.litter%4===0?1:0});return {ok:true,message:'Litter collected. The area feels cleaner and quieter.'}}
 function interact(spot){
  if(!spot||!available(spot))return {ok:false,message:'Nothing to do here right now.'};
  if(spot.type==='footprints')return {ok:true,quiz:startTracks(spot)};
  if(spot.type==='hide')return useHide(spot);
  if(spot.type==='water')return testWater(spot);
  if(spot.type==='plant')return plant(spot);
  if(spot.type==='litter')return collectLitter(spot);
  return {ok:false,message:'Unknown activity.'};
 }
 // ---- milestones and perks ----
 function ctx(){
  const sum=sanct.summary(),R=rescue?rescue.summary().stats:{rescued:0};const prog=journal.progress();
  return {rescue:R,journal:prog,sanct:{births:sum.births,avgWelfare:sum.avgWelfare,maxFounders:Math.max(0,...sum.species.map(s=>s.founders))},visitors:sum.ext.visitors?sum.ext.visitors.total:0,activities:{planted:state.counts.planted,litter:state.counts.litter,tracksRight:state.counts.tracksRight},maxTrust:Math.max(0,...sim.animals.map(a=>a.trust||0))};
 }
 function scan(){
  const c=ctx();const out=[];
  for(const m of MILESTONES){if(state.milestones[m.id])continue;if(m.check(c)){state.milestones[m.id]=day();reward(m.reward);sanct.say('🏆 Milestone: '+m.label+'!');out.push(m)}}
  for(const r of REGIONS)regionUnlocked(r);
  sanct.mods.costMul=hasPerk('bulk')?.9:1;sanct.mods.transferBonus=hasPerk('network')?60:0;sanct.mods.photoMul=hasPerk('lab')?1.25:1;
  return out;
 }
 function markers(){const m=[];for(const s of spots){if(!available(s))continue;m.push({id:s.id,type:'spot',spot:s.type,x:s.x,z:s.z,label:ACTIVITY_LABEL[s.type]})}return m}
 const summary=()=>({research:state.research,perks:PERKS.map(p=>({...p,unlocked:state.research>=p.at})),milestones:MILESTONES.map(m=>({id:m.id,label:m.label,blurb:m.blurb,reward:m.reward,done:!!state.milestones[m.id]})),regions:REGIONS.map(r=>({...r,unlocked:!r.unlock||!!state.unlocked[r.id]})),counts:{...state.counts},planted:state.planted.map(p=>({...p,growth:growth(p)}))});
 const serialize=()=>JSON.parse(JSON.stringify({research:state.research,done:state.done,planted:state.planted,counts:state.counts,milestones:state.milestones,unlocked:state.unlocked,serial:state.serial}));
 function restore(d){if(!d)return;Object.assign(state,{research:d.research||0,done:d.done||{},planted:d.planted||[],counts:{...state.counts,...(d.counts||{})},milestones:d.milestones||{},unlocked:d.unlocked||{},serial:d.serial||0})}
 sanct.extend({key:'activities',tick:()=>{},summary:()=>({}),serialize,restore});
 return {state,spots,nearest,interact,answerTracks,scan,markers,summary,perks,hasPerk,growth,regionUnlocked,available};
}
