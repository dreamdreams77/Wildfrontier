import './style.css';
import { createWorld } from './world.js';
import { createSimulation } from './simulation.js';
import { createSanctuary, SPECIES, FOODS, stageOf, welfareOf } from './sanctuary.js';
import { mountSanctuaryUI } from './sanctuary-ui.js';
import { createOperations } from './operations.js';
import { createManagement } from './management.js';
import { createJournal } from './journal.js';
import { mountBuildUI } from './build-ui.js';
import { mountExploreUI } from './explore-ui.js';
import { createPortraits } from './art/portraits.js';
import { createRescue } from './rescue.js';
import { createAudio } from './audio.js';
import { createActivities, ACTIVITY_LABEL } from './activities.js';
import { mountIntro, mountTutorial, shouldPlayIntro } from './intro.js';
import { createDirector } from './director.js';
import { mountMissionsUI } from './missions-ui.js';
import { ensureProfile, bondLabel, temperamentLabel } from './ai.js';
import { ENRICH_TYPES } from './enrichment.js';

const $=id=>document.getElementById(id);
const sim=createSimulation();
const SAVE_KEY='wildfrontier.sanctuary.v1';
const sanct=createSanctuary(sim);
const ops=createOperations(sanct);
const mgmt=createManagement(sanct,ops);
const journal=createJournal(SPECIES);
const rescue=createRescue(sim,sanct);
const director=createDirector(sim,sanct,ops,journal,rescue);
const activities=createActivities(sim,sanct,journal,rescue,{nearbyKinds:(x,z,r)=>world.animals.filter(a=>!a.userData.hidden&&Math.hypot(a.position.x-x,a.position.z-z)<r).map(a=>a.userData.kind)});
const JOURNAL_KEY='wildfrontier.journal.v1';
try{const raw=localStorage.getItem(SAVE_KEY);if(raw){let ok=false;try{ok=sanct.restore(JSON.parse(raw))}catch{}if(!ok){try{localStorage.setItem(SAVE_KEY+'.backup',raw)}catch{}console.warn('Saved sanctuary could not be loaded; starting fresh (the old save was kept as a backup).')}}}catch{}
try{const raw=localStorage.getItem(JOURNAL_KEY);if(raw)journal.restore(JSON.parse(raw))}catch{}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(sanct.serialize()))}catch{}}
function saveJournal(){const data=journal.serialize();try{localStorage.setItem(JOURNAL_KEY,JSON.stringify(data))}catch{for(const e of Object.values(data.entries))for(const p of e.photos)p.img=null;try{localStorage.setItem(JOURNAL_KEY,JSON.stringify(data))}catch{}}}
addEventListener('pagehide',()=>{save();saveJournal()});document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
const world=createWorld($('world'));
const audio=createAudio();
for(const ev of ['pointerdown','keydown'])addEventListener(ev,()=>audio.resume(),{once:true,passive:true});
document.addEventListener('click',e=>{if(e.target.closest('[data-p=shot]'))audio.sfx('shutter');else if(e.target.closest('button'))audio.sfx('click')},true);
const portraits=createPortraits(world.renderer);window.__wild={world,sim,sanct,ops,journal,portraits,rescue,director,activities,audio,mgmt};
sim.animals.forEach(a=>ensureProfile(a));
const simById=id=>sim.animals.find(a=>a.id===id);
world.setAIHooks({
 stats:id=>{const a=simById(id);if(!a)return null;ensureProfile(a);return {traits:a.traits,trust:a.trust||0,stress:a.stress,hunger:100-a.nutrition,thirst:100-a.hydration,energy:a.energy,boredom:a.boredom,social:a.social,sick:(mgmt.caseOf(id)?.sev||0)/100}},
 onNeed:(id,kind,dt)=>{const a=simById(id);if(!a)return;if(kind==='drink'){a.hydration=Math.min(100,a.hydration+(a.managed?1.5:5)*dt)}else if(kind==='eat'&&!a.managed&&a.stage==='wild'){a.nutrition=Math.min(100,a.nutrition+1.6*dt)}},
 onEnrich:(id,type)=>{const r=sanct.useEnrichment(id,type);if(r.ok)save()},
 onCall:(kind,type,pos,name)=>audio.call(kind,type,pos,name,{x:world.ranger.position.x,z:world.ranger.position.z},world.getYaw())
});
function refreshAIPoints(){const items=ops.state.items;world.setAIPoints({water:items.filter(i=>i.type==='pond'||i.type==='wallow').map(i=>({x:i.x,z:i.z})),shelter:items.filter(i=>i.type==='shelter').map(i=>({x:i.x,z:i.z})),food:items.filter(i=>i.type==='feeder').map(i=>({x:i.x,z:i.z})),enrich:items.filter(i=>ENRICH_TYPES.includes(i.type)).map(i=>({id:i.id,type:i.type,x:i.x,z:i.z}))})}
refreshAIPoints();setInterval(refreshAIPoints,1500);ops.state.items.forEach(i=>world.addBuildItem(i));
const keys={forward:false,back:false,left:false,right:false};window.__wildKeys=keys;
const keyMap={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
addEventListener('keydown',e=>{if(keyMap[e.code]){keys[keyMap[e.code]]=true;e.preventDefault()}if(e.code==='KeyE'&&world.nearClinic()){toast('Treatment wing ready. Select a patient in recovery to open clinical care.');renderAnimal(sim.selected())}if(e.code==='KeyE'&&world.nearResearchCentre())openResearchCentre();if(['1','2','3'].includes(e.key))selectTool(['observe','track','care'][Number(e.key)-1])});
addEventListener('keyup',e=>{if(keyMap[e.code])keys[keyMap[e.code]]=false});
// Touch walking: press and hold the ground and the ranger walks toward your finger; slide to steer, lift to stop.
// A quick tap still selects, a quick drag still looks around, and two fingers still pinch to zoom.
(function touchWalk(){const el=$('world'),HOLD=230,SLOP=10,DEAD=26;let id=null,t0=0,x0=0,y0=0,walking=false,timer=0,fx=0,fy=0;
 const ring=document.createElement('div');ring.className='walk-ring';document.body.appendChild(ring);
 const clear=()=>{keys.left=keys.right=keys.forward=keys.back=false};
 function steer(){const p=world.ranger.position.clone();p.y=.9;p.project(world.camera);const sx=(p.x*.5+.5)*innerWidth,sy=(-p.y*.5+.5)*innerHeight,dx=fx-sx,dy=fy-sy,len=Math.hypot(dx,dy);
  if(len<DEAD){clear();return}const nx=dx/len,ny=dy/len,t=.38;keys.left=nx<-t;keys.right=nx>t;keys.forward=ny<-t;keys.back=ny>t}
 function show(){ring.style.transform='translate('+fx+'px,'+fy+'px)';ring.classList.add('on')}
 function stop(){clearTimeout(timer);if(walking){walking=false;window.__wildWalking=false;clear();ring.classList.remove('on')}id=null}
 el.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;if(id!==null){stop();return}id=e.pointerId;x0=fx=e.clientX;y0=fy=e.clientY;t0=performance.now();clearTimeout(timer);
  timer=setTimeout(()=>{if(id===null||document.body.classList.contains('intro'))return;walking=true;window.__wildWalking=true;show();steer()},HOLD)},{passive:true});
 el.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;fx=e.clientX;fy=e.clientY;if(walking){show();steer();return}if(Math.abs(fx-x0)+Math.abs(fy-y0)>SLOP)clearTimeout(timer)},{passive:true});
 for(const ev of['pointerup','pointercancel'])el.addEventListener(ev,e=>{if(e.pointerId===id)stop()},{passive:true});
 setInterval(()=>{if(walking)steer()},120);
})();
const panel=$('inspectPanel');let tool='observe',selectedId='fawn-01',lastTick=performance.now();
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600)}

