// Sanctuary management depth: veterinary cases, hygiene, facility wear, research, visitor segments and a ledger.
// Pure logic. It plugs into the sanctuary and operations through their extension hooks, so existing saves still load
// (everything here is stored in its own `mgmt` ext block and defaults sensibly when missing).

const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const DAY=1440;

export const CONDITIONS={
 parasites:{label:'Intestinal parasites',contagious:false,base:.014,rate:3,drain:.7,meds:1,days:5,symptom:'Dull coat and weight loss.',cause:'dirty enclosure'},
 respiratory:{label:'Respiratory infection',contagious:true,base:.009,rate:6,drain:1.3,meds:2,days:5,symptom:'Coughing and laboured breathing.',cause:'stress'},
 digestive:{label:'Digestive upset',contagious:false,base:.009,rate:4,drain:1,meds:1,days:4,symptom:'Refusing food and restless.',cause:'poor diet'},
 injury:{label:'Minor injury',contagious:false,base:.006,rate:2,drain:.8,meds:1,days:4,symptom:'Limping and favouring a leg.',cause:'stress and rough play',selfHeal:8},
 mange:{label:'Skin mange',contagious:true,base:.005,rate:3,drain:.6,meds:2,days:6,symptom:'Scratching and patchy fur.',cause:'dirty enclosure'},
};
const FACTOR={
 parasites:(a,c)=>.4+c.dirt/30,
 respiratory:(a,c)=>.5+a.stress/40+(c.rain?.8:0),
 digestive:(a)=>.5+(a.nutrition<40?1.6:0)+(a.nutrition>92?.6:0),
 injury:(a)=>.5+a.stress/60,
 mange:(a,c)=>.4+c.dirt/45,
};
// how quickly each species fouls its enclosure
export const MESS={africanElephant:5,indianRhino:4,giraffe:3,africanLion:2.5,bengalTiger:2.5,plainsZebra:2.5,cheetah:2,flamingo:1.5};

export const PROJECTS={
 diagnostics:{label:'Rapid diagnostics',rp:40,cost:120,blurb:'Every case is noticed and diagnosed automatically. Treatment is never misdirected.'},
 hygiene:{label:'Hygiene protocols',rp:55,cost:160,blurb:'Enclosures stay clean 35% longer, and parasites and mange are less likely.'},
 vaccineTech:{label:'Long-lasting vaccines',rp:70,cost:220,blurb:'Vaccines protect for 90 days instead of 40, and cost less.'},
 welfareScience:{label:'Welfare science',rp:90,cost:300,blurb:'Illness risk is 25% lower, and visitors rate the sanctuary higher.'},
 conservationMarketing:{label:'Conservation outreach',rp:110,cost:380,blurb:'Visitors spend 30% more in the café and shop, and donations grow.'},
};

export const FACILITIES={
 clinic:{label:'Treatment clinic',icon:'🏥',blurb:'Each level shortens every treatment by a day and makes vet check-ups more likely to find hidden illness.'},
 nursery:{label:'Nursery',icon:'🍼',blurb:'Each level keeps young animals healthier and calmer as they grow.'},
 lab:{label:'Research lab',icon:'🔬',blurb:'Each level makes research 35% faster.'},
};
export const facilityCost=level=>level>=3?null:400*level;

export const SEGMENTS={
 family:{label:'Families',icon:'👨‍👩‍👧',blurb:'Love young animals, a café and clean paths.'},
 photographer:{label:'Photographers',icon:'📷',blurb:'Come for rare, healthy animals and a viewing platform.'},
 student:{label:'School groups',icon:'🎒',blurb:'Want an education centre and talks.'},
 donor:{label:'Conservation donors',icon:'💚',blurb:'Appear at 4★ or better; give generously when welfare is high.'},
};

