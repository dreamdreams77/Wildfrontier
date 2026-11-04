import { ensureProfile } from './ai.js';
import { EQUIPMENT } from './equipment.js';

// Wildlife rescue as a complete playable chain: report -> track -> find -> assess -> handle -> transport -> rehabilitate -> release.
// Cases differ in difficulty, deadline, equipment and number of animals; how well you handle them decides the outcome.
const DAY=1440;
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
export const PHASES=['reported','tracking','found','assessed','handled','transport','rehab','closed'];
export const PHASE_LABEL={reported:'Report received',tracking:'Tracking',found:'Animal located',assessed:'Assessed',handled:'Secured',transport:'In transit',rehab:'In rehabilitation',closed:'Case closed'};
export const SPOTS=[
 {name:'North meadow',x:-8,z:-13},{name:'Pine fringe',x:-18,z:-4},{name:'Creek bend',x:5,z:-8},{name:'Clover patch',x:2,z:10},
 {name:'Old oak hollow',x:-4,z:-7},{name:'Berry thicket',x:12,z:-9},{name:'Boardwalk reeds',x:6,z:13},{name:'Rocky ledge',x:-15,z:-11},
];
const NAMES=['Aponi','Kwahu','Mika','Nokosi','Pakwa','Sipa','Tahki','Wapi','Yona','Zonta','Ahote','Chenoa','Dyani','Elan','Haloke','Igasho'];
export const TEMPLATES=[
 {id:'songbird',title:'Stunned songbird',difficulty:1,kinds:['bird','cardinal','woodDuck'],count:1,deadlineH:null,equipment:[],injury:'Stunned after a window strike; one wing drooping.',health:[45,62]},
 {id:'small',title:'Injured small mammal',difficulty:1,kinds:['rabbit','squirrel','opossum'],count:1,deadlineH:null,equipment:['firstAid'],injury:'Bite wounds and dehydration after a dog encounter.',health:[38,55]},
 {id:'midsize',title:'Trapped mid-sized animal',difficulty:2,kinds:['fox','raccoon','skunk','beaver','riverOtter'],count:1,deadlineH:10,equipment:['net'],injury:'Leg caught in discarded fencing wire; swollen and exhausted.',health:[30,48]},
 {id:'raptor',title:'Grounded large bird',difficulty:2,kinds:['owl','greatBlueHeron'],count:1,deadlineH:9,equipment:['net'],injury:'Fishing line wrapped around the wing; cannot fly.',health:[34,52]},
 {id:'deer',title:'Injured fawn',difficulty:2,kinds:['deer'],count:1,deadlineH:8,equipment:['net','firstAid'],injury:'Deep laceration on the rear leg and separated from its mother.',health:[28,45]},
 {id:'predator',title:'Wounded predator',difficulty:3,kinds:['bobcat','redWolf'],count:1,deadlineH:7,equipment:['net','tranq','crate'],injury:'Snare wound and infection. Dangerous when cornered.',health:[26,42],danger:true},
 {id:'orphans',title:'Orphaned litter',difficulty:3,kinds:['rabbit','fox','raccoon'],count:3,deadlineH:5,equipment:['crate','firstAid'],injury:'Cold, hungry and alone since the parent was lost.',health:[34,50],juvenile:true},
 {id:'storm',title:'Storm-stranded animals',difficulty:4,kinds:['deer','beaver','riverOtter'],count:2,deadlineH:6,equipment:['net','crate','firstAid'],injury:'Swept from shelter by flooding; hypothermic and injured.',health:[24,40]},
];
// approach options when securing an animal
export const APPROACHES={
 quiet:{label:'Quiet approach',needs:[],base:.5,stress:4,time:25,blurb:'Slow and patient. Safest for the animal, but needs a calm animal and takes longer.'},
 net:{label:'Net capture',needs:['net'],base:.72,stress:16,time:8,blurb:'Fast and reliable, but frightening.'},
 sedate:{label:'Sedation',needs:['tranq'],base:.9,stress:7,time:10,blurb:'Very reliable. Uses a sedation kit and carries a small medical risk.'},
};