let researchPanel=null;
function openResearchCentre(){
 if(!world.nearResearchCentre()){world.focusResearchCentre();toast('Walk to the research lodge entrance, then press E to use its stations.');return}
 if(researchPanel){researchPanel.remove();researchPanel=null;return}
 researchPanel=document.createElement('section');researchPanel.id='researchPanel';researchPanel.className='research-panel';document.body.appendChild(researchPanel);renderResearchPanel();
}
function renderResearchPanel(){
 if(!researchPanel)return;const centre=sim.getResearchCentre();
 researchPanel.innerHTML='<header><div><small>FIELD STATION 04 · RESEARCH WING</small><h2>Conservation research</h2><p>Research points: <b>'+centre.score+'</b> · Family records: <b>'+centre.familyCount+'</b></p></div><button id="closeResearch" aria-label="Close research">×</button></header><div class="research-tabs"><span>01 · GENETICS</span><span>02 · MIGRATION</span><span>03 · HABITAT</span></div><div class="research-map"><b>SEASONAL FIELD MAP</b><div class="map-lines"><i></i><i></i><i></i><i></i></div><small>'+(centre.records.migration?'Telemetry active · stopover routes charted':'Map awaiting telemetry research')+'</small></div><div class="research-projects">'+centre.projects.map(p=>'<article><div><b>'+p.name+'</b><small>'+p.detail+'</small><em>'+p.status+' · '+p.cost+' RP</em></div><button data-project="'+p.id+'" '+(p.status==='Complete'||p.status.startsWith('Requires')||centre.score<p.cost?'disabled':'')+'>'+(p.status==='Complete'?'COMPLETE':'COMMISSION')+'</button></article>').join('')+'</div><footer>Genetic records are advisory only. Endangered-species pairings still require independent specialist approval.</footer>';
 researchPanel.querySelector('#closeResearch').addEventListener('click',()=>{researchPanel.remove();researchPanel=null});
 researchPanel.querySelectorAll('[data-project]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.project;const r=sim.runResearchProject(id);toast(r.message);if(r.ok){if(id==='wetland')world.setConservationProject('wetlandExpansion');if(id==='meadow')world.setConservationProject('meadowCorridor');if(id==='highland')world.setConservationProject('highlandReserve');renderHud()}renderResearchPanel()}));
}
function statusFor(a){if(a.managed)return 'SANCTUARY · '+stageOf(a).toUpperCase();const stage={sighted:'FIELD SIGHTING',assessed:'RANGER ASSESSED',stabilized:'STABILIZED',rehabilitating:'IN RECOVERY',released:'RELEASED',wild:'WILD RESIDENT'};return stage[a.stage]||'FIELD RECORD'}
function renderAnimal(a){selectedId=a.id;$('speciesTag').textContent=a.species.toUpperCase();$('animalName').textContent=a.name;{const hs=(a.history||[]).slice(-2).map(h=>'Day '+h.day+': '+h.text).join(' ');$('animalDesc').dataset.hist=hs}$('animalDesc').textContent=(a.history&&a.history.length?'History · '+a.history.slice(-2).map(h=>'Day '+h.day+': '+h.text).join(' ')+' — ':'')+(a.managed?a.notes+' Age '+Math.floor(a.ageDays||0)+' days · '+a.heritage+' naming · line '+a.geneticLine+(a.parents?' · parents '+a.parents.join(' & '):'')+'.':a.notes);$('condition').textContent=a.condition.toUpperCase();$('location').textContent=a.location.toUpperCase();{const url=portraits.portrait(a.kind,{sex:a.sex,young:!!(a.young||a.juvenile)});const box=$('animalPortrait'),gl=box.querySelector('span');if(url){box.style.backgroundImage='url('+url+')';box.classList.add('has-art');if(gl)gl.style.display='none'}else{if(gl){gl.style.display='';gl.textContent=a.kind==='deer'?'♧':'◌'}box.style.backgroundImage='';box.classList.remove('has-art')}}$('animalStage').textContent=statusFor(a);$('injuryText').textContent=a.injury;{const mm=world.minds().find(x=>x.id===a.id);const lbl={flee:'fleeing danger',shelter:'seeking shelter',drink:'drinking',eat:'foraging',rest:'resting',socialize:'seeking company',herd:'rejoining the group',enrich:'playing with enrichment',investigate:'curious about you',patrol:'pacing restlessly',explore:'exploring',groom:'grooming'};$('behaviorText').textContent=sim.behavior(a)+(mm&&mm.behaviour?' · now: '+(lbl[mm.behaviour]||mm.behaviour):'')}ensureProfile(a);$('personalityText').textContent=a.personality+' · '+temperamentLabel(a.traits)+' · '+bondLabel(a.trust||0)+(a.boredom>70?' · bored':'');$('routineText').textContent=a.routine;$('energyText').textContent=Math.round(a.energy)+'%';$('socialText').textContent=Math.round(a.social)+'%';
  for(const key of ['health','hydration','nutrition','stress']){$('meter-'+key).style.width=a[key]+'%';$('value-'+key).textContent=Math.round(a[key])+'%'}
  const actions=actionSet(a);$('actionButtons').innerHTML=actions.map(x=>'<button class="care-action '+(x.primary?'primary-action':'secondary-action')+'" data-action="'+x.id+'">'+x.label+' <span>↗</span></button>').join('');
  $('actionButtons').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>perform(b.dataset.action)));
  panel.classList.remove('hidden');
}
function managedActions(a){const sp=SPECIES[a.kind];const foods=sp.foods.map((f,i)=>({id:'sfeed:'+f,label:FOODS[f].icon+' FEED '+FOODS[f].short.toUpperCase()+' ('+sanct.state.stock[f]+')',primary:i===0}));return [...foods,{id:'senrich',label:'ENRICHMENT & PLAY'},{id:'streat',label:'VET CHECK ('+sanct.state.stock.medicine+')'},{id:'sopen',label:'OPEN SANCTUARY MANAGER'}]}
function actionSet(a){if(a.managed)return managedActions(a);if(a.stage==='sighted')return [{id:'observe',label:'LOG OBSERVATION'},{id:'track',label:'PLACE TRACKERS'},{id:'assess',label:'REQUEST RANGER ASSESSMENT',primary:true}];if(a.stage==='assessed')return [{id:'observe',label:'RECORD OBSERVATION'},{id:'stabilize',label:'STABILIZE IN FIELD',primary:true}];if(a.stage==='stabilized')return [{id:'transport',label:'TRANSPORT TO RECOVERY',primary:true}];if(a.stage==='rehabilitating'){const care=world.nearClinic()?[{id:'examine',label:'CLINICAL EXAMINATION'},{id:'woundCare',label:'CLEAN & DRESS WOUND'},{id:'rehab',label:'GUIDED REHABILITATION'}]:[];return [...care,{id:'feed',label:'SERVE RECOVERY FEED'},{id:'water',label:'REFRESH WATER'},{id:'quiet',label:'QUIET THE RECOVERY PEN'},{id:'enrich',label:'ADD SPECIES ENRICHMENT'},{id:'release',label:'RUN RELEASE ASSESSMENT',primary:true}]}if(a.stage==='released')return [{id:'observe',label:'LOG POST-RELEASE SIGHTING'}];return [{id:'observe',label:'LOG OBSERVATION'},{id:'track',label:'PLACE TRACKERS'}]}
function performManaged(action){const a=sim.selected();let r;
 if(action.startsWith('sfeed:'))r=sanct.feed(a.id,action.slice(6));else if(action==='senrich')r=sanct.enrich(a.id);else if(action==='streat')r=sanct.treat(a.id);else{sanctUI.open('residents');return}
 toast(r.message);renderAnimal(a);renderHud();save()}
