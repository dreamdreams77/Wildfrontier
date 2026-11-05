// Sanctuary operations: visible staff with tasks and shifts, buildable habitat with per-species needs,
// and visitors/education. Pure logic (no rendering); it plugs into the sanctuary through its extension hooks.

import { ENRICHMENT } from './enrichment.js';

const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const DAY=1440;

export const HUB={x:19.5,z:4.2};            // supply shed where staff start and rest
export const PLATFORM_SPOT={x:26,z:7.4};     // where educators give talks
export const ZONE={minX:17.5,maxX:43,minZ:-18,maxZ:20};
export const SHIFT={start:360,end:1200};     // 06:00-20:00
export const OPEN_HOURS={start:540,end:1020}; // 09:00-17:00

export const ROLES={
 keeper:{label:'Keeper',cost:150,wage:40,max:4,emoji:'🧑‍🌾',color:'#6f8f4e',hat:'#b49b68',blurb:'Walks to hungry residents and feeds them from stock.'},
 vet:{label:'Veterinarian',cost:320,wage:70,max:2,emoji:'🩺',color:'#e6ebe0',hat:'#e6ebe0',blurb:'Treats residents in poor health using veterinary supplies.'},
 cleaner:{label:'Groundskeeper',cost:130,wage:35,max:3,emoji:'🧹',color:'#8a7a4a',hat:'#6a5a30',blurb:'Cleans enclosures and repairs worn habitat features.'},
 researcher:{label:'Researcher',cost:380,wage:80,max:2,emoji:'🔬',color:'#4a6a8a',hat:'#4a6a8a',blurb:'Runs research projects that unlock vaccines, diagnostics and better habitat care.'},
 educator:{label:'Educator',cost:240,wage:50,max:2,emoji:'🎓',color:'#b5603f',hat:'#7a4a22',blurb:'Gives talks at the viewing platform: awareness, donations and credits.'},
};
const NAMES={
 keeper:['Baraka Otieno','Asha Mwangi','Kofi Mensah','Zola Dube','Arun Pillai','Lindiwe Khumalo'],
 vet:['Dr. Priya Nair','Dr. Amara Okafor','Dr. Rohan Mehta','Dr. Tendai Moyo'],
 educator:['Neema Kamau','Anand Rao','Imani Wafula','Kavya Iyer'],
 cleaner:['Themba Ndlovu','Salma Hassan','Joseph Kiprop','Mwajuma Ali','Dev Patel'],
 researcher:['Dr. Naledi Sithole','Dr. Vikram Rao','Dr. Wanjiru Njoroge'],
};

export const BUILD_ITEMS={
 shadeTree:{label:'Shade tree',icon:'🌳',cost:60,r:1.3,tags:['shade','trees'],blurb:'Shade and browse. Needed by most species.'},
 pond:{label:'Pond',icon:'💧',cost:120,r:2.1,tags:['water'],appeal:1,blurb:'Fresh drinking and bathing water.'},
 wallow:{label:'Mud wallow',icon:'🟤',cost:100,r:1.9,tags:['mud','water'],blurb:'Mud and water for rhinos and elephants.'},
 shelter:{label:'Shelter den',icon:'🛖',cost:90,r:1.4,tags:['shelter'],blurb:'A quiet retreat from weather and visitors.'},
 rocks:{label:'Rock outcrop',icon:'🪨',cost:70,r:1.5,tags:['rock'],blurb:'Lookouts and sunning spots for big cats.'},
 bamboo:{label:'Bamboo clump',icon:'🎋',cost:50,r:1.1,tags:['cover'],blurb:'Dense cover for stalking and hiding.'},
 feeder:{label:'Feeding station',icon:'🍽',cost:80,r:1.0,tags:['feeder'],blurb:'Automatically feeds up to 3 hungry residents nearby each day from stock.'},
 platform:{label:'Viewing platform',icon:'🔭',cost:260,r:1.9,tags:['viewing'],appeal:3,capacity:12,blurb:'Lets more visitors watch animals from a safe distance.'},
 path:{label:'Boardwalk',icon:'🪵',cost:30,r:.9,tags:['path'],appeal:.5,blurb:'Guides visitors along a set route.'},
 flowers:{label:'Wildflower bed',icon:'🌼',cost:40,r:1.1,tags:['decor'],appeal:1,blurb:'Pretty, but animals do not need it.'},
 ...Object.fromEntries(Object.entries(ENRICHMENT).map(([k,e])=>[k,{label:e.label,icon:e.icon,cost:e.cost,r:e.r,tags:['enrich',k],blurb:e.blurb}])),
 cafe:{label:'Visitor café',icon:'☕',cost:220,r:1.8,tags:['service'],appeal:1.5,capacity:6,spend:3,blurb:'Earns extra from every visitor and keeps guests longer.'},
 giftShop:{label:'Gift shop',icon:'🎁',cost:180,r:1.6,tags:['service'],appeal:1,spend:2,blurb:'Souvenirs fund conservation: extra income per visitor.'},
 releasePen:{label:'Soft-release pen',icon:'🚪',cost:300,r:2.4,tags:['release'],blurb:'A quiet fenced pen where animals relearn wild skills before release.'},
 education:{label:'Education centre',icon:'🏫',cost:500,r:2.5,tags:['education'],appeal:4,capacity:20,blurb:'Exhibits and classes: more visitors, more awareness.'},
};

