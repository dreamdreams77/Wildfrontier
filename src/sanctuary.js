// Safari sanctuary layer: managed residents, diets, supplies, staff, welfare and a responsible breeding programme.
// Pure logic (no rendering) so it can be unit-tested. It adds its residents to the shared simulation animal list,
// so selection, the field record panel and the world all treat them like every other animal.

import { ensureProfile } from './ai.js';
import { enrichmentFit, BOREDOM_RELIEF, STRESS_RELIEF } from './enrichment.js';
import { EQUIPMENT, DEFAULT_EQUIPMENT } from './equipment.js';

const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const DAY=1440;

export const FOODS={
 meat:{label:'Fresh meat ration',short:'Meat',price:12,icon:'🥩'},
 hay:{label:'Hay & grass bale',short:'Hay',price:4,icon:'🌾'},
 browse:{label:'Acacia & leaf browse',short:'Browse',price:5,icon:'🌿'},
 produce:{label:'Fruit & vegetable treats',short:'Produce',price:6,icon:'🍉'},
 aquatic:{label:'Shrimp & algae mix',short:'Aquatic',price:8,icon:'🦐'},
};
export const MEDICINE_PRICE=20;

// foods[0] is the staple; later entries are acceptable alternatives. `treat` foods are enrichment only.
export const SPECIES={
 africanLion:{common:'African lion',latin:'Panthera leo',region:'Sub-Saharan Africa',heritage:'Swahili',emoji:'🦁',status:'Vulnerable',habitat:'savannaKopje',spawn:[24,-8.5],capacity:6,
  foods:['meat'],gestationDays:8,litter:[2,3],infantDays:3,matureDays:10,
  personalities:['Bold and sociable','Calm and watchful','Playful and curious'],routine:'Rests through the heat; most active at dusk and dawn',
  notes:'Lives in prides. Needs shade, a high vantage point and a meat-based diet.',
  names:{male:['Jabari','Tau','Baraka','Kibo','Chaka','Zende'],female:['Nala','Zuri','Sarabi','Imara','Neema','Amani']}},
 bengalTiger:{common:'Bengal tiger',latin:'Panthera tigris tigris',region:'India',heritage:'Hindi & Sanskrit',emoji:'🐯',status:'Endangered',habitat:'bambooThicket',spawn:[24,10],capacity:5,
  foods:['meat'],gestationDays:8,litter:[2,3],infantDays:3,matureDays:11,
  personalities:['Solitary and stealthy','Confident and territorial','Curious and agile'],routine:'Ambush hunter; active at dusk, dawn and after dark; cools off in water',
  notes:'Solitary. Needs dense cover, a pool to bathe in and plenty of space.',
  names:{male:['Rudra','Veer','Arjun','Shera','Vikram','Bhairav'],female:['Anika','Mohini','Kavya','Tara','Rani','Durga']}},
 africanElephant:{common:'African elephant',latin:'Loxodonta africana',region:'Sub-Saharan Africa',heritage:'Swahili & Shona',emoji:'🐘',status:'Endangered',habitat:'acaciaGrove',spawn:[31,-0.5],capacity:6,
  foods:['hay','browse','produce'],treat:['produce'],gestationDays:14,litter:[1,1],infantDays:5,matureDays:14,
  personalities:['Gentle matriarch','Playful and inquisitive','Steady and protective'],routine:'Browses most of the day; bathes at the waterhole',
  notes:'A herd animal with a long memory. Needs browse, water for bathing and company.',
  names:{male:['Zuberi','Jengo','Tendai','Chuma','Mosi','Kito'],female:['Wangari','Imani','Subira','Tumaini','Nyota','Salama']}},
 giraffe:{common:'Reticulated giraffe',latin:'Giraffa reticulata',region:'East Africa',heritage:'Swahili & Maasai',emoji:'🦒',status:'Endangered',habitat:'acaciaGrove',spawn:[28,-3],capacity:6,
  foods:['browse','hay'],gestationDays:12,litter:[1,1],infantDays:4,matureDays:12,
  personalities:['Graceful and shy','Curious about visitors','Calm and watchful'],routine:'Browses tall acacia crowns; rests standing in the shade',
  notes:'Needs tall browse at head height and space to move.',
  names:{male:['Kamili','Juma','Sudi','Dume','Ayubu','Hamisi'],female:['Zawadi','Asha','Pendo','Lulu','Neema','Rehema']}},
 plainsZebra:{common:'Plains zebra',latin:'Equus quagga',region:'Eastern & Southern Africa',heritage:'Swahili',emoji:'🦓',status:'Near threatened',habitat:'openPlains',spawn:[30,-9],capacity:10,
  foods:['hay'],gestationDays:9,litter:[1,1],infantDays:3,matureDays:10,
  personalities:['Alert and quick','Social and playful','Wary of strangers'],routine:'Grazes in herds across the plains; drinks at midday',
  notes:'A grazing herd animal. Needs open grassland and company of its own kind.',
  names:{male:['Kito','Mwezi','Bahati','Juma','Zola','Dalili'],female:['Penda','Tumaini','Zahra','Mosi','Binti','Safi']}},
 cheetah:{common:'Cheetah',latin:'Acinonyx jubatus',region:'Sub-Saharan Africa',heritage:'Swahili',emoji:'🐆',status:'Vulnerable',habitat:'openPlains',spawn:[22,3],capacity:5,
  foods:['meat'],gestationDays:7,litter:[2,4],infantDays:3,matureDays:9,
  personalities:['Shy and sensitive','Fast and focused','Affectionate with keepers'],routine:'Hunts by sight in the cool of the morning and evening',
  notes:'Easily stressed. Needs long open runs, low disturbance and lookout mounds.',
  names:{male:['Haraka','Kasi','Safiri','Upepo','Radi','Kimbia'],female:['Amani','Tamu','Zuwena','Nuru','Mwanga','Rafiki']}},
 indianRhino:{common:'Greater one-horned rhinoceros',latin:'Rhinoceros unicornis',region:'Assam & Nepal',heritage:'Assamese & Sanskrit',emoji:'🦏',status:'Vulnerable',habitat:'riverWallow',spawn:[37,10],capacity:4,
  foods:['hay','browse'],gestationDays:14,litter:[1,1],infantDays:5,matureDays:15,
  personalities:['Solitary and placid','Territorial but gentle','Curious and food-driven'],routine:'Wallows in the mud through the heat; grazes at dawn and dusk',
  notes:'Solitary. Needs a mud wallow, wetland grasses and a quiet, secure range.',
  names:{male:['Bhima','Gaurav','Kamal','Dev','Nakul','Rohan'],female:['Gauri','Meena','Rupa','Sundari','Lata','Mala']}},
 flamingo:{common:'Greater flamingo',latin:'Phoenicopterus roseus',region:'East African soda lakes',heritage:'Swahili',emoji:'🦩',status:'Least concern',habitat:'sodaLake',spawn:[38,-9.5],capacity:20,
  foods:['aquatic'],gestationDays:4,litter:[1,1],infantDays:2,matureDays:7,
  personalities:['Gregarious and loud','Graceful and watchful','Social flock leader'],routine:'Filter-feeds in shallow water; sleeps standing on one leg',
  notes:'Lives in large flocks. Needs shallow saline water and company.',
  names:{male:['Tabasamu','Furaha','Jua','Kipepeo','Rangi','Shani'],female:['Furaha','Zahra','Rangi','Pendo','Tausi','Waridi']}},
};