const rpos=()=>({x:world.ranger.position.x,z:world.ranger.position.z});
function syncRescueWorld(){world.setMarkers([...rescue.markers(),...activities.markers()]);world.setPlantings(activities.summary().planted);for(const a of sim.animals){const w=world.animals.find(x=>x.userData.id===a.id);if(!w)continue;if(a.hidden&&!w.userData.hidden)world.hideAnimal(a.id,a.habitatPosition);else if(!a.hidden&&w.userData.hidden)world.revealAnimal(a.id)}for(const w of world.animals.slice())if(!sim.animals.some(a=>a.id===w.userData.id))world.removeAnimal(w.userData.id)}
const rescueActions={
 assess(cid){const r=rescue.assess(cid,rpos());toast(r.message);if(r.ok){const c=rescue.caseOf(cid);sim.select(c.animalIds[0]);sim.act('assess')}syncRescueWorld();renderHud();return r},
 handle(cid,aid,ap){const r=rescue.handle(cid,aid,rpos(),ap);toast(r.message);if(r.ok){sim.select(aid);const x=simById(aid);if(x.stage==='sighted')sim.act('assess');sim.act('stabilize');world.setAnimalStage(aid,simById(aid).stage)}syncRescueWorld();renderHud();save();return r},
 transport(cid,aid){const r=rescue.transport(cid,aid,rpos());toast(r.message);if(r.ok){sim.select(aid);sim.act('transport');world.setAnimalStage(aid,simById(aid).stage);world.focus(-12,7)}syncRescueWorld();renderHud();save();return r},
 build(){buildUI.open()}
};
function perform(action){
 {const cur=sim.selected();const cs=cur&&rescue.caseOfAnimal(cur.id);
  if(cs&&['assess','stabilize','transport'].includes(action)){const r=action==='assess'?rescueActions.assess(cs.id):action==='stabilize'?rescueActions.handle(cs.id,cur.id,null):rescueActions.transport(cs.id,cur.id);renderAnimal(simById(cur.id)||sim.selected());return}}
if(action.startsWith('s')&&['sfeed:','senrich','streat','sopen'].some(p=>action.startsWith(p))){performManaged(action);return}const result=sim.act(action);const animal=sim.selected();if(result.ok&&action==='release')sim.completeMission(animal.id==='fawn-01'?'fawn':'rescue-'+animal.id);if(result.ok&&action==='observe'&&animal.kind!=='deer'){const mission=sim.missions.find(m=>m.animalId===animal.id);if(mission&&mission.kind==='survey')sim.completeMission(mission.id)}world.setAnimalStage(animal.id,animal.stage);if(result.ok&&(action==='feed'||action==='quiet'||action==='rehab'))world.setAnimalAction(animal.id,action);if(action==='transport'&&result.ok)world.focus(-12,7);if(action==='release'&&result.ok)world.focus(-1,1);toast(result.message);renderAnimal(animal);renderHud()}
addEventListener('wildfrontier:select',e=>{const id=e.detail.id|| (e.detail.kind==='deer'?'fawn-01':'rabbit-01');const animal=sim.select(id);{const j=journal.sight(animal.kind,sanct.state.day);if(j.first){const inf=journal.info(animal.kind);sanct.say('New journal entry: '+(inf?inf.common:animal.kind)+'.');setTimeout(()=>toast('📖 New journal entry: '+(inf?inf.common:animal.kind)),1800);saveJournal()}}if(tool==='observe'){sim.act('observe');toast('Quiet observation logged for '+animal.name+'.');renderHud()}else if(tool==='track'){const result=sim.act('track');toast(result.message);renderHud()}else{toast('Care protocols opened for '+animal.name+'. Choose an appropriate action in the field record.')}renderAnimal(animal)});
function selectTool(name){tool=name;document.querySelectorAll('.tool').forEach(el=>el.classList.toggle('active',el.dataset.tool===name));toast(name==='observe'?'Observation lens ready':name==='track'?'Tracking scope ready':'Care kit equipped')}
document.querySelectorAll('.tool').forEach(el=>el.addEventListener('click',()=>selectTool(el.dataset.tool)));
$('closeInspect').addEventListener('click',()=>panel.classList.add('hidden'));
$('helpBtn').addEventListener('click',()=>toast('Field protocol: observe first, assess with a ranger, stabilize only when trained, and release only when every welfare measure passes.'));
$('taskRescue').addEventListener('click',()=>{sim.startMission('fawn');world.focus(-1,1);renderAnimal(sim.select('fawn-01'));toast('Awi is near the old oak. Approach slowly.')});
$('taskWater').addEventListener('click',()=>{const r=sim.serviceWater();toast(r.message);renderHud();$('taskWater').classList.add('complete');$('taskWater').querySelector('.task-check').textContent='✓'});
$('taskCover').addEventListener('click',()=>{const r=sim.restoreCover();toast(r.message);renderHud();if(r.ok){$('taskCover').classList.add('complete');$('taskCover').querySelector('.task-check').textContent='✓'}});$('taskForage').addEventListener('click',()=>{const r=sim.enrichHabitat();toast(r.message);renderHud();if(r.ok){$('taskForage').classList.add('complete');$('taskForage').querySelector('.task-check').textContent='✓'}});
$('taskRiparian').addEventListener('click',()=>{const r=sim.restoreRiparian();toast(r.message);if(r.ok){world.setConservationProject('riparian');$('taskRiparian').classList.add('complete');$('taskRiparian').querySelector('.task-check').textContent='✓'}renderHud()});
$('taskNests').addEventListener('click',()=>{const r=sim.installNestBoxes();toast(r.message);if(r.ok){world.setConservationProject('nestBoxes');$('taskNests').classList.add('complete');$('taskNests').querySelector('.task-check').textContent='✓'}renderHud()});
$('taskCameraTraps').addEventListener('click',()=>{const r=sim.installCameraTraps();toast(r.message);if(r.ok){world.setConservationProject('cameraTraps');$('taskCameraTraps').classList.add('complete');$('taskCameraTraps').querySelector('.task-check').textContent='✓'}renderHud()});$('taskPollinators').addEventListener('click',()=>{const r=sim.conductPollinatorSurvey();toast(r.message);if(r.ok){$('taskPollinators').classList.add('complete');$('taskPollinators').querySelector('.task-check').textContent='✓'}renderHud()});$('taskFeedSchedule').addEventListener('click',()=>{const a=sim.selected();const time=window.prompt('Daily feeding time for '+a.name+' (24-hour HH:MM):',sim.feedingSchedule[a.id]||'08:00');if(time===null)return;toast(sim.scheduleFeed(a.id,time).message);renderHud()});$('taskBreeding').addEventListener('click',()=>{toast(sim.startBreedingProgram().message);renderHud()});
$('mapBtn').addEventListener('click',()=>{buildUI.close();sanctUI.close();exploreUI.exitPhoto();exploreUI.openMap()});
$('soundBtn').textContent=audio.muted?'🔇':'♫';$('soundBtn').addEventListener('click',()=>{audio.resume();audio.setMuted(!audio.muted);$('soundBtn').textContent=audio.muted?'🔇':'♫';toast(audio.muted?'Sound off':'Sound on')});
const kindLabel={deer:'DEER',rabbit:'RABBIT',fox:'FOX',owl:'OWL',squirrel:'SQUIRREL',bird:'BIRD',raccoon:'RACCOON',beaver:'BEAVER',skunk:'SKUNK',turtle:'TURTLE',cardinal:'CARDINAL',woodDuck:'WOOD DUCK',opossum:'OPOSSUM',riverOtter:'RIVER OTTER',bobcat:'BOBCAT',redWolf:'RED WOLF',whoopingCrane:'WHOOPING CRANE',greatBlueHeron:'GREAT BLUE HERON'};
function focusAnimal(id){const w=world.animals.find(x=>x.userData.id===id);if(w)world.focus(w.position.x,w.position.z)}
function openRecord(id){const a=sim.select(id);renderAnimal(a)}
function renderRoster(){const el=document.querySelector('.species-roster');if(!el)return;const html=sim.animals.filter(a=>a.stage!=='released').map(a=>'<button data-focus="'+a.id+'" title="'+(a.species||'').replace(/"/g,'')+'"><span class="roster-dot" data-kind="'+a.kind+'"></span><span class="roster-copy"><b>'+a.name+'</b><small>'+(a.species||kindLabel[a.kind]||'WILDLIFE')+'</small></span></button>').join('');if(el.dataset.sig!==html){el.dataset.sig=html;el.innerHTML=html}}
document.querySelector('.species-roster')?.addEventListener('click',e=>{const b=e.target.closest('[data-focus]');if(!b)return;focusAnimal(b.dataset.focus);renderAnimal(sim.select(b.dataset.focus))});
function renderHud(){renderRoster();if(researchPanel)renderResearchPanel();sim.animals.forEach(a=>{if(!world.animals.some(w=>w.userData.id===a.id))world.addAnimal(a)});const h=sim.habitat;$('healthScore').textContent=Math.round(h.health)+'%';$('waterScore').textContent=Math.round(h.water)+'%';$('coverScore').textContent=Math.round(h.cover)+'%';$('foodScore').textContent=Math.round(h.food)+'%';$('weatherIcon').textContent=sim.weather.icon;$('weatherName').textContent=sim.weather.name.toUpperCase();$('dayNumber').textContent=String(sim.day).padStart(2,'0');$('dayPhase').textContent=sim.phase.toUpperCase();world.setEnvironment(sim.phase,sim.weather.name,sim.season);sim.animals.forEach(a=>world.setAnimalState(a.id,a));world.setConservationProgress(sim.restoration);const family=sim.familyTree.slice(-4);let ecology=$('ecologyResearch');if(!ecology){ecology=document.createElement('section');ecology.id='ecologyResearch';ecology.className='field-note';document.querySelector('.left-rail').appendChild(ecology)}const centre=sim.getResearchCentre();ecology.innerHTML='<b>FAMILY & RESEARCH</b><p>'+ (family.length?family.map(f=>f.name+' · '+f.stage+' · parents '+f.parents.join(' & ')).join('<br>'):'No births recorded yet · spring nursery monitoring active')+'</p><p>Population balance '+sim.populationBalance+'% · '+sim.migrationStatus+'</p><p>'+(centre.unlocked?'Research centre unlocked':'Research centre '+centre.score+'/60 research points')+'</p><small>'+centre.projects.map(p=>p.name+': '+p.status).join(' · ')+'</small>';$('progressText').textContent=sim.restoration.toLocaleString()+' / 3,000';$('progressBar').style.width=(sim.restoration/3000*100)+'%';$('dayTime').textContent=sim.time;$('seasonName').textContent=sim.season.toUpperCase();$('animalCount').textContent=sim.animals.filter(a=>a.stage!=='released').length;$('missionList').innerHTML=sim.missions.map(m=>'<button class="mission '+m.status+'" data-mission="'+m.id+'"><span class="mission-mark">'+(m.status==='complete'?'✓':m.status==='active'?'●':'○')+'</span><span><b>'+m.title+'</b><small>'+m.detail+'</small></span></button>').join('');$('missionList').querySelectorAll('[data-mission]').forEach(b=>b.addEventListener('click',()=>{const m=sim.missions.find(x=>x.id===b.dataset.mission);const r=sim.startMission(m.id);const a=sim.select(m.animalId);const spots={'fawn-01':[-1,1],'fox-01':[-15,-2],'owl-01':[-3,-5.5],'otter-01':[6,2.8],'bobcat-01':[-17,-5]};world.focus(...(spots[a.id]||[0,0]));renderAnimal(a);toast(r.message);renderHud()}));$('journalList').innerHTML=sim.log.slice(0,4).map(x=>'<li><time>'+x.time+'</time><span>'+x.text+'</span></li>').join('')}

// ---- contextual field activities ----
let promptSpot=null;const promptEl=$('actionPrompt');
const ACT_ICON={footprints:'🔍',hide:'🔭',water:'🧪',plant:'🌱',litter:'🧹'};
function doActivity(){
 const sp=promptSpot;if(!sp)return;tctx.activity=true;const r=activities.interact(sp);
 if(r.quiz){const q=r.quiz;const box=document.createElement('section');box.className='sanctuary-panel quiz-panel';box.innerHTML='<header><div><small>FIELD GUIDE · TRACKS</small><h2>Whose tracks are these?</h2></div></header><div class="s-body"><p class="s-muted">You find '+q.clue+'.</p><div class="s-foot">'+q.options.map(o=>'<button data-k="'+o.kind+'">'+o.label.toUpperCase()+'</button>').join('')+'</div></div>';document.body.appendChild(box);box.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;const a=activities.answerTracks(q.spotId,b.dataset.k);toast(a.message);audio.sfx(a.correct?'success':'fail');box.remove();save();saveJournal();syncRescueWorld()})}
 else{toast(r.message);audio.sfx(r.ok?'success':'fail');if(r.ok){save();saveJournal();syncRescueWorld()}}
 renderHud();
}
promptEl.addEventListener('click',doActivity);
addEventListener('keydown',e=>{if(e.code==='KeyE'&&promptSpot&&!promptEl.hidden)doActivity()});
function updatePrompt(){const sp=activities.nearest(rpos());promptSpot=sp;if(sp){promptEl.hidden=false;promptEl.textContent=ACT_ICON[sp.type]+' '+ACTIVITY_LABEL[sp.type].toUpperCase()+' (E)'}else promptEl.hidden=true}


// ---- opening and guided first steps ----
const tctx={moved:0,looked:false,selected:false,activity:false,missions:false,fed:0,built:0,photos:0};
let lastRP={x:world.ranger.position.x,z:world.ranger.position.z};
addEventListener('wildfrontier:select',()=>{tctx.selected=true});
for(const ev of ['pointermove'])$('world').addEventListener(ev,e=>{if(e.buttons)tctx.looked=true},{passive:true});
$('world').addEventListener('wheel',()=>{tctx.looked=true},{passive:true});
const tutorial=mountTutorial({getCtx:()=>{tctx.fed=sim.animals.reduce((n,a)=>n+(a.feedings||0),0);tctx.built=ops.state.items.length;tctx.photos=journal.state.photos;return tctx}});
$('missionBtn').addEventListener('click',()=>{tctx.missions=true});
const _doAct=doActivity;
let playIntro=false;try{playIntro=shouldPlayIntro({webdriver:!!navigator.webdriver,seen:localStorage.getItem('wildfrontier.intro.v1')==='1',search:location.search})}catch{}
if(playIntro){mountIntro({world,audio,onDone:()=>{world.focus(world.ranger.position.x,world.ranger.position.z)}})}

let speed=4,acc=0,lastHud=0,lastExplore=0,lastAudio=0,lastCases=0,lastRescued=0,lastLost=0,prev=performance.now(),lastSave=performance.now();
const afterBuild=()=>{renderHud();save()};
const buildUI=mountBuildUI({sanct,ops,world,toast,portraits,afterChange:afterBuild});
const exploreUI=mountExploreUI({sim,sanct,journal,world,toast,portraits,afterChange:afterBuild,saveJournal});exploreUI.setItemsSource(()=>ops.state.items);
addEventListener('wildfrontier:ground',e=>buildUI.onGround(e.detail));addEventListener('wildfrontier:builditem',e=>buildUI.onItem(e.detail.id));
const missionsUI=mountMissionsUI({rescue,director,activities,sanct,world,toast,actions:rescueActions,afterChange:afterBuild,focusAnimal,openRecord,openShop:()=>sanctUI.open('supplies')});
exploreUI.setMarkersSource(()=>rescue.markers());
$('missionBtn').addEventListener('click',()=>{buildUI.close();sanctUI.close();exploreUI.close();exploreUI.exitPhoto();missionsUI.open()});
$('buildBtn').addEventListener('click',()=>{sanctUI.close();exploreUI.close();missionsUI.close();exploreUI.exitPhoto();buildUI.open()});
$('journalBtn').addEventListener('click',()=>{buildUI.close();sanctUI.close();exploreUI.exitPhoto();exploreUI.openJournal()});
$('photoBtn').addEventListener('click',()=>{buildUI.close();sanctUI.close();exploreUI.togglePhoto()});
const sanctUI=mountSanctuaryUI({sim,sanct,ops,mgmt,world,toast,portraits,focusAnimal,openRecord,openBuild:()=>buildUI.open(),afterChange:()=>{renderHud();const a=sim.selected();if(!panel.classList.contains('hidden'))renderAnimal(a);save()}});
$('sanctBtn').addEventListener('click',()=>sanctUI.open('overview'));
const speedButtons=[...document.querySelectorAll('#speedCtl button')];
speedButtons.forEach(b=>b.addEventListener('click',()=>{speed=Number(b.dataset.speed);speedButtons.forEach(x=>x.classList.toggle('on',x===b));toast(speed===0?'Time paused':'Time speed '+({4:'×1',15:'×4',45:'×12'}[speed]||speed))}));
function frame(now){const dt=Math.min(.25,(now-prev)/1000);prev=now;acc+=dt*speed;
 if(speed>0)ops.update(dt*Math.min(3,speed/4));world.syncStaff(ops.state.staff,dt);
 if(now-lastAudio>250){lastAudio=now;updatePrompt();{const rp2=world.ranger.position;tctx.moved+=Math.hypot(rp2.x-lastRP.x,rp2.z-lastRP.z);lastRP={x:rp2.x,z:rp2.z}}const rv=world.ranger.userData.vel;const spd=rv?rv.length():0;let nw=0;const rp=world.ranger.position;for(const w of [{x:7,z:rp.z*.96},{x:31,z:7},{x:38,z:-10},{x:25.5,z:8.2}]){const d=Math.hypot(w.x-rp.x,w.z-rp.z);nw=Math.max(nw,1-d/9)}audio.update({env:{phase:sim.phase,rain:sim.weather.name==='Light rain',wind:sim.weather.name==='Breezy'?1.8:.7,nearWater:Math.max(0,nw),season:sim.season},walking:spd>.5,walkSpeed:spd/4.2});const cc=rescue.summary().cases.length,st=rescue.summary().stats;if(cc>lastCases)audio.sfx('radio');if(st.rescued>lastRescued)audio.sfx('success');if(st.lost>lastLost)audio.sfx('fail');lastCases=cc;lastRescued=st.rescued;lastLost=st.lost}
 if(now-lastExplore>1000){lastExplore=now;tutorial.render();for(const ev of rescue.visit(rpos(),activities.hasPerk('scope')?3.4:2.2)){if(ev.type==='found')toast('🐾 You found the animal. Assess it before approaching.')}syncRescueWorld();const nb=missionsUI.badge();const bd=$('missionBadge');bd.hidden=!nb;bd.textContent=nb;for(const l of journal.exploreAt(world.ranger.position.x,world.ranger.position.z)){toast('📍 Discovered: '+l.label);sanct.say('Discovered '+l.label+'.');if(l.safari)sanct.state.reputation+=1;saveJournal();save()}}
 if(acc>=3&&now-lastHud>=700){const m=Math.floor(acc);acc-=m;lastHud=now;sim.tick(m);sanct.tick(m);rescue.tick();director.scan();for(const m of activities.scan()){toast('🏆 Milestone: '+m.label);audio.sfx('success')}renderHud();world.setVisitors(ops.state.visitors.onSite);if(!panel.classList.contains('hidden'))renderAnimal(sim.selected());sanctUI.refresh();missionsUI.refresh()}
 if(now-lastSave>10000){lastSave=now;save()}
 requestAnimationFrame(frame)}
sim.animals.forEach(a=>{world.setAnimalStage(a.id,a.stage);world.setAnimalState(a.id,a)});world.setEnvironment(sim.phase,sim.weather.name);renderAnimal(sim.selected());renderHud();if(innerWidth<=760)panel.classList.add('hidden');document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();document.body.classList.toggle('rail-open')});requestAnimationFrame(frame);
setTimeout(()=>$('loading').classList.add('done'),1250);