export function createRescue(sim,sanct,{rng=Math.random}={}){
 const state={cases:[],serial:0,nextReport:sanct.state.minutes+180,stats:{opened:0,rescued:0,lost:0,released:0,scoreTotal:0},log:[]};
 const note=text=>{state.log.unshift({day:sanct.state.day,text});if(state.log.length>30)state.log.length=30;sanct.say(text)};
 const stock=k=>sanct.state.stock[k]||0;
 const byId=id=>sim.animals.find(a=>a.id===id);
 const caseOf=id=>state.cases.find(c=>c.id===id);
 const caseOfAnimal=aid=>state.cases.find(c=>c.animalIds.includes(aid)&&c.phase!=='closed');
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const now=()=>sanct.state.minutes;

 function pickTemplate(difficultyCap){
  const rep=sanct.state.reputation;const cap=difficultyCap||(rep>=45?4:rep>=28?3:rep>=14?2:1);
  const pool=TEMPLATES.filter(t=>t.difficulty<=cap);return pool[Math.floor(rng()*pool.length)];
 }
 function report(templateId){
  const t=templateId?TEMPLATES.find(x=>x.id===templateId):pickTemplate();if(!t)return null;
  const spot=SPOTS[Math.floor(rng()*SPOTS.length)];
  const kind=t.kinds[Math.floor(rng()*t.kinds.length)];
  const id='case-'+(++state.serial);const animals=[];
  for(let i=0;i<t.count;i++){
   const name=NAMES[(state.serial*3+i)%NAMES.length]+(sim.animals.some(a=>a.name===NAMES[(state.serial*3+i)%NAMES.length])?' '+(state.serial+1):'');
   const x=spot.x+(rng()-.5)*2.4,z=spot.z+(rng()-.5)*2.4;
   const rec={id:'rescue-'+state.serial+'-'+i,kind,name,species:kind+' · rescue',condition:'Injured · located by report',location:spot.name,
    health:Math.round(t.health[0]+rng()*(t.health[1]-t.health[0])),hydration:Math.round(34+rng()*20),nutrition:Math.round(36+rng()*24),stress:Math.round(58+rng()*18),trust:0,stage:'sighted',injury:t.injury,
    notes:t.injury+' Reported at '+spot.name+'.',energy:42,social:30,mood:'Frightened',personality:t.danger?'Fierce when cornered, frightened underneath':'Frightened and exhausted',routine:'Hiding and conserving energy',sleeping:false,feedings:0,
    habitatPosition:[x,z],hidden:true,rescueCase:id,young:!!t.juvenile,juvenile:false,
    history:[{day:sanct.state.day,text:'Reported injured at '+spot.name+'.'}]};
   ensureProfile(rec);sim.animals.push(rec);animals.push(rec.id);
  }
  const c={id,template:t.id,title:t.title,difficulty:t.difficulty,kind,spot:{...spot},pos:{x:spot.x,z:spot.z},animalIds:animals,phase:'reported',reportedAt:now(),
   deadline:t.deadlineH?now()+t.deadlineH*60:null,equipment:[...t.equipment],clues:[],handled:[],outcome:null,score:0,stress:0,attempts:0,tranqUsed:0};
  state.cases.push(c);state.stats.opened++;
  note('📻 Rescue report: '+t.title.toLowerCase()+' ('+kind+(t.count>1?' ×'+t.count:'')+') near '+spot.name+'.'+(c.deadline?' Time-sensitive.':''));
  return c;
 }
 function accept(id){
  const c=caseOf(id);if(!c)return {ok:false,message:'No such case.'};if(c.phase!=='reported')return {ok:false,message:'Already under way.'};
  // clues form a trail that leads to the animal
  const a=byId(c.animalIds[0]);const target={x:a.habitatPosition[0],z:a.habitatPosition[1]};const ang=rng()*6.28;const start={x:target.x+Math.cos(ang)*13,z:target.z+Math.sin(ang)*13};
  c.clues=[0,1,2].map(i=>({x:start.x+(target.x-start.x)*(i+1)/4,z:start.z+(target.z-start.z)*(i+1)/4,found:false,kind:['tracks','blood drops','fur'][i]}));
  c.phase='tracking';return {ok:true,message:'Search area marked on your map. Follow the trail.',case:c};
 }
 function visit(ranger,radius=2.2){
  const events=[];
  for(const c of state.cases){
   if(c.phase!=='tracking')continue;
   for(const cl of c.clues)if(!cl.found&&dist(cl,ranger)<radius){cl.found=true;events.push({type:'clue',case:c,clue:cl});note('🔎 '+c.title+': found '+cl.kind+' leading further in.')}
   const a=byId(c.animalIds[0]);const near=a&&dist({x:a.habitatPosition[0],z:a.habitatPosition[1]},ranger)<4.5;
   if(c.clues.every(x=>x.found)||near){c.phase='found';for(const id of c.animalIds){const an=byId(id);if(an)an.hidden=false}events.push({type:'found',case:c});note('🐾 '+c.title+': animal located. Assess its condition before approaching.')}
  }
  return events;
 }
 const near=(c,aid,ranger,r)=>{const a=byId(aid);return a&&dist({x:a.habitatPosition[0],z:a.habitatPosition[1]},ranger)<=r};
 function assess(id,ranger){
  const c=caseOf(id);if(!c||c.phase==='reported'||c.phase==='tracking')return {ok:false,message:'You have not found the animal yet.'};
  if(c.phase!=='found')return {ok:false,message:'Already assessed.'};
  if(!near(c,c.animalIds[0],ranger,7))return {ok:false,message:'Move closer (within about 7 metres) to assess it.'};
  c.phase='assessed';const need=c.equipment.filter(e=>stock(e)<1);
  note('🩺 '+c.title+' assessed. Needs: '+(c.equipment.map(e=>EQUIPMENT[e].label.toLowerCase()).join(', ')||'nothing special')+'.'+(need.length?' Missing: '+need.map(e=>EQUIPMENT[e].label.toLowerCase()).join(', ')+'.':''));
  return {ok:true,message:'Assessment complete. Required: '+(c.equipment.map(e=>EQUIPMENT[e].label).join(', ')||'no special equipment')+'.',missing:need};
 }
 const missing=c=>c.equipment.filter(e=>stock(e)<1);
 function approachFor(c,approach){
  if(approach&&APPROACHES[approach])return approach;
  if(stock('net')>0&&!APPROACHES.net.needs.some(n=>stock(n)<1))return c.template==='predator'&&stock('tranq')>0?'sedate':'net';
  return 'quiet';
 }
 function handle(id,animalId,ranger,approach){
  const c=caseOf(id);if(!c)return {ok:false,message:'No such case.'};
  if(!['assessed','handled'].includes(c.phase))return {ok:false,message:c.phase==='found'?'Assess the animal first.':'Not ready to handle.'};
  animalId=animalId||c.animalIds.find(a=>!c.handled.includes(a));const a=byId(animalId);if(!a)return {ok:false,message:'Select an animal from this case.'};
  if(c.handled.includes(animalId))return {ok:false,message:a.name+' is already secured.'};
  if(!near(c,animalId,ranger,4.5))return {ok:false,message:'Get within about 4 metres of '+a.name+'.'};
  const miss=missing(c);if(miss.length&&c.difficulty>1)return {ok:false,message:'Missing equipment: '+miss.map(e=>EQUIPMENT[e].label).join(', ')+'. Buy it in Supplies.',missing:miss};
  const ap=approachFor(c,approach);const def=APPROACHES[ap];
  for(const n of def.needs)if(stock(n)<1)return {ok:false,message:'You need a '+EQUIPMENT[n].label.toLowerCase()+' for that approach.'};
  ensureProfile(a);
  // chance: approach strength, the animal's calm and trust, difficulty and how frightened it already is
  let p=def.base+(a.traits.calm-.5)*.3+(a.trust||0)*.002-(c.difficulty-1)*.06-(a.stress-60)*.002;if(ap==='quiet')p+=(a.traits.calm-.4)*.25;
  p=Math.max(.12,Math.min(.97,p));c.attempts++;
  for(const n of def.needs)if(EQUIPMENT[n].consumed)sanct.state.stock[n]--;
  if(c.equipment.includes('firstAid')&&stock('firstAid')>0){sanct.state.stock.firstAid--;a.health=clamp(a.health+8)}
  state.lastRoll=p;
  if(rng()<=p){
   a.stress=clamp(a.stress+def.stress);c.stress+=def.stress;c.handled.push(animalId);a.mood='Secured';if(ap==='sedate'){a.health=clamp(a.health-6);c.tranqUsed++}
   a.history=a.history||[];a.history.push({day:sanct.state.day,text:'Secured by '+def.label.toLowerCase()+'.'});
   if(c.handled.length===c.animalIds.length)c.phase='handled';
   note('✅ '+a.name+' secured ('+def.label.toLowerCase()+', '+Math.round(p*100)+'% chance).');
   return {ok:true,message:a.name+' secured. '+(c.handled.length<c.animalIds.length?(c.animalIds.length-c.handled.length)+' more to catch.':'Arrange transport to the clinic.'),chance:p,approach:ap};
  }
  // failure: the animal bolts and gets hurt; the trail goes cold
  a.stress=clamp(a.stress+def.stress+12);a.health=clamp(a.health-10);c.stress+=def.stress+12;a.mood='Panicked';
  const ang=rng()*6.28;a.habitatPosition=[a.habitatPosition[0]+Math.cos(ang)*6,a.habitatPosition[1]+Math.sin(ang)*6];a.hidden=true;c.phase='tracking';
  c.clues=[0,1].map(i=>({x:a.habitatPosition[0]+Math.cos(ang+Math.PI)*(6*(1-i*.5)),z:a.habitatPosition[1]+Math.sin(ang+Math.PI)*(6*(1-i*.5)),found:false,kind:i?'fur':'tracks'}));
  note('⚠ '+a.name+' bolted and was hurt in the scramble. Pick up the trail again.');
  return {ok:false,message:a.name+' bolted ('+Math.round(p*100)+'% chance). It is hurt; track it again.',chance:p,escaped:true};
 }
 function transport(id,animalId,ranger){
  const c=caseOf(id);if(!c)return {ok:false,message:'No such case.'};
  if(!['handled','assessed','transport'].includes(c.phase)&&!c.handled.length)return {ok:false,message:'Secure an animal first.'};
  animalId=animalId||c.handled.find(a=>byId(a)&&byId(a).stage!=='rehabilitating');const a=byId(animalId);if(!a||!c.handled.includes(animalId))return {ok:false,message:'Secure the animal before moving it.'};
  if(c.equipment.includes('crate')&&stock('crate')<1)return {ok:false,message:'You need a transport crate.'};
  if(!near(c,animalId,ranger,5))return {ok:false,message:'Bring the crate within a few metres of '+a.name+'.'};
  c.phase='transport';a.hidden=false;return {ok:true,message:a.name+' loaded for transport to the recovery yard.',animalId};
 }
 const failCase=(c,why)=>{c.phase='closed';c.outcome='lost';state.stats.lost++;sanct.state.reputation=Math.max(0,sanct.state.reputation-3-c.difficulty);note('💔 '+c.title+' lost: '+why+' Reputation suffers.');for(const id of c.animalIds){const a=byId(id);if(a&&a.stage!=='released'&&a.stage!=='rehabilitating'){const i=sim.animals.indexOf(a);if(i>=0){sim.animals.splice(i,1);c.removed=(c.removed||[]).concat(id)}}}};
 function closeSuccess(c){
  const elapsed=now()-c.reportedAt;const win=c.deadline?c.deadline-c.reportedAt:Infinity;
  const speed=win===Infinity?1:Math.max(0,1-elapsed/win);const gentle=Math.max(0,1-c.stress/(40*c.animalIds.length));
  const score=Math.round(40+speed*30+gentle*30);c.score=score;c.outcome=score>=85?'excellent':score>=65?'good':'fair';
  const funds=Math.round(50*c.difficulty*(.7+score/200)),rep=Math.round(c.difficulty*(score>=85?3:2)),cred=c.difficulty>=3?c.difficulty-1:0;
  sanct.earn(funds);sanct.state.reputation+=rep;sanct.state.credits+=cred;state.stats.rescued++;state.stats.scoreTotal+=score;c.phase='closed';c.reward={funds,reputation:rep,credits:cred};
  note('🏅 '+c.title+' closed: '+c.outcome+' ('+score+'). +'+funds+' funds, +'+rep+' reputation'+(cred?', +'+cred+' credits':'')+'.');
 }
 // advance case state from the simulation: deadlines, rehab intake, releases
 function tick(){
  for(const c of state.cases){
   if(c.phase==='closed')continue;
   const animals=c.animalIds.map(byId).filter(Boolean);
   if(!animals.length&&c.phase!=='closed'){c.phase='closed';c.outcome='lost';continue}
   if(c.deadline&&now()>c.deadline&&!['rehab','closed'].includes(c.phase)&&!animals.every(a=>a.stage==='rehabilitating'||a.stage==='released'||c.handled.includes(a.id)&&c.phase==='transport')){failCase(c,'the window closed before the animal could be reached.');continue}
   // hurt animals left in the open deteriorate
   if(!['rehab','closed'].includes(c.phase))for(const a of animals){if(a.stage!=='rehabilitating'&&a.stage!=='released'){const rate=c.deadline?.003:.0015;a.health=clamp(a.health-rate*30)}if(a.health<=0){failCase(c,a.name+' did not survive.');break}}
   if(c.phase==='transport'&&animals.every(a=>a.stage==='rehabilitating'||a.stage==='released'||c.handled.includes(a.id)&&a.stage==='stabilized'))if(animals.some(a=>a.stage==='rehabilitating')){c.phase='rehab';note('🏥 '+c.title+': in the recovery yard. Begin rehabilitation.')}
   if(c.phase==='rehab'&&animals.length&&animals.every(a=>a.stage==='released')){state.stats.released+=animals.length;closeSuccess(c)}
  }
  // new reports arrive over time, scaled to reputation, never too many at once
  const active=state.cases.filter(c=>c.phase!=='closed').length;
  if(now()>=state.nextReport&&active<2){report();state.nextReport=now()+DAY*(1.2+rng()*1.4)}
  else if(now()>=state.nextReport)state.nextReport=now()+120;
 }
 const timeLeft=c=>c.deadline?Math.max(0,c.deadline-now()):null;
 function summary(){return {cases:state.cases.map(c=>({...c,animals:c.animalIds.map(byId).filter(Boolean).map(a=>({id:a.id,name:a.name,kind:a.kind,health:Math.round(a.health),stress:Math.round(a.stress),stage:a.stage,handled:c.handled.includes(a.id)})),timeLeft:timeLeft(c),missing:missing(c)})),stats:{...state.stats},log:state.log.slice(0,8),equipment:Object.fromEntries(Object.keys(EQUIPMENT).map(k=>[k,stock(k)]))}}
 // markers for the world and the map
 function markers(){const m=[];for(const c of state.cases){if(c.phase==='closed')continue;if(c.phase==='reported'||c.phase==='tracking')m.push({id:c.id,type:'search',x:c.pos.x,z:c.pos.z,radius:7,label:c.title});if(c.phase==='tracking')for(const cl of c.clues)m.push({id:c.id+'-c',type:'clue',x:cl.x,z:cl.z,found:cl.found,label:cl.kind});}return m}
 const serialize=()=>JSON.parse(JSON.stringify({serial:state.serial,nextReport:state.nextReport,cases:state.cases,stats:state.stats,log:state.log}));
 function restore(d){if(!d)return;const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);Object.assign(state,{serial:Number.isFinite(d.serial)?d.serial:0,nextReport:Number.isFinite(d.nextReport)?d.nextReport:state.nextReport,cases:(Array.isArray(d.cases)?d.cases:[]).filter(c=>obj(c)&&typeof c.id==='string'&&Array.isArray(c.animalIds)),stats:{...state.stats,...(obj(d.stats)?d.stats:{})},log:Array.isArray(d.log)?d.log.filter(x=>typeof x==='string'||obj(x)):[]})}
 sanct.extend({key:'rescue',tick:()=>{},summary:()=>({}),serialize,restore});
 return {state,report,accept,visit,assess,handle,transport,tick,summary,markers,caseOf,caseOfAnimal,missing,TEMPLATES,APPROACHES,approachFor};
}