// Founding residents: [kind, name, sex, founder line, offset from the species spawn point]
const FOUNDERS=[
 ['africanLion','Jabari','male','LI-1',[0,0]],['africanLion','Nala','female','LI-2',[1.6,.8]],
 ['bengalTiger','Rudra','male','TI-1',[0,0]],['bengalTiger','Anika','female','TI-2',[1.8,1]],
 ['africanElephant','Zuberi','male','EL-1',[0,0]],['africanElephant','Wangari','female','EL-2',[2.2,1.2]],
 ['giraffe','Kamili','male','GI-1',[0,0]],['giraffe','Zawadi','female','GI-2',[2.5,-1]],
 ['plainsZebra','Kito','male','ZE-1',[0,0]],['plainsZebra','Penda','female','ZE-2',[1.5,1.2]],
 ['cheetah','Haraka','male','CH-1',[0,0]],['cheetah','Amani','female','CH-2',[1.5,1]],
 ['indianRhino','Bhima','male','RH-1',[0,0]],['indianRhino','Gauri','female','RH-2',[1.8,.8]],
 ['flamingo','Tabasamu','male','FL-1',[0,0]],['flamingo','Furaha','female','FL-2',[1.4,.7]],
];

export function stageOf(a){
 const sp=SPECIES[a.kind];if(!sp)return 'adult';
 const age=a.ageDays??sp.matureDays+10;
 return age<sp.infantDays?'infant':age<sp.matureDays?'juvenile':'adult';
}
export function scaleOf(a){
 const sp=SPECIES[a.kind];if(!sp)return 1;
 const age=a.ageDays??sp.matureDays+10;
 if(age>=sp.matureDays)return 1;
 return clamp(.36+.64*(age/sp.matureDays),.36,1,);
}
export function welfareOf(a){
 return Math.round(clamp((a.health*1.5+a.nutrition+a.hydration+(100-a.stress)*1.2+(a.social??60)*.5+(100-(a.boredom??30))*.4)/5.6));
}