export function createManagement(sanct,ops,options={}){
 const rng=options.rng||Math.random;
 const SPECIES=sanct.SPECIES;
 const state={
  serial:0,cases:[],dirt:{},vax:{},vaccines:0,quarantine:{},
  rp:0,active:null,progress:0,done:{},nextStudy:0,nextRound:{},
  sat:{family:.6,photographer:.6,student:.6,donor:.6},avgSat:.6,mix:{family:0,photographer:0,student:0,donor:0},feedback:[],lastGift:0,
  today:{},history:[],fac:{clinic:1,nursery:1,lab:1},
 };
 const say=t=>sanct.say(t);
 const residents=()=>sanct.residents();
 const byId=id=>sanct.sim.animals.find(a=>a.id===id);
 const has=k=>!!state.done[k];
 const staffOf=role=>ops.state.staff.filter(m=>m.role===role);
 const dirtOf=k=>state.dirt[k]||0;
 const isProtected=(id)=>(state.vax[id]||0)>sanct.state.day;

 // ---- Ledger --------------------------------------------------------------------------------------------------
 sanct.mods.onMoney=(n,cat)=>{state.today[cat]=(state.today[cat]||0)+n};
 function archiveDay(){
  const income=Object.values(state.today).filter(v=>v>0).reduce((a,b)=>a+b,0),spent=-Object.values(state.today).filter(v=>v<0).reduce((a,b)=>a+b,0);
  state.history.push({day:sanct.state.day-1,income:Math.round(income),spent:Math.round(spent),cats:Object.fromEntries(Object.entries(state.today).map(([k,v])=>[k,Math.round(v)]))});
  if(state.history.length>14)state.history.shift();state.today={};
 }
 function budget(){
  const h=state.history.slice(-7),n=Math.max(1,h.length);
  const avgIn=h.reduce((a,d)=>a+d.income,0)/n,avgOut=h.reduce((a,d)=>a+d.spent,0)/n;
  const wages=ops.summary().wagesPerDay;const fixed=wages;
  const net=avgIn-Math.max(avgOut,fixed);
  return {funds:Math.round(sanct.state.funds),wages,avgIn:Math.round(avgIn),avgOut:Math.round(avgOut),net:Math.round(net),runway:net>=0?null:Math.floor(sanct.state.funds/Math.max(1,-net)),today:{...state.today},history:state.history.slice()};
 }

 // ---- Hygiene ---------------------------------------------------------------------------------------------------
 function tick(d){
  for(const kind of Object.keys(SPECIES)){
   const list=residents().filter(a=>a.kind===kind);if(!list.length){state.dirt[kind]=0;continue}
   const gain=list.reduce((n,a)=>n+(MESS[kind]||2)*(a.young?.5:1),0)*1.5*(has('hygiene')?.65:1);
   const dirt=state.dirt[kind]=clamp((state.dirt[kind]||0)+gain*d/DAY);
   if(dirt>60)for(const a of list)a.stress=clamp(a.stress+.012*d*(dirt-60)/40);
  }
  for(const c of state.cases){const a=byId(c.animalId);if(a&&state.quarantine[a.id])a.stress=clamp(a.stress+.004*d)}
  if(state.fac.nursery>1)for(const a of residents())if(a.young){a.health=clamp(a.health+.003*d*(state.fac.nursery-1));a.stress=clamp(a.stress-.003*d*(state.fac.nursery-1))}
 }
 function cleanHabitat(kind,paid=true){
  if(!SPECIES[kind])return {ok:false,message:'Unknown species.'};
  if(dirtOf(kind)<8)return {ok:false,message:'The '+SPECIES[kind].common.toLowerCase()+' enclosure is already clean.'};
  if(paid&&!sanct.spend(15,'upkeep'))return {ok:false,message:'Cleaning costs 15.'};
  state.dirt[kind]=Math.max(0,dirtOf(kind)-45);return {ok:true,message:SPECIES[kind].common+' enclosure cleaned.'};
 }

 // ---- Facility wear -----------------------------------------------------------------------------------------------
 const repairCost=it=>Math.ceil(ops.BUILD_ITEMS[it.type].cost*.25*(100-(it.cond??100))/100)+5;
 function repair(id,paid=true){
  const it=ops.state.items.find(i=>i.id===id);if(!it)return {ok:false,message:'Nothing selected.'};
  if((it.cond??100)>=95)return {ok:false,message:ops.BUILD_ITEMS[it.type].label+' is in good repair.'};
  const cost=repairCost(it);if(paid&&!sanct.spend(cost,'upkeep'))return {ok:false,message:'Repairs cost '+cost+'.'};
  it.cond=100;return {ok:true,message:ops.BUILD_ITEMS[it.type].label+' repaired.'};
 }
 function wearDay(){
  for(const it of ops.state.items){const def=ops.BUILD_ITEMS[it.type];const rate=def.tags.includes('path')||def.tags.includes('viewing')?1.6:def.tags.includes('shelter')||def.tags.includes('service')?1.1:.8;
   const before=it.cond??100;it.cond=Math.max(0,before-rate);
   if(before>=25&&it.cond<25)say('The '+def.label.toLowerCase()+' is badly worn and no longer counts toward habitat needs. Repair it.');}
 }

 // ---- Veterinary cases ----------------------------------------------------------------------------------------------
 const caseOf=animalId=>state.cases.find(c=>c.animalId===animalId);
 function describe(c){const cd=CONDITIONS[c.cond];return {...c,label:c.diagnosed?cd.label:'Unknown illness',symptom:cd.symptom,contagious:c.diagnosed?cd.contagious:null,meds:cd.meds,days:cd.days}}
 function start(animal,cond,why){
  if(caseOf(animal.id))return null;
  const c={id:'case-'+(++state.serial),animalId:animal.id,cond,sev:15+Math.round(rng()*10),day:sanct.state.day,noticed:false,diagnosed:false,treated:0,why};
  state.cases.push(c);return c;
 }
 function notice(c,msg=true){
  if(c.noticed)return;c.noticed=true;const a=byId(c.animalId);
  if(msg&&a)say(a.name+' is unwell: '+CONDITIONS[c.cond].symptom.toLowerCase()+' A vet should take a look.');
  if(a)sanct.addHistory(a.id,'Showing signs of illness.');
 }
 function riskRoll(){
  const rain=!!(sanct.sim.weather&&/rain/i.test(sanct.sim.weather.name||''));
  for(const a of residents()){
   if(caseOf(a.id))continue;
   const ctx={dirt:dirtOf(a.kind),rain};
   for(const [cond,cd] of Object.entries(CONDITIONS)){
    let p=cd.base*FACTOR[cond](a,ctx)*(has('welfareScience')?.75:1);
    if(cd.contagious&&isProtected(a.id))p*=.1;
    if(cond==='parasites'||cond==='mange')p*=has('hygiene')?.7:1;
    if(rng()<p){const c=start(a,cond);if(c)break}
   }
  }
  // contagion within a species group
  for(const c of state.cases.slice()){
   const cd=CONDITIONS[c.cond];if(!cd.contagious||c.sev<25)continue;const src=byId(c.animalId);if(!src||state.quarantine[src.id])continue;
   for(const a of residents()){if(a.id===src.id||a.kind!==src.kind||caseOf(a.id))continue;const p=.2*(isProtected(a.id)?.1:1);if(rng()<p){const n=start(a,c.cond,'caught from '+src.name);if(n&&n.sev)say(a.name+' may have caught something from '+src.name+'.')}}
  }
 }
 function progressCases(){
  for(const c of state.cases.slice()){
   const a=byId(c.animalId),cd=CONDITIONS[c.cond];if(!a){state.cases.splice(state.cases.indexOf(c),1);continue}
   if(c.treated>0){
    c.treated--;c.sev=Math.max(0,c.sev-Math.ceil((c.sev0||c.sev||10)/cd.days)-3);a.health=clamp(a.health+2);
    if(c.sev<=0){state.cases.splice(state.cases.indexOf(c),1);delete state.quarantine[a.id];sanct.addHistory(a.id,'Recovered from '+cd.label.toLowerCase()+'.');say(a.name+' has recovered from '+cd.label.toLowerCase()+'.');sanct.state.reputation+=.5;continue}
   }else{
    c.sev=Math.min(100,c.sev+cd.rate);a.health=clamp(a.health-cd.drain*c.sev/50);a.stress=clamp(a.stress+c.sev/60);
    if(cd.selfHeal&&c.day+cd.selfHeal<=sanct.state.day&&a.health>60){state.cases.splice(state.cases.indexOf(c),1);continue}
   }
   if(!c.noticed&&(c.sev>=45||has('diagnostics')))notice(c);
   if(has('diagnostics')&&c.noticed)c.diagnosed=true;
   if(!c.noticed&&staffOf('vet').length&&rng()<.35+.15*Math.max(...staffOf('vet').map(m=>m.skill)))notice(c);
  }
 }
 function examine(animalId,by){
  const a=byId(animalId);if(!a)return {ok:false,message:'No such animal.'};
  const c=caseOf(animalId);
  if(!c)return {ok:true,message:a.name+' checks out healthy.'};
  const skill=by?by.skill:0;
  if(by&&!has('diagnostics')&&rng()>.7+.1*skill+.1*(state.fac.clinic-1))return {ok:true,message:a.name+' looks a little off but the check-up was inconclusive.'};
  notice(c,false);c.diagnosed=true;return {ok:true,message:a.name+' diagnosed: '+CONDITIONS[c.cond].label.toLowerCase()+'.',case:describe(c)};
 }
 function diagnose(caseId,by){
  const c=state.cases.find(x=>x.id===caseId);if(!c)return {ok:false,message:'No such case.'};if(c.diagnosed)return {ok:false,message:'Already diagnosed.'};
  if(!by&&!has('diagnostics')&&!sanct.spend(15,'veterinary'))return {ok:false,message:'A diagnostic work-up costs 15.'};
  c.noticed=true;c.diagnosed=true;const a=byId(c.animalId);return {ok:true,message:(a?a.name:'Patient')+' diagnosed: '+CONDITIONS[c.cond].label.toLowerCase()+'.'};
 }
 function treatCase(caseId,by){
  const c=state.cases.find(x=>x.id===caseId);if(!c)return {ok:false,message:'No such case.'};
  const cd=CONDITIONS[c.cond],a=byId(c.animalId);if(c.treated>0)return {ok:false,message:'Already under treatment.'};
  if((sanct.state.stock.medicine||0)<cd.meds)return {ok:false,message:'Needs '+cd.meds+' veterinary supplies; you have '+(sanct.state.stock.medicine||0)+'.'};
  sanct.state.stock.medicine-=cd.meds;
  if(!c.diagnosed&&!has('diagnostics')&&rng()<.5){if(a)sanct.addHistory(a.id,'Treated without a diagnosis; it did not help.');return {ok:true,message:'Treated without a diagnosis; the treatment missed the cause. Diagnose first.'}}
  c.diagnosed=true;c.noticed=true;c.treated=Math.max(2,cd.days-(state.fac.clinic-1));c.sev0=Math.max(10,c.sev);
  if(a){sanct.addHistory(a.id,'Treated for '+cd.label.toLowerCase()+'.');a.stress=clamp(a.stress+3)}
  return {ok:true,message:(a?a.name:'Patient')+' is being treated for '+cd.label.toLowerCase()+' ('+cd.days+' days).'};
 }
 function setQuarantine(animalId,on){
  const c=caseOf(animalId);if(on&&!c)return {ok:false,message:'Only sick animals need quarantine.'};
  if(on&&c&&!CONDITIONS[c.cond].contagious&&c.diagnosed)return {ok:false,message:'This illness is not contagious.'};
  if(on)state.quarantine[animalId]=true;else delete state.quarantine[animalId];
  return {ok:true,message:on?'Isolated from the group. Keep an eye on stress.':'Returned to the group.'};
 }
 const vaccinePrice=()=>has('vaccineTech')?14:22;
 function buyVaccines(n=5){
  const cost=vaccinePrice()*n;if(!sanct.spend(cost,'veterinary'))return {ok:false,message:'Vaccines cost '+cost+' for '+n+'.'};
  state.vaccines+=n;return {ok:true,message:'Bought '+n+' vaccine doses.'};
 }
 function vaccinate(kind){
  const list=residents().filter(a=>a.kind===kind&&!isProtected(a.id));
  if(!SPECIES[kind])return {ok:false,message:'Unknown species.'};if(!list.length)return {ok:false,message:'Everyone of this species is already protected.'};
  if(state.vaccines<list.length)return {ok:false,message:'Needs '+list.length+' vaccine doses; you have '+state.vaccines+'.'};
  state.vaccines-=list.length;const until=sanct.state.day+(has('vaccineTech')?90:40);for(const a of list){state.vax[a.id]=until;sanct.addHistory(a.id,'Vaccinated.')}
  return {ok:true,message:list.length+' '+SPECIES[kind].common.toLowerCase()+(list.length>1?'s':'')+' vaccinated until day '+until+'.'};
 }

 function upgrade(key){
  const f=FACILITIES[key];if(!f)return {ok:false,message:'Unknown facility.'};const lv=state.fac[key]||1;const cost=facilityCost(lv);
  if(cost===null)return {ok:false,message:f.label+' is already at the top level.'};
  if(!sanct.spend(cost,'building'))return {ok:false,message:'Upgrading the '+f.label.toLowerCase()+' costs '+cost+'.'};
  state.fac[key]=lv+1;say(f.label+' upgraded to level '+(lv+1)+'.');return {ok:true,message:f.label+' is now level '+(lv+1)+'.'};
 }
 function train(id){
  const m=ops.state.staff.find(x=>x.id===id);if(!m)return {ok:false,message:'No such staff member.'};
  if(m.skill>=3)return {ok:false,message:m.name+' is already fully trained.'};
  const cost=90*m.skill;if(!sanct.spend(cost,'staff'))return {ok:false,message:'Training costs '+cost+'.'};
  m.skill++;m.xp=0;m.morale=Math.min(100,(m.morale??70)+10);say(m.name+' completed training and is now skill level '+m.skill+'.');return {ok:true,message:m.name+' trained to skill '+m.skill+'.'};
 }

 // ---- Research -----------------------------------------------------------------------------------------------------------
 function startProject(id){
  const p=PROJECTS[id];if(!p)return {ok:false,message:'Unknown project.'};if(has(id))return {ok:false,message:'Already researched.'};
  if(state.active&&state.active!==id)return {ok:false,message:'Finish the current project first.'};if(state.active===id)return {ok:false,message:'Already under way.'};
  if(!staffOf('researcher').length)return {ok:false,message:'Hire a researcher first.'};
  if(!sanct.spend(p.cost,'research'))return {ok:false,message:'This project costs '+p.cost+'.'};
  state.active=id;state.progress=0;return {ok:true,message:p.label+' started.'};
 }
 function addResearch(amount){
  if(!state.active)return;amount*=1+.35*(state.fac.lab-1);state.progress+=amount;state.rp+=amount;const p=PROJECTS[state.active];
  if(state.progress>=p.rp){state.done[state.active]=true;say('Research complete: '+p.label+'. '+p.blurb);sanct.state.credits+=2;state.active=null;state.progress=0}
 }

 // ---- Staff task providers ------------------------------------------------------------------------------------------------
 const STUDY={x:ops.HUB.x+1.2,z:ops.HUB.z-1.4};
 ops.providers.push((m,{taken})=>{
  if(m.role==='vet'){
   const open=state.cases.filter(c=>c.noticed&&!c.treated&&!taken.has(c.animalId)).sort((a,b)=>b.sev-a.sev);
   for(const c of open){const a=byId(c.animalId);if(!a)continue;
    if(!c.diagnosed&&!has('diagnostics'))return {kind:'vetDiagnose',caseId:c.id,animalId:a.id,x:a.habitatPosition[0],z:a.habitatPosition[1]-1.3,work:3};
    if((sanct.state.stock.medicine||0)>=CONDITIONS[c.cond].meds)return {kind:'vetTreat',caseId:c.id,animalId:a.id,x:a.habitatPosition[0],z:a.habitatPosition[1]-1.3,work:3.5};}
   if(sanct.state.minutes>=(state.nextRound[m.id]||0)){
    const list=residents().filter(a=>!taken.has(a.id));if(list.length){const a=list[Math.floor(rng()*list.length)];return {kind:'checkup',animalId:a.id,x:a.habitatPosition[0],z:a.habitatPosition[1]-1.3,work:2.6}}}
  }
  if(m.role==='cleaner'){
   const kinds=Object.keys(SPECIES).filter(k=>dirtOf(k)>=25&&!ops.state.staff.some(o=>o!==m&&o.task?.kind==='clean'&&o.task.target===k)).sort((a,b)=>dirtOf(b)-dirtOf(a));
   if(kinds.length){const sp=SPECIES[kinds[0]];return {kind:'clean',target:kinds[0],x:sp.spawn[0]-1.4,z:sp.spawn[1]+1.2,work:4}}
   const worn=ops.state.items.filter(i=>(i.cond??100)<55&&!ops.state.staff.some(o=>o!==m&&o.task?.itemId===i.id)).sort((a,b)=>(a.cond??100)-(b.cond??100));
   if(worn.length&&sanct.state.funds>=repairCost(worn[0]))return {kind:'repair',itemId:worn[0].id,x:worn[0].x+.9,z:worn[0].z,work:4.5};
  }
  if(m.role==='researcher'&&state.active&&sanct.state.minutes>=state.nextStudy)return {kind:'study',x:STUDY.x,z:STUDY.z,work:5};
  return null;
 });
 ops.finishers.vetDiagnose=(m,t)=>{const r=diagnose(t.caseId,m);if(r.ok)say(m.name+': '+r.message)};
 ops.finishers.vetTreat=(m,t)=>{const r=treatCase(t.caseId,m);say(m.name+': '+r.message)};
 ops.finishers.checkup=(m,t)=>{state.nextRound[m.id]=sanct.state.minutes+150;const r=examine(t.animalId,m);if(r.case)say(m.name+': '+r.message)};
 ops.finishers.clean=(m,t)=>{cleanHabitat(t.target,false)};
 ops.finishers.repair=(m,t)=>{const it=ops.state.items.find(i=>i.id===t.itemId);if(it&&sanct.spend(repairCost(it),'upkeep'))it.cond=100};
 ops.finishers.study=(m,t)=>{state.nextStudy=sanct.state.minutes+60;addResearch(2+m.skill*1.5)};

 // ---- Visitors: segments, satisfaction and feedback -----------------------------------------------------------
 const items=type=>ops.state.items.filter(i=>i.type===type&&(i.cond??100)>=50).length;
 function visitorsDay(){
  const V=ops.state.visitors,list=residents().filter(a=>!V.restricted[a.kind]);
  const avgW=list.length?list.reduce((n,a)=>n+sanct.welfareOf(a),0)/list.length:0;
  const dirts=[...new Set(list.map(a=>a.kind))].map(dirtOf),avgDirt=dirts.length?dirts.reduce((a,b)=>a+b,0)/dirts.length:0;
  const young=list.filter(a=>a.young).length,rare=list.filter(a=>['cheetah','bengalTiger','indianRhino'].includes(a.kind)).length;
  const sick=state.cases.filter(c=>c.noticed&&list.some(a=>a.id===c.animalId)).length;
  const worn=ops.state.items.filter(i=>(i.cond??100)<40).length;
  const crowd=V.onSite>ops.capacity()*.9?.1:0;
  const pricePen=Math.max(0,V.price-12)*.025;
  const w={family:.4+(young?.12:0),photographer:.15+(rare?.08:0)+(items('platform')?.08:0),student:.15+(items('education')?.15:0),donor:V.rating>=4?.1:.02};
  const tot=Object.values(w).reduce((a,b)=>a+b,0);
  const mix={};let given=0;const keys=Object.keys(w);keys.forEach((k,i)=>{mix[k]=i===keys.length-1?Math.max(0,V.today-given):Math.round(V.today*w[k]/tot);given+=mix[k]});
  const common=-(avgDirt/100)*.4-sick*.05-worn*.04-crowd-pricePen;
  const sat={
   family:clamp(.5+(young?.2:0)+(items('cafe')?.15:0)+(items('giftShop')?.08:0)+common+avgW/400,0,1),
   photographer:clamp(.4+(items('platform')?.25:0)+(rare?.15:0)+avgW/250+common,0,1),
   student:clamp(.35+(items('education')?.35:0)+(V.talks>0?.1:0)+(staffOf('educator').length?.1:0)+common,0,1),
   donor:clamp(.3+avgW/250+(1-avgDirt/100)*.2+(items('cafe')?.1:0)+common-pricePen,0,1),
  };
  const fb=[];
  if(avgDirt>45)fb.push('Several guests complained about dirty enclosures.');
  if(sick)fb.push('Visitors noticed sick animals and wanted to know they are being cared for.');
  if(worn)fb.push('A few facilities look worn and unsafe.');
  if(V.price>15)fb.push('Some visitors thought tickets were expensive.');
  if(crowd)fb.push('It felt crowded at times.');
  if(young&&sat.family>.65)fb.push('Families loved seeing the young animals.');
  if(items('education')&&sat.student>.6)fb.push('School groups enjoyed the education centre.');
  if(items('platform')&&sat.photographer>.65)fb.push('Photographers praised the viewing platform.');
  if(items('cafe'))fb.push('The café was a hit.');
  if(avgW>=85)fb.push('Guests commented how well cared for the animals look.');
  state.mix=mix;state.sat=sat;state.feedback=fb.slice(0,4);
  state.avgSat=V.today>0?keys.reduce((n,k)=>n+sat[k]*mix[k],0)/V.today:state.avgSat;
  // donors give when satisfied
  state.lastGift=Math.round(mix.donor*18*sat.donor*(has('conservationMarketing')?1.3:1));
  if(state.lastGift>0){sanct.earn(state.lastGift,'donations');say('Conservation donors gave '+state.lastGift+'.')}
 }
 sanct.mods.ratingAdjust=()=>clamp((state.avgSat-.6)*1.6,-.9,.7)+(has('welfareScience')?.3:0);
 sanct.mods.visitorSpend=n=>Math.round(n*ops.state.items.reduce((s,i)=>s+((i.cond??100)>=50?(ops.BUILD_ITEMS[i.type].spend||0):0),0)*(has('conservationMarketing')?1.3:1)*clamp(state.avgSat+.4,.5,1.3));

 // ---- Daily hook -----------------------------------------------------------------------------------------------------------
 function day(){
  riskRoll();progressCases();wearDay();visitorsDay();archiveDay();
 }

 function summary(){
  const cases=state.cases.map(c=>{const a=byId(c.animalId);return {...describe(c),animal:a?a.name:'?',kind:a?a.kind:null,quarantined:!!state.quarantine[c.animalId]}});
  const dirt={};for(const k of Object.keys(SPECIES))dirt[k]=Math.round(dirtOf(k));
  const protectedCount=residents().filter(a=>isProtected(a.id)).length;
  return {mgmt:{cases,dirt,vaccines:state.vaccines,protectedCount,vaccinePrice:vaccinePrice(),
   items:ops.state.items.map(i=>({id:i.id,type:i.type,cond:Math.round(i.cond??100),cost:repairCost(i)})),
   facilities:Object.fromEntries(Object.keys(FACILITIES).map(k=>[k,{level:state.fac[k]||1,cost:facilityCost(state.fac[k]||1)}])),
   research:{rp:Math.round(state.rp),active:state.active,progress:Math.round(state.progress),done:{...state.done},researchers:staffOf('researcher').length},
   visitorMix:{...state.mix},satisfaction:Object.fromEntries(Object.entries(state.sat).map(([k,v])=>[k,Math.round(v*100)])),avgSat:Math.round(state.avgSat*100),feedback:state.feedback.slice(),lastGift:state.lastGift,
   budget:budget()}};
 }
 function serialize(){return JSON.parse(JSON.stringify(state))}
 function restore(d){
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),fin=Number.isFinite,src=obj(d)?JSON.parse(JSON.stringify(d)):{};
  const fresh={serial:0,cases:[],dirt:{},vax:{},vaccines:0,quarantine:{},rp:0,active:null,progress:0,done:{},nextStudy:0,nextRound:{},sat:{family:.6,photographer:.6,student:.6,donor:.6},avgSat:.6,mix:{family:0,photographer:0,student:0,donor:0},feedback:[],lastGift:0,today:{},history:[]};
  for(const k of Object.keys(fresh))state[k]=fresh[k];
  for(const k of ['serial','vaccines','rp','progress','nextStudy','avgSat','lastGift'])if(fin(src[k]))state[k]=src[k];
  for(const k of ['dirt','vax','quarantine','done','nextRound','today'])if(obj(src[k]))state[k]=src[k];
  for(const k of ['sat','mix'])if(obj(src[k]))state[k]={...fresh[k],...src[k]};
  state.cases=(Array.isArray(src.cases)?src.cases:[]).filter(c=>obj(c)&&typeof c.animalId==='string'&&CONDITIONS[c.cond]&&fin(c.sev)).map(c=>({id:String(c.id||'case-'+(++state.serial)),animalId:c.animalId,cond:c.cond,sev:clamp(c.sev),day:fin(c.day)?c.day:0,noticed:!!c.noticed,diagnosed:!!c.diagnosed,treated:fin(c.treated)?c.treated:0,...(fin(c.sev0)?{sev0:c.sev0}:fin(c.treated)&&c.treated>0?{sev0:Math.max(10,clamp(c.sev))}:{}),...(c.why?{why:c.why}:{})}));
  state.history=(Array.isArray(src.history)?src.history:[]).filter(h=>obj(h)&&obj(h.cats)).slice(-14);
  state.feedback=Array.isArray(src.feedback)?src.feedback.filter(x=>typeof x==='string').slice(0,4):[];
  state.active=typeof src.active==='string'&&PROJECTS[src.active]?src.active:null;
  state.fac={clinic:1,nursery:1,lab:1};if(obj(src.fac))for(const k of Object.keys(state.fac))if([1,2,3].includes(src.fac[k]))state.fac[k]=src.fac[k];
 }
 sanct.extend({key:'mgmt',tick,day,summary,serialize,restore});

 return {state,upgrade,train,CONDITIONS,PROJECTS,SEGMENTS,examine,diagnose,treatCase,setQuarantine,buyVaccines,vaccinate,cleanHabitat,repair,repairCost,startProject,addResearch,caseOf,budget,summary,vaccinePrice,start,dirtOf,has};
}