// Features already built into the savanna scene (kept in sync with savanna.js).
const BASELINE=[
 ...[[28,3],[33.5,-3.5],[27,-3],[35.5,3],[30,-12],[40,2],[34,-6.5],[22,-1],[39,13],[29,13],[40,-3]].map(([x,z])=>({type:'shadeTree',x,z})),
 {type:'rocks',x:23,z:-9.5},{type:'rocks',x:25.5,z:-8.5},
 {type:'pond',x:31,z:7},{type:'pond',x:38,z:-10},{type:'pond',x:36.5,z:-9},{type:'pond',x:25.5,z:8.2},
 {type:'wallow',x:37,z:10},
 {type:'bamboo',x:20,z:12},{type:'bamboo',x:22,z:13},{type:'bamboo',x:21,z:11},
 {type:'platform',x:26,z:5,baseline:true},
];

// What each species needs within reach of its enclosure to live well. Beauty never counts here.
export const NEEDS={
 africanLion:{shade:3,rock:2,water:1,shelter:1},
 bengalTiger:{water:2,cover:4,shade:2,shelter:1},
 africanElephant:{water:2,trees:4,mud:1,shelter:1},
 giraffe:{trees:5,water:1,shelter:1,feeder:1},
 plainsZebra:{water:1,shade:2,shelter:1},
 cheetah:{rock:2,shade:1,water:1,shelter:1},
 indianRhino:{mud:2,water:1,cover:1,shelter:1},
 flamingo:{water:3,cover:1,shelter:1},
};
export const SENSITIVITY={cheetah:.9,bengalTiger:.7,indianRhino:.6,flamingo:.5,africanLion:.4,plainsZebra:.3,africanElephant:.25,giraffe:.2};
const NEED_LABEL={shade:'shade tree',trees:'tree',water:'water source',mud:'mud wallow',shelter:'shelter den',rock:'rock outcrop',cover:'cover (bamboo)',feeder:'feeding station'};
const REACH=9;