export function addHistory(a,day,text){ensureProfile(a);a.history.push({day,text});if(a.history.length>14)a.history.shift()}
function residentRecord(kind,name,sex,line,x,z,extra={}){
 const sp=SPECIES[kind];
 const rec={
  id:extra.id||kind+'-'+name.toLowerCase(),kind,name,sex,managed:true,breedingEligible:true,
  species:sp.common+' · '+sp.status,latinName:sp.latin,heritage:sp.heritage,region:sp.region,
  condition:'Managed sanctuary resident',location:'Safari · '+sp.habitat.replace(/([A-Z])/g,' $1').toLowerCase().replace(/^./,c=>c.toUpperCase()),
  health:90+((name.length*7)%8),hydration:76+((name.length*5)%14),nutrition:62+((name.length*11)%22),stress:16+((name.length*3)%12),trust:20,
  stage:'wild',injury:'No visible injury.',notes:sp.notes,energy:72,social:70,mood:'Settled',
  personality:sp.personalities[name.length%sp.personalities.length],routine:sp.routine,sleeping:false,feedings:0,
  geneticLine:line,lineage:[line],parents:null,ageDays:sp.matureDays+8+(name.length%9),young:false,
  habitatPosition:[x,z],...extra,
 };
 ensureProfile(rec);if(!rec.history.length)rec.history.push({day:3,text:extra.young?'Born at the sanctuary.':'Joined the sanctuary collection.'});return rec;
}

