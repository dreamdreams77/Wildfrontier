const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const initialAnimals=[
 {id:'fawn-01',kind:'deer',name:'Juniper',species:'White-tailed deer · fawn',condition:'Injured · needs assessment',location:'North meadow',health:42,hydration:38,nutrition:54,stress:68,trust:12,stage:'sighted',injury:'A shallow cut on the rear leg; movement is uneven.',notes:'Found alone near the old oak. Keep a quiet approach and let the ranger assess before handling.',energy:52,social:35,mood:'Wary',personality:'Gentle, easily startled',routine:'Rests in cover at midday; browses at dawn and dusk',sleeping:false,feedings:0},
 {id:'rabbit-01',kind:'rabbit',name:'Clover',species:'Eastern cottontail',condition:'Stable · wild resident',location:'Clover patch',health:94,hydration:76,nutrition:71,stress:18,trust:0,stage:'wild',injury:'No visible injury.',notes:'Foraging normally. Best support is a healthy, undisturbed meadow.',energy:72,social:64,mood:'Curious',personality:'Bold, social and food-motivated',routine:'Forages in the cool hours and rests beneath cover',sleeping:false,feedings:0},
 {id:'rabbit-02',kind:'rabbit',name:'Pip',species:'Eastern cottontail',condition:'Stable · wild resident',location:'Fern edge',health:88,hydration:63,nutrition:58,stress:24,trust:0,stage:'wild',injury:'No visible injury.',notes:'Keeps to the fern cover and is most active in the cooler hours.',energy:61,social:48,mood:'Cautious',personality:'Shy, observant and prefers shelter',routine:'Feeds near dusk; retreats quickly when startled',sleeping:false,feedings:0}
];
const weatherCycle=[{name:'Clear',icon:'☀',water:0,stress:-.2},{name:'Cloudy',icon:'☁',water:.02,stress:0},{name:'Light rain',icon:'☂',water:.12,stress:.05},{name:'Breezy',icon:'≋',water:0,stress:.12}];
export function createSimulation(){
 const animals=initialAnimals.map(a=>({...a}));
 const habitat={water:61,cover:73,food:68,disturbance:22,health:68,biodiversity:57};
 const log=[{time:'06:40',text:'Morning survey started at North Woodland.'},{time:'06:52',text:'Juniper sighted near the old oak. Possible leg injury.'}];
 let minutes=0,day=3,selectedId='fawn-01',restoration=2450,waterStation=false,coverRestored=false,weatherIndex=0,weatherMinutes=0;
 const add=text=>log.unshift({time:clock(),text});
 const clock=()=>{const total=6*60+40+minutes;return String(Math.floor(total/60)%24).padStart(2,'0')+':'+String(total%60).padStart(2,'0')};
 const phase=()=>{const h=Number(clock().slice(0,2));return h<6||h>=20?'Night':h<9?'Dawn':h<17?'Day':'Dusk'};
 const weather=()=>weatherCycle[weatherIndex];
 function recalc(){habitat.health=Math.round(clamp(habitat.water*.24+habitat.cover*.24+habitat.food*.2+habitat.biodiversity*.16+(100-habitat.disturbance)*.16));}
 function behavior(a){if(a.stage==='released')return 'Living wild · post-release monitoring';if(a.stage==='rehabilitating'){if(a.stress>65)return 'Distressed · needs quiet';if(a.energy<25)return 'Resting in recovery';if(a.nutrition<35)return 'Hungry · recovery feed due';if(a.hydration<35)return 'Thirsty · fresh water due';return a.sleeping?'Sleeping in sheltered pen':'Settling into recovery'}if(a.stage==='wild'){if(a.sleeping)return 'Resting beneath cover';if(a.stress>60)return 'Alert · hiding';if(a.energy<25)return 'Seeking a resting place';return a.mood==='Curious'?'Foraging · curious':'Foraging near shelter'}return a.stage==='sighted'?'Wary · needs ranger assessment':a.stage==='assessed'?'Awaiting stabilization':'Stabilized · ready for transport'}
 function tick(delta=1){
  if(!Number.isFinite(delta)||delta<=0)return;
  const previousDay=day,previousTotal=6*60+40+minutes;minutes+=delta;const total=6*60+40+minutes;day=3+Math.floor(total/1440);
  weatherMinutes+=delta;if(weatherMinutes>=180){weatherMinutes=0;weatherIndex=(weatherIndex+1)%weatherCycle.length;add('Weather shifted: '+weather().name.toLowerCase()+'.')}
  const p=phase(),night=p==='Night';
  for(const a of animals){
   if(a.stage==='released')continue;
   if(a.stage==='rehabilitating'){
    a.health=clamp(a.health+.035*delta);a.stress=clamp(a.stress+(a.sleeping?-.19:-.035)*delta);a.energy=clamp(a.energy+(a.sleeping?.24:-.08)*delta);a.nutrition=clamp(a.nutrition-.012*delta);a.hydration=clamp(a.hydration-.016*delta);
    if(a.stress>72)a.sleeping=false;else if(night&&a.stress<50)a.sleeping=true;else if(!night&&a.energy>35)a.sleeping=false;
   }else{
    a.hydration=clamp(a.hydration-(.012+weather().water*.08)*delta);a.nutrition=clamp(a.nutrition-.009*delta);a.energy=clamp(a.energy+(night?.08:-.055)*delta);
    a.stress=clamp(a.stress+(habitat.disturbance>45?.035:weather().stress-.025)*delta);
    if(night){a.sleeping=a.energy>30;a.mood='Resting'}else{a.sleeping=false;a.mood=a.stress>55?'Alert':a.energy<25?'Tired':'Curious'}
    if(a.stress>78)a.health=clamp(a.health-.012*delta);
   }
  }
  if(night){habitat.disturbance=clamp(habitat.disturbance-.018*delta);habitat.water=clamp(habitat.water+weather().water*.04*delta)}
  recalc();if(day>previousDay)add('A new morning begins at North Woodland · Day '+day+'.');
 }
 function selected(){return animals.find(a=>a.id===selectedId)||animals[0]}
 function select(id){if(animals.some(a=>a.id===id))selectedId=id;return selected()}
 function act(action){
  const a=selected();if(!a)return {ok:false,message:'No animal selected.'};
  if(action==='observe'){a.trust=clamp(a.trust+2);if(a.stage==='wild')a.stress=clamp(a.stress-1);add('Quiet observation recorded: '+a.name+'.');return {ok:true,message:'Observation logged. You kept a respectful distance.'}}
  if(action==='track'){add('Track markers placed along '+a.location.toLowerCase()+'.');restoration=Math.min(3000,restoration+20);return {ok:true,message:'Track markers placed. Movement will be easier to monitor.'}}
  if(action==='assess'){if(a.stage!=='sighted')return {ok:false,message:'This animal does not need an initial field assessment.'};a.stage='assessed';a.condition='Assessed · transport recommended';a.health=clamp(a.health+3);a.stress=clamp(a.stress+4);add('Ranger assessment completed for '+a.name+'. Leg injury confirmed.');return {ok:true,message:'Assessment complete. A leg injury is confirmed; prepare a quiet transport.'}}
  if(action==='stabilize'){if(a.stage!=='assessed')return {ok:false,message:'A ranger assessment must come first.'};a.health=clamp(a.health+14);a.stress=clamp(a.stress-9);a.condition='Stabilized · ready for transport';a.stage='stabilized';add(a.name+' received field stabilization.');return {ok:true,message:'Field stabilization complete. Keep the carrier covered and quiet.'}}
  if(action==='transport'){if(a.stage!=='stabilized')return {ok:false,message:'Stabilize the animal before transport.'};a.stage='rehabilitating';a.location='Field station · quiet recovery';a.stress=clamp(a.stress-16);a.sleeping=false;a.condition='In rehabilitation';add(a.name+' transported to the quiet recovery pen.');return {ok:true,message:a.name+' is now in the quiet recovery pen.'}}
  if(action==='feed'){if(a.stage!=='rehabilitating')return {ok:false,message:'Do not feed wild animals during field observation.'};if(a.nutrition>88)return {ok:false,message:'The recovery ration is not due yet.'};a.nutrition=clamp(a.nutrition+25);a.energy=clamp(a.energy+12);a.feedings++;add('Measured species-appropriate feed given to '+a.name+'.');return {ok:true,message:'Measured feed served according to the recovery plan.'}}
  if(action==='water'){if(a.stage!=='rehabilitating')return {ok:false,message:'Refresh the habitat water station instead of approaching wildlife.'};if(a.hydration>90)return {ok:false,message:'Fresh water is already available.'};a.hydration=clamp(a.hydration+30);add('Fresh water provided for '+a.name+'.');return {ok:true,message:'Fresh water refreshed in the recovery pen.'}}
  if(action==='quiet'){if(a.stage!=='rehabilitating')return {ok:false,message:'Quiet recovery is only available in the rehabilitation pen.'};a.stress=clamp(a.stress-20);a.energy=clamp(a.energy+8);a.sleeping=true;add('Recovery pen quietened for '+a.name+'.');return {ok:true,message:'Lights dimmed and activity paused. '+a.name+' can rest.'}}
  if(action==='enrich'){if(a.stage!=='rehabilitating')return {ok:false,message:'Enrichment is prepared for animals in rehabilitation.'};a.stress=clamp(a.stress-8);a.social=clamp(a.social+5);a.energy=clamp(a.energy-4);add('Species-appropriate enrichment added for '+a.name+'.');return {ok:true,message:'A low-stress enrichment activity has been added.'}}
  if(action==='release'){if(a.stage!=='rehabilitating')return {ok:false,message:'Only rehabilitating animals can be evaluated for release.'};if(a.health<85||a.stress>28||a.nutrition<70||a.hydration<70||a.energy<35)return {ok:false,message:'Not ready: health, stress, hydration, nutrition and energy must meet release standards.'};a.stage='released';a.location='North woodland · released';a.condition='Released · monitored';a.notes='Released after meeting welfare standards. Monitor from a respectful distance.';add(a.name+' passed the release assessment and returned to suitable habitat.');restoration=Math.min(3000,restoration+250);return {ok:true,message:a.name+' passed the release check and returned to the woodland.'}}
  return {ok:false,message:'That field action is not available.'};
 }
 function serviceWater(){if(waterStation)return {ok:false,message:'The creekside station is already full.'};waterStation=true;habitat.water=clamp(habitat.water+24);habitat.disturbance=clamp(habitat.disturbance-3);restoration=Math.min(3000,restoration+90);recalc();add('Creekside water station cleaned and refilled.');return {ok:true,message:'Water station refilled. Habitat water quality improved.'}}
 function restoreCover(){if(coverRestored)return {ok:false,message:'This meadow plot has already been restored.'};coverRestored=true;habitat.cover=clamp(habitat.cover+12);habitat.food=clamp(habitat.food+7);habitat.biodiversity=clamp(habitat.biodiversity+5);habitat.disturbance=clamp(habitat.disturbance-5);restoration=Math.min(3000,restoration+70);recalc();add('Native cover and pollinator plants restored along the meadow edge.');return {ok:true,message:'Native cover planted. Shelter, forage and biodiversity improved.'}}
 function enrichHabitat(){habitat.food=clamp(habitat.food+8);habitat.biodiversity=clamp(habitat.biodiversity+3);restoration=Math.min(3000,restoration+45);recalc();add('Native forage patch seeded in the north meadow.');return {ok:true,message:'Native forage patch seeded. Food availability is improving.'}}
 return {animals,habitat,log,tick,select,selected,act,serviceWater,restoreCover,enrichHabitat,behavior,get restoration(){return restoration},get waterStation(){return waterStation},get coverRestored(){return coverRestored},get time(){return clock()},get phase(){return phase()},get weather(){return weather()},get day(){return day}};
}