export function createOperations(sanct,options={}){
 const state={
  staff:[],staffSerial:0,items:[],itemSerial:0,unpaid:false,nextTalk:0,
  visitors:{open:true,price:8,restricted:{},awareness:0,today:0,total:0,onSite:0,rating:3,lastIncome:0,lastDonation:0,talks:0},
 };
 const {SPECIES}=sanct;
 const resList=()=>sanct.residents();
 const say=t=>sanct.say(t);

 // ---- Habitat ---------------------------------------------------------------------------------------------
 const featureTags=type=>BUILD_ITEMS[type]?.tags||[];
 const allFeatures=()=>[...BASELINE,...state.items.filter(i=>(i.cond??100)>=25)];   // badly worn features stop counting until repaired
 function habitatDetail(kind){
  const sp=SPECIES[kind],need=NEEDS[kind];if(!sp||!need)return {score:100,missing:[],have:{}};
  const have={};
  for(const f of allFeatures()){
   if(Math.hypot(f.x-sp.spawn[0],f.z-sp.spawn[1])>REACH)continue;
   for(const t of featureTags(f.type))have[t]=(have[t]||0)+1;
  }
  let want=0,got=0;const missing=[];
  for(const [t,n] of Object.entries(need)){want+=n;const h=Math.min(n,have[t]||0);got+=h;if(h<n)missing.push((n-h)+' × '+NEED_LABEL[t])}
  return {score:Math.round(100*got/want),missing,have};
 }
 const habitatScore=kind=>habitatDetail(kind).score;
 function inZone(x,z){return x>=ZONE.minX&&x<=ZONE.maxX&&z>=ZONE.minZ&&z<=ZONE.maxZ}
 function place(type,x,z,rot=0){
  const def=BUILD_ITEMS[type];if(!def)return {ok:false,message:'Unknown item.'};
  if(!inZone(x,z))return {ok:false,message:'Build inside the safari grounds.'};
  for(const o of state.items){const od=BUILD_ITEMS[o.type];if(Math.hypot(o.x-x,o.z-z)<(def.r+od.r)*.75)return {ok:false,message:'Too close to another structure.'}}
  const cost=Math.round(def.cost*(sanct.mods.costMul||1));
  if(!sanct.spend(cost,'building'))return {ok:false,message:'Not enough funds ('+cost+' needed).'};
  const item={id:'b'+(++state.itemSerial),type,x:Math.round(x*10)/10,z:Math.round(z*10)/10,rot,cond:100};
  state.items.push(item);
  return {ok:true,message:def.label+' built.',item};
 }
 function move(id,x,z){
  const it=state.items.find(i=>i.id===id);if(!it)return {ok:false,message:'Nothing selected.'};
  if(!inZone(x,z))return {ok:false,message:'Move it inside the safari grounds.'};
  const def=BUILD_ITEMS[it.type];
  for(const o of state.items){if(o.id===id)continue;const od=BUILD_ITEMS[o.type];if(Math.hypot(o.x-x,o.z-z)<(def.r+od.r)*.75)return {ok:false,message:'Too close to another structure.'}}
  it.x=Math.round(x*10)/10;it.z=Math.round(z*10)/10;return {ok:true,message:def.label+' moved.',item:it};
 }
 function rotate(id,delta=Math.PI/4){const it=state.items.find(i=>i.id===id);if(!it)return {ok:false,message:'Nothing selected.'};it.rot=(it.rot+delta)%(Math.PI*2);return {ok:true,message:'Rotated.',item:it}}
 function remove(id){
  const i=state.items.findIndex(x=>x.id===id);if(i<0)return {ok:false,message:'Nothing selected.'};
  const [it]=state.items.splice(i,1);const refund=Math.floor(BUILD_ITEMS[it.type].cost/2);sanct.earn(refund,'building');
  return {ok:true,message:BUILD_ITEMS[it.type].label+' removed. Refunded '+refund+'.',removedId:id};
 }

 // ---- Visitors & education -------------------------------------------------------------------------------
 const V=state.visitors;
 const staffOf=role=>state.staff.filter(m=>m.role===role);
 const appeal=()=>1+state.items.reduce((n,i)=>n+(BUILD_ITEMS[i.type].appeal||0)*((i.cond??100)>=50?1:.4),0)+3;
 const capacity=()=>6+6+state.items.reduce((n,i)=>n+(BUILD_ITEMS[i.type].capacity||0),0);
 function computeRating(){
  const list=resList().filter(a=>!V.restricted[a.kind]);if(!list.length)return 0;
  const w=list.reduce((n,a)=>n+sanct.welfareOf(a),0)/list.length;
  const kinds=new Set(list.map(a=>a.kind)).size;
  let r=(sanct.mods.ratingAdjust?sanct.mods.ratingAdjust():0)+1+3.2*(w/100)*Math.pow(kinds/8,.7)+(staffOf('educator').length?.4:0)+Math.min(.4,(appeal()-4)*.04);
  const stressed=list.filter(a=>a.stress>60).length;if(stressed)r-=Math.min(.8,stressed*.15);
  return Math.round(clamp(r,0,5)*10)/10;
 }
 function planDay(){
  V.rating=computeRating();
  if(!V.open||V.rating<=0){V.today=0;return}
  const base=3+sanct.state.reputation*.5+appeal()*1.6;
  const priceFactor=clamp(1-(V.price-8)/18,.15,1.4);
  V.today=Math.round(Math.min(capacity()*1.5,base*(V.rating/3)*priceFactor));
 }
 function settleDay(){
  const income=V.today*V.price;const donation=Math.round(V.awareness*.6);
  const extra=sanct.mods.visitorSpend?sanct.mods.visitorSpend(V.today):0;sanct.earn(income,'tickets');if(donation)sanct.earn(donation,'donations');if(extra)sanct.earn(extra,'shop & café');V.lastExtra=extra;V.lastIncome=income;V.lastDonation=donation;V.total+=V.today;
  V.awareness+=V.today*.05*(staffOf('educator').length?2:1);
  if(V.rating>=4&&V.today>0)sanct.state.reputation+=1;
  if(V.today>0)say('Visitors: '+V.today+' came today (rating '+V.rating+'★). Tickets +'+income+(donation?', donations +'+donation:'')+'.');
 }
 function setOpen(open){V.open=!!open;return {ok:true,message:V.open?'The sanctuary is open to visitors.':'The sanctuary is closed to visitors.'}}
 function setPrice(p){if(!Number.isFinite(p))return {ok:false,message:'Enter a ticket price.'};V.price=clamp(Math.round(p),0,30);return {ok:true,message:'Ticket price set to '+V.price+'.'}}
 function setRestricted(kind,on){if(!SPECIES[kind])return {ok:false,message:'Unknown species.'};if(on)V.restricted[kind]=true;else delete V.restricted[kind];return {ok:true,message:SPECIES[kind].common+(on?' habitat closed to visitors.':' habitat open to visitors.')}}
 function talk(m){
  const gain=4+m.skill*2;V.awareness+=gain;V.talks++;const donation=10+V.onSite*3;sanct.earn(donation,'donations');
  if(V.talks%3===0){sanct.state.credits+=1}
  say(m.name+' gave a talk to '+V.onSite+' visitors. Awareness +'+gain+', donations +'+donation+'.');
 }

 // ---- Staff -------------------------------------------------------------------------------------------------
 function hire(role){
  const def=ROLES[role];if(!def)return {ok:false,message:'Unknown role.'};
  if(staffOf(role).length>=def.max)return {ok:false,message:'You already have the maximum number of '+def.label.toLowerCase()+'s ('+def.max+').'};
  if(!sanct.spend(def.cost,'staff'))return {ok:false,message:'Hiring a '+def.label.toLowerCase()+' costs '+def.cost+'.'};
  const pool=NAMES[role];const name=pool.find(n=>!state.staff.some(s=>s.name===n))||pool[0]+' '+(state.staffSerial+2);
  const m={id:'staff-'+(++state.staffSerial),role,name,skill:1,xp:0,energy:100,morale:70,x:HUB.x+(state.staffSerial%3)*.7,z:HUB.z,heading:0,state:'idle',task:null,timer:0,tasksDone:0};
  state.staff.push(m);say(name+' joined the team as a '+def.label.toLowerCase()+' (wage '+def.wage+'/day).');
  return {ok:true,message:name+' hired. '+def.blurb,member:m};
 }
 function dismiss(id){const i=state.staff.findIndex(m=>m.id===id);if(i<0)return {ok:false,message:'No such staff member.'};const [m]=state.staff.splice(i,1);say(m.name+' left the team.');return {ok:true,message:m.name+' has left the team.',removedId:id}}
 const wagesPerDay=()=>state.staff.reduce((n,m)=>n+ROLES[m.role].wage+(m.skill-1)*8,0);
 function step(m,tx,tz,dt){
  const dx=tx-m.x,dz=tz-m.z,d=Math.hypot(dx,dz),sp=(2.4+m.skill*.5)*effort(m)*dt;
  if(d<=sp+.01){m.x=tx;m.z=tz;return true}
  m.x+=dx/d*sp;m.z+=dz/d*sp;m.heading=Math.atan2(dx,dz);return false;
 }
 const effort=m=>.6+.4*Math.min(1,(m.energy??100)/100)*(.75+.25*Math.min(1,(m.morale??70)/70));   // tired or unhappy staff move and work slower
 const providers=[],finishers={};
 const claimed=()=>new Set(state.staff.filter(m=>m.task&&m.task.animalId).map(m=>m.task.animalId));
 const stockFor=a=>{const sp=SPECIES[a.kind];return sp.foods.filter(f=>!(sp.treat||[]).includes(f)).find(f=>sanct.state.stock[f]>=1)};
 function levelUp(m){m.tasksDone++;m.xp++;const need=m.skill===1?10:m.skill===2?25:Infinity;if(m.xp>=need&&m.skill<3){m.skill++;m.xp=0;say(m.name+' gained experience and is now skill level '+m.skill+'.')}}
 function pickTask(m){
  const taken=claimed();
  if((m.energy??100)<22)return null;   // needs a break at the supply shed
  for(const p of providers){const t=p(m,{taken});if(t)return t}
  if(m.role==='keeper'){
   const hungry=resList().filter(a=>a.nutrition<55&&!taken.has(a.id)).sort((a,b)=>a.nutrition-b.nutrition);
   for(const a of hungry){const food=stockFor(a);if(food)return {kind:'feed',animalId:a.id,food,x:a.habitatPosition[0],z:a.habitatPosition[1]-1.3}}
  }else if(m.role==='vet'){
   const sick=resList().filter(a=>a.health<78&&!taken.has(a.id)).sort((a,b)=>a.health-b.health);
   if(sanct.state.stock.medicine>=1&&sick.length){const a=sick[0];return {kind:'treat',animalId:a.id,x:a.habitatPosition[0],z:a.habitatPosition[1]-1.3}}
  }else if(m.role==='educator'){
   if(V.onSite>=3&&sanct.state.minutes>=state.nextTalk&&!state.staff.some(o=>o!==m&&o.task?.kind==='talk'))return {kind:'talk',x:PLATFORM_SPOT.x,z:PLATFORM_SPOT.z};
  }
  return null;
 }
 function finishTask(m){
  const t=m.task;m.task=null;
  if(t.kind==='feed')sanct.feed(t.animalId,t.food);
  else if(t.kind==='treat')sanct.treat(t.animalId);
  else if(t.kind==='talk'){talk(m);state.nextTalk=sanct.state.minutes+120}
  else if(finishers[t.kind])finishers[t.kind](m,t);
  levelUp(m);
 }
 // Real-time update (seconds). Called every frame by the game loop.
 function update(dt){
  const mins=sanct.state.minutes%DAY,onShift=mins>=SHIFT.start&&mins<SHIFT.end&&!state.unpaid;
  for(const m of state.staff){
   if(m.state==='work'){m.energy=Math.max(0,(m.energy??100)-dt*.5);m.timer-=dt*effort(m);if(m.timer<=0){finishTask(m);m.state='idle'}continue}
   if(onShift&&(m.state==='idle'||m.state==='return')&&!m.task){const t=pickTask(m);if(t){m.task=t;m.state='walk'}}
   if(m.state==='walk'&&m.task){if(step(m,m.task.x,m.task.z,dt)){m.state='work';m.timer=m.task.work||(m.task.kind==='talk'?6:2.2)}continue}
   if(m.state==='walk')m.energy=Math.max(0,(m.energy??100)-dt*.3);
   if(!m.task){const home=step(m,HUB.x+(state.staff.indexOf(m)%3)*.7,HUB.z,dt);m.state=home?'idle':'return';if(home)m.energy=Math.min(100,(m.energy??100)+dt*1.6)}
  }
 }

 // ---- Daily / per-minute hooks ------------------------------------------------------------------------------
 function day(){
  settleDay();
  const wages=wagesPerDay();
  if(wages){if(sanct.state.funds>=wages){sanct.spend(wages,'wages');state.unpaid=false;say('Staff wages paid: −'+wages+'.')}else{state.unpaid=true;say('Not enough funds to pay staff ('+wages+'). Work has stopped until you can pay.')}}
  if(sanct.state.lastReport)sanct.state.lastReport.wages=wages;
  // Feeding stations top up hungry residents nearby, a few per day.
  for(const f of state.items.filter(i=>i.type==='feeder')){
   let left=3;for(const a of resList().filter(a=>a.nutrition<55&&Math.hypot(a.habitatPosition[0]-f.x,a.habitatPosition[1]-f.z)<7).sort((x,y)=>x.nutrition-y.nutrition)){
    if(left<=0)break;const food=stockFor(a);if(food&&sanct.feed(a.id,food).ok)left--;
   }
  }
  planDay();
  for(const m of state.staff){m.energy=Math.min(100,(m.energy??100)+35);m.morale=Math.max(0,Math.min(100,(m.morale??70)+(state.unpaid?-8:2)))}
 }
 function tick(){
  const mins=sanct.state.minutes%DAY;
  V.onSite=V.open&&mins>=OPEN_HOURS.start&&mins<OPEN_HOURS.end?Math.min(capacity(),Math.round(V.today/3)):0;
 }
 sanct.mods.habitatScore=habitatScore;
 sanct.mods.visitorStress=kind=>V.restricted[kind]?0:(SENSITIVITY[kind]||.3)*V.onSite*.0016;
 planDay();

 function summary(){
  const habitat={};for(const k of Object.keys(SPECIES))habitat[k]=habitatDetail(k);
  return {
   staff:state.staff.map(m=>({...m,task:m.task?{...m.task}:null})),wagesPerDay:wagesPerDay(),unpaid:state.unpaid,
   items:state.items.map(i=>({...i})),habitat,
   visitors:{...V,restricted:{...V.restricted},capacity:capacity(),appeal:Math.round(appeal()*10)/10},
  };
 }
 function serialize(){return {staff:state.staff,staffSerial:state.staffSerial,items:state.items,itemSerial:state.itemSerial,unpaid:state.unpaid,nextTalk:state.nextTalk,visitors:V}}
 function restore(d){
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),fin=Number.isFinite;
  state.staff=(Array.isArray(d.staff)?d.staff:[]).filter(m=>obj(m)&&ROLES[m.role]&&typeof m.id==='string').map(m=>({...m,x:fin(m.x)?m.x:HUB.x,z:fin(m.z)?m.z:HUB.z,heading:fin(m.heading)?m.heading:0,skill:[1,2,3].includes(m.skill)?m.skill:1,xp:fin(m.xp)?m.xp:0,tasksDone:fin(m.tasksDone)?m.tasksDone:0,task:null,state:'idle',timer:0}));
  state.staffSerial=fin(d.staffSerial)?d.staffSerial:state.staff.length;
  state.items=(Array.isArray(d.items)?d.items:[]).filter(i=>obj(i)&&BUILD_ITEMS[i.type]&&typeof i.id==='string'&&fin(i.x)&&fin(i.z)).map(i=>{const o={...i,rot:fin(i.rot)?i.rot:0};if(fin(o.cond))o.cond=Math.max(0,Math.min(100,o.cond));else delete o.cond;return o});
  state.itemSerial=fin(d.itemSerial)?d.itemSerial:state.items.length;state.unpaid=!!d.unpaid;state.nextTalk=fin(d.nextTalk)?d.nextTalk:0;
  if(obj(d.visitors)){for(const [k,v] of Object.entries(d.visitors))if(k!=='restricted'&&typeof v==='number'&&fin(v)&&k in V)V[k]=v;if(typeof d.visitors.open==='boolean')V.open=d.visitors.open}
  V.restricted={};if(obj(d.visitors?.restricted))for(const [k,v] of Object.entries(d.visitors.restricted))if(v&&SPECIES[k])V.restricted[k]=true;
 }
 sanct.extend({key:'ops',tick,day,summary,serialize,restore});

 return {state,providers,finishers,effort,hire,dismiss,update,place,move,rotate,remove,habitatDetail,habitatScore,setOpen,setPrice,setRestricted,planDay,computeRating,summary,ROLES,BUILD_ITEMS,NEEDS,HUB,PLATFORM_SPOT,capacity,appeal};
}