export function createSanctuary(sim,options={}){
 const rng=options.rng||Math.random;
 const state={
  minutes:400,day:3,funds:1500,credits:10,reputation:12,waterLevel:90,
  stock:{meat:28,hay:40,browse:34,produce:14,aquatic:16,medicine:4,...DEFAULT_EQUIPMENT},
  pregnancies:[],familyTree:[],births:0,transfers:0,imports:0,serial:0,lastReport:null,
 };
 const events=[];
 const say=text=>{const entry={time:sim.time,text};events.unshift({day:state.day,text});sim.log.unshift(entry);if(sim.log.length>80)sim.log.length=80};

 for(const [kind,name,sex,line,[ox,oz]] of FOUNDERS){
  const sp=SPECIES[kind];
  if(!sim.animals.some(a=>a.id===kind+'-'+name.toLowerCase()))sim.animals.push(residentRecord(kind,name,sex,line,sp.spawn[0]+ox,sp.spawn[1]+oz));
 }

 // Extension points used by operations (staff, habitat, visitors).
 const hooks=[];const mods={habitatScore:()=>100,visitorStress:()=>0,onMoney:null};
 const spend=(n,cat='other')=>{if(!Number.isFinite(n)||n<0||state.funds<n)return false;state.funds-=n;mods.onMoney&&mods.onMoney(-n,cat);return true};
 const earn=(n,cat='other')=>{if(!Number.isFinite(n))return;state.funds+=n;mods.onMoney&&mods.onMoney(n,cat)};
 const extend=h=>{hooks.push(h);return h};
 const residents=()=>sim.animals.filter(a=>a.managed&&SPECIES[a.kind]);
 const byId=id=>sim.animals.find(a=>a.id===id);
 const countOf=kind=>residents().filter(a=>a.kind===kind).length;
 const isAdult=a=>stageOf(a)==='adult';
 const preferredFood=a=>SPECIES[a.kind].foods[0];
 const accepts=(a,food)=>SPECIES[a.kind].foods.includes(food);

 function buyFood(food,qty=1){
  if(typeof food!=='string'||(!Object.hasOwn(FOODS,food)&&food!=='medicine'&&!Object.hasOwn(EQUIPMENT,food)))return {ok:false,message:'Unknown supply.'};
  qty=Number.isFinite(qty)?Math.max(1,Math.min(999,Math.floor(qty))):1;const unit=food==='medicine'?MEDICINE_PRICE:food in EQUIPMENT?EQUIPMENT[food].price:Math.round(FOODS[food].price*(mods.priceMul?mods.priceMul(food):1));const price=unit*qty;
  if(!spend(price,'supplies'))return {ok:false,message:'Not enough funds: '+price+' needed.'};
  state.stock[food]=(state.stock[food]||0)+qty;
  return {ok:true,message:'Bought '+qty+' × '+(food==='medicine'?'veterinary supplies':food in EQUIPMENT?EQUIPMENT[food].label.toLowerCase():FOODS[food].label.toLowerCase())+' for '+price+'.'};
 }

 function feed(id,food){
  const a=byId(id);if(!a||!a.managed)return {ok:false,message:'Only sanctuary residents can be hand-fed.'};
  const sp=SPECIES[a.kind];food=food||preferredFood(a);
  if(!accepts(a,food))return {ok:false,message:a.name+' does not eat '+(FOODS[food]?FOODS[food].short.toLowerCase():'that')+'. A '+sp.common.toLowerCase()+' eats: '+sp.foods.map(f=>FOODS[f].short.toLowerCase()).join(', ')+'.'};
  if(state.stock[food]<1)return {ok:false,message:'Out of '+FOODS[food].short.toLowerCase()+'. Buy more supplies.'};
  if(a.nutrition>=96)return {ok:false,message:a.name+' is already well fed.'};
  state.stock[food]-=1;
  const treat=(sp.treat||[]).includes(food);
  a.nutrition=clamp(a.nutrition+(treat?10:food===sp.foods[0]?34:22));
  a.stress=clamp(a.stress-(treat?9:5));a.trust=clamp(a.trust+(treat?4:2));a.feedings=(a.feedings||0)+1;a.lastFedDay=state.day;
  a.mood=treat?'Delighted':'Content';
  return {ok:true,message:a.name+' ate '+FOODS[food].label.toLowerCase()+'.'};
 }

 function feedAllHungry(threshold=60){
  let fed=0,missed=0;
  for(const a of residents()){
   if(a.nutrition>=threshold)continue;
   const sp=SPECIES[a.kind];let ok=false;
   for(const f of sp.foods.filter(x=>!(sp.treat||[]).includes(x)))if(feed(a.id,f).ok){ok=true;break}
   if(ok)fed++;else missed++;
  }
  return {ok:fed>0,message:fed?'Fed '+fed+' hungry resident'+(fed>1?'s':'')+(missed?'; '+missed+' could not be fed (check supplies).':'.'):(missed?'Could not feed '+missed+' resident'+(missed>1?'s':'')+': supplies are low.':'Everyone is fed.')};
 }

 function refillWater(){
  const cost=20;if(state.funds<cost)return {ok:false,message:'Not enough funds to run the pumps ('+cost+').'};
  spend(cost,'supplies');state.waterLevel=100;return {ok:true,message:'Waterholes and the soda lake refilled with clean water.'};
 }
 function treat(id){
  const a=byId(id);if(!a||!a.managed)return {ok:false,message:'Select a sanctuary resident.'};
  if(a.health>=92)return {ok:false,message:a.name+' is in good health; no treatment needed.'};
  if(state.stock.medicine<1)return {ok:false,message:'Out of veterinary supplies.'};
  state.stock.medicine--;addHistory(a,state.day,'Veterinary treatment.');a.health=clamp(a.health+18);a.stress=clamp(a.stress+4);a.injury=a.health>=80?'No visible injury.':a.injury;
  return {ok:true,message:'Veterinary check complete: '+a.name+' is responding well.'};
 }
 function enrich(id){
  const a=byId(id);if(!a||!a.managed)return {ok:false,message:'Select a sanctuary resident.'};
  if(a.enrichedDay===state.day)return {ok:false,message:a.name+' has already had enrichment today.'};
  a.enrichedDay=state.day;a.boredom=clamp((a.boredom??30)-22);a.stress=clamp(a.stress-14);a.social=clamp((a.social??60)+8);a.energy=clamp(a.energy-6);a.trust=clamp(a.trust+3);a.mood='Playful';
  return {ok:true,message:'Enrichment session with '+a.name+': scent trails, puzzle feeders and play.'};
 }

function useEnrichment(id,type){
  const a=byId(id);if(!a||!a.managed)return {ok:false,message:'Only sanctuary residents use enrichment.'};
  ensureProfile(a);const fit=enrichmentFit(a.kind,type);if(fit<=0)return {ok:false,message:a.name+' has no use for that.',fit:0};
  const fresh=state.minutes-(a.lastUsed||-1e9)>90;const k=fit*(fresh?1:.4);
  a.boredom=clamp((a.boredom??30)-BOREDOM_RELIEF*k);a.stress=clamp(a.stress-STRESS_RELIEF*k);a.social=clamp((a.social??60)+2*k);a.trust=clamp(a.trust+.3*k);a.energy=clamp(a.energy-3*k);a.lastUsed=state.minutes;a.mood=fit>=1?'Playful':'Content';a.enrichUses=(a.enrichUses||0)+1;
  if(a.enrichUses%12===1)addHistory(a,state.day,'Favourite pastime: '+(type==='pond'||type==='wallow'?'bathing':type)+'.');
  return {ok:true,message:a.name+' used the '+type+(fit>=1?' with obvious enjoyment.':'.'),fit};
 }
 // ---- Breeding programme -------------------------------------------------------------------------------------
 const lineageOf=a=>a.lineage||[a.geneticLine];
 function pairStatus(maleId,femaleId){
  const m=byId(maleId),f=byId(femaleId);const issues=[],notes=[];
  if(!m||!f||!m.managed||!f.managed)return {ok:false,issues:['Choose two sanctuary residents.'],notes};
  if(m.kind!==f.kind)issues.push('Different species cannot be paired.');
  if(m.sex!=='male'||f.sex!=='female')issues.push('A breeding pair needs one male and one female.');
  if(issues.length)return {ok:false,issues,notes};
  const sp=SPECIES[m.kind];
  for(const a of [m,f]){
   if(!isAdult(a))issues.push(a.name+' is not yet mature.');
   if(a.health<70)issues.push(a.name+' needs to be healthier (health '+Math.round(a.health)+'%).');
   if(a.stress>50)issues.push(a.name+' is too stressed (stress '+Math.round(a.stress)+'%).');
   if(a.nutrition<55)issues.push(a.name+' needs better nutrition.');
  }
  if(f.pregnant)issues.push(f.name+' is already expecting.');
  const shared=lineageOf(m).filter(l=>lineageOf(f).includes(l));
  if(shared.length)issues.push('Too closely related (shared line '+shared.join(', ')+'). Import an unrelated founder.');
  if(countOf(m.kind)>=sp.capacity)issues.push('The '+sp.common.toLowerCase()+' habitat is at capacity ('+countOf(m.kind)+'/'+sp.capacity+'). Transfer surplus animals first.');
  if(state.waterLevel<25)issues.push('Water supply is too low for a pregnancy.');
  if(mods.habitatScore(m.kind)<50)issues.push('The '+sp.common.toLowerCase()+' habitat is not suitable for raising young yet (score '+Math.round(mods.habitatScore(m.kind))+'%). Improve it in Build mode.');
  if(mods.pairBond){const b=mods.pairBond(m.id,f.id);if(b<-30)issues.push(m.name+' and '+f.name+' do not get along (bond '+Math.round(b)+'). Try group enrichment, or separate them for a while.');else if(b>=50)notes.push(m.name+' and '+f.name+' are closely bonded, which helps the pregnancy.')}
  const total=[...new Set(residents().filter(a=>a.kind===m.kind).flatMap(lineageOf))].length;
  notes.push('Genetic diversity: '+total+' founder line'+(total===1?'':'s')+' in this population.');
  return {ok:issues.length===0,issues,notes};
 }
 function startBreeding(maleId,femaleId){
  const s=pairStatus(maleId,femaleId);if(!s.ok)return {ok:false,message:s.issues[0],issues:s.issues};
  const m=byId(maleId),f=byId(femaleId),sp=SPECIES[m.kind];
  f.pregnant={sireId:m.id,sireName:m.name,sireLine:lineageOf(m),dueMinute:state.minutes+sp.gestationDays*DAY};
  state.pregnancies.push({damId:f.id,sireId:m.id,kind:m.kind});
  f.mood='Expecting';f.condition='Expecting · managed breeding programme';
  say(m.name+' and '+f.name+' ('+sp.common+') have been paired under the breeding programme. Birth expected in about '+sp.gestationDays+' days.');
  return {ok:true,message:m.name+' and '+f.name+' paired. Keep '+f.name+' well fed and calm.'};
 }
 function giveBirth(dam,sim_){
  const sp=SPECIES[dam.kind],preg=dam.pregnant;dam.pregnant=null;dam.condition='Managed sanctuary resident';dam.mood='Protective';
  state.pregnancies=state.pregnancies.filter(p=>p.damId!==dam.id);
  if(dam.health<35||dam.nutrition<20){say(dam.name+' lost her pregnancy; the pregnancy was not supported by her condition. Review diet and welfare before pairing again.');dam.stress=clamp(dam.stress+20);return []}
  const n=sp.litter[0]+Math.floor(rng()*(sp.litter[1]-sp.litter[0]+1));const babies=[];
  const sire=byId(preg.sireId);
  for(let i=0;i<n;i++){
   const sex=rng()<.5?'male':'female';const pool=sp.names[sex];
   let name=pool.find(x=>!sim.animals.some(a=>a.name===x))||pool[(state.serial)%pool.length]+' '+(state.serial+2);
   state.serial++;
   const id=dam.kind+'-born-'+state.serial;
   const lineage=[...new Set([...lineageOf(dam),...preg.sireLine])];
   const baby={...residentRecord(dam.kind,name,sex,lineage.join('×'),dam.habitatPosition[0]+(i-.5)*.8,dam.habitatPosition[1]+.8,{id,young:true,ageDays:0,scale:.36,lineage,parents:[dam.name,preg.sireName],
    health:94,hydration:82,nutrition:78,stress:10,trust:30,breedingEligible:false,condition:'Newborn · bonding with '+dam.name,notes:'Born at the sanctuary to '+dam.name+' and '+preg.sireName+'. Needs close monitoring and plenty of milk and food.',personality:'Newborn; learning from '+dam.name,mood:'Sleepy'}),};
   baby.ageDays=0;baby.traits={bold:Math.min(1,Math.max(0,((dam.traits?.bold??.5)+(sire?.traits?.bold??.5))/2+(rng()-.5)*.2)),social:Math.min(1,Math.max(0,((dam.traits?.social??.5)+(sire?.traits?.social??.5))/2+(rng()-.5)*.2)),curious:Math.min(1,Math.max(0,((dam.traits?.curious??.5)+(sire?.traits?.curious??.5))/2+(rng()-.5)*.2)),calm:.5};baby.history=[{day:state.day,text:'Born to '+dam.name+' and '+preg.sireName+'.'}];sim.animals.push(baby);babies.push(baby);
   state.familyTree.push({id,name,kind:dam.kind,species:sp.common,sex,parents:[dam.name,preg.sireName],born:'Day '+state.day,lineage});
  }
  state.births+=babies.length;state.credits+=babies.length*3;state.reputation+=babies.length*4;
  say(dam.name+' gave birth to '+babies.map(b=>b.name).join(' and ')+' ('+sp.common+(n>1?' cubs/young':'')+'). Conservation credits +'+babies.length*3+'.');
  return babies;
 }
 function transferOut(id){
  const a=byId(id);if(!a||!a.managed)return {ok:false,message:'Select a sanctuary resident.'};
  const sp=SPECIES[a.kind];
  if(!isAdult(a))return {ok:false,message:a.name+' is too young to be transferred.'};
  if(a.pregnant)return {ok:false,message:a.name+' is expecting and cannot be moved.'};
  if(countOf(a.kind)<=2)return {ok:false,message:'Keep at least two '+sp.common.toLowerCase()+'s at the sanctuary. Transfers are for surplus animals.'};
  if(welfareOf(a)<70)return {ok:false,message:a.name+' must be in good welfare (70+) before a transfer.'};
  const i=sim.animals.indexOf(a);sim.animals.splice(i,1);
  if(sim.selected&&sim.selected()===a&&sim.animals.length)sim.select(sim.animals[0].id);
  state.transfers++;state.credits+=6;state.reputation+=6;earn(120+(mods.transferBonus||0),'transfers');
  say(a.name+' ('+sp.common+') was transferred to a partner reserve as part of the species recovery plan. Credits +6, partner grant +120.');
  return {ok:true,message:a.name+' left for a partner reserve. Credits +6, grant +120.',removedId:a.id};
 }
 function importFounder(kind,sex){
  const sp=typeof kind==='string'&&Object.hasOwn(SPECIES,kind)?SPECIES[kind]:null;if(!sp)return {ok:false,message:'Unknown species.'};
  if(sex!=='male'&&sex!=='female')return {ok:false,message:'Choose male or female.'};
  if(state.credits<10)return {ok:false,message:'Importing a new founder costs 10 conservation credits.'};
  if(countOf(kind)>=sp.capacity)return {ok:false,message:'The habitat is full ('+countOf(kind)+'/'+sp.capacity+').'};
  state.credits-=10;state.imports++;
  const pool=sp.names[sex];const name=pool.find(x=>!sim.animals.some(a=>a.name===x))||pool[state.imports%pool.length]+' '+(state.imports+1);
  const line=kind.slice(0,2).toUpperCase()+'-F'+(state.imports);
  const rec=residentRecord(kind,name,sex,line,sp.spawn[0]+(state.imports%4)*.9,sp.spawn[1]-1.6,{condition:'New arrival · settling in',stress:34,notes:'Arrived from a partner reserve to bring new genetics to the studbook. '+sp.notes,id:kind+'-'+name.toLowerCase().replace(/\s+/g,'-')});
  sim.animals.push(rec);
  say(name+', an unrelated '+sp.common.toLowerCase()+' ('+sex+'), arrived from a partner reserve to widen genetic diversity.');
  return {ok:true,message:name+' arrived with a new founder line.',animal:rec};
 }

 // ---- Simulation step ---------------------------------------------------------------------------------------
 function dailyReport(){
  const list=residents();const avg=list.length?Math.round(list.reduce((n,a)=>n+welfareOf(a),0)/list.length):0;
  const grant=Math.round((45+state.reputation*1.6+(avg>=75?40:0))*(mods.grantMul?mods.grantMul():1));
  earn(grant,'grants');
  if(avg>=75)state.reputation+=1;
  const neglected=list.filter(a=>a.health<25);
  if(neglected.length){state.reputation=Math.max(0,state.reputation-3);say('Warning: '+neglected.map(a=>a.name).join(', ')+' in poor health. Reputation suffers until they receive care.')}
  state.lastReport={day:state.day,avg,grant};
  say('Day '+state.day+' report: average welfare '+avg+'%. Grants +'+grant+'.');
 }
 function tick(delta=1){
  if(!Number.isFinite(delta)||delta<=0)return;
  const steps=Math.max(1,Math.ceil(delta/60));const d=delta/steps;
  for(let s=0;s<steps;s++){
   state.minutes+=d;
   const list=residents();
   state.waterLevel=clamp(state.waterLevel-(.003+list.length*.0002)*d*(mods.waterDrain?mods.waterDrain():1));
   const counts={};for(const a of list)counts[a.kind]=(counts[a.kind]||0)+1;
   for(const a of list){
    const sp=SPECIES[a.kind];
    if(a.ageDays!==undefined){a.ageDays+=d/DAY;const was=a.young;a.young=a.ageDays<sp.matureDays;if(was&&!a.young){a.breedingEligible=true;a.condition='Managed sanctuary resident';say(a.name+' has grown up and is now an adult '+sp.common.toLowerCase()+'.')}}
    a.scale=scaleOf(a);
    if(state.waterLevel>8)a.hydration=clamp(a.hydration+.07*d);else a.hydration=clamp(a.hydration-.03*d);
    const hs=mods.habitatScore(a.kind);if(hs<60)a.stress=clamp(a.stress+.03*d*(60-hs)/60);else if(hs>=85)a.stress=clamp(a.stress-.004*d);
    a.stress=clamp(a.stress+mods.visitorStress(a.kind)*d);
    const crowd=(counts[a.kind]||0)>sp.capacity;
    if(crowd)a.stress=clamp(a.stress+.03*d);
    if(a.nutrition<18)a.health=clamp(a.health-.012*d);
    if(a.hydration<15)a.health=clamp(a.health-.016*d);
    if(a.nutrition>=45&&a.hydration>=45&&a.stress<55&&a.health<100)a.health=clamp(a.health+.006*d);
    if(a.nutrition<30)a.stress=clamp(a.stress+.02*d);
    ensureProfile(a);a.boredom=clamp((a.boredom??30)+(.011+a.traits.curious*.008)*d);if(a.boredom>75)a.stress=clamp(a.stress+.016*d);
    a.social=clamp((a.social??60)+((counts[a.kind]||0)>1?.002:-.01)*d);
    a.mood=a.pregnant?'Expecting':a.nutrition<30?'Hungry':a.stress>60?'Stressed':a.boredom>75?'Bored':a.mood==='Delighted'||a.mood==='Playful'?a.mood:'Content';
    if(a.pregnant&&state.minutes>=a.pregnant.dueMinute){giveBirth(a)}
   }
   for(const h of hooks)h.tick&&h.tick(d);
   if(state.minutes>=(state.day-2)*DAY){
    state.day++;dailyReport();for(const h of hooks)h.day&&h.day();
   }
  }
 }

 function summary(){
  const list=residents();const species=Object.keys(SPECIES).map(kind=>{
   const members=list.filter(a=>a.kind===kind);
   return {kind,common:SPECIES[kind].common,emoji:SPECIES[kind].emoji,count:members.length,capacity:SPECIES[kind].capacity,
    habitat:Math.round(mods.habitatScore(kind)),founders:[...new Set(members.flatMap(lineageOf))].length,welfare:members.length?Math.round(members.reduce((n,a)=>n+welfareOf(a),0)/members.length):0};
  });
  const avg=list.length?Math.round(list.reduce((n,a)=>n+welfareOf(a),0)/list.length):0;
  const hungry=list.filter(a=>a.nutrition<45).length;
  return {funds:Math.round(state.funds),credits:state.credits,reputation:Math.round(state.reputation),stock:{...state.stock},waterLevel:Math.round(state.waterLevel),
   residents:list.length,avgWelfare:avg,hungry,species,pregnancies:list.filter(a=>a.pregnant).map(a=>({name:a.name,kind:a.kind,sire:a.pregnant.sireName,daysLeft:Math.max(0,Math.ceil((a.pregnant.dueMinute-state.minutes)/DAY))})),
   births:state.births,transfers:state.transfers,familyTree:state.familyTree.slice(),day:state.day,lastReport:state.lastReport,events:events.slice(0,6),ext:Object.assign({},...hooks.map(h=>h.summary?h.summary():{}))};
 }

 function serialize(){
  return {v:1,state:{...state,stock:{...state.stock},pregnancies:state.pregnancies.slice(),familyTree:state.familyTree.slice()},animals:residents().map(a=>({...a})),ext:Object.fromEntries(hooks.filter(h=>h.key&&h.serialize).map(h=>[h.key,h.serialize()]))};
 }
 // Load a save. Nothing from the save is trusted: unknown or damaged parts are repaired or dropped, a damaged extension
 // block falls back to its defaults, and if anything still goes wrong the game is rolled back to how it was.
 const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const num=(v,d)=>typeof v==='number'&&Number.isFinite(v)?v:d;
 const STAT_KEYS=['health','hydration','nutrition','stress','boredom','social','energy','trust'];
 function sanitizeAnimal(a){
  if(!isObj(a)||typeof a.id!=='string'||!SPECIES[a.kind])return null;
  const sp=SPECIES[a.kind],out={...a,managed:true};
  for(const k of STAT_KEYS)if(out[k]!==undefined)out[k]=clamp(num(out[k],50));
  for(const k of ['health','hydration','nutrition','stress'])if(out[k]===undefined)out[k]=k==='stress'?20:70;
  if(!Array.isArray(out.habitatPosition)||out.habitatPosition.length<2||!out.habitatPosition.every(Number.isFinite))out.habitatPosition=[sp.spawn[0],sp.spawn[1]];
  if(out.ageDays!==undefined)out.ageDays=Math.max(0,num(out.ageDays,sp.matureDays+10));
  if(!Array.isArray(out.history))delete out.history;
  if(typeof out.name!=='string')out.name=a.id;
  return out;
 }
 function applySave(data){
  const st=data.state;
  const base={...state};Object.assign(state,st);
  for(const k of ['minutes','day','funds','credits','reputation','waterLevel','births','transfers']){if(!Number.isFinite(state[k]))state[k]=Number.isFinite(base[k])?base[k]:0}
  state.stock={meat:0,hay:0,browse:0,produce:0,aquatic:0,medicine:0,...DEFAULT_EQUIPMENT};   // migrate older saves that predate equipment
  if(isObj(st.stock))for(const [k,v] of Object.entries(st.stock))if(Number.isFinite(v)&&v>=0)state.stock[k]=v;
  state.pregnancies=Array.isArray(st.pregnancies)?st.pregnancies.filter(isObj):[];
  state.familyTree=Array.isArray(st.familyTree)?st.familyTree.filter(isObj):[];
  for(const h of hooks){
   if(!h.key||!h.restore)continue;
   const block=data.ext&&data.ext[h.key];
   if(!isObj(block)){try{h.restore({})}catch{}continue}
   try{h.restore(block)}catch{try{h.restore({})}catch{}}   // a damaged block resets that system only
  }
  const keep=sim.animals.filter(a=>!a.managed);
  const animals=data.animals.map(sanitizeAnimal).filter(Boolean);
  sim.animals.length=0;sim.animals.push(...keep,...animals);
 }
 function restore(data){
  if(!isObj(data)||data.v!==1||!isObj(data.state)||!Array.isArray(data.animals))return false;
  let snapshot=null;try{snapshot=JSON.parse(JSON.stringify(serialize()))}catch{}
  try{
   applySave(data);
   if(!residents().length)throw new Error('save has no resident animals');
   return true;
  }catch(e){
   if(snapshot){try{applySave(snapshot)}catch{}}
   return false;
  }
 }

 return {state,mods,extend,spend,earn,say,sim,useEnrichment,addHistory:(id,text)=>{const a=byId(id);if(a)addHistory(a,state.day,text)},SPECIES,FOODS,residents,feed,feedAllHungry,buyFood,refillWater,treat,enrich,pairStatus,startBreeding,transferOut,importFounder,tick,summary,serialize,restore,welfareOf,stageOf,scaleOf,preferredFood};
}
